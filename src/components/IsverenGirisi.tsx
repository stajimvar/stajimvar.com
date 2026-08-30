import React, { useEffect, useState } from 'react';
import { Search, ShieldCheck, ExternalLink } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { SirketEklemeFormu } from './SirketEklemeFormu';
import { CompanyLogo } from './CompanyLogo';
import { searchCompanies } from '../lib/queries';
import { IsverenGirisiIcerik } from './IsverenGirisiIcerik';

/**
 * /isveren/ilan-ver — işverenin ilan verme kanalına giriş kapısı.
 *
 * NEDEN VAR
 * ---------
 * Şirket ilan girişi ve yönetici onay kuyruğu aylardır yazılmış durumda ama
 * hiç kullanılmadı. Sebebi ölçüldü: kapı yoktu.
 *
 *   - AuthModal'daki şirket kaydı `allowCompanySignUp` bayrağının arkasında
 *     ve o bayrak hiçbir yerden `true` geçilmiyor. Yani arayüz var, kapalı.
 *   - Doğrudan şirket kaydı zaten BİLEREK kapatılmış: rol istemciden
 *     geldiği için kendini şirket ilan eden herkes öğrenci profillerini
 *     okuyabiliyordu. Bu doğru bir karardı, geri alınmıyor.
 *   - Amaçlanan yol (kayıt ol → şirket sayfanı sahiplen → yönetici onayı)
 *     çalışıyor, ama sahiplenme formu yalnızca /sirket/<slug> sayfasında
 *     duruyor ve o sayfaya giden tek yol ilan listesinden tıklamaktı.
 *     Şirketi zaten derlenmiş olan işveren gelebiliyordu; diğerleri hiç.
 *   - İşveren rehberindeki "Şirketimi bul" düğmesi `/` adresine, yani
 *     öğrenci ilan akışına gidiyordu. İşveren için çıkmaz sokak.
 *
 * Bu sayfa o zinciri kapatıyor: işveren kendi şirketini arıyor, sayfasını
 * buluyor, oradan sahipleniyor. Bulamazsa ne yapacağı da yazıyor.
 *
 * ÖN RENDER
 * ---------
 * `IsverenGirisiIcerik` adımları ve soruları taşıyor; hem tarayıcıda hem
 * derleme sırasında çiziliyor. Arama kutusu yalnızca tarayıcıda: o bir
 * araç, içerik değil. Statik HTML'de sayfanın anlattığı her şey duruyor.
 */

/* -------------------------------------------------------------------- sayfa */

type Sonuc = { id: string; name: string; slug: string; logoUrl?: string; verified: boolean };

