import * as React from 'react';

/**
 * ÖN RENDER YEDEĞİ — gecikmeli yüklemenin ekranı boşaltmasını engelliyor.
 *
 * SORUN
 * -----
 * `scripts/onrender.mjs` her adres için `#root` içine gerçek içeriği
 * basıyor: tarayıcı bunu JavaScript inmeden çiziyor. Ama `createRoot`
 * ilk çizimde kabı TEMİZLİYOR. Bir rota gecikmeli yükleniyorsa
 * (`React.lazy`) parça inene kadar ekranda hiçbir şey kalmıyor — yani ön
 * render'ın kazandırdığı şeyi geri vermiş oluyoruz.
 *
 * Bu yüzden rehber, bölüm ve araç sayfaları bugüne kadar bilerek
 * gecikmeli DEĞİLDİ. Bedeli ağırdı: `src/data/bolumler.ts` (205 KB) ve
 * `src/data/rehberler.tsx` + `rehber-yazilari/*` (≈310 KB) ana pakette
 * duruyordu ve anasayfayı açan herkes onları indiriyordu.
 *
 * ÇÖZÜM
 * -----
 * Ön render edilen HTML, React devreye girmeden ÖNCE buraya kopyalanıyor.
 * Gecikmeli bir rota beklerken `Suspense` yedeği olarak aynı HTML geri
 * çiziliyor. Kullanıcı açısından hiçbir şey kaybolmuyor: parça inene
 * kadar ekranda ön render edilen sayfanın kendisi duruyor.
 *
 * NEDEN MODÜL GÖVDESİNDE
 * ----------------------
 * Kopyalama import anında yapılıyor. `main.tsx` içindeki `createRoot`
 * bütün importlar değerlendirildikten SONRA çalıştığı için kopya her
 * zaman kabın temizlenmesinden önce alınıyor. Bir `useEffect` içinde
 * yapılsaydı geç kalırdı.
 */

/** Ön render edilen `#root` içeriği; ilk çizimden önce alınan kopya. */
const ILK_ICERIK: string =
  typeof document === 'undefined' ? '' : (document.getElementById('root')?.innerHTML ?? '');

/**
 * Kopyanın ALINDIĞI adres.
 *
 * Kopya yalnız bu adres için doğru. Ziyaretçi anasayfadan /bolum/x'e
 * geçtiğinde parça inerken anasayfanın kopyasını göstermek, yanlış
 * sayfayı göstermek olurdu.
 */
const ILK_YOL: string = typeof location === 'undefined' ? '' : location.pathname;

/**
 * Yedek gerçekten içerik taşıyor mu?
 *
 * Ön render edilmemiş bir adreste `#root` yalnız açılış iskeletini
 * taşıyor. İskeleti `Suspense` yedeği olarak geri çizmek, nabız atan gri
 * kutuları ikinci kez göstermek olurdu; o durumda hiçbir şey çizmemek
 * daha dürüst.
 */
export const onRenderYedegiVar: boolean =
  ILK_ICERIK.length > 0 && /data-seo-prerender|data-onrender-govde/.test(ILK_ICERIK);

/**
 * Gecikmeli rota beklerken ön render edilen HTML.
 *
 * Yalnız kopyanın alındığı adreste çiziliyor; sonraki gezinmelerde
 * `null` dönüyor ve ekranda o ana kadar çizilmiş uygulama kalıyor
 * (React geçiş sırasında eski ağacı hemen atmıyor).
 *
 * `dangerouslySetInnerHTML` burada güvenli: içerik sunucudan gelen kendi
 * ön render çıktımız, kullanıcı girdisi değil ve zaten aynı belgede
 * çizilmiş durumda. Yeni bir kaynak eklenmiyor, var olan işaretleme
 * yerinde tutuluyor.
 */
export function OnRenderYedegi(): React.ReactElement | null {
  if (!onRenderYedegiVar) return null;
  if (typeof location !== 'undefined' && location.pathname !== ILK_YOL) return null;
  return <div aria-busy="true" dangerouslySetInnerHTML={{ __html: ILK_ICERIK }} />;
}
