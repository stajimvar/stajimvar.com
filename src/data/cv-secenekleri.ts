/**
 * CV VE PROFİL İÇİN HIZLI EKLEME SEÇENEKLERİ
 *
 * Profil düzenleme ekranı ile kayıt sonrası CV oluşturma ekranı aynı
 * listeyi gösteriyor; iki kopya olsaydı biri değiştiğinde öteki geride
 * kalırdı. Listede olmayan program `HARD_SKILLS_DICTIONARY` önerileriyle
 * elle yazılabiliyor. Sayı şartı yok.
 */
export const POPULER_ARACLAR = [
  'Python', 'JavaScript', 'React', 'SQL', 'Git & GitHub', 'HTML / CSS',
  'Excel (İleri)', 'AutoCAD', 'SolidWorks', 'Photoshop', 'Figma', 'Canva',
];

export const ONERILEN_SOSYAL = [
  'Problem Çözme',
  'Ekip Çalışması',
  'İletişim',
  'Zaman Yönetimi',
  'Hızlı Öğrenme',
  'Sunum Becerisi',
  'Detaylara Dikkat',
  'Sorumluluk Alma',
];

/*
  ÇOKLU SEÇİM İÇİN GRUPLU YETENEKLER (10 Ekim 2026)

  Öğrenci her yeteneği tek tek yazmak zorunda kalmasın diye profil
  düzenleme ekranında tek dokunuşla seçilen etiketler. Gruplar yalnız
  bulmayı kolaylaştırıyor; öğrenci kendi bölümünün grubuyla SINIRLI
  DEĞİL — hepsi her zaman görünüyor.

  `tur` verinin nereye yazılacağını söylüyor: 'program' → student_skills
  (araç ve yazılımlar, seviyesi olan şeyler), 'beceri' → soft_skills.
  Ayrım yeni değil; ekran zaten "Programlar" ve "Beceriler" diye ikiye
  ayırıyordu.
*/
export type YetenekTuru = 'program' | 'beceri';
export interface YetenekGrubu {
  baslik: string;
  ogeler: { ad: string; tur: YetenekTuru }[];
}

const p = (ad: string) => ({ ad, tur: 'program' as const });
const b = (ad: string) => ({ ad, tur: 'beceri' as const });

export const YETENEK_GRUPLARI: YetenekGrubu[] = [
  {
    baslik: 'Kişisel beceriler',
    ogeler: [
      b('İletişim'), b('Ekip Çalışması'), b('Problem Çözme'), b('Zaman Yönetimi'),
      b('Analitik Düşünme'), b('Liderlik'), b('Sunum Becerisi'), b('Detaylara Dikkat'),
      b('Hızlı Öğrenme'), b('Sorumluluk Alma'), b('Müşteri İlişkileri'), b('Proje Yönetimi'),
    ],
  },
  {
    baslik: 'Ofis ve verimlilik',
    ogeler: [p('Microsoft Office'), p('Microsoft Excel'), p('Microsoft Word'), p('PowerPoint'), p('Google Workspace'), p('Notion')],
  },
  {
    baslik: 'Tasarım',
    ogeler: [p('Canva'), p('Figma'), p('Photoshop'), p('Illustrator'), p('InDesign'), p('AutoCAD')],
  },
  {
    baslik: 'Yazılım ve veri',
    ogeler: [p('Python'), p('SQL'), p('JavaScript'), p('React'), p('Git & GitHub'), p('HTML / CSS'), p('Power BI'), p('Tableau')],
  },
  {
    baslik: 'Satış ve pazarlama',
    ogeler: [b('Satış'), b('Dijital Pazarlama'), b('Sosyal Medya Yönetimi'), b('SEO'), p('Google Analytics'), p('CRM')],
  },
  {
    baslik: 'Üretim, tekstil ve mühendislik',
    ogeler: [
      b('Üretim Planlama'), b('Kalite Kontrol'), b('Tekstil Üretimi'), b('Kalıp ve Model'),
      b('Teknik Çizim'), b('Yalın Üretim'), p('SolidWorks'),
    ],
  },
  {
    baslik: 'Finans ve muhasebe',
    ogeler: [b('Finansal Analiz'), b('Muhasebe'), b('Bütçe Planlama'), p('SAP'), p('Logo')],
  },
];

/** İlgi alanları — CV'nin sol sütunundaki "İlgi alanları" bölümü. Öğrenci kendisi de ekleyebiliyor. */
export const ILGI_ALANLARI = [
  'Moda ve Tekstil', 'Tasarım', 'Fotoğraf', 'Seyahat', 'Spor', 'Müzik', 'Kitap', 'Sinema',
  'Teknoloji', 'Yazılım', 'Girişimcilik', 'Gönüllülük', 'Doğa', 'Yemek', 'Sanat', 'Dans',
  'Resim', 'Oyun', 'Bilim', 'Tarih',
];
