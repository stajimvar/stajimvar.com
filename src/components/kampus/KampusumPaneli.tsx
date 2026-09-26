import React from 'react';
import { ArrowRight, ArrowUpRight, GraduationCap } from 'lucide-react';
import { kampusProfiliGetir, kampusumuGetir, type KaynakDurumu, type Kampusum } from '../../lib/queries/kampus';
import { fetchOpportunities, type Opportunity } from '../../lib/opportunities';
import { profilYeterliMi } from '../../lib/burs-kesif.mjs';
import {
  guvenliDisAdres,
  kampusBurslari,
  kaynakEskiMi,
  menuUzunSuredirYok,
  ogunEtiketi,
  UNIVERSITE_EKLE_YOLU,
} from '../../lib/kampusum.mjs';
import { tarihMetni } from '../../lib/tarih.mjs';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import type { StudentProfile } from '../../types';

/**
 * KAMPÜSÜM — bakan öğrencinin kampüs paneli (kullanıcı tasarımı, 25 Eylül 2026)
 *
 * BAKAN KİŞİNİN OKULU, PROFİL SAHİBİNİN DEĞİL
 * -------------------------------------------
 * Panel kendi profilinde de başkasının profilinde de AYNI okulu
 * gösteriyor: sayfaya bakan öğrencininkini. Bileşen okul adı ya da kimlik
 * almıyor; `kampusumuGetir` okulu sunucuda oturumdan çözüyor. Burs
 * uygunluğu da bakanın kendi profiliyle (`ogrenci`) hesaplanıyor. Profil
 * sahibinin bilgisi bu bileşene hiç girmiyor, o yüzden sızamıyor.
 *
 * ÖRNEK İÇERİK YOK
 * ----------------
 * Tasarım görselindeki "temsilî menü" ve örnek duyurular yalnız taslaktı.
 * Veri yoksa ya dürüst bir cümle var ya bölüm hiç yok:
 *   - okul yok             → "Üniversiteni ekle"
 *   - okulun kaynağı yok   → tek satır; yemek ve duyuru bölümü yok
 *   - kaynak tanımsız      → o bölüm yok (`menuKaynagi` / `duyuruKaynagi` null)
 *   - kaynak hiç okunmadı  → "henüz okunamadı"; "menü yok" DENMİYOR,
 *                            çünkü bilinmiyor
 *   - kaynak 3 günden eski → son okuma tarihi notu
 *
 * İKİ İSTEK, İKİ KADER
 * --------------------
 * Kampüs RPC'si ve burs listesi ayrı istek; biri düşerse öteki çiziliyor.
 * Burs bölümü okuldan bağımsız, okul yokken de duruyor.
 *
 * BAŞKASININ KAMPÜSÜ (`kullaniciAdi`, 25 Eylül 2026)
 * -------------------------------------------------
 * Başkasının profilindeyken başlıktaki Kampüsüm düğmesi `/kampusum/<ad>`
 * açıyor ve panel o kişinin okulunu gösteriyor (`kampus_profil`). Sunucu
 * kapısı profildeki okul bilgisinin kapısıyla aynı; kapıdan geçmeyen her
 * durum tek cümle: "okul bilgisi görünmüyor". Bakana özel iki şey bu
 * kipte YOK: burs bölümü (uygunluk bakanın profiline göre, başkasının
 * sayfasında yanıltırdı) ve "Üniversiteni ekle" (başkasının profiline
 * eklenemez).
 */

type Yukleme<T> = { durum: 'yukleniyor' } | { durum: 'hazir'; veri: T } | { durum: 'hata' };

/*
  Yan sütunla aynı kart. `akis` telefonda kart değil yüzey: kenardan
  kenara ve tek alt çizgiyle bitiyor; `sm` ve üstünde kart. Profilde
  `akis` yalnız 1024–1439'da, yani hep kart hâlinde.

  `sayfa` (25 Eylül 2026): bağımsız /kampusum sayfası. Profil panelinden
  AYRI bir varyant — panel (`sutun`, `akis`) sınıfları birebir aynı
  kaldı; sayfa yalnız görünümü değiştiriyor, veri ve durum dalları ortak
  (`STIL` aşağıda).
*/
type Yerlesim = 'sutun' | 'akis' | 'sayfa';

