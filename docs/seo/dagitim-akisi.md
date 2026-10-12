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

onay + merge ─► supabase-production.yml (push, yalnız main)
             changes ─► validate_app ─┐
                        security_regression ─┴─► migrate_and_functions (yalnız supabase/ değiştiyse)
                                                  └─► goc_durumu (canlı defterde bekleyen/ayrışan göç YOK)
                                                       └─► cloudflare_production (hepsi başarılıysa)

her gün 06:23 TSİ ─► supabase-production.yml (schedule)
             validate_app + security_regression + goc_durumu + cloudflare_production
             (GÖÇ UYGULANMAZ — migrate yalnız push/elle; bekleyen göç varsa yayın da durur)
```

### Acil yayın dahil bütün yollar (birleştirme öncesi denetim, 12 Ekim 2026)

| Yol | Kapılar | Sonuç |
|---|---|---|
| `main`e push | tip, test, derleme + SEO kapısı, RLS regresyonu, göç, göç durumu | tek yayın yolu |
| Elle tetikleme ("acil yayın") | aynı iş akışı, aynı kapılar | başka dalda başlatılırsa göç ve yayın işleri **koşmaz** (`github.ref == 'refs/heads/main'`) |
| Günlük zamanlanmış derleme | aynı kapılar; göç uygulanmaz | bekleyen göç varsa `goc_durumu` düşer, yayın çıkmaz |
| Göç düştükten sonra gelen arayüz push'u | göç işi atlanır | `goc_durumu` bekleyen göçü görür, yayın çıkmaz |
| Yerel `npm run deploy` | — | **kaldırıldı** |
| Başka iş akışlarında Cloudflare anahtarı | — | **yok** (`stajimvar-automation.yml`den çıkarıldı) |
| `pull_request_target` | — | hiçbir iş akışında yok |
| Cloudflare Pages git entegrasyonu | — | `main` commit'lerinde Cloudflare durum/onay kaydı yok; yayın yalnız `wrangler pages deploy` ile (Direct Upload) |

Hepsi `tests/dagitim-yolu.test.mjs` ile her testte sınanıyor.

**Depo dışında kalan tek risk:** depoya yazma yetkisi olan biri, iş akışı
dosyasını değiştirdiği bir dalda elle tetikleyebilir (GitHub o dalın dosyasını
kullanır) ya da Cloudflare anahtarını bilen biri yerelden `wrangler` çalıştırabilir.
Bunu kod değil ayar kapatır — aşağıdaki 2. madde.

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
2. **Environment `production`**: Settings → Environments → `production`,
   "Deployment branches: Selected branches → `main`"; `CLOUDFLARE_API_TOKEN`,
   `SUPABASE_DB_PASSWORD` ve `SUPABASE_ACCESS_TOKEN` bu ortamın sırlarına
   taşınır. Sonra `migrate_and_functions`, `goc_durumu` ve
   `cloudflare_production` işlerine `environment: production` eklenir
   (onayınızla). Böylece değiştirilmiş bir dal dosyası da sırlara erişemez.
   "Required reviewers" eklenirse her yayın tek tık onay ister.
   Cloudflare API anahtarı yalnız bu ortamda dursun; yerelde kopyası olmasın.
3. Actions ayarı: "Allow GitHub Actions to create and approve pull requests" kapalı kalsın.
