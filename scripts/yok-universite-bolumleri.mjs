#!/usr/bin/env node
/**
 * YÖK ATLAS KILAVUZUNDAN OKUL → BÖLÜM DOSYASI
 *
 * Kullanım (yılda bir, yeni kılavuz çıkınca):
 *   1. Kılavuzu indir (tek istek, ~90 MB):
 *        curl -X POST https://yokatlas.yok.gov.tr/api/tercih-kilavuz/search \
 *          -H 'Content-Type: application/json' -o kilavuz.json \
 *          -d '{"universiteId":[],"birimGrupId":[],"ilKodu":[]}'
 *   2. node scripts/yok-universite-bolumleri.mjs kilavuz.json
 *
 * Çıktı: src/data/universite-bolumleri.json
 *   programlar: program grubu adları (YÖK'ün "birimGrupAdi"), alfabetik
 *   okullar:    okulAnahtari(üniversite adı) → programlar dizisindeki sıra
 */
import fs from 'node:fs';
import { okulAnahtari } from '../src/lib/okul-bolumleri.mjs';

const kaynak = process.argv[2];
if (!kaynak) {
  console.error('Kullanım: node scripts/yok-universite-bolumleri.mjs <kilavuz.json>');
  process.exit(1);
}
const kilavuz = JSON.parse(fs.readFileSync(kaynak, 'utf8'));
const satirlar = kilavuz.content ?? [];
if (satirlar.length < 10000) {
  console.error(`Kılavuz eksik görünüyor: ${satirlar.length} satır.`);
  process.exit(1);
}

const okulProgramlari = new Map();
for (const r of satirlar) {
  const program = String(r.birimGrupAdi ?? '').trim();
  const okul = okulAnahtari(r.universiteAdi);
  if (!program || !okul) continue;
  if (!okulProgramlari.has(okul)) okulProgramlari.set(okul, new Set());
  okulProgramlari.get(okul).add(program);
}

const programlar = [...new Set([...okulProgramlari.values()].flatMap((s) => [...s]))].sort((a, b) =>
  a.localeCompare(b, 'tr')
);
const sira = new Map(programlar.map((p, i) => [p, i]));
const okullar = {};
for (const okul of [...okulProgramlari.keys()].sort()) {
  okullar[okul] = [...okulProgramlari.get(okul)].map((p) => sira.get(p)).sort((a, b) => a - b);
}

const yil = satirlar[0]?.yil ?? null;
fs.writeFileSync(
  new URL('../src/data/universite-bolumleri.json', import.meta.url),
  JSON.stringify({ kaynak: 'YÖK Atlas tercih kılavuzu', yil, programlar, okullar }) + '\n'
);
console.log(`${Object.keys(okullar).length} okul, ${programlar.length} program, ${satirlar.length} kılavuz satırı (${yil}).`);
