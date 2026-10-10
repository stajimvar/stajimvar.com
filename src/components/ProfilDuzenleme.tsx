import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  AtSign,
  Award,
  Briefcase,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import type { SkillLevel, SkillQuiz, StudentExperience, StudentLanguage, StudentProfile, StudentProject, StudentSkill, CalismaTuru, EgitimDuzeyi } from '../types';
import { CvAlani } from './CvAlani';
import { AutocompleteField } from './AutocompleteField';
import { PredictiveInput } from './PredictiveInput';
import { adYazimi } from '../lib/ad';
import { ODAK_HALKASI } from '../lib/renk-token';
import { TR_CITIES, TR_DEPARTMENTS, TR_UNIVERSITIES } from '../data/turkeyData';
import { HARD_SKILLS_DICTIONARY, LANGUAGES_DICTIONARY } from '../data/skillsDictionary';
import { ILGI_ALANLARI, YETENEK_GRUPLARI } from '../data/cv-secenekleri';
import { EtiketSecici } from './profil/EtiketSecici';
import { EkEgitimler } from './profil/EkEgitimler';
import { Sertifikalar } from './profil/Sertifikalar';
import { CvGorunurluk } from './profil/CvGorunurluk';
import { CALISMA_TURU_ETIKET, EGITIM_DUZEYI_ETIKET } from './profil/form-siniflari';
import { HEDEF_POZISYONLAR } from '../lib/pozisyonlar.mjs';
import {
  ACIKLAMA_UZUNLUGU,
  AY_ADLARI,
  DENEYIM_SINIRI,
  deneyimHatasi,
  deneyimKaydi,
  deneyimSirasi,
  tarihAraligi,
} from '../lib/deneyim.mjs';
import {
  AYRILMA_SORUSU,
  kaydedilmemisAbone,
  kaydedilmemisIsaretle,
  kaydedilmemisKaydet,
  kaydedilmemisOnekVarMi,
  kaydedilmemisTemizle,
  kaydedilmemisVarMi,
} from '../lib/kaydedilmemis-degisiklik.mjs';

/**
 * PROFİLİNİ DÜZENLE — SADE TEK SÜTUN (6 Ekim 2026, onaylı tasarım)
 *
 * Önceki düzenleme ekranında solda büyük bir bölüm menüsü, sağda tek bir
 * bölümün formu ve her bölümün altında sosyal profil bloğu (fotoğraf,
 * kapak, kullanıcı adı) duruyordu. Artık:
 *
 *  · Tek içerik sütunu. Üstte fotoğraf kartı — fotoğraf yalnız burada.
 *  · Bölümler kısa özet satırları; dokununca açılıyor, birden fazlası
 *    aynı anda açık kalabiliyor (biri açılınca öteki kapanmıyor, yazılan
 *    bilgi kaybolmuyor).
 *  · Sırası: Temel bilgiler, Eğitim, Deneyim, Yetenekler ve diller,
 *    Projeler ve bağlantılar, CV. Altta ayrı bir grupta eşleşme
 *    tercihleri, testler ve sosyal profil (kapak, kullanıcı adı) — mevcut
 *    özellikler silinmedi, form akışının dışına alındı.
 *  · Tamamlanma sayacı ve doğrulama çağrıları bu ekranda yok.
 *
 * KAYDETME
 * --------
 * Formlar (temel, eğitim, deneyim, bağlantılar) kendi "Kaydet" düğmesiyle
 * yazılıyor; kaydedilmemiş bir taslak varken bölümü kapatmak, "Profilime
 * dön" ya da başka sayfaya geçmek SORMADAN kaybettirmiyor. Liste
 * öğeleri (program, beceri, dil, proje) eklendiği an kaydediliyor.
 *
 * Taslak deseni: `taslak === null` → ekranda kayıtlı değer. Yazınca
 * taslak doğuyor; kayıt başarılı olunca kayıtlı değer taslağa eşitleniyor
 * ve kirlilik kendiliğinden düşüyor, başarısız olursa (App eski hâle
 * döndürüyor) taslak yerinde kalıyor.
 *
 * İSTEĞE BAĞLI BÖLÜMLER: deneyim, proje, yetenek ve dil boş kalabilir;
 * hiçbiri kaydetmeyi, CV oluşturmayı ya da başvurmayı engellemiyor.
 */

export type DuzenlemeBolumu =
  | 'temel'
  | 'egitim'
  | 'deneyim'
  | 'yetenek'
  | 'proje'
  | 'sertifika'
  | 'cv'
  | 'tercih'
  | 'rozet'
  | 'sosyal';

interface Props {
  student: StudentProfile;
  /** App'teki kayıt; `false` dönerse kayıt başarısız (eski hâl geri yüklendi). */
  onUpdateProfile: (yama: Partial<StudentProfile>) => unknown;
  /** "Profilime dön" — kaydedilmemiş değişiklik sorusu bu bileşende. */
  onGeri: () => void;
  /** Açılışta açık bölüm (sayfanın başka yerinden gelinen bağlantı). */
  acilisBolumu?: DuzenlemeBolumu | null;
  /** Açılışta odaklanacak alanın kimliği (ör. 'universite'). */
  odakAlani?: string | null;
  /** Üstteki fotoğraf kartı (sosyal profilin fotoğraf parçası). */
  fotografKarti?: React.ReactNode;
  /** Sosyal profil satırının içeriği: kapak, kullanıcı adı, görünen ad, biyografi. */
  sosyalProfilDuzenleme?: React.ReactNode;
  /** "Profilimden CV oluştur": profildeki bilgilerle yazdırılabilir CV. */
  onCvOlustur?: () => void;
  quizzes?: SkillQuiz[];
  onStartQuiz?: (quiz: SkillQuiz) => void;
}

/* ------------------------------------------------------------------ */

