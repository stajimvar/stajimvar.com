-- =====================================================================
-- ŞİRKET İLANLARI İÇİN OTOMATİK KONTROL VE YAYIN
-- =====================================================================
--
-- NEREDEN GELİYORUZ (ölçüldü, 4 Ekim 2026)
-- ----------------------------------------
-- · Şirketin açtığı her ilan `draft` olarak kaydediliyor ve yönetici
--   kuyruğu "bütün taslaklar" (yonetim_onay_kuyrugu: status = 'draft').
--   Yani "taslak kaydet" ile "yayına gönder" AYNI şey; ilan yalnız
--   yönetici bakınca yayına çıkıyor.
-- · `guard_listing_publish` (20261008010000) yayına GEÇİŞİ yalnız
--   yöneticiye ve service_role'e açıyor.
-- · Canlıda bekleyen şirket taslağı YOK (employer_posted: 2 yayında,
--   2 arşiv). Bu göç hiçbir ilanın durumunu değiştirmiyor; toplu yayın
--   yok, yayındaki ilanlara dokunulmuyor.
--
-- YENİ AKIŞ
-- ---------
-- Şirket "Yayına gönder" deyince `ilan_yayina_gonder(ilan)` çağrılıyor.
-- Sunucu, AYNI işlemde, kuralları çalıştırıyor:
--
--   yayinla   → ilan yayına çıkıyor (yönetici beklemeden)
--   duzeltme  → taslakta kalıyor; şirkete hangi alanı nasıl düzelteceği
--   inceleme  → taslakta kalıyor; yönetici kuyruğuna gerekçesiyle düşüyor
--   (hata)    → kontrol tamamlanamadı; ilan YAYINA ÇIKMIYOR, "bekliyor"
--               durumunda sınırlı sayıda yeniden deneniyor
--
-- Taslak kaydetmek ayrı: ilan kaydedilir, kontrol çalışmaz, kuyruğa da
-- düşmez. Yapay zekâ, dış servis ya da API anahtarı YOK; kurallar açık
-- SQL ve sürümlü (`ilan_kontrol_kural_surumu`).
--
-- YAYIN YETKİSİ TARAYICIYA VERİLMİYOR
-- -----------------------------------
-- `guard_listing_publish` korunuyor. Yöneticiye ve service_role'e ek
-- olarak tek bir geçiş açılıyor: AYNI işlemde, ilanın ŞU ANKİ içeriği
-- için otomatik kontrolün "yayinla" dediği bir kayıt `ilan_kontrolleri`
-- tablosunda varsa. O tabloya tarayıcının hiçbir yetkisi yok.
--
-- YAYINDAKİ İLAN DEĞİŞİNCE — SON ONAYLI SÜRÜM YAYINDA KALIR
-- ---------------------------------------------------------
-- Şirket yayındaki ilanının içeriğini değiştirirse kurallar YENİ içerik
-- için çalışıyor (BEFORE UPDATE). Geçerse yeni içerik yayına giriyor.
-- Geçmezse (ya da kontrol tamamlanamazsa) ilanın canlı satırı ESKİ
-- içerikte kalıyor; yeni içerik `ilan_bekleyen_degisiklikleri`
-- tablosunda, kendi durumu ve gerekçesiyle bekliyor. Bu tablo yalnız
-- şirket üyelerine açık: kontrol edilmemiş metin hiçbir ziyaretçiye
-- görünmüyor. Şirket düzeltip yeniden kaydedince ya da "Yayına gönder"
-- deyince bekleyen değişiklik yeniden kontrol ediliyor.
--
-- YÖNETİCİ MÜDAHALESİ
-- -------------------
-- Gerekçeyle yayından kaldırma, incelemedeki ilanı gerekçeyle reddetme,
-- incelemedeki değişikliği onaylama/reddetme. Şirket gerekçeyi kendi
-- panelinde görüyor; her işlem deftere yazılıyor. Yöneticinin kaldırdığı
-- ya da reddettiği ilan, otomatik kontrolü geçse bile yeniden ancak
-- yönetici onayıyla yayına çıkıyor (`yonetici_incelemesi_gerekli`).
--
-- KAYNAKTAN DERLENEN İLANLAR
-- --------------------------
-- Yalnız `origin = 'employer_posted'` ilanlar bu akışa giriyor.
-- Otomasyon (service_role), `scraped` ve `manual` ilanlar eskisi gibi.
--
-- GEÇİŞ PENCERESİ (eski arayüz, yeni veritabanı)
-- ----------------------------------------------
-- CI önce göçü uyguluyor, sonra siteyi yayınlıyor; arada ve açık kalmış
-- eski sekmelerde ESKİ form çalışabilir. Eski form ilanı taslak olarak
-- ekleyip "incelemeye gönderildi" diyordu ve `gonderim_anahtari`
-- göndermiyordu. Böyle bir ekleme "gönderim" sayılıp kontrol aynı
-- işlemde çalıştırılıyor (bkz. 9): eski form kullanan şirketin ilanı
-- sessizce taslakta unutulmuyor. Yeni form her eklemede anahtar
-- gönderdiği için bu yol ona hiç dokunmuyor.

/* ================================================================== */
/*  1) VERİ MODELİ                                                     */
/* ================================================================== */

alter table public.listings
  add column if not exists kontrol_durumu text,
  add column if not exists kontrol_gerekceleri jsonb not null default '[]'::jsonb,
  add column if not exists kontrol_at timestamptz,
  add column if not exists kontrol_kural_surumu text,
  add column if not exists kontrol_denemeleri integer not null default 0,
  add column if not exists kontrol_sonraki_at timestamptz,
  add column if not exists gonderim_anahtari uuid,
  add column if not exists yonetici_incelemesi_gerekli boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_kontrol_durumu_gecerli') then
    alter table public.listings
      add constraint listings_kontrol_durumu_gecerli
      check (kontrol_durumu is null or kontrol_durumu in ('bekliyor', 'gecti', 'duzeltme', 'inceleme'));
  end if;
end $$;

comment on column public.listings.kontrol_durumu is
  'Otomatik ilan kontrolünün son sonucu: bekliyor (kontrol tamamlanamadı, '
  'yeniden denenecek), gecti, duzeltme (şirket düzeltmeli), inceleme '
  '(yönetici kuyruğunda). null = hiç gönderilmedi ya da gönderimden sonra '
  'içerik değişti (yeniden gönderilmeli).';
comment on column public.listings.kontrol_gerekceleri is
  'Şirkete gösterilen gerekçeler: [{alan, mesaj, kural}]. İnceleme '
  'gerekçelerinin ayrıntısı (kanıt metni) burada DEĞİL, yalnız yöneticinin '
  'okuduğu ilan_kontrolleri tablosunda.';
comment on column public.listings.gonderim_anahtari is
  'Formun tek gönderim kimliği. Çift tıklama ya da ağ tekrarında aynı '
  'ilan ikinci kez oluşmasın diye (company_id, gonderim_anahtari) tekil.';
comment on column public.listings.yonetici_incelemesi_gerekli is
  'Yönetici bu ilanı yayından kaldırdı ya da reddetti: otomatik kontrol '
  'geçse bile yeniden yayın yönetici onayına bağlı. Yönetici onayı temizler.';

create unique index if not exists listings_gonderim_anahtari_tekil
  on public.listings (company_id, gonderim_anahtari)
  where gonderim_anahtari is not null;

create index if not exists listings_kontrol_bekleyen_idx
  on public.listings (kontrol_sonraki_at)
  where kontrol_durumu = 'bekliyor';

/*
  KOLON YETKİSİ (42501 dersi, 20261023010000): şirket paneli bu alanları
  OKUYOR; YAZAMIYOR. Yazan yalnız security definer fonksiyonlar ve
  tetikleyici. `gonderim_anahtari` yalnız INSERT'te yazılabiliyor.
*/
grant select (kontrol_durumu, kontrol_gerekceleri, kontrol_at, kontrol_kural_surumu,
              gonderim_anahtari, yonetici_incelemesi_gerekli)
  on public.listings to authenticated;
grant insert (gonderim_anahtari) on public.listings to authenticated;

/* Karar defteri: her kontrol ve her yönetici kararı bir satır. */
create table if not exists public.ilan_kontrolleri (
  id            bigint generated always as identity primary key,
  listing_id    uuid not null references public.listings(id) on delete cascade,
  kaynak        text not null check (kaynak in ('otomatik', 'yonetici')),
  -- 'ilan': ilanın kendisi; 'degisiklik': yayındaki ilanın bekleyen değişikliği
  kapsam        text not null default 'ilan' check (kapsam in ('ilan', 'degisiklik')),
  karar         text not null check (karar in
                  ('yayinla', 'duzeltme', 'inceleme', 'hata',
                   'yonetici_onay', 'yonetici_ret', 'yonetici_kaldirdi',
                   'degisiklik_onay', 'degisiklik_ret')),
  gerekceler    jsonb not null default '[]'::jsonb,
  kural_surumu  text,
  icerik_ozeti  text,
  -- Yayın kapısı "bu işlemde verilmiş bir yayinla kararı var mı" diye
  -- buna bakıyor.
  islem_kimligi bigint not null default txid_current(),
  gonderen      uuid,
  hata          text,
  created_at    timestamptz not null default now()
);

create index if not exists ilan_kontrolleri_ilan_idx
  on public.ilan_kontrolleri (listing_id, id desc);

alter table public.ilan_kontrolleri enable row level security;
-- Politika YOK ve yetki YOK: tarayıcı bu tabloyu ne okur ne yazar.
-- Yönetici kararları `yonetim_onay_kuyrugu` üzerinden görüyor.
revoke all on public.ilan_kontrolleri from public, anon, authenticated;

comment on table public.ilan_kontrolleri is
  'Şirket ilanlarının otomatik kontrol ve yönetici karar defteri: karar, '
  'gerekçe (kanıt metniyle), kural sürümü, içerik özeti, zaman. Yalnız '
  'security definer fonksiyonlar yazıyor.';

