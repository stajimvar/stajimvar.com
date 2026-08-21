# Öğrenci Fırsatları Tasarımı

## Amaç

Staj ilanlarından bağımsız, resmî kaynağı zorunlu öğrenci fırsatları modülü eklenir. Kayıt yoksa arayüz yalnızca gerçek boş durum gösterir.

## Mimari

`opportunities` yayımlama yaşam döngüsü olan bağımsız bir tablo, `saved_opportunities` ise kullanıcıya ait kaydetme ilişkisidir. Herkese açık istemci yalnızca yayımlanmış ve son tarihi geçmemiş fırsatları okur; yönetim/service-role dışındaki roller fırsat içeriği değiştiremez. İstemci ortak sorgu ve filtreleme katmanını kullanır; kategori adresleri aynı ekranın sabit kategori filtresidir.

## Veri ve güvenlik

Fırsat türleri ve durumlar PostgreSQL enum'larıyla kontrol edilir. HTTPS kaynak/başvuru adresi, benzersiz slug, yayımlanmış içerikte kaynak zorunluluğu, tarih geçişi ve `updated_at` tetikleyiciyle korunur. Kaydedilen ilişki benzersiz `(user_id, opportunity_id)` anahtarına ve sahiplik RLS'ine sahiptir. `deactivate_expired_opportunities()` yalnızca service-role/yönetim bakım işi için tanımlanır.

## Arayüz

Tek `OpportunitiesPage` bileşeni liste, kategori, takvim, kaydedilenler ve uygunluk görünümlerini üretir; `OpportunityDetailPage` resmi dış bağlantıya yönlendirir. URL sorguları arama ve filtre durumunu taşır. Uygunluk yalnızca mevcut profil alanları fırsat koşuluyla gerçekten karşılaştırılabildiğinde skor üretir; gereksiz profil alanlarında hangi alanların gerektiği gösterilir.

## SEO ve erişilebilirlik

SPA ekranları çalışırken title/description/canonical günceller. Ön-render betiği, veri varsa fırsat listeleri ve ayrıntılarını gerçek Supabase verisinden üretir; veri yoksa yalnız sabit sayfa metni üretir. Ayrıntıda yanlış bir schema türü kullanılmaz; resmî dış bağlantılar HTTPS doğrulaması ile `noopener noreferrer` taşır.

## Kapsam dışı

Bu sürüm içeride burs/kredi başvurusu, hassas belge toplama, veri seed'i veya üçüncü taraf scrape işlemi yapmaz.
