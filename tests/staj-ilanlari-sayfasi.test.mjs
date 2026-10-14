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

test('ANA SAYFANIN KOPYASI DEĞİL: aynı liste, farklı h1 ve SEO bilgi bölümü', () => {
  /*
    14 Ekim 2026 (kullanıcı kararı): sayfanın üstünde ana sayfadaki GERÇEK
    liste çiziliyor (logolu kartlar, süzgeçler, kaydet/incele). İki adres
    yine aynı içerik değil: h1 ve giriş cümlesi bu adresin konusunu
    söylüyor, fırsat şeridi yerine "Staj ilanları hakkında" bilgi bölümü
    var. Bilgi bölümü ürün tanıtımı, fırsatlar ya da quiz çizmiyor.
  */
  const metin = oku('src/lib/staj-ilanlari-metni.mjs');
  assert.match(metin, /h1: 'Güncel Staj İlanları'/);
  const icerik = oku('src/components/StajIlanlariIcerik.tsx');
  const kod = icerik.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  assert.match(kod, /İlanlar nereden geliyor\?/);
  assert.match(kod, /Staj ilanları hakkında/);
  for (const yabanci of ['OpportunitiesHomeSection', 'MatchedInternshipsView', 'SkillQuizzes', '<h1']) {
    assert.ok(!kod.includes(yabanci), `${yabanci} bilgi bölümünde olmamalı`);
  }
  const app = oku('src/App.tsx');
  assert.match(app, /giris=\{stajIlanlariAdresi \? \{ baslik: STAJ_ILANLARI_METNI\[stajIlanlariGorunumu\]\.h1/);
  assert.match(app, /\{stajIlanlariAdresi \? \(\s*<Suspense fallback=\{null\}>\s*<StajIlanlariIcerik \{\.\.\.stajIlanlariVerisi\(globalListings\.page\)\} onNavigate=\{navigate\} \/>/);
  /* Fırsat şeridi yalnız ana sayfada. */
  assert.match(app, /\) : \(\s*<OpportunitiesHomeSection/);
});

test('/staj-ilanlari ANA LİSTE KABUĞUNDA: erken dönüş ve metin sayfası yok', () => {
  const app = oku('src/App.tsx');
  assert.ok(!existsSync(path.join(KOK, 'src', 'components', 'StajIlanlariSayfasi.tsx')), 'eski metin sayfası kalktı');
  assert.doesNotMatch(app, /<StajIlanlariSayfasi/);
  assert.match(app, /const stajIlanlariAdresi = temizYol === '\/staj-ilanlari';/);
  assert.match(app, /const ilanListesiAdresi = temizYol === '\/' \|\| stajIlanlariAdresi;/);
  assert.match(app, /if \(!ilanListesiAdresi\) \{\s*return <BulunamadiSayfasi/);
  /* Bu adreste içerik hep ilan listesi; üst çubukta arama yapmak sayfadan atmıyor. */
  assert.match(app, /const icerikSekmesi = stajIlanlariAdresi \? 'internships' : safeTab;/);
  assert.match(app, /\{icerikSekmesi === 'internships' && globalListings\.phase === 'ready' && globalListings\.page && \(/);
  assert.match(app, /if \(q && !ilanListesiAdresi\) navigate\('\/'\);/);
});

test('ön render: ana sayfanın görünür düzeni, aynı kartlar, bilgi bölümü altta', () => {
  const r = oku('scripts/onrender.mjs');
  const blok = r.slice(r.indexOf("sayfaYaz('/staj-ilanlari'"), r.indexOf("sayfaYaz('/staj-ilanlari'") + 2500);
  assert.match(blok, /gorunurGovde:/);
  assert.match(blok, /`<h1>\$\{kacir\(STAJ_ILANLARI_METNI\.turkiye\.h1\)\}<\/h1>`/);
  assert.match(blok, /gorunurIlanKartlari\(stajIlanlariKartlari\) \+\s*merkezListeleri\.stajIlanlari\(stajIlanlariVerisi\)/);
  assert.match(blok, /govde: '',/);
  /* Kart işaretlemesi ana sayfayla ORTAK tek yardımcı. */
  assert.match(r, /const ilanKartlari = gorunurIlanKartlari\(gorunurIlanlar\);/);
  /* İşaretleme tek yerde: ortak kart modülü (ön render ve kenar). */
  assert.equal((r.match(/'<li class="sv-kart">'/g) || []).length, 0);
  assert.equal((oku('src/lib/seo/ilan-karti-html.mjs').match(/'<li class="sv-kart">'/g) || []).length, 1);
});

test('SAYILAR UYDURULMUYOR: veri yoksa satır hiç çizilmiyor, kaynak listeyle aynı', () => {
  const icerik = oku('src/components/StajIlanlariIcerik.tsx');
  /* "0 ilan" ya da "—" yazmak, ölçülmemiş bir şeyi ölçülmüş göstermek olurdu. */
  assert.match(icerik, /typeof toplam === 'number' && \(/);
  assert.match(icerik, /\{sehirler\.length > 0 && \(/);
  assert.doesNotMatch(icerik, /\?\? 0\b/);
  /* Canlıda sayılar üstteki listenin KENDİ katalog sayfasından. */
  const app = oku('src/App.tsx');
  assert.match(app, /const stajIlanlariVerisi = \(sayfa: NonNullable<typeof globalListings\.page>\) =>/);
  assert.match(app, /: sayfa\.total,/);
  /* Tüm açık ilanlara giden gerçek bağlantı (sayfalı arşiv) bilgi bölümünde kaldı. */
  assert.match(icerik, /href="\/staj-ilanlari\/sayfa\/1"/);
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
  /* 14 Ekim 2026: liste altındaki bilgi bölümü gecikmeli; h1 metni küçük, bağımsız modülden. */
  assert.match(app, /const StajIlanlariIcerik = React\.lazy\(/);
  assert.doesNotMatch(app, /^import \{ StajIlanlariIcerik \}/m);
  assert.doesNotMatch(oku('src/lib/staj-ilanlari-metni.mjs'), /^import /m);
});

/* ------------------------------------- 14 Ekim 2026: kopya riski ve sayı kapsamı */

test('ANA SAYFA ALT KÜME DEĞİL: 6 kart, fırsat şeridi ve /staj-ilanlari bağlantısı', () => {
  /*
    Ölçüldü: iki ilk HTML aynı 12 kartı taşıyınca ana sayfanın metninin
    %90'ı /staj-ilanlari'da birebir geçiyordu. Ana sayfa artık ilk 6 kartı
    (aynı tohum, React'in ilk 6 kartı) ve canlıda da gösterdiği fırsat
    şeridini taşıyor; ilan niyetinin sayfasına açık bağlantı veriyor.
  */
  const r = oku('scripts/onrender.mjs');
  assert.match(r, /const GORUNUR_KART = 6;/);
  assert.match(r, /const ilanKartlari = gorunurIlanKartlari\(gorunurIlanlar\);/);
  assert.match(r, /'<h2 id="firsat-seridi">Güncel öğrenci fırsatları<\/h2>'/);
  assert.match(r, /<a href="\/staj-ilanlari">Tüm staj ilanları →<\/a>/);
  /* /staj-ilanlari kendi 12 kartını taşıyor. */
  assert.match(r, /stajIlanlariKartlari = kaynakListe\.slice\(0, 12\);/);

  const dosya = path.join(KOK, 'dist', 'index.html');
  const staj = path.join(KOK, 'dist', 'staj-ilanlari.html');
  if (!existsSync(dosya) || !existsSync(staj)) return;
  const metin = (f) => {
    const h = readFileSync(f, 'utf8');
    return h.slice(h.indexOf('<div id="root">'), h.lastIndexOf('</body>'))
      .replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr').split(' ');
  };
  const obek = (k) => { const s = new Set(); for (let i = 0; i + 5 <= k.length; i++) s.add(k.slice(i, i + 5).join(' ')); return s; };
  const a = obek(metin(dosya));
  const b = obek(metin(staj));
  const ortak = [...a].filter((x) => b.has(x)).length;
  assert.ok(ortak / a.size < 0.6, `ana sayfanın metninin ${Math.round((ortak / a.size) * 100)}%'i /staj-ilanlari'da`);
});

test('SAYILARIN KAPSAMI YAZILI: Türkiye / tüm ülkeler karışmıyor', () => {
  const liste = oku('src/components/MatchedInternshipsView.tsx');
  assert.match(liste, /\? "Türkiye'deki ilanlar"/);
  assert.match(liste, /\? 'Tüm ülkelerdeki ilanlar'/);
  assert.match(liste, /\{seciliBolge === 'tumu' \? '\.' : ' \(tüm ülkeler\)\.'\}/);
  const icerik = oku('src/components/StajIlanlariIcerik.tsx');
  assert.match(icerik, /turkiye: "Türkiye'de ",/);
  assert.match(icerik, /'Tüm ülkelerdeki açık ilanları sayfa sayfa gör'/);
  assert.match(oku('src/components/StajIlanlariArsivi.tsx'), /Tüm ülkelerden \{ilanlar!\.length\} açık ilan/);
  assert.match(oku('scripts/onrender.mjs'), /`<p>Tüm ülkelerden \$\{aciklar\.length\} açık ilan/);
});
