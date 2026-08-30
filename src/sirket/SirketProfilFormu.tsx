import React from 'react';
import { AlertTriangle, BadgeCheck, Check, ExternalLink } from 'lucide-react';
import {
  ALAN,
  BIRINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  alanStil,
  birincilStil,
  kutuStil,
} from './renk';
import { vknGecerli } from '../lib/sirket-kademe.mjs';
import {
  PROFIL_ALANLARI,
  profilTamamlanmaOrani,
  sirketProfiliKaydet,
  sirketProfiliOku,
  vknKaydet,
  type SirketBaglami,
  type SirketProfilDegeri,
} from '../lib/sirket-veri';

/**
 * Şirket profili ve doğrulama.
 *
 * ÖĞRENCİ BU SAYFAYI GÖRÜYOR
 * --------------------------
 * Buradaki alanlar /sirket/<slug> adresinde herkese açık. Öğrenci ilana
 * bakmadan önce şirketi tanıyor; logosu ve tanıtımı olmayan bir şirket,
 * "bu gerçek mi" sorusunu doğuruyor.
 *
 * YEDİ ALAN, FAZLASI DEĞİL
 * ------------------------
 * Form yalnızca `companies` tablosunda GERÇEKTEN olan sütunları soruyor.
 * "Çalışma kültürü", "yan haklar", "departmanlar", "sosyal medya" gibi
 * alanlar tabloda yok; form onları sorsaydı doldurulan bilgi kaydedilmeden
 * kaybolurdu.
 *
 * TAMAMLANMA ORANI HESAPLANIYOR
 * -----------------------------
 * Yüzde uydurma değil: dolu alan / yedi. Hesaplanamayan bir yüzde
 * göstermek, ilerleme çubuğunu süse çevirirdi.
 */

const BOYUTLAR = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const Etiket: React.FC<{ children: React.ReactNode; ipucu?: string }> = ({ children, ipucu }) => (
  <span className="mb-1 block">
    <span className="text-xs font-bold" style={{ color: SIRKET_METIN }}>
      {children}
    </span>
    {ipucu && (
      <span className="ml-1.5 text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
        {ipucu}
      </span>
    )}
  </span>
);

