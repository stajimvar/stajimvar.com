import React from 'react';
import { ArrowLeft, Camera, Check, Eye, ImagePlus, Maximize2, Plus, X } from 'lucide-react';
import type { StudentProfile, StudentSkill } from '../types';
import { TR_DEPARTMENTS, TR_UNIVERSITIES } from '../data/turkeyData';
import { HARD_SKILLS_DICTIONARY } from '../data/skillsDictionary';
import { ONERILEN_SOSYAL, POPULER_ARACLAR } from '../data/cv-secenekleri';
import { platformCvHazirMi } from '../lib/cv-hazirlik.mjs';
import { useModalErisim } from '../lib/modal-erisim';
import { ODAK_HALKASI } from '../lib/renk-token';
import { profilFotografiYukle, SosyalHata } from '../lib/queries/sosyal';
import { AutocompleteField } from './AutocompleteField';
import { CvAlani } from './CvAlani';
import { CvOnizleme } from './CvPage';
import { ProfilFotografi } from './sosyal/ProfilFotografi';
import { IZIN_VERILEN_TURLER, kareyeCevir, type HazirKare, type Kirpma } from './sosyal/ProfilFotografiYukleme';

/*
  CV OLUŞTURUCU — kayıt sonrası karşılama ve kısa CV akışı (17 Eylül 2026)

  Beş hâl, tek katman (yeni adres yok):
    karsilama  örnek CV + "CV'mi oluştur / İlanları keşfet / Hazır CV'mi yükle"
    form       okul, bölüm, programlar, beceriler, isteğe bağlı tanıtım;
               yanında (telefonda küçük) canlı önizleme
    fotograf   isteğe bağlı; galeri ya da kamera, konumlandırma ve yakınlık
    yukle      mevcut PDF yükleme bileşeni (`CvAlani`)
    bitti      YALNIZ kayıt başarılı olunca: gerçek CV önizlemesi

  Kayıt mevcut altyapıdan (`onKaydet` → saveStudentProfile). Başarısızlıkta
  taslak yerinde kalıyor; "kaydedildi" ancak sunucu kabul edince yazılıyor.

  PDF: sitede gerçek dosya indirme YOK, CV tarayıcının yazdırma
  penceresinden "PDF olarak kaydet" ile alınıyor. Düğme bu yüzden "PDF
  indir" demiyor.
*/

export type CvAkisiAdimi = 'karsilama' | 'form' | 'fotograf' | 'yukle' | 'bitti';

interface Props {
  student: StudentProfile;
  kullaniciId: string;
  /** Sosyal profil fotoğrafının yolu; CV ve profil aynı fotoğrafı kullanıyor. */
  fotografYolu: string | null;
  baslangic: 'karsilama' | 'form';
  /** Kullanıcı bir ilandan geldiyse "İlana dön" yazılıyor. */
  ilanaDonus?: boolean;
  /** Sunucu kabul ederse `true`; hata gösterimi çağıranın toast'ında da var. */
  onKaydet: (patch: Partial<StudentProfile>) => Promise<boolean>;
  onFotografKaydedildi: (yol: string) => void;
  /** 'ilanlar': ilanlara/ilana geç; 'kapat': olduğun yerde kal. */
  onKapat: (sebep: 'ilanlar' | 'kapat') => void;
  onPdf: () => void;
  onProfil: () => void;
}

