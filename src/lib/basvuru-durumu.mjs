/**
 * BAŞVURU DURUMU — ÜRÜNÜN TEK SÖZLÜĞÜ
 *
 * NEDEN BURADA
 * ------------
 * Sözlük `src/sirket/basvuru-durumu.ts` içindeydi ve yalnızca işveren
 * paneli okuyordu. Öğrencinin "Başvurularım" ekranında ise BAŞKA bir
 * sözlük vardı; aynı başvuru iki tarafta iki farklı kelimeyle
 * görünüyordu:
 *
 *   enum                  şirket          öğrenci
 *   under_review          İnceleniyor     "İK İnceliyor"
 *   technical_assessment  Değerlendirme   "Teknik Case Aşamasında"
 *   interview_scheduled   Mülakat         "Mülakat Daveti Geldi"
 *   offer_extended        Teklif          "🎉 Staj Teklifi Geldi!"
 *   withdrawn             Geri çekildi    "İşlemde"   ← yanlış
 *
 * Sonuncusu yalnız tutarsız değil, YANLIŞTI: öğrencinin kendi geri
 * çektiği başvuru ona "İşlemde" diyordu.
 *
 * Artık terim tek: `DURUM_ADI`. Öğrenci tarafında cümleleşebiliyor
 * ("Başvurun inceleniyor") ama TERİM değişmiyor.
 *
 * Bu dosya saf: renk, React ve Supabase yok. Renkler işveren temasına
 * bağlı olduğu için ./sirket/basvuru-durumu.ts içinde kalıyor.
 */

/** `application_status` enum'unun tamamı, akışın gerçek sırasıyla. */
export const DURUM_SIRASI = [
  'submitted',
  'under_review',
  'technical_assessment',
  'interview_scheduled',
  'offer_extended',
  'offer_accepted',
  'offer_declined',
  'rejected',
  'withdrawn',
];

/**
 * Ürünün tek terim sözlüğü. İki taraf da bunu kullanıyor.
 *
 * Uydurma aşama yok: anahtarlar enum'un tamamı ve yalnızca o.
 */
export const DURUM_ADI = {
  submitted: 'Yeni',
  under_review: 'İnceleniyor',
  technical_assessment: 'Değerlendirme',
  interview_scheduled: 'Görüşme',
  offer_extended: 'Teklif',
  offer_accepted: 'Teklif kabul edildi',
  offer_declined: 'Teklif reddedildi',
  rejected: 'Olumsuz',
  withdrawn: 'Geri çekildi',
};

/**
 * Öğrenciye gösterilen cümle.
 *
 * Terim aynı kalıyor, yalnız cümleleşiyor: şirket "Mülakat" derken
 * öğrenci "Mülakat aşamasında" görüyor. Farklı bir kelime değil, aynı
 * kelimenin cümlesi.
 */
export const OGRENCI_CUMLESI = {
  submitted: 'Başvurun alındı',
  under_review: 'Başvurun inceleniyor',
  technical_assessment: 'Değerlendirme aşamasında',
  interview_scheduled: 'Görüşme daveti aldın',
  offer_extended: 'Teklif aldın',
  offer_accepted: 'Teklifi kabul ettin',
  offer_declined: 'Teklifi reddettin',
  rejected: 'Olumsuz sonuçlandı',
  withdrawn: 'Başvurunu geri çektin',
};

/**
 * Şirkete gösterilen cümle.
 *
 * TERİM AYNI, ÖZNE FARKLI. `offer_declined` iki tarafta da "Teklif
 * reddedildi" terimini taşıyor; cümlede öğrenci "Teklifi reddettin",
 * şirket "Öğrenci teklifi reddetti" görüyor. Bu, şirketin KENDİ olumsuz
 * kararıyla (`rejected` · "Olumsuz") karışmasın diye ayrı yazılıyor:
 * ikisi farklı olaylar ve farklı taraflar veriyor.
 */
export const SIRKET_CUMLESI = {
  submitted: 'Yeni başvuru',
  under_review: 'İnceleniyor',
  technical_assessment: 'Değerlendirme aşamasında',
  interview_scheduled: 'Görüşme daveti gönderildi · yanıt bekleniyor',
  offer_extended: 'Teklif gönderildi · yanıt bekleniyor',
  offer_accepted: 'Teklif kabul edildi',
  offer_declined: 'Öğrenci teklifi reddetti',
  rejected: 'Olumsuz sonuçlandı',
  withdrawn: 'Aday başvurusunu geri çekti',
};

