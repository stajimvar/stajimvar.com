/**
 * Başvuru anındaki profil kopyası.
 *
 * NEDEN KOPYA
 * -----------
 * Şirket, öğrencinin `profiles` satırını OKUYAMIYOR — o tablonun okuma
 * kuralı yalnızca kişinin kendisine ve yöneticiye açık ve öyle kalmalı.
 * Şirketin gördüğü ad, okul ve bölüm bu kopyadan geliyor; kopya da
 * başvuru anında, öğrenci "profilim bu şirketle paylaşılsın" dediğinde
 * yazılıyor.
 *
 * İki sonucu var, ikisi de istenen:
 *   1. Rıza yoksa kopya da yok. Şirket hiçbir kişisel veri görmüyor.
 *   2. Öğrenci profilini sonradan değiştirse bile şirkete giden
 *      başvurunun ne olduğu kayıtta duruyor.
 *
 * NE GİRMİYOR
 * -----------
 * TCKN, adres, doğum tarihi, yaş, GPA, TELEFON ve E-POSTA.
 *
 * E-POSTA NEDEN ÇIKARILDI
 * -----------------------
 * Kopyada `eposta` alanı vardı ve şirket paneli kopyayı olduğu gibi
 * çekiyordu. Arayüz adresi hiçbir yerde çizmiyordu ama veri tarayıcıya
 * gidiyordu: ağ isteğine bakan bir şirket, teklif kabul edilmeden önce
 * her başvuranın e-postasını okuyabiliyordu. Ürünün kuralı ise açık —
 * iletişim TEKLİF KABUL EDİLDİĞİNDE açılır.
 *
 * Kural arayüzde değil veride tutulmalı. Şirket, teklif kabul edildikten
 * sonra e-postayı `public.basvuru_iletisimi` üzerinden ve GÜNCEL hâliyle
 * alıyor; kopyadaki adres zaten eskimiş olabilirdi.
 */

import { deneyimKaydi, deneyimKopyasi, deneyimSirasi } from './deneyim.mjs';

const dizi = (x) => (Array.isArray(x) ? x : []);
const metin = (x) => {
  const t = String(x ?? '').trim();
  return t || null;
};
const yil = (x) => (Number.isInteger(x) && x > 1900 && x < 2200 ? x : null);
const ay = (x) => (Number.isInteger(x) && x >= 1 && x <= 12 ? x : null);
const CV_GIZLI = ['telefon', 'eposta', 'konum', 'linkedin', 'portfoy', 'foto', 'not', 'ilgi'];

/**
 * CV KOPYASI (11 Ekim 2026)
 *
 * İşveren başvuru ekranı adayın CV'sini `/cv/yazdir`daki AYNI şablonla
 * (CvBelgesi) çiziyor ve BAŞVURU ANINDAKİ bilgiyle. Kartın üst düzey
 * alanları kart ve fark hesabı için (ilk beş yetenek, tercih şehri…);
 * CV'nin ihtiyacı ayrı bir alt nesnede tutuluyor ki o hesaplar
 * etkilenmesin.
 *
 * GİRMEYENLER aynı: not ortalaması, telefon, e-posta. İletişim CV'ye
 * yalnız öğrencinin iletişim onayı varsa ve sunucunun verdiği satırdan
 * ekleniyor (AdayCekmecesi). Öğrencinin "CV'de neler görünsün"
 * tercihi (`gizli`) de kopyada; işveren ekranındaki CV ona uyuyor.
 */
function cvKopyasi(o) {
  const tekil = new Set();
  const yetenekler = [...dizi(o.skills).map((y) => y?.name), ...dizi(o.softSkills)]
    .map(metin)
    .filter((y) => {
      if (!y) return false;
      const k = y.toLocaleLowerCase('tr-TR');
      if (tekil.has(k)) return false;
      tekil.add(k);
      return true;
    })
    .slice(0, 60);
  /* Deneyimler en yeniden eskiye; çalışma türü aynı sırada eşleşsin diye okunamayan önce düşüyor. */
  const sirali = [...dizi(o.experiences)].sort(deneyimSirasi).filter((d) => deneyimKaydi(d));
  const deneyimler = deneyimKopyasi(sirali).map((d, i) => ({ ...d, tur: metin(sirali[i]?.employmentType) }));
  return {
    surum: 1,
    hakkimda: metin(o.bio),
    sehir: metin(o.city),
    yetenekler,
    diller: dizi(o.languages)
      .map((d) => ({ ad: metin(d?.language), seviye: metin(d?.level) }))
      .filter((d) => d.ad),
    ilgiler: dizi(o.interests).map(metin).filter(Boolean).slice(0, 20),
    deneyimler,
    egitim: {
      duzey: metin(o.educationLevel),
      baslangic: yil(o.educationStartYear),
      /* Boşsa boş: "devam ediyor" uydurulmuyor. Mezuniyet yalnız öğrenci "bitti" dediyse. */
      suruyor: typeof o.educationOngoing === 'boolean' ? o.educationOngoing : null,
      mezuniyet: o.educationOngoing === false ? yil(o.graduationYear) : null,
    },
    ekEgitimler: dizi(o.educations)
      .map((e) => ({
        okul: metin(e?.school),
        bolum: metin(e?.department),
        duzey: metin(e?.level),
        baslangic: yil(e?.startYear),
        bitis: e?.ongoing ? null : yil(e?.endYear),
        suruyor: Boolean(e?.ongoing),
      }))
      .filter((e) => e.okul)
      .slice(0, 30),
    projeler: dizi(o.projects)
      .map((p) => ({
        baslik: metin(p?.title),
        aciklama: metin(p?.description),
        araclar: dizi(p?.techStack).map(metin).filter(Boolean).slice(0, 20),
        adres: metin(p?.liveUrl) ?? metin(p?.githubUrl),
        baslangic: yil(p?.startYear),
        bitis: p?.ongoing ? null : yil(p?.endYear),
        suruyor: Boolean(p?.ongoing),
      }))
      .filter((p) => p.baslik)
      .slice(0, 30),
    sertifikalar: dizi(o.certificates)
      .map((c) => ({
        ad: metin(c?.name),
        kurum: metin(c?.issuer),
        yil: yil(c?.issueYear),
        ay: c?.issueYear ? ay(c?.issueMonth) : null,
        adres: metin(c?.url),
      }))
      .filter((c) => c.ad)
      .slice(0, 30),
    gizli: dizi(o.cvGizli).filter((g) => CV_GIZLI.includes(g)),
  };
}

