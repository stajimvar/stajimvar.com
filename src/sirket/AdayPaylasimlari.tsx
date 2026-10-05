import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, EyeOff, ImageOff, Loader2, Lock, X } from 'lucide-react';
import {
  IKINCIL_DUGME,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  SIRKET_YUZEY,
  ikincilStil,
} from './renk';
import { SOSYAL_PAYLASIM_KOVASI } from '../lib/queries/sosyal';
import { useGorselAdresleri } from '../components/sosyal/useGorselAdresleri';
import { tarihMetni } from '../lib/tarih.mjs';
import type { AdayPaylasimi } from '../lib/sirket-veri';

/**
 * ADAYIN PAYLAŞIMLARI — YALNIZ ÖĞRENCİNİN İZİN VERDİĞİ BAŞVURUDA
 *
 * KAPI SUNUCUDA
 * -------------
 * `basvuru_aday_paylasimlari` (20261121010000) üç cevap veriyor ve
 * ekranın dört cümlesi bunlardan çıkıyor:
 *   izin: false            → öğrenci bu başvuruda izin vermedi (eski
 *                            başvurular dahil; geriye dönük onay yok)
 *   profilGorunur: false   → izin var ama sosyal profil şu an gizli
 *   paylasimlar: []        → izin var, profil açık, gönderi yok
 *   paylasimlar: [...]     → ızgara
 * "İzin yok" ile "henüz paylaşım yok" AYRI cümleler: birincisi bir yetki
 * durumu, ikincisi içerik hakkında bir bilgi.
 *
 * GÖRSEL İMZALI ADRESLE DEĞİL, İNDİRMEYLE
 * ---------------------------------------
 * Her görsel `useGorselAdresleri` → `gorselIndir` ile şirket üyesinin
 * oturumundan geçerek iniyor ve yalnız bu sekmenin belleğinde bir adrese
 * bağlanıyor. İmzalı adres üretilmiyor: ölçüldü (useGorselAdresleri
 * başlığı), bir kez verilen imza RLS'i yeniden sormuyor — öğrenci izni
 * geri aldığında eski imza ömrü dolana kadar çalışmaya devam ederdi.
 * Depolama izni dar: yalnız izin verilmiş başvurunun yazarının, yayında
 * profilindeki paylaşımın dosyası.
 *
 * ÖNYARGISIZ İNCELEMEDE GÖRSEL DE AÇIKLAMA DA YOK
 * ----------------------------------------------
 * Ad ve fotoğrafın gizlendiği kipte paylaşım görselleri adayın yüzünü,
 * açıklamalar adını ya da çevresini gösterebilir. İkisi de çizilmiyor ve
 * görseller İNDİRİLMİYOR (yol listesi boş geçiyor); liste de bu kipte
 * sunucudan istenmiyor. Görmek için önyargısız inceleme kapatılıyor.
 *
 * NEDEN PaylasimIzgarasi/PaylasimDetayi DEĞİL
 * -------------------------------------------
 * O bileşenler sosyal yüzeyin parçası: ayrıntı katmanı beğeni, kaydetme
 * ve sahibe arşiv eylemi taşıyor ve `SosyalPaylasim` satırı istiyor. Bu
 * yüzey o eylemleri şirkete AÇMIYOR (göç: "paylaşımlar şirketin akışına,
 * beğeni ya da yorum yüzeyine açılmıyor"). Burada yalnız salt okunur bir
 * ızgara ve görsel görüntüleyici var; indirme kancası ortak.
 */

export type PaylasimSonucu = {
  izin: boolean;
  izinTarihi: string | null;
  profilGorunur: boolean;
  kullaniciAdi: string | null;
  paylasimlar: AdayPaylasimi[];
};
export type PaylasimYukleyici = (basvuruId: string) => Promise<PaylasimSonucu>;

/*
  İLK 12 GÖNDERİ, SONRA İSTEĞE BAĞLI

  Sunucu en çok 60 gönderi döndürüyor ve her kapak ayrı bir indirme.
  Ekran açılır açılmaz 60 indirme başlatmak, şirketin büyük olasılıkla
  bakmayacağı görselleri indirmek olurdu; kalan gönderiler tek dokunuşla
  açılıyor. 12: üç sütunlu ızgarada dört satır.
*/
const ILK_GOSTERIM = 12;

type Gorsel = {
  paylasimId: string;
  yol: string;
  alt: string | null;
  aciklama: string | null;
  tarih: string;
  sira: number;
  toplam: number;
};