/*
  YAYINDAKİ İLANIN BEKLEYEN DEĞİŞİKLİĞİ — ilan başına en fazla bir

  `icerik`: şirketin kaydettiği içerik alanları (canlı satırdaki karşılığı
  son onaylı sürüm). Yalnız şirket üyesi okuyabiliyor; yazan yalnız
  tetikleyici ve security definer fonksiyonlar.
*/
create table if not exists public.ilan_bekleyen_degisiklikleri (
  listing_id   uuid primary key references public.listings(id) on delete cascade,
  icerik       jsonb not null,
  durum        text not null check (durum in ('bekliyor', 'duzeltme', 'inceleme')),
  gerekceler   jsonb not null default '[]'::jsonb,
  kontrol_at   timestamptz,
  kural_surumu text,
  denemeler    integer not null default 0,
  sonraki_at   timestamptz,
  gonderen     uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.ilan_bekleyen_degisiklikleri enable row level security;
revoke all on public.ilan_bekleyen_degisiklikleri from public, anon, authenticated;
grant select on public.ilan_bekleyen_degisiklikleri to authenticated;

drop policy if exists "sirket kendi ilaninin bekleyen degisikligini gorur" on public.ilan_bekleyen_degisiklikleri;
create policy "sirket kendi ilaninin bekleyen degisikligini gorur" on public.ilan_bekleyen_degisiklikleri
  for select to authenticated
  using (exists (select 1 from public.listings l
                  where l.id = listing_id and public.is_company_member(l.company_id)));

/* Zamanlanmış işlerin çalıştığının izi: yönetici "hiç çalışmıyor"u görebilsin. */
create table if not exists public.zamanlanmis_is_kayitlari (
  id         bigint generated always as identity primary key,
  is_adi     text not null,
  calisti_at timestamptz not null default now(),
  islenen    integer not null default 0,
  ayrinti    jsonb not null default '{}'::jsonb
);
create index if not exists zamanlanmis_is_kayitlari_idx
  on public.zamanlanmis_is_kayitlari (is_adi, calisti_at desc);
alter table public.zamanlanmis_is_kayitlari enable row level security;
revoke all on public.zamanlanmis_is_kayitlari from public, anon, authenticated;

/* ================================================================== */
/*  2) YARDIMCILAR                                                     */
/* ================================================================== */

create or replace function public.ilan_kontrol_kural_surumu()
returns text language sql immutable set search_path = public, pg_temp
as $$ select 'ilan-kontrol-2 (2026-10-04)'::text $$;

create or replace function public.ilan_kontrol_deneme_siniri()
returns integer language sql immutable set search_path = public, pg_temp
as $$ select 3 $$;

/* İş tanımı sınırları — formla (src/lib/ilan-formu.mjs) AYNI. */
create or replace function public.ilan_aciklama_en_az()
returns integer language sql immutable set search_path = public, pg_temp
as $$ select 200 $$;
create or replace function public.ilan_aciklama_en_fazla()
returns integer language sql immutable set search_path = public, pg_temp
as $$ select 5000 $$;

/*
  Düz metin: küçük harf, Türkçe harfler ASCII'ye. Kurallar bu metne
  yazılıyor ("katılım ücreti" → "katilim ucreti"). `İ` önce `i`ye
  çevriliyor: lower('İ') bazı yerellerde "i + birleşik nokta" veriyor.
*/
create or replace function public.ilan_metin_duz(p text)
returns text language sql immutable set search_path = public, pg_temp
as $$
  select regexp_replace(
           translate(lower(translate(coalesce(p, ''), 'İ', 'i')), 'ışğüöçâîû', 'isguocaiu'),
           '\s+', ' ', 'g')
$$;

/* Karşılaştırma anahtarı: yalnız harf ve rakam. */
create or replace function public.ilan_metin_anahtari(p text)
returns text language sql immutable set search_path = public, pg_temp
as $$ select btrim(regexp_replace(public.ilan_metin_duz(p), '[^a-z0-9]+', ' ', 'g')) $$;

/*
  BAĞLAMLI EŞLEŞME — tek kelimeye karar verilmiyor

  `desen` metinde geçiyorsa, eşleşmenin çevresindeki pencereye bakılıyor:
  `baglam` (verildiyse) pencerede OLMALI, `olumsuz` pencerede OLMAMALI.
  Örn. "teminat" tek başına yetmiyor; "teminat istenmez" eleniyor.
  İlk geçerli eşleşmenin çevresini (kanıt) döndürüyor, yoksa null.
*/
create or replace function public.ilan_baglamli_kanit(
  p_govde text, p_desen text, p_baglam text, p_olumsuz text, p_pencere integer default 60
)
returns text language plpgsql immutable set search_path = public, pg_temp
as $$
declare
  n integer := 1;
  poz integer;
  eslesme text;
  parca text;
begin
  if p_govde is null or p_govde = '' then
    return null;
  end if;
  loop
    poz := regexp_instr(p_govde, p_desen, 1, n);
    exit when poz is null or poz = 0 or n > 25;
    eslesme := regexp_substr(p_govde, p_desen, 1, n);
    parca := substr(p_govde, greatest(1, poz - p_pencere), length(eslesme) + 2 * p_pencere);
    if (p_baglam is null or parca ~ p_baglam)
       and (p_olumsuz is null or parca !~ p_olumsuz) then
      return btrim(left(parca, 200));
    end if;
    n := n + 1;
  end loop;
  return null;
end;
$$;

/*
  İÇERİK ALANLARI — şirketin yazabildiği, ziyaretçinin gördüğü alanlar

  Özet (parmak izi) ve bekleyen değişiklik bu listeyle çalışıyor. Durum,
  zaman damgaları ve kontrol alanları dışarıda.
*/
create or replace function public.ilan_icerik_alanlari(l public.listings)
returns jsonb language sql stable set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'title', l.title, 'description', l.description,
    'city', l.city, 'work_type', l.work_type, 'term', l.term, 'duration', l.duration,
    'is_paid', l.is_paid, 'stipend_text', l.stipend_text,
    'application_deadline', l.application_deadline, 'department', l.department,
    'responsibilities', l.responsibilities, 'required_skills', l.required_skills,
    'preferred_skills', l.preferred_skills, 'perks', l.perks,
    'insurance_note', l.insurance_note, 'min_grade_level', l.min_grade_level,
    'category', l.category, 'mandatory_staj_accepted', l.mandatory_staj_accepted,
    'voluntary_staj_accepted', l.voluntary_staj_accepted
  )
$$;

create or replace function public.ilan_icerik_ozeti(l public.listings)
returns text language sql stable set search_path = public, pg_temp
as $$
  select md5((public.ilan_icerik_alanlari(l) || jsonb_build_object('company_id', l.company_id))::text)
$$;

/* Gönderen bu şirkette ilan yayınlayabilir mi? Viewer yayınlayamaz. */
create or replace function public.ilan_gonderme_yetkisi(p_sirket uuid, p_kisi uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.company_members m
     where m.company_id = p_sirket and m.user_id = p_kisi
       and (m.is_owner or m.recruiter_role in ('Owner', 'Recruiter'))
  )
$$;

/* Fonksiyonun içinden yapılan güncelleme tetikleyicide yeniden kontrol edilmesin. */
create or replace function public.ilan_kontrol_uygulaniyor()
returns boolean language sql stable set search_path = public, pg_temp
as $$ select coalesce(current_setting('stajimvar.ilan_kontrol_uygulaniyor', true), '') = 'evet' $$;

