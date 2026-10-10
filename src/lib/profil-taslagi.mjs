/**
 * PROFİL TASLAĞI — TEK KAYDET DÜĞMESİNİN ARKASI (11 Ekim 2026)
 *
 * Profil düzenleme ekranı bölüm bölüm kaydetmiyor: öğrenci istediği
 * bölümü açıyor, değiştiriyor, başka bölüme geçiyor ve en sonda bir kez
 * "Tüm değişiklikleri kaydet"e basıyor. Bu dosya o akışın saf kısmı:
 *
 *   taslakOlustur(ogrenci)          → ekrandaki formların tamamı (metin alanları)
 *   taslaktanYama(taslak, ogrenci)  → { yama, hatalar }
 *       yama:   yalnız DEĞİŞEN bölümler, `Partial<StudentProfile>` biçiminde
 *               (App → saveStudentProfile → tek işlem, 20261207010000)
 *       hatalar: [{ bolum, alan, mesaj }] — alan, odaklanılacak öğenin kimliği
 *
 * Bölümler arası geçişte taslak kaybolmuyor çünkü tek bir nesne. Kayıt
 * başarısız olursa taslak yerinde kalıyor; başarılı olursa çağıran onu
 * atıyor ve ekran kayıtlı değeri gösteriyor.
 *
 * DOĞRULAMA EKSİKLİĞİ DEĞİL GEÇERSİZLİĞİ YAKALIYOR: boş telefon kaydı
 * engellemiyor (tamamlanma yüzdesi söylüyor), yanlış biçimli bağlantı ya
 * da yarım bırakılmış deneyim engelliyor. Başlanmış bir kaydın zorunlu
 * alt alanı eksikse anlaşılır bir mesaj dönüyor.
 *
 * Saf: ağ yok, React yok. tests/profil-taslagi.test.mjs bağlıyor.
 */

import { adSoyadAyir } from './cv-hazirlik.mjs';
import { deneyimHatasi, deneyimSirasi } from './deneyim.mjs';

/* ------------------------------------------------------------ sabitler */

/*
  DİL SEVİYELERİ — kullanıcının istediği altı basamak (11 Ekim 2026).
  Saklanan değer önceki kayıtlarla uyumlu: CEFR kodu ya da "Ana dil".
  CV belgesi aynı kodu aynı adla yazıyor (CvPage DIL_OLCEGI).
*/
export const DIL_SEVIYELERI = [
  { deger: 'A1', etiket: 'Başlangıç' },
  { deger: 'A2', etiket: 'Temel' },
  { deger: 'B1', etiket: 'Orta' },
  { deger: 'B2', etiket: 'İyi' },
  { deger: 'C1', etiket: 'İleri' },
  { deger: 'Ana dil', etiket: 'Ana dil' },
];
/* Eski kayıtlarda C2 var; seçenek olarak yalnız o kayıtta gösteriliyor. */
const ESKI_SEVIYE_ETIKETI = { C2: 'İleri (C2)' };

export function dilSeviyeEtiketi(deger) {
  return DIL_SEVIYELERI.find((s) => s.deger === deger)?.etiket ?? ESKI_SEVIYE_ETIKETI[deger] ?? deger ?? '';
}

export const ILGI_SINIRI = 20;
export const HAKKIMDA_UZUNLUGU = 600;
const MEZUN = 'Yüksek Lisans / Mezun';

/* --------------------------------------------------------- yardımcılar */

const metin = (d) => (typeof d === 'string' ? d.trim() : '');
const yilMetni = (d) => (Number.isInteger(d) && d > 0 ? String(d) : '');
const sayi = (d) => (d === '' || d == null ? null : Number(d));
const anahtar = (s) => metin(s).toLocaleLowerCase('tr-TR');
const esit = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let sayac = 0;
/** Yeni (henüz kaydedilmemiş) kayıt kimliği. */
export function yeniKimlik(on) {
  sayac += 1;
  return `yeni-${on}-${Date.now().toString(36)}-${sayac}`;
}

