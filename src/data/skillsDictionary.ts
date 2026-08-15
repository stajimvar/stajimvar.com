export interface SkillSuggestion {
  name: string;
  category: 'hard_skills' | 'soft_skills' | 'languages';
  subcategory?: string;
  badge?: string;
}

export const HARD_SKILLS_DICTIONARY: string[] = [
  // Yazılım Dilleri & Frameworkler
  'React',
  'React Native',
  'TypeScript',
  'JavaScript (ES6+)',
  'Next.js',
  'Vue.js',
  'Angular',
  'Node.js',
  'Express.js',
  'Python',
  'Django',
  'FastAPI',
  'Flask',
  'Java',
  'Spring Boot',
  'C#',
  '.NET Core',
  'C++',
  'C Programlama',
  'Go (Golang)',
  'Rust',
  'PHP',
  'Laravel',
  'Swift (iOS)',
  'Kotlin (Android)',
  'Flutter (Dart)',
  'HTML5 / CSS3',
  'Tailwind CSS',
  'Bootstrap',
  'Sass / SCSS',
  'GraphQL',
  'REST API & Webhook',
  
  // Veritabanı & Cloud & DevOps
  'SQL',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'SQLite',
  'Firebase Firestore',
  'Supabase',
  'Oracle Database',
  'Microsoft SQL Server',
  'Git & GitHub',
  'GitLab',
  'Docker',
  'Kubernetes',
  'CI/CD Pipelines (GitHub Actions)',
  'Amazon Web Services (AWS)',
  'Google Cloud Platform (GCP)',
  'Microsoft Azure',
  'Linux & Bash Scripting',
  'Nginx',
  
  // Veri, Yapay Zeka & Makine Öğrenimi
  'Makine Öğrenmesi (Machine Learning)',
  'Derin Öğrenme (Deep Learning)',
  'Python Pandas',
  'NumPy',
  'Scikit-Learn',
  'PyTorch',
  'TensorFlow',
  'Doğal Dil İşleme (NLP)',
  'Büyük Dil Modelleri & RAG Mimarisi',
  'Prompt Mühendisliği (Prompt Engineering)',
  'Bilgisayarlı Görü (Computer Vision & OpenCV)',
  'Power BI',
  'Tableau',
  'Veri Görselleştirme (Matplotlib / Seaborn)',
  'Büyük Veri (Apache Spark / Hadoop)',
  
  // İş, Ofis, Raporlama & Finans
  'MS Excel (İleri Düzey / VLOOKUP & Pivot)',
  'Excel VBA & Makro Programlama',
  'Google Sheets & AppScript',
  'MS PowerPoint (Profesyonel Sunum)',
  'SAP ERP Modülleri',
  'SPSS İstatistiksel Analiz',
  'Finansal Modelleme & Bütçe Yönetimi',
  'Google Analytics 4 & Tag Manager',
  'Arama Motoru Optimizasyonu (SEO)',
  'Dijital Pazarlama & Meta Reklamları',
  
  // Tasarım, Modelleme & Mühendislik Araçları
  'Figma (UI/UX & Design Systems)',
  'Adobe XD',
  'Adobe Photoshop',
  'Adobe Illustrator',
  'Adobe Premiere Pro',
  'Adobe After Effects',
  'Canva Pro',
  'AutoCAD',
  'SolidWorks',
  'MATLAB & Simulink',
  'ANSYS Simülasyon',
  'Revit (BIM)',
  'Blender 3D',
  'Unity 3D (C#)',
  'Unreal Engine (C++)',
];

