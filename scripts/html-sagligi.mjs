/**
 * Üretilen HTML'in sağlık denetimi — SALT OKUNUR.
 *
 * NEDEN DERLENMİŞ ÇIKTI ÜZERİNDE
 * ------------------------------
 * Kaynak kodu okuyarak "bu sayfada H1 var mı" sorusuna güvenilir cevap
 * verilemiyor: sayfa ön render'dan, React'ten ve yönlendirme
 * uzlaştırmasından geçiyor. Arama motorunun ve AdSense incelemesinin
 * gördüğü şey `dist`; denetim de orayı okuyor.
 *
 * NE ARIYOR
 *   · statik karşılığı olmayan iç bağlantı (ön render dışı rota)
 *   · H1'i olmayan sayfa
 *   · gövdesi neredeyse boş sayfa
 *   · yinelenen <title> ve description
 *   · reklam yasak yüzeyde reklam yuvası ya da AdSense betiği
 *
 * HİÇBİR ŞEY DÜZELTMİYOR, HİÇBİR SAYFAYI SİLMİYOR. Çıktısı rapor;
 * kararı insan veriyor. Kapanmış ya da süresi geçmiş ilan sayfaları
 * "boş" görünse bile burada yalnızca raporlanıyor.
 *
 * Kullanım: node scripts/html-sagligi.mjs [dist-dizini]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { REKLAM_KAPALI_AILELER } from '../src/lib/reklam-kapisi.mjs';

const KOK = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const DIST = path.resolve(process.argv[2] || path.join(KOK, 'dist'));

/** Bağlantı denetimine girmeyen uzantılar: varlık dosyaları. */
const VARLIK = /\.(png|jpe?g|webp|avif|svg|ico|xml|txt|json|webmanifest|js|css|mp4|woff2?)$/i;

function htmlDosyalari(dizin) {
  const cikti = [];
  const gez = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) gez(p);
      else if (e.name.endsWith('.html')) cikti.push(p);
    }
  };
  gez(dizin);
  return cikti;
}

/** `dist/rehber/x.html` → `/rehber/x` */
function yolaCevir(dosya) {
  let y = `/${path.relative(DIST, dosya).split(path.sep).join('/')}`;
  y = y.replace(/\.html$/, '');
  if (y.endsWith('/index')) y = y.slice(0, -'/index'.length) || '/';
  return y;
}

const dosyalar = htmlDosyalari(DIST);

/* Var olan adresler: hem `/x` hem `/x/` kabul ediliyor. */
const varOlan = new Set(['/']);
for (const f of dosyalar) {
  const y = yolaCevir(f);
  varOlan.add(y);
  varOlan.add(`${y}/`);
}

const baslikSayaci = new Map();
const aciklamaSayaci = new Map();
const h1Yok = [];
const ince = [];
const onRenderDisi = new Map();
const reklamSizintisi = [];

const reklamYasak = (yol) =>
  REKLAM_KAPALI_AILELER.some((a) => yol === a.replace(/\/$/, '') || yol.startsWith(a)) ||
  yol === '/';

for (const f of dosyalar) {
  const h = fs.readFileSync(f, 'utf8');
  const yol = yolaCevir(f);

  const baslik = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const aciklama = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (baslik) baslikSayaci.set(baslik, (baslikSayaci.get(baslik) || 0) + 1);
  if (aciklama) aciklamaSayaci.set(aciklama, (aciklamaSayaci.get(aciklama) || 0) + 1);

  if (!/<h1[\s>]/.test(h)) h1Yok.push(yol);

  const govde = (h.match(/<main[\s\S]*?<\/main>/) || [''])[0]
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const kelime = govde.split(' ').filter((w) => w.length > 1).length;
  if (kelime < 30) ince.push({ yol, kelime });

  /*
    Reklam sızıntısı: yasak yüzeyde yuva ya da betik.
    Yuva HTML'de `ins.adsbygoogle`, betik `pagead2` adresinden geliyor.
  */
  if (reklamYasak(yol) && (/class="[^"]*adsbygoogle/.test(h) || /pagead2\.googlesyndication/.test(h))) {
    reklamSizintisi.push(yol);
  }

  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) {
    const hedef = m[1];
    if (hedef.startsWith('/assets') || hedef.startsWith('/og/') || VARLIK.test(hedef)) continue;
    if (varOlan.has(hedef) || varOlan.has(hedef.replace(/\/$/, ''))) continue;
    if (!onRenderDisi.has(hedef)) onRenderDisi.set(hedef, new Set());
    onRenderDisi.get(hedef).add(yol);
  }
}

const yinelenen = (sayac) =>
  [...sayac.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);

const rapor = {
  dizin: path.relative(KOK, DIST) || 'dist',
  sayfa: dosyalar.length,
  h1Yok,
  ince,
  yinelenenBaslik: yinelenen(baslikSayaci).map(([t, n]) => ({ n, baslik: t.slice(0, 80) })),
  yinelenenAciklama: yinelenen(aciklamaSayaci).map(([t, n]) => ({ n, aciklama: t.slice(0, 80) })),
  /*
    "KIRIK" DEĞİL, "ÖN RENDER DIŞI".

    İlk sürüm bunları kırık bağlantı sayıyordu ve altı yanlış alarm
    üretti: /cv, /profil, /basvuru-sablonu, /sirket/ilan,
    /sirket/basvuranlar ve /manifest.webmanifest. Altısı da canlıda
    HTTP 200 — beşi uygulamada tanımlı SPA rotası, biri varlık dosyası.
    Denetim yalnızca ön render edilmiş HTML dosyalarını tanıyordu.

    Ölçtüğü şey artık doğru adıyla anılıyor: bu adreslerin STATİK
    KARŞILIĞI YOK, yani onları izleyen tarayıcı içerik yerine uygulama
    kabuğunu görüyor. Bilgi amaçlı; kırık değil, silinecek bağlantı da
    değil.
  */
  onRenderDisiBaglanti: [...onRenderDisi.entries()].map(([hedef, kaynaklar]) => ({
    hedef,
    kaynakSayisi: kaynaklar.size,
    ornek: [...kaynaklar].slice(0, 3),
  })),
  reklamSizintisi,
};

console.log(JSON.stringify(rapor, null, 2));

/*
  ÇIKIŞ KODU: yalnızca KESİN hatalarda 1.

  Yinelenen başlık, ince sayfa ve ön render dışı bağlantı BİLGİ
  AMAÇLI: ilan sayfalarının bir kısmı doğası gereği kısa, araç
  sayfaları tarayıcıda çiziliyor ve /cv gibi rotalar canlıda 200
  dönüyor (ölçüldü). Hiçbiri silme sebebi değil.

  Kesin hata yalnız ikisi: reklam yasak yüzeyde reklam sızıntısı ve
  H1'i olmayan sayfa.
*/
if (rapor.reklamSizintisi.length || rapor.h1Yok.length) process.exitCode = 1;
