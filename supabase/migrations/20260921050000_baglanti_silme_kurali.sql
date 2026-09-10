-- SOSYAL PORTFOLYO — BAĞLANTI SİLME KURALI (A aşaması, 5/5)
--
-- 30 GÜNLÜK BEKLEME SÜRESİNDEKİ AÇIK
--
-- Önceki DELETE politikası "bağlantının tarafı olmak yeterli" diyordu:
--
--     using (requester_id = auth.uid() or addressee_id = auth.uid())
--
-- Bu, red kaydının da silinebilmesi demekti. Reddedilen kullanıcı kendi
-- `red` satırını silip hemen yeni bir istek açabiliyor ve 30 günlük
-- süreyi sıfırlayabiliyordu — yani bekleme süresi gerçekte bir sınır
-- değildi. Süre ancak red kaydı YERİNDE kaldığı sürece anlam taşıyor.
--
-- Silme yetkisi artık duruma bağlı:
--
--     bekliyor  → yalnız isteği GÖNDEREN (geri çekme)
--     kabul     → iki taraftan herhangi biri (bağlantıyı kaldırma)
--     red       → normal kullanıcı SİLEMEZ
--
-- Reddedilmiş satır yalnız iki kontrollü yoldan yeniden kullanılabiliyor:
--   1. İlk gönderen, 30 gün dolunca red → bekliyor geçişini yapıyor
--      (tetikleyici `responded_at` üzerinden veritabanı saatiyle ölçüyor)
--   2. Reddeden taraf fikrini değiştirirse `baglanti_yeniden_baslat()`
--      RPC'si eski satırı silip ters yönde yeni istek açıyor — tek
--      atomik işlemde ve `security definer` olduğu için bu politikadan
--      bağımsız çalışıyor.
--
-- BEKLEYEN İSTEĞİ ALAN NEDEN SİLEMİYOR
-- Alan tarafın yanıtı `red` (ya da `kabul`); silme değil. Silebilseydi
-- red kaydı hiç oluşmaz ve bekleme süresi yine boşa çıkardı. Reddetmek
-- kaydı bırakır, bu kasıtlı.
--
-- Durum değerleri şemadaki gerçek değerler: 'bekliyor' | 'kabul' | 'red'
-- (bkz. 20260921010000, connections.durum CHECK kısıtı).

drop policy if exists "baglantiyi taraflar siler" on public.connections;

create policy "baglanti silme durumu sinirli" on public.connections
  for delete to authenticated
  using (
    (durum = 'bekliyor' and requester_id = auth.uid())
    or (durum = 'kabul' and auth.uid() in (requester_id, addressee_id))
  );

/*
  DEĞİŞMEYENLER — bilerek dokunulmadı

  · Yönetici: `is_admin()` için ayrı bir DELETE politikası AÇILMADI.
    Bugün bağlantı silen bir yönetim akışı yok; olmayan bir ihtiyaç için
    yetki açmak gereksiz yüzey olurdu. Gerekirse kendi göçüyle gelir.

  · Sistem temizliği: `baglanti_yeniden_baslat()` ve
    `engel_baglantiyi_kaldir()` `security definer` çalışıyor, yani bu
    politikadan etkilenmiyorlar. Engel konduğunda bekleyen VE kabul
    edilmiş bağlantının silinmesi aynen sürüyor.

  · Hesap silme: `connections.requester_id` ve `addressee_id`
    `references public.profiles(id) on delete cascade` taşıyor. Cascade
    silme sistem tarafından yapılıyor ve RLS'e tabi değil; bu politika
    gerçek hesap temizliğini engellemiyor (testte kanıtlanıyor).

  · anon: connections üzerindeki bütün yetkileri zaten revoke edilmiş
    durumda (20260921020000). Burada da hiçbir şey verilmiyor.
*/
