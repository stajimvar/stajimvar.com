import React from 'react';
import { Check, Copy, Eye, EyeOff, Users, X } from 'lucide-react';
import { AdayKarti } from './AdayKarti';
import { AdayCekmecesi } from './AdayCekmecesi';
import {
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  ikincilStil,
  kutuStil,
} from './renk';
import { onyargisizla } from '../lib/aday-kart.mjs';

/**
 * Başvuran ızgarası.
 *
 * KLAVYE
 * ------
 * J/K sonraki-önceki, F detay, A kısa liste (incelemeye al), X red.
 * Yirmi kartı fareyle tek tek açıp kapatmak İK'nın en çok vakit
 * kaybettiği yer; klavyede tarama tek elle yapılıyor.
 *
 * Kısayollar yalnızca ızgara odaktayken çalışıyor ve bir metin alanına
 * yazarken devre dışı — yoksa not yazarken "x" tuşu adayı reddederdi.
 *
 * ÖNYARGISIZ İNCELEME
 * -------------------
 * Ad ve fotoğraf gizleniyor, kalan her şey duruyor. İlk elemede ismin
 * çağrıştırdığı cinsiyet, memleket ve etnik köken ipuçlarını devre dışı
 * bırakıyor.
 */

const yaziAlaninda = (h: EventTarget | null) => {
  const e = h as HTMLElement | null;
  if (!e || !e.tagName) return false;
  return (
    e.tagName === 'INPUT' ||
    e.tagName === 'TEXTAREA' ||
    e.tagName === 'SELECT' ||
    e.isContentEditable === true
  );
};

export const AdayIzgarasi: React.FC<{
  kartlar: Record<string, any>[];
  ilanAdresi: string | null;
  onNavigate: (y: string) => void;
  onDurum: (id: string, durum: string) => Promise<void>;
  onNot: (id: string, metin: string) => Promise<void>;
}> = ({ kartlar, ilanAdresi, onNavigate, onDurum, onNot }) => {
  const [onyargisiz, setOnyargisiz] = React.useState(false);
  const [odak, setOdak] = React.useState(0);
  const [acikId, setAcikId] = React.useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [kopyalandi, setKopyalandi] = React.useState(false);

  const gosterilen = React.useMemo(
    () => (onyargisiz ? kartlar.map((k) => onyargisizla(k)) : kartlar),
    [kartlar, onyargisiz]
  );

  const acik = acikId ? (gosterilen.find((k) => k.id === acikId) ?? null) : null;

  const durumUygula = React.useCallback(
    async (id: string, durum: string) => {
      setKaydediliyor(true);
      try {
        await onDurum(id, durum);
      } finally {
        setKaydediliyor(false);
      }
    },
    [onDurum]
  );

  /* Odaktaki kart görünürde kalsın; J ile aşağı inerken ızgara kayıyor. */
  React.useEffect(() => {
    const k = gosterilen[odak];
    if (!k) return;
    document
      .querySelector(`[data-aday-karti="${k.id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [odak, gosterilen]);

  React.useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (yaziAlaninda(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const harf = e.key.toLocaleLowerCase('en-US');
      const mevcut = gosterilen[odak];

      if (harf === 'j') {
        e.preventDefault();
        setOdak((o) => Math.min(o + 1, gosterilen.length - 1));
      } else if (harf === 'k') {
        e.preventDefault();
        setOdak((o) => Math.max(o - 1, 0));
      } else if (harf === 'f' && mevcut) {
        e.preventDefault();
        setAcikId(mevcut.id);
      } else if (harf === 'a' && mevcut) {
        e.preventDefault();
        void durumUygula(mevcut.id, 'under_review');
      } else if (harf === 'x' && mevcut) {
        e.preventDefault();
        void durumUygula(mevcut.id, 'rejected');
      }
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, [gosterilen, odak, durumUygula]);

  if (kartlar.length === 0) {
    return (
      <div className={KUTU} style={kutuStil}>
        <p className="flex items-center gap-2 font-bold" style={{ color: SIRKET_METIN }}>
          <Users className="h-5 w-5" style={{ color: SIRKET_VURGU_KOYU }} />
          Henüz başvuru yok
        </p>
        <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          İlan bağlantısını paylaşınca başvurular buraya kart olarak düşecek.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ilanAdresi && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(ilanAdresi)
                  .then(() => setKopyalandi(true))
                  .catch(() => setKopyalandi(false));
              }}
              className={IKINCIL_DUGME}
              style={ikincilStil}
            >
              {kopyalandi ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {kopyalandi ? 'Kopyalandı' : 'İlan bağlantısını kopyala'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('/sirket/ilanlar')}
            className={IKINCIL_DUGME}
            style={ikincilStil}
          >
            İlanlarıma git
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
          {kartlar.length} başvuru
        </p>

        <button
          type="button"
          onClick={() => setOnyargisiz((o) => !o)}
          aria-pressed={onyargisiz}
          className={IKINCIL_DUGME}
          style={
            onyargisiz
              ? { borderColor: SIRKET_VURGU_KOYU, background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }
              : ikincilStil
          }
        >
          {onyargisiz ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Önyargısız incele
        </button>

        {/*
          Kısayolları yazmak gerekiyor: keşfedilmeyen bir kısayol yok
          sayılır. Dar ekranda gizli — orada klavye yok.
        */}
        <p
          className="ml-auto hidden font-mono text-[11px] sm:block"
          style={{ color: SIRKET_METIN_IKINCIL }}
        >
          J/K gez · F aç · A incelemeye · X reddet
        </p>
      </div>

      {onyargisiz && (
        <p
          className="rounded-xl border px-3 py-2 text-[11px] leading-relaxed"
          style={{ borderColor: SIRKET_KENAR, background: SIRKET_ROZET, color: SIRKET_METIN }}
        >
          Ad ve fotoğraf gizli. Okul, bölüm, yetenekler ve ön yazı görünmeye devam ediyor.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {gosterilen.map((k, i) => (
          <li key={k.id}>
            <AdayKarti
              kart={k as any}
              odakli={i === odak}
              onAc={() => {
                setOdak(i);
                setAcikId(k.id);
              }}
            />
          </li>
        ))}
      </ul>

      <AdayCekmecesi
        kart={acik}
        kaydediliyor={kaydediliyor}
        onKapat={() => setAcikId(null)}
        onDurum={(d) => {
          if (!acik) return;
          void durumUygula(acik.id, d).then(() => setAcikId(null));
        }}
        onNot={(metin) => {
          if (!acik) return;
          setKaydediliyor(true);
          void onNot(acik.id, metin).finally(() => setKaydediliyor(false));
        }}
      />

      {/* Reddedilenler ızgarada kalıyor ama durumu kartın altında yazıyor. */}
      <p className="flex items-center gap-1.5 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
        <X className="h-3 w-3" />
        Reddedilen başvurular listeden silinmiyor; kararın kaydı adayın başvuru sayfasında da
        görünüyor.
      </p>
    </div>
  );
};
