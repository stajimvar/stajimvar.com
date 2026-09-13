#!/usr/bin/env node
/**
 * INSTAGRAM İÇİN HAZIRLANAN İÇERİĞİ SOSYAL AĞA AKTARIR
 *
 * Kaynak `public/paylasim/setler.json`: Instagram için üretilmiş her
 * setin kodu, metni ve kart görselleri orada. Bu betik seçilen seti
 * StajımVar resmî hesabının paylaşımı olarak yazıyor.
 *
 * BEĞENİ VE YORUM VERİSİ TAŞINMIYOR
 * ---------------------------------
 * Setlerde zaten yok — ama bu bir tesadüf, kural değil. Kural burada:
 * betik yalnız `metin` ve `kartlar` alanlarını okuyor, başka hiçbir
 * alanı sosyal ağa geçirmiyor. Instagram'daki bir sayıyı buraya
 * taşımak, bu ağda hiç olmamış bir etkileşimi olmuş gibi göstermek
 * olurdu: 1.200 beğeni yazan bir kart, o beğenilerin buradaki
 * kullanıcılardan geldiğini ima eder. Beğeni ve kaydetme sayıları bu
 * ağda yalnız buradaki kullanıcılardan doğuyor; sıfırdan başlıyorlar.
 *
 * AYNI SET İKİ KEZ AKTARILMIYOR
 * -----------------------------
 * `posts.istemci_anahtari` üzerindeki tekil indeks kullanılıyor;
 * anahtar setin kodundan ve sürümünden türüyor. Betik ikinci kez
 * koşarsa yeni satır açılmıyor. Setin sürümü değişirse (v6 → v7)
 * anahtar da değişiyor: düzeltilmiş bir içerik yeni paylaşım olarak
 * çıkıyor, eskisi olduğu yerde kalıyor.
 *
 * ÇALIŞTIRMA
 *   node scripts/resmi-paylasim-aktar.mjs --liste
 *   node scripts/resmi-paylasim-aktar.mjs --kod=nasil-calisir --yaz
 *
 * `--yaz` verilmezse hiçbir şey yazılmıyor: ne aktarılacağı basılıyor.
 * SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekiyor (automation/.env);
 * servis anahtarı, resmî hesabın adına yazabilmek için.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

/** Görsel kovası; şemadaki adla aynı (20260924020000). */
export const PAYLASIM_KOVASI = 'sosyal-paylasim';

/* En çok on fotoğraf — `posts` şemasındaki sınırın aynısı. */
export const EN_FAZLA_FOTOGRAF = 10;
/* `posts.aciklama` CHECK'iyle aynı sayı. */
export const ACIKLAMA_SINIRI = 2200;

/**
 * AKTARIM AD ALANI — `instagram:<kod>:<sürüm>` dizesini UUID'ye çeviren tohum.
 *
 * `posts.istemci_anahtari` UUID tipinde (20260924010000) ve üzerinde
 * `(author_id, istemci_anahtari)` tekil indeksi var. Okunur bir dize
 * yazılamıyor: ölçüldü, `invalid input syntax for type uuid`.
 *
 * Rastgele UUID de olmaz — betik ikinci kez koştuğunda yeni bir anahtar
 * üretir ve AYNI SET İKİNCİ KEZ paylaşılırdı. Bu yüzden anahtar
 * TÜRETİLİYOR: aynı kod ve sürüm her zaman aynı UUID'yi veriyor, tekil
 * indeks de ikinci satırı engelliyor.
 *
 * Sürüm dizenin içinde: set v6'dan v7'ye geçerse anahtar da değişiyor
 * ve düzeltilmiş içerik yeni paylaşım olarak çıkıyor, eskisi yerinde
 * kalıyor.
 */
const AKTARIM_AD_ALANI = '6f1c9d64-2a1f-4d7b-9a83-2a6b0f5c1e47';

