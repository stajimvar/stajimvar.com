import { Tabs } from '../ui';
import React, { useState } from 'react';
import {
  gorusmeOgrenciCumlesi,
  gorusmeTuruAdi,
  gorusmeYeriEtiketi,
  ogrenciDurumCumlesi,
  ogrenciGeriCekebilir,
} from '../lib/basvuru-durumu.mjs';
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
  /*
    TEKLİFE YANIT — kabul ya da ret. Dönen değer SUNUCUNUN gördüğü
    nihai durum; ekran onu yazıyor, kendi tahminini değil.
  */
  onRespondToOffer?: (applicationId: string, kabul: boolean) => Promise<string>;
  /*
    GÖRÜŞME DAVETİNE YANIT. Teklif yanıtından ayrı: biri görüşmeye
    katılıp katılamayacağı, diğeri işi kabul edip etmediği.
  */
  onRespondToInterview?: (applicationId: string, katilacak: boolean) => Promise<string>;
  /* Kabul edilmiş teklifte şirket yetkilisinin iletişim satırı. */
  onFetchContact?: (applicationId: string) => Promise<Iletisim | null>;
  /*
    BİLDİRİMDEN GELEN BAŞVURU

    Kullanıcıyı listeye atıp aratmıyoruz: ilgili başvurunun davet ya da
    teklif paneli kendiliğinden açılıyor ve kart görünüre kaydırılıyor.
  */
  acilacakBasvuru?: string | null;
  onBasvuruAcildi?: () => void;
}

