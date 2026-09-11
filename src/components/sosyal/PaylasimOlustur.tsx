import React from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  EN_FAZLA_FOTOGRAF,
  SosyalHata,
  paylasimOlustur,
  sosyalTopluluklariGetir,
  type PaylasimKitlesi,
} from '../../lib/queries/sosyal';
import { AciklamaAlani, KayitHatasi } from './SosyalFormAlanlari';

/**
 * PAYLAŞIM OLUŞTURMA
 *
 * Ekran, sunucudaki üç adımlı akışın (başlat → yükle → tamamla) tek
 * girişi. Adımların sırasını bu bileşen KURMUYOR, `paylasimOlustur`
 * kuruyor; buradaki iş seçim, sıralama, küçültme ve dürüst durum.
 *
 * KİMLERE GÖRÜNECEĞİ VARSAYILAN OLARAK DAR
 * ----------------------------------------
 * Başlangıç seçimi "Bağlantılarım" ve bu şemadaki varsayılanın aynısı
 * (`posts.kitle default 'baglantilarim'`). Geniş olan varsayılan
 * olsaydı, seçeneği hiç fark etmeyen kullanıcı fotoğrafını istemediği
 * kadar geniş bir kitleye açardı — güvenli varsayılan dar olandır.
 *
 * "ALAN TOPLULUĞUM" ÜYELİĞE BAĞLI
 * -------------------------------
 * Kitle seçeneği yalnız kullanıcı bir alan topluluğunun ÜYESİYKEN
 * açılıyor; üyelik `sosyal_topluluklar` çıktısındaki `uye_miyim`
 * alanından okunuyor. Sunucu da aynı sınırı çiziyor
 * (`paylasim_kitlesi_kilidi`, 20260926040000) — buradaki kapı ikinci
 * kapı, tek kapı değil. Açık bırakılsaydı kullanıcı fotoğraflarını
 * yükledikten SONRA reddedilirdi.
 *
 * "TAKİP" DİYE BİR ŞEY YOK
 * ------------------------
 * Üründe tek yönlü bir ilişki yok: bağlantı simetrik ve karşılıklı
 * onaya bağlı. "Takipçilerim" gibi bir kitle adı, olmayan bir ilişki
 * biçimini varmış gibi anlatırdı.
 *
 * ÇİZİLMEYENLER
 * -------------
 *   Video          kovaların `allowed_mime_types` listesinde yok
 *   Yer/etiket     şemada kolon yok
 *   Zamanlanmış    paylaşım kuyruğu yok
 *   Taslak listesi taslak bir ARA DURUM; kullanıcıya sunulan bir yer değil
 */

/*
  TÜR DENETİMİ `File.type` ÜZERİNDEN, UZANTIDAN DEĞİL

  Uzantı kullanıcının yazdığı bir dize: `.jpg` adıyla SVG ya da video
  seçilebiliyor. Tarayıcı `type` alanını dosyanın kendisinden okuyor.
  Sunucu tarafında aynı sınır kovanın `allowed_mime_types` listesinde
  duruyor (20260924020000); buradaki denetim onu tekrarlamıyor, ona
  uyuyor — uymayan bir seçim kullanıcıya ancak yükleme bittikten sonra
  hata gösterirdi.
*/
const IZIN_VERILEN_TURLER = ['image/jpeg', 'image/png', 'image/webp'];

/** `posts.aciklama` CHECK'iyle aynı sayı: length(aciklama) <= 2200. */
const ACIKLAMA_SINIRI = 2200;

/*
  KÜÇÜLTME ÖLÇÜSÜ

  Uzun kenar 1600 piksel: profil ızgarasında kart en geniş yerleşimde
  bile 400 pikselin altında, ayrıntı görünümünde görsel `max-h-[60vh]`
  ile sınırlı. Bundan büyüğü ekranda hiçbir yerde kullanılmıyor ama
  kullanıcının mobil verisinden çıkıyor: 12 MP bir telefon fotoğrafı
  4 MB civarı, 1600 piksele indirilmiş hâli 300-600 KB.

  Kalite 0.85: JPEG/WebP'de gözle ayırt edilmeyen bandın alt ucu.
*/
const UZUN_KENAR = 1600;
const KALITE = 0.85;

