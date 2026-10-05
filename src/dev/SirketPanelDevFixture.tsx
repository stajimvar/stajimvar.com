import React from 'react';
import { Header } from '../components/Header';
import { GuideHub } from '../components/GuidePages';
import { SayfaAramaSaglayici } from '../lib/sayfa-aramasi';
import { SirketIlanlarSekmesi, sirketEkrani } from '../sirket/SirketPaneli';
import { SirketAgimBos, SirketProfilSekmesi } from '../sirket/SirketKimlikKarti';
import { IlanFormu } from '../sirket/IlanFormu';
import { OnaySayfasi } from '../components/yonetim/OnaySayfasi';
import type { OnayKuyrugu } from '../lib/queries';

/*
  YÖNETİCİ ONAY KUYRUĞU — /yonetim/onay (fikstür adresi)

  Yönetici ekranı oturumsuz açılmıyor; kuyruğun gerekçe, kanıt, kural
  sürümü ve son kararlar bölümleri telefonda (375 px) ancak burada
  ölçülebiliyor. Kayıtlar bilerek "Örnek …": gerçek bir şirkete benzeyen
  ad, ekran görüntüsüne düştüğünde gerçek sanılır. Gerekçe ve hata
  metinleri göçteki (20261120010000) kural mesajlarının aynısı. Karar
  düğmeleri canlı RPC'ye gidiyor; fikstürde erişilemez adres yüzünden
  "karar uygulanamadı" uyarısı çıkması beklenen davranış.
*/
const ORNEK_KUYRUK: OnayKuyrugu = {
  ilanlar: [
    {
      id: 'a0000000-0000-4000-8000-000000000001',
      baslik: 'Saha Satış Stajyeri',
      sirket: 'Örnek Pazarlama Ltd.',
      sehir: 'İstanbul',
      ulke: 'TR',
      kaynak: 'employer_posted',
      calisma: 'On-site',
      basvuruYolu: 'internal',
      adres: null,
      sonBasvuru: null,
      kaynakDurumu: null,
      aciklamaUzunluk: 412,
      olustu: '2026-10-04T08:10:00Z',
      guncellendi: '2026-10-04T08:12:00Z',
      kontrolDurumu: 'inceleme',
      kontrolZamani: '2026-10-04T08:12:00Z',
      kuralSurumu: 'ilan-kontrol-1 (2026-10-04)',
      kontrolGerekceleri: [
        {
          kural: 'icerik.odeme_talebi',
          mesaj: 'Adaydan ücret ya da bedel istendiği izlenimi veren ifade.',
          kanit: 'staja kabul edilen adaylardan egitim materyali icin 1500 tl egitim ucreti alinmaktadir. ucret ilk hafta yatirilir',
        },
        {
          kural: 'baglanti.kisaltici',
          mesaj: 'Metinde hedefini gizleyen kısaltılmış bağlantı var.',
          kanit: 'https://bit.ly/ornek-basvuru-formu-2026',
        },
        { kural: 'sirket.dogrulanmamis', mesaj: 'Şirket henüz doğrulanmadı.' },
      ],
    },
  ],
  sahiplenmeler: [],
  bolumler: [],
  dogrulamalar: [],
  kontrolBekleyenler: [
    {
      id: 'a0000000-0000-4000-8000-000000000002',
      baslik: 'Veri Analisti Stajyeri',
      sirket: 'Örnek Teknoloji A.Ş.',
      denemeler: 2,
      sonrakiDeneme: '2026-10-04T09:25:00Z',
      sonHata: 'canceling statement due to statement timeout',
      kapsam: 'ilan',
    },
    {
      id: '2d7aa946-0000-4000-8000-000000000009',
      baslik: 'Kurumsal İletişim Stajyeri',
      sirket: 'Örnek Teknoloji A.Ş.',
      denemeler: 1,
      sonrakiDeneme: '2026-10-04T07:10:00Z',
      sonHata: 'canceling statement due to statement timeout',
      kapsam: 'degisiklik',
    },
  ],
  /*
    İŞ SAĞLIĞI UYARISI: son çalışma bekleyen kontrol varken 2 saatten eski
    ve sunucu bir gecikmiş kontrol sayıyor → uyarı çizilmeli.
  */
  yenidenDenemeIsi: { sonCalisma: '2026-10-04T05:00:00Z', gecikmisKontroller: 1 },
  degisiklikler: [
    {
      id: '2d7aa946-0000-4000-8000-000000000001',
      baslik: 'Yazılım Stajyeri',
      sirket: 'Örnek Teknoloji A.Ş.',
      canli: {
        title: 'Yazılım Stajyeri',
        city: 'İstanbul',
        work_type: 'On-site',
        duration: '20 iş günü',
        stipend_text: 'Asgari staj ücreti',
        description:
          'Ekibimizle birlikte web uygulamalarımızın geliştirilmesinde yer alacaksın. React ve TypeScript ile arayüz geliştirmeye destek olacak, kod incelemelerine katılacaksın.',
      },
      bekleyen: {
        title: 'Yazılım Stajyeri',
        city: 'İstanbul',
        work_type: 'Hybrid',
        duration: '20 iş günü',
        stipend_text: 'Asgari staj ücreti',
        description:
          'Ekibimizle birlikte web uygulamalarımızın geliştirilmesinde yer alacaksın. Başvuru için eğitim materyali bedeli olarak 1500 TL eğitim ücreti alınmaktadır; ücret ilk hafta yatırılır. React ve TypeScript ile arayüz geliştirmeye destek olacaksın.',
      },
      kontrolZamani: '2026-10-04T09:30:00Z',
      kuralSurumu: 'ilan-kontrol-1 (2026-10-04)',
      kontrolGerekceleri: [
        {
          kural: 'icerik.odeme_talebi',
          mesaj: 'Adaydan ücret ya da ödeme istendiği izlenimi veren ifade.',
          kanit: 'basvuru icin egitim materyali bedeli olarak 1500 tl egitim ucreti alinmaktadir; ucret ilk hafta yatirilir',
        },
      ],
    },
  ],
  sonKararlar: [
    {
      id: 43,
      ilanId: '2d7aa946-0000-4000-8000-000000000001',
      baslik: 'Yazılım Stajyeri',
      sirket: 'Örnek Teknoloji A.Ş.',
      ilanDurumu: 'published',
      kaynak: 'otomatik',
      kapsam: 'degisiklik',
      karar: 'inceleme',
      gerekceler: [
        {
          kural: 'icerik.odeme_talebi',
          mesaj: 'Adaydan ücret ya da ödeme istendiği izlenimi veren ifade.',
          kanit: 'basvuru icin egitim materyali bedeli olarak 1500 tl egitim ucreti alinmaktadir',
        },
      ],
      kuralSurumu: 'ilan-kontrol-1 (2026-10-04)',
      hata: null,
      zaman: '2026-10-04T09:30:00Z',
    },
    {
      id: 42,
      ilanId: 'a0000000-0000-4000-8000-000000000005',
      baslik: 'Saha Pazarlama Stajyeri',
      sirket: 'Örnek Medya',
      ilanDurumu: 'draft',
      kaynak: 'yonetici',
      kapsam: 'ilan',
      karar: 'yonetici_kaldirdi',
      gerekceler: [{ kural: 'yonetici', mesaj: 'İlan metninde adaydan kayıt ücreti isteniyor; bu kabul edilmiyor.' }],
      kuralSurumu: 'ilan-kontrol-1 (2026-10-04)',
      hata: null,
      zaman: '2026-10-04T09:00:00Z',
    },
    {
      id: 41,
      ilanId: '2d7aa946-0000-4000-8000-000000000001',
      baslik: 'Yazılım Stajyeri',
      sirket: 'Örnek Teknoloji A.Ş.',
      ilanDurumu: 'published',
      kaynak: 'otomatik',
      karar: 'yayinla',
      gerekceler: [],
      kuralSurumu: 'ilan-kontrol-1 (2026-10-04)',
      hata: null,
      zaman: '2026-10-04T08:40:00Z',
    },
    {
      id: 40,
      ilanId: 'a0000000-0000-4000-8000-000000000003',
      baslik: 'Muhasebe Stajyeri',
      sirket: 'Örnek Danışmanlık',
      ilanDurumu: 'draft',
      kaynak: 'otomatik',
      karar: 'duzeltme',
      gerekceler: [
        {
          alan: 'description',
          kural: 'baglanti.https',
          mesaj:
            'Bu bağlantı güvenli değil (http). https:// ile yaz ya da kaldır: http://ornek.test/kariyer/basvuru-formu/staj-2026-donemi-uzun-adres',
        },
      ],
      kuralSurumu: 'ilan-kontrol-1 (2026-10-04)',
      hata: null,
      zaman: '2026-10-04T08:20:00Z',
    },
    {
      id: 39,
      ilanId: 'a0000000-0000-4000-8000-000000000002',
      baslik: 'Veri Analisti Stajyeri',
      sirket: 'Örnek Teknoloji A.Ş.',
      ilanDurumu: 'draft',
      kaynak: 'otomatik',
      karar: 'hata',
      gerekceler: [],
      kuralSurumu: 'ilan-kontrol-1 (2026-10-04)',
      hata: 'canceling statement due to statement timeout',
      zaman: '2026-10-04T08:05:00Z',
    },
    {
      id: 38,
      ilanId: 'a0000000-0000-4000-8000-000000000004',
      baslik: 'Pazarlama Stajyeri',
      sirket: 'Örnek Medya',
      ilanDurumu: 'archived',
      kaynak: 'yonetici',
      karar: 'yonetici_ret',
      gerekceler: [],
      kuralSurumu: 'ilan-kontrol-1 (2026-10-04)',
      hata: null,
      zaman: '2026-10-03T16:00:00Z',
    },
  ],
};
/* Modül düzeyinde: her çizimde yeni işlev kuyruğu sonsuz yeniden yüklerdi. */
const ornekKuyrukGetir = () => Promise.resolve(ORNEK_KUYRUK);
import { KADEME } from '../lib/sirket-kademe.mjs';
import { kartVerisi } from '../lib/aday-kart.mjs';
import { PAYLASIM_SURUMU } from '../lib/basvuru-durumu.mjs';
import type {
  AdayGuncelProfili,
  AdayPaylasimi,
  IlanKontrolDurumu,
  IlanKontrolSonucu,
  SirketProfilDegeri,
  EkipRolu,
} from '../lib/sirket-veri';
import type { PaylasimSonucu } from '../sirket/AdayPaylasimlari';
import { SAYFA_GENISLIGI } from '../lib/duzen';

