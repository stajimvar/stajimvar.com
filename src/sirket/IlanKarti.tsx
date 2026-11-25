import React from 'react';
import { BarChart3, CalendarClock, MapPin, Pencil, Plus, Users } from 'lucide-react';
import { IlanIstatistikAyrintisi } from './IlanIstatistikAyrintisi';
import { donusumOrani, oranMetni } from '../lib/ilan-istatistik.mjs';
import {
  BIRINCIL_RENK,
  IKINCIL_DUGME,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  ikincilStil,
  kutuStil,
} from './renk';
import { ListingLogo } from '../components/ListingLogo';
import { AdayFotografi } from './AdayFotografi';
import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { ilanEylemleri } from '../lib/ilan-formu.mjs';
import {
  DEGISIKLIK_METNI,
  DEGISIKLIK_ROZETI,
  KONTROL_ETIKETI,
  bekleyenOku,
  gerekceSatiri,
  gerekceleriOku,
  kartKontrolDurumu,
  yoneticiKarariMi,
} from '../lib/ilan-kontrol-gorunumu.mjs';
import { daysUntilDeadline } from '../lib/opportunity-domain.mjs';
import { tarihMetni } from '../lib/tarih.mjs';

/**
 * İlan kartı — Genel ve İlanlar sekmesinin ORTAK kartı.
 *
 * NEDEN TEK BİLEŞEN
 * -----------------
 * Genel ekran ilanın kendisidir: her ilan kendi başvuranlarını taşır.
 * İlanlar sekmesi aynı ilanı yönetim eylemleriyle gösteriyor. İki ayrı
 * kart yazılsaydı durum rozeti ya da avatar şeridi birinde değişip
 * diğerinde unutulurdu. Fark yalnız sağdaki eylem kümesinde; o da
 * dışarıdan geliyor.
 *
 * DÖRT KAT, YUKARIDAN AŞAĞI (25 Kasım 2026)
 * ----------------------------------------
 * Kimlik (logo, başlık, rozetler, konum, son başvuru) → kontrol notu →
 * stat satırı (büyük rakam + küçük büyük-harf etiket, Başvuranlar
 * kartıyla aynı) → eylemler. Kart ızgara hücresi; eşit boy ve eylemler
 * dipte. Eski yatay üç bölümün neden kalktığı kartın üstünde.
 *
 * SAHTE SAYI YOK
 * --------------
 * BAŞVURU ve YENİ gerçek `applications` satırlarından; GÖRÜNTÜLENME,
 * KAYDETME, DÖNÜŞÜM ölçülen istatistikten (20270101010000) ve yalnız o
 * okuma geldiyse. Kademe kartları görmüyorsa (RLS veri vermiyor) rakam
 * yerine tek satır açıklama var; "0 yeni" yazmak, göremediği bir şeyi
 * yok sanmasına yol açardı.
 */

/** Başvuran kartından (lib/aday-kart.mjs) şeridin ihtiyacı kadarı. */
export type AdayOzeti = {
  id: string;
  ilanId: string | null;
  ad: string | null;
  fotoUrl: string | null;
  /** `social_profiles.avatar_path` (20270113010000). */
  fotoYolu?: string | null;
  gizli?: boolean;
  durum: string;
};

/** Şeritte en fazla bu kadar avatar; kalanı "+N". */
const SERIT_UST_SINIR = 5;

/* Durum rozeti renkleri: yayında = marka, yaklaşan kapanış ve inceleme =
   uyarı (amber), düzeltme = hata (gül), taslak/kapalı/kontrol = sessiz
   gri. Semantik renkler marka mavisinden ayrı. Kontrast (WCAG, hesaplandı):
   #92400E / #FEF3C7 = 6.37:1, #9F1239 / #FFF1F2 = 7.30:1,
   #4B5563 / #F3F4F6 = 6.87:1. */
const ROZET_ACIK = { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU };
const ROZET_UYARI = { background: '#FEF3C7', color: '#92400E' };
const ROZET_HATA = { background: '#FFF1F2', color: '#9F1239' };
const ROZET_SESSIZ = { background: '#F3F4F6', color: '#4B5563' };

