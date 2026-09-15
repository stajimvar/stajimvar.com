-- ŞİRKET KAPAK GÖRSELİ
--
-- İlan kartı onaylanan tasarımda iki görsel taşıyor: solda şirketin
-- LOGOSU, sağda şirketin kapak görseli. Logo `companies.logo_url`
-- alanında zaten var (108 şirkette gerçek dosya); kapak görselinin
-- karşılığı ise veride yoktu, bu yüzden kartın sağ yarısı çizilemiyordu.
--
-- ALAN NEYİ İDDİA EDİYOR: "bu şirketin kartında gösterilecek kapak
-- görseli". Belge değil, kanıt değil. İlanın doğrulanması, kaynağı ve
-- son kontrol bilgisi ayrı alanlarda duruyor ve bu görselden etkilenmiyor.
-- Boş bırakılabilir: görseli olmayan şirkette kart tek sütuna düşüyor
-- (arayüz tarafı), uydurma bir görsel konmuyor.
alter table public.companies
  add column if not exists cover_url text;

comment on column public.companies.cover_url is
  'İlan kartında şirketin yanında gösterilen kapak görselinin adresi. Dekoratif; ilanın kaynağı ya da doğrulaması hakkında bir iddia taşımaz. NULL = görsel yok, kart tek sütun çizilir.';

-- OKUMA HERKESE, YAZMA MEVCUT KURALLARA BAĞLI
--
-- `logo_url` ile aynı davranış: kart herkese açık olduğu için görselin
-- adresi de anon tarafından okunabiliyor. Sütun düzeyinde INSERT/UPDATE
-- VERİLMİYOR — şirket kaydını değiştirme yetkisi tablo politikalarında
-- (yönetici / şirket üyesi) tanımlı ve bu sütun da oradan yönetiliyor.
-- Sütun listesi HER ayrıcalığa ayrı bağlanır; tek satırda `select, insert`
-- yazmak SELECT'i tüm tabloya verirdi.
grant select (cover_url) on public.companies to anon, authenticated;
