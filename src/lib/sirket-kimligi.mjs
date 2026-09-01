/**
 * KANONİK ŞİRKET KİMLİĞİ — TEK KATMAN
 *
 * StajımVar'da şirket iki ayrı yerden geliyor:
 *
 *   A) `companies` tablosu — tarayıcının bulduğu ilanlardan doğan kayıtlar.
 *      İnce: 42 kaydın 30'unda site adresi var, 1'inde gerçek açıklama.
 *   B) `stajProgramlari.ts` — elle derlenmiş 44 büyük işveren. Zengin:
 *      resmî kariyer adresi, sektör, özet, ilgili bölümler, son kontrol.
 *
 * ÖLÇÜLEN GERÇEK: İKİ KÜME AYRIK
 * ------------------------------
 * Kariyer adresinin alan adı ile şirket kaydının site adresi
 * karşılaştırıldı: 44 kurumun HİÇBİRİ (0/44) mevcut bir şirket kaydıyla
 * eşleşmiyor. Slug çakışması da yok, ad çakışması da yok. Yani tablodaki
 * şirketler (Alumil, Rapsodo, Vertigo Games…) ile dizindeki kurumlar
 * (Aselsan, TUSAŞ, Roketsan…) bambaşka iki popülasyon.
 *
 * Bu yüzden bu katman bir "birleştirici" değil, bir ÇÖZÜCÜ: bir slug
 * hangi kimliğe ait, onu söylüyor.
 *
 * BENZER AD BİRLEŞTİRME SEBEBİ DEĞİLDİR
 * -------------------------------------
 * "Turkcell" ile "Turkcell İletişim Hizmetleri A.Ş." aynı şirket olabilir
 * ama bunu ad benzerliğinden çıkarmak, iki farklı şirketi birleştirme
 * riskini de beraberinde getiriyor. Kanıt sırası: mevcut kayıt ilişkisi →
 * doğrulanmış resmî alan adı → doğrulanmış kariyer alan adı → bilinen ATS
 * kiracısı → elle tutulan takma ad. Hiçbiri yoksa sonuç UNRESOLVED.
 */

/**
 * Kimlik sınıfları:
 *   MATCHED_EXISTING_COMPANY — hem dizinde hem `companies` tablosunda, KANITLA
 *   PROGRAM_ONLY_VERIFIED    — yalnız dizinde, kaydı kalite kapısını geçiyor
 *   AMBIGUOUS                — kanıtlar birden fazla adaya işaret ediyor
 *   INSUFFICIENT_DATA        — sayfa açmaya yetecek veri yok
 */

