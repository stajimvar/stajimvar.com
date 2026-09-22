import React from 'react';
import { Briefcase, Check, GraduationCap } from 'lucide-react';
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

const Anahtar: React.FC<{
  acik: boolean;
  bekliyor: boolean;
  baslik: string;
  aciklama: string;
  ikon: React.ReactNode;
  degistir: () => void;
}> = ({ acik, bekliyor, baslik, aciklama, ikon, degistir }) => (
  <button
    type="button"
    onClick={degistir}
    disabled={bekliyor}
    aria-pressed={acik}
    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 ${
      acik
        ? 'border-blue-300 bg-blue-50'
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}
  >
    <span
      aria-hidden
      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
        acik ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {acik ? <Check className="h-4 w-4" /> : ikon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-gray-900">{baslik}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-gray-600">{aciklama}</span>
    </span>
    <span
      aria-hidden
      className={`mt-1 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
        acik ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-white transition-transform ${
          acik ? 'translate-x-4' : ''
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
    <section className="space-y-2" aria-label="Arayış durumu">
      <h2 className="px-1 text-base font-extrabold tracking-tight text-gray-900">
        Ne arıyorsun?
      </h2>

      <Anahtar
        acik={stajArayan}
        bekliyor={bekliyor === 'staj'}
        baslik="Staj arıyorum"
        aciklama="Staj arayan öğrenciler listesinde görünürsün."
        ikon={<GraduationCap className="h-4 w-4" />}
        degistir={() => void degistir('staj')}
      />

      <Anahtar
        acik={isArayan}
        bekliyor={bekliyor === 'is'}
        baslik="İş arıyorum"
        aciklama="İş arayan öğrenciler listesinde görünürsün."
        ikon={<Briefcase className="h-4 w-4" />}
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
      <p className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-gray-600">
        {acikVar ? 'Şu an' : 'Açarsan'} yalnızca <strong>StajımVar’ın doğruladığı
        şirketler</strong> seni ilgili listede görebilir ve {PAYLASILAN} onlara
        görünür. İstediğin an kapatabilirsin; kapattığın anda listeden düşersin.
      </p>
    </section>
  );
};
