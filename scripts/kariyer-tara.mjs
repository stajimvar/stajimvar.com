/**
 * Kariyer sayfası defteri: "bu şirketlerde bugün ne var, hangisi bizde yok?"
 *
 * NEDEN VAR
 * ---------
 * İlanlar tek tek link olarak geliyordu ve sakladığımız tek şey ilanın
 * KENDİ adresiydi. Şirketin ilan yayımladığı KÖK sayfa hiçbir yere
 * yazılmıyordu — ölçüldü: elle girilen 149 ilanın tamamında `source_id`
 * boş. Yani "şu şirketler yeni ilan girmiş mi?" sorusunun yoklanacak bir
 * listesi yoktu; her seferinde sıfırdan link yollamak gerekiyordu.
 *
 * Bu betik o listeyi kalıcı hâle getiriyor. `automation/sources.json`
 * ile KARIŞTIRILMAMALI: orası saatlik otomasyonun adaptörlü kaynakları,
 * burası adaptör gerektirmeyen, elle tetiklenen hafif bir defter. Bir
 * şirket adaptörlü kaynağa terfi ederse buradan çıkarılabilir.
 *
 * DEFTER BÜYÜR, DARALMAZ
 * ----------------------
 * Üç ağızdan besleniyor ve hepsi birleşiyor:
 *   --db          yayındaki ilanların apply_url'lerinden kök türetir
 *   --gecmis <d>  bir metin dosyasındaki adreslerden (oturum dökümü vb.)
 *   --ekle <url>  yeni gelen adresleri tek tek yutar
 * Üçü de aynı deftere yazıyor ve tekrarları eliyor; gelecekte gelen her
 * link `--ekle` ile deftere giriyor, bir daha kaybolmuyor.
 *
 * KÖK TÜRETME UYDURMA DEĞİL
 * -------------------------
 * Her ATS'in adres kalıbı belli (lever /<sirket>/<id>, workday
 * /<site>/job/...). Tanınan kalıpta kök kesiliyor; TANINMAYAN adreste
 * tahmin edilmiyor, sitenin köküne düşülüyor ve kayıt `kesin: false`
 * işaretleniyor. Yanlış kök, var olmayan ilan uydurmaktan iyidir ama
 * sessiz olmamalı.
 *
 * NE YAPMIYOR
 * -----------
 * İlan EKLEMİYOR. Yalnız "şurada şu var, bizde yok" diyor; ekleme kararı
 * ve metni insanda kalıyor. Otomatik yayına alma `promote.py`'nin işi ve
 * o hattın kendi elemeleri var.
 *
 * Kullanım:
 *   node scripts/kariyer-tara.mjs --db --gecmis gecmis-url.txt   # defteri kur
 *   node scripts/kariyer-tara.mjs --ekle https://... https://... # yeni ekle
 *   node scripts/kariyer-tara.mjs                                # yokla ve raporla
 *   node scripts/kariyer-tara.mjs --sirket baykar                # tek şirket
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFTER = path.join(KOK, 'automation', 'kariyer-sayfalari.json');
const ZAMAN_ASIMI_MS = 25_000;
const ES_ZAMANLI = 6;

const TARAYICI =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const BASLIK = { 'User-Agent': TARAYICI, 'Accept-Language': 'tr,en;q=0.8' };

/*
  Staj/yeni mezun süzgeci: site bir staj sitesi, kıdemli ilan ilgilendirmiyor.

  KELİME SINIRI ŞART: ilk sürüm `intern` yazıyordu ve "INTERNational
  Payroll Specialist" ilanını staj sanıp listeye koydu (ölçüldü). Aynı
  tuzak "internal" için de geçerli. Bu yüzden `intern` tek başına değil,
  kelime sonu ya da `ship`/`s` ekiyle aranıyor; `staj` da "stajyer"i
  kapsasın diye sınırlı tutuluyor ama "stajimvar" gibi bitişik yazıma
  takılmaması için sözcük başı aranıyor.
*/
export const STAJ_DESENI = new RegExp(
  [
    '\\bstaj(yer|yerlik)?\\b',
    '\\bintern(s|ship|ships)?\\b',
    '\\btrainee\\b',
    '\\bworking student\\b',
    '\\bwerkstudent\\b',
    '\\bnew grad(uate)?\\b',
    '\\byeni mezun\\b',
    '\\bgraduate program(me)?\\b',
    '\\bapprentice(ship)?\\b',
    '\\böğrenci\\b',
  ].join('|'),
  'i'
);

