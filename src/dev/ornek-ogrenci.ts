import type { StudentProfile } from '../types';

/**
 * GELİŞTİRME FİKSTÜRLERİ İÇİN ÖRNEK ÖĞRENCİ — uydurma bir kişi.
 *
 * CV belgesi ve profil düzenleme fikstürleri aynı veriyi kullanıyor:
 * profilde değişen bir şeyin CV'ye yansıdığı tek kaynaktan görülsün.
 * Ad, kurumlar ve bağlantılar örnek; fotoğraf sitedeki temsili görsel.
 * Üretim paketine girmiyor.
 */
export const ORNEK_OGRENCI: StudentProfile = {
  id: '00000000-0000-4000-8000-0000000000cv',
  fullName: 'Deniz Yılmaz Karaca',
  email: 'deniz.karaca@ornek.com',
  phone: '+90 555 000 00 00',
  university: 'Mimar Sinan Güzel Sanatlar Üniversitesi',
  faculty: 'Mimarlık Fakültesi',
  department: 'Giyim Üretim Teknolojisi',
  gradeLevel: '2. Sınıf',
  graduationYear: 2026,
  gpa: 3.25,
  avatarUrl: '/kampus-gorselleri/kampus-384.webp',
  bio:
    'Giyim üretim teknolojisi alanında eğitim gören, üretim süreçlerine ve moda endüstrisine ilgi duyan bir öğrenciyim. ' +
    'Takım çalışmasına yatkın, detaylara önem veren ve yeni deneyimler edinerek kendini geliştirmeyi hedefleyen biriyim.',
  linkedinUrl: 'https://www.linkedin.com/in/ornek',
  portfolioUrl: '',
  city: 'İstanbul',
  skills: [
    { name: 'Microsoft Office', level: 'Intermediate', category: 'General', verified: false },
    { name: 'Canva', level: 'Intermediate', category: 'General', verified: false },
  ],
  softSkills: ['Tekstil Üretimi', 'Üretim Planlama', 'Kalıp ve Model', 'Kalite Kontrol', 'Ekip Çalışması', 'Problem Çözme', 'İletişim'],
  languages: [
    { id: 'l1', language: 'Türkçe', level: 'Ana dil', proficiencyText: 'Ana dil' },
    { id: 'l2', language: 'İngilizce', level: 'B1', proficiencyText: 'B1 · Orta' },
  ],
  targetRoles: [],
  projects: [
    {
      id: 'p1',
      title: 'Staj İlanları Platformu',
      description: 'Üniversite öğrencileri ve şirketleri bir araya getiren staj ilanları platformunun geliştirilmesine katkıda bulundum.',
      techStack: ['Web Geliştirme', 'Ürün Tasarımı', 'Ekip Çalışması'],
      liveUrl: 'https://ornek.com/proje',
      startYear: 2025,
      endYear: null,
      ongoing: true,
    },
    {
      id: 'p2',
      title: 'Moda Koleksiyonu Tasarımı',
      description: 'Okul projesi kapsamında belirli bir tema için kapsamlı bir koleksiyon tasarladım. Kalıp, model ve teknik çizim süreçlerinde aktif rol aldım.',
      techStack: ['Tasarım', 'Kalıp', 'Teknik Çizim'],
      startYear: 2024,
      endYear: 2024,
      ongoing: false,
    },
  ],
  experiences: [
    {
      id: 'e1',
      position: 'Mağaza Satış Danışmanı',
      organization: 'Örnek Mağazacılık A.Ş.',
      startYear: 2023,
      startMonth: 8,
      endYear: null,
      endMonth: null,
      ongoing: true,
      employmentType: 'yari_zamanli',
      description:
        'Müşteri ilişkileri ve iletişim becerilerimi geliştirdim.\nEkip çalışması içerisinde sorumluluk alarak mağaza operasyonlarına destek oldum.\nÜrün bilgisi, stok takibi ve mağaza düzeni konularında deneyim kazandım.',
    },
  ],
  educationLevel: 'on_lisans',
  educationStartYear: 2024,
  educationOngoing: true,
  educations: [],
  certificates: [{ id: 'c1', name: 'Girişimcilik Eğitimi', issuer: 'Örnek Kalkınma Ajansı', issueYear: 2026, issueMonth: null, url: '' }],
  interests: ['Moda ve Tekstil', 'Fotoğraf', 'Seyahat', 'Spor', 'Tasarım'],
  cvGizli: [],
  preferences: {
    workType: 'Any',
    cities: [],
    type: 'Any',
    mandatoryInsuranceProvidedByUni: false,
    earliestStartDate: '',
    weeklyDaysAvailable: 5,
  },
  earnedBadges: [],
} as StudentProfile;
