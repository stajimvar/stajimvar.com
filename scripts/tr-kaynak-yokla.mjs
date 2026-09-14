#!/usr/bin/env node
/**
 * TÜRKİYE KAYNAKLARINI YOKLAR — HİÇBİR ŞEY YAZMAZ
 *
 * Holding, banka, savunma ve telekom kurumlarının RESMÎ kariyer
 * adreslerinin makine tarafından okunabilir olup olmadığını ölçer.
 *
 * NEDEN AYRI BİR ADIM
 * -------------------
 * Kaynak eklemenin pahalı kısmı adaptör yazmak değil, hangi kurumun
 * gerçekten okunabilir bir uç noktası olduğunu bilmek. Tahminle adaptör
 * yazmak, çalışmayan koda bakım borcu demek.
 *
 * NE ARIYOR
 *   1. Bilinen kariyer platformu imzası (Workday / SuccessFactors /
 *      Taleo / Lever / Greenhouse / SmartRecruiters). Bunların hepsinin
 *      herkese açık, belgelenmiş bir liste uç noktası var.
 *   2. schema.org JobPosting yapısal verisi — sayfa kendi ilanını
 *      makine için yayınlıyor.
 *
 * ERİŞİM ENGELİ AŞILMIYOR
 * -----------------------
 * 401/403/captcha gören kurum "erişilemez" yazılıp BIRAKILIYOR. Tekrar
 * denenmiyor, başka yol aranmıyor: engeli aşmak bu projenin işi değil.
 *
 * Her kuruma EN FAZLA bir istek; istekler arası bekleme var.
 */

const BEKLEME_MS = 1500;
const ZAMAN_ASIMI_MS = 15000;

const BASLIK = {
  'user-agent': 'StajimVarBot/1.0 (+https://stajimvar.com/bot)',
  accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'accept-language': 'tr-TR,tr;q=0.9',
};

/*
  ADAY ADRESLER — KURUMUN KENDİ SİTESİ

  Üçüncü taraf iş panoları yok: ilan sahibinin kendi yayını aranıyor.
  Adresler kurumların herkese açık kariyer sayfaları.
*/
const KURUMLAR = [
  // Holdingler — kurumun kendi kariyer portalı
  { ad: 'Koç Holding', kok: 'https://kariyer.koc.com.tr', grup: 'holding' },
  { ad: 'Sabancı Holding', kok: 'https://kariyer.sabanci.com', grup: 'holding' },
  { ad: 'Anadolu Grubu', kok: 'https://kariyer.anadolugrubu.com.tr', grup: 'holding' },
  { ad: 'Eczacıbaşı', kok: 'https://kariyer.eczacibasi.com.tr', grup: 'holding' },
  { ad: 'Zorlu Holding', kok: 'https://kariyer.zorlu.com', grup: 'holding' },
  // Savunma
  { ad: 'ASELSAN', kok: 'https://kariyer.aselsan.com.tr', grup: 'savunma' },
  { ad: 'TUSAŞ', kok: 'https://kariyer.tusas.com', grup: 'savunma' },
  { ad: 'Roketsan', kok: 'https://kariyer.roketsan.com.tr', grup: 'savunma' },
  { ad: 'HAVELSAN', kok: 'https://kariyer.havelsan.com.tr', grup: 'savunma' },
  // Bankalar
  { ad: 'Garanti BBVA', kok: 'https://kariyer.garantibbva.com.tr', grup: 'banka' },
  { ad: 'İş Bankası', kok: 'https://kariyer.isbank.com.tr', grup: 'banka' },
  { ad: 'Yapı Kredi', kok: 'https://kariyer.yapikredi.com.tr', grup: 'banka' },
  { ad: 'QNB', kok: 'https://kariyer.qnb.com.tr', grup: 'banka' },
  // Telekom
  { ad: 'Turkcell', kok: 'https://kariyer.turkcell.com.tr', grup: 'telekom' },
  { ad: 'Türk Telekom', kok: 'https://kariyer.turktelekom.com.tr', grup: 'telekom' },
  { ad: 'Vodafone Türkiye', kok: 'https://careers.vodafone.com/search/?locationsearch=turkey', grup: 'telekom' },
];


