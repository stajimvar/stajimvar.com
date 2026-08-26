import React from 'react';
import { ArrowRight } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { RehberIzgarasi, RehberKarti, RehberKartiIskeleti } from './RehberKartlari';
import { YolHaritasi } from './YolHaritasi';
import { RehberSonuclari } from './RehberSonuclari';
import { REHBERLER, KONULAR, konuEtiketi, type KonuId, type Rehber } from '../data/rehberler';
import { BOLUMLER } from '../data/bolumler';
import { STAJ_PROGRAMLARI } from '../data/stajProgramlari';
import { KARIYER_MERKEZLERI } from '../data/kariyerMerkezleri';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import {
  enCokOkunanlar,
  kisisellestirilebilir,
  kisiyeGoreSirala,
  okunmaVerisiYeterli,
  sadelestir,
  yeniEklenenler,
} from '../lib/rehber-siralama.mjs';
import { gecmisiOku } from '../lib/rehber-gecmis.mjs';
import { birlesikArama } from '../lib/rehber-arama.mjs';
import { kaydedilenRehberler, okunmaSayilari, rehberKaydiDegistir } from '../lib/rehber-veri';
import type { StudentProfile } from '../types';

/**
 * Rehber merkezi.
 *
 * NE DEĞİŞTİ
 * ----------
 * Sayfa bir blog arşivi gibi açılıyordu: tam ekranlık bir tanıtım bloğu,
 * içinde ikinci bir arama kutusu, altında kare fotoğraf karolar. Ölçüldü —
 * masaüstünde kaydırmadan tek bir rehber BAŞLIĞI görünmüyordu; ilk ekranı
 * kaplayan şey siteyi tanıtan bir cümleydi, oysa oraya gelen kişi siteyi
 * zaten bulmuş.
 *
 * Şimdi ilk ekranda üç şey var: kullanıcının ne yapmak istediğini soran
 * kısa bir satır, dört hızlı işlem ve rehber kartları.
 *
 * ARAMA ÜST ÇUBUKTA
 * -----------------
 * Sayfanın kendi arama kutusu kaldırıldı. Üstte zaten bir arama alanı var
 * ve iki arama kutusunun aynı ekranda durması "hangisi neyi arıyor"
 * sorusunu doğuruyordu. Üstteki kutu bu sayfadayken rehberleri arıyor;
 * terim `arama` özelliğiyle buraya iniyor ve adreste `?q=` olarak duruyor.
 *
 * KİŞİSELLEŞTİRME İDDİA EDİLMİYOR
 * -------------------------------
 * "Sana özel seçilenler" başlığı yalnızca profilde gerçekten sıralamaya
 * yetecek veri varsa çıkıyor; yoksa "Öne çıkan rehberler" yazıyor. Yanlış
 * bir kişiselleştirme iddiası hiç kişiselleştirmemekten kötü — kullanıcı
 * listeye bakıp "beni yanlış tanımışlar" diyor.
 *
 * Kural ve puanlama src/lib/rehber-siralama.mjs içinde ve sınanıyor.
 * Hiçbir okul, bölüm, sınıf ya da kişi adı koda yazılmıyor: eşleşmeler
 * profil ALANLARI üzerinden çalışıyor.
 */

type Sekme = 'uygun' | 'tumu' | KonuId;

const Bolum: React.FC<{
  baslik: string;
  aciklama?: string;
  sag?: React.ReactNode;
  children: React.ReactNode;
}> = ({ baslik, aciklama, sag, children }) => (
  <section className="space-y-3">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="text-lg font-bold text-gray-900">{baslik}</h2>
      {sag}
    </div>
    {aciklama && <p className="-mt-1 text-xs leading-relaxed text-gray-600">{aciklama}</p>}
    {children}
  </section>
);

/* ------------------------------------------------------------------ merkez */

