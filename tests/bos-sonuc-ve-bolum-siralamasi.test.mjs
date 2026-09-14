import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { dizini, ulkeUygunMu, uygunIsverenler } from '../src/lib/isveren-dizini.mjs';
import { bolumSkoru, bolumeGoreSirala } from '../src/lib/bolum-eslestirme.mjs';
import { adresTenFiltreler, aramaEslesiyorMu, ilaniNormalize } from '../src/lib/kayitli-arama.mjs';

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const yorumsuz = (m) => m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const SONUCYOK = oku('src/components/SonucYok.tsx');
const LISTE = oku('src/components/MatchedInternshipsView.tsx');

const PROGRAMLAR = [
  {
    slug: 'a',
    isveren: 'A Holding',
    sektor: 'Holding',
    kariyerUrl: 'https://a.example/kariyer',
    bolumler: ['bilgisayar-muhendisligi'],
  },
  {
    slug: 'b',
    isveren: 'B Bank',
    sektor: 'Bankacılık',
    kariyerUrl: 'https://b.example/kariyer',
    bolumler: ['isletme'],
  },
  { slug: 'c', isveren: 'C Sanayi', sektor: 'Sanayi', kariyerUrl: 'https://c.example/kariyer' },
];

/* ------------------------------------------------------- BOŞ SONUÇ */

test('boş sonuç adımları doğru sırada', () => {
  const sira = [
    'Bu filtrelere uygun açık ilan bulunamadı.',
    'Filtreleri temizle',
    'Bu bölüm ve ülkede staj alan işverenler',
    'İlan açmamış şirkete nasıl yazılır?',
    'Açık öğrenci fırsatlarına bak',
  ];
  let onceki = -1;
  for (const parca of sira) {
    const i = SONUCYOK.indexOf(parca);
    assert.ok(i > onceki, `sıra bozuk: ${parca}`);
    onceki = i;
  }
});

test('Fırsatlar küçük ve ikincil, ana sonuç değil', () => {
  /*
    Önce EN ÜSTTE, dolgulu düğmeli büyük mavi bir kutuydu — boş staj
    listesinin ana sonucu gibi duruyordu. Öğrenci staj arıyor; burs
    listesi bir alternatif, cevabın kendisi değil.
  */
  const firsat = SONUCYOK.slice(SONUCYOK.indexOf('Açık öğrenci fırsatlarına bak') - 900);
  assert.ok(!/bg-blue-50\/60/.test(firsat), 'kutu olmamalı');
  assert.ok(!/bg-blue-600/.test(firsat.slice(0, 600)), 'dolgulu düğme olmamalı');
  /* Sparkles ikonlu tanıtım kutusu kalktı. */
  assert.ok(!/<Sparkles/.test(SONUCYOK), 'ikonlu tanıtım kutusu kalmamalı');
});

