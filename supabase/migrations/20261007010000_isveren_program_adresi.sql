-- STAJ PROGRAMININ KENDİ ADRESİ
--
-- NEDEN GEREKLİ
-- ------------
-- Kartta "Programa başvur" yazabilmenin şartı, gidilecek adresin
-- GENEL KARİYER SAYFASI OLMAMASI. Tablodaki tek adres editoryal
-- dosyadaki `kariyerUrl` ve o adreslerin 44'ü de genel kariyer
-- sayfası (`/kariyer`, `/career`, `/insan-kaynaklari`). Onunla
-- "Programa başvur" demek, öğrenciyi staj başvurusu sanıp genel bir
-- kurumsal sayfaya göndermek olurdu.
--
-- Bu kolon YALNIZ kanıtlanmış açık programda doluyor: işçi genel
-- kariyer sayfasında staja özgü bir bağlantı bulup o adresi çağırıyor
-- ve orada aktif başvuru görürse adresi buraya yazıyor. Kanıt yoksa
-- `null` kalıyor ve arayüz "Şirketin kariyer sayfası" etiketini
-- kullanıyor.
--
-- ÖLÇÜLEN DURUM (14 Eylül 2026): 44 şirketin hiçbirinde kanıtlanmış
-- açık program yok, yani kolon her satırda `null`. Kolon bugün boş
-- diye eklenmiyor değil — "açık" kararının yanında adresi olmadan o
-- karar arayüzde kullanılamaz ve kural yeniden gevşemiş olurdu.

alter table public.employer_career_checks
  add column if not exists program_url text;

comment on column public.employer_career_checks.program_url is
  'Kanıtlanmış açık staj programının KENDİ adresi. Yalnız program_durumu '
  '= acik iken doluyor. Genel kariyer sayfası buraya YAZILMIYOR: kartta '
  '"Programa başvur" etiketi yalnız bu kolon doluyken çıkıyor.';

/*
  YENİ KOLON OKUNABİLİR OLMALI

  `listings` tablosunda bir kez tam olarak bu unutuldu: `location_raw`,
  `insurance_provider` ve `department_tags` eklendi ama `grant select`
  verilmedi; o tablo kolon kolon yetki verdiği için TEK yetkisiz kolon
  bütün sorguyu `42501` ile düşürdü ve üretimde her ilan "yüklenemedi"
  oldu. `employer_career_checks` tablo düzeyinde politikayla okunuyor,
  yani yeni kolon kendiliğinden okunabilir; yine de burada anılıyor ki
  bir sonraki kolonda aynı soru sorulsun.
*/
