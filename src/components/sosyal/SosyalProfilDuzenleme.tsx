import React from 'react';
import { Check, Lock } from 'lucide-react';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { SosyalHata, sosyalProfilGuncelle, type SosyalProfil } from '../../lib/queries/sosyal';
import { biyografiHatasi } from '../../lib/sosyal-kullanici-adi.mjs';
import type { TalepKipi } from './BolumTalebi';
import { KullaniciAdiDegistirme } from './KullaniciAdiDegistirme';
import { BiyografiAlani, KayitHatasi, MetinAlani } from './SosyalFormAlanlari';

/**
 * PROFİL DÜZENLEME
 *
 * KULLANICI ADI ARTIK BURADA DEĞİŞİYOR, BÖLÜM VE ALAN DEĞİŞMİYOR
 * -------------------------------------------------------------
 * Kullanıcı adı uzun süre düz metindi ve gerekçesi doğruydu: ad kalıcı
 * adres, değişseydi paylaşılmış her bağlantı kırılır ve bırakılan ad
 * başkasına verilebilirdi. O gerekçenin karşılığı artık BAŞKA bir yerde:
 * 20260926020000 bırakılan adı kalıcı rezerve ediyor ve eski adresi
 * yenisine çözüyor. Alan bu yüzden açıldı ve kendi bileşeninde
 * (`KullaniciAdiDegistirme`) — kural, hata kodları ve adres cümlesi tek
 * yerde kalsın diye.
 *
 * Bölüm ve alan hâlâ düz metin:
 *   · Alan (sektör) görünürlük değil TOPLULUK sınırı ve veritabanı
 *     tetikleyicisi değişimi reddediyor (`kimlik_kilidi`).
 *   · Bölüm de aynı kilidin içinde; kolon yetkisi de yok.
 * Devre dışı bir giriş kutusu çizilmiyor: kapalı bir kutu "burası
 * ileride açılacak" diye okunuyor. Değerler düz metin.
 *
 * AYNI EKRAN, AYRI BÖLÜM, AYRI KAYIT
 * ----------------------------------
 * Bu blok artık dişliden açılan ayrı bir ekran değil: `/cv` düzenleme
 * dalının SOSYAL bölümü. Öğrenci alanları (okul, CV, program, beceri,
 * dil, proje) aynı ekranda, hemen yukarıda duruyor. Kullanıcı için tek
 * bir "profilimi düzenliyorum" işi vardı; iki ayrı ekran ve iki ayrı
 * giriş o işi ikiye bölüyordu.
 *
 * EKRAN TEK, KAYIT TEK DEĞİL. Öğrenci alanları `student_profiles`e,
 * buradakiler `social_profiles`a yazılıyor; kullanıcı adı ise üçüncü bir
 * yazma. Tek bir "Kaydet" düğmesi tek bir başarı/hata sonucu iddia
 * ederdi ve yarısı başarılı bir gönderimde kullanıcıya YALAN söylerdi.
 * Bu yüzden bölümün kendi gönderimi, kendi durumu ve kendi hata satırı
 * var; ortak bir hata şeridi yok. Başlık da hangi kaynağa yazıldığını
 * söylüyor ("Sosyal profilin").
 *
 * Hiçbir alan kopyalanmadı: her alan tek yerde.
 */

