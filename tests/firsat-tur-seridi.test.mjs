import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { OPPORTUNITY_TYPE_LABELS } from '../src/lib/opportunity-domain.mjs';

/*
  FIRSAT TÜRÜ ŞERİDİ

  Rehber ve Keşfet'te tür/konu/şehir seçimi bir daire şeridiyle yapılıyor;
  fırsatlarda aynı seçim yalnızca filtre panelinin içindeydi ve panel
  kapalıyken hangi türlerin OLDUĞUNU göstermiyordu.

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

test('FIRSAT ŞERİDİ "fırsat" SAYIYOR', () => {
  const cagri = firsatlar.slice(firsatlar.indexOf('<KonuSeridi'));
  const govde = cagri.slice(0, cagri.indexOf('/>'));
  assert.match(govde, /birim="fırsat"/);
  assert.match(govde, /ikonlar=\{TUR_IKONLARI\}/);
  assert.match(govde, /tumuEtiketi="Tüm türler"/);
});

test('HER TÜR İÇİN İKON VAR', () => {
  /* Eşleşmeyen tür yedek ikona düşer ve şeritte iki daire aynı görünür. */
  const harita = firsatlar.slice(firsatlar.indexOf('const TUR_IKONLARI'), firsatlar.indexOf('type Sekme'));
  for (const tur of Object.keys(OPPORTUNITY_TYPE_LABELS)) {
    assert.match(harita, new RegExp(`\\b${tur}:`), `${tur} için ikon yok`);
  }
});

test('ŞERİT İLE FİLTRE PANELİ AYNI DURUMU PAYLAŞIYOR', () => {
  /*
    Ayrı bir durum tutulsaydı panelden seçilen tür şeritte sönük kalırdı;
    aynı hata şehir ve konu şeritlerinde de bilinçle önlenmiş.
  */
  const cagri = firsatlar.slice(firsatlar.indexOf('<KonuSeridi'));
  const govde = cagri.slice(0, cagri.indexOf('/>'));
  assert.match(govde, /secili=\{filters\.type\}/);
  assert.match(govde, /onSec=\{\(tur\) => set\(\{ type: tur \}\)\}/);
  assert.match(govde, /onTumu=\{\(\) => set\(\{ type: '' \}\)\}/);
});

test('KAYDI OLMAYAN TÜR ÇİZİLMİYOR', () => {
  /*
    Tıklayınca boş sonuç veren daire, az seçenek görmekten daha çok güven
    kaybettiriyor — filtre panelindeki kural da bu (adet === 0 gizleniyor).
    Ölçüldü (canlı): 32 kayıtlık taban için şeritte üç daire çıkıyor
    (Tümü 32, Burs 27, Yurtdışı 5); KYK ve Yarışma o tabanda sıfır.
  */
  const hesap = firsatlar.slice(firsatlar.indexOf('const seritTurleri'), firsatlar.indexOf('const yarinKapananlar'));
  assert.match(hesap, /\.filter\(\(tur\) => tur\.adet > 0\)/);
  assert.match(hesap, /sayimlar\.tur\[id\]/, 'sayılar filtre paneliyle aynı kaynaktan gelmeli');
  assert.match(hesap, /b\.adet - a\.adet/, 'çoktan aza sıralanmalı');
});

test('TAKVİM GÖRÜNÜMÜNDE ŞERİT YOK', () => {
  /* Takvimde liste değil ay ay bir görünüm var; tür süzgeci orada durmuyor. */
  assert.match(firsatlar, /\{sekme !== 'takvim' && state === 'ready' && \(\s*<KonuSeridi/);
});
