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

export type UserRole = 'student' | 'company';

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
  kvkkConsent: boolean;
  marketingConsent?: boolean;
}

export async function signUpStudent(input: StudentSignUpInput): Promise<AuthResult> {
  if (!input.kvkkConsent) {
    throw new Error('Devam edebilmek için aydınlatma metnini onaylaman gerekiyor.');
  }
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
  kvkkConsent: boolean;
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
  if (!input.kvkkConsent) {
    throw new Error('Devam edebilmek için aydınlatma metnini onaylaman gerekiyor.');
  }
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
