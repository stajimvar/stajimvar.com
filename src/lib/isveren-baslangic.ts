/**
 * İŞVEREN BAŞLANGICI — VERİ KATMANI (7 Kasım 2026)
 *
 * /isveren/baslangic sayfası ve yönetici kuyruğu buradan okuyup yazıyor.
 * Kurallar (zorunlu alanlar, biçimler) lib/isveren-profil-formu.mjs'te.
 *
 * İki tablo, iki yol:
 *   company_claims    şirket sitede var → sahiplenme (onay: approve_company_claim)
 *   sirket_talepleri  şirket sitede yok → yeni şirket (onay: approve_sirket_talebi)
 * İkisinde de yetki ancak yönetici onayıyla geliyor; talep bırakmak hiçbir
 * öğrenci verisini açmıyor.
 */
import { supabase } from './supabase';

export type TalepDurumu = 'bekliyor' | 'onaylandi' | 'reddedildi';

export interface IsverenTalebi {
  tur: 'sahiplenme' | 'yeni-sirket';
  id: string;
  sirketAdi: string;
  durum: TalepDurumu;
  gerekce: string | null;
  olusturma: string;
}

function hata(baslik: string, e: { message?: string } | null | undefined): never {
  throw new Error(e?.message ? `${baslik}: ${e.message}` : baslik);
}

const tablo = (ad: string) => supabase.from(ad as never) as any;

