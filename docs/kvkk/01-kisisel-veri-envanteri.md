# Kişisel Veri İşleme Envanteri

> **Durum:** Taslak (26 Kasım 2026). Hukuki inceleme yapılmadı; bir KVKK
> uzmanına kontrol ettirilmeli.
> **Veri sorumlusu:** Mustafa Oğulcan Doğan (StajımVar kurucusu) —
> iletisim@stajimvar.com. Şirket kurulduğunda unvan, MERSİS ve adresle
> güncellenecek.
> **Kaynak:** Bu envanter üretim veritabanından (Supabase, proje
> `gdumgdgwlfnohkaucfow`) ve kod tabanından çıkarıldı; tahmin değil,
> ölçüm. Tablo adları parantez içinde.

## 1. İlgili kişi grupları

| Grup | Açıklama |
|---|---|
| Öğrenci kullanıcılar | Hesap açan, profil dolduran, başvuran öğrenciler |
| Şirket yetkilileri | İşveren hesabı açan, şirket talebinde bulunan, ekibe davet edilen kişiler |
| Ziyaretçiler | Hesap açmadan siteyi gezenler |
| İlan bildirenler | Hatalı/kurala aykırı ilan bildirenler |

İlan verisi (şirket ilanları) kişisel veri içermez.

## 2. Veri kategorileri

| # | Kategori | Veriler | Tablolar / depolar | İlgili kişi | Zorunlu mu |
|---|---|---|---|---|---|
| 1 | Kimlik | Ad soyad, kullanıcı adı, görünen ad | `profiles`, `social_profiles`, `username_history` | Öğrenci, şirket yetkilisi | Ad zorunlu |
| 2 | İletişim | E-posta, telefon | `profiles`, `company_claims`, `sirket_talepleri`, `sirket_davetleri`, `listing_reports` | Hepsi | E-posta zorunlu, telefon isteğe bağlı |
| 3 | Eğitim | Okul, bölüm, sınıf, not ortalaması, eğitim geçmişi, sertifikalar, diller | `student_profiles`, `student_educations`, `student_certificates`, `student_languages` | Öğrenci | Okul, bölüm, şehir zorunlu; diğerleri isteğe bağlı |
| 4 | Mesleki deneyim | Deneyimler, projeler, yetenekler, portfolyo/GitHub/LinkedIn adresleri, hakkımda metni | `student_experiences`, `student_projects`, `student_skills`, `student_profiles` | Öğrenci | İsteğe bağlı |
| 5 | Özgeçmiş dosyası | PDF özgeçmiş ve başvuru anındaki kopyası | `cvs` deposu (kapalı), `applications.cv_snapshot_path` | Öğrenci | İsteğe bağlı |
| 6 | Görsel | Profil fotoğrafı | `sosyal-avatar` deposu (kapalı); eski `avatars` deposu (kapalı, 2 eski dosya) | Öğrenci | İsteğe bağlı |
| 7 | Başvuru | Başvurular, başvuru anındaki profil kopyası, şirket değerlendirmeleri ve notları, görüşme/teklif yanıtları | `applications`, `basvuru_profil_kopyalari`, `basvuru_degerlendirmeleri`, `application_notes`, `application_tracking` | Öğrenci | Başvuru yapılırsa |
| 8 | Sosyal içerik | Paylaşımlar, beğeniler, kaydetmeler, bağlantılar, takipler, topluluklar, mesajlar | `posts`, `post_media`, `post_likes`, `post_saves`, `connections`, `takipler`, `community_members`, `mesajlar`, `sohbetler`, `sosyal-paylasim` deposu | Öğrenci | Kullanıcı oluşturursa |
| 9 | Tercih ve takip | Kayıtlı aramalar, kayıtlı ilan/şirket/rehber, bildirim tercihleri | `saved_*`, `bildirim_tercihleri`, `digest_*` | Öğrenci | İsteğe bağlı |
| 10 | Onay kayıtları | Aydınlatma metni onay anı ve sürümü, iletişim paylaşımı onayı ve sürümü | `profiles`, `applications.contact_share_consent_*` | Öğrenci | Zorunlu (kayıt) |
| 11 | Bildirimler | Site içi bildirimler ve e-posta gönderim durumu | `notifications` | Hepsi | Otomatik |
| 12 | Ziyaret ölçümü | Rastgele oturum kimliği, sayfa, yönlendiren, cihaz türü, yaklaşık şehir/ülke, (giriş yapılmışsa) kullanıcı kimliği. **IP yazılmıyor.** | `site_olaylari`, `site_olaylari_bot_arsivi` | Hepsi | Otomatik |
| 13 | İlan bildirimi | Bildiren e-postası (isteğe bağlı), IP adresinin tuzlanmış SHA-256 özeti (IP kendisi yazılmıyor) | `listing_reports` | İlan bildirenler | E-posta isteğe bağlı |
| 14 | Kimlik doğrulama | E-posta, şifrenin geri döndürülemez özeti, oturum kayıtları | Supabase Auth (`auth.users`) | Hepsi | Zorunlu |

