import React from 'react';
import { ArrowRight, ChevronRight, Clock, Search, X } from 'lucide-react';
import { REHBERLER, rehberOkumaDakika } from '../data/rehberler';
import { RehberKapagi } from '../components/RehberKartlari';
import { SIRKET_METIN, SIRKET_METIN_IKINCIL, SIRKET_ROZET, SIRKET_VURGU_KOYU, SIRKET_ODAK } from './renk';

/**
 * İŞVEREN REHBERİ — ŞİRKET HESABININ REHBER AÇILIŞI (26 Eylül 2026)
 *
 * Şirket hesabı /rehber'de öğrenci merkezini görüyordu: üstte tek bir
 * "Şirketler için" kartı, altında burs, KYK ve CV yazıları. Şirketin
 * aradığı şey (stajyer alımı, belge ve sigorta, ilan, ilk gün) ikinci
 * ekrandaydı.
 *
 * YALNIZ VAR OLAN İÇERİK
 * ----------------------
 * Öne çıkan kart /stajyer-nasil-alinir sayfası (EmployerGuide) ve liste
 * `kategori: 'isveren'` yazılarının kendisi — başlık, özet ve okuma süresi
 * yazının kendi alanlarından. Yeni yazı, uydurma kategori ya da başlık
 * yok. Tasarımdaki "İşe alım / Belgeler" çipleri kurulmadı: yazılarda bu
 * ayrımı taşıyan bir alan yok (hepsinin konusu 'isveren'); olmayan bir
 * sınıflandırmayı elle yazmak, yazı eklendikçe sessizce yanlışlaşırdı.
 * Çipler bu yüzden gerçek iki kümeyi ayırıyor: işveren yazıları ve tüm
 * rehber.
 *
 * KAPAKLAR
 * -------
 * Her yazının satırında rehber merkezindeki AYNI kapak (`RehberKapagi`,
 * `/rehber-gorselleri/<slug>.avif|webp`, aynı sürüm eki). Kapak yoksa ya
 * da inmezse bileşen görseli gizliyor ve gri kutu kalıyor — uydurma
 * görsel konmuyor.
 *
 * ÖĞRENCİ İÇERİĞİ SİLİNMİYOR
 * --------------------------
 * "Tüm rehber" öğrenci merkezini (`RehberMerkezi`, `sirketHesabi`) açıyor;
 * burs, KYK ve öğrenci yazıları orada olduğu gibi. Adreste konu varsa
 * (`?konu=burs` gibi paylaşılmış bağlantı) doğrudan o merkez açılıyor —
 * bağlantı verdiği sözü tutsun.
 *
 * ARAMA
 * -----
 * Üst çubuktaki arama terimiyle aynı durum (`arama` / `onAramaDegis`):
 * masaüstünde kutu üst çubukta, telefonda sayfanın içinde. Eşleşme
 * başlık, özet, hızlı cevap ve etiketlerde (Türkçe küçük harf). İşveren
 * yazılarında sonuç yoksa "Tüm rehberde ara" aynı terimle öğrenci
 * merkezine geçiyor; ikinci bir arama motoru yazılmadı.
 */

const ISVEREN_YAZILARI = REHBERLER.filter((r) => r.kategori === 'isveren');

const kucuk = (metin: string) => metin.toLocaleLowerCase('tr-TR');

function eslesir(rehber: (typeof ISVEREN_YAZILARI)[number], terim: string): boolean {
  if (!terim) return true;
  const alanlar = [rehber.baslik, rehber.ozet, rehber.hizliCevap ?? '', ...(rehber.etiketler ?? [])];
  return alanlar.some((alan) => kucuk(String(alan)).includes(terim));
}

/** Uygulama içi gezinme; değiştirici tuşlarla tarayıcının kendi davranışı. */
function icTiklama(onNavigate: (yol: string) => void, yol: string) {
  return (olay: React.MouseEvent<HTMLAnchorElement>) => {
    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
    olay.preventDefault();
    onNavigate(yol);
  };
}

const CIP = `inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-bold ${SIRKET_ODAK}`;

