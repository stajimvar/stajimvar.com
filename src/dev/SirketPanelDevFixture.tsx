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

  const kartlar = React.useMemo(
    () => ORNEK_BASVURULAR.map((s) => kartVerisi(s, { yetenekler: [] })),
    []
  );

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
              onDurum={async () => undefined}
              onNot={async () => undefined}
            />
          </div>
        )}
      </SirketKabugu>
    </>
  );
};
