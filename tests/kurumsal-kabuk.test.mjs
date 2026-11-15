import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/*
  KURUMSAL/YASAL SAYFALAR YENİ KABUKTA (15 Kasım 2026, kullanıcı isteği:
  "alttaki sayfaların arayüzü eski kalmış"). Metinler değişmedi.
*/
test('sekiz sayfa tek başlık alanı ve ortak bölüm düzeni kullanıyor', () => {
  const s = oku('src/components/LegalPage.tsx');
  /* Sayfa başına ayrı h1 kalmadı; tek başlık alanı. */
  assert.equal((s.match(/<h1\b/g) ?? []).length, 1);
  assert.match(s, /\{kurumsal \? 'Kurumsal' : 'Yasal metin'\}/);
  for (const slug of ['hakkimizda', 'iletisim', "'kullanim-kosullari'", "'ilan-kurallari'", "'ilan-bildir'", 'gizlilik', "'cerez-politikasi'", "'kvkk-aydinlatma-metni'"]) {
    assert.ok(s.includes(`${slug}:`), `${slug} özeti/ikonu yok`);
  }
  assert.match(s, /<SayfaGezintisi aktif=\{slug\} \/>/);
  assert.match(s, /<BuSayfada kapsayici=\{metinRef\} anahtar=\{slug\} \/>/);
  assert.match(oku('src/components/CorporatePages.tsx'), /<MetinBolumu baslik=\{baslik\}>\{children\}<\/MetinBolumu>/);
});

test('telefonda yatay çip satırı yok; gezinme metnin altında liste', () => {
  const s = oku('src/components/LegalPage.tsx');
  assert.match(s, /<aside className="hidden lg:block">/);
  assert.match(s, /<div className="lg:hidden">\s*<SayfaGezintisi aktif=\{slug\} \/>/);
  const k = oku('src/components/kurumsal/KurumsalKabuk.tsx');
  assert.doesNotMatch(k, /overflow-x-auto|flex-nowrap/);
  /* Ön render sunucuda çiziyor: içindekiler yalnız etkide okunuyor. */
  assert.match(k, /React\.useEffect\(\(\) => \{\s*const kok = kapsayici\.current;/);
});
