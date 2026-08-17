import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { adsenseBetiginiBaslat } from './components/GoogleAdBanner.tsx';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
