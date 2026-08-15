/**
 * Mülakat prova modülü — mock-interview ucunun yerini alır.
 *
 * ÖNEMLİ TASARIM KARARI:
 * Dil modeli olmadan bir cevabın *içeriğini* değerlendirmek mümkün değil.
 * Bu yüzden burada cevabın doğruluğunu puanlamıyoruz — bu sahtekârlık olurdu.
 * Bunun yerine cevabın *yapısını* ölçüyoruz: STAR düzeni, somut sayı,
 * teknik terim kullanımı, uzunluk. Bunlar metinden gerçekten ölçülebilir
 * ve mülakat koçlarının verdiği geri bildirimin büyük kısmı zaten budur.
 *
 * Arayüz bunu "yapı puanı" olarak etiketlemeli, "mülakat puanı" olarak değil.
 */

import type { InternshipListing } from '../types';

export interface InterviewQuestion {
  question: string;
  type: 'Technical' | 'Behavioral' | 'Motivation' | 'Problem Solving';
  hint: string;
  idealAnswerPoints: string[];
}

export interface StructureFeedback {
  score: number;
  label: string;
  strengths: string;
  improvements: string;
  tip: string;
  signals: Array<{ name: string; found: boolean; note: string }>;
}

// ---------------------------------------------------------------------------
// Soru bankası
// ---------------------------------------------------------------------------

const BEHAVIORAL: InterviewQuestion[] = [
  {
    question: 'Daha önce hiç bilmediğin bir teknolojiyi kısa sürede öğrenmek zorunda kaldın mı? Nasıl bir yol izledin?',
    type: 'Behavioral',
    hint: 'Stajyer alımında en çok bakılan şey öğrenme hızıdır. Süre ver: "üç günde" gibi.',
    idealAnswerPoints: [
      'Hangi teknoloji ve neden öğrenmen gerekti',
      'İzlediğin somut yöntem (dokümantasyon, örnek proje, mentor)',
      'Sonuç: ne ürettin, ne kadar sürdü',
    ],
  },
  {
    question: 'Bir grup projesinde fikir ayrılığı yaşadığın bir durumu anlat. Nasıl çözüldü?',
    type: 'Behavioral',
    hint: 'Suçlayıcı olma. Karşı tarafın gerekçesini de anladığını göster.',
    idealAnswerPoints: [
      'Anlaşmazlığın teknik veya süreçsel sebebi',
      'Kendi pozisyonunu nasıl savunduğun',
      'Ortak noktada nasıl buluşulduğu ve sonucu',
    ],
  },
  {
    question: 'Yaptığın bir işte hata yaptığını fark ettiğin bir an oldu mu? Ne yaptın?',
    type: 'Behavioral',
    hint: 'Hatayı küçültmeye çalışma; nasıl telafi ettiğin asıl değerlendirilen şey.',
    idealAnswerPoints: [
      'Hatanın ne olduğu ve nasıl fark edildiği',
      'Hemen attığın adım',
      'Tekrarlanmaması için değiştirdiğin şey',
    ],
  },
  {
    question: 'Aynı anda birden fazla teslim tarihi olduğunda nasıl önceliklendirirsin?',
    type: 'Behavioral',
    hint: 'Somut bir örnek üzerinden anlat, genel bir yöntem tarifi yapma.',
    idealAnswerPoints: [
      'Gerçek bir dönem/proje örneği',
      'Kullandığın ölçüt (aciliyet, etki, bağımlılık)',
      'Bir şeyi ertelemek zorunda kaldıysan bunu nasıl ilettiğin',
    ],
  },
];

