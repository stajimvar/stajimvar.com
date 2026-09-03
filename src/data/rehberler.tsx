import React from 'react';
import { STAJ_REHBERLERI } from './rehber-yazilari/staj';
import { CV_REHBERLERI } from './rehber-yazilari/cv';
import { BURS_REHBERLERI } from './rehber-yazilari/burs';
import { YURT_REHBERLERI } from './rehber-yazilari/yurt';
import { UNIVERSITE_REHBERLERI } from './rehber-yazilari/universite';
import { YURTDISI_REHBERLERI } from './rehber-yazilari/yurtdisi';
import { KARIYER_REHBERLERI } from './rehber-yazilari/kariyer';
import {
  Akis,
  CvIskeleti,
  EpostaOrnegi,
  Karsilastirma,
  KarsilastirmaTablosu,
  KontrolListesi,
  RehberFigur,
  RehberOrnek,
} from '../components/RehberGorseller';

/**
 * Rehber içerikleri.
 *
 * NEDEN TEK DOSYADA KAYIT
 * -----------------------
 * Kariyer.net'in "Kariyer Planlaması" menüsünde yirmiye yakın başlık var ve
 * her biri ayrı bir sayfa. Her başlık için ayrı bileşen yazmak, yirminci
 * başlıkta yirmi ayrı dosyayı aynı anda güncellemek demek. Burada bir rehber
 * eklemek = bu dizine bir girdi eklemek. Sayfa, yönlendirme ve site haritası
 * kendiliğinden çalışır.
 *
 * İÇERİK KURALI
 * -------------
 * Yıldan yıla değişen oran ve tutarlar YAZILMIYOR. Asgari ücrete endeksli
 * ödemeler, prim oranları, taban puanlar her yıl güncelleniyor; sabit bir
 * rakam bırakmak bir süre sonra okuyucuyu yanlış yönlendirmek olur.
 * Mekanizma anlatılıyor, güncel rakam için resmî kaynağa yönlendiriliyor.
 *
 * Metinler doğrulanmayı bekliyor; yayınlanan her sayfada bunu söyleyen bir
 * uyarı var.
 */

export type RehberKategori = 'ogrenci' | 'isveren';

export interface SoruCevap {
  soru: string;
  cevap: string;
}

export interface Rehber {
  slug: string;
  baslik: string;
  ozet: string;
  kategori: RehberKategori;
  /** Arama motorunun ve paylaşımın göreceği açıklama. */
  aciklama: string;
  icerik: React.ReactNode;
  /**
   * Sık sorulanlar.
   *
   * NEDEN AYRI ALAN, İÇERİĞİN İÇİNDE DEĞİL
   * --------------------------------------
   * Bu liste iki yerde birden kullanılıyor: sayfanın altında görünen
   * bölüm ve ön render'ın ürettiği FAQPage yapısal verisi. Google bu
   * veriyi okuyunca arama sonucunda soruları açılır kapanır biçimde
   * gösterebiliyor — sonuçta kapladığın alan büyüyor.
   *
   * JSX içine gömülü olsaydı ön render betiği (Node) onu okuyamazdı;
   * düz metin olduğu için ikisi de aynı kaynaktan besleniyor.
   *
   * Cevaplar DÜZ METİN olmalı: yapısal veride HTML kabul edilmiyor.
   */
  sss?: SoruCevap[];
  /**
   * Son gözden geçirme tarihi (YYYY-AA-GG).
   *
   * Mevzuata değen içerikte okuyucunun "bu ne kadar taze" sorusuna
   * cevap veriyor; Article yapısal verisinde dateModified olarak da
   * kullanılıyor. Elle güncelleniyor — otomatik bugünün tarihini
   * basmak yalan olurdu.
   */
  guncelleme?: string;
  /**
   * Gözden geçiren kişi ya da rol.
   *
   * NEDEN ROL DE OLABİLİYOR
   * -----------------------
   * Mevzuata değen içerikte "kim baktı" sorusu tarihten sonra gelen ikinci
   * soru. Ad yazmak her zaman mümkün değil; ekipte bu işi yapan rolü yazmak
   * ("StajımVar içerik ekibi") hiçbir şey yazmamaktan iyi, ama uydurulmuş bir
   * unvan yazmaktan da iyi. Alan boş bırakılabilir: doldurulmadığında
   * ekranda hiç çizilmiyor.
   *
   * Burada YAZILANIN DOĞRU OLMASI gerekiyor. Hukukçu incelemesinden geçmemiş
   * bir metne "hukuk danışmanı onayladı" yazmak, okuyucuya olmayan bir
   * güvence satmaktır.
   */
  inceleyen?: string;
  /**
   * Konu — Rehber sekmesindeki kategori süzgeci.
   *
   * `kategori` kime hitap ettiğini söylüyor (öğrenci / işveren); `konu` ise
   * neyle ilgili olduğunu. İkisi ayrı sorular: bir öğrenci "burs" diye
   * süzmek istiyor, "öğrenci içerikleri" diye değil.
   */
  konu: KonuId;
  /** Arama bunlarda da eşleşiyor: başlık kelimesi olmayan sorgular için. */
  etiketler?: string[];
  /** Rehber merkezinde öne çıkanlar bölümünde görünsün mü. */
  oneCikan?: boolean;
  /**
   * Hızlı cevap — sayfanın en başında iki üç cümle.
   *
   * Öğrencilerin çoğu tek bir soruyla geliyor ("sigortayı kim yapar").
   * Cevabı bulmak için 1500 kelime okutmak, cevabı vermemekle aynı şey.
   * Ayrıntı aşağıda duruyor; kısası yukarıda.
   */
  hizliCevap?: string;
  /**
   * Resmî kaynaklar.
   *
   * NEDEN SADECE ADRES YETMİYOR
   * ---------------------------
   * Önce yalnızca `etiket` ve `adres` vardı ve adreslerin çoğu kurumun ANA
   * SAYFASIYDI: "SGK" yazıp sgk.gov.tr'ye göndermek, okuyucuya aradığını
   * bulma işini bırakıyor ve "resmî kaynaklı" iddiasını zayıflatıyor.
   *
   * `destekledigi` alanı en önemlisi: kaynağın hangi cümleyi doğruladığını
   * söylüyor. Bunu yazamadığımız bir kaynak, muhtemelen oraya süs olarak
   * konmuştur.
   */
  kaynaklar?: {
    /** Kaynağın adı — mümkünse belgenin kendi başlığı. */
    etiket: string;
    adres: string;
    /** Belgeyi yayımlayan kurum. */
    kurum?: string;
    /**
     * 'belge': doğrudan sayfaya/duyuruya gidiyor.
     * 'kurum': kurumun ana sayfası — güncel bilgiyi orada aramak gerekiyor.
     * Ayrım okuyucuya ne bekleyeceğini söylüyor.
     */
    tur?: 'belge' | 'kurum';
    /** Bu kaynağın yazıdaki hangi iddiayı desteklediği. */
    destekledigi?: string;
  }[];
  /**
   * Okunduktan sonra yapılabilecek GERÇEK bir şey.
   *
   * Yazının sonunda yalnızca başka yazılar göstermek, okuyanı bir
   * arşivde dolaştırmak demek. Var olmayan bir sayfaya bağlanmıyoruz:
   * karşılığı olmayan rehberde bu alan boş kalıyor.
   */
  sonrakiAdim?: { etiket: string; yol: string; aciklama?: string };
}

/* ------------------------------------------------------------------ konular */

/*
  KONU LİSTESİ

  Rehber sekmesi yalnızca staj yazılarının bulunduğu bir alan olmaktan
  çıkıyor: burs, KYK, yurt, üniversite hayatı, yurtdışı ve ilk iş de
  öğrencinin aynı yerde aradığı şeyler. Konu listesi bu genişlemenin
  iskeleti — bugün hepsinde yazı yok, ama yazı geldikçe süzgeç hazır.
*/
export const KONULAR = [
  { id: 'staj', etiket: 'Staj' },
  { id: 'cv', etiket: 'CV ve başvuru' },
  { id: 'burs', etiket: 'Burs ve KYK' },
  { id: 'yurt', etiket: 'Yurt ve barınma' },
  { id: 'universite', etiket: 'Üniversite hayatı' },
  { id: 'yurtdisi', etiket: 'Yurtdışı' },
  { id: 'kariyer', etiket: 'İlk iş ve kariyer' },
] as const;

export type KonuId = (typeof KONULAR)[number]['id'];

export const konuEtiketi = (id: KonuId): string =>
  KONULAR.find((k) => k.id === id)?.etiket ?? 'Rehber';

/**
 * Okuma süresi — kartlarda "6 soru" yerine.
 *
 * NEDEN HESAPLANIYOR, ELLE YAZILMIYOR
 * -----------------------------------
 * Kartta "6 soru" yazıyordu: doğru bir sayıydı ama okuyucunun sorduğu şey
 * değil. "Kaç dakikamı alacak" sorusunun cevabı elle girilseydi metin
 * uzadıkça sessizce yanlışlaşırdı.
 *
 * JSX ağacı düz veri: children'ları gezip metinleri topluyoruz. Aynı
 * hesap hem tarayıcıda hem ön render'da (Node) çalışıyor, çünkü ortada
 * DOM değil nesne var. Dakika = kelime / 200, en az 1.
 */
/*
  METİN TOPLAMA

  İlk sürüm yalnızca `children` içine iniyordu ve ölçüm yanlış çıkıyordu:
  rehberlerin çoğu metni ÖZEL BİLEŞENLERİN PROP'LARINDA taşıyor
  (`<Akis adimlar={[...]}/>`, `<KontrolListesi maddeler={[...]}/>`,
  `<KarsilastirmaTablosu satirlar={[[...]]}/>`). KYK rehberi bu yüzden
  "1 dk" görünüyordu.

  Artık bütün prop'lar geziliyor. Sınıf adı, adres, ikon gibi metin
  OLMAYAN prop'lar dışarıda: onları saymak dakikayı şişirirdi.
*/
const METIN_OLMAYAN_PROPLAR = new Set([
  'className', 'style', 'href', 'src', 'id', 'key', 'ref', 'target', 'rel',
  'type', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'xmlns',
  'loading', 'role', 'aria-hidden', 'alt', 'onError', 'onClick',
]);

function metniTopla(dugum: unknown, kova: string[] = []): string[] {
  if (dugum == null || typeof dugum === 'boolean' || typeof dugum === 'function') return kova;
  if (typeof dugum === 'string' || typeof dugum === 'number') {
    kova.push(String(dugum));
    return kova;
  }
  if (Array.isArray(dugum)) {
    for (const cocuk of dugum) metniTopla(cocuk, kova);
    return kova;
  }
  const proplar = (dugum as any)?.props;
  if (proplar && typeof proplar === 'object') {
    for (const [ad, deger] of Object.entries(proplar)) {
      if (METIN_OLMAYAN_PROPLAR.has(ad)) continue;
      metniTopla(deger, kova);
    }
    return kova;
  }
  /* React öğesi değil, düz nesne: değerlerini gez (Akis adımları gibi). */
  if (Object.getPrototypeOf(dugum) === Object.prototype) {
    for (const deger of Object.values(dugum as Record<string, unknown>)) metniTopla(deger, kova);
  }
  return kova;
}

export function rehberOkumaDakika(rehber: Rehber): number {
  const metin = metniTopla(rehber.icerik).join(' ');
  const kelime = metin.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(kelime / 200));
}

const B: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-bold text-gray-900 pt-4">{children}</h2>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{children}</p>
);

const L: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
    {children}
  </ul>
);

const Uyari: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
    {children}
  </div>
);

const Kaynak: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer noopener"
    className="text-blue-600 hover:underline font-semibold"
  >
    {children}
  </a>
);

