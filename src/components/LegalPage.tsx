import React from 'react';
import { ArrowLeft, BookOpen, CalendarDays, Cookie, FileText, Flag, Info, Mail, MessageCircle, Scale, ShieldCheck } from 'lucide-react';
import { ODAK_HALKASI } from '../lib/renk-token';
import { BuSayfada, MetinBolumu, SayfaGezintisi } from './kurumsal/KurumsalKabuk';
import { Logo } from './Logo';
import { CorporateContent } from './CorporatePages';
/*
  Adres haritası artık metinlerden ayrı bir dosyada; App.tsx onu statik
  okuyabilsin diye. Bu dosya haritayı yeniden dışa veriyor:
  `scripts/onrender.mjs` LegalPage.LEGAL_ROUTES üzerinden okumaya devam
  ediyor.
*/
import {
  CORPORATE_ROUTES,
  CORPORATE_TITLES,
  LEGAL_ROUTES,
  type CorporateSlug,
  type LegalSlug,
} from '../lib/yasal-rotalar';

export { LEGAL_ROUTES, type LegalSlug } from '../lib/yasal-rotalar';

/**
 * Yasal metin sayfaları.
 *
 * İçerik sitenin BUGÜN gerçekten yaptığı işe göre yazılır; ne eksik ne fazla.
 *
 * Bu metinler bir kez ürünün gerisinde kaldı: özgeçmiş yükleme, StajımVar
 * üzerinden başvuru ve teklif kabulünden sonra iletişim paylaşımı yayına
 * girdiği hâlde sayfalar hâlâ "CV yükleyemezsiniz", "başvuru şirkete
 * iletilmez", "hiçbir bilgi paylaşılmaz" diyordu. Bunlar kozmetik değil:
 * kullanıcı, yapmadığımızı söylediğimiz bir işleme için onay vermiş oluyordu.
 *
 * ÖNEMLİ: işlenen veri ya da veriyi paylaştığımız taraf değiştiğinde bu
 * metinler yeniden yazılmalı VE `KVKK_VERSION` (src/lib/auth.ts) artırılmalı;
 * sürüm artmazsa eski onayla yeni işleme yapılmış olur.
 */


/*
  Son güncelleme tarihi SAYFA BAŞINA.

  Önce tek bir sabit vardı ve bütün yasal/kurumsal sayfalar onu gösteriyordu.
  Sorun şu: Hakkımızda yeniden yazıldığında o sabiti güncellemek, hiç
  dokunulmamış Gizlilik ve KVKK metinlerinin de "bugün güncellendi" demesine
  yol açıyordu. Bu, okuyucuya yanlış bilgi vermek olur - üstelik tam da
  güven kazanmak için koyduğumuz bir satırda.

  Yeni bir sayfa eklenirse buraya tarihi yazılmalı; yazılmazsa TEMEL
  kullanılıyor.
*/
const TEMEL_GUNCELLEME = '16 Ağustos 2026';

const GUNCELLEME: Partial<Record<LegalSlug, string>> = {
  hakkimizda: '18 Ağustos 2026',
  // Çerezsiz ziyaret ölçümü eklendi ve AdSense doğrulama betiğinin zaten
  // yüklendiği açıkça yazıldı; ikisi de bu iki metni değiştirdi.
  'cerez-politikasi': '19 Ağustos 2026',
  // Özgeçmiş yükleme, StajımVar üzerinden başvuru ve teklif sonrası iletişim
  // paylaşımı bu iki metne işlendi.
  gizlilik: '1 Eylül 2026',
  'kvkk-aydinlatma-metni': '1 Eylül 2026',
};

const guncellemeTarihi = (slug: LegalSlug) => GUNCELLEME[slug] || TEMEL_GUNCELLEME;

interface LegalPageProps {
  slug: LegalSlug;
  onBack: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <MetinBolumu baslik={title}>{children}</MetinBolumu>
);

const YASAL_BASLIK: Record<string, string> = {
  gizlilik: 'Gizlilik Politikası',
  'cerez-politikasi': 'Çerez Politikası',
  'kvkk-aydinlatma-metni': 'KVKK Aydınlatma Metni',
};

