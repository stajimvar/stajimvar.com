import React from 'react';
import { Clock, Undo2, UserCheck } from 'lucide-react';
import { BaglantiKaldirMenusu, OnayliEylemMenusu } from './BaglantiKaldirMenusu';
import { ODAK_HALKASI } from '../../lib/renk-token';
import { HAP, HAP_BIRINCIL, TAM_HUCRE, YARIM_HUCRE } from './ProfilKimlikKalibi';
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
import { kisaTarihMetni, tarihMetni } from '../../lib/tarih.mjs';

/**
 * BAĞLANTI DÜĞMESİ — YEDİ DURUM
 *
 * Karşılıklı bağlantı tek satır ve simetrik. Yön (`ben_mi_gonderdim`)
 * bir hiyerarşi değil, yalnız isteğin kimden çıktığı; ama düğmenin ne
 * yazacağını o belirliyor.
 *
 *   yok                 hap "Bağlantı kur"         yeni satır
 *   giden bekliyor      hap "İstek gönderildi"     menü → geri çek (satır silinir)
 *   gelen bekliyor      "Kabul et" + "Reddet"      grup adı: isteği kim gönderdi
 *   bağlı               hap "Bağlantıdasın"        menü → bağlantıyı kaldır
 *   reddettim           hap "Bağlantı kur"         yeniden başlat (RPC)
 *   reddedildim         hap, tarih gelene kadar    süre dolunca yeniden gönder
 *                       devre dışı
 *   görünmeyen hedef    —                          SATIR HİÇ ÇİZİLMİYOR
 *
 * Her durum TEK SATIR hap (kullanıcı kararı 24 Eylül 2026: durum hapın
 * kendisi, eylem görünür menüde); gerekçe `govde` dallarının başında.
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

/*
  HAP BİÇİMİ (kullanıcı onayı, 24 Eylül 2026): düğme profil başlığının hap
  sırasında duruyor ve öteki haplarla ayrışıyordu (`rounded-xl`, 48
  piksellik `BIRINCIL_EYLEM`). Biçim `ProfilKimlikKalibi`nden — üçüncü
  bir kopya yazılmadı. Rol durum başına, X'teki gibi:

    EYLEM ÇAĞRISI (Bağlantı kur, Kabul et)   dolu hap (`HAP_BIRINCIL`)
    İKİNCİL EYLEM (İsteği geri çek, Reddet)  çerçeveli hap (`HAP`)

  DURUM HAPIN KENDİSİ (kullanıcı kararı 24 Eylül 2026: durum hapın
  kendisi, eylem görünür menüde). Önceki karar "durum bir metin, düğme
  değil" idi ve metinli dallar hap sırasını 84 piksele, iki satıra
  çıkarıyordu; kullanıcı bunu istemedi. Gizli eylem YİNE yok: X'te
  "Pending" hapına basmak isteği doğrudan geri çekiyor; burada hap bir
  menü açıyor, menüde eylemin adı yazılı ve sonuç bir onay adımında
  (`OnayliEylemMenusu`). Ayrıntı `govde` dallarının başındaki tabloda.

  `disabled:` sınıfları kalıbın dizesine EKLENİYOR, değiştirmiyor: kalıpta
  karşılıkları yok, hangisinin kazanacağı sorusu doğmuyor.
*/
/*
  `w-full`: ziyaretçi eylem satırında hap hücresinin tamamını dolduruyor
  (X mobil kalıbı, 24 Eylül 2026). Kalıbın dizesinde genişlik yok,
  eklemek çakışma doğurmuyor.
*/
const DOLU = `${HAP_BIRINCIL} w-full disabled:cursor-default disabled:opacity-40`;
const CERCEVELI = `${HAP} w-full disabled:cursor-default disabled:opacity-40`;

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
      <div aria-busy="true" className={`${YARIM_HUCRE} flex`}>
        <span aria-hidden className="h-11 w-full animate-pulse rounded-full bg-gray-100" />
      </div>
    );
  }

  if (durum === 'hata') {
    return (
      <p role="alert" className={`${TAM_HUCRE} text-sm text-gray-600`}>
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

  /*
    HER DURUM TEK SATIR HAP (kullanıcı kararı 24 Eylül 2026: durum hapın
    kendisi, eylem görünür menüde). Kullanıcı canlıdan iki telefon
    görüntüsü gönderdi: /cv'de avatarın sağında tek satır hap vardı,
    başkasının profilinde ise düz yazı "Bağlantınız var" ve altında ayrı
    bir satırda "⋯" — sıra 84 piksel, avatar alt hizası yok.

      yok                 dolu hap "Bağlantı kur"
      giden bekliyor      çerçeveli hap "İstek gönderildi" → menü: İsteği geri çek → onay
      gelen bekliyor      dolu "Kabul et" + çerçeveli "Reddet", tek satır
      bağlı               çerçeveli hap "Bağlantıdasın" → menü: Bağlantıyı kaldır → onay
      reddettim           dolu hap "Bağlantı kur" (yeniden başlat)
      reddedildim         süre dolduysa dolu "Bağlantı kur"; dolmadıysa
                          devre dışı hap, bekleme tarihiyle
      engel               kural cümlesi (aşağıda)

    Durum yazısı ayrı satırda DURMUYOR. Hapın göstermediği bilgi (kimin
    isteği, kendi reddin) grubun erişilebilir adında: ekran okuyucu onu
    okuyor, göz hapı görüyor.

    ENGEL KURAL CÜMLESİ KALIYOR: kullanıcı kararı (19 Eylül 2026) kuralın
    İZAH EDİLMESİNİ istiyor; eylem yoksa hap da yok ve yerinde sebebi
    yazan satır duruyor. Mevcut davranış korundu.
  */
  let govde: React.ReactNode = null;

  if (bilgi.durum === 'yok') {
    govde = kuralCumlesi ? (
      <EngelSatiri engel={engel} cumle={kuralCumlesi} />
    ) : (
      <button
        type="button"
        disabled={islemde}
        onClick={() => eylemiCalistir(() => baglantiKur(bakanId, hedefId))}
        className={DOLU}
      >
        {islemde ? 'Gönderiliyor…' : 'Bağlantı kur'}
      </button>
    );
  } else if (bilgi.durum === 'bekliyor' && bilgi.benMiGonderdim) {
    govde = (
      <OnayliEylemMenusu
        tetik={{
          icerik: (
            <>
              <Clock aria-hidden className="h-4 w-4 shrink-0" />
              {islemde ? 'Geri çekiliyor…' : 'İstek gönderildi'}
            </>
          ),
          sinif: CERCEVELI,
        }}
        eylem={{ etiket: 'İsteği geri çek', ikon: <Undo2 aria-hidden className="h-4 w-4 text-gray-600" /> }}
        onay={{
          soru: 'Bağlantı isteğini geri çekmek istiyor musun?',
          aciklama: 'İstek silinir ve karşı taraf onu artık göremez. İstersen yeniden gönderebilirsin.',
          dugme: 'Geri çek',
          islemdeDugme: 'Geri çekiliyor…',
        }}
        islemde={islemde}
        onOnayla={() => eylemiCalistir(() => baglantiKaldir(bakanId, hedefId))}
      />
    );
  } else if (bilgi.durum === 'bekliyor') {
    govde = (
      /* "Sana istek gönderdi" yazısı kalktı; haplar kendini anlatıyor, grup adı okuyucuya söylüyor. */
      <div role="group" aria-label="Sana bağlantı isteği gönderdi" className="grid w-full grid-cols-2 gap-2">
        <button
          type="button"
          disabled={islemde}
          onClick={() => eylemiCalistir(() => baglantiYanitla(bakanId, hedefId, 'kabul'))}
          className={DOLU}
        >
          Kabul et
        </button>
        <button
          type="button"
          disabled={islemde}
          onClick={() => eylemiCalistir(() => baglantiYanitla(bakanId, hedefId, 'red'))}
          className={CERCEVELI}
        >
          Reddet
        </button>
      </div>
    );
  } else if (bilgi.durum === 'kabul') {
    govde = (
      /* Kaldırma menüde ve onaylı; tetik hapın kendisi (ayrı "⋯" yok). */
      <BaglantiKaldirMenusu
        ad="Bu kişi"
        islemde={islemde}
        onKaldir={() => eylemiCalistir(() => baglantiKaldir(bakanId, hedefId))}
        tetik={{
          icerik: (
            <>
              <UserCheck aria-hidden className="h-4 w-4 shrink-0" />
              Bağlantıdasın
            </>
          ),
          sinif: CERCEVELI,
        }}
      />
    );
  } else if (bilgi.durum === 'red' && !bilgi.benMiGonderdim) {
    /*
      REDDEDEN TARAF: kendi reddini "kabul"e çeviremiyor (kabul, karşı
      tarafın hâlâ istediği anlamına gelir ve bu tek taraflı varsayılamaz).
      Fikrini değiştirdiyse yolu kendi isteğini başlatmak. Kendi reddim bir
      OLGU: grubun adında ("Bu isteği reddettin"), hap ayrı satır açmıyor.
    */
    govde = (
      <div role="group" aria-label="Bu isteği reddettin" className="flex w-full">
        {kuralCumlesi ? (
          <EngelSatiri engel={engel} cumle={kuralCumlesi} />
        ) : (
          <button
            type="button"
            disabled={islemde}
            onClick={() => eylemiCalistir(() => baglantiYenidenBaslat(hedefId))}
            className={DOLU}
          >
            {islemde ? 'Gönderiliyor…' : 'Bağlantı kur'}
          </button>
        )}
      </div>
    );
  } else if (kuralCumlesi) {
    /*
      REDDEDİLEN TARAF, ENGELLİ: yalnız sebep yazılıyor.

      Bekleme tarihi burada BİLEREK çizilmiyor. "Yeniden gönderilebilir:
      12 Ekim" demek, o tarihte gönderilebileceğini söylemek olurdu; alan
      kuralı o tarihte de aynı yerde duruyor ve istek yine reddedilirdi.
    */
    govde = <EngelSatiri engel={engel} cumle={kuralCumlesi} />;
  } else if (sureDoldu) {
    /*
      REDDEDİLEN TARAF, SÜRE DOLDU: aynı satır yeniden "bekliyor"a dönüyor;
      yeni bir satır açılmıyor (ters yön indeksi buna izin vermezdi).
    */
    govde = (
      <button
        type="button"
        disabled={islemde}
        onClick={() => eylemiCalistir(() => baglantiYenidenGonder(bakanId, hedefId))}
        className={DOLU}
      >
        {islemde ? 'Gönderiliyor…' : 'Bağlantı kur'}
      </button>
    );
  } else {
    /*
      REDDEDİLEN TARAF, SÜRE DOLMADI: eylem henüz yok. Ayrı satırdaki
      "Yeniden gönderilebilir: …" cümlesi yerine DEVRE DIŞI bir hap: aynı
      eylemin adı ve açılacağı gün, kısa tarihle ("12 Eki"), ki 390
      piksellik satırda tek satır kalsın. Tam tarih erişilebilir adda ve
      imleç ipucunda. Tarih bilinmiyorsa yalnız eylemin adı; ad bunu da
      söylüyor. Devre dışı olduğu görünüyor (soluk), basınca bir şey olmuyor
      — çalışmayan bir eylem sunulmuyor.
    */
    const aciklama = yenidenDenemeMetni
      ? `Yeniden gönderilebilir: ${yenidenDenemeMetni}`
      : 'Yeniden gönderilebilir bir tarih bilinmiyor.';
    const kisa = kisaTarihMetni(bilgi.yenidenDenemeAni, { yil: false });
    govde = (
      <button type="button" disabled aria-label={aciklama} title={aciklama} className={DOLU}>
        <Clock aria-hidden className="h-4 w-4 shrink-0" />
        {kisa ? `Bağlantı kur · ${kisa}` : 'Bağlantı kur'}
      </button>
    );
  }

  /*
    HÜCRE GENİŞLİĞİ DURUMDAN (X mobil kalıbı, 24 Eylül 2026): kök öğe,
    ziyaretçi eylem satırının (`ZIYARETCI_EYLEMLERI`) bir hücresi. Tek
    haplı durumlar yarım hücre — "Mesaj" varsa yanında eşit genişlikte,
    yoksa tek başına tam satır. İki hap (Kabul et + Reddet) ya da kural
    cümlesi tam satır: yarım hücrede iki hap 80 piksele iner, cümle
    sıkışırdı. "Mesaj" o durumda üst satırda tek başına kalıyor; DOM
    sırası görsel sırayla aynı (önce Mesaj, sonra karar).
  */
  const tamSatir =
    (bilgi.durum === 'bekliyor' && !bilgi.benMiGonderdim) ||
    (Boolean(kuralCumlesi) && bilgi.durum !== 'bekliyor' && bilgi.durum !== 'kabul');

  return (
    /*
      Hata cümlesi bir DURUM değil, başarısız bir işlemin sonucu; nadir ve
      kısa ömürlü, bu yüzden hapın altında, aynı hücrede kalıyor.
    */
    <div className={`${tamSatir ? TAM_HUCRE : YARIM_HUCRE} flex flex-col gap-1.5`}>
      {govde}
      {hataMesaji && (
        <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
          {hataMesaji}
        </p>
      )}
    </div>
  );
};
