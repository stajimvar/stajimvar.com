# Teknik ve İdari Tedbirler

> **Durum:** 26 Kasım 2026 itibarıyla ölçülmüş hâl. Her madde koddaki ya
> da veritabanındaki karşılığıyla yazıldı. KVKK m.12 ve Kurul'un "Kişisel
> Veri Güvenliği Rehberi" başlıklarına göre düzenlendi.

## Teknik tedbirler

| Tedbir | Durum | Karşılığı |
|---|---|---|
| Satır düzeyinde erişim denetimi (RLS) | Var — kişisel veri tutan her tabloda açık | `supabase/migrations`; politikasız tablolar istemciye tamamen kapalı |
| Şirketin aday verisi | Yalnız kendi ilanı + doğrulanmış şirket | `is_company_member`, `sirket_dogrulandi` |
| İletişim ve CV'ye erişim | Başvuru başına açık rıza; geri alınabilir | `basvuru_iletisimi_acik`; CV depo politikası (20270124010000) |
| Şirket içi rol ayrımı | Görüntüleyici telefon/e-posta göremez | `sirket_basvuru_yazabilir` |
| Özgeçmiş deposu | Kapalı; 10 dakikalık imzalı bağlantı | `cvs` kovası, `CV_IMZA_OMRU = 600` |
| Başvuru anı kopyası | Değiştirilemez (depoda UPDATE yetkisi yok) | 20260909010000 |
| Profil fotoğrafı | Kapalı depo | `sosyal-avatar`; eski `avatars` kapatıldı (20270125020000) |
| Giriş gerektiren işlevler | Anonim rol çalıştıramıyor | 20270125010000 |
| Gizli anahtarlar | Yalnız sunucuda; her yayında paket taranıyor | CI denetimi |
| Şifreler | Geri döndürülemez özet (Supabase Auth) | — |
| Aktarım şifrelemesi | HTTPS zorunlu, HSTS 1 yıl | `public/_headers` |
| Saklama şifrelemesi | Supabase disk şifrelemesi (AES-256) | Sağlayıcı |
| Tıklama tuzağı koruması | `X-Frame-Options: SAMEORIGIN` | `public/_headers` |
| İçerik güvenlik politikası (CSP) | Çekirdeği **zorlanıyor** (object-src, base-uri, form-action, frame-ancestors, https yükseltme); betik/kaynak listesi AdSense onayına kadar rapor kipinde | `public/_headers` (27 Kasım 2026) |
| Otomatik güvenlik testleri | Her değişiklikte, temiz veritabanında; geçmezse yayın yok | `guvenlik_regresyonu` (zorunlu denetim) |
| Değişiklik denetimi | `main` dalına doğrudan yazma kapalı; her değişiklik PR + zorunlu testler | GitHub ruleset |
| IP adresi | Ölçümde yazılmıyor; ilan bildiriminde tuzlanmış özet | `site_olayi_yaz`, `functions/api/ilan-bildir.ts` |
| Ziyaret ölçümü saklama | 90 gün otomatik silme | `site_olayi_yaz` |
| Yedekleme | **Yok** — panel: "Free Plan does not include project backups" (27 Kasım 2026) | Karar bekliyor — bkz. README |
| Sızdırılmış şifre kontrolü | **Kapalı** (Supabase Pro özelliği) | Yapılacak |
| E-posta doğrulama kodu/bağlantı süresi | 1 saat (24 saatten indirildi, 27 Kasım 2026) | Supabase Auth ayarı |
| Bağımsız sızma testi | Yok | İleride |

## İdari tedbirler

| Tedbir | Durum |
|---|---|
| Aydınlatma metni, gizlilik ve çerez politikası | Var, sitede (24 Kasım 2026 güncel) |
| Güven Merkezi (kamuya açık özet) | Var — stajimvar.com/guvenlik |
| Kişisel veri envanteri | Var — `01-kisisel-veri-envanteri.md` |
| Saklama ve imha politikası | Var — `02-saklama-ve-imha-politikasi.md` |
| Veri ihlali müdahale planı | Var — `03-veri-ihlali-mudahale-plani.md` |
| Veri işleyenlerle sözleşme (DPA) | **Alınacak** — bkz. 05 |
| Yurt dışı aktarım standart sözleşmesi ve Kurul bildirimi | **Hukuki görüş alınacak** — bkz. 05 |
| VERBİS kaydı | **Muafiyet şirket kurulurken kontrol edilecek** |
| Erişim yetkisi olan kişiler | Yalnız veri sorumlusu (tek kişi). Çalışan/stajyer eklenirse gizlilik taahhütnamesi imzalatılacak ve yetkiler en aza indirilecek |
| Yönetici hesaplarında iki adımlı doğrulama | Supabase: **kapalı** (27 Kasım 2026; giriş GitHub ile). GitHub, Cloudflare, Google: kontrol edilecek |
| Düzenli gözden geçirme | 6 ayda bir (Ocak, Temmuz): envanter, saklama, erişim, sağlayıcılar |
