import { bolumunAlani } from './bolum-eslestirme.mjs';
import { alanaUyuyorMu } from './ilan-alan-suzgeci.mjs';
import { sonBasvuruDurumu } from './seo/ilan-sayfasi.mjs';

/**
 * BÖLÜM SAYFASINDA GÜNCEL STAJ İLANLARI (14 Ekim 2026)
 *
 * Ön render (scripts/onrender.mjs) ve uygulama (BolumIlanlari.tsx) AYNI
 * kuralı çağırıyor: ilk HTML'deki liste ile JavaScript sonrası liste aynı
 * ölçütle seçiliyor.
 *
 * İKİ SÖZLÜK, İKİ GÖREV
 * ---------------------
 * `BOLUM_ALANI` (bolum-eslestirme.mjs) başlıktan tahmin edilen eski on
 * alanlı sınıflamada ("yazilim", "muhendislik"). İlanların kendi alanı ise
 * veritabanında türetiliyor: `listings.alan_idleri` = sitenin 24 alanından
 * (`sectors`) en çok ikisi. İki küme aynı anahtarları kullanmıyor; köprü
 * bölüm → alan eşlemesi (`department_sectors`, göç 20260923025000).
 *
 *   - `BOLUM_ALANI` KAPI: haritada olmayan bölüme blok konmuyor. Sağlık
 *     bölümleri bilerek dışarıda — stajları ilanla değil okul
 *     yerleştirmesiyle yürüyor ve sayfaları da bunu söylüyor.
 *   - `BOLUM_SEKTORU` HANGİ İLAN: bölümün alanı; ilan `alanaUyuyorMu` ile
 *     süzülüyor (ilan listesindeki alan süzgecinin aynısı).
 *
 * YALNIZ BİRİNCİL ALAN
 * --------------------
 * İlanın ikinci alanı şirketin sektör metninden geliyor: Prada'nın işe alım
 * stajı "Tekstil, Moda", Aviagen'in veri analizi stajı "Gıda, Tarım"
 * alanına da düşüyor (canlı veride ölçüldü). Moda tasarımı ya da ziraat
 * öğrencisine bunları göstermek ilgisiz ilan olurdu. Birincil alan başlıktan
 * türetiliyor; yalnız o eşleştiriliyor.
 *
 * BAŞLIK DA SÖYLEMELİ: birincil alanı başlıktan değil şirketin sektöründen
 * gelen ilan (başlık hiçbir işlev söylemiyor) gösterilmiyor; bkz.
 * `baslikAlaniSoyluyor`.
 *
 * GÖSTERİLMEYENLER: kimliği ya da başlığı olmayan, yayında olmayan, son
 * başvuru tarihi Türkiye takvim gününe göre geçmiş (ilan sayfasının
 * "Başvuru dönemi kapandı" kuralı), aynı kimlikle ya da aynı şirket + başlıkla
 * ikinci kez gelen ilan. Eşleşen yoksa liste boş — dolgu ilan yok.
 *
 * SIRA: Türkiye ilanları önce; her grubun içinde gelen sıra (yayın tarihi,
 * en yeni önce) korunuyor.
 */

/*
  BÖLÜM → ALAN (department_sectors) — göç 20260923025000_bolum_alan_seed.sql
  ile BİREBİR. Ziyaretçi rolü `department_sectors`i okuyamıyor (yalnız
  authenticated); derleme ve tarayıcı bu yüzden depodaki kopyayı kullanıyor.
  tests/bolum-ilanlari.test.mjs iki listenin ayrışmasını yakalıyor.
*/
export const BOLUM_SEKTORU = {
  'bilgisayar-muhendisligi': 'bilisim-yazilim',
  'yazilim-muhendisligi': 'bilisim-yazilim',
  'bilgisayar-programciligi': 'bilisim-yazilim',
  'elektrik-elektronik-muhendisligi': 'elektrik-elektronik-enerji',
  'makine-muhendisligi': 'makine-imalat',
  'endustri-muhendisligi': 'endustri-operasyon-yonetimi',
  'mekatronik-muhendisligi': 'mekatronik-otomasyon',
  'mekatronik': 'mekatronik-otomasyon',
  'insaat-muhendisligi': 'insaat-mimarlik-yapi',
  'mimarlik': 'insaat-mimarlik-yapi',
  'ic-mimarlik': 'insaat-mimarlik-yapi',
  'harita-ve-geomatik-muhendisligi': 'insaat-mimarlik-yapi',
  'gida-muhendisligi': 'gida-tarim-hayvancilik',
  'ziraat-muhendisligi': 'gida-tarim-hayvancilik',
  'kimya-muhendisligi': 'kimya-malzeme-maden',
  'metalurji-ve-malzeme-muhendisligi': 'kimya-malzeme-maden',
  'cevre-muhendisligi': 'cevre-surdurulebilirlik',
  'giyim-uretim-teknolojisi': 'tekstil-moda-hazir-giyim',
  'moda-tasarimi': 'tekstil-moda-hazir-giyim',
  'grafik-tasarim': 'medya-iletisim-yaratici',
  'radyo-televizyon-ve-sinema': 'medya-iletisim-yaratici',
  'iletisim': 'medya-iletisim-yaratici',
  'muhasebe-ve-vergi-uygulamalari': 'finans-bankacilik-sigorta',
  'iktisat': 'ekonomi-isletme-yonetim',
  'isletme': 'ekonomi-isletme-yonetim',
  'uluslararasi-ticaret': 'ticaret-pazarlama-eticaret',
  'halkla-iliskiler-ve-pazarlama': 'ticaret-pazarlama-eticaret',
  'lojistik': 'lojistik-havacilik-denizcilik',
  'is-sagligi-ve-guvenligi': 'is-sagligi-guvenligi-kalite',
  'uluslararasi-iliskiler': 'kamu-siyaset-uluslararasi-iliskiler',
  'siyaset-bilimi': 'kamu-siyaset-uluslararasi-iliskiler',
  'hukuk': 'hukuk-adalet',
  'psikoloji': 'psikoloji-sosyal-bilimler',
  'sosyoloji': 'psikoloji-sosyal-bilimler',
  'cocuk-gelisimi': 'egitim-cocuk-gelisimi',
  'eczacilik': 'saglik-ilac',
  'tip': 'saglik-ilac',
  'hemsirelik': 'saglik-ilac',
  'fizyoterapi-ve-rehabilitasyon': 'saglik-ilac',
  'tibbi-laboratuvar-teknikleri': 'saglik-ilac',
  'turizm-ve-otel-yoneticiligi': 'turizm-konaklama',
  'gastronomi-ve-mutfak': 'turizm-konaklama',
};

