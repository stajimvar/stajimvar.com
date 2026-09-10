import React from 'react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { BOLUM_GRUPLARI } from '../../data/bolumler';
import type { SosyalBolum } from '../../lib/queries/sosyal';

/**
 * BÖLÜM SEÇİMİ — KAPALI LİSTE, TEK SEÇİM
 *
 * NEDEN ALAN SEÇİCİ YOK
 * ---------------------
 * Alan artık kullanıcının seçimi değil: sunucu bölümden türetiyor
 * (`sosyal_profil_kur` → `department_sectors`) ve istemcinin `sector_id`
 * kolonuna yazma yetkisi bile yok. Ekranda bir alan listesi bırakmak,
 * sunucunun yok sayacağı bir seçimi kullanıcıya yaptırmak olurdu.
 *
 * SEÇİLEN BÖLÜMÜN ALANI ÖNİZLENMİYOR
 * ----------------------------------
 * "Bu bölüm şu alana gider" diye bir satır çizmek için eşlemeyi istemcide
 * de okumak gerekirdi; o an iki kaynak oluşur ve biri değiştiğinde
 * kullanıcıya yanlış alan gösterilir. Alan, kayıt başarılı olduktan sonra
 * profildeki rozette görünüyor — yani gösterilen alan her zaman
 * veritabanının yazdığı alan.
 *
 * GRUP BAŞLIKLARI TEK KAYNAKTAN
 * -----------------------------
 * `departments.grup` değerleri `src/data/bolumler.ts` ile aynı kümeden
 * (göç testi bunu sabitliyor). Başlık metinleri de oradan okunuyor;
 * ikinci bir sözlük yazmak, rehber sayfalarıyla profil ekranının aynı
 * grubu iki farklı adla göstermesi demek olurdu.
 *
 * ARAMA BASİT VE YEREL
 * --------------------
 * 42 satırlık bir liste için sunucu araması ya da yeni bir bağımlılık
 * gerekmiyor; süzgeç yalnızca görünen adı daraltıyor. Eşleşme yoksa
 * uydurma bir satır çizilmiyor, durum olduğu gibi yazılıyor.
 */

interface BolumSecimiProps {
  bolumler: SosyalBolum[];
  /** Seçili bölümün slug'ı; boş dize "henüz seçilmedi". */
  seciliSlug: string;
  onSecim: (slug: string) => void;
}

/** Türkçe küçültme: 'İ' ve 'I' varsayılan `toLowerCase` ile bozuluyor. */
function aramaAnahtari(metin: string): string {
  return metin.replace(/I/g, 'ı').replace(/İ/g, 'i').toLocaleLowerCase('tr-TR').trim();
}

export const BolumSecimi: React.FC<BolumSecimiProps> = ({ bolumler, seciliSlug, onSecim }) => {
  const [arama, setArama] = React.useState('');

  const anahtar = aramaAnahtari(arama);
  const suzulmus = anahtar
    ? bolumler.filter((bolum) => aramaAnahtari(bolum.ad).includes(anahtar))
    : bolumler;

  /*
    Gruplar listedeki SIRAYLA oluşuyor: `bolumleriGetir` zaten
    `departments.sira` ile getiriyor, yani grup sırası da katalogdan
    geliyor. Sabit bir grup sırası yazmak, katalog değiştiğinde sessizce
    ayrışacak ikinci bir kaynak olurdu.
  */
  const gruplar: { anahtar: string; baslik: string; bolumler: SosyalBolum[] }[] = [];
  for (const bolum of suzulmus) {
    let grup = gruplar.find((aday) => aday.anahtar === bolum.grup);
    if (!grup) {
      grup = {
        anahtar: bolum.grup,
        /* Başlığı bilinmeyen bir grup uydurulmuyor: ham değer basılıyor. */
        baslik: (BOLUM_GRUPLARI as Record<string, string>)[bolum.grup] ?? bolum.grup,
        bolumler: [],
      };
      gruplar.push(grup);
    }
    grup.bolumler.push(bolum);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="sosyal-bolum-arama" className="block text-sm font-bold text-gray-900">
          Bölüm ara
        </label>
        <input
          id="sosyal-bolum-arama"
          type="search"
          value={arama}
          onChange={(olay) => setArama(olay.target.value)}
          placeholder="Bölüm adının bir parçası"
          autoComplete="off"
          className={`w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 ${RENK_GECISI} ${ODAK_HALKASI}`}
        />
      </div>

      {suzulmus.length === 0 && (
        <p role="status" className="text-sm text-gray-600">
          Aramanla eşleşen bölüm yok. Aramayı temizleyebilir ya da bölümünü listede
          bulamadığını bildirebilirsin.
        </p>
      )}

      {gruplar.map((grup) => (
        <fieldset key={grup.anahtar} className="space-y-1.5">
          <legend className="pb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
            {grup.baslik}
          </legend>
          {grup.bolumler.map((bolum) => (
            <label
              key={bolum.id}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold ${RENK_GECISI} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 ${
                seciliSlug === bolum.slug
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="sosyal-bolum"
                value={bolum.slug}
                checked={seciliSlug === bolum.slug}
                onChange={() => onSecim(bolum.slug)}
                className="h-4 w-4 shrink-0 accent-blue-600"
              />
              <span className="min-w-0 break-words">{bolum.ad}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
};
