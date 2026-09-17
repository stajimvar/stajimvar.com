import React from 'react';
import { createPortal } from 'react-dom';
import { Check, Link2, Pencil, Share2, X } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { useModalErisim } from '../../lib/modal-erisim';
import { profilYolu } from '../../lib/sosyal-kullanici-adi.mjs';

/**
 * PROFİL FOTOĞRAFI GÖRÜNTÜLEYİCİ — INSTAGRAM KALIBI (kullanıcı isteği, 17 Eylül 2026)
 *
 * Avatara dokununca açılan tam ekran katman: zemin fotoğrafın kendisinin
 * bulanık ve karartılmış hâli, ortada büyük daire, altında iki eylem.
 * Kullanıcının referans ekranında ÜSTÜ ÇİZİLİ olanlar burada YOK ve
 * eklenmiyor: üstteki avatar sırası / "+" dairesi, "QR kodu", "Avatar
 * ekle". Hiçbirinin arka ucu yok; çizilseydi çalışmayan düğme olurdu.
 *
 * ADRES BURADA ÜRETİLMİYOR
 * ------------------------
 * Görüntüleyici `adres`i hazır alıyor: aynı adres `ProfilFotografi`nin
 * küçük daireye çizdiği adres (`profilFotografi()` kararı + oturumdan
 * indirilen dosyanın bellek adresi). Burada ikinci bir indirme ya da
 * imzalı adres üretmek, aynı dosyayı aynı ekranda iki kez indirmek ve
 * kitle kapısını ikinci bir yoldan geçmek olurdu.
 *
 * FOTOĞRAF YOKSA BU BİLEŞEN HİÇ ÇİZİLMİYOR
 * ----------------------------------------
 * Baş harf yer tutucusunu büyütmenin anlamı yok; kararı çağıran veriyor
 * (`ProfilFotografi` yalnız çözülmüş bir adres varken dokunma hedefini
 * düğme yapıyor). Bu bileşen `adres`i zorunlu alıyor, "adres yoksa boş
 * daire çiz" dalı yok.
 *
 * YAKINLAŞTIRMA — BAĞIMLILIK YOK, POINTER EVENTS
 * ----------------------------------------------
 *   iki parmak      ölçek = başlangıç ölçeği × (anlık mesafe / ilk mesafe);
 *                   iki parmağın orta noktası altındaki piksel yerinde kalıyor
 *   tek parmak      yalnız ölçek > 1 iken sürükleme; fotoğraf daireden
 *                   dışarı taşınmıyor (sınır: kenar × (ölçek − 1) / 2)
 *   çift dokunuş    1x ↔ 2x, dokunulan noktaya odaklı
 *   tekerlek        masaüstü; imlecin altındaki piksel yerinde kalıyor
 *
 * Dönüşüm React durumuna yazılmıyor, doğrudan `style.transform`a
 * uygulanıyor: her hareket olayında yeniden çizim, iki parmak hareket
 * ederken kare atlatırdı. Ölçülmedi; kalıp `useGorselAdresleri`deki
 * "kanca metne bakıyor" kararıyla aynı ihtiyat. Ekran okuyucu için
 * ölçeğin bir anlamı yok, bu yüzden aria'ya da yazılmıyor.
 *
 * Tekerlek dinleyicisi elle ve `passive: false`: React kök dinleyicisini
 * `wheel` için pasif kuruyor, `preventDefault` orada işlemiyor. Gövde
 * kaydırması zaten kilitli (`useModalErisim`), yine de tarayıcının
 * ctrl+tekerlek sayfa yakınlaştırmasını burada yutmak gerekiyor.
 *
 * KAPANIŞ VE ODAK
 * ---------------
 * Escape, dış dokunma ve kapat düğmesi. Odak kapanıştan ÖNCE avatara
 * taşınıyor (`tetikleyici.focus()`), `PaylasimDetayi`de ölçülen sebep:
 * katman sökülürken odak içindeyse tarayıcı odağı `body`ye düşürüyor.
 * Escape / Tab tuzağı / gövde kilidi `useModalErisim`den — ikinci bir
 * tuzak yazılmadı.
 *
 * DAİRE ÖLÇÜSÜ
 * ------------
 * Kısa kenarın %85'i (`85vmin`), üst sınır 40rem: 1440×900'de 765 px
 * yerine 640 px — kaynak dosya 512 px kare (`ProfilFotografiYukleme`
 * KENAR), daha büyük çizmek ölçeklenmiş bir görüntüyü daha da
 * bulanıklaştırırdı.
 */

