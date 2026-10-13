# SEO geliştirme — ikinci aşama (13 Ekim 2026)

Hedef sorgular: "staj ilanı", "staj ilanları", "stajyer ilanları",
"güncel staj ilanları". Bütün ölçümler canlı siteden ve üretim veritabanından
**salt okuma** ile yapıldı. Search Console erişimi yok; aşağıda "ölçüldü"
denmeyen her şey öneridir.

## 1. Mevcut durum (canlı, 13 Ekim)

| Sayfa | Başlık | H1 | Yapısal veri | İlan bağlantısı (ilk HTML) |
|---|---|---|---|---|
| `/` | StajımVar — Şirketlerin staj ilanları, tek listede | Staj aramaya buradan başla. | Organization, WebSite | 12 |
| `/staj-ilanlari` | Güncel Staj İlanları 2026 \| StajımVar | Güncel Staj İlanları | BreadcrumbList | 12 + sayfalı listeye bağlantı |
| `/staj-ilanlari/sayfa/1..6` | Tüm staj ilanları — sayfa n/6 | Tüm staj ilanları | BreadcrumbList | 30'ar |
| `/ilan/<adres>` | ilan başlığı + şehir + şirket | ilan başlığı | JobPosting + BreadcrumbList | 0 öbür ilan |

- `robots.txt`: `Allow: /`, `Disallow: /yonetim/`, `Sitemap: https://stajimvar.com/sitemap.xml`.
- `sitemap.xml` iki alt haritanın dizini. İlan haritası canlı: 176 adres; veritabanındaki
  açık ve süresi geçmemiş ilan sayısı da 176. Sayfa haritasında 171 adres var.
