import React from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { AutocompleteField } from '../AutocompleteField';
import { TR_DEPARTMENTS, TR_UNIVERSITIES } from '../../data/turkeyData';
import { ACIKLAMA_UZUNLUGU, AY_ADLARI, DENEYIM_SINIRI, ayAnahtari, tarihAraligi } from '../../lib/deneyim.mjs';
import { yeniKimlik } from '../../lib/profil-taslagi.mjs';
import { ODAK_HALKASI } from '../../lib/renk-token';
import { ALAN, BIRINCIL, CALISMA_TURU_ETIKET, EGITIM_DUZEYI_ETIKET, EKLE, IPUCU, KUCUK_EYLEM } from './form-siniflari';
import { Alan, AyYil, DevamKutusu, IstegeBagli, KaldirmaSorusu, YilSecimi, type BolumProps, type Taslak } from './ortak';

/*
  ÇOKLU KAYIT LİSTELERİ — deneyim, eğitim, proje, sertifika (11 Ekim 2026)

  Kayıtlar taslağın içinde düzenleniyor; her ekleme ya da değişiklik
  sunucuya gitmiyor. "Ekle" boş bir kart açıyor, "Tamam" kartı
  kapatıyor; hepsi en sonda "Tüm değişiklikleri kaydet" ile yazılıyor.
  Kaldırmadan önce soruluyor. Doğrulama hatası olan kart kapanmıyor ve
  kayıt denenince kendiliğinden açılıyor.

  Hiç doldurulmamış yeni kart kaydedilmiyor (taslaktanYama atlıyor):
  "Ekle"ye yanlışlıkla basmak bir hata üretmiyor.
*/

interface ListeProps<T extends { id: string }> {
  ogeler: T[];
  /** Kartın kimlik öneki (hata alanları `${onEk}-${id}-...`). */
  onEk: string;
  hataVar: (onEk: string) => boolean;
  ozet: (o: T) => React.ReactNode;
  form: (o: T) => React.ReactNode;
  adi: (o: T) => string;
  onEkle: () => string;
  onKaldir: (id: string) => void;
  ekleMetni: string;
  bosMetin?: string;
  sinir?: number;
  kaldirilamaz?: (o: T) => boolean;
  /** Kaldırılamayan kartın üstündeki küçük etiket (ana okul). */
  rozet?: (o: T) => string | null;
  /** Ekran açılırken açık başlayan kart (ör. eksik ana okul: "Üniversiteni ekle" alana odaklanabilsin). */
  acikBaslat?: (o: T) => boolean;
}

