import React from 'react';
import { ImagePlus } from 'lucide-react';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { SosyalHata, profilKapagiYukle } from '../../lib/queries/sosyal';
import { KayitHatasi } from './SosyalFormAlanlari';
import { IZIN_VERILEN_TURLER, type Kirpma } from './ProfilFotografiYukleme';
import { KapakFotografi } from './KapakFotografi';

/**
 * KAPAK FOTOĞRAFI YÜKLEME — YALNIZ KENDİ PROFİLİ
 *
 * Avatar ekranının (`ProfilFotografiYukleme`) kardeşi, kırpması
 * CvOlusturucu'daki `FotografAdimi`nin 3:1 dikdörtgen hâli. İkisinden de
 * yeni bir kalıp uydurulmadı; farklı olan her şey aşağıda gerekçeli.
 *
 * Ekran sayfanın SAHİP dalında, `if (!sahibiMi) return <GuvenliEkran/>`
 * satırından sonra çiziliyor: ziyaretçi bu koda hiç ulaşmıyor. Sunucu da
 * aynı sınırı çiziyor — `kapak_yolu_kilidi` (20261105010000) yolun birinci
 * parçası satırın sahibi değilse güncellemeyi reddediyor.
 *
 * SIRAYI BU EKRAN KURMUYOR: yükle → yolu yaz → EN SON eskisini sil sırası
 * `profilKapagiYukle` içinde. Hata dalında mevcut kapak KAYBOLMUYOR ve
 * cümle de bunu söylüyor.
 *
 * KALDIRMA BURADA DEĞİL: düzenleme ekranının "Kapak fotoğrafın"
 * bölümünde. Bu ekran yalnız seçileni kaydediyor; aynı ekranda hem
 * "kaydet" hem "kaldır", hangi düğmenin neyi etkilediğini sordururdu.
 */

/*
  ÇIKTI: EN ÇOK 1500×500, HER ZAMAN JPEG 0.85

  Genişlik: kapak telefonda ekranın, geniş ekranda kartın tamamına
  yayılıyor. 1500, X'in kapak için önerdiği ölçü ve göçün 2 MB sınırının
  gerekçesi de bu ölçüye göre yazıldı (20261105010000). Kaynak daha
  küçükse BÜYÜTÜLMÜYOR: bulanık piksel üretmiyoruz.

  NEDEN HER ZAMAN JPEG (avatardan farklı olarak):
    - Avatar PNG/WebP kaynağı WebP'ye gönderiyor ki saydamlık korunsun.
      Kapakta saydamlık korunacak bir şey değil: bant zaten dolu bir
      dikdörtgen ve saydam alan arkasındaki griyi gösterirdi.
    - WebP kodlamayı desteklemeyen tarayıcıda `toBlob` sessizce PNG
      üretiyor; 1500×500 bir fotoğraf PNG'de 2 MB'ı rahatça aşabilir ve
      kullanıcı sebebini bilmediği bir "çok büyük" hatası görürdü.
  Tuval çizimden ÖNCE beyazla dolduruluyor: saydam PNG JPEG'e SİYAH
  zeminle çevriliyor, kullanıcı seçtiğinden başka bir fotoğraf görürdü.

  Kalite 0.85: avatar ve paylaşım akışının sayısı; aynı kaynak fotoğraf
  iki ekranda iki farklı sıkıştırmayla görünmesin.
*/
const EN_GENIS = 1500;
const ORAN = 3;
const KALITE = 0.85;

/** Kovanın sunucu tarafındaki sınırı (20261105010000): 2 MB. */
const KOVA_SINIRI = 2 * 1024 * 1024;

export interface HazirKapak {
  veri: Blob;
  uzanti: 'jpg';
  /** Çıktının GERÇEK ölçüsü — sabit değil; kaynak küçükse daha küçük. */
  genislik: number;
  yukseklik: number;
  /** Yüklenecek veriden üretilen önizleme; kaydedilecek olanla AYNI görüntü. */
  onizleme: string;
}

