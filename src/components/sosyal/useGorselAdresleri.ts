import React from 'react';
import { gorselIndir } from '../../lib/queries/sosyal';

/**
 * DEPOLAMA YOLU → TARAYICI BELLEĞİNDEKİ GEÇİCİ ADRES
 *
 * NEDEN İMZALI ADRES DEĞİL — ÖLÇÜLDÜ
 * ----------------------------------
 * Yerel Storage'a HTTP ile soruldu: yetkili kullanıcı bir imza aldı,
 * sonra kaydın görünürlüğü değişti ve AYNI imza ömrü dolmadan tekrar
 * istendi.
 *
 *   değişiklik            eski imza   yetkili indirme
 *   arşivlendi                200           400
 *   bağlantı kaldırıldı       200           400
 *   engel eklendi             200           400
 *
 * İmza jetonu bir kez verildikten sonra RLS'i YENİDEN SORMUYOR; ömrü
 * (3600 sn) dolana kadar çalışıyor. Bu yüzden imza tamamen kalktı ve her
 * görsel `download()` ile, kullanıcının oturumundan geçerek iniyor.
 * Dönen Blob YALNIZ bu sekmenin belleğinde bir adrese bağlanıyor
 * (`URL.createObjectURL`); paylaşılabilir, kopyalanabilir bir adres
 * hiçbir yerde üretilmiyor.
 *
 * DÜRÜST SINIR: daha önce teslim edilmiş bir görüntü kullanıcının
 * cihazından geri alınamaz. İddia yalnız şu: YENİ istekler reddediliyor.
 *
 * N KART = N İNDİRME
 * ------------------
 * Toplu imza (`createSignedUrls`) tek istekle N adres üretiyordu ve
 * ölçümdeki açık tam oradaydı. Istek sayısını azaltmak için yetkiyi bir
 * kez sorup N dosyaya güvenmek, ızgaranın tamamını o tek ana bağlamak
 * demek. İndirmeler paralel gidiyor; sayıları kabul edilen bedel.
 *
 * ADRESLERİN ÖMRÜ
 * ---------------
 * Üretilen her adres bu effect'in KENDİ listesinde tutuluyor ve
 * temizlikte tek tek bırakılıyor: bileşen kalkınca da, yol listesi
 * değişince de. Bırakılmayan bir object URL sekme kapanana kadar Blob'u
 * bellekte tutar — bir profilde onlarca fotoğraf gezildiğinde bu sızıntı
 * birikir.
 *
 * BAŞARISIZ İNDİRME ADRES ÜRETMİYOR
 * ---------------------------------
 * `gorselIndir` yetkisiz ya da hatalı dalda null dönüyor; o yolda
 * `createObjectURL` HİÇ çağrılmıyor ve Map'e girmiyor. Çağıran taraf o
 * kare için "Görsel açılamadı" yazıyor — boş bir kutu, kırık görselden
 * farksız olurdu.
 */

export type GorselDurumu = 'yukleniyor' | 'hazir' | 'hata';

export interface GorselAdresleri {
  durum: GorselDurumu;
  /** yol → object URL. Alınamayan yol bu haritada HİÇ yok. */
  adresler: Map<string, string>;
}

/*
  Bağımlılık dizi kimliğine değil, yolların KENDİSİNE bakıyor.

  Çağıranların çoğu `paylasimlar.map(...)` ile her render'da yeni bir
  dizi üretiyor; dizinin kendisini bağımlılığa koymak her render'da
  yeniden indirme (ve her seferinde revoke edilen adresler yüzünden
  yanıp sönen görseller) demekti. Depolama yolunda satır sonu
  bulunmuyor, bu yüzden ayraç olarak güvenli.
*/
const AYRAC = '\n';

export function useGorselAdresleri(kova: string, yollar: string[]): GorselAdresleri {
  const anahtar = yollar.join(AYRAC);
  const [durum, setDurum] = React.useState<GorselDurumu>(
    yollar.length === 0 ? 'hazir' : 'yukleniyor',
  );
  const [adresler, setAdresler] = React.useState<Map<string, string>>(new Map());

  React.useEffect(() => {
    const liste = anahtar === '' ? [] : anahtar.split(AYRAC);
    if (liste.length === 0) {
      setAdresler(new Map());
      setDurum('hazir');
      return;
    }

    let iptal = false;
    /* Bu çalıştırmanın ürettiği adresler; temizlik tam olarak bunları bırakıyor. */
    const uretilen: string[] = [];
    /*
      Eski adresler bir kare bile gösterilmiyor: yol değiştiyse ekranda
      duran görsel artık başka bir kaydın görseli olurdu.
    */
    setAdresler(new Map());
    setDurum('yukleniyor');

    Promise.all(
      liste.map(async (yol): Promise<[string, string | null]> => {
        const blob = await gorselIndir(kova, yol);
        if (!blob || iptal) return [yol, null];
        const adres = URL.createObjectURL(blob);
        uretilen.push(adres);
        return [yol, adres];
      }),
    )
      .then((ciftler) => {
        if (iptal) return;
        const yeni = new Map<string, string>();
        for (const [yol, adres] of ciftler) if (adres) yeni.set(yol, adres);
        setAdresler(yeni);
        setDurum('hazir');
      })
      .catch(() => {
        /*
          Buraya ancak beklenmeyen bir istisna düşüyor: tek tek indirme
          hataları `gorselIndir` içinde null'a çevriliyor. "Alınamadı"
          ile "yok" ayrı cümleler olduğu için durum da ayrı.
        */
        if (!iptal) setDurum('hata');
      });

    return () => {
      iptal = true;
      for (const adres of uretilen) URL.revokeObjectURL(adres);
    };
  }, [kova, anahtar]);

  return { durum, adresler };
}
