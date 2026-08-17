import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
import {
  CorporateContent,
  CORPORATE_ROUTES,
  CORPORATE_TITLES,
  type CorporateSlug,
} from './CorporatePages';

/**
 * Yasal metin sayfaları.
 *
 * İçerik sitenin BUGÜN gerçekten yaptığı işe göre yazılır; ne eksik ne fazla.
 * Şu anki durum: öğrenci hesabı açılabiliyor (ad, e-posta, profil alanları),
 * özgeçmiş yükleme ve platform içi başvuru ise kapalı — başvurular hâlâ
 * şirketin kendi sayfasında yapılıyor.
 *
 * ÖNEMLİ: CV yükleme veya platform üzerinden başvuru açıldığında bu metinler
 * yeniden yazılmalı ve `KVKK_VERSION` (src/lib/auth.ts) artırılmalı; sürüm
 * artmazsa eski onayla yeni işleme yapılmış olur.
 */

type YasalSlug = 'gizlilik' | 'cerez-politikasi' | 'kvkk-aydinlatma-metni';

/** Yasal ve kurumsal sayfalar aynı kabuğu paylaşıyor. */
export type LegalSlug = YasalSlug | CorporateSlug;

export const LEGAL_ROUTES: Record<string, LegalSlug> = {
  '/gizlilik': 'gizlilik',
  '/cerez-politikasi': 'cerez-politikasi',
  '/kvkk-aydinlatma-metni': 'kvkk-aydinlatma-metni',
  ...CORPORATE_ROUTES,
};

const UPDATED = '16 Ağustos 2026';

interface LegalPageProps {
  slug: LegalSlug;
  onBack: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-base font-bold text-gray-900">{title}</h2>
    <div className="text-sm text-gray-600 leading-relaxed space-y-2">
      {children}
    </div>
  </section>
);

