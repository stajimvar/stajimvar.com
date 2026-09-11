-- G aşaması — profil görünürlüğü, bağlantı ve topluluk üyeliği ayrışıyor
--
-- ÖLÇÜLEN BİRLEŞİKLİK
-- -------------------
-- `sosyal_gizli.sosyal_gorunur` şunu diyordu:
--   ben yayındayım + o yayında + AYNI sector_id + engel yok
-- Yani profil görünürlüğü, sektör eşitliğini ŞART koşuyordu. Sonuçları:
--   · topluluğa katılmayan kullanıcı hiç kimseye görünmüyordu
--   · başka alandaki birinin profili hiç açılamıyordu, dolayısıyla
--     kullanıcı adıyla arama da yalnız kendi alanını bulabilirdi
--   · topluluktan çıkmak profili görünmez yapıyordu
--
-- YENİ KURAL
-- ----------
--   PROFİL   giriş yapmış herkes görebilir; sahibi `yayinda_mi` ile
--            kapatabilir. Alan/sektör şartı YOK.
--   PAYLAŞIM kitleye bağlı ve DARALMIYOR:
--              'baglantilarim'   → karşılıklı bağlantı
--              'alan-toplulugum' → ikisi de aynı topluluğun ÜYESİ
--   CV, başvuru, e-posta, kimlik: bu göçte hiç açılmıyor; `profiles` ve
--   `student_profiles` politikalarına dokunulmadı.
--
-- ENGEL HER İKİSİNİN DE ÜSTÜNDE, eskisi gibi.
--
-- NEDEN `yayinda_mi` KOLONU DURUYOR
-- ---------------------------------
-- Adı aynı kaldı ama ANLAMI daraldı: artık yalnız "profilim herkese
-- açık mı". Üyelik anlamı `community_members`e taşındı (20260926030000)
-- ve eski üyelikler oradan okunuyor, yani kolonun eski değeri veri
-- kaybı olmadan iki kavrama bölündü. Kolonu yeniden adlandırmak, bu
-- kolonu okuyan mevcut politikaları ve istemci yazma yetkisini tek
-- göçte kırardı; anlam değişikliği yorumla ve testle sabitleniyor.

/* ================================================================== */
/*  1) YAYIN ARTIK SEKTÖR İSTEMİYOR                                    */
/* ================================================================== */

/*
  Eski kısıt `not yayinda_mi or (username is not null and sector_id is
  not null)` idi. Bölümü katalogla eşleşmeyen kullanıcının sector_id'si
  NULL kalıyor ve bu kısıt onun profilini yayımlamasını ENGELLİYORDU —
  oysa artık profil, topluluktan bağımsız çalışmak zorunda. Kullanıcı
  adı şartı duruyor: adressiz bir profil yayımlanamaz.
*/
alter table public.social_profiles drop constraint if exists yayin_icin_kimlik_sart;
alter table public.social_profiles
  add constraint yayin_icin_kimlik_sart
    check (not yayinda_mi or username is not null);

alter table public.social_profiles alter column yayinda_mi set default true;

comment on column public.social_profiles.yayinda_mi is
  'Profil görünürlüğü: giriş yapmış herkes görebilir mi. ÜYELİK DEĞİL — alan topluluğu üyeliği public.community_members tablosunda. Otomatik açılan profillerde varsayılan true.';

/* ================================================================== */
/*  2) PROFİL GÖRÜNÜRLÜĞÜ                                              */
/* ================================================================== */

/**
 * Bu kullanıcının sosyal profilini görebilir miyim?
 *
 * Artık simetri ŞART DEĞİL: bakanın kendi profilini yayımlamış olması
 * gerekmiyor. Eski kural, profilini kapatan kullanıcının kimseyi
 * göremediği bir çıkmaz üretiyordu; oysa gizlenmek isteyen kişi
 * ötekileri görebilmeli.
 *
 * Oturumsuz çağıran hiçbir şey göremiyor: `auth.uid()` NULL olduğunda
 * ilk dal false dönüyor.
 */
