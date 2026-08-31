import { supabase } from './supabase';

/**
 * UYGULAMA İÇİ BİLDİRİMLER — VERİ KATMANI
 *
 * Bildirimleri İSTEMCİ ÜRETMİYOR. Hepsi `applications` üzerindeki
 * tetikleyiciden, asıl yazımla aynı işlemin içinde doğuyor
 * (20260913010000_bildirimler). Buradaki işlevler yalnızca okuyor ve
 * okundu damgası basıyor.
 *
 * Kimin neyi görebileceği de burada değil, veritabanında: politika
 * `recipient_id = auth.uid()` diyor ve yazılabilen tek kolon `read_at`.
 */

export type Bildirim = {
  id: string;
  tur: string;
  baslik: string;
  govde: string | null;
  hedef: string | null;
  basvuruId: string | null;
  okunduMu: boolean;
  tarih: string;
};

/** Bildirim merkezinde gösterilen sayı. Sonsuz liste çekmenin anlamı yok. */
export const BILDIRIM_LIMITI = 30;

type Satir = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  target_url: string | null;
  application_id: string | null;
  read_at: string | null;
  created_at: string;
};

const bildirime = (s: Satir): Bildirim => ({
  id: s.id,
  tur: s.type,
  baslik: s.title,
  govde: s.body,
  hedef: s.target_url,
  basvuruId: s.application_id,
  okunduMu: Boolean(s.read_at),
  tarih: s.created_at,
});

/**
 * Son bildirimler.
 *
 * Hata durumunda BOŞ liste dönüyor, istisna değil: bildirim ikincil bir
 * katman ve yüklenememesi uygulamayı durdurmamalı.
 */
export async function bildirimleriGetir(): Promise<Bildirim[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, target_url, application_id, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(BILDIRIM_LIMITI);
  if (error) return [];
  return ((data ?? []) as Satir[]).map(bildirime);
}

/**
 * Okunmamış sayısı.
 *
 * Sayı SUNUCUDAN geliyor, listeden hesaplanmıyor: liste ilk 30 kaydı
 * taşıyor ve okunmamışlar bundan fazla olabilir.
 *
 * Hata durumunda `null`: "bilinmiyor" ile "sıfır" farklı şeyler ve
 * rozetin sıfır gösterip sonra zıplamaması buna bağlı.
 */
export async function okunmamisSayisi(): Promise<number | null> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) return null;
  return count ?? 0;
}

/** Tek bildirimi okundu yapar. Yazılabilen tek kolon `read_at`. */
export async function bildirimOkundu(id: string): Promise<void> {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

/** Tümünü okundu yapar; kaç satırın değiştiğini döndürür. */
export async function tumBildirimlerOkundu(): Promise<number> {
  const { data, error } = await supabase.rpc('bildirimleri_okundu_isaretle');
  if (error) return 0;
  return (data as number) ?? 0;
}

/*
  ZAMAN METNİ AYRI VE SAF BİR DOSYADA

  `gecenSure` bu dosyada duruyordu ama burası Supabase istemcisini
  içeri alıyor: işlevi test etmek için tarayıcı ortamı gerekiyordu.
  Saf bir modüle taşındı; davranışı doğrudan sınanabiliyor.
*/
export { gecenSure } from './gecen-sure.mjs';
