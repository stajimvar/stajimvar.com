/**
 * KAYITLI ARAMA — TEK EŞLEŞME GERÇEĞİ
 *
 * Liste ekranı ve günlük özet işçisi AYNI dosyayı çağırıyor. İki ayrı
 * uygulama yazmak, kullanıcıya listede görünen ilanın e-postada
 * görünmemesi (ya da tersi) demekti ve ikisinin zamanla ayrışmasını
 * kimse fark etmezdi.
 *
 * NEDEN YEREL MODÜL, NEDEN RPC DEĞİL
 * ----------------------------------
 * Tarayıcı ve işçi bu dosyayı GERÇEKTEN birlikte kullanabiliyor: depo
 * zaten `src/lib/*.mjs` modüllerini hem React bileşenlerinden hem
 * `scripts/*.mjs` betiklerinden içe alıyor (ör. `bolum-eslestirme.mjs`,
 * `basvuru-yolu.mjs`). Eşleşmeyi veritabanı fonksiyonuna taşımak,
 * listedeki etkileşimli süzmeyi her tuş vuruşunda ağ isteğine
 * çevirirdi.
 *
 * FİLTRE SÜRÜMÜ
 * -------------
 * Kayıtlı filtreler JSON olarak saklanıyor ama DOĞRULAMASIZ
 * çalıştırılmıyor: `filtreleriDogrula` bilinmeyen alanı atıyor,
 * tanınmayan değeri düşürüyor ve sürümü damgalıyor. Eski sürümle
 * kaydedilmiş arama okunmaya devam ediyor — alanlar birer birer
 * yükseltiliyor, kayıt reddedilmiyor.
 */

/*
  ÜLKE KODU DOĞRULAMASI MEVCUT MODÜLDEN

  Kendi kalıbımı yazmıştım (`/^[A-Z]{2}$/`) ve test yakaladı: "XX" o
  kalıptan geçiyor ama geçerli bir ülke kodu değil. Liste ekranı zaten
  `normalizeCountryCode` kullanıyor ve `Intl.DisplayNames` ile gerçek
  bölge adına bakıyor — ikinci bir doğrulama yazmak, kayıtlı aramanın
  listenin kabul etmediği bir ülkeyi kabul etmesi demekti.
*/
import { normalizeCountryCode } from './global-preferences.mjs';

/*
  AYNI BÖLÜM SÖZLÜĞÜ — LİSTE, BÖLÜM SAYFASI VE SIRALAMA

  Bölüm filtresi ilk hâlde slug'ı başlık/açıklamada ALT DİZE olarak
  arıyordu ve canlıda ölçtüm: `?bolum=bilgisayar-muhendisligi` HİÇBİR
  ilanla eşleşmiyor, çünkü "bilgisayar-muhendisligi" hiçbir başlıkta
  geçmiyor ve `department_tags` üretimde boş.

  Doğru köprü sözlük: slug → alan (`bolumunAlani`), metin → alan
  (`alanEslestir`). Böylece "bilgisayar-muhendisligi" ile "Yazılım
  Stajyeri" aynı alanda buluşuyor ve bölüm sayfasından gelen bağlantı
  gerçek sonuç gösteriyor.
*/
import { alanEslestir, bolumunAlani } from './bolum-eslestirme.mjs';

/** Şu anki filtre sözleşmesi. Alan eklenince artıyor. */
export const FILTRE_SURUMU = 1;

/** Rıza metni — e-posta açılırken gösterilen ve kaydedilen metin. */
export const RIZA_METNI =
  'Yeni eşleşen ilanları günlük e-posta özetiyle almak istiyorum. İstediğim zaman kapatabilirim.';

export const RIZA_METNI_SURUMU = 1;

/** Bir özette en fazla kaç ilan. Kalanlar sonraki güne devrediyor. */
export const OZET_ILAN_SINIRI = 10;

const CALISMA_BICIMLERI = new Set(['On-site', 'Hybrid', 'Remote']);

function metin(deger) {
  return typeof deger === 'string' ? deger.trim() : '';
}

function katla(deger) {
  let s = metin(deger).toLocaleLowerCase('tr-TR');
  for (const [a, b] of [
    ['ç', 'c'], ['ğ', 'g'], ['ı', 'i'], ['ö', 'o'], ['ş', 's'], ['ü', 'u'], ['â', 'a'], ['î', 'i'],
  ]) {
    s = s.split(a).join(b);
  }
  return s;
}

