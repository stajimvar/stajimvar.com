import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, MapPin, Calendar, DollarSign, ShieldCheck, ExternalLink,
  Building2, Clock, AlertTriangle, Share2, Check, Link2,
} from 'lucide-react';
import type { InternshipListing } from '../types';
import { fetchListingByIdPrefix } from '../lib/queries';
import { ListingLogo } from './ListingLogo';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
import { Logo } from './Logo';
import { slugify } from '../lib/slug';

/**
 * Tek ilan sayfası.
 *
 * Modal yerine gerçek bir adres olmasının üç sebebi var: ilan paylaşılabiliyor,
 * arama motoru indeksleyebiliyor, ve şirkete "ilanınız bizde şöyle görünüyor"
 * diye doğrudan link atılabiliyor.
 */

interface ListingPageProps {
  idPrefix: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onApply: (listing: InternshipListing) => void;
}

const Bilgi: React.FC<{ ikon: React.ReactNode; etiket: string; deger: string }> = ({
  ikon, etiket, deger,
}) => (
  <div className="flex items-start gap-2.5">
    <div className="text-gray-400 mt-0.5 shrink-0">{ikon}</div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
        {etiket}
      </p>
      <p className="text-sm font-semibold text-gray-900 break-words">{deger}</p>
    </div>
  </div>
);

