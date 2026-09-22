import React from 'react';
import {
  Activity, BarChart3, Building2, ClipboardCheck, Compass, FileText,
  GraduationCap, LayoutDashboard, Menu, Radio, Send, Share2, X,
} from 'lucide-react';

/**
 * YÖNETİM PANELİ KABUĞU — sol sütun, mobilde çekmece.
 *
 * NEDEN AYNI MENÜ İKİ KEZ ÇİZİLMİYOR
 * ----------------------------------
 * Masaüstünde sabit sütun, mobilde çekmece — ama menü öğeleri TEK
 * yerde tanımlı (`SAYFALAR`). İki ayrı liste yazılsaydı biri
 * güncellenip öteki unutulur ve aynı panel iki farklı menü gösterirdi.
 *
 * DOKUNMA HEDEFİ
 * --------------
 * Bağlantılar `min-h-11` (44 piksel): mobilde parmakla isabet
 * ettirilebilir olması gerekiyor.
 */

export type YonetimSayfaKimlik =
  | 'ozet' | 'trafik' | 'canli' | 'ogrenciler' | 'ilanlar' | 'basvurular'
  | 'sirketler' | 'onay' | 'tarama' | 'kesfet' | 'bolum' | 'paylasim';

export const YONETIM_SAYFALARI: {
  kimlik: YonetimSayfaKimlik;
  etiket: string;
  ikon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  grup: 'olcum' | 'urun' | 'islem';
}[] = [
  { kimlik: 'ozet', etiket: 'Özet', ikon: LayoutDashboard, grup: 'olcum' },
  { kimlik: 'trafik', etiket: 'Trafik', ikon: BarChart3, grup: 'olcum' },
  { kimlik: 'canli', etiket: 'Giren · bakan · çıkan', ikon: Radio, grup: 'olcum' },
  { kimlik: 'ogrenciler', etiket: 'Öğrenciler', ikon: GraduationCap, grup: 'urun' },
  { kimlik: 'ilanlar', etiket: 'İlanlar', ikon: FileText, grup: 'urun' },
  { kimlik: 'basvurular', etiket: 'Başvurular', ikon: Send, grup: 'urun' },
  { kimlik: 'sirketler', etiket: 'Şirketler', ikon: Building2, grup: 'urun' },
  { kimlik: 'onay', etiket: 'Onay kuyrukları', ikon: ClipboardCheck, grup: 'islem' },
  { kimlik: 'tarama', etiket: 'Tarama', ikon: Activity, grup: 'islem' },
  { kimlik: 'kesfet', etiket: 'Keşfet arşivi', ikon: Compass, grup: 'islem' },
  { kimlik: 'bolum', etiket: 'Bölüm talepleri', ikon: GraduationCap, grup: 'islem' },
  { kimlik: 'paylasim', etiket: 'Gönderi paylaş', ikon: Share2, grup: 'islem' },
];

const GRUP_ADI: Record<string, string> = {
  olcum: 'Ölçüm',
  urun: 'Ürün',
  islem: 'İşlem',
};

const MenuIcerik: React.FC<{
  etkin: YonetimSayfaKimlik;
  sec: (k: YonetimSayfaKimlik) => void;
  onSiteyeDon: () => void;
}> = ({ etkin, sec, onSiteyeDon }) => (
  <nav className="flex h-full flex-col" aria-label="Yönetim menüsü">
    <div className="px-4 py-4">
      <p className="text-sm font-black text-gray-900">StajımVar</p>
      <p className="text-[11px] font-semibold text-gray-500">Yönetim paneli</p>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      {(['olcum', 'urun', 'islem'] as const).map((grup) => (
        <div key={grup} className="mb-3">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {GRUP_ADI[grup]}
          </p>
          <ul className="space-y-0.5">
            {YONETIM_SAYFALARI.filter((s) => s.grup === grup).map((s) => {
              const Ikon = s.ikon;
              const seciliMi = etkin === s.kimlik;
              return (
                <li key={s.kimlik}>
                  <button
                    type="button"
                    onClick={() => sec(s.kimlik)}
                    aria-current={seciliMi ? 'page' : undefined}
                    className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors ${
                      seciliMi
                        ? 'bg-blue-50 font-bold text-blue-700'
                        : 'font-medium text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Ikon aria-hidden className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">{s.etiket}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>

    <div className="border-t border-gray-200 px-3 py-3">
      <button
        type="button"
        onClick={onSiteyeDon}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
      >
        Siteye dön
      </button>
      {/*
        DEMO UYARISI SİDEBAR DİBİNDE, HER SAYFADA GÖRÜNÜR.

        Trafik sayıları bugün toplanmıyor; paneldeki ziyaretçi akışı
        üretilmiş veri. Bunu yalnız bir sayfada yazmak, öteki sayfaya
        giren kişinin gerçek sanmasına yol açardı.
      */}
      <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
        Ziyaretçi trafiği <strong className="font-semibold">demo veriyle</strong> çalışıyor.
        Ürün sayıları (öğrenci, ilan, başvuru) gerçek veritabanından geliyor.
      </p>
    </div>
  </nav>
);

export const YonetimKabuk: React.FC<{
  etkin: YonetimSayfaKimlik;
  sec: (k: YonetimSayfaKimlik) => void;
  onSiteyeDon: () => void;
  children: React.ReactNode;
}> = ({ etkin, sec, onSiteyeDon, children }) => {
  const [acik, setAcik] = React.useState(false);
  const baslik = YONETIM_SAYFALARI.find((s) => s.kimlik === etkin)?.etiket ?? 'Yönetim';

  /* Çekmece açıkken gövde kaymasın; kapanınca eski hâline dönsün. */
  React.useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = onceki; };
  }, [acik]);

  /* Sayfa değişince çekmece kapanıyor: seçim yapıldı, açık kalması engel. */
  React.useEffect(() => { setAcik(false); }, [etkin]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ---- mobil üst çubuk ---- */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setAcik(true)}
          aria-label="Menüyü aç"
          aria-expanded={acik}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
        >
          <Menu aria-hidden className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-gray-900">{baslik}</p>
      </header>

      {/* ---- mobil çekmece ---- */}
      {acik && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setAcik(false)}
            className="absolute inset-0 cursor-pointer bg-gray-900/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setAcik(false)}
              aria-label="Menüyü kapat"
              className="absolute right-2 top-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
            <MenuIcerik etkin={etkin} sec={sec} onSiteyeDon={onSiteyeDon} />
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* ---- masaüstü sütun ---- */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-gray-200 bg-white lg:block">
          <MenuIcerik etkin={etkin} sec={sec} onSiteyeDon={onSiteyeDon} />
        </aside>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 lg:px-6">
          <h1 className="mb-4 hidden text-xl font-black text-gray-900 lg:block">{baslik}</h1>
          {children}
        </main>
      </div>
    </div>
  );
};
