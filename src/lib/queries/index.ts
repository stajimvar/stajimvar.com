/**
 * Supabase veri erişim katmanı.
 *
 * Bileşenler doğrudan `supabase` istemcisini çağırmaz; buradaki fonksiyonları kullanır.
 * Her fonksiyon hata durumunda throw eder — çağıran taraf try/catch ile karşılar.
 */

import { supabase } from '../supabase';
import type { TablesUpdate } from '../database.types';
import type {
  ApplicationRecord,
  CompanyAccount,
  InternshipListing,
  SkillQuiz,
  StudentProfile,
} from '../../types';
import {
  toApplicationRecord,
  toCompanyAccount,
  toInternshipListing,
  toListingInsert,
  toSkillQuiz,
  toStudentProfile,
  toCompanyUpdate,
  toDbSkillCategory,
  splitStudentUpdate,
  LISTING_COLUMNS,
  type CompanyRowWithMembers,
  type ListingRowWithCompany,
  type QuizRowWithQuestions,
  type StudentRowBundle,
} from './mappers';
import { basvuruYolu } from '../basvuru-yolu.mjs';
import { requestPublishedListingsCatalog } from '../global-listings-api.mjs';
import { istanbulGunBaslangici, nabizAdedi } from '../kontrol-nabzi.mjs';

/** PostgREST hatalarını tek biçimde yükseltir. */
function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'bilinmeyen hata'}`);
}

// ---------------------------------------------------------------- İlanlar

const LISTING_SELECT = `
  ${LISTING_COLUMNS},
  companies ( name, slug, logo_url, cover_url, industry, size, location, description, rating )
`;

/**
 * Yayındaki ilanlar. Giriş yapılmamış ziyaretçi de çağırabilir —
 * RLS zaten yalnızca status = 'published' olanları döndürüyor.
 */
export async function fetchPublishedListings(): Promise<InternshipListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'published')
    .order('posted_at', { ascending: false, nullsFirst: false });

  if (error) fail('İlanlar yüklenemedi', error);
  return (data as unknown as ListingRowWithCompany[]).map(toInternshipListing);
}

/**
 * Rehber ve bölüm sayfalarındaki "açık ilanlar" bloğunun satırı.
 *
 * NEDEN AYRI BİR ŞEKİL: o blok altı kart çiziyor ve karttaki her şey
 * burada — başlık, şirket adı, logo, şehir. Blok bugüne kadar
 * `fetchPublishedListings` çağırıyordu, yani 42 kolon ve şirket
 * birleştirmesiyle YAYINDAKİ BÜTÜN İLANLARI indirip altı tanesini
 * kesiyordu (ölçüldü, 13 Eylül 2026: 363 KB). Aynı iş bu beş alanla
 * 40 KB'ye iniyor.
 *
 * Alan eşleştirmesi hâlâ istemcide (`alanEslestir` başlığa bakan bir
 * eşleyici, SQL'e çevrilebilir bir şey değil) — bu yüzden satır sayısı
 * değil, satırın GENİŞLİĞİ küçültüldü. Sonuç aynı: eşleşenler önce,
 * kalanlar arkadan dolduruyor.
 */
export interface RehberIlanKarti {
  id: string;
  title: string;
  city: string;
  companyName: string;
  companyLogo: string;
}

export async function fetchRehberIlanKartlari(): Promise<RehberIlanKarti[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, city, companies ( name, logo_url )')
    .eq('status', 'published')
    .order('posted_at', { ascending: false, nullsFirst: false });

  if (error) fail('İlanlar yüklenemedi', error);
  type Satir = {
    id: string;
    title: string;
    city: string | null;
    companies: { name: string | null; logo_url: string | null } | null;
  };
  return (data as unknown as Satir[]).map((row) => ({
    id: row.id,
    title: row.title,
    city: row.city ?? '',
    /* Boş dize, `toInternshipListing` ile aynı yedek: kart ikisini de aynı çiziyor. */
    companyName: row.companies?.name ?? 'Bilinmeyen şirket',
    companyLogo: row.companies?.logo_url ?? '',
  }));
}

export interface PublishedListingsCursor { value: string; id: string }
export interface PublishedListingsCatalogPage {
  listings: InternshipListing[];
  total: number;
  /*
    Şirket ve şehir sayısı SUNUCUDAN geliyor, yüklenmiş sayfadan değil.

    İstemci yalnızca ilk 24 kaydı görüyor; "62 ilan kaç şirkete ait"
    sorusunun cevabı orada yok. Sayaçlar bu yüzden `listings` dizisinden
    hesaplanınca sayfa boyunu ölçüyordu — ekranda 24/23/4 yazarken gerçek
    değerler 62/51/6'ydı (ölçüldü, 7 Eylül 2026).

    Üçü de `total` ile aynı sorgudan ve aynı anlık görüntüden çıkıyor.
  */
  companyTotal: number;
  cityTotal: number;
  /* Güven satırının verisi; bkz. lib/guven-satiri.mjs. */
  verifiedTotal: number;
  lastVerifiedAt: string | null;
  facets: { countries: Array<{ code: string; count: number }> };
  hasMore: boolean;
  nextCursor: PublishedListingsCursor | null;
  snapshot: string;
}

/**
 * Bugün (Europe/Istanbul) kaynağında açık olduğu doğrulanan yayındaki ilan
 * sayısı — tek `count` sorgusu, satır indirmiyor. Kurallar lib/kontrol-nabzi.
 * Alınamazsa ya da sıfırsa `null`: arayüz sayaç uydurmuyor.
 */
export async function fetchBugunDogrulananIlanSayisi(): Promise<number | null> {
  const { count, error } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('source_verified_at', istanbulGunBaslangici());
  if (error) return null;
  return nabizAdedi(count);
}

export async function fetchPublishedListingsCatalog(
  country: string,
  cursor: PublishedListingsCursor | null = null,
  snapshot: string | null = null,
): Promise<PublishedListingsCatalogPage> {
  const data = await requestPublishedListingsCatalog(supabase, { country, cursor, snapshot });
  return { ...data, listings: data.listings.map((row: ListingRowWithCompany) => toInternshipListing(row)) };
}

/**
 * Tek ilan, adresteki kimlik önekiyle.
 *
 * `LIKE` kullanılamıyor: Postgres'te uuid tipiyle metin karşılaştırma operatörü
 * yok (`operator does not exist: uuid ~~ unknown`). Bunun yerine aralık
 * karşılaştırması yapılıyor — UUID sıralı olduğu için 8 haneli önek bitişik bir
 * aralık tanımlar ve bu birincil anahtar indeksini de kullanır.
 *
 * Birden çok eşleşirse ilki değil `null` dönüyor: yanlış ilanı göstermektense
 * bulunamadı demek doğru.
 */
export async function fetchListingByIdPrefix(
  prefix: string
): Promise<InternshipListing | null> {
  const alt = `${prefix}-0000-0000-0000-000000000000`;
  const ust = `${prefix}-ffff-ffff-ffff-ffffffffffff`;

  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'published')
    .gte('id', alt)
    .lte('id', ust)
    .limit(2);

  if (error) fail('İlan yüklenemedi', error);
  const rows = (data as unknown as ListingRowWithCompany[]) ?? [];
  if (rows.length !== 1) return null;
  return toInternshipListing(rows[0]);
}

/** Şirket sayfası için: şirket bilgisi ve yayındaki ilanları. */
export async function fetchCompanyPage(slug: string): Promise<{
  /*
    `sahiplenilmis` ve `verified` AYRI İKİ DURUM

    Profil sayfası ikisini tek alan üzerinden okuyordu: `verified` false
    olunca "Henüz sahiplenilmemiş" yazıyordu. Oysa bir şirket sahiplenilmiş
    ama henüz doğrulanmamış olabiliyor — sahiplenme "yetkili olduğunu
    söyleyen biri var" demek, doğrulama "biz kontrol ettik" demek. İkisini
    aynı rozete bağlamak, sahiplenmiş ama doğrulanmamış şirkete "kimse
    sahiplenmemiş" dedirtiyordu.
  */
  company: { id: string; name: string; slug: string; logoUrl?: string; websiteUrl?: string;
             industry?: string; location?: string; size?: string; description?: string;
             verified: boolean; sahiplenilmis: boolean };
  listings: InternshipListing[];
  /** Aynı sektör ya da aynı şehirdeki, yayında ilanı olan şirketler. */
  benzerler: { slug: string; name: string; logoUrl?: string; industry?: string }[];
} | null> {
  const { data: company, error } = await supabase
    .from('companies')
    .select('id,name,slug,logo_url,website_url,industry,location,size,description,verified,claimed_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) fail('Şirket yüklenemedi', error);
  if (!company) return null;

  const { data: rows, error: listErr } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('company_id', company.id)
    .eq('status', 'published')
    .order('posted_at', { ascending: false, nullsFirst: false });

  if (listErr) fail('Şirket ilanları yüklenemedi', listErr);

  /*
    BENZER ŞİRKETLER

    "Bu şirketin başka açık ilanı yok" tek başına çıkmaz sokaktı: öğrenci
    sayfaya geliyor, ilan bulamıyor ve geri dönmekten başka yolu olmuyor.
    Benzer şirket, o noktada gösterilebilecek en yakın gerçek alternatif.

    "Benzer" burada UYDURULMUYOR: yalnızca aynı sektör ya da aynı merkez
    şehir eşleşiyor. İkisi de boşsa liste boş dönüyor ve bölüm hiç
    çizilmiyor — rastgele şirket önermek, alakasız bir sayfaya
    yönlendirmek olurdu.

    Yalnızca YAYINDA İLANI OLAN şirketler öneriliyor; ilanı olmayan bir
    şirket sayfasına göndermek çıkmaz sokağı bir adım öteye taşımak olur.
    Tek sorgu ve sınırlı: ilanlardan şirketler türetilip yerelde
    tekilleştiriliyor.
  */
  let benzerler: { slug: string; name: string; logoUrl?: string; industry?: string }[] = [];
  if (company.industry || company.location) {
    const { data: digerIlanlar } = await supabase
      .from('listings')
      .select('company_id, companies(slug,name,logo_url,industry,location)')
      .eq('status', 'published')
      .neq('company_id', company.id)
      .limit(300);

    /*
      SEKTÖR ÖNCE, ŞEHİR SONRA

      İlk sürüm sektör ve şehri EŞİT sayıyordu ve tarayıcıda görüldü:
      Novartis (İlaç) sayfasında "benzer" olarak BESTSELLER (moda),
      Kepekçi & Sepetçi (hukuk) ve Peak (oyun) çıkıyordu — hepsi yalnızca
      "İstanbul" eşleşmesiydi. İstanbul'da 41 şirket var, yani şehir tek
      başına hiçbir şey ayırt etmiyor ve "benzer" kelimesi anlamsızlaşıyor.

      Artık sektör eşleşmeleri önce alınıyor; şehir yalnızca yer kalırsa
      dolduruyor. Aynı sektörde kimse yoksa liste yine de anlamlı kalıyor
      ("aynı şehirde staj alan başka şirketler").
    */
    const gorulen = new Set<string>();
    const sektorden: typeof benzerler = [];
    const sehirden: typeof benzerler = [];

    for (const satir of digerIlanlar ?? []) {
      const s = (satir as { companies?: Record<string, string | null> }).companies;
      if (!s?.slug || gorulen.has(s.slug)) continue;
      const sektorUyar = Boolean(company.industry) && s.industry === company.industry;
      const sehirUyar = Boolean(company.location) && s.location === company.location;
      if (!sektorUyar && !sehirUyar) continue;
      gorulen.add(s.slug);
      (sektorUyar ? sektorden : sehirden).push({
        slug: s.slug,
        name: s.name ?? s.slug,
        logoUrl: s.logo_url ?? undefined,
        industry: s.industry ?? undefined,
      });
    }

    benzerler = [...sektorden, ...sehirden].slice(0, 6);
  }

  return {
    benzerler,
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logo_url ?? undefined,
      websiteUrl: company.website_url ?? undefined,
      industry: company.industry ?? undefined,
      /* Künye bloğu için: çalışan sayısı okunuyordu ama taşınmıyordu. */
      size: company.size ?? undefined,
      location: company.location ?? undefined,
      description: company.description ?? undefined,
      verified: company.verified,
      sahiplenilmis: company.claimed_at != null,
    },
    listings: (rows as unknown as ListingRowWithCompany[]).map(toInternshipListing),
  };
}

/**
 * İşverenin kendi şirketini bulması için ada göre arama.
 *
 * NEDEN VAR
 * ---------
 * Şirket sahiplenme formu yalnızca /sirket/<slug> sayfasında duruyor. Ama o
 * sayfaya giden tek yol ilan listesinden tıklamaktı: yani şirketi zaten
 * ilanı derlenmiş olan işveren buraya gelebiliyordu, diğerleri hiç
 * gelemiyordu. Aramasız hâlde kapı vardı ama tokmağı yoktu.
 *
 * Herkese açık: companies tablosunun okuma kuralı zaten anonim erişime
 * izin veriyor (şirket sayfaları arama motoruna açık). Burada yalnızca
 * ada göre filtreleme yapılıyor, ek bir alan sızmıyor.
 */
export async function searchCompanies(
  term: string
): Promise<{ id: string; name: string; slug: string; logoUrl?: string; verified: boolean }[]> {
  const temiz = term.trim();
  // İki harften kısa aramada tablonun yarısı dönerdi; anlamlı değil.
  if (temiz.length < 2) return [];

  const { data, error } = await supabase
    .from('companies')
    .select('id,name,slug,logo_url,verified')
    // ilike: büyük-küçük harf duyarsız. Türkçe "İ/ı" eşleşmesi Postgres'in
    // harmanlamasına bırakılıyor; kendi normalleştirmemizi eklemiyoruz çünkü
    // yanlış eşleşme üretmesi doğru eşleşmeyi kaçırmasından daha kötü.
    .ilike('name', `%${temiz}%`)
    .order('name')
    .limit(10);

  if (error) fail('Şirket araması yapılamadı', error);

  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logo_url ?? undefined,
    verified: c.verified,
  }));
}

/** Şirketin kendi ilanları — taslaklar dahil. RLS üyelik kontrolünü yapıyor. */
export async function fetchCompanyListings(companyId: string): Promise<InternshipListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) fail('Şirket ilanları yüklenemedi', error);
  return (data as unknown as ListingRowWithCompany[]).map(toInternshipListing);
}

/**
 * Şirket sayfasının YAYINDAKİ ilanları — öğrenci görünümü için.
 *
 * `fetchCompanyListings` durum süzmüyor; RLS öğrenciye yayındakileri
 * VE kendi başvurduğu kapalı ilanları da veriyor. Şirket sayfasında o
 * kapalı ilanın "aktif ilan" diye sayılması yanlış olurdu; sayaç ve liste
 * aynı sorgudan geldiği için süzgeç burada, sorguda.
 */
export async function fetchPublishedCompanyListings(companyId: string): Promise<InternshipListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('company_id', companyId)
    .eq('status', 'published')
    .order('posted_at', { ascending: false, nullsFirst: false });

  if (error) fail('Şirket ilanları yüklenemedi', error);
  return (data as unknown as ListingRowWithCompany[]).map(toInternshipListing);
}

export async function createListing(
  listing: InternshipListing,
  companyId: string,
  status: 'draft' | 'published' = 'published'
): Promise<InternshipListing> {
  const { data, error } = await supabase
    .from('listings')
    .insert(toListingInsert(listing, companyId, status))
    .select(LISTING_SELECT)
    .single();

  if (error) fail('İlan oluşturulamadı', error);
  return toInternshipListing(data as unknown as ListingRowWithCompany);
}

export async function deleteListing(listingId: string): Promise<void> {
  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  if (error) fail('İlan silinemedi', error);
}

// ---------------------------------------------------------------- Öğrenci

const STUDENT_SELECT = `
  *,
  profiles ( full_name, email, phone, avatar_url, interface_language, content_language, home_country ),
  student_skills ( * ),
  student_languages ( * ),
  student_projects ( * )
