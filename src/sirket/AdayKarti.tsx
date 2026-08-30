import React from 'react';
import { ExternalLink, FileText, ShieldOff } from 'lucide-react';
import {
  SIRKET_ACCENT,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
} from './renk';
import { UYUM_ETIKETI, kimlikSatiri, monogram } from '../lib/aday-kart.mjs';

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

const SERIT: Record<string, { renk: string; oran: string }> = {
  /* Dolgu ailenin imza renginde; bandın adı kartta yazılı olduğu için
     anlam yalnızca renkle taşınmıyor. */
  yuksek: { renk: SIRKET_ACCENT, oran: '100%' },
  orta: { renk: SIRKET_ACCENT, oran: '60%' },
  dusuk: { renk: SIRKET_KENAR, oran: '30%' },
  bilinmiyor: { renk: SIRKET_KENAR, oran: '0%' },
};

/*
  Başvuru durumu — GERÇEK enum değerleri.

  `application_status`: submitted, under_review, technical_assessment,
  interview_scheduled, offer_extended, rejected, withdrawn. Uydurma bir
  aşama eklenmiyor; olmayan bir durumu göstermek şirkete var olmayan bir
  akış vaat etmek olurdu.

  Renk semantik: reddedilen kırmızı, teklif verilen yeşil, geri çekilen
  nötr. Marka yeşili "birincil ve seçili" demek, "başarılı" demek değil —
  bu yüzden aşama renkleri ayrı.
*/
const DURUM_ETIKETI: Record<string, { etiket: string; stil: React.CSSProperties }> = {
  submitted: { etiket: 'Yeni', stil: { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU } },
  under_review: { etiket: 'İnceleniyor', stil: { background: '#FEF3C7', color: '#92400E' } },
  technical_assessment: { etiket: 'Değerlendirme', stil: { background: '#FEF3C7', color: '#92400E' } },
  interview_scheduled: { etiket: 'Mülakat', stil: { background: '#DBEAFE', color: '#1E40AF' } },
  offer_extended: { etiket: 'Teklif', stil: { background: '#DCFCE7', color: '#166534' } },
  rejected: { etiket: 'Olumsuz', stil: { background: '#FEE2E2', color: '#991B1B' } },
  withdrawn: { etiket: 'Geri çekildi', stil: { background: '#F3F4F6', color: '#4B5563' } },
};

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
}

export const AdayKarti: React.FC<{
  kart: AdayKart;
  odakli: boolean;
  onAc: () => void;
}> = ({ kart, odakli, onAc }) => {
  const serit = SERIT[kart.band] ?? SERIT.bilinmiyor;
  const kimlik = kimlikSatiri(kart);
  const durum = DURUM_ETIKETI[kart.durum] ?? null;
  /* Dörtten fazlası kartı boğuyor; kalanı sayıyla anlatılıyor. */
  const gorunenYetenek = kart.yetenekler.slice(0, 4);
  const kalanYetenek = kart.yetenekler.length - gorunenYetenek.length;

  return (
    <button
      type="button"
      onClick={onAc}
      data-aday-karti={kart.id}
      aria-label={`${kart.ad ?? 'Aday'} — ${UYUM_ETIKETI[kart.band as keyof typeof UYUM_ETIKETI]}`}
      /*
        SABİT ORAN KALDIRILDI

        Kart `aspect-[2/3]` ile çiziliyordu: içerik ne olursa olsun aynı
        yükseklik. Yeteneği az olan adayda alt yarı bomboş kalıyor, kart
        "yarısı doldurulmamış kutu" gibi duruyordu. Artık yükseklik
        içerikten geliyor; ızgara hizası `items-stretch` ile korunuyor ve
        kısa kartlar da satırı bozmuyor.
      */
      className="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-all hover:-translate-y-0.5"
      style={{
        background: SIRKET_YUZEY,
        borderColor: odakli ? SIRKET_VURGU : SIRKET_KENAR,
        boxShadow: odakli
          ? `0 0 0 3px ${SIRKET_ROZET}`
          : '0 1px 2px rgba(22, 33, 28, 0.04)',
      }}
    >
      {/* Uyum şeridi — bandı gösteriyor, sayıyı aşağıda yazıyor. */}
      <span className="block h-1.5 w-full shrink-0" style={{ background: SIRKET_KENAR }}>
        <span className="block h-full" style={{ width: serit.oran, background: serit.renk }} />
      </span>

      <span className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
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
              UYUM: SAYI DEĞİL BAND

              Ölçüldü: üretimdeki puanların tamamı 0–38 arasında ve 0,
              eşleştirme motorunun "hesaplanamadı" çıktısıyla (unscorable)
              aynı değeri taşıyor. "%0 uyum" yazmak, hesaplanamamış bir
              başvuruyu sıfır uyumlu göstermek olurdu. Band adı ne bilindiğini
              olduğu gibi söylüyor.
            */}
            <span className="block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
              {UYUM_ETIKETI[kart.band as keyof typeof UYUM_ETIKETI]}
            </span>
          </span>

          {durum && (
            <span
              className="shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-bold"
              style={durum.stil}
            >
              {durum.etiket}
            </span>
          )}
        </span>

        {/* --------------------------------------------- kimlik özeti */}
        {(kimlik || kart.sehir) && (
          <span className="block space-y-0.5">
            {kimlik && (
              <span
                className="line-clamp-2 block text-[11px] font-semibold leading-snug"
                style={{ color: SIRKET_METIN_IKINCIL }}
              >
                {kimlik}
              </span>
            )}
            {kart.sehir && (
              <span className="block text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
                {kart.sehir}
              </span>
            )}
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
        <span
          className="mt-auto flex items-center justify-between gap-2 border-t pt-2 text-[10px] font-semibold"
          style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN_IKINCIL }}
        >
          <span className="truncate">{tarihYaz(kart.tarih)}</span>
          <span className="flex shrink-0 items-center gap-2">
            {kart.cvYolu && (
              <span className="flex items-center gap-0.5">
                <FileText className="h-3 w-3" />
                CV
              </span>
            )}
            {kart.rozetler.length > 0 && <span>{kart.rozetler.length} rozet</span>}
          </span>
        </span>
      </span>
    </button>
  );
};
