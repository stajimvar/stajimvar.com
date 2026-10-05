import React from 'react';
import { MapPin, Pencil, Plus, User, Users } from 'lucide-react';
import {
  IKINCIL_DUGME,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  ikincilStil,
  kutuStil,
} from './renk';
import { ListingLogo } from '../components/ListingLogo';
import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { monogram } from '../lib/aday-kart.mjs';
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
 * ÜÇ BÖLÜM, AYNI ÖLÇÜ
 * -------------------
 * Sol: başlık, şehir, durum rozeti. Orta: yeni başvuranların avatar
 * şeridi ve sayısı. Sağ: eylemler. Orta bölüm geniş kapta sabit
 * genişlikte ki alt alta duran kartların sütunları hizalansın; dar
 * kapta üç bölüm alt alta iniyor. "Geniş" EKRANIN değil KARTIN
 * genişliği — gerekçesi satırın üstünde.
 *
 * SAHTE SAYI YOK
 * --------------
 * Görüntülenme sayısı veri modelinde yok, o yüzden yazılmıyor. Yeni
 * başvuran sayısı gerçek `submitted` satırlarından. Kademe kartları
 * görmüyorsa (RLS veri vermiyor) şerit yerine tek satır açıklama var;
 * "0 yeni" yazmak, göremediği bir şeyi yok sanmasına yol açardı.
 */

