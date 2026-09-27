import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  AĞIM AKIŞI — ŞİRKET PAYLAŞIMINDA LOGO (27 Eylül 2026)

  Kullanıcı bildirimi: Ogulsize'nin paylaşımında kart başlığı logo yerine
  "OG" baş harflerini gösteriyordu. Şirket sayfalarında `avatar_path` boş,
  logo `companies.logo_url`'de. Akış yazar sorgusu logoyu aynı istekte
  (yabancı anahtar gömmesiyle) alıyor; kart takip listesindeki kuralı
  kullanıyor: sosyal fotoğraf > logo > baş harf.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const SORGU = oku('src/lib/queries/sosyal.ts');
const KART = oku('src/components/sosyal/AkisKarti.tsx');

test('akış yazar sorgusu şirket logosunu aynı istekte alıyor', () => {
  const govde = SORGU.slice(SORGU.indexOf('export async function akisiGetir'));
  const sorgu = govde.slice(0, govde.indexOf('const profilHaritasi'));
  assert.match(sorgu, /sirket_id/);
  assert.match(sorgu, /companies!social_profiles_sirket_id_fkey \( logo_url \)/);
  assert.match(govde, /sirketId: \(p as any\)\.sirket_id \?\? null,/);
  assert.match(govde, /logoAdresi: \(p as any\)\.companies\?\.logo_url \?\? null,/);
  /* Profil başına ayrı istek yok: yazar profilleri hâlâ tek `.in(...)` çağrısı. */
  assert.equal((sorgu.match(/\.from\('social_profiles'\)/g) ?? []).length, 1);
});

test('kart: sosyal fotoğraf > logo > baş harf; alt metin kurumu söylüyor', () => {
  assert.match(KART, /yol=\{paylasim\.yazar\.avatarYolu\}/);
  assert.match(KART, /yedekAdres=\{yedekAvatarAdresi \?\? paylasim\.yazar\.logoAdresi\}/);
  assert.match(KART, /tur=\{paylasim\.yazar\.sirketId \? 'kurum' : 'kisi'\}/);
});
