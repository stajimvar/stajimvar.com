-- BAŞVURU KOPYASINDA E-POSTA DURUYORDU
--
-- ÖLÇÜM (31 Ağustos 2026)
-- -----------------------
-- Ürün kuralı şu: iletişim bilgileri TEKLİF KABUL EDİLDİĞİNDE açılır ve
-- yalnızca `public.basvuru_iletisimi` üzerinden. `profiles` tablosunun
-- okuma kuralı da bunu destekliyor — şirket öğrencinin satırını hiç
-- okuyamıyor.
--
-- Ama başvuru anında yazılan profil kopyası (`applications.
-- profile_snapshot`) öğrencinin E-POSTASINI da taşıyordu
-- (lib/basvuru-kopyasi.mjs · `eposta`). Şirket paneli o kopyayı
-- olduğu gibi çekiyor (lib/sirket-veri.ts · sirketBasvurulari). Arayüz
-- e-postayı hiçbir yerde ÇİZMİYORDU, ama veri tarayıcıya gidiyordu:
-- ağ isteğine bakan bir şirket, teklif kabul edilmeden önce her
-- başvuranın e-posta adresini okuyabiliyordu.
--
-- Yani kural arayüzde tutuluyordu, veride değil. Bu bir sızıntı.
--
-- NE YAPILDI
-- ----------
--   1. Kopya üretimi artık e-posta YAZMIYOR (lib/basvuru-kopyasi.mjs).
--   2. Geçmiş kopyalarda yalnızca `eposta` anahtarı düşürülüyor.
--
-- İkincisi körlemesine bir yeniden yazma DEĞİL: tek bir anahtar
-- kaldırılıyor, kopyanın geri kalanı (ad, okul, bölüm, yetenekler,
-- projeler) olduğu gibi duruyor. Kaybolan bir bilgi de yok — şirket
-- teklif kabul edildiğinde e-postayı `basvuru_iletisimi` üzerinden ve
-- GÜNCEL hâliyle alıyor; kopyadaki adres zaten eskimiş olabilirdi.
--
-- Öğrencinin kendi başvurusunda ne paylaştığını görmesi etkilenmiyor:
-- e-posta öğrencinin kendi hesabında zaten duruyor.
update public.applications
   set profile_snapshot = profile_snapshot - 'eposta'
 where profile_snapshot is not null
   and profile_snapshot ? 'eposta';

-- Telefon zaten hiç yazılmıyordu (lib/basvuru-kopyasi.mjs · "NE
-- GİRMİYOR"). Yine de geçmişte bir yoldan girmiş olma ihtimaline karşı
-- aynı temizlik ona da uygulanıyor.
update public.applications
   set profile_snapshot = profile_snapshot - 'telefon'
 where profile_snapshot is not null
   and profile_snapshot ? 'telefon';
