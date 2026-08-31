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
    storage: {
      from: (kova: string) => {
        upload: (
          yol: string,
          dosya: File,
          secenek?: { upsert?: boolean; contentType?: string }
        ) => Promise<{ error: { message: string } | null }>;
        getPublicUrl: (yol: string) => { data: { publicUrl: string } };
      };
    };
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
    .select(
      'id, title, city, status, origin, application_method, applicants_count, ' +
        'posted_at, created_at, apply_url, application_deadline'
    )
    .eq('company_id', companyId)
    /* Arşivlenen ilan listeden kalkıyor ama veri duruyor: başvurular ve
       öğrencinin geçmişi olduğu gibi kalsın diye silinmiyor. */
    .neq('status', 'archived')
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

export async function ilanDurumuDegistir(
  id: string,
  durum: 'published' | 'closed' | 'draft' | 'archived'
) {
  const db = await istemci();
  const { error } = await db
    .from('listings')
    .update({ status: durum, ...(durum === 'published' ? { posted_at: new Date().toISOString() } : {}) })
    .eq('id', id);
  if (error) throw new Error('İlan güncellenemedi.');
}

/** Düzenleme için tek ilanı okur. RLS zaten yalnızca kendi ilanını veriyor. */
export async function ilanOku(id: string) {
  const db = await istemci();
  const { data, error } = await db
    .from('listings')
    .select(
      'id, company_id, title, city, work_type, term, duration, is_paid, stipend_text, ' +
        'description, application_deadline, status, origin, ' +
        'mandatory_staj_accepted, voluntary_staj_accepted'
    )
    .eq('id', id)
    .maybeSingle();
  if (error || !data) throw new Error('İlan okunamadı.');
  return data as Record<string, unknown>;
}

/**
 * İlanı günceller.
 *
 * Gövde `ilanSatiri()` üretiyor; yani düzenleme ile oluşturma AYNI alan
 * kümesini yazıyor. `company_id`, `origin` ve `status` burada
 * gönderilmiyor: ilkinin ikisi zaten yalnızca INSERT'te yazılabiliyor,
 * durum ise ayrı bir eylem (yayınla/kapat) ve düzenleme sırasında sessizce
 * değişmemeli.
 */
export async function ilanGuncelle(id: string, satir: Record<string, unknown>) {
  const db = await istemci();
  const { company_id: _c, origin: _o, status: _s, posted_at: _p, ...alanlar } = satir;
  const { error } = await db.from('listings').update(alanlar).eq('id', id);
  if (error) {
    const mesaj = (error as { message?: string }).message ?? '';
    throw new Error(
      /row-level security|permission denied/i.test(mesaj)
        ? 'Bu ilanı düzenleme yetkin görünmüyor.'
        : 'İlan güncellenemedi.'
    );
  }
}

/**
 * İlanı KALICI siler.
 *
 * ÖLÇÜLDÜ: `applications_listing_id_fkey` ON DELETE CASCADE. Yani ilanı
 * silmek, o ilana yapılmış HER BAŞVURUYU da siliyor — şirketin kaydını
 * da, öğrencinin kendi başvuru geçmişini de. Bu yüzden bu fonksiyon
 * yalnızca başvurusu OLMAYAN ilan için çağrılıyor; başvurusu olanda
 * arşivleme kullanılıyor.
 *
 * Sayım burada da yapılıyor: çağıran tarafın kontrolüne güvenmek, araya
 * giren bir başvuruyu kaçırmak demek.
 */
