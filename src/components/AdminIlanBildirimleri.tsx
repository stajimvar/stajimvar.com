import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Mail, RefreshCw } from 'lucide-react';
import {
  fetchIlanBildirimleri,
  ilanBildirimiIncele,
  ilanBildirimiYenidenDene,
  type IlanBildirimDurumu,
  type IlanBildirimi,
} from '../lib/queries';

/**
 * YÖNETİCİ — İLAN BİLDİRİMLERİ
 *
 * /ilan-bildir formu bildirimi kalıcı olarak kaydediyordu ama kaydı
 * okuyabilen bir ekran yoktu: bildirim alınıyor, kimse görmüyordu. Kapanmış
 * ilanı listeden düşürmek bu ürünün asıl vaadi ve o iş burada yapılıyor.
 *
 * YETKİ ARAYÜZDE DEĞİL VERİTABANINDA
 * ----------------------------------
 * Bu bileşen yalnız yönetici yolunda çiziliyor, ama güvenliğin dayanağı o
 * değil. RLS `select` politikası tabloyu `is_admin()` dışına hiç açmıyor;
 * güncelleme RPC'si de yetkiyi kendi içinde denetliyor. Adresi bilen
 * yetkisiz biri bileşeni çizdirse bile liste boş gelir ve işlem hata
 * döndürür.
 */

interface AdminIlanBildirimleriProps {
  onToast: (mesaj: string) => void;
}

const SEBEP_ETIKET: Record<string, string> = {
  kapanmis_ilan: 'Kapanmış ilan',
  yanlis_bilgi: 'Yanlış bilgi',
  ucret_talebi: 'Ücret talebi',
  ayirimci_ifade: 'Ayrımcı ifade',
  sahte_ilan: 'Sahte ilan',
  kirik_baglanti: 'Kırık bağlantı',
  diger: 'Diğer',
};

const DURUM_ETIKET: Record<IlanBildirimDurumu, string> = {
  yeni: 'Yeni',
  inceleniyor: 'İnceleniyor',
  kapatildi: 'Kapatıldı',
};

const DURUM_RENK: Record<IlanBildirimDurumu, string> = {
  yeni: 'border-blue-200 bg-blue-50 text-blue-800',
  inceleniyor: 'border-amber-200 bg-amber-50 text-amber-800',
  kapatildi: 'border-gray-200 bg-gray-50 text-gray-600',
};

