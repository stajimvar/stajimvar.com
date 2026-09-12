import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
/*
  ÖN RENDER YEDEĞİ EN ÖNCE import EDİLİYOR.

  Modül gövdesi `#root` içeriğini kopyalıyor ve bu kopya `createRoot`
  kabı temizlemeden önce alınmak zorunda. Import sırası bu yüzden
  anlamlı: en üstte durması gerekiyor.
*/
import {OnRenderYedegi} from './lib/onrender-yedek.tsx';
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

      Yedek BOŞ DEĞİL, ÖN RENDER EDİLEN SAYFANIN KENDİSİ. Eskiden `null`
      idi ve gerekçesi "ön render'ın bastığı metin ekranda duruyor" idi —
      ama durmuyordu: `createRoot` ilk çizimde `#root`'u temizliyor, yani
      gecikmeli bir rota beklenirken ekran gerçekten boşalıyordu. Bu
      yüzden rehber, bölüm ve araç sayfaları gecikmeli yapılamıyor ve
      veri dosyaları (≈515 KB kaynak) ana pakette taşınıyordu.

      Yedek artık React devreye girmeden alınan kopyayı geri çiziyor:
      parça inene kadar kullanıcı ön render edilen sayfayı görmeye devam
      ediyor. Bkz. `lib/onrender-yedek.tsx`.
    */}
    <Suspense fallback={<OnRenderYedegi />}>
      <App />
    </Suspense>
  </StrictMode>,
);
