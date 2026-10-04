import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, MapPin, Calendar, DollarSign, ShieldCheck, ExternalLink, RefreshCw,
  Building2, Clock, AlertTriangle, Share2, Check, Lock, FileText, Info,
} from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../lib/renk-token';
import type { InternshipListing } from '../types';
import { fetchListingByIdPrefix } from '../lib/queries';
import { ListingLogo } from './ListingLogo';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
import { basvuruKapanisNedeni, ETIKET_ILAN_KAPALI, ETIKET_SURE_DOLDU } from '../lib/basvuru-devam.mjs';
import { istanbulGunBaslangici } from '../lib/kontrol-nabzi.mjs';
import { ilanHedefi } from '../lib/ilan-hedefi.mjs';
import { IlanDurumEtiketleri, ilanDurumuSorunlu } from './IlanDurumEtiketleri';
import { tarihMetni } from '../lib/tarih.mjs';
import { sayfaMetaAyarla } from '../lib/sayfa-meta';
import { sonKontrolMetni } from '../lib/zaman';
/*
  Ücret, staj türü ve sigorta kararları kartla AYNI dosyadan geliyor.
*/
import {
  donemEtiketi,
  sigortaMetni,
  stajTuruSatirlari,
  ucretMetniHesapla,
} from '../lib/staj-turu.mjs';
import { Logo } from './Logo';
import { slugify } from '../lib/slug';
import { UlkeRozeti } from './UlkeRozeti';

/**
 * Tek ilan sayfası.
 *
 * Modal yerine gerçek bir adres olmasının üç sebebi var: ilan paylaşılabiliyor,
 * arama motoru indeksleyebiliyor, ve şirkete "ilanınız bizde şöyle görünüyor"
 * diye doğrudan link atılabiliyor.
 */

interface ListingPageProps {
  /**
   * Sitenin kabuğunda mı (üst çubuk ve alt gezinme App'ten). Öyleyse kendi
   * başlığını çizmiyor, genişliği sitenin öteki sayfalarıyla aynı ve
   * telefondaki sabit başvuru çubuğu alt gezinmenin ÜSTÜNDE duruyor.
   */
  gomulu?: boolean;
  idPrefix: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  /** Platform içi başvuru (internal / email_application). */
  onApply: (listing: InternshipListing) => void;
  /**
   * "BAŞVURDUĞUMU İŞARETLE" — GERÇEK BAŞVURU DEĞİL
   *
   * Harici ilanlarda başvuru şirketin kendi sayfasından alınıyor ve
   * o başvuru bizde YOK. Bu işlem yalnız öğrencinin takip defterine
   * kayıt düşüyor.
   *
   * Ölçüldü: bu düğme eskiden `onApply`i çağırıyordu ve üretimde 4
   * `external` başvuru `applications` tablosuna yazılmıştı —
   * göndermediğimiz başvuruyu göndermiş gibi kaydetmek.
   */
  onTrack: (listing: InternshipListing) => void;
  /**
   * Elde hazır duran ilan — verilirse sunucudan OKUNMUYOR.
   *
   * Yalnız geliştirme fikstürü (`src/dev/IlanDetayDevFixture.tsx`)
   * kullanıyor: sayfanın dört başvuru durumu (iç açık, iç kapanmış,
   * dış, adressiz) aynı anda tek bir canlı ilanda bulunmuyor ve
   * fikstür canlı Supabase'e bağlanmadan GERÇEK bileşeni çizmeli,
   * kopyasını değil. Uygulama (`App.tsx`) bu alanı vermiyor; üretimde
   * davranış eskisi gibi `idPrefix` ile okuma.
   */
  hazirIlan?: InternshipListing;
}

const Bilgi: React.FC<{
  ikon: React.ReactNode;
  etiket: string;
  deger: string;
  /**
   * Değerin altına giren isteğe bağlı ek işaret (ör. ülke rozeti).
   * Sarmalayıcı kutu yok: rozet kendi kararını verip null dönebiliyor,
   * boş bir kutu çizilse yurt içi ilanlarda ölçüsüz bir boşluk kalırdı.
   */
  ek?: React.ReactNode;
}> = ({
  ikon, etiket, deger, ek,
}) => (
  /*
    `px-3`: ızgara kabı `-mx-3` ile iki yana taşıyor, hücrenin kendi
    dolgusu onu geri alıyor. Böylece ilk sütunun metni kartın içerik
    kenarıyla hizalı kalıyor ve ayırıcı (`border-l`) metne yapışmıyor.
    Ayırıcının hangi hücrede çizileceği hücrenin değil KABIN kararı
    (aşağıda, `BILGI_IZGARASI`): hücre kaçıncı sütunda olduğunu bilmiyor.
  */
  <div className="flex items-start gap-3 px-3 py-3 border-gray-100">
    <div className="text-blue-600 mt-0.5 shrink-0" aria-hidden="true">{ikon}</div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-gray-600 font-bold">
        {etiket}
      </p>
      <p className="mt-0.5 text-[15px] sm:text-base font-semibold text-gray-900 break-words">{deger}</p>
      {ek}
    </div>
  </div>
);