export async function ilanSil(id: string) {
  const db = await istemci();
  const { count, error: sayimHatasi } = await db
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', id);
  if (sayimHatasi) throw new Error('Başvurular okunamadı; ilan silinmedi.');
  if ((count ?? 0) > 0) {
    throw new Error('Bu ilana başvuru gelmiş; silmek yerine arşivleyin.');
  }

  const { error } = await db.from('listings').delete().eq('id', id);
  if (error) throw new Error('İlan silinemedi.');
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

/**
 * Başvuranlar — yalnızca Kademe 2'de veri döner; kapı RLS'te.
 *
 * `applied_at` ile sıralanıyor: bu tabloda `created_at` YOK. Önceki
 * hâlinde olmayan bir sütun isteniyordu ve sorgu sessizce hata verip
 * boş liste dönüyordu — yani doğrulanmış şirket de kart göremiyordu.
 */
export async function sirketBasvurulari(companyId: string) {
  const db = await istemci();
  const { data, error } = await db
    .from('applications')
    .select(
      'id, status, applied_at, match_score, listing_id, student_id, cover_letter, cv_path, ' +
        'cv_snapshot_path, profile_snapshot, contact_share_consent_at, application_method, ' +
        'interview_date, status_changed_at, ' +
        'listings!inner(id, title, company_id)'
    )
    .eq('listings.company_id', companyId)
    .order('applied_at', { ascending: false });

  /*
    Kademe 1'de RLS satır döndürmüyor; bu bir hata değil, kuralın
    kendisi. Boş liste dönüyor ve ekran "doğrulama gerekiyor" diyor.
  */
  if (error) return [];

  return (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    ilanBasligi: (s.listings as { title?: string } | null)?.title ?? null,
  }));
}

/**
 * Bir başvuranın canlı yetenek kayıtları.
 *
 * Başvuru kopyasında yetenek yoksa (eski başvurular) buradan
 * tamamlanıyor. Politika bu okumayı yalnızca şirkete BAŞVURMUŞ
 * öğrenciler için ve yalnızca doğrulanmış şirkete açıyor.
 */
export async function adayYetenekleri(studentId: string) {
  const db = await istemci();
  const { data, error } = await db
    .from('student_skills')
    .select('name, level, category')
    .eq('student_id', studentId)
    .order('name');
  if (error) return [];
  return (data ?? []) as { name: string; level?: string; category?: string }[];
}

/** Başvuru durumunu değiştirir. RLS doğrulanmış şirket dışına kapalı. */
export async function basvuruDurumuDegistir(id: string, durum: string) {
  const db = await istemci();
  const { error } = await db.from('applications').update({ status: durum }).eq('id', id);
  if (error) throw new Error('Başvuru durumu güncellenemedi.');
}

/**
 * Mülakat tarihi.
 *
 * DURUMDAN BAĞIMSIZ: tarih girmek adayı mülakata almanın şartı değil ve
 * durum değişimini engellemiyor. Boş dize null yazıyor — "tarih
 * kaldırıldı" ile "boş dize" aynı şey olmalı.
 */
export async function mulakatTarihiYaz(id: string, tarih: string) {
  const db = await istemci();
  const { error } = await db
    .from('applications')
    .update({ interview_date: tarih ? tarih : null })
    .eq('id', id);
  if (error) throw new Error('Mülakat tarihi kaydedilemedi.');
}

/**
 * Adaya not.
 *
 * DURUMA DOKUNMUYOR: not yazmak bir karar değil. Önce durumu da
 * 'under_review' yapıyordu; reddedilmiş bir başvuruya not eklemek onu
 * sessizce yeniden incelemeye alırdı.
 *
 * `company_feedback` ÖĞRENCİYE GÖRÜNÜR — dahili not değil. Arayüzde de
 * böyle yazıyor.
 */
export async function basvuruNotuKaydet(id: string, metin: string) {
  const db = await istemci();
  const { error } = await db
    .from('applications')
    .update({ company_feedback: metin })
    .eq('id', id);
  if (error) throw new Error('Not kaydedilemedi.');
}

/* ------------------------------------------------------- şirket profili */

/**
 * Şirket profilinde düzenlenebilir alanlar.
 *
 * YALNIZCA VAR OLAN SÜTUNLAR
 * --------------------------
 * "Çalışma kültürü", "yan haklar", "departmanlar", "sosyal medya" gibi
 * alanlar `companies` tablosunda YOK. Onları eklemek bir göç ve bir
 * yönetim ekranı demek; buradaki form yalnızca bugün gerçekten
 * kaydedilebilen yedi alanı soruyor. Boş bir alanı formda göstermek,
 * doldurulunca kaybolan bir alan üretirdi.
 */
