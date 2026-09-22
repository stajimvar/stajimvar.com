import React from 'react';
import { CanliSayfasi } from './CanliSayfasi';
import { OzetSayfasi } from './OzetSayfasi';
import { TrafikSayfasi } from './TrafikSayfasi';
import { YonetimKabuk, type YonetimSayfaKimlik } from './YonetimKabuk';

/**
 * YÖNETİM PANELİ — kabuk ve sayfa seçimi.
 *
 * ADRES SENKRONU
 * --------------
 * Seçili sayfa adreste taşınıyor (`/yonetim/trafik`). Yalnız bileşen
 * durumunda tutulsaydı sayfa yenilenince özete düşerdi ve bir ekranı
 * paylaşmak mümkün olmazdı. Tarayıcının geri düğmesi de çalışıyor.
 *
 * HENÜZ YAZILMAMIŞ SAYFALAR
 * -------------------------
 * Menüdeki her bağlantı tıklanabilir. Yazılmamış olanlar boş ekran
 * değil, ne göstereceğini ve neyin beklendiğini söyleyen bir kart
 * çiziyor: tıklayınca hiçbir şey olmayan bir menü, panelin bozuk
 * olduğunu düşündürür.
 */

const YOL_ONEKI = '/yonetim';

const KIMLIK_YOL: Record<YonetimSayfaKimlik, string> = {
  ozet: `${YOL_ONEKI}`,
  trafik: `${YOL_ONEKI}/trafik`,
  canli: `${YOL_ONEKI}/canli`,
  ogrenciler: `${YOL_ONEKI}/ogrenciler`,
  ilanlar: `${YOL_ONEKI}/ilanlar`,
  basvurular: `${YOL_ONEKI}/basvurular`,
  sirketler: `${YOL_ONEKI}/sirketler`,
  onay: `${YOL_ONEKI}/onay`,
  tarama: `${YOL_ONEKI}/tarama`,
  kesfet: `${YOL_ONEKI}/kesfet`,
  bolum: `${YOL_ONEKI}/bolum-talepleri`,
  paylasim: `${YOL_ONEKI}/instagram`,
};

export function yoldanKimlik(yol: string): YonetimSayfaKimlik {
  const temiz = (yol || '').split('?')[0].replace(/\/+$/, '') || YOL_ONEKI;
  const eslesen = (Object.entries(KIMLIK_YOL) as [YonetimSayfaKimlik, string][])
    .filter(([, y]) => y !== YOL_ONEKI)
    .find(([, y]) => temiz === y || temiz.startsWith(`${y}/`));
  return eslesen ? eslesen[0] : 'ozet';
}

const Hazirlaniyor: React.FC<{ baslik: string; anlatim: string; bekleyen: string[] }> = ({
  baslik,
  anlatim,
  bekleyen,
}) => (
  <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5">
    <h2 className="text-sm font-bold text-gray-900">{baslik}</h2>
    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{anlatim}</p>
    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
      Bu ekranda olacaklar
    </p>
    <ul className="mt-1.5 space-y-1">
      {bekleyen.map((b) => (
        <li key={b} className="flex gap-2 text-sm text-gray-700">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
          <span className="min-w-0">{b}</span>
        </li>
      ))}
    </ul>
  </section>
);

