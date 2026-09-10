import React from 'react';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  SosyalHata,
  baglantiDurumu,
  baglantiKaldir,
  baglantiKur,
  baglantiYanitla,
  baglantiYenidenBaslat,
  baglantiYenidenGonder,
  type BaglantiBilgisi,
} from '../../lib/queries/sosyal';
import { tarihMetni } from '../../lib/tarih.mjs';

/**
 * BAĞLANTI DÜĞMESİ — YEDİ DURUM
 *
 * Karşılıklı bağlantı tek satır ve simetrik. Yön (`ben_mi_gonderdim`)
 * bir hiyerarşi değil, yalnız isteğin kimden çıktığı; ama düğmenin ne
 * yazacağını o belirliyor.
 *
 *   yok                 "Bağlantı kur"            yeni satır
 *   giden bekliyor      "İstek gönderildi"        geri çek (satır silinir)
 *   gelen bekliyor      "Sana istek gönderdi"     kabul / reddet
 *   bağlı               "Bağlantınız var"         bağlantıyı kaldır
 *   reddettim           kendi reddim              yeniden başlat (RPC)
 *   reddedildim         yeniden deneme tarihi     süre dolunca yeniden gönder
 *   engel               —                          SATIR HİÇ ÇİZİLMİYOR
 *
 * SIFIR SATIR = DÜĞME YOK
 * -----------------------
 * `baglanti_durumu` görünmeyen hedef için hiç satır dönmüyor. Bu durumda
 * bileşen `null` dönüyor: gizlenmiş bir düğme DOM'da durur, klavyeyle
 * bulunur ve "bu profil var" bilgisini sızdırırdı.
 *
 * SÜREYİ SUNUCU ÖLÇÜYOR
 * ---------------------
 * Reddedilen isteğin 30 günlük beklemesi `responded_at` + veritabanı
 * saatiyle hesaplanıyor ve RPC bize yalnız BİTİŞ ANINI veriyor. Arayüz o
 * anı yazıyor; "yakında" gibi ölçülmemiş bir söz kurmuyor. Düğmenin
 * açılıp açılmayacağına bakarken tarayıcı saati kullanılıyor ama bu
 * yalnızca bir kolaylık: saati ileri alınmış bir tarayıcıda istek
 * sunucuda 42501 ile duruyor ve hata cümlesi bunu söylüyor.
 *
 * İYİMSER GÜNCELLEME YOK
 * ----------------------
 * Durum ancak sunucu isteği kabul ettikten SONRA yeniden okunuyor. Tersi
 * olsaydı, reddedilen bir istekte ekranda "İstek gönderildi" kalırdı.
 */

interface BaglantiDugmesiProps {
  /** Bakan kişinin oturum kimliği. */
  bakanId: string;
  /** Profili görüntülenen kişinin kimliği. */
  hedefId: string;
}

const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

