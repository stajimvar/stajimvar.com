import React from 'react';
import { Archive, Bookmark, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI, RENK_PRIMARY } from '../../lib/renk-token';
import {
  SOSYAL_PAYLASIM_KOVASI,
  SosyalHata,
  begen,
  begeniDurumuGetir,
  begeniyiKaldir,
  kaydet,
  kaydetmeDurumuGetir,
  kaydiKaldir,
  paylasimiArsivle,
  type BegeniDurumu,
  type SosyalPaylasim,
} from '../../lib/queries/sosyal';
import { begeniyiTersle, etkilesimGecisi } from '../../lib/sosyal-etkilesim.mjs';
import { gezinmeKarari, parmakKaymasi, yonuBelirle } from '../../lib/kaydirma-gezinme.mjs';
import { tarihMetni } from '../../lib/tarih.mjs';
import { useGorselAdresleri } from './useGorselAdresleri';

/**
 * PAYLAŞIM GÖVDESİ — TEK GÖNDERİNİN ŞERİDİ, METNİ VE EYLEMLERİ
 *
 * İki yerde çiziliyor ve İKİ KOPYASI YOK:
 *
 *   'diyalog'  lg ve üstü; `PaylasimDetayi`nin iki panelli katmanı.
 *              Görsel paneli kabın yüksekliğini alıyor, metin paneli
 *              sabit 26rem ve yalnız o kayıyor.
 *   'akis'     lg altı; aynı katmanın dikey akışı. Bloklar alt alta,
 *              sıra Instagram'ınki: şerit → eylem satırı (beğen/kaydet,
 *              sahipte sağ uçta arşivle) → açıklama. Sıra `order-*` ile
 *              veriliyor, JSX ikinci kez yazılmıyor — iki kopya olsaydı
 *              beğeni kilidi ya da arşiv cümlesi birinde değişip ötekinde
 *              kalırdı.
 *
 * Beğeni/kaydetme durumu, kilit, arşiv adımları ve görsel indirme
 * (`useGorselAdresleri`) hep burada; katman ve akış yalnız kabı ve
 * kapanışı biliyor.
 *
 * `aktif` — AĞ İŞİ GÖRÜNÜME YAKLAŞINCA
 * ------------------------------------
 * Akışta bir profilin bütün gönderileri tek listede; hepsinin görselini
 * ve etkileşim satırını açılışta indirmek N gönderi için 2N sorgu ve
 * N×seri dosya demekti. Blok görünüme yaklaşana kadar (`PaylasimDetayi`
 * içindeki IntersectionObserver) `aktif` yanlış: görsel kancasına boş
 * liste gidiyor, etkileşim sorgusu hiç atılmıyor ve iki alan da
 * iskeletle duruyor. Gövde yine de ÇİZİLİYOR — açıklama ve tarih listede
 * zaten var, ağ istemiyor — böylece bloğun yüksekliği aktif olmadan
 * önce de neredeyse aynı: görsel paneli 4:5 sabit, etkileşim satırı
 * iskelette de düğmede de 44 px. Yalnız iskelet çizip içerik gelince
 * gövdeyi takmak, tıklanan gönderinin üstündeki bloklar dolarken akışı
 * aşağı kaydırırdı.
 *
 * BEĞENİ VE KAYDETME — SAYILARI FARKLI
 * ------------------------------------
 * İki düğme de aynı kalıpta: `aria-pressed` durumu söylüyor, etiket
 * DEĞİŞMİYOR (değişen etiketli bir `aria-pressed` düğmesi okuyucu
 * aracında iki kez durum bildirir). Beğeni sayısı GERÇEK satırlardan
 * geliyor ve yalnız sıfırdan büyükken yazılıyor. Kaydetme sayısı hiçbir
 * yerde yok ve olamaz: `post_saves` politikası `using (user_id =
 * auth.uid())`, yani paylaşımın sahibi bile kimin kaydettiğini görmüyor;
 * oradan çıkacak tek sayı 0 ya da 1 olurdu — uydurma bir metrik.
 *
 * "Kimler beğendi" listesi de yok: sorgu `user_id` alanını yalnız "ben
 * var mıyım" karşılaştırmasında kullanıyor, dışarı vermiyor.
 *
 * NE YOK
 * ------
 *   Yorum              tablo yok
 *   Kalıcı silme       D'de ne RPC'si ne düğmesi var; yol arşivlemek
 *   Paylaş / indir     görsellerin paylaşılabilir bir adresi yok; dosya
 *                      yalnız bu sekmenin belleğinde (bkz.
 *                      `useGorselAdresleri`). "İndir" düğmesi kitle
 *                      kuralının dışına çıkan bir kopya üretmeyi
 *                      kolaylaştırırdı
 *
 * GÖRÜNÜRLÜK BİLGİSİ YALNIZ SAHİBİNE
 * ----------------------------------
 * "Bağlantılarım" satırı yazarın kendi ayarı. Ziyaretçiye gösterilseydi,
 * karşısındaki kişinin bağlantı listesinde olup olmadığını bu satırdan
 * çıkarırdı — kitle kuralının kendisi bir bilgi sızıntısına dönerdi.
 */

