import React from 'react';
import {
  BookOpen,
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  MapPin,
  Star,
} from 'lucide-react';
import {
  SIRKET_KENAR,
  SIRKET_KENAR_GUCLU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  SIRKET_ODAK,
} from './renk';
import { durumAdi, durumRozeti } from './basvuru-durumu';
import { AdayFotografi } from './AdayFotografi';
import { adayBaglantilari, rozetEtiketi } from '../lib/aday-profil-farki.mjs';
import { tarihMetni } from '../lib/tarih.mjs';

/**
 * Başvuru kartı — Başvuranlar listesinin tek öğesi.
 *
 * ADAYLAR KARTININ DİLİ (25 Kasım 2026, kullanıcı kararı)
 * -------------------------------------------------------
 * Bir önceki yatay "oyuncu kartı" (solda 160 px'lik kimlik şeridi, sağda
 * gövde) gerçek veride boş kaldı: canlıdaki adayların çoğunda yalnız CV
 * var, stat satırı ve yetenek hapı çizilmiyor; geriye renkli bir şerit
 * ve yarı boş bir gövde kalıyordu. Kullanıcı Adaylar sayfasının kartını
 * beğendi ("adaylardaki kartlığı beğendim") ve satırda üç kişi istedi.
 * Kart artık SirketAdaylar.tsx'teki aday kartıyla aynı iskelet: üstte
 * fotoğraf + ad + ikonlu kimlik satırları, altta ince ayraçla bilgi
 * şeridi ve tam genişlik ana düğme. Az verili adayda bile üst blok ve
 * alt şerit kartı dolduruyor; boş bir yan şerit kalmıyor.
 *
 * UYUM ROZETİ LİSTEDE YOK
 * -----------------------
 * Canlıda (gerçek başvurularda) TÜM kartlarda "Düşük uyum" yazıyordu.
 * Herkese aynı etiketi basan bir rozet adayları ayırt etmiyor,
 * yalnız moral bozuyordu (kullanıcı onayıyla kaldırıldı). Uyum bilgisi
 * inceleme çekmecesinde (AdayCekmecesi) duruyor; puan verisi de
 * aday-kart.mjs'te hesaplanmaya devam ediyor.
 *
 * KARTIN SAYILARI SAYIM, PUAN DEĞİL
 * ---------------------------------
 * Stat satırındaki her sayı başvuru kopyasındaki bir listenin uzunluğu
 * (proje, deneyim, dil) ya da ön eleme cevaplarının sayısı. Sıfır olan
 * kalem hiç çizilmiyor: "Proje 0" bir eksiklik damgası gibi okunur, oysa
 * öğrencinin o alanı hiç doldurmamış olması da mümkün.
 *
 * Bir kart BİR BAŞVURU. Aynı öğrencinin iki ilana başvurusu iki ayrı
 * kart; onları ayıran ilan adı kartta ve erişilebilir adda.
 *
 * NE YOK: uyum puanı ya da bandı, yüzde, stat çubuğu, TCKN, adres, yaş,
 * zorunlu fotoğraf. Karşıdaki gerçek bir öğrenci; sayı uydurulmuyor.
 */

/*
  Tarih ortak biçimleyiciden (lib/tarih.mjs): elle toLocaleDateString
  saatsiz değerlerde gün kaydırıyordu. Yılsız biçim ("20 Ağustos") —
  başvurular aynı dönemde ve kart dar.
*/
const tarihYaz = (t: string | null) => tarihMetni(t, { yil: false }) ?? '';

