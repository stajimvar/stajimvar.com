/**
 * MESAJLAŞMA — veri katmanı (20261107010000)
 *
 * Kullanıcı kararları (24 Eylül 2026): herkes yazabilir, bağlantı
 * olmayanın mesajı alıcının "Mesaj istekleri" kutusuna düşer; yalnız
 * öğrenciler; yalnız metin.
 *
 * YAZMA YALNIZ RPC'DEN: tablolarda istemciye yazma yetkisi yok. Bu dosya
 * da tabloya `insert/update/delete` göndermiyor; göndermeye kalksa sunucu
 * 42501 döner. Okuma iki yoldan: liste ve sayaçlar RPC'den (okundu
 * gizliliği sunucuda hesaplanıyor), mesajların kendisi tablodan (RLS).
 *
 * ANLIK GELME: Supabase Realtime `postgres_changes`. Olaylar abonenin
 * RLS'inden geçiyor; yani burada kimin hangi olayı alacağına dair ek bir
 * süzgeç YAZILMIYOR — üye olmadığın sohbetin olayı zaten gelmiyor.
 */

import { supabase } from '../supabase';
import { SosyalHata } from './sosyal';

/* `sosyal.ts`deki dar erişimin aynısı: şema tipleri henüz üretilmedi. */
interface MesajIstemci {
  from: (tablo: string) => any;
  rpc: (ad: string, argumanlar: Record<string, unknown>) => any;
}
const db = supabase as unknown as MesajIstemci;

/** Sunucudaki `metin` kısıtının istemci tarafı. */
export const MESAJ_EN_UZUN = 2000;
/** Kabul edilmemiş istekte başlatanın yazabileceği mesaj sayısı (sunucuda 3). */
export const ISTEK_MESAJ_SINIRI = 3;

export type SohbetDurumu = 'istek' | 'acik';
export type SohbetKutusu = 'gelen' | 'istekler';

export interface SohbetOzeti {
  sohbetId: string;
  karsiId: string;
  karsiKullaniciAdi: string | null;
  karsiGorunenAd: string | null;
  /** Depolama YOLU (sosyal-avatar); `ProfilFotografi` ile çizilir. */
  karsiAvatarYolu: string | null;
  karsiResmiMi: boolean;
  durum: SohbetDurumu;
  /** Ben mi başlattım — "istek" durumunda kimin karar vereceğini söylüyor. */
  benBaslattim: boolean;
  /** Son mesajın ilk 140 karakteri; mesaj yoksa null. */
  sonMesaj: string | null;
  sonMesajBenim: boolean;
  sonMesajAni: string;
  okunmamis: number;
  /**
   * Karşı tarafın son okuma anı — YALNIZ AÇIK sohbette dolu.
   * İstek aşamasında sunucu vermiyor: "görüldü" bilgisi bekleyen kişiye
   * baskı aracı olmasın.
   */
  karsiOkunduAni: string | null;
}

export interface Mesaj {
  id: string;
  sohbetId: string;
  gonderen: string;
  metin: string;
  olusturmaAni: string;
}

export interface MesajSayaclari {
  okunmamisSohbet: number;
  bekleyenIstek: number;
}

function sohbetCevir(s: any): SohbetOzeti {
  return {
    sohbetId: s.sohbet_id,
    karsiId: s.karsi_id,
    karsiKullaniciAdi: s.karsi_kullanici_adi ?? null,
    karsiGorunenAd: s.karsi_gorunen_ad ?? null,
    karsiAvatarYolu: s.karsi_avatar_path ?? null,
    karsiResmiMi: s.karsi_resmi_mi === true,
    durum: s.durum,
    benBaslattim: s.ben_baslattim === true,
    sonMesaj: s.son_mesaj ?? null,
    sonMesajBenim: s.son_mesaj_benim === true,
    sonMesajAni: s.son_mesaj_at,
    okunmamis: Number(s.okunmamis ?? 0),
    karsiOkunduAni: s.karsi_okundu_at ?? null,
  };
}

function mesajCevir(m: any): Mesaj {
  return {
    id: m.id,
    sohbetId: m.sohbet_id,
    gonderen: m.gonderen,
    metin: m.metin,
    olusturmaAni: m.created_at,
  };
}

