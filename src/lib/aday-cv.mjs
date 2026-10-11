/**
 * İŞVEREN EKRANINDAKİ CV — BAŞVURU ANINDAKİ KOPYADAN (11 Ekim 2026)
 *
 * İşveren başvuru ekranı adayın CV'sini öğrencinin `/cv/yazdir`da gördüğü
 * AYNI şablonla (CvBelgesi) çiziyor. Şablon bir `StudentProfile`
 * bekliyor; bu dosya başvuru kartını (aday-kart.mjs `kartVerisi`) o
 * biçime çeviriyor. İkinci bir CV tasarımı yok.
 *
 * KAYNAK: başvuru anındaki kopya. `cvKopya` (yeni başvurular) varsa CV
 * onunla tam; yoksa (eski başvurular) kartın üst düzey alanlarıyla —
 * ad, okul, bölüm, yetenekler, diller, deneyimler, projeler — ve
 * olmayan bölüm çizilmiyor.
 *
 * GİZLİLİK
 *  - Not ortalaması hiç yok (kopyaya girmiyor).
 *  - Telefon ve e-posta YALNIZ `iletisim` verilirse: o satırı sunucu,
 *    öğrencinin iletişim onayı bu akışı kapsıyorsa döndürüyor.
 *  - Öğrencinin "CV'de neler görünsün" tercihi uygulanıyor.
 *  - Önyargısız incelemede (`kart.gizli`) ad "Aday", fotoğraf, bağlantılar
 *    ve iletişim yok.
 *  - Bağlantılar ve proje/sertifika adresleri yalnız güvenli https adres.
 *
 * Saf: ağ yok, React yok. tests/aday-cv.test.mjs bağlıyor.
 */

import { ayAyir } from './deneyim.mjs';
import { guvenliDisAdres } from './guvenli-url.mjs';

const dizi = (x) => (Array.isArray(x) ? x : []);
const metin = (x) => (typeof x === 'string' && x.trim() ? x.trim() : '');
const yil = (x) => (Number.isInteger(x) && x > 1900 && x < 2200 ? x : null);
const ayNo = (x) => (Number.isInteger(x) && x >= 1 && x <= 12 ? x : null);
const DUZEYLER = ['lise', 'on_lisans', 'lisans', 'yuksek_lisans', 'doktora'];
const TURLER = ['tam_zamanli', 'yari_zamanli', 'staj', 'gonullu', 'serbest', 'donemlik'];
const GIZLI = ['telefon', 'eposta', 'konum', 'linkedin', 'portfoy', 'foto', 'not', 'ilgi'];

/** "İngilizce (B1)" → { ad, seviye }. */
function dilMetni(d) {
  const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(d);
  return m ? { ad: m[1].trim(), seviye: m[2].trim() } : { ad: d.trim(), seviye: '' };
}

/** Kopya biçimindeki deneyim → StudentExperience. Okunamayan atlanıyor. */
function deneyim(d, i) {
  const bas = ayAyir(d?.baslangic);
  if (!metin(d?.pozisyon) || !metin(d?.kurum) || !bas) return null;
  const devam = Boolean(d?.devam);
  const bit = devam ? null : ayAyir(d?.bitis);
  return {
    id: `kopya-deneyim-${i}`,
    position: metin(d.pozisyon),
    organization: metin(d.kurum),
    startYear: bas.yil,
    startMonth: bas.ay,
    endYear: bit?.yil ?? null,
    endMonth: bit?.ay ?? null,
    ongoing: devam,
    description: metin(d?.aciklama),
    employmentType: TURLER.includes(d?.tur) ? d.tur : null,
  };
}

/**
 * Başvuru kartı → CvBelgesi'nin beklediği öğrenci.
 * @param {Record<string, any>} kart  kartVerisi çıktısı
 * @param {{ iletisim?: { eposta?: string|null, telefon?: string|null } | null }} [secenek]
 */