export const IsverenRehberi: React.FC<{
  onNavigate: (yol: string) => void;
  arama: string;
  onAramaDegis: (terim: string) => void;
  /** "Tüm rehber" — öğrenci merkezine geçiş; içerik silinmiyor. */
  onTumRehber: () => void;
}> = ({ onNavigate, arama, onAramaDegis, onTumRehber }) => {
  React.useEffect(() => {
    const eski = document.title;
    document.title = 'İşveren rehberi | StajımVar';
    return () => {
      document.title = eski;
    };
  }, []);

  const terim = kucuk(arama.trim());
  const sonuclar = ISVEREN_YAZILARI.filter((r) => eslesir(r, terim));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
          İşveren rehberi
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          Stajyer alım sürecinde ihtiyaç duyduklarınız.
        </p>
      </div>

      {/* Arama: etiket görünür değil ama bağlı (`sr-only`), yer tutucu tek başına ad sayılmıyor. */}
      <div className="relative">
        <label htmlFor="isveren-rehber-ara" className="sr-only">
          Rehberde ara
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          id="isveren-rehber-ara"
          type="search"
          value={arama}
          onChange={(olay) => onAramaDegis(olay.target.value)}
          placeholder="Rehberde ara"
          className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-11 text-base text-gray-900 placeholder:text-gray-500 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
        {arama && (
          <button
            type="button"
            onClick={() => onAramaDegis('')}
            aria-label="Aramayı temizle"
            className={`absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 ${SIRKET_ODAK}`}
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Rehber kapsamı">
        <button
          type="button"
          aria-pressed="true"
          className={`${CIP} border-blue-600 bg-blue-600 text-white`}
        >
          Şirketler için
        </button>
        <button
          type="button"
          aria-pressed="false"
          onClick={onTumRehber}
          className={`${CIP} border-gray-300 bg-white text-gray-800 hover:bg-gray-50`}
        >
          Tüm rehber
        </button>
      </div>

      {/* Öne çıkan: gerçek sayfa (/stajyer-nasil-alinir, EmployerGuide). Aramada gizli. */}
      {!terim && (
        <a
          href="/stajyer-nasil-alinir"
          onClick={icTiklama(onNavigate, '/stajyer-nasil-alinir')}
          className={`block rounded-2xl border border-blue-100 p-5 ${SIRKET_ODAK}`}
          style={{ background: SIRKET_ROZET }}
        >
          <p className="text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
            Stajyer nasıl alınır?
          </p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
            Zorunlu ve gönüllü staj, kim ne yapar ve dört adımda stajyer almak.
          </p>
          <span className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold" style={{ color: SIRKET_VURGU_KOYU }}>
            Rehberi incele
            <ArrowRight aria-hidden className="h-4 w-4" />
          </span>
        </a>
      )}

      <section aria-labelledby="isveren-yazilari" className="space-y-3">
        <h2 id="isveren-yazilari" className="text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
          {terim ? 'Arama sonuçları' : 'Şirketler için yazılar'}
        </h2>
        {sonuclar.length > 0 ? (
          <ul className="space-y-2.5">
            {sonuclar.map((r) => (
              <li key={r.slug}>
                <a
                  href={`/rehber/${r.slug}`}
                  onClick={icTiklama(onNavigate, `/rehber/${r.slug}`)}
                  className={`flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 hover:border-gray-300 ${SIRKET_ODAK}`}
                >
                  <span aria-hidden className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    <RehberKapagi slug={r.slug} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-bold leading-snug" style={{ color: SIRKET_METIN }}>
                      {r.baslik}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug" style={{ color: SIRKET_METIN_IKINCIL }}>
                      {r.ozet}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                      <Clock aria-hidden className="h-3.5 w-3.5" />
                      {rehberOkumaDakika(r)} dk
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="mt-2.5 h-4 w-4 shrink-0 text-gray-400" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
            <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
              İşveren yazılarında sonuç yok.
            </p>
            <button
              type="button"
              onClick={onTumRehber}
              className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800"
            >
              Tüm rehberde ara
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
