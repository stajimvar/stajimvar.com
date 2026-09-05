import React from 'react';
import { Search, FileCheck2, Flag, ArrowRight } from 'lucide-react';

/**
 * Rehber girişindeki üç yol ve zorunlu staj kontrol listesi.
 *
 * NEDEN GEREKLİ
 * -------------
 * 71 yazı var ve giriş sayfası dev bir listeydi: konu çipleri, arama,
 * öne çıkanlar. Hepsi "hangi yazıyı okuyayım" sorusuna cevap veriyor ama
 * öğrencinin sorusu bu değil. Öğrencinin sorusu "ben şu an neredeyim ve
 * sıradaki adım ne".
 *
 * Staj üç aşamalı bir süreç: arıyorsun, kabul alıyorsun evrak çıkıyor,
 * bitiyor ve defter/geçiş sorunları başlıyor. Bu üç yol o üç ana karşılık
 * geliyor ve her biri gerçekten VAR OLAN yazılara bağlanıyor.
 *
 * ZORUNLU STAJ AYRI DURUYOR
 * -------------------------
 * Çünkü en çok arananı o ve sırası önemli: belge → sigorta → defter →
 * ücret. Öğrenci bu dördünü ayrı ayrı arıyor ve aralarındaki sırayı
 * bilmiyor; numaralı liste sırayı kendisi anlatıyor.
 *
 * BAĞLANTILAR GERÇEK
 * ------------------
 * Buradaki her slug repoda var (kontrol edildi). Var olmayan bir sayfaya
 * "yakında" diye bağlantı koymak, çalışmayan bir yol göstermek olur.
 */

type Adim = { etiket: string; yol: string };

const YOLLAR: {
  id: string;
  baslik: string;
  ozet: string;
  ikon: React.ReactNode;
  renk: string;
  adimlar: Adim[];
}[] = [
  {
    id: 'ariyorum',
    baslik: 'Stajı yeni arıyorum',
    ozet: 'Nereden başlanır, CV ve başvuru nasıl yazılır.',
    ikon: <Search className="h-4 w-4" />,
    renk: 'border-blue-200 bg-blue-50/60',
    adimlar: [
      { etiket: 'Staj nasıl bulunur', yol: '/rehber/staj-nasil-bulunur' },
      { etiket: 'Staj CV’si nasıl yazılır', yol: '/rehber/staj-cv-nasil-yazilir' },
      { etiket: 'Başvuru e-postası', yol: '/rehber/staj-basvuru-epostasi' },
      { etiket: 'Staj mülakatı', yol: '/rehber/staj-mulakati' },
    ],
  },
  {
    id: 'kabul',
    baslik: 'Kabul aldım, evrak var',
    ozet: 'Belgeler, sigorta ve okulun staj birimi.',
    ikon: <FileCheck2 className="h-4 w-4" />,
    renk: 'border-emerald-200 bg-emerald-50/60',
    adimlar: [
      { etiket: 'Gerekli belgeler', yol: '/rehber/staj-basvurusu-gerekli-belgeler' },
      { etiket: 'Sigortayı kim yapar', yol: '/rehber/staj-sigortasi-kim-yapar' },
      { etiket: 'Zorunlu staj rehberi', yol: '/rehber/zorunlu-staj-rehberi' },
      { etiket: 'Üniversite staj birimi', yol: '/rehber/universite-staj-birimi' },
    ],
  },
  {
    id: 'bitiyor',
    baslik: 'Staj bitiyor',
    ozet: 'Defter, değerlendirme ve işe geçiş.',
    ikon: <Flag className="h-4 w-4" />,
    renk: 'border-amber-200 bg-amber-50/60',
    adimlar: [
      { etiket: 'Staj defteri nasıl doldurulur', yol: '/rehber/staj-defteri-nasil-doldurulur' },
      { etiket: 'Stajyerin görev ve sorumlulukları', yol: '/rehber/stajyerin-gorev-ve-sorumluluklari' },
      { etiket: 'Stajdan işe geçiş', yol: '/rehber/stajdan-ise-gecis' },
      { etiket: 'Stajdan sonra iş teklifi', yol: '/rehber/stajdan-sonra-is-teklifi' },
    ],
  },
];

