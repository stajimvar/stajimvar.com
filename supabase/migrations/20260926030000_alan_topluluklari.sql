-- G aşaması — alan toplulukları profilden ayrılıyor
--
-- ÖNCEKİ MODELİN SORUNU
-- ---------------------
-- `social_profiles.yayinda_mi` üç şeyi birden anlatıyordu: profilim
-- görünür mü, alan topluluğuna dâhil miyim, paylaşımlarım kime açık.
-- Sonuç: sosyal profili kullanmak için topluluğa katılmak ZORUNLUYDU ve
-- topluluktan çıkmak profili görünmez yapıyordu.
--
-- Artık üç ayrı kavram var:
--   PROFİL GÖRÜNÜRLÜĞÜ  social_profiles.yayinda_mi   (20260926040000)
--   BAĞLANTI            connections                  (değişmedi)
--   TOPLULUK ÜYELİĞİ    community_members            (bu göç)
--
-- Bir alan topluluğu = bir `sectors` satırı. Ayrı bir "communities"
-- tablosu AÇILMADI: topluluğun kimliği zaten sektör ve ikinci bir tablo,
-- bölüm-alan eşlemesinin hangisine bakacağı sorusunu doğururdu.
--
-- ÜYELİK İSTEĞE BAĞLI, UYGUNLUK ZORUNLU
-- -------------------------------------
-- Katılmak kullanıcının tercihi; HANGİ topluluğa katılabileceği değil.
-- Elektrik-Elektronik öğrencisi Tekstil topluluğuna katılamıyor ve bunu
-- istemciden gelen bir kimliği değiştirerek de aşamıyor: uygun sektör
-- fonksiyonun İÇİNDE `department_sectors`ten okunuyor, parametreden
-- değil. `department_sectors.department_id` birincil anahtar olduğu için
-- bir bölümün tek uygun alanı var.

/* ================================================================== */
/*  1) ÜYELİK TABLOSU                                                  */
/* ================================================================== */

create table if not exists public.community_members (
  sector_id   uuid not null references public.sectors(id) on delete cascade,
  profile_id  uuid not null references public.social_profiles(profile_id) on delete cascade,
  katilma_ani timestamptz not null default now(),
  primary key (sector_id, profile_id)
);

create index if not exists community_members_profil_idx
  on public.community_members (profile_id);

comment on table public.community_members is
  'Alan topluluğu üyeliği. Profil görünürlüğünden ve bağlantıdan AYRI bir kavram; üyelik isteğe bağlı, uygunluk sunucuda zorunlu.';

alter table public.community_members enable row level security;

/* ================================================================== */
/*  2) YARDIMCILAR                                                     */
/* ================================================================== */

/**
 * Çağıranın bölümüne göre katılabileceği tek alan.
 *
 * NULL dönmesi iki ayrı şey demek olabilir — profil yok ya da bölümün
 * eşlemesi yok — ve ikisi de aynı sonuca çıkıyor: katılınabilecek bir
 * topluluk yok. Arayüz farkı `sosyal_topluluklar()` üzerinden anlatıyor.
 */
