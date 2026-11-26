# Kişisel Veri Saklama ve İmha Politikası

> **Durum:** Taslak (26 Kasım 2026). Hukuki inceleme yapılmadı.
> Dayanak: 6698 sayılı KVKK m.7 ve Kişisel Verilerin Silinmesi, Yok
> Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik. VERBİS'e
> kayıt yükümlülüğü yoksa bu politikanın hazırlanması yasal zorunluluk
> olmayabilir; yine de iyi uygulama olarak tutuluyor.

## 1. Amaç

Kişisel verilerin işlendikleri amaç için gerekli olandan uzun
saklanmaması ve süresi dolan verinin güvenli biçimde silinmesi.

## 2. Saklama ortamları

| Ortam | İçerik | Konum |
|---|---|---|
| Supabase PostgreSQL | Hesap, profil, başvuru, sosyal içerik, ölçüm | Frankfurt (AB) |
| Supabase Storage | Özgeçmiş (`cvs`, kapalı), profil fotoğrafı (`sosyal-avatar`, kapalı), paylaşım görselleri (`sosyal-paylasim`, kapalı), logolar (`logos`, herkese açık; kişisel veri değil) | Frankfurt (AB) |
| Supabase Auth | E-posta, şifre özeti, oturumlar | Frankfurt (AB) |
| Resend | Gönderilen e-posta kayıtları | ABD (sağlayıcının kendi süresi) |
| Cloudflare | Teknik istek kayıtları | Sağlayıcının kendi süresi |
| Google Workspace | mustafa@ / iletisim@ yazışmaları | Sağlayıcı |
| Kâğıt ortam | Yok | — |

## 3. Saklama süreleri

| Veri | Süre | Nasıl uygulanıyor | Durum |
|---|---|---|---|
| Hesap, profil, özgeçmiş, fotoğraf, başvurular (şirkete giden kopyalar dahil), sosyal içerik, mesajlar, bildirimler, kayıtlı aramalar, onay kayıtları | Hesap açık kaldığı sürece | Kullanıcı "Hesabımı sil" ile siler; silme anında kalıcı | **Uygulanıyor** |
| Ziyaret ölçümü (`site_olaylari`) | 90 gün | `site_olayi_yaz` işlevi ara ara 90 günden eski kayıtları siliyor | **Uygulanıyor** |
| Hesap silinince ziyaret kayıtları | Kullanıcı kimliği kaldırılıyor, kayıt kimliksiz kalıyor (90 gün sonra zaten siliniyor) | Hesap silme işlemi | **Uygulanıyor** |
| Bot olarak ayrılan ziyaret kayıtları (`site_olaylari_bot_arsivi`) | 90 gün | `kisisel_veri_saklama_temizligi` — günlük iş akışı | **Uygulanıyor** (27 Kasım 2026) |
| İlan bildirimleri (`listing_reports`: e-posta, IP özeti) | Kapatıldıktan sonra 1 yıl | `kisisel_veri_saklama_temizligi` — günlük | **Uygulanıyor** (27 Kasım 2026) |
| Uzun süre kullanılmayan hesaplar | Kullanıcı silene kadar saklanır; hareketsizlik nedeniyle silme yok | — | **Karar: silinmez** (27 Kasım 2026, kullanıcı kararı). Gerekçe: hesap kullanıcıya ait ve istediği an kendisi silebiliyor |
| Şirket talepleri / davetler (`sirket_talepleri`, `company_claims`, `sirket_davetleri`) | Karara bağlandıktan sonra 1 yıl; 1 yıl bekleyen davet de | `kisisel_veri_saklama_temizligi` — günlük | **Uygulanıyor** (27 Kasım 2026) |
| İş kayıtları (`import_events`, `zamanlanmis_is_kayitlari`) | Kişisel veri içermez | — | — |

## 4. İmha yöntemleri

| Yöntem | Ne zaman |
|---|---|
| **Silme** (veritabanı satırı ve depodaki dosya kalıcı olarak silinir) | Hesap silme, süresi dolan kayıtlar |
| **Anonimleştirme** (kişiyle bağ kaldırılır, istatistik kalır) | Hesap silinince ziyaret ölçümü |
| **Yedekler** | Supabase ücretsiz planda kullanıcıya açık geri yüklenebilir yedek yok (panelden doğrulanmalı). Pro plana geçilirse yedekler 7 gün sonra sağlayıcı tarafından kendiliğinden siliniyor; silinen veri en geç bu sürede yedeklerden de çıkar. |

Kâğıt ortamda veri tutulmuyor; karartma/yakma gibi fiziksel yöntemler
uygulanmıyor.

## 5. Periyodik imha

Yönetmelik, otomatik silinmeyen veriler için en fazla **6 ayda bir**
periyodik imha öngörüyor. Uygulama:

- Her 6 ayda bir (Ocak ve Temmuz) yukarıdaki tabloda "Yapılacak" olan
  kalemler gözden geçirilir; süresi dolan kayıtlar silinir.
- Yapılan imha, tarih ve silinen kayıt sayısıyla bu dosyanın sonundaki
  kayda yazılır. **Kayıt 3 yıl saklanır.**
- Hedef: "Yapılacak" kalemleri otomatik silmeye (veritabanı işi)
  bağlayıp elle imhayı sıfıra indirmek.

## 6. Talep üzerine silme (KVKK m.11)

- Kullanıcı hesabını kendisi silebilir (profil düzenleme → Hesabımı sil).
- E-postayla gelen silme talepleri (iletisim@stajimvar.com) **en geç 30
  gün** içinde sonuçlandırılır ve yazılı yanıt verilir.
- Kimlik doğrulama: talep, hesabın kayıtlı e-posta adresinden gelmeli.

## 7. Sorumlu

Veri sorumlusu: Mustafa Oğulcan Doğan. Şirket kurulunca şirket adına
güncellenecek.

## 8. İmha kaydı

| Tarih | Kalem | Silinen kayıt | Yöntem | Yapan |
|---|---|---|---|---|
| 27.11.2026 | Otomatik saklama temizliği devreye alındı | 0 (o gün süresi dolan kayıt yoktu) | Silme | Otomatik (günlük iş akışı); sonraki sayılar iş akışı günlüğünde |
