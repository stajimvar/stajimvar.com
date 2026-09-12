# D aşaması — uygulama planı

Tasarım: `docs/superpowers/specs/2026-09-10-d-fotograf-paylasimi-design.md`
Tarih: 2026-09-10

## Yetki ayrımı (istisnasız)

| Taraf | Yazar | Yazmaz |
|---|---|---|
| Ana oturum | `supabase/migrations/**`, SQL/Storage/RLS testleri | `src/**` |
| `stajimvar-frontend-builder` | `src/components/**`, `src/lib/**`, arayüz testleri | `supabase/migrations/**`, `.claude/**`, `package.json` |

Aynı dosyaya eşzamanlı dokunulmaz. D1–D4 (veri) bitmeden D5–D8 (arayüz)
başlamaz.

## Ana oturum

**D1 · Kovalar ve Storage RLS**
`20260924010000_sosyal_depolama.sql` + `tests/sosyal-depolama.test.mjs`
Önce başarısız test → iki private kova, iki `sosyal_gizli` yardımcısı,
INSERT/UPDATE/DELETE sahiplik ve SELECT görünürlük politikaları.
Bitti: başkasının klasörüne yazılamıyor, okuma `paylasim_gorunur`'dan geçiyor.

**D2 · Taslak/hazır durumu ve idempotens anahtar**
`20260924020000_paylasim_taslak_durumu.sql` + aynı test dosyası
`posts.durum`, `posts.istemci_anahtari`, tekil indeks, var olan satırlar
`hazir`, `paylasim_gorunur`'a `durum='hazir'` şartı (yazar hariç).
Bitti: taslak başkasına görünmüyor, mevcut C testleri hâlâ yeşil.

**D3 · Üç RPC**
`20260924030000_paylasim_rpc.sql` + `tests/sosyal-paylasim-akisi.test.mjs`
`sosyal_paylasim_baslat`, `sosyal_paylasim_tamamla`, `sosyal_paylasim_iptal`.
Bitti: 1–10 sınırı, sıra, yol doğrulaması, aynı anahtar → tek paylaşım.

**D4 · Yerel gerçek ortam ölçümü**
İki alan, bağlantılı/bağlantısız/engelli/farklı alan test kullanıcılarıyla
tasarım §7'deki 11 sınır — gerçek PostgREST + Storage HTTP istekleriyle.
Geçmeyen tek kontrol varsa arayüz BAŞLAMAZ.

## Ajan (yalnız arayüz)

**D5** `sosyal.ts`: kova adları, imzalı URL, yükleme, üç RPC sarmalayıcısı.
**D6** Paylaşım oluşturma: seçim, önizleme, sıralama, kaldırma, açıklama,
kitle seçici, kilit + ilerleme, iptal, hata yolu, tarayıcıda küçültme.
**D7** Profil ızgarası + ayrıntı: kapak = ilk fotoğraf, çoklu göstergesi,
ileri/geri, Escape, odak dönüşü, 44 px, taşma yok.
**D8** Profil fotoğrafı yükleme + arşivleme düğmesi (sahibine).

## Final doğrulama (yalnız bir kez)

Odaklı D testleri → tam takım → `tsc --noEmit` → build (**geçici kopyada**,
ana ağaçtaki `public/paylasim` dosyaları değişmesin) → tarayıcı 1440×900 ve
390×844.

## Yasaklar

Canlı/uzak Supabase, login/link/db push/--linked, commit/push/deploy,
merge/rebase/cherry-pick/checkout/reset/stash, `origin/main` ile birleştirme,
`public/paylasim` (sosyal dışı), `.claude/`, `.env`, `config.toml`,
`package.json`. E aşamasına kendiliğinden geçiş yok.
