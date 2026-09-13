import React from 'react';
import { ImagePlus, X } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
/*
  BESTECİ GECİKMELİ YÜKLENİYOR

  Bu giriş artık site üst çubuğundan da çiziliyor, yani ANA PAKETE
  giriyor. `PaylasimOlustur` doğrudan içeri alınınca ana paket 438 →
  453 KB oldu (ölçüldü): küçültme, EXIF düşürme ve form, hiç fotoğraf
  paylaşmayacak ziyaretçinin de indirdiği 16 KB.

  Besteci ancak dosya SEÇİLDİKTEN sonra çiziliyor; parça tam o anda
  iniyor. Seçici zaten kullanıcının dokunuşuyla açılıyor ve dosya
  seçmek saniyeler sürüyor — parçanın inmesi için fazlasıyla zaman var.
*/
const PaylasimOlustur = React.lazy(() =>
  import('./PaylasimOlustur').then((m) => ({ default: m.PaylasimOlustur })),
);

/**
 * FOTOĞRAF PAYLAŞMA GİRİŞİ — SİMGE, SEÇİCİ VE BESTECİ TEK YERDE
 *
 * Bu üçlü Ağım'ın içinde yazılmıştı ve profil sayfasına da aynı giriş
 * istendi. İkinci bir kopya yazmak, iki ekranın zamanla ayrışması
 * demekti: biri seçiciyi dokunmadan açar öteki açmaz, biri ön koşulu
 * sorar öteki sormaz. Giriş noktası artık tek bileşen; iki ekran da
 * onu çiziyor.
 *
 * SEÇİCİ DOKUNMANIN İÇİNDEN AÇILIYOR
 * ----------------------------------
 * Tarayıcılar dosya seçiciyi yalnız kullanıcı hareketinin İÇİNDEN
 * açıyor. Araya bir gezinme ya da bir `await` girse seçici hiç
 * açılmazdı — bu yüzden `fotografSec` eşzamanlı ve doğrudan gizli
 * kutuyu tıklıyor.
 *
 * VAZGEÇME SESSİZ: seçici iptal edilirse tarayıcı `change` olayı
 * yollamıyor, yani hiçbir şey olmuyor — altındaki sayfa olduğu yerde,
 * kaydırma konumu yerinde kalıyor.
 *
 * ÖN KOŞUL SEÇİMDEN ÖNCE SORULUYOR
 * --------------------------------
 * Sunucu paylaşımı profil yayında değilken ya da alan seçilmemişken
 * zaten reddediyor. Seçiciyi açmak, kullanıcıya fotoğraflarını
 * seçtirip sonra hayır demek olurdu. Koşul okunana kadar simge kapalı:
 * bilinmeyen bir şeye göre karar verilmiyor.
 */

interface GirisProps {
  /** Profil okundu mu; okunmadan simge kapalı. */
  hazirMi: boolean;
  /** Sunucudaki ön koşulun aynısı: profil yayında + alan seçili. */
  paylasabilirMi: boolean;
  /**
   * Ön koşul sağlanmıyorken basıldığında nereye gidileceği.
   * Verilmezse simge yine çiziliyor ama basınca bir şey olmuyor —
   * bu yüzden çağıranların hepsi veriyor.
   */
  onOnKosulEksik?: () => void;
  /** Besteci içindeki "Alan toplulukları" bağlantısı için. */
  onNavigate: (yol: string) => void;
  /** Paylaşım tamamlandıktan SONRA; akışı tazelemek ya da akışa dönmek. */
  onTamamlandi: () => void;
  /** Simge ölçüsü çağırandan: Ağım'ın çubuğu ile site çubuğu aynı değil. */
  dugmeSinifi: string;
  ikonSinifi?: string;
}

/**
 * Dışarıdan seçiciyi açma kolu.
 *
 * Ağım'ın boş durumundaki "İlk paylaşımını oluştur" düğmesi aynı işi
 * yapıyor ama başka bir düğme: geniş, mavi, metinli. Aynı DOM düğümü
 * olamaz. İkinci bir gizli kutu ve ikinci bir besteci açmak yerine,
 * var olan girişe bir kol veriliyor — seçici yine TEK yerden açılıyor
 * ve dokunmanın içinden çağrıldığı için tarayıcı onu engellemiyor.
 */
export interface FotografPaylasKolu {
  sec: () => void;
}

