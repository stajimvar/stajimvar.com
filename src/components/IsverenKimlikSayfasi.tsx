import React from 'react';
import { ArrowLeft, Building2, ExternalLink, GraduationCap, ShieldCheck } from 'lucide-react';
import { BOLUMLER } from '../data/bolumler';
import type { StajProgrami } from '../data/stajProgramlari';

/**
 * DİZİN KAYNAKLI İŞVEREN SAYFASI
 *
 * `/sirket/<slug>` iki farklı kimliğe hizmet ediyor:
 *
 *   A) `companies` tablosundaki şirket — StajımVar'da ilanı olan kayıt.
 *   B) Büyük işverenler dizinindeki kurum — ilanını kendi kariyer
 *      sayfasından veren, bizde hesabı OLMAYAN kurum.
 *
 * Bu bileşen B'yi çiziyor. İki küme ölçülerek ayrık bulundu (0/44 alan
 * adı eşleşmesi, sıfır slug çakışması), bu yüzden tek adres altında
 * çakışma olmadan yaşayabiliyorlar.
 *
 * ROZET DİLİ YOK
 * --------------
 * Dizinde olmak "doğrulanmış StajımVar işvereni" demek değil. Buraya
 * doğrulama rozeti koymak, hiç hesabı olmayan bir kuruma bizim
 * verdiğimiz bir onay görüntüsü yaratırdı. Söylenen tek şey, kariyer
 * kaynağının bizim tarafımızdan takip edildiği ve en son ne zaman
 * kontrol edildiği.
 */

interface Props {
  program: StajProgrami;
  onBack: () => void;
  onNavigate: (yol: string) => void;
}

const Bolum: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
    <h2 className="text-sm font-extrabold text-gray-900">{baslik}</h2>
    {children}
  </section>
);

export const IsverenKimlikSayfasi: React.FC<Props> = ({ program, onBack, onNavigate }) => {
  const bolumler = React.useMemo(
    () =>
      (program.bolumler ?? [])
        .map((slug) => BOLUMLER.find((b) => b.slug === slug))
        .filter((b): b is (typeof BOLUMLER)[number] => Boolean(b)),
    [program.bolumler]
  );

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-24 pt-4 sm:px-6 lg:pb-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Büyük işverenler
      </button>

      {/* Başlık: mobilde dev hero değil, tek blok. */}
      <header className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
          <Building2 className="h-3.5 w-3.5" />
          {program.sektor}
        </span>
        <h1 className="text-xl font-black leading-tight text-gray-950 sm:text-2xl">
          {program.isveren} staj ve kariyer
        </h1>
        <p className="text-sm leading-relaxed text-gray-600">{program.ozet}</p>
      </header>

      <Bolum baslik="Açık staj ilanları">
        <p className="text-sm leading-relaxed text-gray-600">
          Şu anda StajımVar&apos;da doğruladığımız açık staj ilanı bulunmuyor. Bu kurumun
          StajımVar&apos;da işveren hesabı yok; başvuruları kendi kariyer sayfasından alıyor.
        </p>
        {program.kariyerUrl && (
          <a
            href={program.kariyerUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700"
          >
            Resmî kariyer sayfası
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        {/* Tarih VERİDEN. Yoksa satır hiç çizilmiyor — "bugün" yazılmıyor. */}
        {program.sonKontrol && (
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Kaynak son kontrol: {program.sonKontrol}
          </p>
        )}
      </Bolum>

      {bolumler.length > 0 && (
        <Bolum baslik="İlgili bölümler">
          <ul className="flex flex-wrap gap-2">
            {bolumler.map((b) => (
              <li key={b.slug}>
                <a
                  href={`/bolum/${b.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(`/bolum/${b.slug}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-800 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                  {b.ad}
                </a>
              </li>
            ))}
          </ul>
        </Bolum>
      )}

      {/*
        Üç evergreen rehber. Şirkete özel rehber ilişkisi YOK; olmayan bir
        ilişkiyi varmış gibi göstermek yerine her kurumda işe yarayan
        üç bağlantı veriliyor.
      */}
      <Bolum baslik="Başvuruya hazırlan">
        <ul className="space-y-1.5 text-sm">
          {[
            ['/rehber/staj-basvuru-epostasi', 'Staj başvuru e-postası nasıl yazılır'],
            ['/rehber/staj-nasil-bulunur', 'Staj nasıl bulunur'],
            ['/cv', 'Özgeçmişini oluştur'],
          ].map(([yol, ad]) => (
            <li key={yol}>
              <a
                href={yol}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(yol);
                }}
                className="font-semibold text-blue-600 hover:underline"
              >
                {ad}
              </a>
            </li>
          ))}
        </ul>
      </Bolum>
    </main>
  );
};
