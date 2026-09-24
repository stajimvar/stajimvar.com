import React from 'react';
import { ArrowDown, ArrowLeft } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { ayniGunMu, gorulduMu, gunAyraci, istekHakki, kutuYolu, saatMetni } from '../../lib/mesaj-ekrani.mjs';
import { profilYolu } from '../../lib/sosyal-kullanici-adi.mjs';
import { SosyalHata, sosyalProfilKimligiGetir, sosyalProfiliGetir } from '../../lib/queries/sosyal';
import {
  ISTEK_MESAJ_SINIRI,
  istegiKabulEt,
  istegiSil,
  mesajGonder,
  mesajlariGetir,
  okunduIsaretle,
  sohbetKimligiGetir,
  sohbetlerimiGetir,
  type Mesaj,
  type SohbetDurumu,
} from '../../lib/queries/mesajlasma';
import { ProfilFotografi } from '../sosyal/ProfilFotografi';
import { ResmiTik } from '../sosyal/ResmiTik';
import { HAP, HAP_BIRINCIL } from '../sosyal/ProfilKimlikKalibi';
import { sohbeteAbone, yerelDegisiklikBildir } from './mesajDinleme';
import { MesajYazmaKutusu } from './MesajYazmaKutusu';
import { MesajEylemMenusu } from './MesajSikayet';

/**
 * SOHBET EKRANI — /mesajlar/:kullaniciadi
 *
 * Kullanıcı adı → profil kimliği (`sosyalProfilKimligiGetir`) → sohbet
 * kimliği (`sohbetKimligiGetir`). Sohbet yoksa boş ekran ve yazma kutusu:
 * ilk gönderimde sunucu sohbeti açıyor (bağlantı varsa açık, yoksa istek).
 *
 * KURALLAR SUNUCUDA, EKRAN YANSITIYOR
 * -----------------------------------
 * İstek sınırı, yanıtla kabul, engel, hız sınırı `mesaj_gonder`
 * (20261107010000) içinde. Ekran yalnız yansıtıyor: sınır dolunca kutu
 * kapanıyor ve sebebi yazılı; atlanırsa sunucu 'istek-bekliyor' döner ve
 * cümlesi yine yazılır.
 *
 * İYİMSER KOPYA YOK: gönderilen mesaj, `mesajGonder`in döndürdüğü SUNUCU
 * satırıyla ekleniyor. Aynı satır Realtime'dan da geliyor; kimlikle
 * tekilleştiriliyor.
 *
 * "GÖRÜLDÜ": yalnız EN SON KENDİ mesajımın altında ve yalnız karşı
 * tarafın okuma anı o mesajdan sonraysa. İstek aşamasında sunucu okuma
 * anını vermiyor; Realtime'dan bir okuma olayı gelse bile ekran onu
 * yalnız AÇIK sohbette kullanıyor — "görüldü" bekleyen kişiye baskı
 * aracı olmasın.
 *
 * OKUNDU İŞARETİ YALNIZ AÇIK EKRANDA: sohbet bu ekranda açıkken ve sekme
 * GÖRÜNÜRKEN. Liste bir sohbeti okundu saymıyor.
 */

interface Karsi {
  id: string;
  ad: string;
  kullaniciAdi: string;
  avatarYolu: string | null;
  resmiMi: boolean;
}

interface Ozet {
  durum: SohbetDurumu;
  benBaslattim: boolean;
  karsiOkunduAni: string | null;
}

type Asama = 'yukleniyor' | 'hazir' | 'yok' | 'kendin' | 'sirket' | 'hata';

/** Açık bir sohbetin durumu: iki kutunun listesinden, sohbet kimliğiyle. */
async function ozetGetir(sohbetId: string): Promise<Ozet | null> {
  const [gelen, istekler] = await Promise.all([sohbetlerimiGetir('gelen'), sohbetlerimiGetir('istekler')]);
  const s = [...gelen, ...istekler].find((x) => x.sohbetId === sohbetId);
  return s ? { durum: s.durum, benBaslattim: s.benBaslattim, karsiOkunduAni: s.karsiOkunduAni } : null;
}

