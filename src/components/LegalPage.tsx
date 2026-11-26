import React from 'react';
import { ArrowLeft, BookOpen, CalendarDays, Cookie, FileText, Flag, Info, Lock, Mail, MessageCircle, Scale, ShieldCheck } from 'lucide-react';
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
  // 24 Kasım 2026: profil fotoğrafı, sosyal profil ve mesajlar, onaya bağlı
  // iletişim paylaşımı, bildirim e-postaları (Resend), kendi ziyaret ölçümümüz,
  // zorunlu okul/bölüm/şehir ve kullanıcının kendi hesabını silmesi işlendi.
  // "E-posta göndermiyoruz" ve "teklif kabulünde iletişim açılır" ifadeleri
  // artık doğru değildi.
  gizlilik: '24 Kasım 2026',
  'kvkk-aydinlatma-metni': '24 Kasım 2026',
  // 26 Kasım 2026: Güven Merkezi ilk kez yayımlandı.
  guvenlik: '26 Kasım 2026',
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
  guvenlik: 'Güven Merkezi',
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
  guvenlik: 'Verileriniz nerede duruyor, kim görebiliyor ve nasıl korunuyor — tek sayfada.',
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
  guvenlik: <Lock className={IKON} />,
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
                İlanlara bakmak için hesap açmanız gerekmez. Hesap açarsanız{' '}
                <strong>adınız, e-posta adresiniz</strong> ve profilinize girdiğiniz
                bilgiler saklanır. Öğrenci hesabında okul, bölüm ve yaşadığınız şehir
                zorunludur; geri kalan profil alanları, profil fotoğrafı ve özgeçmiş
                dosyası isteğe bağlıdır.
              </p>
              <p>
                İki tür ilan var ve başvuru ikisinde farklı işliyor. Şirketin kendi
                kariyer sayfasından derlediğimiz ilanlarda sizi o sayfaya
                yönlendiririz; başvurunuz bizden geçmez. Şirketin doğrudan
                StajımVar&apos;da açtığı ilanlarda ise başvurunuzu biz alır ve o
                şirkete iletiriz — bunu her başvuruda ayrıca onaylarsınız.
              </p>
              <p>
                Telefon ve e-posta bilgileriniz başvuruyla birlikte{' '}
                <strong>yalnızca siz ayrıca onaylarsanız</strong> paylaşılır. Hesabınızı
                istediğiniz zaman profil ayarlarınızdan kendiniz silebilirsiniz.
              </p>
            </Section>

            <Section title="Hangi verileri işliyoruz">
              <p>
                <strong>Hesap verisi:</strong> Ad, e-posta ve şifrenizin şifrelenmiş özeti.
                Google ya da Microsoft hesabınızla giriş yaparsanız şifre bizde tutulmaz;
                sağlayıcıdan yalnızca adınızı ve e-posta adresinizi alırız.
              </p>
              <p>
                <strong>Profil verisi:</strong> Okul, bölüm ve şehir (öğrenci hesabında
                zorunlu; size uygun ilanları ve haftalık özeti bunlarla hazırlıyoruz).
                Bunun dışında sınıf, yetenekler, projeler, deneyimler, çalışma tercihleri
                ve telefon gibi profilinize <em>sizin girdiğiniz</em>{' '}
                alanlar; hepsi isteğe bağlıdır.
              </p>
              <p>
                <strong>Profil fotoğrafı ve özgeçmiş dosyası:</strong> İsteğe bağlı. Kapalı
                bir depolama alanında tutulur, herkese açık bir adresi yoktur.
              </p>
              <p>
                <strong>Sosyal profil ve içerik:</strong> Kullanıcı adınız, paylaşımlarınız,
                bağlantılarınız, katıldığınız topluluklar ve gönderdiğiniz mesajlar. Bunları
                yalnızca siz oluşturursanız işleriz.
              </p>
              <p>
                <strong>Bildirim ve e-posta tercihleri:</strong> Hangi bildirimleri e-posta
                ile almak istediğiniz; kaydettiğiniz aramalar ve takip ettiğiniz şirketler.
              </p>
              <p>
                <strong>Onay kayıtları:</strong> Bu metni onayladığınız an ve metnin sürümü;
                başvuruda iletişim bilgilerinizin paylaşılmasına onay verdiyseniz onun anı.
              </p>
              <p>
                <strong>Ziyaret ölçümü:</strong> Sitenin hangi sayfalarının ziyaret
                edildiğini kendimiz sayıyoruz. Kaydedilen: sekmeye özel rastgele bir oturum
                kimliği (tarayıcınızın oturum deposunda, sekme kapanınca silinir), açılan
                sayfa, yönlendiren site, cihaz türü ve barındırma sağlayıcımızın isteğe
                eklediği yaklaşık şehir ve ülke. Giriş yaptıysanız kullanıcı kimliğiniz de
                eklenir; yönetim panelindeki &quot;son görülme&quot; tarihi bundan çıkar. IP
                adresinizi bu kayıtlara yazmıyoruz. Bot olarak tanınan istekler kaydedilmez.
              </p>
              <p>
                <strong>Teknik veri:</strong> Site Cloudflare üzerinde barındırılıyor.
                Cloudflare, hizmetin çalışması ve kötüye kullanımın engellenmesi için IP
                adresi ve tarayıcı bilgisi gibi teknik kayıtları kendi altyapısında tutar.
              </p>
              <p>
                <strong>İlan verisi:</strong> Sitede gösterilen ilanlar şirketlerin kendi
                kariyer sayfalarından ve resmî işe alım sistemlerinden derlenir ya da
                şirketlerce doğrudan açılır. Kişisel veri içermez.
              </p>
            </Section>

            <Section title="Kim neyi görür">
              <p>
                <strong>Profil fotoğrafınız</strong> sosyal profilinizi görebilen giriş
                yapmış kullanıcılara ve başvurduğunuz şirkete görünür.
              </p>
              <p>
                <strong>Paylaşımlarınız</strong> varsayılan olarak yalnızca
                bağlantılarınıza, isterseniz alan topluluğunuza görünür. Mesajlarınızı
                yalnızca konuştuğunuz kişi görür.
              </p>
              <p>
                <strong>Başvurduğunuz şirket</strong> başvuru anındaki profil ve özgeçmiş
                kopyanızı görür. Bu kopyaya e-posta ve telefon bilgileriniz alınmaz.
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
                <strong>Şirketin gördüğü bilgi.</strong> Başvuru sırasında profilinizin,
                profil fotoğrafınızın ve özgeçmiş dosyanızın o anki bir kopyası başvuruya
                bağlanır; sonradan profilinizi değiştirseniz bile şirketin gördüğü belge
                değişmez.
              </p>
              <p>
                <strong>İletişim bilgileri.</strong> Başvururken telefon ve e-postanızın
                şirketle paylaşılmasını ayrıca onaylayabilirsiniz. Onaylarsanız bunları
                ilanı açan şirketin yetkili ekip üyeleri (şirket sahibi ve işe alım
                sorumluları) görür; şirketin yalnızca görüntüleme yetkili üyeleri görmez.
                Onaylamazsanız paylaşılmaz ve bu tercihi sonradan değiştirebilirsiniz.
                Özgeçmiş dosyanızın kendisinde iletişim bilgisi varsa, şirket onu dosyada
                görebilir.
              </p>
            </Section>

            <Section title="E-postalar">
              <p>
                Hesap onayı, şifre yenileme ve giriş bağlantısı gibi kimlik e-postalarını
                gönderiyoruz. Bunun dışında bazı bildirimleri e-postayla da iletiyoruz:
                şirketlere yeni başvuru, öğrencilere takip ettikleri şirketin yeni ilanı ve
                pazartesi günleri haftalık özet. Haftalık özet ve takip bildirimlerini{' '}
                <a href="/ayarlar/bildirimler" className="text-blue-600 hover:underline">
                  Bildirim ayarları
                </a>{' '}
                sayfasından kapatabilirsiniz. SMS göndermiyoruz, sizi aramıyoruz ve
                e-posta adresinizi pazarlama amacıyla kimseyle paylaşmıyoruz.
              </p>
            </Section>

            <Section title="Üçüncü taraflar">
              <p>
                Hizmeti çalıştırmak için şu sağlayıcıları kullanıyoruz; veriyi bizim
                adımıza ve bizim talimatımızla işlerler:
              </p>
              <p>
                <strong>Supabase</strong> — veritabanı, dosya deposu ve kimlik doğrulama
                (sunucu bölgesi: Frankfurt, Almanya). <strong>Cloudflare</strong> — barındırma
                ve güvenlik. <strong>Google Workspace</strong> — kimlik e-postalarının
                gönderimi. <strong>Resend</strong> — bildirim e-postalarının gönderimi (ABD
                merkezli). <strong>Google ve Microsoft</strong> — yalnızca o hesapla giriş
                yapmayı seçerseniz.
              </p>
              <p>
                Reklam tarafında Google AdSense entegre: doğrulama betiği her sayfada
                yükleniyor, reklam birimi ise yalnızca öğrenci rehberlerinin bir
                bölümünde çiziliyor. Ayrıntısı{' '}
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
                <strong>Kolon düzeyinde kısıtlama.</strong> Hassas alanlar tarayıcıya hiç
                gönderilmez; bu alanlarda okuma yetkisi tarayıcıdan tamamen alınmıştır.
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
                <strong>Dosyalar.</strong> Özgeçmiş dosyanıza ve profil fotoğrafınıza
                yalnızca yukarıda anlatılan kişiler erişebilir; herkese açık adresleri
                yoktur. Dosyayı profilinizden değiştirebilir ya da kaldırabilirsiniz; bu,
                daha önce gönderdiğiniz başvurulardaki kopyayı değiştirmez.
              </p>
            </Section>

            <Section title="Hesabınızı silmek">
              <p>
                Hesabınızı kendiniz silebilirsiniz: profil düzenleme sayfasının en
                altındaki <strong>Hesabımı sil</strong> bağlantısı (şirket hesaplarında
                şirket profilindeki e-posta tercihlerinin altında). Silme geri alınamaz.
              </p>
              <p>
                Silindiğinde hesabınız, profiliniz, profil fotoğrafınız ve özgeçmiş
                dosyanız, başvurularınız (şirketlere iletilen kopyalar dahil), sosyal
                profiliniz, paylaşımlarınız, mesajlarınız, bildirimleriniz, kayıtlı
                aramalarınız ve onay kayıtlarınız silinir. Ziyaret ölçümü kayıtlarındaki
                kullanıcı kimliğiniz kaldırılır; kayıtlar kimliksiz olarak kalır.
              </p>
              <p>
                Bir şirketin tek sahibiyseniz, şirket sahipsiz kalmasın diye önce
                sahipliği devretmeniz gerekir.
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
                işlemeye itiraz etme haklarına sahipsiniz. Hesabınızı yukarıda anlatıldığı
                gibi kendiniz silebilir, diğer talepleriniz için aşağıdaki adrese
                yazabilirsiniz.
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

        {/*
          GÜVEN MERKEZİ (26 Kasım 2026)

          Bir kariyer merkezi görüşmesinde "öğrenci verileri nasıl
          saklanıyor ve korunuyor, satılıyor mu?" soruldu. Cevap gizlilik
          ve KVKK metinlerine dağılmıştı; bu sayfa tek yerde topluyor.

          YALNIZ DOĞRULANMIŞ İDDİA: her cümlenin karşılığı kodda ya da
          veritabanında var (RLS politikaları, `basvuru_iletisimi_acik`,
          kapalı `cvs` kovası, CV_IMZA_OMRU = 600 sn, HesapSilmePenceresi).
          Kendi sertifikamız ya da bağımsız denetimimiz YOK; sertifikalar
          altyapı sağlayıcılarına ait ve öyle yazılıyor. Yönetici erişimi
          gizlenmiyor. Yeni bir işleme ya da aktarım eklenirse gizlilik ve
          KVKK metinleriyle birlikte bu sayfa da güncellenmeli.
        */}
        {slug === 'guvenlik' && (
          <>
            <Section title="Kısa özet">
              <p>
                <strong>Öğrenci verisi satmıyoruz</strong> ve pazarlama amacıyla kimseyle
                paylaşmıyoruz. Verileriniz Avrupa Birliği&apos;ndeki (Frankfurt) sunucularda,
                şifreli olarak saklanıyor. Bir şirket bilginizi yalnızca onun ilanına
                başvurduğunuzda görüyor; telefon, e-posta ve özgeçmişiniz ise yalnızca siz o
                başvuru için ayrıca onay verirseniz açılıyor.
              </p>
              <p>
                Bu sayfa nasıl çalıştığımızı sade bir dille anlatıyor. Hukuki metinler{' '}
                <a href="/kvkk-aydinlatma-metni" className="font-semibold text-blue-700 hover:underline">
                  KVKK Aydınlatma Metni
                </a>{' '}
                ve{' '}
                <a href="/gizlilik" className="font-semibold text-blue-700 hover:underline">
                  Gizlilik Politikası
                </a>
                &apos;dır; ikisi arasında fark olursa onlar geçerlidir.
              </p>
            </Section>

            <Section title="Verileriniz nerede saklanıyor">
              <p>
                Hesap, profil, başvuru ve özgeçmiş dosyaları <strong>Supabase</strong>{' '}
                altyapısında, Almanya&apos;daki (Frankfurt, AB) sunucularda tutuluyor. Site{' '}
                <strong>Cloudflare</strong> üzerinden yayınlanıyor. Bildirim e-postalarını{' '}
                <strong>Resend</strong> (ABD), giriş ve kimlik e-postalarını{' '}
                <strong>Google Workspace</strong> gönderiyor. Bu sağlayıcılar veriyi yalnızca
                bizim adımıza ve bu hizmet için işliyor.
              </p>
              <p>
                Veriler sitenizle sunucu arasında taşınırken (HTTPS) ve sunucuda saklanırken
                şifreleniyor. Şifreler düz metin olarak tutulmuyor; Google ya da Microsoft
                hesabıyla girerseniz şifreniz hiç bize gelmiyor.
              </p>
              <p>
                Altyapı sağlayıcılarımız bağımsız denetimlerden geçiyor: Supabase&apos;in SOC 2
                Type II raporu, Cloudflare&apos;in ISO 27001 sertifikası var. Ayrıntılar
                sağlayıcıların kendi sayfalarında:{' '}
                <a
                  href="https://supabase.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Supabase güvenlik
                </a>
                ,{' '}
                <a
                  href="https://www.cloudflare.com/trust-hub/compliance-resources/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Cloudflare uyumluluk
                </a>
                . Bu sertifikalar sağlayıcılara aittir; StajımVar&apos;ın kendi adına aldığı bir
                sertifika ya da bağımsız denetim raporu henüz yok.
              </p>
            </Section>

            <Section title="Kim neyi görebiliyor">
              <p>
                <strong>Siz:</strong> kendi hesabınızdaki her bilgiyi görür, değiştirir ve
                silebilirsiniz.
              </p>
              <p>
                <strong>Şirketler:</strong> yalnızca StajımVar&apos;da açtıkları ilana başvuran
                öğrencinin başvurusunu görür. Başka şirkete yaptığınız başvuruyu ya da
                profilinizin tamamını göremez. Şirketin bunun için tarafımızdan doğrulanmış
                olması gerekir; doğrulanmamış bir şirket yalnızca başvuru sayısını görür.
              </p>
              <p>
                <strong>Telefon, e-posta ve özgeçmiş:</strong> yalnızca siz o başvuru için
                paylaşım onayı verirseniz şirkete açılır. Onayı geri çektiğinizde erişim de
                kapanır. Şirket içinde yalnızca görüntüleme yetkisi olan çalışanlar telefon ve
                e-postanızı göremez.
              </p>
              <p>
                <strong>Şirket sitesinden derlenen ilanlar:</strong> bu ilanlarda başvuru
                bizden geçmez; sizi şirketin kendi sayfasına yönlendiririz ve o başvuruya ait
                hiçbir veri bizde oluşmaz.
              </p>
              <p>
                <strong>StajımVar yöneticisi:</strong> platformu işleten kişi olarak verilere
                teknik erişimimiz var. Bu erişimi yalnızca hizmeti çalıştırmak, şirketleri
                doğrulamak, hataları gidermek ve sizin taleplerinizi yanıtlamak için
                kullanıyoruz.
              </p>
            </Section>

            <Section title="Verilerinizi satmıyoruz">
              <p>
                Hesap, profil, özgeçmiş ve başvuru verileriniz <strong>satılmaz</strong> ve
                pazarlama amacıyla üçüncü taraflara aktarılmaz. Veriniz yalnızca iki yere
                gider: başvurduğunuz ilanı açan doğrulanmış şirkete (sizin onayınızla) ve
                yukarıda adı geçen, hizmeti çalıştıran altyapı sağlayıcılarına.
              </p>
              <p>
                <strong>Reklam:</strong> rehber yazılarında Google reklamları gösterilebiliyor.
                Google reklam gösterdiğinde kendi çerezlerini kullanabilir; bu çerezler
                Google&apos;a aittir. Profil, özgeçmiş ve başvuru bilgileriniz reklamverenlere ya
                da Google&apos;a verilmez. Ayrıntılar{' '}
                <a href="/cerez-politikasi" className="font-semibold text-blue-700 hover:underline">
                  Çerez Politikası
                </a>
                &apos;nda.
              </p>
            </Section>

            <Section title="Aldığımız teknik önlemler">
              <p>
                <strong>Kurallar veritabanında:</strong> &quot;kim neyi görebilir&quot;
                kuralları yalnızca ekranda değil, doğrudan veritabanında uygulanıyor. Ekranda
                bir hata olsa bile yetkisiz kişiye veri dönmüyor.
              </p>
              <p>
                <strong>Kapalı özgeçmiş deposu:</strong> özgeçmiş dosyalarının herkese açık bir
                adresi yok. Yetkili kişi dosyayı her açtığında yalnızca 10 dakika geçerli,
                kişiye özel bir bağlantı üretiliyor.
              </p>
              <p>
                <strong>Başvuru anının kopyası:</strong> başvurduğunuzda özgeçmişinizin bir
                kopyası alınıyor; şirket o başvuruda gönderdiğiniz belgeyi görüyor. Başka bir
                şirket bu kopyaya erişemiyor.
              </p>
              <p>
                <strong>Otomatik güvenlik testleri:</strong> sitedeki her değişiklik yayına
                çıkmadan önce, erişim kurallarını sınayan otomatik testlerden geçiyor
                (örneğin &quot;bir şirket başka şirkete yapılan başvuruyu göremez&quot;,
                &quot;onay olmadan özgeçmiş açılmaz&quot;). Testlerden biri geçmezse değişiklik
                yayına alınamıyor.
              </p>
            </Section>

            <Section title="Haklarınız">
              <p>
                <strong>Hesabınızı kendiniz silebilirsiniz:</strong> profil ayarlarınızdaki
                &quot;Hesabını sil&quot; adımıyla hesabınız ve ona bağlı veriler kalıcı olarak
                silinir; bize yazmanız gerekmez.
              </p>
              <p>
                6698 sayılı KVKK&apos;nın 11. maddesi kapsamında verilerinizin işlenip
                işlenmediğini öğrenme, düzeltilmesini ya da silinmesini isteme gibi
                haklarınız var. Taleplerinizi aşağıdaki adrese iletebilirsiniz.
              </p>
            </Section>

            <Section title="Kurumlar için">
              <p>
                Üniversite kariyer merkezi ya da şirket olarak veri güvenliğiyle ilgili ek
                sorunuz varsa iletisim@stajimvar.com adresine yazın; yazılı olarak
                yanıtlıyoruz. Okullardan öğrenci listesi ya da öğrenci verisi talep etmiyoruz
                ve almıyoruz: öğrenciler siteye kendileri kaydoluyor.
              </p>
            </Section>
          </>
        )}

        {slug === 'kvkk-aydinlatma-metni' && (
          <>
            <Section title="İşlenen veriler ve amaçları">
              <p>
                6698 sayılı Kanun kapsamında veri sorumlusu, StajımVar&apos;ın kurucusu{' '}
                <strong>Mustafa Oğulcan Doğan</strong>&apos;dır (iletişim:
                iletisim@stajimvar.com). İlanlara bakmak için hesap gerekmez; hesap
                açtığınızda aşağıdaki veriler işlenir.
              </p>
              <p>
                <strong>Ad ve e-posta</strong> — hesabı oluşturmak, girişi doğrulamak ve
                hizmetle ilgili e-postaları göndermek için; hukuki sebep sözleşmenin
                kurulması ve ifası (m.5/2-c). Google ya da Microsoft ile girerseniz bu iki
                bilgi o sağlayıcıdan alınır.
              </p>
              <p>
                <strong>Okul, bölüm ve şehir</strong> — öğrenci hesabında zorunlu; size uygun
                ilanları ve haftalık özeti hazırlamak için; hukuki sebep sözleşmenin ifası
                (m.5/2-c).
              </p>
              <p>
                <strong>Diğer profil bilgileri, profil fotoğrafı ve özgeçmiş dosyası</strong>{' '}
                — isteğe bağlı; profilinizi oluşturmak, ilanları uygunluğa göre sıralamak
                ve başvurunuzu hazırlamak için; hukuki sebep sözleşmenin ifası (m.5/2-c).
                Yalnızca sizin girdiğiniz kadarıyla işlenir.
              </p>
              <p>
                <strong>Sosyal profil, paylaşımlar, bağlantılar ve mesajlar</strong> — bu
                özellikleri kullanırsanız; hizmetin sunulması için; hukuki sebep sözleşmenin
                ifası (m.5/2-c).
              </p>
              <p>
                <strong>Başvuru kaydı</strong> — StajımVar&apos;da açılmış bir ilana
                başvurduğunuzda; hukuki sebep açık rıza (m.5/1). Rızayı başvuru anında
                verirsiniz ve bu an kayda geçer. Telefon ve e-postanızın şirketle
                paylaşılması ayrı bir onaydır; vermezseniz paylaşılmaz.
              </p>
              <p>
                <strong>Ziyaret ölçümü</strong> — açılan sayfa, yönlendiren site, cihaz
                türü, yaklaşık şehir ve ülke ile giriş yaptıysanız kullanıcı kimliğiniz;
                sitenin nasıl kullanıldığını ölçmek ve kötüye kullanımı fark etmek için;
                hukuki sebep meşru menfaat (m.5/2-f). IP adresi bu kayıtlara yazılmaz.
              </p>
              <p>
                <strong>Onay kayıtları</strong> — bu metni onayladığınız an ve sürümü;
                hukuki sebep hukuki yükümlülük (m.5/2-ç).
              </p>
            </Section>

            <Section title="Aktarım">
              <p>
                Hesap ve profil verileriniz pazarlama amacıyla üçüncü taraflara aktarılmaz
                ve satılmaz. Aktarımlar şunlardır:
              </p>
              <p>
                <strong>İlanı açan şirkete:</strong> StajımVar&apos;da açılmış bir ilana
                başvurduğunuzda başvurunuz ve ona bağlanan profil, fotoğraf ve özgeçmiş
                kopyası <strong>o ilanı açan doğrulanmış şirkete</strong> iletilir. Telefon
                ve e-postanız yalnızca ayrıca onaylarsanız şirketin yetkili ekip üyelerine
                açılır.
              </p>
              <p>
                <strong>Hizmet sağlayıcılara:</strong> Supabase (veritabanı ve dosyalar,
                Frankfurt), Cloudflare (barındırma), Google Workspace (kimlik e-postaları)
                ve Resend (bildirim e-postaları, ABD). Bu sağlayıcılar veriyi yalnızca bizim
                adımıza işler; bir kısmı yurt dışındadır.
              </p>
              <p>
                Ayrıntılar{' '}
                <a href="/gizlilik" className="text-blue-600 hover:underline">
                  Gizlilik Politikası
                </a>{' '}
                ve{' '}
                <a href="/cerez-politikasi" className="text-blue-600 hover:underline">
                  Çerez Politikası
                </a>{' '}
                sayfalarında.
              </p>
            </Section>

            <Section title="Saklama ve silme">
              <p>
                Verileriniz hesabınız açık kaldığı sürece saklanır. Hesabınızı profil
                ayarlarınızdaki <strong>Hesabımı sil</strong> bağlantısıyla kendiniz
                silebilirsiniz. Silindiğinde hesap, profil, dosyalar, başvurular (şirkete
                iletilen kopyalar dahil), sosyal içerik, mesajlar ve onay kayıtları silinir;
                ziyaret ölçümü kayıtlarından kullanıcı kimliğiniz kaldırılır.
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
                SMS göndermiyoruz ve sizi telefonla aramıyoruz. E-postayı yalnızca hesap
                işlemleri ve bildirimler için kullanıyoruz; haftalık özet ve takip
                bildirimlerini Bildirim ayarlarından kapatabilirsiniz. Öğrenci verisi
                satmıyoruz.
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
