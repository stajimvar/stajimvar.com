import React from 'react';
import { Search } from 'lucide-react';
import { YUZEY } from '../../ui/tokens';
import { SayfaKabugu } from '../SayfaKabugu';
import { KullaniciAramaSonuclari } from './KullaniciArama';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  SosyalHata,
  baglantiKaldir,
  baglantiYanitla,
  baglantilarimiGetir,
  type BaglantiKisisi,
  type Baglantilarim,
} from '../../lib/queries/sosyal';
import { profilYolu } from '../../lib/sosyal-kullanici-adi.mjs';
import { ProfilFotografi } from './ProfilFotografi';
import { ResmiTik } from './ResmiTik';
import { BaglantiKaldirMenusu } from './BaglantiKaldirMenusu';

/**
 * BAĞLANTILAR — TEK ADRES, ÜÇ BÖLÜM
 *
 * Bağlantılar · Gelen istekler · Gönderilen istekler aynı sayfada.
 * Sekme adresi ya da ayrı rota yok: üçü de aynı tek okumadan geliyor ve
 * bir isteği kabul etmek satırı bir bölümden ötekine taşıyor — ayrı
 * adresler olsaydı kullanıcı her eylemden sonra sayfa değiştirirdi.
 *
 * TAKİP MODELİ YOK
 * ----------------
 * Tek ilişki karşılıklı bağlantı; tek yönlü bir ilişki veritabanında da
 * yok. Bu yüzden bu sayfada "takipçi" ya da benzeri bir kavram geçmiyor.
 *
 * KARŞI TARAFIN PROFİLİ AYRI BİR YETKİ SORUSU
 * -------------------------------------------
 * Bağlantı satırını taraf olan herkes görüyor, ama karşı tarafın profili
 * RLS'e ayrıca tabi: araya engel girmiş ya da kişi topluluktan ayrılmış
 * olabilir. O zaman ad UYDURULMUYOR; satır "profil şu anda
 * görüntülenemiyor" olarak çiziliyor ve eylemler yerinde kalıyor (kaydı
 * kaldırmak hâlâ mümkün olmalı).
 *
 * YORUM, MESAJ VE BİLDİRİM MERKEZİ EKLENMEDİ
 * ------------------------------------------
 * Üçünün de tablosu ya da akışı yok; boş bir giriş noktası çizmek vaat
 * olurdu.
 */

interface BaglantilarProps {
  kullaniciId: string | null;
  oturumHazir: boolean;
  onNavigate: (yol: string, secenek?: { degistir?: boolean }) => void;
  onGirisGerekli?: () => void;
}

type Durum = 'yukleniyor' | 'hazir' | 'hata';

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';
const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

const BOS_LISTE: Baglantilarim = { kabul: [], gelen: [], giden: [] };

/**
 * Tek satır.
 *
 * Ad bağlantısı gerçek `<a href>`: orta tuş ve "yeni sekmede aç"
 * çalışıyor. Eylem düğmeleri bağlantının İÇİNDE değil yanında — iç içe
 * `<a>`/`<button>` hem geçersiz hem de tıklama hedeflerini karıştırırdı.
 */
