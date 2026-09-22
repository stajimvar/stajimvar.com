import React from 'react';
import { BadgeCheck, Lock, Plus, ShieldCheck } from 'lucide-react';
import {
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_KENAR_VURGU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { SirketAdaylar } from './SirketAdaylar';
import { IlanFormu } from './IlanFormu';
import { AdayIzgarasi } from './AdayIzgarasi';
import type { Iletisim } from './AdayCekmecesi';
import { GenelBakis } from './GenelBakis';
import { CikisDugmesi, SirketProfili } from './SirketProfili';
import type { AdayOzeti } from './IlanKarti';
import { KADEME, adayGorebilir } from '../lib/sirket-kademe.mjs';
import { kartVerisi } from '../lib/aday-kart.mjs';
import {
  adayYetenekleri,
  basvuruDurumuDegistir,
  mulakatTarihiYaz,
  teklifGonder,
  gorusmeyeDavetEt,
  basvuruIletisimi,
  basvuruNotuKaydet,
  ilanDurumuDegistir,
  ilanGuncelle,
  ilanSil,
  ilanKaydet,
  sirketBaglami,
  sirketBasvurulari,
  sirketIlanlari,
  sirketProfiliOku,
  type SirketBaglami,
  type SirketProfilDegeri,
} from '../lib/sirket-veri';

/**
 * Şirket hesabının /sirket/* içerikleri — kabuksuz.
 *
 * TEK KABUK (kullanıcı kararı, 18 Eylül 2026)
 * -------------------------------------------
 * Bu bileşen eskiden kendi üst çubuğunu ve alt menüsünü (SirketKabugu)
 * çiziyor, App onu TAM SAYFA yerleştiriyordu: Header ve alt menü yoktu.
 * Ayrı işveren paneli kalktı; şirket hesabı öğrenciyle aynı kabuğu
 * (Header + İlanlar · Başvuranlar · Ağım · Rehber · Profil) kullanıyor.
 * Burası artık yalnız sekme İÇERİĞİNİ döndürüyor; App `icerikSayfasi`
 * ile öteki sayfalar gibi kabuğun içine koyuyor.
 *
 * ÜÇ SEKME, ÜÇ EKRAN
 * ------------------
 * Başvuranlar (/sirket/basvuranlar) 18 Eylül 2026'ya kadar İlanlar'ın
 * içinde bölümlü kontrolle (src/ui/Tabs) geçilen ikinci görünümdü:
 * şirketin asıl işi iki dokunuş uzaktaydı. Kabuktaki Fırsatlar sekmesi
 * şirkete işe yaramayınca (salt okunur burs listesi) o yer Başvuranlar
 * oldu; bölümlü kontrol kalktı, iki ekran iki sekme. İlanlar
 * (/sirket/ilanlar) yalnız ilan listesi. Profil (/sirket/profil) şirket
 * sayfası — kimlik, üç sayaç, Paylaşımlar · İlanlar · Hakkımızda;
 * düzenleme /sirket/profil/duzenle (SirketProfili). İlan formu
 * (/sirket/ilan/yeni, /sirket/ilan/<id>/duzenle) kendi ekranı. Eski
 * "Genel" sekmesi kalktı; /sirket → /sirket/ilanlar.
 *
 * KADEME 1 BAŞVURANLARI GÖREMİYOR
 * -------------------------------
 * Görünüm duruyor ama kart yok; yerine ne yapılacağı yazıyor. Görünümü
 * tamamen gizlemek, doğrulamanın var olduğunu da gizlerdi.
 *
 * Asıl kapı burada değil, veritabanında: `applications` SELECT politikası
 * şirketin doğrulanmış olmasını da soruyor. Bu ekran kapatılsa bile veri
 * gelmiyor.
 *
 * KADEME NUMARASI EKRANDA YAZMIYOR
 * --------------------------------
 * "KADEME 1" kullanıcıya hiçbir şey anlatmıyor — bir oyunun seviyesi gibi
 * duruyor. Yerine ne yapabildiği yazıyor: "İlan açık · kartlar kapalı".
 */

/** Panel adresleri arama motoruna kapalı; burası bir ürün sayfası değil. */
function useNoindex() {
  React.useEffect(() => {
    const etiket = document.createElement('meta');
    etiket.name = 'robots';
    etiket.content = 'noindex, nofollow';
    document.head.appendChild(etiket);
    return () => etiket.remove();
  }, []);
}

/** Kademe pili. Doğrulanmış damgası öğrenci tarafındaki "Resmî kaynak" rozetiyle aynı dil. */
export const DurumRozeti: React.FC<{ baglam: Pick<SirketBaglami, 'dogrulandi'> }> = ({ baglam }) =>
  baglam.dogrulandi ? (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold"
      style={{ borderColor: SIRKET_KENAR_VURGU, background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      Doğrulanmış kurum
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold"
      style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN_IKINCIL }}
    >
      <Lock className="h-3.5 w-3.5" aria-hidden />
      İlan açık · kartlar kapalı
    </span>
  );

export type SirketGorunumu = 'ilanlar' | 'basvuranlar' | 'adaylar';

/** Adresten görünüm; form ve profil ayrı. */
export function sirketEkrani(
  yol: string,
): { tur: 'form'; duzenlenenId: string | null } | { tur: 'profil' } | { tur: SirketGorunumu } {
  if (yol === '/sirket/ilan/yeni') return { tur: 'form', duzenlenenId: null };
  const duzenlenenId = yol.match(/^\/sirket\/ilan\/([0-9a-f-]{36})\/duzenle$/)?.[1] ?? null;
  if (duzenlenenId) return { tur: 'form', duzenlenenId };
  if (yol.startsWith('/sirket/profil')) return { tur: 'profil' };
  if (yol.startsWith('/sirket/adaylar')) return { tur: 'adaylar' };
  if (yol.startsWith('/sirket/basvuranlar')) return { tur: 'basvuranlar' };
  return { tur: 'ilanlar' };
}

export const SirketPaneli: React.FC<{
  yol: string;
  userId: string | null;
  yoneticiMi: boolean;
  onNavigate: (yol: string) => void;
  /* Bildirimden gelindiyse açılacak aday. */
  acilacakAday?: string | null;
  onAdayAcildi?: () => void;
  onCikis?: () => void;
}> = ({ yol, userId, yoneticiMi, onNavigate, acilacakAday, onAdayAcildi, onCikis }) => {
  useNoindex();

  const [baglam, setBaglam] = React.useState<SirketBaglami | null>(null);
  const [ilanlar, setIlanlar] = React.useState<Record<string, unknown>[]>([]);
  const [basvurular, setBasvurular] = React.useState<Record<string, any>[]>([]);
  /*
    Profil alanları eksik-profil satırı ve kimlik kartı için. Okunamazsa
    null kalıyor; satır çizilmiyor, kart "alınamadı" diyor. Panelin
    kendisi bu yüzden düşmüyor.
  */
  const [profil, setProfil] = React.useState<SirketProfilDegeri | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

  const yukle = React.useCallback(async () => {
    setDurum('yukleniyor');
    try {
      const b = await sirketBaglami(userId, yoneticiMi);
      setBaglam(b);

      if (b.companyId) {
        setIlanlar((await sirketIlanlari(b.companyId)) as Record<string, unknown>[]);
        setProfil(await sirketProfiliOku(b.companyId).catch(() => null));

        /*
          Başvurular yalnızca kart görebilen kademede isteniyor. Kademe
          1'de RLS zaten boş dönerdi; yine de istememek doğru: "0 başvuru"
          demek, göremediği bir şeyi yok sanmasına yol açar.
        */
        if (adayGorebilir(b.kademe)) {
          const ham = await sirketBasvurulari(b.companyId);
          const kartlar = await Promise.all(
            ham.map(async (s: Record<string, any>) => {
              const anlikVar = Array.isArray(s.profile_snapshot?.yetenekler);
              const yetenekler = anlikVar ? [] : await adayYetenekleri(String(s.student_id ?? ''));
              return kartVerisi(s, { yetenekler });
            })
          );
          setBasvurular(kartlar);
        } else {
          setBasvurular([]);
        }
      }
      setDurum('hazir');
    } catch {
      setDurum('hata');
    }
  }, [userId, yoneticiMi]);

  React.useEffect(() => {
    void yukle();
  }, [yukle]);

  if (durum === 'yukleniyor' || !baglam) {
    return (
      <div className="space-y-3" aria-busy="true">
        <span className="block h-8 w-48 animate-pulse rounded-lg" style={{ background: SIRKET_ROZET }} />
        <span className="block h-24 w-full animate-pulse rounded-2xl" style={{ background: SIRKET_ROZET }} />
      </div>
    );
  }

  if (durum === 'hata') {
    return (
      <div className="space-y-4">
        <div className={KUTU} style={kutuStil}>
          <p className="font-bold" style={{ color: SIRKET_METIN }}>
            Panel yüklenemedi
          </p>
          <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            Bağlantı kopmuş olabilir. Yeniden denemek sorunu çözmezse sayfayı yenile.
          </p>
          <button
            type="button"
            onClick={() => void yukle()}
            className={`mt-4 ${IKINCIL_DUGME}`}
            style={ikincilStil}
          >
            Yeniden dene
          </button>
        </div>
        {/* Panel düşse de çıkış yolu kapanmasın. */}
        {onCikis && <CikisDugmesi onCikis={onCikis} />}
      </div>
    );
  }

  const ekran = sirketEkrani(yol);

  if (ekran.tur === 'form') {
    /*
      DÜZENLEME AYNI FORMU KULLANIYOR

      İlan formunu ikinci kez yazmak iki kopya demek: doğrulama kuralı ya da
      yeni bir alan birinde değişip diğerinde unutulur. Aynı bileşen, dolu
      başlangıç değerleriyle açılıyor; kaydetme yolu değişiyor.
    */
    const duzenlenenId = ekran.duzenlenenId;
    return (
      <IlanFormu
        kademe={baglam.kademe}
        sirketAdi={baglam.ad}
        siteUrl={baglam.siteUrl}
        eposta={baglam.hrEmail}
        duzenlenenId={duzenlenenId}
        onKaydet={async (satir) => {
          if (duzenlenenId) {
            await ilanGuncelle(duzenlenenId, satir);
            await yukle();
            return { id: duzenlenenId };
          }
          const kayit = await ilanKaydet(satir, baglam.companyId!);
          await yukle();
          return kayit;
        }}
        onIptal={() => onNavigate('/sirket/ilanlar')}
      />
    );
  }

  if (ekran.tur === 'profil') {
    /*
      Profil sekmesi ilan yönetimini de taşıyor (İlanlar sekmesiyle aynı
      kartlar, aynı eylemler); bu yüzden durum/kaldırma geri çağrıları
      aşağıdaki İlanlar sekmesiyle BİREBİR aynı — iki kopya olsaydı biri
      değiştiğinde öteki geride kalırdı.
    */
    return (
      <SirketProfili
        yol={yol}
        baglam={baglam}
        profil={profil}
        ilanlar={ilanlar}
        basvurular={basvurular as AdayOzeti[]}
        userId={userId}
        onKaydedildi={yukle}
        onNavigate={onNavigate}
        onDurum={async (id, d) => {
          await ilanDurumuDegistir(id, d);
          await yukle();
        }}
        onKaldir={async (id, arsivle) => {
          if (arsivle) await ilanDurumuDegistir(id, 'archived');
          else await ilanSil(id);
          await yukle();
        }}
        onCikis={onCikis}
      />
    );
  }

  return (
    <SirketIlanlarSekmesi
      baglam={baglam}
      gorunum={ekran.tur}
      ilanlar={ilanlar}
      basvurular={basvurular}
      profil={profil}
      onNavigate={onNavigate}
      onDurum={async (id, d) => {
        await ilanDurumuDegistir(id, d);
        await yukle();
      }}
      /*
        İki ayrı sonuç, tek eylem: başvurusu olan ilan arşivleniyor
        (veri duruyor), olmayan ilan siliniyor. Karar burada değil
        veritabanında da korunuyor — listings_guard_delete başvurulu
        bir ilanın silinmesini reddediyor.
      */
      onKaldir={async (id, arsivle) => {
        if (arsivle) await ilanDurumuDegistir(id, 'archived');
        else await ilanSil(id);
        await yukle();
      }}
      onBasvuruDurumu={async (id, d) => {
        await basvuruDurumuDegistir(id, d);
        await yukle();
      }}
      onMulakatTarihi={async (id, tarih) => {
        await mulakatTarihiYaz(id, tarih);
        await yukle();
      }}
      /*
        Teklif ve davet durumla BİRLİKTE yazılıyor: iki ayrı yazımda
        arada kalan an, öğrenciye içi boş bir "Teklif aldın" / davet
        gösterirdi.
      */
      onTeklif={async (id, teklif) => {
        await teklifGonder(id, teklif);
        await yukle();
      }}
      onDavet={async (id, davet) => {
        await gorusmeyeDavetEt(id, davet);
        await yukle();
      }}
      onIletisim={(id) => basvuruIletisimi(id)}
      onNot={async (id, metin) => {
        await basvuruNotuKaydet(id, metin);
        await yukle();
      }}
      acilacakAday={acilacakAday}
      onAdayAcildi={onAdayAcildi}
    />
  );
};

/* ------------------------------------------------------ İlanlar sekmesi */

/**
 * İlanlar ve Başvuranlar sekmeleri: `gorunum` hangisinin çizileceğini
 * seçiyor. İkisi tek bileşende, çünkü aynı veriyi (ilanlar +
 * başvurular) ve aynı geri çağrıları paylaşıyor; iki bileşene bölmek
 * on iki prop'u iki yerde tekrar ettirirdi. Bölümlü kontrol YOK: iki
 * görünüm artık kabuğun iki ayrı sekmesi.
 *
 * `export`: geliştirme fikstürü (src/dev/SirketPanelDevFixture) bu
 * sekmeyi Header ve alt menüyle birlikte oturumsuz çiziyor — giriş
 * arkasındaki ekran tarayıcıda hiç görülmeden değişmesin.
 */
export const SirketIlanlarSekmesi: React.FC<{
  baglam: SirketBaglami;
  gorunum: SirketGorunumu;
  ilanlar: Record<string, unknown>[];
  /** Kart görebilen kademede şirketin tüm başvuruları (kart verisi); değilse boş. */
  basvurular: Record<string, any>[];
  profil: SirketProfilDegeri | null;
  onNavigate: (y: string) => void;
  onDurum: (id: string, d: 'published' | 'closed') => Promise<void>;
  onKaldir: (id: string, arsivle: boolean) => Promise<void>;
  onBasvuruDurumu: (id: string, d: string) => Promise<void>;
  onMulakatTarihi: (id: string, tarih: string) => Promise<void>;
  onTeklif: (id: string, teklif: { not: string; baslangic: string; ucret: string }) => Promise<void>;
  onDavet: (
    id: string,
    davet: { tarih: string; saat: string; tur: string; yer: string; not: string },
  ) => Promise<void>;
  onIletisim: (id: string) => Promise<Iletisim | null>;
  onNot: (id: string, metin: string) => Promise<void>;
  acilacakAday?: string | null;
  onAdayAcildi?: () => void;
  /** Fikstürün sabit "bugün"ü; üretimde verilmiyor. */
  simdi?: Date;
}> = ({
  baglam,
  gorunum,
  ilanlar,
  basvurular,
  profil,
  onNavigate,
  onDurum,
  onKaldir,
  onBasvuruDurumu,
  onMulakatTarihi,
  onTeklif,
  onDavet,
  onIletisim,
  onNot,
  acilacakAday,
  onAdayAcildi,
  simdi,
}) => {
  const kartAcik = adayGorebilir(baglam.kademe);
  const yeniToplam = kartAcik ? basvurular.filter((b) => b.durum === 'submitted').length : 0;

  if (gorunum === 'adaylar') {
    /*
      ADAYLAR — BAŞVURANLARDAN AYRI EKRAN

      Başvuran, bir ilana başvurmuş kişi; aday, profilini iş/staj
      listesine kendisi açmış kişi. İkisini tek listede karıştırmak
      "bu kişi bize başvurdu" ile "bu kişi arıyor"u aynı şeye çevirirdi.

      Alt gezinme çubuğuna SEKME EKLENMEDİ: orada zaten beş öğe var ve
      genişlikleri 320 px için ölçülmüş. Altıncı öğe o ölçümü bozardı;
      giriş Başvuranlar ekranının üstünden veriliyor.
    */
    return <SirketAdaylar />;
  }

  if (gorunum === 'basvuranlar') {
    return (
      <Basvuranlar
        baglam={baglam}
        kartlar={basvurular}
        ilanlar={ilanlar}
        onNavigate={onNavigate}
        onDurum={onBasvuruDurumu}
        onMulakatTarihi={onMulakatTarihi}
        onTeklif={onTeklif}
        onDavet={onDavet}
        onIletisim={onIletisim}
        onNot={onNot}
        acilacakAday={acilacakAday}
        onAdayAcildi={onAdayAcildi}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/*
            Şirket adı yoksa başlık "İlanlar". "Şirketin" yazsaydı hem
            kimsenin şirketinin adı olmazdı hem de sayfanın ne olduğunu
            söylemezdi.
          */}
          <h1 className="truncate text-2xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
            {baglam.ad || 'İlanlar'}
          </h1>
          {/*
            Alt satır gerçek sayılar ve kademe pili. Başvuru sayısı yalnız
            kart görebilen kademede ve sıfırdan büyükse — "0 yeni başvuru"
            bir bilgi değil, gürültü. Pil her genişlikte burada: üst
            çubuk artık ortak kabuk ve kademeyi bilmiyor.
          */}
          <p
            className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            <span>
              {ilanlar.length} ilan
              {yeniToplam > 0 ? ` · ${yeniToplam} yeni başvuru` : ''}
            </span>
            <DurumRozeti baglam={baglam} />
          </p>
        </div>

        {/*
          ANA EYLEM SEKMENİN BAŞINDA

          Eski kabukta üst çubuktaydı; ortak Header'a şirkete özel düğme
          konmadı. Sekmenin tek asıl işi ilan açmak; liste uzun olsa da
          düğme ilk ekranda. Listenin sonundaki kesikli kart da aynı yere
          gidiyor. Dar ekranda yalnız ikon; dokunma hedefi 48 px.
        */}
        <button
          type="button"
          onClick={() => onNavigate('/sirket/ilan/yeni')}
          aria-label="Yeni ilan oluştur"
          className={`${BIRINCIL_DUGME} shrink-0 px-3 sm:px-5`}
          style={birincilStil}
        >
          <Plus className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">Yeni ilan</span>
        </button>
      </div>

      <GenelBakis
        baglam={baglam}
        ilanlar={ilanlar}
        basvurular={basvurular as AdayOzeti[]}
        profil={profil}
        onNavigate={onNavigate}
        onDurum={onDurum}
        onKaldir={onKaldir}
        simdi={simdi}
      />
    </div>
  );
};

/* --------------------------------------------------------- başvuranlar */

const Basvuranlar: React.FC<{
  baglam: SirketBaglami;
  kartlar: Record<string, any>[];
  ilanlar: Record<string, unknown>[];
  onNavigate: (y: string) => void;
  onDurum: (id: string, d: string) => Promise<void>;
  onMulakatTarihi: (id: string, tarih: string) => Promise<void>;
  onTeklif: (id: string, teklif: { not: string; baslangic: string; ucret: string }) => Promise<void>;
  onDavet: (id: string, davet: { tarih: string; saat: string; tur: string; yer: string; not: string }) => Promise<void>;
  onIletisim: (id: string) => Promise<Iletisim | null>;
  acilacakAday?: string | null;
  onAdayAcildi?: () => void;
  onNot: (id: string, metin: string) => Promise<void>;
}> = ({
  baglam,
  kartlar,
  ilanlar,
  onNavigate,
  onDurum,
  onMulakatTarihi,
  onTeklif,
  onDavet,
  onIletisim,
  acilacakAday,
  onAdayAcildi,
  onNot,
}) => {
  const kartAcik = adayGorebilir(baglam.kademe);

  /*
    SAYFANIN KENDİ BAŞLIĞI

    Başvuranlar artık kabuğun bir sekmesi; başlığı İlanlar'ın şirket
    adından ödünç almıyor. `h1` burada, üç durumda da (kapalı kademe,
    boş liste, dolu liste) aynı yerde — yalnız dolu listede başlık
    çizilseydi kademe 1'deki şirket sayfanın adını hiç görmezdi.
    Alt satır gerçek sayı ve kademe pili; sayı yalnız kart görebilen
    kademede, çünkü öteki kademede bilinmiyor ("0 aday" yalan olurdu).
  */
  const baslik = (
    <div className="min-w-0">
      <h1 className="truncate text-2xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
        Başvuranlar
      </h1>
      {/*
        ADAYLAR EKRANINA GİRİŞ

        Başvuran ile aday farklı: başvuran bir ilana başvurmuş kişi, aday
        profilini iş/staj listesine kendisi açmış kişi. İkisi ayrı ekran
        ama giriş buradan veriliyor — alt gezinme çubuğunda zaten beş öğe
        var ve genişlikleri 320 px için ölçülmüş; altıncı öğe o ölçümü
        bozardı.
      */}
      <button
        type="button"
        onClick={() => onNavigate('/sirket/adaylar')}
        className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
      >
        İş ve staj arayan öğrenciler
        <span aria-hidden>→</span>
      </button>
      <p
        className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
        style={{ color: SIRKET_METIN_IKINCIL }}
      >
        {kartAcik && <span>{kartlar.length} aday</span>}
        <DurumRozeti baglam={baglam} />
      </p>
    </div>
  );

  if (!kartAcik) {
    return (
      <div className="space-y-4">
        {baslik}
        <div className={KUTU} style={kutuStil}>
          <p
            className="flex items-center gap-2 text-lg font-extrabold"
            style={{ color: SIRKET_METIN }}
          >
            <Lock className="h-5 w-5" aria-hidden style={{ color: SIRKET_VURGU_KOYU }} />
            Başvuran bilgileri kapalı
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
            İlan asmak ile öğrenci bilgisi görmek ayrı iki yetki. Öğrencinin adı, okulu ve
            projelerini görebilmek için şirketin doğrulanması gerekiyor — bu, bilgilerini bize
            emanet eden öğrenciye verdiğimiz söz.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/sirket/profil')}
            className={`mt-4 ${BIRINCIL_DUGME}`}
            style={birincilStil}
          >
            <ShieldCheck className="h-5 w-5" aria-hidden />
            Şirketini doğrula
          </button>
        </div>
      </div>
    );
  }

  const yayindaki = ilanlar.find((i) => i.status === 'published');
  const ilanAdresi =
    yayindaki && typeof window !== 'undefined'
      ? `${window.location.origin}/ilan/${String(yayindaki.id)}`
      : null;

  /*
    İLAN KARTINDAN GELEN SÜZGEÇ

    Karttaki "Adaylar" düğmesi buraya `?ilan=<id>` ile geliyor. Rota
    durumu yalnız yolu tutuyor (App.navigate), sorgu adresten okunuyor —
    öğrenci tarafındaki süzgeçlerle aynı kural.
  */
  const baslangicIlan =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('ilan')
      : null;

  return (
    /*
      BAŞLIK BİR KEZ: sayfanın `h1`'i yukarıda; AdayIzgarasi kendi
      "Başvuranlar" başlığını ÇİZMİYOR (`basliksiz`), yoksa aynı sözcük
      alt alta iki kez okunurdu. Süzülmüş sayı ("3 / 12 aday") ızgarada
      kalıyor — o süzgecin durumu, sayfanın değil.
    */
    <div className="space-y-4">
      {baslik}
      <AdayIzgarasi
        basliksiz
        kartlar={kartlar}
        ilanAdresi={ilanAdresi}
        baslangicIlan={baslangicIlan}
        onNavigate={onNavigate}
        onDurum={onDurum}
        onMulakatTarihi={onMulakatTarihi}
        onTeklif={onTeklif}
        onDavet={onDavet}
        onIletisim={onIletisim}
        acilacakAday={acilacakAday}
        onAdayAcildi={onAdayAcildi}
        onNot={onNot}
      />
    </div>
  );
};

export { KADEME };
