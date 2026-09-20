import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * İLAN KAYNAK KONTROLÜNÜN İZİ
 *
 * Kontrolün KENDİSİ zaten vardı ve çalışıyordu; bu paket kararın izini
 * saklıyor ve sırayı önceliklendiriyor. Testler o dört alanın gerçekten
 * yazıldığını ve kapatma kuralının GEVŞEMEDİĞİNİ bağlıyor.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const sqlYorumsuz = (m) => m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, ' ');
const jsYorumsuz = (m) => m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const GOC = oku('supabase/migrations/20261022010000_ilan_kaynak_kontrolu_izi.sql');
const ISCI = oku('scripts/ilan-baglanti-kontrol.mjs');
const AKIS = oku('.github/workflows/ilan-baglanti-kontrolu.yml');

/* ------------------------------------------------- 1. DÖRT ALAN */

test('siparişin istediği dört alan şemada ve okunabilir', () => {
  for (const kolon of ['consecutive_failures', 'closed_at', 'closure_reason', 'final_checked_url']) {
    assert.match(GOC, new RegExp(`add column if not exists ${kolon}`), `${kolon} eklenmeli`);
  }
  /*
    42501 DERSİ: `listings` kolon kolon yetki veriyor ve yeni bir kolona
    `grant select` vermeyi unutmak TEK BAŞINA bütün sorguyu düşürüyor —
    bu üretimde bir kez yaşandı ve her ilan "yüklenemedi" oldu.
  */
  assert.match(
    GOC,
    /grant select \(consecutive_failures, closed_at, closure_reason, final_checked_url\)\s*\n\s*on public\.listings to anon, authenticated/
  );
  /* Şirket bu alanlara YAZAMAMALI: insert/update yetkisi verilmiyor. */
  const kod = sqlYorumsuz(GOC);
  assert.ok(
    !/grant (insert|update)[^;]*(closure_reason|consecutive_failures)/.test(kod),
    'inceleme alanlarına yazma yetkisi verilmemeli'
  );
});

test('sayaç negatif olamıyor ve varsayılanı sıfır', () => {
  assert.match(GOC, /consecutive_failures integer not null default 0/);
  assert.match(GOC, /check \(consecutive_failures >= 0\)/);
  /*
    `closed_at` ve `closure_reason` nullable ve VARSAYILANSIZ: kapanmamış
    ilanda boş kalmalı. `default now()` koymak, açık her ilana "şu an
    kapandı" damgası basmak olurdu.
  */
  assert.ok(!/closed_at timestamptz[^,]*default/.test(GOC));
  assert.ok(!/closure_reason text[^,]*default/.test(GOC));
});

/* ------------------------------- 2. KAPATMA KURALI GEVŞEMEDİ */