`;

/** Tek öğrenci profili. Yoksa null döner (henüz profil oluşturmamış kullanıcı). */
export async function fetchStudentProfile(userId: string): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from('student_profiles')
    .select(STUDENT_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) fail('Öğrenci profili yüklenemedi', error);
  if (!data) return null;
  return toStudentProfile(data as unknown as StudentRowBundle);
}

/**
 * Şirketlerin aday havuzu. RLS yalnızca `is_open_to_offers = true` olanları veriyor.
 * Öğrenci hesabıyla çağrılırsa yalnızca kendi kaydı döner.
 */
export async function fetchOpenStudentProfiles(): Promise<StudentProfile[]> {
  const { data, error } = await supabase
    .from('student_profiles')
    .select(STUDENT_SELECT)
    .eq('is_open_to_offers', true);

  if (error) fail('Aday havuzu yüklenemedi', error);
  return (data as unknown as StudentRowBundle[]).map(toStudentProfile);
}

/** Profil yaması. `profiles` ve `student_profiles` ayrı ayrı güncellenir. */
export async function updateStudentProfile(
  userId: string,
  patch: Partial<StudentProfile>
): Promise<void> {
  const { profilePatch, studentPatch } = splitStudentUpdate(patch);

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabase.from('profiles').update(profilePatch).eq('id', userId);
    if (error) fail('Profil güncellenemedi', error);
  }

  if (Object.keys(studentPatch).length > 0) {
    const { error } = await supabase
      .from('student_profiles')
      .update(studentPatch)
      .eq('id', userId);
    if (error) fail('Öğrenci bilgileri güncellenemedi', error);
  }
}

/**
 * Beceri listesini toptan değiştirir (sil-yeniden yaz).
 *
 * DİKKAT: `verified` bilerek gönderilmiyor. RLS öğrencinin kendi becerisini
 * doğrulanmış işaretlemesine izin vermiyor; rozet yalnızca quiz üzerinden gelir.
 * Bu yüzden yeniden yazma, quizle kazanılmış doğrulamaları sıfırlar —
 * beceri ekleme/çıkarma dışında bu fonksiyonu çağırma.
 */
export async function replaceStudentSkills(
  userId: string,
  skills: StudentProfile['skills']
): Promise<void> {
  const { error: delError } = await supabase
    .from('student_skills')
    .delete()
    .eq('student_id', userId);
  if (delError) fail('Beceriler temizlenemedi', delError);

  if (skills.length === 0) return;

  const { error } = await supabase.from('student_skills').insert(
    skills.map((s) => ({
      student_id: userId,
      name: s.name,
      level: s.level,
      category: toDbSkillCategory(s.category),
      domain: s.domain ?? null,
      years_of_exp: s.yearsOfExp ?? null,
    }))
  );
  if (error) fail('Beceriler kaydedilemedi', error);
}

/**
 * Profil fotoğrafını `avatars` kovasına yükler ve herkese açık adresi döndürür.
 *
 * Eskiden fotoğraf `FileReader.readAsDataURL` ile base64'e çevrilip doğrudan
 * `profiles.avatar_url` alanına yazılıyordu: 2 MB'lık bir fotoğraf ~2.7 MB
 * metne dönüşüp her profil okumasında geri geliyordu. Artık dosya depolamada,
 * veritabanında yalnızca adresi duruyor.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Yalnızca PNG, JPEG veya WEBP yükleyebilirsin.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Fotoğraf en fazla 2 MB olabilir.');
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  // Klasör adı kullanıcı kimliği olmak zorunda: storage politikası bunu şart koşuyor.
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Fotoğraf yüklenemedi: ${error.message}`);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Tarayıcı eski fotoğrafı önbellekten göstermesin.
  return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Dilleri toptan değiştirir. `verified` gönderilmiyor: doğrulama yalnızca
 * sınav üzerinden gelir, öğrenci kendi dilini onaylayamaz.
 */
