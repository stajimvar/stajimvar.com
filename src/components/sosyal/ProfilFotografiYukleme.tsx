import React from 'react';
import { ImagePlus } from 'lucide-react';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { SosyalHata, profilFotografiYukle } from '../../lib/queries/sosyal';
import { KayitHatasi } from './SosyalFormAlanlari';
import { ProfilFotografi } from './ProfilFotografi';

/**
 * PROFİL FOTOĞRAFI YÜKLEME — YALNIZ KENDİ PROFİLİ
 *
 * Bu ekran sayfanın SAHİP dalında, `if (!sahibiMi) return <GuvenliEkran/>`
 * satırından sonra çiziliyor: ziyaretçi bu koda hiç ulaşmıyor, DOM'a hiç
 * girmiyor. Başkasının fotoğrafını değiştirecek bir yol arayüzde yok;
 * sunucuda da yok — `avatar_yolu_kilidi` (20260924040000) yolun birinci
 * parçası satırın sahibi değilse güncellemeyi reddediyor.
 *
 * SIRAYI BU EKRAN KURMUYOR
 * ------------------------
 * Yükle → yolu yaz → EN SON eskisini sil sırası `profilFotografiYukle`
 * içinde. Ekranın işi seçim, kare önizleme ve dürüst durum. Hata
 * dalında mevcut fotoğraf KAYBOLMUYOR: her başarısız yolda satırda hâlâ
 * eski yol yazıyor, cümle de bunu söylüyor.
 *
 * ÇİZİLMEYENLER
 * -------------
 *   Fotoğrafı kaldır   eylem VAR ama burada değil: dişli menüsünde, tek
 *                      yerde (`ProfilAyarMenusu`). Bu ekran yalnız
 *                      seçilen fotoğrafı kaydediyor; aynı ekranda hem
 *                      "kaydet" hem "kaldır", kullanıcının hangi
 *                      düğmenin neyi etkilediğini sormasına yol açardı
 *   Kırpma çerçevesi   sürüklenebilir kırpma klavyeyle çalışmıyor;
 *                      ortadan kare kesme aşağıda gerekçeli
 *   Filtre / düzenleme arka ucu da ekranı da yok
 */

/*
  TÜR DENETİMİ `File.type` ÜZERİNDEN

  Uzantı kullanıcının yazdığı bir dize; `.jpg` adıyla SVG seçilebiliyor.
  Liste kovanın `allowed_mime_types` değeriyle birebir aynı
  (20260924020000): burada gevşek davranmak, kullanıcıya ancak yükleme
  bittikten sonra hata göstermek olurdu.
*/
const IZIN_VERILEN_TURLER = ['image/jpeg', 'image/png', 'image/webp'];

/*
  KARE KENARI: 512 PİKSEL

  Fotoğraf ekranda yalnız daire içinde ve küçük çiziliyor: profil
  başlığında `h-16 w-16` (64 CSS pikseli), `sm:h-20 w-20` (80), bu
  ekrandaki önizlemede `h-28 w-28` (112). En büyük kullanım 112 CSS
  pikseli; 3x yoğunluklu bir telefonda 336 aygıt pikseline denk geliyor.
  512 bunun üstünde kalıyor, yani daha büyük bir avatar ölçüsü
  seçilirse görsel yeniden yüklenmeden karşılıyor — ama 12 MP'lik ham
  telefon fotoğrafını kullanıcının mobil verisinden geçirmiyor.

  Kalite 0.85: paylaşım akışındaki değerin aynısı; iki yerde iki farklı
  sayı olsaydı aynı kaynak fotoğraf iki ekranda farklı görünürdü.
*/
const KENAR = 512;
const KALITE = 0.85;

/** Kovanın sunucu tarafındaki sınırı (20260924020000): 2 MB. */
const KOVA_SINIRI = 2 * 1024 * 1024;

interface HazirKare {
  veri: Blob;
  uzanti: string;
  /**
   * Çıktının kenarı — KENAR sabiti değil.
   *
   * Kaynak kareden küçükse büyütmüyoruz, yani gerçek kenar daha küçük
   * olabiliyor. Sabiti taşısaydık ölçmediğimiz bir sayıyı sunucuya
   * söylemiş olurduk.
   */
  kenar: number;
  /** Küçültülmüş veriden üretilen önizleme; yüklenecek olanla AYNI görüntü. */
  onizleme: string;
}

