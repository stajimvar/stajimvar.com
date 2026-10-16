/**
 * İLAN SAYFASI — DERLEMEDE VE KENARDA AYNI ÇIKTI (12 Ekim 2026)
 *
 * Bir ilanın herkese açık sayfası iki yerde üretiliyor:
 *
 *   derleme  `scripts/onrender.mjs` her dağıtımda bütün yayındaki ilanları
 *            dosya olarak yazıyor (kenar çizimi düşerse yedek).
 *   kenar    `functions/_middleware.ts` /ilan/<adres> isteğinde ilanı CANLI
 *            veriden okuyup bu modülle çiziyor. Yeni yayımlanan ilan bir
 *            sonraki dağıtımı beklemeden 200 alıyor; kapanan ilan dakikalar
 *            içinde düşüyor.
 *
 * İki yerin aynı başlığı, aynı görünür metni ve aynı yapısal veriyi üretmesi
 * için kural burada TEK. Bu dosya Node'a ya da tarayıcıya özgü API kullanmıyor.
 *
 * Bağımlılık enjeksiyonu: `konumEtiketi` TypeScript'te (src/lib/sehir.ts).
 * Kenar paketleyicisi onu doğrudan içe aktarabiliyor, derleme betiği ise
 * önce derliyor; bu yüzden fonksiyon çağırandan geliyor.
 */
import { kacir, duzMetin, ozetle, paragraflar, ilanYolu } from './metin.mjs';
import { guvenliDisAdres } from '../guvenli-url.mjs';
import { ilanHedefi } from '../ilan-hedefi.mjs';
import { basvuruYolu } from '../basvuru-yolu.mjs';
import { ulkeAdi, ulkeListesiTemizle } from '../ulkeler.mjs';
import { gercekAciklama, yerTutucuAciklamaMi } from '../ilan-yer-tutucu.mjs';
import { ilanSehirBaglantisi } from './sehir-sayfalari.mjs';

export const SITE = 'https://stajimvar.com';

/**
 * Ön render ile kenarın Supabase'ten istediği alanlar. YALNIZ anonim anahtarla
 * okunuyor: satır politikası `status = 'published'` olanları açıyor, yani taslak,
 * incelemede, kapatılmış ya da arşivlenmiş ilan bu sorgudan hiç dönmüyor.
 */
