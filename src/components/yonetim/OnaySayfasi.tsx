import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import {
  fetchOnayKuyrugu,
  ilanDegisikligiKarari,
  ilanGerekceyleReddet,
  ilanKarariVer,
  ilanYayindanKaldir,
  sirketDogrulamasiniReddet,
  sirketiDogrula,
  type OnayDegisikligi,
  type OnayDogrulama,
  type OnayIlani,
  type OnayKontrolBekleyen,
  type OnayKontrolKarari,
  type OnayKuyrugu,
} from '../../lib/queries';
import { listingSlug } from '../../lib/slug';
import { tarihSaatMetni } from '../../lib/tarih.mjs';
import {
  IS_UYARISI,
  gerekceleriOku,
  icerikFarki,
  kararEtiketi,
  yenidenDenemeSagligi,
} from '../../lib/ilan-kontrol-gorunumu.mjs';
import { GerekceliKarar } from './GerekceliKarar';
import { sayi } from '../../lib/yonetim-bicim.mjs';
import { BosDurum, Iskelet } from './Grafikler';

/**
 * ONAY KUYRUKLARI
 *
 * Üç sekme: ilan, sahiplenme, bölüm. Sayılar sekme başlığında duruyor ki
 * hangi kuyrukta iş olduğu sekmeye girmeden görünsün.
 *
 * KARARI VERECEK KİŞİYE GEREKEN BİLGİ EKRANDA
 * -------------------------------------------
 * Bir ilanı yayına almak, öğrenciyi o bağlantıya göndermek demek. Bu
 * yüzden satırda yalnız başlık değil, kararı değiştirecek olanlar da
 * yazıyor:
 *
 *   - Bağlantı durumu: "erisilemedi" ise uyarı olarak çıkıyor. Erişilemeyen
 *     bir ilanı yayına almak, ölü bir bağlantı yayımlamak olurdu.
 *   - Açıklama uzunluğu: 82 karakterlik bir açıklama gerçek bir ilan metni
 *     değil. Onaylayan bunu görmeden karar vermemeli.
 *   - Ülke: kuyruktaki ilanların hepsi Almanya'dan ve Almanca. Türkiye'deki
 *     öğrenciye ne göstereceğimiz bir karar ve o karar buradan veriliyor.
 *
 * RET SİLMİYOR
 * ------------
 * Reddedilen ilan arşivleniyor, satır duruyor. Silinmiş bir kayıttan
 * geriye dönülemez; arşivden dönülür.
 *
 * OTOMATİK KONTROL (20261120010000)
 * ---------------------------------
 * Şirket ilanları artık kuyruğa yalnız otomatik kontrol "inceleme"
 * dediğinde düşüyor; sorunsuz ilan yönetici beklemeden yayında. Bu
 * yüzden satırda kararın GEREKÇESİ var: hangi kural, metindeki kanıt
 * alıntısı, kontrolün zamanı ve kural sürümü. Yönetici aynı metni
 * yeniden okuyup kuralın neyi yakaladığını aramasın.
 *
 * Altında iki bölüm: kontrolü tamamlanamayan ilanlar (sunucu yeniden
 * deniyor; kaç deneme, sıradaki ne zaman, son hata) ve son kararlar
 * (otomatik ve yönetici). Otomatik yayınlanan ilan yöneticinin önünden
 * geçmediği için onu görmenin tek yeri son kararlar listesi.
 */

const Sekme: React.FC<{
  etkin: boolean;
  etiket: string;
  adet: number;
  tikla: () => void;
}> = ({ etkin, etiket, adet, tikla }) => (
  <button
    type="button"
    onClick={tikla}
    aria-pressed={etkin}
    className={`min-h-11 cursor-pointer rounded-lg px-3.5 text-sm font-semibold transition-colors ${
      etkin ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }`}
  >
    {etiket}
    <span className={`ml-1.5 tabular-nums ${etkin ? 'text-blue-100' : 'text-gray-500'}`}>
      {sayi(adet)}
    </span>
  </button>
);

