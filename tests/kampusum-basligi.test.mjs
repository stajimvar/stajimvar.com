import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  KAMPUSUM BASLIGI PANELDE CIZILMIYOR

  Profil sayfasinin sol sutununda "Kampusum" basligi, altindaki kartlarin
  ustunde bosuna yer kapliyordu: kartlarin kendi basliklari zaten ne
  olduklarini soyluyor. Kullanici kaldirilmasini istedi (27 Eylul 2026).
*/

const KOK = path.resolve(import.meta.dirname, '..');
const PANEL = fs.readFileSync(path.join(KOK, 'src/components/kampus/KampusumPaneli.tsx'), 'utf8');

test('baslik yalniz bagimsiz sayfada ciziliyor', () => {
  assert.ok(PANEL.includes('{sayfa && ('), 'baslik sayfa dalina bagli olmali');
  const i = PANEL.indexOf('{sayfa && (');
  const blok = PANEL.slice(i, i + 400);
  assert.ok(blok.includes('<h2'), 'sayfa dalinda h2 olmali');
  assert.ok(blok.includes("'Kampüs' : 'Kampüsüm'"), 'baslik metni korunmali');
});

test('sr-only kullanilmadi -- bosluk kapansin diye', () => {
  /*
    Kap `space-y-4` kullaniyor: gizli bir baslik yine ILK KARDES sayilir
    ve ilk kart 16 px ust bosluk almaya devam ederdi. Yani kaldirilan
    basligin yeri bos kalirdi. Bu yuzden ogenin kendisi cizilmiyor.
  */
  assert.ok(PANEL.includes("sutun: 'space-y-4'"), 'kap space-y kullaniyor olmali');
  const i = PANEL.indexOf('{sayfa && (');
  const blok = PANEL.slice(i, i + 400);
  assert.ok(!blok.includes('sr-only'), 'gizli baslik birakilmamali');
});

test('bolum adsiz kalmadi', () => {
  /*
    Gorunur baslik yokken bolum ekran okuyucuda adsiz kalirdi. Ad
    dogrudan section uzerinde veriliyor.
  */
  assert.ok(PANEL.includes("'aria-label': baskasi ? 'Kampüs' : 'Kampüsüm'"),
            'panelde bolum adi aria-label ile verilmeli');
  assert.ok(PANEL.includes("'aria-labelledby': `${kimlik}-baslik`"),
            'sayfada gorunur baslik bagi korunmali');
});
