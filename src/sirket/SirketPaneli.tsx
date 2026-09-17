import React from 'react';
import { Archive, BadgeCheck, Lock, MoreHorizontal, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { SirketKabugu, type SirketSekmesi } from './SirketKabugu';
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
import { IlanFormu } from './IlanFormu';
import { AdayIzgarasi } from './AdayIzgarasi';
import type { Iletisim } from './AdayCekmecesi';
import { SirketProfilFormu } from './SirketProfilFormu';
import { GenelBakis } from './GenelBakis';
import { IlanKarti, YeniIlanKarti, type AdayOzeti } from './IlanKarti';
import { ilanEylemleri } from '../lib/ilan-formu.mjs';
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
  ilanOku,
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
      Doğrulanmış damgası marka rozetinde (blue-50 / blue-700, kenar
      blue-200) — öğrenci tarafındaki "Resmî kaynak" rozetiyle aynı dil.
    */
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold"
      style={{ borderColor: SIRKET_KENAR_VURGU, background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
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
  /* Bildirim durumu App'te; panel yalnızca kabuğa geçiriyor. */
  okunmamisBildirim?: number | null;
  onBildirimAc?: () => void;
  /* Bildirimden gelindiyse açılacak aday. */
  acilacakAday?: string | null;
  onAdayAcildi?: () => void;
}> = ({
  yol,
  userId,
  yoneticiMi,
  onNavigate,
  onOgrenciyeDon,
  okunmamisBildirim,
  onBildirimAc,
  acilacakAday,
  onAdayAcildi,
}) => {
  useNoindex();

  const [baglam, setBaglam] = React.useState<SirketBaglami | null>(null);
  const [ilanlar, setIlanlar] = React.useState<Record<string, unknown>[]>([]);
  const [basvurular, setBasvurular] = React.useState<Record<string, any>[]>([]);
  /*
    Profil alanları Genel'deki eksik-profil satırı için. Okunamazsa null
    kalıyor ve satır çizilmiyor; panelin kendisi bu yüzden düşmüyor.
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

  const sekme: SirketSekmesi = yol.startsWith('/sirket/basvuranlar')
    ? 'basvuranlar'
    : yol.startsWith('/sirket/profil')
      ? 'sirket'
      : yol.startsWith('/sirket/ilan')
        ? 'ilanlar'
        : 'genel';

  if (durum === 'yukleniyor' || !baglam) {
    return (
      <SirketKabugu secili={sekme} onNavigate={onNavigate} onOgrenciyeDon={onOgrenciyeDon}
        okunmamisBildirim={okunmamisBildirim}
        onBildirimAc={onBildirimAc}
      >
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
      <SirketKabugu secili={sekme} onNavigate={onNavigate} onOgrenciyeDon={onOgrenciyeDon}
        okunmamisBildirim={okunmamisBildirim}
        onBildirimAc={onBildirimAc}
      >
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
      okunmamisBildirim={okunmamisBildirim}
      onBildirimAc={onBildirimAc}
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
          basvurular={basvurular as AdayOzeti[]}
          profil={profil}
          onNavigate={onNavigate}
        />
      ) : sekme === 'ilanlar' ? (
        <Ilanlar
          baglam={baglam}
          ilanlar={ilanlar}
          basvurular={basvurular as AdayOzeti[]}
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
          onMulakatTarihi={async (id, tarih) => {
            await mulakatTarihiYaz(id, tarih);
            await yukle();
          }}
          /*
            Teklif durumla BİRLİKTE yazılıyor: iki ayrı yazımda arada
            kalan an, öğrenciye içi boş bir "Teklif aldın" gösterirdi.
          */
          onTeklif={async (id, teklif) => {
            await teklifGonder(id, teklif);
            await yukle();
          }}
          /*
            Davet durumla BİRLİKTE yazılıyor: iki ayrı yazımda arada
            kalan an, öğrenciye içi boş bir davet gösterirdi.
          */
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

/* ------------------------------------------------------------- ilanlar */

/**
 * İlan listesi ekranı.
 *
 * `export` YALNIZCA GELİŞTİRME FİKSTÜRÜ İÇİN: bu ekran giriş arkasında
 * duruyor ve tarayıcıda hiç görülmeden değişiyordu — taşma menüsü,
 * kaldırma onayı ve düzenle/yayınla düğmeleri dahil. Fikstür (src/dev/
 * SirketPanelDevFixture) artık bu ekranı da çiziyor. Üretim yolunda
 * yalnızca aşağıdaki SirketPaneli tarafından kullanılıyor.
 */
export const Ilanlar: React.FC<{
  baglam: SirketBaglami;
  ilanlar: Record<string, unknown>[];
  /** Kart görebilen kademede şirketin tüm başvuruları; değilse boş. */
  basvurular: AdayOzeti[];
  onNavigate: (y: string) => void;
  onDurum: (id: string, d: 'published' | 'closed') => Promise<void>;
  onKaldir: (id: string, arsivle: boolean) => Promise<void>;
  /** Fikstürün sabit "bugün"ü; üretimde verilmiyor. */
  simdi?: Date;
}> = ({ baglam, ilanlar, basvurular, onNavigate, onDurum, onKaldir, simdi }) => {
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
  const acik = ilanlar.filter((i) => i.status === 'published').length;
  const taslak = ilanlar.filter((i) => i.status === 'draft').length;
  const kartAcik = adayGorebilir(baglam.kademe);

  return (
    <div className="space-y-4">
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
        {/*
          Sayı karoları yok; aynı bilgi bu satırda. Başvuru sayısı yalnız
          kart görebilen kademede ve sıfırdan büyükse — "0 başvuru" bir
          bilgi değil, gürültü.
        */}
        <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          {acik} açık ilan{taslak > 0 ? ` · ${taslak} taslak` : ''}
          {kartAcik && basvurular.length > 0 ? ` · ${basvurular.length} başvuru` : ''}
        </p>
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
            İlk ilanını aç
          </button>
        </div>
      ) : (
        /*
          GENEL'LE AYNI KART

          İlan kartı ortak bileşen (./IlanKarti): başlık, şehir, durum
          rozeti ve avatar şeridi orada. Bu sekmenin farkı sağdaki
          yönetim eylemleri — Kapat/Yayınla ve taşma menüsü — ve
          başlığın altına düşen inceleme notu.
        */
        <ul className="space-y-3">
          {ilanlar.map((i) => {
            const id = String(i.id);
            const yayinda = i.status === 'published';
            const taslakMi = i.status === 'draft';
            const platformdan = i.application_method === 'internal';
            const basvuruSayisi = Number(i.applicants_count ?? 0);
            /* Kural tek yerde ve test altında: lib/ilan-formu.mjs. */
            const eylem = ilanEylemleri(i);

            return (
              <IlanKarti
                key={id}
                ilan={i}
                basvurular={
                  kartAcik ? basvurular.filter((b) => String(b.ilanId ?? '') === id) : null
                }
                onNavigate={onNavigate}
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
                  RET NOTU — ŞİRKET NEDENİ BURADA OKUYOR

                  Ret ilanı taslağa düşürüyor ve notu zorunlu kılıyor.
                  `truncate` YOK: tek satıra kısaltılan gerekçe işe
                  yaramaz. Not yoksa satır hiç çizilmiyor.
                */
                altNot={
                  taslakMi && i.review_note ? (
                    <p
                      className="mt-2 rounded-lg px-2 py-1.5 text-xs leading-relaxed"
                      style={{ background: SIRKET_ROZET, color: SIRKET_METIN }}
                    >
                      <strong>İnceleme notu:</strong> {String(i.review_note)}
                    </p>
                  ) : null
                }
                ekEylemler={
                  <>
                    <button
                      type="button"
                      onClick={() => void onDurum(id, yayinda ? 'closed' : 'published')}
                      className={IKINCIL_DUGME}
                      style={ikincilStil}
                    >
                      {eylem.durumEtiketi}
                    </button>

                    {/*
                      ÜÇÜNCÜ EYLEM MENÜDE

                      Düzenle ve Yayınla/Kapat görünür kalıyor; seyrek ve
                      geri alınamaz olan kaldırma menüye giriyor.
                    */}
                    {eylem.kaldirilabilir && (
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
                                    baslik: String(i.title ?? ''),
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
          <YeniIlanKarti onNavigate={onNavigate} />
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

  /*
    GENEL'DEN GELEN İLAN SÜZGECİ

    Genel'deki kartın "Adaylar" düğmesi buraya `?ilan=<id>` ile geliyor.
    Rota durumu yalnız yolu tutuyor (App.navigate), sorgu adresten
    okunuyor — öğrenci tarafındaki süzgeçlerle aynı kural.
  */
  const baslangicIlan =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('ilan')
      : null;

  return (
    /*
      BAŞLIK BİR KEZ

      Burada bir sayfa başlığı vardı ve AdayIzgarasi kendi başlığını da
      çiziyordu: masaüstünde başlık iki kez görünüyordu. Kalan başlık
      ızgaranınki — aday sayısını da taşıyor ve süzgeçler doğrudan onun
      altında.
    */
    <div>
      <AdayIzgarasi
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