export async function replaceStudentLanguages(
  userId: string,
  languages: NonNullable<StudentProfile['languages']>
): Promise<void> {
  const { error: delError } = await supabase
    .from('student_languages')
    .delete()
    .eq('student_id', userId);
  if (delError) fail('Diller temizlenemedi', delError);

  if (languages.length === 0) return;

  const { error } = await supabase.from('student_languages').insert(
    languages.map((l) => ({
      student_id: userId,
      language: l.language,
      level: l.level,
      proficiency_text: l.proficiencyText || null,
    }))
  );
  if (error) fail('Diller kaydedilemedi', error);
}

/** Projeleri toptan değiştirir; sıra korunur. */
export async function replaceStudentProjects(
  userId: string,
  projects: StudentProfile['projects']
): Promise<void> {
  const { error: delError } = await supabase
    .from('student_projects')
    .delete()
    .eq('student_id', userId);
  if (delError) fail('Projeler temizlenemedi', delError);

  if (projects.length === 0) return;

  const { error } = await supabase.from('student_projects').insert(
    projects.map((project, index) => ({
      student_id: userId,
      title: project.title,
      description: project.description || null,
      tech_stack: project.techStack ?? [],
      github_url: project.githubUrl || null,
      live_url: project.liveUrl || null,
      sort_order: index,
    }))
  );
  if (error) fail('Projeler kaydedilemedi', error);
}

/**
 * Profil yamasını ilgili tablolara dağıtır.
 *
 * Arayüz tek bir `Partial<StudentProfile>` gönderiyor ama veri dört tabloya
 * yayılmış durumda. Bu dağıtımı bileşenlere bırakmak, her düzenleme ekranının
 * şemayı bilmesini gerektirirdi.
 */
export async function saveStudentProfile(
  userId: string,
  patch: Partial<StudentProfile>
): Promise<void> {
  await updateStudentProfile(userId, patch);
  if (patch.skills) await replaceStudentSkills(userId, patch.skills);
  if (patch.languages) await replaceStudentLanguages(userId, patch.languages);
  if (patch.projects) await replaceStudentProjects(userId, patch.projects);
}

// ---------------------------------------------------------------- Şirket

/*
  `*` DEĞİL, AÇIK SÜTUN LİSTESİ (20261016010000): `companies` tablosunun
  SELECT yetkisi sütun sütun verildi; hr_email, vkn, mersis, doğrulama
  notları, claimed_by/created_by anon ve authenticated'dan geri alındı.
  `select *` o sütunları da istediği için ÖLÇÜLDÜ: "permission denied".
  Liste `toCompanyAccount`ın okuduğu sütunların tamamı; yeni bir alan
  okunacaksa hem buraya hem göçteki grant listesine girmeli.
*/
const COMPANY_SELECT = `
  id, name, slug, logo_url, cover_url, industry, size, location, description,
  website_url, rating, verified, plan, created_at,
  company_members ( recruiter_role, is_owner, profiles ( full_name, email, avatar_url ) )
`;

/** Kullanıcının üye olduğu şirketler. Öğrenci hesabında boş döner. */
export async function fetchMyCompanies(userId: string): Promise<CompanyAccount[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId);

  if (memberError) fail('Şirket üyelikleri yüklenemedi', memberError);
  const ids = (memberships ?? []).map((m) => m.company_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from('companies').select(COMPANY_SELECT).in('id', ids);
  if (error) fail('Şirketler yüklenemedi', error);
  return (data as unknown as CompanyRowWithMembers[]).map(toCompanyAccount);
}

export async function updateCompany(
  companyId: string,
  patch: Partial<CompanyAccount>
): Promise<void> {
  const body = toCompanyUpdate(patch);
  if (Object.keys(body).length === 0) return;

  const { error } = await supabase.from('companies').update(body).eq('id', companyId);
  if (error) fail('Şirket profili güncellenemedi', error);
}

// ---------------------------------------------------------------- Başvurular

/** Öğrencinin kendi başvuruları. */
export async function fetchStudentApplications(userId: string): Promise<ApplicationRecord[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('student_id', userId)
    .order('applied_at', { ascending: false });

  if (error) fail('Başvurular yüklenemedi', error);
  return (data ?? []).map(toApplicationRecord);
}

/** Şirketin ilanlarına gelen başvurular. RLS üyelik kontrolünü yapıyor. */
export async function fetchCompanyApplications(companyId: string): Promise<ApplicationRecord[]> {
  const { data: listingRows, error: listingError } = await supabase
    .from('listings')
    .select('id')
    .eq('company_id', companyId);

  if (listingError) fail('Şirket ilanları yüklenemedi', listingError);
  const listingIds = (listingRows ?? []).map((l) => l.id);
  if (listingIds.length === 0) return [];

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .in('listing_id', listingIds)
    .order('applied_at', { ascending: false });

  if (error) fail('Başvurular yüklenemedi', error);
  return (data ?? []).map(toApplicationRecord);
}

/**
 * Profil kopyası kaydedilecek mi?
 *
 * Üç şart da gerekiyor: veri gerçekten aktarılıyor, öğrenci rıza verdi
 * ve kopyanın içinde bir şey var. Boş nesne, verilmemiş bir paylaşımı
 * kaydetmek olur.
 */
function kopyaYazilacakMi(
  teslimEdiliyor: boolean,
  params: { contactShareConsent: boolean; profileSnapshot?: Record<string, unknown> | null }
): boolean {
  if (!teslimEdiliyor || !params.contactShareConsent) return false;
  const kopya = params.profileSnapshot;
  return Boolean(kopya) && Object.keys(kopya as Record<string, unknown>).length > 0;
}

