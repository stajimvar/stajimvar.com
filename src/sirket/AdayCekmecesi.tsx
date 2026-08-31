import React from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  ExternalLink,
  FileText,
  Github,
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
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  SIRKET_ZEMIN,
  alanStil,
  birincilStil,
  ikincilStil,
} from './renk';
import { kimlikSatiri, monogram } from '../lib/aday-kart.mjs';
import { telefonBaglantisi, telefonYaz } from '../lib/telefon.mjs';
import {
  SIRKET_DURUMLARI,
  durumAdi,
  iletisimAcik,
  sirketDurumCumlesi,
  ogrencininKarari,
  sonrakiDurum,
  surecKapandi,
  teklifBekliyor,
} from './basvuru-durumu';
import {
  GORUSME_TURLERI,
  gorusmeBekliyor,
  gorusmeOnaylandi,
  gorusmeReddedildi,
  gorusmeSirketCumlesi,
  gorusmeTuruAdi,
  gorusmeYeriEtiketi,
} from '../lib/basvuru-durumu.mjs';

/**
 * Aday çekmecesi — sağdan açılan panel.
 *
 * FLIP YOK
 * --------
 * Kart çevrilmiyor. Çevirme animasyonu ilk seferde hoş, yirminci
 * başvuruda engel: kullanıcı arkadaki bilgiye ulaşmak için her seferinde
 * animasyonu bekliyor. Çekmece kartı yerinde bırakıyor, ızgaradaki yeri
 * kaybolmuyor.
 *
 * PORTAL
 * ------
 * `document.body` altına çiziliyor. Üstteki başlık çubuğunun `sticky` ve
 * `backdrop-filter` bağlamı, `position: fixed` alt öğeleri kendi kutusuna
 * hapsediyor — hesap panelinde aynı hata bir kez yaşandı.
 *
 * MİNİ ATS KARTIN ALTINDA
 * -----------------------
 * Birinci sıra (İncelemede / Mülakat / Reddet) hep görünür: gün içindeki
 * karar bu. İkinci sıra (case, teklif, görüşme bağlantısı) katlı duruyor;
 * kartın üstüne konsaydı asıl kararı gölgelerdi.
 */

/** Karşı tarafın iletişim satırı — sunucunun döndürdüğü biçim. */
/** Tarihi okunur yazar; bozuk/boş değerde bir şey yazmaz. */
function tarihMetni(deger: string): string {
  const t = new Date(String(deger));
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export type Iletisim = {
  ad: string | null;
  eposta: string | null;
  telefon: string | null;
  unvan: string | null;
};

const Baslik: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3
    className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest"
    style={{ color: SIRKET_METIN_IKINCIL }}
  >
    {children}
  </h3>
);

