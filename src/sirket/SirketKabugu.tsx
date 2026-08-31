import React from 'react';
import { Briefcase, Building2, GraduationCap, LayoutGrid, Plus, Users } from 'lucide-react';
import { BottomNavigation, BottomNavigationItem } from '../ui/BottomNavigation';
import { BildirimDugmesi } from '../components/BildirimMerkezi';
import {
  birincilStil,
  SIRKET_ALT_MENU,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  SIRKET_ZEMIN,
} from './renk';

/**
 * Şirket dünyasının kabuğu.
 *
 * NEDEN AYRI KABUK
 * ----------------
 * Öğrenci arayüzü mavi-beyaz ve listeler hâlinde. İK'nın işi başka: gün
 * içinde birkaç kez girip ilan açmak ve başvuranları taramak. Ayrım
 * temanın karanlığında değil, RENGİNDE: burası turuncu-beyaz.
 *
 * Öğrenci teması buraya SIZMIYOR: bu ağaçta öğrenci navigasyonu, öğrenci
 * zemini (#F9FAFB) ve öğrenci mavisi hiç çizilmiyor.
 *
 * DÖRT İŞ, FAZLASI DEĞİL
 * ----------------------
 * İlanlar, Başvuranlar, Şirket, Öğrenci. Dördüncüsü bir sekme değil
 * KAPI: kullanıcıyı kendi öğrenci tarafına geri götürüyor. Eskiden
 * "Çıkış" yazıyordu ve oturumu kapattığı sanılıyordu; oturumu kapatmak
 * hesap menüsünün işi.
 */

export type SirketSekmesi = 'genel' | 'ilanlar' | 'basvuranlar' | 'sirket';

const SEKMELER: { id: SirketSekmesi; etiket: string; ikon: React.ReactNode; yol: string }[] = [
  { id: 'genel', etiket: 'Genel', ikon: <LayoutGrid className="h-5 w-5" />, yol: '/sirket' },
  { id: 'ilanlar', etiket: 'İlanlar', ikon: <Briefcase className="h-5 w-5" />, yol: '/sirket/ilanlar' },
  { id: 'basvuranlar', etiket: 'Başvuranlar', ikon: <Users className="h-5 w-5" />, yol: '/sirket/basvuranlar' },
  { id: 'sirket', etiket: 'Şirket', ikon: <Building2 className="h-5 w-5" />, yol: '/sirket/profil' },
];

