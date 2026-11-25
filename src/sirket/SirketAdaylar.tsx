import React from 'react';
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { fetchArayanOgrenciler, type ArayanListesi, type ArayanOgrenci } from '../lib/queries';
import { ProfilFotografi } from '../components/sosyal/ProfilFotografi';
import { secenekler, suzgeceUyar } from '../lib/basvuran-suzgecleri.mjs';
import { uygunAdaylar } from '../lib/aday-uygunlugu.mjs';
import { adayBaglantilari } from '../lib/aday-profil-farki.mjs';
import {
  ALAN,
  IKINCIL_DUGME,
  SIRKET_KENAR,
  SIRKET_KENAR_GUCLU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  SIRKET_ZEMIN,
  alanStil,
  ikincilStil,
} from './renk';

/** "İlanıma uygun" seçimi için ilanın gereken alanları. */
export type AdayIlani = { id: string; title: string; city?: string | null; work_type?: string | null };
type Uygunluk = { puan: number; sozcukler: string[]; sehir: boolean };

/**
 * ADAYLAR — İŞ / STAJ ARAYAN ÖĞRENCİLER
 *
 * İki ayrı liste, iki ayrı soru: bir öğrenci hem staj hem iş arıyor
 * olabilir ve ikisi aynı ihtiyaç değil.
 *
 * BU LİSTE BİR REKLAM DEĞİL, BİR RIZA
 * -----------------------------------
 * Buradaki her öğrenci profilini kendisi açtı ve açarken neyin
 * paylaşılacağını okudu. Bu yüzden kartta "ne zaman açtı" da yazıyor:
 * altı ay önce açılmış bir arayış, dün açılandan farklıdır ve şirketin
 * bunu bilmesi gerekir.
 *
 * Öğrenci anahtarı kapattığı anda listeden düşüyor; burada saklanan bir
 * kopya yok.
 *
 * KART IZGARASI (25 Kasım 2026, kullanıcı kararı)
 * -----------------------------------------------
 * Önceki düzen tam genişlikte tek sütunlu satırlar ve alt alta dört
 * büyük açılır menüydü; geniş ekranın çoğu boş kalıyor, şirket aynı
 * anda bir-iki adaydan fazlasını göremiyordu. Şimdi: başlık + kompakt
 * segment, TEK SATIRLIK süzgeç çubuğu, altında telefonda 1 / md 2 /
 * xl 3 sütunlu kartlar. Görsel dil Başvuranlar'ın oyuncu kartıyla
 * (AdayKarti.tsx) aynı aile: renk.ts sabitleri, rounded-2xl kap,
 * rounded-lg beceri hapı, rounded-full sınıf hapı.
 *
 * KARTTA OLMAYANLAR: uygunluk puanı ya da yüzdesi, "staja uygun şu
 * aylar" gibi bir müsaitlik aralığı. İkisi de bu listede veri olarak
 * yok (ArayanOgrenci); çizilseydi uydurulmuş olurdu.
 */

const BOS_ACIKLAMA =
  'Öğrenciler profillerindeki “Staj arıyorum” / “İş arıyorum” anahtarını açtıkça burada görünürler.';

