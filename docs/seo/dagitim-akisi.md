# Güvenli dağıtım akışı (12 Ekim 2026)

## Önceki durum

| Yol | Tetikleyici | Güvenlik regresyonu | Göç kapısı | Not |
|---|---|---|---|---|
| `supabase-production.yml` | `main`e push, elle | var | var | asıl yol |
| `dagit.yml` | elle | **yok** | **yok** | Eylül'de 113 kez kullanıldı; 14 Eylül 13:34'te fırsat sayfaları olmadan (504) yayına çıktı |
| `stajimvar-automation.yml` | saatlik | — | — | yayın adımı `if: false` ama her saat boşuna derliyordu |
| PR | — | **hiç kontrol yok** | — | hata ancak birleştirmeden sonra yakalanıyordu |

## Yeni durum

```
PR açılır ─► pr-dogrulama.yml
             ├─ dogrulama: lint, lint:functions, npm test, pytest,
             │             npm run build (ön render + zorunlu veri + azalma kapısı + SEO kapısı)
             └─ guvenlik_regresyonu: tek kullanımlık Supabase, göçler sıfırdan, RLS testleri
             (YAYIN YOK · Cloudflare anahtarı yok · servis anahtarı yok)

onay + merge ─► supabase-production.yml (push)
             changes ─► validate_app ─┐
                        security_regression ─┼─► migrate_and_functions (yalnız supabase/ değiştiyse)
                                             └─► cloudflare_production (üçü de başarılıysa)

her gün 06:23 TSİ ─► supabase-production.yml (schedule)
             validate_app + security_regression + cloudflare_production
             (GÖÇ UYGULANMAZ — migrate yalnız push/elle)
```

- `dagit.yml` **silindi**. `tests/dagitim-yolu.test.mjs` iş akışlarını ayrıştırıp
  `wrangler pages deploy` çalıştıran tek işin `cloudflare_production` olduğunu,
  o işin üç kapının başarısına bağlı olduğunu ve PR akışının yayın yapmadığını
  her testte doğruluyor.
- Functions tip kontrolü (`lint:functions`) yalnız `dagit.yml`de koşuyordu;
  artık üretim ve PR akışında.
- Günlük yeniden derleme: ilan sayfaları ve ilan haritası zaten kenarda canlı;
  şirket sayfaları, `/staj-ilanlari` merkezi, sayfalı tam liste ve sayfa haritası
  en fazla bir gün bayat kalıyor.

## GitHub ayarlarında önerilen (panel, depoda değil)

1. **Branch protection (`main`)**: "Require a pull request before merging",
   "Require status checks to pass": `PR doğrulaması / dogrulama`,
   `PR doğrulaması / guvenlik_regresyonu`. Doğrudan push kapanır.
2. **Environment `production`** (isteğe bağlı): `cloudflare_production` işine
   `environment: production` + "Required reviewers" eklenirse her yayın tek tık
   onay ister. Bu, iş akışında küçük bir değişiklik gerektirir; onayınızla eklenir.
3. Actions ayarı: "Allow GitHub Actions to create and approve pull requests" kapalı kalsın.
