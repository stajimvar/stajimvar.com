/**
 * KAMPÜSÜM — veri katmanı (göç 20261108010000)
 *
 * Tek RPC: `kampusum()`. Bakan öğrencinin okulunu SUNUCU çözüyor; istemci
 * üniversite kimliği göndermiyor, tabloları doğrudan okuyamıyor. Böylece
 * panel kendi profilinde de başkasının profilinde de bakan kişinin okulunu
 * gösteriyor ve başkasının okul bilgisini sızdırmıyor.
 *
 * Veri resmî kaynaklardan zamanlanmış işle geliyor
 * (`automation/kampus_verisi.py`, `.github/workflows/kampus-verisi.yml`).
 */

import { supabase } from '../supabase';

const db = supabase as unknown as { rpc: (ad: string, argumanlar: Record<string, unknown>) => any };

/**
 * 'gunluk': kaynak öğün adı vermiyor (ör. MSGSÜ aylık PDF'i). Arayüz o
 * durumda "Öğle" demiyor, "Günün menüsü" diyor.
 */
export type Ogun = 'ogle' | 'aksam' | 'gunluk';

export interface KampusOgunu {
  ogun: Ogun;
  yemekler: string[];
  kalori: number | null;
}

export interface KampusMenusu {
  /** Menünün tarihi — her zaman `bugun` ile aynı (sunucu başka gün vermiyor). */
  tarih: string;
  /** Menünün yayımlandığı resmî belge — "Ayın menüsünü gör". */
  kaynakUrl: string;
  cekildiAni: string;
  ogunler: KampusOgunu[];
}

export interface KaynakDurumu {
  sonKontrolAni: string | null;
  sonBasariAni: string | null;
}

export interface KampusDuyurusu {
  baslik: string;
  tarih: string;
  url: string;
}

export interface Kampusum {
  /** İstanbul'a göre bugün (YYYY-MM-DD). */
  bugun: string;
  /** Profildeki okul (ham). null → "Üniversiteni ekle". */
  ogrenciOkulu: string | null;
  /** Doğrulanmış katalog kaydı. null → bu okul için resmî kaynak henüz yok. */
  universite: {
    id: string;
    ad: string;
    alanAdi: string;
    yemekhaneSayfasi: string | null;
    duyurularSayfasi: string | null;
  } | null;
  /** Bugünün menüsü; yoksa null (yayımlanmamış ya da hafta sonu). */
  menu: KampusMenusu | null;
  /**
   * Bugüne kadarki son menünün tarihi (YYYY-MM-DD); hiç yoksa null.
   * Eski sunucu yanıtında alan yoksa `undefined` — 7 gün kuralı uygulanmıyor.
   */
  sonMenuTarihi?: string | null;
  /** Yemek kaynağı tanımlı değilse null. */
  menuKaynagi: KaynakDurumu | null;
  /** Son 30 günün en yeni 4 duyurusu. */
  duyurular: KampusDuyurusu[];
  duyuruKaynagi: KaynakDurumu | null;
}

function kaynak(k: any): KaynakDurumu | null {
  if (!k) return null;
  return { sonKontrolAni: k.son_kontrol_at ?? null, sonBasariAni: k.son_basari_at ?? null };
}

/**
 * Panel verisi. Oturum yoksa ya da çağrı başarısızsa HATA fırlatıyor;
 * çağıran "yüklenemedi" durumunu çiziyor — boş veri "kaynak yok" ile
 * karışmasın.
 */
export async function kampusumuGetir(): Promise<Kampusum> {
  const { data, error } = await db.rpc('kampusum', {});
  if (error || !data) throw new Error(error?.message ?? 'kampus-verisi-yok');
  return kampusCoz(data);
}

/** Başkasının kampüsü: cevap kimin kampüsü olduğunu da söylüyor. */
export interface KisininKampusu extends Kampusum {
  kisi: { kullaniciAdi: string; ad: string | null };
}

/**
 * Bir kullanıcı adının kampüsü (göç 20261110010000, `kampus_profil`).
 *
 * Kapı profildeki okul bilgisinin kapısıyla aynı: profil yoksa, sana
 * görünmüyorsa ya da okul boşsa sunucu NULL dönüyor ve burada `null`
 * oluyor — var/yok ayrımı yapılmıyor. Çağrı hatası ise ayrı: fırlatılıyor,
 * "yüklenemedi" ile "okul görünmüyor" karışmasın.
 */
export async function kampusProfiliGetir(kullaniciAdi: string): Promise<KisininKampusu | null> {
  const { data, error } = await db.rpc('kampus_profil', { p_kullanici_adi: kullaniciAdi });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const k = data as any;
  return {
    ...kampusCoz(k),
    kisi: { kullaniciAdi: k.kisi?.kullanici_adi ?? kullaniciAdi, ad: k.kisi?.ad ?? null },
  };
}

function kampusCoz(k: any): Kampusum {
  return {
    bugun: k.bugun,
    ogrenciOkulu: k.ogrenci_okulu ?? null,
    universite: k.universite
      ? {
          id: k.universite.id,
          ad: k.universite.ad,
          alanAdi: k.universite.alan_adi,
          yemekhaneSayfasi: k.universite.yemekhane_sayfasi ?? null,
          duyurularSayfasi: k.universite.duyurular_sayfasi ?? null,
        }
      : null,
    menu: k.menu
      ? {
          tarih: k.menu.tarih,
          kaynakUrl: k.menu.kaynak_url,
          cekildiAni: k.menu.cekildi_at,
          ogunler: (k.menu.ogunler ?? []).map((o: any) => ({
            ogun: o.ogun,
            yemekler: o.yemekler ?? [],
            kalori: o.kalori ?? null,
          })),
        }
      : null,
    sonMenuTarihi: 'son_menu_tarihi' in k ? (k.son_menu_tarihi ?? null) : undefined,
    menuKaynagi: kaynak(k.menu_kaynagi),
    duyurular: (k.duyurular ?? []).map((d: any) => ({ baslik: d.baslik, tarih: d.tarih, url: d.url })),
    duyuruKaynagi: kaynak(k.duyuru_kaynagi),
  };
}
