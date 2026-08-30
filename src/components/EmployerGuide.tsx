import React, { useEffect, useState } from 'react';
import {
  Building2,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  UserPlus,
  Search,
  HeartHandshake,
} from 'lucide-react';
import {
  Akis,
  SorumlulukTablosu,
  KazancKartlari,
  EkipCizimi,
  BelgeCizimi,
  KontrolListesi,
} from './RehberGorseller';
import { SayfaKabugu } from './SayfaKabugu';
import { fetchTalentPoolStats, type TalentPoolStat } from '../lib/queries';

/**
 * İşveren rehberi.
 *
 * NEDEN BU SAYFA VAR
 * ------------------
 * Ölçtük: kazımanın Türkiye'de tavanı var. Workable'ın tüm Türkiye
 * indeksinde 13 erken kariyer ilanı bulunuyor ve büyük işverenlerin
 * hiçbiri okunabilir bir ATS API'si açmıyor. Yani ilan sayısı daha fazla
 * yazılımla artmıyor — şirketin ilan AÇMASIYLA artıyor.
 *
 * Şirketlerin ilan açmama sebebi çoğu zaman isteksizlik değil, bilgisizlik:
 * sigortayı kim yapar, ücret ödemek zorunlu mu, üniversiteyle hangi evrak
 * imzalanır bilinmiyor. Bilinmediği için araştırılmıyor, araştırılmadığı
 * için hiç başlanmıyor.
 *
 * Bu sayfa aynı zamanda şirketin bizi bulmasının tek yolu: davet e-postası
 * gönderemiyoruz (ticari elektronik ileti, İYS kaydı gerekiyor). Bir işveren
 * "stajyer nasıl alınır" diye aradığında karşısına çıkmamız gerekiyor.
 *
 * İÇERİK KURALI
 * -------------
 * Yıldan yıla değişen oranlar ve tutarlar BURAYA YAZILMIYOR. Asgari ücrete
 * endeksli ödemeler, devlet katkısı payları ve prim oranları her yıl
 * güncelleniyor; sayfada sabit bir rakam bırakmak, bir süre sonra işvereni
 * yanlış yönlendirmek demek. Mekanizma anlatılıyor, güncel rakam için resmî
 * kaynağa yönlendiriliyor.
 */

interface EmployerGuideProps {
  onBack: () => void;
  onNavigate: (path: string) => void;
}

const Baslik: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-bold text-gray-900 pt-2">{children}</h2>
);

const Adim: React.FC<{ no: number; baslik: string; children: React.ReactNode }> = ({
  no,
  baslik,
  children,
}) => (
  <div className="flex gap-3">
    <span className="w-7 h-7 shrink-0 rounded-lg bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
      {no}
    </span>
    <div className="min-w-0 space-y-1">
      <h3 className="font-bold text-gray-900">{baslik}</h3>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </div>
  </div>
);

const Kaynak: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer noopener"
    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
  >
    {children}
    <ExternalLink className="w-3 h-3" />
  </a>
);