/** Başlık alanındaki tek cümlelik özet; metnin yerine geçmiyor. */
const SAYFA_OZETI: Record<LegalSlug, string> = {
  hakkimizda: 'StajımVar’ın ne yaptığı, nasıl çalıştığı ve neyi yapmadığı.',
  iletisim: 'Soru, öneri ve talepleriniz için bize nasıl ulaşacağınız.',
  'kullanim-kosullari': 'Siteyi kullanırken geçerli olan kurallar.',
  'ilan-kurallari': 'StajımVar’da ilan yayınlarken uyulması gereken kurallar.',
  'ilan-bildir': 'Hatalı, süresi geçmiş ya da kurallara aykırı bir ilanı bize bildirin.',
  gizlilik: 'Hangi verileri neden işlediğimiz ve nasıl koruduğumuz.',
  'cerez-politikasi': 'Sitede kullanılan çerezler ve ziyaret ölçümü.',
  'kvkk-aydinlatma-metni': '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.',
};

const IKON = 'h-7 w-7';
const SAYFA_IKONU: Record<LegalSlug, React.ReactNode> = {
  hakkimizda: <Info className={IKON} />,
  iletisim: <MessageCircle className={IKON} />,
  'kullanim-kosullari': <FileText className={IKON} />,
  'ilan-kurallari': <BookOpen className={IKON} />,
  'ilan-bildir': <Flag className={IKON} />,
  gizlilik: <ShieldCheck className={IKON} />,
  'cerez-politikasi': <Cookie className={IKON} />,
  'kvkk-aydinlatma-metni': <Scale className={IKON} />,
};

