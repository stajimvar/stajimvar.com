import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  KATALOG BAŞLIĞI ŞERİDİ KALDIRILDI

  Keşfet sayfasında listenin üstündeki "Tüm etkinlikler" + sayaç + sıralama +
  yenileme şeridi görsel olarak tamamen kalktı; denetimler filtre panelinin
  içine taşındı. Bu dosya taşımanın sözleşmesini koruyor:

  - görünen başlık geri gelmesin,
  - sayacın CANLI BÖLGESİ silinmesin (durumu duyuran tek yer orası),
  - sıralama ile yenileme panelin içinde kalsın.

  Kaynak metni okunuyor çünkü bu depoda birim testleri React çizmiyor;
  tarayıcıdaki karşılığı e2e/kesfet-catalog.spec.ts içinde.
*/

const kaynak = readFileSync(new URL('../src/components/KesfetPage.tsx', import.meta.url), 'utf8');
const yeri = (parca) => kaynak.indexOf(parca);

test('görünen başlık ve görünen sayaç kaldırıldı', () => {
  assert.equal(kaynak.includes('Tüm etkinlikler'), false, '"Tüm etkinlikler" başlığı geri gelmemeli');
  assert.equal(
    /data-testid="catalog-count"[^>]*tabular-nums/.test(kaynak),
    false,
    'sayaç görünür metin sınıflarıyla çizilmemeli',
  );
});

test('sayaç canlı bölge olarak duruyor: ekran okuyucu sessiz kalmıyor', () => {
  /*
    Yükleniyor / hazır / hata durumunu duyuran TEK yer burasıydı. Görsel
    olarak kaldırmak yeterliydi; öğeyi silmek ekran okuyucu kullanıcısını
    liste her değiştiğinde sessiz bırakırdı.
  */
  assert.match(
    kaynak,
    /<p data-testid="catalog-count" aria-live="polite" aria-atomic="true" className="sr-only">/,
  );
  assert.match(kaynak, /\$\{listTotal\} etkinlik · \$\{gridEvents\.length\} gösteriliyor/);
  assert.match(kaynak, /'Etkinlikler yükleniyor…'/);
  assert.match(kaynak, /'Liste yüklenemedi'/);
});

test('sıralama filtre panelinin en üstünde ve radyo satırlarıyla', () => {
  assert.equal(kaynak.includes('aria-label="Sıralama"'), false, 'açılır menü panele taşınırken kaldırıldı');

  const panel = yeri('id="kesfet-filters"');
  const siralama = yeri('baslik="Sıralama"');
  const konum = yeri('baslik="Konum"');
  const katalog = yeri('aria-label="Etkinlik kataloğu"');
  assert.ok(Math.min(panel, siralama, konum, katalog) > -1, 'panel, bloklar ve katalog bölümü yerinde');
  assert.ok(panel < siralama, 'Sıralama bloğu filtre panelinin içinde');
  assert.ok(siralama < konum, 'Sıralama, daraltan bloklardan önce: listenin tamamını etkiliyor');
  assert.ok(siralama < katalog, 'Sıralama katalog bölümüne geri kaymamış');

  /* Kendi durumu yok: değer `filters.sort`, değişim `setFilter`. */
  assert.match(kaynak, /etiket="En yeni eklenenler" secili=\{filters\.sort === 'newest'\} onChange=\{\(\) => setFilter\('sort', 'newest'\)\}/);
  assert.match(kaynak, /etiket="Tarihi yaklaşanlar" secili=\{filters\.sort === 'upcoming'\} onChange=\{\(\) => setFilter\('sort', 'upcoming'\)\}/);
});

test('yenileme düğmesi panelin başlık satırında, davranışı aynı', () => {
  const panel = yeri('id="kesfet-filters"');
  const yenile = yeri('aria-label="Listeyi yenile"');
  const bloklar = yeri('divide-y divide-gray-100');
  assert.ok(panel < yenile && yenile < bloklar, 'düğme panelin başlık satırında, bloklardan önce');
  assert.match(
    kaynak,
    /aria-label="Listeyi yenile" title="Listeyi yenile" onClick=\{\(\) => \{ catalog\.refresh\(\); geo\.reload\(\); \}\} disabled=\{listPhase === 'loading'\}/,
  );
});

test('boşalan sarmalayıcı geride kalmadı, rozet satırı yerinde', () => {
  assert.equal(
    kaynak.includes('flex flex-wrap items-center justify-between gap-3'),
    false,
    'boş kutu ve dikey boşluk bırakmamak için sarmalayıcı tamamen kaldırıldı',
  );
  assert.match(kaynak, /\{hasFilters && \(\s*<div className="flex flex-wrap items-center gap-2 text-xs">/);
});

test('filtre panelindeki mevcut bloklar duruyor', () => {
  for (const blok of ['baslik="Konum"', 'baslik="Tarih"', 'baslik="Kategori"', 'baslik="Ücret"']) {
    assert.ok(kaynak.includes(blok), `${blok} kaldırılmamalı`);
  }
});
