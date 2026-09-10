import React from 'react';
import {
  begendiklerimiGetir,
  kaydedilenleriGetir,
  paylasimiGeriYukle,
  paylasimlariGetir,
  type SosyalPaylasim,
} from '../../lib/queries/sosyal';
import { geriYuklemeOdagi } from '../../lib/sosyal-etkilesim.mjs';
import { PaylasimIzgarasi } from './PaylasimIzgarasi';

/**
 * SAHİBİN KENDİ LİSTELERİ — BEĞENDİKLERİM, KAYDEDİLENLER, ARŞİV
 *
 * ÜÇÜ DE YALNIZ OTURUM SAHİBİNİN LİSTESİ
 * --------------------------------------
 * Başkasının beğendiklerine, kaydettiklerine ya da arşivine giden bir yol
 * arayüzde yok ve sunucuda da yok: `post_saves` politikası
 * `using (user_id = auth.uid())`, `post_likes` listesi `user_id`e
 * bağlanıyor, arşiv satırı ise yalnız `author_id = auth.uid()` dalından
 * dönüyor (20260925010000). Ekran bu yüzden hedef kimliği PARAMETRE
 * ALMIYOR; alsaydı, gizlemekle güvenlik sınırı çizdiğimizi sanırdık.
 *
 * TEK BİLEŞEN, ÜÇ KİP
 * -------------------
 * Üç ekran da aynı ızgarayı, aynı ayrıntı katmanını ve aynı dört durumu
 * kullanıyor. Üç kopya olsaydı biri değiştiğinde ötekiler geride kalır ve
 * aynı üründe üç farklı kart ölçüsü çıkardı. Değişen tek şey: hangi
 * sorgu, hangi başlık, hangi boş cümle ve kartın altında eylem olup
 * olmadığı.
 *
 * IZGARA YENİDEN KULLANILIYOR: `PaylasimIzgarasi` yükleme iskeletini,
 * hata cümlesini ve ayrıntı katmanını zaten çiziyor. Buradaki tek ek,
 * arşive özel kart altı eylemi ve onun odak sırası.
 */

export type ListeKipi = 'begeni' | 'kayit' | 'arsiv';

interface ListeProps {
  kip: ListeKipi;
  /**
   * OTURUM kimliği.
   *
   * Yalnız arşiv sorgusunda kullanılıyor (`paylasimlariGetir` yazarı
   * parametre alıyor). Değer sayfanın oturum durumundan geliyor; adresteki
   * kullanıcı adından kimlik TÜRETİLMİYOR. Yanlış bir kimlik geçse bile
   * sunucu başkasının arşivini vermiyor.
   */
  kullaniciId: string;
  /** Geri yükleme profil ızgarasını ve sayacı değiştiriyor; sayfa tazeliyor. */
  onGeriYuklendi?: () => void;
}

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

/*
  BOŞ CÜMLELER KİPE GÖRE AYRI

  "Henüz paylaşım yok" bu üç ekranda da yanlış olurdu. Beğeni ve kayıt
  listelerinde satır duruyor olabilir ama paylaşım artık okunmuyor
  (arşivlenmiş, kitlesi daralmış, bağlantı kalkmış, engel eklenmiş);
  cümle bunu saklamıyor. Arşivde ise sahibi kendi satırlarının HEPSİNİ
  görüyor, orada boşluk gerçekten boşluk.

  Ne kadar paylaşımın elendiği YAZILMIYOR: o sayı, karşı tarafın
  kararları hakkında bir çıkarım yaptırırdı.
*/
const METINLER: Record<
  ListeKipi,
  { baslik: string; bos: string; aciklama?: string }