/**
 * İlanın durum rozeti — etiket ve renk.
 *
 * "N gün kaldı" yalnız yayındaki VE son başvuru tarihi girilmiş ilanda,
 * 14 gün ve altında. Tarih yoksa "Yayında"; uydurma bir gün sayısı yok.
 *
 * YAYINDA OLMAYAN İLANIN DÖRT HÂLİ (20261120010000)
 * ------------------------------------------------
 * Taslak artık tek bir durum değil: hiç gönderilmemiş ("Taslak"),
 * kontrolü tamamlanamamış ("Kontrol ediliyor"), şirketin düzeltmesi
 * gereken ("Düzeltme gerekiyor") ve ekibin incelediği ("İnceleme
 * gerekiyor"). Dördü de öğrenciye görünmüyor ama şirketin yapacağı iş
 * farklı; tek "Taslak" rozeti, düzeltilmesi gereken ilanı sessizce
 * bekletirdi. Etiketler formla aynı kaynaktan (lib/ilan-kontrol-gorunumu).
 */
export function ilanDurumRozeti(
  ilan: Record<string, unknown>,
  simdi: Date = new Date(),
): { etiket: string; stil: React.CSSProperties } {
  const kontrol = kartKontrolDurumu(ilan);
  if (kontrol === 'yayinda') {
    /*
      TARİHSİZ İLAN "BUGÜN KAPANIYOR" DEĞİL

      `daysUntilDeadline(null)` `new Date(null)` = 1970 üretip 0 gün
      döndürüyor; son başvuru girilmemiş her yayındaki ilan kartta "Bugün
      kapanıyor" çıkıyordu (yerelde ölçüldü, 18 Eylül 2026: deadline NULL
      satır). Tarih yoksa hesap hiç yapılmıyor ve rozet "Açık".
    */
    const sonBasvuru = ilan.application_deadline;
    const kalan = sonBasvuru ? daysUntilDeadline(sonBasvuru as string, simdi) : null;
    if (kalan != null && kalan <= 14) {
      return {
        etiket: kalan === 0 ? 'Bugün kapanıyor' : `${kalan} gün kaldı`,
        stil: ROZET_UYARI,
      };
    }
    return { etiket: KONTROL_ETIKETI.yayinda, stil: ROZET_ACIK };
  }
  if (kontrol === 'duzeltme_gerekiyor') return { etiket: KONTROL_ETIKETI.duzeltme_gerekiyor, stil: ROZET_HATA };
  if (kontrol === 'inceleme_gerekiyor') return { etiket: KONTROL_ETIKETI.inceleme_gerekiyor, stil: ROZET_UYARI };
  if (kontrol === 'kontrol_ediliyor') return { etiket: KONTROL_ETIKETI.kontrol_ediliyor, stil: ROZET_SESSIZ };
  if (kontrol === 'taslak') return { etiket: KONTROL_ETIKETI.taslak, stil: ROZET_SESSIZ };
  return { etiket: 'Kapalı', stil: ROZET_SESSIZ };
}

/**
 * Kartın altındaki kontrol notu — ilan neden yayında değil.
 *
 * TELEFONDA OKUNUYOR: gerekçe bir ipucu balonunda ya da rozetin
 * `title`ında değil, kartın içinde düz metin. `truncate` YOK: tek satıra
 * kısaltılan gerekçe işe yaramaz.
 *
 * ESKİ RET NOTU KORUNUYOR: göçten önce reddedilen ilanın nedeni yalnız
 * `review_note`ta. Yönetici reddi artık gerekçelere de yazılıyor
 * (`kural: 'yonetici'`); o durumda aynı not iki kez çizilmiyor.
 *
 * YÖNETİCİ KARARI "YAYINA ÇIKMADI" DEĞİL: yayından kaldırılan ilan
 * yayındaydı. Gerekçe yöneticiden geliyorsa (`yonetici.kaldirdi` /
 * `yonetici.reddetti`) başlık "Ekibimizin kararı" ve yeniden gönderimin
 * nereye gittiği söyleniyor (sunucu onu yöneticiye düşürüyor).
 *
 * YAYINDAKİ İLANIN BEKLEYEN DEĞİŞİKLİĞİ: ilan yayında kalıyor; not,
 * değişikliğin neden yayına girmediğini ve önceki hâlin yayında olduğunu
 * söylüyor (metin formla ortak: DEGISIKLIK_METNI).
 */
