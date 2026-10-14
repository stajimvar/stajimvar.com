import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { ilanIsteginiCoz } from '../src/lib/seo/kenar-ilan.mjs';
import { ilanYolu } from '../src/lib/seo/metin.mjs';

/*
  GEÇERSİZ ADRESLER: KIRIK İLAN YÖNLENDİRMESİ, PROFİL VE TOPLULUK (14 Ekim 2026)

  1) public/_redirects'teki elle yazılmış iki eski ilan kuralı (4bead62e,
     12431c8d) yayında olmayan ilanlara gidiyordu: 301 → 404. Aynı ilanın
     yayında bir karşılığı yok; kurallar kaldırıldı ve adres kenara
     düşüyor (kimlik önekiyle arama: yayındaysa 301, değilse 404).

  2) /profil/<ad> ve /topluluklar/<slug> her ad için 200 ile ANA SAYFANIN
     dolu HTML'ini (başlık, canonical "/", ilan kartları) döndürüyordu.
     Artık her ad için AYNI cevap: boş uygulama kabuğu + noindex. Var-yok
     sızmıyor; görünürlük kararı oturum açıldıktan sonra satır
     politikasında.

  Veritabanına ve canlıya dokunulmuyor: Supabase yerine sahte fetch,
  Cloudflare yerine bellek içi ASSETS ve önbellek.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const DIST = path.join(KOK, 'dist');

/* ------------------------------------------------ 1) eski ilan kuralları */

