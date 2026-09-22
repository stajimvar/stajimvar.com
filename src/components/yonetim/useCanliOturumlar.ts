import React from 'react';
import { fetchYonetimCanli, type CanliOlayKaydi, type CanliOturumKaydi } from '../../lib/queries';

/**
 * CANLI OTURUM AKIŞI — GERÇEK VERİ
 *
 * Sayılar `yonetim_canli()` RPC'sinden geliyor: sitede gezinen
 * tarayıcıların bıraktığı gerçek olaylardan. Önceden bu akış demo bir
 * üreteçten besleniyordu ve panelde "23 kişi bakıyor" yazıyordu; o sayı
 * uydurmaydı.
 *
 * "ŞU AN BAKIYOR" NE DEMEK
 * ------------------------
 * Son olayı beş dakika içinde olan ve o olay çıkış OLMAYAN oturumlar.
 * Tarayıcı çıkışta haber vermeye çalışıyor ama bu her zaman ulaşmıyor
 * (sekme çöker, telefon uygulamayı öldürür); bu yüzden sessizlik de
 * çıkış sayılıyor. Yalnız çıkış olayına güvenmek sayacı şişirirdi.
 *
 * NEDEN TEK KANCA
 * ---------------
 * Özet sayfasındaki canlı şerit ile "Giren · bakan · çıkan" sayfası AYNI
 * akışı göstermeli. İki ayrı zamanlayıcı iki ekranda farklı sayı
 * gösterirdi ve hangisinin doğru olduğu bilinemezdi.
 *
 * SEKME ARKA PLANDAYKEN DURUYOR
 * -----------------------------
 * Arka planda sorgu atmak boşuna yük; ayrıca "şu an" ifadesi sekmeye
 * dönüldüğünde güncellenmiş oluyor.
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
}

export interface CanliOlay {
  tur: 'girdi' | 'cikti' | 'sayfa' | 'basvuru';
  oturum: CanliOturum;
  an: number;
}

/**
 * Rol adı panelde renge dönüşüyor.
 *
 * Rolü bilinmeyen ya da giriş yapmamış herkes misafir: bilmediğimiz bir
 * kişiyi öğrenci saymak, olmayan bir bilgiyi varmış gibi göstermek olurdu.
 */
function turBul(rol: string | null | undefined): CanliOturum['tur'] {
  if (rol === 'company') return 'sirket';
  if (rol === 'student') return 'ogrenci';
  return 'misafir';
}

const oturumaCevir = (k: CanliOturumKaydi): CanliOturum => ({
  kimlik: k.kimlik,
  tur: turBul(k.rol),
  ad: k.ad,
  sehir: k.sehir || 'bilinmiyor',
  yol: k.yol,
  sayfaAdi: k.sayfaAdi || k.yol,
  kaynak: k.kaynak || 'doğrudan',
  cihaz: k.cihaz || 'bilinmiyor',
  basladi: new Date(k.basladi).getTime(),
});

const olayaCevir = (o: CanliOlayKaydi): CanliOlay => ({
  tur: o.tur,
  an: new Date(o.an).getTime(),
  oturum: {
    kimlik: `${o.an}-${o.sayfaAdi}`,
    tur: turBul(o.rol),
    ad: o.ad,
    sehir: o.sehir || 'bilinmiyor',
    yol: o.sayfaAdi,
    sayfaAdi: o.sayfaAdi,
    kaynak: o.kaynak || 'doğrudan',
    cihaz: o.cihaz || 'bilinmiyor',
    basladi: new Date(o.an).getTime(),
  },
});

export function useCanliOturumlar(araSaniye = 15) {
  const [oturumlar, setOturumlar] = React.useState<CanliOturum[]>([]);
  const [olaylar, setOlaylar] = React.useState<CanliOlay[]>([]);
  const [bugunGiren, setBugunGiren] = React.useState(0);
  const [bugunCikan, setBugunCikan] = React.useState(0);
  const [sayfaBakisi, setSayfaBakisi] = React.useState(0);
  const [duraklatildi, setDuraklatildi] = React.useState(false);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

  React.useEffect(() => {
    const degisti = () => setDuraklatildi(document.visibilityState !== 'visible');
    degisti();
    document.addEventListener('visibilitychange', degisti);
    return () => document.removeEventListener('visibilitychange', degisti);
  }, []);

  React.useEffect(() => {
    if (duraklatildi) return undefined;

    let iptal = false;
    const cek = () => {
      fetchYonetimCanli()
        .then((c) => {
          if (iptal) return;
          setOturumlar((c.oturumlar ?? []).map(oturumaCevir));
          setOlaylar((c.olaylar ?? []).map(olayaCevir));
          setBugunGiren(c.bugunGiren ?? 0);
          setBugunCikan(c.bugunCikan ?? 0);
          setSayfaBakisi(c.sayfaBakisi ?? 0);
          setDurum('hazir');
        })
        .catch(() => {
          if (!iptal) setDurum('hata');
        });
    };

    cek();
    const zaman = window.setInterval(cek, araSaniye * 1000);
    return () => {
      iptal = true;
      window.clearInterval(zaman);
    };
  }, [araSaniye, duraklatildi]);

  return { oturumlar, olaylar, bugunGiren, bugunCikan, sayfaBakisi, duraklatildi, durum };
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
 * MİSAFİRDE AD YOK: şehir + sayfa ile anılıyor. Çerez tutulmadığı için
 * misafirin kim olduğu bilinmiyor ve bilinmemeli; ona bir takma ad
 * uydurmak, olmayan bir kimliği varmış gibi göstermek olurdu.
 */
export function oturumAdi(o: CanliOturum): string {
  if (o.ad) return o.ad;
  return `${o.sehir} · misafir`;
}