/*
  BAŞLIK ALANI SÖYLÜYOR MU — göç 20261109010000 `ilan_islev_desenleri()` ve
  genel iş kovası ile BİREBİR (Postgres düzenli ifadeleri, `\m`/`\M` kelime
  sınırı). Veritabanı ilanın BİRİNCİL alanını başlıktan veriyor; başlık
  hiçbir işlev söylemiyorsa şirketin sektör metninden. İkincisi bölüm
  sayfası için ilgili sayılmıyor: Nespresso'nun "Stagiaire (H/F)" ilanı
  yalnız şirket kahve sattığı için "Gıda" alanında. Desen kopyası
  tests/bolum-ilanlari.test.mjs ile göçe karşı denetleniyor.
*/
export const BASLIK_DESENLERI = [
  ['hukuk-adalet', String.raw`\m(hukuk|avukat|legal|lawyer|juridique)\M`],
  ['saglik-ilac', String.raw`\m(regulatory|ruhsatlandirma|ruhsat|klinik|clinical|medical|tibbi|bacter\w*|biolog\w*|biyoloj\w*|genetik|molecular|biotech\w*)`],
  ['egitim-cocuk-gelisimi', String.raw`\m(ogretmen\w*|teacher|enseignant)`],
  ['ekonomi-isletme-yonetim', String.raw`\m(insan kaynaklari|hr|human resources|talent|recruit\w*|ise alim|people|learning development|training)\M`],
  ['is-sagligi-guvenligi-kalite', String.raw`\m(qhse|isg|is sagligi|kalite|quality)`],
  ['elektrik-elektronik-enerji', String.raw`\m(elektronik|electronic\w*|devre tasarim|circuit|power system|power ele\w*|enerji|energy)`],
  ['bilisim-yazilim', String.raw`\m(yazilim|software|it|bilgi teknolojileri|developer|coding|coder|yapay zeka|ai|llm|machine learning|data scien\w*|veri analiz\w*|qa|network|sap|digital twin|dijital sistem\w*|research engineer)\M`],
  ['finans-bankacilik-sigorta', String.raw`\m(finans\w*|financ\w*|muhasebe|accounting|denetim|audit|risk|bank\w*|yatirim bankacil\w*|investment|credit|kredi|global markets|private bank|treasury|f a asistani|kontrol ve raporlama|satis finansmani|asset management)`],
  ['tekstil-moda-hazir-giyim', String.raw`\m(fashion|moda|textile|tekstil|giyim|showroom)`],
  ['lojistik-havacilik-denizcilik', String.raw`\m(lojistik|logistic\w*|tedarik|supply chain|warehouse|depo|procurement|satin alma|soguk zincir|demand planning|sop)\M`],
  ['ticaret-pazarlama-eticaret', String.raw`\m(pazarlama|marketing|martech|satis|sales|vertrieb|commerce|e ticaret|e business|trade marketing|business development|is gelistirme|account management|customer success|customer service|client advisor|reklam|advertising|ticari|growth|adv|sav)\M`],
  ['medya-iletisim-yaratici', String.raw`\m(grafik|graphic|grafik tasarim|tasarim stajyeri|gorsel tasarim|design\w*|sosyal medya|social media|content|icerik|copy|creative|medya|media|medienproduktion|produktion|image assistant|ajans|agency|ceviri|translation|events|etkinlik)`],
  ['kimya-malzeme-maden', String.raw`\m(laboratuvar|laboratory)`],
  ['endustri-operasyon-yonetimi', String.raw`\m(operasyon\w*|operations?|uretim|production|operasyonel mukemmellik|surec)`],
];
export const GENEL_IS_DESENI = String.raw`\m(strateji|strategy|chief of staff|founder\w*|kurucu|ceo|venture|business management|is analisti|is analizi|business analyst|analyst|urun|product|consult\w*|danisman|yonetici adayi|project management|proje\w*)`;

