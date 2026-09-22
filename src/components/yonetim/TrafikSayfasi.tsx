import React from 'react';
import { fetchYonetimTrafik, type TrafikOzeti } from '../../lib/queries';
import { sayi, sure, yuzde } from '../../lib/yonetim-bicim.mjs';
import { BosDurum, CubukGrafik, DagilimListesi, Huni, Iskelet } from './Grafikler';

/**
 * TRAFİK — GERÇEK VERİ
 *
 * Dönem seçimi (bugün / 7 gün / 30 gün) ve dört temel ölçü; altında
 * kaynak, şehir, cihaz, sayfa dağılımları ve huni. Hepsi ziyaretçilerin
 * bıraktığı gerçek olaylardan geliyor.
 *
 * HENÜZ VERİ YOKKEN
 * -----------------
 * Ölçüm yeni kurulduğu için ilk günlerde sayılar küçük, hatta sıfır
 * olacak. Bu ekran onu gizlemiyor: sıfır, uydurulmuş bir sayıdan
 * dürüsttür. Hiç oturum yoksa kutular yerine "henüz veri yok" yazıyor,
 * çünkü sıfırlarla dolu bir tablo bozuk bir ekran gibi okunuyor.
 *
 * ORTALAMA OTURUM SÜRESİ NEDEN VAR
 * --------------------------------
 * Tekil ziyaretçi tek başına "ilgi" anlatmıyor: arama sonucundan gelip
 * iki saniyede çıkan da tekil sayılıyor. Süre ve tek sayfada çıkan
 * oranı, gelen kişinin kalıp kalmadığını söylüyor.
 */

const DONEMLER = [
  { kimlik: 'bugun' as const, etiket: 'Bugün' },
  { kimlik: 'yedi' as const, etiket: '7 gün' },
  { kimlik: 'otuz' as const, etiket: '30 gün' },
];

const Olcu: React.FC<{ deger: string; etiket: string; not?: string }> = ({ deger, etiket, not }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4">
    <p className="text-2xl font-black tabular-nums text-gray-900">{deger}</p>
    <p className="mt-0.5 text-[11px] font-semibold text-gray-500">{etiket}</p>
    {not && <p className="mt-1 text-[11px] text-gray-400">{not}</p>}
  </div>
);

const Kart: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-4">
    <h2 className="mb-3 text-sm font-bold text-gray-900">{baslik}</h2>
    {children}
  </section>
);

export const TrafikSayfasi: React.FC = () => {
  const [donem, setDonem] = React.useState<'bugun' | 'yedi' | 'otuz'>('yedi');
  const [ozet, setOzet] = React.useState<TrafikOzeti | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

  React.useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    fetchYonetimTrafik(donem)
      .then((t) => {
        if (iptal) return;
        setOzet(t);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [donem]);

  const bosVeri = durum === 'hazir' && ozet !== null && ozet.tekil === 0;

  return (
    <div className="space-y-4">
      {/* ---- dönem seçimi ---- */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dönem">
        {DONEMLER.map((d) => (
          <button
            key={d.kimlik}
            type="button"
            onClick={() => setDonem(d.kimlik)}
            aria-pressed={donem === d.kimlik}
            className={`min-h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors ${
              donem === d.kimlik
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {d.etiket}
          </button>
        ))}
      </div>

      {durum === 'yukleniyor' && <Iskelet yukseklik="h-40" />}

      {durum === 'hata' && (
        <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center">
          <p className="font-bold text-rose-800">Trafik özeti yüklenemedi</p>
          <p className="mt-1 text-sm text-gray-600">
            Sayılar okunamadı. Sıfır göstermek yerine bunu yazıyoruz: ölçememek ile
            ölçüp bir şey bulamamak aynı şey değil.
          </p>
        </div>
      )}

      {bosVeri && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <p className="font-bold text-gray-900">Bu dönemde henüz ziyaret kaydı yok</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-gray-600">
            Ziyaretçi ölçümü yeni kuruldu; sayılar siteye giriş oldukça birikiyor.
            Buraya uydurma bir sayı yazmıyoruz.
          </p>
        </div>
      )}

      {durum === 'hazir' && ozet && !bosVeri && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Olcu deger={sayi(ozet.tekil)} etiket="tekil ziyaretçi" />
            <Olcu deger={sayi(ozet.goruntuleme)} etiket="sayfa görüntüleme" />
            <Olcu
              deger={yuzde(ozet.bounce)}
              etiket="tek sayfada çıkan"
              not="Girip hiçbir yere tıklamadan ayrılan"
            />
            <Olcu
              deger={sure(ozet.ortalamaOturum)}
              etiket="ortalama oturum"
              not="Tek sayfalık ziyaretler ortalamaya girmiyor"
            />
          </div>

          <Kart baslik="Günlük trafik">
            <CubukGrafik
              veri={ozet.gunler.map((g) => ({
                etiket: g.etiket,
                deger: g.tekil,
                ikincil: g.goruntuleme,
              }))}
              baslik="Günlük tekil ziyaretçi ve sayfa görüntüleme"
              birincilEtiket="Tekil"
              ikincilEtiket="Görüntüleme"
            />
            <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#2563EB' }} aria-hidden />
                Tekil ziyaretçi
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-blue-200" aria-hidden />
                Sayfa görüntüleme
              </span>
            </div>
          </Kart>

          <div className="grid gap-3 lg:grid-cols-2">
            <Kart baslik="Nereden geldiler">
              <DagilimListesi veri={ozet.kaynaklar} toplam={ozet.tekil} />
            </Kart>
            <Kart baslik="Şehirler">
              <DagilimListesi veri={ozet.sehirler} toplam={ozet.tekil} />
            </Kart>
            <Kart baslik="Cihaz">
              <DagilimListesi veri={ozet.cihazlar} toplam={ozet.tekil} sinir={3} />
            </Kart>
            {/*
              Sayfa listesi BAKIŞ sayıyor, kişi değil: aynı kişi bir sayfaya
              iki kez bakmışsa iki bakış. Yüzdeler bu yüzden görüntülemeye
              bölünüyor; tekile bölmek yanlış tabana oturturdu.
            */}
            <Kart baslik="En çok bakılan sayfalar">
              <DagilimListesi veri={ozet.sayfalar} toplam={ozet.goruntuleme} />
            </Kart>
          </div>

          <Kart baslik="Ziyaretten başvuruya">
            {ozet.huni.some((a) => a.adet > 0) ? (
              <Huni adimlar={ozet.huni} />
            ) : (
              <BosDurum mesaj="Bu dönemde huni adımlarında hareket yok" />
            )}
          </Kart>
        </>
      )}
    </div>
  );
};
