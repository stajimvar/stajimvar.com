import React from 'react';
import { Lock } from 'lucide-react';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI, RENK_UYARI } from '../../lib/renk-token';
import {
  SosyalHata,
  bolumleriGetir,
  sosyalProfilKur,
  type SosyalBolum,
} from '../../lib/queries/sosyal';
import {
  biyografiHatasi,
  kullaniciAdiHatasi,
  kullaniciAdiNormalize,
} from '../../lib/sosyal-kullanici-adi.mjs';
import { BolumSecimi } from './BolumSecimi';
import { BiyografiAlani, KayitHatasi, MetinAlani } from './SosyalFormAlanlari';

/**
 * SOSYAL PROFİL KURULUMU
 *
 * `/profil` adresinde, `social_profiles` satırı ya da `username` yokken
 * çizilen GERÇEK ekran. Bir karşılama sayfası değil: iki zorunlu alanı
 * (bölüm ve kullanıcı adı) toplayıp `sosyal_profil_kur` RPC'sine
 * gönderiyor.
 *
 * ALAN SEÇİCİ YOK
 * ---------------
 * Kullanıcı alanını seçmiyor: alan, seçtiği bölümden SUNUCUDA türetiliyor
 * (`department_sectors`) ve istemcinin `sector_id` kolonuna yazma yetkisi
 * bile yok. Ekranda bir alan listesi bırakmak, sunucunun yok sayacağı bir
 * seçimi kullanıcıya yaptırmak olurdu. Seçilen bölümün alanı da
 * ÖNİZLENMİYOR; eşlemeyi istemcide ikinci kez okumak, iki kaynak ve
 * sessiz bir ayrışma demek olurdu.
 *
 * BÖLÜM KAPALI LİSTE — AMA ÇIKMAZ SOKAK DEĞİL
 * -------------------------------------------
 * Seçenekler `departments` tablosundan; "Diğer" ya da serbest metin yok.
 * Katalog Türkiye'deki bütün bölümleri kapsamıyor ve bu bilinçli. Eksik
 * bölümün yolu talep kuyruğu: "Bölümüm listede yok" düğmesi ARTIK
 * çiziliyor, çünkü talebi değerlendirecek yönetim ekranı da bu aşamada
 * açıldı (`/yonetim/bolum-talepleri`). Talebi karşılıksız kalacak bir
 * düğme olsaydı çizilmezdi.
 *
 * SEÇİM GERİ ALINAMIYOR
 * ---------------------
 * `kimlik_kilidi()` tetikleyicisi bölümü ve alanı "bir kez yazılır"
 * yapıyor; RPC de ikinci çağrıda ikisini `coalesce` ile koruyor. Bu
 * ekranın uyarı kutusu o kuralı kullanıcıya kaydetmeden ÖNCE söylüyor.
 *
 * TOPLULUĞA KATILMA AÇIK SEÇİM
 * ----------------------------
 * `yayinda_mi` formun sonundaki onay kutusundan geliyor ve kutu KAPALI
 * başlıyor. Sessiz bir varsayılan olamazdı: katılmak "aynı alandaki
 * öğrenciler seni görebilir" demek. Seçilmezse profil yalnız sahibine
 * görünüyor ve profil sayfasındaki uyarı kutusundan sonradan
 * katılabiliyor — yani kapalı seçim çıkmaz sokak değil. Kararın tersi de
 * her zaman elde: profil sayfasının dişli menüsündeki satır aynı kolonu
 * iki yönde de yazıyor.
 */

interface KurulumProps {
  /** Kayıt bitince çağıran taraf kalıcı profil adresine gidiyor. */
  onTamamlandi: (kullaniciAdi: string) => void;
  /**
   * Talep ekranını açan çıkış.
   *
   * İki sebep var ve ikisi ayrı cümle istiyor: bölüm katalogda hiç yok
   * ('bolum-yok'), ya da bölüm var ama alanı tanımlı değil
   * ('alan-tanimsiz'). İkincisini ancak sunucu söyleyebiliyor; kurulum
   * hatası o kodla döndüğünde buradan yukarı bildiriliyor.
   */
  onTalepGerekli: (kip: 'bolum-yok' | 'alan-tanimsiz', bolum: SosyalBolum | null) => void;
}

type ListeDurumu = 'yukleniyor' | 'hazir' | 'hata';

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