interface Props {
  /** Çözülmüş görsel adresi — `ProfilFotografi`nin çizdiğiyle aynı. */
  adres: string;
  /** `alt` metni için; başlıkta görünen adın aynısı. */
  ad: string;
  /**
   * Katmanı açan avatar düğmesi; odak kapanışta buraya dönüyor.
   * Referans olmasaydı odak belgenin köküne düşerdi.
   */
  tetikleyici: HTMLElement | null;
  onKapat: () => void;
  /**
   * Profil BAĞLANTISINI paylaşma — sayfanın var olan eylemi
   * (`SosyalProfilSayfasi.paylas`: mobilde işletim sistemi menüsü,
   * masaüstünde panoya kopyalama). Burada ikinci bir paylaşım mantığı
   * yok. Verilmezse düğme çizilmiyor.
   */
  onPaylas?: () => void;
  /**
   * Kopyalanacak herkese açık adresin kullanıcı adı. Çağıran YALNIZ
   * profil yayındayken veriyor: yayında olmayan profilin paylaşılacak
   * adresi yok, düğme de yok.
   */
  kullaniciAdi?: string | null;
  /**
   * Fotoğraf değiştirme akışı — YALNIZ SAHİBİNDE verilir. Ziyaretçi
   * dalında prop hiç gelmiyor, kalem DOM'a girmiyor.
   */
  onFotografDegistir?: () => void;
}

/* Ölçek sınırları: 1'in altı daireyi boş bırakır, 4'ün üstü 512 px kaynakta piksel gösterir. */
const EN_AZ_OLCEK = 1;
const EN_COK_OLCEK = 4;
/* Çift dokunuş: iki dokunuş arası süre ve konum toleransı. */
const CIFT_DOKUNUS_MS = 300;
const CIFT_DOKUNUS_PX = 24;
/* Bu kadar piksel hareket eden parmak "dokunuş" değil "sürükleme". */
const SURUKLEME_ESIGI_PX = 4;

interface Donusum {
  olcek: number;
  x: number;
  y: number;
}

const sinirla = (deger: number, alt: number, ust: number) =>
  Math.min(ust, Math.max(alt, deger));

/**
 * Yakınlaştırılmış fotoğrafın daireden dışarı taşımadan kayabileceği en
 * büyük uzaklık. Fotoğraf `kenar × olcek` genişliğinde, kap `kenar`;
 * fark iki yana eşit bölünüyor.
 */
const kaydirmaSiniri = (kenar: number, olcek: number) => (kenar * (olcek - 1)) / 2;

/** Kaydırmayı sınırın içine çekiyor; ölçek 1'e inince merkeze oturuyor. */
function sinirliDonusum(kenar: number, d: Donusum): Donusum {
  const olcek = sinirla(d.olcek, EN_AZ_OLCEK, EN_COK_OLCEK);
  const sinir = kaydirmaSiniri(kenar, olcek);
  return { olcek, x: sinirla(d.x, -sinir, sinir), y: sinirla(d.y, -sinir, sinir) };
}

/**
 * Ölçeği `nokta` (kap merkezine göre) etrafında değiştiriyor: noktanın
 * altındaki piksel yerinde kalıyor. Türetme: (p − t) / s = (p − t') / s'
 * ⇒ t' = p − (p − t) · s' / s.
 */
function noktaEtrafindaOlcekle(d: Donusum, yeniOlcek: number, nokta: { x: number; y: number }): Donusum {
  const olcek = sinirla(yeniOlcek, EN_AZ_OLCEK, EN_COK_OLCEK);
  const oran = olcek / d.olcek;
  return {
    olcek,
    x: nokta.x - (nokta.x - d.x) * oran,
    y: nokta.y - (nokta.y - d.y) * oran,
  };
}