/**
 * ŞİRKETİN GEÇEBİLECEĞİ DURUMLAR
 *
 * `withdrawn` YOK: geri çekmek adayın kararı ve şirket onun adına bu
 * kararı veremez. Aynı kural veritabanında da duruyor — işveren
 * güncelleme politikasının WITH CHECK ifadesi bu değeri reddediyor
 * (20260910010000_basvuru_durum_gecis_siniri). Buradaki liste yalnızca
 * arayüzün doğru seçenekleri göstermesi için.
 */
export const OGRENCI_KARARLARI = ['withdrawn', 'offer_accepted', 'offer_declined'];

export const SIRKET_DURUMLARI = DURUM_SIRASI.filter((d) => !OGRENCI_KARARLARI.includes(d));

/**
 * SADE AKIŞ — ŞİRKETİN SEÇEBİLECEĞİ DURUMLAR
 *
 * Yeni akışta şirketin işi adayın profilini, CV'sini ve izinli
 * iletişimini incelemek; devamını telefon ya da e-postayla kendisi
 * yürütüyor. Görüşme, değerlendirme aşaması ve teklif temel akıştan
 * ÇIKTI: şirket bu durumlara yeni bir başvuruyu TAŞIYAMIYOR.
 *
 * ESKİ KAYITLAR BOZULMUYOR: o durumlardaki başvurular durumlarını
 * koruyor ve ekranda geçmiş olarak okunuyor (seçicide devre dışı
 * seçenek). Öğrencinin açık teklife yanıt yolu (`teklife_yanit_ver`)
 * aynen çalışıyor.
 *
 * `SIRKET_DURUMLARI` ve `sonrakiDurum` SİLİNMEDİ: eski akışın
 * sözlüğü olarak duruyorlar ve eski kayıtların cümleleri onlardan
 * kuruluyor.
 */
export const SADE_SIRKET_DURUMLARI = ['submitted', 'under_review', 'rejected'];

/**
 * SADE AKIŞ — LİSTE SÜZGECİ VE PANO SÜTUNLARI İÇİN TEK KURAL
 *
 * Başvuranlar ekranı dört ana durumla düşünüyor: Yeni, İnceleniyor,
 * Olumsuz, Geri çekildi. Liste süzgeci de Pano sütunları da BU listeden
 * kuruluyor; iki ekran ayrı ayrı tanımlasaydı biri değişip öteki geride
 * kalırdı.
 *
 * KALDIRILAN AŞAMALAR (değerlendirme, görüşme, teklif ve teklife verilen
 * yanıtlar) ana seçenek DEĞİL. O durumlardaki eski kayıtlar silinmiyor ve
 * dönüştürülmüyor; tek bir "Eski süreç kayıtları" grubunda toplanıyor ve
 * o grup YALNIZ böyle bir kayıt varsa görünüyor. Kartlar gerçek geçmiş
 * durumu (ör. "Görüşme", "Teklif kabul edildi") rozetinde göstermeye
 * devam ediyor — grup yalnız nerede bulunacağını söylüyor.
 */
export const SADE_DURUM_GRUPLARI = [
  { anahtar: 'submitted', etiket: 'Yeni' },
  { anahtar: 'under_review', etiket: 'İnceleniyor' },
  { anahtar: 'rejected', etiket: 'Olumsuz' },
  { anahtar: 'withdrawn', etiket: 'Geri çekildi' },
];

export const ESKI_SUREC_GRUBU = { anahtar: 'eski', etiket: 'Eski süreç kayıtları' };

export const ESKI_SUREC_DURUMLARI = [
  'technical_assessment',
  'interview_scheduled',
  'offer_extended',
  'offer_accepted',
  'offer_declined',
];

/**
 * Bir başvurunun hangi gruba düştüğü. Bilinmeyen ya da boş durum
 * "Yeni"ye düşüyor: kart kaybolmasın (panodaki eski kuralla aynı tutum).
 */
export function sadeDurumGrubu(durum) {
  const d = String(durum ?? '').trim();
  if (ESKI_SUREC_DURUMLARI.includes(d)) return ESKI_SUREC_GRUBU.anahtar;
  if (SADE_DURUM_GRUPLARI.some((g) => g.anahtar === d)) return d;
  return 'submitted';
}

