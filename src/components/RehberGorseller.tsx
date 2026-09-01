import React from 'react';
import {
  Check,
  X,
  ArrowRight,
  Paperclip,
  School,
  Building2,
  FileText,
  ShieldCheck,
  Users,
} from 'lucide-react';

/**
 * Rehber sayfalarının görsel yapı taşları.
 *
 * NEDEN VAR
 * ---------
 * Rehberler düz metin duvarıydı: başlık, paragraf, madde işareti, tekrar.
 * Doğru bilgi ama okunmuyor — kişi kaydırıp geçiyor.
 *
 * Buradaki bileşenler bilgiyi ŞEKİLLE anlatıyor: süreç bir akış, karşılaştırma
 * iki sütun, sorumluluk bir tablo. Şekil hem daha hızlı okunuyor hem de metinde
 * gözden kaçan ilişkiyi görünür kılıyor ("bu adım şundan sonra geliyor").
 *
 * NEDEN FOTOĞRAF YOK
 * ------------------
 * Stok fotoğraf kullanmıyoruz: lisansı belirsiz görseller hukuki risk, üstelik
 * "gülümseyen ofis çalışanları" hiçbir şey anlatmıyor. Buradaki her görsel
 * kodla çizilmiş SVG — dosya indirilmiyor, sayfa yavaşlamıyor, telifi bize ait.
 */

/* ==================================================================== akış */

export interface AkisAdimi {
  baslik: string;
  aciklama: string;
}

/**
 * Numaralı süreç akışı.
 *
 * Adımlar arasında dikey bir çizgi var: "önce şu, sonra bu" ilişkisini
 * madde işaretli liste anlatamıyor, çizgi anlatıyor.
 */
export const Akis: React.FC<{ adimlar: AkisAdimi[] }> = ({ adimlar }) => (
  <ol className="relative space-y-1">
    {adimlar.map((a, i) => (
      <li key={a.baslik} className="relative flex gap-4 pb-5 last:pb-0">
        {/* Bağlantı çizgisi; son adımda çizilmiyor. */}
        {i < adimlar.length - 1 && (
          <span
            aria-hidden="true"
            className="absolute left-[15px] top-9 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-blue-100"
          />
        )}
        <span className="relative z-10 w-8 h-8 shrink-0 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shadow-sm">
          {i + 1}
        </span>
        <span className="min-w-0 pt-0.5">
          <span className="block font-bold text-gray-900">{a.baslik}</span>
          <span className="block text-sm text-gray-600 leading-relaxed mt-0.5">
            {a.aciklama}
          </span>
        </span>
      </li>
    ))}
  </ol>
);

/* ============================================================ karşılaştırma */

/**
 * İki sütunlu karşılaştırma: solda kaçınılacak, sağda yapılacak.
 *
 * "Şunu yapma, bunu yap" metin içinde kaybolan bir kalıp. Yan yana konunca
 * fark tek bakışta görünüyor — CV ve mülakat rehberlerinde en çok işe yarayan
 * anlatım biçimi bu.
 */
