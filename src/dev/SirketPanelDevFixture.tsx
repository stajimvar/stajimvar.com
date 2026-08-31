import React from 'react';
import { SirketKabugu } from '../sirket/SirketKabugu';
import { Ilanlar } from '../sirket/SirketPaneli';
import { IlanFormu } from '../sirket/IlanFormu';
import { AdayIzgarasi } from '../sirket/AdayIzgarasi';
import { GenelBakis } from '../sirket/GenelBakis';
import { SirketProfilFormu } from '../sirket/SirketProfilFormu';
import { SIRKET_KENAR, SIRKET_METIN, SIRKET_ROZET, SIRKET_VURGU_KOYU } from '../sirket/renk';
import { KADEME } from '../lib/sirket-kademe.mjs';
import { kartVerisi } from '../lib/aday-kart.mjs';

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

export const SirketPanelDevFixture: React.FC = () => {
  const [kademe, setKademe] = React.useState<number>(KADEME.ILAN_VEREN);
  const [ekran, setEkran] = React.useState<'genel' | 'ilanlar' | 'form' | 'adaylar' | 'profil'>(
    'genel',
  );

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

  /* Son aday her zaman hata veriyor: satır içi hata mesajı görülebilsin. */
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

  return (
    <>
      {/* Test kolları — gerçek panelde yok. */}
      <div className="fixed left-2 top-20 z-[300] flex gap-2 rounded-xl bg-white p-2 text-xs shadow-lg">
        <button
          type="button"
          id="dev-kademe-1"
          onClick={() => setKademe(KADEME.ILAN_VEREN)}
          className="rounded-lg border px-2 py-1 font-bold"
        >
          Kademe 1
        </button>
        <button
          type="button"
          id="dev-kademe-2"
          onClick={() => setKademe(KADEME.DOGRULANMIS)}
          className="rounded-lg border px-2 py-1 font-bold"
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
          className="rounded-lg border px-2 py-1 font-bold"
        >
          Ekran
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
        onOgrenciyeDon={() => undefined}
        durumRozeti={
          <span
            className="rounded-lg border px-2 py-1 text-[11px] font-bold"
            style={{
              borderColor: kademe === KADEME.DOGRULANMIS ? SIRKET_VURGU_KOYU : SIRKET_KENAR,
              background: SIRKET_ROZET,
              color: SIRKET_VURGU_KOYU,
            }}
          >
            {kademe === KADEME.DOGRULANMIS ? 'Doğrulanmış kurum' : 'İlan açık · kartlar kapalı'}
          </span>
        }
      >
        {ekran === 'genel' ? (
          <GenelBakis
            baglam={{
              companyId: 'test',
              ad: 'Örnek Teknoloji A.Ş.',
              slug: 'ornek',
              siteUrl: 'https://ornek.com',
              hrEmail: 'ik@ornek.com',
              vkn: null,
              dogrulandi: kademe === KADEME.DOGRULANMIS,
              kademe,
            }}
            ilanlar={[
              { id: '1', title: 'Yazılım Stajyeri', status: 'published', application_deadline: '2026-09-05' },
              { id: '2', title: 'Pazarlama Stajyeri', status: 'draft' },
            ]}
            basvurular={kartlar}
            onNavigate={() => undefined}
          />
        ) : ekran === 'ilanlar' ? (
          /*
            İLANLAR EKRANI FİKSTÜRDE

            Bu ekran giriş arkasında olduğu için tarayıcıda hiç
            görülmeden değişiyordu. Üç durum birden çiziliyor: yayında
            (düzenle + kapat), taslak (düzenle + yayınla + sil), başvurusu
            olan kapalı ilan (sil değil arşivle) ve toplama hattından
            gelen ilan (düzenlenemez).
          */
          <Ilanlar
            baglam={TEST_BAGLAMI(kademe)}
            ilanlar={[
              {
                id: '2d7aa946-0000-4000-8000-000000000001',
                title: 'Yazılım Stajyeri',
                city: 'İstanbul',
                status: 'published',
                origin: 'employer_posted',
                application_method: 'internal',
                applicants_count: 4,
              },
              {
                id: '2d7aa946-0000-4000-8000-000000000002',
                title: 'Pazarlama Stajyeri',
                city: 'Ankara',
                status: 'draft',
                origin: 'employer_posted',
                application_method: 'internal',
                applicants_count: 0,
              },
              {
                id: '2d7aa946-0000-4000-8000-000000000003',
                title: 'Veri Analisti Stajyeri',
                city: 'İzmir',
                status: 'closed',
                origin: 'employer_posted',
                application_method: 'internal',
                applicants_count: 7,
              },
              {
                id: '2d7aa946-0000-4000-8000-000000000004',
                title: 'İnsan Kaynakları Stajyeri (kaynaktan)',
                city: 'İstanbul',
                status: 'published',
                origin: 'scraped',
                application_method: 'external',
                applicants_count: 0,
              },
            ]}
            basvuruSayisi={11}
            onNavigate={() => undefined}
            onDurum={async () => undefined}
            onKaldir={async () => undefined}
          />
        ) : ekran === 'profil' ? (
          /*
            Şirket profili: veri okuması Supabase'e gidiyor ve fixture'da
            oturum yok, o yüzden ekran boş değerlerle çiziliyor. Amaç
            yerleşim, hiyerarşi ve tema sızıntısını görmek.
          */
          <SirketProfilFormu
            baglam={{
              companyId: 'test',
              ad: 'Örnek Teknoloji A.Ş.',
              slug: 'ornek',
              siteUrl: 'https://ornek.com',
              hrEmail: 'ik@ornek.com',
              vkn: null,
              dogrulandi: kademe === KADEME.DOGRULANMIS,
              kademe,
            }}
            userId="00000000-0000-4000-8000-000000000001"
            onKaydedildi={() => undefined}
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
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: SIRKET_METIN }}>
              Başvuranlar
            </h1>
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
                            ad: 'Aday B',
                            eposta: 'aday.b@ornek.edu.tr',
                            telefon: null,
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
