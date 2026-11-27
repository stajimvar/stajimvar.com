# Veri İşleyenler ve Yurt Dışına Aktarım

> **Durum:** Taslak (26 Kasım 2026). **Bu dosya hukuki görüş değildir.**
> Yurt dışı aktarım kuralları 1 Haziran 2024'te değişti (7499 sayılı
> Kanun ile KVKK m.9). Aşağıdaki "yapılacaklar" bir KVKK avukatına
> doğrulatılmalı.

## 1. Sağlayıcılar

| Sağlayıcı | Ne için | Verinin konumu | Sözleşme (DPA) | Bağımsız denetim |
|---|---|---|---|---|
| Supabase | Veritabanı, dosyalar, kimlik doğrulama | Almanya (Frankfurt) | **Kullanım koşullarına dahil; ayrı imza gerekmiyor** (panel → Organization → Legal Documents, 27 Kasım 2026'da doğrulandı). Aktarım Etki Değerlendirmesi (TIA) Trust Center'da | SOC 2 Type II, ISO 27001 (raporlar Team planında indirilebiliyor) |
| Cloudflare | Barındırma, CDN | Küresel | Cloudflare DPA, hizmet koşullarına dahil (cloudflare.com/cloudflare-customer-dpa) | ISO 27001, SOC 2 |
| Resend | Bildirim e-postaları | ABD | resend.com/legal/dpa | Sağlayıcı sayfasından doğrulanmalı |
| Google Workspace | Kurumsal e-posta, kimlik e-postaları | ABD/AB | Google Cloud veri işleme şartları (Admin Console → Hesap → Hukuki ve uyumluluk) | ISO 27001, SOC 2 |
| Google AdSense | Reklam (yalnız rehber sayfaları) | ABD | Google reklam veri işleme şartları | — |

## 2. Yurt dışı aktarım — mevcut durum

- Veri **Türkiye dışında** işleniyor (AB ve ABD).
- 2024'ten itibaren yurt dışı aktarım için sırayla: **yeterlilik kararı**
  (henüz yok) → **uygun güvenceler** (en yaygını Kurul'un yayımladığı
  **standart sözleşme**) → istisnai hâller (ör. açık rıza, yalnız arızi
  aktarımda).
- Standart sözleşme imzalanırsa **imzadan itibaren 5 iş günü içinde
  Kurul'a bildirilmesi** gerekiyor. Bildirmemenin idari para cezası var.
- **Pratik sorun:** Supabase, Resend gibi yabancı sağlayıcılar Kurul'un
  Türkçe standart sözleşmesini imzalamayabilir. Avukata sorulacak tam
  soru budur.

## 3. Yapılacaklar

| # | İş | Kim | Maliyet |
|---|---|---|---|
| 1 | ~~Supabase DPA~~ — gerekmiyor, koşullara dahil (27 Kasım 2026) | — | — |
| 2 | Resend DPA'yı indir/kabul et | Sen | Ücretsiz |
| 3 | Cloudflare ve Google DPA'larının hesapta kabul edildiğini kontrol et | Sen | Ücretsiz |
| 4 | Standart sözleşme ve Kurul bildirimi gerekiyor mu, sağlayıcılar imzalamazsa yol ne? | Avukat | Ücretli (tek seferlik görüşme) |
| 5 | Şirket kurulunca bütün sözleşmeleri şirket adına yenile | Sen | Ücretsiz |

DPA'lar imzalandıkça bu tabloya tarih yazılır.