/* ---------------------------------------------------------------- */
/*  KÖK TÜRETME                                                      */
/* ---------------------------------------------------------------- */

/**
 * İlan adresinden şirketin ilan listesi adresini çıkarır.
 * @returns {{kok: string, adapter: string, kesin: boolean}}
 */
export function kokTuret(adres) {
  let u;
  try {
    u = new URL(adres);
  } catch {
    return null;
  }
  const h = u.hostname.replace(/^www\./, '');
  const p = u.pathname.replace(/\/+$/, '');
  const parca = p.split('/').filter(Boolean);
  const kes = (n, ad) => ({
    kok: `${u.origin}/${parca.slice(0, n).join('/')}`,
    adapter: ad,
    kesin: true,
  });

  if (/\.myworkdayjobs\.com$/.test(h)) {
    /* /<dil>/<site>/job/... ya da /<site>/job/... */
    const i = parca.indexOf('job');
    if (i > 0) return { kok: `${u.origin}/${parca.slice(0, i).join('/')}`, adapter: 'workday', kesin: true };
    return { kok: u.origin, adapter: 'workday', kesin: false };
  }
  if (h === 'jobs.lever.co' && parca.length >= 1) return kes(1, 'lever');
  if (/greenhouse\.io$/.test(h) && parca.length >= 1) return kes(1, 'greenhouse');
  if (h === 'jobs.ashbyhq.com' && parca.length >= 1) return kes(1, 'ashby');
  if (/workable\.com$/.test(h) && parca.length >= 1) return kes(1, 'workable');
  if (h === 'jobs.smartrecruiters.com' && parca.length >= 1) return kes(1, 'smartrecruiters');
  if (h === 'ats.rippling.com' && parca.length >= 1) return kes(1, 'rippling');
  if (h === 'app.gethirex.com' && parca[0] === 'o' && parca[1]) return kes(2, 'gethirex');
  if (/\.hrpanda\.co$/.test(h)) return { kok: u.origin, adapter: 'hrpanda', kesin: true };
  if (/\.csod\.com$/.test(h)) {
    const i = parca.indexOf('requisition');
    if (i > 0) return { kok: `${u.origin}/${parca.slice(0, i).join('/')}`, adapter: 'csod', kesin: true };
    return { kok: u.origin, adapter: 'csod', kesin: false };
  }
  if (/oraclecloud\.(com|eu)$/.test(h)) {
    /* .../sites/<site>/job/<id> → .../sites/<site>/jobs */
    const i = parca.indexOf('job');
    if (i > 0) return { kok: `${u.origin}/${parca.slice(0, i).join('/')}/jobs`, adapter: 'oracle-cx', kesin: true };
    return { kok: u.origin, adapter: 'oracle-cx', kesin: false };
  }
  /* SAP SuccessFactors kalıbı: /job/<slug>-<id>/<sayi>/ */
  if (parca[0] === 'job' && /^\d+$/.test(parca[parca.length - 1] || '')) {
    return { kok: `${u.origin}/search`, adapter: 'successfactors', kesin: true };
  }
  return { kok: u.origin, adapter: 'genel', kesin: false };
}

/* ---------------------------------------------------------------- */
/*  DEFTER                                                           */
/* ---------------------------------------------------------------- */

function defteriOku() {
  if (!fs.existsSync(DEFTER)) return { surum: 1, kayitlar: [] };
  return JSON.parse(fs.readFileSync(DEFTER, 'utf8'));
}

