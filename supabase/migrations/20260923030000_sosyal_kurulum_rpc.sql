-- SOSYAL KATMAN C AŞAMASI — ALAN ARTIK SUNUCUDA TÜRETİLİYOR
--
-- B aşamasında kurulum şöyleydi: istemci `social_profiles` üzerine
-- `upsert` atıyor ve gövdeye `sector_id` koyuyordu. `sektor_kilidi()`
-- yalnız SONRADAN değiştirmeyi engelliyordu; İLK yazımda hangi alanın
-- geldiğine bakan hiçbir kural yoktu. Yani Elektrik Mühendisliği
-- öğrencisi kendini Tekstil alanına yazabilirdi.
--
-- Bu göç o yolu kapatıyor ve üç kapı birden kuruyor:
--
--   1) KOLON YETKİSİ  — istemci `sector_id`, `department_id` ve
--      `username` kolonlarına yazamıyor. İstek RLS'e bile gelmiyor,
--      yetki katmanında duruyor.
--   2) KURULUM RPC'Sİ — satır yalnız `sosyal_profil_kur()` ile açılıyor
--      ve alan, seçilen bölümün ONAYLI eşlemesinden türetiliyor. RPC
--      imzasında alan parametresi YOK; gönderilecek bir yer bile yok.
--   3) TETİKLEYİCİ     — `kimlik_kilidi()` bölüm ve alanı "bir kez
--      yazılır" yapıyor. Kolon yetkisi zaten kapatıyor; bu kapı
--      `service_role` ve bakım yollarında da kuralı koruyor.
--
-- Politika TEK BAŞINA yetmezdi: `with check (profile_id = auth.uid())`
-- satırın SAHİBİNİ doğruluyor, hangi kolonu yazdığını değil.

/* ================================================================== */
/*  1) BÖLÜM KOLONU                                                    */
/* ================================================================== */

alter table public.social_profiles
  add column if not exists department_id uuid references public.departments(id);

create index if not exists social_profiles_department_idx
  on public.social_profiles (department_id);

comment on column public.social_profiles.department_id is
  'Öğrencinin kontrollü katalogdan seçtiği bölüm. Alan (sector_id) bu bölümün onaylı eşlemesinden türetiliyor; ikisi de istemciden yazılamıyor.';

comment on column public.social_profiles.bolum_etiketi is
  'İSTEĞE BAĞLI eğitim notu (çift anadal, yandal gibi). Resmî bölüm adı DEĞİL: bölüm department_id ilişkisinden okunuyor. Bu alan bölüm uygunluğu, alan belirleme ya da kimlik doğrulama amacıyla KULLANILMIYOR.';

/*
  YAYIMLANMIŞ PROFİLDE BÖLÜM DE ŞART

  Alan bölümden türediği için, alanı dolu ama bölümü boş bir yayın satırı
  kaynağı belirsiz bir topluluk üyeliği olurdu.
*/
alter table public.social_profiles
  drop constraint if exists yayin_icin_kimlik_sart;

alter table public.social_profiles
  add constraint yayin_icin_kimlik_sart
    check (not yayinda_mi
           or (username is not null
               and sector_id is not null
               and department_id is not null));

/* ================================================================== */
/*  2) İSTEMCİ NE YAZABİLİR                                            */
/* ================================================================== */

/*
  INSERT tamamen kapanıyor: satır yalnız RPC ile açılıyor. Politika da
  düşürülüyor — yetkisi olmayan bir yol için politika bırakmak, kapının
  aralık olduğunu düşündürür.
*/
drop policy if exists "kendi sosyal profilini olusturur" on public.social_profiles;

revoke insert, update on public.social_profiles from authenticated;

/*
  Kullanıcının kendi düzenleyebileceği alanlar. `yayinda_mi` bilerek
  listede: "Alan topluluğuna katıl / Topluluktan ayrıl" akışı bu kolonu
  yazıyor ve o akış kullanıcının kendi kararı.
*/
grant update (gorunen_ad, biyografi, bolum_etiketi, sinif_etiketi, sehir, yayinda_mi)
  on public.social_profiles to authenticated;

/* ================================================================== */
/*  3) KİMLİK KİLİDİ                                                   */
/* ================================================================== */

/*
  `sektor_kilidi()`nin genişletilmişi: artık bölüm de kilitli.

  KOLON BAZINDA "BİR KEZ YAZILIR". Yalnız "başka değere geçiş"
  yasaklansaydı kullanıcı önce NULL'a çekip sonra yeni değeri "ilk
  seçim" gibi yapardı; bu yüzden NULL'a çekmek de yasak.

  Yönetici istisnası duruyor ama tek başına yeterli değil: yönetici
  düzeltmesi kendi RPC'sinden geçiyor ve denetim kaydı yazıyor
  (20260923040000).
*/
create or replace function public.kimlik_kilidi()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.sector_id is distinct from old.sector_id and old.sector_id is not null then
    raise exception 'Sektör seçildikten sonra değiştirilemez.'
      using errcode = '42501';
  end if;

  if new.department_id is distinct from old.department_id and old.department_id is not null then
    raise exception 'Bölüm seçildikten sonra değiştirilemez.'
      using errcode = '42501';
  end if;

  /*
    Kullanıcı adı da kalıcı: paylaşılmış her profil adresi ona bağlı.
    Kolon yetkisi bunu zaten kapatıyor; burada bakım yolu için duruyor.
  */
  if new.username is distinct from old.username and old.username is not null then
    raise exception 'Kullanıcı adı değiştirilemez.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists social_profiles_sektor_kilidi on public.social_profiles;
