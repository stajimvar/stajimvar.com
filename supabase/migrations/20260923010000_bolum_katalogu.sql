-- SOSYAL KATMAN C AŞAMASI — KONTROLLÜ BÖLÜM KATALOĞU
--
-- NEDEN BU TABLO VAR
-- ------------------
-- Alan (sektör) artık kullanıcının seçtiği bir şey değil; bölümünden
-- TÜRETİLEN bir sonuç. Türetmenin yapılabilmesi için bölümün de kontrollü
-- bir kimliği olmalı. Bugün elimizdeki tek bölüm bilgisi
-- `student_profiles.department` ve o SERBEST METİN: kısıtı, referansı,
-- normalizasyonu yok. Serbest metinden yetki kuralı türetilemez.
--
-- SLUG'LAR UYDURULMADI
-- --------------------
-- Depoda zaten kontrollü bir bölüm listesi var: `src/data/bolumler.ts`,
-- 42 kayıt, her birinin kalıcı `slug` değeri `/bolumler/<slug>`
-- adresinde kullanılıyor. Bu göçün seed bloğu o dosyadan ÜRETİLDİ
-- (`scripts/bolum-katalogu.mjs`) ve `tests/bolum-katalogu-tutarliligi.test.mjs`
-- iki kaynağın ayrışmadığını ölçüyor. Aynı kimliği paylaşmaları
-- gerekiyor: profildeki bölüm adının arkasındaki rehber sayfası da
-- açılabilmeli.
--
-- KATALOG KASTEN EKSİK
-- --------------------
-- 42 bölüm Türkiye'deki bütün bölümleri kapsamıyor. Eksikliğin karşılığı
-- uydurma bir "Diğer" satırı değil, `department_requests` talep akışı:
-- bölümü listede olmayan öğrenci topluluğa alınmıyor ama sessizce de
-- bırakılmıyor.

