import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafeHttpsUrl,
  isExpiredOpportunity,
  getOpportunityOverview,
  readOpportunityFilters,
  serializeOpportunityFilters,
  matchOpportunity,
} from '../src/lib/opportunity-domain.mjs';

test('only accepts absolute HTTPS external URLs', () => {
  assert.equal(isSafeHttpsUrl('https://example.org/apply'), true);
  assert.equal(isSafeHttpsUrl('http://example.org/apply'), false);
  assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpsUrl('/local-path'), false);
});

test('treats an elapsed deadline as expired', () => {
  assert.equal(isExpiredOpportunity({ applicationDeadline: '2026-08-20T23:59:59.000Z' }, new Date('2026-08-21T00:00:00.000Z')), true);
  assert.equal(isExpiredOpportunity({ applicationDeadline: '2026-08-21T23:59:59.000Z' }, new Date('2026-08-21T00:00:00.000Z')), false);
  assert.equal(isExpiredOpportunity({ applicationDeadline: null }, new Date('2026-08-21T00:00:00.000Z')), false);
});

test('keeps date-only deadlines open through the end of their Turkey day', () => {
  assert.equal(isExpiredOpportunity({ applicationDeadline: '2026-08-21' }, new Date('2026-08-21T18:00:00.000Z')), false);
  assert.equal(isExpiredOpportunity({ applicationDeadline: '2026-08-21' }, new Date('2026-08-21T21:00:00.000Z')), true);
});

/*
  Sayaç kuralı değişti: "Başvurusu devam eden" yalnızca durumu Açık olanları
  sayıyor. Önce süresi dolmamış her kayıt sayılıyordu ve takvimi hiç
  açıklanmamış kurumlar da bu sayıya giriyordu (bkz. tests/firsat-durumu).
*/
test('summarizes only real open opportunities without inventing a deadline', () => {
  const now = new Date('2026-08-21T12:00:00.000Z');
  const overview = getOpportunityOverview([
    { title: 'Süresi geçmiş burs', opportunityType: 'scholarship', applicationDeadline: '2026-08-20' },
    { title: 'Tarihsiz eğitim', opportunityType: 'education', applicationDeadline: null },
    { title: 'KYK', opportunityType: 'kyk', applicationDeadline: '2026-08-23' },
    { title: 'Burs', opportunityType: 'scholarship', applicationDeadline: '2026-08-22' },
  ], now);

  assert.deepEqual(overview, {
    openCount: 2,
    scholarshipAndCreditCount: 2,
    nearest: { title: 'Burs', opportunityType: 'scholarship', applicationDeadline: '2026-08-22' },
    daysLeft: 1,
  });
  assert.deepEqual(getOpportunityOverview([], now), { openCount: 0, scholarshipAndCreditCount: 0, nearest: null, daysLeft: null });
});

test('süzgeç durumu adres üzerinden gidip geliyor', () => {
  const filters = readOpportunityFilters(
    '?q=erasmus&kategori=programlar&sehir=Ankara&bolge=yurtdisi&son=30&sirala=yeni'
  );
  assert.deepEqual(filters, {
    query: 'erasmus',
    kategori: 'programlar',
    kaynak: '',
    sehir: 'Ankara',
    bolge: 'yurtdisi',
    mod: '',
    sonGun: '30',
    banaUygun: false,
    kaydedilen: false,
    arsiv: false,
    siralama: 'yeni',
    takvim: false,
  });
  assert.equal(
    serializeOpportunityFilters(filters),
    '?q=erasmus&kategori=programlar&sehir=Ankara&bolge=yurtdisi&son=30&sirala=yeni'
  );
});

/*
  ESKİ BAĞLANTILAR ÇALIŞMAYA DEVAM ETMELİ

  Süzgeç modeli TÜR'den KATEGORİ'ye geçti. Paylaşılmış ve indekslenmiş
  eski bağlantılar hâlâ dolaşımda: okunurken kabul ediliyor, yazılırken
  yeni ad kullanılıyor.
*/
test('eski type= bağlantısı kategoriye çevriliyor', () => {
  assert.equal(readOpportunityFilters('?type=international').kategori, 'programlar');
  assert.equal(readOpportunityFilters('?type=competition').kategori, 'yarismalar');
  /* KYK bir kategori değil, Burslar içinde bir kaynak. */
  const kyk = readOpportunityFilters('?type=kyk');
  assert.equal(kyk.kategori, 'burslar');
  assert.equal(kyk.kaynak, 'kyk');
  assert.equal(serializeOpportunityFilters(kyk), '?kategori=burslar&kaynak=kyk');
});

test('eski place= adı şehir alanına okunuyor', () => {
  const filters = readOpportunityFilters('?place=Ankara');
  assert.equal(filters.sehir, 'Ankara');
  assert.equal(serializeOpportunityFilters(filters), '?sehir=Ankara');
});

test('görünüm ve liste anahtarları adrese yazılıyor', () => {
  const filters = readOpportunityFilters('?arsiv=1&uygun=1&kayit=1&gorunum=takvim');
  assert.equal(filters.arsiv, true);
  assert.equal(filters.banaUygun, true);
  assert.equal(filters.kaydedilen, true);
  assert.equal(filters.takvim, true);
  assert.equal(serializeOpportunityFilters(filters), '?uygun=1&kayit=1&arsiv=1&gorunum=takvim');
});

test('tanınmayan değer sessizce düşüyor', () => {
  /* Elle yazılmış ya da bozulmuş adres süzgeci kilitlememeli. */
  const filters = readOpportunityFilters('?kategori=uydurma&bolge=mars&son=999&sirala=rastgele');
  assert.equal(filters.kategori, '');
  assert.equal(filters.bolge, '');
  assert.equal(filters.sonGun, '');
  assert.equal(filters.siralama, '');
  assert.equal(serializeOpportunityFilters(filters), '');
});

test('does not score an opportunity when a required profile fact is missing', () => {
  const result = matchOpportunity(
    { educationLevels: ['Lisans'], eligibleDepartments: ['Bilgisayar Mühendisliği'], eligibleClassYears: ['3. Sınıf'], cities: ['Ankara'], countries: [], minimumGpa: 3, languageRequirements: ['İngilizce'] },
    { educationLevel: 'Lisans', department: '', gradeLevel: '', city: '', gpa: null, languages: [] }
  );
  assert.equal(result.isScorable, false);
  assert.deepEqual(result.missingProfileFields, ['department', 'gradeLevel', 'city', 'gpa', 'languages']);
});