export const ILAN_SECIMI =
  'id,title,description,responsibilities,required_skills,duration,min_grade_level,' +
  /* `il`: şehir sayfası bağlantısı ön render ve kenarda aynı ile baksın. */
  'city,il,country_code,work_type,apply_url,application_method,posted_at,created_at,updated_at,' +
  'application_deadline,is_paid,stipend_text,basvuru_ulkeleri,origin,' +
  'basvuru_ulkeleri_kanit,basvuru_ulkeleri_dogrulandi_at,' +
  'companies(name,slug,website_url,logo_url,industry,location,description)';

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** Türkiye takvim günü (YYYY-AA-GG). Türkiye 2016'dan beri sabit UTC+3. */
export function istanbulBugun(simdi = Date.now()) {
  return new Date(simdi + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * SON BAŞVURU DURUMU — tarih ham dizeden okunuyor (saat dilimi kayması yok).
 * Son gün DAHİL: "son başvuru 15 Ekim" 15 Ekim boyunca açık demek; arayüz de
 * Europe/Istanbul gününe bakıyor.
 */
export function sonBasvuruDurumu(ilan, simdi = Date.now()) {
  const ham = String(ilan.application_deadline || '').slice(0, 10);
  const parca = ham.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parca) return { tarih: null, suresiGecti: false, metin: null };
  return {
    tarih: ham,
    suresiGecti: ham < istanbulBugun(simdi),
    metin: `${Number(parca[3])} ${AYLAR[Number(parca[2]) - 1]} ${parca[1]}`,
  };
}

/*
  ŞEHİR ALANINDA ÜLKE ADI

  Ölçüldü: bir ilanın `city` alanında "Turkey" yazıyor. Bu bir yerleşim yeri
  değil; `addressLocality` olarak basılırsa arama motoruna "Turkey adlı bir
  şehir" denir. Ülke adı gelen şehir alanı yerleşim yeri sayılmıyor; ülke
  bilgisi `country_code`'dan geliyor.
*/
const SEHIR_OLMAYAN = new Set([
  'turkey', 'türkiye', 'turkiye', 'germany', 'deutschland', 'almanya',
  'united kingdom', 'uk', 'england', 'remote', 'uzaktan', 'europe', 'avrupa',
]);

/**
 * Yapısal veri ve görünür metin için konum — YALNIZ KAYNAK VERİSİ.
 *
 * Ülke yalnız ilanın kayıtlı `country_code` alanından geliyor. 12 Ekim 2026
 * incelemesinde şehirden ülke çıkarma (İstanbul → TR) kaldırıldı: tahmin
 * yapısal veriye girmiyor. Ülke kodu boşsa JobPosting yazılmıyor ve ilan
 * veri eksikleri raporuna düşüyor; düzeltme kaynak veride yapılmalı.
 *
 * Şehir alanında ülke adı ("Turkey") yerleşim yeri sayılmıyor; bu bir
 * tahmin değil, alanı yanlış amaçla KULLANMAMAK.
 */
export function ilanKonumu(ilan, konumEtiketi) {
  const ham = String(ilan.city ?? '').trim();
  const yerellik = ham && !SEHIR_OLMAYAN.has(ham.toLocaleLowerCase('tr-TR')) ? konumEtiketi(ham) || null : null;
  const kod = String(ilan.country_code ?? '').trim().toUpperCase();
  return { yerellik, ulke: /^[A-Z]{2}$/.test(kod) ? kod : null, gorunen: ham ? konumEtiketi(ham) : null };
}

const CALISMA = { 'On-site': 'İş yerinde', Hybrid: 'Hibrit', Remote: 'Uzaktan' };

/*
  UZAKTAN İLANDA BAŞVURULABİLEN ÜLKELER (13 Ekim 2026)

  `basvuru_ulkeleri` (20261213010000; yalnız uzaktan ilanda dolu olabiliyor,
  ISO alfa-2). Google tamamen uzaktan işte `jobLocationType: TELECOMMUTE` ile
  en az bir ülke istiyor (`applicantLocationRequirements`) ve açıklamanın da
  bunu açıkça söylemesini istiyor.

  YALNIZ DOĞRULANMIŞ DEĞER. İki yol var:
    1. İşverenin KENDİ ilanı (`origin = 'employer_posted'`): ülkeleri işveren
       seçiyor, ilan yayına ancak sunucu kontrolünden
       (`zorunlu.basvuru_ulkeleri`) ya da yönetici onayından geçerek çıkıyor.
    2. Öteki ilanlar: GEÇERLİ DOĞRULAMA DAMGASI şart (20261214010000):
         basvuru_ulkeleri_dogrulandi_at  okunabilir bir zaman, gelecekte değil
         basvuru_ulkeleri_kanit          resmî kaynağın https adresi VE
                                         kaynaktaki ifade (adresten fazlası)
       Damgayı yalnız otomasyon ve göç yazabiliyor; ülkeler damgasız
       değişince veritabanı damgayı düşürüyor.
  Damga eksik ya da geçersizse ülkeler yok sayılıyor, JobPosting yazılmıyor:
  ilanın ülke kodu (şirketin yeri) başvuru şartı sayılmıyor.
*/
const DAMGA_SAAT_PAYI_MS = 5 * 60 * 1000;

export function basvuruUlkesiKanitiGecerli(ilan, simdi = Date.now()) {
  const zaman = Date.parse(String(ilan.basvuru_ulkeleri_dogrulandi_at ?? ''));
  if (!Number.isFinite(zaman) || zaman > simdi + DAMGA_SAAT_PAYI_MS) return false;
  const kanit = String(ilan.basvuru_ulkeleri_kanit ?? '').trim();
  const adres = (kanit.match(/https:\/\/[^\s"'<>]+/) || [])[0];
  if (!adres || !guvenliDisAdres(adres)) return false;
  /* Adresin yanında kaynaktaki ifade de olmalı: yalnız bağlantı kanıt değil. */
  return kanit.replace(adres, '').replace(/[\s—–:;,.-]+/g, ' ').trim().length >= 10;
}

export function basvurulabilenUlkeler(ilan, simdi = Date.now()) {
  if (ilan.work_type !== 'Remote') return [];
  const ulkeler = ulkeListesiTemizle(ilan.basvuru_ulkeleri);
  if (!ulkeler.length) return [];
  if (ilan.origin === 'employer_posted') return ulkeler;
  return basvuruUlkesiKanitiGecerli(ilan, simdi) ? ulkeler : [];
}

/** Yapısal veride ülke adı İngilizce ("DE" → "Germany"); üretilemezse kod. */
function ingilizceUlkeAdi(kod) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(kod) || kod;
  } catch {
    return kod;
  }
}

/** "Bu staj tamamen uzaktan yapılıyor. Başvurulabilen ülkeler: Türkiye, Almanya." */
function uzaktanCumlesi(ulkeler) {
  return `Bu staj tamamen uzaktan yapılıyor. Başvurulabilen ülkeler: ${ulkeler.map(ulkeAdi).join(', ')}.`;
}

/** Sayfa <title> — derleme ve istemci aynı biçimi kullanıyor. */
export function ilanSayfaBasligi(ilan, konumEtiketi) {
  const { gorunen } = ilanKonumu(ilan, konumEtiketi);
  const sirket = ilan.companies?.name;
  return `${ilan.title}${gorunen ? ` (${gorunen})` : ''}${sirket ? ` — ${sirket}` : ''} | StajımVar`;
}

/*
  AÇIKLAMASIZ İLANIN META AÇIKLAMASI (15 Ekim 2026)

  Yedek cümle yalnız konum YOKKEN devreye giriyordu: açıklaması boş ama
  şehri olan ilan "München. " gibi tek başına bir konum alıyordu. Artık
  açıklama boşsa (ya da yalnız yer tutucuysa) yedek konumdan bağımsız:
  başlık, şirket ve konum — hangisi varsa — tek cümlede, ardından sabit bir
  cümle. Açıklaması olan ilanın meta açıklaması değişmedi.
*/
const META_SINIRI = 155;
const META_YEDEK_SONU ="Staj ilanının temel bilgileri ve başvuru bağlantısı StajımVar'da.";

/** Meta açıklama (kısaltılmış). Sayfanın kendisi kısaltılmıyor. */
export function ilanMetaAciklamasi(ilan, konumEtiketi) {
  const { gorunen } = ilanKonumu(ilan, konumEtiketi);
  const govde = ozetle(gercekAciklama(ilan.description), gorunen ? 140 : 155);
  if (govde) {
    if (!gorunen) return govde;
    /* Uzun konumda ("Düsseldorf, North Rhine-Westphalia, Germany") 140'lık
       özet sınırı aşıyordu. Yalnız aşan meta yeniden özetleniyor; sınırın
       içindeki meta birebir aynı kalıyor. ozetle() en fazla bütçe + 1
       ("…") karakter döndürüyor, bütçe ona göre. */
    const meta = `${gorunen}. ${govde}`;
    if ([...meta].length <= META_SINIRI) return meta;
    const butce = META_SINIRI - [...gorunen].length - 3;
    return butce >= 40 ? `${gorunen}. ${ozetle(gercekAciklama(ilan.description), butce)}` : ozetle(gercekAciklama(ilan.description), META_SINIRI - 1);
  }
  const bas = [duzMetin(ilan.title), duzMetin(ilan.companies?.name), gorunen && duzMetin(gorunen)].filter(Boolean).join(', ');
  if (!bas) return META_YEDEK_SONU;
  const kisa = ozetle(bas, 155 - META_YEDEK_SONU.length - 3);
  return `${kisa.endsWith('…') ? kisa : `${kisa.replace(/\.+$/, '')}.`} ${META_YEDEK_SONU}`;
}

const dizi = (d) =>
  Array.isArray(d) ? d.map((x) => duzMetin(x)).filter(Boolean) : [];

/**
 * JOBPOSTING — Google Search Central "Job posting" belgesi (son güncelleme
 * 2026-09-08) esas alındı:
 *
 *   description  işin TAM tanımı, HTML. Sorumluluklar ve nitelikler dahil.
 *                Eskiden 1200 karakterde kesilen tek paragraftı.
 *   jobLocation  fiziksel iş yeri; `addressCountry` ZORUNLU.
 *   TELECOMMUTE  yalnız %100 uzaktan iş; açıklamada da yazmalı.
 *   süresi dolan ilan   işaretleme kaldırılıyor (sayfa kalıyor, kapandığı
 *                yazıyor) — belgenin saydığı üç yoldan biri.
 *
 * Gerekli alan kaynakta yoksa JobPosting HİÇ yazılmıyor ve nedeni `eksik`
 * listesinde dönüyor: eksik alanla yazmak Search Console'da hata, uydurarak
 * doldurmak yanlış beyan.
 *
 * UZAKTAN İLAN (TELECOMMUTE): Google en az bir ülke istiyor —
 * `applicantLocationRequirements`. 13 Ekim 2026'dan beri bu bilgi
 * `basvuru_ulkeleri` alanında (işverenin ya da yöneticinin beyanı); doluysa
 * `jobLocationType: TELECOMMUTE` + ülkeler yazılıyor ve açıklamaya
 * "tamamen uzaktan; başvurulabilen ülkeler: …" cümlesi ekleniyor. Alan
 * boşsa JobPosting YİNE yazılmıyor: ilanın ülke kodunu (şirketin yeri)
 * başvuru coğrafyası saymak tahmin olurdu; ilan raporda listeleniyor.
 */
export function ilanJobPosting(ilan, konumEtiketi, simdi = Date.now()) {
  const eksik = [];
  const durum = sonBasvuruDurumu(ilan, simdi);
  if (durum.suresiGecti) return { veri: null, eksik: ['süresi doldu — işaretleme kaldırıldı'] };

  const sirket = ilan.companies || {};
  if (!String(sirket.name || '').trim()) eksik.push('hiringOrganization.name (şirket adı yok)');
  const tarih = String(ilan.posted_at || ilan.created_at || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) eksik.push('datePosted');

  const { yerellik, ulke } = ilanKonumu(ilan, konumEtiketi);
  const basvuruUlkeleri = basvurulabilenUlkeler(ilan, simdi);
  let jobLocation = null;
  if (ilan.work_type === 'Remote') {
    if (!basvuruUlkeleri.length) {
      eksik.push('applicantLocationRequirements (uzaktan ilan; başvuru coğrafyası kaynakta yok)');
    }
  } else if (ulke) {
    jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(yerellik ? { addressLocality: yerellik } : {}),
        addressCountry: ulke,
      },
    };
  } else {
    eksik.push(yerellik ? 'addressCountry (şehir var, ülke kodu yok)' : 'jobLocation (şehir ve ülke yok)');
  }

  /*
    Yer tutucu açıklama ("Bu ilanın ayrıntıları şirketin kendi kariyer
    sayfasında…") iş tanımı değil: açıklama yok sayılıyor ve aşağıdaki eksik
    alan kuralı uygulanıyor (lib/ilan-yer-tutucu). Sayfanın dizine
    açıklığını bu karar değiştirmiyor.
  */
  const aciklamaParcalari = paragraflar(gercekAciklama(ilan.description));
  const sorumluluk = dizi(ilan.responsibilities);
  const nitelik = dizi(ilan.required_skills);
  /*
    Yer tutucu varsa JobPosting HİÇ yazılmıyor — `required_skills` dolu olsa
    bile: toplama hattında o alan başlıktan tahminle çıkarılıyor; açıklaması
    yalnız tahmini beceri listesi olan bir iş ilanı da yanlış beyan olurdu.
  */
  if (yerTutucuAciklamaMi(ilan.description)) eksik.push('description (yer tutucu metin)');
  else if (!aciklamaParcalari.length && !sorumluluk.length && !nitelik.length) eksik.push('description');
  if (eksik.length) return { veri: null, eksik };

  const html =
    aciklamaParcalari.map((p) => `<p>${kacir(p)}</p>`).join('') +
    (sorumluluk.length ? `<p><strong>Sorumluluklar</strong></p><ul>${sorumluluk.map((m) => `<li>${kacir(m)}</li>`).join('')}</ul>` : '') +
    (nitelik.length ? `<p><strong>Aranan nitelikler</strong></p><ul>${nitelik.map((m) => `<li>${kacir(m)}</li>`).join('')}</ul>` : '') +
    (basvuruUlkeleri.length
      ? `<p>${kacir(uzaktanCumlesi(basvuruUlkeleri))}</p>`
      : ilan.work_type && CALISMA[ilan.work_type]
        ? `<p>Çalışma şekli: ${CALISMA[ilan.work_type]}</p>`
        : '') +
    (ilan.duration ? `<p>Süre: ${kacir(duzMetin(ilan.duration))}</p>` : '');

  const veri = {
    '@type': 'JobPosting',
    title: ilan.title,
    description: html,
    datePosted: tarih,
    ...(durum.tarih ? { validThrough: durum.tarih } : {}),
    employmentType: 'INTERN',
    url: SITE + ilanYolu(ilan),
    /*
      `directApply` başvurunun gerçek yolundan: yalnız başvuru StajımVar'da
      tamamlanıyorsa true (lib/basvuru-yolu.mjs). Dış kaynaktan derlenen
      ilanda başvuru şirketin sayfasında.
    */
    directApply: basvuruYolu({ applicationMethod: ilan.application_method, applyUrl: ilan.apply_url }).anaEylem === 'platform-ici',
    hiringOrganization: {
      '@type': 'Organization',
      name: sirket.name,
      ...(guvenliDisAdres(sirket.website_url) ? { sameAs: guvenliDisAdres(sirket.website_url) } : {}),
      ...(guvenliDisAdres(sirket.logo_url) ? { logo: guvenliDisAdres(sirket.logo_url) } : {}),
    },
    ...(jobLocation ? { jobLocation } : {}),
    ...(basvuruUlkeleri.length
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: basvuruUlkeleri.map((kod) => ({ '@type': 'Country', name: ingilizceUlkeAdi(kod) })),
        }
      : {}),
  };
  return { veri, eksik: [] };
}

