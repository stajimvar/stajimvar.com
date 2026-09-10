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
        setIndeks((onceki) => Math.min(onceki + 1, Math.max(toplam - 1, 0)));
        return;
      }
      if (olay.key === 'ArrowLeft') {
        setIndeks((onceki) => Math.max(onceki - 1, 0));
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
  }, [kapat, toplam]);

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
        GENİŞLİK EKRANDAN ASLA TAŞMIYOR

        Kap `w-[min(100%,44rem)]`: dar ekranda yüzde, geniş ekranda sabit
        tavan. Yükseklik `max-h-[92vh]` ve içerik DİKEY kayıyor. Yatay
        kaydırma hiçbir dalda açılmıyor; uzun açıklama `break-words` ile
        sarıyor, görsel `max-w-full` ile kabına giriyor.
      */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paylaşım ayrıntısı"
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-[min(100%,44rem)] flex-col overflow-hidden rounded-t-[2rem] border border-gray-200 bg-white shadow-[0_-20px_50px_rgba(15,23,42,0.24)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
          <p className="min-w-0 truncate text-sm font-bold text-gray-900">
            {tarih ?? 'Paylaşım'}
          </p>
          <button type="button" ref={kapatDugmesiRef} onClick={kapat} className={DUGME}>
            <X aria-hidden className="h-4 w-4" />
            Kapat
          </button>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="bg-gray-50">
            {gorselDurumu === 'yukleniyor' && (
              <div aria-busy="true" className="flex h-64 items-center justify-center">
                <span aria-hidden className="h-24 w-24 animate-pulse rounded-2xl bg-gray-200" />
              </div>
            )}

            {/*
              "Görsel alınamadı" ile "görsel yok" AYRI cümleler: birincisi
              geçici bir sorun, ikincisi paylaşımın kendisi hakkında bir
              iddia. İkisini aynı metne indirmek, dosyası duran bir
              paylaşımı boş göstermek olurdu.
            */}
            {gorselDurumu === 'hata' && (
              <p role="alert" className="px-3 py-10 text-center text-sm text-gray-600">
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
                className="mx-auto max-h-[60vh] w-auto max-w-full object-contain"
              />
            )}

            {gorselDurumu === 'hazir' && gecerliGorsel && !gecerliAdres && (
              <p className="px-3 py-10 text-center text-sm text-gray-600">
                Bu görsel açılamadı.
              </p>
            )}

            {gorselDurumu === 'hazir' && !gecerliGorsel && (
              <p className="px-3 py-10 text-center text-sm text-gray-600">
                Bu paylaşımda görsel yok.
              </p>
            )}
          </div>

          {/* Gezinme yalnız seride: tek fotoğrafta düğmeler hiç çizilmiyor. */}
          {toplam > 1 && (
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setIndeks((onceki) => Math.max(onceki - 1, 0))}
                disabled={indeks === 0}
                className={DUGME}
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
                Önceki
              </button>
              <p aria-live="polite" className="text-xs font-semibold tabular-nums text-gray-700">
                {indeks + 1} / {toplam}
              </p>
              <button
                type="button"
                onClick={() => setIndeks((onceki) => Math.min(onceki + 1, toplam - 1))}
                disabled={indeks >= toplam - 1}
                className={DUGME}
              >
                Sonraki
                <ChevronRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="min-w-0 space-y-2 px-3 pb-3 pt-1">
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

            {/*
              BEĞEN VE KAYDET — DÖRT DURUM

              Yükleniyorken düğme çizilmiyor: yanlış bir `aria-pressed`
              değeri, kullanıcıya beğenmediği bir paylaşımı beğenmiş gibi
              okutur. Hata dalında da çizilmiyor ve cümle sebebini
              söylüyor; tahmin edilmiş bir durumla düğme sunmak, her
              basışta sunucunun reddedeceği bir eylem olurdu.
            */}
            {etkilesimDurumu === 'yukleniyor' && (
              <div aria-busy="true" className="flex gap-2 pt-1">
                <span aria-hidden className="h-11 w-28 animate-pulse rounded-xl bg-gray-100" />
                <span aria-hidden className="h-11 w-28 animate-pulse rounded-xl bg-gray-100" />
              </div>
            )}

            {etkilesimDurumu === 'hata' && (
              <p role="alert" className="pt-1 text-xs leading-relaxed text-gray-600">
                Beğeni ve kayıt durumun şu anda alınamadı. Yanlış bir durum göstermemek için
                düğmeler çizilmedi.
              </p>
            )}

            {etkilesimDurumu === 'hazir' && begeniDurumu && (
              <div className="space-y-2 pt-1">
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
    </div>,
    document.body,
  );
};