export async function createApplication(params: {
  listingId: string;
  studentId: string;
  matchScore: number;
  coverLetter?: string;
  /** İlanın başvuru yöntemi; teslim davranışını bu belirliyor. */
  applicationMethod: 'external' | 'internal' | 'email_application';
  /** KVKK açık rızası. Veri aktarılan yöntemlerde zorunlu. */
  contactShareConsent: boolean;
  consentVersion: string;
  /** Doğrulanmış başvuru kanalı varsa kimliği; teslim kararında kullanılıyor. */
  applicationChannelId?: string;
  /**
   * Başvuru anındaki profil kopyası (`basvuruKopyasi`).
   *
   * Şirketin gördüğü ad/okul/bölüm YALNIZCA buradan geliyor: `profiles`
   * tablosunu şirket okuyamıyor. Rıza verilmediyse yazılmıyor.
   */
  profileSnapshot?: Record<string, unknown> | null;
  /**
   * Başvuru anındaki CV KOPYASININ depolama yolu.
   *
   * Profildeki `cv_path` DEĞİL: burada duran şey, başvuru anında
   * çıkarılmış ayrı bir dosya (lib/cv.ts · cvBasvuruKopyasiCikar).
   * Profilin yolunu kopyalasaydık öğrenci CV'sini değiştirdiğinde şirket
   * ekranındaki belge de sessizce değişirdi.
   *
   * Yol, veritabanındaki tetikleyiciyle öğrencinin kendi klasörüne
   * sınırlı (applications_guard_cv_path): başkasının dosyasını kendi
   * başvurusuna bağlayıp şirkete okutmak mümkün değil.
   */
  cvSnapshotPath?: string | null;
}): Promise<ApplicationRecord> {
  /*
    Açık rıza yalnızca veri gerçekten aktarılıyorsa zorunlu. Dış ilanlarda
    hiçbir şey aktarılmıyor — kayıt öğrencinin kendi takip listesi. Olmayan
    bir aktarım için rıza toplamak hem gereksiz hem yanıltıcı.
  */
  const yol = basvuruYolu({
    applicationMethod: params.applicationMethod,
    applicationChannelId: params.applicationChannelId,
  });
  if (yol.teslimEdiliyor && !params.contactShareConsent) {
    throw new Error('Bilgilerinin şirketle paylaşılmasına izin vermeden başvuru gönderilemez.');
  }

  /*
    Teslim durumu bilinçli olarak burada belirleniyor:
    - internal      → başvuru platformda kalıyor, e-posta yok
    - external      → şirketin kendi sistemi asıl kanal; bizdeki kayıt talep
                      sinyali. Doğrulanmış bir adres olmadığı için gönderilmedi
                      olarak işaretleniyor, "bekliyor" demek yanıltıcı olurdu.
    - email_application → doğrulanmış kanala gönderilmek üzere kuyruğa girer
  */
  const deliveryStatus = yol.teslimEdiliyor
    ? (params.applicationMethod === 'email_application' ? 'pending' : 'not_required')
    : 'skipped_unverified';

  const { data, error } = await supabase
    .from('applications')
    .insert({
      listing_id: params.listingId,
      student_id: params.studentId,
      match_score: Math.round(params.matchScore),
      cover_letter: params.coverLetter ?? null,
      application_method: params.applicationMethod,
      // Rıza kaydı gerçeği yansıtsın: onay verilmediyse damga da atılmıyor.
      contact_share_consent_at: params.contactShareConsent ? new Date().toISOString() : null,
      contact_share_consent_version: params.contactShareConsent ? params.consentVersion : null,
      /*
        Kopya yalnızca veri gerçekten aktarılıyorsa VE rıza varsa
        yazılıyor. Dış ilanlarda hiçbir şey aktarılmıyor; oraya kopya
        koymak, verilmemiş bir paylaşımı kaydetmek olurdu.

        Boş nesne de yazılmıyor: içi boş bir kopya, şirkete "paylaşıldı
        ama hiçbir şey yok" diyen bir kart üretirdi.
      */
      profile_snapshot: (kopyaYazilacakMi(yol.teslimEdiliyor, params)
        ? params.profileSnapshot
        : null) as never,
      /*
        CV kopyası YALNIZCA teslim edilen başvuruda yazılıyor. Dış ilanda
        şirkete hiçbir şey gitmiyor; oraya bir belge bağlamak, yapılmamış
        bir paylaşımı kaydetmek olurdu.

        `cv_path` (eski alan) yeni kod tarafından HİÇ yazılmıyor; okuma
        tarafında yalnızca geriye uyumluluk için sonda duruyor.
      */
      cv_snapshot_path: yol.teslimEdiliyor ? (params.cvSnapshotPath ?? null) : null,
      email_delivery_status: deliveryStatus,
      created_via: 'web',
    })
    .select('*')
    .single();

  // 23505 = unique_violation; şemada (listing_id, student_id) tekil.
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error('Bu ilana zaten başvurdunuz.');
    }
    fail('Başvuru gönderilemedi', error);
  }
  return toApplicationRecord(data);
}

/** Öğrencinin başvurusunu geri çekmesi. Şemada öğrenci yalnızca `withdrawn` yapabilir. */
export async function withdrawApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId);
  if (error) fail('Başvuru geri çekilemedi', error);
}

/**
 * GÖRÜŞME DAVETİNE YANIT
 *
 * Teklif yanıtıyla aynı biçim ve aynı gerekçe: karar yalnızca davetin
 * açık olduğu andan verilebilmeli ve iki paralel istek tutarsız sonuç
 * üretmemeli. `gorusmeye_yanit_ver` satırı kilitleyip o anki yanıtı
 * okuyor; zaten yanıtlanmışsa hata değil, mevcut yanıt dönüyor.
 *
 * Dönen değer sunucunun gördüğü nihai yanıt.
 */
export async function respondToInterview(
  applicationId: string,
  katilacak: boolean
): Promise<string> {
  const { data, error } = await supabase.rpc('gorusmeye_yanit_ver', {
    p_basvuru: applicationId,
    p_katilacak: katilacak,
  });
  if (error) fail('Görüşme yanıtın kaydedilemedi', error);
  return data as string;
}

/**
 * TEKLİFE YANIT — KABUL YA DA RET
 *
 * Doğrudan UPDATE ile yapılamıyor ve yapılmamalı: öğrencinin güncelleme
 * politikası sonucun `withdrawn` olmasını şart koşuyor. Kabul/ret tek
 * kapıdan geçiyor — `teklife_yanit_ver`. O işlev satırı kilitleyip O ANKİ
 * durumu okuyor, yani:
 *
 *   * yalnızca `offer_extended` durumundan karar verilebiliyor,
 *   * aynı anda gelen iki istek tutarsız bir sonuç üretmiyor,
 *   * zaten yanıtlanmış bir teklif ikinci kez yanıtlandığında HATA
 *     DEĞİL, mevcut sonuç dönüyor.
 *
 * Dönen değer sunucunun gördüğü nihai durum; ekran onu yazıyor, kendi
 * tahminini değil.
 */
export async function respondToOffer(
  applicationId: string,
  kabul: boolean
): Promise<ApplicationRecord['status']> {
  const { data, error } = await supabase.rpc('teklife_yanit_ver', {
    p_basvuru: applicationId,
    p_kabul: kabul,
  });
  if (error) fail(kabul ? 'Teklif kabul edilemedi' : 'Teklif reddedilemedi', error);
  return data as ApplicationRecord['status'];
}

/**
 * KABUL EDİLMİŞ TEKLİFTE ŞİRKET YETKİLİSİNİN İLETİŞİMİ
 *
 * `profiles` tablosunun okuma kuralı yalnızca kişinin kendisine açık ve
 * öyle kalıyor: öğrenci şirket yetkilisinin satırını okuyamıyor. Bu
 * işlev, teklif kabul edildiyse yalnızca o başvurunun karşı tarafını
 * döndüren tek kapı.
 *
 * Kapı kapalıysa satır yok — `null` dönüyor, hata değil.
 */
export async function fetchApplicationContact(applicationId: string): Promise<{
  ad: string | null;
  eposta: string | null;
  telefon: string | null;
  unvan: string | null;
} | null> {
  const { data, error } = await supabase.rpc('basvuru_iletisimi', { p_basvuru: applicationId });
  if (error) fail('İletişim bilgileri şu anda yüklenemedi', error);
  const satir = (data ?? [])[0];
  return satir
    ? { ad: satir.ad, eposta: satir.eposta, telefon: satir.telefon, unvan: satir.unvan }
    : null;
}

/** Şirket tarafı durum güncellemesi. */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationRecord['status'],
  /*
    `interviewNotes` buradan cikarildi: dahili not artik ayri bir tabloda.
    Not yazmak icin addApplicationNote kullanilmali.

    `companyFeedback` OGRENCIYE GORUNUR. Adi bunu soyluyor ama cagiran taraf
    yanlislikla dahili not gecirebiliyordu -- sirket portali tam olarak bunu
    yapiyordu.
  */
  extras: { companyFeedback?: string; interviewDate?: string } = {}
): Promise<void> {
  const body: TablesUpdate<'applications'> = { status };
  if (extras.companyFeedback !== undefined) body.company_feedback = extras.companyFeedback;
  if (extras.interviewDate !== undefined) body.interview_date = extras.interviewDate || null;

  const { error } = await supabase.from('applications').update(body).eq('id', applicationId);
  if (error) fail('Başvuru durumu güncellenemedi', error);
}

// ---------------------------------------------------------------- Quizler

/**
 * Aktif quizler ve cevapsız soruları.
 * `quiz_questions` tablosuna istemcinin SELECT hakkı yok; sorular cevapsız view'dan gelir.
 */
export async function fetchQuizzes(): Promise<SkillQuiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*, quiz_questions_public ( * )')
    .eq('is_active', true);

  if (error) fail('Quizler yüklenemedi', error);
  return (data as unknown as QuizRowWithQuestions[]).map(toSkillQuiz);
}

// ---------------------------------------------------------------- Şirket sahiplenme

export interface CompanyClaim {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  companyWebsite?: string;
  contactName: string;
  contactTitle?: string;
  workEmail: string;
  phone?: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  createdAt: string;
}

/**
 * Sahiplenme talebi oluşturur.
 *
 * `user_id` istemciden gelmiyor gibi görünse de RLS politikası
 * `user_id = auth.uid()` şartını koyuyor; başkasının adına talep açılamıyor.
 * E-posta küçük harfe çevriliyor çünkü veritabanında citext yok.
 */
export async function createCompanyClaim(params: {
  companyId: string;
  userId: string;
  contactName: string;
  contactTitle?: string;
  workEmail: string;
  phone?: string;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.from('company_claims').insert({
    company_id: params.companyId,
    user_id: params.userId,
    contact_name: params.contactName.trim(),
    contact_title: params.contactTitle?.trim() || null,
    work_email: params.workEmail.trim().toLowerCase(),
    phone: params.phone?.trim() || null,
    note: params.note?.trim() || null,
  } as never);

  if (error) {
    // Kısmi tekil index: aynı şirket için bekleyen ikinci talep açılamıyor.
    if (error.code === '23505') {
      throw new Error('Bu şirket için zaten bekleyen bir talebiniz var.');
    }
    fail('Talep gönderilemedi', error);
  }
}

/** Kullanıcının bu şirket için mevcut talebi (varsa). */
export async function fetchMyClaim(
  companyId: string,
  userId: string
): Promise<CompanyClaim | null> {
  const { data, error } = await supabase
    .from('company_claims')
    .select('id,company_id,contact_name,contact_title,work_email,phone,note,status,reject_reason,created_at')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) fail('Talep durumu okunamadı', error);
  if (!data) return null;

  const row = data as Record<string, string | null>;
  return {
    id: row.id!,
    companyId: row.company_id!,
    companyName: '',
    companySlug: '',
    contactName: row.contact_name!,
    contactTitle: row.contact_title ?? undefined,
    workEmail: row.work_email!,
    phone: row.phone ?? undefined,
    note: row.note ?? undefined,
    status: row.status as CompanyClaim['status'],
    rejectReason: row.reject_reason ?? undefined,
    createdAt: row.created_at!,
  };
}