> = {
  begeni: {
    baslik: 'Beğendiklerim',
    bos: 'Şu anda görüntülenebilen bir beğenin yok. Beğendiğin bir paylaşım sonradan arşivlenmiş ya da sana kapanmışsa bu listede olmaz.',
  },
  kayit: {
    baslik: 'Kaydedilenler',
    bos: 'Şu anda görüntülenebilen bir kaydın yok. Kaydettiğin bir paylaşım sonradan arşivlenmiş ya da sana kapanmışsa bu listede olmaz.',
    aciklama: 'Kaydettiklerini yalnızca sen görüyorsun; paylaşımın sahibi bile göremiyor.',
  },
  arsiv: {
    baslik: 'Arşiv',
    bos: 'Arşivinde paylaşım yok.',
    aciklama:
      'Arşivdeki paylaşımlar profilinde görünmüyor ve kimseye açılmıyor. Geri yüklediğinde kitlesi ve fotoğraf sırası değişmeden geri geliyor.',
  },
};

export const SahipListesi: React.FC<ListeProps> = ({ kip, kullaniciId, onGeriYuklendi }) => {
  const [paylasimlar, setPaylasimlar] = React.useState<SosyalPaylasim[]>([]);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [deneme, setDeneme] = React.useState(0);

  const [geriYuklenenId, setGeriYuklenenId] = React.useState<string | null>(null);
  const [geriYuklemeHatasi, setGeriYuklemeHatasi] = React.useState<string | null>(null);

  /* Kilit `ref`te: iki hızlı tıklama aynı karede iki istek üretmesin. */
  const kilitRef = React.useRef(false);

  const baslikRef = React.useRef<HTMLHeadingElement>(null);
  const kapRef = React.useRef<HTMLDivElement>(null);
  /* Kart listeden kalktıktan SONRA uygulanacak odak; bkz. aşağıdaki etki. */
  const [odakHedefi, setOdakHedefi] = React.useState<{
    hedef: 'kart' | 'baslik';
    id: string | null;
  } | null>(null);

  const metin = METINLER[kip];

  React.useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    const istek =
      kip === 'arsiv'
        ? paylasimlariGetir(kullaniciId, { arsiv: true })
        : kip === 'begeni'
          ? begendiklerimiGetir()
          : kaydedilenleriGetir();

    istek
      .then((liste) => {
        if (iptal) return;
        setPaylasimlar(liste);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });

    return () => {
      iptal = true;
    };
  }, [kip, kullaniciId, deneme]);

  /**
   * Geri yükle — İYİMSER DEĞİL.
   *
   * Kart, sunucu `archived_at = null` yazmayı KABUL ETTİKTEN sonra
   * ızgaradan kalkıyor. Tersi olsaydı, reddedilen bir istekten sonra
   * paylaşım arşivde durduğu hâlde ekrandan kaybolur ve kullanıcı onu
   * profilinde arardı.
   *
   * Odak hedefi kart kalkmadan ÖNCE hesaplanıyor: listeden çıktıktan
   * sonra sırasını sormak artık mümkün değil.
   */
  const geriYukle = async (paylasim: SosyalPaylasim) => {
    if (kilitRef.current) return;
    kilitRef.current = true;
    setGeriYuklenenId(paylasim.id);
    setGeriYuklemeHatasi(null);
    try {
      await paylasimiGeriYukle(paylasim.id);
      const hedef = geriYuklemeOdagi(
        paylasimlar.map((satir) => satir.id),
        paylasim.id,
      );
      setPaylasimlar((onceki) => onceki.filter((satir) => satir.id !== paylasim.id));
      setOdakHedefi(hedef);
      /* Profil ızgarası ve "Paylaşım" sayacı da değişti; sayfa yeniden okuyor. */
      onGeriYuklendi?.();
    } catch {
      /*
        Sunucunun kendi metni yazılmıyor: PostgREST cümlesi kullanıcıya
        ne olduğunu anlatmıyor. Cümle iki şeyi söylüyor — iş olmadı ve
        paylaşım hâlâ arşivde. Kart da ızgaradan kalkmıyor.
      */
      setGeriYuklemeHatasi('Paylaşım geri yüklenemedi; arşivinde duruyor.');
    } finally {
      kilitRef.current = false;
      setGeriYuklenenId(null);
    }
  };

  /*
    ODAK, KART SÖKÜLDÜKTEN SONRA VE BOYAMADAN ÖNCE TAŞINIYOR

    Geri yüklenen kartın düğmesi DOM'dan kalkıyor; odaklı düğüm belgeden
    kalktığında tarayıcı odağı `body`'ye alıyor — aynı sıfırlama
    `PaylasimDetayi` kapanışında ölçülmüştü. Klavye kullanıcısı arşivin
    başına savrulur, kaldığı yeri kaybederdi.

    `useLayoutEffect` seçildi, `requestAnimationFrame` DEĞİL: aynı
    ekranda ölçülen tuzak, StrictMode'un mount → cleanup → mount
    sırasında `cancelAnimationFrame`in planlanan kareyi düşürmesiydi.
    Etki listenin YENİ hâliyle koşuyor, yani hedef kart artık kesin
    yerinde.

    Hedef bulunamazsa başlığa düşülüyor: yanlış bir karta odaklanmak,
    kullanıcıyı ilgisiz bir yere götürürdü.
  */
  React.useLayoutEffect(() => {
    if (!odakHedefi) return;
    if (odakHedefi.hedef === 'kart' && odakHedefi.id) {
      const kart = kapRef.current?.querySelector<HTMLElement>(
        `[data-paylasim-kimligi="${odakHedefi.id}"]`,
      );
      if (kart) {
        kart.focus();
        setOdakHedefi(null);
        return;
      }
    }
    baslikRef.current?.focus();
    setOdakHedefi(null);
  }, [odakHedefi]);

  return (
    <div ref={kapRef} className="space-y-3">
      {/*
        BAŞLIK ODAK ALABİLİYOR, TAB SIRASINA GİRMİYOR

        `tabIndex={-1}` tam olarak bunun için: son kart da kalktığında
        odağın gideceği bir yer kalıyor, ama normal Tab gezintisinde
        fazladan bir durak açılmıyor.
      */}
      <h1
        ref={baslikRef}
        tabIndex={-1}
        className="text-lg font-extrabold tracking-tight text-gray-900 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:text-xl"
      >
        {metin.baslik}
      </h1>

      {metin.aciklama && (
        <p className="text-sm leading-relaxed text-gray-600">{metin.aciklama}</p>
      )}

      {geriYuklemeHatasi && (
        <p role="alert" className={`${KART} text-sm font-semibold text-rose-700`}>
          {geriYuklemeHatasi}
        </p>
      )}

      {/*
        SAHİBE ÖZEL EYLEMLER AYRINTI KATMANINDA ÇİZİLMİYOR

        `sahibiMi` bayrağı ayrıntı katmanında iki şeyi açıyor: kitle
        satırı ve "Arşivle". Arşiv ekranında ikisi de yanlış olurdu —
        paylaşım ZATEN arşivde, yeniden arşivleme her basışta
        reddedilecek bir eylem; "Kimler görebilir: Bağlantılarım" ise şu
        anda kimsenin görmediği bir kayıt için doğru olmayan bir cümle.
        Geri yükleme eylemi kartın altında, ızgarada duruyor.

        Beğendiklerim ve Kaydedilenler'de paylaşımların çoğu BAŞKASININ:
        orada sahibe özel eylem zaten çizilemez.
      */}
      <PaylasimIzgarasi
        paylasimlar={paylasimlar}
        durum={durum}
        onYenidenDene={() => setDeneme((sayi) => sayi + 1)}
        sahibiMi={false}
        bosMetni={metin.bos}
        onGeriYukle={kip === 'arsiv' ? geriYukle : undefined}
        geriYuklenenId={geriYuklenenId}
      />
    </div>
  );
};
