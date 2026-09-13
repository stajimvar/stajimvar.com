import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  SOSYAL BİLDİRİMLER

  `notifications` tablosu yalnız iş başvurusu olaylarıyla doluyordu.
  Sosyal katmanda hiç bildirim üretilmiyordu: bağlantı isteği gelince
  kullanıcı bunu ancak Bağlantılar sayfasına kendi girip bakarsa
  görüyordu, beğeni ise hiçbir yerde görünmüyordu.

  Bu testler üç şeyi koruyor: bildirimin yalnız tetikleyiciden
  yazılabilmesi, aynı olayın iki kez bildirim üretmemesi ve kendi
  yaptığının bildiriminin gelmemesi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const goc = oku('supabase/migrations/20260927130000_sosyal_bildirimler.sql');

test('aynı olay iki kez bildirim üretmiyor', () => {
  /*
    İstek geri çekilip yeniden gönderilirse ya da beğeni kaldırılıp
    yeniden verilirse zil iki kez dolmamalı. Tabloda doğal anahtar yok;
    olayın kimliği ayrı bir kolonda ve benzersiz.
  */
  assert.match(goc, /add column if not exists dedupe_key text;/);
  assert.match(goc, /create unique index if not exists notifications_dedupe_key_idx\s*on public\.notifications \(dedupe_key\)\s*where dedupe_key is not null;/);
  /* Yinelenen olay sessizce düşüyor. */
  assert.match(goc, /on conflict \(dedupe_key\) where dedupe_key is not null do nothing;/);
});

test('yinelenme hatası ASIL İŞLEMİ geri almıyor', () => {
  /*
    Tetikleyici hata fırlatsaydı işlemin tamamı geri alınırdı: bildirim
    yazılamadı diye beğeni ya da bağlantı isteği kaybolurdu.
  */
  assert.doesNotMatch(goc, /raise exception/i);
  assert.match(goc, /do nothing/);
});

test('bildirim yalnız tetikleyiciden yazılıyor', () => {
  /* `security definer`: tabloda INSERT politikası yok ve olmamalı. */
  assert.match(goc, /create or replace function sosyal_gizli\.bildirim_yaz\([\s\S]{0,400}language plpgsql security definer/);
  const bildirimGocu = oku('supabase/migrations/20260913010000_bildirimler.sql');
  assert.match(bildirimGocu, /INSERT ve DELETE politikası YOK/);
});

test('bağlantı: istek alıcıya, kabul isteyene gider; RED SESSİZ', () => {
  assert.match(goc, /NEW\.addressee_id,\s*'baglanti_istegi'/);
  assert.match(goc, /NEW\.requester_id,\s*'baglanti_kabul'/);
  /*
    Reddedildiğini haber vermek, reddeden kişiyi açıklama yapmak
    zorunda bırakıyor. Sessiz red bilinçli bir karar.
  */
  assert.doesNotMatch(goc, /'baglanti_red'/);
  assert.match(goc, /NEW\.durum = 'kabul' and OLD\.durum is distinct from 'kabul'/);
});

test('beğeni: kendi paylaşımını beğenen bildirim almıyor', () => {
  assert.match(goc, /if yazar is null or yazar = NEW\.user_id then\s*return NEW;/);
  assert.match(goc, /'paylasim_begeni'/);
  /*
    ADRES `/cv`: paylaşımın kalıcı adresi yok (ayrıntı bir rota değil,
    karttan açılan katman). Olmayan bir adrese götüren bildirim
    dokununca 404 verirdi.
  */
  assert.match(goc, /'\/cv',\s*\n\s*'begeni:'/);
  assert.doesNotMatch(goc, /'\/paylasim\//);
});

test('bekleyen istekler geriye dönük bildirim alıyor', () => {
  /*
    Tetikleyici bugünden sonrasını yakalıyor. Hâlihazırda bekleyen
    istekler bildirimsiz kalmamalı; `dedupe_key` ikinci satırı
    engelliyor.
  */
  assert.match(goc, /select requester_id, addressee_id from public\.connections where durum = 'bekliyor'/);
});

test('zilin altındaki kabul/ret gerçek eyleme bağlı', () => {
  const merkez = oku('src/components/BildirimMerkezi.tsx');
  /* Eylemi olmayan düğme çizilmiyor. */
  assert.match(merkez, /b\.tur === 'baglanti_istegi' && onBaglantiYanitla &&/);
  /* Çift dokunma ikinci istek atmıyor. */
  assert.match(merkez, /disabled=\{islemdeki === b\.id\}/);
  /*
    Düğmeler satırın `<button>`ının İÇİNDE değil kardeşi: iç içe iki
    düğme geçersiz ve tıklama hedeflerini karıştırırdı.
  */
  const satir = merkez.slice(merkez.indexOf('onClick={() => onAc(b)}'));
  assert.ok(satir.indexOf('</button>') < satir.indexOf('Kabul et'), 'düğmeler satır düğmesinin içinde');

  const app = oku('src/App.tsx');
  assert.match(app, /onBaglantiYanitla=\{baglantiIsteginiYanitla\}/);
  /* İsteyen, olayın kimliğinden okunuyor. */
  assert.match(app, /const parcalar = \(satir\?\.anahtar \?\? ''\)\.split\(':'\)/);
  /* Üç iş sırayla: yanıtla, okundu yap, listeyi tazele. */
  assert.match(app, /await baglantiYanitla\(kimlik, isteyen, karar\);[\s\S]{0,200}await bildirim\.ac\(\);/);
});
