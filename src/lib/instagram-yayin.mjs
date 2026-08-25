/**
 * Yayınlanan Instagram gönderilerinin saklama kuralı.
 *
 * NEDEN VAR
 * ---------
 * Yönetici panelindeki set listesi yalnızca büyüyordu: kart üreten betikler
 * public/paylasim/setler.json'a yeni set ekliyor, hiçbir şey çıkmıyordu.
 * Açılır menüde dokuz set birikmişti ve görseller depoda 19 MB yer
 * tutuyordu. Yanlış tarafa bakan bir maliyet değil bu — asıl risk, aylar
 * önce yayınlanmış bir setin hâlâ tek tıklamayla yeniden yayınlanabilir
 * durmasıydı.
 *
 * KURAL
 * -----
 * Bir set başarıyla yayınlandıktan sonra panelde 24 saat daha görünüyor
 * (yayını kontrol etmek, metni gözden geçirmek için). Süre dolunca hem
 * listeden hem de görsel dosyalarından temizleniyor. Geriye küçük bir
 * kayıt kalıyor: başlık, gönderi kimliği, yayın tarihi.
 *
 * NE SİLİNMEZ
 * -----------
 * 1. Yayınlanamayan ya da hata alan içerik. Onun kaydı hiç oluşmuyor, yani
 *    bu kural ona hiç dokunmuyor; incelenmek üzere yerinde duruyor.
 * 2. Instagram'daki gönderi. Yayınlanmış gönderi artık hesabın kamuya açık
 *    içeriği; kaldırmak geri alınamayan, dışarıya dönük bir karar ve bize
 *    ait değil. Burada hiçbir kod Instagram'a silme isteği göndermiyor.
 *
 * Kural neden ayrı dosyada: hem panel (hangi setler listelenecek) hem de
 * temizlik betiği (hangi dosyalar silinecek) aynı eşiği kullanıyor. İki
 * yerde ayrı yazılsaydı biri değiştiğinde öteki sessizce kayardı ve
 * panelden düşmüş ama dosyaları duran setler birikirdi.
 */

/** Yayından sonra setin panelde kalmaya devam ettiği süre. */
export const GORUNURLUK_SAATI = 24;

const SAAT_MS = 60 * 60 * 1000;

/**
 * Bir yayın kaydının görünürlük süresi dolmuş mu?
 *
 * @param {{ yayin_zamani?: string|null }} kayit
 * @param {number} [simdi] test edilebilirlik için; verilmezse şu an
 * @returns {boolean}
 */
export function suresiDoldu(kayit, simdi = Date.now()) {
  const zaman = new Date(kayit?.yayin_zamani ?? '').getTime();
  /*
    Okunamayan tarihte silmeye kalkmıyoruz. Bozuk bir kayıt yüzünden
    dosya silmek, birikmiş bir setten çok daha pahalı bir hata.
  */
  if (Number.isNaN(zaman)) return false;
  return simdi - zaman >= GORUNURLUK_SAATI * SAAT_MS;
}

/**
 * Panelde gösterilecek setleri süzer.
 *
 * Yayın kaydı olmayan set olduğu gibi kalıyor: henüz yayınlanmamış ya da
 * yayını başarısız olmuş demektir.
 *
 * @param {{kod: string}[]} setler
 * @param {{set_kodu: string, yayin_zamani?: string|null}[]} yayinlar
 * @param {number} [simdi]
 */
export function paneldeGosterilecekler(setler, yayinlar, simdi = Date.now()) {
  const dolanlar = new Set(
    (yayinlar ?? []).filter((y) => suresiDoldu(y, simdi)).map((y) => y.set_kodu)
  );
  return (setler ?? []).filter((s) => !dolanlar.has(s.kod));
}

/**
 * Temizlenecek yayın kayıtları: süresi dolmuş ve henüz temizlenmemiş.
 *
 * @param {{set_kodu: string, yayin_zamani?: string|null, temizlendi_mi?: boolean}[]} yayinlar
 * @param {number} [simdi]
 */
export function temizlenecekler(yayinlar, simdi = Date.now()) {
  return (yayinlar ?? []).filter((y) => !y.temizlendi_mi && suresiDoldu(y, simdi));
}
