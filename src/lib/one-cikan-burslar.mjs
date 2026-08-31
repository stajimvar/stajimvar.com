import { opportunityStatus } from './opportunity-domain.mjs';
import { bursTutariVar } from './burs-kesif.mjs';
import { tupDurumu } from './zaman-tupu.mjs';

/**
 * ÖNE ÇIKAN BURSLAR — seçim mantığı.
 *
 * NEDEN KURAL VAR
 * ---------------
 * "Öne çıkan" diye bir şerit çizip içine listenin ilk sekiz kaydını
 * koymak, kullanıcıya olmayan bir seçki vaat etmek olurdu. Buradaki
 * sıralama tamamen VERİDEN çıkıyor ve her bileşeni açıklanabilir:
 *
 *   yaklaşan son tarih   → kaçırılacak bir şey gerçekten var
 *   doğrulanmış tutar    → kararı en çok belirleyen bilgi
 *   doğrulanmış kaynak   → gösterdiğimiz bilgi kurumun kendi sayfasından
 *   kapak/logo           → şeritte görselsiz kart sırıtıyor
 *
 * Uydurma bir "popülerlik" ya da "editör seçimi" yok: ikisini de
 * tutacak veri yok ve olmayan bir şeyi ima etmek istemiyoruz.
 *
 * NEDEN TARİHİ OLMAYAN KAYIT GİRMİYOR
 * -----------------------------------
 * Şeridin taşıdığı tek güçlü sinyal zaman. Takvimi açıklanmamış bir
 * kaydı oraya koymak, "kaçırma" diyen bir vitrine "ne zaman olduğunu
 * bilmiyoruz" diyen bir kart koymak olurdu. O kayıtlar alttaki listede
 * duruyor.
 */

/** Şeride girebilmek için son başvuruya en fazla bu kadar gün kalmalı. */
export const ONE_CIKAN_UFUK_GUN = 45;

/** Şeritte en fazla bu kadar kart. */
export const ONE_CIKAN_EN_FAZLA = 8;

/**
 * Şerit bundan az kartla çizilmiyor.
 *
 * Tek ya da iki kartlık bir "öne çıkanlar" şeridi, yatay kaydırma
 * vaat edip kaydıracak bir şey vermiyor; vitrin değil, kaza gibi
 * duruyor.
 */
export const ONE_CIKAN_EN_AZ = 3;

/**
 * Bir kaydın öne çıkma puanı. Yalnızca bileşenleri açıklanabilir
 * sinyaller; toplam bir "kalite skoru" değil, bir sıralama anahtarı.
 */
export function oneCikanPuani(item, now = new Date()) {
  const kalan = kalanGun(item, now);
  if (kalan == null) return 0;

  let puan = 0;

  /* Yaklaşan son tarih en güçlü sinyal. */
  if (kalan <= 3) puan += 40;
  else if (kalan <= 7) puan += 32;
  else if (kalan <= 14) puan += 24;
  else if (kalan <= 30) puan += 12;
  else puan += 4;

  /* Doğrulanmış tutar: öğrencinin kararını en çok belirleyen bilgi. */
  if (bursTutariVar(item)) puan += 20;

  /* Kaynağı doğrulanmış kayıt vitrine daha rahat çıkıyor. */
  if (item?.verifiedAt) puan += 12;

  /* Görsel: kapak > logo > hiçbiri. Şeritte görselsiz kart sırıtıyor. */
  if (item?.coverImageUrl) puan += 8;
  else if (item?.organizationLogoUrl) puan += 4;

  return puan;
}

function kalanGun(item, now) {
  if (!item?.applicationDeadline) return null;
  const son = new Date(item.applicationDeadline);
  if (Number.isNaN(son.getTime())) return null;
  const gun = Math.ceil((son.getTime() - now.getTime()) / 86400000);
  return gun < 0 ? null : gun;
}

/** Şeride girebilir mi? */
export function oneCikabilir(item, now = new Date()) {
  if (!item) return false;
  if (opportunityStatus(item, now) !== 'acik') return false;
  /* Tüpün anlamlı olması için tarih gerekiyor; takvimsiz kayıt girmiyor. */
  if (tupDurumu(item, now) === 'takvimsiz') return false;
  const kalan = kalanGun(item, now);
  return kalan != null && kalan <= ONE_CIKAN_UFUK_GUN;
}

/**
 * Şeritte gösterilecek kayıtlar.
 *
 * Yeterli kayıt yoksa BOŞ dizi dönüyor ve çağıran taraf şeridi hiç
 * çizmiyor — az sayıda kartla vitrin kurmak yerine hiç kurmamak doğru.
 */
export function oneCikanBurslar(items = [], now = new Date()) {
  const aday = (items || []).filter((item) => oneCikabilir(item, now));
  if (aday.length < ONE_CIKAN_EN_AZ) return [];

  return [...aday]
    .sort((a, b) => {
      const fark = oneCikanPuani(b, now) - oneCikanPuani(a, now);
      if (fark !== 0) return fark;
      /* Eşit puanda önce kapanan önde: sıralama her yüklemede aynı. */
      return String(a.applicationDeadline).localeCompare(String(b.applicationDeadline));
    })
    .slice(0, ONE_CIKAN_EN_FAZLA);
}