const uzaklik = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/*
  Katmandaki düğmeler beyaz: zemin fotoğrafa göre değişiyor (bulanık +
  %60 karartma) ve beyaz kutu her fotoğrafta okunuyor. Ölçü ve köşe
  `PaylasimGovdesi.DUGME` ile aynı; renk kalıbı `PaylasimDetayi`nin
  karanlık perde üstündeki "Kapat" düğmesiyle aynı.
*/
const EYLEM = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;
const YUVARLAK_DUGME = `inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-gray-900 shadow-md hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

export const ProfilFotografiGoruntuleyici: React.FC<Props> = ({
  adres,
  ad,
  tetikleyici,
  onKapat,
  onPaylas,
  kullaniciAdi = null,
  onFotografDegistir,
}) => {
  const sahneRef = React.useRef<HTMLDivElement>(null);
  const gorselRef = React.useRef<HTMLImageElement>(null);
  const kapatDugmesiRef = React.useRef<HTMLButtonElement>(null);

  /* Kopyalama sonucu; "Kopyalandı" ancak pano yazmayı kabul edince. */
  const [kopyalama, setKopyalama] = React.useState<'bekliyor' | 'kopyalandi' | 'hata'>('bekliyor');

  /*
    KAPANIŞTA ÖNCE ODAK, SONRA KAPATMA — `PaylasimDetayi`deki ölçümün
    aynısı: odak kaldırılacak ağacın dışına, senkron olarak taşınıyor.
  */
  const kapat = React.useCallback(() => {
    tetikleyici?.focus();
    onKapat();
  }, [onKapat, tetikleyici]);

  /* Escape, Tab tuzağı, gövde kaydırma kilidi — ortak kancadan. */
  const kutuRef = useModalErisim<HTMLDivElement>(true, kapat);

  /*
    Açılışta odak kapat düğmesine, boyamadan önce (`useLayoutEffect`).
    rAF ve zamanlayıcı kullanılmıyor; StrictMode'un çift koşusunda
    iptal edilen kare `PaylasimDetayi`de ölçüldü.
  */
  React.useLayoutEffect(() => {
    kapatDugmesiRef.current?.focus();
  }, []);

  // ------------------------------------------------------- Yakınlaştırma

  const donusum = React.useRef<Donusum>({ olcek: 1, x: 0, y: 0 });
  const isaretciler = React.useRef(new Map<number, { x: number; y: number }>());
  /* İki parmak: ilk mesafe, o andaki dönüşüm ve ilk orta nokta. */
  const tutam = React.useRef<{ mesafe: number; baslangic: Donusum; orta: { x: number; y: number } } | null>(null);
  /* Tek parmak: nereden başladı, o andaki kaydırma, eşik aşıldı mı. */
  const surukleme = React.useRef<{ x: number; y: number; baslangic: Donusum; hareket: boolean } | null>(null);
  const sonDokunus = React.useRef<{ zaman: number; x: number; y: number } | null>(null);

  const kenar = () => sahneRef.current?.clientWidth ?? 0;

  /** Olay konumunu kap merkezine göre koordinata çeviriyor. */
  const merkezeGore = (x: number, y: number) => {
    const kutu = sahneRef.current?.getBoundingClientRect();
    if (!kutu) return { x: 0, y: 0 };
    return { x: x - (kutu.left + kutu.width / 2), y: y - (kutu.top + kutu.height / 2) };
  };

  const uygula = (yeni: Donusum) => {
    const d = sinirliDonusum(kenar(), yeni);
    donusum.current = d;
    const gorsel = gorselRef.current;
    if (gorsel) gorsel.style.transform = `translate(${d.x}px, ${d.y}px) scale(${d.olcek})`;
  };

  const isaretciIndi = (olay: React.PointerEvent<HTMLDivElement>) => {
    olay.currentTarget.setPointerCapture(olay.pointerId);
    isaretciler.current.set(olay.pointerId, { x: olay.clientX, y: olay.clientY });
    const noktalar = Array.from(isaretciler.current.values());

    if (noktalar.length === 2) {
      /* İkinci parmak indi: sürükleme biter, tutam başlar. */
      surukleme.current = null;
      sonDokunus.current = null;
      const [a, b] = noktalar;
      tutam.current = {
        mesafe: Math.max(uzaklik(a, b), 1),
        baslangic: donusum.current,
        orta: merkezeGore((a.x + b.x) / 2, (a.y + b.y) / 2),
      };
      return;
    }
    if (noktalar.length !== 1) return;

    const simdi = performance.now();
    const onceki = sonDokunus.current;
    if (
      onceki &&
      simdi - onceki.zaman < CIFT_DOKUNUS_MS &&
      uzaklik(onceki, { x: olay.clientX, y: olay.clientY }) < CIFT_DOKUNUS_PX
    ) {
      /* Çift dokunuş: yakınsa 1x'e dön, değilse dokunulan noktaya 2x. */
      sonDokunus.current = null;
      const d = donusum.current;
      uygula(
        d.olcek > 1
          ? { olcek: 1, x: 0, y: 0 }
          : noktaEtrafindaOlcekle(d, 2, merkezeGore(olay.clientX, olay.clientY)),
      );
      surukleme.current = null;
      return;
    }
    sonDokunus.current = { zaman: simdi, x: olay.clientX, y: olay.clientY };
    surukleme.current = { x: olay.clientX, y: olay.clientY, baslangic: donusum.current, hareket: false };
  };

  const isaretciKaydi = (olay: React.PointerEvent<HTMLDivElement>) => {
    if (!isaretciler.current.has(olay.pointerId)) return;
    isaretciler.current.set(olay.pointerId, { x: olay.clientX, y: olay.clientY });

    const t = tutam.current;
    if (t && isaretciler.current.size >= 2) {
      const [a, b] = Array.from(isaretciler.current.values());
      const oran = uzaklik(a, b) / t.mesafe;
      const orta = merkezeGore((a.x + b.x) / 2, (a.y + b.y) / 2);
      /*
        Önce ilk orta nokta etrafında ölçek, sonra orta noktanın kayması
        kadar kaydırma: parmaklar hem açılıp hem gezdirilince görüntü
        parmakların altında kalıyor.
      */
      const olcekli = noktaEtrafindaOlcekle(t.baslangic, t.baslangic.olcek * oran, t.orta);
      uygula({ olcek: olcekli.olcek, x: olcekli.x + (orta.x - t.orta.x), y: olcekli.y + (orta.y - t.orta.y) });
      return;
    }

    const s = surukleme.current;
    if (!s) return;
    const dx = olay.clientX - s.x;
    const dy = olay.clientY - s.y;
    if (!s.hareket && Math.hypot(dx, dy) < SURUKLEME_ESIGI_PX) return;
    s.hareket = true;
    /* Ölçek 1'de kaydıracak bir şey yok; sınır zaten 0'a çekiyor. */
    if (s.baslangic.olcek <= 1) return;
    uygula({ olcek: s.baslangic.olcek, x: s.baslangic.x + dx, y: s.baslangic.y + dy });
  };

  const isaretciKalkti = (olay: React.PointerEvent<HTMLDivElement>) => {
    isaretciler.current.delete(olay.pointerId);
    if (isaretciler.current.size < 2) tutam.current = null;
    if (isaretciler.current.size === 0) {
      /* Sürüklenen parmak çift dokunuş saymaz. */
      if (surukleme.current?.hareket) sonDokunus.current = null;
      surukleme.current = null;
    }
  };

  React.useEffect(() => {
    const sahne = sahneRef.current;
    if (!sahne) return;
    const tekerlek = (olay: WheelEvent) => {
      olay.preventDefault();
      /* Üstel adım: her 500 piksel tekerlek ≈ e katı; yön tarayıcı kuralıyla aynı (yukarı = yakınlaş). */
      const d = donusum.current;
      uygula(noktaEtrafindaOlcekle(d, d.olcek * Math.exp(-olay.deltaY * 0.002), merkezeGore(olay.clientX, olay.clientY)));
    };
    sahne.addEventListener('wheel', tekerlek, { passive: false });
    return () => sahne.removeEventListener('wheel', tekerlek);
    /* `uygula` ve `merkezeGore` yalnız ref okuyor; sahne katman ömrü boyunca aynı düğüm. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------- Eylemler

  const paylas = () => {
    onPaylas?.();
    /*
      Sonuç sayfanın kendi durum satırında yazılıyor (işletim sistemi
      menüsü ya da "panoya kopyalandı" cümlesi) ve o satır bu katmanın
      ALTINDA. Katman açık kalsaydı masaüstünde kopyalama sessiz
      görünürdü; kapanınca cümle görünüyor, telefonda paylaşım menüsü
      zaten üstte açılıyor.
    */
    kapat();
  };

  const baglantiyiKopyala = async () => {
    if (!kullaniciAdi) return;
    const tamAdres = `${window.location.origin}${profilYolu(kullaniciAdi)}`;
    try {
      await navigator.clipboard.writeText(tamAdres);
      setKopyalama('kopyalandi');
    } catch {
      /* "Kopyalandı" DENMİYOR: boş panoyla yapıştırmaya göndermek olurdu. */
      setKopyalama('hata');
    }
  };

  const fotografDegistir = () => {
    kapat();
    onFotografDegistir?.();
  };

  const kopyaEtiketi =
    kopyalama === 'kopyalandi' ? 'Kopyalandı' : kopyalama === 'hata' ? 'Kopyalanamadı' : 'Bağlantıyı kopyala';

  return createPortal(
    /*
      Katman `PaylasimDetayi` ile aynı z düzleminde (`z-[100]`) ve aynı
      kapanış alışkanlıklarında. `touch-none`: tarayıcının kendi
      kaydırma/yakınlaştırma jestleri katmanı değil fotoğrafı yönetsin.
    */
    <div
      ref={kutuRef}
      role="dialog"
      aria-modal="true"
      aria-label="Profil fotoğrafı"
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex touch-none flex-col items-center justify-center overflow-hidden bg-slate-950"
    >
      {/*
        ZEMİN FOTOĞRAFIN KENDİSİ: bulanık (`blur-2xl`) ve %60 karartılmış.
        `scale-110` bulanıklığın kenarda açtığı şeffaf şeridi dışarı
        atıyor. Dekoratif: `alt=""` ve `aria-hidden`.
      */}
      <img
        src={adres}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
      />
      {/* Dış dokunma kapatıyor; klavye için kapat düğmesi ve Escape var. */}
      <div aria-hidden className="absolute inset-0 bg-slate-950/60" onClick={kapat} />

      <div className="absolute right-3 top-3 z-10">
        <button
          type="button"
          ref={kapatDugmesiRef}
          onClick={kapat}
          className={YUVARLAK_DUGME}
        >
          <X aria-hidden className="h-5 w-5" />
          <span className="sr-only">Kapat</span>
        </button>
      </div>

      {/*
        SAHNE: kısa kenarın %85'i, üst sınır 40rem. Daire kendi içinde
        kırpıyor (`overflow-hidden rounded-full`); dönüşüm içteki
        görsele uygulanıyor, daire yerinde duruyor.
      */}
      <div
        className="relative z-10"
        style={{ width: 'min(85vmin, 40rem)', height: 'min(85vmin, 40rem)' }}
      >
        <div
          ref={sahneRef}
          data-sahne
          onPointerDown={isaretciIndi}
          onPointerMove={isaretciKaydi}
          onPointerUp={isaretciKalkti}
          onPointerCancel={isaretciKalkti}
          className="h-full w-full cursor-zoom-in touch-none select-none overflow-hidden rounded-full bg-gray-900"
        >
          <img
            ref={gorselRef}
            src={adres}
            alt={`${ad} profil fotoğrafı`}
            draggable={false}
            className="h-full w-full object-cover will-change-transform"
            style={{ transform: 'translate(0px, 0px) scale(1)' }}
          />
        </div>

        {/*
          KALEM YALNIZ SAHİBİNDE: prop ziyaretçi dalında hiç gelmiyor.
          Yer, dairenin 45° sağ altı: köşeden %8 içeride (r·(1−√2/2) ≈
          çapın %14,6'sı; 44 px düğmenin merkezi oraya düşüyor).
        */}
        {onFotografDegistir && (
          <button
            type="button"
            onClick={fotografDegistir}
            className={`absolute bottom-[8%] right-[8%] z-10 ${YUVARLAK_DUGME}`}
          >
            <Pencil aria-hidden className="h-5 w-5" />
            <span className="sr-only">Fotoğrafı değiştir</span>
          </button>
        )}
      </div>

      {/*
        YALNIZ İKİ EYLEM: Paylaş ve Bağlantıyı kopyala. Üçüncü satır yok.
        Kopyalama yayında olmayan profilde çizilmiyor — adres yok.
      */}
      {(onPaylas || kullaniciAdi) && (
        <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-3 px-4">
          {onPaylas && (
            <button type="button" onClick={paylas} className={EYLEM}>
              <Share2 aria-hidden className="h-4 w-4" />
              Paylaş
            </button>
          )}
          {kullaniciAdi && (
            <button type="button" onClick={() => void baglantiyiKopyala()} className={EYLEM}>
              {kopyalama === 'kopyalandi' ? (
                <Check aria-hidden className="h-4 w-4 text-emerald-600" />
              ) : (
                <Link2 aria-hidden className="h-4 w-4" />
              )}
              {/* Canlı bölge kalıcı: sonradan eklenen `role="status"` ekran okuyucuya duyurulmuyor. */}
              <span aria-live="polite">{kopyaEtiketi}</span>
            </button>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
};
