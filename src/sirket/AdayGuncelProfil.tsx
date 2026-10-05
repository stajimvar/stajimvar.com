import React from 'react';
import { ExternalLink, History, Loader2 } from 'lucide-react';
import {
  IKINCIL_DUGME,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  ikincilStil,
} from './renk';
import { adayProfilFarki, githubAdresi, rozetEtiketi } from '../lib/aday-profil-farki.mjs';
import { guvenliDisAdres } from '../lib/guvenli-url.mjs';
import { tarihMetni } from '../lib/tarih.mjs';
import type { AdayGuncelProfili } from '../lib/sirket-veri';

/**
 * BAŞVURUDAN SONRA DEĞİŞENLER
 *
 * Şirket adayı başvuru anının kopyasından görüyor (ekranın ana gövdesi).
 * Bu bölüm o kopyanın YANINA güncel profilin tamamını yazmıyor: yalnız
 * değişeni yazıyor. İki hâli alt alta okutmak "ne değişti" sorusunu
 * okuyucuya bırakırdı; kuralın kendisi `src/lib/aday-profil-farki.mjs`te.
 *
 * VERİ KAPISI SUNUCUDA
 * --------------------
 * `basvuru_aday_guncel_profili` (20261121010000) yalnız o başvurunun
 * ilanının sahibi doğrulanmış şirketin üyesine ve yalnız rıza varsa
 * dönüyor; telefon, e-posta, not ortalaması bu yoldan gelmiyor. Rıza
 * yoksa bu bölüm hiç çizilmiyor (çağıran `etkin: false` veriyor) — boş
 * bir "güncel profil" kutusu, verilmemiş bir izni ima ederdi.
 *
 * ÖNYARGISIZ İNCELEME
 * -------------------
 * Ad farkı hesaplanmıyor (`kimlikGizli`), fotoğraf hiçbir dalda
 * çizilmiyor. "Ad değişti: X → Y" satırı, gizlenen adı ekrana geri
 * taşırdı.
 */

export type GuncelProfilSonucu = { riza: boolean; guncel: AdayGuncelProfili | null };
export type GuncelProfilYukleyici = (basvuruId: string) => Promise<GuncelProfilSonucu>;
export type ProfilFarki = NonNullable<ReturnType<typeof adayProfilFarki>>;

type Durum = 'kapali' | 'yukleniyor' | 'hazir' | 'hata';

/**
 * Güncel profili okur. Çekmecenin en üstünde çağrılıyor (erken çıkıştan
 * önce): fark, başvuru kopyasının bölüm başlıklarındaki "Başvurudan sonra
 * değişti" işaretini de besliyor.
 *
 * `yukle` kararlı bir işlev olmalı (modül düzeyinde ya da useCallback);
 * her çizimde yeni bir işlev verilirse istek her çizimde yinelenirdi.
 */
