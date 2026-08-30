/**
 * Şirket sahiplenme talebinin otomatik değerlendirmesi.
 *
 * NEDEN VAR
 * ---------
 * Şirket kayıt olduktan sonra bir yöneticinin elle onaylamasını bekliyordu.
 * Bu, işveren hunisindeki en büyük sürtünme: kaydı tamamlayan İK çalışanı
 * panele giremeden ayrılıyor.
 *
 * NEDEN "DOMAIN EŞİTSE ONAYLA" DEĞİL
 * ----------------------------------
 * Naif eşleştirme üç yerden delinir:
 *
 *   1. `contains`: "acme.com" ⊂ "acme.com.evil.com" → saldırgan onaylanır.
 *   2. Ek etiket: "acme-kariyer.com" ile "acme.com" farklı kurumlardır.
 *   3. Genel son ek: "com.tr" ortak son ektir, "sirket.com.tr" ile
 *      "baska.com.tr" aynı kurum DEĞİLDİR.
 *
 * Bu yüzden karşılaştırma KAYITLI ALAN ADI (registrable domain) üzerinden
 * yapılıyor: genel son ekin bir üstündeki etiket. Türkiye'de yaygın olan
 * çok parçalı son ekler (com.tr, org.tr, edu.tr, gov.tr, k12.tr…) listede.
 *
 * KARAR ÜÇLÜ, İKİLİ DEĞİL
 * -----------------------
 * OTOMATIK_ONAY  — kurumsal alan adı şirketin sitesiyle aynı kuruma ait
 * ELLE_INCELE    — şüpheli değil ama kanıt yetmiyor
 * ELLE_INCELE    — riskli sinyal (tek kullanımlık posta, test alan adı)
 *
 * REDDETME YOK. Bir talebi otomatik reddetmek, gerçek bir şirketi sessizce
 * kapıda bırakmak demek; yanlış onaydan daha az görünür ama daha kalıcı bir
 * hata. Riskli olan her şey insana gidiyor.
 *
 * BU DOSYA KAPININ KENDİSİ DEĞİL
 * ------------------------------
 * Asıl karar veritabanında, aynı kuralın SQL kopyasında veriliyor
 * (`sirket_dogrulama_karari`). Buradaki kopya kullanıcıya doğru mesajı
 * göstermek için; istemci kandırılabilir, tetikleyici kandırılamaz.
 * İkisi birlikte değişmeli — testler ikisinin de aynı vakaları geçtiğini
 * sınıyor.
 */

export const KARAR = {
  OTOMATIK_ONAY: 'OTOMATIK_ONAY',
  ELLE_INCELE: 'ELLE_INCELE',
};

/**
 * Ücretsiz/kişisel e-posta sağlayıcıları.
 *
 * Engellenmiyor: küçük işletmelerin çoğu Gmail kullanıyor ve kapıyı
 * kapatmak onları dışarıda bırakır. Yalnızca otomatik onaya yetmiyor.
 */
export const SERBEST_SAGLAYICILAR = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.com.tr',
  'outlook.com',
  'outlook.com.tr',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.tr',
  'icloud.com',
  'me.com',
  'aol.com',
  'yandex.com',
  'yandex.com.tr',
  'yandex.ru',
  'mail.ru',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'zoho.com',
  'mynet.com',
  'superonline.com',
  'ttmail.com',
]);

/**
 * Tek kullanımlık posta alan adları.
 *
 * Liste tam değil ve olamaz — amaç en yaygın olanları otomatik onaydan
 * çıkarmak. Kaçan bir tanesi yönetici kuyruğuna değil, otomatik onaya
 * giderdi; o yüzden liste yalnızca "otomatik onay verme" yönünde
 * kullanılıyor, reddetmek için değil.
 */
export const TEK_KULLANIMLIK = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
  'fakeinbox.com',
  'throwawaymail.com',
  'maildrop.cc',
  'mailnesia.com',
  'spamgourmet.com',
]);

