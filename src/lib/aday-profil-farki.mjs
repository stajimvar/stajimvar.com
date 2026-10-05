/**
 * BAŞVURU ANI ↔ GÜNCEL PROFİL FARKI
 *
 * NEDEN VAR
 * ---------
 * Şirket adayı başvuru anındaki kopyadan (`profile_snapshot`) görüyor;
 * öğrenci profilini sonradan değiştirmiş olabilir. İki hâli alt alta
 * bütünüyle yazmak aynı bilgiyi iki kez okutuyor ve asıl soruyu ("ne
 * değişti") okuyucuya bırakıyordu. Bu modül yalnız FARKI üretiyor;
 * değişmeyen alan sonuçta hiç yer almıyor.
 *
 * Saf: ağ yok, React yok. Arayüz (`src/sirket/AdayGuncelProfil.tsx`)
 * sonucu çiziyor; kural burada ve tests/aday-profil-farki.test.mjs
 * onu bağlıyor.
 *
 * KOPYA SINIRI — "EKLENDİ" HER ZAMAN İDDİA EDİLEMİYOR
 * ---------------------------------------------------
 * Başvuru kopyası yetenek ve projelerin YALNIZ İLK BEŞİNİ saklıyor
 * (src/lib/basvuru-kopyasi.mjs, `.slice(0, 5)`); güncel profil ise
 * hepsini döndürüyor. Kopyada beş öğe varsa, güncelde fazladan görünen
 * bir öğe başvuru anında da profilde olabilir — kopyaya sığmamıştır.
 * Bu durumda sonuç `kopyaSinirli: true` taşıyor ve arayüz "eklendi"
 * yerine "kopyada yer almıyor" diyor. ÇIKAN öğe için böyle bir belirsizlik
 * yok: güncel liste tam, kopyadaki bir öğe orada yoksa gerçekten çıkmış.
 *
 * SINIF BOŞALDIYSA FARK SAYILMIYOR
 * --------------------------------
 * `toStudentProfile` (src/lib/queries/mappers.ts) boş `grade_level` için
 * '3. Sınıf' varsayıyor ve kopya o nesneden üretiliyor. Yani kopyadaki
 * sınıf, öğrencinin hiç seçmediği bir varsayılan olabilir. Güncel değer
 * boşken "sınıf kaldırıldı" demek, büyük olasılıkla hiç girilmemiş bir
 * bilgiyi silinmiş gibi gösterirdi; bu tek alan için boşalma fark
 * sayılmıyor. Sınıf DEĞİŞTİYSE (dolu → başka dolu) fark yazılıyor.
 */

import { guvenliDisAdres } from './guvenli-url.mjs';

/** Kopyanın yetenek ve projede tuttuğu üst sınır — basvuru-kopyasi.mjs ile aynı. */
export const KOPYA_SINIRI = 5;

/** Tek satırlık alanlar, ekranda göründükleri sırayla. */
const TEKIL_ALANLAR = [
  { anahtar: 'ad', etiket: 'Ad', bolum: 'kimlik' },
  { anahtar: 'universite', etiket: 'Üniversite', bolum: 'egitim' },
  { anahtar: 'bolum', etiket: 'Bölüm', bolum: 'egitim' },
  { anahtar: 'sinif', etiket: 'Sınıf', bolum: 'egitim' },
  { anahtar: 'sehir', etiket: 'Şehir', bolum: 'sehir' },
  { anahtar: 'github', etiket: 'GitHub', bolum: 'baglantilar' },
  { anahtar: 'portfolyo', etiket: 'Portfolyo', bolum: 'baglantilar' },
  { anahtar: 'linkedin', etiket: 'LinkedIn', bolum: 'baglantilar' },
];

