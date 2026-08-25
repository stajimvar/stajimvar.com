import React from 'react';
import { ArrowRight, Bookmark, Clock } from 'lucide-react';
import { konuEtiketi, rehberOkumaDakika, type Rehber } from '../data/rehberler';

/**
 * Rehber kartı ve iskeleti.
 *
 * NEDEN KART DEĞİŞTİ
 * ------------------
 * Önceki kart `aspect-square` bir fotoğraftı ve başlık görselin ÜSTÜNE
 * biniyordu. İki sonucu vardı:
 *
 *   1. Kart çok uzundu. Masaüstünde ilk ekranda tek bir rehber başlığı
 *      görünmüyordu; kullanıcı kaydırmadan ne olduğunu anlamıyordu.
 *   2. Başlık dışında hiçbir şey yoktu. Özet, tarih, kaydetme yoktu;
 *      okuyucu "bu yazı ne anlatıyor" sorusunu kartta cevaplayamıyordu.
 *
 * Yeni kart: sabit oranlı ve alçak bir kapak, altında kategori, başlık,
 * iki satır özet, okuma süresi, tarih ve eylemler. Görsel artık bilgiyi
 * taşımıyor, yalnızca kartı tanıtıyor — bu yüzden küçültülebiliyor.
 *
 * KARTIN TAMAMI TIKLANABİLİR
 * --------------------------
 * Dış öğe bir `<a href>`: tarayıcı adresi gösteriyor, orta tuş ve
 * "yeni sekmede aç" çalışıyor, arama motoru iç bağlantıyı görüyor.
 * Kaydet düğmesi kartın İÇİNDE ayrı bir düğme olduğu için tıklaması
 * bağlantıya taşmasın diye olayı durduruyor — iç içe iki eylemi olan
 * kartlarda en sık yapılan hata bu.
 */

const tarihYaz = (deger?: string) => {
  if (!deger) return null;
  const zaman = new Date(deger).getTime();
  if (Number.isNaN(zaman)) return null;
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(zaman)
  );
};

export interface KartProps {
  rehber: Rehber;
  onNavigate?: (yol: string) => void;
  /** Kaydetme yalnızca destekleniyorsa çiziliyor; süs düğme yok. */
  kayitli?: boolean;
  onKaydet?: (slug: string) => void;
  /** Giriş gerekiyorsa düğme kaydetmiyor, giriş ekranını açıyor. */
  kaydetmeEtiketi?: string;
}

export const RehberKarti: React.FC<KartProps> = ({
  rehber,
  onNavigate,
  kayitli = false,
  onKaydet,
  kaydetmeEtiketi,
}) => {
  const tarih = tarihYaz(rehber.guncelleme);

  return (
    <a
      href={`/rehber/${rehber.slug}`}
      onClick={(e) => {
        if (!onNavigate) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onNavigate(`/rehber/${rehber.slug}`);
      }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {/*
        KAPAK SABİT YÜKSEKLİKTE

        Oran yerine sabit yükseklik: `aspect-[16/9]` geniş ekranda sütun
        genişledikçe kapağı da büyütüyordu ve 1280x720'de kartın tamamı
        ekrana sığmıyordu (ölçüldü: kart 386 piksel). Sabit yükseklikte
        kapak her ekranda aynı ve kartın okunacak kısmı yukarıda kalıyor.

        Yan etkisi de iyi: kutu yüksekliği görselden bağımsız olduğu için
        görsel inerken ızgara hiç zıplamıyor.
      */}
      <div className="relative h-32 w-full shrink-0 overflow-hidden bg-gray-100 sm:h-36">
        <picture>
          <source srcSet={`/rehber-gorselleri/${rehber.slug}.avif`} type="image/avif" />
          <img
            src={`/rehber-gorselleri/${rehber.slug}.webp`}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            width={720}
            height={405}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </picture>
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-700 shadow-xs">
          {konuEtiketi(rehber.konu)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="text-sm font-bold leading-snug text-gray-900 line-clamp-2 sm:text-base">
          {rehber.baslik}
        </h3>
        <p className="text-xs leading-relaxed text-gray-600 line-clamp-2">{rehber.ozet}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[11px] text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {rehberOkumaDakika(rehber)} dk
          </span>
          {tarih && (
            <>
              <span aria-hidden className="text-gray-300">
                ·
              </span>
              <span>{tarih}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 group-hover:underline">
            Rehberi aç
            <ArrowRight className="h-3.5 w-3.5" />
          </span>

          {onKaydet && (
            <button
              type="button"
              aria-pressed={kaydetmeEtiketi ? undefined : kayitli}
              aria-label={kaydetmeEtiketi ?? (kayitli ? 'Kaydı kaldır' : 'Rehberi kaydet')}
              title={kaydetmeEtiketi ?? (kayitli ? 'Kaydı kaldır' : 'Rehberi kaydet')}
              onClick={(e) => {
                /*
                  Kart bir bağlantı; iç düğmenin tıklaması ona ULAŞMAMALI.
                  Yoksa "kaydet"e basan kişi rehbere gidiyordu.
                */
                e.preventDefault();
                e.stopPropagation();
                onKaydet(rehber.slug);
              }}
              /* Dokunma alanı 44 piksel: mobilde küçük ikon hedefi ıskalanıyor. */
              className={`-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                kayitli ? 'text-blue-700 hover:bg-blue-50' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${kayitli ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </a>
  );
};

/**
 * Yükleme iskeleti.
 *
 * Ölçüleri gerçek kartla aynı: içerik gelince ızgara zıplamıyor. Boş bir
 * dönen çark yerine bunu göstermek, sayfanın neye benzeyeceğini önceden
 * anlatıyor.
 */
export const RehberKartiIskeleti: React.FC = () => (
  <div aria-hidden className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <div className="h-32 w-full animate-pulse bg-gray-100 sm:h-36" />
    <div className="flex flex-1 flex-col gap-2 p-3.5">
      <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
      <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-gray-100" />
      <div className="mt-auto h-3 w-24 animate-pulse rounded bg-gray-100" />
    </div>
  </div>
);

/** Kart ızgarası: masaüstü üç, tablet iki, mobil tek sütun. */
export const RehberIzgarasi: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">{children}</div>
);
