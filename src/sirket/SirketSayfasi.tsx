import React from 'react';
import { MapPin } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../lib/renk-token';
import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { listingSlug } from '../lib/slug';
import { fetchPublishedCompanyListings } from '../lib/queries';
import { takipciSayisiGetir, type SosyalPaylasim, type SosyalProfil } from '../lib/queries/sosyal';
import { sirketAcikKimliginiOku, type SirketAcikKimlik } from '../lib/sirket-veri';
import type { InternshipListing } from '../types';
import { SirketProfilGorunumu, type SayacDurumu } from './SirketProfilGorunumu';

/**
 * ŞİRKET SAYFASI — ÖĞRENCİNİN GÖRDÜĞÜ (/profil/<slug>)
 *
 * `SosyalProfilSayfasi` ziyaretçi dalında satırın `sirket_id`si doluysa
 * öğrenci görünümü yerine bunu çiziyor. Paylaşımlar ve paylaşım sayacı
 * o sayfadan geliyor (zaten okunmuş; ikinci kez sorulmuyor). Burada
 * yalnız şirkete özgü üç okuma var: açık kimlik (İK e-postası YOK —
 * `sirketAcikKimliginiOku` o sütunu hiç istemiyor), yayındaki ilanlar
 * ve takipçi sayısı.
 *
 * SAHİP NESNESİ HİÇ VERİLMİYOR: bu bileşen `sahip` prop'unu bilmiyor
 * bile. İlan oluşturma, düzenleme, paylaşım ekleme ve arşivleme burada
 * DOM'a giremiyor. Sunucu tarafı da aynı sınırı çiziyor (RLS).
 *
 * TAKİP ET YOK: sayı sunucudan geliyor ve gösteriliyor; eylem ayrı
 * işin konusu, sahte düğme çizilmiyor.
 */

type Durum = 'yukleniyor' | 'hazir' | 'hata';

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

