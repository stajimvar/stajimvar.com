import React from 'react';
import { BOLUMLER } from '../data/bolumler';
import { REHBERLER } from '../data/rehberler';

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
            resmî uç noktalar. Şu anda altı farklı sistemden ilan alıyoruz: Lever, Greenhouse,
            Ashby, Workable, Workday ve SmartRecruiters. Her kaynak eklenmeden önce elle
            inceleniyor ve <strong>robots kuralları kontrol ediliyor</strong>.
          </p>
          <p>
            Kaynaklar saatte bir kontrol ediliyor. Yeni ilan çıktığında listeye giriyor.
            Kapanan ilanların otomatik düşürülmesi şu anda <strong>tek bir kaynakta</strong>
            açık; kalan kaynaklarda kapanan ilanları elle kaldırıyoruz. Kapsamı adım adım
            genişletiyoruz. Bunu <strong>İlan kuralları</strong> sayfasında da açıkça
            yazıyoruz çünkü bu, sitenin bugünkü en zayıf noktası ve saklamanın anlamı yok.
          </p>
        </S>

        <S baslik="Neyi yapmıyoruz">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Başvuruyu kendi üzerimizden geçmeye zorlamıyoruz. Şirketin kariyer
              kaynağından derlediğimiz ilanlarda başvuru adresi şirketin kendi sayfası
              olmaya devam ediyor; StajımVar üzerinden başvuru yalnızca ilanı buraya
              kendisi açan şirketlerde var, çünkü onu isteyen taraf şirketin kendisi.
            </li>
            <li>
              Öğrenci bilgisi satmıyoruz, üçüncü taraflara pazarlama amacıyla aktarmıyoruz.
            </li>
            <li>
              Sahte aciliyet üretmiyoruz: &quot;son 2 kişi&quot;, &quot;bugün bitiyor&quot;
              gibi ifadeler kullanmıyoruz. İlanda ne yazıyorsa o.
            </li>
            <li>
              Kullanım şartlarını ihlal eden veya erişim engeli aşan yöntemlerle veri
              toplamıyoruz.
            </li>
            <li>
              Var olmayan bir özelliği &quot;yakında&quot; diye sunmuyoruz. Hazır olmadan
              &quot;var&quot; demiyoruz.
            </li>
          </ul>
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
            sonucu kendi başvuru sayfasında görüyor.
          </p>
          <p>
            <strong>Henüz yapamıyoruz:</strong> özgeçmiş dosyası yükleme. Başvuruya
            profilinizden üretilen özgeçmiş bilgisi gidiyor, yüklediğiniz bir PDF değil.
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
            Kaynağında kapanan ilanlar için kurduğumuz kural şu: bir ilan üç ardışık
            kontrolde görülmezse ve en az 48 saat geçmişse otomatik olarak listeden
            düşürülür. <strong>Bu otomatik düşürme şu an devre dışı</strong> — sağlıklı
            tarama geçmişi birikmeden açılırsa sistem ilk çalıştırmada her ilanı
            kaybolmuş sayar. O zamana kadar kapanmış bir ilan görürseniz bize bildirin,
            elle kaldırıyoruz.
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
