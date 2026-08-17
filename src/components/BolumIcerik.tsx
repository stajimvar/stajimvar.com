import React from 'react';
import { OKUL_YERLESTIRIR, type Bolum } from '../data/bolumler';

/**
 * Bölüm sayfasının İÇERİĞİ — kabuğu değil.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Bu ağaç iki yerde birden çiziliyor:
 *   1. tarayıcıda, BolumPage içinde (kullanıcının gördüğü sayfa)
 *   2. derleme sırasında, scripts/onrender.mjs içinde React'in sunucu
 *      çizicisiyle (tarayıcıların gördüğü statik HTML)
 *
 * Tek kaynak olması şart. Ön render ayrı bir "özet" üretseydi iki metin
 * zamanla birbirinden ayrılırdı ve fark, Google'ın gizleme (cloaking)
 * dediği şeye dönerdi. Aynı bileşeni çalıştırınca ikisi tanım gereği aynı.
 *
 * Bu yüzden burada hiçbir şey etkileşimli değil: durum yok, olay yok, ikon
 * yok. Düğme gibi görünen tek şey gerçek bir `<a href>` — tarayıcı bağlantı
 * olarak sayıyor, BolumPage tıklamayı yakalayıp uygulama içinde açıyor.
 *
 * Kabuk (başlık çubuğu, geri düğmesi, yan sütun) BolumPage'de kalıyor.
 */

