import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {
  aciklamaBloklari,
  aciklamaDuzMetni,
  aciklamaHtml,
  aciklamaYapili,
  guvenliAdres,
} from '../src/lib/firsat-aciklama.mjs';
import { kacir } from '../src/lib/seo/metin.mjs';

const KOK = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

/*
  YAPILI FIRSAT AÇIKLAMASI (31 Ekim 2026)

  Yalnız çok satırlı açıklama yapılı sayılıyor; açıklaması olan 11
  kaydın hepsi tek satır düz metin (ölçüldü) ve sayfaları değişmemeli.
*/
test('tek satırlık düz açıklama yapılı sayılmıyor ve tek paragraf kalıyor', () => {
  const metin = 'Türk Eğitim Vakfı, maddi desteğe ihtiyacı olan başarılı öğrencilere karşılıksız burs veriyor.';
  assert.equal(aciklamaYapili(metin), false);
  assert.equal(aciklamaYapili(''), false);
  assert.equal(aciklamaYapili(null), false);
  assert.deepEqual(aciklamaBloklari(metin), [{ tur: 'paragraf', parcalar: [{ metin }] }]);
});

test('başlık, madde, paragraf ve bağlantı ayrıştırılıyor', () => {
  const metin = '## Kısa cevap\nBir iki.\nÜç.\n\n## Belgeler\n- [Duyuru](https://ornek.org/a)\n- düz madde\nSon paragraf [rehber](/rehber/burs-cakisma).';
  const b = aciklamaBloklari(metin);
  assert.deepEqual(b.map((x) => x.tur), ['baslik', 'paragraf', 'baslik', 'liste', 'paragraf']);
  assert.equal(b[1].parcalar[0].metin, 'Bir iki. Üç.');
  assert.deepEqual(b[3].maddeler[0], [{ metin: 'Duyuru', adres: 'https://ornek.org/a', disari: true }]);
  assert.deepEqual(b[4].parcalar[1], { metin: 'rehber', adres: '/rehber/burs-cakisma', disari: false });
  assert.equal(aciklamaDuzMetni(metin), 'Kısa cevap Bir iki. Üç. Belgeler Duyuru düz madde Son paragraf rehber.');
});

test('yalnız https ve site içi adres bağlantı oluyor; ötekiler düz metin', () => {
  assert.equal(guvenliAdres('https://btso.org.tr/x'), true);
  assert.equal(guvenliAdres('/rehber/burs-cakisma'), true);
  for (const kotu of ['javascript:alert(1)', 'http://ornek.org', '//ornek.org', 'data:text/html,x', 'ftp://x', '']) {
    assert.equal(guvenliAdres(kotu), false, kotu);
  }
  const b = aciklamaBloklari('a\n[tıkla](javascript:alert(1)) [eski](http://x.org)');
  assert.ok(b[0].parcalar.every((p) => !p.adres));
});

test('HTML kaçışı çağıranın kacir işleviyle yapılıyor', () => {
  const html = aciklamaHtml('## <b>x</b>\n- [a"b](https://o.org/?q="x")\nmetin & <i>', kacir);
  assert.ok(!/<b>|<i>/.test(html));
  assert.match(html, /<h2>&lt;b&gt;x&lt;\/b&gt;<\/h2>/);
  assert.match(html, /<a href="https:\/\/o\.org\/\?q=&quot;x&quot;" rel="noopener noreferrer">a&quot;b<\/a>/);
  assert.match(html, /<p>metin &amp; &lt;i&gt;<\/p>/);
});

