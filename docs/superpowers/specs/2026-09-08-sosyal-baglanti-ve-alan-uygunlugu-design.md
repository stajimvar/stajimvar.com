# Sosyal katman C aşaması — bağlantı akışı ve zorunlu bölüm–alan uygunluğu

Tarih: 2026-09-08
Durum: TASARIM — onay bekliyor, kod yazılmadı
Önceki aşamalar: A (veri modeli + RLS), B (profil kurulumu + görünürlük),
güvenlik düzeltmeleri (`20260922010000_sosyal_guvenlik_duzeltmeleri.sql`)

---

## 1. Depoda ölçülen mevcut durum

Bu bölümdeki her satır, tasarımdan önce yapılan salt-okunur incelemede
kaynaktan okundu. Canlı veritabanına bağlanılmadı; mevcut kullanıcıların
gerçek bölüm değerleri İNCELENMEDİ ve hiçbirine bölüm/alan atanmadı.

### 1.1 `/bolumler` verisinin gerçek kaynağı

`src/data/bolumler.ts` — 4199 satır, **42 bölüm kaydı**, tamamı istemci
tarafında TypeScript verisi. Veritabanında karşılığı yok.

```ts
export interface Bolum {
  slug: string;          // 'elektrik-elektronik-muhendisligi'
  ad: string;            // 'Elektrik-Elektronik Mühendisliği'
  grup: BolumGrubu;      // 'muhendislik' | 'myo' | 'sosyal' | 'tasarim' | 'saglik' | 'hizmet'
  ozet: string;
  ...
}
```

Grup dağılımı: mühendislik 14, sosyal 9, MYO 7, sağlık 5, tasarım 5,
hizmet 2.

**Sonuç: bölüm verisi KONTROLLÜ kimliklere sahip.** `slug` alanı kalıcı
bir anahtar ve `/bolumler/<slug>` adreslerinde zaten kullanılıyor. Yani
kontrollü bir bölüm listesi sıfırdan uydurulmayacak; depoda var olan
gerçek liste veritabanına taşınacak.

### 1.2 `student_profiles.department` SERBEST METİN

```sql
department  text,          -- 0001_initial_schema.sql:96
```

Kısıt yok, referans yok, normalize yok. Öğrencinin yazdığı ne ise o.
**Bu alan bölüm–alan eşlemesi için kullanılamaz** ve C aşamasında
kaynak olarak alınmayacak. Mevcut kayıtların içeriği okunmadı; okunsa
bile serbest metin olduğu için güvenilir bir eşleşme üretmez.

`listings.department` de var (0001:210) ve daha önce ölçülmüş: yayındaki
62 ilanın 62'sinde boş.

### 1.3 Zaten var olan ve KARIŞTIRILMAMASI gereken "alan" kavramı

`src/lib/bolum-eslestirme.mjs` içinde:

- `ALANLAR` — **10 öğeli** bir liste (`yazilim`, `muhendislik`,
  `pazarlama`, `finans`, `insan-kaynaklari`, `lojistik`, `satis`,
  `uretim-kalite`, `hukuk`, `tasarim`).
- `BOLUM_ALANI` — 42 bölümün 36'sını bu 10 alana bağlayan bir eşleme
  (sağlık bölümleri bilerek dışarıda).

Bu yapı **ilan sınıflandırması** için var: ilanın alanı BAŞLIKTAN tahmin
ediliyor ve dosyanın kendi yorumu bunun bir TAHMİN olduğunu söylüyor.

Sosyal katmanın `sectors` tablosu ise **15 öğeli** ayrı bir kapalı liste
(`tekstil-moda-hazir-giyim`, `bilisim-yazilim`, …) ve bir GÖRÜNÜRLÜK
SINIRI.

