# StajımVar Global İlan ve Dil Tercihleri Tasarımı

## Amaç ve kapsam

StajımVar'ı mevcut ilan, profil, detay ve başvuru akışlarını yeniden yazmadan global kullanıma hazırlamak. Kullanıcının bulunduğu ülke, gezindiği ilan ülkesi, kalıcı iş ülkesi tercihleri, arayüz dili ve içerik dili bağımsız durumlardır. Bu aşamada ücretli çeviri servisi veya otomatik çeviri eklenmez.

Üretim verisi tahminle tamamlanmaz. Ülke, dil, uluslararası başvuru ve vize sponsorluğu bilinmiyorsa veritabanında `NULL` kalır. Arayüz sahte ülke, ilan veya sayaç göstermez.

## Mevcut yapı ve değişiklik sınırı

- Uygulama React 18, Vite, TypeScript, Supabase ve Cloudflare Pages/Pages Functions kullanır.
- `public.listings.city` ve `public.listings.work_type` zaten vardır; yeniden oluşturulmaz ve anlamları değiştirilmez.
- İlanlar `src/lib/queries/index.ts` üzerinden okunur ve `src/lib/queries/mappers.ts` tek snake_case/camelCase sınırıdır.
- Mevcut “Yurtdışı / Global” görünümü `category`, başlık ve Berlin/Almanya metin sezgilerine dayanır. Bu sezgiler kaldırılarak gerçek `country_code` filtresine geçilir.
- `/ilan/:id` detay rotası, başvuru yöntemleri, kayıtlı ilanlar ve mevcut RLS politikaları korunur.
- Bu çalışma `552966b` tabanlı `codex/global-hazirlik` branch'indedir. Etkinlik-yolu commitleri ve dosyaları kapsam dışıdır.

## Veri modeli

### Hesap ve öğrenci tercihleri

Hesap genelindeki alanlar `public.profiles` tablosuna eklenir:

- `interface_language text null`: ISO 639-1 küçük harf kodu (`tr`, `en`, `fr`, `de`).
- `content_language text null`: ISO 639-1 küçük harf kodu.
- `home_country text null`: ISO 3166-1 alpha-2 büyük harf kodu (`TR`, `FR`, `US`, `DE`).

İş arama tercihi yalnız öğrenci profiline eklenir:

- `public.student_profiles.preferred_job_countries text[] not null default '{}'`: sıralı, benzersiz ISO alpha-2 kodları. İlk eleman varsayılan keşif ülkesidir.

Veritabanı kısıtları yalnız biçimi doğrular. İki harfli her dizenin gerçek ISO kodu olduğunu varsaymak yerine uygulama ortak izinli ISO dizinini kullanır. Mevcut kendi-profilini-güncelle RLS sınırı korunur; rol veya başka kullanıcı tercihleri yazılamaz. Kolon bazlı istemci yetkileri yeni alanları açıkça kapsayacak şekilde genişletilir.

### İlan alanları

`public.listings` tablosuna yalnız eksik alanlar eklenir:

- `country_code text null`: ISO 3166-1 alpha-2.
- `original_language text null`: ISO 639-1.
- `international_applicants boolean null`.
- `visa_sponsorship boolean null`.

`city` ve `work_type` korunur; ikinci bir `city` veya `work_mode` kolonu oluşturulmaz. Boolean alanlarda `NULL` “kaynakta bilinmiyor”, `false` “kaynak açıkça hayır diyor” anlamındadır.

Yayınlanmış ilan ülke sorgusu için kısmi indeks eklenir:

```sql
create index ... on public.listings(country_code, posted_at desc, id)
where status = 'published';
```

Remote sorgusu mevcut `work_type = 'Remote'` değerini kullanır. `country_code is null` Remote sayılmaz.

## Güvenli ülke normalizasyonu ve backfill

Importer ve tek seferlik backfill aynı saf ülke çıkarım sözleşmesini kullanır. Girdi; yapılandırılmış ülke alanı, yapılandırılmış şehir/lokasyon alanı ve kaynağın güvenilir lokasyon metnidir. Başlık tek başına kanıt değildir.

Kurallar:

1. Geçerli yapılandırılmış ISO alpha-2 ülke kodu varsa normalize edilerek kullanılır.
2. Türkiye il/ilçe sözlüğü veya açık Türkiye lokasyon ifadesi varsa `TR` kullanılır.
3. Berlin, Paris gibi sözlükte tek ülkeye bağlanan açık şehir/lokasyon sinyali varsa ilgili kod kullanılır.
4. Aynı kayıtta çelişen güçlü sinyaller varsa sonuç `NULL` olur ve inceleme için raporlanır.
5. `Remote`, `Global`, `Worldwide`, boş veya belirsiz lokasyon `NULL` üretir.
6. Başlıkta geçen ülke/şehir, “international/global” kelimesi veya kategori tek başına ülke atamaz.

Backfill yalnız `country_code is null` satırlarda çalışır ve önce rapor/dry-run üretir. Güncellenecek satırlar gerekçe sınıfıyla sayılır; belirsizler değiştirilmez. Importer aynı normalizasyon modülünü kullanarak yeni kayıtların davranışını backfill ile tutarlı tutar.

## Tercih çözümleme

Ülke seçimi tek, saf ve test edilebilir çözücüden çıkar:

1. URL'deki geçerli manuel `country` değeri.
2. Tarayıcıda daha önce kaydedilmiş geçerli seçim.
3. Giriş yapan öğrencinin sıralı `preferred_job_countries` dizisinin ilk elemanı.
4. Tarayıcı locale değerindeki açık bölge (`fr-FR` → `FR`).
5. Cloudflare ülke tahmini.
6. Hiçbiri yoksa güvenli ürün varsayılanı `TR`.

Özel URL değerleri `all` ve `remote` olarak kabul edilir. Geçersiz değer başka bir ülkeye sessizce çevrilmez; çözücü geçerli sıradaki kaynağa döner ve URL kanonik değerle düzeltilir.

Ülke seçicide gezinmek profil tercihlerini güncellemez. Seçim URL'ye yazılır; misafir ve giriş yapan kullanıcı için tarayıcıda saklanır. Kalıcı çoklu tercihler yalnız profil/onboarding kaydetme eylemiyle değiştirilir. Böylece daha önce elle seçilmiş Fransa, sonraki ziyarette hesap, locale veya IP tarafından ezilmez.

Arayüz dili bağımsız çözülür: geçerli manuel dil → `profiles.interface_language` → `navigator.language` → `tr`. İçerik dili de kendi manuel/hesap değerinden çözülür. Ülke çözümü dili değiştirmez; `country=FR` ile Türkçe arayüz desteklenir.

## Cloudflare ziyaretçi bağlamı

Yeni bir GET Pages Function yalnız `{ countryCode: 'FR' | null }` döndürür. Değer `request.cf.country` içindeki geçerli ISO alpha-2 kodundan alınır. IP adresi okunmaz, saklanmaz, log gövdesine konmaz ve Supabase'e yazılmaz. Yanıt kısa süreli genel cache'e uygun olabilir; hata halinde istemci `null` kabul ederek diğer önceliklerle devam eder.

Cloudflare tahmini yalnız en düşük öncelikli ilk varsayımdır. URL, tarayıcı veya hesap tercihine yazma yetkisi yoktur.

## İlan sorgusu ve ülke facet'leri

Tüm global katalog için sunucu taraflı, keyset sayfalı bir ilan sorgu sınırı oluşturulur veya mevcut sorgu bu yönde genişletilir. Filtre sözleşmesi:

- ISO kodu: `status='published' and country_code=:code`
- `all`: tüm yayınlanmış ilanlar
- `remote`: yalnız `status='published' and work_type='Remote'`

Facet ülkeleri yalnız mevcut aktif/yayınlanmış ilanların dolu `country_code` değerlerinden ve gerçek sayılarından üretilir. Ülke filtresi facet hesabını daraltmaz; kullanıcı diğer mevcut ülkeleri seçmeye devam edebilir. Sabit ülke veya sayaç eklenmez.

Mevcut ilan detay sorgusu ID üzerinden çalışmaya devam eder. Liste filtresi detay ve başvuru yetkilerini değiştirmez. İlk sürümde mevcut veri hacmi için uyumlu istemci kullanılabilir, fakat sorgu sözleşmesi ve indeks yüz binlerce kayıtta tüm satırları tarayıcıya indirmeye ihtiyaç bırakmayacak şekilde sunucu sayfalamasını hedefler.