create or replace function sosyal_gizli.uygun_alan(kim uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ds.sector_id
    from public.social_profiles sp
    join public.department_sectors ds on ds.department_id = sp.department_id
   where sp.profile_id = kim
$$;

/**
 * Bu kişi bu topluluğun üyesi mi?
 *
 * Paylaşım kitlesi, topluluk içeriği ve arayüz aynı tanımı çağırıyor;
 * kural tek yerde kalıyor.
 */
create or replace function sosyal_gizli.toplulukta_mi(kim uuid, alan uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members cm
     where cm.profile_id = kim and cm.sector_id = alan
  )
$$;

/**
 * İki kişi AYNI topluluğun üyesi mi?
 *
 * "Alan topluluğum" kitlesinin kapısı bu. Eski `ayni_sektorde` yalnız
 * `social_profiles.sector_id` eşitliğine bakıyordu, yani topluluğa hiç
 * katılmamış iki kişi de birbirinin topluluk paylaşımını görüyordu.
 */
create or replace function sosyal_gizli.ayni_toplulukta(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.community_members ca
      join public.community_members cb on cb.sector_id = ca.sector_id
     where ca.profile_id = a and cb.profile_id = b
  )
$$;

/* ================================================================== */
/*  3) POLİTİKALAR                                                     */
/* ================================================================== */

/*
  ÜYELİK SATIRI KİME GÖRÜNÜR

  Kendi satırın her zaman; başkasınınki ancak AYNI topluluktaysanız.
  Böylece topluluk sayfası üye listesini çizebiliyor ama üye olmayan bir
  kullanıcı, kimin hangi topluluğa üye olduğunu tarayamıyor.

  Yazma politikası YOK: insert/delete yalnız aşağıdaki RPC'lerden
  geçiyor, çünkü uygunluk kontrolü bir politika ifadesine değil bir
  fonksiyon gövdesine ait.
*/
drop policy if exists "uyelik okunur" on public.community_members;
create policy "uyelik okunur" on public.community_members
  for select to authenticated
  using (
    profile_id = auth.uid()
    or sosyal_gizli.toplulukta_mi(auth.uid(), sector_id)
  );

revoke all on public.community_members from anon, authenticated;
grant select on public.community_members to authenticated;

/* ================================================================== */
/*  4) KATIL / AYRIL                                                   */
/* ================================================================== */

/**
 * Topluluğa katıl.
 *
 * `p_sector_id` bir İSTEK, yetki değil: fonksiyon çağıranın bölümünden
 * uygun alanı kendisi okuyor ve ikisi tutmuyorsa reddediyor. İstemcinin
 * gönderdiği kimliği değiştirmesi kuralı aşmıyor.
 */
create or replace function public.sosyal_topluluga_katil(p_sector_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ben   uuid := auth.uid();
  uygun uuid;
begin
  if ben is null then
    raise exception 'Oturum gerekiyor.'
      using errcode = '42501', detail = 'oturum-yok';
  end if;

  uygun := sosyal_gizli.uygun_alan(ben);

  if uygun is null then
    raise exception 'Bölümün için topluluk henüz tanımlı değil.'
      using errcode = 'P0001', detail = 'bolum-alani-tanimsiz';
  end if;

  if p_sector_id is null or p_sector_id <> uygun then
    raise exception 'Bu topluluğa katılma yetkin yok.'
      using errcode = '42501', detail = 'topluluk-uygun-degil';
  end if;

  insert into public.community_members (sector_id, profile_id)
  values (uygun, ben)
  on conflict (sector_id, profile_id) do nothing;
end;
$$;

/**
 * Topluluktan ayrıl.
 *
 * PROFİLE DOKUNMUYOR: `yayinda_mi`, `username`, `sector_id`,
 * `department_id`, bağlantılar ve "Bağlantılarım" kitlesindeki
 * paylaşımlar aynen kalıyor. Ayrılmanın tek etkisi, o topluluğun
 * içeriğine erişimin kapanması.
 */
create or replace function public.sosyal_topluluktan_ayril(p_sector_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ben uuid := auth.uid();
begin
  if ben is null then
    raise exception 'Oturum gerekiyor.'
      using errcode = '42501', detail = 'oturum-yok';
  end if;

  delete from public.community_members
   where profile_id = ben and sector_id = p_sector_id;
end;
$$;

/* ================================================================== */
/*  5) LİSTE                                                           */
/* ================================================================== */

/**
 * Alan toplulukları listesi.
 *
 * Tek çağrıda hem liste hem çağıranın durumu geliyor: `uygun_mu` ve
 * `uye_miyim`. İki ayrı çağrı olsaydı arayüz, "katıl" düğmesini
 * yetkisinin olmadığı bir toplulukta da çizebilirdi.
 *
 * `uye_sayisi` yalnız ÜYE OLUNAN toplulukta gerçek sayı, ötekilerde
 * NULL: üye olmayan birine topluluk büyüklüğünü söylemek, üyelik
 * verisini üyelik olmadan açmak olurdu. Arayüz NULL'u sayı yerine hiç
 * çizmiyor — 0 uydurmuyor.
 */
create or replace function public.sosyal_topluluklar()
returns table (
  sector_id   uuid,
  slug        text,
  ad          text,
  uygun_mu    boolean,
  uye_miyim   boolean,
  uye_sayisi  integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.slug,
    s.ad,
    s.id = sosyal_gizli.uygun_alan(auth.uid()),
    sosyal_gizli.toplulukta_mi(auth.uid(), s.id),
    case
      when sosyal_gizli.toplulukta_mi(auth.uid(), s.id)
      then (select count(*)::int from public.community_members cm where cm.sector_id = s.id)
      else null
    end
    from public.sectors s
   where s.aktif
     and auth.uid() is not null
   order by s.sira, s.ad
$$;

/* ================================================================== */
/*  6) GEÇİŞ — ESKİ ÜYELİK KAYBOLMUYOR                                 */
/* ================================================================== */

/**
 * Eski modelde topluluk üyesi sayılanları yeni tabloya taşır.
 *
 * Eski kural: `yayinda_mi` ve `sector_id` dolu olan kullanıcı, o
 * sektörün içeriğini görüyordu — yani fiilen üyeydi. Aynı küme buraya
 * yazılıyor, hiç kimse sessizce topluluk dışında bırakılmıyor.
 *
 * TEKRAR ÇALIŞTIRILABİLİR: `on conflict do nothing` sayesinde ikinci
 * çağrı hiçbir şey değiştirmiyor ve mevcut üyeliklerin `katilma_ani`
 * değerini de bozmuyor. Kaç satır eklendiğini döndürüyor ki geçişin
 * gerçekten çalıştığı ölçülebilsin.
 */
create or replace function sosyal_gizli.topluluk_uyeligini_tasi()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  eklenen integer;
begin
  insert into public.community_members (sector_id, profile_id)
  select sp.sector_id, sp.profile_id
    from public.social_profiles sp
   where sp.yayinda_mi
     and sp.sector_id is not null
  on conflict (sector_id, profile_id) do nothing;

  get diagnostics eklenen = row_count;
  return eklenen;
end;
$$;

select sosyal_gizli.topluluk_uyeligini_tasi();

revoke all on function sosyal_gizli.uygun_alan(uuid)                 from public;
revoke all on function sosyal_gizli.toplulukta_mi(uuid, uuid)        from public;
revoke all on function sosyal_gizli.ayni_toplulukta(uuid, uuid)      from public;
revoke all on function sosyal_gizli.topluluk_uyeligini_tasi()        from public;
revoke all on function public.sosyal_topluluga_katil(uuid)           from public;
revoke all on function public.sosyal_topluluktan_ayril(uuid)         from public;
revoke all on function public.sosyal_topluluklar()                   from public;

grant execute on function sosyal_gizli.uygun_alan(uuid)            to authenticated;
grant execute on function sosyal_gizli.toplulukta_mi(uuid, uuid)   to authenticated;
grant execute on function sosyal_gizli.ayni_toplulukta(uuid, uuid) to authenticated;
grant execute on function public.sosyal_topluluga_katil(uuid)      to authenticated;
grant execute on function public.sosyal_topluluktan_ayril(uuid)    to authenticated;
grant execute on function public.sosyal_topluluklar()              to authenticated;
