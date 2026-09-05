import React from 'react';
import { alanEslestir, alanEtiketi } from '../lib/bolum-eslestirme.mjs';
import { ListingLogo } from './ListingLogo';
import { konumEtiketi } from '../lib/sehir';
import { listingSlug } from '../lib/slug';
import type { InternshipListing } from '../types';

/**
 * Rehber yazısının dibinde o anki açık ilanlar.
 *
 * NEDEN BURADA
 * ------------
 * Rehber sitenin en güçlü yüzeyi ama bir çıkmaz sokaktı: öğrenci "staj
 * CV'si nasıl yazılır"ı okuyup çıkıyordu. Yazıyı okuyan kişi tam da
 * başvurmaya en yakın kişi; o anda gerçek ilan göstermemek, hazırladığı
 * CV'yi göndereceği yeri saklamak demek.
 *
 * ALAN EŞLEŞMESİ VARSA ÖNE ALINIYOR
 * ---------------------------------
 * Yazının konusu bir öğrenci alanına denk düşüyorsa (bolum-eslestirme)
 * o alandaki ilanlar önce geliyor. Denk düşmüyorsa en yeni ilanlar
 * gösteriliyor — alakasız bir eşleşme uydurmaktansa taze liste vermek
 * daha dürüst.
 *
 * SESSİZ BAŞARISIZLIK
 * -------------------
 * İlan çekilemezse ya da hiç yoksa blok HİÇ çizilmiyor. Rehberin kendi
 * içeriği her hâlükârda ayakta; ilan listesi bir ek, bir bağımlılık
 * değil. Yükleme sırasında da yer kaplamıyor.
 */
export const RehberdeIlanlar: React.FC<{
  /**
   * Alan doğrudan biliniyorsa (bölüm sayfası) `alan` veriliyor; rehber
   * yazısında ise alan bilinmediği için `baslik`'tan çıkarılıyor.
   * İkisi de yoksa en yeni ilanlar gösteriliyor.
   */
  baslik?: string;
  alan?: string | null;
  /** Bölüm sayfasında başlık farklı kuruluyor. */
  basligiGizle?: boolean;
  onNavigate: (yol: string) => void;
  adet?: number;
}> = ({ baslik, alan: verilenAlan, basligiGizle = false, onNavigate, adet = 6 }) => {
  const [ilanlar, setIlanlar] = React.useState<InternshipListing[] | null>(null);

  React.useEffect(() => {
    let iptal = false;
    void (async () => {
      try {
        /*
          SUPABASE TEMBEL YÜKLENİYOR

          `queries` modülü en üstte içe aktarılınca Supabase istemcisi de
          modül yüklenirken kuruluyor ve `import.meta.env` okuyor. Ön
          render Node'da çalıştığı için orada env yok: ÖLÇÜLDÜ, bu import
          eklendiği anda ön render "VITE_SUPABASE_URL okunamadı" diyerek
          DURDU ve dist/rehber tamamen boş kaldı — 71 rehberin ön render
          edilmiş gövdesi, canonical'ı ve yapısal verisi üretilmedi.

          İçeri alınması gereken şey yalnızca tarayıcıda çalışıyor; bu
          yüzden import da yalnızca tarayıcıda, efektin içinde yapılıyor.
        */
        const { fetchPublishedListings } = await import('../lib/queries');
        const hepsi = await fetchPublishedListings();
        if (iptal) return;

        const alan = verilenAlan ?? (baslik ? alanEslestir(baslik) : null);
        const uyan = alan ? hepsi.filter((i) => alanEslestir(i.title) === alan) : [];
        /*
          Alanına uyanlar önce, sonra kalanlar. Yalnızca uyanları
          göstermek riskli: eşleşme bir tahmin ve az sayıda ilanda blok
          bomboş kalabilir.
        */
        const sirali = [...uyan, ...hepsi.filter((i) => !uyan.includes(i))];
        setIlanlar(sirali.slice(0, adet));
      } catch {
        if (!iptal) setIlanlar([]);
      }
    })();
    return () => {
      iptal = true;
    };
  }, [baslik, verilenAlan, adet]);

  if (!ilanlar || ilanlar.length === 0) return null;

  const alan = verilenAlan ?? (baslik ? alanEslestir(baslik) : null);
  const etiket = alan ? alanEtiketi(alan) : null;

  return (
    <section className="mt-10 space-y-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {etiket ? `${etiket} alanında açık ilanlar` : 'Şu an açık staj ilanları'}
        </h2>
        <p className="mt-0.5 text-sm text-gray-600">
          Okuduğun şeyi hemen uygulayabileceğin yerler. Başvuru şirketin kendi sayfasında
          yapılıyor.
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {ilanlar.map((ilan) => (
          <li key={ilan.id}>
            <a
              href={`/ilan/${listingSlug(ilan)}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                onNavigate(`/ilan/${listingSlug(ilan)}`);
              }}
              className="flex h-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 transition-colors hover:border-blue-500"
            >
              <ListingLogo name={ilan.companyName} logoUrl={ilan.companyLogo} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-gray-900">
                  {ilan.title}
                </span>
                <span className="block truncate text-xs text-gray-500">
                  {ilan.companyName}
                  {ilan.city ? ` · ${konumEtiketi(ilan.city)}` : ''}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/*
        İLAN LİSTESİ KÖK ADRESTE

        Burada "/is-ilanlari" yazıyordu ve o rota HİÇ YOK: uygulamada
        ilan listesi kök adreste duruyor, üst menü de oraya bağlanıyor.
        Bağlantı sessizce 404 veriyordu — rehber yazısının dibindeki
        en görünür çıkış yolu çalışmıyordu (canlıda ölçüldü).
      */}
      <a
        href="/"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          onNavigate('/');
        }}
        className="inline-block text-sm font-semibold text-blue-600 hover:underline"
      >
        Tüm staj ilanlarını gör →
      </a>
    </section>
  );
};
