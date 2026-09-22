import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import {
  fetchOnayKuyrugu,
  ilanKarariVer,
  type OnayIlani,
  type OnayKuyrugu,
} from '../../lib/queries';
import { sayi } from '../../lib/yonetim-bicim.mjs';
import { BosDurum, Iskelet } from './Grafikler';

/**
 * ONAY KUYRUKLARI
 *
 * Üç sekme: ilan, sahiplenme, bölüm. Sayılar sekme başlığında duruyor ki
 * hangi kuyrukta iş olduğu sekmeye girmeden görünsün.
 *
 * KARARI VERECEK KİŞİYE GEREKEN BİLGİ EKRANDA
 * -------------------------------------------
 * Bir ilanı yayına almak, öğrenciyi o bağlantıya göndermek demek. Bu
 * yüzden satırda yalnız başlık değil, kararı değiştirecek olanlar da
 * yazıyor:
 *
 *   - Bağlantı durumu: "erisilemedi" ise uyarı olarak çıkıyor. Erişilemeyen
 *     bir ilanı yayına almak, ölü bir bağlantı yayımlamak olurdu.
 *   - Açıklama uzunluğu: 82 karakterlik bir açıklama gerçek bir ilan metni
 *     değil. Onaylayan bunu görmeden karar vermemeli.
 *   - Ülke: kuyruktaki ilanların hepsi Almanya'dan ve Almanca. Türkiye'deki
 *     öğrenciye ne göstereceğimiz bir karar ve o karar buradan veriliyor.
 *
 * RET SİLMİYOR
 * ------------
 * Reddedilen ilan arşivleniyor, satır duruyor. Silinmiş bir kayıttan
 * geriye dönülemez; arşivden dönülür.
 */

const Sekme: React.FC<{
  etkin: boolean;
  etiket: string;
  adet: number;
  tikla: () => void;
}> = ({ etkin, etiket, adet, tikla }) => (
  <button
    type="button"
    onClick={tikla}
    aria-pressed={etkin}
    className={`min-h-11 cursor-pointer rounded-lg px-3.5 text-sm font-semibold transition-colors ${
      etkin ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }`}
  >
    {etiket}
    <span className={`ml-1.5 tabular-nums ${etkin ? 'text-blue-100' : 'text-gray-500'}`}>
      {sayi(adet)}
    </span>
  </button>
);

