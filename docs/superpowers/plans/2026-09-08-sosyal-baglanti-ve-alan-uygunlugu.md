# Uygulama planı — sosyal bağlantı akışı ve zorunlu bölüm–alan uygunluğu

Tarih: 2026-09-08
Tasarım: `docs/superpowers/specs/2026-09-08-sosyal-baglanti-ve-alan-uygunlugu-design.md`
Durum: PLAN — onay bekliyor, hiçbir görev başlatılmadı

---

## Çalışma kuralları (her görev için geçerli)

**Yetki ayrımı — istisnasız**

| Taraf | Yazabileceği | Yazamayacağı |
|---|---|---|
| Ana oturum | `supabase/migrations/**`, `scripts/**`, SQL/RLS testleri (`tests/sosyal-*.test.mjs` içinde veritabanı ölçenler) | `src/**` |
| `stajimvar-frontend-builder` ajanı | `src/components/**`, `src/lib/**`, `src/App.tsx` (yalnız rota bağlama), arayüz kaynak testleri | `supabase/migrations/**`, `scripts/**`, `.claude/**`, `package.json` |

İki taraf **aynı turda aynı dosyayı açmaz**. Görev sıralaması buna göre
kurgulandı: veri modeli görevleri (G1–G8) bittikten sonra arayüz
görevleri (G9–G16) başlar; ikisi arasında paylaşılan tek dosya yok.

**Her görevde sıra:** önce test → sonra uygulama → sonra doğrulama.
Bu depoda bu sıra ürün sahibinin açık talebi.

**Her görev sonunda çalıştırılacak asgari doğrulama:**
```
node --test tests/<ilgili>.test.mjs
npx tsc --noEmit                     (arayüz görevlerinde)
```
**Aşama sonunda:** tam takım + lint + build + yerel Supabase + tarayıcı.

**Ortam:** yalnız `%TEMP%` altındaki geçici yerel Supabase projesi.
`login`, `link`, `db push`, `--linked`, commit, push, deploy YOK.
Canlı/uzak veritabanına bağlanılmaz. Mevcut kullanıcılara bölüm/alan
uydurulmaz; hiçbir geri doldurma yapılmaz.

---

## Kritik ön koşul (kod öncesi)

**G0 · Bölüm–alan eşlemesi — ONAYLANDI (2026-09-08).** Engelleyici kalktı.

- Alan listesi **8 yeni alanla 15 → 23**'e çıkıyor (tasarım §10.1).
- **42/42 bölüm eşlendi** (tasarım §10.2). Onaylanan liste dışında
  eşleme ya da yeni bölüm ÜRETİLMEYECEK.
- Seed ayrı bir göçte: `20260923090000_bolum_alan_seed.sql` (G2b).
  `department_sectors` yine G2'de boş oluşturulur, G2b doldurur — böylece
  şema ile içerik ayrı ayrı gözden geçirilebilir ve geri alınabilir.
- `otomotiv-mobilite` alanına hiçbir bölüm bağlı değil; bu bilinçli ve
  testle sabitleniyor.

---

## A · VERİ MODELİ VE RLS (ana oturum)

### G1 · Kontrollü bölüm kataloğu
**Dosyalar:** `supabase/migrations/20260923010000_bolum_katalogu.sql`,
`scripts/bolum-katalogu.mjs`, `tests/bolum-katalogu-tutarliligi.test.mjs`

1. Önce test: `src/data/bolumler.ts` içindeki slug kümesi ile göçteki
   seed slug kümesi birebir aynı; 42 satır; slug deseni; grup değerleri
   şemadaki CHECK ile aynı küme.
2. `scripts/bolum-katalogu.mjs`: TS dosyasını okuyup seed bloğunu üretir
   (`insert … on conflict (slug) do nothing`). Elle yazılmış slug yok.
3. Göç: `departments` tablosu + RLS (`select` yalnız `authenticated`,
   `aktif` süzgeci) + yönetici yazma politikası + **`grant select`
   yalnız `authenticated`; `anon`dan revoke**.
4. Doğrulama: test dosyası yeşil.

**Bitti sayılır:** 42 bölüm katalogda, iki kaynak arasında drift yok,
anon göremiyor.

---

### G2 · Bölüm–alan eşleme tablosu (BOŞ)
**Dosyalar:** `supabase/migrations/20260923020000_bolum_alan_eslemesi.sql`,
`tests/sosyal-bolum-alan-uygunlugu.test.mjs` (yeni)

