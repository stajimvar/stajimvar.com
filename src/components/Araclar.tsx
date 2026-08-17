import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Calculator,
  CalendarDays,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import {
  SINAV_DAGILIMI,
  YERLESTIRME_DAGILIMI,
  PUAN_TURU_ADI,
  YKS_KAYNAK,
  siralamaTahmin,
  TEST_ORTALAMALARI,
  type PuanTuru,
} from '../data/yks2025';

/**
 * Hesaplama araçları.
 *
 * NEDEN BU ÜÇÜ
 * ------------
 * Kariyer.net'te maaş hesaplama, YKS puan hesaplama, KPSS puan hesaplama gibi
 * araçlar var ve siteye en çok trafiği bunlar getiriyor: kimse rehber okumak
 * için arama yapmıyor, "kaç net yaptım" diye arama yapıyor.
 *
 * Buradaki üç araç da bir öğrencinin gerçekten hesap makinesi açıp yaptığı iş:
 *   1. Net hesaplama      — sınavdan çıkınca ilk yapılan şey
 *   2. Staj ücreti        — "bana ne kadar ödenmesi gerekiyor?"
 *   3. Staj günü sayacı   — "20 iş günü ne zaman biter?"
 *
 * NEYİ HESAPLAMIYORUZ, NEDEN
 * --------------------------
 * Net'ten puana ve sıralamaya geçiş YAPILMIYOR. O dönüşüm ÖSYM'nin o yıla ait
 * istatistiklerine bağlı; sabit bir katsayıyla üretilen "tahmini sıralama"
 * bir öğrencinin tercih kararını yanlış yönlendirir. Net hesabı matematiktir
 * ve her yıl aynıdır — onu yapıyoruz, gerisi için ÖSYM'ye yönlendiriyoruz.
 *
 * Aynı sebeple staj ücreti aracında asgari ücret ve oran SABİT YAZILMIYOR;
 * kullanıcıdan alınıyor. Böylece araç seneye de doğru çalışıyor.
 */

/**
 * Ortak kabuk kullaniliyor: baslik cubugu ana sayfayla ayni genislikte,
 * logo hep sol ust kosede. Ayrintisi SayfaKabugu.tsx icinde.
 */
const Kabuk: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({
  onBack,
  children,
}) => <SayfaKabugu onBack={onBack}>{children}</SayfaKabugu>;

const Uyari: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
    {children}
  </div>
);

const Alan: React.FC<{
  etiket: string;
  ipucu?: string;
  children: React.ReactNode;
}> = ({ etiket, ipucu, children }) => (
  <label className="block space-y-1">
    <span className="block text-sm font-semibold text-gray-700">{etiket}</span>
    {children}
    {ipucu && <span className="block text-xs text-gray-400">{ipucu}</span>}
  </label>
);

const girdiSinifi =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';

/* ==================================================================== hub */

export const ARACLAR = [
  {
    slug: 'net-hesaplama',
    baslik: 'Net hesaplama',
    ozet: 'TYT, AYT ve KPSS — doğru ve yanlış sayısından net.',
    ikon: Calculator,
  },
  {
    slug: 'siralama-tahmini',
    baslik: 'Sıralama tahmini',
    ozet: 'Puanın 2025 verilerine göre kaçıncı sıraya denk geliyor.',
    ikon: TrendingUp,
  },
  {
    slug: 'staj-ucreti-hesaplama',
    baslik: 'Staj ücreti hesaplama',
    ozet: 'Sana en az ne kadar ödenmesi gerektiğini hesapla.',
    ikon: Wallet,
  },
  {
    slug: 'staj-gunu-hesaplama',
    baslik: 'Staj günü hesaplama',
    ozet: '20 veya 30 iş günü hangi tarihte biter?',
    ikon: CalendarDays,
  },
];

interface HubProps {
  onBack: () => void;
  onNavigate: (path: string) => void;
}

