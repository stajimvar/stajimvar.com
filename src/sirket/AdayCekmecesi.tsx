import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ExternalLink, FileText, Github, Loader2, ShieldOff, X } from 'lucide-react';
import {
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  SIRKET_ZEMIN,
  birincilStil,
  ikincilStil,
} from './renk';
import { BIRINCI_SIRA, IKINCI_SIRA, kimlikSatiri, monogram } from '../lib/aday-kart.mjs';
import { durumAdi } from './basvuru-durumu';

/**
 * Aday çekmecesi — sağdan açılan panel.
 *
 * FLIP YOK
 * --------
 * Kart çevrilmiyor. Çevirme animasyonu ilk seferde hoş, yirminci
 * başvuruda engel: kullanıcı arkadaki bilgiye ulaşmak için her seferinde
 * animasyonu bekliyor. Çekmece kartı yerinde bırakıyor, ızgaradaki yeri
 * kaybolmuyor.
 *
 * PORTAL
 * ------
 * `document.body` altına çiziliyor. Üstteki başlık çubuğunun `sticky` ve
 * `backdrop-filter` bağlamı, `position: fixed` alt öğeleri kendi kutusuna
 * hapsediyor — hesap panelinde aynı hata bir kez yaşandı.
 *
 * MİNİ ATS KARTIN ALTINDA
 * -----------------------
 * Birinci sıra (İncelemede / Mülakat / Reddet) hep görünür: gün içindeki
 * karar bu. İkinci sıra (case, teklif, görüşme bağlantısı) katlı duruyor;
 * kartın üstüne konsaydı asıl kararı gölgelerdi.
 */

const Baslik: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3
    className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest"
    style={{ color: SIRKET_METIN_IKINCIL }}
  >
    {children}
  </h3>
);