/**
 * Kaynak görselde 3:1 kırpma penceresinin ölçüsü (kaynak pikseli).
 *
 * Yakınlık 1'de pencere görsele sığan EN BÜYÜK 3:1 dikdörtgen: yatay bir
 * fotoğrafta tam yükseklik, dikey bir fotoğrafta tam genişlik. Ekrandaki
 * çerçeve ile `kapagaCevir` aynı fonksiyonu kullanıyor; iki ayrı hesap
 * olsaydı kullanıcı kırparken gördüğünden başka bir kadrajı kaydederdi.
 */
function kapakPenceresi(en: number, boy: number, yakinlik: number) {
  const pencereEn = Math.min(en, boy * ORAN) / yakinlik;
  return { pencereEn, pencereBoy: pencereEn / ORAN };
}

/** Pencere görselin dışına taşmasın: merkez, pencerenin yarısı kadar içeride. */
function kapakSinirla(k: Kirpma, en: number, boy: number): Kirpma {
  const { pencereEn, pencereBoy } = kapakPenceresi(en, boy, k.yakinlik);
  const yx = pencereEn / 2 / en;
  const yy = pencereBoy / 2 / boy;
  return { ...k, x: Math.min(1 - yx, Math.max(yx, k.x)), y: Math.min(1 - yy, Math.max(yy, k.y)) };
}

/**
 * Tarayıcıda 3:1 kesip küçültme — `kareyeCevir`in kapak hâli.
 *
 * `kareyeCevir` DEĞİŞTİRİLMEDİ: CV ve avatar onu kullanıyor ve çıktı türü
 * kararı (JPEG → JPEG, PNG/WebP → WebP) orada saydamlık için doğru.
 *
 * EXIF (KONUM DAHİL) BURADA DÜŞÜYOR — avatardaki gerekçenin aynısı:
 * canvas'a yeniden çizmek piksellerden başka hiçbir şeyi taşımıyor;
 * tarayıcı `<img>` çözerken EXIF yönünü zaten uyguluyor.
 */
export async function kapagaCevir(dosya: File, kirpma?: Kirpma): Promise<HazirKapak> {
  const kaynakAdres = URL.createObjectURL(dosya);
  try {
    const gorsel = new Image();
    await new Promise<void>((coz, reddet) => {
      gorsel.onload = () => coz();
      gorsel.onerror = () => reddet(new Error('gorsel-okunamadi'));
      gorsel.src = kaynakAdres;
    });

    const en = gorsel.naturalWidth;
    const boy = gorsel.naturalHeight;
    if (en === 0 || boy === 0) throw new Error('gorsel-okunamadi');

    const yakinlik = Math.min(4, Math.max(1, kirpma?.yakinlik ?? 1));
    const k = kapakSinirla({ x: kirpma?.x ?? 0.5, y: kirpma?.y ?? 0.5, yakinlik }, en, boy);
    const { pencereEn, pencereBoy } = kapakPenceresi(en, boy, yakinlik);

    const genislik = Math.max(ORAN, Math.min(EN_GENIS, Math.round(pencereEn)));
    const yukseklik = Math.max(1, Math.round(genislik / ORAN));
    const kaynakX = Math.round(k.x * en - pencereEn / 2);
    const kaynakY = Math.round(k.y * boy - pencereBoy / 2);

    const tuval = document.createElement('canvas');
    tuval.width = genislik;
    tuval.height = yukseklik;
    const kalem = tuval.getContext('2d');
    if (!kalem) throw new Error('tuval-yok');
    kalem.fillStyle = '#ffffff';
    kalem.fillRect(0, 0, genislik, yukseklik);
    kalem.drawImage(gorsel, kaynakX, kaynakY, pencereEn, pencereBoy, 0, 0, genislik, yukseklik);

    const veri = await new Promise<Blob | null>((coz) => {
      tuval.toBlob((sonuc) => coz(sonuc), 'image/jpeg', KALITE);
    });
    if (!veri) throw new Error('kodlanamadi');
    /*
      Tür blob'un KENDİSİNDEN denetleniyor: kodlayıcı istenen türü
      vermezse yol `.jpg` derken içerik başka bir şey olurdu.
    */
    if (veri.type !== 'image/jpeg') throw new Error('desteklenmeyen-cikti');
    if (veri.size > KOVA_SINIRI) throw new Error('cok-buyuk');

    return { veri, uzanti: 'jpg', genislik, yukseklik, onizleme: URL.createObjectURL(veri) };
  } finally {
    URL.revokeObjectURL(kaynakAdres);
  }
}

