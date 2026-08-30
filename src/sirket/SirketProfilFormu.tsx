import React from 'react';
import { AlertTriangle, BadgeCheck, Check, ExternalLink, Upload } from 'lucide-react';
import {
  ALAN,
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_KENAR_GUCLU,
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

const Etiket: React.FC<{ children: React.ReactNode; ipucu?: string }> = ({ children, ipucu }) => (
  <span className="mb-1 block">
    <span className="text-xs font-bold" style={{ color: SIRKET_METIN }}>
      {children}
    </span>
    {ipucu && (
      <span className="ml-1.5 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
        {ipucu}
      </span>
    )}
  </span>
);

export const SirketProfilFormu: React.FC<{
  baglam: SirketBaglami;
  userId: string | null;
  onKaydedildi: () => void;
}> = ({ baglam, userId, onKaydedildi }) => {
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
      <ProfilOzeti
        baglam={baglam}
        oran={oran}
        eksikler={eksikler}
        logoUrl={deger.logoUrl}
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4">
        <div className="space-y-4">
          {/* --------------------------------------------- şirket kimliği */}
          <Blok
            baslik="Şirket kimliği"
            aciklama="Öğrencinin ilanınızdan önce gördüğü ilk şey."
          >
            <LogoAlani
              deger={deger.logoUrl}
              sirketAdi={baglam.ad}
              companyId={baglam.companyId}
              userId={userId}
              onDegis={yaz('logoUrl')}
            />

            <label className="block">
              <Etiket ipucu="Öğrenciler sizi doğru alanlarda keşfeder">Sektör</Etiket>
              <input
                value={deger.industry}
                onChange={(e) => yaz('industry')(e.target.value)}
                placeholder="Yazılım, Üretim, Perakende…"
                className={ALAN}
                style={alanStil}
              />
            </label>
          </Blok>

          {/* ------------------------------------------ kurumsal bilgiler */}
          <Blok
            baslik="Kurumsal bilgiler"
            aciklama="Şirketin nerede ve ne büyüklükte olduğunu anlatır."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <Etiket>Konum</Etiket>
                <input
                  value={deger.location}
                  onChange={(e) => yaz('location')(e.target.value)}
                  placeholder="İstanbul"
                  className={ALAN}
                  style={alanStil}
                />
              </label>
              <label className="block">
                <Etiket>Çalışan sayısı</Etiket>
                <select
                  value={deger.size}
                  onChange={(e) => yaz('size')(e.target.value)}
                  className={ALAN}
                  style={alanStil}
                >
                  <option value="">Seçilmedi</option>
                  {BOYUTLAR.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <Etiket ipucu="Kurumsal siteniz güveni kolaylaştırır">Web sitesi</Etiket>
              <input
                type="url"
                inputMode="url"
                value={deger.websiteUrl}
                onChange={(e) => yaz('websiteUrl')(e.target.value)}
                placeholder="https://sirketiniz.com"
                /*
                  Uzun adres kutuyu taşırmasın: `truncate` yerine yazı
                  boyutu ve `text-ellipsis` yok — girdi zaten kaydırıyor.
                  Burada yalnızca ölçü, ipucu metniyle birlikte veriliyor.
                */
                className={ALAN}
                style={alanStil}
              />
            </label>

            <label className="block">
              <Etiket ipucu="Öğrenciye gösterilmiyor">İK e-postası</Etiket>
              <input
                type="email"
                inputMode="email"
                value={deger.hrEmail}
                onChange={(e) => yaz('hrEmail')(e.target.value)}
                placeholder="ik@sirketiniz.com"
                className={ALAN}
                style={alanStil}
              />
            </label>
          </Blok>

          {/* --------------------------------------------- şirket hakkında */}
          <Blok
            baslik="Şirket hakkında"
            aciklama="Stajyerin nasıl bir ekibe katılacağını anlatan birkaç cümle."
          >
            <label className="block">
              <span className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold" style={{ color: SIRKET_METIN }}>
                  Hakkımızda
                </span>
                <span className="text-[11px] tabular-nums" style={{ color: SIRKET_METIN_IKINCIL }}>
                  {deger.description.trim().length} karakter
                </span>
              </span>
              <textarea
                value={deger.description}
                onChange={(e) => yaz('description')(e.target.value)}
                rows={5}
                placeholder="Şirketinizin ne yaptığını ve stajyerin nasıl bir ekibe katılacağını birkaç cümleyle anlatın."
                className="w-full rounded-xl border p-3 text-sm leading-relaxed outline-none placeholder:text-[#69796F]"
                style={alanStil}
              />
            </label>
          </Blok>

          {/*
            KAYDET MASAÜSTÜNDE AKIŞIN İÇİNDE, MOBİLDE SABİT

            Mobilde form uzun ve düğme en altta kalıyordu; alan doldurup
            yukarı bakan biri kaydetmeden çıkabiliyordu. Alt çubuk yalnızca
            DEĞİŞİKLİK VARSA çiziliyor — sürekli duran bir çubuk, alt
            menüyle birlikte ekranın dörtte birini yiyordu.
          */}
          <div className="hidden lg:block">
            <KaydetAlani
              durum={durum}
              hata={hata}
              kaydedilebilir={kaydedilebilir}
              degisti={degisti}
              onKaydet={() => void kaydet()}
            />
          </div>

          <Dogrulama baglam={baglam} onKaydedildi={onKaydedildi} />
        </div>

        {/* ------------------------------------- öğrenciye görünen profil */}
        <aside className="mt-4 lg:mt-0 lg:sticky lg:top-20">
          <OgrenciOnizleme baglam={baglam} deger={deger} eksikler={eksikler} />
        </aside>
      </div>

      {degisti && (
        <div
          className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-20 border-t px-4 py-3 lg:hidden"
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

/* ------------------------------------------------------------- bloklar */

/**
 * Form bloğu.
 *
 * Alanlar önce tek bir kartta alt alta diziliydi; ekran "doldurulacak
 * liste" gibi duruyordu. Başlıklı bloklar aynı alanları anlamlı
 * kümelere ayırıyor: kimlik, kurumsal bilgi, tanıtım.
 */
const Blok: React.FC<{
  baslik: string;
  aciklama?: string;
  children: React.ReactNode;
}> = ({ baslik, aciklama, children }) => (
  <section className={`${KUTU} space-y-4`} style={kutuStil}>
    <div>
      <h2 className="text-sm font-black" style={{ color: SIRKET_METIN }}>
        {baslik}
      </h2>
      {aciklama && (
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          {aciklama}
        </p>
      )}
    </div>
    {children}
  </section>
);

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
                borderColor: SIRKET_KENAR_GUCLU,
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
 * Adres alanı kalıyor: logosu kendi sitesinde duran şirket onu
 * yapıştırabiliyor. İki yol da aynı sütunu yazıyor.
 */
const LogoAlani: React.FC<{
  deger: string;
  sirketAdi: string;
  companyId: string | null;
  userId: string | null;
  onDegis: (v: string) => void;
}> = ({ deger, sirketAdi, companyId, userId, onDegis }) => {
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const [hata, setHata] = React.useState('');
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
      <Etiket ipucu="Öğrenciler şirketinizi bu logoyla görür">Logo</Etiket>

      <div className="flex items-start gap-3">
        <LogoGorseli url={deger} ad={sirketAdi} boyut="buyuk" />

        <div className="min-w-0 flex-1 space-y-2">
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

          <input
            type="url"
            inputMode="url"
            value={deger}
            onChange={(e) => onDegis(e.target.value)}
            placeholder="ya da logo adresini yapıştırın"
            className={`${ALAN} text-xs`}
            style={alanStil}
          />

          <p className="text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
            PNG, JPEG veya WEBP · en fazla 2 MB
          </p>
          {hata && <p className="text-xs font-semibold text-rose-700">{hata}</p>}
        </div>
      </div>
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
}> = ({ durum, hata, kaydedilebilir, degisti, onKaydet, sikisik }) => (
  <div className={sikisik ? 'flex items-center gap-3' : `${KUTU} space-y-3`} style={sikisik ? undefined : kutuStil}>
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
      <p className="mt-1 max-w-xl text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
        Doğrulama başvuran kartlarını açıyor. Ticari unvan ve VKN'yi alıp bir insan kontrol
        ediyor; genellikle bir iş günü sürüyor ve sonucu e-postayla yazıyoruz.
      </p>

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
