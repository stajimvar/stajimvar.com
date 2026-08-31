import { Tabs } from '../ui';
import React, { useState } from 'react';
import { durumKapandi, ogrenciDurumCumlesi } from '../lib/basvuru-durumu.mjs';
import {
  FileText,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ApplicationRecord, InternshipListing } from '../types';
import { ListingLogo } from './ListingLogo';

/**
 * Uyum halkasının rengi. Eşikler ilan kartıyla birebir aynı; iki ekranda
 * farklı eşik kullanmak aynı puanı farklı renkte gösterirdi.
 */
const uyumRengi = (puan: number) =>
  puan >= 75 ? '#10b981' : puan >= 50 ? '#2563eb' : '#9ca3af';

interface ApplicationsTrackerViewProps {
  applications: ApplicationRecord[];
  allListings: InternshipListing[];
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onExploreInternships: () => void;
  /*
    Geri çekme isteğe bağlı: veren ekran vermezse eylem hiç
    görünmüyor. Söz döndürüyor, hata satır içinde gösteriliyor.
  */
  onWithdraw?: (applicationId: string) => Promise<void> | void;
}

/**
 * Tarihi okunur hale getirir.
 *
 * Ekranda ham ISO damgasi duruyordu: "2026-08-16T09:03:14.642169+00:00".
 * Kullaniciya gosterilecek bir bicim degil.
 */
