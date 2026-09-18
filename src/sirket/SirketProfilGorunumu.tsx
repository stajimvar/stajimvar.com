import React from 'react';
import { Briefcase, ExternalLink, Link as LinkIkonu, Pencil, Plus } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI, RENK_PRIMARY } from '../lib/renk-token';
import { guvenliDisAdres } from '../lib/guvenli-url.mjs';
import type { SosyalPaylasim } from '../lib/queries/sosyal';
import type { SirketAcikKimlik } from '../lib/sirket-veri';
import { PaylasimIzgarasi } from '../components/sosyal/PaylasimIzgarasi';
import {
  FotografPaylasGirisi,
  type FotografPaylasKolu,
} from '../components/sosyal/FotografPaylasGirisi';

/**
 * ŞİRKET PROFİLİ — TEK BİLEŞEN, İKİ YETKİ DURUMU
 *
 * Öğrenci profiliyle (`SosyalProfilGorunumu`) aynı kural: sahip görünümü
 * ve ziyaretçi görünümü AYRI BİLEŞENE ÇOĞALTILMIYOR. Sahibe özel her şey
 * (İlan oluştur, Profili düzenle, Öğrencinin gördüğü sayfa, Fotoğraf
 * paylaş, ilan yönetimi) `sahip` nesnesinin İÇİNDE çiziliyor; ziyaretçi
 * dalında nesne hiç verilmediği için DOM'a girmiyor. Yetkinin asıl kapısı
 * sunucuda (`company_members`, `posts` politikaları, `paylasim_kitlesi_
 * kilidi`); burası yalnız hangi düğmenin çizileceğine karar veriyor.
 *
 * VERİ ŞEKLİ HERKESE AÇIK OLANLA SINIRLI
 * --------------------------------------
 * `SirketAcikKimlik` İK e-postasını, VKN'yi, MERSİS'i tanımıyor. Sahibin
 * paneli o alanları biliyor ama bu bileşene geçemiyor — tipin kendisi
 * sızıntıya kapı bırakmıyor.
 *
 * ÜÇ SAYAÇ, ÜÇÜ DE GERÇEK
 * -----------------------
 * Paylaşım ve takipçi `sosyal_sayaclar`ın aynı satırından (20261015010000
 * takipçi sütununu ekledi; `takipci_sayisi` ayrıca sorulmuyor), aktif
 * ilan `listings` satırlarından. Her sayaç kendi durumunu taşıyor: biri
 * alınamayınca öteki ikisi düşmüyor ve alınamayan sayı "0" DEĞİL, "—"
 * ile "alınamadı" olarak basılıyor. Sıfır yalnız sunucu sıfır dediğinde.
 *
 * TAKİP ET DÜĞMESİ ZİYARETÇİ DALINDA (karar: 18 Eylül 2026)
 * -------------------------------------------------------
 * `ziyaretciEylemi` yalnız `sahip` VERİLMEDİĞİNDE çiziliyor ve sayaçların
 * altında, öğrenci profilindeki "Bağlantı kur" ile aynı yerde duruyor.
 * Düğmenin kendisi (`TakipDugmesi`) bakanın kimliğini istiyor; kararı
 * çağıran (`SirketSayfasi`) veriyor. Sahip dalında bu prop hiç
 * verilmiyor: kendi sayfanı takip etmek şemada da yasak
 * (`kendini_takip_yok`).
 *
 * ÖĞRENCİ KİMLİĞİ ÇİZİLMİYOR
 * --------------------------
 * Okul, bölüm, sınıf, alan rozeti: şirket sayfasında bu satırların
 * hiçbiri yok — #121'deki resmî hesap kuralıyla aynı gerekçe (kurum
 * kimliği). Bu bileşen o alanları prop olarak bile almıyor.
 *
 * DEKORATİF HALKA, ROZET YOK
 * --------------------------
 * Logo çevresindeki mavi halka referans tasarımdan; anlam taşımıyor
 * (`aria-hidden` bir kenarlık). "Doğrulanmış" rozeti bilerek YOK:
 * `companies.verified` bu ekranda okunmuyor, olmayan bir güven işareti
 * ima edilmiyor.
 */

export type SayacDurumu =
  | { durum: 'yukleniyor' }
  | { durum: 'hazir'; deger: number }
  | { durum: 'hata' };

export type SirketSekmesi = 'paylasimlar' | 'ilanlar' | 'hakkimizda';

/**
 * Sahibe özel eylemler — yalnız sahip dalında verilir.
 *
 * Adresler GERÇEK `<a href>` olarak çiziliyor: orta tuş ve "yeni sekmede
 * aç" çalışıyor; sol tık uygulama içi gezinme.
 */
