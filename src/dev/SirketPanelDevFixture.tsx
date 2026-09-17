import React from 'react';
import { SirketKabugu } from '../sirket/SirketKabugu';
import { Ilanlar } from '../sirket/SirketPaneli';
import { IlanFormu } from '../sirket/IlanFormu';
import { AdayIzgarasi } from '../sirket/AdayIzgarasi';
import { GenelBakis } from '../sirket/GenelBakis';
import { SirketProfilFormu } from '../sirket/SirketProfilFormu';
import {
  SIRKET_KENAR,
  SIRKET_KENAR_VURGU,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
} from '../sirket/renk';
import { KADEME } from '../lib/sirket-kademe.mjs';
import { kartVerisi } from '../lib/aday-kart.mjs';
import type { SirketProfilDegeri } from '../lib/sirket-veri';

/**
 * Şirket panelinin görsel testi.
 *
 * NEDEN VAR
 * ---------
 * Panel şirket üyeliği gerektiriyor ve tarayıcıdan uçtan uca
 * denenemiyor. Bu projede bir kez "tsc temiz, testler yeşil" deyip
 * yerleşimi bozuk bir şey canlıya çıktı; tip denetimi bir yerleşim
 * hatasını yakalamıyor.
 *
 * Burada kabuk, ilan formu ve aday ızgarası gerçek verilerle değil ama
 * GERÇEK bileşenlerle çiziliyor: ölçüler, tema sızıntısı, klavye
 * gezinmesi ve form davranışı ölçülebiliyor.
 *
 * Buradaki adaylar bilerek "Aday A/B/C": gerçek bir kişiye benzeyen
 * uydurma isim, ekran görüntüsüne düştüğünde gerçek sanılır.
 *
 * Yalnızca development sunucusunda servis ediliyor; üretim paketine
 * girmiyor.
 */

