import React from 'react';
import { Archive, BadgeCheck, Lock, Pencil, Plus, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { SirketKabugu, type SirketSekmesi } from './SirketKabugu';
import {
  ALAN,
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  alanStil,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { IlanFormu } from './IlanFormu';
import { AdayIzgarasi } from './AdayIzgarasi';
import { SirketProfilFormu } from './SirketProfilFormu';
import { GenelBakis } from './GenelBakis';
import { ilanEylemleri } from '../lib/ilan-formu.mjs';
import { KADEME, adayGorebilir, vknGecerli } from '../lib/sirket-kademe.mjs';
import { kartVerisi } from '../lib/aday-kart.mjs';
import {
  adayYetenekleri,
  basvuruDurumuDegistir,
  basvuruNotuKaydet,
  ilanDurumuDegistir,
  ilanGuncelle,
  ilanOku,
  ilanSil,
  ilanKaydet,
  sirketBaglami,
  sirketBasvurulari,
  sirketIlanlari,
  vknKaydet,
  type SirketBaglami,
} from '../lib/sirket-veri';

/**
 * Şirket paneli.
 *
 * DÖRT İŞ
 * -------
 * İlanlar, Başvuranlar, Şirket, Öğrenci tarafına dönüş. Grafik, huni,
 * ısı haritası yok: gün içinde birkaç dakika ayıran İK'nın bakacağı şey
 * bunlar değil.
 *
 * KADEME 1 BAŞVURANLARI GÖREMİYOR
 * -------------------------------
 * Sekme duruyor ama kart yok; yerine ne yapılacağı yazıyor. Sekmeyi
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

const DurumRozeti: React.FC<{ baglam: SirketBaglami }> = ({ baglam }) =>
  baglam.dogrulandi ? (
    /*
      Doğrulanmış damgası panelde TURUNCU çizgili. Yeşil rozet öğrenci
      tarafının dili; panelde yeşil kullanmak iki dünyanın rengini
      birbirine karıştırırdı.
    */
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold"
      style={{ borderColor: SIRKET_VURGU_KOYU, background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      Doğrulanmış kurum
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold"
      style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN_IKINCIL }}
    >
      <Lock className="h-3.5 w-3.5" />
      İlan açık · kartlar kapalı
    </span>
  );

export const SirketPaneli: React.FC<{
  yol: string;
  userId: string | null;
  yoneticiMi: boolean;
  onNavigate: (yol: string) => void;
  onOgrenciyeDon: () => void;
}> = ({ yol, userId, yoneticiMi, onNavigate, onOgrenciyeDon }) => {
  useNoindex();

  const [baglam, setBaglam] = React.useState<SirketBaglami | null>(null);
  const [ilanlar, setIlanlar] = React.useState<Record<string, unknown>[]>([]);
  const [basvurular, setBasvurular] = React.useState<Record<string, any>[]>([]);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

  const yukle = React.useCallback(async () => {
    setDurum('yukleniyor');
    try {
      const b = await sirketBaglami(userId, yoneticiMi);
      setBaglam(b);

      if (b.companyId) {
        setIlanlar((await sirketIlanlari(b.companyId)) as Record<string, unknown>[]);

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

  const sekme: SirketSekmesi = yol.startsWith('/sirket/basvuranlar')
    ? 'basvuranlar'
    : yol.startsWith('/sirket/profil')
      ? 'sirket'
      : yol.startsWith('/sirket/ilan')
        ? 'ilanlar'
        : 'genel';

  if (durum === 'yukleniyor' || !baglam) {
    return (
      <SirketKabugu secili={sekme} onNavigate={onNavigate} onOgrenciyeDon={onOgrenciyeDon}>
        <div className="space-y-3" aria-busy="true">
          <span
            className="block h-8 w-48 animate-pulse rounded-lg"
            style={{ background: SIRKET_ROZET }}
          />
          <span
            className="block h-24 w-full animate-pulse rounded-2xl"
            style={{ background: SIRKET_ROZET }}
          />
        </div>
      </SirketKabugu>
    );
  }

  if (durum === 'hata') {
    return (
      <SirketKabugu secili={sekme} onNavigate={onNavigate} onOgrenciyeDon={onOgrenciyeDon}>
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
      </SirketKabugu>
    );
  }

  const yeniIlanEkrani = yol === '/sirket/ilan/yeni';
  /*
    DÜZENLEME AYNI FORMU KULLANIYOR

    İlan formunu ikinci kez yazmak iki kopya demek: doğrulama kuralı ya da
    yeni bir alan birinde değişip diğerinde unutulur. Aynı bileşen, dolu
    başlangıç değerleriyle açılıyor; kaydetme yolu değişiyor.
  */
  const duzenlenenId = yol.match(/^\/sirket\/ilan\/([0-9a-f-]{36})\/duzenle$/)?.[1] ?? null;

  return (
    <SirketKabugu
      secili={sekme}
      onNavigate={onNavigate}
      onOgrenciyeDon={onOgrenciyeDon}
      durumRozeti={<DurumRozeti baglam={baglam} />}
    >
      {yeniIlanEkrani || duzenlenenId ? (
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
      ) : sekme === 'genel' ? (
        <GenelBakis
          baglam={baglam}
          ilanlar={ilanlar}
          basvurular={basvurular}
          onNavigate={onNavigate}
        />
      ) : sekme === 'ilanlar' ? (
        <Ilanlar
          baglam={baglam}
          ilanlar={ilanlar}
          basvuruSayisi={basvurular.length}
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
        />
      ) : sekme === 'basvuranlar' ? (
        <Basvuranlar
          baglam={baglam}
          kartlar={basvurular}
          ilanlar={ilanlar}
          onNavigate={onNavigate}
          onDurum={async (id, d) => {
            await basvuruDurumuDegistir(id, d);
            await yukle();
          }}
          onNot={async (id, metin) => {
            await basvuruNotuKaydet(id, metin);
            await yukle();
          }}
        />
      ) : (
        <div className="space-y-5">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
            {baglam.ad || 'Şirket'}
          </h1>
          <SirketProfilFormu baglam={baglam} userId={userId} onKaydedildi={yukle} />
        </div>
      )}
    </SirketKabugu>
  );
};

/* ------------------------------------------------------------- sayılar */

const Sayi: React.FC<{ etiket: string; deger: React.ReactNode; kilitli?: boolean }> = ({
  etiket,
  deger,
  kilitli,
}) => (
  <div className="rounded-2xl border p-3" style={kutuStil}>
    <p
      className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide"
      style={{ color: SIRKET_METIN_IKINCIL }}
    >
      {kilitli && <Lock className="h-3 w-3" />}
      {etiket}
    </p>
    <p
      className="mt-0.5 text-xl font-black"
      style={{ color: kilitli ? SIRKET_METIN_IKINCIL : SIRKET_METIN }}
    >
      {deger}
    </p>
  </div>
);

/* ------------------------------------------------------------- ilanlar */

const Ilanlar: React.FC<{
  baglam: SirketBaglami;
  ilanlar: Record<string, unknown>[];
  basvuruSayisi: number;
  onNavigate: (y: string) => void;
  onDurum: (id: string, d: 'published' | 'closed') => Promise<void>;
  onKaldir: (id: string, arsivle: boolean) => Promise<void>;
}> = ({ baglam, ilanlar, basvuruSayisi, onNavigate, onDurum, onKaldir }) => {
  /* Yanlışlıkla basmaya açık olmasın: kaldırma iki adımda. */
  const [kaldirilacak, setKaldirilacak] = React.useState<{
    id: string;
    baslik: string;
    basvuruSayisi: number;
    arsivlenecek: boolean;
  } | null>(null);
  const [kaldiriliyor, setKaldiriliyor] = React.useState(false);
  const [kaldirmaHatasi, setKaldirmaHatasi] = React.useState('');
  const acik = ilanlar.filter((i) => i.status === 'published').length;
  const taslak = ilanlar.filter((i) => i.status === 'draft').length;
  const kartAcik = adayGorebilir(baglam.kademe);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          {/*
            Şirket adı yoksa başlık "İlanlar". Önce "Şirketin" yazıyordu:
            hem kimsenin şirketinin adı değil hem de sayfanın ne olduğunu
            söylemiyordu.
          */}
          <h1
            className="truncate text-2xl font-extrabold tracking-tight"
            style={{ color: SIRKET_METIN }}
          >
            {baglam.ad || 'İlanlar'}
          </h1>
          <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            {acik} açık ilan{taslak > 0 ? ` · ${taslak} taslak` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/sirket/ilan/yeni')}
          className={`ml-auto ${BIRINCIL_DUGME}`}
          style={birincilStil}
        >
          <Plus className="h-5 w-5" />
          Yeni ilan
        </button>
      </div>

      {/* Dört sayı: ne yayında, ne bekliyor, kaç başvuru, kapı açık mı. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Sayi etiket="Açık ilan" deger={acik} />
        <Sayi etiket="Taslak" deger={taslak} />
        <Sayi etiket="Başvuru" deger={kartAcik ? basvuruSayisi : '—'} kilitli={!kartAcik} />
        <Sayi
          etiket="Doğrulama"
          deger={<span className="text-sm">{baglam.dogrulandi ? 'Tamam' : 'Bekliyor'}</span>}
        />
      </div>

      {ilanlar.length === 0 ? (
        /*
          Boş ekranda düğme KARTIN İÇİNDE. Sayfanın en üstündeki düğme
          uzakta kalıyordu: kullanıcı boş kutuyu okuyup "peki nasıl" diye
          sorarken cevap ekranın öbür ucundaydı.
        */
        <div className={`${KUTU} text-center`} style={kutuStil}>
          <p className="text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
            Henüz ilan yok
          </p>
          <p
            className="mx-auto mt-1 max-w-md text-sm leading-relaxed"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            İlk ilanı açmak iki dakika sürüyor: pozisyon, şehir, süre, ücret ve iş tanımı. İş
            tanımı için hazır şablon var.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/sirket/ilan/yeni')}
            className={`mx-auto mt-5 ${BIRINCIL_DUGME}`}
            style={{ ...birincilStil, minHeight: 56, paddingInline: 28, fontSize: 16 }}
          >
            <Plus className="h-5 w-5" />
            Yeni ilan
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {ilanlar.map((i) => {
            const id = String(i.id);
            const yayinda = i.status === 'published';
            const taslak = i.status === 'draft';
            const platformdan = i.application_method === 'internal';
            const basvuruSayisi = Number(i.applicants_count ?? 0);
            /* Kural tek yerde ve test altında: lib/ilan-formu.mjs. */
            const eylem = ilanEylemleri(i);

            return (
              <li
                key={id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border p-4"
                style={kutuStil}
              >
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="truncate font-bold" style={{ color: SIRKET_METIN }}>
                    {String(i.title ?? '')}
                  </p>
                  <p className="truncate text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                    {String(i.city ?? '')} ·{' '}
                    <span className="font-mono">
                      {yayinda ? 'YAYINDA' : taslak ? 'TASLAK' : 'KAPALI'}
                    </span>
                    {' · '}
                    <span className="font-mono">#{id.slice(0, 8)}</span>
                  </p>
                </div>

                {platformdan && (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold"
                    style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
                  >
                    <Send className="h-3 w-3" />
                    StajımVar ile başvuru
                  </span>
                )}

                {/*
                  Başvuru sayısı YALNIZCA doğrulanmış şirkette. Kademe 1'e
                  "3 başvuru var" demek, göremeyeceği bir şeyi göstermek ve
                  doğrulamayı satmak olurdu.
                */}
                {kartAcik && (
                  <span
                    className="shrink-0 font-mono text-xs"
                    style={{ color: SIRKET_METIN_IKINCIL }}
                  >
                    {basvuruSayisi} başvuru
                  </span>
                )}

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {eylem.duzenlenebilir && (
                    <button
                      type="button"
                      onClick={() => onNavigate(`/sirket/ilan/${id}/duzenle`)}
                      className={IKINCIL_DUGME}
                      style={ikincilStil}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Düzenle
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void onDurum(id, yayinda ? 'closed' : 'published')}
                    className={IKINCIL_DUGME}
                    style={ikincilStil}
                  >
                    {eylem.durumEtiketi}
                  </button>

                  {eylem.kaldirilabilir && (
                    <button
                      type="button"
                      onClick={() =>
                        setKaldirilacak({
                          id,
                          baslik: String(i.title ?? ''),
                          basvuruSayisi,
                          arsivlenecek: eylem.arsivlenecek,
                        })
                      }
                      className={IKINCIL_DUGME}
                      style={ikincilStil}
                      title={eylem.arsivlenecek ? 'Listeden kaldır (arşivle)' : 'İlanı sil'}
                    >
                      {eylem.arsivlenecek ? (
                        <Archive className="h-3.5 w-3.5" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {eylem.arsivlenecek ? 'Arşivle' : 'Sil'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        ONAY — GERÇEK DAVRANIŞI SÖYLÜYOR

        İki ayrı sonuç var ve metin hangisi olduğunu yazıyor: başvurusu
        olan ilan arşivleniyor (veri duruyor), olmayan ilan gerçekten
        siliniyor (geri alınamıyor). "Emin misiniz?" deyip ne olacağını
        söylememek, kullanıcıyı kendi verisi hakkında karanlıkta bırakır.
      */}
      {kaldirilacak && (
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
  onNot: (id: string, metin: string) => Promise<void>;
}> = ({ baglam, kartlar, ilanlar, onNavigate, onDurum, onNot }) => {
  if (!adayGorebilir(baglam.kademe)) {
    return (
      <div className={KUTU} style={kutuStil}>
        <p
          className="flex items-center gap-2 text-lg font-extrabold"
          style={{ color: SIRKET_METIN }}
        >
          <Lock className="h-5 w-5" style={{ color: SIRKET_VURGU_KOYU }} />
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
          <ShieldCheck className="h-5 w-5" />
          Şirketini doğrula
        </button>
      </div>
    );
  }

  const yayindaki = ilanlar.find((i) => i.status === 'published');
  const ilanAdresi =
    yayindaki && typeof window !== 'undefined'
      ? `${window.location.origin}/ilan/${String(yayindaki.id)}`
      : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
        Başvuranlar
      </h1>
      <AdayIzgarasi
        kartlar={kartlar}
        ilanAdresi={ilanAdresi}
        onNavigate={onNavigate}
        onDurum={onDurum}
        onNot={onNot}
      />
    </div>
  );
};

export { KADEME };