/*
  Adı okunamamış dil satırı ("undefined (B1)") — aday-kart.mjs'teki
  süzgeçle aynı biçim. Güncel profil sunucudan geldiği için bu satırı
  üretmiyor; kopyadaki eski kayıtlar üretebiliyor ve karşılaştırmaya
  "çıkan dil" diye girmemeli.
*/
const BOZUK_DIL = /^\s*(undefined|null)\s*(\(|$)/i;

function metin(deger) {
  if (typeof deger !== 'string') return null;
  const t = deger.trim().replace(/\s+/g, ' ');
  return t || null;
}

function dizeler(deger) {
  return Array.isArray(deger) ? deger.map(metin).filter(Boolean) : [];
}

/*
  Karşılaştırma anahtarı: büyük-küçük harf ve fazladan boşluk fark
  sayılmıyor. "react" → "React" düzeltmesi öğrencinin profilinde bir
  değişiklik ama şirkete söylenecek bir şey değil.
*/
function anahtar(deger) {
  return String(deger ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

/* Adreslerde sondaki eğik çizgi ve şema harfi fark üretmesin. */
function adresAnahtari(deger) {
  return anahtar(deger).replace(/\/+$/, '');
}

function kumeFarki(once, simdi) {
  const onceAnahtar = new Set(once.map(anahtar));
  const simdiAnahtar = new Set(simdi.map(anahtar));
  return {
    eklenen: simdi.filter((x) => !onceAnahtar.has(anahtar(x))),
    cikan: once.filter((x) => !simdiAnahtar.has(anahtar(x))),
  };
}

/** "İngilizce (B2)" → { ad: 'İngilizce', seviye: 'B2' } */
function dilParcala(satir) {
  const m = String(satir).match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  return m ? { ad: m[1].trim(), seviye: m[2].trim() } : { ad: String(satir).trim(), seviye: '' };
}

function dilFarki(once, simdi) {
  const onceAdla = new Map(once.map((d) => [anahtar(dilParcala(d).ad), d]));
  const simdiAdla = new Map(simdi.map((d) => [anahtar(dilParcala(d).ad), d]));
  const eklenen = [];
  const cikan = [];
  const seviyesiDegisen = [];
  for (const [ad, satir] of simdiAdla) {
    const eski = onceAdla.get(ad);
    if (eski === undefined) eklenen.push(satir);
    else if (anahtar(eski) !== anahtar(satir)) {
      seviyesiDegisen.push({ ad: dilParcala(satir).ad, once: eski, simdi: satir });
    }
  }
  for (const [ad, satir] of onceAdla) if (!simdiAdla.has(ad)) cikan.push(satir);
  return { eklenen, cikan, seviyesiDegisen };
}

function projeler(deger) {
  if (!Array.isArray(deger)) return [];
  return deger
    .filter((p) => p && typeof p === 'object' && metin(p.baslik))
    .map((p) => ({ baslik: metin(p.baslik), aciklama: metin(p.aciklama), adres: metin(p.adres) }));
}

function projeFarki(once, simdi) {
  const onceBaslikla = new Map(once.map((p) => [anahtar(p.baslik), p]));
  const simdiBaslikla = new Map(simdi.map((p) => [anahtar(p.baslik), p]));
  const eklenen = [];
  const guncellenen = [];
  for (const [b, p] of simdiBaslikla) {
    const eski = onceBaslikla.get(b);
    if (!eski) eklenen.push(p);
    else if (anahtar(eski.aciklama) !== anahtar(p.aciklama) || adresAnahtari(eski.adres) !== adresAnahtari(p.adres)) {
      guncellenen.push(p);
    }
  }
  const cikan = once.filter((p) => !simdiBaslikla.has(anahtar(p.baslik)));
  return { eklenen, cikan, guncellenen };
}

/**
 * Başvuru anı ile güncel profil arasındaki fark.
 *
 * @param {object} anlik kart verisi (`kartVerisi`): başvuru anının kopyası
 * @param {object|null} guncel `basvuruAdayGuncelProfili().guncel`
 * @param {{ kimlikGizli?: boolean }} [secenek] önyargısız incelemede ad
 *   karşılaştırılmıyor — "ad değişti" satırı adı ekrana geri taşırdı
 * @returns {null | {
 *   degisiklikVar: boolean,
 *   alanlar: { anahtar: string, etiket: string, once: string|null, simdi: string|null, bolum: string, degerGizli?: boolean }[],
 *   yetenekler: { eklenen: string[], cikan: string[], kopyaSinirli: boolean, karsilastirilamadi: boolean },
 *   diller: { eklenen: string[], cikan: string[], seviyesiDegisen: { ad: string, once: string, simdi: string }[] },
 *   rozetler: { eklenen: string[], cikan: string[] },
 *   projeler: { eklenen: object[], cikan: object[], guncellenen: object[], kopyaSinirli: boolean },
 *   bolumler: Record<string, boolean>,
 * }}
 */
export function adayProfilFarki(anlik, guncel, secenek = {}) {
  if (!anlik || !guncel) return null;
  const kimlikGizli = Boolean(secenek.kimlikGizli ?? anlik.gizli);

  const alanlar = [];
  for (const alan of TEKIL_ALANLAR) {
    if (alan.anahtar === 'ad' && kimlikGizli) continue;
    const once = metin(anlik[alan.anahtar]);
    const simdi = metin(guncel[alan.anahtar]);
    if (alan.anahtar === 'sinif' && simdi === null) continue;
    const ayni =
      alan.bolum === 'baglantilar' ? adresAnahtari(once) === adresAnahtari(simdi) : anahtar(once) === anahtar(simdi);
    if (ayni) continue;
    /*
      Önyargısız incelemede bağlantı DEĞERİ yazılmıyor: LinkedIn adresi ve
      GitHub kullanıcı adı çoğunlukla kişinin adını taşıyor. Değiştiği
      bilgisi kalıyor, değerin kendisi düşüyor.
    */
    if (kimlikGizli && alan.bolum === 'baglantilar') {
      alanlar.push({ anahtar: alan.anahtar, etiket: alan.etiket, once: null, simdi: null, bolum: alan.bolum, degerGizli: true });
    } else {
      alanlar.push({ anahtar: alan.anahtar, etiket: alan.etiket, once, simdi, bolum: alan.bolum });
    }
  }

  /*
    Kopyada yetenek listesi YOKSA (eski başvurular) karttaki yetenekler
    canlı tablodan geliyor (`kartVerisi`, `yetenekKopyadan: false`).
    Canlıyı canlıyla karşılaştırmak "değişiklik yok" diye yanlış bir
    güvence verirdi; karşılaştırma hiç yapılmıyor.
  */
  const yetenekKarsilastirilamadi = anlik.yetenekKopyadan === false;
  const onceYetenek = dizeler(anlik.yetenekler);
  const yetenekFarki = yetenekKarsilastirilamadi
    ? { eklenen: [], cikan: [] }
    : kumeFarki(onceYetenek, dizeler(guncel.yetenekler));

  const onceDil = dizeler(anlik.diller).filter((d) => !BOZUK_DIL.test(d));
  const diller = dilFarki(onceDil, dizeler(guncel.diller).filter((d) => !BOZUK_DIL.test(d)));
  const rozetler = kumeFarki(dizeler(anlik.rozetler), dizeler(guncel.rozetler));
  const onceProje = projeler(anlik.projeler);
  const projeSonucu = projeFarki(onceProje, projeler(guncel.projeler));

  const yetenekler = {
    ...yetenekFarki,
    kopyaSinirli: onceYetenek.length >= KOPYA_SINIRI,
    karsilastirilamadi: yetenekKarsilastirilamadi,
  };
  const proje = { ...projeSonucu, kopyaSinirli: onceProje.length >= KOPYA_SINIRI };

  const bolumler = {
    kimlik: alanlar.some((a) => a.bolum === 'kimlik'),
    egitim: alanlar.some((a) => a.bolum === 'egitim'),
    sehir: alanlar.some((a) => a.bolum === 'sehir'),
    baglantilar: alanlar.some((a) => a.bolum === 'baglantilar'),
    yetenekler: yetenekler.eklenen.length + yetenekler.cikan.length > 0,
    diller: diller.eklenen.length + diller.cikan.length + diller.seviyesiDegisen.length > 0,
    rozetler: rozetler.eklenen.length + rozetler.cikan.length > 0,
    projeler: proje.eklenen.length + proje.cikan.length + proje.guncellenen.length > 0,
  };

  return {
    degisiklikVar: Object.values(bolumler).some(Boolean),
    alanlar,
    yetenekler,
    diller,
    rozetler,
    projeler: proje,
    bolumler,
  };
}

/**
 * Rozet kimliği → okunur ad. Öğrencinin kendi profilindeki gösterimle
 * aynı (StudentProfileView: `badge-` / `quiz-` öneki atılıyor); iki
 * ekranda aynı rozet farklı adla okunmasın.
 */
export function rozetEtiketi(rozet) {
  return String(rozet ?? '').replace(/^(badge|quiz)-/, '');
}

/*
  GitHub alanı KULLANICI ADI (`github_username`); bazı öğrenciler tam
  adresi yazmış olabilir. İkisi de github.com'a çıkıyor; başka bir
  konağa giden değer bağlantıya dönüşmüyor.
*/
const GITHUB_KULLANICI = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

export function githubAdresi(deger) {
  const t = metin(deger);
  if (!t) return null;
  if (GITHUB_KULLANICI.test(t)) return `https://github.com/${t}`;
  const adres = guvenliDisAdres(t);
  if (!adres) return null;
  const konak = new URL(adres).hostname.toLowerCase();
  return konak === 'github.com' || konak === 'www.github.com' ? adres : null;
}

/**
 * Profilin dış bağlantıları — yalnız güvenli (HTTPS, yerel olmayan)
 * olanlar. Değeri olup güvenli adrese çevrilemeyen bağlantı listeye
 * girmiyor: `javascript:` gibi bir değeri `href`e koymak, tıklayan
 * şirket çalışanının oturumunda kod çalıştırmak olurdu.
 *
 * @returns {{ tur: 'github'|'portfolyo'|'linkedin', etiket: string, adres: string }[]}
 */
export function adayBaglantilari(profil) {
  if (!profil) return [];
  return [
    { tur: 'github', etiket: 'GitHub', adres: githubAdresi(profil.github) },
    { tur: 'portfolyo', etiket: 'Portfolyo', adres: guvenliDisAdres(profil.portfolyo) },
    { tur: 'linkedin', etiket: 'LinkedIn', adres: guvenliDisAdres(profil.linkedin) },
  ].filter((b) => b.adres);
}
