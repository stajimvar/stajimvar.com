/**
 * İlan kataloğu dry-run — SALT OKUNUR.
 *
 * ÜRETİM VERİSİNE HİÇBİR ŞEY YAZMIYOR. Bu dosyada insert, update,
 * delete, upsert ve yazan rpc çağrısı YOK; aşağıdaki `yasak` kapısı
 * bunu koşu anında da sınıyor.
 *
 * NEDEN ÜÇ AYRI KOMUT
 * -------------------
 * Tekrarlanabilirlik, sınıflandırma mantığının kararlı olduğunu
 * kanıtlamak için yapılıyor — ağın ya da veritabanının o anki hâlini
 * ölçmek için değil. Bu yüzden dış dünyadan gelen HER ŞEY önce
 * dondurulup hash'leniyor, iki koşu da aynı donmuş girdiyi okuyor:
 *
 *   1) veri-snapshot   : katalog satırları bir kez okunur, dondurulur
 *   2) url-snapshot    : başvuru bağlantıları bir kez ölçülür, dondurulur
 *   3) kosu            : yalnız bu iki dosyayı okur, ağa ÇIKMAZ
 *
 * Gecelik kaynak kontrolü (cron 40 4 * * *) iki koşu arasında çalışsaydı
 * ve koşular canlı veritabanını okusaydı, diff kendiliğinden dolu
 * çıkardı ve hiçbir şey kanıtlanmış olmazdı. Ölçüldü: 21 Eylül sabahı
 * o iş 33 kaydı kapattı.
 *
 * SÖZLÜK YENİDEN YAZILMADI
 * ------------------------
 * Şehir kuralı `src/lib/il-bul.mjs` içinde ZATEN var ve ürün tarafı
 * (sehir.ts, ilan-cografyasi.mjs, MatchedInternshipsView) onu
 * kullanıyor. Buraya ikinci bir sözlük yazmak, iki kuralın zamanla
 * ayrışması demekti. `ilBul` ayrıca bulamadığında `null` dönüyor,
 * tahmin uydurmuyor — sözleşmenin istediği davranış bu.
 *
 * Kullanım:
 *   node scripts/ilan-katalog-dryrun.mjs veri-snapshot  [--cikti DIZIN]
 *   node scripts/ilan-katalog-dryrun.mjs url-snapshot   [--cikti DIZIN]
 *   node scripts/ilan-katalog-dryrun.mjs kosu --etiket birinci [--cikti DIZIN]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { ILCE_IL, ONEK, TR_ILLERI, ilBul, katla } from '../src/lib/il-bul.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/*
  Sözlük sürümü: sınıflandırma kuralı değişirse ARTAR.

  2 (21 Eylül 2026, kullanıcı kararları K1-K3):
    · kaynak_durumu üç değer: acik | belirsiz | erisilemedi
    · staj ile erken kariyer işaretini birlikte taşıyan kayıt
      otomatik sınıflandırılmıyor; kanıt aranıyor, yoksa NULL
    · TR dışı şehir normalize EDİLMİYOR (kapsam kararı)
*/
export const SOZLUK_SURUMU = 2;

/* ------------------------------------------------------------------ */
/*  YAZMA KAPISI                                                       */
/* ------------------------------------------------------------------ */