export const DUGME = `inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

/*
  BASILI DURUM AYRI BİR SINIF DİZİSİ, ÜST ÜSTE YAZILMIŞ SINIF DEĞİL

  `DUGME`ye `bg-blue-50` eklemek `bg-white`ı geçersiz kılmazdı: aynı
  özgüllükteki iki utility'nin hangisinin kazanacağını sınıf sırası değil,
  üretilen stil sayfasındaki sıra belirliyor. Bu yüzden zemin, kenar ve
  metin rengi iki dalda ayrı ayrı yazılıyor; ikisi de depodaki
  `RENK_PRIMARY` belirteçlerinden geliyor, yeni bir renk üretilmedi.
*/
const ETKILESIM_TABANI = `inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-bold disabled:cursor-default disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

/*
  SERİ OKLARI GÖRSELİN ÜSTÜNDE

  Koyu zeminde beyaz yuvarlak; 44 px dokunma hedefi (`h-11 w-11`).
  `absolute` + `top-1/2 -translate-y-1/2` ile dikey ortada, yatay kenar
  çağıran yerde (`left-2` / `right-2`). Devre dışı uçta düğme
  SİLİKLEŞİYOR ama kalkmıyor: yerleşim kaymıyor ve klavye kullanıcısı
  "buradan öteye yok" bilgisini `disabled` durumundan alıyor.

  DAR EKRANDA GÖRÜNMÜYOR AMA DOM'DAN ÇIKMIYOR (`max-lg:sr-only`)

  lg altında gezinme parmakla (aşağıdaki işaretçi olayları); oklar
  fotoğrafın üstünde yer kaplamasın diye görsel olarak gizli. `hidden`
  DEĞİL, `sr-only`: dokunmatik cihazda ekran okuyucu açıkken (VoiceOver,
  TalkBack) parmak hareketlerini okuyucu alıyor, kaydırma bileşene hiç
  ulaşmıyor; oklar ağaçtan çıksaydı o kullanıcının seride gezecek hiçbir
  yolu kalmazdı. `sr-only` düğme 1 px ve kırpılmış ama odaklanabilir ve
  etkinleştirilebilir; odak tuzağı `getClientRects` ile ölçtüğü için onu
  da sayıyor. `lg:not-sr-only` yerine `max-lg:sr-only` seçildi: ikincisi
  lg ve üstünde HİÇBİR bildirim yazmıyor, `absolute h-11 w-11` ile
  `not-sr-only`'nin `position/width/height` sıfırlaması arasında sıra
  kavgası olmuyor.
*/
const OK_DUGMESI = `absolute top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-sm hover:bg-white disabled:cursor-default disabled:opacity-40 max-lg:sr-only ${RENK_GECISI} ${ODAK_HALKASI}`;

/*
  GÖRSEL PANELİ

  Zemin koyu nötr: `object-cover` ile kırpılan fotoğrafın kenarında
  boşluk kalmıyor ama yükleme ve hata dallarında panel boş; koyu zemin o
  boşluğu "fotoğraf alanı" olarak okutuyor. Renk depodaki katman
  perdesiyle aynı aile (`slate-950`), yeni ton yok.

  Diyalogda lg ve üstünde panel kabın yüksekliğini alıyor ve genişliği
  4:5'ten türüyor (900 px yüksek ekranda ≈ 648×810). Akış lg altında
  çizildiği için o sınıflar orada anlamsız; yine de eklenmiyor ki bir gün
  akış geniş ekranda açılırsa panel `h-full` ile kabın tamamını almasın.
*/
const GORSEL_PANELI = 'relative aspect-[4/5] w-full shrink-0 touch-pan-y overflow-hidden bg-slate-950';
const GORSEL_PANELI_DIYALOG = `${GORSEL_PANELI} lg:aspect-[4/5] lg:h-full lg:w-auto`;

/*
  METİN PANELİ

  Diyalog: `flex-1` boşluk etkileşim satırını panelin altına itiyor;
  geniş ekranda panel sabit 26rem (`lg:flex-none lg:w-[26rem]`) — kabın
  genişliği içerikten türediği için esnek kalsaydı sol panelin 4:5
  oranını da sürüklerdi. Akış: panel içeriği kadar, sıra `order-*` ile.
*/
const METIN_PANELI_DIYALOG = 'flex min-h-0 min-w-0 flex-1 flex-col lg:w-[26rem] lg:flex-none lg:overflow-y-auto';
const METIN_PANELI_AKIS = 'flex min-w-0 flex-col';

const etkilesimSinifi = (basili: boolean) =>
  `${ETKILESIM_TABANI} ${
    basili
      ? `${RENK_PRIMARY.kenar} ${RENK_PRIMARY.yumusakZemin} ${RENK_PRIMARY.metin}`
      : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
  }`;

const KITLE_METNI: Record<SosyalPaylasim['kitle'], string> = {
  baglantilarim: 'Bağlantılarım',
  'alan-toplulugum': 'Alan topluluğum',
};

export type GovdeYerlesimi = 'diyalog' | 'akis';

