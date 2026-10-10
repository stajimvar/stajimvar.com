import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Brush,
  Camera,
  Clapperboard,
  Code2,
  Cpu,
  Dumbbell,
  FlaskConical,
  FolderKanban,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Link2,
  Mail,
  MapPin,
  Music,
  Music2,
  Palette,
  Paintbrush,
  Phone,
  Plane,
  Printer,
  Rocket,
  Shirt,
  Sparkles,
  Trees,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import type { CvGizliAlan, StudentProfile, StudentProject } from '../types';
import { adYazimi } from '../lib/ad';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { ProfilFotografi } from './sosyal/ProfilFotografi';
import { ayAnahtari, ayMetni, deneyimKaydi, deneyimKopyasi, deneyimSirasi, tarihAraligi } from '../lib/deneyim.mjs';
import { CALISMA_TURU_ETIKET, EGITIM_DUZEYI_ETIKET } from './profil/form-siniflari';

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

/*
  YAZI TİPİ: SİSTEM SANS (7 Ekim 2026)

  Web fontu yüklenmiyor: site CSP'si `font-src 'self'` ve yazdırma anında
  inmemiş bir font PDF'e yedek fontla geçerdi. Sistem ailesi her
  platformda var ve Türkçe karakterleri taşıyor (Windows'ta Segoe UI,
  Apple'da SF, Android'de Roboto).
*/
const SANS = {
  fontFamily: '"Segoe UI", ui-sans-serif, system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

/** A4'ün 96 dpi'deki genişliği (210 mm). */
const A4_GENISLIK = 794;

/*
  RENKLER — kullanıcının verdiği mavi referans şablondan (10 Ekim 2026).
  Sol sütun açık mavi-gri; başlıklar ve simge daireleri lacivert.
  Lacivert yazı açık zeminde ≈11:1, gövde metni (gray-700) beyazda ≈10:1.
*/
const YAN_ZEMIN = '#E8EEF5';
const CIZGI = '#C8D4E3';
const LACIVERT = '#1F3A5F';
const MUREKKEP = '#111827';
/** Sol sütunun genişliği (px); yazdırmada ikinci sayfanın zemini de bunu kullanıyor. */
const SOL_SUTUN = 262;

/** Adresin okunur hâli: protokol ve sondaki eğik çizgi atılıyor. */
const adresMetni = (adres: string) => adres.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const tamAdres = (adres: string) => (/^https?:\/\//i.test(adres) ? adres : `https://${adres}`);
const anahtar = (s: string) => s.trim().toLocaleLowerCase('tr-TR');

/*
  DİL SEVİYESİ — tek ölçek (10 Ekim 2026)

  Profil `Ana dil` ya da CEFR (A1–C2) kaydediyor; eski kayıtlarda serbest
  metin olabilir ("B2 - Profesyonel…"). Baştaki CEFR kodu okunabiliyorsa
  çubuk ve "Orta · B1" gibi tutarlı bir etiket çiziliyor; okunamıyorsa
  yazılanın kendisi basılıyor ve çubuk ÇİZİLMİYOR — seviyeyi tahmin
  etmek uydurma olurdu.
*/
const DIL_OLCEGI: Record<string, { oran: number; etiket: string }> = {
  A1: { oran: 20, etiket: 'Başlangıç · A1' },
  A2: { oran: 35, etiket: 'Başlangıç · A2' },
  B1: { oran: 50, etiket: 'Orta · B1' },
  B2: { oran: 65, etiket: 'Orta · B2' },
  C1: { oran: 82, etiket: 'İleri · C1' },
  C2: { oran: 95, etiket: 'İleri · C2' },
};
const dilSeviyesi = (level: string, metin: string) => {
  const ham = (level || metin || '').trim();
  if (/^ana ?dil|^native|^anadil/i.test(ham)) return { oran: 100, etiket: 'Ana dil' };
  const kod = ham.match(/^([abc][12])\b/i)?.[1]?.toUpperCase();
  return kod ? DIL_OLCEGI[kod] : ham ? { oran: null, etiket: ham } : null;
};

/** İlgi alanı simgeleri: hazır listedekiler için; kendi yazdıkları genel simgeyle. */
const ILGI_SIMGESI: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  'moda ve tekstil': Shirt,
  tasarım: Palette,
  fotoğraf: Camera,
  seyahat: Plane,
  spor: Dumbbell,
  müzik: Music,
  kitap: BookOpen,
  sinema: Clapperboard,
  teknoloji: Cpu,
  yazılım: Code2,
  girişimcilik: Rocket,
  gönüllülük: HeartHandshake,
  doğa: Trees,
  yemek: UtensilsCrossed,
  sanat: Brush,
  dans: Music2,
  resim: Paintbrush,
  oyun: Gamepad2,
  bilim: FlaskConical,
  tarih: Landmark,
};

/** Yıl aralığı: "2024 – Devam ediyor", "2023 – 2025", yalnız "2024". */
const yilAraligi = (bas: number | null | undefined, son: number | null | undefined, suruyor: boolean) => {
  const b = bas ? String(bas) : '';
  const s = suruyor ? 'Devam ediyor' : son ? String(son) : '';
  return b && s ? (b === s ? b : `${b} – ${s}`) : b || s;
};

/** Projeler: süren önce, sonra en yeni; tarihsizler sona (sıralama kararlı). */
const projeSirasi = (a: StudentProject, b: StudentProject) => {
  if (Boolean(a.ongoing) !== Boolean(b.ongoing)) return a.ongoing ? -1 : 1;
  const yil = (p: StudentProject) => p.endYear ?? p.startYear ?? -1;
  return yil(b) - yil(a);
};

/** Açıklamanın satırları madde oluyor; tek satır düz paragraf kalıyor. */
const maddeler = (metin: string) =>
  metin
    .split('\n')
    .map((s) => s.replace(/^\s*[-•*–]\s*/, '').trim())
    .filter(Boolean);

const Aciklama: React.FC<{ metin: string }> = ({ metin }) => {
  const satirlar = maddeler(metin);
  if (satirlar.length === 0) return null;
  if (satirlar.length === 1) return <p className="mt-1.5 text-[12px] leading-relaxed text-gray-700">{satirlar[0]}</p>;
  return (
    <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-gray-700">
      {satirlar.map((s, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ background: LACIVERT }} />
          <span className="min-w-0">{s}</span>
        </li>
      ))}
    </ul>
  );
};

