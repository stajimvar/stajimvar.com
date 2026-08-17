import React, { useEffect } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { BolumIcerik } from './BolumIcerik';
import {
  BOLUMLER,
  BOLUM_GRUPLARI,
  GRUP_SIRASI,
  bolumBul,
  type Bolum,
} from '../data/bolumler';

/**
 * Bölüm listesi (/bolumler) ve tek bölüm sayfası (/bolum/<slug>).
 *
 * İkisi de `src/data/bolumler.ts` kaydından besleniyor. Bölüm eklemek için
 * burada hiçbir şey değişmiyor.
 *
 * SAYFANIN SONU İLAN ARAMASI
 * --------------------------
 * "Makine mühendisliği stajı" arayan kişi buraya düşüyor, metni okuyor ve
 * eğer sayfanın sonunda bir yol yoksa çıkıp gidiyor. Her bölüm sayfası ilan
 * listesine o bölümün kelimeleriyle bağlanıyor — okuduğu şeyin karşılığını
 * aynı sitede buluyor.
 */

/**
 * Ortak kabuk kullaniliyor: baslik cubugu ana sayfayla ayni genislikte,
 * logo hep sol ust kosede. Ayrintisi SayfaKabugu.tsx icinde.
 */
const Kabuk: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({
  onBack,
  children,
}) => <SayfaKabugu onBack={onBack}>{children}</SayfaKabugu>;

const Satir: React.FC<{ bolum: Bolum; onNavigate: (p: string) => void }> = ({
  bolum,
  onNavigate,
}) => (
  <li className="border-b border-gray-100 last:border-b-0">
    <button
      type="button"
      onClick={() => onNavigate(`/bolum/${bolum.slug}`)}
      className="w-full flex items-center gap-3 px-4 py-4 text-left cursor-pointer hover:bg-blue-50/60 transition-colors"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-gray-900">{bolum.ad}</span>
        <span className="block text-sm text-gray-500">{bolum.ozet}</span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 text-gray-300" />
    </button>
  </li>
);

/* --------------------------------------------------------------- liste */

interface HubProps {
  onBack: () => void;
  onNavigate: (path: string) => void;
}

/** Bölüm kartı. Liste satırının yerini aldı: geniş ekranda üçlü ızgara. */
const Kart: React.FC<{ bolum: Bolum; onNavigate: (p: string) => void }> = ({
  bolum,
  onNavigate,
}) => (
  <button
    type="button"
    onClick={() => onNavigate(`/bolum/${bolum.slug}`)}
    className="group flex flex-col gap-1.5 p-5 rounded-2xl bg-white border border-gray-200 text-left cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm h-full"
  >
    <span className="block font-bold text-gray-900 leading-snug">{bolum.ad}</span>
    <span className="block text-sm text-gray-500 leading-relaxed">{bolum.ozet}</span>
    <span className="mt-auto pt-3 flex items-center gap-1.5 text-xs font-bold text-blue-600">
      İncele
      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
  </button>
);

export const BolumHub: React.FC<HubProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Bölüme göre staj rehberi | StajımVar';
  }, []);

  return (
    /*
      Liste sayfası GENİŞ, bölüm sayfası DAR.

      Otuz dört bölüm dar bir sütunda alt alta dizilince sayfa uzuyor ve
      kişi kendi bölümünü bulmak için kaydırmak zorunda kalıyordu. Izgarada
      hepsi neredeyse tek ekranda görünüyor.
    */
    <SayfaKabugu onBack={onBack} icerikGenisligi="max-w-6xl">
      <div className="space-y-8">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            Bölüme göre staj
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Her bölümün stajı farklı bir yerde, farklı bir işle yapılıyor. Kendi bölümünü
            seç: nerede staj yapılır, stajyer gerçekte ne iş yapar, başvurmadan önce ne
            öğrenmen gerekir.
          </p>
        </div>

        {GRUP_SIRASI.map((grup) => {
          const liste = BOLUMLER.filter((b) => b.grup === grup);
          if (liste.length === 0) return null;
          return (
            <section key={grup} className="space-y-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold text-gray-900">{BOLUM_GRUPLARI[grup]}</h2>
                <span className="text-sm text-gray-400">{liste.length} bölüm</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {liste.map((b) => (
                  <Kart key={b.slug} bolum={b} onNavigate={onNavigate} />
                ))}
              </div>
            </section>
          );
        })}

        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
          Bölümün burada yok mu? Sürekli ekliyoruz. Hangi bölümü istediğini bize yazarsan
          sıraya alırız.
        </p>
      </div>
    </SayfaKabugu>
  );
};

