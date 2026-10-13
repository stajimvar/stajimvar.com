import test from 'node:test';
import assert from 'node:assert/strict';
import { benzerIlanlariSec, ilanGorunurGovde } from '../src/lib/seo/ilan-sayfasi.mjs';
import { ilanIsteginiCoz } from '../src/lib/seo/kenar-ilan.mjs';
import { arsivSayfaNumaralari } from '../src/lib/seo/ilan-arsivi.mjs';
import { ilanYolu } from '../src/lib/seo/metin.mjs';

/*
  İLAN SAYFASINDAN YANA BAĞLANTI VE SAYFA NUMARALARI (13 Ekim 2026)

  Ölçülen sorunlar:
    · İlan sayfası öbür ilanlara yalnız `/staj-ilanlari` (en yeni 12) üzerinden
      bağlanıyordu.
    · Sayfalı tam listede her sayfa yalnız önceki/sonrakine bağlıydı; son
      sayfa 7 tık derindeydi.
  Testler seçimin veriden yapıldığını (aynı şirket → aynı şehir → en yeni),
  süresi geçmiş ilanın girmediğini, kenarda ek okumanın düşmesinin sayfayı
  bozmadığını ve sayfa numarası listesini ölçüyor.
*/

const SIMDI = Date.parse('2026-10-12T12:00:00Z');
const ilan = (id, ek = {}) => ({
  id: `${id}-1111-4222-8333-944444444444`,
  title: `İlan ${id}`,
  city: 'İstanbul',
  posted_at: '2026-10-01T00:00:00Z',
  companies: { name: 'Şirket', slug: 'sirket' },
  ...ek,
});

const ANA = ilan('aaaaaaaa', { companies: { name: 'Örnek', slug: 'ornek' }, city: 'İzmir' });

test('seçim sırası: aynı şirket, sonra aynı şehir, sonra en yeni; kendisi ve süresi geçen yok', () => {
  const adaylar = [
    ANA,
    ilan('b0000001', { city: 'Ankara', posted_at: '2026-10-11T00:00:00Z' }),
    ilan('b0000002', { city: 'izmir', posted_at: '2026-09-01T00:00:00Z' }),
    ilan('b0000003', { companies: { name: 'Örnek', slug: 'ornek' }, city: 'Bursa', posted_at: '2026-08-01T00:00:00Z' }),
    ilan('b0000004', { city: 'İzmir', application_deadline: '2026-10-11' }),
    ilan('b0000005', { city: 'Ankara', posted_at: '2026-10-10T00:00:00Z' }),
    ilan('b0000002', { city: 'izmir' }),
  ];
  const secim = benzerIlanlariSec(ANA, adaylar, { simdi: SIMDI }).map((x) => x.id.slice(0, 8));
  assert.deepEqual(secim, ['b0000003', 'b0000002', 'b0000001', 'b0000005']);
});

test('ülke adı şehir sayılmıyor; en fazla 6 ilan; boş aday listesi boş sonuç', () => {
  const turkiye = ilan('cccccccc', { city: 'Turkey', companies: { name: 'X', slug: 'x' } });
  const adaylar = Array.from({ length: 9 }, (_, i) =>
    ilan(`d000000${i}`, { city: 'Turkey', companies: { name: 'Y', slug: 'y' }, posted_at: `2026-10-0${i + 1}T00:00:00Z` }),
  );
  const secim = benzerIlanlariSec(turkiye, adaylar, { simdi: SIMDI });
  assert.equal(secim.length, 6);
  /* "Turkey" ortak şehir sayılsaydı da sıra aynı olurdu; en yeni önce. */
  assert.equal(secim[0].id.slice(0, 8), 'd0000008');
  assert.deepEqual(benzerIlanlariSec(turkiye, [], { simdi: SIMDI }), []);
  assert.deepEqual(benzerIlanlariSec(turkiye, null, { simdi: SIMDI }), []);
});

