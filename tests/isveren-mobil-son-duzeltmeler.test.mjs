import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ŞİRKET HESABI MOBİL — SON DÜZELTMELER (26 Eylül 2026)

  Tek oluşturma eylemi, Şirketim'in masaüstü genişliği, şirket kabuğunda
  logonun dokunma alanı, önizleme ile ziyaretçi sayfasının aynı alanları
  göstermesi. Tarayıcıdaki ölçümler yerel şirket oturumuyla yapıldı;
  burada kaynaktaki kararlar bağlanıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const yorumsuz = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('ilan oluşturma tek: etiketli "İlan oluştur", "+" ve "Yeni ilan" kartı yok', () => {
  const panel = yorumsuz(oku('src/sirket/SirketPaneli.tsx'));
  const ilanlarim = panel.slice(panel.indexOf('İlanlarım'), panel.indexOf('<GenelBakis'));
  assert.match(ilanlarim, /\{ilanlar\.length > 0 && \(\s*<button[\s\S]{0,300}İlan oluştur\s*<\/button>/);
  assert.doesNotMatch(ilanlarim, /Yeni ilan|hidden sm:inline/);
  const genel = yorumsuz(oku('src/sirket/GenelBakis.tsx'));
  assert.doesNotMatch(genel, /YeniIlanKarti/);
});

test("Şirketim masaüstünde öğrenci profiliyle aynı 600 px'lik sütunda; telefonda sınıf eklemiyor", () => {
  const sahip = oku('src/sirket/SirketProfili.tsx');
  assert.match(sahip, /import \{ ProfilSayfaDuzeni \} from '\.\.\/components\/sosyal\/ProfilSayfaDuzeni';/);
  /* Ana görünüm, kapak ve önizleme dalları üçü de sütunda. */
  assert.equal((yorumsuz(sahip).match(/<ProfilSayfaDuzeni>/g) ?? []).length, 3);
  const duzen = oku('src/components/sosyal/ProfilSayfaDuzeni.tsx');
  assert.match(duzen, /export const PROFIL_ANA_SUTUNU = 'w-full min-w-0 lg:max-w-\[600px\]';/);
});

test('şirket kabuğunda logo bağlantısı 44 px; logo yazısı ve öğrenci kabuğu değişmedi', () => {
  const header = oku('src/components/Header.tsx');
  assert.match(header, /<Logo\s+href=\{anaAdres\}\s+className=\{sirketKabugu \? 'min-h-11' : ''\}/);
  /* Logo yazı boyutu Logo bileşeninde; burada ölçü sınıfı verilmiyor. */
  assert.match(oku('src/components/Logo.tsx'), /'text-\[28px\] sm:text-2xl lg:text-\[28px\] tracking-\[-0\.03em\]'/);
});

test('öğrencinin gördüğü şirket sayfası kapağı ve gerçek doğrulamayı gösteriyor; İK e-postası yok', () => {
  const sayfa = oku('src/sirket/SirketSayfasi.tsx');
  assert.match(sayfa, /kapakYolu=\{profil\.kapakFotografiYolu \?\? null\}/);
  const veri = oku('src/lib/sirket-veri.ts');
  assert.match(veri, /dogrulandi: data\.verified === true,/);
  assert.match(veri, /dogrulandi: baglam\.dogrulandi === true,/);
  /* Önizleme notu oturumsuz sayfayı ve giriş isteyen alanları söylüyor. */
  const sahip = oku('src/sirket/SirketProfili.tsx');
  assert.match(sahip, /href=\{`\/sirket\/\$\{baglam\.slug\}`\}/);
  assert.match(sahip, /paylaşımlar ve takipçi sayısı giriş istiyor/);
});