test('uygun şirket yoksa blok gizleniyor', () => {
  assert.match(SONUCYOK, /\{isverenler\.length > 0 && \(/);
  assert.deepEqual(uygunIsverenler(dizini(PROGRAMLAR), { country: 'all', departments: ['hukuk'] }), []);
  assert.deepEqual(uygunIsverenler(dizini([]), { country: 'all' }), []);
});

test('ülke uygunluğu gerçek alandan: başka ülkede öneri yok', () => {
  assert.equal(ulkeUygunMu('all'), true);
  assert.equal(ulkeUygunMu('TR'), true);
  assert.equal(ulkeUygunMu('FR'), false);
  /* `remote` de dışarıda: bunlar kariyer sayfaları, uzaktan çalışma
     vaadi taşımıyorlar. */
  assert.equal(ulkeUygunMu('remote'), false);
  assert.deepEqual(uygunIsverenler(dizini(PROGRAMLAR), { country: 'FR' }), []);
  assert.equal(uygunIsverenler(dizini(PROGRAMLAR), { country: 'TR' }).length, 3);
});

test('bölüm eşleşmesi TAM slug, alt dize değil', () => {
  const sonuc = uygunIsverenler(dizini(PROGRAMLAR), {
    country: 'all',
    departments: ['bilgisayar-muhendisligi'],
  });
  assert.deepEqual(
    sonuc.map((x) => x.slug),
    ['a']
  );
  /*
    "islet" araması "isletme"ye ALT DİZE olarak eşleşmiyor: eşleşme bir
    dizi üyeliği sorgusu. `burs`/Bursa ve `maaş`/Maastricht sınıfı hata
    burada tekrarlanmıyor.
  */
  assert.deepEqual(
    uygunIsverenler(dizini(PROGRAMLAR), { country: 'all', departments: ['islet'] }).map((x) => x.slug),
    []
  );
});

test('genel kariyer sayfası açık ilan gibi gösterilmiyor', () => {
  /*
    ÖLÇÜM YOKSA DURUM `null` — "bilinmiyor" DEĞİL

    Eskiden bu modül durumu her kayıtta sabit 'bilinmiyor' yazıyordu:
    hiç bakılmamış şirketi "baktık, bulamadık" gibi gösteriyordu.
  */
  for (const i of uygunIsverenler(dizini(PROGRAMLAR), { country: 'all' })) {
    assert.equal(i.programDurumu, null);
    assert.equal(i.programUrl, null);
  }
  assert.match(SONUCYOK, /programDurumMetni\(i\.programDurumu\)/);
  assert.match(SONUCYOK, /Bunlar açık ilan değil, şirketin kendi kariyer sayfası/);
  /* Sabit sayı sözü yok. */
  assert.ok(!/10 şirket|10 işveren/.test(SONUCYOK));
});

test('ikinci şirket dizini YOK: eski modül kaldırıldı, üç yüzey aynı kaynakta', () => {
  assert.match(LISTE, /import \{ STAJ_PROGRAMLARI \} from '\.\.\/data\/stajProgramlari'/);

  /* Eski ikinci liste gerçekten silinmiş olmalı. */
  assert.ok(
    !existsSync(new URL('../src/lib/bos-sonuc-isverenler.mjs', import.meta.url)),
    'bos-sonuc-isverenler.mjs kaldırılmalı: ikinci şirket listesi ve ikinci durum hesabıydı'
  );
  /*
    İÇE AKTARIMA bakıyor, metne değil: dosyalarda eski modülün NEDEN
    kaldırıldığını anlatan yorumlar var ve düz `includes` onları da
    yakalıyordu (kendi testim bir kez bu yüzden kırmızı döndü).
  */
  for (const dosya of [
    'src/components/SonucYok.tsx',
    'src/components/MatchedInternshipsView.tsx',
    'src/components/StajProgramlari.tsx',
  ]) {
    assert.ok(
      !/from '[^']*bos-sonuc-isverenler/.test(oku(dosya)),
      `${dosya} eski modülü içe aktarmamalı`
    );
  }

  /* Üç yüzeyin hepsi ortak modülü çağırıyor. */
  assert.match(SONUCYOK, /from '\.\.\/lib\/isveren-dizini\.mjs'/);
  assert.match(LISTE, /from '\.\.\/lib\/isveren-dizini\.mjs'/);
  assert.match(oku('src/components/StajProgramlari.tsx'), /from '\.\.\/lib\/isveren-dizini\.mjs'/);
  assert.match(oku('src/components/BolumIcerik.tsx'), /isveren-dizini\.mjs|isveren-olcum/);

  /* Ortak modül veri katmanına YALNIZ tek toplu okumayla dokunuyor. */
  const MODUL = oku('src/lib/isveren-dizini.mjs');
  /*
    TEK TOPLU OKUMA — YEDEK DENEME DAHİL EN FAZLA İKİ

    İki `.from()` var ve ikincisi YALNIZ hata dalında: `program_url`
    kolonu göç uygulanmadan istenince PostgREST bütün sorguyu 42703 ile
    düşürüyordu ve 44 satırın hepsi kayboluyordu. Yedek, eski kolon
    kümesiyle bir kez daha deniyor.

    Değişmez olan şey "tek sorgu" değil, KART BAŞINA SORGU OLMAMASI:
    aşağıdaki denetim tek kayıt çeken kalıpları yasaklıyor.
  */
  const okumalar = (MODUL.match(/\.from\('employer_career_checks'\)/g) ?? []).length;
  assert.ok(okumalar >= 1 && okumalar <= 2, `en fazla iki okuma, bulunan: ${okumalar}`);
  assert.ok(!/\.eq\('slug'/.test(MODUL), 'kart başına sorgu olmamalı');
  assert.match(MODUL, /export function kontrolOnbelleginiBosalt/);
});

test('mevsim bandı ve eğitim tanıtımı yok', () => {
  for (const yasak of ['mevsim', 'Mevsim', 'Eğitim bilgilerine göre', 'senin için öne çıkardık']) {
    assert.ok(!SONUCYOK.includes(yasak), `${yasak} olmamalı`);
  }
});

/* ------------------------------------------------ BÖLÜM SIRALAMASI */

const ilan = (ek) => ({ id: 'x', title: 'Stajyer', description: '', ...ek });

test('ağırlıklar: etiket 3, başlık 2, açıklama 1', () => {
  assert.equal(bolumSkoru(ilan({ department_tags: ['bilgisayar-muhendisligi'] }), 'yazilim'), 3);
  assert.equal(bolumSkoru(ilan({ title: 'Yazılım Stajyeri' }), 'yazilim'), 2);
  assert.equal(bolumSkoru(ilan({ description: 'yazılım geliştirme' }), 'yazilim'), 1);
  assert.equal(bolumSkoru(ilan({ title: 'Muhasebe Stajyeri' }), 'yazilim'), 0);
  /* Eski tekil `department` alanı geriye uyumluluk için okunuyor. */
  assert.equal(bolumSkoru(ilan({ department: 'bilgisayar-muhendisligi' }), 'yazilim'), 3);
});

test('sıralama ilan gizlemiyor ve kararlı', () => {
  const kayitlar = [
    ilan({ id: 'c', description: 'yazılım geliştirme' }),
    ilan({ id: 'a', title: 'Yazılım Stajyeri' }),
    ilan({ id: 'b', department_tags: ['bilgisayar-muhendisligi'] }),
    ilan({ id: 'd', title: 'Muhasebe Stajyeri' }),
  ];
  const s = bolumeGoreSirala(kayitlar, 'yazilim', (x) => x);
  assert.deepEqual(
    s.map((x) => x.id),
    ['b', 'a', 'c', 'd']
  );
  /* HİÇBİR İLAN GİZLENMİYOR. */
  assert.equal(s.length, kayitlar.length);
  /* Geçersiz alan: liste olduğu gibi dönüyor (güvenli varsayılan). */
  assert.deepEqual(bolumeGoreSirala(kayitlar, 'uydurma', (x) => x), kayitlar);
  assert.deepEqual(bolumeGoreSirala(kayitlar, null, (x) => x), kayitlar);
});

test('tam eşitlikte sabit ilan kimliği kullanılıyor', () => {
  const a = ilan({ id: 'zz' });
  const b = ilan({ id: 'aa' });
  const s1 = bolumeGoreSirala([a, b], 'yazilim', (x) => x);
  const s2 = bolumeGoreSirala([a, b], 'yazilim', (x) => x);
  assert.deepEqual(
    s1.map((x) => x.id),
    s2.map((x) => x.id),
    'iki koşu aynı sırayı vermeli'
  );
  assert.match(oku('src/lib/bolum-eslestirme.mjs'), /return a\.id\.localeCompare\(b\.id\);/);
});

test('sıralama sayfalamadan ÖNCE, bütün filtrelenmiş kümeye', () => {
  const kod = yorumsuz(LISTE);
  /*
    İlk hâlde `gosterilecekIlanSayisi`nin İÇE ALMA satırıyla
    kıyaslıyordum (dosyanın en başında) ve iddia anlamsızdı. Karşılaştırma
    ÇAĞRI yeriyle yapılıyor.
  */
  const sirala = kod.indexOf('bolumeGoreSirala(sirali');
  const sayfala = kod.indexOf('gosterilecekIlanSayisi({');
  assert.ok(sirala > 0, 'sıralama çağrısı bulunmalı');
  assert.ok(sayfala > 0, 'sayfalama çağrısı bulunmalı');
  assert.ok(sirala < sayfala, 'sıralama sayfalamadan önce olmalı');
  /* Dilimleme sıralanmış listeden yapılıyor. */
  assert.match(kod, /filteredListings\.slice\(0, gosterilecekToplam\)|filteredListings\.map\(/);
  /* Girdi filtrelenmiş kümenin TAMAMI (`sirali`), görünen sayfa değil. */
  assert.match(kod, /bolumeGoreSirala\(sirali, bolumAlani/);
});

test('açık bölüm filtresi eleme yapıyor, çipler yalnız sıralıyor', () => {
  /*
    SÖZLÜK ÜZERİNDEN — CANLIDA ÖLÇÜLDÜ

    İlk hâlde slug başlık/açıklamada ALT DİZE olarak aranıyordu ve
    `?bolum=bilgisayar-muhendisligi` HİÇBİR ilanla eşleşmiyordu:
    "bilgisayar-muhendisligi" hiçbir başlıkta geçmiyor ve
    `department_tags` üretimde boş. Bölüm sayfasından gelen bağlantı
    boş liste açıyordu.
  */
  const f = { departments: ['bilgisayar-muhendisligi'] };
  assert.equal(
    aramaEslesiyorMu(ilaniNormalize({ id: 'a', title: 'Yazılım Stajyeri' }), f),
    true,
    'slug ile başlık aynı ALANDA buluşmalı'
  );
  assert.equal(
    aramaEslesiyorMu(ilaniNormalize({ id: 'm', title: 'Makine Mühendisi Stajyeri' }), f),
    false
  );
  /* Tanınmayan bölüm: güvenli varsayılan — eleme yapmıyor. */
  assert.equal(
    aramaEslesiyorMu(ilaniNormalize({ id: 'a', title: 'Yazılım Stajyeri' }), {
      departments: ['uydurma-bolum'],
    }),
    true
  );
  /* Aynı sözlük liste, bölüm sayfası ve sıralama tarafından paylaşılıyor. */
  assert.match(oku('src/lib/kayitli-arama.mjs'), /from '\.\/bolum-eslestirme\.mjs'/);
  /* Liste bunu ADRESTEN okuyor ve geri/ileri ile çalışıyor. */
  assert.match(LISTE, /adresTenFiltreler\(window\.location\.search\)\.departments/);
  assert.match(LISTE, /window\.addEventListener\('popstate', oku\)/);
  assert.match(LISTE, /departments: acikBolumler/);
  /*
    Çipler (`bolumAlani`) kanonik nesneye GİRMİYOR: onlar sıralama
    sinyali ve hiçbir ilanı elemiyor.
  */
  const kanonik = LISTE.slice(LISTE.indexOf('const kanonikFiltreler'), LISTE.indexOf('const gecer'));
  assert.ok(!/bolumAlani/.test(kanonik), 'çipler eleme filtresine girmemeli');
});

test('bölüm sayfası kanonik bölüm parametresini açıyor', () => {
  const BOLUM = oku('src/components/BolumIcerik.tsx');
  /*
    HEDEF `/` — bir ara `/staj-ilanlari` yazmıştım ve tarayıcıda
    gördüm: o adres STATİK SEO sayfası ve filtre parametrelerini hiç
    okumuyor. Bağlantı çalışıyor gibi görünüp filtresiz sayfa açıyordu.
  */
  assert.match(BOLUM, /\/\?bolum=\$\{encodeURIComponent\(bolum\.slug\)\}/);
  /*
    Serbest `q` metni ARTIK YOK: "Makine" yazan bir `q`, başlığında
    "makine öğrenmesi" geçen yazılım ilanını da getiriyordu.
  */
  assert.ok(!/\/\?q=\$\{encodeURIComponent\(bolum\.aramaKelimeleri/.test(BOLUM));
  /* Adres sözleşmesi aynı sözlükten okunuyor. */
  assert.deepEqual(adresTenFiltreler('?bolum=bilgisayar-muhendisligi').departments, [
    'bilgisayar-muhendisligi',
  ]);
});

test('diğer filtrelerin anlamı değişmiyor', () => {
  const remote = ilaniNormalize({
    id: 'r',
    title: 'Stajyer',
    work_type: 'Remote',
    country_code: null,
  });
  assert.equal(aramaEslesiyorMu(remote, { country: 'remote' }), true);
  assert.equal(
    aramaEslesiyorMu(
      ilaniNormalize({ id: 'o', title: 'Stajyer', work_type: 'On-site', country_code: null }),
      { country: 'remote' }
    ),
    false
  );
  assert.equal(
    aramaEslesiyorMu(ilaniNormalize({ id: 'n', title: 'Stajyer', is_paid: null }), { pay: 'paid' }),
    false
  );
});

/* -------------------------------------------- STAJ TÜRÜ VERİ KAPANIŞI */

test('kanıtsız mandatory/voluntary true veya false kalmıyor', () => {
  const BETIK = oku('scripts/staj-turu-duzelt.mjs');
  /*
    ÖLÇÜLDÜ (14 Eylül 2026, üretim; kanıt havuzu description +
    insurance_note + source_title + raw): 122 true kaydın 3'ünde açık
    kabul kanıtı var, 119'unda YOK; 53 false kaydın hiçbirinde açık RET
    kanıtı yok. Geçen turda 119'u "doğrulanmış OLABİLİR" diye
    korumuştum — o bir kanıt değil.
  */
  assert.match(BETIK, /govde\.mandatory_staj_accepted = z\.deger/);
  assert.match(BETIK, /govde\.voluntary_staj_accepted = g\.deger/);
  /* Kanıt havuzu ham veriyi de kapsıyor. */
  assert.match(BETIK, /JSON\.stringify\(ilan\.raw \?\? \{\}\)/);
  assert.match(BETIK, /ilan\.source_title/);
  /* Ret önce bakılıyor: "zorunlu staj kabul edilmiyor" içinde
     "zorunlu staj" da geçiyor. */
  const karar = BETIK.slice(BETIK.indexOf('export function stajTuruKarari'));
  const retIndex = karar.indexOf('if (ret.test(metin))');
  const kabulIndex = karar.indexOf('if (kabul.test(metin))');
  assert.ok(retIndex > 0 && retIndex < kabulIndex, 'açık ret önce bakılmalı');
});

test('tek staj türü seçimi acceptance sonucu üretmiyor', () => {
  const FORM = oku('src/lib/ilan-formu.mjs');
  assert.match(FORM, /mandatory_staj_accepted: null/);
  assert.match(FORM, /voluntary_staj_accepted: null/);
  /* Eski türetme geri gelmesin. */
  assert.ok(
    !/mandatory_staj_accepted: tur === /.test(FORM),
    'tek seçimden türetme geri gelmemeli'
  );
  /* `term` hâlâ seçimden geliyor: o gerçekten ilanın dönemi. */
  assert.match(FORM, /term: tur === 'yaz' \? 'Summer 2026'/);
});

test('null ücret için metin ya da rozet çıkmıyor', () => {
  const DETAY = oku('src/components/ListingPage.tsx');
  /*
    "Ödeme bilgisi resmî kaynakta açıklanmamış" iki iddia taşıyordu:
    kaynağı inceledik VE kaynak susmuş. `is_paid = null` ikisini de
    söylemiyor.
  */
  assert.ok(
    !/'Ödeme bilgisi resmî kaynakta açıklanmamış\.'/.test(DETAY),
    'ödeme notu üretilmemeli'
  );
  assert.match(DETAY, /const eksikBilgiNotu = !sureMetni \?/);
  /* Kart da null için rozet çizmiyor. */
  const KART = oku('src/components/InternshipCard.tsx');
  assert.ok(!/\{listing\.stipend\.isPaid && \(/.test(KART));
});

test('içe aktarıcılar kanıt yoksa null yazıyor', () => {
  const PROMOTE = oku('automation/promote.py');
  assert.match(PROMOTE, /def detect_mandatory_staj\(description: str \| None\) -> tuple\[bool \| None, str \| None\]:/);
  assert.match(PROMOTE, /def detect_voluntary_staj\(description: str \| None\) -> bool \| None:/);
  /* "Kaynakta belirtilmemiş" notu artık üretilmiyor. */
  assert.ok(
    !/return False, "Kaynakta belirtilmemiş"/.test(PROMOTE),
    'kanıtsız False geri gelmemeli'
  );
  const KARIYER = oku('automation/kariyer_html_kosu.py');
  assert.ok(!/"mandatory_staj_accepted": False/.test(KARIYER));
  assert.ok(!/"voluntary_staj_accepted": True/.test(KARIYER));
});

test('form ücreti üç değerli: belirtilmeyecek ücretsiz değil', () => {
  const FORM = oku('src/lib/ilan-formu.mjs');
  assert.match(FORM, /\{ id: 'ucretsiz', etiket: 'Ücretsiz staj' \}/);
  assert.ok(
    !/is_paid: deger\.ucret !== 'belirtilmeyecek'/.test(FORM),
    'açıklamamak ücretsiz sayılmamalı'
  );
  assert.match(FORM, /deger\.ucret === 'belirtilmeyecek' \? null/);
});

test('açık bölüm filtresi açıklama sinyaliyle yanlış ilan sokmuyor', () => {
  /*
    CANLIDA ÖLÇTÜM: `?bolum=bilgisayar-muhendisligi` sonucunda
    "2027 Bahar Dönemi Staj — İnsan Kaynakları" ilanı da geliyordu,
    çünkü açıklamasında yazılımdan söz ediliyor.

    Açıklama bir ilanın NE OLDUĞUNU değil neyden bahsettiğini söylüyor.
    Filtrede eleme kararı veriyor ve yanlış ilanı listeye sokuyordu;
    SIRALAMADA ise zararsız (ağırlık 1, ilan gizlenmiyor).
  */
  const f = { departments: ['bilgisayar-muhendisligi'] };
  const ik = ilaniNormalize({
    id: 'ik',
    title: '2027 Bahar Dönemi Staj — İnsan Kaynakları',
    description: 'yazılım ekipleriyle çalışacak',
  });
  assert.equal(aramaEslesiyorMu(ik, f), false, 'açıklama filtreye girmemeli');
  /* Ama sıralamada hâlâ sinyal — ilan gizlenmiyor, altta kalıyor. */
  assert.equal(
    bolumSkoru({ id: 'ik', title: 'İnsan Kaynakları Stajyeri', description: 'yazılım' }, 'yazilim'),
    1
  );
  /* Başlık ve etiket filtrede geçerli. */
  assert.equal(
    aramaEslesiyorMu(ilaniNormalize({ id: 'y', title: 'Bilgi Teknolojileri Stajyeri' }), f),
    true
  );
});

test('SGK tek başına mandatory=true üretmiyor', () => {
  /*
    ÖLÇÜLDÜ (14 Eylül 2026, üretim, 3 kayıt): birinde tek kanıt
    "okulu tarafından SGK'sı karşılanan" cümlesiydi. O cümle sigortanın
    KİM tarafından yapıldığını anlatıyor; stajın ZORUNLU olup
    olmadığını anlatmıyor. Kayıt bu yüzden true görünüyordu.

    Bilgi silinmedi: `insurance_provider = 'universite'` olarak doğru
    alana taşındı (üretimde uygulandı).
  */
  const BETIK = oku('scripts/staj-turu-duzelt.mjs');
  const kalipSatiri = BETIK.split('\n').find((s) => s.includes('|isletmede mesleki egitim|'));
  assert.ok(kalipSatiri, 'zorunlu kalıbı bulunamadı');
  assert.ok(!/sgk/i.test(kalipSatiri), 'SGK zorunlu kalıbında olmamalı');
  assert.ok(!/staj sigortasi/.test(kalipSatiri), 'sigorta ifadesi zorunlu kalıbında olmamalı');
  assert.ok(kalipSatiri.includes('zorunlu staj'), 'gerçek kanıt kalıpta kalmalı');

  /* Sigorta kararı ayrı fonksiyonda ve kanıt yoksa DOKUNMUYOR. */
  assert.match(BETIK, /export function sigortaKarari\(ilan\)/);
  assert.match(BETIK, /if \(sig !== null && sig !== ilan\.insurance_provider\)/);

  /* İçe aktarıcıda da ayrı. */
  const PROMOTE = oku('automation/promote.py');
  assert.match(PROMOTE, /def detect_insurance_provider\(description: str \| None\) -> str \| None:/);
  /*
    YORUMSUZ KONTROL

    İlk hâlde fonksiyonun tamamında arıyordum ve kendi açıklama
    yorumumla eşleşiyordu ("SGK ... ARTIK KANIT DEGIL"). Yorumlar
    niyeti anlatıyor, kalıbı değil.
  */
  const zorunlu = PROMOTE.slice(
    PROMOTE.indexOf('def detect_mandatory_staj'),
    PROMOTE.indexOf('def detect_insurance_provider')
  )
    .replace(/\"\"\"[\s\S]*?\"\"\"/g, ' ')
    .replace(/^\s*#.*$/gm, ' ');
  assert.ok(!/sgk/i.test(zorunlu), 'SGK zorunlu dedektöründe olmamalı');
});

test('staj arama metni Fırsatlar verisine uygulanmıyor', () => {
  /*
    `searchQuery` fırsatların başlık/kurum/özetinde aranıyor ve sonuç
    "aynı aramayla eşleşen N öğrenci fırsatı" diye sunuluyordu. Staj
    araması ("yazılım stajyeri") burs verisinde anlamlı eşleşme
    üretmiyor; ürettiğinde de tesadüfi.

    Sayılan tek şey: sistemde AÇIK fırsat var mı.
  */
  const kod = yorumsuz(LISTE);
  const etki = kod.slice(kod.indexOf('void fetchOpportunities()'), kod.indexOf('}, [sonucYok]'));
  assert.ok(!/searchQuery/.test(etki), 'arama terimi fırsat verisine uygulanmamalı');
  assert.match(etki, /setFirsatSayisi\(hepsi\.length\)/);
  /* Adres de terimsiz. */
  assert.match(kod, /onFirsatlaraGit=\{\(\) => onNavigate\?\.\('\/firsatlar'\)\}/);
  /* Metin "eşleşen" demiyor. */
  assert.ok(!/Aynı aramayla eşleşen/.test(SONUCYOK));
  assert.match(SONUCYOK, /Açık öğrenci fırsatlarına bak/);
  /* Aktif fırsat yoksa bağlantı gizli. */
  assert.match(SONUCYOK, /\{firsatSayisi !== null && firsatSayisi > 0 && \(/);
});
