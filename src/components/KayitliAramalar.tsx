import React from 'react';
import { BellOff, Pencil, Trash2 } from 'lucide-react';
import {
  aramayiGuncelle,
  aramayiSil,
  fetchKayitliAramalar,
  tumOzetleriKapat,
  type KayitliArama,
} from '../lib/queries';
import {
  RIZA_METNI,
  RIZA_METNI_SURUMU,
  aramaAdresine,
  filtreleriDogrula,
} from '../lib/kayitli-arama.mjs';

/**
 * KAYITLI ARAMALAR — AYARLAR
 *
 * Aramayı açma (listeye yeniden uygulama), adını değiştirme, silme ve
 * e-postayı açma/kapatma burada. Ayrıca bütün özetleri tek işlemle
 * kapatma.
 *
 * E-POSTA VARSAYILAN KAPALI
 * -------------------------
 * Arama kaydetmek bir bildirim aboneliği değil. Açma anında rıza
 * metni GÖSTERİLİYOR ve sürümü kaydediliyor; damgayı sunucu atıyor.
 */

interface KayitliAramalarProps {
  onToast: (mesaj: string) => void;
  onNavigate: (yol: string) => void;
  /**
   * İŞVEREN HESABINA ÖĞRENCİ ÖZETİ AÇILMIYOR
   *
   * Ekran yalnız öğrenci bağlamında çiziliyor; işveren panelinde bu
   * bölüm hiç yok. Dayanak yine de arayüz değil: kayıtlı arama
   * satırları `student_id = auth.uid()` ile sınırlı ve bir işveren
   * hesabının kaydı yoksa listesi de boş.
   */
  ogrenciMi: boolean;
}

/** Filtreden okunabilir bir özet: kullanıcı ad vermediyse bu görünüyor. */
export function filtreOzeti(filtreler: unknown): string {
  const f = filtreleriDogrula(filtreler);
  const parcalar: string[] = [];
  if (f.q) parcalar.push(`“${f.q}”`);
  if (f.country === 'remote') parcalar.push('Uzaktan');
  else if (f.country !== 'all') parcalar.push(f.country);
  if (f.city !== 'all') parcalar.push(f.city);
  if (f.workTypes.length) parcalar.push(f.workTypes.join('/'));
  if (f.departments.length) parcalar.push(f.departments.join(', '));
  if (f.pay === 'paid') parcalar.push('Ücretli');
  if (f.pay === 'unpaid') parcalar.push('Ücretsiz');
  if (f.mandatory) parcalar.push('Zorunlu staj');
  if (f.voluntary) parcalar.push('Gönüllü staj');
  return parcalar.join(' · ') || 'Tüm ilanlar';
}

