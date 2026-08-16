import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  StudentProfile,
  StudentSkill,
  StudentProject,
  StudentLanguage,
  SkillLevel,
} from '../types';
import { uploadAvatar } from '../lib/queries';
import { TR_UNIVERSITIES, TR_DEPARTMENTS, TR_CITIES } from '../data/turkeyData';
import { Avatar } from './Avatar';
import { AutocompleteField } from './AutocompleteField';
import { PredictiveInput } from './PredictiveInput';
import {
  HARD_SKILLS_DICTIONARY,
  SOFT_SKILLS_DICTIONARY,
  LANGUAGES_DICTIONARY,
} from '../data/skillsDictionary';

/**
 * Öğrenci profili / CV alanı.
 *
 * Önceki hali tek sayfada yan yana açık 6 büyük kart, dört ayrı vurgu rengi ve
 * her başlığın altında iki satır açıklama içeriyordu; telefonda ekranı doldurup
 * göz yoruyordu. Artık:
 *
 *  - Her bölüm kapalı başlar, tek dokunuşla açılır (aynı anda bir tanesi açık).
 *  - Kapalıyken ne yazdığın özet satırında görünür, açmaya gerek kalmaz.
 *  - Tek vurgu rengi var; yeşil yalnızca "tamamlandı" demek için kullanılıyor.
 *  - Doluluk çubuğu bir sonraki adımı söyler, dokununca o bölümü açar.
 *
 * ÖNEMLİ: Burada hiçbir alan varsayılan örnek veriyle doldurulmaz. Eskiden dil
 * listesi boşken profile İngilizce/Almanca/Rusça yazılmış gibi görünüyordu —
 * kullanıcı hiç girmediği bilgiyi kendi CV'sinde görüyordu.
 */

interface StudentProfileViewProps {
  student: StudentProfile;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onUpdateProfile: (updated: Partial<StudentProfile>) => void;
  onOpenQuiz: (skillName: string) => void;
}

type BolumId = 'kisisel' | 'teknik' | 'sosyal' | 'dil' | 'proje' | 'tercih' | 'rozet';

const POPULER_ARACLAR = [
  'Python', 'JavaScript', 'React', 'SQL', 'Git & GitHub', 'HTML / CSS',
  'Excel (İleri)', 'AutoCAD', 'SolidWorks', 'Photoshop', 'Figma', 'Canva',
];

const ONERILEN_SOSYAL = [
  'Problem Çözme',
  'Ekip Çalışması',
  'İletişim',
  'Zaman Yönetimi',
  'Hızlı Öğrenme',
  'Sunum Becerisi',
  'Detaylara Dikkat',
  'Sorumluluk Alma',
];

const HEDEF_POZISYONLAR = [
  'Yazılım Geliştirme Stajyeri', 'Frontend Stajyeri', 'Backend Stajyeri',
  'Mobil Uygulama Stajyeri', 'Veri Analisti Stajyeri', 'Yapay Zeka / ML Stajyeri',
  'Siber Güvenlik Stajyeri', 'Test / QA Stajyeri', 'UI/UX Tasarım Stajyeri',
  'Grafik Tasarım Stajyeri', 'Dijital Pazarlama Stajyeri', 'Sosyal Medya Stajyeri',
  'İnsan Kaynakları Stajyeri', 'Muhasebe / Finans Stajyeri', 'Satış Stajyeri',
  'Lojistik Stajyeri', 'Makine Mühendisliği Stajyeri', 'Elektrik-Elektronik Stajyeri',
  'İnşaat / Şantiye Stajyeri', 'Endüstri Mühendisliği Stajyeri', 'Mimarlık Stajyeri',
  'Kimya / Laboratuvar Stajyeri', 'Gıda Mühendisliği Stajyeri', 'Tekstil / Konfeksiyon Stajyeri',
  'Üretim & Kalite Kontrol Stajyeri', 'Hukuk Stajyeri', 'Turizm / Otelcilik Stajyeri',
  'Sağlık Hizmetleri Stajyeri', 'Eğitim / Öğretmenlik Stajyeri', 'Halkla İlişkiler Stajyeri',
];

/* Seviye sırası: rozetteki etikete dokununca bu sırayla döner. */
const SEVIYE_SIRASI: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const SEVIYE_ETIKET: Record<SkillLevel, string> = {
  Beginner: 'Temel',
  Intermediate: 'Orta',
  Advanced: 'İleri',
  Expert: 'Uzman',
};

