import React from 'react';
import { Check } from 'lucide-react';
import { AutocompleteField } from '../AutocompleteField';
import { TR_CITIES } from '../../data/turkeyData';
import { adYazimi } from '../../lib/ad';
import { ODAK_HALKASI } from '../../lib/renk-token';
import { HAKKIMDA_UZUNLUGU } from '../../lib/profil-taslagi.mjs';
import { ALAN, IPUCU } from './form-siniflari';
import { Alan, IstegeBagli, type BolumProps } from './ortak';

/*
  KİŞİSEL BİLGİLER (11 Ekim 2026)

  Ad ve soyad ayrı alan; kayıtta `full_name` olarak birleşiyor (son kelime
  soyad: "Ayşe Nur Kaya" → Ayşe Nur / Kaya). Hesapta zaten olan bilgi
  (ad, e-posta, telefon) önceden dolu geliyor. E-posta giriş e-postası:
  burada değiştirilmiyor.
*/
export const KisiselBilgiler: React.FC<BolumProps & { eposta: string }> = ({ t, degistir, hata, eposta }) => {
  const k = t.kisisel;
  const yaz = (alan: keyof typeof k, deger: string) => degistir((o) => ({ ...o, kisisel: { ...o.kisisel, [alan]: deger } }));
  const tamAd = [k.ad.trim(), k.soyad.trim()].filter(Boolean).join(' ');
  const duzgun = tamAd ? adYazimi(tamAd) : '';
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Alan id="ad" etiket="Ad" hata={hata('ad')}>
          <input
            id="ad"
            type="text"
            autoComplete="given-name"
            aria-invalid={Boolean(hata('ad')) || undefined}
            value={k.ad}
            onChange={(e) => yaz('ad', e.target.value)}
            className={ALAN}
          />
        </Alan>
        <Alan id="soyad" etiket="Soyad" hata={hata('soyad')}>
          <input
            id="soyad"
            type="text"
            autoComplete="family-name"
            value={k.soyad}
            onChange={(e) => yaz('soyad', e.target.value)}
            className={ALAN}
          />
        </Alan>
      </div>
      {duzgun && duzgun !== tamAd && (
        <button
          type="button"
          onClick={() => {
            const parca = duzgun.split(' ');
            degistir((o) => ({
              ...o,
              kisisel: { ...o.kisisel, ad: parca.slice(0, -1).join(' ') || parca[0], soyad: parca.length > 1 ? parca[parca.length - 1] : '' },
            }));
          }}
          className={`-mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline ${ODAK_HALKASI}`}
        >
          <Check aria-hidden className="h-4 w-4" />
          {duzgun} olarak yaz
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Alan id="sehir" etiket="Şehir" hata={hata('sehir')}>
          <AutocompleteField
            id="sehir"
            value={k.sehir}
            onChange={(v) => yaz('sehir', v)}
            options={TR_CITIES}
            placeholder="Yaşadığın il"
            className={ALAN}
            klavyeDuzeni
          />
        </Alan>
        <Alan id="telefon" etiket="Telefon" hata={hata('telefon')}>
          <input
            id="telefon"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(hata('telefon')) || undefined}
            value={k.telefon}
            onChange={(e) => yaz('telefon', e.target.value)}
            placeholder="05XX XXX XX XX"
            className={ALAN}
          />
        </Alan>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-gray-900">E-posta</span>
        <p className="min-h-11 break-all rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
          {eposta || '—'}
        </p>
        <p className={IPUCU}>Giriş yaptığın e-posta; CV’nde bu adres yazar.</p>
      </div>

      <Alan
        id="bio"
        etiket="Hakkımda"
        hata={hata('bio')}
        ipucu={`${k.hakkimda.trim().length}/${HAKKIMDA_UZUNLUGU} · CV’nin en üstünde görünür.`}
      >
        <textarea
          id="bio"
          rows={4}
          maxLength={HAKKIMDA_UZUNLUGU}
          value={k.hakkimda}
          onChange={(e) => yaz('hakkimda', e.target.value)}
          placeholder="Örn. Giyim üretim teknolojisi öğrencisiyim; üretim planlamaya ve kalite kontrole ilgi duyuyorum."
          className={`${ALAN} py-2.5`}
        />
      </Alan>
      <p className={IPUCU}>
        Telefon ve e-posta herkese açık profilinde görünmez; yalnız başvurduğun ilanın şirketiyle, sen izin verirsen
        paylaşılır.
      </p>
    </div>
  );
};

/*
  BAĞLANTILAR — hepsi isteğe bağlı; boş bırakmak profili eksik yapmıyor.
  Boş bağlantı CV'de yazılmıyor. Instagram yok (kullanıcı kararı).
*/
export const Baglantilar: React.FC<BolumProps> = ({ t, degistir, hata }) => {
  const b = t.baglanti;
  const yaz = (alan: keyof typeof b, deger: string) => degistir((o) => ({ ...o, baglanti: { ...o.baglanti, [alan]: deger } }));
  return (
    <div className="space-y-4">
      <Alan id="baglanti-linkedin" etiket={<>LinkedIn <IstegeBagli /></>} hata={hata('baglanti-linkedin')}>
        <input
          id="baglanti-linkedin"
          type="url"
          inputMode="url"
          autoComplete="url"
          aria-invalid={Boolean(hata('baglanti-linkedin')) || undefined}
          value={b.linkedin}
          onChange={(e) => yaz('linkedin', e.target.value)}
          placeholder="linkedin.com/in/adin"
          className={ALAN}
        />
      </Alan>
      <Alan
        id="baglanti-portfolyo"
        etiket={<>Portföy veya kişisel web sitesi <IstegeBagli /></>}
        hata={hata('baglanti-portfolyo')}
      >
        <input
          id="baglanti-portfolyo"
          type="url"
          inputMode="url"
          aria-invalid={Boolean(hata('baglanti-portfolyo')) || undefined}
          value={b.portfolyo}
          onChange={(e) => yaz('portfolyo', e.target.value)}
          placeholder="ornek.com"
          className={ALAN}
        />
      </Alan>
      <Alan id="baglanti-github" etiket={<>GitHub kullanıcı adı <IstegeBagli /></>} hata={hata('baglanti-github')}>
        <input
          id="baglanti-github"
          type="text"
          autoCapitalize="none"
          aria-invalid={Boolean(hata('baglanti-github')) || undefined}
          value={b.github}
          onChange={(e) => yaz('github', e.target.value)}
          placeholder="kullaniciadi"
          className={ALAN}
        />
      </Alan>
    </div>
  );
};
