import React from 'react';
import { AlertTriangle, Check, Clock, Copy, ExternalLink, Info } from 'lucide-react';
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
import {
  ilanKontrolDurumu,
  ilanOku,
  type IlanKontrolDurumu,
  type IlanKontrolSonucu,
} from '../lib/sirket-veri';
import {
  DEGISIKLIK_METNI,
  DEGISIKLIK_ROZETI,
  KONTROL_ETIKETI,
  bekleyenOku,
  gerekceSatiri,
  gerekceleriDagit,
  gerekceleriOku,
  gonderimAnahtariUret,
  yoneticiKarariMi,
} from '../lib/ilan-kontrol-gorunumu.mjs';
import { listingSlug } from '../lib/slug';
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
 * YAYIN KARARI FORMDA DEĞİL, SUNUCUDA (20261120010000)
 * ---------------------------------------------------
 * İki ayrı eylem var: "Taslak olarak kaydet" yalnız kaydediyor, kontrol
 * çalışmıyor. "Yayına gönder" kaydedip `ilan_yayina_gonder`ı çağırıyor;
 * sunucu kuralları aynı istekte çalıştırıyor ve dört sonuçtan birini
 * döndürüyor: yayında, düzeltme gerekiyor (alan alan), inceleme gerekiyor
 * (ekibin kuyruğu), kontrol ediliyor (kontrol tamamlanamadı, sunucu
 * yeniden deniyor). Form o sonucu olduğu gibi yazıyor; "yayına çıktı"
 * sözü yalnız sunucu "yayinda" dediğinde.
 *
 * Tarayıcının yayın yetkisi YOK: form durum olarak yalnız taslak
 * yazıyor; başka bir şey yazsa da `guard_listing_publish` reddederdi.
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

/**
 * Sunucunun bir alana yazdığı düzeltme gerekçeleri — alanın hemen altında.
 *
 * Etiketin sağındaki kısa sorun yerinde değil: sunucunun cümlesi uzun
 * ("Bu bağlantı güvenli değil (http)…") ve dar ekranda etiketi ezerdi.
 * `break-words`: gerekçe bir bağlantı adresi taşıyabiliyor ve 375 px'te
 * satırı taşırmamalı.
 */
const SunucuNotu: React.FC<{ id: string; mesajlar?: string[] }> = ({ id, mesajlar }) =>
  mesajlar && mesajlar.length > 0 ? (
    <ul id={id} className="mt-1 space-y-0.5 text-xs font-semibold leading-relaxed text-rose-700">
      {mesajlar.map((m, i) => (
        <li key={i} className="break-words">
          {m}
        </li>
      ))}
    </ul>
  ) : null;

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

/** Kontrolün şirkete gösterilen sonucu ve nereden geldiği. */
type KontrolGorunumu = {
  durum: IlanKontrolDurumu;
  gerekceler: ReturnType<typeof gerekceleriOku>;
  /*
    gonderim: "Yayına gönder"in yanıtı · kayit: kaydettikten sonra yeniden
    okunan satır · yukleme: düzenleme açılırken okunan satır. Aynı durum
    üçünde farklı cümle istiyor ("yayına çıkmadı" / "değişiklikler
    kaydedildi" / "son kontrolde").
  */
  neden: 'gonderim' | 'kayit' | 'yukleme';
  /*
    YAYINDAKİ İLANIN BEKLEYEN DEĞİŞİKLİĞİ (20261120010000)

    true ise durum İLANIN değil DEĞİŞİKLİĞİN durumu: ilan yayında kalıyor
    (son onaylı sürüm), kaydedilen içerik kontrolden geçmeyi bekliyor.
    Yayındaki ilan artık düzenleme yüzünden taslağa çekilmiyor; bu yüzden
    "yayından kalktı" diyen bir cümle yok.
  */
  degisiklik: boolean;
};

/* Formu kapatıp sonuç ekranı çizen durumlar. Düzeltme formda kalıyor:
   düzeltilecek yer orası. */
const EKRANLI_DURUMLAR: IlanKontrolDurumu[] = ['yayinda', 'inceleme_gerekiyor', 'kontrol_ediliyor'];

