import React, { useEffect } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  Building2,
  Calculator,
  Sparkles,
  ExternalLink,
  List,
} from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { RenkliKart } from './RehberGorseller';
import { REHBERLER, konuEtiketi, rehberBul, rehberOkumaDakika, type Rehber } from '../data/rehberler';
import { BOLUMLER } from '../data/bolumler';
import { ARACLAR } from './AraclarListesi';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { RehberKarti, RehberMerkezi as RehberMerkeziBilesen } from './RehberMerkezi';
import type { StudentProfile } from '../types';

/**
 * Rehber merkezi ve tek rehber sayfası.
 *
 * İkisi de aynı kayıttan besleniyor (`src/data/rehberler.tsx`): yeni bir
 * başlık eklemek için o dizine bir girdi yazmak yeterli, burada hiçbir şey
 * değişmiyor. Site haritası da aynı kayıttan üretiliyor.
 *
 * Rehberler sitenin ikinci işi: bir öğrenci "zorunlu staj nasıl yapılır" diye
 * arıyor, bir işveren "stajyer nasıl alınır" diye. İkisi de bize buradan
 * geliyor — davet e-postası gönderemediğimiz için tek keşif kanalı bu.
 */

/**
 * Ortak kabuk kullaniliyor: baslik cubugu ana sayfayla ayni genislikte,
 * logo hep sol ust kosede. Ayrintisi SayfaKabugu.tsx icinde.
 */
/*
  REHBER DETAYINDA TEK GERİ YOLU

  Kabuğun genel "Geri" düğmesi ile gövdedeki "← Tüm rehberler" aynı işi
  yapıyordu. Nereye gittiğini söyleyen kaldı.
*/
const Kabuk: React.FC<{ onBack?: () => void; children: React.ReactNode }> = ({ children }) => (
  <SayfaKabugu>{children}</SayfaKabugu>
);

/* ------------------------------------------------------------------ merkez */

interface GuideHubProps {
  onBack: () => void;
  onNavigate: (path: string) => void;
}

/*
  LİSTE ÖĞELERİ DÜĞME DEĞİL BAĞLANTI.

  Önce hepsi <button onClick={onNavigate(...)}> idi. Görsel olarak
  çalışıyordu ama tarayıcı bir düğmeyi bağlantı saymıyor: ölçüldü,
  /rehber ve /bolumler sayfalarının statik HTML'inde HİÇ bağlantı yoktu.
  Yani otuz dört bölüm ve on rehber sayfası birbirinden kopuk adalardı;
  aralarında sinyal taşınmıyordu ve tarayıcı onlara yalnızca site
  haritasından ulaşabiliyordu.

  Şimdi gerçek <a href>. Tıklama yakalanıp uygulama içi geçişe çevriliyor,
  yani kullanıcı için hiçbir şey değişmiyor: tam sayfa yenilenmesi yok.
  Karşılığında orta tuşla yeni sekmede açma ve bağlantıyı kopyalama gibi
  davranışlar da kendiliğinden geliyor — düğmede bunlar hiç yoktu.
*/
const Satir: React.FC<{ rehber: Rehber; onNavigate?: (p: string) => void }> = ({
  rehber,
  onNavigate,
}) => (
  <li className="border-b border-gray-100 last:border-b-0">
    <a
      href={`/rehber/${rehber.slug}`}
      onClick={(e) => {
        if (!onNavigate) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onNavigate(`/rehber/${rehber.slug}`);
      }}
      className="w-full flex items-center gap-3 px-4 py-4 text-left cursor-pointer hover:bg-blue-50/60 transition-colors"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-gray-900">{rehber.baslik}</span>
        <span className="block text-sm text-gray-500">{rehber.ozet}</span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 text-gray-300" />
    </a>
  </li>
);

/**
 * Üstteki büyük kısayol kartı.
 *
 * Sayı (34 bölüm, 4 araç) bilerek gösteriliyor: "Bölüme göre staj" tek
 * başına ne kadar şey olduğunu anlatmıyor, "34 bölüm" anlatıyor.
 */
