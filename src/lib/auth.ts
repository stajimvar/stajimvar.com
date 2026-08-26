/**
 * Kimlik doğrulama katmanı — Supabase Auth sarmalayıcısı.
 *
 * AuthModal doğrudan supabase-js çağırmasın diye buraya topladım:
 * hata mesajlarını Türkçeleştiriyoruz, rol ve KVKK onayı tek yerden yönetiliyor.
 */

import { supabase } from './supabase';
import type { CompanyAccount, StudentProfile } from '../types';

/** KVKK aydınlatma metni sürümü. Metin değişince burayı artır —
 *  eski onaylar geçersiz sayılıp kullanıcıdan yeniden onay istenebilir. */
export const KVKK_VERSION = '2026-08-v1';

/*
  'admin' de gerçek bir rol. Yönetici, siteyi kullanan bir kişi olmaktan
  çıkmıyor: kendi öğrenci profili, başvuruları ve CV'si duruyor. Rol
  listesinde yer almadığında `session.role !== 'student'` kontrolleri
  yöneticiyi profilsiz bırakıyordu — çıkış düğmesi dahil hiçbir şey
  görünmüyordu.
*/
export type UserRole = 'student' | 'company' | 'admin';

export interface AuthResult {
  userId: string;
  role: UserRole;
  displayName: string;
}

// ---------------------------------------------------------------------------
// Hata çevirisi
// Supabase hataları İngilizce ve teknik geliyor; kullanıcıya böyle göstermeyelim.
// ---------------------------------------------------------------------------

function translateError(message: string): string {
  const map: Array<[RegExp, string]> = [
    [/invalid login credentials/i, 'E-posta veya şifre hatalı.'],
    [/email not confirmed/i, 'E-posta adresini doğrulaman gerekiyor. Gelen kutunu kontrol et.'],
    [/user already registered|already been registered/i, 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.'],
    [/password should be at least/i, 'Şifre en az 8 karakter olmalı.'],
    [/rate limit|too many requests/i, 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.'],
    [/invalid email/i, 'Geçerli bir e-posta adresi gir.'],
    [/network|fetch/i, 'Bağlantı kurulamadı. İnternetini kontrol et.'],

    /*
      OAUTH DURUMLARI

      Bunlar teknik mesajlar olarak geliyordu ve kullanıcı ne yapacağını
      anlamıyordu. Üçü de gerçekten olabilecek durumlar:

      - Sağlayıcı kapalı: Supabase panelinde Google/Azure açılmamışsa.
        Kullanıcının hatası değil, bunu söylemek gerekiyor.
      - İptal: kullanıcı sağlayıcı ekranında vazgeçti; hata değil.
      - Aynı e-posta başka yöntemle kayıtlı: hesap ele geçirmeyi önlemek
        için Supabase birleştirmeyi reddediyor. Doğru davranış bu, ama
        kullanıcıya çıkış yolu göstermek gerekiyor.
    */
    [
      /provider is not enabled|unsupported provider/i,
      'Bu giriş yöntemi şu an kullanılamıyor. Kurumsal e-postanla devam edebilirsin.',
    ],
    [
      /access_denied|user denied|cancell?ed|consent_required/i,
      'Giriş iptal edildi. İstersen kurumsal e-postanla devam edebilirsin.',
    ],
    [
      /identity is already linked|email address is already/i,
      'Bu e-posta başka bir yöntemle kayıtlı. Şifrenle giriş yapıp hesabını oradan bağlayabilirsin.',
    ],
    [
      /popup|window closed/i,
      'Giriş penceresi kapandı. Tekrar deneyebilir ya da kurumsal e-postanla devam edebilirsin.',
    ],
  ];

  for (const [pattern, tr] of map) {
    if (pattern.test(message)) return tr;
  }
  return 'Bir sorun oluştu. Lütfen tekrar dene.';
}

function fail(message: string): never {
  throw new Error(translateError(message));
}

// ---------------------------------------------------------------------------
// Giriş
// ---------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) fail(error.message);
  if (!data.user) fail('unknown');

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .single();

  if (pErr) fail(pErr.message);

  return {
    userId: data.user.id,
    role: profile.role as UserRole,
    displayName: profile.full_name || email.split('@')[0],
  };
}

// ---------------------------------------------------------------------------
// Öğrenci kaydı
// ---------------------------------------------------------------------------

export interface StudentSignUpInput {
  email: string;
  password: string;
  fullName: string;
  /** KVKK açık rızası. Onaysız kayıt yapılmaz. */
  /** Kayıt anında aydınlatma metninin gösterildiği damgalanır. */
  marketingConsent?: boolean;
}

export async function signUpStudent(input: StudentSignUpInput): Promise<AuthResult> {
  /*
    Kayıt artık genel bir onay kutusuna bağlı değil: aydınlatma metni
    bilgilendirmedir, rıza değil. Kayıt anında saklanan damga "bilgilendirme
    gösterildi" kaydıdır. İletişim bilgisinin şirkete aktarılmasına açık rıza
    başvuru sırasında, o ilana özel alınıyor (applications tablosundaki
    contact_share_consent_at).
  */
  if (input.password.length < 8) {
    throw new Error('Şifre en az 8 karakter olmalı.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      /*
        handle_new_user tetikleyicisi bunları okuyup profiles ve
        student_profiles satırlarını açıyor. KVKK onayı da buradan gidiyor:
        "Confirm email" açıkken signUp oturum döndürmediği için istemci
        onayı sonradan yazamıyor, onay kanıtı kaybolurdu.
      */
      data: {
        full_name: input.fullName.trim(),
        role: 'student',
        kvkk_consent: true,
        kvkk_consent_version: KVKK_VERSION,
        marketing_consent: input.marketingConsent ?? false,
      },
    },
  });
  if (error) fail(error.message);
  if (!data.user) fail('unknown');

  // E-posta doğrulaması açıksa session henüz yok; profil satırları
  // trigger ile oluştu, geri kalanı ilk girişte tamamlanır.

  return {
    userId: data.user.id,
    role: 'student',
    displayName: input.fullName.trim(),
    needsEmailConfirmation: !data.session,
  } as AuthResult & { needsEmailConfirmation: boolean };
}

