/**
 * Rehber karolarının arka plan fotoğraflarını indirir.
 *
 * NEDEN İNDİRİYORUZ, BAĞLAMIYORUZ
 * -------------------------------
 * kurum-logolari.mjs ile aynı gerekçe: dış adrese bağlanmak hem o siteye
 * bağımlı kalmak hem de ziyaretçinin IP'sini oraya sızdırmak demek. Görsel
 * kendi sunucumuzdan gidiyor.
 *
 * NEDEN ARAMA DEĞİL, SEÇİLMİŞ ADRESLER
 * ------------------------------------
 * Önce "ara ve ilk uygun sonucu al" denendi; açık lisanslı havuz arama
 * sonuçlarını konuya göre değil, etikete göre veriyor: "staj mülakatı"
 * sorgusuna devlet başkanı toplantısı, "gönüllü staj"a tarla fotoğrafı,
 * "CV" sorgusuna alakasız bir manken fotoğrafı geldi. Bir öğrenci
 * rehberinin karosuna bunlar konamaz.
 *
 * Bu yüzden adresler burada sabit: her rehber için Openverse'ten gelen
 * adaylar tek tek görüldü ve konuya uyan tek görsel seçildi. Betik yalnızca
 * indiriyor, kırpıyor ve sıkıştırıyor — yani çıktı her çalıştırmada aynı.
 *
 * LİSANS
 * ------
 * Hepsi Rawpixel üzerinden CC0 (kamu malı): atıf zorunluluğu yok, ticari
 * kullanım serbest. Yine de kaynak adresleri hem burada hem
 * public/rehber-gorselleri/kaynak.json içinde duruyor; bir görselin nereden
 * geldiği sorulduğunda cevap verebilmek için.
 *
 * Kullanım: node scripts/rehber-gorselleri.mjs [slug ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const KOK = path.resolve(import.meta.dirname, '..');
const HEDEF = path.join(KOK, 'public', 'rehber-gorselleri');
const BOY = 720; // karo kare çiziliyor; 2x ekranda da net kalsın diye 720
const BASLIK = { 'User-Agent': 'StajimVarBot/1.0 (+https://stajimvar.com/bot)' };

/** slug -> seçilmiş görsel. Adaylar gözle karşılaştırılarak seçildi. */
const GORSELLER = {
  'kyk-burs-ve-kredi': {
    adres: 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHgxMjkzMDc0LWltYWdlLWt3dncycDBxLmpwZw.jpg',
    kaynak: 'https://www.rawpixel.com/image/5912198/image-paper-books-public-domain',
    lisans: 'cc0',
  },
  'staj-basvuru-epostasi': {
    adres: 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L25zMTc4NTgtaW1hZ2Uta3d2eTl4eGMuanBn.jpg',
    kaynak: 'https://www.rawpixel.com/image/5925994/photo-image-background-public-domain-technology',
    lisans: 'cc0',
  },
  'staj-cv-nasil-yazilir': {
    adres: 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg3MTA0ODItaW1hZ2Uta3d5b3I2ZXguanBn.jpg',
    kaynak: 'https://www.rawpixel.com/image/5946625/free-public-domain-cc0-photo',
    lisans: 'cc0',
  },
  'staj-defteri-nasil-doldurulur': {
    adres: 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHgxMTc2MjA2LWltYWdlLWt3dnkwcm1tLmpwZw.jpg',
    kaynak: 'https://www.rawpixel.com/image/5924621/photo-image-paper-book-public-domain',
    lisans: 'cc0',
  },
  'staj-mulakati': {
    adres: 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvbnMxNzIzNi1pbWFnZS1rd3Z5YmZkMy5qcGc.jpg',
    kaynak: 'https://www.rawpixel.com/image/5926233/photo-image-background-public-domain-technology',
    lisans: 'cc0',
  },
  'zorunlu-staj-rehberi': {
    adres: 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L2ZyZGlyZWN0bWVkaWEwMDAwOS1pbWFnZS1rd3Z5amxoby5qcGc.jpg',
    kaynak: 'https://www.rawpixel.com/image/5927609/photo-image-background-public-domain-hands',
    lisans: 'cc0',
  },
  'gonullu-staj-rehberi': {
    adres: 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2ZsNTEwNzIzNzE5NTctaW1hZ2UuanBn.jpg',
    kaynak: 'https://www.rawpixel.com/image/9677543/image-plant-person-trees',
    lisans: 'cc0',
  },
  'staj-nasil-bulunur': {
    adres: 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZmwxMDc5NjA3Nzk1NC1pbWFnZS1rcHFwd2JlMi5qcGc.jpg',
    kaynak: 'https://www.rawpixel.com/image/3373565/free-photo-image-africa-archive-broadcasting',
    lisans: 'cc0',
  },
  'stajdan-ise-gecis': {
    adres: 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTAzL3B4NzY0NzgzLWltYWdlLmpwZw.jpg',
    kaynak: 'https://www.rawpixel.com/image/8812100/photo-image-laptop-people-business',
    lisans: 'cc0',
  },
  'universite-staj-birimi': {
    adres: 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZmwyMjk1NDAzNTM4My1pbWFnZS1rdHdwYTM5Zi5qcGc.jpg',
    kaynak: 'https://www.rawpixel.com/image/4023317/university-otago-clocktower',
    lisans: 'cc0',
  },
  'yurtdisinda-staj': {
    adres: 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L3drNzI4NDYwNzAtaW1hZ2Uta3A2Ym9md3cuanBn.jpg',
    kaynak: 'https://www.rawpixel.com/image/3338088/free-photo-image-screen-flight-adventure',
    lisans: 'cc0',
  },
};

/** Kareye kırpar, sıkıştırır. `attention` kırpması yüz/nesne olan yeri koruyor. */
async function hazirla(adres) {
  const yanit = await fetch(adres, { headers: BASLIK });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const tur = yanit.headers.get('content-type') || '';
  if (!tur.startsWith('image/')) throw new Error(`içerik türü ${tur}`);

  const ham = Buffer.from(await yanit.arrayBuffer());
  return sharp(ham)
    .resize(BOY, BOY, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 74, mozjpeg: true })
    .toBuffer();
}

fs.mkdirSync(HEDEF, { recursive: true });
const kaynaklar = {};
const istenen = process.argv.slice(2);
const isliyor = istenen.length ? istenen : Object.keys(GORSELLER);

let basarili = 0;
for (const slug of isliyor) {
  const kayit = GORSELLER[slug];
  if (!kayit) {
    console.log(`${slug.padEnd(32)} ATLANDI  bu slug için görsel seçilmemiş`);
    continue;
  }

  try {
    const veri = await hazirla(kayit.adres);
    fs.writeFileSync(path.join(HEDEF, `${slug}.jpg`), veri);
    kaynaklar[slug] = { kaynak: kayit.kaynak, lisans: kayit.lisans };
    console.log(`${slug.padEnd(32)} OK       ${(veri.length / 1024).toFixed(0)} KB  ${kayit.lisans}`);
    basarili++;
  } catch (hata) {
    console.log(`${slug.padEnd(32)} HATA     ${String(hata.message).slice(0, 60)}`);
  }
}

if (!istenen.length) {
  fs.writeFileSync(path.join(HEDEF, 'kaynak.json'), JSON.stringify(kaynaklar, null, 2) + String.fromCharCode(10));
}
console.log(`
${basarili}/${isliyor.length} görsel yazıldı -> public/rehber-gorselleri/`);