/*
  SUNUCU KODLARI → KULLANICI CÜMLESİ

  Kodlar göçte `raise exception '<kod>'` ile MESAJ olarak atılıyor.
  Tanınmayan hata ham metinle ekrana basılmıyor; genel cümleye düşüyor.
*/
const CUMLELER: Record<string, string> = {
  'oturum-yok': 'Oturumun kapanmış görünüyor. Yeniden giriş yap.',
  'kendine-mesaj-yok': 'Kendine mesaj gönderemezsin.',
  'mesaj-bos': 'Boş mesaj gönderilemez.',
  'mesaj-cok-uzun': `Mesaj en fazla ${MESAJ_EN_UZUN} karakter olabilir.`,
  'yalniz-ogrenciler': 'Mesajlaşma şimdilik yalnız öğrenciler arasında açık.',
  engel: 'Bu kişiyle mesajlaşamazsın.',
  'profil-gorunmuyor': 'Bu profil şu anda mesaj almıyor.',
  'istek-reddedildi': 'Bu kişiye şu anda yeni bir mesaj isteği gönderemezsin.',
  'istek-siniri': 'Bugün çok fazla yeni mesaj isteği gönderdin. Yarın yeniden deneyebilirsin.',
  'istek-bekliyor': `İsteğin kabul edilene kadar en çok ${ISTEK_MESAJ_SINIRI} mesaj gönderebilirsin.`,
  'cok-hizli': 'Çok hızlı mesaj gönderiyorsun. Biraz bekleyip yeniden dene.',
  'istek-yok': 'Bu istek artık yok ya da zaten kabul edilmiş.',
};

function mesajHatasi(baglam: string, error: { code?: string; message?: string; details?: string }): SosyalHata {
  for (const alan of [error?.message, error?.details]) {
    const kod = (alan ?? '').trim();
    if (CUMLELER[kod]) return new SosyalHata(CUMLELER[kod], kod);
  }
  if (error?.code === '42501') return new SosyalHata(CUMLELER['oturum-yok'], 'oturum-yok');
  return new SosyalHata(`${baglam}. Bağlantını kontrol edip yeniden dene.`, 'sunucu');
}

/** Sohbet listesi: 'gelen' (açık + benim isteklerim) ya da 'istekler'. */
export async function sohbetlerimiGetir(kutu: SohbetKutusu = 'gelen'): Promise<SohbetOzeti[]> {
  const { data, error } = await db.rpc('sohbetlerim', { p_kutu: kutu });
  if (error) throw mesajHatasi('Sohbetler alınamadı', error);
  return (data ?? []).map(sohbetCevir);
}

/** Üst çubuk rozeti. Alınamazsa null: rozet çizilmez, 0 uydurulmaz. */
export async function mesajSayaclariniGetir(): Promise<MesajSayaclari | null> {
  const { data, error } = await db.rpc('mesaj_sayaclari', {});
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return {
    okunmamisSohbet: Number(data[0].okunmamis_sohbet ?? 0),
    bekleyenIstek: Number(data[0].bekleyen_istek ?? 0),
  };
}

/** Profildeki "Mesaj" düğmesi: var olan sohbet ya da null (henüz yazışma yok). */
export async function sohbetKimligiGetir(karsiId: string): Promise<string | null> {
  const { data, error } = await db.rpc('sohbet_kimligi', { p_karsi: karsiId });
  if (error) throw mesajHatasi('Sohbet bulunamadı', error);
  return (data as string | null) ?? null;
}

/**
 * Bir sohbetin mesajları, eskiden yeniye.
 *
 * `onceki` verilirse o andan ESKİ mesajlar (yukarı kaydırınca sayfa).
 * Sunucudan yeniden eskiye `sayfa` kadar alınıp çevriliyor.
 */
export async function mesajlariGetir(sohbetId: string, onceki?: string, sayfa = 50): Promise<Mesaj[]> {
  let sorgu = db
    .from('mesajlar')
    .select('id, sohbet_id, gonderen, metin, created_at')
    .eq('sohbet_id', sohbetId)
    .order('created_at', { ascending: false })
    .limit(sayfa);
  if (onceki) sorgu = sorgu.lt('created_at', onceki);
  const { data, error } = await sorgu;
  if (error) throw mesajHatasi('Mesajlar alınamadı', error);
  return (data ?? []).map(mesajCevir).reverse();
}