function defteriYaz(d) {
  d.kayitlar.sort((a, b) => (a.sirket || a.kok).localeCompare(b.sirket || b.kok, 'tr'));
  fs.mkdirSync(path.dirname(DEFTER), { recursive: true });
  fs.writeFileSync(DEFTER, JSON.stringify(d, null, 2) + '\n');
}

function defteraEkle(defter, adresler, sirketAdi = null, kaynak = 'elle') {
  const mevcut = new Set(defter.kayitlar.map((k) => k.kok));
  let yeni = 0;
  for (const adres of adresler) {
    const t = kokTuret(adres);
    if (!t) continue;
    if (mevcut.has(t.kok)) continue;
    mevcut.add(t.kok);
    defter.kayitlar.push({
      sirket: sirketAdi,
      kok: t.kok,
      adapter: t.adapter,
      kesin: t.kesin,
      ornek_ilan: adres,
      kaynak,
      eklendi: new Date().toISOString().slice(0, 10),
    });
    yeni++;
  }
  return yeni;
}

/* ---------------------------------------------------------------- */
/*  VERİTABANI                                                       */
/* ---------------------------------------------------------------- */

function ortamOku() {
  for (const dosya of [path.join(KOK, 'automation', '.env'), path.join(KOK, '.env')]) {
    if (!fs.existsSync(dosya)) continue;
    const metin = fs.readFileSync(dosya, 'utf8');
    const al = (k) => (metin.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '');
    const url = al('SUPABASE_URL') || al('VITE_SUPABASE_URL');
    const key = al('SUPABASE_SERVICE_ROLE_KEY') || al('SUPABASE_SECRET_KEY') || al('VITE_SUPABASE_ANON_KEY');
    if (url && key) return { url, key };
  }
  throw new Error('SUPABASE_URL / anahtar bulunamadı (automation/.env ya da .env).');
}

async function ilanlariAl() {
  const { url, key } = ortamOku();
  const h = { apikey: key, Authorization: 'Bearer ' + key };
  const r = await fetch(`${url}/rest/v1/listings?select=title,apply_url,source_url,companies(name)&limit=1000`, {
    headers: h,
  });
  if (!r.ok) throw new Error('ilanlar okunamadı: ' + (await r.text()).slice(0, 160));
  return r.json();
}

/** Karşılaştırma anahtarı: sorgu dizesi ve sondaki eğik çizgi görmezden geliniyor. */
const anahtar = (u) => {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '')).toLowerCase();
  } catch {
    return String(u).toLowerCase();
  }
};

/* ---------------------------------------------------------------- */
/*  YOKLAMA                                                          */
/* ---------------------------------------------------------------- */

async function sayfayiAl(adres) {
  const c = new AbortController();
  const zaman = setTimeout(() => c.abort(), ZAMAN_ASIMI_MS);
  try {
    const r = await fetch(adres, { headers: BASLIK, redirect: 'follow', signal: c.signal });
    return { durum: r.status, html: await r.text(), son: r.url };
  } finally {
    clearTimeout(zaman);
  }
}

/**
 * Sayfadaki ilan adaylarını çıkarır: hem <a href> hem JSON-LD.
 * @returns {Array<{adres: string, baslik: string}>}
 */
