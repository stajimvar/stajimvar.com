-- İŞVEREN KARİYER SAYFASI KONTROLLERİ
--
-- NEDEN YENİ BİR TABLO
-- -------------------
-- Editoryal bilgi ile otomatik kontrol sonucu BUGÜN AYNI DOSYADA:
-- `scripts/isveren-baglanti-kontrol.mjs` çıktısını doğrudan
-- `src/data/stajProgramlari.ts` içine, `sonKontrol` alanına yazıyor
-- (betiğin kendi başlığı da bunu söylüyor: "Çıktı doğrudan
-- src/data/stajProgramlari.ts içine").
--
-- Bunun iki somut sonucu var:
--   · Her günlük kontrol EDİTORYAL KAYNAK DOSYAYI değiştiriyor; yani
--     bir ölçüm sonucu commit gerektiriyor ve insan yazısıyla makine
--     çıktısı aynı diff'te karışıyor.
--   · Tek bir tarih alanı var: "denedik" ile "başarılı oldu" ayrımı
--     yok, hata nedeni hiç saklanmıyor ve program durumu için yer yok.
--
-- Editoryal alanlar (ad, sektör, özet, bölümler, kariyer adresi) TS
-- dosyasında KALIYOR — onlar bizim yazımız ve gözden geçirilerek
-- değişiyor. Ölçüm buraya geliyor. İkisini birleştiren tek sözleşme
-- `src/lib/isveren-dizini.mjs`.
--
-- İKİNCİ DİZİN DEĞİL: bu tablo şirket listesi tutmuyor. Satırın
-- anahtarı editoryal dosyadaki `slug`; listenin kaynağı hâlâ orası.

create type public.isveren_url_durumu as enum (
  'calisiyor',
  'gecici_hata',
  'bozuk'
);

create type public.isveren_program_durumu as enum (
  'acik',
  'kapali',
  'bilinmiyor'
);

create table if not exists public.employer_career_checks (
  /*
    ANAHTAR EDİTORYAL DOSYADAN

    Yabancı anahtar YOK: `stajProgramlari.ts` bir veritabanı tablosu
    değil. Satır, editoryal dosyadan silinen bir şirket için artık
    olarak kalabilir; işçi yalnız dosyada olanları yazıyor ve arayüz
    yalnız dosyadakileri okuyor — artık satır görünmüyor.
  */
  slug text primary key,

  /* -------------------------------------------------- BAĞLANTI DURUMU */

  /*
    ÜÇ DURUM, ÜÇÜ AYRI

      calisiyor    adres çağrıldı ve 2xx döndü
      gecici_hata  403 / 429 / 5xx / zaman aşımı — adres bozuk DEĞİL
      bozuk        404 / 410 / DNS yok

    `gecici_hata` ile `bozuk` ayrımı şart: üçüncü tarafın bizi bir kez
    engellemesi, adresi ölü ilan etmek için sebep değil.
  */
  url_durumu public.isveren_url_durumu,

  /* Son DENEME — başarılı olup olmadığına bakmaksızın. */
  url_denendi_at timestamptz,

  /*
    Son BAŞARILI kontrol. Başarısız denemede KORUNUYOR: kartta
    gösterilen tarih "adres en son ne zaman çalıştığı doğrulandı"
    sorusunun cevabı ve bir 429 onu geçersiz kılmıyor.
  */
  url_basarili_at timestamptz,

  /* Güvenli hata nedeni: durum kodu ve kısa sebep, sayfa içeriği yok. */
  url_hata text,

  /* ------------------------------------------------- PROGRAM DURUMU */

  /*
    HTTP 200 AÇIK PROGRAM KANITI DEĞİL

    Bağlantının çalışması ile staj programının açık olması iki ayrı
    iddia. `acik` yalnız sayfada staj/intern/trainee programı VE aktif
    bir başvuru yolu bulunduğunda; `kapali` yalnız programın
    kapandığına dair açık ifade bulunduğunda yazılıyor. Geri kalan her
    şey `bilinmiyor`.

    Varsayılan YOK: hiç kontrol edilmemiş şirket `null` ve arayüz onu
    da "bilinmiyor" gösteriyor — ama veritabanında "ölçtük ve
    bilemedik" ile "hiç ölçmedik" ayrı duruyor.
  */
  program_durumu public.isveren_program_durumu,

  /*
    KANITIN TÜRÜ — İÇERİĞİ DEĞİL

    Kısa bir etiket: 'staj-programi-ve-basvuru-yolu',
    'basvuru-kapandi-ifadesi', 'kanit-yok'. Sayfa metni
    SAKLANMIYOR: üçüncü tarafın içeriğini kopyalamak ve kişisel veri
    taşıma riski almak gerekmiyor; karar için kanıtın türü yeterli.
  */
  program_kaniti text,
  program_kontrol_at timestamptz,

  guncellendi_at timestamptz not null default now(),

  constraint employer_career_checks_slug_var check (length(btrim(slug)) > 0)
);

create index if not exists employer_career_checks_program_idx
  on public.employer_career_checks (program_durumu);

alter table public.employer_career_checks enable row level security;

/*
  OKUMA HERKESE AÇIK — YAZMA YALNIZ SERVİS ANAHTARI

  Kontrol sonuçları herkese açık ilan verisi kadar açık: hangi kariyer
  sayfasının çalıştığı bir sır değil ve kart bunu gösteriyor. Ama
  istemci YAZAMIYOR: bir kullanıcı program durumunu "açık" yapıp
  başkasını yanlış yönlendirebilirdi.
*/
drop policy if exists "isveren kontrolleri herkese acik" on public.employer_career_checks;
create policy "isveren kontrolleri herkese acik" on public.employer_career_checks
  for select to anon, authenticated using (true);

comment on table public.employer_career_checks is
  'İşveren kariyer sayfalarının otomatik kontrol sonucu. Şirket LİSTESİ '
  'değil: liste src/data/stajProgramlari.ts içinde ve anahtar oradaki '
  'slug. Editoryal bilgi ile ölçüm bilerek ayrı tutuluyor.';

comment on column public.employer_career_checks.program_durumu is
  'acik = sayfada staj programı VE aktif başvuru yolu bulundu, '
  'kapali = kapanış ifadesi bulundu, bilinmiyor = kanıt yok. '
  'HTTP 200 tek başına acik yapmıyor.';