1. Önce test: tablo var, `department_id` birincil anahtar (bir bölüm =
   en fazla bir alan), `sector_id` `on delete restrict`, tablo BOŞ,
   `authenticated` yalnız okuyabiliyor, anon hiçbir şey yapamıyor.
2. Göç: `department_sectors` + RLS + grant/revoke.
3. Doğrulama: test yeşil; tabloda 0 satır.

**Bitti sayılır:** eşleme tablosu var ve boş; içine satır yalnız ayrı bir
seed göçüyle (G0 sonrası) girecek.

> Eşleme listesi bu görevde ÜRETİLMEZ. İnternetten ya da modelin kendi
> bilgisinden bölüm–alan listesi yazılmayacak.

---

### G2b · Sekiz yeni alan + 42 eşleme seed'i
**Dosyalar:** `supabase/migrations/20260923025000_bolum_alan_seed.sql`,
`tests/sosyal-bolum-alan-uygunlugu.test.mjs`

1. Önce test:
   - `sectors` 23 satır; 8 yeni slug var; eski 15'in `sira` değerleri
     DEĞİŞMEMİŞ
   - `department_sectors` 42 satır; her `departments` satırının eşlemesi var
   - `elektrik-elektronik-muhendisligi` → `elektrik-elektronik-enerji`
   - `tekstil-moda-hazir-giyim` alanına yalnız `giyim-uretim-teknolojisi`
     ve `moda-tasarimi` bağlı
   - `otomotiv-mobilite` alanı VAR ama eşlemesi YOK (bilinçli boşluk)
   - onaylanan liste dışında satır yok (42 tam sayım)
2. Göç: 8 alan `on conflict (slug) do nothing`; 42 eşleme slug üzerinden
   `select id from ...` ile bağlanıyor (uuid elle yazılmıyor).
3. Doğrulama: test yeşil.

**Bitti sayılır:** eşleme onaylanan listeyle birebir; fazlası ve eksiği yok.

---

### G3 · `social_profiles` bölüm kolonu ve kolon düzeyi yetki
**Dosyalar:** `supabase/migrations/20260923030000_sosyal_kurulum_rpc.sql`
(1/2), `tests/sosyal-bolum-alan-uygunlugu.test.mjs`

1. Önce test:
   - `authenticated` `social_profiles` üzerinde INSERT yetkisi TAŞIMIYOR
   - UPDATE yetkisi yalnız `gorunen_ad, biyografi, bolum_etiketi,
     sinif_etiketi, sehir, yayinda_mi` kolonlarında
   - `sector_id`, `department_id`, `username` UPDATE yetkisi YOK
   - `yayin_icin_kimlik_sart` artık `department_id`'yi de istiyor
2. Göç: kolon ekleme, kısıt yenileme, `revoke insert, update` +
   kolon bazlı `grant update`.
3. Doğrulama: mevcut yayımla/yayından kaldır testleri hâlâ yeşil
   (`yayinda_mi` yazılabilir kalmalı).

**Bitti sayılır:** istemci hiçbir istekle alan/bölüm yazamıyor; B
aşamasının yayımlama akışı bozulmamış.

---

### G4 · Kurulum RPC'si + kimlik kilidi
**Dosyalar:** `supabase/migrations/20260923030000_sosyal_kurulum_rpc.sql`
(2/2), `tests/sosyal-bolum-alan-uygunlugu.test.mjs`

1. Önce test:
   - eşlemesi olan bölümle kurulum → satır açılıyor, `sector_id`
     EŞLEMEDEN geliyor
   - eşlemesi olmayan bölüm → satır AÇILMIYOR, hata `bolum-alani-tanimsiz`
   - katalogda olmayan slug → `bolum-bulunamadi`
   - oturumsuz çağrı → `42501`
   - ikinci çağrı bölümü/alanı DEĞİŞTİRMİYOR
   - kullanıcı adı deseni sunucuda da doğrulanıyor
   - `yayinda_mi` parametreden geliyor, varsayılan `false`
   - RPC `public`te ve `authenticated`a açık; yardımcılar `sosyal_gizli`de
