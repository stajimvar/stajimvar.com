import React from 'react';
import { ArrowLeft, ExternalLink, FileText, Github, Linkedin, Mail } from 'lucide-react';
import { fetchAdayProfili, type AdayProfili } from '../lib/queries';
import { ProfilFotografi } from '../components/sosyal/ProfilFotografi';
import { SIRKET_KENAR, SIRKET_METIN, SIRKET_METIN_IKINCIL } from './renk';

/**
 * ADAY PROFİLİ — işverenin gördüğü tek öğrenci sayfası.
 *
 * NE GÖSTERİLİYOR, NE GÖSTERİLMİYOR
 * ---------------------------------
 * Alanlar sunucuda tek tek sayılıyor (`aday_profili` RPC) ve öğrencinin
 * anahtarındaki rıza metniyle birebir aynı. Telefon, not ortalaması, CV
 * dosyasının kendisi ve çalışma tercihleri KASITLI olarak yok — o metin
 * bunları saymıyor.
 *
 * Boş alan boş kalıyor: "Belirtilmemiş" gibi bir yer tutucu yazılmıyor.
 * Öğrenci bir alanı doldurmadıysa orada bir şey olduğunu ima etmek
 * yanlış olurdu.
 *
 * ARAYIŞI KAPALI ÖĞRENCİ AÇILMIYOR
 * --------------------------------
 * Sunucu, anahtarı kapalı öğrenci için satır döndürmüyor. Kimliği bilen
 * bir şirket, öğrenci listeden düştükten sonra profili açamıyor.
 */

const KART = 'rounded-2xl border bg-white p-4';

function tarihYaz(deger: string | null): string {
  if (!deger) return '';
  return new Date(deger).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const Bolum: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className={KART} style={{ borderColor: SIRKET_KENAR }}>
    <h2 className="text-sm font-extrabold" style={{ color: SIRKET_METIN }}>
      {baslik}
    </h2>
    <div className="mt-2">{children}</div>
  </section>
);

const Etiketler: React.FC<{ liste: string[] }> = ({ liste }) => (
  <div className="flex flex-wrap gap-1.5">
    {liste.map((x) => (
      <span
        key={x}
        className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
      >
        {x}
      </span>
    ))}
  </div>
);

const DisBaglanti: React.FC<{ adres: string; etiket: string; ikon: React.ReactNode }> = ({
  adres,
  etiket,
  ikon,
}) => (
  <a
    href={adres}
    target="_blank"
    rel="noopener noreferrer nofollow"
    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
  >
    {ikon}
    {etiket}
    <ExternalLink aria-hidden className="h-3.5 w-3.5" />
    <span className="sr-only">(yeni sekmede açılır)</span>
  </a>
);

