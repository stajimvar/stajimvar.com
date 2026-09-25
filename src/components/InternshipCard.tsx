import React from 'react';
import {
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Bookmark,
  Building2,
  ExternalLink,
  ShieldCheck,
  Star,
  ArrowUpRight,
  FileText, AlertTriangle} from 'lucide-react';
import { InternshipListing, MatchBreakdown } from '../types';
import { ListingLogo } from './ListingLogo';
import { listingSlug } from '../lib/slug';
import { SIRKET_KENAR_GUCLU, SIRKET_ROZET, SIRKET_VURGU_KOYU } from '../sirket/renk';
import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { IlanDurumEtiketleri } from './IlanDurumEtiketleri';
import { UlkeRozeti } from './UlkeRozeti';
import { COGRAFYA, ilanCografyasi } from '../lib/ilan-cografyasi.mjs';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
import { ILAN_TIPI_ETIKETI } from '../lib/ilan-hedefi.mjs';
import { KART_EYLEMI } from '../lib/kart-cta';
import { ILAN_KAYNAGI } from '../lib/urun-metni';
import { tarihMetni } from '../lib/tarih.mjs';
import { YUZEY } from '../ui/tokens';
/*
  Staj türü kararı ayrı dosyada: kart ve detay AYNI kuralı kullanıyor
  ve kural React ağacı kurmadan sınanabiliyor.
*/

/**
 * SİGORTAYI SAĞLAYAN TARAFIN OKUNABİLİR ADI.
 *
 * "yok" da GÖSTERİLİYOR: kaynağın açık beyanı ve öğrenci için gerçek
 * bir bilgi. Gösterilmeyen tek hâl `undefined` — kaynağın hiç
 * konuşmadığı hâl.
 */

/*
  ALT CTA GEOMETRİSİ — TEK AİLE

  Kartın altındaki iki kutu (ikincil, birincil ve başarı durumu) aynı
  ölçüleri paylaşıyor: aynı yükseklik, aynı köşe, aynı yazı boyu, aynı
  iç boşluk. Böylece ilan durumu değişince — dış ilan, StajımVar ilanı,
  başvurulmuş — alt alan aynı kalıyor ve kartlar arasında zıplama olmuyor.

  Tanımlar `lib/kart-cta` dosyasına taşındı: aynı düğme çifti fırsat
  kartında da var ve iki dosyada elle yazılınca renkleri ters, puntoları
  farklı hâle gelmişti.
*/

interface InternshipCardProps {
  listing: InternshipListing;
  match: MatchBreakdown;
  hasApplied: boolean;
  onViewDetails: () => void;
  onQuickApply: () => void;
  /*
    KAYDET, BAŞVURDUM'DAN AYRI

    İkisi farklı niyet: kaydetmek "ilgileniyorum, henüz başvurmadım",
    başvurdum işaretlemek "resmî sayfada tamamladım". Tek düğmede toplamak,
    kullanıcıyı yapmadığı bir şeyi işaretlemeye zorluyordu.

    Kaydet düğme sırasına DEĞİL kartın köşesine kondu: alt sıra zaten iki
    düğme taşıyor ve üçüncüsü başlığı satırlara sarıyordu (daha önce
    ölçüldü).
  */
  kayitli?: boolean;
  onToggleKayit?: () => void;
  /*
    Misafir kullanıcıda da yer imi GÖRÜNÜYOR ama işaretlenmiş olmuyor:
    düğme gizlendiğinde giriş yapmamış ziyaretçi bu özelliğin varlığından
    haberdar olmuyordu. Tıklayınca giriş penceresi açılıyor.
  */
  girisGerekli?: boolean;
  /*
    Misafirken dış başvuru bağlantısı giriş penceresini açıyor. İlanın
    kendisi açık; kapanan yalnızca son adım — bkz. ui/DisBaglanti.
  */
  onGirisGerekli?: (niyet: {
    tur: 'dis' | 'ic';
    ilanId: string;
    yol: string;
    disAdres?: string;
    baslik?: string;
  }) => void;
  /*
    KENDİ ŞİRKETİNİN İLANI

    Şirket üyesi öğrenci görünümüne geçip kendi ilanını kontrol
    edebiliyor; oradan yanlışlıkla başvurabilmesi ise kendi paneline
    sahte bir aday düşürüyor ve başvuru sayacını şişiriyordu.

    Bu bir GÖRÜNÜM kuralı: veritabanı hâlâ izin veriyor, çünkü kuralı
    RLS'e taşımak ürün kararı ve ayrı ele alınıyor.
  */
  kendiIlanim?: boolean;
  /*
    TELEFONDA KART DEĞİL, YÜZEY

    Liste ekranında kartlar gri zemin üzerinde yüzen kutulardı: iki
    yanında 16 pikselik şeritler, köşelerinde yuvarlatma, aralarında
    12 piksel boşluk. Bu bayrak açıkken telefonda kabuk yerini tek bir
    alt çizgiye bırakıyor ve kart ekranın iki kenarına yaslanıyor;
    `sm:` ve üstünde kart olduğu gibi geri geliyor.

    PROP'A BAĞLI, ÇÜNKÜ KART PAYLAŞILIYOR: aynı bileşen dev
    düzeneğinde ve ileride başka bağlamlarda da çiziliyor. Yüzey
    davranışı yalnız liste ekranının kararı.
  */
  yuzey?: boolean;
  /**
   * "Tüm ilanlar" görünümünde Türkiye ilanlarına da "Türkiye" etiketi.
   * Yurtdışı ilanlarında ülke rozeti her görünümde; konumu belirsiz ilana
   * etiket konmuyor.
   */
  cografyaEtiketi?: boolean;
}

