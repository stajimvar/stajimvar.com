import React from 'react';
import { ISVEREN_SSS } from '../data/isveren-sss';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  SIRKET_KENAR,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
} from '../sirket/renk';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../lib/renk-token';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { sayfaMetaAyarla } from '../lib/sayfa-meta';

/**
 * İşveren giriş sayfası.
 *
 * NEDEN YENİ SAYFA
 * ----------------
 * /isveren bir "stajyer nasıl alınır" rehberiydi: mevzuat, sigorta, evrak.
 * İçerik iyi ve arama motoru için değerli — ama bir İK çalışanı buraya
 * geldiğinde "ne yapabiliyorum, nereden başlıyorum" sorusunun cevabını üç
 * ekran aşağıda buluyordu. Rehber /stajyer-nasil-alinir adresinde duruyor
 * ve buradan bağlantılı; /isveren artık ürünün kapısı.
 *
 * PAZARLAMA ÇÖPLÜĞÜ DEĞİL
 * -----------------------
 * Sahte müşteri logosu, uydurma "10.000 şirket güveniyor" satırı ve
 * yıldızlı yorum yok. Sayı gösteriliyorsa veritabanından geliyor; veri
 * gelmezse satır hiç çizilmiyor.
 *
 * AKIŞ DÜRÜST ANLATILIYOR
 * -----------------------
 * "Şirket hesabı" diye ayrı bir kayıt yok: kişi kendi adına kayıt oluyor,
 * sonra şirketini sahipleniyor. Bunu gizleyip "şirket hesabı aç" demek,
 * kullanıcıyı beklemediği bir ekrana düşürürdü. Üç adım açıkça yazıyor.
 */

const Bolum: React.FC<{
  baslik: string;
  aciklama?: string;
  children: React.ReactNode;
}> = ({ baslik, aciklama, children }) => (
  <section className="space-y-4">
    <div className="space-y-1.5">
      <h2 className="text-xl font-black tracking-tight text-gray-900 sm:text-2xl">{baslik}</h2>
      {aciklama && <p className="max-w-2xl text-sm leading-relaxed text-gray-600">{aciklama}</p>}
    </div>
    {children}
  </section>
);

const Kart: React.FC<{
  ikon: React.ReactNode;
  baslik: string;
  children: React.ReactNode;
}> = ({ ikon, baslik, children }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5">
    <span
      className="mb-3 grid h-10 w-10 place-items-center rounded-xl"
      style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
    >
      {ikon}
    </span>
    <h3 className="font-extrabold text-gray-900">{baslik}</h3>
    <p className="mt-1 text-sm leading-relaxed text-gray-600">{children}</p>
  </div>
);

