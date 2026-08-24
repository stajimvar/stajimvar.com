import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Printer } from 'lucide-react';
import type { StudentProfile } from '../types';
import { adYazimi } from '../lib/ad';
import { SAYFA_GENISLIGI } from '../lib/duzen';

/**
 * Yazdırılabilir CV.
 *
 * NEDEN PDF KÜTÜPHANESİ YOK
 * -------------------------
 * jsPDF ve benzerleri varsayılan yazı tipleriyle Türkçe karakterleri
 * bozuyor; düzgün çıktı için font gömmek gerekiyor ve bu pakete 300KB'ın
 * üzerinde yük bindiriyor. Tarayıcının kendi yazdırma motoru hem Türkçeyi
 * sorunsuz basıyor hem de "PDF olarak kaydet" seçeneğini zaten sunuyor —
 * mobil dahil.
 *
 * Bu yüzden sayfa ekranda okunur, yazdırıldığında A4'e oturur. Yazdırma
 * kuralları aşağıdaki `<style>` içinde; site kabuğu (başlık, düğmeler)
 * çıktıda görünmüyor.
 *
 * NEDEN VAR
 * ---------
 * Öğrenci profilini dolduruyor ama elinde kullanabileceği bir şey kalmıyordu.
 * Başvuruların şirkete iletilmesi henüz çözülmedi (İK adresi bulunamıyor);
 * indirilebilir CV, profil doldurmanın o çözülene kadar da karşılığı olsun.
 */

interface CvPageProps {
  student: StudentProfile;
  onBack: () => void;
}

const SEVIYE: Record<string, string> = {
  Beginner: 'Temel',
  Intermediate: 'Orta',
  Advanced: 'İleri',
  Expert: 'Uzman',
};

const Bolum: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="cv-bolum space-y-2">
    <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 border-b border-gray-300 pb-1">
      {baslik}
    </h2>
    {children}
  </section>
);

export const CvPage: React.FC<CvPageProps> = ({ student, onBack }) => {
  useEffect(() => {
    document.title = `${student.fullName} — CV | StajımVar`;
  }, [student.fullName]);

  const yetenekler = student.skills ?? [];
  const diller = student.languages ?? [];
  const projeler = student.projects ?? [];
  const sosyal = student.softSkills ?? [];

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        @media print {
          /* Site kabuğu çıktıda yok; kağıda yalnızca CV gitsin. */
          .yazdirma-disi { display: none !important; }
          body { background: #fff !important; }
          .cv-kagit {
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            max-width: none !important;
            padding: 0 !important;
          }
          /* Bir bölüm sayfa sonunda ikiye bölünmesin. */
          .cv-bolum { break-inside: avoid; }
        }
        @page { margin: 16mm 14mm; }
      `}</style>

      <div className="yazdirma-disi sticky top-0 bg-white border-b border-gray-200 z-10">
        {/* Baslik cubugu ana sayfayla ayni genislikte. */}
        <div className={`${SAYFA_GENISLIGI} mx-auto px-2.5 sm:px-6 lg:px-8 xl:px-10 py-3 flex items-center justify-between gap-3`}>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Profile dön
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            PDF olarak kaydet
          </button>
        </div>
      </div>

      <p className="yazdirma-disi max-w-3xl mx-auto px-4 pt-4 text-xs text-gray-500">
        Açılan pencerede yazıcı olarak <strong>"PDF olarak kaydet"</strong> seçeneğini seçin.
        Telefonda paylaş menüsünden de kaydedebilirsiniz.
      </p>

      <main className="cv-kagit max-w-3xl mx-auto my-4 bg-white p-8 sm:p-10 shadow-sm rounded-lg space-y-5 text-gray-800">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">{adYazimi(student.fullName)}</h1>
          <p className="text-sm text-gray-600">
            {student.department}
            {student.university ? ` · ${student.university}` : ''}
          </p>
          <p className="text-xs text-gray-500">
            {[student.email, student.phone, student.preferences?.cities?.join(', ')]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </header>

        {student.bio && (
          <Bolum baslik="Hakkında">
            <p className="text-sm leading-relaxed">{student.bio}</p>
          </Bolum>
        )}

        <Bolum baslik="Eğitim">
          <div className="text-sm">
            <p className="font-semibold text-gray-900">{student.university || 'Belirtilmemiş'}</p>
            <p className="text-gray-600">
              {[student.department, student.gradeLevel].filter(Boolean).join(' · ')}
              {student.gpa ? ` · Not ortalaması ${student.gpa}` : ''}
            </p>
          </div>
        </Bolum>

        {yetenekler.length > 0 && (
          <Bolum baslik="Teknik yetenekler">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {yetenekler.map((y) => (
                <li key={y.name} className="flex items-center gap-1.5">
                  <span className="font-medium">{y.name}</span>
                  <span className="text-gray-500 text-xs">({SEVIYE[y.level] ?? y.level})</span>
                  {/*
                    Doğrulanmış rozet CV'de ayrıca işaretleniyor: testi sunucu
                    puanladığı için bu işaret gerçekten bir şey ifade ediyor.
                  */}
                  {y.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </li>
              ))}
            </ul>
          </Bolum>
        )}

        {sosyal.length > 0 && (
          <Bolum baslik="Sosyal beceriler">
            <p className="text-sm">{sosyal.join(' · ')}</p>
          </Bolum>
        )}

        {diller.length > 0 && (
          <Bolum baslik="Yabancı diller">
            <ul className="text-sm space-y-0.5">
              {diller.map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.language}</span>
                  <span className="text-gray-600"> — {d.proficiencyText || d.level}</span>
                </li>
              ))}
            </ul>
          </Bolum>
        )}

        {projeler.length > 0 && (
          <Bolum baslik="Projeler">
            <ul className="space-y-2 text-sm">
              {projeler.map((p) => (
                <li key={p.id}>
                  <p className="font-semibold text-gray-900">{p.title}</p>
                  {p.description && <p className="text-gray-600">{p.description}</p>}
                  {p.techStack.length > 0 && (
                    <p className="text-xs text-gray-500">{p.techStack.join(', ')}</p>
                  )}
                  {p.githubUrl && <p className="text-xs text-blue-700">{p.githubUrl}</p>}
                </li>
              ))}
            </ul>
          </Bolum>
        )}

        {student.targetRoles.length > 0 && (
          <Bolum baslik="Aradığı pozisyon">
            <p className="text-sm">{student.targetRoles.join(' · ')}</p>
          </Bolum>
        )}

        <p className="text-[10px] text-gray-400 pt-2">
          Bu CV stajimvar.com profilinden oluşturuldu.
        </p>
      </main>
    </div>
  );
};
