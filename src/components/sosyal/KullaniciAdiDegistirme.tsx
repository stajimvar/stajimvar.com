import React from 'react';
import { AtSign } from 'lucide-react';
import { BIRINCIL_EYLEM } from '../../lib/renk-token';
import { SosyalHata, sosyalKullaniciAdiDegistir } from '../../lib/queries/sosyal';
import {
  kullaniciAdiDegisimHatasi,
  kullaniciAdiHarfeIndir,
  profilAdresi,
} from '../../lib/sosyal-kullanici-adi.mjs';
import { KayitHatasi, MetinAlani } from './SosyalFormAlanlari';

/**
 * KULLANICI ADI — GÖSTERME VE DEĞİŞTİRME
 *
 * NEDEN ARTIK DÜZENLENEBİLİR
 * --------------------------
 * `SosyalProfilDuzenleme` kullanıcı adını düz metin olarak gösteriyordu
 * ve gerekçesi doğruydu: ad kalıcı adres, değişseydi paylaşılmış her
 * bağlantı kırılır ve bırakılan ad başkasına verilebilirdi. O gerekçenin
 * karşılığı artık BAŞKA bir yerde — 20260926020000 bırakılan adı kalıcı
 * olarak rezerve ediyor (`username_history`) ve eski adres yenisine
 * çözülüyor. Kırılan bağlantı ve devralınan kimlik riski kalktığı için
 * alan açıldı.
 *
 * KULLANICI NE GÖRÜYOR
 * --------------------
 * Üç şey, üçü de gerçek: güncel adı, o adın ürettiği tam adres ve
 * değiştirdiğinde ne olacağı. Son cümle bir uyarı değil bir bilgi —
 * adres değişiyor AMA eski adres kırılmıyor; ikisini birden söylemezsek
 * kullanıcı ya değiştirmeye korkar ya da eski bağlantılarının koptuğunu
 * sanır.
 *
 * İSTEMCİ DOĞRULAMASI BİR KOLAYLIK, KAPI DEĞİL
 * --------------------------------------------
 * Girdi yazılırken harfe indiriliyor ("Ayşe" → "ayse") ve kullanıcı ne
 * alacağını anında görüyor. Kabul kararı yine sunucuda: RPC
 * 'gecersiz-kullanici-adi' ya da 'kullanici-adi-alinmis' döndürebilir ve
 * o cümleler burada olduğu gibi yazılıyor.
 *
 * "MÜSAİT Mİ" SORGUSU YOK
 * -----------------------
 * Doluluk `username_history`yi de sayıyor ve o tabloya istemcinin hiçbir
 * yetkisi yok (20260926020000: `revoke all`). Bir adın boş olduğunu
 * söyleyip sonra kaydetmede reddedilmek, kullanıcıya yanlış bir söz
 * vermek olurdu. Çakışma yalnız kaydetme anında bildiriliyor.
 */

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

interface Props {
  /** Güncel ad. Sunucu profili açarken üretiyor; yoksa alan çizilmiyor. */
  kullaniciAdi: string | null;
  /** Sunucunun KABUL ETTİĞİ ad; formdaki metin değil. */
  onDegisti: (yeniAd: string) => void;
}

