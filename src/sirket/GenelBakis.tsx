import React from 'react';
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { IlanKarti, KontrolNotu, type AdayOzeti } from './IlanKarti';
import { ilanEylemleri } from '../lib/ilan-formu.mjs';
import { YAYIN_SONUCU_METNI } from '../lib/ilan-kontrol-gorunumu.mjs';
import { adayGorebilir } from '../lib/sirket-kademe.mjs';
import type { BekleyenAday, IlanKontrolSonucu, SirketBaglami, SirketProfilDegeri } from '../lib/sirket-veri';
import { ilanBekleyenAdaylar } from '../lib/sirket-veri';
import { durumAdi } from '../lib/basvuru-durumu.mjs';

/**
 * Şirketin İlanlar sekmesi — ilan-merkezli kart listesi.
 *
 * GÖSTERGE TAHTASI DEĞİL, İLANLARIN KENDİSİ
 * -----------------------------------------
 * Önce sayı karoları, sonra "sıradaki iş" kutusu ve ayrı bir ilan listesi
 * vardı. İK'nın 2 saniyede görmek istediği şey tek: hangi ilanımda kim
 * bekliyor. Bu yüzden ekran ilan kartlarından ibaret; her kart kendi
 * yeni başvuranlarını taşıyor ve bir dokunuşla o adaylara gidiyor.
 *
 * GENEL VE İLANLAR TEK EKRAN OLDU (18 Eylül 2026)
 * -----------------------------------------------
 * Panelde "Genel" ve "İlanlar" diye iki sekme vardı ve ikisi de aynı
 * kartı çiziyordu; fark yalnız sağdaki yönetim eylemleriydi (Kapat /
 * Yayınla, arşivle-sil menüsü, inceleme notu). Tek kabuğa geçince
 * "Genel" sekmesi kalktı; yönetim eylemleri bu listeye taşındı ve
 * `onDurum` / `onKaldir` verildiğinde çiziliyor. Vermeyen çağıran
 * (örneğin salt okunur bir görünüm) yalnız Adaylar / Düzenle görür.
 *
 * BAŞLIK BURADA DEĞİL
 * -------------------
 * Sekmenin başlığı, ilan sayısı ve kademe pili sekme kabuğunda
 * (SirketPaneli → SirketIlanlarSekmesi): İlanlar ve Başvuranlar
 * görünümleri aynı başlığı paylaşıyor, iki kez yazılmasın.
 *
 * PROFİL UYARISI TEK SATIR, VE YALNIZ EKSİKSE
 * -------------------------------------------
 * Öğrenci ilana bakmadan önce şirket sayfasını görüyor; logosu,
 * açıklaması ya da sitesi olmayan şirket "bu gerçek mi" sorusunu
 * doğuruyor. Eksik yoksa satır HİÇ çizilmiyor — "profilin tamam" demek
 * için yer harcamıyoruz. Profil okunamadıysa da çizilmiyor: bilmediğimiz
 * bir eksik iddia edilmez.
 *
 * SAHTE SAYI YOK
 * --------------
 * Görüntülenme, dönüşüm, "bu hafta %12" yok — veri modelinde yok.
 * Karttaki her sayı `applications` satırlarından.
 */

/** Uyarılan üç alan: öğrencinin şirket sayfasında ilk gördükleri. */
const PROFIL_EKSIK_ADLARI: Partial<Record<keyof SirketProfilDegeri, string>> = {
  logoUrl: 'logo',
  description: 'açıklama',
  websiteUrl: 'web sitesi',
};

export function profilEksikleri(profil: SirketProfilDegeri | null): string[] {
  if (!profil) return [];
  return (Object.keys(PROFIL_EKSIK_ADLARI) as (keyof SirketProfilDegeri)[])
    .filter((alan) => !String(profil[alan] ?? '').trim())
    .map((alan) => PROFIL_EKSIK_ADLARI[alan] as string);
}

/** İlk ilandan önce: yalnız var olan sayfalar (bkz. boş durum). */
const BASLANGIC_ADIMLARI = [
  { etiket: 'Şirket profilini gözden geçir', yol: '/sirket/profil', ikon: Building2 },
  { etiket: 'İyi bir staj ilanı nasıl yazılır?', yol: '/rehber/iyi-staj-ilani-nasil-yazilir', ikon: FileText },
  {
    etiket: 'Zorunlu stajda işverenin yükümlülükleri',
    yol: '/rehber/zorunlu-staj-isverenin-yukumlulukleri',
    ikon: ShieldCheck,
  },
] as const;

