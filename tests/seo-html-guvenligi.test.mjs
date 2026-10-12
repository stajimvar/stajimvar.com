import test from 'node:test';
import assert from 'node:assert/strict';
import { sayfaHtml, jsonGom } from '../src/lib/seo/sayfa-html.mjs';
import { ilanSayfasi } from '../src/lib/seo/ilan-sayfasi.mjs';

/*
  ÜRETİLEN HTML'DE ENJEKSİYON YOK (12 Ekim 2026, commit güvenlik incelemesi)

  Ölçülen açıklar:
    1. `String.prototype.replace` DİZE değiştirme ile `$'`, `` $` ``, `$&`
       kalıplarını yorumluyordu. Veritabanından gelen "Başlık $' sonu" kabuğun
       geri kalanını (betikler dahil) yanlış yere kopyalıyordu: 2 yerine 9
       <script> etiketi.
    2. Canonical/og:url adresi kaçırılmıyordu: tırnak taşıyan bir slug özniteliği
       kırıyordu.
    3. JSON-LD yalnız küçük harfli `</script` ve `<!--` için kaçırılıyordu.

  Bu testler sayfanın gerçek çıktısını sayıyor: etiket sayısı, öznitelik
  bütünlüğü, JSON'un geri okunabilmesi.
*/

const KABUK =
  '<!doctype html><html><head><title>x</title><meta name="description" content="" />' +
  '<meta property="og:title" content="" /><meta property="og:description" content="" />' +
  '<meta property="og:image" content="" /><meta property="og:image:alt" content="" />' +
  '<link rel="canonical" href="https://stajimvar.com/" /><meta property="og:url" content="https://stajimvar.com/" />' +
  '<script type="module" src="/assets/a.js"></script></head><body><div id="root"></div></body></html>';

const PAYLOADLAR = [
  "$' sonu",
  '$` başı',
  '$& ve $1 $$',
  '</SCRIPT ><script>alert(1)</script>',
  '<img src=x onerror=alert(2)>',
  '"><svg onload=alert(3)>',
  '<!-- yorum',
  'satır\u2028ayırıcı\u2029paragraf',
];

const scriptSayisi = (h) => (h.match(/<script\b/gi) || []).length;

test('veritabanı metni sayfa yapısını bozamıyor (başlık, açıklama, JSON-LD, gövde, tohum)', () => {
  for (const p of PAYLOADLAR) {
    const h = sayfaHtml(KABUK, '/rehber/ornek', {
      baslik: `Başlık ${p}`,
      aciklama: `Açıklama ${p}`,
      gorsel: `/og/${p}.png`,
      jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: p },
      gorunurGovde: '<main><h1>Güvenli</h1></main>',
      tohum: { country: 'TR', page: { listings: [{ title: p }] } },
    });
    /* modül betiği + JSON-LD + tohum = 3; fazlası enjeksiyon. */
    assert.equal(scriptSayisi(h), 3, `"${p}": <script> sayısı`);
    assert.equal((h.match(/<title>/g) || []).length, 1, `"${p}": <title> sayısı`);
    assert.equal((h.match(/<div id="root">/g) || []).length, 1, `"${p}": kök tekrarı`);
    assert.equal((h.match(/<head>/g) || []).length, 1, `"${p}": head tekrarı`);
    assert.doesNotMatch(h, /<img src=x|<svg onload/, `"${p}": etiket kaçırılmadan girdi`);
    /* JSON-LD ve tohum geri okunuyor ve veri aynen korunuyor. */
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld['@graph'][0].headline, p);
    const tohum = JSON.parse(h.match(/<script type="application\/json" id="ilk-katalog">([\s\S]*?)<\/script>/)[1]);
    assert.equal(tohum.page.listings[0].title, p);
  }
});

test('canonical ve og:url adresi özniteliği kıramıyor', () => {
  const h = sayfaHtml(KABUK, '/firsatlar/a"onmouseover="alert(1)', { baslik: 'x', aciklama: 'y' });
  assert.doesNotMatch(h, /href="https:\/\/stajimvar\.com\/firsatlar\/a"onmouseover/);
  assert.match(h, /<link rel="canonical" href="https:\/\/stajimvar\.com\/firsatlar\/a&quot;onmouseover=&quot;alert\(1\)" \/>/);
  assert.equal((h.match(/rel="canonical"/g) || []).length, 1);
});

test('jsonGom: <, >, &, U+2028/2029 ham kalmıyor; JSON aynen geri okunuyor', () => {
  const veri = { a: '</script><!--&\u2028\u2029>' };
  const s = jsonGom(veri);
  assert.doesNotMatch(s, /[<>&\u2028\u2029]/);
  assert.deepEqual(JSON.parse(s), veri);
});

test('ilan sayfası: kötü niyetli başlık ve dış adres güvenle çiziliyor', () => {
  const { s, yol } = ilanSayfasi(
    {
      id: 'abcdef12-0000-4000-8000-000000000009',
      title: "$' <script>alert(1)</script>",
      description: 'Açıklama <img src=x onerror=alert(1)>',
      posted_at: '2026-10-01',
      city: 'İstanbul',
      country_code: 'TR',
      work_type: 'On-site',
      application_method: 'external',
      apply_url: 'javascript:alert(1)',
      companies: { name: '"><b>Şirket', slug: 'ornek' },
    },
    (x) => x,
    Date.parse('2026-10-12T12:00:00Z'),
  );
  const h = sayfaHtml(KABUK, yol, s, {});
  assert.equal(scriptSayisi(h), 2, 'modül + JSON-LD');
  assert.doesNotMatch(h, /<img src=x|<b>Şirket|href="javascript:/i);
});
