# Sosyal portfolyo — hesap devri

Oluşturma: 2026-09-08 · **Son güncelleme: 2026-09-10**

Bu belge, StajımVar sosyal portfolyo çalışmasının başka bir Claude
hesabındaki Claude Code oturumuna devredilmesi içindir.

**Hiçbir şey commit, push ya da deploy edilmedi. Sosyal portfolyo işinin
tamamı çalışma ağacında duruyor.**

Devir anında çalışan ajan, çalışan komut ve devam eden dosya yazma işlemi
YOK (ölçüldü). Bu belge dışında hiçbir kaynak dosya değiştirilmedi.

> **2026-09-10 GÜNCELLEMESİ — ÖNCE BUNU OKU**
>
> 1. **Docker Desktop BOZUK; yerel Supabase şu an başlatılamıyor.** Ayrıntı
>    §1.1. Bu, doğrulama gerektiren her işi bloke ediyor.
> 2. **`git status` 55 giriş (4 M, 51 ??)** — bu belgenin ilk sürümü 38/39
>    yazıyordu. Fark ölçüldü ve §2.4'te kalem kalem açıklandı; **hiçbir
>    dosya kaybolmadı ya da eklenmedi**.
> 3. **§5'teki bütün doğrulama sayıları 2026-09-08 tarihli turdan.**
>    2026-09-10'da hiçbiri yeniden çalıştırılmadı (Docker kapalı).

---

## 1. DOĞRU ORTAM

| | |
|---|---|
| Proje klasörü | `C:\Users\ON\Desktop\stajimvar.com` |
| Git remote | `origin` → `git@github.com:stajimvar/stajimvar.com.git` (fetch ve push aynı) |
| Aktif dal | `sosyal-portfolyo` |
| HEAD | `b76ce3c` — "Tüm rehber kapaklarını özgün fotoğraflarla tamamla" |
| Upstream | `origin/main` |
| Ana dal | `main` — şu an `159a6d3` ("Instagram karusellerini açık tasarıma geçir") |

**HEAD bu çalışma boyunca hiç ilerlemedi.** Sosyal portfolyonun tamamı
(A + B + C) commit edilmemiş çalışma ağacı değişikliği olarak duruyor.

**`sosyal-portfolyo`, `origin/main`'in 3 commit gerisinde.** Bu üç commit
sosyal portfolyoyla ilgisiz (Instagram karuselleri, rehber kapakları).
Rebase/merge YAPILMADI ve yeni oturum da kendiliğinden yapmamalı.

### 1.1 BLOKAJ — Docker Desktop çalışmıyor

Belgenin ilk sürümü "Docker daemon ÇALIŞIYOR" diyordu. **Artık çalışmıyor.**

```
Docker Desktop encountered an unexpected error and needs to close.
starting services: initializing Ingest server: listening on
unix://C:/Users/ON/AppData/Local/Docker/run/sailor-ingest.sock: rename
.../sailor-ingest.sock .../sailor-ingest.sock.stale:
Sistem dosyaya erişemiyor.
```

Ölçülen durum (2026-09-10, **Windows yeniden başlatıldıktan SONRA**):

| | |
|---|---|
| Docker istemci | 29.7.2, build a7dcaa6 — kurulu |
| Docker daemon | **KAPALI.** `npipe:////./pipe/dockerDesktopLinuxEngine` hiç oluşmuyor |
| Docker Desktop süreçleri | 0 (yeniden başlatmadan sonra kendiliğinden açılmadı) |
| `%LOCALAPPDATA%\Docker\run` | **6 öksüz soket girişi hâlâ orada** |
| Docker Desktop kurulum yolu | `C:\Users\ON\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe` (Program Files altında DEĞİL) |

Denenen ve **sonuç vermeyen** adımlar — yeni oturum bunları tekrarlamasın:

1. Tüm Docker süreçlerini kapatmak (`taskkill`) — kapandı, soketler kaldı.
2. Soketleri silmek — Git Bash `rm` ve PowerShell `Remove-Item`, ikisi de
   **"Sistem dosyaya erişemiyor"**.
3. `wsl --shutdown` — çalışan başka WSL dağıtımı yoktu (`docker-desktop`
   zaten `Stopped`), soketler yine silinmedi.
4. Docker Desktop'ı yeniden başlatıp 170 sn beklemek — daemon gelmedi.
5. **Windows'u yeniden başlatmak — soketler yine silinmedi, daemon yine
   kapalı.** Bu, "reboot çözer" varsayımını çürüttü.

> **"Reset to factory defaults" BASILMADI ve önerilmiyor** — bütün Docker
> imajlarını ve volume'lerini siler. Bu görev için gereken tek şey yerel
> Supabase ve o zaten 99 göçten sıfırdan kuruluyor; yine de bu karar ürün
> sahibinin.
>
> Sıradaki makul adımlar (hiçbiri denenmedi): Docker Desktop'ı onarmak /
> yeniden kurmak, ya da `%LOCALAPPDATA%\Docker\run` klasörünü Explorer ile
> yeniden adlandırmayı denemek.

### 1.2 Araçlar