const jsDesen = (pg) => new RegExp(pg.replace(/\\[mM]/g, '\\b'));
const DESENLER = BASLIK_DESENLERI.map(([slug, d]) => [slug, jsDesen(d)]);
const GENEL_IS = jsDesen(GENEL_IS_DESENI);
const TR_KATLA = { İ: 'i', I: 'i', ı: 'i', Ç: 'c', ç: 'c', Ğ: 'g', ğ: 'g', Ö: 'o', ö: 'o', Ş: 's', ş: 's', Ü: 'u', ü: 'u' };

/** `sosyal_gizli.ad_sadelestir` ile aynı katlama: Türkçe harf → ASCII, küçük harf, a-z0-9 dışı → boşluk. */
export function baslikKatla(ham) {
  return String(ham || '')
    .replace(/[İIıÇçĞğÖöŞşÜü]/g, (h) => TR_KATLA[h])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Başlık bu alanı KENDİSİ söylüyor mu (veritabanının birincil alan kuralının başlık dalı). */
export function baslikAlaniSoyluyor(baslik, alanSlug) {
  const b = ` ${baslikKatla(baslik)} `;
  const ilk = DESENLER.find(([, r]) => r.test(b));
  if (ilk) return ilk[0] === alanSlug;
  return alanSlug === 'ekonomi-isletme-yonetim' && GENEL_IS.test(b);
}

/** Bölüm sayfasında gösterilen en çok ilan. */
export const BOLUM_ILAN_ADEDI = 6;

/** Bölümün ilan alanının slug'ı; blok konmayacak bölümde null. */
export function bolumIlanAlani(bolumSlug) {
  if (!bolumunAlani(bolumSlug)) return null;
  return BOLUM_SEKTORU[bolumSlug] ?? null;
}

const sade = (metin) => String(metin || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

/**
 * Bölümle eşleşen açık ilanlar.
 *
 * @param {object} o
 * @param {string} o.bolumSlug
 * @param {Array<object>} o.ilanlar  `id, title, alan_idleri, application_deadline, country_code, companies{name}` taşıyan satırlar
 * @param {Array<{id: string, slug: string, ad?: string}>} o.sektorler  etkin alanlar
 * @param {number} [o.simdi]
 * @param {number} [o.adet]
 * @returns {{uygun: boolean, alan: {id: string, slug: string, ad?: string} | null, ilanlar: object[], toplam: number}}
 *   `uygun` false ise sayfaya blok konmuyor.
 */
export function bolumIlanlari({ bolumSlug, ilanlar, sektorler, simdi = Date.now(), adet = BOLUM_ILAN_ADEDI }) {
  const alanSlug = bolumIlanAlani(bolumSlug);
  if (!alanSlug) return { uygun: false, alan: null, ilanlar: [], toplam: 0 };
  const alan = (Array.isArray(sektorler) ? sektorler : []).find((s) => s && s.slug === alanSlug) ?? null;
  if (!alan) return { uygun: true, alan: null, ilanlar: [], toplam: 0 };

  const kimlikler = new Set();
  const imzalar = new Set();
  const eslesen = [];
  for (const ilan of Array.isArray(ilanlar) ? ilanlar : []) {
    if (!ilan || !ilan.id || !String(ilan.title || '').trim()) continue;
    if (ilan.status && ilan.status !== 'published') continue;
    const birincil = Array.isArray(ilan.alan_idleri) && ilan.alan_idleri.length > 0 ? [ilan.alan_idleri[0]] : [];
    if (!alanaUyuyorMu(birincil, [alan.id])) continue;
    if (!baslikAlaniSoyluyor(ilan.title, alan.slug)) continue;
    if (sonBasvuruDurumu(ilan, simdi).suresiGecti) continue;
    const imza = `${sade(ilan.companies?.name)}|${sade(ilan.title)}`;
    if (kimlikler.has(ilan.id) || imzalar.has(imza)) continue;
    kimlikler.add(ilan.id);
    imzalar.add(imza);
    eslesen.push(ilan);
  }
  const sirali = [...eslesen.filter((i) => i.country_code === 'TR'), ...eslesen.filter((i) => i.country_code !== 'TR')];
  return { uygun: true, alan, ilanlar: sirali.slice(0, Math.max(0, adet)), toplam: eslesen.length };
}
