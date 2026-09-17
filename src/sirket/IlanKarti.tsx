import React from 'react';
import { Pencil, Plus, User, Users } from 'lucide-react';
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
import { monogram } from '../lib/aday-kart.mjs';
import { ilanEylemleri } from '../lib/ilan-formu.mjs';
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
 * şeridi ve sayısı. Sağ: eylemler. Orta bölüm geniş ekranda sabit
 * genişlikte ki alt alta duran kartların sütunları hizalansın; dar
 * ekranda üç bölüm alt alta iniyor.
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

/* Durum rozeti renkleri: açık = marka, yaklaşan kapanış = uyarı (amber),
   taslak/kapalı = sessiz gri. Semantik renkler marka mavisinden ayrı. */
const ROZET_ACIK = { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU };
const ROZET_UYARI = { background: '#FEF3C7', color: '#92400E' };
const ROZET_SESSIZ = { background: '#F3F4F6', color: '#4B5563' };

/**
 * İlanın durum rozeti — etiket ve renk.
 *
 * "N gün kaldı" yalnız yayındaki VE son başvuru tarihi girilmiş ilanda,
 * 14 gün ve altında. Tarih yoksa "Açık"; uydurma bir gün sayısı yok.
 */
export function ilanDurumRozeti(
  ilan: Record<string, unknown>,
  simdi: Date = new Date(),
): { etiket: string; stil: React.CSSProperties } {
  const durum = String(ilan.status ?? '');
  if (durum === 'published') {
    const kalan = daysUntilDeadline(ilan.application_deadline as string, simdi);
    if (kalan != null && kalan <= 14) {
      return {
        etiket: kalan === 0 ? 'Bugün kapanıyor' : `${kalan} gün kaldı`,
        stil: ROZET_UYARI,
      };
    }
    return { etiket: 'Açık', stil: ROZET_ACIK };
  }
  if (durum === 'draft') return { etiket: 'Taslak', stil: ROZET_SESSIZ };
  return { etiket: 'Kapalı', stil: ROZET_SESSIZ };
}

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
  simdi?: Date;
}> = ({ ilan, basvurular, onNavigate, ekEylemler, ekRozet, altNot, simdi }) => {
  const id = String(ilan.id);
  const rozet = ilanDurumRozeti(ilan, simdi);
  const eylem = ilanEylemleri(ilan);
  const taslak = ilan.status === 'draft';
  const sehir = String(ilan.city ?? '').trim();

  const yeni = basvurular ? basvurular.filter((b) => b.durum === 'submitted') : [];
  const toplam = basvurular ? basvurular.length : 0;
  const gosterilen = yeni.slice(0, SERIT_UST_SINIR);
  const fazla = yeni.length - gosterilen.length;

  return (
    <li className="rounded-2xl border p-4 shadow-xs sm:p-5" style={kutuStil}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* ------------------------------------------------------ sol */}
        <div className="min-w-0 sm:flex-1">
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
            {ekRozet}
          </div>
          {sehir && (
            <p className="mt-0.5 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              {sehir}
            </p>
          )}
          {altNot}
        </div>

        {/* ----------------------------------------------------- orta */}
        <div className="min-w-0 sm:w-56 sm:shrink-0">
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
        <div className="flex flex-wrap items-center gap-2 sm:min-w-[232px] sm:shrink-0 sm:justify-end">
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