/** Bilinen kariyer platformu imzaları — hepsinin açık liste uç noktası var. */
const PLATFORMLAR = [
  { ad: 'workday', iz: /myworkdayjobs\.com|workday\.com\/[a-z-]+\/jobs/i },
  { ad: 'successfactors', iz: /successfactors\.(com|eu)|jobs\.sap\.com|career\d*\.successfactors/i },
  { ad: 'taleo', iz: /taleo\.net/i },
  { ad: 'lever', iz: /jobs\.lever\.co/i },
  { ad: 'greenhouse', iz: /boards\.greenhouse\.io|job-boards\.greenhouse\.io/i },
  { ad: 'smartrecruiters', iz: /smartrecruiters\.com/i },
  { ad: 'kariyer.net', iz: /kariyer\.net/i },
];

function jobPostingVarMi(govde) {
  return /"@type"\s*:\s*"JobPosting"/i.test(govde);
}

/** Sayfanın engel mi koyduğu, yoksa gerçekten boş mu olduğu. */
function engelMi(durum, govde) {
  if (durum === 401 || durum === 403 || durum === 429) return `HTTP ${durum}`;
  if (/captcha|are you a robot|cf-browser-verification|checking your browser/i.test(govde)) {
    return 'bot doğrulaması';
  }
  return null;
}

const sonuclar = [];

for (const kurum of KURUMLAR) {
  let kayit = { ...kurum, durum: null, platform: null, jobPosting: false, engel: null, hata: null };
  try {
    const yanit = await fetch(kurum.kok, {
      headers: BASLIK,
      redirect: 'follow',
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    });
    const govde = await yanit.text();
    kayit.durum = yanit.status;
    kayit.sonAdres = yanit.url !== kurum.kok ? yanit.url : undefined;
    kayit.engel = engelMi(yanit.status, govde);

    if (!kayit.engel && yanit.ok) {
      /*
        Platform imzası HTML'in TAMAMINDA aranıyor: bağlantı, iframe ya
        da betik olarak geçebilir. Aradığımız şey "bu kurum hangi
        sistemi kullanıyor" — yorum değil, adres.
      */
      for (const p of PLATFORMLAR) {
        if (p.iz.test(govde)) {
          kayit.platform = p.ad;
          const m = govde.match(
            new RegExp(`https?://[^"'\\s<>]*${p.ad === 'kariyer.net' ? 'kariyer\\.net' : p.ad}[^"'\\s<>]*`, 'i')
          );
          if (m) kayit.platformAdres = m[0].slice(0, 160);
          break;
        }
      }
      kayit.jobPosting = jobPostingVarMi(govde);
    }
  } catch (hata) {
    kayit.hata = String(hata?.name === 'TimeoutError' ? 'zaman aşımı' : hata.message).slice(0, 60);
  }

  const not = kayit.engel
    ? `ENGEL ${kayit.engel} — bırakıldı`
    : kayit.hata
      ? `HATA ${kayit.hata}`
      : kayit.platform
        ? `platform: ${kayit.platform}`
        : kayit.jobPosting
          ? 'JobPosting yapısal verisi'
          : 'okunabilir imza yok';
  console.log(`${kurum.ad.padEnd(18)} ${String(kayit.durum ?? '-').padEnd(4)} ${not}`);
  if (kayit.platformAdres) console.log(`                        ${kayit.platformAdres}`);
  sonuclar.push(kayit);

  await new Promise((r) => setTimeout(r, BEKLEME_MS));
}

const kullanilabilir = sonuclar.filter((s) => s.platform || s.jobPosting);
const engelli = sonuclar.filter((s) => s.engel);
console.log('');
console.log(`yoklanan: ${sonuclar.length}`);
console.log(`kullanılabilir imza: ${kullanilabilir.length} (${kullanilabilir.map((s) => s.ad).join(', ') || '—'})`);
console.log(`engelli (bırakıldı): ${engelli.length} (${engelli.map((s) => s.ad).join(', ') || '—'})`);
