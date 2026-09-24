import React from 'react';
import { Briefcase, Link as LinkIkonu, MapPin, Pencil, Plus, Users } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI, RENK_PRIMARY } from '../lib/renk-token';
import { guvenliDisAdres } from '../lib/guvenli-url.mjs';
import type { SosyalPaylasim } from '../lib/queries/sosyal';
import type { SirketAcikKimlik } from '../lib/sirket-veri';
import { PaylasimIzgarasi } from '../components/sosyal/PaylasimIzgarasi';
import {
  AVATAR_BINMESI,
  AVATAR_SATIRI,
  BIYOGRAFI,
  HAP,
  HAP_BIRINCIL,
  HAP_SIRASI,
  IKON_HAP,
  KIMLIK_BANDI,
  META_SATIRI,
  MetaOgesi,
  SAYAC_ETIKETI,
  SAYAC_OGESI,
  SAYAC_SATIRI,
  SAYAC_SAYISI,
} from '../components/sosyal/ProfilKimlikKalibi';
import { KAPAK_BANDI_SINIFI } from '../lib/kapak-orani';
import {
  FotografPaylasGirisi,
  type FotografPaylasKolu,
} from '../components/sosyal/FotografPaylasGirisi';

/**
 * ŞİRKET PROFİLİ — TEK BİLEŞEN, İKİ YETKİ DURUMU
 *
 * Öğrenci profiliyle (`SosyalProfilGorunumu`) aynı kural: sahip görünümü
 * ve ziyaretçi görünümü AYRI BİLEŞENE ÇOĞALTILMIYOR. Sahibe özel her şey
 * (İlan paylaş, Fotoğraf paylaş, Profili düzenle, Öğrencinin gördüğü
 * sayfa, ilan yönetimi) `sahip` nesnesinin İÇİNDE çiziliyor; ziyaretçi
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
 * `ziyaretciEylemi` yalnız `sahip` VERİLMEDİĞİNDE çiziliyor ve logonun
 * sağındaki hap sırasında, öğrenci profilindeki "Bağlantı kur" ile aynı
 * yerde duruyor (X kalıbı, 24 Eylül 2026).
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
 * BEYAZ HALKA, ROZET YOK
 * ---------------------
 * Logo çevresindeki halka X kalıbındaki beyaz ayraç (`ring-4 ring-white`):
 * logoyu bandın üstünde ayırıyor, anlam taşımıyor. "Doğrulanmış" rozeti
 * bilerek YOK:
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

/*
  Başlığın hapları `ProfilKimlikKalibi`nden (X kalıbı, üç profil ekranı
  aynı modül). `IKINCIL` yalnız başlığın DIŞINDAKİ panel düğmelerinde
  (boş durum, Hakkımızda) kalıyor: onlar hap sırasının parçası değil.
*/
const IKINCIL = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-900 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;
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
 *
 * KIRIKLIK DURUMU DIŞARIDA: aynı adres bandın bulanık zemininde de
 * kullanılıyor ve ikisi AYNI kararı vermek zorunda — logo baş harfe
 * düşmüşken arkada o adresin bulanık hâli durmamalı. Bu yüzden `bozuk`
 * burada değil, bandı çizen bileşende tutuluyor.
 */