export interface SahipEylemleri {
  ilanOlusturYolu: string;
  duzenleYolu: string;
  /** Şirketin öğrenciye açık sayfası; kullanıcı adı yoksa `null` ve bağlantı çizilmez. */
  ogrenciSayfasiYolu: string | null;
  /**
   * Paylaşım açılabilir mi — sunucu önkoşulunun aynısı: sosyal satırda
   * kullanıcı adı VE `sirket_id` var. Sağlanmıyorsa düğme çizilmiyor ve
   * sebebi `paylasimEngeli` yazıyor.
   */
  paylasabilirMi: boolean;
  paylasimEngeli: string | null;
  onPaylasimEklendi: () => void;
  onPaylasimArsivlendi: () => void;
}

interface GorunumProps {
  kimlik: SirketAcikKimlik;
  /** Sosyal satırdaki kullanıcı adı (`@slug`); yoksa satır çizilmiyor. */
  kullaniciAdi: string | null;
  sayaclar: { paylasim: SayacDurumu; aktifIlan: SayacDurumu; takipci: SayacDurumu };
  paylasimlar: SosyalPaylasim[];
  paylasimDurumu: 'yukleniyor' | 'hazir' | 'hata';
  onPaylasimlariYenile: () => void;
  /** İlanlar sekmesinin gövdesi; sahip ve ziyaretçi farklı liste çiziyor. */
  ilanlarIcerigi: React.ReactNode;
  /** Yalnız sahip dalında; ziyaretçide `undefined` ve sahibe özel hiçbir şey DOM'a girmiyor. */
  sahip?: SahipEylemleri;
  /**
   * Ziyaretçinin tek eylemi (takip düğmesi). `sahip` ile birlikte
   * verilmez; verilse de sahip dalında çizilmiyor — iki dal aynı anda
   * doğru olamaz.
   */
  ziyaretciEylemi?: React.ReactNode;
  onNavigate: (yol: string) => void;
  /** Panoya kopyalama gibi anlık geri bildirim. */
  bildirim?: string | null;
}

const BIRINCIL = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${RENK_PRIMARY.zemin} ${RENK_PRIMARY.zeminHover} ${RENK_PRIMARY.yazi} ${RENK_GECISI} ${ODAK_HALKASI}`;
const IKINCIL = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-900 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;
const SAKIN_BAGLANTI = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold ${RENK_PRIMARY.metin} hover:underline ${ODAK_HALKASI}`;
const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

/** Uygulama içi gezinme; değiştirici tuşlarla tarayıcının kendi davranışı. */
function icTiklama(onNavigate: (yol: string) => void, yol: string) {
  return (olay: React.MouseEvent<HTMLAnchorElement>) => {
    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
    olay.preventDefault();
    onNavigate(yol);
  };
}

/** Baş harf: referans tasarımdaki tek harf. Ad boşsa soru işareti değil, boş daire. */
function basHarf(ad: string): string {
  const ilk = ad.trim().split(/\s+/)[0] ?? '';
  return ilk ? ilk[0].toLocaleUpperCase('tr-TR') : '';
}

/**
 * Dairesel logo ya da baş harf.
 *
 * `companies.logo_url` herkese açık kovadan (`logos`) geliyor; bu yüzden
 * öğrenci avatarındaki yetkili indirme kalıbı burada gerekmiyor. Kırık
 * adres baş harfe düşüyor — kırık `<img>` çizilmiyor.
 */
const SirketLogosu: React.FC<{ url: string | null; ad: string }> = ({ url, ad }) => {
  const [bozuk, setBozuk] = React.useState(false);
  React.useEffect(() => setBozuk(false), [url]);
  const olcu =
    'flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-blue-600 ring-offset-2 sm:h-24 sm:w-24';

  if (!url || bozuk) {
    return (
      <span className={`${olcu} text-3xl font-black text-blue-900 sm:text-4xl`} aria-hidden>
        {basHarf(ad)}
      </span>
    );
  }
  return (
    <span className={olcu}>
      <img
        src={url}
        alt={`${ad} logosu`}
        onError={() => setBozuk(true)}
        className="h-full w-full object-contain p-1.5"
      />
    </span>
  );
};

/**
 * Tek sayaç — üç durum ayrı.
 *
 * "Alınamadı" ile "sıfır" aynı hücreye düşmüyor: hata dalı sayı değil
 * tire basıyor ve etiket bunu söylüyor. `aria-busy` yükleniyor dalında.
 */