const Etiket: React.FC<{ children: React.ReactNode; renk?: 'gri' | 'uyari' }> = ({
  children,
  renk = 'gri',
}) => (
  <span
    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
      renk === 'uyari' ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-600'
    }`}
  >
    {children}
  </span>
);

const IlanSatiri: React.FC<{
  ilan: OnayIlani;
  islemde: boolean;
  karar: (k: 'onayla' | 'reddet') => void;
}> = ({ ilan, islemde, karar }) => {
  const erisilemez = ilan.kaynakDurumu === 'erisilemedi';
  const kisaAciklama = ilan.aciklamaUzunluk < 200;

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-bold leading-snug text-gray-900">{ilan.baslik}</p>
      <p className="mt-0.5 text-sm text-gray-600">
        {ilan.sirket ?? 'şirket bilinmiyor'}
        {ilan.sehir ? ` · ${ilan.sehir}` : ''}
        {ilan.ulke ? ` · ${ilan.ulke}` : ''}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Etiket>{ilan.kaynak === 'scraped' ? 'taranan' : ilan.kaynak}</Etiket>
        {ilan.calisma && <Etiket>{ilan.calisma}</Etiket>}
        {erisilemez && <Etiket renk="uyari">bağlantıya erişilemedi</Etiket>}
        {kisaAciklama && (
          <Etiket renk="uyari">açıklama {sayi(ilan.aciklamaUzunluk)} karakter</Etiket>
        )}
      </div>

      {(erisilemez || kisaAciklama) && (
        /*
          Uyarı YAZIYLA da veriliyor: rozet tek başına "dikkat" diyor ama
          neden dikkat edilmesi gerektiğini söylemiyor.
        */
        <p className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {erisilemez && 'Son kontrolde ilanın bağlantısına erişilemedi. '}
            {kisaAciklama && 'Açıklama metni çok kısa, gerçek ilan metni olmayabilir. '}
            Yayına almadan önce bağlantıyı açıp bak.
          </span>
        </p>
      )}

      {ilan.adres && (
        <a
          href={ilan.adres}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
        >
          İlanı kaynağında aç
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={islemde}
          onClick={() => karar('onayla')}
          className="min-h-11 flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Yayına al
        </button>
        <button
          type="button"
          disabled={islemde}
          onClick={() => karar('reddet')}
          className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reddet
        </button>
      </div>
    </li>
  );
};

export const OnaySayfasi: React.FC = () => {
  const [kuyruk, setKuyruk] = React.useState<OnayKuyrugu | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [sekme, setSekme] = React.useState<'ilan' | 'sahiplenme' | 'bolum'>('ilan');
  const [islemdeki, setIslemdeki] = React.useState<string | null>(null);
  const [uyari, setUyari] = React.useState<string | null>(null);

  const yukle = React.useCallback(() => {
    setDurum('yukleniyor');
    fetchOnayKuyrugu()
      .then((k) => {
        setKuyruk(k);
        setDurum('hazir');
      })
      .catch(() => setDurum('hata'));
  }, []);

  React.useEffect(yukle, [yukle]);

  const kararVer = async (ilan: OnayIlani, karar: 'onayla' | 'reddet') => {
    setIslemdeki(ilan.id);
    setUyari(null);
    try {
      await ilanKarariVer(ilan.id, karar, ilan.guncellendi);
      /*
        Satır listeden ÇIKARILIYOR, sayfa yeniden çekilmiyor: yöneticinin
        kuyruğu tek tek eritmesi gerekiyor ve her kararda sayfanın baştan
        yüklenmesi sırayı kaybettirirdi.
      */
      setKuyruk((k) =>
        k ? { ...k, ilanlar: k.ilanlar.filter((x) => x.id !== ilan.id) } : k,
      );
    } catch {
      /*
        Başarısızlıkta satır KALIYOR ve sebep yazılıyor. Sessizce
        kaybolsaydı, yönetici kararın uygulandığını sanırdı.
      */
      setUyari(
        `"${ilan.baslik}" için karar uygulanamadı. İlan bu arada değişmiş olabilir; kuyruğu yenile.`,
      );
    } finally {
      setIslemdeki(null);
    }
  };

  const ilanlar = kuyruk?.ilanlar ?? [];
  const sahiplenmeler = kuyruk?.sahiplenmeler ?? [];
  const bolumler = kuyruk?.bolumler ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kuyruk">
        <Sekme etkin={sekme === 'ilan'} etiket="İlan" adet={ilanlar.length} tikla={() => setSekme('ilan')} />
        <Sekme
          etkin={sekme === 'sahiplenme'}
          etiket="Sahiplenme"
          adet={sahiplenmeler.length}
          tikla={() => setSekme('sahiplenme')}
        />
        <Sekme etkin={sekme === 'bolum'} etiket="Bölüm" adet={bolumler.length} tikla={() => setSekme('bolum')} />
      </div>

      {durum === 'yukleniyor' && <Iskelet yukseklik="h-40" />}

      {durum === 'hata' && (
        <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center">
          <p className="font-bold text-rose-800">Onay kuyruğu yüklenemedi</p>
          <button
            type="button"
            onClick={yukle}
            className="mt-3 min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            Yeniden dene
          </button>
        </div>
      )}

      {uyari && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {uyari}
        </p>
      )}

      {durum === 'hazir' && sekme === 'ilan' && (
        ilanlar.length ? (
          <ul className="space-y-3">
            {ilanlar.map((i) => (
              <IlanSatiri
                key={i.id}
                ilan={i}
                islemde={islemdeki === i.id}
                karar={(k) => void kararVer(i, k)}
              />
            ))}
          </ul>
        ) : (
          <BosDurum mesaj="Onay bekleyen ilan yok" />
        )
      )}

      {durum === 'hazir' && sekme === 'sahiplenme' && (
        sahiplenmeler.length ? (
          <ul className="space-y-3">
            {sahiplenmeler.map((s) => (
              <li key={s.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-bold text-gray-900">{s.sirket ?? 'şirket bilinmiyor'}</p>
                <p className="mt-0.5 text-sm text-gray-600">
                  {[s.kisi, s.unvan].filter(Boolean).join(' · ') || 'kişi bilgisi yok'}
                </p>
                {s.eposta && <p className="mt-0.5 text-sm text-gray-600">{s.eposta}</p>}
                {s.not && <p className="mt-1.5 text-sm text-gray-700">{s.not}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <BosDurum mesaj="Bekleyen sahiplenme talebi yok" />
        )
      )}

      {durum === 'hazir' && sekme === 'bolum' && (
        bolumler.length ? (
          <ul className="space-y-3">
            {bolumler.map((b) => (
              <li key={b.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-bold text-gray-900">{b.istenen ?? 'bölüm adı yok'}</p>
                {b.universite && <p className="mt-0.5 text-sm text-gray-600">{b.universite}</p>}
                {b.aciklama && <p className="mt-1.5 text-sm text-gray-700">{b.aciklama}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <BosDurum mesaj="Bekleyen bölüm talebi yok" />
        )
      )}

      {/*
        SAHİPLENME VE BÖLÜMDE KARAR DÜĞMESİ YOK.

        İkisinin de kuyruğu şu an boş ve karar akışları ilanınkinden
        farklı (sahiplenmede alan adı eşleşmesi elle doğrulanıyor).
        Çalışmayan bir düğme koymak, çalışıyor sanılmasına yol açardı.
      */}
      {durum === 'hazir' && sekme !== 'ilan' && (
        <p className="text-[11px] leading-relaxed text-gray-500">
          Bu kuyrukta karar düğmesi henüz yok: ikisi de boş ve karar akışları
          ilanınkinden farklı. Talep geldiğinde kendi akışıyla eklenecek.
        </p>
      )}
    </div>
  );
};
