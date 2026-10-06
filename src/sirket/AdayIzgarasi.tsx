import React from 'react';
import { Check, Copy, Search, Share2, SlidersHorizontal, Users } from 'lucide-react';
import { AdayKarti } from './AdayKarti';
import {
  AdayCekmecesi,
  type GuncelProfilYukleyici,
  type Iletisim,
  type PaylasimYukleyici,
} from './AdayCekmecesi';
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
  SIRKET_VURGU_KOYU,
  alanStil,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { onyargisizla } from '../lib/aday-kart.mjs';
import { durumSuzgeciSecenekleri, durumSuzgecineUyar } from './basvuru-durumu';
import { AdayHataSiniri } from './HataSiniri';
import { adrestekiAday } from '../lib/aday-derin-baglanti.mjs';
import { adayAdresiniYaz, adayEkraniniKapat, useAdayAdresi } from './useAdayAdresi';

/**
 * Başvuran ızgarası.
 *
 * KLAVYE — GİZLİ, ÖĞRETİLMİYOR
 * ----------------------------
 * J/K sonraki-önceki, F detay, A incelemeye al, X red. Kısayollar
 * ÇALIŞIYOR ama arayüzde HİÇ YAZMIYOR: paneli ilk açan bir İK
 * çalışanına klavye dizilimi öğretmek, ekranı terminal gibi
 * gösteriyordu. Her işin görünür bir düğmesi var; kısayol yalnızca çok
 * kullananın kendiliğinden keşfedeceği bir hızlandırıcı.
 *
 * Bir metin alanına yazarken devre dışı — yoksa not yazarken "x" tuşu
 * adayı reddederdi.
 *
 * ÖNYARGISIZ İNCELEME
 * -------------------
 * Ad ve fotoğraf gizleniyor; paylaşımlar ve dış bağlantılar da. İlk elemede ismin
 * çağrıştırdığı cinsiyet, memleket ve etnik köken ipuçlarını devre dışı
 * bırakıyor. Belgeler (CV, ön yazı) adayın kendi içeriği ve kimliği taşıyabilir;
 * bant bunu açıkça söylüyor, CV açılmadan önce ayrıca soruluyor.
 */

const yaziAlaninda = (h: EventTarget | null) => {
  const e = h as HTMLElement | null;
  if (!e || !e.tagName) return false;
  return (
    e.tagName === 'INPUT' ||
    e.tagName === 'TEXTAREA' ||
    e.tagName === 'SELECT' ||
    e.isContentEditable === true
  );
};

