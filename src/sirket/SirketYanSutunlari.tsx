import React from 'react';
import { ArrowRight, Briefcase, ChevronRight, Heart, Plus, Users } from 'lucide-react';
import { ODAK_HALKASI } from '../lib/renk-token';
import { durumAdi } from './basvuru-durumu';
import type { AdayOzeti } from './IlanKarti';
import type { SayacDurumu } from './SirketProfilGorunumu';

/**
 * ŞİRKETİM'İN MASAÜSTÜ SÜTUNLARI (kullanıcı isteği, 27 Eylül 2026)
 *
 * Öğrencinin /cv ekranı masaüstünde üç sütun: solda Kampüsüm, ortada
 * profil, sağda öneriler (`ProfilSayfaDuzeni`, `AgimYanSutun`). Şirketim
 * ise tek sütunda kalıyor ve geniş ekranın iki yanı boştu. Aynı kap, aynı
 * eşikler (sol 1440, sağ 1280 piksel üstünde) ve aynı kart dili; içerik
 * şirketin işine göre:
 *
 *   SOL  "Şirket paneli" — İlanlarım, Başvurular, Takipçiler satırları ve
 *        "İlan oluştur". Öğrencideki Kampüsüm'ün karşılığı: günlük iş.
 *   SAĞ  "Son başvurular" (yalnız kart görebilen kademede ve varsa) ve
 *        "İşveren rehberi" (gerçek yazılar).
 *
 * HER SAYI GERÇEK VERİDEN: ilan sayıları panelin `listings` satırlarından,
 * başvurular `applications` kart verisinden (kademe izin vermiyorsa sayı
 * YAZILMIYOR, "doğrulama sonrası" deniyor), takipçi `sosyal_sayaclar`dan.
 * Alınamayan sayı basılmıyor; örnek içerik yok. Telefonda bu sütunlar hiç
 * çizilmiyor (`ProfilSayfaDuzeni`), aynı işler alt çubukta.
 */

const KART = 'rounded-2xl border border-gray-200 bg-white p-4';
const KART_BASLIGI = 'text-sm font-extrabold text-gray-900';

function git(onNavigate: (yol: string) => void, yol: string) {
  return (olay: React.MouseEvent<HTMLAnchorElement>) => {
    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
    olay.preventDefault();
    onNavigate(yol);
  };
}