/** Kimlikle tekilleştirip zamana göre sıralı birleştirme. */
function birlestir(eski: Mesaj[], yeni: Mesaj[]): Mesaj[] {
  const harita = new Map<string, Mesaj>();
  for (const m of eski) harita.set(m.id, m);
  for (const m of yeni) harita.set(m.id, m);
  return [...harita.values()].sort(
    (a, b) => new Date(a.olusturmaAni).getTime() - new Date(b.olusturmaAni).getTime(),
  );
}

/*
  Balonlar: benimkiler sağda mavi, karşınınkiler solda gri. İki sınıf ayrı
  sabit — aynı satırda dursalar mavi zeminle gri metin yan yana okunuyor
  (biçim denetimi bunu işaretledi; iki dal hiçbir zaman aynı öğede değil).
*/
const BALON = 'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed';
const BALON_BENIM = `${BALON} rounded-br-md bg-blue-600 text-white`;
const BALON_KARSI = `${BALON} rounded-bl-md bg-gray-100 text-gray-900`;

const SAYFA = 50;
/** Alttan bu kadar yakınsa "en altta" sayılıyor ve yeni mesajda otomatik kayıyor. */
const ALT_ESIGI = 80;

export const SohbetEkrani: React.FC<{
  benId: string;
  kullaniciAdi: string;
  onNavigate: (yol: string) => void;
  /** Liste ve rozet tazelensin (gönderim, kabul, silme, okundu). */
  onDegisti: () => void;
}> = ({ benId, kullaniciAdi, onNavigate, onDegisti }) => {
  const [asama, setAsama] = React.useState<Asama>('yukleniyor');
  const [karsi, setKarsi] = React.useState<Karsi | null>(null);
  const [sohbetId, setSohbetId] = React.useState<string | null>(null);
  const [ozet, setOzet] = React.useState<Ozet | null>(null);
  const [mesajlar, setMesajlar] = React.useState<Mesaj[]>([]);
  const [dahaVar, setDahaVar] = React.useState(false);
  const [eskiYukleniyor, setEskiYukleniyor] = React.useState(false);
  const [yeniMesajVar, setYeniMesajVar] = React.useState(false);
  const [deneme, setDeneme] = React.useState(0);
  const [bantIslemde, setBantIslemde] = React.useState(false);
  const [bantHatasi, setBantHatasi] = React.useState<string | null>(null);
  const [silOnayi, setSilOnayi] = React.useState(false);

  const kaydirici = React.useRef<HTMLDivElement>(null);
  /* Bir sonraki çizimden sonra en alta kaydır. */
  const altaKaydir = React.useRef(false);
  /* Eski mesajlar başa eklenince görünen yer yerinde kalsın: önceki yükseklik. */
  const oncekiYukseklik = React.useRef<number | null>(null);
  const silVazgecRef = React.useRef<HTMLButtonElement>(null);
  const silTetikRef = React.useRef<HTMLButtonElement>(null);

  /* Olay işleyicileri güncel değerleri ref'ten okuyor (abonelik bir kez kuruluyor). */
  const guncel = React.useRef({ ozet, karsiId: karsi?.id ?? null, onDegisti });
  React.useEffect(() => {
    guncel.current = { ozet, karsiId: karsi?.id ?? null, onDegisti };
  });

  const enAltta = () => {
    const k = kaydirici.current;
    if (!k) return true;
    return k.scrollHeight - k.scrollTop - k.clientHeight < ALT_ESIGI;
  };

  /* ------------------------------------------------ yükleme */
  React.useEffect(() => {
    let iptal = false;
    setAsama('yukleniyor');
    setKarsi(null);
    setSohbetId(null);
    setOzet(null);
    setMesajlar([]);
    setYeniMesajVar(false);
    setSilOnayi(false);
    setBantHatasi(null);
    (async () => {
      const id = await sosyalProfilKimligiGetir(kullaniciAdi);
      if (iptal) return;
      /*
        Bulunamayan ile görünmeyen profil AYNI cümle: ayrı olsalardı adres
        çubuğu "bu kullanıcı adı var mı" sorusunu cevaplardı.
      */
      if (!id) return setAsama('yok');
      if (id === benId) return setAsama('kendin');
      const profil = await sosyalProfiliGetir(id);
      if (iptal) return;
      if (!profil) return setAsama('yok');
      if (profil.sirketId) return setAsama('sirket');
      setKarsi({
        id,
        ad: profil.gorunenAd ?? `@${profil.kullaniciAdi ?? kullaniciAdi}`,
        kullaniciAdi: profil.kullaniciAdi ?? kullaniciAdi,
        avatarYolu: profil.avatarYolu,
        resmiMi: profil.resmiMi,
      });
      const sid = await sohbetKimligiGetir(id);
      if (iptal) return;
      if (sid) {
        const [ilk, o] = await Promise.all([mesajlariGetir(sid, undefined, SAYFA), ozetGetir(sid)]);
        if (iptal) return;
        setMesajlar(ilk);
        setDahaVar(ilk.length === SAYFA);
        setOzet(o);
        altaKaydir.current = true;
      }
      setSohbetId(sid);
      setAsama('hazir');
    })().catch(() => {
      if (!iptal) setAsama('hata');
    });
    return () => {
      iptal = true;
    };
  }, [kullaniciAdi, benId, deneme]);

  /* ------------------------------------------------ kaydırma */
  React.useLayoutEffect(() => {
    const k = kaydirici.current;
    if (!k) return;
    if (oncekiYukseklik.current !== null) {
      k.scrollTop = k.scrollHeight - oncekiYukseklik.current + k.scrollTop;
      oncekiYukseklik.current = null;
      return;
    }
    if (altaKaydir.current) {
      k.scrollTop = k.scrollHeight;
      altaKaydir.current = false;
      setYeniMesajVar(false);
    }
  }, [mesajlar, asama]);

  const eskileriYukle = async () => {
    if (!sohbetId || !dahaVar || eskiYukleniyor || mesajlar.length === 0) return;
    setEskiYukleniyor(true);
    try {
      const eskiler = await mesajlariGetir(sohbetId, mesajlar[0].olusturmaAni, SAYFA);
      oncekiYukseklik.current = kaydirici.current?.scrollHeight ?? null;
      setMesajlar((m) => birlestir(eskiler, m));
      setDahaVar(eskiler.length === SAYFA);
    } catch {
      /* Eski sayfa alınamadı: görünen mesajlar yerinde; bir sonraki kaydırmada yeniden denenir. */
    } finally {
      setEskiYukleniyor(false);
    }
  };

  /* ------------------------------------------------ okundu */
  const okunduSay = React.useCallback(() => {
    if (!sohbetId || document.visibilityState !== 'visible') return;
    void okunduIsaretle(sohbetId).then(() => {
      yerelDegisiklikBildir();
      guncel.current.onDegisti();
    });
  }, [sohbetId]);

  React.useEffect(() => {
    if (asama !== 'hazir' || !sohbetId) return;
    okunduSay();
    const gorunurluk = () => {
      if (document.visibilityState === 'visible') okunduSay();
    };
    document.addEventListener('visibilitychange', gorunurluk);
    return () => document.removeEventListener('visibilitychange', gorunurluk);
  }, [asama, sohbetId, okunduSay]);

  /* ------------------------------------------------ anlık gelme */
  React.useEffect(() => {
    if (!sohbetId) return;
    return sohbeteAbone(sohbetId, (olay) => {
      if (olay.tur === 'mesaj') {
        const m = olay.mesaj;
        const karsidan = m.gonderen !== benId;
        if (!karsidan || enAltta()) altaKaydir.current = true;
        else setYeniMesajVar(true);
        setMesajlar((liste) => birlestir(liste, [m]));
        if (karsidan) {
          okunduSay();
          /* Başlattığım istekte karşı taraf yanıt verdiyse istek kabul edildi. */
          if (guncel.current.ozet?.durum === 'istek') {
            void ozetGetir(sohbetId).then((o) => o && setOzet(o));
          }
        }
        return;
      }
      /* Okuma olayı: yalnız karşı tarafın ve yalnız AÇIK sohbette. */
      if (olay.profilId !== guncel.current.karsiId) return;
      setOzet((o) => (o && o.durum === 'acik' ? { ...o, karsiOkunduAni: olay.an } : o));
    });
  }, [sohbetId, benId, okunduSay]);

  /* ------------------------------------------------ gönderim */
  const gonder = async (metin: string) => {
    if (!karsi) return;
    const m = await mesajGonder(karsi.id, metin);
    altaKaydir.current = true;
    setMesajlar((liste) => birlestir(liste, [m]));
    if (!sohbetId) setSohbetId(m.sohbetId);
    /* Durum değişmiş olabilir: ilk mesaj sohbeti açtı ya da yanıt isteği kabul etti. */
    const o = await ozetGetir(m.sohbetId).catch(() => null);
    if (o) setOzet(o);
    yerelDegisiklikBildir();
    onDegisti();
  };

  /* ------------------------------------------------ istek bandı */
  const kabulEt = async () => {
    if (!sohbetId || bantIslemde) return;
    setBantIslemde(true);
    setBantHatasi(null);
    try {
      await istegiKabulEt(sohbetId);
      const o = await ozetGetir(sohbetId);
      if (o) setOzet(o);
      yerelDegisiklikBildir();
      onDegisti();
    } catch (sorun) {
      setBantHatasi(sorun instanceof SosyalHata ? sorun.message : 'İstek kabul edilemedi. Yeniden deneyebilirsin.');
    } finally {
      setBantIslemde(false);
    }
  };

  const sil = async () => {
    if (!sohbetId || bantIslemde) return;
    setBantIslemde(true);
    setBantHatasi(null);
    try {
      await istegiSil(sohbetId);
      yerelDegisiklikBildir();
      onDegisti();
      onNavigate(kutuYolu('istekler'));
    } catch (sorun) {
      setBantHatasi(sorun instanceof SosyalHata ? sorun.message : 'İstek silinemedi. Yeniden deneyebilirsin.');
      setBantIslemde(false);
    }
  };

  React.useEffect(() => {
    if (silOnayi) silVazgecRef.current?.focus();
  }, [silOnayi]);

  /* ------------------------------------------------ çizim */
  /* Alıcısı olduğum istekten dönüş istekler kutusuna; ötekiler sohbetlere. */
  const donusYolu = kutuYolu(ozet?.durum === 'istek' && !ozet.benBaslattim ? 'istekler' : 'gelen');
  const geriSatiri = (
    /* Dar ekranda listeye dönüş; geniş ekranda liste zaten solda. */
    <a
      href={donusYolu}
      onClick={(olay) => {
        if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
        olay.preventDefault();
        onNavigate(donusYolu);
      }}
      aria-label="Mesajlara dön"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 lg:hidden ${ODAK_HALKASI}`}
    >
      <ArrowLeft aria-hidden className="h-5 w-5" />
    </a>
  );

  if (asama !== 'hazir' || !karsi) {
    const cumle: Record<Exclude<Asama, 'hazir'>, string> = {
      yukleniyor: '',
      yok: 'Bu profil bulunamadı ya da şu anda mesaj almıyor.',
      kendin: 'Kendine mesaj gönderemezsin.',
      sirket: 'Mesajlaşma şimdilik yalnız öğrenciler arasında açık.',
      hata: 'Sohbet açılamadı. Bağlantını kontrol edip yeniden dene.',
    };
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-gray-200 px-2 py-2">{geriSatiri}</div>
        {asama === 'yukleniyor' ? (
          <div aria-busy="true" className="flex-1 space-y-3 p-4">
            <span aria-hidden className="block h-10 w-2/3 animate-pulse rounded-2xl bg-gray-100" />
            <span aria-hidden className="ml-auto block h-10 w-1/2 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        ) : (
          <div role={asama === 'hata' ? 'alert' : undefined} className="space-y-3 p-4">
            <p className="text-sm leading-relaxed text-gray-700">{cumle[asama as Exclude<Asama, 'hazir'>]}</p>
            {asama === 'hata' && (
              <button type="button" onClick={() => setDeneme((n) => n + 1)} className={HAP}>
                Yeniden dene
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const aliciyimIstekte = ozet?.durum === 'istek' && !ozet.benBaslattim;
  const baslatanimIstekte = ozet?.durum === 'istek' && ozet.benBaslattim;
  const gonderdigim = mesajlar.filter((m) => m.gonderen === benId).length;
  const kalanHak = istekHakki(gonderdigim, ISTEK_MESAJ_SINIRI);
  const kutuKapali = baslatanimIstekte && kalanHak === 0
    ? `İsteğin kabul edilene kadar başka mesaj gönderemezsin (en çok ${ISTEK_MESAJ_SINIRI} mesaj).`
    : null;
  const sonKendi = [...mesajlar].reverse().find((m) => m.gonderen === benId) ?? null;
  const goruldu =
    ozet?.durum === 'acik' && sonKendi ? gorulduMu(sonKendi.olusturmaAni, ozet.karsiOkunduAni) : false;
  const profilAdresi = profilYolu(karsi.kullaniciAdi);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ------------------------------------------ başlık */}
      <header className="flex items-center gap-2 border-b border-gray-200 px-2 py-2 lg:px-4">
        {geriSatiri}
        <a
          href={profilAdresi}
          onClick={(olay) => {
            if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
            olay.preventDefault();
            onNavigate(profilAdresi);
          }}
          className={`flex min-h-11 min-w-0 items-center gap-3 rounded-xl pr-2 hover:bg-gray-50 ${ODAK_HALKASI}`}
        >
          <ProfilFotografi ad={karsi.ad} yol={karsi.avatarYolu} className="h-10 w-10 shrink-0 rounded-full text-sm" />
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-sm font-extrabold text-gray-900">{karsi.ad}</span>
              <ResmiTik resmiMi={karsi.resmiMi} className="h-3.5 w-3.5" />
            </span>
            <span className="block truncate text-xs text-gray-500">@{karsi.kullaniciAdi}</span>
          </span>
        </a>
      </header>

      {/* ------------------------------------------ istek bantları */}
      {aliciyimIstekte && (
        <section aria-label="Mesaj isteği" className="border-b border-gray-200 bg-blue-50/60 px-4 py-3">
          <p className="text-sm leading-relaxed text-gray-800">
            <span className="font-bold">{karsi.ad}</span> sana mesaj göndermek istiyor. Kabul edersen sohbet açılır; o da
            mesajını gördüğünü bilir. Yanıt yazarsan da istek kabul edilmiş olur.
          </p>
          {silOnayi ? (
            <div role="alertdialog" aria-label="İsteği sil" className="mt-3 space-y-2">
              {/*
                Ada ek eklenmiyor: "Mehmet Uzunadlıoğulları'a" gibi yanlış
                ekler üretiyordu (ölçüldü); Türkçe ek adın son hecesine göre
                değişir. Cümle adsız.
              */}
              <p className="text-sm font-semibold text-gray-900">
                İstek ve mesajları silinsin mi? Karşı tarafa bildirim gitmez.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  ref={silVazgecRef}
                  type="button"
                  onClick={() => {
                    setSilOnayi(false);
                    requestAnimationFrame(() => silTetikRef.current?.focus());
                  }}
                  className={HAP}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={bantIslemde}
                  onClick={() => void sil()}
                  className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60 ${RENK_GECISI} ${ODAK_HALKASI}`}
                >
                  {bantIslemde ? 'Siliniyor…' : 'Sil'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={bantIslemde}
                onClick={() => void kabulEt()}
                className={`${HAP_BIRINCIL} disabled:cursor-default disabled:opacity-40`}
              >
                Kabul et
              </button>
              <button ref={silTetikRef} type="button" onClick={() => setSilOnayi(true)} className={HAP}>
                Sil
              </button>
            </div>
          )}
          {bantHatasi && (
            <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">
              {bantHatasi}
            </p>
          )}
        </section>
      )}
      {baslatanimIstekte && (
        <p role="status" className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm leading-relaxed text-gray-700">
          Mesaj isteğin iletildi. Kabul edilene kadar en çok {ISTEK_MESAJ_SINIRI} mesaj gönderebilirsin
          {kalanHak > 0 ? ` (${kalanHak} hakkın kaldı).` : '.'}
        </p>
      )}

      {/* ------------------------------------------ mesajlar */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={kaydirici}
          onScroll={() => {
            const k = kaydirici.current;
            if (!k) return;
            if (k.scrollTop < ALT_ESIGI) void eskileriYukle();
            if (enAltta()) setYeniMesajVar(false);
          }}
          role="log"
          aria-label={`${karsi.ad} ile mesajlar`}
          className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
        >
          {eskiYukleniyor && (
            <p role="status" className="pb-3 text-center text-xs text-gray-500">
              Eski mesajlar yükleniyor…
            </p>
          )}
          {mesajlar.length === 0 && (
            <p className="px-2 py-6 text-center text-sm leading-relaxed text-gray-600">
              {sohbetId
                ? 'Bu sohbette henüz mesaj yok.'
                : 'Henüz mesaj yok. Bağlantın değilse ilk mesajın, kabul edilene kadar karşı tarafın mesaj isteklerinde bekler.'}
            </p>
          )}
          <ol className="space-y-1.5">
            {mesajlar.map((m, i) => {
              const benim = m.gonderen === benId;
              const ayrac = i === 0 || !ayniGunMu(mesajlar[i - 1].olusturmaAni, m.olusturmaAni);
              return (
                <li key={m.id}>
                  {ayrac && (
                    <p className="py-3 text-center text-xs font-semibold text-gray-500">{gunAyraci(m.olusturmaAni)}</p>
                  )}
                  <div className={`group flex items-center gap-1 ${benim ? 'justify-end' : 'justify-start'}`}>
                    <div className={benim ? BALON_BENIM : BALON_KARSI}>
                      <p className="whitespace-pre-wrap break-words">{m.metin}</p>
                      {/*
                        Saat 11 piksel: kontrast eşiği 4.5:1. gray-500 gri-100
                        zeminde ~4.4:1, blue-100 mavi-600 zeminde eşiğin altında
                        (hesaplandı); gray-600 ~6.9:1, beyaz ~5.2:1.
                      */}
                      <p className={`mt-0.5 text-right text-[11px] ${benim ? 'text-white' : 'text-gray-600'}`}>
                        <time dateTime={m.olusturmaAni}>{saatMetni(m.olusturmaAni)}</time>
                      </p>
                    </div>
                    {!benim && <MesajEylemMenusu kullaniciId={benId} mesajId={m.id} />}
                  </div>
                  {goruldu && sonKendi?.id === m.id && (
                    <p className="mt-0.5 pr-1 text-right text-[11px] font-semibold text-gray-500">Görüldü</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        {yeniMesajVar && (
          <button
            type="button"
            onClick={() => {
              const k = kaydirici.current;
              if (k) k.scrollTop = k.scrollHeight;
              setYeniMesajVar(false);
            }}
            className={`${HAP_BIRINCIL} absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md`}
          >
            <ArrowDown aria-hidden className="h-4 w-4" />
            Yeni mesaj
          </button>
        )}
      </div>

      <MesajYazmaKutusu onGonder={gonder} kapali={kutuKapali} />
    </div>
  );
};