export const KayitliAramalar: React.FC<KayitliAramalarProps> = ({
  onToast,
  onNavigate,
  ogrenciMi,
}) => {
  const [aramalar, setAramalar] = React.useState<KayitliArama[]>([]);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [islemde, setIslemde] = React.useState<string | null>(null);
  const [adDuzenle, setAdDuzenle] = React.useState<string | null>(null);
  const [adlar, setAdlar] = React.useState<Record<string, string>>({});
  const [rizaAcik, setRizaAcik] = React.useState<string | null>(null);

  const yukle = React.useCallback(() => {
    if (!ogrenciMi) {
      setDurum('hazir');
      return;
    }
    setDurum('yukleniyor');
    fetchKayitliAramalar()
      .then((v) => {
        setAramalar(v);
        setDurum('hazir');
      })
      .catch(() => setDurum('hata'));
  }, [ogrenciMi]);

  React.useEffect(yukle, [yukle]);

  if (!ogrenciMi) return null;

  const epostaAc = async (a: KayitliArama) => {
    setIslemde(a.id);
    try {
      await aramayiGuncelle(a.id, { emailEnabled: true, consentTextVersion: RIZA_METNI_SURUMU });
      setAramalar((p) => p.map((x) => (x.id === a.id ? { ...x, emailEnabled: true } : x)));
      setRizaAcik(null);
      onToast('Günlük özet açıldı.');
    } catch (hata) {
      onToast(hata instanceof Error ? hata.message : 'Açılamadı.');
    } finally {
      setIslemde(null);
    }
  };

  const epostaKapat = async (a: KayitliArama) => {
    setIslemde(a.id);
    try {
      await aramayiGuncelle(a.id, { emailEnabled: false });
      setAramalar((p) => p.map((x) => (x.id === a.id ? { ...x, emailEnabled: false } : x)));
      onToast('Günlük özet kapatıldı.');
    } catch (hata) {
      onToast(hata instanceof Error ? hata.message : 'Kapatılamadı.');
    } finally {
      setIslemde(null);
    }
  };

  const adKaydet = async (a: KayitliArama) => {
    const yeni = adlar[a.id] ?? a.name ?? '';
    setIslemde(a.id);
    try {
      await aramayiGuncelle(a.id, { name: yeni });
      setAramalar((p) => p.map((x) => (x.id === a.id ? { ...x, name: yeni.trim() || undefined } : x)));
      setAdDuzenle(null);
      onToast('Ad güncellendi.');
    } catch (hata) {
      onToast(hata instanceof Error ? hata.message : 'Güncellenemedi.');
    } finally {
      setIslemde(null);
    }
  };

  const sil = async (a: KayitliArama) => {
    setIslemde(a.id);
    try {
      await aramayiSil(a.id);
      setAramalar((p) => p.filter((x) => x.id !== a.id));
      onToast('Arama silindi.');
    } catch (hata) {
      onToast(hata instanceof Error ? hata.message : 'Silinemedi.');
    } finally {
      setIslemde(null);
    }
  };

  const hepsiniKapat = async () => {
    setIslemde('hepsi');
    try {
      await tumOzetleriKapat();
      setAramalar((p) => p.map((x) => ({ ...x, emailEnabled: false })));
      onToast('Bütün ilan özetleri kapatıldı.');
    } catch (hata) {
      onToast(hata instanceof Error ? hata.message : 'Kapatılamadı.');
    } finally {
      setIslemde(null);
    }
  };

  if (durum === 'yukleniyor') {
    return (
      <div
        className="h-24 rounded-2xl bg-gray-100 animate-pulse"
        role="status"
        aria-label="Kayıtlı aramalar yükleniyor"
      />
    );
  }

  if (durum === 'hata') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center space-y-2">
        <p className="font-bold text-rose-800">Kayıtlı aramalar yüklenemedi</p>
        <button
          type="button"
          onClick={yukle}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white cursor-pointer"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (aramalar.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-600">
          Kayıtlı aramanız yok. İlan listesinde filtre uyguladıktan sonra{' '}
          <strong>“Bu aramayı kaydet”</strong> diyebilirsiniz.
        </p>
      </div>
    );
  }

  const acikOzetVar = aramalar.some((a) => a.emailEnabled);

  return (
    <div className="space-y-3">
      {aramalar.map((a) => (
        /* Kart dili mevcut düzenle aynı: telefonda tam genişlik, köşesiz. */
        <div key={a.id} className="border-y border-gray-200 bg-white p-4 sm:rounded-2xl sm:border-x">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 break-words text-sm font-bold text-gray-900">
              {a.name || filtreOzeti(a.filters)}
            </p>
            <span
              className={`rounded-md border px-1.5 py-0.5 text-xs font-bold ${
                a.emailEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              {a.emailEnabled ? 'Günlük özet açık' : 'Özet kapalı'}
            </span>
          </div>

          {a.name && (
            <p className="mt-1 min-w-0 break-words text-xs text-gray-600">
              {filtreOzeti(a.filters)}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate(aramaAdresine(a.filters))}
              className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer"
            >
              Aramayı aç
            </button>

            {a.emailEnabled ? (
              <button
                type="button"
                onClick={() => epostaKapat(a)}
                disabled={islemde === a.id}
                className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-3 text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Özeti kapat
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRizaAcik(rizaAcik === a.id ? null : a.id)}
                className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-3 text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Özeti aç
              </button>
            )}

            <button
              type="button"
              onClick={() => setAdDuzenle(adDuzenle === a.id ? null : a.id)}
              aria-label="Adını değiştir"
              className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-3 text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => sil(a)}
              disabled={islemde === a.id}
              aria-label="Aramayı sil"
              className="ml-auto inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-3 text-gray-500 hover:bg-gray-50 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/*
            RIZA METNİ AÇMA ANINDA GÖSTERİLİYOR

            Onay kutusu değil, açık bir onay adımı: kullanıcı ne kabul
            ettiğini okumadan e-posta açamıyor. Metnin sürümü kayda
            geçiyor, yani metin değişirse eski rızanın neye verildiği
            belli kalıyor.
          */}
          {rizaAcik === a.id && (
            <div className="mt-3 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs leading-relaxed text-blue-900">{RIZA_METNI}</p>
              <button
                type="button"
                onClick={() => epostaAc(a)}
                disabled={islemde === a.id}
                className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {islemde === a.id ? 'Açılıyor…' : 'Kabul ediyorum, günlük özeti aç'}
              </button>
            </div>
          )}

          {adDuzenle === a.id && (
            <div className="mt-3 space-y-2">
              <label className="sr-only" htmlFor={`ad-${a.id}`}>
                Arama adı
              </label>
              <input
                id={`ad-${a.id}`}
                value={adlar[a.id] ?? a.name ?? ''}
                onChange={(o) => setAdlar((p) => ({ ...p, [a.id]: o.target.value }))}
                placeholder="Örn. İstanbul yazılım stajı"
                className="w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-[15px] text-gray-900"
              />
              <button
                type="button"
                onClick={() => adKaydet(a)}
                disabled={islemde === a.id}
                className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
              >
                Adı kaydet
              </button>
            </div>
          )}
        </div>
      ))}

      {acikOzetVar && (
        <button
          type="button"
          onClick={hepsiniKapat}
          disabled={islemde === 'hepsi'}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          <BellOff className="h-4 w-4" aria-hidden="true" />
          Bütün ilan özetlerini kapat
        </button>
      )}
    </div>
  );
};
