import React from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { BIRINCIL_EYLEM, ODAK_HALKASI } from '../lib/renk-token';

/**
 * OTURUMU AÇIK AMA ÖĞRENCİ PROFİLİ OLMAYAN KİŞİNİN `/cv` EKRANI
 *
 * `/cv` eskiden `student` boşsa "Profilin için giriş yapın" diyordu.
 * `student` iki ayrı durumda boş kalıyor: oturum yok, ya da oturum var
 * ama `student_profiles` satırı yok (eski hesap, yarım kalmış kayıt).
 * İkincisindeki kişi zaten girişliydi; ona giriş yapmasını söylemek
 * yanlıştı ve çıkış yolu yoktu.
 *
 * Üç durum ayrı cümle: yükleniyor, okunamadı, gerçekten yok. "Okunamadı"
 * yok sayılsaydı, profili olan birine "profil oluştur" denirdi.
 */
export const OgrenciProfiliOlustur: React.FC<{
  durum: 'yukleniyor' | 'yok' | 'hata';
  /** Satırı açar ve düzenleme adımını başlatır; hata fırlatırsa burada yazılıyor. */
  onOlustur: () => Promise<void>;
  onYenidenDene: () => void;
  /** Profil tamamlanınca dönülecek başvurunun ilan başlığı; yoksa satır çizilmiyor. */
  bekleyenIlanBasligi?: string | null;
}> = ({ durum, onOlustur, onYenidenDene, bekleyenIlanBasligi }) => {
  const [mesgul, setMesgul] = React.useState(false);
  const [hata, setHata] = React.useState<string | null>(null);
  /* Aynı olay döngüsündeki ikinci tıklama ikinci upsert'i başlatmasın. */
  const kilit = React.useRef(false);

  const olustur = async () => {
    if (kilit.current) return;
    kilit.current = true;
    setMesgul(true);
    setHata(null);
    try {
      await onOlustur();
    } catch {
      setHata('Profilin oluşturulamadı. Biraz sonra yeniden dene.');
    } finally {
      kilit.current = false;
      setMesgul(false);
    }
  };

  return (
    <section
      className="mx-auto mt-6 max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center"
      aria-busy={durum === 'yukleniyor' || undefined}
    >
      {durum === 'yukleniyor' && (
        <p className="text-sm text-gray-600" role="status">
          Profilin yükleniyor…
        </p>
      )}

      {durum === 'hata' && (
        <div className="space-y-3">
          <h1 className="text-base font-bold text-gray-900">Profilin yüklenemedi</h1>
          <p className="text-sm text-gray-600">
            Bağlantı kopmuş olabilir. Hesabın yerinde; yeniden denemen yeterli.
          </p>
          <button
            type="button"
            onClick={onYenidenDene}
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${ODAK_HALKASI}`}
          >
            Yeniden dene
          </button>
        </div>
      )}

      {durum === 'yok' && (
        <div className="space-y-3">
          <span
            aria-hidden="true"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700"
          >
            <UserPlus className="h-6 w-6" />
          </span>
          <h1 className="text-base font-bold text-gray-900">Öğrenci profilini oluştur</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Hesabın açık ama henüz bir öğrenci profilin yok. Profilini oluşturup okul ve bölüm
            bilgilerini girdiğinde ilanlara başvurabilirsin.
          </p>
          {bekleyenIlanBasligi && (
            <p className="text-sm text-gray-600">
              Ardından <strong className="text-gray-900">{bekleyenIlanBasligi}</strong> başvurusuna
              dönebilirsin.
            </p>
          )}
          <button
            type="button"
            onClick={() => void olustur()}
            disabled={mesgul}
            className={`${BIRINCIL_EYLEM} w-full sm:w-auto`}
          >
            {mesgul ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Oluşturuluyor
              </>
            ) : (
              'Profilimi oluştur'
            )}
          </button>
          {hata && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {hata}
            </p>
          )}
        </div>
      )}
    </section>
  );
};