/** Yönetici kuyruğu. RLS yalnızca admin'e tüm satırları veriyor. */
export async function fetchPendingClaims(): Promise<CompanyClaim[]> {
  const { data, error } = await supabase
    .from('company_claims')
    .select(
      'id,company_id,contact_name,contact_title,work_email,phone,note,status,created_at,' +
        'companies(name,slug,website_url)'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) fail('Talepler yüklenemedi', error);

  return (data ?? []).map((r) => {
    const row = r as Record<string, any>;
    const sirket = row.companies ?? {};
    return {
      id: row.id,
      companyId: row.company_id,
      companyName: sirket.name ?? '(şirket silinmiş)',
      companySlug: sirket.slug ?? '',
      companyWebsite: sirket.website_url ?? undefined,
      contactName: row.contact_name,
      contactTitle: row.contact_title ?? undefined,
      workEmail: row.work_email,
      phone: row.phone ?? undefined,
      note: row.note ?? undefined,
      status: row.status,
      createdAt: row.created_at,
    };
  });
}

/**
 * Onay ve ret sunucudaki fonksiyonlar üzerinden yapılıyor.
 *
 * Doğrudan UPDATE yolu bilerek kapalı: onay üç tabloya birden yazıyor
 * (talep, üyelik, şirket) ve bunların yarısı yazılıp yarısı yazılmasa
 * yetki yarım kalırdı. Ayrıca yetki kontrolü fonksiyonun içinde.
 */
export async function approveCompanyClaim(claimId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_company_claim', { claim_id: claimId } as never);
  if (error) fail('Talep onaylanamadı', error);
}

export async function rejectCompanyClaim(claimId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_company_claim', {
    claim_id: claimId,
    reason,
  } as never);
  if (error) fail('Talep reddedilemedi', error);
}

/** Giriş yapan kişi yönetici mi? RLS politikalarının kullandığı fonksiyon. */
export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return Boolean(data);
}

// ---------------------------------------------------------------- İlan onay kuyruğu

export interface PendingListing {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  city?: string;
  workType: string;
  description?: string;
  requiredSkills: string[];
  isPaid: boolean | null;
  stipendText?: string;
  applicationDeadline?: string;
  createdAt: string;
  /** Kuyruğa hangi yoldan geldi: şirketin formu mu, elle mi eklendi. */
  origin: 'internal' | 'manual';
}

/**
 * Onay bekleyen ilanlar.
 *
 * Yalnızca `origin = 'internal'` olanlar: şirketin kendi girdiği ilanlar.
 * Otomasyonun derlediği ilanlar (`scraped`) bu kuyruğa girmiyor — onlar
 * zaten şirketin kendi sayfasında yayınlanmış, ayrıca onaylamak anlamsız
 * ve kuyruğu boğardı.
 */
export async function fetchPendingListings(): Promise<PendingListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id,title,company_id,city,work_type,description,required_skills,is_paid,' +
        'stipend_text,application_deadline,created_at,origin,companies(name)'
    )
    .eq('status', 'draft')
    /*
      ELLE EKLENEN İLAN DA KUYRUĞA DÜŞER

      Filtre yalnızca 'internal' idi: şirketin kendi formundan gelen ilan.
      Bir ilanı kaynağından okuyup elle girdiğimizde origin 'manual' oluyor
      ve ilan hiçbir yerde görünmüyordu — sitede değil (taslak), kuyrukta da
      değil (filtre dışı). Kayıt veritabanında duruyor ama onu yayına
      alabilecek bir ekran yok.

      `scraped` BİLEREK DIŞARIDA: otomasyonun derledikleri zaten şirketin
      kendi kariyer sayfasında yayınlanmış ve service_role ile doğrudan
      yayına giriyor. Onları kuyruğa doldurmak kuyruğu kullanılamaz yapardı
      — bileşenin başındaki not bunu anlatıyor.
    */
    .in('origin', ['internal', 'manual'])
    .order('created_at', { ascending: true });

  if (error) fail('Bekleyen ilanlar yüklenemedi', error);

  return (data ?? []).map((r) => {
    const row = r as Record<string, any>;
    return {
      id: row.id,
      title: row.title,
      companyId: row.company_id,
      companyName: row.companies?.name ?? '(şirket yok)',
      city: row.city ?? undefined,
      workType: row.work_type,
      description: row.description ?? undefined,
      requiredSkills: row.required_skills ?? [],
      isPaid: row.is_paid,
      stipendText: row.stipend_text ?? undefined,
      applicationDeadline: row.application_deadline ?? undefined,
      createdAt: row.created_at,
      origin: row.origin,
    };
  });
}

/**
 * İlanı yayına alır.
 *
 * Yetki kontrolü burada değil veritabanında: `listings_publish_guard`
 * tetikleyicisi yönetici olmayan hiç kimsenin bir ilanı 'published'
 * durumuna geçirmesine izin vermiyor. Buradaki çağrı yalnızca isteği
 * iletiyor; reddedilirse hata yükseliyor.
 */
export async function publishListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'published', posted_at: new Date().toISOString() })
    .eq('id', listingId);
  if (error) fail('İlan yayına alınamadı', error);
}

/** Reddedilen ilan silinmiyor, arşivleniyor: şirket ne olduğunu görebilmeli. */
export async function archiveListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'archived' })
    .eq('id', listingId);
  if (error) fail('İlan arşivlenemedi', error);
}


// ---------------------------------------------------------------- Dahili notlar

export interface ApplicationNote {
  id: string;
  note: string;
  createdAt: string;
}

/**
 * Şirketin başvuru hakkındaki dahili notları.
 *
 * Öğrenci bu tabloyu HİÇBİR koşulda göremiyor: `application_notes` üzerinde
 * öğrenciye açık tek bir politika yok, dolayısıyla RLS onu tamamen dışarıda
 * bırakıyor. Adaya gösterilecek metin `applications.company_feedback`.
 */
export async function fetchApplicationNotes(applicationId: string): Promise<ApplicationNote[]> {
  const { data, error } = await supabase
    .from('application_notes')
    .select('id,note,created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) fail('Notlar yüklenemedi', error);
  return (data ?? []).map((r) => {
    const row = r as Record<string, string>;
    return { id: row.id, note: row.note, createdAt: row.created_at };
  });
}

export async function addApplicationNote(
  applicationId: string,
  authorId: string,
  note: string
): Promise<void> {
  const { error } = await supabase.from('application_notes').insert({
    application_id: applicationId,
    author_id: authorId,
    note: note.trim(),
  } as never);
  if (error) fail('Not eklenemedi', error);
}

// ---------------------------------------------------------------- Yetenek havuzu

export interface TalentPoolStat {
  toplam: number;
  enCokBolum: Array<{ ad: string; sayi: number }>;
  enCokSehir: Array<{ ad: string; sayi: number }>;
}

/**
 * İşveren rehberindeki "şu anda staj arayan öğrenciler" sayısı.
 *
 * TOPLU sayı döndürüyor, kişi listesi değil. Sebep KVKK: bir işverene tek tek
 * öğrenci profili göstermek, öğrencinin açık rızası ve şirketin doğrulanmış
 * olması şartlarına bağlı. Toplu sayı ise kimseyi tanımlanabilir kılmıyor ve
 * ilk günden çalışıyor — 5 öğrenci varsa "5" yazar, dürüst ve yine ikna edici.
 *
 * Sayım yalnızca teklife açık öğrencileri kapsıyor; profilini kapalı tutan
 * öğrenci bu sayıya girmiyor.
 */
export async function fetchTalentPoolStats(): Promise<TalentPoolStat> {
  /*
    TOPLU SAYI ARTIK SATIR OKUMUYOR

    Önce `student_profiles` satırları çekilip burada sayılıyordu. O erişim
    kapatıldı: doğrulanmış bir şirket, kendisine hiç başvurmamış
    öğrencilerin profilini okuyabiliyordu. Toplu sayı kimseyi
    tanımlanabilir kılmadığı için ayrı bir fonksiyona alındı.
  */
  const { data: ozet, error: ozetHatasi } = await (supabase as any).rpc(
    'staj_arayan_ogrenci_ozeti'
  );
  if (!ozetHatasi && Array.isArray(ozet) && ozet.length > 0) {
    const satir = ozet[0] as { toplam: number; en_cok_bolum: string | null; en_cok_sehir: string | null };
    return {
      toplam: Number(satir.toplam ?? 0),
      enCokBolum: satir.en_cok_bolum ? [{ ad: satir.en_cok_bolum, sayi: 0 }] : [],
      enCokSehir: satir.en_cok_sehir ? [{ ad: satir.en_cok_sehir, sayi: 0 }] : [],
    };
  }

  const { data, error } = await supabase
    .from('student_profiles')
    .select('department, pref_cities')
    .eq('is_open_to_offers', true);

  if (error) fail('Öğrenci sayısı okunamadı', error);

  const rows = (data ?? []) as Array<{ department: string | null; pref_cities: string[] | null }>;

  const say = (degerler: string[]) => {
    const harita = new Map<string, number>();
    for (const d of degerler) {
      const temiz = (d ?? '').trim();
      if (temiz) harita.set(temiz, (harita.get(temiz) ?? 0) + 1);
    }
    return [...harita.entries()]
      .map(([ad, sayi]) => ({ ad, sayi }))
      .sort((a, b) => b.sayi - a.sayi || a.ad.localeCompare(b.ad, 'tr'))
      .slice(0, 4);
  };

  return {
    toplam: rows.length,
    enCokBolum: say(rows.map((r) => r.department ?? '')),
    enCokSehir: say(rows.flatMap((r) => r.pref_cities ?? [])),
  };
}


// ---------------------------------------------------------------- Test sonucu

export interface QuizResult {
  toplam: number;
  dogru: number;
  gecmeNotu: number;
  gecti: boolean;
  rozet: string | null;
  yetenek: string;
}

/**
 * Test cevaplarını sunucuya gönderir ve puanı SUNUCUDAN alır.
 *
 * Puan istemcide hesaplanmıyor. Doğru cevaplar veritabanından hiç çıkmıyor:
 * `quiz_questions.correct_index` sütununda hiçbir API rolünün SELECT hakkı
 * yok. `quiz_attempts` tablosuna doğrudan INSERT de kapalı — tek yazma yolu
 * bu fonksiyon. Olmasaydı öğrenci kendine 5/5 yazıp rozet alabilirdi.
 *
 * Rozeti de sunucu veriyor: geçildiyse `student_profiles.earned_badges`
 * dizisine ekleniyor.
 */
export async function submitQuizAttempt(
  quizId: string,
  answers: Record<string, number>
): Promise<QuizResult> {
  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: quizId,
    p_answers: answers,
  } as never);

  if (error) fail('Test sonucu kaydedilemedi', error);
  return data as unknown as QuizResult;
}

