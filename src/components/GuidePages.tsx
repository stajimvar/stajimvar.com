import React, { useEffect } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  Building2,
  Calculator,
  Sparkles,
} from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { RenkliKart } from './RehberGorseller';
import { REHBERLER, rehberBul, type Rehber } from '../data/rehberler';
import { BOLUMLER } from '../data/bolumler';
import { ARACLAR } from './AraclarListesi';
import { SAYFA_GENISLIGI } from '../lib/duzen';

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
const Kabuk: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({
  onBack,
  children,
}) => <SayfaKabugu onBack={onBack}>{children}</SayfaKabugu>;

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
  KARO ZEMİNLERİ

  Instagram'ın keşfet ızgarasında kareler fotoğraf. Bizde fotoğraf yok ve
  uydurma görsel koymak sayfayı süslü ama bilgisiz yapardı. Onun yerine her
  karo kendi renginde: göz ızgarayı tek düze bir metin bloğu olarak değil,
  ayırt edilebilir kutular olarak okuyor.

  Renk bir anlam taşımıyor, yalnızca ayırt edici — o yüzden sırayla
  dağıtılıyor.
*/
const KARO_ZEMIN = [
  'from-violet-600 to-violet-500',
  'from-blue-600 to-blue-500',
  'from-cyan-600 to-cyan-500',
  'from-emerald-600 to-emerald-500',
  'from-amber-500 to-amber-400',
  'from-rose-600 to-rose-500',
];

