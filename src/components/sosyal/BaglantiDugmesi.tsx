import React from 'react';
import { BaglantiKaldirMenusu } from './BaglantiKaldirMenusu';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  SosyalHata,
  baglantiDurumu,
  baglantiEngeli,
  baglantiKaldir,
  baglantiKur,
  baglantiYanitla,
  baglantiYenidenBaslat,
  baglantiYenidenGonder,
  type BaglantiBilgisi,
  type BaglantiEngeli,
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
 *
 * KURAL ÖNCE SORULUYOR, SONRA DÜĞME ÇİZİLİYOR
 * -------------------------------------------
 * Bağlantı ÖNEREN her dal (yeni istek, kendi reddini geri alma, süresi
 * dolmuş isteği yeniden gönderme) önce `baglanti_engeli`ne soruyor.
 * Kullanıcı kararı (19 Eylül 2026) kuralın yalnız uygulanmasını değil
 * İZAH EDİLMESİNİ de istiyor: engel varsa düğme yerine sebebi yazan bir
 * satır çiziliyor. Öncesinde düğme basılıyor, istek 403 ile düşüyor ve
 * ekranda sebebine dair hiçbir şey olmuyordu.
 *
 * İKİ SORGU TEK YÜKLEME TURUNDA (`Promise.all`): sırayla sorulsaydı
 * "Bağlantı kur" düğmesi bir an görünüp sonra sebep metnine dönüşürdü —
 * kullanıcının basmaya yetişebileceği bir düğme.
 */

interface BaglantiDugmesiProps {
  /** Bakan kişinin oturum kimliği. */
  bakanId: string;
  /** Profili görüntülenen kişinin kimliği. */
  hedefId: string;
}

const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

/**
 * Engel sebebi → kullanıcı cümlesi. `null` dönmesi "yazacak bir şey yok"
 * demek ve o dalda düğme çiziliyor.
 *
 * KARŞI TARAFIN ALAN ADI YAZILMIYOR
 * ---------------------------------
 * Cümle karşı tarafı değil BENİ merkeze alıyor: "senin alanında değil".
 *
 * Gerekçe gizlilik DEĞİL — ölçüldü (yerel, 20 Eylül 2026,
 * /profil/farklialan): alan rozeti karşı tarafın kendi kartında zaten
 * duruyor ("Bilişim ve Yazılım alanı"), yani adı burada yazmak yeni bir
 * bilgi açmazdı. Gerekçe iki tane:
 *
 *   · Rozet HER SATIRDA ÇİZİLMİYOR: `ogrenciKimligiGorunurMu` resmî
 *     hesapta öğrenci kimliğini kapatıyor. Adı bu cümleye koymak,
 *     rozetin çizilmediği satırda onu geri açmak olurdu.
 *   · Rozet zaten aynı kartın iki satır üstünde; adı tekrar yazmak aynı
 *     bilgiyi iki kez söylemek olurdu.
 *
 * Bileşen bu yüzden alan adını HİÇBİR YERDEN okumuyor; elinde olmayan
 * bir değeri yanlışlıkla basamaz.
 *
 * İKİ CÜMLE DE "ALAN SEÇ" DEMİYOR, "BÖLÜMÜNÜ GİR" DİYOR
 * -----------------------------------------------------
 * Çünkü alanı seçen bir ekran YOK: `social_profiles.sector_id` kolonuna
 * istemcinin yazma yetkisi bile yok ve `bolum_girilince_tamamla`
 * (20260926050000) alanı öğrenci profilindeki BÖLÜMDEN türetiyor.
 * "Alanını seç" demek, kullanıcıyı var olmayan bir adıma göndermek
 * olurdu; aradığı seçiciyi bulamayınca elinde iş kalmazdı.
 *
 * KARŞI TARAF ADINA İDDİA KURULMUYOR: 'alani-yok' dalında "seçmemiş"
 * değil "belli değil" yazıyor. Kolonun boş olması o kişinin bir şeyi
 * ATLADIĞINI kanıtlamıyor — bölümü katalogla eşleşmemiş ya da bölümü
 * henüz bir alana bağlanmamış da olabilir (bkz. `talepKipi`,
 * SosyalProfilSayfasi). Yapılacak iş yine de söyleniyor, ama sebebi
 * uydurulmadan.
 *
 * 'engel' VE 'gorunmez' İÇİN CÜMLE YOK
 * ------------------------------------
 * O iki durumda `baglanti_durumu` zaten sıfır satır döndürüyor ve
 * bileşen `null` dönüyor (bkz. "SIFIR SATIR = DÜĞME YOK"). Buraya
 * düşseler bile sebep yazılmıyor: gizlenmiş ya da açıklanmış bir satır,
 * "bu profil var" bilgisini sızdırır.
 *
 * TANINMAYAN SEBEP (`null`) DE BU DALA DÜŞÜYOR: sorgu hata verdiğinde
 * davranış bugünküyle aynı kalıyor — düğme çiziliyor, kural
 * çiğneniyorsa sunucu reddediyor ve mevcut hata cümlesi çıkıyor.
 * Sessizce eksilen bir düğme, bozuk bir ekrandan ayırt edilemezdi.
 */
