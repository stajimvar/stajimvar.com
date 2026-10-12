import test from 'node:test';
import assert from 'node:assert/strict';
import { ilanIsteginiCoz, ilanHaritasiUret } from '../src/lib/seo/kenar-ilan.mjs';
import { ilanYolu } from '../src/lib/seo/metin.mjs';

/*
  KENARDA İLAN SAYFASI — KARAR TABLOSU (12 Ekim 2026)

  `functions/_middleware.ts` /ilan/<adres> isteğini bu modüle veriyor.
  Burada Supabase yerine sahte bir `fetch` var: hangi sorgunun atıldığı ve
  yanıta göre hangi HTTP kararının çıktığı ölçülüyor. Üretim verisine
  dokunulmuyor, test ilanı oluşturulmuyor.
*/

const KABUK =
  '<!doctype html><html lang="tr"><head><title>StajımVar</title>' +
  '<meta name="description" content="" /><meta property="og:title" content="" />' +
  '<meta property="og:description" content="" /><meta property="og:url" content="https://stajimvar.com/" />' +
  '<link rel="canonical" href="https://stajimvar.com/" /></head><body><div id="root"></div></body></html>';

const ILAN = {
  id: '5805e24e-1111-4222-8333-944444444444',
  title: 'IT Support / IT Operations Intern',
  description: 'Yardım masası ve cihaz kurulumlarında ekibe destek.',
  responsibilities: ['Kullanıcı taleplerini karşılamak'],
  required_skills: ['Windows'],
  posted_at: '2026-10-07T20:50:00Z',
  created_at: '2026-10-07T20:50:00Z',
  updated_at: '2026-10-08T10:00:00Z',
  city: 'İstanbul',
  country_code: 'TR',
  work_type: 'On-site',
  application_method: 'external',
  apply_url: 'https://ornek.com/kariyer/1',
  companies: { name: 'Örnek A.Ş.', slug: 'ornek' },
};
const KANONIK = ilanYolu(ILAN);
const AYAR = { taban: 'https://ornek.supabase.co', anahtar: 'anon-test-anahtari' };

function sahteFetch(cevap) {
  const istekler = [];
  const getir = async (adres, secenek) => {
    istekler.push({ adres, secenek });
    if (cevap instanceof Error) throw cevap;
    if (typeof cevap === 'function') return cevap(adres, secenek);
    return cevap;
  };
  return { getir, istekler };
}
const jsonCevap = (veri, durum = 200) => new Response(JSON.stringify(veri), { status: durum, headers: { 'content-type': 'application/json' } });

const coz = (yol, getir, ek = {}) =>
  ilanIsteginiCoz({
    yol,
    ayar: AYAR,
    getir,
    kabukGetir: async () => KABUK,
    gorselVarMi: async () => true,
    konumEtiketi: (s) => s,
    simdi: Date.parse('2026-10-12T12:00:00Z'),
    ...ek,
  });

