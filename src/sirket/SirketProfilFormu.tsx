import React from 'react';
import { AlertTriangle, BadgeCheck, Check, ChevronDown, ExternalLink, Link2, Upload } from 'lucide-react';
import {
  ALAN,
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_KENAR_VURGU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  SIRKET_ZEMIN,
  alanStil,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { vknGecerli } from '../lib/sirket-kademe.mjs';
import { AutocompleteField } from '../components/AutocompleteField';
import { FORM_ALAN, UzayanMetin } from './form-parcalari';
import { TR_CITIES } from '../data/turkeyData';
import { sektorleriGetir } from '../lib/queries/sosyal';
import {
  PROFIL_ALANLARI,
  profilTamamlanmaOrani,
  sirketLogosuYukle,
  sirketProfiliKaydet,
  sirketProfiliOku,
  vknKaydet,
  type SirketBaglami,
  type SirketProfilDegeri,
} from '../lib/sirket-veri';

/**
 * Şirket profili ve doğrulama.
 *
 * ÖĞRENCİ BU SAYFAYI GÖRÜYOR
 * --------------------------
 * Buradaki alanlar /sirket/<slug> adresinde herkese açık. Öğrenci ilana
 * bakmadan önce şirketi tanıyor; logosu ve tanıtımı olmayan bir şirket,
 * "bu gerçek mi" sorusunu doğuruyor.
 *
 * YEDİ ALAN, FAZLASI DEĞİL
 * ------------------------
 * Form yalnızca `companies` tablosunda GERÇEKTEN olan sütunları soruyor.
 * "Çalışma kültürü", "yan haklar", "departmanlar", "sosyal medya" gibi
 * alanlar tabloda yok; form onları sorsaydı doldurulan bilgi kaydedilmeden
 * kaybolurdu.
 *
 * TAMAMLANMA ORANI HESAPLANIYOR
 * -----------------------------
 * Yüzde uydurma değil: dolu alan / yedi. Hesaplanamayan bir yüzde
 * göstermek, ilerleme çubuğunu süse çevirirdi.
 */

const BOYUTLAR = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

/*
  KOMPAKT FORM (27 Eylül 2026, kullanıcı isteği)
  ----------------------------------------------
  Üç ayrı büyük kart yerine tek form kartı, ince ayraçlı bölümler. Kısa
  alanlar sm üstünde iki sütun, telefonda tek sütun. Kayıt hiçbir alanı
  zorunlu tutmuyor (boş alan `null` yazılıyor) — bu yüzden her alanın
  yanında "isteğe bağlı" yazıyor; yalnız dolu alanlar profil tamamlama
  oranını artırıyor.

  Alan boyu ve uzayan metin kutusu `form-parcalari.tsx`'te: ilan formu da
  aynılarını kullanıyor.
*/

/** Etiket + "isteğe bağlı" + (varsa) tek satırlık kısa not. */
const Alan: React.FC<{ etiket: string; htmlFor: string; not?: string; children: React.ReactNode }> = ({
  etiket,
  htmlFor,
  not,
  children,
}) => (
  <div className="min-w-0">
    <label htmlFor={htmlFor} className="mb-1 flex items-baseline justify-between gap-2">
      <span className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
        {etiket}
      </span>
      <span className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
        isteğe bağlı
      </span>
    </label>
    {children}
    {not && (
      <p className="mt-1 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
        {not}
      </p>
    )}
  </div>
);

export const SirketProfilFormu: React.FC<{
  baglam: SirketBaglami;
  userId: string | null;
  onKaydedildi: () => void;
  /** Şirket kaydı yokken sahiplenme akışına gidiş (SirketPaneli'nden). */
  onNavigate?: (yol: string) => void;
  /**
   * Üst özet kartını çizme. Profil sekmesi kimliği kendi kartında
   * (SirketKimlikKarti) gösteriyor; aynı logo ve ad iki kez alt alta
   * durmasın. Tamamlanma yüzdesi de o karta taşındı.
   */
  ozetsiz?: boolean;
}> = ({ baglam, userId, onKaydedildi, onNavigate, ozetsiz = false }) => {
  const [deger, setDeger] = React.useState<SirketProfilDegeri | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'kaydediliyor' | 'tamam' | 'hata'>(
    'yukleniyor'
  );
  const [hata, setHata] = React.useState('');
  /*
    KAYDEDİLMEMİŞ DEĞİŞİKLİK VAR MI

    Mobil kaydet çubuğu ve "kaydedildi" mesajı buna bakıyor. İlk okunan
    değer saklanıyor; kullanıcı bir alanı değiştirip geri aldığında çubuk
    yeniden kayboluyor.
  */
  const [ilkDeger, setIlkDeger] = React.useState<SirketProfilDegeri | null>(null);
  /*
    SEKTÖR ÖNERİLERİ GERÇEK LİSTEDEN: sitenin kendi `sectors` tablosu
    (öğrenci alanlarıyla aynı terminoloji, aktif olanlar, sıralı). Liste
    kapalı değil: kayıtlı ya da yazılan başka bir sektör de kaydediliyor.
    Liste alınamazsa alan düz metin olarak çalışmaya devam ediyor.
  */
  const [sektorler, setSektorler] = React.useState<string[]>([]);
  React.useEffect(() => {
    let iptal = false;
    sektorleriGetir()
      .then((liste) => {
        if (!iptal) setSektorler(liste.map((x) => x.ad));
      })
      .catch(() => {
        /* Öneri yok; alan yine yazılabilir. */
      });
    return () => {
      iptal = true;
    };
  }, []);
  const kimlik = React.useId();
  const degisti = Boolean(deger && ilkDeger && JSON.stringify(deger) !== JSON.stringify(ilkDeger));

  React.useEffect(() => {
    let iptal = false;
    if (!baglam.companyId) return;
    sirketProfiliOku(baglam.companyId)
      .then((p) => {
        if (!iptal) {
          setDeger(p);
          setIlkDeger(p);
          setDurum('hazir');
        }
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [baglam.companyId]);

  const yaz = (alan: keyof SirketProfilDegeri) => (v: string) => {
    /* Kullanıcı yazmaya başlayınca eski "Kaydedildi." mesajı kalkıyor;
       yoksa yeni değişiklik kaydedilmiş gibi görünüyordu. */
    setDurum((d) => (d === 'tamam' || d === 'hata' ? 'hazir' : d));
    setDeger((o) => (o ? { ...o, [alan]: v } : o));
  };

  const kaydet = async () => {
    if (!deger || !baglam.companyId) return;
    setDurum('kaydediliyor');
    setHata('');
    try {
      await sirketProfiliKaydet(baglam.companyId, deger);
      setIlkDeger(deger);
      setDurum('tamam');
      onKaydedildi();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi.');
      setDurum('hata');
    }
  };

  /*
    ŞİRKET KAYDI YOKSA İSKELET DEĞİL, CÜMLE

    `companyId` boşken yükleme efekti hiç başlamıyor ve `durum`
    'yukleniyor'da kalıyordu: kullanıcı Şirket sekmesinde sonsuza kadar
    tek bir `animate-pulse` çubuk görüyordu (mobil ekran görüntüsünde
    ölçüldü). Bekleyen bir istek yok; o yüzden aria-busy da yok. Eylem
    uydurulmadı: sahiplenme akışı zaten var (/isveren/ilan-ver), ona
    gidiyor.
  */
  if (!baglam.companyId) {
    return (
      <div className={KUTU} style={kutuStil}>
        <p className="font-bold" style={{ color: SIRKET_METIN }}>
          Bu hesaba bağlı bir şirket kaydı yok
        </p>
        <p className="mt-1 max-w-xl text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          Profil ve doğrulama, hesabınız bir şirkete üye olunca açılıyor. StajımVar&apos;da
          görünen şirket sayfanızı sahiplenmek için talep gönderebilirsiniz.
        </p>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('/isveren/ilan-ver')}
            className={`mt-4 ${IKINCIL_DUGME}`}
            style={ikincilStil}
          >
            Şirketini sahiplen
          </button>
        )}
      </div>
    );
  }

  if (!deger) {
    return (
      <div className={KUTU} style={kutuStil} aria-busy={durum === 'yukleniyor'}>
        <span
          className="block h-5 w-40 animate-pulse rounded"
          style={{ background: SIRKET_ROZET }}
        />
      </div>
    );
  }

  const oran = profilTamamlanmaOrani(deger);
  const eksikler = PROFIL_ALANLARI.filter((a) => !String(deger[a] ?? '').trim());
  const kaydedilebilir = durum !== 'kaydediliyor' && degisti;

  return (
    /* Alt boşluk sabit çubuğa göre: çubuk çizilmiyorken fazladan boşluk
       bırakmak sayfayı sebepsiz uzatırdı. */
    <div className={`space-y-4 lg:pb-0 ${degisti ? 'pb-36' : 'pb-20'}`}>
      {/* ------------------------------------------------------ üst özet */}
      {!ozetsiz && (
        <ProfilOzeti
          baglam={baglam}
          oran={oran}
          eksikler={eksikler}
          logoUrl={deger.logoUrl}
        />
      )}

      {/*
        YATAYA YAYILAN DÜZEN (27 Eylül 2026, kullanıcı isteği): form 640 px'te
        sınırlıyken geniş ekranın sağı boş kalıyordu. Form kalan genişliği
        alıyor, önizleme 340 px. xl'de (≥1280) kartın içi iki panel: solda
        logo ve "Şirket hakkında" (okunur satır uzunluğu), sağda kısa alanlar.
        Telefon ve tablette sıra aynı: logo → kısa alanlar → hakkında.
      */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-5">
        <div className="min-w-0 space-y-4">
          <section className={KUTU} style={kutuStil} aria-labelledby={`${kimlik}-baslik`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id={`${kimlik}-baslik`} className="text-base font-black" style={{ color: SIRKET_METIN }}>
                Şirket bilgileri
              </h2>
              {/* Eksik alan sayacı: dolu alan / yedi (profilTamamlanmaOrani ile aynı liste). */}
              <p className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                Tüm alanlar isteğe bağlı ·{' '}
                {eksikler.length === 0 ? 'hepsi dolu' : `${eksikler.length} alan boş`}
              </p>
            </div>

            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] xl:gap-x-8">
            {/* --------------------------------------------------- logo */}
            <div className="mt-4 xl:col-start-1 xl:row-start-1">
              <LogoAlani
                deger={deger.logoUrl}
                sirketAdi={baglam.ad}
                companyId={baglam.companyId}
                userId={userId}
                onDegis={yaz('logoUrl')}
                kimlik={`${kimlik}-logo`}
              />
            </div>

            {/* ------------------------------------------ kısa alanlar */}
            <div
              className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:content-start xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"
              style={{ borderColor: SIRKET_KENAR }}
            >
              <Alan etiket="Sektör" htmlFor={`${kimlik}-sektor`}>
                <AutocompleteField
                  id={`${kimlik}-sektor`}
                  value={deger.industry}
                  onChange={yaz('industry')}
                  options={sektorler}
                  placeholder="Ör. Bilişim ve Yazılım"
                  className={FORM_ALAN}
                  klavyeDuzeni
                />
              </Alan>
              <Alan etiket="Konum" htmlFor={`${kimlik}-konum`}>
                <AutocompleteField
                  id={`${kimlik}-konum`}
                  value={deger.location}
                  onChange={yaz('location')}
                  options={TR_CITIES}
                  placeholder="Ör. İstanbul"
                  className={FORM_ALAN}
                  klavyeDuzeni
                />
              </Alan>
              <Alan etiket="Çalışan sayısı" htmlFor={`${kimlik}-boyut`}>
                <select
                  id={`${kimlik}-boyut`}
                  value={deger.size}
                  onChange={(e) => yaz('size')(e.target.value)}
                  className={FORM_ALAN}
                >
                  <option value="">Seçilmedi</option>
                  {/* Kayıtlı değer listede yoksa kaybolmasın. */}
                  {deger.size && !BOYUTLAR.includes(deger.size) && <option value={deger.size}>{deger.size}</option>}
                  {BOYUTLAR.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Alan>
              <Alan etiket="Web sitesi" htmlFor={`${kimlik}-site`}>
                <input
                  id={`${kimlik}-site`}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  value={deger.websiteUrl}
                  onChange={(e) => yaz('websiteUrl')(e.target.value)}
                  placeholder="https://sirketiniz.com"
                  className={FORM_ALAN}
                />
              </Alan>
              <Alan etiket="İK e-postası" htmlFor={`${kimlik}-ik`} not="Öğrenciye gösterilmez.">
                <input
                  id={`${kimlik}-ik`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={deger.hrEmail}
                  onChange={(e) => yaz('hrEmail')(e.target.value)}
                  placeholder="ik@sirketiniz.com"
                  className={FORM_ALAN}
                />
              </Alan>
            </div>

            {/* ---------------------------------------- şirket hakkında */}
            <div className="mt-4 border-t pt-4 xl:col-start-1 xl:row-start-2" style={{ borderColor: SIRKET_KENAR }}>
              <Alan etiket="Şirket hakkında" htmlFor={`${kimlik}-hakkinda`}>
                <UzayanMetin
                  id={`${kimlik}-hakkinda`}
                  value={deger.description}
                  onChange={yaz('description')}
                  placeholder="Ne yapıyorsunuz, stajyer nasıl bir ekibe katılacak?"
                />
              </Alan>
              <p className="mt-1 text-right text-xs tabular-nums" style={{ color: SIRKET_METIN_IKINCIL }}>
                {deger.description.trim().length} karakter
              </p>
            </div>
            </div>

            {/*
              KAYDET MASAÜSTÜNDE FORMUN DİBİNDE, MOBİLDE SABİT

              Mobilde form uzun ve düğme en altta kalıyordu; alan doldurup
              yukarı bakan biri kaydetmeden çıkabiliyordu. Alt çubuk yalnızca
              DEĞİŞİKLİK VARSA çiziliyor — sürekli duran bir çubuk, alt
              menüyle birlikte ekranın dörtte birini yiyordu. Masaüstünde
              ayrı bir kart değil, form kartının son satırı.
            */}
            <div className="mt-4 hidden border-t pt-4 lg:block" style={{ borderColor: SIRKET_KENAR }}>
              <KaydetAlani
                durum={durum}
                hata={hata}
                kaydedilebilir={kaydedilebilir}
                degisti={degisti}
                onKaydet={() => void kaydet()}
                kartsiz
              />
            </div>
          </section>

          <Dogrulama baglam={baglam} onKaydedildi={onKaydedildi} />
        </div>

        {/* ------------------------------------- öğrenciye görünen profil */}
        <aside className="mt-4 lg:mt-0 lg:sticky lg:top-20">
          <OgrenciOnizleme baglam={baglam} deger={deger} eksikler={eksikler} />
        </aside>
      </div>

      {degisti && (
        <div
          /*
            Alt gezinme artık yapışık değil, yüzen bir hap: üst kenarı
            ekranın dibinden 68 piksel yukarıda (12px boşluk + 56px yükseklik).
            Kaydet çubuğu 64'te duruyordu ve hapın altına giriyordu.
            `sm`'den itibaren hap gizlendiği için çubuk dibe oturuyor.
          */
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 z-20 border-t px-4 py-3 lg:hidden"
          style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}
        >
          <KaydetAlani
            durum={durum}
            hata={hata}
            kaydedilebilir={kaydedilebilir}
            degisti={degisti}
            onKaydet={() => void kaydet()}
            sikisik
          />
        </div>
      )}
    </div>
  );
};

const ALAN_ADLARI: Record<keyof SirketProfilDegeri, string> = {
  logoUrl: 'logo',
  industry: 'sektör',
  size: 'çalışan sayısı',
  location: 'konum',
  websiteUrl: 'web sitesi',
  description: 'hakkımızda',
  hrEmail: 'İK e-postası',
};

/* --------------------------------------------------------- üst özet */

/**
 * Sayfanın üstündeki durum paneli.
 *
 * Önce yalnızca "%X tamamlandı" yazan bir satırdı. Şirket adı, doğrulama
 * durumu ve öğrenci görünümü bağlantısı dağınıktı; ekranın ne olduğu ilk
 * bakışta belli olmuyordu.
 *
 * ORAN GERÇEK: yedi sütunun kaçının dolu olduğu. Uydurma yüzde yok.
 */
const ProfilOzeti: React.FC<{
  baglam: SirketBaglami;
  oran: number;
  eksikler: (keyof SirketProfilDegeri)[];
  logoUrl: string;
}> = ({ baglam, oran, eksikler, logoUrl }) => (
  <section className={KUTU} style={kutuStil}>
    <div className="flex items-start gap-3">
      <LogoGorseli url={logoUrl} ad={baglam.ad} boyut="orta" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="truncate text-lg font-black" style={{ color: SIRKET_METIN }}>
            {baglam.ad || 'Şirketiniz'}
          </h1>
          {/* Doğrulanmamış şirkette rozet HİÇ çizilmiyor: olmayan bir
              güven işaretini soluk göstermek bile ima ederdi. */}
          {baglam.dogrulandi && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold"
              style={{
                borderColor: SIRKET_KENAR_VURGU,
                background: SIRKET_ROZET,
                color: SIRKET_VURGU_KOYU,
              }}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              Doğrulanmış kurum
            </span>
          )}
        </div>

        <p className="mt-0.5 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
          {oran === 100
            ? 'Profiliniz tamam. Öğrenci sizi eksiksiz görüyor.'
            : `${eksikler.length} alan eksik. Tamamlanan profil, öğrencinin şirketinize güvenmesini kolaylaştırır.`}
        </p>
      </div>
    </div>

    <div className="mt-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold" style={{ color: SIRKET_METIN }}>
          Profil tamamlanma
        </span>
        <span className="text-xs font-black tabular-nums" style={{ color: SIRKET_VURGU_KOYU }}>
          %{oran}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={oran}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profil tamamlanma oranı"
        style={{ background: SIRKET_ROZET }}
      >
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          /* Panelin marka mavisi geniş dolguda; yüzde yanında yazılı
             olduğu için anlam yalnızca renge bağlı değil. */
          style={{ width: `${oran}%`, background: SIRKET_VURGU }}
        />
      </div>

      {/*
        EKSİK ALAN HATA DEĞİL

        Kırmızı ve ünlem yok: bunlar doldurulmamış alanlar, yapılmış bir
        yanlış değil. Cezalandırıcı bir dil, ekrana dönme isteğini
        azaltırdı.
      */}
      {eksikler.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {eksikler.map((a) => (
            <li
              key={a}
              className="rounded-lg border px-2 py-0.5 text-[11px] font-semibold"
              style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN_IKINCIL }}
            >
              {ALAN_ADLARI[a]}
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
);

/* ------------------------------------------------------------- logo */

/** Logo görseli ya da baş harfler. Boşken de zarif duruyor. */
const LogoGorseli: React.FC<{ url: string; ad: string; boyut: 'orta' | 'buyuk' }> = ({
  url,
  ad,
  boyut,
}) => {
  const [bozuk, setBozuk] = React.useState(false);
  React.useEffect(() => setBozuk(false), [url]);

  const olcu = boyut === 'buyuk' ? 'h-16 w-16' : 'h-12 w-12';
  const yazi = boyut === 'buyuk' ? 'text-lg' : 'text-sm';
  const bosStil = { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU, borderColor: SIRKET_KENAR };

  if (!url.trim() || bozuk) {
    return (
      <span
        className={`grid ${olcu} shrink-0 place-items-center rounded-xl border font-black ${yazi}`}
        style={bosStil}
        aria-hidden
      >
        {basHarfler(ad)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt=""
      onError={() => setBozuk(true)}
      /* object-contain: kurum logoları kırpılmıyor. */
      className={`${olcu} shrink-0 rounded-xl border object-contain p-1`}
      style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
    />
  );
};

function basHarfler(ad: string): string {
  const parcalar = ad.trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return '?';
  return parcalar
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr-TR') ?? '')
    .join('');
}

/**
 * Logo alanı.
 *
 * GERÇEK YÜKLEME VAR
 * ------------------
 * `logos` kovası, yükleme politikası ve herkese açık okuma zaten
 * tanımlı; öğrenci avatarı da aynı yoldan yükleniyor. Bu yüzden burada
 * dosya seçimi GERÇEK — olmayan bir altyapıyı varmış gibi gösteren bir
 * düğme değil.
 *
 * ADRES ALANI KATLI (27 Eylül 2026): yüklenen logonun adresi çok uzun ve
 * kullanıcıya bir şey anlatmıyor; alan varsayılan ekranda yok. Logosu
 * kendi sitesinde duran şirket "Logo bağlantısı kullan" ile açıyor. İki
 * yol da aynı sütunu yazıyor; kayıtlı adres katlıyken de korunuyor
 * (değer formun durumunda, yalnız alan gizli).
 */
const LogoAlani: React.FC<{
  deger: string;
  sirketAdi: string;
  companyId: string | null;
  userId: string | null;
  onDegis: (v: string) => void;
  kimlik: string;
}> = ({ deger, sirketAdi, companyId, userId, onDegis, kimlik }) => {
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const [hata, setHata] = React.useState('');
  const [adresAcik, setAdresAcik] = React.useState(false);
  const girdiRef = React.useRef<HTMLInputElement>(null);

  const sec = async (dosya: File | undefined) => {
    if (!dosya || !companyId || !userId) return;
    setYukleniyor(true);
    setHata('');
    try {
      onDegis(await sirketLogosuYukle(companyId, userId, dosya));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Logo yüklenemedi.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
          Logo
        </span>
        <span className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
          isteğe bağlı
        </span>
      </div>

      <div className="flex items-center gap-3">
        <LogoGorseli url={deger} ad={sirketAdi} boyut="buyuk" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => girdiRef.current?.click()}
              disabled={yukleniyor || !companyId || !userId}
              className={IKINCIL_DUGME}
              style={ikincilStil}
            >
              <Upload className="h-4 w-4" />
              {yukleniyor ? 'Yükleniyor…' : deger ? 'Değiştir' : 'Logo yükle'}
            </button>
            {deger && (
              <button
                type="button"
                onClick={() => onDegis('')}
                className={IKINCIL_DUGME}
                style={ikincilStil}
              >
                Kaldır
              </button>
            )}
          </div>
          <p className="mt-1 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
            PNG, JPEG veya WEBP · en fazla 2 MB
          </p>
        </div>
      </div>

      <input
        ref={girdiRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void sec(e.target.files?.[0]);
          /* Aynı dosya yeniden seçilebilsin. */
          e.target.value = '';
        }}
      />

      <button
        type="button"
        aria-expanded={adresAcik}
        aria-controls={`${kimlik}-adres`}
        onClick={() => setAdresAcik((a) => !a)}
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <Link2 aria-hidden className="h-4 w-4" />
        Logo bağlantısı kullan
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${adresAcik ? 'rotate-180' : ''}`} />
      </button>
      {adresAcik && (
        <div id={`${kimlik}-adres`}>
          <label htmlFor={`${kimlik}-adres-girdi`} className="sr-only">
            Logo adresi
          </label>
          <input
            id={`${kimlik}-adres-girdi`}
            type="url"
            inputMode="url"
            value={deger}
            onChange={(e) => onDegis(e.target.value)}
            placeholder="https://sirketiniz.com/logo.png"
            className={FORM_ALAN}
          />
        </div>
      )}
      {hata && <p className="mt-1 text-xs font-semibold text-rose-700">{hata}</p>}
    </div>
  );
};

/* -------------------------------------------------- öğrenci önizlemesi */

/**
 * Öğrencinin gördüğü kartın kompakt karşılığı.
 *
 * Ekranın yalnızca bir yönetim formu olmadığını gösteriyor: doldurulan
 * her alanın karşılığı burada anında görünüyor. Herkese açık profilin
 * tam kopyası DEĞİL — kopya olsaydı iki yer birbirinden ayrı ayrı
 * eskirdi.
 */
const OgrenciOnizleme: React.FC<{
  baglam: SirketBaglami;
  deger: SirketProfilDegeri;
  eksikler: (keyof SirketProfilDegeri)[];
}> = ({ baglam, deger, eksikler }) => (
  <section className={`${KUTU} space-y-3`} style={kutuStil}>
    <div>
      <h2 className="text-sm font-black" style={{ color: SIRKET_METIN }}>
        Öğrenci ne görüyor?
      </h2>
      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
        İlanlarınızın yanında görünen kart.
      </p>
    </div>

    <div
      className="rounded-xl border p-3"
      style={{ borderColor: SIRKET_KENAR, background: SIRKET_ZEMIN }}
    >
      <div className="flex items-center gap-2.5">
        <LogoGorseli url={deger.logoUrl} ad={baglam.ad} boyut="orta" />
        <div className="min-w-0">
          <p className="truncate text-sm font-black" style={{ color: SIRKET_METIN }}>
            {baglam.ad || 'Şirketiniz'}
          </p>
          <p className="truncate text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
            {[deger.industry, deger.location].filter(Boolean).join(' · ') || 'Sektör ve konum yok'}
          </p>
        </div>
      </div>

      {deger.description.trim() && (
        <p
          className="mt-2 line-clamp-3 text-xs leading-relaxed"
          style={{ color: SIRKET_METIN_IKINCIL }}
        >
          {deger.description.trim()}
        </p>
      )}

      {deger.size.trim() && (
        <p className="mt-2 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
          {deger.size} çalışan
        </p>
      )}
    </div>

    {/*
      İkincil eylem: Kaydet düğmesini gölgelemiyor ama görünmez bir bağlantı
      da değil. Yeni sekmede açılıyor; form doldurulurken sayfa kaybolmasın.
    */}
    <a
      href={`/sirket/${baglam.slug}`}
      target="_blank"
      rel="noreferrer"
      className={`${IKINCIL_DUGME} w-full`}
      style={ikincilStil}
    >
      <ExternalLink className="h-4 w-4" />
      Profili önizle
    </a>

    {eksikler.length > 0 && (
      <p className="text-[11px] leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
        Eksik alanlar bu kartta boş görünüyor.
      </p>
    )}
  </section>
);

/* ------------------------------------------------------------- kaydet */

const KaydetAlani: React.FC<{
  durum: string;
  hata: string;
  kaydedilebilir: boolean;
  degisti: boolean;
  onKaydet: () => void;
  sikisik?: boolean;
  /** Başka bir kartın içinde: kendi çerçevesi yok, düğme ve durum tek satırda. */
  kartsiz?: boolean;
}> = ({ durum, hata, kaydedilebilir, degisti, onKaydet, sikisik, kartsiz }) => (
  <div
    className={sikisik ? 'flex items-center gap-3' : kartsiz ? 'flex flex-wrap items-center gap-x-4 gap-y-2' : `${KUTU} space-y-3`}
    style={sikisik || kartsiz ? undefined : kutuStil}
  >
    {!sikisik && durum === 'hata' && (
      <p className="text-sm font-semibold text-rose-700">{hata}</p>
    )}
    {!sikisik && durum === 'tamam' && (
      <p
        className="flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: SIRKET_VURGU_KOYU }}
      >
        <Check className="h-4 w-4" />
        Kaydedildi.
      </p>
    )}

    {sikisik && (
      <span className="min-w-0 flex-1 truncate text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
        {durum === 'hata' ? hata : 'Kaydedilmemiş değişiklik var'}
      </span>
    )}

    <button
      type="button"
      onClick={onKaydet}
      disabled={!kaydedilebilir}
      className={`${BIRINCIL_DUGME} ${sikisik ? '' : 'w-full sm:w-auto'}`}
      style={birincilStil}
    >
      {durum === 'kaydediliyor' ? 'Kaydediliyor…' : 'Profili kaydet'}
    </button>

    {!sikisik && !degisti && durum !== 'kaydediliyor' && (
      <p className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
        Kaydedilmemiş değişiklik yok.
      </p>
    )}
  </div>
);

/* ------------------------------------------------------------ doğrulama */

const Dogrulama: React.FC<{ baglam: SirketBaglami; onKaydedildi: () => void }> = ({
  baglam,
  onKaydedildi,
}) => {
  const [vkn, setVkn] = React.useState(baglam.vkn ?? '');
  const [mersis, setMersis] = React.useState('');
  const [durum, setDurum] = React.useState<'bos' | 'kaydediliyor' | 'tamam' | 'hata'>('bos');
  const [hata, setHata] = React.useState('');

  const bicimTamam = vknGecerli(vkn);

  if (baglam.dogrulandi) {
    return (
      <div className={KUTU} style={kutuStil}>
        <p className="flex items-center gap-2 font-bold" style={{ color: SIRKET_VURGU_KOYU }}>
          <BadgeCheck className="h-5 w-5" />
          Doğrulanmış kurum
        </p>
        <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          Başvuran kartları açık: adayların adı, okulu ve CV'si panele düşüyor.
        </p>
      </div>
    );
  }

  /*
    VKN GİRİLDİ AMA DOĞRULANMADI: İKİ AYRI HÂL

    Burası eskiden yalnız formu çiziyordu. VKN'yi kaydeden şirket aynı
    boş formu tekrar görüyor, "kaydoldu mu, bakan var mı" bilmiyordu —
    23 Eylül 2026'da bildirilen sorun tam olarak buydu. Üstelik kuyruk da
    yoktu; artık yönetici onay sayfasında "Doğrulama" sekmesi var.

    Ret, "bekliyor"dan ayrılıyor: reddedilen şirkete sebebi yazılıyor ve
    numarayı düzeltip yeniden gönderebiliyor (kayıt güncellenince kuyruğa
    geri düşüyor).
  */
  const reddedildi = Boolean(baglam.dogrulamaReddiAt);
  if (baglam.vkn && !reddedildi && durum !== 'tamam') {
    return (
      <div className={KUTU} style={kutuStil}>
        <p className="flex items-center gap-2 font-bold" style={{ color: SIRKET_METIN }}>
          <BadgeCheck className="h-5 w-5" />
          Doğrulama inceleniyor
        </p>
        <p className="mt-1 max-w-xl text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          VKN {baglam.vkn} kaydedildi ve yönetici kuyruğunda bekliyor. Ticari unvanla
          numaranın aynı kuruma ait olduğunu bir insan kontrol ediyor; sonucu burada
          göreceksin.
        </p>
      </div>
    );
  }

  const gonder = async () => {
    if (!bicimTamam || !baglam.companyId) return;
    setDurum('kaydediliyor');
    setHata('');
    try {
      await vknKaydet(baglam.companyId, vkn, mersis);
      setDurum('tamam');
      onKaydedildi();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi.');
      setDurum('hata');
    }
  };

  return (
    <div className={KUTU} style={kutuStil}>
      <p className="font-bold" style={{ color: SIRKET_METIN }}>
        Şirket doğrulama
      </p>
      {/*
        VAAT, GERÇEKLE AYNI OLMALI: burada "sonucu e-postayla yazıyoruz"
        yazıyordu, oysa doğrulama kararı için e-posta gönderen bir akış
        yok. Sonuç bu ekranda görünüyor; söylenen de o.
      */}
      <p className="mt-1 max-w-xl text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
        Doğrulama başvuran kartlarını açıyor. Ticari unvan ve VKN'yi alıp bir insan kontrol
        ediyor; sonucu bu sayfada göreceksin.
      </p>

      {reddedildi && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Doğrulama reddedildi{baglam.dogrulamaNotu ? `: ${baglam.dogrulamaNotu}` : '.'} Bilgileri
          düzeltip yeniden gönderebilirsin.
        </p>
      )}

      {/*
        ŞAHIS ŞİRKETİNDEN TCKN İSTENMİYOR

        Kimlik numarası staj ilanı açmak için gereken bir veri değil ve
        toplandığı anda korunması gereken bir yük oluyor. VKN yeterli.
      */}
      <div className="mt-4 grid max-w-lg gap-3 sm:grid-cols-2">
        <label className="block">
          <span
            className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            VKN
          </span>
          <input
            inputMode="numeric"
            maxLength={10}
            value={vkn}
            onChange={(e) => setVkn(e.target.value.replace(/\D/g, ''))}
            placeholder="10 haneli"
            className={`${ALAN} font-mono`}
            style={alanStil}
          />
          {vkn.length === 10 && !bicimTamam && (
            <span className="mt-1 block text-[11px] font-semibold text-rose-700">
              Bu numara doğrulamayı geçmiyor; bir hane hatalı olabilir.
            </span>
          )}
        </label>
        <label className="block">
          <span
            className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            MERSİS (isteğe bağlı)
          </span>
          <input
            value={mersis}
            onChange={(e) => setMersis(e.target.value)}
            className={`${ALAN} font-mono`}
            style={alanStil}
          />
        </label>
      </div>

      <p
        className="mt-3 flex max-w-xl items-start gap-2 text-[11px] leading-relaxed"
        style={{ color: SIRKET_METIN_IKINCIL }}
      >
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        VKN herkese açık bir bilgidir ve tek başına yetkili olduğunu kanıtlamaz; bu yüzden
        kaydetmek doğrulama demek değil. VKN öğrenciye hiçbir yerde gösterilmiyor.
      </p>

      {durum === 'hata' && <p className="mt-2 text-sm font-semibold text-rose-700">{hata}</p>}
      {durum === 'tamam' && (
        <p
          className="mt-2 flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: SIRKET_VURGU_KOYU }}
        >
          <Check className="h-4 w-4" />
          Kaydedildi. İnceleme kuyruğuna alındı.
        </p>
      )}

      <button
        type="button"
        onClick={() => void gonder()}
        disabled={!bicimTamam || durum === 'kaydediliyor'}
        className={`mt-4 ${BIRINCIL_DUGME}`}
        style={birincilStil}
      >
        {durum === 'kaydediliyor' ? 'Kaydediliyor…' : 'Doğrulamaya gönder'}
      </button>
    </div>
  );
};

export { SIRKET_KENAR };
