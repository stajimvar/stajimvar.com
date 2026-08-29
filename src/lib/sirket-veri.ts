/**
 * Şirket panelinin veri işleri.
 *
 * SUPABASE TEMBEL YÜKLENİYOR
 * --------------------------
 * `import { supabase }` dosyanın başında duramıyor: bu ağaç ön render
 * tarafından da taranabiliyor ve orada `import.meta.env` yok. Aynı tuzağa
 * rehber tarafında düşüldü (src/lib/rehber-veri.ts başındaki nota bakın).
 *
 * ASIL KAPI BURASI DEĞİL
 * ----------------------
 * Yetki kontrolü veritabanında: `applications` SELECT politikası şirketin
 * doğrulanmış olmasını da soruyor. Buradaki kademe hesabı yalnızca doğru
 * ekranı göstermek için — arayüz kandırılabilir, RLS kandırılamaz.
 */

import { kademeHesapla } from './sirket-kademe.mjs';

async function istemci() {
  const { supabase } = await import('./supabase');
  return supabase as unknown as {
    from: (t: string) => any;
    rpc: (ad: string, arg?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
}

export interface SirketBaglami {
  companyId: string | null;
  ad: string;
  slug: string;
  siteUrl: string | null;
  hrEmail: string | null;
  vkn: string | null;
  dogrulandi: boolean;
  kademe: number;
}

/**
 * Kullanıcının şirket bağlamı.
 *
 * Bir kişi birden çok şirkete üye olabiliyor; ilk üyelik alınıyor.
 * Çoklu şirket seçimi ileride gerekirse buraya bir seçici gelecek —
 * bugün hiç kimsede yok ve olmayan bir durum için ekran açmak, olmayan
 * bir sorunu çözmek olur.
 */
export async function sirketBaglami(
  userId: string | null,
  yoneticiMi: boolean
): Promise<SirketBaglami> {
  const bos: SirketBaglami = {
    companyId: null,
    ad: '',
    slug: '',
    siteUrl: null,
    hrEmail: null,
    vkn: null,
    dogrulandi: false,
    kademe: kademeHesapla({ yoneticiMi }),
  };
  if (!userId) return bos;

  try {
    const db = await istemci();
    const { data: uyelik } = await db
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .limit(1);

    const companyId = uyelik?.[0]?.company_id ?? null;
    if (!companyId) return bos;

    const { data: sirket } = await db
      .from('companies')
      .select('id, name, slug, website_url, hr_email, vkn, verified')
      .eq('id', companyId)
      .maybeSingle();

    if (!sirket) return bos;

    return {
      companyId: sirket.id,
      ad: sirket.name ?? '',
      slug: sirket.slug ?? '',
      siteUrl: sirket.website_url ?? null,
      hrEmail: sirket.hr_email ?? null,
      vkn: sirket.vkn ?? null,
      dogrulandi: Boolean(sirket.verified),
      kademe: kademeHesapla({ uyeMi: true, dogrulanmisMi: Boolean(sirket.verified), yoneticiMi }),
    };
  } catch {
    /* Bağlam okunamazsa kullanıcı kapıda kalıyor; panel açılmıyor. */
    return bos;
  }
}

/** Şirketin ilanları — taslaklar dahil (RLS zaten üyeye açıyor). */
export async function sirketIlanlari(companyId: string) {
  const db = await istemci();
  const { data, error } = await db
    .from('listings')
    .select('id, title, city, status, origin, applicants_count, posted_at, created_at, apply_url')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('İlanlar yüklenemedi.');
  return data ?? [];
}

export async function ilanKaydet(satir: Record<string, unknown>, companyId: string) {
  const db = await istemci();
  const { data, error } = await db
    .from('listings')
    .insert({ ...satir, company_id: companyId })
    .select('id')
    .single();
  if (error) {
    const mesaj = (error as { message?: string }).message ?? '';
    throw new Error(
      /row-level security/i.test(mesaj)
        ? 'Bu şirket için ilan açma yetkin görünmüyor.'
        : 'İlan kaydedilemedi.'
    );
  }
  return data as { id: string };
}

export async function ilanDurumuDegistir(id: string, durum: 'published' | 'closed' | 'draft') {
  const db = await istemci();
  const { error } = await db
    .from('listings')
    .update({ status: durum, ...(durum === 'published' ? { posted_at: new Date().toISOString() } : {}) })
    .eq('id', id);
  if (error) throw new Error('İlan güncellenemedi.');
}

/**
 * VKN kaydı — Kademe 2 başvurusu.
 *
 * VKN'yi kaydetmek şirketi DOĞRULAMIYOR: `companies.verified` yalnızca
 * yönetici tarafından açılıyor. VKN herkese açık bir bilgi ve tek başına
 * o şirketi temsil ettiğini kanıtlamıyor.
 */
export async function vknKaydet(companyId: string, vkn: string, mersis?: string) {
  const db = await istemci();
  const { error } = await db
    .from('companies')
    .update({ vkn: vkn.trim(), mersis: mersis?.trim() || null })
    .eq('id', companyId);
  if (error) {
    const mesaj = (error as { message?: string }).message ?? '';
    throw new Error(
      /companies_vkn_check/i.test(mesaj)
        ? 'VKN doğrulamayı geçmedi. 10 haneli numarayı kontrol et.'
        : /duplicate|unique/i.test(mesaj)
          ? 'Bu VKN başka bir şirkette kayıtlı. Yanlışsa bize yaz.'
          : 'VKN kaydedilemedi.'
    );
  }
}

/** Başvuranlar — yalnızca Kademe 2'de veri döner; kapı RLS'te. */
export async function sirketBasvurulari(companyId: string) {
  const db = await istemci();
  const { data, error } = await db
    .from('applications')
    .select(
      'id, status, created_at, match_score, listing_id, listings!inner(id, title, company_id), student_profiles(id)'
    )
    .eq('listings.company_id', companyId)
    .order('created_at', { ascending: false });

  /*
    Kademe 1'de RLS satır döndürmüyor; bu bir hata değil, kuralın
    kendisi. Boş liste dönüyor ve ekran "doğrulama gerekiyor" diyor.
  */
  if (error) return [];
  return data ?? [];
}
