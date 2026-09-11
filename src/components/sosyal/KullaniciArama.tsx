import React from 'react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  ARAMA_EN_AZ_HARF,
  sosyalKullaniciAra,
  type SosyalAramaSonucu,
} from '../../lib/queries/sosyal';
import { kullaniciAdiHarfeIndir, profilYolu } from '../../lib/sosyal-kullanici-adi.mjs';
import { ProfilFotografi } from './ProfilFotografi';

/**
 * KULLANICI ARAMASI — YALNIZ ARAMA
 *
 * NE VAR, NE YOK
 * --------------
 * Satırda avatar, görünen ad, kullanıcı adı ve varsa bölüm etiketi ile
 * şehir var. Takip düğmesi, ortak bağlantı sayısı, "tanıyor olabilirsin"
 * önerisi ve son aramalar YOK: hiçbirinin arka ucu yok ve `takip` diye
 * bir tablo hiç açılmadı. `sosyal_kullanici_ara` (20260926060000) zaten
 * bu beş alandan başkasını döndürmüyor.
 *
 * `profile_id` KULLANILMIYOR
 * --------------------------
 * RPC kimlik döndürmüyor ve gezinme buna ihtiyaç duymuyor: satır
 * `/profil/<kullaniciadi>` adresine gidiyor. Kimlik listelemek, ileride
 * yazılacak her sorguya hazır bir hedef listesi vermek olurdu.
 *
 * ÜÇ HARF ALTINDA İSTEK YOK
 * -------------------------
 * Sunucu üç harften kısa sorguda SIFIR SATIR dönüyor. O sıfır "sonuç
 * yok" değil, "henüz arama yok" demek ve ekran bunu böyle yazıyor —
 * "sonuç bulunamadı" yazsaydık, kullanıcı aradığı kişinin olmadığını
 * sanırdı. Sınır sayısı `ARAMA_EN_AZ_HARF` ile tek yerden geliyor.
 *
 * NEDEN GECİKTİRME
 * ----------------
 * Her tuşta istek atmak, "mustafa" yazan kullanıcı için yedi istek
 * demekti ve son cevabın hangisi olduğu da garanti değildi. Girdi 300 ms
 * duruncaya kadar bekleniyor; ayrıca her istek kendi `iptal` bayrağını
 * taşıyor, yani geç dönen eski cevap yeni sonucun üstüne yazmıyor.
 *
 * KUTU BURADA YOK, İKİ YERLEŞİM
 * -----------------------------
 * Kişi araması iki kutudan yapılıyor: üst çubuktaki kutu (Header,
 * `sosyaldeMi`, `hidden lg:block`) ve rehber sayfasının kendi kutusu
 * (RehberMerkezi). /cv içindeki mobil kutu bilinçli olarak kaldırıldı;
 * telefonda üst çubukta kutu olmadığı için mobil kişi arama yolu rehber
 * kutusu. Bu dosya yalnız sonuç mantığını (geciktirme, dört durum,
 * satırlar) taşıyor; kutuyu çizen yer çağıran. Mantık burada tek kez
 * yazılı, `sosyalKullaniciAra` çağrısı depoda yalnız burada.
 *
 * GÖMÜLÜ KİP (`gomuluBaslik`)
 * ---------------------------
 * Rehber kutusu aynı anda rehber, bölüm ve işveren de arıyor; o sayfada
 * "en az üç harf yaz", "aranıyor…" ya da "eşleşen profil yok" satırları
 * rehber sonuçlarının üstünde gürültü olurdu — kullanıcı kişi aramıyor
 * olabilir. Başlık verildiğinde dört durum metni YAZILMIYOR: eşleşme
 * yoksa parça hiç çizilmiyor, varsa başlık + satırlar çiziliyor. Üst
 * çubukta ise dört durum olduğu gibi duruyor: orada kutu yalnız kişi
 * arıyor ve sessizlik "ne bekliyorum" sorusunu cevapsız bırakırdı.
 *
 * `sahibiMi` BAYRAĞI ALMIYOR
 * --------------------------
 * Üst çubuk kutuyu yalnız oturum açmış kullanıcının sosyal sayfalarında
 * çiziyor; ikinci bir gizleme, sınırın nerede olduğunu
 * bulanıklaştırırdı.
 */

/** Girdi duruncaya kadar beklenen süre. */
const GECIKME_MS = 300;

