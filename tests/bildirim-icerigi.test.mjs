import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bildirimIcerigi } from '../src/lib/bildirim-icerigi.mjs';
import { bildirimKisisi } from '../src/lib/bildirim-kisisi.mjs';

/*
  BILDIRIMDE BEGENILEN ICERIK GORUNSUN

  Bildirim listesinde ayni kisinin alti begenisi alti ozdes satir
  oluyordu ("Selin Dikme paylasimini begendi") ve hangi paylasimin
  begenildigi hicbir satirda yazmiyordu. Kimlik zaten olay anahtarinda
  duruyordu, yalniz okunmuyordu.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const PAYLASIM = '0c28129b-0d1c-43c1-8355-614a90963560';
const KISI = 'f9de6f3d-521d-44a8-8a16-0c1111111111';

test('begeni anahtarindan paylasim kimligi okunuyor', () => {
  assert.equal(bildirimIcerigi('begeni:' + PAYLASIM + ':' + KISI), PAYLASIM);
});

test('icerik ile kisi ayni anahtarin FARKLI parcalari', () => {
  /*
    Canlida olculdu: begeni:<paylasim>:<begenen>. Birinci UUID 22/22
    paylasim, ikinci 22/22 profil. Ikisini karistirmak, bildirimde
    paylasim yerine kullanici kimligi aramak demek olurdu.
  */
  const anahtar = 'begeni:' + PAYLASIM + ':' + KISI;
  assert.equal(bildirimIcerigi(anahtar), PAYLASIM);
  assert.equal(bildirimKisisi(anahtar), KISI);
  assert.notEqual(bildirimIcerigi(anahtar), bildirimKisisi(anahtar));
});

test('begeni disindaki turlerde icerik yok', () => {
  assert.equal(bildirimIcerigi('baglanti_istegi:' + PAYLASIM + ':' + KISI), null);
  assert.equal(bildirimIcerigi('baglanti_kabul:' + PAYLASIM + ':' + KISI), null);
});

test('bozuk anahtar icerik uretmiyor', () => {
  for (const kotu of [null, undefined, 42, '', 'begeni', 'begeni:' + PAYLASIM,
                      'begeni:olmayan-uuid:' + KISI,
                      'begeni:' + PAYLASIM + ':' + KISI + ':fazla']) {
    assert.equal(bildirimIcerigi(kotu), null, String(kotu) + ' icin null olmali');
  }
});

test('sorgu kapak gorselini ve aciklamayi cekiyor', () => {
  const q = oku('src/lib/queries/sosyal.ts');
  const govde = q.slice(q.indexOf('export async function bildirimIcerikleriniGetir'));
  const fn = govde.slice(0, govde.indexOf('export async function bildirimKisileriniGetir'));
  assert.ok(fn.includes('post_media ( sira, storage_path )'), 'kapak icin medya secilmeli');
  assert.ok(fn.includes('aciklama'), 'ozet icin aciklama secilmeli');
  assert.ok(fn.includes('Number(a.sira) - Number(b.sira)'), 'kapak en kucuk sira olmali');
});

test('gorunmeyen paylasim icin yer tutucu cizilmiyor', () => {
  /*
    RLS'in satiri vermemesi ile paylasimin silinmis olmasi ayni sey degil
    ve ikisini ayirt edemiyoruz; "silinmis paylasim" yazmak iddia olurdu.
  */
  const b = oku('src/components/BildirimMerkezi.tsx');
  assert.ok(b.includes('if (!ozet && !kapakYolu) return null;'),
            'ikisi de yoksa onizleme hic cizilmemeli');
  assert.ok(!b.includes('Silinmiş paylaşım'), 'yer tutucu metin olmamali');
});

test('onizleme imzali adres uretmiyor', () => {
  /* Gorsel kullanicinin kendi oturumundan iniyor; paylasilabilir adres yok. */
  const b = oku('src/components/BildirimMerkezi.tsx');
  assert.ok(b.includes('useGorselAdresleri'), 'yetkili indirme yolu kullanilmali');
  assert.ok(!b.includes('createSignedUrl'), 'imzali adres uretilmemeli');
});

test('icerik App tarafinda kisi ile ayni desende bagli', () => {
  const app = oku('src/App.tsx');
  assert.ok(app.includes('icerik={bildirimIcerikBilgisi}'), 'bilesene gecirilmeli');
  assert.ok(app.includes('bildirimIcerikleriniGetir'), 'panel acilinca tek sorgu');
  assert.ok(app.includes("bildirimIcerigi(b.anahtar)"), 'kimlik anahtardan okunmali');
});
