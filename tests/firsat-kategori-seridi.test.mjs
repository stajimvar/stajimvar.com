import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FIRSAT_KATEGORILERI } from '../src/lib/firsat-kategori.mjs';

/*
  FIRSAT KATEGORİ ŞERİDİ

  Rehberde konu seçimi bir daire şeridiyle yapılıyor; fırsatlarda aynı
  seçim önce yalnızca filtre panelindeydi, sonra ŞERİDE taşındı ama
  türleri tek tek gösteriyordu. Göç dört tür daha açınca (hackathon,
  teknofest, career_day, career_fair) şerit on bir daireye çıkacaktı ve
  hiçbiri öğrencinin sorusuna karşılık gelmiyor.

  Şerit AYNI bileşen (KonuSeridi). Beşinci bir kopya yazmak yerine
  bileşene üç prop eklendi: birim adı, ikon haritası, varsayılan ikon.
  Ölçüldü (canlı): daire iki sayfada da 76x103, şerit kabı 660 piksel.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

const serit = oku('src/components/KonuSeridi.tsx');
const firsatlar = oku('src/components/OpportunitiesPage.tsx');
const rehberMerkezi = oku('src/components/RehberMerkezi.tsx');

test('ŞERİT KOPYALANMADI, PAYLAŞILDI', () => {
  assert.match(firsatlar, /import \{ KonuSeridi \} from '\.\/KonuSeridi'/);
  assert.match(rehberMerkezi, /import \{ KonuSeridi \} from '\.\/KonuSeridi'/);
  /* Fırsatlar sayfası kendi daire markup'ını yazmıyor. */
  assert.doesNotMatch(firsatlar, /rounded-full p-\[2\.5px\]/, 'daire markup kopyalanmış');
});

test('REHBER TARAFI DEĞİŞMEDİ — varsayılanlar eski davranış', () => {
  assert.match(serit, /birim = 'rehber'/);
  assert.match(serit, /ikonlar = IKONLAR/);
  assert.match(serit, /varsayilanIkon: VarsayilanIkon = BookOpen/);
  assert.match(serit, /tumuEtiketi = 'Tüm konular'/);
  /* Rehber çağrısı yeni propları geçmiyor; varsayılanlarla çalışıyor. */
  const cagri = rehberMerkezi.slice(rehberMerkezi.indexOf('<KonuSeridi'));
  const govde = cagri.slice(0, cagri.indexOf('/>'));
  assert.doesNotMatch(govde, /birim=|ikonlar=|varsayilanIkon=/);
});

test('FIRSAT ŞERİDİ KATEGORİ SAYIYOR', () => {
  const cagri = firsatlar.slice(firsatlar.indexOf('<KonuSeridi'));
  const govde = cagri.slice(0, cagri.indexOf('/>'));
  assert.match(govde, /birim="fırsat"/);
  assert.match(govde, /ikonlar=\{KATEGORI_IKONLARI\}/);
  assert.match(govde, /tumuEtiketi="Tüm kategoriler"/);
});

test('HER KATEGORİ İÇİN İKON VAR', () => {
  /* Eşleşmeyen kategori yedek ikona düşer ve şeritte iki daire aynı görünür. */
  const harita = firsatlar.slice(
    firsatlar.indexOf('const KATEGORI_IKONLARI'),
    firsatlar.indexOf('const kisaTarih')
  );
  for (const kategori of FIRSAT_KATEGORILERI) {
    assert.match(harita, new RegExp(`'?${kategori}'?:`), `${kategori} için ikon yok`);
  }
});

test('ŞERİT İLE FİLTRE PANELİ AYNI DURUMU PAYLAŞIYOR', () => {
  /*
    Ayrı bir durum tutulsaydı panelden seçilen kaynak şeritte sönük
    kalırdı; aynı hata şehir ve konu şeritlerinde de bilinçle önlenmiş.
  */
  const cagri = firsatlar.slice(firsatlar.indexOf('<KonuSeridi'));
  const govde = cagri.slice(0, cagri.indexOf('/>'));
  assert.match(govde, /secili=\{filters\.kategori\}/);
  assert.match(govde, /onSec=\{\(kategori\) =>/);
  assert.match(govde, /onTumu=\{\(\) => set\(\{ kategori: '', kaynak: '' \}\)\}/);
});

test('KAYDI OLMAYAN KATEGORİ ÇİZİLMİYOR', () => {
  /*
    Tıklayınca boş sonuç veren daire, az seçenek görmekten daha çok güven
    kaybettiriyor — filtre panelindeki kural da bu. Kariyer etkinlikleri
    kategorisi şu an boş (göç notu: kayıt bağlantılı kariyer etkinliği
    sıfır) ve o daire hiç çizilmiyor.
  */
  const hesap = firsatlar.slice(
    firsatlar.indexOf('const seritKategorileri'),
    firsatlar.indexOf('const kaynakSayimlari')
  );
  assert.match(hesap, /\.filter\(\(kategori\) => kategori\.adet > 0\)/);
  assert.match(hesap, /kategoriSayimlari\[id\]/, 'sayılar listeyle aynı kaynaktan gelmeli');
});

test('TAKVİM GÖRÜNÜMÜNDE ŞERİT YOK', () => {
  /*
    Takvimde liste değil ay ay bir görünüm var; kategori süzgeci orada
    durmuyor. Koşul `filters.takvim` değil `takvimGorunumu`: arşivde
    takvim hiç açılmadığı için görünüm süzgeçten türetiliyor
    (takvimGorunumu = filters.takvim && !filters.arsiv) ve şerit orada
    çizilmeye devam ediyor.
  */
  assert.match(firsatlar, /const takvimGorunumu = filters\.takvim && !filters\.arsiv;/);
  assert.match(firsatlar, /\{!takvimGorunumu && listeDurumu === 'ready' && \(\s*<KonuSeridi/);
});