/**
 * Çok parçalı genel son ekler (public suffix).
 *
 * Tam PSL'i taşımak bir bağımlılık ve ~200 KB veri demek. Bunun yerine
 * Türkiye'de ve dünyada yaygın olan çok parçalı son ekler listeleniyor;
 * listede olmayan her şey tek parçalı son ek sayılıyor (".com", ".io").
 *
 * Listenin eksik olması GÜVENLİĞİ ZAYIFLATMIYOR: bilinmeyen çok parçalı
 * bir son ekte kayıtlı alan adı olduğundan bir etiket kısa hesaplanır ve
 * eşleşme BULUNAMAZ — yani hata otomatik onay değil, elle inceleme
 * yönünde. Yanlış yön güvenli yön.
 */
const COK_PARCALI_SON_EKLER = new Set([
  'com.tr', 'org.tr', 'net.tr', 'gov.tr', 'edu.tr', 'k12.tr', 'bel.tr',
  'pol.tr', 'tsk.tr', 'av.tr', 'dr.tr', 'name.tr', 'gen.tr', 'web.tr',
  'biz.tr', 'info.tr', 'tv.tr', 'bbs.tr',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'net.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'net.nz', 'org.nz',
  'com.br', 'net.br', 'org.br',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
  'co.kr', 'or.kr',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn',
  'co.in', 'net.in', 'org.in',
  'com.mx', 'com.ar', 'com.co', 'com.sg', 'com.hk', 'com.tw',
  'co.za', 'com.ua', 'com.pl', 'com.gr', 'com.cy',
  'co.il', 'com.sa', 'com.eg', 'com.qa', 'com.kw',
]);

/** Otomatik onaya asla girmeyen alan adları. */
const YEREL_VE_TEST = new Set([
  'localhost',
  'localhost.localdomain',
  'test',
  'invalid',
  'example',
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'local',
]);

/* ------------------------------------------------------------------ */
/*  ALAN ADI ÇÖZÜMLEME                                                 */
/* ------------------------------------------------------------------ */

const kucult = (deger) => String(deger ?? '').trim().toLowerCase();

/** E-postanın alan adı. Birden çok "@" varsa SONUNCUSU alınıyor. */
export function epostaAlanAdi(eposta) {
  const temiz = kucult(eposta);
  const at = temiz.lastIndexOf('@');
  if (at < 1 || at === temiz.length - 1) return null;
  const alan = temiz.slice(at + 1).replace(/\.+$/, '');
  return gecerliAlanMi(alan) ? alan : null;
}

/**
 * Site adresinden ana makine adı.
 *
 * Protokol, "www.", yol, sorgu, çapa, kullanıcı bilgisi ve port
 * ayıklanıyor. Şema yoksa https varsayılıyor — kullanıcılar site
 * adresini çoğunlukla "ornek.com.tr" diye yazıyor.
 */
export function siteAlanAdi(site) {
  let ham = kucult(site);
  if (!ham) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(ham)) ham = `https://${ham}`;

  let makine;
  try {
    const url = new URL(ham);
    /*
      Yalnızca http(s). "javascript:", "data:" ve "file:" adresleri bir
      şirket sitesi değil; buraya düşerse otomatik onay hiç konuşulmamalı.
    */
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    makine = url.hostname;
  } catch {
    return null;
  }

  makine = makine.replace(/\.+$/, '').replace(/^www\./, '');
  return gecerliAlanMi(makine) ? makine : null;
}

function gecerliAlanMi(alan) {
  if (!alan || alan.length > 253) return false;
  /* IP adresi bir kurum alan adı değil. */
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(alan)) return false;
  if (alan.includes(':')) return false;
  if (!alan.includes('.')) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(alan);
}

/**
 * Kayıtlı alan adı: genel son ekin bir üstündeki etiket dahil.
 *
 *   kariyer.ornek.com.tr → ornek.com.tr
 *   www.acme.com         → acme.com
 *   acme.com.evil.com    → evil.com
 */
export function kayitliAlanAdi(alan) {
  const temiz = kucult(alan);
  if (!gecerliAlanMi(temiz)) return null;

  const parcalar = temiz.split('.');
  const sonIki = parcalar.slice(-2).join('.');

  if (COK_PARCALI_SON_EKLER.has(sonIki)) {
    /* "com.tr" tek başına kayıtlı alan adı değil; en az üç etiket gerekiyor. */
    return parcalar.length >= 3 ? parcalar.slice(-3).join('.') : null;
  }
  return parcalar.length >= 2 ? sonIki : null;
}

