import React from 'react';
import { ArrowRight, BadgeCheck, Lock, Plus, ShieldCheck, Users } from 'lucide-react';
import { listingSlug } from '../lib/slug';
import {
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_KENAR_VURGU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { SirketAdayProfili } from './SirketAdayProfili';
import { SirketAdaylar } from './SirketAdaylar';
import { IlanFormu } from './IlanFormu';
import { AdayIzgarasi } from './AdayIzgarasi';
import type { GuncelProfilYukleyici, Iletisim, PaylasimYukleyici } from './AdayCekmecesi';
import { GenelBakis } from './GenelBakis';
import { IlanSiralamasi } from './IlanSiralamasi';
import { CikisDugmesi, SirketProfili } from './SirketProfili';
import type { AdayOzeti } from './IlanKarti';
import { KADEME, adayGorebilir } from '../lib/sirket-kademe.mjs';
import { kartVerisi } from '../lib/aday-kart.mjs';
import { BULUNAMADI_CUMLESI, derinBaglantiKarari } from '../lib/aday-derin-baglanti.mjs';
import { adayAdresiniYaz, useAdayAdresi } from './useAdayAdresi';
import {
  basvuruAdayYetenekleri,
  basvuruDurumuDegistir,
  mulakatTarihiYaz,
  teklifGonder,
  gorusmeyeDavetEt,
  basvuruIletisimi,
  basvuruAdayGuncelProfili,
  basvuruAdayPaylasimlari,
  basvuruNotuKaydet,
  ilanDurumuDegistir,
  ilanGuncelle,
  ilanSil,
  ilanKaydet,
  ilanYayinaGonder,
  sirketBaglami,
  sirketBasvurulari,
  basvuruGoruntulendi,
  basvurulariDagit,
  degerlendirmeOlcutleri,
  sirketEkibi,
  sirketIsYuku,
  sorumluAta,
  type DegerlendirmeOlcutu,
  type EkipUyesi,
  type IsYukuSatiri,
  sirketIlanlari,
  sirketProfiliOku,
  type BekleyenAday,
  type IlanKontrolSonucu,
  type SirketBaglami,
  type SirketProfilDegeri,
} from '../lib/sirket-veri';

/**
 * Şirket hesabının /sirket/* içerikleri — kabuksuz.
 *
 * TEK KABUK (kullanıcı kararı, 18 Eylül 2026)
 * -------------------------------------------
 * Bu bileşen eskiden kendi üst çubuğunu ve alt menüsünü (SirketKabugu)
 * çiziyor, App onu TAM SAYFA yerleştiriyordu: Header ve alt menü yoktu.
 * Ayrı işveren paneli kalktı; şirket hesabı öğrenciyle aynı kabuğu
 * (Header + İlanlar · Başvuranlar · Ağım · Rehber · Profil) kullanıyor.
 * Burası artık yalnız sekme İÇERİĞİNİ döndürüyor; App `icerikSayfasi`
 * ile öteki sayfalar gibi kabuğun içine koyuyor.
 *
 * ÜÇ SEKME, ÜÇ EKRAN
 * ------------------
 * Başvuranlar (/sirket/basvuranlar) 18 Eylül 2026'ya kadar İlanlar'ın
 * içinde bölümlü kontrolle (src/ui/Tabs) geçilen ikinci görünümdü:
 * şirketin asıl işi iki dokunuş uzaktaydı. Kabuktaki Fırsatlar sekmesi
 * şirkete işe yaramayınca (salt okunur burs listesi) o yer Başvuranlar
 * oldu; bölümlü kontrol kalktı, iki ekran iki sekme. İlanlar
 * (/sirket/ilanlar) yalnız ilan listesi. Profil (/sirket/profil) şirket
 * sayfası — kimlik, üç sayaç, Paylaşımlar · İlanlar · Hakkımızda;
 * düzenleme /sirket/profil/duzenle (SirketProfili). İlan formu
 * (/sirket/ilan/yeni, /sirket/ilan/<id>/duzenle) kendi ekranı. Eski
 * "Genel" sekmesi kalktı; /sirket → /sirket/ilanlar.
 *
 * KADEME 1 BAŞVURANLARI GÖREMİYOR
 * -------------------------------
 * Görünüm duruyor ama kart yok; yerine ne yapılacağı yazıyor. Görünümü
 * tamamen gizlemek, doğrulamanın var olduğunu da gizlerdi.
 *
 * Asıl kapı burada değil, veritabanında: `applications` SELECT politikası
 * şirketin doğrulanmış olmasını da soruyor. Bu ekran kapatılsa bile veri
 * gelmiyor.
 *
 * KADEME NUMARASI EKRANDA YAZMIYOR
 * --------------------------------
 * "KADEME 1" kullanıcıya hiçbir şey anlatmıyor — bir oyunun seviyesi gibi
 * duruyor. Yerine ne yapabildiği yazıyor: "İlan açık · kartlar kapalı".
 */

/** Panel adresleri arama motoruna kapalı; burası bir ürün sayfası değil. */
function useNoindex() {
  React.useEffect(() => {
    const etiket = document.createElement('meta');
    etiket.name = 'robots';
    etiket.content = 'noindex, nofollow';
    document.head.appendChild(etiket);
    return () => etiket.remove();
  }, []);
}

/** Kademe pili. Doğrulanmış damgası öğrenci tarafındaki "Resmî kaynak" rozetiyle aynı dil. */
export const DurumRozeti: React.FC<{ baglam: Pick<SirketBaglami, 'dogrulandi'> }> = ({ baglam }) =>
  baglam.dogrulandi ? (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold"
      style={{ borderColor: SIRKET_KENAR_VURGU, background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      Doğrulanmış kurum
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold"
      style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN_IKINCIL }}
    >
      <Lock className="h-3.5 w-3.5" aria-hidden />
      İlan açık · kartlar kapalı
    </span>
  );

export type SirketGorunumu = 'ilanlar' | 'basvuranlar' | 'adaylar';

/** Adresten görünüm; form ve profil ayrı. */
export function sirketEkrani(
  yol: string,
):
  | { tur: 'form'; duzenlenenId: string | null }
  | { tur: 'profil' }
  | { tur: 'adayProfili'; adayId: string }
  | { tur: SirketGorunumu } {
  if (yol === '/sirket/ilan/yeni') return { tur: 'form', duzenlenenId: null };
  const duzenlenenId = yol.match(/^\/sirket\/ilan\/([0-9a-f-]{36})\/duzenle$/)?.[1] ?? null;
  if (duzenlenenId) return { tur: 'form', duzenlenenId };
  if (yol.startsWith('/sirket/profil')) return { tur: 'profil' };
  /*
    Aday profili adayların ALTINDA: /sirket/aday/<id>. Önce bakılıyor,
    yoksa `/sirket/adaylar` öneki onu da yutardı.
  */
  const adayId = yol.match(/^\/sirket\/aday\/([0-9a-f-]{36})$/)?.[1] ?? null;
  if (adayId) return { tur: 'adayProfili', adayId };
  if (yol.startsWith('/sirket/adaylar')) return { tur: 'adaylar' };
  if (yol.startsWith('/sirket/basvuranlar')) return { tur: 'basvuranlar' };
  return { tur: 'ilanlar' };
}

export const SirketPaneli: React.FC<{
  yol: string;
  userId: string | null;
  yoneticiMi: boolean;
  onNavigate: (yol: string) => void;
  /* Bildirimden gelindiyse açılacak aday. */
  acilacakAday?: string | null;
  onAdayAcildi?: () => void;
  onCikis?: () => void;
}> = ({ yol, userId, yoneticiMi, onNavigate, acilacakAday, onAdayAcildi, onCikis }) => {
  useNoindex();

  const [baglam, setBaglam] = React.useState<SirketBaglami | null>(null);
  const [ilanlar, setIlanlar] = React.useState<Record<string, unknown>[]>([]);
  const [basvurular, setBasvurular] = React.useState<Record<string, any>[]>([]);
  /*
    EKİP VE İŞ YÜKÜ (20261123010000). `profiles` satırı yalnız kendine
    açık olduğu için takım arkadaşının adı ancak RPC'den geliyor.
    Hata hâlinde boş dizi dönüyor ve atama kutusu hiç çizilmiyor —
    isimsiz bir kutuda kime iş atandığı anlaşılmazdı.
  */
  const [ekip, setEkip] = React.useState<EkipUyesi[]>([]);
  const [isYuku, setIsYuku] = React.useState<IsYukuSatiri[]>([]);
  /* Şirketin değerlendirme ölçütleri; boşsa form yalnız not alıyor. */
  const [olcutler, setOlcutler] = React.useState<DegerlendirmeOlcutu[]>([]);
  /*
    Profil alanları eksik-profil satırı ve kimlik kartı için. Okunamazsa
    null kalıyor; satır çizilmiyor, kart "alınamadı" diyor. Panelin
    kendisi bu yüzden düşmüyor.
  */
  const [profil, setProfil] = React.useState<SirketProfilDegeri | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  /*
    Bildirimden açılmak istenen başvuru gösterilemediğinde ekrana yazılan
    cümle. `null` iken hiçbir şey çizilmiyor.
  */
  const [adayUyarisi, setAdayUyarisi] = React.useState<string | null>(null);
  /*
    Sessiz yeniden yüklemenin hangi başvuru kimliği için yapıldığı ve
    bitip bitmediği. Etki `basvurular` ve `durum` değiştikçe yeniden
    çalışıyor; bu ref olmasa aynı kimlik için her çalışmada yeni bir istek
    atılırdı. "Bitti" ayrımı da gerekli: istek yoldayken etki yeniden
    çalışırsa sonucu beklemeden "görüntülenemiyor" denmesin.
  */
  const yenidenYuklenenAday = React.useRef<{ id: string; bitti: boolean } | null>(null);
  /*
    Yanıt döndüğünde bekleyen kimlik hâlâ aynı mı? Arada başka bir
    bildirime dokunulduysa eski isteğin sonucu yeni kimliği silmesin.
  */
  const bekleyenAday = React.useRef<string | null>(null);
  bekleyenAday.current = acilacakAday ?? null;

  const yukle = React.useCallback(async () => {
    setDurum('yukleniyor');
    try {
      const b = await sirketBaglami(userId, yoneticiMi);
      setBaglam(b);

      if (b.companyId) {
        setIlanlar((await sirketIlanlari(b.companyId)) as Record<string, unknown>[]);
        setProfil(await sirketProfiliOku(b.companyId).catch(() => null));

        /*
          Başvurular yalnızca kart görebilen kademede isteniyor. Kademe
          1'de RLS zaten boş dönerdi; yine de istememek doğru: "0 başvuru"
          demek, göremediği bir şeyi yok sanmasına yol açar.
        */
        if (adayGorebilir(b.kademe)) {
          setBasvurular(await basvuruKartlari(b.companyId));
          /* Paralel: ekip ve iş yükü başvuru listesini bekletmiyor. */
          const [e, y, o] = await Promise.all([
            sirketEkibi(b.companyId),
            sirketIsYuku(b.companyId),
            degerlendirmeOlcutleri(b.companyId),
          ]);
          setEkip(e);
          setIsYuku(y);
          setOlcutler(o);
        } else {
          setBasvurular([]);
          setEkip([]);
          setIsYuku([]);
          setOlcutler([]);
        }
      }
      setDurum('hazir');
    } catch {
      setDurum('hata');
    }
  }, [userId, yoneticiMi]);

  React.useEffect(() => {
    void yukle();
  }, [yukle]);

  /*
    İLAN LİSTESİNİ SESSİZCE YENİLE

    `yukle` bütün paneli iskelete çekiyor: ekrandaki bileşen (ilan formu,
    ilan kartları) sökülüp yeniden takılıyor ve yerel durumu — formun
    sonuç ekranı, kartın "yayına çıkmadı" cümlesi — kayboluyordu. Kayıt
    ve yayına gönderme yalnız ilan listesini değiştiriyor; yalnız o
    yeniden okunuyor. Okuma düşerse sonuç zaten ekranda (sunucunun
    yanıtı); liste bir sonraki açılışta yenilenir.
  */
  const companyId = baglam?.companyId ?? null;
  const ilanlariYenile = React.useCallback(async () => {
    if (!companyId) return;
    try {
      setIlanlar((await sirketIlanlari(companyId)) as Record<string, unknown>[]);
    } catch {
      /* Bilinçli: yukarıdaki not. */
    }
  }, [companyId]);

  /*
    KAPAT / YAYINA GÖNDER — İLANLAR VE PROFİL SEKMESİ AYNI YOL

    Yayına alma `ilanYayinaGonder`: sunucu kontrolü çalıştırıp sonucu
    döndürüyor ve kart o sonucu yazıyor. `ilanDurumuDegistir('published')`
    da aynı RPC'ye gidiyor ama sonucu atıyor; kartın "neden yayına
    çıkmadı" diyebilmesi için sonuç burada gerekli.
  */
  const ilanDurumu = React.useCallback(
    async (id: string, d: 'published' | 'closed'): Promise<IlanKontrolSonucu | void> => {
      if (d === 'published') {
        const sonuc = await ilanYayinaGonder(id);
        await ilanlariYenile();
        return sonuc;
      }
      await ilanDurumuDegistir(id, d);
      await ilanlariYenile();
    },
    [ilanlariYenile],
  );

  /*
    Yeni bir bildirim ya da başka bir ekran eski uyarıyı kaldırıyor.
    Aşağıdaki etkiden ÖNCE tanımlı: aynı çizimde ikisi de çalışırsa
    (doğrulanmamış şirkette uyarı eşzamanlı yazılıyor) son sözü uyarıyı
    yazan etki söylesin, temizleyen değil.
  */
  React.useEffect(() => {
    if (acilacakAday) setAdayUyarisi(null);
  }, [acilacakAday]);
  React.useEffect(() => {
    setAdayUyarisi(null);
  }, [yol]);

  /*
    BİLDİRİMDEN GELEN BAŞVURU LİSTEDE YOKSA

    Başvurular yalnız panel açılırken yükleniyor. Panel açıkken yeni bir
    başvuru gelip şirket bildirimine dokunduğunda App aynı adrese
    (`/sirket/basvuranlar`) gidiyor; liste yenilenmiyor ve kart yüklü
    listede olmadığı için hiç açılmıyordu.

    Kimlik listede yoksa başvurular BİR KEZ sessizce yeniden okunuyor.
    `yukle` kullanılmıyor: o bütün paneli iskelet ekranına çekiyor ve
    şirketin baktığı ekran bir anlığına kaybolurdu. İlan ve profil de
    yeniden okunmuyor; değişen yalnız başvuru listesi.

    Yeniden okumadan sonra da yoksa döngü yok: bekleyen kimlik temizleniyor
    ve dürüst bir cümle yazılıyor. Bu, doğrulanmamış şirkette (RLS satırı
    vermiyor; bu kademede liste hiç istenmiyor) ya da silinmiş/erişilemeyen
    bir kayıtta oluyor.
  */
  React.useEffect(() => {
    if (!acilacakAday || durum !== 'hazir' || !baglam) return;
    if (basvurular.some((k) => k.id === acilacakAday)) return;

    const gosterilemiyor = () => {
      setAdayUyarisi('Bu başvuru şu anda görüntülenemiyor.');
      onAdayAcildi?.();
    };

    if (!baglam.companyId || !adayGorebilir(baglam.kademe)) {
      gosterilemiyor();
      return;
    }
    const onceki = yenidenYuklenenAday.current;
    if (onceki?.id === acilacakAday) {
      /* Yoldaysa bekleniyor; bittiyse ikinci istek atılmıyor. */
      if (onceki.bitti) gosterilemiyor();
      return;
    }
    const takip = { id: acilacakAday, bitti: false };
    yenidenYuklenenAday.current = takip;
    void basvuruKartlari(baglam.companyId)
      .then((kartlar) => {
        takip.bitti = true;
        setBasvurular(kartlar);
        if (bekleyenAday.current !== takip.id) return;
        /*
          Bulunduysa AdayIzgarasi kendi etkisiyle kartı açıp kimliği
          temizliyor; burada ayrıca açmaya gerek yok.
        */
        if (!kartlar.some((k) => k.id === takip.id)) gosterilemiyor();
      })
      .catch(() => {
        if (yenidenYuklenenAday.current === takip) yenidenYuklenenAday.current = null;
        if (bekleyenAday.current !== takip.id) return;
        /*
          Okuma düştüyse kayıt hakkında bir şey bilmiyoruz; "görüntülenemiyor"
          demek yanlış olurdu. Ref sıfırlanıyor ki kullanıcı bildirime yeniden
          dokunduğunda bir deneme daha yapılabilsin.
        */
        setAdayUyarisi('Başvurular yenilenemedi. Bağlantını kontrol edip bildirime yeniden dokun.');
        onAdayAcildi?.();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acilacakAday, durum, baglam, basvurular]);

  /*
    DERİN BAĞLANTI: /sirket/basvuranlar?aday=<başvuruId>

    Kimlik şirketin listesindeyse AdayIzgarasi ekranı adresten açıyor.
    Liste yüklenmeden karar verilmiyor ('bekle'); okuma hatası da
    "bulunamadı" sayılmıyor. Liste yüklü ve kimlik yoksa — geçersiz,
    başka şirketin, ya da doğrulanmamış şirkette liste hiç istenmediği
    için — TEK bir tarafsız cümle yazılıyor ve `aday` adresten yerinde
    siliniyor. İki ayrı cümle, başka bir şirkete ait bir başvurunun var
    olduğunu sızdırırdı.
  */
  const adresAday = useAdayAdresi();
  React.useEffect(() => {
    if (sirketEkrani(yol).tur !== 'basvuranlar' || !baglam) return;
    const karar = derinBaglantiKarari({
      adresId: adresAday,
      durum,
      kimlikler: basvurular.map((k) => String(k.id)),
    });
    if (karar !== 'bulunamadi') return;
    setAdayUyarisi(BULUNAMADI_CUMLESI);
    adayAdresiniYaz(null);
  }, [yol, adresAday, durum, baglam, basvurular]);

  if (durum === 'yukleniyor' || !baglam) {
    return (
      <div className="space-y-3" aria-busy="true">
        <span className="block h-8 w-48 animate-pulse rounded-lg" style={{ background: SIRKET_ROZET }} />
        <span className="block h-24 w-full animate-pulse rounded-2xl" style={{ background: SIRKET_ROZET }} />
      </div>
    );
  }

  if (durum === 'hata') {
    return (
      <div className="space-y-4">
        <div className={KUTU} style={kutuStil}>
          <p className="font-bold" style={{ color: SIRKET_METIN }}>
            Panel yüklenemedi
          </p>
          <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            Bağlantı kopmuş olabilir. Yeniden denemek sorunu çözmezse sayfayı yenile.
          </p>
          <button
            type="button"
            onClick={() => void yukle()}
            className={`mt-4 ${IKINCIL_DUGME}`}
            style={ikincilStil}
          >
            Yeniden dene
          </button>
        </div>
        {/* Panel düşse de çıkış yolu kapanmasın. */}
        {onCikis && <CikisDugmesi onCikis={onCikis} />}
      </div>
    );
  }

  const ekran = sirketEkrani(yol);

  if (ekran.tur === 'form') {
    /*
      DÜZENLEME AYNI FORMU KULLANIYOR

      İlan formunu ikinci kez yazmak iki kopya demek: doğrulama kuralı ya da
      yeni bir alan birinde değişip diğerinde unutulur. Aynı bileşen, dolu
      başlangıç değerleriyle açılıyor; kaydetme yolu değişiyor.
    */
    const duzenlenenId = ekran.duzenlenenId;
    return (
      <IlanFormu
        kademe={baglam.kademe}
        sirketAdi={baglam.ad}
        siteUrl={baglam.siteUrl}
        eposta={baglam.hrEmail}
        duzenlenenId={duzenlenenId}
        /*
          KAYIT ve YAYINA GÖNDERME AYRI İKİ ÇAĞRI

          `onKaydet` yalnız kaydediyor (yeni ilan taslak; var olan ilan
          güncelleniyor). Yayına gönderme ayrı (`onYayinaGonder`), çünkü
          "Taslak olarak kaydet" kontrolü HİÇ çalıştırmamalı. Form, ilk
          kayıttan sonra aynı ilanın kimliğini tutuyor; ikinci gönderim
          yeni ilan açmıyor, o kimliği güncelliyor.

          Liste sessizce yenileniyor (`ilanlariYenile`); `yukle` formu
          söküp sonuç ekranını kaybettirirdi.
        */
        onKaydet={async (satir, { id, gonderimAnahtari }) => {
          if (id) {
            await ilanGuncelle(id, satir);
            void ilanlariYenile();
            return { id };
          }
          const kayit = await ilanKaydet(satir, baglam.companyId!, gonderimAnahtari);
          void ilanlariYenile();
          return kayit;
        }}
        onYayinaGonder={async (id) => {
          const sonuc = await ilanYayinaGonder(id);
          void ilanlariYenile();
          return sonuc;
        }}
        onIptal={() => onNavigate('/sirket/ilanlar')}
      />
    );
  }

  if (ekran.tur === 'adayProfili') {
    /*
      ADAY PROFİLİ KENDİ EKRANI

      Karttaki "Profili incele" buraya geliyor. Sekme çubuğunun altına
      değil, `SirketPaneli` düzeyine konuldu: bu bir sekme değil, bir
      sekmenin içinden açılan derin sayfa — İlan formunun durduğu yerle
      aynı düzey.
    */
    return <SirketAdayProfili adayId={ekran.adayId} onNavigate={onNavigate} />;
  }

  if (ekran.tur === 'profil') {
    /*
      Profil sekmesi ilan yönetimini de taşıyor (İlanlar sekmesiyle aynı
      kartlar, aynı eylemler); bu yüzden durum/kaldırma geri çağrıları
      aşağıdaki İlanlar sekmesiyle BİREBİR aynı — iki kopya olsaydı biri
      değiştiğinde öteki geride kalırdı.
    */
    return (
      <SirketProfili
        yol={yol}
        baglam={baglam}
        profil={profil}
        ilanlar={ilanlar}
        basvurular={basvurular as AdayOzeti[]}
        userId={userId}
        onKaydedildi={yukle}
        onNavigate={onNavigate}
        onDurum={ilanDurumu}
        onKaldir={async (id, arsivle) => {
          if (arsivle) await ilanDurumuDegistir(id, 'archived');
          else await ilanSil(id);
          await yukle();
        }}
        onCikis={onCikis}
      />
    );
  }

  /*
    Uyarı yalnız sekme görünümlerinde çiziliyor: bildirim her zaman
    Başvuranlar'a götürüyor ve yol değişince uyarı zaten temizleniyor.
    `role="status"`: ekran okuyucu kullanıcısı da dokunduğu bildirimin
    neden açılmadığını duyuyor.
  */
  const uyari = adayUyarisi ? (
    <div
      role="status"
      className={`${KUTU} mb-4 flex flex-wrap items-center justify-between gap-2`}
      style={kutuStil}
    >
      <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
        {adayUyarisi}
      </p>
      <button
        type="button"
        onClick={() => setAdayUyarisi(null)}
        className={IKINCIL_DUGME}
        style={ikincilStil}
      >
        Kapat
      </button>
    </div>
  ) : null;

  return (
    <>
    {uyari}
    <SirketIlanlarSekmesi
      baglam={baglam}
      gorunum={ekran.tur}
      ilanlar={ilanlar}
      basvurular={basvurular}
      profil={profil}
      onNavigate={onNavigate}
      onDurum={ilanDurumu}
      /*
        İki ayrı sonuç, tek eylem: başvurusu olan ilan arşivleniyor
        (veri duruyor), olmayan ilan siliniyor. Karar burada değil
        veritabanında da korunuyor — listings_guard_delete başvurulu
        bir ilanın silinmesini reddediyor.
      */
      onKaldir={async (id, arsivle) => {
        if (arsivle) await ilanDurumuDegistir(id, 'archived');
        else await ilanSil(id);
        await yukle();
      }}
      onBasvuruDurumu={async (id, d) => {
        await basvuruDurumuDegistir(id, d);
        await yukle();
      }}
      ekip={ekip}
      isYuku={isYuku}
      olcutler={olcutler}
      /*
        DAĞITIM açık bir eylem: düğmeye basınca koşuyor. Sunucu yalnız
        sorumsuzları ve yalnız yazabilen üyelere dağıtıyor; dönen sayı
        gerçekten atanan adet.
      */
      onDagit={async () => {
        if (!baglam.companyId) return;
        await basvurulariDagit(baglam.companyId);
        await yukle();
      }}
      /*
        SORUMLU ATAMA. `beklenen` çağıranın EKRANDA GÖRDÜĞÜ değer;
        sunucu satır o değerde değilse yazmıyor ve hata atıyor, yani
        iki kişi aynı anda atadığında ikincisi birincisini sessizce
        ezmiyor. Yazma başarılıysa liste sunucudan yeniden okunuyor.
      */
      onSorumlu={async (id, uyeId, beklenen) => {
        await sorumluAta(id, uyeId, beklenen);
        await yukle();
      }}
      onMulakatTarihi={async (id, tarih) => {
        await mulakatTarihiYaz(id, tarih);
        await yukle();
      }}
      /*
        Teklif ve davet durumla BİRLİKTE yazılıyor: iki ayrı yazımda
        arada kalan an, öğrenciye içi boş bir "Teklif aldın" / davet
        gösterirdi.
      */
      onTeklif={async (id, teklif) => {
        await teklifGonder(id, teklif);
        await yukle();
      }}
      onDavet={async (id, davet) => {
        await gorusmeyeDavetEt(id, davet);
        await yukle();
      }}
      onIletisim={(id) => basvuruIletisimi(id)}
      onGuncelProfil={basvuruAdayGuncelProfili}
      onPaylasimlar={basvuruAdayPaylasimlari}
      onNot={async (id, metin) => {
        await basvuruNotuKaydet(id, metin);
        await yukle();
      }}
      acilacakAday={acilacakAday}
      onAdayAcildi={onAdayAcildi}
    />
    </>
  );
};

/**
 * Şirketin başvurularını kart verisine çevirir.
 *
 * `yukle` ile bildirimden gelen sessiz yeniden okuma AYNI yoldan geçiyor:
 * kartın biçimi iki yerde ayrı kurulursa biri değişip öteki geride kalır.
 */
async function basvuruKartlari(companyId: string): Promise<Record<string, any>[]> {
  const ham = await sirketBasvurulari(companyId);
  return Promise.all(
    ham.map(async (s: Record<string, any>) => {
      const anlikVar = Array.isArray(s.profile_snapshot?.yetenekler);
      /*
        BAŞVURU KİMLİĞİYLE, ÖĞRENCİ KİMLİĞİYLE DEĞİL (20261121010000)

        Şirketin öğrenci tablolarını doğrudan okuması kapatıldı; yetenek
        listesi artık yalnız bu başvuru üzerinden ve rıza varsa geliyor.
      */
      const yetenekler = anlikVar ? [] : await basvuruAdayYetenekleri(String(s.id));
      return kartVerisi(s, { yetenekler });
    })
  );
}

/* ------------------------------------------------------ İlanlar sekmesi */

/**
 * İlanlar ve Başvuranlar sekmeleri: `gorunum` hangisinin çizileceğini
 * seçiyor. İkisi tek bileşende, çünkü aynı veriyi (ilanlar +
 * başvurular) ve aynı geri çağrıları paylaşıyor; iki bileşene bölmek
 * on iki prop'u iki yerde tekrar ettirirdi. Bölümlü kontrol YOK: iki
 * görünüm artık kabuğun iki ayrı sekmesi.
 *
 * `export`: geliştirme fikstürü (src/dev/SirketPanelDevFixture) bu
 * sekmeyi Header ve alt menüyle birlikte oturumsuz çiziyor — giriş
 * arkasındaki ekran tarayıcıda hiç görülmeden değişmesin.
 */
export const SirketIlanlarSekmesi: React.FC<{
  baglam: SirketBaglami;
  gorunum: SirketGorunumu;
  ilanlar: Record<string, unknown>[];
  /** Kart görebilen kademede şirketin tüm başvuruları (kart verisi); değilse boş. */
  basvurular: Record<string, any>[];
  profil: SirketProfilDegeri | null;
  onNavigate: (y: string) => void;
  onDurum: (id: string, d: 'published' | 'closed') => Promise<IlanKontrolSonucu | void>;
  onKaldir: (id: string, arsivle: boolean) => Promise<void>;
  onBasvuruDurumu: (id: string, d: string) => Promise<void>;
  ekip: EkipUyesi[];
  isYuku: IsYukuSatiri[];
  olcutler: DegerlendirmeOlcutu[];
  onDagit: () => Promise<void>;
  onSorumlu: (id: string, uyeId: string | null, beklenen: string | null) => Promise<void>;
  onMulakatTarihi: (id: string, tarih: string) => Promise<void>;
  onTeklif: (id: string, teklif: { not: string; baslangic: string; ucret: string }) => Promise<void>;
  onDavet: (
    id: string,
    davet: { tarih: string; saat: string; tur: string; yer: string; not: string },
  ) => Promise<void>;
  onIletisim: (id: string) => Promise<Iletisim | null>;
  /*
    İnceleme ekranının güncel profil ve paylaşım okumaları
    (20261121010000). Kapı sunucuda: yalnız o başvurunun ilanının sahibi
    doğrulanmış şirketin üyesi, yalnız rıza / paylaşım izni varsa.
  */
  onGuncelProfil: GuncelProfilYukleyici;
  onPaylasimlar: PaylasimYukleyici;
  /** Yalnız geliştirme fikstürü: paylaşım görseli için yerel dosya. Üretimde verilmiyor. */
  yerelGorselAdresi?: (yol: string) => string | null;
  /*
    İlan kapatılırken sonucu bekleyen adayları okuyan işlev. Üretimde
    verilmiyor (gerçek okuma varsayılan); fikstür kendi okuyucusunu
    geçirerek onay diyaloğunu ve okuma hatasını sınayabiliyor.
  */
  onBekleyenAdaylar?: (ilanId: string) => Promise<BekleyenAday[]>;
  /*
    Aday ayrıntısı başarıyla açıldı → görüntülenme kaydı. Üretimde
    verilmiyor (gerçek RPC varsayılan); fikstür çağrıları kaydedip
    "başarısız yüklemede kayıt yok" kuralını tarayıcıda gösterebiliyor.
  */
  onGoruntulendi?: (id: string) => void;
  onNot: (id: string, metin: string) => Promise<void>;
  acilacakAday?: string | null;
  onAdayAcildi?: () => void;
  /** Fikstürün sabit "bugün"ü; üretimde verilmiyor. */
  simdi?: Date;
}> = ({
  baglam,
  gorunum,
  ilanlar,
  basvurular,
  profil,
  onNavigate,
  onDurum,
  onKaldir,
  onBasvuruDurumu,
  ekip,
  isYuku,
  olcutler,
  onDagit,
  onSorumlu,
  onMulakatTarihi,
  onTeklif,
  onDavet,
  onIletisim,
  onGuncelProfil,
  onPaylasimlar,
  yerelGorselAdresi,
  onBekleyenAdaylar,
  onGoruntulendi = basvuruGoruntulendi,
  onNot,
  acilacakAday,
  onAdayAcildi,
  simdi,
}) => {
  const kartAcik = adayGorebilir(baglam.kademe);
  const yeniToplam = kartAcik ? basvurular.filter((b) => b.durum === 'submitted').length : 0;

  if (gorunum === 'adaylar') {
    /*
      ADAYLAR — BAŞVURANLARDAN AYRI EKRAN

      Başvuran, bir ilana başvurmuş kişi; aday, profilini iş/staj
      listesine kendisi açmış kişi. İkisini tek listede karıştırmak
      "bu kişi bize başvurdu" ile "bu kişi arıyor"u aynı şeye çevirirdi.

      Alt gezinme çubuğuna SEKME EKLENMEDİ: orada zaten beş öğe var ve
      genişlikleri 320 px için ölçülmüş. Altıncı öğe o ölçümü bozardı;
      giriş Başvuranlar ekranının üstünden veriliyor.
    */
    return <SirketAdaylar onNavigate={onNavigate} />;
  }

  if (gorunum === 'basvuranlar') {
    return (
      <Basvuranlar
        onGoruntulendi={onGoruntulendi}
        baglam={baglam}
        kartlar={basvurular}
        ilanlar={ilanlar}
        ekip={ekip}
        isYuku={isYuku}
        olcutler={olcutler}
        onDagit={onDagit}
        onSorumlu={onSorumlu}
        onNavigate={onNavigate}
        onDurum={onBasvuruDurumu}
        onMulakatTarihi={onMulakatTarihi}
        onTeklif={onTeklif}
        onDavet={onDavet}
        onIletisim={onIletisim}
        onGuncelProfil={onGuncelProfil}
        onPaylasimlar={onPaylasimlar}
        yerelGorselAdresi={yerelGorselAdresi}
        onNot={onNot}
        acilacakAday={acilacakAday}
        onAdayAcildi={onAdayAcildi}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/*
        BAŞLIK "İLANLARIM", ŞİRKET ADI İKİNCİL KİMLİKTE (26 Eylül 2026)

        Başlık şirket adıydı; sekmenin ne olduğunu söylemiyordu. Artık
        sayfanın adı `h1`, şirket adı ve gerçek doğrulama durumu üstte
        küçük bir kimlik satırında. "Doğrulanmış kurum" rozeti yalnız bu
        satırda (`companies.verified` → `baglam.dogrulandi`); Başvurular
        ve öteki ekranlar tekrarlamıyor.

        TEK OLUŞTURMA EYLEMİ: ilan yokken boş durum kartının "İlan
        oluştur"u, ilan varken başlığın yanındaki etiketli "İlan oluştur".
        Etiketsiz "+" ve listenin sonundaki kesikli "Yeni ilan" kartı
        kalktı (26 Eylül 2026) — aynı sayfaya giden iki düğme yoktu artık.
      */}
      <div className="space-y-2">
        {/*
          KİMLİK SATIRI KALKTI (27 Eylül 2026, kullanıcı kararı): şirket adı
          ve "Doğrulanmış kurum" rozeti profil sayfasında (Şirketim) duruyor;
          burada tekrar etmenin anlamı yok. Doğrulanmamış şirkette yalnız
          işlevsel uyarı kalıyor ("İlan açık · kartlar kapalı"): başvuran
          kartlarının neden kapalı olduğunu söylüyor.
        */}
        {!baglam.dogrulandi && (
          <p className="flex min-w-0 flex-wrap items-center gap-2">
            <DurumRozeti baglam={baglam} />
          </p>
        )}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
              İlanlarım
            </h1>
            {/*
              Alt satır gerçek sayılar. Başvuru sayısı yalnız kart görebilen
              kademede ve sıfırdan büyükse — "0 yeni başvuru" bilgi değil.
            */}
            <p className="mt-0.5 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              {ilanlar.length > 0
                ? `${ilanlar.length} ilan${yeniToplam > 0 ? ` · ${yeniToplam} yeni başvuru` : ''}`
                : 'Şirketinizin staj ilanlarını buradan yönetin.'}
            </p>
          </div>
          {ilanlar.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('/sirket/ilan/yeni')}
              className={`${BIRINCIL_DUGME} shrink-0 px-4`}
              style={birincilStil}
            >
              <Plus className="h-5 w-5" aria-hidden />
              İlan oluştur
            </button>
          )}
        </div>
      </div>

      <GenelBakis
        onBekleyenAdaylar={onBekleyenAdaylar}
        baglam={baglam}
        ilanlar={ilanlar}
        basvurular={basvurular as AdayOzeti[]}
        profil={profil}
        onNavigate={onNavigate}
        onDurum={onDurum}
        onKaldir={onKaldir}
        simdi={simdi}
        /* Öğrencinin ilanlar sayfasındaki sıra: kendi ilanının hangi şirketlerle, kaçıncı sırada durduğu. */
        siralama={
          <IlanSiralamasi
            companyId={baglam.companyId}
            yayindaIlanVar={ilanlar.some((i) => i.status === 'published')}
          />
        }
      />
    </div>
  );
};