interface GovdeProps {
  paylasim: SosyalPaylasim;
  /** Sahip dalı ile ziyaretçi dalı AYRI yetki durumu; arşiv yalnız sahibinde. */
  sahibiMi: boolean;
  yerlesim: GovdeYerlesimi;
  /**
   * Görseller ve etkileşim durumu yalnız bu doğruyken iniyor (başlıktaki
   * gerekçe). Diyalog tek gönderi çizdiği için hep doğru veriyor.
   */
  aktif: boolean;
  /**
   * Sunucu arşivi KABUL ETTİKTEN sonra çağrılıyor; iyimser gizleme yok.
   * Sonrasında ne olacağına kap karar veriyor: diyalog kapanıyor, akış
   * bloğu düşürüp kalıyor.
   */
  onArsivlendi: (paylasimId: string) => void;
}

export const PaylasimGovdesi: React.FC<GovdeProps> = ({
  paylasim,
  sahibiMi,
  yerlesim,
  aktif,
  onArsivlendi,
}) => {
  const diyalog = yerlesim === 'diyalog';
  const [indeks, setIndeks] = React.useState(0);
  const [arsivAsamasi, setArsivAsamasi] = React.useState<
    'kapali' | 'soruluyor' | 'gonderiliyor'
  >('kapali');
  const [arsivHatasi, setArsivHatasi] = React.useState<string | null>(null);

  /*
    ETKİLEŞİM DURUMU SUNUCUDAN OKUNUYOR, VARSAYILMIYOR

    "Beğenmedim" diye başlayıp sonra düzeltmek, bir kare boyunca yanlış
    bir durum göstermek olurdu: kullanıcı zaten beğendiği bir paylaşımda
    boş kalp görüp yeniden basar ve isteği sunucu (birincil anahtar)
    reddederdi. Bu yüzden dört durumun dördü de ayrı: yükleniyor, hazır,
    hata ve — düğmelerin hiç çizilmediği — hata cümlesi.
  */
  const [begeniDurumu, setBegeniDurumu] = React.useState<BegeniDurumu | null>(null);
  const [kaydettimMi, setKaydettimMi] = React.useState(false);
  const [etkilesimDurumu, setEtkilesimDurumu] = React.useState<
    'yukleniyor' | 'hazir' | 'hata'
  >('yukleniyor');
  const [etkilesimHatasi, setEtkilesimHatasi] = React.useState<string | null>(null);

  /*
    KİLİT HEM REF HEM DURUM

    `disabled` kullanıcıya işlemin sürdüğünü ANLATIYOR ama tek başına
    güvence değil: React durumu aynı karede güncellenmiyor, iki hızlı
    tıklama ikisi de 'bekliyor' görüp İKİ istek üretebilir. Kapıyı
    `kilitRef` tutuyor — senkron okunuyor, senkron yazılıyor. İkisi tek
    fonksiyondan yazılıyor ki biri ötekinden geride kalmasın.
  */
  const kilitRef = React.useRef(false);
  const [kilitli, setKilitli] = React.useState(false);
  const kilitle = React.useCallback((deger: boolean) => {
    kilitRef.current = deger;
    setKilitli(deger);
  }, []);

  const toplam = paylasim.gorseller.length;

  /*
    GEZİNME TEK YERDE: klavye oku, ekrandaki ok ve parmak kaydırması
    aynı iki fonksiyonu çağırıyor. Üç kopya olsaydı uç kuralı üçünde ayrı
    yazılır ve biri diğerinden sapardı (klavye dalı bir süre
    `Math.max(toplam - 1, 0)` ile, düğme dalı onsuz yazılmıştı).
  */
  const oncekiKare = React.useCallback(() => {
    setIndeks((onceki) => Math.max(onceki - 1, 0));
  }, []);
  const sonrakiKare = React.useCallback(() => {
    setIndeks((onceki) => Math.min(onceki + 1, Math.max(toplam - 1, 0)));
  }, [toplam]);

  /*
    PARMAKLA KAYDIRMA — DURUM VE OLAYLAR

    Başlangıç noktası ve yön kilidi ref'te: her `pointermove`de yeniden
    çizim istemiyorlar. Görselin parmakla kayması (`kayma`, px) ise
    durumda, çünkü ekrana yazılıyor. Kararlar `kaydirma-gezinme.mjs`'te;
    burada yalnız olaydan sayı çıkarılıp o kararlar uygulanıyor.

    YALNIZ DOKUNMA (`pointerType === 'touch'`): fare ile fotoğrafı
    sürüklemek masaüstünde beklenen bir hareket değil, ok ve klavye
    orada duruyor; fare dalı açık olsaydı tarayıcının kendi görsel
    sürüklemesiyle çakışırdı. Dokunma işaretçisi tarayıcı tarafından
    örtük olarak yakalanıyor, `setPointerCapture` gerekmiyor
    (KesfetGlobe'daki capture → click çakışması burada da olmasın).

    OKTAN BAŞLAYAN DOKUNMA SAYILMIYOR: lg ve üstünde dokunmatik ekranda
    ok görünür; oktan başlayıp kayan parmak hem okun `click`ini hem
    kaydırma kararını üretip iki kare atlardı.

    GEÇİŞ ANİMASYONU PARMAK SÜRERKEN KAPALI, BAŞKA HER ZAMAN AÇIK
    (`parmakSuruyor`)

    Parmak sürerken şerit gecikmesiz izliyor (geçiş sınıfı yok);
    bırakınca sınıf geri geliyor ve şerit 200 ms'de yeni konumuna
    oturuyor — eşik geçildiyse komşu kareye, geçilmediyse eski yerine.
    Kare değişiminde animasyon artık İSTENİYOR: tek `<img>` döneminde
    kayma -60 px'ten 0'a animasyonla dönseydi YENİ fotoğraf soldan girer
    gibi görünürdü; şeritte böyle bir ters yön yok, çünkü hedef konum
    (-(i+1)·100%) parmağın zaten gittiği yönde. Klavye ve ok da aynı
    sınıfla kayıyor: sürükleme yokken sınıf hep var, tek kaynak.

    Bayrak pointerdown'da kapanıp pointerup/cancel'da açılıyor; etkiyle
    ya da kare zamanlayıcısıyla değil (açılış odağı testi: bu dosyada
    kare zamanlayıcısı yasak). pointerup'taki üç yazım (kayma 0, indeks,
    bayrak) tek karede boyanıyor; tarayıcı "sınıf var, transform değişti"
    görüp animasyonu başlatıyor — istenen tam bu. Dikeye dönen ya da hiç
    kımıldamayan dokunuşta da bayrak açılıyor; yoksa bir sonraki ok tuşu
    animasyonsuz atlardı.
  */
  const surukleme = React.useRef<{
    kimlik: number;
    x: number;
    y: number;
    yon: 'belirsiz' | 'yatay' | 'dikey';
  } | null>(null);
  const [kayma, setKayma] = React.useState(0);
  const [parmakSuruyor, setParmakSuruyor] = React.useState(false);

  const surukleBasla = (olay: React.PointerEvent<HTMLDivElement>) => {
    if (olay.pointerType !== 'touch' || toplam <= 1) return;
    if ((olay.target as HTMLElement).closest('button')) return;
    surukleme.current = { kimlik: olay.pointerId, x: olay.clientX, y: olay.clientY, yon: 'belirsiz' };
    setParmakSuruyor(true);
  };

  const surukleHareket = (olay: React.PointerEvent<HTMLDivElement>) => {
    const baslangic = surukleme.current;
    if (!baslangic || baslangic.kimlik !== olay.pointerId) return;
    const dx = olay.clientX - baslangic.x;
    const dy = olay.clientY - baslangic.y;
    if (baslangic.yon === 'belirsiz') {
      baslangic.yon = yonuBelirle(dx, dy);
      if (baslangic.yon === 'dikey') {
        /* Sayfa kaydırması: tarayıcı `pan-y` ile devralıyor, biz çekiliyoruz. */
        surukleme.current = null;
        setParmakSuruyor(false);
        return;
      }
    }
    if (baslangic.yon !== 'yatay') return;
    setKayma(parmakKaymasi({ dx, indeks, toplam }));
  };

  const surukleBitir = (olay: React.PointerEvent<HTMLDivElement>) => {
    const baslangic = surukleme.current;
    if (!baslangic || baslangic.kimlik !== olay.pointerId) return;
    surukleme.current = null;
    setParmakSuruyor(false);
    if (baslangic.yon !== 'yatay') return;
    const karar = gezinmeKarari({ dx: olay.clientX - baslangic.x, indeks, toplam });
    setKayma(0);
    if (karar === 'sonraki') sonrakiKare();
    else if (karar === 'onceki') oncekiKare();
  };

  /* `pointercancel` (tarayıcı hareketi devraldı): kare değişmiyor, şerit yerine dönüyor. */
  const surukleIptal = (olay: React.PointerEvent<HTMLDivElement>) => {
    const baslangic = surukleme.current;
    if (!baslangic || baslangic.kimlik !== olay.pointerId) return;
    surukleme.current = null;
    setKayma(0);
    setParmakSuruyor(false);
  };

  /*
    OK TUŞLARI YALNIZ DİYALOGDA

    Sağ/sol, düğmelerin ekrandaki yerleşimiyle aynı yönde; klavye
    kullanıcısı düğmelere tab'layıp Enter'a basmak zorunda kalmıyor.
    Dinleyici belgede, yani "hangi şerit" sorusu tek gönderili diyalogda
    cevapsız değil. Akışta aynı anda birden çok şerit var; belge düzeyinde
    bir ok hepsini birden kaydırırdı. Orada gezinme parmak ve şeridin
    kendi (dar ekranda `sr-only`) okları.
  */
  React.useEffect(() => {
    if (!diyalog) return;
    const tusaBas = (olay: KeyboardEvent) => {
      if (olay.key === 'ArrowRight') {
        sonrakiKare();
        return;
      }
      if (olay.key === 'ArrowLeft') {
        oncekiKare();
      }
    };
    document.addEventListener('keydown', tusaBas);
    return () => document.removeEventListener('keydown', tusaBas);
  }, [diyalog, oncekiKare, sonrakiKare]);

  /*
    GÖRSELLER TEK TEK, KULLANICININ OTURUMUNDAN İNİYOR

    Bir süre bütün seri TEK istekte imzalanıyordu; imza kalktı çünkü
    ölçüldü: bir kez verilen jeton RLS'i yeniden sormuyor. Ölçüm tablosu
    ve adreslerin ömrü (`revokeObjectURL` dahil) `useGorselAdresleri`
    başlığında; bu ekran kendi indirme/temizleme kurgusunu KURMUYOR —
    ızgarayla aynı kanca, yaşam döngüsü tek yerde.

    Seri açılırken hepsi birden iniyor: kullanıcı ok tuşuyla iki kareyi
    bir saniyede geçiyor ve kare başına indirme, her basışta yeni bir
    bekleme ekranı demek olurdu.

    Blok aktif değilken kancaya BOŞ liste gidiyor: kanca boş listede
    hiçbir şey indirmiyor ve 'hazir' dönüyor; o 'hazir' burada
    'yukleniyor'a çevriliyor ki panel "görsel açılamadı" değil iskelet
    göstersin — henüz istenmemiş bir dosya "açılamadı" değil.
  */
  const yollar = React.useMemo(
    () => (aktif ? paylasim.gorseller.map((gorsel) => gorsel.storageYolu) : []),
    [aktif, paylasim.gorseller],
  );
  const { durum: kancaDurumu, adresler } = useGorselAdresleri(SOSYAL_PAYLASIM_KOVASI, yollar);
  const gorselDurumu = aktif ? kancaDurumu : 'yukleniyor';

  /*
    İki sorgu birlikte gidiyor: ikisi de aynı ekranın aynı satırını
    besliyor ve biri gelip öteki beklerken yarım bir şerit çizmek,
    kullanıcıya "kaydet" düğmesinin durumunu bilmeden bastırırdı.
    Blok aktif olana kadar hiç gitmiyorlar.
  */
  React.useEffect(() => {
    if (!aktif) return;
    let iptal = false;
    setEtkilesimDurumu('yukleniyor');
    setEtkilesimHatasi(null);
    Promise.all([begeniDurumuGetir([paylasim.id]), kaydetmeDurumuGetir([paylasim.id])])
      .then(([begeniler, kayitlar]) => {
        if (iptal) return;
        setBegeniDurumu(begeniler.get(paylasim.id) ?? { begendimMi: false, adet: 0 });
        setKaydettimMi(kayitlar.has(paylasim.id));
        setEtkilesimDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setEtkilesimDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, [aktif, paylasim.id]);

  /*
    İKİ YÖN TEK FONKSİYON

    Beğenmek ve beğeniyi kaldırmak AYNI düğme: ikisi ayrı düğme olsaydı
    ekranda her zaman biri yanlış durumu gösterirdi. Kilit, iyimser
    yazım ve hata dalındaki geri dönüş `etkilesimGecisi` içinde — kural
    tek yerde ve testte çalıştırılarak ölçülüyor.
  */
  const begeniyiCevir = () => {
    if (!begeniDurumu) return;
    const onceki = begeniDurumu;
    void etkilesimGecisi({
      kilitliMi: kilitRef.current,
      onceki,
      sonraki: begeniyiTersle(onceki),
      yaz: setBegeniDurumu,
      kilitle,
      hataYaz: setEtkilesimHatasi,
      istek: () => (onceki.begendimMi ? begeniyiKaldir(paylasim.id) : begen(paylasim.id)),
      /* Cümle işin olmadığını VE durumun ne olduğunu söylüyor. */
      hataMetni: onceki.begendimMi
        ? 'Beğenin kaldırılamadı; beğenin duruyor.'
        : 'Beğenin kaydedilemedi; paylaşımı beğenmedin.',
    });
  };

  const kaydiCevir = () => {
    const onceki = kaydettimMi;
    void etkilesimGecisi({
      kilitliMi: kilitRef.current,
      onceki,
      sonraki: !onceki,
      yaz: setKaydettimMi,
      kilitle,
      hataYaz: setEtkilesimHatasi,
      istek: () => (onceki ? kaydiKaldir(paylasim.id) : kaydet(paylasim.id)),
      hataMetni: onceki
        ? 'Kaydın kaldırılamadı; paylaşım kayıtlarında duruyor.'
        : 'Paylaşım kaydedilemedi; kayıtlarında bir değişiklik olmadı.',
    });
  };

  const arsivle = async () => {
    if (arsivAsamasi === 'gonderiliyor') return;
    setArsivHatasi(null);
    setArsivAsamasi('gonderiliyor');
    try {
      await paylasimiArsivle(paylasim.id);
      /* Liste ancak sunucu kabul ettikten sonra tazeleniyor; iyimser gizleme yok. */
      onArsivlendi(paylasim.id);
    } catch (sorun) {
      setArsivHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'Paylaşım arşivlenemedi. Paylaşımında bir değişiklik olmadı.',
      );
      setArsivAsamasi('soruluyor');
    }
  };

  const tarih = tarihMetni(paylasim.olusturmaAni);

  return (
    <>
      <div
        className={diyalog ? GORSEL_PANELI_DIYALOG : GORSEL_PANELI}
        onPointerDown={surukleBasla}
        onPointerMove={surukleHareket}
        onPointerUp={surukleBitir}
        onPointerCancel={surukleIptal}
      >
        {gorselDurumu === 'yukleniyor' && (
          <div aria-busy="true" className="flex h-full w-full items-center justify-center">
            <span aria-hidden className="h-24 w-24 animate-pulse rounded-2xl bg-slate-800" />
          </div>
        )}

        {/*
          "Görsel alınamadı" ile "görsel yok" AYRI cümleler: birincisi
          geçici bir sorun, ikincisi paylaşımın kendisi hakkında bir
          iddia. İkisini aynı metne indirmek, dosyası duran bir
          paylaşımı boş göstermek olurdu.
        */}
        {gorselDurumu === 'hata' && (
          <p
            role="alert"
            className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-200"
          >
            Görseller şu anda alınamadı. Paylaşımda bir değişiklik olmadı.
          </p>
        )}

        {/*
          FİLM ŞERİDİ — ÜÇLÜ PENCERE

          Önceki sürümde tek `<img>` parmakla kayıyordu ve yanında boş
          koyu alan kalıyordu; sonraki fotoğraf ancak bırakınca
          beliriyordu (telefon ekran görüntüsüyle bildirildi). Şeritte
          her slayt kabın genişliğinde (`w-full shrink-0`) ve şerit
          `-indeks·100% + kayma` kadar ötelenmiş: komşu slayt parmakla
          birlikte giriyor. Yüzde şeridin kendi genişliğine göre; şerit
          `inset-0` ile kabı doldurduğu için bir slayt = kabın genişliği.

          Yalnız mevcut, önceki ve sonraki slayt gerçek `<img>` taşıyor;
          ötekiler aynı genişlikte boş yer tutucu. On karelik seride on
          çözümlenmiş görseli aynı anda DOM'da tutmak gerekmiyor;
          indirme zaten `useGorselAdresleri`de tek yerde ve burada
          değişmiyor. Mevcut olmayan slaytlar `aria-hidden`: ekran
          okuyucu eskisi gibi TEK görsel duyuyor.

          Kanca bütün seriyi birlikte indirdiği için `hazir` durumunda
          haritada olmayan yol "henüz gelmedi" değil "indirilemedi"
          demek; o slayt mevcut karedeki cümlenin aynısını gösteriyor,
          iskelet ya da uydurma görsel değil.
        */}
        {gorselDurumu === 'hazir' && toplam > 0 && (
          <div
            className={`absolute inset-0 flex ${
              parmakSuruyor ? '' : 'transition-transform duration-200 motion-reduce:transition-none'
            }`}
            style={{ transform: `translateX(calc(${-indeks * 100}% + ${kayma}px))` }}
          >
            {paylasim.gorseller.map((gorsel, sira) => {
              const pencerede = Math.abs(sira - indeks) <= 1;
              const adres = pencerede ? (adresler.get(gorsel.storageYolu) ?? null) : null;
              return (
                <div
                  key={gorsel.storageYolu}
                  aria-hidden={sira !== indeks || undefined}
                  className="relative h-full w-full shrink-0"
                >
                  {pencerede && adres && (
                    <img
                      src={adres}
                      /*
                        `alt` yazarın yazdığı metin. Yazmadıysa BOŞ kalıyor:
                        "paylaşım görseli" gibi bir doldurma, ekran okuyucuya
                        içerik hakkında hiçbir şey söylemeden gürültü üretirdi.
                      */
                      alt={gorsel.alt ?? ''}
                      width={gorsel.genislik ?? undefined}
                      height={gorsel.yukseklik ?? undefined}
                      className="absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                    />
                  )}
                  {pencerede && !adres && (
                    <p className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-200">
                      Bu görsel açılamadı.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {gorselDurumu === 'hazir' && toplam === 0 && (
          <p className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-200">
            Bu paylaşımda görsel yok.
          </p>
        )}

        {/*
          Gezinme yalnız seride: tek fotoğrafta ne ok ne nokta çiziliyor.
          Oklar görselin ÜSTÜNE bindirilmiş; bağımsız eylem oldukları
          için `z-10`. İkon tek başına bilgi taşımıyor: metin `sr-only`
          olarak yanında. Sayı satırı görünür VE `aria-live`: ok tuşuyla
          geçişte okuyucu aracı da hangi karede olduğunu duyuyor. Dar
          ekranda oklar görünmediği için (`OK_DUGMESI` başlığı) sayı
          satırı ve noktalar oradaki TEK görünür gezinme ipucu; ikisi de
          kalıyor.
        */}
        {toplam > 1 && (
          <>
            <button
              type="button"
              onClick={oncekiKare}
              disabled={indeks === 0}
              className={`${OK_DUGMESI} left-2`}
            >
              <ChevronLeft aria-hidden className="h-5 w-5" />
              <span className="sr-only">Önceki</span>
            </button>
            <button
              type="button"
              onClick={sonrakiKare}
              disabled={indeks >= toplam - 1}
              className={`${OK_DUGMESI} right-2`}
            >
              <ChevronRight aria-hidden className="h-5 w-5" />
              <span className="sr-only">Sonraki</span>
            </button>
            <p
              aria-live="polite"
              className="absolute right-2 top-2 z-10 rounded-full bg-slate-950/60 px-2 py-0.5 text-xs font-semibold tabular-nums text-white"
            >
              {indeks + 1} / {toplam}
            </p>
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5"
            >
              {paylasim.gorseller.map((gorsel, sira) => (
                <span
                  key={gorsel.storageYolu}
                  className={`h-1.5 w-1.5 rounded-full ${
                    sira === indeks ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/*
        METİN VE EYLEMLER

        Diyalogda üstte tarih başlığı (sağı kapat düğmesine yer bırakıyor:
        `lg:pr-28`; düğme `min-w-11` + metin ve `right-2` kenarı), altında
        açıklama ve bilgi satırı, `flex-1` boşluk etkileşim satırını
        panelin altına itiyor. Akışta başlık yok — akışın kendi sabit
        başlığı var — ve sıra `order-*` ile şerit → eylem satırı → metin;
        boşluk da yok, blok içeriği kadar.
      */}
      <div className={diyalog ? METIN_PANELI_DIYALOG : METIN_PANELI_AKIS}>
        {diyalog && (
          <div className="border-b border-gray-100 px-3 py-2 lg:py-3 lg:pr-28">
            <p className="min-w-0 truncate text-sm font-bold text-gray-900">
              {tarih ?? 'Paylaşım'}
            </p>
          </div>
        )}

        <div className={`min-w-0 space-y-2 px-3 ${diyalog ? 'pt-3' : 'order-2 pb-3'}`}>
          {paylasim.aciklama ? (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-gray-800">
              {paylasim.aciklama}
            </p>
          ) : (
            /* Boş açıklama için başlık uydurulmuyor. */
            <p className="text-sm italic text-gray-500">Açıklama yok</p>
          )}

          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            {tarih && (
              <div className="flex gap-1">
                <dt className="font-semibold">Paylaşıldı:</dt>
                <dd>{tarih}</dd>
              </div>
            )}
            {/* Kitle satırı sahip dalının İÇİNDE; ziyaretçide DOM'a hiç girmiyor. */}
            {sahibiMi && (
              <div className="flex gap-1">
                <dt className="font-semibold">Kimler görebilir:</dt>
                <dd>{KITLE_METNI[paylasim.kitle]}</dd>
              </div>
            )}
          </dl>
        </div>

        {diyalog && <div aria-hidden className="min-h-3 flex-1" />}

        {/*
          BEĞEN VE KAYDET — DÖRT DURUM

          Yükleniyorken düğme çizilmiyor: yanlış bir `aria-pressed`
          değeri, kullanıcıya beğenmediği bir paylaşımı beğenmiş gibi
          okutur. Hata dalında da çizilmiyor ve cümle sebebini
          söylüyor; tahmin edilmiş bir durumla düğme sunmak, her
          basışta sunucunun reddedeceği bir eylem olurdu.
        */}
        <div className={`min-w-0 space-y-2 border-t border-gray-100 px-3 py-2 ${diyalog ? '' : 'order-1'}`}>
          {/*
            TEK EYLEM SATIRI: SOLDA BEĞEN/KAYDET, SAĞ UÇTA ARŞİVLE

            Arşivle bir süre açıklamanın altında kendi şeridindeydi;
            telefon ekran görüntüsüyle bildirildi: kullanıcı onu
            Instagram'daki sağ uç yer imi gibi, beğen/kaydet satırının
            SAĞINDA bekliyor. Sağa itme `ml-auto` ile; satır `flex-wrap`
            kalıyor ki dört haneli bir beğeni sayısı gelirse Arşivle
            kırpılmak yerine alt satıra, yine sağa insin.

            SIĞIYOR, KISALTILMADI — sınıf değerlerinden hesap: düğme
            genişliği = 24 (px-3) + 2 (kenar) + 16 (ikon) + 6 (gap-1.5) +
            metin; text-sm kalın Inter'de ortalama ~8,4 px/harf ile Beğen
            ≈ 90, Kaydet ≈ 98, Arşivle ≈ 107 px. İki `gap-2` ile 311 px;
            "99 beğeni" sayısı ve aralığı eklenince ≈ 380 px. Kap 390 px
            ekranda 366 px, diyalog panelinde (26rem, px-3) 392 px:
            sayısız hâlde ikisine de sığıyor, sayı gelince 390 px'te
            `flex-wrap` devreye giriyor. Bu yüzden `sr-only` kısaltma yok:
            ikonun tek başına bilgi taşımaması kuralı bozulmuyor.

            Arşivle etkileşim durumundan BAĞIMSIZ: beğeni sorgusu hata
            verdiğinde ya da yüklenirken de duruyor. Eskiden de öyleydi
            (ayrı şeritteydi); satıra taşınmak sahibin arşivleme
            yolunu ağ durumuna bağlamamalı. Skelet ve hata cümlesi
            satırın sol yarısında, Arşivle sağ uçta; yükseklik üç
            durumda da 44 px, akış zıplamıyor.
          */}
          <div className="flex flex-wrap items-center gap-2">
            {etkilesimDurumu === 'yukleniyor' && (
              <div aria-busy="true" className="flex gap-2">
                <span aria-hidden className="h-11 w-28 animate-pulse rounded-xl bg-gray-100" />
                <span aria-hidden className="h-11 w-28 animate-pulse rounded-xl bg-gray-100" />
              </div>
            )}

            {etkilesimDurumu === 'hata' && (
              <p role="alert" className="min-w-0 flex-1 text-xs leading-relaxed text-gray-600">
                Beğeni ve kayıt durumun şu anda alınamadı. Yanlış bir durum göstermemek için
                düğmeler çizilmedi.
              </p>
            )}

            {etkilesimDurumu === 'hazir' && begeniDurumu && (
              <>
                {/*
                  Etiket iki durumda da aynı: durumu `aria-pressed`
                  söylüyor. Değişen etiketli bir basılı düğme, okuyucu
                  aracında hem adı hem durumu değiştirir ve kullanıcı
                  hangisinin doğru olduğunu bilemez. İkon tek başına
                  bilgi taşımıyor; yanında metin duruyor.
                */}
                <button
                  type="button"
                  aria-pressed={begeniDurumu.begendimMi}
                  disabled={kilitli}
                  onClick={begeniyiCevir}
                  className={etkilesimSinifi(begeniDurumu.begendimMi)}
                >
                  <Heart
                    aria-hidden
                    className={`h-4 w-4 ${begeniDurumu.begendimMi ? 'fill-current' : ''}`}
                  />
                  Beğen
                </button>

                <button
                  type="button"
                  aria-pressed={kaydettimMi}
                  disabled={kilitli}
                  onClick={kaydiCevir}
                  className={etkilesimSinifi(kaydettimMi)}
                >
                  <Bookmark
                    aria-hidden
                    className={`h-4 w-4 ${kaydettimMi ? 'fill-current' : ''}`}
                  />
                  Kaydet
                </button>

                {/*
                  Sayı GERÇEK satırlardan; sıfırken hiç yazılmıyor.
                  "0 beğeni" yazmak yanlış olmazdı ama her paylaşımın
                  altına bir sıfır basmak, olmayan bir yarışı görünür
                  kılardı. Kaydetme sayısı burada da yok: sunucu kimin
                  kaydettiğini vermiyor.
                */}
                {begeniDurumu.adet > 0 && (
                  <p className="text-xs font-semibold tabular-nums text-gray-700">
                    {begeniDurumu.adet} beğeni
                  </p>
                )}
              </>
            )}

            {/*
              ARŞİVLEME SAHİBE ÖZEL VE İKİ ADIMLI

              Tek dokunuşla arşivlemek geri dönüşü olmayan bir kaza olurdu:
              arşivden çıkarma akışı D'de YOK, yani arşivlenen paylaşım
              arayüzden geri getirilemiyor. İkinci adım bunu bir karara
              çeviriyor. Cümle de bunu söylüyor — "sonra geri alırsın" gibi
              bir vaat verilmiyor. Soru açıkken düğme satırdan kalkıyor ve
              soru aşağıdaki blokta; aynı anda hem "Arşivle" hem "Evet,
              arşivle" görünseydi ikisi de aynı işi yapan iki düğme olurdu.

              Sahip dalı: ziyaretçide DOM'a hiç girmiyor, CSS ile gizlenmiyor.
              KALICI SİLME DÜĞMESİ YOK: sunucuda da yalnız taslak silinebiliyor.
            */}
            {sahibiMi && arsivAsamasi === 'kapali' && (
              <button
                type="button"
                onClick={() => setArsivAsamasi('soruluyor')}
                className={`${DUGME} ml-auto`}
              >
                <Archive aria-hidden className="h-4 w-4" />
                Arşivle
              </button>
            )}
          </div>

          {etkilesimDurumu === 'hazir' && etkilesimHatasi && (
            <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
              {etkilesimHatasi}
            </p>
          )}

          {sahibiMi && arsivAsamasi !== 'kapali' && (
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-gray-700">
                Arşivlenen paylaşım profilinden kalkıyor ve kimseye görünmüyor. Bu ekrandan
                geri getirme yolu yok.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={arsivle}
                  disabled={arsivAsamasi === 'gonderiliyor'}
                  className={DUGME}
                >
                  <Archive aria-hidden className="h-4 w-4" />
                  {arsivAsamasi === 'gonderiliyor' ? 'Arşivleniyor…' : 'Evet, arşivle'}
                </button>
                <button
                  type="button"
                  onClick={() => setArsivAsamasi('kapali')}
                  disabled={arsivAsamasi === 'gonderiliyor'}
                  className={DUGME}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}

          {sahibiMi && arsivHatasi && (
            <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
              {arsivHatasi}
            </p>
          )}
        </div>
      </div>
    </>
  );
};
