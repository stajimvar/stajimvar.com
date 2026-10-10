import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { EgitimDuzeyi, StudentEducation } from '../../types';
import { AutocompleteField } from '../AutocompleteField';
import { TR_DEPARTMENTS, TR_UNIVERSITIES } from '../../data/turkeyData';
import {
  ALAN,
  BIRINCIL,
  EGITIM_DUZEYI_ETIKET,
  EKLE,
  ETIKET,
  HATA,
  IKINCIL,
  IPUCU,
  KUCUK_EYLEM,
  YILLAR,
} from './form-siniflari';

/**
 * EK EĞİTİMLER — önceki okul, yüksek lisans, değişim programı…
 *
 * Birincil eğitim (okul, bölüm, sınıf) üstteki formda ve sitenin her
 * yerinde okunuyor; burası yalnız EK kayıtlar (20261206010000). Liste
 * boş bırakılabilir — kimseye "ikinci okul" zorunluluğu yok.
 *
 * Kayıt tek parça: liste değişince tamamı kaydediliyor (deneyimlerle aynı
 * sil-yeniden-yaz kalıbı). Başarısız kayıtta form açık kalıyor, yazılan
 * kaybolmuyor.
 */

interface Taslak {
  school: string;
  department: string;
  level: string;
  startYear: string;
  endYear: string;
  ongoing: boolean;
  gpa: string;
}

const bos: Taslak = { school: '', department: '', level: '', startYear: '', endYear: '', ongoing: false, gpa: '' };

const taslaga = (e: StudentEducation): Taslak => ({
  school: e.school,
  department: e.department,
  level: e.level ?? '',
  startYear: e.startYear ? String(e.startYear) : '',
  endYear: e.endYear ? String(e.endYear) : '',
  ongoing: e.ongoing,
  gpa: e.gpa != null ? String(e.gpa).replace('.', ',') : '',
});

export const egitimTarihi = (e: Pick<StudentEducation, 'startYear' | 'endYear' | 'ongoing'>) => {
  const bas = e.startYear ? String(e.startYear) : '';
  const son = e.ongoing ? 'Devam ediyor' : e.endYear ? String(e.endYear) : '';
  return bas && son ? `${bas} – ${son}` : bas || son;
};