/** Saatsiz tarih değil: bildirim sırası dakika düzeyinde anlamlı. */
function tarih(ham: string): string {
  const d = new Date(ham);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * E-POSTA DURUMU AYRI GÖSTERİLİYOR
 *
 * "Bildirim kaydedildi" ile "yöneticiye haber gitti" iki farklı olay.
 * Kuyruk kaydının varlığını gönderim başarısı saymak, sessizce kaybolan
 * bir haber zincirini "çalışıyor" gibi göstermek olurdu.
 */
function epostaDurumu(b: IlanBildirimi): { metin: string; tukendi: boolean } {
  if (b.notifiedAt) return { metin: `E-posta gönderildi · ${tarih(b.notifiedAt)}`, tukendi: false };
  if (b.notifyAttempts >= 8) return { metin: 'E-posta denemeleri tükendi', tukendi: true };
  if (b.notifyAttempts > 0)
    return { metin: `E-posta bekliyor · ${b.notifyAttempts} deneme başarısız`, tukendi: false };
  return { metin: 'E-posta kuyrukta', tukendi: false };
}

export const AdminIlanBildirimleri: React.FC<AdminIlanBildirimleriProps> = ({ onToast }) => {
  const [bildirimler, setBildirimler] = useState<IlanBildirimi[]>([]);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [acik, setAcik] = useState<string | null>(null);
  const [islemde, setIslemde] = useState<string | null>(null);
  /* Not ve durum seçimi kayıt başına tutuluyor: iki bildirim açılıp
     kapandığında birinin notu ötekine taşmasın. */
  const [notlar, setNotlar] = useState<Record<string, string>>({});
  const [durumSecim, setDurumSecim] = useState<Record<string, IlanBildirimDurumu>>({});

  const yukle = useCallback(() => {
    setDurum('yukleniyor');
    fetchIlanBildirimleri()
      .then((v) => {
        setBildirimler(v);
        setDurum('hazir');
      })
      .catch(() => setDurum('hata'));
  }, []);

  useEffect(yukle, [yukle]);

  const kaydet = async (b: IlanBildirimi) => {
    const yeniDurum = durumSecim[b.id] ?? b.status;
    const yeniNot = notlar[b.id] ?? b.reviewNote ?? '';
    setIslemde(b.id);
    try {
      await ilanBildirimiIncele(b.id, yeniDurum, yeniNot);
      setBildirimler((p) =>
        p.map((x) =>
          x.id === b.id
            ? { ...x, status: yeniDurum, reviewNote: yeniNot || undefined, reviewedAt: new Date().toISOString() }
            : x
        )
      );
      onToast('Bildirim güncellendi.');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Güncellenemedi.');
    } finally {
      setIslemde(null);
    }
  };

  const yenidenDene = async (b: IlanBildirimi) => {
    setIslemde(b.id);
    try {
      await ilanBildirimiYenidenDene(b.id);
      setBildirimler((p) =>
        p.map((x) => (x.id === b.id ? { ...x, notifyAttempts: 0, notifyLastError: undefined } : x))
      );
      onToast('Bildirim yeniden kuyruğa alındı.');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Yeniden kuyruğa alınamadı.');
    } finally {
      setIslemde(null);
    }
  };

  if (durum === 'yukleniyor') {
    return (
      <div
        className="h-24 rounded-2xl bg-gray-100 animate-pulse"
        role="status"
        aria-label="Bildirimler yükleniyor"
      />
    );
  }

  if (durum === 'hata') {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-5 text-center space-y-2">
        <p className="font-bold text-rose-800">Bildirimler yüklenemedi</p>
        <button
          type="button"
          onClick={yukle}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 cursor-pointer"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (bildirimler.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">Henüz ilan bildirimi yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bildirimler.map((b) => {
        const posta = epostaDurumu(b);
        const acikMi = acik === b.id;
        return (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-4">
            {/*
              BAŞLIK SATIRI TELEFONDA TAŞMIYOR

              İlan adresi uzun ve boşluksuz: `break-all` olmadan kart 375
              pikselde yatay kaydırma üretiyordu. Rozetler `flex-wrap`,
              başlık `min-w-0`.
            */}
            <button
              type="button"
              onClick={() => setAcik(acikMi ? null : b.id)}
              aria-expanded={acikMi}
              className="w-full text-left cursor-pointer"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className={`rounded-md border px-1.5 py-0.5 ${DURUM_RENK[b.status]}`}>
                  {DURUM_ETIKET[b.status]}
                </span>
                <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-gray-700">
                  {SEBEP_ETIKET[b.reason] ?? b.reason}
                </span>
                {b.testMi && (
                  <span className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-violet-700">
                    Test kaydı
                  </span>
                )}
                {posta.tukendi && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-rose-700">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                    Deneme tükendi
                  </span>
                )}
                <span className="ml-auto font-semibold text-gray-500 tabular-nums">
                  {tarih(b.createdAt)}
                </span>
              </div>
              <p className="mt-2 min-w-0 break-words text-sm font-bold text-gray-900">
                {b.companyName || '(şirket yazılmamış)'}
                {b.positionTitle ? ` — ${b.positionTitle}` : ''}
              </p>
              <p className="mt-0.5 min-w-0 break-all text-xs text-gray-500">{b.listingUrl}</p>
            </button>

            {acikMi && (
              <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                <a
                  href={b.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-block break-all text-sm font-bold text-blue-600 hover:underline"
                >
                  İlanı aç →
                </a>

                {b.details && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Açıklama
                    </p>
                    {/*
                      `whitespace-pre-wrap` + `break-words`: kullanıcı metni
                      satır sonlarıyla anlamlı, ama tek parça uzun bir dize
                      kartı taşırmamalı. Metin React tarafından metin düğümü
                      olarak basılıyor; hiçbir yerde HTML olarak
                      yorumlanmıyor.
                    */}
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">
                      {b.details}
                    </p>
                  </div>
                )}

                {/*
                  İLETİŞİM E-POSTASI YALNIZ YÖNETİCİDE

                  Bu alan sunucudan yalnız yöneticiye geliyor (RLS). Kart
                  ayrıca `mailto:` bağlantısı veriyor: bildirimi yapan kişi
                  adresini dönüş isteyerek bıraktı.
                */}
                {b.reporterEmail && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      İletişim e-postası
                    </p>
                    <a
                      href={`mailto:${b.reporterEmail}`}
                      className="mt-1 inline-flex items-center gap-1.5 break-all text-sm font-semibold text-blue-600 hover:underline"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {b.reporterEmail}
                    </a>
                  </div>
                )}

                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                  <p className="font-semibold">{posta.metin}</p>
                  {b.notifyLastError && (
                    <p className="mt-1 break-words text-rose-700">Son hata: {b.notifyLastError}</p>
                  )}
                  {posta.tukendi && (
                    <button
                      type="button"
                      onClick={() => yenidenDene(b)}
                      disabled={islemde === b.id}
                      className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-xs font-bold text-white disabled:opacity-60 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      Yeniden kuyruğa al
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-xs font-bold uppercase tracking-wide text-gray-500"
                    htmlFor={`durum-${b.id}`}
                  >
                    İnceleme durumu
                  </label>
                  <select
                    id={`durum-${b.id}`}
                    value={durumSecim[b.id] ?? b.status}
                    onChange={(o) =>
                      setDurumSecim((p) => ({ ...p, [b.id]: o.target.value as IlanBildirimDurumu }))
                    }
                    className="w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-[15px] text-gray-900"
                  >
                    {(Object.keys(DURUM_ETIKET) as IlanBildirimDurumu[]).map((d) => (
                      <option key={d} value={d}>
                        {DURUM_ETIKET[d]}
                      </option>
                    ))}
                  </select>

                  <label
                    className="block text-xs font-bold uppercase tracking-wide text-gray-500"
                    htmlFor={`not-${b.id}`}
                  >
                    Sonuç notu
                  </label>
                  <textarea
                    id={`not-${b.id}`}
                    rows={3}
                    value={notlar[b.id] ?? b.reviewNote ?? ''}
                    onChange={(o) => setNotlar((p) => ({ ...p, [b.id]: o.target.value }))}
                    placeholder="Ne yaptık? (ilan arşivlendi, kaynak doğrulandı…)"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[15px] text-gray-900"
                  />

                  <button
                    type="button"
                    onClick={() => kaydet(b)}
                    disabled={islemde === b.id}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto cursor-pointer"
                  >
                    {islemde === b.id ? 'Kaydediliyor…' : 'İncelemeyi kaydet'}
                  </button>
                  {b.reviewedAt && (
                    <p className="text-xs text-gray-500">Son inceleme: {tarih(b.reviewedAt)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