/**
 * Kaydedilen filtreleri doğrular ve normalleştirir.
 *
 * SUNUCU TARAFINDA DA ÇAĞRILIYOR: istemciden gelen JSON'a güvenmiyoruz.
 * Tanınmayan alan atılıyor, tanınmayan değer düşürülüyor — kayıt
 * reddedilmiyor, çünkü bir alanı anlamamak aramanın tamamını
 * kaybetmek için sebep değil.
 */
export function filtreleriDogrula(ham) {
  const g = ham && typeof ham === 'object' ? ham : {};

  const q = metin(g.q).slice(0, 200);

  /*
    ÜLKE — 'all' | 'remote' | ISO 3166-1 alpha-2

    `remote` özel bir değer ve GERÇEK Remote ilanları demek; bir ülke
    kodu değil. Eşleşme tarafında `country_code`e hiç bakılmıyor.
  */
  const country = normalizeCountryCode(metin(g.country), { allowSpecial: true }) ?? 'all';

  const city = metin(g.city).slice(0, 60) || 'all';

  const workTypes = Array.isArray(g.workTypes)
    ? [...new Set(g.workTypes.filter((w) => CALISMA_BICIMLERI.has(w)))]
    : [];

  /*
    ŞİRKET — KALICI ARAMA ANLAMI VAR

    "Bu şirkette staj arıyorum" yarın da geçerli bir istek. Listede
    uygulanabilen bir filtre olduğu hâlde kaydedilmiyordu: kullanıcı
    şirket seçip aramayı kaydetseydi, e-posta bütün şirketleri
    gönderirdi — yani kaydettiği aramadan farklı bir sonuç.
  */
  const companies = Array.isArray(g.companies)
    ? [...new Set(g.companies.map((c) => metin(c).slice(0, 120)).filter(Boolean))].slice(0, 20)
    : [];

  /*
    TARİH ARALIĞI — "SON N GÜNDE EKLENEN"

    Listede 'all' | '1' | '3' | '7' | '30' olarak duruyor. Kayıtlı
    aramada anlamı korunuyor: kullanıcı "yalnız yeni eklenenler"
    dediyse e-posta da onu uygulamalı.
  */
  const gunler = Number(g.postedWithinDays);
  const postedWithinDays = [1, 3, 7, 30].includes(gunler) ? gunler : null;

  const departments = Array.isArray(g.departments)
    ? [...new Set(g.departments.map((d) => metin(d).slice(0, 80)).filter(Boolean))].slice(0, 10)
    : [];

  /*
    ÜCRET — 'all' | 'paid' | 'unpaid'

    `is_paid` ÜÇ DEĞERLİ (göç 20261001010000): null "kaynak
    söylemiyor" demek. null kayıtlar NE ücretli NE ücretsiz filtresine
    giriyor; ikisine de katmak kanıtsız bir iddia olurdu.
  */
  const pay = ['paid', 'unpaid'].includes(metin(g.pay)) ? metin(g.pay) : 'all';

  const mandatory = g.mandatory === true;
  const voluntary = g.voluntary === true;

  return {
    surum: FILTRE_SURUMU,
    q,
    country,
    city,
    workTypes,
    companies,
    postedWithinDays,
    departments,
    pay,
    mandatory,
    voluntary,
  };
}

/*
  KANONİK SÖZLEŞMEYE GİRMEYENLER — VE NEDEN

  uyum puanı      Kullanıcının profiline göre hesaplanan bir SIRALAMA
                  eşiği. Profil değişince aynı arama farklı sonuç
                  verirdi; e-posta ile liste ayrışırdı.
  kategori sekmesi Görünüm sekmesi ("Sana uygun", "Yeni"…), veri
                  filtresi değil.
  şehirde "diğer" "Tanımlı il listesinin dışında kalanlar" — liste
                  görünümüne ait bir kova; kayıtlı arama somut bir
                  şehir (ya da hepsi) tutuyor.

  Bu üçü SESSİZCE yok sayılmıyor: kaydetme ekranı hangilerinin
  kaydedildiğini ve hangilerinin dışarıda kaldığını yazıyor.
*/
export const KAYDEDILMEYEN_FILTRELER = [
  'Uyum puanı eşiği',
  'Görünüm sekmesi',
  'Şehirde “diğer”',
];

