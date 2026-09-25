/**
 * AÇIKLIĞI BELİRSİZ İLANLAR — GÜNLÜK KONTROLE GİRİYOR, YAYINA ÇIKMIYOR
 *
 * Kullanıcının verdiği 15 Almanya ilanının kaynak sayfası açılıyor ama
 * hiçbiri makine-okunur ilan verisi vermiyor (ölçüldü, 15 Eylül 2026):
 * ne JSON-LD ne de resmî bir ATS uç noktası. Bunlar `status='draft'`,
 * `origin='scraped'` olarak kaydediliyor.
 *
 * İki söz burada korunuyor:
 *   1. Taslaklar günlük bağlantı kontrolünde geziliyor — sessizce eskimiyor.
 *   2. Taslak, sayfada başlığı geçse bile yayına ÇIKMIYOR: "sayfa duruyor"
 *      ile "staj açık" aynı iddia değil.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

test('GÜNLÜK BAĞLANTI KONTROLÜ TARAMA TASLAKLARINI DA GEZİYOR', () => {
  const betik = oku('scripts/ilan-baglanti-kontrol.mjs');
  assert.match(
    betik,
    /\.or\('status\.in\.\(published,closed\),and\(status\.eq\.draft,origin\.eq\.scraped\)'\)/,
    'taslak tarama ilanları sorguya girmeli'
  );
  /* İşveren taslakları yönetici onayını bekliyor; otomasyon onlara dokunmaz. */
  assert.match(betik, /origin\.eq\.scraped/);
});

test('YAYINA GERİ ALMA YALNIZ KAPANMIŞ İLAN İÇİN', () => {
  const betik = oku('scripts/ilan-baglanti-kontrol.mjs');
  const yayinaAlma = betik.match(/guncelleme\.status = 'published'/g) ?? [];
  assert.equal(yayinaAlma.length, 1, 'tek bir yayına alma dalı olmalı');
  assert.match(betik, /if \(ilan\.status === 'closed'\) guncelleme\.status = 'published';/);
});

test('AÇIKLIĞI BELİRSİZ İLANLAR TASLAK KALIYOR', () => {
  const promote = oku('automation/promote.py');
  assert.match(promote, /return "draft" if \(raw\.get\("raw"\) or \{\}\)\.get\("aciklik_dogrulanmadi"\) else "published"/);
  assert.match(promote, /"status": ilan_durumu\(raw\),/);
});

test('BELİRSİZ KAYNAKLAR AYRI İŞARETLİ VE DOĞRULANMIŞLARLA KARIŞMIYOR', () => {
  const ham = JSON.parse(oku('automation/sources.json'));
  const liste = Array.isArray(ham) ? ham : Object.values(ham)[0];
  const belirsiz = liste.filter((k) => k.aciklik_dogrulanmadi);
  const ilanSayisi = belirsiz.reduce((a, k) => a + k.urls.length, 0);

  /* 12 Almanya (15 Eylül 2026) + 4 Türkiye (kullanıcı kararı, 26 Eylül 2026). */
  assert.equal(ilanSayisi, 16, 'açıklığı belirsiz 16 ilan');
  for (const k of belirsiz) {
    assert.equal(k.type, 'resmi_ilan_sayfasi', `${k.id} ayrı adaptörü kullanmalı`);
    assert.ok(['DE', 'TR'].includes(k.country), `${k.id} ülkesi açık olmalı`);
    assert.ok(k.company_name, `${k.id} gerçek şirket adı taşımalı`);
    for (const u of k.urls) assert.match(u, /^https:\/\//, `${k.id} resmî bağlantı`);
  }

  /* Doğrulanmış 34 ilan bu işaretten etkilenmiyor. */
  const dogrulanmis = liste.filter((k) => k.country === 'DE' && !k.aciklik_dogrulanmadi);
  const dogrulanmisAdet = dogrulanmis.reduce(
    (a, k) => a + (k.dogrulanmis_ilanlar ?? k.urls ?? []).length,
    0
  );
  assert.equal(dogrulanmisAdet, 34);
});

test('TÜRKİYE KAYNAKLARI BU HATTA YALNIZ ADIYLA ONAYLANANLAR', () => {
  /*
    Kural 15 Eylül 2026'da "Türkiye bu hatta girmez" idi. Kullanıcı kararı
    (26 Eylül 2026): JSON-LD vermeyen 4 resmî Türkiye ilanı taslak olarak
    alınıyor ve yönetici onayıyla yayına çıkıyor. Liste AÇIK: yeni bir
    Türkiye kaynağı bu hatta ancak buraya adıyla eklenerek girebilir.
  */
  const ham = JSON.parse(oku('automation/sources.json'));
  const liste = Array.isArray(ham) ? ham : Object.values(ham)[0];
  const izinli = new Set([
    'barilla-ilan-sayfasi-tr',
    'hyundai-ilan-sayfasi-tr',
    'hilton-ilan-sayfasi-tr',
    'danone-ilan-sayfasi-tr',
  ]);
  for (const k of liste) {
    if ((k.country ?? 'TR') !== 'TR') continue;
    if (k.aciklik_dogrulanmadi || k.type === 'resmi_ilan_sayfasi') {
      assert.ok(izinli.has(k.id), `${k.id} Türkiye kaynağı taslak hattına adıyla onaylanmadan girmemeli`);
      assert.equal(k.aciklik_dogrulanmadi, true, `${k.id} taslak bayrağı taşımalı`);
      assert.ok(k.city_hint, `${k.id} sayfadaki şehri taşımalı`);
    }
  }
});