drop trigger if exists social_profiles_kimlik_kilidi on public.social_profiles;
create trigger social_profiles_kimlik_kilidi
  before update on public.social_profiles
  for each row execute function public.kimlik_kilidi();

drop function if exists public.sektor_kilidi();

revoke all on function public.kimlik_kilidi() from public;

/* ================================================================== */
/*  4) KURULUM RPC'Sİ                                                  */
/* ================================================================== */

/*
  ALAN PARAMETRESİ YOK.

  İmzada `sector_id` bulunmuyor; istemcinin alanı göndereceği bir yer
  bile yok. Alan `department_sectors` üzerinden okunuyor ve eşleme yoksa
  SATIR AÇILMIYOR — yarım bir profille topluluğa girilmiyor.

  `security definer`: istemcinin `sector_id`/`department_id` kolonlarına
  yazma yetkisi yok; yazmayı fonksiyon sahibi haklarıyla bu RPC yapıyor.
  `search_path` sabit (depodaki `is_admin`/`app_role` kalıbı).

  HATA KODLARI AYRI. Arayüz "bölümün listede yok" ile "bölümünün alanı
  henüz tanımlı değil" cümlelerini ayırt edebilmeli: ikisi kullanıcıya
  farklı eylem öneriyor. Makine kodu `detail` alanında taşınıyor,
  kullanıcıya gösterilecek cümle arayüzde yazılıyor.
*/
create or replace function public.sosyal_profil_kur(
  p_kullanici_adi text,
  p_bolum_slug    text,
  p_yayimla       boolean default false,
  p_gorunen_ad    text default null,
  p_biyografi     text default null,
  p_sinif         text default null,
  p_sehir         text default null
)
returns public.social_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  ben   uuid := auth.uid();
  bolum public.departments%rowtype;
  alan  uuid;
  sonuc public.social_profiles%rowtype;
begin
  if ben is null then
    raise exception 'Oturum gerekiyor.'
      using errcode = '42501', detail = 'oturum-yok';
  end if;

  /*
    Kullanıcı adı SUNUCUDA da doğrulanıyor. İstemci doğrulaması bir
    kolaylık; kural burada. Desen `social_profiles.username` CHECK
    kısıtının aynısı (20260921010000).
  */
  if p_kullanici_adi is null
     or p_kullanici_adi !~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$' then
    raise exception 'Kullanıcı adı kurala uymuyor.'
      using errcode = '23514', detail = 'gecersiz-kullanici-adi';
  end if;

  select * into bolum
    from public.departments
   where slug = p_bolum_slug and aktif;

  if not found then
    raise exception 'Bölüm katalogda bulunamadı.'
      using errcode = 'P0001', detail = 'bolum-bulunamadi';
  end if;

  select ds.sector_id into alan
    from public.department_sectors ds
   where ds.department_id = bolum.id;

  if alan is null then
    raise exception 'Bölümün alanı henüz tanımlı değil.'
      using errcode = 'P0001', detail = 'bolum-alani-tanimsiz';
  end if;

  /*
    `on conflict` yolu, satırı daha önce açılmış kullanıcı için:
    kimlik alanları `coalesce` ile KORUNUYOR, yani ikinci çağrı bölümü,
    alanı ya da kullanıcı adını değiştiremiyor. Kilit tetikleyicisi de
    aynı şeyi söylüyor; ikisi birbirini yedekliyor.
  */
  insert into public.social_profiles as sp (
    profile_id, username, department_id, sector_id,
    gorunen_ad, biyografi, sinif_etiketi, sehir, yayinda_mi
  )
  values (
    ben, p_kullanici_adi, bolum.id, alan,
    nullif(btrim(coalesce(p_gorunen_ad, '')), ''),
    nullif(btrim(coalesce(p_biyografi, '')), ''),
    nullif(btrim(coalesce(p_sinif, '')), ''),
    nullif(btrim(coalesce(p_sehir, '')), ''),
    coalesce(p_yayimla, false)
  )
  on conflict (profile_id) do update set
    username      = coalesce(sp.username, excluded.username),
    department_id = coalesce(sp.department_id, excluded.department_id),
    sector_id     = coalesce(sp.sector_id, excluded.sector_id),
    gorunen_ad    = excluded.gorunen_ad,
    biyografi     = excluded.biyografi,
    sinif_etiketi = excluded.sinif_etiketi,
    sehir         = excluded.sehir,
    /*
      TOPLULUK ÜYELİĞİ BU YOLDAN DEĞİŞMİYOR.

      `yayinda_mi` yalnız satır İLK açılırken parametreden geliyor.
      Var olan bir satırda korunuyor: kurulum RPC-sinin ikinci kez
      çağrılması (parametresi varsayılan `false` olduğu için) kullanıcıyı
      sessizce alan topluluğundan çıkarabilirdi. Topluluğa katılma ve
      ayrılma ayrı ve açık bir eylem; onu kullanıcının kendi
      "Alan topluluğuna katıl / Topluluktan ayrıl" kontrolü yapıyor.
    */
    yayinda_mi    = sp.yayinda_mi,
    updated_at    = now()
  returning * into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.sosyal_profil_kur(text, text, boolean, text, text, text, text) from public;
grant execute on function public.sosyal_profil_kur(text, text, boolean, text, text, text, text) to authenticated;
