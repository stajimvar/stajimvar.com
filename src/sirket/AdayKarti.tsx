import React from 'react';
import { ChevronRight, ExternalLink, ShieldOff } from 'lucide-react';
import {
  SIRKET_KENAR_VURGU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  SIRKET_ODAK,
} from './renk';
import { monogram } from '../lib/aday-kart.mjs';
import { durumAdi, durumRozeti } from './basvuru-durumu';

/**
 * Başvuru satırı — Başvuranlar listesinin tek öğesi.
 *
 * SADE LİSTE (6 Ekim 2026, kullanıcının onayladığı tasarım)
 * ---------------------------------------------------------
 * Satırda yalnız karar için ilk bakılan bilgi var: fotoğraf, ad,
 * başvurulan ilan, okul/bölüm, durum ve başvuru tarihi. Şehir, yetenek
 * etiketleri, uyum bilgisi ve CV işareti listeden çıktı; hepsi aday
 * inceleme ekranında (AdayCekmecesi) duruyor.
 *
 * Bir satır BİR BAŞVURU. Aynı öğrencinin iki ilana başvurusu iki ayrı
 * satır; onları ayıran ilan adı satırda ve erişilebilir adda.
 *
 * NE YOK: overall puanı, stat çubuğu, TCKN, adres, yaş, zorunlu fotoğraf.
 * Karşıdaki gerçek bir öğrenci; sayı uydurulmuyor.
 */

