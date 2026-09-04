import React from 'react';
import {
  KURUMLAR,
  CIFTLER,
  DURUMLAR,
  ciftBul,
  kurumBul,
  kurumunCiftleri,
  tarihYazisi,
  kurumEslestir,
} from '../lib/burs-cakisma.mjs';

/**
 * Burs çakışma matrisi.
 *
 * NEDEN ÖNCE SEÇİCİ, SONRA TABLO
 * ------------------------------
 * Öğrencinin sorusu 64 hücrelik değil, TEK hücrelik: "KYK alıyorum, TEV'e
 * başvurabilir miyim". Sayfayı 8x8 bir tabloyla açmak, o tek cevabı bulma
 * işini okuyucuya bırakmak olur. Seçici üstte duruyor ve tek bir cevap
 * veriyor; tablo altta, karşılaştırmak isteyene.
 *
 * MOBİLDE TABLO HİÇ ÇİZİLMİYOR
 * ----------------------------
 * Sekiz sütunlu bir matris 375px'e sığmıyor. Yatay kaydırma "sığdırdık"
 * demek değil: telefonda yatay kaydırılan tablonun sağ yarısı pratikte
 * görülmüyor, üstelik sayfanın kendisi de yana kayıyor. Bu yüzden tablo
 * `hidden lg:block` — mobilde seçici ve çift listesi aynı bilgiyi zaten
 * eksiksiz veriyor.
 *
 * ÇİFT LİSTESİ NEDEN HER BOYUTTA VAR
 * ----------------------------------
 * Tablo hücresine sığan şey renkli bir etiketten ibaret; gerekçe ve kaynak
 * sığmıyor. Ama bu sayfanın tek değeri gerekçe ve kaynak. Liste, 28 çiftin
 * hepsini gerekçesi ve resmî kaynağıyla birlikte düz metin olarak taşıyor:
 * hem telefonun tek gerçek görünümü, hem de tarayıcının okuduğu içerik.
 * Yalnızca tıklanınca açılan bir kutuya koysaydık, statik HTML'de
 * görünmezdi.
 */

/* ------------------------------------------------------------------ parçalar */

