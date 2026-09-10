/**
 * SOSYAL ETKİLEŞİM — SAF KARAR KURALLARI
 *
 * Beğen/kaydet düğmelerinin ve arşivden geri yüklemenin kararları
 * bileşenin içinde `useState` ile iç içe yazılsaydı hiçbiri
 * çalıştırılarak ölçülemezdi: bu depoda iki kez "kaynak testi geçti ama
 * davranış oluşmadı" yaşandı. Buradaki üç fonksiyon React'e hiç
 * dokunmuyor, tarayıcı da istemiyor; testte GERÇEKTEN çağrılıyorlar ve
 * bileşen tam olarak bunları çağırıyor.
 */

/**
 * Beğeninin karşı durumu — sayı da birlikte gidiyor.
 *
 * Sayıyı ayrı bir yerde artırmak, "beğendim ama sayı değişmedi" gibi
 * kendi içinde çelişen bir kareye izin verirdi. Alt sınır sıfır: sunucu
 * sayısı istemcinin bildiğinden farklı olabilir (araya başkasının
 * beğenisi girmiş olabilir) ve eksi bir beğeni sayısı hiçbir durumda
 * doğru değil.
 *
 * @param {{ begendimMi: boolean, adet: number }} onceki
 * @returns {{ begendimMi: boolean, adet: number }}
 */
export function begeniyiTersle(onceki) {
  return onceki.begendimMi
    ? { begendimMi: false, adet: Math.max(onceki.adet - 1, 0) }
    : { begendimMi: true, adet: onceki.adet + 1 };
}

/**
 * İki yönlü etkileşimin tek geçiş kuralı: KİLİT → YAZ → İSTEK → (hata ise) GERİ AL.
 *
 * KİLİT NEDEN BURADA VE NEDEN BOOLEAN OLARAK GEÇİYOR
 * --------------------------------------------------
 * React durumu aynı iş parçacığında hemen güncellenmiyor; iki hızlı
 * tıklama aynı karede `durum === 'bekliyor'` görüp İKİ istek üretebilir.
 * O yüzden çağıran taraf kilidi bir `ref`ten okuyup buraya geçiriyor ve
 * kapı burada, isteğin hemen önünde kapanıyor. `disabled` niteliği
 * kullanıcıya durumu ANLATIYOR ama tek başına bir güvence değil.
 *
 * İYİMSER YAZIM BU EKRANDA NEDEN VAR
 * ----------------------------------
 * Depodaki genel kural "sunucu kabul etmeden yerel durumu değiştirme".
 * Burada ayrım şu: geçiş İKİ DURUMLU ve geri alınacak değer tam olarak
 * bilinen `onceki`. Yani hata dalında ekran tahmin edilen bir yere değil,
 * isteğin gönderildiği andaki DOĞRU duruma dönüyor ve cümlesi de bunu
 * söylüyor. Yayımlama ya da fotoğraf kaldırma bu koşulu sağlamıyor, orada
 * iyimser yazım hâlâ yok.
 *
 * @template D
 * @param {object} secenek
 * @param {boolean} secenek.kilitliMi Şu anda süren bir istek var mı.
 * @param {D} secenek.onceki İsteğin gönderildiği andaki doğru durum.
 * @param {D} secenek.sonraki Kullanıcının istediği durum.
 * @param {(durum: D) => void} secenek.yaz
 * @param {(deger: boolean) => void} secenek.kilitle
 * @param {(mesaj: string | null) => void} secenek.hataYaz
 * @param {() => Promise<unknown>} secenek.istek
 * @param {string} secenek.hataMetni Hata dalında yazılan cümle; bkz. aşağıdaki gerekçe.
 * @returns {Promise<'kilitli' | 'tamam' | 'geri-alindi'>}
 */
export async function etkilesimGecisi(secenek) {
  if (secenek.kilitliMi) return 'kilitli';

  secenek.kilitle(true);
  /* Önceki denemenin cümlesi siliniyor: yeni istek onu artık anlatmıyor. */
  secenek.hataYaz(null);
  secenek.yaz(secenek.sonraki);

  try {
    await secenek.istek();
    return 'tamam';
  } catch {
    /*
      GERİ DÖNÜŞ ÖNCE, CÜMLE SONRA.

      Sunucunun kendi metni EKRANA YAZILMIYOR: `hata()` yardımcısı
      PostgREST cümlesini olduğu gibi taşıyor ve o metin ("new row
      violates row-level security policy…") kullanıcıya ne olduğunu
      anlatmıyor. Buradaki cümle iki şeyi söylüyor: iş olmadı ve durum
      ne. İkisi de çağıran tarafta, iki yön için ayrı ayrı yazılıyor.
    */
    secenek.yaz(secenek.onceki);
    secenek.hataYaz(secenek.hataMetni);
    return 'geri-alindi';
  } finally {
    /*
      Kilit `finally` içinde açılıyor: hata dalında açılmasaydı düğme
      kalıcı olarak tıklanamaz kalır ve kullanıcı "yeniden dene"
      diyemezdi.
    */
    secenek.kilitle(false);
  }
}

/**
 * Bir kart ızgaradan kalktığında odağın gideceği yer.
 *
 * ODAK NEDEN ELLE TAŞINIYOR
 * -------------------------
 * Geri yüklenen kart DOM'dan siliniyor. Odaklı düğüm belgeden kalkınca
 * tarayıcı odağı `body`'ye alıyor — aynı sıfırlama `PaylasimDetayi`
 * kapanışında ölçülmüştü. Klavye kullanıcısı bir kart geri yükledikten
 * sonra sayfanın başına savrulur ve arşivde gezinmeye baştan başlardı.
 *
 * SIRA: sıradaki kart → yoksa önceki kart → hiç kart kalmadıysa ızgara
 * başlığı. Başlık `tabIndex={-1}`: odak alabiliyor ama Tab sırasına
 * girmiyor.
 *
 * Tanınmayan kimlik de başlığa düşüyor: elde doğru bir kart yokken
 * rastgele bir kartı odaklamak, kullanıcıyı ilgisiz bir yere götürürdü.
 *
 * @param {string[]} idler Izgaradaki kartların GÖRÜNEN sırası.
 * @param {string} kalkanId
 * @returns {{ hedef: 'kart', id: string } | { hedef: 'baslik', id: null }}
 */
export function geriYuklemeOdagi(idler, kalkanId) {
  const sira = idler.indexOf(kalkanId);
  if (sira < 0) return { hedef: 'baslik', id: null };

  const sonraki = idler[sira + 1];
  if (sonraki) return { hedef: 'kart', id: sonraki };

  const onceki = idler[sira - 1];
  if (onceki) return { hedef: 'kart', id: onceki };

  return { hedef: 'baslik', id: null };
}