const SirketLogosu: React.FC<{
  url: string | null;
  ad: string;
  bozuk: boolean;
  onBozuk: () => void;
}> = ({ url, ad, bozuk, onBozuk }) => {
  /*
    ÖLÇÜ BASAMAKLARI ÖĞRENCİ AVATARIYLA AYNI (kullanıcı isteği, 20 Eylül
    2026): `SosyalProfilGorunumu` dairesi 80 → 112 (sm) → 144 (lg)
    pikselken şirketinki 80 → 96 (sm) idi ve `lg` basamağı hiç yoktu;
    yan yana bakılan iki profil ekranı farklı büyüklükte daire
    gösteriyordu. Ölçü eşitlendi: `sm:h-24 w-24` yerine `sm:h-28 w-28`,
    üstüne `lg:h-36 w-36`. Mobil 80 pikselde AYNEN kaldı (zaten eşitti).

    HALKA X KALIBINDA (24 Eylül 2026): logo artık bandın alt kenarına
    biniyor; eski `ring-2 ring-blue-600 ring-offset-2` bandın üstünde mavi
    bir çember ve beyaz bir boşluk bırakıyordu. Üç ekran aynı beyaz ayracı
    (`ring-4 ring-white`) taşıyor. `bg-white` kalıyor: saydam logolar
    bandın rengine karışmasın.
  */
  const olcu =
    'flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-4 ring-white sm:h-28 sm:w-28 lg:h-36 lg:w-36';

  if (!url || bozuk) {
    /*
      Baş harf daireyle birlikte büyüyor: mevcut basamak zaten her
      kırılımda bir adımdı (text-3xl → sm:text-4xl), yeni `lg` dairesi
      için aynı mantıkla bir adım daha eklendi (lg:text-5xl). Harf/daire
      oranı 30/80, 36/112 ve 48/144 — üçü de dairenin içinde kalıyor.
    */
    return (
      <span
        className={`${olcu} text-3xl font-black text-blue-900 sm:text-4xl lg:text-5xl`}
        aria-hidden
      >
        {basHarf(ad)}
      </span>
    );
  }
  return (
    <span className={olcu}>
      <img
        src={url}
        alt={`${ad} logosu`}
        onError={onBozuk}
        className="h-full w-full object-contain p-1.5"
      />
    </span>
  );
};

/**
 * Tek sayaç — satır içi (X kalıbı), üç durum ayrı.
 *
 * "Alınamadı" ile "sıfır" aynı yere düşmüyor: hata dalı sayı değil tire
 * basıyor ve etiketin yanında "alınamadı" yazıyor. `aria-busy` yükleniyor
 * dalında; iskelet sayı genişliğinde, kutu `min-h-11` olduğu için sayı
 * gelince satır zıplamıyor.
 */