/** Kırıntı yolu: ilanın üst sayfası gerçek merkez `/staj-ilanlari` (eski `/ilan` 404 dönüyordu). */
export function ilanKirintisi(ilan) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Staj ilanları', item: `${SITE}/staj-ilanlari` },
      { '@type': 'ListItem', position: 3, name: ilan.title, item: SITE + ilanYolu(ilan) },
    ],
  };
}

/**
 * GÖRÜNÜR GÖVDE — ilk HTTP yanıtında okunur ilan.
 *
 * Eskiden ilan metni `data-seo-prerender` içinde `display:none` duruyordu:
 * arama motoru okuyordu, insan JavaScript inene kadar nabız atan kutular
 * görüyordu. Artık metin görünür ve kullanıcının React'ten sonra gördüğü
 * bilginin aynısı: başlık, şirket, konum, açıklama (kesilmeden),
 * sorumluluklar, nitelikler, başvuru yolu ve ilgili bağlantılar.
 * Tek bir H1 var; React açılınca kökü kendi ağacıyla değiştiriyor.
 */
/*
  BENZER İLANLAR — İLAN SAYFASINDAN YANA BAĞLANTI (13 Ekim 2026)

  İlan sayfası öbür ilanlara yalnız `/staj-ilanlari` (en yeni 12 ilan)
  üzerinden bağlanıyordu: daha eski bir ilana ulaşmanın yolu sayfalı liste
  ya da site haritasıydı, ilanı okuyan kişiye de "buna benzer ne var"
  gösterilmiyordu. Her ilan sayfası artık en fazla 6 açık ilana gerçek
  <a href> veriyor. Seçim veriden, tahmin yok:
    1. aynı şirketin öbür açık ilanları,
    2. aynı şehirdeki açık ilanlar,
    3. kalan yer en yeni açık ilanlarla doluyor.
  Süresi geçmiş ve ilanın kendisi listeye girmiyor. Kenar çiziminde aday
  listesi ayrı bir (zorunlu olmayan) sorguyla geliyor; o sorgu düşerse
  bölüm çizilmiyor, sayfa yine 200.
*/
export const BENZER_SECIMI = 'id,title,city,posted_at,created_at,application_deadline,companies(name,slug)';
export const BENZER_ADET = 6;