interface DuzenlemeProps {
  kullaniciId: string;
  profil: SosyalProfil;
  onKaydedildi: (girdi: {
    gorunenAd: string | null;
    biyografi: string | null;
    bolumEtiketi: string | null;
    sinifEtiketi: string | null;
    sehir: string | null;
  }) => void;
  /**
   * Vazgeçme eylemi İSTEĞE BAĞLI.
   *
   * Tek düzenleme ekranında bu bölümün kapatılacak bir kabuğu yok; dönüş
   * bağlantısı ("Profilime dön") ekranın sol sütununda zaten duruyor.
   * Verilmezse düğme çizilmiyor — aynı ekranda iki farklı "çık" düğmesi,
   * hangisinin neyi iptal ettiğini belirsizleştirirdi.
   */
  onVazgec?: () => void;
  /**
   * Kullanıcı adı değiştiğinde çağrılıyor.
   *
   * Ayrı bir geri çağrı çünkü ad `sosyalProfilGuncelle` ile DEĞİL kendi
   * RPC'siyle yazılıyor; ikisini tek geri çağrıda toplamak, hangi
   * yazmanın başarılı olduğunu belirsizleştirirdi.
   */
  onKullaniciAdiDegisti: (yeniAd: string) => void;
  /**
   * BÖLÜM / ALAN TALEBİNİN TEK GİRİŞİ
   *
   * `null` ise satır DOM'a hiç girmiyor: bölümü katalogla eşleşmiş ve
   * alanı bağlanmış kullanıcının yapacağı bir iş yok, ona bir talep
   * düğmesi çizmek olmayan bir sorunu varmış gibi göstermek olurdu.
   *
   * Kip iki ayrı durumu ayırıyor ve ikisinin cümlesi de ayrı: birinde
   * yönetimin işi kataloğa bölüm eklemek, ötekinde var olan bölüme alan
   * eşlemek. Tek cümle olsaydı ikisi de yanlış anlatılırdı.
   *
   * Talep ekranı bu formun İÇİNDE açılmıyor (`onTalepAc` bir görünüm
   * değiştiriyor): `BolumTalebi` kendi `<form>`unu taşıyor ve iç içe
   * form geçersiz HTML olurdu.
   */
  talepKipi: TalepKipi | null;
  onTalepAc: () => void;
}

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';
/* İkincil düğme kalıbı; sayfadaki ötekilerle aynı ölçü ve aynı odak halkası. */
const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

/** Boş metin veritabanına NULL gidiyor; ekranda da boş satır çizilmiyor. */
function bosNull(deger: string): string | null {
  const metin = deger.trim();
  return metin === '' ? null : metin;
}