export const FotografPaylasGirisi = React.forwardRef<FotografPaylasKolu, GirisProps>(({
  hazirMi,
  paylasabilirMi,
  onOnKosulEksik,
  onNavigate,
  onTamamlandi,
  dugmeSinifi,
  ikonSinifi = 'h-6 w-6',
}, kol) => {
  const dosyaGirdisi = React.useRef<HTMLInputElement>(null);
  /* `null` = besteci kapalı. Boş dizi diye bir durum yok: seçim olmadan açılmıyor. */
  const [olusturDosyalari, setOlusturDosyalari] = React.useState<File[] | null>(null);
  /*
    Yükleme sürerken kapatma düğmesi kilitli: yarıda kalmış bir
    yüklemeyi sessizce çöpe atmamak için. Bilgi bestecinin kendisinden
    geliyor, burada tahmin edilmiyor.
  */
  const [besteciMesgul, setBesteciMesgul] = React.useState(false);

  const fotografSec = () => {
    if (!paylasabilirMi) {
      onOnKosulEksik?.();
      return;
    }
    dosyaGirdisi.current?.click();
  };

  React.useImperativeHandle(kol, () => ({ sec: fotografSec }));

  return (
    <>
      <input
        ref={dosyaGirdisi}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(olay) => {
          const liste = Array.from(olay.target.files ?? []);
          /* Aynı fotoğraf art arda seçilebilsin diye kutu boşaltılıyor. */
          olay.target.value = '';
          if (liste.length === 0) return;
          setOlusturDosyalari(liste);
        }}
      />

      <button
        type="button"
        onClick={fotografSec}
        aria-label="Fotoğraf paylaş"
        /*
          PROFİL OKUNANA KADAR KAPALI

          Okunmadan basılsaydı koşul "sağlanmıyor" sayılır ve kullanıcı
          boş yere profil ekranına atılırdı.
        */
        disabled={!hazirMi}
        className={`${dugmeSinifi} disabled:cursor-default disabled:opacity-40`}
      >
        <ImagePlus aria-hidden className={ikonSinifi} />
      </button>

      {/*
        BESTECİ SAYFANIN ÜSTÜNDE, YERİNE DEĞİL

        Altındaki ekran DOM'dan kalkmıyor: kullanıcı vazgeçince tam
        bıraktığı yere dönüyor. Sayfayı bestecinin yerine çizmek
        kaydırma konumunu sıfırlardı.

        `z-40`: alt menü 50'de kalıyor, yani bulunulan sekme seçili
        GÖRÜNMEYE devam ediyor — kullanıcı bir yere gitmiş olmuyor.
      */}
      {olusturDosyalari && (
        <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-white">
          {/*
            KAPATMA YOLU TEPEDE

            Ekranın kendi "Vazgeç" düğmesi formun ALTINDA: telefonda
            fotoğraf, açıklama ve kitle kartlarının arkasında kalıyor.
            Üst çubuk sayfanın geri kalanıyla aynı ölçüde (`h-15`,
            `px-2.5`, 44 piksellik ikon düğmesi).

            BAŞLIK YOK: ekran zaten "Fotoğraf paylaş" diye bir `h1`
            taşıyor. İkincisini yazmak aynı şeyi iki kez söylemek olurdu.
          */}
          <div className="sticky top-0 z-10 flex h-15 items-center border-b border-gray-200 bg-white px-2.5">
            <button
              type="button"
              onClick={() => setOlusturDosyalari(null)}
              disabled={besteciMesgul}
              aria-label="Paylaşımdan vazgeç"
              className={`relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-gray-800 hover:bg-gray-100 disabled:cursor-default disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`}
            >
              <X aria-hidden className="h-6 w-6" />
            </button>
          </div>

          <div className="mx-auto w-full max-w-[600px] px-4 pb-24 pt-4">
            {/*
              Yedek metin DÜRÜST: ekran henüz inmedi, "fotoğraflar
              hazırlanıyor" demek yanlış olurdu — o cümle bestecinin
              kendi durumu ve küçültme başladığında orada yazıyor.
            */}
            <React.Suspense
              fallback={
                <p role="status" className="text-sm font-semibold text-gray-700">
                  Paylaşım ekranı açılıyor…
                </p>
              }
            >
            <PaylasimOlustur
              baslangicDosyalari={olusturDosyalari}
              onMesgulDegisti={setBesteciMesgul}
              onNavigate={onNavigate}
              onVazgec={() => setOlusturDosyalari(null)}
              onTamamlandi={() => {
                /*
                  Sıra önemli: önce kapan, sonra çağırana haber ver.
                  Tersi olsaydı kullanıcı yeni akışı bestecinin arkasında
                  bir an görür, sonra ekran kapanırdı.
                */
                setOlusturDosyalari(null);
                onTamamlandi();
              }}
            />
            </React.Suspense>
          </div>
        </div>
      )}
    </>
  );
});

FotografPaylasGirisi.displayName = 'FotografPaylasGirisi';