export const EkEgitimler: React.FC<{
  kayitlar: StudentEducation[];
  onKaydet: (yeni: StudentEducation[]) => Promise<boolean>;
  kilitli?: boolean;
}> = ({ kayitlar, onKaydet, kilitli = false }) => {
  const [form, setForm] = React.useState<{ id: string | null; taslak: Taslak } | null>(null);
  const [hata, setHata] = React.useState<{ alan: keyof Taslak; mesaj: string } | null>(null);
  const [silinecek, setSilinecek] = React.useState<string | null>(null);

  const degis = <K extends keyof Taslak>(alan: K, deger: Taslak[K]) => {
    if (!form) return;
    setForm({ ...form, taslak: { ...form.taslak, [alan]: deger } });
    if (hata?.alan === alan) setHata(null);
  };

  const kaydet = async () => {
    if (!form) return;
    const t = form.taslak;
    const okul = t.school.trim();
    if (!okul) return setHata({ alan: 'school', mesaj: 'Okul adını yaz.' });
    const bas = t.startYear ? Number(t.startYear) : null;
    const son = t.ongoing ? null : t.endYear ? Number(t.endYear) : null;
    if (bas && son && son < bas) return setHata({ alan: 'endYear', mesaj: 'Bitiş yılı başlangıçtan önce olamaz.' });
    const gpaMetni = t.gpa.trim().replace(',', '.');
    const gpa = gpaMetni ? Number(gpaMetni) : null;
    if (gpa != null && (!Number.isFinite(gpa) || gpa < 0 || gpa > 100)) {
      return setHata({ alan: 'gpa', mesaj: '4’lük ya da 100’lük ölçekte bir sayı yaz.' });
    }
    const kayit: StudentEducation = {
      id: form.id ?? `egitim-${Date.now()}`,
      school: okul,
      department: t.department.trim(),
      level: (t.level || null) as EgitimDuzeyi | null,
      startYear: bas,
      endYear: son,
      ongoing: t.ongoing,
      gpa,
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
      <div>
        <h3 className="text-sm font-bold text-gray-900">Diğer eğitimler</h3>
        <p className={IPUCU}>Önceki okulun, yüksek lisansın ya da değişim programın varsa ekle. Boş bırakabilirsin.</p>
      </div>

      {kayitlar.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {kayitlar.map((k) => (
            <li key={k.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-gray-900">{k.school}</p>
                <p className="break-words text-sm text-gray-600">
                  {[k.department, k.level ? EGITIM_DUZEYI_ETIKET[k.level] : null].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-gray-500">
                  {[egitimTarihi(k), k.gpa != null ? `Not ortalaması: ${String(k.gpa).replace('.', ',')}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
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
                    aria-label={`${k.school} düzenle`}
                    onClick={() => {
                      setForm({ id: k.id, taslak: taslaga(k) });
                      setHata(null);
                    }}
                    className={KUCUK_EYLEM}
                  >
                    <Pencil aria-hidden className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label={`${k.school} sil`} onClick={() => setSilinecek(k.id)} className={KUCUK_EYLEM}>
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
            <label className={ETIKET} htmlFor="ek-egitim-okul">
              Okul
            </label>
            <AutocompleteField
              id="ek-egitim-okul"
              value={form.taslak.school}
              onChange={(v) => degis('school', v)}
              options={TR_UNIVERSITIES}
              placeholder="Üniversite, lise ya da kurum"
              className={ALAN}
              klavyeDuzeni
            />
            {hata?.alan === 'school' && <p role="alert" className={HATA}>{hata.mesaj}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ETIKET} htmlFor="ek-egitim-bolum">
                Bölüm <span className="font-normal text-gray-600">(isteğe bağlı)</span>
              </label>
              <AutocompleteField
                id="ek-egitim-bolum"
                value={form.taslak.department}
                onChange={(v) => degis('department', v)}
                options={TR_DEPARTMENTS}
                placeholder="Bölüm ya da alan"
                className={ALAN}
                klavyeDuzeni
              />
            </div>
            <div>
              <label className={ETIKET} htmlFor="ek-egitim-duzey">
                Eğitim düzeyi
              </label>
              <select
                id="ek-egitim-duzey"
                value={form.taslak.level}
                onChange={(e) => degis('level', e.target.value)}
                className={ALAN}
              >
                <option value="">Seç</option>
                {Object.entries(EGITIM_DUZEYI_ETIKET).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ETIKET} htmlFor="ek-egitim-bas">
                Başlangıç yılı
              </label>
              <select id="ek-egitim-bas" value={form.taslak.startYear} onChange={(e) => degis('startYear', e.target.value)} className={ALAN}>
                <option value="">Seç</option>
                {YILLAR.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ETIKET} htmlFor="ek-egitim-son">
                Bitiş yılı
              </label>
              <select
                id="ek-egitim-son"
                value={form.taslak.ongoing ? '' : form.taslak.endYear}
                disabled={form.taslak.ongoing}
                onChange={(e) => degis('endYear', e.target.value)}
                aria-invalid={hata?.alan === 'endYear' || undefined}
                className={`${ALAN} disabled:bg-gray-100 disabled:text-gray-500`}
              >
                <option value="">{form.taslak.ongoing ? 'Devam ediyor' : 'Seç'}</option>
                {YILLAR.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {hata?.alan === 'endYear' && <p role="alert" className={HATA}>{hata.mesaj}</p>}
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-gray-900">
            <input
              type="checkbox"
              checked={form.taslak.ongoing}
              onChange={(e) => degis('ongoing', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            Devam ediyorum
          </label>
          <div className="sm:w-1/2">
            <label className={ETIKET} htmlFor="ek-egitim-gpa">
              Not ortalaması <span className="font-normal text-gray-600">(isteğe bağlı)</span>
            </label>
            <input
              id="ek-egitim-gpa"
              type="text"
              inputMode="decimal"
              value={form.taslak.gpa}
              onChange={(e) => degis('gpa', e.target.value)}
              aria-invalid={hata?.alan === 'gpa' || undefined}
              placeholder="3,25"
              className={ALAN}
            />
            {hata?.alan === 'gpa' && <p role="alert" className={HATA}>{hata.mesaj}</p>}
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
          Eğitim ekle
        </button>
      )}
    </div>
  );
};
