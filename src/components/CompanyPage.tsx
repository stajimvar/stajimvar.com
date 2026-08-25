import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { sayfaMetaAyarla } from '../lib/sayfa-meta';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Globe, MapPin, ShieldCheck, BadgeCheck } from 'lucide-react';
import type { InternshipListing } from '../types';
import { fetchCompanyPage } from '../lib/queries';
import { ListingLogo } from './ListingLogo';
import { BOLUMLER } from '../data/bolumler';
import { eklenmeMetni, sonKontrolMetni } from '../lib/zaman';
import { guvenliDisAdres } from '../lib/guvenli-url.mjs';
import { Logo } from './Logo';
import { listingSlug } from '../lib/slug';
import { CompanyClaimForm } from './CompanyClaimForm';

/**
 * Şirket sayfası.
 *
 * İki işi var: öğrenciye şirketin tüm açık ilanlarını tek yerde göstermek, ve
 * şirkete "platformda böyle görünüyorsunuz" diye gösterilebilecek bir adres
 * vermek. İkincisi davet akışının temeli.
 *
 * Şirket bilgileri şu an toplanan ilanlardan geliyor, yani eksik olabilir.
 * Eksik alanı uydurmuyoruz; sahiplenme akışıyla şirket kendisi dolduracak.
 */

interface CompanyPageProps {
  slug: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  /** Giriş yapan kullanıcı; sahiplenme formu için gerekiyor. */
  userId?: string | null;
  userEmail?: string;
  onRequireLogin?: () => void;
}

type Durum = 'yukleniyor' | 'hazir' | 'yok' | 'hata';
type Veri = Awaited<ReturnType<typeof fetchCompanyPage>>;

