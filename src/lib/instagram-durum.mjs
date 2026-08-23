/**
 * Instagram bağlantı durumunun saf mantığı.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Ağ çağrıları Pages Function'da (functions/api/instagram/durum.ts), karar
 * burada. Böylece "token geçerli mi, hesap doğru mu, paylaşım yetkisi var mı"
 * soruları gerçek istek atmadan test edilebiliyor — testin Instagram'a
 * bağlanması gerekmiyor.
 *
 * SIR SIZDIRMAMA
 * --------------
 * Buradaki hiçbir fonksiyon token, app secret veya tam adres döndürmüyor.
 * Çıktı yalnızca "geçerli mi, ne zaman bitiyor, hangi hesap, hangi yetkiler"
 * bilgisini taşıyor; admin ekranına da bu iniyor.
 */

/** Meta Graph sürümü. Tek yerde: sürüm yükseltmesi tek satır. */
export const GRAF_SURUM = 'v21.0';

/** İçerik yayınlama için gereken izin. */
export const YAYIN_IZNI = 'instagram_content_publish';

/** Ortamda olması gereken değişkenler. */
export const GEREKLI_AYARLAR = [
  'INSTAGRAM_APP_ID',
  'INSTAGRAM_APP_SECRET',
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_USER_ID',
];

/**
 * Hangi değişkenler eksik? Değerleri değil, yalnızca adları döner.
 * @param {Record<string, unknown>} env
 */
export function eksikAyarlar(env) {
  return GEREKLI_AYARLAR.filter((ad) => !env?.[ad] || String(env[ad]).trim() === '');
}

/**
 * Doğrulama için çağrılacak adresler.
 *
 * Uygulama erişim jetonu `app_id|app_secret` biçiminde; Meta'nın kendi
 * beklediği biçim bu. Adresler yalnızca sunucuda kullanılıyor, istemciye
 * hiç inmiyor.
 */
export function grafAdresleri(env) {
  const uygulamaJetonu = `${env.INSTAGRAM_APP_ID}|${env.INSTAGRAM_APP_SECRET}`;
  const jeton = encodeURIComponent(env.INSTAGRAM_ACCESS_TOKEN);
  const kullaniciId = encodeURIComponent(env.INSTAGRAM_USER_ID);

  return {
    /** Jetonun geçerliliği, bitiş zamanı ve izinleri. */
    dogrulama: `https://graph.facebook.com/${GRAF_SURUM}/debug_token?input_token=${jeton}&access_token=${encodeURIComponent(uygulamaJetonu)}`,
    /** Bağlanan hesabın kimliği. */
    hesap: `https://graph.facebook.com/${GRAF_SURUM}/${kullaniciId}?fields=id,username,name&access_token=${jeton}`,
    /** Yayınlama kotası: yetkinin fiilen çalıştığını gösteren tek uç. */
    kota: `https://graph.facebook.com/${GRAF_SURUM}/${kullaniciId}/content_publishing_limit?fields=config,quota_usage&access_token=${jeton}`,
  };
}

/** Meta hata gövdesinden okunabilir tek satır çıkarır. */
export function grafHatasi(govde) {
  const hata = govde?.error;
  if (!hata) return null;
  const parcalar = [hata.message, hata.type, hata.code != null ? `kod ${hata.code}` : null];
  return parcalar.filter(Boolean).join(' — ');
}

/**
 * Instagram Login (graph.instagram.com) adresleri.
 *
 * NEDEN İKİ YÜZEY VAR
 * -------------------
 * Meta'nın iki ayrı Instagram kurulumu var: Facebook Login ile bağlanan
 * işletme hesapları graph.facebook.com'dan, "Instagram API with Instagram
 * Login" jetonları ise graph.instagram.com'dan konuşuyor. İkinci tür jeton
 * ilkine sorulduğunda "Cannot parse access token" hatası veriyor — ölçüldü,
 * canlı kurulumda tam bu oldu.
 *
 * Bu yüzden doğrulama iki yüzeyi de deniyor ve hangisi cevap verdiyse onu
 * kullanıyor.
 */
