/**
 * Normalize değerleri yazar — VARSAYILAN OLARAK YAZMAZ.
 *
 * Dry-run çıktısındaki önerilen değerleri `listings` üzerindeki ALTI
 * normalize kolona yazar. Başka hiçbir kolona dokunmaz.
 *
 * YAZILAN ALTI KOLON
 *   il · ilce · uzaktan · ilan_tipi · kaynak_durumu · apply_url_ok
 *
 * ASLA DOKUNULMAYANLAR
 *   ham kolonlar (city, title, category, term, source_status,
 *   apply_url, location_raw), `status`, `closed_at` ve
 *   `application_method`. Aşağıdaki `KOLON_KAPISI` bunu koşu anında
 *   sınıyor: izinli listenin dışında bir alan güncellemeye girerse
 *   betik yazmadan düşüyor.
 *
 * NEDEN VARSAYILAN DRY-RUN
 * ------------------------
 * Canlı yazım geri alınması pahalı bir iş. Bayraksız çalıştırma ne
 * yazacağını gösterir ve hiçbir şey yazmaz; yazmak için `--yaz`
 * gerekir. Yanlışlıkla çalıştırma sessizce veri değiştiremez.
 *
 * NEDEN TEK TRANSACTION
 * ---------------------
 * 188 satırın 100'ünü yazıp hata almak, yarısı normalize yarısı boş
 * bir katalog bırakırdı — hangi satırın yazıldığını kimse bilemezdi.
 * Hepsi ya da hiçbiri: `ilan_katalog_normalize_yaz` RPC'si tek
 * işlemde çalışıyor ve sayım tutmazsa `raise exception` ile geri
 * alıyor.
 *
 * NEDEN GERİ DÖNÜŞ SNAPSHOT'I
 * ---------------------------
 * Yazmadan önce altı kolonun MEVCUT değerleri dosyaya alınıyor.
 * İlk yazımda hepsi NULL olacak ama ikinci ve sonraki yazımlarda
 * öyle olmayacak; geri dönüş ancak eski değerler elde varsa mümkün.
 *
 * Kullanım:
 *   node scripts/ilan-katalog-yaz.mjs --kosu DIZIN --etiket taze-birinci
 *   node scripts/ilan-katalog-yaz.mjs --kosu DIZIN --etiket taze-birinci --yaz
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { hamHash } from './ilan-katalog-dryrun.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Yazılmasına izin verilen TEK alan kümesi. */
export const IZINLI_KOLONLAR = Object.freeze([
  'il', 'ilce', 'uzaktan', 'ilan_tipi', 'kaynak_durumu', 'apply_url_ok',
]);

/** Hiçbir koşulda güncellemeye giremeyecek alanlar. */
export const YASAK_KOLONLAR = Object.freeze([
  'status', 'closed_at', 'closure_reason', 'application_method',
  'city', 'title', 'category', 'term', 'source_status', 'apply_url',
  'location_raw', 'country_code', 'work_type', 'company_id', 'id',
]);

/**
 * Güncelleme gövdesinin sözleşmeye uyduğunu sınar.
 * Fazladan tek alan bile varsa yazma yapılmaz.
 */
export function kolonKapisi(govde) {
  const alanlar = Object.keys(govde);
  /*
    YASAK LİSTE ÖNCE BAKILIYOR.

    İlk sürümde izinli liste öndeydi ve `YASAK_KOLONLAR` hiç
    çalışmıyordu: izinli listede olmayan her alan zaten "izinsiz"
    diye düşüyordu, yani ikinci kapı ölü koddu — koruduğunu sandığımız
    ama hiçbir şey ölçmeyen bir kontrol. Test bunu yakaladı.

    Sıra tersine çevrildi çünkü `status` ya da `closed_at` gibi bir
    alanın güncellemeye sızması ile bilinmeyen bir alanın sızması
    aynı ağırlıkta değil: birincisi ilanı yayından kaldırabilir ve
    hata mesajının bunu ADIYLA söylemesi gerekiyor.
  */
  const yasak = alanlar.filter((a) => YASAK_KOLONLAR.includes(a));
  if (yasak.length) throw new Error(`KOLON KAPISI: yasak alan: ${yasak.join(', ')}`);
  const fazla = alanlar.filter((a) => !IZINLI_KOLONLAR.includes(a));
  if (fazla.length) throw new Error(`KOLON KAPISI: izinsiz alan: ${fazla.join(', ')}`);
  return govde;
}

