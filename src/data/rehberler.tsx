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
  {
    slug: 'staj-basvuru-epostasi',
    baslik: 'Staj başvuru e-postası nasıl yazılır',
    ozet: 'Hazır şablon ve en sık yapılan altı hata.',
    kategori: 'ogrenci',
    aciklama:
      'Staj için şirkete gönderilecek e-posta nasıl yazılır? Konu satırı, metin ' +
      'şablonu, ek dosya kuralları ve sık yapılan hatalar.',
    icerik: (
      <>
        <P>
          İlan olmayan şirketlere doğrudan yazmak, staj bulmanın en çok işe yarayan yolu.
          Ama çoğu e-posta okunmadan kapanıyor — genelde aynı birkaç sebepten.
        </P>

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

        <B>Şablon</B>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line font-mono">
{`Merhaba,

[Üniversite] [Bölüm] 3. sınıf öğrencisiyim. Okulumun zorunlu
stajı kapsamında [tarih] – [tarih] arasında 20 iş günü staj
yapmam gerekiyor.

[Şirket adı]'nın [somut bir konu: ürün, proje, alan] tarafıyla
ilgileniyorum çünkü [tek cümle sebep].

Şu ana kadar [bir ders projesi / kullandığın program / yaptığın
iş] üzerinde çalıştım. CV'mi ekte gönderiyorum.

Sigortam okulum tarafından yapılacak; sizden ek bir yükümlülük
gerekmiyor.

Uygun olursanız kısa bir görüşme yapabilir miyiz?

İyi çalışmalar,
[Ad Soyad]
[Telefon]`}
        </div>

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
          bir mesaj atmak çoğu zaman e-postadan hızlı sonuç veriyor.
        </P>

        <B>Cevap gelmezse</B>
        <P>
          Bir hafta sonra aynı e-postaya tek bir hatırlatma yaz. Cevap yine gelmezse o
          şirketi bırak. Cevapsızlık çoğu zaman senle ilgili değil — kimsenin o kutuya
          bakmamasıyla ilgili.
        </P>
      </>
    ),
  },
  {
    slug: 'staj-defteri-nasil-doldurulur',
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

        <B>İmza ve kaşe</B>
        <P>
          Genelde her sayfanın ya da her haftanın sonunda işletmedeki sorumlunun imzası ve
          şirket kaşesi isteniyor. Bunu <strong>staj bitmeden</strong> hallet. Staj bittikten
          sonra şirkete kaşe için dönmek en sık yaşanan sıkıntı; kimse seni tanımıyor
          olabiliyor ya da yetkili izinde oluyor.
        </P>

        <B>Teslimden önce kontrol et</B>
        <L>
          <li>Tüm günler dolu mu, atlanan tarih var mı?</li>
          <li>Her gerekli sayfada imza ve kaşe var mı?</li>
          <li>İşletme değerlendirme formu dolduruldu mu, kapalı zarfta mı?</li>
          <li>Kapak bilgileri, öğrenci numarası ve tarih aralığı doğru mu?</li>
          <li>
            Teslim etmeden önce defterin tamamının fotoğrafını çek. Kaybolan defter geri
            gelmiyor.
          </li>
        </L>
      </>
    ),
  },
  {
    slug: 'kyk-burs-ve-kredi',
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
  },
];

export function rehberBul(slug: string): Rehber | undefined {
  return REHBERLER.find((r) => r.slug === slug);
}