const MOTIVATION: InterviewQuestion[] = [
  {
    question: 'Neden bu alanda staj yapmak istiyorsun? Bu ilgi nereden başladı?',
    type: 'Motivation',
    hint: '"Çocukluğumdan beri teknolojiye ilgim vardı" cümlesinden kaçın; herkes bunu söylüyor.',
    idealAnswerPoints: [
      'Somut bir başlangıç anı veya proje',
      'İlgiyi sürdürmek için kendi başına yaptığın bir şey',
      'Bu stajın seni nereye götürmesini beklediğin',
    ],
  },
  {
    question: 'Staj süresince öğrenmeyi en çok istediğin şey ne?',
    type: 'Motivation',
    hint: 'Şirketin gerçekten yapabileceği bir şey söyle — ilanı okuduğunu gösterir.',
    idealAnswerPoints: [
      'Spesifik bir beceri veya alan',
      'Neden bunu okulda değil de burada öğrenebileceğin',
      'Karşılığında ne katabileceğin',
    ],
  },
];

/** Beceriye özel teknik sorular. */
const TECHNICAL_BY_SKILL: Array<{ match: RegExp; questions: InterviewQuestion[] }> = [
  {
    match: /react|vue|angular|frontend/i,
    questions: [
      {
        question: 'Bir arayüzde veri geldiğinde ekranın "zıpladığını" fark ettin. Sebebini nasıl araştırırsın?',
        type: 'Problem Solving',
        hint: 'Yükleme durumu, iskelet ekran ve sabit yükseklik kavramlarına değin.',
        idealAnswerPoints: ['Sorunu tekrar üretme', 'Yükleme durumunun nasıl yönetildiği', 'Somut bir çözüm önerisi'],
      },
      {
        question: 'Bir bileşenin gereğinden fazla yeniden render olduğunu nasıl anlarsın?',
        type: 'Technical',
        hint: 'Bilmiyorsan tahmin etme; nasıl araştıracağını anlat.',
        idealAnswerPoints: ['Geliştirici araçlarını kullanma', 'State/props değişimini izleme', 'Ölçmeden optimize etmemek'],
      },
    ],
  },
  {
    match: /node|backend|api|django|fastapi|spring|express/i,
    questions: [
      {
        question: 'Yazdığın bir API ucu yavaş çalışıyor. Nereden başlarsın?',
        type: 'Problem Solving',
        hint: 'Tahmin yerine ölçmekten bahset: log, süre ölçümü, sorgu analizi.',
        idealAnswerPoints: ['Önce ölçme', 'Veritabanı sorgusu mu, ağ mı, işlem mi ayırt etme', 'Tek değişkenli iyileştirme'],
      },
      {
        question: 'Bir API\'de hangi durumlarda 400, hangi durumlarda 500 dönersin?',
        type: 'Technical',
        hint: 'Kısaca: hata istemcide mi sunucuda mı?',
        idealAnswerPoints: ['İstemci hatası tanımı', 'Sunucu hatası tanımı', 'Kullanıcıya ne kadar detay verileceği'],
      },
    ],
  },
  {
    match: /sql|postgres|veritaban|mysql/i,
    questions: [
      {
        question: 'Bir sorgu tabloda satır sayısı arttıkça yavaşladı. İlk bakacağın şey ne olur?',
        type: 'Problem Solving',
        hint: 'İndeks ve sorgu planı kavramlarına değin.',
        idealAnswerPoints: ['Sorgu planını inceleme', 'İndeks eksikliği', 'Gereksiz veri çekmeme'],
      },
    ],
  },
  {
    match: /pandas|makine öğren|machine learning|veri|data/i,
    questions: [
      {
        question: 'Modelin eğitim verisinde çok iyi, test verisinde kötü sonuç veriyor. Ne olmuş olabilir?',
        type: 'Technical',
        hint: 'Aşırı öğrenme (overfitting) yönüne git ve nasıl azaltacağını söyle.',
        idealAnswerPoints: ['Aşırı öğrenme tanımı', 'Veri bölme stratejisi', 'Düzenlileştirme veya daha fazla veri'],
      },
    ],
  },
  {
    match: /figma|tasarım|ui|ux/i,
    questions: [
      {
        question: 'Bir tasarım kararında müşteriyle anlaşamadın. Kendi önerini nasıl savunursun?',
        type: 'Behavioral',
        hint: 'Estetik tercih değil, kullanıcı gerekçesi sun.',
        idealAnswerPoints: ['Kullanıcı ihtiyacına dayandırma', 'Alternatif sunma', 'Test etme önerisi'],
      },
    ],
  },
];