export const AdayCekmecesi: React.FC<{
  kart: Record<string, any> | null;
  kaydediliyor: boolean;
  onKapat: () => void;
  onDurum: (durum: string) => void;
  onNot: (metin: string) => void;
  /*
    GÖMÜLÜ KİP — MASAÜSTÜNDE YAN PANEL

    Aynı içerik iki yerde: dar ekranda üstten gelen çekmece, geniş
    ekranda ızgaranın yanında duran panel. İki ayrı bileşen yazmak,
    aday ayrıntısının iki farklı hâlini ayrı ayrı eskitirdi.

    Gömülüyken portal, arka plan karartması ve `fixed` konumlama yok:
    panel akışın içinde duruyor.
  */
  gomulu?: boolean;
}> = ({ kart, kaydediliyor, onKapat, onDurum, onNot, gomulu }) => {
  /*
    İmzalı adres tıklama anında üretiliyor, kart çizilirken değil: adresin
    ömrü on dakika ve önceden üretilseydi açılmadan ölürdü. Ayrıca
    görülmeyen her aday için gereksiz bir istek olurdu.
  */
  const [cvAciliyor, setCvAciliyor] = React.useState(false);
  const [cvHatasi, setCvHatasi] = React.useState<string | null>(null);
  const cvAc = async () => {
    if (!kart?.cvYolu) return;
    setCvHatasi(null);
    setCvAciliyor(true);
    try {
      const { cvGoruntulemeAdresi } = await import('../lib/cv');
      const adres = await cvGoruntulemeAdresi(kart.cvYolu);
      window.open(adres, '_blank', 'noopener,noreferrer');
    } catch {
      setCvHatasi('CV açılamadı. Şirket doğrulaması tamamlanmamış olabilir.');
    } finally {
      setCvAciliyor(false);
    }
  };

  const [ikinciAcik, setIkinciAcik] = React.useState(false);
  const [not, setNot] = React.useState('');
  const govde = React.useRef<HTMLDivElement | null>(null);

  /* Çekmece değiştiğinde ikinci sıra, not ve CV hatası sıfırlanıyor. */
  React.useEffect(() => {
    setIkinciAcik(false);
    setNot('');
    /* İkinci adaya geçince önceki adayın CV hatası ekranda kalmasın. */
    setCvHatasi(null);
    setCvAciliyor(false);
  }, [kart?.id]);

  React.useEffect(() => {
    if (!kart) return undefined;
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onKapat();
      }
    };
    document.addEventListener('keydown', tus);
    govde.current?.focus();
    return () => document.removeEventListener('keydown', tus);
  }, [kart, onKapat]);

  /*
    ERKEN ÇIKIŞ — BÜTÜN HOOK'LARDAN SONRA

    P0: Bu satırın ALTINDA iki `useState` duruyordu (CV düğmesinin
    açılıyor/hata durumu). Çekmece kapalıyken bileşen 5 hook ile,
    "İncele"ye basılınca 7 hook ile render oluyordu. React bunu
    "Rendered more hooks than during the previous render." diye
    yükseltiyor ve hata render sırasında atıldığı için TÜM AĞAÇ
    sökülüyordu — işveren paneli komple beyaz ekrana düşüyordu.

    Liste ekranı çalışmaya devam ettiği için hata yalnızca aday
    ayrıntısını açarken görünüyordu.

    Kural: bu satırdan sonra hiçbir hook çağrılamaz.
  */
  if (!kart) return null;

  const kimlik = kimlikSatiri(kart);

  /*
    LİSTELER DİZE OLMAYAN ÖĞEYE DAYANIKLI

    `profile_snapshot` istemcide üretilip veritabanına yazılıyor; şeması
    zorlanmıyor. Bir gün diller ya da yetenekler nesne dizisi olarak
    gelirse `join(', ')` ekrana "[object Object]" yazardı ve `.map`
    içindeki bir alan erişimi ayrıntıyı komple düşürebilirdi.

    Dize olmayan ve boş öğeler atılıyor. Liste tamamen boşalırsa o bölüm
    hiç çizilmiyor — eksik bir alan yüzünden ayrıntı açılmamazlık
    etmiyor.
  */
  const dizeListesi = (deger: unknown): string[] =>
    Array.isArray(deger)
      ? deger.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];

  const yetenekler = dizeListesi(kart.yetenekler);
  const diller = dizeListesi(kart.diller);
  const projeler = Array.isArray(kart.projeler) ? kart.projeler : [];

  const panel = (
    <div
      ref={govde}
      role={gomulu ? 'region' : 'dialog'}
      aria-modal={gomulu ? undefined : true}
      aria-label="Aday ayrıntısı"
      tabIndex={-1}
      className={
        gomulu
          ? 'flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border outline-none'
          : 'absolute inset-y-0 right-0 flex w-full max-w-md flex-col outline-none'
      }
      style={{ background: SIRKET_ZEMIN, borderColor: gomulu ? SIRKET_KENAR : undefined }}
    >
        <div
          className="flex items-start gap-3 border-b p-4"
          style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}
        >
          {kart.fotoUrl && !kart.gizli ? (
            <img src={kart.fotoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-black"
              style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
            >
              {kart.gizli ? <ShieldOff className="h-5 w-5" /> : monogram(kart.ad)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
              {kart.gizli ? 'Aday' : (kart.ad ?? 'Ad paylaşılmadı')}
            </p>
            {kimlik && (
              <p className="text-xs font-semibold" style={{ color: SIRKET_METIN_IKINCIL }}>
                {kimlik}
              </p>
            )}
            <p className="mt-1 text-[11px] font-bold" style={{ color: SIRKET_VURGU_KOYU }}>
              {durumAdi(kart.durum)}
              {kart.ilanBasligi ? ` · ${kart.ilanBasligi}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Kapat"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {!kart.paylasildi && (
            <div
              className="rounded-2xl border p-3 text-xs leading-relaxed"
              style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN_IKINCIL }}
            >
              Bu başvuru şirketin kendi sitesinden yapıldı. Öğrenci profilini StajımVar ile
              paylaşmadığı için burada ad, okul ve iletişim bilgisi yok — bu bilgiler
              şirketin kendi başvuru sisteminde.
            </div>
          )}

          {kart.onYazi && (
            <section>
              <Baslik>Ön yazı</Baslik>
              <p
                className="whitespace-pre-line rounded-2xl border p-3 text-sm leading-relaxed"
                style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }}
              >
                {kart.onYazi}
              </p>
            </section>
          )}

          {yetenekler.length > 0 && (
            <section>
              <Baslik>Yetenekler</Baslik>
              <div className="flex flex-wrap gap-1.5">
                {yetenekler.map((y: string) => (
                  <span
                    key={y}
                    className="rounded-lg px-2 py-1 text-[11px] font-bold"
                    style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
                  >
                    {y}
                  </span>
                ))}
              </div>
            </section>
          )}

          {diller.length > 0 && (
            <section>
              <Baslik>Diller</Baslik>
              <p className="text-sm" style={{ color: SIRKET_METIN }}>
                {diller.join(', ')}
              </p>
            </section>
          )}

          {projeler.length > 0 && (
            <section>
              <Baslik>Projeler</Baslik>
              <ul className="space-y-2">
                {projeler.map((p: any, i: number) => (
                  <li
                    key={p?.baslik ?? i}
                    className="rounded-2xl border p-3"
                    style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY }}
                  >
                    <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
                      {p?.baslik}
                    </p>
                    {p?.aciklama && (
                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                        {p.aciklama}
                      </p>
                    )}
                    {p?.adres && (
                      <a
                        href={p.adres}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold"
                        style={{ color: SIRKET_VURGU_KOYU }}
                      >
                        Projeyi aç
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(kart.github || kart.portfolyo || kart.cvYolu) && (
            <section>
              <Baslik>Bağlantılar</Baslik>
              <div className="flex flex-wrap gap-2">
                {kart.github && (
                  <a
                    href={`https://github.com/${kart.github}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={IKINCIL_DUGME}
                    style={ikincilStil}
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                )}
                {kart.portfolyo && (
                  <a
                    href={kart.portfolyo}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={IKINCIL_DUGME}
                    style={ikincilStil}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Portfolyo
                  </a>
                )}
                {/*
                  CV ARTIK AÇILABİLİYOR

                  Burada yalnızca "CV başvuruya ekli" yazan ölü bir etiket
                  vardı; dosyayı açmanın hiçbir yolu yoktu. Kova gizli
                  olduğu için public adres üretilmiyor — her tıklamada kısa
                  ömürlü imzalı adres alınıyor ve adresi üretebilmek
                  dosyayı OKUYABİLMEYİ gerektiriyor. Yani kapı burada
                  değil, depolama politikasında: yalnızca doğrulanmış
                  şirket, yalnızca kendi ilanına gelen başvurunun belgesi.

                  Gösterilen dosya başvuru anının kopyası; öğrenci bugün
                  CV'sini değiştirmiş olsa bile burada değişmiyor.
                */}
                {kart.cvYolu && (
                  <button
                    type="button"
                    onClick={() => void cvAc()}
                    disabled={cvAciliyor}
                    className={IKINCIL_DUGME}
                    style={ikincilStil}
                  >
                    {cvAciliyor ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    CV'yi görüntüle
                  </button>
                )}
              </div>
              {cvHatasi && (
                <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: '#991B1B' }}>
                  {cvHatasi}
                </p>
              )}
            </section>
          )}
        </div>

        {/* ------------------------------------------------ eylemler */}
        <div className="border-t p-4" style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}>
          <div className="flex flex-wrap gap-2">
            {BIRINCI_SIRA.map((e: { id: string; etiket: string }) => (
              <button
                key={e.id}
                type="button"
                disabled={kaydediliyor}
                onClick={() => onDurum(e.id)}
                className={e.id === 'under_review' ? BIRINCIL_DUGME : IKINCIL_DUGME}
                style={e.id === 'under_review' ? birincilStil : ikincilStil}
              >
                {e.etiket}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIkinciAcik((o) => !o)}
            aria-expanded={ikinciAcik}
            className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl text-xs font-bold"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            Daha fazla
            <ChevronDown
              className="h-4 w-4 transition-transform"
              style={{ transform: ikinciAcik ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          {ikinciAcik && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {IKINCI_SIRA.map((e: { id: string; etiket: string }) => (
                  <button
                    key={e.id}
                    type="button"
                    disabled={kaydediliyor}
                    onClick={() => onDurum(e.id)}
                    className={IKINCIL_DUGME}
                    style={ikincilStil}
                  >
                    {e.etiket}
                  </button>
                ))}
              </div>
              {/*
                Not ÖĞRENCİYE GÖRÜNÜR: `company_feedback` adayın kendi
                başvuru sayfasında okunuyor. Bunu yazmadan not alanı
                koymak, dahili sanılan bir metnin adaya gitmesine yol
                açardı.
              */}
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold" style={{ color: SIRKET_METIN_IKINCIL }}>
                  Adaya not — başvuru sayfasında görüyor
                </span>
                <textarea
                  value={not}
                  onChange={(e) => setNot(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border p-2.5 text-sm outline-none"
                  style={{ borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }}
                />
              </label>
              <button
                type="button"
                disabled={!not.trim() || kaydediliyor}
                onClick={() => onNot(not.trim())}
                className={IKINCIL_DUGME}
                style={ikincilStil}
              >
                Notu kaydet
              </button>
            </div>
          )}
        </div>
    </div>
  );

  if (gomulu) return panel;

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(28,20,16,.35)' }}
        onClick={onKapat}
        aria-hidden
      />
      {panel}
    </div>,
    document.body
  );
};
