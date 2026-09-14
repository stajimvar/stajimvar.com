import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FILTRE_SURUMU,
  OZET_ILAN_SINIRI,
  RIZA_METNI,
  aramaAdresine,
  aramaEslesiyorMu,
  adresTenFiltreler,
  filtreBosMu,
  filtreleriDogrula,
  ilaniNormalize,
  ozetSiralamasi,
  turkiyeGunu,
  turkiyeSaati,
} from '../src/lib/kayitli-arama.mjs';

/**
 * KAYITLI ARAMA + GÜNLÜK ÖZET
 *
 * Eşleşme kuralları GERÇEKTEN çalıştırılıyor; kalanlar (RLS, kuyruk,
 * idempotency) kolay bozulan yerlerinden bağlanıyor.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const yorumsuz = (m) => m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const GOC = oku('supabase/migrations/20261003010000_kayitli_arama.sql');
const ISCI = oku('scripts/gunluk-ozet.mjs');
const AKIS = oku('.github/workflows/gunluk-ozet.yml');
const ABONELIK = oku('functions/api/ozet-aboneligi.ts');
const KAYDET = oku('src/components/AramayiKaydet.tsx');
const AYARLAR = oku('src/components/KayitliAramalar.tsx');
const LISTE = oku('src/components/MatchedInternshipsView.tsx');

const ilan = (ek = {}) =>
  ilaniNormalize({
    id: 'a1',
    title: 'Yazılım Stajyeri',
    company_name: 'Örnek A.Ş.',
    city: 'İstanbul',
    work_type: 'On-site',
    country_code: 'TR',
    is_paid: null,
    mandatory_staj_accepted: true,
    voluntary_staj_accepted: true,
    department: 'Bilgisayar Mühendisliği',
    description: 'React ile arayüz geliştirme',
    required_skills: ['React'],
    status: 'published',
    ...ek,
  });

/* --------------------------------------------------------- EŞLEŞME */

test('country=remote yalnız gerçek Remote ilanları kapsıyor', () => {
  const f = { country: 'remote' };
  assert.equal(aramaEslesiyorMu(ilan({ work_type: 'Remote' }), f), true);
  assert.equal(aramaEslesiyorMu(ilan({ work_type: 'On-site' }), f), false);
  assert.equal(aramaEslesiyorMu(ilan({ work_type: 'Hybrid' }), f), false);
});

test('country_code=null ilan Remote sayılmıyor', () => {
  /*
    Kodu olmayan ilan "her yerde geçerli" değil: kaynağın söylemediği
    bir şeyi söylemek olurdu.
  */
  assert.equal(
    aramaEslesiyorMu(ilan({ country_code: null, work_type: 'On-site' }), { country: 'remote' }),
    false
  );
  /* Remote'sa geçiyor — ülke kodu hiç okunmuyor. */
  assert.equal(
    aramaEslesiyorMu(ilan({ country_code: null, work_type: 'Remote' }), { country: 'remote' }),
    true
  );
  /* Belirli bir ülke istenirse kodu olmayan ilan eşleşmiyor. */
  assert.equal(aramaEslesiyorMu(ilan({ country_code: null }), { country: 'TR' }), false);
});

test('is_paid=null ne ücretli ne ücretsiz filtresine giriyor', () => {
  assert.equal(aramaEslesiyorMu(ilan({ is_paid: null }), { pay: 'paid' }), false);
  assert.equal(aramaEslesiyorMu(ilan({ is_paid: null }), { pay: 'unpaid' }), false);
  /* Filtre yoksa görünüyor: null "gizle" demek değil. */
  assert.equal(aramaEslesiyorMu(ilan({ is_paid: null }), { pay: 'all' }), true);
  assert.equal(aramaEslesiyorMu(ilan({ is_paid: true }), { pay: 'paid' }), true);
  assert.equal(aramaEslesiyorMu(ilan({ is_paid: false }), { pay: 'unpaid' }), true);
  /* `ilaniNormalize` false'u null'a çevirmiyor. */
  assert.equal(ilaniNormalize({ is_paid: false }).isPaid, false);
});

test('bölüm filtresi eleme yapıyor, öne çıkarma değil', () => {
  const f = { departments: ['Bilgisayar'] };
  assert.equal(aramaEslesiyorMu(ilan(), f), true);
  assert.equal(
    aramaEslesiyorMu(ilan({ department: 'Makine Mühendisliği', description: 'CAD', title: 'Stajyer' }), f),
    false,
    'eşleşmeyen bölüm listeden ÇIKMALI'
  );
  /* Çoklu etiket de okunuyor. */
  assert.equal(
    aramaEslesiyorMu(
      ilan({ department: null, department_tags: ['Elektrik', 'Bilgisayar'] }),
      f
    ),
    true
  );
});

