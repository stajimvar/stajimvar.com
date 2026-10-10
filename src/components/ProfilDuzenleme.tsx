import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  AtSign,
  Award,
  Briefcase,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  Link2,
  Loader2,
  Save,
  Target,
  Upload,
  User,
  UserRound,
} from 'lucide-react';
import type { CvGizliAlan, SkillQuiz, StudentProfile } from '../types';
import { CvAlani } from './CvAlani';
import { ProfilFotografi } from './sosyal/ProfilFotografi';
import { ODAK_HALKASI } from '../lib/renk-token';
import { TR_CITIES } from '../data/turkeyData';
import { HARD_SKILLS_DICTIONARY } from '../data/skillsDictionary';
import { YETENEK_GRUPLARI } from '../data/cv-secenekleri';
import { profilDolulugu } from '../lib/cv-hazirlik.mjs';
import { degisenBolumler, taslakKirliMi, taslakOlustur, taslaktanYama } from '../lib/profil-taslagi.mjs';
import { BIRINCIL, IKINCIL } from './profil/form-siniflari';
import { CvGorunurluk } from './profil/CvGorunurluk';
import { Baglantilar, KisiselBilgiler } from './profil/KisiselBilgiler';
import { DeneyimListesi, EgitimListesi, ProjeListesi, SertifikaListesi } from './profil/KayitListeleri';
import { DilListesi, YetenekVeIlgi } from './profil/DilVeYetenek';
import { TercihAyarlari } from './profil/TercihAyarlari';
import type { BolumProps, Taslak } from './profil/ortak';
import {
  AYRILMA_SORUSU,
  kaydedilmemisAbone,
  kaydedilmemisIsaretle,
  kaydedilmemisKaydet,
  kaydedilmemisOnekVarMi,
  kaydedilmemisTemizle,
  kaydedilmemisVarMi,
} from '../lib/kaydedilmemis-degisiklik.mjs';

/**
 * PROFİLİNİ DÜZENLE — TEK TASLAK, TEK KAYDET (11 Ekim 2026, kullanıcının
 * verdiği mobil tasarım)
 *
 * Önceden her bölümün kendi "Kaydet"i vardı ve liste öğeleri eklendiği an
 * sunucuya gidiyordu. Artık:
 *
 *  · Bütün bölümler TEK bir taslağı düzenliyor (`lib/profil-taslagi.mjs`).
 *    Bölümden bölüme geçmek hiçbir değişikliği kaybettirmiyor.
 *  · Ekranın altındaki "Tüm değişiklikleri kaydet" taslağı doğruluyor ve
 *    değişen bölümleri TEK istekte, sunucuda TEK işlemde yazıyor
 *    (`ogrenci_profilini_kaydet`, 20261207010000). Hata olursa taslak
 *    yerinde kalıyor; düğme kaydederken kilitli (çift kayıt yok).
 *  · Kaydedilmemiş değişiklikle çıkmak isteyen soruluyor (geri tuşu,
 *    "Profili görüntüle", sekme kapatma).
 *
 * YERLEŞİM
 *  Üstte fotoğraf kartı ve tamamlanma durumu. Kartlar: Temel bilgiler
 *  (Kişisel bilgiler, Bağlantılar, Deneyim, Eğitim, Diller — her biri
 *  kendi paneline açılıyor), Yetenekler ve ilgi alanları, Projeler,
 *  Sertifikalar, CV. Altta "Diğer ayarlar". Telefonda panel listenin
 *  yerine açılıyor ("‹ Profilini düzenle" ile dönülüyor); geniş ekranda
 *  liste solda, panel sağda — genişlik boşa gitmiyor.
 *
 * TAMAMLANMA yalnız temel bilgilere bakıyor (`profilDolulugu`); yetenek,
 * proje, sertifika, deneyim ve bağlantılar isteğe bağlı.
 */

export type DuzenlemeBolumu =
  | 'temel'
  | 'kisisel'
  | 'baglanti'
  | 'deneyim'
  | 'egitim'
  | 'dil'
  | 'yetenek'
  | 'proje'
  | 'sertifika'
  | 'cv'
  | 'cv-gorunurluk'
  | 'tercih'
  | 'rozet'
  | 'sosyal';

type AltBolum = 'kisisel' | 'baglanti' | 'deneyim' | 'egitim' | 'dil' | 'cv-gorunurluk';
type KartKimligi = 'temel' | 'yetenek' | 'proje' | 'sertifika' | 'cv' | 'tercih' | 'rozet' | 'sosyal';

const ALT_BOLUMLER: AltBolum[] = ['kisisel', 'baglanti', 'deneyim', 'egitim', 'dil', 'cv-gorunurluk'];
const KARTLAR: KartKimligi[] = ['temel', 'yetenek', 'proje', 'sertifika', 'cv', 'tercih', 'rozet', 'sosyal'];