export const SOFT_SKILLS_DICTIONARY: string[] = [
  'Problem Çözme ve Analitik Düşünme',
  'Ekip Çalışması ve Çapraz Fonksiyonel İletişim',
  'Zaman Yönetimi ve Önceliklendirme',
  'Hızlı Öğrenme ve Araştırma Yeteneği',
  'Sunum ve Raporlama Becerisi',
  'Kriz ve Risk Yönetimi',
  'Stres Yönetimi ve Soğukkanlılık',
  'Liderlik ve İnisiyatif Alma',
  'Çatışma Yönetimi ve Müzakere',
  'Müşteri ve Kullanıcı Odaklılık',
  'Duygusal Zeka (EQ) ve Empati',
  'Stratejik ve Yaratıcı Düşünme',
  'Geri Bildirime Açıklık ve Öz Eleştiri',
  'Detay Odaklılık ve Titizlik',
  'Proje ve Görev Takibi',
  'İkna Kabiliyeti ve Etkili İletişim',
  'Agile / Scrum Çalışma Kültürü',
  'Uzaktan (Remote) Çalışma ve Öz Disiplin',
  'Değişim Yönetimi ve Esneklik',
  'Aktif Dinleme ve Anlatım Yeteneği',
  'Tasarım Odaklı Düşünme (Design Thinking)',
  'Veriye Dayalı Karar Verme',
  'Sorumluluk Bilinci ve İş Etiği',
  'Networking ve İlişki Yönetimi',
  'Merak ve Sürekli Gelişim Zihniyeti',
  'Zorlu Müşteri / Paydaş İletişimi',
  'Hedef ve Çıktı Odaklılık (OKR / KPI)',
];

export const LANGUAGES_DICTIONARY: Array<{
  name: string;
  defaultLevel: string;
  defaultText: string;
}> = [
  { name: 'İngilizce', defaultLevel: 'B2', defaultText: 'B2 - Profesyonel Çalışma Yetkinliği / İleri' },
  { name: 'Almanca', defaultLevel: 'B1', defaultText: 'B1 - Orta Düzey İletişim' },
  { name: 'Fransızca', defaultLevel: 'B1', defaultText: 'B1 - Orta Düzey' },
  { name: 'İspanyolca', defaultLevel: 'A2', defaultText: 'A2 - Temel İletişim' },
  { name: 'İtalyanca', defaultLevel: 'A2', defaultText: 'A2 - Temel İletişim' },
  { name: 'Rusça', defaultLevel: 'A2', defaultText: 'A2 - Temel Düzey' },
  { name: 'Çince (Mandarin)', defaultLevel: 'A1', defaultText: 'A1 - Başlangıç' },
  { name: 'Japonca', defaultLevel: 'A1', defaultText: 'A1 - Başlangıç' },
  { name: 'Arapça', defaultLevel: 'A2', defaultText: 'A2 - Temel' },
  { name: 'Felemenkçe (Hollandaca)', defaultLevel: 'A2', defaultText: 'A2 - Temel' },
  { name: 'Korece', defaultLevel: 'A1', defaultText: 'A1 - Başlangıç' },
  { name: 'Portekizce', defaultLevel: 'A2', defaultText: 'A2 - Temel' },
  { name: 'İsveççe', defaultLevel: 'A2', defaultText: 'A2 - Temel' },
  { name: 'Türkçe', defaultLevel: 'C2', defaultText: 'C2 - Anadil Düzeyi' },
];

/**
 * Normalizes text for Turkish-aware and case-insensitive matching
 */
export function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .trim();
}

/**
 * Finds matching predictions from a list based on input prefix or contains
 */
export function findPredictions(
  query: string,
  pool: string[],
  excludeList: string[] = [],
  maxResults: number = 6
): string[] {
  if (!query.trim()) return [];
  const normalizedQuery = normalizeSearch(query);
  const normalizedExcludes = excludeList.map((item) => normalizeSearch(item));

  // 1. Starts with matches (highest priority)
  const startsWithMatches = pool.filter((item) => {
    const norm = normalizeSearch(item);
    return norm.startsWith(normalizedQuery) && !normalizedExcludes.includes(norm);
  });

  // 2. Contains matches (secondary priority)
  const containsMatches = pool.filter((item) => {
    const norm = normalizeSearch(item);
    return (
      !norm.startsWith(normalizedQuery) &&
      norm.includes(normalizedQuery) &&
      !normalizedExcludes.includes(norm)
    );
  });

  return [...startsWithMatches, ...containsMatches].slice(0, maxResults);
}