/** Adres → alan adı (şema, www ve yol atılır). */
export function alanAdi(url) {
  if (!url) return undefined;
  const m = /^https?:\/\/([^/?#]+)/i.exec(url.trim());
  if (!m) return undefined;
  return m[1].toLowerCase().replace(/^www\./, '');
}

/**
 * Kayıt alan adı: `careers.aselsan.com` → `aselsan.com`.
 *
 * İkinci seviye uzantılar (`com.tr`, `org.tr`) için üç parça alınıyor;
 * aksi hâlde `aselsan.com.tr` → `com.tr` olurdu ve alan adı eşleşmesi
 * bütün Türk şirketlerini birbirine bağlardı.
 */
export function kayitAlani(alan) {
  if (!alan) return undefined;
  const p = alan.split('.');
  if (p.length <= 2) return alan;
  const ikinci = p[p.length - 2];
  return ['com', 'org', 'net', 'gov', 'edu'].includes(ikinci)
    ? p.slice(-3).join('.')
    : p.slice(-2).join('.');
}

/**
 * Bir dizin kaydını mevcut şirket kayıtlarıyla KANITLA eşleştirir.
 *
 * Yalnız alan adı kanıtı kabul ediliyor. Ad benzerliği bilerek
 * kullanılmıyor: yanlış birleştirme, çözülememişten kötüdür.
 */
export function kanitlaEslestir(program, dbSirketler = []) {
  const kariyerKok = kayitAlani(alanAdi(program.kariyerUrl));
  if (!kariyerKok) return { ambiguous: false, evidence: ['kariyer adresi okunamadı'] };

  const adaylar = dbSirketler.filter(
    (s) => kayitAlani(alanAdi(s.website_url || undefined)) === kariyerKok
  );
  if (adaylar.length === 1) {
    return {
      eslesme: adaylar[0],
      ambiguous: false,
      evidence: [`alan adı kanıtı: ${kariyerKok}`],
    };
  }
  if (adaylar.length > 1) {
    return {
      ambiguous: true,
      evidence: [`aynı alan adına ${adaylar.length} kayıt işaret ediyor: ${kariyerKok}`],
    };
  }
  return { ambiguous: false, evidence: [`mevcut kayıtla alan adı eşleşmesi yok: ${kariyerKok}`] };
}

/**
 * KALİTE KAPISI
 *
 * "Aselsan — kariyer sayfasına git" diyen elli kelimelik bir sayfa
 * kimseye bir şey kazandırmıyor ve ince içerik sitenin tamamına zarar
 * veriyor. Bir sayfanın indekslenebilmesi için ad, doğrulanmış resmî
 * adres, gerçek bir açıklama ve EN AZ BİR yararlı içerik bloğu gerekiyor.
 */
export function kaliteKapisi(k) {
  const eksikler = [];
  if (!k.displayName?.trim()) eksikler.push('ad yok');
  if (!k.careerUrl && !k.officialDomain) eksikler.push('resmî kariyer/site adresi yok');
  if (!k.summary || k.summary.trim().length < 60) eksikler.push('gerçek açıklama yok');

  const yararli =
    k.departments.length > 0 || Boolean(k.careerUrl) || Boolean(k.companyTableId);
  if (!yararli) eksikler.push('yararlı içerik bloğu yok');

  return { gecti: eksikler.length === 0, eksikler };
}

/** Dizin kaydından kanonik kimlik kurar. */
export function programKimligi(program, dbSirketler = []) {
  const { eslesme, ambiguous, evidence } = kanitlaEslestir(program, dbSirketler);
  const kimlik = {
    slug: program.slug,
    displayName: program.isveren,
    officialDomain: kayitAlani(alanAdi(program.kariyerUrl)),
    careerUrl: program.kariyerUrl,
    companyTableId: eslesme?.id,
    program,
    departments: program.bolumler ?? [],
    sector: program.sektor,
    summary: program.ozet,
    lastChecked: program.sonKontrol,
    sinif: 'INSUFFICIENT_DATA',
    evidence: [...evidence],
  };

  if (ambiguous) {
    kimlik.sinif = 'AMBIGUOUS';
    return kimlik;
  }

  const kapi = kaliteKapisi(kimlik);
  if (!kapi.gecti) {
    kimlik.sinif = 'INSUFFICIENT_DATA';
    kimlik.evidence.push(...kapi.eksikler);
    return kimlik;
  }

  kimlik.sinif = eslesme ? 'MATCHED_EXISTING_COMPANY' : 'PROGRAM_ONLY_VERIFIED';
  kimlik.evidence.push('kalite kapısı geçti');
  return kimlik;
}

/**
 * Bütün dizin kimlikleri.
 *
 * Program listesi ARGÜMAN olarak geliyor: bu modül veri dosyasına
 * bağlanmıyor, böylece hem tarayıcı hem ön render hem de test aynı
 * mantığı çalıştırabiliyor.
 */
export function kanonikSirketler(programlar, dbSirketler = []) {
  return programlar.map((p) => programKimligi(p, dbSirketler));
}

/** Slug ile dizin kimliği. Yoksa `null` — sayfa `companies` tarafına düşer. */
export function programKimligiBul(programlar, slug) {
  const p = programlar.find((x) => x.slug === slug);
  return p ? programKimligi(p) : null;
}

/** Sayfası indekslenebilecek kimlikler. */
export function indekslenebilirler(programlar, dbSirketler = []) {
  return kanonikSirketler(programlar, dbSirketler).filter(
    (k) => k.sinif === 'MATCHED_EXISTING_COMPANY' || k.sinif === 'PROGRAM_ONLY_VERIFIED'
  );
}
