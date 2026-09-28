import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { SAYFA_GENISLIGI } from '../../lib/duzen';
import {
  begeniDurumuGetir,
  kaydetmeDurumuGetir,
  paylasimiGetir,
  type AkisPaylasimi,
  type BegeniDurumu,
} from '../../lib/queries/sosyal';
import { AkisKarti } from './AkisKarti';

/**
 * /paylasim/<id> — PAYLAŞIMIN KALICI ADRESİ
 *
 * NEDEN VAR
 * ---------
 * Beğeni bildirimi `/cv` adresine gidiyordu ve göçün kendi yorumu bunu
 * açıkça bir ödün olarak yazıyordu: "paylaşımın kalıcı bir adresi yok".
 * Sonuç ölçüldü — bildirime dokunan kişi kendi ızgarasına düşüyor ve
 * hangi paylaşımın beğenildiğini oradan kendisi bulmak zorunda kalıyordu.
 * ŞİRKET HESABINDA HİÇ ÇALIŞMIYORDU: `/cv` şirket kabuğunda
 * `/sirket/profil`e yönleniyor ve o ekranda paylaşım ızgarası yok.
 *
 * Bu adres o eksiği kapatıyor. `PaylasimDetayi` (karttan açılan katman)
 * yerinde duruyor: ızgarada gezerken katman doğru davranış, bu sayfa ise
 * DIŞARIDAN gelen bağlantının indiği yer.
 *
 * ÜÇ HESAP TÜRÜ DE BURAYA GELİYOR
 * -------------------------------
 * Ölçüldü (üretim, 28 Eylül 2026): 22 beğeni bildiriminin alıcıları 15
 * öğrenci, 6 yönetici, 1 şirket. Rota bu yüzden kabuk ayrımının dışında
 * duruyor ve şirket yönlendirme listesine EKLENMİYOR — eklenseydi tek
 * şirket alıcısı yine paylaşımı göremezdi.
 *
 * ÇİZİM AKIŞ KARTININ KENDİSİ
 * ---------------------------
 * `AkisKarti` olduğu gibi kullanılıyor: yazar satırı, şerit, beğeni,
 * kaydetme ve açıklama zaten orada. İkinci bir kart yazılsaydı akışta
 * düzelen bir şey burada eski hâliyle kalırdı.
 *
 * DÖRT DURUM AYRI, ÜÇÜ AYNI CÜMLEYE DÜŞMÜYOR
 * ------------------------------------------
 * `girisGerekli` ile `yok` AYRI: okuma politikası yalnız `authenticated`
 * rolüne açık (ölçüldü), yani çıkış yapmış ziyaretçiye hiçbir satır
 * gelmiyor. İkisi tek cümleye indirgenseydi giriş yapmamış kullanıcıya
 * "bu paylaşıma ulaşılamıyor" denirdi — oysa giriş yapsa ulaşabilir.
 *
 * `yok` durumunda "silinmiş paylaşım" YAZMIYOR: politikanın satırı
 * vermemesi ile paylaşımın silinmiş olması aynı şey değil ve ikisini
 * istemciden ayırt edemiyoruz (aynı gerekçe `paylasimiGetir` içinde).
 */

interface Props {
  paylasimId: string;
  kullaniciId: string | null;
  oturumHazir: boolean;
  onNavigate: (yol: string) => void;
  onGirisGerekli?: () => void;
  /**
   * Oturum sahibinin eski kamera düğmesiyle yüklenmiş fotoğrafı; yalnız
   * KENDİ paylaşımında yedek. Akıştaki `yedekAvatarAdresi` ile aynı
   * gerekçe — başkasının `student_profiles` satırı okunmuyor.
   */
  ogrenciAvatarAdresi?: string | null;
}

type Durum = 'yukleniyor' | 'hazir' | 'yok' | 'hata' | 'girisGerekli';

const GERI = `inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-900 hover:bg-gray-100 ${RENK_GECISI} ${ODAK_HALKASI}`;

