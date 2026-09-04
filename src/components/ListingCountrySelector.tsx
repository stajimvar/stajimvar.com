import React from 'react';
import { ChevronDown, MapPin } from 'lucide-react';

const names=new Intl.DisplayNames(['tr'],{type:'region'});

export const ListingCountrySelector:React.FC<{
  value:string;
  countries:Array<{code:string;count:number}>;
  onChange:(value:string)=>void;
}>=({value,countries,onChange})=>{
  const options=[...countries];
  if(/^[A-Z]{2}$/.test(value)&&!options.some(x=>x.code===value))options.unshift({code:value,count:0});
  return <label className="relative flex min-h-11 min-w-0 items-center rounded-xl border border-gray-200 bg-white">
    <MapPin className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-blue-600"/>
    <span className="sr-only">İlan ülkesi</span>
    <select aria-label="İlan ülkesi" value={value} onChange={e=>onChange(e.target.value)} className="min-h-11 min-w-0 flex-1 appearance-none bg-transparent py-2 pl-2 pr-9 text-sm font-bold text-gray-900 outline-none cursor-pointer">
      <option value="all">Tüm ülkeler</option>
      <option value="remote">Remote</option>
      {options.map(({code,count})=><option key={code} value={code}>{names.of(code)??code}{count>0?` (${count})`:''}</option>)}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-gray-500"/>
  </label>;
};
