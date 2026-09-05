import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/*
  AdSense betiği uygulama açılışında yükleniyor.

  Google'ın site doğrulaması sayfayı açıp betiği arıyor. Betik yalnızca bir
  reklam yuvası çizilirken yüklenirse — ki yuva kimlikleri ancak hesap
  onaylandıktan sonra alınıyor — doğrulama hiçbir zaman geçmiyor. Tavuk-yumurta.

  Yayıncı kimliği (`VITE_ADSENSE_CLIENT`) tanımlı değilse bu çağrı hiçbir şey
  yapmıyor; boşuna dış istek atılmıyor.

  RIZA KAPISI — ÇAĞRI BURADAN KALKTI
  ----------------------------------
  Bu satır koşulsuzdu: ziyaretçi hiçbir şey seçmeden pagead2.googlesyndication.com
  isteği başlıyordu. Betiği yükleyip görünmez yapmak da yeterli değil; kural
  isteğin HİÇ BAŞLAMAMASI.

  Karar artık App'te, kayıtlı rızaya bakılarak veriliyor
  (lib/cerez-rizasi.mjs · reklamSerbest). Reddedildiyse ya da henüz
  sorulmadıysa çağrı yapılmıyor.

  AdSense site doğrulaması bu yüzden ancak rıza veren ziyaretçide geçebilir;
  doğrulamayı hızlandırmak için rıza almadan betik yüklemek, hukuki tarafı
  ürün tarafına feda etmek olurdu.
*/

/*
  ZIYARET OLCUMU BURADA DEGIL — CLOUDFLARE TARAFINDA.

  Once burada kendi beacon betigimizi yukleyen bir modul vardi. Olculdu:
  Cloudflare panelinden Web Analytics acilinca Cloudflare beacon'i ZATEN
  kendisi enjekte ediyor (sayfadaki betigin data-cf-beacon verisinde
  "version" ve "r" alanlari var; bizim kodumuz onlari yazmiyordu).

  Yani kendi betigimiz de yuklenseydi sayfada iki beacon olacakti ve her
  ziyaret iki kez sayilacakti. Kod kaldirildi; olcum Cloudflare panelinden
  yonetiliyor ve hicbir sir gerektirmiyor.

  DIKKAT: bu, sitenin Cloudflare uzerinden servis edilmesine bagli.
  Barindirma baska yere tasinirsa olcum sessizce durur.
*/

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