/* Sıra gerçekten önemli: belge olmadan sigorta, sigorta olmadan defter yürümüyor. */
const ZORUNLU_ADIMLAR: Adim[] = [
  { etiket: 'Belgeleri hazırla', yol: '/rehber/staj-basvurusu-gerekli-belgeler' },
  { etiket: 'Sigortayı çözüm', yol: '/rehber/staj-sigortasi-kim-yapar' },
  { etiket: 'Defteri doldur', yol: '/rehber/staj-defteri-nasil-doldurulur' },
  { etiket: 'Ücreti hesapla', yol: '/rehber/staj-ucreti-nasil-hesaplanir' },
];

/**
 * İç bağlantılar GERÇEK `<a href>`.
 *
 * Düğmeye bastırılan geçişi tarayıcı bağlantı saymıyor; rehber
 * sayfalarının birbirine sinyal taşıması için gerçek adres şart. Tıklama
 * yakalanıp tam sayfa yenilemesi engelleniyor (ctrl/cmd ile yeni sekme
 * dokunulmadan geçiyor).
 */
const Baglanti: React.FC<{
  yol: string;
  onNavigate: (y: string) => void;
  className?: string;
  children: React.ReactNode;
}> = ({ yol, onNavigate, className, children }) => (
  <a
    href={yol}
    onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onNavigate(yol);
    }}
    className={className}
  >
    {children}
  </a>
);

export const StajYollari: React.FC<{ onNavigate: (yol: string) => void }> = ({ onNavigate }) => (
  <section aria-label="Staj yolları" className="space-y-4">
    <div>
      <h2 className="text-lg font-bold text-gray-900">Şu an neredesin?</h2>
      <p className="mt-0.5 text-sm text-gray-600">
        Staj üç aşama: arıyorsun, kabul alıyorsun, bitiriyorsun. Hangisindeysen oradan başla.
      </p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {YOLLAR.map((y) => (
        <div key={y.id} className={`rounded-2xl border p-4 ${y.renk}`}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm">
              {y.ikon}
            </span>
            <h3 className="text-sm font-bold text-gray-900">{y.baslik}</h3>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{y.ozet}</p>
          <ul className="mt-3 space-y-1">
            {y.adimlar.map((a) => (
              <li key={a.yol}>
                <Baglanti
                  yol={a.yol}
                  onNavigate={onNavigate}
                  className="group flex items-center gap-1.5 rounded-lg py-1 text-xs font-semibold text-gray-800 hover:text-blue-700"
                >
                  <ArrowRight className="h-3 w-3 shrink-0 text-gray-400 group-hover:text-blue-600" />
                  <span className="min-w-0">{a.etiket}</span>
                </Baglanti>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    {/*
      ZORUNLU STAJ SIRASI

      Dört yazı zaten vardı ama aralarındaki SIRA hiçbir yerde yazmıyordu.
      Öğrenci "sigorta" diye arıyor, belgeleri atlamış oluyor. Numaralı
      liste sırayı kendisi anlatıyor.
    */}
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-900">Zorunlu staj: sırayla</h3>
      <p className="mt-0.5 text-xs text-gray-600">
        Dördü bu sırayla yürüyor; biri eksikse sonraki adım tıkanıyor.
      </p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ZORUNLU_ADIMLAR.map((a, i) => (
          <li key={a.yol}>
            <Baglanti
              yol={a.yol}
              onNavigate={onNavigate}
              className="flex h-full items-center gap-2.5 rounded-xl border border-gray-200 p-3 transition-colors hover:border-blue-500"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-extrabold text-gray-700">
                {i + 1}
              </span>
              <span className="min-w-0 text-xs font-semibold text-gray-900">{a.etiket}</span>
            </Baglanti>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
