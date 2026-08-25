import React from 'react';
import { ArrowRight, Building2, Calculator, GraduationCap, MapPin, Search, Sparkles } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { REHBERLER, KONULAR, konuEtiketi, rehberOkumaDakika, type KonuId, type Rehber } from '../data/rehberler';
import { BOLUMLER } from '../data/bolumler';
import { ARACLAR } from './AraclarListesi';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import type { StudentProfile } from '../types';

/**
 * Rehber merkezi.
 *
 * NEDEN "ÖĞRENCİ REHBERİ"
 * ----------------------
 * Sayfa kendini "Staj rehberi" diye tanıtıyordu ama öğrencinin aynı yerde
 * aradığı şeyler bundan geniş: burs, KYK, yurt, üniversite hayatı, yurt
 * dışı, ilk iş. Dar bir isim, içerik genişlediğinde okuyucuya "burada o yok"
 * dedirtiyor.
 *
 * MOBİLDE İÇERİK YUKARI ÇIKTI
 * ---------------------------
 * Üstte üç blok vardı: geri düğmesi, tam boy hero (üç sayaçla) ve dikey
 * duran üç büyük kısayol kartı. Ölçüldü: telefonda ilk rehber yazısı
 * ekranın çok altında kalıyordu; sekmenin adı "Rehber" olduğu hâlde ilk
 * ekranda tek bir rehber görünmüyordu.
 *
 *   - Geri düğmesi kalktı: Rehber alt menüdeki ana sekmelerden biri,
 *     kullanıcı buraya bir yerden gelmedi.
 *   - Hero inceldi, sayaçlar içinden çıktı (aynı sayılar "Keşfet"
 *     kartlarında zaten yazıyor).
 *   - Kısayollar aşağı indi ve yatay kayan kompakt kartlara döndü.
 *   - Yerine arama ve konu süzgeci geldi: ikisi de içeriğe GÖTÜREN
 *     kontroller, tanıtım değil.
 */

/* Türkçe karakter duyarsız arama: "ogrenci" yazan "öğrenci"yi bulsun. */
const sadelestir = (metin: string) =>
  metin
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a');

/*
  SANA UYGUN — KABA BİR AŞAMA SÜZGECİ, İDDİA DEĞİL

  Rehberde "bu yazı tam sana göre" diyebilmek için okuyucuyu tanımak
  gerekir; elimizde yalnızca sınıf bilgisi ve profilin doluluğu var. O
  yüzden burada yapılan şey kişiselleştirme değil SIRALAMA: öğrencinin
  bulunduğu aşamada işine yarama ihtimali yüksek konular öne alınıyor.

  Sekme yalnızca giriş yapılmışsa ve gerçekten bir alt küme seçilebiliyorsa
  görünüyor; seçilemiyorsa varsayılan "Tümü" kalıyor.
*/
function asamayaUygunKonular(ogrenci: StudentProfile): KonuId[] {
  const sinif = ogrenci.gradeLevel;
  if (sinif === 'Yüksek Lisans / Mezun' || sinif === '4. Sınıf') {
    return ['kariyer', 'cv', 'staj'];
  }
  if (sinif === '3. Sınıf') return ['staj', 'cv', 'yurtdisi'];
  return ['staj', 'burs', 'universite'];
}

/* ------------------------------------------------------------------ kart */

/*
  GÖRSEL KART KORUNDU

  İki sütunlu fotoğraflı ızgara sayfanın en güçlü tarafı; değiştirilmedi.
  Değişen tek şey rozet: "6 soru" doğru bir sayıydı ama okuyucunun sorduğu
  şey değil. "Kaç dakikamı alacak" sorusunun cevabı yazıdan hesaplanıyor.
*/
const KARO_ZEMIN = [
  'from-violet-600 to-violet-500',
  'from-blue-600 to-blue-500',
  'from-cyan-600 to-cyan-500',
  'from-emerald-600 to-emerald-500',
  'from-amber-500 to-amber-400',
  'from-rose-600 to-rose-500',
];

