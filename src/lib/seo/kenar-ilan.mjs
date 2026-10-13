/**
 * KENARDA İLAN SAYFASI — CANLI VERİDEN (12 Ekim 2026)
 *
 * SORUN
 * -----
 * İlan HTML'i yalnız derlemede üretiliyordu ve ara katman "dosya yoksa 404"
 * diyordu. Dağıtım yalnız `main`e birleştirmede oluyor (saatlik otomasyonun
 * dağıtım adımı `if: false`). Sonuç:
 *
 *   · yeni yayımlanan ilan, bir sonraki birleştirmeye kadar doğrudan açılınca
 *     404 + noindex alıyordu (uygulama içinden tıklayan görmüyordu);
 *   · kapatılan ilan, bir sonraki dağıtıma kadar "açık" JobPosting ile
 *     yayında kalıyordu;
 *   · başlığı değişen ilanın eski adresi, kayıt hâlâ yayındayken 404'tü.
 *
 * ÇÖZÜM — MEVCUT MİMARİDE, YENİ ÇATI YOK
 * -------------------------------------
 * /ilan/<adres> isteğinde ara katman ilanı Supabase'ten ANONİM anahtarla
 * okuyor (satır politikası yalnız `status = 'published'` olanı açıyor) ve
 * sayfayı derlemeyle AYNI modülle çiziyor (ilan-sayfasi.mjs, sayfa-html.mjs).
 * Sonuç kenar önbelleğinde kısa süre tutuluyor (60 sn taze + 300 sn bayat,
 * onbellek-politikasi.mjs); yani bir değişiklik en geç birkaç dakikada
 * görünüyor ve veritabanına giden istek sayısı sınırlı.
 *
 *   tek eşleşme, adres kanonik      200, görünür ilan + canonical + JSON-LD
 *   tek eşleşme, adres farklı       301 → kanonik adres (eski başlık,
 *                                   kısaltılmış bağlantı, ham kimlik)
 *   eşleşme yok / iki eşleşme       404 + noindex (taslak, incelemede,
 *                                   kapatılmış, arşivlenmiş ya da hiç yok —
 *                                   anonim okuma bunları ayırt ETMİYOR, bu
 *                                   yüzden var-yok bilgisi sızmıyor)
 *   veri okunamadı / ayar yok       'yedek': derlemede yazılan dosya varsa
 *                                   o sunuluyor; yoksa 503 (404 DEĞİL — geçici
 *                                   bir hata kalıcı "yok" gibi bildirilmesin)
 *
 * Bilinmeyen adresler ana sayfaya YÖNLENDİRİLMİYOR.
 */
import { ilanAdresiniCoz, ilanYolu, kacir } from './metin.mjs';
import { ILAN_SECIMI, BENZER_SECIMI, benzerIlanlariSec, ilanSayfasi, sonBasvuruDurumu } from './ilan-sayfasi.mjs';
import { sayfaHtml } from './sayfa-html.mjs';
import { zorunluVeriGetir } from './veri-kaynagi.mjs';

const KENAR_ZAMAN_ASIMI_MS = 2500;

/*
  BENZER İLAN ADAYLARI — ZORUNLU DEĞİL (13 Ekim 2026)

  İlanın kendisi zorunlu okuma: okunamazsa yedek dosya ya da 503. Benzer
  ilanlar ise süs değil ama sayfanın varlık nedeni de değil: bu okuma
  düşerse (zaman aşımı, ağ, 5xx) bölüm çizilmiyor, sayfa yine 200 ve
  kabukla PARALEL istendiği için bekleme eklemiyor. Aday kümesi en yeni
  200 yayındaki ilanla sınırlı: yanıt küçük kalıyor, seçim
  (benzerIlanlariSec) aynı şirket ve aynı şehri bu küme içinde arıyor.
*/
const BENZER_ADAY_SINIRI = 200;
const BENZER_ZAMAN_ASIMI_MS = 1500;

async function benzerAdaylari(ayar, getir) {
  try {
    return await zorunluVeriGetir({
      kaynak: 'benzer-ilanlar',
      taban: ayar.taban,
      anahtar: ayar.anahtar,
      yol:
        `/rest/v1/listings?status=eq.published&order=posted_at.desc.nullslast,created_at.desc` +
        `&limit=${BENZER_ADAY_SINIRI}&select=${encodeURIComponent(BENZER_SECIMI)}`,
      zamanAsimiMs: BENZER_ZAMAN_ASIMI_MS,
      deneme: 1,
      getir,
    });
  } catch {
    return [];
  }
}