/** Sol sütun başlığı: büyük harf, altında ince çizgi. */
const YanBolum: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="cv-bolum">
    <h2
      className="mb-3 border-b pb-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] [font-kerning:none]"
      style={{ color: LACIVERT, borderColor: CIZGI }}
    >
      {baslik}
    </h2>
    {children}
  </section>
);

/** Sağ sütun başlığı: lacivert dairede simge, büyük harf başlık, uzanan ince çizgi. */
const AnaBolum: React.FC<{ baslik: string; ikon: React.ReactNode; children: React.ReactNode }> = ({
  baslik,
  ikon,
  children,
}) => (
  <section className="cv-bolum">
    <h2 className="mb-3 flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: LACIVERT }}
      >
        {ikon}
      </span>
      <span className="text-[14px] font-bold uppercase tracking-[0.06em] [font-kerning:none]" style={{ color: LACIVERT }}>
        {baslik}
      </span>
      <span aria-hidden className="h-px flex-1" style={{ background: CIZGI }} />
    </h2>
    <div className="pl-10">{children}</div>
  </section>
);

/** Kayıt başlığı: solda kalın ad, sağda tarih (sağa yaslı, kırılmıyor). */
const KayitBasi: React.FC<{ baslik: React.ReactNode; tarih?: string }> = ({ baslik, tarih }) => (
  <div className="flex items-baseline justify-between gap-3">
    <p className="min-w-0 text-[13px] font-bold leading-snug" style={{ color: MUREKKEP }}>
      {baslik}
    </p>
    {tarih && <p className="shrink-0 whitespace-nowrap text-[11.5px] text-gray-600">{tarih}</p>}
  </div>
);

