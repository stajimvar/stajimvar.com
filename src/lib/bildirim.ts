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
  /*
    Olayın kimliği (`notifications.dedupe_key`). Sosyal bildirimlerde
    olayın taraflarını da taşıyor: "baglanti_istegi:<isteyen>:<alıcı>".
    Zilin altındaki "Kabul et" kimin isteğini yanıtlayacağını buradan
    okuyor — bildirim satırında ayrıca bir kullanıcı kimliği tutmaya
    gerek kalmıyor. Eski başvuru bildirimlerinde `null`.
  */
  anahtar: string | null;
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
  dedupe_key?: string | null;
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
  anahtar: s.dedupe_key ?? null,
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
    .select('id, type, title, body, target_url, application_id, read_at, created_at, dedupe_key')
    .order('created_at', { ascending: false })
    .limit(BILDIRIM_LIMITI);
  if (error) return [];
  /*
    `dedupe_key` göç 20260927130000 ile geldi; üretilmiş tipler henüz
    yeniden üretilmedi ve sütunu tanımıyor. Dönüşüm `unknown` üzerinden:
    doğrudan çevirim, derleyicinin haklı olarak "bu iki tip örtüşmüyor"
    demesine yol açıyor.
  */
  return ((data ?? []) as unknown as Satir[]).map(bildirime);
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

/**
 * Tek bildirimi siler (göç 20261118010000).
 *
 * Politika `recipient_id = auth.uid()`: başkasının bildirimine yönelen
 * silme hata vermiyor, SIFIR satır siliyor. Bu yüzden silinen satır geri
 * istenip sayılıyor:
 *
 *   · `true`  → satır sunucuda silindi
 *   · `false` → silinecek satır yoktu (başka sekmede zaten silinmiş);
 *               çağıran listeyi sunucudan yeniden okumalı
 *
 * Ağ ya da yetki hatasında İSTİSNA fırlatıyor — boş liste/0 dönen öteki
 * işlevlerin aksine. Silme kullanıcının açık isteği: başarısız olduysa
 * bildirim listede kalmalı ve hata söylenmeli, sessizce yutulmamalı.
 */
export async function bildirimSil(id: string): Promise<boolean> {
  const { data, error } = await supabase.from('notifications').delete().eq('id', id).select('id');
  if (error) throw new Error('Bildirim silinemedi');
  return (data ?? []).length > 0;
}

/**
 * BİLDİRİMLERİ ANINDA DİNLE (göç 20261117010000)
 *
 * `notifications` Supabase Realtime yayınında; olaylar abonenin RLS'inden
 * geçiyor ("kendi bildirimlerini okur"), yani başkasının bildirimi
 * gelmiyor. `recipient_id=eq.` süzgeci yalnız trafiği azaltıyor.
 *
 * OLAY YÜKÜ KULLANILMIYOR, SUNUCU YENİDEN OKUNUYOR
 * ------------------------------------------------
 * `degisti` yalnız "bir şey değişti" diyor; çağıran sayıyı ve listeyi
 * sunucudan tazeliyor. Olaydan sayaç artırılsaydı, aynı bildirim hem
 * olaydan hem yeniden okumadan sayılıp ÇİFT görünebilirdi; kopma
 * sırasında kaçan olay da sayaçta hiç görünmezdi.
 *
 * KOPMA VE YENİDEN BAĞLANMA
 * -------------------------
 * realtime-js kopan kanalı kendisi yeniden bağlıyor ve her başarılı
 * katılımda durum `SUBSCRIBED` oluyor. Kopukken yazılan bildirimin olayı
 * GERİ GELMİYOR (Realtime geçmişi saklamıyor); bu yüzden her `SUBSCRIBED`
 * anında `baglandi` çağrılıyor ve çağıran tam bir yeniden okuma yapıyor.
 * İlk bağlanma da aynı yoldan geçiyor: abonelik kurulurken yazılan bir
 * bildirim de kaçmıyor.
 *
 * Kanal adı abonelik başına tekil: aynı adla ikinci kanal realtime-js'te
 * hata veriyor ve biri kapanınca öteki de susuyor (mesajlaşmada ölçüldü).
 *
 * Dönen fonksiyon aboneliği kapatıyor; oturum değişince ya da bileşen
 * sökülünce çağrılmalı.
 */
export function bildirimleriDinle(
  kullaniciId: string,
  olaylar: { degisti: () => void; baglandi: () => void },
): () => void {
  const kanal = supabase
    .channel(`bildirim:${kullaniciId}:${crypto.randomUUID()}`)
    .on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${kullaniciId}` },
      () => olaylar.degisti(),
    )
    .subscribe((durum: string) => {
      if (durum === 'SUBSCRIBED') olaylar.baglandi();
    });
  return () => {
    void supabase.removeChannel(kanal);
  };
}

/*
  ZAMAN METNİ AYRI VE SAF BİR DOSYADA

  `gecenSure` bu dosyada duruyordu ama burası Supabase istemcisini
  içeri alıyor: işlevi test etmek için tarayıcı ortamı gerekiyordu.
  Saf bir modüle taşındı; davranışı doğrudan sınanabiliyor.
*/
export { gecenSure } from './gecen-sure.mjs';