create table if not exists public.departments (
  id     uuid primary key default gen_random_uuid(),
  /* Adres ve kod tarafında kullanılan sabit anahtar; ad değişse de kalır. */
  slug   text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  ad     text not null,
  /* `src/data/bolumler.ts` içindeki `BolumGrubu` ile aynı küme. */
  grup   text not null check (grup in
           ('muhendislik','myo','sosyal','tasarim','saglik','hizmet')),
  sira   integer not null default 0,
  /* Kapatılan bölüm listede çıkmıyor ama mevcut profilleri bozmuyor. */
  aktif  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists departments_sira_idx on public.departments (sira);

alter table public.departments enable row level security;

/*
  OKUMA GİRİŞ YAPMIŞ KULLANICIYA AÇIK

  Katalog kurulum ekranının listesi; oturumsuz ziyaretçinin ona ihtiyacı
  yok. `anon`a yetki bırakmak, bugün satır sızdırmasa bile ileride
  yanlışlıkla `to public` bir politika eklendiğinde hazır bekleyen bir
  kapı olurdu (aynı boşluk 20260922010000'de ölçülmüştü).
*/
drop policy if exists "bolum katalogu okunur" on public.departments;
create policy "bolum katalogu okunur" on public.departments
  for select to authenticated using (aktif);

drop policy if exists "bolum katalogunu yonetici okur" on public.departments;
create policy "bolum katalogunu yonetici okur" on public.departments
  for select to authenticated using (public.is_admin());

/*
  YAZMA YALNIZ YÖNETİCİ. Politika ve tablo yetkisi BİRLİKTE veriliyor:
  yalnız politika açmak yetmiyor, PostgREST isteği yetki katmanında
  duruyordu (20260921020000'de `sectors` üzerinde tam bu hata vardı).
*/
drop policy if exists "bolum katalogunu yonetici yazar" on public.departments;
create policy "bolum katalogunu yonetici yazar" on public.departments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.departments to authenticated;
revoke all on public.departments from anon;

/* ------------------------------------------------------------------ */
/*  SEED — scripts/bolum-katalogu.mjs ile ÜRETİLDİ, elle düzenleme.    */
/* ------------------------------------------------------------------ */

insert into public.departments (slug, ad, grup, sira) values
  ('bilgisayar-muhendisligi', 'Bilgisayar Mühendisliği', 'muhendislik', 1),
  ('makine-muhendisligi', 'Makine Mühendisliği', 'muhendislik', 2),
  ('elektrik-elektronik-muhendisligi', 'Elektrik-Elektronik Mühendisliği', 'muhendislik', 3),
  ('endustri-muhendisligi', 'Endüstri Mühendisliği', 'muhendislik', 4),
  ('insaat-muhendisligi', 'İnşaat Mühendisliği', 'muhendislik', 5),
  ('gida-muhendisligi', 'Gıda Mühendisliği', 'muhendislik', 6),
  ('bilgisayar-programciligi', 'Bilgisayar Programcılığı (MYO)', 'myo', 7),
  ('muhasebe-ve-vergi-uygulamalari', 'Muhasebe ve Vergi Uygulamaları (MYO)', 'myo', 8),
  ('giyim-uretim-teknolojisi', 'Giyim Üretim Teknolojisi / Tekstil', 'myo', 9),
  ('mekatronik', 'Mekatronik / Elektronik Teknolojisi (MYO)', 'myo', 10),
  ('isletme', 'İşletme', 'sosyal', 11),
  ('iktisat', 'İktisat / Ekonomi', 'sosyal', 12),
  ('grafik-tasarim', 'Grafik Tasarım', 'tasarim', 13),
  ('halkla-iliskiler-ve-pazarlama', 'Halkla İlişkiler ve Pazarlama', 'tasarim', 14),
  ('moda-tasarimi', 'Moda Tasarımı', 'tasarim', 15),
  ('ic-mimarlik', 'İç Mimarlık', 'tasarim', 16),
  ('radyo-televizyon-ve-sinema', 'Radyo, Televizyon ve Sinema', 'tasarim', 17),
  ('mimarlik', 'Mimarlık', 'muhendislik', 18),
  ('kimya-muhendisligi', 'Kimya Mühendisliği', 'muhendislik', 19),
  ('cevre-muhendisligi', 'Çevre Mühendisliği', 'muhendislik', 20),
  ('harita-ve-geomatik-muhendisligi', 'Harita ve Geomatik Mühendisliği', 'muhendislik', 21),
  ('metalurji-ve-malzeme-muhendisligi', 'Metalurji ve Malzeme Mühendisliği', 'muhendislik', 22),
  ('ziraat-muhendisligi', 'Ziraat Mühendisliği', 'muhendislik', 23),
  ('lojistik', 'Lojistik (MYO)', 'myo', 24),
  ('is-sagligi-ve-guvenligi', 'İş Sağlığı ve Güvenliği (MYO)', 'myo', 25),
  ('cocuk-gelisimi', 'Çocuk Gelişimi (MYO)', 'myo', 26),
  ('yazilim-muhendisligi', 'Yazılım Mühendisliği', 'muhendislik', 27),
  ('mekatronik-muhendisligi', 'Mekatronik Mühendisliği', 'muhendislik', 28),
  ('uluslararasi-iliskiler', 'Uluslararası İlişkiler', 'sosyal', 29),
  ('iletisim', 'İletişim', 'sosyal', 30),
  ('hukuk', 'Hukuk', 'sosyal', 31),
  ('psikoloji', 'Psikoloji', 'sosyal', 32),
  ('uluslararasi-ticaret', 'Uluslararası Ticaret ve İşletmecilik', 'sosyal', 33),
  ('sosyoloji', 'Sosyoloji', 'sosyal', 34),
  ('siyaset-bilimi', 'Siyaset Bilimi ve Kamu Yönetimi', 'sosyal', 35),
  ('eczacilik', 'Eczacılık', 'saglik', 36),
  ('tip', 'Tıp', 'saglik', 37),
  ('hemsirelik', 'Hemşirelik', 'saglik', 38),
  ('fizyoterapi-ve-rehabilitasyon', 'Fizyoterapi ve Rehabilitasyon', 'saglik', 39),
  ('tibbi-laboratuvar-teknikleri', 'Tıbbi Laboratuvar Teknikleri (MYO)', 'saglik', 40),
  ('turizm-ve-otel-yoneticiligi', 'Turizm ve Otel Yöneticiliği', 'hizmet', 41),
  ('gastronomi-ve-mutfak', 'Gastronomi ve Mutfak Sanatları', 'hizmet', 42)
on conflict (slug) do nothing;