| | |
|---|---|
| Supabase CLI | 2.117.0 — **PATH'te VAR** (belgenin ilk sürümü "PATH'te yok" diyordu; düzeltildi). Mutlak yol da çalışıyor: `C:\Users\ON\scoop\shims\supabase.exe` |
| Node | v24 (depo betikleri bununla çalıştı) |
| Dev sunucu | Kapalı — 5173, 5174, 5199 dinlenmiyor (ölçüldü) |

### 1.3 Geçici yerel Supabase

| | |
|---|---|
| Klasör | `C:\Users\ON\AppData\Local\Temp\stajimvar-b-yerel-dogrulama` |
| Durum | **DURDURULMUŞ** — bu projeye ait çalışan konteyner yok. Docker kapalı olduğu için zaten başlatılamıyor. |
| Göç sayısı | 99 — **depodaki 99 göçle dosya adları birebir aynı** (2026-09-10'da `diff` ile ölçüldü, fark yok) |
| Uzak proje bağlantısı | **YOK.** `supabase/.temp/` altında yalnız `cli-latest` ve `start-secrets` var; `project-ref` dosyası YOK. |
| Hedef | Yerel — `config.toml`: `project_id = "stajimvar-b-yerel-dogrulama"`, `api_url = "http://127.0.0.1"` |
| Yeniden başlatma | `supabase start --workdir "C:\Users\ON\AppData\Local\Temp\stajimvar-b-yerel-dogrulama"` |
| İçerik | `supabase/config.toml`, `supabase/migrations/` (depodan kopya), `supabase/snippets/` ve doğrulama betikleri: `dogrula.mjs`, `guvenlik-testleri.mjs`, `denetim-dogrula.mjs`, `o16-ve-oracle.mjs`, `son-kontroller.mjs`, `karar-sizintisi.mjs`, `ui-fixture.mjs` |
| Anahtarlar | Bu belgeye YAZILMADI. Yerel demo anahtarları `supabase start` / `supabase status -o env` çıktısından alınır. |

> `.claude/launch.json` içindeki `stajimvar-dev` yapılandırması yerel
> Supabase değişkenlerini taşımıyor ve `.claude/` altına dokunmak yasak
> olduğu için dev sunucu ortam değişkenleriyle elle başlatılmalı.
> **`.env` DEĞİŞTİRİLMEZ.**

### 1.4 Ajan

`stajimvar-frontend-builder` **yüklü ve kullanılabilir** (2026-09-10'da
doğrulandı). Tanımı `.claude/agents/stajimvar-frontend-builder.md`.
`.claude/` altına DOKUNULMADI ve dokunulmayacak.

---

## 2. ÇALIŞMA AĞACI

Hiçbir şey "temiz" varsayılmadı. Aşağıdaki liste ölçülen `git status`
çıktısının tamamıdır: **55 giriş — 4 değiştirilmiş (M), 51 izlenmeyen (??)**.

diffstat (bu çalışmaya ait izlenen üç dosya):
`functions/_middleware.ts +6`, `src/App.tsx +97/-2`,
`src/components/AdminDashboard.tsx +23` — **toplam 124 ekleme, 2 silme**
(2026-09-10'da yeniden ölçüldü, ilk sürümle birebir aynı).

### 2.1 A aşaması — veri modeli ve RLS (5 göç, 4 test)

```
supabase/migrations/20260921010000_sosyal_katman_semasi.sql
supabase/migrations/20260921020000_sosyal_katman_rls.sql
supabase/migrations/20260921030000_sosyal_gecis_kurallari.sql
supabase/migrations/20260921040000_red_bekleme_ve_sektor_talebi.sql
supabase/migrations/20260921050000_baglanti_silme_kurali.sql
tests/sosyal-sektor-izolasyonu.test.mjs
tests/sosyal-gecis-kurallari.test.mjs
tests/sosyal-red-bekleme.test.mjs
tests/sosyal-baglanti-silme.test.mjs
```
Not: bu dört test dosyası B ve C aşamalarında da güncellendi.

### 2.2 B aşaması — profil kurulumu, görünürlük, güvenlik düzeltmeleri

```
src/lib/sosyal-kullanici-adi.mjs
src/lib/queries/sosyal.ts                 (C'de büyük ölçüde yeniden yazıldı)
src/components/sosyal/SosyalProfilSayfasi.tsx
src/components/sosyal/SosyalProfilKurulum.tsx
src/components/sosyal/SosyalProfilGorunumu.tsx
src/components/sosyal/SosyalProfilDuzenleme.tsx
src/components/sosyal/ProfilAyarMenusu.tsx
src/components/sosyal/PaylasimIzgarasi.tsx
src/components/sosyal/SosyalFormAlanlari.tsx
tests/sosyal-profil-arayuzu.test.mjs      (C'de genişletildi)
supabase/migrations/20260922010000_sosyal_guvenlik_duzeltmeleri.sql
src/App.tsx                               (M — rota bağlama + navigate({degistir}))
```

### 2.3 C aşaması — bağlantı akışı ve zorunlu bölüm–alan uygunluğu

Göçler (10):
```
supabase/migrations/20260923010000_bolum_katalogu.sql
supabase/migrations/20260923020000_bolum_alan_eslemesi.sql
supabase/migrations/20260923025000_bolum_alan_seed.sql
supabase/migrations/20260923030000_sosyal_kurulum_rpc.sql
supabase/migrations/20260923040000_yonetici_duzeltme_denetim.sql
supabase/migrations/20260923050000_bolum_talebi.sql
supabase/migrations/20260923060000_talep_kuyrugu_karari.sql
supabase/migrations/20260923070000_paylasim_kitlesi_ve_sayac.sql
supabase/migrations/20260923080000_baglanti_durumu_rpc.sql
supabase/migrations/20260923090000_talep_karar_aciklamasi.sql
```

Betik ve testler:
```
scripts/bolum-katalogu.mjs
tests/bolum-katalogu-tutarliligi.test.mjs
tests/sosyal-bolum-alan-uygunlugu.test.mjs
tests/sosyal-talep-kuyrugu.test.mjs
tests/sosyal-paylasim-kitlesi.test.mjs
tests/sosyal-baglanti-akisi.test.mjs
tests/sosyal-guvenlik-duzeltmeleri.test.mjs   (B güvenlik göçünün testi, C'de güncellendi)
```

Arayüz:
```
src/components/sosyal/BolumSecimi.tsx
src/components/sosyal/BolumTalebi.tsx
src/components/sosyal/BaglantiDugmesi.tsx
src/components/sosyal/BaglantilarSayfasi.tsx
src/components/yonetim/BolumTalepleri.tsx
src/components/AdminDashboard.tsx            (M — yalnız navigasyon girişi)
functions/_middleware.ts                     (M — /baglantilar tek satır)
src/App.tsx                                  (M — /baglantilar ve /yonetim/bolum-talepleri rotaları)
```

Belgeler:
```
docs/superpowers/specs/2026-09-08-sosyal-baglanti-ve-alan-uygunlugu-design.md
docs/superpowers/plans/2026-09-08-sosyal-baglanti-ve-alan-uygunlugu.md
docs/handoffs/2026-09-08-sosyal-portfolyo-hesap-devri.md   (bu belge)
```

### 2.4 BU ÇALIŞMAYA AİT OLMAYAN 16 KALEM (kullanıcıya ait — DOKUNMA)

Belgenin ilk sürümü 38/39 giriş sayıyordu; gerçek sayı 55. Fark tam 16
kalem ve **hiçbiri sosyal portfolyo işinin parçası değil**:

**1 değiştirilmiş:**
```
 M public/paylasim/setler.json
```
Bu bir **build yan etkisi**: her `npm run build` çalıştırmasında içindeki
tarih damgası değişiyor. Belgenin ilk sürümü "şu an temiz" diyordu; şu an
kirli. Geri almanın tek izinli yolu `git checkout -- public/paylasim/setler.json`
(§7'deki tek istisna). **Ürün sahibi "önce bildir" dediği için geri
ALINMADI.**

**15 izlenmeyen klasör** — paylaşım görseli setleri:
```
public/paylasim/basvuru-takip-epostasi/     public/paylasim/stajda-ilk-gun/
public/paylasim/mulakatta-deneyim-yok/      public/paylasim/stajda-net-eposta/
public/paylasim/staj-sonu-referans/         public/paylasim/stajda-profesyonel-tanisma/
public/paylasim/stajda-gecikme-bildirimi/   public/paylasim/stajda-teslim-kontrolu/
public/paylasim/stajda-geri-bildirim/       public/paylasim/stajda-toplanti-notu/
public/paylasim/stajda-gorev-onceligi/      public/paylasim/supheli-staj-ilani/
public/paylasim/stajda-gorevi-netlestir/    public/paylasim/uzaktan-staj-iletisim/
public/paylasim/stajda-hata-yapinca/
```

> **Bu 16 kalem, devir belgesinin ilk sürümü yazıldığı anda da çalışma
> ağacındaydı** — 2026-09-09'daki oturum başlangıcının `git status`
> anlık görüntüsüyle 2026-09-10'daki ölçüm birebir aynı. Yani belgenin
> sayımı bunları kapsam dışı bırakmış; **hiçbir dosya kaybolmadı, hiçbir
> dosya eklenmedi.**

### 2.5 Ayrı kalem — `.claude/` değişikliği

```
.claude/agents/stajimvar-frontend-builder.md
```
Bu, aşamaların ürün işi DEĞİL: frontend kodunu yazacak ajanın tanımı.
Ürün sahibi bunun raporlarda ayrı gösterilmesini istedi ve **"bundan
sonra `.claude/` altında başka değişiklik yapma"** dedi. O tarihten sonra
`.claude/` altına dokunulmadı.

### 2.6 Stash ve eski dallar

- `stash@{0}: On kesfet-ilan-duzeni: otomasyon-artiklari` — **kullanıcıya
  ait, bu çalışmayla ilgisi yok. DOKUNULMADI ve DOKUNULMAYACAK.**
- Eski dallar duruyor: `kesfet-ilan-duzeni`, `main`, `geo-frontend`,
  yedi `codex/*` dalı. Hiçbirine geçilmedi, hiçbiri değiştirilmedi.

### 2.7 Şeffaflık — bu depoda yapılmış ve YAYINA ÇIKMIŞ ilgisiz iş

Devri hazırlayan oturum, **2026-09-06'da `geo-frontend` dalında** sosyal
portfolyoyla ilgisi olmayan bir iş yaptı: Keşfet'teki coğrafi keşfin
askıya alınması, Keşfet şehir şeridi, ilan kartlarına ülke rozeti ve 48
Fransa staj ilanının girilmesi. **O iş commit edildi, `main`'e pushlandı
ve production'a deploy edildi.**

Ölçüldü: o commitler (`faa5a5b` ve öncesi) `b76ce3c`'nin **atası**, yani
zaten bu dalın tabanının içindeler; `origin/main` hepsini içeriyor
(`git rev-list --count geo-frontend ^origin/main` = 0). Kaybolan bir şey
yok.

Bu, §7'deki "commit/push/deploy yok" yasağıyla çelişmiyor: o yasak
**sosyal portfolyo işi için** geçerli ve o iş hâlâ tamamen commit
edilmemiş durumda.

---

## 3. TAMAMLANANLAR

### A aşaması — veri modeli ve RLS
- 12 tablo: `sectors`, `social_profiles`, `posts`, `post_media`,
  `post_likes`, `post_saves`, `connections`, `blocks`, `reports`,
  `category_pool`, `profile_categories`, `sector_requests`.
- Tamamında RLS açık; `anon` yetkileri geri alındı.
- Simetrik tek satırlı bağlantı; yön bağımsız tekil indeks
  (`least/greatest`).
- Red için 30 günlük bekleme; `responded_at` yalnız tetikleyiciyle yazılır.
- Reddedilmiş satırın silinmesi kapatıldı (bekleme süresi gerçek olsun).
- `profiles` / `student_profiles` RLS'ine DOKUNULMADI; e-posta ve telefon
  sosyal katmana hiçbir yoldan girmiyor.

### B aşaması — profil kurulumu ve görünürlük
- `/profil` ve `/profil/:kullaniciadi` rotaları; kanonik adrese
  `replaceState` ile yönlendirme (`navigate(to, { degistir })`).
- Kurulum ekranı, profil görünümü, düzenleme, dişli menüsü (masaüstü
  açılır menü / mobil alttan panel), paylaşım ızgarası.
- Sahiplik yalnız oturum kimliğinden; rotadaki kullanıcı adına
  güvenilmiyor. Depoda `.eq('username'` deseni sıfır kez geçiyor.
- Var/yok sızıntısı yok: görünmeyen, olmayan ve farklı alandaki profil
  aynı güvenli ekranı veriyor.

### Güvenlik düzeltmeleri (`20260922010000`)
Beş açık **yerel Supabase'de gerçek PostgREST istekleriyle ölçülüp**
kapatıldı:
1. **KRİTİK** — kullanıcı kendi `social_profiles` satırını silip farklı
   alanla yeniden kurabiliyordu (silme 200, yeniden kurulum 201). DELETE
   politikası ve tablo yetkisi birlikte kapatıldı.
2. Dahili yardımcılar (`engelli_mi`, `paylasim_sahibi`, `ayni_sektorde`,
   `aktif_sektor`, `sosyal_gorunur`) `/rpc/...` üzerinden çağrılabiliyor
   ve engel/yazar bilgisi sızdırıyordu. PostgREST'in sunmadığı
   `sosyal_gizli` şemasına taşındılar.
3. Görünürlük asimetrikti (yayımlamayan görünmeden gözlemliyordu);
   `sosyal_gorunur` simetrik hâle getirildi.
4. Arşivlenmiş paylaşım beğenilebiliyordu.
5. `anon` rolünün `sectors` / `category_pool` tablo yetkileri geri alındı.

### C aşaması — bölüm–alan modeli
- `departments` (42 bölüm, `src/data/bolumler.ts`'ten ÜRETİLEN seed,
  drift testi var).
- `department_sectors` — **bir bölüm = TAM OLARAK BİR alan** (birincil
  anahtar `department_id`). Çoklu alan ürün kararıyla kapalı.
- **Onaylanan 42 eşlemenin 42'si uygulandı**; alan listesi **8 yeni
  alanla 15 → 23**'e çıktı:
  `endustri-operasyon-yonetimi`, `mekatronik-otomasyon`,
  `ekonomi-isletme-yonetim`, `is-sagligi-guvenligi-kalite`,
  `kamu-siyaset-uluslararasi-iliskiler`, `hukuk-adalet`,
  `psikoloji-sosyal-bilimler`, `egitim-cocuk-gelisimi` (sıra 16–23).
  Var olan 15 alanın `sira` değerleri değişmedi.
  `otomotiv-mobilite` alanına bilerek hiçbir bölüm bağlı değil; testle
  sabitlendi.
- `sosyal_profil_kur()` RPC'si: **imzasında alan parametresi YOK**, alan
  bölümün onaylı eşlemesinden sunucuda türetiliyor.
- İstemci `sector_id`, `department_id` ve `username` kolonlarına
  YAZAMIYOR (kolon düzeyi yetki). `social_profiles` üzerinde INSERT
  yetkisi hiç yok; satır yalnız RPC ile açılıyor.
- `kimlik_kilidi()` tetikleyicisi ikinci kapı ("bir kez yazılır").
- Yönetici düzeltmesi yalnız `sosyal_bolum_duzelt()` ile, gerekçe zorunlu
  ve `social_profile_denetim` append-only kaydı yazılıyor.
- Eksik bölüm/eşleme talebi (`department_requests`) ve asgari yönetim
  kuyruğu (`bolum_talebini_karara_bagla` + `bolum_talep_denetim`).

### C aşaması — bağlantı ve paylaşım kitlesi
- **Karşılıklı bağlantı** modeli; takipçi/takip edilen YOK.
- Profilde **tek "Bağlantı" sayacı**.
- `baglanti_durumu()` RPC'si: yedi durum, görünmeyen hedef için sıfır satır.
- `/baglantilar` sayfası: Bağlantılar · Gelen istekler · Gönderilen
  istekler (tek sayfa, üç bölüm).
- `posts.kitle`: `baglantilarim` (varsayılan, DAR) veya `alan-toplulugum`.
  Kural tek yardımcıdan (`paylasim_gorunur`) geçiyor ve `posts`,
  `post_media`, `post_likes`, `post_saves` dördüne birden uygulanıyor.
  **Farklı alan iki kitlede de göremiyor.**
- Paylaşım sayacı kitleye göre süzülüyor; gösterilen sayı gösterilen
  içerikle birebir tutuyor, erişimi olmayana sıfır satır.
- Ürün dili: **"Alan topluluğuna katıl" / "Topluluktan ayrıl"**
  (şema adı `yayinda_mi` değişmedi).
- **Mesaj, yorum, bildirim merkezi, şikâyet ekranı ve paylaşım oluşturma
  YOK** — hiçbirinin düğmesi de çizilmedi.

---

## 4. SON DÖRT C KARARI

| # | Karar | Durum |
|---|---|---|
| 1 | Yönetim paneline "Bölüm talepleri" bağlantısı | **TAMAMLANDI** |
| 2 | Kullanıcının yalnız kendi güvenli karar açıklamasını görmesi | **TAMAMLANDI** |
| 3 | Ziyaretçi boş ızgarasında "Görebileceğin bir paylaşım yok." | **TAMAMLANDI** |
| 4 | Başkasının "Bağlantı" sayısının düz metin kalması | **TAMAMLANDI** |

**Dördü de TAMAMLANDI. YARIM KALAN ya da BAŞLANMAMIŞ görev YOK.**

**1 — Yönetim paneli girişi.** `AdminDashboard.tsx` içindeki mevcut düğme
şeridine eklendi ("Keşfet etkinlikleri · Onay kuyrukları · **Bölüm
talepleri** · Gönderi paylaş · Siteye dön"). Ayrı navigasyon sistemi
kurulmadı. Yetkisiz kullanıcıda DOM'a hiç girmiyor (ölçüldü: yetkisiz
`/yonetim` sayfasında toplam 1 bağlantı var ve o "Siteye dön").
Bekleyen talep SAYISI bilerek konmadı — o sayıyı üreten sorgu yok,
uydurulmadı.

**2 — Karar açıklaması.** İki ayrı kanal:
`department_requests.karar_aciklamasi` kullanıcıya,
`bolum_talep_denetim.gerekce` yalnız yöneticiye. Karar RPC'si altı
parametreli; eski beş parametreli sürüm DÜŞÜRÜLDÜ ki açıklamasız karar
yolu kalmasın. İkisi de zorunlu (≥5 karakter). Kullanıcı
`karar_aciklamasi` kolonuna yazamıyor. Eski satırlarda değer NULL kalıyor
ve arayüz o durumda sebebi HİÇ ANMIYOR.

**3 — Boş ızgara.** Ziyaretçi: "Görebileceğin bir paylaşım yok."
Sahibi: "Henüz paylaşım yok." (korundu). `sahibiMi` prop'unun varsayılanı
bilerek `false` — prop unutulursa ziyaretçiye bir paylaşımın YOKLUĞUNU
iddia eden cümle çıkmasın. Gizli paylaşım imasında bulunan metin yok.

**4 — Bağlantı sayısı.** `/baglantilar` bağlantısı yalnız `sahibiMi`
dalında; ziyaretçide düz metin. Bu zaten doğruydu, kod değişmedi, yalnız
davranışı kilitleyen test eklendi. Başkasının bağlantı listesini
gösterecek hiçbir şey eklenmedi.

---

## 5. DOĞRULAMA KANITLARI

> **UYARI — TARİH.** Aşağıdaki bütün sayılar **2026-09-08 tarihli turda**
> çalıştırıldı. **2026-09-10'da hiçbiri yeniden çalıştırılmadı**, çünkü
> Docker daemon kapalı (§1.1) ve yerel Supabase başlatılamıyor. Yeni
> oturum bunları "az önce ölçüldü" diye sunmamalı.

### 5.1 Son tur (2026-09-08, C aşamasının dört kararı sonrası — bu sırayla)

| Kontrol | Sonuç | Yeniden ölçüldü mü? |
|---|---|---|
| Göç | **99/99** sıfırdan YALNIZ yerel Supabase'e uygulandı (`supabase db reset --workdir <geçici>`), hata yok, `{"target":"local"}` | 2026-09-10: dosya sayısı ve adları doğrulandı (99 = 99, fark yok); **göç ÇALIŞTIRILMADI** |
| Yerel PostgREST/RLS sızıntı testi | **15/15 geçti** (`karar-sizintisi.mjs`) | hayır |
| Tam test takımı | `node --test tests/*.test.mjs` → **1359 test, 1359 geçti, 0 hata** | hayır |
| lint / typecheck | `npm run lint` (`tsc --noEmit`) → **temiz** | hayır |
| build | `npm run build` → **başarılı, 640 sayfa ön render** | hayır |
| Tarayıcı 1440×900 | §5.2 | hayır |
| Tarayıcı 390×844 | §5.2 | hayır |

**Sızıntı testinin kapsadıkları (gerçek HTTP):** kullanıcı kendi karar
açıklamasını okuyor; iç not satırında yok; başkasının talebi kimlikle,
`like` süzgeciyle ve `or=` ile okunamıyor; `bolum_talep_denetim`
kullanıcıya kapalı; ilişki genişletmesiyle iç not sızmıyor; yönetici iç
notu görüyor; kullanıcı karar açıklamasını kendisi yazamıyor (403/42501);
açıklamasız karar reddediliyor (400 / `aciklama-zorunlu`); anon 401.

### 5.2 Tarayıcı sonuçları (2026-09-08, yerel Supabase + gerçek oturum)

**1440×900** — yönetici panelinde "Bölüm talepleri" var ve kuyruğu açıyor;
karar formunda iki metin alanı ("Yönetim notu (kullanıcıya gösterilmez)"
ve "Kullanıcıya gösterilecek açıklama"); ikisi de boşken iki ayrı
`role="alert"` uyarısı ve talep kuyrukta kalıyor; yalnız iç not doluyken
tek uyarı; kullanıcının serbest metni hiçbir girdiye kopyalanmıyor;
yetkisiz kullanıcıda giriş DOM'da yok; talep sahibi kendi açıklamasını
görüyor, iç not sızmıyor; sahibi boş ızgarada "Henüz paylaşım yok." ve
Bağlantı sayısı `<a href="/baglantilar">`; ziyaretçide "Görebileceğin bir
paylaşım yok." ve Bağlantı DÜZ METİN; yatay taşma 0.

**390×844** — ziyaretçi boş ızgara metni ve düz metin sayaç aynı; karar
açıklaması görünüyor, iç not sızmıyor, metin kutudan taşmıyor; panelde
"Bölüm talepleri" ekran içinde; yatay taşma 0.

### 5.3 Önceki turların sayıları (2026-09-08, daha erken)

| Tur | Sonuç |
|---|---|
| C aşaması ana turu | 98 göç; tam takım **1342/1342**; lint temiz; build 640 sayfa; 1440 ve 390 tarayıcı doğrulaması |
| C veri modeli kapısı (G8.5) | 98 göç; **1311/1311** |
| Güvenlik düzeltmeleri turu | 89 göç; zorunlu yerel güvenlik testleri **35/35**; tam takım **1202/1202** |
| B aşaması sonu | tam takım **1220/1220** |

### 5.4 Başarısız olup düzeltilenler (hiçbiri açık değil)

1. Kurulum RPC'si ikinci çağrıda `yayinda_mi`'yi sessizce kapatıyordu —
   test yakaladı, RPC düzeltildi (`yayinda_mi` yalnız satır ilk
   açılırken parametreden geliyor).
2. Mevcut beş SQL test dosyasının fixture'ları yayımlanmış profil açarken
   bölüm vermiyordu; yeni `yayin_icin_kimlik_sart` kısıtı onları düşürdü.
   Fixture'lar eşlemeden bölüm okuyacak şekilde düzeltildi.
3. Eski testler "kullanıcı `sector_id` yazmayı dener, tetikleyici
   reddeder" diyordu; artık istek yetki katmanında duruyor. İddialar yeni
   ve daha güçlü garantiye taşındı; yönetici testleri düzeltme RPC'sine
   geçirildi.
4. Bir istisna metnini yeniden yazarken "sektör"den "alan"a çevirmiştim;
   12 test düştü. Metin orijinaline döndürüldü ve iki fonksiyonun bütün
   istisna dizeleri orijinalle karşılaştırıldı (fark yok).
5. Karar RPC imzası değişince eski imzayı bekleyen ölçüm düştü; iddia yeni
   imzaya taşındı.

### 5.5 HİÇ ÇALIŞTIRILMAMIŞ kontroller

- **2026-09-10'da hiçbir doğrulama** — Docker kapalı (§1.1).
- Gerçek ekran okuyucuyla (NVDA / VoiceOver) doğrulama.
- Aynı göç dosyasını elle ikinci kez çalıştırma (ürün sahibi zorunlu
  saymadı). Bu yüzden salt-okunur incelemedeki iki idempotency bulgusu
  (`20260921050000`'de eksik `drop policy if exists`; `20260921020000`
  replay'inin geniş DELETE politikasını geri getirmesi) kaynak düzeyinde
  kaldı.
- Denetimin dokunulmayan arayüz maddeleri: masaüstü menüsünde Tab tuzağı,
  `role="menu"` ok tuşu gezinmesi, mobil panelde arka plan kaydırma
  kilidi, iki bildirimin zamanlayıcı çakışması, `navigator.share`
  AbortError yolu, menü açıkken kırılım noktası geçişi.
- Depolama kovası gerektiren avatar / paylaşım görseli akışı (hiçbir
  göçte kova tanımlı değil).
- **Üretim veritabanı: göçlerin hiçbiri canlıya uygulanmadı.** Bu
  ekranlar bugün canlıda PostgREST hatasına düşer; dağıtım ayrı ve
  bilinçli bir karar.

### 5.6 AÇIK BULGULAR — düzeltilmedi, yeni oturuma devrediliyor

1. **Yönetim düğmeleri 42 px.** Mevcut yönetim ekranı kalıbından geliyor.
   44 px erişilebilirlik dokunma hedefinin altında. **İleride
   düzeltilmeli**; bu turda kapsam dışı bırakıldı.
2. **Yerel testte görülen `listings` 403 ve refresh-token 400 hataları.**
   İnceleme sonucu bunlar **sosyal katmandan kaynaklanmıyor**, ancak
   **yeniden doğrulanmalı**. Docker açıldığında kontrol listesine alınsın.

---

## 6. ÜRÜN VE GÜVENLİK KURALLARI (değişmez)

1. **Alan kullanıcı tarafından seçilemez.** Öğrenci kontrollü listeden
   bölümünü seçer; alanı sunucu onaylı eşlemeden üretir. RPC imzasında
   alan parametresi yoktur.
2. **Elektrik-Elektronik öğrencisi Tekstil topluluğuna giremez.** Testle
   ölçülüyor: `elektrik-elektronik-muhendisligi` →
   `elektrik-elektronik-enerji`; Tekstil alanına yalnız iki bölüm bağlı.
3. **Alan/bölüm kimliği silme, yeniden kurulum, upsert ya da
   değiştirilmiş istekle aşılamaz.** Üç kapı: kolon yetkisi, RPC,
   `kimlik_kilidi` tetikleyicisi.
4. **Topluluğa katılmayan** başka profilleri göremez ve bağlantı isteği
   gönderemez; kendi profilini hazırlamaya devam eder.
5. **Bağlantı karşılıklıdır; takip modeli yoktur.** Tek "Bağlantı" sayacı.
   "takipçi / takip edilen / takip et" kelimeleri hiçbir yerde geçmez.
6. **Varsayılan paylaşım kitlesi `baglantilarim`**; `alan-toplulugum`
   paylaşım bazında seçilir.
7. **Farklı alan hiçbir kitlede içeriği göremez.**
8. **Gerçek kullanıcıya bölüm/alan uydurulmaz.** Geri doldurma yok;
   `student_profiles.department` serbest metin ve kaynak olarak
   kullanılmaz.
9. **Frontend kodunu yalnız `stajimvar-frontend-builder` ajanı yazar.**
   Ana oturum veri modeli / RLS / RPC / SQL testlerini yazar. İki taraf
   aynı turda aynı dosyayı açmaz.
10. Sahte veri, sahte sayaç, sahte başarı ve "yakında" vaadi yok. Arka ucu
    olmayan özelliğin düğmesi de çizilmez.
11. Bölüm bilgisi bu sürümde **beyandır**; hiçbir yerde "doğrulanmış
    öğrenci" denmez.

---

## 7. YASAKLAR

- Canlı veya uzak Supabase'e bağlanmak **yok**.
- `supabase login`, `supabase link`, `db push`, `--linked` **yok**.
- Commit, push, deploy **yok**.
- `git reset`, `git checkout <dal>`, stash oluşturma / uygulama / silme
  **yok**. (Tek istisna, build'in ürettiği
  `public/paylasim/setler.json` damgasını geri almak için
  `git checkout -- public/paylasim/setler.json`.)
- Eski dallara ve kullanıcının `stash@{0}` kaydına müdahale **yok**.
- `.claude/`, `.env`, `.env.example`, `supabase/config.toml`,
  `package.json` **değiştirilmez**.
- D aşamasına kendiliğinden geçmek **yok**.
- Sahte profil, sahte sayaç, üretim fallback'i **yok**.
- Parola, anahtar, token ve gerçek kullanıcı verisi hiçbir belgeye
  yazılmaz.
- **Docker Desktop "Reset to factory defaults" ürün sahibinin açık onayı
  olmadan kullanılmaz** (bütün imaj ve volume'leri siler).

---

## 8. YENİ OTURUM BAŞLANGIÇ TALİMATI

Aşağıdaki metni yeni hesaptaki Claude Code oturumuna **olduğu gibi** tek
mesaj olarak gönder.

---

```
StajımVar sosyal portfolyo çalışmasını devralıyorsun. Proje klasörü:
C:\Users\ON\Desktop\stajimvar.com

ÖNCE OKU, SONRA HİÇBİR ŞEY YAZMA:
1. docs/handoffs/2026-09-08-sosyal-portfolyo-hesap-devri.md — tamamını
2. docs/superpowers/specs/2026-09-08-sosyal-baglanti-ve-alan-uygunlugu-design.md
3. docs/superpowers/plans/2026-09-08-sosyal-baglanti-ve-alan-uygunlugu.md

SONRA ORTAMI YENİDEN DOĞRULA (okuyup raporla, DEĞİŞTİRME):
- git remote -v, aktif dal, HEAD, upstream
- git status --short → 55 giriş bekleniyor: 4 M, 51 ??
  Bunun 16'sı bu çalışmaya AİT DEĞİL (devir belgesi §2.4): 15 adet
  public/paylasim/<slug>/ klasörü ve public/paylasim/setler.json.
  Bu 16 kaleme DOKUNMA, setler.json'ı da geri ALMA.
- git stash list — stash@{0} "otomasyon-artiklari" duruyor mu
- Değişen üç dosyanın farkı: functions/_middleware.ts (+6),
  src/App.tsx (+97/-2), src/components/AdminDashboard.tsx (+23)
  → toplam 124 ekleme, 2 silme olmalı
- Devir belgesindeki dosya listesiyle gerçek çalışma ağacını karşılaştır;
  fark varsa ÖNCE bana bildir, kendi başına düzeltme.

AJANI DOĞRULA:
- stajimvar-frontend-builder ajanının bu oturumda YÜKLÜ olduğunu kontrol
  et. Yüklü değilse frontend kodu yazma, başka ajanla da yazdırma;
  yalnız blokajı bildir. Ajan tanımı .claude/agents/ altında ama
  .claude/ altına DOKUNMA.

BİLİNEN BLOKAJ — ÖNCE BUNU ÇÖZ:
Docker Desktop BOZUK, daemon açılmıyor ve bu yüzden yerel Supabase
başlatılamıyor. Hata: sailor-ingest.sock dosyası .stale olarak yeniden
adlandırılamıyor; %LOCALAPPDATA%\Docker\run altında silinemeyen 6 öksüz
soket var. ŞUNLAR DENENDİ VE İŞE YARAMADI, tekrarlama: süreçleri
öldürmek, soketleri rm/Remove-Item ile silmek, wsl --shutdown, Docker
Desktop'ı yeniden başlatmak, WINDOWS'U YENİDEN BAŞLATMAK.
Docker Desktop kurulum yolu: C:\Users\ON\AppData\Local\Programs\DockerDesktop\
"Reset to factory defaults" seçeneğini ürün sahibinin açık onayı olmadan
KULLANMA. Docker açılmadan göç/RLS/sızıntı testleri çalıştırılamaz;
node --test, tsc ve npm run build ise Docker olmadan da çalışır.

KOD YAZMADAN ÖNCE YEREL SUPABASE HEDEFİNİ DOĞRULA:
- Geçici proje: C:\Users\ON\AppData\Local\Temp\stajimvar-b-yerel-dogrulama
  (99 göç, depodakiyle birebir aynı; uzak projeye BAĞLI DEĞİL)
- Supabase CLI 2.117.0 ve PATH'te; mutlak yol da çalışır:
  C:\Users\ON\scoop\shims\supabase.exe
- start ettikten sonra hedefin 127.0.0.1 olduğunu ÖLÇ; herhangi bir
  komut uzak proje, giriş, anahtar ya da parola isterse İPTAL ET ve
  bildir. Anahtarları hiçbir çıktıya, log'a veya belgeye YAZMA.

DURUM: A, B ve C aşamaları tamamlandı. Son dört C kararının DÖRDÜ DE
tamamlandı. Devir belgesinde YARIM KALAN GÖREV YOK. Tamamlanmış işi
TEKRAR YAPMA; göçleri yeniden yazma, 42 eşlemeyi yeniden üretme,
testleri yeniden kurma.

DEVREDİLEN İKİ AÇIK BULGU (devir belgesi §5.6):
1. Yönetim düğmeleri 42 px; 44 px erişilebilirlik hedefinin altında,
   ileride düzeltilmeli.
2. Yerel testte görülen listings 403 ve refresh-token 400 hataları
   sosyal katmandan kaynaklanmıyor ama YENİDEN DOĞRULANMALI.

DOĞRULAMA SAYILARI ESKİ: Devir belgesi §5'teki bütün sayılar 2026-09-08
turundan (99/99 göç, 15/15 sızıntı, 1359/1359 test, lint temiz, build 640
sayfa). 2026-09-10'da hiçbiri yeniden çalıştırılmadı. Bunları "az önce
ölçüldü" diye sunma.

YASAKLAR (değişmez):
- Canlı/uzak Supabase yok; login, link, db push, --linked yok
- Commit, push, deploy yok
- reset/checkout/stash yok; eski dallara ve stash@{0}'a dokunma
- .claude/, .env, supabase/config.toml, package.json değiştirme
- D aşamasına kendiliğinden geçme
- Frontend kodunu yalnız stajimvar-frontend-builder ajanı yazsın
- Sahte veri, sahte sayaç, sahte başarı yok

Bu adımları bitirdikten sonra durumu tek blokta raporla ve benim yeni
talimatımı bekle. Ben söylemeden D aşamasına geçme ve yeni özellik ekleme.
```
