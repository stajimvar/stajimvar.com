import React from 'react';
import { ArrowRight, CalendarDays, Sparkles } from 'lucide-react';
import { fetchOpportunities, type Opportunity } from '../lib/opportunities';
import { isExpiredOpportunity } from '../lib/opportunity-domain.mjs';

export const OpportunitiesHomeSection: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [items, setItems] = React.useState<Opportunity[]>([]);
  React.useEffect(() => { let cancelled = false; fetchOpportunities().then((rows) => { if (!cancelled) setItems(rows.filter((row) => !isExpiredOpportunity(row)).slice(0, 3)); }).catch(() => {}); return () => { cancelled = true; }; }, []);
  if (!items.length) return null;
  return <section aria-labelledby="guncel-firsatlar" className="mb-6 rounded-3xl border border-blue-100 bg-white p-5 sm:p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Fırsat merkezi</p><h2 id="guncel-firsatlar" className="mt-1 text-xl font-extrabold text-gray-950">Güncel Öğrenci Fırsatları</h2></div><button onClick={() => onNavigate('/firsatlar')} className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline">Tüm fırsatları gör <ArrowRight className="w-4 h-4"/></button></div><div className="mt-4 grid md:grid-cols-3 gap-3">{items.map((item) => <button key={item.id} onClick={() => onNavigate(`/firsatlar/${item.slug}`)} className="min-w-0 rounded-2xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50/30"><span className="text-xs font-bold text-blue-700">{item.organizationName}</span><b className="mt-1 block truncate text-sm text-gray-900">{item.title}</b>{item.applicationDeadline && <span className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600"><CalendarDays className="w-3.5 h-3.5"/>Son: {new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium'}).format(new Date(item.applicationDeadline))}</span>}</button>)}</div></section>;
};