const BaglantiSatiri: React.FC<{
  kisi: BaglantiKisisi;
  eylemler: React.ReactNode;
  onNavigate: (yol: string, secenek?: { degistir?: boolean }) => void;
}> = ({ kisi, eylemler, onNavigate }) => {
  /*
    ALT SATIR YALNIZ SEKTÖR — BÖLÜM VE ÜNİVERSİTE HENÜZ GELMİYOR

    Bağlantı sorgusu (`baglantilarimiGetir`) profilden dört alan
    çekiyor: kullanıcı adı, görünen ad, sektör, avatar yolu. Bölüm
    `social_profiles` içinde VAR ama bu sorguda seçilmiyor; üniversite
    ise hiç yok — okul bilgisi `student_profiles` tablosunda ve o tablo
    başkasının satırını okutmuyor (RLS).

    Uydurulmuyor: bugün okunabilen tek alan yazılıyor. Bölümü de
    göstermek sorguyu genişletmeyi, üniversiteyi göstermek ise sosyal
    profile yeni bir alan ve bir görünürlük kararı eklemeyi gerektiriyor.
  */
  const altSatir = kisi.profil?.sektorAdi ? `${kisi.profil.sektorAdi} alanı` : null;
  const ad = kisi.profil?.gorunenAd ?? (kisi.profil?.kullaniciAdi ? `@${kisi.profil.kullaniciAdi}` : null);
  const hedef = kisi.profil?.kullaniciAdi ? profilYolu(kisi.profil.kullaniciAdi) : null;

  return (
    /*
      TELEFONDA KART DEĞİL YÜZEY

      Satırlar gri zemin üzerinde yüzen kutulardı: iki yanında 16
      pikselik şerit, köşelerde yuvarlatma, aralarında boşluk. Liste
      ekranlarının tamamı bu düzenden çıktı; bu sayfa geride kalmıştı.
      Telefonda kabuk yerini tek bir alt çizgiye bırakıyor ve satır
      ekranın iki kenarına yaslanıyor (ui/tokens · YUZEY).
    */
    <li className={`flex flex-wrap items-center gap-3 bg-white px-4 py-3 ${YUZEY.kabuk} sm:px-3.5 sm:py-3.5`}>
      {/*
        GERÇEK FOTOĞRAF, YOKSA BAŞ HARF

        `ProfilFotografi` yolu kullanıcının OTURUMUYLA indiriyor
        (`useGorselAdresleri`): satırda bir yol görünmesi dosyanın
        görüldüğü anlamına gelmiyor, okuma politikası her indirmede
        ayrıca çalışıyor. Yol yoksa ya da dosya inemediyse baş harfler
        kalıyor — sahte bir görsel ya da genel bir "kişi" simgesi
        üretilmiyor.

        Profili RLS vermediğinde ad da yol da null: ad yerine '?'
        geçiyor ve satırın kendisi zaten "görüntülenemiyor" yazıyor.
      */}
      <ProfilFotografi
        ad={ad ?? '?'}
        yol={kisi.profil?.avatarYolu ?? null}
        className="h-11 w-11 shrink-0 rounded-full text-sm ring-1 ring-blue-500/20"
      />
      <div className="min-w-0 flex-1">
        {hedef && ad ? (
          /*
            TİK BAĞLANTININ DIŞINDA, KARDEŞİ

            İç içe tıklama hedefi kurulmuyor: ada basmak profili açıyor,
            tik yalnız bir gösterge. Ad `truncate` olduğu için tik
            metnin içinde olsaydı uzun adlarda kesilirdi.
          */
          <span className="flex min-w-0 items-center gap-1">
          <a
            href={hedef}
            onClick={(olay) => {
              if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
                return;
              olay.preventDefault();
              onNavigate(hedef);
            }}
            className={`min-w-0 truncate text-sm font-bold text-gray-900 hover:underline ${ODAK_HALKASI}`}
          >
            {ad}
          </a>
          <ResmiTik resmiMi={kisi.profil?.resmiMi} className="h-3.5 w-3.5" />
          </span>
        ) : (
          /* Ad uydurulmuyor: profil gelmediyse durum olduğu gibi yazılıyor. */
          <p className="text-sm font-semibold text-gray-600">Bu profil şu anda görüntülenemiyor</p>
        )}
        {/*
          BÖLÜM VE ALAN — ÜNİVERSİTE YOK

          `social_profiles` üniversite taşımıyor; okul bilgisi
          `student_profiles` içinde ve o tablo başkasının satırını
          okutmuyor (RLS). Uydurulmuyor: okunabilen iki alan yazılıyor —
          bölüm (katalogdan ya da kullanıcının kendi yazdığı etiket) ve
          sektör. İkisi de yoksa satır hiç çizilmiyor.
        */}
        {altSatir && <p className="truncate text-xs text-gray-600">{altSatir}</p>}
      </div>
      {eylemler && <div className="flex shrink-0 flex-wrap gap-2">{eylemler}</div>}
    </li>
  );
};

