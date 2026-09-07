import React from 'react';
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

export type CorporateSlug =
  | 'hakkimizda'
  | 'iletisim'
  | 'kullanim-kosullari'
  | 'ilan-kurallari'
  | 'ilan-bildir';

export const CORPORATE_ROUTES: Record<string, CorporateSlug> = {
  '/hakkimizda': 'hakkimizda',
  '/iletisim': 'iletisim',
  '/kullanim-kosullari': 'kullanim-kosullari',
  '/ilan-kurallari': 'ilan-kurallari',
  '/ilan-bildir': 'ilan-bildir',
};

export const CORPORATE_TITLES: Record<CorporateSlug, string> = {
  hakkimizda: 'Hakkımızda',
  iletisim: 'İletişim',
  'kullanim-kosullari': 'Kullanım Koşulları',
  'ilan-kurallari': 'İlan Yayınlama Kuralları',
  'ilan-bildir': 'İçerik ve İlan Bildirimi',
};

const ILETISIM = 'iletisim@stajimvar.com';

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
            Şu anda {KAYNAK_TOPLAM} şirket kaynağını takip ediyoruz. Aşağıdaki adlar,
            şirketlerin ilanlarını yayımladığı işe alım sistemleri; parantez içindeki
            sayı o sistemden okuduğumuz şirket kaynağı sayısı.
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
            <strong>İki ilan modelimiz var ve ikisi farklı işliyor.</strong>{' '}
            Şirketin kendi kariyer sayfasında ya da başvuru sisteminde bulduğumuz
            ilanlarda başvuruyu biz almıyoruz: sizi ilanın resmî kaynağına
            gönderiyoruz ve süreç orada yürüyor. Şirketin doğrudan StajımVar&apos;da
            açtığı ilanlarda ise başvuru ve sonrasındaki aday süreci burada
            yürüyor.
          </p>
          <p>
            <strong>Bildirimler uygulama içinde.</strong> Başvurunuzda bir şey
            değiştiğinde site içindeki bildirim merkezinde görüyorsunuz.{' '}
            E-posta, SMS ya da telefon bildirimi göndermiyoruz.
          </p>
          <p>
            <strong>Özgeçmiş dosyası:</strong> profilinize PDF yükleyebiliyorsunuz.
            StajımVar üzerinden bir başvuru gönderdiğinizde o anki dosyanın bir
            kopyası başvuruya bağlanıyor — sonradan profilinizdeki dosyayı
            değiştirseniz bile şirketin gördüğü belge değişmiyor.
          </p>
          <p>
            Şirketler kendi ilanlarını giriyor: önce şirket sayfasını sahipleniyor.
            Kurumsal e-posta alan adı şirketin site adresiyle eşleşiyorsa ilan doğrudan
            yayına çıkıyor; eşleşmiyorsa önce bizde inceleniyor ve o sırada listede
            görünmüyor.
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
          kurallarımıza aykırıysa bize bildirin. Bildirimler için özel bir form henüz yok;{' '}
          <a
            className="text-blue-600 font-semibold hover:underline"
            href={`mailto:${ILETISIM}?subject=${encodeURIComponent('İlan bildirimi')}`}
          >
            {ILETISIM}
          </a>{' '}
          adresine yazmanız yeterli.
        </p>
      </S>

      <S baslik="Bildiriminizde neler olmalı">
        <p>
          İlanın sitedeki bağlantısı, şirket adı ve pozisyon başlığı; sorunun ne olduğu
          (kapanmış ilan, yanlış bilgi, ücret talebi, ayrımcı ifade, sahte ilan vb.);
          varsa ekran görüntüsü.
        </p>
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
