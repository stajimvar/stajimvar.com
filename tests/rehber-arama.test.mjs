import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EN_AZ_HARF,
  birlesikArama,
  profilBolumu,
  profilMerkezi,
} from '../src/lib/rehber-arama.mjs';

/*
  Rehber alanı dört ayrı hazine taşıyor: rehber yazıları, bölüm
  rehberleri, doğrulanmış işverenler ve kariyer merkezleri. Arama yalnızca
  yazıların içinde geziyordu; "Aselsan" yazan kişi hiçbir sonuç alamıyor,
  "Marmara" yazan kendi okulunun kariyer merkezini bulamıyordu.

  Profil eşleştirmesinin de yanlış olması pahalı: yanlış bir bölüm
  sayfasına götürmek, hiç götürmemekten kötü.
*/

const KAYNAKLAR = {
  rehberler: [
    { slug: 'zorunlu-staj', baslik: 'Zorunlu staj rehberi', ozet: 'Belge ve sigorta', konuAdi: 'Staj' },
    { slug: 'kyk', baslik: 'KYK burs ve kredi', ozet: 'Başvuru ve geri ödeme', konuAdi: 'Burs ve KYK' },
  ],
  bolumler: [
    { slug: 'makine-muhendisligi', ad: 'Makine Mühendisliği', ozet: 'Üretim ve tasarım' },
    { slug: 'moda-tasarimi', ad: 'Moda Tasarımı', ozet: 'Koleksiyon ve kalıp' },
  ],
  isverenler: [
    { slug: 'aselsan', isveren: 'Aselsan', sektor: 'Savunma ve havacılık' },
    { slug: 'boyner', isveren: 'Boyner', sektor: 'Perakende' },
  ],
  merkezler: [
    { universite: 'Marmara Üniversitesi', sehir: 'İstanbul' },
    { universite: 'Ege Üniversitesi', sehir: 'İzmir' },
  ],
};

test('kısa terimde arama çalışmıyor', () => {
  /* Tek harf bütün listeyi döndürürdü; sonuç sayfası anlamsız olurdu. */
  assert.equal(birlesikArama('a', KAYNAKLAR).aktif, false);
  assert.equal(birlesikArama('', KAYNAKLAR).aktif, false);
  assert.equal(EN_AZ_HARF, 2);
});

test('işveren adı bulunuyor', () => {
  const s = birlesikArama('aselsan', KAYNAKLAR);
  assert.deepEqual(s.isverenler.map((i) => i.slug), ['aselsan']);
  assert.equal(s.rehberler.length, 0);
  assert.equal(s.toplam, 1);
});

test('sektörden de bulunuyor', () => {
  assert.deepEqual(
    birlesikArama('perakende', KAYNAKLAR).isverenler.map((i) => i.slug),
    ['boyner']
  );
});

test('üniversite ve şehir bulunuyor', () => {
  assert.equal(birlesikArama('marmara', KAYNAKLAR).merkezler.length, 1);
  assert.equal(birlesikArama('izmir', KAYNAKLAR).merkezler[0].universite, 'Ege Üniversitesi');
});

test('bölüm adı bulunuyor', () => {
  assert.deepEqual(
    birlesikArama('makine', KAYNAKLAR).bolumler.map((b) => b.slug),
    ['makine-muhendisligi']
  );
});

test('Türkçe karakter duyarsız', () => {
  /* "ogrenci" yazan "öğrenci"yi, "muhendislik" yazan "Mühendisliği"ni bulmalı. */
  assert.equal(birlesikArama('muhendis', KAYNAKLAR).bolumler.length, 1);
  assert.equal(birlesikArama('MARMARA', KAYNAKLAR).merkezler.length, 1);
});

test('tek terim birden çok kaynakta eşleşebiliyor', () => {
  const s = birlesikArama('staj', KAYNAKLAR);
  assert.ok(s.rehberler.length >= 1);
  assert.equal(s.toplam, s.rehberler.length + s.bolumler.length + s.isverenler.length + s.merkezler.length);
});

test('eşleşme yoksa hepsi boş', () => {
  const s = birlesikArama('zzqqxx', KAYNAKLAR);
  assert.equal(s.toplam, 0);
  assert.equal(s.aktif, true);
});

/* ------------------------------------------------------- profil eşleşmesi */

test('profildeki bölüm tam eşleşiyor', () => {
  assert.equal(profilBolumu('Makine Mühendisliği', KAYNAKLAR.bolumler).slug, 'makine-muhendisligi');
});

test('parantezli bölüm adı da doğru sayfaya gidiyor', () => {
  assert.equal(
    profilBolumu('Makine Mühendisliği (İngilizce)', KAYNAKLAR.bolumler).slug,
    'makine-muhendisligi'
  );
});

test('eşleşmeyen bölüm null dönüyor', () => {
  /* Yanlış bir bölüm sayfasına götürmek, hiç götürmemekten kötü. */
  assert.equal(profilBolumu('Arkeoloji', KAYNAKLAR.bolumler), null);
  assert.equal(profilBolumu('', KAYNAKLAR.bolumler), null);
  assert.equal(profilBolumu(null, KAYNAKLAR.bolumler), null);
  assert.equal(profilBolumu('ab', KAYNAKLAR.bolumler), null);
});

test('profildeki üniversite kariyer merkezine bağlanıyor', () => {
  assert.equal(
    profilMerkezi('Marmara Üniversitesi', KAYNAKLAR.merkezler).universite,
    'Marmara Üniversitesi'
  );
  assert.equal(profilMerkezi('Boğaziçi Üniversitesi', KAYNAKLAR.merkezler), null);
  assert.equal(profilMerkezi(null, KAYNAKLAR.merkezler), null);
});
