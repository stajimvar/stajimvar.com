import { supabase } from './supabase';

/**
 * HESABIMI SİL (20270114010000)
 *
 * İş sunucuda (`hesap-sil` kenar işlevi): kimlik oturumdan alınıyor,
 * istemci yalnız açık onayı ("SİL") gönderiyor. Başarıdan sonra yerel
 * oturum da kapatılıyor — sunucuda hesap yok, eldeki jeton geçersiz.
 */
export const SILME_ONAYI = 'SİL';

export type HesapSilmeSonucu =
  | { ok: true; eposta: boolean }
  | { ok: false; kod: 'son-sahip'; sirketler: string[] }
  | { ok: false; kod: 'yonetici' | 'oturum-yok' | 'hata' };

export async function hesabimiSil(): Promise<HesapSilmeSonucu> {
  const { data, error } = await supabase.functions.invoke('hesap-sil', { body: { onay: SILME_ONAYI } });
  if (error) {
    /* 409/401 gövdesi hata nesnesinin bağlamında; kod oradan okunuyor. */
    let govde: { kod?: string; sirketler?: string[] } = {};
    try {
      const baglam = (error as { context?: Response }).context;
      if (baglam && typeof baglam.json === 'function') govde = await baglam.json();
    } catch {
      /* gövde okunamadı: genel hata */
    }
    if (govde.kod === 'son-sahip') return { ok: false, kod: 'son-sahip', sirketler: govde.sirketler ?? [] };
    if (govde.kod === 'yonetici') return { ok: false, kod: 'yonetici' };
    if (govde.kod === 'oturum-yok') return { ok: false, kod: 'oturum-yok' };
    return { ok: false, kod: 'hata' };
  }
  const d = (data ?? {}) as { ok?: boolean; eposta?: boolean };
  if (!d.ok) return { ok: false, kod: 'hata' };
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return { ok: true, eposta: Boolean(d.eposta) };
}

/** Kullanıcıya gösterilen hata cümlesi; kod ekrana basılmıyor. */
export function silmeHataMetni(s: Exclude<HesapSilmeSonucu, { ok: true }>): string {
  if (s.kod === 'son-sahip') {
    const ad = s.sirketler.join(', ');
    return `${ad || 'Şirketinin'} tek sahibi sensin. Hesabını silmeden önce şirket yönetimini ekipten birine devret ya da iletisim@stajimvar.com adresine yaz.`;
  }
  if (s.kod === 'yonetici') return 'Yönetici hesabı buradan silinemez.';
  if (s.kod === 'oturum-yok') return 'Oturumun düşmüş. Yeniden giriş yapıp tekrar dene.';
  return 'Hesabın silinemedi; hiçbir şey değişmedi. Biraz sonra yeniden dene ya da iletisim@stajimvar.com adresine yaz.';
}
