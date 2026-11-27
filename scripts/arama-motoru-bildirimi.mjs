#!/usr/bin/env node
/*
  ARAMA MOTORU BİLDİRİMİ — ilan açılınca ve kapanınca (28 Kasım 2026)

  Search Console'da 179 sayfa "keşfedildi, şu anda dizine eklenmemiş" ve
  İş İlanları raporunda 206 ilandan yalnız 1'i vardı: Google ilan
  sayfalarını kendi temposunda taramıyor, ilan da kapanmadan bulunmuyor.

  İKİ KANAL
    Google Indexing API — Google'ın YALNIZ JobPosting sayfaları için açtığı
      resmî yol. Hizmet hesabı (stajimvar-ilan-bildirimi@stajimvar-gsc)
      Search Console'da sahip. Günlük kota 200; burada en çok GUNLUK_SINIR.
    IndexNow — Bing ve Yandex. Anahtar herkese açık olmak zorunda
      (public/<anahtar>.txt); gizli değil.

  NEYİ BİLDİRİYOR
    Açık ilan kümesi = canlı sitemap-ilanlar.xml (dizine açık ilanların
    kendisi; ince/kapanan ilan zaten orada yok). Kümede olup bu durumda
    bildirilmemiş adres → "açık" bildirimi. Daha önce açık bildirilip
    artık kümede olmayan adres → "kapalı" bildirimi. İkisinde de Google'a
    URL_UPDATED gidiyor: kapanan ilanın sayfası duruyor, JobPosting
    işaretlemesi kalkıyor (Google'ın önerdiği yol; URL_DELETED yalnız
    404/410 sayfa için).

  Durum `arama_motoru_bildirimleri` tablosunda; aynı adres aynı durum için
  ikinci kez gönderilmiyor. Günlüğe yalnız sayılar yazılıyor.

  --kuru: hiçbir şey göndermeden ne gönderileceğini say.
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SITE = 'https://stajimvar.com';
const INDEXNOW_ANAHTARI = '15a32ef303211026dd5f27e4dd7eda66';
const GUNLUK_SINIR = 180;
const kuru = process.argv.includes('--kuru');

const KOK = path.resolve(import.meta.dirname, '..');
function ortamOku() {
  const dosya = path.join(KOK, 'automation', '.env');
  if (!fs.existsSync(dosya)) return {};
  const cikti = {};
  for (const satir of fs.readFileSync(dosya, 'utf8').split('\n')) {
    const esles = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (esles) cikti[esles[1]] = esles[2].replace(/^["']|["']$/g, '');
  }
  return cikti;
}
const ortam = { ...ortamOku(), ...process.env };

/* ------------------------------------------------------------ Google */
const b64url = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export async function googleErisimJetonu(hesap, getir = fetch) {
  const simdi = Math.floor(Date.now() / 1000);
  const baslik = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const icerik = b64url(
    JSON.stringify({
      iss: hesap.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      iat: simdi,
      exp: simdi + 3600,
    }),
  );
  const imza = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${baslik}.${icerik}`), hesap.private_key));
  const yanit = await getir('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${baslik}.${icerik}.${imza}`,
    }),
  });
  if (!yanit.ok) throw new Error(`Google jetonu alınamadı (HTTP ${yanit.status})`);
  return (await yanit.json()).access_token;
}

async function googleBildir(jeton, url) {
  const yanit = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  });
  if (yanit.status === 429) return { kota: true };
  if (!yanit.ok) return { hata: `HTTP ${yanit.status}` };
  return {};
}

/* ---------------------------------------------------------- IndexNow */
async function indexNowBildir(adresler) {
  if (!adresler.length) return true;
  const yanit = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: 'stajimvar.com',
      key: INDEXNOW_ANAHTARI,
      keyLocation: `${SITE}/${INDEXNOW_ANAHTARI}.txt`,
      urlList: adresler,
    }),
  });
  /* 200 ve 202 kabul; 4xx anahtar/alan sorunudur. */
  return yanit.status === 200 || yanit.status === 202;
}