export const SirketAdayProfili: React.FC<{
  adayId: string;
  onNavigate: (yol: string) => void;
}> = ({ adayId, onNavigate }) => {
  const [aday, setAday] = React.useState<AdayProfili | null>(null);
  const [asama, setAsama] = React.useState<'yukleniyor' | 'hazir' | 'yok' | 'hata'>('yukleniyor');

  React.useEffect(() => {
    let iptal = false;
    setAsama('yukleniyor');
    fetchAdayProfili(adayId)
      .then((a) => {
        if (iptal) return;
        /*
          `null` iki şeyi birden anlatıyor: böyle bir öğrenci yok ya da
          arayışını kapatmış. İkisini ayırt edemiyoruz ve etmeye
          çalışmak, kapatmış bir öğrencinin var olduğunu sızdırırdı.
        */
        setAday(a);
        setAsama(a ? 'hazir' : 'yok');
      })
      .catch(() => {
        if (!iptal) setAsama('hata');
      });
    return () => {
      iptal = true;
    };
  }, [adayId]);

  const geri = (
    <button
      type="button"
      onClick={() => onNavigate('/sirket/adaylar')}
      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
    >
      <ArrowLeft aria-hidden className="h-4 w-4" />
      Adaylar
    </button>
  );

  if (asama === 'yukleniyor') {
    return (
      <div className="space-y-3" aria-busy="true">
        {geri}
        <span className="block h-28 w-full animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (asama === 'hata') {
    return (
      <div className="space-y-3">
        {geri}
        <div className={KART} style={{ borderColor: SIRKET_KENAR }}>
          <p className="font-bold text-rose-800">Profil yüklenemedi</p>
        </div>
      </div>
    );
  }

  if (asama === 'yok' || !aday) {
    return (
      <div className="space-y-3">
        {geri}
        <div className={KART} style={{ borderColor: SIRKET_KENAR }}>
          <p className="font-bold" style={{ color: SIRKET_METIN }}>
            Bu profil görüntülenemiyor
          </p>
          <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            Öğrenci arayış anahtarını kapatmış olabilir. Kapatıldığı anda
            listeden ve profilden düşüyor.
          </p>
        </div>
      </div>
    );
  }

  const roller = aday.hedefRoller ?? [];
  const beceriler = aday.beceriler ?? [];
  const baglantilar = [
    aday.portfolyo && { adres: aday.portfolyo, etiket: 'Portföy', ikon: <ExternalLink aria-hidden className="h-4 w-4" /> },
    aday.linkedin && { adres: aday.linkedin, etiket: 'LinkedIn', ikon: <Linkedin aria-hidden className="h-4 w-4" /> },
    aday.github && {
      adres: `https://github.com/${aday.github}`,
      etiket: 'GitHub',
      ikon: <Github aria-hidden className="h-4 w-4" />,
    },
  ].filter(Boolean) as { adres: string; etiket: string; ikon: React.ReactNode }[];

  return (
    <div className="space-y-3">
      {geri}

      {/* ---- kimlik ---- */}
      <section className={KART} style={{ borderColor: SIRKET_KENAR }}>
        <div className="flex items-start gap-3">
          <ProfilFotografi
            ad={aday.ad ?? ''}
            yol={aday.avatarYolu}
            className="h-16 w-16 shrink-0 rounded-full sm:h-20 sm:w-20"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
              {aday.ad ?? 'ad girilmemiş'}
            </h1>
            {(aday.okul || aday.bolum) && (
              <p className="mt-0.5 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
                {[aday.okul, aday.bolum].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="mt-0.5 text-[13px] text-gray-500">
              {[
                aday.sinif ? `${aday.sinif}. sınıf` : null,
                aday.sehir,
                aday.mezuniyet ? `${aday.mezuniyet} mezuniyet` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {/* Hangi arayış açık: şirketin aradığıyla eşleşiyor mu. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {aday.stajArayan && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                  Staj arıyor
                </span>
              )}
              {aday.isArayan && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                  İş arıyor
                </span>
              )}
              {aday.cvVar && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                  <FileText aria-hidden className="h-3 w-3" />
                  CV yüklü
                </span>
              )}
            </div>
          </div>
        </div>

        {aday.eposta && (
          <a
            href={`mailto:${aday.eposta}`}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto"
          >
            <Mail aria-hidden className="h-4 w-4" />
            E-posta gönder
          </a>
        )}
      </section>

      {/*
        Bundan sonraki her bölüm YALNIZ VERİ VARSA çiziliyor. Boş bir
        "Hakkında" kartı, öğrencinin bir şey yazdığını ama okunamadığını
        düşündürürdü.
      */}
      {aday.tanitim && (
        <Bolum baslik="Hakkında">
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{aday.tanitim}</p>
        </Bolum>
      )}

      {roller.length > 0 && (
        <Bolum baslik="Aradığı alanlar">
          <Etiketler liste={roller} />
        </Bolum>
      )}

      {(beceriler.length > 0 || aday.yetkinlikler.length > 0) && (
        <Bolum baslik="Beceriler">
          {beceriler.length > 0 && <Etiketler liste={beceriler} />}
          {aday.yetkinlikler.length > 0 && (
            <ul className={beceriler.length > 0 ? 'mt-2 space-y-1' : 'space-y-1'}>
              {aday.yetkinlikler.map((y) => (
                <li key={y.ad} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-gray-800">{y.ad}</span>
                  <span className="shrink-0 text-[12px] text-gray-500">
                    {[y.seviye, y.yil ? `${y.yil} yıl` : null].filter(Boolean).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bolum>
      )}

      {aday.projeler.length > 0 && (
        <Bolum baslik="Projeler">
          <ul className="space-y-3">
            {aday.projeler.map((pr) => (
              <li key={pr.baslik}>
                <p className="text-sm font-bold text-gray-900">{pr.baslik}</p>
                {pr.aciklama && (
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-700">{pr.aciklama}</p>
                )}
                {pr.teknoloji && pr.teknoloji.length > 0 && (
                  <div className="mt-1.5">
                    <Etiketler liste={pr.teknoloji} />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  {pr.adres && (
                    <DisBaglanti
                      adres={pr.adres}
                      etiket="Projeyi aç"
                      ikon={<ExternalLink aria-hidden className="h-4 w-4" />}
                    />
                  )}
                  {pr.github && (
                    <DisBaglanti
                      adres={pr.github}
                      etiket="Kaynak"
                      ikon={<Github aria-hidden className="h-4 w-4" />}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Bolum>
      )}

      {baglantilar.length > 0 && (
        <Bolum baslik="Bağlantılar">
          <div className="flex flex-wrap items-center gap-4">
            {baglantilar.map((b) => (
              <DisBaglanti key={b.etiket} adres={b.adres} etiket={b.etiket} ikon={b.ikon} />
            ))}
          </div>
        </Bolum>
      )}
    </div>
  );
};
