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
  SIRKET_YUZEY,
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
  /*
    ÇEKMECE PORTAL'A ÇİZİLİYOR

    `createPortal` içeriği document.body'ye taşıyor; sarmalayıcıya
    yazılan `lg:hidden` ona işlemiyor. Ölçüldü: geniş ekranda hem yan
    panel hem çekmece birden açılıyordu. Bu yüzden hangisinin çizileceği
    CSS'le değil, ölçülen genişlikle seçiliyor.
  */
  const [genisEkran, setGenisEkran] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    /*
      Hem `matchMedia` değişimi hem `resize` dinleniyor. Yalnızca
      medya sorgusuna güvenmek yetmedi: ölçüldü, bazı ortamlarda
      genişlik değişince `change` olayı gelmiyor ve durum bayat kalıyor —
      o zaman dar ekranda ne yan panel ne çekmece açılıyordu, yani aday
      ayrıntısına HİÇ ulaşılamıyordu.
    */
    const uygula = () => setGenisEkran(window.innerWidth >= 1024);
    uygula();
    const sorgu = window.matchMedia?.('(min-width: 1024px)');
    sorgu?.addEventListener('change', uygula);
    window.addEventListener('resize', uygula);
    return () => {
      sorgu?.removeEventListener('change', uygula);
      window.removeEventListener('resize', uygula);
    };
  }, []);

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
          Kısayollar GERÇEKTEN çalışıyor (aşağıdaki klavye dinleyicisi).
          Yazmak gerekiyor: keşfedilmeyen bir kısayol yok sayılır. Ama
          serbest metin gibi havada durmasın diye tuşlar <kbd> ile
          çiziliyor ve satırın sonunda, listeyle aynı hizada duruyor.
          Dar ekranda gizli — orada klavye yok.
        */}
        <p
          className="ml-auto hidden items-center gap-1.5 text-[11px] sm:flex"
          style={{ color: SIRKET_METIN_IKINCIL }}
        >
          {[
            ['J / K', 'gez'],
            ['F', 'aç'],
            ['A', 'incelemeye'],
            ['X', 'reddet'],
          ].map(([tus, ne]) => (
            <span key={tus} className="inline-flex items-center gap-1">
              <kbd
                className="rounded border px-1 font-mono text-[10px] font-bold"
                style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }}
              >
                {tus}
              </kbd>
              {ne}
            </span>
          ))}
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

      {/*
        GENİŞ EKRANDA LİSTE + AYRINTI

        Kartlar dört sütuna yayılınca sağ taraf boş kalıyor ve aday
        ayrıntısı ancak üstü kapatan bir çekmeceyle görülebiliyordu:
        şirket bir adayı okurken listeyi kaybediyordu. Artık solda tarama,
        sağda inceleme — aynı anda ikisi de görünüyor.

        Dar ekranda düzen aynı kalıyor: liste tam genişlik, ayrıntı
        çekmeceden geliyor. Masaüstü düzenini telefona sıkıştırmak iki
        sütunu da okunmaz yapardı.
      */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-4">
        <ul className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {gosterilen.map((k, i) => (
            <li key={k.id} className="flex">
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

        {/* Yan panel yalnızca geniş ekranda ve bir aday seçiliyken. */}
        <aside className="mt-4 hidden lg:sticky lg:top-20 lg:mt-0 lg:block">
          {genisEkran && acik ? (
            <AdayCekmecesi
              gomulu
              kart={acik}
              kaydediliyor={kaydediliyor}
              onKapat={() => setAcikId(null)}
              onDurum={(d) => {
                if (!acik) return;
                void durumUygula(acik.id, d);
              }}
              onNot={(metin) => {
                if (!acik) return;
                setKaydediliyor(true);
                void onNot(acik.id, metin).finally(() => setKaydediliyor(false));
              }}
            />
          ) : (
            <div
              className={`${KUTU} text-center`}
              style={{ ...kutuStil, borderStyle: 'dashed' }}
            >
              <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
                Bir aday seçin
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                Karta tıklayın ya da <b>J</b>/<b>K</b> ile gezip <b>F</b> ile açın; ayrıntı
                burada görünür.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Dar ekranda ayrıntı çekmeceden geliyor. */}
      <div>
        <AdayCekmecesi
          kart={genisEkran ? null : acik}
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
      </div>

      {/* Reddedilenler ızgarada kalıyor ama durumu kartın altında yazıyor. */}
      <p className="flex items-center gap-1.5 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
        <X className="h-3 w-3" />
        Reddedilen başvurular listeden silinmiyor; kararın kaydı adayın başvuru sayfasında da
        görünüyor.
      </p>
    </div>
  );
};