function engelCumlesi(engel: BaglantiEngeli | null): string | null {
  if (engel === 'farkli-alan') {
    return 'Bağlantı yalnız aynı alandaki kişiler arasında kurulabilir. Bu kişi senin alanında değil.';
  }
  if (engel === 'alani-yok') {
    return 'Bu kişinin alanı henüz belli değil. Profilinde bölümünü girdiğinde bağlantı kurabilirsin.';
  }
  if (engel === 'alanim-yok') {
    return 'Bağlantı kurmak için önce profiline bölümünü gir.';
  }
  return null;
}

/*
  BÖLÜMÜN GİRİLDİĞİ YERİN ADRESİ

  Bölüm `/cv` ekranının düzenleme kipinde, "Okul & Bölüm" bölümünde
  giriliyor; alan oradan sunucuda türetiliyor (bkz. `engelCumlesi`).
  DÜZENLEME KİPİNİN KENDİ ADRESİ YOK — `StudentProfileView` içinde bir
  bileşen durumu (`duzenleme`), rotası yok. Bu yüzden bağlantı ekranın
  kendisine gidiyor: var olmayan bir adrese göndermek, kullanıcıyı 404'e
  düşürürdü. Bağlantı metni de bu yüzden "Profiline git" — bir tık daha
  var ve cümle onu vaat etmiyor.
*/
const PROFIL_YOLU = '/cv';

/** Sebep satırı; yalnız 'alanim-yok' dalında yapılacak bir iş var. */
const EngelSatiri: React.FC<{ engel: BaglantiEngeli | null; cumle: string }> = ({
  engel,
  cumle,
}) => (
  <div className="space-y-1">
    <p className="text-sm leading-relaxed text-gray-600">{cumle}</p>
    {engel === 'alanim-yok' && (
      /*
        Gerçek `<a href>`: orta tuş ve "yeni sekmede aç" çalışıyor.
        Bileşenin bir `onNavigate` girdisi yok, o yüzden geçiş tam sayfa
        yükleme; adres gerçek olduğu için sonuç doğru.
      */
      <a
        href={PROFIL_YOLU}
        className={`inline-flex min-h-11 items-center text-sm font-bold text-blue-700 hover:underline ${ODAK_HALKASI}`}
      >
        Profiline git
      </a>
    )}
  </div>
);

