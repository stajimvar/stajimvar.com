import { GRAF_SURUM } from './instagram-durum.mjs';

/**
 * Instagram gönderisi yayınlamanın saf mantığı.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Yayınlama üç adımlı ve her adım bir öncekinin kimliğine bağlı: görsel
 * kapsayıcıları → karusel kapsayıcısı → yayınla. Adımların kurulumu burada,
 * ağ çağrısı Pages Function'da; böylece "hangi adres, hangi gövde, hangi
 * doğrulama" gerçek bir gönderi atmadan test edilebiliyor.
 *
 * TEK YÖNLÜ İŞ
 * ------------
 * Yayınlanan gönderi geri alınamıyor (API silme sunmuyor). Bu yüzden
 * doğrulama burada sıkı: eksik ya da şüpheli bir girdi API'ye hiç
 * gitmiyor.
 */

/** Instagram'ın gönderi metni sınırı. */
export const ACIKLAMA_SINIRI = 2200;

/** Instagram bir gönderide en fazla 30 etiket kabul ediyor. */
export const ETIKET_SINIRI = 30;

/** Karusel en az 2, en fazla 10 görsel alıyor. */
export const KARUSEL_ARALIGI = { en_az: 2, en_cok: 10 };

/**
 * Gönderi etiketleri.
 *
 * Az ve konuya yakın: Instagram'ın kendi önerisi de "alakalı birkaç etiket".
 * Otuz etiketle doldurmak erişim getirmiyor, spam sinyali veriyor. Buradaki
 * sıra kasıtlı — ilk üçü hesabın ne olduğunu söyleyen etiketler.
 */
export const ETIKETLER = [
  '#staj',
  '#stajilanı',
  '#burs',
  '#stajyer',
  '#kyk',
  '#üniversiteliyiz',
  '#kariyer',
  '#öğrenci',
  '#stajbaşvurusu',
  '#yenimezun',
];

/**
 * Gönderi metnini kurar: önce anlatı, sonra çağrı, en sonda etiketler.
 *
 * Etiketler metnin sonunda ayrı bir blokta duruyor; cümlelerin arasına
 * serpiştirmek okunurluğu bozuyor.
 */
export function aciklamaKur(govde, etiketler = ETIKETLER) {
  const temiz = String(govde ?? '').trim();
  const etiketSatiri = etiketler.join(' ');
  return `${temiz}\n\n${etiketSatiri}`;
}

/** Metindeki etiketler (yalnızca sayım ve doğrulama için). */
export function etiketleriBul(metin) {
  return String(metin ?? '').match(/#[\p{L}\p{N}_]+/gu) ?? [];
}

/**
 * Görsel adresi yayınlanabilir mi?
 *
 * Instagram görseli KENDİ indiriyor: adres herkese açık ve HTTPS olmalı.
 * Yalnızca kendi alan adımıza izin veriyoruz — başkasının sunucusundaki
 * bir görseli yanlışlıkla yayınlamak, hem telif hem de "yayınlanan şeyi
 * biz kontrol ediyoruz" ilkesi açısından kabul edilemez.
 */
export function gorselGecerliMi(adres, alanAdi = 'stajimvar.com') {
  try {
    const url = new URL(String(adres));
    if (url.protocol !== 'https:') return false;
    if (url.hostname !== alanAdi && url.hostname !== `www.${alanAdi}`) return false;
    return /\.(jpe?g)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

/**
 * Yayın isteğini doğrular. Dönen liste boşsa istek gönderilebilir.
 */
export function paylasimSorunlari({ gorseller, aciklama }, alanAdi = 'stajimvar.com') {
  const sorunlar = [];
  const liste = Array.isArray(gorseller) ? gorseller : [];

  if (liste.length === 0) sorunlar.push('En az bir görsel gerekiyor.');
  if (liste.length > KARUSEL_ARALIGI.en_cok) {
    sorunlar.push(`Bir gönderide en fazla ${KARUSEL_ARALIGI.en_cok} görsel olabilir.`);
  }

  const gecersizler = liste.filter((adres) => !gorselGecerliMi(adres, alanAdi));
  if (gecersizler.length) {
    sorunlar.push(`Görsel adresi ${alanAdi} üzerinde HTTPS bir .jpg olmalı (${gecersizler.length} adres uymuyor).`);
  }

  const metin = String(aciklama ?? '').trim();
  if (!metin) sorunlar.push('Gönderi metni boş olamaz.');
  if (metin.length > ACIKLAMA_SINIRI) {
    sorunlar.push(`Gönderi metni ${ACIKLAMA_SINIRI} karakteri aşıyor (${metin.length}).`);
  }

  const etiketler = etiketleriBul(metin);
  if (etiketler.length > ETIKET_SINIRI) {
    sorunlar.push(`Etiket sayısı ${ETIKET_SINIRI}'u aşıyor (${etiketler.length}).`);
  }

  return sorunlar;
}

const uc = (env, yol) =>
  `https://graph.instagram.com/${GRAF_SURUM}/${encodeURIComponent(env.INSTAGRAM_USER_ID)}/${yol}`;

/**
 * Tek görselin kapsayıcı adresi.
 *
 * `is_carousel_item` yalnızca karuselde veriliyor; tek görselli gönderide
 * verilirse kapsayıcı yayınlanamaz hale geliyor.
 */
export function gorselKapsayiciAdresi(env, gorsel, { karuselParcasi, aciklama } = {}) {
  const parametreler = new URLSearchParams({
    image_url: gorsel,
    access_token: env.INSTAGRAM_ACCESS_TOKEN,
  });
  if (karuselParcasi) parametreler.set('is_carousel_item', 'true');
  else if (aciklama) parametreler.set('caption', aciklama);
  return `${uc(env, 'media')}?${parametreler}`;
}

/** Karusel kapsayıcısı: alt kapsayıcıların kimliklerini ve metni taşıyor. */
export function karuselKapsayiciAdresi(env, cocukKimlikleri, aciklama) {
  const parametreler = new URLSearchParams({
    media_type: 'CAROUSEL',
    children: cocukKimlikleri.join(','),
    caption: aciklama,
    access_token: env.INSTAGRAM_ACCESS_TOKEN,
  });
  return `${uc(env, 'media')}?${parametreler}`;
}

/** Hazır kapsayıcıyı yayına alan adres. */
export function yayinlaAdresi(env, kapsayiciKimligi) {
  const parametreler = new URLSearchParams({
    creation_id: kapsayiciKimligi,
    access_token: env.INSTAGRAM_ACCESS_TOKEN,
  });
  return `${uc(env, 'media_publish')}?${parametreler}`;
}

/** Yayınlanan gönderinin herkese açık adresi (permalink ayrı çağrı ister). */
export function gonderiAdresi(kimlik) {
  return `https://www.instagram.com/p/${kimlik}`;
}