test('yeni yayımlanmış ilan: kanonik adres 200, görünür içerik, canonical ve JobPosting', async () => {
  const { getir, istekler } = sahteFetch(jsonCevap([ILAN]));
  const s = await coz(KANONIK, getir);
  assert.equal(s.tur, 200);
  /* Sorgu yalnız yayındaki ilanı istiyor ve anonim anahtarla gidiyor. */
  assert.match(istekler[0].adres, /status=eq\.published/);
  assert.match(istekler[0].adres, /id=gte\.5805e24e-0000/);
  assert.equal(istekler[0].secenek.headers.apikey, 'anon-test-anahtari');
  /* Görünür içerik, tek H1, doğru canonical, gizli kopya yok. */
  const kok = s.html.slice(s.html.indexOf('<div id="root">'));
  assert.match(kok, /<h1>IT Support \/ IT Operations Intern<\/h1>/);
  assert.equal((kok.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(kok, /Kullanıcı taleplerini karşılamak/);
  assert.doesNotMatch(kok, /data-seo-prerender/);
  assert.match(s.html, new RegExp(`<link rel="canonical" href="https://stajimvar.com${KANONIK.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}" />`));
  assert.equal((s.html.match(/rel="canonical"/g) || []).length, 1);
  const jsonld = JSON.parse(s.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const jp = jsonld['@graph'].find((d) => d['@type'] === 'JobPosting');
  assert.equal(jp.url, `https://stajimvar.com${KANONIK}`);
  assert.equal(jp.jobLocation.address.addressCountry, 'TR');
  const kirinti = jsonld['@graph'].find((d) => d['@type'] === 'BreadcrumbList');
  assert.equal(kirinti.itemListElement[1].item, 'https://stajimvar.com/staj-ilanlari');
});

test('başlığı değişmiş ya da kısaltılmış adres: kayıt yayındaysa kanonik adrese 301', async () => {
  for (const eski of ['/ilan/it-intern-5805e24e', '/ilan/it-support-it-operations-int-5805e24e', '/ilan/5805e24e', `/ilan/${ILAN.id}`, `${KANONIK}/`]) {
    const { getir } = sahteFetch(jsonCevap([ILAN]));
    const s = await coz(eski, getir);
    assert.deepEqual(s, { tur: 301, konum: KANONIK }, eski);
  }
});

test('olmayan, taslak, incelemede, kapatılmış ilan: 404 — anonim okuma bunları döndürmüyor, sızıntı yok', async () => {
  const { getir } = sahteFetch(jsonCevap([]));
  assert.deepEqual(await coz('/ilan/olmayan-ilan-deadbeef', getir), { tur: 404 });
  /* İki kayıt aynı öneki paylaşıyorsa hangisi olduğu bilinmiyor: 404 (istemci de null dönüyor). */
  const iki = sahteFetch(jsonCevap([ILAN, { ...ILAN, id: '5805e24e-9999-4222-8333-944444444444' }]));
  assert.deepEqual(await coz(KANONIK, iki.getir), { tur: 404 });
  /* Biçimsiz adres veritabanına hiç sorulmuyor. */
  const bos = sahteFetch(jsonCevap([ILAN]));
  assert.deepEqual(await coz('/ilan/bir-ilan', bos.getir), { tur: 404 });
  assert.deepEqual(await coz('/ilan/a/b-5805e24e', bos.getir), { tur: 404 });
  assert.deepEqual(await coz('/ilan/%E0%A4%A-5805e24e', bos.getir), { tur: 404 });
  assert.equal(bos.istekler.length, 0);
});

test('veri okunamazsa 404 VERİLMİYOR: yedek (derleme dosyası ya da 503)', async () => {
  for (const [ad, cevap] of [
    ['500', jsonCevap({ message: 'x' }, 500)],
    ['401', jsonCevap({ message: 'x' }, 401)],
    ['ağ', new TypeError('fetch failed')],
    ['bozuk', new Response('<html>', { status: 200 })],
  ]) {
    const { getir } = sahteFetch(cevap);
    const s = await coz(KANONIK, getir);
    assert.equal(s.tur, 'yedek', ad);
    assert.doesNotMatch(s.neden, /anon-test-anahtari/, `${ad}: neden anahtarı içermemeli`);
  }
  const ayarsiz = await ilanIsteginiCoz({
    yol: KANONIK, ayar: {}, getir: sahteFetch(jsonCevap([ILAN])).getir, kabukGetir: async () => KABUK, konumEtiketi: (s) => s,
  });
  assert.equal(ayarsiz.tur, 'yedek');
  /* Kabuk okunamazsa da yedek. */
  const kabuksuz = await coz(KANONIK, sahteFetch(jsonCevap([ILAN])).getir, { kabukGetir: async () => null });
  assert.equal(kabuksuz.tur, 'yedek');
});

test('zaman aşımı yedeğe düşüyor (yavaş veritabanı sayfayı askıda bırakmıyor)', async () => {
  const getir = (_a, secenek) =>
    new Promise((_, reddet) => secenek.signal.addEventListener('abort', () => reddet(Object.assign(new Error('x'), { name: 'AbortError' }))));
  const bas = Date.now();
  const s = await coz(KANONIK, getir);
  assert.equal(s.tur, 'yedek');
  assert.ok(Date.now() - bas < 7000, 'iki deneme toplamı sınırlı olmalı');
});

test('düzenlenen ilan: kenar çizimi güncel veriyi kullanıyor (başlık, açıklama, JSON-LD aynı kaynaktan)', async () => {
  const duzenli = { ...ILAN, description: 'Güncellenmiş açıklama.', updated_at: '2026-10-12T09:00:00Z' };
  const s = await coz(KANONIK, sahteFetch(jsonCevap([duzenli])).getir);
  assert.match(s.html, /Güncellenmiş açıklama\./);
  const jp = JSON.parse(s.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'][0];
  assert.match(jp.description, /Güncellenmiş açıklama\./);
});

test('OG kartı yoksa (derlemeden sonra yayımlanan ilan) genel kart kalıyor', async () => {
  const s = await coz(KANONIK, sahteFetch(jsonCevap([ILAN])).getir, { gorselVarMi: async () => false });
  assert.doesNotMatch(s.html, /og\/ilan-5805e24e\.png/);
});

test('ilan haritası: yalnız açık ilanlar, lastmod kaynaktan; okuma düşerse null (boş harita yok)', async () => {
  const satirlar = [
    { ...ILAN },
    { ...ILAN, id: 'aaaaaaaa-1111-4222-8333-944444444444', title: 'Kapanmış', application_deadline: '2026-10-01', updated_at: '2026-09-01T00:00:00Z' },
  ];
  const xml = await ilanHaritasiUret({ ayar: AYAR, getir: sahteFetch(jsonCevap(satirlar)).getir, simdi: Date.parse('2026-10-12T12:00:00Z') });
  assert.match(xml, new RegExp(`<loc>https://stajimvar.com${KANONIK.replace(/[/]/g, '\\/')}</loc><lastmod>2026-10-08</lastmod>`));
  assert.doesNotMatch(xml, /kapanmis/);
  assert.equal(await ilanHaritasiUret({ ayar: AYAR, getir: sahteFetch(jsonCevap({}, 503)).getir }), null);
});