/* --------------------------------------------------------- başvuranlar */

const Basvuranlar: React.FC<{
  baglam: SirketBaglami;
  kartlar: Record<string, any>[];
  ilanlar: Record<string, unknown>[];
  onNavigate: (y: string) => void;
  onDurum: (id: string, d: string) => Promise<void>;
  /*
    PANO KALKTI (6 Ekim 2026): ekip, iş yükü, ölçütler, dağıtım ve sorumlu
    atama yalnız Pano'da çiziliyordu. Ekran tek liste olunca bu ekran
    onları okumuyor; veri akışı ve BasvuruPanosu bileşeni yerinde duruyor.
  */
  ekip: EkipUyesi[];
  isYuku: IsYukuSatiri[];
  olcutler: DegerlendirmeOlcutu[];
  onDagit: () => Promise<void>;
  onSorumlu: (id: string, uyeId: string | null, beklenen: string | null) => Promise<void>;
  onMulakatTarihi: (id: string, tarih: string) => Promise<void>;
  onTeklif: (id: string, teklif: { not: string; baslangic: string; ucret: string }) => Promise<void>;
  onDavet: (id: string, davet: { tarih: string; saat: string; tur: string; yer: string; not: string }) => Promise<void>;
  onIletisim: (id: string) => Promise<Iletisim | null>;
  onGuncelProfil: GuncelProfilYukleyici;
  onPaylasimlar: PaylasimYukleyici;
  /** Görüntülenme kaydı; sekmeden geliyor (fikstür kaydedebilsin). */
  onGoruntulendi: (id: string) => void;
  yerelGorselAdresi?: (yol: string) => string | null;
  acilacakAday?: string | null;
  onAdayAcildi?: () => void;
  onNot: (id: string, metin: string) => Promise<void>;
}> = ({
  onGoruntulendi,
  baglam,
  kartlar,
  ilanlar,
  onNavigate,
  onDurum,
  onMulakatTarihi,
  onTeklif,
  onDavet,
  onIletisim,
  onGuncelProfil,
  onPaylasimlar,
  yerelGorselAdresi,
  acilacakAday,
  onAdayAcildi,
  onNot,
}) => {
  const kartAcik = adayGorebilir(baglam.kademe);

  /*
    SAYFA BAŞLIĞI GÖRÜNÜR: "BAŞVURANLAR" + GERÇEK BAŞVURU SAYISI
    (6 Ekim 2026, kullanıcının onayladığı tasarım)

    27 Eylül'de başlık ekrandan kaldırılıp yalnız ekran okuyucuya
    bırakılmıştı. Onaylı tasarımda başlık yeniden görünür ve sayı onun
    yanında: listenin üstündeki ayrı "x aday" satırı kalktı.

    SAYI BAŞVURU SAYISI, ADAY DEĞİL: aynı öğrencinin iki ilana başvurusu
    iki başvuru. Yalnız kart görebilen kademede ve sıfırdan büyükse
    yazıyor — öteki kademede sayı bilinmiyor, "0 başvuru" da bilgi değil.
  */
  const baslik = (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: SIRKET_METIN }}>
          Başvuranlar
        </h1>
        {kartAcik && kartlar.length > 0 && (
          <span
            className="rounded-full px-3 py-1 text-sm font-bold"
            style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
          >
            {kartlar.length} başvuru
          </span>
        )}
      </div>
      <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
        İlanlarına gelen başvurular
      </p>
    </div>
  );

  /*
    "STAJ ARAYANLAR / İŞ ARAYANLAR" KUTULARI BU EKRANDAN KALKTI
    (6 Ekim 2026). Keşif sayfası (/sirket/adaylar, SirketAdaylar)
    silinmedi; bu ekran yalnız başvurularla ilgileniyor.
  */

  /*
    HİÇ İLAN YOKSA: başvuru gelecek bir yer yok. Kademe ne olursa olsun
    ilk iş ilan açmak (kademe 1 de ilan açabiliyor); kilitli kart ancak
    ilan varken anlam taşıyor.
  */
  if (ilanlar.length === 0) {
    return (
      <div className="space-y-4">
        {baslik}
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
            Başvuru almak için önce bir ilan yayınlayın.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/sirket/ilan/yeni')}
            className={`mt-5 w-full sm:w-auto ${BIRINCIL_DUGME}`}
            style={birincilStil}
          >
            <Plus className="h-5 w-5" aria-hidden />
            İlan oluştur
          </button>
        </div>
      </div>
    );
  }

  if (!kartAcik) {
    return (
      <div className="space-y-4">
        {baslik}
        <div className={KUTU} style={kutuStil}>
          <p
            className="flex items-center gap-2 text-lg font-extrabold"
            style={{ color: SIRKET_METIN }}
          >
            <Lock className="h-5 w-5" aria-hidden style={{ color: SIRKET_VURGU_KOYU }} />
            Başvuran bilgileri kapalı
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
            İlan asmak ile öğrenci bilgisi görmek ayrı iki yetki. Öğrencinin adı, okulu ve
            projelerini görebilmek için şirketin doğrulanması gerekiyor — bu, bilgilerini bize
            emanet eden öğrenciye verdiğimiz söz.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/sirket/profil')}
            className={`mt-4 ${BIRINCIL_DUGME}`}
            style={birincilStil}
          >
            <ShieldCheck className="h-5 w-5" aria-hidden />
            Şirketini doğrula
          </button>
        </div>
      </div>
    );
  }

  /*
    PAYLAŞILACAK ADRES İLANIN GERÇEK ADRESİ (26 Eylül 2026)

    `/ilan/<uuid>` yazılıyordu; ilan yönlendirmesi adresin son parçasında
    8 haneli kısa kimlik arıyor (`idPrefixFromSlug`) ve uuid'in son
    parçası 12 hane: kopyalanan bağlantı hiçbir ilanı açmıyordu. Adres
    artık öğrencinin gördüğü ilan kartıyla aynı `listingSlug`dan.
  */
  const yayindaki = ilanlar.find((i) => i.status === 'published');
  const ilanYolu = yayindaki
    ? `/ilan/${listingSlug({ id: String(yayindaki.id), title: String(yayindaki.title ?? '') })}`
    : null;
  const ilanAdresi = ilanYolu && typeof window !== 'undefined' ? `${window.location.origin}${ilanYolu}` : null;

  /*
    İLAN KARTINDAN GELEN SÜZGEÇ

    Karttaki "Adaylar" düğmesi buraya `?ilan=<id>` ile geliyor. Rota
    durumu yalnız yolu tutuyor (App.navigate), sorgu adresten okunuyor —
    öğrenci tarafındaki süzgeçlerle aynı kural.
  */
  const baslangicIlan =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('ilan')
      : null;

  /*
    TEK LİSTE (6 Ekim 2026): Liste/Pano seçimi kalktı; ekran yalnız
    AdayIzgarasi'nı çiziyor. Sayfa başlığı yukarıda, ızgara kendi
    başlığını çizmiyor (`basliksiz`).

    VIEWER SALT OKUNUR (5 Ekim 2026)

    Asıl kapı sunucuda (`sirket_basvuru_yazabilir`, 20261122010000);
    buradaki dal aynı kuralı ÖNCEDEN gösteriyor. Viewer ekrandan
    kesilmiyor — rolün amacı "görsün ama karışmasın": liste ve inceleme
    ekranı açık, `saltOkunur` ile işlem sütunu HİÇ ÇİZİLMİYOR ve yazma
    işlevlerinin hiçbiri verilmiyor. Okuma işlevleri (profil, paylaşımlar,
    izinli iletişim) duruyor; hepsinin kapısı sunucuda.
  */
  if (!baglam.basvuruYazabilir) {
    return (
      <div className="space-y-4">
        {baslik}
        <p className="text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          <span className="font-bold" style={{ color: SIRKET_METIN }}>Görüntüleme yetkisi: </span>
          Başvuruları görebilir, durumlarını izleyebilirsin. Durum değiştirme ve not yazma
          şirket sahibinde ve işe alım yetkililerinde.
        </p>
        <AdayIzgarasi
          basliksiz
          saltOkunur
          kartlar={kartlar}
          ilanAdresi={ilanAdresi}
          baslangicIlan={baslangicIlan}
          onNavigate={onNavigate}
          onIletisim={onIletisim}
          onGuncelProfil={onGuncelProfil}
          onPaylasimlar={onPaylasimlar}
          yerelGorselAdresi={yerelGorselAdresi}
          acilacakAday={acilacakAday}
          onAdayAcildi={onAdayAcildi}
          onGoruntulendi={onGoruntulendi}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {baslik}
      <AdayIzgarasi
        basliksiz
        kartlar={kartlar}
        ilanAdresi={ilanAdresi}
        baslangicIlan={baslangicIlan}
        onNavigate={onNavigate}
        onDurum={onDurum}
        onMulakatTarihi={onMulakatTarihi}
        onTeklif={onTeklif}
        onDavet={onDavet}
        onIletisim={onIletisim}
        onGuncelProfil={onGuncelProfil}
        onPaylasimlar={onPaylasimlar}
        yerelGorselAdresi={yerelGorselAdresi}
        acilacakAday={acilacakAday}
        onAdayAcildi={onAdayAcildi}
        onGoruntulendi={onGoruntulendi}
        onNot={onNot}
      />
    </div>
  );
};

export { KADEME };