/** Kovanın sunucu tarafındaki sınırı; aşan dosya zaten reddedilirdi. */
const KOVA_SINIRI = 5 * 1024 * 1024;

interface HazirGorsel {
  /** React anahtarı ve sıralama kimliği; içeriğe bağlı değil. */
  anahtar: string;
  veri: Blob;
  uzanti: string;
  genislik: number;
  yukseklik: number;
  /** Küçültülmüş veriden üretilen önizleme; yüklenecek olanla AYNI görüntü. */
  onizleme: string;
  /** Kullanıcının yazdığı görsel açıklaması; boşsa sunucuya null gidiyor. */
  alt: string;
}

function uzantiCevir(tur: string): string | null {
  if (tur === 'image/jpeg') return 'jpg';
  if (tur === 'image/png') return 'png';
  if (tur === 'image/webp') return 'webp';
  return null;
}

/**
 * Tarayıcıda küçültme.
 *
 * EXIF (KONUM DAHİL) BURADA DÜŞÜYOR
 * ---------------------------------
 * Telefon fotoğrafının EXIF bloğunda GPS koordinatı, cihaz modeli ve
 * çekim anı olabiliyor. Dosya olduğu gibi yüklenseydi bu veri, imzalı
 * adresi eline geçen herkese açık olurdu — kullanıcının paylaştığını
 * sandığı şey fotoğraf, paylaştığı şey ise ev adresi olabilirdi.
 * Canvas'a YENİDEN ÇİZMEK piksellerden başka hiçbir şeyi taşımıyor:
 * çıktı blob'unda EXIF yok. Bu, küçültmenin yan etkisi değil,
 * küçültmeyi canvas ile yapmanın sebeplerinden biri.
 *
 * Yönlendirme (orientation) kaybolmuyor: tarayıcı `<img>` çözerken
 * EXIF yönünü zaten uyguluyor ve `naturalWidth/Height` çevrilmiş
 * ölçüyü veriyor, yani canvas'a düz çizmek doğru yönü koruyor.
 */
async function gorseliKucult(dosya: File): Promise<Omit<HazirGorsel, 'anahtar' | 'alt'>> {
  const kaynakAdres = URL.createObjectURL(dosya);
  try {
    const gorsel = new Image();
    await new Promise<void>((coz, reddet) => {
      gorsel.onload = () => coz();
      gorsel.onerror = () => reddet(new Error('gorsel-okunamadi'));
      gorsel.src = kaynakAdres;
    });

    const enUzun = Math.max(gorsel.naturalWidth, gorsel.naturalHeight);
    if (enUzun === 0) throw new Error('gorsel-okunamadi');
    /* Küçük fotoğraf BÜYÜTÜLMÜYOR: ölçek 1'in üstüne çıkmıyor. */
    const olcek = enUzun > UZUN_KENAR ? UZUN_KENAR / enUzun : 1;
    const genislik = Math.max(1, Math.round(gorsel.naturalWidth * olcek));
    const yukseklik = Math.max(1, Math.round(gorsel.naturalHeight * olcek));

    const tuval = document.createElement('canvas');
    tuval.width = genislik;
    tuval.height = yukseklik;
    const kalem = tuval.getContext('2d');
    if (!kalem) throw new Error('tuval-yok');
    kalem.drawImage(gorsel, 0, 0, genislik, yukseklik);

    /*
      JPEG kaynağı JPEG kalıyor; PNG ve WebP kaynağı WebP'ye gidiyor.
      Sebep saydamlık: saydam bir PNG'yi JPEG'e çevirmek boş alanları
      SİYAHA boyar ve kullanıcı yüklediğinden başka bir görsel görür.
    */
    const hedefTur = dosya.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    const veri = await new Promise<Blob | null>((coz) => {
      tuval.toBlob((sonuc) => coz(sonuc), hedefTur, KALITE);
    });
    if (!veri) throw new Error('kodlanamadi');

    /*
      Çıktı türü blob'un KENDİSİNDEN okunuyor, istenen türden değil:
      WebP kodlamayı desteklemeyen bir tarayıcıda `toBlob` sessizce
      PNG üretiyor. Uzantıyı istediğimize göre yazsaydık, yol ile
      içerik ayrışırdı.
    */
    const uzanti = uzantiCevir(veri.type);
    if (!uzanti) throw new Error('desteklenmeyen-cikti');
    if (veri.size > KOVA_SINIRI) throw new Error('cok-buyuk');

    return { veri, uzanti, genislik, yukseklik, onizleme: URL.createObjectURL(veri) };
  } finally {
    URL.revokeObjectURL(kaynakAdres);
  }
}