export const BaglantiDugmesi: React.FC<BaglantiDugmesiProps> = ({ bakanId, hedefId }) => {
  const [bilgi, setBilgi] = React.useState<BaglantiBilgisi | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [islemde, setIslemde] = React.useState(false);
  const [hataMesaji, setHataMesaji] = React.useState<string | null>(null);

  React.useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    baglantiDurumu(hedefId)
      .then((yeni) => {
        if (iptal) return;
        setBilgi(yeni);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [hedefId]);

  /**
   * Tek eylem yolu.
   *
   * Kilit, hata dalı ve yeniden okuma her eylem için AYNI yerden geçiyor.
   * Beş ayrı işleyici olsaydı biri kilidi unutur ve çift tıklama ikinci
   * bir istek atardı.
   */
  const eylemiCalistir = async (eylem: () => Promise<void>) => {
    if (islemde) return;
    setIslemde(true);
    setHataMesaji(null);
    try {
      await eylem();
      /*
        Durum SUNUCUDAN yeniden okunuyor, yerelde tahmin edilmiyor: kabul
        anında karşı taraf isteği geri çekmiş olabilir ve o zaman ekranda
        gerçekte var olmayan bir bağlantı görünürdü.
      */
      const yeni = await baglantiDurumu(hedefId);
      setBilgi(yeni);
    } catch (sorun) {
      setHataMesaji(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'İşlem tamamlanamadı. Bağlantında bir değişiklik olmadı.',
      );
    } finally {
      setIslemde(false);
    }
  };

  if (durum === 'yukleniyor') {
    return (
      <div aria-busy="true" className="flex">
        <span aria-hidden className="h-11 w-40 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (durum === 'hata') {
    return (
      <p role="alert" className="text-sm text-gray-600">
        Bağlantı durumu alınamadı.
      </p>
    );
  }

  /* Sıfır satır: hedef sana kapalı. Düğme DOM'a hiç girmiyor. */
  if (!bilgi) return null;

  const yenidenDenemeMetni = tarihMetni(bilgi.yenidenDenemeAni);
  const sureDoldu =
    !bilgi.yenidenDenemeAni || new Date(bilgi.yenidenDenemeAni).getTime() <= Date.now();

  /* Her durumun kendi başlığı ve kendi eylemleri; ortak bir "belki" dalı yok. */
  let govde: React.ReactNode = null;

  if (bilgi.durum === 'yok') {
    govde = (
      <button
        type="button"
        disabled={islemde}
        onClick={() => eylemiCalistir(() => baglantiKur(bakanId, hedefId))}
        className={BIRINCIL_EYLEM}
      >
        {islemde ? 'Gönderiliyor…' : 'Bağlantı kur'}
      </button>
    );
  } else if (bilgi.durum === 'bekliyor' && bilgi.benMiGonderdim) {
    govde = (
      <>
        <p className="text-sm font-semibold text-gray-700">İstek gönderildi</p>
        <button
          type="button"
          disabled={islemde}
          onClick={() => eylemiCalistir(() => baglantiKaldir(bakanId, hedefId))}
          className={IKINCIL}
        >
          {islemde ? 'Geri çekiliyor…' : 'İsteği geri çek'}
        </button>
      </>
    );
  } else if (bilgi.durum === 'bekliyor') {
    govde = (
      <>
        <p className="text-sm font-semibold text-gray-700">Sana istek gönderdi</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={islemde}
            onClick={() => eylemiCalistir(() => baglantiYanitla(bakanId, hedefId, 'kabul'))}
            className={BIRINCIL_EYLEM}
          >
            Kabul et
          </button>
          <button
            type="button"
            disabled={islemde}
            onClick={() => eylemiCalistir(() => baglantiYanitla(bakanId, hedefId, 'red'))}
            className={IKINCIL}
          >
            Reddet
          </button>
        </div>
      </>
    );
  } else if (bilgi.durum === 'kabul') {
    govde = (
      <>
        <p className="text-sm font-semibold text-gray-700">Bağlantınız var</p>
        <button
          type="button"
          disabled={islemde}
          onClick={() => eylemiCalistir(() => baglantiKaldir(bakanId, hedefId))}
          className={IKINCIL}
        >
          {islemde ? 'Kaldırılıyor…' : 'Bağlantıyı kaldır'}
        </button>
      </>
    );
  } else if (bilgi.durum === 'red' && !bilgi.benMiGonderdim) {
    /*
      REDDEDEN TARAF: kendi reddini "kabul"e çeviremiyor (kabul, karşı
      tarafın hâlâ istediği anlamına gelir ve bu tek taraflı varsayılamaz).
      Fikrini değiştirdiyse yolu kendi isteğini başlatmak.
    */
    govde = (
      <>
        <p className="text-sm font-semibold text-gray-700">Bu isteği reddettin</p>
        <button
          type="button"
          disabled={islemde}
          onClick={() => eylemiCalistir(() => baglantiYenidenBaslat(hedefId))}
          className={IKINCIL}
        >
          {islemde ? 'Gönderiliyor…' : 'Bağlantı kur'}
        </button>
      </>
    );
  } else {
    /*
      REDDEDİLEN TARAF: bekleme süresi dolmadan düğme çizilmiyor. Süre
      dolduğunda aynı satır yeniden "bekliyor"a dönüyor; yeni bir satır
      açılmıyor (ters yön indeksi buna izin vermezdi).
    */
    govde = (
      <>
        {yenidenDenemeMetni && !sureDoldu && (
          <p className="text-sm text-gray-600">Yeniden gönderilebilir: {yenidenDenemeMetni}</p>
        )}
        {sureDoldu && (
          <button
            type="button"
            disabled={islemde}
            onClick={() => eylemiCalistir(() => baglantiYenidenGonder(bakanId, hedefId))}
            className={IKINCIL}
          >
            {islemde ? 'Gönderiliyor…' : 'Bağlantı kur'}
          </button>
        )}
        {!yenidenDenemeMetni && !sureDoldu && (
          <p className="text-sm text-gray-600">Yeniden gönderilebilir bir tarih bilinmiyor.</p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-2">
      {govde}
      {hataMesaji && (
        <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
          {hataMesaji}
        </p>
      )}
    </div>
  );
};
