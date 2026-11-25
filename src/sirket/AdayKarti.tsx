import React from 'react';
import { ArrowRight, Check, ExternalLink, FileText, Github, Globe, Linkedin, MapPin, Star } from 'lucide-react';
import {
  SIRKET_KENAR,
  SIRKET_KENAR_GUCLU,
  SIRKET_KENAR_VURGU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  SIRKET_ZEMIN,
  SIRKET_ODAK,
} from './renk';
import { durumAdi, durumRozeti, surecKapandi } from './basvuru-durumu';
import { AdayFotografi } from './AdayFotografi';
import { UYUM_ETIKETI } from '../lib/aday-kart.mjs';
import { adayBaglantilari, rozetEtiketi } from '../lib/aday-profil-farki.mjs';

/**
 * Başvuru kartı — Başvuranlar listesinin tek öğesi.
 *
 * YATAY OYUNCU KARTI (25 Kasım 2026, kullanıcı kararı)
 * ----------------------------------------------------
 * 6 Ekim'deki sade satır kullanıcıya "zayıf, yetersiz" geldi: şirket
 * adayları ayırt etmek için her satırı tek tek açmak zorunda kalıyordu.
 * Kart artık futbolcu kartı gibi okunuyor ama YATAY: solda kimlik şeridi
 * (uyum, fotoğraf, sınıf, şehir), sağda karar bilgisi (ad, ilan, okul,
 * sayılar, yetenekler, eklenen belgeler).
 *
 * KARTIN SAYILARI SAYIM, PUAN DEĞİL
 * ---------------------------------
 * Oyuncu kartı estetiği overall 87, hız/şut çubuğu ister; bunlar burada
 * YOK. Stat satırındaki her sayı başvuru kopyasındaki bir listenin
 * uzunluğu (proje, deneyim, dil) ya da ön eleme cevaplarının sayısı.
 * Sıfır olan kalem hiç çizilmiyor: "PROJE 0" bir eksiklik damgası gibi
 * okunur, oysa öğrencinin o alanı hiç doldurmamış olması da mümkün.
 * Uyum puanının SAYISI da yazılmıyor; yalnız bandı (yüksek/orta/düşük).
 *
 * Bir kart BİR BAŞVURU. Aynı öğrencinin iki ilana başvurusu iki ayrı
 * kart; onları ayıran ilan adı kartta ve erişilebilir adda.
 *
 * NE YOK: overall puanı, stat çubuğu, yüzde, TCKN, adres, yaş, zorunlu
 * fotoğraf. Karşıdaki gerçek bir öğrenci; sayı uydurulmuyor.
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
  /** `social_profiles.avatar_path`; şirketin okuma kapısı 20270113010000. */
  fotoYolu?: string | null;
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
  /* Başvuru anındaki CV kopyası (kartVerisi `cvKopya`); yalnız varlığı okunuyor. */
  cvKopya?: Record<string, unknown> | null;
  onYazi?: string | null;
  github?: string | null;
  linkedin?: string | null;
  portfolyo?: string | null;
  /* Uzunlukları sayılıyor; içerik inceleme ekranında. */
  projeler?: unknown[];
  deneyimler?: unknown[];
  diller?: string[];
  onElemeCevaplari?: { soru: string; cevap: string }[];
  gizli?: boolean;
  /* Başvurulan ilanın başlığı (`listings.title`, sirketBasvurulari). */
  ilanBasligi?: string | null;
}

/*
  ŞERİT TONU BANDDAN. Yeşil "yüksek uyum" için ama durum rozetindeki dolu
  yeşil (#DCFCE7, yalnız "teklif kabul edildi") KULLANILMIYOR: uyum bir
  tahmin, kabul bir sonuç; aynı renk ikisini karıştırırdı. Rozet beyaz
  zeminde koyu yazı — #065F46 / beyaz, #1D4ED8 / beyaz (6.70:1, renk.ts),
  #4B5563 / beyaz (7.56:1, renk.ts).
*/
const SERIT: Record<string, { zemin: string; yazi: string; kenar: string }> = {
  yuksek: { zemin: '#ECFDF5', yazi: '#065F46', kenar: '#A7F3D0' },
  orta: { zemin: SIRKET_ROZET, yazi: SIRKET_VURGU_KOYU, kenar: SIRKET_KENAR_VURGU },
  dusuk: { zemin: SIRKET_ZEMIN, yazi: SIRKET_METIN_IKINCIL, kenar: SIRKET_KENAR_GUCLU },
};

