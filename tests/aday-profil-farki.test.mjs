import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KOPYA_SINIRI,
  adayBaglantilari,
  adayProfilFarki,
  githubAdresi,
  rozetEtiketi,
} from '../src/lib/aday-profil-farki.mjs';
import { kartVerisi, onyargisizla } from '../src/lib/aday-kart.mjs';

/*
  BAŞVURU ANI ↔ GÜNCEL PROFİL FARKI

  Saf modülün davranışı. Arayüz yalnız sonucu çiziyor; "değişmeyen alan
  tekrar yazılmasın" ve "kopya sınırında eklendi denmesin" kuralları
  burada bağlı.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

const basvuru = (kopya = {}, ek = {}) =>
  kartVerisi({
    id: 'b1',
    status: 'submitted',
    applied_at: '2026-09-01T08:00:00Z',
    listing_id: 'i1',
    application_method: 'internal',
    contact_share_consent_at: '2026-09-01T08:00:00Z',
    profile_snapshot: {
      ad: 'Aday A',
      universite: 'Örnek Üniversitesi',
      bolum: 'Bilgisayar Mühendisliği',
      sinif: '2. Sınıf',
      sehir: 'İzmir',
      github: 'ornek',
      portfolyo: 'https://ornek.test/',
      linkedin: null,
      yetenekler: ['React', 'SQL'],
      diller: ['İngilizce (B1)'],
      rozetler: ['quiz-react'],
      projeler: [{ baslik: 'Kütüphane', aciklama: 'Kitap takibi', adres: null }],
      ...kopya,
    },
    ...ek,
  });

const guncel = (ek = {}) => ({
  ad: 'Aday A',
  fotoUrl: null,
  universite: 'Örnek Üniversitesi',
  bolum: 'Bilgisayar Mühendisliği',
  sinif: '2. Sınıf',
  sehir: 'İzmir',
  github: 'ornek',
  portfolyo: 'https://ornek.test',
  linkedin: null,
  rozetler: ['quiz-react'],
  yetenekler: ['react', 'SQL'],
  diller: ['İngilizce (B1)'],
  projeler: [{ baslik: 'Kütüphane', aciklama: 'Kitap takibi', adres: null }],
  guncellendi: '2026-09-20T08:00:00Z',
  ...ek,
});

test('aynı profil: değişiklik yok, hiçbir alan listelenmiyor', () => {
  const f = adayProfilFarki(basvuru(), guncel());
  assert.equal(f.degisiklikVar, false);
  assert.deepEqual(f.alanlar, []);
  assert.deepEqual(f.yetenekler.eklenen, []);
  assert.deepEqual(f.yetenekler.cikan, []);
  assert.ok(Object.values(f.bolumler).every((x) => x === false));
});

test('büyük-küçük harf ve sondaki eğik çizgi fark sayılmıyor', () => {
  /* "react" ↔ "React", "ornek.test/" ↔ "ornek.test" yukarıdaki kalıpta var. */
  const f = adayProfilFarki(basvuru(), guncel());
  assert.equal(f.bolumler.yetenekler, false);
  assert.equal(f.bolumler.baglantilar, false);
});

test('değişen tekil alan önce/şimdi ile geliyor, değişmeyen gelmiyor', () => {
  const f = adayProfilFarki(basvuru(), guncel({ sinif: '3. Sınıf', sehir: 'Ankara' }));
  assert.equal(f.degisiklikVar, true);
  assert.deepEqual(
    f.alanlar.map((a) => [a.anahtar, a.once, a.simdi]),
    [
      ['sinif', '2. Sınıf', '3. Sınıf'],
      ['sehir', 'İzmir', 'Ankara'],
    ],
  );
  assert.equal(f.bolumler.egitim, true);
  assert.equal(f.bolumler.sehir, true);
  assert.equal(f.bolumler.yetenekler, false);
});

test('güncel sınıf boşsa fark sayılmıyor (eşleyicinin varsayılanı)', () => {
  const f = adayProfilFarki(basvuru(), guncel({ sinif: null }));
  assert.equal(f.alanlar.some((a) => a.anahtar === 'sinif'), false);
  /* Kural bir yorumdan değil koddan geliyor: eşleyici gerçekten varsayıyor. */
  assert.match(oku('src/lib/queries/mappers.ts'), /gradeLevel: row\.grade_level \?\? '3\. Sınıf'/);
});

test('öteki alan boşalırsa fark sayılıyor', () => {
  const f = adayProfilFarki(basvuru(), guncel({ sehir: null }));
  assert.deepEqual(f.alanlar.map((a) => [a.anahtar, a.once, a.simdi]), [['sehir', 'İzmir', null]]);
});