export function basvuruKopyasi(ogrenci) {
  if (!ogrenci) return null;

  const kopya = {
    surum: 1,
    ad: metin(ogrenci.fullName),
    fotoUrl: metin(ogrenci.avatarUrl),
    universite: metin(ogrenci.university),
    bolum: metin(ogrenci.department),
    sinif: metin(ogrenci.gradeLevel),

    /* Şehir tercihlerden geliyor; stajın yeri gerçek bir kısıt. */
    sehir: dizi(ogrenci.preferences?.cities)[0] ?? null,

    github: metin(ogrenci.githubUsername),
    portfolyo: metin(ogrenci.portfolioUrl),
    linkedin: metin(ogrenci.linkedinUrl),

    /* Karttaki üç-beş yetenek; tamamı değil, ilk beşi. */
    yetenekler: dizi(ogrenci.skills)
      .map((y) => metin(y?.name))
      .filter(Boolean)
      .slice(0, 5),

    /*
      DİL ADI ALANI `language`, `name` DEĞİL

      Üretimde ölçüldü (31 Ağustos 2026): iki başvurunun kopyasında
      diller alanı ["undefined (B1)", "undefined (A2)"] yazıyordu.
      Sebep basit — `StudentLanguage` tipinde alanın adı `language`,
      burada `d.name` okunuyordu ve `undefined` şablonun içinde metne
      dönüşüyordu. `.filter(Boolean)` bunu yakalayamıyor çünkü
      "undefined (B1)" boş olmayan geçerli bir dize.

      Ad yoksa kayıt ATLANIYOR: seviyesi bilinen ama hangi dil olduğu
      bilinmeyen bir satır şirkete hiçbir şey söylemiyor. Kullanıcıya
      dönük hiçbir dizede "undefined", "null" ya da "[object Object]"
      üretilmiyor — bunu tests/basvuru-kopyasi.test.mjs bağlıyor.
    */
    diller: dizi(ogrenci.languages)
      .map((d) => {
        const ad = metin(d?.language) ?? metin(d?.name);
        if (!ad) return null;
        const seviye = metin(d?.level);
        return seviye ? `${ad} (${seviye})` : ad;
      })
      .filter(Boolean),

    rozetler: dizi(ogrenci.earnedBadges).filter(Boolean),

    projeler: dizi(ogrenci.projects)
      .slice(0, 5)
      .map((p) => ({
        baslik: metin(p?.title),
        aciklama: metin(p?.description),
        adres: metin(p?.liveUrl) ?? metin(p?.githubUrl),
      }))
      .filter((p) => p.baslik),

    /*
      DENEYİMLER (20261205010000) — başvuru ANINDAKİ hâli. Öğrenci sonradan
      düzenlerse bu kopya değişmiyor; şirket farkı güncel profilden görüyor.
      Liste boşsa da anahtar YAZILIYOR: "deneyimi yoktu" ile "kopya deneyim
      alanından önce yazıldı" (eski başvuru) ayrı tutulsun.
    */
    deneyimler: deneyimKopyasi(ogrenci.experiences),

    /* CV'nin başvuru anındaki hâli (yukarıda, `cvKopyasi`). */
    cv: cvKopyasi(ogrenci),
  };

  /*
    BOŞ NESNE YAZILMIYOR

    Profili hiç doldurmamış bir öğrenci başvurduğunda kopya baştan sona
    null olurdu ve `profile_snapshot` alanına içi boş bir nesne düşerdi.
    İki sakıncası var: şirket panelinde "rıza verilmiş ama hiçbir şey
    yok" gibi görünen bir kart çıkardı, ve kayıt "bu kişinin bilgileri
    paylaşıldı" diyorken aslında paylaşılan bir şey olmazdı.

    Ad ya da okul yoksa kart zaten çizilemiyor; o durumda alan null
    kalıyor ve kart "şirketin kendi sitesinden başvuruldu" koluna
    düşüyor — gerçekte olan da bu.
  */
  const doluMu =
    Boolean(kopya.ad) ||
    Boolean(kopya.universite) ||
    Boolean(kopya.bolum) ||
    kopya.yetenekler.length > 0 ||
    kopya.projeler.length > 0 ||
    kopya.deneyimler.length > 0;

  return doluMu ? kopya : null;
}