// ---------------------------------------------------------------- Yönetim özeti

export interface AdminOzet {
  ogrenci: number;
  profilDolu: number;
  teklifeAcik: number;
  rozet: number;
  basvuru: number;
  /** Yayındaki ilanın tamamı. */
  ilanYayinToplam: number;
  /** Şirketin StajımVar'da kendisi açtığı ilan; başvuru site içinde toplanıyor. */
  ilanNative: number;
  /** Elle eklenen ilan; kariyer sayfasına yönlendiriyor. */
  ilanElle: number;
  /** Taramadan gelen ilan; kariyer sayfasına yönlendiriyor. */
  ilanTaranan: number;
  /** İncelenmeyi bekleyen taslakların tamamı. */
  taslakToplam: number;
  taslakNative: number;
  taslakTaranan: number;
  sirket: number;
  sahiplenmis: number;
  bekleyenTalep: number;
  sonTarama: { zaman: string; durum: string; bulunan: number } | null;
  /** Son 7 gün; kaydı olmayan günler de 0 ile geliyor. */
  sonKayitlar: Array<{ tarih: string; sayi: number }>;
}

/**
 * Yönetim panelindeki sayılar.
 *
 * NEDEN TEK BİR RPC
 * -----------------
 * Bu sayılar eskiden tarayıcıdan tablo tablo `count` ile alınıyordu ve
 * sessizce yanlış çıkıyordu:
 *
 *   - `listings` ve `companies` SELECT iznini sütun sütun veriyor, bu yüzden
 *     `select('*')` 42501 ile düşüyordu;
 *   - `applications` üzerinde yöneticiyi kapsayan bir RLS politikası yok.
 *
 * Hata yakalanıp 0 döndürüldüğü için panel 189 yayındaki ilanı "0 yayındaki
 * ilan" diye gösteriyordu. Sayıyı sunucuda üretmek her iki sorunu da çözüyor.
 *
 * HATA ARTIK YUTULMUYOR
 * ---------------------
 * RPC düşerse `fail` ile yükseliyor ve panel hata durumuna geçiyor. Yanlış
 * sıfır göstermek, hiç göstermemekten daha kötü: sıfır, "ölçtüm ve yok"
 * demektir.
 *
 * Satır çekilmiyor, yalnız sayı dönüyor: panelin kaç öğrenci kayıtlı olduğunu
 * bilmesi yeterli, kimlerin kayıtlı olduğunu dolaştırması gerekmiyor.
 */
export async function fetchAdminOzet(): Promise<AdminOzet> {
  const { data, error } = await supabase.rpc('yonetim_ozet' as never);
  if (error) fail('Yönetim özeti alınamadı', error);
  return data as unknown as AdminOzet;
}

/* ------------------------------------------------------------------ */
/* ZİYARETÇİ TRAFİĞİ — YÖNETİCİ                                        */
/* ------------------------------------------------------------------ */

/*
  Bu iki uç, panelin ziyaretçi sayılarını GERÇEK veriden besliyor. Daha
  önce sayılar demo bir üreteçten geliyordu; paneli telefonda açan kişi
  "23 kişi bakıyor" yazısını gerçek sandı. Demo uyarısı kenar çubuğunun
  dibindeydi ve mobilde kenar çubuğu hamburger menüsünün arkasında
  olduğu için hiç görünmüyordu.

  Veri henüz birikmemişse sayılar sıfır, listeler boş geliyor. Bu
  dürüst bir cevap: sıfır "ölçtüm ve yok" demek.
*/

export interface CanliOturumKaydi {
  kimlik: string;
  ad: string | null;
  rol: string | null;
  yol: string;
  sayfaAdi: string;
  sehir: string | null;
  ulke: string | null;
  cihaz: string | null;
  kaynak: string | null;
  basladi: string;
}

export interface CanliOlayKaydi {
  tur: 'girdi' | 'sayfa' | 'basvuru' | 'cikti';
  an: string;
  ad: string | null;
  rol: string | null;
  sayfaAdi: string;
  sehir: string | null;
  cihaz: string | null;
  kaynak: string | null;
}

export interface CanliOzet {
  bakiyor: number;
  bugunGiren: number;
  bugunCikan: number;
  sayfaBakisi: number;
  oturumlar: CanliOturumKaydi[];
  olaylar: CanliOlayKaydi[];
}

export async function fetchYonetimCanli(): Promise<CanliOzet> {
  const { data, error } = await supabase.rpc('yonetim_canli' as never);
  if (error) fail('Canlı akış alınamadı', error);
  return data as unknown as CanliOzet;
}

export interface TrafikOzeti {
  donem: string;
  tekil: number;
  goruntuleme: number;
  bounce: number;
  ortalamaOturum: number;
  gunler: Array<{ tarih: string; etiket: string; tekil: number; goruntuleme: number }>;
  kaynaklar: Array<{ ad: string; adet: number }>;
  sehirler: Array<{ ad: string; adet: number }>;
  cihazlar: Array<{ ad: string; adet: number }>;
  sayfalar: Array<{ ad: string; adet: number }>;
  huni: Array<{ ad: string; adet: number }>;
}

export async function fetchYonetimTrafik(
  donem: 'bugun' | 'yedi' | 'otuz' = 'yedi',
): Promise<TrafikOzeti> {
  const { data, error } = await supabase.rpc('yonetim_trafik' as never, {
    p_donem: donem,
  } as never);
  if (error) fail('Trafik özeti alınamadı', error);
  return data as unknown as TrafikOzeti;
}

/* ------------------------------------------------------------------ */
/* ONAY KUYRUĞU — YÖNETİCİ                                             */
/* ------------------------------------------------------------------ */

export interface OnayIlani {
  id: string;
  baslik: string;
  sirket: string | null;
  sehir: string | null;
  ulke: string | null;
  kaynak: string;
  calisma: string | null;
  basvuruYolu: string | null;
  adres: string | null;
  sonBasvuru: string | null;
  kaynakDurumu: string | null;
  aciklamaUzunluk: number;
  olustu: string;
  guncellendi: string | null;
}

export interface OnaySahiplenme {
  id: string;
  sirket: string | null;
  kisi: string | null;
  unvan: string | null;
  eposta: string | null;
  not: string | null;
  olustu: string;
}

export interface OnayBolum {
  id: string;
  istenen: string | null;
  universite: string | null;
  aciklama: string | null;
  olustu: string;
}

export interface OnayKuyrugu {
  ilanlar: OnayIlani[];
  sahiplenmeler: OnaySahiplenme[];
  bolumler: OnayBolum[];
}

export async function fetchOnayKuyrugu(): Promise<OnayKuyrugu> {
  const { data, error } = await supabase.rpc('yonetim_onay_kuyrugu' as never);
  if (error) fail('Onay kuyruğu alınamadı', error);
  return data as unknown as OnayKuyrugu;
}

