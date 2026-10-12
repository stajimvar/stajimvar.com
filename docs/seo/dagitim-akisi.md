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

**Depo dışında kalan risk ve kapatılışı:** depoya yazma yetkisi olan biri, iş
akışı dosyasını değiştirdiği bir dalda elle tetikleyebilir (GitHub o dalın
dosyasını kullanır). Bu yüzden üretim anahtarları depo düzeyinden kaldırılıp
yalnız `main`e açık `production` ortamına taşınıyor (aşağıda). Değiştirilmiş
bir dal dosyası ya ortamı bildirmez (sır boş gelir) ya da bildirir ve GitHub
işi "branch is not allowed to deploy" ile reddeder.

- `dagit.yml` **silindi**. `tests/dagitim-yolu.test.mjs` iş akışlarını ayrıştırıp
  `wrangler pages deploy` çalıştıran tek işin `cloudflare_production` olduğunu,
  o işin üç kapının başarısına bağlı olduğunu ve PR akışının yayın yapmadığını
  her testte doğruluyor.
- Functions tip kontrolü (`lint:functions`) yalnız `dagit.yml`de koşuyordu;
  artık üretim ve PR akışında.
- Günlük yeniden derleme: ilan sayfaları ve ilan haritası zaten kenarda canlı;
  şirket sayfaları, `/staj-ilanlari` merkezi, sayfalı tam liste ve sayfa haritası
  en fazla bir gün bayat kalıyor.

## Üretim ortamı (`production`) — anahtarlar yalnız main'de

### Depoda yapılan (bu PR)

Korunan sırlar: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`
(ve iş akışlarının önce denediği `SUPABASE_SECRET_KEY`, tanımlanırsa).

- Bu sırları okuyan **her iş** `environment: production` bildiriyor
  (13 dosyada 15 iş): göç, göç durumu, Cloudflare yayını, şema denetimi,
  katalog kanıtı ve servis anahtarıyla çalışan saatlik/günlük otomasyonlar.
- `supabase-production.yml`deki üst düzey `SUPABASE_ACCESS_TOKEN` kaldırıldı;
  yalnız `migrate_and_functions` ve `goc_durumu` alıyor. Doğrulama ve güvenlik
  regresyonu işleri artık bu anahtarı görmüyor.
- Sıra değişmedi: `changes → validate_app + security_regression →
  migrate_and_functions → goc_durumu → cloudflare_production`.
- `tests/dagitim-yolu.test.mjs`: korunan sırrı ortamsız okuyan iş ya da üst
  düzey `env:` ile dağıtan iş akışı olursa test düşüyor. Ortam bildirmeyen
  işler (`changes`, `validate_app`, `security_regression`, PR doğrulaması)
  bu sırların adını bile taşımıyor.

Açık değerler (`SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CF_ANALYTICS_TOKEN`)
ve e-posta/arama anahtarları depo düzeyinde kalıyor.

### Panelde yapılacaklar (sırayla)

**A. Ortamı kurun** — Settings → Environments → **New environment**
1. Ad: `production` → **Configure environment**.
2. **Deployment branches and tags** → *Selected branches and tags* →
   **Add deployment branch or tag rule** → Ref type: *Branch*, Name pattern:
   `main` → **Add rule**.
3. **Required reviewers** işaretlemeyin: saatlik otomasyonlar da bu ortamda;
   her koşu onay bekler. **Wait timer** boş kalsın.
4. "Allow administrators to bypass configured protection rules" görünüyorsa
   işareti kaldırın.
5. **Save protection rules**.

**B. Ortam sırlarını ekleyin** — aynı sayfada *Environment secrets* →
**Add environment secret**. Ad, depo düzeyindekiyle **birebir aynı** olmalı.
GitHub kayıtlı sırrın değerini geri göstermez; değeri kaynağından alın:

| Ad | Nereden |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens. Öneri: yalnız *Account → Cloudflare Pages → Edit* izinli **yeni** bir anahtar üretin (eskisi doğrulamadan sonra iptal edilir). |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers & Pages → sağ sütundaki *Account ID* |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens → **Generate new token** (eskisi sonra iptal) |
| `SUPABASE_DB_PASSWORD` | Mevcut veritabanı parolası. Bilinmiyorsa **sıfırlamadan önce** durun: Project Settings → Database → *Reset database password* parolayı kullanan her bağlantıyı (yerel `supabase link` dahil) değiştirir; ayrı bir karar. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → *secret* anahtar |

**C. PR'ı birleştirin** (onayınızla). Ortam ve sırlar hazırsa ilk `main`
koşusunda `migrate_and_functions`, `goc_durumu` ve `cloudflare_production`
işlerinin başında "production" ortam rozeti görünür; sır doğrulama adımları
geçer. (A/B yapılmadan birleştirilirse GitHub ortamı korumasız olarak kendisi
açar ve depo düzeyi sırlar kullanılmaya devam eder: bir şey kırılmaz, ama
koruma da başlamaz.)

**D. Doğrulayın** — Actions sekmesinde:
1. Birleştirme sonrası *Supabase production release* yeşil.
2. Bir saatlik otomasyon (ör. *StajımVar otomasyonları*) yeşil.
3. `main`den yeni açılmış bir dalı seçip *Run workflow* ile *Supabase
   production catalog evidence*'ı deneyin: iş "Branch … is not allowed to
   deploy to production" ile reddedilmeli. (Eski dallar bu dosyanın ortamsız
   sürümünü taşır; E adımından sonra onlar da sırsız kalır.)

**E. Depo düzeyi kopyaları silin** — ancak D yeşilse. Settings → Secrets and
variables → Actions → *Repository secrets*: yukarıdaki 5 adı silin. Sonra D.1
ve D.2'yi bir kez daha koşturun (hâlâ yeşil olmalı: değerler artık yalnız
ortamdan geliyor).

**F. Eski anahtarları iptal edin** — B'de yeni anahtar ürettiyseniz eski
Cloudflare ve Supabase erişim anahtarlarını kaynağında iptal edin.

## Diğer önerilen ayarlar (panel)

1. **Branch protection (`main`)**: "Require a pull request before merging",
   "Require status checks to pass": `PR doğrulaması / dogrulama`,
   `PR doğrulaması / guvenlik_regresyonu`. Doğrudan push kapanır.
2. Actions ayarı: "Allow GitHub Actions to create and approve pull requests" kapalı kalsın.
3. Cloudflare yayın anahtarının yerelde kopyası olmasın.