/** Kişinin en son işveren talebi (iki tablodan, en yenisi). */
export async function benimSonTalebim(userId: string): Promise<IsverenTalebi | null> {
  const [claim, talep] = await Promise.all([
    tablo('company_claims')
      .select('id,status,reject_reason,created_at,companies(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
    tablo('sirket_talepleri')
      .select('id,durum,karar_gerekcesi,sirket_adi,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);
  if (claim.error) hata('Talep okunamadı', claim.error);
  if (talep.error) hata('Talep okunamadı', talep.error);

  const adaylar: IsverenTalebi[] = [];
  const c = claim.data?.[0];
  if (c) {
    adaylar.push({
      tur: 'sahiplenme',
      id: c.id,
      sirketAdi: c.companies?.name ?? '',
      durum: c.status === 'approved' ? 'onaylandi' : c.status === 'rejected' ? 'reddedildi' : 'bekliyor',
      gerekce: c.reject_reason ?? null,
      olusturma: c.created_at,
    });
  }
  const t = talep.data?.[0];
  if (t) {
    adaylar.push({
      tur: 'yeni-sirket',
      id: t.id,
      sirketAdi: t.sirket_adi,
      durum: t.durum === 'onaylandi' ? 'onaylandi' : t.durum === 'reddedildi' ? 'reddedildi' : 'bekliyor',
      gerekce: t.durum === 'reddedildi' ? t.karar_gerekcesi ?? null : null,
      olusturma: t.created_at,
    });
  }
  adaylar.sort((a, b) => b.olusturma.localeCompare(a.olusturma));
  return adaylar[0] ?? null;
}

/**
 * Talep logosu: `logos/<kullanıcı>/talep-<zaman>.<uzantı>`. Depolama
 * politikası yalnız kişinin kendi klasörüne yazdırıyor; onaydan önce de
 * yüklenebiliyor. Sınırlar şirket panelindeki logo yüklemesiyle aynı.
 */
export async function talepLogosuYukle(userId: string, file: File): Promise<string> {
  const izinli = ['image/png', 'image/jpeg', 'image/webp'];
  if (!izinli.includes(file.type)) throw new Error('Yalnızca PNG, JPEG veya WEBP yükleyebilirsin.');
  if (file.size > 2 * 1024 * 1024) throw new Error('Logo en fazla 2 MB olabilir.');
  const uzanti = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const yol = `${userId}/talep-${Date.now()}.${uzanti}`;
  const { error } = await supabase.storage.from('logos').upload(yol, file, { upsert: false, contentType: file.type });
  if (error) hata('Logo yüklenemedi', error);
  return supabase.storage.from('logos').getPublicUrl(yol).data.publicUrl;
}

/**
 * "İşverenim" niyetini hesaba işaretler (kullanıcı üst verisi). Bu
 * düzeltmeden önce açılmış ve şimdi şirket profili dolduran hesaplar da
 * işveren görünümüne geçsin diye. Yetki DEĞİL; rol yine tetikleyicide.
 */
export async function isverenNiyetiniKaydet(): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { kayit_niyeti: 'isveren' } });
  if (error) hata('Hesap güncellenemedi', error);
}

export async function yeniSirketTalebiGonder(p: {
  userId: string;
  yetkiliAdi: string;
  eposta: string;
  sirketAdi: string;
  webSitesi: string;
  sektor: string | null;
  calisanSayisi: string | null;
  sehir: string | null;
  vkn: string | null;
  tanitim: string | null;
  logoUrl: string | null;
  gorev: string;
  telefon: string | null;
}): Promise<void> {
  const { error } = await tablo('sirket_talepleri').insert({
    user_id: p.userId,
    yetkili_adi: p.yetkiliAdi.trim(),
    kurumsal_eposta: p.eposta.trim().toLowerCase(),
    sirket_adi: p.sirketAdi.trim(),
    web_sitesi: p.webSitesi,
    sektor: p.sektor,
    calisan_sayisi: p.calisanSayisi,
    sehir: p.sehir,
    vkn: p.vkn,
    tanitim: p.tanitim,
    logo_url: p.logoUrl,
    gorev: p.gorev,
    telefon: p.telefon,
  });
  if (error) hata('Talep gönderilemedi', error);
}

export async function sahiplenmeTalebiGonder(p: {
  userId: string;
  companyId: string;
  contactName: string;
  eposta: string;
  gorev: string;
  telefon: string | null;
  vkn: string | null;
  not: string | null;
}): Promise<void> {
  const { error } = await tablo('company_claims').insert({
    company_id: p.companyId,
    user_id: p.userId,
    contact_name: p.contactName.trim(),
    contact_title: p.gorev,
    work_email: p.eposta.trim().toLowerCase(),
    phone: p.telefon,
    vkn: p.vkn,
    note: p.not,
  });
  if (error) {
    if ((error as { code?: string }).code === '23505') throw new Error('Bu şirket için zaten bekleyen bir talebin var.');
    hata('Talep gönderilemedi', error);
  }
}

/* ------------------------------------------------------------ yönetici */

export interface YeniSirketTalebi {
  id: string;
  sirketAdi: string;
  webSitesi: string | null;
  sektor: string | null;
  calisanSayisi: string | null;
  sehir: string | null;
  vkn: string | null;
  tanitim: string | null;
  logoUrl: string | null;
  yetkiliAdi: string;
  eposta: string;
  gorev: string | null;
  telefon: string | null;
  hesapVar: boolean;
  olusturma: string;
  /** Otomatik değerlendirmenin onaylamama kodu (20261228010000). */
  otomatikGerekce: string | null;
}

export async function bekleyenSirketTalepleri(): Promise<YeniSirketTalebi[]> {
  const { data, error } = await tablo('sirket_talepleri')
    .select('id,sirket_adi,web_sitesi,sektor,calisan_sayisi,sehir,vkn,tanitim,logo_url,yetkili_adi,kurumsal_eposta,gorev,telefon,user_id,created_at,karar_gerekcesi')
    .in('durum', ['yeni', 'inceleniyor'])
    .order('created_at', { ascending: true });
  if (error) hata('Yeni şirket talepleri okunamadı', error);
  return (data ?? []).map((t: any) => ({
    id: t.id,
    sirketAdi: t.sirket_adi,
    webSitesi: t.web_sitesi,
    sektor: t.sektor,
    calisanSayisi: t.calisan_sayisi,
    sehir: t.sehir,
    vkn: t.vkn,
    tanitim: t.tanitim,
    logoUrl: t.logo_url,
    yetkiliAdi: t.yetkili_adi,
    eposta: t.kurumsal_eposta,
    gorev: t.gorev,
    telefon: t.telefon,
    hesapVar: Boolean(t.user_id),
    olusturma: t.created_at,
    otomatikGerekce: t.karar_gerekcesi ?? null,
  }));
}

export async function sirketTalebiniOnayla(id: string): Promise<void> {
  const { error } = await supabase.rpc('approve_sirket_talebi' as never, { talep_id: id } as never);
  if (error) hata('Onaylanamadı', error);
}

export async function sirketTalebiniReddet(id: string, sebep: string): Promise<void> {
  const { error } = await supabase.rpc('reject_sirket_talebi' as never, { talep_id: id, reason: sebep } as never);
  if (error) hata('Reddedilemedi', error);
}
