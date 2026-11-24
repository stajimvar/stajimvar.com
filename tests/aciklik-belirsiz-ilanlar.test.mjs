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
  const belirsiz = liste.filter((k) => k.aciklik_dogrulanmadi && k.country === 'DE');
  const ilanSayisi = belirsiz.reduce((a, k) => a + k.urls.length, 0);

  assert.equal(ilanSayisi, 13, 'açıklığı belirsiz 13 Almanya ilanı (24 Kasım 2026: kapanan BMW 195753 ve 190132 çıktı; BMW 180706 ve Siemens 500403 girdi)');
  for (const k of liste.filter((x) => x.aciklik_dogrulanmadi)) {
    assert.equal(k.type, 'resmi_ilan_sayfasi', `${k.id} ayrı adaptörü kullanmalı`);
    assert.ok(['DE', 'TR'].includes(k.country), `${k.id} ülkesi`);
    assert.ok(k.company_name, `${k.id} gerçek şirket adı taşımalı`);
    for (const u of k.urls) assert.match(u, /^https:\/\//, `${k.id} resmî bağlantı`);
  }

  /* Doğrulanmış 54 ilan bu işaretten etkilenmiyor (24 Kasım 2026: kapanan Mercedes-Benz 243767 çıktı; +13 — Mercedes-Benz x3, Bosch x2, Allianz GI, DHL, Doctolib, Langdock, Prophet, CRA, Enter, Mercanis). */
  const dogrulanmis = liste.filter((k) => k.country === 'DE' && !k.aciklik_dogrulanmadi);
  const dogrulanmisAdet = dogrulanmis.reduce(
    (a, k) => a + (k.dogrulanmis_ilanlar ?? k.urls ?? []).length,
    0
  );
  assert.equal(dogrulanmisAdet, 54);
});

/*
  TÜRKİYE: YALNIZ ADI YAZILI KAYNAKLAR (1 Kasım 2026)

  Hat kurulurken Türkiye hattı değişmesin diye tamamen kapalıydı. Kullanıcı
  teslimindeki Siemens (8), Amazon (1) ve EY (1) sayfaları ayakta ama
  makine-okunur ilan verisi vermiyor; bu hatta TASLAK olarak giriyorlar ve
  yönetici onayı olmadan yayına çıkmıyorlar. Başka hiçbir Türkiye kaynağı
  bu hatta giremez; listeye ekleme bilinçli bir karar olmalı.
*/
/* 14 Kasım 2026: Baykar 2027 yaz stajları (8) kullanıcı teslimiyle eklendi. */
/* 17 Kasım 2026: Logo, Opet, Anadolu Ajansı (2) ve Fergani 2027 yaz (12) kullanıcı teslimiyle eklendi. */
const TR_BELIRSIZ = new Set([
  'siemens-tr-ilan-sayfasi', 'amazon-tr-ilan-sayfasi', 'ey-tr-ilan-sayfasi', 'baykar-tr-ilan-sayfasi',
  'logo-yazilim-peoplise-ilan-sayfasi', 'opet-kockariyerim-ilan-sayfasi', 'anadolu-ajansi-ajans-staj-ilan-sayfasi',
  'anadolu-ajansi-yurt-staj-ilan-sayfasi', 'fergani-tr-ilan-sayfasi',
]);

test('TÜRKİYE KAYNAKLARI BU HATTA YALNIZ ADIYLA GİRİYOR', () => {
  const ham = JSON.parse(oku('automation/sources.json'));
  const liste = Array.isArray(ham) ? ham : Object.values(ham)[0];
  let trIlan = 0;
  for (const k of liste) {
    if ((k.country ?? 'TR') !== 'TR') continue;
    if (TR_BELIRSIZ.has(k.id)) {
      assert.equal(k.aciklik_dogrulanmadi, true, `${k.id} işaretli olmalı`);
      assert.equal(k.type, 'resmi_ilan_sayfasi');
      trIlan += k.urls.length;
    } else {
      assert.ok(!k.aciklik_dogrulanmadi, `${k.id} Türkiye kaynağı işaretlenmemeli`);
      assert.notEqual(k.type, 'resmi_ilan_sayfasi');
    }
  }
  assert.equal(trIlan, 34);
});

test('başlık title önekinden: h1 site adıysa ilan adı <title>dan alınıyor (Baykar, 14 Kasım 2026)', () => {
  const s = oku('automation/scraper.py');
  assert.match(s, /def ilan_sayfasi_basligi\(html: str, title_oneki: str \| None = None, title_kullan: bool = False\)/);
  assert.match(s, /ilan_sayfasi_basligi\(\s*yanit\.text, config\.get\("baslik_title_oneki"\), config\.get\("baslik_title_kullan"\) is True\s*\)/);
  const ham = JSON.parse(oku('automation/sources.json'));
  const baykar = Object.values(ham)[0].find((k) => k.id === 'baykar-tr-ilan-sayfasi');
  assert.equal(baykar.baslik_title_oneki, 'Baykar Kariyer |');
  assert.equal(baykar.urls.length, 8);
});
