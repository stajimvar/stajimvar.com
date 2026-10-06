import React, { useEffect, useRef, useState } from 'react';
import { ArayisKartlari } from './ArayisKartlari';
import { profilDolulugu } from '../lib/cv-hazirlik.mjs';
import { konfetiAt } from '../lib/konfeti';
import type { StudentProfile, SkillQuiz, ApplicationRecord } from '../types';
/*
  `uploadAvatar` ÇAĞRISI KALDIRILDI

  Kullanıcının tek fotoğrafı var ve kaynağı `social_profiles.avatar_path`;
  yükleme yalnız düzenleme ekranının sosyal bloğundan yapılıyor. Buradaki
  çağrı `student_profiles.avatar_url`e yazıyordu ve iki kolon birbirinden
  habersizdi: aynı kullanıcı profil kartında bir, sosyal profilinde başka
  bir fotoğrafla görünebiliyordu. Fonksiyon `src/lib/queries`te DURUYOR —
  kolon da duruyor ve eski fotoğraflar okunmaya devam ediyor.
*/
import { ProfilDuzenleme, type DuzenlemeBolumu } from './ProfilDuzenleme';
import { ayrilmaOnayi } from '../lib/kaydedilmemis-degisiklik.mjs';
import { fetchOpenSavedListingCount } from '../lib/opportunities';
import { useModalErisim } from '../lib/modal-erisim';
import { ProfilSayfaDuzeni, useKampusYerlesimi } from './sosyal/ProfilSayfaDuzeni';
import { KampusumPaneli } from './kampus/KampusumPaneli';
import { AgimYanSutun } from './sosyal/AgimYanSutun';
import { ProfilBasligi, type EksikAdim } from './ProfilBasligi';
import type { PortfolyoSatiri } from './sosyal/SosyalProfilSayfasi';


/**
 * Öğrenci profili / CV alanı.
 *
 * İki hâli var: ana görünüm (profil kartı, arayış kartları, portfolyo) ve
 * "Profilini düzenle" ekranı. Düzenleme kendi bileşeninde
 * (`ProfilDuzenleme`, 6 Ekim 2026): tek sütun, özet satırları, fotoğraf
 * yalnız üstte. Bu bileşen yalnız ne zaman ve hangi bölümle açılacağına
 * karar veriyor (`bolumeGit`).
 *
 * ÖNEMLİ: Burada hiçbir alan varsayılan örnek veriyle doldurulmaz. Eskiden dil
 * listesi boşken profile İngilizce/Almanca/Rusça yazılmış gibi görünüyordu —
 * kullanıcı hiç girmediği bilgiyi kendi CV'sinde görüyordu.
 */

