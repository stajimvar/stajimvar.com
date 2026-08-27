# Keşfet Gerçek Etkinlik İçe Aktarma Tasarımı

## Amaç

Mevcut Keşfet deneyimini kaldırmadan, Türkiye genelindeki doğrulanabilir resmî kaynaklardan aktif öğrenci etkinliklerini zamanlanabilir biçimde toplamak; uygun gerçek görselleri Supabase Storage'a aktarmak; eksik veya şüpheli kayıtları yönetici incelemesine yönlendirmek ve ziyaretçiye yalnızca güncel, yayındaki kayıtları göstermek.

## Mevcut yapı

Uygulama Vite, React ve TypeScript ile çalışır; veri Supabase Postgres/RLS üzerinden okunur ve Cloudflare Pages'e GitHub Actions ile dağıtılır. `discover_events` tablosu, yönetici RPC'leri, `/kesfet`, `/kesfet/:slug` ve `/yonetim/kesfet` yüzeyleri vardır. Mevcut Python otomasyonu kaynak, import çalışması ve olay günlüğü desenlerini kullanır. Yeni sistem bu sınırları genişletir; staj, burs, profil ve başvuru akışlarına bağlanmaz.

## Mimari

### Kaynak kataloğu ve adaptörler

Etkinlik kaynakları sürümlenen bir katalogda tutulur. Her kaynak; benzersiz kimlik, resmî alan adı, şehir kapsamı, adaptör türü, güven seviyesi ve etkin/pasif durum taşır. İlk sürüm yalnızca robots ve kullanım koşulları açısından okunabilir, doğrudan resmî sayfalara dayanır. Öncelik İstanbul, Ankara, İzmir, Bursa, Eskişehir, Antalya, Kocaeli ve Konya'dır; veri modeli tüm Türkiye'yi destekler.

Adaptörler ortak bir aday sözleşmesi üretir. Kaynakta bulunmayan değerler `null` kalır; fiyat, bitiş saati, indirim veya konum tahmin edilmez. Resmî sayfa ve kayıt/bilet bağlantısı ayrı tutulur.

### İçe aktarma akışı

Akış `fetch -> parse -> normalize -> validate -> image -> upsert -> archive` sırasını izler. Kaynak ve çalıştırma başına bulunan, eklenen, güncellenen, değişmeyen, incelemeye gönderilen ve hatalı kayıt sayıları saklanır. Kaynak hatası diğer kaynakların çalışmasını durdurmaz.

Kimlik eşleştirmesi önce resmî kaynak kimliği veya kanonik URL, sonra normalize başlık + mekân + başlangıç zamanı parmak iziyle yapılır. Aynı çalışma yeniden yürütüldüğünde kayıt çoğalmaz. Tarih, iptal veya erteleme değişiklikleri var olan kaydı günceller ve değişiklik notu bırakır.

Bir çalışmada artık bulunmayan etkinlik hemen silinmez. Resmî sayfada iptal/erteleme açıkça belirtilirse ilgili duruma alınır. Bitiş tarihi geçen kayıtlar `archived` olur ve genel listede görünmez. Kaynak erişilemediğinde kayıt topluca arşivlenmez.

### Veri modeli ve güvenlik

`discover_events` aşağıdaki alanlarla genişler:

- yaşam döngüsü: `published`, `draft`, `cancelled`, `postponed`, `archived`
- kaynak kimliği ve kanonik URL
- orijinal görsel URL'si, depolanmış kart ve detay kapağı URL'leri, kapak türü
- çevrimiçi/fiziksel biçim ve çevrimiçi bağlantı
- import kaynağı, son görülme ve son kontrol zamanları
- inceleme nedeni ve temel alan tamlık durumu

Etkinlik import kaynakları ve çalıştırma metrikleri ayrı tablolarda tutulur. Yazma işlemleri yalnızca service-role otomasyonu ve mevcut admin güvenlik sınırından yapılır. Anonim kullanıcı yalnızca `published`, bitmemiş ve iptal edilmemiş kayıtları okur. Storage bucket genel okumaya açık kapaklar sunar; istemci yazamaz. Yönetici kapak değiştirme işlemi sunucu kontrollü RPC veya Storage politikasıyla sınırlandırılır.

### Görsel hattı