/**
 * Süzgeç seçenekleri ve sayıları.
 *
 * Sayılar verilen kartlar üzerinden (çağıran, durum DIŞINDAKİ süzgeçleri
 * — ilan, arama — önceden uygulamış listeyi veriyor). Böylece "Yeni (2)"
 * seçildiğinde listede gerçekten 2 aday kalıyor.
 *
 * "Eski süreç kayıtları" yalnız böyle bir kayıt varsa ya da o an seçiliyse
 * listede: seçiliyken kaybolsaydı ekran neyle süzüldüğünü söyleyemezdi.
 */
export function durumSuzgeciSecenekleri(kartlar, secili = '') {
  const sayac = {};
  for (const k of kartlar ?? []) {
    const g = sadeDurumGrubu(k?.durum ?? k?.status);
    sayac[g] = (sayac[g] ?? 0) + 1;
  }
  const secenekler = [
    { deger: '', etiket: 'Tüm durumlar', sayi: (kartlar ?? []).length },
    ...SADE_DURUM_GRUPLARI.map((g) => ({ deger: g.anahtar, etiket: g.etiket, sayi: sayac[g.anahtar] ?? 0 })),
  ];
  const eski = sayac[ESKI_SUREC_GRUBU.anahtar] ?? 0;
  if (eski > 0 || secili === ESKI_SUREC_GRUBU.anahtar) {
    secenekler.push({ deger: ESKI_SUREC_GRUBU.anahtar, etiket: ESKI_SUREC_GRUBU.etiket, sayi: eski });
  }
  return secenekler;
}

/**
 * Pano sütunları — süzgeçle AYNI gruplar, aynı sırayla.
 *
 * Dört ana sütun her zaman çiziliyor (boşsa "yok" diyor); "Eski süreç
 * kayıtları" sütunu yalnız o ilanda böyle bir kayıt varsa. Kartların
 * sırası korunuyor; hiçbir kart iki sütuna düşmüyor ya da dışarıda
 * kalmıyor.
 */
export function sadeDurumSutunlari(kartlar) {
  const liste = kartlar ?? [];
  const grubunKartlari = (anahtar) =>
    liste.filter((k) => sadeDurumGrubu(k?.durum ?? k?.status) === anahtar);
  const sutunlar = SADE_DURUM_GRUPLARI.map((g) => ({
    anahtar: g.anahtar,
    etiket: g.etiket,
    kartlar: grubunKartlari(g.anahtar),
  }));
  const eski = grubunKartlari(ESKI_SUREC_GRUBU.anahtar);
  if (eski.length > 0) {
    sutunlar.push({ anahtar: ESKI_SUREC_GRUBU.anahtar, etiket: ESKI_SUREC_GRUBU.etiket, kartlar: eski });
  }
  return sutunlar;
}

/** Kart seçili duruma uyuyor mu? Boş seçim herkesi geçiriyor. */
export function durumSuzgecineUyar(kart, secili) {
  if (!secili) return true;
  return sadeDurumGrubu(kart?.durum ?? kart?.status) === secili;
}

/**
 * Sade akışta tek birincil adım: yeni başvuruyu incelemeye almak.
 * Sonrası (arama, e-posta) site dışında; ekran şirketi bir sonraki
 * aşamaya zorlamıyor.
 */
export function sadeSonrakiDurum(durum) {
  return durum === 'submitted' ? 'under_review' : null;
}

/**
 * Akıştaki bir sonraki adım — arayüzdeki tek birincil düğme.
 *
 * Yedi düğme yerine bir sonraki adım: şirket adayı açtığında ne
 * yapacağını düşünmeden yapabilsin. Kapanmış durumlarda (teklif,
 * olumsuz, geri çekildi) bir sonraki adım yok.
 */
export function sonrakiDurum(durum, gorusmeYaniti) {
  /*
    GÖRÜŞMEDEN TEKLİFE GEÇİŞ YANITA BAĞLI

    Teklif ancak görüşme gerçekleşebilecekse anlamlı. Öğrenci daveti
    henüz yanıtlamadıysa ya da katılamayacağını söylediyse şirkete
    "Teklif gönder" birincil düğmesi GÖSTERİLMİYOR — sıradaki hamle
    şirketin değil ya da önce yeni bir davet gerekiyor.
  */
  if (durum === 'interview_scheduled') {
    return gorusmeYaniti === 'accepted' ? 'offer_extended' : null;
  }

  const akis = {
    submitted: 'under_review',
    under_review: 'technical_assessment',
    technical_assessment: 'interview_scheduled',
  };
  return akis[durum] ?? null;
}

