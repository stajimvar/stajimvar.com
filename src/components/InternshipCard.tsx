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
import { UlkeRozeti } from './UlkeRozeti';
import { COGRAFYA, ilanCografyasi } from '../lib/ilan-cografyasi.mjs';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
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
    İLAN KARTI — ÜÇ BÖLÜM YAN YANA (onaylanan tasarım)

      SOL   büyük şirket logosu
      ORTA  şirket adı · pozisyon · konum/çalışma biçimi · kaynak
      SAĞ   üstte kaydet, altta "İncele"

    Bölümler çizgiyle değil hizalama ve boşlukla ayrılıyor. Bilgiler
    logonun altına, "İncele" ayrı bir alt satıra İNMİYOR: uzun pozisyon
    adı orta bölümün içinde satır atlıyor, logo ve eylemler yerinde kalıyor.

    LOGO BÜYÜK VE HERKESE EŞİT
    KOBİ ile büyük şirket aynı logo alanını alıyor. Oran korunuyor
    (`object-contain`, CompanyLogo); logosu olmayan ya da yüklenemeyen
    şirkette aynı ölçüde pastel zeminli baş harf alanı. Dar ekranda önce
    boşluklar azalıyor, logo 72 pikselin altına inmiyor — avatara dönmüyor.

    ŞİRKET/OFİS FOTOĞRAFI YOK
    Kart yalnız logoyu taşıyor.

    TIKLAMA
    Kartın tamamı pozisyon bağlantısının `after:` örtüsüyle ilana gidiyor.
    Kaydet ve "İncele" örtünün üstünde (`relative z-10`); "İncele" aynı
    adrese giden gerçek bir bağlantı — ctrl/orta tuş tarayıcıya kalıyor.
  */
  const ilanAdresi = `/ilan/${listingSlug(listing)}`;
  const ilanaGit = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onViewDetails();
  };

  return (
    <div
      id={`internship-card-${listing.id}`}
      className={`group relative flex min-w-0 items-stretch gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 transition-colors hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-600 min-[390px]:gap-3.5 min-[390px]:px-3.5 min-[430px]:gap-4 min-[430px]:px-4 sm:p-4 ${
        yuzey ? '' : 'sm:hover:border-blue-400'
      }`}
    >
      {/* ---- SOL: logo ---- */}
      <div className="shrink-0" title={listing.companyName}>
        <ListingLogo
          name={listing.companyName}
          logoUrl={listing.companyLogo || undefined}
          className="!h-[clamp(72px,21vw,92px)] !w-[clamp(72px,21vw,92px)] !rounded-xl !p-2 !text-2xl"
        />
      </div>

      {/* ---- ORTA: bilgiler ---- */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h3 className="break-words text-[15px] font-bold leading-snug text-slate-900 min-[430px]:text-base">
          {listing.companyName}
        </h3>
        <h4 className="mt-0.5 break-words text-[15px] font-semibold leading-snug text-slate-800 min-[430px]:text-base">
          <a
            href={ilanAdresi}
            onClick={ilanaGit}
            className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-blue-700"
          >
            {listing.title}
          </a>
        </h4>
        {listing.department && (
          <p className="mt-0.5 break-words text-xs text-gray-500">({listing.department})</p>
        )}

        <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-[13px] leading-snug text-gray-500">
          <MapPin aria-hidden className="mt-px h-4 w-4 shrink-0 text-gray-400" />
          <span className="min-w-0 break-words">
            {/* Çalışma biçimi bilinmiyorsa yazılmıyor — varsayılan uydurulmuyor. */}
            {[konumEtiketi(listing.city), calismaEtiketi(listing.workType)].filter(Boolean).join(' · ')}
          </span>
          {ilanCografyasi(listing) === COGRAFYA.YURTDISI && <UlkeRozeti countryCode={listing.countryCode} />}
          {cografyaEtiketi && ilanCografyasi(listing) === COGRAFYA.TURKIYE && (
            <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800">
              Türkiye
            </span>
          )}
        </p>

        <p
          className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-gray-500"
          title={
            kariyerSayfasindanIlan
              ? 'Bu ilan şirketin kendi kariyer sayfasından alındı'
              : "Bu ilanı şirket doğrudan StajımVar'da yayımladı; başvuru burada tamamlanıyor"
          }
        >
          <FileText aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
          <span>{kariyerSayfasindanIlan ? ILAN_KAYNAGI.dis.etiket : ILAN_KAYNAGI.ic.etiket}</span>
        </p>

        {sonBasvuru && (
          <p className="mt-1 text-xs text-gray-500">
            Son başvuru: <strong className="font-semibold text-gray-700">{sonBasvuru}</strong>
          </p>
        )}

        {/*
          GÖRÜNÜR DURUM ETİKETLERİ — İLANI LİSTEDEN ÇIKARMIYOR

          Katalogdaki 104 Türkiye ilanının 29'unda kaynak doğrulanamadı
          ve 8 ilanın başvuru bağlantısı kesin kanıtla ölü (ölçüldü,
          21 Eylül 2026). Bu ilanlar listede DURUYOR: kanıtsız kapatmak
          açık bir ilanı listeden silmek olurdu.

          Eksik olan şey kullanıcının bunu BİLMESİYDİ. Etiket durumu
          söylüyor, kararı kullanıcıya bırakıyor.

          İKİ AYRI SORU, İKİ AYRI ETİKET
            kaynakDurumu → kaynağa ulaşıp ilanın orada olduğunu
                           doğrulayabildik mi
            applyUrlOk   → başvuru bağlantısı teknik olarak çalışıyor mu
          Birini ötekinin yerine kullanmak, "bizim tarafımızın sorunu"
          ile "ilanın sorunu"nu aynı şeye çevirirdi.

          `gecerli` ve `acik` için etiket YOK: her şey yolundayken
          rozet basmak gürültü, sorunlu olanı da görünmez kılar.
        */}
        {(listing.kaynakDurumu === 'belirsiz'
          || listing.kaynakDurumu === 'erisilemedi'
          || listing.applyUrlOk === 'kirik'
          || listing.applyUrlOk === 'dogrulanamadi') && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {listing.applyUrlOk === 'kirik' && (
              <span
                title="Başvuru bağlantısı çağrıldı ve ölü döndü (404/410). İlan listede kalıyor; şirketin kariyer sayfasından arayabilirsin."
                className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
              >
                <AlertTriangle aria-hidden className="h-3 w-3" />
                Başvuru bağlantısı çalışmıyor
              </span>
            )}
            {listing.applyUrlOk === 'dogrulanamadi' && (
              <span
                title="Başvuru bağlantısına ulaşılamadı (bot engeli ya da zaman aşımı). Bağlantı ölü demek değil."
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
              >
                <AlertTriangle aria-hidden className="h-3 w-3" />
                Bağlantı doğrulanamadı
              </span>
            )}
            {listing.kaynakDurumu === 'belirsiz' && (
              <span
                title="Kaynak sayfasına ulaşıldı ama ilanın hâlâ açık olduğuna dair kanıt bulunamadı."
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
              >
                Kaynak doğrulanamadı
              </span>
            )}
            {listing.kaynakDurumu === 'erisilemedi' && (
              <span
                title="Kaynak sayfasına teknik olarak ulaşılamadı. İlan hakkında bir şey söylemiyor."
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
              >
                Kaynağa ulaşılamadı
              </span>
            )}
          </p>
        )}
      </div>

      {/* ---- SAĞ: kaydet ve İncele ---- */}
      <div className="relative z-10 flex shrink-0 flex-col items-end justify-between gap-3">
        {onToggleKayit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleKayit();
            }}
            aria-pressed={girisGerekli ? undefined : kayitli}
            aria-label={
              girisGerekli
                ? 'Kaydetmek için giriş yap'
                : kayitli
                  ? 'Kayıtlardan çıkar'
                  : 'Daha sonra bakmak için kaydet'
            }
            title={
              girisGerekli
                ? 'Kaydetmek için giriş yap'
                : kayitli
                  ? 'Kayıtlardan çıkar'
                  : 'Daha sonra bakmak için kaydet'
            }
            className={`-mr-1.5 -mt-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors ${
              kayitli ? 'text-blue-600' : 'text-slate-700 hover:bg-gray-100 hover:text-blue-600'
            }`}
          >
            <Bookmark aria-hidden className={`h-6 w-6 ${kayitli ? 'fill-blue-600' : ''}`} strokeWidth={1.75} />
          </button>
        ) : (
          <span aria-hidden className="h-10 w-10" />
        )}

        <a
          href={ilanAdresi}
          onClick={ilanaGit}
          aria-label={`${listing.title} ilanını incele`}
          className="mb-1 inline-flex items-center gap-1 whitespace-nowrap text-[15px] font-bold text-blue-600 hover:text-blue-700"
        >
          İncele
          <ArrowUpRight aria-hidden className="h-4 w-4" strokeWidth={2.25} />
        </a>
      </div>
    </div>
  );
};