export const Karsilastirma: React.FC<{
  kotuBaslik?: string;
  iyiBaslik?: string;
  kotu: string[];
  iyi: string[];
}> = ({ kotuBaslik = 'Böyle olmasın', iyiBaslik = 'Böyle olsun', kotu, iyi }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
        <X className="w-3.5 h-3.5" />
        {kotuBaslik}
      </p>
      <ul className="space-y-1.5">
        {kotu.map((m) => (
          <li key={m} className="text-sm text-rose-950/80 leading-relaxed">
            {m}
          </li>
        ))}
      </ul>
    </div>
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
        <Check className="w-3.5 h-3.5" />
        {iyiBaslik}
      </p>
      <ul className="space-y-1.5">
        {iyi.map((m) => (
          <li key={m} className="text-sm text-emerald-950/80 leading-relaxed">
            {m}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

/* ========================================================= kontrol listesi */

/** Yapılacaklar listesi. Onay işareti, madde işaretinden daha bitirici. */
export const KontrolListesi: React.FC<{ baslik?: string; maddeler: string[] }> = ({
  baslik,
  maddeler,
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3">
    {baslik && <p className="font-bold text-gray-900">{baslik}</p>}
    <ul className="space-y-2.5">
      {maddeler.map((m) => (
        <li key={m} className="flex items-start gap-2.5">
          <span className="mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 border-emerald-500 text-emerald-600 flex items-center justify-center">
            <Check className="w-3 h-3" strokeWidth={3} />
          </span>
          <span className="text-sm text-gray-700 leading-relaxed">{m}</span>
        </li>
      ))}
    </ul>
  </div>
);

/* =============================================================== sorumluluk */

/**
 * "Kim ne yapar" tablosu.
 *
 * Staj sürecinde en çok karışan şey bu: sigortayı kim yapar, belgeyi kim
 * hazırlar, ücreti kim öder. Cümle içinde anlatılınca herkes kendi payını
 * kaçırıyor; üç sütunlu bir görselde kaçmıyor.
 */
export const SorumlulukTablosu: React.FC<{
  satirlar: { is: string; kim: 'okul' | 'ogrenci' | 'isveren'; not?: string }[];
}> = ({ satirlar }) => {
  const stil = {
    okul: { ad: 'Okul', renk: 'bg-violet-50 text-violet-700 border-violet-200', Ikon: School },
    ogrenci: { ad: 'Öğrenci', renk: 'bg-blue-50 text-blue-700 border-blue-200', Ikon: Users },
    isveren: {
      ad: 'İşveren',
      renk: 'bg-amber-50 text-amber-700 border-amber-200',
      Ikon: Building2,
    },
  } as const;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {satirlar.map((s) => {
        const { ad, renk, Ikon } = stil[s.kim];
        return (
          <div
            key={s.is}
            className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 last:border-b-0"
          >
            <span
              className={`inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg border text-xs font-bold ${renk}`}
            >
              <Ikon className="w-3.5 h-3.5" />
              {ad}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">{s.is}</span>
              {s.not && (
                <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {s.not}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Serbest karşılaştırma tablosu.
 *
 * SorumlulukTablosu "kim yapar" sorusuna özel: rozetleri okul/öğrenci/işveren
 * olarak sabit. Kanal karşılaştırması gibi başka eksenler için o kalıp
 * uymuyordu; bu bileşen sütunları çağıran taraftan alıyor.
 *
 * DAR EKRAN
 * ---------
 * Tablo mobilde satır satır karta dönüşüyor. Yatay kaydırmalı tablo
 * telefonda okunmuyor: kullanıcı sağdaki sütunun varlığını fark etmiyor.
 * 640 pikselin altında her satır kendi kartı, sütun adları etiket oluyor.
 *
 * Bu dönüşüm TEK DOM üzerinde, yalnızca CSS ile yapılıyor. Önce iki ayrı
 * blok vardı (biri masaüstü tablosu, biri mobil kartlar) ve karşıt olan
 * CSS ile gizleniyordu; ama ön render statik HTML ürettiği için aynı metin
 * dosyaya İKİ KEZ yazılıyordu — tarayıcı açısından sayfa kendi içeriğini
 * tekrar ediyor gibi görünüyordu. Sütun adları ::before ile geldiği için
 * artık etiketler de metne karışmıyor.
 */
export const KarsilastirmaTablosu: React.FC<{
  sutunlar: string[];
  satirlar: string[][];
}> = ({ sutunlar, satirlar }) => (
  <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
    <table className="w-full text-sm">
      <thead className="hidden sm:table-header-group">
        <tr className="bg-gray-50 border-b border-gray-200">
          {sutunlar.map((s) => (
            <th key={s} className="text-left font-bold text-gray-900 px-4 py-3">
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {satirlar.map((satir) => (
          <tr
            key={satir[0]}
            className="block sm:table-row border-b border-gray-100 last:border-b-0 align-top py-2 sm:py-0"
          >
            {satir.map((hucre, i) => (
              <td
                key={sutunlar[i]}
                data-etiket={`${sutunlar[i]}:`}
                className={
                  'block sm:table-cell px-4 py-1 sm:py-3 leading-relaxed ' +
                  (i === 0
                    ? 'text-sm font-bold sm:font-semibold text-gray-900'
                    : 'text-xs sm:text-sm text-gray-600 ' +
                      // dar ekranda sütun adı hücrenin başına etiket olarak geliyor
                      "before:content-[attr(data-etiket)] before:mr-1.5 before:font-semibold before:text-gray-500 sm:before:content-['']" +
                      ' sm:before:mr-0')
                }
              >
                {hucre}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ================================================================ illüstrasyon */

/**
 * Ekip illüstrasyonu.
 *
 * Soyut bilerek: iç içe geçmiş insan siluetleri, aralarında bir bağ. Stok
 * fotoğraftaki "gülümseyen ofis" klişesi yerine, anlatılan şeyi — bir ekibe
 * yeni birinin katılmasını — gösteriyor. Tamamen SVG; dosya indirilmiyor.
 */
export const EkipCizimi: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 320 140"
    className={`w-full h-auto ${className}`}
    role="img"
    aria-label="Bir ekibe yeni katılan stajyeri gösteren çizim"
  >
    {/* zemin çizgisi */}
    <line x1="16" y1="120" x2="304" y2="120" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />

    {/*
      KAFA KONUMU HESAPLANIYOR, ELLE YAZILMIYOR

      Gövde y=120'den başlayıp 22 piksel yükseliyor, sonra r yarıçaplı bir yay
      ile omuzları yapıyor; yani gövdenin tepesi y = 98 - r.

      İlk denemede kafa merkezi sabit bir formülle (68 - r) yazılmıştı ve
      kafalar gövdeden 18-20 piksel yukarıda, havada duruyordu — ölçüldü.
      Şimdi kafa, omuz çizgisinin 3 piksel içine girecek şekilde
      konumlanıyor: cy = (98 - r) - kafaYaricapi + 3.
    */}
    {[
      { x: 60, r: 18, govde: '#DBEAFE', bas: '#93C5FD' },
      { x: 110, r: 20, govde: '#BFDBFE', bas: '#60A5FA' },
      { x: 162, r: 18, govde: '#DBEAFE', bas: '#93C5FD' },
    ].map((k) => {
      const kafa = k.r * 0.62;
      const omuz = 98 - k.r;
      return (
        <g key={k.x}>
          <path
            d={`M ${k.x - k.r} 120 v -22 a ${k.r} ${k.r} 0 0 1 ${k.r * 2} 0 v 22 z`}
            fill={k.govde}
          />
          <circle cx={k.x} cy={omuz - kafa + 3} r={kafa} fill={k.bas} />
        </g>
      );
    })}

    {/* bağ: ekip ile yeni gelen arasında, göğüs hizasında */}
    <path
      d="M 186 96 C 205 96, 210 96, 226 96"
      stroke="#2563EB"
      strokeWidth="2.5"
      strokeDasharray="5 5"
      fill="none"
      strokeLinecap="round"
    />

    {/* yeni gelen: vurgulu renk, aynı hesapla */}
    <g>
      <path d="M 237 120 v -22 a 21 21 0 0 1 42 0 v 22 z" fill="#3B82F6" />
      <circle cx="258" cy="67" r="13" fill="#2563EB" />
      {/* katılım işareti: omuz hizasında, kafanın yanında */}
      <circle cx="281" cy="72" r="11" fill="#10B981" />
      <path
        d="M 276 72 l 3.5 3.5 l 7 -7"
        stroke="#fff"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

/**
 * Belge ve onay illüstrasyonu. Evrak adımlarını anlatan bölümlerde.
 */
export const BelgeCizimi: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 320 140"
    className={`w-full h-auto ${className}`}
    role="img"
    aria-label="Okul, belge ve işveren arasındaki akışı gösteren çizim"
  >
    {/* okul kutusu */}
    <rect x="14" y="46" width="74" height="52" rx="10" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="2" />
    <path d="M 30 66 h 42 M 30 76 h 30" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />

    {/* ok */}
    <path d="M 96 72 h 26" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M 118 66 l 8 6 l -8 6" stroke="#9CA3AF" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

    {/* belge */}
    <g>
      <path
        d="M 136 34 h 34 l 14 14 v 44 a 6 6 0 0 1 -6 6 h -42 a 6 6 0 0 1 -6 -6 v -52 a 6 6 0 0 1 6 -6 z"
        fill="#fff"
        stroke="#93C5FD"
        strokeWidth="2"
      />
      <path d="M 170 34 v 14 h 14" fill="none" stroke="#93C5FD" strokeWidth="2" />
      <path d="M 144 62 h 30 M 144 72 h 30 M 144 82 h 18" stroke="#BFDBFE" strokeWidth="3" strokeLinecap="round" />
      {/* onay damgası */}
      <circle cx="180" cy="92" r="13" fill="#10B981" />
      <path d="M 174 92 l 4 4 l 8 -8" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* ok */}
    <path d="M 202 72 h 26" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M 224 66 l 8 6 l -8 6" stroke="#9CA3AF" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

    {/* işveren binası */}
    <rect x="240" y="40" width="66" height="58" rx="8" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="2" />
    <rect x="252" y="54" width="14" height="14" rx="3" fill="#F59E0B" />
    <rect x="274" y="54" width="14" height="14" rx="3" fill="#F59E0B" />
    <rect x="252" y="76" width="14" height="14" rx="3" fill="#FBBF24" />
    <rect x="274" y="76" width="14" height="14" rx="3" fill="#FBBF24" />
  </svg>
);

/* ==================================================================== kazanç */

/**
 * Olumlu yanları gösteren kart ızgarası.
 *
 * İşveren rehberi yalnızca yükümlülük anlatıyordu: belge, sigorta, ücret.
 * Hepsi doğru ama okuyan kişide "başıma iş alacağım" hissi bırakıyor. Oysa
 * karşılığında ne kazandığı da gerçek ve söylenmeye değer.
 */
export const KazancKartlari: React.FC<{
  kartlar: { ikon: React.ReactNode; baslik: string; aciklama: string }[];
}> = ({ kartlar }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {kartlar.map((k) => (
      <div
        key={k.baslik}
        className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2"
      >
        <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          {k.ikon}
        </span>
        <p className="font-bold text-gray-900">{k.baslik}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{k.aciklama}</p>
      </div>
    ))}
  </div>
);

/** Rehber içinde görsel bir bölüm başlığı: ikon + başlık + isteğe bağlı çizim. */
export const GorselBolum: React.FC<{
  baslik: string;
  ozet?: string;
  cizim?: React.ReactNode;
  children: React.ReactNode;
}> = ({ baslik, ozet, cizim, children }) => (
  <section className="space-y-3">
    {cizim && (
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4 sm:p-6">
        {cizim}
      </div>
    )}
    <h2 className="text-lg font-bold text-gray-900">{baslik}</h2>
    {ozet && <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{ozet}</p>}
    {children}
  </section>
);

export { ArrowRight, FileText, ShieldCheck };


/* ============================================================== büyük kart */

/**
 * Renkli kısayol kartı.
 *
 * Önceki hâli üç beyaz kutuydu; hepsi aynı göründüğü için hiçbiri dikkat
 * çekmiyordu. Her kartın kendi rengi ve zemin geçişi var — göz hangisinin ne
 * olduğunu okumadan ayırt ediyor.
 */
export const RenkliKart: React.FC<{
  ikon: React.ReactNode;
  baslik: string;
  ozet: string;
  rozet: string;
  zemin: string;
  ikonZemin: string;
  onClick: () => void;
}> = ({ ikon, baslik, ozet, rozet, zemin, ikonZemin, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group relative overflow-hidden flex flex-col gap-3 p-5 rounded-3xl border text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${zemin}`}
  >
    {/* Köşedeki büyük soluk daire: kartın kendi rengini taşıyan sessiz bir doku. */}
    <span
      aria-hidden="true"
      className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/40 transition-transform group-hover:scale-110"
    />
    <span
      className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${ikonZemin}`}
    >
      {ikon}
    </span>
    <span className="relative min-w-0 space-y-1">
      <span className="block font-bold text-gray-900">{baslik}</span>
      <span className="block text-sm text-gray-600 leading-snug">{ozet}</span>
    </span>
    <span className="relative mt-auto pt-1 flex items-center gap-1.5 text-xs font-bold text-gray-700">
      {rozet}
      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
    </span>
  </button>
);

/* ============================================================ örnek metin */

/**
 * KOPYALANABİLİR ÖRNEK
 *
 * Öğrencinin gerçekten kullanacağı metin (e-posta gövdesi, CV satırı)
 * görsele gömülmüyor: HTML içinde duruyor. Böylece seçilebiliyor,
 * kopyalanabiliyor ve ekran okuyucu okuyabiliyor. Bir örneği ekran
 * görüntüsü olarak koymak, onu kullanılamaz hâle getirmek olurdu.
 *
 * Kopyalama düğmesi bir kolaylık; metin düğme olmadan da seçilebilir.
 */
export const RehberOrnek: React.FC<{
  baslik?: string;
  aciklama?: string;
  metin: string;
}> = ({ baslik, aciklama, metin }) => {
  const [kopyalandi, setKopyalandi] = React.useState(false);

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      window.setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      /* Pano kapalıysa metin zaten seçilebilir; sessizce geçiliyor. */
    }
  };

  return (
    <figure className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
          {baslik ?? 'Örnek'}
        </span>
        <button
          type="button"
          onClick={kopyala}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100"
        >
          {kopyalandi ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
          {kopyalandi ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words px-4 py-3.5 font-mono text-[13px] leading-relaxed text-gray-800">
        {metin}
      </pre>
      {aciklama && (
        <figcaption className="border-t border-gray-100 px-4 py-2.5 text-xs leading-relaxed text-gray-500">
          {aciklama}
        </figcaption>
      )}
    </figure>
  );
};

/* ========================================================== e-posta maketi */

/**
 * E-POSTA MAKETİ — MARKASIZ VE SEMANTİK
 *
 * Gerçek bir posta istemcisinin ekran görüntüsü değil: alanlar HTML
 * içinde duruyor, metin kopyalanabiliyor ve ekran okuyucu "Kime",
 * "Konu" etiketlerini okuyabiliyor. Bir marka arayüzünü taklit etmek
 * hem gereksiz hem yanıltıcı olurdu.
 */
export const EpostaOrnegi: React.FC<{
  kime: string;
  konu: string;
  govde: string;
  ek?: string;
  aciklama?: string;
}> = ({ kime, konu, govde, ek, aciklama }) => (
  <figure className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
    <dl className="divide-y divide-gray-100 text-sm">
      {[
        ['Kime', kime],
        ['Konu', konu],
      ].map(([etiket, deger]) => (
        <div key={etiket} className="flex gap-3 px-4 py-2.5">
          <dt className="w-14 shrink-0 text-xs font-bold uppercase tracking-wider text-gray-500 pt-0.5">
            {etiket}
          </dt>
          <dd className="min-w-0 break-words font-semibold text-gray-900">{deger}</dd>
        </div>
      ))}
    </dl>
    <div className="border-t border-gray-100 px-4 py-3.5">
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-800">
        {govde}
      </pre>
    </div>
    {ek && (
      <p className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-600">
        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
        Ek: {ek}
      </p>
    )}
    {aciklama && (
      <figcaption className="border-t border-gray-100 px-4 py-2.5 text-xs leading-relaxed text-gray-500">
        {aciklama}
      </figcaption>
    )}
  </figure>
);

/* ======================================================= açıklamalı CV iskeleti */

/**
 * AÇIKLAMALI CV İSKELETİ
 *
 * CV'nin hangi bölümünün ne işe yaradığını gösteriyor. Raster görsel
 * değil: bölüm adları ve açıklamalar metin olarak duruyor, arama motoru
 * ve ekran okuyucu ikisini de görüyor.
 *
 * İçindeki örnek satırlar UYDURMA BİR KİŞİYE ait değil — alan adları
 * köşeli parantezle yer tutucu olarak yazılıyor ki kimse gerçek bir
 * kişinin verisi sanmasın.
 */
export const CvIskeleti: React.FC<{
  bolumler: { ad: string; ne: string; ornek?: string }[];
  aciklama?: string;
}> = ({ bolumler, aciklama }) => (
  <figure className="space-y-3">
    <ol className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {bolumler.map((b, i) => (
        <li
          key={b.ad}
          className="flex gap-3 border-b border-gray-100 px-4 py-3.5 last:border-b-0 sm:gap-4"
        >
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-xs font-black text-blue-700">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-gray-900">{b.ad}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{b.ne}</p>
            {b.ornek && (
              <p className="mt-1.5 rounded-lg bg-gray-50 px-3 py-2 font-mono text-[12.5px] leading-relaxed text-gray-700">
                {b.ornek}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
    {aciklama && (
      <figcaption className="text-xs leading-relaxed text-gray-500">{aciklama}</figcaption>
    )}
  </figure>
);

/* ================================================================ figür */

/**
 * EDİTORYAL GÖRSEL
 *
 * Bilgi taşıyan SVG'ler için ortak kap. Süsleme görseli buradan
 * geçmiyor: her görselin bir alt metni ve bir açıklaması olmak zorunda.
 *
 * NEDEN <img> VE DOSYA, INLINE SVG DEĞİL
 * --------------------------------------
 * Görsel kendi adresinde erişilebilir olsun istiyoruz: paylaşım kartına
 * konabilsin, tarayıcı önbelleğe alabilsin, aynı görsel iki rehberde
 * kullanılırsa ikinci kez indirilmesin. Inline SVG bunların hiçbirini
 * vermiyor, üstelik her sayfanın HTML'ini şişiriyor.
 *
 * `width`/`height` ZORUNLU: oranı baştan bilmeyen tarayıcı görsel
 * yüklenince sayfayı kaydırıyor (CLS).
 *
 * NEDEN ÜST GENİŞLİK SINIRI
 * -------------------------
 * Rehber sütunu masaüstünde 688px, telefonda 343px (ölçüldü). Görseller
 * 400px genişliğinde çizildiği için sınır konmazsa masaüstünde 1.7 kat
 * büyüyor ve yazılar gövde metninden iri duruyor. 460px sınırı iki
 * uçtaki ölçeği (0.86 ve 1.15) birbirine yaklaştırıyor.
 *
 * NEDEN VARSAYILAN `lazy`
 * -----------------------
 * İlk turda dört rehberde `gecikmeli={false}` verilmişti, gerekçe
 * "editoryal görsel önemli"ydi. Ölçüm bunu çürüttü: telefonda (375×812)
 * figürlerin üst kenarı 743–1817px'te, masaüstünde (1280×900) 695px'te
 * başlıyor. Hiçbiri LCP adayı değil; ilk ekranı H1 ve kısa cevap kartı
 * dolduruyor. Eager verilen görsel React'in ön render çıktısına ayrıca
 * `<link rel="preload" as="image">` düşürüyor ve gerçek LCP ile bant
 * genişliği için yarışıyor. Bu yüzden `gecikmeli` yalnız görselin ilk
 * ekranda GERÇEKTEN göründüğü ölçüldüyse `false` verilir; rehber başına
 * en fazla bir tane.
 */
export const RehberFigur: React.FC<{
  kaynak: string;
  alt: string;
  aciklama?: string;
  genislik: number;
  yukseklik: number;
  /** Yalnız ilk ekranda göründüğü ÖLÇÜLEN görsel için `false`. */
  gecikmeli?: boolean;
}> = ({ kaynak, alt, aciklama, genislik, yukseklik, gecikmeli = true }) => (
  <figure className="space-y-2">
    <img
      src={kaynak}
      alt={alt}
      width={genislik}
      height={yukseklik}
      loading={gecikmeli ? 'lazy' : 'eager'}
      decoding="async"
      className="w-full max-w-[460px] mx-auto h-auto rounded-2xl border border-gray-200 bg-white"
    />
    {aciklama && (
      <figcaption className="text-xs leading-relaxed text-gray-500">{aciklama}</figcaption>
    )}
  </figure>
);
