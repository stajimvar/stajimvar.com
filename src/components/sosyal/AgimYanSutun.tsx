import React from 'react';
import { ArrowRight } from 'lucide-react';
import { alanindakiKisiler, type SosyalAramaSonucu } from '../../lib/queries/sosyal';
import { fetchPublishedListingsCatalog } from '../../lib/queries';
import type { InternshipListing } from '../../types';
import { ListingLogo } from '../ListingLogo';
import { listingSlug } from '../../lib/slug';
import { KisiListesi } from './KullaniciArama';

/**
 * Ağım'ın sağ sütunu — LinkedIn'deki "haberler" bölümünün StajımVar
 * karşılığı (kullanıcı isteği, 17 Eylül 2026). Yalnız geniş ekranda.
 *
 * Üç kart, üçü de GERÇEK veriden:
 *   1. Bağlantı önerileri — aynı alandaki kişiler (`alanindakiKisiler`).
 *   2. Yeni ilanlar — yayındaki kataloğun ilk sayfası, eklenme tarihine
 *      göre. Bugün eklenen varsa başlık "Bugün eklenen ilanlar"; yoksa
 *      "Son eklenen ilanlar" — olmayan bir "bugün" iddia edilmiyor.
 *   3. Rehberler — öğrenci rehberlerinden birkaçı.
 *
 * Veri alınamazsa kart çizilmiyor; boş kutu ya da örnek içerik yok.
 */

const KART = 'rounded-2xl border border-gray-200 bg-white p-4';
const KART_BASLIGI = 'text-sm font-extrabold text-gray-900';

function gitme(onNavigate: (yol: string) => void, yol: string) {
  return (olay: React.MouseEvent<HTMLAnchorElement>) => {
    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
    olay.preventDefault();
    onNavigate(yol);
  };
}

function bugunMu(tarih: string): boolean {
  const t = new Date(tarih);
  if (Number.isNaN(t.getTime())) return false;
  const bugun = new Date();
  return (
    t.getFullYear() === bugun.getFullYear() && t.getMonth() === bugun.getMonth() && t.getDate() === bugun.getDate()
  );
}

type RehberOzeti = { slug: string; baslik: string; konuEtiketi: string };

export const AgimYanSutun: React.FC<{
  kullaniciId: string;
  sektorId: string | null;
  onNavigate: (yol: string) => void;
}> = ({ kullaniciId, sektorId, onNavigate }) => {
  const [oneriler, setOneriler] = React.useState<SosyalAramaSonucu[]>([]);
  const [ilanlar, setIlanlar] = React.useState<InternshipListing[]>([]);
  const [rehberler, setRehberler] = React.useState<RehberOzeti[]>([]);

  React.useEffect(() => {
    if (!sektorId) {
      setOneriler([]);
      return;
    }
    let iptal = false;
    alanindakiKisiler(kullaniciId, sektorId)
      .then((liste) => !iptal && setOneriler(liste.slice(0, 5)))
      .catch(() => !iptal && setOneriler([]));
    return () => {
      iptal = true;
    };
  }, [kullaniciId, sektorId]);

  React.useEffect(() => {
    let iptal = false;
    fetchPublishedListingsCatalog('all')
      .then((sayfa) => {
        if (iptal) return;
        const sirali = [...sayfa.listings].sort(
          (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
        );
        setIlanlar(sirali.slice(0, 5));
      })
      .catch(() => !iptal && setIlanlar([]));
    /*
      Rehber verisi büyük (yazıların kendisi); akışın ilk yüklemesine
      binmesin diye ayrı parçada ve sonradan geliyor.
    */
    import('../../data/rehberler')
      .then(({ REHBERLER, konuEtiketi }) => {
        if (iptal) return;
        setRehberler(
          REHBERLER.filter((r) => r.kategori === 'ogrenci')
            .slice(0, 5)
            .map((r) => ({ slug: r.slug, baslik: r.baslik, konuEtiketi: konuEtiketi(r.konu) })),
        );
      })
      .catch(() => !iptal && setRehberler([]));
    return () => {
      iptal = true;
    };
  }, []);

  const bugunkuler = ilanlar.filter((i) => bugunMu(i.postedAt));
  const gosterilenIlanlar = bugunkuler.length > 0 ? bugunkuler : ilanlar;

  return (
    <>
      {oneriler.length > 0 && (
        <section className={KART} aria-labelledby="agim-oneriler">
          <h2 id="agim-oneriler" className={KART_BASLIGI}>
            Bağlantı kurabileceğin kişiler
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">Seninle aynı alanda</p>
          <div className="-mx-2 mt-2">
            <KisiListesi kisiler={oneriler} onNavigate={onNavigate} />
          </div>
        </section>
      )}

      {gosterilenIlanlar.length > 0 && (
        <section className={KART} aria-labelledby="agim-ilanlar">
          <h2 id="agim-ilanlar" className={KART_BASLIGI}>
            {bugunkuler.length > 0 ? 'Bugün eklenen ilanlar' : 'Son eklenen ilanlar'}
          </h2>
          <ul className="mt-3 space-y-3">
            {gosterilenIlanlar.map((ilan) => {
              const yol = `/ilan/${listingSlug(ilan)}`;
              return (
                <li key={ilan.id}>
                  <a href={yol} onClick={gitme(onNavigate, yol)} className="group flex items-center gap-3">
                    <ListingLogo
                      name={ilan.companyName}
                      logoUrl={ilan.companyLogo || undefined}
                      className="!h-10 !w-10 shrink-0 !rounded-lg !p-1 !text-xs"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                        {ilan.title}
                      </span>
                      <span className="block truncate text-xs text-gray-500">{ilan.companyName}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <a
            href="/"
            onClick={gitme(onNavigate, '/')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            Tüm ilanlar
            <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </section>
      )}

      {rehberler.length > 0 && (
        <section className={KART} aria-labelledby="agim-rehberler">
          <h2 id="agim-rehberler" className={KART_BASLIGI}>
            Rehberler
          </h2>
          <ul className="mt-3 space-y-3">
            {rehberler.map((r) => {
              const yol = `/rehber/${r.slug}`;
              return (
                <li key={r.slug}>
                  <a href={yol} onClick={gitme(onNavigate, yol)} className="group block">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {r.konuEtiketi}
                    </span>
                    <span className="block text-sm font-semibold leading-snug text-gray-900 group-hover:text-blue-700">
                      {r.baslik}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <a
            href="/rehber"
            onClick={gitme(onNavigate, '/rehber')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            Tüm rehberler
            <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </section>
      )}
    </>
  );
};