/*
  YAZDIRILABİLİR CV — MAVİ ŞABLON (10 Ekim 2026, kullanıcının verdiği
  referans tasarıma uyarlandı; lila şablonun yerini aldı)

  Sol dar sütun açık mavi-gri: fotoğraf, ad, iletişim, yetenekler, diller,
  ilgi alanları. Sağ geniş sütun beyaz: hakkımda, deneyim, eğitim,
  projeler, sertifikalar. Bölümün adı DOM'da önce sol sütun: ATS okuyucusu
  adı ve iletişimi ilk satırlarda buluyor.

  HER ŞEY PROFİLDEN: boş alanın bölümü çizilmiyor, örnek metin yok.
  Adın altına bölüm YAZILMIYOR (unvan gibi okunuyordu); bölüm eğitimde.
  Öğrencinin "CV'de neler görünsün" ayarında kapattığı bilgi basılmıyor
  (`cvGizli`); profilde duruyor.

  Kâğıt A4 (794 × 1123 px). Uzun bir CV ikinci sayfaya taşarsa kayıtlar
  ortadan bölünmüyor (`break-inside: avoid`) ve sol sütunun zemini ile iç
  boşlukları yeni sayfada tekrar ediyor (`box-decoration-break: clone`).
*/
/**
 * CV BELGESİ — A4 kâğıdın kendisi (794 × 1123 px).
 *
 * `/cv/yazdir`, kayıt sonrası karşılamadaki örnek ve CV oluşturma
 * ekranındaki canlı önizleme AYNI bileşeni çiziyor: şablon tek yerde.
 * Ölçekleme `CvOnizleme`nin işi; bu bileşen her zaman tam A4 boyutunda.
 */
export const CvBelgesi = React.forwardRef<
  HTMLElement,
  {
    student: StudentProfile;
    fotografYolu?: string | null;
    /** Sayfanın ana içeriği mi (`main`) yoksa önizleme mi (`div`). */
    anaIcerik?: boolean;
    stil?: React.CSSProperties;
    etiket?: string;
  }
