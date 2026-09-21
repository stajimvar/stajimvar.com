import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  HAM_ALANLAR, SOZLUK_SURUMU, hamHash, sehirKarari, turKarari, kaynakKarari,
} from '../scripts/ilan-katalog-dryrun.mjs';
import { IZINLI_KOLONLAR, YASAK_KOLONLAR, ayniMi, kolonKapisi } from '../scripts/ilan-katalog-yaz.mjs';

/**
 * İLAN KATALOĞU SÖZLEŞMESİ
 *
 * Testler sayıları değil KURALLARI bağlıyor: katalog büyüdükçe
 * sayılar değişecek, kurallar değişmemeli.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const GOC_ZAMAN = oku('supabase/migrations/20261025010000_ilan_anlamli_degisiklik_zamani.sql');
const GOC_YAZ = oku('supabase/migrations/20261024010000_ilan_katalog_normalize_yaz.sql');
const GOC_ALAN = oku('supabase/migrations/20261023010000_ilan_katalogu_normalize_alanlar.sql');
const SITEMAP = oku('automation/sitemap.py');

/** SQL yorumları, testin kendi açıklamasıyla eşleşmesin diye ayıklanıyor. */
const sqlYorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, '');
const pyYorumsuz = (s) => s.replace(/^\s*#.*$/gm, '');

/* ------------------------------------------------- 1. KATALOG TANIMI */

test('katalog tanımı: published + son başvurusu geçmemiş', () => {
  const g = sqlYorumsuz(GOC_YAZ);
  assert.match(g, /l\.status = 'published'/);
  assert.match(g, /application_deadline is not null and l\.application_deadline < bugun/);
  /* Ülke katalog tanımının parçası DEĞİL, süzgeç. */
  assert.ok(!/country_code\s*=\s*'TR'/.test(g), 'katalog tanımına ülke gömülmemeli');
});

/* ------------------------------------------- 2. YAZILAN ALANLAR DAR */

test('yalnız altı normalize kolon yazılabiliyor', () => {
  assert.deepEqual([...IZINLI_KOLONLAR].sort(),
    ['apply_url_ok', 'il', 'ilan_tipi', 'ilce', 'kaynak_durumu', 'uzaktan']);
  for (const yasak of ['status', 'closed_at', 'application_method', 'city', 'title', 'source_status', 'apply_url']) {
    assert.ok(YASAK_KOLONLAR.includes(yasak), `${yasak} yasak listede olmalı`);
  }
});

test('kolon kapısı izinsiz alanı reddediyor', () => {
  assert.doesNotThrow(() => kolonKapisi({ il: 'İstanbul', ilan_tipi: 'staj' }));
  assert.throws(() => kolonKapisi({ il: 'İstanbul', status: 'closed' }), /yasak alan: status/);
  assert.throws(() => kolonKapisi({ il: 'İstanbul', bilinmeyen: 1 }), /izinsiz alan: bilinmeyen/);
});

test('RPC update cümlesi status ve closed_at içermiyor', () => {
  const g = sqlYorumsuz(GOC_YAZ);
  const dal = g.slice(g.indexOf('update public.listings l'));
  const govde = dal.slice(0, dal.indexOf('get diagnostics'));
  for (const alan of ['il', 'ilce', 'uzaktan', 'ilan_tipi', 'kaynak_durumu', 'apply_url_ok']) {
    assert.match(govde, new RegExp(`${alan}\\s*=`), `${alan} yazılmalı`);
  }
  assert.ok(!/\bstatus\s*=/.test(govde), 'status yazılmamalı');
  assert.ok(!/closed_at\s*=/.test(govde), 'closed_at yazılmamalı');
  assert.ok(!/application_method\s*=/.test(govde), 'application_method yazılmamalı');
});

/* ------------------------------------------------ 3. HAM VERİ KAPISI */

test('ham hash alan sırası SQL ile birebir aynı', () => {
  /*
    Sıra ayrışırsa iki taraf farklı hash üretir ve kapı HER ZAMAN
    kapalı düşer — yazım sessizce hiç çalışmaz.
  */
  const g = sqlYorumsuz(GOC_YAZ);
  const blok = g.slice(g.indexOf('create or replace function public.ilan_ham_hash'));
  const govde = blok.slice(0, blok.indexOf('$function$;', blok.indexOf('select md5')));
  const sqlSira = [...govde.matchAll(/coalesce\(l\.([a-z_]+)(?:::text)?,\s*''\)/g)].map((m) => m[1]);
  assert.deepEqual(sqlSira, [...HAM_ALANLAR], 'HAM_ALANLAR ile SQL sırası aynı olmalı');
});

test('ham hash içeriğe duyarlı, normalize alanlara duyarsız', () => {
  const temel = {
    id: 'a', status: 'published', application_deadline: null, country_code: 'TR',
    city: 'İstanbul', work_type: 'On-site', application_method: 'external',
    source_status: 'acik', apply_url: 'https://x', title: 'Stajyer', description: 'metin',
  };
  const ilk = hamHash(temel);
  assert.equal(hamHash({ ...temel }), ilk, 'aynı girdi aynı hash');
  assert.notEqual(hamHash({ ...temel, city: 'Ankara' }), ilk, 'city değişimi yakalanmalı');
  assert.notEqual(hamHash({ ...temel, title: 'Başka' }), ilk, 'title değişimi yakalanmalı');
  assert.notEqual(hamHash({ ...temel, source_status: 'belirsiz' }), ilk);
  /* Normalize alanlar ham hash'e GİRMİYOR: kendi yazdığımız değer girdiyi kirletmemeli. */
  assert.equal(hamHash({ ...temel, il: 'İstanbul', ilan_tipi: 'staj' }), ilk);
});

test('RPC üç kapıyı da taşıyor', () => {
  const g = sqlYorumsuz(GOC_YAZ);
  assert.match(g, /Katalog değişmiş/, 'kimlik kapısı');
  assert.match(g, /Ham veri değişmiş/, 'satır bazlı ham hash kapısı');
  assert.match(g, /Katalog parmak izi uyuşmuyor/, 'toplam parmak izi kapısı');
  /* `p_veri_hash` süs alandı, kaldırıldı. */
  assert.ok(!/p_veri_hash/.test(g), 'doğrulanmayan hash parametresi kalmamalı');
  assert.match(g, /p_ham_toplam/);
});

test('idempotentlik: aynı değer yeniden gönderilmiyor', () => {
  const hedef = { il: 'İstanbul', ilce: null, uzaktan: true, ilan_tipi: 'staj', kaynak_durumu: 'acik', apply_url_ok: 'gecerli' };
  assert.equal(ayniMi({ ...hedef }, hedef), true);
  assert.equal(ayniMi({ ...hedef, il: 'Ankara' }, hedef), false);
  assert.equal(ayniMi(undefined, hedef), false);
});

/* ------------------------------------------------- 4. SINIFLANDIRMA */

test('şehir: İstanbul türevleri tek il', () => {
  const ortak = { country_code: 'TR', work_type: 'On-site' };
  for (const ham of ['İstanbul', 'Istanbul', 'Atasehir Istanbul', 'Turkey - Istanbul']) {
    assert.equal(sehirKarari({ ...ortak, city: ham }).il, 'İstanbul', ham);
  }
  assert.equal(sehirKarari({ ...ortak, city: 'Atasehir Istanbul' }).ilce, 'atasehir');
});

test('şehir: kanıt yoksa il uydurulmuyor', () => {
  assert.equal(sehirKarari({ country_code: 'TR', city: null, work_type: 'On-site' }).il, null);
  assert.equal(sehirKarari({ country_code: 'TR', city: 'Baglar Street', work_type: 'On-site' }).il, null);
  /* TR dışı: ham korunur, il NULL — şema Türkiye'ye özgü. */
  assert.equal(sehirKarari({ country_code: 'DE', city: 'Berlin', work_type: 'On-site' }).il, null);
});

test('uzaktan: şehir metnindeki REMOTE şehir sanılmıyor', () => {
  const k = sehirKarari({ country_code: 'DE', city: 'Berlin, DE | Germany (REMOTE)', work_type: 'On-site' });
  assert.equal(k.uzaktan, true);
});

test('tür: staj ve erken kariyer çakışırsa kanıt aranıyor', () => {
  /*
    "Genç Yetenek İş Analisti Stajyer Programı" iki aileye birden
    uyuyor. Sıraya güvenip birini seçmek, kural sırasının kaydın
    gerçeğinden daha belirleyici olması demekti.
  */
  const cakisan = { title: 'Genç Yetenek İş Analisti Stajyer Programı', description: '' };
  assert.equal(turKarari(cakisan).ilan_tipi, null);
  assert.match(turKarari(cakisan).gerekce, /inceleme adayı/);

  const kanitli = { ...cakisan, description: 'Zorunlu staj kapsamında staj sözleşmesi düzenlenir.' };
  assert.equal(turKarari(kanitli).ilan_tipi, 'staj');
});

test('tür: MT ve erken kariyer varsayılan staj listesine sızmıyor', () => {
  assert.equal(turKarari({ title: 'Satın Alma Yönetici Adayı (MT)' }).ilan_tipi, 'mt');
  assert.equal(turKarari({ title: 'Erken Kariyer Programı — Servis Satış' }).ilan_tipi, 'erken_kariyer');
  assert.equal(turKarari({ title: 'IT Systems Trainee' }).ilan_tipi, 'trainee');
  assert.equal(turKarari({ title: 'Yazılım Stajyeri' }).ilan_tipi, 'staj');
  assert.equal(turKarari({ title: 'Uzun Dönem Stajyer' }).ilan_tipi, 'uzun_donem');
});

test('tür: kanıt yoksa NULL, uydurulmuyor', () => {
  const k = turKarari({ title: 'F&A Asistanı (Geçici)', description: 'Finans ekibine destek.' });
  assert.equal(k.ilan_tipi, null);
  assert.equal(k.aksiyon, 'etiket');
});

test('kaynak durumu: erisilemedi belirsize katlanmıyor', () => {
  assert.equal(kaynakKarari({ source_status: 'acik' }).kaynak_durumu, 'acik');
  assert.equal(kaynakKarari({ source_status: 'belirsiz' }).kaynak_durumu, 'belirsiz');
  assert.equal(kaynakKarari({ source_status: 'erisilemedi' }).kaynak_durumu, 'erisilemedi');
  /* `kapali` kayıt durumudur; doğrulama alanına zorla katılmıyor. */
  assert.equal(kaynakKarari({ source_status: 'kapali' }).kaynak_durumu, null);
  assert.equal(kaynakKarari({ source_status: null }).kaynak_durumu, null);
});

test('sözlük sürümü kurallarla birlikte ilerlemiş', () => {
  assert.ok(SOZLUK_SURUMU >= 2, 'K1-K3 kararları sürüm 2 ile geldi');
});

/* --------------------------------------- 5. ZAMAN DAMGASI SÖZLEŞMESİ */

test('lastmod updated_at değil content_updated_at üzerinden', () => {
  const p = pyYorumsuz(SITEMAP);
  const dal = p.slice(p.indexOf('for ilan in ilanlar'));
  const govde = dal.slice(0, dal.indexOf('for firsat in'));
  assert.match(govde, /ilan\.get\("content_updated_at"\)/);
  assert.ok(!/ilan\.get\("updated_at"\)/.test(govde), 'ilan lastmod artık updated_at okumamalı');
  /* Yedek: alan boşsa sayfanın var olduğu ilk an; uydurma tarih yok. */
  assert.match(govde, /or ilan\.get\("created_at"\)/);
  assert.match(p, /content_updated_at,created_at/);
});

test('normalize alanlar zaman damgalarını ilerletmiyor', () => {
  const g = sqlYorumsuz(GOC_ZAMAN);
  assert.match(g, /listings_normalize_alanlari/);
  const blok = g.slice(g.indexOf('function public.listings_normalize_alanlari'));
  const liste = blok.slice(0, blok.indexOf('$function$;'));
  for (const alan of IZINLI_KOLONLAR) {
    assert.match(liste, new RegExp(`'${alan}'`), `${alan} normalize listesinde olmalı`);
  }
  /* Kaynak doğrulama ve link kontrolü anlamlı sayılmıyor. */
  const anlamli = g.slice(g.indexOf('function public.listings_anlamli_alanlar'));
  const anlamliListe = anlamli.slice(0, anlamli.indexOf('$function$;'));
  for (const alan of ['source_status', 'source_verified_at', 'closed_at', 'last_seen_at', 'apply_url_ok']) {
    assert.ok(!new RegExp(`'${alan}'`).test(anlamliListe), `${alan} anlamlı sayılmamalı`);
  }
  for (const alan of ['title', 'description', 'status', 'application_deadline', 'apply_url', 'application_method']) {
    assert.match(anlamliListe, new RegExp(`'${alan}'`), `${alan} anlamlı olmalı`);
  }
});

test('genel touch_updated_at fonksiyonuna dokunulmuyor', () => {
  const g = sqlYorumsuz(GOC_ZAMAN);
  assert.ok(!/function public\.touch_updated_at/.test(g), 'genel fonksiyon değiştirilmemeli');
  assert.match(g, /drop trigger if exists t4 on public\.listings/);
  /* Ad korunuyor: aynı zamanlamada tetikleyiciler alfabetik çalışıyor. */
  assert.match(g, /create trigger t4/);
});

test('geçmiş uydurulmuyor: content_updated_at created_at ile dolduruldu', () => {
  const g = sqlYorumsuz(GOC_ZAMAN);
  assert.match(g, /set content_updated_at = created_at/);
  assert.ok(!/content_updated_at\s*=\s*updated_at/.test(g), 'kirlenmiş updated_at kopyalanmamalı');
  assert.ok(!/content_updated_at\s*=\s*posted_at/.test(g), 'kaynağın tarihi sayfanın tarihi değil');
});

test('geri doldurma YENİ tetikleyiciden SONRA çalışıyor', () => {
  /*
    İlk yazımda geri doldurma dosyanın başındaydı, yani ESKİ genel
    tetikleyici hâlâ bağlıyken koşuyordu. Ölçüldü (yerelde eski
    tetikleyici geri kurularak): yalnız `content_updated_at` yazan bir
    UPDATE bile `updated_at`'i ilerletiyor. Göç o hâliyle üretimde 237
    satırın `updated_at` değerini yeniden kirletecekti — düzeltmeye
    çalıştığı hatanın aynısını tekrarlayarak.

    Sıra bu testle bağlanıyor: tetikleyici kurulumu geri doldurmadan
    ÖNCE gelmeli.
  */
  const g = sqlYorumsuz(GOC_ZAMAN);
  const tetikleyici = g.indexOf('create trigger t4');
  const doldurma = g.indexOf('set content_updated_at = created_at');
  assert.ok(tetikleyici > 0, 'tetikleyici kurulmalı');
  assert.ok(doldurma > 0, 'geri doldurma olmalı');
  assert.ok(tetikleyici < doldurma, 'geri doldurma yeni tetikleyiciden sonra olmalı');
});

test('açık content_updated_at yazımı tetikleyici tarafından geri alınmıyor', () => {
  /*
    Sıra düzeltilince yeni bir tuzak çıktı: geri doldurma yalnız
    `content_updated_at` yazıyor, bu alan "anlamlı" listede değil ve
    tetikleyici onu `old` değerine — yani NULL'a — döndürürdü. Alan
    hiç dolmazdı. Açık yazım saygı görüyor.
  */
  const g = sqlYorumsuz(GOC_ZAMAN);
  assert.match(
    g,
    /elsif new\.content_updated_at is distinct from old\.content_updated_at then/,
    'açık yazım dalı olmalı',
  );
});

/* ------------------------------------------------------- 6. YETKİLER */

test('yeni kolonlar okunabiliyor ama yazılamıyor', () => {
  const alan = sqlYorumsuz(GOC_ALAN);
  assert.match(alan, /grant select \(il, ilce, uzaktan, ilan_tipi, kaynak_durumu, apply_url_ok\)/);
  assert.ok(!/grant (insert|update)[^;]*on public\.listings to (anon|authenticated)/.test(alan));
  const zaman = sqlYorumsuz(GOC_ZAMAN);
  assert.match(zaman, /grant select \(content_updated_at\) on public\.listings/);
});

test('yazma RPCsi anon ve authenticated için kapalı', () => {
  const g = sqlYorumsuz(GOC_YAZ);
  assert.match(g, /revoke all on function public\.ilan_katalog_normalize_yaz[^;]*from anon/);
  assert.match(g, /revoke all on function public\.ilan_katalog_normalize_yaz[^;]*from authenticated/);
  assert.match(g, /grant execute on function public\.ilan_katalog_normalize_yaz[^;]*to service_role/);
});