const Etiket: React.FC<{ children: React.ReactNode; renk?: 'gri' | 'uyari' }> = ({
  children,
  renk = 'gri',
}) => (
  <span
    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
      renk === 'uyari' ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-600'
    }`}
  >
    {children}
  </span>
);

/**
 * Kontrol gerekçeleri — mesaj, kanıt alıntısı, kural kimliği.
 *
 * Kanıt, kuralın metinde yakaladığı yerin çevresi (sunucu en çok 200
 * karakter kesiyor). Kural kimliği küçük ve eş aralıklı: okunacak şey
 * mesaj; kimlik, kuralı SQL'de bulmak için. Şirkete giden metinde kanıt
 * YOK — yalnız yönetici görüyor (bkz. göç, ilan_sirkete_gorunen_gerekceler).
 */
const GerekceListesi: React.FC<{ ham: unknown }> = ({ ham }) => {
  const gerekceler = gerekceleriOku(ham);
  if (gerekceler.length === 0) {
    return <p className="text-[12px] text-gray-600">Gerekçe kaydı yok.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {gerekceler.map((g, i) => (
        <li key={i} className="min-w-0">
          <p className="break-words text-[13px] leading-snug text-gray-900">{g.mesaj}</p>
          {g.kanit && (
            <blockquote className="mt-0.5 break-words border-l-2 border-gray-300 pl-2 text-[12px] italic leading-snug text-gray-700">
              “{g.kanit}”
            </blockquote>
          )}
          {g.kural && <p className="mt-0.5 break-all font-mono text-[11px] text-gray-600">{g.kural}</p>}
        </li>
      ))}
    </ul>
  );
};

/** Karar etiketinin rengi: yayın yeşil, şüphe amber, hata/ret gül, düzeltme gri. */
const KARAR_RENGI: Record<string, string> = {
  yayinla: 'bg-emerald-50 text-emerald-800',
  yonetici_onay: 'bg-emerald-50 text-emerald-800',
  inceleme: 'bg-amber-50 text-amber-800',
  duzeltme: 'bg-gray-100 text-gray-700',
  hata: 'bg-rose-50 text-rose-800',
  yonetici_ret: 'bg-rose-50 text-rose-800',
  yonetici_kaldirdi: 'bg-rose-50 text-rose-800',
  degisiklik_onay: 'bg-emerald-50 text-emerald-800',
  degisiklik_ret: 'bg-rose-50 text-rose-800',
};

/* Şirkete giden gerekçenin nerede görüneceği — üç kararda aynı söz. */
const GEREKCE_SIRKETE = 'Şirket bu metni kendi panelinde, ilanın altında aynen görecek. En az 10 karakter.';

const ILAN_DURUM_ADI: Record<string, string> = {
  published: 'yayında',
  draft: 'taslak',
  closed: 'kapalı',
  archived: 'arşivde',
};

const IlanSatiri: React.FC<{
  ilan: OnayIlani;
  islemde: boolean;
  karar: (k: 'onayla' | 'reddet') => void;
  /** Şirket ilanının gerekçeli reddi (yonetim_ilan_reddet). */
  gerekceyleReddet: (gerekce: string) => Promise<void>;
}> = ({ ilan, islemde, karar, gerekceyleReddet }) => {
  /*
    ŞİRKET İLANINDA RET GEREKÇELİ (20261120010000)

    Eski "Reddet" (`yonetim_ilan_karari`) ilanı nedensiz arşivliyordu ve
    şirket panelinde hiçbir iz kalmıyordu. Şirket ilanında artık gerekçe
    zorunlu; ilan arşivlenmiyor, şirket gerekçeyi görüp düzeltebiliyor.
    Şirket dışı taslaklarda (manual/scraped) eski davranış aynen.
  */
  const sirketIlani = ilan.kaynak === 'employer_posted';
  const [retAcik, setRetAcik] = React.useState(false);
  const erisilemez = ilan.kaynakDurumu === 'erisilemedi';
  const kisaAciklama = ilan.aciklamaUzunluk < 200;
  /* Şirket dışı taslakta (manual/scraped) kontrol yok; blok çizilmiyor. */
  const kontrolVar = Boolean(ilan.kontrolDurumu) || gerekceleriOku(ilan.kontrolGerekceleri).length > 0;

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-bold leading-snug text-gray-900">{ilan.baslik}</p>
      <p className="mt-0.5 text-sm text-gray-600">
        {ilan.sirket ?? 'şirket bilinmiyor'}
        {ilan.sehir ? ` · ${ilan.sehir}` : ''}
        {ilan.ulke ? ` · ${ilan.ulke}` : ''}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Etiket>
          {ilan.kaynak === 'scraped' ? 'taranan' : ilan.kaynak === 'employer_posted' ? 'şirket açtı' : ilan.kaynak}
        </Etiket>
        {ilan.calisma && <Etiket>{ilan.calisma}</Etiket>}
        {erisilemez && <Etiket renk="uyari">bağlantıya erişilemedi</Etiket>}
        {kisaAciklama && (
          <Etiket renk="uyari">açıklama {sayi(ilan.aciklamaUzunluk)} karakter</Etiket>
        )}
      </div>

      {(erisilemez || kisaAciklama) && (
        /*
          Uyarı YAZIYLA da veriliyor: rozet tek başına "dikkat" diyor ama
          neden dikkat edilmesi gerektiğini söylemiyor.
        */
        <p className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {erisilemez && 'Son kontrolde ilanın bağlantısına erişilemedi. '}
            {kisaAciklama && 'Açıklama metni çok kısa, gerçek ilan metni olmayabilir. '}
            Yayına almadan önce bağlantıyı açıp bak.
          </span>
        </p>
      )}

      {kontrolVar && (
        /*
          NEDEN KUYRUKTA — telefonda da okunuyor: ipucu balonu değil,
          satırın içinde düz metin.
        */
        <div className="mt-2 rounded-lg bg-gray-50 px-2.5 py-2">
          <p className="mb-1 text-[12px] font-semibold text-gray-900">Neden incelemede</p>
          <GerekceListesi ham={ilan.kontrolGerekceleri} />
          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-600">
            Kontrol: {tarihSaatMetni(ilan.kontrolZamani) ?? 'zaman kaydı yok'} · Kural sürümü:{' '}
            {ilan.kuralSurumu ?? 'bilinmiyor'}
          </p>
        </div>
      )}

      {ilan.adres && (
        <a
          href={ilan.adres}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
        >
          İlanı kaynağında aç
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}

      {/* Sunucu satırda veriyor (yonetim_onay_kuyrugu); OnayIlani tipinde henüz alan yok. */}
      {(ilan as OnayIlani & { yoneticiIncelemesiGerekli?: boolean }).yoneticiIncelemesiGerekli && (
        <p className="mt-2 text-[12px] leading-relaxed text-gray-700">
          Bu ilan daha önce yönetici tarafından yayından kaldırıldı ya da reddedildi; yeniden yayın senin
          onayına bağlı.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={islemde}
          onClick={() => karar('onayla')}
          className="min-h-11 flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Yayına al
        </button>
        <button
          type="button"
          disabled={islemde}
          onClick={() => (sirketIlani ? setRetAcik((a) => !a) : karar('reddet'))}
          aria-expanded={sirketIlani ? retAcik : undefined}
          className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reddet
        </button>
      </div>
      {sirketIlani && retAcik && (
        <GerekceliKarar
          kimlik={`ret-${ilan.id}`}
          gonderEtiketi="Gerekçeyle reddet"
          aciklama={`İlan arşivlenmez, taslakta kalır. ${GEREKCE_SIRKETE}`}
          onGonder={gerekceyleReddet}
          onVazgec={() => setRetAcik(false)}
        />
      )}
    </li>
  );
};

/**
 * YENİDEN DENEME İŞİNİN SAĞLIĞI — kuyruğun üstünde tek satır
 *
 * Kontrolü tamamlanamayan ilanları GitHub Actions'taki zamanlanmış iş
 * yeniden deniyor. İş durursa ilanlar sessizce "kontrol ediliyor"da
 * kalır; yönetici bunu buradan görüyor. Süre sözü yok: yalnız son
 * çalışmanın zamanı ve gecikme varsa uyarı.
 */
const YenidenDenemeSatiri: React.FC<{ is: OnayKuyrugu['yenidenDenemeIsi']; bekleyenSayisi: number }> = ({
  is,
  bekleyenSayisi,
}) => {
  const saglik = yenidenDenemeSagligi(is, bekleyenSayisi);
  const sonCalisma = saglik.sonCalisma ? tarihSaatMetni(saglik.sonCalisma) : null;
  return saglik.uyari ? (
    <div role="alert" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="font-semibold">{IS_UYARISI}</p>
        <p className="text-[12px]">
          Son çalışma: {sonCalisma ?? 'hiç çalışmadı'}
          {Number(is?.gecikmisKontroller ?? 0) > 0 && ` · gecikmiş kontrol: ${sayi(Number(is.gecikmisKontroller))}`}
        </p>
      </div>
    </div>
  ) : (
    <p className="text-[12px] text-gray-600">
      Yeniden deneme işi · son çalışma: {sonCalisma ?? 'hiç çalışmadı'}
    </p>
  );
};

/**
 * İNCELEMEDEKİ DEĞİŞİKLİKLER — yayındaki ilanın bekleyen sürümü
 *
 * İlan yayında (son onaylı sürüm); şirketin değişikliği incelemeye
 * düştü. Yönetici YALNIZ DEĞİŞEN alanları görüyor: kısa alanlar
 * "önce → sonra" tek satır, uzun metin (iş tanımı) önce ve sonra ayrı
 * bloklar — geniş ekranda yan yana, telefonda alt alta.
 */
const DegisiklikSatiri: React.FC<{
  d: OnayDegisikligi;
  islemde: boolean;
  onayla: () => void;
  reddet: (gerekce: string) => Promise<void>;
}> = ({ d, islemde, onayla, reddet }) => {
  const [retAcik, setRetAcik] = React.useState(false);
  const fark = icerikFarki(d.canli, d.bekleyen);
  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="break-words text-sm font-bold leading-snug text-gray-900">{d.baslik}</p>
      <p className="mt-0.5 text-sm text-gray-600">{d.sirket ?? 'şirket bilinmiyor'} · ilan yayında, değişiklik incelemede</p>

      <div className="mt-2 space-y-2">
        <p className="text-[12px] font-semibold text-gray-900">Değişen alanlar</p>
        {fark.length === 0 && <p className="text-[12px] text-gray-600">İçerik farkı bulunamadı.</p>}
        {fark.map((f) =>
          f.uzun ? (
            <div key={f.alan} className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-700">{f.ad}</p>
              <div className="mt-1 grid gap-2 md:grid-cols-2">
                <div className="min-w-0 rounded-lg bg-gray-50 px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-gray-600">Yayındaki</p>
                  <p className="whitespace-pre-line break-words text-[12px] leading-snug text-gray-800">{f.once || '(boş)'}</p>
                </div>
                <div className="min-w-0 rounded-lg bg-amber-50 px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-amber-900">Bekleyen</p>
                  <p className="whitespace-pre-line break-words text-[12px] leading-snug text-gray-900">{f.sonra || '(boş)'}</p>
                </div>
              </div>
            </div>
          ) : (
            <p key={f.alan} className="break-words text-[12px] leading-snug text-gray-800">
              <span className="font-semibold text-gray-700">{f.ad}:</span> {f.once || '(boş)'}{' '}
              <span aria-hidden>→</span>
              <span className="sr-only">yerine</span> <span className="font-semibold text-gray-900">{f.sonra || '(boş)'}</span>
            </p>
          ),
        )}
      </div>

      <div className="mt-2 rounded-lg bg-gray-50 px-2.5 py-2">
        <p className="mb-1 text-[12px] font-semibold text-gray-900">Neden incelemede</p>
        <GerekceListesi ham={d.kontrolGerekceleri} />
        <p className="mt-1.5 text-[11px] leading-relaxed text-gray-600">
          Kontrol: {tarihSaatMetni(d.kontrolZamani) ?? 'zaman kaydı yok'} · Kural sürümü: {d.kuralSurumu ?? 'bilinmiyor'}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={islemde}
          onClick={onayla}
          className="min-h-11 flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Değişikliği onayla
        </button>
        <button
          type="button"
          disabled={islemde}
          onClick={() => setRetAcik((a) => !a)}
          aria-expanded={retAcik}
          className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Değişikliği reddet
        </button>
      </div>
      {retAcik && (
        <GerekceliKarar
          kimlik={`degisiklik-${d.id}`}
          gonderEtiketi="Değişikliği gerekçeyle reddet"
          aciklama={`İlanın yayındaki hâli değişmez. ${GEREKCE_SIRKETE}`}
          onGonder={reddet}
          onVazgec={() => setRetAcik(false)}
        />
      )}
    </li>
  );
};

/**
 * KONTROLÜ TAMAMLANAMAYANLAR
 *
 * Kurallar hata verince ilan yayına ÇIKMIYOR, "bekliyor" oluyor ve
 * sunucu sınırlı sayıda yeniden deniyor; sınır aşılınca ilan yukarıdaki
 * kuyruğa düşüyor. Bu bölüm o aradaki ilanları gösteriyor: yönetici
 * hata kalıcıysa (aynı hata her denemede) kuyruğa düşmeyi beklemeden
 * görebilsin. Eylem düğmesi yok: yeniden denemeyi sunucu yapıyor ve
 * tarayıcıdan tetikleyen bir yol yok.
 */
const KontrolBekleyenBolumu: React.FC<{ bekleyenler: OnayKontrolBekleyen[] }> = ({ bekleyenler }) => (
  <section aria-labelledby="kontrol-bekleyenler" className="space-y-2">
    <h2 id="kontrol-bekleyenler" className="text-sm font-bold text-gray-900">
      Kontrolü tamamlanamayanlar
      <span className="ml-1.5 font-semibold tabular-nums text-gray-600">{sayi(bekleyenler.length)}</span>
    </h2>
    {bekleyenler.length ? (
      <ul className="space-y-2">
        {bekleyenler.map((b) => (
          <li key={b.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Etiket>{b.kapsam === 'degisiklik' ? 'yayındaki ilanın değişikliği' : 'ilan'}</Etiket>
            </div>
            <p className="mt-1.5 break-words text-sm font-bold leading-snug text-gray-900">{b.baslik}</p>
            <p className="mt-0.5 text-sm text-gray-600">{b.sirket ?? 'şirket bilinmiyor'}</p>
            <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12px] leading-snug">
              <dt className="text-gray-600">Deneme</dt>
              <dd className="tabular-nums text-gray-900">{sayi(b.denemeler)}</dd>
              <dt className="text-gray-600">Sonraki deneme</dt>
              <dd className="text-gray-900">{tarihSaatMetni(b.sonrakiDeneme) ?? 'zamanlanmadı'}</dd>
              <dt className="text-gray-600">Son hata</dt>
              <dd className="break-words font-mono text-[11px] text-rose-800">{b.sonHata ?? 'kayıt yok'}</dd>
            </dl>
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
        Kontrolü bekleyen ilan yok.
      </p>
    )}
  </section>
);

/**
 * SON KARARLAR — otomatik ve yönetici, en yeni 30
 *
 * Otomatik yayınlanan ilan yöneticinin önünden geçmiyor; burada
 * görünüyor ve gerekirse buradan GEREKÇEYLE yayından kaldırılıyor
 * (`yonetim_ilan_yayindan_kaldir`). Düğme yalnız ilanın en yeni kararında:
 * aynı ilanın beş satırında beş düğme, hangisinin "asıl" olduğunu
 * sordururdu. İkinci adım (onay kutusu) GerekceliKarar'da.
 */
const SonKararlarBolumu: React.FC<{
  kararlar: OnayKontrolKarari[];
  kaldir: (ilanId: string, gerekce: string) => Promise<void>;
}> = ({ kararlar, kaldir }) => {
  const [acik, setAcik] = React.useState<number | null>(null);
  const ilkKarar = new Set<number>();
  const gorulen = new Set<string>();
  for (const k of kararlar) {
    if (!gorulen.has(k.ilanId)) {
      gorulen.add(k.ilanId);
      ilkKarar.add(k.id);
    }
  }
  return (
  <section aria-labelledby="son-kararlar" className="space-y-2">
    <h2 id="son-kararlar" className="text-sm font-bold text-gray-900">
      Son kararlar
    </h2>
    {kararlar.length ? (
      <ul className="space-y-2">
        {kararlar.map((k) => (
          <li key={k.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  KARAR_RENGI[k.karar] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {kararEtiketi(k.karar)}
              </span>
              {k.kapsam === 'degisiklik' && <Etiket renk="uyari">Değişiklik</Etiket>}
              <Etiket>{k.kaynak === 'yonetici' ? 'yönetici' : 'otomatik'}</Etiket>
              <span className="text-[11px] text-gray-600">{tarihSaatMetni(k.zaman) ?? ''}</span>
            </div>
            <p className="mt-1.5 break-words text-sm font-bold leading-snug text-gray-900">{k.baslik}</p>
            <p className="mt-0.5 text-sm text-gray-600">
              {k.sirket ?? 'şirket bilinmiyor'} · ilan şu an {ILAN_DURUM_ADI[k.ilanDurumu] ?? k.ilanDurumu}
            </p>
            {(gerekceleriOku(k.gerekceler).length > 0 || k.hata) && (
              <div className="mt-2 rounded-lg bg-gray-50 px-2.5 py-2">
                {gerekceleriOku(k.gerekceler).length > 0 && <GerekceListesi ham={k.gerekceler} />}
                {k.hata && (
                  <p className="mt-1 break-words font-mono text-[11px] text-rose-800">Hata: {k.hata}</p>
                )}
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-gray-600">Kural sürümü: {k.kuralSurumu ?? 'bilinmiyor'}</p>
            {k.ilanDurumu === 'published' && (
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <a
                  href={`/ilan/${listingSlug({ id: k.ilanId, title: k.baslik })}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
                >
                  İlanı sitede aç
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                {ilkKarar.has(k.id) && (
                  <button
                    type="button"
                    onClick={() => setAcik((a) => (a === k.id ? null : k.id))}
                    aria-expanded={acik === k.id}
                    className="min-h-11 cursor-pointer rounded-xl border border-red-300 bg-white px-3 text-sm font-bold text-red-800 hover:bg-red-50"
                  >
                    Yayından kaldır
                  </button>
                )}
              </div>
            )}
            {acik === k.id && k.ilanDurumu === 'published' && (
              <GerekceliKarar
                kimlik={`kaldir-${k.id}`}
                gonderEtiketi="Yayından kaldır"
                aciklama={`İlan öğrencilerden hemen kalkar ve taslağa döner; şirket düzeltip yeniden gönderirse yayın senin onayına bağlı olur. ${GEREKCE_SIRKETE}`}
                onaySorusu="İlanın şimdi yayından kalkacağını ve gerekçenin şirkete gösterileceğini anladım."
                onGonder={async (g) => {
                  await kaldir(k.ilanId, g);
                  setAcik(null);
                }}
                onVazgec={() => setAcik(null)}
              />
            )}
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
        Henüz kontrol kararı yok.
      </p>
    )}
  </section>
  );
};

