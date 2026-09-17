import React, { useEffect } from 'react';
import { ArrowLeft, BadgeCheck, Code2, Globe, Link2, Mail, MapPin, Phone, Printer } from 'lucide-react';
import type { StudentProfile } from '../types';
import { adYazimi } from '../lib/ad';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { ProfilFotografi } from './sosyal/ProfilFotografi';

interface CvPageProps {
  student: StudentProfile;
  onBack: () => void;
  /**
   * Profil fotoğrafının depolama yolu (`social_profiles.avatar_path`).
   * Yol da yedek adres de yoksa CV'de fotoğraf alanı HİÇ çizilmiyor:
   * baş harfli bir daire belgede eksik bir fotoğraf gibi durur.
   */
  fotografYolu?: string | null;
}

const SEVIYE: Record<string, string> = {
  Beginner: 'Temel',
  Intermediate: 'Orta',
  Advanced: 'İleri',
  Expert: 'Uzman',
};

/** Seviye göstergesi için 1–4. Bilinmeyen seviyede gösterge çizilmiyor. */
const SEVIYE_PUANI: Record<string, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
};

/** Adresin okunur hâli: protokol ve sondaki eğik çizgi atılıyor. */
const adresMetni = (adres: string) => adres.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

const tamAdres = (adres: string) => (/^https?:\/\//i.test(adres) ? adres : `https://${adres}`);

/*
  BÖLÜM BAŞLIĞI — StajımVar mavisinde küçük büyük harf ve ince çizgi.
  `break-inside: avoid` yazdırmada başlığın bir sayfada, içeriğinin
  ötekinde kalmasını önlüyor.
*/
const Bolum: React.FC<{ baslik: string; children: React.ReactNode; className?: string }> = ({
  baslik,
  children,
  className = '',
}) => (
  <section className={`cv-bolum ${className}`}>
    <h2 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-700">
      <span>{baslik}</span>
      <span aria-hidden className="h-px flex-1 bg-blue-100" />
    </h2>
    {children}
  </section>
);

const Etiket: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800">
    {children}
  </li>
);

