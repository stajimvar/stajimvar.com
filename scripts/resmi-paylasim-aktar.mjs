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

export function setleriOku() {
  const yol = path.join(KOK, 'public', 'paylasim', 'setler.json');
  return JSON.parse(fs.readFileSync(yol, 'utf8'));
}

/* ------------------------------------------------------------------ */
/*  ÇALIŞTIRMA                                                         */
/* ------------------------------------------------------------------ */

async function main() {
  const bayraklar = process.argv.slice(2);
  const kodBayragi = bayraklar.find((b) => b.startsWith('--kod='));
  const yaz = bayraklar.includes('--yaz');

  const setler = setleriOku();

  if (bayraklar.includes('--liste') || !kodBayragi) {
    console.log(`${setler.length} set:`);
    for (const s of setler) {
      console.log(`  ${s.kod}  (${s.surum ?? '-'})  ${(s.kartlar ?? []).length} kart  ${s.ad ?? ''}`);
    }
    if (!kodBayragi) console.log('\nAktarmak için: --kod=<kod> --yaz');
    return;
  }

  const kod = kodBayragi.slice('--kod='.length);
  const set = setler.find((s) => s.kod === kod);
  if (!set) {
    console.error(`Set bulunamadı: ${kod}`);
    process.exitCode = 1;
    return;
  }

  const bulunan = etkilesimAlaniVarMi(set);
  if (bulunan.length > 0) {
    console.error(
      `Sette Instagram etkileşim alanı var (${bulunan.join(', ')}). ` +
        'Bu veriler sosyal ağa taşınmıyor; setin biçimi değişmiş olabilir, elle bakılmalı.',
    );
    process.exitCode = 1;
    return;
  }

  const icerik = aktarilacak(set);
  console.log(`kod          : ${set.kod}`);
  console.log(`anahtar kayn.: ${icerik.anahtarKaynagi}`);
  console.log(`istemci anah.: ${icerik.istemciAnahtari}`);
  console.log(`kitle        : ${icerik.kitle}`);
  console.log(`fotoğraf     : ${icerik.kartlar.length}`);
  console.log(`açıklama     : ${icerik.aciklama.length} karakter`);
  console.log(`TAŞINMAYAN   : beğeni, yorum ve her türlü Instagram sayacı`);

  if (!yaz) {
    console.log('\n--yaz verilmedi: hiçbir şey yazılmadı.');
    return;
  }

  const ortam = ortamOku();
  const url = ortam.SUPABASE_URL;
  const anahtar = ortam.SUPABASE_SERVICE_ROLE_KEY;
  const resmiKimlik = ortam.STAJIMVAR_RESMI_PROFIL_ID;
  if (!url || !anahtar) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (automation/.env).');
    process.exitCode = 1;
    return;
  }
  if (!resmiKimlik) {
    console.error(
      'STAJIMVAR_RESMI_PROFIL_ID gerekli: resmî hesabın profil kimliği. ' +
        'Hesap bir kez açılıp yönetici olarak `social_profiles.resmi_mi = true` yapılmalı.',
    );
    process.exitCode = 1;
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, anahtar, { auth: { persistSession: false } });

  /* Aynı anahtarla satır varsa ikinci kez yazılmıyor. */
  const { data: mevcut } = await db
    .from('posts')
    .select('id')
    .eq('istemci_anahtari', icerik.istemciAnahtari)
    .maybeSingle();
  if (mevcut) {
    console.log(`\nZaten aktarılmış (post ${mevcut.id}). Yeni satır açılmadı.`);
    return;
  }

  const { data: post, error: postHatasi } = await db
    .from('posts')
    .insert({
      author_id: resmiKimlik,
      aciklama: icerik.aciklama,
      kitle: icerik.kitle,
      durum: 'taslak',
      istemci_anahtari: icerik.istemciAnahtari,
    })
    .select('id')
    .single();
  if (postHatasi) {
    console.error('Paylaşım açılamadı:', postHatasi.message);
    process.exitCode = 1;
    return;
  }

  let sira = 0;
  for (const kart of icerik.kartlar) {
    const dosyaYolu = path.join(KOK, 'public', kart.replace(/^\//, ''));
    if (!fs.existsSync(dosyaYolu)) {
      console.error(`Görsel yok, atlandı: ${kart}`);
      continue;
    }
    sira += 1;
    const uzanti = path.extname(dosyaYolu).slice(1).toLowerCase() || 'jpg';
    /*
      YOL ÜÇ PARÇALI OLMAK ZORUNDA: {yazar}/{post}/{dosya}

      Depolama okuma politikası `sosyal_gizli.paylasim_dosyasi_gorunur`
      yolu bölüp ORTADAKİ parçayı paylaşım kimliği sayıyor ve üç
      parçadan azını doğrudan reddediyor. Betik önce iki parçalı
      yazıyordu; dosyalar yüklendi, `post_media` satırları açıldı ama
      paylaşımı gören hiç kimse görselleri AÇAMADI — yalnız hesabın
      kendisi (klasör adı kendi kimliğine eşit olduğu için). Canlıda
      ölçüldü: akıştaki kartın şeridinde tek bir `<img>` yoktu.

      İstemcideki üç adımlı akış da aynı öneki kuruyor
      (`${author_id}/${postId}/`); tek biçim, tek kural.
    */
    const depoYolu = `${resmiKimlik}/${post.id}/${crypto.randomUUID()}.${uzanti}`;
    const { error: yuklemeHatasi } = await db.storage
      .from(PAYLASIM_KOVASI)
      .upload(depoYolu, fs.readFileSync(dosyaYolu), {
        contentType: uzanti === 'png' ? 'image/png' : 'image/jpeg',
      });
    if (yuklemeHatasi) {
      console.error(`Yüklenemedi (${kart}):`, yuklemeHatasi.message);
      process.exitCode = 1;
      return;
    }
    const { error: medyaHatasi } = await db
      .from('post_media')
      .insert({ post_id: post.id, sira, storage_path: depoYolu });
    if (medyaHatasi) {
      console.error('Görsel satırı yazılamadı:', medyaHatasi.message);
      process.exitCode = 1;
      return;
    }
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
    .eq('id', post.id);
  if (bitirmeHatasi) {
    console.error('Paylaşım yayına alınamadı:', bitirmeHatasi.message);
    process.exitCode = 1;
    return;
  }

  console.log(`\nAktarıldı: post ${post.id}, ${sira} fotoğraf.`);
}

if (process.argv[1] && process.argv[1].endsWith('resmi-paylasim-aktar.mjs')) {
  await main();
}