export interface SirketProfilDegeri {
  logoUrl: string;
  industry: string;
  size: string;
  location: string;
  websiteUrl: string;
  description: string;
  hrEmail: string;
}

export const PROFIL_ALANLARI: (keyof SirketProfilDegeri)[] = [
  'logoUrl',
  'industry',
  'size',
  'location',
  'websiteUrl',
  'description',
  'hrEmail',
];

/** Doldurulmuş alan oranı. Uydurma değil: yedi gerçek sütunu sayıyor. */
export function profilTamamlanmaOrani(deger: Partial<SirketProfilDegeri>): number {
  const dolu = PROFIL_ALANLARI.filter((alan) => String(deger[alan] ?? '').trim() !== '').length;
  return Math.round((dolu / PROFIL_ALANLARI.length) * 100);
}

export async function sirketProfiliOku(companyId: string): Promise<SirketProfilDegeri> {
  const db = await istemci();
  const { data } = await db
    .from('companies')
    .select('logo_url, industry, size, location, website_url, description, hr_email')
    .eq('id', companyId)
    .maybeSingle();

  return {
    logoUrl: data?.logo_url ?? '',
    industry: data?.industry ?? '',
    size: data?.size ?? '',
    location: data?.location ?? '',
    websiteUrl: data?.website_url ?? '',
    description: data?.description ?? '',
    hrEmail: data?.hr_email ?? '',
  };
}

/**
 * Şirket logosunu yükler ve herkese açık adresini döndürür.
 *
 * GERÇEK ALTYAPI, YENİ ALTYAPI DEĞİL
 * ----------------------------------
 * `logos` kovası ve yükleme politikası zaten var; öğrenci avatarı da
 * aynı yoldan yükleniyor. Burada yeni bir sistem kurulmuyor, var olanı
 * şirket tarafına bağlıyoruz.
 *
 * KLASÖR ADI KULLANICI KİMLİĞİ OLMAK ZORUNDA
 * ------------------------------------------
 * Depolama politikası `(storage.foldername(name))[1] = auth.uid()` şartı
 * koyuyor. Dosya adına şirket kimliği yazılıyor ki aynı kişi birden çok
 * şirkete üyeyse logolar birbirini ezmesin.
 *
 * Sınırlar kovanın kendi sınırları: 2 MB ve PNG/JPEG/WEBP. Burada da
 * kontrol ediliyor çünkü kovadan dönen hata kullanıcıya bir şey
 * anlatmıyor.
 */
export async function sirketLogosuYukle(
  companyId: string,
  userId: string,
  file: File
): Promise<string> {
  const izinli = ['image/png', 'image/jpeg', 'image/webp'];
  if (!izinli.includes(file.type)) {
    throw new Error('Yalnızca PNG, JPEG veya WEBP yükleyebilirsiniz.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Logo en fazla 2 MB olabilir.');
  }

  const db = await istemci();
  const uzanti = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const yol = `${userId}/${companyId}.${uzanti}`;

  const { error } = await db.storage
    .from('logos')
    .upload(yol, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Logo yüklenemedi: ${error.message}`);

  const { data } = db.storage.from('logos').getPublicUrl(yol);
  /* Tarayıcı eski logoyu önbellekten göstermesin. */
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function sirketProfiliKaydet(companyId: string, deger: SirketProfilDegeri) {
  const db = await istemci();
  const temiz = (x: string) => x.trim() || null;
  const { error } = await db
    .from('companies')
    .update({
      logo_url: temiz(deger.logoUrl),
      industry: temiz(deger.industry),
      size: temiz(deger.size),
      location: temiz(deger.location),
      website_url: temiz(deger.websiteUrl),
      description: temiz(deger.description),
      hr_email: temiz(deger.hrEmail),
    })
    .eq('id', companyId);
  if (error) throw new Error('Şirket profili kaydedilemedi.');
}
