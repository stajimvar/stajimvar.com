/**
 * Kural tabanlı CV ayrıştırıcı — Gemini'nin parse-resume ucunun yerini alır.
 *
 * Tamamen tarayıcıda çalışır: sunucu yok, anahtar yok, gecikme yok, maliyet yok.
 * Yaklaşım: sözlük eşleştirme + bölüm başlığı tespiti + desen çıkarımı.
 *
 * DÜRÜSTLÜK NOTU: Bu bir dil modeli değil. Serbest metinden çıkarım yapar ve
 * hata yapar. Bu yüzden her alanın yanında `confidence` döner ve arayüz
 * kullanıcıya "kontrol et ve düzelt" akışı sunmalıdır — sessizce kabul etmemeli.
 */

import {
  HARD_SKILLS_DICTIONARY,
  SOFT_SKILLS_DICTIONARY,
  LANGUAGES_DICTIONARY,
  normalizeSearch,
} from '../data/skillsDictionary';
import type { SkillCategory, SkillLevel } from '../types';

export type Confidence = 'high' | 'medium' | 'low';

export interface ParsedField<T> {
  value: T;
  confidence: Confidence;
}

export interface ParsedResume {
  fullName: ParsedField<string>;
  university: ParsedField<string>;
  department: ParsedField<string>;
  graduationYear: ParsedField<number | null>;
  gpa: ParsedField<number | null>;
  email: ParsedField<string>;
  phone: ParsedField<string>;
  githubUsername: ParsedField<string>;
  linkedinUrl: ParsedField<string>;
  bio: string;
  skills: Array<{ name: string; level: SkillLevel; category: SkillCategory }>;
  softSkills: string[];
  languages: Array<{ language: string; level: string; proficiencyText: string }>;
  projects: Array<{ title: string; description: string; techStack: string[] }>;
  targetRoles: string[];
  recommendedNextSteps: string[];
  /** Ayrıştırıcının okuyamadığı, kullanıcının elle girmesi gereken alanlar. */
  needsReview: string[];
}

// ---------------------------------------------------------------------------
// Beceri → kategori haritası
// Sözlükteki başlıklardan türetildi. Eşleşmeyen her şey 'General' olur.
// ---------------------------------------------------------------------------

const CATEGORY_RULES: Array<{ match: RegExp; category: SkillCategory }> = [
  { match: /react|vue|angular|next\.js|tailwind|bootstrap|sass|html|css|javascript|typescript/i, category: 'Frontend' },
  { match: /node|express|django|fastapi|flask|spring|laravel|\.net|php|graphql|rest api|golang|^go$|rust|java|c#/i, category: 'Backend' },
  { match: /react native|flutter|swift|kotlin|ios|android/i, category: 'Mobile' },
  { match: /machine learning|makine öğren|deep learning|derin öğren|pandas|numpy|scikit|pytorch|tensorflow|nlp|doğal dil|opencv|bilgisayarlı görü|power bi|tableau|spark|hadoop|matplotlib|veri görsel|rag|prompt/i, category: 'Data/AI' },
  { match: /docker|kubernetes|ci\/cd|aws|azure|google cloud|gcp|linux|bash|nginx|gitlab|git ?& ?github/i, category: 'DevOps/Cloud' },
  { match: /figma|adobe|xd|photoshop|illustrator|premiere|after effects|canva|blender|ui\/ux|design/i, category: 'UI/UX Design' },
  { match: /sql|postgres|mysql|mongo|redis|sqlite|firebase|supabase|oracle/i, category: 'Backend' },
  { match: /excel|powerpoint|sap|spss|finansal|analytics|seo|pazarlama|sheets/i, category: 'General' },
  { match: /autocad|solidworks|matlab|ansys|revit|unity|unreal/i, category: 'General' },
];

function categorize(skill: string): SkillCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.match.test(skill)) return rule.category;
  }
  return 'General';
}

// ---------------------------------------------------------------------------
// Seviye çıkarımı
// CV'de becerinin yakınında geçen niteleyicilere bakar.
// ---------------------------------------------------------------------------

const LEVEL_HINTS: Array<{ match: RegExp; level: SkillLevel }> = [
  { match: /uzman|expert|ileri düzey|advanced|profesyonel|\b[4-9]\+? ?(yıl|year)/i, level: 'Advanced' },
  { match: /orta|intermediate|iyi derecede|\b[23] ?(yıl|year)/i, level: 'Intermediate' },
  { match: /başlangıç|temel|beginner|basic|giriş|öğreniyorum|learning/i, level: 'Beginner' },
];

