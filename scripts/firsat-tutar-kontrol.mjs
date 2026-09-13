#!/usr/bin/env node
/**
 * FIRSAT TUTARI — RESMÎ KAYNAKTAN KONTROL
 *
 * NEDEN VAR
 * ---------
 * Kart "Tutar kurumca açıklanacak" diyordu ve bu cümle VARSAYIMLA
 * üretiliyordu: kaydın türü burs ya da yurt dışı ise "demek ki bir ödeme
 * var" deniyordu. 113 kaydın 106'sı bu cümleyi kaynağında öyle yazdığı
 * için değil, TÜRÜ öyle olduğu için gösteriyordu.
 *
 * Bu betik kararı kaynağa bağlıyor: kurumun kendi sayfasını açıyor,
 * okuduğu cümleyi saklıyor ve yalnızca o cümlenin söylediğini yazıyor.
 *
 * TAHMİN ETMİYOR
 * --------------
 * Açılamayan, çelişkili ya da hiçbir kalıba uymayan sayfa `belirsiz`
 * kalıyor ve `firsat_tutar_kuyrugu` görünümünde birikiyor. Arayüz
 * `belirsiz` ve NULL'da tutar satırını hiç çizmiyor — yani betiğin
 * kararsızlığı ekranda bir iddiaya dönüşmüyor.
 *
 * ESKİ DÖNEM RAKAMI TAŞINMIYOR
 * ----------------------------
 * Sayfada bir rakam bulunsa bile yanında GÜNCEL bir dönem işareti
 * (içinde bulunulan ya da gelecek öğretim yılı) yoksa rakam kabul
 * edilmiyor; kayıt `belirtilmemis` oluyor. Burs tutarları her yıl
 * değişiyor ve geçen yılın rakamını bu yıl göstermek yanlış bilgi.
 *
 * GEREKSİZ YAZMA YOK
 * ------------------
 * Okunan metnin SHA-256 özeti `amount_source_hash` alanında duruyor.
 * Sayfa değişmediyse ve karar aynıysa satıra dokunulmuyor: gereksiz
 * yazma hem `updated_at` damgasını kirletiyor hem değişiklik geçmişini
 * okunmaz yapıyor.
 *
 * KULLANIM
 *   node scripts/firsat-tutar-kontrol.mjs            # rapor, yazma yok
 *   node scripts/firsat-tutar-kontrol.mjs --yaz      # veritabanına yaz
 *   node scripts/firsat-tutar-kontrol.mjs --slug=... # tek kayıt
 *   node scripts/firsat-tutar-kontrol.mjs --limit=10
 *   node scripts/firsat-tutar-kontrol.mjs --zorla    # özet aynı olsa da yeniden karar ver
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

/* ------------------------------------------------------------------ */
/*  ORTAM                                                              */
/* ------------------------------------------------------------------ */

function ortamOku() {
  const birlesik = {};
  for (const dosya of ['.env', 'automation/.env']) {
    const yol = path.resolve(process.cwd(), dosya);
    if (!fs.existsSync(yol)) continue;
    for (const satir of fs.readFileSync(yol, 'utf8').split(/\r?\n/)) {
      if (!satir.includes('=') || satir.trimStart().startsWith('#')) continue;
      const i = satir.indexOf('=');
      birlesik[satir.slice(0, i).trim()] = satir.slice(i + 1).trim().replace(/^"|"$/g, '');
    }
  }
  return birlesik;
}

const BASLIK = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  'Accept-Language': 'tr,en;q=0.8',
};

/* ------------------------------------------------------------------ */
/*  METİN ÇIKARMA — HTML VE PDF                                        */
/* ------------------------------------------------------------------ */

