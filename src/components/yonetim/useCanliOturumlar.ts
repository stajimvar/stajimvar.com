import React from 'react';
import { ilkOturumlar, oturumlariIlerlet, uretec } from '../../lib/yonetim-demo.mjs';

/**
 * CANLI OTURUM AKIŞI
 *
 * Birkaç saniyede bir oturumlar ilerliyor: kimisi çıkıyor, kimisi
 * sayfa değiştiriyor, yenileri giriyor. Panelin "şu an X kişi
 * bakıyor" sayacı buradan besleniyor.
 *
 * NEDEN TEK KANCA
 * ---------------
 * Özet sayfasındaki canlı şerit ile "Giren · bakan · çıkan" sayfası
 * AYNI akışı göstermeli. İki ayrı zamanlayıcı kursalardı iki ekran
 * farklı sayı gösterirdi ve kullanıcı hangisinin doğru olduğunu
 * bilemezdi.
 *
 * SEKME ARKA PLANDAYKEN DURUYOR
 * -----------------------------
 * `visibilitychange` dinleniyor. Arka planda çalışmaya devam etseydi
 * kullanıcı sekmeye döndüğünde yüzlerce birikmiş olay görürdü ve
 * "şu an" ifadesi anlamını yitirirdi. Ayrıca boşuna işlemci yakardı.
 */

export interface CanliOturum {
  kimlik: string;
  tur: 'ogrenci' | 'sirket' | 'misafir';
  ad: string | null;
  sehir: string;
  yol: string;
  sayfaAdi: string;
  kaynak: string;
  cihaz: string;
  basladi: number;
  sayfaSayisi: number;
}

export interface CanliOlay {
  tur: 'girdi' | 'cikti' | 'sayfa';
  oturum: CanliOturum;
  an: number;
}

const OLAY_SINIRI = 60;

export function useCanliOturumlar(araSaniye = 4) {
  const [oturumlar, setOturumlar] = React.useState<CanliOturum[]>(() => ilkOturumlar(23));
  const [olaylar, setOlaylar] = React.useState<CanliOlay[]>([]);
  const [bugunGiren, setBugunGiren] = React.useState(412);
  const [bugunCikan, setBugunCikan] = React.useState(389);
  const [sayfaBakisi, setSayfaBakisi] = React.useState(1042);
  const [duraklatildi, setDuraklatildi] = React.useState(false);

  React.useEffect(() => {
    const degisti = () => setDuraklatildi(document.visibilityState !== 'visible');
    degisti();
    document.addEventListener('visibilitychange', degisti);
    return () => document.removeEventListener('visibilitychange', degisti);
  }, []);

  React.useEffect(() => {
    if (duraklatildi) return undefined;
    const zaman = window.setInterval(() => {
      const rnd = uretec(Date.now() & 0xffffffff);
      setOturumlar((onceki) => {
        const { oturumlar: yeni, olaylar: cikanOlaylar } = oturumlariIlerlet(onceki, rnd);
        if (cikanOlaylar.length) {
          setOlaylar((o) => [...cikanOlaylar.reverse(), ...o].slice(0, OLAY_SINIRI));
          const giren = cikanOlaylar.filter((x) => x.tur === 'girdi').length;
          const cikan = cikanOlaylar.filter((x) => x.tur === 'cikti').length;
          const sayfa = cikanOlaylar.filter((x) => x.tur !== 'cikti').length;
          if (giren) setBugunGiren((n) => n + giren);
          if (cikan) setBugunCikan((n) => n + cikan);
          if (sayfa) setSayfaBakisi((n) => n + sayfa);
        }
        return yeni;
      });
    }, araSaniye * 1000);
    return () => window.clearInterval(zaman);
  }, [araSaniye, duraklatildi]);

  return { oturumlar, olaylar, bugunGiren, bugunCikan, sayfaBakisi, duraklatildi };
}

/** Oturum türüne göre renk — öğrenci mavi, şirket turuncu, misafir gri. */
export const TUR_RENGI: Record<CanliOturum['tur'], { nokta: string; rozet: string; etiket: string }> = {
  ogrenci: { nokta: 'bg-blue-600', rozet: 'bg-blue-50 text-blue-700', etiket: 'Öğrenci' },
  sirket: { nokta: 'bg-orange-500', rozet: 'bg-orange-50 text-orange-700', etiket: 'Şirket' },
  misafir: { nokta: 'bg-gray-400', rozet: 'bg-gray-100 text-gray-600', etiket: 'Misafir' },
};

/**
 * Oturumun ekranda nasıl anılacağı.
 *
 * MİSAFİRDE AD YOK: şehir + sayfa ile anılıyor. Çerez tutulmadığı
 * için misafirin kim olduğu bilinmiyor ve bilinmemeli; ona bir takma
 * ad uydurmak, olmayan bir kimliği varmış gibi göstermek olurdu.
 */
export function oturumAdi(o: CanliOturum): string {
  if (o.ad) return o.ad;
  return `${o.sehir} · misafir`;
}
