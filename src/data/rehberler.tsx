import React from 'react';

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

export interface Rehber {
  slug: string;
  baslik: string;
  ozet: string;
  kategori: RehberKategori;
  /** Arama motorunun ve paylaşımın göreceği açıklama. */
  aciklama: string;
  icerik: React.ReactNode;
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

export const REHBERLER: Rehber[] = [
  // ------------------------------------------------------------------ öğrenci
  {
    slug: 'zorunlu-staj-rehberi',
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
  },

  {
    slug: 'staj-cv-nasil-yazilir',
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

        <B>Beceri yazarken seviye belirt</B>
        <P>
          "Excel biliyorum" bir şey söylemiyor. "Excel — PIVOT tablo ve DÜŞEYARA seviyesinde"
          söylüyor. Abartma: mülakatta sorulduğunda yapamadığın bir şeyi yazmak, hiç yazmamaktan
          kötü.
        </P>

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
  },

  {
    slug: 'staj-mulakati',
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

        <B>Neredeyse her mülakatta çıkanlar</B>
        <L>
          <li>Kendinden kısaca bahseder misin?</li>
          <li>Neden bu alanda staj yapmak istiyorsun?</li>
          <li>Okulda en çok hangi dersten keyif aldın, neden?</li>
          <li>Bir projede zorlandığın bir an ve nasıl çözdüğün.</li>
          <li>Staj süren ne kadar, hangi günler gelebilirsin?</li>
        </L>

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
      </>
    ),
  },
];

export function rehberBul(slug: string): Rehber | undefined {
  return REHBERLER.find((r) => r.slug === slug);
}