const ORNEK_BASVURULAR = [
  {
    id: 'test-1',
    status: 'submitted',
    applied_at: '2026-08-20T09:00:00Z',
    match_score: 88,
    listing_id: 'ilan-1',
    ilanBasligi: 'Yazılım Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-20T09:00:00Z',
    cover_letter: 'Bu bir test ön yazısıdır.',
    profile_snapshot: {
      ad: 'Aday A',
      universite: 'Örnek Üniversitesi',
      bolum: 'Bilgisayar Mühendisliği',
      sinif: '3. Sınıf',
      sehir: 'İstanbul',
      github: 'ornek',
      yetenekler: ['React', 'TypeScript', 'PostgreSQL'],
      diller: ['İngilizce (B2)'],
      rozetler: ['Test rozeti'],
      projeler: [{ baslik: 'Örnek proje', aciklama: 'Test açıklaması', adres: null }],
    },
  },
  {
    id: 'test-2',
    status: 'under_review',
    applied_at: '2026-08-18T09:00:00Z',
    match_score: 61,
    listing_id: 'ilan-1',
    ilanBasligi: 'Yazılım Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-18T09:00:00Z',
    profile_snapshot: {
      ad: 'Aday B',
      universite: 'Örnek Teknik Üniversitesi',
      bolum: 'Endüstri Mühendisliği',
      sinif: '2. Sınıf',
      sehir: 'Ankara',
      yetenekler: ['Excel', 'Python'],
      rozetler: [],
      projeler: [],
    },
  },
  {
    /* Rıza yok: şirketin kendi sitesinden gelen başvuru. Ad görünmemeli. */
    id: 'test-3',
    status: 'submitted',
    applied_at: '2026-08-15T09:00:00Z',
    match_score: 34,
    listing_id: 'ilan-1',
    ilanBasligi: 'Yazılım Stajyeri',
    application_method: 'external',
    contact_share_consent_at: null,
    profile_snapshot: null,
  },
  {
    /*
      ÜRETİMDEKİ GERÇEK BİÇİM (anonimleştirildi)

      Fikstürde yalnız "ideal aday" vardı ve aday ayrıntısını beyaz
      ekrana düşüren hata bu yüzden burada hiç görünmedi. Bu kayıt
      üretimdeki yeni başvurunun biçimini taşıyor:

        cv_snapshot_path DOLU, cv_path NULL
        match_score 0
        github / linkedin / portfolyo null
        rozetler []
        projeler[0].adres dolu
        diller BOZUK — "undefined (B1)" (kopya hatası düzeltilmeden
        önce yazılmış kayıtlar üretimde duruyor ve ayrıntı yine de
        açılabilmeli)
    */
    id: 'test-4',
    status: 'submitted',
    applied_at: '2026-08-31T08:00:00Z',
    match_score: 0,
    listing_id: 'ilan-2',
    ilanBasligi: 'IT Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-31T08:00:00Z',
    cv_path: null,
    cv_snapshot_path: '00000000-0000-4000-8000-00000000000c/basvurular/ornek.pdf',
    profile_snapshot: {
      ad: 'Aday D',
      eposta: 'aday-d@ornek.test',
      universite: 'Örnek Güzel Sanatlar Üniversitesi',
      bolum: 'Giyim Üretim Teknolojisi',
      sinif: '2. Sınıf',
      sehir: 'İstanbul',
      github: null,
      linkedin: null,
      portfolyo: null,
      fotoUrl: null,
      yetenekler: ['Canva', 'HTML / CSS', 'JavaScript'],
      diller: ['undefined (B1)', 'undefined (A2)'],
      rozetler: [],
      projeler: [
        {
          baslik: 'Örnek proje',
          aciklama: 'Kısa açıklama.',
          adres: 'https://ornek.test/',
        },
      ],
    },
  },
  {
    /*
      DAHA DA BOZUK: dizi beklenen alanlar nesne/sayı taşıyor, proje
      adresi null, ad yok. Ayrıntı yine AÇILABİLMELİ — ikincil alanlar
      düşse de ana bilgiler görünmeli.
    */
    id: 'test-5',
    status: 'interview_scheduled',
    applied_at: '2026-08-29T08:00:00Z',
    match_score: null,
    listing_id: 'ilan-2',
    ilanBasligi: 'IT Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-29T08:00:00Z',
    cv_path: null,
    cv_snapshot_path: null,
    profile_snapshot: {
      ad: 'Aday E',
      universite: 'Örnek Üniversitesi',
      bolum: null,
      sinif: null,
      sehir: null,
      yetenekler: [{ ad: 'nesne' }, 42, null, 'Figma'],
      diller: [{ dil: 'İngilizce' }, null],
      rozetler: null,
      projeler: [{ baslik: null, aciklama: null, adres: null }],
    },
  },
  /*
    ÖĞRENCİNİN KARAR VERDİĞİ İKİ DURUM

    Şirket bu iki değeri yazamıyor (politika reddediyor), dolayısıyla
    panelden ilerleyerek bu ekranlara ulaşmak mümkün değil. Fikstür
    ikisini de başlangıç durumu olarak taşıyor.
  */
  /* GÖRÜŞME ONAYLANDI: şirketin sıradaki adımı teklif. */
  {
    id: 'test-8',
    status: 'interview_scheduled',
    interview_date: '2026-09-12',
    interview_time: '11:30',
    interview_type: 'online',
    interview_location: 'https://ornek.test/gorusme/abc',
    interview_response: 'accepted',
    applied_at: '2026-08-25T08:00:00Z',
    match_score: 84,
    listing_id: 'ilan-1',
    ilanBasligi: 'Yazılım Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-25T08:00:00Z',
    cv_path: null,
    cv_snapshot_path: null,
    profile_snapshot: {
      ad: 'Aday H',
      universite: 'Örnek Üniversitesi',
      bolum: 'Bilgisayar Mühendisliği',
      sinif: '3. Sınıf',
      sehir: 'İstanbul',
      yetenekler: ['React'],
    },
  },
  /* ÖĞRENCİ KATILAMIYOR: şirket yeni davet gönderebilmeli. */
  {
    id: 'test-9',
    status: 'interview_scheduled',
    interview_date: '2026-09-13',
    interview_time: '09:00',
    interview_type: 'phone',
    interview_response: 'declined',
    applied_at: '2026-08-26T08:00:00Z',
    match_score: 66,
    listing_id: 'ilan-1',
    ilanBasligi: 'Yazılım Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-26T08:00:00Z',
    cv_path: null,
    cv_snapshot_path: null,
    profile_snapshot: {
      ad: 'Aday I',
      universite: 'Örnek Teknik Üniversitesi',
      bolum: 'Makine Mühendisliği',
      sinif: '2. Sınıf',
      sehir: 'Bursa',
      yetenekler: ['SolidWorks'],
    },
  },
  {
    id: 'test-6',
    status: 'offer_accepted',
    applied_at: '2026-08-24T08:00:00Z',
    match_score: 91,
    listing_id: 'ilan-1',
    ilanBasligi: 'Yazılım Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-24T08:00:00Z',
    cv_path: null,
    cv_snapshot_path: null,
    offer_note: 'Ekibe eylül başında bekliyoruz.',
    offer_start_date: '2026-10-01',
    offer_compensation: '18.000 TL / ay',
    profile_snapshot: {
      ad: 'Aday F',
      universite: 'Örnek Üniversitesi',
      bolum: 'Yazılım Mühendisliği',
      sinif: '4. Sınıf',
      sehir: 'İstanbul',
      yetenekler: ['Go', 'Kubernetes'],
    },
  },
  {
    id: 'test-7',
    status: 'offer_declined',
    applied_at: '2026-08-23T08:00:00Z',
    match_score: 74,
    listing_id: 'ilan-1',
    ilanBasligi: 'Yazılım Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-23T08:00:00Z',
    cv_path: null,
    cv_snapshot_path: null,
    offer_note: 'Uzaktan çalışmaya açığız.',
    profile_snapshot: {
      ad: 'Aday G',
      universite: 'Örnek Teknik Üniversitesi',
      bolum: 'Elektrik-Elektronik',
      sinif: '3. Sınıf',
      sehir: 'İzmir',
      yetenekler: ['C'],
    },
  },
];

