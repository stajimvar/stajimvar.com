import React from 'react';
import { Check, Copy, Eye, EyeOff, Search, Users } from 'lucide-react';
import { AdayKarti } from './AdayKarti';
import { AdayCekmecesi, type Iletisim } from './AdayCekmecesi';
import {
  ALAN,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  alanStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { onyargisizla } from '../lib/aday-kart.mjs';
import { DURUM_SIRASI, durumAdi } from './basvuru-durumu';
import { AdayHataSiniri } from './HataSiniri';

/**
 * Başvuran ızgarası.
 *
 * KLAVYE — GİZLİ, ÖĞRETİLMİYOR
 * ----------------------------
 * J/K sonraki-önceki, F detay, A incelemeye al, X red. Kısayollar
 * ÇALIŞIYOR ama arayüzde HİÇ YAZMIYOR: paneli ilk açan bir İK
 * çalışanına klavye dizilimi öğretmek, ekranı terminal gibi
 * gösteriyordu. Her işin görünür bir düğmesi var; kısayol yalnızca çok
 * kullananın kendiliğinden keşfedeceği bir hızlandırıcı.
 *
 * Bir metin alanına yazarken devre dışı — yoksa not yazarken "x" tuşu
 * adayı reddederdi.
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
  onMulakatTarihi: (id: string, tarih: string) => Promise<void>;
  onTeklif: (id: string, teklif: { not: string; baslangic: string; ucret: string }) => Promise<void>;
  onDavet: (id: string, davet: { tarih: string; saat: string; tur: string; yer: string; not: string }) => Promise<void>;
  onIletisim: (id: string) => Promise<Iletisim | null>;
  onNot: (id: string, metin: string) => Promise<void>;
}> = ({
  kartlar,
  ilanAdresi,
  onNavigate,
  onDurum,
  onMulakatTarihi,
  onTeklif,
  onDavet,
  onIletisim,
  onNot,
}) => {
  const [onyargisiz, setOnyargisiz] = React.useState(false);
  const [ilanSuzgeci, setIlanSuzgeci] = React.useState('');
  const [durumSuzgeci, setDurumSuzgeci] = React.useState('');
  const [arama, setArama] = React.useState('');
  const [odak, setOdak] = React.useState(0);
  const [acikId, setAcikId] = React.useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [kopyalandi, setKopyalandi] = React.useState(false);

  /* İlan süzgecinin seçenekleri gelen başvurulardan türüyor; boş bir
     ilan listesi göstermenin anlamı yok. */
  const ilanSecenekleri = React.useMemo(() => {
    const harita = new Map<string, string>();
    for (const k of kartlar) {
      if (k.ilanId) harita.set(String(k.ilanId), String(k.ilanBasligi ?? 'İlan'));
    }
    return [...harita].map(([id, baslik]) => ({ id, baslik }));
  }, [kartlar]);

  const suzulmus = React.useMemo(() => {
    const terim = arama.trim().toLocaleLowerCase('tr-TR');
    return kartlar.filter((k) => {
      if (ilanSuzgeci && String(k.ilanId ?? '') !== ilanSuzgeci) return false;
      if (durumSuzgeci && String(k.durum ?? '') !== durumSuzgeci) return false;
      if (!terim) return true;
      /* Ad, okul, bölüm ve yetenekler aranıyor — İK'nın aklında kalan
         şeyler bunlar. */
      const havuz = [k.ad, k.universite, k.bolum, k.sehir, ...(k.yetenekler ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return havuz.includes(terim);
    });
  }, [kartlar, ilanSuzgeci, durumSuzgeci, arama]);

  const gosterilen = React.useMemo(
    () => (onyargisiz ? suzulmus.map((k) => onyargisizla(k)) : suzulmus),
    [suzulmus, onyargisiz]
  );

  /*
    AÇIK ADAY SÜZGEÇTEN BAĞIMSIZ

    Açık kart `gosterilen` (süzülmüş liste) içinden aranıyordu. "Mülakat"
    süzgeci açıkken adayı olumsuza almak kartı listeden çıkarıyor, bu da
    ÇEKMECEYİ ANINDA KAPATIYORDU: şirket kararının sonucunu göremiyordu.

    Kaynak artık ham liste; süzgeç neyin listelendiğini belirliyor, açık
    olan adayı değil. `onyargisizla` ayrıca uygulanıyor ki önyargısız
    mod çekmecede de sürsün.
  */
  const acikHam = acikId ? (kartlar.find((k) => k.id === acikId) ?? null) : null;
  const acik = acikHam && onyargisiz ? onyargisizla(acikHam) : acikHam;

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
      {/* --------------------------------------------------- başlık */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-black" style={{ color: SIRKET_METIN }}>
          Başvuranlar
        </h1>
        <p className="text-sm font-semibold" style={{ color: SIRKET_METIN_IKINCIL }}>
          {suzulmus.length === kartlar.length
            ? `${kartlar.length} aday`
            : `${suzulmus.length} / ${kartlar.length} aday`}
        </p>
      </div>

      {/*
        SÜZGEÇLER — TANIDIK ÜÇLÜ

        İlan, durum ve arama. Hepsi görünür kontrol; öğrenmesi gereken bir
        şey yok. Kısayol ipucu kaldırıldı: panelin ilk defa açan bir İK
        çalışanına klavye dizilimi öğretmesi gerekmiyor.
      */}
      <div className="flex flex-wrap items-center gap-2">
        {ilanSecenekleri.length > 1 && (
          <select
            value={ilanSuzgeci}
            onChange={(e) => setIlanSuzgeci(e.target.value)}
            aria-label="İlana göre süz"
            className={ALAN}
            /* ALAN `w-full` taşıyor; süzgeç satırında genişlik satır içi
               veriliyor, yoksa seçici tüm satırı kaplayıp aramayı alt
               satıra itiyor. */
            style={{ ...alanStil, width: 'auto', minWidth: 160, maxWidth: '100%' }}
          >
            <option value="">Tüm ilanlar</option>
            {ilanSecenekleri.map((i) => (
              <option key={i.id} value={i.id}>
                {i.baslik}
              </option>
            ))}
          </select>
        )}

        <select
          value={durumSuzgeci}
          onChange={(e) => setDurumSuzgeci(e.target.value)}
          aria-label="Duruma göre süz"
          className={ALAN}
          style={{ ...alanStil, width: 'auto', minWidth: 150 }}
        >
          <option value="">Tüm durumlar</option>
          {DURUM_SIRASI.map((d) => (
            <option key={d} value={d}>
              {durumAdi(d)}
            </option>
          ))}
        </select>

        <label className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: SIRKET_METIN_IKINCIL }}
            aria-hidden
          />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Aday ara"
            aria-label="Aday ara"
            className={`${ALAN} pl-9`}
            style={alanStil}
          />
        </label>

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
      </div>

      {onyargisiz && (
        <p
          className="rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
          style={{ borderColor: SIRKET_KENAR, background: SIRKET_ROZET, color: SIRKET_METIN }}
        >
          Ad ve fotoğraf gizli. Okul, bölüm, yetenekler ve ön yazı görünmeye devam ediyor.
        </p>
      )}

      {/*
        LİSTE EKRANI DOLDURUYOR

        Önce solda kartlar, sağda kalıcı bir "Bir aday seçin" paneli
        vardı: kimse bir adaya tıklamadan ekranın yarısı boş duruyordu.
        Artık kartlar tüm alanı kullanıyor ve ayrıntı yalnızca bir karta
        tıklanınca açılıyor — listeye dönünce liste yine ekranı dolduruyor.
      */}
      {suzulmus.length === 0 ? (
        <div className={`${KUTU} text-center`} style={kutuStil}>
          <p className="font-bold" style={{ color: SIRKET_METIN }}>
            Bu süzgeçle eşleşen aday yok
          </p>
          <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            Süzgeçleri temizleyip tüm başvuruları görebilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => {
              setIlanSuzgeci('');
              setDurumSuzgeci('');
              setArama('');
            }}
            className={`mx-auto mt-4 ${IKINCIL_DUGME}`}
            style={ikincilStil}
          >
            Süzgeçleri temizle
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
      )}

      {/*
        Ayrıntı: dar ekranda tam ekran, geniş ekranda sağdan çekmece.

        Hata sınırıyla sarılı: bir adayın beklenmedik bir alanı ayrıntıyı
        çizerken hata verirse kaybedilecek şey o kart olsun, panelin
        tamamı değil. Sınır kök nedeni gizlemek için değil — asıl hata
        (erken çıkıştan sonra çağrılan hook) düzeltildi.
      */}
      <AdayHataSiniri onKapat={() => setAcikId(null)}>
        <AdayCekmecesi
          kart={acik}
          kaydediliyor={kaydediliyor}
          onKapat={() => setAcikId(null)}
          /*
            ÇEKMECE AÇIK KALIYOR

            Eskiden her durum değişimi çekmeceyi kapatıyordu; şirket
            adayı yeniden açmadan sonucu göremiyordu. Artık durum
            yerinde güncelleniyor. Hata da söz olarak geri veriliyor:
            çekmece kendi içinde satır içi gösteriyor.
          */
          onDurum={(d) => {
            if (!acik) return Promise.resolve();
            return durumUygula(acik.id, d);
          }}
          onMulakatTarihi={(tarih) => {
            if (!acik) return Promise.resolve();
            return onMulakatTarihi(acik.id, tarih);
          }}
          /* Teklif de aynı yükleniyor durumunu paylaşıyor. */
          onTeklif={(teklif) => {
            if (!acik) return Promise.resolve();
            setKaydediliyor(true);
            return onTeklif(acik.id, teklif).finally(() => setKaydediliyor(false));
          }}
          /* Davet de aynı yükleniyor durumunu paylaşıyor. */
          onDavet={(davet) => {
            if (!acik) return Promise.resolve();
            setKaydediliyor(true);
            return onDavet(acik.id, davet).finally(() => setKaydediliyor(false));
          }}
          onIletisim={onIletisim}
          onNot={(metin) => {
            if (!acik) return;
            setKaydediliyor(true);
            void onNot(acik.id, metin).finally(() => setKaydediliyor(false));
          }}
        />
      </AdayHataSiniri>

      <p className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
        Reddedilen başvurular listeden silinmiyor; kararın kaydı adayın başvuru sayfasında da
        görünüyor.
      </p>
    </div>
  );
};
