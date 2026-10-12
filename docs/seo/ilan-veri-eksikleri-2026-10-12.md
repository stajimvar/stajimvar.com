# İlan konum verisi eksikleri — inceleme önerisi (12 Ekim 2026)

Bu dosya bir **öneri**. Üretim veritabanına hiçbir şey yazılmadı. Aşağıdaki
SQL'leri çalıştırmadan önce her satırı ilanın resmî kaynağında doğrulayın.

## Kural (src/lib/seo/ilan-sayfasi.mjs)

Google Search Central "Job posting" (güncelleme 2026-09-08):

- `jobLocation` fiziksel iş yeri; `addressCountry` **zorunlu**.
- %100 uzaktan işte `jobLocationType: TELECOMMUTE` ve en az bir ülke:
  `applicantLocationRequirements` (tercih edilen) ya da yalnız fiziksel bir
  çalışma seçeneği DE varsa `jobLocation` ülkesi.

Bizim uygulamamız — **tahmin yok, yalnız kaynak verisi**:

| Durum | Davranış |
|---|---|
| İş yerinde / hibrit, `country_code` var | `jobLocation` (şehir varsa `addressLocality` + ülke) |
| İş yerinde / hibrit, `country_code` yok | JobPosting **yazılmıyor** (şehirden ülke çıkarılmıyor) |
| Uzaktan (`work_type = 'Remote'`) | JobPosting **yazılmıyor**: başvuru coğrafyasını söyleyen kaynak alanı yok; ilanın ülke kodu başvuru şartı sayılmıyor |
| `city = 'Turkey'` gibi ülke adı | yerleşim yeri sayılmıyor; ülke `country_code`'dan |

Sayfa her durumda 200 ve görünür metniyle duruyor; yalnız yapısal veri yazılmıyor.
Güncel liste her derlemede `dist/_onrender/ilan-veri-eksikleri.json`.

## 12 Ekim 2026 ölçümü: 176 açık ilanın 21'inde JobPosting yok

| Neden | Adet |
|---|---|
| Uzaktan, başvuru coğrafyası kaynakta yok | 16 |
| Şehir var, ülke kodu yok (Ogulsize ×2 "İstanbul", Hiroba Games "Çankaya") | 3 |
| Şehir ve ülke yok (Novartis, Luron AI — iş yerinde) | 2 |

## Önerilen veri işleri

1. **Ülke kodu eksik 3 ilan** — kaynak ilanda ülke yazıyorsa girilsin:
   ```sql
   -- ÖNİZLEME (salt okuma)
   select id, title, city, country_code from public.listings
   where status = 'published' and country_code is null
     and id in ('2096468c-96cf-45ea-a6bd-6a2682ddbf15',
                'ffc10235-ce73-4ffa-9dda-96a3f4354017',
                '2a1ca32c-8c84-4322-99c3-5e491c8f158e');
   -- ÖNERİ (kaynakta doğrulandıktan sonra, yönetim aracı ya da göç ile):
   -- update public.listings set country_code = 'TR' where id in (...) and country_code is null;
   ```
2. **Konumu hiç olmayan 2 ilan** — Novartis (`f5eff36e…`) ve Luron AI
   (`b39b1b88…`): şirket kaydındaki "İstanbul" merkez adresi; ilanın iş yeri
   olduğu doğrulanmadan kullanılmadı. Kaynak ilandaki konum elle girilmeli.
3. **"Turkey" yazan şehir** (Insider One, `5805e24e…`): `country_code = 'TR'`
   olduğu için JobPosting yazılıyor; şehir yalnız ülke adı. Kaynak şehir
   söylüyorsa `city` düzeltilsin, söylemiyorsa boşaltılsın.
4. **Uzaktan ilanlar (16)** — ürün/veri kararı: içe aktarıcı kaynakta
   "yalnız şu ülkeden başvurulur" ifadesi yakalarsa ayrı bir sütuna (ör.
   `basvuru_ulkeleri text[]`) yazmalı; o alan doluysa `applicantLocationRequirements`
   yazılabilir. Alan eklenene kadar bu ilanlar zengin iş sonucuna girmiyor.

Not: içe aktarıcının kendisi de `country_code`'u yapısal ATS alanından, konum
metninden ya da kaynak yapılandırmasından çıkarıyor (`automation/country_normalization.py`,
tek sinyal kuralı). Bu katmanın kaynağı ayrıca denetlenebilir.
