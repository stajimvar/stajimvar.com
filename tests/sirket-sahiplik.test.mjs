import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sayfa = readFileSync('src/components/CompanyPage.tsx', 'utf8');
const sorgu = readFileSync('src/lib/queries/index.ts', 'utf8');
const yonlendirme = readFileSync('public/_redirects', 'utf8');

/*
  BU TEST NEYİ KORUYOR

  1. "Sahiplenilmiş" ve "Doğrulanmış" AYRI durumlar. Profil sayfası ikisini
     tek alandan (`verified`) okuyordu: false olunca "Henüz sahiplenilmemiş"
     yazıyordu. Sahiplenme "yetkili olduğunu söyleyen biri var", doğrulama
     "biz kontrol ettik" demek. Sahiplenmiş ama doğrulanmamış şirkete
     "kimse sahiplenmemiş" deniyordu.

  2. Sahiplenilmiş profilde tekrar sahiplenme çağrısı çizilmemeli. Form
     koşulsuz render ediliyordu: kendi şirketini açmış yetkili, kendi
     sayfasında "Bu şirketin yetkilisi misiniz?" görüyordu.

  3. Eski slug'a 301 ancak kanonik profil çalıştıktan SONRA verilir.
*/

test('sahiplenme ve doğrulama ayrı alanlardan okunuyor', () => {
  assert.match(sorgu, /sahiplenilmis: company\.claimed_at != null/);
  assert.match(
    sorgu,
    /select\('id,name,slug,logo_url,website_url,industry,location,size,description,verified,claimed_at'\)/,
    'claimed_at sorguya girmeli',
  );
  assert.match(sayfa, /veri\.company\.sahiplenilmis/);
});

test('üç durum üç ayrı gösterge', () => {
  /*
    27 Eylül 2026: sayfa hesaplı şirket profiliyle aynı görünümü
    (SirketProfilGorunumu) çiziyor. Doğrulanmış rozeti yalnız `verified`
    true iken; "Şirket hesabı" rozeti yalnız sahiplenilmişse; derleme notu
    yalnız ikisi de değilse.
  */
  assert.match(sayfa, /dogrulandi: veri\.company\.verified === true,/);
  assert.match(sayfa, /hesapRozeti=\{veri\.company\.sahiplenilmis\}/);
  assert.match(sayfa, /const derlemeNotu = !veri\.company\.verified && !veri\.company\.sahiplenilmis && \(/);
});

test('SAHİPLENİLMİŞ ŞİRKET TEKRAR SAHİPLENİLEMİYOR', () => {
  assert.match(
    sayfa,
    /\{!veri\.company\.sahiplenilmis && \(\s*\n\s*<div>\s*<CompanyClaimForm/,
    'CompanyClaimForm sahiplenilmiş profilde çizilmemeli',
  );
});

test('301 kanonik profile gidiyor, ters yöne değil', () => {
  assert.match(
    yonlendirme,
    /^\/sirket\/stajimvar-deneme\s+\/sirket\/stajimvar\s+301$/m,
    'eski slug kanonik profile 301 vermeli',
  );
  /* Ters yön ya da kendine yönlendirme zincir/döngü üretir. */
  assert.doesNotMatch(yonlendirme, /^\/sirket\/stajimvar\s+/m);
});

test('yönlendirme zinciri yok', () => {
  /* Her kuralın hedefi başka bir kuralın kaynağı olmamalı. */
  const kurallar = yonlendirme
    .split('\n')
    .filter((s) => /^\/\S+\s+\/\S+\s+30[12]$/.test(s.trim()))
    .map((s) => s.trim().split(/\s+/));
  const kaynaklar = new Set(kurallar.map(([k]) => k.replace(/\/\*$/, '')));
  for (const [kaynak, hedef] of kurallar)
    assert.ok(
      !kaynaklar.has(hedef),
      `${kaynak} → ${hedef} zincir oluşturuyor: ${hedef} de yönlendiriliyor`,
    );
});
