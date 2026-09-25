import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { uygulamaBolumuMu, belgeSayfasiMi } from '../src/lib/onbellek-politikasi.mjs';

/*
  BAŞKASININ KAMPÜSÜ (kullanıcı isteği, 25 Eylül 2026)

  "Başkasının profilindeyken üniversite logosuna tıklayınca onun okulunun
  bilgilerini göster." Başlıktaki düğme `/profil/<ad>`de `/kampusum/<ad>`e
  gidiyor; sunucu okulu `kampus_profil` ile, profildeki okul bilgisinin
  kapısından geçirerek veriyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const GOC = oku('supabase/migrations/20261110010000_baskasinin_kampusu.sql');
const HEADER = oku('src/components/Header.tsx');
const PANEL = oku('src/components/kampus/KampusumPaneli.tsx');
const APP = oku('src/App.tsx');
const ORTA = oku('functions/_middleware.ts');
const VERI = oku('src/lib/queries/kampus.ts');

test('göç: tek panel gövdesi, iki kapı', () => {
  assert.match(GOC, /create or replace function sosyal_gizli\.kampus_paneli\(p_okul text\)/);
  assert.match(GOC, /revoke all on function sosyal_gizli\.kampus_paneli\(text\) from public, anon, authenticated;/);
  /* kampusum() davranışı aynı: oturum yoksa NULL, varsa bakanın okulu. */
  assert.match(GOC, /when auth\.uid\(\) is null then null else sosyal_gizli\.kampus_paneli\(\s*\(select sp\.university from public\.student_profiles sp where sp\.id = auth\.uid\(\)\)/);
});

test('göç: başkasının okulu profildeki kapıdan geçiyor, ziyaretçiye kapalı', () => {
  const govde = GOC.slice(GOC.indexOf('create or replace function public.kampus_profil'));
  assert.match(govde, /when auth\.uid\(\) is null then null/);
  assert.match(govde, /sosyal_gizli\.sosyal_gorunur\(sp\.id\)/);
  assert.match(govde, /not so\.resmi_mi/);
  assert.match(govde, /so\.sirket_id is null/);
  assert.match(govde, /so\.username = lower\(btrim\(p_kullanici_adi\)\)/);
  assert.match(GOC, /revoke all on function public\.kampus_profil\(text\) from public, anon;/);
  assert.match(GOC, /grant execute on function public\.kampus_profil\(text\) to authenticated;/);
  assert.doesNotMatch(GOC, /grant execute on function public\.kampus_profil\(text\) to anon/);
});

test('veri katmanı: NULL "görünmüyor", hata "yüklenemedi" — ikisi karışmıyor', () => {
  assert.match(VERI, /db\.rpc\('kampus_profil', \{ p_kullanici_adi: kullaniciAdi \}\)/);
  assert.match(VERI, /if \(error\) throw new Error\(error\.message\);\s*if \(!data\) return null;/);
});

test('profilde okul adı o kişinin kampüsüne gidiyor', () => {
  /*
    Son rötuş (25 Eylül 2026): profil üst çubuğundaki Kampüs simgesi
    kalktı. Kapı artık okul satırı: kendi profilinde `/kampusum`,
    başkasınınkinde `/kampusum/<ad>`.
  */
  const kalip = oku('src/components/sosyal/ProfilKimlikKalibi.tsx');
  assert.match(kalip, /export const OkulKampusBaglantisi/);
  assert.match(oku('src/components/ProfilBasligi.tsx'), /<OkulKampusBaglantisi okul=\{okul\} yol="\/kampusum"/);
  assert.match(oku('src/components/sosyal/SosyalProfilGorunumu.tsx'), /yol=\{`\/kampusum\/\$\{profil\.kullaniciAdi\}`\}/);
  assert.doesNotMatch(HEADER, /kampusYolu|University/);
  /* /kampusum/<ad> sekme kuralı yerinde. */
  assert.ok(HEADER.includes(String.raw`const kampustaMi = /^\/kampusum(\/|$)/.test(bulunulanYol);`));
});

test('panel: başkasının kampüsünde bakana özel bölümler yok', () => {
  assert.match(PANEL, /\{!baskasi && \(\s*<BursBolumu/);
  assert.match(PANEL, /\{veri && !baskasi && !veri\.ogrenciOkulu && \(/);
  /* Burs listesi hiç istenmiyor. */
  assert.match(PANEL, /if \(baskasi\) return;\s*let iptal = false;\s*setBurslar/);
  assert.match(PANEL, /Bu kişinin okul bilgisi görünmüyor\./);
  assert.match(PANEL, /\}, \[kampusDeneme, kullaniciAdi\]\);/);
});

test('rota: /kampusum/<ad> aynı sayfa, bozuk kodlama çökertmiyor', () => {
  assert.match(APP, /if \(temizYol === '\/kampusum' \|\| kampusKisisi\) \{/);
  assert.match(APP, /kullaniciAdi=\{kampusKisisi\}/);
  assert.match(APP, /try \{\s*kampusKisisi = decodeURIComponent\(parca\) \|\| undefined;\s*\} catch \{/);
});

test('adres 200 kabuğunu alıyor ve kenarda tutulmuyor', () => {
  assert.match(ORTA, /if \(temiz\.startsWith\('\/kampusum\/'\)\) return true;/);
  assert.equal(uygulamaBolumuMu('/kampusum/selindikme'), true);
  assert.equal(belgeSayfasiMi('/kampusum/selindikme'), false);
});