**Özel nitelikli kişisel veri** (sağlık, din, etnik köken, biyometrik vb.)
**istenmiyor ve işlenmiyor.** Kullanıcı serbest metin alanlarına (hakkımda,
mesaj) kendisi yazarsa bu kontrolümüz dışında; aydınlatma metninde
belirtilmeli.

## 3. Amaç ve hukuki sebep

| Kategori | Amaç | Hukuki sebep (KVKK m.5) |
|---|---|---|
| 1, 2, 14 | Hesap açma, giriş, hizmet e-postaları | Sözleşmenin kurulması/ifası (m.5/2-c) |
| 3, 4, 9 | Uygun ilanları ve haftalık özeti hazırlamak, profil oluşturmak | Sözleşmenin ifası (m.5/2-c) |
| 5, 6, 7 | Başvurunun ilgili şirkete iletilmesi | Sözleşmenin ifası + başvuru başına **açık rıza** (aktarım için) |
| 2 (telefon/e-posta şirkete) | İletişim bilgisinin başvurulan şirkete açılması | Açık rıza (başvuru başına, geri alınabilir) |
| 8 | Sosyal özellikler | Sözleşmenin ifası (m.5/2-c) |
| 10 | Onayın ispatı | Hukuki yükümlülük / hakkın tesisi (m.5/2-ç, e) |
| 11 | Kullanıcıyı bilgilendirme | Sözleşmenin ifası |
| 12 | Site güvenliği ve kullanım ölçümü | Meşru menfaat (m.5/2-f) |
| 13 | İlan kalitesinin korunması, kötüye kullanımın önlenmesi | Meşru menfaat (m.5/2-f) |

## 4. Alıcılar ve aktarım

| Alıcı | Ne alıyor | Ülke | Rol |
|---|---|---|---|
| Başvurulan doğrulanmış şirket | Başvuru, profil kopyası, (onayla) iletişim ve özgeçmiş | Türkiye (çoğunlukla) | Ayrı veri sorumlusu |
| Supabase | Tüm veritabanı ve dosyalar | Almanya (Frankfurt, AB) | Veri işleyen |
| Cloudflare | Barındırma, teknik kayıtlar (IP, tarayıcı) | Küresel ağ | Veri işleyen |
| Resend | Bildirim e-postaları (alıcı adresi, içerik) | ABD | Veri işleyen |
| Google Workspace | Kimlik e-postaları; mustafa@stajimvar.com yazışmaları | ABD/AB | Veri işleyen |
| Google / Microsoft (OAuth) | Bu yöntemle giriş yapanın ad ve e-postası (sağlayıcıdan bize) | ABD | Ayrı veri sorumlusu |
| Google AdSense | Reklam çerezleri (yalnız rehber sayfalarında birim); **profil verisi verilmiyor** | ABD | Ayrı veri sorumlusu |

**Satış ve pazarlama amaçlı aktarım yok.**

## 5. Saklama yeri ve süresi

Ayrıntı: `02-saklama-ve-imha-politikasi.md`.

| Kategori | Süre |
|---|---|
| Hesapla ilgili her şey (1–11, 14) | Hesap açık kaldığı sürece; kullanıcı silince hemen |
| Ziyaret ölçümü (`site_olaylari`) | 90 gün (otomatik) |
| Bot arşivi, ilan bildirimleri | **Otomatik süre yok — yapılacak** (öneri: 90 gün / 1 yıl) |

## 6. Teknik ve idari tedbirler (özet)

Ayrıntı: `04-teknik-ve-idari-tedbirler.md`.
