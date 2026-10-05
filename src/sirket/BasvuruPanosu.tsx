import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SIRKET_METIN, SIRKET_METIN_IKINCIL, SIRKET_ODAK, kutuStil } from './renk';
import { durumRozeti } from './basvuru-durumu';
import { onyargisizla } from '../lib/aday-kart.mjs';
import { ProfilFotografi } from '../components/sosyal/ProfilFotografi';
import { PANO_ASAMALARI, asamayaGore, panoyaDiz } from '../lib/basvuru-panosu.mjs';
import { BEKLEME_ESIKLERI, beklemeGunu, bekliyorMu } from '../lib/bekleyen-basvuru.mjs';
import type { DegerlendirmeOlcutu, EkipUyesi } from '../lib/sirket-veri';
import { DegerlendirmeFormu } from './DegerlendirmeFormu';

/**
 * BAŞVURU PANOSU — ilan × aşama
 *
 * NEDEN VAR
 * ---------
 * Başvuranlar ekranı tek bir düz listeydi: 186 yayındaki ilanın
 * başvuruları aynı akışta sıralanıyordu ve "hangi ilanda kim nerede
 * takıldı" sorusunun ekranda karşılığı yoktu. Pano o soruyu tek bakışta
 * cevaplıyor.
 *
 * LİSTE KALDI, PANO ONUN YERİNE GEÇMEDİ
 * -------------------------------------
 * `AdayIzgarasi` olduğu gibi duruyor; pano ikinci bir görünüm. Izgara
 * tek adayla çalışmanın (klavye kısayolları, çekmece, önyargısız
 * inceleme) yeri; pano dağılımı görmenin yeri. Birini ötekinin yerine
 * koymak, bugün çalışan bir akışı bozmak olurdu.
 *
 * KART AÇMAK IZGARAYA DEVREDİLİYOR
 * --------------------------------
 * Panodaki bir adaya dokunmak `/sirket/basvuranlar?aday=<id>` adresine
 * gidiyor ve çekmeceyi ızgaranın kendi derin bağlantı mekanizması
 * açıyor. Çekmecenin ikinci bir kopyası yazılmadı: 1750 satırlık ekranı
 * çoğaltmak, durum/not/teklif akışını iki yerde ayrı ayrı sürdürmek
 * demekti.
 *
 * ÖNYARGISIZ İNCELEME PANODA DA GEÇERLİ
 * -------------------------------------
 * `onyargisizla()` ad ve fotoğrafı gizliyor; pano aynı işlevi kullanıyor,
 * kendi gizleme kuralını yazmıyor. İlk elemede ismin çağrıştırdığı
 * ipuçlarını devre dışı bırakma kararı iki ekranda da aynı yerden
 * geliyor — biri değişirse öteki de değişiyor.
 *
 * SAYILAR GERÇEK
 * --------------
 * Her aşamanın başlığındaki sayı o aşamadaki gerçek başvuru sayısı.
 * Boş aşama "0" yazıp duruyor; gizlenmiyor, çünkü boş olduğunu görmek
 * de bilgi (örneğin hiç görüşmeye geçilmemiş bir ilan).
 */

/** Panodaki tek aday çipi. */
/*
  DEĞERLENDİRME FORMU BEKLETİLDİ (sade başvuru akışı)

  Başvuru akışı sadeleşti: şirketin temel işi adayın profilini, CV'sini
  ve izinli iletişimini incelemek. Değerlendirme formu "şimdilik
  beklet" kapsamında ve henüz hiç yayına çıkmadı; yayına açılmadan önce
  arayüzden kaldırıldı. Tablolar, RPC'ler ve form bileşeni DURUYOR —
  geri açmak için bu değeri `true` yapmak yeterli.
*/
const DEGERLENDIRME_ETKIN = false;

