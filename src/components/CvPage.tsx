import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Code2,
  Globe,
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
import { deneyimKopyasi, deneyimSirasi, tarihAraligi } from '../lib/deneyim.mjs';

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
  YAZI TİPİ: SİSTEM SANS (7 Ekim 2026)

  Lila şablon kalın, geometrik bir sans ile basılıyor. Web fontu
  yüklenmiyor: site CSP'si `font-src 'self'` ve yazdırma anında inmemiş bir
  font PDF'e yedek fontla geçerdi. Sistem ailesi her platformda var ve
  Türkçe karakterleri taşıyor (Windows'ta Segoe UI, Apple'da SF, Android'de
  Roboto).
*/
const SANS = {
  fontFamily: '"Segoe UI", ui-sans-serif, system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

/** A4'ün 96 dpi'deki genişliği (210 mm). */
const A4_GENISLIK = 794;

/*
  RENKLER — kullanıcının verdiği lila referans şablondan (7 Ekim 2026).
  Metin koyu mürekkep; lila zeminin üstünde kontrast ≈15:1. Fotoğraf
  çerçevesi biraz daha koyu lila (`border-[#D6CCF4]`).
*/
const LILA = '#E6E0F8';
const GRI_ZEMIN = '#F6F6F8';
const MUREKKEP = '#1A1726';

/** Adresin okunur hâli: protokol ve sondaki eğik çizgi atılıyor. */
const adresMetni = (adres: string) => adres.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const tamAdres = (adres: string) => (/^https?:\/\//i.test(adres) ? adres : `https://${adres}`);

/** Sol sütun bölüm başlığı: lila hap içinde kalın büyük harf. */
const AnaBolum: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="cv-bolum">
    <h2
      className="mb-4 w-[78%] rounded-full px-6 py-2 text-[19px] font-extrabold uppercase tracking-[0.06em]"
      style={{ background: LILA, color: MUREKKEP }}
    >
      {baslik}
    </h2>
    <div className="px-2">{children}</div>
  </section>
);

/** Sağ sütun bölüm başlığı: hapsız, kalın büyük harf. */
const YanBolum: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="cv-bolum">
    <h2 className="mb-3 text-[19px] font-extrabold uppercase tracking-[0.06em]" style={{ color: MUREKKEP }}>
      {baslik}
    </h2>
    {children}
  </section>
);

/** Madde işaretli kısa liste (beceriler, diller). */
const Maddeler: React.FC<{ ogeler: { anahtar: string; metin: React.ReactNode }[] }> = ({ ogeler }) => (
  <ul className="space-y-2 text-[13px] leading-snug text-gray-800">
    {ogeler.map((o) => (
      <li key={o.anahtar} className="cv-oge flex gap-2.5">
        <span aria-hidden className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: MUREKKEP }} />
        <span className="min-w-0">{o.metin}</span>
      </li>
    ))}
  </ul>
);