2. Göç: `sosyal_profil_kur()` + `kimlik_kilidi()` tetikleyicisi
   (`sektor_kilidi`nin `department_id`'yi de kapsayan hâli).
3. Doğrulama: test yeşil; mevcut sektör kilidi testleri hâlâ yeşil.

**Bitti sayılır:** alan yalnız sunucuda türetiliyor; Elektrik
Mühendisliği öğrencisi Tekstil alanına hiçbir yoldan giremiyor.

---

### G5 · Yönetici düzeltme yolu ve denetim kaydı
**Dosyalar:** `supabase/migrations/20260923040000_yonetici_duzeltme_denetim.sql`,
`tests/sosyal-bolum-alan-uygunlugu.test.mjs`

1. Önce test:
   - normal kullanıcı RPC'yi çağıramıyor (`42501`)
   - gerekçe boş/kısa ise reddediliyor
   - yönetici bölümü düzeltince alan da eşlemeden yenileniyor
   - yönetici `username` ve `yayinda_mi` DEĞİŞTİREMİYOR
   - her düzeltme denetim tablosuna satır yazıyor
   - denetim tablosu append-only: kimse UPDATE/DELETE edemiyor
   - yöneticinin `social_profiles` üzerindeki doğrudan geniş UPDATE
     politikası daraltılmış
2. Göç: `social_profile_denetim` + `sosyal_bolum_duzelt()` + politika
   daraltması.
3. Doğrulama: test yeşil.

**Bitti sayılır:** düzeltme mümkün, gerekçesiz mümkün değil, izsiz mümkün
değil.

---

### G6 · Eksik bölüm/eşleme talebi
**Dosyalar:** `supabase/migrations/20260923050000_bolum_talebi.sql`,
`tests/sosyal-bolum-alan-uygunlugu.test.mjs`

1. Önce test:
   - kullanıcı kendi talebini açıp okuyor, başkasınınkini görmüyor
   - başkası adına talep açamıyor
   - aynı anda tek açık talep
   - `department_id` ve `requested_department` ikisi birden boş olamaz
   - durumu yalnız yönetici değiştiriyor
   - **talep açmak sosyal katmana erişim VERMİYOR**
   - anon hiçbir şey yapamıyor
2. Göç: `department_requests` + RLS + grant/revoke.
3. Doğrulama: test yeşil.

**Bitti sayılır:** talep kaydı var, erişim vermiyor, `sector_requests`
tablosuna dokunulmamış.

---

### G6b · Talep kuyruğu kararı ve denetimi
**Dosyalar:** `supabase/migrations/20260923060000_talep_kuyrugu_karari.sql`,
`tests/sosyal-talep-kuyrugu.test.mjs` (yeni)

1. Önce test:
   - normal kullanıcı `bolum_talebini_karara_bagla` çağıramıyor (`42501`)
   - kabulde `p_department_id` ve `p_sector_id` zorunlu
   - RPC imzası **serbest metin almıyor**: kullanıcının yazdığı
     `requested_department` hiçbir yolla `departments` satırına dönüşmüyor
   - eşleme zaten varsa ve farklı alana işaret ediyorsa karar reddediliyor
   - ret gerekçesiz gönderilemiyor
   - her karar `bolum_talep_denetim`e satır yazıyor
   - denetim tablosu append-only (kimse UPDATE/DELETE edemiyor)
   - karardan sonra kullanıcı gerçekten topluluğa girebiliyor (uçtan uca)
2. Göç: `bolum_talep_denetim` tablosu + `bolum_talebini_karara_bagla()`
   RPC'si + RLS/grant.
3. Doğrulama: test yeşil.

**Bitti sayılır:** yönetici kararı yalnız kapalı listelerden, gerekçeli ve
izli veriliyor; serbest metin hiçbir kayda dönüşmüyor.

---

### G7 · Paylaşım kitlesi, dört tablonun politikası ve sayaç süzgeci
**Dosyalar:** `supabase/migrations/20260923070000_paylasim_kitlesi_ve_sayac.sql`,
`tests/sosyal-paylasim-kitlesi.test.mjs` (yeni)

1. Önce test:
   - kolon eklendiğinde var olan satırlar `baglantilarim` oluyor
   - `baglantilarim`: bağlantısı olmayan aynı alandaki kullanıcı
     paylaşımı **görmüyor**; `post_media`, `post_likes` de görmüyor
   - bağlantı kurulunca dördü de görünüyor
   - `alan-toplulugum`: aynı alandaki yayımlanmış herkes görüyor
   - farklı alan **iki kitlede de** göremiyor
   - yayımlamamış kullanıcı iki kitlede de göremiyor (yalnız kendi içeriği)
   - arşivlenmiş paylaşım iki kitlede de görünmüyor ve beğenilemiyor
   - geçersiz `kitle` değeri CHECK ile reddediliyor
   - **sayaç süzgeci:** dört bakan tipinin her biri için
     `sosyal_sayaclar` sayısı, aynı çağıranın `posts` sorgusundan dönen
     satır sayısıyla BİREBİR aynı; farklı alan ve topluluğa katılmamış
     çağıran için **sıfır satır** (sahte 0 yok)
   - bağlantı sayısı kitleden etkilenmiyor
2. Göç: `posts.kitle` + `sosyal_gizli.baglanti_var()` +
   `sosyal_gizli.paylasim_gorunur()` + `posts`, `post_media`,
   `post_likes`, `post_saves` politikalarının yeniden yazımı +
   `sosyal_sayaclar`ın kitleye göre süzülmesi.
3. Doğrulama: test yeşil; mevcut arşiv/beğeni/sayaç testleri hâlâ yeşil.

**Bitti sayılır:** kitle kuralı tek yardımcıdan geçiyor, dört tabloda da
ölçüldü ve gösterilen sayı gösterilen içerikle tutuyor.

---

### G8 · Bağlantı durumu RPC'si
**Dosyalar:** `supabase/migrations/20260923080000_baglanti_durumu_rpc.sql`,
`tests/sosyal-baglanti-akisi.test.mjs` (yeni)

1. Önce test: tasarımdaki yedi durumun her biri için doğru satır;
   görünmeyen hedef için **sıfır satır**; yayımlamamış kullanıcı istek
   gönderemiyor; farklı alandan istek gönderilemiyor; kabul → sayaç 1;
   red → sayaç değişmiyor.
2. Göç: `baglanti_durumu(hedef uuid)` — `sosyal_gorunur` kapısından
   geçiyor, `responded_at` + `baglanti_red_bekleme()` ile yeniden deneme
   anını dönüyor.
3. Doğrulama: test yeşil.

**Bitti sayılır:** arayüzün bağlantı durumunu tek sorguda ve sızıntısız
öğrenebileceği kapı hazır.

---

### G8.5 · Ara doğrulama (ana oturum)
- `supabase db reset` ile **tüm göçler sıfırdan** yerel veritabanına
- Yerel güvenlik test betiği + yeni senaryolar (tasarım §7)
- `node --test tests/*.test.mjs`, `npm run lint`, `npm run build`
- Geçmeyen tek bir kontrol varsa arayüz görevleri BAŞLAMAZ.

---

## B · ARAYÜZ (yalnız `stajimvar-frontend-builder` ajanı)

Her görev ajana ayrı ayrı verilir; ajan kapsam dışına çıkmaz ve tarayıcı
ölçümü yapmaz (ölçüm ana oturumda).

### G9 · Veri katmanı
**Dosya:** `src/lib/queries/sosyal.ts`

- `bolumleriGetir()` — katalog, `aktif`, `sira`
- `sosyalProfilKur()` **yeniden yazılıyor**: artık `upsert` değil,
  `rpc('sosyal_profil_kur', …)`; gövdeden `sector_id` KALKIYOR
- `bolumTalebiAc()`, `baglantiDurumu()`, `baglantiKur()`,
  `baglantiYanitla()`, `baglantiKaldir()`
- Hata eşlemesi: `bolum-bulunamadi` / `bolum-alani-tanimsiz` ayrı
  cümlelere; kısıt adına bakma kuralı (mevcut `kisitHatasi`) korunuyor
- Test: gövdede `sector_id` geçmiyor; RPC adları ve parametreleri
  şemadakiyle aynı; sıfır satır 0 sayılmıyor

### G10 · Kurulumda bölüm seçimi
**Dosyalar:** `BolumSecimi.tsx` (yeni), `SosyalProfilKurulum.tsx`

- 15 alanlı radyo listesi **kaldırılıyor**; yerine 42 bölümlü, gruplu,
  aranabilir seçim
- Ekranda **alan seçici YOK**; alanın bölümden türetildiği tek cümleyle
  anlatılıyor
- Seçilen bölümün alanı önizlenmiyor (sunucu türetecek); eşleme yoksa
  kayıttan sonra dürüst ekran çiziliyor
- "Profilimi yayımla" onay kutusu ve varsayılan kapalı davranışı KORUNUYOR
- Test: alan seçici yok; bölüm listesi katalogdan; `min-h-11`; odak halkası

### G11 · Eşleme yok / bölüm yok durumu ve talep
**Dosyalar:** `BolumTalebi.tsx` (yeni), `SosyalProfilSayfasi.tsx`

- İki ayrı dürüst ekran: "bölümün listede yok" ve "bölümün için alan
  topluluğu henüz tanımlı değil"
- Talep formu; gönderildikten sonra "bekliyor" durumu; **sahte onay yok**
- "Doğrulanmış öğrenci" ima eden metin YOK
- Test: iki durumun cümleleri ayrı; talep sonrası erişim iddiası yok

### G12 · Ziyaretçi profil görünümü
**Dosyalar:** `SosyalProfilGorunumu.tsx`, `SosyalProfilSayfasi.tsx`

- `sahibiMi` yanlış dalı ilk kez çiziliyor
- Sorgu yolu `profile_id` üzerinden; kullanıcı adı yalnız kimliğe çevrim
- Görünmeyen/olmayan/farklı alan üç durumu **aynı** güvenli ekran
- Sahibe özel hiçbir şey (dişli, yayımlama uyarısı, düzenle) ziyaretçide
  DOM'a girmiyor
- Test: `sahibiMi` koşulunun içindekilerin listesi; tek güvenli ekran

### G13 · Bağlantı düğmesi ve durumları
**Dosyalar:** `BaglantiDugmesi.tsx` (yeni), `SosyalProfilGorunumu.tsx`

- Yedi durum; her birinin kendi etiketi ve eylemi
- İşlem sırasında kilit (`gonderiliyor`), hata dalı dürüst, iyimser
  güncelleme yok
- `baglanti_durumu` sıfır satır dönerse düğme **DOM'a hiç girmiyor**
- 30 günlük bekleme: kalan süre tarih olarak yazılıyor, sahte "yakında" yok
- Test: yedi durum; kilit; sıfır satırda düğme yok

### G14 · `/baglantilar` sayfası
**Dosyalar:** `BaglantilarSayfasi.tsx` (yeni), `src/App.tsx` (yalnız rota)

- Tek sayfa, üç bölüm: **Bağlantılar · Gelen istekler · Gönderilen
  istekler**. Ayrı rota ya da sekme adresi YOK.
- Eylemler: kabul, reddet, geri çek, bağlantıyı kaldır — her biri
  kilitli, hata dalı dürüst, iyimser güncelleme yok.
- Profildeki "Bağlantı" sayısına basmak bu sayfaya götürüyor; sayı
  bilinmiyorsa (sıfır satır) ne sayı ne bağlantı çiziliyor.
- Karşı tarafın profili RLS yüzünden gelmiyorsa "profil şu anda
  görüntülenemiyor" — ad uydurulmuyor.
- **"takipçi", "takip edilen", "takip et" hiçbir yerde geçmiyor.**
- Yorum, mesaj, bildirim merkezi EKLENMİYOR.
- Test: üç bölüm; her birinde dört durum (yükleniyor/boş/hata/dolu);
  yorumsuz kaynakta "takip" kelimesi geçmiyor; rota bağlanmış.

---

### G15 · Kullanıcıya görünen adlandırma değişimi
**Dosyalar:** `ProfilAyarMenusu.tsx`, `SosyalProfilGorunumu.tsx`,
`SosyalProfilKurulum.tsx`, `tests/sosyal-profil-arayuzu.test.mjs`

- Tasarım §3.6c'deki altı metin değişimi ("Alan topluluğuna katıl",
  "Topluluğa katıl", "Topluluktan ayrıl", "Alan topluluğuna henüz
  katılmadın", "Alan topluluğuna katıldın.", "Alan topluluğundan
  ayrıldın.").
- **Kod ve şema adları DEĞİŞMİYOR** (`yayinda_mi`, `yayimlamaDurumu`,
  `sosyalProfilGorunurluguAyarla`). Değişen yalnız ekran metni.
- Test: yeni metinler var; yorumsuz kaynakta kullanıcıya basılan
  dizelerde "yayımla"/"yayından" geçmiyor; kod adları duruyor.

---

### G16 · Asgari talep kuyruğu ekranı (yönetim)
**Dosyalar:** `src/components/yonetim/BolumTalepleri.tsx` (yeni),
`src/App.tsx` (yalnız rota), `src/lib/queries/sosyal.ts`

- `/yonetim/bolum-talepleri`; mevcut yönetim ekranı kalıbını izler,
  yeni bir panel mimarisi kurulmaz.
- Bekleyen talepler listelenir; kabul iki **kapalı listeden** seçim
  ister (bölüm + alan), ret **zorunlu gerekçe** ister.
- Kullanıcının serbest metni yalnız okunur; forma önceden doldurulmaz —
  yöneticinin yanlışlıkla onaylamasını kolaylaştırmamak için.
- Dört durum çizilir; boş kuyruk dürüst.
- Test: kapalı liste seçimi zorunlu; gerekçesiz ret gönderilemiyor;
  serbest metin bir girdi kutusuna kopyalanmıyor.

---

## C · AŞAMA SONU DOĞRULAMA (ana oturum)

1. `supabase db reset` — tüm göçler sıfırdan, yerel
2. Yerel güvenlik betiği: tasarım §7'deki bütün senaryolar
3. `node --test tests/*.test.mjs` — sıfır düşen
4. `npm run lint` (tsc), `npm run build`
5. Tarayıcı, **1440×900 ve 390×844**, yerel Supabase + gerçek oturum:
   - kurulumda alan seçici olmadığı, rozetin eşlemeden geldiği
   - eşlemesi olmayan bölümde dürüst ekran + talep
   - ziyaretçi profilinin üç durumu
   - bağlantı düğmesinin yedi durumu, çift tıklama, hata dalı
   - görünmeyen profilde düğmenin DOM'da olmadığı
   - 44 px hedefler, odak dönüşü, Escape, yatay taşma 0
   - uzun bölüm/üniversite adlarıyla taşma yok
   - `/baglantilar` üç bölümü ve dört durumu; "Bağlantı" sayısından
     sayfaya geçiş; "takip" kelimesinin hiçbir yerde geçmediği
   - yeni metinler ("Alan topluluğuna katıl", "Topluluktan ayrıl") ve
     ekranda "yayımla" kelimesinin kalmadığı
   - profilde resmî bölüm adının `departments`'tan geldiği, "Eğitim
     notu"nun yalnız doluyken ikincil satır olarak çizildiği
   - `/yonetim/bolum-talepleri`: kapalı liste seçimi zorunlu, gerekçesiz
     ret gönderilemiyor, serbest metin girdiye kopyalanmıyor
   - sayacın gösterilen paylaşım sayısıyla tuttuğu (dört bakan tipi)
6. Geçici ortam `supabase stop` ile durdurulur (`--all` ve `--no-backup`
   yok); `.playwright-mcp` ve build artıkları temizlenir
7. Rapor: geçen / düşen / ÇALIŞTIRILMADI ayrı başlıklarda

---

## D · YAPILMAYACAKLAR (bu planın dışında)

- Paylaşım oluşturma akışı ve kitle seçicisinin arayüzü
- Depolama kovası, avatar, paylaşım görselleri
- Yorum, mesaj, bildirim merkezi, şikâyet ekranı, öne çıkanlar
- Okul e-postası / öğrenci belgesi doğrulaması
- Çok alanlı bölüm desteği
- Mevcut kullanıcılara bölüm/alan geri doldurma
- Commit, push, deploy, canlı Supabase

---

## E · Görev bağımlılıkları

```
G0 (eşleme onayı, ürün sahibi — taslak hazır)
      │  engellemiyor; boş tabloyla G1–G16 tamamlanabilir
      │  onay gelince ayrı seed göçü: 20260923090000_bolum_alan_seed.sql
      ▼
G1 ─► G2 ─► G3 ─► G4 ─┬─► G5
                      ├─► G6 ─► G6b
                      ├─► G7
                      └─► G8 ─► G8.5 ─► G9 ─┬─► G10 ─► G11
                                            ├─► G12 ─► G13 ─► G14
                                            ├─► G15
                                            └─► G16 ─► C
```

Tahmini büyüklük: G1–G8 dokuz küçük göç + dört yeni test dosyası;
G9–G16 sekiz arayüz görevi. Her görev tek başına gözden geçirilebilir ve
tek başına geri alınabilir.

**Not:** G16 (yönetim ekranı) `src/components/yonetim/**` altında yeni
bir dosya açar; ana oturum bu klasöre hiç dokunmaz. G14 ve G16 `src/App.tsx`
içinde yalnız rota satırı ekler ve ikisi ARDIŞIK yürütülür — aynı dosyayı
iki görev aynı anda açmasın.
