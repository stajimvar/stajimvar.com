import React from 'react';
import { ExternalLink, Mail, Trash2 } from 'lucide-react';
import {
  fetchBasvuruTakibi,
  takipGuncelle,
  takipSil,
  type BasvuruTakibi,
  type KisiselBasvuruDurumu,
} from '../lib/queries';
/*
  Saf kararlar ayrı dosyada: test React ağacı kurmadan sınayabilsin.
  Bileşenin içinde kalsalardı zamanla ilgili iki kuralı doğrulamak için
  ekranı render etmek gerekirdi.
*/
import { gecenGun, hatirlatmaGosterilsinMi } from '../lib/basvuru-takibi.mjs';

/**
 * KİŞİSEL TAKİP DEFTERİ
 *
 * Öğrencinin kendi tuttuğu kayıt. `applications` GERÇEK başvuru; bu
 * liste öğrencinin kendi durumu ve notu.
 *
 * NEDEN GEREKLİ
 * -------------
 * Yayındaki ilanların neredeyse tamamı `external`: başvuru şirketin
 * kendi sayfasından alınıyor ve o başvuru bizim veritabanımızda YOK.
 * Öğrenci nereye başvurduğunu hiçbir yerde göremiyordu.
 *
 * ŞİRKETLER BU LİSTEYİ GÖRMÜYOR
 * -----------------------------
 * Dayanak arayüz değil RLS: tabloda şirketlere açık bir `select`
 * politikası yok (bkz. 20261002010000). Öğrenci not yazarken kendini
 * sansürlemek zorunda kalmasın.
 */

interface KisiselTakipListesiProps {
  onToast: (mesaj: string) => void;
  /** İlan sayfasına götürür; ilan silinmişse verilmiyor. */
  onNavigate: (yol: string) => void;
  /**
   * Gerçek başvuruların işveren durumu — SALT OKUNUR.
   *
   * Takip kaydı gerçek bir başvuruya bağlıysa (internal /
   * email_application) işverenin değerlendirmesi burada görünüyor.
   * Öğrencinin kişisel durumu bunun ÜZERİNE YAZMIYOR: ikisi ayrı
   * satırda, ayrı etiketle duruyor.
   */
  gercekDurumlar?: Record<string, { etiket: string; teslim?: string }>;
}

const DURUM_ETIKET: Record<KisiselBasvuruDurumu, string> = {
  basvurdum: 'Başvurdum',
  bekliyorum: 'Bekliyorum',
  gorusme: 'Görüşme',
  teklif: 'Teklif',
  olumsuz: 'Olumsuz',
  vazgectim: 'Vazgeçtim',
};

const DURUM_RENK: Record<KisiselBasvuruDurumu, string> = {
  basvurdum: 'border-blue-200 bg-blue-50 text-blue-800',
  bekliyorum: 'border-amber-200 bg-amber-50 text-amber-800',
  gorusme: 'border-violet-200 bg-violet-50 text-violet-800',
  teklif: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  olumsuz: 'border-gray-200 bg-gray-50 text-gray-600',
  vazgectim: 'border-gray-200 bg-gray-50 text-gray-600',
};

const KANAL_ETIKET: Record<BasvuruTakibi['channel'], string> = {
  external: 'Şirketin kendi sayfası',
  email_application: 'StajımVar e-posta ile iletti',
  internal: 'StajımVar üzerinden',
};

