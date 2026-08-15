/**
 * Şablon tabanlı motivasyon mektubu üreteci — cover-letter ucunun yerini alır.
 *
 * Tasarım kararı: mektubu "bitmiş" gibi sunmuyoruz. Dil modeli olmadan
 * üretilen metin kaçınılmaz olarak şablon kokar ve İK bunu fark eder.
 * Bu yüzden çıktı, öğrencinin dolduracağı işaretli boşluklar içeriyor
 * ([...] biçiminde) ve arayüz bunları vurgulamalı.
 *
 * Sonuç: hazır mektup değil, kişiselleştirilmesi kolay bir iskelet.
 */

import type { StudentProfile, InternshipListing } from '../types';
import { calculateInternshipMatch } from '../utils/matchingEngine';

export type LetterTone = 'professional' | 'warm' | 'direct';
export type LetterLanguage = 'tr' | 'en';

export interface GeneratedLetter {
  text: string;
  /** Öğrencinin doldurması gereken yer sayısı — arayüz uyarı gösterir. */
  placeholderCount: number;
  tips: string[];
}

const OPENINGS: Record<LetterTone, (c: string, t: string) => string> = {
  professional: (c, t) =>
    `${c} bünyesindeki ${t} staj pozisyonu için başvurumu iletiyorum.`,
  warm: (c, t) =>
    `${c} ekibinin ${t} staj ilanını gördüğümde vakit kaybetmeden yazmak istedim.`,
  direct: (c, t) =>
    `${t} pozisyonuna başvuruyorum. Neden ${c} için doğru aday olduğumu kısaca anlatayım.`,
};

const CLOSINGS: Record<LetterTone, string> = {
  professional:
    'Özgeçmişimi değerlendirmenize sunar, uygun görmeniz halinde görüşme fırsatı rica ederim.',
  warm:
    'Ekibinizle tanışmayı ve neler yapabileceğimizi konuşmayı çok isterim.',
  direct:
    'Detayları görüşmek için müsait olduğunuz herhangi bir zamanda hazırım.',
};

