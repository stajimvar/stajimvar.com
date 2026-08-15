# automation — ilan keşif motoru

Resmî ATS/RSS uç noktalarından staj ilanı toplar ve `raw_listings` keşif
havuzuna yazar. **İlan yayınlamaz** — yayına geçiş ayrı bir adımdır.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `scraper.py` | Saf adaptör kütüphanesi. 8 kaynak tipi. Veritabanına dokunmaz. |
| `sources.json` | Kaynak kaydı. **Tek doğruluk kaynağı** — kaynak eklemek için buraya satır ekle. |
| `repository.py` | Supabase kalıcılık katmanı. Şema burada, adaptörlerde değil. |
| `discover.py` | Koşucu. Tarar, sınıflandırır, keşif havuzuna yazar. |
| `stale_safety.py` | Pasifleştirme kararları. Saf mantık, veritabanı istemcisi yok, hiçbir şey silemez. |
| `translation.py` | Yabancı dildeki ilanları Türkçeye çevirir. |
| `_ileride/` | Henüz bağlanmamış parçalar (e-posta bildirimi). |

## Kurulum

```bash
pip install -r requirements-scraper.txt
cp .env.example .env    # SUPABASE_SERVICE_ROLE_KEY'i doldur
```

## Kullanım

```bash
python -m pytest tests/ -q       # önce testler
python discover.py --sync-only   # sources.json -> sources tablosu
python discover.py --dry-run     # hiçbir şey yazmaz, sadece raporlar
python discover.py               # ALLOW_INSERT_UPDATE=true gerektirir
python discover.py --source trendyol-lever
```

## Neden Python, neden Deno değil

Bu modül eski StajımVar reposundan devralındı ve çalışır durumdaydı. Deno Edge
Function'a çevirmek, test edilmiş 8 adaptörü yeniden yazmak demekti — bu da
hata üretmenin en hızlı yolu. GitHub Actions zaten zamanlama için yeterli ve
`service_role` anahtarı sunucu tarafında kalıyor.

## Kaynak eklerken

`sources.json`'a satır ekle, sonra `python discover.py --sync-only` çalıştır.

```json
{"id":"ornek-lever","name":"Örnek","type":"lever","site":"ornek",
 "enabled":true,"country":"TR","company_name":"Örnek",
 "careers_url":"https://jobs.lever.co/ornek"}
```

Yalnızca **resmî, herkese açık ATS/API uç noktaları** eklenir. HTML kazıma,
erişim engeli aşma veya kullanım şartlarını ihlal eden kaynak eklenmez.
Şema da bunu zorluyor: `sources.is_enabled`, `robots_allowed` ve
`tos_reviewed_at` doldurulmadan `true` yapılamaz.

## Güvenlik notu

`scraper.py` ilan açıklamasından e-posta adresi yakalayabiliyor (`Job.hr_email`),
ama bu adres **keşif kaydına yazılmaz**. Başvuru kanalı ancak
`application_channels` tablosuna, kanıt URL'siyle ve doğrulanarak girer.
Şirketin kendisi de kendi kanalını doğrulanmış işaretleyemez.
