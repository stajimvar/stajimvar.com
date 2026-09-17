import React from 'react';
import { AlertCircle, ArrowRight, Plus } from 'lucide-react';
import {
  BIRINCIL_DUGME,
  KUTU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  birincilStil,
  kutuStil,
} from './renk';
import { IlanKarti, YeniIlanKarti, type AdayOzeti } from './IlanKarti';
import { adayGorebilir } from '../lib/sirket-kademe.mjs';
import type { SirketBaglami, SirketProfilDegeri } from '../lib/sirket-veri';

/**
 * Şirket panelinin Genel ekranı.
 *
 * GÖSTERGE TAHTASI DEĞİL, İLANLARIN KENDİSİ
 * -----------------------------------------
 * Önce sayı karoları, sonra "sıradaki iş" kutusu ve ayrı bir ilan listesi
 * vardı. İK'nın 2 saniyede görmek istediği şey tek: hangi ilanımda kim
 * bekliyor. Bu yüzden ekran ilan kartlarından ibaret; her kart kendi
 * yeni başvuranlarını taşıyor ve bir dokunuşla o adaylara gidiyor.
 * Kart bileşeni İlanlar sekmesiyle ortak (./IlanKarti).
 *
 * PROFİL UYARISI TEK SATIR, VE YALNIZ EKSİKSE
 * -------------------------------------------
 * Öğrenci ilana bakmadan önce şirket sayfasını görüyor; logosu,
 * açıklaması ya da sitesi olmayan şirket "bu gerçek mi" sorusunu
 * doğuruyor. Eksik yoksa satır HİÇ çizilmiyor — "profilin tamam" demek
 * için yer harcamıyoruz. Profil okunamadıysa da çizilmiyor: bilmediğimiz
 * bir eksik iddia edilmez.
 *
 * SAHTE SAYI YOK
 * --------------
 * Görüntülenme, dönüşüm, "bu hafta %12" yok — veri modelinde yok.
 * Karttaki her sayı `applications` satırlarından.
 */

/** Genel'de uyarılan üç alan: öğrencinin şirket sayfasında ilk gördükleri. */
const PROFIL_EKSIK_ADLARI: Partial<Record<keyof SirketProfilDegeri, string>> = {
  logoUrl: 'logo',
  description: 'açıklama',
  websiteUrl: 'web sitesi',
};

export function profilEksikleri(profil: SirketProfilDegeri | null): string[] {
  if (!profil) return [];
  return (Object.keys(PROFIL_EKSIK_ADLARI) as (keyof SirketProfilDegeri)[])
    .filter((alan) => !String(profil[alan] ?? '').trim())
    .map((alan) => PROFIL_EKSIK_ADLARI[alan] as string);
}

export const GenelBakis: React.FC<{
  baglam: SirketBaglami;
  ilanlar: Record<string, unknown>[];
  basvurular: AdayOzeti[];
  /** `null` = henüz okunmadı ya da okunamadı; uyarı satırı çizilmez. */
  profil: SirketProfilDegeri | null;
  onNavigate: (yol: string) => void;
  simdi?: Date;
}> = ({ baglam, ilanlar, basvurular, profil, onNavigate, simdi }) => {
  const kartAcik = adayGorebilir(baglam.kademe);
  const eksikler = profilEksikleri(profil);

  /*
    0 İLAN: TEK KART, BAŞKA HİÇBİR ŞEY

    Profil uyarısı bile yok: ilanı olmayan şirketin ilk işi ilan açmak,
    ikinci işi değil.
  */
  if (ilanlar.length === 0) {
    return (
      <div className={`${KUTU} text-center`} style={kutuStil}>
        <h1 className="text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
          Henüz ilan yok
        </h1>
        <p
          className="mx-auto mt-1 max-w-md text-sm leading-relaxed"
          style={{ color: SIRKET_METIN_IKINCIL }}
        >
          İlk ilanı açmak iki dakika sürüyor: pozisyon, şehir, süre, ücret ve iş tanımı. İş
          tanımı için hazır şablon var.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/sirket/ilan/yeni')}
          className={`mx-auto mt-5 ${BIRINCIL_DUGME}`}
          style={{ ...birincilStil, minHeight: 56, paddingInline: 28, fontSize: 16 }}
        >
          <Plus className="h-5 w-5" aria-hidden />
          İlk ilanını aç
        </button>
      </div>
    );
  }

  const yeniToplam = basvurular.filter((b) => b.durum === 'submitted').length;

  return (
    <div className="space-y-4">
      <div>
        <h1
          className="truncate text-2xl font-extrabold tracking-tight"
          style={{ color: SIRKET_METIN }}
        >
          {baglam.ad || 'Genel'}
        </h1>
        {/*
          Alt satır gerçek sayılar: ilan adedi ve (kart görülüyorsa) yeni
          başvuru. Kademe pili üst çubukta `lg`den itibaren görünüyor;
          daha dar ekranda aynı cümle buraya iniyor ki durum kaybolmasın.
        */}
        <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          {ilanlar.length} ilan
          {kartAcik && yeniToplam > 0 ? ` · ${yeniToplam} yeni başvuru` : ''}
          <span className="lg:hidden">
            {' · '}
            {baglam.dogrulandi ? 'Doğrulanmış kurum' : 'İlan açık · aday kartları kapalı'}
          </span>
        </p>
      </div>

      {eksikler.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-2.5"
          style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">
            Profilde eksik: {eksikler.join(', ')}. Öğrenci ilana bakmadan önce şirket sayfanı
            görüyor.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/sirket/profil')}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-2 text-sm font-bold underline-offset-2 hover:underline ${SIRKET_ODAK}`}
            style={{ color: '#92400E' }}
          >
            Profili tamamla
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {ilanlar.map((ilan) => {
          const id = String(ilan.id);
          return (
            <IlanKarti
              key={id}
              ilan={ilan}
              basvurular={kartAcik ? basvurular.filter((b) => String(b.ilanId ?? '') === id) : null}
              onNavigate={onNavigate}
              simdi={simdi}
            />
          );
        })}
        <YeniIlanKarti onNavigate={onNavigate} />
      </ul>
    </div>
  );
};