export const RehberMerkezi: React.FC<{
  onNavigate: (path: string) => void;
  ogrenci?: StudentProfile | null;
  /** Üst çubuktaki arama terimi. */
  arama?: string;
  /** Boş sonuç ekranındaki "temizle" bunu çağırıyor. */
  onAramaTemizle?: () => void;
  /** Kaydetme giriş istiyor; ziyaretçide giriş ekranını açıyor. */
  onGirisGerekli?: () => void;
}> = ({ onNavigate, ogrenci = null, arama = '', onAramaTemizle, onGirisGerekli }) => {
  React.useEffect(() => {
    document.title = 'Öğrenci rehberi | StajımVar';
  }, []);

  const kisisel = kisisellestirilebilir(ogrenci);
  const [sekme, setSekme] = React.useState<Sekme>(kisisel ? 'uygun' : 'tumu');

  /*
    Profil sonradan gelebiliyor (oturum çözülünce). Sekme o anda "tumu"da
    kalırsa kişiselleştirme hiç görünmüyor; kullanıcı elle bir sekme
    seçtiyse ona dokunulmuyor.
  */
  const [sekmeyeDokunuldu, setSekmeyeDokunuldu] = React.useState(false);
  React.useEffect(() => {
    if (!sekmeyeDokunuldu) setSekme(kisisel ? 'uygun' : 'tumu');
  }, [kisisel, sekmeyeDokunuldu]);

  const ogrenciRehberleri = React.useMemo(
    () => REHBERLER.filter((r) => r.kategori === 'ogrenci'),
    []
  );

  /* Yalnızca yazısı OLAN konular sekme oluyor: boş sekme, çalışmayan sekme. */
  const doluKonular = React.useMemo(
    () => KONULAR.filter((k) => ogrenciRehberleri.some((r) => r.konu === k.id)),
    [ogrenciRehberleri]
  );

  /* ---------------------------------------------------------- yan veriler */

  const [okunma, setOkunma] = React.useState<Record<string, number>>({});
  const [kayitlilar, setKayitlilar] = React.useState<Set<string>>(new Set());
  const [veriDurumu, setVeriDurumu] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [gecmis, setGecmis] = React.useState<{ slug: string; zaman: number }[]>([]);

  React.useEffect(() => {
    setGecmis(gecmisiOku());
  }, []);

  const veriYukle = React.useCallback(async () => {
    setVeriDurumu('yukleniyor');
    try {
      /*
        İki istek paralel. Kaydedilenler yalnızca giriş yapılmışsa
        isteniyor: ziyaretçi için boş bir sorgu atmanın anlamı yok.
      */
      const [sayilar, kayitli] = await Promise.all([
        okunmaSayilari(),
        ogrenci?.id ? kaydedilenRehberler(ogrenci.id).catch(() => []) : Promise.resolve([]),
      ]);
      setOkunma(sayilar);
      setKayitlilar(new Set(kayitli));
      setVeriDurumu('hazir');
    } catch {
      /* Konsola hata bırakmıyoruz; kullanıcıya görünür bir satır yazıyoruz. */
      setVeriDurumu('hata');
    }
  }, [ogrenci?.id]);

  React.useEffect(() => {
    void veriYukle();
  }, [veriYukle]);

  const kaydetmeDestekli = Boolean(ogrenci?.id) || Boolean(onGirisGerekli);

  const kaydet = React.useCallback(
    async (slug: string) => {
      if (!ogrenci?.id) {
        onGirisGerekli?.();
        return;
      }
      const kayitliydi = kayitlilar.has(slug);

      /* Önce ekranda değiştiriliyor: kaydetme geri bildirimi anında olmalı. */
      setKayitlilar((onceki) => {
        const yeni = new Set(onceki);
        if (kayitliydi) yeni.delete(slug);
        else yeni.add(slug);
        return yeni;
      });

      try {
        await rehberKaydiDegistir(ogrenci.id, slug, kayitliydi);
      } catch {
        /* Yazılamadıysa ekran gerçeğe dönüyor; sahte "kaydedildi" kalmıyor. */
        setKayitlilar((onceki) => {
          const yeni = new Set(onceki);
          if (kayitliydi) yeni.add(slug);
          else yeni.delete(slug);
          return yeni;
        });
      }
    },
    [ogrenci?.id, kayitlilar, onGirisGerekli]
  );

  /* ------------------------------------------------------------- süzgeçler */

  const terim = sadelestir(arama.trim());

  /*
    BİRLEŞİK ARAMA

    Arama yalnızca yazıların içinde geziyordu; "Aselsan" yazan kişi hiçbir
    sonuç alamıyor, "Marmara" yazan kendi okulunun kariyer merkezini
    bulamıyordu. Artık dört kaynakta birden arıyor: rehber yazıları, bölüm
    rehberleri, doğrulanmış işverenler ve kariyer merkezleri.

    Kural src/lib/rehber-arama.mjs içinde ve sınanıyor.
  */
  const aramaSonuclari = React.useMemo(
    () =>
      birlesikArama(arama, {
        rehberler: ogrenciRehberleri.map((r) => ({ ...r, konuAdi: konuEtiketi(r.konu) })),
        bolumler: BOLUMLER,
        isverenler: STAJ_PROGRAMLARI,
        merkezler: KARIYER_MERKEZLERI,
      }) as {
        aktif: boolean;
        toplam: number;
        rehberler: Rehber[];
        bolumler: { slug: string; ad: string; ozet?: string }[];
        isverenler: { slug: string; isveren: string; sektor?: string }[];
        merkezler: { universite: string; sehir?: string; url: string }[];
      },
    [arama, ogrenciRehberleri]
  );

  const sonuclar = React.useMemo(() => {
    if (terim) return aramaSonuclari.rehberler;

    const liste = ogrenciRehberleri;
    if (sekme === 'uygun' && kisisel) return kisiyeGoreSirala(liste, ogrenci) as Rehber[];
    if (sekme !== 'tumu' && sekme !== 'uygun') return liste.filter((r) => r.konu === sekme);
    return liste;
  }, [terim, aramaSonuclari, sekme, kisisel, ogrenci, ogrenciRehberleri]);

  /* Bölümlü görünüm yalnızca varsayılan ekranda; süzgeç varken tek liste. */
  const suzuluyor = Boolean(terim) || (sekme !== 'tumu' && sekme !== 'uygun');

  const seciliOlanlar = React.useMemo(() => {
    if (kisisel) return (kisiyeGoreSirala(ogrenciRehberleri, ogrenci) as Rehber[]).slice(0, 6);
    const oneCikan = ogrenciRehberleri.filter((r) => r.oneCikan);
    return (oneCikan.length ? oneCikan : ogrenciRehberleri).slice(0, 6);
  }, [kisisel, ogrenci, ogrenciRehberleri]);

  /* Geçmiş yalnızca hâlâ var olan yazılara işaret ediyorsa gösteriliyor. */
  const devamEdilecekler = React.useMemo(
    () =>
      gecmis
        .map((k) => ogrenciRehberleri.find((r) => r.slug === k.slug))
        .filter((r): r is Rehber => Boolean(r))
        .slice(0, 3),
    [gecmis, ogrenciRehberleri]
  );

  const populer = React.useMemo(
    () =>
      okunmaVerisiYeterli(okunma)
        ? (enCokOkunanlar(ogrenciRehberleri, okunma, 3) as Rehber[])
        : [],
    [okunma, ogrenciRehberleri]
  );

  const yeniler = React.useMemo(
    () => yeniEklenenler(ogrenciRehberleri, 3) as Rehber[],
    [ogrenciRehberleri]
  );

  /* --------------------------------------------------------------- sekmeler */

  const sekmeSec = (id: Sekme) => {
    setSekmeyeDokunuldu(true);
    setSekme(id);
    if (arama) onAramaTemizle?.();
  };

  /*
    KONU SEÇİCİ LİSTENİN BAŞINDA

    Hızlı işlemler yedi konudan dördünü kapsıyor; yurt, üniversite hayatı
    ve yurtdışı rehberlerine de bir yol gerekiyor. Ekranın üstüne ikinci
    bir düğme satırı koymak yerine tek bir seçici, tam da kullanıldığı
    yerde: listenin başlığının yanında. Seçili konuyu da gösteriyor, yani
    "hangi süzgeç açık" sorusunun cevabı kontrolün kendisinde.
  */
  const KonuSecici = (
    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
      <span className="sr-only">Konuya göre süz</span>
      <select
        value={terim ? '' : sekme === 'uygun' ? 'tumu' : sekme}
        onChange={(e) => sekmeSec((e.target.value || 'tumu') as Sekme)}
        className="min-h-11 cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-blue-600"
      >
        <option value="tumu">Tüm konular</option>
        {doluKonular.map((k) => (
          <option key={k.id} value={k.id}>
            {k.etiket}
          </option>
        ))}
      </select>
    </label>
  );

  const kartOzellikleri = (r: Rehber) => ({
    rehber: r,
    onNavigate,
    kayitli: kayitlilar.has(r.slug),
    onKaydet: kaydetmeDestekli ? kaydet : undefined,
    kaydetmeEtiketi: ogrenci?.id ? undefined : 'Kaydetmek için giriş yap',
  });

  return (
    <SayfaKabugu icerikGenisligi={SAYFA_GENISLIGI}>
      <div className="space-y-6">
        {/*
          SAYFANIN İLK BÖLÜMÜ

          Burada önce "Kariyer yolculuğunda sıradaki adım ne?" başlığı ve
          dört seçenek kartı vardı. İkisi de aynı işi yapıyordu: kullanıcıyı
          bir konuya götürmek. Üst üste iki "ne yapmak istiyorsun?" bloğu
          ilk ekranı doldurup asıl içeriği aşağı itiyordu; kişiselleştirilmiş
          bölüm kartı ekranın dışında kalıyordu.

          Konu süzme yolu kaybolmadı: liste başlığının yanındaki konu
          seçici yedi konunun hepsini veriyor.

          Üst boşluk SayfaKabugu'ndan geliyor (py-6 sm:py-8) — mobilde 24,
          masaüstünde 32 piksel.
        */}
        <YolHaritasi onNavigate={onNavigate} ogrenci={ogrenci} />

        {/*
          Açıklama yalnızca gerçekten kişiselleştirme yapılabiliyorsa.
          Veri yoksa satır hiç çizilmiyor — "senin için seçtik" demek için
          kişi hakkında bir şey bilmek gerekiyor.
        */}
        {kisisel && !suzuluyor && (
          <p className="-mt-3 text-xs text-gray-600">
            Eğitim bilgilerine göre senin için öne çıkardık.
          </p>
        )}

        {veriDurumu === 'hata' && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            Kaydettiklerin ve okunma sayıları yüklenemedi. Rehberler açılıyor.
            <button
              type="button"
              onClick={() => void veriYukle()}
              className="cursor-pointer font-bold underline"
            >
              Yeniden dene
            </button>
          </p>
        )}

        {/* ================================================== içerikler */}
        {terim && aramaSonuclari.toplam > 0 ? (
          <RehberSonuclari
            sonuclar={aramaSonuclari}
            onNavigate={onNavigate}
            kartOzellikleri={kartOzellikleri}
          />
        ) : sonuclar.length === 0 ? (
          <section className="space-y-3 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="font-bold text-gray-900">
              {terim
                ? `“${arama.trim()}” için sonuç bulunamadı`
                : 'Bu konuda henüz rehber yok'}
            </p>
            <p className="text-sm text-gray-600">
              Rehberlerde, bölümlerde, işverenlerde ve kariyer merkezlerinde arandı. Süzgeçleri
              kaldırıp tüm rehberlere göz atabilirsin.
            </p>
            <button
              type="button"
              onClick={() => {
                setSekmeyeDokunuldu(true);
                setSekme('tumu');
                onAramaTemizle?.();
              }}
              className="min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
            >
              Filtreleri temizle
            </button>
          </section>
        ) : suzuluyor ? (
          <Bolum
            baslik={terim ? 'Arama sonuçları' : konuEtiketi(sekme as KonuId)}
            sag={
              <span className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{sonuclar.length} yazı</span>
                {KonuSecici}
              </span>
            }
          >
            <RehberIzgarasi>
              {sonuclar.map((r) => (
                <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
              ))}
            </RehberIzgarasi>
          </Bolum>
        ) : (
          <>
            <Bolum baslik={kisisel ? 'Sana özel seçilenler' : 'Öne çıkan rehberler'}>
              <RehberIzgarasi>
                {seciliOlanlar.map((r) => (
                  <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                ))}
              </RehberIzgarasi>
            </Bolum>

            {/* Yalnızca gerçekten okuma geçmişi olana gösteriliyor. */}
            {devamEdilecekler.length > 0 && (
              <Bolum baslik="Kaldığın yerden devam et">
                <RehberIzgarasi>
                  {devamEdilecekler.map((r) => (
                    <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                  ))}
                </RehberIzgarasi>
              </Bolum>
            )}

            {/*
              Okunma sayıları gerçek: uydurma bir popülerlik sıralaması
              göstermektense bölüm hiç çizilmiyor. Sayım yüklenirken
              iskelet duruyor.
            */}
            {veriDurumu === 'yukleniyor' ? (
              <Bolum baslik="En çok okunanlar">
                <RehberIzgarasi>
                  <RehberKartiIskeleti />
                  <RehberKartiIskeleti />
                  <RehberKartiIskeleti />
                </RehberIzgarasi>
              </Bolum>
            ) : (
              populer.length > 0 && (
                <Bolum baslik="En çok okunanlar">
                  <RehberIzgarasi>
                    {populer.map((r) => (
                      <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                    ))}
                  </RehberIzgarasi>
                </Bolum>
              )
            )}

            {yeniler.length > 0 && (
              <Bolum baslik="Yeni eklenenler">
                <RehberIzgarasi>
                  {yeniler.map((r) => (
                    <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                  ))}
                </RehberIzgarasi>
              </Bolum>
            )}

            <Bolum
              baslik="Tüm rehberler"
              sag={
                <span className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{sonuclar.length} yazı</span>
                  {KonuSecici}
                </span>
              }
            >
              <RehberIzgarasi>
                {sonuclar.map((r) => (
                  <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                ))}
              </RehberIzgarasi>
            </Bolum>
          </>
        )}

        <a
          href="/isveren"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            onNavigate('/isveren');
          }}
          className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm transition-colors hover:border-blue-300"
        >
          <span>
            <b className="block font-bold text-gray-900">Şirketler için rehber</b>
            <span className="text-gray-600">Stajyer nasıl alınır: sigorta, ücret, evrak</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-gray-500" />
        </a>

        <p className="max-w-2xl text-xs leading-relaxed text-gray-600">
          Rehberlerde yıldan yıla değişen oran ve tutarlar yazılmıyor; mekanizma anlatılıp güncel
          rakam için resmî kaynağa yönlendiriliyor. Eksik veya hatalı gördüğün bir şey olursa bize
          yaz.
        </p>
      </div>
    </SayfaKabugu>
  );
};

export { RehberKarti } from './RehberKartlari';
