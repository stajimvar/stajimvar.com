import React from 'react';
import { ODAK_HALKASI } from '../../lib/renk-token';
import { CORPORATE_TITLES, type LegalSlug } from '../../lib/yasal-rotalar';

/**
 * KURUMSAL VE YASAL SAYFALARIN ORTAK PARÇALARI (15 Kasım 2026)
 *
 * Alt bilgideki dokuz bağlantının açtığı sayfalar (Hakkımızda, İletişim,
 * Kullanım Koşulları, İlan kuralları, İlan bildir, Gizlilik, KVKK, Çerez)
 * tek kabuğu paylaşıyor: `LegalPage`. Bu dosya o kabuğun üç parçası:
 *   · MetinBolumu   başlığı çapalı (#id) bölüm; okunur yazı boyu ve aralığı
 *   · SayfaGezintisi sayfalar arası gezinme (masaüstünde sol sütun,
 *                    telefonda metnin altında liste — yatay çip satırı YOK)
 *   · BuSayfada     içindekiler; bölüm başlıklarından tarayıcıda çıkarılıyor
 * Ön render (`scripts/onrender.mjs`) bu bileşenleri sunucuda da çiziyor:
 * çizim sırasında `window`/`document` okunmuyor; içindekiler yalnız etkide.
 */

const TURKCE: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

/** Başlıktan çapa kimliği: "Kısa özet" → "kisa-ozet". */
export function capa(baslik: string): string {
  return baslik
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (h) => TURKCE[h] ?? h)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const MetinBolumu: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section aria-labelledby={capa(baslik)} className="space-y-3">
    <h2 id={capa(baslik)} className="scroll-mt-28 text-xl font-bold tracking-tight text-slate-900">
      {baslik}
    </h2>
    <div className="space-y-3 text-[15px] leading-7 text-gray-700 [&_a]:font-semibold [&_a]:text-blue-700 [&_a:hover]:underline [&_strong]:text-gray-900">
      {children}
    </div>
  </section>
);

const GRUPLAR: { baslik: string; sayfalar: { slug: LegalSlug; ad: string; yol: string }[] }[] = [
  {
    baslik: 'Kurumsal',
    sayfalar: [
      { slug: 'hakkimizda', ad: CORPORATE_TITLES.hakkimizda, yol: '/hakkimizda' },
      { slug: 'iletisim', ad: CORPORATE_TITLES.iletisim, yol: '/iletisim' },
      { slug: 'kullanim-kosullari', ad: CORPORATE_TITLES['kullanim-kosullari'], yol: '/kullanim-kosullari' },
      { slug: 'ilan-kurallari', ad: CORPORATE_TITLES['ilan-kurallari'], yol: '/ilan-kurallari' },
      { slug: 'ilan-bildir', ad: 'İlan bildir', yol: '/ilan-bildir' },
    ],
  },
  {
    baslik: 'Yasal',
    sayfalar: [
      { slug: 'gizlilik', ad: 'Gizlilik Politikası', yol: '/gizlilik' },
      { slug: 'kvkk-aydinlatma-metni', ad: 'KVKK Aydınlatma Metni', yol: '/kvkk-aydinlatma-metni' },
      { slug: 'cerez-politikasi', ad: 'Çerez Politikası', yol: '/cerez-politikasi' },
      { slug: 'guvenlik', ad: 'Güven Merkezi', yol: '/guvenlik' },
    ],
  },
];

export const SayfaGezintisi: React.FC<{ aktif: LegalSlug }> = ({ aktif }) => (
  <nav aria-label="Kurumsal ve yasal sayfalar" className="rounded-2xl border border-gray-200 bg-white p-3">
    {GRUPLAR.map((g, i) => (
      <div key={g.baslik} className={i > 0 ? 'mt-3 border-t border-gray-100 pt-3' : ''}>
        <p className="px-3 pb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">{g.baslik}</p>
        <ul className="space-y-0.5">
          {g.sayfalar.map((s) => {
            const secili = s.slug === aktif;
            return (
              <li key={s.slug}>
                <a
                  href={s.yol}
                  aria-current={secili ? 'page' : undefined}
                  className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors ${ODAK_HALKASI} ${
                    secili ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {s.ad}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </nav>
);

/**
 * İçindekiler. Bölüm başlıkları metnin içinde (`MetinBolumu`) ve sayfadan
 * sayfaya değişiyor; liste elle tutulsaydı metin değişince eskirdi. Bu
 * yüzden kapsayıcıdaki `h2[id]`ler okunuyor. İkiden az bölüm varsa çizilmiyor.
 */
export const BuSayfada: React.FC<{ kapsayici: React.RefObject<HTMLElement | null>; anahtar: string }> = ({
  kapsayici,
  anahtar,
}) => {
  const [bolumler, setBolumler] = React.useState<{ id: string; ad: string }[]>([]);
  React.useEffect(() => {
    const kok = kapsayici.current;
    if (!kok) return;
    const oku = () =>
      setBolumler(
        Array.from(kok.querySelectorAll<HTMLHeadingElement>('h2[id]')).map((h) => ({
          id: h.id,
          ad: h.textContent?.trim() ?? '',
        })),
      );
    oku();
    /* Kurumsal sayfaların bir kısmı veriyi sonradan çiziyor (canlı sayılar). */
    const gozcu = new MutationObserver(oku);
    gozcu.observe(kok, { childList: true, subtree: true });
    return () => gozcu.disconnect();
  }, [kapsayici, anahtar]);

  if (bolumler.length < 2) return null;
  return (
    <nav aria-label="Bu sayfada" className="px-3">
      <p className="pb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Bu sayfada</p>
      <ul className="space-y-1 border-l border-gray-200">
        {bolumler.map((b) => (
          <li key={b.id}>
            <a
              href={`#${b.id}`}
              className={`-ml-px block border-l-2 border-transparent py-1 pl-3 text-sm text-gray-600 hover:border-blue-500 hover:text-gray-900 ${ODAK_HALKASI}`}
            >
              {b.ad}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
