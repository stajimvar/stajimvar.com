import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  İLANLARIM — KİMLİK SATIRI KALKTI, İLANLAR SAYFASINDAKİ SIRA GELDİ (27 Eylül 2026)

  Kullanıcı kararı: "Doğrulanmış kurum" rozeti profil sayfasında görünsün,
  İlanlarım'da anlamı yok. İlanlarım'da şirket, kendi ilanının öğrencinin
  ilanlar sayfasında hangi şirketlerle ve kaçıncı sırada durduğunu görüyor.
  Tarayıcı ölçümü: yerel şirket hesaplarıyla ve canlı katalogla (salt okuma).
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const PANEL = oku('src/sirket/SirketPaneli.tsx');
const SIRA = oku('src/sirket/IlanSiralamasi.tsx');
const GORUNUM = oku('src/sirket/SirketProfilGorunumu.tsx');

test('İlanlarım: ad + doğrulama satırı yok; doğrulanmamışta yalnız işlevsel uyarı', () => {
  const ilanlarim = PANEL.slice(PANEL.indexOf('İlanlarım\n'), PANEL.indexOf('<GenelBakis'));
  assert.doesNotMatch(ilanlarim, /\{baglam\.ad && <span/);
  assert.match(PANEL, /\{!baglam\.dogrulandi && \(\s*<p[^>]*>\s*<DurumRozeti baglam=\{baglam\} \/>/);
  /* Rozet profil sayfasında sahipte de görünüyor. */
  assert.match(GORUNUM, /\{kimlik\.dogrulandi && \(/);
});

test('sıra öğrencinin ilanlar sayfasıyla aynı sorgudan: katalog, "Tümü", ilk sayfa', () => {
  assert.match(SIRA, /fetchPublishedListingsCatalog\('all'\)/);
  assert.match(PANEL, /<IlanSiralamasi\s+companyId=\{baglam\.companyId\}\s+yayindaIlanVar=\{ilanlar\.some\(\(i\) => i\.status === 'published'\)\}/);
  /* Kendi ilanı şirket kimliğiyle tanınıyor; sıra numarası listedeki gerçek konum. */
  assert.match(SIRA, /companyId && companyIdi === companyId/);
  assert.match(SIRA, /listings\.map\(\(l, i\) => \(benimMi\(l\.companyId\) \? i \+ 1 : 0\)\)/);
});

test('uydurma sıra yok: dört durum dört cümle, toplam sunucudan', () => {
  assert.match(SIRA, /İlanınız \$\{kendiSiralari\.map/);
  assert.match(SIRA, /Yayında ilanınız yok/);
  assert.match(SIRA, /İlanınız ilk \$\{listings\.length\} ilan arasında değil/);
  assert.match(SIRA, /son başvuru tarihi geçen ilanlar listelenmez/);
  assert.match(SIRA, /const \{ listings, total \} = durum\.sayfa;/);
  /* Hata ve yükleniyor ayrı; yeniden dene var. */
  assert.match(SIRA, /Sıra alınamadı\./);
  assert.match(SIRA, /Yeniden dene/);
});

test('liste okunur ve dokunulur: 10 satır açık, tümü düğmeyle; satırlar gerçek bağlantı', () => {
  assert.match(SIRA, /const KAPALI_SATIR = 10;/);
  assert.match(SIRA, /aria-expanded=\{acik\}/);
  assert.match(SIRA, /href=\{`\/ilan\/\$\{listingSlug\(ilan\)\}`\}/);
  assert.match(SIRA, /min-h-14/);
  assert.match(SIRA, /line-clamp-2 text-sm font-bold/);
});