const PanelSatiri: React.FC<{
  yol: string;
  ikon: React.ReactNode;
  etiket: string;
  bilgi: string | null;
  onNavigate: (yol: string) => void;
}> = ({ yol, ikon, etiket, bilgi, onNavigate }) => (
  <li>
    <a
      href={yol}
      onClick={git(onNavigate, yol)}
      className={`flex min-h-12 items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50 ${ODAK_HALKASI}`}
    >
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        {ikon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-gray-900">{etiket}</span>
        {bilgi && <span className="block truncate text-xs text-gray-600">{bilgi}</span>}
      </span>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
    </a>
  </li>
);

export const SirketSolSutun: React.FC<{
  ilanlar: Record<string, unknown>[];
  basvurular: AdayOzeti[];
  /** Kademe başvuru kartlarını açıyor mu (`adayGorebilir`). Kapalıysa sayı yazılmıyor. */
  kartAcik: boolean;
  takipci: SayacDurumu;
  onNavigate: (yol: string) => void;
}> = ({ ilanlar, basvurular, kartAcik, takipci, onNavigate }) => {
  const aktif = ilanlar.filter((i) => i.status === 'published').length;
  const taslak = ilanlar.filter((i) => i.status === 'draft').length;
  const yeni = basvurular.filter((b) => b.durum === 'submitted').length;
  const ilanBilgisi =
    ilanlar.length === 0
      ? 'Henüz ilan yok'
      : [`${aktif} yayında`, taslak > 0 ? `${taslak} taslak` : null].filter(Boolean).join(' · ');
  const basvuruBilgisi = !kartAcik
    ? 'Doğrulamadan sonra açılır'
    : basvurular.length === 0
      ? 'Henüz başvuru yok'
      : `${basvurular.length} başvuru${yeni > 0 ? ` · ${yeni} yeni` : ''}`;
  const takipciBilgisi = takipci.durum === 'hazir' ? `${takipci.deger} takipçi` : null;

  return (
    <section className={KART} aria-labelledby="sirket-paneli">
      <h2 id="sirket-paneli" className="text-lg font-extrabold text-gray-900">
        Şirket paneli
      </h2>
      <ul className="-mx-2 mt-2 space-y-0.5">
        <PanelSatiri yol="/sirket/ilanlar" ikon={<Briefcase className="h-4 w-4" />} etiket="İlanlarım" bilgi={ilanBilgisi} onNavigate={onNavigate} />
        <PanelSatiri yol="/sirket/basvuranlar" ikon={<Users className="h-4 w-4" />} etiket="Başvurular" bilgi={basvuruBilgisi} onNavigate={onNavigate} />
        <PanelSatiri yol="/agim" ikon={<Heart className="h-4 w-4" />} etiket="Takipçiler" bilgi={takipciBilgisi} onNavigate={onNavigate} />
      </ul>
      <a
        href="/sirket/ilan/yeni"
        onClick={git(onNavigate, '/sirket/ilan/yeni')}
        className={`mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 ${ODAK_HALKASI}`}
      >
        <Plus aria-hidden className="h-4 w-4" />
        İlan oluştur
      </a>
    </section>
  );
};

type YaziOzeti = { slug: string; baslik: string; konu: string };

export const SirketYanSutun: React.FC<{
  basvurular: AdayOzeti[];
  ilanlar: Record<string, unknown>[];
  kartAcik: boolean;
  onNavigate: (yol: string) => void;
}> = ({ basvurular, ilanlar, kartAcik, onNavigate }) => {
  /*
    SON BAŞVURULAR: kart verisi zaten panelde (aynı yetki); dizi sunucudan
    başvuru tarihine göre geliyor. Kademe kapalıysa ya da başvuru yoksa
    kart hiç çizilmiyor — boş kutu yok.
  */
  const basliklar = new Map(ilanlar.map((i) => [String(i.id), String(i.title ?? '')]));
  /*
    İşveren yazıları rehber merkeziyle aynı kaynaktan; veri büyük (yazıların
    kendisi) olduğu için panelin ilk yüklemesine binmesin diye sonradan
    geliyor (AgimYanSutun'daki kalıp). Gelmezse yalnız yol haritası kalıyor.
  */
  const [yazilar, setYazilar] = React.useState<YaziOzeti[]>([]);
  React.useEffect(() => {
    let iptal = false;
    import('../data/rehberler')
      .then(({ REHBERLER, konuEtiketi }) => {
        if (iptal) return;
        setYazilar(
          REHBERLER.filter((r) => r.kategori === 'isveren')
            .slice(0, 4)
            .map((r) => ({ slug: r.slug, baslik: r.baslik, konu: konuEtiketi(r.konu) })),
        );
      })
      .catch(() => !iptal && setYazilar([]));
    return () => {
      iptal = true;
    };
  }, []);
  const son = kartAcik ? basvurular.slice(0, 4) : [];
  return (
    <>
      {son.length > 0 && (
        <section className={KART} aria-labelledby="sirket-son-basvurular">
          <h2 id="sirket-son-basvurular" className={KART_BASLIGI}>
            Son başvurular
          </h2>
          <ul className="mt-3 space-y-3">
            {son.map((b) => {
              const yol = b.ilanId ? `/sirket/basvuranlar?ilan=${encodeURIComponent(b.ilanId)}` : '/sirket/basvuranlar';
              return (
                <li key={b.id}>
                  <a href={yol} onClick={git(onNavigate, yol)} className="group block">
                    <span className="block truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                      {b.ad ?? 'Aday'}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {[b.ilanId ? basliklar.get(b.ilanId) : null, durumAdi(b.durum)].filter(Boolean).join(' · ')}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <a
            href="/sirket/basvuranlar"
            onClick={git(onNavigate, '/sirket/basvuranlar')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            Tüm başvurular
            <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </section>
      )}

      <section className={KART} aria-labelledby="sirket-yan-rehber">
        <h2 id="sirket-yan-rehber" className={KART_BASLIGI}>
          İşveren rehberi
        </h2>
        <ul className="mt-3 space-y-3">
          <li>
            <a href="/stajyer-nasil-alinir" onClick={git(onNavigate, '/stajyer-nasil-alinir')} className="group block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">Yol haritası</span>
              <span className="block text-sm font-semibold leading-snug text-gray-900 group-hover:text-blue-700">
                İlk stajyeriniz için yol haritası
              </span>
            </a>
          </li>
          {yazilar.map((r) => {
            const yol = `/rehber/${r.slug}`;
            return (
              <li key={r.slug}>
                <a href={yol} onClick={git(onNavigate, yol)} className="group block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    {r.konu}
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
          onClick={git(onNavigate, '/rehber')}
          className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
        >
          Tüm işveren rehberi
          <ArrowRight aria-hidden className="h-4 w-4" />
        </a>
      </section>
    </>
  );
};
