/**
 * İŞVEREN DİZİNİNİ TEK YERDEN OKUYAN KANCA
 *
 * Üç yüzey (dizin sayfası, boş sonuç ekranı, bölüm sayfası) aynı veriyi
 * gösteriyor ve aynı yerden alıyor. Kanca `src/lib/isveren-dizini.mjs`
 * sözleşmesini sarıyor; kendi durum hesabı YOK — ikinci bir şirket
 * listesi ya da ikinci bir "açık/kapalı" kararı üretmiyor.
 *
 * NEDEN AYRI DOSYA VE `.ts`
 * -------------------------
 * `isveren-dizini.mjs` ön render tarafından da içe aktarılıyor ve orada
 * React yok. Kancayı o dosyaya koymak, ön render ağacına React bağımlılığı
 * sokardı.
 *
 * TEK TOPLU İSTEK: `fetchIsverenKontrolleri` önbellekli ve sözü
 * paylaşıyor. İki yüzey aynı anda açıldığında ikinci istek çıkmıyor.
 */

import React from 'react';

import { STAJ_PROGRAMLARI } from '../data/stajProgramlari';
import { dizini, fetchIsverenKontrolleri } from './isveren-dizini.mjs';

export type IsverenKaydi = ReturnType<typeof dizini>[number];

/**
 * Ölçümle birleştirilmiş işveren dizini.
 *
 * `null` = ölçüm henüz gelmedi (ya da hiç gelmeyecek: ön render, ağ
 * hatası). Çağıran taraf o durumda durum satırlarını ÇİZMİYOR — "Henüz
 * kontrol edilmedi" basmak, ölçümü okuyamadığımız yerde ölçmemiş gibi
 * görünmek olurdu.
 */
export function useIsverenDizini(): IsverenKaydi[] | null {
  const [dizin, setDizin] = React.useState<IsverenKaydi[] | null>(null);

  React.useEffect(() => {
    let iptal = false;
    fetchIsverenKontrolleri()
      .then((kontroller) => {
        if (!iptal) setDizin(dizini(STAJ_PROGRAMLARI, kontroller));
      })
      .catch(() => {
        /* Ölçüm gelmezse editoryal dizin yine duruyor; durum yazılmıyor. */
      });
    return () => {
      iptal = true;
    };
  }, []);

  return dizin;
}