// ---------------------------------------------------------------------------
// Şirket kaydı
// ---------------------------------------------------------------------------

export interface CompanySignUpInput {
  email: string;
  password: string;
  companyName: string;
  industry: string;
  size: string;
  location: string;
  description: string;
  recruiterName: string;
  recruiterRole: string;
  /** Kayıt anında aydınlatma metninin gösterildiği damgalanır. */
  marketingConsent?: boolean;
}

function slugify(name: string): string {
  return name
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export async function signUpCompany(input: CompanySignUpInput): Promise<AuthResult> {
  if (input.password.length < 8) {
    throw new Error('Şifre en az 8 karakter olmalı.');
  }

  /*
    KULLANIM DIŞI.

    Bu akış kayıt sırasında `role: 'company'` göndererek şirket hesabı
    açıyordu. Rol artık kayıttan seçilemiyor: veritabanı tetikleyicisi her
    yeni kullanıcıyı `student` olarak yazıyor. Sebebi ciddiydi — o meta veriyi
    istemci gönderdiği için, kayıt olurken kendini şirket ilan eden herkes
    teklife açık tüm öğrenci profillerini okuyabiliyordu.

    Sessizce öğrenci hesabı üretmek yerine burada duruyoruz: yoksa form bir
    gün tekrar açıldığında "şirket hesabı açtım ama şirket portalı yok"
    diyen kullanıcılar üretirdi.

    Şirket olmanın yolu artık şu: kişi normal kayıt olur, şirket sayfasından
    sahiplenme talebi gönderir, yönetici onaylar (approve_company_claim).
  */
  throw new Error(
    'Şirket hesabı doğrudan açılamıyor. Şirketinizin sayfasından ' +
      '"Bu şirketin yetkilisi misiniz?" formunu doldurun; onaydan sonra ' +
      'şirket yetkisi tanımlanır.'
  );

  // eslint-disable-next-line no-unreachable
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { full_name: input.recruiterName.trim() },
    },
  });
  if (error) fail(error.message);
  if (!data.user) fail('unknown');

  if (!data.session) {
    // E-posta doğrulaması bekleniyor; şirket kaydı ilk girişte tamamlanacak.
    return {
      userId: data.user.id,
      role: 'company',
      displayName: input.companyName.trim(),
      needsEmailConfirmation: true,
    } as AuthResult & { needsEmailConfirmation: boolean };
  }

  await supabase.from('profiles').update({
    kvkk_consent_at: new Date().toISOString(),
    kvkk_consent_version: KVKK_VERSION,
  }).eq('id', data.user.id);

  // DİKKAT: verified alanını göndermiyoruz. Şema zaten şirketin kendini
  // doğrulanmış işaretlemesine izin vermiyor — bu admin onayıyla veriliyor.
  const slugBase = slugify(input.companyName);
  const { data: company, error: cErr } = await supabase
    .from('companies')
    .insert({
      name: input.companyName.trim(),
      slug: `${slugBase}-${Date.now().toString(36)}`,
      industry: input.industry,
      size: input.size,
      location: input.location,
      description: input.description.trim(),
      created_by: data.user.id,
    })
    .select('id')
    .single();

  if (cErr) fail(cErr.message);

  await supabase.from('company_members').insert({
    company_id: company.id,
    user_id: data.user.id,
    recruiter_role: input.recruiterRole.trim() || 'Owner',
    is_owner: true,
  });

  return {
    userId: data.user.id,
    role: 'company',
    displayName: input.companyName.trim(),
  };
}

