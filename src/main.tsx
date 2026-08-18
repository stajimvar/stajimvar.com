import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { adsenseBetiginiBaslat } from './components/GoogleAdBanner.tsx';
import { olcumuBaslat } from './lib/olcum.ts';
import './index.css';

/*
  AdSense betiği uygulama açılışında yükleniyor.

  Google'ın site doğrulaması sayfayı açıp betiği arıyor. Betik yalnızca bir
  reklam yuvası çizilirken yüklenirse — ki yuva kimlikleri ancak hesap
  onaylandıktan sonra alınıyor — doğrulama hiçbir zaman geçmiyor. Tavuk-yumurta.

  Yayıncı kimliği (`VITE_ADSENSE_CLIENT`) tanımlı değilse bu çağrı hiçbir şey
  yapmıyor; boşuna dış istek atılmıyor.
*/
adsenseBetiginiBaslat();

/*
  Cerezsiz ziyaret olcumu. Belirtec tanimli degilse hicbir sey yapmiyor;
  gerekcesi src/lib/olcum.ts basinda.
*/
olcumuBaslat();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      Gecikmeli yüklenen ekranlar için tek bir sınır.

      Yedek içerik bilerek BOŞ: ön render'ın bastığı metin ekranda duruyor ve
      araya bir yükleniyor göstergesi koymak onu silip yerine dönen bir daire
      koymak olurdu. Boş bırakınca kullanıcı mevcut içeriği görmeye devam
      ediyor, parça inince yerini alıyor.
    */}
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
);