export const AdayCekmecesi: React.FC<{
  kart: Record<string, any> | null;
  kaydediliyor: boolean;
  onKapat: () => void;
  /*
    Söz döndürüyor: durum değişimi başarısız olursa hata ÇEKMECENİN
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
    GÖMÜLÜ KİP — MASAÜSTÜNDE YAN PANEL

    Aynı içerik iki yerde: dar ekranda üstten gelen çekmece, geniş
    ekranda ızgaranın yanında duran panel. İki ayrı bileşen yazmak,
    aday ayrıntısının iki farklı hâlini ayrı ayrı eskitirdi.

    Gömülüyken portal, arka plan karartması ve `fixed` konumlama yok:
    panel akışın içinde duruyor.
  */
  gomulu?: boolean;
}> = ({
  kart,
  kaydediliyor,
  onKapat,
  onDurum,
  onNot,
  onMulakatTarihi,
  onTeklif,
  onDavet,
  onIletisim,
  gomulu,
}) => {
  /*
    İmzalı adres tıklama anında üretiliyor, kart çizilirken değil: adresin
    ömrü on dakika ve önceden üretilseydi açılmadan ölürdü. Ayrıca
    görülmeyen her aday için gereksiz bir istek olurdu.
  */
  const [cvAciliyor, setCvAciliyor] = React.useState(false);
  const [cvHatasi, setCvHatasi] = React.useState<string | null>(null);
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
  const [olumsuzSoruldu, setOlumsuzSoruldu] = React.useState(false);
  const [durumHatasi, setDurumHatasi] = React.useState<string | null>(null);
  const [mulakatTarihi, setMulakatTarihi] = React.useState('');

  /* Teklif formu ve içeriği. */
  const [teklifFormu, setTeklifFormu] = React.useState(false);
  const [teklifNotu, setTeklifNotu] = React.useState('');
  const [teklifBaslangici, setTeklifBaslangici] = React.useState('');
  const [teklifUcreti, setTeklifUcreti] = React.useState('');

  /* Görüşme daveti formu ve içeriği. */
  const [davetFormu, setDavetFormu] = React.useState(false);
  const [davetTarihi, setDavetTarihi] = React.useState('');
  const [davetSaati, setDavetSaati] = React.useState('');
  const [davetTuru, setDavetTuru] = React.useState('online');
  const [davetYeri, setDavetYeri] = React.useState('');
  const [davetNotu, setDavetNotu] = React.useState('');

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

  /* Çekmece değiştiğinde ikinci sıra, not ve CV hatası sıfırlanıyor. */
  React.useEffect(() => {
    setIkinciAcik(false);
    setNot('');
    /* İkinci adaya geçince önceki adayın CV hatası ekranda kalmasın. */
    setCvHatasi(null);
    setCvAciliyor(false);
    setOlumsuzSoruldu(false);
    setDurumHatasi(null);
    setMulakatTarihi(kart?.mulakatTarihi ?? '');
    setTeklifFormu(false);
    setTeklifNotu(kart?.teklifNotu ?? '');
    setTeklifBaslangici(kart?.teklifBaslangici ?? '');
    setTeklifUcreti(kart?.teklifUcreti ?? '');
    setDavetFormu(false);
    setDavetTarihi(kart?.mulakatTarihi ?? '');
    setDavetSaati(kart?.gorusmeSaati ?? '');
    setDavetTuru(kart?.gorusmeTuru || 'online');
    setDavetYeri(kart?.gorusmeYeri ?? '');
    setDavetNotu(kart?.gorusmeNotu ?? '');
  }, [kart?.id, kart?.mulakatTarihi, kart?.teklifNotu, kart?.teklifBaslangici]);

  /*
    İLETİŞİM YALNIZCA KABULDEN SONRA İSTENİYOR

    Kabul edilmemiş bir başvuruda istek hiç gönderilmiyor. Gönderilseydi
    sunucu zaten boş dönerdi (kapı orada) ama ekranın niyeti de açık
    olmalı. Aday değişince önceki adayın satırı hemen düşüyor.
  */
  React.useEffect(() => {
    setIletisim(null);
    setIletisimHatasi(false);
    if (!kart?.id || !iletisimAcik(kart.durum) || !onIletisim) return;

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
  }, [kart?.id, kart?.durum, onIletisim]);

  React.useEffect(() => {
    if (!kart) return undefined;
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onKapat();
      }
    };
    document.addEventListener('keydown', tus);
    govde.current?.focus();
    return () => document.removeEventListener('keydown', tus);
  }, [kart, onKapat]);

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
  const sonraki = sonrakiDurum(kart.durum, kart.gorusmeYaniti);
  const davetBekliyor = gorusmeBekliyor(kart.durum, kart.gorusmeYaniti);
  const davetOnaylandi = gorusmeOnaylandi(kart.durum, kart.gorusmeYaniti);
  const davetReddedildi = gorusmeReddedildi(kart.durum, kart.gorusmeYaniti);
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
    Durum değişiminin hatası çekmeceyi KAPATMIYOR: alanın altında
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
  const projeler = Array.isArray(kart.projeler) ? kart.projeler : [];

  const panel = (
    <div
      ref={govde}
      role={gomulu ? 'region' : 'dialog'}
      aria-modal={gomulu ? undefined : true}
      aria-label="Aday ayrıntısı"
      tabIndex={-1}
      className={
        gomulu
          ? 'flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border outline-none'
          : 'absolute inset-y-0 right-0 flex w-full max-w-md flex-col outline-none'
      }
      style={{ background: SIRKET_ZEMIN, borderColor: gomulu ? SIRKET_KENAR : undefined }}
    >
        <div
          className="flex items-start gap-3 border-b p-4"
          style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}
        >
          {kart.fotoUrl && !kart.gizli ? (
            <img src={kart.fotoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
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
            <p className="truncate text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
              {kart.gizli ? 'Aday' : (kart.ad ?? 'Ad paylaşılmadı')}
            </p>
            {kimlik && (
              <p className="text-xs font-semibold" style={{ color: SIRKET_METIN_IKINCIL }}>
                {kimlik}
              </p>
            )}
            <p className="mt-1 text-[11px] font-bold" style={{ color: SIRKET_VURGU_KOYU }}>
              {durumAdi(kart.durum)}
              {kart.ilanBasligi ? ` · ${kart.ilanBasligi}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Kapat"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
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

              {/*
                İLETİŞİM — YALNIZCA KABULDEN SONRA

                Kapı veritabanında: `basvuru_iletisimi` teklif kabul
                edilmediyse satır döndürmüyor. Buradaki koşul yalnızca
                gösterim; kuralın kendisi değil.

                Sohbet yok: e-posta ve varsa telefon, ikisi de doğrudan
                aksiyon.
              */}
              {iletisimAcik(kart.durum) && (
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

          {!kart.paylasildi && (
            <div
              className="rounded-2xl border p-3 text-xs leading-relaxed"
              style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN_IKINCIL }}
            >
              Bu başvuru şirketin kendi sitesinden yapıldı. Öğrenci profilini StajımVar ile
              paylaşmadığı için burada ad, okul ve iletişim bilgisi yok — bu bilgiler
              şirketin kendi başvuru sisteminde.
            </div>
          )}

          {kart.onYazi && (
            <section>
              <Baslik>Ön yazı</Baslik>
              <p
                className="whitespace-pre-line rounded-2xl border p-3 text-sm leading-relaxed"
                style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }}
              >
                {kart.onYazi}
              </p>
            </section>
          )}

          {yetenekler.length > 0 && (
            <section>
              <Baslik>Yetenekler</Baslik>
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
            </section>
          )}

          {diller.length > 0 && (
            <section>
              <Baslik>Diller</Baslik>
              <p className="text-sm" style={{ color: SIRKET_METIN }}>
                {diller.join(', ')}
              </p>
            </section>
          )}

          {projeler.length > 0 && (
            <section>
              <Baslik>Projeler</Baslik>
              <ul className="space-y-2">
                {projeler.map((p: any, i: number) => (
                  <li
                    key={p?.baslik ?? i}
                    className="rounded-2xl border p-3"
                    style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
                  >
                    <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
                      {p?.baslik}
                    </p>
                    {p?.aciklama && (
                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                        {p.aciklama}
                      </p>
                    )}
                    {p?.adres && (
                      <a
                        href={p.adres}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold"
                        style={{ color: SIRKET_VURGU_KOYU }}
                      >
                        Projeyi aç
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(kart.github || kart.portfolyo || kart.cvYolu) && (
            <section>
              <Baslik>Bağlantılar</Baslik>
              <div className="flex flex-wrap gap-2">
                {kart.github && (
                  <a
                    href={`https://github.com/${kart.github}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={IKINCIL_DUGME}
                    style={ikincilStil}
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                )}
                {kart.portfolyo && (
                  <a
                    href={kart.portfolyo}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={IKINCIL_DUGME}
                    style={ikincilStil}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Portfolyo
                  </a>
                )}
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
                    onClick={() => void cvAc()}
                    disabled={cvAciliyor}
                    className={IKINCIL_DUGME}
                    style={ikincilStil}
                  >
                    {cvAciliyor ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    CV'yi görüntüle
                  </button>
                )}
              </div>
              {cvHatasi && (
                <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: '#991B1B' }}>
                  {cvHatasi}
                </p>
              )}
            </section>
          )}
        </div>

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
        <div className="border-t p-4" style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}>
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
            !davetFormu &&
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
            (kart.teklifNotu || kart.teklifBaslangici || kart.teklifUcreti) &&
            !teklifFormu && (
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
              {SIRKET_DURUMLARI.map((d: string) => (
                <option key={d} value={d}>
                  {durumAdi(d)}
                </option>
              ))}
              {/*
                Adayın verdiği kararlar seçenekler arasında yok. Mevcut
                durum onlardan biriyse zaten yukarıdaki okunur satır
                çiziliyor, bu dala hiç girilmiyor.
              */}
              {!SIRKET_DURUMLARI.includes(kart.durum) && (
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
            biçim yok, yer yok. Görüşmenin bilgisi artık davetin içinde
            toplanıyor (aşağıdaki "Görüşmeye davet et" formu).
          */}

          {durumHatasi && (
            <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: '#991B1B' }}>
              {durumHatasi}
            </p>
          )}

          {/*
            GÖRÜŞME DAVETİ FORMU

            Değerlendirme aşamasındaki adayın ana aksiyonu "Görüşmeye
            davet et". Ücret, sözleşme ve nihai şartlar burada
            SORULMUYOR: onlar görüşmede netleşiyor. Bu formda yalnızca
            görüşmeyi yapabilmek için gerekenler var.
          */}
          {davetFormu ? (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                    Tarih
                  </span>
                  <input
                    type="date"
                    value={davetTarihi}
                    onChange={(e) => setDavetTarihi(e.target.value)}
                    className={ALAN}
                    style={alanStil}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                    Saat
                  </span>
                  <input
                    type="time"
                    value={davetSaati}
                    onChange={(e) => setDavetSaati(e.target.value)}
                    className={ALAN}
                    style={alanStil}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Görüşme türü
                </span>
                <select
                  value={davetTuru}
                  onChange={(e) => setDavetTuru(e.target.value)}
                  className={ALAN}
                  style={alanStil}
                >
                  {GORUSME_TURLERI.map((t: { id: string; ad: string }) => (
                    <option key={t.id} value={t.id}>
                      {t.ad}
                    </option>
                  ))}
                </select>
              </label>

              {/*
                TEK ALAN: adres de bağlantı da buraya yazılıyor. İkisi aynı
                sorunun cevabı ("nereye geleceğim") ve iki ayrı kutu,
                birinin boş kalmasıyla belirsizlik üretirdi. Başlık
                seçilen biçime göre değişiyor.
              */}
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  {gorusmeYeriEtiketi(davetTuru)} <span className="font-normal">(isteğe bağlı)</span>
                </span>
                <input
                  type="text"
                  value={davetYeri}
                  onChange={(e) => setDavetYeri(e.target.value)}
                  placeholder={
                    davetTuru === 'online'
                      ? 'Toplantı bağlantısı'
                      : davetTuru === 'phone'
                        ? 'Hangi numaradan arayacağınız'
                        : 'Ofis adresi'
                  }
                  className={ALAN}
                  style={alanStil}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Not — öğrenci görecek
                </span>
                <textarea
                  value={davetNotu}
                  onChange={(e) => setDavetNotu(e.target.value)}
                  rows={2}
                  placeholder="Pozisyonu ve çalışma koşullarını görüşmek üzere sizi davet ediyoruz."
                  className="w-full rounded-xl border p-2.5 text-sm outline-none"
                  style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => {
                    setDurumHatasi(null);
                    Promise.resolve(
                      onDavet?.({
                        tarih: davetTarihi,
                        saat: davetSaati,
                        tur: davetTuru,
                        yer: davetYeri,
                        not: davetNotu,
                      }),
                    )
                      .then(() => setDavetFormu(false))
                      .catch(() => setDurumHatasi('Görüşme daveti gönderilemedi. Tekrar dene.'));
                  }}
                  className={BIRINCIL_DUGME}
                  style={birincilStil}
                >
                  {kaydediliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Daveti gönder
                </button>
                <button
                  type="button"
                  onClick={() => setDavetFormu(false)}
                  className={IKINCIL_DUGME}
                  style={ikincilStil}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : teklifFormu ? (
            <div className="mt-3 space-y-2">
              {/*
                GERÇEK TEKLİF

                Artık görüşmeden SONRA geliyor, bu yüzden ücret de burada
                soruluyor: şartlar görüşmede netleşiyor. Boş bırakılırsa
                ilandaki ücret bilgisi geçerli kalıyor — aynı şey iki kez
                yazılmıyor.
              */}
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Ücret <span className="font-normal">(boş bırakılırsa ilandaki bilgi geçerli)</span>
                </span>
                <input
                  type="text"
                  value={teklifUcreti}
                  onChange={(e) => setTeklifUcreti(e.target.value)}
                  placeholder="Örn. 18.000 TL / ay"
                  className={ALAN}
                  style={alanStil}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Başlangıç tarihi <span className="font-normal">(isteğe bağlı)</span>
                </span>
                <input
                  type="date"
                  value={teklifBaslangici}
                  onChange={(e) => setTeklifBaslangici(e.target.value)}
                  className={ALAN}
                  style={alanStil}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Teklif notu — öğrenci görecek
                </span>
                <textarea
                  value={teklifNotu}
                  onChange={(e) => setTeklifNotu(e.target.value)}
                  rows={3}
                  placeholder="Görüşmede konuştuğunuz çalışma düzeni ve ekip gibi, öğrencinin karar verirken bilmesi gerekenler."
                  className="w-full rounded-xl border p-2.5 text-sm outline-none"
                  style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => {
                    setDurumHatasi(null);
                    Promise.resolve(
                      onTeklif?.({
                        not: teklifNotu,
                        baslangic: teklifBaslangici,
                        ucret: teklifUcreti,
                      }),
                    )
                      .then(() => setTeklifFormu(false))
                      .catch(() => setDurumHatasi('Teklif gönderilemedi. Tekrar dene.'));
                  }}
                  className={BIRINCIL_DUGME}
                  style={birincilStil}
                >
                  {kaydediliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {teklifBekliyor(kart.durum) ? 'Teklifi güncelle' : 'Teklifi gönder'}
                </button>
                <button
                  type="button"
                  onClick={() => setTeklifFormu(false)}
                  className={IKINCIL_DUGME}
                  style={ikincilStil}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {/*
                SIRADAKİ ADIM TEK DÜĞME

                Değerlendirmeden sonra görüşme daveti, görüşme
                onaylandıktan sonra teklif. Davet yanıtlanmadan "Teklif
                gönder" GÖSTERİLMİYOR: görüşme yapılmadan gönderilen bir
                teklif, bu turda düzeltilen tam olarak o yanlış.
              */}
              {/* Süreç bittiyse ilerletilecek bir adım yok. */}
              {terminal ? null : sonraki === 'interview_scheduled' ? (
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => setDavetFormu(true)}
                  className={BIRINCIL_DUGME}
                  style={birincilStil}
                >
                  Görüşmeye davet et
                </button>
              ) : sonraki === 'offer_extended' ? (
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => setTeklifFormu(true)}
                  className={BIRINCIL_DUGME}
                  style={birincilStil}
                >
                  Teklif gönder
                </button>
              ) : sonraki ? (
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
              ) : null}

              {/*
                DAVET BEKLERKEN: sıra şirkette değil. Yalnız daveti
                düzeltebiliyor.
              */}
              {davetBekliyor && (
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => setDavetFormu(true)}
                  className={IKINCIL_DUGME}
                  style={ikincilStil}
                >
                  Daveti düzenle
                </button>
              )}

              {/*
                ÖĞRENCİ KATILAMIYORSA: yeni bir tarih önerilebilir. Ayrı
                bir durum değeri açılmadı — aynı davet alanları yeniden
                yazılıyor ve yanıt boşalıyor.
              */}
              {davetReddedildi && (
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => setDavetFormu(true)}
                  className={BIRINCIL_DUGME}
                  style={birincilStil}
                >
                  Yeni davet gönder
                </button>
              )}

              {/* Görüşme onaylandıysa davet hâlâ düzeltilebiliyor. */}
              {davetOnaylandi && (
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => setDavetFormu(true)}
                  className={IKINCIL_DUGME}
                  style={ikincilStil}
                >
                  Daveti düzenle
                </button>
              )}

              {/*
                TEKLİF VERİLDİ: SIRA ŞİRKETTE DEĞİL

                Bu aşamada birincil düğme yok — sıradaki hamle öğrencinin.
                Şirket yalnızca gönderdiği teklifi düzeltebiliyor.
              */}
              {teklifBekliyor(kart.durum) && (
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => setTeklifFormu(true)}
                  className={IKINCIL_DUGME}
                  style={ikincilStil}
                >
                  Teklifi düzenle
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
          )}

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
        </div>
    </div>
  );

  if (gomulu) return panel;

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