function inferLevel(text: string, skill: string): SkillLevel {
  // Becerinin geçtiği yerin ±60 karakterlik penceresine bak.
  const idx = normalizeSearch(text).indexOf(normalizeSearch(skill));
  if (idx === -1) return 'Intermediate';
  const window = text.slice(Math.max(0, idx - 60), idx + skill.length + 60);
  for (const hint of LEVEL_HINTS) {
    if (hint.match.test(window)) return hint.level;
  }
  return 'Intermediate';
}

// ---------------------------------------------------------------------------
// Desen çıkarıcılar
// ---------------------------------------------------------------------------

const RE = {
  email: /[\w.+-]+@[\w-]+\.[\w.]{2,}/,
  phone: /(?:\+90[\s.-]?)?0?[\s.(-]?5\d{2}[\s.)-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/,
  github: /github\.com\/([A-Za-z0-9-]+)/i,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9-]+/i,
  university: /([A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ.]*(?:\s+[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ.]*){0,4}\s+Üniversitesi)/,
  // "3.42 / 4.00", "GNO: 3,42", "Ortalama 3.42"
  gpa: /(?:gno|ağırlıklı ortalama|ortalama|gpa|not ortalaması)\D{0,12}([0-4][.,]\d{1,2})/i,
  gradYear: /(?:mezuniyet|graduation|beklenen mezuniyet)\D{0,20}(20\d{2})/i,
  yearRange: /20\d{2}\s*[-–—]\s*(20\d{2})/,
};

const DEPARTMENT_KEYWORDS = [
  'Bilgisayar Mühendisliği', 'Yazılım Mühendisliği', 'Elektrik-Elektronik Mühendisliği',
  'Endüstri Mühendisliği', 'Makine Mühendisliği', 'İnşaat Mühendisliği',
  'Yapay Zeka Mühendisliği', 'Bilişim Sistemleri Mühendisliği', 'Mekatronik Mühendisliği',
  'Kimya Mühendisliği', 'Gıda Mühendisliği', 'Biyomedikal Mühendisliği',
  'İşletme', 'İktisat', 'Ekonomi', 'Uluslararası İlişkiler', 'Hukuk',
  'İstatistik', 'Matematik', 'Fizik', 'Moleküler Biyoloji ve Genetik',
  'Yönetim Bilişim Sistemleri', 'Grafik Tasarım', 'Endüstriyel Tasarım',
  'İletişim', 'Halkla İlişkiler', 'Psikoloji', 'Mimarlık',
];

/** Bölüm başlıklarına göre metni parçalara ayırır. */
function splitSections(text: string): Record<string, string> {
  const headings: Record<string, RegExp> = {
    projects: /^\s*(projeler|projects|kişisel projeler|proje deneyimi)\s*:?\s*$/im,
    experience: /^\s*(deneyim|experience|iş deneyimi|staj deneyimi)\s*:?\s*$/im,
    education: /^\s*(eğitim|education|öğrenim)\s*:?\s*$/im,
    skills: /^\s*(beceriler|yetenekler|skills|teknik beceriler|yetkinlikler)\s*:?\s*$/im,
  };

  const lines = text.split(/\r?\n/);
  const marks: Array<{ key: string; line: number }> = [];

  lines.forEach((line, i) => {
    for (const [key, re] of Object.entries(headings)) {
      if (re.test(line)) marks.push({ key, line: i });
    }
  });

  const out: Record<string, string> = {};
  marks.forEach((mark, i) => {
    const end = marks[i + 1]?.line ?? lines.length;
    out[mark.key] = lines.slice(mark.line + 1, end).join('\n').trim();
  });
  return out;
}

/** Proje bölümünden madde madde proje çıkarır. */
function extractProjects(section: string): ParsedResume['projects'] {
  if (!section) return [];

  // Madde işareti veya boş satırla ayrılmış bloklar
  const blocks = section
    .split(/\n(?=\s*[-•*▪]\s|\s*\d+[.)]\s)|\n\s*\n/)
    .map((b) => b.replace(/^\s*[-•*▪]\s*|\s*\d+[.)]\s*/, '').trim())
    .filter((b) => b.length > 10);

  return blocks.slice(0, 6).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const title = (lines[0] || '').replace(/[:—–-]\s*$/, '').slice(0, 90);
    const description = lines.slice(1).join(' ').slice(0, 280) || lines[0].slice(0, 280);

    const techStack = HARD_SKILLS_DICTIONARY.filter((s) =>
      normalizeSearch(block).includes(normalizeSearch(s.split(' (')[0]))
    ).slice(0, 8);

    return { title, description, techStack };
  });
}