const ODAKLANABILIR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Görsel görüntüleyici.
 *
 * Escape kapatıyor, ← → ile tüm görseller arasında geçiliyor, Tab
 * görüntüleyicinin içinde dönüyor, kapanınca odak açan karta geri
 * dönüyor. Dinleyici YAKALAMA evresinde ve olayı durduruyor: inceleme
 * ekranının kendi Escape dinleyicisi aynı tuşta ekranın tamamını
 * kapatmasın, yalnız görüntüleyici kapansın.
 */
const Goruntuleyici: React.FC<{
  gorseller: Gorsel[];
  baslangic: number;
  hazirAdresler: Map<string, string>;
  yerelGorselAdresi?: (yol: string) => string | null;
  tetikleyici: HTMLElement | null;
  onKapat: () => void;
}> = ({ gorseller, baslangic, hazirAdresler, yerelGorselAdresi, tetikleyici, onKapat }) => {
  const [sira, setSira] = React.useState(baslangic);
  const kutu = React.useRef<HTMLDivElement | null>(null);
  const kapatDugmesi = React.useRef<HTMLButtonElement | null>(null);
  const kapatRef = React.useRef(onKapat);
  kapatRef.current = onKapat;

  const gorsel = gorseller[sira];
  const yerel = gorsel && yerelGorselAdresi ? yerelGorselAdresi(gorsel.yol) : null;
  const hazir = gorsel ? (hazirAdresler.get(gorsel.yol) ?? null) : null;
  /* Izgara kapağı zaten indirdiyse ikinci kez indirilmiyor. */
  const { durum, adresler } = useGorselAdresleri(
    SOSYAL_PAYLASIM_KOVASI,
    gorsel && !yerel && !hazir ? [gorsel.yol] : [],
  );
  const adres = yerel ?? hazir ?? (gorsel ? (adresler.get(gorsel.yol) ?? null) : null);

  const onceki = React.useCallback(() => setSira((s) => (s > 0 ? s - 1 : s)), []);
  const sonraki = React.useCallback(
    () => setSira((s) => (s < gorseller.length - 1 ? s + 1 : s)),
    [gorseller.length],
  );

  React.useEffect(() => {
    kapatDugmesi.current?.focus();
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        kapatRef.current();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        onceki();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        sonraki();
      } else if (e.key === 'Tab') {
        const ogeler = Array.from(kutu.current?.querySelectorAll<HTMLElement>(ODAKLANABILIR) ?? []);
        if (ogeler.length === 0) return;
        const ilk = ogeler[0];
        const son = ogeler[ogeler.length - 1];
        if (e.shiftKey && document.activeElement === ilk) {
          e.preventDefault();
          son.focus();
        } else if (!e.shiftKey && document.activeElement === son) {
          e.preventDefault();
          ilk.focus();
        } else if (!kutu.current?.contains(document.activeElement)) {
          e.preventDefault();
          ilk.focus();
        }
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', tus, true);
    return () => {
      document.removeEventListener('keydown', tus, true);
      /* Katman sökülmeden önce odak açan karta: yoksa body'ye düşerdi. */
      if (tetikleyici?.isConnected) tetikleyici.focus();
    };
  }, [onceki, sonraki, tetikleyici]);

  if (!gorsel) return null;

  const tarih = tarihMetni(gorsel.tarih);
  const sayac = `Görsel ${sira + 1} / ${gorseller.length}`;

  return createPortal(
    <div className="fixed inset-0 z-[130]">
      <div className="absolute inset-0 bg-black/95" onClick={onKapat} aria-hidden />
      <div
        ref={kutu}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aday-goruntuleyici-sayac"
        className="absolute inset-0 flex flex-col p-3 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Sayaç canlı bölge: ok tuşuyla geçince ekran okuyucu yeni sırayı duyuyor. */}
          <p id="aday-goruntuleyici-sayac" aria-live="polite" className="text-sm font-bold text-white">
            {sayac}
          </p>
          <button
            ref={kapatDugmesi}
            type="button"
            onClick={onKapat}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/20 ${SIRKET_ODAK}`}
          >
            <X className="h-5 w-5" aria-hidden />
            Kapat
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center py-3" onClick={onKapat}>
          {adres ? (
            <img
              src={adres}
              /*
                `alt` yazarın yazdığı metin; yazmadıysa boş. "Paylaşım görseli"
                gibi bir doldurma içerik hakkında bir şey söylemezdi. Görselin
                bağlamı altta açıklama ve sayaçla okunuyor.
              */
              alt={gorsel.alt ?? ''}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          ) : durum === 'yukleniyor' ? (
            <Loader2 className="h-8 w-8 animate-spin text-white" aria-label="Görsel yükleniyor" />
          ) : (
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              <ImageOff className="h-5 w-5" aria-hidden />
              Görsel açılamadı
            </p>
          )}
        </div>

        <div className="mx-auto w-full max-w-3xl space-y-2">
          {(gorsel.aciklama || tarih) && (
            <p className="max-h-24 overflow-y-auto break-words text-sm leading-relaxed text-white/90">
              {gorsel.aciklama}
              {gorsel.aciklama && tarih ? ' · ' : ''}
              {tarih && <span className="text-white/70">{tarih}</span>}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onceki}
              disabled={sira === 0}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-xl bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 ${SIRKET_ODAK}`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
              Önceki
            </button>
            <button
              type="button"
              onClick={sonraki}
              disabled={sira === gorseller.length - 1}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-xl bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 ${SIRKET_ODAK}`}
            >
              Sonraki
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const KART_KABI = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

export const AdayPaylasimlari: React.FC<{
  basvuruId: string;
  /** Önyargısız inceleme: liste istenmiyor, görsel inmiyor. */
  gizli: boolean;
  yukle: PaylasimYukleyici;
  /**
   * YALNIZ GELİŞTİRME FİKSTÜRÜ: depolama yerine yerel bir dosya adresi.
   * Üretimde verilmiyor (SirketPaneli geçirmiyor); verildiğinde de yalnız
   * indirmenin yerini alıyor, izin ve gizlilik dalları aynen çalışıyor.
   */
  yerelGorselAdresi?: (yol: string) => string | null;
}> = ({ basvuruId, gizli, yukle, yerelGorselAdresi }) => {
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [veri, setVeri] = React.useState<PaylasimSonucu | null>(null);
  const [deneme, setDeneme] = React.useState(0);
  const [hepsi, setHepsi] = React.useState(false);
  const [acik, setAcik] = React.useState<{ sira: number; tetik: HTMLElement } | null>(null);

  React.useEffect(() => {
    setVeri(null);
    setHepsi(false);
    setAcik(null);
    if (gizli) return undefined;
    let iptal = false;
    setDurum('yukleniyor');
    yukle(basvuruId)
      .then((s) => {
        if (iptal) return;
        setVeri(s);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [basvuruId, gizli, yukle, deneme]);

  const paylasimlar = React.useMemo(
    () => (veri?.izin && veri.profilGorunur ? veri.paylasimlar : []),
    [veri],
  );
  const gorunen = hepsi ? paylasimlar : paylasimlar.slice(0, ILK_GOSTERIM);

  /* Görüntüleyicinin geçtiği düz liste: her gönderinin her görseli, sırayla. */
  const gorseller = React.useMemo<Gorsel[]>(
    () =>
      gorunen.flatMap((p) => {
        const medya = Array.isArray(p.medya) ? p.medya.filter((m) => m && m.yol) : [];
        return medya.map((m, i) => ({
          paylasimId: p.id,
          yol: m.yol,
          alt: m.alt ?? null,
          aciklama: p.aciklama ?? null,
          tarih: p.tarih,
          sira: i,
          toplam: medya.length,
        }));
      }),
    [gorunen],
  );

  const kapakYollari = React.useMemo(
    () =>
      gorunen
        .map((p) => (Array.isArray(p.medya) ? p.medya.find((m) => m && m.yol)?.yol : undefined))
        .filter((y): y is string => Boolean(y)),
    [gorunen],
  );
  /* Önyargısız kipte ve fikstürde indirme yok: yol listesi boş. */
  const { durum: kapakDurumu, adresler } = useGorselAdresleri(
    SOSYAL_PAYLASIM_KOVASI,
    gizli || yerelGorselAdresi ? [] : kapakYollari,
  );
  const kapakAdresi = (yol: string | undefined) =>
    !yol ? null : yerelGorselAdresi ? yerelGorselAdresi(yol) : (adresler.get(yol) ?? null);

  const baslik = (
    <h3 id="aday-paylasimlari" className="text-base font-extrabold" style={{ color: SIRKET_METIN }}>
      Paylaşımlar
    </h3>
  );

  const bilgi = (ikon: React.ReactNode, metin: string, alt?: string) => (
    <div
      className="flex items-start gap-2.5 rounded-2xl border p-3.5"
      style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
    >
      <span className="mt-0.5 shrink-0" style={{ color: SIRKET_METIN_IKINCIL }} aria-hidden>
        {ikon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: SIRKET_METIN }}>
          {metin}
        </p>
        {alt && (
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
            {alt}
          </p>
        )}
      </div>
    </div>
  );

  let govde: React.ReactNode;
  if (gizli) {
    govde = bilgi(
      <EyeOff className="h-4 w-4" />,
      'Önyargısız incelemede paylaşımlar gizli.',
      'Paylaşım görselleri ve açıklamaları adayın kimliğini açığa çıkarabileceği için bu kipte gösterilmiyor. Görmek için önyargısız incelemeyi kapatın.',
    );
  } else if (durum === 'yukleniyor') {
    govde = (
      <div aria-busy="true" className="space-y-2">
        <p className="flex items-center gap-2 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Paylaşımlar yükleniyor…
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className={KART_KABI}>
              <div className="aspect-square w-full animate-pulse rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  } else if (durum === 'hata') {
    govde = (
      <div className="rounded-2xl border p-3.5" style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}>
        <p role="alert" className="text-sm font-semibold" style={{ color: '#991B1B' }}>
          Paylaşımlar alınamadı.
        </p>
        <p className="mt-0.5 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
          Bağlantı ya da sunucu kaynaklı olabilir; adayın izin durumu bilinmiyor.
        </p>
        <button
          type="button"
          onClick={() => setDeneme((d) => d + 1)}
          className={`mt-3 ${IKINCIL_DUGME}`}
          style={ikincilStil}
        >
          Yeniden dene
        </button>
      </div>
    );
  } else if (!veri?.izin) {
    govde = bilgi(
      <Lock className="h-4 w-4" />,
      'Aday bu başvuruda paylaşımlarını göstermeye izin vermedi.',
      'Paylaşım izni isteğe bağlı ve başvuru başına veriliyor; aday dilediğinde Başvurularım sayfasından açabilir.',
    );
  } else if (!veri.profilGorunur) {
    govde = bilgi(<Lock className="h-4 w-4" />, 'Adayın sosyal profili şu an gizli.');
  } else if (paylasimlar.length === 0) {
    govde = bilgi(<ImageOff className="h-4 w-4" />, 'Adayın profilinde henüz paylaşım yok.');
  } else {
    govde = (
      <>
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {gorunen.map((p) => {
            const medya = Array.isArray(p.medya) ? p.medya.filter((m) => m && m.yol) : [];
            const kapak = medya[0];
            const adres = kapakAdresi(kapak?.yol);
            const tarih = tarihMetni(p.tarih);
            const ilkSira = gorseller.findIndex((g) => g.paylasimId === p.id);
            const icerik = (
              <>
                <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
                  {kapak && adres ? (
                    <img src={adres} alt={kapak.alt ?? ''} loading="lazy" className="h-full w-full object-cover" />
                  ) : kapak && kapakDurumu === 'yukleniyor' && !yerelGorselAdresi ? (
                    <span aria-hidden className="block h-full w-full animate-pulse bg-gray-100" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-gray-600">
                      {kapak ? 'Görsel açılamadı' : 'Görsel yok'}
                    </span>
                  )}
                </span>
                {p.aciklama && (
                  <span className="line-clamp-3 block break-words text-left text-[13px] leading-snug text-gray-900">
                    {p.aciklama}
                  </span>
                )}
                <span className="block text-left text-[11px] text-gray-600">
                  {[tarih, medya.length > 1 ? `${medya.length} görsel` : null].filter(Boolean).join(' · ')}
                </span>
              </>
            );
            return (
              <li key={p.id} className="flex min-w-0">
                {medya.length > 0 && ilkSira >= 0 ? (
                  <button
                    type="button"
                    onClick={(e) => setAcik({ sira: ilkSira, tetik: e.currentTarget })}
                    aria-label={`${tarih ? `${tarih} tarihli ` : ''}paylaşımın görsellerini büyük aç${
                      medya.length > 1 ? ` (${medya.length} görsel)` : ''
                    }`}
                    className={`${KART_KABI} flex w-full min-w-0 cursor-pointer flex-col gap-1.5 hover:border-gray-300 ${SIRKET_ODAK}`}
                  >
                    {icerik}
                  </button>
                ) : (
                  <div className={`${KART_KABI} flex w-full min-w-0 flex-col gap-1.5`}>{icerik}</div>
                )}
              </li>
            );
          })}
        </ul>
        {!hepsi && paylasimlar.length > ILK_GOSTERIM && (
          <button
            type="button"
            onClick={() => setHepsi(true)}
            className={`mt-3 ${IKINCIL_DUGME}`}
            style={ikincilStil}
          >
            Tüm paylaşımları göster ({paylasimlar.length})
          </button>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="aday-paylasimlari" className="space-y-2">
      {baslik}
      {govde}
      {acik && !gizli && (
        <Goruntuleyici
          gorseller={gorseller}
          baslangic={acik.sira}
          hazirAdresler={adresler}
          yerelGorselAdresi={yerelGorselAdresi}
          tetikleyici={acik.tetik}
          onKapat={() => setAcik(null)}
        />
      )}
    </section>
  );
};