const Sayac: React.FC<{ etiket: string; deger: SayacDurumu }> = ({ etiket, deger }) => (
  <div
    className="flex min-w-0 flex-col items-center py-1 text-center"
    aria-busy={deger.durum === 'yukleniyor' || undefined}
  >
    <dd className="order-1 text-2xl font-extrabold leading-tight tabular-nums text-gray-900">
      {deger.durum === 'hazir' ? (
        deger.deger
      ) : deger.durum === 'yukleniyor' ? (
        <span aria-hidden className="inline-block h-7 w-8 animate-pulse rounded bg-gray-100" />
      ) : (
        <span aria-hidden>—</span>
      )}
    </dd>
    <dt className="order-2 mt-0.5 text-sm text-gray-600">
      {etiket}
      {deger.durum === 'hata' && <span className="block text-xs text-gray-500">alınamadı</span>}
      {deger.durum === 'yukleniyor' && <span className="sr-only">yükleniyor</span>}
    </dt>
  </div>
);

/** Sekme düğmesi: seçili lacivert kalın + ince mavi alt çizgi. */
const SEKME_TABAN = `relative flex min-h-11 flex-1 cursor-pointer items-center justify-center px-2 text-sm sm:text-base ${RENK_GECISI} ${ODAK_HALKASI}`;