- Her sayfa canonical olarak kendi adresini gösteriyor. `noindex` yalnız ince şirket
  sayfalarında (3'ten az ilanı olanlar) ve bilerek konuldu.
- JobPosting: zorunlu alanlar tam. `employmentType: INTERN`, `directApply` ve
  `hiringOrganization.logo/sameAs` var. schema.org doğrulayıcısı 0 hata, 0 uyarı verdi.
  Google'ın gereksinim sayfası en son 2026-09-08'de güncellendi; kurallar aşağıda 4. bölümde.

## 2. Rakip yapısı (ilk sayfa, 13 Ekim)

| Site | Başlık | Liste sayfasında yapısal veri |
|---|---|---|
| Youthall | "Internship Openings 2026 – Apply for Free" (TR: /tr/is-ilanlari/stajyer/) | CollectionPage, BreadcrumbList, FAQPage |
| Kariyer.net | "Stajyer İş İlanları - Güncel Stajyer İş Fırsatları" | (bot erişimi 403) |
| Indeed TR | "Staj İş İlanı" | (403) |
| Kariyer Lobisi | "İş ve Staj İlanları 2026 \| Güncel Maaş Bilgileri ve Başvurular" | ItemList (10), WebSite+SearchAction |
| Stajyerim | "İlanlar - Stajyerim" | CollectionPage |

Çıkarımlar:

- Rakiplerin hepsi tek bir **liste sayfasını** sorgunun hedefi yapıyor: "stajyer ilanları"
  için Kariyer.net, "staj ilanları 2026" için Youthall.
- Google'a göre liste sayfasına JobPosting konmaz ("A list page should not include
  structured data"). Bizde de konmuyor; doğru.
- FAQPage zengin sonucu 2023'ten beri yalnız devlet ve sağlık sitelerinde gösteriliyor.
  ItemList ise iş ilanları için bir zengin sonuç üretmiyor. İkisinin de getirisi düşük;
  eklenmedi.
- Bizim ayırt edici farkımız ilanları şirketin kendi kariyer sayfasından almak ve
  kapanan ilanı listeden düşürmek. Bunun anlatımı hub'da var ama başlıkta yok.

## 3. Bu PR'da düzeltilenler (kanıtlı sorunlar)

1. **İlan sayfası çıkmaz sokaktı.** İlan sayfası öbür ilanlara yalnız `/staj-ilanlari`
   üzerinden bağlanıyordu ve o sayfa yalnız en yeni 12 ilanı gösteriyor.
   Artık her ilan sayfası en fazla **6 benzer açık ilana** gerçek `<a href>` veriyor.
   Sıra: aynı şirketin öbür ilanları, sonra aynı şehirdeki ilanlar, sonra en yeni ilanlar.
   Süresi geçmiş ilan ve ilanın kendisi listeye girmiyor.
   - Kenar çiziminde bu adaylar ayrı ve zorunlu olmayan bir sorguyla geliyor; sorgu
     düşerse bölüm çizilmez, sayfa yine 200 döner. Ön render da aynı seçimi kullanıyor.
   - Beklenen fayda: tarayıcı ilandan ilana ilerleyebilir; eski ilanlar sayfalama
     zincirine ve site haritasına bağlı kalmaz; ilanı okuyan kişi alternatif görür.
2. **Sayfalı listede derinlik.** Her sayfa yalnız önceki ve sonraki sayfaya bağlıydı;
   son sayfa hub'dan 7 tık derindeydi. Artık numaralı sayfa bağlantıları var
   (10 sayfaya kadar hepsi, daha uzunsa ilk/son/komşular). Ön render ve React aynı
   yardımcıyı kullanıyor. Beklenen fayda: her ilan en fazla 3 tık derinde.
3. **React ilan sayfasında şirket adı bir düğmeydi.** JavaScript çalıştıktan sonra
   şirket sayfasına taranabilir bir bağlantı kalmıyordu. Artık gerçek bir `<a href>`;
   düz tıklama yine uygulama içinde gezinir.
4. **Mobil ilan ve fırsat kartları ekran kenarında kesik görünüyordu.** Kart listesi
   telefonda `YUZEY.kap` (`-mx-4`) ile ekranın iki kenarına yaslanıyordu; onaylanmış
   kart tasarımı ise telefonda da yuvarlak köşeli ve kenarlıklı. İkisi birleşince
   köşeler ve yan çizgiler ekran kenarında kesik görünüyordu. Sayfa gerçekte
   kaymıyordu: 360 ve 375 px genişlikte 9 sayfada `scrollWidth` = ekran genişliği.
   **Kart tasarımı değişmedi.** Yalnız ilan ve fırsat listelerinin kabı artık sayfanın
   16 px yan boşluğunda (kart 16–359 px). Böylece çerçeve tam görünüyor ve liste üstteki
   şirket şeridiyle hizalı. Kart genişlediği için "İlanı incele" düğmesi alta iniyor ve
   konum tek satıra sığıyor. Bu kararla çelişen iki eski test güncellendi.

## 4. Google indeksleme

### Kontrol (13 Ekim)

- `robots.txt`, site haritası ve canonical yapısı doğru: hepsi 200, her sayfa kendi
  adresini gösteriyor, haritadaki ilan sayısı veritabanıyla birebir aynı.
- Kapanan ilan 404 + `noindex` + `no-store` dönüyor ve haritadan düşüyor; Google'ın
  "süresi dolan ilanı kaldır" kuralıyla uyumlu.
- Uzaktan ilan için Google `jobLocationType: TELECOMMUTE` ile birlikte
  `applicantLocationRequirements` (en az bir ülke) istiyor. Bu bilgi kaynakta yoksa
  JobPosting yazmıyoruz (5. bölüm).

### Indexing API — değerlendirme

| | |
|---|---|
| Uygun mu? | Evet. API yalnız JobPosting (ve VideoObject içindeki BroadcastEvent) sayfaları için; bizim ilan sayfalarımız tam bu tür. |
| Ne kazandırır? | Yeni ilan ve kapanış bildiriminde Google taramayı hızlandırır. Google bunu kısa ömürlü içerik için site haritasına tercih ediyor; harita yine kalmalı. |
| Kota | Varsayılan günde 200 bildirim (URL_UPDATED + URL_DELETED), Google Cloud projesi başına. Ölçülen hızımız: son 30 günde günde ortalama 1,2 yeni ve 2,2 kapanan ilan; en yoğun gün 63 kapanış. Kota rahatça yetiyor. Artırım için başvuru formu var. |
| Yetki | (1) Google Cloud projesi, (2) Indexing API'nin açılması, (3) bir servis hesabı, (4) bu servis hesabının Search Console'da stajimvar.com mülküne **Sahip** olarak eklenmesi. 3 ve 4 hesap sahibinin işi; Claude'un erişimi yok. |
| Risk | Kotayı aşmak için birden çok hesap kullanmak erişimin kesilmesine yol açar. Bildirimler spam denetiminden geçer. |
| Öneri | Servis hesabı hazır olunca, `ilan-bildirim-kuyrugu` gibi saatlik bir işle yalnız **yeni yayımlanan** (URL_UPDATED) ve **kapanan** (URL_DELETED) ilanları bildirmek. Anahtar `production` ortamına sır olarak konur. Kod bu PR'da yazılmadı: anahtar olmadan sınanamaz. |

## 5. Eksik 21 JobPosting — analiz

Kaynak: canlı `/_onrender/ilan-veri-eksikleri.json` ve ilan metinleri (salt okuma).

| Durum | Adet | Gerçek veriyle tamamlanabilir mi? |
|---|---|---|
| Uzaktan, başvuru coğrafyası yok | 16 | **1'i evet.** WongDoody'nin kaynak konum metni "Berlin, DE \| Germany (REMOTE)": başvuru coğrafyası Almanya. Kalan 15'in metninde başvurulabilecek ülkeyi söyleyen ifade yok; ilanın ülke kodu başvuru şartı sayılmaz, uydurulmadı. |
| Şehir var, ülke kodu yok | 3 | Ogulsize ×2 ("İstanbul") **işverenin StajımVar'da kendi açtığı** ilanlar; Hiroba Games ("Çankaya") içe aktarılmış. Ülke şehirden çıkarılmadı. |
| Konum hiç yok | 2 | Novartis: ilan metni "yer olarak yalnızca Türkiye belirtiliyor" diyor, yani ülke TR kaynaktan biliniyor ama şehir yok. Luron AI: kaynakta konum yok. |

### Sistematik bulgu: işveren ilanlarında ülke hiç yazılmıyor

`src/lib/ilan-formu.mjs` şehri (`city`) yazıyor, `country_code`u yazmıyor. Şehir alanı
serbest metin (Türkiye illeri yalnız öneri). Üstelik işverenin `listings` tablosunda
`country_code`a INSERT/UPDATE yetkisi yok (ölçüldü: yetkili sütunlar içinde yok).
Sonuç: **işverenin StajımVar'da açtığı her ilan JobPosting'siz kalıyor**. Bunlar,
doğrudan başvuru alan (`directApply: true`) ve Google için en değerli ilanlar.

Önerilen düzeltme (ayrı bir PR, onayınızla):

1. Göç: `authenticated` rolüne `listings.country_code` için INSERT/UPDATE yetkisi;
   ISO-3166 alfa-2 kısıtı (`^[A-Z]{2}$`).
2. Form: "Ülke" alanı, varsayılan **Türkiye**, değiştirilebilir. Şehirden çıkarım yok;
   değer işverenin seçimi.
3. Sunucu tarafı ilan kontrolü: fiziksel ya da hibrit ilanda ülke zorunlu.
4. Mevcut 2 Ogulsize ilanı için işverenden onay ya da form üzerinden düzeltme
   (üretim verisi elle değiştirilmez).

### Uzaktan ilanlar için veri modeli ve arayüz önerisi

```sql
-- ÖNERİ (uygulanmadı)
alter table public.listings
  add column basvuru_ulkeleri text[]           -- ISO alfa-2, ör. {DE} ya da {TR,DE}
    check (basvuru_ulkeleri is null or basvuru_ulkeleri <@ array(select ...)::text[]),
  add column basvuru_ulkeleri_kaynak text,     -- kaynaktaki ifade, ör. "Germany (REMOTE)"
  add column basvuru_ulkeleri_verified_at timestamptz;
```

- **Doğrulama damgası şart.** Proje kuralı burada da geçerli: yalnız
  `*_verified_at` dolu olan değer kullanılır; dolu bir dizi tek başına doğrulanmış
  sayılmaz.
- **İçe aktarıcı:** kaynak konum ya da metinde "<Ülke> (REMOTE)", "remote within <ülke>",
  "<ülke>'de ikamet" gibi açık bir ifade varsa ülkeyi ve ifadenin kendisini yazar,
  damgayı boş bırakır. Yönetici onayıyla damga atılır.
- **Yönetim arayüzü:** uzaktan ilan düzenleme ekranına "Başvurulabilen ülkeler"
  çoklu seçimi ve kaynak ifadesinin gösterimi; "Doğrula" düğmesi damgayı atar.
- **İşveren formu:** uzaktan seçildiğinde "Hangi ülkelerden başvurulabilir?"
  (zorunlu, varsayılan Türkiye). Bu ifade ilan açıklamasına da otomatik yazılır,
  çünkü Google açıklamada da görmek istiyor.
- **JobPosting:** damgalı değer varsa `jobLocationType: "TELECOMMUTE"` ve her ülke
  için `applicantLocationRequirements: {"@type": "Country", "name": "<kod>"}`.

## 6. www yönlendirmesi — tek panel işlemi

**Ölçüldü (13 Ekim):**
`https://www.stajimvar.com/staj-ilanlari?x=1` → 301 → `https://stajimvar.com` (yol ve
sorgu kayboluyor). Yanıtı Cloudflare kenarı veriyor (`Server: cloudflare`); Pages ara
katmanının başlıkları yok, yani istek koda hiç ulaşmıyor. Cloudflare alan ayarlarına
erişimim yok.

**Mevcut kuralı değiştirmeden çözüm:** Cloudflare'de **Single Redirect** (Rules →
Redirect Rules) kuralları, eski Page Rules yönlendirmelerinden ve Bulk Redirect'lerden
**önce** çalışır; ilk eşleşen yönlendirme uygulanır. Bu yüzden yeni bir kural
eklemek yeterli; eskisi yerinde kalabilir.