test('ön render ve detay sayfası aynı kuralı kullanıyor; tek satırlıda eski yol', () => {
  const onrender = oku('scripts/onrender.mjs');
  assert.match(onrender, /const yapili = aciklamaYapili\(f\.description\);/);
  assert.match(onrender, /yapili \? \[\] : \[\{ baslik: 'Kimler başvurabilir', maddeler: \[duzMetin\(f\.eligibility\)\]\.filter\(Boolean\) \}\],\s*yapili \? aciklamaHtml\(f\.description, kacir\) : ''/);
  /* Süresi geçmiş fırsat haritadan düşüyor; yapılı açıklamalı olan kalıyor. */
  assert.match(onrender, /if \(suresiGecti && !yapili\) HARITADAN_DISLANAN\.add\(firsatYolu\);/);
  assert.doesNotMatch(onrender, /if \(suresiGecti\) HARITADAN_DISLANAN\.add\(firsatYolu\);/);
  /* Kapı listesi: ana liste açık kayıtlar, kapanmış yapılı kayıt ayrı bölümde. */
  assert.match(onrender, /const kayitlar = hepsi\.filter\(\(f\) => !firsatSuresiGectiMi\(f\)\);/);
  assert.match(onrender, /const kapananlar = hepsi\.filter\(\(f\) => firsatSuresiGectiMi\(f\) && aciklamaYapili\(f\.description\)\);/);
  assert.match(onrender, /if \(kapandi\) notlar\.push\('Başvuru dönemi kapandı'\);/);
  /* noindex kuralı DEĞİŞMEDİ. */
  assert.match(onrender, /const firsatInce = !duzMetin\(f\.description\) && !duzMetin\(f\.eligibility\);/);
  assert.match(onrender, /dizinDisi: firsatInce,/);
  const sayfa = oku('src/components/OpportunityDetailPage.tsx');
  assert.match(sayfa, /aciklamaYapili\(item\.description\) \? \(\s*<YapiliAciklama/);
  assert.match(sayfa, /\{!aciklamaYapili\(item\.description\) && \(\s*<Bilgi baslik="Kimler başvurabilir\?">/);
});

/* ------------------------------------------------ iki burs kaydının göçü */
const GOC = oku('supabase/migrations/20261220010000_burs_sayfalari_erciyes_btso.sql');
const kod = GOC.replace(/\/\*[\s\S]*?\*\//g, '');
const aciklamalar = [...kod.matchAll(/description = \$metin\$([\s\S]*?)\$metin\$/g)].map((m) => m[1]);
const BOLUMLER = ['Kısa cevap', 'Kimler başvurabilir?', 'Nasıl başvurulur?', 'Gerekli belgeler', '2026–2027 takvimi', 'Burs miktarı'];

test('göç yalnız iki kaydı, kimlik + slug + boş açıklama koşuluyla güncelliyor', () => {
  const guncellemeler = kod.match(/update public\.opportunities set/g) ?? [];
  assert.equal(guncellemeler.length, 2);
  assert.match(kod, /where id = 'e9f1e2b7-a98b-4bdd-ad91-1ed1ca90a8fb'\s+and slug = 'erciyes-organ-nakli-vakfi-bursu'\s+and nullif\(btrim\(description\), ''\) is null;/);
  assert.match(kod, /where id = 'd3d306b8-6da5-4a4e-848c-7a45a3ea8b7c'\s+and slug = 'btso-yuksekogrenim-bursu'\s+and nullif\(btrim\(description\), ''\) is null;/);
  /* Dokunulmayan alanlar: tarih, durum, kaynak, tutar, uygunluk dizileri. */
  for (const alan of ['application_deadline', 'status', 'source_url', 'amount_', 'education_levels', 'cities', 'required_documents']) {
    assert.ok(!new RegExp(`\\b${alan}`).test(kod), `${alan} değişmemeli`);
  }
});

test('iki açıklama yapılı, bölümleri sırayla taşıyor ve birbirinin kopyası değil', () => {
  assert.equal(aciklamalar.length, 2);
  for (const a of aciklamalar) {
    assert.ok(aciklamaYapili(a));
    const basliklar = aciklamaBloklari(a).filter((b) => b.tur === 'baslik').map((b) => b.parcalar[0].metin);
    let son = -1;
    for (const b of BOLUMLER) {
      const i = basliklar.indexOf(b);
      assert.ok(i > son, `${b} sırada değil: ${basliklar.join(' | ')}`);
      son = i;
    }
    assert.ok(basliklar.includes('Başka burslarla birlikte alınabilir mi?'));
    /* Sayfanın kendi "Resmî kaynak" kutusuyla aynı başlık iki kez çıkmasın. */
    assert.equal(basliklar.at(-1), 'Kaynaklar ve son kontrol');
    assert.ok(!basliklar.some((b) => b.startsWith('Resmî kaynak')));
    assert.match(a, /\[burs çakışma rehberinde\]\(\/rehber\/burs-cakisma\)/);
    assert.match(a, /31 Ekim 2026'da/);
    /* Her bağlantı güvenli ve bağlantıya dönüşüyor. */
    for (const m of a.matchAll(/\]\(([^)]+)\)/g)) assert.ok(guvenliAdres(m[1]), m[1]);
  }
  const [e, b] = aciklamalar;
  /* Ortak başlıklar beklenen iskelet; metin satırları ortak olmamalı. */
  const ortak = e.split('\n').filter((s) => !s.startsWith('## ') && s.trim().length > 40 && b.includes(s));
  assert.deepEqual(ortak, []);
});

test('uydurma yok: tutar, "300 öğrenci" ve belge teslimini başvuru tarihi sayma', () => {
  const [erciyes, btso] = aciklamalar;
  for (const a of aciklamalar) {
    assert.ok(!/\b300\b/.test(a));
    /* Tek TL ifadesi BTSO'nun gelir sınırı; burs tutarı değil. */
    const tl = a.match(/[\d.,]+\s*TL/g) ?? [];
    assert.ok(tl.every((x) => x.startsWith('56.151')), tl.join(','));
  }
  assert.match(erciyes, /aylık burs tutarı yazmıyor/);
  assert.match(erciyes, /25 Eylül 2026/);
  assert.match(erciyes, /5–16 Ekim 2026 başvuru tarihi değil/);
  assert.match(btso, /burs tutarı ve ödeme süresi yazmıyor/);
  assert.match(btso, /56\.151 TL burs tutarı değil/);
  assert.match(btso, /10 Ağustos – 15 Eylül 2026/);
  /* Çalışmayan form bağlantısı etkin gibi sunulmuyor: bağlantı yok, durumu yazılı. */
  assert.match(btso, /form bağlantısı 31 Ekim 2026 itibarıyla çalışmıyor/);
  assert.ok(!/\]\([^)]*(form|\.docx?|\.pdf)[^)]*\)/i.test(btso));
});

test('meta açıklamalar 155 karakteri geçmiyor; akademik yıl kısıtla uyumlu', () => {
  const kisalar = [...kod.matchAll(/short_description = '((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
  assert.equal(kisalar.length, 2);
  for (const k of kisalar) assert.ok(k.length <= 155, `${k.length}: ${k}`);
  for (const m of kod.matchAll(/academic_year = '([^']+)'/g)) assert.match(m[1], /^20[0-9]{2}-20[0-9]{2}$/);
});