/* ================================================================== */
/*  3) KURALLAR                                                        */
/* ================================================================== */
--
-- Kural kimlikleri gerekçeyle birlikte kaydediliyor. Bir kuralı
-- değiştiren `ilan_kontrol_kural_surumu`nü de artırmalı.
--
-- FORMLA TUTARLI (src/lib/ilan-formu.mjs · ilanSorunlari)
--   pozisyon 3–120 · şehir (uzaktan çalışmada zorunlu değil) · süre ·
--   ücretli seçildiyse ücret açıklaması (sayı şart DEĞİL: "Asgari staj
--   ücreti" geçerli) · iş tanımı 200–5000 · son başvuru geçmişte olamaz
--   (boş = süresiz, geçerli; ileri tarih sınırı YOK)
--
-- DÜZELTME (şirket kendisi düzeltebilir — şirkete alan alan gösterilir)
--   zorunlu.*, tarih.gecmis, baslik.iletisim
--   tekrar           aynı şirkette başlık + şehir + çalışma şekli + dönem
--                    + departman + iş tanımı birebir aynı, yayında ya da
--                    incelemede. Başlık + şehir TEK BAŞINA tekrar sayılmıyor:
--                    farklı dönem/departman/içerik için geçerli ilan olabilir.
--   baglanti.https, baglanti.dis_form, iletisim.eposta, iletisim.telefon
--
-- İNCELEME (yöneticiye; şirkete ayrıntı gösterilmez)
--   icerik.odeme_talebi, icerik.banka, icerik.teminat, icerik.mesajlasma,
--   icerik.hassas_veri, icerik.zincir_satis, baglanti.ip,
--   baglanti.kisaltici, baglanti.mesajlasma, sirket.dogrulanmamis
--
-- ÖNCELİK: düzeltme varsa önce düzeltme; sonra şüphe varsa inceleme;
-- hiçbiri yoksa yayın. Şüpheler her durumda deftere yazılıyor.

create or replace function public.ilan_kontrol_kurallari(l public.listings)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  duzeltmeler jsonb := '[]'::jsonb;
  supheler    jsonb := '[]'::jsonb;
  bugun   date := (now() at time zone 'Europe/Istanbul')::date;
  baslik  text := btrim(coalesce(l.title, ''));
  aciklama text := btrim(coalesce(l.description, ''));
  duz     text := public.ilan_metin_duz(coalesce(l.title, '') || ' ' || coalesce(l.description, ''));
  tekrar  record;
  b       record;
  url     text;
  konak   text;
  yol     text;
  kanit   text;
  puan    integer := 0;
  zincir  text[] := '{}';
  ifade   text;
  dogrulanmis boolean;
  karar   text;
begin
  /* ------------------------------------------------ zorunlu alanlar */
  if length(baslik) < 3 then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'title', 'kural', 'zorunlu.unvan',
      'mesaj', 'Pozisyon adını yaz (en az 3 karakter).');
  elsif length(baslik) > 120 then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'title', 'kural', 'zorunlu.unvan',
      'mesaj', 'Pozisyon adı en fazla 120 karakter olabilir.');
  end if;

  /* Uzaktan çalışmada şehir zorunlu değil (formla aynı). */
  if btrim(coalesce(l.city, '')) = '' and l.work_type::text <> 'Remote' then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'city', 'kural', 'zorunlu.sehir',
      'mesaj', 'Şehri yaz. Tamamen uzaktan çalışılacaksa çalışma şeklini "Uzaktan" seç.');
  end if;

  if btrim(coalesce(l.duration, '')) = '' then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'duration', 'kural', 'zorunlu.sure',
      'mesaj', 'Staj süresini yaz (örn. 20 iş günü ya da "Yıl boyu, esnek").');
  end if;

  /* Ücret: AÇIKLAMA yeter; sayı şart değil ("Asgari staj ücreti" geçerli). */
  if l.is_paid is true and btrim(coalesce(l.stipend_text, '')) = '' then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'stipend_text', 'kural', 'zorunlu.ucret',
      'mesaj', 'Ücretli staj seçtin; ücreti açıkla (ör. "Asgari staj ücreti" ya da net tutar) veya başka bir ücret seçeneği seç.');
  end if;

  if length(aciklama) < public.ilan_aciklama_en_az() then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'description', 'kural', 'zorunlu.aciklama',
      'mesaj', format('İş tanımı en az %s karakter olmalı (şu an %s).', public.ilan_aciklama_en_az(), length(aciklama)));
  elsif length(aciklama) > public.ilan_aciklama_en_fazla() then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'description', 'kural', 'zorunlu.aciklama',
      'mesaj', format('İş tanımı en fazla %s karakter olabilir (şu an %s).', public.ilan_aciklama_en_fazla(), length(aciklama)));
  end if;

  /* ----------------------------------------------------------- tarih */
  /* Boş son başvuru = süresiz/yıl boyu, geçerli. İleri tarih sınırı yok. */
  if l.application_deadline is not null and l.application_deadline < bugun then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'application_deadline', 'kural', 'tarih.gecmis',
      'mesaj', format('Son başvuru tarihi (%s) geçmiş. Bugün ya da sonrası bir tarih seç ya da süresiz ilan için alanı boş bırak.',
                      to_char(l.application_deadline, 'DD.MM.YYYY')));
  end if;

  /* ------------------------------------------ pozisyon adında iletişim */
  if public.ilan_metin_duz(baslik) ~ '(https?://|www\.|@|\d{3}[ .-]?\d{3}[ .-]?\d{2}[ .-]?\d{2})' then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'title', 'kural', 'baslik.iletisim',
      'mesaj', 'Pozisyon adına bağlantı, e-posta ya da telefon yazma; yalnız pozisyonun adını yaz.');
  end if;

  /* ----------------------------------------------------------- tekrar */
  select o.id, o.title, o.status
    into tekrar
    from public.listings o
   where o.company_id = l.company_id
     and o.id <> l.id
     and o.origin = 'employer_posted'
     and (o.status = 'published' or (o.status = 'draft' and o.kontrol_durumu in ('bekliyor', 'inceleme')))
     and public.ilan_metin_anahtari(o.title) = public.ilan_metin_anahtari(l.title)
     and public.ilan_metin_anahtari(o.city) = public.ilan_metin_anahtari(l.city)
     and o.work_type = l.work_type
     and o.term = l.term
     and public.ilan_metin_anahtari(o.department) = public.ilan_metin_anahtari(l.department)
     and public.ilan_metin_anahtari(o.description) = public.ilan_metin_anahtari(l.description)
   order by (o.status = 'published') desc, o.created_at
   limit 1;
  if found then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'title', 'kural', 'tekrar',
      'mesaj', format('Birebir aynı ilan zaten %s: "%s". Aynı ilanı ikinci kez açmak yerine mevcut ilanı düzenle; '
                      'farklı bir dönem, departman ya da kontenjansa ilan açıyorsan bunu başlıkta ya da iş tanımında belirt.',
                      case when tekrar.status = 'published' then 'yayında' else 'incelemede' end,
                      tekrar.title));
  end if;

  /* -------------------------------------------------------- bağlantılar */
  for b in
    select m[1] as u
      from regexp_matches(aciklama, '((?:https?://|www\.)[^\s<>"''()\[\]]+)', 'gi') as m
  loop
    url := rtrim(b.u, '.,;:!?');
    konak := lower(coalesce(substring(url from '^(?:[A-Za-z]+://)?([^/:?#]+)'), ''));
    konak := regexp_replace(konak, '^www\.', '');
    yol := lower(coalesce(substring(url from '^(?:[A-Za-z]+://)?[^/?#]+(/[^?#]*)'), ''));

    if konak ~ '^\d{1,3}(\.\d{1,3}){3}$' or konak = 'localhost' then
      supheler := supheler || jsonb_build_object('kural', 'baglanti.ip',
        'mesaj', 'Metinde alan adı yerine IP adresine giden bağlantı var.', 'kanit', url);
    elsif konak in ('bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'cutt.ly', 'shorturl.at', 'rebrand.ly',
                    'is.gd', 'ow.ly', 'buff.ly', 'tiny.cc', 'rb.gy', 's.id', 'v.gd', 'adf.ly', 'shorte.st') then
      supheler := supheler || jsonb_build_object('kural', 'baglanti.kisaltici',
        'mesaj', 'Metinde hedefini gizleyen kısaltılmış bağlantı var.', 'kanit', url);
    elsif konak in ('wa.me', 'whatsapp.com', 'chat.whatsapp.com', 'api.whatsapp.com',
                    't.me', 'telegram.me', 'telegram.org') then
      supheler := supheler || jsonb_build_object('kural', 'baglanti.mesajlasma',
        'mesaj', 'Metin adayları mesajlaşma uygulamasına yönlendiriliyor.', 'kanit', url);
    elsif konak = 'forms.gle'
          or (konak = 'docs.google.com' and yol like '/forms%')
          or konak like '%typeform.com' or konak like '%jotform.com'
          or konak in ('forms.office.com', 'forms.microsoft.com') then
      duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'description', 'kural', 'baglanti.dis_form',
        'mesaj', format('Başvurular StajımVar üzerinden alınıyor; dış başvuru formu bağlantısını metinden kaldır: %s', url));
    elsif url ~* '^http://' then
      duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'description', 'kural', 'baglanti.https',
        'mesaj', format('Bu bağlantı güvenli değil (http). https:// ile yaz ya da kaldır: %s', url));
    end if;
  end loop;

  /* ------------------------------------- iletişim (platform kuralı) */
  kanit := public.ilan_baglamli_kanit(duz,
    '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}',
    '(basvur|cv|ozgecmis|gonder|ilet)', null, 60);
  if kanit is not null then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'description', 'kural', 'iletisim.eposta',
      'mesaj', 'Başvurular StajımVar üzerinden alınıyor; adaylardan e-postayla CV ya da başvuru istemeyi metinden çıkar.');
  end if;

  kanit := public.ilan_baglamli_kanit(duz,
    '(\+?90[ .-]?)?\(?0?[2-5][0-9]{2}\)?[ .-]?[0-9]{3}[ .-]?[0-9]{2}[ .-]?[0-9]{2}',
    '(basvur|cv|ozgecmis|ara|iletisim|ulas|bilgi)', null, 60);
  if kanit is not null then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'description', 'kural', 'iletisim.telefon',
      'mesaj', 'Telefon numarasını metinden çıkar; adaylar StajımVar üzerinden başvuruyor ve şirketle buradan yazışıyor.');
  end if;

  /* -------------------------------------------- şüpheli (bağlamlı) */
  kanit := public.ilan_baglamli_kanit(duz,
    '(egitim|kayit|katilim|basvuru|sertifika|kurs|materyal|dosya|uyelik|giris)[ ]?(ucreti|bedeli|payi|masrafi|ucret)',
    '(yatir|ode|talep|alinir|alinacak|alinmaktadir|tahsil|gerek)',
    '(alinmaz|alinmamaktadir|odenmez|odenmemektedir|talep edilmez|istenmez|yoktur|bulunmamaktadir|ucretsiz|karsilan)', 60);
  if kanit is not null then
    supheler := supheler || jsonb_build_object('kural', 'icerik.odeme_talebi',
      'mesaj', 'Adaydan ücret ya da ödeme istendiği izlenimi veren ifade.', 'kanit', kanit);
  end if;

  kanit := public.ilan_baglamli_kanit(duz,
    '(\miban\M|havale|\meft\M|hesap numara)',
    '(yatir|gonder|ode|ucret|bedel|tutar)',
    '(istenmez|talep edilmez|yoktur|hesabiniza|maas|ucretiniz|size odenir|tarafimizca|sirketimizce)', 60);
  if kanit is not null then
    supheler := supheler || jsonb_build_object('kural', 'icerik.banka',
      'mesaj', 'Banka hesabına ödeme ya da para transferi ifadesi.', 'kanit', kanit);
  end if;

  kanit := public.ilan_baglamli_kanit(duz,
    '(teminat|depozito|kapora|on odeme)', null,
    '(istenmez|alinmaz|talep edilmez|yoktur|bulunmamaktadir|gerekmez)', 60);
  if kanit is not null then
    supheler := supheler || jsonb_build_object('kural', 'icerik.teminat',
      'mesaj', 'Teminat, depozito ya da kapora ifadesi.', 'kanit', kanit);
  end if;

  kanit := public.ilan_baglamli_kanit(duz,
    '(whatsapp|telegram|\mwp\M|wpden)',
    '(basvur|cv|ozgecmis|iletisim|yaz|mesaj|ulas|numara|gonder)', null, 60);
  if kanit is not null then
    supheler := supheler || jsonb_build_object('kural', 'icerik.mesajlasma',
      'mesaj', 'Başvuru ya da iletişim mesajlaşma uygulamasına yönlendiriliyor.', 'kanit', kanit);
  end if;

  kanit := public.ilan_baglamli_kanit(duz,
    '(tc kimlik|t\.c\. kimlik|kimlik numara|kimlik no|kimlik fotokopi|nufus cuzdan|kimlik karti|banka hesab|kredi karti|kart bilgi|\msifre)',
    '(gonder|ilet|iste|talep|paylas|yukle|ekle|yaz)',
    '(istenmez|talep edilmez|paylasmayin|paylasmaniz gerekmez)', 60);
  if kanit is not null then
    supheler := supheler || jsonb_build_object('kural', 'icerik.hassas_veri',
      'mesaj', 'Kimlik, kart ya da hesap bilgisi istendiği izlenimi veren ifade.', 'kanit', kanit);
  end if;

  /* Zincir satış: tek ifade yetmiyor (güçlü 2, zayıf 1 puan; eşik 2). */
  foreach ifade in array array['network marketing', 'mlm', 'kendi isinin patronu', 'piramit sistem',
                               'piramit satis', 'saadet zinciri'] loop
    if duz ~ ('\m' || ifade || '\M') then
      puan := puan + 2;
      zincir := zincir || ifade;
    end if;
  end loop;
  foreach ifade in array array['pasif gelir', 'sinirsiz kazanc', 'ekip kur', 'referans getir', 'uye getir',
                               'yatirim yap', 'bayilik', 'kazanc garantisi', 'evden para kazan'] loop
    if duz ~ ('\m' || ifade) then
      puan := puan + 1;
      zincir := zincir || ifade;
    end if;
  end loop;
  if puan >= 2 then
    supheler := supheler || jsonb_build_object('kural', 'icerik.zincir_satis',
      'mesaj', format('Zincir/çok katlı satış dili (puan %s).', puan),
      'kanit', array_to_string(zincir, ', '));
  end if;

  /* ------------------------------------------------ şirket doğrulaması */
  select c.verified into dogrulanmis from public.companies c where c.id = l.company_id;
  if not coalesce(dogrulanmis, false) then
    supheler := supheler || jsonb_build_object('kural', 'sirket.dogrulanmamis',
      'mesaj', 'Şirket henüz doğrulanmadı.');
  end if;

  /* ------------------------------------------- önceki yönetici kararı */
  if l.yonetici_incelemesi_gerekli then
    supheler := supheler || jsonb_build_object('kural', 'yonetici.onceki_karar',
      'mesaj', 'İlan daha önce yönetici tarafından yayından kaldırıldı ya da reddedildi; yeniden yayın yönetici onayına bağlı.');
  end if;

  karar := case
    when jsonb_array_length(duzeltmeler) > 0 then 'duzeltme'
    when jsonb_array_length(supheler) > 0 then 'inceleme'
    else 'yayinla'
  end;

  return jsonb_build_object(
    'karar', karar,
    'duzeltmeler', duzeltmeler,
    'supheler', supheler,
    'surum', public.ilan_kontrol_kural_surumu()
  );