export const InternshipCard: React.FC<InternshipCardProps> = ({
  listing,
  match,
  hasApplied,
  onViewDetails,
  onQuickApply,
  kayitli = false,
  onToggleKayit,
  girisGerekli = false,
  onGirisGerekli,
  kendiIlanim = false,
  yuzey = false,
  cografyaEtiketi = false,
}) => {
  /*
    UYUM PUANI LOGONUN ETRAFINDA HALKA OLARAK

    Önce kartın alt satırında "%38 uyum" yazan ayrı bir rozet vardı. Bilgi
    doğruydu ama kendi satırını ve kendi çerçevesini istiyordu; kartın alt
    yarısı zaten üç düğmeyle doluydu.

    Halka, sitede üçüncü kez aynı işi yapıyor ve hep aynı anlamda: ölçülmüş
    bir durumu göstermek. Profilde doluluk, şirket şeridinde "son 24 saatte
    yeni ilan", burada uyum puanı. Dekor değil — yüzde neyse halkanın o
    kadarı doluyor.

    Renk: turuncu bilerek yok, uyarı gibi okunuyor ve düşük puanlı ilanı
    "sorunlu" göstermek istemiyoruz. Düşük puan sessiz gri, iyisi yeşil.
  */
  const halkaRengi =
    match.overallScore >= 75 ? '#10b981' : match.overallScore >= 50 ? '#2563eb' : '#9ca3af';

  /* Başvurunun gerçekte nasıl işlediği — düğmelerin yazısı buradan geliyor. */
  const yol = basvuruYolu(listing);
  /*
    Şirketin StajımVar'da kendi açtığı ilan. `origin` alanının üretilmiş
    tipinde 'employer_posted' henüz yok (tipler yeniden üretilmedi), o
    yüzden karşılaştırma dizeyle yapılıyor.
  */
  const sirketinKendiIlani =
    String(listing.origin) === 'employer_posted' || String(listing.origin) === 'internal';
  /*
    "Kariyer sayfasından" ETİKETİ ARTIK ELLE EKLENEN İLANI DA KAPSIYOR

    Koşul yalnızca `origin === 'scraped'` idi. Ama üçüncü bir tür var:
    otomasyonun derleyemediği bir ilanı kaynağından okuyup elle giriyoruz
    ve `origin` 'manual' oluyor. O ilan da başvuruyu şirketin kendi
    sayfasına yolluyor — düğmesinde "Resmî sitede başvur" yazıyor — ama
    kartında hiçbir kaynak etiketi çıkmıyordu. Yeni eklenen ilanlar
    listede etiketsiz duruyor, komşusu etiketli: öğrenci ikisinin farklı
    işlediğini sanıyor.

    Koşul artık başvurunun gerçekte nereye gittiğine bakıyor
    (`basvuruYolu`), yani düğmenin yazısıyla etiket asla ayrışamıyor.
    Adresi olmayan elle girilmiş ilan hâlâ etiketsiz: onu kariyer
    sayfasına yollayamıyoruz, "kariyer sayfasından" demek de yanıltır.
  */
  const kariyerSayfasindanIlan =
    !sirketinKendiIlani && (listing.origin === 'scraped' || yol.anaEylem === 'resmi-site');

  /* Ham ISO yerine "6 Eylül 2026"; değer yoksa satır hiç basılmıyor. */
  const sonBasvuru = tarihMetni(listing.applicationDeadline);


  /*
    İLAN KARTI — HİYERARŞİ (mobil sadeleştirme, 25 Eylül 2026)

      SOL     56 × 56 logo
      ORTA    pozisyon (ana başlık) · şirket · konum/çalışma biçimi ·
              varsa ilan türü ve son başvuru
      SAĞ ÜST kaydet
      ALT     solda kaynak, sağda "İlanı incele"

    Önce şirket adı başlıktı, pozisyon ikinci satırdı; öğrencinin sorusu
    "nereye başvurabilirim" — pozisyon önde.

    DETAY ÖNCE (kullanıcı kararı, 25 Eylül 2026): kartın tek eylemi
    StajımVar'daki ilan sayfası. Öğrenci şartları — ücret, sigorta, staj
    türü, doğrulama — orada görüp dış siteye oradan gidiyor; o düğmenin
    yazısı gerçek hedefi söylüyor (`ilanHedefi`, ListingPage). Kaydet ile
    eylem örtünün üstünde (`relative z-10`), birbirinden bağımsız.

    Tarih ve tür yalnız veride varsa: ölçüldü (25 Eylül 2026) yayındaki
    186 ilanın 9'unda son başvuru, 177'sinde tür var. Tahmin basılmıyor.
  */
  const ilanAdresi = `/ilan/${listingSlug(listing)}`;
  const ilanaGit = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onViewDetails();
  };
  const tipEtiketi = listing.ilanTipi ? ILAN_TIPI_ETIKETI[listing.ilanTipi] : null;
  const konum = [konumEtiketi(listing.city), calismaEtiketi(listing.workType)].filter(Boolean).join(' · ');
  const yurtdisi = ilanCografyasi(listing) === COGRAFYA.YURTDISI;
  const turkiyeEtiketi = cografyaEtiketi && ilanCografyasi(listing) === COGRAFYA.TURKIYE;
  const kayitMetni = girisGerekli
    ? 'Kaydetmek için giriş yap'
    : kayitli
      ? 'Kayıtlardan çıkar'
      : 'Daha sonra bakmak için kaydet';

  return (
    <div
      id={`internship-card-${listing.id}`}
      className={`group relative flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-600 ${
        yuzey ? '' : 'sm:hover:border-blue-400'
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {/* ---- SOL: logo ---- */}
        <div className="shrink-0" title={listing.companyName}>
          <ListingLogo
            name={listing.companyName}
            logoUrl={listing.companyLogo || undefined}
            className="!h-14 !w-14 !rounded-xl !p-1.5 !text-lg"
          />
        </div>

        {/* ---- ORTA: bilgiler ---- */}
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold leading-[22px] text-slate-900">
            <a
              href={ilanAdresi}
              onClick={ilanaGit}
              className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:text-blue-700"
            >
              {listing.title}
            </a>
          </h3>
          <p className="mt-0.5 break-words text-sm leading-5 text-gray-700">
            {listing.companyName}
            {listing.department && <span className="text-gray-500"> · {listing.department}</span>}
          </p>

          {(konum || yurtdisi || turkiyeEtiketi) && (
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-5 text-gray-600">
              <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
              {/* Çalışma biçimi bilinmiyorsa yazılmıyor — varsayılan uydurulmuyor. */}
              {konum && <span className="min-w-0 break-words">{konum}</span>}
              {yurtdisi && <UlkeRozeti countryCode={listing.countryCode} />}
              {turkiyeEtiketi && (
                <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                  Türkiye
                </span>
              )}
            </p>
          )}

          {(tipEtiketi || sonBasvuru) && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4 text-gray-600">
              {tipEtiketi && (
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                  {tipEtiketi}
                </span>
              )}
              {sonBasvuru && (
                <span>
                  Son başvuru: <strong className="font-semibold text-gray-800">{sonBasvuru}</strong>
                </span>
              )}
            </p>
          )}

          {/*
            Görünür durum etiketleri ortak bileşende: aynı etiketler ilan
            detayında da gerekiyor ve iki kopya er geç ayrışırdı. Gerekçesi
            ve hangi durumda neyin yazıldığı orada.
          */}
          <IlanDurumEtiketleri listing={listing} className="mt-1.5" />
        </div>

        {/* ---- SAĞ ÜST: kaydet ---- */}
        <div className="relative z-10 -mr-2 -mt-2 shrink-0">
          {onToggleKayit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleKayit();
              }}
              aria-pressed={girisGerekli ? undefined : kayitli}
              aria-label={kayitMetni}
              title={kayitMetni}
              className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                kayitli ? 'text-blue-600' : 'text-slate-700 hover:bg-gray-100 hover:text-blue-600'
              }`}
            >
              <Bookmark aria-hidden className={`h-6 w-6 ${kayitli ? 'fill-blue-600' : ''}`} strokeWidth={1.75} />
            </button>
          ) : (
            <span aria-hidden className="block h-11 w-11" />
          )}
        </div>
      </div>

      {/* ---- ALT: kaynak ve eylem ---- */}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p
          className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-gray-600"
          title={
            kariyerSayfasindanIlan
              ? 'Bu ilan şirketin kendi kariyer sayfasından alındı'
              : "Bu ilanı şirket doğrudan StajımVar'da yayımladı; başvuru burada tamamlanıyor"
          }
        >
          <FileText aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate">{kariyerSayfasindanIlan ? ILAN_KAYNAGI.dis.etiket : ILAN_KAYNAGI.ic.etiket}</span>
        </p>

        <div className="relative z-10 shrink-0">
          <a
            href={ilanAdresi}
            onClick={ilanaGit}
            aria-label={`${listing.title} ilanını incele`}
            className={KART_EYLEMI.kenar}
          >
            İlanı incele
          </a>
        </div>
      </div>
    </div>
  );
};
