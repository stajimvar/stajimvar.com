import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';

/**
 * Yasal metin sayfaları.
 *
 * İçerik, sitenin BUGÜN gerçekten yaptığı işe göre yazıldı. Sürüm 1'de site
 * salt okunur: kullanıcı hesabı yok, kayıt yok, kişisel veri toplanmıyor.
 * Toplanmayan veriyi anlatan bir metin yazmak, ileride toplanacak diye
 * şimdiden "CV'nizi işliyoruz" demekten dürüsttür.
 *
 * ÖNEMLİ: Kayıt/başvuru akışı açıldığında bu metinler yeniden yazılmalı —
 * o noktada KVKK aydınlatma metni ve açık rıza akışı zorunlu hale gelir.
 */

export type LegalSlug = 'gizlilik' | 'cerez-politikasi' | 'kvkk-aydinlatma-metni';

export const LEGAL_ROUTES: Record<string, LegalSlug> = {
  '/gizlilik': 'gizlilik',
  '/cerez-politikasi': 'cerez-politikasi',
  '/kvkk-aydinlatma-metni': 'kvkk-aydinlatma-metni',
};

const UPDATED = '16 Ağustos 2026';

interface LegalPageProps {
  slug: LegalSlug;
  onBack: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
    <div className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed space-y-2">
      {children}
    </div>
  </section>
);

export const LegalPage: React.FC<LegalPageProps> = ({ slug, onBack }) => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B0F17] text-gray-900 dark:text-slate-100">
      <header className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo />
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            İlanlara dön
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {slug === 'gizlilik' && (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">Gizlilik Politikası</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Son güncelleme: {UPDATED}
              </p>
            </div>

            <Section title="Kısa özet">
              <p>
                StajımVar şu anda <strong>hesap açmadan kullanılan</strong> bir staj ilanı
                arama sitesidir. Kayıt olma, giriş yapma veya CV yükleme özelliği henüz
                açık değildir. Bu nedenle sizden ad, e-posta, telefon veya özgeçmiş gibi
                hiçbir kişisel veri toplamıyoruz.
              </p>
            </Section>

            <Section title="Hangi verileri işliyoruz">
              <p>
                <strong>Kişisel veri:</strong> Toplamıyoruz. Site üzerinde form, kayıt veya
                giriş bulunmuyor.
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
                Bir ilana başvurmak istediğinizde sizi <strong>şirketin kendi başvuru
                sayfasına</strong> yönlendiriyoruz. Başvuru bilgileriniz StajımVar üzerinden
                geçmez, bize ulaşmaz ve bizde saklanmaz. Yönlendirildiğiniz sitede
                paylaştığınız veriler o şirketin gizlilik politikasına tabidir.
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

            <Section title="Haklarınız">
              <p>
                Kişisel veri toplamadığımız için silme veya erişim talebine konu olacak bir
                kaydımız bulunmuyor. Yine de bir sorunuz olursa aşağıdaki adresten
                ulaşabilirsiniz.
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
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Son güncelleme: {UPDATED}
              </p>
            </div>

            <Section title="Kullandığımız çerezler">
              <p>
                Site şu anda <strong>takip veya reklam çerezi kullanmıyor</strong>. Analitik
                aracı da bulunmuyor.
              </p>
              <p>
                Tarayıcınızın yerel deposunda yalnızca bir tercih saklanıyor:
                <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-xs">
                  stajimvar_theme
                </code>
                — siteyi açık mı koyu temada mı görmek istediğiniz. Bu bilgi
                tarayıcınızdan dışarı çıkmaz ve kimliğinizle ilişkilendirilmez.
                Tarayıcı ayarlarınızdan site verilerini silerek kaldırabilirsiniz.
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
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Son güncelleme: {UPDATED}
              </p>
            </div>

            <Section title="Şu an geçerli durum">
              <p>
                6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme
                yükümlülüğü, kişisel veri işlendiği durumlarda doğar. StajımVar sürüm 1'de
                <strong> kişisel veri işlemiyor</strong>: üyelik, giriş, form ve CV yükleme
                özellikleri açık değildir.
              </p>
              <p>
                İlana başvurmak istediğinizde şirketin kendi başvuru sistemine
                yönlendirilirsiniz; verileriniz bizden geçmez.
              </p>
            </Section>

            <Section title="Üyelik açıldığında ne olacak">
              <p>
                Öğrenci hesapları ve platform içi başvuru devreye girdiğinde bu metin
                yeniden yazılacak ve şunları içerecektir: veri sorumlusunun kimliği, işlenen
                veri kategorileri, işleme amaçları ve hukuki sebebi, aktarım yapılan taraflar
                ve ülkeler, saklama süresi ve KVKK madde 11 kapsamındaki haklarınız.
              </p>
              <p>
                O aşamada CV'niz ve iletişim bilgileriniz, yalnızca <strong>açık rızanızla</strong>{' '}
                ve yalnızca doğrulanmış işveren başvuru kanallarına iletilecektir.
              </p>
            </Section>
          </>
        )}

        <div className="pt-6 border-t border-gray-200 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-300">
          <p>
            Sorularınız için:{' '}
            <a
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
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