interface StudentProfileViewProps {
  student: StudentProfile;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onUpdateProfile: (updated: Partial<StudentProfile>) => void;
  onOpenQuiz: (skillName: string) => void;
  /** Yetenek testleri artık bu sayfanın içinde. */
  quizzes?: SkillQuiz[];
  onStartQuiz?: (quiz: SkillQuiz) => void;
  /** Yazdırılabilir CV sayfasına geçiş. */
  onOpenCv?: () => void;
  /**
   * Kısa CV oluşturma akışını açar (App → `CvOlusturucu`). Doluluktaki
   * "CV oluştur" adımı buraya gidiyor; PDF yükleme düzenleme ekranındaki
   * "CV" bölümünde ayrı seçenek olarak duruyor.
   */
  onCvOlustur?: () => void;
  /**
   * Başvuru KAYITLARI — yalnızca sayısı değil.
   *
   * Önce sadece `basvuruSayisi` geliyordu; "kaç mülakat" gibi bir soruyu
   * cevaplayabilmek için sayının yanında ikinci bir sayı daha geçirmek
   * gerekirdi ve iki sayı ayrı hesaplandığında er geç birbirini tutmaz.
   * Liste bir kez geçiyor, bütün sayılar ondan çıkıyor.
   *
   * LİSTENİN KENDİSİ ARTIK BURADA DEĞİL
   * -----------------------------------
   * "Başvurularım" bölümü bu sayfanın sağ sütunundan KALKTI; yerini
   * sosyal fotoğraf portfolyosu aldı. Başvuru takibi silinmedi, kendi
   * ekranına döndü (hesap menüsündeki "Başvurularım" satırı). Sayılar
   * burada kalmaya devam ediyor: başlıktaki iki sayaç öğrencinin
   * sürecinin nerede olduğunu söylüyor ve dokununca o ekrana götürüyor.
   */
  basvurular?: ApplicationRecord[];
  /**
   * Başvuru ekranını aç — isteğe bağlı olarak mülakat süzgeciyle.
   *
   * Başlıktaki iki sayaç eskiden aynı sayfadaki `basvuru` bölümünü
   * açıyordu; o bölüm artık burada olmadığı için sayı hiçbir yere
   * götürmüyordu. Sayının GİTTİĞİ YERDE aynı sayı durmalı: mülakat
   * sayacı doğrudan mülakat süzgecini açıyor.
   *
   * Verilmezse sayaçlara tıklanamıyor (bkz. `ProfilBasligi`); çalışmayan
   * bir tıklama hedefi çizmek yerine sayı düz metin kalıyor.
   */
  onBasvurulariAc?: (altSekme?: 'all' | 'interviews') => void;
  /**
   * SOSYAL FOTOĞRAF PORTFOLYOSU — SAĞ SÜTUNUN BAŞI
   *
   * Panel App tarafından hazır veriliyor; bu bileşen sosyal veriyi
   * kendisi çekmiyor, sadece yerleştiriyor. Kalıp buradan kalkan başvuru
   * listesiyle aynıydı ve sebebi de aynı: profil ekranı bir yerleşim,
   * veri katmanına açılan ikinci bir kapı değil.
   *
   * Verilmezse sağ sütun doğrudan bölümlerle başlıyor — boş bir kutu ya
   * da "yakında" satırı çizilmiyor.
   */
  sosyalPortfolyo?: React.ReactNode;
  /**
   * SOSYAL PROFİL ALANLARI — AYNI DÜZENLEME EKRANININ İKİNCİ BÖLÜMÜ
   *
   * Görünen ad, kullanıcı adı, biyografi, eğitim notu, sınıf, şehir ve
   * profil fotoğrafı dişli menüsünden açılan AYRI bir ekrandaydı. Tek bir
   * profili düzenlemek için iki ayrı ekran ve iki ayrı giriş vardı;
   * kullanıcı bir alanı hangisinde arayacağını ancak deneyerek buluyordu.
   *
   * EKRAN BİRLEŞTİ, KAYIT BİRLEŞMEDİ. Buradaki alanlar `social_profiles`a,
   * yukarıdaki bölümler `student_profiles`a yazılıyor. Tek bir "Kaydet"
   * düğmesi tek bir sonuç iddia ederdi ve yarısı başarılı bir gönderimde
   * o iddia yanlış olurdu — bu yüzden panel KENDİ kaydetme düğmesini,
   * kendi durumunu ve kendi hata satırını taşıyor. Ortak bir hata şeridi
   * yok.
   *
   * Panel App'ten hazır geliyor; bu bileşen sosyal veriyi kendisi
   * çekmiyor. Verilmezse hiçbir şey çizilmiyor — boş bir kutu ya da
   * "yakında" satırı, olmayan bir özelliği varmış gibi göstermek olurdu.
   */
  sosyalProfilDuzenleme?: React.ReactNode;
  /**
   * DÜZENLEME EKRANININ ÜSTÜNDEKİ FOTOĞRAF KARTI (6 Ekim 2026)
   *
   * Sosyal profilin fotoğraf parçası (`duzenlemeParcasi="fotograf"`):
   * fotoğraf sayfada yalnız burada değişiyor. Verilmezse kart çizilmiyor.
   */
  sosyalFotografKarti?: React.ReactNode;
  /**
   * SOSYAL SATIRDAKİ PROFİL FOTOĞRAFININ YOLU
   *
   * Kullanıcının tek fotoğrafı var ve kaynağı
   * `social_profiles.avatar_path`. Bu ekran sosyal veriyi kendisi
   * çekmiyor (portfolyo paneli gibi, değer App'ten hazır geliyor);
   * ikinci bir sorgu aynı satırı aynı ekranda iki kez okurdu ve yeni
   * yüklenen fotoğraf bir sütunda eski kalırdı.
   *
   * `undefined` = henüz okunmadı. O aralıkta `ProfilBasligi` eski
   * `avatarUrl` yedeğine düşüyor; ikisi de yoksa iskelet çiziliyor.
   */
  sosyalAvatarYolu?: string | null;
  /**
   * SOSYAL PORTFOLYO SATIRI — KİMLİK KARTINDAKİ SAYAÇLAR VE EYLEMLER
   *
   * "N Paylaşım · N Bağlantı", birincil "Paylaş" ve dişli menüsü sağ
   * sütunun üstünden sol sütundaki kimlik kartına indi. Veri ve eylemler
   * yine sağdaki portfolyo panelinden geliyor (`sosyalAvatarYolu` ile
   * aynı kalıp): bu ekran ne sosyal veri çekiyor ne sahiplik kararı
   * veriyor. `undefined` = henüz okunmadı, `null` = satır gelmedi.
   *
   * Yalnız `sosyalPortfolyo` verilmişken karta geçiyor: panel yokken
   * kart iki boş hücreyi sonsuza kadar iskelet çizerdi.
   */
  sosyalPortfolyoSatiri?: PortfolyoSatiri | null;
  /** İlanlar sekmesindeki "Kaydettiklerim" kategorisine geçiş. */
  onKaydedilenlere?: () => void;
  /*
    HESAP EYLEMLERİ SAYFANIN EN ALTINDA

    Çıkış ve yönetim paneli üst çubuktaki avatar menüsündeydi. O menü
    mobilde kaldırıldı (alt gezinme çubuğu artık doğrudan buraya geliyor),
    dolayısıyla bu ikisinin telefonda başka bir evi kalmadı.

    Yeri sayfanın dibi: hesabı kapatmak, profili okuduktan sonra verilen
    bir karar — listenin başında duran bir "Çıkış yap" yanlışlıkla
    basılacak bir tuzaktır.
  */
  onLogout?: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}



