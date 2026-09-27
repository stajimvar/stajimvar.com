import React from 'react';
import { Check, Copy, Info } from 'lucide-react';
import {
  ACIKLAMA_EN_AZ,
  ACIKLAMA_EN_FAZLA,
  CALISMA_SEKILLERI,
  STAJ_TURLERI,
  UCRET_SECENEKLERI,
  ilanFormDegeri,
  ilanGecerli,
  ilanSatiri,
  ilanSorunlari,
} from '../lib/ilan-formu.mjs';
import { ilanBaslangicDurumu, ilanBayraklari } from '../lib/sirket-kademe.mjs';
import { POZISYONLAR, pozisyonAlani, pozisyonAra } from '../lib/pozisyonlar.mjs';
import { ilanOku } from '../lib/sirket-veri';
import { AutocompleteField } from '../components/AutocompleteField';
import { TR_CITIES } from '../data/turkeyData';
import { FORM_ALAN, UzayanMetin } from './form-parcalari';
import {
  BIRINCIL_DUGME,
  BIRINCIL_RENK,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';

/**
 * İlan formu — tek ekran, sihirbaz yok.
 *
 * Hedef: İK telefonla iki dakikada ilan açsın. Sihirbaz her adımda bir
 * "ileri" tuşu ekliyor ve iki dakikayı beşe çıkarıyor; ayrıca kullanıcı
 * kaç adım kaldığını bilmediği için yarıda bırakıyor. Tek ekranda ne
 * kadar iş olduğu ilk bakışta görünüyor.
 *
 * YAYIN KARARI FORMDA DEĞİL, KURALDA
 * ----------------------------------
 * Kademe 2 ise anında yayında. Kademe 1 ise e-posta alan adı şirketin
 * sitesiyle eşleşiyorsa yayında, eşleşmiyorsa taslak + yönetici kuyruğu.
 * Kullanıcı "yayınla" derken hangisinin olacağını ÖNCEDEN görüyor —
 * bastıktan sonra "neden yayında değil" sorusu doğmasın.
 */

/*
  SIKI FORM (27 Eylül 2026, kullanıcı isteği: "profil düzenlemesi gibi,
  büyük boşluklar olmasın")
  ---------------------------------------------------------------------
  Şirket profil formuyla aynı dil: tek kart, başlık satırı, kısa alanlar
  sm üstünde iki sütun, xl'de (≥1280) kartın içi iki panel — solda kısa
  alanlar, sağda iş tanımı. Geniş ekranda seçim şeritlerinin yanında
  kalan boşluk ve dokuz satırlık sabit metin kutusu gitti; metin kutusu
  yazdıkça uzuyor. Alan boyu ve metin kutusu `form-parcalari.tsx`'ten.

  Zorunlu alan yıldızla değil, başlık satırındaki tek cümleyle
  söyleniyor; isteğe bağlı tek alan (son başvuru) kendi yanında yazıyor.
*/

/** Alan etiketi: solda ad, sağda (varsa) sorun ya da "isteğe bağlı". */
const Etiket: React.FC<{
  children: React.ReactNode;
  sorun?: string;
  htmlFor?: string;
  id?: string;
  istegeBagli?: boolean;
}> = ({ children, sorun, htmlFor, id, istegeBagli }) => {
  const ad = (
    <span className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
      {children}
    </span>
  );
  return (
    <span className="mb-1 flex items-baseline justify-between gap-2">
      {htmlFor ? <label htmlFor={htmlFor}>{ad}</label> : <span id={id}>{ad}</span>}
      {sorun ? (
        <span className="text-xs font-semibold text-rose-700">{sorun}</span>
      ) : (
        istegeBagli && (
          <span className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
            isteğe bağlı
          </span>
        )
      )}
    </span>
  );
};

const SecimSeridi: React.FC<{
  secenekler: { id: string; etiket: string }[];
  deger: string;
  onSec: (id: string) => void;
  etiketId: string;
}> = ({ secenekler, deger, onSec, etiketId }) => (
  <div role="group" aria-labelledby={etiketId} className="flex flex-wrap gap-2">
    {secenekler.map((s) => (
      <button
        key={s.id}
        type="button"
        onClick={() => onSec(s.id)}
        aria-pressed={deger === s.id}
        className="min-h-11 cursor-pointer rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
        style={
          deger === s.id
            ? { borderColor: SIRKET_VURGU_KOYU, color: SIRKET_VURGU_KOYU, background: SIRKET_ROZET }
            : { borderColor: SIRKET_KENAR, color: SIRKET_METIN_IKINCIL, background: SIRKET_YUZEY }
        }
      >
        {s.etiket}
      </button>
    ))}
  </div>
);

export interface IlanFormDegeri {
  unvan: string;
  sehir: string;
  calismaSekli: string;
  tur: string;
  sure: string;
  ucret: string;
  ucretTutari: string;
  aciklama: string;
  sonBasvuru: string;
}

const BOS: IlanFormDegeri = {
  unvan: '',
  sehir: '',
  calismaSekli: 'On-site',
  tur: 'yaz',
  sure: '20 iş günü',
  ucret: 'asgari',
  ucretTutari: '',
  aciklama: '',
  sonBasvuru: '',
};

export const IlanFormu: React.FC<{
  kademe: number;
  sirketAdi: string;
  siteUrl?: string | null;
  eposta?: string | null;
  onKaydet: (satir: Record<string, unknown>) => Promise<{ id: string } | null>;
  onIptal: () => void;
  /*
    Doluysa DÜZENLEME kipi: form aynı, kaydetme yolu farklı. Ayrı bir
    düzenleme bileşeni yazmak iki kopya demek olurdu — doğrulama kuralı
    ya da yeni bir alan birinde değişip diğerinde unutulurdu.
  */
  duzenlenenId?: string | null;
}> = ({ kademe, sirketAdi, siteUrl, eposta, onKaydet, onIptal, duzenlenenId }) => {
  const [deger, setDeger] = React.useState<IlanFormDegeri>(BOS);
  const [yukleniyor, setYukleniyor] = React.useState(Boolean(duzenlenenId));
  const [gonderildi, setGonderildi] = React.useState(false);
  const [durum, setDurum] = React.useState<'form' | 'kaydediliyor' | 'bitti' | 'hata'>('form');
  const [hata, setHata] = React.useState('');
  const [sonuc, setSonuc] = React.useState<{ id: string; yayinda: boolean } | null>(null);
  const [kopyalandi, setKopyalandi] = React.useState(false);
  const k = React.useId();
  /*
    ŞABLON DEĞİŞTİRME ONAYI: dolu bir iş tanımının üzerine şablon
    yazılmadan önce ne olacağı söyleniyor. Pozisyon değişince bekleyen
    onay düşüyor (öteki alanın şablonu için sorulmuş bir soru kalmasın).
  */
  const [onayBekleyen, setOnayBekleyen] = React.useState<{ id: string; etiket: string; metin: string } | null>(null);

  /* Düzenlemede kayıtlı satır forma çevriliyor (ilanFormDegeri,
     ilanSatiri'nin tersi). Okunamazsa form boş açılmıyor: hata yazıyor,
     yoksa kullanıcı var olan ilanı boş sanıp üzerine yazardı. */
  React.useEffect(() => {
    if (!duzenlenenId) return;
    let iptal = false;
    setYukleniyor(true);
    void ilanOku(duzenlenenId)
      .then((satir) => {
        if (iptal) return;
        setDeger(ilanFormDegeri(satir));
        setYukleniyor(false);
      })
      .catch((e: unknown) => {
        if (iptal) return;
        setHata(e instanceof Error ? e.message : 'İlan okunamadı.');
        setDurum('hata');
        setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [duzenlenenId]);

  const yaz = (alan: keyof IlanFormDegeri) => (v: string) =>
    setDeger((o) => ({ ...o, [alan]: v }));

  const sorunlar = ilanSorunlari(deger);
  const goster = (alan: keyof IlanFormDegeri) => (gonderildi ? sorunlar[alan] : undefined);

  /* Aday kartlarının açılması doğrulanmış şirkete bağlı; başvurunun
     nereye geldiğine değil. Form bunu ilan verilirken söylüyor. */
  const adayKimligiAcik = Number(kademe) >= 2;
  const baslangicDurumu = ilanBaslangicDurumu({ kademe });
  /*
    YAYINDA BAŞLAYAN İLAN YOK

    Eskiden doğrulanmış şirkette ya da alan adı eşleşmesinde ilan
    doğrudan yayına çıkıyordu. Artık istisnasız taslak: yayına alma
    yalnızca yöneticide ve aynı kural veritabanında da zorlanıyor.
    `siteUrl`/`eposta` prop'ları imzada kalıyor — şirket profili
    eksiksizliğini gösteren başka yerler onları kullanıyor.
  */
  const bayraklar = ilanBayraklari(deger.aciklama);

  /*
    POZİSYONA BAĞLI ŞABLONLAR (27 Eylül 2026)

    Alan pozisyon adından her yazışta yeniden bulunuyor; iş tanımı
    metnine DOKUNULMUYOR — pozisyon değişince yalnız önerilen
    başlangıç metinleri değişiyor, yazılmış metin olduğu gibi kalıyor.
    Tanınmayan pozisyonda şablon yok; alan boş kalıyor ve metin
    kutusundaki yol gösterici not duruyor.
  */
  const alan = pozisyonAlani(deger.unvan);
  const alanId = alan?.id ?? null;
  React.useEffect(() => {
    setOnayBekleyen(null);
  }, [alanId]);

  const sablonSec = (s: { id: string; etiket: string; metin: string }) => {
    const mevcut = deger.aciklama.trim();
    if (mevcut === '' || mevcut === s.metin.trim()) {
      setOnayBekleyen(null);
      yaz('aciklama')(s.metin);
      return;
    }
    setOnayBekleyen(s);
  };

  const gonder = async () => {
    setGonderildi(true);
    if (!ilanGecerli(deger) || !baslangicDurumu) return;

    setDurum('kaydediliyor');
    setHata('');
    try {
      /* Düzenlemede durum DEĞİŞMİYOR: yayınla/kapat ayrı bir eylem ve
         bir yazım hatasını düzeltmek ilanı sessizce yayına almamalı.
         `ilanGuncelle` zaten status ve posted_at alanlarını düşürüyor. */
      const satir = ilanSatiri(deger, { companyId: '', durum: baslangicDurumu });
      const kayit = await onKaydet(satir);
      if (!kayit) throw new Error('İlan kaydedilemedi.');
      setSonuc({ id: kayit.id, yayinda: false });
      setDurum('bitti');
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İlan kaydedilemedi.');
      setDurum('hata');
    }
  };

  if (durum === 'bitti' && sonuc) {
    const adres = `${window.location.origin}/ilan/${sonuc.id}`;
    return (
      <div className={`space-y-4 ${KUTU}`} style={kutuStil}>
        <p className="flex items-center gap-2 text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
          <Check className="h-5 w-5" style={{ color: SIRKET_VURGU_KOYU }} />
          İlan incelemeye gönderildi
        </p>
        <p className="text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          {/*
            TEK CÜMLE, TEK GERÇEK

            Burada iki dal vardı ve biri "İlan canlı · öğrenci
            listesinde görünüyor" diyordu. O dal artık hiç
            çalışmıyor: yayına alma yalnızca yöneticide. İki dalı
            bırakmak, çalışmayan bir yolu ekranda tutmak olurdu.

            Karar artık iki kanaldan geliyor ama ikisi de aynı
            `ilan_incele` çağrısına bağlı: RPC panele yazdığı anda
            aynı satırdan kuyruğa da düşüyor (bkz. scripts/
            ilan-karar-bildirimi-kuyrugu.mjs). Tek doğru kaynak
            bozulmuyor, sadece o kaynağın iki çıkışı var.
          */}
          Her ilan yayına alınmadan önce bizde inceleniyor — şirketin
          doğrulanmış olması bu adımı atlatmıyor. Genellikle bir iş günü
          içinde sonuçlandırıyoruz. Sonucu e-posta ile ve şirket
          panelinde göreceksin: onaylanırsa ilan yayına çıkar,
          reddedilirse taslakta kalır ve nedeni ilanın altına yazılır.
        </p>

        {sonuc.yayinda && (
          <div className="flex flex-wrap items-center gap-2">
            <code
              className="min-w-0 flex-1 truncate rounded-xl px-3 py-2.5 font-mono text-xs"
              style={{ background: SIRKET_ROZET, border: `1px solid ${SIRKET_KENAR}`, color: SIRKET_METIN }}
            >
              {adres}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(adres)
                  .then(() => setKopyalandi(true))
                  .catch(() => setKopyalandi(false));
              }}
              className={BIRINCIL_DUGME}
              style={birincilStil}
            >
              <Copy className="h-4 w-4" />
              {kopyalandi ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onIptal}
          className={IKINCIL_DUGME}
          style={ikincilStil}
        >
          İlanlara dön
        </button>
      </div>
    );
  }

  /* Düzenlemede kayıtlı değerler gelene kadar boş form çizilmiyor:
     kullanıcı bir an boş alanlar görüp "ilan silinmiş" sanmasın. */
  if (yukleniyor) {
    return (
      <div className="space-y-4">
        <span className="block h-8 w-48 animate-pulse rounded" style={{ background: SIRKET_ROZET }} />
        <div className={`space-y-3 ${KUTU}`} style={kutuStil}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block h-11 w-full animate-pulse rounded-xl"
              style={{ background: SIRKET_ROZET }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: SIRKET_METIN }}>
          {duzenlenenId ? 'İlanı düzenle' : 'Yeni ilan'}
        </h1>
        <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          {sirketAdi} ·{' '}
          {duzenlenenId
            ? /* Düzenleme durumu değiştirmiyor; yayınla/kapat ayrı eylem. */
              'Değişiklikler kaydedilir; ilanın yayın durumu aynı kalır'
            : 'Gönderdiğinde incelemeye gider; onaylanınca yayına çıkar'}
        </p>
      </div>

      <section className={KUTU} style={kutuStil} aria-labelledby={`${k}-baslik`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id={`${k}-baslik`} className="text-base font-black" style={{ color: SIRKET_METIN }}>
            İlan bilgileri
          </h2>
          <p className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
            Son başvuru dışında tüm alanlar zorunlu
          </p>
        </div>

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-x-8">
          {/* ------------------------------------------- kısa alanlar */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3 xl:content-start">
            <div className="min-w-0 sm:col-span-2">
              <Etiket htmlFor={`${k}-unvan`} sorun={goster('unvan')}>
                Pozisyon
              </Etiket>
              {/*
                ÖNERİ, ZORUNLULUK DEĞİL: liste yazdıkça kelime başından
                süzülüyor (Türkçe karakterden bağımsız); şirket listede
                olmayan kendi başlığını da yazabiliyor. Seçim yalnız bu
                alanı dolduruyor.
              */}
              <AutocompleteField
                id={`${k}-unvan`}
                value={deger.unvan}
                onChange={yaz('unvan')}
                options={POZISYONLAR}
                eslestir={pozisyonAra}
                placeholder="Ör. Yazılım Geliştirme Stajyeri"
                className={FORM_ALAN}
                klavyeDuzeni
              />
            </div>

            <div className="min-w-0">
              <Etiket htmlFor={`${k}-sehir`} sorun={goster('sehir')}>
                Şehir
              </Etiket>
              {/* Kapalı liste değil: listede olmayan şehir de yazılabiliyor. */}
              <AutocompleteField
                id={`${k}-sehir`}
                value={deger.sehir}
                onChange={yaz('sehir')}
                options={TR_CITIES}
                placeholder="Ör. İstanbul"
                className={FORM_ALAN}
                klavyeDuzeni
              />
            </div>
            <div className="min-w-0">
              <Etiket id={`${k}-sekil`} sorun={goster('calismaSekli')}>
                Çalışma şekli
              </Etiket>
              <SecimSeridi
                etiketId={`${k}-sekil`}
                secenekler={CALISMA_SEKILLERI}
                deger={deger.calismaSekli}
                onSec={yaz('calismaSekli')}
              />
            </div>

            <div className="min-w-0 sm:col-span-2">
              <Etiket id={`${k}-tur`} sorun={goster('tur')}>
                Staj türü
              </Etiket>
              <SecimSeridi etiketId={`${k}-tur`} secenekler={STAJ_TURLERI} deger={deger.tur} onSec={yaz('tur')} />
            </div>

            <div className="min-w-0">
              <Etiket htmlFor={`${k}-sure`} sorun={goster('sure')}>
                Süre
              </Etiket>
              <input
                id={`${k}-sure`}
                value={deger.sure}
                onChange={(e) => yaz('sure')(e.target.value)}
                placeholder="Ör. 20 iş günü"
                className={FORM_ALAN}
              />
            </div>
            <div className="min-w-0">
              <Etiket htmlFor={`${k}-son`} istegeBagli>
                Son başvuru
              </Etiket>
              <input
                id={`${k}-son`}
                type="date"
                value={deger.sonBasvuru}
                onChange={(e) => yaz('sonBasvuru')(e.target.value)}
                className={FORM_ALAN}
              />
            </div>

            <div className="min-w-0 sm:col-span-2">
              <Etiket id={`${k}-ucret`} sorun={goster('ucret')}>
                Ücret
              </Etiket>
              <SecimSeridi
                etiketId={`${k}-ucret`}
                secenekler={UCRET_SECENEKLERI}
                deger={deger.ucret}
                onSec={yaz('ucret')}
              />
              {deger.ucret === 'net' && (
                <input
                  value={deger.ucretTutari}
                  onChange={(e) => yaz('ucretTutari')(e.target.value)}
                  placeholder="Ör. 17.000 TL / ay"
                  aria-label="Net ücret tutarı"
                  className={`mt-2 ${FORM_ALAN} sm:max-w-xs`}
                />
              )}
            </div>
          </div>

          {/* ---------------------------------------------- iş tanımı */}
          <div
            className="mt-4 min-w-0 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"
            style={{ borderColor: SIRKET_KENAR }}
          >
            <Etiket htmlFor={`${k}-aciklama`} sorun={goster('aciklama')}>
              İş tanımı
            </Etiket>
            {alan ? (
              <div className="mb-2">
                <p id={`${k}-sablon-baslik`} className="mb-1.5 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                  <b style={{ color: SIRKET_METIN }}>{alan.etiket}</b> için başlangıç metinleri — seçtikten sonra
                  dilediğiniz gibi değiştirebilirsiniz:
                </p>
                <div role="group" aria-labelledby={`${k}-sablon-baslik`} className="flex flex-wrap gap-2">
                  {alan.sablonlar.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => sablonSec(s)}
                      aria-pressed={deger.aciklama.trim() === s.metin.trim()}
                      className="min-h-11 cursor-pointer rounded-xl border px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-blue-600 sm:min-h-9"
                      style={
                        deger.aciklama.trim() === s.metin.trim()
                          ? { borderColor: SIRKET_VURGU_KOYU, color: SIRKET_VURGU_KOYU, background: SIRKET_ROZET }
                          : ikincilStil
                      }
                    >
                      {s.etiket}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mb-2 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                {deger.unvan.trim()
                  ? 'Bu pozisyon için hazır başlangıç metni yok; iş tanımını aşağıya kendiniz yazın.'
                  : 'Pozisyonu yazınca ona uygun başlangıç metinleri burada görünür.'}
              </p>
            )}

            {onayBekleyen && (
              <div
                role="alert"
                className="mb-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
                style={{ borderColor: SIRKET_VURGU_KOYU, background: SIRKET_ROZET, color: SIRKET_METIN }}
              >
                <p>
                  <b>“{onayBekleyen.etiket}”</b> metni, iş tanımındaki mevcut metnin yerine geçecek. Yazdıklarınız
                  silinir.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      yaz('aciklama')(onayBekleyen.metin);
                      setOnayBekleyen(null);
                    }}
                    className={`min-h-11 cursor-pointer rounded-xl px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-blue-600 sm:min-h-9 ${BIRINCIL_RENK}`}
                  >
                    Metni değiştir
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnayBekleyen(null)}
                    className="min-h-11 cursor-pointer rounded-xl border px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-blue-600 sm:min-h-9"
                    style={ikincilStil}
                  >
                    Mevcut metni koru
                  </button>
                </div>
              </div>
            )}
            <UzayanMetin
              id={`${k}-aciklama`}
              value={deger.aciklama}
              onChange={yaz('aciklama')}
              satir={8}
              /* xl'de iki panel aynı boyda bitsin: kısa alanlar sütunu kadar. */
              ekSinif="xl:min-h-72"
              aria-describedby={`${k}-sayac`}
              placeholder={'Stajyer hangi işlerde yer alacak ve hangi bilgi ve becerileri arıyorsunuz? Kısa maddelerle yazabilirsiniz, ör.:\n- Günlük raporların hazırlanmasına destek olmak\n- Excel kullanabilmek'}
            />
            <span
              id={`${k}-sayac`}
              className="mt-1 block text-right text-xs tabular-nums"
              style={{ color: SIRKET_METIN_IKINCIL }}
            >
              {deger.aciklama.trim().length} / {ACIKLAMA_EN_AZ}–{ACIKLAMA_EN_FAZLA} karakter
            </span>

            {/*
              Bayraklar uydurma bir puan değil, metinde GEÇEN şeyler.
              Yayını engellemiyorlar; yalnızca yazana ne göründüğünü
              söylüyorlar.
            */}
            {bayraklar.length > 0 && (
              <div
                className="mt-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
                style={{ borderColor: SIRKET_VURGU_KOYU, background: SIRKET_ROZET, color: SIRKET_METIN }}
              >
                İlan metninde dikkat çeken ifadeler var: {bayraklar.join(', ')}. Staj ilanında
                adaydan para, teminat ya da WhatsApp üzerinden başvuru istenmesi kabul edilmiyor.
              </div>
            )}
          </div>
        </div>

        {/*
          GÖNDER KARTIN SON SATIRI; YANINDA BAŞVURU BİLGİSİ

          BAŞVURU HER ZAMAN STAJIMVAR ÜZERİNDEN: "Kendi sitemizden"
          seçeneği ve başvuru adresi alanı kaldırıldı; `application_method`
          sistem tarafından 'internal' sabitleniyor ve şirketin o kolona
          yazma yetkisi yok. Yani burada seçim sunulmuyor, bilgi veriliyor
          — ayrı bir kutu değil, düğmelerin yanında kısa not.

          Aday kimliğinin doğrulamaya bağlı olduğu AÇIKÇA yazılıyor:
          Kademe 1 şirket başvuru sayısını görüyor, adayın kim olduğunu
          görmüyor. Bunu ilan verirken söylemek, başvurular geldikten
          sonra söylemekten iyi.
        */}
        <div
          className="mt-4 flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
          style={{ borderColor: SIRKET_KENAR }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void gonder()}
              disabled={durum === 'kaydediliyor'}
              className={BIRINCIL_DUGME}
              style={birincilStil}
            >
              {durum === 'kaydediliyor'
                ? 'Kaydediliyor…'
                : duzenlenenId
                  ? 'Değişiklikleri kaydet'
                  : 'İncelemeye gönder'}
            </button>
            <button type="button" onClick={onIptal} className={IKINCIL_DUGME} style={ikincilStil}>
              Vazgeç
            </button>
          </div>

          <p className="flex gap-2 text-xs leading-relaxed lg:max-w-xl" style={{ color: SIRKET_METIN_IKINCIL }}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b style={{ color: SIRKET_METIN }}>Başvurular StajımVar üzerinden gelir.</b> Öğrenci
              rıza verdiğinde kartı ve CV'si panelinize düşer.
              {!adayKimligiAcik && (
                <>
                  {' '}
                  Şu an başvuru <b>sayısını</b> görüyorsunuz; adayların kim olduğunu görebilmek için
                  şirket doğrulaması gerekiyor.
                </>
              )}
            </span>
          </p>
        </div>

        {durum === 'hata' && (
          <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">
            {hata}
          </p>
        )}
      </section>
    </div>
  );
};