export function useAdayGuncelProfili(
  basvuruId: string | null,
  etkin: boolean,
  yukle: GuncelProfilYukleyici | undefined,
) {
  const [durum, setDurum] = React.useState<Durum>('kapali');
  const [sonuc, setSonuc] = React.useState<GuncelProfilSonucu | null>(null);
  const [deneme, setDeneme] = React.useState(0);

  React.useEffect(() => {
    /* Başka adaya geçince önceki adayın güncel profili bir kare bile kalmıyor. */
    setSonuc(null);
    if (!basvuruId || !etkin || !yukle) {
      setDurum('kapali');
      return undefined;
    }
    let iptal = false;
    setDurum('yukleniyor');
    yukle(basvuruId)
      .then((s) => {
        if (iptal) return;
        setSonuc(s);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [basvuruId, etkin, yukle, deneme]);

  const yenidenDene = React.useCallback(() => setDeneme((d) => d + 1), []);
  return { durum, sonuc, yenidenDene };
}

/**
 * Kopya bölümlerinin başlığındaki işaret. Renk tek başına bilgi
 * taşımıyor: işaretin kendisi cümle.
 */
export const DegistiIsareti: React.FC = () => (
  <span
    className="ml-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-middle text-[10px] font-bold normal-case tracking-normal"
    style={{ background: '#FEF3C7', color: '#78350F' }}
  >
    <History className="h-3 w-3" aria-hidden />
    Başvurudan sonra değişti
  </span>
);

const AltBaslik: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="mb-1.5 text-xs font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
    {children}
  </h4>
);

const Cip: React.FC<{ children: React.ReactNode; cikan?: boolean }> = ({ children, cikan }) => (
  <li
    className={`rounded-lg px-2 py-1 text-[11px] font-bold ${cikan ? 'line-through' : ''}`}
    style={cikan ? { background: '#F3F4F6', color: '#4B5563' } : { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
  >
    {children}
  </li>
);

/* Değer boşsa "boş" yazılıyor: "—" ekran okuyucuda "tire" diye okunuyor. */
const deger = (x: string | null) => x ?? 'boş';

function alanBaglantisi(anahtar: string, simdi: string | null): string | null {
  if (!simdi) return null;
  if (anahtar === 'github') return githubAdresi(simdi);
  if (anahtar === 'portfolyo' || anahtar === 'linkedin') return guvenliDisAdres(simdi);
  return null;
}

export const AdayGuncelProfil: React.FC<{
  durum: Durum;
  fark: ProfilFarki | null;
  guncellendi: string | null;
  /** Sunucu rıza yok dedi ya da profil bulunamadı. */
  profilYok: boolean;
  onYenidenDene: () => void;
  /** Önyargısız inceleme: bağlantı ve proje adresi çizilmiyor. */
  kimlikGizli?: boolean;
}> = ({ durum, fark, guncellendi, profilYok, onYenidenDene, kimlikGizli = false }) => {
  if (durum === 'kapali') return null;

  const baslik = (
    <h3 id="aday-degisenler" className="text-base font-extrabold" style={{ color: SIRKET_METIN }}>
      Başvurudan sonra değişenler
    </h3>
  );

  if (durum === 'yukleniyor') {
    return (
      <section aria-labelledby="aday-degisenler" aria-busy="true" className="space-y-2">
        {baslik}
        <p className="flex items-center gap-2 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Güncel profil karşılaştırılıyor…
        </p>
      </section>
    );
  }

  if (durum === 'hata') {
    return (
      <section aria-labelledby="aday-degisenler" className="space-y-2">
        {baslik}
        <div className="rounded-2xl border p-3.5" style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}>
          <p role="alert" className="text-sm font-semibold" style={{ color: '#991B1B' }}>
            Adayın güncel profili alınamadı.
          </p>
          <p className="mt-0.5 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
            Başvuru anındaki profil yukarıda olduğu gibi duruyor.
          </p>
          <button type="button" onClick={onYenidenDene} className={`mt-3 ${IKINCIL_DUGME}`} style={ikincilStil}>
            Yeniden dene
          </button>
        </div>
      </section>
    );
  }

  /*
    Rıza var ama güncel satır yok: hesap silinmiş ya da kapatılmış
    olabilir. "Değişiklik yok" demek yanlış bir iddia olurdu.
  */
  if (profilYok || !fark) {
    return (
      <section aria-labelledby="aday-degisenler" className="space-y-2">
        {baslik}
        <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          Adayın güncel profiline ulaşılamadı; yalnız başvuru anındaki profil gösteriliyor.
        </p>
      </section>
    );
  }

  const guncelTarih = tarihMetni(guncellendi);
  const { alanlar, yetenekler, diller, rozetler, projeler } = fark;

  return (
    <section aria-labelledby="aday-degisenler" className="space-y-3">
      <div>
        {baslik}
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          Güncel profil, başvuru anındaki kopyayla karşılaştırıldı; yalnız değişen alanlar
          listeleniyor.
          {guncelTarih ? ` Profilin son güncellenmesi: ${guncelTarih}.` : ''}
        </p>
      </div>

      {!fark.degisiklikVar ? (
        <p
          className="rounded-2xl border p-3.5 text-sm"
          style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }}
        >
          Başvurudan bu yana karşılaştırılan alanlarda değişiklik yok.
        </p>
      ) : (
        <div
          className="space-y-4 rounded-2xl border p-3.5"
          style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
        >
          {alanlar.length > 0 && (
            <div>
              <AltBaslik>Profil bilgileri</AltBaslik>
              <dl className="space-y-2">
                {alanlar.map((a) => {
                  const adres = alanBaglantisi(a.anahtar, a.simdi);
                  return (
                    <div key={a.anahtar} className="min-w-0">
                      <dt className="text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                        {a.etiket}
                      </dt>
                      {a.degerGizli ? (
                        <dd className="text-sm" style={{ color: SIRKET_METIN }}>
                          Başvurudan sonra değişti; önyargısız incelemede adres gösterilmiyor.
                        </dd>
                      ) : (
                      <dd className="break-words text-sm" style={{ color: SIRKET_METIN }}>
                        <span className="block">
                          <span style={{ color: SIRKET_METIN_IKINCIL }}>Başvuruda: </span>
                          {deger(a.once)}
                        </span>
                        <span className="block">
                        <span style={{ color: SIRKET_METIN_IKINCIL }}>Şimdi: </span>
                        {adres ? (
                          <a
                            href={adres}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex min-h-11 items-center gap-1 break-all font-bold underline underline-offset-2"
                            style={{ color: SIRKET_VURGU_KOYU }}
                          >
                            {a.simdi}
                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                          </a>
                        ) : (
                          <strong>{deger(a.simdi)}</strong>
                        )}
                        </span>
                      </dd>
                      )}
                    </div>
                  );
                })}
              </dl>
            </div>
          )}

          {yetenekler.eklenen.length > 0 && (
            <div>
              {/*
                KOPYA SINIRI: kopya en çok beş yetenek tutuyor. Beşi doluysa
                fazladan görünen yetenek başvuru anında da olabilir; "eklendi"
                demek doğrulanamayan bir iddia olurdu.
              */}
              <AltBaslik>
                {yetenekler.kopyaSinirli ? 'Başvuru kopyasında yer almayan yetenekler' : 'Eklenen yetenekler'}
              </AltBaslik>
              <ul className="flex flex-wrap gap-1.5">
                {yetenekler.eklenen.map((y: string) => (
                  <Cip key={y}>{y}</Cip>
                ))}
              </ul>
              {yetenekler.kopyaSinirli && (
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Başvuru kopyası en çok beş yetenek saklıyor; bunların bir kısmı başvuru anında da
                  profilde olabilir.
                </p>
              )}
            </div>
          )}
          {yetenekler.cikan.length > 0 && (
            <div>
              <AltBaslik>Profilden çıkarılan yetenekler</AltBaslik>
              <ul className="flex flex-wrap gap-1.5">
                {yetenekler.cikan.map((y: string) => (
                  <Cip key={y} cikan>
                    {y}
                  </Cip>
                ))}
              </ul>
            </div>
          )}

          {(diller.eklenen.length > 0 || diller.cikan.length > 0 || diller.seviyesiDegisen.length > 0) && (
            <div>
              <AltBaslik>Diller</AltBaslik>
              <ul className="space-y-1 text-sm" style={{ color: SIRKET_METIN }}>
                {diller.seviyesiDegisen.map((d: { ad: string; once: string; simdi: string }) => (
                  <li key={`s-${d.ad}`}>
                    Başvuruda {d.once}, şimdi <strong>{d.simdi}</strong>
                  </li>
                ))}
                {diller.eklenen.map((d: string) => (
                  <li key={`e-${d}`}>
                    Eklendi: <strong>{d}</strong>
                  </li>
                ))}
                {diller.cikan.map((d: string) => (
                  <li key={`c-${d}`}>Çıkarıldı: {d}</li>
                ))}
              </ul>
            </div>
          )}

          {(rozetler.eklenen.length > 0 || rozetler.cikan.length > 0) && (
            <div>
              <AltBaslik>Rozetler</AltBaslik>
              <ul className="flex flex-wrap gap-1.5">
                {rozetler.eklenen.map((r: string) => (
                  <Cip key={`e-${r}`}>Yeni: {rozetEtiketi(r)}</Cip>
                ))}
                {rozetler.cikan.map((r: string) => (
                  <Cip key={`c-${r}`} cikan>
                    {rozetEtiketi(r)}
                  </Cip>
                ))}
              </ul>
            </div>
          )}

          {(projeler.eklenen.length > 0 || projeler.guncellenen.length > 0 || projeler.cikan.length > 0) && (
            <div className="space-y-2">
              <AltBaslik>Projeler</AltBaslik>
              {[
                {
                  etiket: projeler.kopyaSinirli ? 'Başvuru kopyasında yer almayan' : 'Yeni proje',
                  liste: projeler.eklenen,
                },
                { etiket: 'İçeriği güncellendi', liste: projeler.guncellenen },
              ].map(({ etiket, liste }) =>
                liste.map((p: { baslik: string; aciklama: string | null; adres: string | null }) => {
                  /* Önyargısız incelemede proje adresi yok: adres çoğunlukla GitHub kullanıcı adını taşıyor. */
                  const adres = kimlikGizli ? null : guvenliDisAdres(p.adres);
                  return (
                    <article
                      key={`${etiket}-${p.baslik}`}
                      className="rounded-xl border p-3"
                      style={{ borderColor: SIRKET_KENAR }}
                    >
                      <p className="text-[10px] font-bold" style={{ color: '#78350F' }}>
                        {etiket}
                      </p>
                      <p className="break-words text-sm font-bold" style={{ color: SIRKET_METIN }}>
                        {p.baslik}
                      </p>
                      {p.aciklama && (
                        <p className="mt-0.5 break-words text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                          {p.aciklama}
                        </p>
                      )}
                      {adres && (
                        <a
                          href={adres}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-bold"
                          style={{ color: SIRKET_VURGU_KOYU }}
                        >
                          Projeyi aç
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      )}
                    </article>
                  );
                }),
              )}
              {projeler.cikan.length > 0 && (
                <p className="text-sm" style={{ color: SIRKET_METIN }}>
                  Profilden çıkarılan:{' '}
                  {projeler.cikan.map((p: { baslik: string }) => p.baslik).join(', ')}
                </p>
              )}
              {projeler.kopyaSinirli && projeler.eklenen.length > 0 && (
                <p className="text-[11px] leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Başvuru kopyası en çok beş proje saklıyor; işaretli projeler başvuru anında da
                  profilde olabilir.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {yetenekler.karsilastirilamadi && (
        <p className="text-[11px] leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          Bu başvurunun kopyasında yetenek listesi yok; yetenekler karşılaştırılamadı.
        </p>
      )}
    </section>
  );
};
