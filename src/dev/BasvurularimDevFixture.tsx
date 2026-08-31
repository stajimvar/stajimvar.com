import React from 'react';
import { ApplicationsTrackerView } from '../components/ApplicationsTrackerView';
import type { ApplicationRecord, InternshipListing } from '../types';

/**
 * Öğrencinin "Başvurularım" ekranının bütün süreç durumları.
 *
 * NEDEN GEREKİYOR
 * ---------------
 * Bu ekran ancak giriş yapmış, gerçekten başvurusu olan bir öğrencide
 * görülüyor; yedi durumun hepsini aynı hesapta bulmak mümkün değil.
 * Ekranda uzun süre veriden gelmeyen sabit bir mülakat kutusu durdu
 * (bir davet, bir saat, bir toplantı bağlantısı vaadi) çünkü tarayıcıda
 * hiç bakılmıyordu.
 *
 * Fikstür gerçek bileşeni çiziyor, kopyasını değil. Üretim paketine
 * girmiyor.
 */

const ILANLAR: InternshipListing[] = [
  {
    id: 'ilan-1',
    title: 'Yazılım Geliştirme Stajyeri',
    companyName: 'Örnek Teknoloji',
    department: 'Mühendislik',
    city: 'İstanbul',
    /* Teklif ekranı bu üçünü İLANDAN okuyor; şirket tekrar yazmıyor. */
    workType: 'Hibrit',
    duration: '20 iş günü',
    stipend: { isPaid: true, amountText: 'Asgari staj ücreti' },
  },
  {
    id: 'ilan-2',
    title: 'Veri Analisti Stajyeri',
    companyName: 'Örnek Veri',
    department: 'Analitik',
    city: 'Ankara',
  },
].map((x) => x as unknown as InternshipListing);

const temel = {
  studentId: 'ogrenci-1',
  matchScore: 72,
  appliedAt: '2026-08-20T09:00:00Z',
};

/** Yedi durumun tamamı; ikisinde ek alan var, birinde hiç damga yok. */
const BASVURULAR: ApplicationRecord[] = [
  /* Damga YOK: durum hiç değişmedi, "güncelleme" satırı çıkmamalı. */
  { ...temel, id: 'b1', listingId: 'ilan-1', status: 'submitted' },
  {
    ...temel,
    id: 'b2',
    listingId: 'ilan-2',
    status: 'under_review',
    statusChangedAt: '2026-08-25T12:00:00Z',
  },
  {
    ...temel,
    id: 'b3',
    listingId: 'ilan-1',
    status: 'technical_assessment',
    statusChangedAt: '2026-08-26T12:00:00Z',
  },
  /* Mülakat, tarih GİRİLMİŞ. */
  {
    ...temel,
    id: 'b4',
    listingId: 'ilan-2',
    status: 'interview_scheduled',
    statusChangedAt: '2026-08-27T12:00:00Z',
    interviewDate: '2026-09-15',
  },
  /* Teklif BEKLİYOR: içerik dolu. */
  {
    ...temel,
    id: 'b9',
    listingId: 'ilan-1',
    status: 'offer_extended',
    statusChangedAt: '2026-08-29T09:00:00Z',
    offerNote: 'Ekibe eylül başında katılmanı öneriyoruz. Haftada üç gün ofis, iki gün uzaktan.',
    offerStartDate: '2026-10-01',
  },
  /* ESKİ TEKLİF: içerik alanları bu turda eklendi, geçmişte yok. */
  {
    ...temel,
    id: 'b10',
    listingId: 'ilan-2',
    status: 'offer_extended',
    statusChangedAt: '2026-08-29T10:00:00Z',
  },
  /* Mülakat, tarih HENÜZ YOK: uydurma tarih yazılmamalı. */
  {
    ...temel,
    id: 'b5',
    listingId: 'ilan-1',
    status: 'interview_scheduled',
    statusChangedAt: '2026-08-28T12:00:00Z',
  },
  /* KABUL EDİLMİŞ: iletişim açık. */
  {
    ...temel,
    id: 'b6',
    listingId: 'ilan-2',
    status: 'offer_accepted',
    statusChangedAt: '2026-08-29T12:00:00Z',
    offerNote: 'Başlangıç tarihini birlikte netleştiririz.',
  },
  /* ÖĞRENCİ REDDETTİ: şirketin olumsuz kararıyla karışmamalı. */
  {
    ...temel,
    id: 'b11',
    listingId: 'ilan-1',
    status: 'offer_declined',
    statusChangedAt: '2026-08-29T15:00:00Z',
  },
  {
    ...temel,
    id: 'b7',
    listingId: 'ilan-1',
    status: 'rejected',
    statusChangedAt: '2026-08-30T12:00:00Z',
  },
  {
    ...temel,
    id: 'b8',
    listingId: 'ilan-2',
    status: 'withdrawn',
    statusChangedAt: '2026-08-30T18:00:00Z',
  },
].map((x) => x as unknown as ApplicationRecord);

export const BasvurularimDevFixture: React.FC = () => {
  const [kayitlar, setKayitlar] = React.useState(BASVURULAR);
  const [altSekme, setAltSekme] = React.useState('all');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-3xl">
        <ApplicationsTrackerView
          applications={kayitlar}
          allListings={ILANLAR}
          subTab={altSekme}
          onSubTabChange={setAltSekme}
          onExploreInternships={() => undefined}
          /* Son kayıt her zaman hata veriyor: satır içi hata görülebilsin. */
          /*
            Gerçek kapı sunucuda (public.teklife_yanit_ver): yalnızca
            `offer_extended` durumundan karar verilebiliyor ve ikinci
            yanıt hata değil. Fikstür aynı davranışı taklit ediyor.
          */
          onRespondToOffer={(id, kabul) =>
            new Promise((coz, red) => {
              window.setTimeout(() => {
                if (id === 'b10') {
                  red(new Error('Fikstür: yanıt kaydı hatası taklit ediliyor.'));
                  return;
                }
                const durum = kabul ? 'offer_accepted' : 'offer_declined';
                setKayitlar((o) =>
                  o.map((a) =>
                    a.id === id
                      ? { ...a, status: durum as ApplicationRecord['status'], statusChangedAt: new Date().toISOString() }
                      : a,
                  ),
                );
                coz(durum);
              }, 250);
            })
          }
          onFetchContact={(id) =>
            new Promise((coz, red) => {
              window.setTimeout(() => {
                if (id === 'b11') {
                  red(new Error('Fikstür: iletişim okuma hatası.'));
                  return;
                }
                const a = kayitlar.find((x) => x.id === id);
                coz(
                  a && a.status === 'offer_accepted'
                    ? {
                        ad: 'Elif Yılmaz',
                        eposta: 'ik@ornekveri.com',
                        telefon: null,
                        unvan: 'İK Uzmanı',
                      }
                    : null,
                );
              }, 250);
            })
          }
          onWithdraw={(id) =>
            new Promise<void>((coz, red) => {
              window.setTimeout(() => {
                if (id === 'b5') {
                  red(new Error('Fikstür: geri çekme hatası taklit ediliyor.'));
                  return;
                }
                setKayitlar((o) =>
                  o.map((a) =>
                    a.id === id
                      ? { ...a, status: 'withdrawn', statusChangedAt: new Date().toISOString() }
                      : a,
                  ),
                );
                coz();
              }, 250);
            })
          }
        />
      </div>
    </div>
  );
};