/*
  Betiğin kendi kaynağı taranıyor: yazan bir çağrı eklenirse koşu
  BAŞLAMADAN düşüyor.

  `crypto.createHash(...).update(...)` DIŞARIDA: ilk sürümde kapı tam
  buna takıldı ve koşu hiç başlamadı. Karışıklık gerçek — `.update(`
  hem karma hem veritabanı yazması olabiliyor — bu yüzden ayrım
  satırdaki karma bağlamına bakılarak yapılıyor, kalıp gevşetilerek
  değil.
*/
export function yorumsuz(kaynak) {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/*
  KAPI KALIBI ÜÇ KEZ YANLIŞ ALARM VERDİ, SONRA DOĞRU ŞEYİ ÖLÇTÜ.

  Önce `.update(` aranıyordu: `crypto.createHash(...).update(...)`
  yazma sanıldı. Sonra satırda `createHash` geçiyorsa atlandı: bu kez
  kapının KENDİ AÇIKLAMA YORUMU yakalandı. Yorumlar ayıklandı; bu kez
  zincir satıra bölününce `.update(` satırında `createHash` kalmadı.

  Üçünün ortak sebebi aynı: ölçülen şey yanlıştı. `.update(` bir
  yazma DEĞİL; yazma, Supabase istemcisinin TABLO zinciridir. Kalıp
  artık onu arıyor — `.from(...)` ile bir yazma fiilinin aynı ifadede
  buluşmasını. Karma zincirlerinde `.from(` hiç geçmiyor, yani yanlış
  alarm yapısal olarak imkânsız. Kalıp GEVŞETİLMEDİ, hedefi düzeldi.
*/
const TABLO_YAZMASI = /\.from\s*\([^)]*\)[\s\S]{0,300}?\.(insert|update|upsert|delete)\s*\(/;

function yazmaKapisi() {
  const kendi = yorumsuz(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8'));
  const yasak = TABLO_YAZMASI.exec(kendi);
  if (yasak) {
    console.error(`YAZMA KAPISI: bu betik salt okunur olmalı, bulunan: ${yasak[0].slice(0, 120)}`);
    process.exit(1);
  }
  /* Bu betik hiçbir RPC çağırmıyor; çağıran biri eklerse görülsün. */
  if (/\.rpc\s*\(/.test(kendi)) {
    console.error('YAZMA KAPISI: dry-run betiği RPC çağırmamalı.');
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ */
/*  ORTAK                                                              */
/* ------------------------------------------------------------------ */

function ortamOku() {
  const dosya = path.join(KOK, 'automation', '.env');
  if (!fs.existsSync(dosya)) return {};
  const cikti = {};
  for (const satir of fs.readFileSync(dosya, 'utf8').split('\n')) {
    const esles = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (esles) cikti[esles[1]] = esles[2].replace(/^["']|["']$/g, '');
  }
  return cikti;
}

const hash = (deger) =>
  crypto.createHash('sha256').update(typeof deger === 'string' ? deger : JSON.stringify(deger)).digest('hex');

/** Anahtarları sıralı yazıyor: aynı içerik her zaman aynı baytları üretsin. */
function duzenliJson(deger) {
  if (Array.isArray(deger)) return deger.map(duzenliJson);
  if (deger && typeof deger === 'object') {
    const cikti = {};
    for (const anahtar of Object.keys(deger).sort()) cikti[anahtar] = duzenliJson(deger[anahtar]);
    return cikti;
  }
  return deger;
}

const yaz = (yol, veri) => {
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  fs.writeFileSync(yol, `${JSON.stringify(duzenliJson(veri), null, 2)}\n`);
};

const oku = (yol) => JSON.parse(fs.readFileSync(yol, 'utf8'));

/* ------------------------------------------------------------------ */
/*  1) VERİ SNAPSHOT                                                   */
/* ------------------------------------------------------------------ */

/*
  KATALOG TANIMI — Madde 5, onaylanan C seçeneği.

  Ülke burada SÜZÜLMÜYOR: ülke bir görüntü süzgeci, katalog tanımının
  parçası değil. Süresi geçmiş ilan katalog dışında ama SİLİNMİYOR;
  kendi kaydı ve adresi duruyor.
*/
function katalogda(satir, bugun) {
  if (satir.status !== 'published') return false;
  if (satir.application_deadline && satir.application_deadline < bugun) return false;
  return true;
}

const SECIM =
  'id,title,description,city,country_code,work_type,status,application_deadline,' +
  'apply_url,application_method,source_status,source_verified_at,category,term,origin';

/*
  KANONİK HAM HASH — SINIFLANDIRMAYI BESLEYEN ALANLARIN PARMAK İZİ

  Kimlik kümesinin aynı kalması YETMİYOR. Aynı ilan kimlikleri
  dururken `city` ya da `title` değişirse, snapshot'tan çıkan karar
  artık o satırın gerçeğini anlatmıyor ve bayat sınıflandırma canlıya
  yazılabiliyor. Bu hash o boşluğu kapatıyor: yazımdan hemen önce
  canlıdan yeniden okunup karşılaştırılıyor, ayrıca RPC transaction'ı
  İÇİNDE bir kez daha doğrulanıyor (yarış koşusu).

  ALAN SIRASI SABİT ve SQL karşılığıyla birebir aynı olmak zorunda
  (bkz. 20261024010000 göçündeki `ham_hash` ifadesi). Sıra değişirse
  iki taraf ayrışır ve kapı sessizce her şeyi reddeder.

  AYIRAÇ `` (unit separator): metin alanlarında geçme ihtimali
  yok. Virgül ya da boşluk seçilseydi "a,b" ile "a","b" aynı hash'i
  üretebilirdi.

  HER ALAN COALESCE EDİLİYOR: Postgres'in `concat_ws` işlevi NULL
  argümanları ATLIYOR — ayıracı da basmıyor. Tek NULL, bütün dizeyi
  kaydırıp iki tarafı ayrıştırırdı.
*/
export const HAM_ALANLAR = Object.freeze([
  'id', 'status', 'application_deadline', 'country_code', 'city',
  'work_type', 'application_method', 'source_status', 'apply_url',
  'title', 'description',
]);

export function hamHash(satir) {
  const parcalar = HAM_ALANLAR.map((a) => {
    const d = satir[a];
    return d === null || d === undefined ? '' : String(d);
  });
  return crypto.createHash('md5').update(parcalar.join(''), 'utf8').digest('hex');
}

async function veriSnapshot(ciktiDizin) {
  const ortam = { ...ortamOku(), ...process.env };
  if (!ortam.SUPABASE_URL || !ortam.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (automation/.env).');
    process.exit(1);
  }
  const db = createClient(ortam.SUPABASE_URL, ortam.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await db.from('listings').select(SECIM).eq('status', 'published');
  if (error) {
    console.error(`Okuma başarısız: ${error.message}`);
    process.exit(1);
  }

  const bugun = new Date().toISOString().slice(0, 10);
  const satirlar = (data ?? [])
    .filter((s) => katalogda(s, bugun))
    /* Kimliğe göre sıralanıyor: sunucu sırası değişse de dosya aynı kalsın. */
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const govde = duzenliJson(satirlar);
  /*
    Satır bazlı ham hash'ler ve onların toplamı. Toplam, satır
    hash'lerinin kimliğe göre sıralanmış birleşimi — yani hem içerik
    hem küme değişikliğini yakalıyor.
  */
  const hamHashler = {};
  for (const s of satirlar) hamHashler[s.id] = hamHash(s);
  const hamToplam = crypto
    .createHash('md5')
    .update(Object.keys(hamHashler).sort().map((id) => `${id}:${hamHashler[id]}`).join('\n'), 'utf8')
    .digest('hex');

  const kap = {
    uretim_ani: new Date().toISOString(),
    bugun,
    katalog_tanimi: "status='published' AND NOT (application_deadline IS NOT NULL AND application_deadline < current_date)",
    satir_sayisi: satirlar.length,
    veri_hash: hash(govde),
    ham_alanlar: [...HAM_ALANLAR],
    ham_hashler: duzenliJson(hamHashler),
    ham_toplam: hamToplam,
    satirlar: govde,
  };
  const yol = path.join(ciktiDizin, 'veri-snapshot.json');
  yaz(yol, kap);
  console.log(`veri-snapshot: ${satirlar.length} satır`);
  console.log(`  hash     : ${kap.veri_hash}`);
  console.log(`  ham_toplam: ${kap.ham_toplam}`);
  console.log(`  dosya: ${path.relative(KOK, yol)}`);
}

/* ------------------------------------------------------------------ */
/*  2) URL SNAPSHOT                                                    */
/* ------------------------------------------------------------------ */

const ZAMAN_ASIMI_MS = 15000;
const YONLENDIRME_SINIRI = 5;
const ALAN_BEKLEME_MS = 1500;

/*
  Yalnız HEAD ve GET. Form gönderme ve oturum açma YOK: dışarıdaki
  sisteme yan etki bırakmak bu işin kapsamı değil.
*/
async function urlSagligi(adres, alanSon) {
  let hedef = adres;
  const kok = (() => {
    try { return new URL(adres).hostname; } catch { return null; }
  })();
  if (!kok) return { sonuc: 'dogrulanamadi', sebep: 'adres ayrıştırılamadı', son_adres: null, http: null };

  const bekle = (alanSon.get(kok) ?? 0) + ALAN_BEKLEME_MS - Date.now();
  if (bekle > 0) await new Promise((r) => setTimeout(r, bekle));
  alanSon.set(kok, Date.now());

  for (let adim = 0; adim <= YONLENDIRME_SINIRI; adim += 1) {
    const kontrol = new AbortController();
    const saat = setTimeout(() => kontrol.abort(), ZAMAN_ASIMI_MS);
    let yanit;
    try {
      yanit = await fetch(hedef, {
        method: adim === 0 ? 'HEAD' : 'GET',
        redirect: 'manual',
        signal: kontrol.signal,
        headers: { 'User-Agent': 'StajimVarBot/1.0 (+https://stajimvar.com)' },
      });
    } catch (e) {
      clearTimeout(saat);
      return { sonuc: 'dogrulanamadi', sebep: e.name === 'AbortError' ? 'zaman aşımı' : 'ağ hatası', son_adres: hedef, http: null };
    }
    clearTimeout(saat);

    if (yanit.status >= 300 && yanit.status < 400) {
      const sonraki = yanit.headers.get('location');
      if (!sonraki) return { sonuc: 'dogrulanamadi', sebep: `${yanit.status} ama adres yok`, son_adres: hedef, http: yanit.status };
      hedef = new URL(sonraki, hedef).toString();
      continue;
    }

    /* HEAD'i kabul etmeyen sunucular var; 405/501'de GET ile bir kez daha. */
    if ((yanit.status === 405 || yanit.status === 501) && adim === 0) { continue; }

    if (yanit.status === 404 || yanit.status === 410) {
      return { sonuc: 'kirik', sebep: `HTTP ${yanit.status}`, son_adres: hedef, http: yanit.status };
    }
    if (yanit.ok) {
      return { sonuc: 'gecerli', sebep: `HTTP ${yanit.status}`, son_adres: hedef, http: yanit.status };
    }
    /*
      403/429/5xx KIRIK SAYILMIYOR: bunlar bot engeli ya da geçici
      sunucu hatası olabilir ve ilan hakkında bir şey söylemiyor.
    */
    return { sonuc: 'dogrulanamadi', sebep: `HTTP ${yanit.status}`, son_adres: hedef, http: yanit.status };
  }
  return { sonuc: 'dogrulanamadi', sebep: 'yönlendirme sınırı aşıldı', son_adres: hedef, http: null };
}

async function urlSnapshot(ciktiDizin) {
  const veriYolu = path.join(ciktiDizin, 'veri-snapshot.json');
  if (!fs.existsSync(veriYolu)) {
    console.error(`Önce veri-snapshot gerekli: ${path.relative(KOK, veriYolu)}`);
    process.exit(1);
  }
  const veri = oku(veriYolu);
  const alanSon = new Map();
  const sonuclar = {};

  let sira = 0;
  for (const satir of veri.satirlar) {
    sira += 1;
    const adres = satir.apply_url;
    if (!adres || !String(adres).trim()) {
      sonuclar[satir.id] = { sonuc: 'dogrulanamadi', sebep: 'adres yok', son_adres: null, http: null };
      continue;
    }
    sonuclar[satir.id] = await urlSagligi(String(adres).trim(), alanSon);
    process.stdout.write(`  ${sira}/${veri.satirlar.length}\r`);
  }

  const govde = duzenliJson(sonuclar);
  const kap = {
    uretim_ani: new Date().toISOString(),
    veri_hash: veri.veri_hash,
    zaman_asimi_ms: ZAMAN_ASIMI_MS,
    yonlendirme_siniri: YONLENDIRME_SINIRI,
    alan_bekleme_ms: ALAN_BEKLEME_MS,
    yontem: 'HEAD, gerekirse GET; form gönderme ve oturum açma yok',
    url_hash: hash(govde),
    sonuclar: govde,
  };
  const yol = path.join(ciktiDizin, 'url-snapshot.json');
  yaz(yol, kap);

  const say = {};
  for (const s of Object.values(sonuclar)) say[s.sonuc] = (say[s.sonuc] ?? 0) + 1;
  console.log(`\nurl-snapshot: ${Object.keys(sonuclar).length} bağlantı`);
  console.log(`  ${Object.entries(say).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
  console.log(`  hash : ${kap.url_hash}`);
  console.log(`  dosya: ${path.relative(KOK, yol)}`);
}

/* ------------------------------------------------------------------ */
/*  3) SINIFLANDIRMA                                                   */
/* ------------------------------------------------------------------ */

/** Ham metindeki ilçe adı; `ilBul` ili verdi ama ilçeyi vermiyor. */
export function ilceBul(ham, il) {
  if (!ham || !il) return null;
  const temiz = katla(String(ham).replace(ONEK, ''));
  for (const [ilce, ili] of Object.entries(ILCE_IL)) {
    if (ili !== il) continue;
    if (new RegExp(`(^|[^a-z0-9])${ilce}([^a-z0-9]|$)`).test(temiz)) return ilce;
  }
  return null;
}

const UZAKTAN_IZI = /(^|[^a-z])(remote|uzaktan|home\s*office|telework)([^a-z]|$)/i;

/**
 * Şehir kararı.
 *
 * `il` YALNIZ Türkiye için üretiliyor — sözleşmede il, 81 ilden biri.
 * TR dışı ilanda ham şehir korunuyor ve il `null` kalıyor; bu bir
 * eksiklik değil, şemanın sınırı. TR dışı yinelenen şehir adları
 * (Munich/München, Cologne/Köln) raporda AYRI BİR BULGU olarak
 * çıkıyor, burada sessizce normalize edilmiyor.
 */
export function sehirKarari(satir) {
  const ham = satir.city == null ? null : String(satir.city).trim();
  const uzaktanIz = (ham && UZAKTAN_IZI.test(ham)) || satir.work_type === 'Remote';
  const uzaktan = uzaktanIz ? true : satir.work_type === 'On-site' || satir.work_type === 'Hybrid' ? false : null;

  if (!ham) {
    return { il: null, ilce: null, uzaktan, guven: 0, gerekce: 'şehir alanı boş', aksiyon: 'etiket' };
  }
  if (satir.country_code !== 'TR') {
    return {
      il: null, ilce: null, uzaktan, guven: 0,
      gerekce: `TR dışı (${satir.country_code ?? 'ülke yok'}) — il şeması Türkiye'ye özgü`,
      aksiyon: 'dokunma',
    };
  }

  const il = ilBul(ham);
  if (!il) {
    return { il: null, ilce: null, uzaktan, guven: 0, gerekce: `il çözülemedi: "${ham}"`, aksiyon: 'etiket' };
  }
  const ilce = ilceBul(ham, il);
  const tamEslesme = TR_ILLERI.some((i) => katla(i) === katla(ham));
  return {
    il,
    ilce,
    uzaktan,
    guven: tamEslesme ? 1 : 0.8,
    gerekce: tamEslesme ? 'ham metin il adının kendisi' : `serbest metinden çözüldü: "${ham}" → ${il}${ilce ? ` / ${ilce}` : ''}`,
    aksiyon: 'normalize',
  };
}

/*
  İLAN TÜRÜ

  Sıra ÖNEMLİ ve sabit: mt → erken_kariyer/trainee → uzun_donem → staj.
  "Uzun Dönem Stajyer" hem staja hem uzun döneme uyuyor; uzun dönem
  daha belirleyici olduğu için önce bakılıyor. Sıra değişirse sözlük
  sürümü artar.

  Başlık tek başına yetmezse `description` okunuyor. İkisi de kanıt
  vermiyorsa tür NULL kalıyor — şirket türünden ya da sezgiden sınıf
  UYDURULMUYOR.
*/
const TUR_KURALLARI = [
  { tur: 'mt', iz: /(\(mt\)|management\s+trainee|y[öo]netici\s+aday)/i },
  { tur: 'erken_kariyer', iz: /(erken\s+kariyer|early\s+career|young\s+professional|genç\s+yetenek|genc\s+yetenek|yeni\s+mezun\s+program|graduate\s+program)/i },
  { tur: 'trainee', iz: /(^|[^a-z])trainee([^a-z]|$)|yeti[şs]tirme\s+program/i },
  { tur: 'uzun_donem', iz: /(uzun\s+d[öo]nem|long[-\s]?term)/i },
  { tur: 'staj', iz: /(staj|intern(ship)?|praktikum|stage\b)/i },
];

/* Çakışmayı kuran iki aile. */
const STAJ_AILESI = /(staj|stajyer|intern(ship)?|praktikum)/i;
const ERKEN_AILESI = /(erken\s+kariyer|early\s+career|young\s+professional|genç\s+yetenek|genc\s+yetenek|yeni\s+mezun\s+program|graduate\s+program|management\s+trainee|y[öo]netici\s+aday|(^|[^a-z])trainee([^a-z]|$))/i;

/*
  ÇAKIŞMAYI ÇÖZEN KANIT: SÖZLEŞMELİ STAJ İZİ

  Yalnız "staj" kelimesinin geçmesi kanıt değil — çakışan kayıtta
  zaten geçiyor. Aranan şey ilanın OKUL STAJI olduğunu söyleyen
  somut ifade: zorunlu staj, staj sözleşmesi, staj sigortası, 3308
  sayılı kanun. Bunlar bir erken kariyer programında bulunmaz.
*/
const SOZLESMELI_STAJ_IZI =
  /(zorunlu\s+staj|staj\s+s[öo]zle[şs]mes|staj\s+sigortas|okul\s+staj|mandatory\s+internship|internship\s+agreement|3308)/i;

/**
 * İlan türü.
 *
 * ÇAKIŞMADA OTOMATİK ÖNCELİK YOK (kullanıcı kararı K2, 21 Eylül 2026).
 * "Genç Yetenek İş Analisti Stajyer Programı" hem staj hem erken
 * kariyer işareti taşıyor. Sıraya güvenip birini seçmek, kural
 * sırasının kaydın gerçeğinden daha belirleyici olması demekti:
 * sıra değişince ilanın türü değişirdi. Onun yerine kanıt aranıyor;
 * kanıt yoksa tür NULL kalıyor ve kayıt inceleme adayı oluyor.
 */
export function turKarari(satir) {
  const baslik = String(satir.title ?? '');
  const metin = String(satir.description ?? '');

  if (STAJ_AILESI.test(baslik) && ERKEN_AILESI.test(baslik)) {
    if (SOZLESMELI_STAJ_IZI.test(metin)) {
      return {
        ilan_tipi: 'staj',
        guven: 0.7,
        gerekce: 'başlıkta staj ve erken kariyer izi birlikte; ilan metninde sözleşmeli staj kanıtı var',
        aksiyon: 'normalize',
        kaynak: 'description',
      };
    }
    return {
      ilan_tipi: null,
      guven: 0,
      gerekce: 'başlıkta staj ve erken kariyer izi birlikte; metinde sözleşmeli staj kanıtı yok — inceleme adayı',
      aksiyon: 'etiket',
      kaynak: 'cakisma',
    };
  }

  for (const kural of TUR_KURALLARI) {
    if (kural.iz.test(baslik)) {
      return { ilan_tipi: kural.tur, guven: 0.9, gerekce: `başlıkta "${kural.tur}" izi`, aksiyon: 'normalize', kaynak: 'baslik' };
    }
  }
  if (metin.trim()) {
    for (const kural of TUR_KURALLARI) {
      if (kural.iz.test(metin)) {
        return { ilan_tipi: kural.tur, guven: 0.6, gerekce: `ilan metninde "${kural.tur}" izi`, aksiyon: 'normalize', kaynak: 'description' };
      }
    }
  }
  return {
    ilan_tipi: null,
    guven: 0,
    gerekce: metin.trim() ? 'ne başlıkta ne metinde tür izi yok' : 'başlıkta iz yok, ilan metni boş',
    aksiyon: 'etiket',
    kaynak: 'yok',
  };
}

/**
 * Kaynak doğrulama — ÜÇ DEĞER (kullanıcı kararı K1, 21 Eylül 2026).
 *
 *   acik        kaynak sayfası ilanın hâlâ orada olduğunu kanıtladı
 *   belirsiz    kaynağa ULAŞILDI ama açık olduğuna yeterli kanıt yok
 *   erisilemedi kaynağa TEKNİK OLARAK ulaşılamadı (bot engeli, zaman
 *               aşımı, 5xx)
 *
 * İlk sürümde `erisilemedi` sessizce `belirsiz`e katlanıyordu ve
 * ölçüldü: katalogdaki 7 kayıt bu yüzden yanlış kutuya düşüyordu.
 * "Ulaşamadık" ile "ulaştık, kanıt bulamadık" farklı şeyler;
 * birincisi bizim tarafımızın sorunu, ikincisi ilanın.
 *
 * `kapali` bu üçlüye ZORLA KATILMIYOR: kapanma katalog dışı bir kayıt
 * durumu ve `status` alanında zaten yaşıyor. Ham `source_status` her
 * durumda olduğu gibi korunuyor.
 */
export function kaynakKarari(satir) {
  const ham = satir.source_status;
  if (ham === 'acik') return { kaynak_durumu: 'acik', gerekce: 'source_status=acik' };
  if (ham === 'belirsiz') return { kaynak_durumu: 'belirsiz', gerekce: 'source_status=belirsiz' };
  if (ham === 'erisilemedi') return { kaynak_durumu: 'erisilemedi', gerekce: 'source_status=erisilemedi (teknik erişim sorunu)' };
  if (ham === 'kapali') return { kaynak_durumu: null, gerekce: 'source_status=kapali — kayıt durumu, doğrulama alanına katılmıyor' };
  if (ham == null) return { kaynak_durumu: null, gerekce: 'hiç kontrol edilmemiş (source_status NULL)' };
  return { kaynak_durumu: null, gerekce: `tanınmayan source_status: ${ham} — sınıflandırılmadı` };
}

const YONTEM_ESLEME = { external: 'external', email_application: 'email', internal: 'native' };

function kosu(ciktiDizin, etiket) {
  const veriYolu = path.join(ciktiDizin, 'veri-snapshot.json');
  const urlYolu = path.join(ciktiDizin, 'url-snapshot.json');
  for (const y of [veriYolu, urlYolu]) {
    if (!fs.existsSync(y)) {
      console.error(`Eksik snapshot: ${path.relative(KOK, y)}`);
      process.exit(1);
    }
  }
  const veri = oku(veriYolu);
  const url = oku(urlYolu);
  if (url.veri_hash !== veri.veri_hash) {
    console.error('URL snapshot başka bir veri snapshot için üretilmiş; koşu durdu.');
    process.exit(1);
  }

  const satirlar = veri.satirlar.map((satir) => {
    const sehir = sehirKarari(satir);
    const tur = turKarari(satir);
    const kaynak = kaynakKarari(satir);
    const u = url.sonuclar[satir.id] ?? { sonuc: 'dogrulanamadi', sebep: 'snapshot dışı' };
    const aksiyonlar = [sehir.aksiyon, tur.aksiyon];
    return {
      id: satir.id,
      ham: {
        title: satir.title,
        city: satir.city,
        country_code: satir.country_code,
        work_type: satir.work_type,
        application_method: satir.application_method,
        source_status: satir.source_status,
        apply_url_var: Boolean(satir.apply_url && String(satir.apply_url).trim()),
      },
      onerilen: {
        il: sehir.il,
        ilce: sehir.ilce,
        uzaktan: sehir.uzaktan,
        ilan_tipi: tur.ilan_tipi,
        kaynak_durumu: kaynak.kaynak_durumu,
        apply_url_ok: u.sonuc,
        basvuru_yontemi: YONTEM_ESLEME[satir.application_method] ?? null,
      },
      gerekce: { sehir: sehir.gerekce, tur: tur.gerekce, kaynak: kaynak.gerekce, url: u.sebep },
      guven: { sehir: sehir.guven, tur: tur.guven },
      /* En zayıf halka kazanıyor: biri etiketse satır etiket. */
      aksiyon: aksiyonlar.includes('etiket') ? 'etiket' : aksiyonlar.includes('normalize') ? 'normalize' : 'dokunma',
      varsayilan_staj_listesinde: tur.ilan_tipi === 'staj' || tur.ilan_tipi === 'uzun_donem',
    };
  });

  const say = (fn) => satirlar.filter(fn).length;
  const grupla = (fn) => {
    const c = {};
    for (const s of satirlar) { const k = String(fn(s)); c[k] = (c[k] ?? 0) + 1; }
    return Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
  };

  const ozet = {
    sozluk_surumu: SOZLUK_SURUMU,
    veri_hash: veri.veri_hash,
    url_hash: url.url_hash,
    katalog_toplam: satirlar.length,
    aksiyon: grupla((s) => s.aksiyon),
    ilan_tipi: grupla((s) => s.onerilen.ilan_tipi),
    varsayilan_staj_listesi: say((s) => s.varsayilan_staj_listesinde),
    kaynak_durumu: grupla((s) => s.onerilen.kaynak_durumu),
    apply_url_ok: grupla((s) => s.onerilen.apply_url_ok),
    basvuru_yontemi: grupla((s) => s.onerilen.basvuru_yontemi),
    tr_il: grupla((s) => (s.ham.country_code === 'TR' ? s.onerilen.il : null)),
    tr_farkli_il_sayisi: new Set(satirlar.filter((s) => s.ham.country_code === 'TR' && s.onerilen.il).map((s) => s.onerilen.il)).size,
    tr_farkli_ham_sehir_sayisi: new Set(
      satirlar.filter((s) => s.ham.country_code === 'TR' && s.ham.city && String(s.ham.city).trim()).map((s) => String(s.ham.city).trim()),
    ).size,
    il_cozulemeyen: satirlar.filter((s) => s.ham.country_code === 'TR' && !s.onerilen.il).map((s) => ({ id: s.id, city: s.ham.city })),
    tur_cozulemeyen: satirlar.filter((s) => !s.onerilen.ilan_tipi).map((s) => ({ id: s.id, title: s.ham.title })),
    mt_ve_erken_kariyer: satirlar.filter((s) => ['mt', 'trainee', 'erken_kariyer'].includes(s.onerilen.ilan_tipi)).map((s) => ({ id: s.id, title: s.ham.title, tip: s.onerilen.ilan_tipi })),
    kirik_url: satirlar.filter((s) => s.onerilen.apply_url_ok === 'kirik').map((s) => ({ id: s.id, title: s.ham.title })),
  };

  /*
    Koşu anı ÖZETE GİRMİYOR: iki koşunun baytı birebir aynı olmalı.
    Zaman ayrı bir dosyada duruyor ve diff'e sokulmuyor.
  */
  yaz(path.join(ciktiDizin, `kosu-${etiket}.json`), { ozet, satirlar });
  yaz(path.join(ciktiDizin, `kosu-${etiket}.meta.json`), { etiket, kosu_ani: new Date().toISOString() });

  console.log(`kosu-${etiket}: ${satirlar.length} satır`);
  console.log(`  sözlük sürümü ${SOZLUK_SURUMU} · veri ${veri.veri_hash.slice(0, 12)} · url ${url.url_hash.slice(0, 12)}`);
  console.log(`  aksiyon: ${Object.entries(ozet.aksiyon).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
  console.log(`  çıktı hash: ${hash(duzenliJson({ ozet, satirlar }))}`);
}

/* ------------------------------------------------------------------ */

async function ana() {
  yazmaKapisi();
  const argv = process.argv.slice(2);
  const komut = argv[0];
  const ciktiIndeks = argv.indexOf('--cikti');
  const ciktiDizin = ciktiIndeks >= 0 ? path.resolve(argv[ciktiIndeks + 1]) : path.join(KOK, 'dry-run');
  const etiketIndeks = argv.indexOf('--etiket');
  const etiket = etiketIndeks >= 0 ? argv[etiketIndeks + 1] : 'birinci';

  if (komut === 'veri-snapshot') return veriSnapshot(ciktiDizin);
  if (komut === 'url-snapshot') return urlSnapshot(ciktiDizin);
  if (komut === 'kosu') return kosu(ciktiDizin, etiket);

  console.error('Kullanım: veri-snapshot | url-snapshot | kosu --etiket <ad>  [--cikti DIZIN]');
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await ana();
}