export const KontrolNotu: React.FC<{ ilan: Record<string, unknown> }> = ({ ilan }) => {
  const kontrol = kartKontrolDurumu(ilan);
  const gerekceler = gerekceleriOku(ilan.kontrol_gerekceleri);
  const reviewNote = String(ilan.review_note ?? '').trim();
  const eskiNot =
    ilan.status === 'draft' && reviewNote && !gerekceler.some((g) => g.kural === 'yonetici') ? reviewNote : '';

  const degisiklik = kontrol === 'yayinda' ? bekleyenOku(ilan.bekleyen) : null;
  const yoneticiKarari = yoneticiKarariMi(gerekceler);

  let govde: React.ReactNode = null;
  if (degisiklik) {
    const stil =
      degisiklik.durum === 'duzeltme_gerekiyor'
        ? ROZET_HATA
        : degisiklik.durum === 'inceleme_gerekiyor'
          ? ROZET_UYARI
          : ROZET_SESSIZ;
    govde = (
      <div className="mt-2 rounded-lg px-2 py-1.5 text-xs leading-relaxed" style={stil}>
        <p className="font-bold">
          {degisiklik.durum === 'duzeltme_gerekiyor'
            ? 'Değişikliklerin yayına girmedi; ilanın önceki hâli yayında. Düzeltilmesi gerekenler:'
            : DEGISIKLIK_METNI[degisiklik.durum]}
        </p>
        {degisiklik.durum === 'duzeltme_gerekiyor' && degisiklik.gerekceler.length > 0 && (
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
            {degisiklik.gerekceler.map((g, i) => (
              <li key={i} className="break-words">
                {gerekceSatiri(g)}
              </li>
            ))}
          </ul>
        )}
        {degisiklik.durum === 'inceleme_gerekiyor' &&
          degisiklik.gerekceler.map((g, i) => (
            <p key={i} className="break-words">
              {g.mesaj}
            </p>
          ))}
      </div>
    );
  } else if (kontrol === 'duzeltme_gerekiyor') {
    govde = (
      <div className="mt-2 rounded-lg px-2 py-1.5 text-xs leading-relaxed" style={ROZET_HATA}>
        <p className="font-bold">
          {yoneticiKarari ? 'Ekibimizin kararı:' : 'Yayına çıkmadı. Düzeltilmesi gerekenler:'}
        </p>
        {gerekceler.length > 0 ? (
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
            {gerekceler.map((g, i) => (
              <li key={i} className="break-words">
                {gerekceSatiri(g)}
              </li>
            ))}
          </ul>
        ) : (
          <p>Gerekçe kaydı yok. İlanı düzenleyip yeniden yayına gönderebilirsin.</p>
        )}
        {yoneticiKarari && (
          <p className="mt-0.5">
            İlanı düzenleyip yeniden yayına gönderebilirsin; bu kez ekibimizin incelemesine gider.
          </p>
        )}
      </div>
    );
  } else if (kontrol === 'inceleme_gerekiyor') {
    govde = (
      <div className="mt-2 space-y-0.5 rounded-lg px-2 py-1.5 text-xs leading-relaxed" style={ROZET_UYARI}>
        {gerekceler.length > 0 ? (
          gerekceler.map((g, i) => (
            <p key={i} className="break-words">
              {g.mesaj}
            </p>
          ))
        ) : (
          <p>İlan ekibimizin incelemesinde.</p>
        )}
        <p>İnceleme sürerken ilan öğrencilere görünmüyor.</p>
      </div>
    );
  } else if (kontrol === 'kontrol_ediliyor') {
    govde = (
      <p className="mt-2 rounded-lg px-2 py-1.5 text-xs leading-relaxed" style={ROZET_SESSIZ}>
        Otomatik kontrol tamamlanamadı; sunucu kontrolü kendisi yeniden deneyecek. Kontrol bitene kadar
        ilan öğrencilere görünmüyor.
      </p>
    );
  }

  if (!govde && !eskiNot) return null;
  return (
    <>
      {govde}
      {eskiNot && (
        <p
          className="mt-2 rounded-lg px-2 py-1.5 text-xs leading-relaxed"
          style={{ background: SIRKET_ROZET, color: SIRKET_METIN }}
        >
          <strong>İnceleme notu:</strong> {eskiNot}
        </p>
      )}
    </>
  );
};

const Avatar: React.FC<{ aday: AdayOzeti }> = ({ aday }) => (
  <AdayFotografi
    ad={aday.ad}
    fotoYolu={aday.fotoYolu ?? null}
    fotoUrl={aday.fotoUrl}
    gizli={Boolean(aday.gizli)}
    className="h-8 w-8 text-[11px] ring-2 ring-white"
  />
);