/** Metnin başındaki ad-soyad tahmini. */
function extractName(text: string): ParsedField<string> {
  const firstLines = text.split(/\r?\n/).slice(0, 6).map((l) => l.trim()).filter(Boolean);

  for (const line of firstLines) {
    // 2-4 kelime, hepsi büyük harfle başlıyor, rakam/e-posta içermiyor
    if (
      /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){1,3}$/.test(line) &&
      !/\d|@/.test(line) &&
      line.length < 50
    ) {
      return { value: line, confidence: 'high' };
    }
    // Tamamı büyük harf varyantı: "AHMET YILMAZ"
    if (/^[A-ZÇĞİÖŞÜ]{2,}(?:\s+[A-ZÇĞİÖŞÜ]{2,}){1,3}$/.test(line) && line.length < 50) {
      const titled = line
        .split(/\s+/)
        .map((w) => w[0] + w.slice(1).toLocaleLowerCase('tr-TR'))
        .join(' ');
      return { value: titled, confidence: 'medium' };
    }
  }
  return { value: '', confidence: 'low' };
}

// ---------------------------------------------------------------------------
// Ana fonksiyon
// ---------------------------------------------------------------------------

export function parseResume(text: string): ParsedResume {
  const sections = splitSections(text);
  const needsReview: string[] = [];

  const track = <T>(label: string, field: ParsedField<T>): ParsedField<T> => {
    if (field.confidence === 'low') needsReview.push(label);
    return field;
  };

  // --- Kimlik ---
  const fullName = track('Ad Soyad', extractName(text));

  const emailMatch = text.match(RE.email);
  const email: ParsedField<string> = emailMatch
    ? { value: emailMatch[0], confidence: 'high' }
    : { value: '', confidence: 'low' };
  track('E-posta', email);

  const phoneMatch = text.match(RE.phone);
  const phone: ParsedField<string> = phoneMatch
    ? { value: phoneMatch[0].replace(/\s+/g, ' ').trim(), confidence: 'medium' }
    : { value: '', confidence: 'low' };

  const ghMatch = text.match(RE.github);
  const githubUsername: ParsedField<string> = ghMatch
    ? { value: ghMatch[1], confidence: 'high' }
    : { value: '', confidence: 'low' };

  const liMatch = text.match(RE.linkedin);
  const linkedinUrl: ParsedField<string> = liMatch
    ? { value: liMatch[0].startsWith('http') ? liMatch[0] : `https://${liMatch[0]}`, confidence: 'high' }
    : { value: '', confidence: 'low' };

  // --- Eğitim ---
  const uniMatch = (sections.education || text).match(RE.university);
  const university = track('Üniversite', uniMatch
    ? { value: uniMatch[1].trim(), confidence: 'high' as Confidence }
    : { value: '', confidence: 'low' as Confidence });

  const foundDept = DEPARTMENT_KEYWORDS.find((d) =>
    normalizeSearch(text).includes(normalizeSearch(d))
  );
  const department = track('Bölüm', foundDept
    ? { value: foundDept, confidence: 'high' as Confidence }
    : { value: '', confidence: 'low' as Confidence });

  let gradYear: ParsedField<number | null> = { value: null, confidence: 'low' };
  const gyExplicit = text.match(RE.gradYear);
  const gyRange = (sections.education || text).match(RE.yearRange);
  if (gyExplicit) {
    gradYear = { value: parseInt(gyExplicit[1], 10), confidence: 'high' };
  } else if (gyRange) {
    gradYear = { value: parseInt(gyRange[1], 10), confidence: 'medium' };
  }
  track('Mezuniyet Yılı', gradYear);

  const gpaMatch = text.match(RE.gpa);
  const gpa: ParsedField<number | null> = gpaMatch
    ? { value: parseFloat(gpaMatch[1].replace(',', '.')), confidence: 'high' }
    : { value: null, confidence: 'low' };

  // --- Beceriler ---
  const normText = normalizeSearch(text);

  const skills = HARD_SKILLS_DICTIONARY
    .filter((s) => {
      // Parantezli açıklamayı at: "Git & GitHub" → "Git & GitHub", "MATLAB & Simulink" → tam ad
      const core = s.split(' (')[0];
      return normText.includes(normalizeSearch(core));
    })
    .map((name) => ({
      name,
      level: inferLevel(text, name.split(' (')[0]),
      category: categorize(name),
    }));

  const softSkills = SOFT_SKILLS_DICTIONARY.filter((s) => {
    // Uzun ifadeler nadiren birebir geçer; ilk iki kelimeye bak.
    const stem = s.split(/\s+ve\s+|\s*\(/)[0];
    return normText.includes(normalizeSearch(stem));
  }).slice(0, 8);

  const languages = LANGUAGES_DICTIONARY
    .filter((l) => normText.includes(normalizeSearch(l.name)))
    .map((l) => {
      // Dilin yanında CEFR seviyesi yazıyor mu?
      const idx = normText.indexOf(normalizeSearch(l.name));
      const window = text.slice(idx, idx + 60);
      const cefr = window.match(/\b([ABC][12])\b/);
      return {
        language: l.name,
        level: cefr ? cefr[1] : l.defaultLevel,
        proficiencyText: cefr ? `${cefr[1]} seviyesi` : l.defaultText,
      };
    });

  if (skills.length === 0) needsReview.push('Teknik Beceriler');

  // --- Projeler ---
  const projects = extractProjects(sections.projects || sections.experience || '');
  if (projects.length === 0) needsReview.push('Projeler');

  // --- Türetilmiş alanlar ---
  const targetRoles = suggestRoles(skills.map((s) => s.category));
  const bio = buildBio(fullName.value, department.value, university.value, skills);
  const recommendedNextSteps = buildNextSteps(skills, projects, githubUsername.value);

  return {
    fullName, university, department, graduationYear: gradYear, gpa,
    email, phone, githubUsername, linkedinUrl,
    bio, skills, softSkills, languages, projects,
    targetRoles, recommendedNextSteps,
    needsReview: [...new Set(needsReview)],
  };
}

// ---------------------------------------------------------------------------
// Türetilmiş içerik
// ---------------------------------------------------------------------------

function suggestRoles(categories: SkillCategory[]): string[] {
  const count = categories.reduce<Record<string, number>>((acc, c) => {
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});

  const roleMap: Record<string, string> = {
    Frontend: 'Frontend Developer Stajyeri',
    Backend: 'Backend Developer Stajyeri',
    Mobile: 'Mobil Uygulama Stajyeri',
    'Data/AI': 'Veri Bilimi / Yapay Zeka Stajyeri',
    'DevOps/Cloud': 'DevOps & Cloud Stajyeri',
    'UI/UX Design': 'UI/UX Tasarım Stajyeri',
  };

  return Object.entries(count)
    .filter(([cat]) => roleMap[cat])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => roleMap[cat]);
}

