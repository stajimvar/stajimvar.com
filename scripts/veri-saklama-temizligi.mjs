#!/usr/bin/env node
/*
  KİŞİSEL VERİ SAKLAMA TEMİZLİĞİ — günlük (27 Kasım 2026)

  Süreler ve gerekçe: supabase/migrations/20270126010000_kisisel_veri_saklama_temizligi.sql
  ve docs/kvkk/02-saklama-ve-imha-politikasi.md. İş veritabanında; bu
  betik yalnız çağırıp silinen sayıları yazıyor (imha kaydı için iş
  akışı günlüğü yeterli).

  --kuru: hiçbir şey silmeden sayıları göster.
*/
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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
if (!ortam.SUPABASE_URL || !ortam.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  process.exit(1);
}
const db = createClient(ortam.SUPABASE_URL, ortam.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const kuru = process.argv.includes('--kuru');

const { data, error } = await db.rpc('kisisel_veri_saklama_temizligi', { p_kuru: kuru });
if (error) {
  console.error(`Saklama temizliği başarısız: ${error.message}`);
  process.exit(1);
}
console.log(`${kuru ? 'KURU — silinecek' : 'Silinen'} kayıtlar: ${JSON.stringify(data)}`);