Adaptör önce yapılandırılmış veri görselini, sonra `og:image`, `twitter:image` ve içerik ana görselini değerlendirir. HTTP durum kodu, MIME türü, piksel boyutu, dosya boyutu ve en-boy oranı doğrulanır. İzleme pikselleri, favicon/site logoları, aşırı küçük veya bozuk dosyalar reddedilir.

Uygun görsel Sharp ile WebP olarak kart ve detay boyutlarına dönüştürülür; oran korunarak güvenli kırpma uygulanır ve `event-covers` bucket'ına içerik karmasıyla idempotent yüklenir. Veritabanı hem orijinal URL'yi hem depolanan dosyaları ve resmî kaynak sayfasını saklar. Gerçek görsel yoksa projede açıkça genel kapak olarak işaretlenen yedi kategori görselinden uygun olanı kullanılır. Genel kapaklar gerçek etkinlik görseli gibi etiketlenmez.

### Arayüz

Tek bir `EventCover` bileşeni yükleme skeleton'ı, sabit en-boy oranı, hata halinde kategori kapağı ve erişilebilir alternatif metin sağlar. Kartta başlık, tarih, şehir, kategori ve fiyat durumu ilk bakışta görünür. Mobilde görsel `object-fit` ve odak konumu ile dengeli gösterilir.

Koleksiyon motoru aktif filtre sonucunu şu sırada tekilleştirerek böler: `Bu Hafta`, `Şehrindekiler`, `Ücretsiz`, `Kariyer`, `Kültür-Sanat`. Bir etkinlik yalnızca ilk uygun koleksiyonda yer alır; tüm sonuçlar ızgarasında ayrıca gösterilmesi ürünün mevcut liste davranışını korur. Kullanıcının şehri bilinmiyorsa `Şehrindekiler` gösterilmez ve şehir filtresi kullanılabilir.

### Yönetim paneli

Mevcut CRUD korunur. Listeye yaşam döngüsü, kapak türü, kaynak, son kontrol ve inceleme nedeni eklenir. Yönetici depolanmış kapak URL'sini değiştirebilir, kategori kapağı seçebilir, taslak kaydı yayınlayabilir ve iptal/erteleme/arşiv durumlarını yönetebilir. Ayrı özet alanı son import çalışmalarını ve kaynak bazlı sayaçları gösterir.

## Hata yönetimi

Kaynak istekleri sınırlı zaman aşımı ve kontrollü tekrar denemeyle çalışır. Tek kayıt parse veya görsel hatası çalışmayı durdurmaz; hata türü ve kaynak URL'si günlüğe yazılır. Temel alanları eksik kayıt yayınlanmaz. Görsel sorunu kayıt için kategori kapağına düşebilir; başlık, kaynak veya tarih sorunu inceleme kuyruğuna gider.

## Gerçek veri başlangıcı

İlk canlı import yalnızca çalışma gününde bitmemiş ve resmî sayfadan doğrulanan etkinlikleri kapsar. Kaynak sayısı, bulunan ve yayımlanan kayıt sayısı doğrulama raporunda açıkça ayrılır. Uydurma etkinlik, tahmini fiyat veya tahmini tarih kullanılmaz.

## Test ve doğrulama

- Normalize, parmak izi, idempotent upsert, tarih değişikliği ve arşivleme birim testleri
- Görsel seçimi, küçük/logo/piksel reddi, bozuk dosya ve kategori kapağı testleri
- Migration/RLS ve yetkisiz yazma testleri
- Koleksiyon tekilleştirme ve filtre testleri
- Import dry-run ve gerçek canlı import metrikleri
- TypeScript typecheck, ilgili Python/Node testleri ve production build
- 375px, 768px ve 1440px tarayıcı kontrolleri
- Canlı `/kesfet` ve en az bir detay sayfası doğrulaması

## Dağıtım

Migration önce mevcut Supabase production akışıyla uygulanır. Import, migration doğrulandıktan sonra GitHub Actions içindeki gizli değişkenlerle çalışır. Site yalnızca typecheck ve build geçtikten sonra mevcut Cloudflare Pages akışıyla dağıtılır. Push veya build tek başına canlı yayın kanıtı sayılmaz; canlı sayfa ayrıca kontrol edilir.

## Kapsam dışı

Next.js'e geçiş, harita/GPS, katılımcı listesi, mesajlaşma, sosyal özellikler, otomatik bilet satın alma ve resmî olmayan kitlesel web kazıma bu sürümde yoktur.
