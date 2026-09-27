import React from 'react';
import { Briefcase, FileText, GraduationCap, Mail } from 'lucide-react';
import { fetchArayanOgrenciler, type ArayanListesi, type ArayanOgrenci } from '../lib/queries';
import { ProfilFotografi } from '../components/sosyal/ProfilFotografi';

/**
 * ADAYLAR — İŞ / STAJ ARAYAN ÖĞRENCİLER
 *
 * İki ayrı liste, iki ayrı soru: bir öğrenci hem staj hem iş arıyor
 * olabilir ve ikisi aynı ihtiyaç değil.
 *
 * BU LİSTE BİR REKLAM DEĞİL, BİR RIZA
 * -----------------------------------
 * Buradaki her öğrenci profilini kendisi açtı ve açarken neyin
 * paylaşılacağını okudu. Bu yüzden satırda "ne zaman açtı" da yazıyor:
 * altı ay önce açılmış bir arayış, dün açılandan farklıdır ve şirketin
 * bunu bilmesi gerekir.
 *
 * Öğrenci anahtarı kapattığı anda listeden düşüyor; burada saklanan bir
 * kopya yok.
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

const Rozet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
    {children}
  </span>
);

/** En fazla üç etiket; kalanı "+N" ile kapanıyor. */
const ETIKET_SINIRI = 3;

const AdaySatiri: React.FC<{
  ogrenci: ArayanOgrenci;
  onProfil: (id: string) => void;
}> = ({ ogrenci, onProfil }) => {
  const roller = ogrenci.hedefRoller ?? [];
  const gorunen = roller.slice(0, ETIKET_SINIRI);
  const kalan = roller.length - gorunen.length;

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4">
      {/*
        ÜST DÜZEN: fotoğraf + ad, altında okul · bölüm, altında sınıf · şehir.
        Kart bir veri kaydı değil, bir kişi: fotoğraf en solda ve kimlik
        satırları onun yanında iniyor.

        Fotoğraf ORTAK kaynaktan (`ProfilFotografi`, social_profiles
        avatar_path). Aday listesine özel bir avatar alanı açılmadı;
        öğrenci fotoğrafını değiştirince burası da değişiyor.
      */}
      <div className="flex items-start gap-3">
        <ProfilFotografi
          ad={ogrenci.ad ?? ''}
          yol={ogrenci.avatarYolu}
          /* Mobilde 56 px, sm üstünde 64 px; yuvarlak. */
          className="h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-gray-900">
            {ogrenci.ad ?? 'ad girilmemiş'}
          </p>
          {(ogrenci.okul || ogrenci.bolum) && (
            <p className="mt-0.5 truncate text-sm text-gray-600">
              {[ogrenci.okul, ogrenci.bolum].filter(Boolean).join(' · ')}
            </p>
          )}
          {(ogrenci.sinif || ogrenci.sehir) && (
            <p className="mt-0.5 truncate text-[13px] text-gray-500">
              {/*
                Sınıf OLDUĞU GİBİ yazılıyor: değerin kendisi zaten
                "2. Sınıf" ya da "Yüksek Lisans / Mezun". Sonuna "sınıf"
                eklemek "2. Sınıf. sınıf" üretiyordu.
              */}
              {[ogrenci.sinif, ogrenci.sehir].filter(Boolean).join(' · ')}
            </p>
          )}
          {/*
            "… beri arıyor" İKİNCİL: kimliğin parçası değil, bir zaman
            bilgisi. Daha küçük ve soluk, kimlik satırlarının altında.
          */}
          {ogrenci.acildi && (
            <p className="mt-1 text-[11px] text-gray-400">
              {tarihYaz(ogrenci.acildi)}’den beri arıyor
            </p>
          )}
        </div>
      </div>

      {/*
        ETİKETLER SADELEŞTİ: en fazla üç, kalanı "+N". Önce hepsi
        yazılıyordu ve dört uzun etiket kartın yarısını kaplıyordu.
      */}
      {gorunen.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {gorunen.map((r) => (
            <span
              key={r}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
            >
              {r}
            </span>
          ))}
          {kalan > 0 && (
            <span
              title={roller.slice(ETIKET_SINIRI).join(', ')}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500"
            >
              +{kalan}
            </span>
          )}
        </div>
      )}

      {/*
        ANA EYLEM "Profili incele": işverenin ilk işi adayı tanımak.
        E-posta ikincil kaldı — mevcut akış değişmedi, yalnız ağırlığı
        azaldı (dolu düğme değil, kenarlıklı).
      */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onProfil(ogrenci.id)}
          className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          Profili incele
        </button>
        {ogrenci.eposta && (
          <a
            href={`mailto:${ogrenci.eposta}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            <Mail aria-hidden className="h-3.5 w-3.5" />
            E-posta gönder
          </a>
        )}
      </div>

      {ogrenci.cvVar && (
        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-gray-500">
          <FileText aria-hidden className="h-3 w-3" />
          CV yüklü
        </p>
      )}
    </li>
  );
};

export const SirketAdaylar: React.FC<{
  onNavigate: (yol: string) => void;
}> = ({ onNavigate }) => {
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
    fetchArayanOgrenciler(tur)
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
  }, [tur]);

  const ogrenciler = veri?.ogrenciler ?? [];
  const sekmeler = [
    { deger: 'staj' as const, etiket: 'Staj arıyor', adet: veri?.stajArayan, ikon: GraduationCap },
    { deger: 'is' as const, etiket: 'İş arıyor', adet: veri?.isArayan, ikon: Briefcase },
  ];

  return (
    <div className="space-y-4">
      {/*
        İKİ SEKME SATIRI DOLDURUYOR

        Önce içerik genişliğindeydiler ve sağda geniş bir boşluk
        kalıyordu; iki eşit kutu olması gerekirken ikisi de küçük
        görünüyordu (kullanıcı bildirdi, 27 Eylül 2026).

        `grid-cols-2`: ikisi EŞİT ve satırı dolduruyor. Genişlik içerikten
        gelseydi "Staj arıyor" ile "İş arıyor" farklı boyda olurdu ve
        eşdeğer iki seçim eşdeğer görünmezdi.
      */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Arayış türü">
        {sekmeler.map((s) => {
          const Ikon = s.ikon;
          const etkin = tur === s.deger;
          return (
            <button
              key={s.deger}
              type="button"
              onClick={() => setTur(s.deger)}
              aria-pressed={etkin}
              className={`flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
                etkin
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
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

      {asama === 'yukleniyor' && (
        <div className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />
      )}

      {asama === 'hata' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm font-semibold text-amber-900">{hataMetni}</p>
        </div>
      )}

      {asama === 'hazir' && (
        ogrenciler.length ? (
          <ul className="space-y-3">
            {ogrenciler.map((o) => (
              <AdaySatiri
                key={o.id}
                ogrenci={o}
                onProfil={(id) => onNavigate(`/sirket/aday/${id}`)}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <p className="font-bold text-gray-900">
              {tur === 'staj' ? 'Staj arayan öğrenci yok' : 'İş arayan öğrenci yok'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-gray-600">
              {BOS_ACIKLAMA}
            </p>
          </div>
        )
      )}

      {asama === 'hazir' && ogrenciler.length > 0 && (
        <p className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-gray-500">
          Yalnızca işverenlere görünmeyi açan öğrenciler listelenir.
        </p>
      )}
    </div>
  );
};
