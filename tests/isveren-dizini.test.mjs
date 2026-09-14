import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DIZIN_ULKESI,
  baglantiEtiketi,
  dizini,
  isvereniBirlestir,
  programDurumMetni,
  ulkeUygunMu,
  urlDurumMetni,
  uygunIsverenler,
} from '../src/lib/isveren-dizini.mjs';
import { programKarari, programlariOku, urlKarari } from '../scripts/isveren-kariyer-kontrol.mjs';

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const yorumsuz = (m) => m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const GOC = oku('supabase/migrations/20261006010000_isveren_kariyer_kontrolleri.sql');
const ISCI = oku('scripts/isveren-kariyer-kontrol.mjs');
const AKIS = oku('.github/workflows/ilan-baglanti-kontrolu.yml');
const VERI = oku('src/data/stajProgramlari.ts');

/* ------------------------------------------------ İKİ AYRI DURUM */

test('HTTP 200 açık program üretmiyor', () => {
  /*
    Bağlantının çalışması ile staj programının açık olması İKİ AYRI
    iddia. 200 dönen bir kariyer sayfası, o an başvuru alındığını
    göstermiyor.
  */
  assert.equal(urlKarari(200), 'calisiyor');
  /* Aynı gövde program kanıtı taşımıyorsa sonuç bilinmiyor. */
  const karar = programKarari('<html><body><h1>Kariyer</h1><p>Bize katıl</p></body></html>');
  assert.equal(karar.durum, 'bilinmiyor');
  assert.equal(karar.kanit, 'kanit-yok');
});

test('gerçek açık program doğru işaretleniyor', () => {
  const karar = programKarari(
    '<p>Yaz staj programımıza başvuru formu üzerinden başvurun.</p>'
  );
  assert.equal(karar.durum, 'acik');
  assert.equal(karar.kanit, 'staj-programi-ve-basvuru-yolu');
  /* Program ifadesi var ama başvuru yolu yok: AÇIK DEMEYE YETMEZ. */
  const yarim = programKarari('<p>Uzun dönem staj programımız hakkında bilgi</p>');
  assert.equal(yarim.durum, 'bilinmiyor');
  assert.equal(yarim.kanit, 'program-ifadesi-var-basvuru-yolu-yok');
});

test('açık kapanış kanıtı Kapalı üretiyor', () => {
  for (const govde of [
    '<p>Staj programı başvurularımız kapandı.</p>',
    '<p>Başvuru dönemi sona erdi</p>',
    '<p>Applications are closed for our internship program</p>',
    '<p>Son başvuru tarihi geçti</p>',
  ]) {
    const k = programKarari(govde);
    assert.equal(k.durum, 'kapali', govde);
    assert.equal(k.kanit, 'basvuru-kapandi-ifadesi');
  }
  /*
    KAPANIŞ ÖNCE BAKILIYOR: "başvurularımız kapandı" cümlesi içinde
    "başvuru" da geçiyor ve başvuru yolu kalıbı onu aktif bir yol
    sanardı.
  */
  const kod = yorumsuz(ISCI);
  const fn = kod.slice(kod.indexOf('export function programKarari'));
  assert.ok(
    fn.indexOf('KAPANIS_IFADESI.test') < fn.indexOf('PROGRAM_IFADESI.test'),
    'kapanış kontrolü önce olmalı'
  );
});