const SATIR = `flex min-h-11 items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

type Durum = 'kisa' | 'yukleniyor' | 'hazir' | 'hata';

type Gezinme = (yol: string, secenek?: { degistir?: boolean }) => void;

interface SonucProps {
  /** Ham sorgu; harfe indirme ve uzunluk ölçümü burada yapılıyor. */
  sorgu: string;
  /** `degistir` geçmişe kayıt eklemeden adresi değiştiriyor; bkz. App.tsx. */
  onNavigate: Gezinme;
  /**
   * Uygulama içi geçişle bir sonuca gidildiğinde çağrılıyor. Üst çubuk
   * bununla kutuyu temizleyip listeyi kapatıyor; orta tuş ve yeni sekme
   * açılışları tarayıcıya kaldığı için burada çağrılmıyor — kullanıcı
   * hâlâ aynı sayfada ve aramasını kaybetmemeli.
   */
  onSecildi?: () => void;
  /**
   * Verildiğinde parça başka bir aramanın içine gömülü: durum metinleri
   * yok, eşleşme yoksa hiç çizilmiyor, varsa bu başlıkla çiziliyor.
   * Bkz. dosya başındaki "GÖMÜLÜ KİP".
   */
  gomuluBaslik?: string;
}

/**
 * Sorguyu sonuca çeviren ve dört durumu yazan parça. Kutu burada YOK:
 * kutunun yeri ve biçimi yerleşime göre değişiyor, mantık değişmiyor.
 */
export const KullaniciAramaSonuclari: React.FC<SonucProps> = ({
  sorgu,
  onNavigate,
  onSecildi,
  gomuluBaslik,
}) => {
  const [sonuclar, setSonuclar] = React.useState<SosyalAramaSonucu[]>([]);
  const [durum, setDurum] = React.useState<Durum>('kisa');

  /* Ölçü sunucudakiyle aynı: harfe indirilmiş uzunluk, ham metin değil. */
  const harfSayisi = kullaniciAdiHarfeIndir(sorgu).length;
  const yeterliMi = harfSayisi >= ARAMA_EN_AZ_HARF;

  React.useEffect(() => {
    if (!yeterliMi) {
      /*
        Kısa sorguda eski sonuçlar da siliniyor: "mus" yazıp "mu"ya
        dönen kullanıcı, artık aramadığı bir listeye bakıyor olurdu.
      */
      setSonuclar([]);
      setDurum('kisa');
      return;
    }

    let iptal = false;
    setDurum('yukleniyor');
    const zaman = window.setTimeout(() => {
      sosyalKullaniciAra(sorgu)
        .then((liste) => {
          if (iptal) return;
          setSonuclar(liste);
          setDurum('hazir');
        })
        .catch(() => {
          if (!iptal) setDurum('hata');
        });
    }, GECIKME_MS);

    return () => {
      iptal = true;
      window.clearTimeout(zaman);
    };
  }, [sorgu, yeterliMi]);

  const liste =
    durum === 'hazir' && sonuclar.length > 0 ? (
      <ul className="space-y-0.5">
        {sonuclar.map((kisi) => {
          const yol = profilYolu(kisi.kullaniciAdi);
          /*
            İki satırın ikincisi yalnız GERÇEKTEN varsa çiziliyor:
            bölüm etiketi ve şehir isteğe bağlı kolonlar ve boşken
            satırı yer tutucu bir metinle doldurmak, girilmemiş bir
            bilgiyi varmış gibi göstermek olurdu.
          */
          const ikinciSatir = [kisi.bolumEtiketi, kisi.sehir].filter(Boolean).join(' · ');
          /* Görünen ad yoksa uydurulmuyor; kullanıcı adı zaten altında. */
          const ad = kisi.gorunenAd ?? `@${kisi.kullaniciAdi}`;
          return (
            <li key={kisi.kullaniciAdi}>
              {/*
                Gerçek `<a href>`: orta tuş ve "yeni sekmede aç"
                çalışıyor. Değiştirici tuşlarda tarayıcıya
                dokunulmuyor.
              */}
              <a
                href={yol}
                onClick={(olay) => {
                  if (
                    olay.metaKey ||
                    olay.ctrlKey ||
                    olay.shiftKey ||
                    olay.altKey ||
                    olay.button !== 0
                  )
                    return;
                  olay.preventDefault();
                  onNavigate(yol);
                  onSecildi?.();
                }}
                className={SATIR}
              >
                <ProfilFotografi
                  ad={ad}
                  yol={kisi.avatarYolu}
                  className="h-10 w-10 shrink-0 rounded-full text-sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-gray-900">{ad}</span>
                  <span className="block truncate text-xs text-gray-600">
                    @{kisi.kullaniciAdi}
                    {ikinciSatir ? ` · ${ikinciSatir}` : ''}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    ) : null;

  if (gomuluBaslik !== undefined) {
    if (!liste) return null;
    /* Başlık ve kap, RehberSonuclari'ndaki grup başlığı ve kart kabıyla aynı ölçüde. */
    return (
      <section className="space-y-3">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-sm font-bold text-gray-900">{gomuluBaslik}</h3>
          <span className="text-xs text-gray-600">{sonuclar.length}</span>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5">{liste}</div>
      </section>
    );
  }

  return (
    <div className="space-y-2">
      {/*
        DÖRT DURUMUN DÖRDÜ DE YAZILI ve `role="status"` ile okunuyor:
        kısa sorgu, arama sürüyor, eşleşme yok, sunucu vermedi. İlk ikisi
        birbirinin yerine geçseydi kullanıcı ne beklediğini bilemezdi.
      */}
      {durum === 'kisa' && (
        <p role="status" className="text-xs text-gray-600">
          Aramak için en az {ARAMA_EN_AZ_HARF} harf yaz.
        </p>
      )}
      {durum === 'yukleniyor' && (
        <p role="status" className="text-xs text-gray-600">
          Aranıyor…
        </p>
      )}
      {durum === 'hata' && (
        <p role="alert" className="text-xs font-semibold text-rose-700">
          Arama yapılamadı. Yeniden deneyebilirsin.
        </p>
      )}
      {durum === 'hazir' && sonuclar.length === 0 && (
        /*
          "Böyle bir kullanıcı yok" DENMİYOR: arama yalnız çağıranın
          görebildiği profilleri tarıyor (`sosyal_gorunur`), yani boş
          sonuç bir varlık cevabı değil.
        */
        <p role="status" className="text-xs text-gray-600">
          Bu adla eşleşen açık profil bulunamadı.
        </p>
      )}

      {liste}
    </div>
  );
};