const tarihYaz = (t: string | null) => {
  if (!t) return '';
  const d = new Date(t);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

export interface AdayKart {
  id: string;
  ad: string | null;
  fotoUrl: string | null;
  universite: string | null;
  bolum: string | null;
  sinif: string | null;
  sehir: string | null;
  yetenekler: string[];
  rozetler: string[];
  puan: number | null;
  band: string;
  tarih: string | null;
  durum: string;
  paylasildi: boolean;
  yontem: string;
  cvYolu?: string | null;
  gizli?: boolean;
  /* Başvurulan ilanın başlığı (`listings.title`, sirketBasvurulari). */
  ilanBasligi?: string | null;
}

export const AdayKarti: React.FC<{
  kart: AdayKart;
  /** Gerçekten seçili satır (son açılan aday). Mavi çerçeve yalnız burada. */
  secili: boolean;
  onAc: () => void;
  /** Klavyeyle gezinmede (J/K) odak bu satıra taşınıyor. */
  onOdak?: () => void;
}> = ({ kart, secili, onAc, onOdak }) => {
  const durum = durumRozeti(kart.durum);
  const ilanBasligi = kart.ilanBasligi?.trim() || null;
  const ad = kart.gizli ? 'Aday' : (kart.ad ?? 'Ad paylaşılmadı');
  const bolumSinif = [kart.bolum, kart.sinif].filter(Boolean).join(' · ');
  const tarih = tarihYaz(kart.tarih);

  return (
    <button
      type="button"
      onClick={onAc}
      onFocus={onOdak}
      data-aday-karti={kart.id}
      aria-current={secili ? 'true' : undefined}
      /*
        Erişilebilir ad: ad — ilan — durum — tarih. İlan adı İÇİNDE: aynı
        öğrencinin iki başvurusunu ekran okuyucu ancak ilan adıyla ayırır.
      */
      aria-label={[
        ad,
        ilanBasligi ? `Başvurduğu ilan: ${ilanBasligi}` : null,
        durumAdi(kart.durum),
        tarih ? `Başvuru tarihi: ${tarih}` : null,
      ]
        .filter(Boolean)
        .join(' — ')}
      /*
        TÜM SATIR TIKLANIYOR. Satırın içinde ikinci bir düğme yok; ilan adı
        kesilmediği için genişletme düğmesi de gerekmiyor.

        Mavi çerçeve YALNIZ seçili satırda (`secili`): eskiden ilk kart
        hiçbir şey seçilmeden mavi çerçeveyle açılıyordu. Klavye odağı ayrı
        bir halka (SIRKET_ODAK) — seçim gibi görünmüyor.
      */
      className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-gray-50 sm:px-4 ${SIRKET_ODAK}`}
      style={
        secili
          ? { boxShadow: `inset 0 0 0 2px ${SIRKET_VURGU}`, background: SIRKET_ROZET }
          : undefined
      }
    >
      {kart.fotoUrl && !kart.gizli ? (
        <img src={kart.fotoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black"
          style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU, boxShadow: `inset 0 0 0 1px ${SIRKET_KENAR_VURGU}` }}
        >
          {kart.gizli ? <ShieldOff className="h-4 w-4" /> : monogram(kart.ad)}
        </span>
      )}

      {/*
        AYNI DOM, İKİ YERLEŞİM (grid-template-areas)

        Telefonda: ad + durum, altında tam genişlik ilan adı, en altta
        okul/bölüm + tarih. Geniş ekranda okul/bölüm ikinci sütuna, durum
        ve tarih sağ sütuna geçiyor. Öğeler iki kez çizilmiyor.
      */}
      <span
        className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 [grid-template-areas:'ad_durum'_'ilan_ilan'_'alt_alt'] md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_8rem] md:items-center md:gap-x-6 md:[grid-template-areas:'ad_okul_durum'_'ilan_okul_tarih']"
      >
        <span className="min-w-0 break-words text-[15px] font-extrabold leading-snug [grid-area:ad]" style={{ color: SIRKET_METIN }}>
          {ad}
        </span>

        {/* Rozet gerçek durumu söylüyor; eski süreç kaydı kendi adını (ör. "Görüşme") korur. */}
        <span className="justify-self-end [grid-area:durum]">
          <span
            className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={durum.stil}
          >
            {durum.etiket}
          </span>
        </span>

        {/*
          İLAN ADI METİN SATIRI, KUTU DEĞİL. Kesilmiyor: uzun ad satır
          kırarak tam okunuyor (telefonda da). Bilgi hover'a kalmıyor.
        */}
        {ilanBasligi && (
          <span
            className="min-w-0 break-words text-sm font-bold leading-snug [grid-area:ilan]"
            style={{ color: SIRKET_VURGU_KOYU }}
          >
            {ilanBasligi}
          </span>
        )}

        {/*
          ALT SATIR: telefonda okul/bölüm tam genişlikte, tarih sağda son
          satırla hizalı (durum rozetinin sütununa sıkışmasın). Geniş
          ekranda `md:contents` ile iki öğe ana ızgaranın kendi
          sütunlarına (okul, tarih) dağılıyor.
        */}
        <span className="mt-1 flex min-w-0 items-end gap-3 [grid-area:alt] md:contents">
          <span className="min-w-0 flex-1 text-[13px] leading-snug md:mt-0 md:[grid-area:okul]" style={{ color: SIRKET_METIN_IKINCIL }}>
            {kart.paylasildi ? (
              <>
                {kart.universite && <span className="block break-words">{kart.universite}</span>}
                {bolumSinif && <span className="block break-words">{bolumSinif}</span>}
              </>
            ) : (
              /*
                Şirketin kendi sitesinden gelen başvuruda bizde paylaşılmış
                bir profil yok. Okul uydurmak yerine ne olduğu yazıyor.
              */
              <span className="flex items-start gap-1">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Şirketin kendi sitesinden başvuruldu
              </span>
            )}
          </span>

          <span
            className="shrink-0 whitespace-nowrap text-xs md:self-center md:justify-self-end md:[grid-area:tarih]"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            {tarih}
          </span>
        </span>
      </span>

      <ChevronRight
        aria-hidden
        className="h-5 w-5 shrink-0 self-center transition-transform group-hover:translate-x-0.5"
        style={{ color: SIRKET_METIN_IKINCIL }}
      />
    </button>
  );
};