export const IsverenGirisi: React.FC<{
  onBack: () => void;
  onNavigate: (p: string) => void;
  /** Talebe kimlik eklemek için; ziyaretçide null. */
  userId?: string | null;
  /** İşveren metinleriyle açılan giriş/kayıt penceresi. */
  onIsverenGirisi?: (kip: 'login' | 'register') => void;
}> = ({ onBack, onNavigate, userId = null, onIsverenGirisi }) => {
  const [terim, setTerim] = useState('');
  const [sonuclar, setSonuclar] = useState<Sonuc[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [arandiMi, setArandiMi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    /*
      Başlık, sayfanın gerçekte sunduğu işi söylüyor. "Stajyer ilanı ver"
      doğrudan ilan yayınlama vaadi veriyordu; oysa akış şirket sayfasını
      sahiplenmek ve onaydan sonra ilan girmek üzerine kurulu.
    */
    /*
      Başlık sayfadan çıkılınca geri yükleniyor: SPA içinde ana sayfaya
      dönüldüğünde sekmede hâlâ bu sayfanın adı yazıyordu.
    */
    const eskiBaslik = document.title;
    document.title = 'Şirketini sahiplen, ilan gir | StajımVar';
    return () => {
      document.title = eskiBaslik;
    };
  }, []);

  /*
    Yazdıkça arama, 350 ms geciktirmeli.

    Her tuş vuruşunda sorgu atmak on harflik bir şirket adı için on istek
    demekti. Gecikme olmadan da çalışıyordu ama gereksiz yük bindiriyordu.
  */
  useEffect(() => {
    const temiz = terim.trim();
    if (temiz.length < 2) {
      setSonuclar([]);
      setArandiMi(false);
      return;
    }
    setAraniyor(true);
    const zaman = setTimeout(async () => {
      try {
        setSonuclar(await searchCompanies(temiz));
        setHata(null);
      } catch {
        setHata('Arama şu an çalışmıyor. Biraz sonra tekrar deneyin.');
      } finally {
        setAraniyor(false);
        setArandiMi(true);
      }
    }, 350);
    return () => clearTimeout(zaman);
  }, [terim]);

  return (
    <SayfaKabugu onBack={onBack}>
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            Stajyer ilanı ver
          </h1>
          {/*
            ONAY HER İLANDA YOK

            Burada "onaya gönderin — onaylandığında yayına çıkar" yazıyordu
            ama kural bu değil: kurumsal e-posta alan adı şirketin site
            adresiyle eşleşiyorsa ilan doğrudan yayına çıkıyor
            (lib/sirket-kademe.mjs · ilanBaslangicDurumu). Onay yalnızca
            eşleşmeyen durumda devreye giriyor. Cümle, ilk kez gelen
            işverene gerçekte olacak şeyi söylüyor.
          */}
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Staj ilanı yayınlamak ücretsiz. Akış şöyle: şirketinizin sayfasını
            sahiplenin ve ilanı girin. Kurumsal e-posta adresiniz şirketinizin site
            adresiyle aynıysa ilan doğrudan yayına çıkıyor; değilse önce biz
            bakıyoruz ve genellikle bir iş günü içinde yayına alıyoruz.
          </p>
        </div>

        {/* Arama: yalnızca tarayıcıda. Ön render bu bloğu çizmiyor. */}
        <section className="space-y-3">
          <label htmlFor="sirket-ara" className="block font-bold text-gray-900">
            Şirketinizi arayın
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="sirket-ara"
              type="text"
              value={terim}
              onChange={(e) => setTerim(e.target.value)}
              placeholder="Şirket adı"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {hata && <p className="text-sm text-red-600">{hata}</p>}

          {araniyor && <p className="text-sm text-gray-500">Aranıyor…</p>}

          {sonuclar.length > 0 && (
            <ul className="space-y-2">
              {sonuclar.map((s) => (
                <li key={s.id}>
                  <a
                    href={`/sirket/${s.slug}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
                        return;
                      e.preventDefault();
                      onNavigate(`/sirket/${s.slug}`);
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-200 hover:border-blue-300"
                  >
                    <CompanyLogo name={s.name} logoUrl={s.logoUrl} className="w-10 h-10 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-gray-900 truncate">{s.name}</span>
                      <span className="block text-xs text-gray-500">
                        {s.verified ? 'Sahiplenilmiş' : 'Henüz sahiplenilmemiş'}
                      </span>
                    </span>
                    {s.verified ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/*
            Sonuç yoksa sessiz kalmıyoruz. Boş liste, işverenin "site bozuk"
            diye çıkıp gitmesinin en kolay yolu; ne yapacağı burada yazıyor.
          */}
          {/*
            ÇIKMAZ SOKAK YOK

            Burada "aşağıda ne yapacağınız yazıyor" yazıyordu; aşağısı
            iletişim bölümüne, orası da yalnızca bir e-posta adresine
            çıkıyordu. Huninin en kritik noktasında işveren e-posta yazmak
            zorunda kalıyordu. Form artık burada, aramanın hemen altında.
          */}
          {arandiMi && !araniyor && sonuclar.length === 0 && !hata && (
            <SirketEklemeFormu onAd={terim.trim()} userId={userId} />
          )}
        </section>

        {/*
          İŞVEREN KAPILARI

          Sayfa "normal bir hesap açın" diyordu ama hesap açtıran bir düğme
          sunmuyordu. İki düğme de işveren metinleriyle açılan pencereyi
          çağırıyor: arkadaki hesap aynı, kullanıcıya öğrenci hesabı
          açtırdığımızı söylemiyoruz.
        */}
        {onIsverenGirisi && (
          <section className="flex flex-col gap-2.5 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-gray-900">Hesabınızla devam edin</p>
              <p className="text-sm text-gray-600">
                Sahiplenme talebi göndermek için bir hesap gerekiyor; açmak bir dakika sürüyor.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onIsverenGirisi('login')}
                className="min-h-11 cursor-pointer rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-800 hover:bg-gray-50"
              >
                İşveren Girişi
              </button>
              <button
                type="button"
                onClick={() => onIsverenGirisi('register')}
                className="min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
              >
                Ücretsiz İlan Ver
              </button>
            </div>
          </section>
        )}

        <IsverenGirisiIcerik />
      </div>
    </SayfaKabugu>
  );
};
