import React, { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { KARIYER_MERKEZLERI, type KariyerMerkezi } from '../data/kariyerMerkezleri';
import { profilMerkezi } from '../lib/rehber-arama.mjs';
import type { StudentProfile } from '../types';

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
              <span className="text-sm text-gray-600">
                {liste.length} üniversite
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {liste.map((m) => (
                <MerkezKarti key={m.universite} merkez={m} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
};

/**
 * Üniversite kodunu adından üretiyor.
 *
 * Logo dosyaları scripts/marka-logolari.mjs tarafından aynı kuralla
 * adlandırıldı; iki yerde ayrı yazılsaydı biri değiştiğinde logolar
 * sessizce kaybolurdu.
 */
export function universiteKodu(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Kariyer merkezi kartı.
 *
 * ÖNCE DÜZ BİR BAĞLANTI LİSTESİYDİ
 * --------------------------------
 * Şehir başlıkları altında üniversite adları vardı ve tek yapabildiğin
 * şey dış siteye çıkmaktı. Oysa öğrencinin oraya gitme sebebi belli:
 * staj formu, sigorta yazısı, onay imzası, bazen de okulun kendi ilan
 * panosu.
 *
 * NE YAZMIYORUZ
 * -------------
 * "Staj yönergesi" ve "gerekli belgeler" için ayrı ayrı doğrulanmış
 * adreslerimiz YOK — üniversitelerin her biri farklı yerde tutuyor.
 * Uydurma bağlantı koymak yerine, kartta ne aranacağını yazıyoruz ve
 * kariyer merkezinin doğrulanmış adresine gönderiyoruz.
 */
const MerkezKarti: React.FC<{ merkez: KariyerMerkezi; oneCikan?: boolean }> = ({
  merkez,
  oneCikan = false,
}) => {
  const kod = universiteKodu(merkez.universite);
  return (
    <div
      className={`flex h-full flex-col gap-2.5 rounded-2xl border bg-white p-4 ${
        oneCikan ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-1">
          <img
            src={`/universite-logolari/${kod}.png`}
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const kap = e.currentTarget.parentElement;
              if (kap) kap.style.display = 'none';
            }}
            className="h-9 w-9 object-contain"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug text-gray-900">{merkez.universite}</p>
          <p className="mt-0.5 text-xs font-semibold text-gray-600">{merkez.sehir}</p>
        </div>
      </div>

      {/*
        Sayfada ne aranacağı yazılıyor. Bunlar bağlantı DEĞİL: her okul
        farklı adreste tutuyor ve doğrulamadığımız adresi bağlamıyoruz.
      */}
      <ul className="flex flex-wrap gap-1.5">
        {['Staj yönergesi', 'Gerekli belgeler', 'İlan panosu'].map((etiket) => (
          <li
            key={etiket}
            className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600"
          >
            {etiket}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
        <a
          href={merkez.url}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
        >
          Resmî siteye git
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {/*
          Bağlantı bozulursa öğrencinin haber verebileceği bir yer.
          Üniversite siteleri sık adres değiştiriyor ve bunu ancak
          kullanan kişi görüyor.
        */}
        <a
          href={`/iletisim?konu=${encodeURIComponent(`Hatalı bağlantı: ${merkez.universite}`)}`}
          className="inline-flex min-h-11 items-center text-[11px] font-semibold text-gray-600 hover:text-gray-900 hover:underline"
        >
          Hatalı bağlantı bildir
        </a>
      </div>
    </div>
  );
};

/** Sayfanın metni — ön render ile ortak. */
export const KariyerMerkezleriIcerik: React.FC<{ ogrenci?: StudentProfile | null }> = ({
  ogrenci = null,
}) => {
  const benimMerkezim = profilMerkezi(ogrenci?.university, KARIYER_MERKEZLERI) as
    | KariyerMerkezi
    | null;

  return (
  <div className="space-y-8">
    {/*
      KENDİ OKULUN EN ÜSTTE

      Düz bir dizin ile kişisel bir ürün arasındaki fark bu satır.
      Profilde üniversite yoksa ya da listede karşılığı yoksa blok hiç
      çizilmiyor — yanlış bir okul göstermek, hiç göstermemekten kötü.
    */}
    {benimMerkezim && (
      <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
        <div>
          <p className="text-base font-extrabold text-gray-900">
            {benimMerkezim.universite} öğrencisisin
          </p>
          <p className="text-sm leading-relaxed text-gray-700">
            Kariyer merkezine, staj yönergesine ve gerekli belgelere buradan ulaş.
          </p>
        </div>
        <MerkezKarti merkez={benimMerkezim} oneCikan />
      </section>
    )}

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
      <p className="text-xs text-gray-600 leading-relaxed">
        Bağlantılar üniversitelerin kendi sayfalarına gidiyor. İçerikleri onlara ait;
        başvuru koşulları ve takvim için o sayfalara bakın.
      </p>
    </section>
  </div>
  );
};

export const KariyerMerkezleriSayfasi: React.FC<{
  onBack: () => void;
  ogrenci?: StudentProfile | null;
}> = ({ onBack, ogrenci = null }) => {
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

        <KariyerMerkezleriIcerik ogrenci={ogrenci} />
      </div>
    </SayfaKabugu>
  );
};