const AdayCipi: React.FC<{
  kart: Record<string, any>;
  /**
   * Verilmezse çip DÜĞME DEĞİL, düz bir satır.
   *
   * Viewer'da çekmece açılmıyor (yapabileceği bir şey yok). Düğme olarak
   * çizip hiçbir şey yapmamak, dokunulabilir görünen ama sessizce ölü
   * bir hedef bırakıyordu — tarayıcıda görüldü.
   */
  onAc?: (id: string) => void;
  /** Atanabilecek üyeler; boşsa atama kutusu hiç çizilmiyor. */
  atanabilir: { uyeId: string; ad: string }[];
  /** Sorumlu değiştirme. Verilmezse kutu salt okunur metne düşüyor. */
  onSorumlu?: (basvuruId: string, uyeId: string | null, beklenen: string | null) => void;
  /** Üye kimliği → ad; sorumlunun adını yazmak için. */
  adlar: Map<string, string>;
  /** Şirketin ölçütleri; değerlendirme formu için. */
  olcutler: DegerlendirmeOlcutu[];
  /** Değerlendirme yazabilir mi — sunucudaki kuralın istemci kopyası. */
  degerlendirebilir: boolean;
}> = ({ kart, onAc, atanabilir, onSorumlu, adlar, olcutler, degerlendirebilir }) => {
  const [formAcik, setFormAcik] = React.useState(false);
  const rozet = durumRozeti(String(kart.durum ?? ''));
  const sorumlu: string | null = kart.atananUye ?? null;
  /* Yalnız eşiği aşmışta gün sayısı; altındaysa null ve rozet yok. */
  const bekleyenGun = bekliyorMu(kart) ? beklemeGunu(kart) : null;
  const ortak = 'flex w-full min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-left';
  const icerik = (
    <>
      <ProfilFotografi
        ad={kart.ad ?? '?'}
        yol={null}
        yedekAdres={kart.fotoUrl ?? null}
        className="h-8 w-8 shrink-0 rounded-full text-[11px]"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold" style={{ color: SIRKET_METIN }}>
          {/*
            Önyargısız incelemede ad gelmiyor; "Aday" yazmak uydurma
            değil, adın KASITLI olarak gizlendiğini söylüyor.
          */}
          {kart.ad ?? 'Aday'}
        </span>
        {kart.okul && (
          <span className="block truncate text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
            {kart.okul}
          </span>
        )}
      </span>
      {/*
        BEKLEME ROZETİ — GERÇEK GÜN SAYISI

        Sunucudaki hatırlatma ile aynı ölçüden (`greatest(updated_at,
        applied_at)`) geliyor; ekranda "9 gün" yazarken bildirimin
        gelmemiş olması diye bir durum olmuyor. Eşiğin altındaki
        başvuruda rozet HİÇ çizilmiyor: her karta gün sayısı yazmak,
        bekleyeni bekemeyenden ayırt edilemez kılardı.
      */}
      {bekleyenGun !== null && (
        <span
          className="shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: '#FEF3C7', color: '#92400E' }}
          title={`${bekleyenGun} gündür işlem görmedi`}
        >
          {bekleyenGun}g
        </span>
      )}
      <span
        className="shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-bold"
        style={rozet.stil}
      >
        {rozet.etiket}
      </span>
    </>
  );

  return (
    <li className="space-y-1">
      {onAc ? (
        <button
          type="button"
          onClick={() => onAc(String(kart.id))}
          className={`${ortak} cursor-pointer hover:bg-gray-50 ${SIRKET_ODAK}`}
        >
          {icerik}
        </button>
      ) : (
        <span className={ortak}>{icerik}</span>
      )}

      {/*
        SORUMLU SATIRI — çipin altında, ayrı.

        Çipin İÇİNE konsaydı iç içe iki etkileşim olurdu (düğmenin içinde
        açılır kutu): tıklama hedefleri karışır ve klavyeyle kutuya
        ulaşmak çekmeceyi açardı.

        "Sorumlusu yok" AÇIKÇA yazıyor; boş bırakmak eksik veri gibi
        görünürdü, oysa bu ayrı ve anlamlı bir durum.
      */}
      {onSorumlu && atanabilir.length > 0 ? (
        <label className="flex items-center gap-1.5 pl-2.5 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
          <span className="shrink-0">Sorumlu</span>
          <select
            value={sorumlu ?? ''}
            onChange={(e) => onSorumlu(String(kart.id), e.target.value || null, sorumlu)}
            className={`min-h-11 min-w-0 flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white px-1.5 text-[11px] ${SIRKET_ODAK}`}
          >
            <option value="">Sorumlusu yok</option>
            {atanabilir.map((u) => (
              <option key={u.uyeId} value={u.uyeId}>
                {u.ad}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="pl-2.5 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
          Sorumlu: {sorumlu ? (adlar.get(sorumlu) ?? 'Ekip üyesi') : 'yok'}
        </p>
      )}

      {/*
        DEĞERLENDİRME PANODAN AÇILIYOR, ÇEKMECEYE GİTMEDEN.

        Değerlendirme panoda yapılan bir iş: işveren aynı ekranda birkaç
        adayı arka arkaya puanlıyor. Her biri için çekmeceyi açıp
        kapatmak akışı kesiyordu. Form kapalı başlıyor; açıkken geçmişi
        de gösteriyor, yani yazamayan üye de "kim ne demiş" görebiliyor.
      */}
      {DEGERLENDIRME_ETKIN && (
      <div className="pl-2.5">
        <button
          type="button"
          onClick={() => setFormAcik((a) => !a)}
          aria-expanded={formAcik}
          className={`min-h-11 cursor-pointer text-[11px] font-bold underline-offset-2 hover:underline ${SIRKET_ODAK}`}
          style={{ color: SIRKET_METIN_IKINCIL }}
        >
          {formAcik ? 'Değerlendirmeyi kapat' : 'Değerlendir'}
        </button>
        {formAcik && (
          <div className="mt-1">
            <DegerlendirmeFormu
              basvuruId={String(kart.id)}
              olcutler={olcutler}
              yazabilir={degerlendirebilir}
            />
          </div>
        )}
      </div>
      )}
    </li>
  );
};

/** Tek ilanın aşama sütunları. */
const IlanBlogu: React.FC<{
  ilanAdi: string;
  asamalar: { anahtar: string; etiket: string; kartlar: Record<string, any>[] }[];
  toplam: number;
  acik: boolean;
  onAcKapa: () => void;
  onAday?: (id: string) => void;
  atanabilir: { uyeId: string; ad: string }[];
  onSorumlu?: (basvuruId: string, uyeId: string | null, beklenen: string | null) => void;
  adlar: Map<string, string>;
  olcutler: DegerlendirmeOlcutu[];
  degerlendirebilir: boolean;
}> = ({ ilanAdi, asamalar, toplam, acik, onAcKapa, onAday, atanabilir, onSorumlu, adlar, olcutler, degerlendirebilir }) => (
  <section className="rounded-2xl border p-3 sm:p-4" style={kutuStil}>
    <button
      type="button"
      onClick={onAcKapa}
      aria-expanded={acik}
      className={`flex w-full min-h-11 cursor-pointer items-center gap-2 text-left ${SIRKET_ODAK}`}
    >
      <ChevronDown
        aria-hidden
        className={`h-4 w-4 shrink-0 transition-transform ${acik ? '' : '-rotate-90'}`}
        style={{ color: SIRKET_METIN_IKINCIL }}
      />
      <span className="min-w-0 flex-1 truncate text-base font-bold" style={{ color: SIRKET_METIN }}>
        {ilanAdi}
      </span>
      <span className="shrink-0 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
        {toplam} başvuru
      </span>
    </button>

    {acik && (
      /*
        TELEFONDA ALT ALTA, GENİŞ EKRANDA SÜTUN

        Yatay kaydırılan sütunlar telefonda aşamaların çoğunu ekran
        dışında bırakıyordu ve kullanıcı neyin var olduğunu bilmeden
        kaydırmak zorunda kalıyordu. Alt alta liste her aşamayı ve
        sayısını görünür tutuyor.
      */
      <div className="mt-3 grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {asamalar.map((a) => (
          <div key={a.anahtar} className="min-w-0">
            <p
              className="mb-1.5 flex items-baseline gap-1.5 text-xs font-bold uppercase tracking-wide"
              style={{ color: SIRKET_METIN_IKINCIL }}
            >
              <span className="truncate">{a.etiket}</span>
              <span style={{ color: SIRKET_METIN }}>{a.kartlar.length}</span>
            </p>
            {a.kartlar.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-2.5 py-2 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
                yok
              </p>
            ) : (
              <ul className="space-y-1.5">
                {a.kartlar.map((k) => (
                  <AdayCipi
                    key={String(k.id)}
                    kart={k}
                    onAc={onAday}
                    atanabilir={atanabilir}
                    onSorumlu={onSorumlu}
                    adlar={adlar}
                    olcutler={olcutler}
                    degerlendirebilir={degerlendirebilir}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    )}
  </section>
);

export const BasvuruPanosu: React.FC<{
  kartlar: Record<string, any>[];
  ilanlar: Record<string, unknown>[];
  /**
   * Önyargısız inceleme açık mı — ızgaradaki anahtarla AYNI değer,
   * çağıran veriyor. Pano kendi anahtarını çizmiyor: aynı tercihi iki
   * ekranda iki kez sormak, birinde açık birinde kapalı bırakırdı.
   */
  onyargisiz: boolean;
  /** Verilmezse çipler düğme olmuyor — Viewer dalı böyle çağırıyor. */
  onAday?: (id: string) => void;
  /** Şirket ekibi; atama kutusu ve sorumlu adları buradan. */
  ekip?: EkipUyesi[];
  /** Verilmezse atama kutusu çizilmiyor (Viewer). */
  onSorumlu?: (basvuruId: string, uyeId: string | null, beklenen: string | null) => void;
  /** Şirketin değerlendirme ölçütleri; boşsa form yalnız not alıyor. */
  olcutler?: DegerlendirmeOlcutu[];
  /** Sorumsuzları dengeli dağıt. Verilmezse düğme çizilmiyor (Viewer). */
  onDagit?: () => void | Promise<void>;
}> = ({ kartlar, ilanlar, onyargisiz, onAday, ekip = [], onSorumlu, olcutler = [], onDagit }) => {
  const [acikIlan, setAcikIlan] = React.useState<string | null>(null);
  /*
    "SORUMLUSU YOK" SÜZGECİ — paketin asıl sorusu.

    Sorumlusu olmayan iş, kimsenin üstlenmediği iş. Varsayılan KAPALI:
    pano önce bütün tabloyu gösteriyor, süzgeç bir karar.
  */
  const [yalnizSorumlusuz, setYalnizSorumlusuz] = React.useState(false);
  /*
    BEKLEYENLER SÜZGECİ — hatırlatma zamanlamaya bağlı, ekran değil.
    İşveren bildirim gelmeden de "kim unutulmuş" diye bakabilsin.
    Varsayılan kapalı: pano önce bütün tabloyu gösteriyor.
  */
  const [yalnizBekleyen, setYalnizBekleyen] = React.useState(false);

  const adlar = React.useMemo(
    () => new Map(ekip.map((u) => [u.uyeId, u.ad])),
    [ekip],
  );
  /* Yalnız YAZABİLEN üyelere iş atanabiliyor; sunucu da aynı kuralı uyguluyor. */
  const atanabilir = React.useMemo(
    () => ekip.filter((u) => u.yazabilir).map((u) => ({ uyeId: u.uyeId, ad: u.ad })),
    [ekip],
  );

  /* İki süzgeç BİRLİKTE çalışıyor: "sorumlusu yok VE bekliyor" en acil küme. */
  const suzulmus = React.useMemo(() => {
    let l = kartlar;
    if (yalnizSorumlusuz) l = l.filter((k) => !k.atananUye);
    if (yalnizBekleyen) l = l.filter((k) => bekliyorMu(k));
    return l;
  }, [kartlar, yalnizSorumlusuz, yalnizBekleyen]);

  const bloklar = React.useMemo(
    () => panoyaDiz(suzulmus, ilanlar),
    [suzulmus, ilanlar],
  );

  /* İlk ilan açık başlıyor: tamamen kapalı bir pano boş ekran gibi duruyordu. */
  React.useEffect(() => {
    if (acikIlan === null && bloklar.length > 0) setAcikIlan(bloklar[0].ilanId);
  }, [bloklar, acikIlan]);

  const suzgecSatiri = (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
      <input
        type="checkbox"
        checked={yalnizSorumlusuz}
        onChange={(e) => setYalnizSorumlusuz(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-[#2563EB]"
      />
      Yalnızca sorumlusu olmayanlar
      {/* Sayı GERÇEK: süzgeç kapalıyken de kaç iş beklediği görünüyor. */}
      <span className="font-bold" style={{ color: SIRKET_METIN }}>
        ({kartlar.filter((k) => !k.atananUye).length})
      </span>
    </label>
  );

  /*
    DENGELİ DAĞITIM — ŞİRKET İSTERSE.

    Otomatik çalışmıyor: kendiliğinden atama, kimsenin haberi olmadan iş
    yüklemek olurdu. Yalnız SORUMSUZ başvurular dağıtılıyor; var olan
    atamayı bozmak, birinin üstlendiği işi elinden almak demekti.
    Sunucu her başvuruyu o an en az açık işi olan üyeye veriyor.

    Dağıtılacak iş yoksa düğme hiç çizilmiyor — basınca "0 atandı" diyen
    bir düğme, yapacak işi olmadığını basmadan önce söylemeliydi.
  */
  const sorumsuzAdet = kartlar.filter((k) => !k.atananUye).length;
  const dagitDugmesi = onDagit && sorumsuzAdet > 0 && (
    <button
      type="button"
      onClick={() => void onDagit()}
      className={`min-h-11 cursor-pointer rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold hover:bg-gray-50 ${SIRKET_ODAK}`}
      style={{ color: SIRKET_METIN }}
    >
      Sorumsuz {sorumsuzAdet} başvuruyu dağıt
    </button>
  );

  const bekleyenSatiri = (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
      <input
        type="checkbox"
        checked={yalnizBekleyen}
        onChange={(e) => setYalnizBekleyen(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-[#2563EB]"
      />
      {BEKLEME_ESIKLERI[0]} gündür bekleyenler
      <span className="font-bold" style={{ color: SIRKET_METIN }}>
        ({kartlar.filter((k) => bekliyorMu(k)).length})
      </span>
    </label>
  );

  if (bloklar.length === 0) {
    return (
      <div className="space-y-3">
        {suzgecSatiri}
        {bekleyenSatiri}
        <div className="rounded-2xl border p-6 text-center" style={kutuStil}>
        <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
          Panoda gösterilecek başvuru yok
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          İlanlarınıza başvuru geldikçe burada ilan ve aşama kırılımıyla görünecek.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suzgecSatiri}
      {bekleyenSatiri}
      {dagitDugmesi}
      {bloklar.map((b) => (
        <IlanBlogu
          key={b.ilanId}
          ilanAdi={b.ilanAdi}
          toplam={b.toplam}
          acik={acikIlan === b.ilanId}
          onAcKapa={() => setAcikIlan(acikIlan === b.ilanId ? null : b.ilanId)}
          asamalar={PANO_ASAMALARI.map((a) => ({
            anahtar: a.anahtar,
            etiket: a.etiket,
            /*
              KARTLAR ZATEN ÇEVRİLMİŞ GELİYOR (SirketPaneli, `kartVerisi`).
              Burada ikinci kez çevirmek `profile_snapshot`/`listing_id`
              gibi HAM alanları arıyor, bulamıyor ve adı null'a düşürüyordu
              — fikstürde "Aday" diye görünen her satır buydu. `AdayIzgarasi`
              de çevirmiyor; iki ekran aynı sözleşmeyi kullanıyor.
            */
            kartlar: b.kartlar
              .filter((k) => asamayaGore(String(k.durum ?? '')) === a.anahtar)
              .map((k) => (onyargisiz ? onyargisizla(k) : k)),
          }))}
          onAday={onAday}
          atanabilir={atanabilir}
          onSorumlu={onSorumlu}
          adlar={adlar}
          olcutler={olcutler}
          degerlendirebilir={Boolean(onSorumlu)}
        />
      ))}
    </div>
  );
};
