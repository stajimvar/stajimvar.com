import React from 'react';
import { supabase } from '../lib/supabase';

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

const tarih = (deger?: string | null) =>
  deger ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(deger)) : '—';

export const AdminInstagramView: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [durum, setDurum] = React.useState<Durum | null>(null);
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

          <p className="border-t border-gray-100 pt-3 text-xs text-gray-500">
            Bu ekran yalnızca bağlantıyı doğruluyor. İçerik paylaşma özelliği henüz yok.
          </p>
        </div>
      )}
    </main>
  );
};
