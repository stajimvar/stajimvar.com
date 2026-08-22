import React, { useEffect, useState } from 'react';
import { Search, ShieldCheck, ExternalLink } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
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
}> = ({ onBack, onNavigate }) => {
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
    document.title = 'Şirketini sahiplen, ilan gir | StajımVar';
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
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Staj ilanı yayınlamak ücretsiz. Şirketinizin sayfasını sahiplenin, ilanlarınızı
            kendiniz girin.
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
          {arandiMi && !araniyor && sonuclar.length === 0 && !hata && (
            <p className="text-sm text-gray-600 leading-relaxed">
              Bu adla bir şirket bulunamadı. Şirketinizin henüz sayfası yok demektir —
              aşağıda ne yapacağınız yazıyor.
            </p>
          )}
        </section>

        <IsverenGirisiIcerik />
      </div>
    </SayfaKabugu>
  );
};