export const ListingPage: React.FC<ListingPageProps> = ({
  idPrefix, onBack, onNavigate, onApply,
}) => {
  const [listing, setListing] = useState<InternshipListing | null>(null);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'yok' | 'hata'>('yukleniyor');
  const [paylasimDurumu, setPaylasimDurumu] = useState<'hazir' | 'kopyalandi'>('hazir');

  /**
   * Paylaşım. Mobilde işletim sisteminin kendi paylaşım menüsü açılır
   * (WhatsApp, mesaj, e-posta); masaüstünde adres panoya kopyalanır.
   */
  const paylas = async (ilan: InternshipListing) => {
    const adres = window.location.href;
    const metin = `${ilan.title} — ${ilan.companyName}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: metin, text: `${metin} ilanına bak:`, url: adres });
        return;
      } catch {
        // Kullanıcı vazgeçti veya paylaşım reddedildi; kopyalamaya düş.
      }
    }
    try {
      await navigator.clipboard.writeText(adres);
      setPaylasimDurumu('kopyalandi');
      setTimeout(() => setPaylasimDurumu('hazir'), 2500);
    } catch {
      // Pano izni yoksa yapacak bir şey yok; sessiz kal.
    }
  };

  useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    fetchListingByIdPrefix(idPrefix)
      .then((row) => {
        if (iptal) return;
        setListing(row);
        setDurum(row ? 'hazir' : 'yok');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [idPrefix]);

  /* Sayfa başlığını ilana göre ayarla — paylaşıldığında anlamlı görünsün. */
  useEffect(() => {
    if (!listing) return;
    const onceki = document.title;
    document.title = `${listing.title} — ${listing.companyName} | StajımVar`;
    return () => {
      document.title = onceki;
    };
  }, [listing]);

  /* Başvurunun gerçek işleyişi — açıklama ve düğmeler buradan besleniyor. */
  const yol = basvuruYolu(listing ?? {});

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label="Ana sayfa">
            <Logo />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tüm ilanlar
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {durum === 'yukleniyor' && (
          <div className="space-y-4" role="status" aria-live="polite">
            <div className="h-28 rounded-3xl bg-gray-100 animate-pulse"/>
            <div className="h-52 rounded-2xl bg-gray-100 animate-pulse"/>
            <p className="text-center text-xs text-gray-500">Yükleniyor…</p>
          </div>
        )}

        {durum === 'yok' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center space-y-3">
            <p className="font-bold">Bu ilan bulunamadı</p>
            <p className="text-sm text-gray-600">
              Bağlantı hatalı olabilir ya da ilan yayından kaldırılmış olabilir.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Açık ilanlara dön
            </button>
          </div>
        )}

        {durum === 'hata' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
            <p className="font-bold text-red-800">İlan yüklenemedi</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              Tekrar dene
            </button>
          </div>
        )}

        {durum === 'hazir' && listing && (
          <>
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7 space-y-4">
              <div className="flex items-start gap-4">
                <ListingLogo
                  name={listing.companyName}
                  logoUrl={listing.companyLogo || undefined}
                />
                <div className="min-w-0 space-y-1">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/sirket/${listing.companySlug ?? slugify(listing.companyName)}`)}
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    {listing.companyName}
                  </button>
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-xl sm:text-2xl font-extrabold leading-snug">
                      {listing.title}
                    </h1>
                    <button
                      type="button"
                      onClick={() => paylas(listing)}
                      aria-label="İlanı paylaş"
                      title="İlanı paylaş"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {paylasimDurumu === 'kopyalandi' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Kopyalandı
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          Paylaş
                        </>
                      )}
                    </button>
                  </div>
                  {listing.origin === 'scraped' && (
                    <p className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Şirketin kendi kariyer sayfasından alındı
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <Bilgi
                  ikon={<MapPin className="w-4 h-4" />}
                  etiket="Konum"
                  deger={`${listing.city || 'Belirtilmemiş'} (${listing.workType})`}
                />
                {listing.department && (
                  <Bilgi ikon={<Building2 className="w-4 h-4" />} etiket="Departman" deger={listing.department} />
                )}
                {listing.duration && (
                  <Bilgi ikon={<Clock className="w-4 h-4" />} etiket="Süre" deger={listing.duration} />
                )}
                {listing.applicationDeadline && (
                  <Bilgi
                    ikon={<Calendar className="w-4 h-4" />}
                    etiket="Son başvuru"
                    deger={listing.applicationDeadline}
                  />
                )}
                <Bilgi
                  ikon={<DollarSign className="w-4 h-4" />}
                  etiket="Ücret"
                  deger={
                    listing.stipend.isPaid
                      ? listing.stipend.amountText || 'Ücretli'
                      : 'Kaynakta belirtilmemiş'
                  }
                />
                <Bilgi
                  ikon={<ShieldCheck className="w-4 h-4" />}
                  etiket="Zorunlu staj"
                  deger={
                    listing.mandatoryStajAccepted
                      ? 'Kabul ediliyor'
                      : listing.insuranceNote || 'Kaynakta belirtilmemiş'
                  }
                />
              </div>
            </div>

            {listing.requiredSkills.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-3">
                <h2 className="text-sm font-bold">İlanda geçen beceriler</h2>
                <div className="flex flex-wrap gap-1.5">
                  {[...listing.requiredSkills, ...listing.preferredSkills].map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">
                  Beceriler ilan metninden otomatik çıkarıldı; eksik olabilir.
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-3">
              <h2 className="text-sm font-bold">İlan açıklaması</h2>
              {/*
                Metin kaynaktan geldiği gibi gösteriliyor. HTML olarak basmıyoruz:
                dışarıdan gelen içeriği işaretleme olarak yorumlamak XSS kapısıdır.
              */}
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
              {listing.sourceUrl && (
                <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                  Kaynak: {new URL(listing.sourceUrl).hostname}
                </p>
              )}
            </div>

            {/*
              Açıklama, kart ve başvuru diyaloğuyla aynı cümleyi kuruyor:
              karar lib/basvuru-yolu.mjs'te. Önce burada "şirkete talebi
              bildiririz" yazıyordu; böyle çalışan bir süreç yok.
            */}
            {!yol.teslimEdiliyor && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-900 leading-relaxed">
                  {yol.ozet} StajımVar kaydı yalnızca senin takip listen içindir —{' '}
                  <strong>resmî sayfadan başvurmayı unutma</strong>.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 sticky bottom-4">
              {yol.resmiAdres && (
                <a
                  href={yol.resmiAdres}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl text-sm font-bold transition-colors shadow-xs ${
                    yol.anaEylem === 'resmi-site'
                      ? 'text-white bg-blue-600 hover:bg-blue-700'
                      : 'border border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  {yol.anaEylem === 'resmi-site' ? yol.anaEtiket : 'İlana git'}
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => onApply(listing)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl text-sm font-bold transition-colors shadow-xs ${
                  yol.anaEylem === 'resmi-site'
                    ? 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {yol.anaEylem === 'resmi-site' ? yol.takipEtiketi : yol.anaEtiket}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
