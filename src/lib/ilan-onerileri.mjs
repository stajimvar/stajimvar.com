/**
 * ŞİRKETE GÖRE İLAN ÖNERİLERİ (7 Kasım 2026, kullanıcı isteği)
 *
 * "Şirketime göre neye ihtiyacım olacağını bilsin, leb demeden leblebiyi
 * önüme koysun." Yeni ilan formu boş açılıyordu; şirket profilinde sektör,
 * şehir ve tanıtım zaten var. Bu modül onlardan yalnız ÖNERİ üretiyor:
 * pozisyon çipleri ve önceden dolu şehir. Hiçbir alan kilitlenmiyor,
 * şirket her öneriyi değiştirebiliyor.
 *
 * Alan tanıma pozisyon şablonlarıyla aynı kaynaktan (IS_TANIMI_ALANLARI):
 * önerilen her pozisyonun hazır iş tanımı şablonu var.
 */
import { IS_TANIMI_ALANLARI, katla, pozisyonAlani } from './pozisyonlar.mjs';

/** Alan → o alanda en sık açılan staj başlıkları (POZISYONLAR listesinden). */
export const ALAN_POZISYONLARI = {
  tekstil: ['Tekstil Tasarım Stajyeri', 'Tekstil / Konfeksiyon Stajyeri'],
  yazilim: ['Yazılım Geliştirme Stajyeri', 'Frontend Stajyeri'],
  veri: ['Veri Analisti Stajyeri'],
  tasarim: ['Grafik Tasarım Stajyeri', 'UI/UX Tasarım Stajyeri'],
  pazarlama: ['Dijital Pazarlama Stajyeri', 'Sosyal Medya Stajyeri'],
  ik: ['İnsan Kaynakları Stajyeri'],
  finans: ['Muhasebe / Finans Stajyeri'],
  satis: ['Satış Stajyeri'],
  lojistik: ['Lojistik Stajyeri'],
  uretim: ['Üretim & Kalite Kontrol Stajyeri'],
};

/*
  Alan anahtarlarında olmayan ama şirket tanıtımlarında sık geçen
  sözcükler: e-ticaret bir pazarlama ve satış işi.
*/
const EK_ANAHTARLAR = {
  pazarlama: ['e ticaret', 'eticaret', 'e commerce', 'ecommerce', 'dijital'],
  satis: ['e ticaret', 'eticaret', 'magaza'],
};

function duzMetin(metin) {
  return ` ${katla(metin).split(/[^a-z0-9]+/).filter(Boolean).join(' ')} `;
}

/** Anahtarın metindeki ilk konumu; geçmiyorsa -1. */
function konum(duz, anahtar) {
  const tam = anahtar.endsWith('$');
  const govde = tam ? anahtar.slice(0, -1) : anahtar;
  return duz.indexOf(tam ? ` ${govde} ` : ` ${govde}`);
}

function ilkKonum(duz, anahtarlar) {
  const k = anahtarlar.map((a) => konum(duz, a)).filter((i) => i >= 0);
  return k.length ? Math.min(...k) : -1;
}

/**
 * Şirket profilinden önerilen pozisyonlar (en çok `enFazla`).
 * Sektörde geçen alan önce ve sektörde ÖNCE yazılan önce ("Tekstil /
 * E-ticaret" → tekstil başta); sonra yalnız tanıtımda geçenler.
 */
export function sirketeGorePozisyonlar({ sektor, tanitim } = {}, enFazla = 5) {
  const s = duzMetin(sektor ?? '');
  const t = duzMetin(tanitim ?? '');
  const puanlar = [];
  IS_TANIMI_ALANLARI.forEach((alan, sira) => {
    const anahtarlar = [...alan.anahtarlar, ...(EK_ANAHTARLAR[alan.id] ?? [])];
    const sektorde = ilkKonum(s, anahtarlar);
    const tanitimda = ilkKonum(t, anahtarlar);
    if (sektorde < 0 && tanitimda < 0) return;
    puanlar.push({ id: alan.id, sektorde: sektorde < 0 ? Infinity : sektorde, tanitimda: tanitimda < 0 ? Infinity : tanitimda, sira });
  });
  puanlar.sort((a, b) => a.sektorde - b.sektorde || a.tanitimda - b.tanitimda || a.sira - b.sira);
  /* Önce her alanın ilk başlığı, sonra ikincileri: tek alan listeyi doldurmasın. */
  const sonuc = [];
  for (let tur = 0; tur < 2; tur++) {
    for (const { id } of puanlar) {
      const p = ALAN_POZISYONLARI[id]?.[tur];
      if (p && !sonuc.includes(p)) sonuc.push(p);
    }
  }
  return sonuc.slice(0, enFazla);
}

/** Şirketin konumu Türkiye ilinden biriyse o il; değilse ''. */
export function sehirOnerisi(konum, iller) {
  const k = katla(String(konum ?? '').split(/[,/]/)[0]).trim();
  if (!k) return '';
  return iller.find((il) => katla(il) === k) ?? '';
}

/** Pozisyonun ilk iş tanımı şablonu; tanınmıyorsa ''. */
export function ilkSablonMetni(unvan) {
  return pozisyonAlani(unvan)?.sablonlar?.[0]?.metin ?? '';
}