export const AdayIzgarasi: React.FC<{
  kartlar: Record<string, any>[];
  ilanAdresi: string | null;
  /** Adresten gelen ilan süzgeci (`?ilan=<id>`); Genel'deki karttan. */
  baslangicIlan?: string | null;
  onNavigate: (y: string) => void;
  /*
    YAZMA İŞLEVLERİ İSTEĞE BAĞLI (5 Ekim 2026)

    Viewer bu ekranı salt okunur açıyor: işlevler VERİLMİYOR, çekmece de
    o sütunu hiç çizmiyor. İşlemsiz bir no-op geçmek, çalışmayan ama
    dokunulabilir bir denetim bırakırdı.
  */
  onDurum?: (id: string, durum: string) => Promise<void>;
  onMulakatTarihi?: (id: string, tarih: string) => Promise<void>;
  onTeklif?: (id: string, teklif: { not: string; baslangic: string; ucret: string }) => Promise<void>;
  onDavet?: (id: string, davet: { tarih: string; saat: string; tur: string; yer: string; not: string }) => Promise<void>;
  onIletisim: (id: string) => Promise<Iletisim | null>;
  /*
    BİLDİRİMDEN GELEN ADAY

    Şirketi listeye atıp aratmıyoruz: bildirimdeki başvurunun çekmecesi
    kendiliğinden açılıyor. Süzgeç o adayı gizliyor olabilir ama çekmece
    ham listeden çözülüyor, dolayısıyla yine açılıyor.
  */
  acilacakAday?: string | null;
  onAdayAcildi?: () => void;
  onNot?: (id: string, metin: string) => Promise<void>;
  /*
    Sayfanın başlığı ve toplam başvuru sayısı her zaman dışarıda
    (SirketPaneli, `h1` "Başvuranlar"); ızgara başlık çizmiyor, yalnız
    süzülünce "x / y başvuru gösteriliyor" yazıyor. Bayrak çağıranın
    sözleşmesini belgeliyor (6 Ekim 2026'dan beri tek yerleşim).
  */
  basliksiz?: boolean;
  /* İnceleme ekranının güncel profil ve paylaşım okumaları (20261121010000). */
  onGuncelProfil: GuncelProfilYukleyici;
  onPaylasimlar: PaylasimYukleyici;
  /** Yalnız geliştirme fikstürü; üretimde verilmiyor. */
  yerelGorselAdresi?: (yol: string) => string | null;
  /** Yazma yetkisi olmayan üye: çekmece açılır, işlem sütunu çizilmez. */
  saltOkunur?: boolean;
  /*
    ADAY AYRINTISI BAŞARIYLA AÇILDI.

    Çekmece GERÇEKTEN çizildikten sonra çağrılıyor; liste görünümü ve
    ön yükleme çağırmıyor. Hata sınırı devreye girip çekmece
    çizilemezse de çağrılmıyor — öğrenciye "görüntülendi" demek için
    gerçekten görüntülenmiş olması gerekiyor.
  */
  onGoruntulendi?: (id: string) => void;
}> = ({
  kartlar,
  ilanAdresi,
  baslangicIlan,
  onNavigate,
  onDurum,
  onMulakatTarihi,
  onTeklif,
  onDavet,
  onIletisim,
  acilacakAday,
  onAdayAcildi,
  onNot,
  basliksiz = false,
  onGuncelProfil,
  onPaylasimlar,
  yerelGorselAdresi,
  saltOkunur,
  onGoruntulendi,
}) => {
  const [onyargisiz, setOnyargisiz] = React.useState(false);
  const [ilanSuzgeci, setIlanSuzgeci] = React.useState(baslangicIlan ?? '');

  /*
    Süzgeç adrese yazılıyor ki sayfa yenilenince ya da bağlantı
    paylaşılınca aynı liste gelsin; temizlenince sorgu da kalkıyor.
    replaceState: her süzgeç değişimi geri tuşuna bir adım eklemesin.
  */
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const adres = new URL(window.location.href);
    if (adres.searchParams.get('ilan') === (ilanSuzgeci || null)) return;
    if (ilanSuzgeci) adres.searchParams.set('ilan', ilanSuzgeci);
    else adres.searchParams.delete('ilan');
    /* Durum korunuyor: açık inceleme ekranının geçmiş işareti silinmesin. */
    window.history.replaceState(window.history.state, '', adres.pathname + adres.search);
  }, [ilanSuzgeci]);
  const [durumSuzgeci, setDurumSuzgeci] = React.useState('');
  const [arama, setArama] = React.useState('');
  const [odak, setOdak] = React.useState(0);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [kopyalandi, setKopyalandi] = React.useState(false);
  /*
    SEÇİLİ SATIR — son açılan başvuru. Mavi çerçeve yalnız onda; liste
    hiçbir şey seçilmeden açılıyor. İncelemeden dönünce kişi nerede
    kaldığını görüyor.
  */
  const [secili, setSecili] = React.useState<string | null>(null);
  /* Filtreler alanı varsayılan kapalı; etkin filtre düğmede sayıyla belli. */
  const [filtrelerAcik, setFiltrelerAcik] = React.useState(false);

  /* İlan süzgecinin seçenekleri gelen başvurulardan türüyor; boş bir
     ilan listesi göstermenin anlamı yok. */
  const ilanSecenekleri = React.useMemo(() => {
    const harita = new Map<string, string>();
    for (const k of kartlar) {
      if (k.ilanId) harita.set(String(k.ilanId), String(k.ilanBasligi ?? 'İlan'));
    }
    return [...harita].map(([id, baslik]) => ({ id, baslik }));
  }, [kartlar]);

  /*
    DURUM DIŞINDAKİ SÜZGEÇLER ÖNCE

    Durum seçeneklerinin yanındaki sayılar bu listeden sayılıyor: ilan ve
    arama uygulanmış, durum uygulanmamış. "Yeni (2)" seçilince listede
    gerçekten 2 aday kalsın.
  */
  const durumHaricSuzulmus = React.useMemo(() => {
    const terim = arama.trim().toLocaleLowerCase('tr-TR');
    return kartlar.filter((k) => {
      if (ilanSuzgeci && String(k.ilanId ?? '') !== ilanSuzgeci) return false;
      if (!terim) return true;
      /* Ad, okul, bölüm ve yetenekler aranıyor — İK'nın aklında kalan
         şeyler bunlar. */
      const havuz = [k.ad, k.universite, k.bolum, k.sehir, ...(k.yetenekler ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return havuz.includes(terim);
    });
  }, [kartlar, ilanSuzgeci, arama]);

  /*
    SADE AKIŞ DURUM SÜZGECİ: Yeni · İnceleniyor · Olumsuz · Geri çekildi.
    Kaldırılan aşamalardaki eski kayıtlar tek bir "Eski süreç kayıtları"
    grubunda; grup yalnız böyle kayıt varsa listede. Kural Pano ile ORTAK
    (basvuru-durumu.mjs `sadeDurumGrubu`).
  */
  const suzulmus = React.useMemo(
    () => durumHaricSuzulmus.filter((k) => durumSuzgecineUyar(k, durumSuzgeci)),
    [durumHaricSuzulmus, durumSuzgeci],
  );
  const durumSecenekleri = React.useMemo(
    () => durumSuzgeciSecenekleri(durumHaricSuzulmus, durumSuzgeci),
    [durumHaricSuzulmus, durumSuzgeci],
  );

  const gosterilen = React.useMemo(
    () => (onyargisiz ? suzulmus.map((k) => onyargisizla(k)) : suzulmus),
    [suzulmus, onyargisiz]
  );

  /*
    AÇIK ADAY SÜZGEÇTEN BAĞIMSIZ

    Açık kart `gosterilen` (süzülmüş liste) içinden aranıyordu. "Mülakat"
    süzgeci açıkken adayı olumsuza almak kartı listeden çıkarıyor, bu da
    ÇEKMECEYİ ANINDA KAPATIYORDU: şirket kararının sonucunu göremiyordu.

    Kaynak artık ham liste; süzgeç neyin listelendiğini belirliyor, açık
    olan adayı değil. `onyargisizla` ayrıca uygulanıyor ki önyargısız
    mod çekmecede de sürsün.
  */
  /*
    AÇIK BAŞVURU ADRESTEN (`?aday=<başvuruId>`)

    Ekranın açık olup olmadığı yerel bir durumda değil, adreste
    duruyor (useAdayAdresi başlığı): yeni sekmede ya da yenilemeyle
    açılan bağlantı ekranı açık getiriyor; geri tuşu kapatıyor, ileri
    tuşu yeniden açıyor. Kimlik ham listede yoksa açılmıyor — o durumu
    SirketPaneli tarafsız bir cümleyle karşılıyor ve adresi temizliyor.

    Liste DOM'da kalıyor (ekran bir üst katman) ve gövde kaydırması
    kilitli; kapanınca süzgeçler ve kaydırma konumu olduğu gibi duruyor.
    Odak açan karta dönüyor; kart süzgeçle gizlendiyse açılıştaki odağa.

    Adres bir OLAYDA yazılıyor, effect'te değil: StrictMode effect'i iki
    kez çalıştırıyor ve temizlikte geri alınan bir kayıt ikinci itmeyle
    üst üste binerdi (PaylasimDetayi başlığındaki gerekçe).
  */
  const adresAday = useAdayAdresi();
  const acikId = adresAday && kartlar.some((k) => k.id === adresAday) ? adresAday : null;

  /* Adresten (bildirim, derin bağlantı) açılan başvuru da seçili sayılıyor. */
  React.useEffect(() => {
    if (acikId) setSecili(acikId);
  }, [acikId]);

  const acikHam = acikId ? (kartlar.find((k) => k.id === acikId) ?? null) : null;
  const acik = acikHam && onyargisiz ? onyargisizla(acikHam) : acikHam;


  const tetikleyici = React.useRef<HTMLElement | null>(null);

  const odagiGeriVer = React.useCallback((id: string) => {
    window.requestAnimationFrame(() => {
      const kartOgesi = Array.from(document.querySelectorAll<HTMLElement>('[data-aday-karti]')).find(
        (oge) => oge.dataset.adayKarti === id,
      );
      const hedef = kartOgesi ?? (tetikleyici.current?.isConnected ? tetikleyici.current : null);
      hedef?.focus();
    });
  }, []);

  /* Kapanış hangi yoldan gelirse gelsin (Kapat, Escape, geri tuşu) odak karta. */
  const oncekiAcik = React.useRef<string | null>(null);
  React.useEffect(() => {
    const onceki = oncekiAcik.current;
    oncekiAcik.current = acikId;
    if (onceki && !acikId) odagiGeriVer(onceki);
  }, [acikId, odagiGeriVer]);

  const adayiAc = React.useCallback((id: string) => {
    const mevcut = adrestekiAday(window.location.search);
    if (mevcut === id) return;
    tetikleyici.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    /* Ekran kapalıyken yeni kayıt (geri tuşu kapatsın); açıkken yerinde. */
    adayAdresiniYaz(id, { it: !mevcut });
  }, []);

  const adayiKapat = React.useCallback(() => adayEkraniniKapat(), []);

  /*
    Bildirimden gelindiyse ilgili aday AYNI YOLDAN açılıyor: adres
    yazılıyor, ekran adresten açılıyor.
  */
  React.useEffect(() => {
    if (!acilacakAday) return;
    if (!kartlar.some((k) => k.id === acilacakAday)) return;
    adayiAc(acilacakAday);
    onAdayAcildi?.();
  }, [acilacakAday, kartlar, onAdayAcildi, adayiAc]);

  const durumUygula = React.useCallback(
    async (id: string, durum: string) => {
      setKaydediliyor(true);
      try {
        await onDurum?.(id, durum);
      } finally {
        setKaydediliyor(false);
      }
    },
    [onDurum]
  );

  /*
    J/K GERÇEK ODAĞI TAŞIYOR. Eskiden yalnız görsel bir "odaklı kart"
    çerçevesi vardı ve ilk kart hiçbir şey seçilmeden mavi duruyordu.
    Artık satırın kendisi odak alıyor (klavye halkası); seçim ayrı.
  */
  const satiraOdaklan = React.useCallback(
    (i: number) => {
      const k = gosterilen[i];
      if (!k) return;
      setOdak(i);
      document.querySelector<HTMLElement>(`[data-aday-karti="${k.id}"]`)?.focus();
    },
    [gosterilen],
  );

  React.useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      /*
        İNCELEME AÇIKKEN KISAYOL YOK

        Kısayollar listedeki ODAKLI karta işliyor, açık olan başvuruya
        değil. Bildirimden açılan adayda `odak` güncellenmiyor; o adayı
        okurken "x"e basmak listede odakta duran BAŞKA bir adayı olumsuz
        kapatabilirdi (koddan okundu, tarayıcıda denenmedi). Ekran modal;
        arkadaki liste klavyeden de kapalı.
      */
      if (acikId) return;
      if (yaziAlaninda(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const harf = e.key.toLocaleLowerCase('en-US');
      const mevcut = gosterilen[odak];

      if (harf === 'j') {
        e.preventDefault();
        satiraOdaklan(Math.min(odak + 1, gosterilen.length - 1));
      } else if (harf === 'k') {
        e.preventDefault();
        satiraOdaklan(Math.max(odak - 1, 0));
      } else if (harf === 'f' && mevcut) {
        e.preventDefault();
        adayiAc(mevcut.id);
      } else if (harf === 'a' && mevcut) {
        e.preventDefault();
        void durumUygula(mevcut.id, 'under_review');
      } else if (harf === 'x' && mevcut) {
        e.preventDefault();
        void durumUygula(mevcut.id, 'rejected');
      }
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, [gosterilen, odak, durumUygula, acikId, satiraOdaklan, adayiAc]);

  if (kartlar.length === 0) {
    /*
      İLAN VAR, BAŞVURU YOK (26 Eylül 2026)

      İki gerçek iş: ilanın bağlantısını paylaşmak ve ilanlara dönmek.
      Paylaşım telefonda sistemin paylaşım menüsü (`navigator.share`);
      yoksa ya da kullanıcı vazgeçerse panoya kopyalama. Yayında ilan
      yoksa (yalnız taslak/kapalı) paylaşılacak bir adres yok ve düğme
      çizilmiyor — cümle de bunu söylüyor.
    */
    const paylasilabilir = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const kopyala = () => {
      if (!ilanAdresi) return;
      navigator.clipboard
        ?.writeText(ilanAdresi)
        .then(() => setKopyalandi(true))
        .catch(() => setKopyalandi(false));
    };
    return (
      <div className={`${KUTU} text-center`} style={kutuStil}>
        <span
          aria-hidden
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
        >
          <Users className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
          Henüz başvuru yok
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          {ilanAdresi
            ? 'İlanınızın bağlantısını paylaşın; gelen başvurular burada görünecek.'
            : 'Yayında ilanınız yok. Bir ilanı yayınladığınızda başvurular burada görünecek.'}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {ilanAdresi && (
            <button
              type="button"
              onClick={() => {
                if (paylasilabilir) {
                  navigator.share({ url: ilanAdresi }).catch(() => undefined);
                  return;
                }
                kopyala();
              }}
              className={BIRINCIL_DUGME}
              style={birincilStil}
            >
              {paylasilabilir ? (
                <Share2 className="h-4 w-4" aria-hidden />
              ) : kopyalandi ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {paylasilabilir ? 'İlan bağlantısını paylaş' : kopyalandi ? 'Kopyalandı' : 'İlan bağlantısını kopyala'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('/sirket/ilanlar')}
            className={IKINCIL_DUGME}
            style={ikincilStil}
          >
            İlanlarıma git
          </button>
        </div>
      </div>
    );
  }

  /*
    ETKİN FİLTRE SAYISI — "Filtreler" düğmesinde. Durum süzgeci ve
    önyargısız inceleme o alanda; ilan seçimi ve arama ana satırda,
    kendileri görünür olduğu için sayılmıyor.
  */
  const etkinFiltre = (durumSuzgeci ? 1 : 0) + (onyargisiz ? 1 : 0);
  const suzuluyor = suzulmus.length !== kartlar.length;
  const filtreleriTemizle = () => {
    setDurumSuzgeci('');
    setOnyargisiz(false);
  };

  return (
    <div className="space-y-3">
      {/*
        ANA KONTROLLER YALNIZ İKİ: ilan seçimi ve aday araması (onaylı
        tasarım, 6 Ekim 2026). Durum süzgeci ve önyargısız inceleme
        "Filtreler" alanında. Sayfa başlığı ve toplam başvuru sayısı
        dışarıda (SirketPaneli); burada yalnız süzülünce kaç başvurunun
        göründüğü yazıyor.

        İlan seçicisi tek ilanlık listede çizilmiyor (tek seçenekli seçici
        bir şey seçtirmiyor) — süzgeç adresten geldiyse yine görünüyor ki
        "neden az başvuru var" sorusunun cevabı ekranda olsun.
      */}
      {/* Telefonda alt alta (onaylı tasarım); geniş ekranda tek satır. */}
      <div className="flex flex-col gap-3 md:flex-row md:gap-2">
        {(ilanSecenekleri.length > 1 || ilanSuzgeci !== '') && (
          <select
            value={ilanSuzgeci}
            onChange={(e) => setIlanSuzgeci(e.target.value)}
            aria-label="İlana göre süz"
            className={`${ALAN} md:w-80 md:shrink-0`}
            style={alanStil}
          >
            <option value="">Tüm ilanlar</option>
            {ilanSecenekleri.map((i) => (
              <option key={i.id} value={i.id}>
                {i.baslik}
              </option>
            ))}
          </select>
        )}

        <div className="flex min-w-0 items-stretch gap-2 md:flex-1">
          <label className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: SIRKET_METIN_IKINCIL }}
              aria-hidden
            />
            <input
              type="search"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Aday ara"
              aria-label="Aday ara"
              className={`${ALAN} pl-9`}
              style={alanStil}
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltrelerAcik((a) => !a)}
            aria-expanded={filtrelerAcik}
            aria-controls="basvuru-filtreleri"
            className={`${IKINCIL_DUGME} shrink-0 px-3 sm:px-4`}
            style={
              etkinFiltre > 0
                ? { borderColor: SIRKET_KENAR_VURGU, background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }
                : ikincilStil
            }
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filtreler
            {etkinFiltre > 0 && (
              <span
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black text-white"
                style={{ background: SIRKET_VURGU_KOYU }}
              >
                <span className="sr-only">, etkin filtre: </span>
                {etkinFiltre}
              </span>
            )}
          </button>
        </div>
      </div>

      {filtrelerAcik && (
        <div
          id="basvuru-filtreleri"
          role="region"
          aria-label="Filtreler"
          className="space-y-3 rounded-2xl border p-3 sm:p-4"
          style={kutuStil}
        >
          {/*
            DURUM — sade akış kuralı (basvuru-durumu.mjs): Yeni · İnceleniyor
            · Olumsuz · Geri çekildi; eski süreç kayıtları varsa tek bir
            "Eski süreç kayıtları" seçeneği. Sayılar ilan ve arama
            uygulanmış listeden.
          */}
          <label className="block">
            <span className="mb-1 block text-xs font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
              Durum
            </span>
            <select
              value={durumSuzgeci}
              onChange={(e) => setDurumSuzgeci(e.target.value)}
              aria-label="Duruma göre süz"
              className={`${ALAN} sm:max-w-xs`}
              style={alanStil}
            >
              {durumSecenekleri.map((s: { deger: string; etiket: string; sayi: number }) => (
                <option key={s.deger || 'tum'} value={s.deger}>
                  {s.etiket} ({s.sayi})
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm" style={{ color: SIRKET_METIN }}>
            <input
              type="checkbox"
              checked={onyargisiz}
              onChange={(e) => setOnyargisiz(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#2563EB]"
            />
            <span>
              <span className="block font-bold">Önyargısız incele</span>
              <span className="block text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                Ad ve fotoğraf gizlenir
              </span>
            </span>
          </label>

          {etkinFiltre > 0 && (
            <button
              type="button"
              onClick={filtreleriTemizle}
              className={`${IKINCIL_DUGME} w-full sm:w-auto`}
              style={ikincilStil}
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      )}

      {onyargisiz && (
        <p
          className="rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
          style={{ borderColor: SIRKET_KENAR, background: SIRKET_ROZET, color: SIRKET_METIN }}
        >
          {/*
            DÜRÜST SINIR (5 Ekim 2026): kip ekrandaki adı ve fotoğrafı gizliyor;
            adayın kendi yazdığı ve yüklediği belgeleri değiştirmiyor. Ön yazı
            imzalı olabilir, CV adı ve fotoğrafı taşıyabilir — kimliğin bütünüyle
            saklandığını söylemek doğru olmazdı. CV bu kipte açılmadan önce soruluyor.
          */}
          Ad ve fotoğraf gizlenir; paylaşımlar ve dış bağlantılar gösterilmez. Ancak CV ve ön
          yazı gibi belgeler adayın adını ve kimliğini açığa çıkarabilir.
        </p>
      )}

      {/*
        SÜZÜLMÜŞ SAYI — yalnız süzülünce. Sayılan şey BAŞVURU: aynı kişinin
        iki ilana başvurusu iki satır, "aday" demek yanlış olurdu.
      */}
      {suzuluyor && (
        <p className="text-sm font-semibold" role="status" style={{ color: SIRKET_METIN_IKINCIL }}>
          {suzulmus.length} / {kartlar.length} başvuru gösteriliyor
        </p>
      )}

      {suzulmus.length === 0 ? (
        <div className={`${KUTU} text-center`} style={kutuStil}>
          <p className="font-bold" style={{ color: SIRKET_METIN }}>
            Bu filtrelerle eşleşen başvuru yok
          </p>
          <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            Filtreleri temizleyip tüm başvuruları görebilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => {
              setIlanSuzgeci('');
              setDurumSuzgeci('');
              setArama('');
            }}
            className={`mx-auto mt-4 ${IKINCIL_DUGME}`}
            style={ikincilStil}
          >
            Filtreleri temizle
          </button>
        </div>
      ) : (
        /*
          TEK LİSTE, KOMPAKT SATIRLAR. Kart ızgarası ve Pano kalktı; satırlar
          tek bir kabın içinde ince çizgiyle ayrılıyor. Masaüstünde de aynı
          liste — satır genişleyince okul/bölüm ikinci sütuna geçiyor.
        */
        <ul
          aria-label="Başvurular"
          className="divide-y overflow-hidden rounded-2xl border p-1.5"
          style={{ ...kutuStil, borderColor: SIRKET_KENAR }}
        >
          {gosterilen.map((k, i) => (
            <li key={k.id} className="py-0.5" style={{ borderColor: SIRKET_KENAR }}>
              <AdayKarti
                kart={k as any}
                secili={k.id === secili}
                onOdak={() => setOdak(i)}
                onAc={() => {
                  setOdak(i);
                  adayiAc(k.id);
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {/*
        İnceleme ekranı: lg altında tam ekran, geniş ekranda ortada en
        çok 1200 piksellik iki sütunlu panel (AdayCekmecesi başlığı).

        Hata sınırıyla sarılı: bir adayın beklenmedik bir alanı ayrıntıyı
        çizerken hata verirse kaybedilecek şey o kart olsun, panelin
        tamamı değil. Sınır kök nedeni gizlemek için değil — asıl hata
        (erken çıkıştan sonra çağrılan hook) düzeltildi.
      */}
      <AdayHataSiniri onKapat={adayiKapat}>
        <AdayCekmecesi
          kart={acik}
          kaydediliyor={kaydediliyor}
          onKapat={adayiKapat}
          /*
            ÇEKMECE AÇIK KALIYOR

            Eskiden her durum değişimi çekmeceyi kapatıyordu; şirket
            adayı yeniden açmadan sonucu göremiyordu. Artık durum
            yerinde güncelleniyor. Hata da söz olarak geri veriliyor:
            çekmece kendi içinde satır içi gösteriyor.
          */
          onDurum={(d) => {
            if (!acik) return Promise.resolve();
            return durumUygula(acik.id, d);
          }}
          onMulakatTarihi={(tarih) => {
            if (!acik) return Promise.resolve();
            return onMulakatTarihi?.(acik.id, tarih) ?? Promise.resolve();
          }}
          /* Teklif de aynı yükleniyor durumunu paylaşıyor. */
          onTeklif={(teklif) => {
            if (!acik) return Promise.resolve();
            setKaydediliyor(true);
            return onTeklif?.(acik.id, teklif).finally(() => setKaydediliyor(false)) ?? Promise.resolve();
          }}
          /* Davet de aynı yükleniyor durumunu paylaşıyor. */
          onDavet={(davet) => {
            if (!acik) return Promise.resolve();
            setKaydediliyor(true);
            return onDavet?.(acik.id, davet).finally(() => setKaydediliyor(false)) ?? Promise.resolve();
          }}
          onIletisim={onIletisim}
          onNot={(metin) => {
            if (!acik) return;
            setKaydediliyor(true);
            void onNot?.(acik.id, metin).finally(() => setKaydediliyor(false));
          }}
          onGuncelProfil={onGuncelProfil}
          onPaylasimlar={onPaylasimlar}
          yerelGorselAdresi={yerelGorselAdresi}
          saltOkunur={saltOkunur}
          /*
            Görüntülenme kaydı ÇEKMECENİN KENDİ efektinde: çekmece
            çizilirken hata verirse (hata sınırı devreye girerse) React
            o bileşenin efektini hiç çalıştırmıyor, kayıt da yazılmıyor.
            Ebeveynde tetiklemek, çizilemeyen bir ayrıntıyı
            "görüntülendi" saymak olurdu.
          */
          onGoruntulendi={onGoruntulendi}
        />
      </AdayHataSiniri>

    </div>
  );
};