>(({ student, fotografYolu = null, anaIcerik = false, stil, etiket }, kagitRef) => {
  const Kap = (anaIcerik ? 'main' : 'div') as 'main';
  const gizli = new Set<CvGizliAlan>(student.cvGizli ?? []);
  const goster = (alan: CvGizliAlan) => !gizli.has(alan);

  /* Yetenekler tek listede: programlar ve kişisel beceriler; aynı ad bir kez. */
  const dogrulanmis = new Set((student.skills ?? []).filter((s) => s.verified).map((s) => anahtar(s.name)));
  const yetenekler: string[] = [];
  for (const ad of [...(student.skills ?? []).map((s) => s.name), ...(student.softSkills ?? [])]) {
    const temiz = ad?.trim();
    if (temiz && !yetenekler.some((y) => anahtar(y) === anahtar(temiz))) yetenekler.push(temiz);
  }
  const diller = (student.languages ?? []).filter((d) => d.language?.trim());
  const ilgiler = goster('ilgi') ? (student.interests ?? []).filter((i) => i.trim()) : [];

  /*
    Deneyimler kopya biçiminde (pozisyon, kurum, tarih aralığı); en yenisi
    üstte. Okunamayan kayıt önce süzülüyor ki çalışma türü aynı sırada
    eşleşsin.
  */
  const siraliDeneyim = [...(student.experiences ?? [])].sort(deneyimSirasi).filter((e) => deneyimKaydi(e));
  const deneyimler = deneyimKopyasi(siraliDeneyim);

  /*
    EĞİTİM — ana kayıt + ek eğitimler, en yenisi üstte.

    Ana kayıt sitede her yerde kullanılan alanlar (üniversite, bölüm).
    "Devam ediyor" boşsa (eski kayıt) sınıftan türetiliyor — profil
    ekranıyla aynı kural. Mezuniyet yılı YALNIZ öğrenci "devam etmiyor"
    dediyse basılıyor: boş olduğunda okuyucu onu tahminle dolduruyor
    (queries/mappers), gerçek bir bilgi değil.
  */
  const anaSuruyor = student.educationOngoing ?? student.gradeLevel !== 'Yüksek Lisans / Mezun';
  const egitimler = [
    ...(student.university || student.department
      ? [
          {
            id: 'ana',
            okul: student.university,
            bolum: student.department,
            duzey: student.educationLevel ? EGITIM_DUZEYI_ETIKET[student.educationLevel] : student.gradeLevel,
            bas: student.educationStartYear ?? null,
            son: student.educationOngoing === false ? student.graduationYear : null,
            suruyor: anaSuruyor,
            not: student.gpa || null,
          },
        ]
      : []),
    ...(student.educations ?? []).map((e) => ({
      id: e.id,
      okul: e.school,
      bolum: e.department,
      duzey: e.level ? EGITIM_DUZEYI_ETIKET[e.level] : '',
      bas: e.startYear,
      son: e.endYear,
      suruyor: e.ongoing,
      not: e.gpa,
    })),
  ].sort((a, b) => {
    if (a.suruyor !== b.suruyor) return a.suruyor ? -1 : 1;
    return (b.son ?? b.bas ?? 0) - (a.son ?? a.bas ?? 0);
  });

  const projeler = [...(student.projects ?? [])].sort(projeSirasi);
  const sertifikalar = [...(student.certificates ?? [])].sort(
    (a, b) => (b.issueYear ?? 0) * 12 + (b.issueMonth ?? 0) - ((a.issueYear ?? 0) * 12 + (a.issueMonth ?? 0)),
  );

  /*
    İLETİŞİM — referanstaki sırayla: şehir, telefon, e-posta, LinkedIn,
    sonra isteğe bağlı portföy ve GitHub. Boş bağlantı yazılmıyor.
    KONUM OTURDUĞU İL: `preferences.cities` (staj yapmak istediği şehirler)
    "yaşadığı yer" gibi okunurdu.
  */
  const ikonSinifi = 'h-3 w-3';
  const iletisim: { anahtar: string; ikon: React.ReactNode; metin: string; href?: string }[] = [
    ...(student.city && goster('konum') ? [{ anahtar: 'konum', ikon: <MapPin className={ikonSinifi} strokeWidth={2.2} />, metin: student.city }] : []),
    ...(student.phone && goster('telefon')
      ? [{ anahtar: 'telefon', ikon: <Phone className={ikonSinifi} strokeWidth={2.2} />, metin: student.phone, href: `tel:${student.phone.replace(/\s/g, '')}` }]
      : []),
    ...(student.email && goster('eposta')
      ? [{ anahtar: 'eposta', ikon: <Mail className={ikonSinifi} strokeWidth={2.2} />, metin: student.email, href: `mailto:${student.email}` }]
      : []),
    ...(student.linkedinUrl && goster('linkedin')
      ? [{ anahtar: 'linkedin', ikon: <Link2 className={ikonSinifi} strokeWidth={2.2} />, metin: adresMetni(student.linkedinUrl), href: tamAdres(student.linkedinUrl) }]
      : []),
    ...(student.portfolioUrl && goster('portfoy')
      ? [{ anahtar: 'portfolyo', ikon: <Globe className={ikonSinifi} strokeWidth={2.2} />, metin: adresMetni(student.portfolioUrl), href: tamAdres(student.portfolioUrl) }]
      : []),
    ...(student.githubUsername
      ? [{ anahtar: 'github', ikon: <Code2 className={ikonSinifi} strokeWidth={2.2} />, metin: `github.com/${student.githubUsername}`, href: `https://github.com/${student.githubUsername}` }]
      : []),
  ];

  const fotografVar = goster('foto') && Boolean(fotografYolu || student.avatarUrl);
  const ad = adYazimi(student.fullName);
  /* Uzun adlar dar sütuna sığsın: harf sayısına göre ölçü küçülüyor. */
  const adOlcusu = ad.length > 26 ? 'text-[20px]' : ad.length > 18 ? 'text-[23px]' : 'text-[26px]';
  const notGoster = goster('not');
  const notMetni = (n: number | null | undefined) =>
    notGoster && n != null && n > 0 ? `Not ortalaması: ${n.toLocaleString('tr-TR')}` : null;

  return (
    <Kap
      ref={kagitRef}
      className="cv-kagit grid min-h-[297mm] w-[794px] grid-cols-[262px_minmax(0,1fr)] overflow-hidden bg-white shadow-md"
      style={{ ...SANS, color: MUREKKEP, ...stil }}
      aria-label={etiket}
    >
      {/* ---------------- Sol sütun: kimlik, iletişim, yetenekler ---------------- */}
      <aside className="cv-sutun flex min-w-0 flex-col gap-6 px-7 pb-8 pt-10" style={{ background: YAN_ZEMIN }}>
        <header className="flex flex-col items-center text-center">
          {fotografVar && (
            <ProfilFotografi
              ad={student.fullName}
              yol={fotografYolu}
              yedekAdres={student.avatarUrl || null}
              className="mb-4 h-[148px] w-[148px] shrink-0 rounded-full border-4 border-white text-5xl shadow-sm"
            />
          )}
          <h1 className={`break-words font-bold leading-tight ${adOlcusu}`} style={{ color: LACIVERT }}>
            {ad}
          </h1>
        </header>

        {iletisim.length > 0 && (
          <ul className="space-y-2 text-[11.5px] text-gray-800">
            {iletisim.map((o) => (
              <li key={o.anahtar} className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: LACIVERT }}
                >
                  {o.ikon}
                </span>
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

        {yetenekler.length > 0 && (
          <YanBolum baslik="Yetenekler">
            <ul className="flex flex-wrap gap-1.5">
              {yetenekler.map((y) => (
                <li
                  key={y}
                  className="cv-oge inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[11px] leading-none text-gray-800"
                  style={{ borderColor: CIZGI }}
                >
                  {y}
                  {/* Doğrulanmış yetkinlik: testi sunucu puanladı. */}
                  {dogrulanmis.has(anahtar(y)) && <BadgeCheck aria-label="Doğrulandı" className="h-3 w-3" style={{ color: LACIVERT }} />}
                </li>
              ))}
            </ul>
          </YanBolum>
        )}

        {diller.length > 0 && (
          <YanBolum baslik="Diller">
            <ul className="space-y-2.5">
              {diller.map((d) => {
                const seviye = dilSeviyesi(d.level, d.proficiencyText);
                return (
                  <li key={d.id} className="cv-oge">
                    <p className="flex items-baseline justify-between gap-2 text-[11.5px]">
                      <span className="font-semibold text-gray-900">{d.language}</span>
                      {seviye && <span className="text-right text-gray-600">{seviye.etiket}</span>}
                    </p>
                    {seviye?.oran != null && (
                      <span aria-hidden className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white">
                        <span className="block h-full rounded-full" style={{ width: `${seviye.oran}%`, background: LACIVERT }} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </YanBolum>
        )}

        {ilgiler.length > 0 && (
          <YanBolum baslik="İlgi alanları">
            <ul className="grid grid-cols-2 gap-x-2 gap-y-2 text-[11.5px] text-gray-800">
              {ilgiler.map((i) => {
                const Simge = ILGI_SIMGESI[anahtar(i)] ?? Sparkles;
                return (
                  <li key={i} className="cv-oge flex min-w-0 items-center gap-1.5">
                    <Simge aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    <span className="min-w-0 break-words">{i}</span>
                  </li>
                );
              })}
            </ul>
          </YanBolum>
        )}

        <p className="pt-2 text-[10px] text-gray-500">StajımVar profilinden oluşturuldu.</p>
      </aside>

      {/* ---------------- Sağ sütun: hakkımda, deneyim, eğitim, projeler, sertifikalar ---------------- */}
      <div className="cv-sutun flex min-w-0 flex-col gap-6 px-9 pb-8 pt-10">
        {student.bio && (
          <AnaBolum baslik="Hakkımda" ikon={<UserRound className="h-3.5 w-3.5" strokeWidth={2.2} />}>
            <p className="whitespace-pre-line text-[12px] leading-relaxed text-gray-700">{student.bio}</p>
          </AnaBolum>
        )}

        {/* DENEYİM (20261205010000): yalnız girilmişse; boş başlık yok. */}
        {deneyimler.length > 0 && (
          <AnaBolum baslik="Deneyim" ikon={<Briefcase className="h-3.5 w-3.5" strokeWidth={2.2} />}>
            <ol className="space-y-4">
              {deneyimler.map((d, i) => {
                const tur = siraliDeneyim[i]?.employmentType;
                return (
                  <li key={`${d.pozisyon}-${d.kurum}-${i}`} className="cv-oge">
                    <KayitBasi baslik={d.pozisyon} tarih={tarihAraligi(d)} />
                    <p className="mt-0.5 text-[12px]" style={{ color: LACIVERT }}>
                      {d.kurum}
                      {tur && CALISMA_TURU_ETIKET[tur] && <span className="text-gray-600"> · {CALISMA_TURU_ETIKET[tur]}</span>}
                    </p>
                    {d.aciklama && <Aciklama metin={d.aciklama} />}
                  </li>
                );
              })}
            </ol>
          </AnaBolum>
        )}

        {egitimler.length > 0 && (
          <AnaBolum baslik="Eğitim" ikon={<GraduationCap className="h-3.5 w-3.5" strokeWidth={2.2} />}>
            <ol className="space-y-3.5">
              {egitimler.map((e) => {
                const alt = [e.bolum, e.duzey].filter(Boolean).join(' · ');
                const not = notMetni(e.not);
                return (
                  <li key={e.id} className="cv-oge">
                    <KayitBasi baslik={e.okul || e.bolum} tarih={yilAraligi(e.bas, e.son, e.suruyor)} />
                    {e.okul && alt && <p className="mt-0.5 text-[12px]" style={{ color: LACIVERT }}>{alt}</p>}
                    {!e.okul && e.duzey && <p className="mt-0.5 text-[12px]" style={{ color: LACIVERT }}>{e.duzey}</p>}
                    {not && <p className="mt-0.5 text-[11.5px] text-gray-600">{not}</p>}
                  </li>
                );
              })}
            </ol>
          </AnaBolum>
        )}

        {projeler.length > 0 && (
          <AnaBolum baslik="Projeler" ikon={<FolderKanban className="h-3.5 w-3.5" strokeWidth={2.2} />}>
            <ol className="space-y-4">
              {projeler.map((p) => {
                const baglanti = p.liveUrl || p.githubUrl;
                return (
                  <li key={p.id} className="cv-oge">
                    <KayitBasi baslik={p.title} tarih={yilAraligi(p.startYear, p.endYear, Boolean(p.ongoing))} />
                    {p.description && <Aciklama metin={p.description} />}
                    {p.techStack.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-1">
                        {p.techStack.map((t) => (
                          <li key={t} className="rounded px-1.5 py-0.5 text-[10.5px] text-gray-700" style={{ background: YAN_ZEMIN }}>
                            {t}
                          </li>
                        ))}
                      </ul>
                    )}
                    {baglanti && (
                      <a
                        href={tamAdres(baglanti)}
                        className="mt-1 inline-flex items-center gap-1 break-all text-[11.5px] underline underline-offset-2"
                        style={{ color: LACIVERT }}
                      >
                        {adresMetni(baglanti)}
                        <ArrowUpRight aria-hidden className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          </AnaBolum>
        )}

        {sertifikalar.length > 0 && (
          <AnaBolum baslik="Sertifikalar" ikon={<Award className="h-3.5 w-3.5" strokeWidth={2.2} />}>
            <ol className="space-y-3">
              {sertifikalar.map((c) => (
                <li key={c.id} className="cv-oge">
                  <KayitBasi
                    baslik={c.name}
                    tarih={c.issueMonth ? ayMetni(ayAnahtari(c.issueYear, c.issueMonth)) : c.issueYear ? String(c.issueYear) : ''}
                  />
                  {c.issuer && <p className="mt-0.5 text-[12px]" style={{ color: LACIVERT }}>{c.issuer}</p>}
                  {c.url && (
                    <a
                      href={c.url}
                      className="mt-0.5 inline-flex items-center gap-1 break-all text-[11.5px] underline underline-offset-2"
                      style={{ color: LACIVERT }}
                    >
                      {adresMetni(c.url)}
                      <ArrowUpRight aria-hidden className="h-3 w-3 shrink-0" />
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </AnaBolum>
        )}
      </div>
    </Kap>
  );
});
CvBelgesi.displayName = 'CvBelgesi';


/**
 * CV ÖNİZLEMESİ — belgeyi kabın genişliğine sığacak kadar küçülten sarmalayıcı.
 * `kapSinifi` kabın iç boşluğunu verebilir; hesap iç boşluğu düşüyor.
 */
export const CvOnizleme: React.FC<{
  student: StudentProfile;
  fotografYolu?: string | null;
  anaIcerik?: boolean;
  kapSinifi?: string;
  etiket?: string;
  /** Önizleme bir resim gibi: içindeki bağlantılar odak ve tıklama almıyor. */
  etkilesimsiz?: boolean;
}> = ({ student, fotografYolu = null, anaIcerik = false, kapSinifi = '', etiket, etkilesimsiz = false }) => {
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

  return (
    <div ref={kapRef} className={`cv-kap w-full ${kapSinifi}`} inert={etkilesimsiz || undefined}>
      <div className="overflow-hidden" style={{ height: olcu.yukseklik ?? undefined }}>
        <CvBelgesi
          ref={kagitRef}
          student={student}
          fotografYolu={fotografYolu}
          anaIcerik={anaIcerik}
          etiket={etiket}
          stil={{ transform: olcu.olcek < 1 ? `scale(${olcu.olcek})` : undefined, transformOrigin: 'top left' }}
        />
      </div>
    </div>
  );
};

export const CvPage: React.FC<CvPageProps> = ({ student, onBack, fotografYolu = null }) => {
  useEffect(() => {
    document.title = `${student.fullName} — CV | StajımVar`;
  }, [student.fullName]);

  return (
    <div className="min-h-screen bg-gray-100 print:min-h-0 print:bg-transparent">
      <style>{`
        @media print {
          .yazdirma-disi { display: none !important; }
          /*
            İKİNCİ SAYFADA SOL SÜTUN: kâğıt içerik bitince bitiyor; uzun bir
            CV'nin ikinci sayfasında altı beyaz kalırdı. Kök zemin her
            sayfaya basılıyor: sol sütunun rengi orada da çiziliyor.
          */
          html {
            background: linear-gradient(to right, ${YAN_ZEMIN} ${SOL_SUTUN}px, #fff ${SOL_SUTUN}px) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body { background: transparent !important; }
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

      <CvOnizleme
        student={student}
        fotografYolu={fotografYolu}
        anaIcerik
        kapSinifi="mx-auto max-w-[794px] px-3 py-4 sm:px-0 sm:py-6"
      />
    </div>
  );
};