export const IsverenLanding: React.FC<{
  onNavigate: (path: string) => void;
  /** İşveren metinleriyle açılan giriş/kayıt penceresi. */
  onIsverenGirisi?: (kip: 'login' | 'register') => void;
  /** Giriş yapmış ve bir şirkete üye olan kullanıcı doğrudan panele gider. */
  sirketUyesiMi: boolean;
}> = ({ onNavigate, onIsverenGirisi, sirketUyesiMi }) => {
  React.useEffect(
    () =>
      sayfaMetaAyarla({
        baslik: 'İşverenler için | StajımVar',
        aciklama:
          'Staj ilanınızı oluşturun, şirket profilinizi güçlendirin ve doğru öğrencilere ulaşın. İlan vermek ücretsiz.',
        yol: '/isveren',
      }),
    []
  );

  const anaEylem = () => {
    if (sirketUyesiMi) return onNavigate('/sirket/ilanlar');
    if (onIsverenGirisi) return onIsverenGirisi('register');
    onNavigate('/isveren/ilan-ver');
  };

  return (
    <main
      className={`w-full ${SAYFA_GENISLIGI} mx-auto space-y-10 px-4 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10 lg:px-8 lg:pb-16 sm:space-y-14`}
    >
      {/* ------------------------------------------------------------ hero */}
      <header className="space-y-5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ borderColor: SIRKET_KENAR, background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
        >
          <Building2 className="h-3.5 w-3.5" />
          İşverenler için
        </span>

        <h1 className="max-w-3xl text-3xl font-black leading-[1.1] tracking-tight text-gray-950 sm:text-5xl">
          Doğru stajyeri daha kolay bulun.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
          Staj ilanınızı iki dakikada oluşturun, şirket profilinizi güçlendirin ve staj arayan
          öğrencilere doğrudan ulaşın. İlan vermek ücretsiz.
        </p>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/*
            BİRİNCİL EYLEM MARKA MAVİSİ

            Buradaki düğme #25D366 (WhatsApp yeşili) zeminliydi. O renk
            işveren PANELİNİN alt teması (src/sirket/renk.ts) ve orada
            yerinde duruyor — panelin kendi kabuğu, kendi başlığı var.

            Bu sayfa ise halka açık ve ÖĞRENCİ başlığını taşıyor.
            Ölçüldü (canlı, 1440px): mavi logo ve mavi "Kayıt Ol"
            düğmesiyle aynı ekranda duran yeşil ana eylem, sayfayı başka
            bir ürünmüş gibi gösteriyordu.

            Kontrast düşmedi: beyaz yazı / #2563EB = 5.12:1, hover
            #1D4ED8 ile 6.65:1. Önceki düzen 8.35:1'di — ikisi de AA
            eşiğinin (4.5) üstünde.

            Yumuşak yeşil rozetler kaldı: onlar eylem değil, işveren
            alanının işareti.
          */}
          <button type="button" onClick={anaEylem} className={BIRINCIL_EYLEM}>
            {sirketUyesiMi ? 'Şirket paneline git' : 'Ücretsiz şirket hesabı oluştur'}
            <ArrowRight className="h-4 w-4" />
          </button>
          {!sirketUyesiMi && (
            <button
              type="button"
              onClick={() => (onIsverenGirisi ? onIsverenGirisi('login') : onNavigate('/isveren/ilan-ver'))}
              className={`inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`}
            >
              Şirket girişi
            </button>
          )}
        </div>

        {/*
          HAVUZ SAYILARI ŞİMDİLİK GÖSTERİLMİYOR

          Burada "Staj arayan öğrenci / En çok bölüm / En çok şehir"
          üçlüsü duruyordu ve sayılar gerçekten veritabanından geliyordu.
          Sorun rakamın doğruluğu değil, bu boydaki rakamın işverene ne
          anlattığı: havuz daha küçükken "11 öğrenci" ve tek bir bölüm
          adı, ilan vermeye ikna eden değil caydıran bir kanıt oluyor.
          Sayı boşken susmak, küçükken bağırmaktan iyi.

          Geri getirmek zor değil: `fetchTalentPoolStats` ve
          `TalentPoolStat` yerinde duruyor (bkz. src/lib/queries).
          Havuz anlamlı bir büyüklüğe geldiğinde bu blok, bir alt sınır
          eşiğiyle birlikte geri konabilir.
        */}
      </header>

      {/* ------------------------------------------------- nasıl çalışır */}
      <Bolum
        baslik="Nasıl çalışır?"
        aciklama="Ayrı bir şirket kaydı yok: kendi adınıza hesap açıyor, sonra şirketinizi sahipleniyorsunuz. Böylece aynı şirkette birden çok kişi çalışabiliyor."
      >
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            ['Hesap açın', 'Kurumsal e-postanızla bir dakikada kayıt olun. Kredi kartı istenmiyor.'],
            [
              'Şirketinizi sahiplenin',
              'Şirketinizin StajımVar’da sayfası zaten olabilir — ilanları kariyer sayfanızdan derliyoruz. Sayfayı bulup yetkili olduğunuzu bildirin.',
            ],
            [
              'İlanınızı yayınlayın',
              'Panel açıldığında ilanı kendiniz giriyor, kendiniz kapatıyorsunuz.',
            ],
          ].map(([baslik, govde], i) => (
            <li key={baslik} className="rounded-2xl border border-gray-200 bg-white p-5">
              {/*
                Adım numarası da birincil vurgu: sayfadaki en dikkat çeken
                üç yeşil kutu buydu. Beyaz rakam / #2563EB = 5.12:1.
              */}
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-extrabold text-gray-900">{baslik}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{govde}</p>
            </li>
          ))}
        </ol>
      </Bolum>

      {/* ------------------------------------------------ neden StajımVar */}
      <Bolum baslik="Neden StajımVar?">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Kart ikon={<FileText className="h-5 w-5" />} baslik="Staja özel ilan formu">
            Genel iş ilanı formu değil. Zorunlu/gönüllü staj, süre, haftalık gün ve sigorta gibi
            stajın kendi soruları var; kırk alanlık form yok.
          </Kart>
          <Kart ikon={<Users className="h-5 w-5" />} baslik="Doğru öğrenciye ulaşın">
            İlanınız bölüm sayfalarında ve öğrencinin kendi profiline göre eşleşen listelerde
            görünüyor.
          </Kart>
          <Kart ikon={<Building2 className="h-5 w-5" />} baslik="Şirket profili">
            Logo, sektör, konum, büyüklük ve tanıtım metniniz tek sayfada. Öğrenci ilana
            bakmadan önce şirketi tanıyor.
          </Kart>
          <Kart ikon={<ShieldCheck className="h-5 w-5" />} baslik="Doğrulama">
            Kurumsal e-posta ve VKN ile doğrulanan şirketler rozet alıyor. Doğrulanmamış hiçbir
            şirkete rozet gösterilmiyor.
          </Kart>
          <Kart ikon={<Lock className="h-5 w-5" />} baslik="Öğrenci verisi korunuyor">
            İlan vermek öğrenci bilgisi görmek demek değil. Aday kartları yalnızca doğrulanmış
            şirkete ve yalnızca öğrenci paylaşıma izin verdiyse açılıyor.
          </Kart>
          <Kart ikon={<Sparkles className="h-5 w-5" />} baslik="Ücretsiz">
            İlan paketi, kontenjan ya da abonelik yok. İlan vermek ücretsiz.
          </Kart>
          <Kart ikon={<Users className="h-5 w-5" />} baslik="Aday süreci panelde">
            Başvuru panele düşüyor: adayın özgeçmişini görüyor, durumunu
            güncelliyor, görüşmeye davet ediyor ve teklif gönderiyorsunuz. Öğrenci
            aynı süreci kendi tarafında adım adım izliyor.
          </Kart>
        </div>
      </Bolum>

      {/* -------------------------------------------------------- güven */}
      <Bolum
        baslik="Öğrenci verisine yaklaşımımız"
        aciklama="Bu kuralları burada yazıyoruz çünkü şirket tarafında ne yapabileceğinizi bilmek, sonradan öğrenmekten iyi."
      >
        <ul className="space-y-2.5">
          {[
            'İlan asmak ile öğrenci bilgisi görmek ayrı iki yetki. İlan verebilirsiniz; aday kartları doğrulama sonrası açılıyor.',
            'Öğrencinin profili ve özgeçmişi size yalnızca sizin ilanınıza başvurduğunda ve başvuru sırasında bunu onayladığında ulaşıyor. Başka şirketin ilanına yapılan başvuruyu göremezsiniz.',
            'Başvuruya bağlanan kopyada e-posta ve telefon yok. İletişim bilgileri yalnızca teklifinizi öğrenci kabul ettiğinde ve karşılıklı açılıyor.',
            'Başvurmamış öğrencilerin listesi diye bir ekran yok.',
            'Şahıs şirketlerinden TC kimlik numarası istenmiyor; doğrulama için VKN yeterli.',
          ].map((satir) => (
            <li key={satir} className="flex gap-2.5 text-sm leading-relaxed text-gray-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {satir}
            </li>
          ))}
        </ul>
      </Bolum>

      {/* ---------------------------------------------------------- SSS */}
      {/*
        Aynı liste ön render'da FAQPage yapısal verisine çevriliyor. Metin
        tek yerde duruyor: arama motoruna sayfada olmayan bir cevap
        göstermek gizleme sayılırdı.
      */}
      <Bolum baslik="Sıkça sorulanlar">
        <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {ISVEREN_SSS.map(({ soru, cevap }) => (
            <details key={soru} className="group p-5">
              {/*
                SSS BAŞLIKLARI KLAVYEYLE GÖRÜNÜR

                `<summary>` odaklanabilir bir öğe ama burada hiç odak
                stili yoktu ve tarayıcının varsayılanına düşüyordu.
                Ölçüldü (canlı, 1440px): 0.8 piksel, #E59700, sayfa
                zemininde 2.29:1 — WCAG'ın metin dışı öğeler için
                istediği 3:1'in altında. Klavyeyle gezen kişi sekiz
                başlık arasında nerede olduğunu göremiyordu.
              */}
              <summary
                className={`cursor-pointer list-none font-extrabold text-gray-900 marker:hidden rounded-md ${ODAK_HALKASI}`}
              >
                {soru}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{cevap}</p>
            </details>
          ))}
        </div>
      </Bolum>

      {/* ------------------------------------------------------- rehber */}
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-7">
        <h2 className="text-lg font-extrabold text-gray-900">
          Stajyer almayı ilk kez düşünüyorsanız
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-600">
          Sigortayı kim yapar, ücret ödemek zorunlu mu, üniversiteyle hangi evrak imzalanır —
          işveren rehberi bu soruları sırayla cevaplıyor. Güncel oran ve tutarlar için resmî
          kaynaklara yönlendiriyoruz.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/stajyer-nasil-alinir')}
          className={`mt-4 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${ODAK_HALKASI}`}
        >
          İşveren rehberini aç
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      {/* --------------------------------------------------- kapanış CTA */}
      <section
        className="rounded-2xl border p-6 text-center sm:p-9"
        style={{ borderColor: SIRKET_KENAR, background: SIRKET_ROZET }}
      >
        <h2 className="text-xl font-black tracking-tight text-gray-950 sm:text-2xl">
          İlanınızı bugün yayınlayın
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-gray-700">
          Hesap açmak bir dakika, ilan girmek iki dakika sürüyor.
        </p>
        {/* Sayfanın alt tekrarı; üsttekiyle aynı kalıp, aynı renk. */}
        <button type="button" onClick={anaEylem} className={`mt-5 ${BIRINCIL_EYLEM}`}>
          {sirketUyesiMi ? 'Şirket paneline git' : 'Ücretsiz şirket hesabı oluştur'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </main>
  );
};
