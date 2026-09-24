import React from 'react';
import { MessageCircle } from 'lucide-react';
import { BIRINCIL_EYLEM } from '../../lib/renk-token';
import { kendiSosyalProfiliGetir } from '../../lib/queries/sosyal';
import type { SohbetKutusu } from '../../lib/queries/mesajlasma';
import { SayfaKabugu } from '../SayfaKabugu';
import { kullaniciAdiNormalize } from '../../lib/sosyal-kullanici-adi.mjs';
import { mesajKutusu } from '../../lib/mesaj-ekrani.mjs';
import { SohbetListesi } from './SohbetListesi';
import { SohbetEkrani } from './SohbetEkrani';
import { useMesajSayaclari } from './mesajDinleme';

/**
 * /mesajlar · /mesajlar?kutu=istekler · /mesajlar/:kullaniciadi
 *
 * Kullanıcı kararları (24 Eylül 2026): herkes yazabilir, bağlantı
 * olmayanın mesajı alıcının "Mesaj istekleri" kutusuna düşer; şimdilik
 * yalnız öğrenciler; yalnız metin.
 *
 * DÜZEN (X / Instagram web)
 * -------------------------
 *   lg ve üstü   iki bölme: solda liste (360 piksel), sağda sohbet; sohbet
 *                seçilmemişse sağda boş durum
 *   lg altı      tek bölme: liste YA DA sohbet; sohbetten listeye geri
 *                düğmesiyle
 * Bölmeler geniş ekranda sabit yükseklikte ve kendi içinde kayıyor: liste
 * uzasa da yazma kutusu ekranın altında kalıyor.
 *
 * YÜKSEKLİK HESABI: üst çubuk 60 piksel (sm'de 72), kabuğun üst boşluğu
 * sm'de 24, alt boşluğu telefonda 120 (yüzen alt gezinme çubuğu) ve lg'de
 * 40 piksel. Sohbet bölmesi bunları düşüp kalan görünümü dolduruyor; sayfa
 * ayrıca kaymıyor ve yazma kutusu alt çubuğun üstünde duruyor.
 *
 * YETKİ: oturum yoksa giriş kartı ve mevcut giriş akışı. Oturum sahibinin
 * kendi sosyal satırı yoksa ya da şirket hesabıysa (`sirketId` dolu)
 * mesajlaşma ekranı açılmıyor, sebebi yazılı. Asıl kapı sunucuda
 * ('yalniz-ogrenciler'); burası yalnız boş bir ekran göstermiyor.
 */

export type MesajRotasi = { liste: true } | { kullaniciAdi: string };

const KART = 'rounded-2xl border border-gray-200 bg-white p-4 sm:p-5';