const sehirAnahtari = (c) => {
  const k = String(c || '').trim().toLocaleLowerCase('tr');
  return k && !SEHIR_OLMAYAN.has(k) ? k : '';
};
const yeniOnce = (a, b) => {
  const t = (i) => String(i.posted_at || i.created_at || '');
  const fark = t(b).localeCompare(t(a));
  return fark !== 0 ? fark : String(a.id).localeCompare(String(b.id));
};

export function benzerIlanlariSec(ilan, adaylar, { adet = BENZER_ADET, simdi = Date.now() } = {}) {
  if (!Array.isArray(adaylar) || !adaylar.length) return [];
  const sirket = ilan.companies?.slug || '';
  const sehir = sehirAnahtari(ilan.city);
  /* İlanın kendisi ve aynı kimliğin ikinci kopyası dışarıda. */
  const gorulen = new Set([ilan.id]);
  const uygun = [];
  for (const a of adaylar) {
    if (!a?.id || !a.title || gorulen.has(a.id) || sonBasvuruDurumu(a, simdi).suresiGecti) continue;
    gorulen.add(a.id);
    uygun.push(a);
  }
  const grup = (a) => (sirket && a.companies?.slug === sirket ? 0 : sehir && sehirAnahtari(a.city) === sehir ? 1 : 2);
  return uygun.sort((a, b) => grup(a) - grup(b) || yeniOnce(a, b)).slice(0, adet);
}