/** Hiç filtre uygulanmamış mı? Boş arama kaydetmek anlamsız. */
export function filtreBosMu(filtreler) {
  const f = filtreleriDogrula(filtreler);
  return (
    !f.q &&
    f.country === 'all' &&
    f.city === 'all' &&
    f.workTypes.length === 0 &&
    f.companies.length === 0 &&
    f.postedWithinDays === null &&
    f.departments.length === 0 &&
    f.pay === 'all' &&
    !f.mandatory &&
    !f.voluntary
  );
}

/**
 * İlanı kanonik şekle çevirir.
 *
 * Hem veritabanı satırı (snake_case) hem ürün nesnesi (camelCase)
 * kabul ediyor: liste ekranı ikincisiyle, işçi birincisiyle çalışıyor
 * ve ikisi de AYNI eşleşme fonksiyonuna giriyor.
 */
export function ilaniNormalize(kayit) {
  const k = kayit ?? {};
  const sec = (a, b) => (k[a] !== undefined && k[a] !== null ? k[a] : k[b]);

  const bolumEtiketleri = sec('department_tags', 'departmentTags');
  const tekBolum = sec('department', 'department');

  return {
    id: k.id ?? null,
    title: metin(sec('title', 'title')),
    companyName: metin(sec('company_name', 'companyName')),
    city: metin(sec('city', 'city')),
    workType: metin(sec('work_type', 'workType')),
    countryCode: metin(sec('country_code', 'countryCode')) || null,
    /* Üç değerli: true / false / null. `?? null` şart — `|| null`
       false'u da null yapardı ve "açık ücretsiz" kaybolurdu. */
    isPaid: (() => {
      const v = k.is_paid !== undefined ? k.is_paid : k.isPaid;
      return v === true || v === false ? v : null;
    })(),
    mandatoryStajAccepted: Boolean(sec('mandatory_staj_accepted', 'mandatoryStajAccepted')),
    voluntaryStajAccepted: Boolean(sec('voluntary_staj_accepted', 'voluntaryStajAccepted')),
    departments: [
      ...(Array.isArray(bolumEtiketleri) ? bolumEtiketleri : []),
      ...(tekBolum ? [tekBolum] : []),
    ].map(metin).filter(Boolean),
    description: metin(sec('description', 'description')),
    requiredSkills: (() => {
      const v = sec('required_skills', 'requiredSkills');
      return Array.isArray(v) ? v.map(metin).filter(Boolean) : [];
    })(),
    status: metin(sec('status', 'status')),
    /*
      Tarih aralığı filtresi için. `created_at` yedeği mapper ile aynı
      (`postedAt: row.posted_at ?? row.created_at`): tarihi olmayan bir
      ilan filtrede sessizce kaybolmasın.
    */
    postedAt: sec('posted_at', 'postedAt') ?? k.created_at ?? null,
  };
}

/**
 * Kayıtlı arama bu ilanla eşleşiyor mu?
 *
 * TEK GERÇEK: liste ekranı ve özet işçisi bu fonksiyonu çağırıyor.
 */
