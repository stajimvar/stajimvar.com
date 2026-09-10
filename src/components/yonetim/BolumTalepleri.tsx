import React from 'react';
import {
  SosyalHata,
  bekleyenBolumTalepleri,
  bolumTalebiniKararaBagla,
  bolumleriGetir,
  sektorleriGetir,
  type BolumTalepSatiri,
  type SosyalBolum,
  type SosyalSektor,
} from '../../lib/queries/sosyal';
import { tarihMetni } from '../../lib/tarih.mjs';

/**
 * BÖLÜM TALEP KUYRUĞU — ASGARİ YÖNETİM EKRANI
 *
 * Depodaki yönetim ekranı kalıbının aynısı (AdminClaimsView): tek kart
 * listesi, satır içi karar, `onToast` ile geri bildirim. Yeni bir panel
 * mimarisi kurulmadı; bu akış için gereken tek şey bir kuyruk.
 *
 * SERBEST METİN GİRDİYE KOPYALANMIYOR
 * -----------------------------------
 * Kullanıcının yazdığı bölüm adı yalnız OKUNUR gösteriliyor. Bir girdi
 * kutusuna önceden doldurulsaydı kuyruğu kapatmanın en kolay yolu onu
 * olduğu gibi onaylamak olurdu; oysa `departments.ad` her zaman
 * yöneticinin açık seçimi olmalı. Kural yalnız burada değil, karar
 * RPC'sinin imzasında da var: fonksiyon serbest metin parametresi
 * almıyor.
 *
 * KABUL İKİ KAPALI LİSTEDEN SEÇİM İSTİYOR
 * ---------------------------------------
 * Bölüm `departments`, alan `sectors` listesinden. İkisi de seçilmeden
 * kabul gönderilmiyor; sunucu da aynı şeyi `secim-zorunlu` ile söylüyor.
 * Eşleme zaten varsa ve başka bir alana bakıyorsa sunucu reddediyor —
 * alan değiştirmek bilinçli ve ayrı bir işlem, kuyruktan yapılmıyor.
 *
 * İKİ METİN, İKİ AYRI OKUYUCU
 * ---------------------------
 * Karar iki metin istiyor ve ikisi de zorunlu:
 *
 *   Yönetim notu      denetim tablosuna gidiyor (`bolum_talep_denetim`),
 *                     kullanıcıya hiçbir yerde gösterilmiyor. Notsuz bir
 *                     karar, sonradan "bu neden böyle oldu" sorusunu
 *                     cevapsız bırakırdı.
 *   Kullanıcı açıklaması  talebi açan kişinin satırına yazılıyor ve
 *                     kendi ekranında okunuyor. Bu olmadan kullanıcı
 *                     yalnız "reddedildi" görür, sebebini hiç öğrenmezdi.
 *
 * İki alanın AYRI olması bir kolaylık değil sınırın kendisi: tek kutu
 * olsaydı yönetici iç notu yazarken onu kullanıcının okuyacağını
 * unutabilirdi. Etiketler de bu yüzden kimin okuyacağını açıkça söylüyor.
 * Sunucu ikisini ayrı kodlarla ('gerekce-zorunlu' / 'aciklama-zorunlu')
 * istiyor; buradaki iki ayrı hata cümlesi o ayrımı tekrarlamıyor, ona
 * uyuyor.
 *
 * BU EKRAN YETKİ VERMİYOR
 * -----------------------
 * Kuyruğu görmek `is_admin()` politikasına bağlı; yetkisiz biri adresi
 * bilse bile liste boş döner ve karar RPC'si 42501 verir. Buradaki rota
 * kapısı bir kolaylık, güvenlik sınırı değil.
 */

interface BolumTalepleriProps {
  onToast: (mesaj: string) => void;
}

type Durum = 'yukleniyor' | 'hazir' | 'hata';
type KararKipi = 'kabul' | 'ret';

const KART = 'rounded-2xl border border-gray-200 bg-white p-4 space-y-3';
const SECIM =
  'w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
const DUGME =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-bold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