function ilanKurallari() {
  return fs
    .readFileSync(path.join(KOK, 'public/_redirects'), 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'))
    .map((s) => s.split(/\s+/))
    .filter(([kaynak]) => kaynak.startsWith('/ilan/') && kaynak.length > '/ilan/'.length);
}

const kimlikOneki = (yol) => (yol.match(/([0-9a-f]{8})(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/) || [])[1];

test('_redirects: hedefi 404 dönen iki eski ilan kuralı yok', () => {
  const kaynaklar = ilanKurallari().map(([k]) => k);
  for (const eski of [
    '/ilan/uzun-vadeli-full-stack-gelistirici-stajyeri-4bead62e',
    '/ilan/customer-success-intern-12431c8d',
  ]) {
    assert.ok(!kaynaklar.includes(eski), `kırık kural geri geldi: ${eski}`);
  }
});

test('_redirects: elle yazılmış ilan kuralı yalnız AYNI ilana gidiyor (kimlik öneki aynı)', () => {
  /*
    Yayından kalkan bir ilanı başka bir ilana ya da merkeze yönlendirmek
    yumuşak 404: aranan ilan orada değil. Elle kural ancak başlığı
    değişen aynı kayıt için yazılabilir.
  */
  for (const [kaynak, hedef, durum] of ilanKurallari()) {
    assert.equal(durum, '301', `${kaynak}: kalıcı değil`);
    assert.ok(hedef.startsWith('/ilan/'), `${kaynak}: ilan dışı hedef (${hedef})`);
    const a = kimlikOneki(kaynak);
    assert.ok(a, `${kaynak}: kimlik öneki yok`);
    assert.equal(kimlikOneki(hedef), a, `${kaynak} başka bir ilana yönleniyor (${hedef})`);
  }
});

const AYAR = { taban: 'https://ornek.supabase.co', anahtar: 'anon-test-anahtari' };
const KABUK_ILAN =
  '<!doctype html><html lang="tr"><head><title>StajımVar</title>' +
  '<meta name="description" content="" /><meta property="og:title" content="" />' +
  '<meta property="og:description" content="" /><meta property="og:url" content="https://stajimvar.com/" />' +
  '<link rel="canonical" href="https://stajimvar.com/" /></head><body><div id="root"></div></body></html>';
const jsonCevap = (veri) => new Response(JSON.stringify(veri), { status: 200, headers: { 'content-type': 'application/json' } });
const coz = (yol, satirlar) =>
  ilanIsteginiCoz({
    yol,
    ayar: AYAR,
    getir: async () => jsonCevap(satirlar),
    kabukGetir: async () => KABUK_ILAN,
    gorselVarMi: async () => true,
    konumEtiketi: (s) => s,
    simdi: Date.parse('2026-10-14T12:00:00Z'),
  });

test('kenar: kuralı kaldırılan eski adres, ilan yayında değilse 404 (başka ilana 301 yok)', async () => {
  for (const eski of [
    '/ilan/uzun-vadeli-full-stack-gelistirici-stajyeri-4bead62e',
    '/ilan/uzun-donem-full-stack-gelistirici-stajyeri-4bead62e',
    '/ilan/customer-success-intern-12431c8d',
    '/ilan/customer-success-stajyeri-12431c8d',
  ]) {
    assert.deepEqual(await coz(eski, []), { tur: 404 }, eski);
  }
});

test('kenar: aynı ilan yeniden yayımlanırsa eski adres güncel adresine 301 (elle kural gerekmiyor)', async () => {
  const ilan = {
    id: '12431c8d-1111-4222-8333-944444444444',
    title: 'Customer Success Stajyeri',
    description: 'Müşteri ekibine destek.',
    posted_at: '2026-10-01T10:00:00Z',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-02T10:00:00Z',
    city: 'İstanbul',
    country_code: 'TR',
    work_type: 'On-site',
    application_method: 'external',
    apply_url: 'https://ornek.com/kariyer/1',
    companies: { name: 'Örnek A.Ş.', slug: 'ornek' },
  };
  assert.deepEqual(await coz('/ilan/customer-success-intern-12431c8d', [ilan]), { tur: 301, konum: ilanYolu(ilan) });
});

/* --------------------------------------- 2) profil ve topluluk adresleri */

registerHooks({
  resolve(belirtec, baglam, sonraki) {
    try {
      return sonraki(belirtec, baglam);
    } catch (hata) {
      if (hata?.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(belirtec) && !/\.[cm]?[jt]sx?$/.test(belirtec)) {
        return sonraki(`${belirtec}.ts`, baglam);
      }
      throw hata;
    }
  },
});

const ONBELLEK = new Map();
globalThis.caches = {
  default: {
    match: async (istek) => ONBELLEK.get(istek.url)?.clone(),
    put: async (istek, cevap) => {
      ONBELLEK.set(istek.url, cevap.clone());
    },
    delete: async (istek) => ONBELLEK.delete(istek.url),
  },
};

const ANASAYFA =
  '<!doctype html><html><head><title>StajımVar - Staj Bulmanın En Akıllı Yolu</title>' +
  '<link rel="canonical" href="https://stajimvar.com/" /></head>' +
  '<body><div id="root"><ul class="sv-kartlar"><li class="sv-kart">ilan</li></ul></div></body></html>';
const BOS_KABUK =
  '<!doctype html><html><head><title>StajımVar - Staj Bulmanın En Akıllı Yolu</title></head>' +
  '<body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>';
const html = (govde) => new Response(govde, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });

async function istek(araKatman, adres, { kabukVar = true } = {}) {
  const bekleyenler = [];
  const gercekFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('ara katman testinde ağ çağrısı yapılmamalı');
  };
  try {
    const cevap = await araKatman.onRequest({
      request: new Request(adres),
      env: {
        ASSETS: {
          fetch: async (r) => {
            const yol = new URL(r.url).pathname;
            if (yol === '/') return html(ANASAYFA);
            if (yol === '/_onrender/kabuk' && kabukVar) return html(BOS_KABUK);
            return new Response('yok', { status: 404 });
          },
        },
      },
      next: async () => new Response('Not found', { status: 404 }),
      waitUntil: (is) => bekleyenler.push(is),
    });
    await Promise.all(bekleyenler);
    return { cevap, govde: await cevap.text() };
  } finally {
    globalThis.fetch = gercekFetch;
  }
}

const KISI_ADRESLERI = [
  '/profil/var-olan-kullanici',
  '/profil/uydurma-kullanici-xyz',
  '/profil/gizli-profil',
  '/profil/%zz',
  '/profil/',
  '/profil',
  '/topluluklar/yazilim',
  '/topluluklar/olmayan-topluluk',
  '/topluluklar',
];