/*
  YAZDIRILABİLİR CV — LİLA ŞABLON (7 Ekim 2026, kullanıcının verdiği
  referans tasarıma uyarlandı; önceki lacivert şablonun yerini aldı)

  Sol geniş sütun: üstte lila şeritte büyük harfli ad ve unvan (bölüm);
  altında açık gri zeminde lila haplı bölümler — deneyim, eğitim, projeler,
  aradığı pozisyonlar. Sağ dar sütun: köşeleri yuvarlak lila çerçeveli
  fotoğraf, ardından beyaz zeminde iletişim, hakkımda, beceriler, kişisel
  beceriler ve diller. Kâğıdın altında ince lila şerit.

  HER ŞEY PROFİLDEN: boş alanın bölümü çizilmiyor. Referanstaki
  "Sertifikalar" ve "Referanslar" bölümleri profilde karşılığı olan bir
  alan olmadığı için YOK — örnek metin ya da uydurma kayıt konmuyor.
  Mezuniyet yılı da yazılmıyor: boşsa okuyucu onu "gelecek yıl" diye
  dolduruyor (queries/mappers), gerçek bir bilgi değil.

  Yazdırmada sayfa kenar boşluğu sıfır: zeminler kâğıdın kenarına kadar
  gidiyor; renkler `print-color-adjust: exact` ile basılıyor. Ekranda da
  aynı A4 kâğıdı gösteriliyor, dar ekranda küçültülerek.
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
  const yetenekler = student.skills ?? [];
  const diller = student.languages ?? [];
  const projeler = student.projects ?? [];
  const sosyal = student.softSkills ?? [];
  const hedefler = student.targetRoles ?? [];
  /* Deneyimler kopya biçiminde (pozisyon, kurum, tarih aralığı); en yenisi üstte. */
  const deneyimler = deneyimKopyasi([...(student.experiences ?? [])].sort(deneyimSirasi));
  /* Eğitim bilgisi yoksa bölüm çizilmiyor: "Belirtilmemiş" yazan bir başlık CV'de boşluk demekti. */
  const egitimVar = Boolean(student.university || student.department);

  /*
    KONUM OTURDUĞU İL: önce `preferences.cities` (staj yapmak istediği
    şehirler) yazılıyordu ve CV'de "yaşadığı yer" gibi okunuyordu.
  */
  const ikonSinifi = 'h-3.5 w-3.5 text-white';
  const iletisim: { anahtar: string; ikon: React.ReactNode; metin: string; href?: string }[] = [
    ...(student.phone
      ? [{ anahtar: 'telefon', ikon: <Phone className={ikonSinifi} strokeWidth={2.2} />, metin: student.phone, href: `tel:${student.phone.replace(/\s/g, '')}` }]
      : []),
    ...(student.email
      ? [{ anahtar: 'eposta', ikon: <Mail className={ikonSinifi} strokeWidth={2.2} />, metin: student.email, href: `mailto:${student.email}` }]
      : []),
    ...(student.city ? [{ anahtar: 'konum', ikon: <MapPin className={ikonSinifi} strokeWidth={2.2} />, metin: student.city }] : []),
    ...(student.portfolioUrl
      ? [{ anahtar: 'portfolyo', ikon: <Globe className={ikonSinifi} strokeWidth={2.2} />, metin: adresMetni(student.portfolioUrl), href: tamAdres(student.portfolioUrl) }]
      : []),
    ...(student.linkedinUrl
      ? [{ anahtar: 'linkedin', ikon: <Link2 className={ikonSinifi} strokeWidth={2.2} />, metin: adresMetni(student.linkedinUrl), href: tamAdres(student.linkedinUrl) }]
      : []),
    ...(student.githubUsername
      ? [{ anahtar: 'github', ikon: <Code2 className={ikonSinifi} strokeWidth={2.2} />, metin: `github.com/${student.githubUsername}`, href: `https://github.com/${student.githubUsername}` }]
      : []),
  ];

  const fotografVar = Boolean(fotografYolu || student.avatarUrl);
  const ad = adYazimi(student.fullName).toLocaleUpperCase('tr-TR');
  /* Uzun adlar büyük harfte taşmasın: harf sayısına göre ölçü küçülüyor. */
  const adOlcusu = ad.length > 24 ? 'text-[30px]' : ad.length > 16 ? 'text-[34px]' : 'text-[40px]';
  /* Unvan satırı: bölüm. Sınıf eğitim bölümünde yazıyor. */
  const unvan = student.department ? student.department.toLocaleUpperCase('tr-TR') : null;
  const egitimAlt = [student.gradeLevel, student.gpa ? `Not ortalaması: ${student.gpa}` : null].filter(Boolean).join(' · ');

  return (
    <Kap
      ref={kagitRef}
      className="cv-kagit flex min-h-[297mm] w-[794px] flex-col overflow-hidden pb-4 shadow-md"
      style={{ ...SANS, background: LILA, color: MUREKKEP, ...stil }}
      aria-label={etiket}
    >
      <div className="grid flex-1 grid-cols-[61%_39%]">
        {/* ---------------- Sol sütun: ad şeridi + lila haplı bölümler ---------------- */}
        <div className="flex min-w-0 flex-col">
          <header className="px-12 pb-10 pt-16">
            <h1 className={`break-words font-extrabold leading-[1.08] tracking-[0.03em] ${adOlcusu}`}>{ad}</h1>
            {unvan && (
              <p className="mt-2 break-words text-[22px] font-light leading-snug tracking-[0.08em]">{unvan}</p>
            )}
          </header>

          <div className="cv-sutun flex flex-1 flex-col gap-8 px-10 pb-8 pt-9" style={{ background: GRI_ZEMIN }}>
            {/* DENEYİM (20261205010000): yalnız girilmişse; boş başlık yok. */}
            {deneyimler.length > 0 && (
              <AnaBolum baslik="Deneyim">
                <ol className="space-y-4">
                  {deneyimler.map((d, i) => (
                    <li key={`${d.pozisyon}-${d.kurum}-${i}`} className="cv-oge">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.04em]">{d.pozisyon}</p>
                      <p className="mt-0.5 text-[13px] text-gray-700">
                        {d.kurum}
                        {tarihAraligi(d) && <span> - {tarihAraligi(d)}</span>}
                      </p>
                      {d.aciklama && (
                        <p className="mt-1.5 whitespace-pre-line pl-3 text-[13px] leading-relaxed text-gray-700">{d.aciklama}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </AnaBolum>
            )}

            {egitimVar && (
              <AnaBolum baslik="Eğitim">
                <div className="cv-oge space-y-1 text-[13px] text-gray-700">
                  {student.university && (
                    <p className="font-semibold uppercase tracking-[0.04em]" style={{ color: MUREKKEP }}>
                      {student.university}
                    </p>
                  )}
                  {student.department && <p>{student.department}</p>}
                  {egitimAlt && <p>{egitimAlt}</p>}
                </div>
              </AnaBolum>
            )}

            {projeler.length > 0 && (
              <AnaBolum baslik="Projeler">
                <ol className="space-y-4">
                  {projeler.map((p) => {
                    const baglanti = p.liveUrl || p.githubUrl;
                    return (
                      <li key={p.id} className="cv-oge">
                        <p className="text-[13px] font-semibold uppercase tracking-[0.04em]">{p.title}</p>
                        {p.techStack.length > 0 && (
                          <p className="mt-0.5 text-[13px] text-gray-700">{p.techStack.join(' · ')}</p>
                        )}
                        {p.description && (
                          <p className="mt-1.5 pl-3 text-[13px] leading-relaxed text-gray-700">{p.description}</p>
                        )}
                        {baglanti && (
                          <a
                            href={tamAdres(baglanti)}
                            className="mt-1 inline-flex items-center gap-1 pl-3 text-[13px] underline underline-offset-2"
                          >
                            {adresMetni(baglanti)}
                            <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </AnaBolum>
            )}

            {hedefler.length > 0 && (
              <AnaBolum baslik="Aradığım pozisyonlar">
                <ul className="space-y-1.5 text-[13px] text-gray-700">
                  {hedefler.map((h) => (
                    <li key={h} className="cv-oge">
                      {h}
                    </li>
                  ))}
                </ul>
              </AnaBolum>
            )}

            <p className="mt-auto pt-2 text-[11px] text-gray-500">StajımVar profilinden oluşturuldu.</p>
          </div>
        </div>

        {/* ---------------- Sağ sütun: fotoğraf + beyaz kart ---------------- */}
        <aside className="cv-sutun mr-4 mt-4 flex min-w-0 flex-col gap-6 rounded-t-[30px] bg-white pb-6">
          {fotografVar ? (
            <ProfilFotografi
              ad={student.fullName}
              yol={fotografYolu}
              yedekAdres={student.avatarUrl || null}
              className="aspect-square w-full shrink-0 rounded-[30px] border-[6px] border-[#D6CCF4] text-5xl"
            />
          ) : (
            <span aria-hidden className="h-4" />
          )}

          <div className="flex flex-col gap-6 px-7">
            {iletisim.length > 0 && (
              <YanBolum baslik="İletişim">
                <ul className="space-y-2 text-[13px] text-gray-800">
                  {iletisim.map((o) => (
                    <li key={o.anahtar} className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{ background: MUREKKEP }}
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
              </YanBolum>
            )}

            {student.bio && (
              <YanBolum baslik="Hakkımda">
                <p className="text-[13px] leading-relaxed text-gray-800">{student.bio}</p>
              </YanBolum>
            )}

            {yetenekler.length > 0 && (
              <YanBolum baslik="Beceriler">
                <Maddeler
                  ogeler={yetenekler.map((y) => ({
                    anahtar: y.name,
                    metin: (
                      <span className="inline-flex flex-wrap items-center gap-x-1.5">
                        <span>{y.name}</span>
                        <span className="text-gray-500">· {SEVIYE[y.level] ?? y.level}</span>
                        {/* Doğrulanmış yetkinlik: testi sunucu puanladı. */}
                        {y.verified && <BadgeCheck aria-label="Doğrulandı" className="h-3.5 w-3.5 text-violet-600" />}
                      </span>
                    ),
                  }))}
                />
              </YanBolum>
            )}

            {sosyal.length > 0 && (
              <YanBolum baslik="Kişisel beceriler">
                <Maddeler ogeler={sosyal.map((s) => ({ anahtar: s, metin: s }))} />
              </YanBolum>
            )}

            {diller.length > 0 && (
              <YanBolum baslik="Diller">
                <Maddeler
                  ogeler={diller.map((d) => ({
                    anahtar: d.id,
                    metin: [d.language, d.level || d.proficiencyText].filter(Boolean).join(' '),
                  }))}
                />
              </YanBolum>
            )}
          </div>

          {/* StajımVar imzası: sütunun dibinde, sitenin logosuyla aynı yazı. */}
          <p className="mt-auto px-7 pt-2 text-center text-base font-extrabold tracking-tight text-gray-400">
            Stajım<span className="text-violet-400">Var</span>
          </p>
        </aside>
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

      <CvOnizleme
        student={student}
        fotografYolu={fotografYolu}
        anaIcerik
        kapSinifi="mx-auto max-w-[794px] px-3 py-4 sm:px-0 sm:py-6"
      />
    </div>
  );
};