export const OnaySayfasi: React.FC<{
  /**
   * Kuyruğu okuyan çağrı. Üretimde verilmiyor → `fetchOnayKuyrugu`.
   * Geliştirme fikstürü (src/dev/SirketPanelDevFixture) kendi kuyruğunu
   * veriyor: yönetici ekranı oturumsuz açılmıyor ve telefondaki yerleşimi
   * başka türlü ölçülemiyordu.
   */
  kuyrukGetir?: () => Promise<OnayKuyrugu>;
}> = ({ kuyrukGetir = fetchOnayKuyrugu }) => {
  const [kuyruk, setKuyruk] = React.useState<OnayKuyrugu | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [sekme, setSekme] = React.useState<'ilan' | 'dogrulama' | 'sahiplenme' | 'bolum'>('ilan');
  const [redEdilen, setRedEdilen] = React.useState<string | null>(null);
  const [redSebebi, setRedSebebi] = React.useState('');
  const [islemdeki, setIslemdeki] = React.useState<string | null>(null);
  const [uyari, setUyari] = React.useState<string | null>(null);
  const [bilgi, setBilgi] = React.useState<string | null>(null);

  const yukle = React.useCallback(() => {
    setDurum('yukleniyor');
    kuyrukGetir()
      .then((k) => {
        setKuyruk(k);
        setDurum('hazir');
      })
      .catch(() => setDurum('hata'));
  }, [kuyrukGetir]);

  React.useEffect(yukle, [yukle]);

  const kararVer = async (ilan: OnayIlani, karar: 'onayla' | 'reddet') => {
    setIslemdeki(ilan.id);
    setUyari(null);
    try {
      await ilanKarariVer(ilan.id, karar, ilan.guncellendi);
      /*
        Satır listeden ÇIKARILIYOR, sayfa yeniden çekilmiyor: yöneticinin
        kuyruğu tek tek eritmesi gerekiyor ve her kararda sayfanın baştan
        yüklenmesi sırayı kaybettirirdi.
      */
      setKuyruk((k) =>
        k ? { ...k, ilanlar: k.ilanlar.filter((x) => x.id !== ilan.id) } : k,
      );
    } catch {
      /*
        Başarısızlıkta satır KALIYOR ve sebep yazılıyor. Sessizce
        kaybolsaydı, yönetici kararın uygulandığını sanırdı.
      */
      setUyari(
        `"${ilan.baslik}" için karar uygulanamadı. İlan bu arada değişmiş olabilir; kuyruğu yenile.`,
      );
    } finally {
      setIslemdeki(null);
    }
  };

  /*
    DOĞRULAMA KARARI

    VKN'yi yazan şirket burada bekliyordu ama kuyruk yoktu: fonksiyonlar
    (`sirket_dogrula`, `sirket_dogrulamayi_reddet`) Ağustos'tan beri
    veritabanında duruyor, arayüzde onları çağıran hiçbir yer yoktu.
    Şirkete "bir insan kontrol ediyor" deniyor, o insana iş düşmüyordu.
  */
  const dogrulamaKarari = async (d: OnayDogrulama, karar: 'onayla' | 'reddet') => {
    if (karar === 'reddet' && !redSebebi.trim()) return;
    setIslemdeki(d.id);
    setUyari(null);
    try {
      if (karar === 'onayla') await sirketiDogrula(d.id);
      else await sirketDogrulamasiniReddet(d.id, redSebebi.trim());
      setKuyruk((k) =>
        k ? { ...k, dogrulamalar: k.dogrulamalar.filter((x) => x.id !== d.id) } : k,
      );
      setRedEdilen(null);
      setRedSebebi('');
    } catch {
      setUyari(
        `"${d.sirket ?? 'şirket'}" için karar uygulanamadı. Kuyruğu yenileyip tekrar dene.`,
      );
    } finally {
      setIslemdeki(null);
    }
  };

  /*
    GEREKÇELİ KARARLAR — başarıda kuyruk yeniden okunuyor

    Ret, değişiklik kararı ve yayından kaldırma birden çok listeyi aynı
    anda değiştiriyor (ilan kuyruktan çıkıyor, son kararlara satır
    ekleniyor). Yerel olarak elle düzeltmek yerine sunucudan okunuyor.
    Hata GerekceliKarar'ın içinde yazıyor; form açık kalıyor.
  */
  const gerekceliIslem = async (ad: string, is: () => Promise<void>) => {
    setUyari(null);
    setBilgi(null);
    await is();
    setBilgi(ad);
    yukle();
  };

  const degisiklikOnayla = async (d: OnayDegisikligi) => {
    setIslemdeki(d.id);
    setUyari(null);
    setBilgi(null);
    try {
      await ilanDegisikligiKarari(d.id, 'onayla');
      setBilgi(`"${d.baslik}" için değişiklik onaylandı; yeni sürüm yayında.`);
      yukle();
    } catch {
      setUyari(`"${d.baslik}" için değişiklik onaylanamadı. Kuyruğu yenileyip tekrar dene.`);
    } finally {
      setIslemdeki(null);
    }
  };

  const ilanlar = kuyruk?.ilanlar ?? [];
  const degisiklikler = kuyruk?.degisiklikler ?? [];
  const dogrulamalar = kuyruk?.dogrulamalar ?? [];
  const sahiplenmeler = kuyruk?.sahiplenmeler ?? [];
  const bolumler = kuyruk?.bolumler ?? [];
  const kontrolBekleyenler = kuyruk?.kontrolBekleyenler ?? [];
  const sonKararlar = kuyruk?.sonKararlar ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kuyruk">
        <Sekme etkin={sekme === 'ilan'} etiket="İlan" adet={ilanlar.length} tikla={() => setSekme('ilan')} />
        <Sekme
          etkin={sekme === 'dogrulama'}
          etiket="Doğrulama"
          adet={dogrulamalar.length}
          tikla={() => setSekme('dogrulama')}
        />
        <Sekme
          etkin={sekme === 'sahiplenme'}
          etiket="Sahiplenme"
          adet={sahiplenmeler.length}
          tikla={() => setSekme('sahiplenme')}
        />
        <Sekme etkin={sekme === 'bolum'} etiket="Bölüm" adet={bolumler.length} tikla={() => setSekme('bolum')} />
      </div>

      {durum === 'yukleniyor' && <Iskelet yukseklik="h-40" />}

      {durum === 'hata' && (
        <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center">
          <p className="font-bold text-rose-800">Onay kuyruğu yüklenemedi</p>
          <button
            type="button"
            onClick={yukle}
            className="mt-3 min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            Yeniden dene
          </button>
        </div>
      )}

      {uyari && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {uyari}
        </p>
      )}

      {bilgi && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {bilgi}
        </p>
      )}

      {durum === 'hazir' && sekme === 'ilan' && kuyruk && (
        <YenidenDenemeSatiri is={kuyruk.yenidenDenemeIsi} bekleyenSayisi={kontrolBekleyenler.length} />
      )}

      {durum === 'hazir' && sekme === 'ilan' && (
        ilanlar.length ? (
          <ul className="space-y-3">
            {ilanlar.map((i) => (
              <IlanSatiri
                key={i.id}
                ilan={i}
                islemde={islemdeki === i.id}
                karar={(k) => void kararVer(i, k)}
                gerekceyleReddet={(g) =>
                  gerekceliIslem(`"${i.baslik}" gerekçeyle reddedildi; şirket gerekçeyi panelinde görecek.`, () =>
                    ilanGerekceyleReddet(i.id, g),
                  )
                }
              />
            ))}
          </ul>
        ) : (
          <BosDurum mesaj="Onay bekleyen ilan yok" />
        )
      )}

      {durum === 'hazir' && sekme === 'ilan' && (
        <section aria-labelledby="incelemedeki-degisiklikler" className="space-y-2">
          <h2 id="incelemedeki-degisiklikler" className="text-sm font-bold text-gray-900">
            İncelemedeki değişiklikler
            <span className="ml-1.5 font-semibold tabular-nums text-gray-600">{sayi(degisiklikler.length)}</span>
          </h2>
          {degisiklikler.length ? (
            <ul className="space-y-2">
              {degisiklikler.map((d) => (
                <DegisiklikSatiri
                  key={d.id}
                  d={d}
                  islemde={islemdeki === d.id}
                  onayla={() => void degisiklikOnayla(d)}
                  reddet={(g) =>
                    gerekceliIslem(
                      `"${d.baslik}" için değişiklik reddedildi; ilanın yayındaki hâli değişmedi.`,
                      () => ilanDegisikligiKarari(d.id, 'reddet', g),
                    )
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
              İncelemede bekleyen değişiklik yok.
            </p>
          )}
        </section>
      )}

      {durum === 'hazir' && sekme === 'ilan' && (
        <KontrolBekleyenBolumu bekleyenler={kontrolBekleyenler} />
      )}

      {durum === 'hazir' && sekme === 'ilan' && (
        <SonKararlarBolumu
          kararlar={sonKararlar}
          kaldir={(id, g) =>
            gerekceliIslem('İlan yayından kaldırıldı; şirket gerekçeyi panelinde görecek.', () =>
              ilanYayindanKaldir(id, g),
            )
          }
        />
      )}

      {durum === 'hazir' && sekme === 'dogrulama' && (
        dogrulamalar.length ? (
          <ul className="space-y-3">
            {dogrulamalar.map((d) => (
              <li key={d.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{d.sirket ?? 'şirket bilinmiyor'}</p>
                    <p className="mt-0.5 font-mono text-sm text-gray-700">VKN {d.vkn}</p>
                    {d.mersis && <p className="font-mono text-xs text-gray-500">MERSİS {d.mersis}</p>}
                    {/*
                      KARARI DEĞİŞTİRECEK BİLGİ EKRANDA: VKN herkese açık ve
                      tek başına yetkiyi kanıtlamıyor. Bakılan şey ticari
                      unvanın, sitenin ve İK e-postasının aynı kuruma işaret
                      edip etmediği.
                    */}
                    <p className="mt-1.5 text-sm text-gray-600">
                      {d.ikEposta ?? 'İK e-postası yok'}
                      {d.site && (
                        <>
                          {' · '}
                          <a
                            href={d.site}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                          >
                            {d.site.replace(/^https?:\/\//, '')}
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {d.uyeSayisi} üye
                      {d.slug && (
                        <>
                          {' · '}
                          <a href={`/sirket/${d.slug}`} className="text-blue-700 hover:underline">
                            şirket sayfası
                          </a>
                        </>
                      )}
                    </p>
                    {d.redNotu && (
                      <p className="mt-1.5 text-xs text-amber-700">Önceki ret: {d.redNotu}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={islemdeki === d.id}
                      onClick={() => void dogrulamaKarari(d, 'onayla')}
                      className="min-h-9 cursor-pointer rounded-lg bg-gray-900 px-3 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Doğrula
                    </button>
                    <button
                      type="button"
                      disabled={islemdeki === d.id}
                      onClick={() => setRedEdilen((o) => (o === d.id ? null : d.id))}
                      className="min-h-9 cursor-pointer rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-700 disabled:opacity-50"
                    >
                      Reddet
                    </button>
                  </div>
                </div>

                {/* Sebep ZORUNLU: sebepsiz ret, şirketin ne yapacağını bilmemesi demek. */}
                {redEdilen === d.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={redSebebi}
                      onChange={(e) => setRedSebebi(e.target.value)}
                      placeholder="Ret sebebi — şirkete yazılacak"
                      className="min-h-9 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm"
                    />
                    <button
                      type="button"
                      disabled={!redSebebi.trim() || islemdeki === d.id}
                      onClick={() => void dogrulamaKarari(d, 'reddet')}
                      className="min-h-9 cursor-pointer rounded-lg bg-red-600 px-3 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Reddi gönder
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <BosDurum mesaj="Doğrulama bekleyen şirket yok" />
        )
      )}

      {durum === 'hazir' && sekme === 'sahiplenme' && (
        sahiplenmeler.length ? (
          <ul className="space-y-3">
            {sahiplenmeler.map((s) => (
              <li key={s.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-bold text-gray-900">{s.sirket ?? 'şirket bilinmiyor'}</p>
                <p className="mt-0.5 text-sm text-gray-600">
                  {[s.kisi, s.unvan].filter(Boolean).join(' · ') || 'kişi bilgisi yok'}
                </p>
                {s.eposta && <p className="mt-0.5 text-sm text-gray-600">{s.eposta}</p>}
                {s.not && <p className="mt-1.5 text-sm text-gray-700">{s.not}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <BosDurum mesaj="Bekleyen sahiplenme talebi yok" />
        )
      )}

      {durum === 'hazir' && sekme === 'bolum' && (
        bolumler.length ? (
          <ul className="space-y-3">
            {bolumler.map((b) => (
              <li key={b.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-bold text-gray-900">{b.istenen ?? 'bölüm adı yok'}</p>
                {b.universite && <p className="mt-0.5 text-sm text-gray-600">{b.universite}</p>}
                {b.aciklama && <p className="mt-1.5 text-sm text-gray-700">{b.aciklama}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <BosDurum mesaj="Bekleyen bölüm talebi yok" />
        )
      )}

      {/*
        SAHİPLENME VE BÖLÜMDE KARAR DÜĞMESİ YOK.

        İkisinin de kuyruğu şu an boş ve karar akışları ilanınkinden
        farklı (sahiplenmede alan adı eşleşmesi elle doğrulanıyor).
        Çalışmayan bir düğme koymak, çalışıyor sanılmasına yol açardı.
      */}
      {durum === 'hazir' && (sekme === 'sahiplenme' || sekme === 'bolum') && (
        <p className="text-[11px] leading-relaxed text-gray-500">
          Bu kuyrukta karar düğmesi henüz yok: ikisi de boş ve karar akışları
          ilanınkinden farklı. Talep geldiğinde kendi akışıyla eklenecek.
        </p>
      )}
    </div>
  );
};