const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

/* Dosya seçici `sr-only`; odak halkasını saran etiket `focus-within:` ile çiziyor. */
const SECIM_ETIKETI = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 ${RENK_GECISI}`;

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

interface YuklemeProps {
  /** Oturum kimliği; yolun birinci parçası bu olmak zorunda. */
  kullaniciId: string;
  /** Başlıkta görünen ad — mevcut kapağın `alt` metni için. */
  ad: string;
  /** Şu anki `kapak_path`; yoksa null. */
  mevcutYol: string | null;
  onVazgec: () => void;
  /** YALNIZ `kapak_path` yazıldıktan sonra, yeni yolla çağrılıyor. */
  onKaydedildi: (yeniYol: string) => void;
}

/**
 * Sunucu hatasını kullanıcı cümlesine çeviriyor. `kod === 'sunucu'`
 * mesajı PostgREST/Storage'ın kendi (çoğu zaman İngilizce) metni;
 * ekrana basılmıyor. İkinci yarı ölçülebilir bir gerçek:
 * `profilKapagiYukle` her başarısız dalda `kapak_path`i olduğu gibi
 * bırakıyor.
 */
function hataCumlesi(sorun: unknown): string {
  if (sorun instanceof SosyalHata && sorun.kod === 'satir-yok') return sorun.message;
  return 'Kapak fotoğrafın kaydedilemedi. Mevcut kapağın değişmedi; yeniden deneyebilirsin.';
}

/** Hazırlama hatasının cümlesi — "çok büyük" ayrı, çünkü çözümü ayrı. */
function hazirlamaCumlesi(sorun: unknown): string {
  if (sorun instanceof Error && sorun.message === 'cok-buyuk') {
    return 'Bu kadraj 2 MB sınırını aşıyor. Biraz yakınlaştırmayı ya da başka bir fotoğraf seçmeyi deneyebilirsin.';
  }
  return 'Fotoğraf hazırlanamadı. Başka bir dosya seçebilirsin.';
}

export const KapakFotografiYukleme: React.FC<YuklemeProps> = ({
  kullaniciId,
  ad,
  mevcutYol,
  onVazgec,
  onKaydedildi,
}) => {
  const [dosya, setDosya] = React.useState<File | null>(null);
  const [kaynak, setKaynak] = React.useState<{ adres: string; en: number; boy: number } | null>(null);
  const [kirpma, setKirpma] = React.useState<Kirpma>({ x: 0.5, y: 0.5, yakinlik: 1 });
  /*
    Üretilen JPEG, HANGİ kırpmadan üretildiğiyle birlikte tutuluyor.

    Yeniden üretim 150 ms gecikmeli (aşağıda); kullanıcı çerçeveyi
    oynatıp o aralıkta "Kaydet"e basarsa ELDEKİ JPEG bir önceki kadrajın
    olurdu ve ekranda gördüğünden başka bir kapak kaydedilirdi. Düğme bu
    yüzden kırpma nesnesi eşleşene kadar kilitli.
  */
  const [kapak, setKapak] = React.useState<{ hazir: HazirKapak; kirpma: Kirpma } | null>(null);
  const [uyari, setUyari] = React.useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [gonderimHatasi, setGonderimHatasi] = React.useState<string | null>(null);
  /* Çerçevenin CSS genişliği; çerçeve `w-full` olduğu için ölçülerek okunuyor. */
  const [cerceveEn, setCerceveEn] = React.useState(0);
  const cerceveRef = React.useRef<HTMLDivElement>(null);

  /* Kaynak adresi yalnız bellekte; değişince ya da bileşen kalkınca bırakılıyor. */
  React.useEffect(
    () => () => {
      if (kaynak) URL.revokeObjectURL(kaynak.adres);
    },
    [kaynak],
  );
  const kapakRef = React.useRef(kapak);
  kapakRef.current = kapak;
  React.useEffect(
    () => () => {
      if (kapakRef.current) URL.revokeObjectURL(kapakRef.current.hazir.onizleme);
    },
    [],
  );

  React.useLayoutEffect(() => {
    const kutu = cerceveRef.current;
    if (!kutu) return;
    setCerceveEn(kutu.clientWidth);
    const gozcu = new ResizeObserver(() => setCerceveEn(kutu.clientWidth));
    gozcu.observe(kutu);
    return () => gozcu.disconnect();
  }, [kaynak]);

  const secildi = async (olay: React.ChangeEvent<HTMLInputElement>) => {
    const yeni = olay.target.files?.[0] ?? null;
    /* Aynı dosya art arda seçilebilsin diye kutu boşaltılıyor. */
    olay.target.value = '';
    if (!yeni) return;
    setGonderimHatasi(null);
    if (!IZIN_VERILEN_TURLER.includes(yeni.type)) {
      setUyari(
        'Bu dosya alınmadı: yalnızca JPEG, PNG ve WebP fotoğraf yüklenebiliyor (GIF, SVG ve video kabul edilmiyor).',
      );
      return;
    }
    const adres = URL.createObjectURL(yeni);
    const gorsel = new Image();
    try {
      await new Promise<void>((coz, reddet) => {
        gorsel.onload = () => coz();
        gorsel.onerror = () => reddet(new Error('okunamadi'));
        gorsel.src = adres;
      });
    } catch {
      URL.revokeObjectURL(adres);
      setUyari('Fotoğraf açılamadı ve eklenmedi. Başka bir dosya seçebilirsin.');
      return;
    }
    setUyari(null);
    setDosya(yeni);
    setKirpma({ x: 0.5, y: 0.5, yakinlik: 1 });
    setKaynak({ adres, en: gorsel.naturalWidth, boy: gorsel.naturalHeight });
  };

  /*
    Kırpma değişince JPEG yeniden üretiliyor — 150 ms gecikmeyle
    (FotografAdimi'nin sayısı): sürüklemenin her karesinde 1500×500'lük
    bir kodlama başlatmak, kaydırıcıyı oynatırken çerçeveyi takılttırırdı.
  */
  React.useEffect(() => {
    if (!dosya) return;
    let iptal = false;
    const zaman = window.setTimeout(() => {
      void kapagaCevir(dosya, kirpma)
        .then((hazir) => {
          if (iptal) {
            URL.revokeObjectURL(hazir.onizleme);
            return;
          }
          setKapak((onceki) => {
            if (onceki) URL.revokeObjectURL(onceki.hazir.onizleme);
            return { hazir, kirpma };
          });
          setUyari(null);
        })
        .catch((sorun) => {
          if (!iptal) setUyari(hazirlamaCumlesi(sorun));
        });
    }, 150);
    return () => {
      iptal = true;
      window.clearTimeout(zaman);
    };
  }, [dosya, kirpma]);

  const sinirla = (k: Kirpma): Kirpma => (kaynak ? kapakSinirla(k, kaynak.en, kaynak.boy) : k);
  /* Çerçevedeki görüntü: pencere çerçeveyi tam kaplıyor; ölçek = çerçeve / pencere. */
  const pencere = kaynak ? kapakPenceresi(kaynak.en, kaynak.boy, kirpma.yakinlik) : null;
  const olcek = kaynak && pencere && cerceveEn > 0 ? cerceveEn / pencere.pencereEn : 0;
  const cerceveBoy = cerceveEn / ORAN;
  const surukle = React.useRef<{ x: number; y: number; k: Kirpma } | null>(null);

  const guncelKapak = kapak && kapak.kirpma === kirpma ? kapak.hazir : null;
  const kilitli = gonderiliyor;

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    /* İkinci kapı: düğme zaten `disabled`, ama Enter da formu gönderiyor. */
    if (kilitli || !guncelKapak) return;
    setGonderimHatasi(null);
    setGonderiliyor(true);
    try {
      const yeniYol = await profilKapagiYukle(kullaniciId, {
        veri: guncelKapak.veri,
        uzanti: guncelKapak.uzanti,
        genislik: guncelKapak.genislik,
        yukseklik: guncelKapak.yukseklik,
        /* Kapağın `alt`ı "<ad> kapak fotoğrafı" diye üretiliyor; boş kutu sunulmuyor. */
        alt: null,
      });
      /*
        BAŞARI YALNIZ BURADA: `profilKapagiYukle` ancak `kapak_path`
        yazıldıktan sonra çözülüyor. Daha erken bir "güncellendi" cümlesi,
        kovaya düşmüş ama hiçbir profile bağlı olmayan bir dosyayı kapak
        gibi göstermek olurdu.
      */
      onKaydedildi(yeniYol);
    } catch (sorun) {
      setGonderimHatasi(hataCumlesi(sorun));
      setGonderiliyor(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1.5">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">Kapak fotoğrafı</h1>
      </header>

      <form onSubmit={gonder} className="space-y-4" noValidate aria-busy={kilitli}>
        <div className={`${KART} space-y-3`}>
          {!kaynak && (
            /*
              Seçim yokken şu anki kapak duruyor; sahte bir "yeni kapak"
              yuvası çizilmiyor. Kapak yoksa bant nötr ve cümle bunu söylüyor.
            */
            <div className="space-y-1">
              <KapakFotografi ad={ad} yol={mevcutYol} className="w-full rounded-xl" />
              <p className="text-[11px] font-semibold text-gray-600">
                {mevcutYol ? 'Şu anki kapağın' : 'Kapak fotoğrafın yok'}
              </p>
            </div>
          )}

          {kaynak && pencere && (
            <div className="space-y-4">
              {/*
                KIRPMA ÇERÇEVESİ — FotografAdimi'nin 3:1 hâli

                Daire değil, köşeli-yuvarlak dikdörtgen: kapak profilde bant
                olarak çiziliyor ve çerçevenin biçimi sonucun biçimi olmalı.
                Genişliğe yayılıyor (`w-full`); ölçü sabit piksel değil, bu
                yüzden ölçek `ResizeObserver` ile okunan genişlikten.

                Klavye: çerçeve odaklanabilir, ok tuşları kadrajı %2 adımla
                taşıyor; yakınlık aşağıdaki kaydırıcıda. Sürükleme pointer
                capture ile — parmak çerçeveden çıksa da sürükleme kopmuyor.
              */}
              <div
                ref={cerceveRef}
                role="img"
                aria-label="Kapak çerçevesi. Sürükleyerek konumlandır; ok tuşlarıyla da taşıyabilirsin."
                tabIndex={0}
                className={`relative aspect-[3/1] w-full touch-none select-none overflow-hidden rounded-xl bg-gray-200 ${ODAK_HALKASI}`}
                style={{
                  backgroundImage: `url(${kaynak.adres})`,
                  backgroundSize: `${kaynak.en * olcek}px ${kaynak.boy * olcek}px`,
                  backgroundPosition: `${cerceveEn / 2 - kirpma.x * kaynak.en * olcek}px ${cerceveBoy / 2 - kirpma.y * kaynak.boy * olcek}px`,
                  backgroundRepeat: 'no-repeat',
                  cursor: 'grab',
                }}
                onPointerDown={(olay) => {
                  olay.currentTarget.setPointerCapture(olay.pointerId);
                  surukle.current = { x: olay.clientX, y: olay.clientY, k: kirpma };
                }}
                onPointerMove={(olay) => {
                  const bas = surukle.current;
                  if (!bas || !kaynak || olcek === 0) return;
                  setKirpma(
                    sinirla({
                      ...bas.k,
                      x: bas.k.x - (olay.clientX - bas.x) / (kaynak.en * olcek),
                      y: bas.k.y - (olay.clientY - bas.y) / (kaynak.boy * olcek),
                    }),
                  );
                }}
                onPointerUp={() => {
                  surukle.current = null;
                }}
                onPointerCancel={() => {
                  surukle.current = null;
                }}
                onKeyDown={(olay) => {
                  const adim = 0.02;
                  const yon: Record<string, [number, number]> = {
                    ArrowLeft: [-adim, 0],
                    ArrowRight: [adim, 0],
                    ArrowUp: [0, -adim],
                    ArrowDown: [0, adim],
                  };
                  const d = yon[olay.key];
                  if (!d) return;
                  olay.preventDefault();
                  setKirpma((k) => sinirla({ ...k, x: k.x + d[0], y: k.y + d[1] }));
                }}
              />
              <div>
                <label htmlFor="kapak-yakinlik" className="block text-sm font-bold text-gray-900">
                  Yakınlaştır
                </label>
                <input
                  id="kapak-yakinlik"
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={kirpma.yakinlik}
                  disabled={kilitli}
                  onChange={(e) => setKirpma((k) => sinirla({ ...k, yakinlik: Number(e.target.value) }))}
                  className="mt-2 h-11 w-full accent-blue-600"
                />
              </div>

              {/*
                CANLI ÖNİZLEME — YÜKLENECEK DOSYANIN KENDİSİ

                Çerçeve kaynak görselin CSS ile konumlanmış hâli; bu küçük
                bant ise kodlanmış JPEG. İkisi aynı hesaptan (`kapakPenceresi`)
                ama kaydedilen dosya bu; kullanıcı gönderdiği şeyi görüyor.
                `alt` BOŞ: altındaki satırın tekrarı olurdu.

                Satır `role="status"` DEĞİL: sürüklerken her 150 ms'de
                "hazırlanıyor → hazır" diye değişiyor ve canlı bölge ekran
                okuyucuya bunu durmadan okuturdu.
              */}
              <div className="space-y-1">
                {guncelKapak ? (
                  <img
                    src={guncelKapak.onizleme}
                    alt=""
                    className="aspect-[3/1] w-full rounded-xl bg-gray-100 object-cover sm:w-2/3"
                  />
                ) : (
                  <div aria-hidden className="aspect-[3/1] w-full animate-pulse rounded-xl bg-gray-100 sm:w-2/3" />
                )}
                <p className="text-[11px] font-semibold text-gray-600">
                  {guncelKapak
                    ? `Kaydedilecek kapak · ${guncelKapak.genislik}×${guncelKapak.yukseklik} piksel`
                    : 'Kapak hazırlanıyor…'}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label className={SECIM_ETIKETI}>
              <ImagePlus aria-hidden className="h-4 w-4" />
              <span>{kaynak ? 'Başka fotoğraf seç' : 'Fotoğraf seç'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={kilitli}
                onChange={(e) => void secildi(e)}
                className="sr-only"
              />
            </label>
          </div>

          {/* Kesme ve küçültme kullanıcıya ÖNCEDEN söyleniyor; seçimden sonra sürpriz olmamalı. */}
          <p className="text-xs leading-relaxed text-gray-600">
            Kapak 3:1 oranında kesiliyor ve en çok {EN_GENIS}×{EN_GENIS / ORAN} piksele küçültülüyor. JPEG,
            PNG ve WebP kabul ediliyor.
          </p>

          {uyari && (
            <p role="alert" className="text-xs font-semibold leading-relaxed text-amber-800">
              {uyari}
            </p>
          )}
        </div>

        {gonderimHatasi && <KayitHatasi mesaj={gonderimHatasi} />}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={kilitli || !guncelKapak} className={BIRINCIL_EYLEM}>
            {gonderiliyor ? 'Kaydediliyor…' : 'Kapağı kaydet'}
          </button>
          {/*
            VAZGEÇ GÖNDERİM SIRASINDA KİLİTLİ: yarı yolda kapatmak, yolu
            yazılmamış bir dosyayı kovada bırakırdı. Temizlik akışın hata
            dalında çalışıyor, ekran kapanınca değil.
          */}
          <button type="button" onClick={onVazgec} disabled={kilitli} className={IKINCIL}>
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  );
};