/** Karşılamadaki örnek. GERÇEK BİR KİŞİ DEĞİL ve hiçbir yere kaydedilmiyor. */
const ORNEK_OGRENCI: StudentProfile = {
  id: 'ornek',
  fullName: 'Deniz Yılmaz',
  email: 'deniz@ornek.com',
  phone: '',
  university: 'Örnek Üniversitesi',
  faculty: '',
  department: 'Endüstriyel Tasarım',
  gradeLevel: '3. Sınıf',
  graduationYear: 0,
  gpa: 0,
  avatarUrl: '',
  bio: 'Kullanıcı deneyimi ve ürün tasarımıyla ilgileniyorum. Ders projelerimde fikirden prototipe kadar her aşamada çalıştım.',
  city: 'İzmir',
  skills: [
    { name: 'Figma', level: 'Advanced', category: 'General' },
    { name: 'Photoshop', level: 'Intermediate', category: 'General' },
    { name: 'SolidWorks', level: 'Intermediate', category: 'General' },
  ] as StudentSkill[],
  softSkills: ['Ekip Çalışması', 'Sunum Becerisi', 'Problem Çözme'],
  languages: [{ id: 'o1', language: 'İngilizce', level: 'B2', proficiencyText: 'B2' }],
  targetRoles: ['Ürün Tasarımı Stajyeri'],
  preferences: { cities: [] } as unknown as StudentProfile['preferences'],
  projects: [
    {
      id: 'op',
      title: 'Kampüs ulaşım uygulaması',
      description: 'Ders projesi: öğrencilerin servis saatlerini tek ekranda gördüğü mobil arayüz tasarımı.',
      techStack: ['Figma'],
    },
  ],
  earnedBadges: [],
} as StudentProfile;

const BIRINCIL =
  `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-base font-bold text-white hover:bg-blue-700 disabled:cursor-default disabled:opacity-50 ${ODAK_HALKASI}`;
const IKINCIL =
  `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-base font-bold text-gray-900 hover:bg-gray-50 ${ODAK_HALKASI}`;
const SADE =
  `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${ODAK_HALKASI}`;
const ETIKET = 'block text-sm font-bold text-gray-900';
const ALAN =
  'mt-1.5 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base text-gray-900 outline-none focus:border-blue-600 sm:text-sm';

interface Taslak {
  university: string;
  department: string;
  skills: StudentSkill[];
  softSkills: string[];
  bio: string;
}

const taslakYap = (s: StudentProfile): Taslak => ({
  university: s.university ?? '',
  department: s.department ?? '',
  skills: s.skills ?? [],
  softSkills: s.softSkills ?? [],
  bio: s.bio ?? '',
});

const ayniMi = (a: Taslak, b: Taslak) =>
  a.university.trim() === b.university.trim() &&
  a.department.trim() === b.department.trim() &&
  a.bio.trim() === b.bio.trim() &&
  a.softSkills.join('|') === b.softSkills.join('|') &&
  a.skills.map((s) => s.name).join('|') === b.skills.map((s) => s.name).join('|');

const esit = (a: string, b: string) => a.toLocaleLowerCase('tr') === b.toLocaleLowerCase('tr');

