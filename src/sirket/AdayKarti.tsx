import React from 'react';
import { ChevronRight, ExternalLink, FileText, ShieldOff } from 'lucide-react';
import {
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  SIRKET_ZEMIN,
  SIRKET_ODAK,
} from './renk';
import { UYUM_ETIKETI, kimlikSatiri, monogram } from '../lib/aday-kart.mjs';
import { durumAdi, durumRozeti, surecKapandi } from './basvuru-durumu';

/**
 * Başvuran kartı.
 *
 * NE VAR: ad (ya da monogram), okul · bölüm · sınıf, şehir, 3–5 yetenek,
 * rozet, başvuru tarihi ve uyum şeridi.
 *
 * NE YOK: overall puanı, stat çubuğu, altın/gümüş kart, forma, stadyum,
 * TCKN, adres, yaş, zorunlu fotoğraf. Karşıdaki gerçek bir öğrenci;
 * oyuncu kartı estetiği için sayı uydurulmuyor.
 *
 * Kart yüksekliği İÇERİKTEN geliyor. Önce `aspect-[2/3]` ile sabitti ve
 * yeteneği az olan adayda alt yarı bomboş kalıyordu; kart "yarısı
 * doldurulmamış kutu" gibi duruyordu.
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
  /* CV yolu — kartta yalnızca VAR MI diye gösteriliyor; dosya çekmecede
     açılıyor. Yoksa hiç yazılmıyor: bozuk bir düğme bırakmak, olmayan
     bir belgeye tıklatmak olurdu. */
  cvYolu?: string | null;
  gizli?: boolean;
  /* Başvurulan ilanın başlığı (`listings.title`, sirketBasvurulari). */
  ilanBasligi?: string | null;
}