// ---------------------------------------------------------------------------
// Oturum
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) fail(error.message);
}

export async function getCurrentUser(): Promise<AuthResult | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  return {
    userId: session.user.id,
    role: profile.role as UserRole,
    displayName: profile.full_name || session.user.email?.split('@')[0] || '',
  };
}

/** Oturum değişikliklerini dinler (başka sekmede çıkış yapılması gibi). */
export function onAuthChange(callback: (user: AuthResult | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_OUT') {
      callback(null);
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      callback(await getCurrentUser());
    }
  });
  return () => data.subscription.unsubscribe();
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/sifre-yenile`,
  });
  if (error) fail(error.message);
}

/**
 * Kurtarma bağlantısıyla gelen kullanıcının şifresini değiştirir.
 *
 * NEDEN AYRI FONKSİYON
 * --------------------
 * `sendPasswordReset` e-postayı gönderiyordu ama karşılığında bir sayfa
 * yoktu: bağlantı /sifre-yenile adresine düşüyor, o adres de uygulamada
 * tanımlı değildi. Yani şifresini unutan kullanıcı için hesap yaşam
 * döngüsü yarım kalıyordu.
 *
 * Supabase kurtarma bağlantısını açan tarayıcıya geçici bir oturum
 * veriyor; bu fonksiyon o oturumla şifreyi güncelliyor.
 */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) fail(error.message);
}

/** Şifre kuralı tek yerde: kayıt, sıfırlama ve yenileme aynı şeyi istesin. */
export const SIFRE_EN_AZ = 8;

export function sifreSorunu(sifre: string): string | null {
  if (sifre.length < SIFRE_EN_AZ) return `Şifre en az ${SIFRE_EN_AZ} karakter olmalı.`;
  if (!/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(sifre)) return 'Şifre en az bir harf içermeli.';
  if (!/[0-9]/.test(sifre)) return 'Şifre en az bir rakam içermeli.';
  return null;
}

// ---------------------------------------------------------------------------
// OAuth (Google / Microsoft)
// ---------------------------------------------------------------------------

/**
 * Desteklenen sağlayıcılar.
 *
 * Microsoft, Supabase'de `azure` adıyla geçiyor: Entra ID (eski adıyla
 * Azure AD) hem kurumsal hem kişisel Microsoft hesaplarını karşılıyor.
 * Kullanıcıya "Microsoft" diyoruz çünkü düğmeye basan kişi Azure diye bir
 * şey bilmek zorunda değil.
 */
export type OAuthSaglayici = 'google' | 'azure';

export const OAUTH_ADLARI: Record<OAuthSaglayici, string> = {
  google: 'Google',
  azure: 'Microsoft',
};

/**
 * OAuth akışını başlatır.
 *
 * ŞİRKET DOĞRULAMASI DEĞİL
 * ------------------------
 * Google ya da Microsoft ile giriş, kişinin o e-posta adresine sahip
 * olduğunu kanıtlıyor — o şirketi TEMSİL ettiğini değil. Kurumsal bir
 * alan adıyla gelmek bile yetmiyor: aynı alan adında yüzlerce çalışan
 * olabilir ve ilan yayınlama yetkisi hepsine açılamaz.
 *
 * Bu yüzden OAuth yalnızca hesap açıyor. İlan yayınlama ve aday bilgisine
 * erişim, şirket sahiplenme akışı onaylanana kadar kapalı kalıyor ve o
 * kontrol veritabanı tarafında (company_members + RLS) duruyor. Buradaki
 * hiçbir değişiklik o kapıyı gevşetmiyor.
 *
 * @param saglayici 'google' | 'azure'
 * @param donusYolu giriş bitince dönülecek site içi adres
 */
export async function signInWithProvider(
  saglayici: OAuthSaglayici,
  donusYolu?: string
): Promise<void> {
  /*
    Dönüş adresi site içinde kalmalı. Dışarıdan gelen bir değerin
    doğrudan yönlendirmeye konması açık yönlendirme (open redirect)
    açığıdır; yalnızca "/" ile başlayan ve "//" olmayan yollar kabul
    ediliyor.
  */
  const guvenliYol = donusYolu && /^\/(?!\/)/.test(donusYolu) ? donusYolu : '/';
  const hedef = `${window.location.origin}${guvenliYol}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: saglayici,
    options: {
      redirectTo: hedef,
      /*
        Aynı e-postayla farklı sağlayıcıdan gelen kişiyi Supabase kendi
        kuralına göre birleştiriyor (e-posta doğrulanmışsa aynı kullanıcı).
        Burada ekstra bir şey yapmıyoruz; yapmak, doğrulanmamış bir
        e-postayla hesap ele geçirmeye kapı açardı.
      */
      queryParams: saglayici === 'google' ? { prompt: 'select_account' } : undefined,
    },
  });

  if (error) fail(error.message);
}

