import test from 'node:test';
import assert from 'node:assert/strict';

/*
  İLAN YAPISAL VERİSİNDE SON BAŞVURU TARİHİ

  Search Console 22 Eylül 2026'da uyardı: "validThrough alanı eksik"
  (kritik olmayan). Alan veritabanında zaten vardı —
  `application_deadline` ilan sorgusunda çekiliyordu — ama yapısal
  veriye hiç yazılmıyordu.

  TARİHİ OLANA YAZILIYOR, OLMAYANA YAZILMIYOR

  Ölçüldü: 188 ilan sayfasının 9'unda gerçek son başvuru tarihi var.
  Kalan 179'u için tarih uydurmak ("ilan + 30 gün" gibi) kapanmış bir
  ilanı açık ya da açık bir ilanı kapalı göstermek olurdu. Google'ın
  kendi kılavuzu da aynı şeyi söylüyor: bitiş tarihi bilinmiyorsa alan
  KONULMAZ, ilan bir süre sonra kendiliğinden düşürülür.
*/

/*
  12 Ekim 2026: JobPosting ortak modülde (src/lib/seo/ilan-sayfasi.mjs);
  derleme ve kenar çizimi aynı fonksiyonu kullanıyor. Testler artık kaynak
  metne değil ÜRETİLEN veriye bakıyor.
*/
import { ilanJobPosting } from '../src/lib/seo/ilan-sayfasi.mjs';

const ILAN = {
  id: 'abcdef12-0000-4000-8000-000000000002',
  title: 'Pazarlama Stajyeri',
  description: 'Dijital pazarlama ekibinde içerik planlama.',
  posted_at: '2026-10-01T08:00:00Z',
  city: 'Ankara',
  country_code: 'TR',
  work_type: 'Hybrid',
  companies: { name: 'Örnek A.Ş.' },
};
const SIMDI = Date.parse('2026-10-12T12:00:00Z');
const jp = (ek) => ilanJobPosting({ ...ILAN, ...ek }, (s) => s, SIMDI).veri;

test('son basvuru tarihi yapisal veriye yaziliyor', () => {
  assert.equal(jp({ application_deadline: '2026-11-30' }).validThrough, '2026-11-30');
});

test('tarih yoksa alan hic yazilmiyor', () => {
  assert.ok(!('validThrough' in jp({ application_deadline: null })));
  assert.ok(!('validThrough' in jp({ application_deadline: 'belirsiz' })));
});

test('tarih uydurulmuyor', () => {
  /* Tarihsiz ilanda ne bugünden ne yayın tarihinden türetilmiş bir değer var. */
  const v = jp({ application_deadline: null });
  assert.equal(v.validThrough, undefined);
  assert.equal(JSON.stringify(v).includes('2026-10-12'), false);
});

test('bicim tek: saat kismi atiliyor', () => {
  assert.equal(jp({ application_deadline: '2026-11-30T21:00:00+00:00' }).validThrough, '2026-11-30');
});