/** Adres alanı: boş → '', geçerli → https'li tam adres, geçersiz → null. */
export function adresDuzelt(ham) {
  const t = metin(ham);
  if (!t) return '';
  const tam = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  if (!/^https?:\/\//i.test(tam)) return null;
  try {
    const u = new URL(tam);
    return u.hostname.includes('.') ? tam : null;
  } catch {
    return null;
  }
}

/* GitHub alanı kullanıcı adı; tam adres yapıştırılırsa adı ayıklanıyor. */
export function githubAdi(deger) {
  const t = metin(deger).replace(/\/+$/, '');
  const m = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i.exec(t);
  return (m ? m[1] : t).replace(/^@/, '');
}
const GITHUB_DESENI = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const TELEFON_DESENI = /^\+?[0-9 ()-]{7,20}$/;

/* ------------------------------------------------------ taslak oluştur */

/**
 * @typedef {{ id: string, ana: boolean, okul: string, bolum: string, duzey: string, basYil: string, sonYil: string, suruyor: boolean, gpa: string, sinif: string }} EgitimFormu
 * @typedef {{ id: string, position: string, organization: string, employmentType: string, startMonth: string, startYear: string, endMonth: string, endYear: string, ongoing: boolean, description: string }} DeneyimFormu
 * @typedef {{ id: string, ad: string, seviye: string, dogrulandi: boolean }} DilFormu
 * @typedef {{ id: string, baslik: string, aciklama: string, araclar: string, adres: string, basYil: string, sonYil: string, suruyor: boolean }} ProjeFormu
 * @typedef {{ id: string, ad: string, kurum: string, yil: string, ay: string, url: string }} SertifikaFormu
 * @typedef {{
 *   kisisel: { ad: string, soyad: string, sehir: string, telefon: string, hakkimda: string },
 *   baglanti: { linkedin: string, portfolyo: string, github: string },
 *   egitimler: EgitimFormu[],
 *   deneyimler: DeneyimFormu[],
 *   diller: DilFormu[],
 *   yetenekler: string[],
 *   ilgiler: string[],
 *   projeler: ProjeFormu[],
 *   sertifikalar: SertifikaFormu[],
 *   cvGizli: string[],
 *   tercih: { hedefler: string[], sehirler: string[], calismaSekli: string, stajTuru: string, sigorta: boolean, arayuzDili: string, ulkeler: string[] },
 * }} ProfilTaslagi
 * @typedef {{ bolum: string, alan: string, mesaj: string }} TaslakHatasi
 */

function anaEgitimFormu(s) {
  /*
    "Devam ediyor" boşsa (eski kayıt) sınıftan türetiliyor — tamamlanma
    hesabıyla aynı kural. Mezuniyet yılı yalnız öğrenci "devam etmiyor"
    dediyse dolu geliyor: boş yıl okuyucuda tahminle dolduruluyor.
  */
  const suruyor = s.educationOngoing ?? (s.gradeLevel ?? '') !== MEZUN;
  return {
    id: 'ana',
    ana: true,
    okul: s.university ?? '',
    bolum: s.department ?? '',
    duzey: s.educationLevel ?? '',
    basYil: yilMetni(s.educationStartYear),
    sonYil: s.educationOngoing === false ? yilMetni(s.graduationYear) : '',
    suruyor,
    gpa: s.gpa ? String(s.gpa) : '',
    sinif: s.gradeLevel ?? '',
  };
}

function ekEgitimFormu(e) {
  return {
    id: e.id,
    ana: false,
    okul: e.school ?? '',
    bolum: e.department ?? '',
    duzey: e.level ?? '',
    basYil: yilMetni(e.startYear),
    sonYil: e.ongoing ? '' : yilMetni(e.endYear),
    suruyor: Boolean(e.ongoing),
    gpa: e.gpa != null ? String(e.gpa) : '',
    sinif: '',
  };
}

function deneyimFormu(d) {
  return {
    id: d.id,
    position: d.position ?? '',
    organization: d.organization ?? '',
    employmentType: d.employmentType ?? '',
    startMonth: d.startMonth ? String(d.startMonth) : '',
    startYear: d.startYear ? String(d.startYear) : '',
    endMonth: d.endMonth ? String(d.endMonth) : '',
    endYear: d.endYear ? String(d.endYear) : '',
    ongoing: Boolean(d.ongoing),
    description: d.description ?? '',
  };
}

function projeFormu(p) {
  return {
    id: p.id,
    baslik: p.title ?? '',
    aciklama: p.description ?? '',
    araclar: (p.techStack ?? []).join(', '),
    adres: p.githubUrl || p.liveUrl || '',
    basYil: yilMetni(p.startYear),
    sonYil: p.ongoing ? '' : yilMetni(p.endYear),
    suruyor: Boolean(p.ongoing),
  };
}

function sertifikaFormu(c) {
  return {
    id: c.id,
    ad: c.name ?? '',
    kurum: c.issuer ?? '',
    yil: yilMetni(c.issueYear),
    ay: c.issueMonth ? String(c.issueMonth) : '',
    url: c.url ?? '',
  };
}

/**
 * Kayıtlı profilden ekrandaki taslak.
 * @param {any} ogrenci
 * @returns {ProfilTaslagi}
 */
export function taslakOlustur(ogrenci) {
  const s = ogrenci ?? {};
  const { ad, soyad } = adSoyadAyir(s.fullName);
  const tercih = s.preferences ?? {};
  return {
    kisisel: {
      ad,
      soyad,
      sehir: s.city ?? '',
      telefon: s.phone ?? '',
      hakkimda: s.bio ?? '',
    },
    baglanti: {
      linkedin: s.linkedinUrl ?? '',
      portfolyo: s.portfolioUrl ?? '',
      github: s.githubUsername ?? '',
    },
    egitimler: [
      anaEgitimFormu(s),
      ...[...(s.educations ?? [])].map(ekEgitimFormu),
    ],
    deneyimler: (s.experiences ?? []).map(deneyimFormu),
    diller: (s.languages ?? []).map((l) => ({
      id: l.id,
      ad: l.language ?? '',
      seviye: l.level ?? '',
      dogrulandi: Boolean(l.verified),
    })),
    yetenekler: [...(s.skills ?? []).map((k) => k.name), ...(s.softSkills ?? [])],
    ilgiler: [...(s.interests ?? [])],
    projeler: (s.projects ?? []).map(projeFormu),
    sertifikalar: (s.certificates ?? []).map(sertifikaFormu),
    cvGizli: [...(s.cvGizli ?? [])],
    tercih: {
      hedefler: [...(s.targetRoles ?? [])],
      sehirler: [...(tercih.cities ?? [])],
      calismaSekli: tercih.workType ?? 'Any',
      stajTuru: tercih.type ?? 'Any',
      sigorta: Boolean(tercih.mandatoryInsuranceProvidedByUni),
      arayuzDili: s.interfaceLanguage ?? '',
      ulkeler: [...(s.preferredJobCountries ?? [])],
    },
  };
}

/** Taslak kayıtlıdan farklı mı (kaydedilmemiş değişiklik var mı). */
export function taslakKirliMi(taslak, ogrenci) {
  return taslak != null && !esit(taslak, taslakOlustur(ogrenci));
}

/** Hangi bölümler değişti — ekranda "kaydedilmedi" işareti için. */
export function degisenBolumler(taslak, ogrenci) {
  if (!taslak) return [];
  const taban = taslakOlustur(ogrenci);
  return Object.keys(taban).filter((k) => !esit(taslak[k], taban[k]));
}

/* ------------------------------------------------------------ dönüşüm */

/**
 * Taslak → kayıt yaması. Yalnız değişen bölümler yamaya giriyor; her
 * bölüm doğrulanıyor. Hata varsa yama yine dönüyor ama çağıran KAYDETMİYOR.
 *
 * `secenekler.sehirler`  geçerli il listesi (verilirse şehir buna göre denetleniyor)
 * `secenekler.yetenekTuru(ad)`  'program' | 'beceri' — yeni yeteneğin nereye yazılacağı
 */
/**
 * @param {ProfilTaslagi} taslak
 * @param {any} ogrenci
 * @param {{ sehirler?: string[], yetenekTuru?: (ad: string) => string }} [secenekler]
 * @returns {{ yama: Record<string, any>, hatalar: TaslakHatasi[] }}
 */
export function taslaktanYama(taslak, ogrenci, secenekler = {}) {
  const s = ogrenci ?? {};
  const taban = taslakOlustur(s);
  const yama = {};
  const hatalar = [];
  const hata = (bolum, alan, mesaj) => hatalar.push({ bolum, alan, mesaj });
  const degisti = (k) => !esit(taslak[k], taban[k]);

  /* ----------------------------------------------------------- kişisel */
  if (degisti('kisisel')) {
    const k = taslak.kisisel;
    const ad = metin(k.ad);
    const soyad = metin(k.soyad);
    if (!ad) hata('kisisel', 'ad', 'Adını yaz: profilinde ve CV’nde bu ad görünüyor.');
    const sehir = metin(k.sehir);
    if (sehir && secenekler.sehirler && !secenekler.sehirler.includes(sehir)) {
      hata('kisisel', 'sehir', 'Listeden bir il seç.');
    }
    const telefon = metin(k.telefon);
    if (telefon && !TELEFON_DESENI.test(telefon)) {
      hata('kisisel', 'telefon', 'Telefonu yalnız rakamla yaz (ör. 0555 123 45 67).');
    }
    if (metin(k.hakkimda).length > HAKKIMDA_UZUNLUGU) {
      hata('kisisel', 'bio', `Hakkımda en çok ${HAKKIMDA_UZUNLUGU} karakter olabilir.`);
    }
    yama.fullName = [ad, soyad].filter(Boolean).join(' ');
    yama.city = sehir;
    yama.phone = telefon;
    yama.bio = metin(k.hakkimda);
  }

  /* --------------------------------------------------------- bağlantı */
  if (degisti('baglanti')) {
    const b = taslak.baglanti;
    const linkedin = adresDuzelt(b.linkedin);
    if (linkedin === null || (linkedin && !/(^|\.)linkedin\.com$/i.test(new URL(linkedin).hostname))) {
      hata('baglanti', 'baglanti-linkedin', 'LinkedIn profil adresini yaz (ör. linkedin.com/in/adin).');
    }
    const portfolyo = adresDuzelt(b.portfolyo);
    if (portfolyo === null) hata('baglanti', 'baglanti-portfolyo', 'Geçerli bir web adresi yaz (ör. ornek.com).');
    const github = githubAdi(b.github);
    if (github && !GITHUB_DESENI.test(github)) {
      hata('baglanti', 'baglanti-github', 'GitHub kullanıcı adını yaz (ör. ornekkullanici).');
    }
    yama.linkedinUrl = linkedin || '';
    yama.portfolioUrl = portfolyo || '';
    yama.githubUsername = github;
  }

  /* ----------------------------------------------------------- eğitim */
  if (degisti('egitimler')) {
    /* Ana okul yalnız kendisi değiştiyse yazılıyor (ek eğitim eklemek onu yeniden yazmasın). */
    const anaDegisti = !esit(taslak.egitimler.find((e) => e.ana), taban.egitimler.find((e) => e.ana));
    const ekler = [];
    for (const e of taslak.egitimler) {
      const on = e.ana ? '' : `egitim-${e.id}-`;
      const alanKimligi = (ad) => (e.ana ? { okul: 'universite', bolum: 'bolum', bas: 'baslangic-yili', son: 'mezuniyet-yili', gpa: 'gpa' }[ad] : `${on}${ad}`);
      const okul = metin(e.okul);
      const bas = sayi(e.basYil);
      const son = e.suruyor ? null : sayi(e.sonYil);
      if (bas && son && son < bas) hata('egitim', alanKimligi('son'), 'Mezuniyet yılı başlangıçtan önce olamaz.');
      const gpaMetni = metin(e.gpa).replace(',', '.');
      const gpa = gpaMetni ? Number(gpaMetni) : null;
      const gpaSiniri = e.ana ? 4 : 100;
      if (gpaMetni && (!Number.isFinite(gpa) || gpa < 0 || gpa > gpaSiniri)) {
        hata('egitim', alanKimligi('gpa'), e.ana ? '0 ile 4 arasında bir değer yaz.' : '0 ile 100 arasında bir değer yaz.');
      }
      if (e.ana) {
        if (!anaDegisti) continue;
        yama.university = okul;
        yama.department = metin(e.bolum);
        if (e.sinif) yama.gradeLevel = e.sinif;
        yama.gpa = gpa ?? 0;
        yama.educationLevel = e.duzey || null;
        yama.educationStartYear = bas;
        yama.educationOngoing = Boolean(e.suruyor);
        /* Mezuniyet yılı yalnız bitmiş eğitimde yazılıyor; sürerken eski değer korunuyor. */
        if (!e.suruyor && son) yama.graduationYear = son;
        continue;
      }
      const dolu = okul || metin(e.bolum) || e.duzey || e.basYil || e.sonYil || metin(e.gpa);
      if (!dolu) continue; // eklenip hiç doldurulmamış kart: kaydedilmiyor
      if (!okul) hata('egitim', `${on}okul`, 'Okulun adını yaz ya da bu eğitimi kaldır.');
      ekler.push({
        id: e.id,
        school: okul,
        department: metin(e.bolum),
        level: e.duzey || null,
        startYear: bas,
        endYear: son,
        ongoing: Boolean(e.suruyor),
        gpa,
      });
    }
    if (!esit(taslak.egitimler.filter((e) => !e.ana), taban.egitimler.filter((e) => !e.ana))) {
      yama.educations = ekler;
    }
  }

  /* ---------------------------------------------------------- deneyim */
  if (degisti('deneyimler')) {
    const liste = [];
    for (const d of taslak.deneyimler) {
      const bos = !metin(d.position) && !metin(d.organization) && !d.startYear && !d.startMonth && !metin(d.description);
      if (bos) continue;
      const h = deneyimHatasi(d);
      if (h) {
        const alan = { pozisyon: 'pozisyon', kurum: 'kurum', baslangic: 'bas-ay', bitis: 'bit-ay', aciklama: 'aciklama' }[h.alan] ?? 'pozisyon';
        /* Ekrandaki etiket "Şirket adı"; mesaj da aynı adı kullanıyor. */
        hata('deneyim', `deneyim-${d.id}-${alan}`, h.alan === 'kurum' && !metin(d.organization) ? 'Şirket adını yaz.' : h.mesaj);
        continue;
      }
      liste.push({
        id: d.id,
        position: metin(d.position),
        organization: metin(d.organization),
        startYear: Number(d.startYear),
        startMonth: Number(d.startMonth),
        endYear: d.ongoing ? null : Number(d.endYear),
        endMonth: d.ongoing ? null : Number(d.endMonth),
        ongoing: Boolean(d.ongoing),
        description: metin(d.description),
        employmentType: d.employmentType || null,
      });
    }
    yama.experiences = liste.sort(deneyimSirasi);
  }

  /* -------------------------------------------------------------- dil */
  if (degisti('diller')) {
    const gorulen = new Set();
    const liste = [];
    for (const l of taslak.diller) {
      const ad = metin(l.ad);
      if (!ad && !l.seviye) continue;
      if (!ad) {
        hata('dil', `dil-${l.id}-ad`, 'Dili seç ya da bu satırı kaldır.');
        continue;
      }
      if (gorulen.has(anahtar(ad))) {
        hata('dil', `dil-${l.id}-ad`, `${ad} zaten listende.`);
        continue;
      }
      gorulen.add(anahtar(ad));
      if (!l.seviye) {
        hata('dil', `dil-${l.id}-seviye`, `${ad} için seviyeni seç.`);
        continue;
      }
      const onceki = (s.languages ?? []).find((x) => x.id === l.id);
      /* Doğrulanmış dilin seviyesi değişmiyor: doğrulama o seviye için verildi. */
      const seviye = onceki?.verified ? onceki.level : l.seviye;
      liste.push({
        id: l.id,
        language: ad,
        level: seviye,
        proficiencyText: onceki?.verified ? onceki.proficiencyText : dilSeviyeEtiketi(seviye),
        verified: Boolean(onceki?.verified),
      });
    }
    yama.languages = liste;
  }

  /* -------------------------------------------------------- yetenekler */
  if (degisti('yetenekler')) {
    const gorulen = new Set();
    const programlar = [];
    const beceriler = [];
    const eskiProgram = new Map((s.skills ?? []).map((k) => [anahtar(k.name), k]));
    const eskiBeceri = new Set((s.softSkills ?? []).map(anahtar));
    for (const ham of taslak.yetenekler) {
      const ad = metin(ham);
      const k = anahtar(ad);
      if (!ad || gorulen.has(k)) continue;
      gorulen.add(k);
      if (eskiProgram.has(k)) programlar.push(eskiProgram.get(k));
      else if (eskiBeceri.has(k)) beceriler.push(ad);
      else if ((secenekler.yetenekTuru?.(ad) ?? 'beceri') === 'program') {
        programlar.push({ name: ad, category: 'General', level: 'Intermediate', verified: false });
      } else beceriler.push(ad);
    }
    yama.skills = programlar;
    yama.softSkills = beceriler;
  }

  /* ------------------------------------------------------ ilgi alanları */
  if (degisti('ilgiler')) {
    const gorulen = new Set();
    const liste = [];
    for (const ham of taslak.ilgiler) {
      const ad = metin(ham);
      if (!ad || gorulen.has(anahtar(ad))) continue;
      gorulen.add(anahtar(ad));
      liste.push(ad);
    }
    if (liste.length > ILGI_SINIRI) hata('yetenek', 'ilgi-sec-ara', `En fazla ${ILGI_SINIRI} ilgi alanı ekleyebilirsin.`);
    yama.interests = liste.slice(0, ILGI_SINIRI);
  }

  /* ----------------------------------------------------------- projeler */
  if (degisti('projeler')) {
    const liste = [];
    for (const p of taslak.projeler) {
      const baslik = metin(p.baslik);
      const dolu = baslik || metin(p.aciklama) || metin(p.araclar) || metin(p.adres) || p.basYil || p.sonYil;
      if (!dolu) continue;
      if (!baslik) {
        hata('proje', `proje-${p.id}-baslik`, 'Projenin adını yaz ya da bu projeyi kaldır.');
        continue;
      }
      const adres = adresDuzelt(p.adres);
      if (adres === null) hata('proje', `proje-${p.id}-adres`, 'Geçerli bir web adresi yaz.');
      const bas = sayi(p.basYil);
      const son = p.suruyor ? null : sayi(p.sonYil);
      if (bas && son && son < bas) hata('proje', `proje-${p.id}-son`, 'Bitiş yılı başlangıçtan önce olamaz.');
      const onceki = (s.projects ?? []).find((x) => x.id === p.id);
      /* Önceki kayıt adresi "canlı adres" olarak tuttuysa yerinde kalıyor. */
      const canli = Boolean(adres && onceki?.liveUrl && onceki.liveUrl === adres);
      liste.push({
        id: p.id,
        title: baslik,
        description: metin(p.aciklama),
        techStack: p.araclar.split(',').map((t) => t.trim()).filter(Boolean),
        githubUrl: adres && !canli ? adres : undefined,
        liveUrl: canli ? adres : undefined,
        startYear: bas,
        endYear: son,
        ongoing: Boolean(p.suruyor),
      });
    }
    yama.projects = liste;
  }

  /* ------------------------------------------------------- sertifikalar */
  if (degisti('sertifikalar')) {
    const liste = [];
    for (const c of taslak.sertifikalar) {
      const ad = metin(c.ad);
      const dolu = ad || metin(c.kurum) || c.yil || metin(c.url);
      if (!dolu) continue;
      if (!ad) {
        hata('sertifika', `sertifika-${c.id}-ad`, 'Sertifikanın adını yaz ya da bu kaydı kaldır.');
        continue;
      }
      /* Sunucudaki CHECK ile aynı kural: yalnız http(s). `javascript:` CV'de tıklanabilir olurdu. */
      const url = adresDuzelt(c.url);
      if (url === null) hata('sertifika', `sertifika-${c.id}-url`, 'Doğrulama bağlantısı http ya da https ile başlayan bir adres olmalı.');
      if (c.ay && !c.yil) hata('sertifika', `sertifika-${c.id}-yil`, 'Ayı seçtiysen yılı da seç.');
      liste.push({
        id: c.id,
        name: ad,
        issuer: metin(c.kurum),
        issueYear: sayi(c.yil),
        issueMonth: c.yil ? sayi(c.ay) : null,
        url: url || '',
      });
    }
    yama.certificates = liste;
  }

  /* ------------------------------------------------- CV görünürlüğü */
  if (degisti('cvGizli')) yama.cvGizli = [...new Set(taslak.cvGizli)];

  /* ------------------------------------------------------------ tercih */
  if (degisti('tercih')) {
    const t = taslak.tercih;
    yama.targetRoles = [...t.hedefler];
    yama.preferences = {
      ...(s.preferences ?? {}),
      cities: [...t.sehirler],
      workType: t.calismaSekli,
      type: t.stajTuru,
      mandatoryInsuranceProvidedByUni: Boolean(t.sigorta),
    };
    /* Boş dize "tarayıcı dilini kullan": sunucuda NULL'a çevriliyor. */
    yama.interfaceLanguage = t.arayuzDili;
    yama.preferredJobCountries = [...t.ulkeler];
    /* Değişmeyen alanlar yamaya girmiyor. */
    if (esit(t.arayuzDili, taban.tercih.arayuzDili)) delete yama.interfaceLanguage;
    if (esit(t.ulkeler, taban.tercih.ulkeler)) delete yama.preferredJobCountries;
    if (esit(t.hedefler, taban.tercih.hedefler)) delete yama.targetRoles;
  }

  return { yama, hatalar };
}
