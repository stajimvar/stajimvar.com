import React, { useEffect, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, Clock, Search, Upload } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { CompanyLogo } from './CompanyLogo';
import { searchCompanies } from '../lib/queries';
import {
  benimSonTalebim,
  isverenNiyetiniKaydet,
  sahiplenmeTalebiGonder,
  talepLogosuYukle,
  yeniSirketTalebiGonder,
  type IsverenTalebi,
} from '../lib/isveren-baslangic';
import { CALISAN_SAYILARI, TANITIM_UST_SINIR, profilFormunuDogrula } from '../lib/isveren-profil-formu.mjs';
import { benimDavetlerim, davetKabul, rolEtiketi, type GelenDavet } from '../lib/ekip-davetleri';
import { epostadanSirketTahmini } from '../lib/isveren-eposta-tahmini.mjs';
import { AutocompleteField } from './AutocompleteField';
import { TR_CITIES } from '../data/turkeyData';
import { sektorleriGetir } from '../lib/queries/sosyal';

/**
 * İŞVEREN BAŞLANGICI — "ŞİRKET PROFİLİNİ TAMAMLA" (7 Kasım 2026)
 *
 * Kullanıcı kararı: "İşverenim" diye kaydolan kişiye e-posta doğrulamasından
 * sonra şirket profilini dolduracağı bir sayfa çıkıyor; ad, e-posta ve şifre
 * yetmiyordu ve kişi öğrenci profiliyle karşılaşıyordu.
 *
 * Akış: şirketini ara → "Bu şirket benim" (sahiplenme) ya da "Şirketim
 * listede yok" (yeni şirket) → form → "onay bekleniyor". Yetki yine
 * yönetici onayıyla geliyor; talep bırakmak öğrenci verisi açmıyor.
 */

type Sonuc = { id: string; name: string; slug: string; logoUrl?: string; verified: boolean };
type Adim = { tur: 'ara' } | { tur: 'sahiplen'; sirket: Sonuc } | { tur: 'yeni'; ad: string };

const alan =
  'w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none';
const etiket = 'mb-1.5 block text-xs font-semibold text-gray-700';
const istege = <span className="font-medium text-gray-500">(isteğe bağlı)</span>;

const Hata: React.FC<{ metin?: string }> = ({ metin }) =>
  metin ? <p className="mt-1 text-xs font-medium text-rose-700">{metin}</p> : null;