/** Karşı tarafın iletişim satırı — sunucunun döndürdüğü biçim. */
export type Iletisim = {
  ad: string | null;
  eposta: string | null;
  telefon: string | null;
  unvan: string | null;
};

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
  onRespondToOffer,
  onRespondToInterview,
  onFetchContact,
  acilacakBasvuru,
  onBasvuruAcildi,
}) => {
  /* Geri çekme onayı: yanlışlıkla tek tıkla süreç kapanmasın. */
  const [geriCekilen, setGeriCekilen] = useState<string | null>(null);
  const [islemdeki, setIslemdeki] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  /* Açık teklif ayrıntısı, kabul/ret onayı ve yanıt hatası. */
  const [teklifAcik, setTeklifAcik] = useState<string | null>(null);
  const [karar, setKarar] = useState<{ id: string; kabul: boolean } | null>(null);
  const [teklifHatasi, setTeklifHatasi] = useState<string | null>(null);

  /* Açık görüşme daveti, katılım kararı ve yanıt hatası. */
  const [davetAcik, setDavetAcik] = useState<string | null>(null);
  const [davetKarari, setDavetKarari] = useState<{ id: string; katilacak: boolean } | null>(null);
  const [davetHatasi, setDavetHatasi] = useState<string | null>(null);

  /*
    Hangi panelin açılacağı BAŞVURUNUN DURUMUNDAN çıkıyor: görüşme
    aşamasındaysa davet, teklif aşamasındaysa teklif. Bildirim türünü
    burada ikinci kez yorumlamak, iki yerde ayrı kural demekti.
  */
  React.useEffect(() => {
    if (!acilacakBasvuru) return;
    const kayit = applications.find((a) => a.id === acilacakBasvuru);
    if (!kayit) return;
    if (kayit.status === 'interview_scheduled') setDavetAcik(kayit.id);
    if (kayit.status === 'offer_extended') setTeklifAcik(kayit.id);
    /* Süzgeç kaydı gizliyorsa "Tümü"ne dönülüyor; yoksa açılan panel görünmezdi. */
    onSubTabChange?.('all');
    document
      .querySelector(`[data-basvuru-karti="${kayit.id}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    onBasvuruAcildi?.();
  }, [acilacakBasvuru, applications, onSubTabChange, onBasvuruAcildi]);
  /* Başvuru kimliği → iletişim satırı. 'yok' okundu ama kapı kapalı demek. */
  const [iletisimler, setIletisimler] = useState<Record<string, Iletisim | 'yok' | 'hata'>>({});

  /*
    İLETİŞİM YALNIZCA KABUL EDİLMİŞ TEKLİFTE İSTENİYOR

    Kapı veritabanında (public.basvuru_iletisimi): kabul edilmemiş bir
    başvuruda satır zaten dönmüyor. Buradaki koşul isteği hiç
    göndermemek için.
  */
  React.useEffect(() => {
    if (!onFetchContact) return;
    let iptal = false;
    for (const app of applications) {
      if (app.status !== 'offer_accepted' || iletisimler[app.id] !== undefined) continue;
      void onFetchContact(app.id)
        .then((satir) => {
          if (!iptal) setIletisimler((o) => ({ ...o, [app.id]: satir ?? 'yok' }));
        })
        .catch(() => {
          if (!iptal) setIletisimler((o) => ({ ...o, [app.id]: 'hata' }));
        });
    }
    return () => {
      iptal = true;
    };
  }, [applications, onFetchContact, iletisimler]);

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
    /* Sürecin tek gerçek başarısı: dolu yeşil yalnızca kabul edilmiş teklifte. */
    offer_accepted: 'bg-emerald-600 text-white border-emerald-600 font-bold',
    /*
      Öğrencinin kendi reddi nötr: şirketin olumsuz kararıyla (rejected)
      aynı görünmesi, kararı kimin verdiğini belirsizleştirirdi.
    */
    offer_declined: 'bg-gray-100 text-gray-600 border-gray-200',
    rejected: 'bg-gray-100 text-gray-600 border-gray-200',
    withdrawn: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const getStatusBadge = (
    status: ApplicationRecord['status'],
    /*
      Görüşme aşamasında rozet YANITA göre değişiyor: davet mi geldi,
      katılacağını mı bildirdi, katılamayacağını mı. Durum aynı kalıyor;
      değişen, durumun içindeki olgu.
    */
    gorusmeYaniti?: string,
  ) => ({
    label:
      status === 'interview_scheduled'
        ? gorusmeOgrenciCumlesi(gorusmeYaniti)
        : ogrenciDurumCumlesi(status),
    color: DURUM_RENGI[status] ?? 'bg-gray-100 text-gray-700 border-gray-200',
  });

  const filteredApps = applications.filter((app) => {
    if (effectiveFilter === 'all') return true;
    if (effectiveFilter === 'under_review') return app.status === 'under_review' || app.status === 'submitted';
    if (effectiveFilter === 'interviews') return app.status === 'interview_scheduled' || app.status === 'technical_assessment';
    /*
      Teklif süzgeci yanıtlanmış teklifleri de kapsıyor: öğrenci kabul
      ettiği teklifi bu sekmede arıyor. Yalnız bekleyenleri göstermek,
      kabul edilen teklifi ve iletişim bilgilerini gizlerdi.
    */
    if (effectiveFilter === 'offers')
      return (
        app.status === 'offer_extended' ||
        app.status === 'offer_accepted' ||
        app.status === 'offer_declined'
      );
    return true;
  });

  const interviewCount = applications.filter(
    (a) => a.status === 'interview_scheduled' || a.status === 'technical_assessment'
  ).length;
  /* Sayaç YANIT BEKLEYEN teklifleri sayıyor: rozetteki sayı bir işi işaret ediyor. */
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
            const badge = getStatusBadge(app.status, app.interviewResponse);

            return (
              <div
                key={app.id}
                /* Bildirimden gelindiğinde kart görünüre kaydırılıyor. */
                data-basvuru-karti={app.id}
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
                  GÖRÜŞME DAVETİ — TEKLİF DEĞİL

                  Burada önce "Mülakat aşamasındasın" yazan bir kutu, sonra
                  da doğrudan teklif kabul/ret düğmeleri vardı. Gerçek işe
                  alımda ücret ve şartlar GÖRÜŞMEDE netleşiyor; görüşme
                  yapılmadan "Teklif aldın" demek yanlıştı.

                  Bu aşamada teklif kabul/ret KESİNLİKLE görünmüyor.
                */}
                {app.status === 'interview_scheduled' && (
                  davetAcik === app.id ? (
                    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                      <div>
                        <p className="text-sm font-extrabold text-blue-900">
                          {listing?.companyName ?? 'Şirket'} · {listing?.title ?? 'Staj'}
                        </p>
                        <p className="text-xs font-bold text-blue-800">Görüşme daveti</p>
                      </div>

                      {/*
                        Eski `interview_scheduled` kayıtlarında bu alanların
                        hiçbiri olmayabilir: davet içeriği bu turda eklendi.
                        Her satır kendi değeri varsa çiziliyor.
                      */}
                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        {app.interviewDate && (
                          <div>
                            <dt className="font-bold text-blue-900">Tarih</dt>
                            <dd className="text-blue-800">{tarihMetni(app.interviewDate)}</dd>
                          </div>
                        )}
                        {app.interviewTime && (
                          <div>
                            <dt className="font-bold text-blue-900">Saat</dt>
                            <dd className="text-blue-800">{app.interviewTime.slice(0, 5)}</dd>
                          </div>
                        )}
                        {app.interviewType && (
                          <div>
                            <dt className="font-bold text-blue-900">Görüşme türü</dt>
                            <dd className="text-blue-800">{gorusmeTuruAdi(app.interviewType)}</dd>
                          </div>
                        )}
                        {app.interviewLocation && (
                          <div className="col-span-2">
                            <dt className="font-bold text-blue-900">
                              {gorusmeYeriEtiketi(app.interviewType)}
                            </dt>
                            <dd className="break-words text-blue-800">{app.interviewLocation}</dd>
                          </div>
                        )}
                      </dl>

                      {app.interviewNote && (
                        <p className="whitespace-pre-line text-xs leading-relaxed text-blue-900">
                          {app.interviewNote}
                        </p>
                      )}

                      {!app.interviewDate && !app.interviewTime && !app.interviewLocation && !app.interviewNote && (
                        <p className="text-xs text-blue-800">
                          Şirket seni görüşme aşamasına aldı. Görüşmenin tarihi ve biçimi henüz
                          belirtilmedi.
                        </p>
                      )}

                      {/* Yanıt verilmişse eylem yok: karar bir kez veriliyor. */}
                      {app.interviewResponse ? (
                        <p className="text-xs font-bold text-blue-900">
                          {gorusmeOgrenciCumlesi(app.interviewResponse)}
                        </p>
                      ) : davetKarari?.id === app.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-blue-900">
                            {davetKarari.katilacak
                              ? 'Görüşmeye katılacağını bildirelim mi?'
                              : 'Katılamayacağını bildirelim mi?'}
                          </span>
                          <button
                            type="button"
                            disabled={islemdeki === app.id}
                            onClick={() => {
                              setIslemdeki(app.id);
                              setDavetHatasi(null);
                              void onRespondToInterview?.(app.id, davetKarari.katilacak)
                                .then(() => setDavetKarari(null))
                                .catch(() => setDavetHatasi(app.id))
                                .finally(() => setIslemdeki(null));
                            }}
                            className="min-h-11 rounded-full bg-blue-700 px-4 text-xs font-bold text-white disabled:opacity-60"
                          >
                            {islemdeki === app.id ? 'Kaydediliyor…' : 'Evet'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDavetKarari(null)}
                            className="min-h-11 rounded-full px-3 text-xs font-bold text-blue-800"
                          >
                            Vazgeç
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDavetKarari({ id: app.id, katilacak: true })}
                            className="min-h-11 rounded-full bg-blue-700 px-3 text-xs font-bold text-white"
                          >
                            Görüşmeye katılacağım
                          </button>
                          <button
                            type="button"
                            onClick={() => setDavetKarari({ id: app.id, katilacak: false })}
                            className="min-h-11 rounded-full border border-blue-300 px-3 text-xs font-bold text-blue-900"
                          >
                            Katılamayacağım
                          </button>
                        </div>
                      )}

                      {davetHatasi === app.id && (
                        <p role="alert" className="text-xs font-semibold text-red-700">
                          Yanıtın kaydedilemedi. Bağlantını kontrol edip tekrar dene.
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDavetAcik(app.id)}
                      className="min-h-11 self-start rounded-full bg-blue-700 px-4 text-xs font-bold text-white"
                    >
                      Daveti görüntüle
                    </button>
                  )
                )}

                {/*
                  TEKLİF — ÖĞRENCİNİN KARAR VERECEĞİ EKRAN

                  Rozet tek başına yetmiyordu: "Teklif aldın" yazıyor ama
                  öğrenci neyi kabul edeceğini görmüyordu. Ayrıntı kartın
                  içinde açılıyor; ayrı bir modal, telefonda karar anını
                  gereksiz yere ağırlaştırırdı.

                  Ücret, çalışma biçimi ve süre İLANDAN okunuyor — şirket
                  teklif gönderirken bunları tekrar yazmıyor.
                */}
                {app.status === 'offer_extended' && (
                  teklifAcik === app.id ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-extrabold text-emerald-900">
                          {listing?.companyName ?? 'Şirket'} · {listing?.title ?? 'Staj'}
                        </p>
                        <p className="text-xs font-bold text-emerald-800">Teklif aldın</p>
                      </div>

                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        {app.offerStartDate && (
                          <div>
                            <dt className="font-bold text-emerald-900">Başlangıç</dt>
                            <dd className="text-emerald-800">{tarihMetni(app.offerStartDate)}</dd>
                          </div>
                        )}
                        {listing?.workType && (
                          <div>
                            <dt className="font-bold text-emerald-900">Çalışma biçimi</dt>
                            <dd className="text-emerald-800">{listing.workType}</dd>
                          </div>
                        )}
                        {listing?.duration && (
                          <div>
                            <dt className="font-bold text-emerald-900">Süre</dt>
                            <dd className="text-emerald-800">{listing.duration}</dd>
                          </div>
                        )}
                        {/*
                          ÜCRET: teklifte yazan varsa O geçerli, yoksa
                          ilandaki bilgi. Aynı şey iki kez yazılmıyor ve
                          görüşmede netleşen ücret ilandakini eziyor.
                        */}
                        {(app.offerCompensation || listing?.stipend?.amountText) && (
                          <div>
                            <dt className="font-bold text-emerald-900">Ücret</dt>
                            <dd className="text-emerald-800">
                              {app.offerCompensation || listing?.stipend?.amountText}
                            </dd>
                          </div>
                        )}
                      </dl>

                      {/* Eski tekliflerde not olmayabilir; boşsa bölüm yok. */}
                      {app.offerNote && (
                        <p className="whitespace-pre-line text-xs leading-relaxed text-emerald-900">
                          {app.offerNote}
                        </p>
                      )}

                      {/*
                        RIZA CÜMLESİ KARARIN YANINDA

                        Kabul, iletişim bilgilerinin paylaşılması demek.
                        Bunu küçük bir dipnot değil, düğmenin hemen
                        üstünde açık bir cümle söylüyor.
                      */}
                      <p className="text-[11px] leading-relaxed text-emerald-800">
                        Teklifi kabul ettiğinde iletişim bilgilerin bu şirketle paylaşılır.
                      </p>

                      {karar?.id === app.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-emerald-900">
                            {karar.kabul
                              ? 'Bu teklifi kabul etmek istiyor musun?'
                              : 'Bu teklifi reddetmek istiyor musun?'}
                          </span>
                          <button
                            type="button"
                            disabled={islemdeki === app.id}
                            onClick={() => {
                              setIslemdeki(app.id);
                              setTeklifHatasi(null);
                              void onRespondToOffer?.(app.id, karar.kabul)
                                .then(() => {
                                  setKarar(null);
                                  setTeklifAcik(null);
                                })
                                .catch(() => setTeklifHatasi(app.id))
                                .finally(() => setIslemdeki(null));
                            }}
                            className="min-h-11 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-60"
                          >
                            {islemdeki === app.id ? 'Kaydediliyor…' : karar.kabul ? 'Evet, kabul et' : 'Evet, reddet'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setKarar(null)}
                            className="min-h-11 rounded-full px-3 text-xs font-bold text-emerald-800"
                          >
                            Vazgeç
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setKarar({ id: app.id, kabul: true })}
                            className="min-h-11 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white"
                          >
                            Teklifi kabul et
                          </button>
                          <button
                            type="button"
                            onClick={() => setKarar({ id: app.id, kabul: false })}
                            className="min-h-11 rounded-full border border-emerald-300 px-4 text-xs font-bold text-emerald-900"
                          >
                            Reddet
                          </button>
                        </div>
                      )}

                      {teklifHatasi === app.id && (
                        <p role="alert" className="text-xs font-semibold text-red-700">
                          Yanıtın kaydedilemedi. Bağlantını kontrol edip tekrar dene.
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTeklifAcik(app.id)}
                      className="min-h-11 self-start rounded-full bg-emerald-600 px-4 text-xs font-bold text-white"
                    >
                      Teklifi görüntüle
                    </button>
                  )
                )}

                {/*
                  KABUL SONRASI İLETİŞİM

                  Sohbet yok: şirket yetkilisinin adı, kurumsal e-postası
                  ve varsa telefonu. Bilgi sunucudan geliyor; `profiles`
                  tablosunun okuma kuralı genişletilmedi.
                */}
                {app.status === 'offer_accepted' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="text-xs font-extrabold text-emerald-900">🎉 Teklifi kabul ettin</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                      İletişim
                    </p>
                    {iletisimler[app.id] === 'hata' ? (
                      <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
                        İletişim bilgileri şu anda yüklenemedi.
                      </p>
                    ) : iletisimler[app.id] === 'yok' ? (
                      <p className="mt-1 text-xs text-emerald-800">
                        Şirket yetkilisinin bilgileri henüz görünmüyor.
                      </p>
                    ) : iletisimler[app.id] ? (
                      <>
                        <p className="mt-1 text-sm font-extrabold text-emerald-900">
                          {(iletisimler[app.id] as Iletisim).ad ?? listing?.companyName ?? 'Şirket'}
                        </p>
                        <p className="text-xs text-emerald-800">
                          {(iletisimler[app.id] as Iletisim).unvan ?? 'Yetkili'}
                          {listing?.companyName ? ` · ${listing.companyName}` : ''}
                        </p>
                        {(iletisimler[app.id] as Iletisim).eposta && (
                          <p className="text-xs text-emerald-800">
                            {(iletisimler[app.id] as Iletisim).eposta}
                          </p>
                        )}
                        {(iletisimler[app.id] as Iletisim).telefon && (
                          <p className="text-xs text-emerald-800">
                            {(iletisimler[app.id] as Iletisim).telefon}
                          </p>
                        )}
                        {(iletisimler[app.id] as Iletisim).eposta && (
                          <a
                            href={`mailto:${(iletisimler[app.id] as Iletisim).eposta}`}
                            className="mt-2 inline-flex min-h-11 items-center rounded-full border border-emerald-300 px-4 text-xs font-bold text-emerald-900"
                          >
                            E-posta gönder
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-emerald-800">İletişim bilgileri yükleniyor…</p>
                    )}
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
                {onWithdraw && ogrenciGeriCekebilir(app.status) && (
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
