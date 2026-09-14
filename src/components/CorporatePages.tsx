import React from 'react';
import { IlanBildirFormu, type BildirimOnDolgusu } from './IlanBildirFormu';
import {
  BellRing,
  Building2,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRoundX,
  XCircle,
} from 'lucide-react';
import { BOLUMLER } from '../data/bolumler';
import { REHBERLER } from '../data/rehberler';
import { KAYNAK_SISTEMLERI, KAYNAK_TOPLAM } from '../data/kaynak-sistemleri';
import {
  METRIK_ADLARI,
  fetchIstatistikler,
  metrikGosterilsinMi,
  taramaKapsamiMetni,
} from '../lib/gercek-istatistikler.mjs';

/**
 * Kurumsal sayfalar: Hakkımızda, İletişim, Kullanım Koşulları,
 * İlan Yayınlama Kuralları, İçerik/İlan Bildir.
 *
 * Yasal metinler (gizlilik, çerez, KVKK) LegalPage.tsx'te; bunlar ayrı tutuldu
 * çünkü içerik türü farklı: burada anlattığımız şey ürünün nasıl çalıştığı,
 * orada kişisel verinin nasıl işlendiği.
 *
 * Metinler sitenin BUGÜNKÜ gerçeğine göre yazıldı. Örneğin "şirketler ilan
 * yayınlar" demiyoruz, çünkü şirket kaydı henüz kapalı.
 */

/*
  Adres haritası ve başlıklar `lib/yasal-rotalar.ts`'e taşındı: App.tsx
  bir adresin kurumsal sayfa olup olmadığına çizimden önce bakmak
  zorunda ve o bakış bu dosyadaki 24 KB metni ana pakete çekiyordu.
  Adlar buradan yeniden dışa veriliyor, çağıran hiçbir kod değişmedi.
*/
export {
  CORPORATE_ROUTES,
  CORPORATE_TITLES,
  type CorporateSlug,
} from '../lib/yasal-rotalar';
import type { CorporateSlug } from '../lib/yasal-rotalar';


const ILETISIM = 'iletisim@stajimvar.com';

/**
 * CANLI SAYILAR — HER BİRİ AYRI SORGU
 *
 * NEDEN İLAN LİSTESİNİN ÜSTÜNDE DEĞİL
 * -----------------------------------
 * Bu sayılar güven bilgisi, arama aracı değil. İlan listesinin üstüne
 * büyük bir sayaç bandı koymak, mobilde ilk ekranı sayılara verip
 * aradığı ilanı aşağıya itmek olurdu. Yeri Hakkımızda sayfası: sayıyı
 * merak eden buraya geliyor.
 *
 * ÖLÇÜLEMEYEN METRİK ÇİZİLMİYOR: `null` gelen satır hiç görünmüyor.
 * Sıfır ise görünüyor — "ölçtük, sıfır çıktı" ile "okuyamadık" aynı
 * şey değil.
 */
