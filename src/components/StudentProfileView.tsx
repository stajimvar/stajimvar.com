import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Languages,
  LayoutGrid,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
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
  SkillQuiz,
  ApplicationRecord,
} from '../types';
import { uploadAvatar } from '../lib/queries';
import { CvAlani } from './CvAlani';
import { fetchSavedListingIds } from '../lib/opportunities';
import { adYazimi , okulKisaltmasi} from '../lib/ad';
import { useModalErisim } from '../lib/modal-erisim';
import { TR_UNIVERSITIES, TR_DEPARTMENTS, TR_CITIES } from '../data/turkeyData';
import { Button, Card, IKON_KUTUSU, IKON_TONU } from '../ui';
import { ProfilBasligi, type EksikAdim, type OneCikan } from './ProfilBasligi';
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
  /**
   * Başvuru KAYITLARI — yalnızca sayısı değil.
   *
   * Önce sadece `basvuruSayisi` geliyordu; "kaç mülakat" gibi bir soruyu
   * cevaplayabilmek için sayının yanında ikinci bir sayı daha geçirmek
   * gerekirdi ve iki sayı ayrı hesaplandığında er geç birbirini tutmaz.
   * Liste bir kez geçiyor, bütün sayılar ondan çıkıyor.
   */
  basvurular?: ApplicationRecord[];
  basvuruListesi?: React.ReactNode;
  /** İlanlar sekmesindeki "Kaydettiklerim" kategorisine geçiş. */
  onKaydedilenlere?: () => void;
  /*
    HESAP EYLEMLERİ SAYFANIN EN ALTINDA

    Çıkış ve yönetim paneli üst çubuktaki avatar menüsündeydi. O menü
    mobilde kaldırıldı (alt gezinme çubuğu artık doğrudan buraya geliyor),
    dolayısıyla bu ikisinin telefonda başka bir evi kalmadı.

    Yeri sayfanın dibi: hesabı kapatmak, profili okuduktan sonra verilen
    bir karar — listenin başında duran bir "Çıkış yap" yanlışlıkla
    basılacak bir tuzaktır.
  */
  onLogout?: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