export const SirketSayfasi: React.FC<{
  profil: SosyalProfil;
  paylasimlar: SosyalPaylasim[];
  paylasimDurumu: Durum;
  paylasimSayaci: SayacDurumu;
  onPaylasimlariYenile: () => void;
  onNavigate: (yol: string) => void;
  bildirim?: string | null;
}> = ({ profil, paylasimlar, paylasimDurumu, paylasimSayaci, onPaylasimlariYenile, onNavigate, bildirim }) => {
  const sirketId = profil.sirketId;
  const [kimlik, setKimlik] = React.useState<SirketAcikKimlik | null>(null);
  const [kimlikDurumu, setKimlikDurumu] = React.useState<Durum | 'yok'>('yukleniyor');
  const [ilanlar, setIlanlar] = React.useState<InternshipListing[]>([]);
  const [ilanDurumu, setIlanDurumu] = React.useState<Durum>('yukleniyor');
  const [takipci, setTakipci] = React.useState<SayacDurumu>({ durum: 'yukleniyor' });

  React.useEffect(() => {
    if (!sirketId) return;
    let iptal = false;
    setKimlikDurumu('yukleniyor');
    sirketAcikKimliginiOku(sirketId)
      .then((k) => {
        if (iptal) return;
        setKimlik(k);
        setKimlikDurumu(k ? 'hazir' : 'yok');
      })
      .catch(() => {
        if (!iptal) setKimlikDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, [sirketId]);

  React.useEffect(() => {
    if (!sirketId) return;
    let iptal = false;
    setIlanDurumu('yukleniyor');
    fetchPublishedCompanyListings(sirketId)
      .then((liste) => {
        if (iptal) return;
        setIlanlar(liste);
        setIlanDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setIlanDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, [sirketId]);

  React.useEffect(() => {
    let iptal = false;
    setTakipci({ durum: 'yukleniyor' });
    takipciSayisiGetir(profil.profilId)
      .then((n) => {
        if (!iptal) setTakipci({ durum: 'hazir', deger: n });
      })
      .catch(() => {
        if (!iptal) setTakipci({ durum: 'hata' });
      });
    return () => {
      iptal = true;
    };
  }, [profil.profilId]);

  if (kimlikDurumu === 'yukleniyor') {
    return (
      <div aria-busy="true" className="space-y-4">
        <div className={`${KART} flex items-start gap-4`}>
          <div aria-hidden className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div aria-hidden className="h-6 w-40 animate-pulse rounded bg-gray-100" />
            <div aria-hidden className="h-4 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  /*
    Kimlik okunamadı ya da şirket kaydı yok: sayfa yerine tek dürüst
    cümle. Sosyal satır var ama şirket satırı yok demek bir tutarsızlık
    (cascade silme olmalıydı); "alınamadı" ile "yok" ayrı cümle.
  */
  if (kimlikDurumu === 'hata' || !kimlik) {
    return (
      <div className={`${KART} space-y-2 text-center`} role="alert">
        <h1 className="text-lg font-extrabold text-gray-900">
          {kimlikDurumu === 'hata' ? 'Şirket bilgileri alınamadı' : 'Bu şirket sayfası görüntülenemiyor'}
        </h1>
        <p className="text-sm leading-relaxed text-gray-600">
          {kimlikDurumu === 'hata'
            ? 'Sunucudan cevap alınamadı. Yeniden deneyebilirsin.'
            : 'Şirket kaydı bulunamadı.'}
        </p>
      </div>
    );
  }

  const aktifIlan: SayacDurumu =
    ilanDurumu === 'hazir'
      ? { durum: 'hazir', deger: ilanlar.length }
      : ilanDurumu === 'hata'
        ? { durum: 'hata' }
        : { durum: 'yukleniyor' };

  return (
    <SirketProfilGorunumu
      kimlik={kimlik}
      kullaniciAdi={profil.kullaniciAdi}
      sayaclar={{ paylasim: paylasimSayaci, aktifIlan, takipci }}
      paylasimlar={paylasimlar}
      paylasimDurumu={paylasimDurumu}
      onPaylasimlariYenile={onPaylasimlariYenile}
      onNavigate={onNavigate}
      bildirim={bildirim}
      ilanlarIcerigi={<AcikIlanlar ilanlar={ilanlar} durum={ilanDurumu} onNavigate={onNavigate} />}
    />
  );
};

/**
 * Yayındaki ilanlar — öğrenci görünümü.
 *
 * Kart gerçek `<a href="/ilan/<slug>">`: orta tuş ve yeni sekme
 * çalışıyor. Şirket paneli `IlanKarti`sı burada ÇİZİLMİYOR: o kart
 * başvuran şeridi, Kapat/Yayınla ve Düzenle taşıyor — sahibe özel
 * eylemleri ziyaretçi kartına sokup gizlemek yerine ziyaretçinin
 * gördüğü kart sade: başlık, konum, çalışma biçimi, ücret.
 */
const AcikIlanlar: React.FC<{
  ilanlar: InternshipListing[];
  durum: Durum;
  onNavigate: (yol: string) => void;
}> = ({ ilanlar, durum, onNavigate }) => {
  if (durum === 'yukleniyor') {
    return (
      <div aria-busy="true" className="space-y-3">
        <div aria-hidden className={`${KART} h-20 animate-pulse`} />
        <div aria-hidden className={`${KART} h-20 animate-pulse`} />
      </div>
    );
  }
  if (durum === 'hata') {
    return (
      <p role="alert" className={`${KART} text-center text-sm text-gray-600`}>
        İlanlar alınamadı. Bağlantı ya da sunucu kaynaklı olabilir.
      </p>
    );
  }
  if (ilanlar.length === 0) {
    return <p className={`${KART} text-center text-sm text-gray-600`}>Şu anda açık ilanı yok.</p>;
  }
  return (
    <ul className="space-y-3">
      {ilanlar.map((ilan) => {
        const yol = `/ilan/${listingSlug(ilan)}`;
        const calisma = calismaEtiketi(ilan.workType);
        return (
          <li key={ilan.id}>
            <a
              href={yol}
              onClick={(olay) => {
                if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
                  return;
                olay.preventDefault();
                onNavigate(yol);
              }}
              className={`block rounded-2xl border border-gray-200 bg-white p-4 hover:border-blue-500 sm:p-5 ${RENK_GECISI} ${ODAK_HALKASI}`}
            >
              <p className="break-words text-base font-bold text-gray-900">{ilan.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden className="h-3.5 w-3.5" />
                  {konumEtiketi(ilan.city)}
                  {calisma ? ` (${calisma})` : ''}
                </span>
                {ilan.stipend.isPaid && <span className="font-semibold text-amber-700">Ücretli</span>}
              </p>
            </a>
          </li>
        );
      })}
    </ul>
  );
};
