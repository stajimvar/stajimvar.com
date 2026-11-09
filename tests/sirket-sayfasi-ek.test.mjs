import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baglantiHatasi, yanHaklarAyir, yanHaklarHatasi, youtubeKimligi } from '../src/lib/sirket-sayfasi-ek.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('yan haklar: satır başı işaretleri atılıyor, tekrar yok, 12 ve 60 sınırı', () => {
  assert.deepEqual(yanHaklarAyir('• Yemek kartı\n- Esnek saat\nyemek KARTI\n\n'), ['Yemek kartı', 'Esnek saat']);
  assert.match(yanHaklarHatasi(Array.from({ length: 13 }, (_, i) => `Hak ${i}`).join('\n')), /En fazla 12/);
  assert.match(yanHaklarHatasi('x'.repeat(61)), /60 karakter/);
  assert.equal(yanHaklarHatasi(''), '');
});

test('bağlantılar: yalnız gerçek LinkedIn/Instagram; benzer alan adı reddediliyor', () => {
  assert.equal(baglantiHatasi('linkedin', 'https://www.linkedin.com/company/modmere/'), '');
  assert.notEqual(baglantiHatasi('linkedin', 'https://linkedin.com.kotu.io/company/x'), '');
  assert.notEqual(baglantiHatasi('linkedin', 'http://www.linkedin.com/company/x'), '');
  assert.equal(baglantiHatasi('instagram', 'https://www.instagram.com/stajimvar'), '');
  assert.notEqual(baglantiHatasi('instagram', 'https://instagram.com.kotu.io/x'), '');
  assert.equal(baglantiHatasi('video', ''), '');
});

test('video: yalnız YouTube kimliği çıkıyor; iframe adresi kimlikten kuruluyor', () => {
  assert.equal(youtubeKimligi('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'), 'dQw4w9WgXcQ');
  assert.equal(youtubeKimligi('https://youtu.be/dQw4w9WgXcQ?si=x'), 'dQw4w9WgXcQ');
  assert.equal(youtubeKimligi('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeKimligi('https://kotu.io/?v=dQw4w9WgXcQ'), null);
  const ek = oku('src/sirket/SirketSayfasiEkleri.tsx');
  assert.match(ek, /src=\{`https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{videoId\}/);
  assert.match(ek, /videoAcik \?/);
  assert.match(oku('public/_headers'), /frame-src[^;]*https:\/\/www\.youtube-nocookie\.com/);
});

test('göç: biçim kısıtları sunucuda; açık sütun seçme ve üye güncelleme yetkisi', () => {
  const g = oku('supabase/migrations/20270108010000_sirket_sayfasi_ek.sql');
  assert.match(g, /companies_linkedin_url_bicimi/);
  assert.match(g, /companies_instagram_url_bicimi/);
  assert.match(g, /companies_tanitim_video_bicimi/);
  assert.match(g, /cardinality\(p\) between 1 and 12/);
  assert.match(g, /grant select \(yan_haklar, linkedin_url, instagram_url, tanitim_video_url\)\s+on public\.companies to anon, authenticated;/);
  assert.match(g, /grant update \(yan_haklar, linkedin_url, instagram_url, tanitim_video_url\)\s+on public\.companies to authenticated;/);
});

test('üç okuma yolu da ekleri taşıyor; tamamlanma oranı değişmiyor', () => {
  const v = oku('src/lib/sirket-veri.ts');
  assert.match(v, /yanHaklar: yanHaklarAyir\(profil\?\.yanHaklar \?\? ''\)/);
  assert.match(v, /tanitim_video_url: temiz\(deger\.videoUrl\)/);
  assert.match(oku('src/components/CompanyPage.tsx'), /videoUrl: veri\.company\.videoUrl \?\? null/);
  assert.match(oku('src/sirket/SirketProfilGorunumu.tsx'), /<SirketSayfasiEkleri kimlik=\{kimlik\} \/>/);
  const alanlar = v.slice(v.indexOf('export const PROFIL_ALANLARI'), v.indexOf('];', v.indexOf('export const PROFIL_ALANLARI')));
  assert.doesNotMatch(alanlar, /yanHaklar|linkedinUrl|videoUrl/);
});