end;
$$;

/*
  ŞİRKETE GÖRÜNEN GEREKÇE

  Düzeltmede alan alan ne yapılacağı. İncelemede ayrıntı (hangi kural,
  hangi kanıt) yalnız yöneticide: kuralın kendisini şirkete göstermek,
  kötü niyetli ilanın kelimesini değiştirip geçmesini kolaylaştırırdı.
  Şirketin bilmesi gereken iki inceleme nedeni (doğrulama ve önceki
  yönetici kararı) açıkça söyleniyor. Süre vaadi YOK.
*/
create or replace function public.ilan_sirkete_gorunen_gerekceler(p_sonuc jsonb)
returns jsonb language plpgsql immutable set search_path = public, pg_temp
as $$
declare
  kurallar text[];
  sonuc jsonb := '[]'::jsonb;
begin
  if p_sonuc->>'karar' = 'duzeltme' then
    return coalesce(p_sonuc->'duzeltmeler', '[]'::jsonb);
  end if;
  if p_sonuc->>'karar' <> 'inceleme' then
    return '[]'::jsonb;
  end if;

  select coalesce(array_agg(x->>'kural'), '{}') into kurallar
    from jsonb_array_elements(coalesce(p_sonuc->'supheler', '[]'::jsonb)) x;

  if 'sirket.dogrulanmamis' = any(kurallar) then
    sonuc := sonuc || jsonb_build_object('alan', null, 'kural', 'sirket.dogrulanmamis',
      'mesaj', 'Şirket hesabın henüz doğrulanmadı. İlan, doğrulamayla birlikte ekibimiz tarafından incelenecek.');
  end if;
  if 'yonetici.onceki_karar' = any(kurallar) then
    sonuc := sonuc || jsonb_build_object('alan', null, 'kural', 'yonetici.onceki_karar',
      'mesaj', 'Bu ilan daha önce ekibimiz tarafından yayından kaldırıldığı ya da reddedildiği için yeniden yayın ekibimizin onayına bağlı.');
  end if;
  if exists (select 1 from unnest(kurallar) k where k not in ('sirket.dogrulanmamis', 'yonetici.onceki_karar'))
     or jsonb_array_length(sonuc) = 0 then
    sonuc := sonuc || jsonb_build_object('alan', null, 'kural', 'inceleme',
      'mesaj', 'İlanın ekibimizin incelemesine gönderildi. Karar verildiğinde bu sayfada görünecek.');
  end if;
  return sonuc;
end;
$$;

/* Şirket arayüzünün okuduğu sonuç. Dört görünür durum + bekleyen değişiklik. */
create or replace function public.ilan_kontrol_sonucu(p_ilan uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', l.id,
    'durum', case
      when l.status = 'published' then 'yayinda'
      when l.kontrol_durumu = 'bekliyor' then 'kontrol_ediliyor'
      when l.kontrol_durumu = 'duzeltme' then 'duzeltme_gerekiyor'
      when l.kontrol_durumu = 'inceleme' then 'inceleme_gerekiyor'
      else 'taslak'
    end,
    'gerekceler', l.kontrol_gerekceleri,
    'kontrolZamani', l.kontrol_at,
    'kuralSurumu', l.kontrol_kural_surumu,
    /* Yayındaki ilanın bekleyen değişikliği: canlı sürüm yayında kalıyor. */
    'degisiklik', (
      select jsonb_build_object(
        'durum', case d.durum
                   when 'bekliyor' then 'kontrol_ediliyor'
                   when 'duzeltme' then 'duzeltme_gerekiyor'
                   else 'inceleme_gerekiyor' end,
        'gerekceler', d.gerekceler,
        'kontrolZamani', d.kontrol_at)
      from public.ilan_bekleyen_degisiklikleri d where d.listing_id = l.id)
  )
  from public.listings l where l.id = p_ilan
$$;

/* ================================================================== */
/*  4) İLANI KONTROL ET VE UYGULA (iç fonksiyon)                       */
/* ================================================================== */

create or replace function public.ilan_kontrolu_uygula(p_ilan uuid, p_gonderen uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l        public.listings%rowtype;
  sonuc    jsonb;
  karar    text;
  ozet     text;
  surum    text := public.ilan_kontrol_kural_surumu();
  deneme   integer;
  hata_metni text;
  once_yayinlandi boolean;
begin
  /* Satır kilidi: aynı ilan için eş zamanlı iki gönderim sıraya giriyor. */
  select * into l from public.listings where id = p_ilan for update;
  if not found then
    raise exception 'Ilan bulunamadi' using errcode = 'no_data_found';
  end if;

  /* Yayında: varsa bekleyen DEĞİŞİKLİĞİ kontrol et; yoksa yeni kayıt yok. */
  if l.status = 'published' then
    if exists (select 1 from public.ilan_bekleyen_degisiklikleri d where d.listing_id = p_ilan) then
      return public.ilan_degisikligi_uygula(p_ilan, p_gonderen);
    end if;
    return public.ilan_kontrol_sonucu(p_ilan);
  end if;

  ozet := public.ilan_icerik_ozeti(l);

  /*
    ÇİFT GÖNDERİM: aynı içerik, aynı kural sürümü için verilmiş karar
    hâlâ geçerliyse yeniden kontrol edilmiyor ve deftere ikinci satır
    yazılmıyor.
  */
  if l.kontrol_durumu in ('duzeltme', 'inceleme') and exists (
       select 1 from public.ilan_kontrolleri k
        where k.listing_id = p_ilan and k.kaynak = 'otomatik' and k.kapsam = 'ilan'
          and k.icerik_ozeti = ozet and k.kural_surumu = surum
          and k.karar = l.kontrol_durumu
     ) then
    return public.ilan_kontrol_sonucu(p_ilan);
  end if;

  /*
    KONTROL HATASI: ilan YAYINA ÇIKMIYOR

    Kuralların çalışması bir alt işlemde. Hata olursa ilan taslakta
    kalıyor, durum "bekliyor" oluyor ve zamanlanmış iş yeniden deniyor.
    Sınır aşılınca ilan yönetici kuyruğuna düşüyor.
  */
  begin
    sonuc := public.ilan_kontrol_kurallari(l);
  exception when others then
    get stacked diagnostics hata_metni = message_text;
    deneme := l.kontrol_denemeleri + 1;
    insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, kural_surumu, icerik_ozeti, gonderen, hata)
    values (p_ilan, 'otomatik', 'ilan', 'hata', surum, ozet, p_gonderen, left(hata_metni, 500));

    if deneme >= public.ilan_kontrol_deneme_siniri() then
      insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
      values (p_ilan, 'otomatik', 'ilan', 'inceleme',
              jsonb_build_array(jsonb_build_object('kural', 'kontrol.tamamlanamadi',
                'mesaj', format('Otomatik kontrol %s denemede tamamlanamadı. Son hata: %s', deneme, left(hata_metni, 200)))),
              surum, ozet, p_gonderen);
      update public.listings
         set kontrol_durumu = 'inceleme',
             kontrol_gerekceleri = public.ilan_sirkete_gorunen_gerekceler(jsonb_build_object('karar', 'inceleme')),
             kontrol_at = now(), kontrol_kural_surumu = surum,
             kontrol_denemeleri = deneme, kontrol_sonraki_at = null
       where id = p_ilan;
    else
      update public.listings
         set kontrol_durumu = 'bekliyor', kontrol_gerekceleri = '[]'::jsonb,
             kontrol_at = now(), kontrol_kural_surumu = surum,
             kontrol_denemeleri = deneme,
             kontrol_sonraki_at = now() + make_interval(mins => (5 * power(3, deneme - 1))::integer)
       where id = p_ilan;
    end if;
    return public.ilan_kontrol_sonucu(p_ilan);
  end;

  karar := sonuc->>'karar';

  insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
  values (p_ilan, 'otomatik', 'ilan', karar,
          coalesce(sonuc->'duzeltmeler', '[]'::jsonb) || coalesce(sonuc->'supheler', '[]'::jsonb),
          surum, ozet, p_gonderen);

  if karar = 'yayinla' then
    /* Yayın tarihi ilk yayının tarihi; şirketin yazdığı posted_at değil. */
    once_yayinlandi := exists (
      select 1 from public.ilan_kontrolleri k
       where k.listing_id = p_ilan and k.karar in ('yayinla', 'yonetici_onay')
         and k.islem_kimligi <> txid_current());
    update public.listings
       set status = 'published',
           posted_at = case when once_yayinlandi then coalesce(l.posted_at, now()) else now() end,
           kontrol_durumu = 'gecti', kontrol_gerekceleri = '[]'::jsonb,
           kontrol_at = now(), kontrol_kural_surumu = surum,
           kontrol_denemeleri = 0, kontrol_sonraki_at = null
     where id = p_ilan;
  else
    update public.listings
       set kontrol_durumu = karar,
           kontrol_gerekceleri = public.ilan_sirkete_gorunen_gerekceler(sonuc),
           kontrol_at = now(), kontrol_kural_surumu = surum,
           kontrol_denemeleri = 0, kontrol_sonraki_at = null
     where id = p_ilan;
  end if;

  return public.ilan_kontrol_sonucu(p_ilan);
