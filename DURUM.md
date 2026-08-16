# StajımVar — Proje Durumu

Son güncelleme: 16 Ağustos 2026 — **stajimvar.com yayında**

## Ne yapıyoruz

StajımVar bir **ilan kopyalama sitesi değil**, staj ilanı *keşif + başvuru altyapısı*.
Sistem ilanları çok kaynaklı olarak keşfeder, eler, doğrular ve öğrencinin tek bir
profille başvurmasını sağlar. Başvurular platformun kendi verisi olarak tutulur.

## Yığın

- **Frontend:** Vite 6 + React 19 + TypeScript + Tailwind 4
- **Veritabanı/Auth/Storage:** Supabase (`gdumgdgwlfnohkaucfow`, eu-central-1 Frankfurt, PG17)
- **Hosting:** Cloudflare Pages, proje adı `stajimvar`. `stajimvar.com` bu projeye
  bağlı. Eski Next.js Worker'ı (`ai-chat-cloudflare`) hâlâ duruyor ama route'u yok;
  geri dönmek gerekirse `stajimvar.com/*` route'unu ona geri eklemek yeterli.
  Eski verinin bulunduğu Supabase projesi ayrı: `ruavwcganeyacrmfhldk`.
- **Dış AI servisi yok.**

> **Not:** Yeni Supabase projesi açılmadı. Mevcut proje zaten boştu, doğru bölgedeydi
> ve RLS'i gerçek saldırı senaryolarıyla test edilmişti. Yeni proje açmak bu testleri
> çöpe atar ve karşılığında bir şey vermezdi. "Temiz veritabanı" hedefi karşılanıyor:
> production'a hiçbir demo ilan girmedi, tüm tablolar 0 satır.

---

## Pipeline

```
keşfet → staj mı? → şirket kim? → kaynak güvenilir mi? → duplicate mi?
       → hâlâ aktif mi? → başvuru kanalı ne? → yayınla
```

Bulunan hiçbir şey doğrudan yayınlanmaz. Her ilan önce `raw_listings`'e düşer,
her adımda elenebilir ve **neden elendiği kayıtta kalır** (`reject_reason`).
`source_effectiveness` view'ı hangi kaynağın kaç ilan getirdiğini ve nerede
kaybettiğini gösterir.

### Kaynak güven seviyeleri (`sources.trust`)

| Seviye | Ne | Yayınlayabilir mi |
|---|---|---|
| `official` | Şirketin kariyer sayfası, ATS (Greenhouse/Lever/Workable), kamu portalı | Evet |
| `verified_third_party` | Üniversite kariyer merkezi, anlaşmalı kaynak | Evet |
| `discovery_signal` | Yalnızca ipucu | **Hayır** — resmî kaynakta doğrulanmadan geçemez |

### Başvuru tipleri (`listings.application_method`)

| Tip | Akış |
|---|---|
| `email_application` | Öğrenci StajımVar'dan başvurur → kayıt bizim DB'de → onayıyla **doğrulanmış** kanala iletilir |
| `external` | Kamu/Kariyer Kapısı gibi zorunlu harici başvuru → resmî sayfaya yönlendirme |
| `internal` | Şirket StajımVar üyesi → başvuru tamamen platform içinde |

---

## ✅ Tamamlananlar

### Kod ayağa kalktı

- `npm install` — `@cloudflare/workers-types` kaldırıldı (sürümü yok, artık gereksiz),
  eksik `@types/react` / `@types/react-dom` eklendi
- **Kod ilk kez derlendi.** 12 tip hatası çıktı, hepsi düzeltildi
- `npm run dev` çalışıyor, konsol temiz
- Git reposu kuruldu

### Veri erişim katmanı

- `src/lib/database.types.ts` — şema tipleri
- `src/lib/queries/mappers.ts` — `snake_case ↔ camelCase`, tek çeviri noktası
- `src/lib/queries/index.ts` — ilan/öğrenci/şirket/başvuru/quiz sorguları

### Veritabanı (canlıda, test edildi)

`0001`–`0003`: 12 tablo, 25 RLS politikası, 4 fonksiyon, 7 tetikleyici, 3 storage bucket.

`0004`: kaynak alanları, dedup anahtarları, başvuru kanalı modeli, audit alanları.

`0005`: keşif pipeline'ı — `raw_listings` (staging), `application_channels`,
`import_runs` / `import_events`, `source_effectiveness` view'ı.

`0006`: kanal doğrulama muhafızının `service_role` düzeltmesi.

### Veritabanı düzeyinde bağlanan kurallar

Bunlar uygulama katmanında değil, şemada duruyor — kod hata yapsa bile ihlal edilemez.
**Dokuzu da gerçek veriyle test edildi, dokuzu da tuttu:**

| # | Kural | Nasıl |
|---|---|---|
| 1 | `info@` / `iletisim@` gibi genel kutular başvuru kanalı olamaz | `channels_no_generic_mailbox` CHECK |
| 2 | Yeni kanal her zaman `unverified` başlar | `guard_channel_verification` tetikleyici |
| 3 | Kanıtsız doğrulama yapılamaz | `channels_verified_needs_evidence` CHECK |
| 4 | Doğrulanmamış kanala öğrenci verisi gönderilemez | `enforce_listing_application_channel` tetikleyici |
| 5 | Doğrulama kanıt + yöntem + tarih ister | CHECK |
| 6 | Doğrulanmış kanalla ilan açılabilir | — |
| 7 | Kanal başka şirkete aitse reddedilir | tetikleyici |
| 8 | `external` yöntem başvuru adresi olmadan olmaz | `listings_external_method_requires_url` CHECK |
| 9 | Uyum kontrolü yapılmamış kaynak açılamaz | `sources_enable_requires_review` CHECK |