/**
 * @param {object} o
 * @param {string} o.yol                  istek yolu ("/ilan/...")
 * @param {{taban?: string, anahtar?: string}} o.ayar
 * @param {typeof fetch} o.getir
 * @param {() => Promise<string|null>} o.kabukGetir
 * @param {(yol: string) => Promise<boolean>} [o.gorselVarMi]
 * @param {(ham: string) => string} o.konumEtiketi
 * @param {(slug: string) => Promise<boolean>} [o.sirketSayfasiVarMi]
 * @param {number} [o.simdi]
 * @returns {Promise<{tur: 200, html: string, yol: string} | {tur: 301, konum: string} | {tur: 404} | {tur: 'yedek', neden: string}>}
 */
export async function ilanIsteginiCoz({ yol, ayar, getir, kabukGetir, gorselVarMi, konumEtiketi, sirketSayfasiVarMi, simdi = Date.now() }) {
  const parca = yol.slice('/ilan/'.length);
  if (!parca || parca.replace(/\/+$/, '').includes('/')) return { tur: 404 };
  const cozum = ilanAdresiniCoz(parca);
  if (!cozum) return { tur: 404 };

  const suzgec = cozum.tamKimlik
    ? `id=eq.${cozum.tamKimlik}`
    : `id=gte.${cozum.onek}-0000-0000-0000-000000000000&id=lte.${cozum.onek}-ffff-ffff-ffff-ffffffffffff`;
  let satirlar;
  try {
    satirlar = await zorunluVeriGetir({
      kaynak: 'ilan',
      taban: ayar.taban,
      anahtar: ayar.anahtar,
      yol: `/rest/v1/listings?status=eq.published&${suzgec}&limit=2&select=${encodeURIComponent(ILAN_SECIMI)}`,
      zamanAsimiMs: KENAR_ZAMAN_ASIMI_MS,
      deneme: 2,
      getir,
    });
  } catch (hata) {
    return { tur: 'yedek', neden: hata?.message || 'veri okunamadı' };
  }
  if (satirlar.length !== 1) return { tur: 404 };

  const ilan = satirlar[0];
  const kanonik = ilanYolu(ilan);
  if (yol !== kanonik) return { tur: 301, konum: kanonik };

  const [kabuk, adaylar] = await Promise.all([kabukGetir(), benzerAdaylari(ayar, getir)]);
  if (!kabuk) return { tur: 'yedek', neden: 'kabuk okunamadı' };

  const sirketSlug = ilan.companies?.slug;
  const sirketSayfasiVar = sirketSlug && sirketSayfasiVarMi ? await sirketSayfasiVarMi(sirketSlug) : Boolean(sirketSlug);
  const benzerler = benzerIlanlariSec(ilan, adaylar, { simdi });
  const { s } = ilanSayfasi(ilan, konumEtiketi, simdi, { sirketSayfasiVar, benzerler });
  if (s.gorsel && gorselVarMi && !(await gorselVarMi(s.gorsel))) delete s.gorsel;
  return { tur: 200, html: sayfaHtml(kabuk, kanonik, s, {}), yol: kanonik };
}

/**
 * İLAN SİTE HARİTASI — CANLI
 *
 * Yalnız yayındaki ve son başvurusu geçmemiş ilanlar; `lastmod` ilanın
 * kendi `updated_at` tarihi. Okuma başarısızsa `null` döner ve çağıran
 * derlemedeki yedek dosyayı sunar — boş bir harita ASLA sunulmuyor
 * (boş harita "hiç ilan yok" demek olurdu).
 */
export async function ilanHaritasiUret({ ayar, getir, site = 'https://stajimvar.com', simdi = Date.now() }) {
  let satirlar;
  try {
    satirlar = await zorunluVeriGetir({
      kaynak: 'ilan haritası',
      taban: ayar.taban,
      anahtar: ayar.anahtar,
      yol: '/rest/v1/listings?status=eq.published&select=id,title,updated_at,application_deadline&order=id.asc',
      zamanAsimiMs: 5000,
      deneme: 2,
      getir,
    });
  } catch {
    return null;
  }
  const satir = satirlar
    .filter((i) => !sonBasvuruDurumu(i, simdi).suresiGecti)
    .map((i) => {
      const lastmod = String(i.updated_at || '').slice(0, 10);
      return `  <url><loc>${kacir(site + ilanYolu(i))}</loc>${/^\d{4}-\d{2}-\d{2}$/.test(lastmod) ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    })
    .sort()
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${satir}\n</urlset>\n`;
}
