import React from 'react';
import { supabase } from '../lib/supabase';
import {
  ACIKLAMA_SINIRI,
  aciklamaKur,
  etiketleriBul,
  paylasimSorunlari,
} from '../lib/instagram-paylasim.mjs';

/**
 * Yönetim → Instagram bağlantısı.
 *
 * NEDEN BU EKRAN VAR
 * ------------------
 * Durum ucu (/api/instagram/durum) yönetici oturumu istiyor: tarayıcıda
 * adresi açmak yetmiyor, çünkü Supabase oturum jetonu istekle birlikte
 * gitmiyor. Bu sayfa jetonu ekleyip sonucu okunur biçimde gösteriyor.
 *
 * Ekranda jeton ya da uygulama sırrı GÖSTERİLMİYOR; uç zaten döndürmüyor.
 * Burada yalnızca "bağlı mı, hangi hesap, izinler ne, kota ne" var.
 */

type Durum = {
  bagli?: boolean;
  sorunlar?: string[];
  eksikAyarlar?: string[];
  hesap?: { id: string; kullaniciAdi: string | null; ad: string | null } | null;
  jeton?: {
    gecerli: boolean;
    suresiz: boolean;
    biterTarih: string | null;
    gunKaldi: number | null;
    izinler: string[];
    yayinYetkisi: boolean;
  };
  yayinKotasi?: { kullanilan: number | null; sinir: number | null } | null;
  kontrolZamani?: string;
  hata?: string;
};

/*
  İlk gönderinin kartları ve metni.

  Kartlar scripts/instagram-kartlari.mjs ile üretilip public/paylasim/
  altına yazıldı; Instagram görseli kendi indirdiği için adres herkese açık
  ve kalıcı olmak zorunda.

  Metin taslak: yayın düğmesine basmadan önce burada düzenlenebiliyor.
  Etiketler ayrı blokta ve az sayıda — otuz etiket erişim değil spam
  sinyali veriyor.
*/
const KARTLAR = [
  '/paylasim/01-kapak.jpg',
  '/paylasim/02-nasil-derliyoruz.jpg',
  '/paylasim/03-takip.jpg',
];

const TASLAK_METIN = aciklamaKur(
  [
    'İlanları aracı sitelerden değil, şirketlerin kendi kariyer sayfalarından derliyoruz.',
    'Her ilanda şirketin kendi başvuru bağlantısı var; arada kimse yok.',
    '',
    'Bursta tarih doğrulanmadıysa "takvim bekleniyor" yazıyoruz — tahmin etmiyoruz.',
    '',
    'Staj ilanları, burslar, KYK ve yurt dışı programları: stajimvar.com (bağlantı profilde)',
  ].join('\n')
);

const tarih = (deger?: string | null) =>
  deger ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(deger)) : '—';

