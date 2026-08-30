import React from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import {
  ACIKLAMA_EN_AZ,
  ACIKLAMA_EN_FAZLA,
  CALISMA_SEKILLERI,
  SABLONLAR,
  STAJ_TURLERI,
  UCRET_SECENEKLERI,
  ilanGecerli,
  ilanSatiri,
  ilanSorunlari,
} from '../lib/ilan-formu.mjs';
import { ilanBaslangicDurumu, ilanBayraklari } from '../lib/sirket-kademe.mjs';
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

const alanSinifi = ALAN;

const Etiket: React.FC<{ children: React.ReactNode; sorun?: string }> = ({ children, sorun }) => (
  <span className="mb-1 flex items-baseline justify-between gap-2">
    <span className="text-xs font-bold" style={{ color: SIRKET_METIN }}>
      {children}
    </span>
    {sorun && <span className="text-[11px] font-semibold text-rose-700">{sorun}</span>}
  </span>
);

const SecimSeridi: React.FC<{
  secenekler: { id: string; etiket: string }[];
  deger: string;
  onSec: (id: string) => void;
}> = ({ secenekler, deger, onSec }) => (
  <div className="flex flex-wrap gap-2">
    {secenekler.map((s) => (
      <button
        key={s.id}
        type="button"
        onClick={() => onSec(s.id)}
        aria-pressed={deger === s.id}
        className="min-h-11 cursor-pointer rounded-xl border px-3 text-sm font-bold transition-colors"
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
}> = ({ kademe, sirketAdi, siteUrl, eposta, onKaydet, onIptal }) => {
  const [deger, setDeger] = React.useState<IlanFormDegeri>(BOS);
  const [gonderildi, setGonderildi] = React.useState(false);
  const [durum, setDurum] = React.useState<'form' | 'kaydediliyor' | 'bitti' | 'hata'>('form');
  const [hata, setHata] = React.useState('');
  const [sonuc, setSonuc] = React.useState<{ id: string; yayinda: boolean } | null>(null);
  const [kopyalandi, setKopyalandi] = React.useState(false);

  const yaz = (alan: keyof IlanFormDegeri) => (v: string) =>
    setDeger((o) => ({ ...o, [alan]: v }));

  const sorunlar = ilanSorunlari(deger);
  const goster = (alan: keyof IlanFormDegeri) => (gonderildi ? sorunlar[alan] : undefined);

  /* Aday kartlarının açılması doğrulanmış şirkete bağlı; başvurunun
     nereye geldiğine değil. Form bunu ilan verilirken söylüyor. */
  const adayKimligiAcik = Number(kademe) >= 2;
  const baslangicDurumu = ilanBaslangicDurumu({ kademe, siteUrl, eposta });
  const yayindaBaslar = baslangicDurumu === 'published';
  const bayraklar = ilanBayraklari(deger.aciklama);

  const gonder = async () => {
    setGonderildi(true);
    if (!ilanGecerli(deger) || !baslangicDurumu) return;

    setDurum('kaydediliyor');
    setHata('');
    try {
      const satir = ilanSatiri(deger, { companyId: '', durum: baslangicDurumu });
      const kayit = await onKaydet(satir);
      if (!kayit) throw new Error('İlan kaydedilemedi.');
      setSonuc({ id: kayit.id, yayinda: yayindaBaslar });
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
          {sonuc.yayinda ? 'İlan canlı' : 'İlan taslak olarak kaydedildi'}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          {sonuc.yayinda
            ? 'İlan öğrenci listesinde görünüyor. Bağlantıyı paylaşabilirsin.'
            : 'Kurumsal e-posta alan adın site adresinle eşleşmediği için ilan önce bizde inceleniyor. Genellikle bir iş günü içinde yayına alıyoruz; sonucu e-postayla yazacağız.'}
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

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
          Yeni ilan
        </h1>
        <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          {sirketAdi} · {yayindaBaslar ? 'Yayınla dediğinde canlıya çıkar' : 'Yayınla dediğinde incelemeye gider'}
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border p-4 sm:p-6" style={kutuStil}>
        <label className="block">
          <Etiket sorun={goster('unvan')}>Pozisyon *</Etiket>
          <input
            value={deger.unvan}
            onChange={(e) => yaz('unvan')(e.target.value)}
            placeholder="Yazılım Stajyeri"
            className={alanSinifi}
            style={alanStil}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Etiket sorun={goster('sehir')}>Şehir *</Etiket>
            <input
              value={deger.sehir}
              onChange={(e) => yaz('sehir')(e.target.value)}
              placeholder="İstanbul"
              className={alanSinifi}
              style={alanStil}
            />
          </label>
          <div>
            <Etiket sorun={goster('calismaSekli')}>Çalışma şekli *</Etiket>
            <SecimSeridi
              secenekler={CALISMA_SEKILLERI}
              deger={deger.calismaSekli}
              onSec={yaz('calismaSekli')}
            />
          </div>
        </div>

        <div>
          <Etiket sorun={goster('tur')}>Staj türü *</Etiket>
          <SecimSeridi secenekler={STAJ_TURLERI} deger={deger.tur} onSec={yaz('tur')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Etiket sorun={goster('sure')}>Süre *</Etiket>
            <input
              value={deger.sure}
              onChange={(e) => yaz('sure')(e.target.value)}
              placeholder="20 iş günü"
              className={alanSinifi}
              style={alanStil}
            />
          </label>
          <label className="block">
            <Etiket>Son başvuru (isteğe bağlı)</Etiket>
            <input
              type="date"
              value={deger.sonBasvuru}
              onChange={(e) => yaz('sonBasvuru')(e.target.value)}
              className={alanSinifi}
              style={alanStil}
            />
          </label>
        </div>

        <div>
          <Etiket sorun={goster('ucret')}>Ücret *</Etiket>
          <SecimSeridi secenekler={UCRET_SECENEKLERI} deger={deger.ucret} onSec={yaz('ucret')} />
          {deger.ucret === 'net' && (
            <input
              value={deger.ucretTutari}
              onChange={(e) => yaz('ucretTutari')(e.target.value)}
              placeholder="17.000 TL / ay"
              className={`mt-2 ${alanSinifi}`}
              style={alanStil}
            />
          )}
        </div>

        {/*
          BAŞVURU HER ZAMAN STAJIMVAR ÜZERİNDEN

          "Kendi sitemizden" seçeneği ve başvuru adresi alanı kaldırıldı;
          `application_method` sistem tarafından 'internal' sabitleniyor
          ve şirketin o kolona yazma yetkisi yok. Yani burada seçim
          sunulmuyor, bilgi veriliyor.

          Aday kimliğinin doğrulamaya bağlı olduğu AÇIKÇA yazılıyor:
          Kademe 1 şirket başvuru sayısını görüyor, adayın kim olduğunu
          görmüyor. Bunu ilan verirken söylemek, başvurular geldikten
          sonra söylemekten iyi.
        */}
        <div
          className="rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed"
          style={{ borderColor: SIRKET_KENAR, background: SIRKET_ROZET, color: SIRKET_METIN }}
        >
          <p className="font-bold">Başvurular StajımVar üzerinden gelir.</p>
          <p className="mt-1">
            Öğrenci ilanı burada görüp buradan başvuruyor; rıza verdiğinde kartı ve
            CV'si panelinize düşer.
          </p>
          {!adayKimligiAcik && (
            <p className="mt-1">
              Şu an başvuru <b>sayısını</b> görüyorsunuz; adayların kim olduğunu
              görebilmek için şirket doğrulaması gerekiyor.
            </p>
          )}
        </div>

        <div>
          <Etiket sorun={goster('aciklama')}>İş tanımı *</Etiket>
          <div className="mb-2 flex flex-wrap gap-2">
            {SABLONLAR.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => yaz('aciklama')(s.metin)}
                className="min-h-11 cursor-pointer rounded-xl border px-3 text-xs font-bold"
                style={ikincilStil}
              >
                {s.etiket} şablonu
              </button>
            ))}
          </div>
          <textarea
            value={deger.aciklama}
            onChange={(e) => yaz('aciklama')(e.target.value)}
            rows={9}
            placeholder="Stajyerin ne yapacağını, kimden destek alacağını ve neler beklediğinizi yazın."
            className="w-full rounded-xl border p-3 text-sm leading-relaxed outline-none placeholder:text-[#A08C7D]"
            style={alanStil}
          />
          <span
            className="mt-1 block text-right font-mono text-[11px]"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            {deger.aciklama.trim().length} / {ACIKLAMA_EN_AZ}–{ACIKLAMA_EN_FAZLA}
          </span>

          {/*
            Bayraklar uydurma bir puan değil, metinde GEÇEN şeyler.
            Yayını engellemiyorlar; yalnızca yazana ne göründüğünü
            söylüyorlar.
          */}
          {bayraklar.length > 0 && (
            <div
              className="mt-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed"
              style={{ borderColor: SIRKET_VURGU_KOYU, background: SIRKET_ROZET, color: SIRKET_METIN }}
            >
              İlan metninde dikkat çeken ifadeler var: {bayraklar.join(', ')}. Staj ilanında
              adaydan para, teminat ya da WhatsApp üzerinden başvuru istenmesi kabul edilmiyor.
            </div>
          )}
        </div>
      </div>

      {durum === 'hata' && <p className="text-sm font-semibold text-rose-700">{hata}</p>}

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
            : yayindaBaslar
              ? 'Yayınla'
              : 'İncelemeye gönder'}
        </button>
        <button
          type="button"
          onClick={onIptal}
          className={IKINCIL_DUGME}
          style={ikincilStil}
        >
          Vazgeç
        </button>

      </div>
    </div>
  );
};
