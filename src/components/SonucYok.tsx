import React from 'react';
import { Building2, FileText, Mail, RotateCcw, Search, Sparkles, X } from 'lucide-react';

/**
 * Sıfır sonuç ekranı.
 *
 * NEDEN YENİDEN YAZILDI
 * ---------------------
 * Önce tek bir "Filtreleri Temizle" düğmesi vardı. Öğrenci aradığını
 * bulamadığında elinde tek seçenek aramayı silmek oluyordu; yani site onu
 * çıkmaz sokakta bırakıyordu. Oysa aynı anda gösterilebilecek gerçek
 * şeyler var: aynı kelimeyle eşleşen burslar, hangi filtrenin listeyi
 * daralttığı, ilan açmamış şirkete nasıl yazılacağı.
 *
 * KURAL
 * -----
 * Kullanıcı burada hiçbir zaman yalnızca "temizle" ile bırakılmıyor: en az
 * bir alternatif fırsat ya da uygulanabilir bir sonraki adım görüyor.
 *
 * ARAMA VE FİLTRELER KAYBOLMUYOR
 * ------------------------------
 * Üstte ne aradığı ve hangi filtrelerin açık olduğu yazılı duruyor. Aksi
 * hâlde dört öneri arasında "ben ne aramıştım" sorusu doğuyor ve öneriler
 * bağlamsız görünüyor.
 *
 * BİLDİRİM DÜĞMESİ YOK
 * --------------------
 * "Bu arama için bildirim kur" buraya çok yakışıyor ama bildirim sistemi
 * henüz yok. Çalışmayan bir düğme, hiç olmayan düğmeden kötü: kullanıcı
 * kurduğunu sanıp bekler. Sistem geldiğinde eklenecek.
 */

export type AktifSuzgec = {
  /** Kullanıcının gördüğü ad: "Şehir: Ankara" gibi. */
  etiket: string;
  /** Yalnızca bu filtreyi kaldırır. */
  kaldir: () => void;
  /** Bu filtre kaldırılsa kaç ilan görünürdü. */
  kazanc?: number;
};

type SonucYokProps = {
  aramaTerimi: string;
  suzgecler: AktifSuzgec[];
  /** Aynı kelimeyle eşleşen burs/fırsat sayısı; null ise henüz sayılıyor. */
  firsatSayisi: number | null;
  onFirsatlaraGit: () => void;
  onTumunuTemizle: () => void;
  onIsverenlereGit: () => void;
  onRehbereGit: () => void;
  onSablonAc: () => void;
};

const Eylem: React.FC<{
  ikon: React.ReactNode;
  baslik: string;
  aciklama: string;
  onClick: () => void;
}> = ({ ikon, baslik, aciklama, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left cursor-pointer"
  >
    <span className="shrink-0 mt-0.5 text-blue-600">{ikon}</span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-gray-900">{baslik}</span>
      <span className="block text-xs text-gray-500 leading-relaxed">{aciklama}</span>
    </span>
  </button>
);

export const SonucYok: React.FC<SonucYokProps> = ({
  aramaTerimi,
  suzgecler,
  firsatSayisi,
  onFirsatlaraGit,
  onTumunuTemizle,
  onIsverenlereGit,
  onRehbereGit,
  onSablonAc,
}) => {
  /*
    Listeyi en çok daraltan filtre: kaldırıldığında en çok ilan açan.
    Kullanıcıya "hangisini kaldırayım" sorusunu tahmin ettirmiyoruz.
  */
  const daraltan = suzgecler
    .filter((s) => (s.kazanc ?? 0) > 0)
    .sort((a, b) => (b.kazanc ?? 0) - (a.kazanc ?? 0))[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-5">
      <div className="space-y-2">
        <p className="text-base font-bold text-gray-900">Bu aramada staj ilanı yok.</p>

        {(aramaTerimi || suzgecler.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {aramaTerimi && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-semibold">
                <Search className="w-3 h-3" />
                {aramaTerimi}
              </span>
            )}
            {suzgecler.map((s) => (
              <button
                key={s.etiket}
                type="button"
                onClick={s.kaldir}
                title="Bu filtreyi kaldır"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
              >
                {s.etiket}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alternatif fırsat: aynı kelime burslarda karşılık buluyorsa. */}
      {firsatSayisi !== null && firsatSayisi > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-gray-800 flex-1">
            Ancak eşleşen <strong>{firsatSayisi} öğrenci fırsatı</strong> bulduk — burs, kredi ve
            yurt dışı programları.
          </p>
          <button
            type="button"
            onClick={onFirsatlaraGit}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Fırsatları gör
          </button>
        </div>
      )}

      {/* Hangi filtre daralttı: tahmin değil, ölçülmüş kazanç. */}
      {daraltan && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-800">
            <strong>{daraltan.etiket}</strong> filtresi {daraltan.kazanc} ilanı gizliyor.
          </span>
          <button
            type="button"
            onClick={daraltan.kaldir}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors cursor-pointer"
          >
            Bu filtreyi kaldır
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-2.5">
        <Eylem
          ikon={<RotateCcw className="w-4 h-4" />}
          baslik="Filtreleri temizle"
          aciklama="Arama ve tüm filtreler sıfırlanır, bütün ilanlar listelenir."
          onClick={onTumunuTemizle}
        />
        <Eylem
          ikon={<Building2 className="w-4 h-4" />}
          baslik="Büyük işverenleri incele"
          aciklama="İlan açmasa da staj alan kurumların kariyer sayfaları."
          onClick={onIsverenlereGit}
        />
        <Eylem
          ikon={<FileText className="w-4 h-4" />}
          baslik="İlan açmamış şirkete nasıl yazılır?"
          aciklama="Konu satırı, şablon ve en sık yapılan hatalar."
          onClick={onRehbereGit}
        />
        <Eylem
          ikon={<Mail className="w-4 h-4" />}
          baslik="Başvuru e-postası şablonu oluştur"
          aciklama="Profilindeki bilgilerle doldurulmuş, kopyalanabilir metin."
          onClick={onSablonAc}
        />
      </div>
    </div>
  );
};
