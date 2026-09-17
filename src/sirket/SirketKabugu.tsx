import React from 'react';
import { Briefcase, Building2, LayoutGrid, Plus, Users } from 'lucide-react';
import { BottomNavigation, BottomNavigationItem } from '../ui/BottomNavigation';
import { BildirimDugmesi } from '../components/BildirimMerkezi';
import {
  BIRINCIL_RENK,
  SIRKET_ALT_MENU,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
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
 * Öğrenci arayüzü keşif için: arama, şeritler, kartlar. İK'nın işi
 * başka: gün içinde birkaç kez girip ilan açmak ve başvuranları taramak.
 * Kabuk o dört işi taşıyor; renk artık ayrı DEĞİL (bkz. ./renk) — ayrım
 * gezinmede, boyada değil.
 *
 * DÖRT SEKME, KAPI YOK
 * --------------------
 * Genel, İlanlar, Başvuranlar, Şirket. Öğrenci tarafına geçiş kapısı
 * artık panelde HİÇ yok: önce alt çubukta beşinci öğeydi ve "Çıkış"
 * sanıldı; sonra üst çubuğa kep ikonu olarak taşındı ve kullanıcı mobil
 * ekran görüntüsünde onu çizip istemedi. Karar: şirket hesabına giren
 * şirket hesabında kalır. Oturum kapatma hesap menüsünün işi.
 *
 * ÜST ÇUBUĞUN GENİŞLİK BÜTÇESİ (hesaplandı, 16 px yazıyla)
 * -------------------------------------------------------
 * Marka 140 + dört sekme ~334 + zil 44 + Yeni ilan 44 + boşluklar 64 ≈
 * 626 px: sekmeler `md`den (768) itibaren sığıyor, `sm`de (640)
 * sığmıyordu — alt çubuk bu yüzden `md`ye kadar kalıyor. Kapı kalkınca
 * 44 px boşaldı; eşikler yeniden dizilmedi, yalnız öğe eksildi.
 * Kademe pili (~170) ve "Yeni ilan" yazısı `lg`de açılıyor; her biri
 * bir alt eşikte satırı taşırırdı.
 */

export type SirketSekmesi = 'genel' | 'ilanlar' | 'basvuranlar' | 'sirket';

const SEKMELER: { id: SirketSekmesi; etiket: string; ikon: React.ReactNode; yol: string }[] = [
  { id: 'genel', etiket: 'Genel', ikon: <LayoutGrid className="h-5 w-5" aria-hidden />, yol: '/sirket' },
  { id: 'ilanlar', etiket: 'İlanlar', ikon: <Briefcase className="h-5 w-5" aria-hidden />, yol: '/sirket/ilanlar' },
  { id: 'basvuranlar', etiket: 'Başvuranlar', ikon: <Users className="h-5 w-5" aria-hidden />, yol: '/sirket/basvuranlar' },
  { id: 'sirket', etiket: 'Şirket', ikon: <Building2 className="h-5 w-5" aria-hidden />, yol: '/sirket/profil' },
];

export const SirketKabugu: React.FC<{
  secili: SirketSekmesi;
  onNavigate: (yol: string) => void;
  /** Sağ üstte görünen kısa durum. Kademe numarası yazmıyor. */
  durumRozeti?: React.ReactNode;
  /* Bildirim durumu App'te; kabuk yalnızca düğmeyi çiziyor. */
  okunmamisBildirim?: number | null;
  onBildirimAc?: () => void;
  children: React.ReactNode;
}> = ({
  secili,
  onNavigate,
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
          onClick={() => onNavigate('/sirket')}
          className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl font-black tracking-tight ${SIRKET_ODAK}`}
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

        <nav aria-label="Şirket menüsü" className="hidden items-center gap-1 md:flex">
          {SEKMELER.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onNavigate(s.yol)}
              aria-current={secili === s.id ? 'page' : undefined}
              className={`flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-sm font-bold transition-[background-color,color] duration-150 hover:bg-gray-50 ${SIRKET_ODAK}`}
              style={
                secili === s.id
                  ? { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }
                  : { color: SIRKET_METIN_IKINCIL }
              }
            >
              {s.etiket}
            </button>
          ))}
        </nav>

        {/* Sağ küme: kademe pili · zil · Yeni ilan */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {durumRozeti && <span className="hidden lg:inline-flex">{durumRozeti}</span>}

          {/*
            BİLDİRİM ZİLİ İKİ DÜNYADA DA AYNI SİSTEM

            Bildirim kullanıcıya ait, şirkete değil: aynı kişi öğrenci
            tarafına geçtiğinde aynı kayıtları görüyor.
          */}
          {onBildirimAc && (
            <BildirimDugmesi
              okunmamis={okunmamisBildirim ?? null}
              renk={SIRKET_VURGU}
              onAc={onBildirimAc}
              style={{ color: SIRKET_METIN_IKINCIL }}
            />
          )}

          {/*
            ANA EYLEM HER EKRANDA

            Panelin tek asıl işi ilan açmak; hangi sekmede olursa olsun
            elin altında. Dar ekranda yalnız ikon; dokunma hedefi 44 px.
          */}
          <button
            type="button"
            onClick={() => onNavigate('/sirket/ilan/yeni')}
            aria-label="Yeni ilan oluştur"
            className={`inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-black transition-[background-color] duration-150 ${BIRINCIL_RENK} ${SIRKET_ODAK}`}
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden lg:inline">Yeni ilan</span>
          </button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-10">
      {children}
    </main>

    {/*
      DAR EKRANDA DÖRT SEKME ALTTA — ÖĞRENCİ TARAFIYLA AYNI ÇUBUK

      Aynı yüzen hap, aynı köşe, aynı yükseklik. Seçili olan dolgulu
      rozetin içinde yazısıyla, diğerleri yalnız ikon. Çubuk yalnız
      sekme; öğrenci kapısı panelde yok.
    */}
    <BottomNavigation gorunur etiket="Şirket menüsü" esik="md" tema={SIRKET_ALT_MENU}>
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
    </BottomNavigation>
  </div>
);

/*
  Renkler ./renk dosyasında; panelde doğrudan renk yazılmıyor. Dışarıdan
  bu adla bağlanan yerler için yeniden dışa aktarım korunuyor.
*/
export { SIRKET_KENAR, SIRKET_VURGU, SIRKET_YUZEY, SIRKET_ZEMIN };