export const AdayKarti: React.FC<{
  kart: AdayKart;
  odakli: boolean;
  onAc: () => void;
}> = ({ kart, odakli, onAc }) => {
  const kimlik = kimlikSatiri(kart);
  const durum = durumRozeti(kart.durum);
  /* Dörtten fazlası kartı boğuyor; kalanı sayıyla anlatılıyor. */
  /*
    UYUM SKORU FİNAL DURUMLARDA GİZLİ

    Teklif kabul edilmiş bir adayın yanında "Düşük uyum" yazıyordu.
    Şirket adayı zaten seçmiş, aday da teklifi kabul etmiş: o sayı
    artık bir karara yardım etmiyor, yalnızca kararı sorgulatıyor.
    Aynısı olumsuz kapanmış, reddedilmiş ve geri çekilmiş
    başvurular için de geçerli.

    Yalnız GÖSTERİM: puan veritabanında duruyor.
  */
  const uyumGoster = !surecKapandi(kart.durum) && kart.band !== 'bilinmiyor';

  const gorunenYetenek = kart.yetenekler.slice(0, 4);
  const ilanBasligi = kart.ilanBasligi?.trim() || null;
  const kalanYetenek = kart.yetenekler.length - gorunenYetenek.length;

  /*
    İLAN BAŞLIĞI GENİŞLETİLEBİLİR (5 Ekim 2026)

    Başlık iki satırda kesiliyordu ve tam metin yalnız `title`daydı —
    telefonda fare yok, `title` hiç görünmüyor; ölçüldü: 375 pikselde 117
    karakterlik başlık üçüncü satırda kesiliyor. Kesildiyse başlığın
    altında "Devamını göster" düğmesi çıkıyor (kesilmediyse yok: işe
    yaramayan düğme çizilmiyor). Kesilip kesilmediği ölçülüyor, tahmin
    edilmiyor: genişlik değişince (döndürme, pencere) yeniden ölçülüyor.
  */
  const [ilanAcik, setIlanAcik] = React.useState(false);
  const [ilanKesik, setIlanKesik] = React.useState(false);
  const ilanRef = React.useRef<HTMLSpanElement | null>(null);
  React.useLayoutEffect(() => {
    const oge = ilanRef.current;
    if (!oge || ilanAcik) return undefined;
    const olc = () => setIlanKesik(oge.scrollHeight > oge.clientHeight + 1);
    olc();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const gozlemci = new ResizeObserver(olc);
    gozlemci.observe(oge);
    return () => gozlemci.disconnect();
  }, [ilanBasligi, ilanAcik]);

  return (
    /*
      KART BİR KAP, TIKLAMA ALTTAKİ DÜĞMEDE

      Kartın tamamı bir `<button>`du; içine ikinci bir düğme ("Devamını
      göster") konamazdı (iç içe düğme geçersiz HTML). Kart artık bir kap:
      kabın tamamını kaplayan boş düğme incelemeyi açıyor, içerik onun
      üstünde ama tıklamayı geçiriyor (`pointer-events-none`); bağımsız
      tek eylem olan genişletme düğmesi `relative z-10` ve tıklamayı
      kendisi alıyor — kartı açmıyor.
    */
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border text-left transition-all hover:-translate-y-0.5"
      style={{
        background: SIRKET_YUZEY,
        borderColor: odakli ? SIRKET_VURGU : SIRKET_KENAR,
        boxShadow: odakli
          ? `0 0 0 3px ${SIRKET_ROZET}`
          : '0 1px 2px rgba(22, 33, 28, 0.04)',
      }}
    >
    <button
      type="button"
      onClick={onAc}
      data-aday-karti={kart.id}
      /*
        İlan başlığı erişilebilir adın İÇİNDE: kartta iki satırda
        kesilebiliyor ve `title` yalnız fareyle okunuyor. Aynı öğrencinin
        iki ilana başvurusu iki ayrı kart; ekran okuyucu ikisini ancak
        ilan adıyla ayırabilir.
      */
      aria-label={[
        kart.gizli ? 'Aday' : (kart.ad ?? 'Aday'),
        ilanBasligi ? `Başvurduğu ilan: ${ilanBasligi}` : null,
        uyumGoster ? UYUM_ETIKETI[kart.band as keyof typeof UYUM_ETIKETI] : durumAdi(kart.durum),
      ]
        .filter(Boolean)
        .join(' — ')}
      /*
        SABİT ORAN KALDIRILDI

        Kart `aspect-[2/3]` ile çiziliyordu: içerik ne olursa olsun aynı
        yükseklik. Yeteneği az olan adayda alt yarı bomboş kalıyor, kart
        "yarısı doldurulmamış kutu" gibi duruyordu. Artık yükseklik
        içerikten geliyor; ızgara hizası `items-stretch` ile korunuyor ve
        kısa kartlar da satırı bozmuyor.
      */
      className={`absolute inset-0 cursor-pointer rounded-2xl ${SIRKET_ODAK}`}
    />
      <div className="pointer-events-none relative flex min-h-0 flex-1 flex-col gap-2.5 p-3">
        {/* ------------------------------------------------- üst satır */}
        <span className="flex items-start gap-2">
          {kart.fotoUrl && !kart.gizli ? (
            <img src={kart.fotoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black"
              style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
            >
              {kart.gizli ? <ShieldOff className="h-4 w-4" /> : monogram(kart.ad)}
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-extrabold" style={{ color: SIRKET_METIN }}>
              {kart.gizli ? 'Aday' : (kart.ad ?? 'Ad paylaşılmadı')}
            </span>
            {/*
              Okul ve bölüm adın hemen altında: karar için ilk bakılan
              bilgi bu, uyum değil.
            */}
            {kimlik && (
              <span
                className="line-clamp-2 block text-[11px] font-semibold leading-snug"
                style={{ color: SIRKET_METIN_IKINCIL }}
              >
                {kimlik}
              </span>
            )}
          </span>

          {/* Rozet her zaman var: tanınmayan durumda ham enum değil, nötr bir metin. */}
          <span
            className="shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-bold"
            style={durum.stil}
          >
            {durum.etiket}
          </span>
        </span>

        {/*
          BAŞVURDUĞU İLAN (4 Ekim 2026)

          Şirketin birden çok ilanı olduğunda kart hangi ilana
          başvurulduğunu söylemiyordu; aynı öğrencinin iki ilana
          başvurusu yan yana iki eş kart gibi duruyordu. Başlık iki
          satıra kadar okunuyor, uzunsa `line-clamp-2` ile kesiliyor ve
          "Devamını göster" tam metni kartın içinde açıyor (dokunmatikte de).
          Tam metin ayrıca kartın erişilebilir adında ve inceleme ekranının
          üst şeridinde — bilgi hover'a (`title`) kalmıyor.
        */}
        {ilanBasligi && (
          <span
            className="block rounded-lg border px-2 py-1.5"
            style={{ borderColor: SIRKET_KENAR, background: SIRKET_ZEMIN }}
          >
            <span className="block text-[10px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
              Başvurduğu ilan
            </span>
            <span
              ref={ilanRef}
              id={`ilan-basligi-${kart.id}`}
              title={ilanBasligi}
              className={`${ilanAcik ? 'block ' : 'line-clamp-2 '}break-words text-xs font-bold leading-snug`}
              style={{ color: SIRKET_METIN }}
            >
              {ilanBasligi}
            </span>
            {(ilanKesik || ilanAcik) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIlanAcik((a) => !a);
                }}
                aria-expanded={ilanAcik}
                aria-controls={`ilan-basligi-${kart.id}`}
                className={`pointer-events-auto relative z-10 -mx-1 mt-0.5 inline-flex min-h-11 cursor-pointer items-center rounded-lg px-1 text-[11px] font-bold underline underline-offset-2 ${SIRKET_ODAK}`}
                style={{ color: SIRKET_VURGU_KOYU }}
              >
                {ilanAcik ? 'Daha az göster' : 'Devamını göster'}
              </button>
            )}
          </span>
        )}

        {kart.sehir && (
          <span className="block text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
            {kart.sehir}
          </span>
        )}

        {/* ------------------------------------------------ etiketler */}
        {gorunenYetenek.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {gorunenYetenek.map((y) => (
              <span
                key={y}
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
              >
                {y}
              </span>
            ))}
            {kalanYetenek > 0 && (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{ color: SIRKET_METIN_IKINCIL }}
              >
                +{kalanYetenek}
              </span>
            )}
          </span>
        )}

        {/*
          Şirketin kendi sitesinden gelen başvuruda bizde paylaşılmış bir
          profil yok. İsim uydurmak yerine ne olduğu yazıyor.
        */}
        {!kart.paylasildi && (
          <span
            className="flex items-start gap-1 text-[10px] font-semibold leading-snug"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
            Şirketin kendi sitesinden başvuruldu
          </span>
        )}

        {/* ------------------------------------------- alt meta satırı */}
        {/*
          ALT SATIR: TARİH + NET AKSİYON

          Uyum bilgisi buraya, küçük yardımcı metne indi. Adın altında
          duran bir "band" etiketi, algoritmanın aday hakkında verdiği
          karar gibi okunuyordu; oysa üretimdeki puanların tamamı 0–38
          arasında ve 0, eşleştirme motorunun "hesaplanamadı" çıktısıyla
          aynı değeri taşıyor.

          Kartın tamamı tıklanabilir; sağdaki "İncele" bunu görünür
          kılıyor. Tıklamayı kabın altındaki tek düğme alıyor; iç içe düğme yok.
        */}
        <span
          className="mt-auto flex items-center justify-between gap-2 border-t pt-2.5 text-[11px] font-semibold"
          style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN_IKINCIL }}
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{tarihYaz(kart.tarih)}</span>
            {uyumGoster && (
              <span className="truncate text-[10px] font-normal">
                {UYUM_ETIKETI[kart.band as keyof typeof UYUM_ETIKETI]}
              </span>
            )}
          </span>
          <span
            className="flex shrink-0 items-center gap-1 font-bold"
            style={{ color: SIRKET_VURGU_KOYU }}
          >
            {kart.cvYolu && <FileText className="h-3.5 w-3.5" />}
            İncele
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </span>
      </div>
    </div>
  );
};