function tarihYaz(deger: string | null): string {
  if (!deger) return '';
  return new Date(deger).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** En fazla üç beceri; kalanı "+N" ile kapanıyor. */
const ETIKET_SINIRI = 3;

const BAGLANTI_IKONU = { github: Github, linkedin: Linkedin, portfolyo: Globe } as const;

const AdayKarti: React.FC<{
  ogrenci: ArayanOgrenci;
  onProfil: (id: string) => void;
  onMesaj: (kullaniciAdi: string) => void;
  /** Seçili ilana uygunluğun nedeni; yalnız ilan seçiliyken. */
  uygunluk?: Uygunluk;
}> = ({ ogrenci, onProfil, onMesaj, uygunluk }) => {
  const beceriler = ogrenci.beceriler ?? [];
  const gorunen = beceriler.slice(0, ETIKET_SINIRI);
  const kalan = beceriler.length - gorunen.length;
  const roller = ogrenci.hedefRoller ?? [];
  const sinif = ogrenci.sinif?.trim() || null;
  const acildi = tarihYaz(ogrenci.acildi);
  /*
    Bağlantı göstergeleri inceleme ekranıyla AYNI süzgeçten
    (`adayBaglantilari`): `javascript:` gibi açılamayacak bir değer
    kartta "Portfolyo" diye görünmüyor. Gösterge, bağlantı değil —
    kartta zaten iki düğme var; adresi profil ekranı açıyor.
  */
  const baglantilar = adayBaglantilari(ogrenci);
  const kimlik: { ikon: typeof GraduationCap; metin: string }[] = [
    { ikon: GraduationCap, metin: ogrenci.okul ?? '' },
    { ikon: BookOpen, metin: ogrenci.bolum ?? '' },
    { ikon: MapPin, metin: ogrenci.sehir ?? '' },
  ].filter((k) => k.metin.trim());

  return (
    <li
      /*
        `h-full flex-col` + düğmelerde `mt-auto`: ızgara satırındaki
        kartlar eşit boyda ve düğmeler aynı çizgide. Beceri ya da rol
        satırı olmayan kart kısa kalıp düğmelerini yukarı çekmiyor.
      */
      className="flex h-full min-w-0 flex-col rounded-2xl border bg-white p-4"
      style={{ borderColor: SIRKET_KENAR }}
    >
      {/*
        ÜST DÜZEN: fotoğraf + ad, altında ikonlu kimlik satırları.
        Kart bir veri kaydı değil, bir kişi: fotoğraf en solda.

        Fotoğraf ORTAK kaynaktan (`ProfilFotografi`, social_profiles
        avatar_path). Aday listesine özel bir avatar alanı açılmadı;
        öğrenci fotoğrafını değiştirince burası da değişiyor.
      */}
      <div className="flex items-start gap-3">
        <ProfilFotografi
          ad={ogrenci.ad ?? ''}
          yol={ogrenci.avatarYolu}
          /* Telefonda 64 px, sm üstünde 80 px — Başvuranlar kartıyla aynı ölçü. */
          className="h-16 w-16 shrink-0 rounded-full sm:h-20 sm:w-20"
        />
        <div className="min-w-0 flex-1">
          {/*
            Ad KESİLMİYOR (truncate değil, break-words): panel telefonda
            okunuyor ve kesilen adın tamamı yalnız hover'da kalırdı.
          */}
          <p className="break-words text-[17px] font-extrabold leading-snug" style={{ color: SIRKET_METIN }}>
            {ogrenci.ad ?? 'ad girilmemiş'}
          </p>
          {sinif && (
            <span
              /*
                Sınıf OLDUĞU GİBİ yazılıyor: değerin kendisi zaten
                "2. Sınıf" ya da "Yüksek Lisans / Mezun". Sonuna "sınıf"
                eklemek "2. Sınıf. sınıf" üretiyordu.

                Hap adın ALTINDA, fotoğrafın üstünde değil: Başvuranlar
                kartında fotoğrafın altına oturuyor ama orada 160 px'lik
                şerit var; burada 64 px'lik fotoğrafın altında "Yüksek
                Lisans / Mezun" kartın kenarından taşardı ya da kesilirdi.
              */
              className="mt-1 inline-block max-w-full break-words rounded-full border px-2 py-0.5 text-[11px] font-bold leading-tight"
              style={{ color: SIRKET_METIN, borderColor: SIRKET_KENAR_GUCLU }}
            >
              {sinif}
            </span>
          )}
          {kimlik.length > 0 && (
            <ul className="mt-1.5 space-y-1 text-[13px] leading-snug" style={{ color: SIRKET_METIN_IKINCIL }}>
              {kimlik.map(({ ikon: Ikon, metin }, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Ikon aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 break-words">{metin}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/*
        BECERİLER: en fazla üç, kalanı "+N". Hepsi yazılınca dört uzun
        etiket kartın yarısını kaplıyordu. Hap biçimi Başvuranlar kartının
        yetenek hapıyla aynı (rounded-lg, gray-300 kenar).
      */}
      {gorunen.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {gorunen.map((b) => (
            <span
              key={b}
              className="max-w-full break-words rounded-lg border px-2 py-0.5 text-xs font-semibold"
              style={{ color: SIRKET_METIN, borderColor: SIRKET_KENAR_GUCLU }}
            >
              {b}
            </span>
          ))}
          {kalan > 0 && (
            <span
              title={beceriler.slice(ETIKET_SINIRI).join(', ')}
              className="rounded-lg px-1.5 py-0.5 text-xs font-bold"
              style={{ color: SIRKET_METIN_IKINCIL }}
            >
              +{kalan}
            </span>
          )}
        </div>
      )}

      {roller.length > 0 && (
        <p className="mt-2 break-words text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          <span className="font-bold">Hedef: </span>
          {roller.join(', ')}
        </p>
      )}

      {uygunluk && (
        <p
          className="mt-3 break-words rounded-lg px-2.5 py-1.5 text-xs font-semibold leading-snug"
          style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
        >
          İlanla eşleşen: {uygunluk.sozcukler.join(', ')}
          {uygunluk.sehir ? ' · aynı şehir' : ''}
        </p>
      )}

      {/*
        BİLGİ ŞERİDİ: "… beri arıyor" kimliğin parçası değil, bir zaman
        bilgisi; ince ayraçla ayrılıp küçük yazılıyor. Göstergeler metinli
        (ikon tek başına bilgi taşımıyor), Başvuranlar kartının alt
        şeridiyle aynı kalıp.
      */}
      {(acildi || ogrenci.mezuniyet || ogrenci.cvVar || baglantilar.length > 0) && (
        <div
          className="mt-3 space-y-1.5 border-t pt-2.5 text-xs font-semibold"
          style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN_IKINCIL }}
        >
          {(acildi || ogrenci.mezuniyet) && (
            <p className="flex items-start gap-1.5">
              <CalendarDays aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                {/* Ek yıla göre değişirdi (2026’dan, 2030’dan); ek gerektirmeyen kalıp. */}
                {acildi && `${acildi} tarihinden beri arıyor`}
                {acildi && ogrenci.mezuniyet ? ' · ' : ''}
                {ogrenci.mezuniyet ? `Mezuniyet ${ogrenci.mezuniyet}` : ''}
              </span>
            </p>
          )}
          {(ogrenci.cvVar || baglantilar.length > 0) && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {ogrenci.cvVar && (
                <span className="inline-flex items-center gap-1">
                  <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-blue-700" />
                  CV var
                </span>
              )}
              {baglantilar.map((b: { tur: string; etiket: string }) => {
                const Ikon = BAGLANTI_IKONU[b.tur as keyof typeof BAGLANTI_IKONU] ?? Globe;
                return (
                  <span key={b.tur} className="inline-flex items-center gap-1">
                    <Ikon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                    {b.etiket}
                  </span>
                );
              })}
            </p>
          )}
        </div>
      )}

      {/*
        ANA EYLEM "Profili incele": işverenin ilk işi adayı tanımak.
        İkincil eylem SİTE İÇİ MESAJ — eskiden `mailto:` idi ve işvereni
        siteden çıkarıyordu: konuşma dışarıda sürüyor, aday kimin
        yazdığını yalnız e-posta başlığından anlıyor, iki taraf da
        yazışmayı panelinde göremiyordu.

        Adres `/mesajlar/<kullaniciadi>`: aynı adayla önceden bir sohbet
        varsa ekran onu açıyor, yoksa yenisini başlatıyor — "aynı iki
        kişi, tek sohbet" kuralı sunucuda (çift tekil indeks).

        KULLANICI ADI YOKSA DÜĞME YOK: adres kurulamaz ve çalışmayan bir
        düğme çizmek, olmayan bir yolu varmış gibi göstermek olurdu.
        E-postaya geri düşülmüyor — istenen şey site içi konuşma.
      */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <button
          type="button"
          onClick={() => onProfil(ogrenci.id)}
          className={`inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-3.5 text-sm font-bold text-white hover:bg-blue-700 ${SIRKET_ODAK}`}
        >
          Profili incele
        </button>
        {ogrenci.kullaniciAdi && (
          <button
            type="button"
            onClick={() => onMesaj(ogrenci.kullaniciAdi as string)}
            className={`${IKINCIL_DUGME} flex-1 gap-1.5 whitespace-nowrap bg-white px-3.5`}
            style={ikincilStil}
          >
            <MessageCircle aria-hidden className="h-3.5 w-3.5" />
            Mesaj gönder
          </button>
        )}
      </div>
    </li>
  );
};

export const SirketAdaylar: React.FC<{
  onNavigate: (yol: string) => void;
  /** Şirketin YAYINDAKİ ilanları ("İlanıma uygun adaylar" seçimi). */
  ilanlar?: AdayIlani[];
  /**
   * Liste okuyucusu. Varsayılan gerçek RPC (`fetchArayanOgrenciler`);
   * yalnız geliştirme fikstürü oturumsuz ızgarayı çizmek için geçiyor.
   */
  yukleyici?: (tur: 'staj' | 'is') => Promise<ArayanListesi>;
}> = ({ onNavigate, ilanlar = [], yukleyici = fetchArayanOgrenciler }) => {
  /*
    BAŞLANGIÇ SEKMESİ ADRESTEN

    Başvuranlar sayfasındaki iki kart `?tur=is` / `?tur=staj` ile
    geliyor: şirket hangi kartı seçtiyse o liste açılıyor. Seçim
    kartta yapılmışken burada yeniden yaptırmak, kartı anlamsız
    kılardı. Parametre yoksa ya da tanınmıyorsa staj — sitenin
    ağırlık merkezi orası.
  */
  const [tur, setTur] = React.useState<'staj' | 'is'>(() => {
    if (typeof window === 'undefined') return 'staj';
    return new URLSearchParams(window.location.search).get('tur') === 'is' ? 'is' : 'staj';
  });
  const [veri, setVeri] = React.useState<ArayanListesi | null>(null);
  const [asama, setAsama] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [hataMetni, setHataMetni] = React.useState<string | null>(null);

  React.useEffect(() => {
    let iptal = false;
    setAsama('yukleniyor');
    yukleyici(tur)
      .then((d) => {
        if (iptal) return;
        setVeri(d);
        setAsama('hazir');
      })
      .catch((e: unknown) => {
        if (iptal) return;
        /*
          Doğrulanmamış şirket için AYRI cevap: "bir şey ters gitti"
          demek yanlış olurdu — sorun istekte değil yetkide ve şirketin
          ne yapması gerektiğini bilmesi gerekiyor.
        */
        const mesaj = e instanceof Error ? e.message : '';
        setHataMetni(
          /dogrulanmis|42501/i.test(mesaj)
            ? 'Bu liste yalnızca StajımVar’ın doğruladığı şirketlere açık. Şirketin doğrulanınca burası açılır.'
            : 'Aday listesi yüklenemedi.',
        );
        setAsama('hata');
      });
    return () => {
      iptal = true;
    };
  }, [tur, yukleyici]);

  /*
    SÜZGEÇLER (9 Kasım 2026, rakip analizi #9): bölüm, şehir, sınıf ve
    "İlanıma uygun". Seçenekler listeden türüyor; boş seçenek yok.
    Yatay çip satırı değil, select (süzgeç-çip kararı). Ayrı bir
    "Filtreler" düğmesi de YOK: aynı süzgeç ekranda iki yerde olmaz.
  */
  const [ilanId, setIlanId] = React.useState('');
  const [suzgec, setSuzgec] = React.useState({ bolum: '', sinif: '', sehir: '' });
  const tumu = veri?.ogrenciler ?? [];
  const seciliIlan = ilanlar.find((i) => i.id === ilanId);
  const alanSecenekleri = {
    bolum: secenekler(tumu, 'bolum'),
    sinif: secenekler(tumu, 'sinif'),
    sehir: secenekler(tumu, 'sehir'),
  };
  const suzulen = tumu.filter((o) => suzgeceUyar(o, suzgec));
  const satirlar: { ogrenci: ArayanOgrenci; uygunluk?: Uygunluk }[] = seciliIlan
    ? uygunAdaylar(seciliIlan, suzulen).map((x: { aday: ArayanOgrenci; uygunluk: Uygunluk }) => ({
        ogrenci: x.aday,
        uygunluk: x.uygunluk,
      }))
    : suzulen.map((o) => ({ ogrenci: o }));
  const suzgecVar = !!ilanId || Object.values(suzgec).some(Boolean);
  const ogrenciler = satirlar.map((x) => x.ogrenci);
  const temizle = () => {
    setIlanId('');
    setSuzgec({ bolum: '', sinif: '', sehir: '' });
  };
  const sekmeler = [
    { deger: 'staj' as const, etiket: 'Staj arıyor', adet: veri?.stajArayan, ikon: GraduationCap },
    { deger: 'is' as const, etiket: 'İş arıyor', adet: veri?.isArayan, ikon: Briefcase },
  ];

  /* Süzgeç etiketi: küçük, görünür; select'in kendi kenarı ALAN'dan. */
  const etiketSinifi = 'mb-1 block text-xs font-bold';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: SIRKET_METIN }}>
            Adaylar
          </h1>
          <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            Profilini işverenlere açan öğrenciler
          </p>
        </div>
        {/*
          SEGMENT KONTROL — İKİ EŞİT SEÇENEK

          Eskiden iki dev düğme satırı dolduruyordu; kart ızgarası gelince
          başlığın yanında kompakt bir anahtar yeter. `grid-cols-2` kaldı:
          "Staj arıyor" ile "İş arıyor" eşdeğer iki seçim ve genişlik
          içerikten gelseydi farklı boyda görünürlerdi. Telefonda satırı
          dolduruyor (başlığın altına iniyor), sm üstünde içerik kadar.
        */}
        <div
          className="grid w-full grid-cols-2 gap-1 rounded-xl border p-1 sm:w-auto"
          style={{ background: SIRKET_ZEMIN, borderColor: SIRKET_KENAR }}
          role="group"
          aria-label="Arayış türü"
        >
          {sekmeler.map((s) => {
            const Ikon = s.ikon;
            const etkin = tur === s.deger;
            return (
              <button
                key={s.deger}
                type="button"
                onClick={() => setTur(s.deger)}
                aria-pressed={etkin}
                className={`flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${SIRKET_ODAK} ${
                  etkin ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-white'
                }`}
              >
                <Ikon aria-hidden className="h-4 w-4" />
                {s.etiket}
                {s.adet !== undefined && (
                  <span className={`tabular-nums ${etkin ? 'text-blue-100' : 'text-gray-500'}`}>
                    {s.adet}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {asama === 'hazir' && tumu.length > 0 && (
        <div className="rounded-2xl border bg-white p-3" style={{ borderColor: SIRKET_KENAR }}>
          {/*
            TEK SATIR SÜZGEÇ ÇUBUĞU

            lg üstünde dört alan yan yana (`lg:flex`), ilan seçimi biraz
            daha geniş — ilan başlıkları bölüm adlarından uzun. Altında
            iki sütunlu ızgara: telefonda dört kutu alt alta 4 × 44 px +
            etiketler kartları ekranın altına itiyordu.

            `min-w-0` her hücrede: select'in doğal genişliği en uzun
            seçeneğin metni; olmasa 375 px'te uzun bir bölüm adı satırı
            taşırırdı.
          */}
          <div className="grid grid-cols-2 gap-2 lg:flex lg:items-end">
            {ilanlar.length > 0 && (
              <label className="col-span-2 block min-w-0 lg:flex-[1.6]">
                <span className={etiketSinifi} style={{ color: SIRKET_METIN_IKINCIL }}>
                  İlanıma uygun adaylar
                </span>
                <select
                  value={ilanId}
                  onChange={(e) => setIlanId(e.target.value)}
                  className={`${ALAN} min-w-0`}
                  style={alanStil}
                >
                  <option value="">İlan seçilmedi</option>
                  {ilanlar.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(
              [
                ['bolum', 'Bölüm', 'Tüm bölümler'],
                ['sinif', 'Sınıf', 'Tüm sınıflar'],
                ['sehir', 'Şehir', 'Tüm şehirler'],
              ] as const
            ).map(([alan, etiket, hepsi]) =>
              alanSecenekleri[alan].length > 0 ? (
                <label key={alan} className="block min-w-0 lg:flex-1">
                  <span className={etiketSinifi} style={{ color: SIRKET_METIN_IKINCIL }}>
                    {etiket}
                  </span>
                  <select
                    value={suzgec[alan]}
                    onChange={(e) => setSuzgec((o) => ({ ...o, [alan]: e.target.value }))}
                    aria-label={`${etiket} süzgeci`}
                    className={`${ALAN} min-w-0`}
                    style={alanStil}
                  >
                    <option value="">{hepsi}</option>
                    {alanSecenekleri[alan].map((d: string) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null,
            )}
            {suzgecVar && (
              <button
                type="button"
                onClick={temizle}
                className={`col-span-2 inline-flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl px-3 text-sm font-bold underline-offset-2 hover:underline lg:col-span-1 lg:shrink-0 ${SIRKET_ODAK}`}
                style={{ color: SIRKET_VURGU_KOYU }}
              >
                Süzgeçleri temizle
              </button>
            )}
          </div>
          {seciliIlan && (
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
              Uygunluk, ilan başlığındaki sözcüklerin adayın hedef rolleri, becerileri ya da bölümüyle
              eşleşmesinden çıkıyor; aynı şehir sıralamayı öne alıyor.
            </p>
          )}
        </div>
      )}

      {asama === 'yukleniyor' && (
        /*
          İskelet kartlar ızgaranın kendisiyle aynı düzende: liste gelince
          sayfa zıplamıyor. İçinde metin ya da sayı yok — yalnız kutu.
        */
        <div aria-busy="true" aria-label="Adaylar yükleniyor" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-56 animate-pulse rounded-2xl border bg-gray-50 ${i > 0 ? 'hidden md:block' : ''} ${i > 1 ? 'md:hidden xl:block' : ''}`}
              style={{ borderColor: SIRKET_KENAR }}
            />
          ))}
        </div>
      )}

      {asama === 'hata' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm font-semibold text-amber-900">{hataMetni}</p>
        </div>
      )}

      {asama === 'hazir' && (
        ogrenciler.length ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {satirlar.map(({ ogrenci: o, uygunluk }) => (
              <AdayKarti
                key={o.id}
                ogrenci={o}
                uygunluk={uygunluk}
                onProfil={(id) => onNavigate(`/sirket/aday/${id}`)}
                onMesaj={(ad) => onNavigate(`/mesajlar/${encodeURIComponent(ad)}`)}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border bg-white p-6 text-center" style={{ borderColor: SIRKET_KENAR }}>
            <p className="font-bold" style={{ color: SIRKET_METIN }}>
              {suzgecVar && tumu.length
                ? 'Bu seçime uyan aday yok'
                : tur === 'staj' ? 'Staj arayan öğrenci yok' : 'İş arayan öğrenci yok'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
              {suzgecVar && tumu.length ? 'Süzgeçleri gevşetmeyi ya da başka bir ilan seçmeyi dene.' : BOS_ACIKLAMA}
            </p>
          </div>
        )
      )}

      {asama === 'hazir' && ogrenciler.length > 0 && (
        <p
          className="rounded-xl border bg-white px-3 py-2.5 text-[11px] leading-relaxed"
          style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN_IKINCIL }}
        >
          Yalnızca işverenlere görünmeyi açan öğrenciler listelenir.
        </p>
      )}
    </div>
  );
};
