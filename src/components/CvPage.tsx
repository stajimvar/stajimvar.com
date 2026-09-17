import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Code2,
  FileText,
  Globe,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  Phone,
  Printer,
} from 'lucide-react';
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

/*
  YAZI TİPİ: SİSTEM SERİFİ

  Belge serif ile basılıyor (Georgia ailesi). Web fontu yüklenmiyor: site
  CSP'si `font-src 'self'` ve yazdırma anında inmemiş bir font PDF'e
  yedek fontla geçerdi. Georgia Windows, macOS ve iOS'ta var, Türkçe
  karakterleri taşıyor; Android'de Noto Serif'e düşüyor.
*/
const SERIF = { fontFamily: 'Georgia, "Noto Serif", "Times New Roman", serif' } as const;

/** A4'ün 96 dpi'deki genişliği (210 mm). */
const A4_GENISLIK = 794;

/** Belgenin lacivert zemini ve mavi vurgusu. */
const LACIVERT = '#10284A';

/** Adresin okunur hâli: protokol ve sondaki eğik çizgi atılıyor. */
const adresMetni = (adres: string) => adres.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const tamAdres = (adres: string) => (/^https?:\/\//i.test(adres) ? adres : `https://${adres}`);

/** Yan sütun bölüm başlığı: beyaz, aralıklı büyük harf, altında mavi çizgi. */
const YanBolum: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="cv-bolum">
    <h2 className="mb-3 border-b-2 border-blue-500 pb-2 text-[15px] font-bold uppercase tracking-[0.12em] text-white">
      {baslik}
    </h2>
    {children}
  </section>
);

/** Ana sütun bölüm başlığı: simge, lacivert büyük harf, sağa uzanan ince çizgi. */
const AnaBolum: React.FC<{ baslik: string; ikon?: React.ReactNode; children: React.ReactNode }> = ({
  baslik,
  ikon,
  children,
}) => (
  <section className="cv-bolum">
    <h2 className="mb-3 flex items-center gap-3 text-lg font-bold uppercase tracking-[0.08em]" style={{ color: LACIVERT }}>
      {ikon && <span className="shrink-0">{ikon}</span>}
      <span>{baslik}</span>
      {ikon && <span aria-hidden className="h-px flex-1" style={{ background: LACIVERT }} />}
    </h2>
    {children}
  </section>
);