export const LegalPage: React.FC<LegalPageProps> = ({ slug, onBack }) => {
  const kurumsal = (Object.values(CORPORATE_ROUTES) as string[]).includes(slug)
    ? (slug as CorporateSlug)
    : null;
  const metinRef = React.useRef<HTMLElement | null>(null);

  /*
    Sayfa başlığı burada ayarlanıyor.

    Önce hiç ayarlanmıyordu: doğrudan açıldığında ön render'ın yazdığı başlık
    doğruydu ama uygulama içinden gezilince önceki sayfanın başlığı kalıyordu
    (ölçüldü). Sekmede yanlış sayfa adı görünmek, paylaşılan bağlantıda da
    yanlış ada dönüşüyor.
  */
  React.useEffect(() => {
    const ad = kurumsal ? CORPORATE_TITLES[kurumsal] : YASAL_BASLIK[slug];
    if (ad) document.title = `${ad} | StajımVar`;
  }, [slug, kurumsal]);

  const baslik = kurumsal ? CORPORATE_TITLES[kurumsal] : YASAL_BASLIK[slug];

  return (
    <div className="text-gray-900">
      {/*
        YENİ KABUK (15 Kasım 2026, kullanıcı isteği: "alttaki sayfaların
        arayüzü eski kalmış"). Metinler DEĞİŞMEDİ, yalnız kabuk:
          · üstte başlık alanı: tür, başlık, tek cümlelik özet, güncelleme
          · lg ve üstünde solda sayfalar arası gezinme + "Bu sayfada"
          · metin beyaz kartta, okunur satır uzunluğu ve aralığıyla
        Kendi üst çubuğu yok (uygulamanınki var); alt boşluk mobil
        gezinme çubuğu için.
      */}
      <header className="border-b border-gray-200 bg-white">
        <div className={`max-w-6xl mx-auto px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8 xl:px-10`}>
          <button
            type="button"
            onClick={onBack}
            className={`-ml-1 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900 ${ODAK_HALKASI}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Ana sayfa
          </button>
          <div className="mt-4 flex items-start gap-4 sm:mt-6 sm:gap-5">
            <span
              aria-hidden
              className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 sm:flex"
            >
              {SAYFA_IKONU[slug]}
            </span>
            <div className="min-w-0 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {kurumsal ? 'Kurumsal' : 'Yasal metin'}
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{baslik}</h1>
              <p className="mt-2 text-base leading-7 text-gray-600">{SAYFA_OZETI[slug]}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Son güncelleme: {guncellemeTarihi(slug)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`max-w-6xl mx-auto grid gap-6 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:pb-12 xl:px-10`}
      >
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <SayfaGezintisi aktif={slug} />
            <BuSayfada kapsayici={metinRef} anahtar={slug} />
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <article
            ref={metinRef}
            className="space-y-9 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 lg:p-10"
          >
        {kurumsal && <CorporateContent slug={kurumsal} />}

        {slug === 'gizlilik' && (
          <>
            <Section title="Kısa özet">
              <p>
                İlanlara bakmak için hesap açmanız gerekmez. Hesap açarsanız
                <strong> adınız, e-posta adresiniz</strong> ve profilinize kendi
                girdiğiniz bilgiler (üniversite, bölüm, yetenekler, tercihler)
                saklanır. Profilinize özgeçmiş dosyası da yükleyebilirsiniz.
              </p>
              <p>
                İki tür ilan var ve başvuru ikisinde farklı işliyor. Şirketin kendi
                kariyer sayfasından derlediğimiz ilanlarda sizi o sayfaya
                yönlendiririz; başvurunuz bizden geçmez. Şirketin doğrudan
                StajımVar&apos;da açtığı ilanlarda ise başvurunuzu biz alır ve o
                şirkete iletiriz — bunu her başvuruda ayrıca onaylarsınız.
              </p>
              <p>
                İletişim bilgileriniz başvuruyla birlikte paylaşılmaz. Şirket size
                teklif verir ve <strong>siz teklifi kabul ederseniz</strong> iki
                tarafın iletişim bilgileri karşılıklı açılır.
              </p>
            </Section>

            <Section title="Hangi verileri işliyoruz">
              <p>
                <strong>Hesap verisi:</strong> Kayıt olursanız ad, e-posta ve şifrenizin
                şifrelenmiş özeti. Şifrenin kendisi hiçbir yerde açık tutulmaz.
              </p>
              {/*
                JSX BOŞLUK YUTMASI — İKİ YERDE

                Metnin ortasına konan bir JSX yorumu ve bir öğeden sonraki
                satır sonu siliniyor. Burada iki kez oldu: "yetenekler," ile
                "projeler" arasında yorum vardı ve "yetenekler,projeler"
                basılıyordu; ayrıca em öğesinden sonra "girdiğinizalanlar"
                çıkıyordu. Yorum metnin dışına alındı, boşluklar açıkça
                yazıldı.
              */}
              <p>
                <strong>Profil verisi:</strong> Üniversite, bölüm, sınıf, yetenekler,{' '}
                projeler ve çalışma tercihleri gibi profilinize <em>sizin girdiğiniz</em>{' '}
                alanlar. Hepsi isteğe bağlıdır.
              </p>
              <p>
                <strong>Onay kaydı:</strong> Kayıt sırasında bu metni onayladığınız an ve
                metnin sürümü. Onayın kanıtı olarak tutulur.
              </p>
              <p>
                <strong>Teknik veri:</strong> Site Cloudflare üzerinde barındırılıyor.
                Cloudflare, hizmetin çalışması ve kötüye kullanımın engellenmesi için
                IP adresi ve tarayıcı bilgisi gibi teknik kayıtları kendi altyapısında
                tutar. Bu kayıtlara biz kişi bazında erişmiyoruz.
              </p>
              <p>
                <strong>İlan verisi:</strong> Sitede gösterilen ilanlar şirketlerin kendi
                kariyer sayfalarından ve resmî işe alım sistemlerinden derlenir. Bu veriler
                şirketlere ait olup kişisel veri içermez.
              </p>
            </Section>

            <Section title="Başvurular nasıl çalışıyor">
              <p>
                <strong>Şirketin kendi kaynağından derlenen ilanlar.</strong> Sizi
                ilanın resmî sayfasına yönlendiririz. Başvurunuz StajımVar
                üzerinden geçmez ve bizde saklanmaz.
              </p>
              <p>
                <strong>Şirketin StajımVar&apos;da açtığı ilanlar.</strong> Başvuru
                siteden çıkmadan tamamlanır ve ilanı açan şirkete iletilir. Her
                başvuruda bu aktarımı ayrıca onaylarsınız; onay anı kayda geçer.
                Başvuru yalnızca <strong>doğrulanmış</strong> şirketlere iletilir ve
                bir şirket yalnızca kendi ilanlarına yapılan başvuruları görebilir.
              </p>
              <p>
                <strong>Şirketin gördüğü bilgi.</strong> Başvuru sırasında profilinizin
                ve özgeçmiş dosyanızın o anki bir kopyası başvuruya bağlanır; sonradan
                profilinizi değiştirseniz bile şirketin gördüğü belge değişmez. Bu
                kopyaya <strong>e-posta ve telefon bilgileriniz alınmaz</strong>.
              </p>
              <p>
                <strong>İletişim bilgileri ne zaman açılır.</strong> Şirket süreci
                panelinden yürütür: görüşmeye davet eder, teklif gönderir. İletişim
                bilgileri yalnızca <strong>siz teklifi kabul ettiğinizde</strong> ve
                karşılıklı olarak açılır. Teklifi reddederseniz ya da başvurunuzu geri
                çekerseniz açılmaz.
              </p>
            </Section>

            <Section title="Üçüncü taraflar">
              <p>
                Site, ilan verisini saklamak için Supabase (sunucu bölgesi: Frankfurt,
                Almanya) ve barındırma için Cloudflare altyapısını kullanır. Reklam
                tarafında Google AdSense entegre: doğrulama betiği her sayfada
                yükleniyor, reklam birimi ise yalnızca öğrenci rehberlerinin bir
                bölümünde çiziliyor. İlan, şirket, burs ve etkinlik sayfalarında reklam
                birimi yok. Ayrıntısı{' '}
                <a href="/cerez-politikasi" className="text-blue-600 hover:underline">
                  Çerez Politikası
                </a>{' '}
                sayfasında.
              </p>
            </Section>

            <Section title="Verilerinizi nasıl koruyoruz">
              <p>
                <strong>Satır düzeyinde erişim denetimi.</strong> Veritabanındaki her
                tabloda satır bazlı güvenlik açık. Bir öğrenci yalnızca kendi profilini
                ve kendi başvurularını okuyabilir; bu kural uygulama kodunda değil,
                veritabanının kendisinde tanımlı. Uygulama hata yapsa bile başkasının
                verisi dönmez.
              </p>
              <p>
                <strong>Kolon düzeyinde kısıtlama.</strong> Şirketlerin işe alım e-posta
                adresi gibi hassas alanlar tarayıcıya hiç gönderilmez; bu alanlarda
                okuma yetkisi tarayıcıdan tamamen alınmıştır.
              </p>
              <p>
                <strong>Şifreler.</strong> Şifreniz hiçbir yerde açık tutulmaz; yalnızca
                geri döndürülemez şifreli özeti saklanır. Biz de göremeyiz.
              </p>
              <p>
                <strong>Yönetici anahtarları.</strong> Veritabanına tam yetkiyle erişen
                anahtarlar yalnızca sunucu tarafında bulunur, hiçbir koşulda tarayıcıya
                gönderilmez. Her yayın öncesi paketin içinde bu anahtarların bulunmadığı
                otomatik olarak denetlenir.
              </p>
              <p>
                <strong>Bağlantı güvenliği.</strong> Site ve veritabanı arasındaki tüm
                trafik şifrelidir (HTTPS/TLS).
              </p>
              <p>
                <strong>Dosyalar.</strong> Yüklediğiniz özgeçmiş dosyasına yalnızca siz
                erişebilirsiniz. Bir şirket bu dosyayı ancak o şirketin ilanına
                başvurduysanız ve yalnızca başvuruya bağlanan kopya üzerinden görebilir.
                Dosyayı profilinizden değiştirebilir ya da kaldırabilirsiniz; bu, daha
                önce gönderdiğiniz başvurulardaki kopyayı değiştirmez. Şirket logoları
                gibi kamuya açık görseller ayrı bir alanda tutuluyor.
              </p>
            </Section>

            <Section title="Bir ihlal olursa">
              <p>
                Kişisel verilerin hukuka aykırı biçimde ele geçirildiğini tespit edersek,
                KVKK'nın öngördüğü şekilde en kısa sürede (en geç 72 saat içinde) Kişisel
                Verileri Koruma Kurulu'na bildiririz ve etkilenen kullanıcılara e-posta
                ile haber veririz.
              </p>
            </Section>

            <Section title="Haklarınız">
              <p>
                KVKK madde 11 kapsamında verilerinize erişme, düzeltme, silme ve
                işlemeye itiraz etme haklarına sahipsiniz. Hesabınızı silmek isterseniz
                aşağıdaki adrese yazmanız yeterli; hesap ve profil kayıtları silinir.
              </p>
            </Section>

            <Section title="Bu metin ne zaman değişecek">
              <p>
                İşlediğimiz veri ya da veriyi paylaştığımız taraflar değiştiğinde bu
                metin yeniden yazılır ve onay sürümü artırılır. Değişiklik tarihini bu
                sayfanın başında görebilirsiniz.
              </p>
            </Section>
          </>
        )}

        {slug === 'cerez-politikasi' && (
          <>
            <Section title="Kullandığımız çerezler">
              <p>
                Site <strong>takip çerezi kullanmıyor</strong> ve ziyaretinizi kişi
                bazında izlemiyor.
              </p>
              <p>
                <strong>Ziyaret ölçümü:</strong> Hangi sayfaların ne kadar görüntülendiğini
                Cloudflare Web Analytics ile sayıyoruz. Bu araç{' '}
                <strong>çerez koymuyor</strong> ve parmak izi çıkarmıyor; ziyaret edilen
                adres, yönlendiren site, ülke ve tarayıcı türü gibi toplu veriler
                kaydediliyor. Sizi tanımlayan bir kayıt tutulmuyor, bu yüzden onay bandı da
                göstermiyoruz.
              </p>
              <p>
                <strong>Reklam:</strong> AdSense betiği her sayfada yükleniyor; reklam
                birimi ise yalnızca öğrenci rehberlerinin bir bölümünde çiziliyor. İlan,
                şirket, burs, fırsat ve etkinlik sayfalarında reklam birimi yok. Google bir reklam
                gösterdiğinde kendi reklam ve ölçüm çerezlerini kullanabiliyor; bu
                çerezler bize değil Google'a ait ve verileri nasıl işlediğini kendi
                gizlilik politikasında açıklıyor. Birimlere her zaman reklam dönmüyor,
                ama betik yüklendiği için bu bölüm "reklam yok" diye okunmamalı.
                Kişiselleştirilmiş reklamı{' '}
                <a
                  href="https://myadcenter.google.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Google reklam ayarları
                </a>{' '}
                sayfasından kapatabilirsiniz.
              </p>
              <p>
                Hesabınız varsa oturumunuzu açık tutmak için bir <strong>oturum
                belirteci</strong> tarayıcınızda saklanır. Zorunludur; olmadan her sayfada
                yeniden giriş yapmanız gerekirdi. Çıkışta silinir.
              </p>
              <p>
                {/*
                  JSX'te bir öğeden sonra gelen satır sonu YUTULUYOR: burada
                  "için" ile <code> ve </code> ile "adlı" birbirine
                  yapışıyordu ("içinstajimvar_themeadlı"). Boşluklar açıkça
                  yazılıyor.
                */}
                Bunun dışında yerel depoda hiçbir tercih saklamıyoruz. Daha önce
                tema tercihiniz için{' '}
                <code className="px-1.5 py-0.5 rounded bg-gray-100 text-xs">
                  stajimvar_theme
                </code>{' '}
                adlı bir kayıt tutuluyordu; karanlık tema kaldırıldığı için bu
                kayıt artık oluşturulmuyor ve siteyi bir sonraki açışınızda
                tarayıcınızdan otomatik olarak siliniyor.
              </p>
            </Section>

            <Section title="Cloudflare">
              <p>
                Site Cloudflare üzerinden sunulduğu için, güvenlik ve bot koruması amacıyla
                Cloudflare kaynaklı teknik çerezler oluşabilir. Bunlar hizmetin çalışması
                için gereklidir ve pazarlama amacı taşımaz.
              </p>
            </Section>

            {/*
              "Reklamlar" başlıklı ayrı bir bölüm daha vardı ve yukarıdaki
              "Reklam" maddesiyle neredeyse aynı cümleleri tekrar ediyordu.
              Aynı şeyi iki kez söyleyen bir politika metni, okuyanı hangisinin
              geçerli olduğunu aramaya itiyor. Tek maddede birleşti; oradaki
              tek yeni bilgi (Google reklam ayarları) yukarı taşındı.
            */}
          </>
        )}

        {slug === 'kvkk-aydinlatma-metni' && (
          <>
            <Section title="İşlenen veriler ve amaçları">
              <p>
                6698 sayılı Kanun kapsamında veri sorumlusu StajımVar'dır. İlanlara
                bakmak için hesap gerekmez; hesap açtığınızda aşağıdaki veriler işlenir.
              </p>
              <p>
                <strong>Ad ve e-posta</strong> — hesabı oluşturmak ve girişi doğrulamak
                için; hukuki sebep sözleşmenin kurulması (m.5/2-c).
              </p>
              <p>
                <strong>Profil bilgileri ve özgeçmiş dosyası</strong> — ilanları
                uygunluğa göre sıralamak ve başvurunuzu oluşturmak için; tamamı
                isteğe bağlıdır ve yalnızca sizin girdiğiniz kadarıyla işlenir.
              </p>
              <p>
                <strong>Başvuru kaydı</strong> — StajımVar&apos;da açılmış bir ilana
                başvurduğunuzda; hukuki sebep açık rıza (m.5/1). Rızayı başvuru anında
                verirsiniz ve bu an kayda geçer.
              </p>
              <p>
                <strong>Onay kaydı</strong> — bu metni onayladığınız an ve sürümü; hukuki
                sebep hukuki yükümlülük (m.5/2-ç).
              </p>
              <p>
                <strong>Aktarım:</strong> Hesap ve profil verileriniz pazarlama amacıyla
                üçüncü taraflara aktarılmaz ve satılmaz. Tek aktarım şudur:
                StajımVar&apos;da açılmış bir ilana başvurduğunuzda, başvurunuz ve ona
                bağlanan profil/özgeçmiş kopyası <strong>o ilanı açan doğrulanmış
                şirkete</strong> iletilir. Bu kopyaya e-posta ve telefon bilgileriniz
                alınmaz; iletişim bilgileri yalnızca şirketin teklifini kabul ettiğinizde
                karşılıklı açılır. Barındırma Supabase (Frankfurt) ve Cloudflare
                altyapısındadır; bu sağlayıcılar veriyi bizim adımıza saklar. Ziyaret
                ölçümü Cloudflare Web Analytics ile yapılıyor ve kişisel veri içermiyor;
                ayrıntısı{' '}
                <a href="/cerez-politikasi" className="text-blue-600 hover:underline">
                  Çerez Politikası
                </a>{' '}
                sayfasında.
              </p>
              <p>
                <strong>Saklama:</strong> Hesabınız açık kaldığı sürece. Hesap silindiğinde
                profil ve hesap kayıtları silinir; onay kaydı ispat yükümlülüğü nedeniyle
                kanuni zamanaşımı süresince saklanır.
              </p>
            </Section>

            <Section title="Veri güvenliği">
              <p>
                Verileriniz satır bazlı erişim denetimiyle korunur: bir kullanıcı
                yalnızca kendi kaydını okuyabilir ve bu kural veritabanı düzeyinde
                tanımlıdır. Şifreler geri döndürülemez biçimde saklanır. Yönetici
                anahtarları yalnızca sunucuda bulunur. Ayrıntılar için{' '}
                <a
                  className="text-blue-600 font-semibold hover:underline"
                  href="/gizlilik"
                >
                  Gizlilik Politikası
                </a>
                .
              </p>
            </Section>

            <Section title="Neyi yapmıyoruz">
              <p>
                Şirketin kendi kariyer sayfasından derlediğimiz ilanlarda başvuru bizden
                geçmez: sizi resmî sayfaya yönlendiririz ve o başvuruya ait hiçbir veri
                bizde oluşmaz. Bir ilanı yalnızca &quot;başvurdum&quot; diye
                işaretlerseniz bu kayıt sizin takip listenizdir; şirkete gönderilmez.
              </p>
              <p>
                Bildirimleri yalnızca site içinde gösteriyoruz; e-posta, SMS ya da
                telefon bildirimi göndermiyoruz. Öğrenci verisi satmıyoruz ve pazarlama
                amacıyla üçüncü taraflara aktarmıyoruz.
              </p>
              <p>
                KVKK m.11 kapsamındaki taleplerinizi aşağıdaki adrese iletebilirsiniz.
              </p>
            </Section>
          </>
        )}

          </article>

          <section
            aria-label="İletişim"
            className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-gray-900">Sorunuz mu var?</p>
                <p className="text-sm text-gray-600">Yanıt süremiz genellikle 2 iş günü.</p>
              </div>
            </div>
            <a
              href="mailto:iletisim@stajimvar.com"
              className={`inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700 ${ODAK_HALKASI}`}
            >
              iletisim@stajimvar.com
            </a>
          </section>

          {/* Telefonda sol sütun yok: öteki sayfalar metnin altında, liste olarak. */}
          <div className="lg:hidden">
            <SayfaGezintisi aktif={slug} />
          </div>
        </div>
      </div>
    </div>
  );
};