/** Kart istatistik satırı (20270101010000); `basvuru` dönüşüm oranı için. */
type IlanKartIstatistigi = { goruntulenme: number; sonYediGun: number; kaydeden: number; basvuru?: number };

/*
  Kartın birincil düğmesi. Paneldeki BIRINCIL_DUGME 48 px ve `font-black`;
  sayfada tek olan "İlan oluştur" için. Her kartta tekrar eden birincil
  eylem o ağırlıkta altı kartlık ızgarada başlıkla yarışırdı. Burada
  ikincil düğmeyle AYNI kutu (44 px, `font-bold`), yalnız renk birincil:
  satırdaki öteki düğmelerle aynı hizada duruyor.
*/
const KART_BIRINCIL =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ' +
  `transition-[background-color] duration-150 ${BIRINCIL_RENK} ${SIRKET_ODAK}`;

/** Stat satırının tek kalemi — Başvuranlar kartındaki (AdayKarti) ölçüler. */
const Stat: React.FC<{ deger: string; etiket: string; vurgu?: boolean; children?: React.ReactNode }> = ({
  deger,
  etiket,
  vurgu,
  children,
}) => (
  <span className="flex items-center gap-2">
    {children}
    <span className="flex items-baseline gap-1.5">
      <span
        className="text-lg font-extrabold leading-none tabular-nums"
        style={{ color: vurgu ? SIRKET_VURGU_KOYU : SIRKET_METIN }}
      >
        {deger}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: SIRKET_METIN_IKINCIL }}>
        {etiket}
      </span>
    </span>
  </span>
);

