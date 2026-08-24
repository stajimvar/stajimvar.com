import React from 'react';
import { Check, Copy, X } from 'lucide-react';
import { useModalErisim } from '../lib/modal-erisim';
import type { StudentProfile } from '../types';

/**
 * Başvuru e-postası şablonu üretici.
 *
 * NEDEN TARAYICIDA
 * ----------------
 * Şablonun tamamı metin birleştirmeden ibaret: sunucuya, tabloya ya da
 * yapay zekâya ihtiyaç yok. Sıfır sonuç ekranındaki "sonraki adım"ın
 * hemen çalışması, sonraya bırakılmış bir özellikten kıymetli.
 *
 * İÇERİK UYDURULMUYOR
 * -------------------
 * Metin sitedeki "staj-basvuru-epostasi" rehberindeki şablonun aynısı.
 * Profilde olan bilgiler (ad, üniversite, bölüm, sınıf) yerine yazılıyor;
 * OLMAYAN bilgiler köşeli parantez olarak bırakılıyor. Boşluğu tahminle
 * doldurmak, öğrencinin adına yanlış bilgi göndermek olurdu.
 *
 * SİGORTA CÜMLESİ NEDEN DURUYOR
 * -----------------------------
 * Küçük işletmelerin stajyer almama sebebi çoğu zaman maliyet korkusu.
 * Zorunlu stajda sigortayı genellikle okul yapıyor; bunu tek cümleyle
 * söylemek tereddüt eden işvereni rahatlatıyor. Rehberdeki gerekçe bu.
 */

type BasvuruSablonuProps = {
  acik: boolean;
  onKapat: () => void;
  ogrenci: StudentProfile | null;
  /** Aramada yazdığı kelime; ilgi alanı cümlesine ipucu olarak giriyor. */
  aramaTerimi?: string;
};

function sablonKur(ogrenci: StudentProfile | null, aramaTerimi?: string): string {
  const universite = ogrenci?.university || '[Üniversite]';
  const bolum = ogrenci?.department || ogrenci?.faculty || '[Bölüm]';
  const sinif = ogrenci?.gradeLevel || '[sınıf]';
  const ad = ogrenci?.fullName || '[Ad Soyad]';
  const telefon = ogrenci?.phone || '[Telefon]';
  const alan = (aramaTerimi || '').trim();

  return [
    'Merhaba,',
    '',
    `${universite} ${bolum} ${sinif} öğrencisiyim. Zorunlu stajım kapsamında`,
    '[tarih] – [tarih] arasında 20 iş günü staj yapmam gerekiyor.',
    '',
    alan
      ? `[Şirket adı]'nın ${alan} tarafıyla ilgileniyorum çünkü [tek cümle sebep].`
      : "[Şirket adı]'nın [somut bir konu: ürün, proje, alan] tarafıyla ilgileniyorum çünkü [tek cümle sebep].",
    '',
    'Şu ana kadar [bir ders projesi / kullandığın program / yaptığın iş]',
    "üzerinde çalıştım. CV'mi ekte gönderiyorum.",
    '',
    'Sigortam okulum tarafından yapılacak; sizden ek bir yükümlülük',
    'gerekmiyor.',
    '',
    'Uygun olursanız kısa bir görüşme yapabilir miyiz?',
    '',
    'İyi çalışmalar,',
    ad,
    telefon,
  ].join('\n');
}

export const BasvuruSablonu: React.FC<BasvuruSablonuProps> = ({ acik, onKapat, ogrenci, aramaTerimi }) => {
  const [metin, setMetin] = React.useState('');
  const [kopyalandi, setKopyalandi] = React.useState(false);

  useModalErisim(acik, onKapat);

  React.useEffect(() => {
    if (acik) {
      setMetin(sablonKur(ogrenci, aramaTerimi));
      setKopyalandi(false);
    }
  }, [acik, ogrenci, aramaTerimi]);

  if (!acik) return null;

  const konu = `Staj Başvurusu — ${ogrenci?.department || '[Bölüm]'} — [Tarih aralığı]`;

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(`Konu: ${konu}\n\n${metin}`);
      setKopyalandi(true);
      window.setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      /* Pano izni yoksa metin ekranda duruyor; kullanıcı elle seçebiliyor. */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-gray-900">Başvuru e-postası şablonu</h2>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Kapat"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Konu satırı</p>
            <p className="font-mono text-sm text-gray-900">{konu}</p>
            <p className="text-xs text-gray-600">
              Konu satırı e-postanın açılıp açılmayacağını belirliyor. “Merhaba”, tek başına “Staj”
              ya da boş konu doğrudan çöpe gidiyor.
            </p>
          </div>

          {/*
            Metin düzenlenebilir: köşeli parantezli yerleri öğrenci kendi
            doldursun. Salt okunur bir kutu, kopyalayıp başka yerde
            düzenlemeyi zorunlu kılardı.
          */}
          <label className="block text-sm font-semibold text-gray-800">
            Metin
            <textarea
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              className="mt-1.5 w-full min-h-80 rounded-xl border border-gray-200 p-3 font-mono text-xs leading-relaxed"
            />
          </label>

          <p className="text-xs text-gray-500">
            Köşeli parantezli yerleri doldur. Profilinde olmayan bilgileri boş bıraktık; tahminle
            doldurmak senin adına yanlış bilgi göndermek olurdu.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={kopyala}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              {kopyalandi ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {kopyalandi ? 'Kopyalandı' : 'Konu + metni kopyala'}
            </button>
            <a
              href="/rehber/staj-basvuru-epostasi"
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Rehberin tamamı
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