> **Tek panel işlemi:** Cloudflare → stajimvar.com → Rules → Redirect Rules →
> *Create rule*
> - Ad: `www → apex (yol + sorgu korunur)`
> - When incoming requests match: *Custom filter expression* →
>   `(http.host eq "www.stajimvar.com")`
> - Then: *Dynamic* → Expression: `concat("https://stajimvar.com", http.request.uri.path)`
> - Status code: `301`, **Preserve query string: açık**
> - Deploy. Listede başka bir www yönlendirme kuralı varsa yenisini **en üste** taşıyın.

**Doğrulama:**

```
curl -sI "https://www.stajimvar.com/staj-ilanlari?x=1" | grep -i location
# beklenen: location: https://stajimvar.com/staj-ilanlari?x=1
curl -sI "http://www.stajimvar.com/rehber/staj-nasil-bulunur?utm_source=t" | grep -i location
# beklenen: tek 301 ile https://stajimvar.com/rehber/staj-nasil-bulunur?utm_source=t
curl -sI "https://www.stajimvar.com/" | grep -i location
# beklenen: location: https://stajimvar.com/
```

## 7. main dalı koruması (ruleset)

Daha önce `main`de klasik koruma da ruleset de yoktu. Bu PR'la birlikte
`docs/seo/main-ruleset.json` hazırlandı ve GitHub'a **devre dışı** (`disabled`) olarak
kaydedildi (ruleset 24977099). Şema GitHub tarafından doğrulandı; şu an `main`e
uygulanan kural sayısı 0.