interface Props {
  student: StudentProfile;
  /** App'teki kayıt; `false` dönerse kayıt başarısız (eski hâl geri yüklendi). */
  onUpdateProfile: (yama: Partial<StudentProfile>) => unknown;
  /** "Profili görüntüle" — kaydedilmemiş değişiklik sorusu bu bileşende. */
  onGeri: () => void;
  /** Açılışta açık bölüm (sayfanın başka yerinden gelinen bağlantı). */
  acilisBolumu?: DuzenlemeBolumu | null;
  /** Açılışta odaklanacak alanın kimliği (ör. 'universite'). */
  odakAlani?: string | null;
  /** Üstteki fotoğraf kartı (sosyal profilin fotoğraf parçası). */
  fotografKarti?: React.ReactNode;
  /** Profil fotoğrafı var mı (sosyal profildeki yol ya da eski adres) — tamamlanma için. */
  fotografVar?: boolean;
  /** Fotoğraf yüklemeyi açar (tamamlanma kartındaki "profil fotoğrafı ekle"). */
  onFotografEkle?: () => void;
  /** Sosyal profil satırının içeriği: kapak, kullanıcı adı, görünen ad, biyografi. */
  sosyalProfilDuzenleme?: React.ReactNode;
  /** "Profilimden CV oluştur": profildeki bilgilerle yazdırılabilir CV. */
  onCvOlustur?: () => void;
  quizzes?: SkillQuiz[];
  onStartQuiz?: (quiz: SkillQuiz) => void;
}

/* ------------------------------------------------------------------ */

const BOLUM_BILGISI: Record<AltBolum, { baslik: string; aciklama: string; ikon: React.ReactNode }> = {
  kisisel: { baslik: 'Kişisel bilgiler', aciklama: 'Ad soyad, şehir, iletişim ve kısa tanıtım.', ikon: <User /> },
  baglanti: { baslik: 'Bağlantılar', aciklama: 'İsteğe bağlı. Boş bağlantı CV’de görünmez.', ikon: <Link2 /> },
  deneyim: {
    baslik: 'Deneyim',
    aciklama: 'İş, staj ve gönüllü çalışmaların. İsteğe bağlı; CV’de en yeniden eskiye sıralanır.',
    ikon: <Briefcase />,
  },
  egitim: { baslik: 'Eğitim', aciklama: 'Okulların ve programların. Okul adı CV’de yalnız Eğitim bölümünde yazar.', ikon: <GraduationCap /> },
  dil: { baslik: 'Diller', aciklama: 'Bildiğin diller ve seviyeleri.', ikon: <Globe /> },
  'cv-gorunurluk': {
    baslik: 'CV’de neler görünsün?',
    aciklama: 'Kapattığın bilgi profilinden silinmez; yalnızca oluşturulan CV’de görünmez.',
    ikon: <Eye />,
  },
};

/* Taslak bölümü → ekrandaki yer (değişiklik ve hata işaretleri için). */
const TASLAK_YERI: Record<string, AltBolum | KartKimligi> = {
  kisisel: 'kisisel',
  baglanti: 'baglanti',
  egitimler: 'egitim',
  deneyimler: 'deneyim',
  diller: 'dil',
  yetenekler: 'yetenek',
  ilgiler: 'yetenek',
  projeler: 'proje',
  sertifikalar: 'sertifika',
  cvGizli: 'cv-gorunurluk',
  tercih: 'tercih',
};

const IKON_KUTUSU =
  'flex shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 [&>svg]:h-5 [&>svg]:w-5';

type Isaret = 'hata' | 'degisti' | null;

/** Satırın sağındaki küçük durum işareti. */
const DurumIsareti: React.FC<{ isaret: Isaret }> = ({ isaret }) =>
  isaret === 'hata' ? (
    <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">Düzelt</span>
  ) : isaret === 'degisti' ? (
    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">Kaydedilmedi</span>
  ) : null;