export const SirketKabugu: React.FC<{
  secili: SirketSekmesi;
  onNavigate: (yol: string) => void;
  /** Öğrenci dünyasına dönüş. Oturum kapatma DEĞİL. */
  onOgrenciyeDon: () => void;
  /** Sağ üstte görünen kısa durum. Kademe numarası yazmıyor. */
  durumRozeti?: React.ReactNode;
  /* Bildirim durumu App'te; kabuk yalnızca düğmeyi çiziyor. */
  okunmamisBildirim?: number | null;
  onBildirimAc?: () => void;
  children: React.ReactNode;
}> = ({
  secili,
  onNavigate,
  onOgrenciyeDon,
  durumRozeti,
  okunmamisBildirim,
  onBildirimAc,
  children,
}) => (
  <div className="min-h-screen" style={{ background: SIRKET_ZEMIN, color: SIRKET_METIN }}>
    <header
      className="sticky top-0 z-30 border-b"
      style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => onNavigate('/sirket/ilanlar')}
          className="flex cursor-pointer items-center gap-2 font-black tracking-tight"
        >
          <span className="text-lg" style={{ color: SIRKET_METIN }}>
            StajımVar
          </span>
          {/*
            Monospace YALNIZCA etiketlerde (VKN, ilan no). Gövde metninde
            kullanmak paneli terminal taklidine çeviriyor.
          */}
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest"
            style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
          >
            İşveren
          </span>
        </button>

        {/*
          BİLDİRİM ZİLİ İKİ DÜNYADA DA AYNI SİSTEM

          Bildirim kullanıcıya ait, şirkete değil: aynı kişi öğrenci
          tarafına geçtiğinde aynı kayıtları görüyor. Değişen tek şey
          rengi — burası yeşil-beyaz.

          Menüden ÖNCE ve `ml-auto` ile sağa itiliyor ki dar ekranda da
          (menü gizliyken) görünsün.
        */}
        {onBildirimAc && (
          <div className="ml-auto sm:ml-auto">
            <BildirimDugmesi
              okunmamis={okunmamisBildirim ?? null}
              renk={SIRKET_VURGU_KOYU}
              onAc={onBildirimAc}
              style={{ color: SIRKET_METIN_IKINCIL }}
            />
          </div>
        )}

        <nav aria-label="Şirket menüsü" className="hidden items-center gap-1 sm:flex">
          {SEKMELER.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onNavigate(s.yol)}
              aria-current={secili === s.id ? 'page' : undefined}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors"
              style={
                secili === s.id
                  ? { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }
                  : { color: SIRKET_METIN_IKINCIL }
              }
            >
              {s.ikon}
              {s.etiket}
            </button>
          ))}
          <span className="mx-1 h-6 w-px" style={{ background: SIRKET_KENAR }} />
          <button
            type="button"
            onClick={onOgrenciyeDon}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            <GraduationCap className="h-5 w-5" />
            {/*
              "Öğrenci" tek başına hesap türü değiştiriyormuş gibi
              okunuyordu. Değişen yalnızca GÖRÜNÜM: oturum, rol ve şirket
              üyeliği aynı kalıyor. Dar ekranda kısa etiket kalıyor.
            */}
            <span className="hidden lg:inline">Öğrenci görünümü</span>
            <span className="lg:hidden">Öğrenci</span>
          </button>
        </nav>

        {durumRozeti && <span className="ml-auto hidden sm:inline-flex sm:ml-2">{durumRozeti}</span>}

        {/*
          ANA EYLEM HER EKRANDA

          "+ Yeni ilan" yalnizca Ilanlar sekmesindeydi; Basvuranlar veya
          Sirket sekmesindeyken ilan acmak icin once sekme degistirmek
          gerekiyordu. Panelin tek asil isi bu, her zaman elin altinda
          olmali.
        */}
        <button
          type="button"
          onClick={() => onNavigate('/sirket/ilan/yeni')}
          aria-label="Yeni ilan oluştur"
          className="ml-auto inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-black transition-colors sm:ml-2"
          style={birincilStil}
        >
          <Plus className="h-4 w-4" />
          {/* Dar ekranda yalnızca ikon; dokunma hedefi yine 44px. */}
          <span className="hidden sm:inline">Yeni ilan</span>
        </button>
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(96px+env(safe-area-inset-bottom))] sm:pb-10">
      {children}
    </main>

    {/*
      DAR EKRANDA AYNI DÖRT İŞ ALTTA — ÖĞRENCİ TARAFIYLA AYNI ÇUBUK

      Önce ekranın dibine yapışık, tam genişlikte, düz bir şerit vardı ve
      beş öğenin hepsinde yazı duruyordu: 375 pikselde etiketler sıkışıyor,
      çubuk da öğrenci tarafındaki yüzen haptan bambaşka bir üründen çıkmış
      gibi duruyordu. Artık ikisi tek bileşen: aynı yüzen hap, aynı köşe,
      aynı yükseklik. Seçili olan dolgulu rozetin içinde yazısıyla, diğerleri
      yalnız ikon — hangi sayfada olduğun seçili olanda yazılı.

      Ayrılan tek şey renk, o da ./renk dosyasından geliyor.
    */}
    <BottomNavigation gorunur etiket="Şirket menüsü" esik="sm" tema={SIRKET_ALT_MENU}>
      {SEKMELER.map((s) => (
        <BottomNavigationItem
          key={s.id}
          ikon={s.ikon}
          etiket={s.etiket}
          ad={s.etiket}
          aktif={secili === s.id}
          onClick={() => onNavigate(s.yol)}
          tema={SIRKET_ALT_MENU}
        />
      ))}
      {/*
        "Öğrenci" bir SEKME değil KAPI: hiçbir zaman seçili olmuyor, yani
        varsayılan kuralla (yazı yalnız seçilide) adsız bir ikona inerdi.
        Öğrenci tarafına dönüş yolunun adsız kalması, telefonda geri
        dönemeyen şirket hesabı hatasının aynısı olurdu; etiketi hep açık.
      */}
      <BottomNavigationItem
        ikon={<GraduationCap className="h-5 w-5" />}
        etiket="Öğrenci"
        ad="Öğrenci tarafına dön"
        aktif={false}
        etiketHepZaman
        onClick={onOgrenciyeDon}
        tema={SIRKET_ALT_MENU}
      />
    </BottomNavigation>
  </div>
);

/*
  Eski koyu tema belirteçleri buradan kaldırıldı; renkler artık ./renk
  dosyasında. Panelde doğrudan renk yazılmıyor.
*/
export { SIRKET_KENAR, SIRKET_VURGU, SIRKET_YUZEY, SIRKET_ZEMIN };