/** Fikstür boyunca aynı şirket bağlamı — üç ekranda tekrar yazılmasın. */
const TEST_BAGLAMI = (kademe: number) => ({
  companyId: 'test',
  ad: 'Örnek Teknoloji A.Ş.',
  slug: 'ornek',
  siteUrl: 'https://ornek.com',
  hrEmail: 'ik@ornek.com',
  vkn: null,
  dogrulandi: kademe === KADEME.DOGRULANMIS,
  kademe,
});

/*
  SABİT "BUGÜN"

  "3 gün kaldı" rozeti gerçek tarihten hesaplanıyor; fikstür sabit bir
  gün vermezse ekran görüntüsü her gün başka bir sayı gösterir ve bir
  hafta sonra "Kapalı"ya düşer.
*/
const BUGUN = new Date('2026-09-17T09:00:00Z');

/** Profil: tam (uyarı satırı yok) ya da eksik (logo, açıklama, site boş). */
const PROFIL_TAM: SirketProfilDegeri = {
  logoUrl: 'https://ornek.com/logo.png',
  industry: 'Yazılım',
  size: '11-50',
  location: 'İstanbul',
  websiteUrl: 'https://ornek.com',
  description: 'Örnek açıklama.',
  hrEmail: 'ik@ornek.com',
};
const PROFIL_EKSIK: SirketProfilDegeri = {
  ...PROFIL_TAM,
  logoUrl: '',
  websiteUrl: '',
  description: '',
};

/*
  İLAN SENARYOLARI

  Üçü de gerçek `listings` satır biçiminde (id, title, city, status,
  origin, application_method, application_deadline, applicants_count).
  Altı ilanlı senaryo Genel ekranın ölçeklenmesini ölçüyor: biri 3 gün
  kaldı (BUGUN + 3), biri kapalı, biri 12 yeni başvuranlı (avatar
  şeridi 5 + "+7" olmalı), biri taslak ve inceleme notlu, biri
  toplama hattından (düzenlenemez).
*/
const ILAN = (
  n: number,
  alanlar: Record<string, unknown>,
): Record<string, unknown> => ({
  id: `2d7aa946-0000-4000-8000-00000000000${n}`,
  origin: 'employer_posted',
  application_method: 'internal',
  applicants_count: 0,
  ...alanlar,
});

const TEK_ILAN = [
  ILAN(1, { title: 'Yazılım Stajyeri', city: 'İstanbul', status: 'published', applicants_count: 3 }),
];

