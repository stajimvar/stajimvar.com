/**
 * "Listedeki kurumlar" gönderi setini üretir — logolardan oluşan ızgara.
 *
 * NEDEN BU SET
 * ------------
 * Diğer gönderiler yazıyla anlatıyor: kaynağı doğruluyoruz, aracı yok,
 * tarih uydurmuyoruz. Bu set aynı şeyi göstererek söylüyor — kurumların
 * kendi logoları yan yana durunca listenin kimlerden oluştuğu tek bakışta
 * görülüyor. Profil ızgarasında da yazı ağırlıklı kartların arasında
 * görsel bir nefes oluyor.
 *
 * VERİ SİTENİN KENDİSİ
 * --------------------
 * Kurumlar veritabanından okunuyor; logo dosyaları public/kurum-logolari/
 * altında ve kurumların KENDİ sitelerinden indirilmiş (scripts/kurum-
 * logolari.mjs). Logosu olmayan kurum karta girmiyor: baş harf rozetleri
 * ızgarada boşluk gibi duruyor.
 *
 * SAYI YAZMIYORUZ
 * ---------------
 * Kartta "68 kurum" gibi bir sayı yok. Sayı her eklemede eskiyor ve gönderi
 * kendi kendine yanlış hale geliyor; ızgaranın kendisi zaten büyüklüğü
 * gösteriyor.
 *
 * Kullanım: npm run paylasim-kurumlar
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  CIZGI,
  GRI,
  KENAR,
  KOK,
  altKutu,
  ayrac,
  baslik,
  maviCagriKarti,
  sarmal,
  satir,
  setiYaz,
  ustBant,
} from './paylasim-sablonu.mjs';

const SERI = 'Listedeki kurumlar';
const SUTUN = 4;
/*
  Kart başına üç satır: dört satır denendiğinde son sıra alt kutunun altına
  taşıyordu. Izgaranın dikey adımı hücre genişliğinden küçük — daireler
  arasında yatay boşluk kadar dikey boşluk gerekmiyor.
*/
const SATIR_ADEDI = 3;
const SAYFA_BASINA = SUTUN * SATIR_ADEDI;