/**
 * GÖRÜŞME DAVETİ — DURUMUN İÇİNDEKİ ÜÇ HAL
 *
 * `interview_scheduled` görüşme aşamasının canonical durumu. Öğrencinin
 * davete verdiği yanıt AYRI bir alanda duruyor (`interview_response`):
 * durumun kendisi değil, durumun içindeki bir olgu. Üç yeni durum değeri
 * açmak (davet gönderildi / kabul edildi / reddedildi) durum makinesini
 * şişirir ve her süzgeç, politika ve rozet haritasının üçünü birden
 * bilmesini gerektirirdi.
 *
 * Üç hal:
 *   yanıt yok       → davet gönderildi, öğrencinin yanıtı bekleniyor
 *   'accepted'      → öğrenci görüşmeye katılacağını bildirdi
 *   'declined'      → öğrenci katılamayacağını bildirdi
 */
export const GORUSME_TURLERI = [
  { id: 'in_person', ad: 'Yüz yüze' },
  { id: 'online', ad: 'Çevrimiçi' },
  { id: 'phone', ad: 'Telefon' },
];

/** Görüşme biçiminin görünen adı. Tanınmayan/boş değerde boş dize. */
export function gorusmeTuruAdi(tur) {
  return GORUSME_TURLERI.find((t) => t.id === tur)?.ad ?? '';
}

/**
 * "Nereye geleceğim" satırının başlığı.
 *
 * Adres ve bağlantı TEK alanda duruyor (`interview_location`); ikisi
 * aynı sorunun cevabı. Başlık biçime göre değişiyor.
 */
export function gorusmeYeriEtiketi(tur) {
  if (tur === 'online') return 'Toplantı bağlantısı';
  if (tur === 'phone') return 'Arama bilgisi';
  return 'Konum';
}

/** Davet gönderildi, öğrenci henüz yanıtlamadı. */
export function gorusmeBekliyor(durum, yanit) {
  return durum === 'interview_scheduled' && !yanit;
}

/** Öğrenci görüşmeye katılacağını bildirdi. */
export function gorusmeOnaylandi(durum, yanit) {
  return durum === 'interview_scheduled' && yanit === 'accepted';
}

/** Öğrenci katılamayacağını bildirdi. Şirketin "Olumsuz" kararı DEĞİL. */
export function gorusmeReddedildi(durum, yanit) {
  return durum === 'interview_scheduled' && yanit === 'declined';
}

/**
 * Görüşme aşamasının şirkete gösterilen cümlesi.
 *
 * `SIRKET_CUMLESI` yalnız durumu biliyor; görüşme aşamasında söylenecek
 * şey yanıta göre değişiyor.
 */
export function gorusmeSirketCumlesi(yanit) {
  if (yanit === 'accepted') return 'Aday görüşmeye katılacağını onayladı';
  if (yanit === 'declined') return 'Öğrenci görüşmeye katılamayacak';
  return 'Görüşme daveti gönderildi · yanıt bekleniyor';
}

/** Aynı olgunun öğrenciye dönük cümlesi. Terim aynı, özne farklı. */
export function gorusmeOgrenciCumlesi(yanit) {
  if (yanit === 'accepted') return 'Görüşmeye katılacağını bildirdin';
  if (yanit === 'declined') return 'Görüşmeye katılamayacağını bildirdin';
  return 'Görüşme daveti aldın';
}

/**
 * Teklif verildi ve öğrencinin kararı bekleniyor.
 *
 * Bu durumda şirketin "sonraki adım" düğmesi YOK: sıradaki hamle
 * şirketin değil.
 */
export function teklifBekliyor(durum) {
  return durum === 'offer_extended';
}

/**
 * Öğrenci başvurusunu geri çekebilir mi?
 *
 * Teklif beklerken geri çekme gösterilmiyor: o aşamada karar "kabul et"
 * ya da "reddet". Aynı kararı iki ayrı kelimeyle sormak, öğrencinin
 * verdiği yanıtı da belirsizleştirirdi.
 */
export function ogrenciGeriCekebilir(durum) {
  return !durumKapandi(durum) && durum !== 'offer_extended';
}

/**
 * ÖĞRENCİYE ŞİRKET YETKİLİSİ AÇIK MI?
 *
 * TEK KOŞUL: öğrenci teklifi kabul etti. Bu kural DEĞİŞMEDİ — teklif
 * temel akıştan çıktı ama geçmişte kabul edilmiş teklifler duruyor ve
 * o öğrencilerin gördüğü bilgi kaybolmamalı.
 *
 * Arayüz bunu yalnızca GÖSTERİM için kullanıyor; asıl kapı
 * veritabanında (public.basvuru_iletisimi).
 */
