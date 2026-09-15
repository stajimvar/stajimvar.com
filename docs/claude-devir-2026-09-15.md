# Claude devir belgesi — 15 Eylül 2026

Bu belge bir sonraki Claude'un bağlamsız başlaması için yazıldı. Yalnız
**ölçülmüş** bilgi var; tahmin ve plan yok.

---

## 1. Main ve canlı durum

| | |
|---|---|
| main commit | `06e11b0` — "Dagitim engeli: manifestten turetilen sayilar + CLI surumu sabit (#102)" |
| Canlı | https://stajimvar.com — Cloudflare Pages, son dağıtım success (`cloudflare_production` yeşil) |
| Veritabanı | Supabase, proje `gdumgdgwlfnohkaucfow` (Frankfurt) |
| Test | **1770 test, 1770 geçiyor, çıkış kodu 0** |
| Tip denetimi | `src` ve `functions` tsc temiz |
| Ön render | 568 sayfa |
| CI | Sürüm hattının 5 işi + disposable security tests + schema audit: **hepsi yeşil** |

**Canlı ölçümler (15 Eylül 2026):**

- Yayında staj ilanı: **158**
- Etkin ilan kaynağı: **42** (`automation/sources.json`, `enabled`)
- İşveren kariyer sayfası (dizin): **44** — açık program 0, bilinmiyor 39, ölçülmedi 5
- Aktif fırsat: **112** (+10 süresi geçmiş, arşivde)
- Fırsat kaynak durumu: ok 101, geçici hata 11, kesin kapalı 0 (biri geri açıldı, §2)

> **İki sayıyı karıştırma:** 42 = ilan *topladığımız* sistemler.
> 44 = ilan toplamadığımız, yalnız durumunu ölçtüğümüz işveren kariyer
> adresleri. Hiçbir yerde toplanmıyorlar.

---

## 2. Tamamlanan paketler ve önemli PR/göçler

Son turlarda kapanan işler (hepsi canlıda doğrulanmış):

| Paket | PR | Göç |
|---|---|---|
| İşveren dizini veri modeli + kontrol işçisi | #87 | `20261006010000_isveren_kariyer_kontrolleri` |
| Dizin arayüzü + gerçek istatistikler + Hakkımızda | #88 | `20261007010000_isveren_program_adresi` |
| Adressiz "açık" güvenilmez | #89 | — |
| Kapsam oranı / damga düzeltmeleri | #90, #91 | — |
| Schema audit yarışı + CLI sürümü sabit | #92, #93 | — |
| **İlan yayını istisnasız yönetici onayına bağlı** | #94, #95 | `20261008010000_ilan_yayini_yonetici_onayina_bagli` |
| Fırsat kaynak kontrolü retry + tutar iddiası | #96 | — |
| Kesin kapanış eşiği ayrıldı | #97, #98 | — |
| **Fırsat kapanış güvenliği (24 saat) + tutar satırı** | #99 | `20261009010000_firsat_kapanis_guvenligi` |
| Detay sayfası tutar ifadesi | #100 | — |
| Devir belgesi | #101 | — |
| **Dağıtım engeli: türetilen sayılar + CLI sürümü sabit** | #102 | — |

### Bu turda düzeltilen iki şey (ayrıntı)

**Fırsat kapanış güvenliği.** Eşik "art arda iki kesin hata" diyordu ama
iki ölçümün ne kadar arayla yapıldığını sormuyordu. İşçiyi elle iki kez
koşturdum (~30 dk arayla) ve bir burs `expired` oldu — o iki ölçüm
bağımsız değildi. Artık `source_failure_last_at` kolonu var ve sayaç
**yalnızca son sayılan hatadan 24 saat sonra** artıyor. Kurumun kendi
sayfasında "başvurular kapandı" yazıyorsa tek ölçümde kapanıyor (gövde
okunuyor; HTTP 200 artık açık kanıtı olarak da kullanılamıyor). Bir 404
bu dala girmiyor. Göç, benim yanlış kapattığım kaydı geri açtı.

