import React from 'react';
import { ApplicationsTrackerView } from '../components/ApplicationsTrackerView';
import { ApplyDialog } from '../components/ApplyDialog';
import type { ApplicationRecord, InternshipListing } from '../types';
import { PAYLASIM_SURUMU } from '../lib/basvuru-durumu.mjs';

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
  /* StajımVar üzerinden: paylaşım izni anahtarı burada çiziliyor. */
  applicationMethod: 'internal',
  /*
    SADE AKIŞ: iletişim paylaşımı AÇIK başlıyor (öğrenci başvururken
    onay verdi) ve şirket henüz bakmadı — "Görüntülenme bilgisi yok"
    satırı böyle görülebiliyor.
  */
  contactShareConsentAt: '2026-08-20T09:00:00Z',
  contactShareConsentVersion: '2026-09-v2',
};

/** Yedi durumun tamamı; ikisinde ek alan var, birinde hiç damga yok. */
const BASVURULAR: ApplicationRecord[] = [
  /* Damga YOK: durum hiç değişmedi, "güncelleme" satırı çıkmamalı. */
  {
    /* Şirket BAKTI: "Şirket başvurunu görüntüledi" satırı burada. */
    ilkGoruntulenmeAt: '2026-08-25T11:30:00Z', ...temel, id: 'b1', listingId: 'ilan-1', status: 'submitted' },
  {
    ...temel,
    id: 'b2',
    /* İzin AÇIK başlıyor. */
    paylasimIzniAt: '2026-08-21T09:00:00Z',
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
  /* GÖRÜŞME DAVETİ: tam dolu, henüz yanıtlanmamış. */
  {
    ...temel,
    id: 'b4',
    listingId: 'ilan-2',
    status: 'interview_scheduled',
    statusChangedAt: '2026-08-27T12:00:00Z',
    interviewDate: '2026-09-15',
    interviewTime: '14:00',
    interviewType: 'in_person',
    interviewLocation: 'Örnek Plaza, Kat 4, Maslak / İstanbul',
    interviewNote: 'Pozisyonu ve çalışma koşullarını görüşmek üzere sizi davet ediyoruz.',
  },
  /* GÖRÜŞME ONAYLANDI. */
  {
    ...temel,
    id: 'b12',
    listingId: 'ilan-1',
    status: 'interview_scheduled',
    statusChangedAt: '2026-08-27T13:00:00Z',
    interviewDate: '2026-09-12',
    interviewTime: '11:30',
    interviewType: 'online',
    interviewLocation: 'https://ornek.test/gorusme/abc',
    interviewResponse: 'accepted',
    interviewRespondedAt: '2026-08-28T08:00:00Z',
  },
  /* ÖĞRENCİ KATILAMIYOR: şirketin olumsuz kararıyla karışmamalı. */
  {
    ...temel,
    id: 'b13',
    listingId: 'ilan-2',
    status: 'interview_scheduled',
    statusChangedAt: '2026-08-27T14:00:00Z',
    interviewDate: '2026-09-13',
    interviewTime: '09:00',
    interviewType: 'phone',
    interviewResponse: 'declined',
    interviewRespondedAt: '2026-08-28T09:00:00Z',
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
    /* Görüşmede netleşen ücret ilandakini eziyor. */
    offerCompensation: '18.000 TL / ay',
  },
  /* ESKİ TEKLİF: içerik alanları bu turda eklendi, geçmişte yok. */
  {
    ...temel,
    id: 'b10',
    listingId: 'ilan-2',
    status: 'offer_extended',
    statusChangedAt: '2026-08-29T10:00:00Z',
  },
  /* ESKİ GÖRÜŞME KAYDI: davet alanları bu turda eklendi, hiçbiri yok. */
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
    /* Şirketin kendi sitesinden: paylaşım izni anahtarı ÇİZİLMEMELİ. */
    applicationMethod: 'external',
    listingId: 'ilan-2',
    status: 'withdrawn',
    statusChangedAt: '2026-08-30T18:00:00Z',
  },
].map((x) => x as unknown as ApplicationRecord);

