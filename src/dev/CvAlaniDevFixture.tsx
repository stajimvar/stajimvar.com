import React from 'react';
import { CvAlani } from '../components/CvAlani';

/**
 * Profildeki CV alanının geliştirme fikstürü.
 *
 * NEDEN GEREKİYOR
 * ---------------
 * Bu alan öğrenci profilinin içinde ve profil giriş arkasında. Yerleşimi,
 * dokunma hedeflerini ve uzun dosya adında satırın bozulup bozulmadığını
 * görmenin başka yolu yoktu; değişiklik tarayıcıda hiç görülmeden
 * gönderiliyordu.
 *
 * Fikstür GERÇEK bileşeni çiziyor, kopyasını değil. Yükleme ve silme
 * işlemleri gerçekten depolamaya gidiyor; oturum olmadığı için de
 * "CV yüklenemedi" hatası dönüyor. Ölçülmek istenen zaten yerleşim ve
 * hata gösterimi. Üretim paketine girmiyor.
 */
export const CvAlaniDevFixture: React.FC = () => {
  const [cvPath, setCvPath] = React.useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            id="dev-cv-yok"
            onClick={() => setCvPath(undefined)}
            className="rounded-lg border bg-white px-3 py-2 text-xs font-bold"
          >
            CV yok
          </button>
          <button
            type="button"
            id="dev-cv-var"
            onClick={() =>
              setCvPath('00000000-0000-4000-8000-00000000000c/profil/9f1c2b7e-ab34-4c55-9d10-0e2f3a4b5c6d.pdf')
            }
            className="rounded-lg border bg-white px-3 py-2 text-xs font-bold"
          >
            CV var
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-bold text-gray-900">CV</h2>
          <CvAlani
            userId="00000000-0000-4000-8000-00000000000c"
            cvPath={cvPath}
            onDegisti={(yeni) => setCvPath(yeni ?? undefined)}
          />
        </div>
      </div>
    </div>
  );
};