function buildBio(
  name: string,
  department: string,
  university: string,
  skills: ParsedResume['skills'],
): string {
  const top = skills.slice(0, 4).map((s) => s.name.split(' (')[0]);
  const who = [department, university].filter(Boolean).join(' — ');

  if (!who && top.length === 0) return '';
  if (top.length === 0) return `${who} öğrencisi.`;

  return `${who || 'Üniversite'} öğrencisi. ${top.join(', ')} alanlarında çalışıyor, staj döneminde bu becerilerini gerçek ürünlerde kullanmak istiyor.`;
}

function buildNextSteps(
  skills: ParsedResume['skills'],
  projects: ParsedResume['projects'],
  github: string,
): string[] {
  const steps: string[] = [];

  if (!github) {
    steps.push('CV\'ne GitHub profilini ekle — işverenlerin ilk baktığı yer burası.');
  }
  if (projects.length === 0) {
    steps.push('En az bir proje ekle. Küçük ama bitmiş bir proje, yarım kalmış büyük projeden daha etkili.');
  } else if (projects.every((p) => p.techStack.length === 0)) {
    steps.push('Projelerinin yanına kullandığın teknolojileri yaz; eşleştirme puanını doğrudan yükseltir.');
  }
  if (skills.length < 5) {
    steps.push('Profilindeki beceri sayısı az görünüyor. Derslerde kullandığın araçları da ekle.');
  }
  if (skills.length > 0 && !skills.some((s) => s.level === 'Advanced')) {
    steps.push('Bir beceride derinleşip "İleri" seviyeye çıkmak, on beceride başlangıç olmaktan daha değerli.');
  }

  steps.push('Beceri sınavlarını çöz — doğrulanmış rozetler eşleşme puanına ek katkı sağlıyor.');
  return steps.slice(0, 4);
}
