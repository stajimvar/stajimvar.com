import React from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { fetchOpportunities, type Opportunity } from '../lib/opportunities';
import { ListingLogo } from './ListingLogo';
import { isExpiredOpportunity } from '../lib/opportunity-domain.mjs';

/*
  ARAMA BURSLARI DA KAPSIYOR

  Arama kutusu yalnızca staj ilanlarını süzüyordu: "KYK" yazan kişi hiçbir
  sonuç göremiyordu, oysa aradığı burs sayfanın ta tepesinde duruyordu.
  Kutunun yazısı da "şehir" diyerek bursları hiç anmıyordu.

  Terim yazıldığında bu bölüm en yeni üç fırsat yerine EŞLEŞEN fırsatları
  gösteriyor; burs adı ve kurum adına bakılıyor. Eşleşme yoksa bölüm hiç
  çizilmiyor, altındaki ilan sonuçları ekranı tek başına alıyor.

  Karşılaştırma Türkçe kurallarıyla küçültülüyor: 'I' ve 'İ' harflerinde
  varsayılan küçültme yanlış eşleşiyor ("İBB" yazan kişi kendi yazdığı
  kurumu bulamıyordu).
*/
const kucult = (metin: string) => metin.toLocaleLowerCase('tr-TR');

export const OpportunitiesHomeSection: React.FC<{ onNavigate: (path: string) => void; searchQuery?: string }> = ({ onNavigate, searchQuery = '' }) => {
  const [all, setAll] = React.useState<Opportunity[]>([]);
  React.useEffect(() => { let cancelled = false; fetchOpportunities().then((rows) => { if (!cancelled) setAll(rows.filter((row) => !isExpiredOpportunity(row))); }).catch(() => {}); return () => { cancelled = true; }; }, []);

  const terim = kucult(searchQuery.trim());
  const items = React.useMemo(() => (
    terim
      ? all.filter((row) => kucult(row.title).includes(terim) || kucult(row.organizationName).includes(terim)).slice(0, 6)
      : all.slice(0, 3)
  ), [all, terim]);

  if (!items.length) return null;
  /*
    YÜKSEKLİK YARIYA İNDİRİLDİ.

    Bölüm ana sayfanın tepesinde duruyor ve asıl içeriği — staj ilanlarını —
    aşağı itiyordu. Yer kazanılan üç nokta:

      1. "FIRSAT MERKEZİ" üst etiketi kaldırıldı. Hemen altındaki başlık
         zaten aynı şeyi söylüyordu; iki satır tek bilgi taşıyordu.
      2. Dış boşluk p-5/p-6 -> p-3/p-4, kart içi p-4 -> p-2.5.
      3. Başlık text-xl -> text-base. Bu bir sayfa başlığı değil, ana
         sayfadaki bir bölümün adı.

    Kart içeriği aynı kaldı: kurum, başlık ve varsa son başvuru tarihi.
    Bilgi silinmedi, yalnızca çevresindeki boşluk alındı.

    KURUM LOGOSU
    ------------
    Kartlar yalnızca metindi; /firsatlar sayfasındaki aynı fırsat yuvarlak
    kurum logosuyla duruyordu. Aynı kayıt iki yerde iki farklı biçimde
    görününce liste ile ana sayfa birbirinden kopuk duruyordu.

    Logo, sitedeki bütün ilan ve fırsat kartlarıyla aynı ListingLogo:
    72×72 yuvarlak kutu, görsel yoksa kurumun baş harfleri. Önce buraya
    özel 36px yazılmıştı; aynı fırsat listede iki katı boyutta duruyordu.
    Ölçü tek yerden geldiği için bölüm bir tık uzadı, karşılığında ana
    sayfa ile liste aynı görünüyor.
  */
  return <section aria-labelledby="guncel-firsatlar" className="mb-4 rounded-2xl border border-blue-100 bg-white p-3 sm:p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="guncel-firsatlar" className="text-base font-extrabold text-gray-950">{terim ? 'Aramanızla eşleşen fırsatlar' : 'Güncel Öğrenci Fırsatları'}</h2><button onClick={() => onNavigate('/firsatlar')} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">Tüm fırsatları gör <ArrowRight className="w-3.5 h-3.5"/></button></div><div className="mt-2.5 grid md:grid-cols-3 gap-2">{items.map((item) => <button key={item.id} onClick={() => onNavigate(`/firsatlar/${item.slug}`)} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50/30"><ListingLogo name={item.organizationName} logoUrl={item.organizationLogoUrl}/><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-blue-700">{item.organizationName}</span><b className="block truncate text-sm text-gray-900">{item.title}</b>{item.applicationDeadline && <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-600"><CalendarDays className="w-3 h-3"/>Son: {new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium'}).format(new Date(item.applicationDeadline))}</span>}</span></button>)}</div></section>;
};