export function iletisimAcik(durum) {
  return durum === 'offer_accepted';
}

/** Sade akışta alınan paylaşım onayının sürümü — sunucudaki `paylasim_surumu()`. */
export const PAYLASIM_SURUMU = '2026-10-sade-v1';

/**
 * ŞİRKET ADAYIN İLETİŞİMİNİ GÖREBİLİR Mİ? (gösterim kopyası)
 *
 * TEKLİF KABULÜ ARTIK SORULMUYOR. Sorulan şey öğrencinin onayının bu
 * akışı kapsayıp kapsamadığı:
 *   - StajımVar üzerinden alınan (internal) başvuruda verdiği onay
 *     zaten "profilim ve iletişim bilgilerim bu şirketle paylaşılsın"
 *     diyordu; kapsıyor.
 *   - Dışarı yönlendiren (external) başvuruda öğrenci formu şirketin
 *     kendi sitesinde doldurmuştu; eski onay bu ekranı kapsamıyor ve
 *     YENİ ONAY VARSAYILMIYOR. Öğrenci sonradan açarsa sade sürüm
 *     damgası geliyor ve kapsıyor.
 *
 * Asıl kapı sunucuda (`basvuru_iletisimi_acik`); bu kopya yalnız
 * ekranın ne çizeceğini bilmesi için. Rol kontrolü BURADA YOK —
 * Viewer'ı sunucu zaten döndürmüyor.
 */
export function adayIletisimiAcik(kart) {
  if (!kart?.paylasimOnayi) return false;
  return kart.basvuruYontemi === 'internal' || kart.paylasimSurumu === PAYLASIM_SURUMU;
}

/**
 * ÖĞRENCİNİN VERDİĞİ KARAR — ŞİRKET İÇİN NİHAİ
 *
 * Üçü de adayın kararı: teklifi kabul etti, teklifi reddetti, başvurudan
 * vazgeçti. Şirket bu değerleri yazamıyordu; artık bozamıyor da
 * (20260914010000_ogrencinin_karari_nihai).
 *
 * `rejected` bilerek dışarıda: o şirketin KENDİ kararı ve yanlışlıkla
 * verilmiş bir kararı düzeltebilmek meşru.
 */
export function ogrencininKarari(durum) {
  return durum === 'offer_accepted' || durum === 'offer_declined' || durum === 'withdrawn';
}

/**
 * SÜREÇ BİTTİ — EKRAN ARTIK "DEĞERLENDİR" EKRANI DEĞİL
 *
 * Bu dört durumda aday hakkında verilecek bir karar kalmıyor. Uyum
 * skoru da burada anlamını yitiriyor: şirket adayı zaten seçmiş ya da
 * süreç kapanmış. Kabul edilmiş bir adayın yanında "Düşük uyum" yazmak,
 * artık işe yaramayan bir sayıyı karar gibi göstermek olurdu.
 *
 * Yalnız GÖSTERİM kuralı: puan veritabanında duruyor.
 */
export function surecKapandi(durum) {
  return ogrencininKarari(durum) || durum === 'rejected';
}

/** Süreç kapandı mı? Kapalıysa "bir sonraki adım" gösterilmiyor. */
/**
 * Süreç bitti mi?
 *
 * `offer_extended` ARTIK KAPALI DEĞİL: teklif verildiğinde süreç bitmiyor,
 * öğrencinin kararı bekleniyor. Kapanış öğrencinin yanıtıyla
 * (`offer_accepted` / `offer_declined`) ya da şirketin olumsuz kararıyla
 * geliyor.
 */
export function durumKapandi(durum) {
  return (
    durum === 'rejected' ||
    durum === 'withdrawn' ||
    durum === 'offer_accepted' ||
    durum === 'offer_declined'
  );
}

/** Durumun kullanıcıya görünen adı. Tanınmayan değerde ham enum YAZILMIYOR. */
export function durumAdi(durum) {
  return DURUM_ADI[durum] ?? 'Durum bilinmiyor';
}

/** Öğrenciye gösterilen cümle. */
export function ogrenciDurumCumlesi(durum) {
  return OGRENCI_CUMLESI[durum] ?? 'Durum bilinmiyor';
}

/** Şirkete gösterilen cümle. */
export function sirketDurumCumlesi(durum) {
  return SIRKET_CUMLESI[durum] ?? 'Durum bilinmiyor';
}