/** En fazla üç beceri; kalanı "+N" — Adaylar kartıyla aynı sınır. */
const ETIKET_SINIRI = 3;

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
  const sinif = kart.sinif?.trim() || null;
  const sehir = kart.sehir?.trim() || null;
  const tarih = tarihYaz(kart.tarih);

  /* Adaylar kartıyla aynı üç satır; boş olan satır çizilmiyor. */
  const kimlik = kart.paylasildi
    ? [
        { ikon: GraduationCap, metin: kart.universite ?? '' },
        { ikon: BookOpen, metin: kart.bolum ?? '' },
        { ikon: MapPin, metin: sehir ?? '' },
      ].filter((k) => k.metin.trim())
    : [];
  /* Okul + bölüm erişilebilir adda tek parça; ekranda iki ayrı satır. */
  const okul = [kart.universite, kart.bolum].filter(Boolean).join(' • ');

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
  const gorunenYetenek = yetenekler.slice(0, ETIKET_SINIRI);
  const kalanYetenek = yetenekler.length - gorunenYetenek.length;
  const rozet = kart.paylasildi && kart.rozetler.length > 0 ? rozetEtiketi(kart.rozetler[0]) : null;

  /*
    BELGE VE BAĞLANTI GÖSTERGELERİ — bağlantı DEĞİL. Kart tek düğme;
    içine <a> koymak iç içe etkileşim olurdu. Bağlantı listesi inceleme
    ekranıyla AYNI süzgeçten (adayBaglantilari): `javascript:` gibi
    açılamayacak bir değer kartta "Portfolyo" diye görünmüyor.
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
        Erişilebilir ad: ad — ilan — durum — okul — sınıf — şehir — tarih.
        İlan adı İÇİNDE: aynı öğrencinin iki başvurusunu ekran okuyucu
        ancak ilan adıyla ayırır. Uyum yok (bkz. dosya başı).
      */
      aria-label={[
        ad,
        ilanBasligi ? `Başvurduğu ilan: ${ilanBasligi}` : null,
        durumAdi(kart.durum),
        kart.paylasildi && okul ? okul : null,
        kart.paylasildi ? sinif : null,
        kart.paylasildi ? sehir : null,
        tarih ? `Başvuru tarihi: ${tarih}` : null,
      ]
        .filter(Boolean)
        .join(' — ')}
      /*
        TÜM KART TIKLANIYOR. İçinde ikinci bir düğme ya da bağlantı yok;
        alttaki "İncele" yalnız görünüm. Toplu seçim kutusu bu düğmenin
        KARDEŞİ (AdayIzgarasi), içinde değil.

        `h-full flex-col` + alt şeritte `mt-auto`: ızgara satırındaki
        kartlar eşit boyda, "İncele" düğmeleri aynı çizgide.

        Mavi çerçeve YALNIZ seçili kartta (`secili`). Klavye odağı ayrı
        bir halka (SIRKET_ODAK) — seçim gibi görünmüyor.
      */
      className={`group flex h-full w-full min-w-0 cursor-pointer flex-col rounded-2xl border bg-white p-4 text-left transition-shadow hover:shadow-md ${SIRKET_ODAK}`}
      style={
        secili
          ? { boxShadow: `inset 0 0 0 2px ${SIRKET_VURGU}`, background: SIRKET_ROZET, borderColor: SIRKET_VURGU }
          : { borderColor: SIRKET_KENAR }
      }
    >
      {/* ------------------------------------------------ üst: kişi */}
      <span className="flex items-start gap-3">
        <AdayFotografi
          ad={kart.ad}
          fotoYolu={kart.fotoYolu}
          fotoUrl={kart.fotoUrl}
          gizli={Boolean(kart.gizli)}
          /* Telefonda 64 px, sm üstünde 80 px — Adaylar kartıyla aynı ölçü. */
          className="h-16 w-16 shrink-0 text-lg sm:h-20 sm:w-20 sm:text-xl"
        />
        <span className="block min-w-0 flex-1">
          {/* Ad KESİLMİYOR: panel telefonda okunuyor, hover'a kalmıyor. */}
          <span className="block break-words text-[17px] font-extrabold leading-snug" style={{ color: SIRKET_METIN }}>
            {ad}
          </span>
          {kart.paylasildi && sinif && (
            <span
              /* Sınıf olduğu gibi ("2. Sınıf", "Yüksek Lisans / Mezun"); ek yok. */
              className="mt-1 inline-block max-w-full break-words rounded-full border px-2 py-0.5 text-[11px] font-bold leading-tight"
              style={{ color: SIRKET_METIN, borderColor: SIRKET_KENAR_GUCLU }}
            >
              {sinif}
            </span>
          )}
          {kart.paylasildi ? (
            kimlik.length > 0 && (
              <span className="mt-1.5 block space-y-1 text-[13px] leading-snug" style={{ color: SIRKET_METIN_IKINCIL }}>
                {kimlik.map(({ ikon: Ikon, metin }, i) => (
                  <span key={i} className="flex items-start gap-1.5">
                    <Ikon aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 break-words">{metin}</span>
                  </span>
                ))}
              </span>
            )
          ) : (
            <span className="mt-1.5 block text-[13px] leading-snug" style={{ color: SIRKET_METIN_IKINCIL }}>
              {kart.yontem === 'external' ? (
                /*
                  Şirketin kendi sitesinden gelen başvuruda bizde paylaşılmış
                  bir profil yok. Okul uydurmak yerine ne olduğu yazıyor.
                */
                <span className="flex items-start gap-1.5">
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 break-words">Şirketin kendi sitesinden başvuruldu</span>
                </span>
              ) : (
                /*
                  StajımVar üzerinden ama paylaşım rızası olmadan gelen
                  başvuru. "Şirketin kendi sitesinden" yazmak başvuru yolu
                  konusunda yanlış bilgi olurdu.
                */
                'Aday profilini bu başvuruyla paylaşmadı'
              )}
            </span>
          )}
        </span>
      </span>

      {/*
        İLAN + DURUM: aynı satırda, sığmazsa sarılıyor. İlan adı
        KESİLMİYOR — uzun ad hapın içinde satır kırarak tam okunuyor.
        Rozet gerçek durumu söylüyor; eski süreç kaydı kendi adını korur.
      */}
      <span className="mt-3 flex flex-wrap items-center gap-1.5">
        {ilanBasligi && (
          <span
            className="max-w-full rounded-lg px-2 py-0.5 break-words text-sm font-bold leading-snug"
            style={{ color: SIRKET_VURGU_KOYU, background: SIRKET_ROZET }}
          >
            {ilanBasligi}
          </span>
        )}
        <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold" style={durum.stil}>
          {durum.etiket}
        </span>
      </span>

      {(gorunenYetenek.length > 0 || rozet) && (
        <span className="mt-3 flex flex-wrap items-center gap-1.5">
          {rozet && (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-bold"
              style={{ background: '#FFFBEB', color: '#92400E', borderColor: '#FDE68A' }}
            >
              <Star className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">{rozet}</span>
            </span>
          )}
          {gorunenYetenek.map((y) => (
            <span
              key={y}
              className="max-w-full break-words rounded-lg border px-2 py-0.5 text-xs font-semibold"
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

      {/* STAT SATIRI — yalnız sayım (bkz. dosya başı); kalem yoksa satır yok. */}
      {statlar.length > 0 && (
        <span className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
          {statlar.map((s) => (
            <span key={s.etiket} className="inline-flex items-baseline gap-1">
              <span className="font-extrabold tabular-nums" style={{ color: SIRKET_METIN }}>
                {s.deger}
              </span>
              <span className="font-semibold">{s.etiket}</span>
            </span>
          ))}
        </span>
      )}

      {/*
        ALT ŞERİT: `mt-auto` ile kartın dibine iniyor, ızgara satırında
        hizalı. Göstergeler metinli (ikon tek başına bilgi taşımıyor),
        Adaylar kartının bilgi şeridiyle aynı kalıp.
      */}
      <span className="mt-auto block pt-3">
        {(tarih || cvVar || onYaziVar || baglantilar.length > 0) && (
          <span
            className="block space-y-1.5 border-t pt-2.5 text-xs font-semibold"
            style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN_IKINCIL }}
          >
            {tarih && (
              <span className="flex items-start gap-1.5">
                <CalendarDays aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">{tarih} tarihinde başvurdu</span>
              </span>
            )}
            {(cvVar || onYaziVar || baglantilar.length > 0) && (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {cvVar && (
                  <span className="inline-flex items-center gap-1">
                    <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-blue-700" />
                    CV var
                  </span>
                )}
                {onYaziVar && (
                  <span className="inline-flex items-center gap-1">
                    <FileText aria-hidden className="h-3.5 w-3.5 shrink-0" />
                    Ön yazı
                  </span>
                )}
                {baglantilar.map((b) => {
                  const Ikon = BAGLANTI_IKONU[b.tur as keyof typeof BAGLANTI_IKONU] ?? Globe;
                  return (
                    <span key={b.tur} className="inline-flex items-center gap-1">
                      <Ikon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      {b.etiket}
                    </span>
                  );
                })}
              </span>
            )}
          </span>
        )}
        {/*
          "İncele" Adaylar'daki ana düğmenin GÖRÜNÜMÜ ama düğme değil:
          tıklayan kartın kendisi. İç içe düğme geçersiz HTML ve
          klavyede iki durak olurdu.
        */}
        <span
          aria-hidden
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-3.5 text-sm font-bold text-white transition-colors group-hover:bg-blue-700"
        >
          İncele
        </span>
      </span>
    </button>
  );
};
