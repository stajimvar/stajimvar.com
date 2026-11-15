import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onyargisizla } from '../src/lib/aday-kart.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/*
  BAŞVURANIN FOTOĞRAFI (15 Kasım 2026, ölçüldü): fotoğrafın tek kaynağı
  `social_profiles.avatar_path`; şirket ekranı yalnız eski alanı
  (`fotoUrl`) okuyordu ve fotoğraf yüklemiş aday fotoğrafsız görünüyordu.
*/
test('şirket başvuruları fotoğraf yolunu kapıdan alıyor ve karta taşıyor', () => {
  const veri = oku('src/lib/sirket-veri.ts');
  assert.match(veri, /db\.rpc\('sirket_aday_foto_yollari' as never, \{ p_basvurular: kimlikler \} as never\)/);
  assert.match(veri, /fotoYolu: fotoYollari\.get\(String\(s\.id\)\) \?\? null,/);
  const kart = oku('src/lib/aday-kart.mjs');
  assert.match(kart, /fotoYolu: paylasildi \? metin\(satir\?\.fotoYolu\) : null,/);
});

test('önyargısız incelemede fotoğraf yolu da siliniyor', () => {
  const k = onyargisizla({ id: 'x', ad: 'Ada', fotoUrl: 'https://x/y.jpg', fotoYolu: 'u/f.jpg' });
  assert.equal(k.fotoYolu, null);
  assert.equal(k.fotoUrl, null);
  assert.equal(k.gizli, true);
});

test('panelde fotoğraf tek bileşenden çiziliyor; eski <img src={fotoUrl}> kalmadı', () => {
  for (const f of ['AdayKarti', 'AdayCekmecesi', 'BasvuruPanosu', 'IlanKarti', 'SirketYanSutunlari']) {
    const kod = oku(`src/sirket/${f}.tsx`);
    assert.match(kod, /<AdayFotografi/, `${f}: ortak bileşen yok`);
    assert.doesNotMatch(kod, /<img src=\{(kart|aday)\.fotoUrl\}/, `${f}: eski görsel kaldı`);
  }
  /* İnceleme başlığı: büyük, büyütülebilir daire (kullanıcı taslağı). */
  assert.match(oku('src/sirket/AdayCekmecesi.tsx'), /buyutulebilir\s+className="h-16 w-16[^"]*sm:h-20 sm:w-20/);
  /* CV önizlemesi indirilen dosyanın bellek adresini kabul ediyor. */
  assert.match(oku('src/lib/aday-cv.mjs'), /\/\^blob:\/\.test\(metin\(k\.fotoUrl\)\)/);
});

test('başvuru penceresi fotoğrafı öneriyor ama şart koşmuyor', () => {
  const p = oku('src/components/ApplyDialog.tsx');
  assert.match(p, /Fotoğraf ekle, şirket seni tanısın/);
  assert.match(p, /İsteğe bağlı; eklemeden de başvurabilirsin\./);
  assert.match(p, /\{onFotografYukle && \(!fotografVar \|\| fotografEklendi\) && \(/);
  /* Gönder düğmesi fotoğrafa bağlı değil. */
  assert.doesNotMatch(p, /disabled=\{[^}]*fotograf(Var|Eklendi)/);
  const app = oku('src/App.tsx');
  assert.match(app, /fotografVar=\{sosyalAvatarYolu === undefined \|\| Boolean\(sosyalAvatarYolu \|\| activeStudent\?\.avatarUrl\)\}/);
});