const DIL_SEVIYELERI = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const DIL_SEVIYE_METNI: Record<string, string> = {
  A1: 'A1 · Başlangıç',
  A2: 'A2 · Temel',
  B1: 'B1 · Orta',
  B2: 'B2 · İleri',
  C1: 'C1 · Akıcı',
  C2: 'C2 · Anadil düzeyi',
};

/* ------------------------------------------------------------------ */
/* Açılır bölüm                                                        */
/* ------------------------------------------------------------------ */

interface BolumProps {
  id: BolumId;
  emoji: string;
  baslik: string;
  ozet: string;
  tamam: boolean;
  acik: boolean;
  onToggle: (id: BolumId) => void;
  children: React.ReactNode;
}

/*
  Bileşen modül seviyesinde tanımlı: ana bileşenin içinde tanımlansaydı her
  render'da yeni bir tip oluşur, React içerideki input'ları söküp yeniden
  kurar ve yazarken imleç kaybolurdu.
*/
const Bolum: React.FC<BolumProps> = ({
  id, emoji, baslik, ozet, tamam, acik, onToggle, children,
}) => (
  <section
    id={`bolum-${id}`}
    className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden scroll-mt-28"
  >
    <button
      type="button"
      onClick={() => onToggle(id)}
      aria-expanded={acik}
      className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
    >
      <span
        aria-hidden
        className="w-10 h-10 shrink-0 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-lg"
      >
        {emoji}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
            {baslik}
          </span>
          {tamam && (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
        </span>
        <span className="block text-xs text-gray-500 dark:text-slate-400 truncate">
          {ozet}
        </span>
      </span>

      <ChevronDown
        className={`w-5 h-5 shrink-0 text-gray-400 transition-transform ${acik ? 'rotate-180' : ''}`}
      />
    </button>

    {acik && (
      <div className="px-4 pb-5 pt-1 space-y-4 border-t border-gray-100 dark:border-slate-800">
        {children}
      </div>
    )}
  </section>
);

/* Boş bölümlerde tek satırlık yönlendirme. */
const BosDurum: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-gray-400 dark:text-slate-500 py-1">{children}</p>
);

const alanClass =
  'w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600';

const etiketClass = 'block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5';

/* ------------------------------------------------------------------ */

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  onUpdateProfile,
  onOpenQuiz,
}) => {
  const [acikBolum, setAcikBolum] = useState<BolumId | null>(null);

  const yetenekler = student.skills ?? [];
  const sosyal = student.softSkills ?? [];
  const diller = student.languages ?? [];
  const projeler = student.projects ?? [];
  const hedefler = student.targetRoles ?? [];
  const sehirler = student.preferences.cities ?? [];

  /* ---- doluluk ---- */
  const adimlar: Array<{ bolum: BolumId; etiket: string; dolu: boolean }> = [
    { bolum: 'kisisel', etiket: 'okulunu ve bölümünü gir', dolu: Boolean(student.university && student.department) },
    { bolum: 'kisisel', etiket: 'kendini bir cümleyle tanıt', dolu: Boolean(student.bio) },
    { bolum: 'kisisel', etiket: 'fotoğrafını ekle', dolu: Boolean(student.avatarUrl) },
    { bolum: 'kisisel', etiket: 'telefonunu ekle', dolu: Boolean(student.phone) },
    { bolum: 'teknik', etiket: 'bildiğin programları ekle', dolu: yetenekler.length > 0 },
    { bolum: 'sosyal', etiket: 'sosyal becerilerini seç', dolu: sosyal.length > 0 },
    { bolum: 'dil', etiket: 'bildiğin dilleri ekle', dolu: diller.length > 0 },
    { bolum: 'proje', etiket: 'bir çalışmanı ekle', dolu: projeler.length > 0 },
    { bolum: 'tercih', etiket: 'hangi işi aradığını seç', dolu: hedefler.length > 0 },
    { bolum: 'tercih', etiket: 'şehir tercihini seç', dolu: sehirler.length > 0 },
  ];
  const tamamlanan = adimlar.filter((a) => a.dolu).length;
  const oran = Math.round((tamamlanan / adimlar.length) * 100);
  const siradaki = adimlar.find((a) => !a.dolu);

  const tonu =
    oran === 100 ? 'Profilin tamam 🎉'
      : oran >= 75 ? 'Az kaldı ⭐'
      : oran >= 50 ? 'İyi gidiyor 🚀'
      : oran >= 25 ? 'Isınıyorsun 🔥'
      : 'Hadi başlayalım 🌱';

  /* %100'e ilk ulaşıldığında kutlama. Her render'da değil, geçişte. */
  const oncekiOran = useRef(oran);
  useEffect(() => {
    if (oran === 100 && oncekiOran.current < 100) {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.3 } });
    }
    oncekiOran.current = oran;
  }, [oran]);

  const bolumAc = (id: BolumId) => {
    setAcikBolum((mevcut) => (mevcut === id ? null : id));
  };

  const siradakineGit = () => {
    if (!siradaki) return;
    setAcikBolum(siradaki.bolum);
    /* Bölüm açıldıktan sonra kaydır. */
    window.setTimeout(() => {
      document.getElementById(`bolum-${siradaki.bolum}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);
  };

  /* ---- fotoğraf ---- */
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [avatarYukleniyor, setAvatarYukleniyor] = useState(false);
  const [avatarHatasi, setAvatarHatasi] = useState<string | null>(null);

  const fotografSec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarHatasi(null);
    setAvatarYukleniyor(true);
    try {
      const url = await uploadAvatar(student.id, file);
      onUpdateProfile({ avatarUrl: url });
    } catch (error) {
      setAvatarHatasi(error instanceof Error ? error.message : 'Fotoğraf yüklenemedi.');
    } finally {
      setAvatarYukleniyor(false);
      e.target.value = '';
    }
  };

  /* ---- kişisel bilgi taslağı ---- */
  const bosTaslak = () => ({
    fullName: student.fullName,
    university: student.university,
    department: student.department,
    gradeLevel: student.gradeLevel as string,
    gpa: student.gpa ? String(student.gpa) : '',
    phone: student.phone ?? '',
    bio: student.bio ?? '',
  });
  const [taslak, setTaslak] = useState(bosTaslak);
  const [kaydedildi, setKaydedildi] = useState(false);

  /*
    Taslak yalnızca bölüm açılırken tazelenir; açıkken yazdıklarının üzerine
    yazmamak için render sırasında senkronize edilmiyor.
  */
  const kisiselAc = () => {
    if (acikBolum !== 'kisisel') {
      setTaslak(bosTaslak());
      setKaydedildi(false);
    }
    bolumAc('kisisel');
  };

  const kisiselKaydet = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      fullName: taslak.fullName.trim() || student.fullName,
      university: taslak.university.trim(),
      department: taslak.department.trim(),
      gradeLevel: taslak.gradeLevel as StudentProfile['gradeLevel'],
      gpa: taslak.gpa ? parseFloat(taslak.gpa) : 0,
      phone: taslak.phone.trim(),
      bio: taslak.bio.trim(),
    });
    setKaydedildi(true);
    window.setTimeout(() => setKaydedildi(false), 2500);
  };

  /* ---- teknik yetenekler ---- */
  const [yeniYetenek, setYeniYetenek] = useState('');

  const yetenekEkle = (ad: string) => {
    const temiz = ad.trim();
    if (!temiz) return;
    if (yetenekler.some((s) => s.name.toLocaleLowerCase('tr') === temiz.toLocaleLowerCase('tr'))) return;
    const yeni: StudentSkill = {
      name: temiz,
      category: 'General',
      level: 'Intermediate',
      verified: false,
    };
    onUpdateProfile({ skills: [...yetenekler, yeni] });
    setYeniYetenek('');
  };

  const yetenekSil = (ad: string) => {
    onUpdateProfile({ skills: yetenekler.filter((s) => s.name !== ad) });
  };

  /* Seviye rozetine dokununca Temel → Orta → İleri → Uzman → Temel. */
  const seviyeDondur = (ad: string) => {
    onUpdateProfile({
      skills: yetenekler.map((s) =>
        s.name === ad
          ? { ...s, level: SEVIYE_SIRASI[(SEVIYE_SIRASI.indexOf(s.level) + 1) % SEVIYE_SIRASI.length] }
          : s
      ),
    });
  };

  /* ---- sosyal beceriler ---- */
  const [yeniSosyal, setYeniSosyal] = useState('');

  const sosyalEkle = (metin: string) => {
    const temiz = metin.trim();
    if (!temiz || sosyal.includes(temiz)) return;
    onUpdateProfile({ softSkills: [...sosyal, temiz] });
    setYeniSosyal('');
  };

  const sosyalSil = (metin: string) => {
    onUpdateProfile({ softSkills: sosyal.filter((s) => s !== metin) });
  };

  /* ---- diller ---- */
  const [dilFormu, setDilFormu] = useState(false);
  const [yeniDil, setYeniDil] = useState('');
  const [yeniDilSeviye, setYeniDilSeviye] = useState('B1');

  const dilEkle = (e: React.FormEvent) => {
    e.preventDefault();
    const temiz = yeniDil.trim();
    if (!temiz) return;
    if (diller.some((l) => l.language.toLocaleLowerCase('tr') === temiz.toLocaleLowerCase('tr'))) return;
    const kayit: StudentLanguage = {
      id: `lang-${Date.now()}`,
      language: temiz,
      level: yeniDilSeviye,
      proficiencyText: DIL_SEVIYE_METNI[yeniDilSeviye] ?? yeniDilSeviye,
      verified: false,
    };
    onUpdateProfile({ languages: [...diller, kayit] });
    setYeniDil('');
    setYeniDilSeviye('B1');
    setDilFormu(false);
  };

  const dilSil = (id: string) => {
    onUpdateProfile({ languages: diller.filter((l) => l.id !== id) });
  };

  const dilSeviyeDegistir = (id: string, seviye: string) => {
    onUpdateProfile({
      languages: diller.map((l) =>
        l.id === id ? { ...l, level: seviye, proficiencyText: DIL_SEVIYE_METNI[seviye] ?? seviye } : l
      ),
    });
  };

  /* ---- projeler ---- */
  const [projeFormu, setProjeFormu] = useState(false);
  const [projeBaslik, setProjeBaslik] = useState('');
  const [projeAciklama, setProjeAciklama] = useState('');
  const [projeTeknoloji, setProjeTeknoloji] = useState('');
  const [projeLink, setProjeLink] = useState('');

  const projeEkle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projeBaslik.trim()) return;
    const yeni: StudentProject = {
      id: `proj-${Date.now()}`,
      title: projeBaslik.trim(),
      description: projeAciklama.trim(),
      techStack: projeTeknoloji.split(',').map((t) => t.trim()).filter(Boolean),
      githubUrl: projeLink.trim() || undefined,
    };
    onUpdateProfile({ projects: [...projeler, yeni] });
    setProjeBaslik('');
    setProjeAciklama('');
    setProjeTeknoloji('');
    setProjeLink('');
    setProjeFormu(false);
  };

  const projeSil = (id: string) => {
    onUpdateProfile({ projects: projeler.filter((p) => p.id !== id) });
  };

  /* ---- tercihler ---- */
  const [tumHedefler, setTumHedefler] = useState(false);

  const hedefDegistir = (rol: string) => {
    onUpdateProfile({
      targetRoles: hedefler.includes(rol)
        ? hedefler.filter((r) => r !== rol)
        : [...hedefler, rol],
    });
  };

  const tercihGuncelle = (yama: Partial<StudentProfile['preferences']>) => {
    onUpdateProfile({ preferences: { ...student.preferences, ...yama } });
  };

  /* ---- özet satırları ---- */
  const listeOzeti = (liste: string[], bosMetin: string, ek = 3) =>
    liste.length === 0
      ? bosMetin
      : liste.slice(0, ek).join(', ') + (liste.length > ek ? ` +${liste.length - ek}` : '');

  const rozetler = student.earnedBadges ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-16 animate-in fade-in duration-200">
      {/* ---------------- Üst kart: kim olduğun + ilerleme ---------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={dosyaRef}
            accept="image/*"
            className="hidden"
            onChange={fotografSec}
          />
          <button
            type="button"
            onClick={() => dosyaRef.current?.click()}
            className="relative shrink-0 rounded-2xl cursor-pointer"
            title="Fotoğrafını değiştir"
          >
            <Avatar
              name={student.fullName}
              url={student.avatarUrl || undefined}
              className="w-16 h-16 rounded-2xl text-xl"
            />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900">
              {avatarYukleniyor
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Camera className="w-3 h-3" />}
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {student.fullName}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
              {student.university || 'Okulun eksik'}
              {student.department ? ` · ${student.department}` : ''}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{student.gradeLevel}</p>
          </div>
        </div>

        {avatarHatasi && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{avatarHatasi}</p>
        )}

        {/* ilerleme */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{tonu}</span>
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 tabular-nums">
              {tamamlanan}/{adimlar.length}
            </span>
          </div>

          <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                oran === 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${oran}%` }}
            />
          </div>

          {siradaki ? (
            <button
              type="button"
              onClick={siradakineGit}
              className="w-full flex items-center justify-between gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-left cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors"
            >
              <span className="text-sm font-semibold text-blue-800 dark:text-blue-200 min-w-0">
                Sıradaki: {siradaki.etiket}
              </span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 shrink-0">
                Aç →
              </span>
            </button>
          ) : (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              Her alanı doldurdun. Artık ilanlara başvurabilirsin.
            </p>
          )}
        </div>
      </div>

      {/* ---------------- 1. Kişisel bilgiler ---------------- */}
      <Bolum
        id="kisisel"
        emoji="🎓"
        baslik="Okul ve iletişim"
        ozet={
          student.university && student.department
            ? `${student.university} · ${student.department}`
            : 'Okulunu, bölümünü ve telefonunu gir'
        }
        tamam={Boolean(student.university && student.department && student.bio && student.phone)}
        acik={acikBolum === 'kisisel'}
        onToggle={kisiselAc}
      >
        <form onSubmit={kisiselKaydet} className="space-y-3">
          <div>
            <label className={etiketClass} htmlFor="ad-soyad">Ad Soyad</label>
            <input
              id="ad-soyad"
              type="text"
              required
              value={taslak.fullName}
              onChange={(e) => setTaslak({ ...taslak, fullName: e.target.value })}
              className={alanClass}
            />
          </div>

          <div>
            <label className={etiketClass} htmlFor="universite">Üniversite</label>
            <AutocompleteField
              id="universite"
              value={taslak.university}
              onChange={(v) => setTaslak({ ...taslak, university: v })}
              options={TR_UNIVERSITIES}
              placeholder="Yazmaya başla, listeden seç"
              className={alanClass}
            />
          </div>

          <div>
            <label className={etiketClass} htmlFor="bolum">Bölüm</label>
            <AutocompleteField
              id="bolum"
              value={taslak.department}
              onChange={(v) => setTaslak({ ...taslak, department: v })}
              options={TR_DEPARTMENTS}
              placeholder="Ön lisans ve lisans programları"
              className={alanClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={etiketClass} htmlFor="sinif">Sınıf</label>
              <select
                id="sinif"
                value={taslak.gradeLevel}
                onChange={(e) => setTaslak({ ...taslak, gradeLevel: e.target.value })}
                className={alanClass}
              >
                <option value="1. Sınıf">1. Sınıf</option>
                <option value="2. Sınıf">2. Sınıf</option>
                <option value="3. Sınıf">3. Sınıf</option>
                <option value="4. Sınıf">4. Sınıf</option>
                <option value="Yüksek Lisans / Mezun">Yüksek Lisans / Mezun</option>
              </select>
            </div>
            <div>
              <label className={etiketClass} htmlFor="gpa">
                Not ortalaması <span className="font-normal text-gray-400">(isteğe bağlı)</span>
              </label>
              <input
                id="gpa"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="4"
                value={taslak.gpa}
                onChange={(e) => setTaslak({ ...taslak, gpa: e.target.value })}
                placeholder="3.10"
                className={alanClass}
              />
            </div>
          </div>

          <div>
            <label className={etiketClass} htmlFor="telefon">Telefon</label>
            <input
              id="telefon"
              type="tel"
              inputMode="tel"
              value={taslak.phone}
              onChange={(e) => setTaslak({ ...taslak, phone: e.target.value })}
              placeholder="05XX XXX XX XX"
              className={alanClass}
            />
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
              Telefonun yalnızca başvurduğun ilanın şirketiyle paylaşılır.
            </p>
          </div>

          <div>
            <label className={etiketClass} htmlFor="bio">Kendini bir iki cümleyle anlat</label>
            <textarea
              id="bio"
              rows={3}
              value={taslak.bio}
              onChange={(e) => setTaslak({ ...taslak, bio: e.target.value })}
              placeholder="Örn: Makine mühendisliği 3. sınıf öğrencisiyim, üretim hattı ve kalite kontrol alanında yaz stajı arıyorum."
              className={alanClass}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Kaydet
            </button>
            {kaydedildi && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Kaydedildi
              </span>
            )}
          </div>
        </form>
      </Bolum>

      {/* ---------------- 2. Teknik yetenekler ---------------- */}
      <Bolum
        id="teknik"
        emoji="🧰"
        baslik="Kullandığın programlar"
        ozet={listeOzeti(yetenekler.map((s) => s.name), 'Excel, AutoCAD, Python… hangilerini biliyorsun?')}
        tamam={yetenekler.length > 0}
        acik={acikBolum === 'teknik'}
        onToggle={bolumAc}
      >
        {yetenekler.length === 0 ? (
          <BosDurum>Aşağıdakilere dokunarak hızlıca ekleyebilirsin.</BosDurum>
        ) : (
          <div className="flex flex-wrap gap-2">
            {yetenekler.map((skill) => (
              <span
                key={skill.name}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm"
              >
                <span className="font-semibold text-gray-900 dark:text-slate-100">{skill.name}</span>

                <button
                  type="button"
                  onClick={() => seviyeDondur(skill.name)}
                  title="Seviyeyi değiştirmek için dokun"
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 cursor-pointer hover:border-blue-400"
                >
                  {SEVIYE_ETIKET[skill.level]}
                </button>

                {skill.verified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenQuiz(skill.name)}
                    title="Testi çöz, rozet kazan"
                    className="p-1 text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => yetenekSil(skill.name)}
                  aria-label={`${skill.name} kaldır`}
                  className="p-1 text-gray-300 dark:text-slate-500 hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {POPULER_ARACLAR
            .filter((t) => !yetenekler.some((s) => s.name.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr')))
            .map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => yetenekEkle(tool)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                {tool}
              </button>
            ))}
        </div>

        <PredictiveInput
          id="teknik-yetenek"
          value={yeniYetenek}
          onChange={setYeniYetenek}
          onSubmit={yetenekEkle}
          dictionary={HARD_SKILLS_DICTIONARY}
          excludeList={yetenekler.map((s) => s.name)}
          placeholder="Listede olmayan bir program yaz"
          buttonText="Ekle"
          accentColor="blue"
        />
        <p className="text-[11px] text-gray-400 dark:text-slate-500">
          Seviyeyi değiştirmek için rozetin üstündeki yazıya dokun.
        </p>
      </Bolum>

      {/* ---------------- 3. Sosyal beceriler ---------------- */}
      <Bolum
        id="sosyal"
        emoji="💬"
        baslik="Sosyal becerilerin"
        ozet={listeOzeti(sosyal, 'Ekip çalışması, iletişim, problem çözme…')}
        tamam={sosyal.length > 0}
        acik={acikBolum === 'sosyal'}
        onToggle={bolumAc}
      >
        {sosyal.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sosyal.map((beceri) => (
              <span
                key={beceri}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-sm font-semibold text-blue-900 dark:text-blue-200"
              >
                {beceri}
                <button
                  type="button"
                  onClick={() => sosyalSil(beceri)}
                  aria-label={`${beceri} kaldır`}
                  className="p-1 text-blue-300 hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {ONERILEN_SOSYAL.filter((s) => !sosyal.includes(s)).map((oneri) => (
            <button
              key={oneri}
              type="button"
              onClick={() => sosyalEkle(oneri)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors"
            >
              <Plus className="w-3 h-3" />
              {oneri}
            </button>
          ))}
        </div>

        <PredictiveInput
          id="sosyal-beceri"
          value={yeniSosyal}
          onChange={setYeniSosyal}
          onSubmit={sosyalEkle}
          dictionary={SOFT_SKILLS_DICTIONARY}
          excludeList={sosyal}
          placeholder="Kendi becerini yaz"
          buttonText="Ekle"
          accentColor="blue"
        />
      </Bolum>

      {/* ---------------- 4. Diller ---------------- */}
      <Bolum
        id="dil"
        emoji="🌍"
        baslik="Yabancı diller"
        ozet={listeOzeti(diller.map((l) => `${l.language} (${l.level})`), 'Bildiğin dil varsa ekle')}
        tamam={diller.length > 0}
        acik={acikBolum === 'dil'}
        onToggle={bolumAc}
      >
        {diller.length === 0 && !dilFormu && (
          <BosDurum>Hiç yabancı dil eklemedin. Zorunlu değil.</BosDurum>
        )}

        <div className="space-y-2">
          {diller.map((lang) => (
            <div
              key={lang.id}
              className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-gray-900 dark:text-slate-100 flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{lang.language}</span>
                  {lang.verified && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {!lang.verified && (
                    <button
                      type="button"
                      onClick={() => onOpenQuiz(lang.language)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2 py-1 cursor-pointer"
                    >
                      Doğrula
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dilSil(lang.id)}
                    aria-label={`${lang.language} kaldır`}
                    className="p-1.5 text-gray-300 dark:text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-1">
                {DIL_SEVIYELERI.map((sv) => (
                  <button
                    key={sv}
                    type="button"
                    onClick={() => dilSeviyeDegistir(lang.id, sv)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      lang.level === sv
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-300 border border-gray-200 dark:border-slate-600'
                    }`}
                  >
                    {sv}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">{lang.proficiencyText}</p>
            </div>
          ))}
        </div>

        {dilFormu ? (
          <form onSubmit={dilEkle} className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-3">
            <PredictiveInput
              id="yeni-dil"
              value={yeniDil}
              onChange={setYeniDil}
              onSubmit={setYeniDil}
              dictionary={LANGUAGES_DICTIONARY.map((l) => l.name)}
              excludeList={diller.map((l) => l.language)}
              placeholder="Dil adı (İngilizce, Almanca…)"
              buttonText="Seç"
              accentColor="blue"
            />

            <div className="flex gap-1">
              {DIL_SEVIYELERI.map((sv) => (
                <button
                  key={sv}
                  type="button"
                  onClick={() => setYeniDilSeviye(sv)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    yeniDilSeviye === sv
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-300 border border-gray-200 dark:border-slate-600'
                  }`}
                >
                  {sv}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              {DIL_SEVIYE_METNI[yeniDilSeviye]}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!yeniDil.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
              >
                Ekle
              </button>
              <button
                type="button"
                onClick={() => setDilFormu(false)}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 dark:text-slate-400 cursor-pointer"
              >
                Vazgeç
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setDilFormu(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Dil ekle
          </button>
        )}
      </Bolum>

      {/* ---------------- 5. Projeler ---------------- */}
      <Bolum
        id="proje"
        emoji="📁"
        baslik="Projeler ve çalışmalar"
        ozet={listeOzeti(projeler.map((p) => p.title), 'Okul projesi, ödev, kişisel çalışma — hepsi sayılır')}
        tamam={projeler.length > 0}
        acik={acikBolum === 'proje'}
        onToggle={bolumAc}
      >
        {projeler.length === 0 && !projeFormu && (
          <BosDurum>
            Bitirme projen, atölye çalışman ya da hobi olarak yaptığın bir iş de olur.
          </BosDurum>
        )}

        <div className="space-y-2">
          {projeler.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">{p.title}</h4>
                  {p.githubUrl && (
                    <a
                      href={p.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-400 hover:text-blue-600"
                      aria-label="Projeyi aç"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-gray-600 dark:text-slate-300">{p.description}</p>
                )}
                {p.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {p.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[10px] font-semibold text-gray-600 dark:text-slate-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => projeSil(p.id)}
                aria-label={`${p.title} sil`}
                className="p-1.5 shrink-0 text-gray-300 dark:text-slate-500 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {projeFormu ? (
          <form onSubmit={projeEkle} className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-3">
            <input
              type="text"
              value={projeBaslik}
              onChange={(e) => setProjeBaslik(e.target.value)}
              placeholder="Ne yaptın? (örn: Bitirme projesi — su tasarrufu sensörü)"
              className={alanClass}
            />
            <textarea
              rows={2}
              value={projeAciklama}
              onChange={(e) => setProjeAciklama(e.target.value)}
              placeholder="Kısaca anlat (isteğe bağlı)"
              className={alanClass}
            />
            <input
              type="text"
              value={projeTeknoloji}
              onChange={(e) => setProjeTeknoloji(e.target.value)}
              placeholder="Kullandığın araçlar, virgülle: Arduino, SolidWorks"
              className={alanClass}
            />
            <input
              type="url"
              value={projeLink}
              onChange={(e) => setProjeLink(e.target.value)}
              placeholder="Bağlantı (isteğe bağlı)"
              className={alanClass}
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!projeBaslik.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
              >
                Ekle
              </button>
              <button
                type="button"
                onClick={() => setProjeFormu(false)}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 dark:text-slate-400 cursor-pointer"
              >
                Vazgeç
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setProjeFormu(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Proje ekle
          </button>
        )}
      </Bolum>

      {/* ---------------- 6. Tercihler ---------------- */}
      <Bolum
        id="tercih"
        emoji="🎯"
        baslik="Ne arıyorsun?"
        ozet={
          hedefler.length > 0 || sehirler.length > 0
            ? `${listeOzeti(hedefler, 'Pozisyon seçilmedi', 2)}${sehirler.length ? ` · ${sehirler.join(', ')}` : ''}`
            : 'Hedef pozisyon ve şehir seç — eşleşmeler buna göre'
        }
        tamam={hedefler.length > 0 && sehirler.length > 0}
        acik={acikBolum === 'tercih'}
        onToggle={bolumAc}
      >
        <div>
          <span className={etiketClass}>Aradığın pozisyon</span>
          {hedefler.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {hedefler.map((rol) => (
                <span
                  key={rol}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-sm font-semibold text-blue-900 dark:text-blue-200"
                >
                  {rol}
                  <button
                    type="button"
                    onClick={() => hedefDegistir(rol)}
                    aria-label={`${rol} kaldır`}
                    className="p-1 text-blue-300 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {(tumHedefler ? HEDEF_POZISYONLAR : HEDEF_POZISYONLAR.slice(0, 10))
              .filter((r) => !hedefler.includes(r))
              .map((rol) => (
                <button
                  key={rol}
                  type="button"
                  onClick={() => hedefDegistir(rol)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {rol}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setTumHedefler((v) => !v)}
              className="px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
            >
              {tumHedefler ? 'Daha az göster' : 'Tümünü göster'}
            </button>
          </div>
        </div>

        <div>
          <span className={etiketClass}>Çalışmak istediğin şehirler</span>
          {sehirler.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {sehirler.map((sehir) => (
                <span
                  key={sehir}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-sm font-semibold text-blue-900 dark:text-blue-200"
                >
                  {sehir}
                  <button
                    type="button"
                    onClick={() => tercihGuncelle({ cities: sehirler.filter((c) => c !== sehir) })}
                    aria-label={`${sehir} kaldır`}
                    className="p-1 text-blue-300 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <select
            value=""
            onChange={(e) => {
              const secilen = e.target.value;
              if (!secilen || sehirler.includes(secilen)) return;
              tercihGuncelle({ cities: [...sehirler, secilen] });
            }}
            className={alanClass}
          >
            <option value="">+ Şehir ekle</option>
            {TR_CITIES.filter((c) => !sehirler.includes(c)).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
            Hiç seçmezsen tüm şehirlerdeki ilanlar eşit değerlendirilir.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className={etiketClass}>Çalışma şekli</span>
            <select
              value={student.preferences.workType}
              onChange={(e) => tercihGuncelle({ workType: e.target.value as StudentProfile['preferences']['workType'] })}
              className={alanClass}
            >
              <option value="Any">Farketmez</option>
              <option value="On-site">Ofiste</option>
              <option value="Hybrid">Hibrit</option>
              <option value="Remote">Uzaktan</option>
            </select>
          </div>
          <div>
            <span className={etiketClass}>Staj türü</span>
            <select
              value={student.preferences.type}
              onChange={(e) => tercihGuncelle({ type: e.target.value as StudentProfile['preferences']['type'] })}
              className={alanClass}
            >
              <option value="Summer Mandatory">Yaz dönemi zorunlu staj</option>
              <option value="Long-term">Uzun dönem (dönem içi)</option>
              <option value="Voluntary">Gönüllü staj</option>
            </select>
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            Sigortamı üniversite karşılıyor
          </span>
          <input
            type="checkbox"
            checked={student.preferences.mandatoryInsuranceProvidedByUni}
            onChange={(e) => tercihGuncelle({ mandatoryInsuranceProvidedByUni: e.target.checked })}
            className="w-5 h-5 rounded text-blue-600 shrink-0"
          />
        </label>
      </Bolum>

      {/* ---------------- 7. Rozetler ---------------- */}
      <Bolum
        id="rozet"
        emoji="🏅"
        baslik="Rozetler"
        ozet={rozetler.length > 0 ? `${rozetler.length} doğrulanmış rozet` : 'Test çözerek rozet kazan'}
        tamam={rozetler.length > 0}
        acik={acikBolum === 'rozet'}
        onToggle={bolumAc}
      >
        {rozetler.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {rozetler.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-emerald-900 dark:text-emerald-200"
              >
                <CheckCircle2 className="w-4 h-4" />
                {b.replace(/^(badge|quiz)-/, '')}
              </span>
            ))}
          </div>
        ) : (
          <BosDurum>
            "Yetenekler" sekmesindeki kısa testleri çözersen yeteneklerinin yanında
            doğrulanmış işareti çıkar.
          </BosDurum>
        )}
      </Bolum>
    </div>
  );
};