/*
  YAZILAR KONUYA GÖRE AYRI DOSYALARDA

  İlk on bir rehber bu dosyada, tek tek JSX olarak yazıldı. Yetmiş yazıda
  aynı dosya okunmaz olurdu; yeni yazılar `rehber-yazilari/` altında konu
  konu duruyor ve `rehber-govde.tsx` ile düz veriden çiziliyor.

  Sıra önemli: liste hem rehber merkezinde hem ön render'da bu sırayla
  geziliyor. Eski yazılar başta kalıyor — arama sonuçlarında yerleşmiş
  sayfalar.
*/
export const REHBERLER: Rehber[] = [
  // ------------------------------------------------------------------ öğrenci
  {
    slug: 'zorunlu-staj-rehberi',
    konu: 'staj',
    oneCikan: true,
    etiketler: ['sigorta', 'belge', 'okul', 'sgk', 'zorunlu staj'],
    hizliCevap:
      'Zorunlu stajda sırayla üç şey yapılır: okulun staj birimine gidip yönergeyi ve zorunlu staj formunu almak, formu kabul eden bir işyerine imzalatmak, imzalı formu okula teslim edip sigorta girişini başlatmak. Sigortayı çoğu üniversitede okul yapar; kesin cevabı kendi okulunun yönergesindedir.',
    kaynaklar: [
      { etiket: 'Sosyal Güvenlik Kurumu', adres: 'https://www.sgk.gov.tr', kurum: 'Sosyal Güvenlik Kurumu', tur: 'kurum' },
      { etiket: 'Yükseköğretim Kurulu (YÖK)', adres: 'https://www.yok.gov.tr', kurum: 'Yükseköğretim Kurulu', tur: 'kurum' },
    ],
    sonrakiAdim: { etiket: 'Staj gününü hesapla', yol: '/araclar/staj-gunu-hesaplama', aciklama: 'Kaç iş günü kaldığını tarih vererek gör.' },
    baslik: 'Zorunlu staj rehberi',
    ozet: 'Belge, sigorta, süre ve okulla olan süreç — sırayla.',
    kategori: 'ogrenci',
    aciklama:
      'Zorunlu staj nasıl yapılır? Belgeler, sigorta yükümlülüğü, süre ve okul ' +
      'staj birimiyle yürütülecek süreç adım adım.',
    icerik: (
      <>
        <P>
          Zorunlu staj, mezun olabilmek için müfredat gereği yapmak zorunda olduğun stajdır.
          Gönüllü stajdan farkı sadece "mecburi" olması değil: belge akışı, sigorta ve ücret
          konularında farklı kurallara tabi.
        </P>

        <RehberFigur
          kaynak="/rehber-gorseller/zorunlu-staj-sureci.svg"
          alt="Zorunlu staj süreci altı adımda: yönergeyi oku, staj yeri bul, komisyona onaylat, sigorta işlemini başlat, staj dönemi, defter ve belgeleri teslim et. Görselde ayrıca üniversiteye göre sürecin değişebileceği uyarısı var."
          aciklama="Sürecin tamamı tek bakışta. Adımların sırası ve form adları her üniversitede aynı değil; bağlayıcı olan kendi bölümünün staj yönergesi."
          genislik={400}
          yukseklik={636}
        />

        <B>Süreç sırası</B>
        <Akis
          adimlar={[
            {
              baslik: 'Okulun kurallarını öğren',
              aciklama:
                'Staj birimine git; yönergeyi, kaç iş günü gerektiğini, hangi dönemde yapılabildiğini ve kabul edilen iş yeri türünü öğren.',
            },
            {
              baslik: 'Şirket bul',
              aciklama:
                'İlanlardan, kariyer sayfalarından ya da doğrudan başvuruyla. Okulun kabul ettiği iş yeri türüne uyduğundan emin ol.',
            },
            {
              baslik: 'Zorunlu staj formunu al',
              aciklama:
                'Okulun hazırladığı form, stajın müfredat kapsamında olduğunu gösteriyor. Şirket bu belgeyi görmeden seni başlatmamalı.',
            },
            {
              baslik: 'Şirkete imzalat',
              aciklama:
                'Form şirket tarafından doldurulup kaşelenir. Tarihlerin okulun kabul ettiği aralıkta olduğunu kontrol et.',
            },
            {
              baslik: 'Formu okula teslim et',
              aciklama:
                'Sigorta girişi bu teslimle başlıyor. Girişin yapıldığını teyit etmeden staja başlama.',
            },
            {
              baslik: 'Stajı yap',
              aciklama:
                'Devamsızlık kuralları okuldan okula değişiyor; kaç gün mazeret hakkın olduğunu baştan öğren.',
            },
            {
              baslik: 'Defteri/raporu doldur',
              aciklama:
                'Her gün iki satır yazmak, sonunda otuz günü hatırlamaya çalışmaktan kolay.',
            },
            {
              baslik: 'Teslim et',
              aciklama:
                'Teslim tarihini ve istenen imza/kaşeleri staj bitmeden önce öğren.',
            },
          ]}
        />
        <P>
          <strong className="text-gray-900">Bu sıra her üniversitede aynı değil.</strong>{' '}
          Bazı okullarda form önce şirkete, bazılarında önce birime gidiyor; istenen belgeler
          ve teslim biçimi de değişiyor. Buradaki akış genel bir çerçeve — bağlayıcı olan
          kendi bölümünün staj yönergesi.
        </P>

        <B>Belge kontrol listesi</B>
        <KontrolListesi
          baslik="Stajdan önce elinde olması gerekenler"
          maddeler={[
            'Bölümünün staj yönergesi (kaç iş günü, hangi dönem, hangi iş yeri türü).',
            'Okulun zorunlu staj formu.',
            'Formun şirket tarafından doldurulmuş ve kaşelenmiş hâli.',
            'Sigorta girişinin yapıldığına dair teyit.',
            'Staj defteri ya da rapor şablonu.',
          ]}
        />
        <P>
          Listedeki adlar okuldan okula değişebiliyor; bazı bölümler ek olarak nüfus
          belgesi ya da banka bilgisi isteyebiliyor. Kendi yönergende yazan liste esastır.
        </P>

        <B>1. Okulunun staj birimiyle başla, şirketle değil</B>
        <P>
          En sık yapılan hata, önce şirket bulup sonra okula gitmek. Oysa okul her yıl staj
          dönemini, kabul edilen iş yeri türünü ve gereken belgeleri belirliyor. Şirketle
          anlaştıktan sonra "bu iş yeri uygun değil" cevabı almak, bulduğun yeri kaybettiriyor.
        </P>
        <L>
          <li>Staj dönemi ne zaman başlıyor, kaç iş günü olmalı?</li>
          <li>Hangi tür iş yerleri kabul ediliyor?</li>
          <li>Sigortayı okul mu yapıyor, sen mi başvuracaksın?</li>
        </L>

        <B>2. Zorunlu staj belgesini al</B>
        <P>
          Okulun hazırladığı staj formu, stajın müfredat kapsamında olduğunu ve okulun süreçte
          taraf olduğunu gösteriyor. Şirket bu belgeyi görmeden seni başlatmamalı — belge, hem
          seni hem şirketi koruyor.
        </P>

        <B>3. Sigorta kimde?</B>
        <P>
          İşverenlerin en çok tereddüt ettiği ve staj bulmayı zorlaştıran nokta bu.{' '}
          <strong className="text-gray-900">
            Zorunlu stajda öğrencinin iş kazası ve meslek hastalığı sigortası genellikle okul
            tarafından yapılıyor ve primi okul ödüyor.
          </strong>{' '}
          Yani şirketin ek bir SGK maliyeti çoğu durumda doğmuyor.
        </P>
        <P>
          Bu bilgi işe alım görüşmesinde işine yarar: "sigorta size ek yük getirmiyor, okulum
          yapıyor" diyebilmek, tereddüt eden küçük işletmelerde kapı açıyor. Ama önce{' '}
          <strong className="text-gray-900">okulundan yazılı teyit al</strong> — program türüne
          göre değişebiliyor.
        </P>

        <B>4. Ücret</B>
        <P>
          3308 sayılı Mesleki Eğitim Kanunu kapsamındaki stajlarda öğrenciye ücret ödenmesi
          zorunlu. Tutar asgari ücrete endeksli ve işletmedeki personel sayısına göre değişiyor;
          belirli bir kısmı için devlet katkısı var.
        </P>
        <P>
          Oranlar her yıl güncellendiği için burada rakam vermiyoruz. Güncel değerler için{' '}
          <Kaynak href="https://www.sgk.gov.tr">SGK</Kaynak>,{' '}
          <Kaynak href="https://www.meb.gov.tr">MEB</Kaynak> ve{' '}
          <Kaynak href="https://www.iskur.gov.tr">İŞKUR</Kaynak>; okulunun staj birimi de o yılın
          tutarını biliyor.
        </P>

        <B>Sık yapılan hatalar</B>
        <L>
          <li>Belgeyi almadan staja başlamak — sonradan sayılmama riski var.</li>
          <li>Devamsızlık takibini ciddiye almamak; staj iş günü üzerinden sayılıyor.</li>
          <li>
            Staj defterini son haftaya bırakmak. Her gün iki satır yazmak, sonunda otuz sayfa
            hatırlamaya çalışmaktan kolay.
          </li>
          <li>Bitiminde şirketten onaylı belgeyi almadan ayrılmak.</li>
        </L>

        <Uyari>
          <strong>Bu sayfa hukuki danışmanlık değildir.</strong> Mevzuat ve tutarlar değişebilir;
          bağlayıcı bilgi için SGK, MEB, İŞKUR ve okulunun staj birimini esas al. Eksik veya
          hatalı gördüğün bir şey varsa bize yaz, düzeltelim.
        </Uyari>
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'Zorunlu staj kaç iş günü?',
        cevap:
          'Süreyi okul belirliyor ve bölüme göre değişiyor; yaygın olarak 20 veya 30 iş günü isteniyor. Kesin süre okulunun staj yönergesinde yazıyor. Takvim günü değil iş günü sayıldığı için hafta sonları ve resmî tatiller sayılmıyor.',
      },
      {
        soru: 'Zorunlu stajda sigortayı kim yapar?',
        cevap:
          'Zorunlu stajda iş kazası ve meslek hastalığı sigortası genellikle okul tarafından yapılıyor ve primi okul ödüyor. Ancak program türüne göre değişebiliyor; staja başlamadan önce okulunun staj biriminden yazılı teyit al.',
      },
      {
        soru: 'Zorunlu stajda ücret ödenmesi zorunlu mu?',
        cevap:
          '3308 sayılı Mesleki Eğitim Kanunu kapsamındaki stajlarda öğrenciye ücret ödenmesi zorunlu. Tutar asgari ücrete endeksli ve işletmedeki personel sayısına göre değişiyor; belirli bir kısmı için devlet katkısı bulunuyor.',
      },
      {
        soru: 'Staja belge almadan başlayabilir miyim?',
        cevap:
          'Başlamamalısın. Okulun düzenlediği staj belgesi olmadan geçirilen günler çoğu okulda sayılmıyor ve sigorta girişi yapılmadığı için kaza durumunda koruma da olmuyor.',
      },
      {
        soru: 'Stajımı istediğim şirkette yapabilir miyim?',
        cevap:
          'Okulun staj yönergesi hangi tür iş yerlerinin kabul edildiğini belirliyor. Belge sürecine girmeden önce bölüm staj sorumlusuna iş yerinin uygun olup olmadığını sormak, sonradan reddedilme riskini ortadan kaldırıyor.',
      },
      {
        soru: 'Zorunlu staj ile gönüllü staj arasındaki fark nedir?',
        cevap:
          'Zorunlu staj müfredatın parçası; okul taraf oluyor, belge veriyor ve genellikle sigortayı yapıyor. Gönüllü staj isteğe bağlı; sigorta ve ücret yükümlülükleri farklı işliyor, okul taraf olmayabiliyor.',
      },
    ],
  },

  {
    slug: 'staj-cv-nasil-yazilir',
    konu: 'cv',
    oneCikan: true,
    etiketler: ['cv', 'özgeçmiş', 'deneyimsiz', 'ats'],
    hizliCevap:
      'Deneyimin yoksa CV’yi boş bırakmıyorsun: ders projeleri, kullandığın programlar, kulüp ve gönüllü işler gerçek içeriktir. İşveren stajyerde iş geçmişi değil, öğrenme hızı ve ne yaptığını anlatabilme becerisi arıyor.',
    sonrakiAdim: { etiket: 'Profilini tamamla ve CV’ni indir', yol: '/cv', aciklama: 'Profilindeki bilgilerle hazır bir CV üretiliyor.' },
    baslik: 'Deneyimin yokken staj CV’si nasıl yazılır',
    ozet: 'Boş bir “iş deneyimi” bölümüyle ne yapacağını bilmiyorsan.',
    kategori: 'ogrenci',
    aciklama:
      'Hiç iş deneyimi olmayan öğrenci staj CV’sinde ne yazar? Okul projeleri, ' +
      'dersler, gönüllü işler ve becerileri doğru sunmanın yolu.',
    icerik: (
      <>
        <P>
          Staj CV'sinin en zor kısmı "iş deneyimi" başlığı. Hiç çalışmamışsan orası boş kalıyor
          ve CV eksik görünüyor. Çözüm o başlığı zorlamak değil, <strong className="text-gray-900">
          yerine ne koyacağını bilmek</strong>.
        </P>

        <B>Staj CV'sinde ne nerede durur</B>
        <CvIskeleti
          bolumler={[
            {
              ad: 'İletişim',
              ne: 'Ad, telefon, e-posta, şehir. Fotoğraf zorunlu değil; adres ve TC kimlik yazma.',
              ornek: '[Ad Soyad] · [şehir] · [telefon] · [e-posta]',
            },
            {
              ad: 'Eğitim',
              ne: 'Üniversite, bölüm, sınıf ve beklenen mezuniyet. Deneyimin yokken en üstte durur.',
              ornek: '[Üniversite] — [Bölüm], 3. sınıf · beklenen mezuniyet [yıl]',
            },
            {
              ad: 'Projeler',
              ne: 'Staj CV’sinin asıl gövdesi. Her proje için ne yaptın, hangi araçla, sonuç ne oldu.',
              ornek: '[Proje adı] — [ne yaptın], [araç/dil], [sonuç]',
            },
            {
              ad: 'Deneyim',
              ne: 'Varsa yarı zamanlı iş, gönüllü çalışma, kulüp görevi. Yoksa bu başlık hiç açılmaz.',
            },
            {
              ad: 'Yetenekler',
              ne: 'Araç ve dil adları, seviyesiyle birlikte. Uzun bir kelime listesi değil.',
              ornek: '[Program] (orta) · [Dil] (başlangıç) · [Araç] (ileri)',
            },
          ]}
          aciklama="Köşeli parantezli alanlar yer tutucu — gerçek bir kişiye ait örnek kullanılmıyor. Deneyimin yokken sıra böyle: eğitim ve projeler yukarı çıkar."
        />

        <RehberFigur
          kaynak="/rehber-gorseller/cv-ogrenci-ornegi.svg"
          alt="Örnek öğrenci CV sayfası. Numaralı bölümler sırayla iletişim, eğitim, projeler, deneyim ve yetenekleri gösteriyor; alanlar köşeli parantezli yer tutucu."
          aciklama="Aynı iskelet tek sayfaya yerleştirildiğinde böyle görünüyor. Sayfadaki bilgiler örnektir; gerçek bir kişiye ait değildir."
          genislik={400}
          yukseklik={740}
        />

        <B>Deneyim yerine ne yazılır</B>
        <L>
          <li>
            <strong>Okul projeleri.</strong> Bitirme projesi, dönem ödevi, atölye çalışması.
            Ne yaptığını, hangi araçları kullandığını ve sonucu yaz.
          </li>
          <li>
            <strong>Kişisel çalışmalar.</strong> Kendi merakınla yaptığın bir şey — bir tasarım,
            bir program, tamir ettiğin bir cihaz. İşverenin aradığı şey merak ve süreklilik.
          </li>
          <li>
            <strong>Gönüllü işler ve kulüpler.</strong> Etkinlik düzenlemek de bir organizasyon
            deneyimi.
          </li>
          <li>
            <strong>Yarı zamanlı işler.</strong> Alanınla ilgisi olmasa bile: devamlılık,
            müşteriyle iletişim ve sorumluluk gösterir.
          </li>
        </L>

        <B>Bir projeyi CV'ye nasıl çevirirsin</B>
        <P>
          Öğrenci CV'lerindeki en yaygın satır şu: "Bitirme projesi". Bu, okuyan kişiye
          hiçbir şey söylemiyor. Aynı projenin iki yazılışı:
        </P>
        <Karsilastirma
          kotuBaslik="Okunmayan"
          iyiBaslik="Okunan"
          kotu={[
            'Bitirme projesi',
            'Arduino ile çalıştım',
            'Grup projesinde yer aldım',
          ]}
          iyi={[
            'Bitirme projesi — üç kişilik ekipte sensör verisini toplayan arayüzü yazdım',
            'Arduino ve sıcaklık sensörüyle sera nemini ölçen bir düzenek kurdum; verileri SD karta kaydettim',
            'Dört kişilik grup projesinde maliyet tablosunu ve sunumu ben hazırladım',
          ]}
        />
        <P>
          Fark tek bir soruda: <strong>sen ne yaptın?</strong> Ekip projesinde bile senin
          payını yaz. "Yer aldım" cümlesi, hiçbir şey yapmamış olmakla aynı görünüyor.
        </P>

        <B>Bölüme göre ne öne çıkar</B>
        <P>
          Hangi bölümde olursan ol yazacak bir şeyin var; sadece işverenin baktığı yer
          değişiyor:
        </P>
        <KarsilastirmaTablosu
          sutunlar={['Alan', 'Öne çıkar', 'Somut örnek']}
          satirlar={[
            [
              'Yazılım / bilişim',
              'Çalışan bir şey',
              'Küçük bir uygulama, kod deposu bağlantısı, okulda yazdığın bir betik',
            ],
            [
              'Makine / elektrik / inşaat',
              'Araç ve ölçü',
              'Kullandığın çizim programı, atölye deneyimi, ölçüm aleti, bir imalat sürecini görmüş olman',
            ],
            [
              'İşletme / iktisat',
              'Sayıyla anlatılan iş',
              'Kulüp bütçesi, etkinlik katılımcı sayısı, hazırladığın rapor ya da analiz',
            ],
            [
              'Tasarım / mimarlık',
              'Portfolyo',
              'CV\'ye bir bağlantı ya da QR; işveren yazıyı değil işi görmek istiyor',
            ],
            [
              'Sosyal / eğitim',
              'İnsanla temas',
              'Gönüllü çalışma, saha anketi, düzenlediğin etkinlik, kaç kişiye ulaştığın',
            ],
          ]}
        />

        <B>CV'ni önce bir yazılım okuyabilir</B>
        <P>
          Büyük şirketlerin çoğu başvuruları bir başvuru takip sistemi (ATS) üzerinden
          topluyor. Bu sistem CV'ni metne çevirip anahtar kelimelere bakıyor. Elemeyi
          yazılımın yaptığı doğru değil — insan yine okuyor — ama <strong>düzgün
          okunamayan bir CV eksik görünüyor</strong>. Riski düşüren birkaç şey:
        </P>
        <L>
          <li>
            <strong>PDF gönder, çok sütunlu şablon kullanma.</strong> İki sütunlu şık
            şablonlar metne çevrilince satırlar birbirine karışabiliyor.
          </li>
          <li>
            <strong>Başlıkları herkesin kullandığı gibi yaz.</strong> "Eğitim",
            "Deneyim", "Beceriler", "Projeler". Yaratıcı başlıklar eşleşmiyor.
          </li>
          <li>
            <strong>Bilgiyi görsele gömme.</strong> Beceri çubukları ve grafik ikonlar
            metin olarak çıkmıyor; yanına yazıyla da yaz.
          </li>
          <li>
            <strong>İletişim bilgisini üst bilgi (header) alanına koyma.</strong> Bazı
            sistemler sayfa üst-alt bilgisini hiç okumuyor.
          </li>
          <li>
            <strong>İlandaki kelimeleri kullan.</strong> İlan "üretim planlama" diyorsa
            CV'nde "operasyon takibi" yazmak eşleşmeyi bozuyor.
          </li>
        </L>
        <P>
          Küçük ve orta ölçekli işletmelerde böyle bir sistem genelde yok; CV'ni doğrudan
          bir insan açıyor. Yani bu kurallar CV'ni çirkinleştirecek kadar abartılmamalı —
          sadeleştirmek zaten ikisine de yarıyor.
        </P>

        <B>Beceri yazarken seviye belirt</B>
        <P>
          "Excel biliyorum" bir şey söylemiyor. "Excel — PIVOT tablo ve DÜŞEYARA seviyesinde"
          söylüyor. Abartma: mülakatta sorulduğunda yapamadığın bir şeyi yazmak, hiç yazmamaktan
          kötü.
        </P>

        <B>Aynı beceri, iki farklı yazım</B>
        <Karsilastirma
          kotuBaslik="Bilgi taşımıyor"
          iyiBaslik="Ne yaptığın belli"
          kotu={[
            'Python biliyorum.',
            'Takım çalışmasına yatkınım.',
            'Excel: iyi.',
            'İletişim becerim güçlü.',
          ]}
          iyi={[
            'Python ile ürün fiyatlarını takip eden küçük bir web uygulaması geliştirdim.',
            'Dört kişilik bitirme projesinde veri toplama kısmını üstlendim.',
            'Excel’de pivot tablo ve düşeyara ile 500 satırlık ders verisini raporladım.',
            'Kulüp etkinliğinde 60 kişilik katılımcı yazışmasını yürüttüm.',
          ]}
        />

        <B>Göndermeden önce</B>
        <KontrolListesi
          baslik="CV kontrol listesi"
          maddeler={[
            'Dosya PDF ve adı "AdSoyad-CV.pdf".',
            'Tek sayfa.',
            'En az bir projede ne yaptığın, hangi araçla ve sonucu yazıyor.',
            'Beceriler seviyesiyle yazılmış; boş kelime listesi yok.',
            'Yazım hatası için bir kez daha okundu.',
            'İletişim bilgileri güncel ve e-posta adresi ciddi.',
          ]}
        />

        <B>Bir sayfa yeter</B>
        <P>
          Staj başvurusunda iki sayfalık CV, doldurmak için uzatıldığı izlenimi veriyor.
          Okuyan kişi ortalama birkaç saniye bakıyor; en güçlü şeyin ilk yarım sayfada olsun.
        </P>

        <B>Her başvuruya aynı CV'yi gönderme</B>
        <P>
          İlanda geçen kelimeleri CV'nde kullan. "Üretim planlama" arayan bir ilana, aynı işi
          "operasyon takibi" diye anlatan bir CV gönderirsen eşleşme kurulamıyor.
        </P>

        <P>
          StajımVar'da profilini doldurduğunda bunların çoğu hazır hale geliyor:{' '}
          <strong className="text-gray-900">Profil → CV'ni indir</strong> ile yazdırılabilir bir
          CV alabilirsin.
        </P>
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'Hiç iş deneyimim yoksa CV\'de ne yazarım?',
        cevap:
          'Okul projeleri, kişisel çalışmalar, kulüp ve gönüllü işler, yarı zamanlı işler. Ne yaptığını, hangi araçları kullandığını ve sonucu yaz. İşverenin aradığı şey merak ve süreklilik.',
      },
      {
        soru: 'Staj CV\'si kaç sayfa olmalı?',
        cevap:
          'Bir sayfa. Öğrenci CV\'sinde ikinci sayfayı dolduracak kadar içerik varsa genellikle gereksiz ayrıntı eklenmiş demektir.',
      },
      {
        soru: 'CV\'yi hangi biçimde göndermeliyim?',
        cevap:
          'PDF. Word dosyası karşı tarafta bozuk açılabiliyor. Dosya adı da \'cv.pdf\' değil \'AdSoyad-CV.pdf\' olmalı; İK klasöründe kaybolmasın.',
      },
      {
        soru: 'Fotoğraf koymalı mıyım?',
        cevap:
          'Türkiye\'de yaygın ama zorunlu değil. Koyacaksan sade ve düzgün bir fotoğraf olsun; sosyal medya fotoğrafı kullanma.',
      },
      {
        soru: 'Becerileri nasıl yazmalıyım?',
        cevap:
          'Seviye belirterek. \'Excel\' yerine \'Excel — pivot tablo ve DÜŞEYARA\' gibi. Bilmediğin bir aracı listeye eklemek mülakatta sorulunca daha kötü bir duruma sokuyor.',
      },
    ],
  },

  {
    slug: 'staj-mulakati',
    konu: 'cv',
    etiketler: ['mülakat', 'görüşme', 'sorular'],
    hizliCevap:
      'Staj mülakatında sorular kişiyi değil hazırlığı ölçüyor: neden bu şirket, hangi projeyi yaptın, bir sorunu nasıl çözdün. Cevapları ezberlemek yerine üç somut örnek hazırlamak yetiyor.',
    sonrakiAdim: { etiket: 'Açık staj ilanlarına bak', yol: '/', aciklama: 'Hazırlandığın mülakatın çıkacağı yer burası.' },
    baslik: 'Staj mülakatına hazırlık',
    ozet: 'Sorulan sorular, hazırlanma yolu ve sık yapılan hatalar.',
    kategori: 'ogrenci',
    aciklama:
      'Staj mülakatında ne sorulur, nasıl hazırlanılır? Öğrenciye özel sorular ' +
      've sık yapılan hatalar.',
    icerik: (
      <>
        <P>
          Staj mülakatı bir uzmanlık sınavı değil. İşveren senden tecrübe beklemiyor; öğrenmeye
          açık olup olmadığını, işe devam edip etmeyeceğini ve ekiple çalışabilecek misin onu
          anlamaya çalışıyor.
        </P>

        <RehberFigur
          kaynak="/rehber-gorseller/staj-mulakati-sureci.svg"
          alt="Mülakatın üç aşaması: öncesinde şirketi oku ve bağlantıyı dene, sırasında projeni anlat ve tarih sor, sonrasında teşekkür e-postası yaz. Altta proje anlatmanın dört adımı: soru, durum, ne yaptım, sonuç."
          aciklama="Yukarıdaki üç halka mülakatın aşamaları, alttaki kutular bir projeyi anlatırken izlenecek sıra. Ayrıntılar aşağıda."
          genislik={400}
          yukseklik={700}
        />

        <B>Mülakatın üç aşaması</B>
        <Akis
          adimlar={[
            {
              baslik: 'Öncesinde',
              aciklama:
                'Şirketin ne yaptığını iki cümleyle anlatabilecek kadar oku. CV’nde yazan her projeyi anlatmaya hazır ol. Sana sorulacak "bizde ne yapmak istersin" sorusuna tek cümlelik cevabını hazırla. Bağlantıyı ve saati bir gün önce doğrula.',
            },
            {
              baslik: 'Sırasında',
              aciklama:
                'Bilmediğin şeye "bilmiyorum ama şöyle öğrenirim" de. Proje anlatırken ne yaptığını, hangi araçla ve sonucu söyle. Süre, başlangıç tarihi ve zorunlu staj evrağını sen sor — bunlar mülakatın normal parçası.',
            },
            {
              baslik: 'Sonrasında',
              aciklama:
                'Aynı gün kısa bir teşekkür e-postası yaz. Konuşulan bir belge varsa onu ekle. Bir hafta cevap gelmezse tek bir hatırlatma yeterli.',
            },
          ]}
        />

        <B>Proje anlatırken dört adım</B>
        <Akis
          adimlar={[
            { baslik: 'Soru', aciklama: 'Karşındaki genelde "bize bir projenden bahset" diyor.' },
            { baslik: 'Durum', aciklama: 'Ne yapman gerekiyordu, hangi derste ya da hangi işte, kaç kişiydiniz.' },
            { baslik: 'Ne yaptım', aciklama: 'Senin payın ne oldu. "Biz" değil "ben" de; hangi aracı kullandın.' },
            { baslik: 'Sonuç', aciklama: 'Ne çıktı ortaya, ne öğrendin. Sayı verebiliyorsan ver; veremiyorsan uydurma.' },
          ]}
        />

        <B>Neredeyse her mülakatta çıkanlar</B>
        <L>
          <li>Kendinden kısaca bahseder misin?</li>
          <li>Neden bu alanda staj yapmak istiyorsun?</li>
          <li>Okulda en çok hangi dersten keyif aldın, neden?</li>
          <li>Bir projede zorlandığın bir an ve nasıl çözdüğün.</li>
          <li>Staj süren ne kadar, hangi günler gelebilirsin?</li>
        </L>

        <B>Üç tür mülakat, üç farklı hazırlık</B>
        <KarsilastirmaTablosu
          sutunlar={['Tür', 'Ne kadar sürer', 'Asıl bakılan şey']}
          satirlar={[
            [
              'Telefonla ön görüşme',
              '10–15 dakika',
              'Tarihlerin uyuyor mu, ulaşılabilir misin, ilgin gerçek mi',
            ],
            [
              'Görüntülü görüşme',
              '20–30 dakika',
              'Kendini anlatabiliyor musun, hazırlanmış mısın',
            ],
            [
              'Yüz yüze görüşme',
              '30–45 dakika',
              'Ekiple uyum, iş yerini gördüğünde ne sorduğun',
            ],
          ]}
        />
        <P>
          Telefonla arandığında hazırlıksız yakalanmak en sık yaşanan durum. Uygun değilsen
          <strong> "şu an müsait değilim, bir saat sonra arayabilir miyim"</strong> demek tamamen
          normal ve kimse buna olumsuz bakmıyor. Hazırlıksız konuşmak, ertelemekten kötü.
        </P>

        <B>Görüntülü görüşmede değişen şeyler</B>
        <L>
          <li>
            <strong>Bağlantıyı önceden dene.</strong> Toplantı bağlantısını on dakika önce aç;
            kamera ve mikrofon izni ilk kez o an isteniyorsa süre kaybediyorsun.
          </li>
          <li>
            <strong>Işık yüzüne gelsin.</strong> Arkanda pencere varsa siluet olarak
            görünüyorsun. Karşındaki kişi yüzünü göremeyince görüşme mesafeli geçiyor.
          </li>
          <li>
            <strong>Sessiz bir yer bul.</strong> Bulamıyorsan bunu baştan söyle; söylenen bir
            gürültü sorun olmuyor, açıklanmayan gürültü dikkat dağıtıyor.
          </li>
          <li>
            <strong>Notların yanında dursun.</strong> Görüntülü görüşmenin avantajı bu:
            hazırladığın soruları ekranın kenarında tutabilirsin.
          </li>
        </L>

        <B>Ne giyilir</B>
        <P>
          Kural basit: <strong>o iş yerinde çalışanlardan bir tık daha düzgün.</strong> Yazılım
          şirketinde takım elbise fazla kaçıyor, bankada tişört eksik kalıyor. Bilmiyorsan
          şirketin sosyal medya hesaplarındaki ekip fotoğraflarına bakmak beş dakika sürüyor.
          Görüntülü görüşmede de üst giyim aynı kurala tabi.
        </P>

        <B>Aynı sorunun iki cevabı</B>
        <P>
          Sorular zaten belli; farkı cevabın kendisi yaratıyor. Aşağıdaki ikisi de doğru ama
          biri seni hatırlatıyor, diğeri hatırlatmıyor:
        </P>
        <Karsilastirma
          kotuBaslik="Hatırlanmayan"
          iyiBaslik="Hatırlanan"
          kotu={[
            '"Kendimi geliştirmek istiyorum."',
            '"Zorlandığım bir şey olmadı."',
            '"Her işi yaparım."',
            '"Staj yapmam gerekiyor."',
            '"Sorum yok."',
          ]}
          iyi={[
            '"Ölçme tarafını merak ediyorum, okulda o dersi çok sevdim."',
            '"Projede sensör verisi tutmuyordu; kablolamayı baştan kontrol edip buldum."',
            '"Kalite kontrolde başlamak isterim, sonra üretimi de görebilirsem daha iyi."',
            '"Zorunlu stajım var ama sizi seçmemin sebebi şu ürününüz."',
            '"Stajyer olarak ilk hafta ne yapacağım?"',
          ]}
        />

        <B>Ücret ve günler nasıl konuşulur</B>
        <P>
          Öğrencilerin en çekindiği kısım bu, oysa işveren de aynı bilgiyi netleştirmek
          istiyor. Sen sormazsan konu havada kalıyor ve staj başladıktan sonra sorun oluyor.
          Sonda, doğal bir sırayla sor: hangi günler gelmem gerekiyor, çalışma saatleri ne,
          ödeme yapılıyor mu. Zorunlu stajda 3308 kapsamındaysan ücret ödenmesi gerektiğini
          bilerek sor — pazarlık değil, netleştirme.
        </P>

        <B>Hazırlık: üç şey yeter</B>
        <L>
          <li>
            <strong>Şirketi tanı.</strong> Ne üretiyor, kaç kişiler, hangi şehirde. Beş dakikalık
            bir bakış bile fark ediliyor.
          </li>
          <li>
            <strong>Bir projeni anlatmaya hazır ol.</strong> Ne yaptın, neden öyle yaptın, ne
            öğrendin. Tek bir örneği iyi anlatmak, beş örneği yüzeysel saymaktan güçlü.
          </li>
          <li>
            <strong>Kendi sorunu hazırla.</strong> "Stajyer olarak günlük olarak ne yapacağım?"
            gibi. Soru sormamak ilgisizlik olarak okunuyor.
          </li>
        </L>

        <B>Sık yapılan hatalar</B>
        <L>
          <li>Bilmediğine bilmiyorum diyememek. "Bilmiyorum ama öğrenirim" kabul edilebilir bir cevap.</li>
          <li>Sadece "staj yapmam gerekiyor" demek — doğru ama tek başına zayıf.</li>
          <li>Devam edeceğin günler konusunda net olmamak; işveren planlama yapmak istiyor.</li>
        </L>

        <B>Sonrasında</B>
        <P>
          Kısa bir teşekkür mesajı gönder. Cevap gelmezse bir hafta sonra bir kez daha yaz;
          ikiden fazla ısrar ters etki yapıyor.
        </P>

        <KontrolListesi
          baslik="Görüşmeden önceki gün"
          maddeler={[
            'Şirketin ne ürettiğini bir cümleyle anlatabiliyorum',
            'Anlatacağım projeyi seçtim: ne yaptım, neden öyle yaptım, ne öğrendim',
            'Soracağım iki soru hazır',
            'Hangi günler gelebileceğimi ve tarih aralığını biliyorum',
            'Görüntülüyse bağlantıyı, kamerayı ve mikrofonu denedim',
            'Adres ve saat teyit edildi; yüz yüzeyse yol süresini hesapladım',
          ]}
        />
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'Staj mülakatında ne sorulur?',
        cevap:
          'Neredeyse her mülakatta aynı beş soru çıkıyor: kendinden kısaca bahset, neden bu alan, okulda en çok hangi dersten keyif aldın, zorlandığın bir proje anı, staj süren ve hangi günler gelebileceğin. İşveren teknik derinlik değil, öğrenmeye açıklık ve devamlılık arıyor.',
      },
      {
        soru: 'Staj mülakatına nasıl hazırlanılır?',
        cevap:
          'Üç şey yeterli: şirketin ne ürettiğine beş dakika bak, anlatacağın bir projeyi hazırla (ne yaptın, neden öyle yaptın, ne öğrendin), kendi soruna hazırla. Tek bir örneği iyi anlatmak, beş örneği yüzeysel saymaktan güçlü.',
      },
      {
        soru: 'Mülakatta bilmediğim bir soru gelirse ne demeliyim?',
        cevap:
          '\'Bilmiyorum ama öğrenirim\' kabul edilebilir bir cevap. Bilmediğine bilmiyorum diyememek stajyer mülakatlarında en sık yapılan hata; uydurulan cevap tek soruyla ortaya çıkıyor.',
      },
      {
        soru: 'Mülakatta soru sormalı mıyım?',
        cevap:
          'Evet. Soru sormamak ilgisizlik olarak okunuyor. \'Stajyer olarak günlük olarak ne yapacağım?\' gibi tek bir somut soru yeterli.',
      },
      {
        soru: 'Tecrübem yokken mülakatta ne anlatırım?',
        cevap:
          'Bir okul projesi, kişisel bir çalışma ya da kulüp deneyimi. Önemli olan işin büyüklüğü değil, neden o yolu seçtiğini ve ne öğrendiğini anlatabilmen. Stajın tanımı zaten deneyimsiz olmak.',
      },
      {
        soru: 'Mülakattan sonra ne yapmalıyım?',
        cevap:
          'Kısa bir teşekkür mesajı gönder. Cevap gelmezse bir hafta sonra bir kez daha yaz; ikiden fazla ısrar ters etki yapıyor.',
      },
    ],
  },
  {
    slug: 'staj-basvuru-epostasi',
    konu: 'cv',
    oneCikan: true,
    etiketler: ['e-posta', 'başvuru', 'şablon', 'mail'],
    hizliCevap:
      'Başvuru e-postasının açılıp açılmayacağını konu satırı belirliyor; “Merhaba” ya da boş konu doğrudan çöpe gidiyor. Metinde üç şey olmalı: kim olduğun, neden o şirket, ne zaman müsait olduğun.',
    sonrakiAdim: { etiket: 'Başvuru e-postası şablonunu aç', yol: '/basvuru-sablonu', aciklama: 'Profilindeki bilgilerle doldurulmuş, kopyalanabilir metin.' },
    baslik: 'Staj başvuru e-postası nasıl yazılır',
    ozet: 'Hazır şablon ve en sık yapılan altı hata.',
    kategori: 'ogrenci',
    aciklama:
      'Staj için şirkete gönderilecek e-posta nasıl yazılır? Konu satırı, metin ' +
      'şablonu, ek dosya kuralları ve sık yapılan hatalar.',
    icerik: (
      <>
        <P>
          İlan açmayan şirketlere doğrudan başvuru, değerlendirebileceğin ek bir kanal.
          Ama çoğu e-posta okunmadan kapanıyor — genelde aynı birkaç sebepten.
        </P>

        <RehberFigur
          kaynak="/rehber-gorseller/staj-basvuru-epostasi-anatomisi.svg"
          alt="Staj başvuru e-postasının anatomisi: 1 alıcı, 2 konu satırı, 3 kısa giriş, 4 neden bu şirket, 5 net kapanış, 6 CV eki. Alanlar köşeli parantezli yer tutucu."
          aciklama="Bir başvuru e-postasının altı parçası. Metnin kopyalanabilir hâli aşağıda; buradaki bilgiler örnektir."
          genislik={400}
          yukseklik={700}
        />

        <B>Konu satırı</B>
        <P>
          Konu satırı e-postanın açılıp açılmayacağını belirliyor. Şunu yaz:
        </P>
        <L>
          <li>
            <strong>Staj Başvurusu — [Bölümün] — [Tarih aralığı]</strong>
          </li>
          <li>Örnek: "Staj Başvurusu — Makine Mühendisliği — Temmuz/Ağustos"</li>
        </L>
        <P>
          "Merhaba", "Staj" ya da boş konu satırı; üçü de doğrudan çöpe gidiyor.
        </P>

        <B>Zayıf e-posta ile daha iyisi</B>
        <Karsilastirma
          kotuBaslik="Zayıf"
          iyiBaslik="Daha iyi"
          kotu={[
            'Konu: "Merhaba" — açılmadan siliniyor.',
            'Hangi şirkete yazdığın belli değil; aynı metin herkese gitmiş gibi duruyor.',
            'Hangi pozisyon, hangi tarih, ne kadar süre — hiçbiri yok.',
            'CV ekte yazıyor ama ek yok ya da dosya adı "cv.pdf".',
          ]}
          iyi={[
            'Konu satırında başvuru türü, bölüm ve tarih aralığı var.',
            'Şirkete özel tek cümle: neden orası.',
            'Süre ve tarih net; işveren planlama yapabiliyor.',
            'Ek gerçekten iliştirilmiş ve dosya adı "AdSoyad-CV.pdf".',
          ]}
        />

        <B>Örnek e-posta</B>
        <EpostaOrnegi
          kime="ik@ornek-sirket.com"
          konu="Staj Başvurusu — Makine Mühendisliği — Temmuz/Ağustos"
          govde={`Merhaba,

[Üniversite] [Bölüm] 3. sınıf öğrencisiyim. Okulumun zorunlu stajı kapsamında [tarih] – [tarih] arasında 20 iş günü staj yapmam gerekiyor.

[Şirket adı]'nın [somut bir konu: ürün, proje, alan] tarafıyla ilgileniyorum çünkü [tek cümle sebep].

Şu ana kadar [bir ders projesi / kullandığın program / yaptığın iş] üzerinde çalıştım. CV'mi ekte gönderiyorum.

Zorunlu staj sigortam okulum tarafından karşılanıyor; gerekli belgeyi paylaşabilirim.

Uygun olursanız kısa bir görüşme yapabilir miyiz?

İyi çalışmalar,
[Ad Soyad]
[Telefon]`}
          ek="AdSoyad-CV.pdf"
          aciklama="Köşeli parantezli yerleri kendi bilgilerinle değiştir. Şirkete özel olan tek cümle, e-postanın tamamından daha çok fark yaratıyor."
        />

        <RehberOrnek
          baslik="Kopyalanabilir konu satırı"
          metin="Staj Başvurusu — [Bölümün] — [Ay/Ay]"
          aciklama="Konu satırı e-postanın açılıp açılmayacağını belirliyor; en somut hâlini yaz."
        />

        <B>Sigorta cümlesini neden yazıyorsun</B>
        <P>
          Küçük işletmelerin stajyer almama sebebi çoğu zaman maliyet korkusu — "sigortasını
          ben mi yapacağım, başıma iş açılır mı" diye düşünüyorlar. Zorunlu stajda sigortayı
          genellikle okul yapıyor. Bunu tek cümleyle söylemek, tereddüt eden işvereni
          rahatlatıyor.
        </P>

        <B>Sık yapılan altı hata</B>
        <L>
          <li>
            <strong>Toplu gönderim.</strong> Otuz kişiyi "Kime" satırına yazmak. Herkes
            görüyor ve hiçbiri cevap vermiyor.
          </li>
          <li>
            <strong>Şirket adını yanlış yazmak.</strong> Kopyala-yapıştır yaparken önceki
            şirketin adını unutmak, en hızlı elenme yolu.
          </li>
          <li>
            <strong>CV'yi Word olarak göndermek.</strong> PDF gönder; Word dosyası karşı
            tarafta bozuk açılıyor.
          </li>
          <li>
            <strong>Dosya adı "cv.pdf".</strong> "AdSoyad-CV.pdf" olsun; İK klasöründe
            kaybolmasın.
          </li>
          <li>
            <strong>Tarih vermemek.</strong> İşveren planlama yapmak istiyor; net tarih yaz.
          </li>
          <li>
            <strong>Çok uzun yazmak.</strong> Bu e-posta telefondan okunuyor. Yukarıdaki
            şablon zaten sınırda.
          </li>
        </L>

        <B>Kime gönderilir</B>
        <P>
          Küçük firmalarda genel iletişim adresi yeterli. Orta ve büyük şirketlerde insan
          kaynakları adresini ara. Bulamıyorsan LinkedIn üzerinden İK'da çalışan birine kısa
          bir mesaj atmak da bir seçenek.
        </P>

        <B>Göndermeden önce</B>
        <KontrolListesi
          baslik="Son kontrol"
          maddeler={[
            'Konu satırında bölüm ve tarih aralığı var.',
            'Şirket adı doğru yazılmış; önceki başvurudan kalan ad yok.',
            'Metinde o şirkete özel en az bir cümle var.',
            'CV PDF ve dosya adı "AdSoyad-CV.pdf".',
            'Ek gerçekten iliştirilmiş.',
            'Tek alıcı: "Kime" satırında başka kimse yok.',
          ]}
        />

        <B>Cevap gelmezse</B>
        <P>
          Bir hafta sonra aynı e-postaya tek bir hatırlatma yaz. Cevap yine gelmezse o
          şirketi bırak. Cevapsızlık çoğu zaman senle ilgili değil — kimsenin o kutuya
          bakmamasıyla ilgili.
        </P>
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'Staj başvuru e-postasının konu satırı ne olmalı?',
        cevap:
          '\'Staj Başvurusu — [Bölümün] — [Tarih aralığı]\' biçimi işe yarıyor. Örnek: Staj Başvurusu — Makine Mühendisliği — Temmuz/Ağustos. \'Merhaba\', tek başına \'Staj\' ya da boş konu satırı doğrudan çöpe gidiyor.',
      },
      {
        soru: 'E-postada sigortadan bahsetmeli miyim?',
        cevap:
          'Evet, tek cümleyle. Küçük işletmelerin stajyer almama sebebi çoğu zaman maliyet korkusu. Zorunlu stajda sigortayı genellikle okul yapıyor; bunu yazmak tereddüt eden işvereni rahatlatıyor.',
      },
      {
        soru: 'CV\'yi hangi biçimde eklemeliyim?',
        cevap:
          'PDF olarak. Word dosyası karşı tarafta bozuk açılabiliyor. Dosya adı da \'cv.pdf\' değil \'AdSoyad-CV.pdf\' olsun; İK klasöründe kaybolmasın.',
      },
      {
        soru: 'Aynı e-postayı birçok şirkete birden gönderebilir miyim?',
        cevap:
          'Gönderme. Otuz adresi \'Kime\' satırına yazmak en hızlı elenme yolu: herkes birbirini görüyor ve hiçbiri cevap vermiyor. Her e-postada şirketin adını doğru yazdığından da emin ol.',
      },
      {
        soru: 'Staj e-postasını kime göndermeliyim?',
        cevap:
          'Küçük firmalarda genel iletişim adresi yeterli. Orta ve büyük şirketlerde insan kaynakları adresini ara. Bulamazsan LinkedIn üzerinden İK\'da çalışan birine kısa bir mesaj atmak da bir seçenek.',
      },
      {
        soru: 'Staj başvuru e-postası ne kadar uzun olmalı?',
        cevap:
          'Kısa. Bu e-posta çoğunlukla telefondan okunuyor; ekranı aşan metin okunmadan kapanıyor. Kendini tanıt, neden orası olduğunu bir cümleyle söyle, tarihi ver ve görüşme iste.',
      },
    ],
  },
  {
    slug: 'staj-defteri-nasil-doldurulur',
    konu: 'staj',
    etiketler: ['staj defteri', 'imza', 'kaşe'],
    hizliCevap:
      'Staj defteri her gün ne yaptığını yazdığın bir kayıt; sonunda işyerinden imza ve kaşe, okuldan onay alıyor. En sık yapılan hata defteri stajın sonunda toplu doldurmak — imzayı alacak kişi o sırada izinde olabiliyor.',
    sonrakiAdim: { etiket: 'Staj gününü hesapla', yol: '/araclar/staj-gunu-hesaplama', aciklama: 'Defterde kaç iş günü doldurman gerektiğini gör.' },
    baslik: 'Staj defteri nasıl doldurulur',
    ozet: 'Her gün ne yazılır, imza ve kaşe nereden alınır, en sık yapılan hata.',
    kategori: 'ogrenci',
    aciklama:
      'Staj defteri nasıl doldurulur? Günlük yazım düzeni, imza ve kaşe süreci, ' +
      'teslim öncesi kontrol listesi.',
    icerik: (
      <>
        <P>
          Staj defteri stajın notunu belirleyen belge. İşin kendisini iyi yapıp defteri
          eksik teslim eden çok öğrenci var; sonuç çoğu zaman stajın tekrarı oluyor.
        </P>

        <Uyari>
          Defterin biçimi okuldan okula değişiyor: sayfa düzeni, kaç gün yazılacağı, hangi
          bölümlerin doldurulacağı. Buradaki anlatım genel; <strong>kesin kuralı kendi
          okulunun staj yönergesinden</strong> teyit et.
        </Uyari>

        <B>Her gün ne yazılır</B>
        <P>
          Bir günün kaydı üç parçadan oluşuyor: ne yapıldı, nasıl yapıldı, ne öğrenildi.
          "Gözlem yaptım" cümlesi hiçbir şey anlatmıyor. Karşılaştır:
        </P>
        <L>
          <li>
            <strong>Zayıf:</strong> "Üretim bölümünü gezdim, gözlem yaptım."
          </li>
          <li>
            <strong>İyi:</strong> "CNC tezgâhında 40 mm çaplı milin işlenmesini izledim.
            Kesme hızı ve ilerleme değerlerinin malzemeye göre nasıl seçildiğini öğrendim.
            Ölçüyü kumpasla kontrol ettim; toleransın ±0,05 mm olduğunu gördüm."
          </li>
        </L>

        <B>Başka bölümlerde nasıl görünüyor</B>
        <P>
          Yukarıdaki örnek makine tarafından. Aynı üç parça (ne yapıldı, nasıl yapıldı, ne
          öğrenildi) her bölümde çalışıyor; değişen sadece terimler:
        </P>
        <KarsilastirmaTablosu
          sutunlar={['Bölüm', 'Zayıf kayıt', 'İyi kayıt']}
          satirlar={[
            [
              'Yazılım',
              'Kod yazdım.',
              'Müşteri kayıt formundaki e-posta doğrulamasını yazdım. Girilen adresi düzenli ifadeyle kontrol edip hatalı girişte uyarı gösteriyor. Aynı kontrolü sunucu tarafında da yapmak gerektiğini öğrendim.',
            ],
            [
              'İnşaat',
              'Şantiyeyi gezdim.',
              'B blok kalıp sökümünü izledim. Betonun priz süresi dolmadan kalıbın alınamayacağını, kontrolün numune basınç sonucuna göre yapıldığını öğrendim. Kot ölçümünde nivo kullanımını gördüm.',
            ],
            [
              'İşletme / muhasebe',
              'Ofis işlerine yardım ettim.',
              'Gelen faturaların ön muhasebe programına girişini yaptım. KDV oranına göre hangi hesaba işlendiğini ve fatura tarihinin dönem kapanışında neden önemli olduğunu öğrendim.',
            ],
            [
              'Elektrik',
              'Panoya baktım.',
              'Dağıtım panosunda termik manyetik şalter değişimini izledim. Şalter seçiminin hat akımına göre yapıldığını, enerji kesilmeden işlem yapılmadığını ve kilitleme-etiketleme kuralını öğrendim.',
            ],
            [
              'Mimarlık',
              'Çizim yaptım.',
              'Zemin kat planında ıslak hacim detayını çizdim. Kapı genişliklerinin erişilebilirlik ölçülerine göre belirlendiğini ve tesisat şaftının plan üzerinde nasıl konumlandığını öğrendim.',
            ],
          ]}
        />

        <B>Yazma düzeni</B>
        <L>
          <li>
            <strong>Her gün akşam yaz.</strong> Haftanın sonunda beş günü birden yazmaya
            çalışmak hem zor hem de belli oluyor.
          </li>
          <li>
            <strong>Teknik terimleri kullan.</strong> Defteri okuyan hoca, işi gerçekten
            görüp görmediğini oradan anlıyor.
          </li>
          <li>
            <strong>Çizim ve şema ekle.</strong> Mühendislik bölümlerinde en çok puan
            getiren kısım burası.
          </li>
          <li>
            <strong>Gizli bilgiyi yazma.</strong> Müşteri adı, fiyat, formül gibi şeyleri
            yazmadan önce sorumluna sor.
          </li>
        </L>

        <B>Sık yapılan hatalar</B>
        <Karsilastirma
          kotuBaslik="Puan kaybettiren"
          iyiBaslik="Puan getiren"
          kotu={[
            'Bütün defteri son hafta doldurmak',
            'Her güne aynı cümleyi yazmak',
            'Yaptığın işi değil şirketin ne ürettiğini anlatmak',
            'İnternetten bulunan hazır metni kopyalamak',
            'Hafta sonu ve resmî tatili çalışılmış gün gibi yazmak',
            'İmzaları en sona bırakmak',
          ]}
          iyi={[
            'Her gün akşam on dakika ayırmak',
            'Her güne o güne özgü bir ölçü, terim ya da sayı koymak',
            'Senin elinin değdiği işi anlatmak',
            'Kendi cümlelerinle yazmak — hoca üslup farkını görüyor',
            'Takvimi işletmenin çalışma günleriyle birebir tutmak',
            'Her hafta sonunda imzayı almak',
          ]}
        />
        <P>
          Kopyalanan metin en ağır sonucu doğuran hata: çoğu okulda staj tekrarı, bazı
          okullarda disiplin konusu. Zayıf ama kendi yazdığın bir defter, mükemmel ama
          kopyalanmış bir defterden her zaman iyi.
        </P>

        <B>İmza ve kaşe süreci</B>
        <P>
          Genelde her sayfanın ya da her haftanın sonunda işletmedeki sorumlunun imzası ve
          şirket kaşesi isteniyor. Sıra şöyle işliyor:
        </P>
        <Akis
          adimlar={[
            {
              baslik: 'İlk gün: kim imzalayacak, öğren',
              aciklama:
                'Defteri imzalayacak kişi genelde sana bakan mühendis ya da usta değil, imza yetkisi olan bir yönetici oluyor. Kim olduğunu ilk gün öğren; son gün aramaya başlamak geç kalmak demek.',
            },
            {
              baslik: 'Her hafta sonunda imzalat',
              aciklama:
                'Haftalık ritim en güvenlisi. Yetkili izne çıkarsa ya da işten ayrılırsa yalnızca o haftayı çözersin, bütün defteri değil.',
            },
            {
              baslik: 'Kaşenin okunur olduğundan emin ol',
              aciklama:
                'Silik ya da yarım basılmış kaşe kabul edilmeyebiliyor. Basıldıktan sonra bak; gerekiyorsa yanına yeniden bastır.',
            },
            {
              baslik: 'Son gün: değerlendirme formunu da al',
              aciklama:
                'Çoğu okulda işletme değerlendirme formu kapalı ve kaşeli zarfta isteniyor. Bunu defterle aynı gün hallet; ikinci kez şirkete gitmek zorunda kalma.',
            },
            {
              baslik: 'Teslimden önce fotoğrafla',
              aciklama:
                'Defterin tamamının fotoğrafını çek. Kaybolan defter geri gelmiyor ve sonucu çoğunlukla staj tekrarı oluyor.',
            },
          ]}
        />
        <Uyari>
          İmzaları <strong>staj bitmeden</strong> tamamla. Staj bittikten sonra kaşe için
          şirkete dönmek en sık yaşanan sıkıntı: yetkili izinde olabiliyor, seni tanıyan
          kimse kalmamış olabiliyor ya da şirket "artık bizim öğrencimiz değil" diyebiliyor.
        </Uyari>

        <B>Teslimden önce kontrol et</B>
        <L>
          <li>Tüm günler dolu mu, atlanan tarih var mı?</li>
          <li>Her gerekli sayfada imza ve kaşe var mı?</li>
          <li>İşletme değerlendirme formu dolduruldu mu, kapalı zarfta mı?</li>
          <li>Kapak bilgileri, öğrenci numarası ve tarih aralığı doğru mu?</li>
          <li>Defterin tamamının fotoğrafı çekildi mi?</li>
        </L>
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'Staj defteri her gün mü doldurulur?',
        cevap:
          'Evet, her gün akşam yazmak en kolayı. Haftanın sonunda beş günü birden yazmaya çalışmak hem zor hem de okuyan hocaya belli oluyor.',
      },
      {
        soru: 'Staj defterine ne yazılır?',
        cevap:
          'Her gün üç şey: ne yapıldı, nasıl yapıldı, ne öğrenildi. \'Gözlem yaptım\' cümlesi hiçbir şey anlatmıyor; kullanılan yöntem, ölçü ve terimleri yazmak gerekiyor.',
      },
      {
        soru: 'İmza ve kaşe ne zaman alınır?',
        cevap:
          'Staj bitmeden. Staj bittikten sonra kaşe için şirkete dönmek en sık yaşanan sıkıntı; yetkili izinde olabiliyor ya da seni tanıyan kimse kalmayabiliyor.',
      },
      {
        soru: 'Defteri dijital doldurabilir miyim?',
        cevap:
          'Okuluna bağlı. Bazı bölümler el yazısı istiyor, bazıları dijital kabul ediyor. Kesin bilgi okulunun staj yönergesinde.',
      },
      {
        soru: 'Defteri kaybedersem ne olur?',
        cevap:
          'Genellikle staj tekrarı gerekiyor. Bu yüzden teslim etmeden önce tüm sayfaların fotoğrafını çek.',
      },
    ],
  },
  {
    slug: 'kyk-burs-ve-kredi',
    konu: 'burs',
    oneCikan: true,
    etiketler: ['kyk', 'burs', 'kredi', 'gsb', 'başvuru'],
    hizliCevap:
      'KYK bursu geri ödenmiyor, KYK öğrenim kredisi mezuniyetten sonra geri ödeniyor; başvuru ikisi için de aynı formdan yapılıyor. Tutarlar ve başvuru takvimi her yıl değiştiği için güncel rakamı resmî kaynaktan kontrol et.',
    kaynaklar: [
      { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr', kurum: 'Gençlik ve Spor Bakanlığı Kredi ve Yurtlar Genel Müdürlüğü', tur: 'kurum', destekledigi: 'Burs ve kredi tutarları, başvuru takvimi ve kesilme koşulları.' },
      { etiket: 'e-Devlet', adres: 'https://www.turkiye.gov.tr', kurum: 'Cumhurbaşkanlığı Dijital Dönüşüm Ofisi', tur: 'kurum', destekledigi: 'Başvurunun yapıldığı yer ve borç sorgulama.' },
    ],
    sonrakiAdim: { etiket: 'Açık bursları gör', yol: '/firsatlar', aciklama: 'Resmî kaynağıyla doğrulanmış burs ve kredi ilanları.' },
    baslik: 'KYK burs ve öğrenim kredisi',
    ozet: 'Burs ile kredi arasındaki fark, başvuru zamanı ve kesilme sebepleri.',
    kategori: 'ogrenci',
    aciklama:
      'KYK bursu ile öğrenim kredisi arasındaki fark nedir, başvuru ne zaman ' +
      'yapılır, hangi durumlarda kesilir ve geri ödeme nasıl işler.',
    icerik: (
      <>
        <Uyari>
          Bu sayfada <strong>tutar yazmıyoruz.</strong> Burs ve kredi miktarları her yıl
          yeniden belirleniyor; sabit bir rakam bir süre sonra yanlış bilgi olur. Güncel
          tutar ve takvim için{' '}
          <Kaynak href="https://kygm.gsb.gov.tr">Gençlik ve Spor Bakanlığı</Kaynak> ile{' '}
          <Kaynak href="https://www.turkiye.gov.tr">e-Devlet</Kaynak> duyurularına bak.
        </Uyari>

        <RehberFigur
          kaynak="/rehber-gorseller/kyk-burs-kredi-farki.svg"
          alt="KYK bursu ile öğrenim kredisinin farkı. Başvuru tek form üzerinden yapılıyor; burs geri ödemesiz ve kontenjanı sınırlı, öğrenim kredisi geri ödemeli ve mezuniyetten sonra taksitle ödeniyor. Yurt ve barınma başvurusu ayrı süreç."
          aciklama="Görselde bilerek tutar, oran ve tarih yok: bunlar her yıl değişiyor, kavramsal fark değişmiyor."
          genislik={400}
          yukseklik={476}
        />

        <B>Burs ve kredi aynı şey değil</B>
        <L>
          <li>
            <strong>Burs:</strong> geri ödemesi yok. Kontenjanı sınırlı ve belirli
            önceliklere göre veriliyor.
          </li>
          <li>
            <strong>Öğrenim kredisi:</strong> geri ödemeli. Mezuniyetten sonra, kanunda
            belirlenen bir sürenin ardından taksitle geri ödeniyor.
          </li>
          <li>
            Başvuru genelde tek form üzerinden yapılıyor; bursa hak kazanamayan öğrenci
            kredi için değerlendirilebiliyor.
          </li>
        </L>
        <P>
          Bu ikisini karıştırmak yaygın. "KYK aldım" diyen çoğu öğrenci aslında kredi
          alıyor ve mezun olunca geri ödeyeceğini geç fark ediyor.
        </P>

        <B>Barınma kredisi ayrı</B>
        <P>
          Yurtta kalmayan öğrenciler için ayrı bir barınma desteği bulunuyor. Yurtta kalan
          öğrenci bundan yararlanamıyor. Yurt başvurusu ile burs/kredi başvurusu ayrı
          süreçler; ikisini de ayrı ayrı yapman gerekiyor.
        </P>

        <B>Başvuru zamanı</B>
        <P>
          Başvurular genellikle üniversite yerleştirme sonuçları açıklandıktan sonra, güz
          dönemi başlamadan alınıyor ve süre kısa oluyor. Takvimi kaçırmak en sık yaşanan
          kayıp — sonuç açıklandığı hafta duyuruları takip etmeye başla.
        </P>

        <B>Kesilme sebepleri</B>
        <L>
          <li>Kayıt dondurmak veya okuldan ilişik kesmek</li>
          <li>Öğrenim süresini aşmak</li>
          <li>Başka bir kamu kurumundan aynı nitelikte destek almak</li>
          <li>Beyan edilen bilgilerin gerçeğe aykırı çıkması</li>
        </L>

        <B>Geri ödeme nasıl işliyor</B>
        <P>
          Öğrenim kredisinde geri ödeme mezuniyetin ardından belirli bir süre sonra
          başlıyor ve taksitlendiriliyor. Ödenecek tutar, alınan tutara kanunda tanımlı bir
          artış uygulanarak hesaplanıyor. Oran ve süre mevzuatla değiştiği için buraya
          yazmıyoruz; kendi durumunu e-Devlet üzerinden görebilirsin.
        </P>

        <B>Staj ücreti bursu etkiler mi</B>
        <P>
          Staj ücreti bir maaş değil, mesleki eğitim kapsamında yapılan ödeme. Yine de kendi
          durumunu bağlayıcı biçimde öğrenmek istiyorsan başvuru şartlarındaki gelir ve
          çalışma maddelerini oku ya da doğrudan kuruma sor.
        </P>
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'KYK bursu ile öğrenim kredisi arasındaki fark nedir?',
        cevap:
          'Bursun geri ödemesi yok, kontenjanı sınırlı ve belirli önceliklere göre veriliyor. Öğrenim kredisi ise geri ödemeli; mezuniyetten sonra kanunda belirlenen bir sürenin ardından taksitle ödeniyor. \'KYK aldım\' diyen çoğu öğrenci aslında kredi alıyor.',
      },
      {
        soru: 'Burs ve kredi için ayrı ayrı başvuru yapmam gerekir mi?',
        cevap:
          'Başvuru genelde tek form üzerinden yapılıyor ve bursa hak kazanamayan öğrenci kredi için değerlendirilebiliyor. Ancak yurt başvurusu ayrı bir süreç; onu ayrıca yapman gerekiyor.',
      },
      {
        soru: 'KYK başvurusu ne zaman yapılır?',
        cevap:
          'Başvurular genellikle üniversite yerleştirme sonuçları açıklandıktan sonra, güz dönemi başlamadan alınıyor ve süre kısa oluyor. Kesin takvim her yıl değiştiği için sonucun açıklandığı hafta resmî duyuruları takip etmeye başla.',
      },
      {
        soru: 'Barınma kredisi nedir, yurtta kalan öğrenci alabilir mi?',
        cevap:
          'Barınma desteği yurtta kalmayan öğrenciler için. Yurtta kalan öğrenci bundan yararlanamıyor.',
      },
      {
        soru: 'KYK bursu veya kredisi hangi durumlarda kesilir?',
        cevap:
          'Kayıt dondurmak veya okuldan ilişik kesmek, öğrenim süresini aşmak, başka bir kamu kurumundan aynı nitelikte destek almak ve beyan edilen bilgilerin gerçeğe aykırı çıkması başlıca kesilme sebepleri.',
      },
      {
        soru: 'Öğrenim kredisinin geri ödemesi ne zaman başlar?',
        cevap:
          'Mezuniyetin ardından belirli bir süre sonra başlıyor ve taksitlendiriliyor. Ödenecek tutar, alınan tutara kanunda tanımlı bir artış uygulanarak hesaplanıyor. Oran ve süre mevzuatla değiştiği için kendi durumunu e-Devlet üzerinden görmen gerekiyor.',
      },
      {
        soru: 'Staj ücreti KYK bursunu etkiler mi?',
        cevap:
          'Staj ücreti bir maaş değil, mesleki eğitim kapsamında yapılan bir ödeme. Yine de bağlayıcı cevap için başvuru şartlarındaki gelir ve çalışma maddelerini oku ya da doğrudan kuruma sor.',
      },
    ],
  },
  {
    slug: 'staj-nasil-bulunur',
    konu: 'staj',
    oneCikan: true,
    etiketler: ['staj bulma', 'ilan', 'başvuru kanalı'],
    hizliCevap:
      'Staj beş kanaldan bulunuyor: ilan siteleri, şirketlerin kendi kariyer sayfaları, okulun staj birimi, tanıdık ağı ve ilan açmayan şirkete doğrudan yazmak. Sonuncusu, ilan açmayan şirketlerde değerlendirebileceğin ek bir kanal.',
    kaynaklar: [
      { etiket: 'Türkiye İş Kurumu (İŞKUR)', adres: 'https://www.iskur.gov.tr', kurum: 'Türkiye İş Kurumu', tur: 'kurum' },
    ],
    sonrakiAdim: { etiket: 'Açık staj ilanlarına bak', yol: '/', aciklama: 'Tek listede toplanmış güncel ilanlar.' },
    baslik: 'Staj nasıl bulunur',
    ozet: 'Beş kanal, hangisi ne kadar işe yarıyor ve nereden başlanır.',
    kategori: 'ogrenci',
    aciklama:
      'Staj nasıl bulunur? İlan siteleri, doğrudan başvuru, okul bağlantısı, ' +
      'tanıdık ve LinkedIn — hangi kanal ne kadar sonuç veriyor.',
    icerik: (
      <>
        <P>
          Staj aramanın en sinir bozucu tarafı şu: nereye bakacağını bilmemek. Çoğu
          öğrenci tek bir kanala yükleniyor (genelde ilan siteleri), sonuç alamayınca
          "staj yok" diye düşünüyor. Oysa ilanlar staj bulmanın yalnızca bir yolu ve
          çoğu zaman en rekabetli olanı.
        </P>

        <RehberFigur
          kaynak="/rehber-gorseller/staj-bulma-kanallari.svg"
          alt="Staj bulmanın beş kanalı yan yana: doğrudan başvuru, okulun staj birimi, hocalar ve mezunlar, ilan siteleri ve LinkedIn. Altta dört adımlık sıra: alanını seç, şirket listesi çıkar, CV'ni hazırla, başvur ve takip et."
          aciklama="Beş kanal eşit büyüklükte çünkü bu bir sıralama değil. Hangisinin sende işe yaradığı bölümüne, şehrine ve okuluna göre değişiyor."
          genislik={400}
          yukseklik={636}
        />

        <B>Beş kanal</B>
        <Akis
          adimlar={[
            {
              baslik: 'Doğrudan başvuru',
              aciklama:
                'İlan açmamış şirketlere yazmak. Standart ilan başvurusuna ek bir kanal olabilir; ancak şirketin o dönemde stajyer aradığı garanti değil ve kime yazacağını bulmak sana kalıyor.',
            },
            {
              baslik: 'Okulun staj birimi',
              aciklama:
                'Bölüm sekreterliği ya da kariyer merkezi. Geçmiş yıllarda öğrenci alan firmaların listesi genelde onlarda duruyor ve kimse sormuyor. Sormak bedava.',
            },
            {
              baslik: 'Hocalar ve mezunlar',
              aciklama:
                'Bölüm hocalarının sektörde tanıdıkları var. "Staj arıyorum, önerebileceğiniz bir yer var mı?" cümlesi çoğu zaman bir isim getiriyor. Mezun ağı da aynı şekilde.',
            },
            {
              baslik: 'İlan siteleri',
              aciklama:
                'StajımVar ve benzerleri. Kolay ama rekabetli: bir ilana yüzlerce başvuru gelebiliyor. Yine de takip et — özellikle küçük şirketlerin ilanlarında rekabet düşük.',
            },
            {
              baslik: 'LinkedIn',
              aciklama:
                'İlanlara başvurmaktan çok, insanlara ulaşmak için. Hedeflediğin şirkette çalışan birine kısa ve nazik bir mesaj, İK kutusuna düşen e-postadan daha hızlı cevap alıyor.',
            },
          ]}
        />

        <B>Hangi kanal ne zaman işe yarıyor</B>
        <P>
          Beşi de aynı işi yapmıyor. Kanalları birbirinin alternatifi değil, farklı
          durumlarda devreye giren araçlar olarak düşün:
        </P>
        <KarsilastirmaTablosu
          sutunlar={['Kanal', 'Rekabet', 'Cevap hızı', 'Ne zaman kullan']}
          satirlar={[
            [
              'Doğrudan başvuru',
              'Çok düşük',
              'Günler',
              'Her zaman. Bütün aramanın omurgası bu olmalı.',
            ],
            [
              'Okulun staj birimi',
              'Düşük',
              'Günler',
              'İlk hafta. Geçmiş yılların firma listesi hazır bekliyor.',
            ],
            [
              'Hocalar ve mezunlar',
              'Düşük',
              'Değişken',
              'Belirli bir alanda staj arıyorsan; bir isim on ilana bedel.',
            ],
            [
              'İlan siteleri',
              'Yüksek',
              'Haftalar',
              'Sürekli takip; başvuru kolay olduğu için maliyeti düşük.',
            ],
            [
              'LinkedIn',
              'Orta',
              'Saatler–günler',
              'Hedeflediğin şirket belliyse, ilan yoksa bile.',
            ],
          ]}
        />
        <P>
          Tablodaki "cevap hızı" bir söz değil, gözlenen eğilim. Ama sıralama şunu
          anlatıyor: en hızlı cevap veren kanallar, en az başvurulan kanallar.
        </P>

        <B>İlk hafta: somut plan</B>
        <P>
          "Staj aramaya başladım" cümlesi çoğu zaman bir hafta boyunca ilan sitelerine
          bakmak anlamına geliyor. Bunun yerine beş güne bölünmüş bir plan:
        </P>
        <Akis
          adimlar={[
            {
              baslik: '1. gün — Listeyi kur',
              aciklama:
                'Bölümünle ilgili yirmi şirket yaz. Büyük olmasınlar, yakınında olsunlar. Her satırda şirket adı, şehir, e-posta ve "yazdım mı" sütunu olsun. Basit bir tablo yeterli; aynı yere ikinci kez yazmak kötü görünüyor.',
            },
            {
              baslik: '2. gün — Okulu devreye sok',
              aciklama:
                'Bölüm sekreterliğine ve varsa kariyer merkezine git, geçmiş yıllarda öğrenci alan firma listesini iste. Aynı gün staj yönergesini de al: kaç iş günü, hangi dönem, hangi işletmeler kabul ediliyor.',
            },
            {
              baslik: '3. gün — CV\'yi bitir',
              aciklama:
                'Tek sayfa, PDF, dosya adı AdSoyad-CV.pdf. Yirmi başvuruyu aynı CV\'yi düzeltmeden yapmak, yirmi fırsatı aynı hatayla harcamak demek.',
            },
            {
              baslik: '4. gün — İlk on e-posta',
              aciklama:
                'Her birine o şirkete dair tek bir cümle ekle. On tanesi bir günde bitiyor; otuz tanesini birden göndermeye çalışmak metnin kişiselliğini bitiriyor.',
            },
            {
              baslik: '5. gün — Kalan on ve hocalar',
              aciklama:
                'Kalan on e-postayı gönder, ardından bölüm hocalarına sor. Bir hafta sonra cevap gelmeyenlere tek bir hatırlatma yaz ve orada bırak.',
            },
          ]}
        />
        <P>
          E-postanın kendisini nasıl yazacağın ayrı bir konu — konu satırı, şablon ve en
          sık yapılan altı hata{' '}
          <a href="/rehber/staj-basvuru-epostasi" className="text-blue-600 hover:underline font-semibold">
            staj başvuru e-postası rehberinde
          </a>
          .
        </P>

        <P>
          Kanalları sırayla değil paralel kullan. Ve beklentini baştan ayarla:{' '}
          <strong>yanıt oranı şirkete ve döneme göre değişebilir</strong>; yanıt gelmemesi
          sık karşılaşılan bir durum ve senin hakkında bir şey söylemiyor. Sessizlikleri
          başarısızlık sayarsan üçüncü günde bırakırsın.
        </P>

        <B>Bugün yapabileceğin altı şey</B>
        <KontrolListesi
          baslik="Bir saatte bitiyor"
          maddeler={[
            'Bölümüne uyan üç arama kelimesi belirle ve ilan listesinde dene.',
            'Şehrinde staj alan beş şirketin adını bir listeye yaz.',
            'O beş şirketin kariyer sayfasını aç, başvuru adresini not et.',
            'CV’ni PDF olarak hazırla; dosya adını "AdSoyad-CV.pdf" yap.',
            'Bir tanesine başvuru e-postasını yaz ve gönder.',
            'Kime, ne zaman yazdığını aynı listeye işle.',
          ]}
        />

        <B>Sık yapılan hata</B>
        <Karsilastirma
          kotuBaslik="Sonuç vermeyen"
          iyiBaslik="Sonuç veren"
          kotu={[
            'Sadece ilan sitelerine bakmak ve beklemek',
            'Aynı e-postayı otuz şirkete kopyalayıp göndermek',
            'Yalnızca büyük ve tanınmış şirketlere başvurmak',
            'Cevap gelmeyince "staj yok" diye bırakmak',
            'Şubat ayında yaz stajı aramaya başlamak',
          ]}
          iyi={[
            'Beş kanalı aynı anda kullanmak',
            'Her şirkete o şirkete dair bir cümle yazmak',
            'Yakınındaki küçük ve orta ölçekli işletmelere yönelmek',
            'Bir hafta sonra tek bir hatırlatma yazmak',
            'Kışın başlamak — yaz stajı kontenjanları erken doluyor',
          ]}
        />

        <B>Ne zaman aramaya başlanır</B>
        <P>
          Yaz stajı için <strong>kış aylarında</strong>. Büyük şirketlerin staj programları
          şubat-nisan arasında başvuru alıyor ve mayısta kapanıyor. Küçük işletmelerde
          böyle bir takvim yok, onlara her zaman yazabilirsin — ama onlarda da "önümüzdeki
          ay lazım" demek, "üç ay sonra" demekten kolay kabul görüyor.
        </P>

        <Uyari>
          Kaç yere başvurduğunu bir yere not et: şirket, tarih, cevap durumu. Yirmi
          başvurudan sonra kime yazdığını hatırlamıyorsun ve aynı yere ikinci kez yazmak
          kötü görünüyor.
        </Uyari>
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'Staj başvurusuna ne zaman başlamalıyım?',
        cevap:
          'Yaz stajı için kış aylarında. Büyük şirketlerin staj programları genellikle şubat-nisan arasında başvuru alıyor. Küçük ve orta ölçekli işletmelerde böyle bir takvim yok; onlara yıl boyunca yazabilirsin ama yakın tarihli bir başlangıç önermek daha kolay kabul görüyor.',
      },
      {
        soru: 'İlan olmayan şirkete başvurmak mantıklı mı?',
        cevap:
          'Değerlendirebileceğin ek bir kanal. Çoğu küçük işletme stajyer alabilecek durumda ama ilan açmayı hiç düşünmüyor.',
      },
      {
        soru: 'Kaç yere başvurmalıyım?',
        cevap:
          'Tek bir yere yazıp beklemek yerine ilk hafta bir liste çıkar ve paralel ilerle. Cevapsız kalan e-postalar olacak; birkaç cevap yeterli. Kime yazdığını bir listede tut, aynı yere ikinci kez yazmak kötü görünüyor.',
      },
      {
        soru: 'Tecrübem yokken staj bulabilir miyim?',
        cevap:
          'Evet. Stajın tanımı zaten deneyimsiz olmak. İşverenin baktığı şey deneyim değil, öğrenmeye açıklık ve gösterebileceğin bir çalışma. Okul projesi, kişisel bir çalışma ya da kulüp deneyimi bunun yerine geçiyor.',
      },
      {
        soru: 'Cevap gelmezse ne yapmalıyım?',
        cevap:
          'Bir hafta sonra aynı e-postaya tek bir hatırlatma yaz. Cevap yine gelmezse o şirketi bırak. Cevapsızlık çoğu zaman seninle ilgili değil, kimsenin o kutuya bakmamasıyla ilgili.',
      },
      {
        soru: 'Hangi kanal en çok sonuç veriyor?',
        cevap:
          'Doğrudan başvuru ve okul bağlantısı. İlan siteleri kolay ama rekabetli; LinkedIn ise ilana başvurmaktan çok insanlara ulaşmak için işe yarıyor. En iyisi beşini paralel kullanmak.',
      },
    ],
  },
  {
    slug: 'gonullu-staj-rehberi',
    konu: 'staj',
    etiketler: ['gönüllü staj', 'isteğe bağlı', 'sigorta'],
    hizliCevap:
      'Gönüllü staj okul zorunluluğu olmadan yapılan stajdır; zorunlu stajdan asıl farkı sigorta ve belge tarafında ortaya çıkıyor. Okulun formu vermediği durumda sigorta yükümlülüğü işyerine geçebiliyor, o yüzden başlamadan önce bunu yazılı netleştir.',
    kaynaklar: [
      { etiket: 'Sosyal Güvenlik Kurumu', adres: 'https://www.sgk.gov.tr', kurum: 'Sosyal Güvenlik Kurumu', tur: 'kurum' },
    ],
    sonrakiAdim: { etiket: 'Açık staj ilanlarına bak', yol: '/', aciklama: 'Gönüllü staja da açık ilanlar burada.' },
    baslik: 'Gönüllü staj: zorunlu stajdan farkı ne?',
    ozet: 'Sigorta, ücret ve belge tarafı zorunlu stajdan farklı işliyor.',
    kategori: 'ogrenci',
    aciklama:
      'Gönüllü (isteğe bağlı) staj nedir, zorunlu stajdan farkı nedir? Sigorta, ' +
      'ücret ve belge yükümlülükleri nasıl değişiyor.',
    icerik: (
      <>
        <P>
          Zorunlu staj müfredatın parçası; okul taraf oluyor, belge veriyor, çoğu zaman
          sigortayı da yapıyor. Gönüllü staj ise senin kendi isteğinle, ders geçmek için
          değil deneyim için yaptığın staj. İkisi aynı şey değil ve karışması sorun
          çıkarıyor.
        </P>

        <B>Temel fark</B>
        <Karsilastirma
          kotuBaslik="Zorunlu staj"
          iyiBaslik="Gönüllü staj"
          kotu={[
            'Müfredatın parçası, mezuniyet için gerekli',
            'Okul staj belgesi düzenliyor',
            'Sigortayı genellikle okul yapıyor',
            'Süre okulun belirlediği iş günü kadar',
            'Staj defteri ve değerlendirme formu var',
          ]}
          iyi={[
            'Tamamen isteğe bağlı, not karşılığı yok',
            'Okul taraf değil; belge de vermeyebiliyor',
            'Sigorta yükümlülüğü değişiyor — mutlaka sor',
            'Süreyi sen ve işletme belirliyorsunuz',
            'Defter yok; istersen kendin için tutabilirsin',
          ]}
        />

        <B>En kritik nokta: sigorta</B>
        <P>
          Zorunlu stajda okulun yaptığı iş kazası ve meslek hastalığı sigortası, gönüllü
          stajda <strong>otomatik olarak devreye girmiyor</strong>. Kimin yapacağı
          duruma göre değişiyor ve bu konuda tahmin yürütmek doğru değil.
        </P>
        <Uyari>
          Gönüllü staja başlamadan önce <strong>hem okulunun staj birimine hem de
          işletmeye</strong> sigortanın kimde olduğunu sor ve cevabı yazılı al. Sigortasız
          çalışmak, bir kaza olduğunda seni de işletmeyi de korumasız bırakıyor. Bağlayıcı
          bilgi için{' '}
          <Kaynak href="https://www.sgk.gov.tr">SGK</Kaynak>'ya danış — burada yazanlar
          bilgilendirme amaçlı, hukuki danışmanlık değil.
        </Uyari>

        <B>Ücret</B>
        <P>
          3308 sayılı kanun kapsamındaki stajlarda ücret zorunlu. Gönüllü staj bu kapsamın
          dışında kalabiliyor; yani işletme ödeme yapmak zorunda olmayabiliyor. Bu, "hiç
          ödenmez" demek değil — birçok işletme gönüllü stajyere de ödeme yapıyor. Ama
          garantisi yok, o yüzden başlamadan konuşulması gereken bir konu.
        </P>

        <B>Yine de değer mi?</B>
        <P>
          Çoğu durumda evet. Zorunlu stajını yaptıktan sonra sektörde kalmak, farklı bir
          alanı denemek ya da mezuniyet öncesi bağlantı kurmak için gönüllü staj iyi bir
          yol. Kritik olan tek şey sigortanın çözülmüş olması.
        </P>

        <KontrolListesi
          baslik="Gönüllü staja başlamadan"
          maddeler={[
            'Sigortanın kimde olduğu yazılı olarak netleşti',
            'Başlangıç ve bitiş tarihleri, haftalık gün sayısı konuşuldu',
            'Ödeme yapılıp yapılmayacağı ve tutarı belli',
            'İşletmede sana bakacak bir sorumlu tanımlandı',
            'Okulun bu stajdan haberi var (belge vermese bile)',
          ]}
        />
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'Gönüllü staj ne kadar sürer?',
        cevap:
          'Süreyi sen ve işletme belirliyorsunuz; zorunlu stajdaki gibi okulun dayattığı bir iş günü sayısı yok. Başlamadan önce başlangıç ve bitiş tarihini, haftada kaç gün geleceğini ve işletmede sana bakacak sorumluyu netleştir.',
      },
      {
        soru: 'Gönüllü stajda defter tutmam gerekir mi?',
        cevap:
          'Gerekmiyor; defter ve değerlendirme formu zorunlu stajın parçası. Yine de kendin için kısa bir kayıt tutmak işe yarıyor: aradan birkaç ay geçince ne yaptığını hatırlamıyorsun ve CV\'ye yazacak somut bir şey kalmıyor.',
      },
      {
        soru: 'Gönüllü stajda sigorta kimde?',
        cevap:
          'Zorunlu stajda okulun yaptığı sigorta gönüllü stajda otomatik devreye girmiyor. Kimin yapacağı duruma göre değişiyor; başlamadan önce hem okuluna hem işletmeye sor ve cevabı yazılı al.',
      },
      {
        soru: 'Gönüllü stajda ücret ödenmek zorunda mı?',
        cevap:
          '3308 kapsamı dışında kalabildiği için işletme ödeme yapmak zorunda olmayabiliyor. Birçok işletme yine de ödüyor ama garantisi yok; başlamadan konuşulması gereken bir konu.',
      },
      {
        soru: 'Gönüllü staj CV\'de sayılır mı?',
        cevap:
          'Evet. CV açısından zorunlu ve gönüllü staj arasında fark yok; ikisi de gerçek bir deneyim satırı.',
      },
      {
        soru: 'Okul gönüllü staj için belge verir mi?',
        cevap:
          'Vermeyebiliyor, çünkü okul bu stajda taraf değil. Yine de okulunun haberi olması iyi olur; bazı okullar gönüllü stajı da kayda geçiriyor.',
      },
    ],
  },
  {
    slug: 'universite-staj-birimi',
    konu: 'universite',
    etiketler: ['staj komisyonu', 'okul', 'yönerge', 'belge'],
    hizliCevap:
      'Staj biriminden üç şey alınıyor: staj yönergesi, zorunlu staj formu ve sigorta girişi için gereken onay. Süreç okuldan okula değiştiği için ilk adım her zaman kendi bölümünün yönergesini okumak.',
    kaynaklar: [
      { etiket: 'Yükseköğretim Kurulu (YÖK)', adres: 'https://www.yok.gov.tr', kurum: 'Yükseköğretim Kurulu', tur: 'kurum' },
    ],
    sonrakiAdim: { etiket: 'Bölümüne göre staj sayfasını aç', yol: '/bolumler', aciklama: 'Kendi bölümünde staj nerede yapılır, stajyer ne iş yapar.' },
    baslik: 'Okulun staj birimiyle nasıl çalışılır',
    ozet: 'Kime gidilir, hangi belge istenir, ne zaman başvurulur.',
    kategori: 'ogrenci',
    aciklama:
      'Üniversite staj birimi ne iş yapar, hangi belgeleri verir, ne zaman ' +
      'başvurulmalı? Süreci sorunsuz yürütmenin yolu.',
    icerik: (
      <>
        <P>
          Staj sürecinde en çok gecikme yaşanan yer okul tarafı. Sebebi genelde bürokrasi
          değil, öğrencinin süreci geç başlatması: belge birkaç imza gerektiriyor ve o
          imzaların sahipleri her gün okulda olmuyor.
        </P>

        <B>Kime gidilir</B>
        <L>
          <li>
            <strong>Bölüm staj komisyonu / staj sorumlusu hocası</strong> — stajın
            içeriğini ve yerinin uygunluğunu o onaylıyor.
          </li>
          <li>
            <strong>Bölüm sekreterliği</strong> — belgeyi hazırlayan ve kaydı tutan yer.
          </li>
          <li>
            <strong>Kariyer merkezi</strong> — her okulda yok ama varsa firma bağlantıları
            ve geçmiş staj listeleri orada.
          </li>
        </L>

        <B>Sıra</B>
        <Akis
          adimlar={[
            {
              baslik: 'Okulun staj yönergesini oku',
              aciklama:
                'Bölümün sayfasında PDF olarak duruyor. Kaç iş günü, hangi dönemde yapılabilir, hangi işletmeler kabul ediliyor — hepsi orada yazıyor. Herkesin atladığı ilk adım bu.',
            },
            {
              baslik: 'Staj yerini bul ve sözlü onay al',
              aciklama:
                'İşletme "tamam" demeden belge süreci başlatmanın anlamı yok. Kabul aldıktan sonra tarihleri netleştir.',
            },
            {
              baslik: 'Staj formunu al ve doldur',
              aciklama:
                'Bölüm sekreterliğinden ya da okulun sisteminden. İşletme bilgileri, tarih aralığı ve senin bilgilerin. Yanlış tarih yazmak en sık yapılan hata — düzeltmek baştan almak demek.',
            },
            {
              baslik: 'İşletmeye imzalatıp kaşelet',
              aciklama:
                'Belgeyi işletme yetkilisi imzalıyor ve kaşeliyor. Bu adım için işletmeye fiziken gitmen gerekebilir.',
            },
            {
              baslik: 'Okula teslim et ve sigorta girişini bekle',
              aciklama:
                'Okul sigorta girişini yapıyor. Bu birkaç iş günü sürüyor ve giriş yapılmadan staja BAŞLAMAMALISIN — sigortasız geçen gün sayılmıyor.',
            },
          ]}
        />

        <Uyari>
          Süreci staj başlangıcından <strong>en az üç hafta önce</strong> başlat. İmza,
          kaşe ve sigorta girişi toplamda iki haftayı bulabiliyor; ara tatil ya da bayram
          denk gelirse daha da uzuyor.
        </Uyari>

        <B>Sık karşılaşılan sorunlar</B>
        <L>
          <li>
            <strong>"Bu işletme uygun değil" cevabı.</strong> Genelde faaliyet alanı
            bölümle örtüşmediği için. Belge sürecine girmeden önce hocaya sormak bu riski
            ortadan kaldırıyor.
          </li>
          <li>
            <strong>Tarih tutmuyor.</strong> Okulun kabul ettiği dönem dışında staj
            yapmak çoğu bölümde sayılmıyor. Yönergedeki dönem bilgisine bak.
          </li>
          <li>
            <strong>Sigorta girişi gecikiyor.</strong> Başlangıç tarihini erken yazıp
            geç başlarsan günler eksik sayılabiliyor. Gerçekçi tarih yaz.
          </li>
        </L>
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'Staj işlemlerine ne zaman başlamalıyım?',
        cevap:
          'Staj başlangıcından en az üç hafta önce. İmza, kaşe ve sigorta girişi toplamda iki haftayı bulabiliyor; ara tatil ya da bayram denk gelirse daha da uzuyor.',
      },
      {
        soru: 'Staj için okulda kime gidilir?',
        cevap:
          'Üç yer var: bölüm staj komisyonu ya da staj sorumlusu hocası stajın içeriğini ve yerin uygunluğunu onaylıyor, bölüm sekreterliği belgeyi hazırlıyor, kariyer merkezi (her okulda yok) firma bağlantılarını ve geçmiş staj listelerini tutuyor.',
      },
      {
        soru: 'Okulun staj yönergesi nedir, nereden bulurum?',
        cevap:
          'Bölümün sayfasında PDF olarak duruyor. Kaç iş günü gerektiği, hangi dönemde yapılabileceği ve hangi işletmelerin kabul edildiği orada yazıyor. Herkesin atladığı ilk adım bu.',
      },
      {
        soru: 'Sigorta girişi yapılmadan staja başlayabilir miyim?',
        cevap:
          'Başlamamalısın. Okul sigorta girişini birkaç iş gününde yapıyor ve giriş yapılmadan geçen gün çoğu okulda sayılmıyor; kaza durumunda koruma da olmuyor.',
      },
      {
        soru: 'Okul staj yerimi uygun bulmazsa ne olur?',
        cevap:
          'Belge süreci durur. Ret genelde işletmenin faaliyet alanı bölümle örtüşmediği için geliyor. Belge sürecine girmeden önce staj sorumlusu hocaya sormak bu riski ortadan kaldırıyor.',
      },
      {
        soru: 'Staj formuna yanlış tarih yazarsam ne olur?',
        cevap:
          'Düzeltmek çoğu zaman süreci baştan almak demek. Ayrıca başlangıç tarihini erken yazıp geç başlarsan günler eksik sayılabiliyor — gerçekçi tarih yaz.',
      },
    ],
  },
  {
    slug: 'stajdan-ise-gecis',
    konu: 'kariyer',
    etiketler: ['işe geçiş', 'teklif', 'referans'],
    hizliCevap:
      'Stajın işe dönüşmesi son iki haftada belli oluyor: yaptığın işi görünür kılmak, niyetini açıkça söylemek ve ayrılırken referans istemek. Teklif gelmese bile referans ve somut bir çıktı bir sonraki başvuruda işe yarıyor.',
    sonrakiAdim: { etiket: 'Profilini tamamla ve CV’ni indir', yol: '/cv', aciklama: 'Stajda yaptığın işi CV’ye geçir.' },
    baslik: 'Stajdan işe geçiş: staj bitince ne yapmalı',
    ozet: 'Stajın işe dönüşmesi için son iki hafta ve sonrası.',
    kategori: 'ogrenci',
    aciklama:
      'Staj işe dönüşür mü? Staj bitiminde ne yapmalı, referans nasıl istenir, ' +
      'bağlantı nasıl korunur.',
    icerik: (
      <>
        <P>
          Stajın işe dönüşmesi tesadüf değil, çoğu zaman son iki haftada verilen birkaç
          kararın sonucu. Staj bitip evine döndükten sonra yapılabilecek fazla bir şey
          kalmıyor.
        </P>

        <B>Son iki hafta</B>
        <Akis
          adimlar={[
            {
              baslik: 'Bir işi tamamen bitir',
              aciklama:
                'Yarım kalmış beş iş değil, tamamlanmış bir iş bırak. "Şunu o yapmıştı, hâlâ kullanıyoruz" cümlesi seni işe aldıran cümledir.',
            },
            {
              baslik: 'Yaptıklarını yaz',
              aciklama:
                'Kısa bir liste: hangi işlere dokundun, ne öğrendin, hangi araçları kullandın. Hem staj defterine hem kendi CV\'ne lazım olacak; aradan bir ay geçince hatırlamıyorsun.',
            },
            {
              baslik: 'Niyetini söyle',
              aciklama:
                'Sorumluna açıkça söyle: "Mezun olunca burada çalışmak isterim." Kimse aklından geçeni tahmin etmiyor. Söylemek bir şey kaybettirmiyor, söylememek fırsat kaybettiriyor.',
            },
            {
              baslik: 'Referans iste',
              aciklama:
                'Staj biterken, hafızası tazeyken. Sorumlunun adını, unvanını ve iletişim bilgisini not al; ileride başvururken referans olarak yazabilmek için önce ondan izin al.',
            },
          ]}
        />

        <B>Staj bittikten sonra</B>
        <L>
          <li>
            <strong>Teşekkür mesajı gönder.</strong> Kısa, samimi ve son gün. Bir cümle
            de ne öğrendiğini yaz.
          </li>
          <li>
            <strong>LinkedIn'de bağlantı kur.</strong> Sorumlunla ve birlikte çalıştığın
            kişilerle. Bağlantı isteğine kısa bir not ekle.
          </li>
          <li>
            <strong>Altı ay sonra tek bir haber ver.</strong> "Mezuniyetime bir dönem
            kaldı, hâlâ ilgileniyorum" gibi. Israr değil, hatırlatma.
          </li>
        </L>

        <B>İşe dönüşmezse</B>
        <P>
          Çoğu staj işe dönüşmüyor ve bu bir başarısızlık değil. Elinde kalanlar şunlar:
          CV'de gerçek bir deneyim satırı, anlatabileceğin bir proje, bir referans ve
          sektörün nasıl işlediğine dair fikir. Bir sonraki başvuruda bunların hepsi
          işine yarıyor.
        </P>

        <KontrolListesi
          baslik="Staj bitmeden halledilmesi gerekenler"
          maddeler={[
            'Staj defteri tamamlandı, imza ve kaşeler alındı',
            'İşletme değerlendirme formu dolduruldu (çoğu okulda kapalı zarfta)',
            'Sorumlunun adı, unvanı ve iletişim bilgisi not edildi',
            'Referans için sözlü izin alındı',
            'Yaptığın işlerin kısa listesi yazıldı',
            'Defterin tamamının fotoğrafı çekildi',
          ]}
        />
      </>
    ),
    guncelleme: '2026-08-17',
    sss: [
      {
        soru: 'Staj işe dönüşür mü?',
        cevap:
          'Dönüşebiliyor ama tesadüfen değil. Çoğu zaman son iki haftada verilen birkaç kararın sonucu: tamamlanmış bir iş bırakmak, niyetini açıkça söylemek ve referans istemek. Staj bitip evine döndükten sonra yapabileceğin fazla bir şey kalmıyor.',
      },
      {
        soru: 'Staj sonunda referans nasıl istenir?',
        cevap:
          'Staj biterken, hafıza tazeyken. Sorumlunun adını, unvanını ve iletişim bilgisini not al ve ileride referans olarak yazabilmek için önce ondan sözlü izin al.',
      },
      {
        soru: 'İşe alınmak istediğimi söylemeli miyim?',
        cevap:
          'Söyle. \'Mezun olunca burada çalışmak isterim\' cümlesini kimse senin aklından okumuyor. Söylemek bir şey kaybettirmiyor, söylememek fırsat kaybettiriyor.',
      },
      {
        soru: 'Staj bitmeden neleri halletmiş olmam gerekir?',
        cevap:
          'Staj defterinin tamamlanmış, imzalanmış ve kaşelenmiş olması; işletme değerlendirme formunun doldurulmuş olması; sorumlunun iletişim bilgisi; referans için sözlü izin; yaptığın işlerin kısa listesi ve defterin tamamının fotoğrafı.',
      },
      {
        soru: 'Staj bittikten sonra bağlantıyı nasıl korurum?',
        cevap:
          'Son gün kısa bir teşekkür mesajı, ardından LinkedIn\'de sorumlunla ve birlikte çalıştığın kişilerle bağlantı. Altı ay sonra tek bir hatırlatma yeterli: \'Mezuniyetime bir dönem kaldı, hâlâ ilgileniyorum\' gibi.',
      },
      {
        soru: 'Staj işe dönüşmezse ne kaybederim?',
        cevap:
          'Bir şey kaybetmiyorsun. Çoğu staj işe dönüşmüyor ve bu bir başarısızlık değil. Elinde CV\'de gerçek bir deneyim satırı, anlatabileceğin bir proje, bir referans ve sektörün nasıl işlediğine dair fikir kalıyor.',
      },
    ],
  },
  {
    slug: 'yurtdisinda-staj',
    konu: 'yurtdisi',
    oneCikan: true,
    etiketler: ['erasmus', 'iaeste', 'yurtdışı', 'hibe'],
    hizliCevap:
      'Yurt dışında staj çoğunlukla tek başına ilana başvurarak değil, okulun kanalıyla yürüyor: Erasmus+ staj hareketliliği ve IAESTE başvuruları üniversitenin uluslararası ofisinden yapılıyor. Takvim okulun ilanına bağlı, o yüzden ofisi erken takip etmek gerekiyor.',
    kaynaklar: [
      { etiket: 'Erasmus+ Programı — Ulusal Ajans program sayfası', adres: 'https://www.ua.gov.tr/programlar_/erasmus-programi/', kurum: 'Türkiye Ulusal Ajansı', tur: 'belge' },
    ],
    sonrakiAdim: { etiket: 'Yurtdışı fırsatlarını gör', yol: '/yurtdisi-firsatlari', aciklama: 'Erasmus ve yurt dışı programları tek listede.' },
    baslik: 'Yurt dışında staj: Erasmus+ ve IAESTE',
    ozet: 'Tek başına ilana başvurmak nadiren yürüyor; yol okulun kanalından geçiyor.',
    kategori: 'ogrenci',
    aciklama:
      'Yurt dışında staj nasıl yapılır? Erasmus+ staj hareketliliği, IAESTE ve ' +
      'kendi başına başvuru; zorunlu staj yerine sayılması ve vize tarafı.',
    icerik: (
      <>
        <P>
          Yurt dışında staj yapmak mümkün, ama internette gördüğün bir ilana tek başına
          başvurarak nadiren yürüyor. Üç yol var ve ikisi kendi okulunun kanalından
          geçiyor. Hangisinden gideceğini baştan bilmek, aylarca boşa başvuru yapmanı
          önlüyor.
        </P>

        <RehberFigur
          kaynak="/rehber-gorseller/yurtdisi-staj-yol-haritasi.svg"
          alt="Yurt dışı staj yol haritası yedi adımda: okulunun ofisini aç, kanalını seç, staj komisyonundan yazılı ön onay al, staj yerini bul, belgeleri tamamla, vize ve staj sözleşmesi, staj. Görselde vize ve belge sürecinin ülkeye ve programa göre değişebileceği uyarısı var."
          aciklama="Üçüncü adım bilerek vurgulu: onayı gitmeden önce almak, dönüşte saydırmaya çalışmaktan farklı bir sonuç veriyor."
          genislik={400}
          yukseklik={636}
        />

        <B>Tek başına başvuru neden çoğu zaman tıkanıyor</B>
        <P>
          İki duvar var. Birincisi vize: Türk vatandaşı bir öğrencinin çoğu ülkede staj
          için vize alması gerekiyor ve bu vize için ev sahibi iş yerinin staj sözleşmesi
          düzenlemesi şart. Yani şirketin sadece "seni beğenmesi" yetmiyor, evrak sürecine
          taraf olmayı kabul etmesi gerekiyor. Küçük şirketlerin çoğu bunu üstlenmiyor.
        </P>
        <P>
          İkincisi ilanların kendi şartı: yurt dışı staj ilanlarının büyük kısmı
          "çalışma iznine sahip olmak" koşulu taşıyor. Bu koşul yazıyorsa vize desteği
          yok demektir. Uzaktan çalışmaya açık ve Türkiye'den başvuru kabul eden staj
          ilanı ise çok az; şirketin Türkiye'deki birine sözleşme yapıp ödeme yapabilmesi
          gerekiyor ve çoğu bunu kurmamış oluyor.
        </P>

        <RehberFigur
          kaynak="/rehber-gorseller/yurtdisi-staj-kanallari.svg"
          alt="Yurt dışı stajın üç kanalı yan yana: Erasmus+, IAESTE ve kendi başına başvuru. Her kanal için kim için uygun olduğu, başvurunun nereden yapıldığı ve neye bağlı olduğu yazıyor."
          aciklama="Üç kart aynı boyutta: bu bir sıralama değil. Hangisinin sana açık olduğunu okulunun programa dahil olup olmaması belirliyor."
          genislik={400}
          yukseklik={512}
        />

        <B>1. Erasmus+ staj hareketliliği</B>
        <P>
          Yurt dışı stajının Türkiye'deki asıl kanalı bu. Öğrenciyi başka bir ülkedeki iş
          yerine gönderiyor, süre boyunca hibe ödeniyor ve en önemlisi evrak tarafı
          tanınıyor — yani okulun süreçte taraf oluyor.
        </P>
        <P>
          Başvuru siteler üzerinden değil,{' '}
          <strong className="text-gray-900">
            kendi üniversitenin Erasmus veya Uluslararası İlişkiler ofisinden
          </strong>{' '}
          yapılıyor. İlk adımın o ofisin duyuru sayfasına bakmak olmalı; başvuru dönemi,
          istenen belgeler ve dil şartı okuldan okula değişiyor.
        </P>
        <L>
          <li>Staj yerini genellikle öğrenci kendisi buluyor; ofis kabul mektubunu istiyor.</li>
          <li>Hibe miktarı gidilen ülkeye ve döneme göre değişiyor.</li>
          <li>Başvuru takvimi her okulda ayrı; kaçırırsan bir sonraki dönemi bekliyorsun.</li>
        </L>
        <P>
          Mezuniyet sonrası staj da programın parçası. Ama kritik ayrıntı şu:{' '}
          <strong className="text-gray-900">
            başvuruyu mezun olmadan yapmış olman gerekiyor.
          </strong>{' '}
          Mezun olduktan sonra "acaba yapabilir miyim" diye sormak çoğu durumda geç
          kalmak oluyor.
        </P>

        <B>2. IAESTE</B>
        <P>
          Teknik bölümler ağırlıklı bir öğrenci değişim programı; mühendislik ve fen
          bilimleri öğrencileri için işliyor. Mantığı karşılıklı: üniversiteler birbirine
          öğrenci gönderiyor. Bu da kontenjanın okulunun programa dahil olmasına bağlı
          olduğu anlamına geliyor.
        </P>
        <P>
          Yapılacak ilk şey kendi okulunda IAESTE temsilciliği olup olmadığını sormak.
          Varsa süreç oradan yürüyor, yoksa bu yol sana kapalı.
        </P>

        <B>3. Kendi başına bulmak</B>
        <P>
          Büyük şirketlerin yapılandırılmış staj programları vize sürecini destekleyebiliyor.
          Ama iki şeyi bilerek gir: başvurular staj döneminden aylar önce açılıyor ve
          kapanıyor, ve rekabet çok yüksek. Yaz stajı için ilkbaharda bakmaya başlamak
          genellikle geç kalmak demek.
        </P>
        <P>
          Bu yolu deneyeceksen ilanın koşullar kısmını en başta oku. "Çalışma izni
          gerekli" yazıyorsa CV hazırlamaya girişmeden geç; zamanın vize desteği veren
          ilanlara kalsın.
        </P>

        <B>Zorunlu staj yerine sayılır mı?</B>
        <P>
          Kararı veren tek yer{' '}
          <strong className="text-gray-900">kendi bölümünün staj komisyonu.</strong>{' '}
          Üniversiteler yurt dışı stajını genelde kabul ediyor, ama önceden onay istiyorlar
          ve sigorta tarafı yurt içindekinden farklı işliyor.
        </P>
        <Uyari>
          En pahalı hata: gidip stajı yapıp döndükten sonra saydırmaya çalışmak. Onay
          alınmamış staj kabul edilmezse ne süre geri geliyor ne para. Gitmeden önce staj
          komisyonundan yazılı onay al.
        </Uyari>
        <P>
          Komisyona sorman gerekenler: bu iş yeri türü kabul ediliyor mu, kaç iş günü
          sayılıyor, sigorta nasıl yapılacak, staj defteri ve değerlendirme formu yurt
          dışında nasıl doldurulacak. Okulunun staj biriminin nasıl çalıştığını{' '}
          <a
            href="/rehber/universite-staj-birimi"
            className="text-blue-600 hover:underline font-semibold"
          >
            ayrı bir rehberde
          </a>{' '}
          anlattık.
        </P>

        <B>Nereden başlanır</B>
        <L>
          <li>Okulunun Erasmus / Uluslararası İlişkiler ofisinin duyuru sayfasını aç.</li>
          <li>Başvuru döneminin ne zaman açıldığını ve hangi belgelerin istendiğini not et.</li>
          <li>Dil belgesi isteniyorsa hazırlığı erken başlat; sınav takvimi seni bekletiyor.</li>
          <li>Staj komisyonuna "yurt dışında yaparsam sayılır mı" diye yazılı olarak sor.</li>
        </L>
        <P>
          Okulunun kariyer merkezi de bu süreçte işine yarıyor: birçoğu Erasmus
          duyurularını ve anlaşmalı kurumları kendi sayfasında paylaşıyor.{' '}
          <a
            href="/universite-kariyer-merkezleri"
            className="text-blue-600 hover:underline font-semibold"
          >
            Kariyer merkezlerinin adreslerini
          </a>{' '}
          derledik.
        </P>
        <Uyari>
          Hibe tutarları, başvuru takvimi ve istenen belgeler her yıl değişiyor. Bu sayfada
          bilerek rakam ve tarih yazmıyoruz — geçerli bilgi yalnızca kendi okulunun güncel
          duyurusunda.
        </Uyari>
      </>
    ),
    sss: [
      {
        soru: 'Erasmus+ stajı zorunlu staj yerine sayılır mı?',
        cevap:
          'Kararı kendi bölümünün staj komisyonu veriyor. Üniversiteler genelde kabul ediyor ama önceden onay istiyorlar. Gitmeden önce yazılı onay al; sonradan saydırmaya çalışmak kabul edilmezse ne süreyi ne parayı geri getiriyor.',
      },
      {
        soru: 'Erasmus+ hibesi ne kadar?',
        cevap:
          'Tutar gidilen ülkeye ve döneme göre değişiyor, ayrıca her yıl güncelleniyor. Bu yüzden burada rakam yazmıyoruz: geçerli miktar kendi okulunun Erasmus ofisinin o dönem yayınladığı duyuruda yazıyor.',
      },
      {
        soru: 'Staj yerini kim buluyor, okul mu ben mi?',
        cevap:
          'Erasmus+ staj hareketliliğinde yeri genellikle öğrenci kendisi buluyor ve iş yerinden aldığı kabul mektubunu okuluna veriyor. Bazı okulların anlaşmalı kurum listesi de oluyor; ofise sorduğunda söylüyorlar.',
      },
      {
        soru: 'Mezun olduktan sonra Erasmus+ stajı yapabilir miyim?',
        cevap:
          'Mezuniyet sonrası staj programın parçası, ama başvuruyu mezun olmadan yapmış olman gerekiyor. Mezuniyetten sonra ilk kez başvurmak çoğu durumda mümkün olmuyor; bu yüzden son sınıftaysan takvimi şimdi öğren.',
      },
      {
        soru: 'Dil belgesi şart mı?',
        cevap:
          'Okuldan okula ve gidilecek kuruma göre değişiyor. Bazı üniversiteler kendi sınavını yapıyor, bazıları belge istiyor, ev sahibi kurumun ayrı bir beklentisi olabiliyor. Erasmus ofisinin başvuru duyurusunda hangi belgenin kabul edildiği yazıyor.',
      },
      {
        soru: 'Yurt dışında staj için vize gerekiyor mu?',
        cevap:
          'Çoğu ülke için evet ve staj vizesi başvurusunda ev sahibi iş yerinin düzenlediği staj sözleşmesi isteniyor. Yani şirketin evrak sürecine taraf olmayı kabul etmesi gerekiyor. İlanda "çalışma izni gerekli" yazıyorsa o ilan vize desteği vermiyor demektir.',
      },
    ],
    guncelleme: '2026-08-18',
  },

  /* Konu konu yazılan yeni rehberler. Sıra: eskiler önce. */
  ...STAJ_REHBERLERI,
  ...CV_REHBERLERI,
  ...BURS_REHBERLERI,
  ...YURT_REHBERLERI,
  ...UNIVERSITE_REHBERLERI,
  ...YURTDISI_REHBERLERI,
  ...KARIYER_REHBERLERI,
];

export function rehberBul(slug: string): Rehber | undefined {
  return REHBERLER.find((r) => r.slug === slug);
}