function KayitListesi<T extends { id: string }>({
  ogeler,
  onEk,
  hataVar,
  ozet,
  form,
  adi,
  onEkle,
  onKaldir,
  ekleMetni,
  bosMetin,
  sinir,
  kaldirilamaz,
  rozet,
  acikBaslat,
}: ListeProps<T>) {
  const [acik, setAcik] = React.useState<Set<string>>(
    () => new Set(acikBaslat ? ogeler.filter(acikBaslat).map((o) => o.id) : []),
  );
  const [silinecek, setSilinecek] = React.useState<string | null>(null);
  const ac = (id: string) => setAcik((o) => new Set(o).add(id));
  const kapat = (id: string) =>
    setAcik((o) => {
      const y = new Set(o);
      y.delete(id);
      return y;
    });

  return (
    <div className="space-y-3">
      {ogeler.length > 0 && (
        <ul className="space-y-2">
          {ogeler.map((o) => {
            const hatali = hataVar(`${onEk}-${o.id}-`);
            const duzenleniyor = acik.has(o.id) || hatali;
            const etiket = rozet?.(o);
            return (
              <li
                key={o.id}
                data-kayit={`${onEk}-${o.id}`}
                className={`rounded-xl border p-3 ${duzenleniyor ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'} ${hatali ? 'border-rose-300' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {etiket && (
                      <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">{etiket}</p>
                    )}
                    {ozet(o)}
                  </div>
                  {!duzenleniyor && (
                    <button
                      type="button"
                      onClick={() => ac(o.id)}
                      aria-label={`${adi(o) || 'Kaydı'} düzenle`}
                      className={KUCUK_EYLEM}
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                    </button>
                  )}
                  {!kaldirilamaz?.(o) && (
                    <button
                      type="button"
                      onClick={() => setSilinecek(o.id)}
                      aria-label={`${adi(o) || 'Kaydı'} kaldır`}
                      className={`${KUCUK_EYLEM} hover:text-rose-700`}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {silinecek === o.id && (
                  <KaldirmaSorusu
                    soru={`${adi(o) ? `“${adi(o)}”` : 'Bu kayıt'} kaldırılsın mı?`}
                    onKaldir={() => {
                      setSilinecek(null);
                      kapat(o.id);
                      onKaldir(o.id);
                    }}
                    onVazgec={() => setSilinecek(null)}
                  />
                )}
                {duzenleniyor && (
                  <div className="mt-3 space-y-4 border-t border-gray-100 pt-3">
                    {form(o)}
                    <button
                      type="button"
                      onClick={() => kapat(o.id)}
                      disabled={hatali}
                      className={`${BIRINCIL} w-full sm:w-auto`}
                    >
                      Tamam
                    </button>
                    {hatali && <p className={IPUCU}>Kartı kapatmak için işaretli alanı düzelt.</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {(sinir === undefined || ogeler.length < sinir) && (
        <button
          type="button"
          onClick={() => {
            const id = onEkle();
            ac(id);
            requestAnimationFrame(() =>
              document.querySelector<HTMLElement>(`[data-kayit="${onEk}-${id}"] :is(input, select, textarea)`)?.focus(),
            );
          }}
          className={EKLE}
        >
          <Plus aria-hidden className="h-4 w-4" /> {ekleMetni}
        </button>
      )}
      {sinir !== undefined && ogeler.length >= sinir && (
        <p className={IPUCU}>En fazla {sinir} kayıt eklenebilir; yenisi için birini kaldır.</p>
      )}
      {ogeler.length === 0 && bosMetin && <p className={IPUCU}>{bosMetin}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- DENEYİM */

type DeneyimFormu = Taslak['deneyimler'][number];

export const DeneyimListesi: React.FC<BolumProps> = ({ t, degistir, hata, hataVar }) => {
  const yaz = (id: string, yama: Partial<DeneyimFormu>) =>
    degistir((o) => ({ ...o, deneyimler: o.deneyimler.map((d) => (d.id === id ? { ...d, ...yama } : d)) }));
  return (
    <KayitListesi<DeneyimFormu>
      ogeler={t.deneyimler}
      onEk="deneyim"
      hataVar={hataVar}
      adi={(d) => d.position.trim()}
      ekleMetni="Deneyim ekle"
      bosMetin="Deneyimin yoksa bu bölümü boş bırakabilirsin; profilin yine tamamlanır."
      sinir={DENEYIM_SINIRI}
      onEkle={() => {
        const id = yeniKimlik('deneyim');
        degistir((o) => ({
          ...o,
          deneyimler: [
            ...o.deneyimler,
            { id, position: '', organization: '', employmentType: '', startMonth: '', startYear: '', endMonth: '', endYear: '', ongoing: false, description: '' },
          ],
        }));
        return id;
      }}
      onKaldir={(id) => degistir((o) => ({ ...o, deneyimler: o.deneyimler.filter((d) => d.id !== id) }))}
      ozet={(d) => {
        const kayit = ayAnahtari(d.startYear, d.startMonth)
          ? tarihAraligi({
              baslangic: ayAnahtari(d.startYear, d.startMonth),
              bitis: d.ongoing ? null : ayAnahtari(d.endYear, d.endMonth),
              devam: d.ongoing,
            })
          : '';
        return (
          <>
            <p className="break-words text-sm font-bold text-gray-900">{d.position.trim() || 'Yeni deneyim'}</p>
            <p className="break-words text-sm text-gray-700">
              {[d.organization.trim(), CALISMA_TURU_ETIKET[d.employmentType], kayit].filter(Boolean).join(' · ')}
            </p>
          </>
        );
      }}
      form={(d) => {
        const on = `deneyim-${d.id}`;
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Alan id={`${on}-pozisyon`} etiket="Pozisyon" hata={hata(`${on}-pozisyon`)}>
                <input
                  id={`${on}-pozisyon`}
                  type="text"
                  maxLength={120}
                  aria-invalid={Boolean(hata(`${on}-pozisyon`)) || undefined}
                  value={d.position}
                  onChange={(e) => yaz(d.id, { position: e.target.value })}
                  placeholder="Örn. Satış danışmanı"
                  className={ALAN}
                />
              </Alan>
              <Alan id={`${on}-kurum`} etiket="Şirket adı" hata={hata(`${on}-kurum`)}>
                <input
                  id={`${on}-kurum`}
                  type="text"
                  maxLength={120}
                  aria-invalid={Boolean(hata(`${on}-kurum`)) || undefined}
                  value={d.organization}
                  onChange={(e) => yaz(d.id, { organization: e.target.value })}
                  placeholder="Şirket veya kurum"
                  className={ALAN}
                />
              </Alan>
            </div>
            <Alan id={`${on}-tur`} etiket={<>Çalışma türü <IstegeBagli /></>} className="sm:w-1/2">
              <select
                id={`${on}-tur`}
                value={d.employmentType}
                onChange={(e) => yaz(d.id, { employmentType: e.target.value })}
                className={ALAN}
              >
                <option value="">Seç</option>
                {Object.entries(CALISMA_TURU_ETIKET).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Alan>
            <div className="grid gap-4 sm:grid-cols-2">
              <AyYil
                idOnEki={`${on}-bas`}
                etiket="Başlangıç"
                ay={d.startMonth}
                yil={d.startYear}
                onAy={(v) => yaz(d.id, { startMonth: v })}
                onYil={(v) => yaz(d.id, { startYear: v })}
                hata={hata(`${on}-bas-ay`)}
              />
              <AyYil
                idOnEki={`${on}-bit`}
                etiket="Bitiş"
                ay={d.ongoing ? '' : d.endMonth}
                yil={d.ongoing ? '' : d.endYear}
                onAy={(v) => yaz(d.id, { endMonth: v })}
                onYil={(v) => yaz(d.id, { endYear: v })}
                disabled={d.ongoing}
                hata={hata(`${on}-bit-ay`)}
              />
            </div>
            <DevamKutusu
              metin="Hâlen çalışıyorum"
              isaretli={d.ongoing}
              onDegis={(v) => yaz(d.id, v ? { ongoing: true, endMonth: '', endYear: '' } : { ongoing: false })}
            />
            <Alan
              id={`${on}-aciklama`}
              etiket={<>Görevler ve sorumluluklar <IstegeBagli /></>}
              hata={hata(`${on}-aciklama`)}
              ipucu="Her görevi ayrı satıra yaz; CV’de madde olarak görünür."
            >
              <textarea
                id={`${on}-aciklama`}
                rows={4}
                maxLength={ACIKLAMA_UZUNLUGU}
                value={d.description}
                onChange={(e) => yaz(d.id, { description: e.target.value })}
                placeholder={'Müşteri ilişkilerini yürüttüm.\nStok takibine destek oldum.'}
                className={`${ALAN} py-2.5`}
              />
            </Alan>
          </>
        );
      }}
    />
  );
};

/* -------------------------------------------------------------- EĞİTİM */

type EgitimFormu = Taslak['egitimler'][number];
const SINIFLAR = ['1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', 'Yüksek Lisans / Mezun'];

export const EgitimListesi: React.FC<BolumProps> = ({ t, degistir, hata, hataVar }) => {
  const yaz = (id: string, yama: Partial<EgitimFormu>) =>
    degistir((o) => ({ ...o, egitimler: o.egitimler.map((e) => (e.id === id ? { ...e, ...yama } : e)) }));
  /* Ana okul alan kimlikleri değişmedi: Kampüsüm'ün "Üniversiteni ekle"si `universite`e odaklanıyor. */
  const kimlik = (e: EgitimFormu, alan: string) =>
    e.ana
      ? ({ okul: 'universite', bolum: 'bolum', duzey: 'egitim-duzeyi', bas: 'baslangic-yili', son: 'mezuniyet-yili', gpa: 'gpa', sinif: 'sinif' } as Record<string, string>)[alan]
      : `egitim-${e.id}-${alan}`;
  return (
    <KayitListesi<EgitimFormu>
      ogeler={t.egitimler}
      onEk="egitim"
      hataVar={(onEk) => hataVar(onEk) || (onEk === 'egitim-ana-' && ['universite', 'mezuniyet-yili', 'gpa'].some((k) => hataVar(k)))}
      adi={(e) => e.okul.trim()}
      ekleMetni="Eğitim ekle"
      sinir={31}
      kaldirilamaz={(e) => e.ana}
      rozet={(e) => (e.ana ? 'Ana okulun' : null)}
      acikBaslat={(e) => e.ana && (!e.okul.trim() || !e.bolum.trim() || !e.duzey || !e.basYil)}
      onEkle={() => {
        const id = yeniKimlik('egitim');
        degistir((o) => ({
          ...o,
          egitimler: [...o.egitimler, { id, ana: false, okul: '', bolum: '', duzey: '', basYil: '', sonYil: '', suruyor: false, gpa: '', sinif: '' }],
        }));
        return id;
      }}
      onKaldir={(id) => degistir((o) => ({ ...o, egitimler: o.egitimler.filter((e) => e.id !== id) }))}
      ozet={(e) => (
        <>
          <p className="break-words text-sm font-bold text-gray-900">{e.okul.trim() || (e.ana ? 'Okulunu ekle' : 'Yeni eğitim')}</p>
          <p className="break-words text-sm text-gray-700">
            {[
              e.bolum.trim(),
              EGITIM_DUZEYI_ETIKET[e.duzey],
              [e.basYil, e.suruyor ? 'Devam ediyor' : e.sonYil].filter(Boolean).join(' – '),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      )}
      form={(e) => (
        <>
          {e.ana && (
            <p className={IPUCU}>Ana okulun profilinde, eşleşmelerde ve Kampüsüm’de kullanılır.</p>
          )}
          <Alan id={kimlik(e, 'okul')} etiket="Okul / üniversite" hata={hata(kimlik(e, 'okul'))}>
            <AutocompleteField
              id={kimlik(e, 'okul')}
              value={e.okul}
              onChange={(v) => yaz(e.id, { okul: v })}
              options={TR_UNIVERSITIES}
              placeholder="Yazmaya başla, listeden seç"
              className={ALAN}
              klavyeDuzeni
            />
          </Alan>
          <Alan id={kimlik(e, 'bolum')} etiket="Bölüm / program" hata={hata(kimlik(e, 'bolum'))}>
            <AutocompleteField
              id={kimlik(e, 'bolum')}
              value={e.bolum}
              onChange={(v) => yaz(e.id, { bolum: v })}
              options={TR_DEPARTMENTS}
              placeholder="Örn. Giyim Üretim Teknolojisi"
              className={ALAN}
              klavyeDuzeni
            />
          </Alan>
          <div className="grid grid-cols-2 gap-4">
            <Alan id={kimlik(e, 'duzey')} etiket="Eğitim düzeyi">
              <select
                id={kimlik(e, 'duzey')}
                value={e.duzey}
                onChange={(ev) => yaz(e.id, { duzey: ev.target.value })}
                className={ALAN}
              >
                <option value="">Seç</option>
                {Object.entries(EGITIM_DUZEYI_ETIKET).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Alan>
            {e.ana ? (
              <Alan id="sinif" etiket="Sınıf">
                <select id="sinif" value={e.sinif} onChange={(ev) => yaz(e.id, { sinif: ev.target.value })} className={ALAN}>
                  {!e.sinif && <option value="">Seç</option>}
                  {SINIFLAR.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Alan>
            ) : (
              <span aria-hidden />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Alan id={kimlik(e, 'bas')} etiket="Başlangıç yılı">
              <YilSecimi id={kimlik(e, 'bas')} deger={e.basYil} onDegis={(v) => yaz(e.id, { basYil: v })} />
            </Alan>
            <Alan id={kimlik(e, 'son')} etiket="Mezuniyet yılı" hata={hata(kimlik(e, 'son'))}>
              <YilSecimi
                id={kimlik(e, 'son')}
                deger={e.suruyor ? '' : e.sonYil}
                bosMetin={e.suruyor ? 'Devam ediyor' : 'Seç'}
                disabled={e.suruyor}
                hatali={Boolean(hata(kimlik(e, 'son')))}
                onDegis={(v) => yaz(e.id, { sonYil: v })}
              />
            </Alan>
          </div>
          <DevamKutusu isaretli={e.suruyor} onDegis={(v) => yaz(e.id, v ? { suruyor: true, sonYil: '' } : { suruyor: false })} />
          <Alan
            id={kimlik(e, 'gpa')}
            etiket={<>Not ortalaması <IstegeBagli /></>}
            hata={hata(kimlik(e, 'gpa'))}
            ipucu={e.ana ? '4’lük sistemde (ör. 3,10).' : '4’lük ya da 100’lük sistemde.'}
            className="sm:w-1/2"
          >
            <input
              id={kimlik(e, 'gpa')}
              type="text"
              inputMode="decimal"
              aria-invalid={Boolean(hata(kimlik(e, 'gpa'))) || undefined}
              value={e.gpa}
              onChange={(ev) => yaz(e.id, { gpa: ev.target.value })}
              placeholder={e.ana ? '3,10' : '85'}
              className={ALAN}
            />
          </Alan>
        </>
      )}
    />
  );
};

/* -------------------------------------------------------------- PROJE */

type ProjeFormu = Taslak['projeler'][number];

export const ProjeListesi: React.FC<BolumProps> = ({ t, degistir, hata, hataVar }) => {
  const yaz = (id: string, yama: Partial<ProjeFormu>) =>
    degistir((o) => ({ ...o, projeler: o.projeler.map((p) => (p.id === id ? { ...p, ...yama } : p)) }));
  return (
    <KayitListesi<ProjeFormu>
      ogeler={t.projeler}
      onEk="proje"
      hataVar={hataVar}
      adi={(p) => p.baslik.trim()}
      ekleMetni="Proje ekle"
      bosMetin="Okul, kulüp ya da kişisel projelerini ekleyebilirsin. İsteğe bağlı."
      onEkle={() => {
        const id = yeniKimlik('proje');
        degistir((o) => ({
          ...o,
          projeler: [...o.projeler, { id, baslik: '', aciklama: '', araclar: '', adres: '', basYil: '', sonYil: '', suruyor: false }],
        }));
        return id;
      }}
      onKaldir={(id) => degistir((o) => ({ ...o, projeler: o.projeler.filter((p) => p.id !== id) }))}
      ozet={(p) => (
        <>
          <p className="flex items-center gap-1.5 break-words text-sm font-bold text-gray-900">
            {p.baslik.trim() || 'Yeni proje'}
            {p.adres.trim() && (
              <a
                href={/^https?:\/\//i.test(p.adres.trim()) ? p.adres.trim() : `https://${p.adres.trim()}`}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${p.baslik} bağlantısını aç`}
                className={`text-gray-500 hover:text-blue-700 ${ODAK_HALKASI}`}
              >
                <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </a>
            )}
          </p>
          <p className="break-words text-sm text-gray-700">
            {[p.araclar.split(',').map((x) => x.trim()).filter(Boolean).join(' · '), [p.basYil, p.suruyor ? 'Devam ediyor' : p.sonYil].filter(Boolean).join(' – ')]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      )}
      form={(p) => {
        const on = `proje-${p.id}`;
        return (
          <>
            <Alan id={`${on}-baslik`} etiket="Proje adı" hata={hata(`${on}-baslik`)}>
              <input
                id={`${on}-baslik`}
                aria-invalid={Boolean(hata(`${on}-baslik`)) || undefined}
                value={p.baslik}
                onChange={(e) => yaz(p.id, { baslik: e.target.value })}
                placeholder="Örn. Moda koleksiyonu tasarımı"
                className={ALAN}
              />
            </Alan>
            <Alan id={`${on}-aciklama`} etiket={<>Açıklama <IstegeBagli /></>}>
              <textarea
                id={`${on}-aciklama`}
                rows={3}
                value={p.aciklama}
                onChange={(e) => yaz(p.id, { aciklama: e.target.value })}
                className={`${ALAN} py-2.5`}
              />
            </Alan>
            <div className="grid gap-4 sm:grid-cols-2">
              <Alan id={`${on}-araclar`} etiket={<>Kullanılan teknolojiler / yetenekler <IstegeBagli /></>} ipucu="Virgülle ayır.">
                <input
                  id={`${on}-araclar`}
                  value={p.araclar}
                  onChange={(e) => yaz(p.id, { araclar: e.target.value })}
                  placeholder="Kalıp, Teknik çizim"
                  className={ALAN}
                />
              </Alan>
              <Alan id={`${on}-adres`} etiket={<>Proje bağlantısı <IstegeBagli /></>} hata={hata(`${on}-adres`)}>
                <input
                  id={`${on}-adres`}
                  type="url"
                  inputMode="url"
                  aria-invalid={Boolean(hata(`${on}-adres`)) || undefined}
                  value={p.adres}
                  onChange={(e) => yaz(p.id, { adres: e.target.value })}
                  placeholder="ornek.com/proje"
                  className={ALAN}
                />
              </Alan>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Alan id={`${on}-bas`} etiket={<>Başlangıç <IstegeBagli /></>}>
                <YilSecimi id={`${on}-bas`} deger={p.basYil} onDegis={(v) => yaz(p.id, { basYil: v })} />
              </Alan>
              <Alan id={`${on}-son`} etiket="Bitiş" hata={hata(`${on}-son`)}>
                <YilSecimi
                  id={`${on}-son`}
                  deger={p.suruyor ? '' : p.sonYil}
                  bosMetin={p.suruyor ? 'Devam ediyor' : 'Seç'}
                  disabled={p.suruyor}
                  hatali={Boolean(hata(`${on}-son`))}
                  onDegis={(v) => yaz(p.id, { sonYil: v })}
                />
              </Alan>
            </div>
            <DevamKutusu metin="Devam ediyor" isaretli={p.suruyor} onDegis={(v) => yaz(p.id, v ? { suruyor: true, sonYil: '' } : { suruyor: false })} />
          </>
        );
      }}
    />
  );
};

/* ---------------------------------------------------------- SERTİFİKA */

type SertifikaFormu = Taslak['sertifikalar'][number];

export const SertifikaListesi: React.FC<BolumProps> = ({ t, degistir, hata, hataVar }) => {
  const yaz = (id: string, yama: Partial<SertifikaFormu>) =>
    degistir((o) => ({ ...o, sertifikalar: o.sertifikalar.map((c) => (c.id === id ? { ...c, ...yama } : c)) }));
  return (
    <KayitListesi<SertifikaFormu>
      ogeler={t.sertifikalar}
      onEk="sertifika"
      hataVar={hataVar}
      adi={(c) => c.ad.trim()}
      ekleMetni="Sertifika ekle"
      bosMetin="Aldığın eğitimleri ve sertifikaları ekleyebilirsin. İsteğe bağlı."
      sinir={30}
      onEkle={() => {
        const id = yeniKimlik('sertifika');
        degistir((o) => ({ ...o, sertifikalar: [...o.sertifikalar, { id, ad: '', kurum: '', yil: '', ay: '', url: '' }] }));
        return id;
      }}
      onKaldir={(id) => degistir((o) => ({ ...o, sertifikalar: o.sertifikalar.filter((c) => c.id !== id) }))}
      ozet={(c) => (
        <>
          <p className="break-words text-sm font-bold text-gray-900">{c.ad.trim() || 'Yeni sertifika'}</p>
          <p className="break-words text-sm text-gray-700">
            {[c.kurum.trim(), c.yil ? (c.ay ? `${AY_ADLARI[Number(c.ay) - 1]} ${c.yil}` : c.yil) : ''].filter(Boolean).join(' · ')}
          </p>
        </>
      )}
      form={(c) => {
        const on = `sertifika-${c.id}`;
        return (
          <>
            <Alan id={`${on}-ad`} etiket="Sertifika adı" hata={hata(`${on}-ad`)}>
              <input
                id={`${on}-ad`}
                aria-invalid={Boolean(hata(`${on}-ad`)) || undefined}
                value={c.ad}
                onChange={(e) => yaz(c.id, { ad: e.target.value })}
                placeholder="Örn. Girişimcilik eğitimi"
                className={ALAN}
              />
            </Alan>
            <Alan id={`${on}-kurum`} etiket={<>Veren kurum <IstegeBagli /></>}>
              <input id={`${on}-kurum`} value={c.kurum} onChange={(e) => yaz(c.id, { kurum: e.target.value })} className={ALAN} />
            </Alan>
            <div className="grid grid-cols-2 gap-4">
              <Alan id={`${on}-ay`} etiket={<>Ay <IstegeBagli /></>}>
                <select id={`${on}-ay`} value={c.ay} onChange={(e) => yaz(c.id, { ay: e.target.value })} className={ALAN}>
                  <option value="">Seç</option>
                  {AY_ADLARI.map((ad: string, i: number) => (
                    <option key={ad} value={String(i + 1)}>
                      {ad}
                    </option>
                  ))}
                </select>
              </Alan>
              <Alan id={`${on}-yil`} etiket={<>Alınma yılı <IstegeBagli /></>} hata={hata(`${on}-yil`)}>
                <YilSecimi id={`${on}-yil`} deger={c.yil} hatali={Boolean(hata(`${on}-yil`))} onDegis={(v) => yaz(c.id, { yil: v })} />
              </Alan>
            </div>
            <Alan id={`${on}-url`} etiket={<>Doğrulama bağlantısı <IstegeBagli /></>} hata={hata(`${on}-url`)}>
              <input
                id={`${on}-url`}
                type="url"
                inputMode="url"
                aria-invalid={Boolean(hata(`${on}-url`)) || undefined}
                value={c.url}
                onChange={(e) => yaz(c.id, { url: e.target.value })}
                placeholder="ornek.com/dogrula/123"
                className={ALAN}
              />
            </Alan>
          </>
        );
      }}
    />
  );
};