export function aramaEslesiyorMu(ilan, filtreler) {
  const i = ilan?.id !== undefined && ilan?.title !== undefined ? ilan : ilaniNormalize(ilan);
  const f = filtreleriDogrula(filtreler);

  /* Arama metni: başlık, şirket, şehir ve beceriler — listedeki alanlar. */
  if (f.q) {
    const q = katla(f.q);
    const eslesti =
      katla(i.title).includes(q) ||
      katla(i.companyName).includes(q) ||
      katla(i.city).includes(q) ||
      i.requiredSkills.some((s) => katla(s).includes(q));
    if (!eslesti) return false;
  }

  /*
    REMOTE BİR ÜLKE DEĞİL

    `country=remote` yalnız çalışma biçimi Remote olan ilanları
    kapsıyor. `country_code` hiç okunmuyor: kodu olmayan (null) bir
    ilan Remote SAYILMIYOR — kaynağın söylemediği bir şeyi
    söylemek olurdu.
  */
  if (f.country === 'remote') {
    if (i.workType !== 'Remote') return false;
  } else if (f.country !== 'all') {
    if (i.countryCode !== f.country) return false;
  }

  if (f.city !== 'all') {
    if (katla(i.city) !== katla(f.city)) return false;
  }

  if (f.workTypes.length > 0 && !f.workTypes.includes(i.workType)) return false;

  if (f.companies.length > 0 && !f.companies.includes(i.companyName)) return false;

  /*
    TARİH ARALIĞI — `posted_at`, VE NEDEN `first_seen_at` DEĞİL

    Önce `first_seen_at` yazmıştım (bizim ilk gördüğümüz an) ve daha
    doğru alan o. Ama ÖLÇÜLDÜ: istemci o kolonu OKUYAMIYOR — kolon
    yetkileri kapatıyor (`42501`, bkz. 20260906010000) ve ürün
    nesnesinde de yok. Modül onu okumaya çalışsaydı arayüzde filtre
    her ilanı elerdi, e-postada elemezdi: tam olarak kaçınmak
    istediğimiz ayrışma.

    `posted_at` iki tarafın da okuyabildiği tek tarih. Listenin bugünkü
    davranışı da bu — yani bu alan seçimi mevcut sonucu DEĞİŞTİRMİYOR.

    AYRI KONU: özet işçisinin "bu ilan yeni mi" kararı hâlâ
    `first_seen_at` ile veriliyor (işçi servis anahtarıyla okuyor).
    Orada geç içe aktarılan eski tarihli ilanı kaçırmamak gerekiyor;
    burada kullanıcının seçtiği bir filtre var.
  */
  if (f.postedWithinDays !== null) {
    const t = new Date(i.postedAt ?? 0).getTime();
    if (!Number.isFinite(t) || t === 0) return false;
    if (Date.now() - t > f.postedWithinDays * 86_400_000) return false;
  }

  /*
    BÖLÜM FİLTRESİ — ÖNE ÇIKARMA DEĞİL

    Listedeki `bolumAlani` bir SIRALAMA tercihi: ilanı öne alıyor, ama
    eleme yapmıyor. Burada açık bir FİLTRE var: seçilen bölümlerden
    biriyle eşleşmeyen ilan listeye girmiyor. İkisini karıştırmak,
    kullanıcının "yalnız bunu göster" dediği yerde başka bölümleri de
    göstermek olurdu.

    `department_tags` (çoklu) ve `department` (tek, geriye uyum) ile
    birlikte başlık ve açıklama da taranıyor: envanterin çoğunda bölüm
    alanı boş ve yalnız ona bakmak filtreyi işlevsiz yapardı.
  */
  if (f.departments.length > 0) {
    /*
      SÖZLÜK ÜZERİNDEN, ALT DİZE İLE DEĞİL

      İstenen her bölüm bir ALANA çevriliyor (slug ise `bolumunAlani`,
      serbest metinse `alanEslestir`). İlanın alanı da kendi
      etiketinden, başlığından ya da açıklamasından çıkarılıyor. İkisi
      aynı alansa eşleşme var.

      Alt dize karşılaştırması kaldırıldı: `burs`/Bursa sınıfı hataya
      açıktı ve canlıda ölçüldüğü gibi slug hiçbir başlıkla
      eşleşmiyordu.
    */
    const istenenAlanlar = new Set(
      f.departments.map((d) => bolumunAlani(d) ?? alanEslestir(d)).filter(Boolean)
    );
    if (istenenAlanlar.size === 0) {
      /* Tanınmayan bölüm: güvenli varsayılan — eleme YAPMIYOR. */
      return true;
    }
    /*
      FİLTRE YALNIZ GÜÇLÜ SİNYALLER: ETİKET VE BAŞLIK

      Açıklama BİLEREK dışarıda. Canlıda ölçtüm:
      `?bolum=bilgisayar-muhendisligi` sonucunda "2027 Bahar Dönemi
      Staj — İnsan Kaynakları" ilanı da geliyordu, çünkü açıklamasında
      yazılımdan söz ediliyor. Açıklama bir ilanın NE OLDUĞUNU değil
      neyden bahsettiğini söylüyor.

      Açıklama SIRALAMA sinyali olarak duruyor (`bolumSkoru`, ağırlık
      1): orada zarar yok, ilan gizlenmiyor yalnız altta kalıyor.
      Filtrede ise eleme kararı veriyor ve yanlış ilanı listeye sokuyor.
    */
    const ilanAlanlari = new Set(
      [
        ...i.departments.map((e) => bolumunAlani(e) ?? alanEslestir(e)),
        alanEslestir(i.title),
      ].filter(Boolean)
    );
    const eslesti = [...istenenAlanlar].some((a) => ilanAlanlari.has(a));
    if (!eslesti) return false;
  }

  /*
    ÜCRET — null NE ÜCRETLİ NE ÜCRETSİZ

    `is_paid = null` "kaynak söylemiyor" demek (göç 20261001010000).
    Bu kayıtlar iki filtrenin de dışında kalıyor.
  */
  if (f.pay === 'paid' && i.isPaid !== true) return false;
  if (f.pay === 'unpaid' && i.isPaid !== false) return false;

  if (f.mandatory && !i.mandatoryStajAccepted) return false;
  if (f.voluntary && !i.voluntaryStajAccepted) return false;

  return true;
}