end;
$$;

/* ================================================================== */
/*  5) YAYINDAKİ İLANIN BEKLEYEN DEĞİŞİKLİĞİ                           */
/* ================================================================== */

/* Bekleyen içeriği canlı satıra yaz (tetikleyicinin yeniden kontrolü kapalı). */
create or replace function public.ilan_bekleyen_icerigi_yaz(p_ilan uuid, p_icerik jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l public.listings%rowtype;
  y public.listings%rowtype;
begin
  select * into l from public.listings where id = p_ilan;
  y := jsonb_populate_record(l, p_icerik);
  perform set_config('stajimvar.ilan_kontrol_uygulaniyor', 'evet', true);
  update public.listings
     set title = y.title, description = y.description, city = y.city,
         work_type = y.work_type, term = y.term, duration = y.duration,
         is_paid = y.is_paid, stipend_text = y.stipend_text,
         application_deadline = y.application_deadline, department = y.department,
         responsibilities = y.responsibilities, required_skills = y.required_skills,
         preferred_skills = y.preferred_skills, perks = y.perks,
         insurance_note = y.insurance_note, min_grade_level = y.min_grade_level,
         category = y.category, mandatory_staj_accepted = y.mandatory_staj_accepted,
         voluntary_staj_accepted = y.voluntary_staj_accepted
   where id = p_ilan;
  perform set_config('stajimvar.ilan_kontrol_uygulaniyor', '', true);
end;
$$;

create or replace function public.ilan_degisikligi_uygula(p_ilan uuid, p_gonderen uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l        public.listings%rowtype;
  d        public.ilan_bekleyen_degisiklikleri%rowtype;
  birlesik public.listings%rowtype;
  sonuc    jsonb;
  karar    text;
  ozet     text;
  surum    text := public.ilan_kontrol_kural_surumu();
  deneme   integer;
  hata_metni text;
begin
  select * into l from public.listings where id = p_ilan for update;
  select * into d from public.ilan_bekleyen_degisiklikleri where listing_id = p_ilan for update;
  if not found then
    return public.ilan_kontrol_sonucu(p_ilan);
  end if;

  birlesik := jsonb_populate_record(l, d.icerik);
  ozet := public.ilan_icerik_ozeti(birlesik);

  /* Çift gönderim: aynı değişiklik için karar zaten verilmiş. */
  if d.durum in ('duzeltme', 'inceleme') and exists (
       select 1 from public.ilan_kontrolleri k
        where k.listing_id = p_ilan and k.kaynak = 'otomatik' and k.kapsam = 'degisiklik'
          and k.icerik_ozeti = ozet and k.kural_surumu = surum and k.karar = d.durum) then
    return public.ilan_kontrol_sonucu(p_ilan);
  end if;

  begin
    sonuc := public.ilan_kontrol_kurallari(birlesik);
  exception when others then
    get stacked diagnostics hata_metni = message_text;
    deneme := d.denemeler + 1;
    insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, kural_surumu, icerik_ozeti, gonderen, hata)
    values (p_ilan, 'otomatik', 'degisiklik', 'hata', surum, ozet, p_gonderen, left(hata_metni, 500));
    if deneme >= public.ilan_kontrol_deneme_siniri() then
      insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
      values (p_ilan, 'otomatik', 'degisiklik', 'inceleme',
              jsonb_build_array(jsonb_build_object('kural', 'kontrol.tamamlanamadi',
                'mesaj', format('Değişikliğin otomatik kontrolü %s denemede tamamlanamadı. Son hata: %s', deneme, left(hata_metni, 200)))),
              surum, ozet, p_gonderen);
      update public.ilan_bekleyen_degisiklikleri
         set durum = 'inceleme', denemeler = deneme, sonraki_at = null, kontrol_at = now(),
             kural_surumu = surum, updated_at = now(),
             gerekceler = public.ilan_sirkete_gorunen_gerekceler(jsonb_build_object('karar', 'inceleme'))
       where listing_id = p_ilan;
    else
      update public.ilan_bekleyen_degisiklikleri
         set durum = 'bekliyor', denemeler = deneme, gerekceler = '[]'::jsonb, kontrol_at = now(),
             kural_surumu = surum, updated_at = now(),
             sonraki_at = now() + make_interval(mins => (5 * power(3, deneme - 1))::integer)
       where listing_id = p_ilan;
    end if;
    return public.ilan_kontrol_sonucu(p_ilan);
  end;

  karar := sonuc->>'karar';
  insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
  values (p_ilan, 'otomatik', 'degisiklik', karar,
          coalesce(sonuc->'duzeltmeler', '[]'::jsonb) || coalesce(sonuc->'supheler', '[]'::jsonb),
          surum, ozet, p_gonderen);

  if karar = 'yayinla' then
    perform public.ilan_bekleyen_icerigi_yaz(p_ilan, d.icerik);
    delete from public.ilan_bekleyen_degisiklikleri where listing_id = p_ilan;
    update public.listings
       set kontrol_durumu = 'gecti', kontrol_gerekceleri = '[]'::jsonb,
           kontrol_at = now(), kontrol_kural_surumu = surum
     where id = p_ilan;
  else
    update public.ilan_bekleyen_degisiklikleri
       set durum = karar, gerekceler = public.ilan_sirkete_gorunen_gerekceler(sonuc),
           kontrol_at = now(), kural_surumu = surum, denemeler = 0, sonraki_at = null, updated_at = now()
     where listing_id = p_ilan;
  end if;

  return public.ilan_kontrol_sonucu(p_ilan);
end;
$$;

/* ================================================================== */
/*  6) ŞİRKETİN ÇAĞIRDIĞI: YAYINA GÖNDER                               */
/* ================================================================== */

create or replace function public.ilan_yayina_gonder(p_ilan uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ben    uuid := auth.uid();
  sirket uuid;
  kaynak public.listing_origin;
  durum  public.listing_status;
begin
  if ben is null then
    raise exception 'Oturum gerekli' using errcode = '42501';
  end if;

  select l.company_id, l.origin, l.status into sirket, kaynak, durum
    from public.listings l where l.id = p_ilan;
  if not found then
    raise exception 'Ilan bulunamadi' using errcode = 'no_data_found';
  end if;

  /* Yetki: o şirketin ilan yayınlayabilen üyesi (Viewer değil). */
  if not public.ilan_gonderme_yetkisi(sirket, ben) then
    raise exception 'Bu sirkette ilan yayimlama yetkin yok' using errcode = '42501';
  end if;

  if kaynak <> 'employer_posted' then
    raise exception 'Bu ilan sirket panelinden yayina gonderilemez' using errcode = 'check_violation';
  end if;

  if durum = 'archived' then
    raise exception 'Arsivlenmis ilan yayina gonderilemez' using errcode = 'check_violation';
  end if;

  return public.ilan_kontrolu_uygula(p_ilan, ben);
end;
$$;

/* ================================================================== */
/*  7) YENİDEN DENEME (zamanlanmış iş, service_role)                   */
/* ================================================================== */
--
-- GitHub zamanlaması gecikebilir ya da hiç çalışmayabilir; bu fonksiyon
-- her çağrıda `zamanlanmis_is_kayitlari`na iz bırakıyor. Yönetici
-- kuyruğu son çalışmayı ve gecikmiş kontrolleri gösteriyor: iş durursa
-- fark ediliyor. Arayüz bir süre vaadi vermiyor.

create or replace function public.ilan_kontrollerini_yeniden_dene(p_adet integer default 20)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r        record;
  gonderen uuid;
  n        integer := 0;
  sinir    integer := greatest(1, least(p_adet, 100));
begin
  /* İlanın kendisi */
  for r in
    select l.id, l.company_id
      from public.listings l
     where l.kontrol_durumu = 'bekliyor'
       and l.status <> 'published'
       and coalesce(l.kontrol_sonraki_at, now()) <= now()
     order by l.kontrol_sonraki_at nulls first
     limit sinir
       for update skip locked
  loop
    select k.gonderen into gonderen
      from public.ilan_kontrolleri k
     where k.listing_id = r.id and k.gonderen is not null
     order by k.id desc limit 1;

    if gonderen is null or not public.ilan_gonderme_yetkisi(r.company_id, gonderen) then
      insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, gerekceler, kural_surumu, gonderen)
      values (r.id, 'otomatik', 'ilan', 'inceleme',
              jsonb_build_array(jsonb_build_object('kural', 'kontrol.gonderen_yetkisiz',
                'mesaj', 'Yeniden denemede gönderenin bu şirkette yayın yetkisi bulunamadı.')),
              public.ilan_kontrol_kural_surumu(), gonderen);
      update public.listings
         set kontrol_durumu = 'inceleme',
             kontrol_gerekceleri = public.ilan_sirkete_gorunen_gerekceler(jsonb_build_object('karar', 'inceleme')),
             kontrol_at = now(), kontrol_sonraki_at = null
       where id = r.id;
    else
      perform public.ilan_kontrolu_uygula(r.id, gonderen);
    end if;
    n := n + 1;
  end loop;

  /* Yayındaki ilanın bekleyen değişikliği */
  for r in
    select d.listing_id as id, l.company_id, d.gonderen
      from public.ilan_bekleyen_degisiklikleri d
      join public.listings l on l.id = d.listing_id
     where d.durum = 'bekliyor'
       and coalesce(d.sonraki_at, now()) <= now()
     order by d.sonraki_at nulls first
     limit sinir
       for update of d skip locked
  loop
    if r.gonderen is null or not public.ilan_gonderme_yetkisi(r.company_id, r.gonderen) then
      update public.ilan_bekleyen_degisiklikleri
         set durum = 'inceleme', sonraki_at = null, updated_at = now(),
             gerekceler = public.ilan_sirkete_gorunen_gerekceler(jsonb_build_object('karar', 'inceleme'))
       where listing_id = r.id;
    else
      perform public.ilan_degisikligi_uygula(r.id, r.gonderen);
    end if;
    n := n + 1;
  end loop;

  insert into public.zamanlanmis_is_kayitlari (is_adi, islenen)
  values ('ilan_kontrollerini_yeniden_dene', n);
  /* Defter sınırsız büyümesin: işin son 500 izi yeter. */
  delete from public.zamanlanmis_is_kayitlari z
   where z.is_adi = 'ilan_kontrollerini_yeniden_dene'
     and z.id < (select min(id) from (select id from public.zamanlanmis_is_kayitlari
                                       where is_adi = 'ilan_kontrollerini_yeniden_dene'
                                       order by id desc limit 500) s);
  return n;
end;
$$;

/* ================================================================== */
/*  8) DÜZENLEME TETİKLEYİCİSİ                                         */
/* ================================================================== */
--
-- · Yayındaki şirket ilanının İÇERİĞİ şirket tarafından değişirse kurallar
--   YENİ içerik için çalışıyor. Geçerse yeni içerik yayına giriyor;
--   geçmezse ya da kontrol tamamlanamazsa canlı satır ESKİ içerikte
--   kalıyor ve yeni içerik `ilan_bekleyen_degisiklikleri`ne yazılıyor.
-- · Gönderilmiş ama yayında olmayan ilanın içeriği değişirse eski karar
--   yeni içeriği temsil etmiyor: durum sıfırlanıyor, yeniden gönderilmeli.
-- · Yöneticinin onay/arşiv kararları deftere yazılıyor.
-- · service_role (otomasyon), employer_posted dışındaki ilanlar ve
--   kontrol fonksiyonlarının kendi yazımı etkilenmiyor.

create or replace function public.ilan_duzenleme_kontrolu()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rol   text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  sonuc jsonb;
  karar text;
  hata_metni text;
  surum text := public.ilan_kontrol_kural_surumu();
  icerik jsonb;
  durum_d text;
  gerekce_d jsonb;
begin
  if new.origin <> 'employer_posted' or rol = 'service_role' or public.ilan_kontrol_uygulaniyor() then
    return new;
  end if;

  /* ------------------------------------------- yönetici kararı izi */
  if public.is_admin() then
    if old.status <> 'published' and new.status = 'published' then
      new.kontrol_durumu := 'gecti';
      new.kontrol_gerekceleri := '[]'::jsonb;
      new.kontrol_at := now();
      new.kontrol_denemeleri := 0;
      new.kontrol_sonraki_at := null;
      new.yonetici_incelemesi_gerekli := false;
      insert into public.ilan_kontrolleri (listing_id, kaynak, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
      values (new.id, 'yonetici', 'yonetici_onay',
              case when coalesce(btrim(new.review_note), '') <> ''
                   then jsonb_build_array(jsonb_build_object('kural', 'yonetici', 'mesaj', new.review_note))
                   else '[]'::jsonb end,
              surum, public.ilan_icerik_ozeti(new), auth.uid());
    elsif old.status = 'draft' and new.status = 'archived' and old.kontrol_durumu = 'inceleme' then
      /* Eski "Reddet" (yonetim_ilan_karari) yolu: arşivliyor, not yok. */
      new.kontrol_durumu := null;
      new.kontrol_gerekceleri := '[]'::jsonb;
      new.kontrol_at := now();
      insert into public.ilan_kontrolleri (listing_id, kaynak, karar, kural_surumu, icerik_ozeti, gonderen)
      values (new.id, 'yonetici', 'yonetici_ret', surum, public.ilan_icerik_ozeti(new), auth.uid());
    end if;
    return new;
  end if;

  /* ------------------------------ gönderilmiş taslağın içeriği değişti */
  if old.status <> 'published'
     and old.kontrol_durumu is not null
     and public.ilan_icerik_ozeti(old) is distinct from public.ilan_icerik_ozeti(new) then
    new.kontrol_durumu := null;
    new.kontrol_gerekceleri := '[]'::jsonb;
    new.kontrol_denemeleri := 0;
    new.kontrol_sonraki_at := null;
    return new;
  end if;

  /* ----------------------------------- yayındaki ilanın içeriği değişti */
  if old.status = 'published' and new.status = 'published'
     and public.ilan_icerik_ozeti(old) is distinct from public.ilan_icerik_ozeti(new) then
    icerik := public.ilan_icerik_alanlari(new);

    begin
      sonuc := public.ilan_kontrol_kurallari(new);
    exception when others then
      get stacked diagnostics hata_metni = message_text;
      sonuc := null;
    end;

    if sonuc is null then
      insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, kural_surumu, icerik_ozeti, gonderen, hata)
      values (new.id, 'otomatik', 'degisiklik', 'hata', surum, public.ilan_icerik_ozeti(new), auth.uid(), left(hata_metni, 500));
      durum_d := 'bekliyor';
      gerekce_d := '[]'::jsonb;
    else
      karar := sonuc->>'karar';
      insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
      values (new.id, 'otomatik', 'degisiklik', karar,
              coalesce(sonuc->'duzeltmeler', '[]'::jsonb) || coalesce(sonuc->'supheler', '[]'::jsonb),
              surum, public.ilan_icerik_ozeti(new), auth.uid());
      if karar = 'yayinla' then
        /* Yeni sürüm yayında; önceki bekleyen değişiklik geçersiz. */
        delete from public.ilan_bekleyen_degisiklikleri where listing_id = new.id;
        new.kontrol_durumu := 'gecti';
        new.kontrol_gerekceleri := '[]'::jsonb;
        new.kontrol_at := now();
        new.kontrol_kural_surumu := surum;
        return new;
      end if;
      durum_d := karar;
      gerekce_d := public.ilan_sirkete_gorunen_gerekceler(sonuc);
    end if;

    /* Son onaylı sürüm yayında kalıyor: içerik alanları eski hâline. */
    new.title := old.title;  new.description := old.description;  new.city := old.city;
    new.work_type := old.work_type;  new.term := old.term;  new.duration := old.duration;
    new.is_paid := old.is_paid;  new.stipend_text := old.stipend_text;
    new.application_deadline := old.application_deadline;  new.department := old.department;
    new.responsibilities := old.responsibilities;  new.required_skills := old.required_skills;
    new.preferred_skills := old.preferred_skills;  new.perks := old.perks;
    new.insurance_note := old.insurance_note;  new.min_grade_level := old.min_grade_level;
    new.category := old.category;  new.mandatory_staj_accepted := old.mandatory_staj_accepted;
    new.voluntary_staj_accepted := old.voluntary_staj_accepted;

    insert into public.ilan_bekleyen_degisiklikleri
      (listing_id, icerik, durum, gerekceler, kontrol_at, kural_surumu, denemeler, sonraki_at, gonderen)
    values (new.id, icerik, durum_d, gerekce_d, now(), surum,
            case when durum_d = 'bekliyor' then 1 else 0 end,
            case when durum_d = 'bekliyor' then now() + interval '5 minutes' end,
            auth.uid())
    on conflict (listing_id) do update
      set icerik = excluded.icerik, durum = excluded.durum, gerekceler = excluded.gerekceler,
          kontrol_at = excluded.kontrol_at, kural_surumu = excluded.kural_surumu,
          denemeler = excluded.denemeler, sonraki_at = excluded.sonraki_at,
          gonderen = excluded.gonderen, updated_at = now();
  end if;

  return new;
end;
$$;

/*
  Ad `listings_kontrol_duzenleme`: aynı zamanlamadaki tetikleyiciler
  ALFABETİK sırayla çalışıyor. Bu ad `listings_publish_guard`dan ve
  `t4`ten ÖNCE geliyor.
*/
drop trigger if exists listings_kontrol_duzenleme on public.listings;
create trigger listings_kontrol_duzenleme
  before update on public.listings
  for each row execute function public.ilan_duzenleme_kontrolu();

/* ================================================================== */
/*  9) GEÇİŞ UYUMU — eski formun eklediği ilan gönderim sayılıyor       */
/* ================================================================== */
--
-- Eski form `gonderim_anahtari` göndermeden taslak ekleyip "incelemeye
-- gönderildi" diyordu. Göç ile yeni arayüzün yayını arasındaki pencerede
-- ve açık kalmış eski sekmelerde böyle bir ekleme kontrolsüz taslakta
-- unutulmasın: aynı işlemde kontrol çalıştırılıyor. Yeni form her
-- eklemede anahtar gönderiyor; bu yol ona dokunmuyor.

create or replace function public.ilan_eski_istemci_gonderimi()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rol text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
begin
  if new.origin = 'employer_posted' and new.status = 'draft' and new.gonderim_anahtari is null
     and rol = 'authenticated' and not public.is_admin()
     and auth.uid() is not null and public.ilan_gonderme_yetkisi(new.company_id, auth.uid()) then
    perform public.ilan_kontrolu_uygula(new.id, auth.uid());
  end if;
  return null;
end;
$$;

drop trigger if exists listings_eski_istemci_gonderimi on public.listings;
create trigger listings_eski_istemci_gonderimi
  after insert on public.listings
  for each row execute function public.ilan_eski_istemci_gonderimi();

/* ================================================================== */
/*  10) YAYIN KAPISI — tek yeni geçiş: bu işlemdeki "yayinla" kararı    */
/* ================================================================== */

create or replace function public.guard_listing_publish()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rol text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
begin
  /* OTOMASYON MUAF — derlenen ilanlar (değişmedi). */
  if rol = 'service_role' then
    return new;
  end if;

  /* YAYINA GEÇİŞ DIŞINDAKİ HER ŞEY SERBEST (değişmedi). */
  if new.status <> 'published'
     or (tg_op = 'UPDATE' and old.status is not distinct from 'published') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  /*
    OTOMATİK KONTROL (20261120010000)

    Yalnız AYNI işlemde, ilanın ŞU ANKİ içeriği için verilmiş bir
    otomatik "yayinla" kararı varsa. Kararı yalnız
    `ilan_kontrolu_uygula` yazıyor; `ilan_kontrolleri` tablosuna
    tarayıcının hiçbir yetkisi yok. INSERT ile doğrudan yayın yok.
  */
  if tg_op = 'UPDATE' and exists (
       select 1 from public.ilan_kontrolleri k
        where k.listing_id = new.id
          and k.kaynak = 'otomatik'
          and k.kapsam = 'ilan'
          and k.karar = 'yayinla'
          and k.islem_kimligi = txid_current()
          and k.icerik_ozeti = public.ilan_icerik_ozeti(new)
     ) then
    return new;
  end if;

  raise exception 'Ilan yayina ancak otomatik kontrol ya da yonetici onayiyla alinir'
    using errcode = 'check_violation';
end;
$function$;

/* ================================================================== */
/*  11) YÖNETİCİ MÜDAHALESİ — gerekçeli, defterli                      */
/* ================================================================== */

create or replace function public.yonetim_gerekce_dogrula(p_gerekce text)
returns text language plpgsql immutable set search_path = public, pg_temp
as $$
begin
  if length(btrim(coalesce(p_gerekce, ''))) < 10 then
    raise exception 'Sirketin anlayacagi bir gerekce yaz (en az 10 karakter)'
      using errcode = 'check_violation';
  end if;
  return btrim(p_gerekce);
end;
$$;

/*
  ACİL YAYINDAN KALDIRMA

  İlan taslağa çekiliyor (şirket düzeltebilsin diye arşivlenmiyor),
  gerekçe şirkete "düzeltme gerekiyor" olarak gösteriliyor, bekleyen
  değişiklik siliniyor ve ilan bundan sonra ancak yönetici onayıyla
  yeniden yayına çıkıyor.
*/
create or replace function public.yonetim_ilan_yayindan_kaldir(p_ilan uuid, p_gerekce text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  gerekce text;
  l public.listings%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Bu islem yalnizca yoneticiye acik' using errcode = '42501';
  end if;
  gerekce := public.yonetim_gerekce_dogrula(p_gerekce);

  select * into l from public.listings where id = p_ilan for update;
  if not found then
    raise exception 'Ilan bulunamadi' using errcode = 'no_data_found';
  end if;
  if l.origin <> 'employer_posted' then
    raise exception 'Bu islem sirketin actigi ilanlar icin' using errcode = 'check_violation';
  end if;
  if l.status <> 'published' then
    raise exception 'Ilan yayinda degil' using errcode = 'check_violation';
  end if;

  perform set_config('stajimvar.ilan_kontrol_uygulaniyor', 'evet', true);
  update public.listings
     set status = 'draft',
         kontrol_durumu = 'duzeltme',
         kontrol_gerekceleri = jsonb_build_array(jsonb_build_object(
           'alan', null, 'kural', 'yonetici.kaldirdi',
           'mesaj', 'İlan ekibimiz tarafından yayından kaldırıldı: ' || gerekce)),
         kontrol_at = now(),
         yonetici_incelemesi_gerekli = true
   where id = p_ilan;
  perform set_config('stajimvar.ilan_kontrol_uygulaniyor', '', true);

  delete from public.ilan_bekleyen_degisiklikleri where listing_id = p_ilan;

  insert into public.ilan_kontrolleri (listing_id, kaynak, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
  values (p_ilan, 'yonetici', 'yonetici_kaldirdi',
          jsonb_build_array(jsonb_build_object('kural', 'yonetici', 'mesaj', gerekce)),
          public.ilan_kontrol_kural_surumu(), public.ilan_icerik_ozeti(l), auth.uid());

  return public.ilan_kontrol_sonucu(p_ilan);
end;
$$;

/*
  İNCELEMEDEKİ İLANI GEREKÇEYLE REDDETME

  Arşivlemiyor: şirket gerekçeyi kendi panelinde görsün ve düzeltebilsin.
  Yeniden gönderim yine yöneticiye düşüyor.
*/
create or replace function public.yonetim_ilan_reddet(p_ilan uuid, p_gerekce text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  gerekce text;
  l public.listings%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Bu islem yalnizca yoneticiye acik' using errcode = '42501';
  end if;
  gerekce := public.yonetim_gerekce_dogrula(p_gerekce);

  select * into l from public.listings where id = p_ilan for update;
  if not found then
    raise exception 'Ilan bulunamadi' using errcode = 'no_data_found';
  end if;
  if l.origin <> 'employer_posted' or l.status <> 'draft' or l.kontrol_durumu is distinct from 'inceleme' then
    raise exception 'Ilan incelemede degil' using errcode = 'check_violation';
  end if;

  perform set_config('stajimvar.ilan_kontrol_uygulaniyor', 'evet', true);
  update public.listings
     set kontrol_durumu = 'duzeltme',
         kontrol_gerekceleri = jsonb_build_array(jsonb_build_object(
           'alan', null, 'kural', 'yonetici.reddetti',
           'mesaj', 'İlan ekibimiz tarafından yayına alınmadı: ' || gerekce)),
         kontrol_at = now(),
         yonetici_incelemesi_gerekli = true
   where id = p_ilan;
  perform set_config('stajimvar.ilan_kontrol_uygulaniyor', '', true);

  insert into public.ilan_kontrolleri (listing_id, kaynak, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
  values (p_ilan, 'yonetici', 'yonetici_ret',
          jsonb_build_array(jsonb_build_object('kural', 'yonetici', 'mesaj', gerekce)),
          public.ilan_kontrol_kural_surumu(), public.ilan_icerik_ozeti(l), auth.uid());

  return public.ilan_kontrol_sonucu(p_ilan);
end;
$$;

/* İncelemedeki DEĞİŞİKLİK: onayla → yeni sürüm yayına; reddet → eski sürüm kalır. */
create or replace function public.yonetim_degisiklik_karari(p_ilan uuid, p_karar text, p_gerekce text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  d public.ilan_bekleyen_degisiklikleri%rowtype;
  l public.listings%rowtype;
  gerekce text;
begin
  if not public.is_admin() then
    raise exception 'Bu islem yalnizca yoneticiye acik' using errcode = '42501';
  end if;
  if p_karar not in ('onayla', 'reddet') then
    raise exception 'Karar onayla ya da reddet olmali' using errcode = 'check_violation';
  end if;

  select * into l from public.listings where id = p_ilan for update;
  select * into d from public.ilan_bekleyen_degisiklikleri where listing_id = p_ilan for update;
  if not found or d.durum <> 'inceleme' then
    raise exception 'Incelemede bekleyen degisiklik yok' using errcode = 'check_violation';
  end if;

  if p_karar = 'onayla' then
    perform public.ilan_bekleyen_icerigi_yaz(p_ilan, d.icerik);
    delete from public.ilan_bekleyen_degisiklikleri where listing_id = p_ilan;
    update public.listings
       set kontrol_durumu = 'gecti', kontrol_gerekceleri = '[]'::jsonb, kontrol_at = now(),
           yonetici_incelemesi_gerekli = false
     where id = p_ilan;
    insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
    values (p_ilan, 'yonetici', 'degisiklik', 'degisiklik_onay',
            case when coalesce(btrim(p_gerekce), '') <> ''
                 then jsonb_build_array(jsonb_build_object('kural', 'yonetici', 'mesaj', btrim(p_gerekce)))
                 else '[]'::jsonb end,
            public.ilan_kontrol_kural_surumu(),
            public.ilan_icerik_ozeti(jsonb_populate_record(l, d.icerik)), auth.uid());
  else
    gerekce := public.yonetim_gerekce_dogrula(p_gerekce);
    update public.ilan_bekleyen_degisiklikleri
       set durum = 'duzeltme', updated_at = now(), kontrol_at = now(),
           gerekceler = jsonb_build_array(jsonb_build_object(
             'alan', null, 'kural', 'yonetici.reddetti',
             'mesaj', 'Değişiklik ekibimiz tarafından yayına alınmadı: ' || gerekce))
     where listing_id = p_ilan;
    insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
    values (p_ilan, 'yonetici', 'degisiklik', 'degisiklik_ret',
            jsonb_build_array(jsonb_build_object('kural', 'yonetici', 'mesaj', gerekce)),
            public.ilan_kontrol_kural_surumu(),
            public.ilan_icerik_ozeti(jsonb_populate_record(l, d.icerik)), auth.uid());
  end if;

  return public.ilan_kontrol_sonucu(p_ilan);
end;
$$;

/* ================================================================== */
/*  12) YÖNETİCİ KUYRUĞU                                               */
/* ================================================================== */
--
-- Eskiden "bütün taslaklar"dı. Artık şirket taslağı, şirket göndermeden
-- kuyruğa düşmüyor. Şirket dışı taslaklar (manual/scraped) eskisi gibi
-- kuyrukta. Ayrıca: incelemedeki değişiklikler (canlı ↔ bekleyen),
-- kontrolü tamamlanamayanlar, son kararlar ve yeniden deneme işinin
-- sağlığı (son çalışma, gecikmiş kontrol sayısı).

create or replace function public.yonetim_onay_kuyrugu()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  sonuc jsonb;
begin
  if not public.is_admin() then
    raise exception 'yonetim_onay_kuyrugu yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'ilanlar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',        l.id,
               'baslik',    l.title,
               'sirket',    c.name,
               'sehir',     l.city,
               'ulke',      l.country_code,
               'kaynak',    l.origin::text,
               'calisma',   l.work_type::text,
               'basvuruYolu', l.application_method::text,
               'adres',     l.apply_url,
               'sonBasvuru', l.application_deadline,
               'kaynakDurumu', l.source_status,
               'aciklamaUzunluk', length(coalesce(l.description, '')),
               'olustu',    l.created_at,
               'guncellendi', l.updated_at,
               'kontrolDurumu', l.kontrol_durumu,
               'kontrolZamani', l.kontrol_at,
               'kuralSurumu', l.kontrol_kural_surumu,
               'yoneticiIncelemesiGerekli', l.yonetici_incelemesi_gerekli,
               'kontrolGerekceleri', (
                 select k.gerekceler from public.ilan_kontrolleri k
                  where k.listing_id = l.id and k.kapsam = 'ilan' and k.karar <> 'hata'
                  order by k.id desc limit 1)
             ) order by l.created_at desc), '[]'::jsonb)
      from listings l
      left join companies c on c.id = l.company_id
      where l.status = 'draft'
        and (l.origin <> 'employer_posted' or l.kontrol_durumu = 'inceleme')
    ),

    'degisiklikler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',        l.id,
               'baslik',    l.title,
               'sirket',    c.name,
               'canli',     public.ilan_icerik_alanlari(l),
               'bekleyen',  d.icerik,
               'kontrolZamani', d.kontrol_at,
               'kuralSurumu', d.kural_surumu,
               'kontrolGerekceleri', (
                 select k.gerekceler from public.ilan_kontrolleri k
                  where k.listing_id = l.id and k.kapsam = 'degisiklik' and k.karar <> 'hata'
                  order by k.id desc limit 1)
             ) order by d.updated_at desc), '[]'::jsonb)
      from public.ilan_bekleyen_degisiklikleri d
      join listings l on l.id = d.listing_id
      left join companies c on c.id = l.company_id
      where d.durum = 'inceleme'
    ),

    'kontrolBekleyenler', (
      select coalesce(jsonb_agg(s.satir order by s.sonraki), '[]'::jsonb)
      from (
        select l.kontrol_sonraki_at as sonraki, jsonb_build_object(
                 'id', l.id, 'kapsam', 'ilan', 'baslik', l.title, 'sirket', c.name,
                 'denemeler', l.kontrol_denemeleri, 'sonrakiDeneme', l.kontrol_sonraki_at,
                 'sonHata', (select k.hata from public.ilan_kontrolleri k
                              where k.listing_id = l.id and k.kapsam = 'ilan' and k.karar = 'hata'
                              order by k.id desc limit 1)) as satir
          from listings l left join companies c on c.id = l.company_id
         where l.kontrol_durumu = 'bekliyor'
        union all
        select d.sonraki_at, jsonb_build_object(
                 'id', l.id, 'kapsam', 'degisiklik', 'baslik', l.title, 'sirket', c.name,
                 'denemeler', d.denemeler, 'sonrakiDeneme', d.sonraki_at,
                 'sonHata', (select k.hata from public.ilan_kontrolleri k
                              where k.listing_id = l.id and k.kapsam = 'degisiklik' and k.karar = 'hata'
                              order by k.id desc limit 1))
          from public.ilan_bekleyen_degisiklikleri d
          join listings l on l.id = d.listing_id
          left join companies c on c.id = l.company_id
         where d.durum = 'bekliyor'
      ) s
    ),

    'yenidenDenemeIsi', jsonb_build_object(
      'sonCalisma', (select max(z.calisti_at) from public.zamanlanmis_is_kayitlari z
                      where z.is_adi = 'ilan_kontrollerini_yeniden_dene'),
      /* Zamanı bir saatten fazla geçmiş deneme: iş gecikiyor ya da çalışmıyor. */
      'gecikmisKontroller', (
        (select count(*) from listings l
          where l.kontrol_durumu = 'bekliyor' and l.kontrol_sonraki_at < now() - interval '1 hour')
        + (select count(*) from public.ilan_bekleyen_degisiklikleri d
            where d.durum = 'bekliyor' and d.sonraki_at < now() - interval '1 hour'))
    ),

    'sonKararlar', (
      select coalesce(jsonb_agg(s.satir order by s.id desc), '[]'::jsonb)
      from (
        select k.id, jsonb_build_object(
                 'id',          k.id,
                 'ilanId',      k.listing_id,
                 'baslik',      l.title,
                 'sirket',      c.name,
                 'ilanDurumu',  l.status::text,
                 'kaynak',      k.kaynak,
                 'kapsam',      k.kapsam,
                 'karar',       k.karar,
                 'gerekceler',  k.gerekceler,
                 'kuralSurumu', k.kural_surumu,
                 'hata',        k.hata,
                 'zaman',       k.created_at
               ) as satir
          from public.ilan_kontrolleri k
          join public.listings l on l.id = k.listing_id
          left join public.companies c on c.id = l.company_id
         order by k.id desc
         limit 30
      ) s
    ),

    'sahiplenmeler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',       k.id,
               'sirket',   c.name,
               'kisi',     k.contact_name,
               'unvan',    k.contact_title,
               'eposta',   k.work_email,
               'not',      k.note,
               'olustu',   k.created_at
             ) order by k.created_at desc), '[]'::jsonb)
      from company_claims k
      left join companies c on c.id = k.company_id
      where k.status = 'pending'
    ),

    'bolumler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',       b.id,
               'istenen',  b.requested_department,
               'universite', b.universite,
               'aciklama', b.aciklama,
               'olustu',   b.created_at
             ) order by b.created_at desc), '[]'::jsonb)
      from department_requests b
      where b.status = 'pending'
    ),

    -- DOĞRULAMA: VKN'si olan ama henüz doğrulanmamış şirketler (değişmedi).
    'dogrulamalar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',        c.id,
               'sirket',    c.name,
               'slug',      c.slug,
               'site',      c.website_url,
               'ikEposta',  c.hr_email,
               'vkn',       c.vkn,
               'mersis',    c.mersis,
               'uyeSayisi', (select count(*) from company_members m where m.company_id = c.id),
               'sahiplenildi', c.claimed_at,
               'redNotu',   c.dogrulama_notu,
               'redTarihi', c.dogrulama_reddi_at,
               'guncellendi', c.updated_at
             ) order by c.updated_at desc), '[]'::jsonb)
      from companies c
      where c.vkn is not null
        and coalesce(c.verified, false) = false
        and (c.dogrulama_reddi_at is null or c.updated_at > c.dogrulama_reddi_at)
    )
  ) into sonuc;

  return sonuc;
