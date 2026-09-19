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
- **Şirket hesabı şirket hesabında kalır (kullanıcı kararı, 18 Eylül 2026):** panelde öğrenci görünümüne geçiş kapısı YOK. Eski "Öğrenci görünümü" düğmesi kaldırıldı.
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
- Panelde öğrenci tarafına geçiş kontrolü bulunmaz; ileride eklenmesi teklif edilmemeli.
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

## Yön: Tek Dünya (kullanıcı kararı, 18 Eylül 2026)

Ayrı "işveren paneli" kalkıyor. Şirket hesabı öğrenciyle AYNI kabuğu kullanır:
aynı Header, aynı alt menü (İlanlar · Fırsatlar · Ağım · Rehber · Profil),
aynı profil bileşeni. Yalnız İlanlar ve Fırsatlar sekmeleri role göre içerik
değiştirir. Kullanıcının sözü: "öğrenci tasarımını zemin yapıp şirkete
uyarlamalıyız; şirketlerin de paylaşım yaptığı bir profili olsun, ağları
olsun, rehberde şirketleri bilgilendiren konular olsun."

- **Profil (şirket):** öğrenci profiliyle aynı yapı — logo, tanıtım,
  paylaşımlar (fotoğraf akışı), takipçi sayısı. Şirket kimliği alanları
  (sektör, konum, çalışan sayısı, web, İK e-postası) profil düzenlemede.
- **İlanlar (şirket):** kendi ilanları, Yeni ilan, Başvuranlar — öğrenci
  tarafının kart diliyle. Eski panel işlevleri buraya taşınır.
- **Fırsatlar (şirket): İPTAL (kullanıcı kararı, 18 Eylül 2026).** Şirketler
  etkinlik düzenlemiyor; kariyer günü ve hackathon büyük kurumların işi ve
  onlar zaten kendi sayfalarında duyuruyor, otomasyon oradan topluyor.
  Elle ilan açan şirket tipik olarak küçük/orta işletme. Şirket hesabında
  o sekme **Başvuranlar** oldu. Şirkete etkinlik açtırma teklif edilmemeli.
- **Ağım (şirket):** TAKİP modeli, tek yönlü: öğrenci şirketi takip eder,
  şirket şirketi takip eder. Karşılıklı onay yok. Şirket Ağım'da
  takipçilerini ve başvuranlarını görür.
- **Rehber (şirket):** şirketlere yönelik konular; mevcut "Stajyer nasıl
  alınır" başlangıç.
- Şirket hesabı şirket hesabında kalır; öğrenci görünümüne geçiş yok.
- **Beş adımın hepsi 18-19 Eylül 2026'da tamamlandı ve yayına alındı:**
  (1) tek kabuk + İlanlar #172, (2) şirket profili + paylaşım #173,
  (3) takip: düğme, sayaçlar, Ağım listeleri #176, (4) Fırsatlar yerine
  Başvuranlar #177, (5) Şirketler için rehber #179.
