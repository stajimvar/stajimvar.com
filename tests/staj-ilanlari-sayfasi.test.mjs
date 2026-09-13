import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/*
  /staj-ilanlari — "STAJ İLANLARI" ARAMA NİYETİNİN BİRİNCİL SAYFASI

  Ölçüldü (Search Console): "staj" içeren sorgularda 137 gösterim, ana
  sayfadan TEK tıklama yok; tam "staj ilanları" sorgusunda ana sayfa hiç
  gösterim almıyor. Ana sayfa markayı ve ürünün tamamını anlatıyor, yani
  arama motoru onu "StajımVar nedir"e eşliyor.

  Bu testler sayfanın üç özelliğini koruyor: içeriğinin İLK HTML'de
  bulunması, ana sayfanın kopyası olmaması ve eski adresin buraya
  yönlenmesi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

test('sayfa üretiliyor: title, H1, description, canonical', () => {
  const dosya = path.join(KOK, 'dist', 'staj-ilanlari.html');
  if (!existsSync(dosya)) {
    /* Derleme yapılmadan koşan testte bu dosya yok; sessizce geçiliyor. */
    return;
  }
  const h = readFileSync(dosya, 'utf8');

  assert.match(h, /<title>Güncel Staj İlanları 2026 \| StajımVar<\/title>/);
  assert.match(h, /<h1[^>]*>Güncel Staj İlanları<\/h1>/);
  assert.match(
    h,
    /<meta name="description" content="Türkiye genelindeki güncel staj ilanlarını şehir, bölüm ve staj türüne göre filtrele\./,
  );
  assert.match(h, /<link rel="canonical" href="https:\/\/stajimvar\.com\/staj-ilanlari"/);

  /* Dizine giriyor: noindex YOK. */
  assert.doesNotMatch(h, /<meta name="robots" content="noindex/);

  /*
    İÇERİK İLK HTML'DE

    Yalnız istemcide dolan boş bir kabuk olsaydı arama motoru başlıktan
    başka hiçbir şey görmezdi. Gövde ön render'da AYNI bileşenden
    çiziliyor (scripts/onrender.mjs), yani iki taraf ayrışamıyor.
  */
  const govde = h.slice(h.indexOf('<div id="root">'), h.indexOf('</body>'));
  const metin = govde.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.ok(metin.length > 1500, `ilk HTML'de metin kısa: ${metin.length}`);
  assert.ok(govde.includes('BreadcrumbList') || h.includes('BreadcrumbList'));

  /* Gerçek iç bağlantılar: bölüm sayfaları ve rehberler. */
  assert.ok((govde.match(/href="\/bolum\//g) || []).length > 10);
  assert.match(govde, /href="\/rehber\/staj-nasil-bulunur"/);
});

test('ANA SAYFANIN KOPYASI DEĞİL', () => {
  /*
    İki sayfa aynı kelimeler için yarışmamalı: ana sayfa marka ve genel
    tanıtım, bu sayfa ilan arama niyeti. Bileşen ürün tanıtımını,
    fırsatları ve araçları HİÇ çizmiyor.
  */
  const icerik = oku('src/components/StajIlanlariIcerik.tsx');
  assert.match(icerik, /Güncel Staj İlanları/);
  assert.match(icerik, /İlanlar nereden geliyor\?/);
  /* Ana sayfaya özgü bölümler burada yok. */
  for (const yabanci of ['OpportunitiesHomeSection', 'MatchedInternshipsView', 'SkillQuizzes']) {
    assert.ok(!icerik.includes(yabanci), `${yabanci} bu sayfada olmamalı`);
  }
});

test('SAYILAR UYDURULMUYOR: veri yoksa satır hiç çizilmiyor', () => {
  const icerik = oku('src/components/StajIlanlariIcerik.tsx');
  /* "0 ilan" ya da "—" yazmak, ölçülmemiş bir şeyi ölçülmüş göstermek olurdu. */
  assert.match(icerik, /typeof toplam === 'number' && \(/);
  assert.match(icerik, /\{ilanlar\.length > 0 && \(/);
  assert.match(icerik, /\{sehirler\.length > 0 && \(/);
  assert.doesNotMatch(icerik, /\?\? 0\b/);
});

test('eski /ilanlar adresi buraya yönleniyor', () => {
  const kurallar = oku('public/_redirects');
  assert.match(kurallar, /^\/ilanlar\s+\/staj-ilanlari\s+301$/m);
  assert.match(kurallar, /^\/ilanlar\/\*\s+\/staj-ilanlari\s+301$/m);

  /* Uygulama içinden o yola düşen durum da aynı yere gidiyor. */
  const app = oku('src/App.tsx');
  assert.match(app, /setPath\('\/staj-ilanlari'\);/);
});

test('site haritasında var, kanonik adresle', () => {
  const harita = oku('public/sitemap.xml');
  assert.match(harita, /<loc>https:\/\/stajimvar\.com\/staj-ilanlari<\/loc>/);
  /* Yönlendirilen eski adres haritada YOK. */
  assert.doesNotMatch(harita, /<loc>[^<]*\/ilanlar<\/loc>/);

  const uretici = oku('automation/sitemap.py');
  assert.match(uretici, /\("\/staj-ilanlari", "daily", "0\.9"\)/);
});

test('menü ve içerik sayfaları buraya bağlanıyor', () => {
  const header = oku('src/components/Header.tsx');
  assert.match(header, /id="nav-tab-internships"\s*\n\s*href="\/staj-ilanlari"/);
  assert.match(header, /<span className="hidden xl:inline">Staj İlanları<\/span>/);

  /* Bölüm ve rehber sayfalarının sonundaki ilan bağlantısı. */
  const blok = oku('src/components/RehberdeIlanlar.tsx');
  assert.match(blok, /href="\/staj-ilanlari"/);
  assert.match(blok, /Tüm staj ilanlarını gör/);

  /* Rehber sayfalarının sonundaki çıkış. */
  const rehber = oku('src/components/GuidePages.tsx');
  assert.match(rehber, /href="\/staj-ilanlari"/);
  assert.match(rehber, /Güncel staj ilanlarını gör/);
});

test('sayfa gecikmeli yükleniyor: bolumler.ts ana pakete binmiyor', () => {
  /*
    Sayfa bölüm listesini çiziyor ve `src/data/bolumler.ts` 195 KB
    kaynak. Doğrudan içe aktarılınca ana paket 440 -> 629 KB oldu
    (ölçüldü): bu sayfayı hiç açmayan ziyaretçinin de indirdiği 190 KB.
  */
  const app = oku('src/App.tsx');
  assert.match(app, /const StajIlanlariSayfasi = React\.lazy\(/);
  assert.doesNotMatch(app, /^import \{ StajIlanlariSayfasi \}/m);
});
