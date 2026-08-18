import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FolderOpen,
  GraduationCap,
  Languages,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  StudentProfile,
  StudentSkill,
  StudentProject,
  StudentLanguage,
  SkillLevel,
  SkillQuiz,
} from '../types';
import { uploadAvatar } from '../lib/queries';
import { TR_UNIVERSITIES, TR_DEPARTMENTS, TR_CITIES } from '../data/turkeyData';
import { ProfilBasligi, type OneCikan } from './ProfilBasligi';
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
  /** Yetenek testleri artık bu sayfanın içinde. */
  quizzes?: SkillQuiz[];
  onStartQuiz?: (quiz: SkillQuiz) => void;
  /** Yazdırılabilir CV sayfasına geçiş. */
  onOpenCv?: () => void;
  /**
   * Başvuru takibi artık bu sayfanın içinde; ayrı sekme kaldırıldı.
   * Liste bileşeni App tarafından hazır veriliyor — bu bileşen başvuru
   * verisini kendisi çekmiyor, sadece yerleştiriyor.
   */
  basvuruSayisi?: number;
  basvuruListesi?: React.ReactNode;
}

type BolumId =
  | 'basvuru'
  | 'kisisel'
  | 'teknik'
  | 'sosyal'
  | 'dil'
  | 'proje'
  | 'tercih'
  | 'rozet';