/**
 * İlanı yayına alır ya da reddeder.
 *
 * Ret SİLMİYOR, arşivliyor: reddedilen ilan kayıtta kalıyor, kararı geri
 * almak mümkün ve neyin neden elendiği görülebiliyor.
 *
 * `beklenenGuncellendi` gönderiliyor: iki yönetici aynı kuyruğa bakarken
 * biri karar verdikten sonra ötekinin kararı sessizce üzerine yazmasın.
 */
export async function ilanKarariVer(
  id: string,
  karar: 'onayla' | 'reddet',
  beklenenGuncellendi?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('yonetim_ilan_karari' as never, {
    p_id: id,
    p_karar: karar,
    p_beklenen_updated_at: beklenenGuncellendi ?? null,
  } as never);
  if (error) fail('İlan kararı uygulanamadı', error);
}

/* ------------------------------------------------------------------ */
/* İLAN BİLDİRİMLERİ — YÖNETİCİ İNCELEMESİ                             */
/* ------------------------------------------------------------------ */

export type IlanBildirimDurumu = 'yeni' | 'inceleniyor' | 'kapatildi';

export interface IlanBildirimi {
  id: string;
  listingUrl: string;
  companyName?: string;
  positionTitle?: string;
  reason: string;
  details?: string;
  /**
   * İLETİŞİM E-POSTASI
   *
   * Alan yalnızca yöneticiye geliyor; RLS `select` politikası tabloyu
   * `is_admin()` dışına hiç açmıyor, yani yetkisiz bir istemci satırı
   * alamadığı için bu alanı da alamıyor. Arayüzde saklamak tek başına
   * yeterli olmazdı — veri gelmiyor.
   */
  reporterEmail?: string;
  status: IlanBildirimDurumu;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  notifiedAt?: string;
  notifyAttempts: number;
  notifyLastError?: string;
  notifyNextAttemptAt?: string;
  testMi: boolean;
}

/**
 * Yöneticinin gördüğü bildirim listesi.
 *
 * Görünüm (`ilan_bildirim_kuyrugu`) yerine tablo okunuyor: görünüm yalnız
 * BEKLEYEN kayıtları veriyor, yönetici ekranı ise gönderilmişleri ve
 * denemesi TÜKENMİŞ olanları da göstermek zorunda.
 */
export async function fetchIlanBildirimleri(): Promise<IlanBildirimi[]> {
  const { data, error } = await supabase
    .from('listing_reports')
    .select(
      'id,listing_url,company_name,position_title,reason,details,reporter_email,' +
        'status,review_note,reviewed_at,created_at,notified_at,notify_attempts,' +
        'notify_last_error,notify_next_attempt_at,test_mi'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) fail('İlan bildirimleri yüklenemedi', error);

  return (data ?? []).map((r) => {
    const row = r as Record<string, any>;
    return {
      id: row.id,
      listingUrl: row.listing_url,
      companyName: row.company_name ?? undefined,
      positionTitle: row.position_title ?? undefined,
      reason: row.reason,
      details: row.details ?? undefined,
      reporterEmail: row.reporter_email ?? undefined,
      status: row.status,
      reviewNote: row.review_note ?? undefined,
      reviewedAt: row.reviewed_at ?? undefined,
      createdAt: row.created_at,
      notifiedAt: row.notified_at ?? undefined,
      notifyAttempts: row.notify_attempts ?? 0,
      notifyLastError: row.notify_last_error ?? undefined,
      notifyNextAttemptAt: row.notify_next_attempt_at ?? undefined,
      testMi: Boolean(row.test_mi),
    };
  });
}

/**
 * Durumu ve sonuç notunu yazar.
 *
 * Doğrudan `update` yerine RPC: politika yöneticiye satırın tamamını
 * açıyor ve arayüzün kuyruk alanlarına (deneme sayısı, sonraki deneme)
 * yazma yetkisi olmamalı. Yetki de fonksiyonun İÇİNDE denetleniyor.
 */
export async function ilanBildirimiIncele(
  id: string,
  durum: IlanBildirimDurumu,
  sonucNotu: string
): Promise<void> {
  const { error } = await supabase.rpc('ilan_bildirimi_incele', {
    p_id: id,
    p_durum: durum,
    p_not: sonucNotu,
  });
  if (error) fail('Bildirim güncellenemedi', error);
}

/** Denemesi tükenmiş bildirimi yeniden kuyruğa alır (yalnız yönetici). */
export async function ilanBildirimiYenidenDene(id: string): Promise<void> {
  const { error } = await supabase.rpc('ilan_bildirimi_yeniden_dene', { p_id: id });
  if (error) fail('Bildirim yeniden kuyruğa alınamadı', error);
}

/* ------------------------------------------------------------------ */
/* KİŞİSEL BAŞVURU TAKİBİ                                              */
/* ------------------------------------------------------------------ */

export type KisiselBasvuruDurumu =
  | 'basvurdum'
  | 'bekliyorum'
  | 'gorusme'
  | 'teklif'
  | 'olumsuz'
  | 'vazgectim';

export interface BasvuruTakibi {
  id: string;
  listingId?: string;
  listingTitle: string;
  companyName?: string;
  /** Gerçek başvuru kaydı — external'da yok. */
  applicationId?: string;
  channel: 'external' | 'email_application' | 'internal';
  appliedAt: string;
  personalStatus: KisiselBasvuruDurumu;
  personalNote?: string;
  createdAt: string;
  updatedAt: string;
}

const TAKIP_ALANLARI =
  'id,listing_id,listing_title,company_name,application_id,channel,' +
  'applied_at,personal_status,personal_note,created_at,updated_at';

