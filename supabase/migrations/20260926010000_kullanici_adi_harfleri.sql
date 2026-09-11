-- G aşaması — kullanıcı adı yalnız harf, üretimi sunucuda
--
-- NEDEN DAHA DA DAR
-- -----------------
-- 20260921010000 deseni `^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$` idi: rakam,
-- nokta ve alt çizgi serbestti. Artık yalnız `a-z`. Sebep okunabilirlik
-- değil, KARIŞTIRILABİLİRLİK: `mustafa.dogan`, `mustafa_dogan` ve
-- `mustafadogan1` birbirinin yerine geçebilen üç ayrı kimlik üretiyor ve
-- bu, birinin ötekini taklit etmesini kolaylaştırıyor. Tek alfabe, tek
-- yazım.
--
-- ESKİ SATIRLAR KIRILMIYOR
-- ------------------------
-- Yeni kısıt `not valid` ekleniyor. Postgres bunu YENİ ve GÜNCELLENEN
-- satırlara uyguluyor, mevcut satırları taramıyor. Daha önce rakamlı ya
-- da noktalı bir ad almış kullanıcının adresi çalışmaya devam ediyor;
-- adını değiştirmek isterse yeni kurala uymak zorunda. Alternatif —
-- kısıtı `valid` eklemek — ya göçü düşürürdü ya da o kullanıcıların
-- adreslerini sessizce koparırdı.
--
-- UZUNLUK VE EK ALANI
-- -------------------
-- Taban en çok 24 harf, çakışma eki en çok 6 harf, toplam 3-30. Ek yeri
-- ÖNCEDEN ayrıldı: taban 30'a kadar uzayabilseydi, çakışan uzun bir ada
-- ek eklenemez ve üretim kilitlenirdi.

/* ================================================================== */
/*  1) NORMALLEŞTİRME — TEK YERDE                                      */
/* ================================================================== */

/**
 * Serbest metni kullanıcı adı alfabesine indirger.
 *
 * Türkçe harfler ASCII karşılığına çevriliyor, kalan her şey (rakam,
 * boşluk, nokta, tire, emoji, başka alfabeler) SİLİNİYOR.
 *
 * ÇEVİRİ `lower()`TEN ÖNCE: Postgres'te `lower('I')` veritabanı
 * yereline göre 'ı' üretebiliyor. 'I' burada daha çevrilmiş oluyor,
 * yani sonuç yerelden bağımsız. Aynı fonksiyon hem üretimde hem
 * ARAMADA kullanılıyor; iki yerde iki normalleştirme olsaydı kullanıcı
 * kendi adını arayıp bulamazdı.
 */
create or replace function sosyal_gizli.kullanici_adi_normalize(ham text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
    lower(translate(coalesce(ham, ''), 'ÇĞİIÖŞÜçğıiöşü', 'cgiiosucgiiosu')),
    '[^a-z]', '', 'g'
  )
$$;

/* ================================================================== */
/*  2) DOLULUK — ŞİMDİLİK YALNIZ GÜNCEL ADLAR                          */
/* ================================================================== */

/**
 * Bu ad birine ait mi?
 *
 * 20260926020000 bu fonksiyonu DEĞİŞTİRİYOR: kullanıcı adı geçmişi
 * gelince bırakılmış adlar da "dolu" sayılacak. Ayrı bir fonksiyon
 * olmasının sebebi bu — üretim ve değiştirme yolları aynı tanımı
 * çağırsın, biri güncellenip öteki geride kalmasın.
 */
create or replace function sosyal_gizli.kullanici_adi_dolu(aday text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.social_profiles sp where sp.username = aday
  )
$$;

/* ================================================================== */
/*  3) ÜRETİM                                                          */
/* ================================================================== */

/**
 * Ad-soyaddan kullanıcı adı üretir.
 *
 * "Mustafa Oğulcan Doğan" → "mustafaogulcandogan"
 * Dolu ise yalnız HARFTEN ek: "mustafaogulcandoganab"
 *
 * RAKAM EKLENMİYOR: kural "yalnız a-z" ve üretim de o kurala uymak
 * zorunda. Rakamlı ek, kullanıcının sonradan elle giremeyeceği bir ad
 * üretirdi.
 *
 * BU FONKSİYON TEK BAŞINA EŞSİZLİK GARANTİSİ DEĞİL. Kontrol ile insert
 * arasında başka bir oturum aynı adı alabilir. Gerçek garanti
 * `social_profiles.username` üzerindeki tekil indeks; çağıran taraf
 * `unique_violation` yakalayıp yeniden çağırıyor (20260926030000).
 * Buradaki doluluk kontrolü yalnızca çarpışma OLASILIĞINI düşürüyor.
 *
 * Ek uzunluğu denemeyle büyüyor: ilk denemelerde 2 harf, ısrarla dolu
 * kalırsa 3 ve 4. Sabit 2 harf, çok yaygın bir adda 676 kişiden sonra
 * tıkanırdı.
 */
create or replace function sosyal_gizli.kullanici_adi_uret(ham text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  taban   text;
  aday    text;
  ek      text;
  ek_boyu int;
  deneme  int;
  h       int;
begin
  taban := left(sosyal_gizli.kullanici_adi_normalize(ham), 24);

  /*
    Ad hiç harf içermiyorsa (boş, yalnız rakam, yalnız emoji) uydurma
    bir kimlik üretilmiyor; nötr bir taban kullanılıyor ve ek zaten
    ayırt ediciliği sağlıyor. Kullanıcı adını sonradan değiştirebiliyor.
  */
  if length(taban) < 3 then
    taban := left(taban || 'ogrenci', 24);
  end if;

  if not sosyal_gizli.kullanici_adi_dolu(taban) then
    return taban;
  end if;

  for deneme in 1..60 loop
    ek_boyu := 2 + (deneme / 25);          -- 1-24: 2 harf, 25-49: 3, 50+: 4
    ek := '';
    for h in 1..ek_boyu loop
      ek := ek || chr(97 + floor(random() * 26)::int);
    end loop;
    aday := left(taban, 30 - ek_boyu) || ek;
    if not sosyal_gizli.kullanici_adi_dolu(aday) then
      return aday;
    end if;
  end loop;

  /*
    60 denemenin hepsi dolu çıkarsa ad ÜRETİLMİYOR. Sessizce çakışan bir
    değer döndürmek, çağıranın tekil indekse toslamasına ve hatanın
    burada değil orada görünmesine yol açardı.
  */
  raise exception 'Kullanıcı adı üretilemedi.'
    using errcode = 'P0001', detail = 'kullanici-adi-uretilemedi';
end;
$$;

/* ================================================================== */
/*  4) YENİ ALFABE KISITI                                              */
/* ================================================================== */

alter table public.social_profiles
  drop constraint if exists social_profiles_username_harf;

alter table public.social_profiles
  add constraint social_profiles_username_harf
    check (username is null or username ~ '^[a-z]{3,30}$')
    not valid;

comment on column public.social_profiles.username is
  'Herkese açık kullanıcı adı. Yalnız a-z, 3-30 harf. Üretim ve değiştirme sunucuda (sosyal_gizli.kullanici_adi_uret, public.sosyal_kullanici_adi_degistir); istemci bu kolonu doğrudan yazamıyor.';

revoke all on function sosyal_gizli.kullanici_adi_normalize(text) from public;
revoke all on function sosyal_gizli.kullanici_adi_dolu(text)      from public;
revoke all on function sosyal_gizli.kullanici_adi_uret(text)      from public;
grant execute on function sosyal_gizli.kullanici_adi_normalize(text) to authenticated;