export const LegalPage: React.FC<LegalPageProps> = ({ slug, onBack }) => {
  const kurumsal = (Object.values(CORPORATE_ROUTES) as string[]).includes(slug)
    ? (slug as CorporateSlug)
    : null;

  return (
    <div className="text-gray-900">
      {/*
        Kendi başlık çubuğu kaldırıldı: uygulamanın üst çubuğu (arama,
        sekmeler, profil) artık her sayfada App tarafından çiziliyordu ve
        burada bir başlık daha çizilince ikisi üst üste biniyordu — ölçüldü,
        sayfada iki <header> vardı.

        "İlanlara dön" bağlantısı içeriğin üstünde ince bir satır olarak kaldı.
      */}
      {/* Alt boşluk mobil gezinme çubuğu için; ayrıntı SayfaKabugu.tsx içinde. */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-10 space-y-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          İlanlara dön
        </button>

        {kurumsal && (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">
                {CORPORATE_TITLES[kurumsal]}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Son güncelleme: {UPDATED}
              </p>
            </div>
            <CorporateContent slug={kurumsal} />
          </>
        )}

        {slug === 'gizlilik' && (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">Gizlilik Politikası</h1>
              <p className="text-xs text-gray-500 mt-1">
                Son güncelleme: {UPDATED}
              </p>
            </div>

            <Section title="Kısa özet">
              <p>
                İlanlara bakmak için hesap açmanız gerekmez. Hesap açarsanız yalnızca
                <strong> adınız, e-posta adresiniz</strong> ve profilinize kendi
                girdiğiniz bilgiler (üniversite, bölüm, yetenekler, tercihler) saklanır.
                Özgeçmiş yükleme ve platform üzerinden başvuru henüz açık değildir;
                başvurular şirketin kendi sayfasında yapılır.
              </p>
            </Section>

            <Section title="Hangi verileri işliyoruz">
              <p>
                <strong>Hesap verisi:</strong> Kayıt olursanız ad, e-posta ve şifrenizin
                şifrelenmiş özeti. Şifrenin kendisi hiçbir yerde açık tutulmaz.
              </p>
              <p>
                <strong>Profil verisi:</strong> Üniversite, bölüm, sınıf, yetenekler,
                projeler ve çalışma tercihleri gibi profilinize <em>sizin girdiğiniz</em>
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
                Şu anda tüm ilanlarda başvuru <strong>şirketin kendi başvuru
                sayfasında</strong> yapılır. Sizi oraya yönlendiririz; başvuru bilgileriniz
                StajımVar üzerinden geçmez ve bizde saklanmaz.
              </p>
              <p>
                İleride platform üzerinden başvuru açıldığında verileriniz şirkete ancak
                her başvuru için ayrı vereceğiniz açık rıza ile ve yalnızca doğrulanmış
                işveren adreslerine iletilecektir. Doğrulanmamış bir adrese hiçbir koşulda
                veri gönderilmez; bu kural veritabanı kısıtıyla bağlanmıştır.
              </p>
            </Section>

            <Section title="Üçüncü taraflar">
              <p>
                Site, ilan verisini saklamak için Supabase (sunucu bölgesi: Frankfurt,
                Almanya) ve barındırma için Cloudflare altyapısını kullanır. İleride reklam
                gösterimi açılırsa Google AdSense devreye girecek ve bu durumda çerez
                politikamız güncellenecektir.
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
                <strong>Dosyalar.</strong> Özgeçmişler için ayrılmış depolama alanı
                herkese kapalıdır ve yalnızca dosyanın sahibi ile başvurulan şirket
                erişebilir. Şirket logoları gibi kamuya açık görseller ayrı bir alanda
                tutulur.
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
                Kayıt, giriş ve platform içi başvuru özellikleri açıldığında bu politika
                yeniden yazılacak ve KVKK kapsamında ayrı bir aydınlatma metni ile açık rıza
                akışı devreye girecektir. Değişiklik tarihini bu sayfanın başında
                görebilirsiniz.
              </p>
            </Section>
          </>
        )}

        {slug === 'cerez-politikasi' && (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">Çerez Politikası</h1>
              <p className="text-xs text-gray-500 mt-1">
                Son güncelleme: {UPDATED}
              </p>
            </div>

            <Section title="Kullandığımız çerezler">
              <p>
                Site şu anda <strong>takip veya reklam çerezi kullanmıyor</strong>. Analitik
                aracı da bulunmuyor.
              </p>
              <p>
                Hesabınız varsa oturumunuzu açık tutmak için bir <strong>oturum
                belirteci</strong> tarayıcınızda saklanır. Zorunludur; olmadan her sayfada
                yeniden giriş yapmanız gerekirdi. Çıkışta silinir.
              </p>
              <p>
                Bunun dışında yerel depoda hiçbir tercih saklamıyoruz. Daha önce
                tema tercihiniz için
                <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-100 text-xs">
                  stajimvar_theme
                </code>
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

            <Section title="Reklamlar">
              <p>
                Şu anda sitede reklam yayınlanmıyor. İleride Google AdSense
                etkinleştirilirse reklam çerezleri devreye girecek; o aşamada bu sayfa
                güncellenecek ve gerekli onay mekanizması eklenecektir.
              </p>
            </Section>
          </>
        )}

        {slug === 'kvkk-aydinlatma-metni' && (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">KVKK Aydınlatma Metni</h1>
              <p className="text-xs text-gray-500 mt-1">
                Son güncelleme: {UPDATED}
              </p>
            </div>

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
                <strong>Profil bilgileri</strong> — ilanları uygunluğa göre sıralamak için;
                hukuki sebep açık rıza (m.5/1). Doldurmak zorunlu değildir.
              </p>
              <p>
                <strong>Onay kaydı</strong> — bu metni onayladığınız an ve sürümü; hukuki
                sebep hukuki yükümlülük (m.5/2-ç).
              </p>
              <p>
                <strong>Aktarım:</strong> Verileriniz üçüncü taraflara aktarılmaz.
                Barındırma Supabase (Frankfurt) ve Cloudflare altyapısındadır; bu
                sağlayıcılar veriyi bizim adımıza saklar.
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

            <Section title="Henüz yapılmayanlar">
              <p>
                Özgeçmiş yükleme ve platform üzerinden başvuru <strong>henüz açık
                değildir</strong>. Bu özellikler devreye girdiğinde metin güncellenecek ve
                yeniden onayınız istenecektir.
              </p>
              <p>
                KVKK m.11 kapsamındaki taleplerinizi aşağıdaki adrese iletebilirsiniz.
              </p>
            </Section>
          </>
        )}

        <div className="pt-6 border-t border-gray-200 text-sm text-gray-600">
          <p>
            Sorularınız için:{' '}
            <a
              className="text-blue-600 font-semibold hover:underline"
              href="mailto:iletisim@stajimvar.com"
            >
              iletisim@stajimvar.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};