const KAP: Record<Yerlesim, string> = {
  sutun: 'rounded-2xl border border-gray-200 bg-white p-4',
  akis: 'border-b border-gray-200 bg-white px-4 py-5 sm:rounded-2xl sm:border sm:p-4',
  sayfa: 'bg-white px-4 pb-6 pt-4 sm:rounded-2xl sm:border sm:border-gray-200 sm:p-6',
};

const BOLUM = 'mt-4 border-t border-gray-100 pt-4';
const BOLUM_BASLIGI = 'text-sm font-extrabold text-gray-900';
const ACIKLAMA = 'text-sm leading-relaxed text-gray-600';
const NOT = 'text-xs leading-relaxed text-gray-500';
const BAGLANTI = `inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-bold text-blue-700 hover:text-blue-800 ${RENK_GECISI} ${ODAK_HALKASI}`;
const DUGME = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

/*
  GÖRÜNÜM SINIFLARI — PANEL VE SAYFA

  Bölümler tek kez yazılı; yalnız sınıflar varyanta göre seçiliyor.
  `panel` değerleri 25 Eylül 2026 öncesiyle BİREBİR aynı (masaüstü profil
  paneli değişmesin). `sayfa`:
    - yemek ilk belirgin kart: 16 px iç boşluk, 16 px köşe, ince nötr
      kenar, gölge yok; başlık ve tarih aynı grupta
    - yemek satırları 15/22, aralarında 6 px; öğünler ince ayraçla
    - duyuru ve burs: ince ayraçlı tek liste, başlık 15/21 yarı kalın
      (en çok üç satır), tarih 13 px, satır dikeyde 12 px
    - bölüm başlıkları 18/24, bölümler arası 24 px
*/
interface Stil {
  bolum: string;
  bolumBasligi: string;
  aciklama: string;
  yemekKabi: string;
  yemekBaslikGrubu: string;
  yemekTarihi: string;
  ogunListesi: string;
  ogun: string;
  ogunSatiri: string;
  ogunEtiketi: string;
  kalori: string;
  yemekler: string;
  yemekBos: string;
  yemekBaglantilari: string;
  menuBaglantisi: string;
  yemekhaneBaglantisi: string;
  liste: string;
  satir: string;
  satirBasligi: string;
  satirTarihi: string;
  satirIkonu: boolean;
  bursKurum: string;
  bursTarih: string;
  tumuBaglantisi: string;
  tumuEtiketi: string;
}

const PANEL: Stil = {
  bolum: BOLUM,
  bolumBasligi: BOLUM_BASLIGI,
  aciklama: ACIKLAMA,
  yemekKabi: BOLUM,
  yemekBaslikGrubu: '',
  yemekTarihi: `mt-0.5 ${NOT}`,
  ogunListesi: 'mt-3 space-y-3',
  ogun: '',
  ogunSatiri: 'flex items-baseline justify-between gap-2 text-xs font-bold text-gray-700',
  ogunEtiketi: '',
  kalori: 'font-medium text-gray-500',
  yemekler: 'mt-1 space-y-0.5 text-sm leading-snug text-gray-900',
  yemekBos: `mt-2 ${ACIKLAMA}`,
  yemekBaglantilari: 'mt-1 flex flex-col items-start',
  menuBaglantisi: BAGLANTI,
  yemekhaneBaglantisi: BAGLANTI,
  liste: 'mt-2',
  satir: `group -mx-2 flex min-h-11 flex-col justify-center rounded-lg px-2 py-1.5 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`,
  satirBasligi: 'line-clamp-2 text-sm font-semibold leading-snug text-gray-900 group-hover:text-blue-700',
  satirTarihi: 'mt-0.5 text-xs text-gray-500',
  satirIkonu: false,
  bursKurum: 'mt-0.5 block truncate text-xs text-gray-600',
  bursTarih: 'text-xs text-gray-500',
  tumuBaglantisi: 'mt-1',
  tumuEtiketi: 'Duyuruları gör',
};

const SAYFA_ACIKLAMA = 'text-[15px] leading-[22px] text-gray-600';

