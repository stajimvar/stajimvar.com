import React from 'react';
import { Search } from 'lucide-react';
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
 * ZİYARETÇİ BU BİLEŞENE HİÇ ULAŞMIYOR
 * -----------------------------------
 * Kutu yalnız sahibin kendi ekranında, `if (!sahibiMi) return
 * <GuvenliEkran/>` satırından SONRA çiziliyor. Bileşen bu yüzden bir
 * `sahibiMi` bayrağı ALMIYOR: ikinci bir gizleme, sınırın nerede
 * olduğunu bulanıklaştırırdı.
 */

/** Girdi duruncaya kadar beklenen süre. */
const GECIKME_MS = 300;

const ALAN_KUTUSU = `w-full min-h-11 rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 ${RENK_GECISI} ${ODAK_HALKASI}`;

const SATIR = `flex min-h-11 items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

type Durum = 'kisa' | 'yukleniyor' | 'hazir' | 'hata';

interface Props {
  /** `degistir` geçmişe kayıt eklemeden adresi değiştiriyor; bkz. App.tsx. */
  onNavigate: (yol: string, secenek?: { degistir?: boolean }) => void;
}

export const KullaniciArama: React.FC<Props> = ({ onNavigate }) => {
  const [sorgu, setSorgu] = React.useState('');
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

  return (
    <div role="search" className="space-y-2">
      <div className="relative">
        <label htmlFor="sosyal-kullanici-arama" className="sr-only">
          Kullanıcı ara
        </label>
        {/* İkon dekoratif: yanındaki etiket ve yer tutucu ne yapıldığını yazıyor. */}
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        />
        <input
          id="sosyal-kullanici-arama"
          type="search"
          value={sorgu}
          onChange={(olay) => setSorgu(olay.target.value)}
          placeholder="Kullanıcı adıyla ara"
          autoComplete="off"
          className={ALAN_KUTUSU}
        />
      </div>

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

      {durum === 'hazir' && sonuclar.length > 0 && (
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
      )}
    </div>
  );
};