export const BaglantiDugmesi: React.FC<BaglantiDugmesiProps> = ({ bakanId, hedefId }) => {
  const [bilgi, setBilgi] = React.useState<BaglantiBilgisi | null>(null);
  /** `null` = sebep bilinmiyor; o dalda düğme bugünkü gibi çiziliyor. */
  const [engel, setEngel] = React.useState<BaglantiEngeli | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [islemde, setIslemde] = React.useState(false);
  const [hataMesaji, setHataMesaji] = React.useState<string | null>(null);

  /*
    İKİ SORGU AYNI TURDA

    Sebep, durumdan SONRA sorulsaydı ilk turda düğme çizilir, ikinci
    turda sebep metnine dönüşürdü; arada basılan düğme 403 alırdı.
    `Promise.all` ikisini aynı tikte açıyor ve ekran tek seferde
    yerleşiyor.

    ENGEL SORGUSUNUN HATASI ASIL DURUMU DÜŞÜRMÜYOR: `catch` ile `null`a
    iniyor, yani "sebep bilinmiyor". Aksi hâlde sebep RPC'sindeki bir
    aksaklık bağlantı satırını tamamen görünmez yapar ve kullanıcı
    bağlantısının ne durumda olduğunu da okuyamazdı.
  */
  const oku = React.useCallback(
    () =>
      Promise.all([
        baglantiDurumu(hedefId),
        baglantiEngeli(hedefId).catch(() => null),
      ]),
    [hedefId],
  );

  React.useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    oku()
      .then(([yeniBilgi, yeniEngel]) => {
        if (iptal) return;
        setBilgi(yeniBilgi);
        setEngel(yeniEngel);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [oku]);

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

        SEBEP DE YENİDEN SORULUYOR: eylemden sonra satır 'yok'a dönebilir
        (istek geri çekme) ve o dalda düğmeyi çizip çizmemeye karar veren
        şey sebep. Eski sebeple çizilen bir düğme, aradaki alan
        değişikliğini yok sayardı.
      */
      const [yeniBilgi, yeniEngel] = await oku();
      setBilgi(yeniBilgi);
      setEngel(yeniEngel);
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

  /*
    KURAL CÜMLESİ, DÜĞMEDEN ÖNCE

    Dolu olduğunda bağlantı ÖNEREN üç dalın üçünde de düğmenin yerini
    alıyor. Bekleyen istek, kurulu bağlantı ve gelen istek dallarına
    karışmıyor: oradaki eylemler (geri çek, kabul, reddet, kaldır) yeni
    bağlantı kurmuyor ve alan kuralı onları durdurmuyor.
  */
  const kuralCumlesi = engelCumlesi(engel);

  /* Her durumun kendi başlığı ve kendi eylemleri; ortak bir "belki" dalı yok. */
  let govde: React.ReactNode = null;

  if (bilgi.durum === 'yok') {
    govde = kuralCumlesi ? (
      <EngelSatiri engel={engel} cumle={kuralCumlesi} />
    ) : (
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
        {/* Kaldırma "⋯" menüsünde ve onaylı (BaglantiKaldirMenusu). */}
        <BaglantiKaldirMenusu
          ad="Bu kişi"
          islemde={islemde}
          onKaldir={() => eylemiCalistir(() => baglantiKaldir(bakanId, hedefId))}
        />
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
        {/* Kendi reddim bir OLGU; kural cümlesi çizilse de yerinde kalıyor. */}
        <p className="text-sm font-semibold text-gray-700">Bu isteği reddettin</p>
        {kuralCumlesi ? (
          <EngelSatiri engel={engel} cumle={kuralCumlesi} />
        ) : (
          <button
            type="button"
            disabled={islemde}
            onClick={() => eylemiCalistir(() => baglantiYenidenBaslat(hedefId))}
            className={IKINCIL}
          >
            {islemde ? 'Gönderiliyor…' : 'Bağlantı kur'}
          </button>
        )}
      </>
    );
  } else if (kuralCumlesi) {
    /*
      REDDEDİLEN TARAF, ENGELLİ: yalnız sebep yazılıyor.

      Bekleme tarihi burada BİLEREK çizilmiyor. "Yeniden gönderilebilir:
      12 Ekim" demek, o tarihte gönderilebileceğini söylemek olurdu; alan
      kuralı o tarihte de aynı yerde duruyor ve istek yine reddedilirdi.
    */
    govde = <EngelSatiri engel={engel} cumle={kuralCumlesi} />;
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