/*
  BİLGİ IZGARASI — AYIRICI ALAN SAYISINA GÖRE

  Hücre sayısı ilana göre 1 ile 12 arasında değişiyor (veri yoksa hücre
  hiç çizilmiyor). Dikey ayırıcı her hücrenin solunda, satırın İLK
  sütunu hariç; satır aralığı sıfır olduğu için alt alta duran
  ayırıcılar tek çizgi gibi birleşiyor. Son satır eksikse ayırıcı da
  yalnız var olan hücrenin yanında çiziliyor: boş hücre ya da yetim
  çizgi kalmıyor.

  Telefonda 2, `sm` üstünde 3 sütun. Kurallar `max-sm:` ve `sm:` ile
  ayrıldı: ikisi aynı kırılımda yazılsaydı hangi seçicinin kazanacağı
  üretilen CSS'in sırasına kalırdı.
*/
const BILGI_IZGARASI = [
  '-mx-3 grid grid-cols-2 sm:grid-cols-3',
  'max-sm:[&>*:nth-child(even)]:border-l',
  'sm:[&>*:not(:nth-child(3n+1))]:border-l',
].join(' ');

export const ListingPage: React.FC<ListingPageProps> = ({
  gomulu = false, idPrefix, onBack, onNavigate, onApply, onTrack, hazirIlan,
}) => {
  const [listing, setListing] = useState<InternshipListing | null>(null);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'yok' | 'hata'>('yukleniyor');
  const [paylasimDurumu, setPaylasimDurumu] = useState<'hazir' | 'kopyalandi'>('hazir');

  /**
   * Paylaşım. Mobilde işletim sisteminin kendi paylaşım menüsü açılır
   * (WhatsApp, mesaj, e-posta); masaüstünde adres panoya kopyalanır.
   */
  const paylas = async (ilan: InternshipListing) => {
    const adres = window.location.href;
    const metin = `${ilan.title} — ${ilan.companyName}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: metin, text: `${metin} ilanına bak:`, url: adres });
        return;
      } catch {
        // Kullanıcı vazgeçti veya paylaşım reddedildi; kopyalamaya düş.
      }
    }
    try {
      await navigator.clipboard.writeText(adres);
      setPaylasimDurumu('kopyalandi');
      setTimeout(() => setPaylasimDurumu('hazir'), 2500);
    } catch {
      // Pano izni yoksa yapacak bir şey yok; sessiz kal.
    }
  };

  useEffect(() => {
    if (hazirIlan) {
      setListing(hazirIlan);
      setDurum('hazir');
      return;
    }
    let iptal = false;
    setDurum('yukleniyor');
    fetchListingByIdPrefix(idPrefix)
      .then((row) => {
        if (iptal) return;
        setListing(row);
        setDurum(row ? 'hazir' : 'yok');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [idPrefix, hazirIlan]);

  /*
    Sayfa üst bilgileri ilana göre ayarlanıyor.

    Önce yalnızca başlık değişiyordu; canonical ve paylaşım etiketleri, ana
    sayfadan tıklanarak gelindiğinde ANA SAYFAYI göstermeye devam ediyordu.
    Yani ilanı paylaşan kişi ana sayfanın kartını gönderiyordu.
  */
  useEffect(() => {
    if (!listing) return;
    return sayfaMetaAyarla({
      baslik: `${listing.title} — ${listing.companyName} | StajımVar`,
      aciklama: (listing.description || '').replace(/\s+/g, ' ').trim().slice(0, 155) || undefined,
    });
  }, [listing]);

  /* Başvurunun gerçek işleyişi — açıklama ve düğmeler buradan besleniyor. */
  const yol = basvuruYolu(listing ?? {});
  /*
    DIŞ DÜĞMENİN YAZISI GERÇEK HEDEFİ SÖYLÜYOR (25 Eylül 2026): "İlana
    git" ya da "Kariyer sayfasına git". Adresin başvuru formu olduğu
    doğrulanmadıkça "başvur" denmiyor (kural lib/ilan-hedefi.mjs).
  */
  const hedef = ilanHedefi(listing ?? {});

  /*
    KAPANMIŞ İÇ İLANDA "BAŞVUR" DÜĞMESİ YOK

    Son başvuru günü geçmiş iç ilanda "StajımVar ile Başvur" çiziliyordu;
    basınca pencere açılmıyor, "artık başvuru kabul etmiyor" deniyordu
    (taklitle ölçüldü, 4 Ekim 2026). Basılamayacak işi vaat eden düğme
    yerine durum yazılıyor. Gün Europe/Istanbul'a göre: son gün TR'de
    bitiyor, tarayıcının saat dilimi farklı olsa da kayma olmasın.

    Yalnız İÇ ilan: dış ilanın düğmesi şirket sayfasına gidiyor ve oradaki
    başvurunun açık olup olmadığını biz söyleyemiyoruz.

    Düğmeyi gizlemek kapının YERİNE GEÇMİYOR: sayfa açıkken de ilan
    kapanabilir. `handleApplyToJob`daki `basvuruKarari` kapısı, girişten
    dönüşte ilanın sunucudan yeniden okunması ve başvuru politikası
    yerinde duruyor.

    `status` ilan nesnesinde yok: bu sayfa yalnız YAYINDAKİ ilanı
    getiriyor (`fetchListingByIdPrefix`), yayından kalkmış ilan
    "Bu ilan bulunamadı" ekranına düşüyor. Yani burada pratikte çalışan
    kural son gün; "İlan başvuruya kapalı" ortak yardımcı yayın durumunu
    da taşırsa çiziliyor.
  */
  const kapanis =
    listing && yol.anaEylem === 'platform-ici'
      ? basvuruKapanisNedeni(listing, istanbulGunBaslangici().slice(0, 10))
      : null;

  /*
    GÖSTERİLECEK META DEĞERLERİ — BOŞSA null

    Üçü de yalnızca gerçekten bilgi taşıdığında dolu dönüyor; boş dönen
    değer için kutu hiç çizilmiyor (aşağıda). Tarih `lib/tarih` üzerinden
    biçimleniyor, ham ISO basılmıyor.
  */
  const sonBasvuru = tarihMetni(listing?.applicationDeadline);
  /*
    KARAR ORTAK DOSYADA

    Kart ve detay aynı `lib/staj-turu` kurallarını kullanıyor. İki ayrı
    kopya, birinin "Ücretsiz" derken ötekinin susması demekti.
  */
  const ucretMetni = ucretMetniHesapla(listing?.stipend);

  /*
    STAJ TÜRÜ — BİLİNEN İKİ BİLGİ DE AÇIKÇA

    Kartta tek kompakt rozet var (yer yok); detayda her bilinen alan
    kendi satırında. İkisi birbirini dışlamıyor: ölçüldü, üretimde 122
    ilanda ikisi de true.

    `insuranceNote` ARTIK BU SATIRDA DEĞİL: eskiden zorunlu staj
    bilinmediğinde onun yerine not basılıyordu ve iki farklı şey aynı
    kutuda görünüyordu ("Kabul ediliyor" ile "Kaynakta belirtilmemiş").
    Not kendi satırına taşındı.
  */
  const stajTuru = stajTuruSatirlari(listing ?? {});

  /*
    SİGORTAYI SAĞLAYAN — YALNIZ BİLİNİYORSA

    `null` (kaynak söylemiyor) satır üretmiyor. `'yok'` ÜRETİYOR:
    o kaynağın açık beyanı ve öğrenci için gerçek bilgi.
  */
  const sigorta = sigortaMetni(listing?.insuranceProvider);

  /*
    SİGORTA NOTU — SERBEST METİN, AYRI SATIR

    Eskiden zorunlu staj bilinmediğinde onun kutusunda basılıyordu ve
    iki farklı şey aynı yerde görünüyordu ("Kabul ediliyor" ile
    "Kaynakta belirtilmemiş"). Not kaynağın kendi cümlesi; yapısal
    `insurance_provider` alanının yerine geçmiyor, onu tamamlıyor.

    "Kaynakta belirtilmemiş" GÖSTERİLMİYOR: bilgi yokluğunu bilgi gibi
    sunmak, kutuyu boşa doldurmak olurdu.
  */
  const sigortaNotu = (() => {
    const not = listing?.insuranceNote?.trim();
    if (!not) return null;
    return /belirtilmemi[sş]/i.test(not) ? null : not;
  })();

  const sureMetni = listing?.duration?.trim() || null;
  /*
    DÖNEM VE ÇALIŞMA BİÇİMİ — yalnız biliniyorsa.

    `term` şemada zorunlu ama boş dize gelebiliyor; `workType`
    'On-site' | 'Hybrid' | 'Remote'.
  */
  const donemMetni = donemEtiketi(listing?.term);
  const bicimMetni = listing?.workType ? calismaEtiketi(listing.workType) : null;

  /*
    ÖDEME NOTU KALDIRILDI — null "İNCELENDİ VE YAZILMAMIŞ" DEMİYOR

    "Ödeme bilgisi resmî kaynakta açıklanmamış" cümlesi iki iddia
    taşıyordu: kaynağı inceledik, ve kaynak bunu açıklamamış.
    `is_paid = null` bunların HİÇBİRİNİ söylemiyor — yalnız "bizde bu
    bilgi yok" demek. 168 ilanda null olduğu için bu cümle envanterin
    neredeyse tamamında doğrulanmamış bir iddiaydı.

    Ücret bilinmiyorsa alan TAMAMEN gizleniyor; cümle de yok.

    SÜRE NOTU KALIYOR: `duration` serbest metin ve boş olması gerçekten
    "kaynakta yok" demek — içe aktarıcı onu kaynağın kendi cümlesinden
    alıyor, varsayılan üretmiyor.
  */
  const eksikBilgiNotu = !sureMetni ? 'Süre bilgisi resmî kaynakta açıklanmamış.' : null;
  const [metinAcik, setMetinAcik] = useState(false);

  /*
    "TAMAMINI GÖSTER" GERÇEK TAŞMAYA GÖRE

    Düğme metin 900 karakteri geçince çıkıyordu; 12 satırlık katlama ise
    satır sayısına bakıyor. Ölçüldü (375px, 528 karakterlik fikstür
    metni): 476 piksellik metnin 336 pikseli görünüyor, "…" ile bitiyor ve açacak düğme
    YOKTU — ilanın sonu okunamıyordu. Artık kesilip kesilmediği kutunun
    kendisinden ölçülüyor; genişlik değişince (telefon döndürme) yeniden.
  */
  const metinRef = useRef<HTMLParagraphElement>(null);
  const [metinTasiyor, setMetinTasiyor] = useState(false);
  useEffect(() => {
    const el = metinRef.current;
    if (!el || metinAcik) return;
    const olc = () => setMetinTasiyor(el.scrollHeight > el.clientHeight + 1);
    olc();
    if (typeof ResizeObserver === 'undefined') return;
    const gozcu = new ResizeObserver(olc);
    gozcu.observe(el);
    return () => gozcu.disconnect();
  }, [listing, durum, metinAcik]);

  /*
    TELEFONDA BOŞ BAŞVURU KARTI ÇİZİLMİYOR

    Telefonda kartın düğme bloğu gizli (eylemler sabit çubukta). Geriye
    son başvuru, açıklama kutusu ve durum etiketleri kalıyor. Kapanmış
    bir iç ilanda tarih de yoksa üçü de boş düşüyor ve içeriğin altında
    40 piksellik boş bir beyaz kutu kalırdı; o durumda kart yalnız
    masaüstünde (düğme yerine kapanış durumu) çiziliyor.
  */
  const telefondaKartBos = Boolean(
    listing
      && yol.teslimEdiliyor
      && kapanis
      && !sonBasvuru
      && !ilanDurumuSorunlu(listing),
  );

  return (
    <div className={gomulu ? 'flex-1 text-gray-900' : 'min-h-screen bg-[#F9FAFB] text-gray-900'}>
      {!gomulu && (
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label="Ana sayfa">
            <Logo />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tüm ilanlar
          </button>
        </div>
      </header>
      )}

      {/*
        ALT BOŞLUK: MOBİL SABİT ÇUBUK İÇİN

        Sabit başvuru çubuğu ölçüldü: 12 + 48 + 12 = 72 piksel, artı
        güvenli alan. Boşluk bırakılmazsa sayfanın son satırı çubuğun
        altında kalıyor. Masaüstünde çubuk yok, bu yüzden `lg:pb-8`.
      */}
      {/*
        GENİŞLİK: site kabuğunda öteki sayfalarla aynı (`SAYFA_GENISLIGI`);
        telefonda alt boşluk hem başvuru çubuğunu hem alt gezinmeyi karşılıyor.
      */}
      <main
        className={
          gomulu
            ? `${SAYFA_GENISLIGI} w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 sm:pt-4 pb-[calc(170px+env(safe-area-inset-bottom))] lg:pb-8 space-y-4`
            : 'max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-8 space-y-6'
        }
      >
        {/*
          GERİ DÖNÜŞ — GERÇEK BAĞLANTI

          Site kabuğunda üst çubuk ilan listesine dönmeyi söylemiyor;
          kabuksuz kipte kendi başlığındaki "Tüm ilanlar" bu işi görüyor,
          o yüzden yalnız `gomulu`. `<a href="/">`: orta tuş ve "yeni
          sekmede aç" çalışsın. Düz tıklamada sayfa yeniden yüklenmesin
          diye uygulamanın kendi gezinmesine (`onBack`) devrediliyor.
        */}
        {gomulu && (
          <a
            href="/"
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onBack();
            }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-blue-700 ${RENK_GECISI} ${ODAK_HALKASI}`}
          >
            <ArrowLeft aria-hidden="true" className="w-4 h-4" />
            İlanlara dön
          </a>
        )}

        {durum === 'yukleniyor' && (
          <div className="space-y-4" role="status" aria-live="polite">
            <div className="h-28 rounded-3xl bg-gray-100 animate-pulse"/>
            <div className="h-52 rounded-2xl bg-gray-100 animate-pulse"/>
            <p className="text-center text-xs text-gray-500">Yükleniyor…</p>
          </div>
        )}

        {durum === 'yok' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center space-y-3">
            <p className="font-bold">Bu ilan bulunamadı</p>
            <p className="text-sm text-gray-600">
              Bağlantı hatalı olabilir ya da ilan yayından kaldırılmış olabilir.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Açık ilanlara dön
            </button>
          </div>
        )}

        {durum === 'hata' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
            <p className="font-bold text-red-800">İlan yüklenemedi</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              Tekrar dene
            </button>
          </div>
        )}

        {durum === 'hazir' && listing && (
          /*
            İKİ SÜTUN (geniş ekranda): solda ilanın kendisi, sağda yapışkan
            başvuru kartı. Telefonda sıra aynı: içerik, sonra başvuru
            kartının bilgi kısmı; eylemler alttaki sabit çubukta.

            SAĞ KART GERİLMİYOR: `lg:items-start` ızgarada, `lg:self-start`
            sütunun kendisinde. Izgara varsayılanı `stretch`; sağ sütun
            sol sütunun boyuna uzar ve içi boş, uzun bir beyaz kutu
            kalırdı. Kart yalnız içeriği kadar.
          */
          <div className="space-y-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0">
          <div className="min-w-0 space-y-4 lg:space-y-6 lg:col-span-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7">
              <div className="flex items-start gap-4 sm:gap-5">
                <ListingLogo
                  name={listing.companyName}
                  logoUrl={listing.companyLogo || undefined}
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/sirket/${listing.companySlug ?? slugify(listing.companyName)}`)}
                    /*
                      Dokunma hedefi 44 piksel (`min-h-11`), ama düzende 24
                      piksel yer tutuyor (`-my-2.5`): yazı satırı kadar
                      görünsün, başlığı aşağı itmesin. Ölçüldü: önce 20–24
                      piksellik bir hedefti.
                    */
                    className={`-my-2.5 inline-flex min-h-11 items-center text-left text-sm sm:text-base font-bold text-blue-600 hover:underline rounded-sm break-words ${ODAK_HALKASI}`}
                  >
                    {listing.companyName}
                  </button>
                  {/*
                    BAŞLIK VE PAYLAŞ AYNI SATIRDA, SIĞMAZSA ALT ALTA

                    `flex-wrap`: kısa başlıkta hap başlığın yanında duruyor,
                    uzun başlıkta (ölçüldü, 375px'te başlık sütunu ~231
                    piksel) bir alt satıra iniyor. Başlık ezilip hapa yer
                    açmıyor, hap da başlığın üstüne binmiyor.
                  */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h1 className="min-w-0 max-w-full text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-gray-950 break-words">
                      {listing.title}
                    </h1>
                    <button
                      type="button"
                      onClick={() => paylas(listing)}
                      aria-label="İlanı paylaş"
                      title="İlanı paylaş"
                      className={`shrink-0 inline-flex min-h-11 items-center gap-2 px-4 rounded-full text-sm font-semibold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`}
                    >
                      {paylasimDurumu === 'kopyalandi' ? (
                        <>
                          <Check aria-hidden="true" className="w-4 h-4 text-emerald-600" />
                          Kopyalandı
                        </>
                      ) : (
                        <>
                          <Share2 aria-hidden="true" className="w-4 h-4" />
                          Paylaş
                        </>
                      )}
                    </button>
                  </div>
                  {/*
                    RESMÎ İLAN ADI

                    Gösterdiğimiz başlık şirketin kendi başlığından
                    farklıysa orijinali de yazıyoruz: öğrenci resmî
                    sayfaya gittiğinde aynı ilanı bulduğundan emin
                    olabilsin. İkisi aynıysa satır çizilmiyor —
                    gereksiz tekrar.

                    Bu değer VERİTABANINDAN geliyor; sayfa açılıp
                    yeniden ayrıştırılmıyor.
                  */}
                  {listing.sourceTitle &&
                    listing.sourceTitle.trim() !== listing.title.trim() && (
                      <p className="mt-2 text-xs text-gray-600 break-words">
                        Resmî ilan adı:{' '}
                        <span className="font-semibold text-gray-700">
                          {listing.sourceTitle}
                        </span>
                      </p>
                    )}
                  {listing.origin === 'scraped' && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      Şirketin kendi kariyer sayfasından alındı
                    </p>
                  )}
                </div>
              </div>

              {/*
                Ayırıcı çizgi ızgaranın DIŞ kabında: ızgara `-mx-3` ile
                taştığı için çizgi onun üstünde olsaydı kart içeriğinden
                iki yana 12'şer piksel taşıyordu (1440px'te ölçüldü).
              */}
              <div className="mt-5 pt-3 border-t border-gray-100">
              <div className={BILGI_IZGARASI}>
                <Bilgi
                  ikon={<MapPin className="w-5 h-5" />}
                  etiket="Konum"
                  deger={`${konumEtiketi(listing.city)} (${calismaEtiketi(listing.workType)})`}
                  /*
                    Kartla aynı rozet, aynı kural: ülke yalnız yurt dışı
                    ilanlarda çiziliyor (lib/ulke-rozeti.mjs). Şehir adı tek
                    başına "Paris"in Türkiye dışında olduğunu söylemiyor.
                  */
                  ek={<UlkeRozeti countryCode={listing.countryCode} className="mt-1" />}
                />
                {listing.department && (
                  <Bilgi ikon={<Building2 className="w-5 h-5" />} etiket="Departman" deger={listing.department} />
                )}
                {sureMetni && (
                  <Bilgi ikon={<Clock className="w-5 h-5" />} etiket="Süre" deger={sureMetni} />
                )}
                {sonBasvuru && (
                  <Bilgi
                    ikon={<Calendar className="w-5 h-5" />}
                    etiket="Son başvuru"
                    deger={sonBasvuru}
                  />
                )}
                {/*
                  BOŞ KUTU BASILMIYOR

                  Ücret ve zorunlu staj kutuları HER ZAMAN çiziliyordu ve
                  veri yoksa ikisi de "Kaynakta belirtilmemiş" yazıyordu.
                  Aynı sayfada aynı cümle iki kutuda birden duruyor,
                  ızgarada iki delik açıyor ve okuyucuya hiçbir şey
                  söylemiyordu. Eksik bilgi artık aşağıda TEK bir notta.

                  `isPaid` ÜÇ DEĞERLİ (göç 20261001010000): false artık
                  kaynağın açık beyanı ve "Ücretsiz" yazılıyor. Bilinmeyen
                  `null` ve kutu hiç çizilmiyor — uydurmuyoruz.
                */}
                {ucretMetni && (
                  <Bilgi
                    ikon={<DollarSign className="w-5 h-5" />}
                    etiket="Ücret"
                    deger={ucretMetni}
                  />
                )}
                {stajTuru.map((satir) => (
                  <Bilgi
                    key={satir.etiket}
                    ikon={<ShieldCheck className="w-5 h-5" />}
                    etiket={satir.etiket}
                    deger={satir.deger}
                  />
                ))}
                {sigorta && (
                  <Bilgi
                    ikon={<ShieldCheck className="w-5 h-5" />}
                    etiket="Sigorta"
                    deger={sigorta}
                  />
                )}
                {sigortaNotu && (
                  <Bilgi
                    ikon={<ShieldCheck className="w-5 h-5" />}
                    etiket="Sigorta notu"
                    deger={sigortaNotu}
                  />
                )}
                {donemMetni && (
                  <Bilgi ikon={<Calendar className="w-5 h-5" />} etiket="Dönem" deger={donemMetni} />
                )}
                {bicimMetni && (
                  <Bilgi
                    ikon={<Building2 className="w-5 h-5" />}
                    etiket="Çalışma biçimi"
                    deger={bicimMetni}
                  />
                )}
                {/*
                  Kaynağın en son ne zaman doğrulandığı. Kartta da var ama asıl
                  yeri burası: başvurmadan önce insanın sorduğu soru "bu ilan
                  hâlâ açık mı" ve cevabı bu tarih.
                */}
                {sonKontrolMetni(listing.lastSeenAt) && (
                  <Bilgi
                    ikon={<RefreshCw className="w-5 h-5" />}
                    etiket="Son kaynak kontrolü"
                    deger={sonKontrolMetni(listing.lastSeenAt)!.replace('Son kontrol: ', '')}
                  />
                )}
              </div>
              </div>

              {/*
                TEK DÜRÜST NOT

                Karar için önemli iki alan (süre ve ödeme) kaynakta yoksa
                bunu bir kez söylüyoruz. Önce her kutuda ayrı ayrı
                "Kaynakta belirtilmemiş" yazıyordu; aynı cümlenin üç kez
                tekrarı bilgi değil gürültü. Tahmin de etmiyoruz: yazmayan
                yazmıyor.
              */}
              {eksikBilgiNotu && (
                <p className="pt-3 text-xs leading-relaxed text-gray-600">{eksikBilgiNotu}</p>
              )}
            </div>

            {listing.requiredSkills.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7 space-y-3">
                <h2 className="text-base font-bold">İlanda geçen beceriler</h2>
                <div className="flex flex-wrap gap-1.5">
                  {[...listing.requiredSkills, ...listing.preferredSkills].map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-600">
                  Beceriler ilan metninden otomatik çıkarıldı; eksik olabilir.
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-950">İlan metni</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                  Otomatik çeviri
                  <Info aria-hidden="true" className="w-3.5 h-3.5 text-gray-500" />
                </span>
              </div>
              {/*
                "ŞİRKETİN KENDİ METNİ" DEĞİL, ÇEVİRİSİ

                Etiket "Şirketin kendi metni" diyordu ama gösterilen metin
                kaynak ilanın otomatik Türkçe çevirisi: açtığımız resmî
                ilanların çoğu İngilizce. Çeviriyi şirketin kendi cümlesi
                gibi sunmak hem yanlış hem de çeviri hatasından doğan
                sorumluluğu üstlenmek demek.

                Metin ÇEVİRİ dışında düzenlenmiyor: özetlemek ya da yeniden
                yazmak, şirketin söylemediği bir şeyi söyletme riski taşıyor.
                Uzun metin katlanıyor, isteyen açıyor.

                HTML olarak basmıyoruz: dışarıdan gelen içeriği işaretleme
                olarak yorumlamak XSS kapısıdır.

                Orijinal metin sistemde saklanmıyor; "orijinali göster"
                yerine resmî ilana giden bağlantı veriliyor — tek doğru
                kaynak zaten orası.
              */}
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                Bu metin kaynak ilanın otomatik Türkçe çevirisi. Anlam
                uyuşmazlığında şirketin resmî ilanı esas alınır.
                {listing.sourceUrl && (
                  <>
                    {' '}
                    <a
                      href={listing.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className={`font-semibold text-blue-700 hover:underline rounded-sm ${ODAK_HALKASI}`}
                    >
                      Orijinal ilanı aç
                    </a>
                    .
                  </>
                )}
              </p>
              {/*
                OKUMA ÖLÇÜSÜ: `max-w-[75ch]` satırı ~75 karaktere kesiyor;
                sol sütun 1440px'te bundan geniş ve tam genişlikte satırlar
                göz için uzun. `whitespace-pre-line` kaynağın satır ve
                paragraf sonlarını koruyor; metin yeniden biçimlenmiyor.
              */}
              <p
                ref={metinRef}
                className={`mt-5 max-w-[75ch] text-[15px] sm:text-base text-gray-800 leading-7 whitespace-pre-line break-words ${
                  metinAcik ? '' : 'line-clamp-[12]'
                }`}
              >
                {listing.description}
              </p>
              {(metinAcik || metinTasiyor) && (
                <button
                  type="button"
                  onClick={() => setMetinAcik((a) => !a)}
                  className={`mt-2 inline-flex min-h-11 items-center text-sm font-bold text-blue-700 hover:text-blue-800 cursor-pointer rounded-sm ${ODAK_HALKASI}`}
                >
                  {metinAcik ? 'Metni kısalt' : 'Kaynak metnin tamamını göster'}
                </button>
              )}
              {listing.sourceUrl && (
                <p className="mt-4 text-xs text-gray-600 pt-3 border-t border-gray-100 break-words">
                  Kaynak: {new URL(listing.sourceUrl).hostname}
                </p>
              )}
            </div>

          </div>
          <aside
            className={`min-w-0 lg:col-span-4 lg:sticky lg:top-6 lg:self-start ${telefondaKartBos ? 'max-lg:hidden' : ''}`}
            aria-label="Başvuru seçenekleri"
          >
            <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-4">
            {/*
              DURUM UYARISI BAŞVURU SEÇENEKLERİNİN BAŞINDA

              Bu etiketler kartta ve ilan önizlemesinde vardı ama BURADA
              YOKTU. Oysa arama motorundan gelen kişi doğrudan bu sayfaya
              düşüyor ve kartı hiç görmüyor: yani "kaynak doğrulanamadı"
              ya da "başvuru bağlantısı çalışmıyor" uyarısını görmeden
              başvuru düğmesine basıyordu.

              Kartla aynı bileşen; iki kopya er geç ayrışır ve iki ekran
              aynı ilan için farklı şey söylerdi. Sorun yoksa `null`
              dönüyor ve kartta boşluk bırakmıyor (`gap` boş öğeye
              uygulanmıyor).
            */}
            {listing && <IlanDurumEtiketleri listing={listing} />}

            {/*
              Bu blok MASAÜSTÜ eylem alanı. Telefonda gizleniyor: aynı
              eylemler ekranın altındaki sabit çubukta duruyor ve ikisi
              birden çizilirse aynı düğme sayfada iki kez görünüyor.
            */}
            <div className="hidden lg:flex flex-col gap-2.5">
              {yol.resmiAdres && (
                <a
                  href={yol.resmiAdres}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 rounded-xl text-base font-bold shadow-xs ${RENK_GECISI} ${ODAK_HALKASI} ${
                    yol.anaEylem === 'resmi-site'
                      ? 'text-white bg-blue-600 hover:bg-blue-700'
                      : 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {yol.anaEylem === 'resmi-site' ? hedef.etiket : 'İlana git'}
                  <ExternalLink aria-hidden="true" className="w-4 h-4" />
                </a>
              )}
              {kapanis ? (
                <BasvuruKapaliDurumu neden={kapanis} />
              ) : (
              <button
                type="button"
                onClick={() => (yol.anaEylem === 'platform-ici' ? onApply(listing) : onTrack(listing))}
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 rounded-xl font-bold shadow-xs ${RENK_GECISI} ${ODAK_HALKASI} ${
                  yol.anaEylem === 'resmi-site'
                    ? 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm'
                    : 'text-white bg-blue-600 hover:bg-blue-700 text-base'
                }`}
              >
                {yol.anaEylem === 'resmi-site' ? yol.takipEtiketi : yol.anaEtiket}
                {yol.anaEylem === 'platform-ici' && (
                  <ArrowRight aria-hidden="true" className="w-5 h-5" />
                )}
              </button>
              )}
            </div>

            {/*
              SON BAŞVURU KARTTA DA — TELEFONDA DA GÖRÜNÜYOR

              Tarih bilgi ızgarasında da var; burada karar düğmesinin
              hemen altında tekrar ediliyor çünkü "başvurayım mı"
              sorusunun ikinci yarısı "ne zamana kadar". Tarih yoksa satır
              yok (uydurulmuyor). Üstteki çizgi yalnız masaüstünde: telefonda
              üstündeki düğme bloğu gizli, çizgi boşluğu ayırırdı.
            */}
            {sonBasvuru && (
              <div className="flex items-start gap-3 lg:border-t lg:border-gray-100 lg:pt-4">
                <Calendar aria-hidden="true" className="w-6 h-6 shrink-0 text-gray-500 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-gray-600 font-bold">
                    Son başvuru
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-gray-900">{sonBasvuru}</p>
                </div>
              </div>
            )}

            {/*
              AÇIKLAMA GERÇEK BAŞVURU YOLUNDAN

              Cümle `yol.ozet` (lib/basvuru-yolu.mjs): kart, önizleme ve
              başvuru diyaloğuyla aynı kaynak. Önce burada "şirkete talebi
              bildiririz" yazıyordu; böyle çalışan bir süreç yok.

              MAVİ KUTU YALNIZ BAŞVURU GERÇEKTEN BİZDEN GEÇİYORSA. Dış ve
              adressiz ilanda başvuru şirkete ulaşmıyor; orada mavi bir
              "StajımVar üzerinden" kutusu en tehlikeli yanlış olurdu.
              Bu ilanlarda eski sarı uyarı aynen duruyor.

              KAPANMIŞ İÇ İLANDA MAVİ KUTU YOK: "Başvurun şirketin
              panelinde görünür" cümlesi, hemen üstte "Başvuru süresi
              doldu" yazarken yapılamayacak bir başvuruyu anlatırdı.
            */}
            {yol.anaEylem === 'platform-ici' && yol.teslimEdiliyor && !kapanis && (
              <div
                className={`border-gray-100 ${sonBasvuru ? 'border-t pt-4' : 'lg:border-t lg:pt-4'}`}
              >
                <div className="rounded-xl bg-blue-50 p-4 flex gap-3">
                  <FileText aria-hidden="true" className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-800 leading-relaxed">{yol.ozet}</p>
                </div>
              </div>
            )}
            {!yol.teslimEdiliyor && (
              <div
                className={`border-gray-100 ${sonBasvuru ? 'border-t pt-4' : 'lg:border-t lg:pt-4'}`}
              >
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
                  <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {yol.ozet} StajımVar kaydı yalnızca senin takip listen içindir —{' '}
                    <strong>resmî sayfadan başvurmayı unutma</strong>.
                  </p>
                </div>
              </div>
            )}
            </div>
          </aside>
          </div>
        )}
      </main>

      {/*
        MOBİL SABİT BAŞVURU ÇUBUĞU

        İlan detayı telefonda uzun: başvuru düğmesi sayfanın en altındaydı
        ve okuyan kişi karar verdiği anda onu görmüyordu. Çubuk kararı
        verildiği yerde tutuyor.

        YERLEŞİM VE ALT GEZİNME
        Ölçüldü (390px, canlı sayfa): bu rotada YÜZEN ALT GEZİNME YOK.
        Gezinme `Header` içinde çiziliyor (`lg:hidden fixed bottom-…
        z-50`), ilan detayı ise kendi başlığıyla tek başına açılıyor —
        sayfadaki tek sabit öğe bu çubuk. Bu yüzden çubuk gezinme
        yüksekliği kadar boşluk AYIRMIYOR; ayırsaydı ekranın altında 84
        piksellik boş bir şerit kalırdı.

        Yine de `z-40` veriliyor: gezinme z-50, yani ileride sayfa kabuğun
        içine alınırsa çubuk onun altında kalır, üstünü örtmez.

        DIŞ BAŞVURUDA GİRİŞ YOK
        Buradaki dış bağlantı da doğrudan resmî adrese gidiyor; kartla ve
        detay sayfasındaki masaüstü düğmesiyle aynı davranış.
      */}
      {listing && (yol.resmiAdres || yol.anaEylem !== 'resmi-site') && (
        <div
          className={`lg:hidden fixed inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur px-3 pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] ${
            /* Site kabuğunda alt gezinmenin üstünde; güvenli alanı gezinme karşılıyor. */
            gomulu ? 'bottom-[calc(60px+env(safe-area-inset-bottom))] pb-3' : 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
          }`}
          role="region"
          aria-label="Başvuru"
        >
          {/*
            DURUM UYARISI ÇUBUĞUN İÇİNDE — TELEFONDA KARAR BURADA

            Uyarı sayfanın "Başvuru seçenekleri" sütununda da var ama o
            sütun telefonda içeriğin ALTINA düşüyor: ölçüldü, 375px'te
            başvuru düğmesi uyarının 772 piksel ÜSTÜNDE kalıyordu. Yani
            kullanıcı uyarıya hiç ulaşmadan başvuruyordu.

            Çubuğu birkaç piksel büyütüyor; "başvuru bağlantısı
            çalışmıyor" bilgisinin düğmenin yanında durması buna değer.
          */}
          <IlanDurumEtiketleri listing={listing} className="mb-2" />

          {yol.resmiAdres && yol.anaEylem === 'resmi-site' ? (
            /*
              HARİCİ İLANDA İKİ İŞLEM — ÖLÇÜLDÜ, İKİNCİSİ MOBİLDE YOKTU

              Masaüstü blokta "Başvurduğumu işaretle" vardı ama o blok
              `hidden lg:flex`; telefonda yalnız birincil düğme
              çiziliyordu. Yani mobilde detay sayfasından takip
              listesine ekleme yolu HİÇ YOKTU.

              Birincil geniş, ikincil dar: karar "başvur", kayıt onun
              yanında duran ikincil bir işlem. İkisi eşit genişlikte
              olsaydı hangisinin asıl iş olduğu belirsizleşirdi.
            */
            <div className="flex items-stretch gap-2">
              <a
                href={yol.resmiAdres}
                target="_blank"
                rel="noopener noreferrer nofollow"
                title={yol.ozet}
                className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-xs transition-colors hover:bg-blue-700"
              >
                {hedef.etiket}
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
              {yol.takipEtiketi && (
                <button
                  type="button"
                  onClick={() => onTrack(listing)}
                  title="Yalnızca senin takibin için; şirkete başvuru göndermez."
                  className="flex min-h-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 px-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Başvurdum
                </button>
              )}
            </div>
          ) : kapanis ? (
            <BasvuruKapaliDurumu neden={kapanis} />
          ) : (
            <button
              type="button"
              onClick={() => (yol.anaEylem === 'platform-ici' ? onApply(listing) : onTrack(listing))}
              className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-blue-700"
            >
              {yol.anaEtiket}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Kapanmış iç ilanda düğmenin yerine çizilen durum.
 *
 * Düğme DEĞİL: basılacak bir iş yok, tıklanabilir görünen bir öğe
 * olmayan bir işi vaat ederdi. Bilgi renkte değil metinde; ikon yalnız
 * eşlik ediyor (`aria-hidden`). Gri zemin üstünde gray-700 metin
 * (Tailwind 4 oklch değerlerinin sRGB karşılığıyla hesaplandı: ≈9,4:1) —
 * soluk gri "devre dışı" görünümü okunmayı zorlaştırırdı.
 * Yükseklik düğmeyle aynı (`min-h-12`): çubuk ve sütun yer değiştirmesin.
 */
const BasvuruKapaliDurumu: React.FC<{ neden: 'sure-doldu' | 'kapali' }> = ({ neden }) => {
  const Ikon = neden === 'sure-doldu' ? Clock : Lock;
  return (
    <p
      role="status"
      className="flex min-h-12 w-full flex-1 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-gray-100 px-5 text-sm font-bold text-gray-700"
    >
      <Ikon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {neden === 'sure-doldu' ? ETIKET_SURE_DOLDU : ETIKET_ILAN_KAPALI}
    </p>
  );
};
