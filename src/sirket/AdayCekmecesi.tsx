import React from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  ExternalLink,
  FileText,
  Github,
  Linkedin,
  Loader2,
  Mail,
  Phone,
  ShieldOff,
  X,
} from 'lucide-react';
import {
  ALAN,
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  SIRKET_ZEMIN,
  alanStil,
  birincilStil,
  ikincilStil,
} from './renk';
import { kimlikSatiri, monogram } from '../lib/aday-kart.mjs';
import { adayBaglantilari, adayProfilFarki, rozetEtiketi } from '../lib/aday-profil-farki.mjs';
import { guvenliDisAdres } from '../lib/guvenli-url.mjs';
import { tarihAraligi } from '../lib/deneyim.mjs';
import { tarihMetni as ortakTarihMetni } from '../lib/tarih.mjs';
import { telefonBaglantisi, telefonYaz } from '../lib/telefon.mjs';
import {
  SADE_SIRKET_DURUMLARI,
  durumAdi,
  durumRozeti,
  adayIletisimiAcik,
  sirketDurumCumlesi,
  ogrencininKarari,
  sadeSonrakiDurum,
  surecKapandi,
  teklifBekliyor,
} from './basvuru-durumu';
import {
  gorusmeBekliyor,
  gorusmeOnaylandi,
  gorusmeSirketCumlesi,
  gorusmeTuruAdi,
  gorusmeYeriEtiketi,
} from '../lib/basvuru-durumu.mjs';
import {
  AdayGuncelProfil,
  DegistiIsareti,
  useAdayGuncelProfili,
  type GuncelProfilYukleyici,
} from './AdayGuncelProfil';
import { AdayPaylasimlari, type PaylasimYukleyici } from './AdayPaylasimlari';

/**
 * Aday inceleme ekranı.
 *
 * DAR ÇEKMECEDEN GENİŞ EKRANA (4 Ekim 2026)
 * -----------------------------------------
 * Ayrıntı sağdan açılan 448 piksellik (`max-w-md`) bir çekmeceydi. Ön
 * yazı, projeler ve eylemler aynı dar sütunda alt alta diziliyordu ve
 * masaüstünde ekranın dörtte üçü karartılmış arka plan olarak boş
 * kalıyordu. Şimdi:
 *   - lg ve üstü: ortada en çok 1200 piksellik panel, iki sütun — solda
 *     durum ve işlemler (kendi içinde kayıyor), sağda adayın profili
 *   - lg altı: tam ekran, tek sütun; sıra üst şerit → işlemler → profil
 * DOM sırası görsel sırayla aynı (şerit, işlemler, profil): klavye ve
 * ekran okuyucu ekranda gördüğü sırayla geziyor.
 *
 * ÜST ŞERİT
 * ---------
 * "Başvurduğu ilan", durum ve başvuru tarihi her zaman görünür ve
 * kaydırmayla kaybolmuyor. Aynı öğrencinin iki ilana başvurusu iki ayrı
 * başvuru kimliği; ekran hangisine bakıldığını ilk satırda söylüyor.
 *
 * FLIP YOK
 * --------
 * Kart çevrilmiyor. Çevirme animasyonu ilk seferde hoş, yirminci
 * başvuruda engel: kullanıcı arkadaki bilgiye ulaşmak için her seferinde
 * animasyonu bekliyor. Ekran listenin ÜSTÜNE açılıyor; liste DOM'da
 * kalıyor, süzgeçleri ve kaydırma konumu korunuyor.
 *
 * PORTAL
 * ------
 * `document.body` altına çiziliyor. Üstteki başlık çubuğunun `sticky` ve
 * `backdrop-filter` bağlamı, `position: fixed` alt öğeleri kendi kutusuna
 * hapsediyor — hesap panelinde aynı hata bir kez yaşandı.
 */

/** Tarihi okunur yazar; bozuk/boş değerde bir şey yazmaz. */
function tarihMetni(deger: string): string {
  const t = new Date(String(deger));
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Karşı tarafın iletişim satırı — sunucunun döndürdüğü biçim. */
export type Iletisim = {
  ad: string | null;
  eposta: string | null;
  telefon: string | null;
  unvan: string | null;
};

export type { GuncelProfilYukleyici, PaylasimYukleyici };

/** Bölüm içi alt başlık (Yetenekler, Diller…). */
const Baslik: React.FC<{ children: React.ReactNode; degisti?: boolean }> = ({ children, degisti }) => (
  <h4
    className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest"
    style={{ color: SIRKET_METIN_IKINCIL }}
  >
    {children}
    {degisti && <DegistiIsareti />}
  </h4>
);

/** Ekranın büyük bölümleri: işlemler, ön yazı, başvuru anındaki profil. */
const BolumBasligi: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h3 id={id} className="text-base font-extrabold" style={{ color: SIRKET_METIN }}>
    {children}
  </h3>
);