export function ilanlariCikar(html, temelAdres) {
  const bulunan = new Map();

  /* 1) JSON-LD — en güvenilir kaynak, başlığı da veriyor. */
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let veri;
    try {
      veri = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const yigin = Array.isArray(veri) ? [...veri] : [veri, ...(veri['@graph'] || [])];
    for (const x of yigin) {
      if (!x || typeof x !== 'object') continue;
      const tip = [].concat(x['@type'] || []);
      if (tip.includes('JobPosting') && (x.url || x.sameAs)) {
        const a = new URL(x.url || x.sameAs, temelAdres).toString();
        bulunan.set(anahtar(a), { adres: a, baslik: String(x.title || '').trim() });
      }
      if (tip.includes('ItemList')) {
        for (const oge of x.itemListElement || []) {
          const hedef = oge?.url || oge?.item?.url;
          if (!hedef) continue;
          const a = new URL(hedef, temelAdres).toString();
          bulunan.set(anahtar(a), { adres: a, baslik: String(oge?.name || oge?.item?.name || '').trim() });
        }
      }
    }
  }

  /* 2) Bağlantılar — JSON-LD yoksa tek yol. Başlık bağlantı metninden. */
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)) {
    const ham = m[1];
    if (/^(#|mailto:|javascript:|tel:)/i.test(ham)) continue;
    let mutlak;
    try {
      mutlak = new URL(ham, temelAdres).toString();
    } catch {
      continue;
    }
    if (!/\/(job|jobs|is-ilani|ilan|position|opening|vacanc|careers?\/job|detay)\b|\/j\/|requisition/i.test(mutlak)) continue;
    const baslik = m[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const k = anahtar(mutlak);
    if (!bulunan.has(k)) bulunan.set(k, { adres: mutlak, baslik });
  }

  return [...bulunan.values()];
}

/* ---------------------------------------------------------------- */
/*  ATS JSON UÇLARI                                                  */
/* ---------------------------------------------------------------- */

/*
  NEDEN HTML KAZIMAK YETMİYOR

  İlk koşu ölçüldü: 132 sayfanın 71'i açıldığı hâlde sıfır ilan verdi.
  İki ayrı sebep çıktı ve ikisi de kazımayla çözülmüyor:

    - Workday ve benzerleri sunucudan 31 KB'lık BOŞ KABUK döndürüyor;
      ilanlar tarayıcıda çiziliyor. "Yeni yok" değil, BAKILAMADI.
    - Kendi sitesinde ilan yayımlayanların adres şeması tanınmıyordu.

  Bu ailelerin herkese açık JSON uçları var ve depo bunları Python
  tarafında zaten kullanıyor (automation/scraper.py). Uçlar oradan
  alındı; burada yeniden icat edilmiyor, aynı sözleşme JS'e taşınıyor.
  Böylece "yeni yok" cevabı gerçekten "yeni yok" anlamına geliyor.
*/

/** Kayıtlı kökten ATS kimliğini çıkarır. Çıkaramazsa null → HTML'e düşülür. */
function atsKimligi(kayit) {
  let u;
  try {
    u = new URL(kayit.kok);
  } catch {
    return null;
  }
  const p = u.pathname.split('/').filter(Boolean);
  const h = u.hostname;

  if (kayit.adapter === 'lever' && p[0]) return { tip: 'lever', slug: p[0] };
  if (kayit.adapter === 'greenhouse' && p[0]) return { tip: 'greenhouse', slug: p[0] };
  if (kayit.adapter === 'ashby' && p[0]) return { tip: 'ashby', slug: p[0] };
  if (kayit.adapter === 'workable' && p[0]) return { tip: 'workable', slug: p[0] };
  if (kayit.adapter === 'smartrecruiters' && p[0]) return { tip: 'smartrecruiters', slug: p[0] };
  if (kayit.adapter === 'workday') {
    const tenant = h.split('.')[0];
    /* Yol /<dil>/<site> ya da /<site> olabiliyor; dil kodu iki harfli-tireli. */
    const site = p.find((x) => !/^[a-z]{2}([-_][A-Za-z]{2})?$/.test(x));
    if (tenant && site) return { tip: 'workday', host: h, tenant, site };
  }
  return null;
}

async function jsonAl(adres, secenek = {}) {
  const c = new AbortController();
  const zaman = setTimeout(() => c.abort(), ZAMAN_ASIMI_MS);
  try {
    const r = await fetch(adres, { headers: { ...BASLIK, Accept: 'application/json' }, signal: c.signal, ...secenek });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(zaman);
  }
}

/**
 * ATS'in kendi JSON ucundan ilanları alır.
 * @returns {Promise<Array<{adres, baslik, yer}>>}
 */
async function atstenIlanlar(kimlik) {
  const d = [];
  if (kimlik.tip === 'lever') {
    const v = await jsonAl(`https://api.lever.co/v0/postings/${kimlik.slug}?mode=json`);
    for (const x of v || []) d.push({ adres: x.hostedUrl || x.applyUrl, baslik: x.text || '', yer: x.categories?.location || '' });
  } else if (kimlik.tip === 'greenhouse') {
    const v = await jsonAl(`https://boards-api.greenhouse.io/v1/boards/${kimlik.slug}/jobs`);
    for (const x of v?.jobs || []) d.push({ adres: x.absolute_url, baslik: x.title || '', yer: x.location?.name || '' });
  } else if (kimlik.tip === 'ashby') {
    const v = await jsonAl(`https://api.ashbyhq.com/posting-api/job-board/${kimlik.slug}`);
    for (const x of v?.jobs || []) d.push({ adres: x.jobUrl, baslik: x.title || '', yer: x.location || '' });
  } else if (kimlik.tip === 'workable') {
    const v = await jsonAl(`https://www.workable.com/api/accounts/${kimlik.slug}`);
    for (const x of v?.jobs || []) {
      const yol = x.url || (x.shortcode ? `https://apply.workable.com/${kimlik.slug}/j/${x.shortcode}/` : null);
      if (yol) d.push({ adres: yol, baslik: x.title || '', yer: x.location?.city || x.city || '' });
    }
  } else if (kimlik.tip === 'smartrecruiters') {
    const v = await jsonAl(`https://api.smartrecruiters.com/v1/companies/${kimlik.slug}/postings?limit=100`);
    for (const x of v?.content || []) {
      d.push({
        adres: `https://jobs.smartrecruiters.com/${kimlik.slug}/${x.id}`,
        baslik: x.name || '',
        yer: [x.location?.city, x.location?.country].filter(Boolean).join(', '),
      });
    }
  } else if (kimlik.tip === 'workday') {
    /* CXS araması: iki anahtar kelimeyle sınırlı sayfalama — tüm kataloğu çekmiyoruz. */
    const uc = `https://${kimlik.host}/wday/cxs/${kimlik.tenant}/${kimlik.site}/jobs`;
    for (const kelime of ['intern', 'staj']) {
      for (let offset = 0; offset < 60; offset += 20) {
        let v;
        try {
          v = await jsonAl(uc, {
            method: 'POST',
            headers: { ...BASLIK, Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 20, offset, searchText: kelime }),
          });
        } catch {
          break;
        }
        const liste = v?.jobPostings || [];
        for (const x of liste) {
          if (!x.externalPath) continue;
          d.push({ adres: `https://${kimlik.host}${x.externalPath}`, baslik: x.title || '', yer: x.locationsText || '' });
        }
        if (liste.length < 20) break;
      }
    }
  }
  /* Aynı ilan iki aramadan da gelebiliyor. */
  const tek = new Map();
  d.filter((x) => x.adres).forEach((x) => tek.set(anahtar(x.adres), x));
  return [...tek.values()];
}

async function havuzda(isler, sinir, isle) {
  const sonuc = [];
  let i = 0;
  const calisan = Array.from({ length: Math.min(sinir, isler.length) }, async () => {
    while (i < isler.length) {
      const kendi = i++;
      sonuc[kendi] = await isle(isler[kendi]);
    }
  });
  await Promise.all(calisan);
  return sonuc;
}

async function yokla(defter, suzgec) {
  const ilanlar = await ilanlariAl();
  const bizdeki = new Set();
  ilanlar.forEach((x) => [x.apply_url, x.source_url].filter(Boolean).forEach((u) => bizdeki.add(anahtar(u))));
  console.log(`bizdeki ilan: ${ilanlar.length} · karşılaştırma anahtarı: ${bizdeki.size}`);

  let hedef = defter.kayitlar;
  if (suzgec) hedef = hedef.filter((k) => `${k.sirket || ''} ${k.kok}`.toLowerCase().includes(suzgec.toLowerCase()));
  console.log(`yoklanacak kariyer sayfası: ${hedef.length}\n`);

  const rapor = await havuzda(hedef, ES_ZAMANLI, async (k) => {
    /*
      ÖNCE JSON UCU, SONRA HTML

      ATS'in kendi ucu varsa oradan okunuyor: kabuk sayfada kazıma
      yapıp "yeni yok" demek yanlış cevap üretiyordu. Uç patlarsa
      HTML'e düşülüyor ama bu durum raporda `yontem` ile görünür
      kalıyor — sessizce kötü yönteme kaymasın.
    */
    const kimlik = atsKimligi(k);
    if (kimlik) {
      try {
        const hepsi = await atstenIlanlar(kimlik);
        const staj = hepsi.filter((x) => STAJ_DESENI.test(x.baslik) || STAJ_DESENI.test(x.adres));
        const yeni = staj.filter((x) => !bizdeki.has(anahtar(x.adres)));
        return { ...k, yontem: kimlik.tip + ':json', toplam: hepsi.length, staj: staj.length, yeni };
      } catch (e) {
        /* Uç çalışmadı: HTML'e düşülüyor, sebebi rapora yazılıyor. */
        k = { ...k, uc_hatasi: String(e.message).slice(0, 40) };
      }
    }
    try {
      const { durum, html, son } = await sayfayiAl(k.kok);
      if (durum >= 400) return { ...k, durum, yontem: 'html', hata: `HTTP ${durum}` };
      const hepsi = ilanlariCikar(html, son || k.kok);
      const staj = hepsi.filter((x) => STAJ_DESENI.test(x.baslik) || STAJ_DESENI.test(x.adres));
      const yeni = staj.filter((x) => !bizdeki.has(anahtar(x.adres)));
      /*
        HTML'den SIFIR ilan çıkması "ilan yok" demek DEĞİL: sayfa JS ile
        çiziliyor olabilir. Bunu "yeni yok" kovasına atmak yanlış güven
        veriyordu; ayrı işaretleniyor.
      */
      return { ...k, durum, yontem: 'html', toplam: hepsi.length, staj: staj.length, yeni, sarih: hepsi.length > 0 };
    } catch (e) {
      return { ...k, yontem: 'html', hata: String(e.message).slice(0, 60) };
    }
  });

  const yeniOlan = rapor.filter((r) => r.yeni?.length);
  const bos = rapor.filter((r) => !r.hata && !r.yeni?.length);
  const hatali = rapor.filter((r) => r.hata);

  console.log('='.repeat(70));
  console.log(`BİZDE OLMAYAN STAJ İLANI BULUNAN SAYFALAR (${yeniOlan.length})`);
  console.log('='.repeat(70));
  for (const r of yeniOlan.sort((a, b) => b.yeni.length - a.yeni.length)) {
    console.log(`\n▸ ${r.sirket || r.kok}  [${r.adapter}]  — ${r.yeni.length} yeni`);
    console.log(`  ${r.kok}`);
    for (const y of r.yeni.slice(0, 12)) {
      console.log(`    · ${(y.baslik || '(başlıksız)').slice(0, 62)}`);
      console.log(`      ${y.adres.slice(0, 108)}`);
    }
    if (r.yeni.length > 12) console.log(`    … ${r.yeni.length - 12} tane daha`);
  }

  /*
    "YENİ YOK" İLE "BAKILAMADI" AYRI SAYILIYOR

    İlk sürümde ikisi tek kovadaydı ve 103 sayfa "yeni yok" görünüyordu;
    oysa 71'i hiç okunamamıştı. Bu, olmayan bir güven veriyor. Artık
    ancak GERÇEKTEN ilan listesi okunabilmiş bir sayfa "yeni yok"
    sayılıyor; okunamayan ayrı başlıkta ve sayısı görünür.
  */
  const sarihBos = bos.filter((r) => r.yontem?.endsWith(':json') || r.sarih);
  const korBos = bos.filter((r) => !(r.yontem?.endsWith(':json') || r.sarih));

  console.log(`\n${'-'.repeat(70)}`);
  console.log(`yeni yok (gerçekten okundu) : ${sarihBos.length} sayfa`);
  console.log(`BAKILAMADI (liste çıkmadı)  : ${korBos.length} sayfa  ← "yeni yok" sayma`);
  console.log(`okunamadı (hata)            : ${hatali.length} sayfa`);
  if (korBos.length) {
    console.log('\nBAKILAMAYANLAR (JS ile çizilen ya da şeması tanınmayan sayfalar):');
    korBos.slice(0, 25).forEach((r) => console.log(`  ${(r.sirket || r.kok).slice(0, 38).padEnd(38)} ${r.adapter}`));
    if (korBos.length > 25) console.log(`  … ${korBos.length - 25} tane daha`);
  }
  if (hatali.length) {
    console.log('\nOKUNAMAYANLAR:');
    hatali.forEach((r) => console.log(`  ${(r.sirket || r.kok).slice(0, 38).padEnd(38)} ${r.hata}`));
  }

  const ciktiYolu = path.join(KOK, 'automation', 'kariyer-tarama-raporu.json');
  fs.writeFileSync(ciktiYolu, JSON.stringify({ tarih: new Date().toISOString(), rapor }, null, 2) + '\n');
  console.log(`\nayrıntılı rapor: ${path.relative(KOK, ciktiYolu)}`);

  /* Son kontrol damgası deftere yazılıyor: neyin ne zaman bakıldığı belli olsun. */
  const damga = new Date().toISOString();
  const ind = new Map(rapor.map((r) => [r.kok, r]));
  defter.kayitlar.forEach((k) => {
    const r = ind.get(k.kok);
    if (r) {
      k.son_kontrol = damga;
      k.son_durum = r.hata ? 'okunamadi' : 'ok';
    }
  });
  defteriYaz(defter);
}

/* ---------------------------------------------------------------- */
/*  GİRİŞ                                                            */
/* ---------------------------------------------------------------- */

async function ana() {
  const arg = process.argv.slice(2);
  const defter = defteriOku();
  let yazildi = false;

  const dbEkle = arg.includes('--db');
  const gecmisIdx = arg.indexOf('--gecmis');
  const ekleIdx = arg.indexOf('--ekle');
  const sirketIdx = arg.indexOf('--sirket');

  if (dbEkle) {
    const ilanlar = await ilanlariAl();
    let n = 0;
    for (const x of ilanlar) {
      const adres = x.apply_url || x.source_url;
      if (!adres) continue;
      n += defteraEkle(defter, [adres], x.companies?.name || null, 'db');
    }
    console.log(`--db: ${n} yeni kariyer sayfası eklendi`);
    yazildi = true;
  }

  if (gecmisIdx >= 0 && arg[gecmisIdx + 1]) {
    const dosya = arg[gecmisIdx + 1];
    const satirlar = fs.readFileSync(dosya, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
    const n = defteraEkle(defter, satirlar, null, 'gecmis');
    console.log(`--gecmis: ${satirlar.length} adresten ${n} yeni kariyer sayfası eklendi`);
    yazildi = true;
  }

  if (ekleIdx >= 0) {
    const adresler = arg.slice(ekleIdx + 1).filter((a) => /^https?:\/\//.test(a));
    const n = defteraEkle(defter, adresler, null, 'elle');
    console.log(`--ekle: ${adresler.length} adresten ${n} yeni kariyer sayfası eklendi`);
    yazildi = true;
  }

  if (yazildi) {
    defteriYaz(defter);
    console.log(`defter: ${defter.kayitlar.length} kariyer sayfası → ${path.relative(KOK, DEFTER)}`);
    const belirsiz = defter.kayitlar.filter((k) => !k.kesin).length;
    if (belirsiz) console.log(`  not: ${belirsiz} kaydın kökü tahmin (kesin:false) — yoklamada boş çıkarsa elle düzeltilmeli`);
    if (!arg.includes('--yokla')) return;
  }

  await yokla(defter, sirketIdx >= 0 ? arg[sirketIdx + 1] : null);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  ana().catch((e) => {
    console.error('HATA:', e.message);
    process.exit(1);
  });
}