const SAYFA: Stil = {
  bolum: 'mt-6',
  bolumBasligi: 'text-lg font-bold leading-6 text-slate-900',
  aciklama: SAYFA_ACIKLAMA,
  yemekKabi: 'mt-4 rounded-2xl border border-gray-200 bg-white p-4',
  yemekBaslikGrubu: 'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5',
  yemekTarihi: 'text-sm text-gray-500',
  ogunListesi: 'mt-3 divide-y divide-gray-100',
  ogun: 'py-3 first:pt-0 last:pb-0',
  ogunSatiri: 'flex items-center justify-between gap-2',
  ogunEtiketi: 'text-sm font-semibold text-slate-700',
  kalori: 'ml-auto rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600',
  yemekler: 'mt-2 space-y-1.5 text-[15px] leading-[22px] text-slate-900',
  yemekBos: `mt-3 ${SAYFA_ACIKLAMA}`,
  yemekBaglantilari: 'mt-2 flex flex-wrap items-center gap-x-5',
  menuBaglantisi: `inline-flex min-h-11 items-center gap-1 rounded-lg text-[15px] font-semibold text-blue-700 hover:text-blue-800 ${RENK_GECISI} ${ODAK_HALKASI}`,
  yemekhaneBaglantisi: `inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline ${RENK_GECISI} ${ODAK_HALKASI}`,
  liste: 'mt-1 divide-y divide-gray-100',
  satir: `group flex min-h-11 items-start gap-3 rounded-lg py-3 ${RENK_GECISI} ${ODAK_HALKASI}`,
  satirBasligi: 'line-clamp-3 block text-[15px] font-semibold leading-[21px] text-slate-900 group-hover:text-blue-700',
  satirTarihi: 'mt-1 block text-[13px] leading-[18px] text-gray-500',
  satirIkonu: true,
  bursKurum: 'mt-1 block truncate text-[13px] leading-[18px] text-gray-600',
  bursTarih: 'block text-[13px] leading-[18px] text-gray-500',
  tumuBaglantisi: 'mt-1',
  tumuEtiketi: 'Tüm duyurular',
};

function solTik(olay: React.MouseEvent<HTMLAnchorElement>): boolean {
  return !(olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0);
}

const DisBaglanti: React.FC<{ href: string; className?: string; children: React.ReactNode }> = ({
  href,
  className = BAGLANTI,
  children,
}) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
    {children}
    <span className="sr-only"> (yeni sekmede açılır)</span>
  </a>
);

const Iskelet: React.FC<{ className: string }> = ({ className }) => (
  <span aria-hidden className={`block animate-pulse rounded bg-gray-100 ${className}`} />
);

/** Bölüm iskeleti — gerçek bölümle aynı kutular: başlık, üç satır, bağlantı. */
const BolumIskeleti: React.FC<{ kap?: string }> = ({ kap = BOLUM }) => (
  <div className={`${kap} space-y-2.5`}>
    <Iskelet className="h-4 w-40" />
    <Iskelet className="h-3.5 w-full" />
    <Iskelet className="h-3.5 w-5/6" />
    <Iskelet className="h-3.5 w-2/3" />
    <Iskelet className="mt-1 h-4 w-32" />
  </div>
);

/** Kaynak 3 günden eskiyse son okuma notu; değilse hiçbir şey. */
const EskiKaynakNotu: React.FC<{ kaynak: KaynakDurumu; bugun: string }> = ({ kaynak, bugun }) => {
  if (!kaynak.sonBasariAni || !kaynakEskiMi(kaynak.sonBasariAni, bugun)) return null;
  const metin = tarihMetni(kaynak.sonBasariAni);
  if (!metin) return null;
  return (
    <p className={`mt-2 ${NOT}`}>
      Kaynak en son <time dateTime={kaynak.sonBasariAni}>{metin}</time> tarihinde okundu.
    </p>
  );
};

