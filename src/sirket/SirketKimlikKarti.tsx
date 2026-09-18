import React from 'react';
import { BadgeCheck, ExternalLink, LogOut, MapPin, Users } from 'lucide-react';
import {
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_KENAR_VURGU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  ikincilStil,
  kutuStil,
} from './renk';
import { SirketProfilFormu } from './SirketProfilFormu';
import { adayGorebilir } from '../lib/sirket-kademe.mjs';
import {
  PROFIL_ALANLARI,
  profilTamamlanmaOrani,
  type SirketBaglami,
  type SirketProfilDegeri,
} from '../lib/sirket-veri';

/**
 * Şirketin Profil sekmesi — öğrenci profilinin düzeniyle.
 *
 * NEDEN ÖĞRENCİ KARTININ DÜZENİ
 * -----------------------------
 * Tek kabuk kararı (PRODUCT.md, 18 Eylül 2026): şirket hesabı öğrenciyle
 * aynı kabuğu ve aynı profil düzenini kullanıyor. Öğrenci kartı üstte
 * yatay kimlik (fotoğraf · ad · okul/bölüm · il), sağda sayaçlar ve
 * düğmeler; altta bölümler. Burada aynı iskelet: logo · ad · sektör ·
 * konum; sağda sayaçlar; altta düzenleme bölümleri (SirketProfilFormu).
 *
 * SAYAÇLAR GERÇEK
 * ---------------
 * Yalnız elimizde olan sayılar: ilan sayısı `listings` satırlarından,
 * başvuru sayısı `applications` satırlarından ve YALNIZ kart görebilen
 * kademede. Takipçi sayacı YOK — takip modeli henüz veritabanında yok
 * (sıradaki PR). "0 takipçi" yazmak, olmayan bir özelliği varmış gibi
 * göstermek olurdu.
 *
 * PAYLAŞIM IZGARASI YOK
 * ---------------------
 * Öğrenci profilinin sağ sütunundaki fotoğraf akışı burada çizilmiyor;
 * boş durum da yazılmıyor. `social_posts` şirket rolüne açılınca
 * (ayrı göç) bölüm gelecek. Bugün çizilseydi içi boş bir vaat olurdu.
 */

/** Logo görseli ya da baş harfler — öğrenci kartındaki fotoğraf ölçüsünde. */
const KimlikLogosu: React.FC<{ url: string; ad: string }> = ({ url, ad }) => {
  const [bozuk, setBozuk] = React.useState(false);
  React.useEffect(() => setBozuk(false), [url]);
  const olcu = 'h-20 w-20 text-2xl sm:h-28 sm:w-28 sm:text-3xl lg:h-36 lg:w-36 lg:text-4xl';

  if (!url.trim() || bozuk) {
    return (
      <span
        className={`grid ${olcu} shrink-0 place-items-center rounded-2xl border font-black`}
        style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU, borderColor: SIRKET_KENAR }}
        aria-hidden
      >
        {basHarfler(ad)}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={`${ad} logosu`}
      onError={() => setBozuk(true)}
      className={`${olcu} shrink-0 rounded-2xl border object-contain bg-white p-2`}
      style={{ borderColor: SIRKET_KENAR }}
    />
  );
};

function basHarfler(ad: string): string {
  const parcalar = ad.trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return '?';
  return parcalar
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr-TR') ?? '')
    .join('');
}

/*
  Sayaç: öğrenci kartındaki `Sayac` ile aynı tipografi. Bağlantı gerçek
  `<a>`: orta tuş ve yeni sekme çalışıyor, sol tık uygulama içi gezinme.
*/
const Sayac: React.FC<{
  deger: number;
  etiket: string;
  href: string;
  onNavigate: (yol: string) => void;
}> = ({ deger, etiket, href, onNavigate }) => (
  <a
    href={href}
    onClick={(olay) => {
      if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
      olay.preventDefault();
      onNavigate(href);
    }}
    className={`mx-2 block min-h-11 min-w-0 rounded-xl py-1 text-center transition-colors hover:bg-gray-50 ${SIRKET_ODAK}`}
  >
    <span
      className="block text-2xl font-extrabold leading-tight tabular-nums sm:text-[28px]"
      style={{ color: SIRKET_METIN }}
    >
      {deger}
    </span>
    <span className="mt-0.5 block text-sm leading-tight" style={{ color: SIRKET_METIN_IKINCIL }}>
      {etiket}
    </span>
  </a>
);

