import React from 'react';
import { ilanGunlukIstatistik, type IlanGunu } from '../lib/sirket-veri';
import { donusumOrani, gunlukOzet, oranMetni } from '../lib/ilan-istatistik.mjs';
import { SIRKET_KENAR, SIRKET_METIN, SIRKET_METIN_IKINCIL, SIRKET_VURGU } from './renk';

/**
 * İLAN İSTATİSTİK AYRINTISI (rakip analizi #11)
 *
 * Son 30 gün: günlük ziyaretçi çubukları, başvuru olan gün işaretli.
 * Telefonda okunuyor: bilgi hover'da değil, özet cümlede ve ekran
 * okuyucu tablosunda (panel-telefonda-okunuyor kararı).
 */
const gunAdi = (gun: string) =>
  new Date(`${gun}T12:00:00Z`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

export const IlanIstatistikAyrintisi: React.FC<{ ilanId: string }> = ({ ilanId }) => {
  const [gunler, setGunler] = React.useState<IlanGunu[] | null | undefined>(undefined);

  React.useEffect(() => {
    let iptal = false;
    void ilanGunlukIstatistik(ilanId).then((d) => !iptal && setGunler(d));
    return () => {
      iptal = true;
    };
  }, [ilanId]);

  if (gunler === undefined) {
    return <div className="mt-2 h-24 animate-pulse rounded-xl bg-gray-50" />;
  }
  if (gunler === null) {
    return (
      <p className="mt-2 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
        Günlük istatistik okunamadı.
      </p>
    );
  }

  const ozet = gunlukOzet(gunler);
  const oran = donusumOrani(ozet.basvuru, ozet.goruntulenme);
  const enCok = Math.max(1, ...gunler.map((g) => g.goruntulenme));

  return (
    <div className="mt-2 rounded-xl border p-3" style={{ borderColor: SIRKET_KENAR }}>
      <p className="text-xs leading-relaxed" style={{ color: SIRKET_METIN }}>
        Son 30 günde <b>{ozet.goruntulenme}</b> günlük ziyaret, <b>{ozet.basvuru}</b> başvuru
        {oran !== null && (
          <>
            {' '}· dönüşüm <b>{oranMetni(oran)}</b>
          </>
        )}
        {ozet.enYogun && <> · en yoğun gün {gunAdi(ozet.enYogun.gun)} ({ozet.enYogun.goruntulenme})</>}
      </p>
      <div aria-hidden className="mt-3 flex h-16 items-end gap-[2px]">
        {gunler.map((g) => (
          <div key={g.gun} className="relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max(g.goruntulenme ? 6 : 2, (g.goruntulenme / enCok) * 100)}%`,
                background: g.goruntulenme ? SIRKET_VURGU : SIRKET_KENAR,
              }}
            />
            {g.basvuru > 0 && (
              <span className="absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-600" />
            )}
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-1 flex justify-between text-[10px]" style={{ color: SIRKET_METIN_IKINCIL }}>
        <span>{gunler[0] && gunAdi(gunler[0].gun)}</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> başvuru gelen gün
        </span>
        <span>{gunler.length > 0 && gunAdi(gunler[gunler.length - 1].gun)}</span>
      </div>
      <table className="sr-only">
        <caption>Son 30 günün günlük ziyaret ve başvuru sayıları</caption>
        <thead>
          <tr>
            <th scope="col">Gün</th>
            <th scope="col">Ziyaret</th>
            <th scope="col">Başvuru</th>
          </tr>
        </thead>
        <tbody>
          {gunler.map((g) => (
            <tr key={g.gun}>
              <td>{gunAdi(g.gun)}</td>
              <td>{g.goruntulenme}</td>
              <td>{g.basvuru}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
        Ziyaret: ilan sayfasını o gün açan farklı kişi; ekibinizin bakışları sayılmıyor.
      </p>
    </div>
  );
};