/* ---------------------------------------------------------- tek bölüm */

interface SayfaProps {
  slug: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  /** İlan listesine arama terimiyle gitmek için. */
  onSearch?: (terim: string) => void;
}

export const BolumPage: React.FC<SayfaProps> = ({ slug, onBack, onNavigate, onSearch }) => {
  const bolum = bolumBul(slug);

  useEffect(() => {
    document.title = bolum
      ? `${bolum.ad} stajı | StajımVar`
      : 'Bölüm bulunamadı | StajımVar';
    if (bolum) {
      const etiket = document.querySelector('meta[name="description"]');
      if (etiket) etiket.setAttribute('content', bolum.aciklama);
    }
  }, [bolum]);

  if (!bolum) {
    return (
      <Kabuk onBack={onBack}>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
          <p className="font-bold text-gray-900">Bu bölüm bulunamadı</p>
          <button
            type="button"
            onClick={() => onNavigate('/bolumler')}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Tüm bölümler
          </button>
        </div>
      </Kabuk>
    );
  }

  const digerleri = BOLUMLER.filter((b) => b.slug !== bolum.slug && b.grup === bolum.grup);

  /*
    İÇERİK İÇİ BAĞLANTILARI YAKALA

    BolumIcerik yalnızca gerçek `<a href>` üretiyor; tarayıcı bağlantı
    saymak için bunu istiyor ve bu ağaç derleme sırasında Node tarafında da
    çiziliyor, orada onNavigate diye bir şey yok. Tıklamayı burada yakalayıp
    uygulama içi geçişe çeviriyoruz: işaretlemede gerçek bağlantı,
    kullanıcıda tam sayfa yenilenmesi yok.

    "/?q=..." ayrı ele alınıyor: ilan araması sayfa değiştirmek değil, ana
    sayfadaki arama kutusuna yazmak demek.
  */
  const baglantiyiYakala = (e: React.MouseEvent<HTMLDivElement>) => {
    const bag = (e.target as HTMLElement).closest('a');
    if (!bag) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (bag.target === '_blank') return;
    const adres = bag.getAttribute('href');
    if (!adres || !adres.startsWith('/')) return;
    e.preventDefault();
    const aramaEki = adres.match(/^\/\?q=(.*)$/);
    if (aramaEki && onSearch) onSearch(decodeURIComponent(aramaEki[1]));
    else onNavigate(adres);
  };

  return (
    <Kabuk onBack={onBack}>
      <article className="space-y-4">
        <button
          type="button"
          onClick={() => onNavigate('/bolumler')}
          className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Tüm bölümler
        </button>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          {bolum.ad} stajı
        </h1>

        {/* İçerik ön render ile ortak; ayrıntısı BolumIcerik.tsx içinde. */}
        <div onClick={baglantiyiYakala}>
          <BolumIcerik bolum={bolum} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('/rehber/staj-cv-nasil-yazilir')}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 cursor-pointer"
          >
            Staj CV'si nasıl yazılır
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/rehber/zorunlu-staj-rehberi')}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 cursor-pointer"
          >
            Zorunlu staj rehberi
          </button>
        </div>
      </article>

      {digerleri.length > 0 && (
        <section className="mt-10 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Aynı gruptaki diğer bölümler
          </h2>
          <ul className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {digerleri.map((b) => (
              <Satir key={b.slug} bolum={b} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>
      )}
    </Kabuk>
  );
};
