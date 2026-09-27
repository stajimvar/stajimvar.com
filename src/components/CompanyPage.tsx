import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { sayfaMetaAyarla } from '../lib/sayfa-meta';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Info, MapPin, ShieldCheck } from 'lucide-react';
import type { InternshipListing } from '../types';
import { fetchCompanyPage } from '../lib/queries';
import { STAJ_PROGRAMLARI } from '../data/stajProgramlari';
import { IsverenKimlikSayfasi } from './IsverenKimlikSayfasi';
import { ListingLogo } from './ListingLogo';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { BOLUMLER } from '../data/bolumler';
import { eklenmeMetni, sonKontrolMetni } from '../lib/zaman';
import { guvenliDisAdres } from '../lib/guvenli-url.mjs';
import { Logo } from './Logo';
import { listingSlug } from '../lib/slug';
import { CompanyClaimForm } from './CompanyClaimForm';
import { SayfaKabugu } from './SayfaKabugu';
import { ProfilSayfaDuzeni } from './sosyal/ProfilSayfaDuzeni';
import { useGenisEkran, XL_SORGUSU } from './sosyal/useGenisEkran';
import { AgimYanSutun } from './sosyal/AgimYanSutun';
import { SirketProfilGorunumu } from '../sirket/SirketProfilGorunumu';
import type { SirketAcikKimlik } from '../lib/sirket-veri';

/**
 * Şirket sayfası.
 *
 * İki işi var: öğrenciye şirketin tüm açık ilanlarını tek yerde göstermek, ve
 * şirkete "platformda böyle görünüyorsunuz" diye gösterilebilecek bir adres
 * vermek. İkincisi davet akışının temeli.
 *
 * Şirket bilgileri şu an toplanan ilanlardan geliyor, yani eksik olabilir.
 * Eksik alanı uydurmuyoruz; sahiplenme akışıyla şirket kendisi dolduracak.
 *
 * PROFİL DİLİ (27 Eylül 2026, kullanıcı isteği): hesabı olan şirketin
 * sayfası (/profil/<ad>) ile aynı görünüm — `SirketProfilGorunumu`, aynı
 * kap (`SayfaKabugu` telefonda kenarsız + `ProfilSayfaDuzeni`): bulanık
 * logo bandı, yuvarlak logo, ad, rozetler, açıklama, meta satırı, sayaç,
 * İlanlar / Hakkımızda sekmeleri. Farkı dürüst: sosyal satırı olmayan
 * şirkette paylaşım ve takipçi YOK (`sosyalYok`), "Şirket hesabı" rozeti
 * yalnız sahiplenilmişse. Künye (kariyer sayfası), sahiplenme, benzer
 * şirketler ve ilgili bölümler geniş ekranda sağ sütunda, dar ekranda
 * profilin altında — hiçbiri kaybolmuyor.
 */

