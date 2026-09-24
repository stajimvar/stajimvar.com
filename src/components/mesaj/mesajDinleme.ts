import React from 'react';
import { ortakAbone } from '../../lib/ortak-abonelik.mjs';
import {
  gelenKutusunuDinle,
  mesajSayaclariniGetir,
  sohbetiDinle,
  type Mesaj,
  type MesajSayaclari,
} from '../../lib/queries/mesajlasma';

/*
  DİNLEME — HER ZAMAN ORTAK ABONELİKTEN

  Veri katmanının `gelenKutusunuDinle` ve `sohbetiDinle` fonksiyonları
  her çağrıda ayrı bir Realtime kanalı açıyor (ad artık abonelik başına
  tekil). Üst çubuk rozeti ile /mesajlar listesi aynı gelen kutusunu
  dinliyor; ortak abonelik ikisine TEK kanal açıyor ve trafiği yarıya
  indiriyor (gerekçe `lib/ortak-abonelik.mjs` başlığında). Arayüz iki
  fonksiyonu doğrudan çağırmıyor; yalnız bu dosyadaki sarmalayıcıları.
*/

/** Gelen kutusunda bir şey değişti (yeni mesaj, istek kabul/sil). Dönen fonksiyon dinleyiciyi çıkarır. */
export function gelenKutusunaAbone(degisti: () => void): () => void {
  return ortakAbone<null>('gelen-kutusu', (yayinla) => gelenKutusunuDinle(() => yayinla(null)), () => degisti());
}

export type SohbetOlayi =
  | { tur: 'mesaj'; mesaj: Mesaj }
  | { tur: 'okuma'; profilId: string; an: string };

/** Tek bir sohbetin yeni mesaj ve okuma olayları. */
export function sohbeteAbone(sohbetId: string, olay: (o: SohbetOlayi) => void): () => void {
  return ortakAbone<SohbetOlayi>(
    `sohbet:${sohbetId}`,
    (yayinla) =>
      sohbetiDinle(sohbetId, {
        mesaj: (mesaj) => yayinla({ tur: 'mesaj', mesaj }),
        okuma: (profilId, an) => yayinla({ tur: 'okuma', profilId, an }),
      }),
    olay,
  );
}

/*
  YEREL DEĞİŞİKLİK — okundu işareti, kabul, silme

  Realtime yalnız `mesajlar` ve `sohbetler` tablolarını dinliyor; okundu
  işareti (`sohbet_okumalari`) gelen kutusu olayı ÜRETMİYOR. Sohbeti
  açıp okuyan kullanıcının rozeti bu yüzden bir sonraki olaya kadar eski
  kalırdı. Bu sekmede yapılan değişiklik bu olayla duyuruluyor; rozet ve
  liste sunucudan yeniden okuyor.
*/
const YEREL_OLAY = 'stajimvar:mesaj-kutusu';

export function yerelDegisiklikBildir(): void {
  window.dispatchEvent(new Event(YEREL_OLAY));
}

export function yerelDegisiklikleriDinle(degisti: () => void): () => void {
  window.addEventListener(YEREL_OLAY, degisti);
  return () => window.removeEventListener(YEREL_OLAY, degisti);
}

/**
 * Üst çubuk rozetinin sayıları.
 *
 * `null` = alınamadı ya da henüz gelmedi: rozet çizilmiyor, 0 UYDURULMUYOR.
 * Gelen kutusu değişince sunucudan YENİDEN okunuyor; olay yükünden sayı
 * hesaplanmıyor (okunmamış kuralı sunucuda, burada ikinci kopyası yok).
 * Sekme yeniden görünür olunca da tazeleniyor: arka plandayken kaçan bir
 * olay rozeti eski bırakmasın.
 */
export function useMesajSayaclari(etkin: boolean): MesajSayaclari | null {
  const [sayac, setSayac] = React.useState<MesajSayaclari | null>(null);
  React.useEffect(() => {
    if (!etkin) {
      setSayac(null);
      return;
    }
    let iptal = false;
    const oku = () => {
      void mesajSayaclariniGetir().then((s) => {
        if (!iptal) setSayac(s);
      });
    };
    oku();
    const birak = gelenKutusunaAbone(oku);
    const yerelBirak = yerelDegisiklikleriDinle(oku);
    const gorunurluk = () => {
      if (document.visibilityState === 'visible') oku();
    };
    document.addEventListener('visibilitychange', gorunurluk);
    return () => {
      iptal = true;
      birak();
      yerelBirak();
      document.removeEventListener('visibilitychange', gorunurluk);
    };
  }, [etkin]);
  return sayac;
}