/**
 * İki alan adı aynı kuruma mı ait?
 *
 * Kayıtlı alan adları BİREBİR eşit olmalı. "içerir" ya da "ile biter"
 * karşılaştırması yapılmıyor: `acme.com.evil.com` ile `acme.com` bu
 * yüzden eşleşmiyor.
 */
export function ayniKurumMu(siteAlan, epostaAlan) {
  const a = kayitliAlanAdi(siteAlan);
  const b = kayitliAlanAdi(epostaAlan);
  return Boolean(a && b && a === b);
}

/* ------------------------------------------------------------------ */
/*  KARAR                                                              */
/* ------------------------------------------------------------------ */

/**
 * Sahiplenme talebini değerlendirir.
 *
 * @param {{siteUrl?: string|null, eposta?: string|null}} girdi
 * @returns {{karar: string, gerekce: string, sinyaller: string[]}}
 *   gerekce makine tarafından okunabilir bir kod; ekranda gösterilecek
 *   metin ayrı (bu dosya arayüz metni üretmiyor).
 */
export function sirketDogrulamaKarari({ siteUrl, eposta } = {}) {
  const sinyaller = [];
  const epostaAlan = epostaAlanAdi(eposta);
  const siteAlan = siteAlanAdi(siteUrl);

  if (!epostaAlan) {
    return { karar: KARAR.ELLE_INCELE, gerekce: 'EPOSTA_OKUNAMADI', sinyaller };
  }

  const epostaKayitli = kayitliAlanAdi(epostaAlan);

  if (YEREL_VE_TEST.has(epostaAlan) || YEREL_VE_TEST.has(epostaKayitli ?? '')) {
    sinyaller.push('TEST_ALAN_ADI');
    return { karar: KARAR.ELLE_INCELE, gerekce: 'TEST_ALAN_ADI', sinyaller };
  }
  if (TEK_KULLANIMLIK.has(epostaAlan) || TEK_KULLANIMLIK.has(epostaKayitli ?? '')) {
    sinyaller.push('TEK_KULLANIMLIK_EPOSTA');
    return { karar: KARAR.ELLE_INCELE, gerekce: 'TEK_KULLANIMLIK_EPOSTA', sinyaller };
  }
  if (SERBEST_SAGLAYICILAR.has(epostaAlan)) {
    sinyaller.push('SERBEST_SAGLAYICI');
    return { karar: KARAR.ELLE_INCELE, gerekce: 'KURUMSAL_EPOSTA_DEGIL', sinyaller };
  }

  sinyaller.push('KURUMSAL_EPOSTA');

  if (!siteAlan) {
    return { karar: KARAR.ELLE_INCELE, gerekce: 'SIRKET_SITESI_YOK', sinyaller };
  }
  if (YEREL_VE_TEST.has(siteAlan) || YEREL_VE_TEST.has(kayitliAlanAdi(siteAlan) ?? '')) {
    sinyaller.push('TEST_ALAN_ADI');
    return { karar: KARAR.ELLE_INCELE, gerekce: 'TEST_ALAN_ADI', sinyaller };
  }

  if (ayniKurumMu(siteAlan, epostaAlan)) {
    sinyaller.push('ALAN_ADI_ESLESTI');
    return { karar: KARAR.OTOMATIK_ONAY, gerekce: 'KURUMSAL_ALAN_ADI_SITEYLE_ESLESTI', sinyaller };
  }

  sinyaller.push('ALAN_ADI_ESLESMEDI');
  return { karar: KARAR.ELLE_INCELE, gerekce: 'ALAN_ADI_SITEYLE_ESLESMIYOR', sinyaller };
}

/** Kullanıcıya gösterilecek kısa metin. Süre garantisi verilmiyor. */
export function dogrulamaMesaji(karar) {
  return karar === KARAR.OTOMATIK_ONAY
    ? 'Şirket hesabınız doğrulandı.'
    : 'Bilgilerinizi kontrol ediyoruz.';
}