test('şehir, çalışma biçimi, arama metni ve staj türü', () => {
  assert.equal(aramaEslesiyorMu(ilan(), { city: 'İstanbul' }), true);
  assert.equal(aramaEslesiyorMu(ilan(), { city: 'Ankara' }), false);
  assert.equal(aramaEslesiyorMu(ilan(), { workTypes: ['On-site'] }), true);
  assert.equal(aramaEslesiyorMu(ilan(), { workTypes: ['Remote'] }), false);
  /* Türkçe katlama: "yazilim" ile "Yazılım" eşleşiyor. */
  assert.equal(aramaEslesiyorMu(ilan(), { q: 'yazilim' }), true);
  assert.equal(aramaEslesiyorMu(ilan(), { q: 'muhasebe' }), false);
  assert.equal(
    aramaEslesiyorMu(ilan({ mandatory_staj_accepted: false }), { mandatory: true }),
    false
  );
});

test('filtreler doğrulanıyor: bilinmeyen alan ve değer düşüyor', () => {
  const f = filtreleriDogrula({
    q: '  yazılım  ',
    country: 'xx',
    workTypes: ['On-site', 'Uydurma'],
    pay: 'belki',
    zararli: 'atılmalı',
    surum: 99,
  });
  assert.equal(f.q, 'yazılım');
  assert.equal(f.country, 'all', 'tanınmayan ülke kodu düşmeli');
  assert.deepEqual(f.workTypes, ['On-site']);
  assert.equal(f.pay, 'all');
  assert.equal(f.surum, FILTRE_SURUMU, 'sürüm damgalanmalı');
  assert.ok(!('zararli' in f), 'bilinmeyen alan taşınmamalı');
  /* Eski sürümle kaydedilmiş arama REDDEDİLMİYOR, yükseltiliyor. */
  const eski = filtreleriDogrula({ surum: 0, q: 'staj' });
  assert.equal(eski.q, 'staj');
  assert.equal(eski.surum, FILTRE_SURUMU);
});

test('boş filtre kaydedilmiyor', () => {
  assert.equal(filtreBosMu({}), true);
  assert.equal(filtreBosMu({ q: 'staj' }), false);
  /* Bileşen boş filtrede kendini çizmiyor. */
  assert.match(KAYDET, /if \(filtreBosMu\(filtreler\)\) return null;/);
});

test('adres sözleşmesi gidiş-dönüş tutarlı', () => {
  const f = filtreleriDogrula({
    q: 'yazılım',
    country: 'remote',
    city: 'İstanbul',
    workTypes: ['Remote'],
    departments: ['Bilgisayar'],
    pay: 'paid',
    mandatory: true,
  });
  const adres = aramaAdresine(f);
  const geri = adresTenFiltreler(adres.slice(adres.indexOf('?')));
  assert.deepEqual(geri, f);
});

/* --------------------------------------------- TEK EŞLEŞME GERÇEĞİ */

test('liste ekranı ve işçi AYNI modülü çağırıyor', () => {
  assert.match(ISCI, /from '\.\.\/src\/lib\/kayitli-arama\.mjs'/);
  assert.match(LISTE, /from '\.\.\/lib\/kayitli-arama\.mjs'/);
  /* Liste paylaşılan koşulları kendi içinde tekrar yazmıyor. */
  const kod = yorumsuz(LISTE);
  const gecer = kod.slice(kod.indexOf('const gecer = React.useCallback'));
  const govde = gecer.slice(0, gecer.indexOf('    ['));
  assert.match(govde, /aramaEslesiyorMu\(ilaniNormalize\(listing\), paylasilan\)/);
  assert.ok(
    !/onlyPaid && !listing\.stipend\.isPaid/.test(govde),
    'ücret koşulunun ikinci kopyası kalmamalı'
  );
  assert.ok(
    !/workTypes\.includes\(listing\.workType\)/.test(govde),
    'çalışma biçimi koşulunun ikinci kopyası kalmamalı'
  );
});

test('işçi sayfalama yapmıyor: eşleşme bütün envanterde', () => {
  assert.match(ISCI, /status=eq\.published&limit=5000/);
  assert.ok(!/range|offset=/.test(ISCI), 'sayfalı okuma olmamalı');
});

/* ------------------------------------------------- RIZA VE VARSAYILAN */

test('e-posta varsayılan kapalı', () => {
  assert.match(GOC, /email_enabled boolean not null default false/);
  assert.match(KAYDET, /const \[eposta, setEposta\] = React\.useState\(false\)/);
});