export const SirketKimlikKarti: React.FC<{
  baglam: SirketBaglami;
  /** `null` = okunamadı; kimlik satırları ad dışında çizilmez ve bu söylenir. */
  profil: SirketProfilDegeri | null;
  ilanSayisi: number;
  /** Kart görebilen kademede gerçek sayı; değilse `null` ve sayaç çizilmez. */
  basvuruSayisi: number | null;
  onNavigate: (yol: string) => void;
}> = ({ baglam, profil, ilanSayisi, basvuruSayisi, onNavigate }) => {
  const sektorKonum = profil
    ? [profil.industry.trim(), profil.location.trim()].filter(Boolean).join(' · ')
    : '';
  const oran = profil ? profilTamamlanmaOrani(profil) : null;
  const eksikSayisi = profil
    ? PROFIL_ALANLARI.filter((a) => !String(profil[a] ?? '').trim()).length
    : 0;
  const sayfaAdresi = baglam.slug ? `/sirket/${baglam.slug}` : null;

  return (
    <section className={`${KUTU} relative`} style={kutuStil} aria-label="Şirket kimliği">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
        {/* ---------------- Logo ve kimlik ---------------- */}
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
          <KimlikLogosu url={profil?.logoUrl ?? ''} ad={baglam.ad} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* `break-words`: uzun ad kırpılmıyor, sarılıyor. */}
              <h1
                className="min-w-0 break-words text-xl font-extrabold leading-tight tracking-tight sm:text-2xl lg:text-[28px]"
                style={{ color: SIRKET_METIN }}
              >
                {baglam.ad || 'Şirketiniz'}
              </h1>
              {/* Doğrulanmamış şirkette rozet HİÇ çizilmiyor: olmayan bir
                  güven işaretini soluk göstermek bile ima ederdi. */}
              {baglam.dogrulandi && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    borderColor: SIRKET_KENAR_VURGU,
                    background: SIRKET_ROZET,
                    color: SIRKET_VURGU_KOYU,
                  }}
                >
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  Doğrulanmış kurum
                </span>
              )}
            </div>

            {profil === null ? (
              /* Okunamadı: boş satır ya da tire değil, durumun kendisi. */
              <p className="mt-1.5 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
                Profil bilgileri alınamadı
              </p>
            ) : (
              <div
                className="mt-1.5 space-y-0.5 text-sm leading-snug sm:mt-2 sm:text-base"
                style={{ color: SIRKET_METIN_IKINCIL }}
              >
                {sektorKonum ? (
                  <p className="flex min-w-0 items-center gap-1.5">
                    <MapPin aria-hidden className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">{sektorKonum}</span>
                  </p>
                ) : (
                  <p>Sektör ve konum eksik</p>
                )}
                {profil.size.trim() && (
                  <p className="flex min-w-0 items-center gap-1.5">
                    <Users aria-hidden className="h-4 w-4 shrink-0" />
                    <span>{profil.size} çalışan</span>
                  </p>
                )}
              </div>
            )}

            {/*
              Tamamlanma yüzdesi uydurma değil: dolu alan / yedi
              (lib/sirket-veri profilTamamlanmaOrani). Tam profilde
              "%100" yerine cümle; sayı süse dönmesin.
            */}
            {oran !== null && (
              <p className="mt-1.5 text-sm sm:mt-2.5" style={{ color: SIRKET_METIN_IKINCIL }}>
                {eksikSayisi === 0
                  ? 'Profil tamam'
                  : `Profil %${oran} tamamlandı · ${eksikSayisi} alan eksik`}
              </p>
            )}
          </div>
        </div>

        {/* ---------------- Sayaçlar ve eylemler ---------------- */}
        <div className="space-y-4 lg:flex lg:w-[440px] lg:shrink-0 lg:flex-col lg:justify-center lg:self-stretch lg:border-l lg:border-gray-200 lg:pl-8">
          <div
            className={`grid divide-x divide-gray-200 border-y border-gray-100 py-2 lg:border-y-0 lg:py-0 ${
              basvuruSayisi === null ? 'grid-cols-1' : 'grid-cols-2'
            }`}
          >
            <Sayac deger={ilanSayisi} etiket="ilan" href="/sirket/ilanlar" onNavigate={onNavigate} />
            {basvuruSayisi !== null && (
              <Sayac
                deger={basvuruSayisi}
                etiket="başvuru"
                href="/sirket/basvuranlar"
                onNavigate={onNavigate}
              />
            )}
          </div>

          {/*
            Herkese açık şirket sayfası gerçek bağlantı; slug yoksa
            (kayıt henüz yok) düğme de yok. "Profili düzenle" düğmesi
            YOK: düzenleme bölümleri hemen bu kartın altında.
          */}
          {sayfaAdresi && (
            <a
              href={sayfaAdresi}
              onClick={(olay) => {
                if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
                  return;
                olay.preventDefault();
                onNavigate(sayfaAdresi);
              }}
              className={`${IKINCIL_DUGME} w-full`}
              style={ikincilStil}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Öğrencinin gördüğü sayfa
            </a>
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * Profil sekmesinin tamamı: kimlik kartı + düzenleme bölümleri + çıkış.
 *
 * ÇIKIŞ BURADA
 * ------------
 * Öğrenci profilinde çıkış ayar menüsünün son satırı. Şirket hesabında
 * üst çubukta hesap menüsü yok (eski şirket portalının açılır menüsü
 * kaldırıldı); çıkışın tek görünür yeri bu sekmenin sonu. Panel
 * yüklenemese bile bu düğme çizilmeli — kullanıcı giriş yapmış hâlde
 * kilitli kalmasın (bir kez gerçekten yaşandı, öğrenci tarafında).
 */
export const SirketProfilSekmesi: React.FC<{
  baglam: SirketBaglami;
  profil: SirketProfilDegeri | null;
  ilanSayisi: number;
  basvuruSayisi: number;
  userId: string | null;
  onKaydedildi: () => void;
  onNavigate: (yol: string) => void;
  onCikis?: () => void;
}> = ({ baglam, profil, ilanSayisi, basvuruSayisi, userId, onKaydedildi, onNavigate, onCikis }) => (
  <div className="space-y-4">
    {/* Şirket kaydı yokken kimlik kartı çizilmiyor; form o durumu anlatıyor. */}
    {baglam.companyId && (
      <SirketKimlikKarti
        baglam={baglam}
        profil={profil}
        ilanSayisi={ilanSayisi}
        basvuruSayisi={adayGorebilir(baglam.kademe) ? basvuruSayisi : null}
        onNavigate={onNavigate}
      />
    )}
    <SirketProfilFormu
      baglam={baglam}
      userId={userId}
      onKaydedildi={onKaydedildi}
      onNavigate={onNavigate}
      ozetsiz
    />
    {onCikis && <CikisDugmesi onCikis={onCikis} />}
  </div>
);

export const CikisDugmesi: React.FC<{ onCikis: () => void }> = ({ onCikis }) => (
  <div className="flex justify-end">
    <button type="button" onClick={onCikis} className={IKINCIL_DUGME} style={ikincilStil}>
      <LogOut className="h-4 w-4" aria-hidden />
      Çıkış yap
    </button>
  </div>
);

/**
 * Şirketin Ağım sekmesi — dürüst boş durum.
 *
 * Takip modeli (öğrenci → şirket, şirket → şirket; tek yönlü) sıradaki
 * PR'da ve veritabanı gerektiriyor. Bugün çizilebilecek tek doğru şey ne
 * geleceğini söyleyen tek kart: sayı yok, iskelet yok, "yakında" etiketi
 * yok. Kesik kenar sitenin boş-durum dili (src/ui/EmptyState).
 */
export const SirketAgimBos: React.FC = () => (
  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
    <span
      className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
      style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
    >
      <Users className="h-6 w-6" aria-hidden />
    </span>
    <h1 className="font-bold" style={{ color: SIRKET_METIN }}>
      Seni takip eden öğrenciler burada görünecek
    </h1>
    <p
      className="mx-auto mt-1 max-w-md text-sm leading-relaxed"
      style={{ color: SIRKET_METIN_IKINCIL }}
    >
      Takip özelliği henüz açık değil. Açıldığında şirketini takip eden öğrencileri ve
      ilanlarına başvuranları bu sekmede göreceksin.
    </p>
  </div>
);