## Arayüz ve URL davranışı

İlan ekranındaki metin tabanlı “Yurtdışı / Global” sekmesi kaldırılır. Yerine erişilebilir ülke seçici gelir:

- mevcut seçim her zaman görünür,
- Türkiye yalnız aktif ilanı varsa veya mevcut seçimse görünür,
- diğer ülkeler aktif facet verisinden gelir,
- “Tüm ülkeler” ve “Remote” filtre davranışlarıdır, ülke değildir.

Seçim `?country=FR`, `?country=all` veya `?country=remote` olarak mevcut `?q=` parametresiyle birlikte korunur. `replaceState` seçim durumunu kanonikleştirir; kullanıcı eylemi geçmiş/geri tuşu davranışını bozmaz. Sayfa yenileme ve paylaşılan URL aynı sonucu verir.

375 piksel mobil görünümde seçici tam dokunma hedefi taşır ve yatay taşma üretmez. Sonuç yoksa seçili ülkeye ait aktif ilan bulunmadığını söyler; başka ülkeden ilan karıştırmaz.

## Profil ve onboarding

Mevcut onboarding zorunlu alanları ve tamamlanma mantığı değiştirilmez. Uygun mevcut profil/tercih bölümüne iki isteğe bağlı kontrol eklenir:

- arayüz dili (tekli),
- staj aranan ülkeler (sıralı çoklu).

Profil ülke seçimi ISO ülke dizininden gelir; aktif ilan sayısı varmış gibi göstermez. İlk seçilen ülke varsayılan keşif ülkesidir. Kaydetme mevcut profil güncelleme sınırından geçer ve yalnız oturum sahibinin satırını değiştirir.

## Çeviri için genişleme noktası

Bu aşamada çeviri tablosu, AI çağrısı veya yeni servis eklenmez. `original_language`, değişmez kaynak içeriğinin dilini korur. İleride eklenecek cache sözleşmesi `(listing_id, target_language, source_content_hash)` anahtarıyla “orijinal → hedef dil → cache → Orijinali göster” akışına bağlanabilir. Mevcut `source_title`, kaynak başlığını korumaya devam eder.

## Hata ve doğruluk davranışı

- Ziyaretçi bağlamı alınamazsa ilan listesi hata vermez; sıradaki tercih kaynağı kullanılır.
- Profil tercihi alınamazsa tarayıcı seçimi silinmez.
- Katalog isteği hata verirse gerçek hata durumu gösterilir; boş liste gibi sunulmaz.
- Geçersiz ISO/dil değerleri kaydedilmez.
- Bilinmeyen ülke, dil, vize ve uluslararası başvuru değerleri uydurulmaz.
- RLS, kolon izinleri ve mevcut başvuru güvenlik testleri geriye dönük çalışır.

## Doğrulama

Otomatik testler en az şu davranışları kapsar:

- TR Cloudflare ziyaretçisi → başka tercih yoksa TR.
- FR Cloudflare ziyaretçisi → başka tercih yoksa FR.
- FR konumu + kayıtlı TR hesap tercihi → TR.
- Kayıtlı tarayıcı FR seçimi + hesap TR + locale/IP başka ülke → FR.
- `country=FR` + `interface_language=tr` birlikte çalışır.
- Manuel seçim yenileme ve geri/ileri gezinmede korunur.
- `all` bütün yayınlanmış ülkeleri; `remote` yalnız `work_type='Remote'` ilanlarını getirir.
- `country_code=NULL` ilan Remote değilse `remote` sonucuna girmez.
- Facet yalnız aktif ilan bulunan ülkeleri ve gerçek sayıları döndürür.
- Backfill güçlü TR/yabancı şehir sinyalini işler; Remote/Global/çelişkili/zayıf başlık sinyalini `NULL` bırakır.
- İki kullanıcı birbirinin profil tercihlerini okuyamaz/yazamaz; yetki yükseltme olmaz.
- 375 px mobil ve masaüstünde taşma/yerleşim regresyonu yoktur.
- Mevcut ilan detay, kaydetme ve başvuru akışları çalışır.
- Node testleri, SQL güvenlik testleri, lint, typecheck/build ve Playwright matrisi geçer.

Üretim migration veya deployment bu tasarım onayının parçası değildir; ayrıca açıkça istenmeden canlıya uygulanmaz.