export const YonetimPaneli: React.FC<{
  yol: string;
  onNavigate: (yol: string) => void;
}> = ({ yol, onNavigate }) => {
  const etkin = yoldanKimlik(yol);
  const git = React.useCallback(
    (k: YonetimSayfaKimlik) => onNavigate(KIMLIK_YOL[k]),
    [onNavigate],
  );

  return (
    <YonetimKabuk etkin={etkin} sec={git} onSiteyeDon={() => onNavigate('/')}>
      {etkin === 'ozet' && <OzetSayfasi onNavigate={onNavigate} git={git} />}
      {etkin === 'trafik' && <TrafikSayfasi />}
      {etkin === 'canli' && <CanliSayfasi />}

      {etkin === 'ogrenciler' && (
        <Hazirlaniyor
          baslik="Öğrenciler"
          anlatim="Kayıtlı öğrencilerin tablosu; satıra tıklayınca yan panelde profil ayrıntısı açılacak."
          bekleyen={[
            'Ad, e-posta, okul, bölüm, şehir, teklife açık, başvuru sayısı, son görülme',
            'Okul, bölüm ve şehre göre süzme; ad ve e-postada arama',
            'Satır tıklanınca detay çekmecesi',
          ]}
        />
      )}
      {etkin === 'ilanlar' && (
        <Hazirlaniyor
          baslik="İlanlar"
          anlatim="Şirketin StajımVar'da açtığı native ilan ile taranan ilan AYRI sayılacak: ikisi aynı şey değil ve toplamak, başvuru alabildiğimiz ilan sayısını olduğundan büyük gösterir."
          bekleyen={[
            'Durum: yayında / onay bekliyor / reddedildi / süresi doldu',
            'Kaynak: kariyer sayfası, Greenhouse, Lever, Ashby, Workday, native',
            'Başvuru tipi: yönlendirme, e-posta, site içi',
          ]}
        />
      )}
      {etkin === 'basvurular' && (
        <Hazirlaniyor
          baslik="Başvurular"
          anlatim="Yalnız site içi ilanlar listelenecek. Kariyer sayfasına yönlendirilen ilanda başvuru kaydı oluşmuyor; onları burada göstermek, olmayan bir veriyi varmış gibi sunmak olurdu."
          bekleyen={[
            'Durum: yeni, incelemede, görüşme, teklif, red, kabul, çekildi',
            'İlana ve şirkete göre süzme',
          ]}
        />
      )}
      {etkin === 'sirketler' && (
        <Hazirlaniyor
          baslik="Şirketler"
          anlatim="Sahipsiz, sahiplenilmiş ve talebi bekleyen şirketler. Alan adı eşleşmesi otomatik onaylanmayacak: eşleşme bir ipucu, kanıt değil."
          bekleyen={['Sahiplenme talebi kuyruğu', 'Alan adı eşleşmesinde elle onay']}
        />
      )}
      {etkin === 'onay' && (
        <Hazirlaniyor
          baslik="Onay kuyrukları"
          anlatim="İlan, sahiplenme ve bölüm talepleri tek ekranda sekmelerle; onayla ve reddet çalışacak."
          bekleyen={['Sekmeler: ilan, sahiplenme, bölüm', 'Onayla / Reddet']}
        />
      )}
      {etkin === 'tarama' && (
        <Hazirlaniyor
          baslik="Tarama"
          anlatim="83 kaynağın durumu; hangi sistemden kaç kaynak geldiği, son taramanın yaşı ve partial/fail notları."
          bekleyen={['Sistem dağılımı', 'Son tarama yaşı ve durumu', 'Taramayı çalıştır']}
        />
      )}
      {etkin === 'kesfet' && (
        <Hazirlaniyor
          baslik="Keşfet arşivi"
          anlatim="Arşivdeki kayıtları vitrine alma ya da gizleme."
          bekleyen={['Vitrine al / gizle']}
        />
      )}
      {etkin === 'bolum' && (
        <Hazirlaniyor
          baslik="Bölüm talepleri"
          anlatim="Öğrencilerin açılmasını istediği bölüm sayfaları."
          bekleyen={['Sayfa aç / reddet']}
        />
      )}
      {etkin === 'paylasim' && (
        <Hazirlaniyor
          baslik="Gönderi paylaş"
          anlatim="İlan seçip Instagram ve X metni üretme, kopyalama ve paylaşıldı işaretleme."
          bekleyen={['İlan seç', 'Metin üret ve kopyala', 'Paylaşıldı işaretle']}
        />
      )}
    </YonetimKabuk>
  );
};
