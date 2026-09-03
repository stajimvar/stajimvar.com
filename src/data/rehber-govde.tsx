import React from 'react';
import {
  KontrolListesi,
  Karsilastirma,
  KarsilastirmaTablosu,
  RehberFigur,
} from '../components/RehberGorseller';
import type { KonuId, Rehber, SoruCevap } from './rehberler';

/**
 * Rehber gövdesi — metinden çizim.
 *
 * NEDEN JSX DEĞİL VERİ
 * --------------------
 * İlk on bir rehber tek tek JSX olarak yazıldı. On birde yürüyor; yetmişte
 * yürümüyor. Her yazının kendi işaretlemesini taşıması üç şeyi bozuyordu:
 *
 *   1. Yapı yazıdan yazıya kayıyor. Birinde "Sık yapılan hatalar" bir
 *      liste, ötekinde paragraf; okuyucu her sayfada yeniden yön arıyor.
 *   2. Ortak bir değişiklik (başlıklara bağlantı eklemek gibi) yetmiş
 *      dosyaya dokunmak demek.
 *   3. Metin, işaretlemenin arasında kayboluyor; yazarken de gözden
 *      geçirirken de okunmuyor.
 *
 * Burada bir rehber düz veri: başlıklar, paragraflar, listeler. Çizim tek
 * yerde ve her sayfa aynı iskeleti kullanıyor.
 *
 * BAĞLANTI YAZIMI
 * ---------------
 * Paragraf ve liste metinlerinde `[görünen metin](/adres)` yazılabiliyor.
 * İç bağlantı SEO'nun taşıyıcısı: rehberden ürüne ve rehberden rehbere
 * giden yol olmadan yetmiş sayfa yetmiş ada olur. Dış adresler yeni
 * sekmede açılıyor.
 */

const BAGLANTI = /\[([^\]]+)\]\(([^)]+)\)/g;

/** `[metin](/adres)` yazımını gerçek bağlantıya çeviriyor. */
function metniCiz(metin: string, anahtar: string): React.ReactNode[] {
  const parcalar: React.ReactNode[] = [];
  let son = 0;
  let esles: RegExpExecArray | null;
  BAGLANTI.lastIndex = 0;
  let sayac = 0;

  while ((esles = BAGLANTI.exec(metin)) !== null) {
    if (esles.index > son) parcalar.push(metin.slice(son, esles.index));
    const [, yazi, adres] = esles;
    const dis = adres.startsWith('http');
    parcalar.push(
      <a
        key={`${anahtar}-b${sayac++}`}
        href={adres}
        {...(dis ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        className="text-blue-600 hover:underline font-semibold"
      >
        {yazi}
      </a>
    );
    son = esles.index + esles[0].length;
  }
  if (son < metin.length) parcalar.push(metin.slice(son));
  return parcalar;
}

export interface Blok {
  /** Bölüm başlığı (h2). İçindekiler listesi bunlardan üretiliyor. */
  baslik?: string;
  paragraflar?: string[];
  /** Madde imli liste. */
  liste?: string[];
  /** Numaralı liste — sıra gerçekten önemliyse. */
  sirali?: string[];
  /** Sarı kutu: yanlış yapılırsa geri dönüşü olmayan şeyler. */
  uyari?: string;
  kontrol?: { baslik?: string; maddeler: string[] };
  karsilastirma?: { kotuBaslik?: string; iyiBaslik?: string; kotu: string[]; iyi: string[] };
  tablo?: { sutunlar: string[]; satirlar: string[][] };
  /*
    Editoryal görsel. Yeni bir görsel yolu açmıyor: aynı `RehberFigur`
    bileşenine bağlanıyor ki alt metni, boyut ve gecikme kuralı tek yerde
    kalsın. `metinRehberi` ile yazılan rehberlerin JSX'e dönmesi gerekmesin
    diye burada.
  */
  figur?: {
    kaynak: string;
    alt: string;
    aciklama?: string;
    genislik: number;
    yukseklik: number;
  };
}

const Baslik: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-bold text-gray-900 pt-4">{children}</h2>
);

export const GovdeCizimi: React.FC<{ bloklar: Blok[] }> = ({ bloklar }) => (
  <>
    {bloklar.map((b, i) => (
      <React.Fragment key={i}>
        {b.baslik && <Baslik>{b.baslik}</Baslik>}
        {b.paragraflar?.map((p, j) => (
          <p key={j} className="text-sm sm:text-base text-gray-600 leading-relaxed">
            {metniCiz(p, `${i}-${j}`)}
          </p>
        ))}
        {b.liste && (
          <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
            {b.liste.map((m, j) => (
              <li key={j}>{metniCiz(m, `${i}-l${j}`)}</li>
            ))}
          </ul>
        )}
        {b.sirali && (
          <ol className="list-decimal pl-5 space-y-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
            {b.sirali.map((m, j) => (
              <li key={j}>{metniCiz(m, `${i}-s${j}`)}</li>
            ))}
          </ol>
        )}
        {b.figur && (
          <RehberFigur
            kaynak={b.figur.kaynak}
            alt={b.figur.alt}
            aciklama={b.figur.aciklama}
            genislik={b.figur.genislik}
            yukseklik={b.figur.yukseklik}
          />
        )}
        {b.kontrol && <KontrolListesi baslik={b.kontrol.baslik} maddeler={b.kontrol.maddeler} />}
        {b.karsilastirma && (
          <Karsilastirma
            kotuBaslik={b.karsilastirma.kotuBaslik}
            iyiBaslik={b.karsilastirma.iyiBaslik}
            kotu={b.karsilastirma.kotu}
            iyi={b.karsilastirma.iyi}
          />
        )}
        {b.tablo && (
          <KarsilastirmaTablosu sutunlar={b.tablo.sutunlar} satirlar={b.tablo.satirlar} />
        )}
        {b.uyari && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
            {metniCiz(b.uyari, `${i}-u`)}
          </div>
        )}
      </React.Fragment>
    ))}
  </>
);

export interface RehberTaslagi {
  slug: string;
  baslik: string;
  ozet: string;
  konu: KonuId;
  aciklama: string;
  hizliCevap: string;
  bloklar: Blok[];
  sss: SoruCevap[];
  /* Tip Rehber kaydıyla aynı: kurum, tür ve neyi doğruladığı da taşınıyor. */
  kaynaklar?: Rehber['kaynaklar'];
  sonrakiAdim?: { etiket: string; yol: string; aciklama?: string };
  etiketler?: string[];
  oneCikan?: boolean;
  guncelleme?: string;
  /* Gözden geçiren kişi ya da rol; boş bırakılabiliyor (bkz. Rehber tipi). */
  inceleyen?: string;
}

/**
 * Taslağı yayına hazır rehbere çeviriyor.
 *
 * `kategori` her zaman 'ogrenci': bu fabrikayla yazılan yazılar öğrenci
 * rehberleri. İşveren tarafı ayrı ve elle yazılıyor.
 */
export function metinRehberi(t: RehberTaslagi): Rehber {
  return {
    slug: t.slug,
    baslik: t.baslik,
    ozet: t.ozet,
    kategori: 'ogrenci',
    konu: t.konu,
    aciklama: t.aciklama,
    hizliCevap: t.hizliCevap,
    etiketler: t.etiketler,
    oneCikan: t.oneCikan,
    kaynaklar: t.kaynaklar,
    sonrakiAdim: t.sonrakiAdim,
    sss: t.sss,
    guncelleme: t.guncelleme ?? '2026-08-25',
    inceleyen: t.inceleyen,
    icerik: <GovdeCizimi bloklar={t.bloklar} />,
  };
}