/**
 * OAuth dönüşünde kullanıcıdan gelen ad ve e-posta.
 *
 * Sağlayıcılar farklı alan adları kullanıyor: Google `name`, Microsoft
 * çoğu zaman `full_name` ya da `preferred_username`. Hepsine bakılıyor,
 * bulunamazsa boş dönüyor ve arayüz kullanıcıdan tamamlamasını istiyor —
 * eksik bilgiyi uydurmuyoruz.
 */
export async function oauthProfilBilgisi(): Promise<{ ad: string; eposta: string } | null> {
  const { data } = await supabase.auth.getUser();
  const kullanici = data.user;
  if (!kullanici) return null;

  const ust = (kullanici.user_metadata ?? {}) as Record<string, unknown>;
  const metinAl = (...adlar: string[]) => {
    for (const ad of adlar) {
      const deger = ust[ad];
      if (typeof deger === 'string' && deger.trim()) return deger.trim();
    }
    return '';
  };

  return {
    ad: metinAl('full_name', 'name', 'preferred_username'),
    eposta: kullanici.email ?? metinAl('email'),
  };
}

/**
 * OAuth dönüşünde eksik kalan profil bilgisini tamamlar.
 *
 * Sağlayıcı ad döndürdüyse profile yazılıyor — kullanıcıya zaten bildiği
 * bir şeyi yeniden sordurmuyoruz. Döndürmediyse `eksik: true` dönüyor ve
 * arayüz adı soruyor. Uydurulmuş bir ad yazmak, kullanıcının profilinde
 * kendi adını görmemesi demek.
 *
 * @returns eksik alan kaldı mı
 */