export const RehberKarti: React.FC<{
  rehber: Rehber;
  sira?: number;
  onNavigate?: (p: string) => void;
}> = ({ rehber, sira = 0, onNavigate }) => (
  <a
    href={`/rehber/${rehber.slug}`}
    onClick={(e) => {
      if (!onNavigate) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onNavigate(`/rehber/${rehber.slug}`);
    }}
    className={`group relative overflow-hidden flex flex-col justify-end aspect-square p-3.5 sm:p-4 rounded-2xl text-left cursor-pointer transition-transform hover:-translate-y-0.5 bg-gradient-to-br ${
      KARO_ZEMIN[sira % KARO_ZEMIN.length]
    }`}
  >
    {/*
      KAPAK: AVIF -> WEBP

      Uzantı bütün kapaklarda aynı: fotoğraflı on bir kapak da aynı
      biçimlere çevrildi, böylece burada slug'a göre istisna taşımıyoruz.
      AVIF desteklemeyen tarayıcı webp'ye düşüyor.

      `width`/`height` yazılı ve kart `aspect-square`: görsel yüklenirken
      kart yüksekliği değişmiyor, ızgara zıplamıyor.
    */}
    <picture>
      <source srcSet={`/rehber-gorselleri/${rehber.slug}.avif`} type="image/avif" />
      <img
        src={`/rehber-gorselleri/${rehber.slug}.webp`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={720}
        height={720}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </picture>
    <span
      aria-hidden="true"
      className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10"
    />

    {/* Konu etiketi: kart hangi kümeye ait, süzgeç kapalıyken de belli olsun. */}
    <span className="absolute top-2.5 left-2.5 z-10 text-[10px] font-bold uppercase tracking-wide text-white/95 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
      {konuEtiketi(rehber.konu)}
    </span>
    <span className="absolute top-2.5 right-2.5 z-10 text-[10px] font-bold text-white/90 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
      {rehberOkumaDakika(rehber)} dk
    </span>

    {/*
      Başlık en fazla üç satır ve kelime ortasından kesilmiyor: `line-clamp`
      satır sonunu kelimeye göre veriyor, `truncate` gibi harf ortasında
      kesmiyor.
    */}
    <span className="relative z-10 block font-bold text-white leading-snug text-sm sm:text-base drop-shadow-sm line-clamp-3">
      {rehber.baslik}
    </span>
  </a>
);

/* --------------------------------------------------------------- kısayol */

const KesfetKarti: React.FC<{
  ikon: React.ReactNode;
  renk: string;
  baslik: string;
  sayi: string;
  onClick: () => void;
}> = ({ ikon, renk, baslik, sayi, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 w-40 snap-start flex flex-col gap-2 p-3.5 rounded-2xl bg-white border border-gray-200 text-left cursor-pointer transition-colors hover:border-blue-300"
  >
    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${renk}`}>{ikon}</span>
    <span className="block text-sm font-bold text-gray-900 leading-snug">{baslik}</span>
    <span className="block text-[11px] font-semibold text-blue-600">{sayi}</span>
  </button>
);

/* ------------------------------------------------------------------ merkez */

export const RehberMerkezi: React.FC<{
  onNavigate: (path: string) => void;
  ogrenci?: StudentProfile | null;
}> = ({ onNavigate, ogrenci = null }) => {
  React.useEffect(() => {
    document.title = 'Öğrenci rehberi | StajımVar';
  }, []);

  const [arama, setArama] = React.useState('');
  const uygunKonular = ogrenci ? asamayaUygunKonular(ogrenci) : [];
  const [konu, setKonu] = React.useState<'uygun' | 'tumu' | KonuId>(
    uygunKonular.length ? 'uygun' : 'tumu'
  );

  const ogrenciRehberleri = React.useMemo(
    () => REHBERLER.filter((r) => r.kategori === 'ogrenci'),
    []
  );

  /* Yalnızca yazısı OLAN konular sekme oluyor: boş sekme, çalışmayan sekme. */
  const doluKonular = React.useMemo(
    () => KONULAR.filter((k) => ogrenciRehberleri.some((r) => r.konu === k.id)),
    [ogrenciRehberleri]
  );

  const sonuclar = React.useMemo(() => {
    const terim = sadelestir(arama.trim());
    let liste = ogrenciRehberleri;

    if (terim) {
      /*
        Arama başlıkla sınırlı değil: özet, açıklama, konu adı ve etiketler
        de taranıyor. "sigorta" yazan kişi başlığında sigorta geçmeyen
        zorunlu staj rehberini bulabilmeli.
      */
      liste = liste.filter((r) =>
        sadelestir(
          [r.baslik, r.ozet, r.aciklama, konuEtiketi(r.konu), ...(r.etiketler ?? [])].join(' ')
        ).includes(terim)
      );
    } else if (konu === 'uygun' && uygunKonular.length) {
      liste = liste.filter((r) => uygunKonular.includes(r.konu));
    } else if (konu !== 'tumu' && konu !== 'uygun') {
      liste = liste.filter((r) => r.konu === konu);
    }

    return liste;
  }, [arama, konu, ogrenciRehberleri, uygunKonular]);

  const oneCikanlar = React.useMemo(
    () => (arama || konu !== 'tumu' ? [] : ogrenciRehberleri.filter((r) => r.oneCikan)),
    [arama, konu, ogrenciRehberleri]
  );
  const oneCikanSluglar = new Set(oneCikanlar.map((r) => r.slug));
  const kalanlar = sonuclar.filter((r) => !oneCikanSluglar.has(r.slug));

  const sekmeler: { id: 'uygun' | 'tumu' | KonuId; etiket: string }[] = [
    ...(uygunKonular.length ? [{ id: 'uygun' as const, etiket: 'Sana uygun' }] : []),
    { id: 'tumu' as const, etiket: 'Tümü' },
    ...doluKonular.map((k) => ({ id: k.id as KonuId, etiket: k.etiket })),
  ];

  return (
    <SayfaKabugu icerikGenisligi={SAYFA_GENISLIGI}>
      <div className="space-y-6">
        {/* ==================================================== giriş */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50/50 p-4 sm:p-6">
          <span
            aria-hidden="true"
            className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-blue-100/40"
          />
          <div className="relative space-y-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-blue-200 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              <Sparkles className="w-3.5 h-3.5" />
              Öğrenci rehberi
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
              Öğrencilik, işini bilene kolay.
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
              Stajdan bursa, KYK’dan yurda; öğrencilikte ihtiyaç duyacağın bilgileri resmî
              kaynaklarıyla, adım adım anlatıyoruz.
            </p>

            <label className="relative block max-w-xl pt-1">
              <Search className="absolute left-3 top-[1.1rem] w-4 h-4 text-gray-400" />
              <input
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Rehberde ara"
                aria-label="Rehberde ara"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* ================================================== konular */}
        <nav
          aria-label="Rehber konuları"
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sekmeler.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setKonu(s.id);
                setArama('');
              }}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                konu === s.id && !arama
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s.etiket}
            </button>
          ))}
          {/* Son seçenek kenara yapışmasın: yatay listede sağdaki öğe tam erişilebilir olmalı. */}
          <span aria-hidden className="shrink-0 w-2" />
        </nav>

        {konu === 'uygun' && !arama && (
          <p className="text-xs text-gray-500 leading-relaxed -mt-3">
            {ogrenci?.gradeLevel} olduğun için bu konular öne alındı. Kesin bir sıralama değil —
            tamamı “Tümü” sekmesinde duruyor.
          </p>
        )}

        {/* ================================================ içerikler */}
        {sonuclar.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center space-y-3">
            <p className="font-bold text-gray-900">Bu aramaya uyan rehber yok</p>
            <p className="text-sm text-gray-600">
              Aradığın konuyu henüz yazmamış olabiliriz. Tüm rehberlere göz at.
            </p>
            <button
              onClick={() => {
                setArama('');
                setKonu('tumu');
              }}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white cursor-pointer"
            >
              Tüm rehberleri göster
            </button>
          </section>
        ) : (
          <>
            {oneCikanlar.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-gray-900">Öne çıkan rehberler</h2>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
                  {oneCikanlar.map((r, i) => (
                    <RehberKarti key={r.slug} rehber={r} sira={i} onNavigate={onNavigate} />
                  ))}
                </div>
              </section>
            )}

            {kalanlar.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-lg font-bold text-gray-900">
                    {arama ? 'Arama sonuçları' : oneCikanlar.length ? 'Diğer rehberler' : 'Rehberler'}
                  </h2>
                  <span className="text-sm text-gray-600">{kalanlar.length} yazı</span>
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
                  {kalanlar.map((r, i) => (
                    <RehberKarti
                      key={r.slug}
                      rehber={r}
                      sira={i + oneCikanlar.length}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ==================================================== keşfet */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Keşfet</h2>
          {/*
            Kısayollar artık yatay kayan kompakt kartlar. Önce üç büyük
            dikey karttı ve mobilde rehber yazılarını ekranın dışına
            itiyorlardı; keşif aracı, asıl içeriğin önüne geçmemeli.
          */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <KesfetKarti
              ikon={<GraduationCap className="w-4.5 h-4.5 text-white" />}
              renk="bg-gradient-to-br from-violet-500 to-violet-600"
              baslik="Bölüme göre staj"
              sayi={`${BOLUMLER.length} bölüm`}
              onClick={() => onNavigate('/bolumler')}
            />
            <KesfetKarti
              ikon={<Calculator className="w-4.5 h-4.5 text-white" />}
              renk="bg-gradient-to-br from-emerald-500 to-emerald-600"
              baslik="Hesaplama araçları"
              sayi={`${ARACLAR.length} araç`}
              onClick={() => onNavigate('/araclar')}
            />
            <KesfetKarti
              ikon={<Building2 className="w-4.5 h-4.5 text-white" />}
              renk="bg-gradient-to-br from-blue-500 to-blue-600"
              baslik="Büyük işverenler"
              sayi="Staj programları"
              onClick={() => onNavigate('/staj-programlari')}
            />
            <KesfetKarti
              ikon={<MapPin className="w-4.5 h-4.5 text-white" />}
              renk="bg-gradient-to-br from-amber-500 to-amber-600"
              baslik="Kariyer merkezleri"
              sayi="Üniversiteler"
              onClick={() => onNavigate('/universite-kariyer-merkezleri')}
            />
            <span aria-hidden className="shrink-0 w-2" />
          </div>
        </section>

        {/*
          İŞVEREN REHBERİ ÖĞRENCİ İÇERİĞİNİN ARASINDAN ÇIKTI

          Öğrenci kısayollarının ortasında duruyordu; oraya gelen kişi
          şirket değil öğrenci. Sayfanın sonunda tek satırlık bir bağlantı
          olarak duruyor — arayan bulur, aramayanın önünü kesmez.
        */}
        <a
          href="/isveren"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            onNavigate('/isveren');
          }}
          className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm hover:border-blue-300 transition-colors"
        >
          <span>
            <b className="block font-bold text-gray-900">Şirketler için rehber</b>
            <span className="text-gray-500">Stajyer nasıl alınır: sigorta, ücret, evrak</span>
          </span>
          <ArrowRight className="w-4 h-4 shrink-0 text-gray-400" />
        </a>

        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
          Rehberlerde yıldan yıla değişen oran ve tutarlar yazılmıyor; mekanizma anlatılıp güncel
          rakam için resmî kaynağa yönlendiriliyor. Eksik veya hatalı gördüğün bir şey olursa bize
          yaz.
        </p>
      </div>
    </SayfaKabugu>
  );
};
