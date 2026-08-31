import React from 'react';
import { Bookmark, CheckCircle2 } from 'lucide-react';
import { ScholarshipCover } from './ScholarshipCover';
import type { Opportunity } from '../lib/opportunities';
import { opportunityTypeLabel } from '../lib/opportunity-domain.mjs';
import { opportunityAmount } from '../lib/firsat-degerlendirme.mjs';
import { bursEtiketleri, bursTarihDurumu, bursTutariVar } from '../lib/burs-kesif.mjs';
import { ZamanTupu } from './ZamanTupu';

/**
 * Burs keşif kartı.
 *
 * KEŞFET'İN KOPYASI DEĞİL, KARDEŞİ
 * --------------------------------
 * Keşfet kartıyla aynı tasarım ailesinden: aynı `rounded-2xl`, aynı
 * `border-gray-200`, aynı `shadow-sm`, aynı 16:9 kapak, aynı kırılma
 * noktaları. Ama içerik farklı: etkinlikte "nerede ve ne zaman", bursta
 * "kime, ne kadar ve son ne zaman".
 *
 * TEK TIKLAMA HEDEFİ
 * ------------------
 * Kartın tamamı detaya gidiyor. Önce kartta üç düğme yan yana duruyordu
 * ("Detayı gör", "Takip et", "Resmî kaynak") ve üçü de aynı boyuttaydı;
 * hangisinin ana eylem olduğu belli değildi, kart da bu yüzden şişiyordu.
 * Şimdi tek gizli bağlantı başlığın üstünde (`stretched link`), sağ üstte
 * kaydet düğmesi, altta küçük bir yönlendirme yazısı var.
 *
 * `<a>` içine düğme yerleştirmek geçersiz HTML üretirdi; onun yerine
 * bağlantı mutlak konumla kartı kaplıyor ve kaydet düğmesi z-index ile
 * üstte duruyor. Klavyede iki durak var: bağlantı ve kaydet düğmesi.
 *
 * KARTTAN ÇIKARILANLAR
 * --------------------
 * - "Tutar açıklanmadı": 68 kaydın hiçbirinde doğrulanmış tutar yok, yani
 *   bu satır her kartta tekrar eden ve hiçbir şey söylemeyen bir alandı.
 *   Tutar biliniyorsa yazıyor, bilinmiyorsa alan hiç çizilmiyor; bilgi
 *   detay sayfasında sade biçimde duruyor.
 * - "Son kontrol: … Bilgiler kurum tarafından değiştirilebilir": bir
 *   güven notu, bir karar bilgisi değil. Detay sayfasında kalıyor.
 */