end;
$function$;

/* ================================================================== */
/*  13) YETKİLER                                                       */
/* ================================================================== */

revoke all on function public.ilan_kontrol_kural_surumu() from public, anon, authenticated;
revoke all on function public.ilan_kontrol_deneme_siniri() from public, anon, authenticated;
revoke all on function public.ilan_aciklama_en_az() from public, anon, authenticated;
revoke all on function public.ilan_aciklama_en_fazla() from public, anon, authenticated;
revoke all on function public.ilan_metin_duz(text) from public, anon, authenticated;
revoke all on function public.ilan_metin_anahtari(text) from public, anon, authenticated;
revoke all on function public.ilan_baglamli_kanit(text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.ilan_icerik_alanlari(public.listings) from public, anon, authenticated;
revoke all on function public.ilan_icerik_ozeti(public.listings) from public, anon, authenticated;
revoke all on function public.ilan_gonderme_yetkisi(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ilan_kontrol_uygulaniyor() from public, anon, authenticated;
revoke all on function public.ilan_kontrol_kurallari(public.listings) from public, anon, authenticated;
revoke all on function public.ilan_sirkete_gorunen_gerekceler(jsonb) from public, anon, authenticated;
revoke all on function public.ilan_kontrol_sonucu(uuid) from public, anon, authenticated;
revoke all on function public.ilan_kontrolu_uygula(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ilan_bekleyen_icerigi_yaz(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.ilan_degisikligi_uygula(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ilan_duzenleme_kontrolu() from public, anon, authenticated;
revoke all on function public.ilan_eski_istemci_gonderimi() from public, anon, authenticated;
revoke all on function public.yonetim_gerekce_dogrula(text) from public, anon, authenticated;

/* Şirketin tek kapısı. Yetki içeride sorgulanıyor. */
revoke all on function public.ilan_yayina_gonder(uuid) from public, anon;
grant execute on function public.ilan_yayina_gonder(uuid) to authenticated;

/* Yönetici kapıları: is_admin() içeride. */
revoke all on function public.yonetim_ilan_yayindan_kaldir(uuid, text) from public, anon;
revoke all on function public.yonetim_ilan_reddet(uuid, text) from public, anon;
revoke all on function public.yonetim_degisiklik_karari(uuid, text, text) from public, anon;
grant execute on function public.yonetim_ilan_yayindan_kaldir(uuid, text) to authenticated;
grant execute on function public.yonetim_ilan_reddet(uuid, text) to authenticated;
grant execute on function public.yonetim_degisiklik_karari(uuid, text, text) to authenticated;

/* Zamanlanmış yeniden deneme yalnız service_role. */
revoke all on function public.ilan_kontrollerini_yeniden_dene(integer) from public, anon, authenticated;
grant execute on function public.ilan_kontrollerini_yeniden_dene(integer) to service_role;
