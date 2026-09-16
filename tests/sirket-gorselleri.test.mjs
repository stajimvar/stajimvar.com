/**
 * ŞİRKET KART GÖRSELİ — NE YAYIMLANIR, NE YAYIMLANMAZ
 *
 * İlan kartında şirket logosunun yanında ikinci bir yatay görsel var.
 * Bu dosya o görselin KAYNAĞINI bağlıyor; düzeni değil.
 *
 * ÜÇ KURAL
 * --------
 * 1. Kullanım hakkı doğrulanmamış görsel yayımlanmıyor. Codex'in
 *    topladığı 93 dosyanın hepsi `unknown_do_not_publish_without_review`
 *    ve incelendiğinde çoğunun fotoğraf bile olmadığı görüldü: FedEx
 *    dosyası mor zeminli LOGO kartı (og:image), JTI dosyası 9600×1040
 *    pazarlama afişi. İkisi de kartın yanına konacak "şirket görseli"
 *    değil.
 * 2. Üretilmiş görsel GERÇEK OFİS GİBİ SUNULMUYOR. Kart onu
 *    "Temsili görsel" diye söylüyor — hem gözle hem ekran okuyucuya.
 * 3. Aynı şirketin bütün ilanlarında aynı görsel. Eşleme ŞİRKET
 *    slug'ına bağlı, ilana değil.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  SIRKET_GORSELLERI,
  sirketGorseli,
} from '../src/data/sirket-gorselleri.ts';

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const manifest = JSON.parse(oku('public/ilan-gorselleri/manifest.json'));

test('yalnız kullanım hakkı açık görseller yayımlanıyor', () => {
  const yasakli = manifest.companies
    .filter((s) => s.photo?.rights === 'unknown_do_not_publish_without_review')
    .map((s) => s.slug);
  assert.ok(yasakli.length > 0, 'manifestte incelenmemiş dosya var');
  for (const slug of yasakli) {
    assert.equal(
      sirketGorseli(slug),
      null,
      `${slug}: kullanım hakkı doğrulanmadan yayımlanamaz`
    );
  }
});

test('üretilmiş görseller TEMSİLİ olarak işaretli', () => {
  const uretilmis = manifest.companies.filter(
    (s) => s.photo?.rights === 'generated_by_openai'
  );
  assert.ok(uretilmis.length > 0);
  for (const s of uretilmis) {
    const gorsel = sirketGorseli(s.slug);
    assert.ok(gorsel, `${s.slug}: üretilmiş görsel eşlenmeli`);
    assert.equal(gorsel.tur, 'temsili', `${s.slug}: tür temsili olmalı`);
  }
});

test('kart türevi küçük: sayfa ağırlaşmıyor', () => {
  /*
    Ham üretim dosyaları 29 görselde 54,9 MB (tanesi ~1,9 MB) ve kartta
    en fazla 168 piksel görünüyorlar. Yayına 480 piksellik WebP türevi
    giriyor; her biri 100 KB altında.
  */
  for (const [slug, gorsel] of Object.entries(SIRKET_GORSELLERI)) {
    const dosya = path.join(KOK, 'public', gorsel.yol.replace(/^\//, ''));
    const kb = existsSync(dosya) ? statSync(dosya).size / 1024 : Infinity;
    assert.ok(kb < 100, `${slug}: kart görseli ${Math.round(kb)}KB — 100KB altı olmalı`);
  }
});

test('her eşlemenin dosyası gerçekten var', () => {
  for (const [slug, gorsel] of Object.entries(SIRKET_GORSELLERI)) {
    assert.match(gorsel.yol, /^\/ilan-gorselleri\/kart\/.+\.webp$/, `${slug}: yayına giren dosya kart türevi olmalı`);
    assert.ok(
      existsSync(path.join(KOK, 'public', gorsel.yol.replace(/^\//, ''))),
      `${slug}: dosya yok (${gorsel.yol})`
    );
  }
});

test('logo dosyası şirket görseli olarak kullanılmıyor', () => {
  /*
    Yedi şirkette "fotoğraf" ile logo AYNI dosya (aynı sha256): kaynak
    sayfanın og:image'i logo kartıydı. Kartta logo zaten solda duruyor;
    aynı görseli sağa ikinci kez koymak bilgi taşımaz.
  */
  const ayni = manifest.companies.filter(
    (s) => s.photo && s.logo && s.photo.sha256 === s.logo.sha256
  );
  for (const s of ayni) {
    assert.equal(sirketGorseli(s.slug), null, `${s.slug}: logo, şirket görseli değil`);
  }
});

test('aynı şirketin bütün ilanları aynı görseli alıyor', () => {
  /* Eşleme şirket slug'ına bağlı; ilan kimliği hiç geçmiyor. */
  const kaynak = oku('src/data/sirket-gorselleri.ts');
  assert.doesNotMatch(kaynak, /listingId|ilanId/);
  const cokIlanli = manifest.companies.find((s) => (s.listings?.length ?? 0) > 1);
  if (cokIlanli) {
    const g = sirketGorseli(cokIlanli.slug);
    for (const _ of cokIlanli.listings) {
      assert.deepEqual(sirketGorseli(cokIlanli.slug), g);
    }
  }
});

test('bilinmeyen şirkette görsel yok — uydurma eşleme olmuyor', () => {
  assert.equal(sirketGorseli('boyle-bir-sirket-yok'), null);
  assert.equal(sirketGorseli(undefined), null);
  assert.equal(sirketGorseli(''), null);
});

test('ilan kartında şirket/ofis fotoğrafı yok', () => {
  /*
    İkili görselli kart denendi ve onaylanan tasarımda kaldırıldı: kart
    yalnız büyük şirket logosunu taşıyor. Eşleme ve kart türevleri depoda
    duruyor (ileride başka bir yüzeyde kullanılabilir) ama ilan kartı
    onları okumuyor.
  */
  const kart = oku('src/components/InternshipCard.tsx');
  assert.doesNotMatch(kart, /sirket-gorselleri|sirketGorseli|kartGorseli/);
});
