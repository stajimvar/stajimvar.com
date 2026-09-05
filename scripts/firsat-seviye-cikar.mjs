/**
 * Fırsatların eğitim seviyesini resmî kaynağından çıkarır.
 *
 * NEDEN GEREKLİ
 * -------------
 * /burslar sayfasındaki "Eğitim seviyesi" süzgeci doğru çalışıyor ama
 * ÖLÇÜLDÜ: yayındaki 121 kaydın 57'sinde `education_levels` boş. Süzgeç
 * boş listeyi bilinçli olarak "kısıt yok" sayıyor (kısıtsız bir bursu
 * elemek yanlış olurdu), dolayısıyla o 57 kayıt her seçimden geçiyor.
 * Sonuç: "Lisans" seçen öğrenciye 121 yerine 94 kayıt çıkıyor — süzgeç
 * vaadini karşılamıyor.
 *
 * Yani sorun süzgeçte değil veride. Bu betik o boşluğu kapatıyor.
 *
 * TAHMİN ETMİYOR
 * --------------
 * Seviye yalnızca sayfada AÇIKÇA yazıyorsa atanıyor. "TEV bursu herhâlde
 * lisanstır" gibi bir çıkarım yapılmıyor: kurum yüksek lisans da veriyor
 * olabilir ve yanlış seviye, öğrenciyi kendisine açık bir bursu
 * göremeyecek biçimde eler.
 *
 * Bulunamazsa alan BOŞ KALIYOR ve kayıt eskisi gibi her süzgeçten
 * geçmeye devam ediyor — yani bu betik hiçbir durumu kötüleştiremez.
 *
 * ÇOK SEVİYELİ KAYIT NORMAL
 * -------------------------
 * Bir burs hem lisans hem yüksek lisans öğrencisine açık olabiliyor;
 * bulunan seviyelerin hepsi yazılıyor, biri seçilmiyor.
 *
 * ⚠ ÇIKTISI DOĞRUDAN YAZILMAMALI — ÖNCE İNSAN BAKMALI
 * ----------------------------------------------------
 * Anahtar kelime çıkarımının aşamadığı bir sınır var: sayfadaki bir
 * seviye adı HEDEF kitleyi değil ÖN KOŞULU anlatıyor olabilir.
 *
 * Ölçülen örnek: "Erasmus Mundus Ortak Yüksek Lisans Programları"
 * sayfasında "bachelor" geçiyor, ama "lisans öğrencileri başvurabilir"
 * anlamında değil — "başvurmak için lisans diplomanız olmalı" anlamında.
 * Betik bunu "Lisans" olarak etiketliyor ve sonuç, yalnızca yüksek
 * lisansa açık bir bursu lisans öğrencisine açıkmış gibi göstermek olur.
 *
 * Bu yüzden `--yaz` kullanılmadan önce rapor çıktısı gözden geçirilmeli.
 * Boş bırakmak yanlış doldurmaktan iyidir: /burslar süzgeci boş listeyi
 * "kısıt yok" sayıyor, yani eksik veri kimseyi eleme dışı bırakmıyor —
 * ama YANLIŞ veri, öğrenciyi kendisine kapalı bir bursa yönlendirir ya da
 * açık olanı gizler.
 *
 * Kullanım:
 *   node scripts/firsat-seviye-cikar.mjs          (yalnızca rapor)
 *   node scripts/firsat-seviye-cikar.mjs --yaz    (gözden geçirdikten SONRA)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const YAZ = process.argv.includes('--yaz');

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(process.cwd(), 'automation/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((s) => s.trim() && !s.trim().startsWith('#') && s.includes('='))
    .map((s) => {
      const i = s.indexOf('=');
      return [s.slice(0, i).trim(), s.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const db = createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BASLIK = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36 StajimVarBot/1.0 (+https://stajimvar.com/bot)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'tr,en;q=0.8',
};

/*
  KALIPLAR

  Türkçe ve İngilizce birlikte. "önlisans" mutlaka "lisans"tan ÖNCE
  denenmeli, yoksa "önlisans" içindeki "lisans" yanlış eşleşir; bu yüzden
  lisans kalıbı kelime sınırıyla ve "ön" öneki dışlanarak yazıldı.
*/
const KALIPLAR = [
  ['Ön lisans', /ön\s?lisans|onlisans|associate degree|meslek yüksekokulu|\bmyo\b/i],
  /*
    "LİSANS" KALIBI "YÜKSEK LİSANS"IN İÇİNE DÜŞÜYORDU

    İlk sürümde alternasyonun bazı dalları korumasızdı ve "yüksek lisans
    öğrencisi" ifadesi düz "Lisans" olarak da eşleşiyordu. Rapor modunda
    görüldü: "Erasmus Mundus Ortak Yüksek Lisans Programları" için sonuç
    "Lisans, Doktora" çıktı — yani yalnızca yüksek lisansa açık bir burs,
    lisans öğrencisine açıkmış gibi etiketlenecekti. Bu, süzgecin
    düzeltmeye çalıştığı hatanın daha kötüsü olurdu.

    Artık "yüksek" ve "ön" önekleri açıkça dışlanıyor.
  */
  ['Lisans', /(?<!yüksek\s)(?<!yüksek)(?<!ön\s)(?<!ön)\blisans\s?(öğrenci|düzey|program|eğitim|son\s?sınıf)|\bundergraduate\b|\bbachelor\b|üniversite\s?(3|4)\.\s?sınıf/i],
  ['Yüksek lisans', /yüksek\s?lisans|master'?s?\s?(degree|program|student)|\bmsc\b|\bmba\b|graduate program/i],
  ['Doktora', /doktora|\bph\.?d\b|doctoral|doctorate/i],
  ['Lise', /\blise\s?(öğrenci|son|düzey)|high school student/i],
];

function metneCevir(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

const { data: kayitlar, error } = await db
  .from('opportunities')
  .select('id,title,source_url,canonical_source_url,education_levels')
  .eq('status', 'published');

if (error) {
  console.error('Kayıtlar okunamadı:', error.message);
  process.exit(1);
}

const eksik = kayitlar.filter((k) => !(k.education_levels?.length > 0));
console.log(`${kayitlar.length} yayında kayıt, ${eksik.length} tanesinde seviye boş.\n`);

let bulundu = 0;
let bulunamadi = 0;
let erisilemedi = 0;
const yazilacak = [];

for (const k of eksik) {
  const adres = k.source_url || k.canonical_source_url;
  if (!adres) {
    erisilemedi++;
    console.log(`  ---  ${k.title.slice(0, 46).padEnd(48)} adres yok`);
    continue;
  }

  let metin = '';
  try {
    const cevap = await fetch(adres, { headers: BASLIK, redirect: 'follow' });
    if (!cevap.ok) {
      erisilemedi++;
      console.log(`  ${String(cevap.status).padEnd(4)} ${k.title.slice(0, 46).padEnd(48)} erişilemedi`);
      continue;
    }
    metin = metneCevir(await cevap.text());
  } catch (hata) {
    erisilemedi++;
    console.log(`  ---  ${k.title.slice(0, 46).padEnd(48)} ${String(hata.message).slice(0, 34)}`);
    continue;
  }

  const seviyeler = KALIPLAR.filter(([, kalip]) => kalip.test(metin)).map(([ad]) => ad);

  if (seviyeler.length === 0) {
    bulunamadi++;
    console.log(`  200  ${k.title.slice(0, 46).padEnd(48)} sayfada seviye yazmıyor`);
    continue;
  }

  bulundu++;
  yazilacak.push({ id: k.id, seviyeler });
  console.log(`  200  ${k.title.slice(0, 46).padEnd(48)} ${seviyeler.join(', ')}`);
}

console.log(
  `\nbulundu: ${bulundu}  ·  sayfada yazmıyor: ${bulunamadi}  ·  erişilemedi: ${erisilemedi}`
);

if (!YAZ) {
  console.log('\n(rapor modu — hiçbir şey yazılmadı; yazmak için --yaz)');
  process.exit(0);
}

let yazildi = 0;
for (const y of yazilacak) {
  const { error: hata } = await db
    .from('opportunities')
    .update({ education_levels: y.seviyeler, updated_at: new Date().toISOString() })
    .eq('id', y.id);
  if (hata) console.log('HATA', y.id, hata.message.slice(0, 60));
  else yazildi++;
}
console.log(`${yazildi} kayıt güncellendi.`);
