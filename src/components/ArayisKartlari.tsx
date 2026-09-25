import React from 'react';
import { arayisiGuncelle } from '../lib/queries';

/**
 * İŞ ARIYORUM / STAJ ARIYORUM
 *
 * İki açık seçim. Açıldığında öğrenci, DOĞRULANMIŞ şirketlerin gördüğü
 * iki ayrı listeye giriyor; kapatıldığında anında düşüyor.
 *
 * DÜĞMENİN KENDİSİ RIZA — O YÜZDEN NE PAYLAŞILDIĞI YAZIYOR
 * -------------------------------------------------------
 * Ürün kararı şu: öğrenci düğmeyi açtığında profilinin paylaşılacağını
 * bilerek açıyor. Bu ancak neyin paylaşıldığı EKRANDA yazıyorsa
 * doğrudur. Bu yüzden kartta hangi alanların şirkete gideceği tek tek
 * sayılıyor ve küçük punto bir dipnot değil, düğmenin hemen yanında.
 *
 * NEDEN is_open_to_offers'IN YERİNE GEÇMİYOR
 * ------------------------------------------
 * O alan kayıtta VARSAYILAN açık geliyor: 22 öğrencinin 22'si "teklife
 * açık" görünüyor, yani kimse onu bilerek açmadı ve bir rıza kanıtı
 * değil. Buradaki iki alan varsayılan KAPALI. Eskisi kaldırılmadı çünkü
 * başka yerlerde okunuyor; sessizce anlamını değiştirmek ona güvenen
 * kodu bozardı.
 */

const PAYLASILAN =
  'adın, e-postan, okul ve bölümün, sınıfın, şehrin, hedef rollerin ve CV yükleyip yüklemediğin';

/*
  METİN SOLDA, ANAHTAR SAĞDA (mobil sadeleştirme, 25 Eylül 2026)

  Solda açıkken maviye dönen büyük onay kutusu vardı ve sağdaki anahtarla
  AYNI durumu ikinci kez söylüyordu; kart da açıkken maviye boyanıyordu.
  Durumu artık yalnız anahtar taşıyor (`role="switch"`, `aria-checked`).
*/
const Anahtar: React.FC<{
  acik: boolean;
  bekliyor: boolean;
  baslik: string;
  aciklama: string;
  degistir: () => void;
}> = ({ acik, bekliyor, baslik, aciklama, degistir }) => (
  <button
    type="button"
    role="switch"
    onClick={degistir}
    disabled={bekliyor}
    aria-checked={acik}
    className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60"
  >
    <span className="min-w-0 flex-1">
      <span className="block text-base font-semibold leading-[22px] text-gray-900">{baslik}</span>
      <span className="mt-0.5 block text-sm leading-5 text-gray-600">{aciklama}</span>
    </span>
    <span
      aria-hidden
      className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${
        acik ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          acik ? 'translate-x-5' : ''
        }`}
      />
    </span>
  </button>
);

export const ArayisKartlari: React.FC<{
  ogrenciId: string;
  isArayan: boolean;
  stajArayan: boolean;
  onDegisti: (yeni: { isArayan: boolean; stajArayan: boolean }) => void;
}> = ({ ogrenciId, isArayan, stajArayan, onDegisti }) => {
  const [bekliyor, setBekliyor] = React.useState<'is' | 'staj' | null>(null);
  const [hata, setHata] = React.useState<string | null>(null);

  const degistir = async (hangi: 'is' | 'staj') => {
    const yeni = {
      isArayan: hangi === 'is' ? !isArayan : isArayan,
      stajArayan: hangi === 'staj' ? !stajArayan : stajArayan,
    };
    setBekliyor(hangi);
    setHata(null);
    try {
      await arayisiGuncelle(ogrenciId, yeni);
      onDegisti(yeni);
    } catch {
      /*
        Başarısızlıkta anahtar ESKİ HÂLİNDE kalıyor ve sebep yazılıyor.
        İyimser çevirip sessizce geri almak, öğrencinin listede olduğunu
        sanmasına yol açardı — burada yanılmak pahalı.
      */
      setHata('Kaydedilemedi. Bağlantını kontrol edip tekrar dene.');
    } finally {
      setBekliyor(null);
    }
  };

  const acikVar = isArayan || stajArayan;

  return (
    /* `pt-4`: telefonda profil kartı kenarsız; başlık üstteki çizgiye yapışmasın. */
    <section className="space-y-2 pt-4 sm:pt-0" aria-label="Arayış durumu">
      <h2 className="px-1 text-xl font-extrabold leading-[26px] tracking-tight text-gray-900">
        Ne arıyorsun?
      </h2>

      <Anahtar
        acik={stajArayan}
        bekliyor={bekliyor === 'staj'}
        baslik="Staj arıyorum"
        aciklama="Staj arayan öğrenciler listesinde görünürsün."
        degistir={() => void degistir('staj')}
      />

      <Anahtar
        acik={isArayan}
        bekliyor={bekliyor === 'is'}
        baslik="İş arıyorum"
        aciklama="İş arayan öğrenciler listesinde görünürsün."
        degistir={() => void degistir('is')}
      />

      {hata && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {hata}
        </p>
      )}

      {/*
        NE PAYLAŞILDIĞI HER ZAMAN YAZIYOR — yalnız açıkken değil.
        Kapalıyken de yazması, öğrencinin açmadan önce ne olacağını
        bilmesini sağlıyor; rıza ancak o zaman bilgilendirilmiş olur.
      */}
      {/* 12/16 yerine 14/20 ve daha koyu gri: rıza metni dipnot gibi okunmasın (25 Eylül 2026). */}
      <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-5 text-gray-700">
        {acikVar ? 'Şu an' : 'Açarsan'} yalnızca <strong>StajımVar’ın doğruladığı
        şirketler</strong> seni ilgili listede görebilir ve {PAYLASILAN} onlara
        görünür. İstediğin an kapatabilirsin; kapattığın anda listeden düşersin.
      </p>
    </section>
  );
};