/*
  TEK GEZİNME: ÖNE ÇIKANLAR ŞERİDİ

  Bir ara hem daire şeridi hem de altında bir sekme çubuğu vardı. İkisi de
  aynı bölümlere gidiyordu — kullanıcı aynı işi yapan iki kontrol görüyordu
  ve hangisinin ne yaptığını anlamak için ikisini de denemesi gerekiyordu.

  Şerit kaldı çünkü daha çok iş yapıyor: gezinmenin yanında her bölümün
  ne kadar dolu olduğunu da gösteriyor ("3 tane", "ekle"). Sekme çubuğu
  yalnızca gezindiriyordu.

  Artık şerit sekiz bölümün hepsini kapsıyor ve aşağıda yalnızca seçili
  bölüm duruyor.
*/

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
  /** Aktif sekmede değilse hiç çizilmiyor. */
  gorunur?: boolean;
  id: BolumId;
  ikon: React.ReactNode;
  /** Tailwind zemin sınıfı; her bölümün kendi rengi var. */
  renk: string;
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
  id, ikon, renk, baslik, ozet, tamam, acik, onToggle, children, gorunur = true,
}) => (
  !gorunur ? null : (
  <section
    id={`bolum-${id}`}
    className="bg-white rounded-2xl border border-gray-200 overflow-hidden scroll-mt-28"
  >
    {/*
      Başlık artık düğme değil.

      Bölüm açıp kapatma şeride taşındı; burada bir aç/kapa düğmesi
      bırakmak, basılınca hiçbir şey yapmayan (ya da alanı boşaltan) bir
      kontrol olurdu. Şimdi yalnızca hangi bölümde olduğunu söylüyor.
    */}
    <div className="w-full flex items-center gap-3 p-4 text-left">
      {/*
        EMOJİ YERİNE RENKLİ İKON

        Sekiz bölümün sekizi de gri kutuda emoji taşıyordu. Emoji her
        işletim sisteminde farklı çiziliyor (Windows'ta başka, iPhone'da
        başka) ve gri kutular sayfayı tek düze bir liste hâline getiriyordu.

        Her bölümün artık kendi rengi ve çizgi ikonu var: göz bölümü
        okumadan ayırt ediyor, renk sayfaya canlılık veriyor.
      */}
      <span
        aria-hidden
        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white shadow-sm ${renk}`}
      >
        {ikon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-gray-900 text-sm sm:text-base">
            {baslik}
          </span>
          {tamam && (
            <Check className="w-4 h-4 text-emerald-600 shrink-0"/>
          )}
        </span>
        <span className="block text-xs text-gray-500 truncate">
          {ozet}
        </span>
      </span>

    </div>

    {acik && (
      <div className="px-4 pb-5 pt-1 space-y-4 border-t border-gray-100">
        {children}
      </div>
    )}
  </section>
  )
);

/* Boş bölümlerde tek satırlık yönlendirme. */
const BosDurum: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-gray-400 py-1">{children}</p>
);

const alanClass =
  'w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-600';

const etiketClass ='block text-xs font-semibold text-gray-600 mb-1.5';

/* ------------------------------------------------------------------ */

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  onUpdateProfile,
  onOpenQuiz,
  onOpenCv,
  quizzes = [],
  onStartQuiz,
  basvuruSayisi = 0,
  basvuruListesi,
}) => {
  /*
    Açılışta 'basvuru' seçili — şeritteki ilk daire.

    Öğrenci profile en çok "başvurum ne oldu" diye giriyor. Başvuru listesi
    hiç yoksa (bileşene geçirilmemişse) 'kisisel'e düşüyor: boş bir bölümle
    karşılamak, dolu bir bölümle karşılamaktan kötü.
  */
  const [acikBolum, setAcikBolum] = useState<BolumId>(
    basvuruListesi ? 'basvuru' : 'kisisel'
  );
  /** Bölüme git. Şerit, "Sıradaki" düğmesi ve sayılar hep buradan geçiyor. */
  const bolumeGit = (bolum: BolumId) => setAcikBolum(bolum);

  const yetenekler = student.skills ?? [];
  const sosyal = student.softSkills ?? [];
  const diller = student.languages ?? [];
  const projeler = student.projects ?? [];
  const hedefler = student.targetRoles ?? [];
  const sehirler = student.preferences.cities ?? [];

  /*
    DOLULUK

    Yalnızca yüzde hesaplanıyor; halka bunu gösteriyor. Her adımın hangi
    bölüme ait olduğu da tutuluyordu ama onu kullanan "Sıradaki adım"
    şeridi kaldırıldı — şerit zaten eksikleri gösteriyor. Kullanılmayan
    alanı bırakmak sonradan okuyanı yanıltır.
  */
  const adimlar: boolean[] = [
    Boolean(student.university && student.department),
    Boolean(student.bio),
    Boolean(student.avatarUrl),
    Boolean(student.phone),
    yetenekler.length > 0,
    sosyal.length > 0,
    diller.length > 0,
    projeler.length > 0,
    hedefler.length > 0,
    sehirler.length > 0,
  ];
  const tamamlanan = adimlar.filter(Boolean).length;
  const oran = Math.round((tamamlanan / adimlar.length) * 100);


  /*
    ÖNE ÇIKANLAR ŞERİDİ

    Instagram'da hikâye vurguları duruyor; burada profilin bölümleri.
    Dolu olan bölüm içeriğinin özetini gösteriyor, boş olan "+" ile ekleme
    çağrısı yapıyor — yani şerit hem gezinme hem eksik listesi.

    Her öğe ilgili bölümü açıyor: ayrı bir sayfa yok, kaydırma yok.
  */
  const oneCikanlar: OneCikan[] = [
    /*
      Başvurular en başta.

      Öğrencinin profile girme sebebi çoğunlukla "başvurum ne oldu"
      sorusu; profil doldurmak ikinci sırada geliyor. En çok bakılan şeyi
      şeridin sonuna koymak, her seferinde kaydırmak demekti.
    */
    ...(basvuruListesi
      ? [
          {
            id: 'basvuru',
            etiket: 'Başvurular',
            deger: basvuruSayisi ? `${basvuruSayisi} tane` : null,
            ikon: <Send className="w-5 h-5" />,
            onClick: () => bolumeGit('basvuru'),
          } as OneCikan,
        ]
      : []),
    {
      id: 'kisisel',
      etiket: 'Okulun',
      deger: student.university ? student.department || 'girildi' : null,
      ikon: <GraduationCap className="w-5 h-5" />,
      onClick: () => kisiselAc(),
    },
    {
      id: 'teknik',
      etiket: 'Programlar',
      deger: yetenekler.length ? `${yetenekler.length} tane` : null,
      ikon: <Wrench className="w-5 h-5" />,
      onClick: () => bolumeGit('teknik'),
    },
    {
      id: 'sosyal',
      etiket: 'Beceriler',
      deger: sosyal.length ? `${sosyal.length} tane` : null,
      ikon: <MessageSquare className="w-5 h-5" />,
      onClick: () => bolumeGit('sosyal'),
    },
    {
      id: 'dil',
      etiket: 'Diller',
      deger: diller.length ? `${diller.length} dil` : null,
      ikon: <Languages className="w-5 h-5" />,
      onClick: () => bolumeGit('dil'),
    },
    {
      id: 'proje',
      etiket: 'Çalışmalar',
      deger: projeler.length ? `${projeler.length} tane` : null,
      ikon: <FolderOpen className="w-5 h-5" />,
      onClick: () => bolumeGit('proje'),
    },
    {
      id: 'tercih',
      etiket: 'Hedefin',
      deger: hedefler.length ? hedefler[0] : null,
      ikon: <Target className="w-5 h-5" />,
      onClick: () => bolumeGit('tercih'),
    },
    {
      id: 'rozet',
      etiket: 'Testler',
      deger: (student.earnedBadges ?? []).length
        ? `${(student.earnedBadges ?? []).length} rozet`
        : null,
      ikon: <Award className="w-5 h-5" />,
      onClick: () => bolumeGit('rozet'),
    },
  ];

  /* %100'e ilk ulaşıldığında kutlama. Her render'da değil, geçişte. */
  const oncekiOran = useRef(oran);
  useEffect(() => {
    if (oran === 100 && oncekiOran.current < 100) {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.3 } });
    }
    oncekiOran.current = oran;
  }, [oran]);

  /*
    Bölüm kapatma kaldırıldı.

    Şerit tek gezinme olduğu için aşağıda her zaman bir bölüm duruyor.
    Kapatılabilir bırakılsaydı kullanıcı başlığa basınca alan tamamen
    boşalıyordu — hiçbir şeye götürmeyen bir tıklama.
  */
  const bolumAc = (id: BolumId) => setAcikBolum(id);

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
    bolumeGit('kisisel');
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
    /*
      İKİ SÜTUNLU DÜZEN (yalnızca lg ve üstü)

      Sayfa `max-w-3xl` idi: geniş ekranda içerik ortada dar bir şerit
      hâlinde duruyor, iki yanı boş kalıyordu. Anasayfa ise tam genişlikte.
      Aynı sitede iki farklı sayfa genişliği vardı.

      Artık anasayfayla aynı: solda kimlik kartı (kaydırınca yapışık kalıyor),
      sağda doldurulacak bölümler. Mobilde hiçbir şey değişmiyor — sütunlar
      alt alta diziliyor ve sıra aynı.
    */
    <div className="w-full pb-16 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">

        {/* ---------------- SOL: profil başlığı ---------------- */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-3">
          <ProfilBasligi
            ad={student.fullName}
            avatarUrl={student.avatarUrl}
            okul={student.university}
            bolum={student.department}
            sinif={student.gradeLevel}
            bio={student.bio}
            oran={oran}
            basvuruSayisi={basvuruSayisi}
            beceriSayisi={yetenekler.length + sosyal.length + diller.length}
            avatarYukleniyor={avatarYukleniyor}
            onFotografSec={() => dosyaRef.current?.click()}
            onDuzenle={kisiselAc}
            onCv={onOpenCv}
            onBasvurulara={basvuruListesi ? () => bolumeGit('basvuru') : undefined}
            oneCikanlar={oneCikanlar}
            secili={acikBolum}
          />

          <input
            type="file"
            ref={dosyaRef}
            accept="image/*"
            className="hidden"
            onChange={fotografSec}
          />
          {avatarHatasi && <p className="text-xs text-rose-600 px-1">{avatarHatasi}</p>}

          {/*
            "Sıradaki adım" şeridi kaldırıldı.

            Şerit zaten aynı şeyi söylüyor ve daha iyi söylüyor: boş bölüm
            kesik çizgili çemberle ve "ekle" yazısıyla duruyor, hepsi aynı
            anda görünüyor. Ayrı bir satırda tek bir eksiği tekrar etmek
            aynı bilgiyi iki kez göstermekti.
          */}
        </div>

        {/* ---------------- SAĞ: sekmeler ve bölümler ---------------- */}
        <div className="lg:col-span-8 space-y-3 min-w-0">

      {/* ---------------- 0. Başvurularım ---------------- */}
      {basvuruListesi && (
        <Bolum
          id="basvuru"
          gorunur={acikBolum === 'basvuru'}
          ikon={<Send className="w-5 h-5" />}
          renk="bg-gradient-to-br from-rose-500 to-rose-600"
          baslik="Başvurularım"
          ozet={
            basvuruSayisi > 0
              ? `${basvuruSayisi} başvuru`
              : 'Henüz başvuru yok — ilanlara göz at'
          }
          tamam={basvuruSayisi > 0}
          acik={acikBolum === 'basvuru'}
          onToggle={bolumAc}
        >
          {basvuruListesi}
        </Bolum>
      )}

      {/* ---------------- 1. Kişisel bilgiler ---------------- */}
      <Bolum
        id="kisisel"
        gorunur={acikBolum === 'kisisel'}
        ikon={<GraduationCap className="w-5 h-5" />}
        renk="bg-gradient-to-br from-violet-500 to-violet-600"
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
            <p className="text-[11px] text-gray-400 mt-1">
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
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Kaydedildi
              </span>
            )}
          </div>
        </form>
      </Bolum>

      {/* ---------------- 2. Teknik yetenekler ---------------- */}
      <Bolum
        id="teknik"
        gorunur={acikBolum === 'teknik'}
        ikon={<Wrench className="w-5 h-5" />}
        renk="bg-gradient-to-br from-blue-500 to-blue-600"
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
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-sm"
              >
                <span className="font-semibold text-gray-900">{skill.name}</span>

                <button
                  type="button"
                  onClick={() => seviyeDondur(skill.name)}
                  title="Seviyeyi değiştirmek için dokun"
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 cursor-pointer hover:border-blue-400"
                >
                  {SEVIYE_ETIKET[skill.level]}
                </button>

                {skill.verified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenQuiz(skill.name)}
                    title="Testi çöz, rozet kazan"
                    className="p-1 text-blue-600 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => yetenekSil(skill.name)}
                  aria-label={`${skill.name} kaldır`}
                  className="p-1 text-gray-300 hover:text-rose-600 cursor-pointer"
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
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-600 hover:border-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
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
        <p className="text-[11px] text-gray-400">
          Seviyeyi değiştirmek için rozetin üstündeki yazıya dokun.
        </p>
      </Bolum>

      {/* ---------------- 3. Sosyal beceriler ---------------- */}
      <Bolum
        id="sosyal"
        gorunur={acikBolum === 'sosyal'}
        ikon={<MessageSquare className="w-5 h-5" />}
        renk="bg-gradient-to-br from-cyan-500 to-cyan-600"
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
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-900"
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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-600 hover:border-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
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
        gorunur={acikBolum === 'dil'}
        ikon={<Languages className="w-5 h-5" />}
        renk="bg-gradient-to-br from-teal-500 to-teal-600"
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
              className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{lang.language}</span>
                  {lang.verified && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0"/>
                  )}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {!lang.verified && (
                    <button
                      type="button"
                      onClick={() => onOpenQuiz(lang.language)}
                      className="text-xs font-bold text-blue-600 px-2 py-1 cursor-pointer"
                    >
                      Doğrula
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dilSil(lang.id)}
                    aria-label={`${lang.language} kaldır`}
                    className="p-1.5 text-gray-300 hover:text-rose-600 cursor-pointer"
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
                        :'bg-white text-gray-500 border border-gray-200'
                    }`}
                  >
                    {sv}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500">{lang.proficiencyText}</p>
            </div>
          ))}
        </div>

        {dilFormu ? (
          <form onSubmit={dilEkle} className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
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
                      :'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {sv}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">
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
                className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 cursor-pointer"
              >
                Vazgeç
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setDilFormu(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:border-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Dil ekle
          </button>
        )}
      </Bolum>

      {/* ---------------- 5. Projeler ---------------- */}
      <Bolum
        id="proje"
        gorunur={acikBolum === 'proje'}
        ikon={<FolderOpen className="w-5 h-5" />}
        renk="bg-gradient-to-br from-amber-500 to-amber-600"
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
              className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-gray-900">{p.title}</h4>
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
                  <p className="text-xs text-gray-600">{p.description}</p>
                )}
                {p.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {p.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-600"
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
                className="p-1.5 shrink-0 text-gray-300 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {projeFormu ? (
          <form onSubmit={projeEkle} className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
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
                className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 cursor-pointer"
              >
                Vazgeç
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setProjeFormu(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:border-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Proje ekle
          </button>
        )}
      </Bolum>

      {/* ---------------- 6. Tercihler ---------------- */}
      <Bolum
        id="tercih"
        gorunur={acikBolum === 'tercih'}
        ikon={<Target className="w-5 h-5" />}
        renk="bg-gradient-to-br from-orange-500 to-orange-600"
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
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-900"
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
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-600 hover:border-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {rol}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setTumHedefler((v) => !v)}
              className="px-2.5 py-1.5 text-xs font-bold text-blue-600 cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-900"
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
          <p className="text-[11px] text-gray-400 mt-1">
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

        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
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
      {/*
        Testler ve rozetler tek bölümde.

        Ayrı bir "Yetenek Doğrulama" sekmesindeydi. Ama test çözmek profil
        doldurmanın parçası: kişi yeteneğini yazıyor, sonra doğruluyor. İkisi
        ayrı sekmelerdeyken kullanıcı yeteneği ekliyor, doğrulamak için başka
        yere gidiyordu.
      */}
      <Bolum
        id="rozet"
        gorunur={acikBolum === 'rozet'}
        ikon={<Award className="w-5 h-5" />}
        renk="bg-gradient-to-br from-emerald-500 to-emerald-600"
        baslik="Testler ve rozetler"
        ozet={
          rozetler.length > 0
            ? `${rozetler.length} rozet · ${quizzes.length} test var`
            : `${quizzes.length} kısa test — çözünce yeteneğinin yanında doğrulanmış işareti çıkar`
        }
        tamam={rozetler.length > 0}
        acik={acikBolum === 'rozet'}
        onToggle={bolumAc}
      >
        {rozetler.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {rozetler.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-900"
              >
                <CheckCircle2 className="w-4 h-4" />
                {b.replace(/^(badge|quiz)-/, '')}
              </span>
            ))}
          </div>
        )}

        {quizzes.length === 0 ? (
          <BosDurum>Şu an gösterilecek test yok.</BosDurum>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              5 soruluk kısa testler, yaklaşık 5 dakika. 3 doğru yeterli.
            </p>
            <ul className="divide-y divide-gray-100">
              {quizzes.map((quiz) => {
                const kazanildi = rozetler.includes(quiz.badgeName);
                return (
                  <li key={quiz.id}>
                    <button
                      type="button"
                      onClick={() => onStartQuiz?.(quiz)}
                      className="w-full flex items-center gap-3 py-3 text-left cursor-pointer hover:bg-blue-50/60 transition-colors rounded-xl px-2 -mx-2"
                    >
                      <span
                        className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                          kazanildi ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {kazanildi ? (
                          <CheckCircle2 className="w-4.5 h-4.5" />
                        ) : (
                          <Award className="w-4.5 h-4.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-sm text-gray-900 truncate">
                          {quiz.skillName}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {kazanildi
                            ? 'Rozet kazanıldı · tekrar çözebilirsin'
                            : `${quiz.questions.length} soru · ~5 dk`}
                        </span>
                      </span>
                      <ChevronDown className="w-5 h-5 shrink-0 text-gray-300 -rotate-90" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Bolum>
        </div>
      </div>
    </div>
  );
};