create or replace function sosyal_gizli.sosyal_gorunur(hedef uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when hedef is null or auth.uid() is null then false
    when hedef = auth.uid() then true
    else (
      exists (
        select 1 from public.social_profiles o
         where o.profile_id = hedef
           and o.yayinda_mi
      )
      and not sosyal_gizli.engelli_mi(hedef)
    )
  end
$$;

/* ================================================================== */
/*  3) PAYLAŞIM GÖRÜNÜRLÜĞÜ — KİTLE DARALMADI                          */
/* ================================================================== */

/**
 * Bu paylaşımı görebilir miyim?
 *
 * Profil kapısı genişledi ama paylaşım kapısı GENİŞLEMEDİ; ikisi ayrı
 * kavram olduğu için ayrı ölçülüyor:
 *   · sahibi her zaman kendi paylaşımını görür (arşiv hariç — o
 *     `posts` politikasında ayrıca ele alınıyor)
 *   · 'baglantilarim'   yalnız karşılıklı bağlantı
 *   · 'alan-toplulugum' yalnız AYNI TOPLULUĞUN ÜYELERİ
 *
 * Üçüncü satır bu göçün asıl işi: eskiden `kitle = 'alan-toplulugum'`
 * için hiçbir ek koşul yoktu, çünkü sektör eşitliği zaten
 * `sosyal_gorunur` içinde saklıydı. O şart oradan kalkınca burada AÇIK
 * hâle geldi; yoksa topluluk paylaşımları giriş yapan herkese açılırdı.
 */
create or replace function sosyal_gizli.paylasim_gorunur(hedef_post uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.posts p
    where p.id = hedef_post
      and p.archived_at is null
      and (
        p.author_id = auth.uid()
        or (
          p.durum = 'hazir'
          and sosyal_gizli.sosyal_gorunur(p.author_id)
          and (
            (p.kitle = 'baglantilarim'   and sosyal_gizli.baglanti_var(p.author_id))
            or (p.kitle = 'alan-toplulugum' and sosyal_gizli.ayni_toplulukta(auth.uid(), p.author_id))
          )
        )
      )
  )
$$;

/* ================================================================== */
/*  4) TOPLULUK KİTLESİ ÜYELİK İSTİYOR — YAZMA TARAFI                  */
/* ================================================================== */

/**
 * "Alan topluluğum" kitlesiyle paylaşmak üyelik gerektiriyor.
 *
 * Arayüz bu seçeneği üye olmayana hiç çizmiyor, ama kural SUNUCUDA
 * duruyor: `posts` üzerinde istemciye `kitle` kolonunda update yetkisi
 * var (20260924010000), yani seçeneği çizmemek tek başına bir kapı
 * değil. Tetikleyici hem insert hem update yolunu kapatıyor.
 *
 * Üyelik "herhangi bir topluluk" diye okunuyor: kullanıcı yalnız kendi
 * bölümüne uygun topluluğa katılabildiği için (20260926030000) bu
 * zaten "kendi topluluğu" demek.
 */
create or replace function sosyal_gizli.paylasim_kitlesi_kilidi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kitle = 'alan-toplulugum'
     and not exists (
       select 1 from public.community_members cm
        where cm.profile_id = new.author_id
     ) then
    raise exception 'Alan topluluğuna katılmadan bu kitleyle paylaşamazsın.'
      using errcode = '42501', detail = 'topluluk-uyeligi-yok';
  end if;
  return new;
end;
$$;

drop trigger if exists paylasim_kitlesi_kilidi on public.posts;
create trigger paylasim_kitlesi_kilidi
  before insert or update of kitle on public.posts
  for each row execute function sosyal_gizli.paylasim_kitlesi_kilidi();

/* ================================================================== */
/*  5) SAYAÇ AYNI KAPIDAN GEÇMEYE DEVAM EDİYOR                         */
/* ================================================================== */

/*
  `sosyal_sayaclar` gövdesi değişmiyor: içindeki `paylasim_gorunur` ve
  `sosyal_gorunur` çağrıları yukarıdaki yeni tanımları kullanıyor. Yani
  profil sayacı artık giriş yapan herkese görünüyor, paylaşım sayısı ise
  bakan kişinin gerçekten görebildiği paylaşımları sayıyor. Gösterilen
  sayı, gösterilen içerikle tutmaya devam ediyor.
*/