İçerik:

- Dal silme ve force push engelli.
- PR zorunlu, gerekli onay sayısı 0: tek geliştirici kendi PR'ını onaylayamaz,
  akış bozulmasın.
- Zorunlu kontroller: `dogrulama` ve `guvenlik_regresyonu` (GitHub Actions). "Up to date"
  zorunluluğu yok.
- Kimse muaf değil (yönetici dahil).

Akışlara etkisi: hiçbir iş akışı `main`e doğrudan push etmiyor (ölçüldü); birleştirmeler
zaten PR ile ve bu iki kontrol yeşilken yapılıyor. Etkinleştirmek için tek komut yeter:

```
gh api -X PUT repos/stajimvar/stajimvar.com/rulesets/24977099 -f enforcement=active
```

## 8. Önerilen ama uygulanmayanlar (veri ya da karar gerekiyor)

1. **Başlık stratejisi (Search Console verisiyle):** `/staj-ilanlari` merkezi
   14 Eylül'de açıldı, görünürlük düşüşünden bir gün önce. Ana sayfa ile aynı
   sorguyu ("staj ilanları") paylaşıyor olabilirler. Bu bir hipotez, kanıt yok.
   - Önce Search Console'da "staj ilanları" sorgusu için hangi adresin gösterim
     aldığına bakılmalı.
   - Merkez sayfa öne çıkıyorsa başlığı şöyle olabilir:
     "Staj İlanları 2026: Güncel Stajyer İlanları | StajımVar".
     Bu başlık "stajyer ilanları"nı ekliyor ve kelimeyi tekrar etmiyor.
   - Değişiklik tek seferde yapılmalı; sık başlık değişimi 15 Eylül araştırmasında
     olası nedenler arasındaydı.
2. **Ana sayfa H1'i** ("Staj aramaya buradan başla.") konuyu söylemiyor. Yukarıdaki
   kararla birlikte ele alınmalı, tek başına değiştirilmemeli.
3. **Şehir sayfaları** (ör. "İstanbul staj ilanları"): bugün 93 Türkiye ilanının çoğu
   İstanbul'da. Ayrı şehir sayfaları ince ve kopya içerik riski taşıyor. İlan sayısı
   şehir başına anlamlı bir eşiği geçince yeniden değerlendirilmeli.