/** Açılır kart (modül düzeyinde: içindeki girdiler her çizimde sökülmesin). */
const Kart: React.FC<{
  id: KartKimligi;
  ikon: React.ReactNode;
  baslik: string;
  ozet: string;
  acik: boolean;
  onToggle: (id: KartKimligi) => void;
  isaret?: Isaret;
  children: React.ReactNode;
}> = ({ id, ikon, baslik, ozet, acik, onToggle, isaret = null, children }) => (
  <section id={`duzenle-${id}`} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white">
    <h2>
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={acik}
        aria-controls={`duzenle-${id}-icerik`}
        className={`flex w-full min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left sm:gap-4 sm:px-5 ${ODAK_HALKASI}`}
      >
        <span aria-hidden className={`${IKON_KUTUSU} h-12 w-12`}>
          {ikon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="min-w-0 truncate">{baslik}</span>
            <DurumIsareti isaret={isaret} />
          </span>
          <span className="line-clamp-2 block text-sm text-gray-600">{ozet}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={`h-5 w-5 shrink-0 text-gray-700 transition-transform ${acik ? 'rotate-180' : ''}`}
        />
      </button>
    </h2>
    {acik && (
      <div id={`duzenle-${id}-icerik`} className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        {children}
      </div>
    )}
  </section>
);

/** Kartın içindeki alt bölüm satırı: kendi paneline açılıyor. */
const AltSatir: React.FC<{
  id: AltBolum;
  ozet: string;
  secili: boolean;
  onAc: (id: AltBolum) => void;
  isaret?: Isaret;
}> = ({ id, ozet, secili, onAc, isaret = null }) => (
  <li>
    <button
      type="button"
      id={`satir-${id}`}
      onClick={() => onAc(id)}
      aria-current={secili ? 'true' : undefined}
      className={`flex w-full min-h-16 cursor-pointer items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 ${secili ? 'lg:bg-blue-50/70' : ''} ${ODAK_HALKASI}`}
    >
      <span aria-hidden className={`${IKON_KUTUSU} h-11 w-11`}>
        {BOLUM_BILGISI[id].ikon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-bold text-gray-900">
          <span className="min-w-0 truncate">{BOLUM_BILGISI[id].baslik}</span>
          <DurumIsareti isaret={isaret} />
        </span>
        <span className="line-clamp-2 block text-sm text-gray-600">{ozet}</span>
      </span>
      <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-gray-700" />
    </button>
  </li>
);

const listeOzeti = (liste: string[], ek = 2) =>
  liste.slice(0, ek).join(', ') + (liste.length > ek ? ` +${liste.length - ek}` : '');

/* ------------------------------------------------------------------ */

export const ProfilDuzenleme: React.FC<Props> = ({
  student,
  onUpdateProfile,
  onGeri,
  acilisBolumu = null,
  odakAlani = null,
  fotografKarti,
  fotografVar,
  onFotografEkle,
  sosyalProfilDuzenleme,
  onCvOlustur,
  quizzes = [],
  onStartQuiz,
}) => {
  /* Açılışta istenen yer: alt bölüm paneli ya da açık kart. */
  const ilkYer: DuzenlemeBolumu | null = acilisBolumu === 'temel' ? 'kisisel' : acilisBolumu;
  const [secili, setSecili] = useState<AltBolum | null>(() =>
    ilkYer && (ALT_BOLUMLER as string[]).includes(ilkYer) ? (ilkYer as AltBolum) : null,
  );
  const [acikKartlar, setAcikKartlar] = useState<Set<KartKimligi>>(() => {
    const s = new Set<KartKimligi>(['temel', 'cv']);
    if (ilkYer && (KARTLAR as string[]).includes(ilkYer)) s.add(ilkYer as KartKimligi);
    if (ilkYer === 'cv-gorunurluk') s.add('cv');
    return s;
  });

  /* ============================== TASLAK ============================== */
  /*
    `taslak === null` → ekranda kayıtlı değer. İlk yazışta taslak doğuyor;
    kayıt başarılı olunca atılıyor ve ekran yeni kayıtlı değeri gösteriyor.
    Başarısız olursa (App eski hâle döndürüyor) taslak yerinde kalıyor.
  */
  const taban = useMemo(() => taslakOlustur(student), [student]);
  const [taslak, setTaslak] = useState<Taslak | null>(null);
  const t = taslak ?? taban;
  const degistir = (f: (t: Taslak) => Taslak) => {
    setTaslak((o) => f(o ?? taban));
    if (durum === 'kaydedildi' || durum === 'hata') setDurum('bos');
  };
  const kirli = taslakKirliMi(taslak, student);

  const yetenekTuru = useMemo(() => {
    const turler = new Map(YETENEK_GRUPLARI.flatMap((g) => g.ogeler).map((o) => [o.ad.toLocaleLowerCase('tr-TR'), o.tur]));
    const programlar = new Set(HARD_SKILLS_DICTIONARY.map((h) => h.toLocaleLowerCase('tr-TR')));
    /* Hazır listede türü yazılı; değilse geniş program sözlüğündeyse program, yoksa beceri. */
    return (ad: string) => {
      const k = ad.toLocaleLowerCase('tr-TR');
      return turler.get(k) ?? (programlar.has(k) ? 'program' : 'beceri');
    };
  }, []);
  const secenekler = useMemo(() => ({ sehirler: TR_CITIES, yetenekTuru }), [yetenekTuru]);

  /* Doğrulama mesajları ilk kayıt denemesinden sonra gösteriliyor; düzeltildikçe kalkıyor. */
  const [dogrulamaAcik, setDogrulamaAcik] = useState(false);
  const hatalar = useMemo(
    () => (dogrulamaAcik && taslak ? taslaktanYama(taslak, student, secenekler).hatalar : []),
    [dogrulamaAcik, taslak, student, secenekler],
  );
  const hataHaritasi = useMemo(() => new Map(hatalar.map((h) => [h.alan, h.mesaj])), [hatalar]);
  const bolumProps: BolumProps = {
    t,
    degistir,
    hata: (alan) => hataHaritasi.get(alan),
    hataVar: (onEk) => hatalar.some((h) => h.alan.startsWith(onEk)),
  };

  const degisen = useMemo(() => new Set(degisenBolumler(taslak, student).map((k) => TASLAK_YERI[k])), [taslak, student]);
  const hataliYerler = useMemo(() => {
    const s = new Set<string>();
    for (const h of hatalar) s.add(h.bolum === 'yetenek' ? 'yetenek' : h.bolum);
    return s;
  }, [hatalar]);
  const isaret = (yer: AltBolum | KartKimligi): Isaret => (hataliYerler.has(yer) ? 'hata' : degisen.has(yer) ? 'degisti' : null);

  /* ============================== KAYIT =============================== */
  type Durum = 'bos' | 'kaydediliyor' | 'kaydedildi' | 'hata';
  const [durum, setDurum] = useState<Durum>('bos');
  const kilit = useRef(false);
  const zamanlayici = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(zamanlayici.current), []);

  const yereGit = (bolum: string, alan?: string | null) => {
    if ((ALT_BOLUMLER as string[]).includes(bolum)) {
      setAcikKartlar((o) => new Set(o).add(bolum === 'cv-gorunurluk' ? 'cv' : 'temel'));
      bolumAc(bolum as AltBolum, false);
    } else if ((KARTLAR as string[]).includes(bolum)) {
      setSecili(null);
      setAcikKartlar((o) => new Set(o).add(bolum as KartKimligi));
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const hedef = (alan && document.getElementById(alan)) || document.getElementById(`duzenle-${bolum}`);
        hedef?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (alan) document.getElementById(alan)?.focus({ preventScroll: true });
      }),
    );
  };

  /** Bütün değişiklikleri kaydeder. Başarılıysa true. */
  const kaydetHepsi = async (): Promise<boolean> => {
    if (kilit.current) return false;
    if (!taslak || !kirli) return true;
    const { yama, hatalar: bulunan } = taslaktanYama(taslak, student, secenekler);
    setDogrulamaAcik(true);
    if (bulunan.length > 0) {
      setDurum('bos');
      yereGit(bulunan[0].bolum, bulunan[0].alan);
      return false;
    }
    if (Object.keys(yama).length === 0) {
      setTaslak(null);
      return true;
    }
    kilit.current = true;
    setDurum('kaydediliyor');
    let sonuc: unknown;
    try {
      sonuc = await Promise.resolve(onUpdateProfile(yama as Partial<StudentProfile>));
    } catch {
      sonuc = false;
    }
    kilit.current = false;
    if (sonuc === false) {
      setDurum('hata');
      return false;
    }
    setTaslak(null);
    setDogrulamaAcik(false);
    setDurum('kaydedildi');
    window.clearTimeout(zamanlayici.current);
    zamanlayici.current = window.setTimeout(() => setDurum((d) => (d === 'kaydedildi' ? 'bos' : d)), 3000);
    return true;
  };

  /* Tek seferlik kayıt (PDF CV yükleme): taslaktan bağımsız, dosya hemen yazılıyor. */
  const tekKayit = async (yama: Partial<StudentProfile>) => {
    let sonuc: unknown;
    try {
      sonuc = await Promise.resolve(onUpdateProfile(yama));
    } catch {
      sonuc = false;
    }
    return sonuc !== false;
  };

  /* ======================== KİRLİLİK VE GEZİNME ======================= */
  /*
    SOSYAL PROFİL FORMU kendi bileşeninde ve kendi gönderimiyle kaydediliyor;
    kirliliğini ortak kayda 'sosyal:' önekiyle yazıyor. Bu ekran ona abone.
  */
  const sosyalKirli = useSyncExternalStore(
    kaydedilmemisAbone,
    () => kaydedilmemisOnekVarMi('sosyal:'),
    () => false,
  );
  useEffect(() => {
    kaydedilmemisIsaretle('profil:taslak', kirli);
  }, [kirli]);
  useEffect(() => () => kaydedilmemisTemizle('profil:'), []);

  /* Sekme kapatma / yenileme: tarayıcının kendi sorusu. */
  useEffect(() => {
    if (!kirli && !sosyalKirli) return;
    const dur = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', dur);
    return () => window.removeEventListener('beforeunload', dur);
  }, [kirli, sosyalKirli]);

  /* Telefonun alt menüsü bu ekranda gizli; yerinde kaydet çubuğu var (index.css). */
  useEffect(() => {
    document.documentElement.setAttribute('data-profil-duzenleme', '');
    return () => document.documentElement.removeAttribute('data-profil-duzenleme');
  }, []);

  const geriDon = () => {
    if (kaydedilmemisVarMi() && !window.confirm(AYRILMA_SORUSU)) return;
    kaydedilmemisTemizle('profil:');
    onGeri();
  };

  /* Panel aç / listeye dön. Telefonda panel listenin yerine geçiyor; dönüşte kaldığın yere. */
  const listeKonumu = useRef(0);
  const bolumAc = (id: AltBolum, kaydir = true) => {
    if (secili === null) listeKonumu.current = window.scrollY;
    setSecili(id);
    if (kaydir) window.scrollTo(0, 0);
  };
  const listeyeDon = () => {
    const y = listeKonumu.current;
    setSecili(null);
    requestAnimationFrame(() => window.scrollTo(0, y));
  };

  const [sosyalUyari, setSosyalUyari] = useState(false);
  const kartToggle = (id: KartKimligi) => {
    if (id === 'sosyal' && acikKartlar.has('sosyal') && sosyalKirli) {
      /* Kirli sosyal form sessizce kapanmıyor: önce kaydet ya da at. */
      setSosyalUyari(true);
      return;
    }
    setAcikKartlar((o) => {
      const y = new Set(o);
      if (y.has(id)) y.delete(id);
      else y.add(id);
      return y;
    });
  };
  useEffect(() => {
    if (sosyalUyari && !sosyalKirli) setSosyalUyari(false);
  }, [sosyalUyari, sosyalKirli]);

  /* Açılışta istenen alana odak ve bölüme kaydırma (bir kare sonra: bölüm o an çiziliyor). */
  useEffect(() => {
    if (!ilkYer) return;
    requestAnimationFrame(() => {
      const kart = (KARTLAR as string[]).includes(ilkYer) ? document.getElementById(`duzenle-${ilkYer}`) : null;
      kart?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (odakAlani) document.getElementById(odakAlani)?.focus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* "Profilimden CV oluştur" kaydedilmemiş değişiklik varken önce kaydettiriyor: CV kayıtlı bilgiden oluşuyor. */
  const [cvSorusu, setCvSorusu] = useState(false);

  /* ============================ TAMAMLANMA =========================== */
  const doluluk = profilDolulugu(student, { fotografVar });
  const eksikler = doluluk.adimlar.filter((a) => !a.tamam);

  /* ============================== ÖZETLER ============================= */
  const dolEgitim = t.egitimler.filter((e) => e.okul.trim()).length;
  const ozetler: Record<AltBolum, string> = {
    kisisel: 'Ad soyad, hakkında, telefon, e-posta',
    baglanti:
      [t.baglanti.linkedin.trim() && 'LinkedIn', t.baglanti.portfolyo.trim() && 'Portföy', t.baglanti.github.trim() && 'GitHub']
        .filter(Boolean)
        .join(', ') || 'LinkedIn, Portföy',
    deneyim: t.deneyimler.length ? `${t.deneyimler.length} deneyim eklendi` : 'İsteğe bağlı',
    egitim: dolEgitim ? `${dolEgitim} eğitim eklendi` : 'Okulunu ekle',
    dil: t.diller.length ? listeOzeti(t.diller.map((l) => l.ad).filter(Boolean), 3) || 'Dil seç' : 'Bildiğin dilleri ekle',
    'cv-gorunurluk': 'Kapattığın bilgi profilinden silinmez; yalnızca oluşturulan CV’de görünmez.',
  };
  const yetenekOzeti = t.yetenekler.length + t.ilgiler.length
    ? listeOzeti([...t.yetenekler, ...t.ilgiler], 3)
    : 'İsteğe bağlı · dokunarak seç';
  const projeOzeti = t.projeler.length
    ? `${t.projeler.length} proje · ${listeOzeti(t.projeler.map((p) => p.baslik).filter(Boolean), 1)}`
    : 'İsteğe bağlı';
  const sertifikaOzeti = t.sertifikalar.length
    ? `${t.sertifikalar.length} sertifika · ${listeOzeti(t.sertifikalar.map((c) => c.ad).filter(Boolean), 1)}`
    : 'Aldığın eğitim ve sertifikalar';
  const tercihOzeti =
    t.tercih.hedefler.length || t.tercih.sehirler.length
      ? [listeOzeti(t.tercih.hedefler, 2), t.tercih.sehirler.join(', ')].filter(Boolean).join(' · ')
      : 'Hedef pozisyon ve şehir — eşleşmeler buna göre';

  /* Fotoğraf kartına "Profili görüntüle" (çıkış) ekleniyor; kart App'te kuruluyor. */
  const profiliGoruntule = (
    <button
      type="button"
      onClick={geriDon}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:underline ${ODAK_HALKASI}`}
    >
      Profili görüntüle
      <ChevronRight aria-hidden className="h-4 w-4" />
    </button>
  );
  const ustKart = React.isValidElement(fotografKarti) ? (
    React.cloneElement(fotografKarti as React.ReactElement<{ fotografKartiEk?: React.ReactNode }>, {
      fotografKartiEk: profiliGoruntule,
    })
  ) : (
    <section aria-label="Profil fotoğrafın" className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4">
      <ProfilFotografi ad={student.fullName} yol={null} yedekAdres={student.avatarUrl || null} className="h-20 w-20 shrink-0 rounded-full" />
      <div className="min-w-0">
        <p className="break-words text-lg font-bold text-gray-900">{student.fullName}</p>
        {profiliGoruntule}
      </div>
    </section>
  );

  /* ============================== PANEL =============================== */
  const panelBolumu: AltBolum = secili ?? 'kisisel';
  const panelIcerigi = (id: AltBolum) => {
    switch (id) {
      case 'kisisel':
        return <KisiselBilgiler {...bolumProps} eposta={student.email ?? ''} />;
      case 'baglanti':
        return <Baglantilar {...bolumProps} />;
      case 'deneyim':
        return <DeneyimListesi {...bolumProps} />;
      case 'egitim':
        return <EgitimListesi {...bolumProps} />;
      case 'dil':
        return <DilListesi {...bolumProps} />;
      case 'cv-gorunurluk':
        return (
          <CvGorunurluk
            student={{ ...student, cvGizli: t.cvGizli as CvGizliAlan[] }}
            onDegis={(gizli) => degistir((o) => ({ ...o, cvGizli: gizli }))}
            fotografVar={fotografVar}
          />
        );
    }
  };

  const kayitMetni =
    durum === 'kaydediliyor'
      ? 'Kaydediliyor…'
      : durum === 'hata'
        ? 'Kaydedilemedi. Yazdıkların duruyor; yeniden dene.'
        : hatalar.length > 0
          ? `Kaydetmeden önce ${hatalar.length === 1 ? 'işaretli alanı' : `${hatalar.length} alanı`} düzelt.`
          : durum === 'kaydedildi'
            ? 'Tüm değişiklikler kaydedildi.'
            : kirli
              ? `${degisen.size} bölümde kaydedilmemiş değişiklik var.`
              : null;

  /* ============================== ÇİZİM =============================== */
  return (
    <div className="mx-auto w-full max-w-6xl pb-[calc(env(safe-area-inset-bottom)+8rem)]">
      <h1 className="sr-only">Profilini düzenle</h1>
      <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* ------------------------------ LİSTE ------------------------------ */}
        <div className={`min-w-0 space-y-3 ${secili ? 'hidden lg:block' : ''}`}>
          {ustKart}

          {/* TAMAMLANMA — yalnız temel bilgiler; isteğe bağlı alanlar yüzdeyi etkilemiyor. */}
          {doluluk.tamam ? (
            <section aria-label="Profil durumu" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-base font-bold text-emerald-900">
                Profilin tamamlandı
                <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-700" />
              </p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-950">
                Artık profilini kullanarak başvurularını yapabilirsin. İstersen yetenek, deneyim ve projelerini ekleyerek
                profilini zenginleştirebilirsin.
              </p>
            </section>
          ) : (
            <section aria-label="Profil durumu" className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-900">Profilin %{doluluk.oran} tamamlandı</p>
                <p className="text-xs font-semibold text-gray-600">{eksikler.length} adım kaldı</p>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={doluluk.oran}
                aria-label="Profil tamamlanma oranı"
              >
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${doluluk.oran}%` }} />
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {eksikler.map((a) => (
                  <li key={a.anahtar}>
                    <button
                      type="button"
                      onClick={() => (a.bolum === 'foto' ? onFotografEkle?.() : yereGit(a.bolum, a.alan))}
                      className={`inline-flex min-h-9 cursor-pointer items-center rounded-full border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-800 hover:bg-blue-100 ${ODAK_HALKASI}`}
                    >
                      {a.etiket}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* --------------------------- TEMEL BİLGİLER --------------------------- */}
          <Kart
            id="temel"
            ikon={<UserRound />}
            baslik="Temel bilgiler"
            ozet="Kişisel, iletişim ve kariyer bilgileri"
            acik={acikKartlar.has('temel')}
            onToggle={kartToggle}
          >
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200">
              {(['kisisel', 'baglanti', 'deneyim', 'egitim', 'dil'] as AltBolum[]).map((id) => (
                <AltSatir key={id} id={id} ozet={ozetler[id]} secili={panelBolumu === id} onAc={bolumAc} isaret={isaret(id)} />
              ))}
            </ul>
          </Kart>

          {/* ---------------------- YETENEKLER VE İLGİ ALANLARI --------------------- */}
          <Kart
            id="yetenek"
            ikon={<ChartNoAxesColumnIncreasing />}
            baslik="Yetenekler ve ilgi alanları"
            ozet={yetenekOzeti}
            acik={acikKartlar.has('yetenek')}
            onToggle={kartToggle}
            isaret={isaret('yetenek')}
          >
            <YetenekVeIlgi {...bolumProps} />
          </Kart>

          {/* ------------------------------ PROJELER ------------------------------- */}
          <Kart
            id="proje"
            ikon={<Link2 />}
            baslik="Projeler"
            ozet={projeOzeti}
            acik={acikKartlar.has('proje')}
            onToggle={kartToggle}
            isaret={isaret('proje')}
          >
            <ProjeListesi {...bolumProps} />
          </Kart>

          {/* ---------------------------- SERTİFİKALAR ----------------------------- */}
          <Kart
            id="sertifika"
            ikon={<Award />}
            baslik="Sertifikalar"
            ozet={sertifikaOzeti}
            acik={acikKartlar.has('sertifika')}
            onToggle={kartToggle}
            isaret={isaret('sertifika')}
          >
            <SertifikaListesi {...bolumProps} />
          </Kart>

          {/* --------------------------------- CV ---------------------------------- */}
          <Kart
            id="cv"
            ikon={<FileText />}
            baslik="CV"
            ozet="Profilinden oluştur ve görünürlüğü yönet"
            acik={acikKartlar.has('cv')}
            onToggle={kartToggle}
          >
            {/*
              İKİ AYRI SEÇENEK: öğrencinin kendi yüklediği PDF ve StajımVar'ın
              profilden oluşturduğu CV. Yüklenen PDF'e dokunulmuyor; yükleme
              taslaktan bağımsız, dosya seçilince hemen yazılıyor.
            */}
            <p className="text-sm text-gray-600">
              {student.cvPath ? 'Yüklediğin PDF başvurularına eklenir.' : 'Hazır PDF’ini yükle ya da profilinden CV oluştur.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('cv-dosya-girdisi')?.click()}
                className={`${IKINCIL} border-blue-200 px-3 text-blue-700`}
              >
                <Upload aria-hidden className="h-4 w-4 shrink-0" />
                {student.cvPath ? 'Yeni PDF yükle' : 'PDF yükle'}
              </button>
              {onCvOlustur && (
                <button
                  type="button"
                  onClick={() => (kirli ? setCvSorusu(true) : onCvOlustur())}
                  className={`${IKINCIL} border-blue-200 px-3 text-blue-700`}
                >
                  <FileText aria-hidden className="h-4 w-4 shrink-0" />
                  Profilimden CV oluştur
                </button>
              )}
            </div>
            {cvSorusu && kirli && onCvOlustur && (
              <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="min-w-0 basis-full text-sm font-semibold text-amber-950">
                  Kaydedilmemiş değişikliklerin var. CV kayıtlı bilgilerden oluşur.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (await kaydetHepsi()) {
                      setCvSorusu(false);
                      onCvOlustur();
                    }
                  }}
                  disabled={durum === 'kaydediliyor'}
                  className={BIRINCIL}
                >
                  Kaydet ve CV’yi aç
                </button>
                <button type="button" onClick={() => setCvSorusu(false)} className={IKINCIL}>
                  Vazgeç
                </button>
              </div>
            )}
            <div className="empty:hidden">
              <CvAlani
                kompakt
                girdiId="cv-dosya-girdisi"
                userId={student.id}
                cvPath={student.cvPath}
                onDegisti={async (yeniYol) => {
                  if (!(await tekKayit({ cvPath: yeniYol ?? '' }))) throw new Error('CV kaydedilemedi.');
                }}
              />
            </div>
            <ul className="overflow-hidden rounded-2xl border border-gray-200">
              <AltSatir
                id="cv-gorunurluk"
                ozet={ozetler['cv-gorunurluk']}
                secili={secili === 'cv-gorunurluk'}
                onAc={bolumAc}
                isaret={isaret('cv-gorunurluk')}
              />
            </ul>
          </Kart>

          {/* ---------------------------- DİĞER AYARLAR ---------------------------- */}
          <h2 className="px-1 pt-4 text-sm font-bold uppercase tracking-wide text-gray-600">Diğer ayarlar</h2>

          <Kart
            id="tercih"
            ikon={<Target />}
            baslik="Ne arıyorsun?"
            ozet={tercihOzeti}
            acik={acikKartlar.has('tercih')}
            onToggle={kartToggle}
            isaret={isaret('tercih')}
          >
            <TercihAyarlari t={t} degistir={degistir} />
          </Kart>

          {quizzes.length > 0 && (
            <Kart
              id="rozet"
              ikon={<Award />}
              baslik="Testler"
              ozet={
                student.earnedBadges?.length
                  ? `${student.earnedBadges.length} rozet kazandın`
                  : 'İstersen kısa testlerle yeteneğini doğrula'
              }
              acik={acikKartlar.has('rozet')}
              onToggle={kartToggle}
            >
              {(student.earnedBadges ?? []).length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {(student.earnedBadges ?? []).map((b) => (
                    <li
                      key={b}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-900"
                    >
                      <CheckCircle2 aria-hidden className="h-4 w-4" />
                      {/* Rozet adı şirket ekranıyla aynı biçimde (aday-profil-farki.mjs `rozetEtiketi`). */}
                      {b.replace(/^(badge|quiz)-/, '')}
                    </li>
                  ))}
                </ul>
              )}
              <ul className="divide-y divide-gray-100">
                {quizzes.map((quiz) => {
                  const kazanildi = (student.earnedBadges ?? []).includes(quiz.badgeName);
                  return (
                    <li key={quiz.id}>
                      <button
                        type="button"
                        onClick={() => onStartQuiz?.(quiz)}
                        className={`-mx-2 flex w-full min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-blue-50/60 ${ODAK_HALKASI}`}
                      >
                        {kazanildi ? (
                          <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-600" />
                        ) : (
                          <Award aria-hidden className="h-5 w-5 shrink-0 text-blue-600" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900">{quiz.skillName}</span>
                          <span className="block text-xs text-gray-600">
                            {kazanildi ? 'Rozet kazanıldı · tekrar çözebilirsin' : `${quiz.questions.length} soru · ~5 dk`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Kart>
          )}

          {sosyalProfilDuzenleme && (
            <Kart
              id="sosyal"
              ikon={<AtSign />}
              baslik="Sosyal profil"
              ozet="Kullanıcı adı, görünen ad, biyografi ve kapak"
              acik={acikKartlar.has('sosyal')}
              onToggle={kartToggle}
              isaret={sosyalKirli ? 'degisti' : null}
            >
              {sosyalUyari && sosyalKirli && (
                <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="min-w-0 basis-full text-sm font-semibold text-amber-950 sm:basis-auto sm:flex-1">
                    Bu bölümde kaydedilmemiş değişiklik var.
                  </p>
                  <button type="button" onClick={() => kaydedilmemisKaydet('sosyal:')} className={BIRINCIL}>
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      kaydedilmemisTemizle('sosyal:');
                      setSosyalUyari(false);
                      setAcikKartlar((o) => {
                        const y = new Set(o);
                        y.delete('sosyal');
                        return y;
                      });
                    }}
                    className={IKINCIL}
                  >
                    Değişiklikleri at
                  </button>
                </div>
              )}
              {sosyalProfilDuzenleme}
            </Kart>
          )}
        </div>

        {/* ------------------------------ PANEL ------------------------------ */}
        <section
          aria-labelledby="duzenle-panel-baslik"
          id={`duzenle-${panelBolumu}`}
          className={`min-w-0 scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 ${secili ? '' : 'hidden lg:block'}`}
        >
          <button
            type="button"
            onClick={listeyeDon}
            className={`-ml-1 mb-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-blue-700 hover:underline lg:hidden ${ODAK_HALKASI}`}
          >
            <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
            Profilini düzenle
          </button>
          <div className="mb-4 flex items-start gap-3">
            <span aria-hidden className={`${IKON_KUTUSU} h-11 w-11`}>
              {BOLUM_BILGISI[panelBolumu].ikon}
            </span>
            <div className="min-w-0">
              <h2 id="duzenle-panel-baslik" className="text-lg font-bold text-gray-900">
                {BOLUM_BILGISI[panelBolumu].baslik}
              </h2>
              <p className="text-sm text-gray-600">{BOLUM_BILGISI[panelBolumu].aciklama}</p>
            </div>
          </div>
          {panelIcerigi(panelBolumu)}
          <button type="button" onClick={listeyeDon} className={`${IKINCIL} mt-6 w-full lg:hidden`}>
            Bitti
          </button>
        </section>
      </div>

      {/*
        TOPLU KAYDET ÇUBUĞU — telefonda başparmağın altında, sabit.
        Alt menü bu ekranda gizli (index.css); çubuk güvenli alanı da
        sayıyor ve sayfanın alt boşluğu çubuktan yüksek: son alan
        çubuğun üstüne kaydırılabiliyor.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:px-6 lg:flex-row lg:items-center lg:justify-end lg:gap-4">
          {kayitMetni && (
            <p
              role={durum === 'hata' || hatalar.length ? 'alert' : 'status'}
              className={`text-center text-sm font-semibold lg:text-right ${
                durum === 'hata' || hatalar.length
                  ? 'text-rose-700'
                  : durum === 'kaydedildi'
                    ? 'text-emerald-700'
                    : 'text-gray-700'
              }`}
            >
              {kayitMetni}
              {hatalar.length > 0 && (
                <button
                  type="button"
                  onClick={() => yereGit(hatalar[0].bolum, hatalar[0].alan)}
                  className={`ml-2 cursor-pointer font-bold underline ${ODAK_HALKASI}`}
                >
                  Göster
                </button>
              )}
            </p>
          )}
          <button
            type="button"
            onClick={() => void kaydetHepsi()}
            disabled={!kirli || durum === 'kaydediliyor'}
            aria-busy={durum === 'kaydediliyor' || undefined}
            className={`${BIRINCIL} min-h-12 w-full text-base lg:w-auto lg:px-8`}
          >
            {durum === 'kaydediliyor' ? (
              <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
            ) : (
              <Save aria-hidden className="h-5 w-5" />
            )}
            Tüm değişiklikleri kaydet
          </button>
        </div>
      </div>
    </div>
  );
};