/* ------------------------------------------------------------- iş */
export function bildirimPlani(acikAdresler, kayitlar) {
  const kayit = new Map(kayitlar.map((k) => [k.url, k]));
  const acilan = [...acikAdresler].filter((u) => kayit.get(u)?.durum !== 'acik' || !kayit.get(u)?.google_at);
  const kapanan = kayitlar.filter((k) => k.durum === 'acik' && !acikAdresler.has(k.url)).map((k) => k.url);
  return { acilan, kapanan };
}

async function main() {
  if (!ortam.SUPABASE_URL || !ortam.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  const db = createClient(ortam.SUPABASE_URL, ortam.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const harita = await fetch(`${SITE}/sitemap-ilanlar.xml`);
  if (!harita.ok) throw new Error(`İlan haritası okunamadı (HTTP ${harita.status})`);
  const acik = new Set([...(await harita.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
  if (acik.size === 0) throw new Error('İlan haritası boş — kapanış bildirimi yanlışlıkla toplu gitmesin diye durduruldu.');

  const { data: kayitlar, error } = await db.from('arama_motoru_bildirimleri').select('url, durum, google_at');
  if (error) throw new Error(`Bildirim kaydı okunamadı: ${error.message}`);

  const { acilan, kapanan } = bildirimPlani(acik, kayitlar);
  /* Önce kapananlar (Google İş İlanları'nda kapalı ilan kalmasın), sonra açılanlar. */
  const sira = [...kapanan.map((url) => ({ url, durum: 'kapali' })), ...acilan.map((url) => ({ url, durum: 'acik' }))];
  const bugun = sira.slice(0, GUNLUK_SINIR);
  console.log(`Açık ilan: ${acik.size} · bildirilecek: ${acilan.length} açılan, ${kapanan.length} kapanan · bugün: ${bugun.length}`);
  if (kuru || bugun.length === 0) return;

  const anahtarMetni = ortam.GOOGLE_INDEXING_SA_JSON;
  let jeton = null;
  if (anahtarMetni) jeton = await googleErisimJetonu(JSON.parse(anahtarMetni));
  else console.warn('GOOGLE_INDEXING_SA_JSON yok: yalnız IndexNow gönderiliyor.');

  const indexNowTamam = await indexNowBildir(bugun.map((b) => b.url));
  let google = 0;
  let hata = 0;
  let kotaDoldu = false;
  for (const b of bugun) {
    let googleAt = null;
    let sonHata = null;
    if (jeton && !kotaDoldu) {
      const r = await googleBildir(jeton, b.url);
      if (r.kota) kotaDoldu = true;
      else if (r.hata) sonHata = r.hata;
      else googleAt = new Date().toISOString();
    }
    if (googleAt) google++;
    if (sonHata) hata++;
    /* Google gönderilemediyse (kota/anahtar yok) durum yazılmıyor: yarın yeniden denenecek. */
    if (!googleAt && jeton) continue;
    const { error: e } = await db.from('arama_motoru_bildirimleri').upsert({
      url: b.url,
      durum: b.durum,
      google_at: googleAt,
      indexnow_at: indexNowTamam ? new Date().toISOString() : null,
      son_hata: sonHata,
      guncellendi_at: new Date().toISOString(),
    });
    if (e) throw new Error(`Bildirim kaydı yazılamadı: ${e.message}`);
  }
  console.log(`Google: ${google} gönderildi${kotaDoldu ? ' (günlük kota doldu, kalan yarın)' : ''}, ${hata} hata · IndexNow: ${indexNowTamam ? 'kabul' : 'REDDEDİLDİ'}`);
  if (hata > 0 && google === 0) process.exit(1);
}

if (process.argv[1]?.endsWith('arama-motoru-bildirimi.mjs')) {
  main().catch((e) => {
    console.error(`Arama motoru bildirimi başarısız: ${e.message}`);
    process.exit(1);
  });
}