/*
  ROZETTE DE KIRMIZI YOK

  "Son günler" rozeti gül kırmızısıydı. Kartta hem kırmızı rozet hem
  kırmızı tarih satırı olunca açık bir burs, iptal edilmiş gibi
  görünüyordu. Rozet artık zaman tüpüyle aynı ailede: son günlerde sıcak
  amber, öncesinde yeşil. Kırmızı hiçbir açık durumda yok.
*/
const DURUM_ROZETI: Record<string, { etiket: string; sinif: string }> = {
  'son-gunler': { etiket: 'Son günler', sinif: 'bg-amber-50 text-amber-900 ring-amber-200' },
  yakin: { etiket: 'Son hafta', sinif: 'bg-green-50 text-green-800 ring-green-200' },
  normal: { etiket: 'Başvuru açık', sinif: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  yakinda: { etiket: 'Yakında', sinif: 'bg-blue-50 text-blue-700 ring-blue-100' },
  tarihsiz: { etiket: 'Takvim bekleniyor', sinif: 'bg-gray-100 text-gray-600 ring-gray-200' },
  kapali: { etiket: 'Kapandı', sinif: 'bg-gray-100 text-gray-500 ring-gray-200' },
};

export const ScholarshipDiscoveryCard: React.FC<{
  item: Opportunity;
  saved?: boolean;
  /**
   * Verilmezse yer imi düğmesi HİÇ çizilmiyor.
   *
   * Öne çıkanlar şeridinde takip düğmesi istenmiyor ve boş bir işleve
   * bağlı ölü bir düğme koymak, basınca hiçbir şey olmayan bir kontrol
   * göstermek olurdu.
   */
  onSave?: () => void;
  onNavigate: (path: string) => void;
  /** Yatay kaydırmalı şeritte sabit genişlik alır. */
  serit?: boolean;
}> = ({ item, saved, onSave, onNavigate, serit }) => {
  const tarihDurumu = bursTarihDurumu(item);
  const rozet = DURUM_ROZETI[tarihDurumu] ?? DURUM_ROZETI.tarihsiz;
  const etiketler = bursEtiketleri(item);
  const tutar = bursTutariVar(item) ? opportunityAmount(item) : null;

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:shadow-md ${
        serit ? 'w-[78vw] min-w-[248px] max-w-[300px] sm:w-auto sm:min-w-0 sm:max-w-none' : ''
      }`}
    >
      <ScholarshipCover
        coverImageUrl={item.coverImageUrl}
        logoUrl={item.organizationLogoUrl}
        organizationName={item.organizationName}
        title={item.title}
      />

      {/*
        Kaydet düğmesi bağlantının ÜSTÜNDE (z-20): kartı kaplayan
        bağlantı z-10'da duruyor, aksi hâlde kaydete basmak detaya
        götürürdü.
      */}
      {onSave && (
      <button
        type="button"
        onClick={onSave}
        aria-pressed={saved}
        aria-label={saved ? `${item.title} takibini bırak` : `${item.title} bursunu kaydet`}
        className={`absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
          saved ? 'bg-blue-600 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'
        }`}
      >
        <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
      </button>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
            {opportunityTypeLabel(item.opportunityType)}
          </span>
          {/*
            ŞERİTTE DURUM ROZETİ YOK

            Vitrin kartında zaman sinyali zaten tüpün üstünde yazıyor
            ("Yarın sona eriyor"). Rozet aynı şeyi ikinci kez söyleyip bir
            satır daha yer kaplıyordu. Izgarada kalıyor: orada kartlar yan
            yana ve rozet göz taraması için işe yarıyor.
          */}
          {!serit && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${rozet.sinif}`}>
              {rozet.etiket}
            </span>
          )}
        </div>

        {/*
          Başlık iki satırda kesiliyor ama ERİŞİLEBİLİR AD kısaltılmıyor:
          `line-clamp` yalnızca görsel; ekran okuyucu tam başlığı okuyor.
        */}
        <h3 className="text-[15px] font-black leading-snug text-gray-900">
          <a
            href={`/firsatlar/${item.slug}`}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              onNavigate(`/firsatlar/${item.slug}`);
            }}
            className="after:absolute after:inset-0 after:z-10 after:content-[''] focus:outline-none"
          >
            <span className="line-clamp-2">{item.title}</span>
          </a>
        </h3>

        <p className="truncate text-sm text-gray-600">{item.organizationName}</p>

        {/*
          UYGUNLUK ETİKETLERİ ŞERİTTE ÇİZİLMİYOR

          Şerit bir vitrin: işi kullanıcıyı detaya çekmek, şartları
          anlatmak değil. Seviye/bölüm/şehir etiketleri dar kartta iki
          satır yer kaplıyor ve kararı orada verdirmeye çalışıyordu.
          Izgarada duruyorlar; orada kartlar yan yana karşılaştırılıyor.
        */}
        {!serit && etiketler.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {etiketler.map((etiket: string) => (
              <li
                key={etiket}
                className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700"
              >
                {etiket}
              </li>
            ))}
          </ul>
        )}

        {/* Tutar YALNIZCA doğrulanmışsa. Bilinmiyorsa satır hiç yok. */}
        {tutar?.metin && (
          <p className="text-sm font-extrabold text-emerald-800">{tutar.metin}</p>
        )}

        {/*
          Tek satırlık kırmızı tarih yazısı yerine zaman tüpü: aynı bilgi,
          pozitif renk dili ve süre yaklaştıkça dolan bir gösterge.
        */}
        <ZamanTupu item={item} className="mt-auto pt-1" sikisik={serit} />

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
          {item.verifiedAt ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resmî kaynaktan doğrulandı
            </span>
          ) : (
            <span />
          )}
          {/* Görsel yönlendirme; asıl bağlantı başlıkta. */}
          <span aria-hidden className="text-[11px] font-bold text-blue-700 group-hover:underline">
            Bursu incele →
          </span>
        </div>
      </div>
    </article>
  );
};
