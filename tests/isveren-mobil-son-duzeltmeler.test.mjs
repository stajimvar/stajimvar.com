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
  assert.equal((yorumsuz(sahip).match(/<ProfilSayfaDuzeni[\s>]/g) ?? []).length, 3);
  /*
    27 Eylül 2026: ana görünüm öğrencinin /cv ekranı gibi üç sütun — sol
    şirket paneli, sağ son başvurular + işveren rehberi (SirketYanSutunlari).
  */
  assert.match(sahip, /solSutun=\{\s*<SirketSolSutun/);
  assert.match(sahip, /yanSutun=\{\s*<SirketYanSutun/);
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

test('işveren rehberi satırları rehber merkeziyle aynı kapağı kullanıyor; beş kapak dosyası var', async () => {
  const { existsSync } = await import('node:fs');
  const rehber = oku('src/sirket/IsverenRehberi.tsx');
  assert.match(rehber, /import \{ RehberKapagi \} from '\.\.\/components\/RehberKartlari';/);
  assert.match(rehber, /<RehberKapagi slug=\{r\.slug\} \/>/);
  for (const slug of [
    'iyi-staj-ilani-nasil-yazilir',
    'zorunlu-staj-isverenin-yukumlulukleri',
    'staj-basvurularini-degerlendirme',
    'stajyerin-ilk-gunu-oryantasyon',
    'staj-sonu-referans-teklif-geri-bildirim',
  ]) {
    for (const uzanti of ['avif', 'webp']) {
      assert.ok(existsSync(path.join(KOK, 'public', 'rehber-gorselleri', `${slug}.${uzanti}`)), `${slug}.${uzanti}`);
    }
  }
});

test('işveren rehberi masaüstünde öğrenci rehberiyle aynı 3/6/3 ızgara; sayılar yazılardan', () => {
  const rehber = oku('src/sirket/IsverenRehberi.tsx');
  assert.match(rehber, /grid grid-cols-1 items-start gap-5 lg:grid-cols-12/);
  assert.match(rehber, /lg:col-span-3 lg:block" aria-label="Filtreler"/);
  assert.match(rehber, /<div className="space-y-5 lg:col-span-6">/);
  assert.match(rehber, /const TOPLAM_DAKIKA = ISVEREN_YAZILARI\.reduce\(\(t, r\) => t \+ rehberOkumaDakika\(r\), 0\);/);
  /* Telefonda sayfa içi arama ve çipler; masaüstünde üst çubuk. */
  assert.match(rehber, /<div className="relative lg:hidden">/);
  const kabuk = oku('src/components/GuidePages.tsx');
  assert.match(kabuk, /<SayfaKabugu icerikGenisligi=\{SAYFA_GENISLIGI\} ustBosluk="pt-4 sm:pt-3">\s*<IsverenRehberi/);
});

test('Şirketim yan sütunları gerçek veriden; kademe kapalıysa başvuru sayısı yazılmıyor', () => {
  const yan = oku('src/sirket/SirketYanSutunlari.tsx');
  assert.match(yan, /const basvuruBilgisi = !kartAcik\s*\? 'Doğrulamadan sonra açılır'/);
  assert.match(yan, /const son = kartAcik \? basvurular\.slice\(0, 4\) : \[\];/);
  assert.match(yan, /takipci\.durum === 'hazir' \? `\$\{takipci\.deger\} takipçi` : null/);
  /* Rehber verisi panelin ilk yüklemesine binmiyor. */
  assert.match(yan, /import\('\.\.\/data\/rehberler'\)/);
  assert.doesNotMatch(yan, /^import \{[^}]*REHBERLER/m);
});