export function adayCvOgrencisi(kart, { iletisim = null } = {}) {
  const k = kart ?? {};
  const cv = k.cvKopya && typeof k.cvKopya === 'object' ? k.cvKopya : null;
  const gizli = Boolean(k.gizli);

  const gizliAlanlar = new Set(dizi(cv?.gizli).filter((g) => GIZLI.includes(g)));
  if (gizli) for (const g of ['foto', 'telefon', 'eposta', 'linkedin', 'portfoy']) gizliAlanlar.add(g);

  const yetenekler = (cv ? dizi(cv.yetenekler) : dizi(k.yetenekler)).map(metin).filter(Boolean);
  const diller = cv
    ? dizi(cv.diller).map((d) => ({ ad: metin(d?.ad), seviye: metin(d?.seviye) }))
    : dizi(k.diller).filter((d) => typeof d === 'string').map(dilMetni);

  const projeler = (cv ? dizi(cv.projeler) : dizi(k.projeler))
    .filter((p) => metin(p?.baslik))
    .map((p, i) => {
      const adres = gizli ? null : guvenliDisAdres(p?.adres);
      return {
        id: `kopya-proje-${i}`,
        title: metin(p.baslik),
        description: metin(p?.aciklama),
        techStack: dizi(p?.araclar).map(metin).filter(Boolean),
        liveUrl: adres ?? undefined,
        startYear: yil(p?.baslangic),
        endYear: p?.suruyor ? null : yil(p?.bitis),
        ongoing: Boolean(p?.suruyor),
      };
    });

  const egitim = cv?.egitim && typeof cv.egitim === 'object' ? cv.egitim : {};
  const linkedin = gizli ? null : guvenliDisAdres(k.linkedin);
  const portfolyo = gizli ? null : guvenliDisAdres(k.portfolyo);
  const github = !gizli && /^[A-Za-z0-9-]{1,39}$/.test(metin(k.github)) ? metin(k.github) : undefined;

  return {
    id: String(k.id ?? 'aday'),
    fullName: gizli ? 'Aday' : metin(k.ad) || 'Aday',
    /* Fotoğraf: kopyadaki adres (https) ya da sitenin kendi yolu ('/...'). */
    avatarUrl: gizli ? '' : /^\/(?!\/)/.test(metin(k.fotoUrl)) ? metin(k.fotoUrl) : (guvenliDisAdres(k.fotoUrl) ?? ''),
    email: metin(iletisim?.eposta),
    phone: metin(iletisim?.telefon),
    /* Konum oturduğu il; eski kopyalardaki `sehir` staj tercihi, CV'de yaşadığı yer gibi okunurdu. */
    city: metin(cv?.sehir),
    bio: metin(cv?.hakkimda),
    university: metin(k.universite),
    department: metin(k.bolum),
    gradeLevel: metin(k.sinif),
    educationLevel: DUZEYLER.includes(egitim.duzey) ? egitim.duzey : null,
    educationStartYear: yil(egitim.baslangic),
    educationOngoing: typeof egitim.suruyor === 'boolean' ? egitim.suruyor : null,
    graduationYear: egitim.suruyor === false ? (yil(egitim.mezuniyet) ?? undefined) : undefined,
    gpa: 0,
    linkedinUrl: linkedin ?? undefined,
    portfolioUrl: portfolyo ?? undefined,
    githubUsername: github,
    skills: yetenekler.map((ad) => ({ name: ad, level: 'Intermediate', category: 'General', verified: false })),
    softSkills: [],
    languages: diller
      .filter((d) => d.ad)
      .map((d, i) => ({ id: `kopya-dil-${i}`, language: d.ad, level: d.seviye, proficiencyText: d.seviye })),
    interests: cv ? dizi(cv.ilgiler).map(metin).filter(Boolean) : [],
    experiences: (cv ? dizi(cv.deneyimler) : dizi(k.deneyimler)).map(deneyim).filter(Boolean),
    educations: dizi(cv?.ekEgitimler)
      .filter((e) => metin(e?.okul))
      .map((e, i) => ({
        id: `kopya-egitim-${i}`,
        school: metin(e.okul),
        department: metin(e?.bolum),
        level: DUZEYLER.includes(e?.duzey) ? e.duzey : null,
        startYear: yil(e?.baslangic),
        endYear: e?.suruyor ? null : yil(e?.bitis),
        ongoing: Boolean(e?.suruyor),
        gpa: null,
      })),
    projects: projeler,
    certificates: dizi(cv?.sertifikalar)
      .filter((c) => metin(c?.ad))
      .map((c, i) => ({
        id: `kopya-sertifika-${i}`,
        name: metin(c.ad),
        issuer: metin(c?.kurum),
        issueYear: yil(c?.yil),
        issueMonth: yil(c?.yil) ? ayNo(c?.ay) : null,
        url: gizli ? '' : (guvenliDisAdres(c?.adres) ?? ''),
      })),
    cvGizli: [...gizliAlanlar],
    targetRoles: [],
    earnedBadges: [],
    preferences: { workType: 'Any', cities: [], type: 'Any', mandatoryInsuranceProvidedByUni: false, earliestStartDate: '', weeklyDaysAvailable: 5 },
  };
}
