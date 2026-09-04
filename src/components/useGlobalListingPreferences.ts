import * as React from 'react';
import { fetchPublishedListingsCatalog, type PublishedListingsCatalogPage } from '../lib/queries';
import { normalizeCountryCode, readCountryQuery, resolveListingCountry, writeCountryQuery } from '../lib/global-preferences.mjs';

const STORAGE_KEY='stajimvar_listing_country_v1';

export function useGlobalListingPreferences(accountCountries: string[] = []) {
  const initial=()=>resolveListingCountry({
    urlCountry:readCountryQuery(window.location.search),
    browserCountry:window.localStorage.getItem(STORAGE_KEY),
    accountCountries,
    locale:navigator.language,
    cloudflareCountry:null,
  });
  const [country,setCountryState]=React.useState(initial);
  const [page,setPage]=React.useState<PublishedListingsCatalogPage|null>(null);
  const [phase,setPhase]=React.useState<'loading'|'ready'|'error'>('loading');
  const [error,setError]=React.useState<string|null>(null);
  const requestVersion=React.useRef(0);

  const load=React.useCallback(async(selected:string)=>{
    const version=++requestVersion.current;
    setPhase('loading'); setError(null);
    try {
      const result=await fetchPublishedListingsCatalog(selected);
      if(version!==requestVersion.current)return;
      setPage(result); setPhase('ready');
    }
    catch(e){
      if(version!==requestVersion.current)return;
      setError(e instanceof Error?e.message:'İlanlar yüklenemedi'); setPhase('error');
    }
  },[]);

  React.useEffect(()=>{ void load(country); },[country,load]);
  React.useEffect(()=>{
    if(readCountryQuery(window.location.search)||window.localStorage.getItem(STORAGE_KEY)||accountCountries.length||/-[A-Z]{2}$/i.test(navigator.language))return;
    void fetch('/api/visitor-context').then(r=>r.ok?r.json():null).then(data=>{
      if(data?.countryCode)setCountryState(resolveListingCountry({urlCountry:null,browserCountry:null,accountCountries:[],locale:navigator.language,cloudflareCountry:data.countryCode}));
    }).catch(()=>undefined);
  },[accountCountries.join('|')]);
  React.useEffect(()=>{
    if(readCountryQuery(window.location.search)||window.localStorage.getItem(STORAGE_KEY)||!accountCountries.length)return;
    setCountryState(initial());
  },[accountCountries.join('|')]);
  React.useEffect(()=>{
    const onPop=()=>setCountryState(initial());
    window.addEventListener('popstate',onPop);
    return()=>window.removeEventListener('popstate',onPop);
  },[accountCountries.join('|')]);

  const setCountry=(value:string)=>{
    const selected=value==='all'||value==='remote'?value:normalizeCountryCode(value);
    if(!selected)return;
    window.localStorage.setItem(STORAGE_KEY,selected);
    window.history.pushState({},'',writeCountryQuery(window.location.pathname,window.location.search,selected));
    setCountryState(selected);
  };
  const loadMore=async()=>{
    if(!page?.hasMore||!page.nextCursor)return;
    const selectedCountry=country;
    const version=requestVersion.current;
    try{
      const next=await fetchPublishedListingsCatalog(selectedCountry,page.nextCursor,page.snapshot);
      if(version!==requestVersion.current||selectedCountry!==country)return;
      setPage(current=>current?{...next,listings:[...current.listings,...next.listings]}:next);
    }catch(e){setError(e instanceof Error?e.message:'Daha fazla ilan yüklenemedi');}
  };
  return {country,setCountry,phase,error,page,loadMore,retry:()=>load(country)};
}