test('rıza olmadan e-posta açılamıyor — veritabanı kısıtı', () => {
  assert.match(GOC, /check \(email_enabled = false or consent_at is not null\)/);
  /* İşçi yalnız email_enabled olanları okuyor. */
  assert.match(ISCI, /email_enabled=is\.true/);
});

test('rıza metni birebir ve sürümlü, damgayı sunucu atıyor', () => {
  assert.equal(
    RIZA_METNI,
    'Yeni eşleşen ilanları günlük e-posta özetiyle almak istiyorum. İstediğim zaman kapatabilirim.'
  );
  assert.match(KAYDET, /\{RIZA_METNI\}/);
  assert.match(AYARLAR, /\{RIZA_METNI\}/);
  /* Kapatma zamanı da saklanıyor: denetim için. */
  assert.match(GOC, /opted_out_at timestamptz/);
  assert.match(GOC, /new\.opted_out_at := now\(\)/);
  /* İstemci consent_at yazamıyor: Update tipinde yok. */
  const tipler = oku('src/lib/database.types.ts');
  const blok = tipler.slice(tipler.indexOf('saved_searches: {'));
  const guncelle = yorumsuz(blok.slice(blok.indexOf('Update: {'), blok.indexOf('Relationships')));
  assert.ok(!/consent_at/.test(guncelle));
  assert.ok(!/opted_out_at/.test(guncelle));
  assert.ok(!/student_id/.test(guncelle));
});

/* ------------------------------------------- TABAN VE YENİ EŞLEŞMELER */

test('ilk kayıt eski ilanları topluca göndermiyor', () => {
  /* Taban kayıtları arama kaydedilirken yazılıyor. */
  assert.match(KAYDET, /tabanKayitlariniYaz\(arama\.id, eslesenler\)/);
  assert.match(GOC, /'baseline'/);
  /* Taban "gönderilmiş e-posta" olarak raporlanmıyor: ayrı `reason`. */
  assert.match(GOC, /check \(reason in \('candidate', 'baseline', 'digest'\)\)/);
  /* Taban kaydı aynı kanonik eşleşmeyle hesaplanıyor. */
  assert.match(KAYDET, /aramaEslesiyorMu\(ilaniNormalize\(i\), dogrulanmis\)/);
});

test('geç içe aktarılan ilan kaçmıyor: published_at ölçüt değil', () => {
  /*
    Aday olma ölçütü "defterde yok" — ilanın tarihi değil. `posted_at`
    ya da `published_at` eşiği kullanılsaydı, geç içe aktarılan eski
    tarihli bir ilan hiç gönderilmezdi.
  */
  /*
    `posted_at` artık işçide OKUNUYOR ama aday kararında değil: kayıtlı
    aramanın "son N günde eklenen" FİLTRESİ için. İlk hâlde bütün
    dosyada arıyordum ve o iddia, alan başka bir iş için eklenince
    kırıldı — kontrol aday kararının kendisine daraltıldı.
  */
  const aday = yorumsuz(ISCI).slice(
    yorumsuz(ISCI).indexOf('function adaylariBul'),
    yorumsuz(ISCI).indexOf('async function gonder')
  );
  assert.ok(!/published_at/.test(aday), 'aday kararı published_at kullanmamalı');
  assert.match(aday, /ham\.first_seen_at/, 'aday kararı bizim gördüğümüz anı kullanmalı');
  /* Defterde olan ilan tekrar değerlendirilmiyor. */
  assert.match(aday, /const mevcut = defter\.get\(ham\.id\);/);
});

test('kapanmış ilan gönderilmiyor ve eşleşme gönderim anında tekrar koşuyor', () => {
  assert.match(ISCI, /status=eq\.published/);
  assert.match(ISCI, /if \(!aramaEslesiyorMu\(ilaniNormalize\(ham\), filtreler\)\) continue;/);
});

/* --------------------------------------------- TEKİLLEŞTİRME VE DEVİR */

test('aynı ilan bir kez: defter kullanıcı+ilan düzeyinde', () => {
  assert.match(GOC, /primary key \(student_id, listing_id\)/);
  /* İşçi tarafında da tekilleştirme var: ilk arama adıyla bir kez. */
  assert.match(ISCI, /if \(!secilen\.has\(ham\.id\)\)/);
});

test('birden fazla arama tek özette birleşiyor', () => {
  /* Kullanıcı başına tek koşu kaydı ve tek e-posta. */
  assert.match(GOC, /primary key \(student_id, gun\)/);
  const kod = yorumsuz(ISCI);
  assert.match(kod, /for \(const studentId of kisiler\)/);
  /* Bütün aramalar aynı aday havuzuna giriyor. */
  assert.match(kod, /aramalar: kendiAramalari/);
});