const CanliSayilar: React.FC = () => {
  const [veri, setVeri] = React.useState<Awaited<
    ReturnType<typeof fetchIstatistikler>
  > | null>(null);

  React.useEffect(() => {
    let iptal = false;
    fetchIstatistikler(KAYNAK_TOPLAM)
      .then((x) => {
        if (!iptal) setVeri(x);
      })
      .catch(() => {
        /* Sayılar gelmezse sayfanın kalanı duruyor. */
      });
    return () => {
      iptal = true;
    };
  }, []);

  if (!veri) return null;

  /*
    İKİ SAYI AYRI SATIRDA VE AYRI ADLA

    "Etkin ilan kaynağı" ilan TOPLADIĞIMIZ sistemler; "kontrol edilen
    işveren kariyer sayfası" ilan toplamadığımız, yalnız durumunu
    ölçtüğümüz şirket adresleri. Tek başlık altında toplamak anlamsız
    bir toplam üretirdi.
  */
  const satirlar: Array<[string, number]> = [
    [METRIK_ADLARI.aktifIlan, veri.aktifIlan],
    [METRIK_ADLARI.etkinKaynak, veri.etkinKaynak],
    [METRIK_ADLARI.isverenSayfasi, veri.isverenSayfasi],
    [METRIK_ADLARI.kapanan, veri.kapanan],
    [METRIK_ADLARI.bozuk, veri.bozuk],
  ].filter((satir): satir is [string, number] => metrikGosterilsinMi(satir[1]));

  const kapsam = taramaKapsamiMetni(veri.taramaKontrolEdilen, veri.aktifIlan, veri.sonKontrol);
  if (satirlar.length === 0 && !kapsam) return null;

  return (
    <div className="space-y-3">
      {satirlar.length > 0 && (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {satirlar.map(([ad, deger]) => (
            <div
              key={ad}
              className="flex items-baseline justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <dt className="text-xs font-semibold leading-snug text-gray-600">{ad}</dt>
              <dd className="shrink-0 text-base font-extrabold tabular-nums text-gray-900">
                {deger}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {kapsam && <p className="text-xs leading-relaxed text-gray-600">{kapsam}</p>}
    </div>
  );
};

const S: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="space-y-2">
    <h2 className="text-base font-bold text-gray-900">{baslik}</h2>
    <div className="text-sm text-gray-600 leading-relaxed space-y-2">
      {children}
    </div>
  </section>
);

/**
 * TARANABİLİR MADDE LİSTESİ
 *
 * "Ne yapıyoruz / ne yapmıyoruz" sayfanın en çok okunan ve en çok
 * atlanan yeriydi: ikisi de düz paragraf ya da sade `<ul>` içindeydi ve
 * göz bir şeye tutunamıyordu.
 *
 * İKON AİLESİ DEĞİŞMİYOR
 * Sitenin her yerinde lucide kullanılıyor; buraya emoji ya da başka bir
 * görsel dil girmiyor. İkon tek başına bilgi taşımıyor (yanındaki cümle
 * taşıyor), bu yüzden ekran okuyucudan gizleniyor.
 *
 * MOBİLDE TEK KOLON
 * `sm:grid-cols-2` yalnızca geniş ekranda: 390 pikselde iki sütun her
 * maddeyi dört satıra bölerdi ve liste paragraftan uzun olurdu.
 */
const MaddeListesi: React.FC<{
  maddeler: ReadonlyArray<{ ikon: React.ElementType; baslik: string; govde: string }>;
  ton: 'olumlu' | 'olumsuz';
}> = ({ maddeler, ton }) => (
  <ul className="grid gap-2.5 sm:grid-cols-2">
    {maddeler.map(({ ikon: Ikon, baslik, govde }) => (
      <li
        key={baslik}
        className="flex gap-2.5 rounded-xl border border-gray-200 bg-white p-3"
      >
        <Ikon
          aria-hidden
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            ton === 'olumlu' ? 'text-blue-600' : 'text-gray-400'
          }`}
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">{baslik}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{govde}</p>
        </div>
      </li>
    ))}
  </ul>
);

/*
  BEŞ MADDE, DAHA FAZLASI DEĞİL

  Liste ancak taranabildiği sürece listeden sayılıyor. Her madde sitenin
  BUGÜN yaptığı bir şey; "yakında" ya da planlanan hiçbir şey yok.
*/
const YAPTIKLARIMIZ = [
  {
    ikon: Search,
    baslik: 'İlanı kaynağından derliyoruz',
    govde: 'Şirketlerin kendi işe alım sistemlerinden okuyoruz; başvuru adresi şirketin kendi sayfası kalıyor.',
  },
  {
    ikon: ShieldCheck,
    baslik: 'Başvuru adresini kontrol ediyoruz',
    govde: 'Yayındaki ilanların başvuru bağlantısı düzenli olarak yeniden çağrılıyor; çalışmayan bağlantı yayında kalmıyor.',
  },
  {
    ikon: Building2,
    baslik: 'Şirketin kendi ilanını almasını sağlıyoruz',
    govde: 'İlanını doğrudan burada açan şirkette başvuru siteden çıkmıyor ve şirket başvuruyu kendi panelinden görüyor.',
  },
  {
    ikon: FileText,
    baslik: 'Süreci anlatan rehberler yazıyoruz',
    govde: `${REHBERLER.length} rehber ve ${BOLUMLER.length} bölüm sayfası: belge, sigorta, defter, mülakat ve burs süreçleri.`,
  },
  {
    ikon: BellRing,
    baslik: 'Başvurunun durumunu takip ettiriyoruz',
    govde: 'Site içi bildirim merkezinde başvurunuzda ne değiştiğini görüyorsunuz.',
  },
] as const;

const YAPMADIKLARIMIZ = [
  {
    ikon: XCircle,
    baslik: 'Başvuruyu üzerimizden geçmeye zorlamıyoruz',
    govde: 'Derlediğimiz ilanlarda başvuru adresi şirketin kendi sayfası; araya girmiyoruz.',
  },
  {
    ikon: UserRoundX,
    baslik: 'Öğrenci bilgisi satmıyoruz',
    govde: 'Üçüncü taraflara pazarlama amacıyla veri aktarmıyoruz.',
  },
  {
    ikon: Sparkles,
    baslik: 'Sahte aciliyet üretmiyoruz',
    govde: '"Son 2 kişi", "bugün bitiyor" gibi ifadeler kullanmıyoruz. İlanda ne yazıyorsa o.',
  },
  {
    ikon: ShieldCheck,
    baslik: 'Erişim engeli aşmıyoruz',
    govde: 'Kullanım şartlarını ihlal eden yöntemlerle veri toplamıyoruz.',
  },
  {
    ikon: Tag,
    baslik: 'Olmayan özelliği "yakında" diye sunmuyoruz',
    govde: 'Hazır olmadan "var" demiyoruz; sıra da satılmıyor.',
  },
] as const;

/**
 * Form ön dolgusu ADRES SORGUSUNDAN.
 *
 * İlan detayındaki "Bu ilanı bildir" bağlantısı bilgileri sorgu
 * parametresiyle taşıyor; burada okunuyor. Uygulama içi bir durum
 * nesnesiyle taşınsaydı bağlantı kopyalanıp paylaşıldığında ön dolgu
 * kaybolurdu.
 */
function bildirimOnDolgusu(): BildirimOnDolgusu | undefined {
  if (typeof window === 'undefined') return undefined;
  const sorgu = new URLSearchParams(window.location.search);
  const al = (ad: string) => (sorgu.get(ad) || '').trim().slice(0, 600) || undefined;
  const dolgu: BildirimOnDolgusu = {
    listingUrl: al('ilan'),
    companyName: al('sirket'),
    positionTitle: al('pozisyon'),
  };
  return dolgu.listingUrl || dolgu.companyName || dolgu.positionTitle ? dolgu : undefined;
}

export const CorporateContent: React.FC<{ slug: CorporateSlug }> = ({ slug }) => {
  if (slug === 'hakkimizda') {
    return (
      <>
        <S baslik="Neden var">
          <p>
            Staj arayan bir öğrencinin zamanının büyük kısmı ilan aramakla değil,
            <strong> ilanın hâlâ açık olup olmadığını anlamaya çalışmakla</strong> geçiyor.
            Aracı sitelerde kapanmış ilanlar aylarca durabiliyor; öğrenci başvuruyor, cevap
            gelmiyor, sebebini de öğrenemiyor. Bir yandan da şirketlerin kendi kariyer
            sayfaları dağınık: aynı öğrenci onlarca siteyi tek tek gezmek zorunda kalıyor.
          </p>
          <p>
            StajımVar bu iki sorunu çözmek için var. İlanların bir kısmını{' '}
            <strong>şirketlerin kendi işe alım sistemlerinden</strong> alıyoruz; o ilanlarda
            başvuru bağlantısı şirketin kendi sayfasını gösteriyor, araya girmiyoruz.
            İlanını doğrudan StajımVar&apos;da açan şirketlerde ise başvuru siteden
            çıkmadan tamamlanıyor ve şirket başvuruyu kendi panelinden görüyor.
          </p>
        </S>

        <S baslik="Nasıl çalışıyor">
          <p>
            Kaynaklarımızın tamamı, işe alım sistemlerinin dışarıdan okunmak üzere yayımladığı
            resmî uç noktalar. Her kaynak eklenmeden önce elle inceleniyor ve{' '}
            <strong>robots kuralları kontrol ediliyor</strong>. Hangi sistemleri
            okuduğumuz aşağıda tek tek yazıyor.
          </p>
          <p>
            Kaynaklar saatte bir taranıyor; yayındaki ilanların başvuru adresleri
            ayrıca her gün yeniden kontrol ediliyor. Bir ilan iki yoldan kapanıyor:
            başvuru adresi artık ilan sunmuyorsa (sayfa kaldırılmış ya da kapandığını
            kendisi yazıyorsa) ilan yayından düşüyor; ayrıca ilanın <strong>düzenli ve
            kararlı okunduğu kaynaklarda</strong>, ilan kaynak listesinden kalktığında
            da düşüyor.
          </p>
          <p>
            <strong>Geçici erişim sorunu kapanma sayılmıyor.</strong> Sunucu hatası,
            hız sınırı ya da erişim engeli gördüğümüzde ilana dokunmuyoruz — çalışan bir
            ilanı listeden düşürmek, kapanmış bir ilanı bırakmaktan daha kötü. Aynı
            sebeple kaynak bazında otomatik düşürmeyi ancak o kaynağın ölçülmüş
            kararlılığı yeterliyse açıyoruz; kalanlarda kapanan ilanları elle
            kaldırıyoruz.
          </p>
        </S>

        {/*
          NE YAPIYORUZ / NE YAPMIYORUZ — İKİSİ DE BEŞ MADDE

          "Yapmıyoruz" listesi vardı, karşılığı yoktu: sayfada ürünün ne
          YAPTIĞI uzun paragraflara dağılmıştı ve okuyucu ancak baştan
          sona okuyarak çıkarabiliyordu. İki liste yan yana durunca
          sınır kendiliğinden okunuyor.
        */}
        <S baslik="Ne yapıyoruz">
          <MaddeListesi maddeler={YAPTIKLARIMIZ} ton="olumlu" />
        </S>

        <S baslik="Ne yapmıyoruz">
          <MaddeListesi maddeler={YAPMADIKLARIMIZ} ton="olumsuz" />
        </S>

        {/*
          TAKİP EDİLEN KAYNAKLAR

          Sayfa "altı farklı sistemden ilan alıyoruz" diyordu ama kaç
          ŞİRKET kaynağı takip edildiğini hiç yazmıyordu. Sayılar
          `automation/sources.json` dosyasından üretiliyor
          (scripts/kaynak-ozeti.mjs), yani elle yazılmış ve eskiyecek bir
          rakam yok.

          LOGO YOK, AD VAR. Logo kullanmak ortaklık ya da onay izlenimi
          üretirdi; öyle bir ilişki yok ve bu aşağıda açıkça yazıyor.
        */}
        <S baslik="Takip ettiğimiz resmî kaynaklardan bazıları">
          <p>
            Şu anda {KAYNAK_TOPLAM} <strong>etkin ilan kaynağı</strong> takip ediyoruz.
            Aşağıdaki adlar, şirketlerin ilanlarını yayımladığı işe alım sistemleri;
            parantez içindeki sayı o sistemden okuduğumuz şirket kaynağı sayısı.
          </p>
          {/*
            CANLI SAYILAR BURADA

            Bu blok "kaç kaynak" sorusunun yanına "kaç ilan, kaç kapanan,
            kaç erişilemeyen" cevaplarını koyuyor. Hepsi ayrı sorgu ve
            ölçülemeyen satır çizilmiyor.
          */}
          <CanliSayilar />
          <p>
            <strong>İki sayıyı karıştırmıyoruz.</strong> &quot;Etkin ilan kaynağı&quot;
            ilan <em>topladığımız</em> sistemler. Büyük işveren dizinindeki şirketlerin
            kariyer sayfalarından ilan toplamıyoruz; orada yalnız adresin çalıştığını ve
            staj programının açık olup olmadığını kontrol ediyoruz. Bu yüzden
            &quot;kontrol edilen işveren kariyer sayfası&quot; ayrı bir satır ve iki sayı
            hiçbir yerde toplanmıyor.
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {KAYNAK_SISTEMLERI.map((sistem) => (
              <li
                key={sistem.ad}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700"
              >
                {sistem.ad}
                <span className="ml-1 font-normal text-gray-500 tabular-nums">
                  ({sistem.adet})
                </span>
              </li>
            ))}
          </ul>
          <p>
            <strong>Bu bir ortaklık değil.</strong> Bu sistemlerle aramızda hiçbir
            ticari anlaşma, sponsorluk ya da onay ilişkisi yok. İlanları, bu
            sistemlerin dışarıdan okunmak üzere yayımladığı açık uç noktalardan
            alıyoruz ve başvuruyu ilanın kendi sayfasına geri gönderiyoruz. Adları
            burada, hangi kaynağa dayandığımızı gizlememek için yazıyoruz.
          </p>
        </S>

        <S baslik="Rehberleri nasıl yazıyoruz">
          <p>
            İlan listesinin yanında bir de rehber tarafı var: {REHBERLER.length} rehber ve{' '}
            {BOLUMLER.length} bölüm sayfası. Bunları yazarken üç kuralımız var.
          </p>
          <p>
            <strong>Yıldan yıla değişen rakam yazmıyoruz.</strong> Asgari ücrete endeksli staj
            ödemeleri, prim oranları, KYK tutarları, taban puanlar her yıl güncelleniyor.
            Sabit bir rakam bırakmak, bir süre sonra öğrenciyi yanlış yönlendirmek olur.
            Mekanizmayı anlatıp güncel rakam için resmî kaynağa yönlendiriyoruz.
          </p>
          <p>
            <strong>Okula göre değişen şeyi &quot;değişir&quot; diye yazıyoruz.</strong> Staj
            süresi, defter biçimi, kabul edilen iş yeri türü okuldan okula farklı. Tek bir
            cevap vermek yerine öğrenciyi kendi staj yönergesine yönlendiriyoruz.
          </p>
          <p>
            <strong>Yetki sınırlarını saklamıyoruz.</strong> Psikoloji öğrencisi danışan
            göremez, hukuk öğrencisi duruşmada taraf olamaz, hemşirelik öğrencisi sorumlu
            hemşire gözetimi olmadan işlem yapamaz. Bunları yazmamak öğrenciyi zor durumda
            bırakır.
          </p>
        </S>

        <S baslik="Şu an ne yapabiliyoruz, ne yapamıyoruz">
          <p>
            <strong>Yapabiliyoruz:</strong> ilan arama ve filtreleme, bölüme göre staj
            rehberleri, hesaplama araçları, öğrenci profili ve profilden yazdırılabilir
            özgeçmiş üretme. Şirketlerin StajımVar&apos;da açtığı ilanlara{' '}
            <strong>başvuru siteden çıkmadan</strong> tamamlanıyor: başvuru şirketin
            işveren paneline düşüyor, şirket durumunu oradan güncelliyor ve öğrenci
            sonucu kendi başvuru sayfasında görüyor. Şirket görüşmeye davet
            edebiliyor, öğrenci daveti yanıtlıyor, şirket teklif gönderiyor ve
            öğrenci teklifi kabul ya da reddediyor. Teklif kabul edildiğinde iki
            tarafın iletişim bilgileri karşılıklı açılıyor — o ana kadar açılmıyor.
          </p>
          <p>
            <strong>Üç ilan modelimiz var ve üçü farklı işliyor.</strong>
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Şirketin kendi sayfasında başvuru.</strong> İlanı şirketin kariyer
              sayfasında ya da başvuru sisteminde bulduysak başvuruyu biz almıyoruz: sizi
              ilanın resmî kaynağına gönderiyoruz ve süreç tamamen orada yürüyor. Bizde
              hiçbir başvuru kaydı oluşmuyor.
            </li>
            <li>
              <strong>E-postayla başvuru.</strong> Bazı ilanlarda şirket başvuruyu
              e-postayla alıyor. O ilanlarda başvurunuzu StajımVar üzerinden
              hazırlıyorsunuz ve biz şirketin ilanda yazdığı adrese <em>gerçekten</em>{' '}
              gönderiyoruz; özgeçmişiniz eke bağlanıyor. Gönderim kuyruğa alınıyor ve
              başarısız olursa yeniden deniyoruz, yani &quot;gönderildi&quot; yazısı ancak
              kalıcı olarak kaydedildiğinde çıkıyor. Şirketin cevabı kendi e-posta
              adresine geliyor; o yazışmayı biz görmüyoruz.
            </li>
            <li>
              <strong>StajımVar içinde başvuru.</strong> Şirket ilanı doğrudan burada
              açtıysa başvuru ve sonrasındaki aday süreci sitede yürüyor.
            </li>
          </ul>
          <p>
            <strong>&quot;Başvurdum&quot; işareti şirkete gitmiyor.</strong> Bir ilanı
            kendiniz için &quot;başvurdum&quot; diye işaretlediğinizde bu yalnızca sizin
            takip listenize giriyor: şirkete hiçbir bildirim, başvuru ya da veri
            gönderilmiyor. Şirketin kendi sayfasına yaptığınız başvurunun sonucunu da
            göremiyoruz — o kayıt sizin not defteriniz.
          </p>
          <p>
            <strong>Bildirimler uygulama içinde.</strong> Başvurunuzda bir şey
            değiştiğinde site içindeki bildirim merkezinde görüyorsunuz.{' '}
            <strong>SMS ya da telefon bildirimi hiç göndermiyoruz</strong> ve telefon
            numaranızı bildirim için kullanmıyoruz.
          </p>
          <p>
            <strong>Tek istisna: kayıtlı arama özeti.</strong> Bir aramayı kaydedip
            e-posta özetini kendiniz açarsanız, o aramaya uyan yeni ilanlar için{' '}
            <strong>Türkiye saatiyle günde en fazla bir</strong> özet e-postası
            gönderiyoruz. Aynı gün ikinci bir e-posta gitmiyor ve aynı ilan iki kez
            özete girmiyor. Özet kapalı gelir; açmadığınız sürece hiçbir e-posta
            gitmez ve her e-postadaki bağlantıyla tek tıkla kapatabilirsiniz.
          </p>
          <p>
            <strong>Özgeçmiş dosyası:</strong> profilinize PDF yükleyebiliyorsunuz.
            StajımVar üzerinden bir başvuru gönderdiğinizde o anki dosyanın bir
            kopyası başvuruya bağlanıyor — sonradan profilinizdeki dosyayı
            değiştirseniz bile şirketin gördüğü belge değişmiyor.
          </p>
          <p>
            <strong>Şirketler kendi ilanlarını giriyor, ama hiçbir ilan onaysız
            yayınlanmıyor.</strong> Şirket önce kendi sayfasını sahipleniyor; sonra ilanı
            yazıyor ve incelemeye gönderiyor. Onaylanana kadar ilan öğrenci listesinde
            görünmüyor. <strong>Şirketin doğrulanmış olması bu adımı atlatmıyor:</strong>{' '}
            kurumsal e-posta alan adının şirket sitesiyle eşleşmesi o kişinin orada
            çalıştığına dair bir sinyal, ilanın içeriği hakkında bir kanıt değil — ücret
            ya da teminat isteyen bir ilan da kurumsal bir adresten açılabilir. Reddedilen
            ilanda nedeni şirketin paneline yazıyoruz, şirket düzeltip yeniden
            gönderebiliyor. Kararı şirket panelinden görüyor; bu karar için
            ayrıca e-posta göndermiyoruz.
          </p>
        </S>

        <S baslik="Sitenin geliri ve bağımsızlığı">
          <p>
            StajımVar öğrenciye ücretsiz. Giderleri karşılamak için sayfalarda reklam
            alanları var ve bunu açıkça söylüyoruz. Reklamların içerikle bir ilgisi yok:{' '}
            <strong>hiçbir şirket para karşılığı ilan sırası satın alamıyor</strong> ve hiçbir
            reklamveren rehber metinlerine müdahale etmiyor.
          </p>
          <p>
            İlanların sıralaması yayın tarihine ve arama terimine göre belirleniyor; ticari
            bir anlaşmaya göre değil. Bir gün sponsorlu içerik yayımlarsak bunu ilgili
            sayfada açıkça etiketleyeceğiz.
          </p>
        </S>

        <S baslik="Kapsam ve sınırlar">
          <p>
            Kapsamımız Türkiye&apos;deki staj ilanları. Kaynak sayısı sürekli artıyor ama
            hiçbir zaman &quot;bütün staj ilanları burada&quot; demiyoruz — çünkü doğru
            olmaz. Kendi kariyer sayfası olmayan, ilanını yalnızca sosyal medyada duyuran ya
            da hiç ilan açmayan çok sayıda işletme var.
          </p>
          <p>
            Zaten rehberlerde ısrarla söylediğimiz şey de bu: stajların önemli bir kısmı ilan
            üzerinden değil, ilan açmamış bir şirkete doğrudan yazarak bulunuyor. Sitede
            aradığını bulamazsan bu bir çıkmaz değil; nasıl yapılacağını{' '}
            <strong>Staj nasıl bulunur</strong> rehberinde adım adım anlatıyoruz.
          </p>
          {/*
            KARARLAR KANITA DAYANIYOR — VE BU BİR KEZ YANLIŞ İŞLEDİ

            Sekiz şirketin staj programı bir süre "açık" göründü. Kural
            "sayfada staj programı ifadesi var VE başvuru ifadesi var"
            diyordu; eşleşen "başvuru"lar tedarikçi portalı, POS
            başvurusu ve sayfa başlığı çıktı. Kural sıkıldı ve sekizi de
            "doğrulanamadı" durumuna indi. Bunu burada yazıyoruz çünkü
            kararın kanıta dayandığını söylemek, kanıtın bir kez yanlış
            okunduğunu saklamakla birlikte olmaz.
          */}
          <p>
            <strong>Açık, belirsiz ve kapalı kararları kanıta dayanıyor.</strong> Bir
            ilanın ya da staj programının &quot;açık&quot; olduğunu ancak sayfasında o
            programa ait aktif bir başvuru yolu gördüğümüzde yazıyoruz. Şirketin genel
            kariyer sayfasının açılıyor olması <em>tek başına</em> kanıt değil ve
            &quot;açık&quot; saymıyoruz. &quot;Kapalı&quot; da yalnız başvurunun
            kapandığını açıkça söyleyen bir ifade bulduğumuzda yazılıyor; ilan
            bulamamak kapanma kanıtı değil. Geri kalan her şey{' '}
            <strong>doğrulanamadı</strong> olarak duruyor — bilmediğimizi bildiğimiz
            gibi göstermemek için.
          </p>
          <p>
            <strong>Bağlantıya ulaşamadığımızda ilanı hemen kaldırmıyoruz.</strong> Bir
            adres 403 döndüğünde, zaman aşımına düştüğünde ya da sunucu geçici olarak
            hata verdiğinde bu, ilanın bittiği anlamına gelmiyor; çoğu zaman bizim
            isteğimizin engellenmesi demek. İlanı o an silmek, hâlâ başvuru alan bir
            stajı listeden çıkarmak olurdu. Bunun yerine ilan listede kalıyor, durumu{' '}
            <strong>erişilemedi</strong> olarak işaretleniyor ve bir sonraki taramada
            yeniden deniyoruz. Kesin kapandığını gördüğümüzde kaldırıyoruz.
          </p>
        </S>

        <S baslik="Hata bulursanız">
          <p>
            Kapanmış bir ilan, yanlış bir bilgi ya da kırık bir bağlantı gördüyseniz{' '}
            <strong>İçerik ve İlan Bildirimi</strong> sayfasından ya da doğrudan{' '}
            <a href={`mailto:${ILETISIM}`} className="text-blue-600 hover:underline font-semibold">
              {ILETISIM}
            </a>{' '}
            adresinden yazabilirsiniz. Rehberlerdeki bilgiler bilgilendirme amaçlı; hukuki
            veya mali danışmanlık değil.
          </p>
        </S>
      </>
    );
  }

  if (slug === 'iletisim') {
    return (
      <>
        <S baslik="Bize ulaşın">
          <p>
            Her konu için tek adres:{' '}
            <a
              className="text-blue-600 font-semibold hover:underline"
              href={`mailto:${ILETISIM}`}
            >
              {ILETISIM}
            </a>
          </p>
          <p>Yanıt süremiz genellikle 2 iş günüdür.</p>
        </S>

        <S baslik="Hangi konuda yazmalısınız">
          <p>
            <strong>Öğrenciler:</strong> hesap sorunları, hatalı görünen ilanlar, veri
            silme talepleri.
          </p>
          <p>
            <strong>Şirketler:</strong> ilanınızın kaldırılmasını isterseniz, bilgilerinde
            düzeltme gerekiyorsa veya platforma katılmak istiyorsanız. İlan kaldırma
            talepleri öncelikli işlenir.
          </p>
          <p>
            <strong>KVKK talepleri:</strong> aynı adres. Kanun kapsamındaki başvurularınız
            en geç 30 gün içinde sonuçlandırılır.
          </p>
        </S>
      </>
    );
  }

  if (slug === 'kullanim-kosullari') {
    return (
      <>
        <S baslik="Kapsam">
          <p>
            Bu koşullar stajimvar.com'u kullanan herkes için geçerlidir. Siteyi kullanarak
            bu koşulları kabul etmiş sayılırsınız.
          </p>
        </S>

        <S baslik="Hizmetin niteliği">
          <p>
            StajımVar bir <strong>arama ve yönlendirme hizmetidir</strong>. İlan veren
            taraf değiliz, işveren değiliz, aracı kurum değiliz. İlanların içeriğinden,
            doğruluğundan ve işe alım süreçlerinden ilgili şirketler sorumludur.
          </p>
          <p>
            İlanları düzenli olarak kaynağında kontrol etsek de, bir ilanın güncelliğini
            garanti edemeyiz. Başvurmadan önce ilanın kendi sayfasını kontrol edin.
          </p>
        </S>

        <S baslik="Hesap kullanımı">
          <p>
            Hesap açarken doğru bilgi vermeniz gerekir. Hesabınızın güvenliğinden siz
            sorumlusunuz. Başkasının kimliğiyle hesap açmak, otomatik araçlarla toplu
            hesap oluşturmak veya siteyi olağan dışı yükle meşgul etmek yasaktır.
          </p>
        </S>

        <S baslik="Ücret">
          <p>
            Öğrenciler için hizmet ücretsizdir. Herhangi bir aşamada öğrencilerden ücret
            talep etmiyoruz. Sizden ücret isteyen bir ilan görürseniz{' '}
            <a className="text-blue-600 font-semibold hover:underline"href="/ilan-bildir">
              bize bildirin
            </a>
            .
          </p>
        </S>

        <S baslik="Sorumluluk sınırı">
          <p>
            Site "olduğu gibi" sunulur. İlan bilgilerindeki hata, eksiklik veya
            güncelliğini yitirme durumlarından; başvuru sonuçlarından ve şirketlerle
            aranızdaki ilişkiden doğabilecek zararlardan sorumlu tutulamayız.
          </p>
        </S>

        <S baslik="Değişiklikler ve uygulanacak hukuk">
          <p>
            Koşullarda değişiklik olursa bu sayfada yayımlanır. Uyuşmazlıklarda Türkiye
            Cumhuriyeti hukuku uygulanır ve İstanbul mahkemeleri yetkilidir.
          </p>
        </S>
      </>
    );
  }

  if (slug === 'ilan-kurallari') {
    return (
      <>
        <S baslik="İlanlar nereden geliyor">
          <p>
            İlanların bir kısmı şirketlerin kendi resmî işe alım sistemlerinden
            otomatik olarak alınır; orada başvuru şirketin kendi sayfasında
            tamamlanır. Şirketler ayrıca kendi ilanlarını girebilir: önce şirket
            sayfasını sahiplenir, sonra ilanı girer. Kurumsal e-posta alan adı
            şirketin site adresiyle eşleşiyorsa ilan doğrudan yayına çıkar,
            eşleşmiyorsa önce incelenir. O ilanlarda başvuru StajımVar üzerinde
            tamamlanır. Aşağıdaki kurallar her iki yol için de geçerlidir.
          </p>
        </S>

        <S baslik="Hangi ilanları yayımlarız">
          <p>
            Yalnızca <strong>staj, zorunlu staj, uzun dönem staj, part-time stajyer ve
            trainee</strong> nitelikli ilanlar. Tam zamanlı ve kıdem gerektiren pozisyonlar
            otomatik olarak elenir.
          </p>
          <p>
            İlanın Türkiye'de bir konuma bağlı olması veya Türkiye'den uzaktan
            yapılabilir olması gerekir.
          </p>
        </S>

        <S baslik="Yayımlamadığımız ilanlar">
          <p>
            Adaydan para talep eden, "kayıt ücreti" veya "eğitim bedeli" isteyen ilanlar;
            çok seviyeli pazarlama ve benzeri yapılar; ayrımcılık içeren ifadeler barındıran
            ilanlar (cinsiyet, yaş, etnik köken, inanç, engellilik durumu üzerinden ayrım);
            yanıltıcı unvan veya sahte şirket bilgisi içeren ilanlar; ve staj görünümlü
            ücretsiz tam zamanlı çalışma teklifleri.
          </p>
        </S>

        <S baslik="Kaldırma ve düzeltme">
          <p>
            Bir şirket kendi ilanının kaldırılmasını isterse, talep{' '}
            <strong>doğrulama beklemeden</strong> işleme alınır. Hatalı görünen bilgiler
            için de aynı adrese yazabilirsiniz.
          </p>
          <p>
            Yayındaki ilanların kaynak adresleri <strong>her gün</strong> yeniden
            kontrol ediliyor. Bir ilan yalnızca kaynağının kapandığını{' '}
            <strong>doğrulayabildiğimizde</strong> listeden düşüyor: adres kalıcı
            olarak kaldırılmışsa ya da sayfanın kendisi ilanın kapandığını
            yazıyorsa.
          </p>
          <p>
            Geçici erişim hataları tek başına ilanı kapalı saymak için{' '}
            <strong>kullanılmıyor</strong>. Zaman aşımı, erişim engeli, istek sınırı,
            sunucu hatası ve ad çözümleme hatalarında ilan yerinde kalıyor; yalnızca
            &quot;bugün doğrulanamadı&quot; olarak işaretleniyor. Yanlışlıkla kapatılan
            bir ilan, açık kalan bir ilandan daha kötü.
          </p>
        </S>
      </>
    );
  }

  return (
    <>
      <S baslik="Ne bildirebilirsiniz">
        <p>
          Sitede gördüğünüz bir ilan veya içerik hatalıysa, güncelliğini yitirmişse ya da
          kurallarımıza aykırıysa aşağıdaki formla bildirin. Bir ilan sayfasından
          geldiyseniz bağlantı, şirket ve başlık hazır gelir.
        </p>
      </S>

      {/*
        FORM SAYFANIN KENDİSİNDE

        Burada "özel bir form henüz yok, e-posta yazın" yazıyordu.
        Kapanmış bir ilanı gören öğrencinin yapacağı iş, e-posta
        istemcisi açıp bağlantıyı elle kopyalamaktı — pratikte kimse
        bildirmiyordu. Oysa kapanmış ilanı listeden düşürmek bu ürünün
        asıl vaadi.
      */}
      <S baslik="Bildirim formu">
        <IlanBildirFormu onDolgu={bildirimOnDolgusu()} />
      </S>

      <S baslik="Ne kadar sürede işlenir">
        <p>
          Bildirimleri 2 iş günü içinde inceleriz. <strong>Ücret talebi, sahte ilan veya
          ayrımcılık</strong> içeren bildirimler öncelikli ele alınır ve ilan inceleme
          süresince yayından kaldırılır.
        </p>
        <p>
          Şirketler kendi ilanlarının kaldırılmasını isterse talep doğrulama beklemeden
          uygulanır.
        </p>
      </S>

      <S baslik="Telif ve içerik hakları">
        <p>
          İlan metinleri ilgili şirketlere aittir ve kaynak sayfaya bağlantıyla birlikte
          gösterilir. İçeriğinizin kaldırılmasını isterseniz aynı adresten iletin.
        </p>
      </S>
    </>
  );
};