/*
  YAZDIRILABİLİR CV — StajımVar belgesi (17 Eylül 2026 tasarımı)

  Her alan öğrencinin kendi profilinden; boş alanın bölümü çizilmiyor ve
  yerine doldurma metni yazılmıyor. Yan sütun kısa ve taranabilir bilgiler
  (aradığı pozisyon, yetenekler, diller, sosyal beceriler), ana sütun
  anlatı (eğitim, projeler).

  Yazdırmada A4'e göre iki sütun korunuyor, renkler basılıyor
  (`print-color-adjust: exact`), araç çubuğu ve açıklama satırı düşüyor.
  Telefonda sütunlar alt alta.
*/
export const CvPage: React.FC<CvPageProps> = ({ student, onBack, fotografYolu = null }) => {
  useEffect(() => {
    document.title = `${student.fullName} — CV | StajımVar`;
  }, [student.fullName]);

  const yetenekler = student.skills ?? [];
  const diller = student.languages ?? [];
  const projeler = student.projects ?? [];
  const sosyal = student.softSkills ?? [];
  const hedefler = student.targetRoles ?? [];

  /*
    KONUM OTURDUĞU İL: önce `preferences.cities` (staj yapmak istediği
    şehirler) yazılıyordu ve CV'de "yaşadığı yer" gibi okunuyordu.
    `student.city` oturduğu il; boşsa satır yok.
  */
  const iletisim: { anahtar: string; ikon: React.ReactNode; metin: string; href?: string }[] = [
    ...(student.email
      ? [{ anahtar: 'eposta', ikon: <Mail className="h-3.5 w-3.5" />, metin: student.email, href: `mailto:${student.email}` }]
      : []),
    ...(student.phone
      ? [{ anahtar: 'telefon', ikon: <Phone className="h-3.5 w-3.5" />, metin: student.phone, href: `tel:${student.phone.replace(/\s/g, '')}` }]
      : []),
    ...(student.city ? [{ anahtar: 'konum', ikon: <MapPin className="h-3.5 w-3.5" />, metin: student.city }] : []),
    ...(student.linkedinUrl
      ? [{ anahtar: 'linkedin', ikon: <Link2 className="h-3.5 w-3.5" />, metin: adresMetni(student.linkedinUrl), href: tamAdres(student.linkedinUrl) }]
      : []),
    ...(student.githubUsername
      ? [{ anahtar: 'github', ikon: <Code2 className="h-3.5 w-3.5" />, metin: `github.com/${student.githubUsername}`, href: `https://github.com/${student.githubUsername}` }]
      : []),
    ...(student.portfolioUrl
      ? [{ anahtar: 'portfolyo', ikon: <Globe className="h-3.5 w-3.5" />, metin: adresMetni(student.portfolioUrl), href: tamAdres(student.portfolioUrl) }]
      : []),
  ];

  const fotografVar = Boolean(fotografYolu || student.avatarUrl);
  const altBaslik = [student.department, student.gradeLevel].filter(Boolean).join(' · ');
  const yanSutunVar = hedefler.length > 0 || yetenekler.length > 0 || diller.length > 0 || sosyal.length > 0;
  const bugun = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-100 print:min-h-0 print:bg-white">
      <style>{`
        @media print {
          .yazdirma-disi { display: none !important; }
          html, body { background: #fff !important; }
          .cv-kagit {
            box-shadow: none !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            max-width: none !important;
          }
          .cv-kagit, .cv-kagit * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .cv-bolum, .cv-oge { break-inside: avoid; }
        }
        @page { size: A4; margin: 10mm; }
      `}</style>

      {/* Araç çubuğu: yalnız ekranda. */}
      <div className="yazdirma-disi sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className={`${SAYFA_GENISLIGI} mx-auto flex items-center justify-between gap-3 px-2.5 py-3 sm:px-6 lg:px-8 xl:px-10`}>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Profile dön
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            PDF olarak kaydet
          </button>
        </div>
      </div>

      <p className="yazdirma-disi mx-auto max-w-[850px] px-4 pt-4 text-xs leading-relaxed text-gray-500">
        Açılan pencerede yazıcı olarak <strong>"PDF olarak kaydet"</strong> seçeneğini seçin.
        Telefonda paylaş menüsünden de kaydedebilirsiniz.
      </p>

      <main className="cv-kagit mx-auto my-4 max-w-[850px] overflow-hidden border-gray-200 bg-white text-gray-800 shadow-sm sm:my-6 sm:rounded-2xl sm:border">
        {/* Marka şeridi */}
        <div aria-hidden className="h-1.5 bg-blue-600" />

        {/* ---------------- Başlık ---------------- */}
        <header className="flex flex-col gap-5 px-6 pb-6 pt-7 sm:flex-row sm:items-center sm:gap-7 sm:px-10 sm:pt-9 print:flex-row print:items-center print:px-8">
          {fotografVar && (
            <ProfilFotografi
              ad={student.fullName}
              yol={fotografYolu}
              yedekAdres={student.avatarUrl || null}
              className="h-24 w-24 shrink-0 rounded-full text-2xl ring-4 ring-blue-50 sm:h-28 sm:w-28"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-[34px]">
              {adYazimi(student.fullName)}
            </h1>
            {altBaslik && <p className="mt-1 text-base font-semibold text-blue-700">{altBaslik}</p>}
            {student.university && <p className="text-sm text-gray-600">{student.university}</p>}

            {iletisim.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-gray-700">
                {iletisim.map((o) => (
                  <li key={o.anahtar} className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-blue-600">{o.ikon}</span>
                    {o.href ? (
                      <a href={o.href} className="min-w-0 break-all hover:underline">
                        {o.metin}
                      </a>
                    ) : (
                      <span className="min-w-0 break-words">{o.metin}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {student.bio && (
          <div className="cv-bolum mx-6 mb-6 rounded-xl bg-blue-50/60 px-5 py-4 sm:mx-10 print:mx-8">
            <p className="text-sm leading-relaxed text-gray-800">{student.bio}</p>
          </div>
        )}

        {/* ---------------- Gövde: ana sütun + yan sütun ---------------- */}
        <div
          className={`grid gap-8 px-6 pb-8 sm:px-10 print:px-8 ${
            yanSutunVar ? 'md:grid-cols-[minmax(0,1fr)_250px] print:grid-cols-[minmax(0,1fr)_220px]' : ''
          }`}
        >
          <div className="min-w-0 space-y-7">
            <Bolum baslik="Eğitim">
              <div className="cv-oge">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-bold text-gray-900">{student.university || 'Belirtilmemiş'}</p>
                  {student.graduationYear ? (
                    <p className="text-xs font-semibold text-gray-500">Mezuniyet {student.graduationYear}</p>
                  ) : null}
                </div>
                <p className="text-sm text-gray-600">
                  {[student.faculty, student.department, student.gradeLevel].filter(Boolean).join(' · ')}
                </p>
                {student.gpa ? (
                  <p className="mt-1 text-sm text-gray-700">
                    Not ortalaması <span className="font-semibold text-gray-900">{student.gpa}</span>
                  </p>
                ) : null}
              </div>
            </Bolum>

            {projeler.length > 0 && (
              <Bolum baslik="Projeler">
                <ul className="space-y-4">
                  {projeler.map((p) => (
                    <li key={p.id} className="cv-oge border-l-2 border-blue-100 pl-4">
                      <p className="font-bold text-gray-900">{p.title}</p>
                      {p.description && (
                        <p className="mt-0.5 text-sm leading-relaxed text-gray-700">{p.description}</p>
                      )}
                      {p.techStack.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {p.techStack.map((t) => (
                            <li key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                              {t}
                            </li>
                          ))}
                        </ul>
                      )}
                      {(p.liveUrl || p.githubUrl) && (
                        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {p.liveUrl && (
                            <a href={tamAdres(p.liveUrl)} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                              <Globe className="h-3 w-3" />
                              {adresMetni(p.liveUrl)}
                            </a>
                          )}
                          {p.githubUrl && (
                            <a href={tamAdres(p.githubUrl)} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                              <Code2 className="h-3 w-3" />
                              {adresMetni(p.githubUrl)}
                            </a>
                          )}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Bolum>
            )}
          </div>

          {yanSutunVar && (
            <aside className="min-w-0 space-y-7 md:border-l md:border-gray-100 md:pl-7 print:border-l print:border-gray-100 print:pl-6">
              {hedefler.length > 0 && (
                <Bolum baslik="Aradığı pozisyon">
                  <ul className="flex flex-wrap gap-1.5">
                    {hedefler.map((h) => (
                      <Etiket key={h}>{h}</Etiket>
                    ))}
                  </ul>
                </Bolum>
              )}

              {yetenekler.length > 0 && (
                <Bolum baslik="Teknik yetenekler">
                  <ul className="space-y-2.5">
                    {yetenekler.map((y) => {
                      const puan = SEVIYE_PUANI[y.level];
                      return (
                        <li key={y.name} className="cv-oge">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-1 font-semibold text-gray-900">
                              <span className="truncate">{y.name}</span>
                              {/*
                                Doğrulanmış rozet: testi sunucu puanladığı için
                                işaret gerçekten bir şey ifade ediyor.
                              */}
                              {y.verified && (
                                <BadgeCheck aria-label="Doğrulandı" className="h-4 w-4 shrink-0 text-emerald-600" />
                              )}
                            </span>
                            <span className="shrink-0 text-xs text-gray-500">{SEVIYE[y.level] ?? y.level}</span>
                          </div>
                          {puan && (
                            <div aria-hidden className="mt-1 grid grid-cols-4 gap-1">
                              {[1, 2, 3, 4].map((n) => (
                                <span key={n} className={`h-1 rounded-full ${n <= puan ? 'bg-blue-600' : 'bg-gray-200'}`} />
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Bolum>
              )}

              {diller.length > 0 && (
                <Bolum baslik="Yabancı diller">
                  <ul className="space-y-2">
                    {diller.map((d) => (
                      <li key={d.id} className="cv-oge flex items-start justify-between gap-2 text-sm">
                        <span className="min-w-0">
                          <span className="block font-semibold text-gray-900">{d.language}</span>
                          {d.proficiencyText && d.proficiencyText !== d.level && (
                            <span className="block text-xs text-gray-500">{d.proficiencyText}</span>
                          )}
                        </span>
                        {d.level && (
                          <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                            {d.level}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Bolum>
              )}

              {sosyal.length > 0 && (
                <Bolum baslik="Sosyal beceriler">
                  <ul className="flex flex-wrap gap-1.5">
                    {sosyal.map((s) => (
                      <Etiket key={s}>{s}</Etiket>
                    ))}
                  </ul>
                </Bolum>
              )}
            </aside>
          )}
        </div>

        {/* ---------------- Alt bilgi ---------------- */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3 sm:px-10 print:px-8">
          <span className="text-sm font-extrabold tracking-tight text-gray-900">
            Stajım<span className="text-blue-600">Var</span>
          </span>
          <span className="text-[11px] text-gray-500">
            stajimvar.com profilinden oluşturuldu · {bugun}
          </span>
        </footer>
      </main>
    </div>
  );
};