const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

const SIRA_DUGMESI = `inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 text-xs font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

/*
  Dosya seçici GÖRÜNMEZ ama odaklanabilir kalıyor: kutu `sr-only`,
  görünen yüzey ise onu saran etiket. Odak halkası bu yüzden
  `focus-visible:` değil `focus-within:` — odak etikete değil içindeki
  girdiye geliyor, halkayı çizen ise etiket. Renk ve kalınlık
  ODAK_HALKASI ile aynı (#155DFC, 2 piksel).
*/
const SECIM_ETIKETI = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 ${RENK_GECISI}`;

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

interface OlusturProps {
  onVazgec: () => void;
  /** YALNIZ `tamamla` döndükten sonra çağrılıyor. */
  onTamamlandi: () => void;
  /**
   * Üyelik ekranına gezinme.
   *
   * Verilmezse "Alan toplulukları" bağlantısı düz bir `<a href>` olarak
   * kalıyor: adres gerçek, orta tuş ve yeni sekme çalışıyor. Bağlantıyı
   * hiç çizmemek, kullanıcıya kapalı seçeneğin nasıl açılacağını
   * söyleyip yolunu göstermemek olurdu.
   */
  onNavigate?: (yol: string) => void;
}

/** Üyelik ekranının adresi; iki yerde (metin ve gezinme) tek dizeden. */
const TOPLULUKLAR_YOLU = '/topluluklar';