/**
 * Şirket hesabının TEK KABUK görsel testi.
 *
 * NEDEN VAR
 * ---------
 * Şirket ekranları şirket üyeliği gerektiriyor ve tarayıcıdan uçtan uca
 * denenemiyor. Bu projede bir kez "tsc temiz, testler yeşil" deyip
 * yerleşimi bozuk bir şey canlıya çıktı; tip denetimi bir yerleşim
 * hatasını yakalamıyor.
 *
 * NE ÇİZİYOR (18 Eylül 2026)
 * --------------------------
 * Gerçek Header (`userRole="company"`) + gerçek alt menü + sekme
 * içerikleri, oturumsuz. Adres yerel durumda (`yol`); Header ve sekme
 * bağlantıları `onNavigate` ile onu değiştiriyor, yani beş sekme
 * arasındaki geçiş gerçek bileşenlerle ölçülüyor:
 *   /sirket/ilanlar · /sirket/basvuranlar · /sirket/ilan/yeni ·
 *   /agim (boş durum) · /rehber · /sirket/profil (kimlik kartı + form)
 *
 * /firsatlar YOK (18 Eylül 2026): şirket kabuğunda Fırsatlar sekmesi
 * kalktı, yeri Başvuranlar; App şirketi o adresten
 * /sirket/basvuranlar'a alıyor. Rehber GERÇEK sayfa.
 *
 * Buradaki adaylar bilerek "Aday A/B/C": gerçek bir kişiye benzeyen
 * uydurma isim, ekran görüntüsüne düştüğünde gerçek sanılır.
 *
 * Yalnızca development sunucusunda servis ediliyor; üretim paketine
 * girmiyor.
 */

/*
  ADAY A'NIN KOPYASI — İKİ BAŞVURUDA AYNI

  Aynı öğrenci iki ayrı ilana başvurdu (test-1 ve test-10): iki ayrı
  başvuru kimliği, iki ayrı kart. Kart ve inceleme ekranı hangi ilana
  bakıldığını söylemeli; seçim başvuru kimliğiyle.
*/
const ADAY_A_KOPYASI = {
  ad: 'Aday A',
  universite: 'Örnek Üniversitesi',
  bolum: 'Bilgisayar Mühendisliği',
  sinif: '3. Sınıf',
  sehir: 'İstanbul',
  github: 'ornek',
  linkedin: 'https://www.linkedin.com/in/ornek-aday',
  portfolyo: 'javascript:alert(1)',
  yetenekler: ['React', 'TypeScript', 'PostgreSQL'],
  diller: ['İngilizce (B1)'],
  rozetler: ['quiz-react'],
  projeler: [{ baslik: 'Örnek proje', aciklama: 'Test açıklaması', adres: 'https://ornek.test/proje' }],
};

/*
  SORUMLU DAĞILIMI BİLEREK KARIŞIK: üçte biri Deniz'de (u-1), üçte biri
  Eren'de (u-2), üçte biri boşta. Hepsi aynı olsaydı ne "sorumlusu
  olmayanlar" süzgeci ne de iş yükü farkı ekranda görülebilirdi.
*/
/*
  SON İŞLEM DAMGASI bilerek karışık: 2, 9, 20 ve 40 gün önce. Hepsi taze
  olsaydı bekleme rozeti hiç görünmez, hepsi eski olsaydı rozetsiz kart
  kalmaz ve ayrımın çalıştığı görülemezdi. Sabit bir "bugün"e göre değil
  ÇALIŞMA ANINA göre hesaplanıyor; fikstür eskidikçe sayılar kaymasın.
*/
const GUN_ONCE = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

/*
  GÖRÜNTÜLENME KAYDI — modül düzeyinde ki kimliği sabit kalsın (çekmece
  efekti ona bağlı; her çizimde yeni işlev olsaydı kayıt tekrar
  tekrar düşerdi). Üretimde yerinde gerçek RPC var.
*/
function fikstürGoruntulenmeKaydi(id: string) {
  const w = window as unknown as { __goruntulenmeler?: string[] };
  (w.__goruntulenmeler ??= []).push(id);
}