test('kapatma YALNIZ kesin kanıtla; geçici hata kapatmıyor', () => {
  const kod = jsYorumsuz(ISCI);

  /* Kapanma kararı `kapanmaSebebi()` dönerse veriliyor — o da 404/410/
     workday yönlendirmesi/sayfa metni dışında bir şey döndürmüyor. */
  assert.match(kod, /const sebep = kapanmaSebebi\(yanit, govde\)/);
  assert.match(kod, /if \(sebep\) \{/);
  assert.match(kod, /source_status: 'kapali',\s*\n\s*status: 'closed',/);

  /* Geçici hata dalları `status` alanına HİÇ dokunmuyor. */
  const gecici = kod.slice(kod.indexOf("source_status: 'erisilemedi'"));
  assert.ok(
    !/status: 'closed'/.test(gecici.slice(0, 400)),
    'geçici hata ilanı kapatmamalı'
  );

  /* 403/429/5xx ve zaman aşımı ayrı ayrı sayılıyor ve hepsi erisilemedi. */
  for (const sayac of ['engel403', 'oran429', 'sunucu5xx', 'zamanAsimi', 'agHatasi']) {
    assert.ok(kod.includes(sayac), `${sayac} sayacı kalmalı`);
  }
});

test('kapanma sebebi ve anı saklanıyor; açılınca temizleniyor', () => {
  const kod = jsYorumsuz(ISCI);
  /* Sebep zaten hesaplanıyordu ama konsola yazılıp ATILIYORDU. */
  assert.match(kod, /closure_reason: sebep/);
  assert.match(kod, /closed_at: simdi/);
  /*
    Kanıtlı açık sonuçta kapanma izi TEMİZLENİYOR: ilan bir kez kapanıp
    yeniden açıldıysa eski sebep yanıltıcı olur.
  */
  assert.match(kod, /closure_reason: null/);
  assert.match(kod, /closed_at: null/);
});

/* ------------------------------------------- 3. SAYAÇ DAVRANIŞI */

test('sayaç yalnız geçici hatada artıyor, kanıtlı açıkta sıfırlanıyor', () => {
  const kod = jsYorumsuz(ISCI);
  /* İki geçici dal da (HTTP hatası ve ağ/zaman aşımı) sayacı artırıyor. */
  assert.equal(
    (kod.match(/consecutive_failures: \(ilan\.consecutive_failures \?\? 0\) \+ 1/g) ?? []).length,
    2,
    'hem HTTP hata dalı hem ağ hatası dalı sayacı artırmalı'
  );
  /* Kanıtlı açık ve kapanma dallarında sıfırlanıyor. */
  assert.ok((kod.match(/consecutive_failures: 0/g) ?? []).length >= 2);
});

/* --------------------------------------- 4. ÖNCELİK VE ORAN */

test('sıra önceliklendiriliyor: hiç bakılmamış, çok hata vermiş, yakın tarihli', () => {
  const kod = jsYorumsuz(ISCI);
  assert.match(kod, /\.order\('source_checked_at', \{ ascending: true, nullsFirst: true \}\)/);
  assert.match(kod, /\.order\('consecutive_failures', \{ ascending: false \}\)/);
  /* Son başvurusu yaklaşanlar öne alınıyor. */
  assert.match(kod, /const YAKIN_GUN = 7/);
  assert.match(kod, /ilanlar\.sort\(/);

  /* KAPSAM DEĞİŞMEDİ: hâlâ bütün aktif ilanlar okunuyor. */
  assert.match(
    kod,
    /\.or\('status\.in\.\(published,closed\),and\(status\.eq\.draft,origin\.eq\.scraped\)'\)/
  );
});

test('aynı alan adına art arda istek atılmıyor', () => {
  const kod = jsYorumsuz(ISCI);
  assert.match(kod, /const ALAN_ARALIGI_MS = \d+/);
  assert.match(kod, /await alanSirasiniBekle\(adres\)/);
  /*
    Oran sınırına girmek kendi ölçümümüzü bozuyor: 429 bizim için
    "erişilemedi" demek. Farklı alanlar birbirini beklemiyor.
  */
  assert.match(kod, /alanSonIstek\.set\(kok, Date\.now\(\)\)/);
});

test('yönlendirme sonrası gerçekten okunan adres saklanıyor', () => {
  const kod = jsYorumsuz(ISCI);
  assert.match(kod, /guncelleme\.final_checked_url = yanit\.url \|\| adres/);
  /*
    Genel kariyer sayfasına yönlendiren ilan OTOMATİK AÇIK SAYILMIYOR:
    açık kararı sayfanın kendi kanıtını istiyor (JobPosting şeması,
    kanonik adreste ilan kimliği ya da <h1> başlığı). Kanıt yoksa
    sonuç `belirsiz` ve ilana dokunulmuyor.
  */
  assert.match(kod, /source_status: 'belirsiz'/);
});

/* --------------------------------- 5. BELİRSİZ → YÖNETİCİ */

test('belirsiz kayıtlar yönetici kuyruğunda toplanıyor, anon göremiyor', () => {
  assert.match(GOC, /create or replace view public\.ilan_kaynak_inceleme_kuyrugu/);
  assert.match(GOC, /where l\.source_status = 'belirsiz'/);
  /*
    Görünümler varsayılan olarak SAHİBİ gibi koşar ve RLS'i atlar; bu
    projede `ilan_bildirim_kuyrugu` bir kez tam bu yüzden anon'a sızdı.
  */
  assert.match(GOC, /alter view public\.ilan_kaynak_inceleme_kuyrugu set \(security_invoker = on\)/);
  assert.match(GOC, /revoke all on public\.ilan_kaynak_inceleme_kuyrugu from anon/);
  assert.match(GOC, /grant select on public\.ilan_kaynak_inceleme_kuyrugu to authenticated/);
  /* İkinci bir kuyruk TABLOSU kurulmadı: tek kaynak `listings`. */
  assert.ok(!/create table[^;]*inceleme_kuyrugu/i.test(GOC));
});

/* ------------------------------------------------ 6. ZAMANLAMA */

test('günlük tek zamanlama, ikinci sistem kurulmadı', () => {
  assert.match(AKIS, /cron: "40 4 \* \* \*"/);
  assert.equal((AKIS.match(/cron:/g) ?? []).length, 1, 'tek zamanlama olmalı');
  assert.match(AKIS, /node scripts\/ilan-baglanti-kontrol\.mjs/);
});
