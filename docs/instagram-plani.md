# Instagram — 4 haftalık yayın planı

Hedef: profili dolu hale getirmek ve takipçiyi 20 binin üstüne taşımak.
Bu dosya niyet listesi değil; her satırın karşılığında çalıştırılacak bir
komut ya da yazılacak bir metin var.

## Neyi kontrol ediyoruz, neyi etmiyoruz

Takipçi sayısı doğrudan kontrol edilebilen bir şey değil — yayın sıklığı,
içeriğin kaydedilebilir olması ve profilin ilk bakışta anlaşılması
kontrol edilebilir. Plan bunların üzerine kurulu. Sahte büyüme yöntemleri
(takipçi satın alma, takip-bırak) hesabın erişimini kalıcı olarak
düşürdüğü için listede yok.

## Elimizdeki üretim araçları

| Komut | Ne üretir | Sıklık |
| --- | --- | --- |
| `npm run instagram-kartlari` | "Nasıl çalışır" — hesabın sabit tanıtım seti (4 kart) | Bir kez, değişince |
| `npm run paylasim-burs-takvimi` | Son başvurusu yaklaşan burslar; kartlar ve gönderi metni veritabanından | Haftada bir |

Her iki betik de `public/paylasim/setler.json` dosyasına yazıyor; yönetim
ekranındaki **Gönderi yayınla** bölümü setleri oradan okuyor. Yayın akışı:

1. Betiği çalıştır.
2. `npm run build` + dağıtım (kartların adresi stajimvar.com üzerinden
   herkese açık olmak zorunda; Instagram görseli kendi indiriyor).
3. Yönetim → Instagram → seti seç → metni gözden geçir → yayınla.

## Haftalık ritim

Haftada 4 gönderi, sabit günlerde. Sabit gün, hem takipçinin beklemesini
hem de bizim üretimi planlamamızı kolaylaştırıyor.

| Gün | Tür | Kaynak |
| --- | --- | --- |
| Pazartesi | **Son başvurular** (karusel) | `npm run paylasim-burs-takvimi` |
| Çarşamba | **Rehber özeti** (karusel) | Sitedeki rehber yazısı, elle metin |
| Cuma | **Yeni eklenen ilanlar/burslar** (karusel) | Veritabanı, elle seçim |
| Pazar | **Tek kartlık kural/uyarı** | Şablondan, elle metin |

## Dört haftanın içeriği

### 1. hafta — hesap ne işe yarıyor
- Sabit tanıtım seti (`instagram-kartlari`) — profilin ilk gönderisi.
- Son başvurular karuseli.
- "Burs başvurusunda en sık yapılan hata: son tarihi kurumun kendi
  sayfasından doğrulamamak" — tek kart.
- Yeni eklenen burslar.

### 2. hafta — takvim
- Eylül'de son başvurusu dolan burslar (`paylasim-burs-takvimi 30`).
- KYK / öğrenim kredisi takvimi — yalnız resmî duyuru varsa.
- Erasmus başvuru dönemi olan üniversiteler.
- "Takvim bekleniyor ne demek?" — tek kart, sitedeki kuralı anlatır.

### 3. hafta — staj tarafı
- Staj başvurusunda CV'de en sık görülen üç eksik — rehberden.
- Zorunlu staj evrakları sırası — rehberden.
- Yeni eklenen staj ilanları.
- Son başvurular karuseli.

### 4. hafta — güven ve tekrar
- "İlanı nereden alıyoruz" seti tekrar (yeni takipçiler için).
- Ay boyunca eklenen kurumlar — logolarla.
- Son başvurular karuseli.
- Ekim'de açılacak burslar.

## Profil düzeni

Gönderi kadar önemli, çünkü gelen kişi önce burayı görüyor:

- **Biyografi** şu an "Zorunlu Staj Platformu" diyor; site artık staj +
  burs + yurt dışı programı listeliyor. Biyografi de bunu söylemeli,
  yoksa burs gönderisiyle gelen kişi yanlış yere geldiğini sanıyor.
- **Öne çıkanlar**: "Burslar", "Staj", "Nasıl çalışır", "Sık sorulanlar".
  Şu an başlıklar var ama içleri boş.
- **Bağlantı**: profildeki adres doğrudan `stajimvar.com/firsatlar`a
  gidebilir — gönderilerin çoğu burs olduğu için iniş sayfası orası.

## Ölçüm

Haftada bir bakılacak tek şey: hangi gönderi **kaydedildi** ve
**paylaşıldı**. Beğeni değil kaydetme sayısı önemli, çünkü burs takvimi
kaydedilen içeriktir ve Instagram kaydedilen gönderiyi daha çok kişiye
gösteriyor. Kaydetme oranı yüksek olan tür artırılır, düşük olan bırakılır.
