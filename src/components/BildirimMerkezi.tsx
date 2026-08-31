import React from 'react';
import { createPortal } from 'react-dom';
import { Bell, Briefcase, CalendarClock, CheckCircle2, FileText, X } from 'lucide-react';
import { gecenSure, type Bildirim } from '../lib/bildirim';

/**
 * BİLDİRİM MERKEZİ — İKİ DÜNYA, TEK SİSTEM
 *
 * Öğrenci tarafı mavi, işveren paneli yeşil-beyaz. Bildirim aynı
 * sistemden geliyor ama bulunduğu dünyanın rengini alıyor: aynı bileşen,
 * dışarıdan verilen tek bir vurgu rengi.
 *
 * Bu bir OLAY GÜNLÜĞÜ DEĞİL. Satırlar kompakt, tür dizesi ekranda
 * görünmüyor, tablo yok: yalnız ikon, başlık, kısa açıklama ve zaman.
 *
 * Dar ekranda alttan tam yükseklikte panel, geniş ekranda sağa hizalı
 * açılır kutu.
 */

/** Bildirim türünden ikon. Tanınmayan türde nötr bir belge ikonu. */
function BildirimIkonu({ tur, renk }: { tur: string; renk: string }) {
  const ortak = { className: 'h-4 w-4 shrink-0', style: { color: renk } };
  if (tur === 'gorusme_daveti' || tur === 'gorusme_guncellendi') return <CalendarClock {...ortak} />;
  if (tur === 'teklif' || tur === 'teklif_kabul') return <CheckCircle2 {...ortak} />;
  if (tur === 'yeni_basvuru') return <Briefcase {...ortak} />;
  return <FileText {...ortak} />;
}

export const BildirimRozeti: React.FC<{ sayi: number | null; renk: string }> = ({ sayi, renk }) => {
  /*
    SAYI BİLİNMİYORSA ROZET ÇİZİLMİYOR

    `null` "henüz yüklenmedi" demek. Önce 0 gösterip sonra 3'e zıplamak,
    kullanıcının gözünde rozetin güvenilirliğini bitiriyor.
  */
  if (sayi === null || sayi <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
      style={{ background: renk }}
    >
      {sayi > 9 ? '9+' : sayi}
    </span>
  );
};

export const BildirimMerkezi: React.FC<{
  bildirimler: Bildirim[];
  okunmamis: number | null;
  yukleniyor: boolean;
  /* Dünyanın vurgu rengi: öğrenci mavi, işveren yeşil. */
  renk: string;
  onKapat: () => void;
  onAc: (b: Bildirim) => void;
  onTumunuOkundu: () => void;
}> = ({ bildirimler, okunmamis, yukleniyor, renk, onKapat, onAc, onTumunuOkundu }) => {
  const kapsayici = React.useRef<HTMLDivElement>(null);

  /* Escape ile kapanıyor ve açılınca odak panele giriyor. */
  React.useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onKapat();
    };
    document.addEventListener('keydown', tus);
    kapsayici.current?.focus();
    return () => document.removeEventListener('keydown', tus);
  }, [onKapat]);

  const govde = (
    <div
      ref={kapsayici}
      tabIndex={-1}
      role="dialog"
      aria-label="Bildirimler"
      className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:max-h-[70vh] sm:w-96 sm:rounded-2xl sm:border sm:border-gray-200"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-extrabold text-gray-900">Bildirimler</h2>
        <div className="flex items-center gap-1">
          {/* Yalnız okunmamış varsa: yapacak bir şey yokken düğme göstermenin anlamı yok. */}
          {(okunmamis ?? 0) > 0 && (
            <button
              type="button"
              onClick={onTumunuOkundu}
              className="min-h-9 rounded-lg px-2 text-xs font-bold"
              style={{ color: renk }}
            >
              Tümü okundu
            </button>
          )}
          <button
            type="button"
            onClick={onKapat}
            aria-label="Bildirimleri kapat"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto overscroll-contain">
        {yukleniyor ? (
          <p className="px-4 py-8 text-center text-xs text-gray-500">Yükleniyor…</p>
        ) : bildirimler.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">Henüz bildirimin yok.</p>
        ) : (
          <ul>
            {bildirimler.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onAc(b)}
                  className="flex w-full min-h-11 items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  style={b.okunduMu ? undefined : { background: '#F8FAFF' }}
                >
                  <span className="mt-0.5">
                    <BildirimIkonu tur={b.tur} renk={b.okunduMu ? '#9CA3AF' : renk} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-xs ${
                          b.okunduMu ? 'font-semibold text-gray-700' : 'font-extrabold text-gray-900'
                        }`}
                      >
                        {b.baslik}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400">{gecenSure(b.tarih)}</span>
                    </span>
                    {b.govde && (
                      <span className="mt-0.5 block truncate text-[11px] text-gray-500">{b.govde}</span>
                    )}
                    {/*
                      OKUNMAMIŞ YALNIZCA RENKLE ANLATILMIYOR: yanına
                      metin de yazılıyor, ekran okuyucu ve renk ayrımı
                      güçlüğü olan kullanıcı için.
                    */}
                    {!b.okunduMu && (
                      <span className="mt-0.5 inline-block text-[10px] font-bold" style={{ color: renk }}>
                        Yeni
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return createPortal(
    <>
      {/* Panel dışına dokunmak kapatıyor. */}
      <div
        className="fixed inset-0 z-[190] bg-black/25 sm:bg-transparent"
        onClick={onKapat}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-[200] flex justify-center sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-16 sm:justify-end">
        {govde}
      </div>
    </>,
    document.body,
  );
};

/** Header'daki zil düğmesi. Rozet yalnız sayı bilindiğinde çiziliyor. */
export const BildirimDugmesi: React.FC<{
  okunmamis: number | null;
  renk: string;
  onAc: () => void;
  className?: string;
  style?: React.CSSProperties;
}> = ({ okunmamis, renk, onAc, className, style }) => (
  <button
    type="button"
    onClick={onAc}
    aria-label={
      okunmamis && okunmamis > 0 ? `Bildirimler, ${okunmamis} okunmamış` : 'Bildirimler'
    }
    className={
      className ??
      'relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100'
    }
    style={style}
  >
    <Bell className="h-5 w-5" />
    <BildirimRozeti sayi={okunmamis} renk={renk} />
  </button>
);
