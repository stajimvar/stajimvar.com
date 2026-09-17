# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Öğrenci** (birincil kitle): Türkiye'deki üniversite öğrencisi; zorunlu/gönüllü staj, burs, öğrenci programı ve yarışma arıyor. Mobil ağırlıklı.
- **İşveren** (`/sirket/*` paneli): İKİ profil EŞİT ağırlıkta —
  - Küçük/orta şirket sahibi ya da ofis müdürü: İK departmanı yok, az ilan, hızlı karar; ilanı kendisi açar, adaylara kendisi bakar.
  - Kurumsal İK uzmanı: aynı anda çok ilan ve çok başvuru, süreç takibi (kısa liste, mülakat, teklif).
  - Gün içinde birkaç kez kısa girişler; iş "ilan aç, başvuranları tara, karar ver".

## Product Purpose

Şirketlerin staj ilanlarını tek listede toplayan ve öğrencinin resmî kaynağa başvurmasını sağlayan platform. İşveren paneli, şirketin ilanını kendisinin açıp başvuruları platform içinde yönetmesini sağlıyor. Başarı: ilan açılır, doğru öğrenci başvurur, şirket adayı görüp karar verir.

## Positioning

İlanlar resmî kaynaktan doğrulanıyor ("Resmî kaynak" rozeti), uydurma ilan yok; öğrenci profili (bölüm, sınıf, şehir) ile eşleştirme var. İşveren tarafında doğrulanmış şirket ayrımı: yalnız doğrulanmış şirket aday kartlarını görebiliyor ve "StajımVar ile başvur" alabiliyor.

## Operating Context

- Panel `/sirket`, `/sirket/ilanlar`, `/sirket/basvuranlar`, `/sirket/profil`, `/sirket/ilan` adreslerinde; `noindex`.
- Şirket kullanıcısı aynı zamanda bir öğrenci hesabına sahip olabiliyor; panelden "Öğrenci görünümü" kapısıyla kendi öğrenci tarafına dönüyor (oturum kapatma değil).
- Kademeler (`src/lib/sirket-kademe.mjs`): ZİYARETÇİ → İLAN VEREN (ilan açabilir) → DOĞRULANMIŞ (aday kartlarını görür, platformdan başvuru alır) → YÖNETİCİ. Kademe numarası ekranda yazılmıyor; ne yapabildiği yazılıyor ("İlan açık · kartlar kapalı").
- Aday kartı görünürlüğünün asıl kapısı veritabanı RLS'i; arayüz kapatılsa da veri gelmiyor.
- Başvuru durumları `src/sirket/basvuru-durumu.ts`te; aday üzerinde mülakat tarihi, davet, teklif ve iletişim eylemleri var.
- Bildirim merkezi paylaşımlı (`BildirimMerkezi`).

## Capabilities and Constraints

- React 19 + TypeScript + Vite 6 + Tailwind v4; Supabase (RLS). Frontend kodunu yalnız `stajimvar-frontend-builder` ajanı yazıyor.
- Panel ağacı `src/sirket/` (~4.9k satır): `SirketKabugu` (kabuk), `SirketPaneli` (İlanlar + Başvuranlar sekmeleri), `GenelBakis`, `IlanFormu`, `AdayIzgarasi/AdayKarti/AdayCekmecesi`, `SirketProfilFormu`, `DunyaGecisi`, `renk.ts` (panele özel renk sabitleri).
- Görsel doğrulama için giriş gerektirmeyen fixture: `src/dev/SirketPanelDevFixture.tsx`.
- **Korunacak bilgi mimarisi (kullanıcı kararı):** dört sekme — Genel · İlanlar · Başvuranlar · Şirket.
- **Genel ekranının göstermesi gerekenler (kullanıcı kararı):** yeni başvurular ve hızlı aksiyon, ilanların durumu (açık / kapanmaya yakın / görüntülenme-başvuru sayısı), şirket profilinin görünürlüğü (tamamlanma, eksikler), tek düğmeyle yeni ilan.
- Öğrenci görünümü kapısı korunması zorunlu tutulmadı; yeniden konumlandırılabilir ama işlevi kaldırılmamalı (oturumu kapatma ile karıştırılmasın).
- Ekranda sahte sayı, sahte eşleşme oranı, boş bağlantı, yatay taşma olmamalı.

## Brand Commitments

- Ad: **StajımVar**; işveren panelinde "İŞVEREN" rozeti.
- **Bağlayıcı görsel kısıt (kullanıcı, 17 Eylül 2026): panel MAVİ olacak.** Öğrenci tarafı mavi-beyaz; işveren paneli bugün yeşil-nane (`renk.ts`: #25D366 / #F5FBF7) ve bu ayrım kullanıcı tarafından kaldırıldı. Öğrenci dünyasıyla aynı mavi aile.
- Dil Türkçe; arayüz metinleri kısa, gerçek veriye bağlı.

## Evidence on Hand

- Gerçek şirket ve ilan verisi canlıda (197 şirket, 192 ilan; logolar `logos` kovasında).
- Panelin bugünkü hâlinin ekran görüntüsü: boş durum ("Henüz ilan yok"), üst çubuk Genel · İlanlar · Başvuranlar · Şirket, sağda "Öğrenci görünümü", kademe rozeti ve yeşil "Yeni ilan".
- Sahte müşteri yorumu, referans, ölçüm iddiası YOK; üretilmemeli.

## Product Principles

1. İşverenin girişi kısa: en sık iş (yeni başvuruya bakmak, ilan açmak) ilk ekranda bir dokunuş uzakta.
2. Gerçek sayı ya da hiç: sayaç, oran, rozet yalnız gerçek veriden; boş durum dürüst.
3. Kademe görünür ama utandırmaz: ne yapabildiği yazılır, sayı ya da "yükselt" baskısı değil.
4. İki kitle tek ekranda: 1 ilanlı şirket sahibine de 30 ilanlı İK'ya da aynı düzen ölçeklenir.
5. Öğrenci dünyasıyla aynı aileden: aynı mavi, aynı köşe, aynı yazı; işveren tarafı "başka bir ürün" gibi durmaz.
