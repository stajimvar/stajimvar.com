# Keşfet Öğrenci Seçim Motoru Tasarımı

## Amaç

Keşfet, internetteki bütün etkinlikleri göstermeyecek; öğrencinin gerçekten değerlendirebileceği, güncel ve güvenilir etkinlikleri öne çıkaracak. İlk sürümde çalışan liste, detay ve yönetim CRUD'u korunacak.

## Kapsam

Bu teslimatta:

- Etkinliklere doğrulama, hedef kitle, yaş sınırı, kayıt şartı, başvuru tarihi, kaynak güveni ve öğrenci uygunluk alanları eklenecek.
- Öğrenci uygunluk puanı fiyat avantajı, ilgi uygunluğu, kaynak/güncellik, yakınlık, popülerlik ve çeşitlilik bileşenlerinden hesaplanacak.
- Liste varsayılan olarak bu puana göre sıralanacak.
- Yalnızca içeriği bulunan dinamik koleksiyonlar gösterilecek.
- Başlık + mekân + başlangıç tarihi birleşimi mükerrer kayıtları engelleyecek.
- Yönetici formu yeni alanları düzenleyebilecek ve puan bileşenlerini görebilecek.
- Kaynaklardan gelen adaylar doğrudan yayınlanmayacak; güvenilir resmî kaynaklar taslak, diğerleri inceleme bekleyen kayıt oluşturabilecek.

Bu teslimatta gerçek etkinlik verisi toplanmayacak veya uydurulmayacak. Harita, GPS, sosyal özellikler ve veri ortaklığı/API anlaşmaları kapsam dışıdır.

## Veri modeli

`discover_events` tablosuna şu alanlar eklenir:

- `application_deadline`, `discount_terms`, `age_limit`, `registration_required`
- `target_audiences[]`, `interest_tags[]`
- `source_kind`, `source_trust_score`, `last_verified_at`, `verification_status`
- `latitude`, `longitude` (gelecekteki yakınlık hesabı için isteğe bağlı)
- `save_count`, `popularity_score`, `diversity_score`
- alt puanlar ve `student_fit_score`
- `review_reason`, `source_fingerprint`

Mükerrerlik için normalize edilmiş başlık, mekân ve başlangıç zamanından üretilen `source_fingerprint` benzersiz olur.

## Puanlama

Toplam puan 0–100 aralığındadır:

- %25 fiyat avantajı
- %25 ilgi/hedef kitle uygunluğu
- %20 kaynak güveni ve güncellik
- %15 şehir/kampüs yakınlığı
- %10 popülerlik
- %5 çeşitlilik

Eksik sinyaller sıfır kabul edilmez; yalnızca mevcut bileşenlerin ağırlıkları kendi aralarında normalize edilir. Böylece koordinatı olmayan güvenilir ücretsiz etkinlik haksız yere aşağı düşmez. Puan sunucu fonksiyonunda hesaplanır; istemci yalnızca sonucu okur.

## Koleksiyonlar

Koleksiyonlar ayrı kayıtlar değildir; yayındaki ve süresi geçmemiş etkinliklerden türetilir. İlk teslimatta uygulanacaklar:

- Bu akşam ne yapsam?
- Hafta sonu 0 TL planları
- Öğrenci indirimli
- 100 TL'nin altında
- Kayıtları kapanıyor
- Kariyerine katkı sağlayacaklar
- Yeni bir şey dene
- StajımVar'ın seçtikleri

Bir koleksiyonda kayıt yoksa başlığı ve alanı hiç çizilmez. Ana filtreli liste koleksiyonların altında kalır.

## Kaynak ve yayın güvenliği

- `official` kaynaklar otomatik olarak yalnızca taslak oluşturabilir.
- `institution` ve `ticketing` kaynakları `pending_review` durumunda kalır.
- `unknown` kaynaklar otomatik içe alınmaz.
- Tarih veya fiyat değişikliği kaydı yeniden incelemeye gönderir.
- Ziyaretçi yalnızca `published` ve süresi geçmemiş kayıtları listede görür.
- Yazma işlemleri mevcut `is_admin()` kontrollü security-definer RPC sınırında kalır.

## Arayüz

Mevcut StajımVar kartları ve filtreleri korunur. Kartlara “Resmî kaynaktan doğrulandı” veya son kontrol zamanı eklenir. Koleksiyonlar yatay kaydırmalı küçük kart sıralarıdır; mobilde dokunma, masaüstünde klavye ve yatay kaydırma desteklenir. Boş koleksiyon gösterilmez.

## Test ve yayın

- Puanlama ve koleksiyon seçimi saf fonksiyon testleriyle doğrulanır.
- Migration testleri RLS, RPC, mükerrer indeks ve yeni alanları doğrular.
- TypeScript kontrolü ve production build çalıştırılır.
- Migration SQL Editor üzerinden uygulanır; GitHub Actions gizli değişkenli build ile yayınlanır.
- Canlı `/kesfet` sayfası ve anonim veri erişimi kontrol edilir.