const GENERIC_TECHNICAL: InterviewQuestion = {
  question: 'Şu ana kadar üzerinde çalıştığın en zor problem neydi ve nasıl çözdün?',
  type: 'Problem Solving',
  hint: 'Problemi anlatmaya harcadığın süreden fazlasını çözüme ayır.',
  idealAnswerPoints: ['Problemin neden zor olduğu', 'Denediğin ve işe yaramayan yollar', 'Çözüme götüren adım'],
};

// ---------------------------------------------------------------------------
// Soru seçimi
// ---------------------------------------------------------------------------

/**
 * İlana göre bir mülakat oturumu kurgular.
 * Sıra: motivasyon → teknik → davranışsal → teknik → davranışsal
 */
export function buildInterviewSession(
  listing: InternshipListing,
  count = 5,
): InterviewQuestion[] {
  const skillText = [
    listing.title,
    listing.department,
    ...(listing.requiredSkills || []),
  ].join(' ');

  const technical = TECHNICAL_BY_SKILL
    .filter((t) => t.match.test(skillText))
    .flatMap((t) => t.questions);

  const techPool = technical.length > 0 ? technical : [GENERIC_TECHNICAL];

  const session: InterviewQuestion[] = [
    pick(MOTIVATION, 0),
    pick(techPool, 0),
    pick(BEHAVIORAL, 0),
    pick(techPool, 1),
    pick(BEHAVIORAL, 1),
    pick(BEHAVIORAL, 2),
    pick(MOTIVATION, 1),
  ];

  // Aynı sorunun iki kez gelmesini engelle
  const seen = new Set<string>();
  return session
    .filter((q) => {
      if (seen.has(q.question)) return false;
      seen.add(q.question);
      return true;
    })
    .slice(0, count);
}

function pick(pool: InterviewQuestion[], index: number): InterviewQuestion {
  return pool[index % pool.length];
}

// ---------------------------------------------------------------------------
// Cevap yapısı analizi
// ---------------------------------------------------------------------------

const STAR_MARKERS = {
  situation: /\b(bir gün|projede|dönemde|sırasında|çalışırken|ödevde|stajda|takımda|durumda)\b/i,
  task: /\b(görevim|sorumluluğum|yapmam gereken|hedef|amaç|istenen|benden beklenen)\b/i,
  action: /\b(yaptım|kullandım|yazdım|kurdum|denedim|araştırdım|geliştirdim|çözdüm|uyguladım|önerdim)\b/i,
  result: /\b(sonuç|sonucunda|böylece|azaldı|arttı|tamamladım|başardım|kazandık|düzeldi|hızlandı)\b/i,
};

const NUMBER_PATTERN = /\b\d+([.,]\d+)?\s*(%|kat|gün|saat|hafta|ay|yıl|kişi|satır|kullanıcı|saniye|ms|adet)?\b/i;
const HEDGE_PATTERN = /\b(sanırım|galiba|bilmiyorum|emin değilim|belki|herhalde)\b/gi;

