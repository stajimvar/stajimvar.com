import test from 'node:test';
import assert from 'node:assert/strict';
import { ilanEylemleri } from '../src/lib/ilan-formu.mjs';

/*
  İlan satırındaki eylemler bir ürün kuralı, süs değil: yanlışı veri
  kaybettiriyor. `applications_listing_id_fkey` ON DELETE CASCADE — bir
  ilanı silmek o ilana yapılmış her başvuruyu, öğrencinin kendi başvuru
  geçmişi dahil, kalıcı siliyor.
*/

const ilan = (ek) => ({ status: 'draft', origin: 'employer_posted', applicants_count: 0, ...ek });

test('taslak: düzenlenir, yayınlanır, silinir', () => {
  const e = ilanEylemleri(ilan({ status: 'draft' }));
  assert.equal(e.duzenlenebilir, true);
  assert.equal(e.durumEtiketi, 'Yayınla');
  assert.equal(e.kaldirilabilir, true);
  assert.equal(e.arsivlenecek, false);
});

test('kapalı: düzenlenir, yeniden yayınlanır, kaldırılır', () => {
  const e = ilanEylemleri(ilan({ status: 'closed' }));
  assert.equal(e.duzenlenebilir, true);
  assert.equal(e.durumEtiketi, 'Yayınla');
  assert.equal(e.kaldirilabilir, true);
});

test('YAYINDAKİ İLAN KALDIRILAMAZ, önce kapatılır', () => {
  /* Liste bir anda boşalmasın; öğrenci açık bir ilana tıklayıp boş
     sayfa görmesin. */
  const e = ilanEylemleri(ilan({ status: 'published' }));
  assert.equal(e.kaldirilabilir, false);
  assert.equal(e.durumEtiketi, 'Kapat');
  assert.equal(e.duzenlenebilir, true, 'yayındaki kendi ilanı düzenlenebilmeli');
});

test('BAŞVURUSU OLAN İLAN SİLİNMEZ, ARŞİVLENİR', () => {
  const e = ilanEylemleri(ilan({ status: 'closed', applicants_count: 3 }));
  assert.equal(e.kaldirilabilir, true);
  assert.equal(e.arsivlenecek, true, 'başvurulu ilan arşivlenmeli');
});

test('başvurusu olmayan kapalı ilan gerçekten silinir', () => {
  const e = ilanEylemleri(ilan({ status: 'closed', applicants_count: 0 }));
  assert.equal(e.arsivlenecek, false);
});

test('TARANAN İLAN DÜZENLENEMEZ', () => {
  /* Kaynağın kendi metni; tarama her turda yeniden görüyor ve elle
     düzeltme bir sonraki turda geri alınırdı. */
  for (const kaynak of ['scraped', 'manual']) {
    assert.equal(ilanEylemleri(ilan({ origin: kaynak })).duzenlenebilir, false, kaynak);
  }
});

test('şirketin kendi açtığı ilan her iki origin değerinde de düzenlenir', () => {
  for (const kaynak of ['employer_posted', 'internal']) {
    assert.equal(ilanEylemleri(ilan({ origin: kaynak })).duzenlenebilir, true, kaynak);
  }
});

test('eksik veride güvenli tarafa düşüyor', () => {
  const e = ilanEylemleri({});
  assert.equal(e.duzenlenebilir, false);
  assert.equal(e.arsivlenecek, false);
});