test('eklenen ve çıkan yetenek ayrı listeleniyor', () => {
  const f = adayProfilFarki(basvuru(), guncel({ yetenekler: ['React', 'TypeScript'] }));
  assert.deepEqual(f.yetenekler.eklenen, ['TypeScript']);
  assert.deepEqual(f.yetenekler.cikan, ['SQL']);
  assert.equal(f.yetenekler.kopyaSinirli, false);
});

test('kopya beş yetenekle doluysa "eklenen" kesin değil', () => {
  const bes = ['A', 'B', 'C', 'D', 'E'];
  const f = adayProfilFarki(basvuru({ yetenekler: bes }), guncel({ yetenekler: [...bes, 'F'] }));
  assert.deepEqual(f.yetenekler.eklenen, ['F']);
  assert.equal(f.yetenekler.kopyaSinirli, true);
  /* Sınır kopya üreticisindeki dilimle aynı. */
  assert.equal(KOPYA_SINIRI, 5);
  const kopya = oku('src/lib/basvuru-kopyasi.mjs');
  assert.ok((kopya.match(/\.slice\(0, 5\)/g) ?? []).length >= 2, 'kopya sınırı değişti — KOPYA_SINIRI da değişmeli');
});

test('kopyada yetenek yoksa karşılaştırma yapılmıyor', () => {
  /* Kart canlı tablodan tamamlanmış; canlıyı canlıyla kıyaslamak sahte güvence. */
  const kart = kartVerisi(
    {
      id: 'b2',
      contact_share_consent_at: '2026-09-01T08:00:00Z',
      profile_snapshot: { ad: 'Aday B', universite: 'Örnek' },
    },
    { yetenekler: [{ name: 'Excel' }] },
  );
  assert.equal(kart.yetenekKopyadan, false);
  const f = adayProfilFarki(kart, guncel({ ad: 'Aday B', universite: 'Örnek', yetenekler: ['Python'] }));
  assert.equal(f.yetenekler.karsilastirilamadi, true);
  assert.deepEqual(f.yetenekler.eklenen, []);
  assert.deepEqual(f.yetenekler.cikan, []);
});

test('dil seviyesi değişimi "çıkan + eklenen" değil, seviye değişimi', () => {
  const f = adayProfilFarki(
    basvuru({ diller: ['İngilizce (B1)', 'Almanca (A1)', 'undefined (A2)'] }),
    guncel({ diller: ['İngilizce (B2)', 'Fransızca (A2)'] }),
  );
  assert.deepEqual(f.diller.seviyesiDegisen, [{ ad: 'İngilizce', once: 'İngilizce (B1)', simdi: 'İngilizce (B2)' }]);
  assert.deepEqual(f.diller.eklenen, ['Fransızca (A2)']);
  /* Bozuk "undefined (A2)" satırı çıkan dil sayılmıyor. */
  assert.deepEqual(f.diller.cikan, ['Almanca (A1)']);
});

test('proje: eklenen, çıkan ve içeriği değişen ayrılıyor', () => {
  const f = adayProfilFarki(
    basvuru({
      projeler: [
        { baslik: 'Kütüphane', aciklama: 'Kitap takibi', adres: null },
        { baslik: 'Hava', aciklama: null, adres: null },
      ],
    }),
    guncel({
      projeler: [
        { baslik: 'Kütüphane', aciklama: 'Kitap ve dergi takibi', adres: null },
        { baslik: 'Sohbet botu', aciklama: null, adres: 'https://ornek.test/bot' },
      ],
    }),
  );
  assert.deepEqual(f.projeler.eklenen.map((p) => p.baslik), ['Sohbet botu']);
  assert.deepEqual(f.projeler.cikan.map((p) => p.baslik), ['Hava']);
  assert.deepEqual(f.projeler.guncellenen.map((p) => p.baslik), ['Kütüphane']);
});

test('rozet eklenmesi fark', () => {
  const f = adayProfilFarki(basvuru(), guncel({ rozetler: ['quiz-react', 'quiz-sql'] }));
  assert.deepEqual(f.rozetler.eklenen, ['quiz-sql']);
  assert.equal(f.bolumler.rozetler, true);
});

test('önyargısız incelemede ad karşılaştırılmıyor', () => {
  const g = guncel({ ad: 'Aday Z' });
  assert.equal(adayProfilFarki(basvuru(), g).alanlar[0].anahtar, 'ad');
  const gizli = adayProfilFarki(onyargisizla(basvuru()), g);
  assert.equal(gizli.alanlar.some((a) => a.anahtar === 'ad'), false);
  assert.equal(gizli.degisiklikVar, false);
  /* Sonuçta adın kendisi hiçbir yerde geçmiyor. */
  assert.doesNotMatch(JSON.stringify(gizli), /Aday Z/);
});