const Blok: React.FC<{ baslik: string; maddeler: string[] }> = ({ baslik, maddeler }) => (
  <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-2">
    <h2 className="font-bold text-gray-900">{baslik}</h2>
    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
      {maddeler.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  </section>
);

export const BolumIcerik: React.FC<{ bolum: Bolum }> = ({ bolum }) => {
  const okulYerlestirir = OKUL_YERLESTIRIR.includes(bolum.grup);
  const aramaYolu = `/?q=${encodeURIComponent(bolum.aramaKelimeleri[0])}`;

  return (
    <div className="space-y-4">
      {/*
        Açılış paragrafı özetin yerine değil, önüne geçiyor: özet liste
        satırında da kullanılıyor ve tek cümle. Girişi olmayan bölümlerde
        sayfa eskisi gibi özetle başlıyor.
      */}
      {bolum.giris ? (
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{bolum.giris}</p>
      ) : (
        <p className="text-gray-600 leading-relaxed">{bolum.ozet}</p>
      )}

      <Blok
        baslik={okulYerlestirir ? 'Klinik uygulama nerede yapılıyor' : 'Nerede staj yapılır'}
        maddeler={bolum.nerede}
      />

      {/*
        BAŞLIKLAR SAĞLIK BÖLÜMLERİNDE FARKLI.

        "Bu bölümde staj ararken dikkat et" başlığı hemşirelik öğrencisine
        yanlış bir şey söylüyor: o öğrenci staj aramıyor, okul yerleştiriyor.
        Aynı içeriği aynı başlıkla vermek, sayfanın kime seslendiğini
        bilmediğini gösteriyor.
      */}
      {bolum.pozisyonlar && bolum.pozisyonlar.length > 0 && (
        <Blok
          baslik={
            okulYerlestirir
              ? 'Hangi birimlerde uygulama yapılıyor'
              : 'Sık karşılaşılan staj alanları'
          }
          maddeler={bolum.pozisyonlar}
        />
      )}

      <Blok
        baslik={okulYerlestirir ? 'Öğrenci ne yapıyor' : 'Stajyer ne iş yapar'}
        maddeler={bolum.isler}
      />

      {bolum.dikkat && bolum.dikkat.length > 0 && (
        <Blok
          baslik={
            okulYerlestirir
              ? 'Klinik uygulamada dikkat edilmesi gerekenler'
              : 'Bu bölümde staj ararken dikkat et'
          }
          maddeler={bolum.dikkat}
        />
      )}

      <Blok
        baslik={okulYerlestirir ? 'Uygulamaya başlamadan önce öğren' : 'Başvurmadan önce öğren'}
        maddeler={bolum.hazirlik}
      />
      <Blok
        baslik={okulYerlestirir ? 'Kurumun beklediği şeyler' : 'İlanlarda ne aranıyor'}
        maddeler={bolum.aranan}
      />

      {bolum.cvIpucu && (
        <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-2">
          <h2 className="font-bold text-gray-900">
            {okulYerlestirir ? 'Mezuniyet sonrası için CV' : 'CV ve başvuru'}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{bolum.cvIpucu}</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Genel kurallar için{' '}
            <a
              href="/rehber/staj-cv-nasil-yazilir"
              className="text-blue-600 hover:underline font-semibold"
            >
              staj CV'si rehberine
            </a>{' '}
            ve{' '}
            <a
              href="/rehber/staj-basvuru-epostasi"
              className="text-blue-600 hover:underline font-semibold"
            >
              başvuru e-postası rehberine
            </a>{' '}
            bak.
          </p>
        </section>
      )}

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
        <p className="text-sm font-bold text-blue-900 mb-1">Püf nokta</p>
        <p className="text-sm text-blue-900/90 leading-relaxed">{bolum.ipucu}</p>
      </div>

      {/*
        SIK SORULANLAR

        Aynı liste ön render'da FAQPage yapısal verisine çevriliyor. Burada
        görünmesi şart: yapısal veride olup sayfada olmayan soru, Google'ın
        kurallarına aykırı ve elle ceza sebebi.
      */}
      {bolum.sss && bolum.sss.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-bold text-gray-900">Sık sorulanlar</h2>
          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            {bolum.sss.map((s) => (
              <details key={s.soru} className="group px-4 py-3.5">
                <summary className="cursor-pointer list-none font-semibold text-gray-900 text-sm sm:text-base">
                  {s.soru}
                </summary>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.cevap}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/*
        Sayfanın sonu boş kalmasın: okuyan kişi burada ilanlara geçiyor.
        Bölümün kendi arama kelimesiyle gidiyor, boş listeye düşmesin diye.

        Sağlık bölümlerinde bu düğme yanlış olurdu: hemşirelik ve fizyoterapi
        stajı okulun anlaşmalı hastanesinde yapılıyor, öğrenci ilan aramıyor.
        Orada onun yerine ne yapması gerektiğini söylüyoruz.
      */}
      {okulYerlestirir ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-2">
          <h2 className="font-bold text-gray-900">Bu bölümde staj yeri aranmıyor</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Klinik uygulamanı okulun anlaşmalı olduğu kuruma yerleştiriyor. Yapman gereken,
            okulunun staj birimiyle takvimi ve belgeleri konuşmak. Yine de sektörde ne
            olduğunu görmek istersen ilanlara göz atabilirsin.
          </p>
          <a
            href={aramaYolu}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300"
          >
            Sağlık alanındaki ilanlara bak
          </a>
        </section>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-2">
          <h2 className="font-bold text-gray-900">StajımVar'da bu bölüm için ne yapabilirsin</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            İlanları aracı sitelerden değil, şirketlerin kendi kariyer sayfalarından
            derliyoruz; her ilanda şirketin kendi başvuru bağlantısı var. Aşağıdaki bağlantı
            seni doğrudan bu bölüme uyan ilanlara götürüyor. İlan yoksa da boşuna bekleme:
            bu bölümde stajın çoğu, ilan açmamış şirkete doğrudan yazarak bulunuyor.
          </p>
          <a
            href={aramaYolu}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
          >
            {bolum.ad} staj ilanlarına bak
          </a>
        </section>
      )}

      {bolum.guncelleme && (
        <p className="text-xs text-gray-400">
          Son gözden geçirme:{' '}
          {new Date(bolum.guncelleme).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}
    </div>
  );
};
