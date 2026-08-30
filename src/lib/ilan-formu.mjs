/**
 * İşveren ilan formunun kuralları.
 *
 * İKİ DAKİKA
 * ----------
 * Hedef, İK'nın telefonla iki dakikada ilan açması. Bunun tek yolu az
 * soru sormak: dokuz zorunlu alan, sihirbaz yok, tek ekran. Vergi
 * dairesi, zorunlu logo, zengin editör, on lokasyon ve ücretli paket
 * bilinçli olarak YOK — hiçbiri ilanı öğrenci için daha iyi yapmıyor,
 * hepsi formu uzatıyor.
 *
 * Kural burada saf işlev: form bileşeni değişse de doğrulama aynı kalıyor
 * ve sınanabiliyor.
 */

/** Formun zorunlu alanları. Dokuzdan fazlası eklenmemeli. */
export const ZORUNLU_ALANLAR = [
  'unvan',
  'sehir',
  'calismaSekli',
  'tur',
  'sure',
  'ucret',
  'aciklama',
];

export const ACIKLAMA_EN_AZ = 200;
export const ACIKLAMA_EN_FAZLA = 2000;

export const CALISMA_SEKILLERI = [
  { id: 'On-site', etiket: 'Ofis' },
  { id: 'Hybrid', etiket: 'Hibrit' },
  { id: 'Remote', etiket: 'Uzaktan' },
];

export const STAJ_TURLERI = [
  { id: 'zorunlu', etiket: 'Zorunlu staj' },
  { id: 'gonullu', etiket: 'Gönüllü staj' },
  { id: 'uzun', etiket: 'Uzun dönem' },
  { id: 'yaz', etiket: 'Yaz stajı' },
];

export const UCRET_SECENEKLERI = [
  { id: 'asgari', etiket: 'Asgari staj ücreti' },
  { id: 'net', etiket: 'Net tutar yazacağım' },
  { id: 'belirtilmeyecek', etiket: 'Belirtilmeyecek' },
];

/**
 * Üç iş tanımı şablonu.
 *
 * Boş bir metin kutusu, formu iki dakikada bitirmenin önündeki asıl
 * engel. Şablonlar doldurulacak metin veriyor ama İK'nın kendi
 * cümlelerini yazmasını engellemiyor — hepsi düzenlenebilir.
 */
export const SABLONLAR = [
  {
    id: 'yazilim',
    etiket: 'Yazılım',
    metin:
      'Ekibimizle birlikte ürünümüzün geliştirilmesinde yer alacaksın. Günlük işlerin arasında ' +
      'yeni özelliklerin kodlanması, mevcut kodun gözden geçirilmesi ve test yazımı olacak. ' +
      'Kıdemli bir geliştirici seni yönlendirecek; ilk haftadan itibaren gerçek bir görevin olacak.\n\n' +
      'Aradıklarımız: en az bir programlama diline hâkim olmak, versiyon kontrolü (Git) kullanmış ' +
      'olmak ve öğrenmeye açık olmak. Daha önce staj yapmış olman gerekmiyor.\n\n' +
      'Staj süresince düzenli geri bildirim alacak, ekip toplantılarına katılacaksın.',
  },
  {
    id: 'ofis',
    etiket: 'Ofis / İdari',
    metin:
      'Ekibimizin günlük işleyişinde yer alacak, süreçlerin takibinde destek vereceksin. ' +
      'Yazışmaların düzenlenmesi, raporların hazırlanması ve toplantı hazırlıkları işlerinin ' +
      'arasında olacak.\n\n' +
      'Aradıklarımız: düzenli çalışma alışkanlığı, temel ofis programlarına hâkimiyet ve ' +
      'yazılı iletişimde özen. Deneyim beklemiyoruz.\n\n' +
      'Staj boyunca birlikte çalışacağın bir sorumlun olacak ve düzenli geri bildirim alacaksın.',
  },
  {
    id: 'saha',
    etiket: 'Saha / Üretim',
    metin:
      'Sahadaki ekiple birlikte üretim ve uygulama süreçlerinde yer alacaksın. İşin bir kısmı ' +
      'gözlem ve kayıt, bir kısmı ekibe doğrudan destek olacak.\n\n' +
      'Aradıklarımız: iş güvenliği kurallarına uyum, ekip içinde çalışabilme ve düzenli devam. ' +
      'Gerekli eğitimler tarafımızdan verilecek.\n\n' +
      'Staj boyunca bir saha sorumlusu sana eşlik edecek; kullanılan ekipman ve süreçler ' +
      'adım adım anlatılacak.',
  },
];