export const IlanKarti: React.FC<{
  ilan: Record<string, unknown>;
  /**
   * Bu ilana gelen başvurular. `null` = kademe kart görmüyor (RLS veri
   * vermiyor); boş dizi = görüyor ama başvuru yok. İkisi ayrı cümle.
   */
  basvurular: AdayOzeti[] | null;
  onNavigate: (yol: string) => void;
  /** İlanlar sekmesinin ek eylemleri (Kapat / Yayınla, taşma menüsü). */
  ekEylemler?: React.ReactNode;
  /** Rozet satırına eklenen rozet (ör. "Kariyer sayfasından"). */
  ekRozet?: React.ReactNode;
  /** Kimlik bloğunun altına, kartın tam genişliğine düşen içerik (ör. inceleme notu). */
  altNot?: React.ReactNode;
  /**
   * Kartın sahibi şirketin adı ve logosu — herkese açık ilan kartındaki
   * ile aynı sunum için. Verilmezse logo ve ad satırı hiç çizilmiyor:
   * `ListingLogo` adsız baş harf üretemez ve boş bir daire kalırdı.
   */
  sirketAdi?: string | null;
  logoUrl?: string | null;
  simdi?: Date;
  /**
   * Ölçülen görüntülenme ve kaydetme (20270101010000). Verilmezse
   * kalemler çizilmiyor; taslakta da yok (öğrenciye görünmüyor).
   */
  istatistik?: IlanKartIstatistigi;
}> = ({ ilan, basvurular, onNavigate, ekEylemler, ekRozet, altNot, sirketAdi, logoUrl, simdi, istatistik }) => {
  const [ayrintiAcik, setAyrintiAcik] = React.useState(false);
  const id = String(ilan.id);
  const rozet = ilanDurumRozeti(ilan, simdi);
  const degisiklik = ilan.status === 'published' ? bekleyenOku(ilan.bekleyen) : null;
  const eylem = ilanEylemleri(ilan);
  const taslak = ilan.status === 'draft';
  const sehir = String(ilan.city ?? '').trim();
  /* Konum metni herkese açık kartla aynı kuraldan geçiyor: il adı
     normalleştiriliyor, çalışma biçimi varsa ekleniyor. */
  const calisma = calismaEtiketi(ilan.work_type as string | null | undefined);
  const konum = [konumEtiketi(sehir), calisma].filter(Boolean).join(' · ');
  /* Son başvuru yalnız girilmişse; `tarihMetni` boş girdide null döndürüyor. */
  const sonBasvuru = tarihMetni(ilan.application_deadline as string | null | undefined);

  const yeni = basvurular ? basvurular.filter((b) => b.durum === 'submitted') : [];
  const toplam = basvurular ? basvurular.length : 0;
  const gosterilen = yeni.slice(0, SERIT_UST_SINIR);
  const fazla = yeni.length - gosterilen.length;
  const olcum = istatistik && !taslak ? istatistik : null;
  const donusum = olcum && olcum.basvuru !== undefined ? donusumOrani(olcum.basvuru, olcum.goruntulenme) : null;

  return (
    /*
      IZGARA HÜCRESİ, EŞİT BOY (25 Kasım 2026, Başvuranlar ve Adaylar
      ekranlarıyla aynı kalite)

      Kart 1440 px'te 1360 px genişliğinde, 122 px yüksekliğinde tek bir
      satırdı (ölçüldü): başlık solda, avatar şeridi ortada, dört düğme
      sağda, aralarında yüzlerce piksel boşluk. Göz her ilan için satırı
      soldan sağa taramak zorundaydı. Artık dikey kart: kimlik → not →
      stat satırı → eylemler. Liste geniş ekranda iki sütun (GenelBakis);
      kartlar satır içinde aynı boyda (`h-full flex-col`), eylemler
      `mt-auto` ile kartın dibinde, yan yana iki kartta aynı y'de.

      @container KALKTI: dizilişi kap genişliğine göre değişen bir satır
      artık yok (kart hep dikey). Kap sorgusu li'ye düzen sınırlaması
      getiriyordu; o da taşma menüsünün `fixed inset-0` kapatma katmanını
      kartın içine hapsediyor ve alttaki kartın açık menüyü örtmesine yol
      açıyordu — kart ızgaraya girince menü bir alt satıra taşıyor.
    */
    <li className="flex h-full min-w-0 flex-col rounded-2xl border p-4 shadow-xs sm:p-5" style={kutuStil}>
      {/*
        LOGO + BİLGİ — HERKESE AÇIK İLAN KARTIYLA AYNI (kullanıcı isteği,
        28 Eylül 2026)

        Ölçüler `InternshipCard` ile BİREBİR: 80×80 logo, `rounded-xl`,
        konumda aynı `MapPin`. Kopyalanan şey BİLEŞENİN KENDİSİ
        (`ListingLogo`); logo standardı orada tek yerde duruyor.

        METİN SÜTUNU 12 REM'İN ALTINA İNMİYOR: `min-w-48` + `flex-wrap`;
        logo ile metin 80 + 12 + 192 = 284 px'e sığmıyorsa (320 px ekranda
        kartın iç genişliği 239 ölçüldü) metin logonun ALTINA iniyor.
        Daralan bir sütun adı harf harf kırıyordu (canlıdaki "Ogulsize").
      */}
      <div className="flex min-w-0 items-start gap-3 flex-wrap">
        {sirketAdi && (
          <div className="shrink-0" title={sirketAdi}>
            <ListingLogo
              name={sirketAdi}
              logoUrl={logoUrl || undefined}
              className="!h-20 !w-20 !rounded-xl !p-2 !text-2xl"
            />
          </div>
        )}
        <div className="min-w-48 flex-1">
          {/*
            BAŞLIK KESİLMİYOR: eskiden `truncate` idi ve 375 px'te
            "İnsan Kaynakları Stajyeri (kaynaktan)" üç noktayla bitiyordu
            (ölçüldü, 25 Kasım 2026). İlan adı kartın kimliği; satır kırıyor.
          */}
          <h3 className="break-words text-[17px] font-extrabold leading-snug" style={{ color: SIRKET_METIN }}>
            {String(ilan.title ?? '')}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-[11px] font-bold"
              style={rozet.stil}
            >
              {rozet.etiket}
            </span>
            {/*
              YAYINDA + BEKLEYEN DEĞİŞİKLİK: ana rozet "Yayında" kalıyor
              (ilan gerçekten yayında); değişikliğin durumu ikinci, ayrı
              bir rozette. Tek rozet ya ilanı ya değişikliği yanlış anlatırdı.
            */}
            {degisiklik && (
              <span
                className="inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-[11px] font-bold"
                style={
                  degisiklik.durum === 'duzeltme_gerekiyor'
                    ? ROZET_HATA
                    : degisiklik.durum === 'inceleme_gerekiyor'
                      ? ROZET_UYARI
                      : ROZET_SESSIZ
                }
              >
                {DEGISIKLIK_ROZETI[degisiklik.durum]}
              </span>
            )}
            {ekRozet}
          </div>
          {sirketAdi && (
            <p className="mt-1.5 break-words text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              {sirketAdi}
            </p>
          )}
          {/*
            META SATIRI: konum ve son başvuru, ikisi de ikonlu VE metinli.
            Çalışma biçimi BİLİNMİYORSA yazılmıyor — varsayılan uydurulmuyor
            (`InternshipCard` ile aynı kural). Süre yazılmıyor: panelin
            ilan okuması `duration` kolonunu almıyor.

            Şehir boşsa konum kalemi çizilmiyor; `konumEtiketi` boş girdide
            "Konum belirtilmemiş" döndürüyor ve şirketin kendi panelinde bu,
            girmediği bir alanı doldurulmuş göstermek olurdu.
          */}
          {(sehir || sonBasvuru) && (
            <div
              className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm"
              style={{ color: SIRKET_METIN_IKINCIL }}
            >
              {sehir && (
                <p className="flex min-w-0 items-center gap-1.5">
                  <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="min-w-0 break-words">{konum}</span>
                </p>
              )}
              {sonBasvuru && (
                <p className="flex min-w-0 items-center gap-1.5">
                  <CalendarClock aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="min-w-0 break-words">Son başvuru {sonBasvuru}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Kontrol notu ve eylem sonucu kartın tam genişliğinde: gerekçe uzun olabiliyor. */}
      {altNot}

      {/*
        STAT SATIRI — Başvuranlar kartıyla aynı dil: büyük rakam, küçük
        büyük-harf etiket. Her rakam gerçek bir kaynaktan: BAŞVURU ve YENİ
        `applications` satırlarından, GÖRÜNTÜLENME / KAYDETME / DÖNÜŞÜM
        `sirket_ilan_istatistikleri`nden. Ölçüm gelmediyse o kalemler yok.

        Başvuru sıfırsa "0 BAŞVURU" yerine durum cümlesi: kart görebilen
        şirkette "Henüz başvuru yok", taslakta "Yayınlanınca başvuru alır".
        Kademe kartları görmüyorsa (RLS veri vermiyor) rakam HİÇ yok;
        "0" yazmak, göremediği bir şeyi yok sanmasına yol açardı.

        İKİ KAT, BİLEREK: üstte başvurular (`applications`), altta ölçülen
        ziyaret (istatistik). Tek satırda beş kalem + avatar şeridi 632
        px'lik kartta (1440 px, iki sütun) iki satıra rastgele kırılıyordu
        ve yan yana kartlarda farklı yerden kırılıyordu (ölçüldü). İki kat
        her kartta aynı yerde duruyor; ölçüm yoksa alt kat hiç yok.
      */}
      <div className="mt-3 min-w-0 border-y" style={{ borderColor: SIRKET_KENAR }}>
        <div className="flex min-h-12 min-w-0 flex-wrap items-center gap-x-5 gap-y-2 py-2">
          {basvurular === null ? (
            /*
              Kademe kart görmüyor. Utandırmayan tek satır: ne yapılınca
              açılacağı yazıyor. Doğrulama Şirket sekmesinde; satır oraya
              götürüyor.
            */
            <button
              type="button"
              onClick={() => onNavigate('/sirket/profil')}
              className={`min-h-11 cursor-pointer rounded-lg text-left text-sm leading-snug underline-offset-2 hover:underline ${SIRKET_ODAK}`}
              style={{ color: SIRKET_METIN_IKINCIL }}
            >
              Adayları görmek için doğrulama gerekiyor
            </button>
          ) : toplam > 0 ? (
            <>
              <Stat deger={String(toplam)} etiket="Başvuru" />
              {yeni.length > 0 && (
                <Stat deger={String(yeni.length)} etiket="Yeni" vurgu>
                  {/* Avatar şeridi kimin beklediğinin yüzü; sayı yanında metin olarak. */}
                  <ul className="flex -space-x-2" aria-hidden>
                    {gosterilen.map((a) => (
                      <li key={a.id}>
                        <Avatar aday={a} />
                      </li>
                    ))}
                    {fazla > 0 && (
                      <li>
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black ring-2 ring-white"
                          style={{ background: '#F3F4F6', color: SIRKET_METIN_IKINCIL }}
                        >
                          +{fazla}
                        </span>
                      </li>
                    )}
                  </ul>
                </Stat>
              )}
            </>
          ) : (
            /* Taslak öğrenciye görünmüyor; "başvuru yok" değil, "henüz alamaz". */
            <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              {taslak ? 'Yayınlanınca başvuru alır' : 'Henüz başvuru yok'}
            </p>
          )}
        </div>
        {/*
          ÖLÇÜM KATI. Ölçümün ne saydığı ipucu balonunda DEĞİL (panel
          telefonda okunuyor): "Günlük ayrıntı" açılınca özet cümlesinde
          yazıyor. "Son 7 gün" kartta yok: sayfa başındaki özet şeridinde ve
          günlük ayrıntıda var; kartta altıncı kalem katı ikiye kırıyordu.
          Başvurusu olmayan ilanda dönüşüm yazılmıyor: "%0" üst kattaki
          "Henüz başvuru yok"u tekrar ederdi.
        */}
        {olcum && (
          <div
            className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 border-t py-1"
            style={{ borderColor: SIRKET_KENAR }}
          >
            <Stat deger={String(olcum.goruntulenme)} etiket="Görüntülenme" />
            <Stat deger={String(olcum.kaydeden)} etiket="Kaydetme" />
            {donusum !== null && donusum > 0 && <Stat deger={oranMetni(donusum)} etiket="Dönüşüm" />}
            <button
              type="button"
              onClick={() => setAyrintiAcik((a) => !a)}
              aria-expanded={ayrintiAcik}
              className={`ml-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg text-sm font-bold underline-offset-2 hover:underline ${SIRKET_ODAK}`}
              style={{ color: SIRKET_VURGU_KOYU }}
            >
              <BarChart3 className="h-4 w-4" aria-hidden />
              {ayrintiAcik ? 'Ayrıntıyı gizle' : 'Günlük ayrıntı'}
            </button>
          </div>
        )}
      </div>
      {olcum && ayrintiAcik && <IlanIstatistikAyrintisi ilanId={String(ilan.id)} />}

      {/*
        EYLEMLER KARTIN DİBİNDE (`mt-auto`): aynı satırdaki iki kartın
        düğmeleri aynı y'de. DOM sırası görsel sırayla aynı (klavye de öyle
        gezer): birincil "Başvuranları gör", ikinciller, taşma menüsü en
        sağda (GenelBakis `ml-auto` veriyor).

        Telefonda birincil düğme kendi satırında tam genişlik, ikinciller
        alttaki satırda. Eskiden dört düğme aynı `flex-wrap`te kırılıyor
        ve 375 px'te "⋯" menüsü tek başına bir satıra düşüyordu (ölçüldü).
      */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        {/*
          "Başvuranları gör" yalnız gidilecek bir şey varsa: kart görülüyor
          ve en az bir başvuru var. Başvuranlar sekmesi bu ilana süzülmüş
          açılıyor.
        */}
        {basvurular !== null && toplam > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(`/sirket/basvuranlar?ilan=${encodeURIComponent(id)}`)}
            className={`w-full sm:w-auto ${KART_BIRINCIL}`}
          >
            <Users className="h-4 w-4" aria-hidden />
            Başvuranları gör
          </button>
        )}
        {eylem.duzenlenebilir && (
          <button
            type="button"
            onClick={() => onNavigate(`/sirket/ilan/${id}/duzenle`)}
            className={IKINCIL_DUGME}
            style={ikincilStil}
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Düzenle
          </button>
        )}
        {ekEylemler}
      </div>
    </li>
  );
};

/**
 * Listenin sonundaki "+ Yeni ilan" kartı.
 *
 * Kesikli kenar: bu bir ilan değil, ilanın açılacağı yer. Üst çubuktaki
 * düğmeyle aynı yere gidiyor; listeyi okuyup "bir tane daha" diyen
 * kişinin eli oradayken düğme yukarıda kalmasın diye.
 */
export const YeniIlanKarti: React.FC<{ onNavigate: (yol: string) => void }> = ({ onNavigate }) => (
  <li>
    <button
      type="button"
      onClick={() => onNavigate('/sirket/ilan/yeni')}
      className={`flex min-h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white text-sm font-bold transition-[background-color,border-color] duration-150 hover:border-blue-600 hover:bg-blue-50 ${SIRKET_ODAK}`}
      style={{ color: SIRKET_VURGU_KOYU }}
    >
      <Plus className="h-4 w-4" aria-hidden />
      Yeni ilan
    </button>
  </li>
);