export const SirketProfilFormu: React.FC<{
  baglam: SirketBaglami;
  onKaydedildi: () => void;
}> = ({ baglam, onKaydedildi }) => {
  const [deger, setDeger] = React.useState<SirketProfilDegeri | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'kaydediliyor' | 'tamam' | 'hata'>(
    'yukleniyor'
  );
  const [hata, setHata] = React.useState('');

  React.useEffect(() => {
    let iptal = false;
    if (!baglam.companyId) return;
    sirketProfiliOku(baglam.companyId)
      .then((p) => {
        if (!iptal) {
          setDeger(p);
          setDurum('hazir');
        }
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [baglam.companyId]);

  const yaz = (alan: keyof SirketProfilDegeri) => (v: string) =>
    setDeger((o) => (o ? { ...o, [alan]: v } : o));

  const kaydet = async () => {
    if (!deger || !baglam.companyId) return;
    setDurum('kaydediliyor');
    setHata('');
    try {
      await sirketProfiliKaydet(baglam.companyId, deger);
      setDurum('tamam');
      onKaydedildi();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi.');
      setDurum('hata');
    }
  };

  if (!deger) {
    return (
      <div className={KUTU} style={kutuStil} aria-busy={durum === 'yukleniyor'}>
        <span
          className="block h-5 w-40 animate-pulse rounded"
          style={{ background: SIRKET_ROZET }}
        />
      </div>
    );
  }

  const oran = profilTamamlanmaOrani(deger);
  const eksikler = PROFIL_ALANLARI.filter((a) => !String(deger[a] ?? '').trim());

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------ tamamlanma oranı */}
      <div className={KUTU} style={kutuStil}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-bold" style={{ color: SIRKET_METIN }}>
            Profiliniz %{oran} tamamlandı
          </p>
          <a
            href={`/sirket/${baglam.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold"
            style={{ color: SIRKET_VURGU_KOYU }}
          >
            Öğrencinin gördüğü sayfa
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={oran}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profil tamamlanma oranı"
          style={{ background: SIRKET_ROZET }}
        >
          <span
            className="block h-full rounded-full transition-[width]"
            style={{ width: `${oran}%`, background: SIRKET_VURGU }}
          />
        </div>
        {eksikler.length > 0 && (
          <p className="mt-2 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
            Eksik: {eksikler.map((a) => ALAN_ADLARI[a]).join(', ')}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------- form */}
      <div className={`${KUTU} space-y-4`} style={kutuStil}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Etiket ipucu="Sektör">Sektör</Etiket>
            <input
              value={deger.industry}
              onChange={(e) => yaz('industry')(e.target.value)}
              placeholder="Yazılım, Üretim, Perakende…"
              className={ALAN}
              style={alanStil}
            />
          </label>
          <label className="block">
            <Etiket>Konum</Etiket>
            <input
              value={deger.location}
              onChange={(e) => yaz('location')(e.target.value)}
              placeholder="İstanbul"
              className={ALAN}
              style={alanStil}
            />
          </label>
          <label className="block">
            <Etiket>Çalışan sayısı</Etiket>
            <select
              value={deger.size}
              onChange={(e) => yaz('size')(e.target.value)}
              className={ALAN}
              style={alanStil}
            >
              <option value="">Seçilmedi</option>
              {BOYUTLAR.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Etiket>Web sitesi</Etiket>
            <input
              type="url"
              inputMode="url"
              value={deger.websiteUrl}
              onChange={(e) => yaz('websiteUrl')(e.target.value)}
              placeholder="https://sirketiniz.com"
              className={ALAN}
              style={alanStil}
            />
          </label>
          <label className="block">
            <Etiket>Logo adresi</Etiket>
            <input
              type="url"
              inputMode="url"
              value={deger.logoUrl}
              onChange={(e) => yaz('logoUrl')(e.target.value)}
              placeholder="https://sirketiniz.com/logo.png"
              className={ALAN}
              style={alanStil}
            />
          </label>
          <label className="block">
            <Etiket ipucu="Öğrenciye gösterilmiyor">İK e-postası</Etiket>
            <input
              type="email"
              inputMode="email"
              value={deger.hrEmail}
              onChange={(e) => yaz('hrEmail')(e.target.value)}
              placeholder="ik@sirketiniz.com"
              className={ALAN}
              style={alanStil}
            />
          </label>
        </div>

        <label className="block">
          <Etiket ipucu="Öğrencinin ilk okuduğu metin">Hakkımızda</Etiket>
          <textarea
            value={deger.description}
            onChange={(e) => yaz('description')(e.target.value)}
            rows={5}
            placeholder="Şirketinizin ne yaptığını ve stajyerin nasıl bir ekibe katılacağını birkaç cümleyle anlatın."
            className="w-full rounded-xl border p-3 text-sm leading-relaxed outline-none placeholder:text-[#69796F]"
            style={alanStil}
          />
        </label>

        {durum === 'hata' && <p className="text-sm font-semibold text-rose-700">{hata}</p>}
        {durum === 'tamam' && (
          <p
            className="flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: SIRKET_VURGU_KOYU }}
          >
            <Check className="h-4 w-4" />
            Kaydedildi.
          </p>
        )}

        <button
          type="button"
          onClick={() => void kaydet()}
          disabled={durum === 'kaydediliyor'}
          className={BIRINCIL_DUGME}
          style={birincilStil}
        >
          {durum === 'kaydediliyor' ? 'Kaydediliyor…' : 'Profili kaydet'}
        </button>
      </div>

      <Dogrulama baglam={baglam} onKaydedildi={onKaydedildi} />
    </div>
  );
};

const ALAN_ADLARI: Record<keyof SirketProfilDegeri, string> = {
  logoUrl: 'logo',
  industry: 'sektör',
  size: 'çalışan sayısı',
  location: 'konum',
  websiteUrl: 'web sitesi',
  description: 'hakkımızda',
  hrEmail: 'İK e-postası',
};

/* ------------------------------------------------------------ doğrulama */

const Dogrulama: React.FC<{ baglam: SirketBaglami; onKaydedildi: () => void }> = ({
  baglam,
  onKaydedildi,
}) => {
  const [vkn, setVkn] = React.useState(baglam.vkn ?? '');
  const [mersis, setMersis] = React.useState('');
  const [durum, setDurum] = React.useState<'bos' | 'kaydediliyor' | 'tamam' | 'hata'>('bos');
  const [hata, setHata] = React.useState('');

  const bicimTamam = vknGecerli(vkn);

  if (baglam.dogrulandi) {
    return (
      <div className={KUTU} style={kutuStil}>
        <p className="flex items-center gap-2 font-bold" style={{ color: SIRKET_VURGU_KOYU }}>
          <BadgeCheck className="h-5 w-5" />
          Doğrulanmış kurum
        </p>
        <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          Başvuran kartları açık: adayların adı, okulu ve CV'si panele düşüyor.
        </p>
      </div>
    );
  }

  const gonder = async () => {
    if (!bicimTamam || !baglam.companyId) return;
    setDurum('kaydediliyor');
    setHata('');
    try {
      await vknKaydet(baglam.companyId, vkn, mersis);
      setDurum('tamam');
      onKaydedildi();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi.');
      setDurum('hata');
    }
  };

  return (
    <div className={KUTU} style={kutuStil}>
      <p className="font-bold" style={{ color: SIRKET_METIN }}>
        Şirket doğrulama
      </p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
        Doğrulama başvuran kartlarını açıyor. Ticari unvan ve VKN'yi alıp bir insan kontrol
        ediyor; genellikle bir iş günü sürüyor ve sonucu e-postayla yazıyoruz.
      </p>

      {/*
        ŞAHIS ŞİRKETİNDEN TCKN İSTENMİYOR

        Kimlik numarası staj ilanı açmak için gereken bir veri değil ve
        toplandığı anda korunması gereken bir yük oluyor. VKN yeterli.
      */}
      <div className="mt-4 grid max-w-lg gap-3 sm:grid-cols-2">
        <label className="block">
          <span
            className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            VKN
          </span>
          <input
            inputMode="numeric"
            maxLength={10}
            value={vkn}
            onChange={(e) => setVkn(e.target.value.replace(/\D/g, ''))}
            placeholder="10 haneli"
            className={`${ALAN} font-mono`}
            style={alanStil}
          />
          {vkn.length === 10 && !bicimTamam && (
            <span className="mt-1 block text-[11px] font-semibold text-rose-700">
              Bu numara doğrulamayı geçmiyor; bir hane hatalı olabilir.
            </span>
          )}
        </label>
        <label className="block">
          <span
            className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            MERSİS (isteğe bağlı)
          </span>
          <input
            value={mersis}
            onChange={(e) => setMersis(e.target.value)}
            className={`${ALAN} font-mono`}
            style={alanStil}
          />
        </label>
      </div>

      <p
        className="mt-3 flex max-w-xl items-start gap-2 text-[11px] leading-relaxed"
        style={{ color: SIRKET_METIN_IKINCIL }}
      >
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        VKN herkese açık bir bilgidir ve tek başına yetkili olduğunu kanıtlamaz; bu yüzden
        kaydetmek doğrulama demek değil. VKN öğrenciye hiçbir yerde gösterilmiyor.
      </p>

      {durum === 'hata' && <p className="mt-2 text-sm font-semibold text-rose-700">{hata}</p>}
      {durum === 'tamam' && (
        <p
          className="mt-2 flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: SIRKET_VURGU_KOYU }}
        >
          <Check className="h-4 w-4" />
          Kaydedildi. İnceleme kuyruğuna alındı.
        </p>
      )}

      <button
        type="button"
        onClick={() => void gonder()}
        disabled={!bicimTamam || durum === 'kaydediliyor'}
        className={`mt-4 ${BIRINCIL_DUGME}`}
        style={birincilStil}
      >
        {durum === 'kaydediliyor' ? 'Kaydediliyor…' : 'Doğrulamaya gönder'}
      </button>
    </div>
  );
};

export { SIRKET_KENAR };