export const PaylasimOlustur: React.FC<OlusturProps> = ({
  onVazgec,
  onTamamlandi,
  onNavigate,
}) => {
  const [secilenler, setSecilenler] = React.useState<HazirGorsel[]>([]);
  const [aciklama, setAciklama] = React.useState('');
  const [kitle, setKitle] = React.useState<PaylasimKitlesi>('baglantilarim');
  /*
    ÜYELİK OKUNUYOR — "ALAN TOPLULUĞUM" SEÇENEĞİNİN ÖNKOŞULU

    `paylasim_kitlesi_kilidi` (20260926040000) bu kitleyle açılan satırı
    üye olmayan kullanıcıda reddediyor. Seçeneği açık bırakıp hatayı
    gönderimden sonra göstermek, kullanıcının fotoğraflarını yükleyip
    sonra reddedilmesi demekti.

    ÜÇ DURUM AYRI TUTULUYOR: okunuyor / okundu / okunamadı. Hata dalında
    seçenek AÇILMIYOR ve "üye değilsin" de DENMİYOR — bilinmeyen bir şeyi
    bilinen gibi yazmak, kullanıcıya kendi üyeliği hakkında yanlış bilgi
    vermek olurdu.
  */
  const [uyeMiyim, setUyeMiyim] = React.useState(false);
  const [uyelikDurumu, setUyelikDurumu] = React.useState<'yukleniyor' | 'hazir' | 'hata'>(
    'yukleniyor',
  );
  const [hazirlaniyor, setHazirlaniyor] = React.useState(false);
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [ilerleme, setIlerleme] = React.useState<{ yuklenen: number; toplam: number } | null>(null);
  const [uyari, setUyari] = React.useState<string | null>(null);
  const [gonderimHatasi, setGonderimHatasi] = React.useState<string | null>(null);

  /**
   * OLUŞTURMA DENEMESİNİN ANAHTARI — BİLEŞEN ÖMRÜ BOYUNCA TEK.
   *
   * `useRef` içinde tembel üretiliyor; her render'da yeniden
   * üretilseydi çift tıklama iki FARKLI anahtarla iki ayrı paylaşım
   * açardı ve veritabanındaki tekil indeks (`posts_istemci_anahtari_key`)
   * hiç devreye girmezdi. Başarısız bir denemeden sonra tekrar
   * gönderildiğinde de aynı anahtar gidiyor: sunucu yeni satır açmıyor,
   * varsa mevcut taslağı döndürüyor.
   */
  const anahtarRef = React.useRef<string | null>(null);
  if (anahtarRef.current === null) anahtarRef.current = crypto.randomUUID();

  /*
    Önizleme adresleri bileşen kalkarken bırakılıyor. `secilenler`
    bağımlılığa konmuyor: her seçimde bütün adresleri iptal etmek,
    ekranda duran görselleri kırardı. Tek tek iptal `kaldir` içinde.
  */
  const secilenlerRef = React.useRef<HazirGorsel[]>([]);
  secilenlerRef.current = secilenler;
  React.useEffect(
    () => () => {
      for (const gorsel of secilenlerRef.current) URL.revokeObjectURL(gorsel.onizleme);
    },
    [],
  );

  /*
    Üyelik BİR KEZ okunuyor: ekran açıkken kullanıcı topluluğa
    katılamıyor (katılma ekranı başka bir adreste ve oraya gitmek bu
    ekranı kapatıyor), yani tazelenecek bir değer yok.
  */
  React.useEffect(() => {
    let iptal = false;
    sosyalTopluluklariGetir()
      .then((liste) => {
        if (iptal) return;
        setUyeMiyim(liste.some((topluluk) => topluluk.uyeMiyim));
        setUyelikDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setUyelikDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, []);

  const kilitli = gonderiliyor || hazirlaniyor;

  const dosyaSecildi = async (olay: React.ChangeEvent<HTMLInputElement>) => {
    const liste = Array.from(olay.target.files ?? []);
    /* Aynı dosya art arda seçilebilsin diye kutu boşaltılıyor. */
    olay.target.value = '';
    if (liste.length === 0) return;

    setUyari(null);
    setGonderimHatasi(null);

    const uygunlar = liste.filter((dosya) => IZIN_VERILEN_TURLER.includes(dosya.type));
    const redSayisi = liste.length - uygunlar.length;

    const kalan = EN_FAZLA_FOTOGRAF - secilenler.length;
    if (kalan <= 0) {
      setUyari(`Bir paylaşımda en çok ${EN_FAZLA_FOTOGRAF} fotoğraf olabilir.`);
      return;
    }
    /*
      SESSİZ KIRPMA YOK: sınırı aşan seçimde kaç tanesinin alındığı
      açıkça yazılıyor. Fazlasını sessizce atmak, kullanıcıya
      yüklediğini sandığı bir fotoğrafın olmadığını hiç söylemezdi.
    */
    const alinacaklar = uygunlar.slice(0, kalan);
    const tasan = uygunlar.length - alinacaklar.length;

    setHazirlaniyor(true);
    const yeniler: HazirGorsel[] = [];
    let okunamayan = 0;
    for (const dosya of alinacaklar) {
      try {
        const hazir = await gorseliKucult(dosya);
        yeniler.push({ ...hazir, anahtar: crypto.randomUUID(), alt: '' });
      } catch {
        okunamayan += 1;
      }
    }
    setHazirlaniyor(false);
    if (yeniler.length > 0) setSecilenler((onceki) => [...onceki, ...yeniler]);

    const cumleler: string[] = [];
    if (redSayisi > 0) {
      cumleler.push(
        `${redSayisi} dosya alınmadı: yalnızca JPEG, PNG ve WebP fotoğraf yüklenebiliyor (GIF, SVG ve video kabul edilmiyor).`,
      );
    }
    if (tasan > 0) {
      cumleler.push(
        `${tasan} fotoğraf alınmadı: bir paylaşımda en çok ${EN_FAZLA_FOTOGRAF} fotoğraf olabilir.`,
      );
    }
    if (okunamayan > 0) {
      cumleler.push(`${okunamayan} fotoğraf açılamadı ve eklenmedi.`);
    }
    setUyari(cumleler.length > 0 ? cumleler.join(' ') : null);
  };

  const kaldir = (anahtar: string) => {
    setSecilenler((onceki) => {
      const hedef = onceki.find((gorsel) => gorsel.anahtar === anahtar);
      if (hedef) URL.revokeObjectURL(hedef.onizleme);
      return onceki.filter((gorsel) => gorsel.anahtar !== anahtar);
    });
  };

  /**
   * Sırayı bir basamak kaydır.
   *
   * SÜRÜKLEME YOK, DÜĞME VAR. Sürükle-bırak klavyeyle çalışmıyor ve
   * dokunmatikte kaydırma hareketiyle çakışıyor; iki düğme her iki
   * girdi biçiminde de aynı işi yapıyor. Düğmeler taşınan öğenin
   * İÇİNDE duruyor, yani React düğümü taşıdığında odak fotoğrafla
   * birlikte gidiyor: kullanıcı üst üste basarak yukarı çıkabiliyor.
   */
  const tasi = (indeks: number, yon: -1 | 1) => {
    setSecilenler((onceki) => {
      const hedef = indeks + yon;
      if (hedef < 0 || hedef >= onceki.length) return onceki;
      const kopya = [...onceki];
      [kopya[indeks], kopya[hedef]] = [kopya[hedef], kopya[indeks]];
      return kopya;
    });
  };

  const altYaz = (anahtar: string, deger: string) => {
    setSecilenler((onceki) =>
      onceki.map((gorsel) => (gorsel.anahtar === anahtar ? { ...gorsel, alt: deger } : gorsel)),
    );
  };

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    /* İkinci kapı: düğme zaten `disabled`, ama Enter da formu gönderiyor. */
    if (kilitli) return;
    if (secilenler.length === 0) {
      setGonderimHatasi('Paylaşım için en az bir fotoğraf seçmen gerekiyor.');
      return;
    }

    setGonderimHatasi(null);
    setGonderiliyor(true);
    setIlerleme({ yuklenen: 0, toplam: secilenler.length });

    try {
      await paylasimOlustur({
        istemciAnahtari: anahtarRef.current as string,
        aciklama,
        kitle,
        dosyalar: secilenler.map((gorsel) => ({
          veri: gorsel.veri,
          uzanti: gorsel.uzanti,
          genislik: gorsel.genislik,
          yukseklik: gorsel.yukseklik,
          /* Boş açıklama uydurulmuyor: sunucuya NULL gidiyor. */
          alt: gorsel.alt.trim() === '' ? null : gorsel.alt.trim(),
        })),
        ilerleme: (yuklenen, toplam) => setIlerleme({ yuklenen, toplam }),
      });
      /*
        BAŞARI YALNIZ BURADA. `paylasimOlustur` ancak `tamamla`
        döndükten sonra çözülüyor; daha erken bir "paylaşıldı" cümlesi,
        henüz kimseye görünmeyen bir taslağı yayımlanmış göstermek
        olurdu.
      */
      onTamamlandi();
    } catch (sorun) {
      setGonderimHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'Paylaşım tamamlanamadı. Bağlantını kontrol edip yeniden dene.',
      );
      setGonderiliyor(false);
      setIlerleme(null);
    }
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1.5">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          Fotoğraf paylaş
        </h1>
      </header>

      <form onSubmit={gonder} className="space-y-4" noValidate aria-busy={kilitli}>
        <div className={`${KART} space-y-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECIM_ETIKETI}>
              <ImagePlus aria-hidden className="h-4 w-4" />
              <span>{secilenler.length === 0 ? 'Fotoğraf seç' : 'Fotoğraf ekle'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={kilitli || secilenler.length >= EN_FAZLA_FOTOGRAF}
                onChange={dosyaSecildi}
                className="sr-only"
              />
            </label>
            <p className="text-xs text-gray-600">
              {secilenler.length} / {EN_FAZLA_FOTOGRAF} fotoğraf
            </p>
          </div>

          {hazirlaniyor && (
            <p role="status" className="text-sm font-semibold text-gray-700">
              Fotoğraflar hazırlanıyor…
            </p>
          )}

          {uyari && (
            <p role="alert" className="text-xs font-semibold leading-relaxed text-amber-800">
              {uyari}
            </p>
          )}

          {/*
            SEÇİM YOKKEN SAHTE KUTU ÇİZİLMİYOR

            Boş bir "fotoğraf yeri" ızgarası, doldurulacak sabit sayıda
            yuva olduğunu ima ederdi. Sayı 1 ile 10 arasında değişken;
            liste ancak gerçek seçimle doluyor.
          */}
          {secilenler.length > 0 && (
            <ol className="space-y-2">
              {secilenler.map((gorsel, indeks) => (
                <li
                  key={gorsel.anahtar}
                  className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-2"
                >
                  <div className="flex items-center gap-2.5">
                    {/*
                      Önizlemenin `alt`ı BOŞ: bu küçük resim, yanındaki
                      "1. fotoğraf" satırının ve altındaki açıklama
                      kutusunun tekrarı. İçeriği anlatan metni kullanıcı
                      yazıyor ve o metin paylaşımın kendisine gidiyor.
                    */}
                    <img
                      src={gorsel.onizleme}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg bg-white object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900">
                        {indeks + 1}. fotoğraf
                        {indeks === 0 && <span className="ml-1 text-gray-600">(kapak)</span>}
                      </p>
                      <p className="truncate text-[11px] tabular-nums text-gray-600">
                        {gorsel.genislik}×{gorsel.yukseklik} piksel
                      </p>
                    </div>
                  </div>

                  <label className="block">
                    <span className="block text-[11px] font-semibold text-gray-700">
                      Görselde ne var? (isteğe bağlı, ekran okuyucu için)
                    </span>
                    <input
                      type="text"
                      value={gorsel.alt}
                      maxLength={200}
                      disabled={kilitli}
                      onChange={(olay) => altYaz(gorsel.anahtar, olay.target.value)}
                      className={`mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 ${RENK_GECISI} ${ODAK_HALKASI}`}
                    />
                  </label>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      aria-label={`${indeks + 1}. fotoğrafı yukarı taşı`}
                      disabled={kilitli || indeks === 0}
                      onClick={() => tasi(indeks, -1)}
                      className={SIRA_DUGMESI}
                    >
                      <ArrowUp aria-hidden className="h-4 w-4" />
                      Yukarı
                    </button>
                    <button
                      type="button"
                      aria-label={`${indeks + 1}. fotoğrafı aşağı taşı`}
                      disabled={kilitli || indeks === secilenler.length - 1}
                      onClick={() => tasi(indeks, 1)}
                      className={SIRA_DUGMESI}
                    >
                      <ArrowDown aria-hidden className="h-4 w-4" />
                      Aşağı
                    </button>
                    <button
                      type="button"
                      aria-label={`${indeks + 1}. fotoğrafı kaldır`}
                      disabled={kilitli}
                      onClick={() => kaldir(gorsel.anahtar)}
                      className={SIRA_DUGMESI}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                      Kaldır
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className={KART}>
          <AciklamaAlani
            kimlik="paylasim-aciklama"
            etiket="Açıklama"
            deger={aciklama}
            onDegis={setAciklama}
            enFazla={ACIKLAMA_SINIRI}
          />
        </div>

        <fieldset className={`${KART} space-y-2`}>
          <legend className="text-sm font-bold text-gray-900">Kimler görebilir?</legend>
          {/*
            İKİ SEÇENEK, ÜÇÜNCÜSÜ YOK

            Şemadaki `posts_kitle_gecerli` CHECK'i tam olarak bu iki
            değeri kabul ediyor. "Herkes" diye bir seçenek çizmek,
            sunucunun reddedeceği bir işi kullanıcıya yaptırmak olurdu:
            alan sınırı iki kitlenin de üstünde.
          */}
          {(
            [
              {
                deger: 'baglantilarim' as const,
                etiket: 'Bağlantılarım',
                aciklama: 'Yalnızca karşılıklı bağlantı kurduğun kişiler görür.',
              },
              {
                deger: 'alan-toplulugum' as const,
                etiket: 'Alan topluluğum',
                aciklama: 'Aynı alandaki, topluluğa katılmış herkes görür.',
              },
            ] as const
          ).map((secenek) => {
            /*
              ÜYE OLMAYANDA SEÇENEK KAPALI, GİZLİ DEĞİL

              Kaldırmak da bir yoldu ama o zaman kullanıcı iki kitleden
              birini hiç görmez ve paylaşımının neden yalnız
              bağlantılarına gittiğini bilmezdi. Kapalı satır sebebini
              de yanında yazıyor; sebebin altında da açan adres var.

              Üyelik OKUNAMADIYSA da kapalı: bilinmeyen bir yetkiyi açık
              varsaymak, sunucunun reddedeceği bir gönderime kapı
              açardı.
            */
            const uyelikSarti = secenek.deger === 'alan-toplulugum';
            const pasif = kilitli || (uyelikSarti && !uyeMiyim);
            return (
              <label
                key={secenek.deger}
                className={`flex min-h-11 items-start gap-2.5 rounded-xl border p-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 ${RENK_GECISI} ${
                  pasif && !kilitli ? 'opacity-60' : 'cursor-pointer'
                } ${
                  kitle === secenek.deger
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="paylasim-kitlesi"
                  value={secenek.deger}
                  checked={kitle === secenek.deger}
                  disabled={pasif}
                  aria-describedby={uyelikSarti && !uyeMiyim ? 'kitle-uyelik-sebebi' : undefined}
                  onChange={() => setKitle(secenek.deger)}
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-gray-900">{secenek.etiket}</span>
                  <span className="block text-xs leading-relaxed text-gray-600">
                    {secenek.aciklama}
                  </span>
                </span>
              </label>
            );
          })}

          {/*
            SEBEP ETİKETİN DIŞINDA

            Bağlantı `<label>` içinde olsaydı, ona tıklamak radyo
            düğmesini de tetiklerdi — kullanıcı topluluk ekranına
            giderken kitlesini de değiştirmiş olurdu. Bu yüzden kardeş
            paragraf, `aria-describedby` ile radyoya bağlı.
          */}
          {!uyeMiyim && (
            <p id="kitle-uyelik-sebebi" className="text-xs leading-relaxed text-gray-600">
              {uyelikDurumu === 'yukleniyor'
                ? 'Topluluk üyeliğin okunuyor; "Alan topluluğum" o zamana kadar kapalı.'
                : uyelikDurumu === 'hata'
                  ? 'Topluluk üyeliğin okunamadı; "Alan topluluğum" bu yüzden kapalı. Paylaşımın bağlantılarına açılabilir.'
                  : '"Alan topluluğum" alan topluluğuna katılınca açılıyor.'}{' '}
              <a
                href={TOPLULUKLAR_YOLU}
                onClick={(olay) => {
                  if (!onNavigate) return;
                  if (
                    olay.metaKey ||
                    olay.ctrlKey ||
                    olay.shiftKey ||
                    olay.altKey ||
                    olay.button !== 0
                  )
                    return;
                  olay.preventDefault();
                  onNavigate(TOPLULUKLAR_YOLU);
                }}
                className={`font-semibold text-blue-700 underline underline-offset-2 ${ODAK_HALKASI}`}
              >
                Alan toplulukları
              </a>
            </p>
          )}
        </fieldset>

        {gonderimHatasi && <KayitHatasi mesaj={gonderimHatasi} />}

        {/*
          İLERLEME GERÇEK SAYIYLA

          Yüzdeyi tahmin eden bir çubuk çizilmiyor: elimizdeki tek
          ölçüm kaç dosyanın YAZILDIĞI. Yüzde uydurmak, son dosyada
          takılan bir yüklemeyi "%99" diye göstermek olurdu.
        */}
        {ilerleme && (
          <p role="status" className="text-sm font-semibold text-gray-700">
            {ilerleme.yuklenen < ilerleme.toplam
              ? `Fotoğraflar yükleniyor… ${ilerleme.yuklenen} / ${ilerleme.toplam}`
              : 'Paylaşım tamamlanıyor…'}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={kilitli || secilenler.length === 0}
            className={BIRINCIL_EYLEM}
          >
            {gonderiliyor ? 'Paylaşılıyor…' : 'Paylaş'}
          </button>
          {/*
            VAZGEÇ GÖNDERİM SIRASINDA KİLİTLİ

            Yarı yolda kapatmak, sunucuda taslak ve kovada dosya
            bırakırdı: temizlik akışın hata dalında çalışıyor, ekran
            kapanınca değil. Gönderim ya tamamlanıyor ya da hata verip
            kendi izini siliyor.
          */}
          <button type="button" onClick={onVazgec} disabled={kilitli} className={IKINCIL}>
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  );
};