interface CompanyPageProps {
  /** Site kabuğunda mı (üst çubuk App'ten). Öyleyse kendi başlığını çizmiyor. */
  gomulu?: boolean;
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
  gomulu = false,
  slug,
  onBack,
  onNavigate,
  userId = null,
  userEmail,
  onRequireLogin,
}) => {
  const [veri, setVeri] = useState<Veri>(null);
  /* Slug tabloda yoksa büyük işverenler dizininde karşılığı olabilir. */
  const dizinKaydi = React.useMemo(
    () => STAJ_PROGRAMLARI.find((p) => p.slug === slug) ?? null,
    [slug]
  );
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

  const genis = useGenisEkran(XL_SORGUSU);

  if (durum === 'hazir' && veri) {
    const kimlik: SirketAcikKimlik = {
      id: veri.company.id,
      ad: veri.company.name,
      slug: veri.company.slug ?? slug,
      logoUrl: veri.company.logoUrl ?? null,
      sektor: veri.company.industry?.trim() || null,
      calisanSayisi: veri.company.size?.trim() || null,
      konum: veri.company.location ? konumEtiketi(veri.company.location) : null,
      siteUrl: veri.company.websiteUrl ?? null,
      aciklama: veri.company.description?.trim() || null,
      dogrulandi: veri.company.verified === true,
    };
    const git = (yol: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onNavigate(yol);
    };

    /*
      Bu not "ilanlar derlendi, yetkiliyseniz yazın" diyor. Sahiplenilmiş
      ya da doğrulanmış profilde yersiz: yetkilisi zaten burada.
    */
    const derlemeNotu = !veri.company.verified && !veri.company.sahiplenilmis && (
      <p className="flex items-start gap-1.5">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        <span>
          İlanlar {veri.company.name} şirketinin kendi kariyer sisteminden derlendi. Yetkiliyseniz sayfayı
          sahiplenebilir ya da{' '}
          <a className="font-semibold text-blue-700 hover:underline" href="mailto:iletisim@stajimvar.com">
            iletisim@stajimvar.com
          </a>{' '}
          adresine yazabilirsiniz.
        </span>
      </p>
    );

    /* İlan kartları: öğrencinin gördüğü sade kart + yayın ve son kontrol tarihi. */
    const ilanlarIcerigi =
      veri.listings.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          Şu anda açık ilanı yok. Kaynağı saatlik kontrol ediyoruz; yeni ilan açıldığında burada görünür.
        </p>
      ) : (
        <ul className="space-y-3">
          {veri.listings.map((ilan: InternshipListing) => {
            const yol = `/ilan/${listingSlug(ilan)}`;
            const eklenme = eklenmeMetni(ilan.postedAt, ilan.postedAtDogrulandi);
            const kontrol = sonKontrolMetni(ilan.lastSeenAt);
            return (
              <li key={ilan.id}>
                <a
                  href={yol}
                  onClick={git(yol)}
                  className="block space-y-2 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:p-5"
                >
                  <p className="break-words text-base font-bold text-gray-900 sm:text-lg">{ilan.title}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden className="h-4 w-4" />
                      {konumEtiketi(ilan.city)} ({calismaEtiketi(ilan.workType)})
                    </span>
                    {ilan.stipend.isPaid && <span className="font-semibold text-amber-700">Ücretli</span>}
                    {ilan.mandatoryStajAccepted && (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <ShieldCheck aria-hidden className="h-4 w-4" />
                        Zorunlu staj
                      </span>
                    )}
                  </p>
                  {(eklenme || kontrol) && (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                      {eklenme && <span>{eklenme}</span>}
                      {kontrol && <span className="font-semibold text-emerald-700">{kontrol}</span>}
                    </p>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      );

    const KUCUK_KART = 'rounded-2xl border border-gray-200 bg-white p-4';
    /*
      ŞİRKETE ÖZGÜ YAN BLOKLAR — hepsi var olan veriden; veri yoksa blok yok.
      Künye yalnız bantta görünmeyen bilgiyi taşıyor (kariyer sayfası).
    */
    const sirketBloklari = (
      <>
        {kariyerAdresi && (
          <section className={KUCUK_KART} aria-labelledby="sirket-kunye">
            <h2 id="sirket-kunye" className="text-sm font-extrabold text-gray-900">
              Künye
            </h2>
            <dl className="mt-2 text-sm">
              <dt className="text-xs text-gray-500">Kariyer sayfası</dt>
              <dd className="min-w-0 truncate font-semibold">
                <a
                  href={kariyerAdresi.adres}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-blue-700 hover:underline"
                >
                  {kariyerAdresi.konak}
                </a>
              </dd>
            </dl>
          </section>
        )}

        {/*
          SAHİPLENİLMİŞ ŞİRKET TEKRAR SAHİPLENİLEMEZ: kendi şirketini açmış
          bir yetkili kendi sayfasında "Bu şirketin yetkilisi misiniz?"
          çağrısını görmesin.
        */}
        {!veri.company.sahiplenilmis && (
          <div>
            <CompanyClaimForm
              companyId={veri.company.id}
              companyName={veri.company.name}
              userId={userId}
              userEmail={userEmail}
              onRequireLogin={onRequireLogin ?? (() => undefined)}
            />
          </div>
        )}

        {/* BENZER ŞİRKETLER: aynı sektör/şehir, yayında ilanı olan; eşleşme yoksa blok yok. */}
        {veri.benzerler.length > 0 && (
          <section className={KUCUK_KART} aria-labelledby="sirket-benzerler">
            <h2 id="sirket-benzerler" className="text-sm font-extrabold text-gray-900">
              {veri.listings.length === 0 ? 'Bunun yerine bakabilirsin' : 'Benzer şirketler'}
            </h2>
            <ul className="mt-2 space-y-1">
              {veri.benzerler.map((b) => (
                <li key={b.slug}>
                  <a
                    href={`/sirket/${b.slug}`}
                    onClick={git(`/sirket/${b.slug}`)}
                    className="-mx-2 flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-gray-50"
                  >
                    <ListingLogo name={b.name} logoUrl={b.logoUrl} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-gray-900">{b.name}</span>
                      {b.industry && <span className="block truncate text-xs text-gray-500">{b.industry}</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {ilgiliBolumler.length > 0 && (
          <section className={KUCUK_KART} aria-labelledby="sirket-bolumler">
            <h2 id="sirket-bolumler" className="text-sm font-extrabold text-gray-900">
              İlgili bölümler
            </h2>
            <p className="mt-1 text-sm text-gray-600">Bu şirketin ilanları şu bölümlerle örtüşüyor.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ilgiliBolumler.map((b) => (
                <a
                  key={b.slug}
                  href={`/bolum/${b.slug}`}
                  onClick={git(`/bolum/${b.slug}`)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-300"
                >
                  {b.ad}
                </a>
              ))}
            </div>
          </section>
        )}
      </>
    );

    return (
      /* /profil/<ad> ile aynı kap: telefonda kenarsız yüzey, sm üstünde kart. */
      <SayfaKabugu icerikGenisligi={SAYFA_GENISLIGI} mobilKenarsiz ustBosluk="pt-0 sm:pt-8">
        <ProfilSayfaDuzeni
          yanSutun={
            genis ? (
              <>
                {sirketBloklari}
                {/* Hesaplı şirket sayfasıyla aynı öneriler (oturum varsa). */}
                {userId && <AgimYanSutun kullaniciId={userId} sektorId={null} onNavigate={onNavigate} />}
              </>
            ) : undefined
          }
        >
          <SirketProfilGorunumu
            kimlik={kimlik}
            kullaniciAdi={null}
            sayaclar={{
              paylasim: { durum: 'hazir', deger: 0 },
              aktifIlan: { durum: 'hazir', deger: veri.listings.length },
              takipci: { durum: 'hazir', deger: 0 },
            }}
            paylasimlar={[]}
            paylasimDurumu="hazir"
            onPaylasimlariYenile={() => undefined}
            ilanlarIcerigi={ilanlarIcerigi}
            onNavigate={onNavigate}
            sosyalYok
            hesapRozeti={veri.company.sahiplenilmis}
            bilgiNotu={derlemeNotu || undefined}
          />
          {/* Dar ekranda sağ sütun yok: aynı bloklar profilin altında. */}
          {!genis && <div className="mt-4 space-y-4 px-4 sm:px-0">{sirketBloklari}</div>}
        </ProfilSayfaDuzeni>
      </SayfaKabugu>
    );
  }

  return (
    <div className={gomulu ? 'flex-1 text-gray-900' : 'min-h-screen bg-[#F9FAFB] text-gray-900'}>
      {!gomulu && (
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
      )}

      {/*
        YERLEŞİM (17 Eylül 2026): ilan ve fırsat detayıyla aynı dil — site
        genişliği, üstte kimlik kartı, geniş ekranda iki sütun (solda ilanlar,
        sağda künye ve sahiplenme).
      */}
      <main
        className={
          gomulu
            ? `${SAYFA_GENISLIGI} w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-7 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-10 space-y-6`
            : 'max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6'
        }
      >
        {durum === 'yukleniyor' && (
          <div className="h-40 rounded-3xl bg-gray-100 animate-pulse"/>
        )}

        {durum === 'yok' && dizinKaydi && (
          /*
            DİZİN KAYNAKLI KİMLİK

            `companies` tablosunda karşılığı olmayan slug doğrudan
            "bulunamadı" oluyordu. Oysa büyük işverenler dizinindeki 44
            kurumun hiçbirinin tabloda kaydı yok (ölçüldü: 0/44 alan adı
            eşleşmesi) — yani dizinden gelen her tıklama çıkmaza
            düşüyordu.
          */
          <IsverenKimlikSayfasi
            program={dizinKaydi}
            onBack={() => onNavigate('/staj-programlari')}
            onNavigate={onNavigate}
          />
        )}

        {durum === 'yok' && !dizinKaydi && (
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

      </main>
    </div>
  );
};
