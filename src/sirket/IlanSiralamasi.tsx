import React from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { fetchPublishedListingsCatalog, type PublishedListingsCatalogPage } from '../lib/queries';
import { konumEtiketi } from '../lib/sehir';
import { listingSlug } from '../lib/slug';
import { ListingLogo } from '../components/ListingLogo';
import { KUTU, SIRKET_KENAR, SIRKET_METIN, SIRKET_METIN_IKINCIL, SIRKET_ODAK, kutuStil } from './renk';

/**
 * İLANLAR SAYFASINDAKİ SIRA (27 Eylül 2026, kullanıcı isteği)
 *
 * Şirket İlanlarım'da kendi ilanının öğrencinin gördüğü listede hangi
 * şirketlerin ilanlarıyla, kaçıncı sırada durduğunu görüyor. Liste
 * öğrencinin ilanlar sayfasıyla AYNI sorgu ve AYNI sıra: katalog
 * RPC'si (`get_published_listings_catalog_v3`), "Tümü" görünümü, ilk
 * sayfa (24 ilan). Sıra kuralı sunucuda: yayın tarihi (yoksa oluşturma),
 * en yeni üstte; son başvurusu geçmiş ilan yok.
 *
 * UYDURMA SIRA YOK: şirketin ilanı ilk sayfada değilse "kaçıncı" diye bir
 * sayı tahmin edilmiyor — ilk 24 arasında olmadığı ve sıranın neye göre
 * kurulduğu söyleniyor. Toplam ilan sayısı sunucunun sayacından.
 */

type Durum =
  | { tur: 'yukleniyor' }
  | { tur: 'hazir'; sayfa: PublishedListingsCatalogPage }
  | { tur: 'hata' };

const KAPALI_SATIR = 10;

export const IlanSiralamasi: React.FC<{
  companyId: string | null;
  /** Şirketin yayında (status = published) ilanı var mı — panelin kendi listesinden. */
  yayindaIlanVar: boolean;
}> = ({ companyId, yayindaIlanVar }) => {
  const [durum, setDurum] = React.useState<Durum>({ tur: 'yukleniyor' });
  const [deneme, setDeneme] = React.useState(0);
  const [acik, setAcik] = React.useState(false);

  React.useEffect(() => {
    let iptal = false;
    setDurum({ tur: 'yukleniyor' });
    fetchPublishedListingsCatalog('all')
      .then((sayfa) => {
        if (!iptal) setDurum({ tur: 'hazir', sayfa });
      })
      .catch(() => {
        if (!iptal) setDurum({ tur: 'hata' });
      });
    return () => {
      iptal = true;
    };
  }, [deneme]);

  const baslik = (
    <div>
      <h2 id="ilan-sirasi" className="text-base font-extrabold" style={{ color: SIRKET_METIN }}>
        İlanlar sayfasındaki sıra
      </h2>
      <p className="mt-0.5 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
        Öğrencinin ilanlar sayfasında gördüğü ilk ilanlar. Sıra yayın tarihine göre; en yeni ilan en üstte.
      </p>
    </div>
  );

  if (durum.tur !== 'hazir') {
    return (
      <section className={`${KUTU} space-y-3`} style={kutuStil} aria-labelledby="ilan-sirasi" aria-busy={durum.tur === 'yukleniyor'}>
        {baslik}
        {durum.tur === 'yukleniyor' ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <span key={i} aria-hidden className="block h-12 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div role="alert" className="space-y-2">
            <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              Sıra alınamadı.
            </p>
            <button
              type="button"
              onClick={() => setDeneme((n) => n + 1)}
              className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-bold ${SIRKET_ODAK}`}
              style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN }}
            >
              Yeniden dene
            </button>
          </div>
        )}
      </section>
    );
  }

  const { listings, total } = durum.sayfa;
  const benimMi = (companyIdi: string | undefined) => Boolean(companyId && companyIdi === companyId);
  const kendiSiralari = listings.map((l, i) => (benimMi(l.companyId) ? i + 1 : 0)).filter(Boolean);
  /* Kapalıyken ilk 10 satır + (varsa) ilk sayfadaki kendi ilanları; sıra korunuyor. */
  const gorunen = listings
    .map((ilan, i) => ({ ilan, sira: i + 1 }))
    .filter(({ ilan, sira }) => acik || sira <= KAPALI_SATIR || benimMi(ilan.companyId));

  return (
    <section className={`${KUTU} space-y-3`} style={kutuStil} aria-labelledby="ilan-sirasi">
      {baslik}

      <p className="text-sm font-semibold" style={{ color: SIRKET_METIN }}>
        {/*
          Dört durum, dört cümle: ilk sayfada (sıra numarası gerçek),
          yayında değil, ilk sayfanın gerisinde, yayında ama listede yok
          (katalog son başvurusu geçmiş ilanı göstermiyor).
        */}
        {kendiSiralari.length > 0
          ? `İlanınız ${kendiSiralari.map((s) => `${s}.`).join(', ')} sırada · toplam ${total} ilan`
          : !yayindaIlanVar
            ? `Yayında ilanınız yok · öğrenciler şu an ${total} ilan görüyor`
            : total > listings.length
              ? `İlanınız ilk ${listings.length} ilan arasında değil · toplam ${total} ilan`
              : 'Yayındaki ilanınız öğrenci listesinde görünmüyor; son başvuru tarihi geçen ilanlar listelenmez.'}
      </p>

      <ol className="divide-y divide-gray-100">
        {gorunen.map(({ ilan, sira }, i) => {
          const benim = benimMi(ilan.companyId);
          const atlandi = i > 0 && sira - gorunen[i - 1].sira > 1;
          return (
            <li key={ilan.id} value={sira} className={atlandi ? 'border-t border-dashed border-gray-300 pt-1' : undefined}>
              <a
                href={`/ilan/${listingSlug(ilan)}`}
                target="_blank"
                rel="noreferrer"
                className={`flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50 ${SIRKET_ODAK} ${
                  benim ? 'bg-blue-50 hover:bg-blue-50' : ''
                }`}
              >
                <span
                  className={`w-6 shrink-0 text-right text-sm font-extrabold tabular-nums ${benim ? 'text-blue-800' : 'text-gray-500'}`}
                >
                  {sira}
                </span>
                <ListingLogo name={ilan.companyName} logoUrl={ilan.companyLogo} className="!h-10 !w-10 !p-1" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-bold leading-snug" style={{ color: SIRKET_METIN }}>
                    {ilan.title}
                  </span>
                  <span className="block truncate text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                    {[ilan.companyName, konumEtiketi(ilan.city)].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {benim && (
                  <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                    Sizin
                  </span>
                )}
                <ExternalLink aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="sr-only"> (yeni sekmede açılır)</span>
              </a>
            </li>
          );
        })}
      </ol>

      {listings.length > KAPALI_SATIR && (
        <button
          type="button"
          aria-expanded={acik}
          onClick={() => setAcik((a) => !a)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-bold text-blue-700 hover:text-blue-800 ${SIRKET_ODAK}`}
        >
          {acik ? 'Daha az göster' : `İlk ${listings.length} ilanın tümünü göster`}
          <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${acik ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  );
};