export const BolumTalepleri: React.FC<BolumTalepleriProps> = ({ onToast }) => {
  const [talepler, setTalepler] = React.useState<BolumTalepSatiri[]>([]);
  const [durum, setDurum] = React.useState<Durum>('yukleniyor');
  const [deneme, setDeneme] = React.useState(0);

  const [bolumler, setBolumler] = React.useState<SosyalBolum[]>([]);
  const [alanlar, setAlanlar] = React.useState<SosyalSektor[]>([]);
  const [listeDurumu, setListeDurumu] = React.useState<Durum>('yukleniyor');

  /* Açık olan karar formu; aynı anda tek talep üzerinde çalışılıyor. */
  const [acikTalep, setAcikTalep] = React.useState<string | null>(null);
  const [kip, setKip] = React.useState<KararKipi>('kabul');
  const [seciliBolum, setSeciliBolum] = React.useState('');
  const [seciliAlan, setSeciliAlan] = React.useState('');
  const [gerekce, setGerekce] = React.useState('');
  /* Kullanıcının okuyacağı cümle; iç nottan AYRI bir durum. */
  const [kullaniciAciklamasi, setKullaniciAciklamasi] = React.useState('');
  const [gonderildi, setGonderildi] = React.useState(false);
  const [islemde, setIslemde] = React.useState(false);

  React.useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    bekleyenBolumTalepleri()
      .then((liste) => {
        if (iptal) return;
        setTalepler(liste);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [deneme]);

  React.useEffect(() => {
    let iptal = false;
    setListeDurumu('yukleniyor');
    Promise.all([bolumleriGetir(), sektorleriGetir()])
      .then(([bolumListesi, alanListesi]) => {
        if (iptal) return;
        setBolumler(bolumListesi);
        setAlanlar(alanListesi);
        setListeDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setListeDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, []);

  const formuKapat = () => {
    setAcikTalep(null);
    setSeciliBolum('');
    setSeciliAlan('');
    setGerekce('');
    setKullaniciAciklamasi('');
    setGonderildi(false);
  };

  const formuAc = (talepId: string, yeniKip: KararKipi) => {
    formuKapat();
    setAcikTalep(talepId);
    setKip(yeniKip);
  };

  /* Eşik sunucudaki kontrolün aynısı (`length(btrim(...)) < 5`). */
  const gerekceHatasi =
    gerekce.trim().length < 5 ? 'Yönetim notu zorunlu (en az 5 karakter).' : null;
  const kullaniciAciklamasiHatasi =
    kullaniciAciklamasi.trim().length < 5
      ? 'Kullanıcıya gösterilecek açıklama zorunlu (en az 5 karakter).'
      : null;
  const secimHatasi =
    kip === 'kabul' && (!seciliBolum || !seciliAlan)
      ? 'Bölüm ve alan seçilmeden kabul edilemiyor.'
      : null;

  const gonder = async (talepId: string) => {
    setGonderildi(true);
    if (gerekceHatasi || kullaniciAciklamasiHatasi || secimHatasi || islemde) return;

    setIslemde(true);
    try {
      await bolumTalebiniKararaBagla({
        talepId,
        karar: kip === 'kabul' ? 'eklendi' : 'reddedildi',
        /* Ret kararında seçim gönderilmiyor: karar bir eşleme kurmuyor. */
        bolumId: kip === 'kabul' ? seciliBolum : null,
        alanId: kip === 'kabul' ? seciliAlan : null,
        gerekce: gerekce.trim(),
        kararAciklamasi: kullaniciAciklamasi.trim(),
      });
      onToast(kip === 'kabul' ? 'Talep kabul edildi.' : 'Talep reddedildi.');
      formuKapat();
      /* Kuyruk sunucudan yeniden okunuyor: yerelde satır düşürmek, sunucunun
         reddettiği bir kararı olmuş gibi gösterirdi. */
      setDeneme((sayi) => sayi + 1);
    } catch (sorun) {
      onToast(
        sorun instanceof SosyalHata ? sorun.message : 'Karar kaydedilemedi. Yeniden dene.',
      );
    } finally {
      setIslemde(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
        <h1 className="text-lg font-bold text-gray-900">Bölüm talepleri</h1>
        <p className="text-xs text-gray-500 mt-1">
          Kullanıcının yazdığı metin yalnızca bir açıklama; kataloğa eklenecek bölüm ve alan
          aşağıdaki kapalı listelerden seçiliyor. Her karar iki metin istiyor: denetim kaydına
          giden yönetim notu ve talebi açan kişinin okuyacağı açıklama.
        </p>
      </div>

      {listeDurumu === 'hata' && (
        <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Bölüm ve alan listeleri alınamadı. Liste gelmeden kabul kararı verilemiyor.
        </p>
      )}

      {durum === 'yukleniyor' && (
        <div
          className="h-24 rounded-2xl bg-gray-100 animate-pulse"
          role="status"
          aria-label="Yükleniyor"
        />
      )}

      {durum === 'hata' && (
        <div className="bg-white rounded-2xl border border-rose-200 p-5 text-center space-y-2">
          <p className="font-bold text-rose-800">Talepler alınamadı</p>
          <p className="text-sm text-gray-600">Kuyrukta bir değişiklik olmadı.</p>
          <button
            type="button"
            onClick={() => setDeneme((sayi) => sayi + 1)}
            className={`${DUGME} bg-blue-600 text-white hover:bg-blue-700`}
          >
            Tekrar dene
          </button>
        </div>
      )}

      {durum === 'hazir' && talepler.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Bekleyen bölüm talebi yok.</p>
        </div>
      )}

      {durum === 'hazir' &&
        talepler.map((talep) => {
          const acik = acikTalep === talep.id;
          const tarih = tarihMetni(talep.olusturmaAni);
          return (
            <div key={talep.id} className={KART}>
              <dl className="space-y-1.5 text-sm">
                {talep.yazilanBolum && (
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="font-bold text-gray-900">Yazdığı bölüm</dt>
                    {/* Yalnız okunur: bir girdi kutusuna kopyalanmıyor. */}
                    <dd className="min-w-0 break-words text-gray-700">{talep.yazilanBolum}</dd>
                  </div>
                )}
                {talep.bolumAdi && (
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="font-bold text-gray-900">Katalogdaki bölümü</dt>
                    <dd className="min-w-0 break-words text-gray-700">{talep.bolumAdi}</dd>
                  </div>
                )}
                {talep.universite && (
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="font-bold text-gray-900">Üniversite</dt>
                    <dd className="min-w-0 break-words text-gray-700">{talep.universite}</dd>
                  </div>
                )}
                {talep.aciklama && (
                  <div className="space-y-0.5">
                    <dt className="font-bold text-gray-900">Açıklama</dt>
                    <dd className="whitespace-pre-line break-words text-gray-700">
                      {talep.aciklama}
                    </dd>
                  </div>
                )}
                {tarih && (
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="font-bold text-gray-900">Tarih</dt>
                    <dd className="text-gray-700">{tarih}</dd>
                  </div>
                )}
              </dl>

              {!acik && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => formuAc(talep.id, 'kabul')}
                    className={`${DUGME} bg-emerald-600 text-white hover:bg-emerald-700`}
                  >
                    Kabul et
                  </button>
                  <button
                    type="button"
                    onClick={() => formuAc(talep.id, 'ret')}
                    className={`${DUGME} border border-gray-200 bg-white text-gray-800 hover:bg-gray-50`}
                  >
                    Reddet
                  </button>
                </div>
              )}

              {acik && (
                <div className="space-y-3 border-t border-gray-100 pt-3">
                  {kip === 'kabul' && (
                    <>
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`bolum-secimi-${talep.id}`}
                          className="block text-sm font-bold text-gray-900"
                        >
                          Kataloğa bağlanacak bölüm
                        </label>
                        <select
                          id={`bolum-secimi-${talep.id}`}
                          value={seciliBolum}
                          disabled={listeDurumu !== 'hazir'}
                          onChange={(olay) => setSeciliBolum(olay.target.value)}
                          className={SECIM}
                        >
                          <option value="">Seç</option>
                          {bolumler.map((bolum) => (
                            <option key={bolum.id} value={bolum.id}>
                              {bolum.ad}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor={`alan-secimi-${talep.id}`}
                          className="block text-sm font-bold text-gray-900"
                        >
                          Bağlanacağı alan
                        </label>
                        <select
                          id={`alan-secimi-${talep.id}`}
                          value={seciliAlan}
                          disabled={listeDurumu !== 'hazir'}
                          onChange={(olay) => setSeciliAlan(olay.target.value)}
                          className={SECIM}
                        >
                          <option value="">Seç</option>
                          {alanlar.map((alan) => (
                            <option key={alan.id} value={alan.id}>
                              {alan.ad}
                            </option>
                          ))}
                        </select>
                      </div>

                      {gonderildi && secimHatasi && (
                        <p role="alert" className="text-xs font-semibold text-rose-700">
                          {secimHatasi}
                        </p>
                      )}
                    </>
                  )}

                  {/*
                    İÇ NOT — ETİKET KİMİN OKUMAYACAĞINI SÖYLÜYOR

                    "Gerekçe" tek başına belirsizdi: yönetici bu kutuya
                    kullanıcıya seslenen bir cümle yazabilirdi ve o cümle
                    hiç kimseye ulaşmazdı. Etiket artık kutunun nereye
                    gittiğini söylüyor.
                  */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`gerekce-${talep.id}`}
                      className="block text-sm font-bold text-gray-900"
                    >
                      Yönetim notu (kullanıcıya gösterilmez)
                    </label>
                    <textarea
                      id={`gerekce-${talep.id}`}
                      rows={2}
                      value={gerekce}
                      maxLength={500}
                      onChange={(olay) => setGerekce(olay.target.value)}
                      aria-describedby={`gerekce-yardim-${talep.id}`}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                    <p id={`gerekce-yardim-${talep.id}`} className="text-xs text-gray-500">
                      Denetim kaydına yazılıyor; yalnız yöneticiler okuyor.
                    </p>
                    {gonderildi && gerekceHatasi && (
                      <p role="alert" className="text-xs font-semibold text-rose-700">
                        {gerekceHatasi}
                      </p>
                    )}
                  </div>

                  {/*
                    KULLANICIYA GİDEN CÜMLE

                    Ayrı bir kutu, çünkü ayrı bir okuyucusu var. Zorunlu
                    olması ürün kararı: kullanıcının yalnız "reddedildi"
                    görüp sebebini hiç öğrenmemesi bu aşamada kapatıldı.
                  */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`kullanici-aciklamasi-${talep.id}`}
                      className="block text-sm font-bold text-gray-900"
                    >
                      Kullanıcıya gösterilecek açıklama
                    </label>
                    <textarea
                      id={`kullanici-aciklamasi-${talep.id}`}
                      rows={2}
                      value={kullaniciAciklamasi}
                      maxLength={500}
                      onChange={(olay) => setKullaniciAciklamasi(olay.target.value)}
                      aria-describedby={`kullanici-aciklamasi-yardim-${talep.id}`}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                    <p
                      id={`kullanici-aciklamasi-yardim-${talep.id}`}
                      className="text-xs text-gray-500"
                    >
                      Talebi açan kişi bunu kendi ekranında okuyacak.
                    </p>
                    {gonderildi && kullaniciAciklamasiHatasi && (
                      <p role="alert" className="text-xs font-semibold text-rose-700">
                        {kullaniciAciklamasiHatasi}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={islemde}
                      onClick={() => gonder(talep.id)}
                      className={
                        kip === 'kabul'
                          ? `${DUGME} bg-emerald-600 text-white hover:bg-emerald-700`
                          : `${DUGME} bg-rose-600 text-white hover:bg-rose-700`
                      }
                    >
                      {islemde
                        ? 'Gönderiliyor…'
                        : kip === 'kabul'
                          ? 'Kabulü kaydet'
                          : 'Reddi kaydet'}
                    </button>
                    <button
                      type="button"
                      disabled={islemde}
                      onClick={formuKapat}
                      className={`${DUGME} border border-gray-200 bg-white text-gray-800 hover:bg-gray-50`}
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};