export async function oauthProfiliTamamla(): Promise<{ eksikAd: boolean }> {
  const { data } = await supabase.auth.getUser();
  const kullanici = data.user;
  if (!kullanici) return { eksikAd: false };

  const { data: profil } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', kullanici.id)
    .maybeSingle();

  const mevcut = (profil?.full_name ?? '').trim();
  if (mevcut) return { eksikAd: false };

  const bilgi = await oauthProfilBilgisi();
  const ad = (bilgi?.ad ?? '').trim();
  if (!ad) return { eksikAd: true };

  const { error } = await supabase.from('profiles').update({ full_name: ad }).eq('id', kullanici.id);
  return { eksikAd: Boolean(error) };
}

/** Kullanıcının kendi adını kaydetmesi — eksik profil tamamlama ekranı için. */
export async function adiKaydet(ad: string): Promise<void> {
  const temiz = ad.trim();
  if (temiz.length < 2) throw new Error('Adını ve soyadını yaz.');

  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Oturum bulunamadı; yeniden giriş yap.');

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: temiz })
    .eq('id', data.user.id);
  if (error) fail(error.message);
}

/**
 * Sunucuda gerçekten AÇIK olan OAuth sağlayıcıları.
 *
 * NEDEN SORULUYOR
 * ---------------
 * `signInWithOAuth` istemci tarafında hata fırlatmıyor: tarayıcıyı
 * Supabase'in yetkilendirme adresine gönderiyor. Sağlayıcı panelde açık
 * değilse kullanıcı bizim sitemizden çıkıp Supabase alan adında ham bir
 * JSON hatası görüyor — ölçüldü:
 *   {"code":400,"error_code":"validation_failed",
 *    "msg":"Unsupported provider: provider is not enabled"}
 *
 * Bu yüzden düğme, arkasında çalışan bir şey olmadan çizilmiyor. Ayar
 * ucu (/auth/v1/settings) herkese açık ve hangi sağlayıcının açık
 * olduğunu söylüyor. Panelden Google açıldığı anda düğme kendiliğinden
 * beliriyor; kodda bir bayrak çevirmek gerekmiyor.
 */
export async function acikOAuthSaglayicilari(): Promise<OAuthSaglayici[]> {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const anahtar = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (!url || !anahtar) return [];

    const yanit = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/settings`, {
      headers: { apikey: anahtar },
      signal: AbortSignal.timeout(6000),
    });
    if (!yanit.ok) return [];

    const govde = (await yanit.json()) as { external?: Record<string, boolean> };
    const dis = govde.external ?? {};
    return (['google', 'azure'] as OAuthSaglayici[]).filter((s) => dis[s] === true);
  } catch {
    /* Ayar okunamazsa düğme çizilmiyor: çalışmayan bir düğme, düğme değil. */
    return [];
  }
}

/**
 * Adres çubuğundaki OAuth hatasını okur ve Türkçeye çevirir.
 *
 * Sağlayıcı tarafında iptal edilen ya da reddedilen giriş bize
 * `?error=access_denied&error_description=...` (bazen `#` içinde) olarak
 * dönüyor. Okunmazsa kullanıcı hiçbir şey olmamış gibi giriş ekranına
 * bakıyor ve neden giremediğini anlamıyor.
 *
 * Okunan parametreler adresten TEMİZLENİYOR: yenilemede aynı hatanın
 * tekrar gösterilmesi kullanıcıya olmayan bir sorun bildirir.
 */
export function adrestekiOAuthHatasi(): string | null {
  if (typeof window === 'undefined') return null;

  const oku = (metin: string) => new URLSearchParams(metin.replace(/^[?#]/, ''));
  const kaynaklar = [oku(window.location.search), oku(window.location.hash)];

  for (const p of kaynaklar) {
    const kod = p.get('error') || p.get('error_code');
    if (!kod) continue;

    const aciklama = p.get('error_description') || '';

    /* Adresi temizle: geçmişe kayıt düşürmeden. */
    const temizArama = oku(window.location.search);
    for (const ad of ['error', 'error_code', 'error_description']) temizArama.delete(ad);
    const kuyruk = temizArama.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (kuyruk ? `?${kuyruk}` : '')
    );

    return translateError(`${kod} ${aciklama}`);
  }
  return null;
}
