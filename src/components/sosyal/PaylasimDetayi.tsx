import React from 'react';
import { createPortal } from 'react-dom';
import { Archive, Bookmark, ChevronLeft, ChevronRight, Heart, X } from 'lucide-react';
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
 * PAYLAŞIM AYRINTISI
 *
 * Karta basınca açılan katman. Ayrı bir ROTA değil, çünkü paylaşımın
 * kalıcı adresi yok: `/paylasim/:id` gibi bir yol ne App'te tanımlı ne
 * de sunucuda karşılığı var. Olmayan bir adrese `<a href>` yazmak, orta
 * tuşla açıldığında 404 veren bir bağlantı üretirdi; bu yüzden kartın
 * kendisi `<button>` ve ayrıntı bir `dialog`.
 *
 * BEĞENİ VE KAYDETME ARTIK VAR — SAYILARI FARKLI
 * ----------------------------------------------
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

const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const DUGME = `inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

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

interface DetayProps {
  paylasim: SosyalPaylasim;
  /** Sahip dalı ile ziyaretçi dalı AYRI yetki durumu; arşiv yalnız sahibinde. */
  sahibiMi: boolean;
  /**
   * Katmanı açan kart.
   *
   * Odak kapanışta buraya dönüyor. Referans olmasaydı odak belgenin
   * köküne düşer ve klavye kullanıcısı ızgaranın başına savrulurdu —
   * ProfilAyarMenusu'nda ölçülen davranışın aynısı.
   */
  tetikleyici: HTMLElement | null;
  onKapat: () => void;
  /** Arşivleme başarılı olduğunda listeyi tazeleyen çağrı. */
  onArsivlendi?: () => void;
}

export const PaylasimDetayi: React.FC<DetayProps> = ({
  paylasim,
  sahibiMi,
  tetikleyici,
  onKapat,
  onArsivlendi,
}) => {
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

  const panelRef = React.useRef<HTMLDivElement>(null);
  const kapatDugmesiRef = React.useRef<HTMLButtonElement>(null);
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

    GEÇİŞ ANİMASYONU YALNIZ YERİNE DÖNÜŞTE (`yumusakDonus`)

    Parmak sürerken görsel gecikmesiz izliyor (geçiş sınıfı yok); eşiğin
    altında bırakınca 200 ms'de yerine dönüyor. Kare DEĞİŞTİĞİNDE
    animasyon YOK: kayma -60 px'ten 0'a animasyonla dönseydi YENİ
    fotoğraf soldan girer gibi görünürdü, oysa sağdan gelmesi gerekir.

    Bu yüzden geçiş sınıfı "kareyi yeni değiştirdim" diye bir etkiyle
    KAPATILMIYOR, tersine yalnız yerine dönüş anında AÇILIYOR ve bir
    sonraki dokunuşta kapanıyor. Etkiyle kapatmak güvenilir değildi:
    React ayrık olaylardan (pointerup) doğan etkileri boyamadan önce
    eşzamanlı akıtıyor; iki DOM yazımı tek stil hesabına düşünce tarayıcı
    "geçiş sınıfı var, transform -60'tan 0'a değişti" görüp animasyonu
    yine başlatırdı. Kare zamanlayıcısı bu dosyada yasak (açılış odağı
    testi), zorla yeniden akış ise ölçüsüz bir hile olurdu.
  */
  const surukleme = React.useRef<{
    kimlik: number;
    x: number;
    y: number;
    yon: 'belirsiz' | 'yatay' | 'dikey';
  } | null>(null);
  const [kayma, setKayma] = React.useState(0);
  const [yumusakDonus, setYumusakDonus] = React.useState(false);

  const surukleBasla = (olay: React.PointerEvent<HTMLDivElement>) => {
    if (olay.pointerType !== 'touch' || toplam <= 1) return;
    if ((olay.target as HTMLElement).closest('button')) return;
    surukleme.current = { kimlik: olay.pointerId, x: olay.clientX, y: olay.clientY, yon: 'belirsiz' };
    setYumusakDonus(false);
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
    if (baslangic.yon !== 'yatay') return;
    const karar = gezinmeKarari({ dx: olay.clientX - baslangic.x, indeks, toplam });
    setKayma(0);
    if (karar === 'sonraki') sonrakiKare();
    else if (karar === 'onceki') oncekiKare();
    else setYumusakDonus(true);
  };

  /* `pointercancel` (tarayıcı hareketi devraldı): kare değişmiyor, görsel yerine dönüyor. */
  const surukleIptal = (olay: React.PointerEvent<HTMLDivElement>) => {
    const baslangic = surukleme.current;
    if (!baslangic || baslangic.kimlik !== olay.pointerId) return;
    surukleme.current = null;
    setKayma(0);
    setYumusakDonus(true);
  };

  /*
    KAPANIŞTA ÖNCE ODAK, SONRA KAPATMA

    ÖLÇÜLDÜ (1440x900, gerçek oturum): kart odaklanıp tıklandı, katman
    açıldı (odak "Kapat" düğmesinde), Escape'e basıldı. Escape sonrası
    `document.activeElement === document.body` = true; açan kart hâlâ
    DOM'daydı ama odak ona dönmedi.

    Sebep sıralama: odak kapanış anında katmanın İÇİNDEYDİ. Durum
    değişimi önce koşunca katman sökülüyor, odaklı düğüm belgeden
    kalkıyor ve tarayıcı odağı `body`'ye alıyor; bu sıfırlama
    sökülmeden SONRA planlanmış bir çağrıdan bağımsız gerçekleşiyor.
    Katman açılışı düzeltilmeden önce odak zaten kartta kalıyordu, o
    yüzden dönüş de görünürde çalışıyordu.

    ÇÖZÜM: odak, kaldırılacak ağacın DIŞINA `onKapat`'tan ÖNCE
    taşınıyor. Sökme anında odaklı düğüm kartın kendisi oluyor, yani
    tarayıcının sıfırlayacağı bir odak kalmıyor. Çağrı senkron: araya
    kare ya da zamanlayıcı girmediği için StrictMode'un
    mount → cleanup → mount sırası da onu düşüremiyor — açılış odağında
    ölçülen tuzağın aynısı burada da kapanıyor.
  */
  const kapat = React.useCallback(() => {
    tetikleyici?.focus();
    onKapat();
  }, [onKapat, tetikleyici]);

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
  */
  const yollar = React.useMemo(
    () => paylasim.gorseller.map((gorsel) => gorsel.storageYolu),
    [paylasim.gorseller],
  );
  const { durum: gorselDurumu, adresler } = useGorselAdresleri(SOSYAL_PAYLASIM_KOVASI, yollar);

  React.useEffect(() => {
    const tusaBas = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') {
        olay.preventDefault();
        kapat();
        return;
      }
      /*
        Ok tuşları seride gezinme. Sağ/sol, düğmelerin ekrandaki
        yerleşimiyle aynı yönde; klavye kullanıcısı düğmelere tab'layıp
        Enter'a basmak zorunda kalmıyor.
      */
      if (olay.key === 'ArrowRight') {
        sonrakiKare();
        return;
      }
      if (olay.key === 'ArrowLeft') {
        oncekiKare();
        return;
      }
      if (olay.key !== 'Tab') return;

      /*
        ODAK TUZAĞI

        Katman `aria-modal`: arkasındaki sayfa erişilebilir değil. Tuzak
        olmasaydı Tab odağı katmanın altındaki ızgaraya taşır ve klavye
        kullanıcısı görmediği bir yerde gezerdi. Kalıp
        ProfilAyarMenusu'ndaki ile aynı; ikinci bir tuzak yazılmadı.
      */
      const panel = panelRef.current;
      if (!panel) return;
      const odaklanabilirler = Array.from(
        panel.querySelectorAll<HTMLElement>(ODAKLANABILIR),
      ).filter((oge) => oge.getClientRects().length > 0);
      if (odaklanabilirler.length === 0) return;

      const ilk = odaklanabilirler[0];
      const son = odaklanabilirler[odaklanabilirler.length - 1];
      const aktif = document.activeElement as HTMLElement | null;

      if (olay.shiftKey && (aktif === ilk || !panel.contains(aktif))) {
        olay.preventDefault();
        son.focus();
      } else if (!olay.shiftKey && (aktif === son || !panel.contains(aktif))) {
        olay.preventDefault();
        ilk.focus();
      }
    };

    document.addEventListener('keydown', tusaBas);
    return () => document.removeEventListener('keydown', tusaBas);
  }, [kapat, oncekiKare, sonrakiKare]);

  /*
    AÇILIŞTA ODAK KATMANIN İÇİNE ALINIYOR

    ÖLÇÜLDÜ (gerçek oturum, katman açıldıktan hemen sonra):
    `panel.contains(document.activeElement)` = false — odak katmanı açan
    paylaşım kartında kalıyordu. `aria-modal` bir katmanda odak içeri
    alınmazsa Tab arka plandaki ızgaraya kaçar ve klavye kullanıcısı
    katmanın açıldığını hiç fark etmez.

    NEDEN rAF DEĞİL: odak bir süre `requestAnimationFrame` içinde
    veriliyordu ve gerçek tarayıcıda HİÇ taşınmadı. ÖLÇÜLDÜ (1440x900,
    gerçek oturum): katman açıldıktan sonra 16 ms aralıkla 1,5 sn boyunca
    `document.activeElement` izlendi, tek kayıt kartın kendisi; kapatma
    düğmesi hiç odak almadı. Uygulama StrictMode ile çalışıyor, etki
    mount → cleanup → mount sırasıyla iki kez koşuyor ve cleanup'taki
    `cancelAnimationFrame` planlanan kareyi düşürüyor. İptali olmayan tek
    bir çağrı bu sıradan etkilenmiyor.

    NEDEN `useLayoutEffect`: portalın çocukları da DOM'a işlendikten
    SONRA, tarayıcı boyamadan ÖNCE koşuyor — `kapatDugmesiRef.current`
    dolu oluyor ve araya bir kare girmediği için odak gecikmiyor.
    `focus()` aynı öğeye ikinci kez uygulandığında bir şey değiştirmiyor;
    StrictMode'un çift çağrısı zararsız. `autoFocus` yerine bu seçildi:
    açılışın tek seferlik olduğu bağımlılık dizisinden okunuyor ve seride
    gezinirken düğme odağı geri istemiyor.

    HEDEF KAPATMA DÜĞMESİ: katmandan çıkışın klavyedeki karşılığı
    (Escape) görünür bir düğme olarak da ilk sırada eline geliyor.

    YALNIZ AÇILIŞTA (boş bağımlılık dizisi): seride gezinirken ya da
    arşiv sorusu açılırken odak kullanıcının bulunduğu yerden çalınmıyor.
  */
  React.useLayoutEffect(() => {
    kapatDugmesiRef.current?.focus();
  }, []);

  /*
    İki sorgu birlikte gidiyor: ikisi de aynı ekranın aynı satırını
    besliyor ve biri gelip öteki beklerken yarım bir şerit çizmek,
    kullanıcıya "kaydet" düğmesinin durumunu bilmeden bastırırdı.
  */
  React.useEffect(() => {
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
  }, [paylasim.id]);

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
      onArsivlendi?.();
      kapat();
    } catch (sorun) {
      setArsivHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'Paylaşım arşivlenemedi. Paylaşımında bir değişiklik olmadı.',
      );
      setArsivAsamasi('soruluyor');
    }
  };

  const gecerliGorsel = paylasim.gorseller[Math.min(indeks, Math.max(toplam - 1, 0))] ?? null;
  const gecerliAdres = gecerliGorsel ? (adresler.get(gecerliGorsel.storageYolu) ?? null) : null;
  const tarih = tarihMetni(paylasim.olusturmaAni);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Paylaşımı kapat"
        onClick={kapat}
        className="fixed inset-0 h-full w-full cursor-default touch-none bg-slate-950/60"
      />
      {/*
        İKİ PANEL: SOLDA FOTOĞRAF, SAĞDA METİN

        Küçük ekranda tek sütun: 4:5 görsel tam genişlikte, altında metin;
        kabın kendisi dikey kayıyor. lg ve üstünde yan yana: kap
        `min(100%, 68.75rem)` genişlik ve `90vh` yükseklik; sol panel
        kabın %60'ı ve yüksekliğin tamamı, sağ panel kalan %40 ve YALNIZ o
        panel kayıyor — fotoğraf kaydırmayla birlikte gitmiyor.

        Yatay kaydırma hiçbir dalda açılmıyor: uzun açıklama `break-words`
        ile sarıyor, görsel kendi panelinin içinde `object-cover` ile
        kırpılıyor.
      */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paylaşım ayrıntısı"
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-[min(100%,44rem)] flex-col overflow-y-auto rounded-t-[2rem] border border-gray-200 bg-white shadow-[0_-20px_50px_rgba(15,23,42,0.24)] sm:rounded-2xl lg:h-[90vh] lg:max-h-[90vh] lg:w-[min(100%,68.75rem)] lg:flex-row lg:overflow-hidden"
      >
        {/*
          KAPAT TEK DÜĞME, İKİ YER

          Dar ekranda kabın en üstünde kendi şeridinde; geniş ekranda kabın
          sağ üst köşesine bindirilmiş. Aynı düğüm: odak referansı ve
          açılış odağı tek yere bakıyor, iki ayrı düğme iki ayrı odak
          hedefi doğururdu.
        */}
        <div className="flex shrink-0 items-center justify-end border-b border-gray-100 px-3 py-2 lg:absolute lg:right-2 lg:top-2 lg:z-20 lg:border-0 lg:p-0">
          <button type="button" ref={kapatDugmesiRef} onClick={kapat} className={DUGME}>
            <X aria-hidden className="h-4 w-4" />
            Kapat
          </button>
        </div>

        {/*
          SOL PANEL — GÖRSEL

          Zemin koyu nötr: `object-cover` ile kırpılan fotoğrafın kenarında
          boşluk kalmıyor ama yükleme ve hata dallarında panel boş; koyu
          zemin o boşluğu "fotoğraf alanı" olarak okutuyor. Renk depodaki
          katman perdesiyle aynı aile (`slate-950`), yeni ton yok.
        */}
        <div
          className="relative aspect-[4/5] w-full shrink-0 touch-pan-y overflow-hidden bg-slate-950 lg:aspect-auto lg:h-full lg:w-[60%]"
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

          {gorselDurumu === 'hazir' && gecerliGorsel && gecerliAdres && (
            <img
              src={gecerliAdres}
              /*
                `alt` yazarın yazdığı metin. Yazmadıysa BOŞ kalıyor:
                "paylaşım görseli" gibi bir doldurma, ekran okuyucuya
                içerik hakkında hiçbir şey söylemeden gürültü üretirdi.
              */
              alt={gecerliGorsel.alt ?? ''}
              width={gecerliGorsel.genislik ?? undefined}
              height={gecerliGorsel.yukseklik ?? undefined}
              className={`absolute inset-0 h-full w-full object-cover ${
                yumusakDonus ? 'transition-transform duration-200 motion-reduce:transition-none' : ''
              }`}
              style={{ transform: `translateX(${kayma}px)` }}
              draggable={false}
            />
          )}

          {gorselDurumu === 'hazir' && gecerliGorsel && !gecerliAdres && (
            <p className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-200">
              Bu görsel açılamadı.
            </p>
          )}

          {gorselDurumu === 'hazir' && !gecerliGorsel && (
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
          SAĞ PANEL — METİN VE EYLEMLER

          Üstte tarih başlığı, altında açıklama ve bilgi satırı; `flex-1`
          boşluk etkileşim satırını panelin altına itiyor. Geniş ekranda
          başlığın sağı kapat düğmesine yer bırakıyor (`lg:pr-28`; düğme
          `min-w-11` + metin ve `right-2` kenarı).
        */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-y-auto">
          <div className="border-b border-gray-100 px-3 py-2 lg:py-3 lg:pr-28">
            <p className="min-w-0 truncate text-sm font-bold text-gray-900">
              {tarih ?? 'Paylaşım'}
            </p>
          </div>

          <div className="min-w-0 space-y-2 px-3 pt-3">
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

          <div aria-hidden className="min-h-3 flex-1" />

          {/*
            BEĞEN VE KAYDET — DÖRT DURUM

            Yükleniyorken düğme çizilmiyor: yanlış bir `aria-pressed`
            değeri, kullanıcıya beğenmediği bir paylaşımı beğenmiş gibi
            okutur. Hata dalında da çizilmiyor ve cümle sebebini
            söylüyor; tahmin edilmiş bir durumla düğme sunmak, her
            basışta sunucunun reddedeceği bir eylem olurdu.
          */}
          <div className="min-w-0 border-t border-gray-100 px-3 py-2">
            {etkilesimDurumu === 'yukleniyor' && (
              <div aria-busy="true" className="flex gap-2">
                <span aria-hidden className="h-11 w-28 animate-pulse rounded-xl bg-gray-100" />
                <span aria-hidden className="h-11 w-28 animate-pulse rounded-xl bg-gray-100" />
              </div>
            )}

            {etkilesimDurumu === 'hata' && (
              <p role="alert" className="text-xs leading-relaxed text-gray-600">
                Beğeni ve kayıt durumun şu anda alınamadı. Yanlış bir durum göstermemek için
                düğmeler çizilmedi.
              </p>
            )}

            {etkilesimDurumu === 'hazir' && begeniDurumu && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
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
                </div>

                {etkilesimHatasi && (
                  <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
                    {etkilesimHatasi}
                  </p>
                )}
              </div>
            )}
          </div>

          {/*
            ARŞİVLEME SAHİBE ÖZEL VE İKİ ADIMLI

            Tek dokunuşla arşivlemek geri dönüşü olmayan bir kaza olurdu:
            arşivden çıkarma akışı D'de YOK, yani arşivlenen paylaşım
            arayüzden geri getirilemiyor. İkinci adım bunu bir karara
            çeviriyor. Cümle de bunu söylüyor — "sonra geri alırsın" gibi
            bir vaat verilmiyor.

            KALICI SİLME DÜĞMESİ YOK: sunucuda da yalnız taslak silinebiliyor.
          */}
          {sahibiMi && (
            <div className="space-y-2 border-t border-gray-100 px-3 py-2">
              {arsivAsamasi === 'kapali' ? (
                <button
                  type="button"
                  onClick={() => setArsivAsamasi('soruluyor')}
                  className={DUGME}
                >
                  <Archive aria-hidden className="h-4 w-4" />
                  Arşivle
                </button>
              ) : (
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
              {arsivHatasi && (
                <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
                  {arsivHatasi}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