**Tutar gösterimi.** `opportunityAmount` iki alan döndürüyor: `satir`
(detay) ve `kartSatiri` (liste). `belirtilmemis` durumunda `kartSatiri`
null — kartta satır çizilmiyor. Detayda "Tutar doğrulanamadı" duruyor.
Doğrulanmış rakam ve kaynağın kendi ifadeleri ("Mali destek
sağlanıyor", "Tutar kurumca açıklanacak", "Ücretsiz") kartta kalıyor.

---

## 3. Çalışan workflow ve cron'lar

| Workflow | Cron (UTC) | TRT | İş |
|---|---|---|---|
| `ilan-bildirim-kuyrugu.yml` | `25 * * * *` | saat başı | İlan bildirimi e-posta kuyruğu |
| `stajimvar-automation.yml` | `17 * * * *` | saat başı | İlan toplama / içe aktarma |
| `ilan-baglanti-kontrolu.yml` | `40 4 * * *` | 07:40 | İlan bağlantısı + **işveren kariyer sayfası** kontrolü |
| `firsat-kaynak-kontrolu.yml` | `10 5 */3 * *` | 08:10, **3 günde bir** | Fırsat kaynak/kapanış kontrolü |
| `kesif-radari.yml` | `35 5 * * *` | 08:35 | Keşif radarı |
| `gunluk-ozet.yml` | `0 6 * * *` | **09:00** | Kayıtlı arama günlük özeti |

Push ile tetiklenenler: `supabase-production.yml` (sürüm hattı),
`supabase-disposable-security-tests.yml` (RLS regresyonu),
`supabase-schema-baseline-audit.yml` (şema temeli).

> Türkiye kalıcı olarak UTC+3, yaz saati yok — cron'a sabit 3 saat
> ekleyebilirsin.

**İkinci zamanlama sistemi kurma.** Yeni bir periyodik iş gerekiyorsa
mevcut bir workflow'a adım ekle.

---

## 4. Gerekli secret adları (değerler YOK)

GitHub Actions repository secrets:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
VITE_SUPABASE_ANON_KEY
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
RESEND_API_KEY
RESEND_FROM
ILAN_BILDIRIM_ALICI
OZET_ABONELIK_SIRRI
GEOAPIFY_API_KEY
BRAVE_SEARCH_API_KEY
```

Kök dizindeki `.env` **yalnız** `VITE_SUPABASE_URL` ve
`VITE_SUPABASE_ANON_KEY` taşıyor (ikisi de tarayıcıya gidiyor, gizli
değil).

**`service_role` YERELDE VAR — belgenin önceki hâli yanlıştı.**
Burada "yerelde yok ve olmamalı" yazıyordu; ölçüldü (15 Eylül 2026) ve
durum farklı: anahtar `automation/.env` içinde ve **bu kasıtlı**. Onu
okumak üzere yazılmış ~12 Node bakım betiği (veri düzeltme, avatar
taşıma, paylaşım temizleme…) ve 6 Python betiği var;
`automation/.env.example` ile `automation/repository.py`'ın hata mesajı
kullanıcıyı doğrudan o dosyaya yönlendiriyor.

Sızıntı kanıtı **yok**: dosya `automation/.gitignore` ile korunuyor, git
tarafından izlenmiyor ve tüm dal/etiketlerde **0 commit** geçmişi var.

Gerçek kural şu:

- **Elle koşan bakım betikleri** servis anahtarını kullanabiliyor; yazma
  yapıyorlar ve buna gerçekten ihtiyaçları var.
- **Herkese açık HTML üreten yollar KULLANAMAZ.** Ön render'ın üç veri
  çağrısı da (`ilanlariGetir`, `sirketSluglariniGetir`,
  `firsatlariGetir`) ve katalog tohumu yalnız anonim anahtar okuyor;
  `tests/onrender-anon-anahtari.test.mjs` bunu bağlıyor.

  Sebebi ölçülmüş bir zarar: servis anahtarı RLS'i atlıyor ve ön render
  onu kullandığında yerel derleme üretimi temsil etmiyordu — ziyaretçinin
  çekemeyeceği kayıtların sayfası yazılıyor, hidrasyondan sonra ekran
  "bulunamadı"ya düşüyordu.

- **Canlı yazma gerektiren işler** (yeni fırsat, test şirketi, veri
  düzeltme) yine GitHub Actions'ta koşuyor; §9'daki elle test bu yüzden
  duruyor.

---

## 5. Korunacak ürün ve veri kuralları

Bunlar bir kez ihlal edilip düzeltildi; tekrar ihlal etme.

**Üç değerli alanlar — `not null default` koymayın.**
`is_paid`, `mandatory_staj_accepted`, `voluntary_staj_accepted` nullable
ve varsayılansız. `null` = bilinmiyor. "Belirtilmeyecek" seçeneği
`false` DEĞİL `null` yazıyor. Tek staj türünden öteki tür için
kabul/ret **türetilmiyor**.

**İlan yayını yalnızca yöneticide.** `guard_listing_publish` tetikleyicisi
`published` geçişini yöneticiye (ve otomasyonun `service_role`
kimliğine) kısıtlıyor. Şirketin `verified` olması ya da kurumsal
e-posta alan adının eşleşmesi **yetmiyor**. Arayüz istisnasız `draft`
üretiyor. Yasaklanan durum değil **geçiş**: şirket yayındaki ilanını
düzenleyebiliyor. Ret arşivlemiyor, taslağa düşürüyor ve **not zorunlu**.

**`listings` kolon kolon yetki veriyor.** Yeni kolon eklerken
`grant select` vermeyi unutma: tek yetkisiz kolon **bütün sorguyu**
`42501` ile düşürüyor ve üretimde her ilan "yüklenemedi" oldu. Aynı
sınıf hata `program_url` ile de yaşandı (`42703`) — `isveren-dizini.mjs`
artık eski kolon kümesiyle yedek deneme yapıyor.

**Görünüm (view) sahibi olarak koşar, RLS'i atlar.** `security_invoker = on`
şart; `ilan_bildirim_kuyrugu` bir kez anon'a sızdı.

**Kanıt olmadan iddia yok.**
- HTTP 200 tek başına ne ilanın ne programın ne fırsatın açık olduğunu
  kanıtlamıyor. 200 dönen sayfa kapanmış da olabilir (gövde okunuyor).
- 403/429/5xx/zaman aşımı **geçici**: kaydı kapatmıyor, sayaca girmiyor.
- Yumuşak 404 (200 dönen "sayfa bulunamadı") bozuk sayılıyor.
- "Açık program" yalnız programın **kendi** sayfasında aktif başvuru
  görülünce; ve o karar `program_url` ile birlikte anlam taşıyor —
  adressiz `acik` güvenilmez sayılıyor.
- Kesin kapanış için **iki bağımsız** ölçüm (24 saat arayla) ya da
  kurumun açık kapanış ifadesi.
- Tutar: "açıklanmadı"/"belirtilmemiş" **demiyoruz** (kurum adına beyan
  olur) — "doğrulanamadı" ya da alanı gizle.
- "Ölçülmedi" ile "ölçtük, bulamadık" **ayrı** cümleler.

**Uydurmuyoruz:** kurucu/ekip/ortaklık bilgisi, sahte sayı, "bütün
ilanlar burada" iddiası, kaynakta olmayan tarih/tutar/uygunluk,
doğrulanmamış logo.

**Kişisel takip şirkete gitmiyor.** Öğrencinin "Başvurdum" işareti ve
notları yalnız kendisinin; işveren göremiyor. Başvurmamış öğrenci/CV
havuzu yok. İşveren başka şirketin ilan ve başvurularını göremiyor.

**Bildirim:** SMS ve telefon **hiç yok**. E-posta yalnız kullanıcı
kayıtlı arama özetini kendisi açarsa ve **Türkiye saatiyle günde en
fazla bir**. İlan onay/ret kararı için bağlı e-posta **yok** — arayüz de
söz vermiyor (§7).

**Instagram akışına dokunma.** Yayınlama, gönderi kimliği, 24 saat
sonra panelden temizleme ve Instagram'daki gönderiyi koruma davranışları
çalışıyor. Gerçek gönderiyle test yapma.

---

## 6. Kalan işler

**a) Yeni gerçek fırsatlar.** Mevcut 112 aktif kayıt düzeltildi ama
**yeni kayıt eklenmedi**. Eklemek için: resmî kaynak listesi + insan
incelemesi + `service_role` yazma (yalnız Actions'ta). Mükerrer
eklememek için `slug` unique ve `source_url` kontrolü var. Tutarı
kaynaktan doğrulanmayan kaydı "açıklanmadı" diye işaretleme.

**b) `/universiteler` + kit.** Rota **yok** (`grep '/universiteler'`
boş). `src/data/kariyerMerkezleri.ts` 22 üniversite kariyer merkezi
taşıyor — sayfa onun üstüne kurulabilir. Kit içeriği tanımlı değil.

**c) Türkiye staj kaynaklarını artırma.** `automation/sources.json`
42 etkin kaynak. Yeni kaynak eklemeden önce **robots kuralları elle
inceleniyor** (Hakkımızda bunu yazıyor, iddiayı boşa çıkarma). Erişim
engeli aşılmıyor.

---

## 7. Sıradaki Claude'un doğrudan uygulayacağı ilk görev

> **Görev:** İlan onay/ret kararını mevcut Resend + kuyruk altyapısına
> bağla.

> Dağıtım engeli **kalktı** (#102): üç Instagram testindeki sabit
> 28/112 sayıları manifestten türetiliyor ve `setup-cli` sürümü dört
> iş akışında da sabit. CI'nin bütün zorunlu işleri yeşil.

Neden bu: `/isveren` sayfası ve ilan formu şu an kararın **panelde**
göründüğünü söylüyor, çünkü e-posta bağlı değil ve bağlanmamış bir
davranışa söz vermedim. Şirket kararı öğrenmek için panele girmek
zorunda.

Somut adımlar:

1. `scripts/ilan-bildirim-kuyrugu.mjs` kalıbını oku — Resend çağrısı,
   `Idempotency-Key`, üstel geri çekilme ve `for update skip locked`
   ile kuyruktan alma orada.
2. `listings` üzerine kuyruk kolonları ekle (`karar_bildirim_at`,
   `karar_bildirim_denemeleri`, `karar_bildirim_sonraki_at`) ya da
   mevcut bildirim kuyruğuna ilan kararı türü ekle. **İkinci kuyruk
   sistemi kurma.**
3. `ilan_incele` RPC'si kararı yazdıktan sonra kuyruğa satır bıraksın
   (aynı işlemde).
4. Alıcı: şirketin `hr_email`. Gerçek şirkete test e-postası
   **gönderme** — `--kuru` ile doğrula.
5. Gönderim çalıştıktan sonra `IlanFormu.tsx` ve `IsverenLanding.tsx`
   metinlerine e-posta cümlesini geri ekle, `tests/isveren-ilan-onayi.test.mjs`
   içindeki "karar için e-posta sözü verilmiyor" denetimini güncelle.

Bu iş tek PR'a sığar ve mevcut altyapıyı kullanır.

---

## 8. Komutlar

```bash
npm test                                  # 1770 test
npx tsc -p tsconfig.json --noEmit         # src tip denetimi
npx tsc -p functions/tsconfig.json --noEmit
npm run build                             # vite + ön render (568 sayfa)
```

```bash
git checkout -b <dal-adi> origin/main
git add <dosyalar>
git commit -F -   # mesajı stdin'den; NEDEN'i yaz
git push -u origin <dal-adi>
gh pr create --title "..." --body "..."
gh pr merge --squash --delete-branch
```

Yayın: `main`'e merge sürüm hattını tetikliyor
(`migrate_and_functions` → `cloudflare_production`). **Doğrula:**

```bash
gh run list --workflow "Supabase production release" --branch main --limit 1
gh run view <id> --json jobs -q '.jobs[] | .name + " -> " + .conclusion'
git show origin/main:<dosya> >/dev/null && echo "icerik main'de"
```

> **İki ders:** (1) PR "MERGED" görünse bile içeriğin main'de olduğunu
> `git show origin/main:<dosya>` ile doğrula — #86 boş birleşti.
> (2) `gh run view` adım **`conclusion`** döndürüyor; `continue-on-error`
> bir adım düştüğünde `conclusion` yine `success` görünür. Gerçek nedeni
> `gh run view <id> --log` ile ara.

İşçileri elle koşturma:

```bash
gh workflow run firsat-kaynak-kontrolu.yml
gh workflow run ilan-baglanti-kontrolu.yml
gh workflow run supabase-schema-baseline-audit.yml
```

> **Fırsat kontrolünü elle arka arkaya koşturmak artık bir fırsatı
> kapatamıyor** (24 saat kuralı) — ama yine de gereksiz koşturma.

---

## 9. İşveren hesabıyla elle yapılacak canlı test

Bunu **ben yapamadım**: yerelde `service_role` yok ve şirket hesabı
oluşturmak/parola girmek benim yapmayacağım bir iş. Yetki kuralları
gerçek Postgres'te gerçek rollerle (RLS regresyonu, `disposable
security tests` → success) doğrulandı; tıklama akışı doğrulanmadı.

Sırayla:

1. `/isveren` → "Ücretsiz şirket hesabı oluştur" → şirket hesabı aç.
2. Şirketi sahiplen; kurumsal e-posta doğrulamasını tamamla.
3. Panelden yeni ilan gir. **Beklenen:** "İncelemeye gönder" düğmesi ve
   "İlan incelemeye gönderildi" ekranı. İlan **yayında olmamalı**.
4. Öğrenci hesabıyla `/staj-ilanlari` ve `/` → ilan **görünmemeli**.
5. Yönetici hesabıyla onay kuyruğunu aç → **Reddet** → not yaz.
   **Beklenen:** şirket panelinde ilanın altında "İnceleme notu".
   Not yazmadan reddetmeye çalış → engellenmeli.
6. Yönetici → **Onayla**. İlan yayına çıkmalı, `posted_at` dolmalı.
7. Öğrenci hesabıyla başvur. Şirket panelinde başvuru görünmeli;
   durumu güncelle.
8. **İkinci bir şirket hesabıyla** birinci şirketin ilanını ve
   başvurusunu görmeye çalış → **görmemeli**.
9. Öğrencinin external bir ilandaki "Başvurdum" işaretini ve notunu
   şirket panelinde ara → **görünmemeli**.

Test kayıtlarını gerçek kullanıcı kayıtlarından ayır ve **yalnız
kendi** test kayıtlarını temizle.

---

## 10. Bilinen somut engeller

**~~Üç Instagram testi kırmızı~~ — ÇÖZÜLDÜ (#102).** Sebep: takvime
üçüncü ve dördüncü hafta eklenmiş (manifest 28 → 36 set) ama testler
`setler.length === 28` ve `tumKartlar.length === 112` diye sabit sayı
taşıyordu; `instagram-takvim-2026-09-22` ayrıca `slice(14)` ile
manifestin tam 28 set olduğunu varsayıyordu. Sayılar artık manifestten
türetiliyor (`set × 4`) ve her kartın diskte olduğu tek tek ölçülüyor.
`setler.json` ve 144 görsele dokunulmadı. Ölçüm: 36 set · 144 kart ·
144 tekil · diskte eksik 0 · depoda izlenmeyen 0.

> **Ders:** takvime set eklemek dağıtımı kilitliyordu. Yeni hafta
> eklerken sabit sayı iddiası yazma; manifestten türet.

**~~`security_regression` kırmızı~~ — ÇÖZÜLDÜ (#102) ve Instagram'la
ilgisi yoktu.** Gerçek log:
`Failed to resolve latest Supabase CLI release: rate limit exceeded`
→ CLI hiç kurulmadı → `supabase: command not found` (exit 127). Sürüm
etiketi `latest` bırakıldığında setup-cli her koşuda GitHub release
API'sini sorguluyor. Dört iş akışında da sürüm `2.117.0`'a sabitlendi.
Güvenlik kontrolü kapatılmadı.

> **Ders:** iş adı yanıltıcıydı — "security_regression" kırmızıydı ama
> güvenlik kontrolünde sorun yoktu, kurulum adımı düşmüştü. Kırmızı bir
> işin adına göre değil **logune** göre karar ver.

**Canlı yazma Actions'ta koşuyor.** Yeni fırsat ekleme, test şirketi
kurma gibi işler sürüm hattında/iş akışlarında yapılıyor; bu yüzden §9
elle yapılacak. (Bu maddenin eski hâli "`service_role` yerelde yok"
diyordu — yanlıştı; anahtar `automation/.env` içinde ve elle koşan bakım
betikleri onu kullanıyor. Ayrıntı ve kural §4'te.)

**Supabase CLI hesabı ayrı.** CLI canlı projeye `403` veriyor; `db push`
bu hâliyle çalışmıyor. Göçler sürüm hattının
`migrate_and_functions` işinde uygulanıyor — göç dosyasını yazıp
merge etmek yeterli.

**Schema audit ile sürüm hattı paralel koşuyor.** Audit üretim
dökümünü yerel yapıdan sonra alıyor ve fark bulursa 3 kez yeniden
deniyor; yine de yeni bir göçten hemen sonra kırmızı görürsen önce
`schema-diff.json` artifact'ına bak — gerçek kayma orada yazıyor.

**İlan onay/ret e-postası bağlı değil.** §7'deki ilk görev bu.