function uzantiCevir(tur: string): string | null {
  if (tur === 'image/jpeg') return 'jpg';
  if (tur === 'image/png') return 'png';
  if (tur === 'image/webp') return 'webp';
  return null;
}

/**
 * Tarayıcıda kareye kesip küçültme.
 *
 * ORTADAN KARE KESİLİYOR, KENARLARA BOŞLUK EKLENMİYOR
 * ---------------------------------------------------
 * Avatar her yerde daire ve `object-cover` ile çiziliyor; dikdörtgen bir
 * fotoğrafın kenarları zaten GÖRÜNMÜYOR. Kesmeyi yüklemeden önce yapmak
 * iki şey kazandırıyor: (1) görünmeyen kenarlar sunucuya hiç gitmiyor,
 * yani kullanıcının kadrajda kalan ama daire dışındaki kısmı imzalı
 * adresi eline geçirenlerin de eline geçmiyor; (2) önizlemede görülen
 * kare, kaydedilen dosyanın kendisi — sürpriz kırpma yok.
 * Boşluk eklemek (letterbox) tersini yapardı: dairenin içinde gri
 * bantlar görünürdü.
 *
 * EXIF (KONUM DAHİL) BURADA DÜŞÜYOR
 * ---------------------------------
 * Telefon fotoğrafının EXIF bloğunda GPS koordinatı ve cihaz modeli
 * olabiliyor. Canvas'a yeniden çizmek piksellerden başka hiçbir şeyi
 * taşımıyor. Yönlendirme kaybolmuyor: tarayıcı `<img>` çözerken EXIF
 * yönünü zaten uyguluyor ve `naturalWidth/Height` çevrilmiş ölçüyü
 * veriyor.
 */
async function kareyeCevir(dosya: File): Promise<HazirKare> {
  const kaynakAdres = URL.createObjectURL(dosya);
  try {
    const gorsel = new Image();
    await new Promise<void>((coz, reddet) => {
      gorsel.onload = () => coz();
      gorsel.onerror = () => reddet(new Error('gorsel-okunamadi'));
      gorsel.src = kaynakAdres;
    });

    const enKisa = Math.min(gorsel.naturalWidth, gorsel.naturalHeight);
    if (enKisa === 0) throw new Error('gorsel-okunamadi');
    /* Kaynak kareden küçükse BÜYÜTÜLMÜYOR: bulanık piksel üretmiyoruz. */
    const kenar = Math.min(KENAR, enKisa);
    /* Kesme penceresi ortada: yüzler çoğunlukla merkeze yakın duruyor. */
    const kaynakX = Math.round((gorsel.naturalWidth - enKisa) / 2);
    const kaynakY = Math.round((gorsel.naturalHeight - enKisa) / 2);

    const tuval = document.createElement('canvas');
    tuval.width = kenar;
    tuval.height = kenar;
    const kalem = tuval.getContext('2d');
    if (!kalem) throw new Error('tuval-yok');
    kalem.drawImage(gorsel, kaynakX, kaynakY, enKisa, enKisa, 0, 0, kenar, kenar);

    /*
      JPEG kaynağı JPEG kalıyor; PNG ve WebP kaynağı WebP'ye gidiyor.
      Sebep saydamlık: saydam bir PNG'yi JPEG'e çevirmek boş alanları
      SİYAHA boyar ve kullanıcı seçtiğinden başka bir fotoğraf görür.
    */
    const hedefTur = dosya.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    const veri = await new Promise<Blob | null>((coz) => {
      tuval.toBlob((sonuc) => coz(sonuc), hedefTur, KALITE);
    });
    if (!veri) throw new Error('kodlanamadi');

    /*
      Uzantı çıktı blob'unun KENDİ türünden okunuyor: WebP kodlamayı
      desteklemeyen bir tarayıcıda `toBlob` sessizce PNG üretiyor ve yol
      ile içerik ayrışırdı.
    */
    const uzanti = uzantiCevir(veri.type);
    if (!uzanti) throw new Error('desteklenmeyen-cikti');
    if (veri.size > KOVA_SINIRI) throw new Error('cok-buyuk');

    return { veri, uzanti, kenar, onizleme: URL.createObjectURL(veri) };
  } finally {
    URL.revokeObjectURL(kaynakAdres);
  }
}

const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