/**
 * RFC 4122 sürüm 5 UUID (SHA-1, ad alanı tabanlı).
 *
 * Dışarıdan paket almamak için elle yazıldı: betiğin tek bağımlılığı
 * `@supabase/supabase-js` ve bir satırlık bir iş için ikinci bir
 * bağımlılık eklemek, aktarımı bir paketin ömrüne bağlamak olurdu.
 */
export function uuid5(ad, adAlani = AKTARIM_AD_ALANI) {
  const adAlaniBaytlari = Buffer.from(adAlani.replace(/-/g, ''), 'hex');
  const ozet = crypto
    .createHash('sha1')
    .update(Buffer.concat([adAlaniBaytlari, Buffer.from(ad, 'utf8')]))
    .digest();

  const b = Buffer.from(ozet.subarray(0, 16));
  /* Sürüm 5 ve RFC 4122 varyantı: tip alanları yerine oturuyor. */
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;

  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function ortamOku() {
  const birlesik = { ...process.env };
  for (const dosya of ['.env', 'automation/.env']) {
    const yol = path.resolve(process.cwd(), dosya);
    if (!fs.existsSync(yol)) continue;
    for (const satir of fs.readFileSync(yol, 'utf8').split(/\r?\n/)) {
      if (!satir.includes('=') || satir.trimStart().startsWith('#')) continue;
      const i = satir.indexOf('=');
      birlesik[satir.slice(0, i).trim()] = satir.slice(i + 1).trim().replace(/^"|"$/g, '');
    }
  }
  return birlesik;
}

/**
 * Bir setten AKTARILACAK OLAN — ve yalnız o.
 *
 * Girdide `hikayeler`, `surum`, `guncellendi` gibi başka alanlar da
 * var; çıktıda yoklar. Fonksiyonun tamamı bu yüzden var: "ne
 * taşınıyor" sorusunun cevabı tek yerde ve sınanabilir olsun.
 */
export function aktarilacak(set) {
  const metin = String(set?.metin ?? '').trim();
  const kartlar = Array.isArray(set?.kartlar) ? set.kartlar.slice(0, EN_FAZLA_FOTOGRAF) : [];
  /* Okunur kaynak; anahtarın kendisi bundan TÜRETİLİYOR (bkz. uuid5). */
  const anahtarKaynagi = `instagram:${set?.kod ?? ''}:${set?.surum ?? 'v0'}`;
  return {
    anahtarKaynagi,
    /* Sürüm kaynağın içinde: düzeltilen içerik yeni paylaşım oluyor. */
    istemciAnahtari: uuid5(anahtarKaynagi),
    aciklama: metin.slice(0, ACIKLAMA_SINIRI),
    kartlar,
    /*
      KİTLE HER ZAMAN `resmi`

      Seçilebilir bir alan değil: bu betikten çıkan her paylaşım resmî
      içerik. Sunucu da aynı sınırı çiziyor — resmî olmayan bir hesap
      bu kitleyle yazamıyor (`paylasim_kitlesi_kilidi`).
    */
    kitle: 'resmi',
  };
}

/**
 * Instagram'a ait ETKİLEŞİM alanları — taşınmaması gerekenler.
 *
 * Liste bir denetim aracı: girdide bunlardan biri varsa betik durur.
 * Sessizce atmak yerine durmak bilinçli — setin biçimi değişmiş
 * demektir ve neyin taşındığına yeniden bakılması gerekir.
 */
export const ETKILESIM_ALANLARI = [
  'begeni',
  'begeniler',
  'likes',
  'like_count',
  'yorum',
  'yorumlar',
  'comments',
  'comment_count',
  'gosterim',
  'impressions',
  'erisim',
  'reach',
  'kaydetme',
  'saves',
];

export function etkilesimAlaniVarMi(set) {
  return ETKILESIM_ALANLARI.filter((ad) => Object.prototype.hasOwnProperty.call(set ?? {}, ad));
}

/**
 * BİR SET İÇİN NE YAPILACAĞI — saf karar, yan etkisiz.
 *
 * ÜÇ DURUM, ÜÇÜ DE AYRI:
 *
 *   yok            hiç satır yok            -> aktar
 *   hazir          tamamlanmış paylaşım     -> atla
 *   taslak/başka   YARIM KALMIŞ paylaşım    -> onar
 *
 * "Onar" dalı olmasaydı toplu aktarımda şu olurdu: bir set görseller
 * yüklenirken düşer, geriye `durum='taslak'` bir satır kalır (akışta
 * GÖRÜNMEZ, çünkü akış `durum='hazir'` istiyor). Betik ikinci kez
 * koştuğunda o satırı "zaten aktarılmış" sayıp ATLARDI ve o set sonsuza
 * kadar yarım kalırdı — hiç kimsenin göremediği bir paylaşım, ama
 * envanterde "aktarıldı" görünen bir kayıt. Belirsiz durum tam olarak
 * budur.
 *
 * Yarım satır silinip yeniden yazılmıyor, ÜZERİNE tamamlanıyor: aynı
 * anahtar korunuyor, yani üçüncü bir çalıştırma da aynı satıra bakıyor.
 */
export function aktarimKarari(mevcut) {
  if (!mevcut) return 'aktar';
  return mevcut.durum === 'hazir' ? 'atla' : 'onar';
}

export function setleriOku() {
  const yol = path.join(KOK, 'public', 'paylasim', 'setler.json');
  return JSON.parse(fs.readFileSync(yol, 'utf8'));
}

/* ------------------------------------------------------------------ */
/*  ÇALIŞTIRMA                                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  TEK SETİN AKTARIMI                                                 */
/* ------------------------------------------------------------------ */

/**
 * Bir seti aktarır ya da yarım kalmışsa tamamlar.
 *
 * HER SET KENDİ BAŞINA: bu fonksiyon hata fırlatıyor, döngü yakalıyor.
 * Toplu çalıştırmada bir setin düşmesi ötekileri durdurmuyor ve
 * ötekilerin durumunu belirsizleştirmiyor — her setin kendi satırı ve
 * kendi anahtarı var.
 *
 * SIRA ÖNEMLİ: satır `taslak` açılıyor, görseller yükleniyor, EN SONDA
 * `hazir` yapılıyor. Araya bir hata girerse geriye GÖRÜNMEYEN bir
 * taslak kalıyor (akış `durum='hazir'` istiyor); bir sonraki
 * çalıştırma onu `onar` dalında bulup tamamlıyor.
 */
export async function setiAktar(
  db,
  set,
  resmiKimlik,
  { gunluk = () => {}, yayinZamani = null } = {},
) {
  const icerik = aktarilacak(set);

  const { data: mevcut, error: okumaHatasi } = await db
    .from('posts')
    .select('id, durum')
    .eq('author_id', resmiKimlik)
    .eq('istemci_anahtari', icerik.istemciAnahtari)
    .maybeSingle();
  if (okumaHatasi) throw new Error(`mevcut kayıt okunamadı: ${okumaHatasi.message}`);

  const karar = aktarimKarari(mevcut);
  if (karar === 'atla') {
    gunluk(`atlandı (post ${mevcut.id})`);
    return { kod: set.kod, sonuc: 'atlandi', postId: mevcut.id };
  }

  let postId = mevcut?.id ?? null;

  if (karar === 'aktar') {
    const { data: post, error } = await db
      .from('posts')
      .insert({
        author_id: resmiKimlik,
        aciklama: icerik.aciklama,
        kitle: icerik.kitle,
        durum: 'taslak',
        istemci_anahtari: icerik.istemciAnahtari,
        /*
          INSTAGRAM YAYIN TARİHİ KORUNUYOR

          Akış `created_at desc` sıralı. Tarih verilmeseydi 09 Eylül'de
          yayımlanmış bir gönderi ile 13 Eylül'dekiler akışta aynı ana
          düşer, aralarındaki sıra aktarım hızına kalırdı — içeriğin
          kendi zaman çizgisi kaybolurdu.

          Tarihi olmayan sette alan hiç yazılmıyor: sütunun kendi
          varsayılanı (`now()`) devreye giriyor ve setler aktarım
          SIRASINA göre diziliyor.
        */
        ...(yayinZamani ? { created_at: yayinZamani } : {}),
      })
      .select('id')
      .single();
    if (error) throw new Error(`paylaşım açılamadı: ${error.message}`);
    postId = post.id;
  } else {
    /*
      ONARIM: yarım kalan satırın görselleri atılıp yeniden yazılıyor.
      Kaçının yüklendiğini saymak yerine hepsini yenilemek, "üçü
      yüklenmiş, dördüncüsü yarım" durumunu da kesin olarak çözüyor.
      Satırın kendisi ve ANAHTARI korunuyor: üçüncü bir çalıştırma da
      aynı satıra bakıyor.
    */
    gunluk(`yarım kalmış (post ${postId}) — onarılıyor`);
    const { data: eskiler } = await db
      .from('post_media')
      .select('storage_path')
      .eq('post_id', postId);
    const yollar = (eskiler ?? []).map((m) => m.storage_path).filter(Boolean);
    if (yollar.length > 0) await db.storage.from(PAYLASIM_KOVASI).remove(yollar);
    await db.from('post_media').delete().eq('post_id', postId);
    /* Açıklama da tazeleniyor: set metni düzeltilmiş olabilir. */
    await db.from('posts').update({ aciklama: icerik.aciklama }).eq('id', postId);
  }

  let sira = 0;
  for (const kart of icerik.kartlar) {
    const dosyaYolu = path.join(KOK, 'public', kart.replace(/^\//, ''));
    if (!fs.existsSync(dosyaYolu)) throw new Error(`görsel yok: ${kart}`);
    sira += 1;
    const uzanti = path.extname(dosyaYolu).slice(1).toLowerCase() || 'jpg';
    /*
      YOL ÜÇ PARÇALI OLMAK ZORUNDA: {yazar}/{post}/{dosya}

      Depolama okuma politikası `sosyal_gizli.paylasim_dosyasi_gorunur`
      yolu bölüp ORTADAKİ parçayı paylaşım kimliği sayıyor ve üç
      parçadan azını doğrudan reddediyor. Betik önce iki parçalı
      yazıyordu; dosyalar yüklendi, satırlar açıldı, kart akışta
      göründü ama şeritte tek bir `<img>` YOKTU — paylaşımı gören
      herkes fotoğrafsız bir kart görüyordu. Canlıda ölçüldü.

      İstemcideki üç adımlı akış da aynı öneki kuruyor; tek biçim.
    */
    const depoYolu = `${resmiKimlik}/${postId}/${crypto.randomUUID()}.${uzanti}`;
    const { error: yuklemeHatasi } = await db.storage
      .from(PAYLASIM_KOVASI)
      .upload(depoYolu, fs.readFileSync(dosyaYolu), {
        contentType: uzanti === 'png' ? 'image/png' : 'image/jpeg',
      });
    if (yuklemeHatasi) throw new Error(`yüklenemedi (${kart}): ${yuklemeHatasi.message}`);

    const { error: medyaHatasi } = await db
      .from('post_media')
      .insert({ post_id: postId, sira, storage_path: depoYolu });
    if (medyaHatasi) throw new Error(`görsel satırı yazılamadı: ${medyaHatasi.message}`);
  }

  /*
    DURUM EN SONDA 'hazir'

    Görseller yüklenmeden yayına alınsaydı, akışta bir süre boş kareli
    bir paylaşım dururdu. Aynı sıra istemcideki üç adımlı akışta da var
    (başlat → yükle → tamamla).
  */
  const { error: bitirmeHatasi } = await db
    .from('posts')
    .update({ durum: 'hazir' })
    .eq('id', postId);
  if (bitirmeHatasi) throw new Error(`yayına alınamadı: ${bitirmeHatasi.message}`);

  gunluk(`${karar === 'onar' ? 'onarıldı' : 'aktarıldı'}: post ${postId}, ${sira} fotoğraf`);
  return {
    kod: set.kod,
    sonuc: karar === 'onar' ? 'onarildi' : 'aktarildi',
    postId,
    gorsel: sira,
  };
}

async function istemciKur() {
  const ortam = ortamOku();
  const url = ortam.SUPABASE_URL;
  const anahtar = ortam.SUPABASE_SERVICE_ROLE_KEY;
  const resmiKimlik = ortam.STAJIMVAR_RESMI_PROFIL_ID;
  if (!url || !anahtar) {
    throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (automation/.env).');
  }
  if (!resmiKimlik) {
    throw new Error(
      'STAJIMVAR_RESMI_PROFIL_ID gerekli: resmî hesabın profil kimliği. ' +
        'Hesap bir kez açılıp yönetici olarak resmî işareti verilmeli.',
    );
  }
  const { createClient } = await import('@supabase/supabase-js');
  return { db: createClient(url, anahtar, { auth: { persistSession: false } }), resmiKimlik };
}

async function main() {
  const bayraklar = process.argv.slice(2);
  const kodBayragi = bayraklar.find((b) => b.startsWith('--kod='));
  const hepsi = bayraklar.includes('--hepsi');
  const yaz = bayraklar.includes('--yaz');
  const sinirBayragi = bayraklar.find((b) => b.startsWith('--sinir='));
  const sinir = sinirBayragi ? Number(sinirBayragi.slice('--sinir='.length)) : Infinity;

  const setler = setleriOku();

  if (bayraklar.includes('--liste') || (!kodBayragi && !hepsi)) {
    console.log(`${setler.length} set:`);
    for (const s of setler) {
      console.log(`  ${s.kod}  (${s.surum ?? '-'})  ${(s.kartlar ?? []).length} kart  ${s.ad ?? ''}`);
    }
    if (!kodBayragi && !hepsi) {
      console.log('\nAktarmak için: --kod=<kod> --yaz   ya da   --hepsi --yaz');
    }
    return;
  }

  /*
    HARİÇ TUTMA — ÜRÜN KARARI, BETİĞİN TAHMİNİ DEĞİL

    Aynı konunun iki çekimi olabiliyor (staj-sigortasi ile
    staj-sigortasi-fotografli). Hangisinin aktarılacağına betik karar
    veremez: metinleri farklı, ikisi de geçerli. Karar dışarıdan
    veriliyor ve komutta GÖRÜNÜYOR — sessizce eleyen bir kural, yarın
    kimsenin hatırlamayacağı bir davranış olurdu.
  */
  const haricBayragi = bayraklar.find((b) => b.startsWith('--haric='));
  const haric = new Set(
    haricBayragi ? haricBayragi.slice('--haric='.length).split(',').map((k) => k.trim()).filter(Boolean) : [],
  );

  const secilenler = (
    hepsi ? setler : [setler.find((s) => s.kod === kodBayragi.slice('--kod='.length))].filter(Boolean)
  ).filter((s) => !haric.has(s.kod));

  for (const kod of haric) {
    if (!setler.some((s) => s.kod === kod)) console.log(`uyarı: --haric içindeki "${kod}" setler.json'da yok`);
  }

  if (secilenler.length === 0) {
    console.error(`Set bulunamadı: ${kodBayragi.slice('--kod='.length)}`);
    process.exitCode = 1;
    return;
  }

  /*
    ETKİLEŞİM ALANI DENETİMİ BÜTÜN SETLERE, AKTARIMDAN ÖNCE.

    Set başına yapılsaydı yirminci sette durup ondokuzunu yayımlamış
    olurduk. Beğeni/yorum verisi taşıma riski ya hiçbirinde yok, ya da
    hiç başlamıyoruz.
  */
  for (const s of secilenler) {
    const bulunan = etkilesimAlaniVarMi(s);
    if (bulunan.length > 0) {
      console.error(
        `${s.kod}: Instagram etkileşim alanı var (${bulunan.join(', ')}). ` +
          'Bu veriler sosyal ağa taşınmıyor; setin biçimi değişmiş olabilir, elle bakılmalı.',
      );
      process.exitCode = 1;
      return;
    }
  }

  if (!yaz) {
    console.log(`${secilenler.length} set seçildi (--yaz verilmedi, hiçbir şey yazılmıyor):\n`);
    if (haric.size > 0) console.log(`  hariç tutulan: ${[...haric].join(', ')}\n`);
    for (const s of secilenler) {
      const icerik = aktarilacak(s);
      console.log(`  ${s.kod} (${s.surum})  ${icerik.kartlar.length} kart  ${icerik.aciklama.length} karakter`);
      console.log(`      anahtar ${icerik.istemciAnahtari}  kitle ${icerik.kitle}`);
    }
    console.log('\nTAŞINMAYAN: beğeni, yorum ve her türlü Instagram sayacı');
    return;
  }

  const { db, resmiKimlik } = await istemciKur();

  /*
    SIRA: Instagram'da yayımlananlar önce, eskiden yeniye.

    Gerekçe: Instagram'da zaten görülmüş içerik akışa önce girsin ki
    akış tanıdık bir şeyle dolsun. Yayımlanmamışlar sona kalıyor ve
    aralarındaki sıra alfabetik — rastgele bir sıra, yarın aynı komutu
    çalıştıranda başka bir sonuç verirdi.
  */
  const { data: yayinlar } = await db
    .from('instagram_yayinlari')
    .select('set_kodu, yayin_zamani');
  const yayinTarihi = new Map((yayinlar ?? []).map((y) => [y.set_kodu, y.yayin_zamani]));

  const sirali = [...secilenler].sort((a, b) => {
    const at = yayinTarihi.get(a.kod) ?? '9999';
    const bt = yayinTarihi.get(b.kod) ?? '9999';
    return at.localeCompare(bt) || a.kod.localeCompare(b.kod);
  });

  const sonuclar = [];
  let islenen = 0;
  for (const s of sirali) {
    if (islenen >= sinir) break;
    islenen += 1;
    const tarih = yayinTarihi.get(s.kod) ?? null;
    process.stdout.write(`${String(islenen).padStart(2)}. ${s.kod} (${s.surum}) ${tarih ? tarih.slice(0, 10) : 'IG yok'} ... `);
    try {
      const sonuc = await setiAktar(db, s, resmiKimlik, {
        gunluk: (m) => console.log(m),
        yayinZamani: tarih,
      });
      sonuclar.push(sonuc);
    } catch (sorun) {
      /*
        HATA DÖNGÜYÜ DURDURMUYOR.

        Her setin kendi satırı ve kendi anahtarı var; birinin düşmesi
        ötekiler hakkında hiçbir şey söylemiyor. Düşen set geriye
        görünmeyen bir taslak bırakıyor ve bir sonraki çalıştırma onu
        `onar` dalında tamamlıyor.
      */
      console.log(`HATA: ${sorun.message}`);
      sonuclar.push({ kod: s.kod, sonuc: 'hata', mesaj: sorun.message });
    }
  }

  const say = (tur) => sonuclar.filter((r) => r.sonuc === tur).length;
  console.log('\n' + '-'.repeat(60));
  console.log(
    `aktarıldı ${say('aktarildi')} · onarıldı ${say('onarildi')} · ` +
      `atlandı ${say('atlandi')} · hata ${say('hata')}`,
  );
  const hatalar = sonuclar.filter((r) => r.sonuc === 'hata');
  if (hatalar.length > 0) {
    console.log('\nHatalı setler (yeniden çalıştırmak güvenli, kopya üretmez):');
    for (const h of hatalar) console.log(`  ${h.kod}: ${h.mesaj}`);
    process.exitCode = 1;
  }
}


if (process.argv[1] && process.argv[1].endsWith('resmi-paylasim-aktar.mjs')) {
  await main();
}