export function generateCoverLetter(
  student: StudentProfile,
  listing: InternshipListing,
  tone: LetterTone = 'professional',
  language: LetterLanguage = 'tr',
): GeneratedLetter {
  if (language === 'en') return generateEnglish(student, listing, tone);

  const match = calculateInternshipMatch(student, listing);
  const matched = match.matchedRequiredSkills;

  // En alakalı projeyi seç: ilanın teknolojileriyle en çok kesişen.
  const bestProject = (student.projects || [])
    .map((p) => ({
      project: p,
      overlap: (p.techStack || []).filter((t) =>
        listing.requiredSkills.some((r) => r.toLowerCase().includes(t.toLowerCase())),
      ).length,
    }))
    .sort((a, b) => b.overlap - a.overlap)[0];

  const paragraphs: string[] = [];

  // 1. Selamlama
  paragraphs.push(`Sayın ${listing.companyName} İnsan Kaynakları Ekibi,`);

  // 2. Açılış + kimlik
  const identity = [student.department, student.university].filter(Boolean).join(' bölümü, ');
  paragraphs.push(
    `${OPENINGS[tone](listing.companyName, listing.title)} ${identity ? `${identity} ${student.gradeLevel || ''} öğrencisiyim.`.replace(/\s+/g, ' ') : ''}`.trim(),
  );

  // 3. Beceri eşleşmesi
  if (matched.length > 0) {
    paragraphs.push(
      `İlanınızda aradığınız ${matched.slice(0, 3).join(', ')} becerilerini hem derslerimde hem de kendi projelerimde aktif olarak kullanıyorum. [Bu becerilerden birini nerede, hangi problemi çözerken kullandığını bir cümleyle yaz — mektubun en önemli kısmı burası.]`,
    );
  } else {
    paragraphs.push(
      `[İlandaki gereksinimlerden hangisine en yakın olduğunu ve bunu nasıl edindiğini yaz. Birebir eşleşme yoksa, benzer bir teknolojiyi ne kadar sürede öğrendiğini anlatmak da işe yarar.]`,
    );
  }

  // 4. Proje kanıtı
  if (bestProject && bestProject.overlap > 0) {
    const p = bestProject.project;
    paragraphs.push(
      `Özellikle "${p.title}" projemde ${(p.techStack || []).slice(0, 3).join(', ')} kullandım. ${p.description ? p.description.slice(0, 140) : '[Projede karşılaştığın bir zorluğu ve nasıl çözdüğünü ekle.]'}`,
    );
  } else if (bestProject) {
    paragraphs.push(
      `"${bestProject.project.title}" projemde edindiğim deneyimin bu pozisyona aktarılabilir olduğunu düşünüyorum. [Hangi yönüyle aktarılabilir olduğunu açıkla.]`,
    );
  } else {
    paragraphs.push(
      `[Burada bir proje, ders ödevi, kulüp çalışması veya gönüllü işten bahset. Küçük olması sorun değil; somut olması önemli.]`,
    );
  }

  // 5. Neden bu şirket — bunu asla otomatik doldurmuyoruz
  paragraphs.push(
    `[Neden bu şirket? Ürünlerinden birini kullandıysan, bir blog yazılarını okuduysan veya sektördeki bir çalışmalarını takip ediyorsan burada belirt. Bu paragrafı boş bırakırsan mektup diğerlerinden ayrışmaz.]`,
  );

  // 6. Pratik detaylar
  const practical: string[] = [];
  if (student.preferences?.type === 'Summer Mandatory') {
    practical.push('Zorunlu yaz stajı kapsamında başvuruyorum');
    if (student.preferences.mandatoryInsuranceProvidedByUni) {
      practical.push('SGK primlerim üniversitem tarafından karşılanmaktadır');
    }
  }
  if (student.preferences?.earliestStartDate) {
    practical.push(`${student.preferences.earliestStartDate} tarihinden itibaren başlayabilirim`);
  }
  if (practical.length > 0) {
    paragraphs.push(practical.join('; ') + '.');
  }

  // 7. Kapanış
  paragraphs.push(CLOSINGS[tone]);
  paragraphs.push(`Saygılarımla,\n${student.fullName}`);

  const contact = [student.email, student.phone, student.githubUsername ? `github.com/${student.githubUsername}` : '']
    .filter(Boolean)
    .join(' · ');
  if (contact) paragraphs.push(contact);

  const text = paragraphs.join('\n\n');

  return {
    text,
    placeholderCount: (text.match(/\[/g) || []).length,
    tips: [
      'Köşeli parantezli yerleri kendi cümlelerinle doldur — bunlar boş kalırsa mektup şablon gibi görünür.',
      'Mektup tek sayfayı geçmesin; İK ortalama 30 saniye ayırıyor.',
      'Göndermeden önce şirket adının her yerde doğru yazıldığını kontrol et.',
      matched.length === 0
        ? 'Bu ilanla beceri eşleşmen düşük. Mektupta bunu örtmeye çalışmak yerine öğrenme hızına odaklan.'
        : 'Eşleşen becerilerini mektupta bir kez daha tekrarlamak yerine, birini derinlemesine anlat.',
    ],
  };
}

function generateEnglish(
  student: StudentProfile,
  listing: InternshipListing,
  _tone: LetterTone,
): GeneratedLetter {
  const match = calculateInternshipMatch(student, listing);
  const matched = match.matchedRequiredSkills;

  const paragraphs = [
    `Dear ${listing.companyName} Hiring Team,`,
    `I am writing to apply for the ${listing.title} internship at ${listing.companyName}. I am a ${student.gradeLevel || ''} student of ${student.department} at ${student.university}.`.replace(/\s+/g, ' '),
    matched.length > 0
      ? `Your posting lists ${matched.slice(0, 3).join(', ')}, all of which I use regularly in my coursework and personal projects. [Describe one concrete problem you solved with one of these — this is the most important sentence in the letter.]`
      : `[Explain which requirement you come closest to meeting and how you got there. If nothing matches directly, describe how quickly you picked up a comparable technology.]`,
    (student.projects || []).length > 0
      ? `In my "${student.projects[0].title}" project I worked with ${(student.projects[0].techStack || []).slice(0, 3).join(', ')}. [Add the hardest problem you hit and how you solved it.]`
      : `[Mention a project, coursework, or club activity here. Small is fine; specific is what matters.]`,
    `[Why this company? Reference a product you have used, a post you have read, or work you follow. Leaving this generic is what makes a letter forgettable.]`,
    `I would welcome the opportunity to discuss my application further.`,
    `Kind regards,\n${student.fullName}`,
  ];

  const text = paragraphs.join('\n\n');
  return {
    text,
    placeholderCount: (text.match(/\[/g) || []).length,
    tips: [
      'Fill in every bracketed section in your own words before sending.',
      'Keep it under one page.',
      'Have a fluent speaker check it if English is not your first language.',
    ],
  };
}
