import React from 'react';
import { Check, Copy, Eye, EyeOff, Search, Share2, Users } from 'lucide-react';
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
import { DURUM_SIRASI, durumAdi } from './basvuru-durumu';
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
    Sayfanın başlığı dışarıda (SirketPaneli, `h1` "Başvuranlar")
    çizildiğinde ızgara kendi başlığını atlıyor; yalnız süzgeç sayısı
    ("3 / 12 aday") kalıyor ve o da yalnız süzgeç açıkken — toplam sayı
    zaten sayfa başlığının altında.
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

  /* İlan süzgecinin seçenekleri gelen başvurulardan türüyor; boş bir
     ilan listesi göstermenin anlamı yok. */
  const ilanSecenekleri = React.useMemo(() => {
    const harita = new Map<string, string>();
    for (const k of kartlar) {
      if (k.ilanId) harita.set(String(k.ilanId), String(k.ilanBasligi ?? 'İlan'));
    }
    return [...harita].map(([id, baslik]) => ({ id, baslik }));
  }, [kartlar]);

  const suzulmus = React.useMemo(() => {
    const terim = arama.trim().toLocaleLowerCase('tr-TR');
    return kartlar.filter((k) => {
      if (ilanSuzgeci && String(k.ilanId ?? '') !== ilanSuzgeci) return false;
      if (durumSuzgeci && String(k.durum ?? '') !== durumSuzgeci) return false;
      if (!terim) return true;
      /* Ad, okul, bölüm ve yetenekler aranıyor — İK'nın aklında kalan
         şeyler bunlar. */
      const havuz = [k.ad, k.universite, k.bolum, k.sehir, ...(k.yetenekler ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return havuz.includes(terim);
    });
  }, [kartlar, ilanSuzgeci, durumSuzgeci, arama]);

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

  /* Odaktaki kart görünürde kalsın; J ile aşağı inerken ızgara kayıyor. */
  React.useEffect(() => {
    const k = gosterilen[odak];
    if (!k) return;
    document
      .querySelector(`[data-aday-karti="${k.id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [odak, gosterilen]);

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
        setOdak((o) => Math.min(o + 1, gosterilen.length - 1));
      } else if (harf === 'k') {
        e.preventDefault();
        setOdak((o) => Math.max(o - 1, 0));
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
  }, [gosterilen, odak, durumUygula, acikId]);

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

  return (
    <div className="space-y-4">
      {/* --------------------------------------------------- başlık */}
      {/*
        `h2`: ızgara bir sayfanın içinde bir bölüm; sayfanın `h1`'i
        dışarıda. Aynı sayfada iki `h1` ekran okuyucuya iki sayfa gibi
        okunurdu. `basliksiz`: /sirket/basvuranlar'da sayfa başlığı zaten
        "Başvuranlar", burada tekrar yazılmıyor.
      */}
      {basliksiz ? (
        /*
          SAYI HER ZAMAN YAZIYOR, YALNIZ SÜZÜLÜNCE DEĞİL.

          Eskiden sayfanın başlığı altındaki cümle toplamı söylüyordu
          ("İlanlarınıza gelen 3 başvuru."). O cümle kalktı — alt gezinme
          zaten "Başvurular" diyordu ve başlık ekranın en üstünü boşuna
          harcıyordu. Sayı burada kaldı: listenin hemen üstünde, ait
          olduğu yerde. Yalnız süzülünce yazsaydı, süzgeçsiz açan kişi
          kaç başvurusu olduğunu hiçbir yerde göremezdi.
        */
        <p className="text-sm font-semibold" style={{ color: SIRKET_METIN_IKINCIL }}>
          {suzulmus.length === kartlar.length
            ? `${kartlar.length} aday`
            : `${suzulmus.length} / ${kartlar.length} aday`}
        </p>
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-black" style={{ color: SIRKET_METIN }}>
            Başvuranlar
          </h2>
          <p className="text-sm font-semibold" style={{ color: SIRKET_METIN_IKINCIL }}>
            {suzulmus.length === kartlar.length
              ? `${kartlar.length} aday`
              : `${suzulmus.length} / ${kartlar.length} aday`}
          </p>
        </div>
      )}

      {/*
        SÜZGEÇLER — TANIDIK ÜÇLÜ

        İlan, durum ve arama. Hepsi görünür kontrol; öğrenmesi gereken bir
        şey yok. Kısayol ipucu kaldırıldı: panelin ilk defa açan bir İK
        çalışanına klavye dizilimi öğretmesi gerekmiyor.
      */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Seçici, süzgeç adresten geldiyse tek ilanla da görünür: yoksa
            "neden 3/11 aday" sorusunun cevabı ekranda olmazdı. */}
        {(ilanSecenekleri.length > 1 || ilanSuzgeci !== '') && (
          <select
            value={ilanSuzgeci}
            onChange={(e) => setIlanSuzgeci(e.target.value)}
            aria-label="İlana göre süz"
            className={ALAN}
            /* ALAN `w-full` taşıyor; süzgeç satırında genişlik satır içi
               veriliyor, yoksa seçici tüm satırı kaplayıp aramayı alt
               satıra itiyor. */
            style={{ ...alanStil, width: 'auto', minWidth: 160, maxWidth: '100%' }}
          >
            <option value="">Tüm ilanlar</option>
            {ilanSecenekleri.map((i) => (
              <option key={i.id} value={i.id}>
                {i.baslik}
              </option>
            ))}
          </select>
        )}

        <select
          value={durumSuzgeci}
          onChange={(e) => setDurumSuzgeci(e.target.value)}
          aria-label="Duruma göre süz"
          className={ALAN}
          style={{ ...alanStil, width: 'auto', minWidth: 150 }}
        >
          <option value="">Tüm durumlar</option>
          {DURUM_SIRASI.map((d) => (
            <option key={d} value={d}>
              {durumAdi(d)}
            </option>
          ))}
        </select>

        <label className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: SIRKET_METIN_IKINCIL }}
            aria-hidden
          />
          <input
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
          onClick={() => setOnyargisiz((o) => !o)}
          aria-pressed={onyargisiz}
          className={IKINCIL_DUGME}
          style={
            onyargisiz
              ? { borderColor: SIRKET_KENAR_VURGU, background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }
              : ikincilStil
          }
        >
          {onyargisiz ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Önyargısız incele
        </button>
      </div>

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
        LİSTE EKRANI DOLDURUYOR

        Önce solda kartlar, sağda kalıcı bir "Bir aday seçin" paneli
        vardı: kimse bir adaya tıklamadan ekranın yarısı boş duruyordu.
        Artık kartlar tüm alanı kullanıyor ve ayrıntı yalnızca bir karta
        tıklanınca açılıyor — listeye dönünce liste yine ekranı dolduruyor.
      */}
      {suzulmus.length === 0 ? (
        <div className={`${KUTU} text-center`} style={kutuStil}>
          <p className="font-bold" style={{ color: SIRKET_METIN }}>
            Bu süzgeçle eşleşen aday yok
          </p>
          <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            Süzgeçleri temizleyip tüm başvuruları görebilirsiniz.
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
            Süzgeçleri temizle
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {gosterilen.map((k, i) => (
            <li key={k.id} className="flex">
              <AdayKarti
                kart={k as any}
                odakli={i === odak}
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

      <p className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
        Reddedilen başvurular listeden silinmiyor; kararın kaydı adayın başvuru sayfasında da
        görünüyor.
      </p>
    </div>
  );
};