export const KullaniciAdiDegistirme: React.FC<Props> = ({ kullaniciAdi, onDegisti }) => {
  const [taslak, setTaslak] = React.useState('');
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [sunucuHatasi, setSunucuHatasi] = React.useState<string | null>(null);
  const [bildirim, setBildirim] = React.useState<string | null>(null);

  /*
    Kutuya yazılan her şey anında harfe iniyor. Reddetmek yerine
    indirgemek seçildi: "boşluk kullanılamaz" gibi bir uyarı, kullanıcıyı
    yazdığını silmeye zorlar; indirgeme ise sonucu doğrudan gösteriyor.
  */
  const yaz = (deger: string) => {
    setTaslak(kullaniciAdiHarfeIndir(deger));
    setSunucuHatasi(null);
    setBildirim(null);
  };

  const bicimHatasi = taslak === '' ? null : kullaniciAdiDegisimHatasi(taslak);
  /* Aynı adı yeniden göndermek boş bir istek olurdu; sunucu da satırı değiştirmiyor. */
  const degisiyorMu = taslak !== '' && taslak !== kullaniciAdi;

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    if (!degisiyorMu || bicimHatasi || gonderiliyor) return;

    setGonderiliyor(true);
    setSunucuHatasi(null);
    try {
      const kabulEdilen = await sosyalKullaniciAdiDegistir(taslak);
      /*
        Ekrandaki ad SUNUCUNUN döndürdüğü değer. Formdaki metni yazsaydık
        ve sunucu başka bir değer kaydetseydi kullanıcı çalışmayan bir
        adres kopyalardı.
      */
      onDegisti(kabulEdilen);
      setTaslak('');
      setGonderiliyor(false);
      setBildirim(`Kullanıcı adın @${kabulEdilen} oldu. Eski adresin buraya yönleniyor.`);
    } catch (sorun) {
      /*
        Ham veritabanı hatası kullanıcıya ulaşmıyor: `SosyalHata` mesajı
        zaten `details` kodundan seçilmiş Türkçe cümle.
      */
      setSunucuHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'Kullanıcı adı değiştirilemedi. Bağlantını kontrol edip yeniden dene.',
      );
      setGonderiliyor(false);
    }
  };

  /*
    Adı olmayan profil: sunucu adı kendisi üretiyor ve üretemediği durum
    kayıt akışında sessizce geçiliyor (20260926050000). Böyle bir satırda
    değiştirilecek bir ad YOK; form yerine durumun kendisi yazılıyor.
    Boş bir kutu çizmek, çalışmayacak bir eylem sunmak olurdu.
  */
  if (!kullaniciAdi) {
    return (
      <div className={`${KART} space-y-1.5`}>
        <h3 className="text-sm font-extrabold text-gray-900">Kullanıcı adın</h3>
        <p className="text-sm leading-relaxed text-gray-600">
          Kullanıcı adın henüz oluşmamış; profil adresin de bu yüzden yok.
        </p>
      </div>
    );
  }

  return (
    <div className={`${KART} space-y-3`}>
      <div className="space-y-1.5">
        <h3 className="text-sm font-extrabold text-gray-900">Kullanıcı adın</h3>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <AtSign aria-hidden className="h-4 w-4 shrink-0 self-center text-gray-400" />
          <span className="font-bold text-gray-900">{kullaniciAdi}</span>
        </p>
        {/*
          ADRES TAM HÂLİYLE: yalnız yol (`/profil/ad`) gösterilseydi
          kullanıcı onu kopyalayıp bir mesaja yapıştırdığında çalışmayan
          bir metin paylaşırdı. `break-all`, uzun adın dar telefonda
          kutudan taşmasını değil sarmasını sağlıyor.
        */}
        <p className="break-all text-sm text-gray-600">{profilAdresi(kullaniciAdi)}</p>
      </div>

      <form onSubmit={gonder} className="space-y-3" noValidate>
        <MetinAlani
          kimlik="sosyal-kullanici-adi"
          etiket="Yeni kullanıcı adı"
          deger={taslak}
          onDegis={yaz}
          enFazla={30}
          hata={bicimHatasi}
          yardim="Yalnız İngilizce küçük harf (a-z), 3-30 harf. Yazdığın anda küçültülüyor."
        />

        {/*
          NE OLACAĞI ÖNCEDEN YAZILI

          Adres değişiyor ve eski adres kırılmıyor: ikisi birlikte
          söyleniyor. Yalnız birincisi yazılsaydı kullanıcı paylaştığı
          bağlantıların öleceğini sanıp değiştirmekten vazgeçerdi; yalnız
          ikincisi yazılsaydı adresinin değiştiğini fark etmezdi.
        */}
        <p className="text-xs leading-relaxed text-gray-600">
          Adını değiştirirsen profil adresin de değişiyor. Eski adresin yenisine yönleniyor ve
          bıraktığın ad başkasına verilmiyor.
        </p>

        {sunucuHatasi && <KayitHatasi mesaj={sunucuHatasi} />}

        {/*
          Bildirim yalnız sunucu KABUL ETTİKTEN sonra yazılıyor; iyimser
          bir "değişti" cümlesi, değişmemiş bir adresi kopyalatırdı.
        */}
        {bildirim && (
          <p role="status" className="text-sm font-semibold text-gray-700">
            {bildirim}
          </p>
        )}

        <button
          type="submit"
          disabled={!degisiyorMu || Boolean(bicimHatasi) || gonderiliyor}
          className={BIRINCIL_EYLEM}
        >
          {gonderiliyor ? 'Değiştiriliyor…' : 'Kullanıcı adını değiştir'}
        </button>
      </form>
    </div>
  );
};