/** Başvuran kartından (lib/aday-kart.mjs) şeridin ihtiyacı kadarı. */
export type AdayOzeti = {
  id: string;
  ilanId: string | null;
  ad: string | null;
  fotoUrl: string | null;
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

const Avatar: React.FC<{ aday: AdayOzeti }> = ({ aday }) =>
  aday.fotoUrl ? (
    <img
      src={aday.fotoUrl}
      alt=""
      className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white"
    />
  ) : (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black ring-2 ring-white"
      style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
    >
      {/* Ad paylaşılmamışsa (rıza yok) harf uydurmuyoruz; nötr simge. */}
      {aday.ad ? monogram(aday.ad) : <User className="h-4 w-4" />}
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
  /** Başlık satırına eklenen rozet (ör. "Kariyer sayfasından"). */
  ekRozet?: React.ReactNode;
  /** Sol bölümün altına düşen içerik (ör. inceleme notu). */
  altNot?: React.ReactNode;
  /**
   * Kartın sahibi şirketin adı ve logosu — herkese açık ilan kartındaki
   * ile aynı sunum için. Verilmezse logo ve ad satırı hiç çizilmiyor:
   * `ListingLogo` adsız baş harf üretemez ve boş bir daire kalırdı.
   */
  sirketAdi?: string | null;
  logoUrl?: string | null;
  simdi?: Date;
}> = ({ ilan, basvurular, onNavigate, ekEylemler, ekRozet, altNot, sirketAdi, logoUrl, simdi }) => {
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

  const yeni = basvurular ? basvurular.filter((b) => b.durum === 'submitted') : [];
  const toplam = basvurular ? basvurular.length : 0;
  const gosterilen = yeni.slice(0, SERIT_UST_SINIR);
  const fazla = yeni.length - gosterilen.length;

  return (
    <li className="@container rounded-2xl border p-4 shadow-xs sm:p-5" style={kutuStil}>
      {/*
        YAN YANA DÜZEN KARTIN GENİŞLİĞİNE BAĞLI, EKRANINKİNE DEĞİL
        (container sorgusu; depoda ilk kullanım)

        Satır eskiden `sm:flex-row` ile 640 px EKRANDA yan yana diziliyordu.
        Aynı kart /sirket/profil'de üç sütunlu sayfanın ortasında ~750 px'lik
        bir kapta duruyor; 1919 px ekranda `sm:` açık, kap dar. Logo (80 px)
        eklenince metin sütununa hiç yer kalmadı: fikstürde 750 px kapta
        dört eylemli kartın metin sütunu 0 px ölçüldü, başlık 0 px genişlikte,
        şirket adı satırı 360 px yüksekliğinde harf harf alt alta (canlıdaki
        "Ogulsize" görüntüsü). Ekran kırılımı bu kartın gerçek yerini
        bilemiyor; kartın kendi genişliği biliyor.

        Eşik 60 rem (960 px, kartın İÇ genişliği). Yan yana düzenin en kötü
        hâli ölçüldü: logo 80 + 12 + metin 192 (12 rem alt sınır) + 16 +
        orta 224 + 16 + dört eylem 367 (Adaylar 108, Düzenle 111, Yayınla 80,
        menü 44, aralar 3×8) = 907 px. Eşiğin hemen üstünde metin sütunu
        en kötü hâlde 246 px ölçüldü; yazı tipi farkına ~50 px pay.
        Tailwind'in hazır `@4xl` (896) eşiği bu toplamın altında kalıyor,
        `@5xl` (1024) ise İlanlar sekmesini 1100 px ekranda (kartın iç
        genişliği 979 ölçüldü, dört eylemde metin 264 px) gereksiz yere
        alt alta dizerdi.
      */}
      <div className="flex flex-col gap-3 @min-[60rem]:flex-row @min-[60rem]:items-center @min-[60rem]:gap-4">
        {/* ------------------------------------------------------ sol */}
        {/*
          LOGO + BİLGİ — HERKESE AÇIK İLAN KARTIYLA AYNI (kullanıcı isteği,
          28 Eylül 2026)

          Şirket kendi ilanını panelinde logosuz, çıplak bir başlık olarak
          görüyordu; aynı ilan herkese açık listede logolu kartla
          duruyordu. "İlan listesindeki gibi gözüksün, logom falan."

          Ölçüler `InternshipCard` ile BİREBİR: 80×80 logo, `rounded-xl`,
          aynı başlık ve şirket adı satırı, konumda aynı `MapPin`.
          Kopyalanan şey ölçüler değil BİLEŞENİN KENDİSİ (`ListingLogo`);
          logo standardı orada tek yerde duruyor ve iki kart birlikte
          değişiyor.

          Ad ya da logo verilmediyse blok hiç çizilmiyor: `ListingLogo`
          adsız çağrılırsa baş harf üretemez ve boş bir daire kalırdı.
        */}
        {/*
          METİN SÜTUNU 12 REM'İN ALTINA İNMİYOR

          `min-w-48` + `flex-wrap`: logo ile metin aynı satıra 80 + 12 + 192
          = 284 px'ten azında sığmıyorsa (320 px ekranda kartın iç genişliği
          239 ölçüldü) metin logonun ALTINA iniyor. Daralan bir metin sütunu
          başlığı `truncate` ile görünmez kılıyor, adı harf harf kırıyordu;
          logonun üstte tek başına durması ondan iyi.
        */}
        <div className="flex min-w-0 items-start gap-3 flex-wrap @min-[60rem]:flex-1">
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="min-w-0 truncate text-base font-bold" style={{ color: SIRKET_METIN }}>
                {String(ilan.title ?? '')}
              </h3>
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
              <p className="mt-0.5 break-words text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
                {sirketAdi}
              </p>
            )}
            {/*
              Konum satırı herkese açık karttaki gibi: simge + il, çalışma
              biçimi varsa nokta ile ekleniyor. Biçim BİLİNMİYORSA
              yazılmıyor — varsayılan uydurulmuyor (aynı kural
              `InternshipCard` içinde de yazılı).

              Şehir boşsa satırın tamamı çizilmiyor; `konumEtiketi` boş
              girdide "Konum belirtilmemiş" döndürüyor ve şirketin kendi
              panelinde bu, girmediği bir alanı doldurulmuş göstermek olurdu.
            */}
            {sehir && (
              <p
                className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm"
                style={{ color: SIRKET_METIN_IKINCIL }}
              >
                <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0 break-words">{konum}</span>
              </p>
            )}
            {altNot}
          </div>
        </div>

        {/* ----------------------------------------------------- orta */}
        <div className="min-w-0 @min-[60rem]:w-56 @min-[60rem]:shrink-0">
          {basvurular === null ? (
            /*
              Kademe kart görmüyor. Utandırmayan tek satır: ne yapılınca
              açılacağı yazıyor, "yükselt" baskısı yok. Doğrulama Şirket
              sekmesinde olduğu için satır oraya götürüyor.
            */
            <button
              type="button"
              onClick={() => onNavigate('/sirket/profil')}
              className={`min-h-11 cursor-pointer rounded-lg text-left text-sm leading-snug underline-offset-2 hover:underline ${SIRKET_ODAK}`}
              style={{ color: SIRKET_METIN_IKINCIL }}
            >
              Adayları görmek için doğrulama gerekiyor
            </button>
          ) : yeni.length > 0 ? (
            <div className="flex items-center gap-3">
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
              <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
                {yeni.length} yeni
              </p>
            </div>
          ) : toplam > 0 ? (
            <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              {toplam} başvuru · yeni yok
            </p>
          ) : taslak ? (
            /* Taslak öğrenciye görünmüyor; "başvuru yok" değil, "henüz alamaz". */
            <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              Yayınlanınca başvuru alır
            </p>
          ) : (
            <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              Henüz başvuru yok
            </p>
          )}
        </div>

        {/* ------------------------------------------------------ sağ */}
        {/*
          Alt genişlik 232 px = "Adaylar" + "Düzenle" (ölçüldü 109 + 8 + 109);
          yalnız "Düzenle" kalan satırda da orta sütun aynı x'te dursun.
        */}
        <div className="flex flex-wrap items-center gap-2 @min-[60rem]:min-w-[232px] @min-[60rem]:shrink-0 @min-[60rem]:justify-end">
          {/*
            "Adaylar" yalnız gidilecek bir şey varsa: kart görülüyor ve
            en az bir başvuru var. Başvuranlar sekmesi bu ilana süzülmüş
            açılıyor.
          */}
          {basvurular !== null && toplam > 0 && (
            <button
              type="button"
              onClick={() => onNavigate(`/sirket/basvuranlar?ilan=${encodeURIComponent(id)}`)}
              className={IKINCIL_DUGME}
              style={ikincilStil}
            >
              <Users className="h-4 w-4" aria-hidden />
              Adaylar
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