const Kart: React.FC<{ rehber: Rehber; sira?: number; onNavigate?: (p: string) => void }> = ({
  rehber,
  sira = 0,
  onNavigate,
}) => (
  <a
    href={`/rehber/${rehber.slug}`}
    onClick={(e) => {
      if (!onNavigate) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onNavigate(`/rehber/${rehber.slug}`);
    }}
    className={`group relative overflow-hidden flex flex-col justify-end aspect-square p-3.5 sm:p-4 rounded-2xl text-left cursor-pointer transition-transform hover:-translate-y-0.5 bg-gradient-to-br ${
      KARO_ZEMIN[sira % KARO_ZEMIN.length]
    }`}
  >
    {/*
      ARKA PLAN FOTOĞRAFI

      Karolar düz renk zeminlerdi; hepsi aynı görünüyor, hangisinin ne
      anlattığı ancak yazısı okununca anlaşılıyordu. Her rehberin konusuna
      uygun bir fotoğraf var: scripts/rehber-gorselleri.mjs ile indirilip
      kareye kırpılıyor, kendi sunucumuzdan gidiyor (dış adrese bağlanmak
      ziyaretçinin IP'sini oraya sızdırırdı).

      Renk zemini altta duruyor: fotoğraf yüklenemezse karo boş kalmıyor,
      eski hâline düşüyor. `onError` ile görsel gizleniyor.
    */}
    <img
      src={`/rehber-gorselleri/${rehber.slug}.jpg`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
    />

    {/*
      Alta doğru koyulaşan perde: başlık fotoğrafın her tonunda okunsun diye.
      Fotoğrafla birlikte koyulaştırıldı — düz renkte yeten %35, ayrıntılı bir
      fotoğrafın üstünde yazıyı okunur kılmıyordu.
    */}
    <span
      aria-hidden="true"
      className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10"
    />

    {/*
      Sağ üstte soru sayısı — Instagram'ın karosundaki izlenme rozetinin
      karşılığı. Orada "kaç kişi gördü", burada "kaç soru cevaplanıyor".
      Uydurma bir sayı değil: doğrudan rehberin SSS listesinden geliyor ve
      SSS'si olmayan rehberde hiç çizilmiyor.
    */}
    {rehber.sss && rehber.sss.length > 0 && (
      <span className="absolute top-2.5 right-2.5 z-10 text-[10px] font-bold text-white/90 bg-black/25 backdrop-blur-sm px-2 py-0.5 rounded-full">
        {rehber.sss.length} soru
      </span>
    )}

    <span className="relative z-10 block font-bold text-white leading-snug text-sm sm:text-base drop-shadow-sm">
      {rehber.baslik}
    </span>
    <span className="relative z-10 mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/85">
      Oku
      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
    </span>
  </a>
);

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
            <Kart key={r.slug} rehber={r} sira={i} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      {isveren.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">İşverenler için</h2>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
            {isveren.map((r, i) => (
              <Kart key={r.slug} rehber={r} sira={i} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export const GuideHub: React.FC<GuideHubProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Staj rehberi | StajımVar';
  }, []);

  const ogrenci = REHBERLER.filter((r) => r.kategori === 'ogrenci');
  const isveren = REHBERLER.filter((r) => r.kategori === 'isveren');

  return (
    <SayfaKabugu onBack={onBack} icerikGenisligi={SAYFA_GENISLIGI}>
      <div className="space-y-8 sm:space-y-10">
        {/* ======================================================= giriş */}
        {/*
          Başlık artık renkli bir alanın içinde ve yanında rakamlar var.

          Önce düz bir h1 + paragraftı; sayfa "bir metin dosyası" gibi
          açılıyordu. Rakamlar hem sayfanın dolu olduğunu gösteriyor hem de
          "34 bölüm" gibi somut bir vaat veriyor — "rehber" kelimesinin tek
          başına söylemediği şey.
        */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50/50 p-5 sm:p-8">
          <span
            aria-hidden="true"
            className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-blue-100/40"
          />
          <span
            aria-hidden="true"
            className="absolute -right-4 top-24 w-24 h-24 rounded-full bg-emerald-100/50"
          />
          <div className="relative max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-blue-200 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              <Sparkles className="w-3.5 h-3.5" />
              Staj rehberi
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              Staj, işini bilene kolay.
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              Belgeler, sigorta, CV, mülakat… Çoğu kişi istemediği için değil, nasıl
              olduğunu bilmediği için başlayamıyor. Burada sırayla anlatıyoruz.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
              {[
                { sayi: BOLUMLER.length, etiket: 'bölüm' },
                { sayi: ARACLAR.length, etiket: 'hesaplama aracı' },
                { sayi: ogrenci.length + isveren.length + 1, etiket: 'rehber' },
              ].map((s) => (
                <span key={s.etiket} className="text-sm text-gray-600">
                  <strong className="text-gray-900 text-lg tabular-nums">{s.sayi}</strong>{' '}
                  {s.etiket}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ================================================== kestirmeler */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Kestirmeler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RenkliKart
              ikon={<GraduationCap className="w-6 h-6 text-white" />}
              baslik="Bölüme göre staj"
              ozet="Kendi bölümünde staj nerede yapılır, stajyer ne iş yapar"
              rozet={`${BOLUMLER.length} bölüm`}
              zemin="bg-gradient-to-br from-violet-50 to-white border-violet-200"
              ikonZemin="bg-gradient-to-br from-violet-500 to-violet-600"
              onClick={() => onNavigate('/bolumler')}
            />
            <RenkliKart
              ikon={<Calculator className="w-6 h-6 text-white" />}
              baslik="Hesaplama araçları"
              ozet="Net, sıralama, staj ücreti ve staj günü"
              rozet={`${ARACLAR.length} araç`}
              zemin="bg-gradient-to-br from-emerald-50 to-white border-emerald-200"
              ikonZemin="bg-gradient-to-br from-emerald-500 to-emerald-600"
              onClick={() => onNavigate('/araclar')}
            />
            <RenkliKart
              ikon={<Building2 className="w-6 h-6 text-white" />}
              baslik="İşveren rehberi"
              ozet="Stajyer nasıl alınır: sigorta, ücret, evrak"
              rozet="Şirketler için"
              zemin="bg-gradient-to-br from-amber-50 to-white border-amber-200"
              ikonZemin="bg-gradient-to-br from-amber-500 to-amber-600"
              onClick={() => onNavigate('/isveren')}
            />
          </div>
        </section>

        <RehberListesi onNavigate={onNavigate} />

        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
          Rehberlerde yıldan yıla değişen oran ve tutarlar yazılmıyor; mekanizma anlatılıp
          güncel rakam için resmî kaynağa yönlendiriliyor. Eksik veya hatalı gördüğün bir
          şey olursa bize yaz.
        </p>
      </div>
    </SayfaKabugu>
  );
};

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
  const digerleri = REHBERLER.filter((r) => r.slug !== slug && r.kategori === kategori);
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

export const GuidePage: React.FC<GuidePageProps> = ({ slug, onBack, onNavigate }) => {
  const rehber = rehberBul(slug);

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
