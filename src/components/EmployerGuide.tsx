import React, { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, GraduationCap } from 'lucide-react';
import { Logo } from './Logo';
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
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 cursor-pointer"
            aria-label="Geri"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Logo size="sm" showTagline={false} onClick={onBack} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Stajyer almak istiyorsunuz ama nereden başlayacağınızı bilmiyorsunuz
          </h1>
          <p className="text-base text-gray-600 leading-relaxed">
            Çoğu küçük ve orta ölçekli işletme stajyer çalıştırabilecek durumda. Başlamamasının
            sebebi genelde isteksizlik değil: sigortayı kimin yapacağı, ücret ödemenin zorunlu
            olup olmadığı ve okulla hangi evrakın imzalanacağı bilinmiyor. Bu sayfa o soruları
            sırayla cevaplıyor.
          </p>
        </div>

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

        <Baslik>Dört adımda stajyer almak</Baslik>
        <div className="space-y-5">
          <Adim no={1} baslik="Kaç kişiye, hangi bölümden ihtiyacınız olduğunu belirleyin">
            <p>
              Stajyerin yapacağı işi bir cümleyle yazabiliyorsanız hazırsınız demektir.
              Belirsiz bir "yardımcı olsun" tanımı hem sizi hem öğrenciyi zorlar.
            </p>
          </Adim>

          <Adim no={2} baslik="Öğrencinin okulundan gelen belgeyi isteyin">
            <p>
              Zorunlu stajda öğrenci, okulunun hazırladığı staj formunu getirir. Bu belge
              stajın müfredat kapsamında olduğunu ve okulun süreçte taraf olduğunu gösterir.
              Formu imzalamadan staja başlatmayın.
            </p>
          </Adim>

          <Adim no={3} baslik="Sigorta yükümlülüğünün kimde olduğunu okulla teyit edin">
            <p>
              İşverenlerin en çok yanıldığı nokta burası.{' '}
              <strong className="text-gray-900">
                Zorunlu stajda öğrencinin iş kazası ve meslek hastalığı sigortası genellikle
                okul tarafından yapılır ve primi okul öder.
              </strong>{' '}
              Yani "stajyer alırsam SGK maliyeti çıkar" endişesi çoğu durumda yersizdir.
            </p>
            <p>
              Ama bu her durumda böyle değil: gönüllü stajda ve bazı program türlerinde
              yükümlülük değişiyor. Öğrencinin okulunun staj biriminden{' '}
              <strong className="text-gray-900">yazılı olarak</strong> teyit alın — tek bir
              e-posta yeterli.
            </p>
          </Adim>

          <Adim no={4} baslik="Ücret yükümlülüğünüzü kontrol edin">
            <p>
              3308 sayılı Mesleki Eğitim Kanunu kapsamındaki stajlarda öğrenciye ücret
              ödenmesi zorunludur. Ödenecek tutar asgari ücrete endekslidir ve{' '}
              <strong className="text-gray-900">işletmenizdeki personel sayısına göre
              değişir</strong>; belirli bir kısmı için devlet katkısı bulunur.
            </p>
            <p>
              Oranlar ve tutarlar her yıl güncellendiği için burada rakam vermiyoruz.
              Güncel değerler için:{' '}
              <Kaynak href="https://www.sgk.gov.tr">SGK</Kaynak>,{' '}
              <Kaynak href="https://www.meb.gov.tr">MEB</Kaynak> ve{' '}
              <Kaynak href="https://www.iskur.gov.tr">İŞKUR</Kaynak>. Öğrencinin okulunun staj
              birimi de o yılın tutarını size söyleyebilir.
            </p>
          </Adim>
        </div>

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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Şirketimi bul
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
      </main>
    </div>
  );
};