test('10 ilan sınırı ve devir', () => {
  assert.equal(OZET_ILAN_SINIRI, 10);
  assert.match(ISCI, /sirali\.slice\(0, OZET_ILAN_SINIRI\)/);
  /*
    İŞARETLEME YALNIZ SEÇİLENLERE: onuncu sıradan sonrakiler
    `sent_at is null` kalıyor ve sonraki güne devrediyor.
  */
  const isaretle = GOC.slice(GOC.indexOf('function public.gunluk_ozet_isaretle'));
  const govde = isaretle.slice(0, isaretle.indexOf('$$;'));
  assert.match(govde, /d\.listing_id = any \(secilen\)/);
  assert.match(govde, /and d\.sent_at is null/);
  /* Kalanlar e-postada sayı olarak söyleniyor. */
  assert.match(ISCI, /ilan daha var/);
});

test('sıralama kararlı: eşitlikte kimlik belirliyor', () => {
  const a = { id: 'b', eklenme: '2026-09-01T00:00:00Z' };
  const b = { id: 'a', eklenme: '2026-09-01T00:00:00Z' };
  assert.ok(ozetSiralamasi(a, b) > 0, 'eşit tarihte kimlik sıralamalı');
  assert.equal(ozetSiralamasi(a, a), 0);
  const yeni = { id: 'z', eklenme: '2026-09-02T00:00:00Z' };
  assert.ok(ozetSiralamasi(yeni, a) < 0, 'yeni olan önce');
});

/* ------------------------------------------ YARIŞ VE TEKRAR KORUMASI */

test('eş zamanlı iki işçi aynı kullanıcıya göndermiyor', () => {
  const al = GOC.slice(GOC.indexOf('function public.gunluk_ozet_kosu_al'));
  const govde = al.slice(0, al.indexOf('$$;'));
  assert.match(govde, /for update skip locked/);
  assert.match(govde, /next_attempt_at = now\(\) \+ make_interval/);
  assert.match(AKIS, /concurrency:/);
  assert.match(AKIS, /cancel-in-progress: false/);
});

test('idempotency anahtarı kullanıcı + Türkiye günü + kalıcı koşu kimliği', () => {
  assert.match(ISCI, /'Idempotency-Key': `ozet-\$\{studentId\}-\$\{GUN\}-\$\{runId\}`/);
  /* `run_id` veritabanında KALICI: retry aynı anahtarı üretiyor. */
  assert.match(GOC, /run_id uuid not null default gen_random_uuid\(\)/);
});

