import React from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { AutocompleteField } from '../AutocompleteField';
import { LANGUAGES_DICTIONARY } from '../../data/skillsDictionary';
import { ILGI_ALANLARI, YETENEK_GRUPLARI } from '../../data/cv-secenekleri';
import { DIL_SEVIYELERI, ILGI_SINIRI, dilSeviyeEtiketi, yeniKimlik } from '../../lib/profil-taslagi.mjs';
import { ALAN, EKLE, HATA, IPUCU, KUCUK_EYLEM } from './form-siniflari';
import { EtiketSecici } from './EtiketSecici';
import type { BolumProps } from './ortak';

/*
  DİLLER (11 Ekim 2026)

  Dil aranabilir listeden seçiliyor (listede olmayan da yazılabiliyor);
  seviye altı basamaklı tek ölçek: Başlangıç, Temel, Orta, İyi, İleri,
  Ana dil. Eski kayıtların seviyesi korunuyor (C2 gibi). Testle
  doğrulanmış dilin seviyesi değiştirilemiyor — doğrulama o seviye için.
*/
const DIL_ADLARI = LANGUAGES_DICTIONARY.map((d) => d.name);

export const DilListesi: React.FC<BolumProps> = ({ t, degistir, hata }) => {
  const yaz = (id: string, yama: Partial<(typeof t.diller)[number]>) =>
    degistir((o) => ({ ...o, diller: o.diller.map((l) => (l.id === id ? { ...l, ...yama } : l)) }));
  const ekle = () => {
    const id = yeniKimlik('dil');
    degistir((o) => ({ ...o, diller: [...o.diller, { id, ad: '', seviye: '', dogrulandi: false }] }));
    requestAnimationFrame(() => document.getElementById(`dil-${id}-ad`)?.focus());
  };
  return (
    <div className="space-y-3">
      {t.diller.length > 0 && (
        <ul className="space-y-3">
          {t.diller.map((l) => {
            const adHata = hata(`dil-${l.id}-ad`);
            const seviyeHata = hata(`dil-${l.id}-seviye`);
            const eskiSeviye = l.seviye && !DIL_SEVIYELERI.some((s: { deger: string }) => s.deger === l.seviye);
            return (
              <li key={l.id} className="rounded-xl border border-gray-200 p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto] sm:items-start">
                  <div className="min-w-0">
                    <label htmlFor={`dil-${l.id}-ad`} className="sr-only">
                      Dil
                    </label>
                    {l.dogrulandi ? (
                      <p className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-gray-900">
                        {l.ad}
                        <CheckCircle2 aria-label="Testle doğrulandı" className="h-4 w-4 text-emerald-600" />
                      </p>
                    ) : (
                      <AutocompleteField
                        id={`dil-${l.id}-ad`}
                        value={l.ad}
                        onChange={(v) => yaz(l.id, { ad: v })}
                        options={DIL_ADLARI}
                        placeholder="Dil ara (İngilizce, Almanca…)"
                        className={ALAN}
                        klavyeDuzeni
                      />
                    )}
                    {adHata && (
                      <p role="alert" className={HATA}>
                        {adHata}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`dil-${l.id}-seviye`} className="sr-only">
                      {l.ad || 'Dil'} seviyesi
                    </label>
                    <select
                      id={`dil-${l.id}-seviye`}
                      value={l.seviye}
                      disabled={l.dogrulandi}
                      aria-invalid={Boolean(seviyeHata) || undefined}
                      onChange={(e) => yaz(l.id, { seviye: e.target.value })}
                      className={`${ALAN} disabled:bg-gray-100 disabled:text-gray-600`}
                    >
                      {!l.seviye && <option value="">Seviye seç</option>}
                      {eskiSeviye && <option value={l.seviye}>{dilSeviyeEtiketi(l.seviye)}</option>}
                      {DIL_SEVIYELERI.map((s: { deger: string; etiket: string }) => (
                        <option key={s.deger} value={s.deger}>
                          {s.etiket}
                        </option>
                      ))}
                    </select>
                    {seviyeHata && (
                      <p role="alert" className={HATA}>
                        {seviyeHata}
                      </p>
                    )}
                    {l.dogrulandi && <p className={IPUCU}>Testle doğrulandı; seviye sabit.</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => degistir((o) => ({ ...o, diller: o.diller.filter((x) => x.id !== l.id) }))}
                    aria-label={`${l.ad || 'Bu dili'} kaldır`}
                    className={`${KUCUK_EYLEM} justify-self-end hover:text-rose-700`}
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={ekle} className={EKLE}>
        <Plus aria-hidden className="h-4 w-4" /> Dil ekle
      </button>
      {t.diller.length === 0 && <p className={IPUCU}>Ana dilin dahil, bildiğin dilleri seviyesiyle ekle.</p>}
    </div>
  );
};

/*
  YETENEKLER VE İLGİ ALANLARI — HIZLI ÇOKLU SEÇİM (11 Ekim 2026)

  Dokun: seçilir (mavi). Tekrar dokun: kalkar. Ara ya da listede olmayanı
  ekle. Seçimler taslakta toplanıyor; tek tek kaydedilmiyor, en sonda
  "Tüm değişiklikleri kaydet" ile. Hazır liste bölüme göre SINIRLANMIYOR;
  gruplar yalnız bulmayı kolaylaştırıyor. Tamamen isteğe bağlı.
*/
const YETENEK_GRUP_ADLARI = YETENEK_GRUPLARI.map((g) => ({ baslik: g.baslik, ogeler: g.ogeler.map((o) => o.ad) }));
const ayni = (a: string, b: string) => a.toLocaleLowerCase('tr-TR') === b.toLocaleLowerCase('tr-TR');

export const YetenekVeIlgi: React.FC<BolumProps> = ({ t, degistir, hata }) => {
  const ilgiHata = hata('ilgi-sec-ara');
  const ilgiDolu = t.ilgiler.length >= ILGI_SINIRI;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-900">Yetenekler</h3>
        <p className={IPUCU}>
          Dokunarak seç ya da kaldır; listede olmayanı arama kutusuna yazıp ekle. {t.yetenekler.length > 0 && `${t.yetenekler.length} seçili.`}
        </p>
        <EtiketSecici
          kimlik="yetenek-sec"
          gruplar={YETENEK_GRUP_ADLARI}
          secili={t.yetenekler}
          onSec={(ad) =>
            degistir((o) => (o.yetenekler.some((y) => ayni(y, ad)) ? o : { ...o, yetenekler: [...o.yetenekler, ad] }))
          }
          onKaldir={(ad) => degistir((o) => ({ ...o, yetenekler: o.yetenekler.filter((y) => !ayni(y, ad)) }))}
          aramaYeri="Yetenek ara ya da ekle"
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-900">İlgi alanları</h3>
        <p className={IPUCU}>CV’nin sol sütununda görünür; istersen CV ayarlarından gizleyebilirsin.</p>
        <EtiketSecici
          kimlik="ilgi-sec"
          gruplar={[{ baslik: 'Öneriler', ogeler: ILGI_ALANLARI }]}
          secili={t.ilgiler}
          onSec={(ad) =>
            degistir((o) =>
              o.ilgiler.some((y) => ayni(y, ad)) || o.ilgiler.length >= ILGI_SINIRI ? o : { ...o, ilgiler: [...o.ilgiler, ad] },
            )
          }
          onKaldir={(ad) => degistir((o) => ({ ...o, ilgiler: o.ilgiler.filter((y) => !ayni(y, ad)) }))}
          aramaYeri="İlgi alanı ara ya da ekle"
        />
        {(ilgiHata || ilgiDolu) && (
          <p role={ilgiHata ? 'alert' : 'status'} className={ilgiHata ? HATA : IPUCU}>
            {ilgiHata ?? `En fazla ${ILGI_SINIRI} ilgi alanı ekleyebilirsin.`}
          </p>
        )}
      </div>
    </div>
  );
};