export const IsverenBaslangic: React.FC<{
  onBack: () => void;
  onNavigate: (yol: string) => void;
  userId: string | null;
  /** Hesapta işveren niyeti yazılı mı (Google ile gelen işverende yok). */
  niyetKayitli?: boolean;
  userEmail?: string;
  adSoyad?: string;
  onGirisGerekli?: () => void;
  /** Talep gönderildi ya da durum değişti: üst çubuk etiketini yenilemek için. */
  onDurumDegisti?: () => void;
}> = ({ onBack, onNavigate, userId, niyetKayitli = false, userEmail = '', adSoyad = '', onGirisGerekli, onDurumDegisti }) => {
  const [talep, setTalep] = useState<IsverenTalebi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(Boolean(userId));
  const [adim, setAdim] = useState<Adim>({ tur: 'ara' });
  /* Ekip davetleri (20261231010000): bu hesabın doğrulanmış e-postasına gelenler. */
  const [davetler, setDavetler] = useState<GelenDavet[]>([]);
  const [davetleriGec, setDavetleriGec] = useState(false);
  const [kabulEdilen, setKabulEdilen] = useState<string | null>(null);
  const [davetHatasi, setDavetHatasi] = useState('');
  useEffect(() => {
    if (!userId) return;
    let iptal = false;
    benimDavetlerim().then((d) => !iptal && setDavetler(d));
    return () => {
      iptal = true;
    };
  }, [userId]);
  const kabulEt = async (d: GelenDavet) => {
    setKabulEdilen(d.id);
    setDavetHatasi('');
    try {
      await davetKabul(d.id);
      /* Tam yükleme: üyelik ve üst çubuk yeni rolle yeniden okunsun. */
      window.location.assign('/sirket/ilanlar');
    } catch (h) {
      setDavetHatasi(h instanceof Error ? h.message : 'Davet kabul edilemedi.');
      setKabulEdilen(null);
    }
  };

  const [terim, setTerim] = useState('');
  const [sonuclar, setSonuclar] = useState<Sonuc[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [arandi, setArandi] = useState(false);

  const [d, setD] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<File | null>(null);
  const [hatalar, setHatalar] = useState<Record<string, string>>({});
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [genelHata, setGenelHata] = useState('');

  const yaz = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setD((o) => ({ ...o, [k]: e.target.value }));
  const yazDeger = (k: string) => (v: string) => setD((o) => ({ ...o, [k]: v }));

  /*
    İSTEMEDEN ÖNÜNE (10 Kasım 2026): kurumsal e-postadan şirket adı ve web
    sitesi tahmini; serbest sağlayıcıda (gmail…) tahmin yok, bunun yerine
    otomatik onayın neden olmayacağı baştan söyleniyor.
  */
  const tahmin = React.useMemo(() => epostadanSirketTahmini(userEmail), [userEmail]);
  const [sektorler, setSektorler] = useState<string[]>([]);
  useEffect(() => {
    let iptal = false;
    sektorleriGetir()
      .then((l) => !iptal && setSektorler(l.map((x) => x.ad)))
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);
  const tahminAramasi = React.useRef(false);
  useEffect(() => {
    if (!tahmin || tahminAramasi.current || adim.tur !== 'ara' || terim) return;
    tahminAramasi.current = true;
    setTerim(tahmin.sirketAdi);
    void aramaYap(tahmin.sirketAdi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahmin, adim.tur]);

  /*
    NİYET BU SAYFADA DA YAZILIYOR (9 Kasım 2026): Google/Microsoft ile
    işveren penceresinden gelen hesapta kayıt niyeti yok; yazılmazsa site
    onu öğrenci sanıp CV ekranı gösteriyordu. Bu sayfa yalnız işveren
    kapısından açılıyor.
  */
  useEffect(() => {
    if (!userId || niyetKayitli) return;
    isverenNiyetiniKaydet()
      .then(() => onDurumDegisti?.())
      .catch(() => undefined);
  }, [userId, niyetKayitli]);

  useEffect(() => {
    if (!userId) return;
    let iptal = false;
    setYukleniyor(true);
    benimSonTalebim(userId)
      .then((t) => !iptal && setTalep(t))
      .catch(() => !iptal && setTalep(null))
      .finally(() => !iptal && setYukleniyor(false));
    return () => {
      iptal = true;
    };
  }, [userId]);

  const ara = async (e: React.FormEvent) => {
    e.preventDefault();
    await aramaYap(terim);
  };
  const aramaYap = async (metin: string) => {
    const temiz = metin.trim();
    if (temiz.length < 2) return;
    setAraniyor(true);
    try {
      setSonuclar(await searchCompanies(temiz));
    } catch {
      setSonuclar([]);
    } finally {
      setAraniyor(false);
      setArandi(true);
    }
  };

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || adim.tur === 'ara') return;
    const tur = adim.tur === 'yeni' ? 'yeni' : 'sahiplenme';
    const { hatalar: h, deger } = profilFormunuDogrula(tur, d);
    const eposta = (d.eposta ?? userEmail).trim();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(eposta)) h.eposta = 'Geçerli bir e-posta yaz.';
    setHatalar(h);
    if (Object.keys(h).length) return;
    setGonderiliyor(true);
    setGenelHata('');
    try {
      /* Bu düzeltmeden önce açılmış hesap da işveren görünümüne geçsin. */
      await isverenNiyetiniKaydet().catch(() => undefined);
      const yetkili = (d.adSoyad ?? adSoyad).trim() || eposta.split('@')[0];
      if (adim.tur === 'yeni') {
        const logoUrl = logo ? await talepLogosuYukle(userId, logo) : null;
        await yeniSirketTalebiGonder({
          userId,
          yetkiliAdi: yetkili,
          eposta,
          sirketAdi: deger.sirketAdi as string,
          webSitesi: deger.webSitesi as string,
          sektor: deger.sektor ?? null,
          calisanSayisi: deger.calisanSayisi ?? null,
          sehir: deger.sehir ?? null,
          vkn: deger.vkn ?? null,
          tanitim: deger.tanitim ?? null,
          logoUrl,
          gorev: deger.gorev as string,
          telefon: deger.telefon ?? null,
        });
      } else {
        await sahiplenmeTalebiGonder({
          userId,
          companyId: adim.sirket.id,
          contactName: yetkili,
          eposta,
          gorev: deger.gorev as string,
          telefon: deger.telefon ?? null,
          vkn: deger.vkn ?? null,
          not: (d.not ?? '').trim() || null,
        });
      }
      setTalep(await benimSonTalebim(userId));
      onDurumDegisti?.();
    } catch (err) {
      setGenelHata(err instanceof Error ? err.message : 'Talep gönderilemedi.');
    } finally {
      setGonderiliyor(false);
    }
  };

  const baslik = (
    <header className="space-y-1">
      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Şirket profilini tamamla</h1>
      <p className="text-sm leading-6 text-gray-600">
        Hesabın kişisel kimliğinle açıldı. Şirketini bul ya da ekle; bilgilerini doldur. Aday erişimi, şirket
        doğrulamasından sonra açılır.
      </p>
    </header>
  );

  if (!userId) {
    return (
      <SayfaKabugu onBack={onBack}>
        <div className="space-y-4">
          {baslik}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-700">Şirket profilini doldurmak için önce giriş yap ya da işveren hesabı aç.</p>
            {onGirisGerekli && (
              <button type="button" onClick={onGirisGerekli} className="mt-3 min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">
                Giriş yap
              </button>
            )}
          </div>
        </div>
      </SayfaKabugu>
    );
  }

  if (yukleniyor) {
    return (
      <SayfaKabugu onBack={onBack}>
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" role="status" aria-label="Yükleniyor" />
      </SayfaKabugu>
    );
  }

  if (davetler.length > 0 && !davetleriGec) {
    return (
      <SayfaKabugu onBack={onBack}>
        <div className="space-y-4">
          {baslik}
          {davetler.map((d) => (
            <div key={d.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-base font-bold text-blue-950">
                <strong>{d.sirketAdi}</strong> seni ekibine davet etti
              </p>
              <p className="mt-1 text-sm text-blue-900">Rol: {rolEtiketi(d.rol)}</p>
              <button
                type="button"
                disabled={kabulEdilen !== null}
                onClick={() => void kabulEt(d)}
                className="mt-3 min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {kabulEdilen === d.id ? 'Katılıyorsun…' : 'Daveti kabul et'}
              </button>
            </div>
          ))}
          {davetHatasi && <p role="alert" className="text-sm text-rose-700">{davetHatasi}</p>}
          <button
            type="button"
            onClick={() => setDavetleriGec(true)}
            className="min-h-11 cursor-pointer text-sm font-semibold text-gray-600 underline-offset-2 hover:underline"
          >
            Davet yerine kendi şirketimi ekleyeceğim
          </button>
        </div>
      </SayfaKabugu>
    );
  }

  if (talep?.durum === 'bekliyor') {
    return (
      <SayfaKabugu onBack={onBack}>
        <div className="space-y-4">
          {baslik}
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="flex items-center gap-2 font-bold text-amber-900">
              <Clock aria-hidden className="h-5 w-5" /> Talebin inceleniyor
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              <strong>{talep.sirketAdi}</strong> için{' '}
              {talep.tur === 'yeni-sirket' ? 'şirket ekleme' : 'sahiplenme'} talebin bize ulaştı. Onaylandığında
              işveren paneline bu sayfadan geçebilirsin; ilan girme ve aday erişimi o zaman açılır.
            </p>
          </section>
        </div>
      </SayfaKabugu>
    );
  }

  if (talep?.durum === 'onaylandi') {
    return (
      <SayfaKabugu onBack={onBack}>
        <div className="space-y-4">
          {baslik}
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 aria-hidden className="h-5 w-5" /> {talep.sirketAdi} onaylandı
            </p>
            <button
              type="button"
              /* Tam yükleme: otomatik onayla AYNI oturumda üye olan kişinin
                 uygulama durumu (şirket üyeliği) eski kalmasın. */
              onClick={() => window.location.assign('/sirket/ilanlar')}
              className="mt-3 min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
            >
              İşveren paneline git
            </button>
          </section>
        </div>
      </SayfaKabugu>
    );
  }

  const kisiAlanlari = (
    <>
      <div className="sm:col-span-2 border-t border-gray-100 pt-4">
        <p className="text-sm font-bold text-gray-900">Senin bilgilerin</p>
      </div>
      <label className="block">
        <span className={etiket}>Ad soyad</span>
        <input className={alan} defaultValue={adSoyad} onChange={yaz('adSoyad')} autoComplete="name" />
      </label>
      <label className="block">
        <span className={etiket}>Görev / unvan *</span>
        <input className={alan} onChange={yaz('gorev')} placeholder="ör. İK Uzmanı" aria-invalid={Boolean(hatalar.gorev)} />
        <Hata metin={hatalar.gorev} />
      </label>
      <label className="block">
        <span className={etiket}>Kurumsal e-posta</span>
        <input className={alan} type="email" defaultValue={userEmail} onChange={yaz('eposta')} autoComplete="email" />
        <Hata metin={hatalar.eposta} />
      </label>
      <label className="block">
        <span className={etiket}>Telefon {istege}</span>
        <input className={alan} type="tel" onChange={yaz('telefon')} autoComplete="tel" placeholder="0 5xx xxx xx xx" />
        <Hata metin={hatalar.telefon} />
      </label>
      <label className="block">
        <span className={etiket}>Vergi kimlik no (VKN) {istege}</span>
        <input className={alan} inputMode="numeric" onChange={yaz('vkn')} placeholder="10 hane" />
        <Hata metin={hatalar.vkn} />
        <p className="mt-1 text-xs text-gray-500">Doğrulamayı hızlandırır.</p>
      </label>
    </>
  );

  return (
    <SayfaKabugu onBack={onBack}>
      <div className="space-y-4">
        {baslik}

        {talep?.durum === 'reddedildi' && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <strong>{talep.sirketAdi}</strong> talebin onaylanmadı{talep.gerekce ? `: ${talep.gerekce}` : '.'} Bilgilerini
            düzeltip yeniden gönderebilirsin.
          </p>
        )}

        {adim.tur === 'ara' && (
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-bold text-gray-900">1. Şirketini bul</p>
            {tahmin ? (
              <p className="text-xs text-gray-500">
                <strong className="font-semibold text-gray-700">{tahmin.alan}</strong> adresinden tahmin edip aradık; doğru değilse adı değiştir.
              </p>
            ) : (
              userEmail && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                  Hesabın kişisel bir e-postayla ({userEmail.split('@')[1]}) açık. Şirket hesabı bu yüzden otomatik açılmaz; ekibimiz
                  bilgilerini kontrol edip onaylar. Şirket e-postanla (ad@sirketin.com) açılan hesap, web sitesiyle eşleşirse hemen onaylanır.
                </p>
              )
            )}
            <form onSubmit={ara} className="flex gap-2">
              <label className="sr-only" htmlFor="baslangic-ara">Şirket adı</label>
              <input id="baslangic-ara" className={alan} value={terim} onChange={(e) => setTerim(e.target.value)} placeholder="Şirketinin adı" />
              <button type="submit" className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">
                <Search aria-hidden className="h-4 w-4" /> Ara
              </button>
            </form>
            {araniyor && <p className="text-sm text-gray-500">Aranıyor…</p>}
            {sonuclar.length > 0 && (
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {sonuclar.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 p-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <CompanyLogo name={s.name} logoUrl={s.logoUrl} className="w-10 h-10 shrink-0" />
                      <span className="truncate text-sm font-semibold text-gray-900">{s.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdim({ tur: 'sahiplen', sirket: s })}
                      className="min-h-11 shrink-0 cursor-pointer rounded-xl border border-blue-200 px-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
                    >
                      Bu şirket benim
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {arandi && !araniyor && (
              <button
                type="button"
                onClick={() => {
                  setD((o) => ({ ...o, sirketAdi: terim.trim(), ...(tahmin && !o.webSitesi ? { webSitesi: tahmin.alan } : {}) }));
                  setAdim({ tur: 'yeni', ad: terim.trim() });
                }}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline"
              >
                <Building2 aria-hidden className="h-4 w-4" /> Şirketim listede yok, ekleyeyim
              </button>
            )}
          </section>
        )}

        {adim.tur !== 'ara' && (
          <form onSubmit={gonder} noValidate className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
            <button type="button" onClick={() => setAdim({ tur: 'ara' })} className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900">
              <ArrowLeft aria-hidden className="h-4 w-4" /> Şirket aramasına dön
            </button>
            <p className="text-sm font-bold text-gray-900">
              {adim.tur === 'sahiplen' ? `2. ${adim.sirket.name} — yetkili bilgilerin` : '2. Şirket profili'}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {adim.tur === 'yeni' && (
                <>
                  <label className="block">
                    <span className={etiket}>Şirket adı *</span>
                    <input className={alan} defaultValue={adim.ad} onChange={yaz('sirketAdi')} autoComplete="organization" />
                    <Hata metin={hatalar.sirketAdi} />
                  </label>
                  <label className="block">
                    <span className={etiket}>Web sitesi *</span>
                    <input className={alan} defaultValue={d.webSitesi ?? ''} onChange={yaz('webSitesi')} placeholder="ornek.com" inputMode="url" />
                    {tahmin && d.webSitesi === tahmin.alan && (
                      <p className="mt-1 text-xs text-gray-500">E-posta adresinden önerildi; değiştirebilirsin.</p>
                    )}
                    <Hata metin={hatalar.webSitesi} />
                  </label>
                  <label className="block">
                    <span className={etiket}>Sektör {istege}</span>
                    <AutocompleteField
                      value={d.sektor ?? ''}
                      onChange={yazDeger('sektor')}
                      options={sektorler}
                      placeholder="ör. Yazılım"
                      className={alan}
                      klavyeDuzeni
                    />
                  </label>
                  <label className="block">
                    <span className={etiket}>Çalışan sayısı {istege}</span>
                    <select className={alan} defaultValue="" onChange={yaz('calisanSayisi')}>
                      <option value="">Seç</option>
                      {CALISAN_SAYILARI.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <Hata metin={hatalar.calisanSayisi} />
                  </label>
                  <label className="block">
                    <span className={etiket}>Şehir {istege}</span>
                    <AutocompleteField
                      value={d.sehir ?? ''}
                      onChange={yazDeger('sehir')}
                      options={TR_CITIES}
                      placeholder="ör. İstanbul"
                      className={alan}
                      klavyeDuzeni
                    />
                  </label>
                  <label className="block">
                    <span className={etiket}>Logo {istege}</span>
                    <span className={`${alan} flex cursor-pointer items-center gap-2 text-gray-600`}>
                      <Upload aria-hidden className="h-4 w-4 shrink-0" />
                      <span className="truncate">{logo ? logo.name : 'PNG, JPEG ya da WEBP · en fazla 2 MB'}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
                    </span>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className={etiket}>Kısa tanıtım {istege}</span>
                    <textarea className={`${alan} min-h-24`} maxLength={TANITIM_UST_SINIR} onChange={yaz('tanitim')} placeholder="Şirketin ne yapıyor, stajyerler nerede çalışacak?" />
                    <Hata metin={hatalar.tanitim} />
                  </label>
                </>
              )}
              {kisiAlanlari}
              {adim.tur === 'sahiplen' && (
                <label className="block sm:col-span-2">
                  <span className={etiket}>Eklemek istediğin bir şey {istege}</span>
                  <textarea className={`${alan} min-h-20`} onChange={yaz('not')} />
                </label>
              )}
            </div>

            {genelHata && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800">{genelHata}</p>}
            <button
              type="submit"
              disabled={gonderiliyor}
              className="min-h-12 w-full cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {gonderiliyor ? 'Gönderiliyor…' : 'Onaya gönder'}
            </button>
            <p className="text-xs leading-5 text-gray-500">
              Hesabının kurumsal e-postası şirketin web sitesiyle eşleşiyorsa şirket hesabın hemen açılır;
              eşleşmiyorsa ekibimiz kontrol edip onaylar. Onaylanana kadar ilan girilemez ve aday bilgisi açılmaz.
            </p>
          </form>
        )}
      </div>
    </SayfaKabugu>
  );
};