export function instagramAdresleri(env) {
  const jeton = encodeURIComponent(env.INSTAGRAM_ACCESS_TOKEN);
  const kullaniciId = encodeURIComponent(env.INSTAGRAM_USER_ID);

  return {
    hesap: `https://graph.instagram.com/${GRAF_SURUM}/me?fields=id,user_id,username,account_type&access_token=${jeton}`,
    kota: `https://graph.instagram.com/${GRAF_SURUM}/${kullaniciId}/content_publishing_limit?fields=config,quota_usage&access_token=${jeton}`,
  };
}

/**
 * Instagram Login yüzeyi için özet.
 *
 * Bu yüzeyde debug_token yok: jetonun geçerliliği `me` çağrısının
 * cevap vermesiyle, paylaşım yetkisi de content_publishing_limit ucunun
 * hatasız dönmesiyle anlaşılıyor — o uç zaten yalnızca yayın izni olan
 * jetonlara açık.
 */
export function instagramDurumOzeti({ hesap, kota, beklenenKullaniciId }) {
  const sorunlar = [];

  const hesapHatasi = grafHatasi(hesap);
  if (hesapHatasi) sorunlar.push(`Hesap okunamadı: ${hesapHatasi}`);

  // Instagram Login'de `id` uygulamaya özel, `user_id` ise hesabın kendi
  // kimliği. INSTAGRAM_USER_ID ikisinden biriyle eşleşebilir.
  const kimlikler = [hesap?.user_id, hesap?.id].filter((deger) => deger != null).map(String);
  const eslesme = beklenenKullaniciId ? kimlikler.includes(String(beklenenKullaniciId)) : kimlikler.length > 0;
  if (kimlikler.length && beklenenKullaniciId && !eslesme) {
    sorunlar.push('Dönen hesap kimliği INSTAGRAM_USER_ID ile aynı değil.');
  }

  const kotaHatasi = grafHatasi(kota);
  if (kotaHatasi) sorunlar.push(`Paylaşım yetkisi doğrulanamadı: ${kotaHatasi}`);

  const kotaKaydi = Array.isArray(kota?.data) ? kota.data[0] : null;
  const yayinYetkisi = Boolean(kotaKaydi) && !kotaHatasi;

  return {
    yuzey: 'instagram-login',
    bagli: sorunlar.length === 0 && kimlikler.length > 0 && yayinYetkisi,
    sorunlar,
    hesap: kimlikler.length
      ? {
          id: String(hesap.user_id ?? hesap.id),
          kullaniciAdi: hesap.username ?? null,
          ad: hesap.account_type ?? null,
        }
      : null,
    jeton: {
      gecerli: kimlikler.length > 0,
      suresiz: false,
      biterTarih: null,
      gunKaldi: null,
      izinler: [],
      yayinYetkisi,
    },
    yayinKotasi: kotaKaydi
      ? { kullanilan: kotaKaydi.quota_usage ?? null, sinir: kotaKaydi.config?.quota_total ?? null }
      : null,
  };
}

/**
 * Üç yanıttan tek bir durum özeti çıkarır.
 *
 * @param {object} girdi
 * @param {any} girdi.dogrulama debug_token yanıtı
 * @param {any} girdi.hesap hesap alanları yanıtı
 * @param {any} girdi.kota content_publishing_limit yanıtı (yoksa null)
 * @param {string} girdi.beklenenKullaniciId INSTAGRAM_USER_ID
 * @param {Date} [girdi.simdi]
 */
