/**
 * EKİP DAVETİ — istemci tarafı (20261231010000).
 *
 * Bütün işlemler sunucu işlevlerinden: tabloya doğrudan erişim yok (RLS
 * politikası yok). Yetki ve sınırlar sunucuda; burada yalnız çağrı ve
 * hata metninin Türkçesi.
 */
import { supabase } from './supabase';

export type DavetRolu = 'Recruiter' | 'Viewer';

export const DAVET_ROLLERI: { id: DavetRolu; etiket: string; aciklama: string }[] = [
  { id: 'Recruiter', etiket: 'İşe alım sorumlusu', aciklama: 'Başvuruları görür, durumunu değiştirir, aday iletişimini görür.' },
  { id: 'Viewer', etiket: 'Görüntüleyici', aciklama: 'Başvuruları görür; değişiklik yapamaz, aday iletişimini göremez.' },
];

export interface BekleyenDavet {
  id: string;
  eposta: string;
  rol: DavetRolu;
  olusturma: string;
}

export interface GelenDavet {
  id: string;
  sirketAdi: string;
  sirketLogo: string | null;
  rol: DavetRolu;
  olusturma: string;
}

const rpc = (ad: string, args?: Record<string, unknown>) =>
  supabase.rpc(ad as never, (args ?? {}) as never) as unknown as Promise<{ data: unknown; error: { message?: string } | null }>;

/** Sunucunun hata kodlarını kullanıcının okuyacağı cümleye çeviriyor. */
export function davetHatasi(mesaj: string | undefined): string {
  const m = mesaj ?? '';
  if (m.includes('yalnizca sirket sahibi')) return 'Ekibe yalnız şirket sahibi davet gönderebilir.';
  if (m.includes('dogrulanmadan')) return 'Şirket doğrulanmadan davet gönderilemiyor.';
  if (m.includes('gecersiz e-posta')) return 'Geçerli bir e-posta yaz.';
  if (m.includes('zaten ekipte')) return 'Bu kişi zaten ekipte.';
  if (m.includes('gunluk davet siniri')) return 'Bugünlük davet sınırı doldu (günde 10). Yarın yeniden deneyebilirsin.';
  if (m.includes('bekleyen davet siniri')) return 'Bekleyen davet sınırı doldu (20). Eski davetleri iptal edebilirsin.';
  if (m.includes('davet bulunamadi')) return 'Davet bulunamadı ya da artık geçerli değil.';
  if (m.includes('e-posta dogrulanmamis')) return 'Daveti kabul etmek için önce e-postanı doğrula.';
  return 'İşlem yapılamadı. Biraz sonra yeniden dene.';
}

export async function davetGonder(sirketId: string, eposta: string, rol: DavetRolu): Promise<void> {
  const { error } = await rpc('ekip_daveti_gonder', { p_sirket: sirketId, p_eposta: eposta.trim().toLowerCase(), p_rol: rol });
  if (error) throw new Error(davetHatasi(error.message));
}

export async function bekleyenDavetler(sirketId: string): Promise<BekleyenDavet[]> {
  const { data, error } = await rpc('ekip_davetleri', { p_sirket: sirketId });
  if (error) throw new Error(davetHatasi(error.message));
  return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: String(d.id),
    eposta: String(d.eposta),
    rol: String(d.rol) as DavetRolu,
    olusturma: String(d.created_at),
  }));
}

export async function davetIptal(davetId: string): Promise<void> {
  const { error } = await rpc('ekip_davetini_iptal', { p_davet: davetId });
  if (error) throw new Error(davetHatasi(error.message));
}

export async function benimDavetlerim(): Promise<GelenDavet[]> {
  const { data, error } = await rpc('benim_ekip_davetlerim');
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: String(d.id),
    sirketAdi: String(d.sirket_adi ?? 'Şirket'),
    sirketLogo: (d.sirket_logo as string | null) ?? null,
    rol: String(d.rol) as DavetRolu,
    olusturma: String(d.created_at),
  }));
}

export async function davetKabul(davetId: string): Promise<void> {
  const { error } = await rpc('ekip_davetini_kabul_et', { p_davet: davetId });
  if (error) throw new Error(davetHatasi(error.message));
}

export async function uyeCikar(sirketId: string, uyeId: string): Promise<void> {
  const { error } = await rpc('ekip_uyesini_cikar', { p_sirket: sirketId, p_uye: uyeId });
  if (error) throw new Error('Üye çıkarılamadı. Şirket sahibi çıkarılamaz.');
}

export function rolEtiketi(rol: string): string {
  if (rol === 'Owner') return 'Şirket sahibi';
  return DAVET_ROLLERI.find((r) => r.id === rol)?.etiket ?? 'Görüntüleyici';
}