/*
  BAŞVURU ARTIK HER ZAMAN STAJIMVAR ÜZERİNDEN
  ------------------------------------------
  Şirketin açtığı ilanda "Kendi sitemizden" seçeneği ve başvuru adresi
  alanı kaldırıldı; `application_method` sistem tarafından 'internal'
  sabitlendi (kolon yetkisi: 20260906020000_ilan_basvuru_yolu_sabit).

  Dışarı yönlendirme geçici bir çözümdü: öğrenci siteden çıkıyor, ne
  başvurduğu ne de ne olduğu bilinebiliyordu. Başvuru burada kalınca
  öğrenci tek yerden takip edebiliyor, şirket de ilan başına gelen
  başvuru sayısını görüyor.

  DİKKAT — ADAY KİMLİĞİ HÂLÂ DOĞRULAMAYA BAĞLI: `applications` satırlarını
  yalnızca `sirket_dogrulandi()` şirket okuyabiliyor. Kademe 1 şirket
  başvuru SAYISINI görüyor, adayın kim olduğunu görmüyor. Bu bilinçli;
  öğrencinin adı, okulu ve projeleri doğrulanmamış bir kuruma
  aktarılmıyor.
*/

/**
 * Formu doğrular ve alan alan sorunları döndürür.
 *
 * Tek bir "form geçersiz" mesajı yerine alan başına sorun: kullanıcı
 * neyi düzelteceğini formun kendisinde görüyor.
 */
export function ilanSorunlari(deger) {
  const s = {};
  const metin = (x) => String(x ?? '').trim();

  if (metin(deger.unvan).length < 3) s.unvan = 'Pozisyon adını yaz.';
  if (!metin(deger.sehir)) s.sehir = 'Şehir gerekiyor.';
  if (!CALISMA_SEKILLERI.some((c) => c.id === deger.calismaSekli))
    s.calismaSekli = 'Çalışma şeklini seç.';
  if (!STAJ_TURLERI.some((t) => t.id === deger.tur)) s.tur = 'Staj türünü seç.';
  if (!metin(deger.sure)) s.sure = 'Süreyi yaz (örn. 20 iş günü).';

  if (!UCRET_SECENEKLERI.some((u) => u.id === deger.ucret)) s.ucret = 'Ücret seçeneğini seç.';
  else if (deger.ucret === 'net' && !metin(deger.ucretTutari))
    s.ucret = 'Net tutarı yaz ya da başka bir seçenek seç.';

  const aciklama = metin(deger.aciklama);
  if (aciklama.length < ACIKLAMA_EN_AZ)
    s.aciklama = `İş tanımı en az ${ACIKLAMA_EN_AZ} karakter olmalı (şu an ${aciklama.length}).`;
  else if (aciklama.length > ACIKLAMA_EN_FAZLA)
    s.aciklama = `İş tanımı en fazla ${ACIKLAMA_EN_FAZLA} karakter (şu an ${aciklama.length}).`;

  /* Son başvuru OPSİYONEL; yazıldıysa geçmişte olamaz. */
  if (metin(deger.sonBasvuru)) {
    const t = new Date(`${deger.sonBasvuru}T00:00:00`);
    if (Number.isNaN(t.getTime())) s.sonBasvuru = 'Tarihi okuyamadık.';
  }

  return s;
}

export function ilanGecerli(deger) {
  return Object.keys(ilanSorunlari(deger)).length === 0;
}

/**
 * Form değerlerini `listings` satırına çeviriyor.
 *
 * `origin: 'employer_posted'` — toplama hattından gelen ilanlarla
 * karışmasın: ikisi farklı kurallara tabi.
 */
export function ilanSatiri(deger, { companyId, durum }) {
  const metin = (x) => String(x ?? '').trim();
  const tur = deger.tur;

  return {
    company_id: companyId,
    title: metin(deger.unvan),
    city: metin(deger.sehir),
    work_type: deger.calismaSekli,
    mandatory_staj_accepted: tur === 'zorunlu' || tur === 'yaz',
    voluntary_staj_accepted: tur === 'gonullu' || tur === 'uzun',
    term: tur === 'yaz' ? 'Summer 2026' : tur === 'uzun' ? 'Long-term 2026' : 'All Year',
    duration: metin(deger.sure),
    is_paid: deger.ucret !== 'belirtilmeyecek',
    stipend_text:
      deger.ucret === 'asgari'
        ? 'Asgari staj ücreti'
        : deger.ucret === 'net'
          ? metin(deger.ucretTutari)
          : null,
    /*
      `apply_url` ve `application_method` BİLEREK GÖNDERİLMİYOR.

      İkisi de şirketin yazma yetkisi dışında; başvuru yolu istemcinin
      seçtiği bir şey değil. `application_method` kolon varsayılanından
      ('internal') geliyor, `apply_url` boş kalıyor. Buradan
      gönderilseydi istek "permission denied for column" ile düşerdi.
    */
    description: metin(deger.aciklama),
    application_deadline: metin(deger.sonBasvuru) || null,
    origin: 'employer_posted',
    status: durum,
    posted_at: durum === 'published' ? new Date().toISOString() : null,
  };
}

