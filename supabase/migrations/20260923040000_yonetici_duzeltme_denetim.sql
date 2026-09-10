-- SOSYAL KATMAN C AŞAMASI — YÖNETİCİ DÜZELTMESİ VE DENETİM KAYDI
--
-- Bölüm ve alan artık "bir kez yazılır". Öğrenci yanlış bölüm seçerse
-- düzeltecek biri olmalı — ama bu yetki, kimlik kilidinin etrafından
-- dolaşan sessiz bir kapı olmamalı.
--
-- ÜÇ SINIR
--   1) Düzeltme yalnız `sosyal_bolum_duzelt()` RPC'sinden geçiyor.
--      Yöneticinin `social_profiles` üzerindeki DOĞRUDAN geniş UPDATE
--      politikası kaldırılıyor: doğrudan yetki bırakmak, denetim kaydını
--      atlanabilir kılardı.
--   2) Yönetici de SERBEST ALAN yazamıyor. RPC bölüm alıyor, alanı yine
--      onaylı eşlemeden türetiyor. Yani "Elektrik Mühendisliği öğrencisi
--      Tekstil alanında" durumu yönetici eliyle de oluşturulamıyor.
--   3) Her düzeltme APPEND-ONLY denetim kaydı yazıyor ve gerekçe zorunlu.
--
-- YÖNETİCİNİN YAPAMADIKLARI
--   · `username` değiştiremiyor — kalıcı adres, paylaşılmış her bağlantı
--     ona bağlı.
--   · `yayinda_mi` değiştiremiyor — kullanıcı adına topluluğa katmak ya
--     da topluluktan çıkarmak onun kararı değil.

/* ================================================================== */
/*  1) DENETİM KAYDI                                                   */
/* ================================================================== */

create table if not exists public.social_profile_denetim (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  alan text not null check (alan in ('department_id','sector_id')),
  eski_deger uuid,
  yeni_deger uuid,
  yapan uuid not null references public.profiles(id),
  gerekce text not null check (length(btrim(gerekce)) between 5 and 500),
  created_at timestamptz not null default now()
);

create index if not exists social_profile_denetim_profil_idx
  on public.social_profile_denetim (profile_id, created_at desc);

alter table public.social_profile_denetim enable row level security;

/*
  APPEND-ONLY

  Yalnız okuma politikası var; INSERT/UPDATE/DELETE için politika YOK ve
  tablo yetkisi de yalnız `select`. Yazma tek yoldan geliyor: aşağıdaki
  `security definer` RPC. Denetim kaydının değiştirilebilir olması, onu
  denetim kaydı olmaktan çıkarırdı.
*/
drop policy if exists "denetim kaydini yonetici okur" on public.social_profile_denetim;
create policy "denetim kaydini yonetici okur" on public.social_profile_denetim
  for select to authenticated using (public.is_admin());

grant select on public.social_profile_denetim to authenticated;
revoke insert, update, delete on public.social_profile_denetim from authenticated;
revoke all on public.social_profile_denetim from anon;

/* ================================================================== */
/*  2) DOĞRUDAN YÖNETİCİ UPDATE POLİTİKASI KALKIYOR                    */
/* ================================================================== */

/*
  20260921030000'de açılmıştı; o zaman düzeltmenin başka yolu yoktu.
  Artık var ve izli. Politikayı bırakmak, izsiz düzeltmeyi mümkün
  kılardı — üstelik kolon yetkisi olmadığı için bugün zaten çalışmıyor,
  yani yalnız yanıltıcı bir işaret olurdu.
*/
drop policy if exists "yonetici sosyal profili gunceller" on public.social_profiles;

/* ================================================================== */
/*  3) DÜZELTME RPC'Sİ                                                 */
/* ================================================================== */

create or replace function public.sosyal_bolum_duzelt(
  p_profile_id uuid,
  p_bolum_slug text,
  p_gerekce    text
)
returns public.social_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  bolum public.departments%rowtype;
  alan  uuid;
  eski  public.social_profiles%rowtype;
  sonuc public.social_profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici olmak gerekiyor.'
      using errcode = '42501', detail = 'yonetici-degil';
  end if;

  if p_gerekce is null or length(btrim(p_gerekce)) < 5 then
    raise exception 'Düzeltme gerekçesi zorunlu.'
      using errcode = '23514', detail = 'gerekce-zorunlu';
  end if;

  select * into eski from public.social_profiles where profile_id = p_profile_id;
  if not found then
    raise exception 'Profil bulunamadı.'
      using errcode = 'P0001', detail = 'profil-bulunamadi';
  end if;

  select * into bolum from public.departments where slug = p_bolum_slug and aktif;
  if not found then
    raise exception 'Bölüm katalogda bulunamadı.'
      using errcode = 'P0001', detail = 'bolum-bulunamadi';
  end if;

  /* Alan yine EŞLEMEDEN. Yönetici de serbest alan yazamıyor. */
  select ds.sector_id into alan
    from public.department_sectors ds
   where ds.department_id = bolum.id;

  if alan is null then
    raise exception 'Bölümün alanı henüz tanımlı değil.'
      using errcode = 'P0001', detail = 'bolum-alani-tanimsiz';
  end if;

  update public.social_profiles
     set department_id = bolum.id,
         sector_id     = alan,
         updated_at    = now()
   where profile_id = p_profile_id
  returning * into sonuc;

  /*
    İki satır: hangi kolonun neyden neye geçtiği ayrı ayrı okunabilsin.
    Tek satırda birleştirmek, ileride yalnız alanı ya da yalnız bölümü
    ilgilendiren bir sorguyu zorlaştırırdı.
  */
  insert into public.social_profile_denetim
    (profile_id, alan, eski_deger, yeni_deger, yapan, gerekce)
  values
    (p_profile_id, 'department_id', eski.department_id, bolum.id, auth.uid(), btrim(p_gerekce)),
    (p_profile_id, 'sector_id',     eski.sector_id,     alan,     auth.uid(), btrim(p_gerekce));

  return sonuc;
end;
$$;

revoke all on function public.sosyal_bolum_duzelt(uuid, text, text) from public;
grant execute on function public.sosyal_bolum_duzelt(uuid, text, text) to authenticated;