/** .env okuyucu: onrender.mjs ile aynı yol, betik tek başına çalışsın diye. */
function envOku(anahtar) {
  if (process.env[anahtar]) return process.env[anahtar];
  for (const dosya of ['.env', path.join('automation', '.env')]) {
    const yol = path.join(KOK, dosya);
    if (!fs.existsSync(yol)) continue;
    for (const s of fs.readFileSync(yol, 'utf8').split(/\r?\n/)) {
      const e = s.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (e && e[1] === anahtar) return e[2].replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

async function kurumlariGetir() {
  const adres = envOku('SUPABASE_URL') || envOku('VITE_SUPABASE_URL');
  const anahtar = envOku('SUPABASE_SERVICE_ROLE_KEY') || envOku('VITE_SUPABASE_ANON_KEY');
  if (!adres || !anahtar) {
    console.error('Supabase bilgisi yok (.env içinde SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
    process.exit(1);
  }
  const secim = 'organization_name,organization_logo_url';
  const istek = `${adres}/rest/v1/opportunities?status=eq.published&organization_logo_url=not.is.null&select=${encodeURIComponent(secim)}`;
  const yanit = await fetch(istek, { headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}` } });
  if (!yanit.ok) {
    console.error(`Kurumlar alınamadı: HTTP ${yanit.status}`);
    process.exit(1);
  }
  return yanit.json();
}

const kayitlar = await kurumlariGetir();

/*
  Aynı kurumun birden çok programı olabiliyor; ızgarada bir kez görünsün.
  Dosyası gerçekten duran logolar alınıyor — veritabanındaki yol ile
  dağıtılan dosya ayrışabilir ve kırık kare koymaktansa kurumu atlamak iyi.
*/
const kurumlar = [];
const gorulen = new Set();
for (const k of kayitlar) {
  if (gorulen.has(k.organization_name)) continue;
  const dosya = path.join(KOK, 'public', k.organization_logo_url.replace(/^\//, ''));
  if (!fs.existsSync(dosya)) continue;
  gorulen.add(k.organization_name);
  kurumlar.push({ ad: k.organization_name, veri: fs.readFileSync(dosya).toString('base64') });
}
kurumlar.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

if (kurumlar.length === 0) {
  console.error('Logosu olan kurum bulunamadı.');
  process.exit(1);
}

const sayfalar = [];
for (let i = 0; i < kurumlar.length; i += SAYFA_BASINA) sayfalar.push(kurumlar.slice(i, i + SAYFA_BASINA));

const toplamKart = sayfalar.length + 2;
const sayfaNo = (i) => `${String(i).padStart(2, '0')}/${String(toplamKart).padStart(2, '0')}`;

/** Logoyu beyaz daire içinde çizer: kartta hepsi aynı büyüklükte durur. */
const logoKutusu = (x, y, boyut, veri) => `
  <circle cx="${x + boyut / 2}" cy="${y + boyut / 2}" r="${boyut / 2}" fill="#FFFFFF" stroke="${CIZGI}" stroke-width="2"/>
  <image href="data:image/png;base64,${veri}" x="${x + boyut * 0.11}" y="${y + boyut * 0.11}" width="${boyut * 0.78}" height="${boyut * 0.78}"/>
`;

const izgara = (liste, ustY) => {
  const hucre = Math.floor((1080 - KENAR * 2) / SUTUN);
  const boyut = hucre - 32;
  return liste
    .map((k, i) => {
      const x = KENAR + (i % SUTUN) * hucre + 16;
      const y = ustY + Math.floor(i / SUTUN) * (boyut + 12);
      return logoKutusu(x, y, boyut, k.veri);
    })
    .join('');
};

const kapak = () => sarmal(`
  ${ustBant(SERI, sayfaNo(1))}

  ${baslik(320, ['Bu kurumların', 'programları', 'listede.'], { boyut: 92, vurguSatiri: 2 })}

  ${ayrac(680)}

  ${satir(KENAR, 758, 'Vakıf, dernek, üniversite, belediye ve', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 804, 'kamu kurumları — hepsi resmî kaynağıyla.', { boyut: 34, renk: GRI })}

  ${izgara(kurumlar.slice(0, 4), 940)}

  ${altKutu(1254, ['Logolar kurumların kendi sitelerinden alındı.'])}
`);

const izgaraKarti = (liste, sira) => sarmal(`
  ${ustBant(SERI, sayfaNo(sira))}

  ${baslik(320, ['Kimlerin', 'bursu var?'], { boyut: 88, vurguSatiri: 1 })}

  ${ayrac(486)}

  ${izgara(liste, 570)}

  ${altKutu(1254, ['Her kaydın yanında kurumun resmî kaynağı yazılı.'])}
`);

const kapanis = () =>
  maviCagriKarti({
    seri: SERI,
    sayfa: sayfaNo(toplamKart),
    satirlar: ['Hepsinin', 'başvuru bağlantısı', 'tek listede.'],
    altSatirlar: ['Burslar, staj ilanları ve yurt dışı programları', '— hepsi resmî kaynağıyla.'],
  });

const hikayeKapanisi = () => sarmal(`
  ${ustBant(SERI, sayfaNo(toplamKart))}

  ${baslik(330, ['Hepsinin', 'başvuru bağlantısı', 'tek listede.'], { boyut: 84, vurguSatiri: 2 })}

  ${ayrac(700)}

  ${satir(KENAR, 782, 'Burslar, staj ilanları ve yurt dışı', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 828, 'programları — hepsi resmî kaynağıyla.', { boyut: 34, renk: GRI })}

  ${izgara(kurumlar.slice(0, 4), 900)}

  ${altKutu(1254, ['Kaynağı doğrulanmayan kayıt listeye girmiyor.'])}
`);

await setiYaz({
  kod: 'listedeki-kurumlar',
  ad: 'Listedeki kurumlar',
  surum: new Date().toISOString().slice(0, 10).replaceAll('-', ''),
  metin: [
    'Listedeki burs ve programlar bu kurumlardan:',
    '',
    kurumlar.map((k) => k.ad).join(' · '),
    '',
    'Logolar kurumların kendi sitelerinden alındı; her kaydın yanında resmî kaynağı yazılı. Kaynağı doğrulanmayan kayıt listeye girmiyor.',
    '',
    'Hepsinin başvuru bağlantısı profildeki listede.',
  ].join('\n'),
  kartlar: [kapak(), ...sayfalar.map((s, i) => izgaraKarti(s, i + 2)), kapanis()],
  hikayeEk: [hikayeKapanisi()],
});