function tarih(ham: string): string {
  const d = new Date(ham);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const KisiselTakipListesi: React.FC<KisiselTakipListesiProps> = ({
  onToast,
  onNavigate,
  gercekDurumlar,
}) => {
  const [kayitlar, setKayitlar] = React.useState<BasvuruTakibi[]>([]);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [islemde, setIslemde] = React.useState<string | null>(null);
  const [notlar, setNotlar] = React.useState<Record<string, string>>({});
  const [acikNot, setAcikNot] = React.useState<string | null>(null);

  const yukle = React.useCallback(() => {
    setDurum('yukleniyor');
    fetchBasvuruTakibi()
      .then((v) => {
        setKayitlar(v);
        setDurum('hazir');
      })
      .catch(() => setDurum('hata'));
  }, []);

  React.useEffect(yukle, [yukle]);

  const durumDegistir = async (t: BasvuruTakibi, yeni: KisiselBasvuruDurumu) => {
    setIslemde(t.id);
    try {
      await takipGuncelle(t.id, { personalStatus: yeni });
      setKayitlar((p) => p.map((x) => (x.id === t.id ? { ...x, personalStatus: yeni } : x)));
    } catch (hata) {
      onToast(hata instanceof Error ? hata.message : 'Güncellenemedi.');
    } finally {
      setIslemde(null);
    }
  };

  const notKaydet = async (t: BasvuruTakibi) => {
    const metin = notlar[t.id] ?? t.personalNote ?? '';
    setIslemde(t.id);
    try {
      await takipGuncelle(t.id, { personalNote: metin });
      setKayitlar((p) =>
        p.map((x) => (x.id === t.id ? { ...x, personalNote: metin.trim() || undefined } : x))
      );
      setAcikNot(null);
      onToast('Not kaydedildi.');
    } catch (hata) {
      onToast(hata instanceof Error ? hata.message : 'Not kaydedilemedi.');
    } finally {
      setIslemde(null);
    }
  };

  const sil = async (t: BasvuruTakibi) => {
    setIslemde(t.id);
    try {
      await takipSil(t.id);
      setKayitlar((p) => p.filter((x) => x.id !== t.id));
      onToast('Takip kaydı silindi.');
    } catch (hata) {
      onToast(hata instanceof Error ? hata.message : 'Silinemedi.');
    } finally {
      setIslemde(null);
    }
  };

  if (durum === 'yukleniyor') {
    return (
      <div
        className="h-24 rounded-2xl bg-gray-100 animate-pulse"
        role="status"
        aria-label="Takip listesi yükleniyor"
      />
    );
  }

  if (durum === 'hata') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center space-y-2">
        <p className="font-bold text-rose-800">Takip listesi yüklenemedi</p>
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

  if (kayitlar.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-600">
          Henüz takip kaydın yok. Bir ilanda <strong>“Başvurduğumu işaretle”</strong> dediğinde
          burada görünür.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Bu kayıt yalnızca senin takibin içindir; şirkete başvuru göndermez.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {kayitlar.map((t) => {
        const gercek = t.applicationId ? gercekDurumlar?.[t.applicationId] : undefined;
        const hatirlat = hatirlatmaGosterilsinMi(t);
        return (
          /*
            KART ÖLÇÜSÜ MEVCUT DÜZENLE AYNI

            Telefonda tam genişlik, köşesiz ve gölgesiz: `rounded-none`
            + `border-x-0` (sm'de yuvarlanıyor). Mevcut başvuru kartı bu
            ölçüyü kullanıyor; ikinci bir ölçü aynı listede iki farklı
            kart dili olurdu.
          */
          <div
            key={t.id}
            className="border-y border-gray-200 bg-white p-4 sm:rounded-2xl sm:border-x"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className={`rounded-md border px-1.5 py-0.5 ${DURUM_RENK[t.personalStatus]}`}>
                {DURUM_ETIKET[t.personalStatus]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-gray-600">
                {t.channel === 'external' ? (
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Mail className="h-3 w-3" aria-hidden="true" />
                )}
                {KANAL_ETIKET[t.channel]}
              </span>
              <span className="ml-auto font-semibold text-gray-500 tabular-nums">
                {tarih(t.appliedAt)}
              </span>
            </div>

            <p className="mt-2 min-w-0 break-words text-sm font-bold text-gray-900">
              {t.listingTitle}
            </p>
            {t.companyName && (
              <p className="mt-0.5 min-w-0 break-words text-xs text-gray-600">{t.companyName}</p>
            )}

            {/*
              İŞVEREN DURUMU SALT OKUNUR VE AYRI SATIRDA

              Öğrencinin kendi durumu yukarıdaki rozet; bu satır
              işverenin değerlendirmesi. İkisi tek rozette birleşseydi
              öğrencinin "Görüşme" yazması işverenin durumunu
              değiştirmiş gibi görünürdü.
            */}
            {gercek && (
              <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-700">
                <span className="font-bold">Şirketin değerlendirmesi:</span> {gercek.etiket}
                {gercek.teslim ? ` · ${gercek.teslim}` : ''}
              </p>
            )}

            {hatirlat && (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {/*
                  HÜKÜM KURULMUYOR: "şirket cevap vermedi" diyemeyiz,
                  external başvuruda şirketin ne yaptığını hiç
                  bilmiyoruz.
                */}
                Takip etmek isteyebilirsin — {gecenGun(t.appliedAt)} gün geçti.{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/basvuru-sablonu')}
                  className="font-bold underline cursor-pointer"
                >
                  Takip e-postası şablonu
                </button>
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`durum-${t.id}`}>
                Kişisel durum
              </label>
              <select
                id={`durum-${t.id}`}
                value={t.personalStatus}
                disabled={islemde === t.id}
                onChange={(o) => durumDegistir(t, o.target.value as KisiselBasvuruDurumu)}
                className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-[15px] text-gray-900 sm:flex-none"
              >
                {(Object.keys(DURUM_ETIKET) as KisiselBasvuruDurumu[]).map((d) => (
                  <option key={d} value={d}>
                    {DURUM_ETIKET[d]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setAcikNot(acikNot === t.id ? null : t.id)}
                className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-3 text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                {t.personalNote ? 'Notu düzenle' : 'Not ekle'}
              </button>

              {t.listingId && (
                <button
                  type="button"
                  onClick={() => onNavigate(`/ilan/${t.listingId}`)}
                  className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-3 text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  İlanı aç
                </button>
              )}

              <button
                type="button"
                onClick={() => sil(t)}
                disabled={islemde === t.id}
                aria-label="Takip kaydını sil"
                className="ml-auto inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-3 text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {t.personalNote && acikNot !== t.id && (
              <p className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-700">
                {t.personalNote}
              </p>
            )}

            {acikNot === t.id && (
              <div className="mt-2 space-y-2">
                <label className="sr-only" htmlFor={`not-${t.id}`}>
                  Kişisel not
                </label>
                <textarea
                  id={`not-${t.id}`}
                  rows={3}
                  value={notlar[t.id] ?? t.personalNote ?? ''}
                  onChange={(o) => setNotlar((p) => ({ ...p, [t.id]: o.target.value }))}
                  placeholder="Kimle görüştün, ne söylendi…"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[15px] text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => notKaydet(t)}
                  disabled={islemde === t.id}
                  className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                >
                  {islemde === t.id ? 'Kaydediliyor…' : 'Notu kaydet'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