/*
  YAZDIRILABİLİR CV — StajımVar belgesi (17 Eylül 2026, kullanıcının
  onayladığı referans tasarım)

  Solda lacivert sütun: fotoğraf, iletişim, teknik yetkinlikler, diller,
  sosyal beceriler ve StajımVar imzası. Sağda: büyük harfli ad, bölüm ve
  sınıf, hakkımda, eğitim, projeler (zaman çizgisi), aradığı pozisyonlar.

  HER ŞEY PROFİLDEN: boş alanın bölümü çizilmiyor; referanstaki proje alt
  başlığı ve madde işaretleri profil verisinde ayrı alan olmadığı için
  yok — proje adı, açıklaması, teknolojileri ve bağlantısı olduğu gibi.

  Yazdırmada sayfa kenar boşluğu sıfır: lacivert sütun kâğıdın kenarına
  kadar gidiyor; renkler `print-color-adjust: exact` ile basılıyor. Ekranda
  da aynı A4 kâğıdı gösteriliyor, dar ekranda küçültülerek.
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
  */
  const ikonSinifi = 'h-5 w-5 shrink-0 text-white';
  const iletisim: { anahtar: string; ikon: React.ReactNode; metin: string; href?: string }[] = [
    ...(student.email
      ? [{ anahtar: 'eposta', ikon: <Mail className={ikonSinifi} strokeWidth={1.5} />, metin: student.email, href: `mailto:${student.email}` }]
      : []),
    ...(student.phone
      ? [{ anahtar: 'telefon', ikon: <Phone className={ikonSinifi} strokeWidth={1.5} />, metin: student.phone, href: `tel:${student.phone.replace(/\s/g, '')}` }]
      : []),
    ...(student.city ? [{ anahtar: 'konum', ikon: <MapPin className={ikonSinifi} strokeWidth={1.5} />, metin: student.city }] : []),
    ...(student.portfolioUrl
      ? [{ anahtar: 'portfolyo', ikon: <Globe className={ikonSinifi} strokeWidth={1.5} />, metin: adresMetni(student.portfolioUrl), href: tamAdres(student.portfolioUrl) }]
      : []),
    ...(student.linkedinUrl
      ? [{ anahtar: 'linkedin', ikon: <Link2 className={ikonSinifi} strokeWidth={1.5} />, metin: adresMetni(student.linkedinUrl), href: tamAdres(student.linkedinUrl) }]
      : []),
    ...(student.githubUsername
      ? [{ anahtar: 'github', ikon: <Code2 className={ikonSinifi} strokeWidth={1.5} />, metin: `github.com/${student.githubUsername}`, href: `https://github.com/${student.githubUsername}` }]
      : []),
  ];

  const fotografVar = Boolean(fotografYolu || student.avatarUrl);
  const ad = adYazimi(student.fullName).toLocaleUpperCase('tr-TR');
  /* Uzun adlar büyük harfte taşmasın: harf sayısına göre ölçü küçülüyor. */
  const adOlcusu =
    ad.length > 22
      ? 'text-[40px]'
      : ad.length > 14
        ? 'text-[46px]'
        : 'text-[54px]';
  const sinifSatiri = student.gradeLevel
    ? /Sınıf$/.test(student.gradeLevel)
      ? `${student.gradeLevel} Öğrencisi`
      : student.gradeLevel
    : null;
  /*
    EKRANDA DA A4 (17 Eylül 2026)

    Kâğıt her genişlikte 210 × 297 mm'nin 96 dpi karşılığı (794 × 1123 px)
    ve PDF'te çıkacağı düzende çiziliyor; telefonda alt alta dizilmiş ayrı
    bir hâl yok. Ekran kâğıttan darsa kâğıt `transform: scale` ile sığacak
    kadar küçülüyor ve kabın yüksekliği ölçeğe göre ayarlanıyor (transform
    yerleşimi değiştirmediği için boşluk elle veriliyor). Yakınlaştırma
    tarayıcının kendisinde. Yazdırmada ölçek yok (`print` kuralları).
  */
  const kapRef = useRef<HTMLDivElement>(null);
  const kagitRef = useRef<HTMLElement>(null);
  const [olcu, setOlcu] = useState<{ olcek: number; yukseklik: number | null }>({ olcek: 1, yukseklik: null });
  useLayoutEffect(() => {
    const kap = kapRef.current;
    const kagit = kagitRef.current;
    if (!kap || !kagit) return;
    const hesapla = () => {
      /* `clientWidth` iç boşluğu da sayıyor; kâğıdın sığacağı genişlik ondan az. */
      const stil = getComputedStyle(kap);
      const genislik = kap.clientWidth - parseFloat(stil.paddingLeft) - parseFloat(stil.paddingRight);
      const olcek = Math.min(1, genislik / A4_GENISLIK);
      setOlcu({ olcek, yukseklik: kagit.offsetHeight * olcek });
    };
    hesapla();
    const gozlemci = new ResizeObserver(hesapla);
    gozlemci.observe(kap);
    gozlemci.observe(kagit);
    return () => gozlemci.disconnect();
  }, []);

  const egitimAlt = [student.gradeLevel, student.gpa ? `Not ortalaması: ${student.gpa}` : null].filter(Boolean).join(' · ');

  return (
    <div className="min-h-screen bg-gray-100 print:min-h-0 print:bg-white">
      <style>{`
        @media print {
          .yazdirma-disi { display: none !important; }
          html, body { background: #fff !important; }
          .cv-kap { height: auto !important; width: auto !important; padding: 0 !important; }
          .cv-kap > div { height: auto !important; }
          .cv-kagit {
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            width: auto !important;
            transform: none !important;
          }
          .cv-kagit, .cv-kagit * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .cv-sutun {
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
          }
          .cv-bolum, .cv-oge { break-inside: avoid; }
        }
        @page { size: A4; margin: 0; }
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

      <p className="yazdirma-disi mx-auto max-w-[794px] px-4 pt-4 text-xs leading-relaxed text-gray-500">
        Açılan pencerede yazıcı olarak <strong>"PDF olarak kaydet"</strong> seçeneğini seçin.
        Telefonda paylaş menüsünden de kaydedebilirsiniz.
      </p>

      <div ref={kapRef} className="cv-kap mx-auto w-full max-w-[794px] px-3 py-4 sm:px-0 sm:py-6">
      <div className="overflow-hidden" style={{ height: olcu.yukseklik ?? undefined }}>
      <main
        ref={kagitRef}
        className="cv-kagit grid min-h-[297mm] w-[794px] grid-cols-[35%_65%] overflow-hidden bg-white shadow-md"
        style={{ ...SERIF, transform: olcu.olcek < 1 ? `scale(${olcu.olcek})` : undefined, transformOrigin: 'top left' }}
      >
        {/* ---------------- Lacivert yan sütun ---------------- */}
        <aside
          className="cv-sutun flex min-w-0 flex-col gap-6 px-8 py-9 text-white"
          style={{ background: LACIVERT }}
        >
          {fotografVar && (
            <ProfilFotografi
              ad={student.fullName}
              yol={fotografYolu}
              yedekAdres={student.avatarUrl || null}
              className="mx-auto aspect-square w-[170px] shrink-0 rounded-full text-4xl grayscale"
            />
          )}

          {iletisim.length > 0 && (
            <YanBolum baslik="İletişim">
              <ul className="space-y-2.5 text-[15px]">
                {iletisim.map((o) => (
                  <li key={o.anahtar} className="flex min-w-0 items-center gap-4">
                    {o.ikon}
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
            </YanBolum>
          )}

          {yetenekler.length > 0 && (
            <YanBolum baslik="Teknik yetkinlikler">
              <ul className="space-y-1.5 text-[15px]">
                {yetenekler.map((y) => (
                  <li key={y.name} className="cv-oge flex flex-wrap items-center gap-x-2">
                    <span>{y.name}</span>
                    <span aria-hidden className="text-blue-300">·</span>
                    <span className="text-white/85">{SEVIYE[y.level] ?? y.level}</span>
                    {/* Doğrulanmış yetkinlik: testi sunucu puanladı. */}
                    {y.verified && <BadgeCheck aria-label="Doğrulandı" className="h-4 w-4 text-blue-300" />}
                  </li>
                ))}
              </ul>
            </YanBolum>
          )}

          {diller.length > 0 && (
            <YanBolum baslik="Yabancı diller">
              <ul className="space-y-1.5 text-[15px]">
                {diller.map((d) => (
                  <li key={d.id} className="cv-oge flex flex-wrap items-center gap-x-2">
                    <span>{d.language}</span>
                    {(d.level || d.proficiencyText) && (
                      <>
                        <span aria-hidden className="text-blue-300">·</span>
                        <span className="text-white/85">{d.level || d.proficiencyText}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </YanBolum>
          )}

          {sosyal.length > 0 && (
            <YanBolum baslik="Sosyal beceriler">
              <ul className="space-y-1 text-[15px]">
                {sosyal.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </YanBolum>
          )}

          {/* StajımVar imzası: sütunun dibinde, sitenin logosuyla aynı yazı. */}
          <p
            className="mt-auto pt-4 text-center text-2xl font-extrabold tracking-tight text-white"
            style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
          >
            Stajım<span className="text-blue-400">Var</span>
          </p>
        </aside>

        {/* ---------------- Ana sütun ---------------- */}
        <div className="cv-sutun flex min-w-0 flex-col gap-6 px-11 py-9">
          <header>
            <h1 className={`break-words font-bold leading-[1.05] ${adOlcusu}`} style={{ color: LACIVERT }}>
              {ad}
            </h1>
            {student.department && (
              <p className="mt-4 text-3xl leading-snug text-blue-600">{student.department}</p>
            )}
            {sinifSatiri && <p className="mt-1 text-2xl text-gray-600">{sinifSatiri}</p>}
            <span aria-hidden className="mt-4 block h-1 w-24 rounded-full bg-blue-600" />
          </header>

          {student.bio && (
            <AnaBolum baslik="Hakkımda">
              <p className="text-base leading-relaxed text-gray-700">{student.bio}</p>
            </AnaBolum>
          )}

          <AnaBolum baslik="Eğitim" ikon={<GraduationCap className="h-7 w-7" strokeWidth={2} />}>
            <div className="cv-oge">
              <p className="text-xl font-bold leading-snug" style={{ color: LACIVERT }}>
                {student.university || 'Belirtilmemiş'}
              </p>
              {student.department && <p className="mt-1 text-base text-gray-700">{student.department}</p>}
              {egitimAlt && <p className="mt-1 text-base text-gray-700">{egitimAlt}</p>}
            </div>
          </AnaBolum>

          {projeler.length > 0 && (
            <AnaBolum baslik="Projeler" ikon={<FileText className="h-7 w-7" strokeWidth={2} />}>
              <ol className="space-y-5">
                {projeler.map((p) => {
                  const baglanti = p.liveUrl || p.githubUrl;
                  return (
                    <li key={p.id} className="cv-oge relative pl-11">
                      {/* Zaman çizgisi: halka ve aşağı inen ince çizgi. */}
                      <span aria-hidden className="absolute left-[3px] top-1.5 h-4 w-4 rounded-full border-2 border-blue-600 bg-white" />
                      <span aria-hidden className="absolute bottom-0 left-[10px] top-6 w-px bg-blue-200" />
                      <p className="text-xl font-bold leading-snug" style={{ color: LACIVERT }}>
                        {p.title}
                      </p>
                      {p.techStack.length > 0 && (
                        <p className="mt-0.5 text-base font-semibold text-blue-600">{p.techStack.join(' · ')}</p>
                      )}
                      {p.description && <p className="mt-1.5 text-base leading-relaxed text-gray-700">{p.description}</p>}
                      {baglanti && (
                        <a
                          href={tamAdres(baglanti)}
                          className="mt-2 inline-flex items-center gap-1.5 text-base text-blue-600 underline underline-offset-2"
                        >
                          {adresMetni(baglanti)}
                          <ArrowUpRight aria-hidden className="h-4 w-4" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ol>
            </AnaBolum>
          )}

          {hedefler.length > 0 && (
            <AnaBolum baslik="Aradığım pozisyonlar" ikon={<Briefcase className="h-7 w-7" strokeWidth={2} />}>
              <ul className="space-y-1.5 text-base text-gray-800">
                {hedefler.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </AnaBolum>
          )}

          <p className="mt-auto pt-2 text-right text-xs text-gray-500">StajımVar profilinden oluşturuldu.</p>
        </div>
      </main>
      </div>
      </div>
    </div>
  );
};