const Rozet: React.FC<{ durum: string; kucuk?: boolean }> = ({ durum, kucuk = false }) => {
  const d = DURUMLAR[durum];
  if (!d) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border font-bold ${d.sinif} ${
        kucuk ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      }`}
    >
      <span aria-hidden="true">{d.isaret}</span>
      {d.etiket}
    </span>
  );
};

/**
 * Kaynak satırı.
 *
 * Tarih BAŞLIKTA değil burada: adrese yıl gömülseydi sayfa her ocak ayında
 * ölür, biriken bağlantılar boşa giderdi. Tarih hücrenin kendisinde
 * duruyor, okuyucu tazeliği kendisi ölçüyor.
 */
const Kaynak: React.FC<{ cift: any }> = ({ cift }) => (
  <p className="text-xs leading-relaxed text-gray-500">
    Kaynak:{' '}
    <a
      href={cift.kaynakUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-blue-600 hover:underline"
    >
      {cift.kaynakBaslik}
    </a>{' '}
    ({tarihYazisi(cift.erisimTarihi)})
  </p>
);

/* -------------------------------------------------------------------- seçici */

const Secici: React.FC<{
  etiket: string;
  deger: string;
  onDegis: (v: string) => void;
  id: string;
}> = ({ etiket, deger, onDegis, id }) => (
  <div className="min-w-0 flex-1">
    <label htmlFor={id} className="block text-xs font-bold text-gray-700">
      {etiket}
    </label>
    <select
      id={id}
      value={deger}
      onChange={(e) => onDegis(e.target.value)}
      className="mt-1 w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900"
    >
      {KURUMLAR.map((k: any) => (
        <option key={k.id} value={k.id}>
          {k.ad}
        </option>
      ))}
    </select>
  </div>
);

const SonucKarti: React.FC<{ aldigim: string; basvuracagim: string }> = ({
  aldigim,
  basvuracagim,
}) => {
  const a = kurumBul(aldigim);
  const b = kurumBul(basvuracagim);
  const cift = ciftBul(aldigim, basvuracagim);

  /*
    AYNI KURUM SEÇİLDİĞİNDE UYDURMA CEVAP ÜRETİLMİYOR

    "KYK bursu + KYK bursu" bir soru değil. Boş bir kart ya da rastgele bir
    durum göstermek yerine ne olduğu söyleniyor.
  */
  if (!cift) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">
          İki tarafta da aynı kurumu seçtin. Karşılaştırmak için farklı iki kurum seç.
        </p>
      </div>
    );
  }

  const d = DURUMLAR[cift.durum];

  return (
    <div className={`rounded-xl border p-4 ${d.sinif}`} aria-live="polite">
      <p className="text-xs font-semibold opacity-80">
        {a?.ad} alıyorsun, {b?.ad} için başvuracaksın
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-lg font-extrabold">
        <span aria-hidden="true">{d.isaret}</span>
        {d.etiket}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed">{cift.gerekce}</p>
      {cift.not && <p className="mt-2 text-sm leading-relaxed opacity-90">{cift.not}</p>}
      <div className="mt-3 border-t border-current/15 pt-2">
        <Kaynak cift={cift} />
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- tam matris */

const TamMatris: React.FC<{
  aldigim: string;
  basvuracagim: string;
  onSec: (a: string, b: string) => void;
}> = ({ aldigim, basvuracagim, onSec }) => (
  /*
    GERÇEK TABLO, DIV IZGARASI DEĞİL

    Ekran okuyucu bir hücreye geldiğinde hangi satır ve hangi sütun olduğunu
    ancak th/scope varsa söyleyebiliyor. Div'lerle çizilmiş bir matris
    görenler için tablo, görmeyenler için anlamsız bir renk dizisi olurdu.
  */
  <div className="hidden lg:block">
    <table className="w-full table-fixed border-collapse text-center">
      <caption className="sr-only">
        Satırda şu an aldığın burs, sütunda başvuracağın burs. Hücreler ikisinin birlikte
        alınıp alınamayacağını gösteriyor.
      </caption>
      <thead>
        <tr>
          <th scope="col" className="w-[104px] p-1 text-left align-bottom">
            <span className="text-[10px] font-bold leading-tight text-gray-500">
              Aldığım ↓ / Başvuracağım →
            </span>
          </th>
          {KURUMLAR.map((k: any) => (
            <th
              key={k.id}
              scope="col"
              className="p-1 align-bottom text-[10px] font-bold leading-tight text-gray-700"
            >
              {k.kisaAd}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {KURUMLAR.map((satir: any) => (
          <tr key={satir.id}>
            <th
              scope="row"
              className="p-1 text-left text-[10px] font-bold leading-tight text-gray-700"
            >
              {satir.kisaAd}
            </th>
            {KURUMLAR.map((sutun: any) => {
              const cift = ciftBul(satir.id, sutun.id);
              if (!cift) {
                return (
                  <td key={sutun.id} className="p-0.5">
                    <div className="rounded-lg bg-gray-50 py-2 text-[10px] text-gray-300">—</div>
                  </td>
                );
              }
              const d = DURUMLAR[cift.durum];
              const secili = satir.id === aldigim && sutun.id === basvuracagim;
              return (
                <td key={sutun.id} className="p-0.5">
                  <button
                    type="button"
                    onClick={() => onSec(satir.id, sutun.id)}
                    aria-pressed={secili}
                    className={`w-full cursor-pointer rounded-lg border px-1 py-1.5 leading-tight transition ${d.sinif} ${
                      secili ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:brightness-95'
                    }`}
                  >
                    <span className="block text-xs font-bold" aria-hidden="true">
                      {d.isaret}
                    </span>
                    <span className="block text-[10px] font-semibold">{d.etiket}</span>
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-2 text-xs text-gray-500">
      Bir kutuya tıkla, gerekçesi ve kaynağı yukarıdaki kartta açılsın.
    </p>
  </div>
);

/* ------------------------------------------------------------- çift listesi */

const CiftListesi: React.FC = () => (
  <div className="space-y-2">
    {CIFTLER.map((cift: any) => {
      const a = kurumBul(cift.a);
      const b = kurumBul(cift.b);
      return (
        <div
          key={`${cift.a}-${cift.b}`}
          className="rounded-2xl border border-gray-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Rozet durum={cift.durum} />
            <p className="text-sm font-bold text-gray-900">
              {a?.kisaAd} + {b?.kisaAd}
            </p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{cift.gerekce}</p>
          {cift.not && (
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{cift.not}</p>
          )}
          <div className="mt-2">
            <Kaynak cift={cift} />
          </div>
        </div>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ gösterge */

const Gosterge: React.FC = () => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Dört durum</p>
    <ul className="mt-2 space-y-1.5">
      {Object.entries(DURUMLAR).map(([id, d]: [string, any]) => (
        <li key={id} className="flex items-start gap-2">
          <span className="shrink-0">
            <Rozet durum={id} kucuk />
          </span>
          <span className="text-xs leading-relaxed text-gray-600">{d.aciklama}</span>
        </li>
      ))}
    </ul>
  </div>
);

/* --------------------------------------------------------------------- ana */

export const BursCakismaMatrisi: React.FC = () => {
  /*
    BAŞLANGIÇ SEÇİMİ BOŞ DEĞİL

    Ön render bu bileşeni statik HTML'e çeviriyor. Boş bir seçimle açılsaydı
    tarayıcının gördüğü ilk şey boş bir kart olurdu. En çok sorulan çift
    (KYK bursu + TEV) açık geliyor: hem sayfa dolu açılıyor, hem de gelen
    okuyucunun sorusu çoğu zaman zaten bu.
  */
  const [aldigim, setAldigim] = React.useState('kyk-burs');
  const [basvuracagim, setBasvuracagim] = React.useState('tev');

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <h2 className="text-lg font-bold text-gray-900">Çift çift bak</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">
          Şu an aldığın bursu ve başvurmayı düşündüğünü seç; ikisinin birlikte yürüyüp
          yürümediğini kaynağıyla birlikte göster.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Secici
            id="burs-aldigim"
            etiket="Şu an aldığım"
            deger={aldigim}
            onDegis={setAldigim}
          />
          <Secici
            id="burs-basvuracagim"
            etiket="Başvuracağım"
            deger={basvuracagim}
            onDegis={setBasvuracagim}
          />
        </div>
        <div className="mt-3">
          <SonucKarti aldigim={aldigim} basvuracagim={basvuracagim} />
        </div>
      </div>

      <Gosterge />

      <h2 className="pt-2 text-lg font-bold text-gray-900">Tüm matris</h2>
      <TamMatris
        aldigim={aldigim}
        basvuracagim={basvuracagim}
        onSec={(a, b) => {
          setAldigim(a);
          setBasvuracagim(b);
        }}
      />

      <h2 className="pt-2 text-lg font-bold text-gray-900">Çiftlerin tamamı</h2>
      <p className="text-sm leading-relaxed text-gray-600">
        Yirmi sekiz çiftin hepsi, gerekçesi ve dayandığı resmî belgeyle birlikte. Bir hücrenin
        kaynağı yoksa o hücre "belirsiz" yazıyor — tahmin yazmıyoruz.
      </p>
      <CiftListesi />
    </section>
  );
};

/* --------------------------------------------------------------- mini blok */

/**
 * Burs ilanı sayfasındaki küçük uyum bloğu.
 *
 * Aynı veriden besleniyor: ilan sayfasına ayrı bir metin yazılsaydı matris
 * güncellenip burası eskirdi. Yalnızca dört satır gösteriyor — ilan
 * sayfasının işi bursu anlatmak, matrisin tamamını çizmek değil.
 *
 * `kurumId` boşsa (tanımadığımız bir vakıf bursu) blok HİÇ çizilmiyor:
 * bilmediğimiz bir bursu tanıdık bir satıra oturtmak yanlış bilgi olur.
 */
export const BursUyumMiniBlok: React.FC<{
  kurumId: string | null;
  onNavigate?: (yol: string) => void;
}> = ({ kurumId, onNavigate }) => {
  if (!kurumId) return null;
  const kurum = kurumBul(kurumId);
  if (!kurum) return null;

  const satirlar = kurumunCiftleri(kurumId).slice(0, 4);
  if (satirlar.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-bold text-gray-900">
        Başka burs alıyorsan: {kurum.kisaAd} ile birlikte yürür mü?
      </h2>
      <ul className="mt-2.5 space-y-2">
        {satirlar.map(({ diger, cift }: any) => (
          <li key={diger.id} className="flex items-start gap-2">
            <span className="shrink-0 pt-0.5">
              <Rozet durum={cift.durum} kucuk />
            </span>
            <span className="min-w-0 text-xs leading-relaxed text-gray-600">
              <strong className="font-semibold text-gray-900">{diger.kisaAd}:</strong>{' '}
              {cift.gerekce}
            </span>
          </li>
        ))}
      </ul>
      <a
        href="/rehber/burs-cakisma"
        onClick={(e) => {
          if (!onNavigate) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          onNavigate('/rehber/burs-cakisma');
        }}
        className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline"
      >
        Tüm burslar için çakışma matrisini aç →
      </a>
    </section>
  );
};

/**
 * Burs kartındaki tek satırlık uyum göstergesi.
 *
 * NEDEN TEK KARŞILAŞTIRMA
 * -----------------------
 * Kart tarama yüzeyi; yedi satırlık bir liste kartı boğar. Öğrencilerin
 * büyük çoğunluğunda elde olan burs KYK bursu olduğu için karşılaştırma ona
 * göre yapılıyor. KYK bursunun kendi kartında ise anlamlı karşılaştırma
 * öğrenim kredisiyle olanı.
 *
 * DÖRT DURUM DA GÖSTERİLİYOR
 * --------------------------
 * Yalnızca "olur" ve "olmaz" gösterip belirsizleri gizlemek, kartlarda
 * sanki her şey netmiş gibi bir izlenim bırakırdı. Belirsiz de bir cevap:
 * "bunu kurumdan sorman gerekiyor".
 */
export const BursUyumRozeti: React.FC<{
  tur: string | null | undefined;
  baslik: string | null | undefined;
  kurumAdi?: string | null;
}> = ({ tur, baslik, kurumAdi }) => {
  if (tur !== 'scholarship' && tur !== 'kyk') return null;
  const kurumId = kurumEslestir(baslik, kurumAdi);
  if (!kurumId) return null;

  const olcut = kurumId === 'kyk-burs' ? 'kyk-kredi' : 'kyk-burs';
  const cift = ciftBul(kurumId, olcut);
  if (!cift) return null;

  const d = DURUMLAR[cift.durum];
  const etiket = olcut === 'kyk-kredi' ? 'Öğrenim kredisiyle' : 'KYK bursuyla';

  return (
    <p className="flex items-center gap-1.5 text-[13px] text-gray-600">
      <span
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold ${d.sinif}`}
        aria-hidden="true"
      >
        {d.isaret}
      </span>
      <span className="min-w-0">
        {etiket}: <strong className="font-semibold text-gray-900">{d.etiket}</strong>
      </span>
    </p>
  );
};
