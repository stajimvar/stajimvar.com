import React, { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { KARIYER_MERKEZLERI } from '../data/kariyerMerkezleri';

/**
 * /universite-kariyer-merkezleri — doğrulanmış dış bağlantı dizini.
 *
 * Neden bu sayfa var ve veri nasıl üretildi: src/data/kariyerMerkezleri.ts
 * başında yazıyor.
 *
 * TEK KAYNAK
 * ----------
 * `MerkezListesi` hem tarayıcıda hem derleme sırasında ön render tarafında
 * çiziliyor. Bu sayfanın tek içeriği bağlantılar; ön render'a girmezse
 * tarayıcı başlıktan başka hiçbir şey görmüyor.
 *
 * `nofollow` YOK, `noopener` VAR — /staj-programlari ile aynı gerekçe:
 * bunlar editoryal olarak seçip doğruladığımız resmi kurum adresleri.
 */

export const MerkezListesi: React.FC = () => {
  const sehirler = [...new Set(KARIYER_MERKEZLERI.map((m) => m.sehir))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );

  return (
    <>
      {sehirler.map((sehir) => {
        const liste = KARIYER_MERKEZLERI.filter((m) => m.sehir === sehir);
        return (
          <section key={sehir} className="space-y-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-gray-900">{sehir}</h2>
              <span className="text-sm text-gray-400">
                {liste.length} üniversite
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {liste.map((m) => (
                <a
                  key={m.universite}
                  href={m.url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-300"
                >
                  <span className="font-semibold text-gray-900 leading-snug">
                    {m.universite}
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
};

/** Sayfanın metni — ön render ile ortak. */
export const KariyerMerkezleriIcerik: React.FC = () => (
  <div className="space-y-8">
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-gray-900">Kariyer merkezi ne işe yarıyor</h2>
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
        Zorunlu stajın evrak tarafı buradan geçiyor. Staj formunu, sigorta yazısını ve
        onay imzasını üniversitenin kariyer merkezi veya bölümün staj komisyonu veriyor.
        Staj yerini kendin bulsan bile bu adımı atlayamıyorsun: formu imzalatmadan
        başlanan staj okul tarafından sayılmıyor.
      </p>
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
        Birçok kariyer merkezi ayrıca kendi ilan panosunu tutuyor ve okulun anlaşmalı
        olduğu şirketlerin stajlarını orada duyuruyor. Bu ilanlar genelde başka hiçbir
        yerde yayınlanmıyor — kendi okulunun sayfasına bakmak, herkese açık ilan
        sitelerinde olmayan bir kaynağa bakmak demek.
      </p>
    </section>

    <MerkezListesi />

    <section className="space-y-2">
      <p className="text-sm text-gray-600 leading-relaxed">
        Okulun listede yok mu? Kariyer merkezleri her üniversitede farklı adreste
        duruyor; listeyi doğruladığımız adreslerle sınırlı tutuyoruz, tahmin
        eklemiyoruz. Okulunun adresini{' '}
        <a href="/iletisim" className="font-semibold text-blue-600 hover:underline">
          bize yazarsan
        </a>{' '}
        kontrol edip ekleriz.
      </p>
      <p className="text-xs text-gray-400 leading-relaxed">
        Bağlantılar üniversitelerin kendi sayfalarına gidiyor. İçerikleri onlara ait;
        başvuru koşulları ve takvim için o sayfalara bakın.
      </p>
    </section>
  </div>
);

export const KariyerMerkezleriSayfasi: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  useEffect(() => {
    document.title = 'Üniversite kariyer merkezleri | StajımVar';
  }, []);

  return (
    <SayfaKabugu onBack={onBack} icerikGenisligi="max-w-4xl">
      <div className="space-y-8">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            Üniversite kariyer merkezleri
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Staj formu, sigorta yazısı ve onay imzası kendi okulundan çıkıyor. Aşağıdakiler
            üniversitelerin kariyer merkezi sayfalarının doğrulanmış adresleri.
          </p>
        </div>

        <KariyerMerkezleriIcerik />
      </div>
    </SayfaKabugu>
  );
};