test('gövde: bölüm gerçek bağlantı ve kaçırılmış metinle çiziliyor; aday yoksa bölüm yok', () => {
  const kotu = ilan('eeeeeeee', { title: '<img src=x onerror=alert(1)> Stajyer', companies: { name: '"><b>Ş', slug: 's' } });
  const govde = ilanGorunurGovde(ANA, (s) => s, SIMDI, { benzerler: [kotu] });
  assert.match(govde, /<h2>Benzer staj ilanları<\/h2>/);
  assert.ok(govde.includes(`<a href="${ilanYolu(kotu)}">`));
  assert.doesNotMatch(govde, /<img src=x|<b>Ş/);
  assert.doesNotMatch(ilanGorunurGovde(ANA, (s) => s, SIMDI, {}), /Benzer staj ilanları/);
});

const KABUK =
  '<!doctype html><html lang="tr"><head><title>StajımVar</title><meta name="description" content="" />' +
  '<link rel="canonical" href="https://stajimvar.com/" /></head><body><div id="root"></div></body></html>';
const KENAR_ILAN = {
  ...ANA,
  description: 'Açıklama',
  country_code: 'TR',
  work_type: 'On-site',
  application_method: 'external',
  apply_url: 'https://ornek.com/kariyer/1',
};
const json = (v, d = 200) => new Response(JSON.stringify(v), { status: d, headers: { 'content-type': 'application/json' } });
const kenar = (benzerCevabi) => {
  const istekler = [];
  const getir = async (adres) => {
    istekler.push(adres);
    if (/limit=2&/.test(adres)) return json([KENAR_ILAN]);
    if (benzerCevabi instanceof Error) throw benzerCevabi;
    return benzerCevabi;
  };
  return {
    istekler,
    sonuc: ilanIsteginiCoz({
      yol: ilanYolu(KENAR_ILAN),
      ayar: { taban: 'https://ornek.supabase.co', anahtar: 'anon' },
      getir,
      kabukGetir: async () => KABUK,
      konumEtiketi: (s) => s,
      simdi: SIMDI,
    }),
  };
};

test('kenar: benzer ilanlar yalnız yayındakilerden okunuyor ve sayfaya bağlanıyor', async () => {
  const komsu = ilan('f0000001', { companies: { name: 'Örnek', slug: 'ornek' } });
  const { istekler, sonuc } = kenar(json([KENAR_ILAN, komsu]));
  const s = await sonuc;
  assert.equal(s.tur, 200);
  const benzerIstegi = istekler.find((a) => /limit=200/.test(a));
  assert.ok(benzerIstegi, 'benzer ilan sorgusu atılmadı');
  assert.match(benzerIstegi, /status=eq\.published/);
  assert.ok(s.html.includes(`<a href="${ilanYolu(komsu)}">`));
  assert.ok(!s.html.includes(`<li><a href="${ilanYolu(KENAR_ILAN)}">`), 'ilan kendine bağlanmamalı');
});

test('kenar: benzer okuması 500 ya da ağ hatası verirse sayfa yine 200, bölüm yok', async () => {
  for (const cevap of [json({ hata: 1 }, 500), new Error('ağ')]) {
    const s = await kenar(cevap).sonuc;
    assert.equal(s.tur, 200);
    assert.doesNotMatch(s.html, /Benzer staj ilanları/);
  }
});

test('sayfa numaraları: 10 sayfaya kadar hepsi, uzun listede ilk/son/komşular ve boşluk', () => {
  assert.deepEqual(arsivSayfaNumaralari(3, 6), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(arsivSayfaNumaralari(1, 1), [1]);
  assert.deepEqual(arsivSayfaNumaralari(7, 20), [1, null, 5, 6, 7, 8, 9, null, 20]);
  assert.deepEqual(arsivSayfaNumaralari(1, 20), [1, 2, 3, null, 20]);
  assert.deepEqual(arsivSayfaNumaralari(20, 20), [1, null, 18, 19, 20]);
  assert.deepEqual(arsivSayfaNumaralari(4, 20), [1, 2, 3, 4, 5, 6, null, 20]);
  assert.deepEqual(arsivSayfaNumaralari(1, 0), []);
});