test('önyargısız incelemede bağlantı değeri yazılmıyor, değiştiği kalıyor', () => {
  const g = guncel({ linkedin: 'https://linkedin.com/in/aday-z-soyad', github: 'aday-z' });
  const acik = adayProfilFarki(basvuru(), g);
  assert.ok(acik.alanlar.some((a) => a.anahtar === 'linkedin' && a.simdi === 'https://linkedin.com/in/aday-z-soyad'));
  const gizli = adayProfilFarki(onyargisizla(basvuru()), g);
  const satirlar = gizli.alanlar.filter((a) => a.bolum === 'baglantilar');
  assert.deepEqual(satirlar.map((a) => a.anahtar).sort(), ['github', 'linkedin']);
  for (const a of satirlar) {
    assert.equal(a.degerGizli, true);
    assert.equal(a.once, null);
    assert.equal(a.simdi, null);
  }
  assert.doesNotMatch(JSON.stringify(gizli), /aday-z|ornek/);
  assert.equal(gizli.bolumler.baglantilar, true);
});

test('fotoğraf adresi hiçbir zaman fark olarak dönmüyor', () => {
  const f = adayProfilFarki(basvuru({ fotoUrl: 'https://ornek.test/a.png' }), guncel({ fotoUrl: 'https://ornek.test/b.png' }));
  assert.doesNotMatch(JSON.stringify(f), /ornek\.test\/[ab]\.png/);
});

test('eksik girdi: null', () => {
  assert.equal(adayProfilFarki(null, guncel()), null);
  assert.equal(adayProfilFarki(basvuru(), null), null);
});

test('bozuk güncel diziler düşürmüyor', () => {
  const f = adayProfilFarki(basvuru(), guncel({ yetenekler: null, diller: [42, null, 'Almanca'], projeler: [null, { baslik: '' }] }));
  assert.deepEqual(f.yetenekler.cikan, ['React', 'SQL']);
  assert.deepEqual(f.diller.eklenen, ['Almanca']);
  assert.deepEqual(f.projeler.cikan.map((p) => p.baslik), ['Kütüphane']);
});

/* ------------------------------------------------------ bağlantılar */

test('bağlantılar yalnız güvenli HTTPS adresle', () => {
  assert.deepEqual(
    adayBaglantilari({ github: 'ornek', portfolyo: 'javascript:alert(1)', linkedin: 'linkedin.com/in/ornek' }),
    [
      { tur: 'github', etiket: 'GitHub', adres: 'https://github.com/ornek' },
      { tur: 'linkedin', etiket: 'LinkedIn', adres: 'https://linkedin.com/in/ornek' },
    ],
  );
  assert.deepEqual(adayBaglantilari({ portfolyo: 'http://127.0.0.1/x' }), []);
  assert.deepEqual(adayBaglantilari(null), []);
});

test('github alanı başka konağa çıkmıyor', () => {
  assert.equal(githubAdresi('https://github.com/ornek'), 'https://github.com/ornek');
  assert.equal(githubAdresi('https://kotu.test/ornek'), null);
  assert.equal(githubAdresi('a b'), null);
  assert.equal(githubAdresi(''), null);
});

test('rozet etiketi öğrenci profilindeki gösterimle aynı', () => {
  assert.equal(rozetEtiketi('quiz-react'), 'react');
  assert.equal(rozetEtiketi('badge-sql'), 'sql');
  /* 6 Ekim 2026: rozetler düzenleme ekranının "Testler" satırında (ProfilDuzenleme). */
  assert.match(oku('src/components/ProfilDuzenleme.tsx'), /b\.replace\(\/\^\(badge\|quiz\)-\/, ''\)/);
});

test('kart verisi LinkedIn ve paylaşım iznini taşıyor', () => {
  const k = kartVerisi({
    id: 'b3',
    contact_share_consent_at: '2026-09-01T08:00:00Z',
    /* Gerçek satırda NOT NULL; sade akışta paylaşım kuralı buna bakıyor. */
    application_method: 'internal',
    paylasim_izni_at: '2026-09-02T08:00:00Z',
    profile_snapshot: { ad: 'Aday C', linkedin: 'https://linkedin.com/in/c' },
  });
  assert.equal(k.linkedin, 'https://linkedin.com/in/c');
  assert.equal(k.paylasimIzniAt, '2026-09-02T08:00:00Z');
  /* Rıza yoksa LinkedIn de yok. */
  assert.equal(kartVerisi({ id: 'b4', profile_snapshot: { linkedin: 'x' } }).linkedin, null);
});