function tarihMetni(deger?: string | null): string {
  if (!deger) return '—';
  const t = new Date(deger);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const ApplicationsTrackerView: React.FC<ApplicationsTrackerViewProps> = ({
  applications,
  allListings,
  subTab = 'all',
  onSubTabChange,
  onExploreInternships,
  onWithdraw,
}) => {
  /* Geri çekme onayı: yanlışlıkla tek tıkla süreç kapanmasın. */
  const [geriCekilen, setGeriCekilen] = useState<string | null>(null);
  const [islemdeki, setIslemdeki] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const effectiveFilter = subTab || 'all';

  /*
    DURUM ETİKETİ ORTAK SÖZLÜKTEN

    Burada `switch (status)` ile kendi sözlüğü vardı ve şirket tarafıyla
    farklı kelimeler kullanıyordu: "İK İnceliyor", "Teknik Case
    Aşamasında", "🎉 Staj Teklifi Geldi!". Aynı başvuru iki tarafta iki
    ayrı ürün gibi görünüyordu.

    Daha kötüsü `withdrawn` hiç ele alınmamıştı ve `default` dalına
    düşüyordu: öğrencinin KENDİ geri çektiği başvuru ona "İşlemde"
    diyordu — tutarsızlık değil, yanlış bilgi.

    Terim artık ../lib/basvuru-durumu.mjs içinde ve iki taraf da aynı
    sözlüğü okuyor. Öğrenci tarafında cümleleşiyor ("Başvurun
    inceleniyor") ama TERİM aynı.

    Renk yalnız yardımcı: metin renksiz de anlaşılıyor.
  */
  const DURUM_RENGI: Record<string, string> = {
    submitted: 'bg-gray-100 text-gray-700 border-gray-200',
    under_review: 'bg-amber-50 text-amber-900 border-amber-200',
    technical_assessment: 'bg-amber-50 text-amber-900 border-amber-200',
    interview_scheduled: 'bg-blue-50 text-blue-800 border-blue-200',
    offer_extended: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold',
    rejected: 'bg-gray-100 text-gray-600 border-gray-200',
    withdrawn: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const getStatusBadge = (status: ApplicationRecord['status']) => ({
    label: ogrenciDurumCumlesi(status),
    color: DURUM_RENGI[status] ?? 'bg-gray-100 text-gray-700 border-gray-200',
  });

  const filteredApps = applications.filter((app) => {
    if (effectiveFilter === 'all') return true;
    if (effectiveFilter === 'under_review') return app.status === 'under_review' || app.status === 'submitted';
    if (effectiveFilter === 'interviews') return app.status === 'interview_scheduled' || app.status === 'technical_assessment';
    if (effectiveFilter === 'offers') return app.status === 'offer_extended';
    return true;
  });

  const interviewCount = applications.filter(
    (a) => a.status === 'interview_scheduled' || a.status === 'technical_assessment'
  ).length;
  const offerCount = applications.filter((a) => a.status === 'offer_extended').length;

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-2">
      {/*
        BAŞLIK BANDI KALDIRILDI

        Bu liste profil sayfasında "Başvurularım" başlıklı bölümün İÇİNDE
        duruyor. Bandın kendisi bir kez daha "Staj Başvurularım & Süreç
        Takibi" diyordu ve altına da ne işe yaradığını anlatan bir cümle
        ekliyordu — aynı şeyin üçüncü kez söylenmesi. Bölüm başlığı zaten
        adı ve özeti veriyor; burası doğrudan süzgeçlerle başlıyor.
      */}
      {/*
        SEKMELER ARTIK SİTENİN TEK SEKME BİLEŞENİ

        Burada mavi dolgu haplar, Fırsatlar sekmesinde beyaz hap, Rehber'de
        yuvarlak çipler vardı. Üçü de "şu an buradasın" diyordu ama üçü de
        farklı görünüyordu; kullanıcı her ekranda aynı kontrolü yeniden
        öğreniyordu. Tek biçim: src/ui/Tabs.tsx.
      */}
      <Tabs
        etiket="Başvuru süzgeci"
        secili={effectiveFilter}
        onSec={(id) => onSubTabChange && onSubTabChange(id as typeof effectiveFilter)}
        ogeler={[
          { id: 'all', etiket: 'Tümü', sayi: applications.length },
          { id: 'under_review', etiket: 'İncelenenler' },
          { id: 'interviews', etiket: 'Mülakatlar', sayi: interviewCount },
          { id: 'offers', etiket: 'Teklifler', sayi: offerCount },
        ]}
      />

      {/* Applications List */}
      {filteredApps.length > 0 ? (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const listing = allListings.find((l) => l.id === app.listingId);
            const badge = getStatusBadge(app.status);

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs hover:border-blue-300 transition-all space-y-3.5 sm:space-y-4 overflow-hidden"
              >
                {/* Top Line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
                    {/*
                      Logo ilan kartlarıyla aynı: yuvarlak ve uyum puanı
                      varsa etrafında halka.

                      Burada kare duruyordu; aynı şirketin logosu ilan
                      listesinde yuvarlak, başvurularda kare görünüyordu.
                      Uyum puanı da alt satırda turuncu bir yazıydı —
                      turuncu uyarı rengi gibi okunuyor ve ilan kartlarında
                      bu yüzden kaldırılmıştı.
                    */}
                    {listing ? (
                      <div className="shrink-0">
                        <div
                          className="rounded-full p-[3px]"
                          style={{
                            background:
                              app.matchScore > 0
                                ? `conic-gradient(${uyumRengi(app.matchScore)} ${app.matchScore * 3.6}deg, #e5e7eb ${app.matchScore * 3.6}deg)`
                                : 'transparent',
                          }}
                          title={app.matchScore > 0 ? `%${app.matchScore} uyum` : listing.companyName}
                        >
                          <div className="rounded-full bg-white p-[2px]">
                            <ListingLogo
                              name={listing.companyName}
                              logoUrl={listing.companyLogo || undefined}
                            />
                          </div>
                        </div>
                        {app.matchScore > 0 && (
                          <span
                            className="block text-center text-[10px] font-bold mt-1 tabular-nums"
                            style={{ color: uyumRengi(app.matchScore) }}
                          >
                            %{app.matchScore}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-blue-600">
                        {listing?.companyName || 'Şirket'}
                      </span>
                      <h3 className="font-bold text-gray-900 text-base leading-snug">
                        {listing?.title || 'Staj Başvurusu'}
                      </h3>
                      {listing?.department && (
                        <p className="text-xs text-gray-600">
                          ({listing.department})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400"/>
                    <span>Başvuru: {tarihMetni(app.appliedAt)}</span>
                  </span>
                  {/*
                    DURUM DAMGASI GERÇEK OLANI

                    Burada `updated_at` yazıyordu; o kolon başvurudaki
                    HERHANGİ bir yazımda oynuyor (şirketin geri
                    bildirimi, mülakat tarihi, e-posta denemesi).
                    Öğrenciye "süreç ilerledi" demenin ölçüsü
                    `status_changed_at`: yalnızca durum değişince
                    damgalanıyor. Hiç değişmediyse satır YOK — başvuru
                    tarihini "güncelleme" diye göstermek uydurma olurdu.
                  */}
                  {app.statusChangedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600"/>
                      <span>Durum güncellendi: {tarihMetni(app.statusChangedAt)}</span>
                    </span>
                  )}
                  {/*
                    "%N Yetenek Uyumu" satırı kaldırıldı: aynı sayı artık
                    logonun etrafındaki halkada ve altındaki rakamda.
                  */}
                </div>

                {/*
                  SÜREÇ KUTUSU — YALNIZCA GERÇEK VERİ

                  Burada sabit metin duruyordu: bir mülakat daveti, bir
                  saat, bir video toplantı bağlantısının e-postayla
                  gönderildiği vaadi. Hiçbiri veriden gelmiyordu; mülakat
                  aşamasındaki HER başvuruda aynı tarih ve aynı vaat
                  görünüyordu. Ürün mesajlaşma, takvim ya da video
                  bağlantısı TAŞIMIYOR.

                  Yerine yalnızca gerçekten kayıtlı olan iki alan:
                  şirketin girdiği mülakat tarihi ve öğrenciye görünür
                  geri bildirim.
                */}
                {app.status === 'interview_scheduled' && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                      <Video className="w-4 h-4 text-blue-600"/>
                      <span>
                        {app.interviewDate
                          ? `Mülakat tarihi: ${tarihMetni(app.interviewDate)}`
                          : 'Mülakat aşamasındasın'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-blue-800/80">
                      {app.interviewDate
                        ? 'Görüşmenin saati ve biçimi için şirketin sana ulaşmasını bekle.'
                        : 'Şirket seni mülakat aşamasına aldı. Tarih henüz belirlenmedi.'}
                    </p>
                  </div>
                )}

                {app.companyFeedback && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-bold text-gray-700">Şirketin notu</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">{app.companyFeedback}</p>
                  </div>
                )}

                {/*
                  BAŞVURUYU GERİ ÇEKME

                  Öğrencinin sürecin içindeki tek kararı. Süreç kapandıysa
                  (teklif, olumsuz, zaten geri çekilmiş) gösterilmiyor.
                  Buton gizlemek güvenlik değil: veritabanı politikası da
                  öğrenciye YALNIZCA `withdrawn` değerini veriyor.
                */}
                {onWithdraw && !durumKapandi(app.status) && (
                  geriCekilen === app.id ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs font-bold text-gray-700">
                        Başvurunu geri çekmek istiyor musun?
                      </span>
                      <button
                        type="button"
                        disabled={islemdeki === app.id}
                        onClick={() => {
                          setIslemdeki(app.id);
                          setHata(null);
                          Promise.resolve(onWithdraw(app.id))
                            .then(() => setGeriCekilen(null))
                            .catch(() => setHata(app.id))
                            .finally(() => setIslemdeki(null));
                        }}
                        className="min-h-9 rounded-full border border-gray-300 px-3.5 text-xs font-bold text-gray-800 disabled:opacity-60"
                      >
                        Evet, geri çek
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeriCekilen(null)}
                        className="min-h-9 rounded-full px-3 text-xs font-bold text-gray-500"
                      >
                        Vazgeç
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setGeriCekilen(app.id)}
                      className="self-start text-xs font-bold text-gray-500 underline underline-offset-2"
                    >
                      Başvuruyu geri çek
                    </button>
                  )
                )}

                {hata === app.id && (
                  <p role="alert" className="text-xs font-semibold text-red-700">
                    Başvuru geri çekilemedi. Bağlantını kontrol edip tekrar dene.
                  </p>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center space-y-4">
          <p className="text-sm text-gray-500">
            Bu filtreye uygun herhangi bir staj başvurusu bulunmuyor.
          </p>
          <button
            onClick={onExploreInternships}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            Staj İlanlarını Keşfet
          </button>
        </div>
      )}
    </div>
  );
};