/**
 * `ilanSatiri`'nin TERSİ: veritabanı satırından form değeri.
 *
 * NEDEN GEREKİYOR
 * ---------------
 * Panelde ilan düzenleme yoktu; şirket bir yazım hatasını bile
 * düzeltemiyordu. Düzenleme için formu ikinci kez yazmak yerine aynı
 * form yeniden kullanılıyor — o zaman da kayıtlı satırı forma geri
 * çevirecek bir yol gerekiyor.
 *
 * TÜRETİLEN ALANLAR
 * -----------------
 * Form birkaç alanı sıkıştırıyor: staj türü üç sütuna (mandatory,
 * voluntary, term), ücret ikiye (is_paid, stipend_text). Geri çevirirken
 * aynı kuralın tersi uygulanıyor; uydurma yok, okunamayan bir değer
 * varsayılana düşüyor.
 */
export function ilanFormDegeri(satir) {
  const metin = (x) => String(x ?? '').trim();
  const donem = metin(satir?.term);

  const tur = donem.startsWith('Summer')
    ? 'yaz'
    : donem.startsWith('Long-term')
      ? 'uzun'
      : satir?.mandatory_staj_accepted
        ? 'zorunlu'
        : 'gonullu';

  const odeme = metin(satir?.stipend_text);
  const ucret = !satir?.is_paid ? 'belirtilmeyecek' : odeme === 'Asgari staj ucreti' || odeme === 'Asgari staj ücreti' ? 'asgari' : 'net';

  return {
    unvan: metin(satir?.title),
    sehir: metin(satir?.city),
    calismaSekli: CALISMA_SEKILLERI.some((c) => c.id === satir?.work_type)
      ? satir.work_type
      : 'On-site',
    tur,
    sure: metin(satir?.duration),
    ucret,
    ucretTutari: ucret === 'net' ? odeme : '',
    aciklama: metin(satir?.description),
    /* `date` sütunu; form `yyyy-aa-gg` bekliyor. */
    sonBasvuru: metin(satir?.application_deadline).slice(0, 10),
  };
}

/**
 * Bir ilanda hangi eylemler açık?
 *
 * Kural JSX içinde dağınık durursa test edilemez ve zamanla kayar; bu
 * yüzden tek yerde ve saf.
 *
 * DÜZENLEME yalnızca şirketin KENDİ açtığı ilanda. Toplama hattından
 * gelen ilan (origin = 'scraped') kaynağın kendi metnini taşıyor ve
 * tarama onu her turda yeniden görüyor; elle düzeltme bir sonraki turda
 * geri alınır ve şirket değişikliğinin neden kaybolduğunu anlamaz.
 *
 * KALDIRMA yalnızca yayında OLMAYAN ilanda. Yayındaki ilan önce
 * kapatılıyor: liste bir anda boşalmasın ve öğrenci açık bir ilana
 * tıklayıp boş sayfa görmesin.
 *
 * BAŞVURUSU OLAN İLAN SİLİNMİYOR, arşivleniyor. Ölçüldü:
 * `applications_listing_id_fkey` ON DELETE CASCADE — silmek öğrencinin
 * kendi başvuru geçmişini de siler. Kural veritabanında da duruyor
 * (`listings_guard_delete`), yani arayüzü atlayan bir istek de düşüyor.
 */
export function ilanEylemleri(ilan) {
  const durum = String(ilan?.status ?? '');
  const kaynak = String(ilan?.origin ?? '');
  const basvuru = Number(ilan?.applicants_count ?? 0);

  const yayinda = durum === 'published';
  const kendiIlani = kaynak === 'employer_posted' || kaynak === 'internal';

  return {
    duzenlenebilir: kendiIlani,
    /* Yayındaki ilan için "Kapat", diğerlerinde "Yayınla". */
    durumEtiketi: yayinda ? 'Kapat' : 'Yayınla',
    kaldirilabilir: !yayinda,
    arsivlenecek: basvuru > 0,
  };
}