export const GenelBakis: React.FC<{
  baglam: SirketBaglami;
  ilanlar: Record<string, unknown>[];
  basvurular: AdayOzeti[];
  /** `null` = henüz okunmadı ya da okunamadı; uyarı satırı çizilmez. */
  profil: SirketProfilDegeri | null;
  onNavigate: (yol: string) => void;
  /**
   * Kapat / Yayına gönder / Yeniden yayınla. Verilmezse düğme çizilmiyor.
   * Yayına göndermede sunucunun kontrol sonucunu döndürüyor; kart onu
   * okuyup ne olduğunu yazıyor ("Yayınla"ya basmak artık yayın sözü değil).
   */
  onDurum?: (id: string, d: 'published' | 'closed') => Promise<IlanKontrolSonucu | void>;
  /** Arşivle ya da sil. Verilmezse taşma menüsü çizilmiyor. */
  onKaldir?: (id: string, arsivle: boolean) => Promise<void>;
  simdi?: Date;
  /**
   * İlanlar sayfasındaki sıra (IlanSiralamasi). İlan yokken ilk eylem
   * satırının hemen altında, "Başlamadan önce"nin üstünde; ilan varken
   * listenin sonunda (27 Eylül 2026, kullanıcı kararı).
   */
  siralama?: React.ReactNode;
  /*
    BEKLEYEN ADAY OKUYUCUSU DIŞARIDAN VERİLEBİLİYOR

    Varsayılan gerçek okuma (`ilanBekleyenAdaylar`). Geliştirme
    fikstürü kendi okuyucusunu geçirip kapanış onayını ve okuma
    hatasını oturum açmadan sınayabiliyor — bu akış yoksa tarayıcıda
    hiç görülemiyordu.
  */
  onBekleyenAdaylar?: (ilanId: string) => Promise<BekleyenAday[]>;
}> = ({
  baglam,
  ilanlar,
  basvurular,
  profil,
  onNavigate,
  onDurum,
  onKaldir,
  simdi,
  siralama,
  onBekleyenAdaylar = ilanBekleyenAdaylar,
}) => {
  const kartAcik = adayGorebilir(baglam.kademe);
  const eksikler = profilEksikleri(profil);

  /* Yanlışlıkla basmaya açık olmasın: kaldırma iki adımda. */
  const [kaldirilacak, setKaldirilacak] = React.useState<{
    id: string;
    baslik: string;
    basvuruSayisi: number;
    arsivlenecek: boolean;
  } | null>(null);
  const [kaldiriliyor, setKaldiriliyor] = React.useState(false);
  const [acikMenu, setAcikMenu] = React.useState<string | null>(null);
  const [kaldirmaHatasi, setKaldirmaHatasi] = React.useState('');

  /*
    DURUM EYLEMİNİN SONUCU KARTTA

    Eskiden `void onDurum(...)` idi: hata yutuluyor, düğmeye basan
    şirket hiçbir şey görmüyordu. Yayına alma sunucuda kontrolden
    geçtiği için artık sonuç üç ayrı şey olabiliyor (yayında / düzeltme /
    inceleme); kart hangisi olduğunu yazıyor. Kilit ref'te: iki hızlı
    dokunuş, durum güncellenmeden ikinci isteği göndermesin.
  */
  const [durumIslemi, setDurumIslemi] = React.useState<{ id: string; hedef: 'published' | 'closed' } | null>(null);
  const [durumSonucu, setDurumSonucu] = React.useState<{ id: string; metin: string; hata: boolean } | null>(null);
  const durumKilidi = React.useRef(false);
  /*
    İLAN KAPANIRKEN SONUCU BEKLEYENLER (20261126010000)

    Kapatma, bekleyen başvuruları KENDİLİĞİNDEN REDDETMİYOR — red,
    şirketin verdiği ve öğrenciye öyle görünen bir karar; sistemin
    verdiği red, kimsenin arkasında durmadığı bir karardır.

    Bu yüzden kapatmadan önce bekleyenler GÖSTERİLİYOR ve şirket
    onaylıyor. Onaydan sonra ilan kapanıyor, başvurular olduğu gibi
    kalıyor ve panoda sonuçlandırılmayı beklemeye devam ediyor.
  */
  const [kapanisOnayi, setKapanisOnayi] = React.useState<
    { id: string; bekleyenler: BekleyenAday[] } | null
  >(null);

  /*
    OKUMA HATASI AYRI BİR DURUM (5 Ekim 2026 düzeltmesi)

    "Bekleyen aday yok" ile "adaylar okunamadı" aynı şey değil. Önce
    ikisi de boş listeye düşüyordu ve ilan, bekleyen adaylar hiç
    sorulmadan kapanıyordu — koruma tam da gerektiği anda sessizce
    devre dışı kalıyordu.

    Artık okuma başarısızsa KAPATMA YAPILMIYOR; hata yazılıyor ve
    yeniden deneme sunuluyor. Kapatmak geri alınabilir bir işlem ama
    adaya giden sonucu etkiliyor; eksik bilgiyle yapılmamalı.
  */
  const [kapanisHatasi, setKapanisHatasi] = React.useState<string | null>(null);
  /* Okuma sürerken düğme bekliyor görünsün; sessiz bir duraklama olmasın. */
  const [kapanisOkunuyor, setKapanisOkunuyor] = React.useState<string | null>(null);

  const kapatmayiBaslat = async (id: string) => {
    setKapanisHatasi(null);
    setKapanisOkunuyor(id);
    let bekleyenler: BekleyenAday[];
    try {
      bekleyenler = await onBekleyenAdaylar(id);
    } catch {
      /* KAPATMA DURDU: bekleyen adayları görmeden karar verilmiyor. */
      setKapanisHatasi(id);
      return;
    } finally {
      setKapanisOkunuyor(null);
    }
    if (bekleyenler.length === 0) {
      /* Bekleyen GERÇEKTEN yok — okuma başarılı oldu ve boş döndü. */
      void durumDegistir(id, 'closed');
      return;
    }
    setKapanisOnayi({ id, bekleyenler });
  };

  const durumDegistir = async (id: string, hedef: 'published' | 'closed') => {
    if (!onDurum || durumKilidi.current) return;
    durumKilidi.current = true;
    setDurumIslemi({ id, hedef });
    setDurumSonucu(null);
    try {
      const sonuc = await onDurum(id, hedef);
      if (hedef === 'published' && sonuc) {
        setDurumSonucu({ id, metin: YAYIN_SONUCU_METNI[sonuc.durum] ?? '', hata: false });
      }
    } catch (e) {
      setDurumSonucu({ id, metin: e instanceof Error ? e.message : 'İşlem tamamlanamadı.', hata: true });
    } finally {
      durumKilidi.current = false;
      setDurumIslemi(null);
    }
  };

  /*
    0 İLAN: TEK KART, BAŞKA HİÇBİR ŞEY

    Profil uyarısı bile yok: ilanı olmayan şirketin ilk işi ilan açmak,
    ikinci işi değil.
  */
  if (ilanlar.length === 0) {
    return (
      <div className="space-y-4">
        {/*
          TEK BİRİNCİL EYLEM (26 Eylül 2026): sayfada ilan oluşturan tek
          düğme bu; üstteki "+" ilan yokken çizilmiyor (SirketPaneli).

          İNCE SATIR (27 Eylül 2026, kullanıcı kararı): ortalanmış büyük
          kart yerine yatay satır — simge, başlık ve kısa açıklama yan yana,
          düğme sm üstünde sağda, telefonda altta tam genişlik. Böylece
          öteki şirketlerin ilanları (sıra) ilk ekrana giriyor.
        */}
        <div
          className="flex flex-col gap-3 rounded-2xl border p-4 shadow-xs sm:flex-row sm:items-center"
          style={kutuStil}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
            >
              <Briefcase className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold leading-snug" style={{ color: SIRKET_METIN }}>
                İlk ilanınızı oluşturun
              </h2>
              <p className="text-sm leading-snug" style={{ color: SIRKET_METIN_IKINCIL }}>
                Pozisyonu ve çalışma koşullarını ekleyin, öğrencilerle buluşun.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/sirket/ilan/yeni')}
            className={`w-full shrink-0 sm:w-auto ${BIRINCIL_DUGME}`}
            style={birincilStil}
          >
            <Plus className="h-5 w-5" aria-hidden />
            İlan oluştur
          </button>
        </div>

        {siralama}

        {/*
          BAŞLAMADAN ÖNCE — YALNIZ ÇALIŞAN YOLLAR

          Her satır var olan bir sayfaya gidiyor: şirket profili ve iki
          gerçek işveren rehberi (src/data/rehber-yazilari/isveren.tsx).
          Başlıklar rehberlerin kendi adları. Tasarımdaki "Yayın öncesi
          önizle" BİLEREK YOK: ilan formunda önizleme adımı yok, olmayan
          bir işe bağlantı konmuyor.
        */}
        <section aria-labelledby="baslamadan-once" className={KUTU} style={kutuStil}>
          <h2 id="baslamadan-once" className="font-extrabold" style={{ color: SIRKET_METIN }}>
            Başlamadan önce
          </h2>
          <ul className="mt-1 divide-y divide-gray-100">
            {BASLANGIC_ADIMLARI.map((adim) => (
              <li key={adim.yol}>
                <a
                  href={adim.yol}
                  onClick={(olay) => {
                    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
                    olay.preventDefault();
                    onNavigate(adim.yol);
                  }}
                  className={`flex min-h-14 items-center gap-3 py-2 ${SIRKET_ODAK}`}
                >
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700"
                  >
                    <adim.ikon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold" style={{ color: SIRKET_METIN }}>
                    {adim.etiket}
                  </span>
                  <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {eksikler.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-2.5"
          style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">
            Profilde eksik: {eksikler.join(', ')}. Öğrenci ilana bakmadan önce şirket sayfanı
            görüyor.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/sirket/profil')}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-2 text-sm font-bold underline-offset-2 hover:underline ${SIRKET_ODAK}`}
            style={{ color: '#92400E' }}
          >
            Profili tamamla
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {ilanlar.map((ilan) => {
          const id = String(ilan.id);
          const yayinda = ilan.status === 'published';
          const platformdan = ilan.application_method === 'internal';
          const basvuruSayisi = Number(ilan.applicants_count ?? 0);
          /* Kural tek yerde ve test altında: lib/ilan-formu.mjs. */
          const eylem = ilanEylemleri(ilan);

          return (
            <IlanKarti
              key={id}
              ilan={ilan}
              basvurular={kartAcik ? basvurular.filter((b) => String(b.ilanId ?? '') === id) : null}
              onNavigate={onNavigate}
              /*
                Ad ve logo BAĞLAMDAN: her kart aynı şirketin ilanı, yani
                satırdan okunacak bir şey yok. `baglam.logoUrl` şirket
                okumasının kendisinden geliyor (ikinci sorgu yok); boşsa
                `ListingLogo` baş harfe düşüyor.
              */
              sirketAdi={baglam.ad}
              logoUrl={baglam.logoUrl}
              simdi={simdi}
              /*
                BAŞVURU YOLU ETİKETİ YALNIZCA FARKLIYSA

                Buradan açılan her ilan StajımVar üzerinden başvuru
                alıyor; etiket yalnız AYKIRI durumda: toplama hattından
                gelen ilanda başvuru şirketin kendi sayfasında.
              */
              ekRozet={
                !platformdan ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
                  >
                    <Send className="h-3 w-3" aria-hidden />
                    Kariyer sayfasından
                  </span>
                ) : null
              }
              /*
                KONTROL NOTU — ŞİRKET NEDENİ BURADA OKUYOR

                Düzeltme / inceleme / kontrol hatası gerekçeleri ve eski
                ret notu `KontrolNotu`nda (IlanKarti). Hemen altında son
                durum eyleminin sonucu: `role="status"` ile ekran okuyucu
                da duyuyor. Gerekçe yoksa ve eylem yapılmadıysa hiçbir şey
                çizilmiyor.
              */
              altNot={
                <>
                  <KontrolNotu ilan={ilan} />
                  {durumSonucu?.id === id && durumSonucu.metin && (
                    <p
                      role={durumSonucu.hata ? 'alert' : 'status'}
                      className={`mt-2 text-xs font-semibold leading-relaxed ${
                        durumSonucu.hata ? 'text-rose-700' : ''
                      }`}
                      style={durumSonucu.hata ? undefined : { color: SIRKET_METIN }}
                    >
                      {durumSonucu.metin}
                    </p>
                  )}
                  {/*
                    BEKLEYEN ADAYLAR OKUNAMADI: ilan KAPANMADI ve bu
                    açıkça yazıyor. Kullanıcı ne olduğunu ve ne
                    yapabileceğini aynı satırda görüyor.
                  */}
                  {kapanisHatasi === id && (
                    <p role="alert" className="mt-2 text-xs font-semibold leading-relaxed text-rose-700">
                      Sonucu bekleyen adaylar okunamadı, bu yüzden ilan kapatılmadı.
                      Bağlantını kontrol edip yeniden dene.{' '}
                      <button
                        type="button"
                        onClick={() => void kapatmayiBaslat(id)}
                        className="cursor-pointer font-bold underline underline-offset-2"
                      >
                        Yeniden dene
                      </button>
                    </p>
                  )}
                </>
              }
              ekEylemler={
                <>
                  {onDurum && eylem.durumEtiketi && (
                    <button
                      type="button"
                      onClick={() =>
                        yayinda ? void kapatmayiBaslat(id) : void durumDegistir(id, 'published')
                      }
                      disabled={durumIslemi !== null || kapanisOkunuyor !== null}
                      aria-busy={durumIslemi?.id === id || kapanisOkunuyor === id}
                      className={IKINCIL_DUGME}
                      style={ikincilStil}
                    >
                      {kapanisOkunuyor === id
                        ? 'Bekleyen adaylar okunuyor…'
                        : durumIslemi?.id === id
                          ? durumIslemi.hedef === 'published'
                            ? 'Kontrol ediliyor…'
                            : 'Kapatılıyor…'
                          : eylem.durumEtiketi}
                    </button>
                  )}

                  {/*
                    ÜÇÜNCÜ EYLEM MENÜDE

                    Düzenle ve Yayınla/Kapat görünür kalıyor; seyrek ve
                    geri alınamaz olan kaldırma menüye giriyor.
                  */}
                  {onKaldir && eylem.kaldirilabilir && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setAcikMenu((m) => (m === id ? null : id))}
                        aria-label="Diğer işlemler"
                        aria-expanded={acikMenu === id}
                        className={`${IKINCIL_DUGME} min-w-11`}
                        /* Ölçüldü: yalnız `paddingInline: 10` ile genişlik 38 px'e
                           düşüyordu; dokunma hedefi 44×44 olmalı. */
                        style={{ ...ikincilStil, paddingInline: 10 }}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </button>

                      {acikMenu === id && (
                        <>
                          <span
                            className="fixed inset-0 z-10"
                            onClick={() => setAcikMenu(null)}
                            aria-hidden
                          />
                          <div
                            className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border shadow-lg"
                            style={kutuStil}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setAcikMenu(null);
                                setKaldirilacak({
                                  id,
                                  baslik: String(ilan.title ?? ''),
                                  basvuruSayisi,
                                  arsivlenecek: eylem.arsivlenecek,
                                });
                              }}
                              className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm font-bold hover:bg-gray-50"
                              style={{ color: SIRKET_METIN }}
                            >
                              {eylem.arsivlenecek ? (
                                <Archive className="h-4 w-4" aria-hidden />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden />
                              )}
                              {eylem.arsivlenecek ? 'Arşivle' : 'Sil'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              }
            />
          );
        })}
      </ul>

      {/*
        ONAY — GERÇEK DAVRANIŞI SÖYLÜYOR

        İki ayrı sonuç var ve metin hangisi olduğunu yazıyor: başvurusu
        olan ilan arşivleniyor (veri duruyor), olmayan ilan gerçekten
        siliniyor (geri alınamıyor). "Emin misiniz?" deyip ne olacağını
        söylememek, kullanıcıyı kendi verisi hakkında karanlıkta bırakır.
      */}
      {kaldirilacak && onKaldir && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ilan-kaldir-baslik"
          onClick={() => !kaldiriliyor && setKaldirilacak(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5"
            style={kutuStil}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ilan-kaldir-baslik" className="font-black" style={{ color: SIRKET_METIN }}>
              {kaldirilacak.arsivlenecek ? 'İlanı arşivle' : 'İlanı sil'}
            </h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
              <b style={{ color: SIRKET_METIN }}>{kaldirilacak.baslik}</b>{' '}
              {kaldirilacak.arsivlenecek ? (
                <>
                  ilanına {kaldirilacak.basvuruSayisi} başvuru gelmiş. İlan listenizden
                  kalkacak ama <b style={{ color: SIRKET_METIN }}>başvurular korunacak</b> —
                  adayların kendi başvuru geçmişi de olduğu gibi kalıyor.
                </>
              ) : (
                <>
                  ilanı kalıcı olarak silinecek. Bu ilana hiç başvuru gelmemiş, bu yüzden
                  kaybolacak başka bir kayıt yok. <b style={{ color: SIRKET_METIN }}>Bu işlem
                  geri alınamaz.</b>
                </>
              )}
            </p>

            {kaldirmaHatasi && (
              <p className="mt-3 text-sm font-semibold text-rose-700">{kaldirmaHatasi}</p>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setKaldirilacak(null)}
                disabled={kaldiriliyor}
                className={IKINCIL_DUGME}
                style={ikincilStil}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  setKaldiriliyor(true);
                  setKaldirmaHatasi('');
                  void onKaldir(kaldirilacak.id, kaldirilacak.arsivlenecek)
                    .then(() => setKaldirilacak(null))
                    .catch((e: unknown) =>
                      setKaldirmaHatasi(e instanceof Error ? e.message : 'İşlem tamamlanamadı.')
                    )
                    .finally(() => setKaldiriliyor(false));
                }}
                disabled={kaldiriliyor}
                className={BIRINCIL_DUGME}
                style={birincilStil}
              >
                {kaldiriliyor
                  ? 'Uygulanıyor…'
                  : kaldirilacak.arsivlenecek
                    ? 'Arşivle'
                    : 'Kalıcı olarak sil'}
              </button>
            </div>
          </div>
        </div>
      )}
      {siralama}
      {/*
        KAPANIŞ ONAYI — BEKLEYENLER GÖRÜNÜYOR

        "Kapat"a basınca ilan hemen kapanmıyor: sonucu bekleyen adaylar
        listeleniyor ve şirket ne yaptığını görerek onaylıyor.

        ADAYLAR KENDİLİĞİNDEN REDDEDİLMİYOR ve bu ekranda toplu red
        düğmesi de YOK. Kapanıştan sonra başvurular panoda durmaya devam
        ediyor; her birine ne olacağına şirket tek tek karar veriyor.
      */}
      {kapanisOnayi && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="İlanı kapatma onayı"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        >
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
            <h2 className="text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
              {kapanisOnayi.bekleyenler.length} aday sonuç bekliyor
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
              İlanı kapatmak bu başvuruları reddetmiyor. Kapandıktan sonra da
              Başvurular ekranında durmaya devam edecekler; her birine ne
              olacağına siz karar verirsiniz.
            </p>

            <ul className="mt-3 space-y-1.5">
              {kapanisOnayi.bekleyenler.map((b) => (
                <li
                  key={b.basvuruId}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1" style={{ color: SIRKET_METIN }}>
                    {/*
                      AD YAZILMIYOR: bu ekran şirketin kendi akışında bir
                      ara adım ve aday kimliğini burada açmak, önyargısız
                      inceleme tercihini dolanmak olurdu. Durum ve bekleme
                      süresi kararı vermeye yetiyor.
                    */}
                    {durumAdi(b.durum)}
                  </span>
                  <span className="shrink-0 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                    {b.beklemeGun} gündür
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKapanisOnayi(null)}
                className={`min-h-11 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold hover:bg-gray-50 ${SIRKET_ODAK}`}
                style={{ color: SIRKET_METIN }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = kapanisOnayi.id;
                  setKapanisOnayi(null);
                  void durumDegistir(id, 'closed');
                }}
                className={`min-h-11 cursor-pointer rounded-xl bg-[#2563EB] px-4 text-sm font-bold text-white hover:bg-[#1D4ED8] ${SIRKET_ODAK}`}
              >
                İlanı kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