export const BasvurularimDevFixture: React.FC = () => {
  const [kayitlar, setKayitlar] = React.useState(BASVURULAR);
  const [altSekme, setAltSekme] = React.useState('all');
  const [pencere, setPencere] = React.useState(false);
  const [gonderilen, setGonderilen] = React.useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-3xl">
        {/*
          BAŞVURU PENCERESİ — iki ayrı onay kutusu (KVKK + isteğe bağlı paylaşım
          izni). Gönderim yerel; gönderilen iki değer aşağıda yazıyor ki
          izin kutusunun ayrı geçtiği tarayıcıda görülebilsin.
        */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            id="dev-basvuru-penceresi"
            onClick={() => setPencere(true)}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 font-bold"
          >
            Başvuru penceresini aç
          </button>
          {gonderilen && <span id="dev-gonderilen">{gonderilen}</span>}
        </div>
        {pencere && (
          <ApplyDialog
            listing={{ ...ILANLAR[0], applicationMethod: 'internal' } as InternshipListing}
            alreadyApplied={false}
            onClose={() => setPencere(false)}
            onSubmit={async (riza, paylasimIzni) => {
              setGonderilen(`riza=${riza} paylasimIzni=${paylasimIzni}`);
              setPencere(false);
            }}
            /*
              BAŞVURU ÖNCESİ İLETİŞİM KONTROLÜ: telefon BOŞ başlıyor ki
              "eksik telefonu aynı ekranda tamamla" hâli görülebilsin.
              Değerler kurgu.
            */
            paylasilacak={{ ad: 'Örnek Öğrenci', eposta: 'ogrenci@ornek.test', telefon: '' }}
            onTelefonKaydet={async () => {
              await new Promise((r) => window.setTimeout(r, 200));
            }}
          />
        )}
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
          /*
            Gerçek kapı sunucuda (public.gorusmeye_yanit_ver): yalnızca
            görüşme aşamasından yanıt veriliyor ve ikinci yanıt kararı
            değiştirmiyor. Fikstür aynı davranışı taklit ediyor.
          */
          onRespondToInterview={(id, katilacak) =>
            new Promise((coz, red) => {
              window.setTimeout(() => {
                if (id === 'b5') {
                  red(new Error('Fikstür: görüşme yanıtı hatası taklit ediliyor.'));
                  return;
                }
                const mevcut = kayitlar.find((x) => x.id === id)?.interviewResponse;
                const yanit = mevcut ?? (katilacak ? 'accepted' : 'declined');
                setKayitlar((o) =>
                  o.map((a) =>
                    a.id === id
                      ? { ...a, interviewResponse: yanit, interviewRespondedAt: new Date().toISOString() }
                      : a,
                  ),
                );
                coz(yanit);
              }, 250);
            })
          }
          /*
            Paylaşım izni: gerçek kapı sunucuda (public.basvuru_paylasim_izni,
            yalnız öğrencinin kendi `internal` başvurusu). b3 her zaman hata
            veriyor: satır içi hata ve kilitli anahtar görülebilsin.
          */
          /*
            İLETİŞİM PAYLAŞIMI: gerçek kapı sunucuda
            (public.ogrenci_paylasimi_ac, yalnız öğrencinin kendisi).
            Kapatınca şirketin erişimi sunucuda kesiliyor; fikstür
            yalnız anahtarın davranışını gösteriyor.
          */
          onIletisimPaylasimi={(id, acik) =>
            new Promise<string | null>((coz) => {
              window.setTimeout(() => {
                const an = acik ? new Date().toISOString() : null;
                setKayitlar((o) =>
                  o.map((a) =>
                    a.id === id
                      ? { ...a, contactShareConsentAt: an, contactShareConsentVersion: an ? PAYLASIM_SURUMU : null }
                      : a,
                  ),
                );
                coz(an);
              }, 180);
            })
          }
          onPaylasimIzni={(id, acik) =>
            new Promise<string | null>((coz, red) => {
              window.setTimeout(() => {
                if (id === 'b3') {
                  red(new Error('Fikstür: izin kaydı hatası taklit ediliyor.'));
                  return;
                }
                const an = acik ? new Date().toISOString() : null;
                setKayitlar((o) => o.map((a) => (a.id === id ? { ...a, paylasimIzniAt: an ?? undefined } : a)));
                coz(an);
              }, 400);
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
