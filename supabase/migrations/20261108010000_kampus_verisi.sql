-- KAMPÜSÜM — üniversitenin resmî kaynağından yemek menüsü ve duyurular
--
-- Profil sayfasının sol sütunundaki "Kampüsüm" paneli SAYFAYA BAKAN
-- öğrencinin okuluna göre çalışıyor: kendi profilinde de başkasının
-- profilinde de aynı okul. Veri üniversitelerin RESMÎ kaynaklarından,
-- zamanlanmış bir iş (`automation/kampus_verisi.py`) tarafından çekiliyor.
--
-- EŞLEŞME AD TAHMİNİ DEĞİL
-- ------------------------
-- `universiteler` elle doğrulanmış bir katalog: kimlik (slug), resmî ad
-- ve resmî alan adı. Her kaynak adresi bu alan adına bağlı (tetikleyici
-- zorluyor): başka bir sitedeki "menü" kaynağı olarak eklenemiyor.
-- Öğrencinin okulu `student_profiles.university`de, profil formundaki
-- kapalı listeden (TR_UNIVERSITIES) seçilen resmî adla duruyor; bağ
-- yalnız o adın normalize edilmiş BİREBİR karşılığıyla kuruluyor
-- (`ad_anahtarlari`: resmî ad + elle doğrulanmış kısa adlar). Benzerlik,
-- ilk kelime ya da "en yakın ad" araması YOK: "İstanbul Üniversitesi" ile
-- "İstanbul Teknik Üniversitesi" birbirine düşmüyor.
--
-- UYDURMA VERİ YOK
-- ----------------
-- Menü satırı yalnız kendi TARİHİ için geçerli. Bugünün satırı yoksa
-- panel "bugün için yayımlanmış menü yok" diyor; dünün ya da ayın başka
-- bir gününün menüsü bugünün menüsü gibi gösterilmiyor. Her satır kaynak
-- adresini ve çekildiği anı taşıyor.

/* ================================================================== */
/*  1) KATALOG                                                         */
/* ================================================================== */

/* Ad → karşılaştırma anahtarı: Türkçe harfler sadeleşiyor, boşluk tekleşiyor. */
create or replace function public.kampus_ad_anahtari(ad text)
returns text
language sql immutable
as $$
  select nullif(
    regexp_replace(
      lower(translate(btrim(coalesce(ad, '')), 'İIıŞşĞğÜüÖöÇçÂâÎîÛû', 'iiissgguuooccaaiiuu')),
      '\s+', ' ', 'g'),
    '')
$$;

