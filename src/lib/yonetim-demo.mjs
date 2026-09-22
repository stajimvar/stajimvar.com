/**
 * YÖNETİM PANELİ — DEMO VERİ VE CANLI OTURUM SİMÜLASYONU
 *
 * NEDEN DEMO VERİ
 * ---------------
 * Panelin istediği trafik verisi (giren / bakan / çıkan) bugün
 * toplanmıyor. `AdminDashboard` yorumunda yazdığı gibi ziyaretçi izi
 * bilerek tutulmuyordu ve trafik Cloudflare'e bırakılmıştı. Ekranları
 * gerçek API gelmeden çizebilmek için burada üretiliyor.
 *
 * Bu dosya ÜRÜN VERİSİ ÜRETMİYOR: öğrenci sayısı, ilan sayısı ve
 * başvurular panelde yine `fetchAdminOzet` üzerinden GERÇEK
 * veritabanından geliyor. Burada üretilen tek şey, bugün hiç
 * toplanmayan ziyaretçi akışı.
 *
 * ÇEREZ YOK, KİŞİ İZİ YOK
 * -----------------------
 * Misafir ziyaretçi üç şeyle temsil ediliyor: şehir, baktığı sayfa ve
 * nereden geldiği. İsim yalnızca GİRİŞ YAPMIŞ öğrenci ya da şirkette
 * var — o bilgi zaten bizde. Gerçek API bağlandığında sözleşme bu
 * kalmalı: oturum kimliği kalıcı bir tanımlayıcı değil, sayfa
 * değiştikçe yaşayan geçici bir kayıt.
 *
 * SAYILAR UYDURMA DEĞİL, TUTARLI
 * ------------------------------
 * Üretilen değerler birbirini tutuyor: sayfa görüntüleme tekil
 * ziyaretçiden küçük olamıyor, huni adımları azalarak ilerliyor,
 * şehir dağılımının toplamı tekil sayısına eşit. Panelde "gerçek gibi
 * duran ama kendi içinde çelişen" bir tablo göstermek, demo veriyi
 * yanıltıcı yapardı.
 */

/* ------------------------------------------------------------------ */
/*  SABİT SÖZLÜKLER — GERÇEK TÜRKİYE İÇERİĞİ                           */
/* ------------------------------------------------------------------ */

export const SEHIRLER = [
  { ad: 'İstanbul', agirlik: 42 },
  { ad: 'Ankara', agirlik: 14 },
  { ad: 'İzmir', agirlik: 11 },
  { ad: 'Bursa', agirlik: 6 },
  { ad: 'Kocaeli', agirlik: 5 },
  { ad: 'Antalya', agirlik: 5 },
  { ad: 'Konya', agirlik: 4 },
  { ad: 'Adana', agirlik: 3 },
  { ad: 'Eskişehir', agirlik: 3 },
  { ad: 'Manisa', agirlik: 2 },
  { ad: 'Tekirdağ', agirlik: 2 },
  { ad: 'Trabzon', agirlik: 3 },
];

export const SIRKETLER = [
  'FedEx', 'Paynion', 'SC Johnson', 'Schindler', 'Volvo Group',
  'UPS', 'Lalamove', 'GE HealthCare', 'Veralto', 'Estée Lauder',
];

export const UNIVERSITELER = [
  'Boğaziçi Üniversitesi', 'Orta Doğu Teknik Üniversitesi',
  'İstanbul Teknik Üniversitesi', 'Koç Üniversitesi',
  'Sabancı Üniversitesi', 'Hacettepe Üniversitesi',
  'Ege Üniversitesi', 'Yıldız Teknik Üniversitesi',
];

export const BOLUMLER = [
  'Bilgisayar Mühendisliği', 'Endüstri Mühendisliği', 'İşletme',
  'Makine Mühendisliği', 'Elektrik-Elektronik Mühendisliği',
  'İktisat', 'Grafik Tasarım', 'Lojistik',
];

/** Misafir ziyaretçi adları YOK — yalnız giriş yapmış kullanıcıda ad var. */
const OGRENCI_ADLARI = [
  'Elif Yılmaz', 'Mert Kaya', 'Zeynep Demir', 'Ahmet Şahin',
  'Ece Aydın', 'Burak Çelik', 'Deniz Arslan', 'Selin Koç',
];

const SIRKET_KULLANICILARI = [
  'Paynion İK', 'Schindler İK', 'Lalamove İK', 'Veralto İK',
];

