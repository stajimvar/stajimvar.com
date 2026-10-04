import React from 'react';
import {
  bildirimOkundu,
  bildirimSil,
  bildirimleriDinle,
  bildirimleriGetir,
  okunmamisSayisi,
  tumBildirimlerOkundu,
  type Bildirim,
} from './bildirim';

/*
  Arka arkaya gelen olaylar tek tazelemede birleşiyor. Bir başvuru
  şirketin her üyesine aynı işlemde bildirim yazıyor ve okundu/tümü
  okundu güncellemeleri de olay üretiyor; her olay için ayrı sayım
  isteği atmak aynı sonucu birkaç kez okumak olurdu. 300 ms rozet için
  fark edilmiyor, aynı işlemden gelen olay kümesini ise topluyor.
*/
const BIRLESTIRME_MS = 300;

/**
 * BİLDİRİM DURUMU — İKİ DÜNYADA TEK KAYNAK
 *
 * Bildirim KULLANICIYA ait, şirkete değil: aynı kişi öğrenci tarafına da
 * işveren paneline de geçse aynı listeyi görüyor. Bu yüzden durum tek
 * yerde duruyor ve iki kabuk da onu okuyor.
 *
 * REALTIME YALNIZ "BİR ŞEY DEĞİŞTİ" SİNYALİ
 * ----------------------------------------
 * Önceden kanca Realtime kullanmıyordu; sayaç yalnız oturum açılışında ve
 * panel açılınca okunuyordu. Sonuç: Başvuranlar ekranı açık duran bir
 * şirket, yeni başvurunun bildirimini sayfayı yenileyene kadar görmüyordu.
 * Artık `bildirimleriDinle` (lib/bildirim.ts) ile kullanıcının kendi
 * bildirim satırlarına abone olunuyor.
 *
 * Olay yükü KULLANILMIYOR: her olayda okunmamış sayısı (panel açıksa
 * liste de) SUNUCUDAN yeniden okunuyor. Olaydan sayaç artırılsaydı aynı
 * bildirim hem olaydan hem bir sonraki yeniden okumadan sayılıp çift
 * görünebilirdi; kopukken yazılan bildirimin olayı ise hiç gelmez ve
 * sayaç sonsuza dek eksik kalırdı. Sunucu sayısı her iki durumda doğru.
 *
 * Realtime tek başına yetmiyor: dizüstü uykudan ya da ağ kopmasından
 * döndüğünde kanal geç bağlanabiliyor. Sekme görünür olduğunda ve
 * tarayıcı `online` dediğinde de aynı tazeleme yapılıyor.
 *
 * YANIT YARIŞI
 * ------------
 * Tazelemeler üst üste binebiliyor (olay + görünürlük + panel açılışı).
 * Daha eski bir istek daha geç dönerse yeni sonucun üstüne yazmasın diye
 * her istek bir sıra numarası alıyor; yalnız sonuncunun yanıtı uygulanıyor.
 *
 * Silme bu sıraya ek bir süzgeç getiriyor: silme sürerken yola çıkmış bir
 * liste okuması, sunucu satırı silmeden ÖNCE okunmuş olabilir ve geç
 * dönünce silinen bildirimi geri getirirdi. Onaylanmış silmelerin
 * kimlikleri oturum boyunca tutuluyor ve her liste yanıtı bu kümeden
 * süzülüyor. Silme ayrıca bir Realtime olayı beklemiyor: süzgeçli
 * aboneliklerde (`recipient_id=eq.`) Supabase DELETE olayını iletmiyor;
 * öteki sekme listeyi görünür olduğunda zaten yeniden okuyor.
 * Okundu işaretlemesi SAYI sırasını da ilerletiyor: işaretlemeden önce
 * başlamış bir sayım, iyimser düşüşü eski sayıyla ezmesin. Liste sırası
 * ilerletilmiyor; ilerletilseydi panel açılırken yoldaki liste isteği
 * atılır ve yükleniyor durumu Realtime kopuksa hiç kapanmazdı.
 */