> **Karar: iki taksonomi birleştirilmeyecek.** `BOLUM_ALANI`
> bölüm→sektör eşlemesi olarak KULLANILMAYACAK. Hedef sözlükleri farklı
> (10'a karşı 15), amaçları farklı (arama daraltma / erişim sınırı) ve
> biri açıkça tahmin. Birini ötekine bağlamak, bir arama kolaylığını
> sessizce bir yetki kuralına dönüştürürdü.

### 1.4 `category_pool` bölüm–alan eşlemesi DEĞİL

```sql
create table public.category_pool (
  id uuid primary key,
  sector_id uuid not null references sectors(id),
  bolum text,          -- serbest metin, "boşsa sektörün tamamına önerilir"
  etiket text not null,
  sira integer
);
```

Bu tablo profil **kategori/etiket önerileri** için. `bolum` kolonu
serbest metin ve tablo bugün BOŞ. Eşleme tablosu olarak kullanılması
yanlış olur: satırları öneri, kimliği etiket, ilişkisi çoktan-çoğa.
**Dokunulmayacak.**

### 1.5 `sector_requests` bugünkü hâli

```sql
create table public.sector_requests (
  id uuid primary key,
  user_id uuid not null references profiles(id),
  requested_sector text not null check (length(btrim(...)) between 2 and 80),
  aciklama text,
  status text not null default 'bekliyor'
    check (status in ('bekliyor','incelendi','reddedildi','eklendi')),
  ...
);
```

Kullanıcının **kendi yazdığı bir ALAN adını** taşıyor. RLS'i var, tekil
açık talep indeksi var, yönetici UPDATE politikası var. Arayüzde hiçbir
yerden açılmıyor (B aşamasında bilerek çizilmedi: talebi değerlendirecek
yönetim ekranı yok).

### 1.6 Sosyal kurulum akışının bugünkü hâli

`SosyalProfilKurulum.tsx` → `sosyalProfilKur()` → `social_profiles`
üzerine `upsert`. İstemci gövdesinde `sector_id` VAR ve doğrudan
gönderiliyor. `sektor_kilidi()` tetikleyicisi yalnız değişimi engelliyor;
**ilk yazımda hangi sektörün geldiğine bakan hiçbir kural yok.**

C aşamasının en temel değişikliği burada: alan artık istemciden gelmeyecek.

---

## 2. Ürün kuralları (onaylanan)

1. Kullanıcı alanı serbestçe seçemez.
2. Öğrenci kontrollü listeden **bölümünü** seçer; alan sistemin onaylı
   bölüm–alan eşlemesinden **sunucuda** türetilir.
3. Elektrik Mühendisliği öğrencisi Tekstil alanına katılamaz.
4. İstemci `sector_id` gönderemez; gönderse de yok sayılır — teknik
   olarak yazma yetkisi bulunmaz.
5. Eşlemesi olmayan bölüm hiçbir topluluğa alınmaz; talep açılabilir,
   yönetim onaylamadan erişim yok.
6. Bölüm bilgisi bu sürümde **beyan**. "Doğrulanmış öğrenci" rozeti,
   ibaresi ya da ima eden hiçbir metin çizilmez.
7. Topluluğa katılmayan öğrenci yalnız kendi profilini hazırlar.
8. Takip modeli yok; yalnız karşılıklı bağlantı ve tek "Bağlantı" sayacı.
9. Paylaşım varsayılanı "Bağlantılarım"; paylaşım bazında "Alan
   topluluğum" seçilebilir. Farklı alan iki durumda da göremez.
10. Mesaj, yorum, bildirim merkezi, şikâyet ekranı ve paylaşım oluşturma
    C'de AÇILMAZ.

---

## 3. Veri modeli

### 3.1 `public.departments` — kontrollü bölüm kataloğu

```sql
create table public.departments (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  ad     text not null,
  grup   text not null check (grup in
           ('muhendislik','myo','sosyal','tasarim','saglik','hizmet')),
  sira   integer not null default 0,
  aktif  boolean not null default true,
  created_at timestamptz not null default now()
);
```

- `slug` değerleri `src/data/bolumler.ts` ile **birebir aynı** olacak;
  böylece `/bolumler/<slug>` rehber sayfası ile katalog aynı kimliği
  paylaşır ve ileride profilden rehbere bağlantı kurulabilir.
- Seed **üretilecek, elle yazılmayacak**: `scripts/bolum-katalogu.mjs`
  `src/data/bolumler.ts` dosyasını okuyup göç için `insert … on conflict
  (slug) do nothing` bloğunu basar. Bir test iki kaynağın aynı slug
  kümesini taşıdığını ölçer; drift sessizce oluşamaz.
- Katalog 42 bölümle başlar ve **kasten eksiktir**: Türkiye'deki bütün
  bölümleri kapsamaz. Eksikliğin karşılığı §3.5'teki talep akışı.

### 3.2 `public.department_sectors` — onaylı eşleme

```sql
create table public.department_sectors (
  department_id uuid primary key references public.departments(id) on delete cascade,
  sector_id     uuid not null references public.sectors(id) on delete restrict,
  onaylayan     uuid references public.profiles(id),
  onay_notu     text,
  created_at    timestamptz not null default now()
);
```

**`department_id` birincil anahtar: bir bölümün TAM OLARAK BİR alanı var.**
Kural 4'ün ("sunucu alanı türetir") tek anlamlı olması bunu gerektiriyor;
çok alanlı bir bölümde sunucu hangisini seçeceğini bilemezdi.

> **KARAR (onaylandı):** C aşamasında bir bölüm → tam olarak bir alan.
> Birden fazla alan seçimi ve kullanıcıya özel istisna AÇILMAYACAK.
> İleride ihtiyaç çıkarsa yeni bir yönetim kararı ve kendi göçüyle ele
> alınır. Bu yüzden şemada `birincil boolean` gibi bir hazırlık kolonu da
> yok: kullanılmayan bir kolon, kapalı olduğu söylenen kapının aralık
> durduğunu düşündürür.

**TABLO G2'DE BOŞ OLUŞTURULUP AYRI BİR SEED GÖÇÜYLE DOLAR.** Bölüm–alan eşleme listesi bu belgede
üretilmiyor: ne internetten alınıyor ne modelin kendi bilgisinden
yazılıyor. Eşleme, ürün sahibinin vereceği listeyle ayrı bir seed göçünde
dolar. Boş tabloyla C aşaması çalışır durumdadır — sonuç, hiçbir
öğrencinin topluluğa alınmaması ve herkesin dürüst "bölümünün alanı
henüz tanımlı değil" ekranını görmesidir.

### 3.3 `social_profiles` değişiklikleri

```sql
alter table public.social_profiles
  add column if not exists department_id uuid references public.departments(id);

-- Yayımlanmış profilde bölüm de şart:
alter table public.social_profiles
  drop constraint yayin_icin_kimlik_sart,
  add constraint yayin_icin_kimlik_sart
    check (not yayinda_mi or
           (username is not null and sector_id is not null and department_id is not null));
```

**Resmî bölüm adı YALNIZ `departments` ilişkisinden gösterilir.**
`social_profiles → department_id → departments.ad`. Profil başlığındaki
bölüm satırı başka hiçbir kaynaktan beslenmez.

Mevcut `bolum_etiketi` serbest metin alanı **geriye uyumluluk için
kalır** ama rolü daralır:

- Arayüzdeki etiketi **"Eğitim notu"** olur (örn. "çift anadal",
  "yandal: veri bilimi"). "Bölüm" kelimesi bu alanın etiketinde geçmez.
- Bölüm uygunluğu, alan belirleme ve kimlik doğrulama amacıyla
  **kullanılmaz**; hiçbir sorgu, politika ya da RPC onu okumaz.
- Profilde **resmî bölüm adının altında, ikincil satır** olarak ve
  görsel olarak ayrışacak şekilde çizilir; kullanıcı buraya başka bir
  bölüm adı yazarak sistem bölümünü taklit edememelidir. Bu yüzden:
  resmî bölüm satırı her zaman `departments.ad` ile çizilir ve
  `bolum_etiketi` boşken satır hiç görünmez.

Arayüz testi bu ayrımı sabitler: bölüm adı `departments`'tan geliyor,
`bolum_etiketi` "Eğitim notu" etiketiyle çiziliyor, ikisi aynı görsel
ağırlıkta değil.

### 3.4 İstemcinin alanı yazamaması — kolon düzeyi yetki

Politika yetmiyor: `with check (profile_id = auth.uid())` satırın
SAHİBİNİ doğruluyor, hangi kolonu yazdığını değil. Bu yüzden yetki
kolon düzeyinde daraltılıyor:

```sql
revoke insert, update on public.social_profiles from authenticated;

-- Satır AÇMAK yalnız RPC ile; doğrudan INSERT yetkisi verilmiyor.

grant update (gorunen_ad, biyografi, bolum_etiketi, sinif_etiketi,
              sehir, yayinda_mi)
  on public.social_profiles to authenticated;
```

Sonuç: `sector_id`, `department_id` ve `username` istemciden **hiçbir
istekle** yazılamaz — PostgREST isteği yetki katmanında durur, RLS'e bile
gelmez. `yayinda_mi` yazılabilir kalır (B'deki yayımla/yayından kaldır
akışı bozulmasın).

Bu, güvenlik düzeltmeleri göçündeki DELETE kapatmasının aynı kalıbı:
**politika + yetki birlikte**.

### 3.5 `public.department_requests` — eksik bölüm/eşleme talebi

`sector_requests` genişletilmeyecek. Gerekçe:

| | `sector_requests` | yeni `department_requests` |
|---|---|---|
| Konu | "Alanım listede yok" | "Bölümüm listede yok" **veya** "bölümüm var ama alanı tanımlı değil" |
| Çözümü | `sectors`'a satır | `departments`'a satır **veya** `department_sectors`'a satır |
| Yönetici işi | alan açmak | bölüm açmak / eşleme onaylamak |

Tek tabloda toplamak `requested_sector` kolonunu iki farklı anlam
taşımaya zorlar ve yönetim kuyruğunu belirsizleştirir.

```sql
create table public.department_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  /* Bölüm katalogda VARSA doldurulur: sorun eşlemenin yokluğu. */
  department_id uuid references public.departments(id) on delete set null,
  /* Bölüm katalogda YOKSA kullanıcının yazdığı ad. */
  requested_department text
    check (requested_department is null
           or length(btrim(requested_department)) between 2 and 120),
  universite text check (universite is null or length(universite) <= 120),
  aciklama text check (aciklama is null or length(aciklama) <= 500),
  status text not null default 'bekliyor'
    check (status in ('bekliyor','incelendi','reddedildi','eklendi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint talep_hedefi_var
    check (department_id is not null or requested_department is not null)
);

create unique index department_requests_acik_talep_key
  on public.department_requests (user_id) where status = 'bekliyor';
```

RLS: kullanıcı kendi talebini açar ve okur; yönetici hepsini okur ve
`status` günceller (kalıp `sector_requests` ile aynı).

**Talep açmak sosyal katmana erişim VERMEZ** — `sosyal_gorunur` yalnız
`sector_id` dolu ve yayımlanmış profillere bakar; talep satırı bu koşulu
değiştirmez. Bu, `sector_requests` için zaten bir testle sabitlenmiş
kural; aynısı yeni tablo için de yazılacak.

### 3.6 Yönetici düzeltme yolu ve denetim kaydı

```sql
create table public.social_profile_denetim (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  alan text not null check (alan in ('department_id','sector_id')),
  eski_deger uuid,
  yeni_deger uuid,
  yapan uuid not null references public.profiles(id),
  gerekce text not null check (length(btrim(gerekce)) between 5 and 500),
  created_at timestamptz not null default now()
);
```

- Yalnız yönetici okur; **kimse UPDATE/DELETE edemez** (append-only:
  `authenticated`a hiç yetki verilmez, yönetici yalnız `select`).
- Yazma yalnız `security definer` düzeltme RPC'sinden.

Düzeltme RPC'sinin sınırları:

```
public.sosyal_bolum_duzelt(p_profile_id uuid, p_bolum_slug text, p_gerekce text)
  · is_admin() değilse 42501
  · gerekce zorunlu (boş geçilemez)
  · bölüm katalogda ve aktif olmalı
  · alan yine EŞLEMEDEN türetilir — yönetici de serbest alan yazamaz
  · username DEĞİŞTİRİLEMEZ
  · yayinda_mi DEĞİŞTİRİLEMEZ (kullanıcı adına yayımlama yok)
  · her çağrı denetim tablosuna iki satır yazar (department_id, sector_id)
```

Yöneticinin `social_profiles` üzerinde doğrudan UPDATE politikası
(`20260921030000`'de açılan) **kolon düzeyinde daraltılır**: yalnız bu
RPC üzerinden. Doğrudan yetki bırakmak, denetim kaydını atlanabilir
kılardı.

### 3.6b Asgari talep kuyruğu ekranı (KARAR — onaylandı)

C aşamasına, **mevcut yönetim yapısını kullanan** asgari bir kuyruk
ekranı giriyor. Yeni ve geniş kapsamlı bir yönetim paneli kurulmuyor:
depoda zaten `is_admin()` + `/yonetim/**` rotaları ve yönetim ekranı
kalıbı var; bu akış oraya bir sekme olarak ekleniyor.

Ekran (`/yonetim/bolum-talepleri`) yalnız şunu yapar:

- `department_requests` içinde `status='bekliyor'` olan satırları listeler
  (kullanıcı adı, yazdığı serbest metin, üniversite, açıklama, tarih).
- **Kabul:** yönetici KONTROLLÜ listeden bir `departments` satırı ve bir
  `sectors` satırı seçer. Sonuç iki işlemden biridir:
  1. bölüm katalogda zaten var, eşlemesi yok → `department_sectors`'a
     satır eklenir;
  2. bölüm katalogda yok → önce `departments`'a satır eklenir (slug ve ad
     yöneticinin girdisiyle, kullanıcının serbest metniyle DEĞİL), sonra
     eşleme satırı eklenir.
- **Ret:** zorunlu gerekçe ile `status='reddedildi'`.

**Kullanıcının yazdığı serbest metin hiçbir yolla doğrudan bir bölüm ya
da alan kaydına dönüşmez.** `requested_department` yalnız yöneticinin
okuduğu bir açıklamadır; `departments.slug` ve `departments.ad` her zaman
yöneticinin açık girdisidir. Bu, RPC imzasıyla zorlanır: karar RPC'si
serbest metni parametre olarak almaz.

```
public.bolum_talebini_karara_bagla(
  p_talep_id uuid,
  p_karar text,                 -- 'eklendi' | 'reddedildi'
  p_department_id uuid,         -- kabulde zorunlu, katalogdan
  p_sector_id uuid,             -- kabulde zorunlu, kapalı listeden
  p_gerekce text                -- her iki kararda da zorunlu
)
```

- `is_admin()` değilse `42501`.
- `p_karar='eklendi'` iken `p_department_id` ve `p_sector_id` NULL olamaz.
- Eşleme zaten varsa ve farklı bir alana işaret ediyorsa **reddedilir**;
  alan değiştirmek ayrı ve bilinçli bir işlemdir, talep kuyruğundan
  yapılmaz.
- **Her yönetim işlemi append-only denetim kaydı yazar.** §3.6'daki
  `social_profile_denetim` tablosu profil odaklı; kuyruk kararları için
  ayrı ve aynı ilkeye sahip bir tablo:

```sql
create table public.bolum_talep_denetim (
  id uuid primary key default gen_random_uuid(),
  talep_id uuid not null references public.department_requests(id) on delete cascade,
  karar text not null check (karar in ('eklendi','reddedildi')),
  department_id uuid references public.departments(id),
  sector_id uuid references public.sectors(id),
  yapan uuid not null references public.profiles(id),
  gerekce text not null check (length(btrim(gerekce)) between 5 and 500),
  created_at timestamptz not null default now()
);
```

Append-only: `authenticated`a hiç yetki verilmez, yönetici yalnız
`select`; yazma yalnız karar RPC'sinden.

Ekran **yalnız bu akış içindir**: kullanıcı arama, toplu işlem, istatistik
ya da başka bir yönetim yüzeyi eklenmez.

### 3.6c Kullanıcıya görünen adlandırma (KARAR — onaylandı)

Veritabanındaki `yayinda_mi` adı **değişmiyor**; değişen yalnız ekranda
okunan metin:

| Eski arayüz metni | Yeni arayüz metni |
|---|---|
| "Profilimi yayımla" | **"Alan topluluğuna katıl"** |
| "Şimdi yayımla" | **"Topluluğa katıl"** |
| "Yayından kaldır" | **"Topluluktan ayrıl"** |
| "Profilin henüz yayımlanmadı" | **"Alan topluluğuna henüz katılmadın"** |
| "Profilin yayımlandı." | **"Alan topluluğuna katıldın."** |
| "Profilin yayından kaldırıldı." | **"Alan topluluğundan ayrıldın."** |

Gerekçe: "yayımlamak" bir içeriği herkese açmayı çağrıştırıyor; buradaki
eylem aslında kapalı bir topluluğa girmek. Kural 7'nin ("katılmayan
öğrenci yalnız kendi profilini hazırlar") kullanıcı tarafındaki karşılığı
da bu dille daha okunur oluyor.

Kod adları (`yayinda_mi`, `yayimlamaDurumu`, `sosyalProfilGorunurluguAyarla`)
değişmez — şema ve kod adlandırması ile ekran metni ayrı tutuluyor; bu,
"sektör → alan" kararında verilen kuralın aynısı.

### 3.7 Paylaşım kitlesi

```sql
alter table public.posts
  add column if not exists kitle text not null default 'baglantilarim'
    check (kitle in ('baglantilarim','alan-toplulugum'));
```

**Mevcut paylaşımların güvenli varsayılanı**: `not null default
'baglantilarim'` — iki değerin DAR olanı. Kolon eklenirken var olan tüm
satırlar otomatik olarak dar kitleye düşer; hiçbir paylaşım eklenen bir
kolon yüzünden daha geniş bir kitleye açılmaz. (Bugün üretimde sosyal
tablo yok; kural yine de göçün kendi güvencesi olarak yazılıyor.)

Yeni gizli yardımcılar (`sosyal_gizli` şemasında, PostgREST'e kapalı):

```sql
sosyal_gizli.baglanti_var(hedef uuid) returns boolean
  -- kabul edilmiş, simetrik bağlantı var mı

sosyal_gizli.paylasim_gorunur(hedef_post uuid) returns boolean
  -- posts satırını okuyup: arşivli değil
  --   ve ( yazar = ben
  --        or ( sosyal_gorunur(yazar)
  --             and ( kitle = 'alan-toplulugum'
  --                   or ( kitle = 'baglantilarim' and baglanti_var(yazar) ) ) ) )
```

`posts` SELECT politikası bu kapıyı kullanır. **Aynı kapı
`post_media`, `post_likes` ve `post_saves` için de geçerlidir** — bugün
bunlar `sosyal_gorunur(yazar)` diyor; kitle kolonu eklenince bu
yetersizleşir ve "Bağlantılarım" paylaşımının görseli/beğenisi alan
topluluğuna sızardı. Hepsi `paylasim_gorunur(post_id)` üzerine alınır.

`sosyal_gorunur` iki kitlenin de üstünde durduğu için **farklı alandaki
kullanıcı hiçbir kitlede içeriği göremez** — kural 9 buradan sağlanır.

**Sayaç kitleye göre süzülür (KARAR — onaylandı).** `sosyal_sayaclar`
paylaşım sayısı artık `paylasim_gorunur` kapısından geçer; yani gösterilen
sayı, bakan kişinin gerçekten görebileceği paylaşım sayısıyla aynıdır.

| Bakan | Sayılan |
|---|---|
| profil sahibi | kendi arşivlenmemiş paylaşımlarının tamamı |
| bağlantısı olan aynı alandan kullanıcı | "Bağlantılarım" + erişebildiği "Alan topluluğum" |
| bağlantısı olmayan aynı alandan kullanıcı | yalnız "Alan topluluğum" |
| farklı alan / topluluğa katılmamış | **sıfır satır** (sayı değil) |

Son satır önemli: fonksiyon `where sosyal_gorunur(hedef)` koşulunu
koruduğu için erişimi olmayan çağırana **hiç satır dönmez**. Arayüz de
0 uydurmaz, sayacı hiç çizmez — B'de kurulan "sıfır satır ile gerçek
sıfır ayrı şeylerdir" kuralı sürüyor.

Bağlantı sayısı bu süzgeçten etkilenmez: kabul edilmiş bağlantı sayısı
kitleye bağlı değil.

### 3.8 Bağlantı akışının bütün durumları

Veri modeli A aşamasında hazır ve tek satır/simetrik. C yalnız arayüzü
ve eksik RPC'yi ekler.

| Durum | Satır | Bakan kişi ne görür | Eylem |
|---|---|---|---|
| yok | satır yok | "Bağlantı kur" | INSERT `bekliyor` |
| giden bekliyor | `bekliyor`, ben requester | "İstek gönderildi" | geri çek (DELETE) |
| gelen bekliyor | `bekliyor`, ben addressee | "Sana istek gönderdi" | kabul / reddet (UPDATE) |
| bağlı | `kabul` | "Bağlantınız var" | bağlantıyı kaldır (DELETE) |
| reddettim | `red`, ben addressee | eylem yok | `baglanti_yeniden_baslat()` ile kendi isteğimi açabilirim |
| reddedildim | `red`, ben requester | "Yeniden gönderilebilir: <tarih>" | 30 gün dolunca `red → bekliyor` |
| engel | `blocks` satırı | profil zaten görünmez | — |

Eksik olan tek sunucu parçası: **bakan kişinin bu durumu tek sorguda
öğrenmesi.** `connections` SELECT politikası taraf olana açık, yani
kullanıcı kendi satırını görebiliyor; ancak "kalan bekleme süresi"
`responded_at` + `baglanti_red_bekleme()` ile hesaplanmalı. Bunun için
gizli değil, **açık** bir RPC eklenir:

```sql
public.baglanti_durumu(hedef uuid)
  returns table (durum text, ben_mi_gonderdim boolean, yeniden_deneme_ani timestamptz)
  -- sosyal_gorunur(hedef) kapısından geçer; geçmezse SIFIR SATIR
```

Sıfır satır = "sana verilmiyor"; arayüz sayı ya da durum uydurmaz —
`sosyal_sayaclar` ile aynı kalıp.

### 3.8b `/baglantilar` — bağlantı yönetimi (KARAR — onaylandı)

Tek adres, tek sayfa, üç bölüm:

```
/baglantilar
  ├─ Bağlantılar            durum = 'kabul'
  ├─ Gelen istekler         durum = 'bekliyor', ben addressee
  └─ Gönderilen istekler    durum = 'bekliyor', ben requester
```

- Bölümler aynı sayfada; ayrı rota ya da sekme adresi yok.
- **"Takipçi", "takip edilen", "takip et" ifadeleri hiçbir yerde
  geçmez.** Bu bir arayüz kuralı değil ürün kuralı; testte yorumsuz
  kaynakta bu kelimelerin geçmediği ölçülür.
- Profildeki **"Bağlantı" sayısına basmak bu sayfaya götürür**. Sayı
  bilinmiyorsa (sıfır satır) sayı da bağlantı da çizilmez.
- Her bölüm dört durumu ayrı çizer: yükleniyor / boş / hata / dolu.
  Boş durum dürüsttür ("Henüz bağlantın yok"), hata ile karışmaz.
- Eylemler: kabul, reddet, geri çek, bağlantıyı kaldır. Her biri işlem
  sırasında kilitlenir, hata dalında iyimser güncelleme yapılmaz.
- **Yorum, mesaj ve bildirim merkezi bu sayfaya EKLENMEZ.**

Sunucu tarafı: liste `connections` üzerinden okunur (taraf olana açık
politika zaten var), karşı tarafın profil bilgisi `social_profiles`
üzerinden ve **RLS'e tabi** olarak gelir. Bir bağlantı satırı görünüp de
karşı tarafın profili görünmüyorsa (araya engel ya da topluluktan ayrılma
girmişse) satır "profil şu anda görüntülenemiyor" olarak çizilir; ad
uydurulmaz.

### 3.9 Ziyaretçi profil görünümü ve var/yok sızıntısı

- `SosyalProfilGorunumu` zaten tek bileşen, iki yetki durumu; `sahibiMi`
  dışındaki dal C'de ilk kez gerçekten çizilecek.
- Sorgu yolu değişmiyor: **ziyaretçi profili de `profile_id` ile
  okunacak**, kullanıcı adıyla değil. Rotadaki ad yalnız kimliğe
  çevrilmek için kullanılır ve bu çeviri de RLS'e tabi bir sorgudur:
  görünmeyen bir profil için sıfır satır döner, yani "böyle bir kullanıcı
  var mı" sorusu cevaplanmaz.
- Görünmeyen/olmayan/farklı alandaki üç durum **aynı** güvenli ekranı
  verir (B'de kurulu; C'de ziyaretçi dalı eklenirken korunacak).
- Bağlantı düğmesi yalnız `baglanti_durumu` satır döndürdüğünde çizilir.
  Sıfır satırda düğme DOM'a hiç girmez — "gizlenmiş düğme" bir varlık
  sinyali olurdu.

### 3.10 Eski ve bölümü boş kullanıcıların dürüst boş durumu

- **Geri doldurma YOK.** Hiçbir mevcut kullanıcıya bölüm ya da alan
  atanmaz; `student_profiles.department` serbest metni okunup
  eşleştirilmez.
- Beş sosyal göç hiçbir üretim veritabanına uygulanmadı; dolayısıyla
  taşınacak `social_profiles` satırı da yok. Yine de kural yazılır:
  `department_id is null` olan profil topluluğa dahil değildir.
- Ekranda: bölüm seçilmemişse kurulum ekranı; bölüm seçilmiş ama eşleme
  yoksa "Bölümün için alan topluluğu henüz tanımlı değil" + talep
  düğmesi; ikisinde de sayaç/ızgara uydurulmaz.
- `sinif_etiketi`, `sehir` gibi alanlar boşsa satır çizilmez (B'deki
  kural sürüyor).

---

## 4. Kurulum RPC'si

```sql
create or replace function public.sosyal_profil_kur(
  p_kullanici_adi text,
  p_bolum_slug    text,
  p_yayimla       boolean default false,
  p_gorunen_ad    text default null,
  p_biyografi     text default null,
  p_sinif         text default null,
  p_sehir         text default null
) returns public.social_profiles
language plpgsql security definer set search_path = public
```

Akış:

1. `ben := auth.uid()`; NULL ise `42501`.
2. Kullanıcı adı deseni ve uzunluğu sunucuda yeniden doğrulanır (istemci
   doğrulaması bir kolaylık, kural değil).
3. Bölüm: `select * from departments where slug = p_bolum_slug and aktif`.
   Yoksa `P0001` + `'bolum-bulunamadi'`.
4. Alan: `select sector_id from department_sectors where department_id = …`.
   Yoksa **satır AÇILMAZ**, `P0001` + `'bolum-alani-tanimsiz'`. Kullanıcı
   yarım bir profille topluluğa giremez.
5. `insert … on conflict (profile_id) do update` — `sector_id` ve
   `department_id` yalnız NULL iken yazılır (`coalesce(old, new)`
   kalıbı), yani ikinci çağrı alanı değiştiremez.
6. `yayinda_mi := p_yayimla` (kullanıcının açık seçimi; B'deki karar).
7. Dönüş: yazılan satır.

`security definer` gerekli: istemcinin `sector_id`/`department_id`
kolonlarına yazma yetkisi yok, RPC bunu sahibi haklarıyla yapıyor.
`revoke all … from public; grant execute … to authenticated`.

Hata kodları ayrı: arayüz "bölümün listede yok" ile "bölümün alanı henüz
tanımlı değil" cümlelerini ayırt edebilmeli — ikisi farklı eylem
öneriyor.

**İkinci kapı:** `kimlik_kilidi()` tetikleyicisi (`sektor_kilidi()`nin
genişletilmişi) `department_id` ve `sector_id` için "bir kez yazılır"
kuralını UPDATE tarafında da uygular. Kolon yetkisi zaten kapatıyor;
tetikleyici `service_role`/bakım yolunda da kuralı koruyor ve yönetici
istisnası buradan geçiyor.

---

## 5. C aşamasının sınırı

### C'de YAPILACAK

- `departments`, `department_sectors`, `department_requests`,
  `social_profile_denetim`, `bolum_talep_denetim` tabloları ve RLS'leri
- `social_profiles.department_id` + kolon düzeyi yetki daraltması
- `sosyal_profil_kur` RPC'si + `kimlik_kilidi` tetikleyicisi
- `sosyal_bolum_duzelt` yönetici RPC'si + denetim kaydı
- `bolum_talebini_karara_bagla` yönetici RPC'si + denetim kaydı
- **Asgari talep kuyruğu ekranı** (`/yonetim/bolum-talepleri`), mevcut
  yönetim yapısı üzerine (§3.6b)
- `posts.kitle` kolonu + `baglanti_var` / `paylasim_gorunur` yardımcıları
  + `posts`/`post_media`/`post_likes`/`post_saves` politikalarının
  yeniden yazımı
- `sosyal_sayaclar`ın kitleye göre süzülmesi (§3.7)
- `baglanti_durumu` RPC'si
- Arayüz: bölüm seçimli kurulum, "bölümüm/alanım yok" talebi, ziyaretçi
  profil görünümü, bağlantı düğmesi ve tüm durumları, **`/baglantilar`
  sayfası** (§3.8b)
- **Kullanıcıya görünen adlandırma değişimi** ("Alan topluluğuna katıl" /
  "Topluluktan ayrıl", §3.6c)
- Testler: RLS, kurulum RPC'si, kitle kuralları, sayaç süzgeci, bağlantı
  durumları, talep kuyruğu kararları, arayüz kaynak testleri

### D'ye BIRAKILAN

- **Paylaşım oluşturma akışı** ve kitle seçicisinin arayüzü (kolon ve
  RLS C'de hazır, seçici D'de)
- Depolama kovası, avatar ve paylaşım görselleri
- Yorum, mesaj, bildirim merkezi, şikâyet ekranı, öne çıkanlar
- Okul e-postası / öğrenci belgesi doğrulaması ("doğrulanmış öğrenci")
- Çok alanlı bölüm desteği (§3.2 gereği C'de kapalı)
- Talep kuyruğunun ötesindeki yönetim yüzeyleri (arama, toplu işlem,
  istatistik)

---

## 6. Değişecek dosyalar

### Ana oturum (veri modeli / RLS / SQL testleri)

```
supabase/migrations/20260923010000_bolum_katalogu.sql
supabase/migrations/20260923020000_bolum_alan_eslemesi.sql
supabase/migrations/20260923030000_sosyal_kurulum_rpc.sql
supabase/migrations/20260923040000_yonetici_duzeltme_denetim.sql
supabase/migrations/20260923050000_bolum_talebi.sql
supabase/migrations/20260923060000_talep_kuyrugu_karari.sql
supabase/migrations/20260923070000_paylasim_kitlesi_ve_sayac.sql
supabase/migrations/20260923080000_baglanti_durumu_rpc.sql
scripts/bolum-katalogu.mjs                     (seed üreteci)
tests/sosyal-bolum-alan-uygunlugu.test.mjs
tests/sosyal-talep-kuyrugu.test.mjs
tests/sosyal-paylasim-kitlesi.test.mjs
tests/sosyal-baglanti-akisi.test.mjs
tests/bolum-katalogu-tutarliligi.test.mjs
```

### `stajimvar-frontend-builder` ajanı (yalnız arayüz)

```
src/lib/queries/sosyal.ts                      (yeni RPC'ler, tip daraltma)
src/components/sosyal/SosyalProfilKurulum.tsx  (bölüm seçimi + yeni metinler)
src/components/sosyal/BolumSecimi.tsx          (yeni)
src/components/sosyal/BolumTalebi.tsx          (yeni)
src/components/sosyal/BaglantiDugmesi.tsx      (yeni)
src/components/sosyal/BaglantilarSayfasi.tsx   (yeni · /baglantilar)
src/components/sosyal/SosyalProfilGorunumu.tsx (ziyaretçi dalı + metinler)
src/components/sosyal/SosyalProfilSayfasi.tsx  (ziyaretçi yükleme yolu)
src/components/sosyal/ProfilAyarMenusu.tsx     (yalnız etiket metinleri)
src/components/yonetim/BolumTalepleri.tsx      (asgari kuyruk ekranı)
src/App.tsx                                    (yalnız rota bağlama)
tests/sosyal-profil-arayuzu.test.mjs           (genişletme)
```

**Sınır:** ajan `supabase/migrations/**` ve `scripts/**` dosyalarına
dokunmaz; ana oturum `src/components/**` dosyalarına dokunmaz. İki taraf
aynı turda aynı dosyayı açmaz.

---

## 7. Yerel Supabase'de çalıştırılacak testler

Geçici `%TEMP%` projesi, `supabase db reset` ile tüm göçler sıfırdan.

**Bölüm–alan uygunluğu**

- Elektrik-Elektronik Mühendisliği seçen kullanıcı Tekstil alanına
  DÜŞMÜYOR; alan eşlemeden ne geliyorsa o.
- İstemci gövdesine `sector_id` koyduğunda: doğrudan
  `POST /social_profiles` **yetki hatası** (kolon yetkisi yok).
- RPC'ye fazladan alan geçirilemez (imza sabit).
- Eşlemesi olmayan bölüm: satır AÇILMIYOR, hata kodu `bolum-alani-tanimsiz`.
- Katalogda olmayan bölüm slug'ı: `bolum-bulunamadi`.
- İkinci kurulum çağrısı bölümü/alanı DEĞİŞTİRMİYOR.
- `update social_profiles set sector_id=…` → yetki hatası.
- Yönetici düzeltmesi çalışıyor, denetim satırı yazılıyor, gerekçe boşsa
  reddediliyor; yönetici `username` ve `yayinda_mi` değiştiremiyor.
- Denetim tablosu append-only: kullanıcı ve yönetici UPDATE/DELETE edemiyor.

**Talep**

- Kullanıcı kendi talebini açıp okuyor, başkasınınkini görmüyor.
- Aynı anda tek açık talep.
- **Talep açmak sosyal katmana erişim vermiyor** (profil listesi hâlâ boş).

**Bağlantı**

- Yedi durumun her biri (§3.8) için `baglanti_durumu` doğru satır dönüyor.
- Görünmeyen hedef için SIFIR SATIR (0 uydurulmuyor).
- Farklı alandan istek gönderilemiyor; yayımlamamış kullanıcı da gönderemiyor.
- Kabul → sayaç iki tarafta da 1; red → sayaç değişmiyor (mevcut testler).

**Paylaşım kitlesi**

- `kitle='baglantilarim'`: bağlantısı olmayan aynı alandaki kullanıcı
  paylaşımı, GÖRSELİNİ, beğenilerini GÖREMİYOR.
- Bağlantı kurulunca aynı paylaşım görünüyor.
- `kitle='alan-toplulugum'`: aynı alandaki yayımlanmış herkes görüyor.
- Farklı alan **iki kitlede de** göremiyor.
- Kolon eklendiğinde var olan satırlar `baglantilarim` oluyor.
- Arşivlenmiş paylaşım iki kitlede de görünmüyor ve beğenilemiyor
  (mevcut kural korunuyor).

**Sayaç süzgeci**

- Profil sahibi: kendi arşivlenmemiş paylaşımlarının tamamını sayıyor.
- Bağlantısı olan aynı alandan kullanıcı: "Bağlantılarım" + "Alan
  topluluğum" toplamını sayıyor.
- Bağlantısı olmayan aynı alandan kullanıcı: yalnız "Alan topluluğum".
- Farklı alan ve topluluğa katılmamış kullanıcı: **sıfır satır**.
- Gösterilen sayı, aynı çağıranın `posts` sorgusundan dönen satır
  sayısıyla **birebir aynı** (testte iki sayı karşılaştırılıyor).

**Talep kuyruğu kararı**

- Normal kullanıcı karar RPC'sini çağıramıyor.
- Kabulde `department_id` ve `sector_id` zorunlu; ikisi de kapalı
  listelerden.
- Kullanıcının serbest metni hiçbir yolla `departments` satırına
  dönüşmüyor (RPC imzası serbest metin almıyor).
- Eşleme zaten varsa ve farklı alana işaret ediyorsa karar reddediliyor.
- Her karar `bolum_talep_denetim` tablosuna satır yazıyor; tablo
  append-only.
- Karardan sonra kullanıcı gerçekten topluluğa girebiliyor (uçtan uca).

**Tarayıcı (1440×900 ve 390×844, yerel Supabase + gerçek oturum)**

- Kurulumda bölüm listesi geliyor, alan **seçilemiyor** (ekranda alan
  seçici yok), kayıttan sonra profildeki alan rozeti eşlemeden gelen alan.
- Eşlemesi olmayan bölümde dürüst ekran + talep düğmesi.
- Ziyaretçi profili: kendi/başkası/görünmeyen üç durumun ekranları.
- Bağlantı düğmesinin yedi durumu, çift tıklama kilidi, hata dalı.
- Görünmeyen profilde bağlantı düğmesi DOM'a hiç girmiyor.
- 44 px dokunma hedefleri, odak dönüşü, Escape, yatay taşma 0.
- Uzun bölüm/üniversite adlarıyla taşma yok.
- `/baglantilar`: üç bölüm, her birinde dört durum; "Bağlantı" sayısına
  basınca bu sayfaya gidiliyor; "takip" kelimesi hiçbir yerde geçmiyor.
- Yeni metinler ekranda: "Alan topluluğuna katıl", "Topluluktan ayrıl";
  "yayımla" kelimesi kullanıcıya görünen hiçbir yerde geçmiyor.
- Profilde resmî bölüm adı `departments`'tan; "Eğitim notu" ikincil satır
  olarak ve yalnız doluysa çiziliyor.
- `/yonetim/bolum-talepleri`: bekleyen talep listeleniyor, kabul iki
  kapalı listeden seçim istiyor, ret gerekçesiz gönderilemiyor.

---

## 8. Riskler

1. **Eşleme listesi ürün kararıdır.** Tablo boş kaldığı sürece hiçbir
   öğrenci topluluğa giremez. C teknik olarak tamamlanır ama ürün
   çalışmaz. Listenin gelmesi kritik yol üzerinde.
2. **Katalog 42 bölümle sınırlı.** Türkiye'deki bölümlerin küçük bir
   kısmı. Talep kuyruğunun ilk günlerde yoğun olması beklenir; yönetim
   ekran §3.6b ile C aşamasına alındı.
3. **`bolum_etiketi` ile `departments.ad` iki bölüm bilgisi** yaratıyor;
   hangisinin nerede görüneceği netleşmezse profilde tekrar oluşur.
4. **Beyan temelli bölüm**, alan topluluğunun güvenini taşıyabildiği
   kadar taşır. Kural 6 gereği hiçbir yerde "doğrulanmış" denmeyecek;
   metinlerin bunu ima etmemesi gözden geçirilmeli.
5. **Kitle kuralı dört tabloya birden dokunuyor.** Biri unutulursa
   sızıntı sessiz olur; bu yüzden tek yardımcıdan (`paylasim_gorunur`)
   geçirilecek ve testte dördü de ölçülecek.

---

## 9. Verilen kararlar (ürün sahibi onayladı — 2026-09-08)

Tasarımın ilk sürümünde açık bırakılan altı nokta karara bağlandı.

1. **Yönetim ekranı C'de açılıyor** — mevcut yönetim yapısını kullanan,
   yalnız bu akış için asgari bir talep kuyruğu. Ayrıntı §3.6b.
2. **Bölüm–alan eşlemesi onaylandı** (§10): 42/42 bölüm eşlendi ve
   alan listesi 8 yeni alanla 23'e çıktı.
3. **Paylaşım sayacı kitleye göre süzülüyor.** Ayrıntı §3.7.
4. **Resmî bölüm adı yalnız `departments` ilişkisinden.** `bolum_etiketi`
   "Eğitim notu" olarak korunuyor. Ayrıntı §3.3.
5. **`/baglantilar` tek sayfa, üç bölüm.** Ayrıntı §3.8b.
6. **Bir bölüm → tam olarak bir alan.** Çoklu alan ve kullanıcı istisnası
   açılmıyor. Ayrıntı §3.2.

Ayrıca kullanıcıya görünen adlandırma değişiyor ("Alan topluluğuna
katıl" / "Topluluktan ayrıl"); şema adı `yayinda_mi` aynı kalıyor.
Ayrıntı §3.6c.

---

## 10. Bölüm–alan eşlemesi (ONAYLANDI — 2026-09-08)

Ürün sahibi 42 bölümün tamamı için eşlemeyi onayladı ve **sekiz yeni
alan** açtı. Bu bölüm artık taslak değil; `20260923090000_bolum_alan_seed.sql`
göçünün kaynağı.

### 10.1 Yeni alanlar (8)

Alan listesi 15'ten **23'e** çıkıyor. Yeni satırlar mevcut `sectors`
tablosuna `on conflict (slug) do nothing` ile ekleniyor; var olan 15
satır ve onların `sira` değerleri DEĞİŞMİYOR.

| slug | ad | sira |
|---|---|---|
| `endustri-operasyon-yonetimi` | Endüstri ve Operasyon Yönetimi | 16 |
| `mekatronik-otomasyon` | Mekatronik ve Otomasyon | 17 |
| `ekonomi-isletme-yonetim` | Ekonomi, İşletme ve Yönetim | 18 |
| `is-sagligi-guvenligi-kalite` | İş Sağlığı, Güvenliği ve Kalite | 19 |
| `kamu-siyaset-uluslararasi-iliskiler` | Kamu, Siyaset ve Uluslararası İlişkiler | 20 |
| `hukuk-adalet` | Hukuk ve Adalet | 21 |
| `psikoloji-sosyal-bilimler` | Psikoloji ve Sosyal Bilimler | 22 |
| `egitim-cocuk-gelisimi` | Eğitim ve Çocuk Gelişimi | 23 |

Bu sekiz alan, taslakta "15 alandan hiçbiri doğal ev değil" diye
işaretlenen bölümlerin karşılığı. Yani eksik olan eşleme değil, alan
listesinin kapsamıydı ve kapsam genişletildi.

### 10.2 Onaylanan 42 eşleme

| # | Bölüm | `departments.slug` | `sectors.slug` |
|---|---|---|---|
| 1 | Bilgisayar Mühendisliği | `bilgisayar-muhendisligi` | `bilisim-yazilim` |
| 2 | Yazılım Mühendisliği | `yazilim-muhendisligi` | `bilisim-yazilim` |
| 3 | Bilgisayar Programcılığı (MYO) | `bilgisayar-programciligi` | `bilisim-yazilim` |
| 4 | Elektrik-Elektronik Mühendisliği | `elektrik-elektronik-muhendisligi` | `elektrik-elektronik-enerji` |
| 5 | Makine Mühendisliği | `makine-muhendisligi` | `makine-imalat` |
| 6 | Endüstri Mühendisliği | `endustri-muhendisligi` | `endustri-operasyon-yonetimi` |
| 7 | Mekatronik Mühendisliği | `mekatronik-muhendisligi` | `mekatronik-otomasyon` |
| 8 | Mekatronik / Elektronik Teknolojisi (MYO) | `mekatronik` | `mekatronik-otomasyon` |
| 9 | İnşaat Mühendisliği | `insaat-muhendisligi` | `insaat-mimarlik-yapi` |
| 10 | Mimarlık | `mimarlik` | `insaat-mimarlik-yapi` |
| 11 | İç Mimarlık | `ic-mimarlik` | `insaat-mimarlik-yapi` |
| 12 | Harita ve Geomatik Mühendisliği | `harita-ve-geomatik-muhendisligi` | `insaat-mimarlik-yapi` |
| 13 | Gıda Mühendisliği | `gida-muhendisligi` | `gida-tarim-hayvancilik` |
| 14 | Ziraat Mühendisliği | `ziraat-muhendisligi` | `gida-tarim-hayvancilik` |
| 15 | Kimya Mühendisliği | `kimya-muhendisligi` | `kimya-malzeme-maden` |
| 16 | Metalurji ve Malzeme Mühendisliği | `metalurji-ve-malzeme-muhendisligi` | `kimya-malzeme-maden` |
| 17 | Çevre Mühendisliği | `cevre-muhendisligi` | `cevre-surdurulebilirlik` |
| 18 | Giyim Üretim Teknolojisi / Tekstil | `giyim-uretim-teknolojisi` | `tekstil-moda-hazir-giyim` |
| 19 | Moda Tasarımı | `moda-tasarimi` | `tekstil-moda-hazir-giyim` |
| 20 | Grafik Tasarım | `grafik-tasarim` | `medya-iletisim-yaratici` |
| 21 | Radyo, Televizyon ve Sinema | `radyo-televizyon-ve-sinema` | `medya-iletisim-yaratici` |
| 22 | İletişim | `iletisim` | `medya-iletisim-yaratici` |
| 23 | Muhasebe ve Vergi Uygulamaları (MYO) | `muhasebe-ve-vergi-uygulamalari` | `finans-bankacilik-sigorta` |
| 24 | İktisat / Ekonomi | `iktisat` | `ekonomi-isletme-yonetim` |
| 25 | İşletme | `isletme` | `ekonomi-isletme-yonetim` |
| 26 | Uluslararası Ticaret ve İşletmecilik | `uluslararasi-ticaret` | `ticaret-pazarlama-eticaret` |
| 27 | Halkla İlişkiler ve Pazarlama | `halkla-iliskiler-ve-pazarlama` | `ticaret-pazarlama-eticaret` |
| 28 | Lojistik (MYO) | `lojistik` | `lojistik-havacilik-denizcilik` |
| 29 | İş Sağlığı ve Güvenliği (MYO) | `is-sagligi-ve-guvenligi` | `is-sagligi-guvenligi-kalite` |
| 30 | Uluslararası İlişkiler | `uluslararasi-iliskiler` | `kamu-siyaset-uluslararasi-iliskiler` |
| 31 | Siyaset Bilimi ve Kamu Yönetimi | `siyaset-bilimi` | `kamu-siyaset-uluslararasi-iliskiler` |
| 32 | Hukuk | `hukuk` | `hukuk-adalet` |
| 33 | Psikoloji | `psikoloji` | `psikoloji-sosyal-bilimler` |
| 34 | Sosyoloji | `sosyoloji` | `psikoloji-sosyal-bilimler` |
| 35 | Çocuk Gelişimi (MYO) | `cocuk-gelisimi` | `egitim-cocuk-gelisimi` |
| 36 | Eczacılık | `eczacilik` | `saglik-ilac` |
| 37 | Tıp | `tip` | `saglik-ilac` |
| 38 | Hemşirelik | `hemsirelik` | `saglik-ilac` |
| 39 | Fizyoterapi ve Rehabilitasyon | `fizyoterapi-ve-rehabilitasyon` | `saglik-ilac` |
| 40 | Tıbbi Laboratuvar Teknikleri (MYO) | `tibbi-laboratuvar-teknikleri` | `saglik-ilac` |
| 41 | Turizm ve Otel Yöneticiliği | `turizm-ve-otel-yoneticiligi` | `turizm-konaklama` |
| 42 | Gastronomi ve Mutfak Sanatları | `gastronomi-ve-mutfak` | `turizm-konaklama` |

### 10.3 Eşlemenin sonuçları

- **42/42 bölüm eşlendi.** `department_sectors` artık boş kalmıyor;
  eşlemesiz bölüm yalnız katalog dışındaki bölümler için oluşacak ve
  onların yolu talep kuyruğu.
- **Kural 3 doğrudan ölçülebilir:** `elektrik-elektronik-muhendisligi`
  → `elektrik-elektronik-enerji`. `tekstil-moda-hazir-giyim` alanına
  yalnız iki bölüm bağlı (`giyim-uretim-teknolojisi`, `moda-tasarimi`);
  Elektrik oraya hiçbir yoldan geçemiyor. Test bunu tam bu satırlarla
  ölçüyor.
- **`otomotiv-mobilite` alanına hiçbir bölüm bağlı değil.** Alan
  listede kalıyor ama ilk sürümde boş; bunu bilerek bırakıyoruz, çünkü
  alanı silmek ileride otomotiv odaklı bir bölüm eklendiğinde geri
  almak gerekecek bir karar olurdu. Test bu boşluğun **bilinçli**
  olduğunu sabitliyor (alan var, eşleme yok).
- Alan başına bölüm sayısı: sağlık 5, inşaat 4, bilişim 3, medya 3,
  gıda 2, kimya 2, tekstil 2, turizm 2, ekonomi 2, kamu 2, mekatronik 2,
  psikoloji 2, ticaret 2, ve kalan alanların her birinde 1 ya da 0.