export const IlanFormu: React.FC<{
  kademe: number;
  sirketAdi: string;
  siteUrl?: string | null;
  eposta?: string | null;
  /**
   * YALNIZ KAYDEDER: `id` boşsa yeni ilan (taslak), doluysa o ilanı
   * günceller. `gonderimAnahtari` formun ömrü boyunca aynı: çift
   * tıklama ya da ağ tekrarı ikinci bir ilan açmasın.
   */
  onKaydet: (
    satir: Record<string, unknown>,
    secenek: { id: string | null; gonderimAnahtari: string },
  ) => Promise<{ id: string } | null>;
  /** Sunucu kontrolünü çalıştırır; dönen durum sunucunun kararı. */
  onYayinaGonder: (id: string) => Promise<IlanKontrolSonucu>;
  onIptal: () => void;
  /*
    Doluysa DÜZENLEME kipi: form aynı, kaydetme yolu farklı. Ayrı bir
    düzenleme bileşeni yazmak iki kopya demek olurdu — doğrulama kuralı
    ya da yeni bir alan birinde değişip diğerinde unutulurdu.
  */
  duzenlenenId?: string | null;
  /**
   * Satırı okuyan çağrı (düzenleme açılışı ve kayıttan sonraki gerçek
   * durum). Üretimde verilmiyor → `ilanOku`; geliştirme fikstürü kendi
   * satırını veriyor.
   */
  ilanOkuyucu?: (id: string) => Promise<Record<string, unknown>>;
}> = ({
  kademe,
  sirketAdi,
  siteUrl,
  eposta,
  onKaydet,
  onYayinaGonder,
  onIptal,
  duzenlenenId,
  ilanOkuyucu,
}) => {
  const oku = ilanOkuyucu ?? ilanOku;
  const [deger, setDeger] = React.useState<IlanFormDegeri>(BOS);
  const [yukleniyor, setYukleniyor] = React.useState(Boolean(duzenlenenId));
  const [okumaHatasi, setOkumaHatasi] = React.useState('');
  const [okumaDenemesi, setOkumaDenemesi] = React.useState(0);
  const [gonderildi, setGonderildi] = React.useState(false);
  const [islem, setIslem] = React.useState<'bos' | 'kaydediliyor' | 'gonderiliyor'>('bos');
  const [hata, setHata] = React.useState('');
  /* Kayıt başarılı; formun altında kalan kısa bilgi ("Taslak kaydedildi…"). */
  const [bilgi, setBilgi] = React.useState('');
  const [kontrol, setKontrol] = React.useState<KontrolGorunumu | null>(null);
  const [kopyalandi, setKopyalandi] = React.useState(false);
  /*
    KAYITLI İLANIN KİMLİĞİ VE DURUMU

    Yeni formda ilk kayıttan sonra doluyor: düzeltip yeniden gönderen
    şirket AYNI ilanı güncelliyor, ikinci bir ilan açmıyor. Durum hangi
    düğmelerin çizileceğini seçiyor: yayındaki ilanda "Yayına gönder"
    yok (zaten yayında), kapalı ilan kartındaki "Yeniden yayınla" ile
    açılıyor.
  */
  const [kayitliId, setKayitliId] = React.useState<string | null>(duzenlenenId ?? null);
  const [kayitliDurum, setKayitliDurum] = React.useState<string | null>(null);
  /*
    GÖNDERİM ANAHTARI — FORM BAŞINA BİR KEZ

    Ref'te; ilk çizimde üretiliyor ve formun ömrü boyunca değişmiyor.
    Her tıklamada yeni anahtar üretilseydi sunucudaki tekillik kuralı
    (company_id, gonderim_anahtari) çift gönderimi yakalayamazdı.
  */
  const gonderimAnahtari = React.useRef<string>('');
  if (!gonderimAnahtari.current) gonderimAnahtari.current = gonderimAnahtariUret();
  /*
    ÇİFT TIKLAMA KİLİDİ REF'TE: `disabled` bir sonraki çizimde
    uygulanıyor; o arada gelen ikinci tıklama ikinci isteği gönderirdi.
  */
  const kilit = React.useRef(false);
  const sonucBasligi = React.useRef<HTMLHeadingElement>(null);
  const duzeltmeKutusu = React.useRef<HTMLDivElement>(null);
  const k = React.useId();
  /*
    ŞABLON DEĞİŞTİRME ONAYI: dolu bir iş tanımının üzerine şablon
    yazılmadan önce ne olacağı söyleniyor. Pozisyon değişince bekleyen
    onay düşüyor (öteki alanın şablonu için sorulmuş bir soru kalmasın).
  */
  const [onayBekleyen, setOnayBekleyen] = React.useState<{ id: string; etiket: string; metin: string } | null>(null);

  /* Düzenlemede kayıtlı satır forma çevriliyor (ilanFormDegeri,
     ilanSatiri'nin tersi). Okunamazsa form HİÇ çizilmiyor (aşağıda
     `okumaHatasi`): boş form, kullanıcıya var olan ilanı boş sandırıp
     üzerine yazdırırdı. */
  React.useEffect(() => {
    if (!duzenlenenId) return;
    let iptal = false;
    setYukleniyor(true);
    setOkumaHatasi('');
    void oku(duzenlenenId)
      .then((satir) => {
        if (iptal) return;
        const status = String(satir.status ?? '');
        /*
          BEKLEYEN DEĞİŞİKLİK VARSA FORM ONUNLA DOLUYOR

          Yayındaki ilanın canlı satırı son onaylı sürüm; şirketin kaydettiği
          ama yayına girmemiş metin `bekleyen.icerik`te (aynı kolon adları).
          Form canlı satırla açılsaydı şirket kendi düzeltmesini kaybolmuş
          sanır ve eski metnin üstüne yazardı.
        */
        const bekleyen = status === 'published' ? bekleyenOku(satir.bekleyen) : null;
        setDeger(ilanFormDegeri(bekleyen?.icerik ? { ...satir, ...bekleyen.icerik } : satir));
        setKayitliDurum(status);
        if (bekleyen) {
          setKontrol({ durum: bekleyen.durum, gerekceler: bekleyen.gerekceler, neden: 'yukleme', degisiklik: true });
        } else {
          /* Son kontrolün sonucu düzenleme açılınca da görünüyor: "Düzenle"ye
             basan şirket neyi düzelteceğini formun içinde okuyor. */
          const d = ilanKontrolDurumu(satir as { status?: string | null; kontrol_durumu?: string | null });
          setKontrol(
            d === 'duzeltme_gerekiyor' || d === 'inceleme_gerekiyor' || d === 'kontrol_ediliyor'
              ? { durum: d, gerekceler: gerekceleriOku(satir.kontrol_gerekceleri), neden: 'yukleme', degisiklik: false }
              : null,
          );
        }
        setYukleniyor(false);
      })
      .catch((e: unknown) => {
        if (iptal) return;
        setOkumaHatasi(e instanceof Error ? e.message : 'İlan okunamadı.');
        setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
    /* `oku` fikstürde her çizimde yeni işlev; okuma yalnız kimlik
       değişince ve "Yeniden dene" ile tekrarlanıyor. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duzenlenenId, okumaDenemesi]);

  /* Sonuç değişince odak oraya: ekran okuyucu ve telefonda aşağı
     kaydırılmış form, sonucun nerede yazdığını aramasın. */
  React.useEffect(() => {
    if (!kontrol || kontrol.neden === 'yukleme') return;
    if (EKRANLI_DURUMLAR.includes(kontrol.durum) && !kontrol.degisiklik) {
      sonucBasligi.current?.focus();
    } else {
      duzeltmeKutusu.current?.focus();
      duzeltmeKutusu.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    }
  }, [kontrol]);

  const yaz = (alan: keyof IlanFormDegeri) => (v: string) =>
    setDeger((o) => ({ ...o, [alan]: v }));

  const sorunlar = ilanSorunlari(deger);
  const goster = (alan: keyof IlanFormDegeri) => (gonderildi ? sorunlar[alan] : undefined);

  /*
    SUNUCUNUN DÜZELTME GEREKÇELERİ, alan alan

    Yalnız "Düzeltme gerekiyor"da. Alanı tanınmayan gerekçe kaybolmuyor;
    formun üstündeki kutuda (`genel`) yazıyor.
  */
  const sunucuGerekceleri =
    kontrol?.durum === 'duzeltme_gerekiyor' ? gerekceleriDagit(kontrol.gerekceler).alanlar : {};
  const sunucuNotuId = (alan: string) => `${k}-${alan}-kontrol`;
  const aciklayan = (alan: string, ...diger: string[]) =>
    [...diger, sunucuGerekceleri[alan]?.length ? sunucuNotuId(alan) : null].filter(Boolean).join(' ') ||
    undefined;

  /* Aday kartlarının açılması doğrulanmış şirkete bağlı; başvurunun
     nereye geldiğine değil. Form bunu ilan verilirken söylüyor. */
  const adayKimligiAcik = Number(kademe) >= 2;
  /*
    YAYINDA BAŞLAYAN İLAN YOK

    Yeni ilan her zaman TASLAK olarak yazılıyor (`ilanBaslangicDurumu`);
    yayına çıkaran tek yol sunucudaki kontrol (`onYayinaGonder`). Aynı
    kural veritabanında da zorlanıyor (`guard_listing_publish`).
    `siteUrl`/`eposta` prop'ları imzada kalıyor — şirket profili
    eksiksizliğini gösteren başka yerler onları kullanıyor.
  */
  const baslangicDurumu = ilanBaslangicDurumu({ kademe });
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

  /*
    Formun kendi kuralı (ilan-formu.mjs) sunucudan ÖNCE: eksik alanla
    istek atılmıyor. Telefonda işaretli alan ekranın dışında kalabildiği
    için düğmenin altına da tek cümle yazılıyor.
  */
  const alanlarHazir = () => {
    if (!baslangicDurumu) return false;
    if (ilanGecerli(deger)) return true;
    setBilgi('');
    setHata('Bazı alanlar eksik ya da hatalı; işaretli alanları düzelt.');
    return false;
  };

  /*
    KAYDET — ortak adım. Kimlik varsa günceller (yeni ilan açmaz), yoksa
    taslak oluşturur. `ilanSatiri` durum olarak `baslangicDurumu`
    ('draft') yazıyor; düzenlemede `ilanGuncelle` durumu hiç göndermiyor.
  */
  const kaydetVeKimlikAl = async (): Promise<string> => {
    const satir = ilanSatiri(deger, { companyId: '', durum: baslangicDurumu });
    const kayit = await onKaydet(satir, { id: kayitliId, gonderimAnahtari: gonderimAnahtari.current });
    if (!kayit) throw new Error('İlan kaydedilemedi.');
    setKayitliId(kayit.id);
    if (!kayitliDurum) setKayitliDurum('draft');
    return kayit.id;
  };

  /*
    TASLAK OLARAK KAYDET / DEĞİŞİKLİKLERİ KAYDET

    Taslakta kontrol İSTEMİYOR. Kayıttan sonra satır YENİDEN OKUNUYOR,
    çünkü gerçek durum sunucuda belirleniyor: yayındaki ilanın içeriği
    değişince tetikleyici aynı istekte kontrol ediyor — geçerse yeni
    içerik yayında, geçmezse ilanın önceki hâli yayında kalıyor ve
    değişiklik `bekleyen` olarak bekliyor. Gönderilmiş taslağın içeriği
    değişince eski karar siliniyor. Formun tahmini değil, satırın kendisi
    gösteriliyor.
  */
  const kaydet = async () => {
    setGonderildi(true);
    if (kilit.current || !alanlarHazir()) return;
    kilit.current = true;
    setIslem('kaydediliyor');
    setHata('');
    setBilgi('');
    const oncekiDurum = kayitliDurum;
    try {
      const id = await kaydetVeKimlikAl();
      let satir: Record<string, unknown>;
      try {
        satir = await oku(id);
      } catch {
        setBilgi('Değişiklikler kaydedildi ama ilanın son durumu okunamadı. İlanlarına dönüp kartına bak.');
        return;
      }
      const durum = ilanKontrolDurumu(satir as { status?: string | null; kontrol_durumu?: string | null });
      const status = String(satir.status ?? '');
      setKayitliDurum(status);
      if (oncekiDurum === 'published' && status === 'published') {
        const bekleyen = bekleyenOku(satir.bekleyen);
        setKontrol(
          bekleyen
            ? { durum: bekleyen.durum, gerekceler: bekleyen.gerekceler, neden: 'kayit', degisiklik: true }
            : { durum: 'yayinda', gerekceler: [], neden: 'kayit', degisiklik: true },
        );
        return;
      }
      if (durum === 'yayinda' || durum === 'duzeltme_gerekiyor') {
        setKontrol({
          durum,
          gerekceler: gerekceleriOku(satir.kontrol_gerekceleri),
          neden: 'kayit',
          degisiklik: false,
        });
        return;
      }
      /* İnceleme ya da kontrol sürüyorsa (içerik değişmediyse) açılıştaki
         not yerinde kalıyor; içerik değiştiyse sunucu kararı sildi → taslak. */
      if (durum === 'taslak') setKontrol(null);
      setBilgi(
        status === 'closed'
          ? 'Değişiklikler kaydedildi. İlan kapalı ve öğrencilere görünmüyor.'
          : durum === 'taslak'
            ? 'Taslak kaydedildi. Öğrenciler taslağı görmüyor; hazır olduğunda “Yayına gönder”e bas.'
            : 'Değişiklikler kaydedildi.',
      );
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İlan kaydedilemedi.');
    } finally {
      kilit.current = false;
      setIslem('bos');
    }
  };

  /*
    YAYINA GÖNDER — önce kaydet, sonra sunucu kontrolü

    İki adım ayrı yakalanıyor: kayıt düşerse hiçbir şey kaydedilmedi;
    kayıt geçip gönderim düşerse ilan TASLAK olarak duruyor ve bu
    söyleniyor — şirket "hiçbir şey olmadı" sanıp ikinci ilanı açmasın.
  */
  const yayinaGonder = async () => {
    setGonderildi(true);
    if (kilit.current || !alanlarHazir()) return;
    kilit.current = true;
    setIslem('gonderiliyor');
    setHata('');
    setBilgi('');
    try {
      let id: string;
      try {
        id = await kaydetVeKimlikAl();
      } catch (e) {
        setHata(e instanceof Error ? e.message : 'İlan kaydedilemedi.');
        return;
      }
      try {
        const sonuc = await onYayinaGonder(id);
        setKayitliDurum(sonuc.durum === 'yayinda' ? 'published' : 'draft');
        if (sonuc.durum === 'taslak') {
          setKontrol(null);
          setBilgi('İlan taslak olarak duruyor.');
        } else {
          setKontrol({
            durum: sonuc.durum,
            gerekceler: gerekceleriOku(sonuc.gerekceler),
            neden: 'gonderim',
            degisiklik: false,
          });
        }
      } catch (e) {
        setHata(
          `İlan taslak olarak kaydedildi ama yayına gönderilemedi. ${
            e instanceof Error ? e.message : 'Yeniden dene.'
          }`,
        );
      }
    } finally {
      kilit.current = false;
      setIslem('bos');
    }
  };

  /*
    DEĞİŞİKLİĞİ YENİDEN KONTROL ET — yalnız kontrolü tamamlanamamış
    değişiklikte

    Formda bir şey değişmediyse kaydetmek yeni bir kontrol başlatmıyor
    (içerik aynı). Sunucu bu değişikliği kendisi de yeniden deniyor; düğme
    şirketin beklemek yerine şimdi denemesini sağlıyor. Aynı kapı:
    `ilan_yayina_gonder` yayındaki ilanda bekleyen değişikliği kontrol ediyor.
  */
  const degisikligiYenidenKontrolEt = async () => {
    if (kilit.current || !kayitliId) return;
    kilit.current = true;
    setIslem('gonderiliyor');
    setHata('');
    setBilgi('');
    try {
      const sonuc = await onYayinaGonder(kayitliId);
      setKontrol(
        sonuc.degisiklik
          ? {
              durum: sonuc.degisiklik.durum,
              gerekceler: gerekceleriOku(sonuc.degisiklik.gerekceler),
              neden: 'gonderim',
              degisiklik: true,
            }
          : { durum: 'yayinda', gerekceler: [], neden: 'kayit', degisiklik: true },
      );
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kontrol başlatılamadı. Yeniden dene.');
    } finally {
      kilit.current = false;
      setIslem('bos');
    }
  };

  /*
    SONUÇ EKRANI — sunucunun dediği, başka bir şey değil

    Yalnız üç durum formu kapatıyor: yayında, inceleme, kontrol sürüyor.
    Düzeltmede form açık kalıyor. Düzenleme AÇILIRKEN okunan durum bu
    ekranı çizmiyor: "Düzenle"ye basan kişi formu görmek istiyor.
  */
  const sonucEkrani =
    kontrol &&
    kontrol.neden !== 'yukleme' &&
    EKRANLI_DURUMLAR.includes(kontrol.durum) &&
    /* Yayındaki ilanın değişikliği yalnız yayına girince ekranı kapatıyor;
       inceleme ya da kontrol sürüyorsa form açık kalıyor (ilan yayında). */
    (!kontrol.degisiklik || kontrol.durum === 'yayinda');
  if (kontrol && sonucEkrani && kayitliId) {
    /*
      PAYLAŞILACAK ADRES İLANIN GERÇEK ADRESİ: `/ilan/<uuid>` hiçbir ilanı
      açmıyor (yönlendirme son parçada 8 haneli kısa kimlik arıyor);
      öğrencinin gördüğü kartla aynı `listingSlug`.
    */
    const ilanYolu = `/ilan/${listingSlug({ id: kayitliId, title: deger.unvan })}`;
    const adres = `${window.location.origin}${ilanYolu}`;
    const duzenlemeden = kontrol.neden === 'kayit';
    return (
      <div className={`space-y-4 ${KUTU}`} style={kutuStil}>
        <h1
          ref={sonucBasligi}
          tabIndex={-1}
          className="flex items-center gap-2 text-lg font-extrabold outline-none"
          style={{ color: SIRKET_METIN }}
        >
          {kontrol.durum === 'yayinda' ? (
            <Check aria-hidden className="h-5 w-5 shrink-0" style={{ color: SIRKET_VURGU_KOYU }} />
          ) : kontrol.durum === 'inceleme_gerekiyor' ? (
            <AlertTriangle aria-hidden className="h-5 w-5 shrink-0 text-amber-700" />
          ) : (
            <Clock aria-hidden className="h-5 w-5 shrink-0" style={{ color: SIRKET_METIN_IKINCIL }} />
          )}
          {KONTROL_ETIKETI[kontrol.durum]}
        </h1>

        <div className="space-y-2 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          {kontrol.durum === 'yayinda' && (
            <p>
              {duzenlemeden
                ? DEGISIKLIK_METNI.yayinda
                : 'İlan otomatik kontrolden geçti ve yayına çıktı. Öğrenciler ilanı listede görebilir.'}
            </p>
          )}

          {kontrol.durum === 'inceleme_gerekiyor' && (
            <>
              {/* Şirkete kuralın ayrıntısı gelmiyor (sunucu bilerek vermiyor);
                  ne geldiyse o yazılıyor, yoksa tek genel cümle. */}
              {kontrol.gerekceler.length > 0 ? (
                kontrol.gerekceler.map((g, i) => (
                  <p key={i} className="break-words" style={{ color: SIRKET_METIN }}>
                    {g.mesaj}
                  </p>
                ))
              ) : (
                <p style={{ color: SIRKET_METIN }}>İlan ekibimizin incelemesine gönderildi.</p>
              )}
              <p>İnceleme sürerken ilan öğrencilere görünmüyor.</p>
            </>
          )}

          {kontrol.durum === 'kontrol_ediliyor' && (
            <>
              {/* SÜRE VAADİ YOK: yeniden deneme sayısı ve aralığı sunucuda;
                  ne zaman biteceğini bilmiyoruz, o yüzden yazmıyoruz. */}
              <p style={{ color: SIRKET_METIN }}>
                İlan kaydedildi ama otomatik kontrol bu sefer tamamlanamadı. Sunucu kontrolü kendisi
                yeniden deneyecek; senin bir şey yapman gerekmiyor.
              </p>
              <p>
                Kontrol bitene kadar ilan öğrencilere görünmüyor. Sonucu ilanlarında, bu ilanın kartında
                görürsün.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {kontrol.durum === 'yayinda' && (
            <>
              <a href={ilanYolu} className={BIRINCIL_DUGME} style={birincilStil}>
                <ExternalLink aria-hidden className="h-4 w-4" />
                İlanı görüntüle
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(adres)
                    .then(() => setKopyalandi(true))
                    .catch(() => setKopyalandi(false));
                }}
                className={IKINCIL_DUGME}
                style={ikincilStil}
              >
                <Copy aria-hidden className="h-4 w-4" />
                {kopyalandi ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
              </button>
            </>
          )}
          <button type="button" onClick={onIptal} className={IKINCIL_DUGME} style={ikincilStil}>
            İlanlara dön
          </button>
        </div>
      </div>
    );
  }

  if (okumaHatasi) {
    /*
      OKUNAMAYAN İLAN İÇİN BOŞ FORM YOK

      Eskiden hata formun altına yazılıyor ve form BOŞ değerlerle
      çiziliyordu. `ilanOku` erişim yokluğunu ve bağlantı hatasını
      ayırmıyor (ikisinde de satır gelmiyor); iki ihtimal de söyleniyor,
      biri seçilip uydurulmuyor.
    */
    return (
      <div className={`space-y-3 ${KUTU}`} style={kutuStil} role="alert">
        <p className="font-bold" style={{ color: SIRKET_METIN }}>
          İlan açılamadı
        </p>
        <p className="text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
          {okumaHatasi} Bağlantı kopmuş olabilir; ilan silindiyse ya da bu şirkete ait değilse de açılmaz.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOkumaDenemesi((n) => n + 1)}
            className={IKINCIL_DUGME}
            style={ikincilStil}
          >
            Yeniden dene
          </button>
          <button type="button" onClick={onIptal} className={IKINCIL_DUGME} style={ikincilStil}>
            İlanlara dön
          </button>
        </div>
      </div>
    );
  }

  /* Düzenlemede kayıtlı değerler gelene kadar boş form çizilmiyor:
     kullanıcı bir an boş alanlar görüp "ilan silinmiş" sanmasın. */
  if (yukleniyor) {
    return (
      <div className="space-y-4" aria-busy="true">
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

  const yayinda = kayitliDurum === 'published';
  const kapali = kayitliDurum === 'closed';
  const uzaktan = deger.calismaSekli === 'Remote';
  /* "Yayına gönder" yeni ilanda ve taslakta; yayındaki ilan zaten yayında,
     kapalı ilan kartındaki "Yeniden yayınla" ile açılıyor. */
  const gonderilebilir = !yayinda && !kapali;
  const mesgul = islem !== 'bos';
  const duzeltme = kontrol?.durum === 'duzeltme_gerekiyor' ? kontrol : null;
  /* Yayındaki ilanın bekleyen değişikliği (ilan yayında, değişiklik değil). */
  const degisiklik = kontrol?.degisiklik && kontrol.durum !== 'yayinda' ? kontrol : null;
  /* Alt başlıktaki durum: düzenlenen ilanın bugünkü hâli. */
  const durumEtiketi = !duzenlenenId && !kayitliId
    ? null
    : yayinda
      ? KONTROL_ETIKETI.yayinda
      : kapali && !kontrol
        ? 'Kapalı'
        : KONTROL_ETIKETI[kontrol?.durum ?? 'taslak'];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: SIRKET_METIN }}>
          {duzenlenenId ? 'İlanı düzenle' : 'Yeni ilan'}
        </h1>
        <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          {sirketAdi}
          {durumEtiketi ? ` · ${durumEtiketi}` : ''}
        </p>
      </div>

      {/*
        BEKLEYEN DEĞİŞİKLİK — ilan yayında, değişiklik değil

        Açılışta: "Yayındaki sürüm değişmedi" + formdaki metnin bekleyen
        değişiklik olduğu. Kayıt sonrası: değişikliğin durumu. İkisinde de
        her cümle ilanın önceki hâlinin yayında olduğunu söylüyor.
        Düzeltmede gerekçeler alan alan (aynı cümleler alanların altında).
      */}
      {degisiklik && (
        <div
          ref={duzeltmeKutusu}
          tabIndex={-1}
          role={degisiklik.durum === 'duzeltme_gerekiyor' ? 'alert' : 'status'}
          className="scroll-mt-24 rounded-2xl border px-4 py-3 text-sm leading-relaxed outline-none"
          style={
            degisiklik.durum === 'duzeltme_gerekiyor'
              ? { borderColor: '#FECDD3', background: '#FFF1F2', color: '#9F1239' }
              : degisiklik.durum === 'inceleme_gerekiyor'
                ? { borderColor: '#FDE68A', background: '#FFFBEB', color: '#92400E' }
                : { borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }
          }
        >
          <p className="font-extrabold">
            {degisiklik.neden === 'yukleme' ? 'Yayındaki sürüm değişmedi' : DEGISIKLIK_ROZETI[degisiklik.durum]}
          </p>
          {degisiklik.neden === 'yukleme' && (
            <p className="mt-0.5">
              Formda kaydettiğin ama henüz yayına girmemiş değişiklik var. Değişikliğin durumu:{' '}
              <b>{KONTROL_ETIKETI[degisiklik.durum]}</b>.
            </p>
          )}
          <p className="mt-0.5">{DEGISIKLIK_METNI[degisiklik.durum]}</p>
          {degisiklik.durum === 'duzeltme_gerekiyor' && degisiklik.gerekceler.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {degisiklik.gerekceler.map((g, i) => (
                <li key={i} className="break-words">
                  {gerekceSatiri(g)}
                </li>
              ))}
            </ul>
          )}
          {degisiklik.durum === 'inceleme_gerekiyor' &&
            degisiklik.gerekceler.map((g, i) => (
              <p key={i} className="mt-0.5 break-words">
                {g.mesaj}
              </p>
            ))}
        </div>
      )}

      {/*
        DÜZELTME KUTUSU — formun üstünde, alan alan

        Her gerekçe hangi alana aitse o alanın adıyla yazıyor ("İş tanımı:
        …") ve aynı cümle alanın altında da duruyor: kutu neyin yanlış
        olduğunu, alan altı nerede düzeltileceğini söylüyor. `role="alert"`
        ve odak: gönderdikten sonra telefonda formun en altındaki kişi
        sonucu aramasın.

        YÖNETİCİ KARARI: ilan ekibimizce kaldırıldı ya da reddedildiyse
        "yayına çıkmadı" değil, kararın kendisi yazıyor; yeniden gönderim
        ekibin incelemesine gidiyor (sunucu: yonetici.onceki_karar).
      */}
      {duzeltme && !degisiklik && (
        <div
          ref={duzeltmeKutusu}
          tabIndex={-1}
          role="alert"
          className="scroll-mt-24 rounded-2xl border px-4 py-3 outline-none"
          style={{ borderColor: '#FECDD3', background: '#FFF1F2', color: '#9F1239' }}
        >
          <p className="font-extrabold">{KONTROL_ETIKETI.duzeltme_gerekiyor}</p>
          <p className="mt-0.5 text-sm leading-relaxed">
            {yoneticiKarariMi(duzeltme.gerekceler)
              ? 'Ekibimiz bu ilanı yayından kaldırdı ya da yayına almadı. Gerekçeyi okuyup ilanı düzelt; yeniden yayına gönderdiğinde ilan ekibimizin incelemesine gider.'
              : duzeltme.neden === 'gonderim'
                ? 'İlan yayına çıkmadı ve taslak olarak kaydedildi. Aşağıdakileri düzeltip yeniden yayına gönder.'
                : 'Son kontrolde ilan yayına çıkmadı. Aşağıdakileri düzeltip yeniden yayına gönder.'}
          </p>
          {duzeltme.gerekceler.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm leading-relaxed">
              {duzeltme.gerekceler.map((g, i) => (
                <li key={i} className="break-words">
                  {gerekceSatiri(g)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/*
        AÇILIŞTA İNCELEME / KONTROL SÜRÜYORSA (yayında olmayan ilan)

        Düzenlemek o süreci etkiliyor: içerik değişince sunucu eski kararı
        siliyor (ilan incelemeden ya da yeniden denemeden çıkıyor, taslak
        oluyor). Kaydetmeden önce bunu bilmek gerekiyor.
      */}
      {kontrol && !kontrol.degisiklik && kontrol.neden === 'yukleme' && kontrol.durum !== 'duzeltme_gerekiyor' && (
        <div
          role="status"
          className="rounded-2xl border px-4 py-3 text-sm leading-relaxed"
          style={
            kontrol.durum === 'inceleme_gerekiyor'
              ? { borderColor: '#FDE68A', background: '#FFFBEB', color: '#92400E' }
              : { borderColor: SIRKET_KENAR, background: SIRKET_YUZEY, color: SIRKET_METIN }
          }
        >
          <p className="font-extrabold">{KONTROL_ETIKETI[kontrol.durum]}</p>
          {kontrol.durum === 'inceleme_gerekiyor'
            ? kontrol.gerekceler.map((g, i) => (
                <p key={i} className="break-words">
                  {g.mesaj}
                </p>
              ))
            : (
                <p>Otomatik kontrol tamamlanamadı; sunucu kontrolü kendisi yeniden deniyor.</p>
              )}
          <p className="mt-1">
            Değişiklik kaydedersen bu süreç durur ve ilan taslak olur; yayına almak için yeniden göndermen gerekir.
          </p>
        </div>
      )}

      <section className={KUTU} style={kutuStil} aria-labelledby={`${k}-baslik`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id={`${k}-baslik`} className="text-base font-black" style={{ color: SIRKET_METIN }}>
            İlan bilgileri
          </h2>
          <p className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
            {/* Tamamen uzaktan çalışmada şehir zorunlu değil (form ve sunucu kuralı aynı). */}
            {uzaktan ? 'Son başvuru ve şehir dışında tüm alanlar zorunlu' : 'Son başvuru dışında tüm alanlar zorunlu'}
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
              <SunucuNotu id={sunucuNotuId('unvan')} mesajlar={sunucuGerekceleri.unvan} />
            </div>

            <div className="min-w-0">
              <Etiket htmlFor={`${k}-sehir`} sorun={goster('sehir')} istegeBagli={uzaktan}>
                Şehir
              </Etiket>
              {/* Kapalı liste değil: listede olmayan şehir de yazılabiliyor. */}
              <AutocompleteField
                id={`${k}-sehir`}
                value={deger.sehir}
                onChange={yaz('sehir')}
                options={TR_CITIES}
                placeholder={uzaktan ? 'Uzaktan çalışmada boş bırakılabilir' : 'Ör. İstanbul'}
                className={FORM_ALAN}
                klavyeDuzeni
              />
              <SunucuNotu id={sunucuNotuId('sehir')} mesajlar={sunucuGerekceleri.sehir} />
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
                aria-describedby={aciklayan('sure')}
                className={FORM_ALAN}
              />
              <SunucuNotu id={sunucuNotuId('sure')} mesajlar={sunucuGerekceleri.sure} />
            </div>
            <div className="min-w-0">
              <Etiket htmlFor={`${k}-son`} sorun={goster('sonBasvuru')} istegeBagli>
                Son başvuru
              </Etiket>
              <input
                id={`${k}-son`}
                type="date"
                value={deger.sonBasvuru}
                onChange={(e) => yaz('sonBasvuru')(e.target.value)}
                aria-describedby={aciklayan('sonBasvuru')}
                className={FORM_ALAN}
              />
              <SunucuNotu id={sunucuNotuId('sonBasvuru')} mesajlar={sunucuGerekceleri.sonBasvuru} />
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
                  aria-describedby={aciklayan('ucret')}
                  className={`mt-2 ${FORM_ALAN} sm:max-w-xs`}
                />
              )}
              <SunucuNotu id={sunucuNotuId('ucret')} mesajlar={sunucuGerekceleri.ucret} />
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
              aria-describedby={aciklayan('aciklama', `${k}-sayac`)}
              placeholder={'Stajyer hangi işlerde yer alacak ve hangi bilgi ve becerileri arıyorsunuz? Kısa maddelerle yazabilirsiniz, ör.:\n- Günlük raporların hazırlanmasına destek olmak\n- Excel kullanabilmek'}
            />
            <span
              id={`${k}-sayac`}
              className="mt-1 block text-right text-xs tabular-nums"
              style={{ color: SIRKET_METIN_IKINCIL }}
            >
              {deger.aciklama.trim().length} / {ACIKLAMA_EN_AZ}–{ACIKLAMA_EN_FAZLA} karakter
            </span>
            <SunucuNotu id={sunucuNotuId('aciklama')} mesajlar={sunucuGerekceleri.aciklama} />

            {/*
              Bayraklar uydurma bir puan değil, metinde GEÇEN şeyler ve
              yalnız yazana bir uyarı. Asıl karar sunucuda: aynı türden
              ifadeler (bağlamıyla) ilanı ekibin incelemesine düşürebiliyor.
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
          GÖNDER KARTIN SON SATIRI; YANINDA KONTROL VE BAŞVURU BİLGİSİ

          İKİ AYRI EYLEM: "Yayına gönder" (kaydet + sunucu kontrolü) ve
          "Taslak olarak kaydet" (yalnız kayıt). Yayındaki ilanı düzenlerken
          tek eylem var: "Değişiklikleri kaydet" — kontrolü sunucudaki
          tetikleyici aynı istekte yapıyor, yanındaki not bunu önceden
          söylüyor.

          Gönderim sürerken düğme "Kontrol ediliyor…" yazıyor, `aria-busy`
          ve kilitli; öteki düğmeler de kilitli (aynı ilana ikinci bir yazım
          gitmesin).

          BAŞVURU HER ZAMAN STAJIMVAR ÜZERİNDEN: `application_method`
          sistem tarafından 'internal' sabitleniyor ve şirketin o kolona
          yazma yetkisi yok. Burada seçim sunulmuyor, bilgi veriliyor.

          Aday kimliğinin doğrulamaya bağlı olduğu AÇIKÇA yazılıyor:
          Kademe 1 şirket başvuru sayısını görüyor, adayın kim olduğunu
          görmüyor.
        */}
        <div
          className="mt-4 flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6"
          style={{ borderColor: SIRKET_KENAR }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {gonderilebilir && (
              <button
                type="button"
                onClick={() => void yayinaGonder()}
                disabled={mesgul}
                aria-busy={islem === 'gonderiliyor'}
                className={BIRINCIL_DUGME}
                style={birincilStil}
              >
                {islem === 'gonderiliyor' ? 'Kontrol ediliyor…' : 'Yayına gönder'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void kaydet()}
              disabled={mesgul}
              aria-busy={islem === 'kaydediliyor'}
              className={gonderilebilir ? IKINCIL_DUGME : BIRINCIL_DUGME}
              style={gonderilebilir ? ikincilStil : birincilStil}
            >
              {islem === 'kaydediliyor'
                ? 'Kaydediliyor…'
                : kayitliId
                  ? 'Değişiklikleri kaydet'
                  : 'Taslak olarak kaydet'}
            </button>
            {degisiklik?.durum === 'kontrol_ediliyor' && (
              <button
                type="button"
                onClick={() => void degisikligiYenidenKontrolEt()}
                disabled={mesgul}
                aria-busy={islem === 'gonderiliyor'}
                className={IKINCIL_DUGME}
                style={ikincilStil}
              >
                {islem === 'gonderiliyor' ? 'Kontrol ediliyor…' : 'Değişikliği yeniden kontrol et'}
              </button>
            )}
            <button type="button" onClick={onIptal} disabled={mesgul} className={IKINCIL_DUGME} style={ikincilStil}>
              {kayitliId && !duzenlenenId ? 'İlanlara dön' : 'Vazgeç'}
            </button>
          </div>

          <div className="space-y-2 text-xs leading-relaxed lg:max-w-xl" style={{ color: SIRKET_METIN_IKINCIL }}>
            <p className="flex gap-2">
              <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {yayinda ? (
                  <>
                    <b style={{ color: SIRKET_METIN }}>
                      Yayındaki ilanda yaptığın değişiklik yayına girmeden önce kontrol edilir.
                    </b>{' '}
                    Sorun yoksa hemen yayına girer; sorun bulunursa ilanın önceki hâli yayında kalır ve
                    değişikliğin düzeltilene ya da incelenene kadar bekler.
                  </>
                ) : kapali ? (
                  <>Değişiklikler kaydedilir; ilan kapalı kalır. Yeniden açmak için ilan kartındaki “Yeniden yayınla”yı kullan.</>
                ) : (
                  <>
                    <b style={{ color: SIRKET_METIN }}>Yayına gönderdiğinde ilan otomatik olarak kontrol edilir.</b>{' '}
                    Sorun yoksa hemen yayına çıkar; eksik ya da hatalı bilgi varsa taslakta kalır ve neyin
                    düzeltileceği ilgili alanın altında yazar. Şüpheli bulunan ilan ekibimizin incelemesine
                    gider. Taslak olarak kaydettiğin ilan kontrol edilmez ve öğrencilere görünmez.
                  </>
                )}
              </span>
            </p>
            <p className="flex gap-2">
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
        </div>

        {bilgi && (
          <p role="status" className="mt-3 text-sm font-semibold" style={{ color: SIRKET_METIN }}>
            {bilgi}
          </p>
        )}
        {hata && (
          <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">
            {hata}
          </p>
        )}
      </section>
    </div>
  );
};