const BAGLANTI_IKONU = { github: Github, linkedin: Linkedin, portfolyo: Globe } as const;

export const AdayKarti: React.FC<{
  kart: AdayKart;
  /** Gerçekten seçili kart (son açılan aday). Mavi çerçeve yalnız burada. */
  secili: boolean;
  onAc: () => void;
  /** Klavyeyle gezinmede (J/K) odak bu karta taşınıyor. */
  onOdak?: () => void;
}> = ({ kart, secili, onAc, onOdak }) => {
  const durum = durumRozeti(kart.durum);
  const ilanBasligi = kart.ilanBasligi?.trim() || null;
  const ad = kart.gizli ? 'Aday' : (kart.ad ?? 'Ad paylaşılmadı');
  const okul = [kart.universite, kart.bolum].filter(Boolean).join(' • ');
  const sinif = kart.sinif?.trim() || null;
  const sehir = kart.sehir?.trim() || null;
  const tarih = tarihYaz(kart.tarih);

  /*
    UYUM ROZETİ: puanı hesaplanmamış başvuruda ('bilinmiyor') rozet yok —
    "Uyum hesaplanmadı" bile yazılmıyor, boş şerit daha dürüst. Süreç
    kapanmışsa da yok: kabul edilmiş adayın kartında "Düşük uyum"
    yazıyordu (final-durum testi), karar verildikten sonra tahmin
    anlamını yitiriyor. Profili paylaşılmamış başvuruda da yok (25 Kasım
    2026 kararı): şirketin göremediği bir profile dayanan tahmin, kartta
    dayanaksız bir etiket olarak kalırdı.
  */
  const uyumBandi = kart.band === 'yuksek' || kart.band === 'orta' || kart.band === 'dusuk' ? kart.band : null;
  const uyumEtiketi = uyumBandi && !surecKapandi(kart.durum) ? UYUM_ETIKETI[uyumBandi] : null;
  const uyum = uyumEtiketi && kart.paylasildi ? uyumEtiketi : null;
  const serit = uyum && uyumBandi ? SERIT[uyumBandi] : { zemin: SIRKET_ZEMIN, yazi: SIRKET_METIN_IKINCIL, kenar: SIRKET_KENAR_GUCLU };

  /*
    ÖN ELEME: "geçti/kaldı" ölçüsü yok (cevaplar serbest metin, şirket
    değerlendiriyor). Yazılan yalnız kaç soruya cevap verildiği; oran ya
    da başarı yüzdesi değil.
  */
  const onEleme = kart.onElemeCevaplari ?? [];
  const cevaplanan = onEleme.filter((c) => c.cevap.trim().length > 0).length;
  const statlar = kart.paylasildi
    ? [
        { etiket: 'Proje', deger: String(kart.projeler?.length ?? 0), var: (kart.projeler?.length ?? 0) > 0 },
        { etiket: 'Deneyim', deger: String(kart.deneyimler?.length ?? 0), var: (kart.deneyimler?.length ?? 0) > 0 },
        { etiket: 'Dil', deger: String(kart.diller?.length ?? 0), var: (kart.diller?.length ?? 0) > 0 },
        { etiket: 'Ön eleme', deger: `${cevaplanan}/${onEleme.length}`, var: cevaplanan > 0 },
      ].filter((s) => s.var)
    : [];

  const yetenekler = kart.paylasildi ? kart.yetenekler : [];
  const gorunenYetenek = yetenekler.slice(0, 4);
  const kalanYetenek = yetenekler.length - gorunenYetenek.length;
  const rozet = kart.paylasildi && kart.rozetler.length > 0 ? rozetEtiketi(kart.rozetler[0]) : null;

  /*
    BELGE VE BAĞLANTI GÖSTERGELERİ — bağlantı DEĞİL. Kart tek düğme;
    içine <a> koymak iç içe etkileşim olurdu. Bağlantı listesi inceleme
    ekranıyla AYNI süzgeçten (adayBaglantilari): `javascript:` gibi
    açılamayacak bir değer kartta "Portfolyo var" diye görünmüyor.
  */
  const cvVar = Boolean(kart.cvYolu || kart.cvKopya);
  const onYaziVar = Boolean(kart.onYazi?.trim());
  const baglantilar = kart.paylasildi ? adayBaglantilari(kart) : [];

  return (
    <button
      type="button"
      onClick={onAc}
      onFocus={onOdak}
      data-aday-karti={kart.id}
      aria-current={secili ? 'true' : undefined}
      /*
        Erişilebilir ad: ad — ilan — durum — uyum — sınıf — şehir — tarih.
        İlan adı İÇİNDE: aynı öğrencinin iki başvurusunu ekran okuyucu
        ancak ilan adıyla ayırır.
      */
      aria-label={[
        ad,
        ilanBasligi ? `Başvurduğu ilan: ${ilanBasligi}` : null,
        durumAdi(kart.durum),
        uyum,
        kart.paylasildi ? sinif : null,
        kart.paylasildi ? sehir : null,
        tarih ? `Başvuru tarihi: ${tarih}` : null,
      ]
        .filter(Boolean)
        .join(' — ')}
      /*
        TÜM KART TIKLANIYOR. Kartın içinde ikinci bir düğme ya da bağlantı
        yok; ilan adı kesilmediği için genişletme düğmesi de gerekmiyor.

        Mavi çerçeve YALNIZ seçili kartta (`secili`). Klavye odağı ayrı
        bir halka (SIRKET_ODAK) — seçim gibi görünmüyor.

        Telefonda şerit kartın ÜSTÜNE yatıyor: 375 piksellik ekranda
        160 piksellik bir yan şerit gövdeye 200 pikselden az bırakır ve
        stat satırı kırılırdı.
      */
      className={`group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white text-left transition-shadow hover:shadow-md sm:flex-row ${SIRKET_ODAK}`}
      style={
        secili
          ? { boxShadow: `inset 0 0 0 2px ${SIRKET_VURGU}`, background: SIRKET_ROZET, borderColor: SIRKET_VURGU }
          : { borderColor: SIRKET_KENAR }
      }
    >
      {/* ------------------------------------------------ sol şerit */}
      <span
        className="flex shrink-0 items-center gap-3 px-3 py-3 sm:w-40 sm:flex-col sm:justify-between sm:gap-3 sm:px-3 sm:py-4"
        style={{ background: serit.zemin }}
      >
        <span className="relative order-first shrink-0 pb-2 sm:order-none">
          <AdayFotografi
            ad={kart.ad}
            fotoYolu={kart.fotoYolu}
            fotoUrl={kart.fotoUrl}
            gizli={Boolean(kart.gizli)}
            className="h-16 w-16 text-lg ring-2 ring-white sm:h-20 sm:w-20 sm:text-xl"
          />
          {kart.paylasildi && sinif && (
            <span
              className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border bg-white px-2 py-0.5 text-[11px] font-bold leading-tight"
              style={{ color: SIRKET_METIN, borderColor: serit.kenar }}
            >
              {sinif}
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-col items-start gap-1.5 sm:contents">
          {uyum && (
            <span
              className="whitespace-nowrap rounded-full border bg-white px-2.5 py-0.5 text-xs font-bold sm:order-first"
              style={{ color: serit.yazi, borderColor: serit.kenar }}
            >
              {uyum}
            </span>
          )}
          {kart.paylasildi && sehir && (
            <span
              className="flex min-w-0 items-center gap-1 text-xs font-semibold"
              style={{ color: SIRKET_METIN_IKINCIL }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">{sehir}</span>
            </span>
          )}
        </span>
      </span>

      {/* ------------------------------------------------ sağ gövde */}
      <span className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <span className="flex items-start gap-2">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 break-words text-[17px] font-extrabold leading-snug" style={{ color: SIRKET_METIN }}>
              {ad}
            </span>
            {/*
              İLAN ADI KESİLMİYOR: uzun ad hapın içinde satır kırarak tam
              okunuyor (telefonda da). Bilgi hover'a kalmıyor.
            */}
            {ilanBasligi && (
              <span
                className="max-w-full rounded-lg px-2 py-0.5 break-words text-sm font-bold leading-snug"
                style={{ color: SIRKET_VURGU_KOYU, background: SIRKET_ROZET }}
              >
                {ilanBasligi}
              </span>
            )}
          </span>
          {/* Rozet gerçek durumu söylüyor; eski süreç kaydı kendi adını (ör. "Görüşme") korur. */}
          <span
            className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={durum.stil}
          >
            {durum.etiket}
          </span>
        </span>

        <span className="flex items-start gap-3 text-[13px] leading-snug" style={{ color: SIRKET_METIN_IKINCIL }}>
          <span className="min-w-0 flex-1 break-words">
            {kart.paylasildi ? (
              okul
            ) : kart.yontem === 'external' ? (
              /*
                Şirketin kendi sitesinden gelen başvuruda bizde paylaşılmış
                bir profil yok. Okul uydurmak yerine ne olduğu yazıyor.
              */
              <span className="flex items-start gap-1">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Şirketin kendi sitesinden başvuruldu
              </span>
            ) : (
              /*
                StajımVar üzerinden ama paylaşım rızası olmadan gelen
                başvuru. Eskiden buraya da "şirketin kendi sitesinden"
                yazılıyordu; başvuru yolu konusunda yanlış bilgiydi.
              */
              'Aday profilini bu başvuruyla paylaşmadı'
            )}
          </span>
          {tarih && <span className="shrink-0 whitespace-nowrap text-xs">{tarih}</span>}
        </span>

        {/* STAT SATIRI — yalnız sayım (bkz. dosya başı); kalem yoksa satır yok. */}
        {statlar.length > 0 && (
          <span className="flex flex-wrap gap-x-5 gap-y-1.5 border-y py-2" style={{ borderColor: SIRKET_KENAR }}>
            {statlar.map((s) => (
              <span key={s.etiket} className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold leading-none tabular-nums" style={{ color: SIRKET_METIN }}>
                  {s.deger}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: SIRKET_METIN_IKINCIL }}>
                  {s.etiket}
                </span>
              </span>
            ))}
          </span>
        )}

        {(gorunenYetenek.length > 0 || rozet) && (
          <span className="flex flex-wrap gap-1.5">
            {rozet && (
              <span
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-bold"
                style={{ background: '#FFFBEB', color: '#92400E', borderColor: '#FDE68A' }}
              >
                <Star className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="break-words">{rozet}</span>
              </span>
            )}
            {gorunenYetenek.map((y) => (
              <span
                key={y}
                className="rounded-lg border px-2 py-0.5 text-xs font-semibold break-words"
                style={{ color: SIRKET_METIN, borderColor: SIRKET_KENAR_GUCLU }}
              >
                {y}
              </span>
            ))}
            {kalanYetenek > 0 && (
              <span className="rounded-lg px-1.5 py-0.5 text-xs font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                +{kalanYetenek}
              </span>
            )}
          </span>
        )}

        {/*
          ALT ŞERİT: göstergeler metinli (ikon tek başına bilgi taşımıyor).
          "İncele" yalnız görsel ipucu; tıklayan kartın kendisi.
        */}
        <span
          className="mt-auto flex items-center gap-3 border-t pt-2.5 text-xs font-semibold"
          style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN_IKINCIL }}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            {cvVar && (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
                CV
              </span>
            )}
            {onYaziVar && (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Ön yazı
              </span>
            )}
            {baglantilar.map((b) => {
              const Ikon = BAGLANTI_IKONU[b.tur as keyof typeof BAGLANTI_IKONU] ?? Globe;
              return (
                <span key={b.tur} className="inline-flex items-center gap-1">
                  <Ikon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {b.etiket}
                </span>
              );
            })}
          </span>
          <span
            className="inline-flex shrink-0 items-center gap-1 text-sm font-bold"
            style={{ color: SIRKET_VURGU_KOYU }}
          >
            İncele
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </span>
      </span>
    </button>
  );
};