function takibeCevir(row: Record<string, any>): BasvuruTakibi {
  return {
    id: row.id,
    listingId: row.listing_id ?? undefined,
    listingTitle: row.listing_title ?? '(ilan adı yok)',
    companyName: row.company_name ?? undefined,
    applicationId: row.application_id ?? undefined,
    channel: row.channel,
    appliedAt: row.applied_at,
    personalStatus: row.personal_status,
    personalNote: row.personal_note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Öğrencinin kendi takip defteri.
 *
 * RLS `student_id = auth.uid()` olduğu için sorguya kullanıcı filtresi
 * YAZILMIYOR: istemcide filtre, güvenlik değil görünüm olurdu.
 */
export async function fetchBasvuruTakibi(): Promise<BasvuruTakibi[]> {
  const { data, error } = await supabase
    .from('application_tracking')
    .select(TAKIP_ALANLARI)
    .order('applied_at', { ascending: false });

  if (error) fail('Başvuru takibi yüklenemedi', error);
  return (data ?? []).map((r) => takibeCevir(r as Record<string, any>));
}

/**
 * "Başvurdum" işareti — HARİCİ ilanlar için.
 *
 * Bu kayıt şirkete hiçbir şey göndermiyor; `applications` tablosuna da
 * dokunmuyor. Harici bağlantıya tıklamak bunu TETİKLEMİYOR: öğrencinin
 * ayrı ve açık bir işlemi.
 *
 * İlan başlığı ve şirket adı satıra yazılıyor (anlık görüntü): ilan
 * sonradan değişse ya da silinse bile defter okunabilir kalıyor.
 */
export async function basvurdumIsaretle(girdi: {
  listingId: string;
  listingTitle: string;
  companyName?: string;
  studentId: string;
}): Promise<BasvuruTakibi> {
  const { data, error } = await supabase
    .from('application_tracking')
    .insert({
      student_id: girdi.studentId,
      listing_id: girdi.listingId,
      listing_title: girdi.listingTitle,
      company_name: girdi.companyName ?? null,
      channel: 'external',
      personal_status: 'basvurdum',
    })
    .select(TAKIP_ALANLARI)
    .single();

  /*
    Mükerrer işaret hata DEĞİL: kullanıcı iki kez bastıysa mevcut kaydı
    döndürüyoruz. `23505` unique ihlali.
  */
  if (error && (error as { code?: string }).code === '23505') {
    const { data: mevcut, error: okumaHatasi } = await supabase
      .from('application_tracking')
      .select(TAKIP_ALANLARI)
      .eq('listing_id', girdi.listingId)
      .is('application_id', null)
      .maybeSingle();
    if (okumaHatasi || !mevcut) fail('Takip kaydı okunamadı', okumaHatasi);
    return takibeCevir(mevcut as Record<string, any>);
  }
  if (error) fail('Takip kaydı oluşturulamadı', error);
  return takibeCevir(data as Record<string, any>);
}

/** Kişisel durum ve not — yalnız öğrencinin kendi alanları. */
export async function takipGuncelle(
  id: string,
  degisiklik: { personalStatus?: KisiselBasvuruDurumu; personalNote?: string }
): Promise<void> {
  /*
    Tip `Record<string, unknown>` DEĞİL: üretilen `Update` şekli yalnız
    öğrencinin kendi alanlarını içeriyor ve gevşek bir sözlük o kapıyı
    açardı — `student_id` göndermek derleme hatası olmalı.
  */
  const govde: TablesUpdate<'application_tracking'> = {};
  if (degisiklik.personalStatus) govde.personal_status = degisiklik.personalStatus;
  if (degisiklik.personalNote !== undefined) {
    govde.personal_note = degisiklik.personalNote.trim() || null;
  }
  if (Object.keys(govde).length === 0) return;

  const { error } = await supabase.from('application_tracking').update(govde).eq('id', id);
  if (error) fail('Takip güncellenemedi', error);
}

/** Takip kaydını siler. Gerçek başvuruyu SİLMİYOR. */
export async function takipSil(id: string): Promise<void> {
  const { error } = await supabase.from('application_tracking').delete().eq('id', id);
  if (error) fail('Takip kaydı silinemedi', error);
}

/* ------------------------------------------------------------------ */
/* KAYITLI ARAMA                                                       */
/* ------------------------------------------------------------------ */

export interface KayitliArama {
  id: string;
  name?: string;
  /** Doğrulanmış filtre nesnesi (bkz. lib/kayitli-arama.mjs). */
  filters: Record<string, unknown>;
  emailEnabled: boolean;
  consentAt?: string;
  optedOutAt?: string;
  createdAt: string;
}

const ARAMA_ALANLARI =
  'id,name,filters,filters_version,email_enabled,consent_at,opted_out_at,created_at';

function aramayaCevir(row: Record<string, any>): KayitliArama {
  return {
    id: row.id,
    name: row.name ?? undefined,
    filters: (row.filters ?? {}) as Record<string, unknown>,
    emailEnabled: Boolean(row.email_enabled),
    consentAt: row.consent_at ?? undefined,
    optedOutAt: row.opted_out_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** Kullanıcının kayıtlı aramaları. RLS filtreliyor; istemcide filtre yok. */
export async function fetchKayitliAramalar(): Promise<KayitliArama[]> {
  const { data, error } = await supabase
    .from('saved_searches')
    .select(ARAMA_ALANLARI)
    .order('created_at', { ascending: false });
  if (error) fail('Kayıtlı aramalar yüklenemedi', error);
  return (data ?? []).map((r) => aramayaCevir(r as Record<string, any>));
}

/**
 * Aramayı kaydeder.
 *
 * `emailEnabled` VARSAYILAN FALSE: arama kaydetmek bir bildirim
 * aboneliği değil. Açıksa rıza damgası SUNUCUDA atılıyor (tetikleyici),
 * istemciden gelen bir tarihe güvenilmiyor.
 */
export async function aramayiKaydet(girdi: {
  studentId: string;
  name: string;
  filters: Record<string, unknown>;
  filtersVersion: number;
  emailEnabled: boolean;
  consentTextVersion: number;
}): Promise<KayitliArama> {
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      student_id: girdi.studentId,
      name: girdi.name.trim().slice(0, 80) || null,
      filters: girdi.filters as never,
      filters_version: girdi.filtersVersion,
      email_enabled: girdi.emailEnabled,
      consent_text_version: girdi.emailEnabled ? girdi.consentTextVersion : null,
    })
    .select(ARAMA_ALANLARI)
    .single();
  if (error) fail('Arama kaydedilemedi', error);
  return aramayaCevir(data as Record<string, any>);
}

/** Ad ve e-posta tercihi. Rıza damgaları sunucuda. */
export async function aramayiGuncelle(
  id: string,
  degisiklik: { name?: string; emailEnabled?: boolean; consentTextVersion?: number }
): Promise<void> {
  const govde: TablesUpdate<'saved_searches'> = {};
  if (degisiklik.name !== undefined) govde.name = degisiklik.name.trim().slice(0, 80) || null;
  if (degisiklik.emailEnabled !== undefined) {
    govde.email_enabled = degisiklik.emailEnabled;
    if (degisiklik.emailEnabled && degisiklik.consentTextVersion !== undefined) {
      govde.consent_text_version = degisiklik.consentTextVersion;
    }
  }
  if (Object.keys(govde).length === 0) return;
  const { error } = await supabase.from('saved_searches').update(govde).eq('id', id);
  if (error) fail('Arama güncellenemedi', error);
}

export async function aramayiSil(id: string): Promise<void> {
  const { error } = await supabase.from('saved_searches').delete().eq('id', id);
  if (error) fail('Arama silinemedi', error);
}

/** Bütün ilan özetlerini kapatır — tek işlemle. */
export async function tumOzetleriKapat(): Promise<void> {
  const { error } = await supabase
    .from('saved_searches')
    .update({ email_enabled: false })
    .eq('email_enabled', true);
  if (error) fail('Özetler kapatılamadı', error);
}

/**
 * TABAN KAYITLARI — ilk özette geçmişin tamamı gitmesin.
 *
 * RPC kullanılıyor çünkü `digest_deliveries`e istemci YAZAMIYOR ve
 * yazmamalı: kullanıcı `sent_at`i temizleyip kendine tekrar
 * gönderebilirdi. Fonksiyon `auth.uid()`i içeride okuyor.
 */
export async function tabanKayitlariniYaz(searchId: string, listingIds: string[]): Promise<number> {
  if (listingIds.length === 0) return 0;
  const { data, error } = await supabase.rpc('kayitli_arama_taban_yaz', {
    p_search_id: searchId,
    p_listing_ids: listingIds,
  });
  if (error) fail('Taban kayıtları yazılamadı', error);
  return Number(data ?? 0);
}

/** Eşleşme için gereken ham ilan alanları — kanonik modüle veriliyor. */
export async function fetchEslesmeIcinIlanlar(): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id,title,city,work_type,country_code,is_paid,mandatory_staj_accepted,' +
        'voluntary_staj_accepted,department,department_tags,description,required_skills,status,' +
        'posted_at,created_at'
    )
    .eq('status', 'published')
    .limit(5000);
  if (error) fail('İlanlar yüklenemedi', error);
  /*
    İki aşamalı dönüşüm: üretilen tipler `department_tags`ı henüz
    ilişkili kolon olarak tanımıyor ve doğrudan çevrim `GenericStringError`
    olasılığı yüzünden reddediliyor. `unknown` üzerinden geçmek, gevşek
    bir `any` koymadan derleyiciye niyeti söylüyor.
  */
  return (data ?? []) as unknown as Array<Record<string, unknown>>;
}

/* ------------------------------------------------------------------ */
/* İŞVEREN DİZİNİ — ÖLÇÜM SONUÇLARI                                    */
/* ------------------------------------------------------------------ */

export interface IsverenKontrolu {
  slug: string;
  url_durumu: 'calisiyor' | 'gecici_hata' | 'bozuk' | null;
  url_denendi_at: string | null;
  url_basarili_at: string | null;
  url_hata: string | null;
  program_durumu: 'acik' | 'kapali' | 'bilinmiyor' | null;
  program_kaniti: string | null;
  program_kontrol_at: string | null;
}

/*
  `fetchIsverenKontrolleri` BURADAN KALDIRILDI

  İki kopya olmuştu: biri burada, biri `src/lib/isveren-dizini.mjs`
  içinde. Buradaki hiçbir bileşen tarafından çağrılmıyordu, önbelleği
  yoktu ve `program_url` kolonunu seçmiyordu — yani kartta "Açık
  programı incele" kararını veremezdi.

  İşveren sunumunun tamamı (durum metinleri, bağlantı etiketi,
  birleştirme ve toplu okuma) tek sözleşmede: `src/lib/isveren-dizini.mjs`.
  İki yerde duran bir sorgu, zamanla iki farklı kolon kümesi seçer ve
  üç yüzey farklı şey gösterir.
*/

/**
 * YÖNETİCİ İLAN İNCELEMESİ — TEK RPC, TEK İŞLEM
 *
 * Kuyruk eskiden `publishListing` / `archiveListing` ile iki ayrı düz
 * UPDATE atıyordu. Karar artık not ve iz de bırakıyor (kim, ne zaman,
 * niye) ve üçü ATOMİK olmalı: durum değişip not yazılmazsa şirket
 * panelinde "niye reddedildi?" sorusunun cevabı olmaz.
 *
 * Yetki `is_admin()` ile RPC'nin İÇİNDE sorgulanıyor; `anon` çağıramıyor
 * (execute yetkisi yalnız `authenticated`).
 *
 * RET ARŞİVLEMİYOR, TASLAĞA DÜŞÜRÜYOR: arşivlenen ilan şirket panelinde
 * hiç görünmüyor (`sirketIlanlari` arşivi süzüyor), yani şirket ne
 * olduğunu da göremiyordu. Taslak + not, şirketin düzeltip yeniden
 * göndermesine izin veriyor.
 */
export async function ilanIncele(
  ilanId: string,
  karar: 'onayla' | 'reddet',
  not?: string | null
): Promise<void> {
  const { error } = await supabase.rpc('ilan_incele', {
    p_ilan: ilanId,
    p_karar: karar,
    p_not: not ?? null,
  });
  if (error) {
    const mesaj = (error as { message?: string }).message ?? '';
    if (/yalnizca yoneticiye/i.test(mesaj)) throw new Error('Bu işlem yalnızca yöneticiye açık.');
    if (/not zorunlu/i.test(mesaj)) throw new Error('Ret için not yazman gerekiyor.');
    throw new Error('İlan incelemesi kaydedilemedi.');
  }
}

/** Dizindeki şirketlerin logo kayıtları — yine tek okuma. */
export async function fetchIsverenLogolari(
  sluglar: string[]
): Promise<Array<{ slug: string; logo_url: string | null }>> {
  if (sluglar.length === 0) return [];
  const { data, error } = await supabase
    .from('companies')
    .select('slug,logo_url')
    .in('slug', sluglar);
  if (error) return [];
  return (data ?? []) as unknown as Array<{ slug: string; logo_url: string | null }>;
}