test('403/429/5xx ve zaman aşımı program durumunu bozmuyor', () => {
  assert.equal(urlKarari(403), 'gecici_hata');
  assert.equal(urlKarari(429), 'gecici_hata');
  assert.equal(urlKarari(503), 'gecici_hata');
  assert.equal(urlKarari(404), 'bozuk');
  assert.equal(urlKarari(410), 'bozuk');

  /*
    Program alanlarına yalnız `calisiyor` dalında dokunuluyor; geçici
    hatada mevcut karar ve kanıt aynen taşınıyor.
  */
  const kod = yorumsuz(ISCI);
  assert.match(kod, /if \(urlDurumu === 'calisiyor'\) \{/);
  const hazir = kod.slice(kod.indexOf('let program = {'), kod.indexOf("if (urlDurumu === 'calisiyor')"));
  assert.match(hazir, /program_durumu: eski\?\.program_durumu \?\? null/);
  /* Zaman aşımı 0 durum kodu üretiyor ve geçici sayılıyor. */
  assert.match(kod, /cevap\.durum === 0 \? 'gecici_hata' : urlKarari\(cevap\.durum\)/);
});

test('belirsiz sonuç mevcut kararı kanıtsız değiştirmiyor', () => {
  const kod = yorumsuz(ISCI);
  assert.match(kod, /if \(karar\.durum === 'bilinmiyor' && eski\?\.program_durumu\)/);
  /* Karar korunuyor ama KANIT TÜRÜ güncelleniyor: ne gördüğümüz belli. */
  assert.match(kod, /program_durumu: eski\.program_durumu,\s*\n?\s*program_kaniti: karar\.kanit/);
});

test('URL durumu ile program durumu ayrı kolonlarda', () => {
  assert.match(GOC, /create type public\.isveren_url_durumu as enum \(\s*'calisiyor',\s*'gecici_hata',\s*'bozuk'\s*\)/);
  assert.match(GOC, /create type public\.isveren_program_durumu as enum \(\s*'acik',\s*'kapali',\s*'bilinmiyor'\s*\)/);
  for (const kolon of [
    'url_durumu',
    'url_denendi_at',
    'url_basarili_at',
    'url_hata',
    'program_durumu',
    'program_kaniti',
    'program_kontrol_at',
  ]) {
    assert.ok(GOC.includes(kolon), `${kolon} kolonu olmalı`);
  }
  /* Son deneme ile son BAŞARILI kontrol ayrı; başarısızda korunuyor. */
  assert.match(ISCI, /urlDurumu === 'calisiyor' \? simdi : \(eski\?\.url_basarili_at \?\? null\)/);
});

/* --------------------------------------- EDİTORYAL / ÖLÇÜM AYRIMI */

test('işçi editoryal kaynak dosyayı YAZMIYOR', () => {
  /*
    Eski betik (`isveren-baglanti-kontrol.mjs`) çıktısını doğrudan
    `src/data/stajProgramlari.ts` içine yazıyordu: her günlük ölçüm
    editoryal kaynağı değiştiriyor ve insan yazısıyla makine çıktısı
    aynı diff'e giriyordu.
  */
  const kod = yorumsuz(ISCI);
  assert.ok(!/writeFileSync/.test(kod), 'işçi dosya yazmamalı');
  assert.match(kod, /from\('employer_career_checks'\)/);
  /* Liste kaynağı hâlâ editoryal dosya: ikinci dizin yok. */
  assert.match(kod, /readFileSync\(VERI/);
  assert.equal(programlariOku(VERI).length, 44, 'dizin 44 kayıt');
});

test('kontrol idempotent: upsert, anahtar slug', () => {
  assert.match(ISCI, /\.upsert\(/);
  assert.match(ISCI, /\{ onConflict: 'slug' \}/);
  assert.match(GOC, /slug text primary key/);
});

test('istemci ölçüm yazamıyor, okuyabiliyor', () => {
  assert.match(GOC, /alter table public\.employer_career_checks enable row level security/);
  const politikalar = [
    ...GOC.matchAll(/create policy "[^"]+" on public\.employer_career_checks\s+for (\w+)/g),
  ].map((m) => m[1]);
  assert.deepEqual([...new Set(politikalar)], ['select'], 'yalnız okuma politikası');
  const tipler = oku('src/lib/database.types.ts');
  const blok = tipler.slice(tipler.indexOf('employer_career_checks: {'));
  assert.match(blok.slice(0, 1600), /Insert: Record<string, never>/);
});

test('işçi mevcut altyapıda, ikinci zamanlama yok', () => {
  assert.match(AKIS, /run: node scripts\/isveren-kariyer-kontrol\.mjs/);
  /* Tek cron: ilan kontrolüyle aynı iş akışı. */
  assert.equal((AKIS.match(/cron:/g) || []).length, 1);
  /* Bir ölçümün düşmesi ötekini durdurmuyor. */
  assert.match(AKIS, /if: always\(\)/);
});

test('güvenli URL kuralları ve sınırlı eşzamanlılık', () => {
  assert.match(ISCI, /from '\.\.\/src\/lib\/guvenli-url\.mjs'/);
  assert.match(ISCI, /const guvenli = guvenliDisAdres\(kayit\.adres\)/);
  assert.match(ISCI, /const ESZAMANLI = 4/);
  assert.match(ISCI, /AbortSignal\.timeout\(ZAMAN_ASIMI_MS\)/);
  /* Engel aşılmıyor: tek User-Agent, başka yol denenmiyor. */
  assert.equal((ISCI.match(/'User-Agent'/g) || []).length, 1);
});

test('hata nedeni güvenli: sayfa içeriği ve kişisel veri yok', () => {
  const kod = yorumsuz(ISCI);
  /* Kaydedilen şey durum kodu ya da kısa ağ hatası. */
  assert.match(kod, /`HTTP \$\{cevap\.durum\}`/);
  assert.match(kod, /\.slice\(0, 120\)/);
  /* Gövde hiçbir yere yazılmıyor. */
  assert.ok(!/govde: cevap\.govde/.test(kod));
  assert.ok(!/program_kaniti: metin/.test(kod), 'kanıt türü saklanıyor, içerik değil');
  /* Kanıt türleri sabit etiketler. */
  for (const etiket of [
    'staj-programi-ve-basvuru-yolu',
    'basvuru-kapandi-ifadesi',
    'program-ifadesi-var-basvuru-yolu-yok',
    'kanit-yok',
  ]) {
    assert.ok(ISCI.includes(etiket), `${etiket} kanıt türü olmalı`);
  }
});

/* ------------------------------------------- TEK VERİ SÖZLEŞMESİ */

const PROGRAM = {
  slug: 'a',
  isveren: 'A Holding',
  sektor: 'Holding',
  kariyerUrl: 'https://a.example/kariyer',
  ozet: 'özet',
  bolumler: ['bilgisayar-muhendisligi'],
};

test('editoryal bilgi ile ölçüm tek sözleşmede birleşiyor', () => {
  const birlesik = isvereniBirlestir(
    PROGRAM,
    {
      slug: 'a',
      url_durumu: 'calisiyor',
      url_denendi_at: '2026-09-14T10:00:00Z',
      url_basarili_at: '2026-09-14T10:00:00Z',
      url_hata: null,
      program_durumu: 'acik',
      program_kaniti: 'staj-programi-ve-basvuru-yolu',
      program_kontrol_at: '2026-09-14T10:00:00Z',
    },
    { slug: 'a', logo_url: 'https://cdn.example/a.png' }
  );
  assert.equal(birlesik.isveren, 'A Holding');
  assert.equal(birlesik.urlDurumu, 'calisiyor');
  assert.equal(birlesik.programDurumu, 'acik');
  assert.equal(birlesik.logoUrl, 'https://cdn.example/a.png');
  assert.equal(birlesik.ulke, DIZIN_ULKESI);

  /* Ölçüm yoksa program durumu BİLİNMİYOR, logo null — uydurulmuyor. */
  const olcumsuz = isvereniBirlestir(PROGRAM, undefined, undefined);
  assert.equal(olcumsuz.programDurumu, 'bilinmiyor');
  assert.equal(olcumsuz.logoUrl, null);
  /* Belge / ücret / sigorta kaynakta yoksa boş — üretilmiyor. */
  assert.deepEqual(olcumsuz.gerekliBelgeler, []);
  assert.equal(olcumsuz.ucretSigortaNotu, null);
  assert.equal(olcumsuz.genelBasvuruDonemi, null);
});

test('tek toplu okuma: kart başına sorgu yok', () => {
  const d = dizini([PROGRAM], [{ slug: 'a', program_durumu: 'kapali' }], []);
  assert.equal(d.length, 1);
  assert.equal(d[0].programDurumu, 'kapali');
  /* Modül veri katmanına hiç dokunmuyor. */
  const MODUL = oku('src/lib/isveren-dizini.mjs');
  assert.ok(!/supabase|fetch\(|rest\/v1/.test(MODUL));
  /* Sorgu katmanı tek `select` ile bütün kontrolleri alıyor. */
  const SORGU = oku('src/lib/queries/index.ts');
  assert.match(SORGU, /export async function fetchIsverenKontrolleri/);
  assert.match(SORGU, /\.from\('employer_career_checks'\)/);
});

test('metinler: açık ilan ya da başvur demiyor', () => {
  assert.equal(programDurumMetni('acik'), 'Staj programı açık');
  assert.equal(programDurumMetni('kapali'), 'Staj programı kapalı');
  assert.equal(programDurumMetni('bilinmiyor'), 'Güncel açık program doğrulanamadı');
  assert.equal(programDurumMetni(null), 'Güncel açık program doğrulanamadı');
  assert.equal(urlDurumMetni('calisiyor'), 'Bağlantı çalışıyor');
  assert.equal(urlDurumMetni('gecici_hata'), 'Geçici olarak erişilemedi');
  assert.equal(urlDurumMetni('bozuk'), 'Bağlantı bozuk');
  assert.equal(urlDurumMetni(null), null);
  /* Genel sayfa etiketi: "Başvur" ya da "Açık ilan" DEĞİL. */
  assert.equal(baglantiEtiketi(), 'Şirketin kariyer sayfası');
  const MODUL = oku('src/lib/isveren-dizini.mjs');
  const kod = yorumsuz(MODUL);
  assert.ok(!kod.includes('Başvur'), 'modül "Başvur" demiyor');
  assert.ok(!kod.includes('Açık ilan'), 'modül "Açık ilan" demiyor');
});

test('ülke ve bölüm uygunluğu korunuyor', () => {
  const d = dizini([PROGRAM], [], []);
  assert.equal(ulkeUygunMu('all'), true);
  assert.equal(ulkeUygunMu('TR'), true);
  assert.equal(ulkeUygunMu('FR'), false);
  assert.equal(ulkeUygunMu('remote'), false);
  assert.deepEqual(uygunIsverenler(d, { country: 'FR' }), []);
  assert.equal(uygunIsverenler(d, { country: 'TR' }).length, 1);
  /* TAM slug eşleşmesi: alt dize değil. */
  assert.equal(
    uygunIsverenler(d, { country: 'all', departments: ['bilgisayar-muhendisligi'] }).length,
    1
  );
  assert.equal(uygunIsverenler(d, { country: 'all', departments: ['bilgisayar'] }).length, 0);
  assert.equal(uygunIsverenler(d, { country: 'all', departments: ['hukuk'] }).length, 0);
});

test('genel başvuru dönemi eski dönem tarihi gibi sunulmuyor', () => {
  const MODUL = oku('src/lib/isveren-dizini.mjs');
  /* Alan adı bilerek "genel": güncel dönemin tarihi değil. */
  assert.match(MODUL, /genelBasvuruDonemi/);
  assert.match(MODUL, /GENEL BAŞVURU DÖNEMİ — GEÇMİŞ DÖNEMLERDEN TÜRETİLMİŞ/);
  /* Editoryal dosyada uydurma dönem yok: hiçbir kayıtta alan dolu değil. */
  assert.ok(!/genelBasvuruDonemi/.test(VERI), 'kaynakta doğrulanmamış dönem yazılmamış');
});
