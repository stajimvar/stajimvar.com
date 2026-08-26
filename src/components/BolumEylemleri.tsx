import React from 'react';
import { Bell, BellRing, CalendarDays, ExternalLink, MapPin, Wallet } from 'lucide-react';
import { KARIYER_MERKEZLERI, type KariyerMerkezi } from '../data/kariyerMerkezleri';
import { profilMerkezi } from '../lib/rehber-arama.mjs';
import { bolumTakibiDegistir, takipEdilenBolumler } from '../lib/rehber-veri';
import type { StudentProfile } from '../types';

/**
 * Bölüm sayfasının eylem paneli.
 *
 * NEDEN AYRI BİLEŞEN
 * ------------------
 * Bölüm sayfasının gövdesi (BolumIcerik) hem tarayıcıda hem ön render'da
 * çiziliyor ve KİŞİYE GÖRE değişemez: ön render bir kez üretilip herkese
 * aynı HTML olarak sunuluyor. Burası kişiye göre değişiyor — kendi
 * okulunun kariyer merkezi, takip durumu — bu yüzden yalnızca tarayıcıda
 * çiziliyor ve statik HTML'e hiç girmiyor.
 *
 * NE EKLİYOR
 * ----------
 * Bölüm sayfası okunup çıkılan bir yazıydı. Öğrencinin oradan sonra
 * yapacağı üç şey vardı ve üçü de sitede başka yerdeydi: evrak için kendi
 * kariyer merkezi, ücret/süre için hesaplayıcılar, ve "bu bölümü izle".
 */

const KART =
  'flex min-h-11 items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-300 cursor-pointer';

export const BolumEylemleri: React.FC<{
  bolumSlug: string;
  bolumAdi: string;
  onNavigate: (yol: string) => void;
  ogrenci?: StudentProfile | null;
  onGirisGerekli?: () => void;
}> = ({ bolumSlug, bolumAdi, onNavigate, ogrenci = null, onGirisGerekli }) => {
  const merkez = profilMerkezi(ogrenci?.university, KARIYER_MERKEZLERI) as KariyerMerkezi | null;
  const [takipte, setTakipte] = React.useState(false);

  React.useEffect(() => {
    if (!ogrenci?.id) return;
    let iptal = false;
    takipEdilenBolumler(ogrenci.id)
      .then((liste) => {
        if (!iptal) setTakipte(liste.includes(bolumSlug));
      })
      .catch(() => {
        /* okunamazsa panel yine çalışsın */
      });
    return () => {
      iptal = true;
    };
  }, [ogrenci?.id, bolumSlug]);

  const takipDegistir = async () => {
    if (!ogrenci?.id) {
      onGirisGerekli?.();
      return;
    }
    const oncekiDurum = takipte;
    setTakipte(!oncekiDurum);
    try {
      await bolumTakibiDegistir(ogrenci.id, bolumSlug, oncekiDurum);
    } catch {
      /* Yazılamadıysa ekran gerçeğe dönüyor; sahte "takipte" kalmıyor. */
      setTakipte(oncekiDurum);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">Sıradaki adım</h2>

      <div className="grid gap-2 sm:grid-cols-2">
        {/*
          KENDİ OKULUNUN KARİYER MERKEZİ

          Zorunlu stajın evrak tarafı oradan geçiyor. Profilde okul yoksa
          ya da listede karşılığı yoksa genel dizine götürüyor — yanlış bir
          okul göstermek, hiç göstermemekten kötü.
        */}
        <button
          type="button"
          onClick={() =>
            merkez ? window.open(merkez.url, '_blank', 'noopener') : onNavigate('/universite-kariyer-merkezleri')
          }
          className={KART}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <MapPin className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-gray-900">
              {merkez ? merkez.universite : 'Okulunun kariyer merkezi'}
            </span>
            <span className="block truncate text-[11px] text-gray-600">
              {merkez ? 'Staj formu ve onay imzası' : 'Üniversiteni bul'}
            </span>
          </span>
          {merkez && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />}
        </button>

        {/* BU BÖLÜMÜ TAKİP ET */}
        <button
          type="button"
          onClick={() => void takipDegistir()}
          aria-pressed={ogrenci?.id ? takipte : undefined}
          className={`${KART} ${takipte ? 'border-blue-300 bg-blue-50' : ''}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              takipte ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
            }`}
          >
            {takipte ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-gray-900">
              {takipte ? 'Bu bölümü takip ediyorsun' : 'Bu bölümü takip et'}
            </span>
            <span className="block truncate text-[11px] text-gray-600">
              {ogrenci?.id
                ? `${bolumAdi} ilanları öne çıksın`
                : 'Takip etmek için giriş yap'}
            </span>
          </span>
        </button>

        {/* HESAPLAYICILAR */}
        <button type="button" onClick={() => onNavigate('/araclar/staj-ucreti-hesaplama')} className={KART}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-gray-900">
              Staj ücretini hesapla
            </span>
            <span className="block truncate text-[11px] text-gray-600">Sana en az ne ödenmeli</span>
          </span>
        </button>

        <button type="button" onClick={() => onNavigate('/araclar/staj-gunu-hesaplama')} className={KART}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-gray-900">Bitiş tarihini bul</span>
            <span className="block truncate text-[11px] text-gray-600">20 veya 30 iş günü</span>
          </span>
        </button>
      </div>
    </section>
  );
};
