/**
 * Eksik varlık adresine gerçek 404 döndürür.
 *
 * SORUN
 * -----
 * SPA yedeği (`/* -> /index.html 200`) her yolu yakalıyor; silinmiş bir
 * `/assets/index-ABC.css` adresi de uygulama kabuğunu 200 ve `text/html`
 * olarak döndürüyordu. İki zararı ölçüldü:
 *
 *   1. Tarayıcı bu yanlış cevabı KENDİ önbelleğine yazıyor. O andan sonra
 *      aynı adres önbellekten hep text/html geliyor ve sayfa stilsiz kalıyor;
 *      sıradan bir yenileme de aynı bozuk kaydı okuduğu için düzelmiyor.
 *      (Tarayıcıda doğrulandı: aynı adres normal istekte text/html,
 *      cache:'reload' ile text/css dönüyordu.)
 *   2. Bir varlığın "yok" olduğu, ancak yüklenemeyince anlaşılıyordu.
 *
 * NEDEN _redirects DEĞİL DE FONKSİYON
 * -----------------------------------
 * `_redirects` içine "/assets/* -> 404" kuralı yazmak iki kez denendi ve ters
 * teptı (ayrıntısı public/_redirects başındaki notta): hedef 404.html olunca
 * Pages o dosyayı BÜTÜN bulunamayan yollar için kullanıyor ve SPA yedeğini
 * eziyor — ön render edilmeyen uygulama adresleri açılamaz oluyor.
 *
 * Fonksiyon yalnızca /assets/ altını kapsıyor, uygulama yollarına
 * dokunmuyor. Var olan dosyalar zaten statik varlık olarak sunuluyor ve bu
 * koda hiç uğramıyor; buraya düşen istek, karşılığı olmayan istektir.
 *
 * Cevap `no-store`: "bulunamadı" bilgisi önbelleğe yazılmamalı, çünkü dosya
 * bir sonraki dağıtımda geri gelebilir.
 */
export const onRequest: PagesFunction = async ({ next }) => {
  const cevap = await next();
  const tur = cevap.headers.get('content-type') || '';

  if (cevap.status === 200 && tur.includes('text/html')) {
    return new Response('Bu varlık bulunamadı.', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  return cevap;
};