export const SAYFALAR = [
  { yol: '/', ad: 'Ana sayfa', agirlik: 26 },
  { yol: '/staj-ilanlari', ad: 'Staj ilanları', agirlik: 21 },
  { yol: '/rehber/staj-cv-nasil-yazilir', ad: 'Rehber: Staj CV', agirlik: 9 },
  { yol: '/rehber/zorunlu-staj-rehberi', ad: 'Rehber: Zorunlu staj', agirlik: 8 },
  { yol: '/bolum/bilgisayar-muhendisligi', ad: 'Bölüm: Bilgisayar Müh.', agirlik: 7 },
  { yol: '/ilan', ad: 'İlan detayı', agirlik: 15 },
  { yol: '/sirketler', ad: 'Şirketler', agirlik: 5 },
  { yol: '/burslar', ad: 'Burslar', agirlik: 5 },
  { yol: '/giris', ad: 'Giriş', agirlik: 4 },
];

export const KAYNAKLAR = [
  { ad: 'Google', tur: 'arama', agirlik: 54 },
  { ad: 'Doğrudan', tur: 'dogrudan', agirlik: 22 },
  { ad: 'Instagram', tur: 'sosyal', agirlik: 12 },
  { ad: 'LinkedIn', tur: 'sosyal', agirlik: 6 },
  { ad: 'X', tur: 'sosyal', agirlik: 3 },
  { ad: 'Bing', tur: 'arama', agirlik: 3 },
];

export const CIHAZLAR = [
  { ad: 'Mobil', agirlik: 71 },
  { ad: 'Masaüstü', agirlik: 24 },
  { ad: 'Tablet', agirlik: 5 },
];

/* ------------------------------------------------------------------ */
/*  BİÇİMLEME — tr-TR                                                  */
/* ------------------------------------------------------------------ */

/** 1042 → "1.042". Panelin her yerinde aynı biçim. */
export function sayi(deger) {
  if (deger === null || deger === undefined || Number.isNaN(deger)) return '—';
  return new Intl.NumberFormat('tr-TR').format(Math.round(deger));
}

/** 0.412 → "%41,2" */
export function yuzde(oran, basamak = 1) {
  if (oran === null || oran === undefined || Number.isNaN(oran)) return '—';
  return `%${(oran * 100).toFixed(basamak).replace('.', ',')}`;
}

/**
 * Saniye → "18 sn" / "18 dk" / "2 sa 5 dk".
 *
 * Saat ve dakika birlikte yazılıyor: "2 sa" tek başına 2 saat 55
 * dakikayı da anlatır ve fark gizlenir.
 */
export function sure(saniye) {
  if (saniye === null || saniye === undefined || Number.isNaN(saniye)) return '—';
  const s = Math.max(0, Math.round(saniye));
  if (s < 60) return `${s} sn`;
  const dk = Math.floor(s / 60);
  if (dk < 60) return `${dk} dk`;
  const sa = Math.floor(dk / 60);
  const kalan = dk % 60;
  return kalan ? `${sa} sa ${kalan} dk` : `${sa} sa`;
}

/* ------------------------------------------------------------------ */
/*  YİNELENEBİLİR RASTGELELİK                                          */
/* ------------------------------------------------------------------ */