export function ilanGorunurGovde(ilan, konumEtiketi, simdi = Date.now(), { sirketSayfasiVar = true, benzerler = [] } = {}) {
  const sirket = ilan.companies || {};
  /* Şirket sayfası yoksa bağlantı verilmiyor (kırık iç bağlantı olmasın). */
  const sirketBag = Boolean(sirket.slug) && sirketSayfasiVar;
  /* İl şehir sayfasının kuralıyla (lib/seo/sehir-sayfalari); React aynısını çağırıyor. */
  const sehirBag = ilanSehirBaglantisi(ilan);
  const { gorunen } = ilanKonumu(ilan, konumEtiketi);
  const durum = sonBasvuruDurumu(ilan, simdi);
  const alt = [sirket.name, gorunen, CALISMA[ilan.work_type]].filter(Boolean).map(kacir).join(' · ');
  const bilgi = [
    sirket.name && (sirketBag
      ? `Şirket: <a href="/sirket/${kacir(sirket.slug)}">${kacir(sirket.name)}</a>`
      : `Şirket: ${kacir(sirket.name)}`),
    gorunen && `Şehir: ${kacir(gorunen)}`,
    CALISMA[ilan.work_type] && `Çalışma şekli: ${CALISMA[ilan.work_type]}`,
    basvurulabilenUlkeler(ilan, simdi).length &&
      `Başvurulabilen ülkeler: ${kacir(basvurulabilenUlkeler(ilan, simdi).map(ulkeAdi).join(', '))}`,
    ilan.duration && `Süre: ${kacir(duzMetin(ilan.duration))}`,
    ilan.min_grade_level && `En az sınıf: ${kacir(String(ilan.min_grade_level))}`,
    durum.metin && `Son başvuru: ${durum.metin}`,
  ].filter(Boolean);
  const aciklama = paragraflar(ilan.description);
  const bolum = (baslik, maddeler) =>
    maddeler.length ? `<h2>${baslik}</h2><ul>${maddeler.map((m) => `<li>${kacir(m)}</li>`).join('')}</ul>` : '';

  const benzerBolumu = benzerler.length
    ? '<h2>Benzer staj ilanları</h2><ul class="sv-benzer">' +
      benzerler
        .map((b) => {
          const yer = sehirAnahtari(b.city) ? konumEtiketi(b.city) : '';
          const alt = [b.companies?.name, yer].filter(Boolean).map(kacir).join(' · ');
          return `<li><a href="${kacir(ilanYolu(b))}">${kacir(b.title)}</a>${alt ? ` — ${alt}` : ''}</li>`;
        })
        .join('') +
      '</ul>'
    : '';
  const hedef = ilanHedefi({ applicationMethod: ilan.application_method, applyUrl: ilan.apply_url });
  const basvuru = durum.suresiGecti
    ? ''
    : hedef.harici && hedef.adres
      ? `<p class="sv-eylem"><a href="${kacir(hedef.adres)}" rel="nofollow noopener" target="_blank">${kacir(hedef.etiket)}</a></p>`
      : hedef.tur === 'basvur'
        ? '<p class="sv-eylem">Başvuru StajımVar üzerinden alınıyor.</p>'
        : '';

  return (
    '<div class="sv-cubuk"></div>' +
    '<main class="sv-metin">' +
    '<nav class="sv-kirinti" aria-label="Sayfa yolu"><a href="/">Ana sayfa</a> › <a href="/staj-ilanlari">Staj ilanları</a></nav>' +
    `<h1>${kacir(ilan.title)}</h1>` +
    (alt ? `<p class="sv-alt">${alt}</p>` : '') +
    (durum.suresiGecti
      ? `<p class="sv-uyari">Başvuru dönemi kapandı. Son başvuru: ${durum.metin}.</p>`
      : '') +
    (bilgi.length ? `<ul class="sv-bilgi">${bilgi.map((b) => `<li>${b}</li>`).join('')}</ul>` : '') +
    (aciklama.length ? `<h2>İlan açıklaması</h2>${aciklama.map((p) => `<p>${kacir(p)}</p>`).join('')}` : '') +
    bolum('Sorumluluklar', dizi(ilan.responsibilities)) +
    bolum('Aranan nitelikler', dizi(ilan.required_skills)) +
    basvuru +
    benzerBolumu +
    '<p class="sv-baglantilar"><a href="/staj-ilanlari">Tüm staj ilanları</a>' +
    (sehirBag ? ` · <a href="${kacir(sehirBag.yol)}">${kacir(sehirBag.metin)}</a>` : '') +
    (sirketBag ? ` · <a href="/sirket/${kacir(sirket.slug)}">${kacir(sirket.name || 'Şirket')} sayfası</a>` : '') +
    ' · <a href="/rehber/staj-basvuru-epostasi">Başvuru e-postası nasıl yazılır</a></p>' +
    '</main>'
  );
}

/**
 * Sayfanın tamamı için `sayfaHtml` girdisi.
 * Dönüş: { yol, s: {baslik, aciklama, gorunurGovde, jsonLd, gorsel}, eksik, suresiGecti }
 */
export function ilanSayfasi(ilan, konumEtiketi, simdi = Date.now(), secenek = {}) {
  const yol = ilanYolu(ilan);
  const { veri, eksik } = ilanJobPosting(ilan, konumEtiketi, simdi);
  const durum = sonBasvuruDurumu(ilan, simdi);
  return {
    yol,
    eksik,
    suresiGecti: durum.suresiGecti,
    s: {
      baslik: ilanSayfaBasligi(ilan, konumEtiketi),
      aciklama: ilanMetaAciklamasi(ilan, konumEtiketi),
      gorsel: `/og/ilan-${yol.slice(-8)}.png`,
      gorunurGovde: ilanGorunurGovde(ilan, konumEtiketi, simdi, secenek),
      /* Kırıntı yolu ilanın kendi grafiğinde; genel kırıntı üreticisi devre dışı. */
      kirintiYok: true,
      jsonLd: { '@context': 'https://schema.org', '@graph': [...(veri ? [veri] : []), ilanKirintisi(ilan)] },
    },
  };
}