export const AdminInstagramView: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [durum, setDurum] = React.useState<Durum | null>(null);
  const [metin, setMetin] = React.useState(TASLAK_METIN);
  const [yayin, setYayin] = React.useState<{
    asama: 'bos' | 'gonderiliyor' | 'tamam' | 'hata';
    mesaj?: string;
  }>({ asama: 'bos' });
  const [asama, setAsama] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [hata, setHata] = React.useState('');

  const sorgula = React.useCallback(async () => {
    setAsama('yukleniyor');
    setHata('');
    try {
      const { data } = await supabase.auth.getSession();
      const jeton = data.session?.access_token;
      if (!jeton) throw new Error('Oturum bulunamadı; yeniden giriş yapın.');

      const cevap = await fetch('/api/instagram/durum', {
        headers: { authorization: `Bearer ${jeton}` },
      });
      const govde = (await cevap.json()) as Durum;
      setDurum(govde);
      setAsama('hazir');
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Bilinmeyen hata');
      setAsama('hata');
    }
  }, []);

  React.useEffect(() => {
    void sorgula();
  }, [sorgula]);

  const tamAdresler = KARTLAR.map((yol) => `https://stajimvar.com${yol}`);
  const sorunlar: string[] = paylasimSorunlari(
    { gorseller: tamAdresler, aciklama: metin },
    'stajimvar.com'
  );
  const etiketSayisi = etiketleriBul(metin).length;

  const yayinla = async () => {
    /*
      Yayınlanan gönderi API'den silinemiyor; bu yüzden önce tarayıcı onayı,
      sonra istek gövdesinde ayrıca `onay: true`.
    */
    const emin = window.confirm(
      `${KARTLAR.length} kartlık gönderi Instagram'da YAYINLANACAK. Yayınlanan gönderi buradan silinemez. Devam edilsin mi?`
    );
    if (!emin) return;

    setYayin({ asama: 'gonderiliyor' });
    try {
      const { data } = await supabase.auth.getSession();
      const jeton = data.session?.access_token;
      if (!jeton) throw new Error('Oturum bulunamadı; yeniden giriş yapın.');

      /*
        Yanıt her zaman JSON olmayabiliyor: uç süre aşımına uğrarsa
        Cloudflare HTML hata sayfası döndürüyor ve JSON.parse
        "Unexpected token '<'" diyor. Önce metin okunuyor, çözülemezse ham
        yanıtın başı gösteriliyor.
      */
      const cagir = async (govde: Record<string, unknown>) => {
        const cevap = await fetch('/api/instagram/paylas', {
          method: 'POST',
          headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
          body: JSON.stringify({ ...govde, onay: true }),
        });

        const ham = await cevap.text();
        let cozulen: { hata?: string; sorunlar?: string[]; [k: string]: unknown } | null = null;
        try {
          cozulen = JSON.parse(ham);
        } catch {
          cozulen = null;
        }

        /*
          Sunucu hataları 200 + { hata } olarak dönüyor (Cloudflare 5xx
          gövdesini kendi hata sayfasıyla değiştirdiği için). Bu yüzden
          durum koduna değil, gövdedeki `hata` alanına bakılıyor.
        */
        if (!cevap.ok || !cozulen || cozulen.hata) {
          const ayrinti = cozulen?.sorunlar?.length ? ` — ${cozulen.sorunlar.join(' ')}` : '';
          throw new Error(
            cozulen?.hata
              ? `${cozulen.hata}${ayrinti}`
              : `İstek başarısız (HTTP ${cevap.status}). Sunucu yanıtı: ${ham.slice(0, 200)}`
          );
        }
        return cozulen;
      };

      /*
        İki adım: önce kapsayıcılar kurulur (Instagram kartları kendi
        indirir), sonra yayınlanır. Tek istekte beş Meta çağrısı süre
        aşımına takılıyordu.
      */
      setYayin({ asama: 'gonderiliyor', mesaj: 'Kartlar Instagram tarafına hazırlanıyor…' });
      const hazirlik = await cagir({ adim: 'hazirla', gorseller: tamAdresler, aciklama: metin });

      /*
        Kapsayıcı hazır olana kadar bekleniyor: Instagram kartları kendi
        indirip işliyor ve bu birkaç saniye sürüyor. Hazır değilken
        yayınlamaya kalkmak "Media ID is not available" hatası veriyordu.
      */
      let sonuc: Record<string, unknown> | null = null;
      for (let deneme = 1; deneme <= 12; deneme += 1) {
        setYayin({
          asama: 'gonderiliyor',
          mesaj: deneme === 1 ? 'Gönderi yayınlanıyor…' : `Instagram kartları işliyor… (${deneme}/12)`,
        });

        const adim = await cagir({ adim: 'yayinla', kapsayici: hazirlik.kapsayici });
        if (!adim.hazirDegil) {
          sonuc = adim;
          break;
        }
        await new Promise((bekle) => setTimeout(bekle, 4000));
      }

      if (!sonuc) {
        throw new Error(
          'Instagram kartları hâlâ işliyor. Birkaç dakika sonra "Instagram-da yayınla" ile yeniden deneyebilirsin.'
        );
      }

      setYayin({ asama: 'tamam', mesaj: `Yayınlandı. Gönderi kimliği: ${sonuc.gonderiKimligi}` });
    } catch (e) {
      setYayin({ asama: 'hata', mesaj: e instanceof Error ? e.message : 'Bilinmeyen hata' });
    }
  };

  const rozet = durum?.bagli
    ? { metin: 'Bağlı', sinif: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : { metin: 'Bağlı değil', sinif: 'bg-red-50 text-red-700 border-red-200' };

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-5">
      <button onClick={() => onNavigate('/')} className="text-sm font-bold text-blue-700">
        ← Siteye dön
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950">Instagram bağlantısı</h1>
          <p className="text-sm text-gray-600">
            Bağlantı sunucuda doğrulanıyor; jeton ve uygulama sırrı bu sayfaya hiç inmiyor.
          </p>
        </div>
        <button
          onClick={sorgula}
          disabled={asama === 'yukleniyor'}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {asama === 'yukleniyor' ? 'Kontrol ediliyor…' : 'Yeniden kontrol et'}
        </button>
      </div>

      {asama === 'hata' && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {hata}
        </p>
      )}

      {durum && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${rozet.sinif}`}>{rozet.metin}</span>
            {durum.kontrolZamani && (
              <span className="text-xs text-gray-500">Kontrol: {tarih(durum.kontrolZamani)}</span>
            )}
          </div>

          {durum.hata && <p className="text-sm text-red-700">{durum.hata}</p>}

          {durum.eksikAyarlar?.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-bold">Cloudflare'da eksik değişkenler:</p>
              <ul className="mt-1 list-disc pl-5">
                {durum.eksikAyarlar.map((ad) => (
                  <li key={ad}>
                    <code>{ad}</code>
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                Pages projesinin <strong>Production</strong> ortamına eklenmeli; yalnızca derleme
                ortamına eklenen değişkenler çalışma anında görünmüyor.
              </p>
            </div>
          ) : null}

          {durum.sorunlar?.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
              {durum.sorunlar.map((sorun) => (
                <li key={sorun}>{sorun}</li>
              ))}
            </ul>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-gray-500">Hesap</dt>
              <dd className="font-semibold text-gray-900">
                {durum.hesap ? `${durum.hesap.kullaniciAdi ?? durum.hesap.ad ?? '—'} (${durum.hesap.id})` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Jeton</dt>
              <dd className="font-semibold text-gray-900">
                {durum.jeton?.gecerli
                  ? durum.jeton.suresiz
                    ? 'Geçerli — süresiz'
                    : `Geçerli — ${tarih(durum.jeton.biterTarih)} (${durum.jeton.gunKaldi} gün)`
                  : 'Geçersiz'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Paylaşım yetkisi</dt>
              <dd className="font-semibold text-gray-900">
                {durum.jeton?.yayinYetkisi ? 'Var' : 'Yok'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Yayın kotası</dt>
              <dd className="font-semibold text-gray-900">
                {durum.yayinKotasi
                  ? `${durum.yayinKotasi.kullanilan ?? '—'} / ${durum.yayinKotasi.sinir ?? '—'}`
                  : '—'}
              </dd>
            </div>
          </dl>

          {durum.jeton?.izinler?.length ? (
            <div className="text-sm">
              <p className="text-gray-500">İzinler</p>
              <p className="mt-1 flex flex-wrap gap-1.5">
                {durum.jeton.izinler.map((izin) => (
                  <span key={izin} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {izin}
                  </span>
                ))}
              </p>
            </div>
          ) : null}

        </div>
      )}

      {/*
        GÖNDERİ YAYINLAMA

        Yayın tek yönlü: gönderi API'den silinemiyor. Düğme yalnızca bağlantı
        doğrulanmışsa ve metin doğrulamayı geçmişse etkin; basıldığında
        ayrıca tarayıcı onayı isteniyor.
      */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-extrabold text-gray-950">Gönderi yayınla</h2>
          <p className="text-sm text-gray-600">
            Kartlar <code>public/paylasim/</code> altından geliyor; yenilemek için{' '}
            <code>npm run instagram-kartlari</code>.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {KARTLAR.map((yol) => (
            <img
              key={yol}
              src={yol}
              alt=""
              className="aspect-square w-full rounded-xl border border-gray-200 object-cover"
            />
          ))}
        </div>

        <label className="block text-sm font-semibold text-gray-800">
          Gönderi metni
          <textarea
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            className="mt-1 min-h-56 w-full rounded-xl border border-gray-200 p-3 font-mono text-xs leading-relaxed"
          />
        </label>

        <p className="text-xs text-gray-500">
          {metin.length} / {ACIKLAMA_SINIRI} karakter · {etiketSayisi} etiket
        </p>

        {sorunlar.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
            {sorunlar.map((sorun) => (
              <li key={sorun}>{sorun}</li>
            ))}
          </ul>
        )}

        {yayin.mesaj && (
          <p
            role="status"
            aria-live="polite"
            className={`rounded-xl border p-3 text-sm ${
              yayin.asama === 'hata'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {yayin.mesaj}
          </p>
        )}

        <button
          onClick={yayinla}
          disabled={!durum?.bagli || sorunlar.length > 0 || yayin.asama === 'gonderiliyor'}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {yayin.asama === 'gonderiliyor' ? 'Yayınlanıyor…' : 'Instagram-da yayınla'}
        </button>

        {!durum?.bagli && (
          <p className="text-xs text-gray-500">Yayın düğmesi, bağlantı doğrulanana kadar kapalı.</p>
        )}
      </div>
    </main>
  );
};
