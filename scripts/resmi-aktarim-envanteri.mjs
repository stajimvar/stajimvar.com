#!/usr/bin/env node
/**
 * TOPLU AKTARIM ÖNCESİ ENVANTER — HİÇBİR ŞEY YAZMAZ
 *
 * Dört ayrı kaynağı tek tabloda birleştiriyor:
 *
 *   public/paylasim/setler.json   üretilmiş bütün setler ve kartları
 *   instagram_yayinlari           Instagram'da YAYIMLANMIŞ olanlar
 *   paneldeGosterilecekler(...)   yönetici panelinde hâlâ BEKLEYENLER
 *   posts (kitle = 'resmi')       StajımVar'a ZATEN AKTARILMIŞ olanlar
 *
 * ÜÇ DURUM BİRBİRİNDEN BAĞIMSIZ. Bir set Instagram'da yayımlanmış
 * olabilir ama StajımVar'a aktarılmamış olabilir; panelde bekliyor
 * olabilir ama Instagram'a hiç gitmemiş olabilir. Tek bir "durum"
 * sütunu bu üçünü birbirine karıştırırdı, bu yüzden üçü ayrı.
 *
 * AKTARILMIŞ OLMA ÖLÇÜSÜ TAHMİN DEĞİL: `posts.istemci_anahtari`,
 * `instagram:<kod>:<sürüm>` dizesinden türetilen UUID'ye eşitse o set
 * aktarılmıştır. Ada ya da tarihe bakmak, aynı adı taşıyan iki farklı
 * sürümü karıştırırdı.
 *
 *   node scripts/resmi-aktarim-envanteri.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { aktarilacak, ortamOku, setleriOku } from './resmi-paylasim-aktar.mjs';
import { paneldeGosterilecekler } from '../src/lib/instagram-yayin.mjs';

const KOK = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
);

/** Beklenen kart sayısı; sapan setler ayrıca işaretleniyor. */
export const BEKLENEN_KART = 4;

/**
 * Bir setin DOSYA durumu: kaç kart var, hepsi diskte mi.
 *
 * Kart sayısı 4 olmayan setler var (5 ve 7 kartlı olanlar); bu bir hata
 * değil, ama toplu aktarımdan önce görülmesi gereken bir sapma.
 */
