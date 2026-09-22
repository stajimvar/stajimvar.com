import React from 'react';
import { Briefcase, FileText, GraduationCap, Mail } from 'lucide-react';
import { fetchArayanOgrenciler, type ArayanListesi, type ArayanOgrenci } from '../lib/queries';

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
  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
    {children}
  </span>
);

const AdaySatiri: React.FC<{ ogrenci: ArayanOgrenci }> = ({ ogrenci }) => (
  <li className="rounded-2xl border border-gray-200 bg-white p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-sm font-bold text-gray-900">{ogrenci.ad ?? 'ad girilmemiş'}</p>
      {ogrenci.acildi && (
        <span className="text-[11px] text-gray-500">{tarihYaz(ogrenci.acildi)}’den beri arıyor</span>
      )}
    </div>

    <p className="mt-0.5 text-sm text-gray-600">
      {[ogrenci.okul, ogrenci.bolum].filter(Boolean).join(' · ') || 'okul bilgisi yok'}
    </p>
    <p className="mt-0.5 text-[13px] text-gray-500">
      {[ogrenci.sinif ? `${ogrenci.sinif}. sınıf` : null, ogrenci.sehir].filter(Boolean).join(' · ')}
    </p>

    {ogrenci.hedefRoller && ogrenci.hedefRoller.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ogrenci.hedefRoller.slice(0, 5).map((r) => (
          <span key={r} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
            {r}
          </span>
        ))}
      </div>
    )}

    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      {ogrenci.eposta && (
        <a
          href={`mailto:${ogrenci.eposta}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-sm font-bold text-white hover:bg-emerald-700"
        >
          <Mail aria-hidden className="h-3.5 w-3.5" />
          E-posta gönder
        </a>
      )}
      {ogrenci.cvVar && (
        <Rozet>
          <FileText aria-hidden className="mr-1 h-3 w-3" />
          CV yüklü
        </Rozet>
      )}
      {ogrenci.linkedin && (
        <a
          href={ogrenci.linkedin}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 hover:underline"
        >
          LinkedIn
        </a>
      )}
    </div>
  </li>
);

export const SirketAdaylar: React.FC = () => {
  const [tur, setTur] = React.useState<'staj' | 'is'>('staj');
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
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Arayış türü">
        {sekmeler.map((s) => {
          const Ikon = s.ikon;
          const etkin = tur === s.deger;
          return (
            <button
              key={s.deger}
              type="button"
              onClick={() => setTur(s.deger)}
              aria-pressed={etkin}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-colors ${
                etkin
                  ? 'bg-emerald-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Ikon aria-hidden className="h-4 w-4" />
              {s.etiket}
              {s.adet !== undefined && (
                <span className={`tabular-nums ${etkin ? 'text-emerald-100' : 'text-gray-500'}`}>
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
              <AdaySatiri key={o.id} ogrenci={o} />
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
          Buradaki öğrenciler profillerini kendileri bu listeye açtı ve neyin
          paylaşılacağını okudu. Anahtarı kapattıkları anda listeden düşerler.
        </p>
      )}
    </div>
  );
};
