# Herkese açık Supabase anahtarı ve satır güvenliği (12 Ekim 2026)

Bütün okumalar üretim veritabanında **salt okuma** sorgularıyla ve anonim
anahtarla yapıldı; hiçbir veri değiştirilmedi. Anahtar değerleri yazdırılmadı.

## 1. Yayınlanan anahtar ne?

- `dist/_onrender/supabase-genel.json` ve JavaScript paketi aynı değeri taşıyor:
  önek `sb_publishable_` (Supabase'in tarayıcıda yayınlanmak üzere tasarladığı
  anahtar). Paket zaten bu değeri her ziyaretçiye gönderiyordu; ayar dosyası
  yeni bir sır açmıyor.
- Taranan: `dist/` altındaki bütün dosyalar ve depoda izlenen bütün dosyalar.
  Sonuç: rolü `anon` olmayan JWT **yok**, `sb_secret_…` biçiminde anahtar
  **yok**, `.env` izlenmiyor (yalnız `automation/.env.example`).
- Kalıcı kontrol: `scripts/seo-kapisi.mjs` her derlemede yayınlanacak dosyaları
  tarıyor; `sb_secret_` ya da `anon` dışı rol taşıyan JWT bulursa derleme düşüyor
  (değer yazdırılmadan). Testi: `tests/seo-veri-kaynagi.test.mjs`.
- Kenar ilan çizimi ve ön render **yalnız anonim anahtar** kullanıyor; üretim
  yayın işinde ve PR doğrulamasında servis anahtarı yok (testle sabit).

**Sonuç:** anonim anahtarın açık olması tasarım gereği; risk anahtarda değil,
o anahtarla erişilebilen satırlarda — yani RLS ve SECURITY DEFINER işlevlerinde.

## 2. RLS bulguları

| Bulgu | Seviye | Durum |
|---|---|---|
| `discover_event_occurrence_rows` görünümü RLS'i atlıyor (SECURITY DEFINER görünüm). Anonim anahtarla **226 arşiv kaydı** okunuyor; alttaki tablo RLS ile 0 dönüyor. Kişisel veri yok; yayımlanmamış kayıt ve iç alanlar (review_reason, source_fingerprint, puanlar) açık. | Supabase danışmanı: **ERROR** | Düzeltme göçü bu PR'da: `20261212010000_gorunumler_security_invoker.sql`. Merge sonrası üretim akışında uygulanır. |
| `firsat_tutar_kuyrugu` aynı kalıp; bugün yalnız `published` fırsatları gösteriyor (fazla satır sızdırmıyor). | **ERROR** (aynı lint) | Aynı göçte düzeltildi. |
| Okunabilir her public görünümün `security_invoker` taşıdığı | — | `scripts/sql/rls-regresyon-testleri.sql`e katalog kontrolü eklendi (CI'da tek kullanımlık veritabanında koşar). |
| Diğer tablolar: anonim SELECT politikaları yalnız `published`/`true` (herkese açık veri) ya da `auth.uid()`/`is_admin()` koşulu taşıyor | — | Uygun. |
| 9 tabloda RLS açık, politika yok (anonim hiçbir satır görmez) | INFO | Uygun. |

## 3. Takip gerektiren (bu PR'ın kapsamı dışında)

- **43 SECURITY DEFINER işlevi anonim rolle çağrılabiliyor** (danışman WARN).
  Örnekleyerek bakıldı: `staj_arayan_ogrenci_ozeti` yalnız toplam/en çok bölüm/
  en çok şehir döndürüyor (kişisel veri yok); `sosyal_kullanici_adi_coz` ve
  `sosyal_sayaclar` görünürlük kapısından (`sosyal_gorunur`) geçiyor. Kalanların
  her biri ayrı ayrı denetlenmeli; gerekmeyenlerden `anon` EXECUTE yetkisi
  kaldırılmalı.
- **24 işlevde `search_path` sabit değil** (WARN).
- **Sızmış parola koruması kapalı** (Auth ayarı, panelden açılır).

Danışman bağlantıları:
- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