/** Bir bölüm: dört durumun dördü de burada çiziliyor. */
const Bolum: React.FC<{
  durum: Durum;
  satirlar: BaglantiKisisi[];
  /* Boş durum artık bir cümle değil, iki çıkış yolu taşıyan bir blok. */
  bos: React.ReactNode;
  onYenidenDene: () => void;
  satirCiz: (kisi: BaglantiKisisi) => React.ReactNode;
}> = ({ durum, satirlar, bos, onYenidenDene, satirCiz }) => (
  <section className="space-y-2">

    {durum === 'yukleniyor' && (
      <div aria-busy="true" className={`flex flex-col ${YUZEY.kap} sm:gap-2`}>
        <div aria-hidden className={`h-16 animate-pulse bg-gray-50 ${YUZEY.kabuk}`} />
        <div aria-hidden className={`h-16 animate-pulse bg-gray-50 ${YUZEY.kabuk}`} />
      </div>
    )}

    {durum === 'hata' && (
      <div role="alert" className={`${KART} space-y-2`}>
        <p className="text-sm font-bold text-gray-900">Bağlantılar alınamadı.</p>
        <p className="text-sm text-gray-600">
          Sunucudan cevap gelmedi. Bağlantılarında bir değişiklik olmadı.
        </p>
        <button type="button" onClick={onYenidenDene} className={IKINCIL}>
          Yeniden dene
        </button>
      </div>
    )}

    {durum === 'hazir' && satirlar.length === 0 && bos}

    {durum === 'hazir' && satirlar.length > 0 && (
      <ul className={`flex flex-col ${YUZEY.kap} sm:gap-2`}>
        {satirlar.map((kisi) => satirCiz(kisi))}
      </ul>
    )}
  </section>
);

