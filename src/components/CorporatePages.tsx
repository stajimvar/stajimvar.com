import React from 'react';

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
        <S baslik="Ne yapıyoruz">
          <p>
            StajımVar, Türkiye'deki staj ilanlarını tek yerde toplayan bir arama ve
            başvuru platformudur. İlanları aracı sitelerden değil,{' '}
            <strong>şirketlerin kendi kariyer sistemlerinden</strong> (Lever, Greenhouse,
            Workable, Ashby, Workday gibi resmî işe alım platformları) alırız.
          </p>
        </S>

        <S baslik="Neden böyle">
          <p>
            Staj arayan bir öğrencinin en büyük derdi, ilanın hâlâ açık olup olmadığını
            bilememek. Aracı sitelerde kapanmış ilanlar aylarca durabiliyor. Biz her ilanı
            kaynağında düzenli olarak kontrol ediyoruz; kaynakta kapandığında listeden
            düşürüyoruz.
          </p>
          <p>
            Başvuru adresi de her zaman ilanın kendi sayfasıdır. Araya girmiyoruz,
            başvurunu bizim üzerimizden geçmeye zorlamıyoruz.
          </p>
        </S>

        <S baslik="Şu an ne yapabiliyoruz, ne yapamıyoruz">
          <p>
            <strong>Yapabiliyoruz:</strong> ilan arama ve filtreleme, öğrenci profili,
            başvurularını tek yerden takip.
          </p>
          <p>
            <strong>Henüz yapamıyoruz:</strong> özgeçmiş yükleme, platform üzerinden
            başvuruyu şirkete iletme, şirket hesapları. Bunlar üzerinde çalışıyoruz; hazır
            olmadan "var" demiyoruz.
          </p>
        </S>

        <S baslik="Kapsam">
          <p>
            Kaynak sayımız sürekli artıyor ve her kaynak elle inceleniyor. Yalnızca
            sağlayıcıların dışarıdan okunmak üzere yayımladığı resmî uç noktaları
            kullanırız; kullanım şartlarını ihlal eden veya erişim engeli aşan yöntemler
            kullanmayız.
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
            İlanların tamamı şirketlerin kendi resmî işe alım sistemlerinden otomatik
            olarak alınır. Şu anda şirketler doğrudan ilan yayımlayamıyor; bu özellik
            açıldığında aşağıdaki kurallar onlar için de geçerli olacak.
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
            Kaynağında kapanan ilanlar, üç ardışık kontrolde görülmezse ve en az 48 saat
            geçmişse otomatik olarak listeden düşürülür.
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