create table if not exists public.universiteler (
  id                   text primary key check (id ~ '^[a-z0-9-]+$'),
  resmi_ad             text not null unique,
  /* Kaynak adresleri bu alan adında (ya da alt alan adında) olmak zorunda. */
  resmi_alan_adi       text not null check (resmi_alan_adi ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  /* Resmî ad + elle doğrulanmış kısa adlar, `kampus_ad_anahtari` ile. */
  ad_anahtarlari       text[] not null,
  yemekhane_sayfasi    text,
  duyurular_sayfasi    text,
  /* Alan adının nereden doğrulandığı: 'elle' ya da 'yok.gov.tr' (YÖK üniversite listesi). */
  dogrulama_kaynagi    text not null default 'elle' check (dogrulama_kaynagi in ('elle', 'yok.gov.tr')),
  dogrulandi_at        timestamptz not null default now(),
  /* Otomatik kaynak keşfinin son denemesi ve sonucu (automation/kampus_kesif.py). */
  kesif_at             timestamptz,
  kesif_notu           text
);

create table if not exists public.universite_kaynaklari (
  id                 uuid primary key default gen_random_uuid(),
  universite_id      text not null references public.universiteler(id) on delete cascade,
  tur                text not null check (tur in ('yemek', 'duyuru')),
  /* Ayrıştırıcının adı; `automation/kampus_verisi.py` içindeki kayıtla aynı. */
  ayristirici        text not null,
  url                text not null,
  /* Ayrıştırıcıya özgü ayar (ör. WordPress kategori kimliği). */
  ayar               jsonb not null default '{}'::jsonb,
  etkin              boolean not null default true,
  son_kontrol_at     timestamptz,
  son_basari_at      timestamptz,
  son_hata           text,
  unique (universite_id, tur, url)
);

/*
  Kaynak adresi üniversitenin RESMÎ alan adında olmalı. Sorgu dizesi ve
  yol serbest; ana bilgisayar adı alan adının kendisi ya da alt alan adı.
*/
create or replace function public.kaynak_resmi_alanda()
returns trigger
language plpgsql
as $$
declare
  alan text;
  host text;
begin
  select u.resmi_alan_adi into alan from public.universiteler u where u.id = new.universite_id;
  host := lower(substring(new.url from '^https://([^/:?#]+)'));
  if host is null then
    raise exception 'kaynak-https-olmali' using errcode = 'P0001';
  end if;
  if not (host = alan or host like '%.' || alan) then
    raise exception 'kaynak-resmi-alanda-degil' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists kaynak_resmi_alanda on public.universite_kaynaklari;
create trigger kaynak_resmi_alanda
  before insert or update on public.universite_kaynaklari
  for each row execute function public.kaynak_resmi_alanda();

/* ================================================================== */
/*  2) İÇERİK                                                          */
/* ================================================================== */

create table if not exists public.kampus_menuleri (
  universite_id    text not null references public.universiteler(id) on delete cascade,
  tarih            date not null,
  /*
    'gunluk': kaynak öğün adı vermiyor (ör. MSGSÜ'nün aylık PDF'i tek
    tabldot listesi yayımlıyor, "öğle" yazmıyor). Arayüz o durumda öğün
    uydurmuyor, "Günün menüsü" diyor.
  */
  ogun             text not null check (ogun in ('ogle', 'aksam', 'gunluk')),
  yemekler         text[] not null check (cardinality(yemekler) between 1 and 24),
  kalori           integer check (kalori between 1 and 5000),
  /* Menünün yayımlandığı belge (ör. aylık PDF) — "Ayın menüsünü gör". */
  kaynak_url       text not null,
  cekildi_at       timestamptz not null default now(),
  primary key (universite_id, tarih, ogun)
);

create table if not exists public.universite_duyurulari (
  id               uuid primary key default gen_random_uuid(),
  universite_id    text not null references public.universiteler(id) on delete cascade,
  baslik           text not null check (char_length(baslik) between 1 and 400),
  yayin_tarihi     date not null,
  url              text not null,
  kaynak_url       text not null,
  cekildi_at       timestamptz not null default now(),
  unique (universite_id, url)
);

create index if not exists universite_duyurulari_tarih on public.universite_duyurulari (universite_id, yayin_tarihi desc);

/*
  YETKİ: tabloların hepsi istemciye KAPALI. Okuma yalnız `kampusum()`
  üzerinden: bakan kişinin okulunu sunucu çözüyor, istemci üniversite
  kimliği göndermiyor. Yazma yalnız servis anahtarıyla (zamanlanmış iş).
*/
revoke all on public.universiteler, public.universite_kaynaklari, public.kampus_menuleri, public.universite_duyurulari
  from anon, authenticated;
alter table public.universiteler enable row level security;
alter table public.universite_kaynaklari enable row level security;
alter table public.kampus_menuleri enable row level security;
alter table public.universite_duyurulari enable row level security;

/* ================================================================== */
/*  3) OKUMA — kampusum()                                              */
/* ================================================================== */

/*
  Bakan öğrencinin okulu için panel verisi — tek JSON.

    ogrenci_okulu     student_profiles.university (ham); null → "Üniversiteni ekle"
    universite        katalogda birebir karşılığı; null → okul için kaynak yok
    menu              BUGÜNÜN (Europe/Istanbul) satırları; yoksa null
    menu_kaynagi      yemek kaynağının son kontrol / son başarı anı
    duyurular         son 30 günün en yeni 4 duyurusu
    duyuru_kaynagi    duyuru kaynağının son kontrol / son başarı anı

  "Bugün" sunucunun saatine değil İstanbul'a göre: gece yarısından sonra
  UTC'de hâlâ dün olan bir sunucu dünün menüsünü bugün diye verirdi.
*/
create or replace function public.kampusum()
returns jsonb
language sql stable security definer set search_path = public
as $$
  with ben as (
    select sp.university as okul
      from public.student_profiles sp
     where sp.id = auth.uid()
  ),
  uni as (
    select u.*
      from public.universiteler u, ben
     where public.kampus_ad_anahtari(ben.okul) = any (u.ad_anahtarlari)
     limit 1
  ),
  bugun as (
    select (now() at time zone 'Europe/Istanbul')::date as g
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'bugun', (select g from bugun),
    'ogrenci_okulu', (select nullif(btrim(okul), '') from ben),
    'universite', (select jsonb_build_object(
        'id', u.id, 'ad', u.resmi_ad, 'alan_adi', u.resmi_alan_adi,
        'yemekhane_sayfasi', u.yemekhane_sayfasi, 'duyurular_sayfasi', u.duyurular_sayfasi)
      from uni u),
    'menu', (select jsonb_build_object(
        'tarih', min(m.tarih),
        'kaynak_url', min(m.kaynak_url),
        'cekildi_at', max(m.cekildi_at),
        'ogunler', jsonb_agg(jsonb_build_object('ogun', m.ogun, 'yemekler', m.yemekler, 'kalori', m.kalori)
                             order by array_position(array['ogle','gunluk','aksam'], m.ogun)))
      from public.kampus_menuleri m, uni, bugun
     where m.universite_id = uni.id and m.tarih = bugun.g
     having count(*) > 0),
    'menu_kaynagi', (select jsonb_build_object('son_kontrol_at', max(k.son_kontrol_at), 'son_basari_at', max(k.son_basari_at))
      from public.universite_kaynaklari k, uni
     where k.universite_id = uni.id and k.tur = 'yemek' and k.etkin
     having count(*) > 0),
    'duyurular', coalesce((select jsonb_agg(jsonb_build_object('baslik', d.baslik, 'tarih', d.yayin_tarihi, 'url', d.url)
                                            order by d.yayin_tarihi desc, d.cekildi_at desc)
      from (select d.baslik, d.yayin_tarihi, d.url, d.cekildi_at
              from public.universite_duyurulari d, uni, bugun
             where d.universite_id = uni.id and d.yayin_tarihi >= bugun.g - 30
             order by d.yayin_tarihi desc, d.cekildi_at desc limit 4) d), '[]'::jsonb),
    'duyuru_kaynagi', (select jsonb_build_object('son_kontrol_at', max(k.son_kontrol_at), 'son_basari_at', max(k.son_basari_at))
      from public.universite_kaynaklari k, uni
     where k.universite_id = uni.id and k.tur = 'duyuru' and k.etkin
     having count(*) > 0)
  ) end
$$;

revoke all on function public.kampusum() from public, anon;
grant execute on function public.kampusum() to authenticated;
revoke all on function public.kaynak_resmi_alanda() from public, anon, authenticated;

/* ================================================================== */
/*  4) KAYITLAR                                                        */
/* ================================================================== */

/*
  Katalog satırları göçte DEĞİL, `automation/kampus_kesif.py` tarafından
  yazılıyor: elle doğrulanmış olanlar depodaki
  `automation/kampus_kaynaklari.json`dan, yenileri öğrencilerin girdiği
  okul adından YÖK'ün resmî üniversite listesiyle doğrulanarak. Böylece
  kaynak listesi kod incelemesinden geçen bir dosyada duruyor ve yeni bir
  okul eklemek göç gerektirmiyor.
*/
