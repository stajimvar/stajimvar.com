export interface SponsoredAd {
  id: string;
  title: string;
  sponsorName: string;
  sponsorLogo: string;
  tagline: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  badge: string;
  category: 'education' | 'tech' | 'language' | 'career' | 'hr_b2b';
  highlights: string[];
  bannerImage?: string;
  rating?: number;
  discountBadge?: string;
}

export const SPONSORED_ADS: SponsoredAd[] = [
  {
    id: 'ad-google-cloud',
    title: 'Google Cloud & Generative AI Yetkinlik Programı (%100 Burslu)',
    sponsorName: 'Google Kariyer Enstitüsü',
    sponsorLogo: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100&h=100&fit=crop&crop=faces',
    tagline: 'Google Sertifikalı Bulut & Yapay Zeka Mühendisliği Eğitimi',
    description: 'Üniversite öğrencilerine özel 6 haftalık online bootcamp. Vertex AI, BigQuery ve Google Cloud mimarilerini öğrenin, uluslararası geçerli sertifikanızı alın.',
    ctaText: 'Burslu Başvur',
    ctaLink: 'https://grow.google/intl/tr/',
    badge: 'Google Partner',
    category: 'education',
    highlights: ['%100 Ücretsiz Burs', 'Google Cloud Sertifikası', 'Staj Garantili Mülakat'],
    bannerImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=300&fit=crop',
    rating: 4.9,
    discountBadge: 'Ücretsiz Katılım',
  },
  {
    id: 'ad-ielts-british',
    title: 'British Council ile Global Staj & IELTS Hazırlık Kulübü',
    sponsorName: 'British Council Turkey',
    sponsorLogo: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=100&h=100&fit=crop&crop=faces',
    tagline: 'Yurtdışı Staj ve Erasmus+ için Akıcı İngilizce',
    description: 'Global şirket mülakatlarına özel konuşma simülasyonları, birebir anadili İngilizce olan eğitmenler ve uluslararası mülakat teknikleri.',
    ctaText: 'Ücretsiz Seviye Testi Çöz',
    ctaLink: 'https://www.britishcouncil.org.tr',
    badge: 'Eğitim Sponsoru',
    category: 'language',
    highlights: ['Birebir Speaking Koçluğu', 'Mülakat Simülasyonu', 'Öğrenciye %30 İndirim'],
    bannerImage: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&h=300&fit=crop',
    rating: 4.8,
    discountBadge: 'Öğrenciye %30 İndirim',
  },
  {
    id: 'ad-apple-education',
    title: 'Apple Yetkili Eğitim İndirimi: Yazılımcı & Tasarımcı Mac Fırsatı',
    sponsorName: 'Apple Eğitim Türkiye',
    sponsorLogo: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=100&h=100&fit=crop&crop=faces',
    tagline: 'Üniversite E-postan ile AirPods Hediyesi ve Özel Fiyatlar',
    description: 'M3 işlemcili MacBook Air ve MacBook Pro modellerinde üniversite öğrencilerine özel eğitim indirimi ve 3 taksit fırsatı.',
    ctaText: 'Fırsatı İncele',
    ctaLink: 'https://www.apple.com/tr-edu/shop',
    badge: 'Donanım Sponsoru',
    category: 'tech',
    highlights: ['AirPods Hediye', 'Üniversite Öğrenci İndirimi', 'Ücretsiz Kargo'],
    bannerImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=300&fit=crop',
    rating: 5.0,
    discountBadge: 'AirPods Hediyeli',
  },
  {
    id: 'ad-erasmus-plus',
    title: '2026-2027 Erasmus+ Avrupa Staj Konsorsiyumu & Hibe Rehberi',
    sponsorName: 'Eurodesk & Erasmus+ Platformu',
    sponsorLogo: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=100&h=100&fit=crop&crop=faces',
    tagline: 'Aylık 750€ Euro Hibe ile Almanya, Hollanda ve İtalya Stajları',
    description: 'Avrupa Birliği staj hibe başvuru tarihleri, kabul mektubu (Letter of Acceptance) şablonları ve ücretsiz konsorsiyum listeleri.',
    ctaText: 'Hibe Rehberini İndir',
    ctaLink: 'https://erasmus-plus.ec.europa.eu',
    badge: 'AB Destekli',
    category: 'career',
    highlights: ['Aylık 750€ Hibe', 'Vize Kabul Rehberi', 'Örnek Niyet Mektubu'],
    bannerImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=300&fit=crop',
    rating: 4.9,
    discountBadge: 'Aylık 750€ Hibe',
  },
  {
    id: 'ad-hr-recruitment-b2b',
    title: 'İK Departmanları İçin: Yapay Zeka Destekli Stajyer Eleme Yazılımı',
    sponsorName: 'StajımVar Enterprise Talent ATS',
    sponsorLogo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=100&h=100&fit=crop&crop=faces',
    tagline: '1.000+ Aday Başvurusunu 3 Saniyede Puanlayın ve Eşleştirin',
    description: 'Şirketinize en uygun teknik yetenekleri otomatik rozet testleriyle filtreleyin, mülakat randevularını tek tıkla organize edin.',
    ctaText: '14 Gün Ücretsiz Dene',
    ctaLink: '#company-portal',
    badge: 'Kurumsal İK Çözümü',
    category: 'hr_b2b',
    highlights: ['ATS Entegrasyonu', 'Otomatik Rozet Doğrulama', '14 Gün Ücretsiz Deneme'],
    bannerImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop',
    rating: 4.9,
    discountBadge: '14 Gün Ücretsiz',
  },
];