export function dosyaDurumu(set) {
  const kartlar = set.kartlar ?? [];
  const eksikler = [];
  let toplamBayt = 0;
  for (const kart of kartlar) {
    const yol = path.join(KOK, 'public', String(kart).replace(/^\//, ''));
    if (fs.existsSync(yol)) toplamBayt += fs.statSync(yol).size;
    else eksikler.push(kart);
  }
  return {
    kartSayisi: kartlar.length,
    dortMu: kartlar.length === BEKLENEN_KART,
    eksikDosya: eksikler,
    hepsiVar: eksikler.length === 0 && kartlar.length > 0,
    toplamBayt,
  };
}

/**
 * Aynı içeriğin farklı sürümleri ve olası tekrarlar.
 *
 * İKİ AYRI SORU, İKİ AYRI ÖLÇÜ:
 *
 *   sürüm ailesi  aynı `kod`, farklı `surum` — setler.json'da tek
 *                 satır olduğu için bu ancak aktarılmış eski bir sürüm
 *                 varken ortaya çıkıyor
 *   metin ikizi   farklı `kod`, AYNI gönderi metni — "-fotografli"
 *                 gibi ek çekimlerde oluyor ve toplu aktarımda aynı
 *                 yazıyı iki kez yayımlamak demek olurdu
 */
export function tekrarlar(setler) {
  const metneGore = new Map();
  for (const s of setler) {
    const anahtar = String(s.metin ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!anahtar) continue;
    if (!metneGore.has(anahtar)) metneGore.set(anahtar, []);
    metneGore.get(anahtar).push(s.kod);
  }
  const metinIkizleri = [...metneGore.values()].filter((k) => k.length > 1);

  /*
    Kod akrabalığı: biri ötekinin öneki (staj-sigortasi ↔
    staj-sigortasi-fotografli). Metinleri farklı olsa bile aynı konunun
    iki çekimi olabiliyor; karar insana bırakılıyor, betik yalnız
    işaretliyor.
  */
  const kodlar = setler.map((s) => s.kod);
  const akrabalar = [];
  for (const a of kodlar) {
    for (const b of kodlar) {
      if (a !== b && b.startsWith(`${a}-`)) akrabalar.push([a, b]);
    }
  }

  return { metinIkizleri, akrabalar };
}

async function main() {
  const ortam = ortamOku();
  const url = ortam.SUPABASE_URL;
  const anahtar = ortam.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anahtar) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (automation/.env).');
    process.exitCode = 1;
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, anahtar, { auth: { persistSession: false } });

  const setler = setleriOku();

  const { data: yayinlar = [] } = await db
    .from('instagram_yayinlari')
    .select('set_kodu, baslik, gonderi_kimligi, yayin_zamani, temizlendi_mi')
    .order('yayin_zamani', { ascending: false });

  const { data: resmiler = [] } = await db
    .from('posts')
    .select('id, istemci_anahtari, durum, created_at')
    .eq('kitle', 'resmi');

  const aktarilmisAnahtarlar = new Map(
    (resmiler ?? []).map((p) => [String(p.istemci_anahtari), p]),
  );
  const yayimlanmis = new Map((yayinlar ?? []).map((y) => [y.set_kodu, y]));
  const bekleyenKodlar = new Set(
    paneldeGosterilecekler(setler, yayinlar ?? []).map((s) => s.kod),
  );

  const satirlar = setler.map((s) => {
    const icerik = aktarilacak(s);
    const aktarim = aktarilmisAnahtarlar.get(icerik.istemciAnahtari) ?? null;
    return {
      kod: s.kod,
      surum: s.surum ?? '-',
      ad: s.ad ?? '',
      dosya: dosyaDurumu(s),
      instagram: yayimlanmis.get(s.kod) ?? null,
      panelde: bekleyenKodlar.has(s.kod),
      aktarim,
      anahtar: icerik.istemciAnahtari,
      aciklamaUzunlugu: icerik.aciklama.length,
    };
  });

  /* ------------------------------------------------------------ yazdır */

  const im = (v) => (v ? 'evet' : 'hayır');

  console.log('TOPLU AKTARIM ENVANTERİ');
  console.log('='.repeat(78));
  console.log(`setler.json      : ${setler.length} set`);
  console.log(`Instagram yayını : ${(yayinlar ?? []).length} kayıt`);
  console.log(`panelde bekleyen : ${bekleyenKodlar.size} set`);
  console.log(`StajımVar'da     : ${aktarilmisAnahtarlar.size} resmî paylaşım`);
  console.log();

  console.log('SET TABLOSU');
  console.log('-'.repeat(78));
  console.log('kod / sürüm / başlık');
  console.log('    kart  dosya      Instagram        panel     StajımVar');
  for (const r of satirlar) {
    console.log(`${r.kod}  (${r.surum})  ${r.ad}`);
    const kartNot = r.dosya.dortMu ? `${r.dosya.kartSayisi}` : `${r.dosya.kartSayisi} (4 DEĞİL)`;
    const dosyaNot = r.dosya.hepsiVar
      ? `tam ${(r.dosya.toplamBayt / 1024).toFixed(0)}KB`
      : `EKSİK ${r.dosya.eksikDosya.length}`;
    const ig = r.instagram ? `yayımlandı ${r.instagram.yayin_zamani.slice(0, 10)}` : 'yayımlanmadı';
    const sv = r.aktarim ? `aktarıldı (${r.aktarim.durum})` : 'aktarılmadı';
    console.log(`    ${kartNot.padEnd(6)}${dosyaNot.padEnd(11)}${ig.padEnd(17)}${im(r.panelde).padEnd(10)}${sv}`);
  }
  console.log();

  const { metinIkizleri, akrabalar } = tekrarlar(setler);
  console.log('TEKRARLAR VE SÜRÜMLER');
  console.log('-'.repeat(78));
  if (metinIkizleri.length === 0) console.log('aynı gönderi metnini paylaşan set yok');
  for (const grup of metinIkizleri) console.log(`  AYNI METİN: ${grup.join(' , ')}`);
  if (akrabalar.length === 0) console.log('kod akrabalığı yok');
  for (const [a, b] of akrabalar) console.log(`  KOD AKRABASI: ${a}  ->  ${b}`);
  console.log();

  const aktarilacaklar = satirlar.filter((r) => !r.aktarim);
  const engelli = aktarilacaklar.filter((r) => !r.dosya.hepsiVar);
  const hazir = aktarilacaklar.filter((r) => r.dosya.hepsiVar);

  console.log('AKTARILACAKLAR');
  console.log('-'.repeat(78));
  console.log(`zaten aktarılmış : ${satirlar.length - aktarilacaklar.length}`);
  console.log(`dosyası eksik    : ${engelli.length}`);
  console.log(`AKTARILACAK      : ${hazir.length} benzersiz set`);
  console.log();
  console.log('SIRA (Instagram yayın tarihi eskiden yeniye, yayımlanmamışlar sonda)');
  const sirali = [...hazir].sort((a, b) => {
    const at = a.instagram?.yayin_zamani ?? '9999';
    const bt = b.instagram?.yayin_zamani ?? '9999';
    return at.localeCompare(bt) || a.kod.localeCompare(b.kod);
  });
  sirali.forEach((r, i) => {
    const ig = r.instagram ? r.instagram.yayin_zamani.slice(0, 10) : 'IG yok';
    console.log(`  ${String(i + 1).padStart(2)}. ${r.kod} (${r.surum})  ${ig}  ${r.dosya.kartSayisi} kart`);
  });
}

if (process.argv[1] && process.argv[1].endsWith('resmi-aktarim-envanteri.mjs')) {
  await main();
}