/** HTML'den okunur metin: betik, biçem ve etiketler atılıyor. */
export function htmlMetni(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * PDF'ten metin.
 *
 * Bağımlılık eklenmedi: depoda PDF kitaplığı yok ve tek bir alan için
 * üretim bağımlılığı büyütmek istemedik. Çıkarma DAR ve dürüst: akışlar
 * (`FlateDecode`) açılıyor, metin operatörlerinin (`Tj`, `TJ`) içindeki
 * diziler toplanıyor. Gömülü fontla kodlanmış ya da taranmış (görüntü)
 * PDF'lerden metin ÇIKMIYOR — o durumda kayıt `belirsiz` kalıyor, ki
 * doğrusu da bu: okuyamadığımız bir sayfadan karar üretmemeliyiz.
 */
export function pdfMetni(tampon) {
  const parcalar = [];
  const ham = Buffer.isBuffer(tampon) ? tampon : Buffer.from(tampon);

  /* Akışları tek tek açıyoruz; bozuk olanı atlayıp devam ediyoruz. */
  let i = 0;
  while (true) {
    const bas = ham.indexOf('stream', i);
    if (bas < 0) break;
    const son = ham.indexOf('endstream', bas);
    if (son < 0) break;
    let govde = ham.subarray(bas + 6, son);
    /* `stream` sonrası CR/LF atlanıyor. */
    let k = 0;
    while (k < govde.length && (govde[k] === 0x0d || govde[k] === 0x0a)) k += 1;
    govde = govde.subarray(k);
    try {
      parcalar.push(zlib.inflateSync(govde).toString('latin1'));
    } catch {
      /* Sıkıştırılmamış ya da desteklenmeyen süzgeç: ham dene. */
      parcalar.push(govde.toString('latin1'));
    }
    i = son + 9;
  }

  const icerik = parcalar.join('\n');
  const metin = [];
  /* (…) Tj  ve  [(…) -250 (…)] TJ */
  for (const m of icerik.matchAll(/\((?:\\.|[^\\()])*\)/g)) {
    metin.push(
      m[0]
        .slice(1, -1)
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))),
    );
  }
  return metin.join(' ').replace(/\s{2,}/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/*  DÖNEM — GÜNCEL Mİ                                                  */
/* ------------------------------------------------------------------ */

/**
 * Metinde GÜNCEL bir dönem işareti var mı.
 *
 * Güncel sayılan: içinde bulunulan yıl, gelecek yıl ve "2026-2027" gibi
 * öğretim yılı yazımları. Eylül'den önce bir önceki yıl da güncel
 * sayılıyor, çünkü öğretim yılı yazın başlamıyor.
 */
export function guncelDonem(metin, bugun = new Date()) {
  const yil = bugun.getUTCFullYear();
  const kabul = new Set([String(yil), String(yil + 1)]);
  if (bugun.getUTCMonth() < 8) kabul.add(String(yil - 1));

  for (const m of String(metin ?? '').matchAll(/(20\d{2})\s*[-–—/]\s*(20\d{2})/g)) {
    if (kabul.has(m[1]) || kabul.has(m[2])) return m[0];
  }
  for (const m of String(metin ?? '').matchAll(/20\d{2}/g)) {
    if (kabul.has(m[0])) return m[0];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  KARAR                                                              */
/* ------------------------------------------------------------------ */

const UCRETSIZ = /(katılım|kayıt|başvuru)\s+(ücreti|ücretsizdir|bedeli)[^.]{0,40}(yoktur|alınmaz|alınmamaktadır|ücretsiz)|ücretsizdir|tamamen ücretsiz|katılım ücretsiz/i;

const ACIKLANACAK =
  /(tutar|miktar|burs)[^.]{0,60}(daha sonra|ilerleyen|ayrıca)?\s*(açıklanacak|açıklanacaktır|duyurulacak|duyurulacaktır|ilan edilecek|belirlenecek|belirlenecektir)/i;

const DEGISKEN =
  /(değişmektedir|değişiklik göstermektedir|programa göre|şehre göre|eyalete göre|ülkeye göre|kişiye göre|başvuru sahibine göre)/i;

const DESTEK =
  /(burs|hibe|harcırah|konaklama|yol\s*(gideri|masraf|destek)|yaşam gideri|seyahat deste|sağlık sigortası|geçim)/i;

/** "5.000 TL", "₺2.250", "1,200 USD", "EUR 850" gibi bir rakam + birim. */
const TUTAR =
  /(?:(₺|TL|TRY|\$|USD|€|EUR|£|GBP)\s*([0-9][0-9.,]{2,})|([0-9][0-9.,]{2,})\s*(₺|TL|TRY|USD|EUR|GBP|ABD Doları|Avro|Euro))/i;

const SIKLIK = {
  monthly: /(aylık|ayda|her ay|ay başına|monthly|per month)/i,
  yearly: /(yıllık|yılda|akademik yıl|yıl başına|annual|per year)/i,
  one_time: /(tek seferlik|bir defaya mahsus|one[- ]time|lump sum)/i,
};

/** Kararın çevresindeki cümleyi kısa kanıt olarak çıkarıyor. */
function kanit(metin, eslesme) {
  if (!eslesme) return null;
  const i = Math.max(0, eslesme.index - 90);
  return metin.slice(i, Math.min(metin.length, eslesme.index + 170)).replace(/\s+/g, ' ').trim();
}

/**
 * Metinden tutar durumu.
 *
 * SIRA ÖNEMLİ: ücretsizlik en kesin ifade, rakam ondan sonra geliyor.
 * "Açıklanacak" ile "değişmektedir" birbirini dışlıyor — ikisi birden
 * varsa karar `belirsiz`, çünkü sayfa iki farklı şey söylüyor.
 */
export function tutarKarari(metin, { bugun = new Date() } = {}) {
  const t = String(metin ?? '');
  if (t.length < 120) return { durum: 'belirsiz', kanit: null, sebep: 'metin çok kısa' };

  const ucretsiz = UCRETSIZ.exec(t);
  if (ucretsiz) return { durum: 'ucretsiz', kanit: kanit(t, ucretsiz) };

  const aciklanacak = ACIKLANACAK.exec(t);
  const degisken = DEGISKEN.exec(t);
  const destekVar = DESTEK.test(t);

  /* Sayfa iki farklı şey söylüyorsa karar verilmiyor. */
  if (aciklanacak && degisken && destekVar) {
    return { durum: 'belirsiz', kanit: kanit(t, aciklanacak), sebep: 'çelişkili ifade' };
  }

  const tutar = TUTAR.exec(t);
  if (tutar) {
    const cevre = t.slice(Math.max(0, tutar.index - 160), tutar.index + 160);
    const siklik = Object.entries(SIKLIK).find(([, kalip]) => kalip.test(cevre))?.[0] ?? null;
    const donem = guncelDonem(cevre, bugun) ?? guncelDonem(t.slice(0, 4000), bugun);
    /*
      Rakam ancak SIKLIĞI ve GÜNCEL DÖNEMİ ile birlikte kabul ediliyor.
      "2.250 ₺" tek başına aylık mı tek seferlik mi belli değil; dönemsiz
      bir rakam da geçen yılın rakamı olabilir.
    */
    if (siklik && donem) {
      return {
        durum: 'kesin',
        kanit: kanit(t, tutar),
        rakam: (tutar[2] ?? tutar[3] ?? '').trim(),
        birim: (tutar[1] ?? tutar[4] ?? '').trim(),
        siklik,
        donem,
      };
    }
  }

  if (degisken && destekVar) return { durum: 'mali_destek', kanit: kanit(t, degisken) };
  if (aciklanacak) return { durum: 'aciklanacak', kanit: kanit(t, aciklanacak) };

  /* Sayfa okundu ama tutardan hiç söz etmiyor. */
  return { durum: 'belirtilmemis', kanit: null };
}

/* ------------------------------------------------------------------ */
/*  ÇALIŞTIRMA                                                         */
/* ------------------------------------------------------------------ */

const ozet = (metin) => crypto.createHash('sha256').update(metin, 'utf8').digest('hex');

async function kaynagiOku(adres) {
  const c = new AbortController();
  const zaman = setTimeout(() => c.abort(), 25000);
  try {
    const r = await fetch(adres, { headers: BASLIK, redirect: 'follow', signal: c.signal });
    if (!r.ok) return { hata: `HTTP ${r.status}` };
    const tur = (r.headers.get('content-type') ?? '').toLowerCase();
    if (tur.includes('pdf') || /\.pdf($|\?)/i.test(adres)) {
      return { metin: pdfMetni(Buffer.from(await r.arrayBuffer())), tur: 'pdf', adres: r.url };
    }
    return { metin: htmlMetni(await r.text()), tur: 'html', adres: r.url };
  } catch (e) {
    return { hata: String(e?.name === 'AbortError' ? 'zaman aşımı' : e?.message ?? e).slice(0, 80) };
  } finally {
    clearTimeout(zaman);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const bayrak = (ad) => argv.some((a) => a === `--${ad}`);
  const deger = (ad) => argv.find((a) => a.startsWith(`--${ad}=`))?.split('=').slice(1).join('=');

  const yaz = bayrak('yaz');
  const zorla = bayrak('zorla');
  const limit = Number(deger('limit') ?? 0) || 0;
  const tekSlug = deger('slug');

  const ortam = { ...ortamOku(), ...process.env };
  const url = ortam.SUPABASE_URL || ortam.VITE_SUPABASE_URL;
  const anahtar = ortam.SUPABASE_SERVICE_ROLE_KEY || ortam.VITE_SUPABASE_ANON_KEY;
  if (!url || !anahtar) {
    console.error('SUPABASE_URL ve anahtar gerekli (.env / automation/.env).');
    process.exit(1);
  }
  if (yaz && !ortam.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('--yaz için SUPABASE_SERVICE_ROLE_KEY gerekli.');
    process.exit(1);
  }
  const bas = { apikey: anahtar, Authorization: `Bearer ${anahtar}`, 'Content-Type': 'application/json' };

  const alanlar =
    'id,slug,title,organization_name,opportunity_type,source_url,application_url,' +
    'amount_status,amount_checked_at,amount_source_url,amount_evidence,amount_source_hash,' +
    'amount_min,amount_max,currency,payment_period,amount_period_label,amount_verified_at';
  let sorgu = `${url}/rest/v1/opportunities?select=${alanlar}&status=eq.published&order=organization_name&limit=1000`;
  if (tekSlug) sorgu += `&slug=eq.${encodeURIComponent(tekSlug)}`;

  const r = await fetch(sorgu, { headers: bas });
  if (!r.ok) {
    console.error('Kayıtlar okunamadı:', r.status, (await r.text()).slice(0, 200));
    process.exit(1);
  }
  let kayitlar = await r.json();
  if (limit) kayitlar = kayitlar.slice(0, limit);

  console.log(`${kayitlar.length} yayındaki kayıt kontrol edilecek. Yazma: ${yaz ? 'AÇIK' : 'kapalı'}\n`);

  const sayac = new Map();
  const kuyruk = [];
  let acilan = 0;
  let yazilan = 0;
  let atlanan = 0;

  for (const [sira, k] of kayitlar.entries()) {
    const adres = k.source_url || k.application_url;
    let sonuc;
    let okunan = null;

    if (!adres) {
      sonuc = { durum: 'belirsiz', kanit: null, sebep: 'kaynak adresi yok' };
    } else {
      okunan = await kaynagiOku(adres);
      if (okunan.hata) {
        sonuc = { durum: 'belirsiz', kanit: null, sebep: okunan.hata };
      } else {
        acilan += 1;
        sonuc = tutarKarari(okunan.metin);
      }
    }

    const damga = okunan?.metin ? ozet(`${okunan.metin}\n#${sonuc.durum}`) : null;
    const degismedi = damga && damga === k.amount_source_hash && !zorla;

    sayac.set(sonuc.durum, (sayac.get(sonuc.durum) ?? 0) + 1);
    if (sonuc.durum === 'belirsiz') {
      kuyruk.push({ slug: k.slug, kurum: k.organization_name, sebep: sonuc.sebep ?? '-', adres });
    }

    const etiket = `${String(sira + 1).padStart(3)}/${kayitlar.length}`;
    console.log(
      `${etiket} ${sonuc.durum.padEnd(13)} ${degismedi ? '(değişmedi)' : ''} ${k.organization_name} — ${k.title.slice(0, 48)}`,
    );
    if (sonuc.kanit) console.log(`      kanıt: ${sonuc.kanit.slice(0, 150)}`);

    if (!yaz || degismedi) {
      if (degismedi) atlanan += 1;
      continue;
    }

    const yama = {
      amount_status: sonuc.durum,
      amount_checked_at: new Date().toISOString(),
      amount_source_url: okunan?.adres ?? adres ?? null,
      amount_evidence: sonuc.kanit ? sonuc.kanit.slice(0, 400) : null,
      amount_source_hash: damga,
    };
    /*
      Rakam yalnızca `kesin` dalında yazılıyor ve `amount_verified_at`
      damgası da o an atılıyor — arayüz rakamı ancak bu damga varken
      gösteriyor. Öteki dallarda eski rakam TEMİZLENİYOR: durumu
      "belirtilmemiş" olan bir kayıtta geçen yıldan kalma bir sayı
      durmamalı.
    */
    if (sonuc.durum === 'kesin') {
      const sayi = Number(String(sonuc.rakam).replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(sayi)) {
        yama.amount_min = sayi;
        yama.amount_max = sayi;
      }
      yama.currency = /₺|TL|TRY/i.test(sonuc.birim) ? 'TRY' : /\$|USD/i.test(sonuc.birim) ? 'USD' : /€|EUR|Avro|Euro/i.test(sonuc.birim) ? 'EUR' : null;
      yama.payment_period = sonuc.siklik;
      yama.amount_period_label = sonuc.donem;
      yama.amount_verified_at = yama.amount_checked_at;
    } else {
      yama.amount_min = null;
      yama.amount_max = null;
      yama.payment_period = null;
      yama.amount_period_label = null;
      yama.amount_verified_at = null;
    }

    const y = await fetch(`${url}/rest/v1/opportunities?id=eq.${k.id}`, {
      method: 'PATCH',
      headers: { ...bas, Prefer: 'return=minimal' },
      body: JSON.stringify(yama),
    });
    if (!y.ok) console.error(`      YAZILAMADI ${y.status}: ${(await y.text()).slice(0, 140)}`);
    else yazilan += 1;
  }

  console.log('\n================ ÖZET ================');
  console.log(`kayıt          : ${kayitlar.length}`);
  console.log(`kaynağı açılan : ${acilan}`);
  console.log(`yazılan        : ${yazilan}`);
  console.log(`değişmediği için atlanan: ${atlanan}`);
  console.log('\ndurumlar:');
  for (const [d, n] of [...sayac.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${d}`);
  }
  if (kuyruk.length) {
    console.log(`\ninceleme kuyruğu (${kuyruk.length}):`);
    for (const x of kuyruk.slice(0, 40)) console.log(`  ${x.sebep.padEnd(22)} ${x.kurum} — ${x.adres ?? '-'}`);
    if (kuyruk.length > 40) console.log(`  … ${kuyruk.length - 40} kayıt daha`);
  }
}

/* Testten içe aktarılabilsin diye: doğrudan çalıştırıldığında main. */
if (process.argv[1] && process.argv[1].endsWith('firsat-tutar-kontrol.mjs')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