const ORNEK_BASVURULAR = [
  {
    id: 'test-1',
    updated_at: GUN_ONCE(2),
    atanan_uye: 'u-1',
    status: 'submitted',
    applied_at: '2026-08-20T09:00:00Z',
    match_score: 88,
    listing_id: 'ilan-1',
    ilanBasligi: 'Yazılım Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-20T09:00:00Z',
    /*
      Gerçek veri yapısı: rıza damgası + sürümü. Eski sürüm (2026-09-v2)
      ama StajımVar üzerinden alınmış başvuru — sade kurala göre iletişim
      AÇIK. "Öğrenci paylaşımı kapatsın" kolu bu satırı kapatıyor.
    */
    contact_share_consent_version: '2026-09-v2',
    /* Paylaşım izni VAR: inceleme ekranında ızgara ve görüntüleyici. */
    paylasim_izni_at: '2026-08-20T09:00:00Z',
    cover_letter: 'Bu bir test ön yazısıdır.',
    profile_snapshot: ADAY_A_KOPYASI,
  },
  {
    /* Aynı öğrenci, BAŞKA ilan, uzun başlık; bu başvuruda paylaşım izni YOK. */
    id: 'test-10',
    updated_at: GUN_ONCE(20),
    atanan_uye: null,
    status: 'under_review',
    applied_at: '2026-09-02T09:00:00Z',
    match_score: 72,
    listing_id: 'ilan-3',
    ilanBasligi:
      'Yazılım Geliştirme ve Veri Analitiği Yaz Dönemi Uzun Süreli Stajyer Programı (Hibrit, İstanbul ofisi, haftada üç gün)',
    application_method: 'internal',
    contact_share_consent_at: '2026-09-02T09:00:00Z',
    cover_letter: 'Veri tarafındaki ilana da başvuruyorum; ön yazı ilk başvurudan farklı.',
    profile_snapshot: ADAY_A_KOPYASI,
  },
  {
    id: 'test-2',
    updated_at: GUN_ONCE(2),
    atanan_uye: 'u-2',
    status: 'under_review',
    applied_at: '2026-08-18T09:00:00Z',
    match_score: 61,
    listing_id: 'ilan-1',
    ilanBasligi: 'Yazılım Stajyeri',
    application_method: 'internal',
    /*
      ONAYSIZ başvuru: öğrenci iletişim paylaşımını seçmedi. Sade kurala
      göre şirket telefon/e-posta GÖRMÜYOR; ekran nedenini yazıyor.
    */
    contact_share_consent_at: null,
    contact_share_consent_version: null,
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
    updated_at: GUN_ONCE(20),
    atanan_uye: 'u-1',
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
    updated_at: GUN_ONCE(2),
    atanan_uye: null,
    status: 'submitted',
    applied_at: '2026-08-31T08:00:00Z',
    match_score: 0,
    listing_id: 'ilan-2',
    ilanBasligi: 'IT Stajyeri',
    application_method: 'internal',
    contact_share_consent_at: '2026-08-31T08:00:00Z',
    cv_path: null,
    cv_snapshot_path: '00000000-0000-4000-8000-00000000000c/basvurular/ornek.pdf',
    /* İzin var ama sosyal profil gizli: "şu an gizli" cümlesi. */
    paylasim_izni_at: '2026-08-31T08:00:00Z',
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
    updated_at: GUN_ONCE(20),
    atanan_uye: 'u-2',
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
    updated_at: GUN_ONCE(2),
    atanan_uye: 'u-1',
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
    updated_at: GUN_ONCE(20),
    atanan_uye: null,
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
    updated_at: GUN_ONCE(2),
    atanan_uye: 'u-2',
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
    /* İzin var, profil açık, gönderi yok: tarafsız boş cümle. */
    paylasim_izni_at: '2026-08-24T08:00:00Z',
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
    updated_at: GUN_ONCE(20),
    atanan_uye: 'u-1',
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

/*
  İNCELEME EKRANININ İKİ OKUMASI — FİKSTÜR KARŞILIĞI

  Gerçekte `basvuru_aday_guncel_profili` ve `basvuru_aday_paylasimlari`
  RPC'leri (20261121010000). Fikstürde oturum yok; aynı biçimde yerel
  veri dönüyor. Adlar ve içerik bilerek örnek: "Aday A", ornek.test.

    test-1   güncel profil DEĞİŞMİŞ (sınıf, şehir, yetenek, dil seviyesi,
             rozet, proje) · paylaşım izni VAR, 14 gönderi
    test-10  aynı öğrenci, başka ilan · paylaşım izni YOK
    test-4   izin var, sosyal profil GİZLİ
    test-6   izin var, profil açık, gönderi YOK
    test-5   iki okuma da HATA veriyor
    öteki    güncel profil kopyayla aynı · izin yok
*/
const GUNCEL_DEGISIMLERI: Record<string, Record<string, unknown>> = {
  'test-1': {
    sinif: '4. Sınıf',
    sehir: 'Ankara',
    linkedin: 'https://www.linkedin.com/in/ornek-aday-2026',
    yetenekler: ['React', 'TypeScript', 'Python', 'Figma'],
    diller: ['İngilizce (B2)', 'Almanca (A1)'],
    rozetler: ['quiz-react', 'quiz-sql'],
    projeler: [
      { baslik: 'Örnek proje', aciklama: 'Test açıklaması, sonradan genişletildi.', adres: 'https://ornek.test/proje' },
      { baslik: 'Yeni örnek proje', aciklama: 'Başvurudan sonra eklenen proje.', adres: null },
    ],
  },
};

const fikstürGuncelProfil = (id: string) =>
  new Promise<{ riza: boolean; guncel: AdayGuncelProfili | null }>((coz, red) => {
    window.setTimeout(() => {
      if (id === 'test-5') {
        red(new Error('Fikstür: güncel profil okuma hatası.'));
        return;
      }
      const satir = ORNEK_BASVURULAR.find((s) => s.id === id);
      const kopya = (satir?.profile_snapshot ?? null) as Record<string, any> | null;
      if (!satir?.contact_share_consent_at || !kopya) {
        coz({ riza: false, guncel: null });
        return;
      }
      coz({
        riza: true,
        guncel: {
          ad: kopya.ad ?? null,
          fotoUrl: null,
          universite: kopya.universite ?? null,
          bolum: kopya.bolum ?? null,
          sinif: kopya.sinif ?? null,
          sehir: kopya.sehir ?? null,
          github: kopya.github ?? null,
          portfolyo: kopya.portfolyo ?? null,
          linkedin: kopya.linkedin ?? null,
          rozetler: Array.isArray(kopya.rozetler) ? kopya.rozetler : [],
          yetenekler: Array.isArray(kopya.yetenekler) ? kopya.yetenekler.filter((y: unknown) => typeof y === 'string') : [],
          diller: Array.isArray(kopya.diller) ? kopya.diller.filter((d: unknown) => typeof d === 'string' && !/undefined/.test(d)) : [],
          projeler: Array.isArray(kopya.projeler) ? kopya.projeler.filter((p: any) => p?.baslik) : [],
          guncellendi: '2026-09-28T10:00:00Z',
          /* Güncel profil ÖĞRENCİNİN: test-10 aynı öğrencinin ikinci başvurusu, aynı güncel hâl. */
          ...GUNCEL_DEGISIMLERI[id === 'test-10' ? 'test-1' : id],
        } as AdayGuncelProfili,
      });
    }, 300);
  });

/*
  Yerel örnek görseller: StajımVar'ın kendi Instagram kartları (depodaki
  public/paylasim). Kartlarda kişi görüntüleri var; bunlar StajımVar'ın
  kendi yayın görselleri, herhangi bir adayın fotoğrafı değil.
*/
const ORNEK_KLASORLER = [
  '2026-09-15-1230-cv-guclu-madde',
  '2026-09-15-2030-ilan-okuma',
  '2026-09-16-1230-star-cevabi',
  '2026-09-16-2030-basvuru-takibi',
  '2026-09-17-1230-ilk-gun-hazirligi',
  '2026-09-17-2030-yardim-isteme',
  '2026-09-18-1230-linkedin-profil',
  '2026-09-18-2030-haftalik-staj-gunlugu',
  '2026-09-19-1230-portfoy-kaniti',
  '2026-09-19-2030-ret-sonrasi',
];

const ORNEK_PAYLASIMLAR: AdayPaylasimi[] = Array.from({ length: 14 }, (_, i) => {
  const klasor = ORNEK_KLASORLER[i % ORNEK_KLASORLER.length];
  /* 0: üç görselli · 3: görselsiz · 5: görseli inmeyen · 1: uzun açıklama */
  const medyaSayisi = i === 0 ? 3 : i === 3 ? 0 : 1;
  return {
    id: `paylasim-${i + 1}`,
    aciklama:
      i === 1
        ? 'Uzun bir örnek açıklama: dönem projesinde veri temizleme adımlarını, kullandığım araçları ve karşılaştığım sorunları anlattığım bir paylaşım. Metin üç satırda kesilmeli, büyük görünümde tam okunmalı.'
        : i === 4
          ? null
          : `Örnek paylaşım ${i + 1}`,
    tarih: `2026-09-${String(28 - i).padStart(2, '0')}T10:00:00Z`,
    medya: Array.from({ length: medyaSayisi }, (_, j) => ({
      yol: i === 5 ? `fikstur/inmeyen/${i}.jpg` : `fikstur/${klasor}/0${j + 1}-v1.jpg`,
      genislik: 1080,
      yukseklik: 1350,
      alt: j === 0 ? `Örnek görsel ${i + 1}` : null,
    })),
  };
});

const fikstürPaylasimlari = (id: string) =>
  new Promise<PaylasimSonucu>((coz, red) => {
    window.setTimeout(() => {
      if (id === 'test-5') {
        red(new Error('Fikstür: paylaşım okuma hatası.'));
        return;
      }
      const izinli = ORNEK_BASVURULAR.find((s) => s.id === id && 'paylasim_izni_at' in s && s.paylasim_izni_at);
      if (!izinli) {
        coz({ izin: false, izinTarihi: null, profilGorunur: false, kullaniciAdi: null, paylasimlar: [] });
        return;
      }
      const izinTarihi = String((izinli as { paylasim_izni_at?: string }).paylasim_izni_at);
      if (id === 'test-4') {
        coz({ izin: true, izinTarihi, profilGorunur: false, kullaniciAdi: null, paylasimlar: [] });
        return;
      }
      coz({
        izin: true,
        izinTarihi,
        profilGorunur: true,
        kullaniciAdi: 'ornek-aday',
        paylasimlar: id === 'test-1' ? ORNEK_PAYLASIMLAR : [],
      });
    }, 300);
  });

/* `fikstur/<klasör>/<dosya>` → public/paylasim altındaki dosya; "inmeyen" eşleşmiyor. */
const fikstürGorselAdresi = (yol: string) => {
  const m = yol.match(/^fikstur\/(\d{4}-[^/]+)\/([^/]+\.jpg)$/);
  return m ? `/paylasim/${m[1]}/${m[2]}` : null;
};

/** Fikstür boyunca aynı şirket bağlamı — üç ekranda tekrar yazılmasın. */
const FIKSTUR_EKIBI = [
  { uyeId: 'u-1', ad: 'Deniz Yıldız', rol: 'Owner' as EkipRolu, yazabilir: true },
  { uyeId: 'u-2', ad: 'Eren Kaya', rol: 'Recruiter' as EkipRolu, yazabilir: true },
  /* Viewer listede var ama `yazabilir: false` — atama kutusuna girmiyor. */
  { uyeId: 'u-3', ad: 'Selin Ak', rol: 'Viewer' as EkipRolu, yazabilir: false },
];

const FIKSTUR_OLCUTLER = [
  { id: 'o-1', ad: 'Teknik yeterlilik', sira: 1 },
  { id: 'o-2', ad: 'İletişim', sira: 2 },
  { id: 'o-3', ad: 'Öğrenmeye açıklık', sira: 3 },
];

const FIKSTUR_IS_YUKU = [
  { uyeId: null, ad: 'Sorumlusu yok', acik: 4 },
  { uyeId: 'u-1', ad: 'Deniz Yıldız', acik: 3 },
  { uyeId: 'u-2', ad: 'Eren Kaya', acik: 1 },
];

const TEST_BAGLAMI = (kademe: number, rol: EkipRolu = 'Owner') => ({
  companyId: 'test',
  ad: 'Örnek Teknoloji A.Ş.',
  slug: 'ornek',
  /* İlan kartındaki logo görülebilsin diye depodaki gerçek bir dosya;
     logosuz hâli `CompanyLogo`nun baş harf dalı, o da kendi yerinde. */
  logoUrl: '/isveren-logolari/abdi-ibrahim.png',
  siteUrl: 'https://ornek.com',
  hrEmail: 'ik@ornek.com',
  vkn: null,
  dogrulandi: kademe === KADEME.DOGRULANMIS,
  dogrulamaNotu: null,
  dogrulamaReddiAt: null,
  kademe,
  rol,
  /* Sunucudaki `sirket_basvuru_yazabilir` ile aynı kural. */
  basvuruYazabilir: rol === 'Owner' || rol === 'Recruiter',
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
const YENI_BASVURU = (
  id: string,
  ilanNo: number,
  ad: string,
  status = 'submitted',
  /*
    SORUMLU: fikstürde bilerek BAZI başvurularda dolu, bazılarında boş.
    Hepsi boş olsaydı "sorumlusu olmayanlar" süzgeci hiçbir şeyi
    süzmez ve çalıştığı görülemezdi; hepsi dolu olsaydı tersi.
  */
  atanan: string | null = null,
) => ({
  id,
  status,
  atanan_uye: atanan,
  atanan_at: atanan ? '2026-10-05T08:00:00Z' : null,
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
  /* İlk ikisinin sorumlusu var, üçüncüsü boşta. */
  YENI_BASVURU(`tek-${n}`, 1, `Aday ${HARFLER[n - 1]}`, 'submitted', n <= 2 ? 'u-1' : null),
);
const ALTI_ILAN_BASVURULARI = [
  ...TEK_ILAN_BASVURULARI,
  YENI_BASVURU('iki-1', 2, 'Aday D', 'under_review'),
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => YENI_BASVURU(`uc-${n}`, 3, `Aday ${HARFLER[n + 3]}`, 'rejected')),
  /*
    Sorumlu dağılımı bilerek KARIŞIK: üçte biri Deniz'de, üçte biri
    Eren'de, üçte biri boşta. Hepsi aynı olsaydı ne "sorumlusu olmayanlar"
    süzgeci ne de iş yükü farkı ekranda görülebilirdi.
  */
  ...Array.from({ length: 12 }, (_, i) =>
    YENI_BASVURU(
      `dort-${i + 1}`,
      4,
      `Aday ${HARFLER[i % HARFLER.length]}${i + 1}`,
      'submitted',
      i % 3 === 0 ? 'u-1' : i % 3 === 1 ? 'u-2' : null,
    ),
  ),
];

/*
  OTOMATİK KONTROL SENARYOSU (20261120010000)

  Şirket kartının beş durumu (yayında, taslak, düzeltme, inceleme,
  kontrol ediliyor) ve kapalı ilanın iki hâli (temiz / yeniden açılamadı)
  yan yana. Gerekçe metinleri göçteki kural mesajlarının AYNISI
  (ilan_kontrol_kurallari, ilan_sirkete_gorunen_gerekceler); uzun http
  adresi 375 px'te taşma ölçmek için bilerek uzun.

  "Yayına gönder" sonucu bir kolla seçiliyor (dev-yayin-sonucu): sunucu
  yok, sonucu fikstür veriyor — amaç dört sonuç ekranını ve kart
  rozetlerini tarayıcıda ölçmek.
*/
const ACIKLAMA_ORNEGI =
  'Ekibimizle birlikte günlük işlerde yer alacak, raporların hazırlanmasına destek olacak ve ' +
  'süreçlerimizi yakından öğreneceksin. Excel ve temel ofis programlarını kullanabilmen, ' +
  'öğrenmeye açık olman ve haftada en az üç gün ofiste bulunabilmen bekleniyor.';

const DUZELTME_GEREKCELERI = [
  {
    alan: 'description',
    kural: 'zorunlu.aciklama',
    mesaj: 'İş tanımı en az 200 karakter olmalı (şu an 142).',
  },
  {
    alan: 'application_deadline',
    kural: 'tarih.gecmis',
    mesaj: 'Son başvuru tarihi (01.09.2026) geçmiş. Bugün ya da sonrası bir tarih seç ya da alanı boş bırak.',
  },
  {
    alan: 'description',
    kural: 'baglanti.https',
    mesaj:
      'Bu bağlantı güvenli değil (http). https:// ile yaz ya da kaldır: http://ornek.test/kariyer/basvuru-formu/staj-2026-donemi-uzun-adres',
  },
  {
    alan: 'title',
    kural: 'tekrar',
    mesaj:
      'Bu ilan zaten yayında: "Yazılım Stajyeri". Aynı pozisyon için yeni ilan açmak yerine mevcut ilanı düzenle; farklı bir pozisyonsa başlıkta ya da şehirde farkı belirt.',
  },
];
const INCELEME_GEREKCELERI = [
  {
    alan: null,
    kural: 'inceleme',
    mesaj: 'İlanın ekibimizin incelemesine gönderildi. Karar verildiğinde bu sayfada görünecek.',
  },
];
const YONETICI_NOTU = 'Ücret bilgisi eksik; net ya da brüt aylık tutar yazılmalı.';

const KONTROL_ILANI = (n: number, alanlar: Record<string, unknown>) =>
  ILAN(n, {
    term: 'Summer 2026',
    duration: '20 iş günü',
    is_paid: true,
    stipend_text: 'Asgari staj ücreti',
    work_type: 'On-site',
    description: ACIKLAMA_ORNEGI,
    kontrol_gerekceleri: [],
    ...alanlar,
  });

const KONTROL_ILANLARI: Record<string, unknown>[] = [
  KONTROL_ILANI(1, {
    title: 'Yazılım Stajyeri',
    city: 'İstanbul',
    status: 'published',
    kontrol_durumu: 'gecti',
    applicants_count: 3,
  }),
  KONTROL_ILANI(2, { title: 'Satış Stajyeri', city: 'Ankara', status: 'draft', kontrol_durumu: null }),
  KONTROL_ILANI(3, {
    title: 'Muhasebe Stajyeri',
    city: 'İzmir',
    status: 'draft',
    kontrol_durumu: 'duzeltme',
    application_deadline: '2026-09-01',
    kontrol_gerekceleri: DUZELTME_GEREKCELERI,
  }),
  KONTROL_ILANI(4, {
    title: 'Pazarlama Stajyeri',
    city: 'Bursa',
    status: 'draft',
    kontrol_durumu: 'inceleme',
    kontrol_gerekceleri: INCELEME_GEREKCELERI,
  }),
  KONTROL_ILANI(5, { title: 'Veri Analisti Stajyeri', city: 'Uzaktan', status: 'draft', kontrol_durumu: 'bekliyor' }),
  KONTROL_ILANI(6, {
    title: 'Grafik Tasarım Stajyeri',
    city: 'İstanbul',
    status: 'closed',
    kontrol_durumu: 'duzeltme',
    application_deadline: '2026-09-01',
    applicants_count: 2,
    kontrol_gerekceleri: [DUZELTME_GEREKCELERI[1]],
  }),
  KONTROL_ILANI(7, { title: 'İnsan Kaynakları Stajyeri', city: 'Ankara', status: 'closed', kontrol_durumu: 'gecti' }),
  KONTROL_ILANI(8, {
    title: 'Finans Stajyeri',
    city: 'İstanbul',
    status: 'draft',
    kontrol_durumu: 'duzeltme',
    review_note: YONETICI_NOTU,
    kontrol_gerekceleri: [{ alan: null, kural: 'yonetici', mesaj: YONETICI_NOTU }],
  }),
  /*
    YAYINDA + BEKLEYEN DEĞİŞİKLİK: canlı satır son onaylı sürüm; şirketin
    kaydettiği yeni metin `bekleyen.icerik`te ve kontrolden geçemedi.
    PostgREST gömmesi dizi olarak geliyor (bekleyenOku ikisini de okuyor).
  */
  KONTROL_ILANI(9, {
    title: 'Kurumsal İletişim Stajyeri',
    city: 'İstanbul',
    status: 'published',
    kontrol_durumu: 'gecti',
    applicants_count: 1,
    bekleyen: [
      {
        durum: 'duzeltme',
        kontrol_at: '2026-10-04T09:10:00Z',
        gerekceler: [DUZELTME_GEREKCELERI[2]],
        icerik: {
          title: 'Kurumsal İletişim Stajyeri',
          city: 'İstanbul',
          work_type: 'Hybrid',
          term: 'Summer 2026',
          duration: '30 iş günü',
          is_paid: true,
          stipend_text: 'Asgari staj ücreti',
          description:
            ACIKLAMA_ORNEGI +
            ' Ayrıntılı bilgi: http://ornek.test/kariyer/basvuru-formu/staj-2026-donemi-uzun-adres',
        },
      },
    ],
  }),
  /* YÖNETİCİNİN KALDIRDIĞI İLAN: gerekçe şirkete "düzeltme" olarak görünüyor. */
  KONTROL_ILANI(0, {
    title: 'Saha Pazarlama Stajyeri',
    city: 'Bursa',
    status: 'draft',
    kontrol_durumu: 'duzeltme',
    kontrol_gerekceleri: [
      {
        alan: null,
        kural: 'yonetici.kaldirdi',
        mesaj: 'İlan ekibimiz tarafından yayından kaldırıldı: İlan metninde adaydan kayıt ücreti isteniyor; bu kabul edilmiyor.',
      },
    ],
  }),
];

type YayinSonucu = Exclude<IlanKontrolDurumu, 'taslak'> | 'hata';

/* Sunucunun "Yayına gönder" sonrası satıra yazdığı alanlar (ilan_kontrolu_uygula). */
const SONUC_SATIRI: Record<Exclude<YayinSonucu, 'hata'>, Record<string, unknown>> = {
  yayinda: { status: 'published', kontrol_durumu: 'gecti', kontrol_gerekceleri: [] },
  duzeltme_gerekiyor: { kontrol_durumu: 'duzeltme', kontrol_gerekceleri: DUZELTME_GEREKCELERI },
  inceleme_gerekiyor: { kontrol_durumu: 'inceleme', kontrol_gerekceleri: INCELEME_GEREKCELERI },
  kontrol_ediliyor: { kontrol_durumu: 'bekliyor', kontrol_gerekceleri: [] },
};

/* Yayındaki ilanın değişikliği kontrolden geçmezse yazılan bekleyen satır. */
const BEKLEYEN_SONUCU: Record<Exclude<YayinSonucu, 'hata' | 'yayinda'>, Record<string, unknown>> = {
  duzeltme_gerekiyor: { durum: 'duzeltme', gerekceler: DUZELTME_GEREKCELERI, kontrol_at: '2026-10-04T09:00:00Z' },
  inceleme_gerekiyor: { durum: 'inceleme', gerekceler: INCELEME_GEREKCELERI, kontrol_at: '2026-10-04T09:00:00Z' },
  kontrol_ediliyor: { durum: 'bekliyor', gerekceler: [], kontrol_at: '2026-10-04T09:00:00Z' },
};

type Senaryo = 'sifir' | 'bir' | 'alti' | 'kontrol';

export const SirketPanelDevFixture: React.FC = () => {
  const [kademe, setKademe] = React.useState<number>(KADEME.DOGRULANMIS);
  /*
    EKİP ROLÜ KOLU (5 Ekim 2026)

    `recruiter_role` üretimde bugün yalnız 'Owner' değerini taşıyor
    (ölçüldü: 2 üye, ikisi de Owner). Viewer'ın salt okunur davranışını
    gerçek ekip verisi uydurmadan görmenin tek yolu bu kol.
  */
  const [rol, setRol] = React.useState<EkipRolu>('Owner');
  /*
    ADRES YEREL DURUMDA

    Header, alt menü ve sekme içerikleri hep aynı `onNavigate`i alıyor;
    gerçek uygulamada App.navigate'in yaptığı şey. Sorgu dizesi
    (?ilan=…) atılıyor: fikstürde window.location değişmiyor.
  */
  const [yol, setYol] = React.useState('/sirket/ilanlar');
  const git = React.useCallback((y: string) => {
    setYol(y.split('?')[0] || '/sirket/ilanlar');
    window.scrollTo(0, 0);
  }, []);
  const [senaryo, setSenaryo] = React.useState<Senaryo>('alti');
  const [profilEksik, setProfilEksik] = React.useState(false);
  /*
    ŞİRKET KAYDI YOK SENARYOSU

    Üyeliği olmayan hesap Profil sekmesinde sonsuz iskelet görüyordu; bu
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
  /*
    `dev-cekmece-hata=1`: test-1'in kopyasına BOZUK bir proje açıklaması
    (nesne) konuyor. Çekmece onu çizerken hata veriyor ve hata sınırı
    devreye giriyor — "ayrıntı yüklenemedi" hâli. Kart oluşturucu
    proje BAŞLIĞINI süzüyor ama açıklamayı süzmüyor; bozulma oradan.
  */
  const [satirlar, setSatirlar] = React.useState(() =>
    new URLSearchParams(window.location.search).get('dev-cekmece-hata') === '1'
      ? (ORNEK_BASVURULAR.map((r) =>
          r.id === 'test-1'
            ? {
                ...r,
                profile_snapshot: {
                  ...(r.profile_snapshot as Record<string, unknown>),
                  projeler: [{ baslik: 'Bozuk kayıt', aciklama: { bozuk: true } }],
                },
              }
            : r,
        ) as typeof ORNEK_BASVURULAR)
      : ORNEK_BASVURULAR,
  );
  const kartlar = React.useMemo(
    () => satirlar.map((s) => kartVerisi(s, { yetenekler: [] })),
    [satirlar]
  );

  /*
    KONTROL SENARYOSUNUN SATIRLARI YEREL DURUMDA — ref ile aynalı: formun
    "kaydettikten sonra yeniden oku" adımı aynı tıklamanın içinde en son
    satırı görmeli; durum kapanışı eski değeri verirdi.
  */
  const [kontrolIlanlari, setKontrolIlanlariDurumu] = React.useState(KONTROL_ILANLARI);
  const kontrolRef = React.useRef(KONTROL_ILANLARI);
  const setKontrolIlanlari = (f: (o: Record<string, unknown>[]) => Record<string, unknown>[]) => {
    kontrolRef.current = f(kontrolRef.current);
    setKontrolIlanlariDurumu(kontrolRef.current);
  };
  const [yayinSonucu, setYayinSonucu] = React.useState<YayinSonucu>('yayinda');
  const satiriGuncelle = (id: string, alanlar: Record<string, unknown>) =>
    setKontrolIlanlari((o) => o.map((i) => (i.id === id ? { ...i, ...alanlar } : i)));

  const sahteGonder = (id: string) =>
    new Promise<IlanKontrolSonucu>((coz, red) => {
      window.setTimeout(() => {
        if (yayinSonucu === 'hata') {
          red(new Error('İlan gönderilemedi. Bağlantını kontrol edip yeniden dene.'));
          return;
        }
        const eski = kontrolRef.current.find((i) => i.id === id);
        /* Yayındaki ilan: sunucu BEKLEYEN değişikliği kontrol ediyor. */
        if (eski?.status === 'published') {
          const bekleyenIcerik = (Array.isArray(eski.bekleyen) ? eski.bekleyen[0] : eski.bekleyen) as
            | { icerik?: Record<string, unknown> }
            | undefined;
          if (yayinSonucu === 'yayinda') {
            satiriGuncelle(id, { ...(bekleyenIcerik?.icerik ?? {}), bekleyen: null });
            coz({ id, durum: 'yayinda', gerekceler: [], kontrolZamani: null, kuralSurumu: null, degisiklik: null });
            return;
          }
          const d = BEKLEYEN_SONUCU[yayinSonucu];
          satiriGuncelle(id, { bekleyen: [{ ...d, icerik: bekleyenIcerik?.icerik ?? {} }] });
          coz({
            id,
            durum: 'yayinda',
            gerekceler: [],
            kontrolZamani: null,
            kuralSurumu: null,
            degisiklik: {
              durum: yayinSonucu,
              gerekceler: d.gerekceler as IlanKontrolSonucu['gerekceler'],
              kontrolZamani: '2026-10-04T09:00:00Z',
            },
          });
          return;
        }
        satiriGuncelle(id, { ...SONUC_SATIRI[yayinSonucu], kontrol_at: '2026-10-04T09:00:00Z' });
        coz({
          id,
          durum: yayinSonucu,
          gerekceler: SONUC_SATIRI[yayinSonucu].kontrol_gerekceleri as IlanKontrolSonucu['gerekceler'],
          kontrolZamani: '2026-10-04T09:00:00Z',
          kuralSurumu: 'ilan-kontrol-1 (2026-10-04)',
          degisiklik: null,
        });
      }, 700);
    });

  const ilanlar =
    senaryo === 'sifir'
      ? []
      : senaryo === 'bir'
        ? TEK_ILAN
        : senaryo === 'kontrol'
          ? kontrolIlanlari
          : ALTI_ILAN;
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

  const baglam = sirketYok
    ? { ...TEST_BAGLAMI(kademe, rol), companyId: null, ad: '', slug: '' }
    : TEST_BAGLAMI(kademe, rol);
  const profil = profilEksik ? PROFIL_EKSIK : PROFIL_TAM;
  const ekran = sirketEkrani(yol);

  const kolSinifi = 'min-h-8 rounded-lg border border-gray-300 px-2 py-1 font-bold';

  /*
    Sekme içeriği. Başvuranlar görünümünde adaylar ORNEK_BASVURULAR'dan
    (durum akışı denenebilsin); İlanlar görünümündeki avatar şeritleri
    senaryo başvurularından. İki liste bilerek ayrı: biri akışı, öteki
    ölçeklenmeyi ölçüyor.
  */
  const icerik =
    yol === '/yonetim/onay' ? (
      <OnaySayfasi kuyrukGetir={ornekKuyrukGetir} />
    ) : yol === '/agim' ? (
      <SirketAgimBos />
    ) : yol === '/rehber' ? (
      <GuideHub onBack={() => git('/sirket/ilanlar')} onNavigate={git} sirketHesabi />
    ) : ekran.tur === 'form' ? (
      <IlanFormu
        kademe={kademe}
        sirketAdi="Örnek Teknoloji A.Ş."
        siteUrl="https://ornek.com"
        eposta={kademe === KADEME.DOGRULANMIS ? 'ik@gmail.com' : 'ik@ornek.com'}
        key={yol}
        duzenlenenId={ekran.duzenlenenId}
        /*
          Kayıt fikstür satırına yazılıyor. Yayındaki ilanın içeriği
          değişince sunucu tetikleyicisi aynı istekte kontrol ediyor;
          fikstür seçili sonucu uyguluyor (geçmezse önceki hâl yayında kalıyor).
          Gönderilmiş taslağın içeriği değişince eski karar siliniyor.
        */
        onKaydet={(satir, { id }) =>
          new Promise((coz) => {
            window.setTimeout(() => {
              const { status: _s, posted_at: _p, company_id: _c, ...alanlar } = satir;
              if (!id) {
                const yeniId = 'f0000000-0000-4000-8000-000000000001';
                setKontrolIlanlari((o) => [
                  ...o.filter((i) => i.id !== yeniId),
                  {
                    ...alanlar,
                    id: yeniId,
                    status: 'draft',
                    kontrol_durumu: null,
                    kontrol_gerekceleri: [],
                    origin: 'employer_posted',
                  },
                ]);
                coz({ id: yeniId });
                return;
              }
              const eski = kontrolRef.current.find((i) => i.id === id);
              if (eski?.status === 'published') {
                /*
                  YAYINDAKİ İLAN DÜZENLENİNCE (sunucu tetikleyicisi): geçerse
                  yeni içerik yayında; geçmezse canlı satır ESKİ içerikte kalıyor,
                  yeni içerik bekleyen değişiklik olarak yazılıyor. İlan taslağa
                  çekilmiyor.
                */
                const sonuc = yayinSonucu === 'hata' ? 'kontrol_ediliyor' : yayinSonucu;
                if (sonuc === 'yayinda') satiriGuncelle(id, { ...alanlar, bekleyen: null });
                else satiriGuncelle(id, { bekleyen: [{ ...BEKLEYEN_SONUCU[sonuc], icerik: alanlar }] });
              } else {
                satiriGuncelle(id, { ...alanlar, kontrol_durumu: null, kontrol_gerekceleri: [] });
              }
              coz({ id });
            }, 500);
          })
        }
        onYayinaGonder={sahteGonder}
        ilanOkuyucu={(id) =>
          new Promise((coz, red) => {
            window.setTimeout(() => {
              const satir = kontrolRef.current.find((i) => i.id === id);
              if (satir) coz({ ...satir });
              else red(new Error('İlan okunamadı.'));
            }, 250);
          })
        }
        onIptal={() => git('/sirket/ilanlar')}
      />
    ) : ekran.tur === 'profil' ? (
      /*
        Şirket profili: formun veri okuması Supabase'e gidiyor ve
        fixture'da oturum yok, o yüzden form kendi hata/boş hâlini
        çiziyor. Kimlik kartı fikstür profiliyle doluyor; amaç yerleşim,
        hiyerarşi ve tema sızıntısını görmek.
      */
      <SirketProfilSekmesi
        baglam={baglam}
        profil={profil}
        ilanSayisi={ilanlar.length}
        basvuruSayisi={ilanBasvurulari.length}
        userId="00000000-0000-4000-8000-000000000001"
        onKaydedildi={() => undefined}
        onNavigate={git}
        onCikis={() => undefined}
      />
    ) : (
      <SirketIlanlarSekmesi
        baglam={baglam}
        /*
          Aday profili (`/sirket/aday/<id>`) bu fikstürde denenmiyor:
          fikstür sekme içeriklerini sahte veriyle çiziyor, aday profili
          ise canlı RPC'ye bağlı. Sekme dışı bir değer gelirse İlanlar
          çiziliyor — fikstürün kendi kapsamı.
        */
        gorunum={ekran.tur === 'adayProfili' ? 'ilanlar' : ekran.tur}
        /*
          FİKSTÜR EKİBİ: üretimde bugün yalnız Owner var; Recruiter ve
          Viewer satırları atama kutusunun ve iş yükünün davranışını
          GERÇEK ekip verisi uydurmadan göstermek için. Üretime çıkmıyor.
        */
        ekip={FIKSTUR_EKIBI}
        isYuku={FIKSTUR_IS_YUKU}
        /*
          FİKSTÜR ÖLÇÜTLERİ: şirketin kendi tanımladığı ölçütler gerçek
          veride henüz yok (tablo bu pakette geliyor). Form ve geçmiş
          ekranının davranışını göstermek için; üretime çıkmıyor.
        */
        olcutler={FIKSTUR_OLCUTLER}
        onDagit={async () => {
          (window as unknown as Record<string, unknown>).__dagitimCagrildi = true;
        }}
        /*
          İLAN KAPANIŞI: SONUCU BEKLEYENLER

          Üretimde bu okuma canlı RPC'ye gidiyor ve fikstürde oturum
          yok; akış tarayıcıda hiç görülemiyordu. Burada iki senaryo da
          sınanabiliyor:

            dev-bekleyen-hata=1  → okuma HATA veriyor. Beklenen: ilan
                                   KAPANMIYOR, hata ve "Yeniden dene"
                                   çıkıyor.
            (varsayılan)         → iki bekleyen aday dönüyor, onay
                                   diyaloğu açılıyor.
            dev-bekleyen-yok=1   → boş liste; ilan doğrudan kapanıyor.

          Veri KURGU: aday adı taşımıyor, yalnız durum ve bekleme günü.
        */
        onBekleyenAdaylar={async () => {
          const s = new URLSearchParams(window.location.search);
          if (s.get('dev-bekleyen-hata') === '1') {
            throw new Error('Bekleyen adaylar okunamadı.');
          }
          if (s.get('dev-bekleyen-yok') === '1') return [];
          return [
            {
              basvuruId: 'f0000000-0000-4000-8000-000000000001',
              durum: 'submitted',
              beklemeGun: 41,
              atananUye: null,
            },
            {
              basvuruId: 'f0000000-0000-4000-8000-000000000002',
              durum: 'interview_scheduled',
              beklemeGun: 9,
              atananUye: null,
            },
          ];
        }}
        /*
          Fikstürde sunucu yok; çağrı KAYDEDİLİYOR ki hangi argümanlarla
          gittiği (özellikle eşzamanlılık için gereken `beklenen`)
          tarayıcıdan doğrulanabilsin. Üretime çıkmıyor.
        */
        onSorumlu={async (id, uyeId, beklenen) => {
          (window as unknown as Record<string, unknown>).__sonAtama = { id, uyeId, beklenen };
        }}
        ilanlar={ilanlar}
        basvurular={ekran.tur === 'basvuranlar' ? kartlar : ilanBasvurulari}
        profil={profil}
        onNavigate={git}
        onDurum={async (id, d) => {
          if (d === 'published') return sahteGonder(id);
          satiriGuncelle(id, { status: 'closed' });
        }}
        onKaldir={async () => undefined}
        onBasvuruDurumu={(id, d) => satirYaz(id, { status: d })}
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
          SUNUCU KURALININ AYNISI (basvuru_iletisimi, 20261201010000):
            doğrulanmış şirketin Owner/Recruiter üyesi  VE
            rıza damgası var  VE
            (StajımVar üzerinden başvuru  YA DA  sade sürümle verilmiş rıza)
          Teklif kabulü ARANMIYOR. Viewer'a satır DÖNMÜYOR.

          Satır her çağrıda GÜNCEL fikstür verisinden okunuyor: öğrenci
          paylaşımı kapatınca yeniden okuma boş dönüyor — sunucudaki
          davranış bu.

          Değerler KURGU (`@ornek.test`). Bir adayda kasten hata var:
          "yüklenemedi" hali de görülebilsin.
        */
        onIletisim={(id) =>
          new Promise((coz, red) => {
            window.setTimeout(() => {
              const satir = satirlar.find((x) => x.id === id) as Record<string, any> | undefined;
              if (id === hataliId) {
                red(new Error('Fikstür: iletişim okuma hatası.'));
                return;
              }
              const yazabilir = rol === 'Owner' || rol === 'Recruiter';
              const kapsiyor =
                Boolean(satir?.contact_share_consent_at) &&
                (satir?.application_method === 'internal' ||
                  satir?.contact_share_consent_version === PAYLASIM_SURUMU);
              if (!satir || !yazabilir || !kapsiyor) {
                coz(null);
                return;
              }
              coz({
                ad: String(satir.profile_snapshot?.ad ?? 'Aday'),
                eposta: `${satir.id}@ornek.test`,
                /* Ham biçim: ekranda okunur yazılıyor, kayıt değişmiyor. */
                telefon: '+905000000000',
                unvan: 'Aday',
              });
            }, 250);
          })
        }
        onGoruntulendi={fikstürGoruntulenmeKaydi}
        onNot={async () => undefined}
        onGuncelProfil={fikstürGuncelProfil}
        onPaylasimlar={fikstürPaylasimlari}
        yerelGorselAdresi={fikstürGorselAdresi}
        simdi={BUGUN}
      />
    );

  return (
    <SayfaAramaSaglayici>
      {/* Test kolları — gerçek uygulamada yok. */}
      <div
        id="dev-kollar"
        className="fixed bottom-24 left-2 z-[300] flex flex-wrap gap-2 rounded-xl bg-white p-2 text-xs shadow-lg lg:bottom-auto lg:top-24"
      >
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
        {/*
          EKİP ROLÜ KOLU: üretimde bugün yalnız Owner var (2 üye, ikisi
          de Owner — ölçüldü). Viewer'ın salt okunur davranışını gerçek
          ekip verisi uydurmadan görmenin tek yolu bu.
        */}
        {/*
          ÖĞRENCİ PAYLAŞIMI KOLU: test-1'in rızasını kapatıp açıyor.
          Gerçekte bunu yalnız öğrenci yapabiliyor (ogrenci_paylasimi_ac);
          burada şirket ekranının yeniden okumada ne gördüğünü göstermek
          için.
        */}
        <button
          type="button"
          id="dev-paylasim-kapat"
          onClick={() =>
            void satirYaz('test-1', { contact_share_consent_at: null, contact_share_consent_version: null })
          }
          className={kolSinifi}
        >
          Öğrenci paylaşımı kapat
        </button>
        <button
          type="button"
          id="dev-paylasim-ac"
          onClick={() =>
            void satirYaz('test-1', {
              contact_share_consent_at: new Date().toISOString(),
              contact_share_consent_version: PAYLASIM_SURUMU,
            })
          }
          className={kolSinifi}
        >
          Öğrenci paylaşımı aç
        </button>
        {(['Owner', 'Recruiter', 'Viewer'] as EkipRolu[]).map((r) => (
          <button
            key={r}
            type="button"
            id={`dev-rol-${r.toLowerCase()}`}
            onClick={() => setRol(r)}
            aria-pressed={rol === r}
            className={`${kolSinifi} ${rol === r ? 'bg-blue-600 text-white' : ''}`}
          >
            {r}
          </button>
        ))}
        <select
          id="dev-yol"
          value={yol}
          onChange={(e) => git(e.target.value)}
          aria-label="Adres"
          className={kolSinifi}
        >
          <option value="/sirket/ilanlar">/sirket/ilanlar</option>
          <option value="/sirket/basvuranlar">/sirket/basvuranlar</option>
          <option value="/sirket/ilan/yeni">/sirket/ilan/yeni</option>
          <option value="/agim">/agim</option>
          <option value="/rehber">/rehber</option>
          <option value="/sirket/profil">/sirket/profil</option>
          <option value="/yonetim/onay">/yonetim/onay (yönetici)</option>
        </select>
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
          <option value="kontrol">Kontrol durumları</option>
        </select>
        <select
          id="dev-yayin-sonucu"
          value={yayinSonucu}
          onChange={(e) => setYayinSonucu(e.target.value as YayinSonucu)}
          aria-label="Yayına gönder sonucu"
          className={kolSinifi}
        >
          <option value="yayinda">Sonuç: yayında</option>
          <option value="duzeltme_gerekiyor">Sonuç: düzeltme</option>
          <option value="inceleme_gerekiyor">Sonuç: inceleme</option>
          <option value="kontrol_ediliyor">Sonuç: kontrol ediliyor</option>
          <option value="hata">Sonuç: ağ hatası</option>
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

      {/*
        GERÇEK KABUK: App.icerikSayfasi'nın yaptığı şey — üst çubuk ve
        (Header'ın içinde) alt menü, altında ana alan. Sınıflar
        App.anaAlanSinifi ile aynı; iki yerde farklı olsaydı fikstür
        ölçtüğünü canlıda göstermezdi.
      */}
      <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
        <Header
          activeTab="internships"
          setActiveTab={() => undefined}
          activeSubTab="all"
          setActiveSubTab={() => undefined}
          userRole="company"
          setUserRole={() => undefined}
          activeStudent={null}
          isLoggedIn
          bulunulanYol={yol}
          onNavigate={git}
          onOpenGuides={() => git('/rehber')}
          onBildirimAc={() => undefined}
          okunmamisBildirim={null}
          sirketUyesiMi={!sirketYok}
          sirketAdi={sirketYok ? null : 'Örnek Teknoloji A.Ş.'}
          onLogout={() => undefined}
        />
        <main className={`flex-1 ${SAYFA_GENISLIGI} w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-0 sm:pt-3 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-8`}>
          {icerik}
        </main>
      </div>
    </SayfaAramaSaglayici>
  );
};
