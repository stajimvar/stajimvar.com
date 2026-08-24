/**
 * Sayfa üst bilgilerini (başlık, canonical, paylaşım etiketleri) günceller.
 *
 * NEDEN GEREKİYOR
 * ---------------
 * Sayfalar sunucuda ön render ediliyor ve doğrudan açıldıklarında doğru
 * canonical ile geliyor. Ama uygulama içinde gezinildiğinde — ana sayfadan
 * bir ilana tıklandığında — yalnızca `document.title` değişiyordu; canonical
 * ve og etiketleri ANA SAYFAYI göstermeye devam ediyordu.
 *
 * Ölçüldü: ana sayfadan ilana geçildiğinde başlık ilanın başlığı oluyor ama
 * `link[rel=canonical]` ve `og:url` hâlâ "https://stajimvar.com/" idi.
 *
 * Bunun iki somut sonucu var. Sayfayı o hâliyle paylaşan kişi ana sayfanın
 * kartını gönderiyor. JavaScript çalıştıran tarayıcılar (arama motorları
 * dahil) sayfayı ana sayfanın kopyası sayabiliyor.
 *
 * ESKİ DEĞER GERİ YÜKLENİYOR
 * --------------------------
 * Fonksiyon bir temizleme işlevi döndürüyor: bileşen kaldırıldığında
 * etiketler eski hâline dönüyor. Aksi hâlde canonical'ı ayarlamayan bir
 * sayfaya geçildiğinde önceki sayfanın adresi orada kalırdı — hatanın aynısı,
 * sadece yönü ters.
 */

const SITE = 'https://stajimvar.com';

type MetaAyari = {
  baslik: string;
  /** Arama sonucunda ve paylaşımda görünen özet. Verilmezse mevcut değer korunur. */
  aciklama?: string;
  /** Sayfanın kendi yolu; verilmezse tarayıcının bulunduğu yol kullanılır. */
  yol?: string;
  /** Paylaşım görseli; ilana/kuruma özel kart üretildiğinde kullanılacak. */
  gorsel?: string;
};

/** Etiketi bulur, yoksa oluşturur. Dönen değer eski içeriktir. */
function etiketiAyarla(secici: string, olustur: () => HTMLElement, oku: (e: HTMLElement) => string | null, yaz: (e: HTMLElement, d: string) => void, deger: string) {
  let etiket = document.head.querySelector<HTMLElement>(secici);
  if (!etiket) {
    etiket = olustur();
    document.head.appendChild(etiket);
  }
  const eski = oku(etiket);
  yaz(etiket, deger);
  return { etiket, eski };
}

export function sayfaMetaAyarla({ baslik, aciklama, yol, gorsel }: MetaAyari): () => void {
  const adres = `${SITE}${yol ?? window.location.pathname}`;
  const geriAlmalar: Array<() => void> = [];

  const eskiBaslik = document.title;
  document.title = baslik;
  geriAlmalar.push(() => {
    document.title = eskiBaslik;
  });

  const canonical = etiketiAyarla(
    'link[rel="canonical"]',
    () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
    (e) => e.getAttribute('href'),
    (e, d) => e.setAttribute('href', d),
    adres,
  );
  geriAlmalar.push(() => {
    if (canonical.eski) canonical.etiket.setAttribute('href', canonical.eski);
  });

  const metalar: Array<[string, string]> = [
    ['og:url', adres],
    ['og:title', baslik],
    ...(aciklama ? ([['og:description', aciklama]] as Array<[string, string]>) : []),
    ...(gorsel ? ([['og:image', gorsel]] as Array<[string, string]>) : []),
  ];

  for (const [ad, deger] of metalar) {
    const m = etiketiAyarla(
      `meta[property="${ad}"]`,
      () => {
        const e = document.createElement('meta');
        e.setAttribute('property', ad);
        return e;
      },
      (e) => e.getAttribute('content'),
      (e, d) => e.setAttribute('content', d),
      deger,
    );
    geriAlmalar.push(() => {
      if (m.eski) m.etiket.setAttribute('content', m.eski);
    });
  }

  /*
    Arama sonucundaki açıklama <meta name="description"> etiketinden
    okunuyor; og:description onun yerine geçmiyor.
  */
  if (aciklama) {
    const d = etiketiAyarla(
      'meta[name="description"]',
      () => {
        const e = document.createElement('meta');
        e.setAttribute('name', 'description');
        return e;
      },
      (e) => e.getAttribute('content'),
      (e, x) => e.setAttribute('content', x),
      aciklama,
    );
    geriAlmalar.push(() => {
      if (d.eski) d.etiket.setAttribute('content', d.eski);
    });
  }

  return () => {
    for (const geri of geriAlmalar.reverse()) geri();
  };
}