/*
  TOHUMLU ÜRETEÇ: aynı tohum aynı tabloyu veriyor.

  `Math.random()` kullanılsaydı panel her çizimde farklı sayılar
  gösterirdi ve "dün 1.042 kişi girdi" yazısı sayfa yenilendiğinde
  değişirdi — demo bile olsa okuyanı yanıltır. Canlı akış ayrı:
  o BİLEREK değişiyor ve zaten "şu an" diyor.
*/
export function uretec(tohum = 20260922) {
  let x = tohum >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

function agirlikliSec(liste, rnd) {
  const toplam = liste.reduce((a, b) => a + b.agirlik, 0);
  let n = rnd() * toplam;
  for (const x of liste) {
    n -= x.agirlik;
    if (n <= 0) return x;
  }
  return liste[liste.length - 1];
}

/* ------------------------------------------------------------------ */
/*  TRAFİK ÖZETİ                                                       */
/* ------------------------------------------------------------------ */

/**
 * Bir dönem için trafik özeti.
 *
 * Değerler birbirini TUTUYOR: görüntüleme tekilden büyük, huni
 * adımları azalarak iniyor, şehir dağılımının toplamı tekile eşit.
 *
 * @param {'bugun'|'yedi'|'otuz'} donem
 */
export function trafikOzeti(donem = 'yedi') {
  const gun = donem === 'bugun' ? 1 : donem === 'otuz' ? 30 : 7;
  const rnd = uretec(20260922 + gun);

  const gunler = [];
  for (let i = gun - 1; i >= 0; i -= 1) {
    const tarih = new Date();
    tarih.setDate(tarih.getDate() - i);
    /* Hafta sonu düşüşü: öğrenci trafiği hafta içi yoğun. */
    const haftaSonu = tarih.getDay() === 0 || tarih.getDay() === 6;
    const taban = haftaSonu ? 430 : 760;
    const tekil = Math.round(taban + rnd() * 260);
    gunler.push({
      tarih: tarih.toISOString().slice(0, 10),
      etiket: tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      tekil,
      goruntuleme: Math.round(tekil * (2.1 + rnd() * 0.6)),
    });
  }

  const tekil = gunler.reduce((a, b) => a + b.tekil, 0);
  const goruntuleme = gunler.reduce((a, b) => a + b.goruntuleme, 0);

  /*
    Dağılımlar bir TOPLAMA bölünüyor ve payların toplamı o sayıya eşit
    kalıyor. Hangi toplam olduğu dağılıma göre değişiyor: kaynak, şehir
    ve cihaz KİŞİ sayar, dolayısıyla tekile bölünüyor; "en çok bakılan
    sayfalar" ise BAKIŞ sayar ve görüntülemeye bölünüyor. İkisini de
    tekile bölmek, sayfa listesinin yüzdelerini yanlış tabana oturtup
    başlığıyla çelişen bir tablo çıkarıyordu.
  */
  const dagit = (liste, toplam) => {
    const toplamAgirlik = liste.reduce((a, b) => a + b.agirlik, 0);
    let kalan = toplam;
    return liste.map((x, i) => {
      const pay = i === liste.length - 1
        ? kalan
        : Math.round((toplam * x.agirlik) / toplamAgirlik);
      kalan -= pay;
      return { ...x, adet: Math.max(0, pay) };
    });
  };

  /*
    HUNİ: her adım bir öncekinin ALT KÜMESİ.

    Adımlar bağımsız üretilseydi "ilan görüntüleyen sayısı siteye
    girenden fazla" gibi imkânsız bir tablo çıkabilirdi.

    HUNİ NEDEN "HESAP OLUŞTURDU" İLE BİTMİYOR
    -----------------------------------------
    Kaç hesap açıldığını GERÇEKTEN biliyoruz; o sayı veritabanından
    geliyor ve panelin Özet bölümünde yazıyor. Aynı ekrana bir de demo
    huninin uydurduğu hesap sayısını koymak, panelin kendi kendisiyle
    çeliştiği bir tablo yaratıyordu: üstte gerçek kayıt sayısı, altta
    ondan kat kat büyük bir demo sayısı. Huni bu yüzden ölçemediğimiz
    adımlarda kalıyor ve ölçtüğümüz adımı tekrar etmiyor.
  */
  const huni = [
    { ad: 'Siteye girdi', adet: tekil },
    { ad: 'İlan listesine baktı', adet: Math.round(tekil * 0.62) },
    { ad: 'İlan detayı açtı', adet: Math.round(tekil * 0.34) },
    { ad: 'Başvuru adımına gitti', adet: Math.round(tekil * 0.11) },
  ];

  return {
    donem,
    gunler,
    tekil,
    goruntuleme,
    /* Tek sayfada kalıp çıkanların oranı. */
    bounce: 0.38 + rnd() * 0.06,
    ortalamaOturum: 96 + Math.round(rnd() * 60),
    kaynaklar: dagit(KAYNAKLAR, tekil),
    sehirler: dagit(SEHIRLER, tekil),
    cihazlar: dagit(CIHAZLAR, tekil),
    sayfalar: dagit(SAYFALAR, goruntuleme).sort((a, b) => b.adet - a.adet),
    huni,
  };
}

/* ------------------------------------------------------------------ */
/*  CANLI OTURUMLAR                                                    */
/* ------------------------------------------------------------------ */

/**
 * TİP JSDOC İLE, `.d.ts` İLE DEĞİL.
 *
 * Bu depoda hiç `.d.ts` yok ve `allowJs` açık: TypeScript tipleri
 * JS'ten çıkarıyor. Çıkarım `tur` alanını `string` görüyordu, oysa
 * yalnız üç değer alabiliyor — kancada tip hatası veriyordu.
 *
 * Çağıran tarafta `as` ile zorlamak yerine tip KAYNAĞA yazıldı:
 * zorlama, ileride buraya dördüncü bir tür eklendiğinde hatayı
 * susturur ve arayüz onu tanımadan çizmeye çalışırdı.
 *
 * @typedef {'ogrenci'|'sirket'|'misafir'} OturumTuru
 * @typedef {{kimlik: string, tur: OturumTuru, ad: string|null, sehir: string,
 *   yol: string, sayfaAdi: string, kaynak: string, cihaz: string,
 *   basladi: number, sayfaSayisi: number}} Oturum
 * @typedef {{tur: 'girdi'|'cikti'|'sayfa', oturum: Oturum, an: number}} Olay
 */

let sayac = 0;
const yeniKimlik = () => `o${(sayac += 1).toString(36)}${Date.now().toString(36).slice(-4)}`;

/**
 * Bir oturum üretir.
 *
 * MİSAFİRDE AD YOK: `ad` alanı yalnız giriş yapmış öğrenci ve şirket
 * kullanıcısında dolu. Misafir şehir + sayfa + kaynak ile anılıyor.
 *
 * @returns {Oturum}
 */
export function oturumUret(rnd = uretec(Date.now())) {
  const p = rnd();
  /** @type {OturumTuru} */
  const tur = p < 0.14 ? 'ogrenci' : p < 0.19 ? 'sirket' : 'misafir';
  const sehir = agirlikliSec(SEHIRLER, rnd).ad;
  const sayfa = agirlikliSec(SAYFALAR, rnd);
  const kaynak = agirlikliSec(KAYNAKLAR, rnd);
  const cihaz = agirlikliSec(CIHAZLAR, rnd).ad;
  const ad =
    tur === 'ogrenci'
      ? OGRENCI_ADLARI[Math.floor(rnd() * OGRENCI_ADLARI.length)]
      : tur === 'sirket'
        ? SIRKET_KULLANICILARI[Math.floor(rnd() * SIRKET_KULLANICILARI.length)]
        : null;
  return {
    kimlik: yeniKimlik(),
    tur,
    ad,
    sehir,
    yol: sayfa.yol,
    sayfaAdi: sayfa.ad,
    kaynak: kaynak.ad,
    cihaz,
    basladi: Date.now() - Math.round(rnd() * 240000),
    sayfaSayisi: 1 + Math.floor(rnd() * 4),
  };
}

/**
 * Başlangıç oturum kümesi.
 * @returns {Oturum[]}
 */
export function ilkOturumlar(adet = 23) {
  const rnd = uretec(20260922);
  return Array.from({ length: adet }, () => oturumUret(rnd));
}

/**
 * Bir tık ilerlet: kimisi çıkar, kimisi girer, kimisi sayfa değiştirir.
 *
 * Saf işlev: girdi dizisini değiştirmiyor, yeni dizi ve olaylar
 * döndürüyor. Böylece React durumu öngörülebilir kalıyor ve aynı
 * girdiyle aynı sonuç test edilebiliyor.
 */
export function oturumlariIlerlet(oturumlar, rnd = uretec(Date.now())) {
  const olaylar = [];
  const kalan = [];

  for (const o of oturumlar) {
    const p = rnd();
    if (p < 0.12) {
      olaylar.push({ tur: /** @type {const} */ ('cikti'), oturum: o, an: Date.now() });
      continue;
    }
    if (p < 0.3) {
      const yeniSayfa = agirlikliSec(SAYFALAR, rnd);
      const guncel = { ...o, yol: yeniSayfa.yol, sayfaAdi: yeniSayfa.ad, sayfaSayisi: o.sayfaSayisi + 1 };
      olaylar.push({ tur: /** @type {const} */ ('sayfa'), oturum: guncel, an: Date.now() });
      kalan.push(guncel);
      continue;
    }
    kalan.push(o);
  }

  const girenAdet = Math.floor(rnd() * 3);
  for (let i = 0; i < girenAdet; i += 1) {
    const yeni = oturumUret(rnd);
    yeni.basladi = Date.now();
    olaylar.push({ tur: /** @type {const} */ ('girdi'), oturum: yeni, an: Date.now() });
    kalan.push(yeni);
  }

  return { oturumlar: kalan, olaylar };
}