const Sayac: React.FC<{ etiket: string; deger: SayacDurumu }> = ({ etiket, deger }) => (
  <div className={SAYAC_OGESI} aria-busy={deger.durum === 'yukleniyor' || undefined}>
    <dd className={`order-1 ${SAYAC_SAYISI}`}>
      {deger.durum === 'hazir' ? (
        deger.deger
      ) : deger.durum === 'yukleniyor' ? (
        <span aria-hidden className="inline-block h-4 w-5 animate-pulse rounded bg-gray-100 align-middle" />
      ) : (
        <span aria-hidden>—</span>
      )}
    </dd>
    <dt className={`order-2 ${SAYAC_ETIKETI}`}>
      {etiket}
      {deger.durum === 'hata' && <span className="text-xs text-gray-500"> alınamadı</span>}
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
  const [logoBozuk, setLogoBozuk] = React.useState(false);
  React.useEffect(() => setLogoBozuk(false), [kimlik.logoUrl]);
  /*
    Bandın bulanık zemini logonun TA KENDİSİ, ikinci bir görsel değil:
    aynı `src` verildiği için tarayıcı aynı kaynağı yeniden istemiyor.
    Logo yoksa ya da adres kırıksa zemin de yok — bulanıklaştıracak
    görsel olmadığında uydurma bir doku/gradyan konmuyor, bant beyaz
    kalıyor ve ortada baş harf dairesi duruyor.
  */
  const bulanikZemin = kimlik.logoUrl && !logoBozuk ? kimlik.logoUrl : null;
  const paylasKolu = React.useRef<FotografPaylasKolu>(null);
  const site = guvenliDisAdres(kimlik.siteUrl);
  const siteKonagi = site ? new URL(site).hostname.replace(/^www\./, '') : null;

  /*
    ETİKET "ŞİRKETTEN KARELER", KİMLİK 'paylasimlar' (kullanıcı bildirimi,
    20 Eylül 2026): sekme "Paylaşımlar" yazıyor, hemen altındaki başlık da
    "Şirketten kareler" yazıyordu — aynı bölüm iki kez adlandırılmıştı.
    Bölümün adı tek yerde, sekmenin üstünde kaldı. İÇ KİMLİK DEĞİŞMEDİ:
    `sekme === 'paylasimlar'`, `sirket-sekme-paylasimlar` ve panel id'leri
    aynı; paylaşılmış bağlantılar ve testler bu kimliklere bakıyor.

    ETİKET TELEFONDA İKİ SATIRA SARIYOR — ölçüldü: 375 ve 390 pikselde
    sekme 125/130 piksel, etiketin tek satır genişliği 115 piksel ve
    `px-2` ile 109/114 piksel yer kalıyor, yani metin iki satıra iniyor
    (430 pikselden itibaren tek satır). Kırpılma YOK, yatay taşma 0 ve
    sekme yüksekliği 44 pikselde kalıyor (iki satır 40 piksel), yani
    dokunma hedefi ve çubuk yüksekliği değişmiyor. Kısaltma bir ürün
    kararı: adı kullanıcı seçti, kendiliğinden "Kareler"e indirilmedi.
  */
  const sekmeler: { id: SirketSekmesi; etiket: string }[] = [
    { id: 'paylasimlar', etiket: 'Şirketten kareler' },
    { id: 'ilanlar', etiket: 'İlanlar' },
    { id: 'hakkimizda', etiket: 'Hakkımızda' },
  ];

  /*
    Paylaşım giriş düğmesi: FotografPaylasGirisi'nin kendisi — aynı
    seçici, aynı besteci (öğrenci profiliyle ve Ağım'la aynı yol). Kitle
    sabit 'sirket'; besteci seçici çizmiyor.

    Yeri artık sekmenin altı değil, sahibin eylem satırı: düğme "Şirketten
    kareler" başlığıyla birlikte ayrı bir şerit kaplıyordu, başlık kalkınca
    tek başına kalacaktı. `sahip && paylasabilirMi` koşulu değişmedi —
    ziyaretçi dalında bileşen hiç kurulmuyor, DOM'a girmiyor.

    Sıra kullanıcının kararı (20 Eylül 2026): İlan paylaş, Fotoğraf paylaş,
    Profili düzenle. X kalıbında (24 Eylül 2026) düğme hap sırasında
    yuvarlak bir ikon düğmesi (`IKON_HAP`): etiket verilmiyor, anlamı
    bileşenin kendi `aria-label="Fotoğraf paylaş"`ı taşıyor. Gerekçe
    (telefonda üç metinli hap sığmıyor) başlıktaki hap sırası yorumunda.
  */
  const paylasGirisi = sahip && sahip.paylasabilirMi && (
    <FotografPaylasGirisi
      ref={paylasKolu}
      hazirMi
      paylasabilirMi
      onNavigate={onNavigate}
      onTamamlandi={sahip.onPaylasimEklendi}
      sabitKitle="sirket"
      ikonSinifi="h-5 w-5"
      dugmeSinifi={IKON_HAP}
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
      <header className="border-b border-gray-200 bg-white sm:overflow-hidden sm:rounded-2xl sm:border">
        {/*
          ÜST BANT — ZEMİNİ LOGONUN BULANIK HÂLİ (X kalıbı, 24 Eylül 2026)

          Şirketin kapak kolonu yok. Bulanık logo zemini eskiden kimlik
          metinlerinin ARKASINDAYDI; X kalıbında metin bandın altına indi,
          zemin de öğrenci kapağıyla AYNI oranlı bir banda taşındı (3:1,
          lg'de 5:1 — sınıf `lib/kapak-orani`dan, tek yerde). Üç profil
          ekranının üst bandı bu yüzden aynı yükseklikte.

          Kalıp tam ekran görüntüleyicideki gibi: görsel `object-cover` ile
          bandı dolduruyor, `blur-2xl` ile bulanıklaşıyor, `scale-110`
          bulanıklığın kenarda açtığı şeffaf şeridi bandın dışına atıyor,
          bant `overflow-hidden` ile kırpıyor.

          BEYAZ ÖRTÜ KALKTI: %85'lik örtü, bandın ÜSTÜNDEKİ metinlerin
          (ad, @ad, site bağlantısı) kontrastı için seçilmişti. Bandın
          üstünde artık metin yok; örtü yalnız logonun rengini
          soldururdu.

          Logo yoksa ya da adres kırıksa zemin de yok: bant nötr
          `bg-gray-100` — stok görsel, doku ya da gradyan KONMUYOR.
        */}
        <div className={`relative w-full overflow-hidden bg-gray-100 ${KAPAK_BANDI_SINIFI}`}>
          {bulanikZemin && (
            <img
              src={bulanikZemin}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
            />
          )}
        </div>

        {/* ------------------------------------------- kimlik bandı */}
        <div className={KIMLIK_BANDI}>
          <div className={AVATAR_SATIRI}>
            {/* Logo banda yarı yarıya biniyor; `relative` kap bandın ÜSTÜNDE çizdiriyor. */}
            <div className={AVATAR_BINMESI}>
              <SirketLogosu
                url={kimlik.logoUrl}
                ad={kimlik.ad}
                bozuk={logoBozuk}
                onBozuk={() => setLogoBozuk(true)}
              />
            </div>

            {/*
              HAP SIRASI — logo satırının sağı, alt hiza (X'teki "Edit
              profile" / "Follow" yeri).

              ZİYARETÇİ: tek eylem, "Takip et". Görünüm düğmeyi kendisi
              çizmiyor; yuvayı YALNIZ sahip yokken açıyor, düğmeyi ziyaretçi
              kabı veriyor (bakan sayfanın sahibiyse hiç vermiyor).

              SAHİP: İlan paylaş → Fotoğraf paylaş → Profili düzenle
              (kullanıcının 20 Eylül sırası; düzenleme X'teki gibi en sağda).

              TELEFONDA NE YAPILDI (karar bu işte verildi): üç metinli hap
              telefonda logonun yanına sığmıyor. Ölçüldü (Chromium, yerleşim
              genişliği 360): logonun yanında 236 piksel kalıyor; "İlan
              paylaş" 123.6 + metinli "Fotoğraf paylaş" 156.1 (öğrenci
              ekranındaki aynı hap) + "Profili düzenle" 128.7 + aralar 12 =
              420.4 piksel. Aşağıdaki hâliyle 48 + 44 + 128.7 + 12 = 232.7,
              tek satır. X'in
              yolu "tek hap + taşma menüsü"; burada taşma menüsü KURULMADI,
              çünkü yeni bir açılır menü yeni bir odak/kapanış davranışı
              demek ve bu işin konusu düzen. Onun yerine:
                - İlan paylaş telefonda yalnız ikon (metin `sr-only`, `sm:`
                  üstünde görünür),
                - Fotoğraf paylaş her ekranda yuvarlak ikon düğmesi —
                  `FotografPaylasGirisi` zaten `aria-label="Fotoğraf
                  paylaş"` taşıyor,
                - Profili düzenle metinli.
              Üçü de her zaman görünür ve tek dokunuşla ulaşılıyor; sıra
              yine `flex-wrap` taşıyor, sığmazsa alt satıra iniyor, kesilmiyor.
            */}
            <div className={HAP_SIRASI}>
              {!sahip && ziyaretciEylemi && (
                <>{ziyaretciEylemi}</>
              )}
              {sahip && (
                <>
                  <a
                    href={sahip.ilanOlusturYolu}
                    onClick={icTiklama(onNavigate, sahip.ilanOlusturYolu)}
                    className={HAP_BIRINCIL}
                  >
                    <Briefcase aria-hidden className="h-4 w-4 shrink-0" />
                    <span className="sr-only sm:not-sr-only">İlan paylaş</span>
                  </a>
                  {paylasGirisi}
                  <a
                    href={sahip.duzenleYolu}
                    onClick={icTiklama(onNavigate, sahip.duzenleYolu)}
                    className={HAP}
                  >
                    Profili düzenle
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Ad + "Şirket hesabı" rozeti; `break-words`: uzun ad kırpılmıyor, sarılıyor. */}
          <div className="mt-3 flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="min-w-0 break-words text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
              {kimlik.ad}
            </h1>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${RENK_PRIMARY.yumusakZemin} ${RENK_PRIMARY.metin}`}
            >
              Şirket hesabı
            </span>
          </div>
          {kullaniciAdi && (
            <p className="mt-0.5 max-w-full truncate text-sm text-gray-600 sm:text-base">@{kullaniciAdi}</p>
          )}

          {/*
            AÇIKLAMA — X sırası: ad bloğunun altında, meta satırının üstünde.
            `line-clamp-3`: tam metni "Hakkımızda" sekmesi taşıyor.
          */}
          {kimlik.aciklama && <p className={`${BIYOGRAFI} line-clamp-3`}>{kimlik.aciklama}</p>}

          {/*
            META SATIRI — sektör, konum, çalışan sayısı, site; ikonlu, gri,
            sarıyor. Girilmemiş bilgi UYDURULMUYOR: öğe yoksa çizilmiyor.

            Site adresi güvenli mutlak HTTPS'e çevriliyor (`guvenliDisAdres`);
            çevrilemeyen adres hiç çizilmiyor. Konak adı `break-all`: uzun
            adres telefonda taşmıyor. Bağlantı `min-h-11`: 44 piksellik
            dokunma hedefi.
          */}
          {(kimlik.sektor || kimlik.konum || kimlik.calisanSayisi || (site && siteKonagi)) && (
            <div className={META_SATIRI}>
              {kimlik.sektor && (
                <MetaOgesi ikon={Briefcase} etiket="Sektör">
                  {kimlik.sektor}
                </MetaOgesi>
              )}
              {kimlik.konum && (
                <MetaOgesi ikon={MapPin} etiket="Konum">
                  {kimlik.konum}
                </MetaOgesi>
              )}
              {kimlik.calisanSayisi && (
                <MetaOgesi ikon={Users} etiket="Çalışan sayısı">
                  {kimlik.calisanSayisi} çalışan
                </MetaOgesi>
              )}
              {site && siteKonagi && (
                <a
                  href={site}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex min-h-11 max-w-full items-center gap-1 font-semibold ${RENK_PRIMARY.metin} hover:underline ${ODAK_HALKASI}`}
                >
                  <LinkIkonu aria-hidden className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-all">{siteKonagi}</span>
                </a>
              )}
            </div>
          )}

          {/* SAYAÇ SATIRI — tek satır, satır içi; dikey çizgi ve üç sütunlu ızgara yok (X). */}
          <dl className={SAYAC_SATIRI}>
            <Sayac etiket="paylaşım" deger={sayaclar.paylasim} />
            <Sayac etiket="aktif ilan" deger={sayaclar.aktifIlan} />
            <Sayac etiket="takipçi" deger={sayaclar.takipci} />
          </dl>

          {bildirim && (
            <p role="status" className="mt-3 text-sm font-semibold text-gray-700">
              {bildirim}
            </p>
          )}
        </div>
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
          {/*
            BAŞLIK YOK, ŞERİT DE YOK

            Burada "Şirketten kareler" diye bir `h2` ve yanında Fotoğraf
            paylaş düğmesi duruyordu. Sekme aynı bölümü zaten adlandırdığı
            için başlık aynı metni ikinci kez yazıyordu; düğme sahibin
            eylem satırına taşındı. İkisi de gidince kapsayıcı `div` boş
            kalacak ve `space-y-3` ölü bir boşluk bırakacaktı — bu yüzden
            kabın kendisi silindi, `sr-only` bir başlık da konmadı:
            `aria-labelledby` zaten sekme düğmesini (`sirket-sekme-
            paylasimlar`) gösteriyor, panelin erişilebilir adı oradan
            geliyor ve ikinci bir ad ekran okuyucuda tekrar olurdu.
          */}
          {sahip?.paylasimEngeli && (
            <p role="status" className={`${KART} mx-4 text-sm leading-relaxed text-gray-600 sm:mx-0`}>
              {sahip.paylasimEngeli}
            </p>
          )}

          {paylasimDurumu === 'hazir' && paylasimlar.length === 0 ? (
            /*
              BOŞ DURUM: stok görsel yok, iskelet yok. Sahipte eylem
              düğmesi eylem satırındaki girişin AYNI seçicisini açıyor
              (`paylasKolu` ile), ikinci bir besteci kurulmuyor — giriş
              artık üstteki eylem satırında çiziliyor ama kol aynı
              bileşene bağlı olduğu için mekanizma değişmedi. Ziyaretçide
              yalnız cümle.
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