const SEVIYELER: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const SEVIYE_ETIKET: Record<SkillLevel, string> = {
  Beginner: 'Temel',
  Intermediate: 'Orta',
  Advanced: 'İleri',
  Expert: 'Uzman',
};
/*
  "ANA DİL" (10 Ekim 2026): CEFR ölçeği yabancı diller için; ana dilini
  "C2" diye işaretlemek CV'de yanlış okunuyordu. Sunucuda kısıt yok,
  değer olduğu gibi saklanıyor.
*/
const DIL_SEVIYELERI = ['Ana dil', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const DIL_SEVIYE_METNI: Record<string, string> = {
  'Ana dil': 'Ana dil',
  A1: 'A1 · Başlangıç',
  A2: 'A2 · Temel',
  B1: 'B1 · Orta',
  B2: 'B2 · İleri',
  C1: 'C1 · Akıcı',
  C2: 'C2 · Anadil düzeyi',
};
const SINIFLAR: StudentProfile['gradeLevel'][] = ['1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', 'Yüksek Lisans / Mezun'];

const ALAN =
  'w-full min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-500 focus:border-blue-600 focus:outline-none sm:text-sm';
const ETIKET = 'mb-1.5 block text-sm font-semibold text-gray-900';
const IPUCU = 'mt-1 text-xs text-gray-600';
const HATA = 'mt-1 text-xs font-semibold text-rose-700';
const BIRINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${ODAK_HALKASI}`;
const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${ODAK_HALKASI}`;
const EKLE = `inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 ${ODAK_HALKASI}`;
const KUCUK_EYLEM = `inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${ODAK_HALKASI}`;

/* Eski "Ne arıyorsun?" bölümündeki ülke listesi — aynı kodlar, aynı sıra. */
const GLOBAL_COUNTRIES = [
  ['TR', 'Türkiye'], ['FR', 'Fransa'], ['DE', 'Almanya'], ['US', 'Amerika Birleşik Devletleri'],
  ['GB', 'Birleşik Krallık'], ['NL', 'Hollanda'], ['ES', 'İspanya'], ['IT', 'İtalya'],
] as const;

const buYil = new Date().getFullYear();
const YILLAR = Array.from({ length: 61 }, (_, i) => buYil + 1 - i);

const metinEsit = (a: string, b: string) => a.trim() === b.trim();

/* ------------------------------------------------------------------ */
/* Satır (açılır bölüm) — modül düzeyinde: içindeki girdiler her        */
/* çizimde sökülmesin.                                                  */
/* ------------------------------------------------------------------ */

const Satir: React.FC<{
  id: DuzenlemeBolumu;
  ikon: React.ReactNode;
  baslik: string;
  ozet: string;
  acik: boolean;
  onToggle: (id: DuzenlemeBolumu) => void;
  kirli?: boolean;
  children: React.ReactNode;
}> = ({ id, ikon, baslik, ozet, acik, onToggle, kirli = false, children }) => (
  <section id={`duzenle-${id}`} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white">
    <h2>
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={acik}
        aria-controls={`duzenle-${id}-icerik`}
        className={`flex w-full min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left sm:gap-4 sm:px-5 ${ODAK_HALKASI}`}
      >
        <span aria-hidden className="shrink-0 text-gray-900 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">
          {ikon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-base font-bold text-gray-900">
            {baslik}
            {kirli && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                Kaydedilmedi
              </span>
            )}
          </span>
          <span className="block truncate text-sm text-gray-600">{ozet}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={`h-5 w-5 shrink-0 text-gray-700 transition-transform ${acik ? 'rotate-180 text-blue-700' : ''}`}
        />
      </button>
    </h2>
    {acik && (
      <div id={`duzenle-${id}-icerik`} className="space-y-4 border-t border-gray-100 px-4 pb-5 pt-4 sm:px-5">
        {children}
      </div>
    )}
  </section>
);

/** Kaydet düğmesinin yanındaki durum satırı. */
const KayitDurumu: React.FC<{ durum: 'bos' | 'kaydediliyor' | 'kaydedildi' | 'hata' }> = ({ durum }) =>
  durum === 'kaydediliyor' ? (
    <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600">
      <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Kaydediliyor
    </span>
  ) : durum === 'kaydedildi' ? (
    <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
      <Check aria-hidden className="h-4 w-4" /> Kaydedildi
    </span>
  ) : durum === 'hata' ? (
    <span role="alert" className="text-sm font-semibold text-rose-700">
      Kaydedilemedi. Yazdıkların duruyor; yeniden dene.
    </span>
  ) : null;

/** Kirli bölüm kapatılmak istenince: kaydet ya da değişiklikleri at. */
const KirliUyari: React.FC<{ onKaydet: () => void; onAt: () => void; kaydedilebilir: boolean }> = ({
  onKaydet,
  onAt,
  kaydedilebilir,
}) => (
  <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
    {/* Telefonda metin kendi satırında, düğmeler altında; geniş ekranda tek satır. */}
    <p className="min-w-0 basis-full text-sm font-semibold text-amber-950 sm:basis-auto sm:flex-1">
      Bu bölümde kaydedilmemiş değişiklik var.
    </p>
    {kaydedilebilir && (
      <button type="button" onClick={onKaydet} className={BIRINCIL}>
        Kaydet
      </button>
    )}
    <button type="button" onClick={onAt} className={IKINCIL}>
      Değişiklikleri at
    </button>
  </div>
);

/** Ay + yıl seçimi; iki küçük seçim kutusu, tek etiket. */
const AyYil: React.FC<{
  idOnEki: string;
  etiket: string;
  ay: string;
  yil: string;
  onAy: (v: string) => void;
  onYil: (v: string) => void;
  disabled?: boolean;
  hatali?: boolean;
}> = ({ idOnEki, etiket, ay, yil, onAy, onYil, disabled = false, hatali = false }) => (
  <fieldset disabled={disabled} className="min-w-0 disabled:opacity-50">
    <legend className={ETIKET}>{etiket}</legend>
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
      <select
        id={`${idOnEki}-ay`}
        aria-label={`${etiket} ayı`}
        aria-invalid={hatali || undefined}
        value={ay}
        onChange={(e) => onAy(e.target.value)}
        className={ALAN}
      >
        <option value="">Ay</option>
        {AY_ADLARI.map((ad, i) => (
          <option key={ad} value={String(i + 1)}>
            {ad}
          </option>
        ))}
      </select>
      <select
        id={`${idOnEki}-yil`}
        aria-label={`${etiket} yılı`}
        aria-invalid={hatali || undefined}
        value={yil}
        onChange={(e) => onYil(e.target.value)}
        className={ALAN}
      >
        <option value="">Yıl</option>
        {YILLAR.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  </fieldset>
);

/* ------------------------------------------------------------------ */

interface DeneyimTaslagi {
  position: string;
  organization: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  ongoing: boolean;
  description: string;
  /** İsteğe bağlı (20261206010000); boş = belirtilmedi. */
  employmentType: string;
}

const bosDeneyim: DeneyimTaslagi = {
  position: '',
  organization: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  ongoing: false,
  description: '',
  employmentType: '',
};

const deneyimTaslagi = (d: StudentExperience): DeneyimTaslagi => ({
  position: d.position,
  organization: d.organization,
  startMonth: String(d.startMonth),
  startYear: String(d.startYear),
  endMonth: d.endMonth ? String(d.endMonth) : '',
  endYear: d.endYear ? String(d.endYear) : '',
  ongoing: d.ongoing,
  description: d.description ?? '',
  employmentType: d.employmentType ?? '',
});

const deneyimTaslakEsit = (a: DeneyimTaslagi, b: DeneyimTaslagi) =>
  metinEsit(a.position, b.position) &&
  metinEsit(a.organization, b.organization) &&
  a.startMonth === b.startMonth &&
  a.startYear === b.startYear &&
  a.ongoing === b.ongoing &&
  (a.ongoing || (a.endMonth === b.endMonth && a.endYear === b.endYear)) &&
  metinEsit(a.description, b.description) &&
  a.employmentType === b.employmentType;

/* GitHub alanı kullanıcı adı; tam adres yapıştırılırsa adı ayıklanıyor. */
const githubAdi = (deger: string) => {
  const t = deger.trim().replace(/\/+$/, '');
  const m = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i.exec(t);
  return (m ? m[1] : t).replace(/^@/, '');
};
const GITHUB_DESENI = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const adresGecerli = (deger: string) => {
  const t = deger.trim();
  if (!t) return true;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.');
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------------ */

export const ProfilDuzenleme: React.FC<Props> = ({
  student,
  onUpdateProfile,
  onGeri,
  acilisBolumu = null,
  odakAlani = null,
  fotografKarti,
  sosyalProfilDuzenleme,
  onCvOlustur,
  quizzes = [],
  onStartQuiz,
}) => {
  const [acik, setAcik] = useState<Set<DuzenlemeBolumu>>(
    () => new Set(acilisBolumu && acilisBolumu !== 'cv' ? [acilisBolumu] : []),
  );
  const [uyari, setUyari] = useState<DuzenlemeBolumu | null>(null);
  type Durum = 'bos' | 'kaydediliyor' | 'kaydedildi' | 'hata';
  const [durumlar, setDurumlar] = useState<Partial<Record<DuzenlemeBolumu, Durum>>>({});
  const durumYaz = (b: DuzenlemeBolumu, d: Durum) => {
    setDurumlar((o) => ({ ...o, [b]: d }));
    if (d === 'kaydedildi') {
      window.setTimeout(() => setDurumlar((o) => (o[b] === 'kaydedildi' ? { ...o, [b]: 'bos' } : o)), 2500);
    }
  };

  /* Kayıt: App `false` dönerse başarısız; başka her şey başarı. */
  const kaydet = async (bolum: DuzenlemeBolumu, yama: Partial<StudentProfile>): Promise<boolean> => {
    durumYaz(bolum, 'kaydediliyor');
    let sonuc: unknown;
    try {
      sonuc = await Promise.resolve(onUpdateProfile(yama));
    } catch {
      sonuc = false;
    }
    const tamam = sonuc !== false;
    durumYaz(bolum, tamam ? 'kaydedildi' : 'hata');
    return tamam;
  };

  /* Açılışta istenen alana odak ve bölüme kaydırma (bir kare sonra: bölüm o an çiziliyor). */
  useEffect(() => {
    if (!acilisBolumu) return;
    requestAnimationFrame(() => {
      document.getElementById(`duzenle-${acilisBolumu}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (odakAlani) document.getElementById(odakAlani)?.focus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================== TEMEL ============================== */
  const temelKayitli = useMemo(
    () => ({
      fullName: student.fullName ?? '',
      bio: student.bio ?? '',
      city: student.city ?? '',
      phone: student.phone ?? '',
    }),
    [student.fullName, student.bio, student.city, student.phone],
  );
  const [temelTaslak, setTemelTaslak] = useState<typeof temelKayitli | null>(null);
  const temel = temelTaslak ?? temelKayitli;
  const temelKirli =
    temelTaslak !== null &&
    !(Object.keys(temelKayitli) as (keyof typeof temelKayitli)[]).every((k) => metinEsit(temelTaslak[k], temelKayitli[k]));
  const [temelHata, setTemelHata] = useState<{ alan: string; mesaj: string } | null>(null);
  const temelDegis = (alan: keyof typeof temelKayitli, deger: string) => {
    setTemelTaslak({ ...temel, [alan]: deger });
    if (temelHata?.alan === alan) setTemelHata(null);
  };
  const temelKaydet = async () => {
    if (!temel.fullName.trim()) {
      setTemelHata({ alan: 'fullName', mesaj: 'Adını yaz: profilinde ve CV’nde bu ad görünüyor.' });
      document.getElementById('ad-soyad')?.focus();
      return;
    }
    const sehir = temel.city.trim();
    if (sehir && !TR_CITIES.includes(sehir)) {
      setTemelHata({ alan: 'city', mesaj: 'Listeden bir il seç.' });
      document.getElementById('sehir')?.focus();
      return;
    }
    setTemelHata(null);
    const tamam = await kaydet('temel', {
      fullName: temel.fullName.trim(),
      bio: temel.bio.trim(),
      city: sehir,
      phone: temel.phone.trim(),
    });
    if (tamam) setTemelTaslak(null);
  };

  /* ============================== EĞİTİM ============================= */
  /*
    EĞİTİM DÜZEYİ VE TARİHLER (20261206010000)

    `educationOngoing` boşsa (eski kayıt) sınıftan türetiliyor: "Yüksek
    Lisans / Mezun" bitmiş, diğerleri sürüyor. Değer metin olarak
    tutuluyor ('evet'/'hayir') ki kirli denetimi öteki alanlarla aynı
    karşılaştırmadan geçsin.
  */
  const egitimKayitli = useMemo(
    () => ({
      university: student.university ?? '',
      department: student.department ?? '',
      gradeLevel: (student.gradeLevel ?? '') as string,
      gpa: student.gpa ? String(student.gpa) : '',
      educationLevel: (student.educationLevel ?? '') as string,
      educationStartYear: student.educationStartYear ? String(student.educationStartYear) : '',
      ongoing:
        (student.educationOngoing ?? student.gradeLevel !== 'Yüksek Lisans / Mezun') ? 'evet' : 'hayir',
      graduationYear: student.graduationYear ? String(student.graduationYear) : '',
    }),
    [
      student.university,
      student.department,
      student.gradeLevel,
      student.gpa,
      student.educationLevel,
      student.educationStartYear,
      student.educationOngoing,
      student.graduationYear,
    ],
  );
  const [egitimTarihHatasi, setEgitimTarihHatasi] = useState(false);
  const [egitimTaslak, setEgitimTaslak] = useState<typeof egitimKayitli | null>(null);
  const egitim = egitimTaslak ?? egitimKayitli;
  const egitimKirli =
    egitimTaslak !== null &&
    !(Object.keys(egitimKayitli) as (keyof typeof egitimKayitli)[]).every((k) => metinEsit(egitimTaslak[k], egitimKayitli[k]));
  const [gpaHatasi, setGpaHatasi] = useState(false);
  const egitimDegis = (alan: keyof typeof egitimKayitli, deger: string) => {
    setEgitimTaslak({ ...egitim, [alan]: deger });
    if (alan === 'gpa') setGpaHatasi(false);
    if (alan === 'educationStartYear' || alan === 'graduationYear' || alan === 'ongoing') setEgitimTarihHatasi(false);
  };
  const egitimKaydet = async () => {
    const gpaMetni = egitim.gpa.trim().replace(',', '.');
    const gpa = gpaMetni ? Number(gpaMetni) : 0;
    if (gpaMetni && (!Number.isFinite(gpa) || gpa < 0 || gpa > 4)) {
      setGpaHatasi(true);
      document.getElementById('gpa')?.focus();
      return;
    }
    const suruyor = egitim.ongoing === 'evet';
    const basYil = egitim.educationStartYear ? Number(egitim.educationStartYear) : null;
    const mezuniyet = egitim.graduationYear ? Number(egitim.graduationYear) : null;
    if (!suruyor && basYil && mezuniyet && mezuniyet < basYil) {
      setEgitimTarihHatasi(true);
      document.getElementById('mezuniyet-yili')?.focus();
      return;
    }
    const tamam = await kaydet('egitim', {
      university: egitim.university.trim(),
      department: egitim.department.trim(),
      gradeLevel: egitim.gradeLevel as StudentProfile['gradeLevel'],
      gpa,
      educationLevel: (egitim.educationLevel || null) as EgitimDuzeyi | null,
      educationStartYear: basYil,
      educationOngoing: suruyor,
      /* Mezuniyet yılı yalnız bitmiş eğitimde yazılıyor; sürerken eski değer korunuyor. */
      ...(!suruyor && mezuniyet ? { graduationYear: mezuniyet } : {}),
    });
    if (tamam) setEgitimTaslak(null);
  };

  /* ============================= DENEYİM ============================= */
  const deneyimler = useMemo(() => student.experiences ?? [], [student.experiences]);
  const [deneyimFormu, setDeneyimFormu] = useState<{ id: string | null; ilk: DeneyimTaslagi; taslak: DeneyimTaslagi } | null>(
    null,
  );
  const [deneyimHata, setDeneyimHata] = useState<{ alan: string; mesaj: string } | null>(null);
  const [silinecekDeneyim, setSilinecekDeneyim] = useState<string | null>(null);
  const deneyimKirli = deneyimFormu !== null && !deneyimTaslakEsit(deneyimFormu.taslak, deneyimFormu.ilk);
  const deneyimDegis = (yama: Partial<DeneyimTaslagi>) => {
    if (!deneyimFormu) return;
    setDeneyimFormu({ ...deneyimFormu, taslak: { ...deneyimFormu.taslak, ...yama } });
    if (deneyimHata) setDeneyimHata(null);
  };
  const deneyimAc = (d: StudentExperience | null) => {
    const ilk = d ? deneyimTaslagi(d) : bosDeneyim;
    setDeneyimFormu({ id: d?.id ?? null, ilk, taslak: ilk });
    setDeneyimHata(null);
    setSilinecekDeneyim(null);
    requestAnimationFrame(() => document.getElementById('deneyim-pozisyon')?.focus());
  };
  const deneyimKaydet = async () => {
    if (!deneyimFormu) return;
    const t = deneyimFormu.taslak;
    const hata = deneyimHatasi(t);
    if (hata) {
      setDeneyimHata(hata);
      const odak = {
        pozisyon: 'deneyim-pozisyon',
        kurum: 'deneyim-kurum',
        baslangic: 'deneyim-bas-ay',
        bitis: 'deneyim-bit-ay',
        aciklama: 'deneyim-aciklama',
      }[hata.alan as 'pozisyon'];
      if (odak) document.getElementById(odak)?.focus();
      return;
    }
    const kayit: StudentExperience = {
      id: deneyimFormu.id ?? `deneyim-${Date.now()}`,
      position: t.position.trim(),
      organization: t.organization.trim(),
      startYear: Number(t.startYear),
      startMonth: Number(t.startMonth),
      endYear: t.ongoing ? null : Number(t.endYear),
      endMonth: t.ongoing ? null : Number(t.endMonth),
      ongoing: t.ongoing,
      description: t.description.trim(),
      employmentType: (t.employmentType || null) as CalismaTuru | null,
    };
    const yeniListe = (deneyimFormu.id
      ? deneyimler.map((d) => (d.id === deneyimFormu.id ? kayit : d))
      : [...deneyimler, kayit]
    ).slice().sort(deneyimSirasi);
    const tamam = await kaydet('deneyim', { experiences: yeniListe });
    if (tamam) setDeneyimFormu(null);
  };
  const deneyimSil = async (id: string) => {
    const tamam = await kaydet('deneyim', { experiences: deneyimler.filter((d) => d.id !== id) });
    if (tamam) setSilinecekDeneyim(null);
  };

  /* ===================== YETENEKLER VE DİLLER ======================== */
  const yetenekler = student.skills ?? [];
  const beceriler = student.softSkills ?? [];
  const diller = student.languages ?? [];
  const [yeniProgram, setYeniProgram] = useState('');
  const [yeniBeceri, setYeniBeceri] = useState('');
  const [dilFormu, setDilFormu] = useState<{ ad: string; seviye: string } | null>(null);
  const yetenekKirli = Boolean(yeniProgram.trim() || yeniBeceri.trim() || dilFormu?.ad.trim());

  const programEkle = (ad: string) => {
    const temiz = ad.trim();
    if (!temiz) return;
    if (yetenekler.some((s) => s.name.toLocaleLowerCase('tr') === temiz.toLocaleLowerCase('tr'))) {
      setYeniProgram('');
      return;
    }
    const yeni: StudentSkill = { name: temiz, category: 'General', level: 'Intermediate', verified: false };
    void kaydet('yetenek', { skills: [...yetenekler, yeni] });
    setYeniProgram('');
  };
  const programSeviye = (ad: string, seviye: SkillLevel) =>
    void kaydet('yetenek', { skills: yetenekler.map((s) => (s.name === ad ? { ...s, level: seviye } : s)) });
  const programSil = (ad: string) => void kaydet('yetenek', { skills: yetenekler.filter((s) => s.name !== ad) });

  const beceriEkle = (ad: string) => {
    const temiz = ad.trim();
    if (!temiz) return;
    if (!beceriler.some((b) => b.toLocaleLowerCase('tr') === temiz.toLocaleLowerCase('tr'))) {
      void kaydet('yetenek', { softSkills: [...beceriler, temiz] });
    }
    setYeniBeceri('');
  };
  const beceriSil = (ad: string) => void kaydet('yetenek', { softSkills: beceriler.filter((b) => b !== ad) });

  const dilEkle = () => {
    if (!dilFormu) return;
    const ad = dilFormu.ad.trim();
    if (!ad) return;
    if (diller.some((l) => l.language.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'))) {
      setDilFormu(null);
      return;
    }
    const kayit: StudentLanguage = {
      id: `lang-${Date.now()}`,
      language: ad,
      level: dilFormu.seviye,
      proficiencyText: DIL_SEVIYE_METNI[dilFormu.seviye] ?? dilFormu.seviye,
      verified: false,
    };
    void kaydet('yetenek', { languages: [...diller, kayit] });
    setDilFormu(null);
  };
  const dilSeviye = (id: string, seviye: string) =>
    void kaydet('yetenek', {
      languages: diller.map((l) => (l.id === id ? { ...l, level: seviye, proficiencyText: DIL_SEVIYE_METNI[seviye] ?? seviye } : l)),
    });
  const dilSil = (id: string) => void kaydet('yetenek', { languages: diller.filter((l) => l.id !== id) });
  /*
    ÇOKLU SEÇİM (10 Ekim 2026)

    Hazır etiketin türü verinin nereye yazılacağını söylüyor: 'program' →
    student_skills (seviyeli), 'beceri' → soft_skills. Listede olmayan bir
    etiket eklenirse geniş program sözlüğünde varsa program, yoksa beceri
    sayılıyor. Her dokunuş mevcut ekleme/silme işlevinden geçiyor, yani
    anında kaydediliyor ve tekrar engeli aynı.
  */
  const yetenekTurleri = useMemo(
    () => new Map(YETENEK_GRUPLARI.flatMap((g) => g.ogeler).map((o) => [o.ad.toLocaleLowerCase('tr-TR'), o.tur])),
    [],
  );
  const programSozlugu = useMemo(() => new Set(HARD_SKILLS_DICTIONARY.map((h) => h.toLocaleLowerCase('tr-TR'))), []);
  const seciliYetenekler = [...yetenekler.map((s) => s.name), ...beceriler];
  const hizliSec = (ad: string) => {
    const k = ad.toLocaleLowerCase('tr-TR');
    const tur = yetenekTurleri.get(k) ?? (programSozlugu.has(k) ? 'program' : 'beceri');
    if (tur === 'program') programEkle(ad);
    else beceriEkle(ad);
  };
  const hizliKaldir = (ad: string) => {
    if (yetenekler.some((s) => s.name === ad)) programSil(ad);
    else beceriSil(ad);
  };
  const yetenekGruplari = useMemo(
    () => YETENEK_GRUPLARI.map((g) => ({ baslik: g.baslik, ogeler: g.ogeler.map((o) => o.ad) })),
    [],
  );

  /* İLGİ ALANLARI — aynı seçici; sunucu en fazla 20 kabul ediyor. */
  const ilgiler = student.interests ?? [];
  const [ilgiSiniri, setIlgiSiniri] = useState(false);
  const ilgiSec = (ad: string) => {
    if (ilgiler.some((i) => i.toLocaleLowerCase('tr-TR') === ad.toLocaleLowerCase('tr-TR'))) return;
    if (ilgiler.length >= 20) {
      setIlgiSiniri(true);
      return;
    }
    void kaydet('yetenek', { interests: [...ilgiler, ad] });
  };
  const ilgiKaldir = (ad: string) => {
    setIlgiSiniri(false);
    void kaydet('yetenek', { interests: ilgiler.filter((i) => i !== ad) });
  };

  const yetenekBekleyenleriEkle = () => {
    if (yeniProgram.trim()) programEkle(yeniProgram);
    if (yeniBeceri.trim()) beceriEkle(yeniBeceri);
    if (dilFormu?.ad.trim()) dilEkle();
  };
  const yetenekBekleyenleriAt = () => {
    setYeniProgram('');
    setYeniBeceri('');
    setDilFormu(null);
  };

  /* ===================== PROJELER VE BAĞLANTILAR ===================== */
  const projeler = student.projects ?? [];
  /*
    PROJE FORMU — EKLEME VE DÜZENLEME (10 Ekim 2026)

    Önce yalnız ekleme vardı; yanlış yazılan bir proje silinip yeniden
    girilmek zorundaydı. `id` doluysa form o kaydı güncelliyor. Tarih
    alanları isteğe bağlı (20261206010000); boşsa CV'de tarih yazılmıyor.
  */
  type ProjeTaslagi = {
    id: string | null;
    baslik: string;
    aciklama: string;
    araclar: string;
    adres: string;
    basYil: string;
    sonYil: string;
    suruyor: boolean;
  };
  const bosProje: ProjeTaslagi = { id: null, baslik: '', aciklama: '', araclar: '', adres: '', basYil: '', sonYil: '', suruyor: false };
  const [projeFormu, setProjeFormu] = useState<ProjeTaslagi | null>(null);
  const [projeTarihHatasi, setProjeTarihHatasi] = useState(false);
  const [projeAdresHatasi, setProjeAdresHatasi] = useState(false);
  const [silinecekProje, setSilinecekProje] = useState<string | null>(null);
  const projeKirli = Boolean(
    projeFormu && (projeFormu.baslik.trim() || projeFormu.aciklama.trim() || projeFormu.araclar.trim() || projeFormu.adres.trim()),
  );
  const projeEkle = async () => {
    if (!projeFormu || !projeFormu.baslik.trim()) {
      document.getElementById('proje-baslik')?.focus();
      return;
    }
    if (!adresGecerli(projeFormu.adres)) {
      setProjeAdresHatasi(true);
      document.getElementById('proje-adres')?.focus();
      return;
    }
    const basYil = projeFormu.basYil ? Number(projeFormu.basYil) : null;
    const sonYil = projeFormu.suruyor ? null : projeFormu.sonYil ? Number(projeFormu.sonYil) : null;
    if (basYil && sonYil && sonYil < basYil) {
      setProjeTarihHatasi(true);
      document.getElementById('proje-son')?.focus();
      return;
    }
    const adres = projeFormu.adres.trim();
    const onceki = projeFormu.id ? projeler.find((p) => p.id === projeFormu.id) : undefined;
    const yeni: StudentProject = {
      id: projeFormu.id ?? `proj-${Date.now()}`,
      title: projeFormu.baslik.trim(),
      description: projeFormu.aciklama.trim(),
      techStack: projeFormu.araclar.split(',').map((t) => t.trim()).filter(Boolean),
      githubUrl: adres ? (/^https?:\/\//i.test(adres) ? adres : `https://${adres}`) : undefined,
      /* Düzenlemede canlı adres korunuyor; form tek bağlantı alanı gösteriyor. */
      liveUrl: adres ? undefined : onceki?.liveUrl,
      startYear: basYil,
      endYear: sonYil,
      ongoing: projeFormu.suruyor,
    };
    const yeniListe = projeFormu.id ? projeler.map((p) => (p.id === projeFormu.id ? yeni : p)) : [...projeler, yeni];
    const tamam = await kaydet('proje', { projects: yeniListe });
    if (tamam) {
      setProjeFormu(null);
      setProjeTarihHatasi(false);
    }
  };
  const projeSil = async (id: string) => {
    const tamam = await kaydet('proje', { projects: projeler.filter((p) => p.id !== id) });
    if (tamam) setSilinecekProje(null);
  };

  const baglantiKayitli = useMemo(
    () => ({
      linkedin: student.linkedinUrl ?? '',
      github: student.githubUsername ?? '',
      portfolyo: student.portfolioUrl ?? '',
    }),
    [student.linkedinUrl, student.githubUsername, student.portfolioUrl],
  );
  const [baglantiTaslak, setBaglantiTaslak] = useState<typeof baglantiKayitli | null>(null);
  const baglanti = baglantiTaslak ?? baglantiKayitli;
  const baglantiKirli =
    baglantiTaslak !== null &&
    !(Object.keys(baglantiKayitli) as (keyof typeof baglantiKayitli)[]).every((k) => metinEsit(baglantiTaslak[k], baglantiKayitli[k]));
  const [baglantiHata, setBaglantiHata] = useState<{ alan: string; mesaj: string } | null>(null);
  const baglantiKaydet = async () => {
    const github = githubAdi(baglanti.github);
    if (github && !GITHUB_DESENI.test(github)) {
      setBaglantiHata({ alan: 'github', mesaj: 'GitHub kullanıcı adını yaz (ör. ornekkullanici).' });
      document.getElementById('baglanti-github')?.focus();
      return;
    }
    for (const alan of ['linkedin', 'portfolyo'] as const) {
      if (!adresGecerli(baglanti[alan])) {
        setBaglantiHata({ alan, mesaj: 'Geçerli bir web adresi yaz (ör. linkedin.com/in/ad).' });
        document.getElementById(`baglanti-${alan}`)?.focus();
        return;
      }
    }
    setBaglantiHata(null);
    const tam = (t: string) => (t.trim() ? (/^https?:\/\//i.test(t.trim()) ? t.trim() : `https://${t.trim()}`) : '');
    const tamam = await kaydet('proje', {
      linkedinUrl: tam(baglanti.linkedin),
      githubUsername: github,
      portfolioUrl: tam(baglanti.portfolyo),
    });
    if (tamam) setBaglantiTaslak(null);
  };
  const projeBolumuKirli = projeKirli || baglantiKirli;

  /* ============================ TERCİHLER ============================ */
  const hedefler = student.targetRoles ?? [];
  const sehirler = student.preferences?.cities ?? [];
  const [tumHedefler, setTumHedefler] = useState(false);
  const hedefDegistir = (rol: string) =>
    void kaydet('tercih', {
      targetRoles: hedefler.includes(rol) ? hedefler.filter((r) => r !== rol) : [...hedefler, rol],
    });
  const tercihGuncelle = (yama: Partial<StudentProfile['preferences']>) =>
    void kaydet('tercih', { preferences: { ...student.preferences, ...yama } });

  /* ======================== KİRLİLİK VE GEZİNME ======================= */
  /*
    SOSYAL PROFİL FORMU kendi bileşeninde (SosyalProfilDuzenleme,
    KullaniciAdiDegistirme); kirliliğini ortak kayda 'sosyal:' önekiyle
    yazıyor. Bu ekran o kayda abone: satır kapatma, "Kaydedilmedi"
    işareti ve yenileme sorusu öteki bölümlerle aynı.
  */
  const sosyalKirli = useSyncExternalStore(
    kaydedilmemisAbone,
    () => kaydedilmemisOnekVarMi('sosyal:'),
    () => false,
  );
  const yerelKirli: Partial<Record<DuzenlemeBolumu, boolean>> = {
    temel: temelKirli,
    egitim: egitimKirli,
    deneyim: deneyimKirli,
    yetenek: yetenekKirli,
    proje: projeBolumuKirli,
  };
  const kirliHarita: Partial<Record<DuzenlemeBolumu, boolean>> = { ...yerelKirli, sosyal: sosyalKirli };
  const herhangiKirli = Object.values(kirliHarita).some(Boolean);

  /* Yalnız bu ekranın kendi formları buradan yazılıyor; sosyal form kendisi yazıyor. */
  useEffect(() => {
    for (const [b, k] of Object.entries(yerelKirli)) kaydedilmemisIsaretle(`profil:${b}`, Boolean(k));
  });
  useEffect(() => () => kaydedilmemisTemizle('profil:'), []);

  /* Sekme kapatma / yenileme: tarayıcının kendi sorusu. */
  useEffect(() => {
    if (!herhangiKirli) return;
    const dur = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', dur);
    return () => window.removeEventListener('beforeunload', dur);
  }, [herhangiKirli]);

  const bolumKaydet: Partial<Record<DuzenlemeBolumu, () => void>> = {
    temel: () => void temelKaydet(),
    egitim: () => void egitimKaydet(),
    deneyim: () => void deneyimKaydet(),
    yetenek: yetenekBekleyenleriEkle,
    proje: () => {
      if (baglantiKirli) void baglantiKaydet();
      if (projeKirli) void projeEkle();
    },
    /* Sosyal form kendi gönderimiyle kaydediliyor (kayıttaki geri çağrı). */
    sosyal: () => kaydedilmemisKaydet('sosyal:'),
  };
  const bolumAt: Partial<Record<DuzenlemeBolumu, () => void>> = {
    temel: () => {
      setTemelTaslak(null);
      setTemelHata(null);
    },
    egitim: () => {
      setEgitimTaslak(null);
      setGpaHatasi(false);
      setEgitimTarihHatasi(false);
    },
    deneyim: () => {
      setDeneyimFormu(null);
      setDeneyimHata(null);
    },
    yetenek: yetenekBekleyenleriAt,
    proje: () => {
      setProjeFormu(null);
      setBaglantiTaslak(null);
      setBaglantiHata(null);
      setProjeAdresHatasi(false);
    },
    /*
      Sosyal formun taslağı kendi bileşeninde: satır kapanınca bileşen
      sökülüyor, taslak atılıyor ve kayıt kendiliğinden siliniyor.
    */
    sosyal: () => kaydedilmemisTemizle('sosyal:'),
  };

  const toggle = (id: DuzenlemeBolumu) => {
    if (acik.has(id) && kirliHarita[id]) {
      /* Kirli bölüm sessizce kapanmıyor: önce kaydet ya da at. */
      setUyari(id);
      return;
    }
    const yeni = new Set(acik);
    if (yeni.has(id)) yeni.delete(id);
    else yeni.add(id);
    setAcik(yeni);
  };
  /* Uyarı, bölüm temizlenince kendiliğinden düşüyor. */
  useEffect(() => {
    if (uyari && !kirliHarita[uyari]) setUyari(null);
  });

  const geriDon = () => {
    if (kaydedilmemisVarMi() && !window.confirm(AYRILMA_SORUSU)) return;
    kaydedilmemisTemizle('profil:');
    onGeri();
  };

  const uyariSatiri = (id: DuzenlemeBolumu) =>
    uyari === id && kirliHarita[id] ? (
      <KirliUyari
        kaydedilebilir={Boolean(bolumKaydet[id])}
        onKaydet={() => bolumKaydet[id]?.()}
        onAt={() => {
          bolumAt[id]?.();
          setUyari(null);
          setAcik((o) => {
            const y = new Set(o);
            y.delete(id);
            return y;
          });
        }}
      />
    ) : null;

  /* ============================== ÖZETLER ============================= */
  const listeOzeti = (liste: string[], ek = 2) =>
    liste.slice(0, ek).join(', ') + (liste.length > ek ? ` +${liste.length - ek}` : '');
  const egitimOzeti = student.university || 'Okul, bölüm ve sınıf';
  const deneyimOzeti = deneyimler.length
    ? `${deneyimler.length} deneyim · ${listeOzeti(deneyimler.map((d) => d.position), 1)}`
    : 'İş, staj veya gönüllü çalışmalarını ekleyebilirsin.';
  const yetenekSayisi = yetenekler.length + beceriler.length + diller.length;
  const yetenekOzeti = yetenekSayisi
    ? listeOzeti([...yetenekler.map((s) => s.name), ...beceriler, ...diller.map((l) => l.language)], 3)
    : 'Programlar, beceriler ve bildiğin diller';
  const projeOzeti = projeler.length ? `${projeler.length} proje · ${listeOzeti(projeler.map((p) => p.title), 1)}` : 'Çalışmaların ve portfolyon';

  /* ============================== ÇİZİM =============================== */
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 pb-16">
      <button
        type="button"
        onClick={geriDon}
        className={`-ml-1 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-blue-700 hover:underline ${ODAK_HALKASI}`}
      >
        <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
        Profilime dön
      </button>

      <header className="pb-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Profilini düzenle</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">Kendini anlat, bilgilerini istediğin zaman güncelle.</p>
      </header>

      {fotografKarti}

      {/* ----------------------------- TEMEL ----------------------------- */}
      <Satir
        id="temel"
        ikon={<User />}
        baslik="Temel bilgiler"
        ozet="Ad, hakkında ve iletişim"
        acik={acik.has('temel')}
        onToggle={toggle}
        kirli={temelKirli}
      >
        {uyariSatiri('temel')}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void temelKaydet();
          }}
          className="space-y-4"
        >
          <div>
            <label className={ETIKET} htmlFor="ad-soyad">
              Ad Soyad
            </label>
            <input
              id="ad-soyad"
              type="text"
              autoComplete="name"
              aria-invalid={temelHata?.alan === 'fullName' || undefined}
              value={temel.fullName}
              onChange={(e) => temelDegis('fullName', e.target.value)}
              className={ALAN}
            />
            {temelHata?.alan === 'fullName' && (
              <p role="alert" className={HATA}>
                {temelHata.mesaj}
              </p>
            )}
            {temel.fullName.trim() && adYazimi(temel.fullName) !== temel.fullName.trim() && (
              <button
                type="button"
                onClick={() => temelDegis('fullName', adYazimi(temel.fullName))}
                className={`mt-1 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline ${ODAK_HALKASI}`}
              >
                <Check aria-hidden className="h-4 w-4" />
                {adYazimi(temel.fullName)} olarak yaz
              </button>
            )}
          </div>

          <div>
            <label className={ETIKET} htmlFor="bio">
              Hakkında
            </label>
            <textarea
              id="bio"
              rows={3}
              maxLength={600}
              value={temel.bio}
              onChange={(e) => temelDegis('bio', e.target.value)}
              placeholder="Bir iki cümleyle kendini anlat."
              className={`${ALAN} py-2.5`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ETIKET} htmlFor="sehir">
                Şehir
              </label>
              <AutocompleteField
                id="sehir"
                value={temel.city}
                onChange={(v) => temelDegis('city', v)}
                options={TR_CITIES}
                placeholder="Yaşadığın il"
                className={ALAN}
                klavyeDuzeni
              />
              {temelHata?.alan === 'city' && (
                <p role="alert" className={HATA}>
                  {temelHata.mesaj}
                </p>
              )}
            </div>
            <div>
              <label className={ETIKET} htmlFor="telefon">
                Telefon
              </label>
              <input
                id="telefon"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={temel.phone}
                onChange={(e) => temelDegis('phone', e.target.value)}
                placeholder="05XX XXX XX XX"
                className={ALAN}
              />
            </div>
          </div>

          <div>
            <span className={ETIKET}>E-posta</span>
            <p className="min-h-11 break-all rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
              {student.email || '—'}
            </p>
          </div>
          <p className={IPUCU}>
            Telefon ve e-posta herkese açık profilinde görünmez; yalnız başvurduğun ilanın şirketiyle, sen izin
            verirsen paylaşılır.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={durumlar.temel === 'kaydediliyor'} className={BIRINCIL}>
              Kaydet
            </button>
            {temelKirli && (
              <button type="button" onClick={bolumAt.temel} className={IKINCIL}>
                Vazgeç
              </button>
            )}
            <KayitDurumu durum={durumlar.temel ?? 'bos'} />
          </div>
        </form>
      </Satir>

      {/* ----------------------------- EĞİTİM ---------------------------- */}
      <Satir
        id="egitim"
        ikon={<GraduationCap />}
        baslik="Eğitim"
        ozet={egitimOzeti}
        acik={acik.has('egitim')}
        onToggle={toggle}
        kirli={egitimKirli}
      >
        {uyariSatiri('egitim')}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void egitimKaydet();
          }}
          className="space-y-4"
        >
          <div>
            <label className={ETIKET} htmlFor="universite">
              Okul
            </label>
            <AutocompleteField
              id="universite"
              value={egitim.university}
              onChange={(v) => egitimDegis('university', v)}
              options={TR_UNIVERSITIES}
              placeholder="Yazmaya başla, listeden seç"
              className={ALAN}
              klavyeDuzeni
            />
          </div>
          <div>
            <label className={ETIKET} htmlFor="bolum">
              Bölüm
            </label>
            <AutocompleteField
              id="bolum"
              value={egitim.department}
              onChange={(v) => egitimDegis('department', v)}
              options={TR_DEPARTMENTS}
              placeholder="Ön lisans ve lisans programları"
              className={ALAN}
              klavyeDuzeni
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={ETIKET} htmlFor="sinif">
                Sınıf veya mezuniyet
              </label>
              <select
                id="sinif"
                value={egitim.gradeLevel}
                onChange={(e) => egitimDegis('gradeLevel', e.target.value)}
                className={ALAN}
              >
                {SINIFLAR.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ETIKET} htmlFor="gpa">
                Not ortalaması <span className="font-normal text-gray-600">(isteğe bağlı)</span>
              </label>
              <input
                id="gpa"
                type="text"
                inputMode="decimal"
                aria-invalid={gpaHatasi || undefined}
                value={egitim.gpa}
                onChange={(e) => egitimDegis('gpa', e.target.value)}
                placeholder="3,10"
                className={ALAN}
              />
              {gpaHatasi && (
                <p role="alert" className={HATA}>
                  0 ile 4 arasında bir değer yaz.
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={ETIKET} htmlFor="egitim-duzeyi">
                Eğitim düzeyi
              </label>
              <select
                id="egitim-duzeyi"
                value={egitim.educationLevel}
                onChange={(e) => egitimDegis('educationLevel', e.target.value)}
                className={ALAN}
              >
                <option value="">Seç</option>
                {Object.entries(EGITIM_DUZEYI_ETIKET).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ETIKET} htmlFor="baslangic-yili">
                Başlangıç yılı
              </label>
              <select
                id="baslangic-yili"
                value={egitim.educationStartYear}
                onChange={(e) => egitimDegis('educationStartYear', e.target.value)}
                className={ALAN}
              >
                <option value="">Seç</option>
                {YILLAR.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 items-end gap-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={egitim.ongoing === 'evet'}
                onChange={(e) => egitimDegis('ongoing', e.target.checked ? 'evet' : 'hayir')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              Devam ediyorum
            </label>
            <div>
              <label className={ETIKET} htmlFor="mezuniyet-yili">
                Mezuniyet yılı
              </label>
              <select
                id="mezuniyet-yili"
                value={egitim.ongoing === 'evet' ? '' : egitim.graduationYear}
                disabled={egitim.ongoing === 'evet'}
                onChange={(e) => egitimDegis('graduationYear', e.target.value)}
                aria-invalid={egitimTarihHatasi || undefined}
                className={`${ALAN} disabled:bg-gray-100 disabled:text-gray-500`}
              >
                <option value="">{egitim.ongoing === 'evet' ? 'Devam ediyor' : 'Seç'}</option>
                {YILLAR.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {egitimTarihHatasi && (
                <p role="alert" className={HATA}>
                  Mezuniyet yılı başlangıçtan önce olamaz.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={durumlar.egitim === 'kaydediliyor'} className={BIRINCIL}>
              Kaydet
            </button>
            {egitimKirli && (
              <button type="button" onClick={bolumAt.egitim} className={IKINCIL}>
                Vazgeç
              </button>
            )}
            <KayitDurumu durum={durumlar.egitim ?? 'bos'} />
          </div>
        </form>
        <div className="mt-6 border-t border-gray-100 pt-5">
          <EkEgitimler
            kayitlar={student.educations ?? []}
            onKaydet={(yeni) => kaydet('egitim', { educations: yeni })}
            kilitli={durumlar.egitim === 'kaydediliyor'}
          />
        </div>
      </Satir>

      {/* ----------------------------- DENEYİM --------------------------- */}
      <Satir
        id="deneyim"
        ikon={<Briefcase />}
        baslik="Deneyim"
        ozet={deneyimOzeti}
        acik={acik.has('deneyim')}
        onToggle={toggle}
        kirli={deneyimKirli}
      >
        {uyariSatiri('deneyim')}

        {deneyimler.length > 0 && (
          <ul className="space-y-2">
            {deneyimler.map((d) => {
              const kayit = deneyimKaydi(d);
              const duzenleniyor = deneyimFormu?.id === d.id;
              return (
                <li key={d.id} className={`rounded-xl border p-3 ${duzenleniyor ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-gray-900">{d.position}</p>
                      <p className="break-words text-sm text-gray-700">
                        {d.organization}
                        {kayit && <span className="text-gray-600"> · {tarihAraligi(kayit)}</span>}
                      </p>
                      {d.description && (
                        <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-sm text-gray-600">{d.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0">
                      <button
                        type="button"
                        onClick={() => deneyimAc(d)}
                        className={KUCUK_EYLEM}
                        aria-label={`${d.position} deneyimini düzenle`}
                      >
                        <Pencil aria-hidden className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSilinecekDeneyim(d.id)}
                        className={`${KUCUK_EYLEM} hover:text-rose-700`}
                        aria-label={`${d.position} deneyimini kaldır`}
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {silinecekDeneyim === d.id && (
                    <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 p-2.5">
                      <p className="min-w-0 flex-1 text-sm font-semibold text-rose-900">Bu deneyim kaldırılsın mı?</p>
                      <button
                        type="button"
                        onClick={() => void deneyimSil(d.id)}
                        disabled={durumlar.deneyim === 'kaydediliyor'}
                        className={`${IKINCIL} border-rose-300 text-rose-800`}
                      >
                        Kaldır
                      </button>
                      <button type="button" onClick={() => setSilinecekDeneyim(null)} className={IKINCIL}>
                        Vazgeç
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {deneyimFormu ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void deneyimKaydet();
            }}
            className="space-y-4"
            aria-label={deneyimFormu.id ? 'Deneyimi düzenle' : 'Yeni deneyim'}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={ETIKET} htmlFor="deneyim-pozisyon">
                  Pozisyon
                </label>
                <input
                  id="deneyim-pozisyon"
                  type="text"
                  maxLength={120}
                  aria-invalid={deneyimHata?.alan === 'pozisyon' || undefined}
                  value={deneyimFormu.taslak.position}
                  onChange={(e) => deneyimDegis({ position: e.target.value })}
                  placeholder="Örn. Tasarım stajyeri"
                  className={ALAN}
                />
              </div>
              <div>
                <label className={ETIKET} htmlFor="deneyim-kurum">
                  Kurum
                </label>
                <input
                  id="deneyim-kurum"
                  type="text"
                  maxLength={120}
                  aria-invalid={deneyimHata?.alan === 'kurum' || undefined}
                  value={deneyimFormu.taslak.organization}
                  onChange={(e) => deneyimDegis({ organization: e.target.value })}
                  placeholder="Şirket veya kurum adı"
                  className={ALAN}
                />
              </div>
            </div>
            <div className="sm:w-1/2">
              <label className={ETIKET} htmlFor="deneyim-tur">
                Çalışma türü <span className="font-normal text-gray-600">(isteğe bağlı)</span>
              </label>
              <select
                id="deneyim-tur"
                value={deneyimFormu.taslak.employmentType}
                onChange={(e) => deneyimDegis({ employmentType: e.target.value })}
                className={ALAN}
              >
                <option value="">Seç</option>
                {Object.entries(CALISMA_TURU_ETIKET).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <AyYil
                idOnEki="deneyim-bas"
                etiket="Başlangıç"
                ay={deneyimFormu.taslak.startMonth}
                yil={deneyimFormu.taslak.startYear}
                onAy={(v) => deneyimDegis({ startMonth: v })}
                onYil={(v) => deneyimDegis({ startYear: v })}
                hatali={deneyimHata?.alan === 'baslangic'}
              />
              <AyYil
                idOnEki="deneyim-bit"
                etiket="Bitiş"
                ay={deneyimFormu.taslak.ongoing ? '' : deneyimFormu.taslak.endMonth}
                yil={deneyimFormu.taslak.ongoing ? '' : deneyimFormu.taslak.endYear}
                onAy={(v) => deneyimDegis({ endMonth: v })}
                onYil={(v) => deneyimDegis({ endYear: v })}
                disabled={deneyimFormu.taslak.ongoing}
                hatali={deneyimHata?.alan === 'bitis'}
              />
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-gray-900">
                <input
                  type="checkbox"
                  checked={deneyimFormu.taslak.ongoing}
                  onChange={(e) =>
                    deneyimDegis(
                      e.target.checked ? { ongoing: true, endMonth: '', endYear: '' } : { ongoing: false },
                    )
                  }
                  className="h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 accent-blue-600"
                />
                Devam ediyorum
              </label>
            </div>
            <div>
              <label className={ETIKET} htmlFor="deneyim-aciklama">
                Kısaca ne yaptın? <span className="font-normal text-gray-600">(isteğe bağlı)</span>
              </label>
              <textarea
                id="deneyim-aciklama"
                rows={3}
                maxLength={ACIKLAMA_UZUNLUGU}
                value={deneyimFormu.taslak.description}
                onChange={(e) => deneyimDegis({ description: e.target.value })}
                placeholder="Görevlerini ve katkılarını birkaç cümleyle anlat."
                className={`${ALAN} py-2.5`}
              />
            </div>
            {deneyimHata && (
              <p role="alert" className={HATA}>
                {deneyimHata.mesaj}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={durumlar.deneyim === 'kaydediliyor'} className={BIRINCIL}>
                Deneyimi kaydet
              </button>
              <button type="button" onClick={bolumAt.deneyim} className={IKINCIL}>
                Vazgeç
              </button>
              <KayitDurumu durum={durumlar.deneyim ?? 'bos'} />
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {deneyimler.length < DENEYIM_SINIRI && (
              <button type="button" onClick={() => deneyimAc(null)} className={EKLE}>
                <Plus aria-hidden className="h-4 w-4" /> Deneyim ekle
              </button>
            )}
            {deneyimler.length === 0 && <p className={IPUCU}>Deneyimin yoksa bu bölümü boş bırakabilirsin.</p>}
            {deneyimler.length >= DENEYIM_SINIRI && (
              <p className={IPUCU}>En fazla {DENEYIM_SINIRI} deneyim eklenebilir; yenisi için birini kaldır.</p>
            )}
            <KayitDurumu durum={durumlar.deneyim ?? 'bos'} />
          </div>
        )}
      </Satir>

      {/* ---------------------- YETENEKLER VE DİLLER --------------------- */}
      <Satir
        id="yetenek"
        ikon={<ChartNoAxesColumnIncreasing />}
        baslik="Yetenekler ve diller"
        ozet={yetenekOzeti}
        acik={acik.has('yetenek')}
        onToggle={toggle}
        kirli={yetenekKirli}
      >
        {uyariSatiri('yetenek')}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-900">Yetenekler</h3>
          <p className={IPUCU}>
            Dokunarak seç ya da kaldır; listede olmayanı arama kutusuna yazıp ekle. Seçimin hemen kaydediliyor.
          </p>
          <EtiketSecici
            kimlik="yetenek-sec"
            gruplar={yetenekGruplari}
            secili={seciliYetenekler}
            onSec={hizliSec}
            onKaldir={hizliKaldir}
            aramaYeri="Yetenek ara ya da ekle"
            kilitli={durumlar.yetenek === 'kaydediliyor'}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-900">Programlar ve seviyeleri</h3>
          {yetenekler.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {yetenekler.map((s) => (
                <li
                  key={s.name}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-1 text-sm"
                >
                  <span className="font-semibold text-gray-900">{s.name}</span>
                  {s.verified && <CheckCircle2 aria-label="Doğrulandı" className="h-4 w-4 text-emerald-600" />}
                  <select
                    aria-label={`${s.name} seviyesi`}
                    value={s.level}
                    onChange={(e) => programSeviye(s.name, e.target.value as SkillLevel)}
                    className={`min-h-9 cursor-pointer rounded-lg border border-gray-200 bg-white px-1.5 text-xs font-semibold text-gray-700 ${ODAK_HALKASI}`}
                  >
                    {SEVIYELER.map((sv) => (
                      <option key={sv} value={sv}>
                        {SEVIYE_ETIKET[sv]}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => programSil(s.name)} aria-label={`${s.name} kaldır`} className={KUCUK_EYLEM}>
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <PredictiveInput
            id="program-ekle"
            value={yeniProgram}
            onChange={setYeniProgram}
            onSubmit={programEkle}
            dictionary={HARD_SKILLS_DICTIONARY}
            excludeList={yetenekler.map((s) => s.name)}
            placeholder="Program ekle (Excel, Figma, Python…)"
            buttonText="Ekle"
            accentColor="blue"
          />
        </div>

        {/*
          "BECERİLER" GİRİŞİ KALKTI (10 Ekim 2026): kişisel beceriler artık
          üstteki çoklu seçiciden ekleniyor ve kaldırılıyor. Aynı listeyi
          iki ayrı kontrolle yönetmek, iki farklı davranış demekti.
        */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-900">İlgi alanları</h3>
          <p className={IPUCU}>CV'nin sol sütununda görünür. İstersen CV ayarlarından gizleyebilirsin.</p>
          <EtiketSecici
            kimlik="ilgi-sec"
            gruplar={[{ baslik: 'Öneriler', ogeler: ILGI_ALANLARI }]}
            secili={ilgiler}
            onSec={ilgiSec}
            onKaldir={ilgiKaldir}
            aramaYeri="İlgi alanı ara ya da ekle"
            kilitli={durumlar.yetenek === 'kaydediliyor'}
          />
          {ilgiSiniri && <p className={HATA}>En fazla 20 ilgi alanı ekleyebilirsin.</p>}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-900">Diller</h3>
          {diller.length > 0 && (
            <ul className="space-y-2">
              {diller.map((l) => (
                <li key={l.id} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                    {l.language}
                    {l.verified && <CheckCircle2 aria-label="Doğrulandı" className="ml-1 inline h-4 w-4 text-emerald-600" />}
                  </span>
                  <select
                    aria-label={`${l.language} seviyesi`}
                    value={DIL_SEVIYELERI.includes(l.level) ? l.level : ''}
                    onChange={(e) => dilSeviye(l.id, e.target.value)}
                    className={`min-h-11 cursor-pointer rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 ${ODAK_HALKASI}`}
                  >
                    {!DIL_SEVIYELERI.includes(l.level) && <option value="">{l.level || 'Seviye seç'}</option>}
                    {DIL_SEVIYELERI.map((sv) => (
                      <option key={sv} value={sv}>
                        {DIL_SEVIYE_METNI[sv]}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => dilSil(l.id)} aria-label={`${l.language} kaldır`} className={KUCUK_EYLEM}>
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {dilFormu ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                dilEkle();
              }}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
            >
              <input
                id="dil-adi"
                list="dil-onerileri"
                value={dilFormu.ad}
                onChange={(e) => setDilFormu({ ...dilFormu, ad: e.target.value })}
                placeholder="Dil (İngilizce, Almanca…)"
                aria-label="Dil"
                className={ALAN}
              />
              <datalist id="dil-onerileri">
                {LANGUAGES_DICTIONARY.filter((d) => !diller.some((l) => l.language === d.name)).map((d) => (
                  <option key={d.name} value={d.name} />
                ))}
              </datalist>
              <select
                aria-label="Dil seviyesi"
                value={dilFormu.seviye}
                onChange={(e) => setDilFormu({ ...dilFormu, seviye: e.target.value })}
                className={ALAN}
              >
                {DIL_SEVIYELERI.map((sv) => (
                  <option key={sv} value={sv}>
                    {DIL_SEVIYE_METNI[sv]}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={!dilFormu.ad.trim()} className={BIRINCIL}>
                Ekle
              </button>
              <button type="button" onClick={() => setDilFormu(null)} className={IKINCIL}>
                Vazgeç
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDilFormu({ ad: '', seviye: 'B1' });
                requestAnimationFrame(() => document.getElementById('dil-adi')?.focus());
              }}
              className={EKLE}
            >
              <Plus aria-hidden className="h-4 w-4" /> Dil ekle
            </button>
          )}
        </div>
        <KayitDurumu durum={durumlar.yetenek ?? 'bos'} />
      </Satir>

      {/* -------------------- PROJELER VE BAĞLANTILAR -------------------- */}
      <Satir
        id="proje"
        ikon={<Link2 />}
        baslik="Projeler ve bağlantılar"
        ozet={projeOzeti}
        acik={acik.has('proje')}
        onToggle={toggle}
        kirli={projeBolumuKirli}
      >
        {uyariSatiri('proje')}

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-900">Projeler</h3>
          {projeler.length > 0 && (
            <ul className="space-y-2">
              {projeler.map((p) => (
                <li key={p.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 break-words text-sm font-bold text-gray-900">
                        {p.title}
                        {(p.liveUrl || p.githubUrl) && (
                          <a
                            href={p.liveUrl || p.githubUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={`${p.title} bağlantısını aç`}
                            className="text-gray-500 hover:text-blue-700"
                          >
                            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </p>
                      {p.description && <p className="mt-0.5 break-words text-sm text-gray-600">{p.description}</p>}
                      {p.techStack.length > 0 && <p className="mt-0.5 text-xs text-gray-600">{p.techStack.join(' · ')}</p>}
                      {(p.startYear || p.ongoing) && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {[p.startYear, p.ongoing ? 'Devam ediyor' : p.endYear].filter(Boolean).join(' – ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProjeFormu({
                          id: p.id,
                          baslik: p.title,
                          aciklama: p.description,
                          araclar: p.techStack.join(', '),
                          adres: p.githubUrl || p.liveUrl || '',
                          basYil: p.startYear ? String(p.startYear) : '',
                          sonYil: p.endYear ? String(p.endYear) : '',
                          suruyor: Boolean(p.ongoing),
                        });
                        setProjeTarihHatasi(false);
                        requestAnimationFrame(() => document.getElementById('proje-baslik')?.focus());
                      }}
                      aria-label={`${p.title} projesini düzenle`}
                      className={KUCUK_EYLEM}
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSilinecekProje(p.id)}
                      aria-label={`${p.title} projesini kaldır`}
                      className={`${KUCUK_EYLEM} hover:text-rose-700`}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                  {silinecekProje === p.id && (
                    <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 p-2.5">
                      <p className="min-w-0 flex-1 text-sm font-semibold text-rose-900">Bu proje kaldırılsın mı?</p>
                      <button type="button" onClick={() => void projeSil(p.id)} className={`${IKINCIL} border-rose-300 text-rose-800`}>
                        Kaldır
                      </button>
                      <button type="button" onClick={() => setSilinecekProje(null)} className={IKINCIL}>
                        Vazgeç
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {projeFormu ? (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void projeEkle();
              }}
              className="space-y-3 rounded-xl border border-gray-200 p-3"
              aria-label={projeFormu.id ? 'Projeyi düzenle' : 'Yeni proje'}
            >
              <div>
                <label className={ETIKET} htmlFor="proje-baslik">
                  Proje adı
                </label>
                <input
                  id="proje-baslik"
                  value={projeFormu.baslik}
                  onChange={(e) => setProjeFormu({ ...projeFormu, baslik: e.target.value })}
                  placeholder="Örn. Bitirme projesi — su tasarrufu sensörü"
                  className={ALAN}
                />
              </div>
              <div>
                <label className={ETIKET} htmlFor="proje-aciklama">
                  Kısaca anlat <span className="font-normal text-gray-600">(isteğe bağlı)</span>
                </label>
                <textarea
                  id="proje-aciklama"
                  rows={2}
                  value={projeFormu.aciklama}
                  onChange={(e) => setProjeFormu({ ...projeFormu, aciklama: e.target.value })}
                  className={`${ALAN} py-2.5`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={ETIKET} htmlFor="proje-araclar">
                    Kullandığın araçlar <span className="font-normal text-gray-600">(virgülle)</span>
                  </label>
                  <input
                    id="proje-araclar"
                    value={projeFormu.araclar}
                    onChange={(e) => setProjeFormu({ ...projeFormu, araclar: e.target.value })}
                    placeholder="Arduino, SolidWorks"
                    className={ALAN}
                  />
                </div>
                <div>
                  <label className={ETIKET} htmlFor="proje-adres">
                    Bağlantı <span className="font-normal text-gray-600">(isteğe bağlı)</span>
                  </label>
                  <input
                    id="proje-adres"
                    type="url"
                    inputMode="url"
                    aria-invalid={projeAdresHatasi || undefined}
                    value={projeFormu.adres}
                    onChange={(e) => {
                      setProjeFormu({ ...projeFormu, adres: e.target.value });
                      setProjeAdresHatasi(false);
                    }}
                    placeholder="github.com/kullanici/proje"
                    className={ALAN}
                  />
                  {projeAdresHatasi && (
                    <p role="alert" className={HATA}>
                      Geçerli bir web adresi yaz.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <label className={ETIKET} htmlFor="proje-bas">
                    Başlangıç yılı <span className="font-normal text-gray-600">(isteğe bağlı)</span>
                  </label>
                  <select
                    id="proje-bas"
                    value={projeFormu.basYil}
                    onChange={(e) => {
                      setProjeFormu({ ...projeFormu, basYil: e.target.value });
                      setProjeTarihHatasi(false);
                    }}
                    className={ALAN}
                  >
                    <option value="">Seç</option>
                    {YILLAR.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={ETIKET} htmlFor="proje-son">
                    Bitiş yılı
                  </label>
                  <select
                    id="proje-son"
                    value={projeFormu.suruyor ? '' : projeFormu.sonYil}
                    disabled={projeFormu.suruyor}
                    aria-invalid={projeTarihHatasi || undefined}
                    onChange={(e) => {
                      setProjeFormu({ ...projeFormu, sonYil: e.target.value });
                      setProjeTarihHatasi(false);
                    }}
                    className={`${ALAN} disabled:bg-gray-100 disabled:text-gray-500`}
                  >
                    <option value="">{projeFormu.suruyor ? 'Devam ediyor' : 'Seç'}</option>
                    {YILLAR.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-gray-900">
                  <input
                    type="checkbox"
                    checked={projeFormu.suruyor}
                    onChange={(e) => {
                      setProjeFormu({ ...projeFormu, suruyor: e.target.checked });
                      setProjeTarihHatasi(false);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  Devam ediyor
                </label>
              </div>
              {projeTarihHatasi && (
                <p role="alert" className={HATA}>
                  Bitiş yılı başlangıçtan önce olamaz.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={!projeFormu.baslik.trim() || durumlar.proje === 'kaydediliyor'} className={BIRINCIL}>
                  {projeFormu.id ? 'Projeyi güncelle' : 'Projeyi ekle'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProjeFormu(null);
                    setProjeAdresHatasi(false);
                    setProjeTarihHatasi(false);
                  }}
                  className={IKINCIL}
                >
                  Vazgeç
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setProjeFormu(bosProje);
                requestAnimationFrame(() => document.getElementById('proje-baslik')?.focus());
              }}
              className={EKLE}
            >
              <Plus aria-hidden className="h-4 w-4" /> Proje ekle
            </button>
          )}
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void baglantiKaydet();
          }}
          className="space-y-3 border-t border-gray-100 pt-4"
          aria-labelledby="baglantilar-basligi"
        >
          <h3 id="baglantilar-basligi" className="text-sm font-bold text-gray-900">
            Bağlantılar
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['linkedin', 'LinkedIn', 'linkedin.com/in/ad', 'url'],
                ['github', 'GitHub kullanıcı adı', 'kullaniciadi', 'text'],
                ['portfolyo', 'Portfolyo', 'ornek.com', 'url'],
              ] as const
            ).map(([alan, etiket, yer, tip]) => (
              <div key={alan}>
                <label className={ETIKET} htmlFor={`baglanti-${alan}`}>
                  {etiket}
                </label>
                <input
                  id={`baglanti-${alan}`}
                  type={tip}
                  inputMode={tip === 'url' ? 'url' : undefined}
                  aria-invalid={baglantiHata?.alan === alan || undefined}
                  value={baglanti[alan]}
                  onChange={(e) => {
                    setBaglantiTaslak({ ...baglanti, [alan]: e.target.value });
                    if (baglantiHata?.alan === alan) setBaglantiHata(null);
                  }}
                  placeholder={yer}
                  className={ALAN}
                />
                {baglantiHata?.alan === alan && (
                  <p role="alert" className={HATA}>
                    {baglantiHata.mesaj}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!baglantiKirli || durumlar.proje === 'kaydediliyor'} className={BIRINCIL}>
              Bağlantıları kaydet
            </button>
            {baglantiKirli && (
              <button
                type="button"
                onClick={() => {
                  setBaglantiTaslak(null);
                  setBaglantiHata(null);
                }}
                className={IKINCIL}
              >
                Vazgeç
              </button>
            )}
            <KayitDurumu durum={durumlar.proje ?? 'bos'} />
          </div>
        </form>
      </Satir>

      {/* --------------------------- SERTİFİKALAR ------------------------- */}
      <Satir
        id="sertifika"
        ikon={<Award />}
        baslik="Sertifikalar"
        ozet={
          (student.certificates ?? []).length
            ? `${(student.certificates ?? []).length} sertifika · ${listeOzeti((student.certificates ?? []).map((c) => c.name), 1)}`
            : 'Aldığın eğitim ve sertifikalar'
        }
        acik={acik.has('sertifika')}
        onToggle={toggle}
        kirli={false}
      >
        <Sertifikalar
          kayitlar={student.certificates ?? []}
          onKaydet={(yeni) => kaydet('sertifika', { certificates: yeni })}
          kilitli={durumlar.sertifika === 'kaydediliyor'}
        />
        <div className="mt-3">
          <KayitDurumu durum={durumlar.sertifika ?? 'bos'} />
        </div>
      </Satir>

      {/* ------------------------------- CV ------------------------------ */}
      <section id="duzenle-cv" aria-labelledby="duzenle-cv-baslik" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span aria-hidden className="shrink-0 text-gray-900">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="duzenle-cv-baslik" className="text-base font-bold text-gray-900">
              CV
            </h2>
            <p className="text-sm text-gray-600">
              {student.cvPath ? 'Yüklediğin PDF başvurularına eklenir.' : 'PDF yükle ya da profilinden oluştur.'}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={() => document.getElementById('cv-dosya-girdisi')?.click()}
              className={`${IKINCIL} border-blue-200 px-3 text-blue-700`}
            >
              <Upload aria-hidden className="h-4 w-4 shrink-0" />
              {student.cvPath ? 'Yeni PDF yükle' : 'PDF yükle'}
            </button>
            {onCvOlustur && (
              <button type="button" onClick={onCvOlustur} className={`${IKINCIL} border-blue-200 px-3 text-blue-700`}>
                <FileText aria-hidden className="h-4 w-4 shrink-0" />
                Profilimden CV oluştur
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 empty:mt-0">
          <CvAlani
            kompakt
            girdiId="cv-dosya-girdisi"
            userId={student.id}
            cvPath={student.cvPath}
            onDegisti={async (yeniYol) => {
              const tamam = await kaydet('cv', { cvPath: yeniYol ?? '' });
              if (!tamam) throw new Error('CV kaydedilemedi.');
            }}
          />
        </div>
        {/*
          CV'DE NELER GÖRÜNSÜN (20261206010000)

          Gizlenen bilgi profilden SİLİNMİYOR; yalnız StajımVar'ın
          oluşturduğu CV'de basılmıyor. Yüklenen PDF'e dokunulmuyor.
        */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <CvGorunurluk
            student={student}
            onDegis={(gizli) => kaydet('cv', { cvGizli: gizli })}
            kilitli={durumlar.cv === 'kaydediliyor'}
          />
        </div>
      </section>

      {/* --------------------------- DİĞER AYARLAR ------------------------ */}
      <h2 className="px-1 pt-5 text-sm font-bold uppercase tracking-wide text-gray-600">Diğer ayarlar</h2>

      <Satir
        id="tercih"
        ikon={<Target />}
        baslik="Ne arıyorsun?"
        ozet={
          hedefler.length || sehirler.length
            ? [listeOzeti(hedefler, 2), sehirler.join(', ')].filter(Boolean).join(' · ')
            : 'Hedef pozisyon ve şehir — eşleşmeler buna göre'
        }
        acik={acik.has('tercih')}
        onToggle={toggle}
      >
        <div>
          <span className={ETIKET}>Aradığın pozisyon</span>
          {hedefler.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {hedefler.map((rol) => (
                <li
                  key={rol}
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 pl-3 pr-1 text-sm font-semibold text-blue-900"
                >
                  {rol}
                  <button type="button" onClick={() => hedefDegistir(rol)} aria-label={`${rol} kaldır`} className={KUCUK_EYLEM}>
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(tumHedefler ? HEDEF_POZISYONLAR : HEDEF_POZISYONLAR.slice(0, 8))
              .filter((r: string) => !hedefler.includes(r))
              .map((rol: string) => (
                <button key={rol} type="button" onClick={() => hedefDegistir(rol)} className={EKLE}>
                  <Plus aria-hidden className="h-3.5 w-3.5" />
                  {rol}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setTumHedefler((v) => !v)}
              className={`min-h-11 cursor-pointer px-2 text-sm font-bold text-blue-700 ${ODAK_HALKASI}`}
            >
              {tumHedefler ? 'Daha az göster' : 'Tümünü göster'}
            </button>
          </div>
        </div>

        <div>
          <span className={ETIKET}>Çalışmak istediğin şehirler</span>
          {sehirler.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {sehirler.map((sehir) => (
                <li
                  key={sehir}
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 pl-3 pr-1 text-sm font-semibold text-blue-900"
                >
                  {sehir}
                  <button
                    type="button"
                    onClick={() => tercihGuncelle({ cities: sehirler.filter((c) => c !== sehir) })}
                    aria-label={`${sehir} kaldır`}
                    className={KUCUK_EYLEM}
                  >
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <select
            value=""
            aria-label="Şehir ekle"
            onChange={(e) => {
              const secilen = e.target.value;
              if (secilen && !sehirler.includes(secilen)) tercihGuncelle({ cities: [...sehirler, secilen] });
            }}
            className={ALAN}
          >
            <option value="">+ Şehir ekle</option>
            {TR_CITIES.filter((c) => !sehirler.includes(c)).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={ETIKET} htmlFor="calisma-sekli">
              Çalışma şekli
            </label>
            <select
              id="calisma-sekli"
              value={student.preferences.workType}
              onChange={(e) => tercihGuncelle({ workType: e.target.value as StudentProfile['preferences']['workType'] })}
              className={ALAN}
            >
              <option value="Any">Farketmez</option>
              <option value="On-site">Ofiste</option>
              <option value="Hybrid">Hibrit</option>
              <option value="Remote">Uzaktan</option>
            </select>
          </div>
          <div>
            <label className={ETIKET} htmlFor="staj-turu">
              Staj türü
            </label>
            <select
              id="staj-turu"
              value={student.preferences.type}
              onChange={(e) => tercihGuncelle({ type: e.target.value as StudentProfile['preferences']['type'] })}
              className={ALAN}
            >
              <option value="Summer Mandatory">Yaz dönemi zorunlu staj</option>
              <option value="Long-term">Uzun dönem (dönem içi)</option>
              <option value="Voluntary">Gönüllü staj</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={ETIKET} htmlFor="arayuz-dili">
              Arayüz dili
            </label>
            <select
              id="arayuz-dili"
              value={student.interfaceLanguage ?? ''}
              onChange={(e) => void kaydet('tercih', { interfaceLanguage: e.target.value || undefined })}
              className={ALAN}
            >
              <option value="">Tarayıcı dilini kullan</option>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div>
            <label className={ETIKET} htmlFor="staj-ulkesi">
              Staj aradığın ülkeler
            </label>
            <select
              id="staj-ulkesi"
              value=""
              onChange={(e) => {
                const kod = e.target.value;
                const mevcut = student.preferredJobCountries ?? [];
                if (kod && !mevcut.includes(kod)) void kaydet('tercih', { preferredJobCountries: [...mevcut, kod] });
              }}
              className={ALAN}
            >
              <option value="">+ Ülke ekle</option>
              {GLOBAL_COUNTRIES.filter(([kod]) => !(student.preferredJobCountries ?? []).includes(kod)).map(([kod, ad]) => (
                <option key={kod} value={kod}>
                  {ad}
                </option>
              ))}
            </select>
          </div>
          {(student.preferredJobCountries ?? []).length > 0 && (
            <ul className="flex flex-wrap gap-2 sm:col-span-2">
              {(student.preferredJobCountries ?? []).map((kod, i) => (
                <li
                  key={kod}
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 pl-3 pr-1 text-sm font-semibold text-blue-900"
                >
                  {i + 1}. {GLOBAL_COUNTRIES.find((x) => x[0] === kod)?.[1] ?? kod}
                  <button
                    type="button"
                    aria-label={`${kod} tercihini kaldır`}
                    onClick={() =>
                      void kaydet('tercih', {
                        preferredJobCountries: (student.preferredJobCountries ?? []).filter((x) => x !== kod),
                      })
                    }
                    className={KUCUK_EYLEM}
                  >
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className={`${IPUCU} sm:col-span-2`}>
            İlk ülke varsayılan keşif ülken olur. İlan ekranında geçici ülke değiştirmek bu listeyi değiştirmez.
          </p>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-emerald-700" />
            Sigortamı üniversite karşılıyor
          </span>
          <input
            type="checkbox"
            checked={student.preferences.mandatoryInsuranceProvidedByUni}
            onChange={(e) => tercihGuncelle({ mandatoryInsuranceProvidedByUni: e.target.checked })}
            className="h-5 w-5 shrink-0 accent-blue-600"
          />
        </label>
        <KayitDurumu durum={durumlar.tercih ?? 'bos'} />
      </Satir>

      {quizzes.length > 0 && (
        <Satir
          id="rozet"
          ikon={<Award />}
          baslik="Testler"
          ozet={
            student.earnedBadges?.length
              ? `${student.earnedBadges.length} rozet kazandın`
              : 'İstersen kısa testlerle yeteneğini doğrula'
          }
          acik={acik.has('rozet')}
          onToggle={toggle}
        >
          {(student.earnedBadges ?? []).length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {(student.earnedBadges ?? []).map((b) => (
                <li
                  key={b}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-900"
                >
                  <CheckCircle2 aria-hidden className="h-4 w-4" />
                  {/* Rozet adı şirket ekranıyla aynı biçimde (aday-profil-farki.mjs `rozetEtiketi`). */}
                  {b.replace(/^(badge|quiz)-/, '')}
                </li>
              ))}
            </ul>
          )}
          <ul className="divide-y divide-gray-100">
            {quizzes.map((quiz) => {
              const kazanildi = (student.earnedBadges ?? []).includes(quiz.badgeName);
              return (
                <li key={quiz.id}>
                  <button
                    type="button"
                    onClick={() => onStartQuiz?.(quiz)}
                    className={`-mx-2 flex w-full min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-blue-50/60 ${ODAK_HALKASI}`}
                  >
                    {kazanildi ? (
                      <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Award aria-hidden className="h-5 w-5 shrink-0 text-blue-600" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{quiz.skillName}</span>
                      <span className="block text-xs text-gray-600">
                        {kazanildi ? 'Rozet kazanıldı · tekrar çözebilirsin' : `${quiz.questions.length} soru · ~5 dk`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Satir>
      )}

      {sosyalProfilDuzenleme && (
        <Satir
          id="sosyal"
          ikon={<AtSign />}
          baslik="Sosyal profil"
          ozet="Kullanıcı adı, görünen ad, biyografi ve kapak"
          acik={acik.has('sosyal')}
          onToggle={toggle}
          kirli={sosyalKirli}
        >
          {uyariSatiri('sosyal')}
          {sosyalProfilDuzenleme}
        </Satir>
      )}
    </div>
  );
};