export function useBildirimler(kullaniciId: string | null) {
  const [bildirimler, setBildirimler] = React.useState<Bildirim[]>([]);
  /*
    `null` = HENÜZ BİLİNMİYOR. Rozet bu değerde çizilmiyor; önce 0 gösterip
    sonra 3'e zıplamak rozetin güvenilirliğini bitiriyor.
  */
  const [okunmamis, setOkunmamis] = React.useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const [acik, setAcik] = React.useState(false);

  /*
    Olay dinleyicisi kapanışta `acik` durumunu eski değeriyle görürdü;
    panelin şu an açık olup olmadığını ref'ten okuyor.
  */
  const acikRef = React.useRef(false);
  const sayiSirasi = React.useRef(0);
  const listeSirasi = React.useRef(0);
  /* Sunucunun silindiğini onayladığı kimlikler; oturum değişince boşalıyor. */
  const silinenler = React.useRef(new Set<string>());
  /*
    Yoldaki silmeler. Aynı satıra ikinci dokunuş ikinci DELETE atmasın
    diye aynı söz geri veriliyor: ikinci çağıran da ilk isteğin sonucunu
    (başarı ya da hata) bekliyor, "0 satır silindi" diye yanlış bir ikinci
    yanıt almıyor.
  */
  const yoldakiSilmeler = React.useRef(new Map<string, Promise<void>>());
  /*
    Silme yanıtı oturum değiştikten sonra dönerse sayaç yeni kullanıcının
    rozetinden düşmesin diye silmenin hangi oturumda başladığına bakılıyor.
  */
  const oturum = React.useRef(kullaniciId);
  oturum.current = kullaniciId;

  const sayiyiTazele = React.useCallback(async () => {
    if (!kullaniciId) return;
    const sira = ++sayiSirasi.current;
    const sayi = await okunmamisSayisi();
    if (sira !== sayiSirasi.current) return;
    setOkunmamis(sayi);
  }, [kullaniciId]);

  const listeyiTazele = React.useCallback(async () => {
    if (!kullaniciId) return;
    const sira = ++listeSirasi.current;
    const liste = (await bildirimleriGetir()).filter((b) => !silinenler.current.has(b.id));
    if (sira !== listeSirasi.current) return;
    setBildirimler(liste);
    setYukleniyor(false);
  }, [kullaniciId]);

  /* Oturum kapanınca sayaç da kapanıyor: eski kullanıcının sayısı kalmıyor. */
  React.useEffect(() => {
    if (!kullaniciId) {
      setBildirimler([]);
      setOkunmamis(null);
      setAcik(false);
      acikRef.current = false;
      return;
    }
    void sayiyiTazele();
  }, [kullaniciId, sayiyiTazele]);

  /*
    ABONELİK OTURUMA BAĞLI

    Kullanıcı değişince (çıkış, başka hesapla giriş) temizlik çalışıyor:
    kanal kapanıyor, dinleyiciler sökülüyor, bekleyen birleştirme
    zamanlayıcısı iptal ediliyor ve sıra numaraları ilerletiliyor. Böylece
    eski kullanıcının yolda olan olayı ya da geç dönen yanıtı yeni
    kullanıcının rozetine yazılamıyor.
  */
  React.useEffect(() => {
    if (!kullaniciId) return;
    let kapandi = false;
    let zamanlayici: ReturnType<typeof setTimeout> | null = null;

    const tazele = () => {
      if (kapandi) return;
      if (zamanlayici) clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => {
        zamanlayici = null;
        if (kapandi) return;
        void sayiyiTazele();
        if (acikRef.current) void listeyiTazele();
      }, BIRLESTIRME_MS);
    };

    const aboneligiKapat = bildirimleriDinle(kullaniciId, { degisti: tazele, baglandi: tazele });

    const gorunurlukDegisti = () => {
      if (document.visibilityState === 'visible') tazele();
    };
    document.addEventListener('visibilitychange', gorunurlukDegisti);
    window.addEventListener('online', tazele);

    return () => {
      kapandi = true;
      if (zamanlayici) clearTimeout(zamanlayici);
      aboneligiKapat();
      document.removeEventListener('visibilitychange', gorunurlukDegisti);
      window.removeEventListener('online', tazele);
      sayiSirasi.current += 1;
      listeSirasi.current += 1;
      silinenler.current.clear();
      yoldakiSilmeler.current.clear();
    };
  }, [kullaniciId, sayiyiTazele, listeyiTazele]);

  const ac = React.useCallback(async () => {
    setAcik(true);
    acikRef.current = true;
    setYukleniyor(true);
    await Promise.all([listeyiTazele(), sayiyiTazele()]);
  }, [listeyiTazele, sayiyiTazele]);

  const kapat = React.useCallback(() => {
    setAcik(false);
    acikRef.current = false;
  }, []);

  /*
    OKUNDU TIKLAMAYLA

    Panelde görünmek tek başına okundu saymıyor: kullanıcı listeye göz
    atıp kapattığında bildirimlerin sessizce silinmesi, gerçekten
    okumadığı bir şeyi okumuş saymak olurdu.

    Yazım bitince sunucudaki `read_at` güncellemesi bir Realtime olayı
    üretiyor ve sayı oradan yeniden okunuyor; iyimser düşüş yalnız o
    arayı dolduruyor.
  */
  const okunduYap = React.useCallback(async (b: Bildirim) => {
    if (b.okunduMu) return;
    sayiSirasi.current += 1;
    setBildirimler((o) => o.map((x) => (x.id === b.id ? { ...x, okunduMu: true } : x)));
    setOkunmamis((o) => (o === null ? o : Math.max(0, o - 1)));
    await bildirimOkundu(b.id);
  }, []);

  const tumunuOkunduYap = React.useCallback(async () => {
    sayiSirasi.current += 1;
    setBildirimler((o) => o.map((x) => ({ ...x, okunduMu: true })));
    setOkunmamis(0);
    await tumBildirimlerOkundu();
  }, []);

  /*
    TEK BİLDİRİMİ SİL — İYİMSER DEĞİL

    Satır sunucu onaylayana kadar listede kalıyor. İyimser silmede ağ
    hatası, kullanıcının "gitti" diye gördüğü bildirimin sayfa
    yenilenince geri gelmesi demekti; silmenin yapılıp yapılmadığını
    ekrana bakarak bilemezdi. Hata İSTİSNA olarak çağırana geçiyor:
    panel satırı yerinde bırakıp hatayı söylüyor.

    `bildirimSil` `false` dönerse satır sunucuda zaten yoktu (başka
    sekmede silinmiş): satır yine çıkıyor ama yerel bilgi bayat demek,
    liste ve sayı sunucudan yeniden okunuyor.

    Okunmamış bir bildirim silindiyse sayı hemen 1 düşüyor ve ardından
    sunucudan okunuyor; sıra ilerletildiği için silmeden önce yola
    çıkmış bir sayım bu düşüşü eski sayıyla ezemiyor (okunduYap'la aynı).
  */
  const sil = React.useCallback(
    (b: Bildirim): Promise<void> => {
      const yoldaki = yoldakiSilmeler.current.get(b.id);
      if (yoldaki) return yoldaki;
      const baslangic = oturum.current;
      const istek = (async () => {
        try {
          const silindi = await bildirimSil(b.id);
          if (oturum.current !== baslangic) return;
          silinenler.current.add(b.id);
          setBildirimler((o) => o.filter((x) => x.id !== b.id));
          if (silindi) {
            if (!b.okunduMu) {
              sayiSirasi.current += 1;
              setOkunmamis((o) => (o === null ? o : Math.max(0, o - 1)));
            }
            void sayiyiTazele();
          } else {
            void listeyiTazele();
            void sayiyiTazele();
          }
        } finally {
          yoldakiSilmeler.current.delete(b.id);
        }
      })();
      yoldakiSilmeler.current.set(b.id, istek);
      return istek;
    },
    [listeyiTazele, sayiyiTazele],
  );

  return {
    bildirimler,
    okunmamis,
    yukleniyor,
    acik,
    ac,
    kapat,
    okunduYap,
    tumunuOkunduYap,
    sil,
    sayiyiTazele,
  };
}
