import React from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { fetchOpportunities, type Opportunity } from '../lib/opportunities';
import { isExpiredOpportunity } from '../lib/opportunity-domain.mjs';

export const OpportunitiesHomeSection: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [items, setItems] = React.useState<Opportunity[]>([]);
  React.useEffect(() => { let cancelled = false; fetchOpportunities().then((rows) => { if (!cancelled) setItems(rows.filter((row) => !isExpiredOpportunity(row)).slice(0, 3)); }).catch(() => {}); return () => { cancelled = true; }; }, []);
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
  */
  return <section aria-labelledby="guncel-firsatlar" className="mb-4 rounded-2xl border border-blue-100 bg-white p-3 sm:p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="guncel-firsatlar" className="text-base font-extrabold text-gray-950">Güncel Öğrenci Fırsatları</h2><button onClick={() => onNavigate('/firsatlar')} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">Tüm fırsatları gör <ArrowRight className="w-3.5 h-3.5"/></button></div><div className="mt-2.5 grid md:grid-cols-3 gap-2">{items.map((item) => <button key={item.id} onClick={() => onNavigate(`/firsatlar/${item.slug}`)} className="min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50/30"><span className="block truncate text-[11px] font-bold text-blue-700">{item.organizationName}</span><b className="block truncate text-sm text-gray-900">{item.title}</b>{item.applicationDeadline && <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-600"><CalendarDays className="w-3 h-3"/>Son: {new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium'}).format(new Date(item.applicationDeadline))}</span>}</button>)}</div></section>;
};