export const PaylasimSayfasi: React.FC<Props> = ({
  paylasimId,
  kullaniciId,
  oturumHazir,
  onNavigate,
  onGirisGerekli,
  ogrenciAvatarAdresi = null,
}) => {
  const [durum, setDurum] = React.useState<Durum>('yukleniyor');
  const [paylasim, setPaylasim] = React.useState<AkisPaylasimi | null>(null);
  const [begeni, setBegeni] = React.useState<BegeniDurumu | undefined>(undefined);
  const [kayitliMi, setKayitliMi] = React.useState(false);

  React.useEffect(() => {
    /*
      OTURUM KARARI BEKLENİYOR

      `oturumHazir` gelmeden istek atılsaydı, sayfayı yenileyen giriş
      yapmış bir kullanıcı bir kare boyunca "giriş yap" ekranını görür,
      sonra içerik yerine otururdu. Bekleme durumu zaten 'yukleniyor'.
    */
    if (!oturumHazir) return;
    if (!kullaniciId) {
      setDurum('girisGerekli');
      return;
    }

    let iptal = false;
    setDurum('yukleniyor');

    (async () => {
      const p = await paylasimiGetir(paylasimId);
      if (iptal) return;
      if (!p) {
        setDurum('yok');
        return;
      }
      setPaylasim(p);
      setDurum('hazir');

      /*
        ETKİLEŞİM DURUMU AYRI VE SONRA: kart paylaşım gelir gelmez
        çiziliyor, kalp ve yer imi bir an sonra doluyor. Tek `await`
        zincirine dizilseydi görsel de o iki isteği beklerdi.

        Hatası kartı düşürmüyor — beğeni sayısı okunamadı diye paylaşımı
        hiç göstermemek orantısız olurdu.
      */
      try {
        const [begeniler, kayitlilar] = await Promise.all([
          begeniDurumuGetir([p.id]),
          kaydetmeDurumuGetir([p.id]),
        ]);
        if (iptal) return;
        setBegeni(begeniler.get(p.id));
        setKayitliMi(kayitlilar.has(p.id));
      } catch {
        /* Kart etkileşim satırı olmadan duruyor; bkz. `AkisKarti`. */
      }
    })().catch(() => {
      if (!iptal) setDurum('hata');
    });

    return () => {
      iptal = true;
    };
  }, [paylasimId, kullaniciId, oturumHazir]);

  const govde = (() => {
    if (durum === 'yukleniyor') {
      return (
        <div aria-busy="true" className="space-y-2 py-3">
          <div className="flex items-center gap-3 px-4">
            <span className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
            <span className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="aspect-[4/5] w-full animate-pulse bg-gray-100" />
        </div>
      );
    }

    if (durum === 'girisGerekli') {
      return (
        <div className="space-y-3 px-4 py-10 text-center">
          <p className="text-sm font-bold text-gray-900">Bu paylaşımı görmek için giriş yap.</p>
          <p className="text-sm leading-relaxed text-gray-600">
            Paylaşımlar yalnızca giriş yapmış kullanıcılara açık.
          </p>
          {onGirisGerekli ? (
            <button
              type="button"
              onClick={onGirisGerekli}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 ${RENK_GECISI} ${ODAK_HALKASI}`}
            >
              Giriş yap
            </button>
          ) : null}
        </div>
      );
    }

    if (durum === 'hata') {
      return (
        <div role="alert" className="space-y-2 px-4 py-10 text-center">
          <p className="text-sm font-bold text-gray-900">Paylaşım alınamadı.</p>
          <p className="text-sm leading-relaxed text-gray-600">
            Bağlantı ya da sunucu kaynaklı olabilir. İçeriğinde bir değişiklik olmadı.
          </p>
        </div>
      );
    }

    if (durum === 'yok' || !paylasim) {
      return (
        <div className="space-y-2 px-4 py-10 text-center">
          <p className="text-sm font-bold text-gray-900">Bu paylaşıma ulaşılamıyor.</p>
          <p className="text-sm leading-relaxed text-gray-600">
            Paylaşım kaldırılmış ya da sana açık değil.
          </p>
        </div>
      );
    }

    return (
      <AkisKarti
        paylasim={paylasim}
        begeni={begeni}
        kayitliMi={kayitliMi}
        /* Yedek yalnız KENDİ paylaşımında; akıştaki kuralın aynısı. */
        yedekAvatarAdresi={paylasim.yazarId === kullaniciId ? ogrenciAvatarAdresi : null}
        onProfilAc={(ad) => onNavigate(`/profil/${ad}`)}
        onBegeniDegisti={(_id, yeni) => setBegeni(yeni)}
        onKayitDegisti={(_id, k) => setKayitliMi(k)}
      />
    );
  })();

  return (
    <div className="bg-white lg:bg-transparent">
      {/*
        GERİ DÜĞMESİ TARAYICI GEÇMİŞİNİ KULLANMIYOR

        Bu adrese çoğunlukla DIŞARIDAN geliniyor (bildirim, paylaşılmış
        bağlantı) ve orada `history.back()` kullanıcıyı siteden atardı.
        Sabit hedef `/agim`: paylaşımların durduğu ekran.
      */}
      <div className="flex items-center gap-1 border-b border-gray-200 px-2 py-1.5 sm:px-4">
        <button type="button" onClick={() => onNavigate('/agim')} className={GERI} aria-label="Ağıma dön">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-extrabold text-gray-900">Gönderi</h1>
      </div>

      <div className={`mx-auto w-full ${SAYFA_GENISLIGI} px-0 lg:px-8 lg:pt-6 xl:px-10`}>
        <div className="mx-auto w-full lg:max-w-[500px]">{govde}</div>
      </div>
    </div>
  );
};
