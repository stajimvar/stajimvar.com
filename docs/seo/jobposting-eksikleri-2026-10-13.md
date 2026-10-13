# JobPosting eksik ilanlar — resmî kaynak kontrolü (13 Ekim 2026)

- **Kaynak listesi:** canlı `/_onrender/ilan-veri-eksikleri.json` (21 ilan). Her ilanın
  resmî sayfası açıldı ve şunlara bakıldı:
  - sayfanın kendi JobPosting yapısal verisi;
  - görünür metin;
  - JavaScript'le çizilen sayfalarda tarayıcıdaki metin.
- **Kural:** yalnız kaynağın **açıkça** söylediği değer yazılır. Çelişkili, belirsiz ya da
  kontrol edilemeyen kayıtlara dokunulmaz.
- **Uygulama:** düzeltmeler `supabase/migrations/20261214010000_ilan_konum_kanitli_duzeltmeler.sql`
  içinde. Her güncelleme ilanın şu anki değerine koşullu, yani değer o arada değiştiyse
  güncelleme hiçbir şey yapmaz.

## Özet

| Sonuç | Adet | Ne zaman JobPosting kazanır |
|---|---|---|
| Kaynakla düzeltildi: ülke/şehir (ofis ilanı) | 3 | Göç canlıya çıkınca |
| Kaynakla düzeltildi: "uzaktan" değil, hibrit | 2 | Göç canlıya çıkınca |
| Kaynakla doğrulandı: uzaktan + başvuru ülkesi | 4 | Damgayı okuyan sonraki PR ile |
| İşveren düzeltmeli (kendi ilanı) | 2 | İşveren formda ülkeyi seçince |
| Kaynak belirsiz ya da çelişkili — dokunulmadı | 7 | — |
| Kaynakta kapanmış görünüyor — kapatma adayı | 2 | — (kapanmalı) |
| Kaynak uzaktan diyor mu, şüpheli — elle kontrol | 1 | — |

Beklenen JobPosting sayısı: bugün **155** → göçle **160** → damga PR'ı ile **164**.

## Ayrıntı

| İlan | Kaynak | Kaynağın söylediği | Karar |
|---|---|---|---|
| Hiroba Games — Social Media & Content Creator Intern (`2a1ca32c`) | Workable | yapısal veri: Çankaya, Ankara, **Turkey** | ülke **TR** |
| Novartis — Hukuk Stajyeri (`f5eff36e`) | novartis.com | yapısal veri: **Istanbul Ataşehir, Türkiye** | şehir **İstanbul**, ülke **TR** |
| Luron AI — QA Stajyeri (`b39b1b88`) | careers.luron.ai | "Based in **Istanbul** and able to work **on-site**" | şehir **İstanbul**, ülke **TR** |
| Atrya — Intern Marketing (`cc55e6ec`) | join.com | "Aufteilung zwischen **Büro** … und **Remote**"; Berlin, DE | çalışma şekli **Hibrit** |
| Neckar Hub — Junior Consultant Marketing (`8bcb8de3`) | join.com | "**remote oder vor Ort** in einem unserer Hubs"; Tübingen, DE | çalışma şekli **Hibrit** |
| FixFirst — Founders Associate Intern (`a67768ee`) | join.com | yapısal veri: TELECOMMUTE, ülke **Germany**; "Remote (Germany)" | başvuru ülkesi **DE** (damgalı) |
| Kaizen Loyalty — Product Specialist (`11c26e17`) | gethirex | yapısal veri: TELECOMMUTE, ülke **TR**; "İstanbul, Türkiye · Uzaktan" | başvuru ülkesi **TR** (damgalı) |
| Trading 212 — Social Media Intern (`43f222b6`) | Ashby | yapısal veri: TELECOMMUTE, ülke **Germany** | başvuru ülkesi **DE** (damgalı) |
| WongDoody — Digital Creative Copy (`04217342`) | Greenhouse | konum: "Berlin, DE \| **Germany (REMOTE)**" | başvuru ülkesi **DE** (damgalı) |
| Ogulsize — Stilist Stajyeri (`2096468c`) | işveren ilanı | İstanbul (ülke seçilmemiş) | **işveren** formda ülkeyi seçmeli |
| Ogulsize — Modelist Stajyeri (`ffc10235`) | işveren ilanı | İstanbul (ülke seçilmemiş) | **işveren** formda ülkeyi seçmeli |
| KLUUU — Praktikum Marketing & Growth (`89f99792`) | join.com | yapısal veri "Deutschland", görünür metin "Remote (**weltweit**)" | **çelişkili**, dokunulmadı |
| Wegain — Praktikant Marketing (`7c9f3c68`) | join.com | yapısal veri "Deutschland", görünür metin "Remote (**weltweit**)" | **çelişkili**, dokunulmadı |
| Dgpays — Genç Yetenek İş Analisti (`c9bd999d`) | hrpanda | "Remote … Ankara, Türkiye" — başvuru coğrafyası söylenmiyor | belirsiz, dokunulmadı |
| SHFT — Vibe Coder Stajyeri (`ef943efd`) | hrpanda | "Remote … Istanbul, Türkiye" — başvuru coğrafyası söylenmiyor | belirsiz, dokunulmadı |
| Formed — Founder's Associate Intern (`92d787ea`) | formed.design | yalnız "Remote" | belirsiz, dokunulmadı |
| NREL — Power System Intern (`5dc0a970`) | Workday | yapısal veri: Golden, CO, ABD; başvuru coğrafyası yok | belirsiz, dokunulmadı |
| Tether — Research Engineer Intern (`15d9acdb`) | careers.tether.io | onlarca ülkede "Remote" konumu | belirsiz, dokunulmadı |
| Connectinno — Yapay Zekâ Ürün Stajyeri (`188ef3f5`) | recruspace | "**Application Closed**", validThrough 2026-09-25 | **kapatma adayı** (ilan bağlantı kontrolü/yönetici) |
| SAP — Young Professionals Program (`19cee4c0`) | jobs.sap.com | ilan adresi genel iş listesine yönleniyor; ilan listede yok | **kapatma adayı** (doğrulanmalı) |
| Guess Europe — IT Intern (`a0de0769`) | Workable | yapısal veri: İstanbul, Turkey; uzaktan işareti **yok** | bizde "Uzaktan" — **elle kontrol** |

## Notlar

- **Kapanma kararı bu göçte yok.** Kapanmayı ilan bağlantı kontrolü ya da yönetici kendi
  kanıt kaydıyla yapmalı. Bu iki ilan uzaktan olduğu için bugün JobPosting taşımıyor;
  Google'a yanlış iş ilanı verisi gitmiyor.
- **Neden damga gerekiyor:** JobPosting, toplama hattından gelen ilanda başvuru
  ülkelerini ancak doğrulama damgası varsa kullanmalı. Damganın anlamı, birinin kaynağı
  açıp kanıtı kaydetmiş olması. Damgayı okuyan kod ayrı bir PR'da gelecek; o PR'ın
  derlemesi bu göçün sütunlarına ihtiyaç duyuyor.
- **İçe aktarıcı mevcut ilanın alanlarını yeniden yazmıyor:** `automation/promote.py`
  var olan ilana yalnız bağlanıyor. Bu yüzden düzeltmeler bir sonraki taramada
  silinmez.
- **İleride:** birçok kariyer sistemi (join.com, Ashby, gethirex) `applicantLocationRequirements`
  bilgisini kendi yapısal verisinde veriyor. İçe aktarıcı bu alanı okuyup kanıtıyla
  damgasız yazabilir; yönetici onaylayınca damga atılır.
