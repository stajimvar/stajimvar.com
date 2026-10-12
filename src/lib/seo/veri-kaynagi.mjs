/**
 * ZORUNLU VERİ OKUMASI — "OKUNAMADI" İLE "BOŞ" AYRI ŞEYLER (12 Ekim 2026)
 *
 * SORUN
 * -----
 * `scripts/onrender.mjs` ilanları, fırsatları ve şirketleri okurken anahtar
 * yoksa, HTTP hatası alırsa ya da yanıt bozuksa sessizce `[]` dönüyordu.
 * Derleme bunu "yayında hiç ilan yok" diye okuyordu: ilan sayfaları, şirket
 * sayfaları ve site haritası eksik üretiliyor, dağıtım yeşil geçiyordu.
 *
 * ÇÖZÜM
 * -----
 * Meşru boş sonuç (`200` + `[]`) geçerli bir sonuç olarak dönüyor. Bunun
 * dışındaki her durum türü belli bir `VeriKaynagiHatasi` fırlatıyor ve
 * derleme duruyor. Hata mesajı kaynağın adını, HTTP durumunu ve türünü
 * söylüyor; anahtar, tam adres ya da yanıt gövdesi YAZDIRILMIYOR.
 *
 * Geçici hatalar (5xx, ağ, zaman aşımı) bir kez yeniden deneniyor.
 */

export class VeriKaynagiHatasi extends Error {
  /**
   * @param {string} kaynak  okunan şeyin adı ("yayındaki ilanlar")
   * @param {'yapilandirma'|'yetki'|'istemci'|'sunucu'|'zaman-asimi'|'ag'|'bozuk-yanit'} tur
   * @param {string} ayrinti insan için açıklama (sır içermez)
   * @param {number|null} durum HTTP durum kodu
   */
  constructor(kaynak, tur, ayrinti, durum = null) {
    super(`${kaynak} okunamadı [${tur}${durum ? ` HTTP ${durum}` : ''}]: ${ayrinti}`);
    this.name = 'VeriKaynagiHatasi';
    this.kaynak = kaynak;
    this.tur = tur;
    this.durum = durum;
  }
}

const GECICI = new Set(['sunucu', 'zaman-asimi', 'ag']);

function siniflandir(kaynak, durum) {
  if (durum === 401 || durum === 403) {
    return new VeriKaynagiHatasi(kaynak, 'yetki', 'anahtar reddedildi ya da satır politikası okumayı kapattı', durum);
  }
  if (durum >= 500) return new VeriKaynagiHatasi(kaynak, 'sunucu', 'veritabanı geçici olarak yanıt vermedi', durum);
  return new VeriKaynagiHatasi(kaynak, 'istemci', 'sorgu reddedildi (sütun adı ya da süzgeç hatalı olabilir)', durum);
}

/**
 * @param {object} o
 * @param {string} o.kaynak      insan için ad
 * @param {string|undefined} o.taban  Supabase adresi
 * @param {string|undefined} o.anahtar anonim anahtar
 * @param {string} o.yol         "/rest/v1/listings?..." ya da "/rest/v1/rpc/..."
 * @param {'GET'|'POST'} [o.yontem]
 * @param {unknown} [o.govde]
 * @param {(v: unknown) => boolean} [o.dogrula]  yanıt biçimi kontrolü (varsayılan: dizi)
 * @param {number} [o.zamanAsimiMs]
 * @param {number} [o.deneme]
 * @param {typeof fetch} [o.getir]  test için enjekte edilebilir
 */
export async function zorunluVeriGetir({
  kaynak,
  taban,
  anahtar,
  yol,
  yontem = 'GET',
  govde,
  dogrula = Array.isArray,
  zamanAsimiMs = 20000,
  deneme = 2,
  getir = globalThis.fetch,
}) {
  if (!taban || !anahtar) {
    throw new VeriKaynagiHatasi(
      kaynak,
      'yapilandirma',
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tanımlı değil (worktree içinde .env yoktur)',
    );
  }
  let sonHata = null;
  for (let tur = 1; tur <= deneme; tur++) {
    const kesici = new AbortController();
    const sayac = setTimeout(() => kesici.abort(), zamanAsimiMs);
    try {
      let yanit;
      try {
        yanit = await getir(`${String(taban).replace(/\/+$/, '')}${yol}`, {
          method: yontem,
          headers: {
            apikey: anahtar,
            Authorization: `Bearer ${anahtar}`,
            ...(govde !== undefined ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(govde !== undefined ? { body: JSON.stringify(govde) } : {}),
          signal: kesici.signal,
        });
      } catch (e) {
        throw e?.name === 'AbortError'
          ? new VeriKaynagiHatasi(kaynak, 'zaman-asimi', `${zamanAsimiMs} ms içinde yanıt gelmedi`)
          : new VeriKaynagiHatasi(kaynak, 'ag', 'bağlantı kurulamadı');
      }
      if (!yanit.ok) throw siniflandir(kaynak, yanit.status);
      let veri;
      try {
        veri = await yanit.json();
      } catch {
        throw new VeriKaynagiHatasi(kaynak, 'bozuk-yanit', 'yanıt JSON değil', yanit.status);
      }
      if (!dogrula(veri)) {
        throw new VeriKaynagiHatasi(kaynak, 'bozuk-yanit', 'yanıt beklenen biçimde değil', yanit.status);
      }
      return veri;
    } catch (hata) {
      sonHata = hata instanceof VeriKaynagiHatasi ? hata : new VeriKaynagiHatasi(kaynak, 'ag', 'beklenmeyen hata');
      if (!GECICI.has(sonHata.tur) || tur === deneme) throw sonHata;
    } finally {
      clearTimeout(sayac);
    }
  }
  throw sonHata;
}

/**
 * BEKLENMEYEN BÜYÜK AZALMA KAPISI
 *
 * Meşru boş/az sonuç ile eksik okumayı ayırmanın ikinci katmanı: bu
 * derlemenin saydığı ilan sayısı bir önceki BAŞARILI yayının sayısıyla
 * karşılaştırılıyor. Gerçek kapanışlar olağan: kapı yalnız hem oranca hem
 * adetçe büyük düşüşte duruyor. Gerçekten toplu kapanış olduysa derleme
 * `ONRENDER_AZALMA_ONAYI=1` ile bilerek geçirilebiliyor.
 *
 * @returns {{ gecti: boolean, mesaj: string }}
 */
export function azalmaKapisi({ onceki, simdi, oranEsigi = 0.4, adetEsigi = 25, onay = false }) {
  if (!Number.isFinite(onceki) || onceki <= 0) {
    return { gecti: true, mesaj: 'önceki yayın sayısı yok; karşılaştırma atlandı' };
  }
  const dusus = onceki - simdi;
  const oran = dusus / onceki;
  if (dusus >= adetEsigi && oran >= oranEsigi) {
    if (onay) return { gecti: true, mesaj: `${onceki} → ${simdi} düşüş ONAYLA geçirildi` };
    return {
      gecti: false,
      mesaj:
        `yayındaki ilan sayısı ${onceki} → ${simdi} düştü (%${Math.round(oran * 100)}). ` +
        'Veri eksik okunmuş olabilir. Toplu kapanış gerçekse ONRENDER_AZALMA_ONAYI=1 ile yeniden derle.',
    };
  }
  return { gecti: true, mesaj: `${onceki} → ${simdi}` };
}