export const MesajlarSayfasi: React.FC<{
  kullaniciId: string | null;
  oturumHazir: boolean;
  rota: MesajRotasi;
  onNavigate: (yol: string) => void;
  onGirisGerekli?: () => void;
}> = ({ kullaniciId, oturumHazir, rota, onNavigate, onGirisGerekli }) => {
  const [uygunluk, setUygunluk] = React.useState<'yukleniyor' | 'ogrenci' | 'degil' | 'hata'>('yukleniyor');
  const [deneme, setDeneme] = React.useState(0);
  const [tazele, setTazele] = React.useState(0);
  /*
    KUTU SORGUDAN (`?kutu=istekler`), HER ÇİZİMDE: App'in rota durumu
    yalnız yolu tutuyor ve `/mesajlar` ile `/mesajlar?kutu=istekler` aynı
    yol — sekme değişince App yeniden çizmiyor. Sayfa bu yüzden kendi
    gezinmesinden ve geri/ileri tuşundan (`popstate`) sonra kendini
    yeniden çiziyor ve kutuyu adresten okuyor.
  */
  const [, yenidenCiz] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    window.addEventListener('popstate', yenidenCiz);
    return () => window.removeEventListener('popstate', yenidenCiz);
  }, []);
  const gez = (yol: string) => {
    onNavigate(yol);
    yenidenCiz();
  };
  const sayac = useMesajSayaclari(uygunluk === 'ogrenci');

  React.useEffect(() => {
    if (!oturumHazir || kullaniciId) return;
    onGirisGerekli?.();
    /* `onGirisGerekli` bağımlılığa konmuyor: App her çizimde yeni fonksiyon üretiyor. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oturumHazir, kullaniciId]);

  React.useEffect(() => {
    if (!kullaniciId) return;
    let iptal = false;
    setUygunluk('yukleniyor');
    kendiSosyalProfiliGetir(kullaniciId)
      .then((satir) => {
        if (iptal) return;
        setUygunluk(satir && !satir.sirketId ? 'ogrenci' : 'degil');
      })
      .catch(() => {
        if (!iptal) setUygunluk('hata');
      });
    return () => {
      iptal = true;
    };
  }, [kullaniciId, deneme]);

  const kabuk = (icerik: React.ReactNode) => (
    <SayfaKabugu icerikGenisligi="max-w-[1100px]" mobilKenarsiz ustBosluk="pt-0 sm:pt-6">
      {icerik}
    </SayfaKabugu>
  );

  if (!oturumHazir || (kullaniciId && uygunluk === 'yukleniyor')) {
    return kabuk(
      <div aria-busy="true" className="space-y-3 p-4 sm:p-0">
        <span aria-hidden className="block h-16 animate-pulse rounded-2xl bg-gray-100" />
        <span aria-hidden className="block h-16 animate-pulse rounded-2xl bg-gray-100" />
      </div>,
    );
  }

  if (!kullaniciId) {
    return kabuk(
      <div className={`${KART} mx-4 space-y-3 text-center sm:mx-0`}>
        <h1 className="text-lg font-extrabold text-gray-900">Mesajlar için giriş gerekiyor</h1>
        <p className="text-sm leading-relaxed text-gray-600">Mesajların yalnızca giriş yapmış kullanıcıya açık.</p>
        {onGirisGerekli && (
          <button type="button" onClick={onGirisGerekli} className={BIRINCIL_EYLEM}>
            Giriş yap
          </button>
        )}
      </div>,
    );
  }

  if (uygunluk === 'hata') {
    return kabuk(
      <div role="alert" className={`${KART} mx-4 space-y-3 sm:mx-0`}>
        <p className="text-sm font-bold text-gray-900">Mesajlar açılamadı.</p>
        <p className="text-sm text-gray-600">Sunucudan cevap gelmedi. Yeniden deneyebilirsin.</p>
        <button type="button" onClick={() => setDeneme((n) => n + 1)} className={BIRINCIL_EYLEM}>
          Yeniden dene
        </button>
      </div>,
    );
  }

  if (uygunluk === 'degil') {
    return kabuk(
      <div className={`${KART} mx-4 space-y-2 sm:mx-0`}>
        <h1 className="text-lg font-extrabold text-gray-900">Mesajlar</h1>
        <p className="text-sm leading-relaxed text-gray-700">Mesajlaşma şimdilik yalnız öğrenciler arasında açık.</p>
      </div>,
    );
  }

  const sohbetAcik = 'kullaniciAdi' in rota;
  /* Adresteki ad yalnız bir GİRDİ: profil rotasındaki gibi normalleştiriliyor, yetki kararı buradan verilmiyor. */
  const kullaniciAdi = sohbetAcik ? kullaniciAdiNormalize(rota.kullaniciAdi) : null;
  const kutu: SohbetKutusu = mesajKutusu(window.location.search);
  /*
    Sohbet ekranındaki değişiklik (gönderim, kabul, silme, okundu) listeyi
    tazeliyor. Rozetler aynı değişikliği yerel olaydan alıyor
    (`yerelDegisiklikBildir`); liste onu ayrıca dinlemiyor — iki yol olsaydı
    her değişiklikte liste iki kez okunurdu.
  */
  const tazelet = () => setTazele((n) => n + 1);

  return kabuk(
    <div className="bg-white lg:grid lg:h-[calc(100dvh-136px)] lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden sm:rounded-2xl sm:border sm:border-gray-200">
      {/*
        LİSTE: dar ekranda sohbet açıkken çizilmiyor (tek bölme); geniş
        ekranda her zaman solda. Seçili sohbetin satırı vurgulu.
      */}
      <section
        aria-label="Sohbetler"
        className={`${sohbetAcik ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col lg:border-r lg:border-gray-200`}
      >
        <SohbetListesi
          kutu={kutu}
          seciliKullaniciAdi={kullaniciAdi}
          bekleyenIstek={sayac ? sayac.bekleyenIstek : null}
          tazele={tazele}
          onNavigate={gez}
        />
      </section>

      {/*
        SOHBET: dar ekranda yalnız sohbet açıkken, görünümün kalanını
        dolduran sabit yükseklikte (yukarıdaki hesap).
      */}
      <section
        aria-label="Sohbet"
        className={`${
          sohbetAcik ? 'flex' : 'hidden lg:flex'
        } h-[calc(100dvh-180px-env(safe-area-inset-bottom))] min-h-0 flex-col sm:h-[calc(100dvh-216px-env(safe-area-inset-bottom))] lg:h-auto`}
      >
        {kullaniciAdi ? (
          <SohbetEkrani
            key={kullaniciAdi}
            benId={kullaniciId}
            kullaniciAdi={kullaniciAdi}
            onNavigate={gez}
            onDegisti={tazelet}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <MessageCircle aria-hidden className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-bold text-gray-900">Bir sohbet seç</p>
            <p className="max-w-xs text-sm leading-relaxed text-gray-600">
              Soldaki listeden bir sohbet aç ya da bir öğrencinin profilinde "Mesaj"a bas.
            </p>
          </div>
        )}
      </section>
    </div>,
  );
};