/**
 * Kayıtlı aramayı listeye uygulanacak adrese çevirir.
 *
 * Liste ekranının kendi parametrelerini kullanıyor; ikinci bir adres
 * sözleşmesi kurulmuyor.
 */
/*
  TABAN `/` — ETKİLEŞİMLİ LİSTENİN YOLU

  `/staj-ilanlari` statik SEO sayfası ve filtre parametrelerini
  okumuyor (tarayıcıda ölçüldü). Kayıtlı aramayı oraya açmak, filtresiz
  bir sayfa göstermek olurdu.
*/
export function aramaAdresine(filtreler, taban = '/') {
  const f = filtreleriDogrula(filtreler);
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.country !== 'all') p.set('country', f.country);
  if (f.city !== 'all') p.set('city', f.city);
  if (f.workTypes.length) p.set('bicim', f.workTypes.join(','));
  if (f.companies.length) p.set('sirket', f.companies.join('|'));
  if (f.postedWithinDays !== null) p.set('gun', String(f.postedWithinDays));
  if (f.departments.length) p.set('bolum', f.departments.join(','));
  if (f.pay !== 'all') p.set('ucret', f.pay);
  if (f.mandatory) p.set('zorunlu', '1');
  if (f.voluntary) p.set('gonullu', '1');
  const kuyruk = p.toString();
  return kuyruk ? `${taban}?${kuyruk}` : taban;
}

/** Adresten filtre okur: kayıtlı arama ile liste aynı sözleşmede. */
export function adresTenFiltreler(arama) {
  let p;
  try {
    p = new URLSearchParams(arama || '');
  } catch {
    return filtreleriDogrula({});
  }
  const bol = (ad) => (p.get(ad) || '').split(',').map((x) => x.trim()).filter(Boolean);
  return filtreleriDogrula({
    q: p.get('q') || '',
    country: p.get('country') || 'all',
    city: p.get('city') || 'all',
    workTypes: bol('bicim'),
    /* Şirket adları virgül içerebiliyor: ayırıcı `|`. */
    companies: (p.get('sirket') || '').split('|').map((x) => x.trim()).filter(Boolean),
    postedWithinDays: p.get('gun'),
    departments: bol('bolum'),
    pay: p.get('ucret') || 'all',
    mandatory: p.get('zorunlu') === '1',
    voluntary: p.get('gonullu') === '1',
  });
}

/**
 * ÖZET SIRALAMASI — KARARLI
 *
 * Uygunluk ve yenilik eşit olduğunda sıra ilanın kimliğine göre
 * kesinleşiyor. Kararlı olmayan sıralama, aynı gün iki kez koşan bir
 * işçinin (ya da bir yeniden denemenin) farklı on ilan seçmesi
 * demekti: kullanıcı iki farklı e-posta alırdı.
 */
export function ozetSiralamasi(a, b) {
  const t = (x) => {
    const d = new Date(x?.eklenme ?? x?.first_seen_at ?? x?.created_at ?? 0).getTime();
    return Number.isFinite(d) ? d : 0;
  };
  const fark = t(b) - t(a);
  if (fark !== 0) return fark;
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}

/**
 * TÜRKİYE TAKVİM GÜNÜ
 *
 * Türkiye 2016'dan beri KALICI UTC+3; yaz/kış saati uygulaması yok.
 * Bu yüzden 06:00 UTC yıl boyunca 09:00 TRT'ye denk geliyor ve gün
 * sınırı sabit bir kaydırmayla hesaplanabiliyor. Yine de `Intl` ile
 * hesaplıyoruz: kural değişirse tek yerden düzelir.
 */
export function turkiyeGunu(zaman = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(zaman));
}

/** Verilen anın Türkiye saati (0-23). Cron doğrulaması için. */
export function turkiyeSaati(zaman = Date.now()) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      hour12: false,
    }).format(new Date(zaman))
  );
}
