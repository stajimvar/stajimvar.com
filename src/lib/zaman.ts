/**
 * İlanın listeye eklenme zamanını okunur hale getirir.
 *
 * "eklendi" kelimesi bilinçli. Elimizdeki tarih `posted_at ?? created_at`:
 * şirket kendi ilanını girdiyse yayın tarihi, biz kariyer sayfasından
 * topladıysak sisteme aldığımız an. İkincisinde "yayınlandı" demek, şirket
 * adına bilmediğimiz bir şey iddia etmek olurdu — "eklendi" her iki durumda
 * da doğru.
 */

const GUN_MS = 24 * 60 * 60 * 1000;

export function eklenmeMetni(deger: string | null | undefined): string | null {
  if (!deger) return null;

  const ms = new Date(deger).getTime();
  if (Number.isNaN(ms)) return null;

  const fark = Date.now() - ms;

  /* Saat farkı veya küçük sapmalar yüzünden gelecek görünen tarihler. */
  if (fark < 0) return 'bugün eklendi';

  const gun = Math.floor(fark / GUN_MS);
  if (gun === 0) return 'bugün eklendi';
  if (gun === 1) return 'dün eklendi';
  if (gun < 7) return `${gun} gün önce eklendi`;
  if (gun < 30) {
    const hafta = Math.floor(gun / 7);
    return `${hafta} hafta önce eklendi`;
  }
  if (gun < 365) {
    const ay = Math.floor(gun / 30);
    return `${ay} ay önce eklendi`;
  }
  return new Date(ms).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