export const SirketProfilGorunumu: React.FC<GorunumProps> = ({
  kimlik,
  kullaniciAdi,
  sayaclar,
  paylasimlar,
  paylasimDurumu,
  onPaylasimlariYenile,
  ilanlarIcerigi,
  sahip,
  ziyaretciEylemi,
  onNavigate,
  bildirim,
}) => {
  const [sekme, setSekme] = React.useState<SirketSekmesi>('paylasimlar');
  const paylasKolu = React.useRef<FotografPaylasKolu>(null);
  const site = guvenliDisAdres(kimlik.siteUrl);
  const siteKonagi = site ? new URL(site).hostname.replace(/^www\./, '') : null;
  const konumSatiri = [kimlik.konum, kimlik.calisanSayisi ? `${kimlik.calisanSayisi} çalışan` : null]
    .filter(Boolean)
    .join(' · ');

  const sekmeler: { id: SirketSekmesi; etiket: string }[] = [
    { id: 'paylasimlar', etiket: 'Paylaşımlar' },
    { id: 'ilanlar', etiket: 'İlanlar' },
    { id: 'hakkimizda', etiket: 'Hakkımızda' },
  ];

  /*
    Paylaşım giriş düğmesi: FotografPaylasGirisi'nin kendisi — aynı
    seçici, aynı besteci (öğrenci profiliyle ve Ağım'la aynı yol). Kitle
    sabit 'sirket'; besteci seçici çizmiyor.
  */
  const paylasGirisi = sahip && sahip.paylasabilirMi && (
    <FotografPaylasGirisi
      ref={paylasKolu}
      hazirMi
      paylasabilirMi
      onNavigate={onNavigate}
      onTamamlandi={sahip.onPaylasimEklendi}
      sabitKitle="sirket"
      etiket="Fotoğraf paylaş"
      ikonSinifi="h-5 w-5"
      dugmeSinifi={`${BIRINCIL} shrink-0`}
    />
  );

  return (
    /*
      TELEFONDA KART DEĞİL YÜZEY: öğrenci profiliyle aynı — üst blok ve
      ızgara ekranın iki kenarına yaslı, tek alt çizgiyle bitiyor; `sm:`
      üstünde kart. Bileşen KENARSIZ bir kap bekliyor (telefonda `px-0`):
      ziyaretçi kabuğu (`SayfaKabugu mobilKenarsiz`) zaten öyle, sahibin
      paneli `-mx-4` ile aynı duruma getiriyor. Yan boşluk bu yüzden
      burada, metin taşıyan parçaların kendi `px-4`ünde.
    */
    <div className="space-y-0 sm:space-y-4">
      <header className="border-b border-gray-200 bg-white px-4 pb-4 pt-5 sm:rounded-2xl sm:border sm:p-6">
        <div className="flex items-start gap-4 sm:gap-6">
          <SirketLogosu url={kimlik.logoUrl} ad={kimlik.ad} />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* `break-words`: uzun ad kırpılmıyor, sarılıyor. */}
              <h1 className="min-w-0 break-words text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
                {kimlik.ad}
              </h1>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${RENK_PRIMARY.yumusakZemin} ${RENK_PRIMARY.metin}`}
              >
                Şirket hesabı
              </span>
            </div>
            {kullaniciAdi && <p className="truncate text-sm text-gray-600 sm:text-base">@{kullaniciAdi}</p>}
            {/* Girilmemiş bilgi UYDURULMUYOR: satır yoksa çizilmiyor. */}
            {kimlik.sektor && <p className="break-words text-sm text-gray-700 sm:text-base">{kimlik.sektor}</p>}
            {konumSatiri && <p className="break-words text-sm text-gray-700 sm:text-base">{konumSatiri}</p>}
          </div>
        </div>

        {kimlik.aciklama && (
          <p className="mt-3 line-clamp-3 whitespace-pre-line break-words text-sm leading-relaxed text-gray-800 sm:text-base">
            {kimlik.aciklama}
          </p>
        )}
        {/*
          Site adresi güvenli mutlak HTTPS'e çevriliyor (`guvenliDisAdres`);
          çevrilemeyen adres hiç çizilmiyor. Konak adı `break-all`: uzun
          adres telefonda taşmıyor.
        */}
        {site && siteKonagi && (
          <a
            href={site}
            target="_blank"
            rel="noreferrer"
            className={`mt-1.5 inline-flex min-h-11 max-w-full items-center gap-1.5 text-sm font-semibold ${RENK_PRIMARY.metin} hover:underline sm:text-base ${ODAK_HALKASI}`}
          >
            <LinkIkonu aria-hidden className="h-4 w-4 shrink-0" />
            <span className="min-w-0 break-all">{siteKonagi}</span>
          </a>
        )}

        {/* Sayaçlar arasında dikey çizgi YOK (referans); eşit üç sütun. */}
        <dl className="mt-3 grid grid-cols-3 border-t border-gray-100 pt-3">
          <Sayac etiket="paylaşım" deger={sayaclar.paylasim} />
          <Sayac etiket="aktif ilan" deger={sayaclar.aktifIlan} />
          <Sayac etiket="takipçi" deger={sayaclar.takipci} />
        </dl>

        {/*
          Ziyaretçi eylemi sahip düğmeleriyle AYNI yerde ve aynı hizada:
          telefonda tam genişlik, `sm:` üstünde içerik genişliğinde ve
          ortada (ölçü gerekçesi sahip dalındaki yorumda).
        */}
        {!sahip && ziyaretciEylemi && (
          <div className="mt-3 flex flex-col items-stretch sm:items-center">{ziyaretciEylemi}</div>
        )}

        {sahip && (
          <div className="mt-3 space-y-2">
            {/*
              Telefonda iki eşit sütun (referans); `sm:` üstünde düğmeler
              içerik genişliğinde ve ortada — 1280 pikselde ölçüldü: tam
              genişlikte her biri 569 piksel oluyor ve iki kocaman şerit
              sayaçları eziyordu.
            */}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-center">
              <a
                href={sahip.ilanOlusturYolu}
                onClick={icTiklama(onNavigate, sahip.ilanOlusturYolu)}
                className={`${BIRINCIL} sm:min-w-52`}
              >
                <Briefcase aria-hidden className="h-5 w-5" />
                İlan oluştur
              </a>
              <a
                href={sahip.duzenleYolu}
                onClick={icTiklama(onNavigate, sahip.duzenleYolu)}
                className={`${IKINCIL} sm:min-w-52`}
              >
                <Pencil aria-hidden className="h-4 w-4" />
                Profili düzenle
              </a>
            </div>
            {sahip.ogrenciSayfasiYolu && (
              <div className="flex justify-center">
                <a
                  href={sahip.ogrenciSayfasiYolu}
                  onClick={icTiklama(onNavigate, sahip.ogrenciSayfasiYolu)}
                  className={SAKIN_BAGLANTI}
                >
                  <ExternalLink aria-hidden className="h-4 w-4" />
                  Öğrencinin gördüğü sayfa
                </a>
              </div>
            )}
          </div>
        )}

        {bildirim && (
          <p role="status" className="mt-3 text-sm font-semibold text-gray-700">
            {bildirim}
          </p>
        )}
      </header>

      {/* ---------------------------------------------------------- sekmeler */}
      <div
        role="tablist"
        aria-label="Şirket profili bölümleri"
        className="flex border-b border-gray-200 bg-white sm:rounded-2xl sm:border"
      >
        {sekmeler.map((s) => {
          const secili = s.id === sekme;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`sirket-sekme-${s.id}`}
              aria-selected={secili}
              aria-controls={`sirket-panel-${s.id}`}
              onClick={() => setSekme(s.id)}
              className={`${SEKME_TABAN} ${secili ? 'font-extrabold text-blue-950' : 'font-semibold text-gray-600 hover:text-gray-900'}`}
            >
              {s.etiket}
              {secili && (
                <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------- paylaşımlar */}
      {sekme === 'paylasimlar' && (
        <section
          role="tabpanel"
          id="sirket-panel-paylasimlar"
          aria-labelledby="sirket-sekme-paylasimlar"
          className="space-y-3 pt-4 sm:pt-0"
        >
          <div className="flex items-center justify-between gap-3 px-4 sm:px-0">
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
              Şirketten kareler
            </h2>
            {paylasGirisi}
          </div>

          {sahip?.paylasimEngeli && (
            <p role="status" className={`${KART} mx-4 text-sm leading-relaxed text-gray-600 sm:mx-0`}>
              {sahip.paylasimEngeli}
            </p>
          )}

          {paylasimDurumu === 'hazir' && paylasimlar.length === 0 ? (
            /*
              BOŞ DURUM: stok görsel yok, iskelet yok. Sahipte eylem
              düğmesi başlıktaki girişin AYNI seçicisini açıyor (kol ile),
              ikinci bir besteci kurulmuyor. Ziyaretçide yalnız cümle.
            */
            <div className={`${KART} mx-4 flex flex-col items-center gap-3 py-8 text-center sm:mx-0`}>
              <p className="text-sm font-bold text-gray-900">Henüz paylaşım yok</p>
              {sahip?.paylasabilirMi && (
                <button
                  type="button"
                  onClick={() => paylasKolu.current?.sec()}
                  className={IKINCIL}
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  İlk fotoğrafınızı paylaşın
                </button>
              )}
            </div>
          ) : (
            /* Telefonda ızgara ekranın iki kenarına yaslı; kare karo, üç sütun. */
            <div>
              <PaylasimIzgarasi
                paylasimlar={paylasimlar}
                durum={paylasimDurumu}
                onYenidenDene={onPaylasimlariYenile}
                sahibiMi={Boolean(sahip)}
                onArsivlendi={sahip?.onPaylasimArsivlendi}
                gorunum="kare"
                kullaniciAdi={kullaniciAdi}
              />
            </div>
          )}
        </section>
      )}

      {/* ----------------------------------------------------------- ilanlar */}
      {sekme === 'ilanlar' && (
        <section
          role="tabpanel"
          id="sirket-panel-ilanlar"
          aria-labelledby="sirket-sekme-ilanlar"
          className="px-4 pt-4 sm:px-0 sm:pt-0"
        >
          {ilanlarIcerigi}
        </section>
      )}

      {/* -------------------------------------------------------- hakkımızda */}
      {sekme === 'hakkimizda' && (
        <section
          role="tabpanel"
          id="sirket-panel-hakkimizda"
          aria-labelledby="sirket-sekme-hakkimizda"
          className={`${KART} mx-4 mt-4 space-y-4 sm:mx-0 sm:mt-0`}
        >
          {kimlik.aciklama ? (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-gray-800 sm:text-base">
              {kimlik.aciklama}
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              {sahip
                ? 'Şirketinizi anlatan bir açıklama henüz yok.'
                : 'Şirket henüz kendini anlatan bir açıklama eklemedi.'}
            </p>
          )}

          {(kimlik.sektor || kimlik.konum || kimlik.calisanSayisi || site) && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {kimlik.sektor && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Sektör</dt>
                  <dd className="break-words text-gray-900">{kimlik.sektor}</dd>
                </div>
              )}
              {kimlik.konum && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Konum</dt>
                  <dd className="break-words text-gray-900">{kimlik.konum}</dd>
                </div>
              )}
              {kimlik.calisanSayisi && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Çalışan sayısı</dt>
                  <dd className="text-gray-900">{kimlik.calisanSayisi}</dd>
                </div>
              )}
              {site && (
                <div className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Web sitesi</dt>
                  <dd className="min-w-0">
                    <a
                      href={site}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex min-h-11 max-w-full items-center break-all font-semibold ${RENK_PRIMARY.metin} hover:underline ${ODAK_HALKASI}`}
                    >
                      {site}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}

          {/* Eksik alanı olan sahibe düzenleme yolu; ziyaretçiye hiçbir eylem. */}
          {sahip && (!kimlik.aciklama || !kimlik.sektor || !kimlik.konum || !site) && (
            <a
              href={sahip.duzenleYolu}
              onClick={icTiklama(onNavigate, sahip.duzenleYolu)}
              className={IKINCIL}
            >
              <Pencil aria-hidden className="h-4 w-4" />
              Eksik bilgileri düzenle
            </a>
          )}
        </section>
      )}
    </div>
  );
};