export const CompanyPage: React.FC<CompanyPageProps> = ({
  slug,
  onBack,
  onNavigate,
  userId = null,
  userEmail,
  onRequireLogin,
}) => {
  const [veri, setVeri] = useState<Veri>(null);
  const [durum, setDurum] = useState<Durum>('yukleniyor');

  useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    fetchCompanyPage(slug)
      .then((d) => {
        if (iptal) return;
        setVeri(d);
        setDurum(d ? 'hazir' : 'yok');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!veri) return;
    return sayfaMetaAyarla({
      baslik: `${veri.company.name} staj ilanları | StajımVar`,
      aciklama:
        (veri.company.description || '').replace(/\s+/g, ' ').trim().slice(0, 155) ||
        `${veri.company.name} şirketinin yayındaki staj ilanları. İlanlar şirketin kendi kariyer sayfasından derleniyor.`,
    });
  }, [veri]);

  /*
    İLGİLİ BÖLÜMLER

    Şirket sayfası masaüstünde neredeyse boştu ve hiçbir yere bağlanmıyordu.
    Buradaki bağlantılar uydurma değil: yayındaki ilanların `department`
    alanı ve başlıkları, bölüm sayfalarının adıyla eşleştiriliyor. Eşleşme
    yoksa bölüm listesi hiç çizilmiyor — boş bir başlık, olmayan bir
    içeriği varmış gibi gösterir.
  */
  const ilgiliBolumler = React.useMemo(() => {
    if (!veri) return [];
    const metin = veri.listings
      .map((i: InternshipListing) => `${i.title} ${i.department || ''}`)
      .join(' ')
      .toLocaleLowerCase('tr-TR');
    if (!metin.trim()) return [];
    return BOLUMLER.filter((b) => metin.includes(b.ad.toLocaleLowerCase('tr-TR'))).slice(0, 6);
  }, [veri]);

  /*
    Kariyer sayfası: ilanların geldiği kaynağın kök adresi. Şirketin kendi
    sitesinden ayrı bir bilgi — ilanlar çoğu zaman bir işe alım
    sağlayıcısında (Workable, Lever) duruyor ve öğrenci oraya gidiyor.
  */
  const kariyerAdresi = React.useMemo(() => {
    const kaynak = veri?.listings.find((i: InternshipListing) => i.sourceUrl)?.sourceUrl;
    if (!kaynak) return null;
    try {
      const u = new URL(kaynak);
      return { adres: u.origin + u.pathname.split('/').slice(0, 3).join('/'), konak: u.hostname };
    } catch {
      return null;
    }
  }, [veri]);

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
          <div className="h-40 rounded-3xl bg-gray-100 animate-pulse"/>
        )}

        {durum === 'yok' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center space-y-3">
            <p className="font-bold">Bu şirket bulunamadı</p>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              İlanlara dön
            </button>
          </div>
        )}

        {durum === 'hata' && (
          <p className="text-sm text-red-700">Şirket bilgisi yüklenemedi.</p>
        )}

        {durum === 'hazir' && veri && (
          <>
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7 space-y-4">
              <div className="flex items-start gap-4">
                <ListingLogo name={veri.company.name} logoUrl={veri.company.logoUrl} />
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold">{veri.company.name}</h1>
                    {veri.company.verified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Doğrulanmış
                      </span>
                    ) : (
                      /*
                        Doğrulanmamış olmak kötü bir şey değil, sadece henüz
                        şirketin kendisi sahiplenmemiş demek. Bunu gizlemek
                        yerine açıkça yazıyoruz.
                      */
                      <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                        Henüz sahiplenilmemiş
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    {veri.company.industry && <span>{veri.company.industry}</span>}
                    {veri.company.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {veri.company.location}
                      </span>
                    )}
                    {/*
                      Adres şemasız kaydediliyor ("alumil.com"). Şemasız href
                      göreli yol sayıldığı için bağlantı /sirket/alumil.com'a
                      gidiyordu; ziyaretçi şirketin sitesine hiç ulaşamıyordu.
                      guvenliDisAdres şemayı tamamlıyor ve güvensiz değeri
                      hiç bağlantıya çevirmiyor.
                    */}
                    {guvenliDisAdres(veri.company.websiteUrl) && (
                      <a
                        href={guvenliDisAdres(veri.company.websiteUrl)!}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Web sitesi
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {veri.company.description && (
                <p className="text-sm text-gray-600 leading-relaxed pt-3 border-t border-gray-100">
                  {veri.company.description}
                </p>
              )}

              {!veri.company.verified && (
                <div className="pt-3 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
                  Bu sayfadaki ilanlar {veri.company.name} şirketinin kendi kariyer
                  sisteminden derlendi. Şirket yetkilisiyseniz sayfayı sahiplenmek veya
                  ilanların kaldırılmasını istemek için{' '}
                  <a
                    className="text-blue-600 font-semibold hover:underline"
                    href="mailto:iletisim@stajimvar.com"
                  >
                    iletisim@stajimvar.com
                  </a>{' '}
                  adresine yazabilirsiniz.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest px-1">
                Açık ilanlar ({veri.listings.length})
              </h2>

              {veri.listings.length === 0 ? (
                <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-2xl p-6 text-center">
                  Şu anda açık ilanı yok. Kaynağı saatlik kontrol ediyoruz; yeni ilan
                  açıldığında burada görünür.
                </p>
              ) : (
                veri.listings.map((ilan: InternshipListing) => (
                  <button
                    key={ilan.id}
                    type="button"
                    onClick={() => onNavigate(`/ilan/${listingSlug(ilan)}`)}
                    className="w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-blue-500 transition-colors p-4 space-y-1.5"
                  >
                    <p className="font-bold text-gray-900">{ilan.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {konumEtiketi(ilan.city)} ({calismaEtiketi(ilan.workType)})
                      </span>
                      {ilan.stipend.isPaid && (
                        <span className="text-amber-700 font-semibold">Ücretli</span>
                      )}
                      {ilan.mandatoryStajAccepted && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Zorunlu staj
                        </span>
                      )}
                    </div>
                    {/*
                      Tarih satırı: ilanın kaynaktaki gerçek yayın tarihi ve
                      başvuru adresinin son doğrulandığı gün. Şirket sayfası
                      bunları göstermiyordu; oysa "bu şirket ne zaman ilan
                      açıyor" sorusunun cevabı burada.
                    */}
                    {(eklenmeMetni(ilan.postedAt, ilan.postedAtDogrulandi) ||
                      sonKontrolMetni(ilan.lastSeenAt)) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                        {eklenmeMetni(ilan.postedAt, ilan.postedAtDogrulandi) && (
                          <span>{eklenmeMetni(ilan.postedAt, ilan.postedAtDogrulandi)}</span>
                        )}
                        {sonKontrolMetni(ilan.lastSeenAt) && (
                          <span className="text-emerald-700 font-semibold">
                            {sonKontrolMetni(ilan.lastSeenAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/*
              KÜNYE VE İLGİLİ BÖLÜMLER

              Sayfa masaüstünde neredeyse boştu: logo, bir satır meta ve
              ilan listesi. Buradaki üç blok da var olan veriden üretiliyor,
              hiçbiri uydurma değil — bilgi yoksa blok hiç çizilmiyor.
            */}
            {(veri.company.industry ||
              veri.company.location ||
              veri.company.size ||
              kariyerAdresi) && (
              <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7">
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  Künye
                </h2>
                <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {veri.company.industry && (
                    <div>
                      <dt className="text-xs text-gray-500">Sektör</dt>
                      <dd className="font-semibold text-gray-900">{veri.company.industry}</dd>
                    </div>
                  )}
                  {veri.company.location && (
                    <div>
                      <dt className="text-xs text-gray-500">Konum</dt>
                      <dd className="font-semibold text-gray-900">
                        {konumEtiketi(veri.company.location)}
                      </dd>
                    </div>
                  )}
                  {veri.company.size && (
                    <div>
                      <dt className="text-xs text-gray-500">Çalışan sayısı</dt>
                      <dd className="font-semibold text-gray-900">{veri.company.size}</dd>
                    </div>
                  )}
                  {kariyerAdresi && (
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Kariyer sayfası</dt>
                      <dd className="font-semibold truncate">
                        <a
                          href={kariyerAdresi.adres}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-blue-600 hover:underline"
                        >
                          {kariyerAdresi.konak}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {ilgiliBolumler.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7">
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  İlgili bölümler
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Bu şirketin ilanları şu bölümlerle örtüşüyor. Bölüm sayfasında o alanda
                  stajın nerede yapıldığı ve stajyerin ne iş yaptığı anlatılıyor.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ilgiliBolumler.map((b) => (
                    <a
                      key={b.slug}
                      href={`/bolum/${b.slug}`}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                        e.preventDefault();
                        onNavigate(`/bolum/${b.slug}`);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:border-blue-300"
                    >
                      {b.ad}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/*
              Sahiplenme çağrısı sayfanın altında, ilanlardan sonra.
              Sayfanın asıl işi öğrenciye ilanları göstermek; şirket
              yetkilisi zaten kendi şirketini arayarak buraya geliyor
              ve sonuna kadar bakıyor.
            */}
            <div className="mt-8">
              <CompanyClaimForm
                companyId={veri.company.id}
                companyName={veri.company.name}
                userId={userId}
                userEmail={userEmail}
                onRequireLogin={onRequireLogin ?? (() => undefined)}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};