export const SosyalProfilDuzenleme: React.FC<DuzenlemeProps> = ({
  kullaniciId,
  profil,
  onKaydedildi,
  onVazgec,
  onKullaniciAdiDegisti,
  talepKipi,
  onTalepAc,
}) => {
  const [gorunenAd, setGorunenAd] = React.useState(profil.gorunenAd ?? '');
  const [biyografi, setBiyografi] = React.useState(profil.biyografi ?? '');
  const [bolum, setBolum] = React.useState(profil.bolumEtiketi ?? '');
  const [sinif, setSinif] = React.useState(profil.sinifEtiketi ?? '');
  const [sehir, setSehir] = React.useState(profil.sehir ?? '');
  /*
    BÖLÜMÜN KENDİ DURUMU

    Dört değer tek yerde: bekliyor / gönderiliyor / kaydedildi / hata.
    Üstteki öğrenci bölümlerinin de kendi durumu var ve ikisi BİRBİRİNE
    KARIŞMIYOR — buradaki bir hata, yukarıda başarıyla kaydedilmiş bir
    alanı geri alınmış gibi gösteremiyor.
  */
  const [kayitDurumu, setKayitDurumu] = React.useState<
    'bekliyor' | 'gonderiliyor' | 'kaydedildi' | 'hata'
  >('bekliyor');
  const [kayitHatasi, setKayitHatasi] = React.useState<string | null>(null);
  const kaydediliyor = kayitDurumu === 'gonderiliyor';

  const bioHatasi = biyografiHatasi(biyografi);

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    setKayitHatasi(null);
    if (bioHatasi || kaydediliyor) return;

    setKayitDurumu('gonderiliyor');
    try {
      await sosyalProfilGuncelle(kullaniciId, {
        gorunenAd,
        biyografi,
        bolumEtiketi: bolum,
        sinifEtiketi: sinif,
        sehir,
      });
      /*
        Ekrandaki profil ancak yazma BAŞARILI olduktan sonra
        güncelleniyor. İyimser güncelleme burada yanlış olurdu: yazma
        başarısızsa kullanıcı ekranda gördüğü değerin kaydedildiğini
        sanırdı.
      */
      onKaydedildi({
        gorunenAd: bosNull(gorunenAd),
        biyografi: bosNull(biyografi),
        bolumEtiketi: bosNull(bolum),
        sinifEtiketi: bosNull(sinif),
        sehir: bosNull(sehir),
      });
      setKayitDurumu('kaydedildi');
    } catch (sorun) {
      /*
        Ham veritabanı hatası kullanıcıya ulaşmıyor: `SosyalHata` mesajı
        zaten `details` kodundan seçilmiş Türkçe cümle. Kod eşleşmezse
        cümle uydurulmuyor, ne yapılabileceği yazılıyor.
      */
      setKayitHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'Sosyal profilin güncellenemedi. Bağlantını kontrol edip yeniden dene.',
      );
      setKayitDurumu('hata');
    }
  };

  /* Yazmaya devam eden kullanıcıda "Kaydedildi" satırı asılı kalmıyor. */
  const yaz = <T,>(ayarla: (deger: T) => void) => (deger: T) => {
    if (kayitDurumu === 'kaydedildi') setKayitDurumu('bekliyor');
    ayarla(deger);
  };

  return (
    <section aria-labelledby="sosyal-bolum-basligi" className="space-y-4">
      {/*
        BAŞLIK KAYNAĞI SÖYLÜYOR

        Eski başlık "Profili düzenle" idi ve tek başına doğruydu: ekranın
        tamamı buydu. Artık ekranın YARISI — üstünde öğrenci bilgileri
        bölümü var ve o bölüm başka bir tabloya yazıyor. Kullanıcı
        "Kaydet"e basmadan önce neyin nereye gittiğini görmeli; iki
        başlık bu yüzden iki kaynağı adlandırıyor.

        Düzey `h2`: sayfanın `h1`i `/cv` ekranının kendisinde.
      */}
      <header className="space-y-1.5">
        <h2
          id="sosyal-bolum-basligi"
          className="text-base font-extrabold tracking-tight text-gray-900"
        >
          Sosyal profilin
        </h2>
        <p className="text-sm leading-relaxed text-gray-600">
          Bu alanlar profil adresinde görünüyor ve öğrenci bilgilerinden ayrı kaydediliyor.
        </p>
      </header>

      {/*
        KULLANICI ADI FORMUN DIŞINDA

        Kendi `<form>`unu ve kendi gönderimini taşıyor: iç içe form
        olamayacağı gibi, adı değiştirmek ile profil alanlarını
        kaydetmek iki AYRI yazma ve tek bir "Kaydet" düğmesinin arkasına
        konsaydı biri başarısız olduğunda ötekinin durumu belirsiz
        kalırdı.
      */}
      <KullaniciAdiDegistirme
        kullaniciAdi={profil.kullaniciAdi}
        onDegisti={onKullaniciAdiDegisti}
      />

      <form onSubmit={gonder} className="space-y-4" noValidate>
        <div className={`${KART} space-y-2.5`}>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <span>Bölüm ve alan değiştirilemiyor.</span>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-bold text-gray-900">Bölüm</dt>
              {/*
                Resmî bölüm adı katalogdan. Gelmediyse uydurulmuyor;
                bilinmediği yazılıyor.
              */}
              {/*
                Bölüm eşleşmediyse `department_id` NULL kalıyor
                (20260926050000) ve profil YİNE açılıyor. Eksiklik
                uydurulmuyor, olduğu gibi yazılıyor.
              */}
              <dd className="min-w-0 break-words text-gray-700">
                {profil.bolumAdi ?? 'Bölümün katalogla eşleşmedi'}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-bold text-gray-900">Alan</dt>
              {/*
                Alan adı `sectors` birleşiminden geliyor. Gelmediyse
                uydurulmuyor; bilinmediği yazılıyor.
              */}
              <dd className="text-gray-700">
                {profil.sektorAdi ?? 'Bölümün için alan tanımlı değil'}
              </dd>
            </div>
          </dl>

          {/*
            TALEP GİRİŞİ EKSİĞİN YANINDA

            Kullanıcı eksikliği tam burada okuyor ("Bölümün katalogla
            eşleşmedi" / "Bölümün için alan tanımlı değil"); yapılabilecek
            tek şeyin başka bir ekranda durması, eksikliği okuyup hiçbir
            yere gidememek demekti. Ekranın eski girişi kurulum formundaydı
            ve o form kalktığı için talep hiçbir yerden açılamıyordu.

            YAKIN BİR BÖLÜM ÖNERİLMİYOR. Katalogda olmayan bir bölüm
            (örn. "Spor Yöneticiliği") için en yakın adı önermek,
            kullanıcıyı okumadığı bir bölüme ve yanlış bir alan
            topluluğuna bağlardı. Önerilen tek şey talebin kendisi.
          */}
          {talepKipi && (
            <div className="space-y-2 border-t border-gray-100 pt-2.5">
              <p className="text-sm leading-relaxed text-gray-600">
                {talepKipi === 'bolum-yok'
                  ? 'Bölümün kataloğumuzla eşleşmedi; bu yüzden alanın da belirlenmedi. Bölümünü yönetime bildirebilirsin.'
                  : 'Bölümün katalogda var ama hangi alana bağlanacağı henüz tanımlı değil. Eşlemeyi yönetimden isteyebilirsin.'}
              </p>
              <button type="button" onClick={onTalepAc} className={IKINCIL}>
                {talepKipi === 'bolum-yok' ? 'Bölümümü bildir' : 'Alan eşlemesi iste'}
              </button>
            </div>
          )}
        </div>

        <div className={`${KART} space-y-3`}>
          <MetinAlani
            kimlik="sosyal-duzenle-gorunen-ad"
            etiket="Görünen ad"
            deger={gorunenAd}
            onDegis={yaz(setGorunenAd)}
            enFazla={80}
            otomatikTamamlama="name"
          />
          <BiyografiAlani deger={biyografi} onDegis={yaz(setBiyografi)} hata={bioHatasi} />
          {/*
            ETİKET "BÖLÜM" DEĞİL "EĞİTİM NOTU"

            Resmî bölüm `departments` ilişkisinden geliyor ve buradan
            değiştirilemiyor (kolon yetkisi kapalı). Bu kutu serbest metin;
            etiketi "Bölüm" kalsaydı kullanıcı buraya başka bir bölüm adı
            yazıp profilinde sistem bölümünü taklit edebileceğini sanırdı.
            Profilde de resmî adın ALTINDA, ikincil ağırlıkta çiziliyor.
          */}
          <MetinAlani
            kimlik="sosyal-duzenle-bolum"
            etiket="Eğitim notu"
            deger={bolum}
            onDegis={yaz(setBolum)}
            enFazla={80}
            yerTutucu="çift anadal, yandal: veri bilimi"
          />
          <MetinAlani
            kimlik="sosyal-duzenle-sinif"
            etiket="Sınıf"
            deger={sinif}
            onDegis={yaz(setSinif)}
            enFazla={40}
          />
          <MetinAlani
            kimlik="sosyal-duzenle-sehir"
            etiket="Şehir"
            deger={sehir}
            onDegis={yaz(setSehir)}
            enFazla={80}
            otomatikTamamlama="address-level2"
          />
        </div>

        {/*
          HATA SATIRI BU BÖLÜME AİT

          Ekranın ortak bir hata şeridi YOK. Olsaydı, buradaki bir hata
          yukarıda az önce kaydedilmiş bir öğrenci alanını da başarısız
          gibi gösterirdi — iki ayrı tabloya giden iki ayrı yazma, tek bir
          sonuç cümlesiyle anlatılamaz.
        */}
        {kayitHatasi && <KayitHatasi mesaj={kayitHatasi} />}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={kaydediliyor} className={BIRINCIL_EYLEM}>
            {kaydediliyor ? 'Kaydediliyor…' : 'Sosyal profili kaydet'}
          </button>
          {/*
            "Kaydedildi" YALNIZ sunucu yazmayı kabul ettikten sonra
            yazılıyor; iyimser bir onay, kaydedilmemiş bir değeri
            kaydedilmiş gösterirdi. Biçim üstteki öğrenci bölümleriyle
            aynı: aynı ekranda iki farklı "kaydedildi" görüntüsü olmasın.
          */}
          {kayitDurumu === 'kaydedildi' && (
            <span
              role="status"
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600"
            >
              <Check aria-hidden className="h-4 w-4" /> Kaydedildi
            </span>
          )}
          {onVazgec && (
            <button
              type="button"
              onClick={onVazgec}
              disabled={kaydediliyor}
              className={`inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`}
            >
              Vazgeç
            </button>
          )}
        </div>
      </form>
    </section>
  );
};