const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const AdayCekmecesi: React.FC<{
  kart: Record<string, any> | null;
  kaydediliyor: boolean;
  onKapat: () => void;
  /*
    Söz döndürüyor: durum değişimi başarısız olursa hata EKRANIN
    İÇİNDE gösterilecek. Panelin tamamını kapatmak ya da sessizce
    yutmak yerine.
  */
  onDurum: (durum: string) => void | Promise<void>;
  onNot: (metin: string) => void;
  /*
    Mülakat tarihi OPSİYONEL ve durumdan bağımsız kaydediliyor: tarih
    girmek adayı mülakata almanın şartı değil.
  */
  onMulakatTarihi?: (tarih: string) => void | Promise<void>;
  /* Teklifi durumla BİRLİKTE yazıyor: arada içi boş bir teklif oluşmasın. */
  onTeklif?: (teklif: {
    not: string;
    baslangic: string;
    ucret: string;
  }) => void | Promise<void>;
  /* Görüşme daveti de durumla BİRLİKTE yazılıyor. */
  onDavet?: (davet: {
    tarih: string;
    saat: string;
    tur: string;
    yer: string;
    not: string;
  }) => void | Promise<void>;
  /* Kabul edilmiş teklifte karşı tarafın iletişim satırı; kapalıysa null. */
  onIletisim?: (id: string) => Promise<Iletisim | null>;
  /*
    Güncel profil ve paylaşımlar (20261121010000). İkisi de başvuru
    kimliğiyle soruluyor; kapı sunucuda. Kararlı işlev bekleniyor
    (SirketPaneli modül düzeyindeki işlevleri geçiriyor).
  */
  onGuncelProfil?: GuncelProfilYukleyici;
  onPaylasimlar?: PaylasimYukleyici;
  /** Yalnız geliştirme fikstürü: paylaşım görseli için yerel dosya. */
  yerelGorselAdresi?: (yol: string) => string | null;
  /*
    Yazma yetkisi olmayan üye (Viewer). Çekmece AÇILIYOR, yalnız işlem
    sütunu çizilmiyor — gerekçe o sütunun başında.
  */
  saltOkunur?: boolean;
  /*
    AYRINTI BAŞARIYLA ÇİZİLDİ → görüntülenme kaydı.

    Efekt bu bileşenin İÇİNDE: render hata verirse React efekti
    çalıştırmıyor, kayıt yazılmıyor. Kayıt sunucuda yetkiyle yazılıyor
    (`basvuru_goruntulendi`); burası yalnız "gerçekten açıldı" anını
    bildiriyor.
  */
  onGoruntulendi?: (id: string) => void;
}> = ({
  kart,
  kaydediliyor,
  onKapat,
  onDurum,
  onNot,
  /*
    `onMulakatTarihi`, `onTeklif`, `onDavet` prop tipinde DURUYOR (ızgara
    hâlâ geçiriyor) ama burada kullanılmıyor: sade akışta görüşme ve
    teklif bu ekrandan çıktı.
  */
  onIletisim,
  onGuncelProfil,
  onPaylasimlar,
  yerelGorselAdresi,
  saltOkunur,
  onGoruntulendi,
}) => {
  /*
    İmzalı adres tıklama anında üretiliyor, kart çizilirken değil: adresin
    ömrü on dakika ve önceden üretilseydi açılmadan ölürdü. Ayrıca
    görülmeyen her aday için gereksiz bir istek olurdu.
  */
  const [cvAciliyor, setCvAciliyor] = React.useState(false);
  const [cvHatasi, setCvHatasi] = React.useState<string | null>(null);
  /*
    ÖNYARGISIZ KİPTE CV ÖNCE SORULUYOR (5 Ekim 2026)

    CV adayın kendi belgesi: adı, fotoğrafı ve iletişim bilgisi içinde
    olabilir ve bu ekran o dosyayı değiştiremiyor. Önyargısız kipte
    düğme dosyayı açmadan önce bunu söylüyor; şirket yine de açabilir
    (inceleme için gerekli belge) ama bilerek açıyor.
  */
  const [cvOnayi, setCvOnayi] = React.useState(false);
  const cvAc = async () => {
    if (!kart?.cvYolu) return;
    setCvHatasi(null);
    setCvAciliyor(true);
    try {
      const { cvGoruntulemeAdresi } = await import('../lib/cv');
      const adres = await cvGoruntulemeAdresi(kart.cvYolu);
      window.open(adres, '_blank', 'noopener,noreferrer');
    } catch {
      setCvHatasi('CV açılamadı. Şirket doğrulaması tamamlanmamış olabilir.');
    } finally {
      setCvAciliyor(false);
    }
  };

  /*
    Durum kontrolünün yerel durumu. HEPSİ erken çıkışın üstünde:
    aşağıda tanımlanmış bir hook, panelin tamamını beyaz ekrana
    düşüren P0 hatasının kaynağıydı.
  */
  /*
    GÖRÜNTÜLENME — yalnız başarılı çizimden sonra, aday başına bir kez.
    Erken dönüşten (`if (!kart) return null`) ÖNCE: hook kuralı.
  */
  React.useEffect(() => {
    if (!kart?.id || !onGoruntulendi) return;
    onGoruntulendi(String(kart.id));
  }, [kart?.id, onGoruntulendi]);

  const [olumsuzSoruldu, setOlumsuzSoruldu] = React.useState(false);
  const [durumHatasi, setDurumHatasi] = React.useState<string | null>(null);
  const [mulakatTarihi, setMulakatTarihi] = React.useState('');

  /*
    Davet ve teklif FORMLARININ durumları kaldırıldı: sade akışta bu
    ekranda görüşme planlanmıyor ve teklif gönderilmiyor.
  */

  /*
    Karşı tarafın iletişim satırı. YALNIZCA teklif kabul edildiğinde
    isteniyor ve gelen şey sunucunun verdiği satır — burada bir kural
    yeniden yazılmıyor.
  */
  const [iletisim, setIletisim] = React.useState<Iletisim | null>(null);
  const [iletisimHatasi, setIletisimHatasi] = React.useState(false);

  const [ikinciAcik, setIkinciAcik] = React.useState(false);
  const [not, setNot] = React.useState('');
  const govde = React.useRef<HTMLDivElement | null>(null);
  const kapatRef = React.useRef(onKapat);
  kapatRef.current = onKapat;

  /*
    GÜNCEL PROFİL — yalnız rıza varsa soruluyor. Rıza yoksa kartta kopya
    da yok (`paylasildi: false`) ve sunucu zaten `riza: false` döner;
    istek hiç gönderilmiyor. Erken çıkışın ÜSTÜNDE: kanca sayısı kart
    açıkken ve kapalıyken aynı kalmalı.
  */
  const guncelProfil = useAdayGuncelProfili(kart?.id ?? null, Boolean(kart?.paylasildi), onGuncelProfil);
  const fark = React.useMemo(
    () =>
      kart && guncelProfil.sonuc?.riza && guncelProfil.sonuc.guncel
        ? adayProfilFarki(kart, guncelProfil.sonuc.guncel, { kimlikGizli: Boolean(kart.gizli) })
        : null,
    [kart, guncelProfil.sonuc],
  );

  /* Çekmece değiştiğinde ikinci sıra, not ve CV hatası sıfırlanıyor. */
  React.useEffect(() => {
    setIkinciAcik(false);
    setNot('');
    /* İkinci adaya geçince önceki adayın CV hatası ekranda kalmasın. */
    setCvHatasi(null);
    setCvAciliyor(false);
    setCvOnayi(false);
    setOlumsuzSoruldu(false);
    setDurumHatasi(null);
    setMulakatTarihi(kart?.mulakatTarihi ?? '');
  }, [kart?.id, kart?.mulakatTarihi]);

  /*
    İLETİŞİM: TEKLİF KABULÜ ARTIK ŞART DEĞİL (sade akış)

    İstek yalnız öğrencinin onayı bu akışı KAPSIYORSA gönderiliyor
    (`adayIletisimiAcik`, sunucudaki `basvuru_iletisimi_acik` ile aynı
    cümle). Kapsamıyorsa istek hiç gidilmiyor; sunucu zaten boş
    dönerdi ama ekranın niyeti de açık olmalı.

    SALT OKUNUR ÜYE İSTEMİYOR: sunucu Viewer'a iletişim döndürmüyor
    (`sirket_basvuru_yazabilir`). Boşuna istek atıp boş cevabı "hata"
    gibi göstermek yanıltıcı olurdu.

    Aday değişince önceki adayın satırı hemen düşüyor.
  */
  React.useEffect(() => {
    setIletisim(null);
    setIletisimHatasi(false);
    if (!kart?.id || saltOkunur || !adayIletisimiAcik(kart) || !onIletisim) return;

    let iptal = false;
    Promise.resolve(onIletisim(kart.id))
      .then((satir) => {
        if (!iptal) setIletisim(satir ?? null);
      })
      .catch(() => {
        if (!iptal) setIletisimHatasi(true);
      });
    return () => {
      iptal = true;
    };
    /*
      Rıza alanları da bağımlılıkta: öğrenci paylaşımı kapatıp açtığında
      ekran eski satırı tutmuyor, yeniden okuyor. Kapı yine sunucuda;
      yeniden okuma boş dönüyor.
    */
  }, [kart?.id, kart?.durum, kart?.paylasimOnayi, kart?.paylasimSurumu, onIletisim, saltOkunur]);

  /*
    ODAK YALNIZ AÇILIŞTA PANELE TAŞINIYOR

    Odak `kart` NESNESİNE bağlıydı. Durum değişince liste yeniden
    yükleniyor ve kart yeni bir nesne oluyor; odak her kayıttan sonra
    seçiciden panelin köküne sıçrıyordu. Artık yalnız başka bir başvuru
    açıldığında taşınıyor.
  */
  const acikId: string | null = kart?.id ?? null;
  React.useEffect(() => {
    if (acikId) govde.current?.focus();
  }, [acikId]);

  /*
    ESCAPE, ODAK TUZAĞI, GÖVDE KİLİDİ

    Panel `aria-modal`; Tab arkadaki listeye kaçmıyor. Gövde kaydırması
    kilitli, böylece arkadaki liste kaymıyor ve kapanınca aynı konumda
    duruyor. Görsel görüntüleyici kendi dinleyicisini YAKALAMA evresinde
    kurup olayı durduruyor: onun Escape'i yalnız onu kapatıyor.
  */
  React.useEffect(() => {
    if (!acikId) return undefined;
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        kapatRef.current();
        return;
      }
      if (e.key !== 'Tab' || !govde.current) return;
      const ogeler = Array.from(govde.current.querySelectorAll<HTMLElement>(ODAKLANABILIR)).filter(
        (oge) => oge.offsetParent !== null,
      );
      if (ogeler.length === 0) return;
      const ilk = ogeler[0];
      const son = ogeler[ogeler.length - 1];
      const icerde = govde.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === ilk || document.activeElement === govde.current || !icerde)) {
        e.preventDefault();
        son.focus();
      } else if (!e.shiftKey && (document.activeElement === son || !icerde)) {
        e.preventDefault();
        ilk.focus();
      }
    };
    document.addEventListener('keydown', tus);
    const oncekiTasma = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tus);
      document.body.style.overflow = oncekiTasma;
    };
  }, [acikId]);

  /*
    ERKEN ÇIKIŞ — BÜTÜN HOOK'LARDAN SONRA

    P0: Bu satırın ALTINDA iki `useState` duruyordu (CV düğmesinin
    açılıyor/hata durumu). Çekmece kapalıyken bileşen 5 hook ile,
    "İncele"ye basılınca 7 hook ile render oluyordu. React bunu
    "Rendered more hooks than during the previous render." diye
    yükseltiyor ve hata render sırasında atıldığı için TÜM AĞAÇ
    sökülüyordu — işveren paneli komple beyaz ekrana düşüyordu.

    Liste ekranı çalışmaya devam ettiği için hata yalnızca aday
    ayrıntısını açarken görünüyordu.

    Kural: bu satırdan sonra hiçbir hook çağrılamaz.
  */
  if (!kart) return null;

  const kimlik = kimlikSatiri(kart);
  /* Akıştaki bir sonraki adım; kapanmış durumlarda yok. */
  /*
    Sonraki adım GÖRÜŞME YANITINA da bağlı: teklif ancak öğrenci
    görüşmeye katılacağını bildirdiyse anlamlı.
  */
  /*
    SADE AKIŞ: tek birincil adım yeni başvuruyu incelemeye almak.
    Görüşme ve teklif adımları temel akıştan çıktı (sadeSonrakiDurum).
  */
  const sonraki = sadeSonrakiDurum(kart.durum);
  const davetBekliyor = gorusmeBekliyor(kart.durum, kart.gorusmeYaniti);
  const davetOnaylandi = gorusmeOnaylandi(kart.durum, kart.gorusmeYaniti);
  const gorusmeAsamasi = kart.durum === 'interview_scheduled';

  /*
    SÜREÇ BİTTİ: aday hakkında verilecek bir karar kalmadı.
    `kararKilitli` bundan dar — yalnız ÖĞRENCİNİN verdiği kararlar.
    Şirketin kendi olumsuz kararı (`rejected`) geri alınabiliyor:
    yanlışlıkla kapatılan bir adayı yeniden açmak meşru.
  */
  const terminal = surecKapandi(kart.durum);
  const kararKilitli = ogrencininKarari(kart.durum);

  /*
    BAŞLIK VE AÇIKLAMA AYNI CÜMLE OLMASIN

    Bant önce başlıkta "Teklif kabul edildi", hemen altında yine "Teklif
    kabul edildi" yazıyordu. Başlık DURUMU söylüyor; alttaki satır ne
    olduğunu ve şirketin bundan sonra ne yapacağını söylüyor.
  */
  const adSoylemi = kart.gizli ? 'Aday' : (kart.ad ?? 'Aday');
  const finalAciklama =
    kart.durum === 'offer_accepted'
      ? `${adSoylemi} teklifi kabul etti. İletişim bilgileri artık açık.`
      : kart.durum === 'offer_declined'
        ? `${adSoylemi} gönderdiğiniz teklifi reddetti.`
        : kart.durum === 'withdrawn'
          ? `${adSoylemi} başvurusunu geri çekti.`
          : 'Bu başvuruyu olumsuz olarak kapattınız.';

  /*
    TEKLİF ÖZETİ — ÜÇ KAYNAK, TEK LİSTE

    Ücret teklifte yazılıysa o geçerli, yoksa ilandaki bilgi. Çalışma
    biçimi ve süre yalnız ilandan geliyor; şirket teklif gönderirken
    onları tekrar yazmıyor. Değeri olmayan satır listeye HİÇ
    girmiyor.
  */
  const teklifOzeti = [
    { etiket: 'Başlangıç', deger: kart.teklifBaslangici ? tarihMetni(kart.teklifBaslangici) : '' },
    { etiket: 'Ücret', deger: kart.teklifUcreti || kart.ilanUcreti || '' },
    { etiket: 'Çalışma biçimi', deger: kart.ilanCalismaBicimi || '' },
    { etiket: 'Süre', deger: kart.ilanSuresi || '' },
  ].filter((satir) => satir.deger);
  /* Öğrenci teklife yanıt verdiyse karar onun; şirket geri alamıyor. */
  const kararVerildi = kart.durum === 'offer_accepted' || kart.durum === 'offer_declined';

  /*
    Durum değişiminin hatası ekranı KAPATMIYOR: alanın altında
    satır içi görünüyor, aday açık kalıyor, şirket tekrar deneyebiliyor.
  */
  const durumDegistir = (d: string) => {
    setDurumHatasi(null);
    Promise.resolve(onDurum(d)).catch(() => {
      setDurumHatasi('Durum kaydedilemedi. Bağlantını kontrol edip tekrar dene.');
    });
  };

  /*
    LİSTELER DİZE OLMAYAN ÖĞEYE DAYANIKLI

    `profile_snapshot` istemcide üretilip veritabanına yazılıyor; şeması
    zorlanmıyor. Bir gün diller ya da yetenekler nesne dizisi olarak
    gelirse `join(', ')` ekrana "[object Object]" yazardı ve `.map`
    içindeki bir alan erişimi ayrıntıyı komple düşürebilirdi.

    Dize olmayan ve boş öğeler atılıyor. Liste tamamen boşalırsa o bölüm
    hiç çizilmiyor — eksik bir alan yüzünden ayrıntı açılmamazlık
    etmiyor.
  */
  const dizeListesi = (deger: unknown): string[] =>
    Array.isArray(deger)
      ? deger.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];

  const yetenekler = dizeListesi(kart.yetenekler);
  const diller = dizeListesi(kart.diller);
  const rozetler = dizeListesi(kart.rozetler);
  const projeler = Array.isArray(kart.projeler) ? kart.projeler : [];
  /* Başvuru anındaki deneyimler (kartVerisi doğruladı); boşsa bölüm hiç çizilmiyor. */
  const deneyimler = Array.isArray(kart.deneyimler) ? kart.deneyimler : [];
  /*
    Dış bağlantılar yalnız güvenli HTTPS adrese çevrilebiliyorsa.

    ÖNYARGISIZ İNCELEMEDE BAĞLANTI YOK: LinkedIn yolu, GitHub kullanıcı
    adı ve kişisel portfolyo alan adı çoğunlukla kişinin adını taşıyor;
    düğmenin metni ad içermese de hedef adres (fareyle üzerine gelince
    durum çubuğunda, tıklayınca sayfanın kendisinde) adı geri getiriyor.
    Bağlantı var ama gizli ise bunu söyleyen tek satır kalıyor. CV düğmesi
    duruyor: inceleme için gerekli belge ve önceki davranış buydu.
  */
  const baglantilar = kart.gizli ? [] : adayBaglantilari(kart);
  const baglantiGizlendi = Boolean(kart.gizli) && adayBaglantilari(kart).length > 0;
  const egitim = [
    { etiket: 'Üniversite', deger: kart.universite },
    { etiket: 'Bölüm', deger: kart.bolum },
    { etiket: 'Sınıf', deger: kart.sinif },
  ].filter((s) => typeof s.deger === 'string' && s.deger.trim());
  const bolumDegisti = (b: string) => Boolean(fark?.bolumler?.[b as keyof typeof fark.bolumler]);

  const durum = durumRozeti(kart.durum);
  const basvuruTarihi = ortakTarihMetni(kart.tarih);
  const ilanBasligi = typeof kart.ilanBasligi === 'string' && kart.ilanBasligi.trim() ? kart.ilanBasligi : null;
  /* Yalnız StajımVar üzerinden yapılan başvuruda paylaşım izni var. */
  const paylasimBolumu = kart.yontem === 'internal' && Boolean(onPaylasimlar);

  const panel = (
    <div
      ref={govde}
      role="dialog"
      aria-modal
      aria-labelledby="aday-inceleme-basligi"
      tabIndex={-1}
      className="absolute inset-0 flex flex-col overflow-hidden outline-none lg:inset-y-6 lg:left-1/2 lg:right-auto lg:w-[calc(100%-3rem)] lg:max-w-[1200px] lg:-translate-x-1/2 lg:rounded-2xl lg:border lg:shadow-xl"
      style={{ background: SIRKET_ZEMIN, borderColor: SIRKET_KENAR }}
    >
      {/* ------------------------------------------------ üst şerit */}
      <div
        className="shrink-0 border-b px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pb-4"
        style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}
      >
        <div className="flex items-start gap-3">
          {kart.fotoUrl && !kart.gizli ? (
            <img src={kart.fotoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-black"
              style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
            >
              {kart.gizli ? <ShieldOff className="h-5 w-5" /> : monogram(kart.ad)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id="aday-inceleme-basligi"
              className="break-words text-lg font-extrabold leading-tight"
              style={{ color: SIRKET_METIN }}
            >
              {kart.gizli ? 'Aday' : (kart.ad ?? 'Ad paylaşılmadı')}
            </h2>
            {kimlik && (
              <p className="mt-0.5 text-xs font-semibold" style={{ color: SIRKET_METIN_IKINCIL }}>
                {kimlik}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onKapat}
            className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm font-bold hover:bg-gray-50 ${SIRKET_ODAK}`}
            style={ikincilStil}
          >
            <X className="h-4 w-4" aria-hidden />
            Kapat
          </button>
        </div>

        {/*
          BAŞVURDUĞU İLAN — KESİLMEDEN

          Kartta iki satıra kısaltılan başlık burada tam yazıyor; uzun
          başlık satır kırıyor, ekrandan taşmıyor (`break-words`).
        */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="min-w-0 basis-full text-sm leading-snug sm:basis-auto sm:flex-1" style={{ color: SIRKET_METIN }}>
            <span className="font-semibold" style={{ color: SIRKET_METIN_IKINCIL }}>
              Başvurduğu ilan:{' '}
            </span>
            <strong className="break-words">{ilanBasligi ?? 'İlan bilgisi alınamadı'}</strong>
          </p>
          <span className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold" style={durum.stil}>
            {durum.etiket}
          </span>
          {basvuruTarihi && (
            <span className="shrink-0 text-xs font-semibold" style={{ color: SIRKET_METIN_IKINCIL }}>
              Başvuru: {basvuruTarihi}
            </span>
          )}
        </div>
      </div>

      {/*
        GÖVDE: lg altında tek kaydırma (işlemler + profil birlikte kayıyor;
        işlem formu açıldığında profili ezmiyor). lg ve üstünde iki sütun,
        her biri kendi içinde kayıyor.
      */}
      <div className="min-h-0 flex-1 overflow-y-auto lg:flex lg:overflow-hidden">
        {/* ------------------------------------------------ eylemler */}
        {/*
          YEDİ DÜĞME YERİNE: DURUM SEÇİCİ + BİR SONRAKİ ADIM

          Altta üç düğme ("İncelemede", "Mülakat", "Reddet") ve
          katlanmış bir "Daha fazla" içinde iki düğme daha vardı. Beş
          eylem yan yana, hangisinin sıradaki adım olduğu belirsiz.

          Şimdi:
            - üstte MEVCUT DURUM ve tek bir seçici (yerli `select`:
              telefonda sistemin kendi tekerleği açılıyor, ekran dışına
              taşmıyor ve klavye erişimi bedava geliyor)
            - altında akıştaki BİR SONRAKİ ADIM tek birincil düğme
            - yanında "Olumsuz" — küçük bir onayla

          `withdrawn` seçenekler arasında yok: geri çekmek adayın kararı.
          Aynı kural veritabanında da duruyor.
        */}
        {/*
          SALT OKUNUR ÜYE: İNCELER, YAZMAZ (5 Ekim 2026)

          Viewer'ın çekmecesi önce hiç açılmıyordu — yazamayan üye aday
          ayrıntısını da göremiyordu. "Yazamaz" sessizce "inceleyemez"
          olmuştu; oysa rolün amacı tam tersi: görsün ama karışmasın.

          Çözüm yazma denetimlerini DEVRE DIŞI bırakmak değil, HİÇ
          ÇİZMEMEK. Kapalı bir seçici ya da reddedilecek bir düğme,
          kullanıcıya yapabileceği bir şey varmış gibi gösterirdi.

          Aday gövdesi (profil, paylaşımlar, değerlendirme geçmişi)
          aşağıda OLDUĞU GİBİ çiziliyor; kesilen yalnız bu sütun.
        */}
        {saltOkunur ? (
          <section
            aria-labelledby="aday-islemler-basligi"
            className="border-b p-4 lg:w-[22rem] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r"
            style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}
          >
            <div className="mb-3">
              <BolumBasligi id="aday-islemler-basligi">Durum</BolumBasligi>
            </div>
            <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
              {durum.etiket}
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
              Görüntüleme yetkisiyle bakıyorsun: adayın başvurusunu ve profilini
              inceleyebilirsin. Durum değiştirme, not yazma, görüşme daveti ve
              teklif şirket sahibinde ve işe alım yetkililerinde.
            </p>
          </section>
        ) : (
        <section
          aria-labelledby="aday-islemler-basligi"
          className="border-b p-4 lg:w-[22rem] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r"
          style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}
        >
          <div className="mb-3">
            <BolumBasligi id="aday-islemler-basligi">Durum ve işlemler</BolumBasligi>
          </div>
          {/*
            SÜRECİN NEREDE OLDUĞU CÜMLEYLE

            Rozet tek kelime söylüyor ("Teklif"); şirketin bilmesi gereken
            ise sıradaki hamlenin kimde olduğu. Terim aynı kalıyor, cümle
            şirkete göre kuruluyor — öğrenci aynı durumu "Teklif aldın"
            diye görüyor.
          */}
          {/*
            Final durumda bu cümle YUKARIDA duruyor; burada ikinci kez
            yazmak aynı şeyi ekranda üç yere dağıtmak olurdu.
          */}
          {!terminal && (gorusmeAsamasi || teklifBekliyor(kart.durum)) && (
            <p
              className="mb-3 rounded-xl px-3 py-2 text-xs font-bold"
              style={
                kart.durum === 'offer_accepted' || davetOnaylandi
                  ? { background: '#DCFCE7', color: '#166534' }
                  : { background: SIRKET_ROZET, color: SIRKET_METIN }
              }
            >
              {kart.durum === 'offer_accepted' ? '🎉 ' : davetOnaylandi ? '✓ ' : ''}
              {/*
                Görüşme aşamasında söylenecek şey DURUMA değil YANITA
                bağlı: davet gönderildi mi, kabul mü edildi, reddedildi mi.
              */}
              {gorusmeAsamasi ? gorusmeSirketCumlesi(kart.gorusmeYaniti) : sirketDurumCumlesi(kart.durum)}
            </p>
          )}

          {/*
            GÖNDERİLEN DAVET

            Eski `interview_scheduled` kayıtlarında bu alanların hiçbiri
            olmayabilir — davet içeriği bu turda eklendi. Her satır kendi
            değeri varsa çiziliyor; boş alan hiç görünmüyor.
          */}
          {gorusmeAsamasi &&
            (kart.mulakatTarihi || kart.gorusmeSaati || kart.gorusmeTuru || kart.gorusmeYeri || kart.gorusmeNotu) && (
              <div
                className="mb-3 rounded-xl border p-3"
                style={{ borderColor: SIRKET_KENAR, background: SIRKET_ZEMIN }}
              >
                <p className="text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Gönderilen davet
                </p>
                {(kart.mulakatTarihi || kart.gorusmeSaati) && (
                  <p className="mt-1 text-xs font-bold" style={{ color: SIRKET_METIN }}>
                    {[tarihMetni(kart.mulakatTarihi), kart.gorusmeSaati].filter(Boolean).join(' · ')}
                  </p>
                )}
                {kart.gorusmeTuru && (
                  <p className="text-xs" style={{ color: SIRKET_METIN }}>
                    {gorusmeTuruAdi(kart.gorusmeTuru)}
                  </p>
                )}
                {kart.gorusmeYeri && (
                  <p className="text-xs" style={{ color: SIRKET_METIN }}>
                    {gorusmeYeriEtiketi(kart.gorusmeTuru)}: {kart.gorusmeYeri}
                  </p>
                )}
                {kart.gorusmeNotu && (
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed" style={{ color: SIRKET_METIN }}>
                    {kart.gorusmeNotu}
                  </p>
                )}
              </div>
            )}

          {/*
            GÖNDERİLEN TEKLİF

            Eski teklif kayıtlarında bu alanların ikisi de boş olabilir —
            teklif içeriği bu turda eklendi. Boşsa bölüm hiç çizilmiyor;
            "belirtilmedi" yazmak da bir bilgi uydurmak olurdu.
          */}
          {/* Final durumda teklif özeti yukarıda; burada yalnız bekleyen teklif. */}
          {!terminal &&
            teklifBekliyor(kart.durum) &&
            (kart.teklifNotu || kart.teklifBaslangici || kart.teklifUcreti) && (
              <div
                className="mb-3 rounded-xl border p-3"
                style={{ borderColor: SIRKET_KENAR, background: SIRKET_ZEMIN }}
              >
                <p className="text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Gönderilen teklif
                </p>
                {(kart.teklifUcreti || kart.teklifBaslangici) && (
                  <p className="mt-1 text-xs font-bold" style={{ color: SIRKET_METIN }}>
                    {[
                      kart.teklifUcreti,
                      kart.teklifBaslangici ? `Başlangıç: ${tarihMetni(kart.teklifBaslangici)}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {kart.teklifNotu && (
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed" style={{ color: SIRKET_METIN }}>
                    {kart.teklifNotu}
                  </p>
                )}
              </div>
            )}

          {/*
            İLETİŞİM ARTIK YUKARIDA

            Kabul sonrası ilk ihtiyaç iletişim; ekranın en altında
            durması onu yetenek ve proje listelerinin arkasına
            itiyordu. Blok gövdenin başına taşındı — burada ikinci bir
            kopyası yok.
          */}

          {/*
            KARAR VERİLDİYSE SEÇİCİ YOK

            Teklif kabul edilmiş adayda hâlâ aktif bir açılır liste
            duruyordu ve gerçekten çalışıyordu: şirket adayı `rejected`
            ya da `under_review` yapabiliyordu. Yanlış bir imkân
            gösteriyordu — üstelik öğrencinin verdiği kararı bozan bir
            imkân.

            Artık sakin, okunur bir satır. Aynı kural veritabanında da
            duruyor (applications_guard_ogrenci_karari): arayüzde kapatıp
            veritabanında açık bırakmak kuralı hiç koymamaktır.

            `rejected` BİLEREK DIŞARIDA: o şirketin kendi kararı ve
            yanlışlıkla kapatılan bir adayı yeniden açmak meşru.
          */}
          {kararKilitli ? (
            <div>
              <p className="mb-1 text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                Durum
              </p>
              <p className="flex items-center gap-1.5 text-sm font-extrabold" style={{ color: SIRKET_METIN }}>
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: SIRKET_VURGU_KOYU }} />
                {durumAdi(kart.durum)}
              </p>
            </div>
          ) : (
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
              Durum
            </span>
            <select
              value={kart.durum}
              disabled={kaydediliyor}
              onChange={(e) => durumDegistir(e.target.value)}
              className={ALAN}
              style={alanStil}
            >
              {SADE_SIRKET_DURUMLARI.map((d: string) => (
                <option key={d} value={d}>
                  {durumAdi(d)}
                </option>
              ))}
              {/*
                Adayın verdiği kararlar seçenekler arasında yok. Mevcut
                durum onlardan biriyse zaten yukarıdaki okunur satır
                çiziliyor, bu dala hiç girilmiyor.
              */}
              {!SADE_SIRKET_DURUMLARI.includes(kart.durum) && (
                <option value={kart.durum} disabled>
                  {durumAdi(kart.durum)}
                </option>
              )}
            </select>
          </label>
          )}

          {/*
            MÜLAKAT TARİHİ ALANI KALDIRILDI

            Tek başına bir tarih kutusu duruyordu ve öğrenci tarafında
            yalnız "Mülakat tarihi: 15 Eylül" satırı çıkıyordu: saat yok,
            biçim yok, yer yok. Sade akışta görüşme planlaması bu ekranda
            hiç yok; eski kayıtların davet bilgisi yukarıda okunuyor.
          */}

          {durumHatasi && (
            <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: '#991B1B' }}>
              {durumHatasi}
            </p>
          )}

          {/*
            SADE AKIŞ: GÖRÜŞME DAVETİ, TEKLİF VE DEĞERLENDİRME AŞAMASI YOK

            Şirketin bu ekrandaki işi adayın profilini, CV'sini ve izinli
            iletişimini incelemek; devamını telefon ya da e-postayla kendisi
            yürütüyor. "Görüşmeye davet et", "Teklif gönder", davet/teklif
            düzenleme formları ve değerlendirme aşamasına geçiş bu
            ekrandan ÇIKARILDI.

            ESKİ KAYITLAR: gönderilmiş davet ve teklif yukarıda GEÇMİŞ
            olarak okunuyor; silinmedi, dönüştürülmedi. Öğrenci açık bir
            teklifi kendi ekranından yanıtlamaya devam ediyor
            (`teklife_yanit_ver`) — şirket tarafında ona dokunan yeni bir
            düğme yok.

            SÜREÇ ZORUNLU DEĞİL: "İncelemeye al" bir kolaylık. Şirket
            durumu hiç değiştirmeden adayı arayabilir.
          */}
          <div className="mt-3 flex flex-wrap gap-2">
            {!terminal && sonraki && (
              <button
                type="button"
                disabled={kaydediliyor}
                onClick={() => durumDegistir(sonraki)}
                className={BIRINCIL_DUGME}
                style={birincilStil}
              >
                {kaydediliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {durumAdi(sonraki)} aşamasına al
              </button>
            )}

              {/*
                OLUMSUZ İKİ ADIMDA

                Yanlışlıkla basılan tek düğme adayın sürecini kapatıyordu.
                Ağır bir modal yerine düğmenin kendisi soruya dönüşüyor.

                Teklif beklerken de duruyor ve soru başkalaşıyor: ayrı bir
                "teklifi geri çek" durumu YOK, çünkü sonuç aynı — aday
                olumsuz kapanıyor. Yeni bir durum uydurmak yerine olanın
                ne anlama geldiği yazılıyor.

                Öğrenci karar verdikten sonra hiç gösterilmiyor.
              */}
              {!terminal && (
                olumsuzSoruldu ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: SIRKET_METIN }}>
                      {teklifBekliyor(kart.durum)
                        ? 'Teklif geri çekilip aday olumsuz olarak kapatılsın mı?'
                        : davetBekliyor || davetOnaylandi
                          ? 'Görüşme iptal edilip aday olumsuz olarak kapatılsın mı?'
                          : 'Olumsuz olarak işaretlensin mi?'}
                    </span>
                    <button
                      type="button"
                      disabled={kaydediliyor}
                      onClick={() => {
                        setOlumsuzSoruldu(false);
                        durumDegistir('rejected');
                      }}
                      className={IKINCIL_DUGME}
                      style={{ ...ikincilStil, borderColor: '#FCA5A5', color: '#991B1B' }}
                    >
                      Evet, olumsuz
                    </button>
                    <button
                      type="button"
                      onClick={() => setOlumsuzSoruldu(false)}
                      className={IKINCIL_DUGME}
                      style={ikincilStil}
                    >
                      Vazgeç
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={kaydediliyor}
                    onClick={() => setOlumsuzSoruldu(true)}
                    className={IKINCIL_DUGME}
                    style={ikincilStil}
                  >
                    Olumsuz
                  </button>
                )
              )}
          </div>

          <button
            type="button"
            onClick={() => setIkinciAcik((o) => !o)}
            aria-expanded={ikinciAcik}
            className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl text-xs font-bold"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            Öğrenciye not
            <ChevronDown
              className="h-4 w-4 transition-transform"
              style={{ transform: ikinciAcik ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          {ikinciAcik && (
            <div className="space-y-2">
              {/*
                Buradaki ikinci düğme sırası ("Değerlendirme", "Teklif")
                kaldırıldı: durum artık yukarıdaki tek seçiciden
                değişiyor. Aynı işi yapan iki kontrol, hangisinin
                geçerli olduğunu belirsizleştiriyordu.
              */}
              {/*
                NOT ÖĞRENCİYE GÖRÜNÜR

                `company_feedback` adayın kendi başvuru sayfasında
                okunuyor (ApplicationsTrackerView · "Şirketin notu").
                Bu yüzden başlık "Adaya not" değil "ÖĞRENCİYE not":
                şirket içi bir not diye yazılıp adaya gitmesin.

                Şirket içine özel bir not alanı ÜRÜNDE YOK; olmayan bir
                şeyi varmış gibi adlandırmıyoruz.
              */}
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Öğrenciye not — başvuru sayfasında görüyor
                </span>
                <textarea
                  value={not}
                  onChange={(e) => setNot(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border p-2.5 text-sm outline-none"
                  style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }}
                />
              </label>
              <button
                type="button"
                disabled={!not.trim() || kaydediliyor}
                onClick={() => onNot(not.trim())}
                className={IKINCIL_DUGME}
                style={ikincilStil}
              >
                Notu kaydet
              </button>
            </div>
          )}
        </section>
        )}

        {/* ------------------------------------------------ aday */}
        <div data-aday-govde className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          {/*
            SÜREÇ BİTTİĞİNDE EKRAN SIRASI DEĞİŞİYOR

            Teklif kabul edildikten sonra şirketin ilk sorusu "bu adayı
            değerlendireyim mi" değil, "bu kişiye nasıl ulaşacağım".
            Yetenekler ve projeler hâlâ değerli ama artık ekranın en
            kritik parçası değiller — bu yüzden final durum, iletişim ve
            kabul edilen teklif profil ayrıntılarının ÜSTÜNE alınıyor.

            Telefonda özellikle: kullanıcı iletişim kartına ulaşmak için
            uzun uzun kaydırmıyor.
          */}
          {terminal && (
            <section className="space-y-3">
              <div
                className="flex items-start gap-2.5 rounded-2xl border p-3.5"
                style={
                  kart.durum === 'offer_accepted'
                    ? { borderColor: '#86EFAC', background: '#F0FDF4' }
                    : { borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }
                }
              >
                {/*
                  Final durum yalnızca RENKLE anlatılmıyor: ikon ve metin
                  birlikte. Renk ayrımı güçlüğü olan kullanıcı da aynı
                  şeyi okuyor.
                */}
                {kart.durum === 'offer_accepted' ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#166534' }} />
                ) : (
                  <CircleSlash className="mt-0.5 h-5 w-5 shrink-0" style={{ color: SIRKET_METIN_IKINCIL }} />
                )}
                <div className="min-w-0">
                  <p
                    className="text-sm font-extrabold"
                    style={{ color: kart.durum === 'offer_accepted' ? '#166534' : SIRKET_METIN }}
                  >
                    {durumAdi(kart.durum)}
                  </p>
                  <p
                    className="mt-0.5 text-xs leading-relaxed"
                    style={{ color: kart.durum === 'offer_accepted' ? '#166534' : SIRKET_METIN_IKINCIL }}
                  >
                    {finalAciklama}
                  </p>
                </div>
              </div>

            </section>
          )}

          {/*
            İLETİŞİM — HER DURUMDA, GÖVDENİN BAŞINDA (sade akış)

            Eskiden bu blok yalnız süreç bittiğinde (teklif kabulü) çizilen
            bölümün içindeydi; yeni ve incelenen başvurularda HİÇ
            görünmüyordu. Sade akışta şirketin temel işi adayı incelemek
            ve kendisi aramak/yazmak, bu yüzden iletişim her durumda
            profil ayrıntılarının ÜSTÜNDE.
          */}
          {/*
            İLETİŞİM — ÖĞRENCİNİN ONAYINA BAĞLI

            Kapı veritabanında: `basvuru_iletisimi` doğrulanmış
            şirketin Owner/Recruiter üyesine ve yalnız onay bu akışı
            kapsıyorsa satır döndürüyor. Buradaki koşul gösterim
            için; kuralın kendisi değil.

            Sohbet yok: e-posta ve varsa telefon, ikisi de doğrudan
            aksiyon.
          */}
          {saltOkunur ? (
            <div
              className="rounded-2xl border p-3.5"
              style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
            >
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: SIRKET_METIN_IKINCIL }}>
                İletişim
              </p>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                Telefon ve e-posta şirket sahibinde ve işe alım yetkililerinde;
                görüntüleme yetkisiyle burada gösterilmiyor.
              </p>
              {/*
                DÜRÜST UYARI: ÖĞRENCİNİN YÜKLEDİĞİ CV DOSYASININ
                İÇİNDE İLETİŞİM BİLGİSİ OLABİLİR ve CV bu role
                açık. "İletişim tamamen gizli" demek doğru olmazdı;
                gizlenen şey bu alandaki kayıt.
              */}
              <p className="mt-1 text-[11px] leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                Adayın CV dosyasında iletişim bilgisi yazıyor olabilir; CV bu
                yetkiyle de açılabiliyor.
              </p>
            </div>
          ) : !adayIletisimiAcik(kart) ? (
            <div
              className="rounded-2xl border p-3.5"
              style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
            >
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: SIRKET_METIN_IKINCIL }}>
                İletişim
              </p>
              {/*
                NEDEN KAPALI OLDUĞU YAZIYOR. "Bilgi yok" demek,
                öğrencinin bir kararını sistem eksikliği gibi
                gösterirdi.
              */}
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                {kart.paylasimOnayi
                  ? 'Bu başvuru site dışından geldi; aday iletişim paylaşımını bu ekran için açmadı.'
                  : 'Aday telefon ve e-postasını bu başvuru için paylaşmıyor.'}
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl border p-3.5"
              style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
            >
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: SIRKET_METIN_IKINCIL }}>
                İletişim
              </p>
              {iletisimHatasi ? (
                <p role="alert" className="mt-1.5 text-xs font-semibold" style={{ color: '#991B1B' }}>
                  İletişim bilgileri şu anda yüklenemedi.
                </p>
              ) : iletisim ? (
                <>
                  <p className="mt-1.5 text-base font-extrabold" style={{ color: SIRKET_METIN }}>
                    {iletisim.ad ?? 'Aday'}
                  </p>
                  {iletisim.eposta && (
                    <p className="mt-0.5 break-all text-xs" style={{ color: SIRKET_METIN }}>
                      {iletisim.eposta}
                    </p>
                  )}
                  {/*
                    Numara okunur biçimde ama VERİTABANINDAKİ değer
                    değişmiyor; `tel:` bağlantısı ham rakamları
                    kullanıyor.
                  */}
                  {iletisim.telefon && (
                    <p className="text-xs" style={{ color: SIRKET_METIN }}>
                      {telefonYaz(iletisim.telefon)}
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {iletisim.eposta && (
                      <a
                        href={`mailto:${iletisim.eposta}`}
                        aria-label={`${iletisim.ad ?? 'Adaya'} e-posta gönder`}
                        className={BIRINCIL_DUGME}
                        style={birincilStil}
                      >
                        <Mail className="h-4 w-4" />
                        E-posta gönder
                      </a>
                    )}
                    {/* Telefon yoksa düğme HİÇ çıkmıyor. */}
                    {telefonBaglantisi(iletisim.telefon) && (
                      <a
                        href={`tel:${telefonBaglantisi(iletisim.telefon)}`}
                        aria-label={`${iletisim.ad ?? 'Adayı'} ara — ${telefonYaz(iletisim.telefon)}`}
                        className={IKINCIL_DUGME}
                        style={ikincilStil}
                      >
                        <Phone className="h-4 w-4" />
                        Ara
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-1.5 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                  İletişim bilgileri yükleniyor…
                </p>
              )}
            </div>
          )}


          {/*
            ESKİ TEKLİF — GEÇMİŞ OLARAK

            Kabul edilen ya da reddedilen eski teklif yalnız süreç
            bittiğinde, okunur özet olarak çiziliyor.
          */}
          {terminal && (
            <section className="space-y-3">
              {/*
                KABUL EDİLEN TEKLİF

                Ücret ve çalışma biçimi iki kaynaktan geliyor: teklifte
                yazan varsa O geçerli, yoksa ilandaki bilgi. Eksik alan
                GİZLENİYOR: boş bir satırı yer tutucu metinle doldurmak, olmayan
                bir bilgiyi varmış gibi göstermek olurdu.
              */}
              {/*
                Not TEK BAŞINA da yeterli: özet satırlarının hiçbiri
                dolu olmayabilir (eski teklif, ilanda ücret/süre yok) ama
                şirketin yazdığı metin duruyorsa okunabilir kalmalı.
                Reddedilen teklifte de aynısı geçerli.
              */}
              {(teklifOzeti.length > 0 || kart.teklifNotu) && (
                <div
                  className="rounded-2xl border p-3.5"
                  style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
                >
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: SIRKET_METIN_IKINCIL }}>
                    {kart.durum === 'offer_accepted' ? 'Kabul edilen teklif' : 'Gönderilen teklif'}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                    {teklifOzeti.map((s: { etiket: string; deger: string }) => (
                      <div key={s.etiket}>
                        <dt className="text-[10px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                          {s.etiket}
                        </dt>
                        <dd className="text-xs font-semibold" style={{ color: SIRKET_METIN }}>
                          {s.deger}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {/*
                    Teklif notu ayrı bir satır: bir şart değil, şirketin
                    yazdığı serbest metin. Görüşme notu buraya
                    karışmıyor — o `interview_note` alanında ve görüşme
                    özetinde duruyor.
                  */}
                  {kart.teklifNotu && (
                    <div className="mt-2.5 border-t pt-2.5" style={{ borderColor: SIRKET_KENAR }}>
                      <p className="text-[10px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                        Teklif notu
                      </p>
                      <p
                        className="mt-0.5 whitespace-pre-line text-xs leading-relaxed"
                        style={{ color: SIRKET_METIN }}
                      >
                        {kart.teklifNotu}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/*
            PROFİL YOKSA NEDENİ DOĞRU YAZSIN

            İki ayrı durum var ve aynı cümleyle anlatılamaz:
              - Dış (external) başvuru: öğrenci şirketin kendi sitesinden
                başvurdu, profili StajımVar'dan gelmedi.
              - StajımVar üzerinden başvuru ama rıza YOK: öğrenci paylaşımı
                sonradan kapattı. "Şirketin sitesinden yapıldı" demek burada
                yanlış bilgi olurdu.
          */}
          {!kart.paylasildi && (
            <div
              className="rounded-2xl border p-3 text-xs leading-relaxed"
              style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN_IKINCIL }}
            >
              {kart.basvuruYontemi === 'internal'
                ? 'Aday bu başvuru için profil ve iletişim paylaşımını kapattı; ad, okul ve iletişim bilgisi bu yüzden gösterilmiyor.'
                : 'Bu başvuru şirketin kendi sitesinden yapıldı. Öğrenci profilini StajımVar ile paylaşmadığı için burada ad, okul ve iletişim bilgisi yok — bu bilgiler şirketin kendi başvuru sisteminde.'}
            </div>
          )}

          {kart.onYazi && (
            <section aria-labelledby="aday-on-yazi" className="space-y-2">
              <BolumBasligi id="aday-on-yazi">Ön yazı</BolumBasligi>
              <p
                className="whitespace-pre-line break-words rounded-2xl border p-3 text-sm leading-relaxed"
                style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }}
              >
                {kart.onYazi}
              </p>
            </section>
          )}

          {/*
            BAŞVURU ANINDAKİ PROFİL — KOPYA

            Şirketin değerlendirdiği şey başvurunun yapıldığı andaki hâl;
            öğrenci profilini sonradan değiştirse bile burası değişmiyor.
            Yalnız gerçekten dolu alanlar çiziliyor. "Deneyim" diye ayrı bir
            veri kopyada YOK; o başlık açılmıyor.

            Değişen bölümün başlığında "Başvurudan sonra değişti" işareti
            var; neyin değiştiği aşağıdaki "Başvurudan sonra değişenler"
            bölümünde. Değişmeyen alan ikinci kez yazılmıyor.
          */}
          {kart.paylasildi && (
            <section aria-labelledby="aday-kopya-basligi" className="space-y-4">
              <div>
                <BolumBasligi id="aday-kopya-basligi">Başvuru anındaki profil</BolumBasligi>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Aday başvururken paylaşılan kopya
                  {basvuruTarihi ? ` (${basvuruTarihi})` : ''}. Profil sonradan değişse de burası
                  değişmiyor.
                </p>
              </div>

              {(egitim.length > 0 || kart.sehir) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {egitim.length > 0 && (
                    <div>
                      <Baslik degisti={bolumDegisti('egitim')}>Eğitim</Baslik>
                      <dl className="space-y-1">
                        {egitim.map((s) => (
                          <div key={s.etiket} className="flex flex-wrap gap-x-1.5 text-sm">
                            <dt style={{ color: SIRKET_METIN_IKINCIL }}>{s.etiket}:</dt>
                            <dd className="min-w-0 break-words font-semibold" style={{ color: SIRKET_METIN }}>
                              {s.deger}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                  {kart.sehir && (
                    <div>
                      <Baslik degisti={bolumDegisti('sehir')}>Şehir</Baslik>
                      <p className="text-sm font-semibold" style={{ color: SIRKET_METIN }}>
                        {kart.sehir}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {yetenekler.length > 0 && (
                <section>
                  <Baslik degisti={bolumDegisti('yetenekler')}>Yetenekler</Baslik>
                  <div className="flex flex-wrap gap-1.5">
                    {yetenekler.map((y: string) => (
                      <span
                        key={y}
                        className="rounded-lg px-2 py-1 text-[11px] font-bold"
                        style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
                      >
                        {y}
                      </span>
                    ))}
                  </div>
                  {/*
                    Eski kopyalarda yetenek listesi yok ve kart canlı tablodan
                    tamamlıyor. O liste "başvuru anı" değil; bunu söylemeden
                    bu başlığın altında göstermek yanlış bir iddia olurdu.
                  */}
                  {kart.yetenekKopyadan === false && (
                    <p className="mt-1 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
                      Bu başvurunun kopyasında yetenek yok; liste adayın güncel yeteneklerinden.
                    </p>
                  )}
                </section>
              )}

              {diller.length > 0 && (
                <section>
                  <Baslik degisti={bolumDegisti('diller')}>Diller</Baslik>
                  <p className="text-sm" style={{ color: SIRKET_METIN }}>
                    {diller.join(', ')}
                  </p>
                </section>
              )}

              {rozetler.length > 0 && (
                <section>
                  <Baslik degisti={bolumDegisti('rozetler')}>Rozetler</Baslik>
                  <ul className="flex flex-wrap gap-1.5">
                    {rozetler.map((r: string) => (
                      <li
                        key={r}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                        style={{ background: '#ECFDF5', color: '#065F46' }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        {rozetEtiketi(r)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {deneyimler.length > 0 && (
                <section>
                  <Baslik degisti={bolumDegisti('deneyimler')}>Deneyim</Baslik>
                  <ul className="space-y-2">
                    {deneyimler.map((d: any, i: number) => (
                      <li
                        key={`${d?.pozisyon ?? ''}-${d?.kurum ?? ''}-${i}`}
                        className="min-w-0 rounded-2xl border p-3"
                        style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
                      >
                        <p className="break-words text-sm font-bold" style={{ color: SIRKET_METIN }}>
                          {d?.pozisyon}
                        </p>
                        <p className="break-words text-xs font-semibold" style={{ color: SIRKET_METIN }}>
                          {d?.kurum}
                          {tarihAraligi(d) && (
                            <span className="font-normal" style={{ color: SIRKET_METIN_IKINCIL }}>
                              {' · '}
                              {tarihAraligi(d)}
                            </span>
                          )}
                        </p>
                        {d?.aciklama && (
                          <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                            {d.aciklama}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {projeler.length > 0 && (
                <section>
                  <Baslik degisti={bolumDegisti('projeler')}>Projeler</Baslik>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {projeler.map((p: any, i: number) => {
                      /*
                        Proje adresi öğrencinin yazdığı serbest metin ve `href`e
                        denetimsiz yazılıyordu. `javascript:` bir değer tıklayan
                        şirket çalışanının oturumunda kod çalıştırırdı; artık
                        güvenli adres denetiminden geçiyor.

                        Önyargısız incelemede "Projeyi aç" yok: proje adresi
                        çoğunlukla github.com/<kullanıcı-adı> ve kullanıcı adı
                        adı taşıyor. Başlık ve açıklama kalıyor.
                      */
                      const adres = kart.gizli ? null : guvenliDisAdres(p?.adres);
                      return (
                        <li
                          key={p?.baslik ?? i}
                          className="min-w-0 rounded-2xl border p-3"
                          style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
                        >
                          <p className="break-words text-sm font-bold" style={{ color: SIRKET_METIN }}>
                            {p?.baslik}
                          </p>
                          {p?.aciklama && (
                            <p className="mt-0.5 break-words text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                              {p.aciklama}
                            </p>
                          )}
                          {adres && (
                            <a
                              href={adres}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-bold"
                              style={{ color: SIRKET_VURGU_KOYU }}
                            >
                              Projeyi aç
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {(baglantilar.length > 0 || baglantiGizlendi || kart.cvYolu) && (
                <section>
                  <Baslik degisti={bolumDegisti('baglantilar')}>Bağlantılar ve CV</Baslik>
                  <div className="flex flex-wrap gap-2">
                    {baglantilar.map((b: { tur: string; etiket: string; adres: string }) => (
                      <a
                        key={b.tur}
                        href={b.adres}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={IKINCIL_DUGME}
                        style={ikincilStil}
                      >
                        {b.tur === 'github' ? (
                          <Github className="h-4 w-4" aria-hidden />
                        ) : b.tur === 'linkedin' ? (
                          <Linkedin className="h-4 w-4" aria-hidden />
                        ) : (
                          <ExternalLink className="h-4 w-4" aria-hidden />
                        )}
                        {b.etiket}
                      </a>
                    ))}
                    {/*
                      CV ARTIK AÇILABİLİYOR

                      Burada yalnızca "CV başvuruya ekli" yazan ölü bir etiket
                      vardı; dosyayı açmanın hiçbir yolu yoktu. Kova gizli
                      olduğu için public adres üretilmiyor — her tıklamada kısa
                      ömürlü imzalı adres alınıyor ve adresi üretebilmek
                      dosyayı OKUYABİLMEYİ gerektiriyor. Yani kapı burada
                      değil, depolama politikasında: yalnızca doğrulanmış
                      şirket, yalnızca kendi ilanına gelen başvurunun belgesi.

                      Gösterilen dosya başvuru anının kopyası; öğrenci bugün
                      CV'sini değiştirmiş olsa bile burada değişmiyor.
                    */}
                    {kart.cvYolu && (
                      <button
                        type="button"
                        onClick={() => {
                          /* Önyargısız kipte önce sor; normal kipte doğrudan aç. */
                          if (kart.gizli) setCvOnayi(true);
                          else void cvAc();
                        }}
                        aria-expanded={kart.gizli ? cvOnayi : undefined}
                        disabled={cvAciliyor}
                        className={IKINCIL_DUGME}
                        style={ikincilStil}
                      >
                        {cvAciliyor ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <FileText className="h-4 w-4" aria-hidden />
                        )}
                        CV'yi görüntüle
                      </button>
                    )}
                  </div>
                  {kart.gizli && cvOnayi && kart.cvYolu && (
                    <div
                      role="alertdialog"
                      aria-labelledby="aday-cv-uyari-basligi"
                      aria-describedby="aday-cv-uyari-metni"
                      className="mt-3 rounded-2xl border p-3.5"
                      style={{ borderColor: '#FCD34D', background: '#FEF3C7' }}
                    >
                      <p id="aday-cv-uyari-basligi" className="text-sm font-extrabold" style={{ color: '#78350F' }}>
                        CV önyargısız incelemeyi bozabilir
                      </p>
                      <p id="aday-cv-uyari-metni" className="mt-1 text-xs leading-relaxed" style={{ color: '#78350F' }}>
                        CV dosyası adayın adını, fotoğrafını ve iletişim bilgilerini içerebilir; açarsan
                        önyargısız inceleme bu aday için geçerliliğini yitirir.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCvOnayi(false);
                            void cvAc();
                          }}
                          className={`${IKINCIL_DUGME} bg-white`}
                          style={ikincilStil}
                        >
                          <FileText className="h-4 w-4" aria-hidden />
                          CV'yi yine de aç
                        </button>
                        <button
                          type="button"
                          /* Güvenli seçenek odakta: Enter dosyayı açmıyor. */
                          autoFocus
                          onClick={() => setCvOnayi(false)}
                          className={`${IKINCIL_DUGME} bg-white`}
                          style={ikincilStil}
                        >
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  )}
                  {baglantiGizlendi && (
                    <p className="mt-2 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                      Önyargısız incelemede bağlantılar gösterilmiyor.
                    </p>
                  )}
                  {cvHatasi && (
                    <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: '#991B1B' }}>
                      {cvHatasi}
                    </p>
                  )}
                </section>
              )}
            </section>
          )}

          {kart.paylasildi && (
            <AdayGuncelProfil
              durum={guncelProfil.durum}
              fark={fark}
              guncellendi={guncelProfil.sonuc?.guncel?.guncellendi ?? null}
              profilYok={guncelProfil.durum === 'hazir' && !guncelProfil.sonuc?.guncel}
              onYenidenDene={guncelProfil.yenidenDene}
              kimlikGizli={Boolean(kart.gizli)}
            />
          )}

          {paylasimBolumu && onPaylasimlar && (
            <AdayPaylasimlari
              basvuruId={kart.id}
              gizli={Boolean(kart.gizli)}
              yukle={onPaylasimlar}
              yerelGorselAdresi={yerelGorselAdresi}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(28,20,16,.35)' }}
        onClick={onKapat}
        aria-hidden
      />
      {panel}
    </div>,
    document.body
  );
};
