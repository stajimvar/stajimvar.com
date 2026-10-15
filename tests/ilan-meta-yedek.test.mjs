import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ilanMetaAciklamasi, ilanSayfasi } from '../src/lib/seo/ilan-sayfasi.mjs';
import { ilanIsteginiCoz } from '../src/lib/seo/kenar-ilan.mjs';
import { ilanYolu } from '../src/lib/seo/metin.mjs';

/*
  AÇIKLAMASIZ İLANIN META AÇIKLAMASI (15 Ekim 2026)

  description NULL ya da boşken konumu olan ilan "München. " alıyordu.
  Yedek artık konumdan bağımsız: başlık, şirket, konum + sabit cümle.
  Açıklaması olan ilanın meta açıklaması aynı kaldı. Ön render, kenar ve
  React (ListingPage) aynı fonksiyonu kullanıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const etiket = (s) => s;
const SIMDI = Date.parse('2026-10-15T09:00:00Z');
const YER_TUTUCU = 'Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında. Başvurmak için ilana git.';
const SON = "Staj ilanının temel bilgileri ve başvuru bağlantısı StajımVar'da.";
const ILAN = {
  id: '081eb55d-0000-4000-8000-000000000001',
  title: 'Praktikant Markenkommunikation (w/m/x)',
  description: null,
  responsibilities: [],
  required_skills: [],
  posted_at: '2026-10-01T09:00:00Z',
  city: 'München',
  country_code: 'DE',
  work_type: 'On-site',
  application_method: 'external',
  apply_url: 'https://ornek.com/kariyer/1',
  companies: { name: 'BMW Group', slug: 'bmw-group' },
};

/** Tek başına konum, boş ya da yalnız noktalama değil; sonu yedek cümle. */
function yeterliYedek(meta, ilan) {
  assert.ok(meta && meta.trim().length >= 40, `kısa meta: ${JSON.stringify(meta)}`);
  assert.notEqual(meta.trim().replace(/\.$/, ''), String(ilan.city ?? '').trim());
  assert.ok(meta.endsWith(SON), meta);
  assert.doesNotMatch(meta, /kariyer sayfasında\. Başvurmak/);
  assert.ok([...meta].length <= 155, `uzun meta (${[...meta].length})`);
}

test('açıklama NULL/boş/boşluk/yer tutucu: yedek konumdan bağımsız, "München." yok', () => {
  for (const description of [null, undefined, '', '   ', '<p> </p>', YER_TUTUCU]) {
    const meta = ilanMetaAciklamasi({ ...ILAN, description }, etiket);
    yeterliYedek(meta, ILAN);
    assert.equal(meta, `Praktikant Markenkommunikation (w/m/x), BMW Group, München. ${SON}`);
  }
});

test('eksik alan bileşimleri: her durumda doğal cümle, asla boş', () => {
  const durumlar = [
    [{ city: null }, `Praktikant Markenkommunikation (w/m/x), BMW Group. ${SON}`],
    [{ companies: null }, `Praktikant Markenkommunikation (w/m/x), München. ${SON}`],
    [{ city: '', companies: { name: '' } }, `Praktikant Markenkommunikation (w/m/x). ${SON}`],
    [{ title: '', city: null, companies: null }, SON],
    [{ title: 'Staj Programı.', city: null, companies: null }, `Staj Programı. ${SON}`],
  ];
  for (const [ek, beklenen] of durumlar) {
    const meta = ilanMetaAciklamasi({ ...ILAN, ...ek }, etiket);
    assert.equal(meta, beklenen);
    assert.ok(meta.trim().length > 0);
  }
});

test('çok uzun başlık: kısaltılıyor, yedek cümle duruyor, 155 karakteri geçmiyor', () => {
  const meta = ilanMetaAciklamasi({ ...ILAN, title: 'Werkstudent '.repeat(20).trim() }, etiket);
  yeterliYedek(meta, ILAN);
  assert.match(meta, /… Staj ilanının/);
});

test('gerçek açıklamalı ilanın meta açıklaması eski kuralla birebir aynı', () => {
  /* Eski kural: konum varsa "<konum>. <açıklama özeti 140>", yoksa "<özet 155>". */
  const kisa = 'Kalite ekibinde süreç iyileştirme çalışmalarına katılım.';
  assert.equal(ilanMetaAciklamasi({ ...ILAN, description: kisa }, etiket), `München. ${kisa}`);
  assert.equal(ilanMetaAciklamasi({ ...ILAN, city: null, description: kisa }, etiket), kisa);
  const uzun = 'Wir suchen ab sofort eine engagierte Praktikantin oder einen engagierten Praktikanten für unser Team. '.repeat(3);
  const meta = ilanMetaAciklamasi({ ...ILAN, description: uzun }, etiket);
  assert.ok(meta.startsWith('München. Wir suchen'));
  assert.ok(meta.endsWith('…'));
  assert.ok(!meta.includes(SON));
  /* Yer tutucuyu yalnız bir cümle olarak içeren gerçek açıklama korunuyor. */
  const karisik = `Gerçek açıklama metni. ${YER_TUTUCU}`;
  assert.ok(ilanMetaAciklamasi({ ...ILAN, description: karisik }, etiket).startsWith('München. Gerçek açıklama metni.'));
});

test('ön render yolu: sayfa meta açıklaması yedekten geliyor, noindex yok', () => {
  const { s } = ilanSayfasi(ILAN, etiket, SIMDI);
  yeterliYedek(s.aciklama, ILAN);
  assert.ok(!s.dizinDisi);
});

test('kenar yolu: description NULL ilanın HTML meta ve og açıklaması yedek cümle', async () => {
  const KABUK =
    '<!doctype html><html lang="tr"><head><title>StajımVar</title><meta name="description" content="" />' +
    '<meta property="og:title" content="" /><meta property="og:description" content="" />' +
    '<link rel="canonical" href="https://stajimvar.com/" /></head><body><div id="root"></div></body></html>';
  const r = await ilanIsteginiCoz({
    yol: ilanYolu(ILAN),
    ayar: { taban: 'https://ornek.supabase.co', anahtar: 'anon' },
    getir: async () => new Response(JSON.stringify([ILAN]), { status: 200, headers: { 'content-type': 'application/json' } }),
    kabukGetir: async () => KABUK,
    gorselVarMi: async () => true,
    konumEtiketi: etiket,
    simdi: SIMDI,
  });
  assert.equal(r.tur, 200);
  const meta = (r.html.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? '';
  const og = (r.html.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] ?? '';
  const coz = (x) => x.replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
  yeterliYedek(coz(meta), ILAN);
  assert.equal(coz(og), coz(meta));
  assert.doesNotMatch(r.html, /<meta name="robots" content="[^"]*noindex/);
});

test('React yolu: ListingPage aynı fonksiyonu, kaynağın verdiği alanlarla çağırıyor', () => {
  const kod = fs.readFileSync(path.join(KOK, 'src/components/ListingPage.tsx'), 'utf8');
  assert.match(kod, /import \{[^}]*ilanMetaAciklamasi[^}]*\} from '\.\.\/lib\/seo\/ilan-sayfasi\.mjs'/);
  assert.match(kod, /aciklama: ilanMetaAciklamasi\(kaynak, konumEtiketi\)/);
  /* ListingPage'in kurduğu kaynak biçimi: description '' olabiliyor. */
  const kaynak = { title: ILAN.title, city: 'München', description: '', companies: { name: 'BMW Group' } };
  yeterliYedek(ilanMetaAciklamasi(kaynak, etiket), ILAN);
});