export const AracHub: React.FC<HubProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Hesaplama araçları | StajımVar';
  }, []);

  return (
    <Kabuk onBack={onBack}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Hesaplama araçları
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Kısa hesaplar. Hepsi tarayıcında çalışıyor; girdiğin hiçbir bilgi bize
            gönderilmiyor.
          </p>
        </div>

        <ul className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {ARACLAR.map((a) => {
            const Ikon = a.ikon;
            return (
              <li key={a.slug} className="border-b border-gray-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onNavigate(`/araclar/${a.slug}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left cursor-pointer hover:bg-blue-50/60 transition-colors"
                >
                  <span className="w-9 h-9 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Ikon className="w-4.5 h-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-gray-900">{a.baslik}</span>
                    <span className="block text-sm text-gray-500">{a.ozet}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 shrink-0 text-gray-300" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Kabuk>
  );
};

/* ========================================================= net hesaplama */

interface Ders {
  ad: string;
  soru: number;
}

const SINAVLAR: Record<string, { ad: string; dersler: Ders[]; not: string }> = {
  tyt: {
    ad: 'TYT',
    dersler: [
      { ad: 'Türkçe', soru: 40 },
      { ad: 'Sosyal Bilimler', soru: 20 },
      { ad: 'Temel Matematik', soru: 40 },
      { ad: 'Fen Bilimleri', soru: 20 },
    ],
    not: 'TYT 120 sorudan oluşuyor.',
  },
  ayt_say: {
    ad: 'AYT — Sayısal',
    dersler: [
      { ad: 'Matematik', soru: 40 },
      { ad: 'Fizik', soru: 14 },
      { ad: 'Kimya', soru: 13 },
      { ad: 'Biyoloji', soru: 13 },
    ],
    not: 'Sayısal puan türü için çözülen testler.',
  },
  ayt_ea: {
    ad: 'AYT — Eşit Ağırlık',
    dersler: [
      { ad: 'Matematik', soru: 40 },
      { ad: 'Türk Dili ve Edebiyatı', soru: 24 },
      { ad: 'Tarih-1', soru: 10 },
      { ad: 'Coğrafya-1', soru: 6 },
    ],
    not: 'Eşit ağırlık puan türü için çözülen testler.',
  },
  ayt_soz: {
    ad: 'AYT — Sözel',
    dersler: [
      { ad: 'Türk Dili ve Edebiyatı', soru: 24 },
      { ad: 'Tarih-1', soru: 10 },
      { ad: 'Coğrafya-1', soru: 6 },
      { ad: 'Tarih-2', soru: 11 },
      { ad: 'Coğrafya-2', soru: 11 },
      { ad: 'Felsefe Grubu', soru: 12 },
      { ad: 'Din Kültürü', soru: 6 },
    ],
    not: 'Sözel puan türü için çözülen testler.',
  },
  kpss_lisans: {
    ad: 'KPSS Lisans',
    dersler: [
      { ad: 'Genel Yetenek', soru: 60 },
      { ad: 'Genel Kültür', soru: 60 },
    ],
    not: 'Alan sınavları ve ÖABT bu hesaba dahil değil.',
  },
  kpss_onlisans: {
    ad: 'KPSS Önlisans',
    dersler: [
      { ad: 'Genel Yetenek', soru: 60 },
      { ad: 'Genel Kültür', soru: 60 },
    ],
    not: 'Önlisans oturumu.',
  },
};

interface AracProps {
  onBack: () => void;
  onNavigate: (path: string) => void;
}

export const NetHesaplama: React.FC<AracProps> = ({ onBack, onNavigate }) => {
  const [sinav, setSinav] = useState<string>('tyt');
  const [degerler, setDegerler] = useState<Record<string, { d: string; y: string }>>({});

  useEffect(() => {
    document.title = 'Net hesaplama (TYT, AYT, KPSS) | StajımVar';
  }, []);

  const secili = SINAVLAR[sinav];

  const netler = useMemo(() => {
    return secili.dersler.map((ders) => {
      const v = degerler[`${sinav}-${ders.ad}`] || { d: '', y: '' };
      const dogru = Math.max(0, Math.min(ders.soru, Number(v.d) || 0));
      const yanlis = Math.max(0, Math.min(ders.soru, Number(v.y) || 0));
      // Dört yanlış bir doğruyu götürür — bu kural her iki sınavda da aynı.
      const net = Math.max(0, dogru - yanlis / 4);
      const asim = dogru + yanlis > ders.soru;
      return { ders, dogru, yanlis, net, asim };
    });
  }, [degerler, sinav, secili]);

  const toplam = netler.reduce((t, n) => t + n.net, 0);
  const hataliVar = netler.some((n) => n.asim);

  // KPSS oturumlarının ÖSYM YKS tablosunda karşılığı yok; orada gösterilmiyor.
  const ortalamaKarsilastirmasi = netler
    .filter((n) => n.net > 0 && TEST_ORTALAMALARI[n.ders.ad])
    .map((n) => {
      const ist = TEST_ORTALAMALARI[n.ders.ad];
      return { ad: n.ders.ad, net: n.net, ortalama: ist.ortalama, fark: n.net - ist.ortalama };
    });

  const guncelle = (ders: string, alan: 'd' | 'y', deger: string) => {
    const anahtar = `${sinav}-${ders}`;
    setDegerler((o) => ({
      ...o,
      [anahtar]: { ...(o[anahtar] || { d: '', y: '' }), [alan]: deger.replace(/\D/g, '') },
    }));
  };

  return (
    <Kabuk onBack={onBack}>
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => onNavigate('/araclar')}
          className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Tüm araçlar
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Net hesaplama
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Doğru ve yanlış sayını gir, netini gör. Dört yanlış bir doğruyu götürüyor.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(SINAVLAR).map(([anahtar, s]) => (
            <button
              key={anahtar}
              type="button"
              onClick={() => setSinav(anahtar)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                sinav === anahtar
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {s.ad}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_5rem_5rem_4.5rem] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-400">
            <span>Ders</span>
            <span className="text-center">Doğru</span>
            <span className="text-center">Yanlış</span>
            <span className="text-right">Net</span>
          </div>
          {netler.map(({ ders, net, asim }) => {
            const v = degerler[`${sinav}-${ders.ad}`] || { d: '', y: '' };
            return (
              <div
                key={ders.ad}
                className="grid grid-cols-[1fr_5rem_5rem_4.5rem] gap-2 items-center px-4 py-2.5 border-b border-gray-100 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 truncate">
                    {ders.ad}
                  </span>
                  <span className="block text-xs text-gray-400">{ders.soru} soru</span>
                </span>
                <input
                  inputMode="numeric"
                  value={v.d}
                  onChange={(e) => guncelle(ders.ad, 'd', e.target.value)}
                  className={`${girdiSinifi} text-center px-2 py-2 ${
                    asim ? 'border-red-300 bg-red-50' : ''
                  }`}
                  placeholder="0"
                  aria-label={`${ders.ad} doğru`}
                />
                <input
                  inputMode="numeric"
                  value={v.y}
                  onChange={(e) => guncelle(ders.ad, 'y', e.target.value)}
                  className={`${girdiSinifi} text-center px-2 py-2 ${
                    asim ? 'border-red-300 bg-red-50' : ''
                  }`}
                  placeholder="0"
                  aria-label={`${ders.ad} yanlış`}
                />
                <span className="text-right font-bold text-gray-900 tabular-nums">
                  {net.toFixed(2)}
                </span>
              </div>
            );
          })}
          {/*
            Ülke ortalaması karşılaştırması.

            Net tek başına bir şey ifade etmiyor: "Temel Matematik 12 net" iyi
            mi kötü mü? 2025 ortalaması 6,01 — bunu görünce anlam kazanıyor.
            Sayılar ÖSYM'nin yayınladığı tablodan, tahmin değil.
          */}
          {ortalamaKarsilastirmasi.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {YKS_KAYNAK.yil} ülke ortalamasıyla
              </p>
              {ortalamaKarsilastirmasi.map((k) => (
                <p key={k.ad} className="text-sm text-gray-600">
                  {k.ad}: <strong className="text-gray-900">{k.net.toFixed(2)}</strong> net —
                  ortalama {k.ortalama.toFixed(2)}{' '}
                  <span
                    className={
                      k.fark >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-gray-400'
                    }
                  >
                    ({k.fark >= 0 ? '+' : ''}
                    {k.fark.toFixed(2)})
                  </span>
                </p>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-t border-blue-100">
            <span className="font-bold text-blue-900">Toplam net</span>
            <span className="text-xl font-extrabold text-blue-900 tabular-nums">
              {toplam.toFixed(2)}
            </span>
          </div>
        </div>

        {hataliVar && (
          <p className="text-sm font-semibold text-red-600">
            Bir derste doğru + yanlış toplamı soru sayısını geçiyor. Kırmızı alanları
            kontrol et.
          </p>
        )}

        <p className="text-sm text-gray-500">{secili.not}</p>

        <Uyari>
          <strong>Netten puan hesaplamıyoruz.</strong> ÖSYM puanı iki aşamalı
          standartlaştırmayla üretiyor ve ikinci aşamadaki dağılım bilgisini yayınlamıyor;
          o sayı olmadan netten puana geçiş ancak uydurma bir katsayıyla yapılır. Puanın
          elindeyse sıralamanı gerçek ÖSYM tablosundan öğrenebilirsin.
        </Uyari>

        <button
          type="button"
          onClick={() => onNavigate('/araclar/siralama-tahmini')}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
        >
          <TrendingUp className="w-4 h-4" />
          Puanım kaçıncı sıraya denk geliyor?
        </button>
      </div>
    </Kabuk>
  );
};

/* ====================================================== sıralama tahmini */

export const SiralamaTahmini: React.FC<AracProps> = ({ onBack, onNavigate }) => {
  const [tur, setTur] = useState<PuanTuru>('SAY');
  const [puan, setPuan] = useState('');
  const [yerlestirme, setYerlestirme] = useState(true);

  useEffect(() => {
    document.title = 'YKS sıralama tahmini | StajımVar';
  }, []);

  const sayi = Number(puan.replace(',', '.'));
  const sonuc = useMemo(() => {
    if (!puan.trim() || !Number.isFinite(sayi)) return null;
    return siralamaTahmin(sayi, tur, yerlestirme ? YERLESTIRME_DAGILIMI : SINAV_DAGILIMI);
  }, [puan, sayi, tur, yerlestirme]);

  const bicim = (n: number) => n.toLocaleString('tr-TR');

  return (
    <Kabuk onBack={onBack}>
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => onNavigate('/araclar')}
          className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Tüm araçlar
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Sıralama tahmini
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Puanını gir, <strong>{YKS_KAYNAK.yil}</strong> yılında bu puanın kaçıncı sıraya
            denk geldiğini gör. Hesap, ÖSYM'nin yayınladığı resmî yığınsal dağılım
            tablosundan yapılıyor.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4">
          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">Puan türü</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PUAN_TURU_ADI) as PuanTuru[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTur(t)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                    tur === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {PUAN_TURU_ADI[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">Puan tipi</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setYerlestirme(true)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                  yerlestirme
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                Yerleştirme puanı
              </button>
              <button
                type="button"
                onClick={() => setYerlestirme(false)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                  !yerlestirme
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                Sınav puanı
              </button>
            </div>
            <span className="block text-xs text-gray-400">
              Yerleştirme puanı okul başarı puanın (OBP) eklenmiş hâli — tercihte kullanılan
              puan budur.
            </span>
          </div>

          <Alan etiket="Puanın">
            <input
              inputMode="decimal"
              value={puan}
              onChange={(e) => setPuan(e.target.value.replace(/[^\d.,]/g, ''))}
              className={girdiSinifi}
              placeholder="örn. 425,318"
            />
          </Alan>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-1">
          <p className="text-sm font-semibold text-blue-900/80">
            {YKS_KAYNAK.yil}'te yaklaşık sıralaman
          </p>
          <p className="text-3xl font-extrabold text-blue-900 tabular-nums">
            {sonuc ? bicim(sonuc.siralama) : '—'}
          </p>
          {sonuc && (
            <p className="text-sm text-blue-900/80">
              {PUAN_TURU_ADI[tur]} puan türünde {bicim(sonuc.toplamAday)} aday arasından
              {sonuc.sinirDisi === 'ust' && ' — tablonun en üst basamağının da üstündesin'}
              {sonuc.sinirDisi === 'alt' && ' — tablonun kapsadığı en alt basamağın altında'}
            </p>
          )}
        </div>

        <Uyari>
          <strong>Bu bir tahmin, garanti değil.</strong> Gösterilen sayı, girdiğin puanın{' '}
          {YKS_KAYNAK.yil} sınavında kaçıncı sıraya denk geldiğidir — bu yılki yerin değil.
          Sınavın zorluğu ve aday sayısı her yıl değiştiği için sıralama kayıyor. Tablo 20
          puanlık basamaklarla yayınlandığı için ara değerler hesaplanarak bulunuyor.
        </Uyari>

        <p className="text-xs text-gray-400 leading-relaxed">
          Kaynak:{' '}
          <a
            href={YKS_KAYNAK.url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold underline"
          >
            ÖSYM — {YKS_KAYNAK.baslik}
          </a>
          . Sayılar bu belgeden olduğu gibi alınmıştır.
        </p>
      </div>
    </Kabuk>
  );
};

/* ================================================= staj ücreti hesaplama */

export const StajUcretiHesaplama: React.FC<AracProps> = ({ onBack, onNavigate }) => {
  const [asgari, setAsgari] = useState('');
  const [buyuk, setBuyuk] = useState(false); // 20 ve üzeri personel
  const [oranKucuk, setOranKucuk] = useState('15');
  const [oranBuyuk, setOranBuyuk] = useState('30');

  useEffect(() => {
    document.title = 'Staj ücreti hesaplama | StajımVar';
  }, []);

  const asgariSayi = Number(asgari.replace(/[^\d]/g, '')) || 0;
  const oran = Number(buyuk ? oranBuyuk : oranKucuk) || 0;
  const sonuc = (asgariSayi * oran) / 100;

  const bicim = (n: number) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Kabuk onBack={onBack}>
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => onNavigate('/araclar')}
          className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Tüm araçlar
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Staj ücreti hesaplama
          </h1>
          <p className="text-gray-600 leading-relaxed">
            3308 sayılı Mesleki Eğitim Kanunu, işletmede mesleki eğitim gören ve staj yapan
            öğrenciye ödenecek ücret için bir <strong>alt sınır</strong> koyuyor: net asgari
            ücretin belirli bir yüzdesi. Bu oran, işletmenin çalışan sayısına göre değişiyor.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4">
          <Alan
            etiket="Net asgari ücret (TL)"
            ipucu="Güncel tutarı yaz. Her yıl değiştiği için sabit yazmıyoruz."
          >
            <input
              inputMode="numeric"
              value={asgari}
              onChange={(e) => setAsgari(e.target.value.replace(/[^\d]/g, ''))}
              className={girdiSinifi}
              placeholder="örn. 22000"
            />
          </Alan>

          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">
              İşletmenin çalışan sayısı
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBuyuk(false)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                  !buyuk
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                20'den az
              </button>
              <button
                type="button"
                onClick={() => setBuyuk(true)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                  buyuk
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                20 ve üzeri
              </button>
            </div>
          </div>

          {/*
            Oranlar da değişebiliyor (kanun ve bütçe düzenlemeleriyle). Sabit
            yazıp yanlış hesap ürettirmektense düzenlenebilir bıraktık.
          */}
          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="20'den az için oran (%)">
              <input
                inputMode="numeric"
                value={oranKucuk}
                onChange={(e) => setOranKucuk(e.target.value.replace(/[^\d]/g, ''))}
                className={girdiSinifi}
              />
            </Alan>
            <Alan etiket="20 ve üzeri için oran (%)">
              <input
                inputMode="numeric"
                value={oranBuyuk}
                onChange={(e) => setOranBuyuk(e.target.value.replace(/[^\d]/g, ''))}
                className={girdiSinifi}
              />
            </Alan>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Oranlar mevzuatla belirleniyor ve değişebiliyor. Değiştiyse buradan güncelleyip
            hesaplayabilirsin.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-1">
          <p className="text-sm font-semibold text-blue-900/80">
            Aylık en az ödenmesi gereken
          </p>
          <p className="text-3xl font-extrabold text-blue-900 tabular-nums">
            {asgariSayi > 0 ? `${bicim(sonuc)} TL` : '—'}
          </p>
          <p className="text-sm text-blue-900/80">
            Net asgari ücretin %{oran || 0}'i
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-2">
          <h2 className="font-bold text-gray-900">Bilmen gereken üç şey</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
            <li>
              Bu bir <strong>alt sınır</strong>. İşletme daha fazlasını ödeyebilir ve çoğu
              zaman ödüyor.
            </li>
            <li>
              Devletin bu ödemenin bir kısmını karşıladığı bir destek mekanizması var. Yani
              işletmenin cebinden çıkan tutar, hesapladığın rakamın tamamı olmayabiliyor —
              işverene bunu hatırlatmak işe yarıyor.
            </li>
            <li>
              Zorunlu stajda iş kazası ve meslek hastalığı sigortası genellikle okul
              tarafından yapılıyor. Bu, işletmenin en çok tereddüt ettiği konu.
            </li>
          </ul>
        </div>

        <Uyari>
          Bu araç bilgilendirme amaçlıdır, hukuki danışmanlık değildir. Oranlar ve destekler
          mevzuatla değişebiliyor; bağlayıcı bilgi için okulunun staj birimine ve{' '}
          <a
            href="https://www.sgk.gov.tr"
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold underline"
          >
            SGK
          </a>
          'ya danış.
        </Uyari>

        <button
          type="button"
          onClick={() => onNavigate('/rehber/zorunlu-staj-rehberi')}
          className="w-full px-5 py-3 rounded-2xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 cursor-pointer"
        >
          Zorunlu staj rehberini oku
        </button>
      </div>
    </Kabuk>
  );
};

/* =================================================== staj günü hesaplama */

/**
 * Sabit tarihli resmî tatiller. Dinî bayramlar kamerî takvime göre kaydığı
 * için buraya yazılmıyor; kullanıcı "ek tatil günü" alanından ekliyor.
 * Sabit yazsaydık bir sonraki yıl yanlış hesap üretirdi.
 */
const SABIT_TATILLER = [
  [1, 1],
  [4, 23],
  [5, 1],
  [5, 19],
  [7, 15],
  [8, 30],
  [10, 29],
];

export const StajGunuHesaplama: React.FC<AracProps> = ({ onBack, onNavigate }) => {
  const [baslangic, setBaslangic] = useState('');
  const [gunSayisi, setGunSayisi] = useState('20');
  const [cumartesi, setCumartesi] = useState(false);
  const [ekTatil, setEkTatil] = useState('0');

  useEffect(() => {
    document.title = 'Staj günü hesaplama | StajımVar';
  }, []);

  const sonuc = useMemo(() => {
    if (!baslangic) return null;
    const hedef = Number(gunSayisi) || 0;
    if (hedef < 1 || hedef > 400) return null;

    const ek = Math.max(0, Number(ekTatil) || 0);
    const gun = new Date(`${baslangic}T00:00:00`);
    if (Number.isNaN(gun.getTime())) return null;

    let sayilan = 0;
    let atlanan = 0;
    let ekKalan = ek;
    let guvenlik = 0;
    let sonGun = new Date(gun);

    while (sayilan < hedef && guvenlik < 2000) {
      guvenlik += 1;
      const haftaninGunu = gun.getDay(); // 0 pazar, 6 cumartesi
      const tatilMi =
        haftaninGunu === 0 ||
        (haftaninGunu === 6 && !cumartesi) ||
        SABIT_TATILLER.some(([ay, g]) => gun.getMonth() + 1 === ay && gun.getDate() === g);

      if (tatilMi) {
        atlanan += 1;
      } else if (ekKalan > 0) {
        // Kullanıcının bildirdiği ek tatiller ilk uygun iş günlerine düşürülüyor.
        ekKalan -= 1;
        atlanan += 1;
      } else {
        sayilan += 1;
        sonGun = new Date(gun);
      }
      if (sayilan < hedef) gun.setDate(gun.getDate() + 1);
    }

    if (sayilan < hedef) return null;

    const toplamTakvim =
      Math.round((sonGun.getTime() - new Date(`${baslangic}T00:00:00`).getTime()) / 86400000) + 1;

    return { bitis: sonGun, atlanan, toplamTakvim };
  }, [baslangic, gunSayisi, cumartesi, ekTatil]);

  const tarihYaz = (d: Date) =>
    d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });

  return (
    <Kabuk onBack={onBack}>
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => onNavigate('/araclar')}
          className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Tüm araçlar
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Staj günü hesaplama
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Okullar stajı takvim günü değil <strong>iş günü</strong> olarak istiyor.
            Başlangıç tarihini gir, stajın hangi tarihte biteceğini gör.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4">
          <Alan etiket="Başlangıç tarihi">
            <input
              type="date"
              value={baslangic}
              onChange={(e) => setBaslangic(e.target.value)}
              className={girdiSinifi}
            />
          </Alan>

          <Alan etiket="Kaç iş günü?" ipucu="Okulun istediği süre. Genellikle 20 veya 30.">
            <input
              inputMode="numeric"
              value={gunSayisi}
              onChange={(e) => setGunSayisi(e.target.value.replace(/\D/g, ''))}
              className={girdiSinifi}
            />
          </Alan>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={cumartesi}
              onChange={(e) => setCumartesi(e.target.checked)}
              className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-700">
              Cumartesi de çalışılıyor
            </span>
          </label>

          <Alan
            etiket="Dinî bayram ve idari tatil günü sayısı"
            ipucu="Ramazan ve Kurban Bayramı her yıl kaydığı için elle giriliyor. Staj sürene denk gelen tatil günü sayısını yaz."
          >
            <input
              inputMode="numeric"
              value={ekTatil}
              onChange={(e) => setEkTatil(e.target.value.replace(/\D/g, ''))}
              className={girdiSinifi}
            />
          </Alan>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-1">
          <p className="text-sm font-semibold text-blue-900/80">Stajın biteceği tarih</p>
          <p className="text-xl sm:text-2xl font-extrabold text-blue-900">
            {sonuc ? tarihYaz(sonuc.bitis) : '—'}
          </p>
          {sonuc && (
            <p className="text-sm text-blue-900/80">
              Toplam {sonuc.toplamTakvim} takvim günü · {sonuc.atlanan} gün çalışılmıyor
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-2">
          <h2 className="font-bold text-gray-900">Hesaba dahil olanlar</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
            <li>Pazar günleri her zaman hariç.</li>
            <li>Cumartesi, yukarıdaki kutuyu işaretlemediysen hariç.</li>
            <li>
              Sabit tarihli resmî tatiller hariç: 1 Ocak, 23 Nisan, 1 Mayıs, 19 Mayıs,
              15 Temmuz, 30 Ağustos, 29 Ekim.
            </li>
            <li>Dinî bayramlar her yıl kaydığı için senin girdiğin sayı kadar düşülüyor.</li>
          </ul>
        </div>

        <Uyari>
          Okullar arasında fark var: bazıları yarım günü tam gün sayıyor, bazıları
          cumartesiyi kabul etmiyor. Bu hesap yol göstermek için — kesin süreyi okulunun
          staj birimine onaylat.
        </Uyari>
      </div>
    </Kabuk>
  );
};
