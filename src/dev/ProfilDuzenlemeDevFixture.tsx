import React from 'react';
import { ProfilDuzenleme } from '../components/ProfilDuzenleme';
import { CvOnizleme } from '../components/CvPage';
import type { StudentProfile } from '../types';
import { ORNEK_OGRENCI } from './ornek-ogrenci';

/**
 * Profil düzenleme ekranının geliştirme fikstürü (10 Ekim 2026).
 *
 * Ekran giriş arkasında; burada GERÇEK `ProfilDuzenleme` sahte bir
 * öğrenciyle çiziliyor. Kayıt bellekte tutuluyor (300 ms gecikmeyle,
 * gerçek ağ gibi) ve yanında AYNI veriden üretilen CV önizlemesi duruyor:
 * profilde değişen bir şeyin CV'ye anında yansıdığı buradan görülüyor.
 *
 * `?hata=1` kaydı başarısız yapar — hata durumunun ekranını görmek için.
 * Üretim paketine girmiyor.
 */
export const ProfilDuzenlemeDevFixture: React.FC = () => {
  const [ogrenci, setOgrenci] = React.useState<StudentProfile>(ORNEK_OGRENCI);
  const hataModu = new URLSearchParams(window.location.search).get('hata') === '1';

  const guncelle = async (yama: Partial<StudentProfile>) => {
    await new Promise((r) => setTimeout(r, 300));
    if (hataModu) return false;
    setOgrenci((o) => ({ ...o, ...yama }));
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto grid max-w-[1400px] gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3" data-fikstur="duzenleme">
          <ProfilDuzenleme
            student={ogrenci}
            onUpdateProfile={guncelle}
            onGeri={() => undefined}
            onCvOlustur={() => undefined}
          />
        </div>
        <div className="min-w-0" data-fikstur="onizleme">
          <div className="lg:sticky lg:top-4">
            <CvOnizleme student={ogrenci} etiket="CV önizlemesi" etkilesimsiz />
          </div>
        </div>
      </div>
      <pre id="dev-durum" className="sr-only">
        {JSON.stringify({
          egitimler: ogrenci.educations,
          sertifikalar: ogrenci.certificates,
          ilgiler: ogrenci.interests,
          gizli: ogrenci.cvGizli,
          beceriler: ogrenci.softSkills,
          programlar: ogrenci.skills.map((s) => s.name),
          deneyimler: ogrenci.experiences,
          projeler: ogrenci.projects,
          egitim: {
            duzey: ogrenci.educationLevel,
            baslangic: ogrenci.educationStartYear,
            suruyor: ogrenci.educationOngoing,
            mezuniyet: ogrenci.graduationYear,
          },
        })}
      </pre>
    </div>
  );
};