const YemekBolumu: React.FC<{ veri: Kampusum; kaynak: KaynakDurumu; kimlik: string; stil: Stil }> = ({
  veri,
  kaynak,
  kimlik,
  stil,
}) => {
  const { menu, universite, bugun } = veri;
  const menuAdresi = guvenliDisAdres(menu?.kaynakUrl);
  const yemekhaneAdresi = guvenliDisAdres(universite?.yemekhaneSayfasi);
  const bugunMetni = tarihMetni(bugun, { yil: false });
  /*
    UZUN SÜRE MENÜ YOK (yaz dönemi, 26 Eylül 2026): kaynak okunuyor ama son
    menü 7 günden eski (ya da hiç yok) → bölüm başlık, tek satır ve resmî
    yemekhane sayfası; bugünün tarihi de çizilmiyor. "Yemekhane
    yayımlamadı" denmiyor: bildiğimiz şey menünün BULUNAMADIĞI. Sunucu
    tarihi vermediyse (eski yanıt) kural yok.
  */
  const uzunSuredirYok =
    !menu &&
    Boolean(kaynak.sonBasariAni) &&
    veri.sonMenuTarihi !== undefined &&
    menuUzunSuredirYok(veri.sonMenuTarihi, bugun);
  return (
    <section aria-labelledby={kimlik} className={stil.yemekKabi}>
      <div className={stil.yemekBaslikGrubu}>
        <h3 id={kimlik} className={stil.bolumBasligi}>
          Bugün yemekte ne var?
        </h3>
        {bugunMetni && !uzunSuredirYok && (
          <p className={stil.yemekTarihi}>
            <time dateTime={bugun}>{bugunMetni}</time>
          </p>
        )}
      </div>
      {menu && menu.ogunler.length > 0 ? (
        <ul className={stil.ogunListesi}>
          {menu.ogunler.map((ogun, sira) => {
            const etiket = ogunEtiketi(ogun.ogun);
            return (
              <li key={`${ogun.ogun}-${sira}`} className={stil.ogun || undefined}>
                {(etiket || ogun.kalori !== null) && (
                  <p className={stil.ogunSatiri}>
                    {etiket && <span className={stil.ogunEtiketi || undefined}>{etiket}</span>}
                    {/* Kalori yalnız kaynak yazdıysa; tahmin yok. */}
                    {ogun.kalori !== null && <span className={stil.kalori}>{ogun.kalori} kcal</span>}
                  </p>
                )}
                {/* Yemek adları kaynakta nasıl geldiyse öyle; değiştirilmiyor. */}
                <ul className={stil.yemekler}>
                  {ogun.yemekler.map((yemek, i) => (
                    <li key={`${yemek}-${i}`}>{yemek}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={stil.yemekBos}>
          {/*
            Hiç okunamamış kaynakta "menü yok" demek bilinmeyeni yok diye
            yazmak olurdu; iki durum iki cümle.
          */}
          {uzunSuredirYok
            ? 'Yemekhane sayfasında son 7 günde menü bulunamadı.'
            : kaynak.sonBasariAni
              ? 'Bugün için yayımlanmış menü yok.'
              : 'Menü kaynağı henüz okunamadı.'}
        </p>
      )}
      <EskiKaynakNotu kaynak={kaynak} bugun={bugun} />
      {(menuAdresi || yemekhaneAdresi) && (
        <div className={stil.yemekBaglantilari}>
          {menuAdresi && (
            <DisBaglanti href={menuAdresi} className={stil.menuBaglantisi}>
              Ayın menüsünü gör
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </DisBaglanti>
          )}
          {yemekhaneAdresi && (
            <DisBaglanti href={yemekhaneAdresi} className={stil.yemekhaneBaglantisi}>
              Resmî yemekhane sayfası
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </DisBaglanti>
          )}
        </div>
      )}
    </section>
  );
};

const DuyuruBolumu: React.FC<{ veri: Kampusum; kaynak: KaynakDurumu; kimlik: string; stil: Stil }> = ({
  veri,
  kaynak,
  kimlik,
  stil,
}) => {
  const tumu = guvenliDisAdres(veri.universite?.duyurularSayfasi);
  const duyurular = veri.duyurular
    .map((d) => ({ ...d, adres: guvenliDisAdres(d.url) }))
    .filter((d): d is typeof d & { adres: string } => d.adres !== null);
  return (
    <section aria-labelledby={kimlik} className={stil.bolum}>
      <h3 id={kimlik} className={stil.bolumBasligi}>
        Üniversite duyuruları
      </h3>
      {duyurular.length > 0 ? (
        <ul className={stil.liste}>
          {duyurular.map((d) => {
            const tarih = tarihMetni(d.tarih, { yil: false });
            return (
              <li key={d.adres}>
                {/*
                  Satırın tamamı gerçek bağlantı. Sayfada başlık en çok üç
                  satır görünüyor (`line-clamp`); kırpma yalnız görsel,
                  metnin tamamı bağlantının erişilebilir adında.
                */}
                <DisBaglanti href={d.adres} className={stil.satir}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={stil.satirBasligi}>{d.baslik}</span>
                    {tarih && (
                      <time dateTime={d.tarih} className={stil.satirTarihi}>
                        {tarih}
                      </time>
                    )}
                  </span>
                  {stil.satirIkonu && (
                    <ArrowUpRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 group-hover:text-blue-700" />
                  )}
                </DisBaglanti>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={`mt-2 ${stil.aciklama}`}>
          {kaynak.sonBasariAni ? 'Son 30 günde duyuru yok.' : 'Duyuru kaynağı henüz okunamadı.'}
        </p>
      )}
      <EskiKaynakNotu kaynak={kaynak} bugun={veri.bugun} />
      {tumu && (
        <div className={stil.tumuBaglantisi}>
          <DisBaglanti href={tumu}>
            {stil.tumuEtiketi}
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </DisBaglanti>
        </div>
      )}
    </section>
  );
};

const BursBolumu: React.FC<{
  burslar: Yukleme<Opportunity[]>;
  ogrenci: StudentProfile | null;
  onYenidenDene: () => void;
  onNavigate: (yol: string) => void;
  kimlik: string;
  stil: Stil;
}> = ({ burslar, ogrenci, onYenidenDene, onNavigate, kimlik, stil }) => {
  const liste = burslar.durum === 'hazir' ? kampusBurslari(burslar.veri, ogrenci) : [];
  return (
    <section aria-labelledby={kimlik} aria-busy={burslar.durum === 'yukleniyor'} className={stil.bolum}>
      <h3 id={kimlik} className={stil.bolumBasligi}>
        Burs haberleri
      </h3>
      {burslar.durum === 'yukleniyor' && (
        <div className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Iskelet className="h-3.5 w-full" />
              <Iskelet className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}
      {burslar.durum === 'hata' && (
        <div role="alert" className="mt-2 space-y-2">
          <p className={stil.aciklama}>Burslar alınamadı.</p>
          <button type="button" onClick={onYenidenDene} className={DUGME}>
            Yeniden dene
          </button>
        </div>
      )}
      {burslar.durum === 'hazir' &&
        (!profilYeterliMi(ogrenci) ? (
          /*
            Sınıf yoksa "Sana Uygun" hesabı hiç yapılmıyor (Burslar
            sayfasıyla aynı kapı). "Uygun burs yok" demek, bilinmeyeni yok
            diye yazmak olurdu.
          */
          <p className={`mt-2 ${stil.aciklama}`}>Sana uygun bursları seçebilmek için profilinde sınıfın yazmalı.</p>
        ) : liste.length === 0 ? (
          <p className={`mt-2 ${stil.aciklama}`}>Şu an sana uygun, başvurusu açık burs yok.</p>
        ) : (
          <ul className={stil.liste}>
            {liste.map((burs) => {
              const yol = `/firsatlar/${burs.slug}`;
              const sonTarih = tarihMetni(burs.applicationDeadline, { yil: false });
              return (
                <li key={burs.id}>
                  <a
                    href={yol}
                    onClick={(olay) => {
                      if (!solTik(olay)) return;
                      olay.preventDefault();
                      onNavigate(yol);
                    }}
                    className={stil.satir}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={stil.satirBasligi}>{burs.title}</span>
                      <span className={stil.bursKurum}>{burs.organizationName}</span>
                      {sonTarih && (
                        <span className={stil.bursTarih}>
                          Son başvuru: <time dateTime={burs.applicationDeadline}>{sonTarih}</time>
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        ))}
      <div className="mt-1">
        <a
          href="/burslar"
          onClick={(olay) => {
            if (!solTik(olay)) return;
            olay.preventDefault();
            onNavigate('/burslar');
          }}
          className={BAGLANTI}
        >
          Burslara göz at
          <ArrowRight aria-hidden className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
};

export const KampusumPaneli: React.FC<{
  /** Bakan öğrencinin profili (App'teki `student`); burs uygunluğu buradan. */
  ogrenci: StudentProfile | null;
  onNavigate: (yol: string) => void;
  /**
   * `/cv`de düzenleme aynı ekranda açılıyor; orada adrese gitmek yerine
   * bu çağrılıyor. Verilmezse bağlantı `/cv#universite`e gidiyor.
   */
  onUniversiteEkle?: () => void;
  /**
   * 'sutun': sol sütun kartı; 'akis': ana sütunda, profil kartının altında;
   * 'sayfa': bağımsız /kampusum sayfası (yalnız görünüm farklı).
   */
  yerlesim: Yerlesim;
  /** Verilirse bakanın değil, bu kullanıcı adının kampüsü gösteriliyor. */
  kullaniciAdi?: string;
}> = ({ ogrenci, onNavigate, onUniversiteEkle, yerlesim, kullaniciAdi }) => {
  const kimlik = React.useId();
  const baskasi = Boolean(kullaniciAdi);
  /* `null`: başkasının kampüsü kapıdan geçmedi (profil yok ya da görünmüyor). */
  const [kampus, setKampus] = React.useState<Yukleme<(Kampusum & { kisi?: { kullaniciAdi: string; ad: string | null } }) | null>>({
    durum: 'yukleniyor',
  });
  const [kampusDeneme, setKampusDeneme] = React.useState(0);
  const [burslar, setBurslar] = React.useState<Yukleme<Opportunity[]>>({ durum: 'yukleniyor' });
  const [bursDeneme, setBursDeneme] = React.useState(0);

  React.useEffect(() => {
    let iptal = false;
    setKampus({ durum: 'yukleniyor' });
    (kullaniciAdi ? kampusProfiliGetir(kullaniciAdi) : kampusumuGetir())
      .then((veri) => {
        if (!iptal) setKampus({ durum: 'hazir', veri });
      })
      .catch(() => {
        if (!iptal) setKampus({ durum: 'hata' });
      });
    return () => {
      iptal = true;
    };
  }, [kampusDeneme, kullaniciAdi]);

  React.useEffect(() => {
    /* Başkasının kampüsünde burs bölümü yok; liste hiç istenmiyor. */
    if (baskasi) return;
    let iptal = false;
    setBurslar({ durum: 'yukleniyor' });
    fetchOpportunities()
      .then((veri) => {
        if (!iptal) setBurslar({ durum: 'hazir', veri });
      })
      .catch(() => {
        if (!iptal) setBurslar({ durum: 'hata' });
      });
    return () => {
      iptal = true;
    };
  }, [bursDeneme, baskasi]);

  const veri = kampus.durum === 'hazir' ? kampus.veri : null;
  const okulAdi = veri ? (veri.universite?.ad ?? veri.ogrenciOkulu) : null;
  const kisiAdi = veri?.kisi ? (veri.kisi.ad?.trim() || `@${veri.kisi.kullaniciAdi}`) : null;
  const profilYolu = veri?.kisi ? `/profil/${veri.kisi.kullaniciAdi}` : null;
  const sayfa = yerlesim === 'sayfa';
  const stil = sayfa ? SAYFA : PANEL;
  /* Başlığın hemen altındaki durum cümleleri (okul yok, kaynak yok, hata). */
  const durumKabi = sayfa ? 'mt-4' : BOLUM;
  const altSatir = sayfa
    ? 'mt-1 flex items-start gap-1.5 text-[15px] leading-[22px] text-slate-700'
    : 'mt-1 flex items-start gap-1.5 text-sm text-gray-600';
  const altSatirIkonu = sayfa ? 'mt-[3px] h-4 w-4 shrink-0 text-gray-500' : 'mt-0.5 h-4 w-4 shrink-0 text-gray-500';

  return (
    <section aria-labelledby={`${kimlik}-baslik`} aria-busy={kampus.durum === 'yukleniyor'} className={KAP[yerlesim]}>
      {/*
        SAYFA BAŞLIĞI (25 Eylül 2026): 22/28 ve altında yalnız okul adı —
        "Senin üniversiten ·" tekrarı sayfada kalktı (başlık zaten
        "Kampüsüm"). Uzun ad `break-words` ile satıra akıyor, kırpılmıyor.
        Profil panelindeki başlık aynı kaldı.
      */}
      <h2
        id={`${kimlik}-baslik`}
        className={
          sayfa
            ? 'text-[22px] font-extrabold leading-7 tracking-tight text-slate-900'
            : 'text-lg font-extrabold tracking-tight text-gray-900'
        }
      >
        {baskasi ? 'Kampüs' : 'Kampüsüm'}
      </h2>
      {kampus.durum === 'yukleniyor' && <Iskelet className="mt-1.5 h-4 w-48" />}
      {okulAdi && !baskasi && (
        <p className={altSatir}>
          <GraduationCap aria-hidden className={altSatirIkonu} />
          {sayfa ? (
            <span className="min-w-0 break-words font-medium">{okulAdi}</span>
          ) : (
            <span className="min-w-0">
              Senin üniversiten · <span className="font-semibold text-gray-800">{okulAdi}</span>
            </span>
          )}
        </p>
      )}
      {okulAdi && kisiAdi && profilYolu && (
        <p className={altSatir}>
          <GraduationCap aria-hidden className={altSatirIkonu} />
          <span className="min-w-0 break-words">
            <a
              href={profilYolu}
              onClick={(olay) => {
                if (!solTik(olay)) return;
                olay.preventDefault();
                onNavigate(profilYolu);
              }}
              className={`rounded font-semibold text-blue-700 hover:text-blue-800 ${RENK_GECISI} ${ODAK_HALKASI}`}
            >
              {kisiAdi}
            </a>
            {' · '}
            <span className="font-semibold text-gray-800">{okulAdi}</span>
          </span>
        </p>
      )}

      {kampus.durum === 'hazir' && kampus.veri === null && (
        <div className={durumKabi}>
          <p className={stil.aciklama}>Bu kişinin okul bilgisi görünmüyor.</p>
          <a
            href="/kampusum"
            onClick={(olay) => {
              if (!solTik(olay)) return;
              olay.preventDefault();
              onNavigate('/kampusum');
            }}
            className={BAGLANTI}
          >
            Kendi kampüsüne dön
            <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </div>
      )}

      {kampus.durum === 'yukleniyor' && (
        <>
          <BolumIskeleti kap={sayfa ? SAYFA.yemekKabi : BOLUM} />
          <BolumIskeleti kap={sayfa ? SAYFA.bolum : BOLUM} />
        </>
      )}

      {kampus.durum === 'hata' && (
        <div role="alert" className={`${durumKabi} space-y-2`}>
          <p className={stil.aciklama}>Kampüs bilgileri alınamadı.</p>
          <button type="button" onClick={() => setKampusDeneme((n) => n + 1)} className={DUGME}>
            Yeniden dene
          </button>
        </div>
      )}

      {veri && !baskasi && !veri.ogrenciOkulu && (
        <div className={durumKabi}>
          <p className={stil.aciklama}>Profilinde üniversite yazmıyor.</p>
          <a
            href={UNIVERSITE_EKLE_YOLU}
            onClick={(olay) => {
              if (!solTik(olay)) return;
              olay.preventDefault();
              if (onUniversiteEkle) onUniversiteEkle();
              else onNavigate(UNIVERSITE_EKLE_YOLU);
            }}
            className={BAGLANTI}
          >
            Üniversiteni ekle
            <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </div>
      )}

      {/*
        Katalogda olup iki kaynağı da tanımsız okul (ör. Nişantaşı) da
        "kaynak yok": aksi hâlde panel yalnız başlıkla boş kalıyordu.
      */}
      {veri && veri.ogrenciOkulu && (!veri.universite || (!veri.menuKaynagi && !veri.duyuruKaynagi)) && (
        <p className={`${durumKabi} ${stil.aciklama}`}>
          Bu okul için yemek menüsünün ve duyuruların resmî kaynağı henüz eklenmedi.
        </p>
      )}

      {veri && veri.universite && veri.menuKaynagi && (
        <YemekBolumu veri={veri} kaynak={veri.menuKaynagi} kimlik={`${kimlik}-yemek`} stil={stil} />
      )}
      {veri && veri.universite && veri.duyuruKaynagi && (
        <DuyuruBolumu veri={veri} kaynak={veri.duyuruKaynagi} kimlik={`${kimlik}-duyuru`} stil={stil} />
      )}

      {!baskasi && (
        <BursBolumu
          burslar={burslar}
          ogrenci={ogrenci}
          onYenidenDene={() => setBursDeneme((n) => n + 1)}
          onNavigate={onNavigate}
          kimlik={`${kimlik}-burs`}
          stil={stil}
        />
      )}
    </section>
  );
};