test('profil ve topluluk: her ad 200, boş kabuk + noindex; ana sayfa içeriği ve canonical yok', async () => {
  const araKatman = await import('../functions/_middleware.ts');
  ONBELLEK.clear();
  for (const yol of KISI_ADRESLERI) {
    const { cevap, govde } = await istek(araKatman, `https://stajimvar.com${yol}`);
    assert.equal(cevap.status, 200, `${yol}: ${cevap.status} (var olan profil açılamaz)`);
    assert.equal(cevap.headers.get('x-robots-tag'), 'noindex', `${yol}: noindex yok`);
    assert.equal(cevap.headers.get('cache-control'), 'no-store', `${yol}: önbelleğe açık`);
    assert.equal(govde, BOS_KABUK, `${yol}: boş kabuk değil`);
    assert.doesNotMatch(govde, /rel="canonical"/, `${yol}: ana sayfa canonical'ı taşıyor`);
    assert.doesNotMatch(govde, /sv-kart/, `${yol}: ana sayfa ilan kartlarını taşıyor`);
    assert.match(govde, /<script type="module"/, `${yol}: uygulama paketi yok (profil açılmaz)`);
  }
  assert.equal(ONBELLEK.size, 0, 'kişiye bağlı adres kenar önbelleğine yazıldı');
});

test('profil ve topluluk: var olan, gizli ve uydurma ad AYNI cevabı alıyor (var-yok sızmıyor)', async () => {
  const araKatman = await import('../functions/_middleware.ts');
  const imza = async (yol) => {
    const { cevap, govde } = await istek(araKatman, `https://stajimvar.com${yol}`);
    return JSON.stringify([cevap.status, [...cevap.headers].sort(), govde]);
  };
  const profil = await imza('/profil/var-olan-kullanici');
  for (const yol of ['/profil/uydurma-kullanici-xyz', '/profil/gizli-profil', '/profil/%zz']) {
    assert.equal(await imza(yol), profil, `${yol} farklı cevap aldı`);
  }
  const topluluk = await imza('/topluluklar/yazilim');
  assert.equal(await imza('/topluluklar/olmayan-topluluk'), topluluk);
});

test('profil ve topluluk: boş kabuk okunamazsa bile noindex korunuyor', async () => {
  /* Kabuk modül düzeyinde saklanıyor; taze bir örnek gerekiyor. */
  const araKatman = await import('../functions/_middleware.ts?kabuksuz');
  const { cevap } = await istek(araKatman, 'https://stajimvar.com/profil/biri', { kabukVar: false });
  assert.equal(cevap.status, 200);
  assert.equal(cevap.headers.get('x-robots-tag'), 'noindex');
});

test('kapsam dar: diğer uygulama adresleri ve bilinmeyen adresler değişmedi', async () => {
  const araKatman = await import('../functions/_middleware.ts');
  const cv = await istek(araKatman, 'https://stajimvar.com/cv');
  assert.equal(cv.cevap.status, 200);
  assert.equal(cv.govde, ANASAYFA);
  assert.equal(cv.cevap.headers.get('x-robots-tag'), null);
  /* Benzer ama başka adresler bu dala girmiyor. */
  for (const yol of ['/profiller', '/topluluk', '/profil-x']) {
    const { cevap } = await istek(araKatman, `https://stajimvar.com${yol}`);
    assert.equal(cevap.status, 404, `${yol}: ${cevap.status}`);
  }
});

test('dist: boş kabuk canonical taşımıyor ve kökü boş (ana sayfa gibi görünemez)', { skip: !fs.existsSync(path.join(DIST, '_onrender', 'kabuk.html')) }, () => {
  const kabuk = fs.readFileSync(path.join(DIST, '_onrender', 'kabuk.html'), 'utf8');
  assert.doesNotMatch(kabuk, /rel="canonical"/);
  assert.doesNotMatch(kabuk, /property="og:url"/);
  assert.match(kabuk, /<div id="root"><\/div>/);
  assert.match(kabuk, /<script type="module"/);
});