/* ------------------------------------------------------------------ */

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  onUpdateProfile,
  onOpenQuiz,
  onOpenCv,
  onCvOlustur,
  quizzes = [],
  onStartQuiz,
  basvurular = [],
  onBasvurulariAc,
  sosyalPortfolyo,
  sosyalProfilDuzenleme,
  sosyalFotografKarti,
  sosyalAvatarYolu,
  sosyalPortfolyoSatiri,
  onKaydedilenlere,
  onSubTabChange,
  onLogout,
  isAdmin = false,
  onOpenAdmin,
}) => {
  /*
    AÇILIŞTA 'kisisel'

    Bir süre 'basvuru' seçiliydi çünkü başvuru takibi bu sayfanın içindeydi
    ve öğrenci profile en çok "başvurum ne oldu" diye giriyordu. O bölüm
    artık burada değil — kendi ekranında — dolayısıyla şeritteki ilk daire
    de okul ve iletişim. Koşullu bir başlangıç bırakılmadı: kaldırılan bir
    bölümün adına bakan koşul, sonradan okuyanı yanıltır.
  */
  /*
    DÜZENLEME AYRI BİR EKRAN — "PROFİLİNİ DÜZENLE" (6 Ekim 2026)

    Düzenleme kendi bileşeninde (`ProfilDuzenleme`): tek sütun, özet
    satırları, fotoğraf yalnız üstte. Bu bileşen yalnız ne zaman ve hangi
    bölümle açılacağına karar veriyor.

    GERİ TUŞU DÜZENLEMEDEN ÇIKARIYOR. Düzenlemeye girerken geçmişe
    `#duzenle` kaydı ekleniyor; tarayıcının geri tuşu önce düzenlemeden
    çıkıyor, sayfadan değil. Kaydedilmemiş bir değişiklik varsa soruluyor;
    "hayır" denirse kayıt yeniden ekleniyor ve kullanıcı yerinde kalıyor.
    Adres yenilenirse (`/cv#duzenle`) ekran düzenlemede açılıyor.
  */
  const [duzenleme, setDuzenleme] = useState(
    () => typeof window !== 'undefined' && window.location.hash === '#duzenle',
  );
  const [acilis, setAcilis] = useState<{ bolum: DuzenlemeBolumu | null; odak: string | null }>({
    bolum: null,
    odak: null,
  });
  /* Bu ekran mı `#duzenle` kaydı ekledi: çıkarken geri mi alınacak, yerine mi yazılacak. */
  const gecmisEklendi = useRef(false);
  const duzenlemeRef = useRef(duzenleme);
  duzenlemeRef.current = duzenleme;
  const duzenlemeAdresi = () =>
    `${window.location.pathname}${window.location.search}#duzenle`;

  useEffect(() => {
    const onPop = () => {
      if (window.location.hash === '#duzenle') {
        setDuzenleme(true);
        return;
      }
      if (!duzenlemeRef.current) return;
      if (!ayrilmaOnayi()) {
        window.history.pushState(window.history.state, '', duzenlemeAdresi());
        gecmisEklendi.current = true;
        return;
      }
      gecmisEklendi.current = false;
      setDuzenleme(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  /*
    Kampüsüm sol sütunda mı, ana sütunda mı, hiç mi (`lg` altında yok:
    başlıktaki düğme açıyor) — kararı `ProfilSayfaDuzeni` veriyor.
  */
  const kampusYerlesimi = useKampusYerlesimi();

  /*
    Arayış durumu yerel olarak tutuluyor: anahtar çevrildiğinde ekran
    hemen güncelleniyor, profilin tamamı yeniden çekilmiyor. Yazma
    başarısız olursa bileşen eski hâli koruyor ve sebebi yazıyor.
  */
  const [arayis, setArayis] = useState({
    isArayan: student.isArayan ?? false,
    stajArayan: student.stajArayan ?? false,
  });
  useEffect(() => {
    setArayis({
      isArayan: student.isArayan ?? false,
      stajArayan: student.stajArayan ?? false,
    });
  }, [student.isArayan, student.stajArayan]);
  /**
   * Bölüme git — düzenleme ekranını açıp o bölümü açık getiriyor.
   *
   * Başlıktaki eksik adım rozetleri, Kampüsüm'ün "Üniversiteni ekle"si,
   * "Profili düzenle" ve testler girişi hep buradan geçiyor: tek kapı.
   */
  const bolumeGit = (bolum: DuzenlemeBolumu | null, odak: string | null = null) => {
    setAcilis({ bolum, odak });
    if (!duzenleme) {
      window.history.pushState(window.history.state, '', duzenlemeAdresi());
      gecmisEklendi.current = true;
      setDuzenleme(true);
      window.scrollTo(0, 0);
    }
  };

  /* Düzenlemeden çık: soru `ProfilDuzenleme`de soruldu. */
  const duzenlemedenCik = () => {
    if (gecmisEklendi.current) {
      gecmisEklendi.current = false;
      window.history.back();
    } else {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
      setDuzenleme(false);
    }
    window.scrollTo(0, 0);
  };

  /*
    GÖRÜNTÜLEYİCİDEKİ KALEM → ÜSTTEKİ FOTOĞRAF KARTI

    Yükleme tek yerde (sosyal profilin fotoğraf parçası, düzenleme
    ekranının üstündeki kart). Bu eylem yalnız oraya götürüyor ve bir kare
    sonra (kart ancak o zaman ağaçta) yükleme ekranını açtırıyor.
  */
  const fotografDegistir = () => {
    bolumeGit(null);
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('stajimvar:profil-fotografi-degistir'));
    });
  };

  /* Eski bölüm kimlikleri (cv-hazirlik.mjs) → düzenleme bölümleri. */
  const adimBolumu = (anahtar: string, bolum: string): DuzenlemeBolumu => {
    if (bolum === 'kisisel') return anahtar === 'okul' ? 'egitim' : 'temel';
    if (bolum === 'teknik' || bolum === 'sosyal' || bolum === 'dil') return 'yetenek';
    if (bolum === 'cv' || bolum === 'proje' || bolum === 'tercih') return bolum;
    return 'temel';
  };

  const yetenekler = student.skills ?? [];
  const sosyal = student.softSkills ?? [];
  const diller = student.languages ?? [];
  const projeler = student.projects ?? [];
  const hedefler = student.targetRoles ?? [];
  const sehirler = student.preferences.cities ?? [];

  /*
    DOLULUK

    Yalnızca yüzde hesaplanıyor; halka bunu gösteriyor. Her adımın hangi
    bölüme ait olduğu da tutuluyordu ama onu kullanan "Sıradaki adım"
    şeridi kaldırıldı — şerit zaten eksikleri gösteriyor. Kullanılmayan
    alanı bırakmak sonradan okuyanı yanıltır.
  */
  /*
    DOLULUK TEK KAYNAKTAN (lib/cv-hazirlik.mjs, 17 Eylül 2026)

    İlan sayfası aynı hesabı ayrı bir listeyle yapıyordu ve aynı profil iki
    ekranda iki yüzde gösteriyordu. Kurallar orada yazılı: fotoğraf isteğe
    bağlı ve yüzdeye girmiyor; CV adımı platformda oluşturulan CV ya da
    yüklenen PDF'ten biriyle tamamlanıyor.
  */
  const { adimlar: dolulukAdimlari, oran } = profilDolulugu(student);
  const adimlar = dolulukAdimlari as { anahtar: string; tamam: boolean; etiket: string; bolum: string }[];

  /*
    EKSİKLER

    Yüzde tek başına ne yapılacağını söylemiyordu. Eksik adımın ADI ve
    gittiği bölüm birlikte taşınıyor: başlıktaki rozete basınca doğru
    bölüm açılıyor, öğrenci aramak zorunda kalmıyor.
  */
  const eksikler: EksikAdim[] = adimlar
    .filter((a) => !a.tamam)
    .map((a) => ({
      etiket: a.etiket,
      onClick: () =>
        a.anahtar === 'cv' && onCvOlustur
          ? onCvOlustur()
          : bolumeGit(adimBolumu(a.anahtar, a.bolum), a.anahtar === 'okul' ? 'universite' : null),
    }));

  /*
    SÜREÇ SAYILARI — HEPSİ TEK LİSTEDEN

    Mülakat sayısı burada bir kez tanımlanıyor. Başvuru listesindeki
    "Mülakatlar (n)" süzgeci de aynı iki durumu sayıyor; ikisi ayrı
    yazılsaydı biri değiştiğinde diğeri sessizce yanlış kalırdı.
  */
  const basvuruSayisi = basvurular.length;
  const mulakatSayisi = basvurular.filter(
    (b) => b.status === 'interview_scheduled' || b.status === 'technical_assessment'
  ).length;
  /*
    "Değerlendirmede" sayısı BURADAN KALKTI: tek okuyucusu kaldırılan
    başvuru bölümünün özet satırıydı. Kullanılmayan bir hesabı bırakmak,
    sonradan okuyana o sayının bir yerde gösterildiğini düşündürürdü;
    aynı ayrım başvuru ekranının kendi süzgeçlerinde duruyor.
  */

  /*
    KAYDEDİLEN İLAN SAYISI

    Sunucudan çekiliyor çünkü kaydetme sunucuda tutuluyor ve profil
    ekranı ilan listesini hiç görmüyor. Hata durumunda sayı 0 kalıyor:
    çalışmayan bir sayı göstermektense göstermemek daha dürüst.

    Yalnızca İLANLAR sayılıyor, burslar değil — sayıya basınca gidilen
    yer "Kaydettiklerim" ilan kategorisi. Sayının gittiği yerde aynı
    sayıyı göremiyorsa, sayı yanlıştır.
  */
  /* CV indirmeden önceki uyarı açık mı. */
  const [cvUyarisi, setCvUyarisi] = useState(false);
  /* ESC ile kapanma, odak tuzağı ve arka plan kilidi diğer modallarla aynı. */
  const cvKutuRef = useModalErisim<HTMLDivElement>(cvUyarisi, () => setCvUyarisi(false));

  const [kaydedilenSayisi, setKaydedilenSayisi] = useState(0);
  useEffect(() => {
    let iptal = false;
    if (!student.id) return;
    /* Yalnız yayındaki ilanlar: kutunun açtığı listeyle aynı sayı. */
    fetchOpenSavedListingCount(student.id)
      .then((adet) => {
        if (!iptal) setKaydedilenSayisi(adet);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [student.id]);

  /*
    NE ARADIĞI — TERCİHLERDEN ÜRETİLEN ETİKETLER

    Başlıkta "Staj yapmak için yer arıyorum" yazıyordu: herkeste aynı
    cümle ve hiçbir şey söylemiyor. Bunun yerine öğrencinin GERÇEK
    tercihleri okunabilir hâle getiriliyor. Uydurma yok: yalnızca
    girilmiş olan alan etikete dönüşüyor, 'Any' (fark etmez) seçimi
    etiket üretmiyor çünkü bir tercih bildirmiyor.
  */
  const durum: { basSatir: string | null; altSatir: string | null } = (() => {
    const p = student.preferences;

    /* ÜST SATIR: zaman ve tür. */
    const yil = p.earliestStartDate ? new Date(p.earliestStartDate).getFullYear() : NaN;
    let basSatir: string | null = null;
    if (p.type === 'Summer Mandatory') {
      basSatir = Number.isNaN(yil)
        ? 'Zorunlu staj arıyorum'
        : `${yil} yaz stajına açığım`;
    } else if (p.type === 'Long-term') basSatir = 'Uzun dönem staj arıyorum';
    else if (p.type === 'Voluntary') basSatir = 'Gönüllü staj arıyorum';
    else if (p.type === 'Part-time') basSatir = 'Yarı zamanlı staj arıyorum';

    /*
      ALT SATIR: koşullar. Tür üst satırda geçtiği için burada tekrar
      edilmiyor — "2026 yaz stajına açığım · Zorunlu staj" aynı şeyi iki
      kez söylerdi.
    */
    const kosullar: string[] = [];
    if (sehirler.length) kosullar.push(sehirler.slice(0, 2).join(' / '));
    if (p.workType === 'Remote') kosullar.push('Uzaktan');
    else if (p.workType === 'Hybrid') kosullar.push('Hibrit');
    else if (p.workType === 'On-site') kosullar.push('Ofisten');

    return { basSatir, altSatir: kosullar.length ? kosullar.join(' · ') : null };
  })();


  /* %100'e ilk ulaşıldığında kutlama. Her render'da değil, geçişte. */
  const oncekiOran = useRef(oran);
  useEffect(() => {
    if (oran === 100 && oncekiOran.current < 100) {
      void konfetiAt({ particleCount: 90, spread: 70, origin: { y: 0.3 } });
    }
    oncekiOran.current = oran;
  }, [oran]);

  /* "Profili düzenle": düzenleme ekranı, hiçbir bölüm açık değil. */
  const kisiselAc = () => bolumeGit(null);

  /*
    "ÜNİVERSİTENİ EKLE" → EĞİTİM BÖLÜMÜ, OKUL ALANI

    Kampüsüm paneli okulu olmayan öğrenciye bu kapıyı gösteriyor. Aynı
    ekrandaysa (`/cv`) düzenleme doğrudan açılıyor; başka bir profildeyse
    bağlantı `/cv#universite`e gidiyor ve ekran açılırken adresteki işaret
    okunuyor. Odak alanın kendisine.
  */
  const universiteEkle = () => bolumeGit('egitim', 'universite');
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#universite') return;
    /* İşaret bir kez okunuyor: yenilemede düzenleme yeniden açılmasın. */
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    universiteEkle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rozetler = student.earnedBadges ?? [];

  /*
    KAMPÜSÜM (kullanıcı tasarımı, 25 Eylül 2026): `/cv`de bakan sahibin
    kendisi, burs uygunluğu onun profiliyle. Koşul yan sütunla aynı:
    sosyal satır okunmadıysa (oturum yok ya da henüz gelmedi) panel yok.
    Düzenleme kipinde kap devre dışı ve ana sütundaki kopya da çizilmiyor.
    Hangi yerleşimin çizileceği `kampusYerlesimi`nden; `lg` altında hiçbiri.
  */
  const kampusPaneli = (yerlesim: 'sutun' | 'akis') =>
    sosyalPortfolyoSatiri?.profilId ? (
      <KampusumPaneli
        ogrenci={student}
        onNavigate={sosyalPortfolyoSatiri.onNavigate}
        onUniversiteEkle={universiteEkle}
        yerlesim={yerlesim}
      />
    ) : undefined;

  if (duzenleme) {
    return (
      <div className="w-full animate-in fade-in duration-200">
        <ProfilDuzenleme
          student={student}
          onUpdateProfile={onUpdateProfile}
          onGeri={duzenlemedenCik}
          acilisBolumu={acilis.bolum}
          odakAlani={acilis.odak}
          fotografKarti={sosyalFotografKarti}
          sosyalProfilDuzenleme={sosyalProfilDuzenleme}
          onCvOlustur={onOpenCv}
          quizzes={quizzes}
          onStartQuiz={onStartQuiz}
        />
      </div>
    );
  }

  return (
    /*
      İKİ SÜTUNLU DÜZEN (yalnızca lg ve üstü)

      Sayfa `max-w-3xl` idi: geniş ekranda içerik ortada dar bir şerit
      hâlinde duruyor, iki yanı boş kalıyordu. Anasayfa ise tam genişlikte.
      Aynı sitede iki farklı sayfa genişliği vardı.

      Artık anasayfayla aynı: solda kimlik kartı (kaydırınca yapışık kalıyor),
      sağda sosyal portfolyo.

      MOBİLDE GÖNDERİ ALANI KİMLİK KARTININ HEMEN ALTINDA

      Sütunlar alt alta dizilince sıra "kart → kariyer hedefi → testler →
      gönderiler" oluyordu: kullanıcı mobil ekran görüntüsünde
      gönderilere ulaşmak için iki kartı geçmek zorunda kaldığını
      gösterdi. O iki kart sonra ana görünümden tamamen kalktı; sıra
      artık kart → gönderiler → hesap eylemleri.

      İki sütun sarmalayıcısı `lg` altında `display: contents`
      (`contents lg:block`): kutuları kayboluyor, içlerindeki kartlar tek
      sütunlu ızgaranın doğrudan öğesi oluyor ve `order-*` ile
      sıralanıyor. Masaüstünde sarmalayıcılar geri geliyor
      (`lg:block`), sol sütun yine tek yapışık kutu; `lg:order-none` ile
      DOM sırası geçerli. Dikey boşluk mobilde ızgara `gap`inden,
      masaüstünde `lg:space-y-3`ten — ikisi birden olsaydı çift boşluk.

      NEDEN `order` HÂLÂ DURUYOR: sol sütunda tek kart kaldı ama hesap
      eylemleri sağ sütunun sonunda; sarmalayıcılar `contents` olmasa
      mobilde "kart → hesap eylemleri → gönderiler" olurdu. Aynı
      `contents` + `order` kalıbı bu yüzden yerinde; masaüstünde
      `lg:order-none` ile DOM sırası geçerli.

      DÜZENLEME AYNI İSKELETİ KULLANIYOR: solda hangi bölümde olduğun,
      sağda o bölümün formu. İkinci bir yerleşim kurmak, aynı sayfanın
      iki farklı genişlikte iki hâli demek olurdu; kullanıcı düzenlemeye
      girip çıkarken sütunlar kayardı.

      TELEFONDA SÜTUNLAR ARASI BOŞLUK YOK

      `gap-4` telefonda kimlik kartıyla ızgara arasında gri bir bant
      bırakıyordu. Profil kesintisiz tek bir beyaz yüzey olmalı: kimlik
      bloğu biter, ızgara hemen başlar. Geniş ekranda boşluk duruyor —
      orada iki sütun yan yana ve aralarında nefes payı gerekiyor.

      DEĞER İKİ EKRANDA DA AYNI: bu iskelet `SosyalProfilGorunumu` ile
      BİREBİR aynı olmak zorunda, yoksa kişi kendi ekranıyla başkasının
      ekranı arasında geçerken düzen kayar. `tests/sosyal-profil-arayuzu`
      bunu dize dize karşılaştırıyor.
    */
    <div className="w-full pb-16 animate-in fade-in duration-200">
      {/*
        X SAYFA DÜZENİ (kullanıcı kararı 24 Eylül 2026: X sayfa düzeni, sol
        menü yok): ana görünüm ortada en çok 600 piksellik bir sütunda,
        sağında (xl ve üstü) yan sütun — öneriler, son ilanlar, rehberler
        (`AgimYanSutun`, olduğu gibi). Ölçüler `ProfilSayfaDuzeni`nde tek
        yerde; `/profil/:ad` ve şirket sayfası da aynı kabı kullanıyor.

        İÇERİDEKİ 12'LİK IZGARA DEĞİŞMEDİ: ana görünümde iki blok zaten
        `lg:col-span-12` (üst üste); sütun daralınca ızgara onu izliyor.
        DÜZENLEME kipinde kap devre dışı — iki sütunlu form iskeleti aynen.

        YAN SÜTUN BAKAN İÇİN: `/cv`de bakan sahibin kendisi; kimliği ve
        alanı portfolyo panelinin satırından (`profilId`, `sektorId`).
        Satır yoksa (oturum yok ya da henüz okunmadı) yan sütun çizilmiyor.
      */}
      <ProfilSayfaDuzeni
        solSutun={kampusPaneli('sutun')}
        yanSutun={
          sosyalPortfolyoSatiri?.profilId ? (
            <AgimYanSutun
              kullaniciId={sosyalPortfolyoSatiri.profilId}
              sektorId={sosyalPortfolyoSatiri.sektorId}
              onNavigate={sosyalPortfolyoSatiri.onNavigate}
            />
          ) : undefined
        }
      >
      <div className="grid grid-cols-1 gap-0 sm:gap-6 lg:grid-cols-12 items-start">

        {/*
          ---------------- ÜST / SOL: profil başlığı ----------------

          ANA GÖRÜNÜM TEK SÜTUN (17 Eylül 2026 tasarımı): profil kartı
          üstte tam genişlikte, paylaşım galerisi altında. İskelet dizesi
          (`grid ... lg:grid-cols-12`) ziyaretçi görünümüyle ortak kaldı;
          yalnız sütun genişlikleri değişiyor. DÜZENLEMEDE iki sütun
          (solda bölüm listesi, sağda form) aynen duruyor.
        */}
        <div
          className="contents lg:block lg:col-span-12"
        >
          {/*
            KARİYER HEDEFİ VE TESTLER KARTLARI ANA GÖRÜNÜMDEN KALKTI

            İkisi de kimlik kartının altında ayrı birer karttı. Hedef
            düzenleme ekranındaki "Ne arıyorsun?" bölümünde (id `tercih`,
            "Aradığın pozisyon") zaten dolduruluyor ve kartın durum
            satırı `bolumeGit('tercih')` ile oraya gidiyor; ana görünümde
            ikinci bir kopyası aynı bilgiyi iki kez gösteriyordu. Testler
            kartı ise testlere giden tek yoldu — o giriş kimlik kartının
            içine tek satır olarak indi (`rozetSayisi` / `onTestlere`).
            Sayfa artık profil kartı, gönderi alanı ve hesap eylemleri.
          */}
          {(
          /*
            `-mx-4 sm:mx-0`: kimlik bloğu TELEFONDA ekranın iki kenarına
            yaslanıyor. Kabuğun `px-4`i yerinde bırakıldı — kaldırılsaydı
            sağ sütundaki hesap eylemleri ve düzenleme formları da kenara
            yapışırdı; onlar yüzey değil kutu. Bleed yalnız yüzey olması
            gereken iki öğede.
          */
          <ProfilBasligi
            className="-mx-4 sm:mx-0"
            ad={student.fullName}
            avatarUrl={student.avatarUrl}
            /*
              Sosyal satırdaki yol sağ sütundaki portfolyo panelinden
              geliyor: aynı satırı bu bileşen ikinci kez sorgulasaydı
              yeni yüklenen fotoğraf iki sütunda iki farklı anda
              tazelenirdi.
            */
            sosyalAvatarYolu={sosyalAvatarYolu}
            /*
              Sayaçlar ve eylemler de aynı panelden. Panel yoksa prop hiç
              geçmiyor: kart o zaman sosyal hücre ve düğme ÇİZMİYOR —
              olmayan bir panele iskelet ayırmak, onu varmış gibi
              göstermek olurdu.
            */
            portfolyo={sosyalPortfolyo ? { satir: sosyalPortfolyoSatiri } : undefined}
            okul={student.university}
            bolum={student.department}
            sinif={student.gradeLevel}
            /* Oturduğu il (`student_profiles.city`); boşsa satır çizilmiyor. */
            konum={student.city}
            durum={durum}
            onEtiketDuzenle={() => bolumeGit('tercih')}
            oran={oran}
            eksikler={eksikler}
            kaydedilenSayisi={kaydedilenSayisi}
            basvuruSayisi={basvuruSayisi}
            mulakatSayisi={mulakatSayisi}

            onDuzenle={kisiselAc}
            onCv={
              onOpenCv
                ? () => {
                    /*
                      Eksik profilden indirilen CV de eksik çıkıyor ve
                      öğrenci bunu ancak dosyayı açınca fark ediyordu.
                      Uyarı indirmeyi engellemiyor — neyin eksik olduğunu
                      söyleyip kararı öğrenciye bırakıyor.
                    */
                    if (eksikler.length > 0) setCvUyarisi(true);
                    else onOpenCv();
                  }
                : undefined
            }
            onKaydedilenlere={onKaydedilenlere}
            /* Yönetim paneli ve çıkış "Ayarlar ve hareketler" menüsünde (ProfilBasligi). */
            onYonetim={isAdmin && onOpenAdmin ? onOpenAdmin : undefined}
            onCikis={onLogout}
            /*
              İKİ SAYAÇ DA AYRI BAŞVURU EKRANINA GİDİYOR

              Eskiden ikisi de bu sayfadaki `basvuru` bölümünü açıyordu; o
              bölüm sağ sütundan kalktığı için tıklama hiçbir şey yapmayan
              bir hedefe düşerdi. Eylem verilmediğinde `ProfilBasligi`
              sayıyı tıklanabilir çizmiyor — çalışmayan bir hedef yerine
              düz metin.
            */
            onBasvurulara={onBasvurulariAc ? () => onBasvurulariAc('all') : undefined}
            onMulakatlara={
              /* Mülakat sayısına basan kişi mülakatları görmek istiyor. */
              onBasvurulariAc ? () => onBasvurulariAc('interviews') : undefined
            }
            /*
              TESTLERE GİDEN TEK YOL ARTIK KARTIN İÇİNDE

              "Yetkinlik testleri" kartı ana görünümden kalktı ve hesap
              menüsü de yok; testler bölümüne (`id="rozet"`, düzenleme
              dalında) başka bir giriş kalmamıştı. Sayı uydurulmuyor:
              `earnedBadges` uzunluğu, aynı bölümün özet satırındaki
              sayının kaynağı.
            */
            rozetSayisi={rozetler.length}
            onTestlere={() => bolumeGit('rozet')}
            /* Görüntüleyicideki kalem; yalnız sosyal panel varken (yükleme orada). */
            onFotografDegistir={sosyalProfilDuzenleme ? fotografDegistir : undefined}
          />
          )}


          {/*
            CV UYARISI

            İndirmeyi engellemiyor: öğrencinin eksik profille CV indirmesi
            geçerli bir tercih olabilir (staja bugün başvuracaktır). Uyarı
            yalnızca neyin eksik kalacağını söylüyor ve düzeltmeyi bir
            dokunuş uzağa koyuyor.
          */}
          {cvUyarisi && onOpenCv && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
              <div
                ref={cvKutuRef}
                role="dialog"
                aria-modal="true"
                className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <h2 className="text-base font-extrabold text-gray-900">
                    CV'n eksik bilgilerle inecek
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Şunlar henüz girilmedi:{' '}
                    <strong className="text-gray-900">
                      {eksikler.map((e) => e.etiket).join(', ')}
                    </strong>
                    . İşveren CV'de bu bölümleri boş görecek.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCvUyarisi(false);
                      eksikler[0]?.onClick();
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Önce tamamla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCvUyarisi(false);
                      onOpenCv();
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Yine de indir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/*
            "Sıradaki adım" şeridi kaldırıldı.

            Şerit zaten aynı şeyi söylüyor ve daha iyi söylüyor: boş bölüm
            kesik çizgili çemberle ve "ekle" yazısıyla duruyor, hepsi aynı
            anda görünüyor. Ayrı bir satırda tek bir eksiği tekrar etmek
            aynı bilgiyi iki kez göstermekti.
          */}
        </div>

        {/* ---------------- SAĞ: portfolyo ya da açık bölüm ---------------- */}
        <div
          className="contents lg:block lg:col-span-12 min-w-0 lg:space-y-3"
        >

      {/*
        ---------------- SOSYAL FOTOĞRAF PORTFOLYOSU ----------------

        Buradaki blok "Başvurularım" idi. Başvuru takibi SİLİNMEDİ, kendi
        ekranına döndü: hesap menüsündeki "Başvurularım" satırı ve
        başlıktaki iki sayaç oraya götürüyor. Aynı ekranda hem başvuru
        listesi hem portfolyo olsaydı sağ sütun iki ayrı işin sırasını
        tartışırdı; portfolyo yukarıda çünkü profil ekranının konusu
        öğrencinin kendisi, başvuru süreci ayrı bir takip işi.

        Panel App'ten hazır geliyor ve VERİLMEZSE hiçbir şey çizilmiyor:
        boş bir kutu ya da "yakında" satırı, olmayan bir özelliği varmış
        gibi göstermek olurdu.

        DÜZENLEMEDE ÇİZİLMİYOR: portfolyo kendi ızgarasını, sayaçlarını ve
        dişli menüsünü taşıyor; formun üstünde durunca sağ sütun aynı anda
        hem bir görünüm hem bir form olurdu.

        Sarmalayıcı `order-1`: mobilde kimlik kartının hemen altı. `min-w-0`
        burada da var çünkü sağ sütun kutusu mobilde `contents` — dış
        `min-w-0` orada geçersiz, ızgara daralınca içerik taşardı.
      */}
      {/*
        `-mx-4 sm:mx-0`: fotoğraf ızgarası TELEFONDA kenara yaslı —
        kareler ekranın iki kenarına kadar gidiyor ve kimlik bloğuyla
        birlikte tek bir beyaz yüzey oluşturuyor. Ziyaretçi
        görünümündeki ızgarayla aynı his; orada bleed'i kabuğun kendisi
        veriyor (`SayfaKabugu mobilKenarsiz`), burada blok kendi veriyor
        çünkü aynı sütunda kutu olarak kalması gereken başka bloklar da
        var.
      */}
      {/*
        ARAYIŞ ANAHTARLARI — DÜZENLEME MODUNDA DEĞİL, HER ZAMAN

        Bu bir form alanı değil, bir DURUM: "şu an iş/staj arıyorum".
        Düzenleme bölümlerinin içine koysaydık öğrencinin onu bulması
        için önce "Profili düzenle"ye girmesi gerekirdi; oysa bu, profil
        açılır açılmaz görünmesi gereken ve tek dokunuşla değişen bir
        tercih.
      */}
      {(
        <div className="order-0 min-w-0 lg:order-none">
          <ArayisKartlari
            ogrenciId={student.id}
            isArayan={arayis.isArayan}
            stajArayan={arayis.stajArayan}
            onDegisti={setArayis}
          />
        </div>
      )}

      {/*
        KAMPÜSÜM — 1024–1439'DA PROFİLİN ALTINDA, PAYLAŞIMLARDAN ÖNCE

        Yalnız `lg` ile sol sütun eşiği arasında burada. 1440 ve üstünde
        sol sütunda; `lg` altında profilde hiç yok (kullanıcı isteği,
        25 Eylül 2026: telefonda Kampüsüm başlıktaki düğmeden açılıyor;
        profilde tekrarı gereksiz). Her genişlikte tek kopya, tek istek.
        Telefondaki `order-1 -mx-4 sm:mx-0` kalıbı bu dalda yok: dal yalnız
        `lg` üstünde çiziliyor, orada ızgara `contents` değil ve DOM sırası
        geçerli — arayış kartlarının altında, paylaşımların üstünde.
      */}
      {kampusYerlesimi === 'akis' && kampusPaneli('akis') && (
        <div className="min-w-0">{kampusPaneli('akis')}</div>
      )}

      {sosyalPortfolyo && (
        <div className="order-1 -mx-4 min-w-0 sm:mx-0 lg:order-none">
          {sosyalPortfolyo}
        </div>
      )}

        </div>
      </div>
      </ProfilSayfaDuzeni>
    </div>
  );
};