export const SosyalProfilKurulum: React.FC<KurulumProps> = ({
  onTamamlandi,
  onTalepGerekli,
}) => {
  const [bolumler, setBolumler] = React.useState<SosyalBolum[]>([]);
  const [listeDurumu, setListeDurumu] = React.useState<ListeDurumu>('yukleniyor');
  const [listeDeneme, setListeDeneme] = React.useState(0);

  const [bolumSlug, setBolumSlug] = React.useState('');
  const [kullaniciAdi, setKullaniciAdi] = React.useState('');
  const [gorunenAd, setGorunenAd] = React.useState('');
  const [biyografi, setBiyografi] = React.useState('');
  const [sinif, setSinif] = React.useState('');
  const [sehir, setSehir] = React.useState('');
  /* Varsayılan KAPALI: topluluğa katılmak kullanıcının açık seçimi. */
  const [yayimla, setYayimla] = React.useState(false);

  const [gonderildi, setGonderildi] = React.useState(false);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [kayitHatasi, setKayitHatasi] = React.useState<string | null>(null);

  React.useEffect(() => {
    let iptal = false;
    setListeDurumu('yukleniyor');
    bolumleriGetir()
      .then((liste) => {
        if (iptal) return;
        setBolumler(liste);
        setListeDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setListeDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, [listeDeneme]);

  const seciliBolum = bolumler.find((aday) => aday.slug === bolumSlug) ?? null;

  /*
    Büyük harf yazan kullanıcı reddedilmiyor, yazdığı yazarken küçülüyor:
    kaydedilecek değer neyse kutuda o duruyor. Sürpriz bir dönüşüm
    kaydetme anında olsaydı kullanıcı adının başkasına ait bir yazımını
    kaydettiğini sanırdı.
  */
  const kullaniciAdiDegis = (ham: string) => setKullaniciAdi(kullaniciAdiNormalize(ham));

  const adHatasi = kullaniciAdiHatasi(kullaniciAdi);
  const bioHatasi = biyografiHatasi(biyografi);
  const bolumHatasi = bolumSlug ? null : 'Bölüm seçilmeden profil kurulamıyor.';
  const gecerli = !adHatasi && !bioHatasi && !bolumHatasi;

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    setGonderildi(true);
    setKayitHatasi(null);
    if (!gecerli || kaydediliyor) return;

    setKaydediliyor(true);
    try {
      await sosyalProfilKur({
        kullaniciAdi,
        bolumSlug,
        gorunenAd,
        biyografi,
        sinifEtiketi: sinif,
        sehir,
        yayindaMi: yayimla,
      });
      onTamamlandi(kullaniciAdi);
    } catch (sorun) {
      /*
        BAŞARILI GİBİ DAVRANMA YOK

        Kayıt olmadıysa kullanıcı profiline yönlendirilmiyor; hata
        yazılıyor ve form olduğu gibi duruyor. Kullanıcı adı çakışması
        ayrı bir cümle: onu düzeltebilir.

        `bolum-alani-tanimsiz` ise form değil EKRAN değişiyor: satır
        açılmadı ve kullanıcının burada düzeltebileceği bir şey yok.
        Tek anlamlı yol talep açmak; hatayı forma yazıp kullanıcıyı
        tekrar denemeye bırakmak, olmayan bir çözüm önermek olurdu.
      */
      if (sorun instanceof SosyalHata && sorun.kod === 'bolum-alani-tanimsiz') {
        onTalepGerekli('alan-tanimsiz', seciliBolum);
        setKaydediliyor(false);
        return;
      }
      const mesaj =
        sorun instanceof SosyalHata
          ? sorun.message
          : 'Profil kaydedilemedi. Bağlantını kontrol edip yeniden dene.';
      setKayitHatasi(mesaj);
      setKaydediliyor(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1.5">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          Sosyal profilini kur
        </h1>
        <p className="text-sm leading-relaxed text-gray-600">
          Bölümünü ve kullanıcı adını seç. İkisi de kalıcı; geri kalan bilgileri sonradan
          değiştirebilirsin.
        </p>
      </header>

      <form onSubmit={gonder} className="space-y-4" noValidate>
        <fieldset className={`${KART} space-y-3`}>
          <legend className="px-1 text-sm font-bold text-gray-900">Bölümün</legend>

          <p
            className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs leading-relaxed ${RENK_UYARI.kenar} ${RENK_UYARI.yumusakZemin} ${RENK_UYARI.metin}`}
          >
            <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Bölümünü bir kez seçiyorsun. Kaydettikten sonra değiştirilemiyor.
              Alanını sen seçmiyorsun: hangi alan topluluğuna gireceğini bölümün
              belirliyor.
            </span>
          </p>

          {listeDurumu === 'yukleniyor' && (
            <div aria-busy="true" className="space-y-2">
              <div aria-hidden className="h-11 w-full animate-pulse rounded-xl bg-gray-100" />
              <div aria-hidden className="h-11 w-full animate-pulse rounded-xl bg-gray-100" />
              <div aria-hidden className="h-11 w-full animate-pulse rounded-xl bg-gray-100" />
              <p className="text-xs text-gray-600">Bölüm listesi yükleniyor…</p>
            </div>
          )}

          {listeDurumu === 'hata' && (
            <div role="alert" className="space-y-2">
              <p className="text-sm font-bold text-gray-900">Bölüm listesi alınamadı.</p>
              <p className="text-sm text-gray-600">
                Liste gelmeden seçim yapılamıyor; profil kurulumu bu yüzden bekliyor.
              </p>
              <button
                type="button"
                onClick={() => setListeDeneme((sayi) => sayi + 1)}
                className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`}
              >
                Yeniden dene
              </button>
            </div>
          )}

          {/*
            BOŞ LİSTE HATA DEĞİL

            Sunucu cevap verdi ama hiç aktif bölüm dönmediyse bu ayrı bir
            durum: uydurma bir seçenek eklenmiyor, kullanıcıya olduğu gibi
            söyleniyor.
          */}
          {listeDurumu === 'hazir' && bolumler.length === 0 && (
            <p role="alert" className="text-sm text-gray-600">
              Şu anda seçilebilecek bir bölüm yok. Bölüm listesi tanımlanmadan profil
              kurulamıyor.
            </p>
          )}

          {listeDurumu === 'hazir' && bolumler.length > 0 && (
            <BolumSecimi bolumler={bolumler} seciliSlug={bolumSlug} onSecim={setBolumSlug} />
          )}

          {/*
            Katalog eksik olabilir ve bu bilinçli. Düğme, talebi
            değerlendirecek yönetim ekranı olduğu için çiziliyor; olmasaydı
            kullanıcıyı cevapsız kalacak bir yola sokardı.
          */}
          {listeDurumu === 'hazir' && (
            <button
              type="button"
              onClick={() => onTalepGerekli('bolum-yok', null)}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`}
            >
              Bölümüm listede yok
            </button>
          )}

          {gonderildi && bolumHatasi && listeDurumu === 'hazir' && bolumler.length > 0 && (
            <p role="alert" className="text-xs font-semibold text-rose-700">
              {bolumHatasi}
            </p>
          )}
        </fieldset>

        <div className={`${KART} space-y-3`}>
          <MetinAlani
            kimlik="sosyal-kullanici-adi"
            etiket="Kullanıcı adı"
            gerekli
            deger={kullaniciAdi}
            onDegis={kullaniciAdiDegis}
            yerTutucu="ornek.kullanici"
            enFazla={30}
            otomatikTamamlama="off"
            yardim="3-30 karakter. İngilizce küçük harf, rakam, nokta ve alt çizgi. Profil adresin bu olacak ve sonradan değişmiyor."
            hata={gonderildi || kullaniciAdi ? adHatasi : null}
          />

          <MetinAlani
            kimlik="sosyal-gorunen-ad"
            etiket="Görünen ad"
            deger={gorunenAd}
            onDegis={setGorunenAd}
            enFazla={80}
            otomatikTamamlama="name"
          />

          <BiyografiAlani deger={biyografi} onDegis={setBiyografi} hata={bioHatasi} />

          {/*
            "Eğitim notu" (şemada `bolum_etiketi`) BURADA SORULMUYOR.
            Kurulum RPC'sinin imzasında böyle bir parametre yok: resmî
            bölüm katalogdan yazılıyor, serbest metin ise sonradan
            düzenleme ekranından giriliyor. Kutuyu burada çizip
            gönderememek, kullanıcının yazdığını sessizce kaybetmek
            olurdu.
          */}
          <MetinAlani
            kimlik="sosyal-sinif"
            etiket="Sınıf"
            deger={sinif}
            onDegis={setSinif}
            enFazla={40}
            yerTutucu="2. sınıf"
          />
          <MetinAlani
            kimlik="sosyal-sehir"
            etiket="Şehir"
            deger={sehir}
            onDegis={setSehir}
            enFazla={80}
            otomatikTamamlama="address-level2"
          />
        </div>

        {/*
          Onay kutusu ayrı bir kartta: kimlik alanlarıyla aynı kutuya
          konsaydı "Şehir"in altındaki sıradan bir satır gibi okunur ve
          görünürlük kararı gözden kaçardı. Etiketin kendisi dokunma
          hedefi (min-h-11) ve odak halkası `focus-within` ile kutuya
          taşınıyor — kalıp yukarıdaki alan seçimindeki etiketlerle aynı.
        */}
        <label
          className={`${KART} flex min-h-11 cursor-pointer items-start gap-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600`}
        >
          <input
            type="checkbox"
            checked={yayimla}
            onChange={(olay) => setYayimla(olay.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
          />
          <span className="space-y-1">
            <span className="block text-sm font-bold text-gray-900">Alan topluluğuna katıl</span>
            <span className="block text-xs leading-relaxed text-gray-600">
              Seçersen profilin aynı alandaki öğrencilere görünür. Seçmezsen profil yalnızca sana
              görünür; istediğinde profil sayfandan topluluğa katılabilirsin.
            </span>
          </span>
        </label>

        {kayitHatasi && <KayitHatasi mesaj={kayitHatasi} />}

        <button
          type="submit"
          disabled={kaydediliyor || listeDurumu !== 'hazir' || bolumler.length === 0}
          className={`${BIRINCIL_EYLEM} w-full sm:w-auto`}
        >
          {kaydediliyor ? 'Kaydediliyor…' : 'Profili oluştur'}
        </button>
      </form>
    </div>
  );
};
