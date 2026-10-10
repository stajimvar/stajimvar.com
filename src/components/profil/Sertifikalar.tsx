import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { StudentCertificate } from '../../types';
import { ALAN, BIRINCIL, EKLE, ETIKET, HATA, IKINCIL, IPUCU, KUCUK_EYLEM, YILLAR } from './form-siniflari';

/**
 * SERTİFİKALAR (20261206010000) — ek eğitimlerle aynı kalıp.
 *
 * Doğrulama bağlantısı isteğe bağlı ve yalnız http(s): sunucu da aynı
 * kuralı uyguluyor. `javascript:` gibi bir adres CV'de tıklanabilir olurdu.
 */

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

interface Taslak {
  name: string;
  issuer: string;
  issueYear: string;
  issueMonth: string;
  url: string;
}

const bos: Taslak = { name: '', issuer: '', issueYear: '', issueMonth: '', url: '' };

const taslaga = (c: StudentCertificate): Taslak => ({
  name: c.name,
  issuer: c.issuer,
  issueYear: c.issueYear ? String(c.issueYear) : '',
  issueMonth: c.issueMonth ? String(c.issueMonth) : '',
  url: c.url,
});

/** "https://" yazılmadan girilen adrese şema ekleniyor; başka bir şema kabul edilmiyor. */
export const sertifikaAdresi = (ham: string): string | null => {
  const t = ham.trim();
  if (!t) return '';
  const tam = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  if (!/^https?:\/\//i.test(tam)) return null;
  try {
    const u = new URL(tam);
    return u.hostname.includes('.') ? tam : null;
  } catch {
    return null;
  }
};

export const sertifikaTarihi = (c: Pick<StudentCertificate, 'issueYear' | 'issueMonth'>) =>
  c.issueYear ? (c.issueMonth ? `${AYLAR[c.issueMonth - 1]} ${c.issueYear}` : String(c.issueYear)) : '';

export const Sertifikalar: React.FC<{
  kayitlar: StudentCertificate[];
  onKaydet: (yeni: StudentCertificate[]) => Promise<boolean>;
  kilitli?: boolean;
}> = ({ kayitlar, onKaydet, kilitli = false }) => {
  const [form, setForm] = React.useState<{ id: string | null; taslak: Taslak } | null>(null);
  const [hata, setHata] = React.useState<{ alan: keyof Taslak; mesaj: string } | null>(null);
  const [silinecek, setSilinecek] = React.useState<string | null>(null);

  const degis = (alan: keyof Taslak, deger: string) => {
    if (!form) return;
    setForm({ ...form, taslak: { ...form.taslak, [alan]: deger } });
    if (hata?.alan === alan) setHata(null);
  };

  const kaydet = async () => {
    if (!form) return;
    const t = form.taslak;
    const ad = t.name.trim();
    if (!ad) return setHata({ alan: 'name', mesaj: 'Sertifikanın adını yaz.' });
    const adres = sertifikaAdresi(t.url);
    if (adres === null) return setHata({ alan: 'url', mesaj: 'Geçerli bir bağlantı yaz (ör. kurum.com/dogrula/123).' });
    const kayit: StudentCertificate = {
      id: form.id ?? `sertifika-${Date.now()}`,
      name: ad,
      issuer: t.issuer.trim(),
      issueYear: t.issueYear ? Number(t.issueYear) : null,
      issueMonth: t.issueYear && t.issueMonth ? Number(t.issueMonth) : null,
      url: adres,
    };
    const yeni = form.id ? kayitlar.map((k) => (k.id === form.id ? kayit : k)) : [...kayitlar, kayit];
    if (await onKaydet(yeni)) {
      setForm(null);
      setHata(null);
    }
  };

  const sil = async (id: string) => {
    if (await onKaydet(kayitlar.filter((k) => k.id !== id))) setSilinecek(null);
  };

  return (
    <div className="space-y-3">
      <p className={IPUCU}>Aldığın eğitim ve sertifikaları ekle. Boş bırakabilirsin; CV'de boş bölüm görünmez.</p>

      {kayitlar.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {kayitlar.map((k) => (
            <li key={k.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-gray-900">{k.name}</p>
                <p className="break-words text-sm text-gray-600">
                  {[k.issuer, sertifikaTarihi(k)].filter(Boolean).join(' · ')}
                </p>
                {k.url && <p className="break-all text-xs text-blue-700">{k.url.replace(/^https?:\/\//i, '')}</p>}
              </div>
              {silinecek === k.id ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" disabled={kilitli} onClick={() => void sil(k.id)} className={`${KUCUK_EYLEM} text-rose-700`}>
                    Sil
                  </button>
                  <button type="button" onClick={() => setSilinecek(null)} className={KUCUK_EYLEM}>
                    Vazgeç
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    aria-label={`${k.name} düzenle`}
                    onClick={() => {
                      setForm({ id: k.id, taslak: taslaga(k) });
                      setHata(null);
                    }}
                    className={KUCUK_EYLEM}
                  >
                    <Pencil aria-hidden className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label={`${k.name} sil`} onClick={() => setSilinecek(k.id)} className={KUCUK_EYLEM}>
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void kaydet();
          }}
          className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4"
        >
          <div>
            <label className={ETIKET} htmlFor="sertifika-ad">
              Sertifika adı
            </label>
            <input
              id="sertifika-ad"
              value={form.taslak.name}
              onChange={(e) => degis('name', e.target.value)}
              maxLength={160}
              placeholder="Örn. Girişimcilik Eğitimi"
              aria-invalid={hata?.alan === 'name' || undefined}
              className={ALAN}
            />
            {hata?.alan === 'name' && <p role="alert" className={HATA}>{hata.mesaj}</p>}
          </div>
          <div>
            <label className={ETIKET} htmlFor="sertifika-kurum">
              Veren kurum <span className="font-normal text-gray-600">(isteğe bağlı)</span>
            </label>
            <input
              id="sertifika-kurum"
              value={form.taslak.issuer}
              onChange={(e) => degis('issuer', e.target.value)}
              maxLength={160}
              placeholder="Örn. KOSGEB"
              className={ALAN}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ETIKET} htmlFor="sertifika-yil">
                Alınma yılı
              </label>
              <select id="sertifika-yil" value={form.taslak.issueYear} onChange={(e) => degis('issueYear', e.target.value)} className={ALAN}>
                <option value="">Seç</option>
                {YILLAR.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ETIKET} htmlFor="sertifika-ay">
                Ay <span className="font-normal text-gray-600">(isteğe bağlı)</span>
              </label>
              <select
                id="sertifika-ay"
                value={form.taslak.issueMonth}
                disabled={!form.taslak.issueYear}
                onChange={(e) => degis('issueMonth', e.target.value)}
                className={`${ALAN} disabled:bg-gray-100 disabled:text-gray-500`}
              >
                <option value="">Seç</option>
                {AYLAR.map((a, i) => (
                  <option key={a} value={i + 1}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={ETIKET} htmlFor="sertifika-adres">
              Doğrulama bağlantısı <span className="font-normal text-gray-600">(isteğe bağlı)</span>
            </label>
            <input
              id="sertifika-adres"
              type="url"
              inputMode="url"
              value={form.taslak.url}
              onChange={(e) => degis('url', e.target.value)}
              placeholder="kurum.com/dogrula/123"
              aria-invalid={hata?.alan === 'url' || undefined}
              className={ALAN}
            />
            {hata?.alan === 'url' && <p role="alert" className={HATA}>{hata.mesaj}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={kilitli} className={BIRINCIL}>
              {form.id ? 'Güncelle' : 'Ekle'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setHata(null);
              }}
              className={IKINCIL}
            >
              Vazgeç
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setForm({ id: null, taslak: bos });
            setHata(null);
          }}
          className={EKLE}
        >
          <Plus aria-hidden className="h-4 w-4" />
          Sertifika ekle
        </button>
      )}
    </div>
  );
};