export function analyzeAnswerStructure(
  answer: string,
  question: InterviewQuestion,
): StructureFeedback {
  const text = (answer || '').trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const signals: StructureFeedback['signals'] = [];
  let score = 0;

  // 1. Uzunluk (25 puan)
  let lengthNote: string;
  if (wordCount < 25) {
    score += 5;
    lengthNote = `${wordCount} kelime — çok kısa. Mülakatta bu cevap "devam et?" sorusunu getirir.`;
  } else if (wordCount < 60) {
    score += 15;
    lengthNote = `${wordCount} kelime — biraz kısa, bir örnek daha ekleyebilirsin.`;
  } else if (wordCount <= 220) {
    score += 25;
    lengthNote = `${wordCount} kelime — sözlü cevap için ideal aralık.`;
  } else {
    score += 15;
    lengthNote = `${wordCount} kelime — uzun. Sözlü anlatımda dinleyici yaklaşık 200 kelimeden sonra kopuyor.`;
  }
  signals.push({ name: 'Uzunluk', found: wordCount >= 25 && wordCount <= 220, note: lengthNote });

  // 2. STAR yapısı (40 puan)
  const starHits = Object.entries(STAR_MARKERS).filter(([, re]) => re.test(text));
  score += Math.round((starHits.length / 4) * 40);

  const starNames: Record<string, string> = {
    situation: 'Durum', task: 'Görev', action: 'Eylem', result: 'Sonuç',
  };
  Object.keys(STAR_MARKERS).forEach((key) => {
    const found = starHits.some(([k]) => k === key);
    signals.push({
      name: starNames[key],
      found,
      note: found ? 'Cevapta yer alıyor.' : 'Eksik görünüyor.',
    });
  });

  // 3. Somut sayı (20 puan)
  const hasNumber = NUMBER_PATTERN.test(text);
  if (hasNumber) score += 20;
  signals.push({
    name: 'Somut ölçü',
    found: hasNumber,
    note: hasNumber
      ? 'Sayı veya süre geçiyor — cevabı inandırıcı kılan şey bu.'
      : 'Hiç sayı yok. "Hızlandı" yerine "yarı yarıya düştü" demek çok daha güçlü.',
  });

  // 4. Teknik/anahtar terim (15 puan)
  const keyTerms = question.idealAnswerPoints
    .join(' ')
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 5);
  const termHits = keyTerms.filter((t) => text.toLowerCase().includes(t.slice(0, 6)));
  const termScore = Math.min(15, termHits.length * 5);
  score += termScore;
  signals.push({
    name: 'Konuya bağlılık',
    found: termHits.length > 0,
    note: termHits.length > 0
      ? 'Sorunun beklediği konulara değinmişsin.'
      : 'Cevap sorudan uzaklaşmış olabilir; soruyu tekrar okuyup ilk cümleni ona bağla.',
  });

  // Ceza: aşırı tereddüt ifadesi
  const hedges = (text.match(HEDGE_PATTERN) || []).length;
  if (hedges >= 3) {
    score -= 10;
    signals.push({
      name: 'Kararlılık',
      found: false,
      note: `${hedges} kez tereddüt ifadesi ("sanırım", "belki") kullanmışsın. Bilmediğini söylemek iyidir, ama bildiğin kısmı da temkinli anlatma.`,
    });
  }

  score = Math.max(0, Math.min(100, score));

  const label =
    score >= 80 ? 'Yapı olarak güçlü' :
    score >= 60 ? 'Yapı olarak yeterli' :
    score >= 40 ? 'Yapı gelişmeli' : 'Yapı zayıf';

  const missing = signals.filter((s) => !s.found && ['Durum', 'Görev', 'Eylem', 'Sonuç'].includes(s.name));

  const strengths = signals.filter((s) => s.found).slice(0, 3).map((s) => s.name).join(', ')
    || 'Cevap verdin — pratik yapmak zaten en önemli kısım.';

  const improvements = missing.length > 0
    ? `Cevabında ${missing.map((m) => m.name.toLowerCase()).join(', ')} kısımları belirgin değil. STAR düzeni: önce durumu kur, görevini söyle, ne yaptığını anlat, sonucu ver.`
    : hasNumber
      ? 'Yapı sağlam. Şimdi içeriğe odaklan: anlattığın örneğin bu pozisyonla bağını açıkça kur.'
      : 'Yapı tamam ama sonuç kısmına somut bir ölçü ekle.';

  return {
    score,
    label,
    strengths,
    improvements,
    tip: question.hint,
    signals,
  };
}