export const CvOlusturucu: React.FC<Props> = ({
  student,
  kullaniciId,
  fotografYolu,
  baslangic,
  ilanaDonus = false,
  onKaydet,
  onFotografKaydedildi,
  onKapat,
  onPdf,
  onProfil,
}) => {
  const [adim, setAdim] = React.useState<CvAkisiAdimi>(baslangic);
  const [taslak, setTaslak] = React.useState<Taslak>(() => taslakYap(student));
  const [kayitDurumu, setKayitDurumu] = React.useState<'bos' | 'gonderiliyor' | 'hata'>('bos');
  const [eksikNotu, setEksikNotu] = React.useState(false);
  const [buyukOnizleme, setBuyukOnizleme] = React.useState(false);
  const [yeniProgram, setYeniProgram] = React.useState('');
  /* Fotoğraf adımındaki kırpılmış karenin önizleme adresi (kaydedilmemiş). */
  const [taslakFoto, setTaslakFoto] = React.useState<string | null>(null);

  const kapat = React.useCallback(() => {
    if (buyukOnizleme) setBuyukOnizleme(false);
    else onKapat('kapat');
  }, [buyukOnizleme, onKapat]);
  const kutuRef = useModalErisim<HTMLDivElement>(true, kapat);

  /* Adım değişince sayfa başına dön; odak bir sonraki başlığa. */
  const baslikRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    kutuRef.current?.scrollTo({ top: 0 });
    baslikRef.current?.focus();
  }, [adim, kutuRef]);

  const kayitli = taslakYap(student);
  const degisti = !ayniMi(taslak, kayitli);

  /* Önizlemedeki öğrenci: kayıtlı profil + henüz kaydedilmemiş taslak. */
  const onizlemeOgrencisi: StudentProfile = {
    ...student,
    university: taslak.university.trim(),
    department: taslak.department.trim(),
    skills: taslak.skills,
    softSkills: taslak.softSkills,
    bio: taslak.bio.trim(),
    ...(taslakFoto ? { avatarUrl: taslakFoto } : {}),
  };
  const onizlemeYolu = taslakFoto ? null : fotografYolu;

  const programVar = (ad: string) => taslak.skills.some((s) => esit(s.name, ad));
  const programDegistir = (ad: string) => {
    const temiz = ad.trim();
    if (!temiz) return;
    setTaslak((t) =>
      t.skills.some((s) => esit(s.name, temiz))
        ? { ...t, skills: t.skills.filter((s) => !esit(s.name, temiz)) }
        : { ...t, skills: [...t.skills, { name: temiz, category: 'General', level: 'Intermediate', verified: false } as StudentSkill] },
    );
  };
  const programEkle = () => {
    const ad = yeniProgram.trim();
    if (!ad) return;
    if (!programVar(ad)) programDegistir(ad);
    setYeniProgram('');
  };
  const beceriDegistir = (ad: string) =>
    setTaslak((t) => ({
      ...t,
      softSkills: t.softSkills.includes(ad) ? t.softSkills.filter((s) => s !== ad) : [...t.softSkills, ad],
    }));

  const kaydet = async (olay: React.FormEvent) => {
    olay.preventDefault();
    if (kayitDurumu === 'gonderiliyor') return;
    const aday = { ...student, ...taslak, university: taslak.university.trim(), department: taslak.department.trim() };
    if (!platformCvHazirMi(aday)) {
      setEksikNotu(true);
      const ilkEksik = !aday.university ? 'cv-universite' : !aday.department ? 'cv-bolum' : 'cv-programlar';
      document.getElementById(ilkEksik)?.focus();
      return;
    }
    setEksikNotu(false);
    setKayitDurumu('gonderiliyor');
    const tamam = await onKaydet({
      university: aday.university,
      department: aday.department,
      skills: taslak.skills,
      softSkills: taslak.softSkills,
      bio: taslak.bio.trim(),
    });
    if (tamam) {
      setKayitDurumu('bos');
      setAdim('bitti');
    } else {
      /* Taslak yerinde: kullanıcının yazdığı hiçbir şey kaybolmuyor. */
      setKayitDurumu('hata');
    }
  };

  const donusEtiketi = ilanaDonus ? 'İlana dön' : 'İlanlara geç';

  /* ---------------------------------------------------------------- */

  const ustSatir = (geri?: () => void) => (
    <div className="flex items-center justify-between gap-2">
      {geri ? (
        <button type="button" onClick={geri} className={SADE}>
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Geri
        </button>
      ) : (
        <span className="text-lg font-extrabold tracking-tight text-gray-900">
          Stajım<span className="text-blue-600">Var</span>
        </span>
      )}
      <button type="button" onClick={() => onKapat('kapat')} className={SADE} aria-label="Kapat">
        <X aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );

  let govde: React.ReactNode;

  if (adim === 'karsilama') {
    govde = (
      <>
        {ustSatir()}
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
          <div className="max-w-xl">
            <h1
              ref={baslikRef}
              tabIndex={-1}
              className="text-[32px] font-extrabold leading-[1.1] tracking-tight text-gray-900 outline-none sm:text-5xl"
            >
              İlk fırsatın için, seni anlatan bir CV.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              Okulunu, becerilerini ve projelerini ekle; başvurularında kullanabileceğin CV’ni oluştur.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setAdim('form')} className={BIRINCIL}>
                CV’mi oluştur
              </button>
              <button type="button" onClick={() => onKapat('ilanlar')} className={IKINCIL}>
                İlanları keşfet
              </button>
            </div>
            <button type="button" onClick={() => setAdim('yukle')} className={`mt-3 ${SADE}`}>
              Hazır CV’mi yükle
            </button>
          </div>

          <figure className="mx-auto w-full min-w-0 max-w-[440px]">
            <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
              <CvOnizleme student={ORNEK_OGRENCI} etiket="Örnek CV" etkilesimsiz />
            </div>
            <figcaption className="mt-2 text-center text-xs text-gray-500">
              Örnek CV · kişi ve bilgiler gerçek değil
            </figcaption>
          </figure>
        </div>
      </>
    );
  } else if (adim === 'form') {
    const onizlemeKarti = (
      <div>
        <p className="mb-2 flex min-h-7 items-center text-sm text-gray-600">
          {degisti ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">Henüz kaydedilmedi</span>
          ) : (
            'Önizleme'
          )}
        </p>
        <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          <CvOnizleme student={onizlemeOgrencisi} fotografYolu={onizlemeYolu} etiket="CV önizlemesi" etkilesimsiz />
        </div>
      </div>
    );

    govde = (
      <>
        {ustSatir(baslangic === 'karsilama' ? () => setAdim('karsilama') : undefined)}
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-8 lg:mt-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-12">
          <form onSubmit={kaydet} noValidate className="min-w-0 space-y-6">
            <div>
              <h1 ref={baslikRef} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-gray-900 outline-none">
                CV’ni oluştur
              </h1>
              <p className="mt-2 text-base leading-relaxed text-gray-600">
                Ders projen, kulüp çalışman veya kullandığın araçlar da CV’nde yer bulabilir.
              </p>
            </div>

            {/* Telefonda küçük önizleme: formu kesmiyor, dokununca büyüyor. */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-3 lg:hidden">
              <div className="w-20 shrink-0 overflow-hidden rounded-md border border-gray-200">
                <CvOnizleme student={onizlemeOgrencisi} fotografYolu={onizlemeYolu} etiket="CV önizlemesi" etkilesimsiz />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">CV önizlemen</p>
                <p className="text-xs text-gray-600">{degisti ? 'Henüz kaydedilmedi' : 'Kayıtlı bilgilerinle'}</p>
              </div>
              <button type="button" onClick={() => setBuyukOnizleme(true)} className={SADE}>
                <Maximize2 aria-hidden className="h-4 w-4" />
                Büyüt
              </button>
            </div>

            <div>
              <label className={ETIKET} htmlFor="cv-universite">Üniversite</label>
              <AutocompleteField
                id="cv-universite"
                value={taslak.university}
                onChange={(v) => setTaslak((t) => ({ ...t, university: v }))}
                options={TR_UNIVERSITIES}
                placeholder="Yazmaya başla, listeden seç"
                className={ALAN}
              />
            </div>

            <div>
              <label className={ETIKET} htmlFor="cv-bolum">Bölüm</label>
              <AutocompleteField
                id="cv-bolum"
                value={taslak.department}
                onChange={(v) => setTaslak((t) => ({ ...t, department: v }))}
                options={TR_DEPARTMENTS}
                placeholder="Ön lisans ve lisans programları"
                className={ALAN}
              />
            </div>

            <fieldset>
              <legend className={ETIKET}>Kullandığın programlar ve araçlar</legend>
              <div id="cv-programlar" tabIndex={-1} className="mt-2 flex flex-wrap gap-2 outline-none">
                {[...POPULER_ARACLAR, ...taslak.skills.map((s) => s.name).filter((ad) => !POPULER_ARACLAR.some((p) => esit(p, ad)))].map(
                  (ad) => {
                    const secili = programVar(ad);
                    return (
                      <button
                        key={ad}
                        type="button"
                        aria-pressed={secili}
                        onClick={() => programDegistir(ad)}
                        className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold ${ODAK_HALKASI} ${
                          secili
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {secili ? <Check aria-hidden className="h-4 w-4" /> : <Plus aria-hidden className="h-4 w-4" />}
                        {ad}
                      </button>
                    );
                  },
                )}
              </div>
              <div
                className="mt-3 flex items-end gap-2"
                onKeyDown={(olay) => {
                  /* Enter formu göndermesin; yazılan programı eklesin. Öneri seçimi alanın kendi işi. */
                  if (olay.key !== 'Enter' || olay.defaultPrevented) return;
                  olay.preventDefault();
                  programEkle();
                }}
              >
                <div className="min-w-0 flex-1">
                  <label htmlFor="cv-program-ekle" className="sr-only">
                    Listede olmayan bir program
                  </label>
                  <AutocompleteField
                    id="cv-program-ekle"
                    value={yeniProgram}
                    onChange={setYeniProgram}
                    options={HARD_SKILLS_DICTIONARY}
                    placeholder="Listede olmayan bir program yaz"
                    className={ALAN}
                  />
                </div>
                <button
                  type="button"
                  onClick={programEkle}
                  disabled={!yeniProgram.trim()}
                  className={`min-h-11 shrink-0 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 ${ODAK_HALKASI}`}
                >
                  Ekle
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend className={ETIKET}>Becerilerin</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {ONERILEN_SOSYAL.map((ad) => {
                  const secili = taslak.softSkills.includes(ad);
                  return (
                    <button
                      key={ad}
                      type="button"
                      aria-pressed={secili}
                      onClick={() => beceriDegistir(ad)}
                      className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold ${ODAK_HALKASI} ${
                        secili ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {secili ? <Check aria-hidden className="h-4 w-4" /> : <Plus aria-hidden className="h-4 w-4" />}
                      {ad}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label className={ETIKET} htmlFor="cv-tanitim">
                Kısa tanıtım <span className="font-normal text-gray-500">(isteğe bağlı)</span>
              </label>
              <textarea
                id="cv-tanitim"
                value={taslak.bio}
                onChange={(e) => setTaslak((t) => ({ ...t, bio: e.target.value }))}
                rows={3}
                maxLength={500}
                placeholder="Neyle ilgilendiğini ve nasıl bir staj aradığını iki cümleyle anlat."
                className={`${ALAN} min-h-24 py-2.5`}
              />
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4">
              <ProfilFotografi
                ad={student.fullName}
                yol={onizlemeYolu}
                yedekAdres={taslakFoto ?? (student.avatarUrl || null)}
                className="h-14 w-14 shrink-0 rounded-full text-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">
                  Fotoğraf <span className="font-normal text-gray-500">(isteğe bağlı)</span>
                </p>
                <p className="text-xs leading-relaxed text-gray-600">Fotoğrafsız CV de tamamlanmış görünür.</p>
              </div>
              <button type="button" onClick={() => setAdim('fotograf')} className={SADE}>
                <ImagePlus aria-hidden className="h-4 w-4" />
                {fotografYolu || student.avatarUrl ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
              </button>
            </div>

            {eksikNotu && (
              <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
                CV’ni oluşturmak için okulun, bölümün ve en az bir program ya da beceri yeterli.
              </p>
            )}
            {kayitDurumu === 'hata' && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-800">
                Bilgilerin kaydedilemedi. Yazdıkların yerinde duruyor; bağlantını kontrol edip yeniden deneyebilirsin.
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={kayitDurumu === 'gonderiliyor'} className={BIRINCIL}>
                {kayitDurumu === 'gonderiliyor' ? 'Kaydediliyor…' : 'Kaydet ve CV’mi gör'}
              </button>
              <button type="button" onClick={() => onKapat('ilanlar')} className={SADE}>
                Sonra tamamla
              </button>
            </div>
            <p className="text-xs leading-relaxed text-gray-500">
              Proje, dil ve iletişim bilgilerini daha sonra profilinden ekleyebilirsin.
            </p>
          </form>

          <aside className="hidden min-w-0 lg:block" aria-label="Canlı CV önizlemesi">
            <div className="sticky top-6">{onizlemeKarti}</div>
          </aside>
        </div>

        {buyukOnizleme && (
          <div className="fixed inset-0 z-10 overflow-y-auto bg-gray-900/70 p-3" onClick={() => setBuyukOnizleme(false)}>
            <div className="mx-auto max-w-[794px]" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setBuyukOnizleme(false)}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-gray-900"
                >
                  <X aria-hidden className="h-4 w-4" />
                  Kapat
                </button>
              </div>
              {onizlemeKarti}
            </div>
          </div>
        )}
      </>
    );
  } else if (adim === 'fotograf') {
    govde = (
      <>
        {ustSatir(() => setAdim('form'))}
        <FotografAdimi
          baslikRef={baslikRef}
          kullaniciId={kullaniciId}
          ad={student.fullName}
          onizlemeOgrencisi={onizlemeOgrencisi}
          onTaslak={setTaslakFoto}
          onVazgec={() => {
            setTaslakFoto(null);
            setAdim('form');
          }}
          onKaydedildi={(yol) => {
            setTaslakFoto(null);
            onFotografKaydedildi(yol);
            setAdim('form');
          }}
        />
      </>
    );
  } else if (adim === 'yukle') {
    govde = (
      <>
        {ustSatir(() => setAdim(baslangic))}
        <div className="mx-auto mt-6 max-w-xl space-y-5">
          <div>
            <h1 ref={baslikRef} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-gray-900 outline-none">
              Hazır CV’ni yükle
            </h1>
            <p className="mt-2 text-base leading-relaxed text-gray-600">
              Elinde bir CV varsa PDF olarak ekleyebilirsin. İstediğin zaman burada CV de oluşturabilirsin.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <CvAlani
              userId={kullaniciId}
              cvPath={student.cvPath}
              onDegisti={async (yeniYol) => {
                const tamam = await onKaydet({ cvPath: yeniYol ?? '' });
                /* CvAlani başarısızlıkta yüklenen dosyayı geri alıyor. */
                if (!tamam) throw new Error('CV kaydedilemedi.');
              }}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => onKapat('ilanlar')} className={student.cvPath ? BIRINCIL : IKINCIL}>
              {donusEtiketi}
            </button>
            <button type="button" onClick={() => setAdim('form')} className={SADE}>
              Onun yerine CV oluştur
            </button>
          </div>
        </div>
      </>
    );
  } else {
    govde = (
      <>
        {ustSatir()}
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:mt-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
              <Check aria-hidden className="h-4 w-4" />
              Kaydedildi
            </p>
            <h1 ref={baslikRef} tabIndex={-1} className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 outline-none sm:text-4xl">
              CV’n hazır.
            </h1>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Başvurularında kullanabilirsin. PDF, tarayıcının yazdırma penceresinde “PDF olarak kaydet” seçilerek alınır.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" onClick={onPdf} className={BIRINCIL}>
                <Eye aria-hidden className="h-5 w-5" />
                PDF olarak kaydet
              </button>
              <button type="button" onClick={() => setAdim('form')} className={IKINCIL}>
                Düzenlemeye devam et
              </button>
              <button type="button" onClick={() => onKapat('ilanlar')} className={IKINCIL}>
                {donusEtiketi}
              </button>
              <button type="button" onClick={onProfil} className={SADE}>
                Proje ve dil eklemek için profilini aç
              </button>
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <CvOnizleme student={student} fotografYolu={fotografYolu} etiket="CV’n" etkilesimsiz />
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      ref={kutuRef}
      role="dialog"
      aria-modal="true"
      aria-label="CV oluştur"
      className="fixed inset-0 z-[150] overflow-y-auto overscroll-contain bg-gray-50"
    >
      <div
        className="mx-auto max-w-6xl px-4 pb-12 sm:px-6"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
      >
        {govde}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Fotoğraf: seç, konumla, yakınlaştır, kaydet                         */
/* ------------------------------------------------------------------ */

const CERCEVE = 240;

const FotografAdimi: React.FC<{
  baslikRef: React.RefObject<HTMLHeadingElement>;
  kullaniciId: string;
  ad: string;
  onizlemeOgrencisi: StudentProfile;
  onTaslak: (adres: string | null) => void;
  onVazgec: () => void;
  onKaydedildi: (yol: string) => void;
}> = ({ baslikRef, kullaniciId, ad, onizlemeOgrencisi, onTaslak, onVazgec, onKaydedildi }) => {
  const [dosya, setDosya] = React.useState<File | null>(null);
  const [kaynak, setKaynak] = React.useState<{ adres: string; en: number; boy: number } | null>(null);
  const [kirpma, setKirpma] = React.useState<Kirpma>({ x: 0.5, y: 0.5, yakinlik: 1 });
  const [uyari, setUyari] = React.useState<string | null>(null);
  const [durum, setDurum] = React.useState<'bos' | 'gonderiliyor'>('bos');
  const [kare, setKare] = React.useState<HazirKare | null>(null);
  const kameraVar = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  /* Kaynak adresi yalnız bellekte; bileşen sökülünce bırakılıyor. */
  React.useEffect(() => () => {
    if (kaynak) URL.revokeObjectURL(kaynak.adres);
  }, [kaynak]);

  const secildi = async (olay: React.ChangeEvent<HTMLInputElement>) => {
    const yeni = olay.target.files?.[0] ?? null;
    olay.target.value = '';
    if (!yeni) return;
    if (!IZIN_VERILEN_TURLER.includes(yeni.type)) {
      setUyari('Bu dosya alınmadı: yalnızca JPEG, PNG ve WebP fotoğraf yüklenebiliyor.');
      return;
    }
    const adres = URL.createObjectURL(yeni);
    const gorsel = new Image();
    try {
      await new Promise<void>((coz, reddet) => {
        gorsel.onload = () => coz();
        gorsel.onerror = () => reddet(new Error('okunamadi'));
        gorsel.src = adres;
      });
    } catch {
      URL.revokeObjectURL(adres);
      setUyari('Fotoğraf açılamadı. Başka bir dosya seçebilirsin.');
      return;
    }
    setUyari(null);
    setDosya(yeni);
    setKirpma({ x: 0.5, y: 0.5, yakinlik: 1 });
    setKaynak({ adres, en: gorsel.naturalWidth, boy: gorsel.naturalHeight });
  };

  /* Kırpma değişince kare yeniden üretiliyor; CV önizlemesi anında güncelleniyor. */
  React.useEffect(() => {
    if (!dosya) return;
    let iptal = false;
    const zaman = window.setTimeout(() => {
      void kareyeCevir(dosya, kirpma)
        .then((hazir) => {
          if (iptal) {
            URL.revokeObjectURL(hazir.onizleme);
            return;
          }
          setKare((onceki) => {
            if (onceki) URL.revokeObjectURL(onceki.onizleme);
            return hazir;
          });
          onTaslak(hazir.onizleme);
        })
        .catch(() => {
          if (!iptal) setUyari('Fotoğraf hazırlanamadı. Başka bir dosya seçebilirsin.');
        });
    }, 150);
    return () => {
      iptal = true;
      window.clearTimeout(zaman);
    };
  }, [dosya, kirpma, onTaslak]);

  /* Çerçevedeki görüntü: kaplayan ölçek × yakınlık, merkez kırpmanın merkezi. */
  const olcek = kaynak ? (CERCEVE / Math.min(kaynak.en, kaynak.boy)) * kirpma.yakinlik : 1;
  const sinirla = (k: Kirpma): Kirpma => {
    if (!kaynak) return k;
    const pencere = Math.min(kaynak.en, kaynak.boy) / k.yakinlik;
    const yx = pencere / 2 / kaynak.en;
    const yy = pencere / 2 / kaynak.boy;
    return { ...k, x: Math.min(1 - yx, Math.max(yx, k.x)), y: Math.min(1 - yy, Math.max(yy, k.y)) };
  };
  const surukle = React.useRef<{ x: number; y: number; k: Kirpma } | null>(null);

  const kaydet = async () => {
    if (!kare || durum === 'gonderiliyor') return;
    setDurum('gonderiliyor');
    setUyari(null);
    try {
      const yol = await profilFotografiYukle(kullaniciId, {
        veri: kare.veri,
        uzanti: kare.uzanti,
        genislik: kare.kenar,
        yukseklik: kare.kenar,
        alt: null,
      });
      onKaydedildi(yol);
    } catch (sorun) {
      setDurum('bos');
      setUyari(
        sorun instanceof SosyalHata && sorun.kod === 'satir-yok'
          ? sorun.message
          : 'Fotoğrafın kaydedilemedi. Mevcut fotoğrafın değişmedi; yeniden deneyebilirsin.',
      );
    }
  };

  return (
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-8 lg:mt-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-12">
      <div className="min-w-0 space-y-5">
        <div>
          <h1 ref={baslikRef} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-gray-900 outline-none">
            Fotoğraf ekle
          </h1>
          <p className="mt-2 text-base leading-relaxed text-gray-600">
            Fotoğraf isteğe bağlı. Eklemek istersen aydınlık, sade arka planlı bir kare seçebilirsin.
          </p>
          <p className="mt-1 text-sm text-gray-500">Kaydedersen bu fotoğraf profilinde de görünür.</p>
        </div>

        {kaynak ? (
          <div className="space-y-4">
            <div
              role="img"
              aria-label="Fotoğraf çerçevesi. Sürükleyerek konumlandır; ok tuşlarıyla da taşıyabilirsin."
              tabIndex={0}
              className={`relative mx-auto touch-none select-none overflow-hidden rounded-full bg-gray-200 ${ODAK_HALKASI}`}
              style={{
                width: CERCEVE,
                height: CERCEVE,
                backgroundImage: `url(${kaynak.adres})`,
                backgroundSize: `${kaynak.en * olcek}px ${kaynak.boy * olcek}px`,
                backgroundPosition: `${CERCEVE / 2 - kirpma.x * kaynak.en * olcek}px ${CERCEVE / 2 - kirpma.y * kaynak.boy * olcek}px`,
                backgroundRepeat: 'no-repeat',
                cursor: 'grab',
              }}
              onPointerDown={(olay) => {
                olay.currentTarget.setPointerCapture(olay.pointerId);
                surukle.current = { x: olay.clientX, y: olay.clientY, k: kirpma };
              }}
              onPointerMove={(olay) => {
                const bas = surukle.current;
                if (!bas || !kaynak) return;
                setKirpma(
                  sinirla({
                    ...bas.k,
                    x: bas.k.x - (olay.clientX - bas.x) / (kaynak.en * olcek),
                    y: bas.k.y - (olay.clientY - bas.y) / (kaynak.boy * olcek),
                  }),
                );
              }}
              onPointerUp={() => {
                surukle.current = null;
              }}
              onKeyDown={(olay) => {
                const adim = 0.02;
                const yon: Record<string, [number, number]> = {
                  ArrowLeft: [-adim, 0],
                  ArrowRight: [adim, 0],
                  ArrowUp: [0, -adim],
                  ArrowDown: [0, adim],
                };
                const d = yon[olay.key];
                if (!d) return;
                olay.preventDefault();
                setKirpma((k) => sinirla({ ...k, x: k.x + d[0], y: k.y + d[1] }));
              }}
            />
            <div>
              <label htmlFor="cv-yakinlik" className="block text-sm font-bold text-gray-900">
                Yakınlaştır
              </label>
              <input
                id="cv-yakinlik"
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={kirpma.yakinlik}
                onChange={(e) => setKirpma((k) => sinirla({ ...k, yakinlik: Number(e.target.value) }))}
                className="mt-2 h-11 w-full accent-blue-600"
              />
            </div>
          </div>
        ) : null}

        {uyari && (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {uyari}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {kaynak && (
            <button type="button" onClick={() => void kaydet()} disabled={!kare || durum === 'gonderiliyor'} className={BIRINCIL}>
              {durum === 'gonderiliyor' ? 'Kaydediliyor…' : 'Fotoğrafı kaydet'}
            </button>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className={`${IKINCIL} flex-1 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600`}>
              <ImagePlus aria-hidden className="h-5 w-5" />
              {kaynak ? 'Başka fotoğraf seç' : 'Galeriden seç'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void secildi(e)} />
            </label>
            {kameraVar && (
              <label className={`${IKINCIL} flex-1 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600`}>
                <Camera aria-hidden className="h-5 w-5" />
                Kamerayla çek
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  className="sr-only"
                  onChange={(e) => void secildi(e)}
                />
              </label>
            )}
          </div>
          <button type="button" onClick={onVazgec} className={SADE}>
            Fotoğrafsız devam et
          </button>
        </div>
      </div>

      <aside className="min-w-0" aria-label="CV önizlemesi">
        <div className="mx-auto max-w-[520px] rounded-2xl border border-gray-200 bg-white p-2 shadow-sm lg:sticky lg:top-6">
          <CvOnizleme student={onizlemeOgrencisi} fotografYolu={null} etiket="CV önizlemesi" etkilesimsiz />
        </div>
        <p className="mt-2 text-center text-xs text-gray-500">
          {kare ? 'Henüz kaydedilmedi' : ad ? 'Fotoğraf seçince burada görünür' : ''}
        </p>
      </aside>
    </div>
  );
};
