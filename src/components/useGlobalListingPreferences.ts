import * as React from 'react';
import { fetchPublishedListingsCatalog, type PublishedListingsCatalogPage } from '../lib/queries';
import { ilkKatalogOku } from '../lib/ilk-katalog';
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
  /*
    AÇILIŞ TOHUMU: İLK EKRAN AĞI BEKLEMİYOR.

    Sayfa `loading` ile açılıp RPC dönene kadar iskelet gösteriyordu.
    Oysa aynı veri HTML'in içinde geliyor (bkz. lib/ilk-katalog.ts):
    ön render hattı onu zaten okumuş durumda. Tohum ziyaretçinin
    ülkesiyle eşleşiyorsa ilk çizimde ilanlar ekranda oluyor.

    Tohum yine de TAZE DEĞİL — HTML önbellekten gelmiş olabilir. Bu
    yüzden aşağıdaki `load` etkisi kaldırılmadı: sayfa açılır açılmaz
    gerçek çağrı yapılıyor ve sonuç yerine geçiyor. Fark: bu bekleme
    artık ekranın arkasında.
  */
  const tohum=React.useRef<PublishedListingsCatalogPage|null>(null);
  if(tohum.current===null)tohum.current=ilkKatalogOku(country);
  const [page,setPage]=React.useState<PublishedListingsCatalogPage|null>(tohum.current);
  const [phase,setPhase]=React.useState<'loading'|'ready'|'error'>(tohum.current?'ready':'loading');
  /* Ekrandaki sayfa HANGİ ülkeye ait; sayfa yoksa `null`. */
  const sayfaUlkesi=React.useRef<string|null>(tohum.current?country:null);
  const [error,setError]=React.useState<string|null>(null);
  const requestVersion=React.useRef(0);

  const load=React.useCallback(async(selected:string)=>{
    const version=++requestVersion.current;
    /*
      AYNI ÜLKEYİ TAZELERKEN ekran iskelete DÜŞMÜYOR.

      Tohumla açılan sayfa arka plan tazelemesi sırasında iskelete
      dönseydi, ziyaretçi ilanları görüp hemen kaybederdi — sıçramanın
      ta kendisi.

      BAŞKA BİR ÜLKEYE geçildiğinde ise ekrandaki liste siliniyor:
      Almanya seçilmişken Türkiye ilanlarını göstermeye devam etmek
      yanlış listeyi göstermek olurdu. O durumda eski davranış aynen
      sürüyor.
    */
    if(sayfaUlkesi.current!==selected){ setPage(null); sayfaUlkesi.current=null; setPhase('loading'); }
    setError(null);
    try {
      const result=await fetchPublishedListingsCatalog(selected);
      if(version!==requestVersion.current)return;
      setPage(result); sayfaUlkesi.current=selected; setPhase('ready');
    }
    catch(e){
      if(version!==requestVersion.current)return;
      setError(e instanceof Error?e.message:'İlanlar yüklenemedi');
      /*
        Tazeleme başarısızsa ekrandaki tohum sayfası KALIYOR. Eldeki
        gerçek ilanları silip hata ekranı çizmek, kullanıcıya elimizde
        olan bilgiyi vermemek olurdu. Hiç sayfa yoksa hata durumu
        eskisi gibi çiziliyor.
      */
      if(sayfaUlkesi.current===null)setPhase('error');
    }
  },[]);

  React.useEffect(()=>{ void load(country); },[country,load]);
  /* Ziyaretçi ülkesi (Cloudflare) artık varsayılanı değiştirmiyor: ilk ziyaret Türkiye. */
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