const hash = (deger) =>
  crypto.createHash('sha256').update(typeof deger === 'string' ? deger : JSON.stringify(deger)).digest('hex');

function duzenliJson(deger) {
  if (Array.isArray(deger)) return deger.map(duzenliJson);
  if (deger && typeof deger === 'object') {
    const cikti = {};
    for (const anahtar of Object.keys(deger).sort()) cikti[anahtar] = duzenliJson(deger[anahtar]);
    return cikti;
  }
  return deger;
}

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

/** Aynı girdi ikinci kez yazılmaya çalışılırsa fark üretmemeli. */
export function ayniMi(mevcut, hedef) {
  return IZINLI_KOLONLAR.every((k) => (mevcut?.[k] ?? null) === (hedef[k] ?? null));
}

async function ana() {
  const argv = process.argv.slice(2);
  const al = (ad) => { const i = argv.indexOf(ad); return i >= 0 ? argv[i + 1] : null; };
  const kosuDizin = al('--kosu');
  const etiket = al('--etiket') ?? 'taze-birinci';
  const yaz = argv.includes('--yaz');

  if (!kosuDizin) {
    console.error('Kullanım: --kosu DIZIN --etiket <ad> [--yaz]');
    process.exit(1);
  }

  const kosuYolu = path.join(path.resolve(kosuDizin), `kosu-${etiket}.json`);
  const veriYolu = path.join(path.resolve(kosuDizin), 'veri-snapshot.json');
  for (const y of [kosuYolu, veriYolu]) {
    if (!fs.existsSync(y)) { console.error(`Eksik dosya: ${y}`); process.exit(1); }
  }
  const kosu = JSON.parse(fs.readFileSync(kosuYolu, 'utf8'));
  const veri = JSON.parse(fs.readFileSync(veriYolu, 'utf8'));

  if (kosu.ozet.veri_hash !== veri.veri_hash) {
    console.error('Koşu başka bir veri snapshot için üretilmiş; durdu.');
    process.exit(1);
  }

  const ortam = { ...ortamOku(), ...process.env };
  if (!ortam.SUPABASE_URL || !ortam.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
    process.exit(1);
  }
  const db = createClient(ortam.SUPABASE_URL, ortam.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  /* ---------------------------------------------------------------- */
  /*  1) HEDEF VERİTABANI HÂLÂ SNAPSHOT'TAKİ HÂLİNDE Mİ                */
  /* ---------------------------------------------------------------- */

  /*
    Snapshot alındıktan sonra gecelik iş çalışmış olabilir. O zaman
    yazacağımız değerler artık var olmayan bir katalogun değerleri
    olurdu. Kimlik kümesi ve satır sayısı birebir tutmazsa YAZILMIYOR.
  */
  /*
    İSTEMCİ AÇIKKEN `process.exit` ÇAĞRILMIYOR.

    Ölçüldü: Supabase istemcisi ayaktayken `process.exit(1)` Windows'ta
    libuv'den "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)"
    aldırıyor ve çıkış kodu 1 yerine 127 oluyor. 127 kabuklarda
    "komut bulunamadı" demek — yani gerçek bir kapı, CI'da kurulum
    hatası gibi okunuyordu. Bundan sonra `exitCode` kurulup normal
    dönülüyor; Node kendi kapanışını tamamlıyor.
  */
  const dur = (mesaj) => { console.error(mesaj); process.exitCode = 1; };

  /*
    HAM ALANLAR DA OKUNUYOR — KİMLİK KÜMESİ YETMİYOR.

    Önceki sürüm yalnız kimlikleri karşılaştırıyordu. Aynı ilan
    kimlikleri dururken `city` ya da `title` değişirse snapshot'tan
    çıkan karar o satırın gerçeğini anlatmıyor ve bayat sınıflandırma
    canlıya yazılabiliyordu. Artık sınıflandırmayı besleyen bütün ham
    alanlar yeniden okunup kanonik hash'le karşılaştırılıyor.
  */
  const { data: mevcutSatirlar, error: okumaHatasi } = await db
    .from('listings')
    .select(
      'id,status,application_deadline,country_code,city,work_type,application_method,' +
      'source_status,apply_url,title,description,' +
      'il,ilce,uzaktan,ilan_tipi,kaynak_durumu,apply_url_ok',
    )
    .eq('status', 'published');
  if (okumaHatasi) { dur(`Okuma başarısız: ${okumaHatasi.message}`); return; }

  const bugun = new Date().toISOString().slice(0, 10);
  const canliKatalog = (mevcutSatirlar ?? []).filter(
    (s) => !(s.application_deadline && s.application_deadline < bugun),
  );
  const canliKimlikler = new Set(canliKatalog.map((s) => s.id));
  const snapshotKimlikler = new Set(veri.satirlar.map((s) => s.id));

  const eksik = [...snapshotKimlikler].filter((id) => !canliKimlikler.has(id));
  const fazla = [...canliKimlikler].filter((id) => !snapshotKimlikler.has(id));

  console.log('— HEDEF DOĞRULAMA —');
  console.log(`  snapshot satır ...... ${snapshotKimlikler.size}`);
  console.log(`  canlı katalog satır . ${canliKimlikler.size}`);
  console.log(`  snapshot'ta olup canlıda olmayan . ${eksik.length}`);
  console.log(`  canlıda olup snapshot'ta olmayan . ${fazla.length}`);

  if (eksik.length || fazla.length || canliKimlikler.size !== snapshotKimlikler.size) {
    dur('\nDURDU: canlı katalog snapshot ile aynı değil. Snapshot yenilenmeli.');
    return;
  }

  /* ---------------------------------------------------------------- */
  /*  1b) HAM ALANLAR SNAPSHOT'TAKİ HÂLİNDE Mİ                         */
  /* ---------------------------------------------------------------- */

  /*
    Kimlik kümesi aynı ama içerik değişmiş olabilir. Bu kapı onu
    yakalıyor. Snapshot'ta `ham_hashler` yoksa dosya eski biçimde
    demektir ve yazım yapılmıyor — sessizce zayıf kapıyla devam
    etmektense durmak doğru.
  */
  if (!veri.ham_hashler || !veri.ham_toplam) {
    dur('\nDURDU: snapshot ham hash taşımıyor (eski biçim). Snapshot yenilenmeli.');
    return;
  }

  const canliHamHashler = {};
  for (const s of canliKatalog) canliHamHashler[s.id] = hamHash(s);

  const bozuk = [...snapshotKimlikler].filter((id) => canliHamHashler[id] !== veri.ham_hashler[id]);

  const canliHamToplam = crypto
    .createHash('md5')
    .update(Object.keys(canliHamHashler).sort().map((id) => `${id}:${canliHamHashler[id]}`).join('\n'), 'utf8')
    .digest('hex');

  console.log(`  ham alanı değişmiş satır ......... ${bozuk.length}`);
  console.log(`  ham toplam snapshot .............. ${veri.ham_toplam}`);
  console.log(`  ham toplam canlı ................. ${canliHamToplam}`);

  if (bozuk.length || canliHamToplam !== veri.ham_toplam) {
    dur(
      `\nDURDU: ham veri snapshot'tan farklı (${bozuk.length} satır). ` +
      'Sınıflandırma bayat; snapshot ve dry-run yenilenmeli.',
    );
    return;
  }

  /* ---------------------------------------------------------------- */
  /*  2) GÜNCELLEME GÖVDELERİ VE İDEMPOTENTLİK                         */
  /* ---------------------------------------------------------------- */

  const mevcutIndeks = new Map(canliKatalog.map((s) => [s.id, s]));
  const guncellemeler = [];
  let degismeyen = 0;

  for (const satir of kosu.satirlar) {
    const hedef = kolonKapisi({
      il: satir.onerilen.il ?? null,
      ilce: satir.onerilen.ilce ?? null,
      uzaktan: satir.onerilen.uzaktan ?? null,
      ilan_tipi: satir.onerilen.ilan_tipi ?? null,
      kaynak_durumu: satir.onerilen.kaynak_durumu ?? null,
      apply_url_ok: satir.onerilen.apply_url_ok ?? null,
    });
    if (ayniMi(mevcutIndeks.get(satir.id), hedef)) { degismeyen += 1; continue; }
    /*
      `ham_hash` yükte gidiyor: RPC aynı kontrolü TRANSACTION İÇİNDE
      tekrarlıyor. Betiğin okuması ile yazması arasında gecelik iş
      araya girerse yarış koşusunu orada yakalıyoruz.
    */
    guncellemeler.push({ id: satir.id, ham_hash: veri.ham_hashler[satir.id], ...hedef });
  }

  console.log('\n— YAZILACAKLAR —');
  console.log(`  değişecek satır ..... ${guncellemeler.length}`);
  console.log(`  zaten aynı (atlanan)  ${degismeyen}`);
  const kolonSayaci = {};
  for (const g of guncellemeler) {
    for (const k of IZINLI_KOLONLAR) {
      const eski = mevcutIndeks.get(g.id)?.[k] ?? null;
      if ((g[k] ?? null) !== eski) kolonSayaci[k] = (kolonSayaci[k] ?? 0) + 1;
    }
  }
  console.log(`  kolon bazında: ${Object.entries(kolonSayaci).map(([k, v]) => `${k}=${v}`).join(' · ') || '(yok)'}`);

  /* ---------------------------------------------------------------- */
  /*  3) GERİ DÖNÜŞ SNAPSHOT'I                                         */
  /* ---------------------------------------------------------------- */

  const geriDonus = {
    uretim_ani: new Date().toISOString(),
    veri_hash: veri.veri_hash,
    kosu_etiketi: etiket,
    aciklama: 'Yazımdan ÖNCEKİ altı normalize kolon değeri. Geri alma bu dosyadan yapılır.',
    satirlar: duzenliJson(
      canliKatalog.map((s) => ({
        id: s.id,
        il: s.il ?? null, ilce: s.ilce ?? null, uzaktan: s.uzaktan ?? null,
        ilan_tipi: s.ilan_tipi ?? null, kaynak_durumu: s.kaynak_durumu ?? null,
        apply_url_ok: s.apply_url_ok ?? null,
      })).sort((a, b) => (a.id < b.id ? -1 : 1)),
    ),
  };
  geriDonus.geri_donus_hash = hash(geriDonus.satirlar);
  const geriYol = path.join(path.resolve(kosuDizin), `geri-donus-${etiket}.json`);
  fs.writeFileSync(geriYol, `${JSON.stringify(geriDonus, null, 2)}\n`);
  console.log(`\n— GERİ DÖNÜŞ —`);
  console.log(`  dosya: ${geriYol}`);
  console.log(`  hash : ${geriDonus.geri_donus_hash}`);

  /* ---------------------------------------------------------------- */
  /*  4) YAZIM                                                         */
  /* ---------------------------------------------------------------- */

  if (!yaz) {
    console.log('\nDRY-RUN: hiçbir şey yazılmadı. Yazmak için --yaz bayrağı gerekiyor.');
    return;
  }
  if (!guncellemeler.length) {
    console.log('\nYazılacak satır yok; veritabanı zaten istenen hâlde (idempotent).');
    return;
  }

  const { data: sonuc, error: yazmaHatasi } = await db.rpc('ilan_katalog_normalize_yaz', {
    p_ham_toplam: veri.ham_toplam,
    p_beklenen_satir: guncellemeler.length,
    p_satirlar: guncellemeler,
  });
  if (yazmaHatasi) {
    dur(`\nYAZIM BAŞARISIZ (geri alındı): ${yazmaHatasi.message}`);
    return;
  }
  console.log(`\nYAZILDI: ${JSON.stringify(sonuc)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await ana();
}