Ayrıca **şirket kendi kanalını doğrulayamaz** — doğrulamayı yalnızca StajımVar
(admin veya `service_role` ile çalışan sunucu tarafı) yapabilir.

### Kolon bazlı gizlilik

`listings` tablosunda tarayıcıya inmemesi gereken kolonlar (`raw`, `raw_listing_id`)
için tablo düzeyi `SELECT` geri alındı, izinli kolonlar tek tek verildi.
Doğrulandı: anon rolüyle `select=*` **401**, izinli kolonlar 200 dönüyor.
Başvuru kanalının değeri (e-posta adresi) `anon`'a tamamen kapalı.

---

## 🟢 Yayındaki sürüm (v1) neyi yapar

Salt okunur ilan sitesi: ziyaretçi ilanları görür, "İlana Git" ile şirketin kendi
başvuru sayfasına gider. Kayıt/giriş **bilerek kapalı** (`AUTH_ENABLED = false`
içinde `src/App.tsx`) — `src/lib/auth.ts` yazılı ama App profili henüz Supabase'den
okumuyor, çalışmayan bir kayıt formu yayında durmasın diye giriş noktaları gizli.

Kişisel veri toplanmadığı için KVKK açık rıza akışı gerekmiyor; yasal metinler
(`/gizlilik`, `/cerez-politikasi`, `/kvkk-aydinlatma-metni`) bu duruma göre yazıldı
ve üyelik açıldığında yeniden yazılmaları gerekiyor.

Bilinen eksik: bilinmeyen yollar 404 yerine 200 + ana sayfa dönüyor (soft 404).

## ⏳ Sıradaki iş

### 1. Kaynak adaptörleri (server-side, Supabase Edge Function)

Hedef: **20–50 kaliteli kaynakla motoru gerçekten çalıştırmak**, sonra genişletmek.

- `greenhouse` / `lever` / `workable` — resmî JSON API'ler, en temiz başlangıç
- `jsonld` — kariyer sayfalarındaki schema.org JobPosting
- `rss` — üniversite kariyer merkezleri
- Kamu portalları — `external` başvurulu, e-posta altyapısı gerektirmez

Her adaptör `sources.adapter` ile eşleşir. `service_role` Edge Function'da kalır.

### 2. Staj sınıflandırıcı

`raw_listings.is_internship` + `internship_score`. "Senior Developer" elenirken
"Software Intern", "Stajyer", "Uzun Dönem Stajyer", "Zorunlu Staj" geçmeli.
Elenen her kayıt `reject_reason = 'not_internship'` ile saklanır — böylece
sınıflandırıcının yanlış elediği ilanlar sonradan görülebilir.

### 3. Başvuru kanalı araştırması

İlan bulunduktan sonra şirketin resmî sitesinde açıkça işe alım için yayınlanmış
adres aranır (`kariyer@`, `ik@`, `staj@`). Bulunursa `evidence_url` ile birlikte
kaydedilir. Bulunamazsa ilan `external` kalır veya yayınlanmaz.

### 4. Başvuru gönderimi

E-posta sağlayıcısı **henüz seçilmedi**. `stajimvar.com` için SPF/DKIM doğrulaması
gerekecek. O gelene kadar `external` başvurulu ilanlarla sistem çalışabilir.

### 5. Arayüzü veritabanına bağlamak

`App.tsx` hâlâ `mockData.ts`'den besleniyor. Sorgu katmanı hazır.
Başvuru butonu `application_method`'a göre üç farklı davranmalı.

### 6. Şirket sahiplenme akışı (ikinci aşama)

"Bu şirketin yetkilisi misiniz?" → doğrulama → `companies.claimed_at`.
Şema hazır (`origin`, `claimed_at`, `claimed_by`), arayüz yok.

---

## ⚠️ Supabase panelinde elle yapılacaklar

- Authentication → Providers → Email aç, "Confirm email" işaretle
- Authentication → URL Configuration → Site URL: `https://stajimvar.com`

## Bilinen riskler

- **`interview_notes` öğrenciye sızıyor.** Şirketin dahili mülakat notu
  `applications` tablosunda ve öğrenci kendi satırını okuyabiliyor. Kolon bazlı
  yetki burada çözmez (öğrenci de şirket de `authenticated`). Notun ayrı bir
  `application_notes` tablosuna taşınması gerekiyor.
- **`student_profiles` görünürlüğü:** politika, `is_open_to_offers` açık öğrencileri
  *tüm* şirket hesaplarına gösteriyor — doğrulanmamış olanlara da. KVKK açısından
  `verified = true` şartı düşünülmeli.
- **Kaynak uyumu:** büyük iş ilanı sitelerinin çoğu otomatik erişimi yasaklıyor.
  Şema bunu zorluyor (`is_enabled` uyum kontrolü olmadan açılmıyor) ama hukuki
  değerlendirmeyi yapmıyor — kaynak başına tek tek karar verilmeli.
- `/kvkk-aydinlatma-metni` sayfası yok, AuthModal'da linki var. Yasal zorunluluk.
- Quiz puanlama sunucu tarafına taşınmadı; `quiz_attempts` INSERT politikası
  bilerek yazılmadı (öğrenci kendine 100 veremesin).
