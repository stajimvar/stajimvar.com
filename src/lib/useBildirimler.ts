import React from 'react';
import {
  bildirimOkundu,
  bildirimleriGetir,
  okunmamisSayisi,
  tumBildirimlerOkundu,
  type Bildirim,
} from './bildirim';

/**
 * BİLDİRİM DURUMU — İKİ DÜNYADA TEK KAYNAK
 *
 * Bildirim KULLANICIYA ait, şirkete değil: aynı kişi öğrenci tarafına da
 * işveren paneline de geçse aynı listeyi görüyor. Bu yüzden durum tek
 * yerde duruyor ve iki kabuk da onu okuyor.
 *
 * REALTIME KULLANILMIYOR
 * ----------------------
 * Ölçüldü: projede hiçbir yerde Supabase Realtime aboneliği yok, yani
 * bunun için kanal yönetimi, yeniden bağlanma ve RLS'li kanal
 * yetkilendirmesi baştan kurulacaktı. Bildirim ikincil bir katman;
 * sırf rozetin birkaç saniye erken güncellenmesi için o altyapıyı
 * kurmak orantısız.
 *
 * Yerine üç doğal an: oturum açılışı, panelin açılması ve bir işlemden
 * sonra yenileme.
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

  const sayiyiTazele = React.useCallback(async () => {
    if (!kullaniciId) return;
    setOkunmamis(await okunmamisSayisi());
  }, [kullaniciId]);

  /* Oturum kapanınca sayaç da kapanıyor: eski kullanıcının sayısı kalmıyor. */
  React.useEffect(() => {
    if (!kullaniciId) {
      setBildirimler([]);
      setOkunmamis(null);
      setAcik(false);
      return;
    }
    void sayiyiTazele();
  }, [kullaniciId, sayiyiTazele]);

  const ac = React.useCallback(async () => {
    setAcik(true);
    setYukleniyor(true);
    const [liste] = await Promise.all([bildirimleriGetir(), sayiyiTazele()]);
    setBildirimler(liste);
    setYukleniyor(false);
  }, [sayiyiTazele]);

  const kapat = React.useCallback(() => setAcik(false), []);

  /*
    OKUNDU TIKLAMAYLA

    Panelde görünmek tek başına okundu saymıyor: kullanıcı listeye göz
    atıp kapattığında bildirimlerin sessizce silinmesi, gerçekten
    okumadığı bir şeyi okumuş saymak olurdu.
  */
  const okunduYap = React.useCallback(async (b: Bildirim) => {
    if (b.okunduMu) return;
    setBildirimler((o) => o.map((x) => (x.id === b.id ? { ...x, okunduMu: true } : x)));
    setOkunmamis((o) => (o === null ? o : Math.max(0, o - 1)));
    await bildirimOkundu(b.id);
  }, []);

  const tumunuOkunduYap = React.useCallback(async () => {
    setBildirimler((o) => o.map((x) => ({ ...x, okunduMu: true })));
    setOkunmamis(0);
    await tumBildirimlerOkundu();
  }, []);

  return {
    bildirimler,
    okunmamis,
    yukleniyor,
    acik,
    ac,
    kapat,
    okunduYap,
    tumunuOkunduYap,
    sayiyiTazele,
  };
}