/*
  Dosya seçici GÖRÜNMEZ ama odaklanabilir: kutu `sr-only`, görünen yüzey
  onu saran etiket. Odak halkası bu yüzden `focus-within:` — odak
  etikete değil içindeki girdiye geliyor, halkayı çizen ise etiket.
  Renk ve kalınlık ODAK_HALKASI ile aynı (#155DFC, 2 piksel).
*/
const SECIM_ETIKETI = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 ${RENK_GECISI}`;

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

interface YuklemeProps {
  /** Oturum kimliği; yolun birinci parçası bu olmak zorunda. */
  kullaniciId: string;
  /** Başlıkta görünen ad — baş harf yedeği ve `alt` metni için. */
  ad: string;
  /** Şu anki `avatar_path`; yoksa null ve baş harfler çiziliyor. */
  mevcutYol: string | null;
  onVazgec: () => void;
  /** YALNIZ `avatar_path` yazıldıktan sonra, yeni yolla çağrılıyor. */
  onKaydedildi: (yeniYol: string) => void;
}

/**
 * Sunucu hatasını kullanıcı cümlesine çeviriyor.
 *
 * `kod === 'sunucu'` olan SosyalHata'nın mesajı PostgREST/Storage'ın
 * kendi (çoğu zaman İngilizce) metnini taşıyor; onu ekrana basmak
 * kullanıcıya çözemeyeceği bir dize göstermek olurdu. Cümlenin ikinci
 * yarısı ölçülebilir bir gerçek: `profilFotografiYukle` her başarısız
 * dalda `avatar_path`i olduğu gibi bırakıyor.
 */
function hataCumlesi(sorun: unknown): string {
  if (sorun instanceof SosyalHata && sorun.kod === 'satir-yok') return sorun.message;
  return 'Profil fotoğrafın kaydedilemedi. Mevcut fotoğrafın değişmedi; yeniden deneyebilirsin.';
}

export const ProfilFotografiYukleme: React.FC<YuklemeProps> = ({
  kullaniciId,
  ad,
  mevcutYol,
  onVazgec,
  onKaydedildi,
}) => {
  const [secilen, setSecilen] = React.useState<HazirKare | null>(null);
  const [hazirlaniyor, setHazirlaniyor] = React.useState(false);
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [uyari, setUyari] = React.useState<string | null>(null);
  const [gonderimHatasi, setGonderimHatasi] = React.useState<string | null>(null);

  /* Önizleme adresi bileşen kalkarken bırakılıyor; seçim değişince de. */
  const secilenRef = React.useRef<HazirKare | null>(null);
  secilenRef.current = secilen;
  React.useEffect(
    () => () => {
      if (secilenRef.current) URL.revokeObjectURL(secilenRef.current.onizleme);
    },
    [],
  );

  const kilitli = hazirlaniyor || gonderiliyor;

  const dosyaSecildi = async (olay: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = olay.target.files?.[0] ?? null;
    /* Aynı dosya art arda seçilebilsin diye kutu boşaltılıyor. */
    olay.target.value = '';
    if (!dosya) return;

    setGonderimHatasi(null);
    if (!IZIN_VERILEN_TURLER.includes(dosya.type)) {
      setUyari(
        'Bu dosya alınmadı: yalnızca JPEG, PNG ve WebP fotoğraf yüklenebiliyor (GIF, SVG ve video kabul edilmiyor).',
      );
      return;
    }

    setUyari(null);
    setHazirlaniyor(true);
    try {
      const hazir = await kareyeCevir(dosya);
      /* Önceki seçimin adresi bırakılıyor: ekranda artık görünmeyecek. */
      if (secilenRef.current) URL.revokeObjectURL(secilenRef.current.onizleme);
      setSecilen(hazir);
    } catch {
      setUyari('Fotoğraf açılamadı ve eklenmedi. Başka bir dosya seçebilirsin.');
    } finally {
      setHazirlaniyor(false);
    }
  };

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    /* İkinci kapı: düğme zaten `disabled`, ama Enter da formu gönderiyor. */
    if (kilitli || !secilen) return;

    setGonderimHatasi(null);
    setGonderiliyor(true);
    try {
      const yeniYol = await profilFotografiYukle(kullaniciId, {
        veri: secilen.veri,
        uzanti: secilen.uzanti,
        genislik: secilen.kenar,
        yukseklik: secilen.kenar,
        /*
          Avatarın `alt` metnini kullanıcı yazmıyor: `Avatar` bileşeni
          "<ad> profil fotoğrafı" diye üretiyor ve fotoğrafın taşıdığı
          bilgi zaten o. Boş bir kutu sunmak, doldurulacak bir alan
          varmış gibi göstermek olurdu.
        */
        alt: null,
      });
      /*
        BAŞARI YALNIZ BURADA. `profilFotografiYukle` ancak `avatar_path`
        yazıldıktan sonra çözülüyor; daha erken bir "güncellendi"
        cümlesi, yalnız kovaya düşmüş ve hiçbir profile bağlı olmayan
        bir dosyayı fotoğraf gibi göstermek olurdu.
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
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          Profil fotoğrafı
        </h1>
      </header>

      <form onSubmit={gonder} className="space-y-4" noValidate aria-busy={kilitli}>
        <div className={`${KART} space-y-3`}>
          <div className="flex items-center gap-3">
            {/*
              İKİ FOTOĞRAF YAN YANA: ŞU ANKİ VE SEÇİLEN

              Seçim yokken yalnız şu anki duruyor; sahte bir "yeni
              fotoğraf" yuvası çizilmiyor. Seçim varken ikisi birlikte
              görünüyor, çünkü değişimin ne olduğu ancak karşılaştırınca
              anlaşılıyor.
            */}
            <div className="space-y-1 text-center">
              <ProfilFotografi
                ad={ad}
                yol={mevcutYol}
                className="h-28 w-28 shrink-0 rounded-full text-2xl ring-1 ring-blue-500/20"
              />
              <p className="text-[11px] font-semibold text-gray-600">
                {mevcutYol ? 'Şu anki fotoğrafın' : 'Fotoğrafın yok'}
              </p>
            </div>

            {secilen && (
              <div className="space-y-1 text-center">
                {/*
                  `alt` BOŞ: bu küçük resim, altındaki "Seçtiğin
                  fotoğraf" satırının ve yanındaki karşılaştırmanın
                  tekrarı. Ekran okuyucuya iki kez aynı şeyi söylemek,
                  hiçbir şey söylememekten kötü.
                */}
                <img
                  src={secilen.onizleme}
                  alt=""
                  className="h-28 w-28 shrink-0 rounded-full bg-gray-100 object-cover ring-1 ring-blue-500/20"
                />
                <p className="text-[11px] font-semibold text-gray-600">Seçtiğin fotoğraf</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className={SECIM_ETIKETI}>
              <ImagePlus aria-hidden className="h-4 w-4" />
              <span>{secilen ? 'Başka fotoğraf seç' : 'Fotoğraf seç'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={kilitli}
                onChange={dosyaSecildi}
                className="sr-only"
              />
            </label>
          </div>

          {/*
            KESME KULLANICIYA ÖNCEDEN SÖYLENİYOR

            Ortadan kare kesiliyor ve bu, seçimden sonra fark edilecek
            bir sürpriz olmamalı: dikey bir fotoğrafın altı ve üstü
            kadrajdan çıkıyor. Önizleme zaten sonucu gösteriyor, cümle
            de sebebini.
          */}
          <p className="text-xs leading-relaxed text-gray-600">
            Fotoğraf ortadan kare kesiliyor ve en çok {KENAR}×{KENAR} piksele küçültülüyor. JPEG,
            PNG ve WebP kabul ediliyor.
          </p>

          {hazirlaniyor && (
            <p role="status" className="text-sm font-semibold text-gray-700">
              Fotoğraf hazırlanıyor…
            </p>
          )}

          {uyari && (
            <p role="alert" className="text-xs font-semibold leading-relaxed text-amber-800">
              {uyari}
            </p>
          )}
        </div>

        {gonderimHatasi && <KayitHatasi mesaj={gonderimHatasi} />}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={kilitli || !secilen} className={BIRINCIL_EYLEM}>
            {gonderiliyor ? 'Kaydediliyor…' : 'Fotoğrafı kaydet'}
          </button>
          {/*
            VAZGEÇ GÖNDERİM SIRASINDA KİLİTLİ: yarı yolda kapatmak,
            yolu yazılmamış bir dosyayı kovada bırakırdı. Temizlik
            akışın hata dalında çalışıyor, ekran kapanınca değil.
          */}
          <button type="button" onClick={onVazgec} disabled={kilitli} className={IKINCIL}>
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  );
};