export function durumOzeti({ dogrulama, hesap, kota, beklenenKullaniciId, simdi = new Date() }) {
  const sorunlar = [];
  const veri = dogrulama?.data ?? null;

  const dogrulamaHatasi = grafHatasi(dogrulama);
  if (dogrulamaHatasi) sorunlar.push(`Jeton doğrulanamadı: ${dogrulamaHatasi}`);

  const jetonGecerli = Boolean(veri?.is_valid);
  if (veri && !jetonGecerli) {
    sorunlar.push(veri.error?.message ? `Jeton geçersiz: ${veri.error.message}` : 'Jeton geçersiz.');
  }

  /*
    expires_at = 0 → süresiz jeton (uzun ömürlü sayfa jetonlarında böyle).
    Bunu "süresi dolmuş" saymak yanlış olurdu.
  */
  const bitisSaniye = typeof veri?.expires_at === 'number' ? veri.expires_at : null;
  const suresiz = bitisSaniye === 0;
  const tokenBitis = bitisSaniye && bitisSaniye > 0 ? new Date(bitisSaniye * 1000).toISOString() : null;
  const gunKaldi = tokenBitis
    ? Math.floor((new Date(tokenBitis).getTime() - simdi.getTime()) / 86400000)
    : null;
  if (gunKaldi != null && gunKaldi < 0) sorunlar.push('Jetonun süresi dolmuş.');
  else if (gunKaldi != null && gunKaldi <= 7) sorunlar.push(`Jetonun süresi ${gunKaldi} gün içinde doluyor.`);

  const izinler = Array.isArray(veri?.scopes) ? veri.scopes : [];
  const yayinYetkisi = izinler.includes(YAYIN_IZNI);
  if (veri && !yayinYetkisi) sorunlar.push(`Paylaşım izni yok (${YAYIN_IZNI}).`);

  const hesapHatasi = grafHatasi(hesap);
  if (hesapHatasi) sorunlar.push(`Hesap okunamadı: ${hesapHatasi}`);

  const hesapId = hesap?.id != null ? String(hesap.id) : null;
  if (hesapId && beklenenKullaniciId && hesapId !== String(beklenenKullaniciId)) {
    sorunlar.push('Dönen hesap kimliği INSTAGRAM_USER_ID ile aynı değil.');
  }

  const kotaHatasi = grafHatasi(kota);
  if (kotaHatasi) sorunlar.push(`Yayın kotası okunamadı: ${kotaHatasi}`);

  const kotaKaydi = Array.isArray(kota?.data) ? kota.data[0] : null;

  return {
    yuzey: 'facebook-login',
    bagli: sorunlar.length === 0 && jetonGecerli && Boolean(hesapId),
    sorunlar,
    hesap: hesapId
      ? { id: hesapId, kullaniciAdi: hesap.username ?? null, ad: hesap.name ?? null }
      : null,
    jeton: {
      gecerli: jetonGecerli,
      suresiz,
      biterTarih: tokenBitis,
      gunKaldi,
      izinler,
      yayinYetkisi,
    },
    yayinKotasi: kotaKaydi
      ? {
          kullanilan: kotaKaydi.quota_usage ?? null,
          sinir: kotaKaydi.config?.quota_total ?? null,
        }
      : null,
  };
}
/**
 * Bağlantıyı iki yüzeyde de dener ve tek bir özet döndürür.
 *
 * Sıra önemli: önce Facebook Login yüzeyi, çünkü orada jetonun bitiş tarihi
 * ve izin listesi de okunabiliyor. Jeton o yüzeyde çözülemiyorsa (Instagram
 * Login jetonlarında olan tam bu) graph.instagram.com deneniyor.
 *
 * `getir` dışarıdan verilebiliyor: testler ağ çağrısı yapmadan koşuyor.
 */
export async function baglantiyiDogrula(env, getir) {
  const cek = async (adres) => {
    try {
      const cevap = await getir(adres, { headers: { accept: 'application/json' } });
      return await cevap.json();
    } catch (hata) {
      return { error: { message: String(hata?.message ?? hata).slice(0, 120), type: 'agGecidi' } };
    }
  };

  const fbAdres = grafAdresleri(env);
  const [dogrulama, fbHesap, fbKota] = await Promise.all([
    cek(fbAdres.dogrulama),
    cek(fbAdres.hesap),
    cek(fbAdres.kota),
  ]);

  const fbOzet = durumOzeti({
    dogrulama,
    hesap: fbHesap,
    kota: fbKota,
    beklenenKullaniciId: String(env.INSTAGRAM_USER_ID),
  });
  if (fbOzet.bagli) return fbOzet;

  const igAdres = instagramAdresleri(env);
  const [igHesap, igKota] = await Promise.all([cek(igAdres.hesap), cek(igAdres.kota)]);
  const igOzet = instagramDurumOzeti({
    hesap: igHesap,
    kota: igKota,
    beklenenKullaniciId: String(env.INSTAGRAM_USER_ID),
  });
  if (igOzet.bagli) return igOzet;

  /*
    İkisi de olmadıysa hangi yüzeyin daha ileri gittiğini gösteriyoruz:
    hesabı okuyabilen yüzey, hiç çözemeyenden daha bilgilendirici.
  */
  return igOzet.hesap ? igOzet : fbOzet;
}