const Kisayol: React.FC<{
  ikon: React.ReactNode;
  renk: string;
  baslik: string;
  ozet: string;
  sayi: string;
  onClick: () => void;
}> = ({ ikon, renk, baslik, ozet, sayi, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex flex-col gap-3 p-5 rounded-2xl bg-white border border-gray-200 text-left cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm"
  >
    <span className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${renk}`}>
      {ikon}
    </span>
    <span className="min-w-0 space-y-1">
      <span className="block font-bold text-gray-900">{baslik}</span>
      <span className="block text-sm text-gray-500 leading-snug">{ozet}</span>
    </span>
    <span className="mt-auto pt-1 flex items-center gap-1.5 text-xs font-bold text-blue-600">
      {sayi}
      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
  </button>
);

/**
 * Rehber kartı.
 *
 * Her kartın üstünde ince bir renk şeridi var ve renk sırayla değişiyor.
 * Hepsi beyazken ızgara tek bir gri blok gibi duruyordu; şerit kartları
 * birbirinden ayırıyor ve sayfayı canlandırıyor. Renk bir anlam taşımıyor,
 * yalnızca ayırt edici — o yüzden sırayla dağıtılıyor.
 */
/*
  KART TEK YERDE: RehberMerkezi.tsx

  Burada ikinci bir kart bileşeni duruyordu. İkisi de aynı işi yapıyordu ama
  biri fotoğrafı `.jpg` ile, öteki `<picture>` ile istiyordu — yani
  kullanıcının gördüğü kart ile ön render'ın yazdığı kart farklı dosyaya
  bakıyordu. Aynı kart iki yerde yaşayınca fark er geç sessizce oluşuyor.
*/

/**
 * Rehber ızgarası — merkez sayfanın ASIL içeriği.
 *
 * BolumListesi ile aynı gerekçe: bu ağaç hem tarayıcıda hem ön render'da
 * çiziliyor. Önce yalnızca GuideHub içindeydi ve /rehber adresinin statik
 * HTML'inde hiç bağlantı yoktu.
 */
export const RehberListesi: React.FC<{ onNavigate?: (p: string) => void }> = ({
  onNavigate,
}) => {
  const ogrenci = REHBERLER.filter((r) => r.kategori === 'ogrenci');
  const isveren = REHBERLER.filter((r) => r.kategori === 'isveren');
  return (
    <>
      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-bold text-gray-900">Tüm rehberler</h2>
          <span className="text-sm text-gray-400">{ogrenci.length} yazı</span>
        </div>
        {/*
          Mobilde İKİ sütun, geniş ekranda üç.

          Instagram keşfette üç sütun kullanıyor ama oradaki karolar
          fotoğraf; okunacak metin yok. Bizim karolarda başlık var ve 375
          pikselde üç sütun karo başına ~110 piksel bırakıyor — "Staj defteri
          nasıl doldurulur" oraya sığmıyor. İki sütunda ızgara hissi duruyor,
          başlık okunuyor.
        */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
          {ogrenci.map((r, i) => (
            <RehberKarti key={r.slug} rehber={r} sira={i} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      {isveren.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">İşverenler için</h2>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
            {isveren.map((r, i) => (
              <RehberKarti key={r.slug} rehber={r} sira={i} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}
    </>
  );
};

/*
  REHBER MERKEZİ AYRI DOSYADA

  Merkez sayfası artık arama, konu süzgeci, öne çıkanlar ve keşif şeridi
  taşıyor; bu dosyada tek rehber sayfasıyla iç içe durması ikisini de
  okunmaz yapıyordu. Eski adı (`GuideHub`) korunuyor — App ve ön render
  betiği bu adı kullanıyor.
*/
export { RehberMerkezi } from './RehberMerkezi';

export const GuideHub: React.FC<GuideHubProps & { ogrenci?: StudentProfile | null }> = ({
  onNavigate,
  ogrenci = null,
}) => <RehberMerkeziBilesen onNavigate={onNavigate} ogrenci={ogrenci} />;

/* ------------------------------------------------------------- tek rehber */

interface GuidePageProps {
  slug: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

/**
 * Rehber sayfasının sonundaki bağlantılar.
 *
 * Önce bu blok GuidePage içindeydi, yani yalnızca tarayıcıda çizilen
 * kısımdaydı ve ön render çıktısına hiç girmiyordu. Ölçüldü: on rehber
 * sayfasının dokuzunda statik HTML'de SIFIR bağlantı vardı — yani her
 * rehber çıkmaz sokaktı.
 *
 * Bölüm sayfalarına da bağlanıyor: rehberden bölüme giden hiçbir yol
 * yoktu, bağlantı ağı tek yönlü işliyordu.
 */
export const RehberBaglantilari: React.FC<{
  slug: string;
  kategori: Rehber['kategori'];
  onNavigate?: (p: string) => void;
}> = ({ slug, kategori, onNavigate }) => {
  /*
    İLGİLİ REHBERLER: ÜÇ TANE, AYNI KONUDAN

    Burada `kategori`ye göre süzülüyordu — yani öğrenci rehberlerinin
    TAMAMI. On bir yazıyken sorun değildi; yetmiş yazıda her rehber
    sayfasının altına 69 bağlantı düşüyor. Ölçüldü: öğrenci evi rehberi
    7.747 piksele ve 74 rehber bağlantısına çıkıyordu.

    Bu hem okuyucu için işe yaramaz (69 seçenek seçenek değildir) hem de
    bağlantı ağırlığını dağıtıp hiçbir sayfaya sinyal taşımıyor.

    Artık AYNI KONUDAN üç yazı geliyor; konu tek başına yetmezse aynı
    kategoriden tamamlanıyor ve altta "Tüm rehberler" bağlantısı duruyor.
  */
  const bu = REHBERLER.find((r) => r.slug === slug);
  const havuz = REHBERLER.filter((r) => r.slug !== slug && r.kategori === kategori);
  const ayniKonu = bu ? havuz.filter((r) => r.konu === bu.konu) : [];
  const digerleri = [...ayniKonu, ...havuz.filter((r) => !ayniKonu.includes(r))].slice(0, 3);

  // Bölüm sayfalarının tamamı değil: en çok aranan birkaçı, sonra tam liste.
  const bolumler = BOLUMLER.slice(0, 6);

  /*
    Tıklama yakalayıcı. `onNavigate` yoksa (ön render tarafı) hiçbir şey
    yapmıyor ve tarayıcı bağlantıyı normal şekilde izliyor.
  */
  const yakala = (e: React.MouseEvent, yol: string) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(yol);
  };

  return (
    <>
      {digerleri.length > 0 && (
        <section className="mt-10 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Bunlar da işine yarar
          </h2>
          <ul className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {digerleri.map((r) => (
              <Satir key={r.slug} rehber={r} onNavigate={onNavigate} />
            ))}
          </ul>
          <a
            href="/rehber"
            onClick={(e) => yakala(e, '/rehber')}
            className="inline-block text-sm font-semibold text-blue-700 hover:underline"
          >
            Tüm rehberleri gör
          </a>
        </section>
      )}

      <section className="mt-8 space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Bölümüne göre staj
        </h2>
        <div className="flex flex-wrap gap-2">
          {bolumler.map((b) => (
            <a
              key={b.slug}
              href={`/bolum/${b.slug}`}
              onClick={(e) => yakala(e, `/bolum/${b.slug}`)}
              className="px-3.5 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300"
            >
              {b.ad}
            </a>
          ))}
          <a
            href="/bolumler"
            onClick={(e) => yakala(e, '/bolumler')}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:border-blue-300"
          >
            Tüm bölümler
          </a>
        </div>
      </section>
    </>
  );
};

/**
 * İçindekiler.
 *
 * NEDEN DOM'DAN OKUNUYOR
 * ----------------------
 * Rehber metinleri JSX; başlıklar ayrı bir alanda tutulmuyor ve her rehber
 * için elle bir başlık listesi yazmak, metin değiştiğinde sessizce
 * eskiyen ikinci bir kayıt demekti. Çizildikten sonra kabın içindeki h2
 * öğeleri okunuyor: liste her zaman yazının kendisiyle aynı.
 *
 * Kısa yazılarda hiç çizilmiyor — üç başlıklı bir yazıda içindekiler
 * gezinmeye yardım etmiyor, yalnızca yer kaplıyor.
 */
const Icindekiler: React.FC<{ kap: React.RefObject<HTMLDivElement | null>; anahtar: string }> = ({
  kap,
  anahtar,
}) => {
  const [basliklar, setBasliklar] = React.useState<{ id: string; metin: string }[]>([]);

  React.useEffect(() => {
    const kok = kap.current;
    if (!kok) return;
    const bulunan = Array.from(kok.querySelectorAll('h2')).map((h, i) => {
      if (!h.id) h.id = `bolum-${i + 1}`;
      /* scroll-mt: yapışkan başlık çubuğu hedefin üstünü örtmesin. */
      h.classList.add('scroll-mt-24');
      return { id: h.id, metin: h.textContent || '' };
    });
    setBasliklar(bulunan.length >= 4 ? bulunan : []);
  }, [kap, anahtar]);

  if (!basliklar.length) return null;

  return (
    <nav aria-label="İçindekiler" className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
        <List className="w-3.5 h-3.5" />
        İçindekiler
      </p>
      <ol className="mt-2 space-y-1.5">
        {basliklar.map((b, i) => (
          <li key={b.id}>
            <a
              href={`#${b.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(b.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-sm text-blue-700 hover:underline"
            >
              {i + 1}. {b.metin}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export const GuidePage: React.FC<GuidePageProps> = ({ slug, onBack, onNavigate }) => {
  const rehber = rehberBul(slug);
  const icerikRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = rehber ? `${rehber.baslik} | StajımVar` : 'Rehber bulunamadı | StajımVar';
    if (rehber) {
      const etiket = document.querySelector('meta[name="description"]');
      if (etiket) etiket.setAttribute('content', rehber.aciklama);
    }
  }, [rehber]);

  if (!rehber) {
    return (
      <Kabuk onBack={onBack}>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
          <p className="font-bold text-gray-900">Bu rehber bulunamadı</p>
          <button
            type="button"
            onClick={() => onNavigate('/rehber')}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Tüm rehberler
          </button>
        </div>
      </Kabuk>
    );
  }

  return (
    <Kabuk onBack={onBack}>
      <article className="space-y-3">
        <button
          type="button"
          onClick={() => onNavigate('/rehber')}
          className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Tüm rehberler
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          {rehber.baslik}
        </h1>

        <p className="text-xs text-gray-400">
          {konuEtiketi(rehber.konu)} · {rehberOkumaDakika(rehber)} dk okuma
        </p>

        {/*
          HIZLI CEVAP

          Öğrencilerin çoğu tek bir soruyla geliyor ("sigortayı kim yapar").
          Cevabı bulmak için 1500 kelime okutmak, cevabı vermemekle aynı şey.
          Ayrıntı aşağıda duruyor; kısası burada.
        */}
        {rehber.hizliCevap && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Kısa cevap</p>
            <p className="mt-1 text-sm sm:text-base text-gray-800 leading-relaxed">
              {rehber.hizliCevap}
            </p>
          </div>
        )}

        <Icindekiler kap={icerikRef} anahtar={rehber.slug} />
        {/*
          İÇERİK İÇİ BAĞLANTILARI YAKALA

          Rehber metinleri düz JSX; navigate işlevine erişimleri yok. Bir
          rehberden diğerine bağlanmak için düz `<a href="/rehber/...">`
          yazılıyor ve bu bilinçli: tarayıcı yalnızca gerçek `<a href>`
          görüyor, düğmeye bastırılan bir geçişi bağlantı saymıyor. İç
          bağlantı da sayfalar arası sinyal taşıdığı için bu şart.

          Ama tıklamayı olduğu gibi bırakırsak tam sayfa yenileniyor:
          uygulama baştan kuruluyor, kaydırma sıfırlanıyor. Burada tek bir
          yakalayıcı ikisini birden veriyor — işaretlemede gerçek bağlantı,
          kullanıcıda anında geçiş.

          Yeni sekmede açma (Ctrl/Cmd/orta tuş) ve dış bağlantılar
          dokunulmadan geçiyor.
        */}
        <div
          ref={icerikRef}
          className="space-y-3"
          onClick={(e) => {
            const bag = (e.target as HTMLElement).closest('a');
            if (!bag) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            if (bag.target === '_blank') return;
            const adres = bag.getAttribute('href');
            if (!adres || !adres.startsWith('/')) return;
            e.preventDefault();
            onNavigate(adres);
          }}
        >
          {rehber.icerik}
        </div>

        {/*
          SIK SORULANLAR

          Aynı liste ön render'da FAQPage yapısal verisine de çevriliyor;
          Google arama sonucunda soruları açılır kapanır gösterebiliyor.
          Burada görünmesi şart: yapısal veride olup sayfada olmayan içerik
          Google'ın kurallarına aykırı.
        */}
        {rehber.sss && rehber.sss.length > 0 && (
          <section className="mt-10 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Sık sorulanlar</h2>
            <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
              {rehber.sss.map((s) => (
                <details key={s.soru} className="group px-4 py-3.5">
                  <summary className="flex items-center gap-3 cursor-pointer list-none font-semibold text-gray-900 text-sm sm:text-base">
                    <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
                    {s.soru}
                  </summary>
                  <p className="mt-2 pl-7 text-sm text-gray-600 leading-relaxed">{s.cevap}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/*
          RESMÎ KAYNAKLAR

          Rakam ve mevzuat burada doğrulanıyor. Rehberde yıldan yıla
          değişen tutar yazmıyoruz; onun yerine nereden bakılacağını
          söylüyoruz — kaynağı göstermeyen bir bilgi bir süre sonra
          sessizce yanlış oluyor.
        */}
        {rehber.kaynaklar && rehber.kaynaklar.length > 0 && (
          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Resmî kaynaklar
            </h2>
            <ul className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
              {rehber.kaynaklar.map((k) => (
                <li key={k.adres}>
                  <a
                    href={k.adres}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50/60"
                  >
                    {k.etiket}
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/*
          UYGULANABİLİR SONRAKİ ADIM

          Yazının sonunda yalnızca başka yazılar göstermek, okuyanı bir
          arşivde dolaştırmak demek. Buradaki bağlantı sitede GERÇEKTEN
          var olan bir yere gidiyor; karşılığı olmayan rehberde bu blok
          hiç çizilmiyor.
        */}
        {rehber.sonrakiAdim && (
          <button
            type="button"
            onClick={() => onNavigate(rehber.sonrakiAdim!.yol)}
            className="mt-8 w-full flex items-center justify-between gap-3 rounded-2xl bg-blue-600 px-4 py-4 text-left text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-blue-100">
                Sıradaki adım
              </span>
              <span className="block font-bold">{rehber.sonrakiAdim.etiket}</span>
              {rehber.sonrakiAdim.aciklama && (
                <span className="block text-xs text-blue-100">{rehber.sonrakiAdim.aciklama}</span>
              )}
            </span>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>
        )}

        {rehber.guncelleme && (
          <p className="mt-6 text-xs text-gray-400">
            Son gözden geçirme:{' '}
            {new Date(rehber.guncelleme).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </article>

      <RehberBaglantilari
        slug={rehber.slug}
        kategori={rehber.kategori}
        onNavigate={onNavigate}
      />
    </Kabuk>
  );
};
