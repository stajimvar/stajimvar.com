import React from 'react';
import { Building2, GraduationCap, Landmark, Mail } from 'lucide-react';
import { BOLUMLER } from '../data/bolumler';
import { STAJ_PROGRAMLARI } from '../data/stajProgramlari';
import { KARIYER_MERKEZLERI } from '../data/kariyerMerkezleri';

/**
 * "Aradığını bulamadın mı?" — listenin altındaki ikinci yol.
 *
 * NEDEN VAR
 * ---------
 * Açık ilan sayısı düşük olduğunda liste bitiyor ve sayfa da bitiyordu.
 * Oysa StajımVar'ın asıl vaadi şu: staj ilanı varsa bul, yoksa ne
 * yapacağını söyle. Listenin sonu bu yüzden bir çıkmaz değil, dört
 * gerçek yola açılan bir kavşak.
 *
 * SAYILAR VERİDEN
 * ---------------
 * Her yolun yanındaki sayı kendi kaynağından okunuyor; sabit yazılmış
 * tek bir rakam yok. Veri büyüyünce metin de büyüyor, küçülünce
 * küçülüyor — sonradan yalan söylemesin.
 *
 * DÖRT YOL, DAHA FAZLASI DEĞİL
 * ----------------------------
 * Amaç daha çok içerik göstermek değil, çıkmazı kapatmak. Beşinci bir
 * kart eklemek listeyi uzatır, kullanıcının sonraki adımını
 * netleştirmez.
 */

interface SonrakiAdimProps {
  onNavigate: (yol: string) => void;
  /** Başvuru e-postası şablonunu açar. */
  onSablonAc: () => void;
}

const Yol: React.FC<{
  ikon: React.ReactNode;
  baslik: string;
  aciklama: string;
  onClick: () => void;
}> = ({ ikon, baslik, aciklama, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer"
  >
    <span className="mt-0.5 shrink-0 text-blue-600">{ikon}</span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-gray-900">{baslik}</span>
      <span className="block text-xs leading-relaxed text-gray-500">{aciklama}</span>
    </span>
  </button>
);

export const SonrakiAdim: React.FC<SonrakiAdimProps> = ({ onNavigate, onSablonAc }) => (
  <section className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
    <h2 className="text-sm font-extrabold text-gray-900">Aradığın stajı bulamadın mı?</h2>
    <p className="mt-1 text-xs leading-relaxed text-gray-600">
      Stajların önemli bir kısmı ilan üzerinden değil, doğrudan başvurarak bulunuyor.
      Buradan devam edebilirsin.
    </p>

    {/* Mobilde tek sütun, 640px üstünde iki sütun: dört kart alt alta uzamasın. */}
    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
      <Yol
        ikon={<Building2 className="h-4 w-4" />}
        baslik="Büyük işverenleri keşfet"
        aciklama={`${STAJ_PROGRAMLARI.length} kurum stajı kendi kariyer sayfasından alıyor.`}
        onClick={() => onNavigate('/staj-programlari')}
      />
      <Yol
        ikon={<GraduationCap className="h-4 w-4" />}
        baslik="Bölümüne göre staj yolunu gör"
        aciklama={`${BOLUMLER.length} bölüm için nerede staj yapılır, ne aranır.`}
        onClick={() => onNavigate('/bolumler')}
      />
      <Yol
        ikon={<Landmark className="h-4 w-4" />}
        baslik="Kariyer merkezini bul"
        aciklama={`${KARIYER_MERKEZLERI.length} üniversitenin doğrulanmış kariyer merkezi adresi.`}
        onClick={() => onNavigate('/universite-kariyer-merkezleri')}
      />
      <Yol
        ikon={<Mail className="h-4 w-4" />}
        baslik="İlan açmamış şirkete yaz"
        aciklama="Konu satırı, şablon ve en sık yapılan hatalar."
        onClick={onSablonAc}
      />
    </div>
  </section>
);
