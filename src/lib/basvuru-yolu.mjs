import { guvenliDisAdres } from './guvenli-url.mjs';

/**
 * Bir ilana nasıl başvurulduğunun TEK doğruluk kaynağı.
 *
 * NEDEN TEK YERDE
 * ---------------
 * Kart, önizleme modalı, ilan detayı ve başvuru diyalogu aynı ilan için farklı
 * şeyler söylüyordu. Kartta "StajımVar ile Başvur" yazan mavi düğme vardı,
 * diyalog ise açılınca "bu başvuru şirkete iletilmiyor" diyordu. Kullanıcı
 * düğmeye bakıp başvurduğunu sanıyor, stajı kaçırıyordu.
 *
 * GERÇEK DURUM (ölçüldü, 23 Ağustos 2026)
 * ---------------------------------------
 * - Yayındaki 13 ilanın tamamı `external` ve hepsinde resmî başvuru adresi var.
 * - `application_channels` tablosu BOŞ: doğrulanmış tek bir e-posta kanalı yok.
 * - E-postayı gönderecek işçi (automation/_ileride/notifier.py) hiçbir iş
 *   akışından çağrılmıyor, yani `email_application` yolu fiilen teslim etmiyor.
 *
 * Bu yüzden `email_application` şu an teslim vaadi vermiyor. Gönderici
 * çalışmaya başladığında tek yapılacak: EPOSTA_TESLIMI_CALISIYOR'u true yapmak.
 */

/**
 * Doğrulanmış kanala e-posta gönderen arka uç yayında mı?
 * `automation/_ileride/notifier.py` hazır ama zamanlanmış bir işi yok.
 */
export const EPOSTA_TESLIMI_CALISIYOR = false;

/**
 * @typedef {object} BasvuruYolu
 * @property {'resmi-site'|'platform-ici'|'kayit'} anaEylem
 * @property {string} anaEtiket ana düğmenin yazısı
 * @property {string|null} resmiAdres güvenli, mutlak HTTPS başvuru adresi
 * @property {boolean} teslimEdiliyor başvuru şirkete gerçekten iletiliyor mu
 * @property {string} ozet kullanıcıya tek cümleyle ne olduğu
 * @property {string|null} takipEtiketi ikinci eylem (yalnızca kayıt tutar)
 */

/**
 * @param {{applicationMethod?: string, applyUrl?: string, applicationChannelId?: string}} ilan
 * @returns {BasvuruYolu}
 */
export function basvuruYolu(ilan) {
  const yontem = ilan?.applicationMethod ?? 'external';
  const resmiAdres = guvenliDisAdres(ilan?.applyUrl);

  if (yontem === 'internal') {
    return {
      anaEylem: 'platform-ici',
      anaEtiket: 'StajımVar ile Başvur',
      resmiAdres,
      teslimEdiliyor: true,
      ozet: 'Bu ilan StajımVar üzerinden alınıyor. Başvurun şirketin panelinde görünür ve durumunu buradan takip edersin.',
      takipEtiketi: null,
    };
  }

  if (yontem === 'email_application' && EPOSTA_TESLIMI_CALISIYOR && ilan?.applicationChannelId) {
    return {
      anaEylem: 'platform-ici',
      anaEtiket: 'StajımVar ile Başvur',
      resmiAdres,
      teslimEdiliyor: true,
      ozet: 'Başvurun, şirketin doğrulanmış başvuru adresine iletilir; iletildiğinde "Başvurularım" sayfasında görürsün.',
      takipEtiketi: null,
    };
  }

  // Geriye kalan her şey: başvuru şirketin kendi sisteminden alınıyor.
  if (resmiAdres) {
    return {
      anaEylem: 'resmi-site',
      anaEtiket: 'Resmî sitede başvur',
      resmiAdres,
      teslimEdiliyor: false,
      ozet: 'Bu ilanın başvuruları şirketin kendi sayfasından alınıyor. Başvuru StajımVar üzerinden şirkete iletilmiyor.',
      takipEtiketi: 'Başvurduğumu işaretle',
    };
  }

  // Adres de yoksa yapılabilecek tek şey kaydı tutmak.
  return {
    anaEylem: 'kayit',
    anaEtiket: 'Başvurduğumu işaretle',
    resmiAdres: null,
    teslimEdiliyor: false,
    ozet: 'Bu ilan için doğrulanmış bir başvuru adresi yok. İşaretlersen yalnızca kendi takip listene eklenir.',
    takipEtiketi: null,
  };
}

/**
 * Başvuru kaydedildikten sonra gösterilecek mesaj. Teslim edilmeyen başvuruda
 * "iletildi" demek yanıltıcı olur; kullanıcı bekler ve stajı kaçırır.
 *
 * @param {{applicationMethod?: string, applyUrl?: string, applicationChannelId?: string}} ilan
 * @param {string} sirketAdi
 */
export function basvuruSonucMesaji(ilan, sirketAdi) {
  const yol = basvuruYolu(ilan);
  if (yol.teslimEdiliyor) {
    return `Başvurun ${sirketAdi} şirketine iletildi. Durumunu "Başvurularım" sayfasından takip edebilirsin.`;
  }
  return 'Takip listene eklendi. Bu başvuru şirkete iletilmedi — resmî sayfadan başvurmayı unutma.';
}