export const EmployerGuide: React.FC<EmployerGuideProps> = ({ onBack, onNavigate }) => {
  const [havuz, setHavuz] = useState<TalentPoolStat | null>(null);

  useEffect(() => {
    const eskiBaslik = document.title;
    document.title = 'Stajyer nasıl alınır? İşveren rehberi | StajımVar';
    let iptal = false;
    fetchTalentPoolStats()
      .then((s) => {
        if (!iptal) setHavuz(s);
      })
      .catch(() => {
        /* İstatistik gösterilemezse sayfa yine de işini görür. */
      });
    return () => {
      iptal = true;
      /* Başlık geri yükleniyor: SPA'da sonraki sayfa bu adı taşımasın. */
      document.title = eskiBaslik;
    };
  }, []);

  return (
    <SayfaKabugu onBack={onBack}>
      <div className="space-y-6">
        {/*
          GİRİŞ ALANI

          Başlık "Stajyer almak istiyorsunuz ama nereden başlayacağınızı
          bilmiyorsunuz" idi: telefonda ÜÇ satır kaplıyor ve okumadan önce
          yoruyordu. Kısaltıldı; uzun hâlin anlattığı şey zaten hemen
          altındaki paragrafta duruyor.

          Zemin renklendi ve rozet eklendi — sayfa artık bir metin dosyası
          gibi değil, bir rehber gibi açılıyor.
        */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-blue-50/40 p-5 sm:p-8">
          <span
            aria-hidden="true"
            className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-amber-100/40"
          />
          <div className="relative space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-amber-200 text-[11px] font-bold uppercase tracking-wider text-amber-700">
              <Building2 className="w-3.5 h-3.5" />
              İşveren rehberi
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              Stajyer almak sandığınızdan kolay.
            </h1>
            <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
              Çoğu küçük ve orta ölçekli işletme stajyer çalıştırabilecek durumda.
              Başlamamasının sebebi genelde isteksizlik değil: sigortayı kimin yapacağı,
              ücret ödemenin zorunlu olup olmadığı ve okulla hangi evrakın imzalanacağı
              bilinmiyor. Bu sayfa o soruları sırayla cevaplıyor.
            </p>

            {/*
              ANA İŞVEREN AKSİYONU EN ÜSTTE

              Sayfanın tek somut eylemi (şirket sayfasını sahiplenmek) en altta,
              üç ekran aşağıdaydı. Buraya "Hemen ilan ver" yazmak da yanlış
              olurdu: doğrudan ilan yayınlama yok, akış sahiplenme onayından
              geçiyor. Düğmenin adı yapacağı işi söylüyor.
            */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('/isveren/ilan-ver')}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Şirketini bul ve sahiplen
              </button>
              <span className="self-center text-xs text-gray-500">
                İlan girişi, sahiplenme onaylandıktan sonra açılıyor.
              </span>
            </div>
          </div>
        </div>

        {/*
          SORUMLULUK TABLOSU EN ÜSTE ALINDI

          Önce sayfanın ortasındaydı, "zorunlu/gönüllü" ayrımından sonra.
          Ama işverenin kafasındaki ilk soru bu: "sigortayı ben mi yapacağım,
          ücreti ben mi ödeyeceğim?" Cevabı görmek için üç bölüm aşağı inmesi
          gerekiyordu; çoğu kişi o kadar inmiyor.

          Artık giriş cümlesinin hemen altında. Tablodaki notlar zaten
          "zorunlu stajda" diyerek hangi durumdan bahsettiğini söylüyor;
          ayrımın ayrıntısı aşağıda duruyor.
        */}
        <Baslik>Kim ne yapar?</Baslik>
        <SorumlulukTablosu
          satirlar={[
            {
              kim: 'okul',
              is: 'Staj belgesini hazırlar',
              not: 'Stajın müfredat kapsamında olduğunu gösteren form.',
            },
            {
              kim: 'okul',
              is: 'İş kazası ve meslek hastalığı sigortasını yapar',
              not: 'Zorunlu stajda genellikle okul; primi de okul öder. İşverenlerin en çok yanıldığı nokta burası.',
            },
            {
              kim: 'ogrenci',
              is: 'Belgeyi işletmeye getirir ve imzalatır',
              not: 'Staja başlamadan önce. İmzasız form geçerli değil.',
            },
            {
              kim: 'ogrenci',
              is: 'Staj defterini doldurur',
              not: 'İşletmedeki sorumlusuna imzalatarak.',
            },
            {
              kim: 'isveren',
              is: 'Öğrenciye bir iş ve bir sorumlu tanımlar',
              not: 'Kime soracağını bilmeyen stajyer, üç hafta boş oturuyor.',
            },
            {
              kim: 'isveren',
              is: 'Ücreti öder',
              not: '3308 kapsamındaki stajlarda zorunlu. Bir kısmı için devlet katkısı var.',
            },
            {
              kim: 'isveren',
              is: 'Staj sonu değerlendirme formunu doldurur',
              not: 'Öğrencinin notu buna bağlı; kapalı zarfta teslim ediliyor.',
            },
          ]}
        />


        {/* ---- talep kanıtı ---- */}
        {havuz && havuz.toplam > 0 && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <p className="font-bold text-blue-900">Şu anda staj arayan öğrenciler</p>
            </div>
            <p className="text-3xl font-black text-blue-900 tabular-nums">
              {havuz.toplam}
              <span className="text-base font-bold text-blue-700"> öğrenci</span>
            </p>
            {havuz.enCokBolum.length > 0 && (
              <p className="text-sm text-blue-900">
                En çok:{' '}
                {havuz.enCokBolum.map((b) => `${b.ad} (${b.sayi})`).join(', ')}
              </p>
            )}
            {havuz.enCokSehir.length > 0 && (
              <p className="text-sm text-blue-900">
                Şehirler: {havuz.enCokSehir.map((s) => `${s.ad} (${s.sayi})`).join(', ')}
              </p>
            )}
            <p className="text-xs text-blue-800">
              Profilini tamamlamış ve staj arayan kayıtlı öğrenciler. Sayı gerçek, tahmin değil.
            </p>
          </div>
        )}

        {/*
          EKİP ÇİZİMİ + KAZANÇ KARTLARI

          Sayfa yalnızca yükümlülük anlatıyordu: belge, sigorta, ücret. Hepsi
          doğru ama okuyan işverende "başıma iş alacağım" hissi bırakıyordu.
          Oysa karşılığında ne kazandığı da gerçek. Önce onu gösteriyoruz;
          yükümlülükler zaten hemen altında duruyor.
        */}
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-blue-50/60 to-white p-4 sm:p-6">
          <EkipCizimi />
        </div>

        <Baslik>Stajyer almak size ne kazandırır?</Baslik>
        <KazancKartlari
          kartlar={[
            {
              ikon: <UserPlus className="w-5 h-5" />,
              baslik: 'Denenmiş eleman',
              aciklama:
                'İşe alım kararını özgeçmişe bakarak değil, birlikte çalışarak veriyorsunuz. Yanlış işe alımın maliyeti düşünüldüğünde bu tek başına değerli.',
            },
            {
              ikon: <Lightbulb className="w-5 h-5" />,
              baslik: 'Taze bakış',
              aciklama:
                'Alışkanlık hâline gelmiş işleri ilk kez gören biri "bu neden böyle yapılıyor?" diye soruyor. Cevabı olmayan sorular iyileştirme fırsatı.',
            },
            {
              ikon: <Search className="w-5 h-5" />,
              baslik: 'Görünürlük',
              aciklama:
                'Stajyer okuluna döndüğünde sizi anlatıyor. Küçük ve orta ölçekli işletmeler için bu, reklamla satın alınamayacak bir tanınırlık.',
            },
            {
              ikon: <HeartHandshake className="w-5 h-5" />,
              baslik: 'Ekibe iyi geliyor',
              aciklama:
                'Birine iş öğretmek, öğretenin de işi netleştirmesini gerektiriyor. Kıdemli çalışan kendi bildiğini toparlamak zorunda kalıyor.',
            },
          ]}
        />

        <Baslik>Önce şunu ayırın: zorunlu staj mı, gönüllü staj mı?</Baslik>
        <div className="text-sm text-gray-600 leading-relaxed space-y-2">
          <p>
            <strong className="text-gray-900">Zorunlu staj</strong>, öğrencinin mezun olabilmek
            için müfredat gereği yapmak zorunda olduğu stajdır. Öğrenci okulundan bir
            <em> zorunlu staj belgesi</em> getirir. Meslek yüksekokulu ve mühendislik
            bölümlerinde yaygındır.
          </p>
          <p>
            <strong className="text-gray-900">Gönüllü (isteğe bağlı) staj</strong>, müfredatın
            parçası değildir; öğrenci deneyim kazanmak için yapar.
          </p>
          <p>
            Bu ayrım önemli, çünkü <strong className="text-gray-900">sigorta ve ücret
            yükümlülükleri iki durumda farklı işliyor.</strong> Aşağıdaki adımlar zorunlu staja
            göre anlatılmıştır; küçük işletmelerin karşılaştığı durum çoğunlukla budur.
          </p>
        </div>

        {/*
          BELGE AKIŞ ÇİZİMİ

          Belgenin okuldan çıkıp öğrenci üzerinden işletmeye ulaştığı yol,
          cümleyle anlatılınca soyut kalıyor.
        */}
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4 sm:p-6">
          <BelgeCizimi />
        </div>

        <Baslik>Dört adımda stajyer almak</Baslik>
        <Akis
          adimlar={[
            {
              baslik: 'İhtiyacı tek cümleyle yazın',
              aciklama:
                'Stajyerin yapacağı işi bir cümleyle yazabiliyorsanız hazırsınız. Belirsiz bir "yardımcı olsun" tanımı hem sizi hem öğrenciyi zorlar.',
            },
            {
              baslik: 'Okuldan gelen belgeyi isteyin',
              aciklama:
                'Zorunlu stajda öğrenci, okulunun hazırladığı staj formunu getirir. Bu belge stajın müfredat kapsamında olduğunu ve okulun süreçte taraf olduğunu gösterir. Formu imzalamadan staja başlatmayın.',
            },
            {
              baslik: 'Sigortanın kimde olduğunu okulla yazılı teyit edin',
              aciklama:
                'Zorunlu stajda iş kazası ve meslek hastalığı sigortası genellikle okul tarafından yapılır ve primi okul öder — "stajyer alırsam SGK maliyeti çıkar" endişesi çoğu durumda yersiz. Ama gönüllü stajda ve bazı program türlerinde değişiyor. Okulun staj biriminden tek bir e-postayla teyit alın.',
            },
            {
              baslik: 'Ücret yükümlülüğünüzü kontrol edin',
              aciklama:
                '3308 sayılı Mesleki Eğitim Kanunu kapsamındaki stajlarda ücret ödenmesi zorunlu. Tutar asgari ücrete endeksli ve işletmedeki personel sayısına göre değişiyor; belirli bir kısmı için devlet katkısı var. Rakamlar her yıl güncellendiği için burada yazmıyoruz — hesaplama aracımızı kullanabilir ya da okulun staj birimine sorabilirsiniz.',
            },
          ]}
        />

        <KontrolListesi
          baslik="Staj başlamadan önce elinizde olması gerekenler"
          maddeler={[
            'Okulun hazırladığı, sizin imzaladığınız staj formu',
            'Sigortanın kimde olduğuna dair okuldan yazılı teyit',
            'Öğrencinin başlangıç ve bitiş tarihleri, haftalık gün sayısı',
            'İşletmede öğrencinin soru soracağı tek bir sorumlu kişi',
            'Öğrenciye ödenecek aylık tutar ve ödeme günü',
          ]}
        />

        <Baslik>Sık sorulanlar</Baslik>
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <div>
            <p className="font-bold text-gray-900">Staj kaç gün sürer?</p>
            <p>
              Süreyi okul belirler; bölüme göre değişir ve genellikle iş günü olarak sayılır.
              Öğrencinin getireceği belgede yazar.
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-900">Stajyeri işe almak zorunda mıyım?</p>
            <p>
              Hayır. Staj bir işe alım taahhüdü değildir. Uygun bulursanız teklif yapabilirsiniz,
              bu tarafların isteğine bağlıdır.
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-900">Tek bir stajyer için de bu süreç işler mi?</p>
            <p>
              Evet. Süreç işletme büyüklüğünden bağımsızdır; ücret yükümlülüğünün oranı
              personel sayısına göre değişir, süreç değişmez.
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-900">İlan vermek ücretli mi?</p>
            <p>
              StajımVar'da ilan yayınlamak ücretsizdir ve adaydan da hiçbir şekilde ücret
              talep edilmez.
            </p>
          </div>
        </div>

        {/* ---- yasal uyarı: içerik doğrulanana kadar dürüst kalalım ---- */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
          <p className="font-bold">Bu sayfa hukuki danışmanlık değildir.</p>
          <p>
            Mevzuat ve tutarlar değişebilir. Bağlayıcı bilgi için SGK, MEB, İŞKUR ve öğrencinin
            okulunun staj birimini esas alın. Sayfada eksik veya hatalı gördüğünüz bir bilgi
            varsa bize yazın, düzeltelim.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <p className="font-bold text-gray-900">Hazırsanız ilanınızı yayınlayalım</p>
          <p className="text-sm text-gray-600">
            Şirketinizin StajımVar'da bir sayfası zaten olabilir — ilanlarınızı kariyer
            sayfanızdan derliyoruz. Sayfanızı sahiplenip ilan girmeye başlayabilirsiniz.
          </p>
          {/*
            Bu düğme önce '/' adresine gidiyordu, yani öğrencinin ilan
            akışına. İşveren için çıkmaz sokaktı: ilan verme kanalı yazılmış
            olduğu hâlde ona giden hiçbir yol yoktu.
          */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/isveren/ilan-ver')}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Şirketini bul ve sahiplen
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/iletisim')}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              Bize yazın
            </button>
          </div>
        </div>
      </div>
    </SayfaKabugu>
  );
};
