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

/*
  YAYINA ALMA BİR GÖNDERİM (20261120010000): düğme "Yayınla" değil.
  Basınca yayına çıkacağı söz verilmiyor; sunucudaki kontrol karar
  veriyor (yayında / düzeltme / inceleme).
*/
test('taslak: düzenlenir, yayına gönderilir, silinir', () => {
  const e = ilanEylemleri(ilan({ status: 'draft' }));
  assert.equal(e.duzenlenebilir, true);
  assert.equal(e.durumEtiketi, 'Yayına gönder');
  assert.equal(e.kaldirilabilir, true);
  assert.equal(e.arsivlenecek, false);
});

test('kapalı: düzenlenir, yeniden yayınlanır, kaldırılır', () => {
  const e = ilanEylemleri(ilan({ status: 'closed' }));
  assert.equal(e.duzenlenebilir, true);
  assert.equal(e.durumEtiketi, 'Yeniden yayınla');
  assert.equal(e.kaldirilabilir, true);
});

test('kontrolü süren ya da sonuçlanmış ilanda yayın düğmesi YOK, düzenleme VAR', () => {
  /*
    Aynı içerik yeniden gönderilirse sunucu aynı sonucu döndürüyor;
    düğme bir şey değiştirmezdi. Şirketin işi düzenlemek — içerik
    değişince sunucu eski kararı siliyor ve düğme geri geliyor.
  */
  for (const status of ['draft', 'closed']) {
    for (const kontrol_durumu of ['bekliyor', 'duzeltme', 'inceleme']) {
      const e = ilanEylemleri(ilan({ status, kontrol_durumu }));
      assert.equal(e.durumEtiketi, null, `${status}/${kontrol_durumu}`);
      assert.equal(e.duzenlenebilir, true, `${status}/${kontrol_durumu}`);
      assert.equal(e.kaldirilabilir, true, `${status}/${kontrol_durumu}`);
    }
  }
  /* Kontrolden geçmiş kapalı ilan yeniden açılabiliyor. */
  assert.equal(ilanEylemleri(ilan({ status: 'closed', kontrol_durumu: 'gecti' })).durumEtiketi, 'Yeniden yayınla');
  /* Yayındaki ilan her durumda kapatılabiliyor. */
  assert.equal(ilanEylemleri(ilan({ status: 'published', kontrol_durumu: 'gecti' })).durumEtiketi, 'Kapat');
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
