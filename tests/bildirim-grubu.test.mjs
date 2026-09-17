import test from 'node:test';
import assert from 'node:assert/strict';
import { bildirimGrubu, bildirimleriGrupla } from '../src/lib/bildirim-grubu.mjs';

const simdi = new Date(2026, 8, 17, 12, 0, 0);
const gunOnce = (n, saat = 10) => new Date(2026, 8, 17 - n, saat, 0, 0).toISOString();

test('takvim gününe göre grup', () => {
  assert.equal(bildirimGrubu(gunOnce(0), simdi), 'Bugün');
  assert.equal(bildirimGrubu(gunOnce(1, 23), simdi), 'Dün');
  assert.equal(bildirimGrubu(gunOnce(3), simdi), 'Son 7 gün');
  assert.equal(bildirimGrubu(gunOnce(6), simdi), 'Son 7 gün');
  assert.equal(bildirimGrubu(gunOnce(7), simdi), 'Son 30 gün');
  assert.equal(bildirimGrubu(gunOnce(40), simdi), 'Daha önce');
});

test('geçersiz ya da ileri tarih Bugün sayılıyor', () => {
  assert.equal(bildirimGrubu('bozuk', simdi), 'Bugün');
  assert.equal(bildirimGrubu(new Date(2026, 8, 18).toISOString(), simdi), 'Bugün');
});

test('gruplama sırayı korur, boş grup döndürmez', () => {
  const liste = [
    { id: 'a', tarih: gunOnce(0) },
    { id: 'b', tarih: gunOnce(0) },
    { id: 'c', tarih: gunOnce(10) },
  ];
  const gruplar = bildirimleriGrupla(liste, simdi);
  assert.deepEqual(
    gruplar.map((g) => [g.baslik, g.ogeler.map((o) => o.id)]),
    [
      ['Bugün', ['a', 'b']],
      ['Son 30 gün', ['c']],
    ],
  );
  assert.deepEqual(bildirimleriGrupla([], simdi), []);
});
