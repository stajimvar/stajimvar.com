import React from 'react';
import { ArrowRight } from 'lucide-react';
import { fetchOpportunities, type Opportunity } from '../lib/opportunities';
import { ListingLogo } from './ListingLogo';
import { isExpiredOpportunity, opportunityTypeLabel } from '../lib/opportunity-domain.mjs';
import type { StudentProfile } from '../types';

/**
 * Ana sayfadaki fırsat şeridi.
 *
 * NEDEN KOMPAKT VE ALTTA
 * ----------------------
 * Bölüm ana sayfanın tepesinde, üç büyük kart hâlinde duruyordu ve ekranın
 * çoğunu kaplıyordu: "İlanlar" sekmesindeyken staj ilanları ilk ekranın
 * altında kalıyordu. Sekmenin adı neyse ekranın çoğu o olmalı. Şerit artık
 * ilanların ALTINDA ve yatay kayan tek satır.
 *
 * NEDEN "SANA UYGUN" HER ZAMAN YAZMIYOR
 * -------------------------------------
 * Ölçüldü: 68 fırsatın 57'sinde `education_levels` alanı BOŞ — TÜBİTAK 2250
 * dahil. Yani yapısal alana bakan bir eşleştirme neredeyse hiçbir şeyi
 * süzmez ve "sana uygun" demek yalan olurdu. İki kaynak birlikte
 * kullanılıyor:
 *
 *   1. Alan doluysa doğrudan ona bakılıyor.
 *   2. Alan boşsa BAŞLIKTAKİ açık sinyal okunuyor: "lisansüstü", "yüksek
 *      lisans", "doktora" geçen bir burs lisans öğrencisine gösterilmiyor;
 *      "lise" geçen de üniversiteliye. Bu bir tahmin ve yalnızca ELEME
 *      yönünde kullanılıyor — bir kaydı öne çıkarmak için değil.
 *
 * Başlık ancak gerçekten süzme yapılabildiyse "Sana uygun" oluyor; profil
 * boşsa ya da süzülecek bir şey yoksa "Güncel" kalıyor. Kişiselleştirme
 * iddiası, kişiselleştirme yapıldığında.
 */

const kucult = (metin: string) => metin.toLocaleLowerCase('tr-TR');

/** Başlıkta geçen seviye sinyalleri. Yalnızca eleme için. */
const LISANSUSTU = ['lisansüstü', 'yüksek lisans', 'doktora', 'tez', 'araştırmacı'];
const LISE = ['lise', 'ortaöğretim'];

function seviyeUymuyor(firsat: Opportunity, ogrenci: StudentProfile): boolean {
  const seviyeler = (firsat.educationLevels ?? []).map(kucult);
  const mezunSayilir = ogrenci.gradeLevel === 'Yüksek Lisans / Mezun';

  if (seviyeler.length > 0) {
    const lisansUygun = seviyeler.some((s) => s.includes('lisans') && !s.includes('lisansüstü'));
    const ustUygun = seviyeler.some((s) => s.includes('lisansüstü') || s.includes('doktora'));
    return mezunSayilir ? !ustUygun && !lisansUygun : !lisansUygun;
  }

  const baslik = kucult(`${firsat.title} ${firsat.shortDescription ?? ''}`);
  if (!mezunSayilir && LISANSUSTU.some((iz) => baslik.includes(iz))) return true;
  if (LISE.some((iz) => baslik.includes(iz)) && !baslik.includes('lisans')) return true;
  return false;
}

/** Son başvuruya kalan süre; yakınsa metin aciliyeti söylüyor. */
function sonBasvuru(tarih?: string | null): { aciliyet: string | null; kesin: string } | null {
  if (!tarih) return null;
  const zaman = new Date(tarih).getTime();
  if (Number.isNaN(zaman)) return null;

  const kesin = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(tarih));
  const gun = Math.ceil((zaman - Date.now()) / 86400000);

  /*
    "Son: 25 Ağu" bir tarihtir, aciliyet değil. Yaklaşan tarihte insanın
    okuduğu şey "kaç günüm kaldı" — kesin tarih yine altında duruyor.
  */
  if (gun < 0) return null;
  if (gun === 0) return { aciliyet: 'Bugün son gün', kesin };
  if (gun === 1) return { aciliyet: 'Yarın sona eriyor', kesin };
  if (gun <= 7) return { aciliyet: `${gun} gün kaldı`, kesin };
  return { aciliyet: null, kesin };
}

export const OpportunitiesHomeSection: React.FC<{
  onNavigate: (path: string) => void;
  searchQuery?: string;
  ogrenci?: StudentProfile | null;
}> = ({ onNavigate, searchQuery = '', ogrenci = null }) => {
  const [all, setAll] = React.useState<Opportunity[]>([]);

  React.useEffect(() => {
    let iptal = false;
    fetchOpportunities()
      .then((satirlar) => {
        if (!iptal) setAll(satirlar.filter((satir) => !isExpiredOpportunity(satir)));
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, []);

  const terim = kucult(searchQuery.trim());

  const { items, kisisel } = React.useMemo(() => {
    if (terim) {
      const eslesen = all
        .filter((row) => kucult(row.title).includes(terim) || kucult(row.organizationName).includes(terim))
        .slice(0, 8);
      return { items: eslesen, kisisel: false };
    }

    if (ogrenci) {
      const uygun = all.filter((row) => !seviyeUymuyor(row, ogrenci));
      /* Süzme gerçekten bir şey elediyse "sana uygun" demeye hakkımız var. */
      if (uygun.length > 0 && uygun.length < all.length) {
        return { items: uygun.slice(0, 8), kisisel: true };
      }
    }

    return { items: all.slice(0, 8), kisisel: false };
  }, [all, terim, ogrenci]);

  if (!items.length) return null;

  const baslik = terim
    ? 'Aramanla eşleşen fırsatlar'
    : kisisel
    ? 'Sana uygun öğrenci fırsatları'
    : 'Güncel öğrenci fırsatları';

  return (
    <section aria-labelledby="firsat-seridi" className="mt-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 id="firsat-seridi" className="text-base font-extrabold text-gray-950">
          {baslik}
        </h2>
        <button
          onClick={() => onNavigate('/firsatlar')}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline cursor-pointer shrink-0"
        >
          Tümünü gör <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/*
        YATAY KAYDIRMA

        Dikey ızgara her fırsat için bir satır daha demekti; şerit sabit
        yükseklikte kalıyor ve kaç fırsat olursa olsun sayfayı uzatmıyor.
        Kart genişliği ekranın %78'i: kenardan görünen ikinci kart, yana
        kaydırılabileceğini kendiliğinden söylüyor.
      */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const tarih = sonBasvuru(item.applicationDeadline);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(`/firsatlar/${item.slug}`)}
              className="snap-start shrink-0 w-[78%] sm:w-64 text-left rounded-2xl border border-gray-200 bg-white p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
                  {opportunityTypeLabel(item.opportunityType)}
                </span>
                {tarih?.aciliyet && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 shrink-0">
                    {tarih.aciliyet}
                  </span>
                )}
              </div>

              <div className="flex items-start gap-2.5">
                <ListingLogo name={item.organizationName} logoUrl={item.organizationLogoUrl} halkaIcinde />
                <span className="min-w-0 flex-1">
                  {/* İki satıra izin var: tek satırda kesilen başlık "Hareke..." gibi okunmaz kalıyordu. */}
                  <span className="block text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-[11px] text-gray-500 truncate">
                    {[item.amountText, tarih ? `Son: ${tarih.kesin}` : null].filter(Boolean).join(' · ') ||
                      item.organizationName}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