const ALTI_ILAN = [
  ILAN(1, { title: 'Yazılım Stajyeri', city: 'İstanbul', status: 'published', applicants_count: 3 }),
  ILAN(2, {
    title: 'Veri Analisti Stajyeri',
    city: 'Ankara',
    status: 'published',
    application_deadline: '2026-09-20',
    applicants_count: 1,
  }),
  ILAN(3, { title: 'Pazarlama Stajyeri', city: 'İzmir', status: 'closed', applicants_count: 7 }),
  ILAN(4, {
    title: 'Ürün Tasarımı Stajyeri',
    city: 'Uzaktan',
    status: 'published',
    applicants_count: 12,
  }),
  ILAN(5, {
    title: 'Finans Stajyeri',
    city: 'İstanbul',
    status: 'draft',
    review_note: 'Ücret bilgisi eksik; net ya da brüt aylık tutar yazılmalı.',
  }),
  ILAN(6, {
    title: 'İnsan Kaynakları Stajyeri (kaynaktan)',
    city: 'İstanbul',
    status: 'published',
    origin: 'scraped',
    application_method: 'external',
  }),
];

/*
  Senaryoya göre başvuru satırları. Tek ilan: 3 yeni. Altı ilan: ilan
  1'e 3 yeni, ilan 2'ye 1 incelemede, ilan 3'e 7 karar verilmiş, ilan
  4'e 12 yeni. Adlar bilerek "Aday X": gerçek isme benzeyen uydurma ad,
  ekran görüntüsüne düştüğünde gerçek sanılır.
*/
const YENI_BASVURU = (id: string, ilanNo: number, ad: string, status = 'submitted') => ({
  id,
  status,
  applied_at: '2026-09-16T09:00:00Z',
  match_score: null,
  listing_id: `2d7aa946-0000-4000-8000-00000000000${ilanNo}`,
  ilanBasligi: String(ALTI_ILAN[ilanNo - 1].title),
  application_method: 'internal',
  contact_share_consent_at: '2026-09-16T09:00:00Z',
  profile_snapshot: { ad, universite: 'Örnek Üniversitesi', yetenekler: [] },
});

const HARFLER = 'ABCDEFGHIJKLMNOP';
const TEK_ILAN_BASVURULARI = [1, 2, 3].map((n) =>
  YENI_BASVURU(`tek-${n}`, 1, `Aday ${HARFLER[n - 1]}`),
);
const ALTI_ILAN_BASVURULARI = [
  ...TEK_ILAN_BASVURULARI,
  YENI_BASVURU('iki-1', 2, 'Aday D', 'under_review'),
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => YENI_BASVURU(`uc-${n}`, 3, `Aday ${HARFLER[n + 3]}`, 'rejected')),
  ...Array.from({ length: 12 }, (_, i) =>
    YENI_BASVURU(`dort-${i + 1}`, 4, `Aday ${HARFLER[i % HARFLER.length]}${i + 1}`),
  ),
];

type Senaryo = 'sifir' | 'bir' | 'alti';

