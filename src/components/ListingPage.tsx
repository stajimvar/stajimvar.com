import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, MapPin, Calendar, DollarSign, ShieldCheck, ExternalLink, RefreshCw,
  Building2, Clock, AlertTriangle, Share2, Check,
} from 'lucide-react';
import type { InternshipListing } from '../types';
import { fetchListingByIdPrefix } from '../lib/queries';
import { ListingLogo } from './ListingLogo';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
import { IlanDurumEtiketleri } from './IlanDurumEtiketleri';
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
  <div className="flex items-start gap-2.5">
    <div className="text-gray-400 mt-0.5 shrink-0">{ikon}</div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-gray-600 font-bold">
        {etiket}
      </p>
      <p className="text-sm font-semibold text-gray-900 break-words">{deger}</p>
      {ek}
    </div>
  </div>
);

export const ListingPage: React.FC<ListingPageProps> = ({
  gomulu = false, idPrefix, onBack, onNavigate, onApply, onTrack,
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
  }, [idPrefix]);

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
            ? `${SAYFA_GENISLIGI} w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-4 sm:pt-6 pb-[calc(170px+env(safe-area-inset-bottom))] lg:pb-8 space-y-6`
            : 'max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-8 space-y-6'
        }
      >
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
            başvuru alanı. Telefonda sıra aynı: içerik, uyarı; eylemler
            alttaki sabit çubukta.
          */
          <div className="space-y-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0">
          <div className="min-w-0 space-y-6 lg:col-span-8">
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7 space-y-4">
              <div className="flex items-start gap-4">
                <ListingLogo
                  name={listing.companyName}
                  logoUrl={listing.companyLogo || undefined}
                />
                <div className="min-w-0 space-y-1">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/sirket/${listing.companySlug ?? slugify(listing.companyName)}`)}
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    {listing.companyName}
                  </button>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl font-extrabold leading-snug">
                        {listing.title}
                      </h1>
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
                          <p className="mt-1 text-xs text-gray-500">
                            Resmî ilan adı:{' '}
                            <span className="font-semibold text-gray-700">
                              {listing.sourceTitle}
                            </span>
                          </p>
                        )}
                    </div>
                    <button
                      type="button"
                      onClick={() => paylas(listing)}
                      aria-label="İlanı paylaş"
                      title="İlanı paylaş"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {paylasimDurumu === 'kopyalandi' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Kopyalandı
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          Paylaş
                        </>
                      )}
                    </button>
                  </div>
                  {listing.origin === 'scraped' && (
                    <p className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Şirketin kendi kariyer sayfasından alındı
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <Bilgi
                  ikon={<MapPin className="w-4 h-4" />}
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
                  <Bilgi ikon={<Building2 className="w-4 h-4" />} etiket="Departman" deger={listing.department} />
                )}
                {sureMetni && (
                  <Bilgi ikon={<Clock className="w-4 h-4" />} etiket="Süre" deger={sureMetni} />
                )}
                {sonBasvuru && (
                  <Bilgi
                    ikon={<Calendar className="w-4 h-4" />}
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
                    ikon={<DollarSign className="w-4 h-4" />}
                    etiket="Ücret"
                    deger={ucretMetni}
                  />
                )}
                {stajTuru.map((satir) => (
                  <Bilgi
                    key={satir.etiket}
                    ikon={<ShieldCheck className="w-4 h-4" />}
                    etiket={satir.etiket}
                    deger={satir.deger}
                  />
                ))}
                {sigorta && (
                  <Bilgi
                    ikon={<ShieldCheck className="w-4 h-4" />}
                    etiket="Sigorta"
                    deger={sigorta}
                  />
                )}
                {sigortaNotu && (
                  <Bilgi
                    ikon={<ShieldCheck className="w-4 h-4" />}
                    etiket="Sigorta notu"
                    deger={sigortaNotu}
                  />
                )}
                {donemMetni && (
                  <Bilgi ikon={<Calendar className="w-4 h-4" />} etiket="Dönem" deger={donemMetni} />
                )}
                {bicimMetni && (
                  <Bilgi
                    ikon={<Building2 className="w-4 h-4" />}
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
                    ikon={<RefreshCw className="w-4 h-4" />}
                    etiket="Son kaynak kontrolü"
                    deger={sonKontrolMetni(listing.lastSeenAt)!.replace('Son kontrol: ', '')}
                  />
                )}
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
                <p className="pt-3 text-[11px] leading-relaxed text-gray-600">{eksikBilgiNotu}</p>
              )}
            </div>

            {listing.requiredSkills.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-3">
                <h2 className="text-sm font-bold">İlanda geçen beceriler</h2>
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

            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold">İlan metni</h2>
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                  Otomatik çeviri
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
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Bu metin kaynak ilanın otomatik Türkçe çevirisi. Anlam
                uyuşmazlığında şirketin resmî ilanı esas alınır.
                {listing.sourceUrl && (
                  <>
                    {' '}
                    <a
                      href={listing.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      Orijinal ilanı aç
                    </a>
                    .
                  </>
                )}
              </p>
              <p
                className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${
                  metinAcik ? '' : 'line-clamp-[12]'
                }`}
              >
                {listing.description}
              </p>
              {(listing.description || '').length > 900 && (
                <button
                  type="button"
                  onClick={() => setMetinAcik((a) => !a)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 cursor-pointer"
                >
                  {metinAcik ? 'Metni kısalt' : 'Kaynak metnin tamamını göster'}
                </button>
              )}
              {listing.sourceUrl && (
                <p className="text-[11px] text-gray-600 pt-2 border-t border-gray-100">
                  Kaynak: {new URL(listing.sourceUrl).hostname}
                </p>
              )}
            </div>

          </div>
          <aside className="min-w-0 space-y-3 lg:col-span-4 lg:sticky lg:top-6" aria-label="Başvuru seçenekleri">
            {/*
              DURUM UYARISI BAŞVURU SEÇENEKLERİNİN BAŞINDA

              Bu etiketler kartta ve ilan önizlemesinde vardı ama BURADA
              YOKTU. Oysa arama motorundan gelen kişi doğrudan bu sayfaya
              düşüyor ve kartı hiç görmüyor: yani "kaynak doğrulanamadı"
              ya da "başvuru bağlantısı çalışmıyor" uyarısını görmeden
              başvuru düğmesine basıyordu.

              Kartla aynı bileşen; iki kopya er geç ayrışır ve iki ekran
              aynı ilan için farklı şey söylerdi.
            */}
            {listing && <IlanDurumEtiketleri listing={listing} />}

            {/*
              Açıklama, kart ve başvuru diyaloğuyla aynı cümleyi kuruyor:
              karar lib/basvuru-yolu.mjs'te. Önce burada "şirkete talebi
              bildiririz" yazıyordu; böyle çalışan bir süreç yok.
            */}
            {!yol.teslimEdiliyor && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-900 leading-relaxed">
                  {yol.ozet} StajımVar kaydı yalnızca senin takip listen içindir —{' '}
                  <strong>resmî sayfadan başvurmayı unutma</strong>.
                </p>
              </div>
            )}

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
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl text-sm font-bold transition-colors shadow-xs ${
                    yol.anaEylem === 'resmi-site'
                      ? 'text-white bg-blue-600 hover:bg-blue-700'
                      : 'border border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  {yol.anaEylem === 'resmi-site' ? yol.anaEtiket : 'İlana git'}
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => (yol.anaEylem === 'platform-ici' ? onApply(listing) : onTrack(listing))}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl text-sm font-bold transition-colors shadow-xs ${
                  yol.anaEylem === 'resmi-site'
                    ? 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {yol.anaEylem === 'resmi-site' ? yol.takipEtiketi : yol.anaEtiket}
              </button>
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
                {yol.anaEtiket}
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
