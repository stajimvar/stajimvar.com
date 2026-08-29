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
 * TCKN, adres, doğum tarihi, yaş, GPA ve TELEFON. Telefon yalnızca
 * öğrenci ayrıca paylaşmayı seçtiyse — staj başvurusunun ilk adımında
 * numaranın şirkete gitmesi için bir sebep yok, e-posta yeterli.
 */

const dizi = (x) => (Array.isArray(x) ? x : []);
const metin = (x) => {
  const t = String(x ?? '').trim();
  return t || null;
};

export function basvuruKopyasi(ogrenci) {
  if (!ogrenci) return null;

  const kopya = {
    surum: 1,
    ad: metin(ogrenci.fullName),
    eposta: metin(ogrenci.email),
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

    diller: dizi(ogrenci.languages)
      .map((d) => (d?.level ? `${d.name} (${d.level})` : metin(d?.name)))
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
    kopya.projeler.length > 0;

  return doluMu ? kopya : null;
}
