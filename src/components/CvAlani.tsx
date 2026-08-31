import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Trash2, Upload, ExternalLink } from 'lucide-react';
import {
  baytMetni,
  cvBilgisi,
  cvDosyasiniSil,
  cvGoruntulemeAdresi,
  cvSorunu,
  cvYukle,
} from '../lib/cv';

/**
 * Profildeki CV alanı.
 *
 * İKİ DURUM, FAZLASI DEĞİL
 * ------------------------
 *   CV yok  → tek bir "CV ekle" düğmesi ve sınırlar
 *   CV var  → belge satırı + Görüntüle / Değiştir / Sil
 *
 * Sürükle-bırak yok: telefonda hiçbir işe yaramıyor ve asıl kullanım
 * telefondan dosya seçici. Gizli bir file input ve onu açan düğmeler,
 * iOS ve Android'in kendi seçicisiyle sorunsuz çalışan en bilinen desen.
 *
 * SAHTE BİLGİ YOK
 * ---------------
 * Boyut ve yüklenme tarihi depolamadan okunuyor. Okunamazsa yalnızca
 * "PDF" yazıyor; `student_profiles.updated_at` profildeki her değişiklikte
 * tazelendiği için onu "CV güncellendi" diye göstermek yanlış olurdu.
 */

const tarihYaz = (t: string | null) => {
  if (!t) return '';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const CvAlani: React.FC<{
  userId: string;
  cvPath?: string;
  /** Yalnızca `cvPath` yamasını gönderir; profil kaydı çağıranın işi. */
  onDegisti: (yeniYol: string | null) => void | Promise<void>;
}> = ({ userId, cvPath, onDegisti }) => {
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [durum, setDurum] = useState<'bos' | 'yukleniyor' | 'aciliyor' | 'siliniyor'>('bos');
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<{ bayt: number | null; yuklenme: string | null } | null>(null);

  useEffect(() => {
    let iptal = false;
    if (!cvPath) {
      setBilgi(null);
      return;
    }
    void cvBilgisi(cvPath).then((b) => {
      if (!iptal) setBilgi(b);
    });
    return () => {
      iptal = true;
    };
  }, [cvPath]);

  /*
    SIRA BİLİNÇLİ: ÖNCE YÜKLE, SONRA KAYDET, EN SON SİL

    Ters sırada (önce eskiyi sil) yükleme düşerse öğrenci CV'siz kalırdı.
    Bu sırada en kötü durum, kimsenin görmediği bir artık dosya.

    Kayıt başarısız olursa yeni dosya geri alınıyor: yarım kalmış bir
    işlemden artık bırakmamak, bırakmaktan iyi.
  */
  const dosyaSecildi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    e.target.value = '';
    if (!dosya) return;

    const sorun = cvSorunu(dosya);
    if (sorun) {
      setHata(sorun);
      return;
    }

    setHata(null);
    setDurum('yukleniyor');
    const eski = cvPath;
    let yeni: string | null = null;
    try {
      yeni = await cvYukle(userId, dosya);
      await onDegisti(yeni);
      if (eski && eski !== yeni) await cvDosyasiniSil(eski);
    } catch (err) {
      if (yeni) await cvDosyasiniSil(yeni).catch(() => undefined);
      setHata(err instanceof Error ? err.message : 'CV yüklenemedi.');
    } finally {
      setDurum('bos');
    }
  };

  /*
    Gizli kovada public adres yok; her açılışta kısa ömürlü imzalı adres
    üretiliyor. Adres üretmek dosyayı OKUYABİLMEYİ gerektiriyor, yani
    yetki kontrolü depolama politikasında.
  */
  const goruntule = async () => {
    if (!cvPath) return;
    setHata(null);
    setDurum('aciliyor');
    try {
      const adres = await cvGoruntulemeAdresi(cvPath);
      window.open(adres, '_blank', 'noopener,noreferrer');
    } catch {
      setHata('CV açılamadı. Sayfayı yenileyip tekrar dene.');
    } finally {
      setDurum('bos');
    }
  };

  /*
    Silme YALNIZCA profildeki güncel belgeyi kaldırıyor. Geçmiş
    başvuruların kopyaları ayrı dosyalar ve onlara dokunulmuyor: şirket,
    değerlendirdiği belgeyi görmeye devam etmeli.
  */
  const sil = async () => {
    if (!cvPath) return;
    setHata(null);
    setDurum('siliniyor');
    const eski = cvPath;
    try {
      await onDegisti(null);
      await cvDosyasiniSil(eski);
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'CV silinemedi.');
    } finally {
      setDurum('bos');
    }
  };

  const mesgul = durum !== 'bos';
  const dugme =
    'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="space-y-3">
      <input
        ref={dosyaRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={dosyaSecildi}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />

      {!cvPath ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
          <FileText className="mx-auto h-6 w-6 text-gray-400" aria-hidden />
          <p className="mt-2 text-sm font-bold text-gray-900">Henüz CV eklemedin</p>
          <p className="mt-0.5 text-xs text-gray-500">PDF · En fazla 5 MB</p>
          <button
            type="button"
            onClick={() => dosyaRef.current?.click()}
            disabled={mesgul}
            className={`${dugme} mx-auto mt-3 border-blue-600 bg-blue-600 text-white hover:bg-blue-700`}
          >
            {durum === 'yukleniyor' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {durum === 'yukleniyor' ? 'Yükleniyor' : 'CV ekle'}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"
            >
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">CV yüklendi</p>
              {/* Yalnızca gerçekten bilinen alanlar yazılıyor. */}
              <p className="truncate text-xs text-gray-500">
                {['PDF', baytMetni(bilgi?.bayt), tarihYaz(bilgi?.yuklenme ?? null)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goruntule}
              disabled={mesgul}
              className={`${dugme} border-gray-200 bg-white text-gray-800 hover:bg-gray-50`}
            >
              {durum === 'aciliyor' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Görüntüle
            </button>
            <button
              type="button"
              onClick={() => dosyaRef.current?.click()}
              disabled={mesgul}
              className={`${dugme} border-gray-200 bg-white text-gray-800 hover:bg-gray-50`}
            >
              {durum === 'yukleniyor' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Değiştir
            </button>
            <button
              type="button"
              onClick={sil}
              disabled={mesgul}
              className={`${dugme} border-gray-200 bg-white text-red-700 hover:bg-red-50`}
            >
              {durum === 'siliniyor' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Sil
            </button>
          </div>
        </div>
      )}

      {hata && (
        <p role="alert" className="text-xs font-semibold text-red-700">
          {hata}
        </p>
      )}

      <p className="text-xs leading-relaxed text-gray-500">
        StajımVar üzerinden başvurduğunda CV&apos;nin o anki hâli başvuruya eklenir. Daha sonra
        CV&apos;ni değiştirirsen eski başvurular değişmez.
      </p>
    </div>
  );
};