export const BaglantilarSayfasi: React.FC<BaglantilarProps> = ({
  kullaniciId,
  oturumHazir,
  onNavigate,
  onGirisGerekli,
}) => {
  const [liste, setListe] = React.useState<Baglantilarim>(BOS_LISTE);
  const [durum, setDurum] = React.useState<Durum>('yukleniyor');
  const [deneme, setDeneme] = React.useState(0);
  const [islemdeki, setIslemdeki] = React.useState<string | null>(null);
  const [islemHatasi, setIslemHatasi] = React.useState<string | null>(null);
  const [sorgu, setSorgu] = React.useState('');
  const aramaKutusu = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!oturumHazir || kullaniciId) return;
    onGirisGerekli?.();
    /* `onGirisGerekli` bağımlılığa konmuyor: App her render'da yeni bir fonksiyon üretiyor. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oturumHazir, kullaniciId]);

  React.useEffect(() => {
    if (!kullaniciId) return;
    let iptal = false;
    setDurum('yukleniyor');
    baglantilarimiGetir(kullaniciId)
      .then((veri) => {
        if (iptal) return;
        setListe(veri);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [kullaniciId, deneme]);

  /*
    TEK EYLEM YOLU

    Kabul, ret, geri çekme ve kaldırma aynı kilit ve aynı hata dalından
    geçiyor. Ayrı işleyiciler olsaydı biri kilidi unutur, çift tıklama
    ikinci bir istek atardı. Liste sunucudan YENİDEN okunuyor: yerelde
    satır taşımak, sunucunun reddettiği bir işlemi olmuş gibi gösterirdi.
  */
  const eylemiCalistir = async (anahtar: string, eylem: () => Promise<void>) => {
    if (islemdeki) return;
    setIslemdeki(anahtar);
    setIslemHatasi(null);
    try {
      await eylem();
      setDeneme((sayi) => sayi + 1);
    } catch (sorun) {
      setIslemHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'İşlem tamamlanamadı. Bağlantılarında bir değişiklik olmadı.',
      );
    } finally {
      setIslemdeki(null);
    }
  };

  if (!oturumHazir) {
    return (
      <SayfaKabugu>
        <div aria-busy="true" className="space-y-2">
          <div aria-hidden className={`${KART} h-16 animate-pulse bg-gray-50`} />
          <div aria-hidden className={`${KART} h-16 animate-pulse bg-gray-50`} />
        </div>
      </SayfaKabugu>
    );
  }

  if (!kullaniciId) {
    return (
      <SayfaKabugu>
        <div className={`${KART} space-y-3 text-center`}>
          <h1 className="text-lg font-extrabold text-gray-900">Bağlantılar için giriş gerekiyor</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Bağlantı listesi yalnızca giriş yapmış kullanıcıya açık.
          </p>
          {onGirisGerekli && (
            <button type="button" onClick={onGirisGerekli} className={BIRINCIL_EYLEM}>
              Giriş yap
            </button>
          )}
        </div>
      </SayfaKabugu>
    );
  }

  const yenidenDene = () => setDeneme((sayi) => sayi + 1);

  /*
    BOŞ DURUM İKİ ÇIKIŞ YOLU VERİYOR

    "Henüz bağlantın yok." tek başına bir çıkmaz sokaktı. İki yol da
    gerçek: arama kutusu sayfanın üstünde duruyor, keşif ise kullanıcının
    KENDİ ALANINDAKİ yayımlanmış profilleri getiriyor — görünürlük
    kuralları sunucuda (`sosyal_kullanici_ara`), burada gevşetilmiyor.
  */
  const bosDurum = (
    <div className={`${KART} space-y-3 text-center`}>
      <p className="text-sm font-bold text-gray-900">İlk bağlantını kur</p>
      <p className="text-sm leading-relaxed text-gray-600">
        Bağlantı karşılıklı: iki taraf da kabul ettiğinde kuruluyor.
      </p>
      <button
        type="button"
        onClick={() => aramaKutusu.current?.focus()}
        className={BIRINCIL_EYLEM}
      >
        Öğrencileri keşfet
      </button>
    </div>
  );

  return (
    <SayfaKabugu>
      <div className="space-y-5">
{/*
          TEK BAŞLIK

          Sayfada üç başlık vardı: "Bağlantılar" (h1), altında aynı adlı
          bölüm başlığı, sonra "Gelen istekler" ve "Gönderilen istekler".
          Dördü de aynı ekranda, ikisi aynı kelimeyle. Altındaki
          açıklama paragrafı ("Bağlantı karşılıklı…") bir kural
          anlatıyordu, bir karar değil.

          İSTEK BÖLÜMLERİ DE KALKTI: gelen istekler bildirim zilinin
          altında yanıtlanıyor, gönderilen isteğin durumu kişinin
          profilinde duruyor ("İstek gönderildi" / "İsteği geri çek",
          bkz. BaglantiDugmesi). Bu sayfa artık tek bir şeyi gösteriyor:
          kurulmuş bağlantılar.
        */}
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          Bağlantılar
        </h1>

        {/*
          KİŞİ ARAMASI SAYFANIN KENDİ İÇİNDE

          Üst çubuktaki arama sosyal sayfalarda zaten kişi arıyor ama
          telefonda bir simgenin arkasında. Bağlantılar sayfasının asıl
          işi "kimi bulayım" olduğu için kutu burada açıkta duruyor.
          Sonuç listesi ÜST ÇUBUKTAKİYLE AYNI bileşen: iki yerde iki
          farklı arama davranışı olmasın.
        */}
        <label className="relative block">
          <span className="sr-only">Kişi ara</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            ref={aramaKutusu}
            type="search"
            value={sorgu}
            onChange={(e) => setSorgu(e.target.value)}
            placeholder="Kullanıcı adıyla ara"
            className={`h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 ${ODAK_HALKASI}`}
          />
        </label>
        {sorgu.trim().length > 0 && (
          <KullaniciAramaSonuclari sorgu={sorgu} onNavigate={onNavigate} onSecildi={() => setSorgu('')} />
        )}

        {islemHatasi && (
          <p role="alert" className="text-sm font-semibold leading-relaxed text-rose-700">
            {islemHatasi}
          </p>
        )}

        <Bolum
          durum={durum}
          satirlar={liste.kabul}
          bos={bosDurum}
          onYenidenDene={yenidenDene}
          satirCiz={(kisi) => (
            <BaglantiSatiri
              key={kisi.kisiId}
              kisi={kisi}
              onNavigate={onNavigate}
              eylemler={
                /* Kaldırma "⋯" menüsünde ve onaylı (BaglantiKaldirMenusu). */
                <BaglantiKaldirMenusu
                  ad={kisi.profil?.gorunenAd ?? (kisi.profil?.kullaniciAdi ? `@${kisi.profil.kullaniciAdi}` : 'Bu kişi')}
                  islemde={islemdeki === kisi.kisiId}
                  onKaldir={() => eylemiCalistir(kisi.kisiId, () => baglantiKaldir(kullaniciId, kisi.kisiId))}
                />
              }
            />
          )}
        />

      </div>
    </SayfaKabugu>
  );
};