export const SirketPanelDevFixture: React.FC = () => {
  const [kademe, setKademe] = React.useState<number>(KADEME.DOGRULANMIS);
  const [ekran, setEkran] = React.useState<'genel' | 'ilanlar' | 'form' | 'adaylar' | 'profil'>(
    'genel',
  );
  const [senaryo, setSenaryo] = React.useState<Senaryo>('alti');
  const [profilEksik, setProfilEksik] = React.useState(false);
  /*
    ŞİRKET KAYDI YOK SENARYOSU

    Üyeliği olmayan hesap Şirket sekmesinde sonsuz iskelet görüyordu; bu
    kol companyId'yi boşaltıp o ekranı çizdiriyor.
  */
  const [sirketYok, setSirketYok] = React.useState(false);

  /*
    DURUM DEĞİŞİMİ GERÇEKTEN UYGULANIYOR

    Fikstür eskiden `onDurum={async () => undefined}` veriyordu: durum
    seçicisi tarayıcıda hiçbir şey değiştirmiyordu, dolayısıyla akış
    hiç görülmüyordu. Artık satırlar yerel durumda tutuluyor ve durum
    değişimi kartlara işliyor.
  */
  const [satirlar, setSatirlar] = React.useState(ORNEK_BASVURULAR);
  const kartlar = React.useMemo(
    () => satirlar.map((s) => kartVerisi(s, { yetenekler: [] })),
    [satirlar]
  );

  const ilanlar = senaryo === 'sifir' ? [] : senaryo === 'bir' ? TEK_ILAN : ALTI_ILAN;
  const ilanBasvurulari = React.useMemo(
    () =>
      (senaryo === 'bir' ? TEK_ILAN_BASVURULARI : senaryo === 'alti' ? ALTI_ILAN_BASVURULARI : []).map(
        (s) => kartVerisi(s, { yetenekler: [] }),
      ),
    [senaryo],
  );

  /*
    Kasten hata veren aday: yazma hatasının satır içinde göründüğü
    doğrulanabilsin. Sondaki kayıt değil sabit bir kimlik — listeye yeni
    aday eklendikçe hangi adayın bozuk olduğu kaymasın.
  */
  const hataliId = 'test-5';

  const satirYaz = (id: string, alanlar: Record<string, unknown>) =>
    new Promise<void>((coz, red) => {
      window.setTimeout(() => {
        if (id === hataliId) {
          red(new Error('Fikstür: bu adayda kayıt hatası taklit ediliyor.'));
          return;
        }
        setSatirlar((o) => o.map((s) => (s.id === id ? { ...s, ...alanlar } : s)));
        coz();
      }, 250);
    });

  const kolSinifi = 'min-h-8 rounded-lg border border-gray-300 px-2 py-1 font-bold';

  return (
    <>
      {/* Test kolları — gerçek panelde yok. */}
      <div className="fixed left-2 top-20 z-[300] flex flex-wrap gap-2 rounded-xl bg-white p-2 text-xs shadow-lg">
        <button
          type="button"
          id="dev-kademe-1"
          onClick={() => setKademe(KADEME.ILAN_VEREN)}
          className={kolSinifi}
        >
          Kademe 1
        </button>
        <button
          type="button"
          id="dev-kademe-2"
          onClick={() => setKademe(KADEME.DOGRULANMIS)}
          className={kolSinifi}
        >
          Kademe 2
        </button>
        <button
          type="button"
          id="dev-ekran"
          onClick={() =>
            setEkran((e) =>
              e === 'genel'
                ? 'ilanlar'
                : e === 'ilanlar'
                  ? 'form'
                  : e === 'form'
                    ? 'adaylar'
                    : e === 'adaylar'
                      ? 'profil'
                      : 'genel',
            )
          }
          className={kolSinifi}
        >
          Ekran: {ekran}
        </button>
        <select
          id="dev-senaryo"
          value={senaryo}
          onChange={(e) => setSenaryo(e.target.value as Senaryo)}
          aria-label="İlan senaryosu"
          className={kolSinifi}
        >
          <option value="sifir">0 ilan</option>
          <option value="bir">1 ilan · 3 yeni</option>
          <option value="alti">6 ilan</option>
        </select>
        <button
          type="button"
          id="dev-profil"
          onClick={() => setProfilEksik((p) => !p)}
          aria-pressed={profilEksik}
          className={kolSinifi}
        >
          Profil: {profilEksik ? 'eksik' : 'tam'}
        </button>
        <button
          type="button"
          id="dev-sirket-yok"
          onClick={() => setSirketYok((p) => !p)}
          aria-pressed={sirketYok}
          className={kolSinifi}
        >
          Şirket kaydı: {sirketYok ? 'yok' : 'var'}
        </button>
      </div>

      <SirketKabugu
        secili={
          ekran === 'adaylar'
            ? 'basvuranlar'
            : ekran === 'genel'
              ? 'genel'
              : ekran === 'profil'
                ? 'sirket'
                : 'ilanlar'
        }
        onNavigate={() => undefined}
        durumRozeti={
          <span
            className="rounded-lg border px-2 py-1 text-[11px] font-bold"
            style={{
              borderColor: kademe === KADEME.DOGRULANMIS ? SIRKET_KENAR_VURGU : SIRKET_KENAR,
              background: kademe === KADEME.DOGRULANMIS ? SIRKET_ROZET : undefined,
              color: kademe === KADEME.DOGRULANMIS ? SIRKET_VURGU_KOYU : SIRKET_METIN_IKINCIL,
            }}
          >
            {kademe === KADEME.DOGRULANMIS ? 'Doğrulanmış kurum' : 'İlan açık · kartlar kapalı'}
          </span>
        }
      >
        {ekran === 'genel' ? (
          <GenelBakis
            baglam={TEST_BAGLAMI(kademe)}
            ilanlar={ilanlar}
            basvurular={ilanBasvurulari}
            profil={profilEksik ? PROFIL_EKSIK : PROFIL_TAM}
            onNavigate={() => undefined}
            simdi={BUGUN}
          />
        ) : ekran === 'ilanlar' ? (
          /*
            İLANLAR EKRANI FİKSTÜRDE

            Genel'le aynı senaryo listesi: yayında (düzenle + kapat),
            taslak ve inceleme notlu (düzenle + yayınla + sil), başvurusu
            olan kapalı ilan (sil değil arşivle) ve toplama hattından
            gelen ilan (düzenlenemez).
          */
          <Ilanlar
            baglam={TEST_BAGLAMI(kademe)}
            ilanlar={ilanlar}
            basvurular={ilanBasvurulari}
            onNavigate={() => undefined}
            onDurum={async () => undefined}
            onKaldir={async () => undefined}
            simdi={BUGUN}
          />
        ) : ekran === 'profil' ? (
          /*
            Şirket profili: veri okuması Supabase'e gidiyor ve fixture'da
            oturum yok, o yüzden ekran boş değerlerle çiziliyor. Amaç
            yerleşim, hiyerarşi ve tema sızıntısını görmek.
          */
          <SirketProfilFormu
            baglam={sirketYok ? { ...TEST_BAGLAMI(kademe), companyId: null, ad: '' } : TEST_BAGLAMI(kademe)}
            userId="00000000-0000-4000-8000-000000000001"
            onKaydedildi={() => undefined}
            onNavigate={() => undefined}
          />
        ) : ekran === 'form' ? (
          <IlanFormu
            kademe={kademe}
            sirketAdi="Örnek Teknoloji A.Ş."
            siteUrl="https://ornek.com"
            eposta={kademe === KADEME.DOGRULANMIS ? 'ik@gmail.com' : 'ik@ornek.com'}
            onKaydet={async () => ({ id: '00000000-0000-0000-0000-000000000000' })}
            onIptal={() => setEkran('adaylar')}
          />
        ) : (
          /* Başlık ızgaranın kendisinde; fikstür de üretimi taklit ediyor. */
          <div>
            <AdayIzgarasi
              kartlar={kartlar}
              ilanAdresi="https://stajimvar.com/ilan/test"
              onNavigate={() => undefined}
              onDurum={(id, d) => satirYaz(id, { status: d })}
              onMulakatTarihi={(id, tarih) => satirYaz(id, { interview_date: tarih || null })}
              onTeklif={(id, teklif) =>
                satirYaz(id, {
                  status: 'offer_extended',
                  offer_note: teklif.not.trim() || null,
                  offer_start_date: teklif.baslangic || null,
                  offer_compensation: teklif.ucret.trim() || null,
                })
              }
              onDavet={(id, davet) =>
                satirYaz(id, {
                  status: 'interview_scheduled',
                  interview_date: davet.tarih || null,
                  interview_time: davet.saat || null,
                  interview_type: davet.tur || null,
                  interview_location: davet.yer.trim() || null,
                  interview_note: davet.not.trim() || null,
                  /* Yeni davet eski yanıtı geçersiz kılıyor. */
                  interview_response: null,
                })
              }
              /*
                Gerçek kapı veritabanında; fikstür yalnızca kabul edilmiş
                başvuruda satır döndürerek aynı davranışı taklit ediyor.
                Bir adayda kasten hata veriyor: "yüklenemedi" hali de
                tarayıcıda görülebilsin.
              */
              onIletisim={(id) =>
                new Promise((coz, red) => {
                  window.setTimeout(() => {
                    const satir = satirlar.find((x) => x.id === id);
                    if (id === hataliId) {
                      red(new Error('Fikstür: iletişim okuma hatası.'));
                      return;
                    }
                    coz(
                      satir && satir.status === 'offer_accepted'
                        ? {
                            ad: 'Mustafa Oğulcan Doğan',
                            eposta: 'mustafa.ogulcan@ornek.edu.tr',
                            /* Ham biçim: ekranda okunur yazılıyor, kayıt değişmiyor. */
                            telefon: '+905323311338',
                            unvan: 'Aday',
                          }
                        : null,
                    );
                  }, 250);
                })
              }
              onNot={async () => undefined}
            />
          </div>
        )}
      </SirketKabugu>
    </>
  );
};