/**
 * Mesaj gönder — sohbet yoksa sunucu açıyor (bağlantı varsa açık, yoksa
 * istek). Dönen mesaj EKRANA EKLENECEK OLANIN KENDİSİ: iyimser bir kopya
 * gösterilmiyor, sunucunun kabul ettiği satır gösteriliyor.
 */
export async function mesajGonder(aliciId: string, metin: string): Promise<Mesaj> {
  const { data, error } = await db.rpc('mesaj_gonder', { p_alici: aliciId, p_metin: metin });
  if (error) throw mesajHatasi('Mesaj gönderilemedi', error);
  const satir = Array.isArray(data) ? data[0] : data;
  return mesajCevir(satir);
}

export async function istegiKabulEt(sohbetId: string): Promise<void> {
  const { error } = await db.rpc('sohbet_istegini_kabul_et', { p_sohbet: sohbetId });
  if (error) throw mesajHatasi('İstek kabul edilemedi', error);
}

/** İsteği sil — sohbet mesajlarıyla gider; gönderene bildirim gitmez. */
export async function istegiSil(sohbetId: string): Promise<void> {
  const { error } = await db.rpc('sohbet_istegini_sil', { p_sohbet: sohbetId });
  if (error) throw mesajHatasi('İstek silinemedi', error);
}

/** Okundu işareti; hata sessiz — okunmamış rozet bir sonraki okumada düzelir. */
export async function okunduIsaretle(sohbetId: string): Promise<void> {
  await db.rpc('sohbet_okundu', { p_sohbet: sohbetId });
}

/**
 * Mesajı şikâyet et — mevcut `reports` tablosu, `hedef_tur = 'mesaj'`.
 * Yönetici YALNIZ şikâyet edilen mesajı okuyabiliyor (göçteki politika).
 */
export async function mesajiSikayetEt(kullaniciId: string, mesajId: string, sebep: string, aciklama?: string): Promise<void> {
  const { error } = await db.from('reports').insert({
    reporter_id: kullaniciId,
    hedef_tur: 'mesaj',
    hedef_id: mesajId,
    sebep,
    aciklama: aciklama?.trim() || null,
  });
  if (error) throw mesajHatasi('Şikâyet gönderilemedi', error);
}

/**
 * BİR SOHBETİ DİNLE — yeni mesaj ve okuma olayları.
 *
 * Dönen fonksiyon aboneliği kapatıyor; bileşen sökülürken çağrılmalı.
 * Olay RLS'ten geçtiği için başka bir sohbetin mesajı gelmiyor; süzgeç
 * (`sohbet_id=eq.`) yalnız trafiği azaltmak için.
 */
export function sohbetiDinle(
  sohbetId: string,
  olaylar: { mesaj?: (m: Mesaj) => void; okuma?: (profilId: string, an: string) => void },
): () => void {
  const kanal = supabase
    .channel(`sohbet:${sohbetId}`)
    .on(
      'postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'mesajlar', filter: `sohbet_id=eq.${sohbetId}` },
      (yuk: any) => olaylar.mesaj?.(mesajCevir(yuk.new)),
    )
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'sohbet_okumalari', filter: `sohbet_id=eq.${sohbetId}` },
      (yuk: any) => {
        const satir = yuk.new;
        if (satir?.profil_id && satir?.okundu_at) olaylar.okuma?.(satir.profil_id, satir.okundu_at);
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(kanal);
  };
}

/**
 * GELEN KUTUSUNU DİNLE — herhangi bir sohbette yeni mesaj ya da durum
 * değişikliği. Liste ve üst çubuk rozeti bu olayda sunucudan YENİDEN
 * okunuyor; olay yükünden sayı hesaplanmıyor (okunmamış sayısı ve istek
 * kuralı sunucuda, istemcide ikinci bir kopyası olmasın).
 */
export function gelenKutusunuDinle(degisti: () => void): () => void {
  const kanal = supabase
    .channel('gelen-kutusu')
    .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'mesajlar' }, () => degisti())
    .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'sohbetler' }, () => degisti())
    .subscribe();
  return () => {
    void supabase.removeChannel(kanal);
  };
}