type BolumId =
  | 'basvuru'
  | 'kisisel'
  | 'cv'
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
  id, ikon, baslik, ozet, tamam, acik, onToggle, children, gorunur = true,
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

        Sekiz bölümün sekizi de gri kutuda emoji taşıyordu; emoji her
        işletim sisteminde farklı çiziliyor. Emojiler çizgi ikona döndü.

        SONRA SEKİZ AYRI DEGRADE OLDU, O DA GERİ ALINDI
        -----------------------------------------------
        Her bölüme kendi degrade rengi verilmişti: pembe, mor, mavi, cam
        göbeği, turkuaz, amber, turuncu, yeşil. Renk sayfaya canlılık
        veriyordu ama anlamı bozuyordu — "Başvurularım" pembe-kırmızı bir
        daireydi ve tam üstündeki kısayolda MAVİ bir daireyle duruyordu:
        aynı kavram, iki ayrı kimlik. Kırmızı bu üründe yalnızca hata ve
        reddedilme demek; dekoratif kullanılınca gerçek uyarı fark
        edilmiyor.

        Artık tek biçim: 40×40 yuvarlatılmış kare, açık bölüm marka
        mavisi, kapalılar nötr. Ölçü ve köşe src/ui/tokens.ts'ten.
      */}
      <span
        aria-hidden
        className={`${IKON_KUTUSU} ${acik ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
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
  <p className="text-xs text-gray-600 py-1">{children}</p>
);

const alanClass =
  'w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-600';

const etiketClass ='block text-xs font-semibold text-gray-600 mb-1.5';

/* Ad yazımı yardımcısı ortak dosyada: src/lib/ad.ts */

/* ------------------------------------------------------------------ */

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  onUpdateProfile,
  onOpenQuiz,
  onOpenCv,
  quizzes = [],
  onStartQuiz,
  basvurular = [],
  basvuruListesi,
  onKaydedilenlere,
  onSubTabChange,
  onLogout,
  isAdmin = false,
  onOpenAdmin,
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
  /**
   * Bölüme git. Izgara, sayılar ve eksik adımlar hep buradan geçiyor.
   *
   * MOBİLDE KAYDIRMA DA GEREKİYOR
   * Telefonda bölümler başlık kartının ALTINDA duruyor. Sayıya basınca
   * yalnızca durum değişiyordu; ekranda görünen şey değişmediği için
   * tıklama hiçbir şey yapmamış gibi oluyordu. Geniş ekranda bölümler
   * zaten yan sütunda ve görünüyor, orada kaydırma gereksiz.
   */
  const bolumeGit = (bolum: BolumId) => {
    setAcikBolum(bolum);
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
    /* Bölüm yalnızca seçiliyken çiziliyor; boyama bitmeden hedef yok. */
    requestAnimationFrame(() => {
      document
        .getElementById(`bolum-${bolum}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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
  const adimlar: { tamam: boolean; etiket: string; bolum: BolumId }[] = [
    { tamam: Boolean(student.university && student.department), etiket: 'okulunu gir', bolum: 'kisisel' },
    { tamam: Boolean(student.bio), etiket: 'kendini tanıt', bolum: 'kisisel' },
    { tamam: Boolean(student.avatarUrl), etiket: 'fotoğraf ekle', bolum: 'kisisel' },
    { tamam: Boolean(student.phone), etiket: 'telefonunu gir', bolum: 'kisisel' },
    /* CV artık gerçek bir belge: yüklenmişse adım tamam sayılıyor. */
    { tamam: Boolean(student.cvPath), etiket: 'CV yükle', bolum: 'cv' },
    { tamam: yetenekler.length > 0, etiket: 'program ekle', bolum: 'teknik' },
    { tamam: sosyal.length > 0, etiket: 'beceri ekle', bolum: 'sosyal' },
    { tamam: diller.length > 0, etiket: 'dil ekle', bolum: 'dil' },
    /* "çalışma ekle" iş deneyimi mi proje mi belli değildi; bölümde tutulan şey proje. */
    { tamam: projeler.length > 0, etiket: 'proje ekle', bolum: 'proje' },
    { tamam: hedefler.length > 0, etiket: 'hedefini seç', bolum: 'tercih' },
    { tamam: sehirler.length > 0, etiket: 'şehir seç', bolum: 'tercih' },
  ];
  const tamamlanan = adimlar.filter((a) => a.tamam).length;
  const oran = Math.round((tamamlanan / adimlar.length) * 100);

  /*
    EKSİKLER

    Yüzde tek başına ne yapılacağını söylemiyordu. Eksik adımın ADI ve
    gittiği bölüm birlikte taşınıyor: başlıktaki rozete basınca doğru
    bölüm açılıyor, öğrenci aramak zorunda kalmıyor.
  */
  const eksikler: EksikAdim[] = adimlar
    .filter((a) => !a.tamam)
    .map((a) => ({
      etiket: a.etiket,
      onClick: () => (a.bolum === 'kisisel' ? kisiselAc() : bolumeGit(a.bolum)),
    }));

  /*
    SÜREÇ SAYILARI — HEPSİ TEK LİSTEDEN

    Mülakat sayısı burada bir kez tanımlanıyor. Başvuru listesindeki
    "Mülakatlar (n)" süzgeci de aynı iki durumu sayıyor; ikisi ayrı
    yazılsaydı biri değiştiğinde diğeri sessizce yanlış kalırdı.
  */
  const basvuruSayisi = basvurular.length;
  const mulakatSayisi = basvurular.filter(
    (b) => b.status === 'interview_scheduled' || b.status === 'technical_assessment'
  ).length;
  const degerlendirmede = basvurular.filter(
    (b) => b.status === 'under_review' || b.status === 'technical_assessment'
  ).length;

  /*
    KAYDEDİLEN İLAN SAYISI

    Sunucudan çekiliyor çünkü kaydetme sunucuda tutuluyor ve profil
    ekranı ilan listesini hiç görmüyor. Hata durumunda sayı 0 kalıyor:
    çalışmayan bir sayı göstermektense göstermemek daha dürüst.

    Yalnızca İLANLAR sayılıyor, burslar değil — sayıya basınca gidilen
    yer "Kaydettiklerim" ilan kategorisi. Sayının gittiği yerde aynı
    sayıyı göremiyorsa, sayı yanlıştır.
  */
  /* CV indirmeden önceki uyarı açık mı. */
  const [cvUyarisi, setCvUyarisi] = useState(false);
  /* ESC ile kapanma, odak tuzağı ve arka plan kilidi diğer modallarla aynı. */
  const cvKutuRef = useModalErisim<HTMLDivElement>(cvUyarisi, () => setCvUyarisi(false));

  const [kaydedilenSayisi, setKaydedilenSayisi] = useState(0);
  useEffect(() => {
    let iptal = false;
    if (!student.id) return;
    fetchSavedListingIds(student.id)
      .then((idler) => {
        if (!iptal) setKaydedilenSayisi(idler.length);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [student.id]);

  /*
    NE ARADIĞI — TERCİHLERDEN ÜRETİLEN ETİKETLER

    Başlıkta "Staj yapmak için yer arıyorum" yazıyordu: herkeste aynı
    cümle ve hiçbir şey söylemiyor. Bunun yerine öğrencinin GERÇEK
    tercihleri okunabilir hâle getiriliyor. Uydurma yok: yalnızca
    girilmiş olan alan etikete dönüşüyor, 'Any' (fark etmez) seçimi
    etiket üretmiyor çünkü bir tercih bildirmiyor.
  */
  const durum: { basSatir: string | null; altSatir: string | null } = (() => {
    const p = student.preferences;

    /* ÜST SATIR: zaman ve tür. */
    const yil = p.earliestStartDate ? new Date(p.earliestStartDate).getFullYear() : NaN;
    let basSatir: string | null = null;
    if (p.type === 'Summer Mandatory') {
      basSatir = Number.isNaN(yil)
        ? 'Zorunlu staj arıyorum'
        : `${yil} yaz stajına açığım`;
    } else if (p.type === 'Long-term') basSatir = 'Uzun dönem staj arıyorum';
    else if (p.type === 'Voluntary') basSatir = 'Gönüllü staj arıyorum';
    else if (p.type === 'Part-time') basSatir = 'Yarı zamanlı staj arıyorum';

    /*
      ALT SATIR: koşullar. Tür üst satırda geçtiği için burada tekrar
      edilmiyor — "2026 yaz stajına açığım · Zorunlu staj" aynı şeyi iki
      kez söylerdi.
    */
    const kosullar: string[] = [];
    if (sehirler.length) kosullar.push(sehirler.slice(0, 2).join(' / '));
    if (p.workType === 'Remote') kosullar.push('Uzaktan');
    else if (p.workType === 'Hybrid') kosullar.push('Hibrit');
    else if (p.workType === 'On-site') kosullar.push('Ofisten');

    return { basSatir, altSatir: kosullar.length ? kosullar.join(' · ') : null };
  })();


  /*
    ÖNE ÇIKANLAR ŞERİDİ

    Instagram'da hikâye vurguları duruyor; burada profilin bölümleri.
    Dolu olan bölüm içeriğinin özetini gösteriyor, boş olan "+" ile ekleme
    çağrısı yapıyor — yani şerit hem gezinme hem eksik listesi.

    Her öğe ilgili bölümü açıyor: ayrı bir sayfa yok, kaydırma yok.
  */
  /*
    BAŞVURULAR KISAYOLLARDAN ÇIKTI

    Aynı kavram ekranda üç ayrı kimlikle duruyordu: üstteki istatistikte
    bir sayı, kısayol ızgarasında MAVİ bir daire, hemen altında da
    PEMBE-KIRMIZI simgeli kendi bölümü. Aynı şeyin üç görüntüsü, üçünün de
    ayrı bir anlamı varmış izlenimi veriyordu.

    Kısayol kalktı: başvuru bölümü zaten bu kartın hemen altında ve
    sayısı üstteki istatistikte duruyor.
  */
  const oneCikanlar: OneCikan[] = [
    {
      id: 'kisisel',
      /* "Okulun" bölümün adıyla ("Okul ve iletişim") uyuşmuyordu. */
      etiket: 'Okul & Bölüm',
      dolu: Boolean(student.university),
      /*
        Satırın ikincil bilgisi boştu; ötekilerin hepsinde ("3 program",
        "2 dil") bilgi varken burada yoktu ve satır eksik görünüyordu.
        Uzun üniversite adı bölümle birlikte tek satıra sığmıyor, o yüzden
        kısaltılıyor (src/lib/ad.ts) — kural dar: yalnızca üç kelimeden
        uzun adlarda.
      */
      alt: [okulKisaltmasi(student.university), student.department]
        .filter(Boolean)
        .join(' · ') || undefined,
      ikon: <GraduationCap className="w-5 h-5" />,
      onClick: () => kisiselAc(),
    },
    {
      /*
        CV şeride ikinci sırada: profil dolduran öğrencinin okuldan sonra
        yaptığı iş bu ve başvuruya giden tek belge.
      */
      id: 'cv',
      etiket: 'CV',
      dolu: Boolean(student.cvPath),
      alt: student.cvPath ? 'PDF yüklendi' : undefined,
      ikon: <FileText className="w-5 h-5" />,
      onClick: () => bolumeGit('cv'),
    },
    {
      id: 'teknik',
      etiket: 'Programlar',
      dolu: yetenekler.length > 0,
      alt: yetenekler.length ? `${yetenekler.length} program` : undefined,
      /*
        İngiliz anahtarı "tamir/ayar" demek; burada kastedilen kullanılan
        uygulamalar. Uygulama ızgarası doğru karşılığı.
      */
      ikon: <LayoutGrid className="w-5 h-5" />,
      onClick: () => bolumeGit('teknik'),
    },
    {
      id: 'sosyal',
      etiket: 'Beceriler',
      dolu: sosyal.length > 0,
      alt: sosyal.length ? `${sosyal.length} beceri` : undefined,
      /*
        Konuşma balonu "mesaj" demek. Beceri bir yetkinlik; rozet/parıltı
        anlamı taşıyor.
      */
      ikon: <Sparkles className="w-5 h-5" />,
      onClick: () => bolumeGit('sosyal'),
    },
    {
      id: 'dil',
      etiket: 'Diller',
      dolu: diller.length > 0,
      alt: diller.length ? `${diller.length} dil` : undefined,
      ikon: <Languages className="w-5 h-5" />,
      onClick: () => bolumeGit('dil'),
    },
    {
      id: 'proje',
      /* Bölümün adı "Projeler ve çalışmalar"; "Çalışmalar" tek başına ne
         kastedildiğini söylemiyordu. */
      etiket: 'Projeler',
      dolu: projeler.length > 0,
      alt: projeler.length ? `${projeler.length} proje` : undefined,
      ikon: <FolderOpen className="w-5 h-5" />,
      onClick: () => bolumeGit('proje'),
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
            durum={durum}
            onEtiketDuzenle={() => bolumeGit('tercih')}
            oran={oran}
            eksikler={eksikler}
            kaydedilenSayisi={kaydedilenSayisi}
            basvuruSayisi={basvuruSayisi}
            mulakatSayisi={mulakatSayisi}
            avatarYukleniyor={avatarYukleniyor}
            onFotografSec={() => dosyaRef.current?.click()}
            onDuzenle={kisiselAc}
            onCv={
              onOpenCv
                ? () => {
                    /*
                      Eksik profilden indirilen CV de eksik çıkıyor ve
                      öğrenci bunu ancak dosyayı açınca fark ediyordu.
                      Uyarı indirmeyi engellemiyor — neyin eksik olduğunu
                      söyleyip kararı öğrenciye bırakıyor.
                    */
                    if (eksikler.length > 0) setCvUyarisi(true);
                    else onOpenCv();
                  }
                : undefined
            }
            onKaydedilenlere={onKaydedilenlere}
            onBasvurulara={basvuruListesi ? () => bolumeGit('basvuru') : undefined}
            onMulakatlara={
              basvuruListesi
                ? () => {
                    bolumeGit('basvuru');
                    /* Mülakat sayısına basan kişi mülakatları görmek istiyor. */
                    onSubTabChange?.('interviews');
                  }
                : undefined
            }
            oneCikanlar={oneCikanlar}
            secili={acikBolum}
          />

          {/*
            KARİYER HEDEFİ AYRI KART

            "Hedefin" profil bilgileri listesindeydi ama ötekilerle aynı
            cinsten değil: okul, program, beceri, dil ve proje GEÇMİŞİ
            anlatıyor; hedef GELECEĞİ. Aynı listede durunca doldurulacak
            bir alan gibi görünüyordu.
          */}
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            <span className={`${IKON_KUTUSU} ${IKON_TONU}`}>
              <Target className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900">Kariyer hedefin</p>
              <p className="truncate text-sm text-gray-600">
                {hedefler.length > 0
                  ? hedefler.join(' · ')
                  : 'Hangi alanda ilerlemek istediğini yaz; ilanlar ona göre sıralanıyor.'}
              </p>
            </div>
            <Button tur="secondary" onClick={() => bolumeGit('tercih')} className="shrink-0">
              {hedefler.length > 0 ? 'Düzenle' : 'Hedefini seç'}
            </Button>
          </Card>

          {/*
            TESTLER SIRADAN BİR PROFİL ALANI DEĞİL

            Izgarada kesik çizgili bir daireydi ve "tamamlanmamış ya da
            devre dışı" görünüyordu. Oysa burada doldurulacak bir alan yok:
            hazır testler var ve çözülüyor — bu bir EYLEM, bir form değil.

            Ayrı ve geniş bir kart olarak duruyor; ne olduğunu ve neden
            yapılacağını söylüyor.
          */}
          <Card vurgulu className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Award className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900">Yetkinlik testleri</p>
              <p className="text-sm leading-relaxed text-gray-600">
                Profilini güçlendir; güçlü yönlerini işverene göster.
              </p>
            </div>
            <Button onClick={() => bolumeGit('rozet')} className="shrink-0">
              {(student.earnedBadges ?? []).length > 0
                ? `${(student.earnedBadges ?? []).length} rozet · Devam et`
                : 'Teste başla'}
            </Button>
          </Card>

          <input
            type="file"
            ref={dosyaRef}
            accept="image/*"
            className="hidden"
            onChange={fotografSec}
          />
          {avatarHatasi && <p className="text-xs text-rose-600 px-1">{avatarHatasi}</p>}

          {/*
            CV UYARISI

            İndirmeyi engellemiyor: öğrencinin eksik profille CV indirmesi
            geçerli bir tercih olabilir (staja bugün başvuracaktır). Uyarı
            yalnızca neyin eksik kalacağını söylüyor ve düzeltmeyi bir
            dokunuş uzağa koyuyor.
          */}
          {cvUyarisi && onOpenCv && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
              <div
                ref={cvKutuRef}
                role="dialog"
                aria-modal="true"
                className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <h2 className="text-base font-extrabold text-gray-900">
                    CV'n eksik bilgilerle inecek
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Şunlar henüz girilmedi:{' '}
                    <strong className="text-gray-900">
                      {eksikler.map((e) => e.etiket).join(', ')}
                    </strong>
                    . İşveren CV'de bu bölümleri boş görecek.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCvUyarisi(false);
                      eksikler[0]?.onClick();
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Önce tamamla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCvUyarisi(false);
                      onOpenCv();
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Yine de indir
                  </button>
                </div>
              </div>
            </div>
          )}

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
          baslik="Başvurularım"
          /*
            Özet "2 başvuru" yazıyordu; hemen üstteki ızgarada zaten
            "Başvurular · 2" duruyordu. Aynı sayıyı iki kez söylemek yerine
            sürecin nerede olduğunu söylüyor.
          */
          ozet={
            basvuruSayisi > 0
              ? `${basvuruSayisi} başvuru · ${degerlendirmede} değerlendirmede · ${mulakatSayisi} mülakat`
              : 'Henüz başvuru yok — ilanlara göz at'
          }
          /*
            Yeşil tik "bu bölüm tamamlandı" demek ve başvuru sürecinde
            böyle bir tamamlanma yok — süreç işverende devam ediyor.
            Başvuru yapmış olmak bir bitiş değil.
          */
          tamam={false}
          acik={acikBolum === 'basvuru'}
          onToggle={bolumAc}
        >
          {basvuruListesi}
        </Bolum>
      )}

      {/* ---------------- CV ---------------- */}
      <Bolum
        id="cv"
        gorunur={acikBolum === 'cv'}
        ikon={<FileText className="w-5 h-5" />}
        baslik="CV"
        ozet={
          student.cvPath
            ? 'Başvurularına bu belge ekleniyor'
            : 'PDF yükle, başvurularına eklensin'
        }
        tamam={Boolean(student.cvPath)}
        acik={acikBolum === 'cv'}
        onToggle={() => bolumeGit('cv')}
      >
        <CvAlani
          userId={student.id}
          cvPath={student.cvPath}
          onDegisti={(yeniYol) => onUpdateProfile({ cvPath: yeniYol ?? '' })}
        />
      </Bolum>

      {/* ---------------- 1. Kişisel bilgiler ---------------- */}
      <Bolum
        id="kisisel"
        gorunur={acikBolum === 'kisisel'}
        ikon={<GraduationCap className="w-5 h-5" />}
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
            {taslak.fullName.trim() &&
              adYazimi(taslak.fullName) !== taslak.fullName.trim() && (
                <button
                  type="button"
                  onClick={() =>
                    setTaslak({ ...taslak, fullName: adYazimi(taslak.fullName) })
                  }
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {adYazimi(taslak.fullName)} olarak yaz
                </button>
              )}
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
            <p className="text-[11px] text-gray-600 mt-1">
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
        ikon={<LayoutGrid className="w-5 h-5" />}
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
        <p className="text-[11px] text-gray-600">
          Seviyeyi değiştirmek için rozetin üstündeki yazıya dokun.
        </p>
      </Bolum>

      {/* ---------------- 3. Sosyal beceriler ---------------- */}
      <Bolum
        id="sosyal"
        gorunur={acikBolum === 'sosyal'}
        ikon={<Sparkles className="w-5 h-5" />}
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
          <p className="text-[11px] text-gray-600 mt-1">
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

      {/*
        HESAP EYLEMLERİ — SAYFANIN EN ALTI

        Üst çubuktaki avatar menüsü mobilde kaldırıldı; oradaki iki gerçek
        eylem (yönetim paneli ve çıkış) buraya indi. Menünün diğer
        satırları ("Profilim ve CV", "Başvurularım", "Rozetler ve testler")
        zaten bu sayfanın kendisiydi.

        Çıkış kırmızı ama DOLU DEĞİL: dolu kırmızı bir düğme, sayfadaki en
        güçlü eylemin "hesabımdan çık" olduğunu söylerdi. Kenarlıkla
        veriliyor — bulunur ama çağırmaz.
      */}
      {(onLogout || (isAdmin && onOpenAdmin)) && (
        <div className="mt-6 flex flex-col gap-2 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
          {isAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Yönetim paneli
            </button>
          )}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Çıkış yap
            </button>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
