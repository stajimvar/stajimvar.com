# KVKK ve Veri Güvenliği Dosyası

StajımVar'ın kişisel verileri nasıl işlediğine dair iç belgeler. Kamuya
açık özet: https://stajimvar.com/guvenlik. Hukuki metinler: /gizlilik,
/kvkk-aydinlatma-metni, /cerez-politikasi.

> Bu belgeler **taslaktır ve hukuki görüş değildir.** Şirket kurulunca bir
> KVKK avukatına tek seferlik kontrol ettirilmesi önerilir.

| Dosya | İçerik |
|---|---|
| [01-kisisel-veri-envanteri.md](01-kisisel-veri-envanteri.md) | Hangi veri, hangi tabloda, hangi amaçla, kime gidiyor |
| [02-saklama-ve-imha-politikasi.md](02-saklama-ve-imha-politikasi.md) | Ne kadar saklanıyor, nasıl siliniyor |
| [03-veri-ihlali-mudahale-plani.md](03-veri-ihlali-mudahale-plani.md) | Sızıntı olursa 72 saatlik adımlar, şablonlar, olay kaydı |
| [04-teknik-ve-idari-tedbirler.md](04-teknik-ve-idari-tedbirler.md) | Alınan önlemler ve kanıtları |
| [05-veri-isleyenler-ve-yurt-disi-aktarim.md](05-veri-isleyenler-ve-yurt-disi-aktarim.md) | Sağlayıcılar, sözleşmeler, yurt dışı aktarım |

## 26 Kasım 2026'da yapılanlar

- Supabase güvenlik denetimi çalıştırıldı; uyarılar tek tek incelendi.
- Giriş gerektiren 17 veritabanı işlevi anonim kullanıcıya kapatıldı (#476).
- Bir işlevin arama yolu sabitlendi (#476).
- Tıklama tuzağı koruması (`X-Frame-Options`) zorlanıyor (#476).
- Eski herkese açık profil fotoğrafı deposu kapatıldı; gizlilik metniyle
  uyumlu (#477).
- Şirketin CV okuması veritabanında da paylaşım onayına bağlandı (#473).
- Güven Merkezi sayfası yayımlandı (#475).
- Bu belgeler hazırlandı.

## Açık işler

### Senin yapman gerekenler (hesap sahibi olarak; ben yapamam)

| # | İş | Nerede | Maliyet |
|---|---|---|---|
| 1 | E-posta doğrulama kodu süresini **1 saat veya altına** indir | Supabase → Authentication → Providers → Email → "Email OTP Expiration" | Ücretsiz |
| 2 | Supabase, GitHub, Cloudflare, Google hesaplarında **iki adımlı doğrulamanın** açık olduğunu kontrol et | Her hesabın güvenlik ayarları | Ücretsiz |
| 3 | Veri işleme sözleşmelerini (DPA) al: Supabase, Resend; Cloudflare ve Google'da kabul edildiğini kontrol et | Bkz. 05 | Ücretsiz |
| 4 | **Yedekleme kararı:** ücretsiz planda geri yüklenebilir otomatik yedek yok (panelde Database → Backups'tan doğrula). Seçenekler: Supabase Pro (aylık ~25 $; 7 günlük yedek + sızdırılmış şifre kontrolü) ya da şifreli kendi yedeğimiz | Supabase → Billing | Pro ücretli |
| 5 | Şirket kurulunca: avukat kontrolü (yurt dışı aktarım standart sözleşmesi, VERBİS muafiyeti, metinler) | Avukat | Ücretli, tek seferlik |
| 6 | Şirket kurulunca: unvan, MERSİS ve adresi bana ver — metinleri güncellerim | — | Ücretsiz |

### Benim yapabileceklerim (onay verirsen)

| # | İş |
|---|---|
| A | ~~Otomatik saklama temizliği~~ — devrede (27 Kasım 2026), günlük |
| B | ~~CSP zorlama~~ — çekirdek zorlandı (27 Kasım 2026); kaynak listesi AdSense onaylanınca ölçülüp zorlanacak |
| C | ~~Hareketsiz hesap politikası~~ — karar: hareketsiz hesaplar silinmez |
| D | `pg_net` eklentisini `public` şemasından taşımak (düşük risk, düşük fayda; zamanlanmış işleri bozabileceği için ayrı denenmeli) |

### Bilinçli olarak bırakılanlar

- Politikası olmayan 11 tablo (RLS açık, politika yok): istemciye **tamamen
  kapalı** demek; yalnız sunucu erişiyor. Doğru durum.
- Herkese açık sayaç ve özet işlevleri (takipçi sayısı, rehber okunma,
  açık öğrenci özeti): bilinçli olarak herkese açık; kişisel veri
  döndürmüyorlar.