test('seçilen ilanlar gönderimden ÖNCE sabitleniyor', () => {
  assert.match(GOC, /listing_ids uuid\[\] not null default '\{\}'/);
  const kod = yorumsuz(ISCI);
  const kosuYaz = kod.indexOf("rest('digest_runs'");
  const gonderim = kod.indexOf('await gonder(');
  assert.ok(kosuYaz > 0 && kosuYaz < gonderim, 'koşu kaydı gönderimden önce yazılmalı');
  /* Retry sabitlenmiş listeyi okuyor: içerik değişmiyor. */
  assert.match(kod, /kosu\.listing_ids\s*\n?\s*\.map\(\(id\) => zenginIlanlar\.find/);
});

test('sınırlı retry ve üstel bekleme; tükenen koşular yöneticide', () => {
  const isaretle = GOC.slice(GOC.indexOf('function public.gunluk_ozet_isaretle'));
  assert.match(isaretle.slice(0, isaretle.indexOf('$$;')), /power\(2, least\(attempts \+ 1, 6\)\)/);
  assert.match(GOC, /and r\.attempts < 6/);
  assert.match(GOC, /create or replace view public\.gunluk_ozet_tukenen/);
  /* Görünüm RLS'i atlamıyor ve yöneticiye politika var. */
  assert.match(GOC, /with \(security_invoker = on\)/);
  assert.match(GOC, /create policy "yonetici kosulari okur"/);
});

test('bir kullanıcının hatası ötekileri durdurmuyor', () => {
  const kod = yorumsuz(ISCI);
  /* Hazırlık ve gönderim döngüleri ayrı `try` blokları içinde. */
  assert.equal((kod.match(/catch \(hata\)/g) || []).length >= 2, true);
  assert.match(ISCI, /BİR KULLANICININ HATASI ÖTEKİLERİ DURDURMUYOR/);
});

/* ------------------------------------------------ ABONELİKTEN ÇIKMA */

test('token veritabanında saklanmıyor: stateless HMAC', () => {
  /* Ne tablo ne kolon: token hiçbir yere yazılmıyor. */
  assert.ok(!/token/i.test(GOC), 'göçte token saklanmamalı');
  assert.match(ISCI, /crypto\.subtle\.sign\('HMAC'/);
  assert.match(ABONELIK, /crypto\.subtle\.sign\('HMAC'/);
  /* Amaç ve sürüm token'ın içinde. */
  assert.match(ABONELIK, /const AMAC = 'ozet-abonelik\.v1'/);
  assert.match(ISCI, /ozet-abonelik\.v1/);
});

test('süresi dolmuş, değiştirilmiş ve yanlış biçimli token reddediliyor', () => {
  assert.match(ABONELIK, /if \(bitis < Math\.floor\(Date\.now\(\) \/ 1000\)\) return \{ hata: 'sure' \}/);
  assert.match(ABONELIK, /if \(!zamanEsit\(beklenen, gelen\)\) return \{ hata: 'imza' \}/);
  assert.match(ABONELIK, /if \(parcalar\.length !== 3\) return \{ hata: 'bicim' \}/);
  /* Sabit süreli karşılaştırma: imza tahmini ölçülebilir olmasın. */
  assert.match(ABONELIK, /fark \|= a\[i\] \^ b\[i\]/);
});

test('token yalnız özet tercihini kapatıyor', () => {
  const kod = yorumsuz(ABONELIK);
  /* Tek yazma: saved_searches.email_enabled = false. */
  assert.match(kod, /saved_searches\?student_id=eq\.\$\{sonuc\.studentId\}&email_enabled=is\.true/);
  assert.match(kod, /JSON\.stringify\(\{ email_enabled: false \}\)/);
  /* Başka tablo okunmuyor/yazılmıyor ve oturum üretilmiyor. */
  for (const yasak of ['applications', 'application_tracking', 'profiles', 'auth/v1/token', 'set-cookie']) {
    assert.ok(!kod.includes(yasak), `${yasak} bu uç noktada olmamalı`);
  }
  /* Tekrar kullanım güvenli sonuç veriyor. */
  assert.match(ABONELIK, /zaten kapalı/);
  assert.match(ABONELIK, /Günlük ilan özetleri kapatıldı/);
});

test('tekrar açmak yalnız ayarlardan ve yeni rızayla', () => {
  /* Uç nokta hiçbir şeyi AÇMIYOR: yalnız false yazıyor. */
  assert.ok(!/email_enabled: true/.test(ABONELIK));
  /* Açma yolu ayarlar ekranında ve rıza adımından geçiyor. */
  assert.match(AYARLAR, /emailEnabled: true, consentTextVersion: RIZA_METNI_SURUMU/);
  assert.match(AYARLAR, /Kabul ediyorum, günlük özeti aç/);
});

/* ---------------------------------------------------- RLS VE GÜVENLİK */

test('kullanıcı yalnız kendi kayıtlarını görüyor', () => {
  for (const tablo of ['saved_searches', 'digest_deliveries', 'digest_runs']) {
    assert.match(GOC, new RegExp(`alter table public\\.${tablo} enable row level security`));
  }
  const sayi = (GOC.match(/student_id = auth\.uid\(\)/g) || []).length;
  assert.ok(sayi >= 6, `auth.uid() sınırı her politikada olmalı (bulunan: ${sayi})`);
});

test('istemci teslim/koşu durumunu değiştiremiyor', () => {
  /* digest_deliveries ve digest_runs: yalnız SELECT politikası var. */
  for (const tablo of ['digest_deliveries', 'digest_runs']) {
    const politikalar = [...GOC.matchAll(new RegExp(`create policy "[^"]+" on public\\.${tablo}\\s+for (\\w+)`, 'g'))].map((m) => m[1]);
    assert.ok(politikalar.length > 0, `${tablo} politikası olmalı`);
    assert.deepEqual([...new Set(politikalar)], ['select'], `${tablo} yalnız okunabilir olmalı`);
  }
  /* Üretilen tiplerde de yazma kapalı. */
  const tipler = oku('src/lib/database.types.ts');
  for (const tablo of ['digest_deliveries', 'digest_runs']) {
    const blok = tipler.slice(tipler.indexOf(`${tablo}: {`));
    assert.match(blok.slice(0, 1400), /Insert: Record<string, never>/);
  }
});

test('işçi fonksiyonları istemciye kapalı', () => {
  for (const fn of ['gunluk_ozet_kosu_al', 'gunluk_ozet_isaretle']) {
    for (const rol of ['anon', 'authenticated']) {
      assert.ok(
        new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from ${rol}`).test(GOC),
        `${fn} ${rol} tarafından çağrılamamalı`
      );
    }
  }
  /* Taban yazma RPC'si `auth.uid()`i İÇERİDE okuyor. */
  const taban = GOC.slice(GOC.indexOf('function public.kayitli_arama_taban_yaz'));
  assert.match(taban.slice(0, taban.indexOf('$$;')), /kisi uuid := auth\.uid\(\)/);
  assert.ok(
    !/p_student/.test(taban.slice(0, taban.indexOf('$$;'))),
    'kullanıcı parametre olarak alınmamalı'
  );
});

test('e-posta adresi doğrulanmış hesaptan alınıyor', () => {
  assert.match(ISCI, /auth\/v1\/admin\/users\/\$\{kosu\.student_id\}/);
  assert.match(ISCI, /const eposta = kullanici\?\.email/);
});

test('kullanıcı metni e-postada kaçırılıyor', () => {
  assert.match(ISCI, /function kacir\(/);
  for (const k of [/&amp;/, /&lt;/, /&gt;/, /&quot;/, /&#39;/]) assert.match(ISCI, k);
  /* Arama adı ve ilan metinleri kaçırılmadan gövdeye girmiyor. */
  assert.match(ISCI, /\$\{kacir\(ilan\.title\)\}/);
  assert.match(ISCI, /\$\{kacir\(aramaAdi\)\}/);
});

test('sırlar log ve commit dışında', () => {
  assert.match(AKIS, /secrets\.OZET_ABONELIK_SIRRI/);
  /* İş akışı sır DEĞERİ yazdırmıyor, yalnız varlık kontrolü. */
  assert.match(AKIS, /Değerler YAZDIRILMIYOR/);
  assert.ok(!/re_[A-Za-z0-9]{10,}/.test(ISCI + AKIS + ABONELIK), 'anahtar kaynağa girmemeli');
  /* Hata metni sağlayıcı anahtarını taşımıyor. */
  assert.match(ISCI, /replace\(\/Bearer\\s\+\\S\+\/gi, 'Bearer \*\*\*'\)/);
});

/* --------------------------------------------------- SAAT VE ZAMANLAMA */

test('06:00 UTC Europe/Istanbul saatiyle 09:00 — yaz ve kış', () => {
  /*
    Türkiye 2016'dan beri KALICI UTC+3 ve yaz/kış saati uygulamıyor.
    İki uç tarih ölçülüyor: Ocak (kış) ve Temmuz (yaz).
  */
  assert.equal(turkiyeSaati(Date.parse('2027-01-15T06:00:00Z')), 9, 'kış');
  assert.equal(turkiyeSaati(Date.parse('2027-07-15T06:00:00Z')), 9, 'yaz');
  assert.match(AKIS, /cron: "0 6 \* \* \*"/);
});

test('Türkiye takvim günü sınırı doğru', () => {
  /* 21:30 UTC Türkiye'de ertesi gün 00:30. */
  assert.equal(turkiyeGunu(Date.parse('2026-09-14T21:30:00Z')), '2026-09-15');
  assert.equal(turkiyeGunu(Date.parse('2026-09-14T20:30:00Z')), '2026-09-14');
  assert.match(ISCI, /const GUN = process\.env\.OZET_GUNU \|\| turkiyeGunu\(\)/);
});

test('yeni eşleşme yoksa e-posta yok', () => {
  assert.match(ISCI, /if \(adaylar\.length === 0\) \{/);
  assert.match(yorumsuz(ISCI), /atlandi \+= 1;\s*\n\s*continue;/);
});

test('işçi mevcut altyapıda, yerel .env okumuyor', () => {
  assert.ok(!/dotenv/.test(ISCI));
  assert.ok(!/readFile|node:fs/.test(ISCI), 'yerel dosya okunmamalı');
  assert.match(ISCI, /process\.env\.RESEND_API_KEY/);
  assert.match(AKIS, /Depo sırları eksik/);
});

/* ------------------------------------------------------------- ARAYÜZ */

test('WhatsApp/SMS alanı ya da "hazır değil" arayüzü yok', () => {
  for (const metin of [AYARLAR, KAYDET]) {
    assert.ok(!/whatsapp|sms|yakında|hazır değil/i.test(metin));
  }
});

test('işveren hesabına öğrenci özeti açılmıyor', () => {
  assert.match(AYARLAR, /if \(!ogrenciMi\) return null;/);
  assert.match(oku('src/App.tsx'), /ogrenciMi=\{Boolean\(activeStudent\)\}/);
});

test('mobilde tam genişlik düzeni korunuyor', () => {
  assert.match(AYARLAR, /border-y border-gray-200 bg-white p-4 sm:rounded-2xl sm:border-x/);
  assert.ok(!/shadow-(sm|md|lg|xl)/.test(AYARLAR), 'gölge olmamalı');
  const hedefler = (AYARLAR.match(/min-h-11/g) || []).length;
  assert.ok(hedefler >= 5, `dokunma hedefleri min-h-11 olmalı (bulunan: ${hedefler})`);
  assert.match(AYARLAR, /break-words/);
});

test('ayarlar ekranı tüm özetleri kapatma sunuyor', () => {
  assert.match(AYARLAR, /Bütün ilan özetlerini kapat/);
  assert.match(oku('src/lib/queries/index.ts'), /export async function tumOzetleriKapat/);
});

test('rıza sürümü beyan edilmeden e-posta açılamıyor', () => {
  /*
    ÖLÇÜLDÜ (14 Eylül 2026, üretim): `{"email_enabled":true,
    "consent_text_version":null}` HTTP 201 ile kabul ediliyordu. Ekleme
    tetikleyicisi `consent_at`i KENDİSİ dolduruyor, dolayısıyla kısıt
    hiç ihlal edilemiyordu — "rıza kaydedildi" bir zaman damgasına
    indirgenmişti ve kullanıcının NEYE onay verdiği kayıtta
    olmayabiliyordu.
  */
  const YAMA = oku('supabase/migrations/20261003020000_riza_surumu_zorunlu.sql');
  /* Tetikleyici artık uydurmuyor, reddediyor — hem ekleme hem açma. */
  const sayi = (YAMA.match(/riza-surumu-yok/g) || []).length;
  assert.equal(sayi, 2, 'ekleme ve açma yollarının ikisi de reddetmeli');
  assert.ok(!/coalesce\(new\.consent_text_version, 1\)/.test(YAMA), 'varsayılan atanmamalı');
  /* Kısıt da sürümü istiyor: tetikleyici atlanırsa tablo tutuyor. */
  assert.match(
    YAMA,
    /check \(\s*email_enabled = false\s*or \(consent_at is not null and consent_text_version is not null\)\s*\)/
  );
  /* Kapatmada sürüm korunuyor: denetim sorusu sonradan da cevaplanabilir. */
  assert.match(YAMA, /new\.consent_text_version := old\.consent_text_version;/);
});

/* ------------------------------------------------ KAPANIŞ KONTROLÜ */

test('taban kararı işçide: istemci düşse de eski ilan gönderilmiyor', () => {
  /*
    ÖLÇÜLDÜ (14 Eylül 2026): canlı doğrulamada aramayı doğrudan REST'e
    yazdım, yani `AramayiKaydet`in taban çağrısı hiç koşmadı ve 159
    ilanın 82'si aday oldu, 10'u gönderildi. Taban yalnız istemcide
    olduğu için sekme kapanması da aynı sonucu verirdi.

    Kural artık işçide de var: eşleşen ama defterde olmayan bir ilan,
    ARAMADAN ÖNCE envanterimize girmişse taban sayılıyor.
  */
  const kod = yorumsuz(ISCI);
  assert.match(kod, /const aramadanOnce =/);
  assert.match(kod, /geldigiAn <= aramaAnı/);
  assert.match(kod, /if \(aramadanOnce && !mevcut\)/);
  /* İşçi eksik tabanı `reason='baseline'` ile tamamlıyor. */
  assert.match(kod, /reason: 'baseline'/);
  /* Arama tarihi okunuyor. */
  assert.match(ISCI, /select=id,student_id,name,filters,email_enabled,created_at/);
});

test('baseline sonraki gün candidate olmuyor', () => {
  const kod = yorumsuz(ISCI);
  /*
    Defterdeki satır tekrar değerlendirilmiyor; tek istisna `candidate`
    ve gönderilmemiş olanlar (onuncu sıradan sonra devredenler).
    `baseline` bu kapıdan geçmiyor.
  */
  assert.match(kod, /if \(mevcut && !\(mevcut\.reason === 'candidate' && !mevcut\.sent_at\)\) continue;/);
  assert.match(ISCI, /select=listing_id,sent_at,reason/);
});

test('şirket ve tarih aralığı artık kaydediliyor', () => {
  const f = filtreleriDogrula({ companies: ['Örnek A.Ş.'], postedWithinDays: '7' });
  assert.deepEqual(f.companies, ['Örnek A.Ş.']);
  assert.equal(f.postedWithinDays, 7);
  assert.equal(filtreleriDogrula({ postedWithinDays: 99 }).postedWithinDays, null);
  /* Eşleşmede gerçekten uygulanıyor. */
  const bugun = ilaniNormalize({ id: 'a', title: 'Stajyer', posted_at: new Date().toISOString() });
  const eski = ilaniNormalize({ id: 'b', title: 'Stajyer', posted_at: '2020-01-01T00:00:00Z' });
  assert.equal(aramaEslesiyorMu(bugun, { postedWithinDays: 7 }), true);
  assert.equal(aramaEslesiyorMu(eski, { postedWithinDays: 7 }), false);
  assert.equal(
    aramaEslesiyorMu(ilaniNormalize({ id: 'c', title: 'S', company_name: 'A' }), { companies: ['B'] }),
    false
  );
  /* Liste de bu ikisini kanonik nesneye veriyor ve kendi kopyasını
     tutmuyor. */
  const kod = yorumsuz(LISTE);
  assert.match(kod, /companies: selectedCompanies/);
  assert.match(kod, /postedWithinDays: dateRange === 'all' \? null : Number\(dateRange\)/);
  assert.ok(
    !/selectedCompanies\.includes\(listing\.companyName\)/.test(kod),
    'şirket koşulunun ikinci kopyası kalmamalı'
  );
});

test('kanonik tarih alanı iki tarafın da okuyabildiği alan', () => {
  /*
    `first_seen_at` daha doğru alan ama İSTEMCİ OKUYAMIYOR: ölçüldü,
    `42501 permission denied` (kolon yetkileri, 20260906010000) ve
    ürün nesnesinde de yok. Modül onu okusaydı arayüzde filtre her
    ilanı eler, e-postada elemezdi — tam olarak kaçınılan ayrışma.
  */
  const MODUL = oku('src/lib/kayitli-arama.mjs');
  assert.match(MODUL, /const t = new Date\(i\.postedAt \?\? 0\)\.getTime\(\)/);
  assert.ok(
    !/i\.firstSeenAt/.test(MODUL),
    'filtre istemcinin okuyamadığı alanı kullanmamalı'
  );
  /* İşçinin "yeni mi" kararı AYRI konu ve orada `first_seen_at` doğru. */
  assert.match(ISCI, /ham\.first_seen_at/);
});

test('kaydedilmeyen filtreler sessizce yok sayılmıyor', () => {
  /* Ekran hem kaydedilenleri hem dışarıda kalanları yazıyor. */
  assert.match(KAYDET, /Kaydedilecek filtreler/);
  assert.match(KAYDET, /Kaydedilmeyenler: \{KAYDEDILMEYEN_FILTRELER\.join\(', '\)\}/);
  /* Dışarıda kalanlar SUNUM kararları: veri filtresi gibi
     kaydedilmiyorlar. */
  const MODUL = oku('src/lib/kayitli-arama.mjs');
  const liste = MODUL.slice(MODUL.indexOf('KAYDEDILMEYEN_FILTRELER'));
  for (const beklenen of ['Uyum puanı eşiği', 'Görünüm sekmesi', 'Şehirde “diğer”']) {
    assert.ok(liste.includes(beklenen), `${beklenen} listelenmeli`);
  }
  /* Kanonik sözleşmede bunlara karşılık gelen alan YOK. */
  const f = filtreleriDogrula({ minMatchScore: 80, subTab: 'yeni', city: 'diger' });
  assert.ok(!('minMatchScore' in f) && !('subTab' in f));
});

test('first_seen_at boşsa created_at, ikisi de yoksa TABAN', () => {
  /*
    ÖLÇÜLDÜ (14 Eylül 2026, üretim): yayındaki 159 ilanın 151'inde
    `first_seen_at` NULL — alan yalnız otomasyonun derlediklerinde
    doluyor. İlk hâlde boş alan "aramadan sonra geldi" sayılıyordu ve
    normal akış ölçümünde 10 eski ilan yine gönderildi.
  */
  const kod = yorumsuz(ISCI);
  assert.match(kod, /new Date\(ham\.first_seen_at \?\? ham\.created_at \?\? 0\)/);
  /* Geliş anı kurulamıyorsa taban: yaşını bilmediğimiz ilan
     e-postalanmıyor. */
  assert.match(kod, /const gelisBilinmiyor =/);
  assert.match(kod, /gelisBilinmiyor \|\| \(Number\.isFinite\(aramaAnı\) && geldigiAn <= aramaAnı\)/);
  assert.match(ISCI, /first_seen_at,posted_at,created_at/);
});
