import { signIn, signUpStudent, signUpCompany } from '../lib/auth';
import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Building2,
  CheckCircle2,
  Sparkles,
  MapPin,
  Briefcase,
  Globe,
  Users,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Logo } from './Logo';
import { CompanyAccount } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  allCompanies: CompanyAccount[];
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  onCreateCompany: (newCompany: CompanyAccount) => void;
  onSuccess: (role: 'student' | 'company' | 'admin', name: string) => void;
  /** Şirket kaydı akışı hazır olana kadar kapalı. */
  allowCompanySignUp?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  allowCompanySignUp = false,
  onClose,
  initialMode = 'login',
  allCompanies,
  activeCompanyId,
  onSelectCompany,
  onCreateCompany,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'student' | 'company'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Company Register Specific State
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('Yazılım & Bilişim');
  const [companySize, setCompanySize] = useState('50-250 Çalışan');
  const [companyLocation, setCompanyLocation] = useState('İstanbul (Maslak) / Hibrit');
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterRole, setRecruiterRole] = useState('Yetenek Kazanımı & İK Uzmanı');
  const [companyDesc, setCompanyDesc] = useState('');

  // Selected company during login
  const [selectedCompId, setSelectedCompId] = useState<string>(activeCompanyId || allCompanies[0]?.id || '');

  // Auth durumu
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [kvkkConsent, setKvkkConsent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setInfoMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await signIn(email, password);
        onSuccess(result.role, result.displayName);
        onClose();
        return;
      }

      if (role === 'student') {
        const result = await signUpStudent({
          email,
          password,
          fullName: fullName.trim(),
          kvkkConsent,
        });
        if ((result as any).needsEmailConfirmation) {
          setInfoMessage(
            'Hesabın oluşturuldu. Giriş yapabilmek için e-postana gönderdiğimiz doğrulama bağlantısına tıkla.'
          );
          return;
        }
        onSuccess('student', result.displayName);
        onClose();
        return;
      }

      const result = await signUpCompany({
        email,
        password,
        companyName: companyName.trim(),
        industry: companyIndustry,
        size: companySize,
        location: companyLocation,
        description: companyDesc.trim(),
        recruiterName: recruiterName.trim(),
        recruiterRole: recruiterRole.trim(),
        kvkkConsent,
      });
      if ((result as any).needsEmailConfirmation) {
        setInfoMessage(
          'Şirket hesabın oluşturuldu. E-postana gönderilen doğrulama bağlantısına tıkladıktan sonra giriş yapabilirsin.'
        );
        return;
      }
      onSuccess('company', result.displayName);
      onClose();
    } catch (err: any) {
      setAuthError(err?.message ?? 'Beklenmeyen bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Eski demo akışı (referans için korundu, artık çağrılmıyor) ---
  const legacyDemoSubmit = () => {
    if (role === 'company') {
      if (mode === 'login') {
        const foundCompany = allCompanies.find((c) => c.id === selectedCompId) || allCompanies[0];
        if (foundCompany) {
          onSelectCompany(foundCompany.id);
          onSuccess('company', foundCompany.name);
        } else {
          onSuccess('company', 'Şirket Portalı');
        }
      } else {
        // Register new company
        const newCompany: CompanyAccount = {
          id: `company-${Date.now()}`,
          name: companyName.trim() || 'Yeni Teknoloji Şirketi',
          logo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=120&auto=format&fit=crop&q=80',
          industry: companyIndustry,
          size: companySize,
          location: companyLocation,
          description: companyDesc.trim() || `${companyName} kurumsal şirketi stajyer ve genç yetenek yetiştirme programı.`,
          rating: 5.0,
          verified: true,
          recruiterName: recruiterName.trim() || 'İK Yöneticisi',
          recruiterEmail: email.trim() || 'ik@sirket.com',
          recruiterRole: recruiterRole.trim() || 'Talent Acquisition Partner',
          recruiterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          plan: 'Corporate',
          createdAt: new Date().toISOString().split('T')[0],
        };
        onCreateCompany(newCompany);
        onSuccess('company', newCompany.name);
      }
    } else {
      // Student login / register
      const finalName = fullName.trim() || 'Ahmet Yılmaz';
      onSuccess('student', finalName);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-gray-200 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            <Logo size="md" />
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">
            {role === 'company'
              ? mode === 'login'
                ? 'Şirket Hesabınıza Giriş Yapın'
                : 'Kurumsal Şirket Hesabı Oluşturun'
              : mode === 'login'
              ? 'Öğrenci Hesabınıza Giriş Yapın'
              : 'Öğrenci Hesabı Oluşturun'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {role === 'company'
              ? 'Her şirketin kendine ait bağımsız yetenek havuzu, ilan yönetimi ve İK paneli bulunur.'
              : 'Yeteneklerinizi doğrulayın, zorunlu ve gönüllü staj ilanlarına tek tıkla başvurun.'}
          </p>
        </div>

        {/*
          ROL SEÇİCİ — ŞİRKET SEKMESİ KAPALI.

          Buradaki eski açıklama yanlıştı: "başvuru üzerine gönderilen
          doğrulama bağlantısı" diye bir akış yok. Gerçek akış şu:

            kayıt ol → /sirket/<slug> sayfasından sahiplenme talebi gönder
            → yönetici onaylar (approve_company_claim) → şirket portalı açılır

          Sebep güvenlik: rol kayıt sırasında istemciden gelseydi, kendini
          şirket ilan eden herkes teklife açık öğrenci profillerini okurdu.

          `allowCompanySignUp` hiçbir yerden true geçilmiyor ve geçilmemeli:
          arkasındaki signUpCompany() zaten ilk satırda hata fırlatıyor.
          Bayrağı açmak bozuk bir form göstermek olur.

          İşverenin gireceği kapı: /isveren/ilan-ver (IsverenGirisi.tsx).
        */}
        {allowCompanySignUp && (
        <div className="flex items-center gap-2 mb-4 bg-gray-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'student'
                ?'bg-white text-blue-600 shadow-xs ring-1 ring-blue-500/20'
                :'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Öğrenci / Aday</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('company')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'company'
                ?'bg-white text-blue-600 shadow-xs ring-1 ring-blue-500/20'
                :'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Şirket / İK Portalı</span>
          </button>
        </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-gray-200 mb-5">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 pb-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
              mode === 'login'
                ?'border-blue-600 text-blue-600 font-black'
                :'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{role === 'company' ? 'Şirket Hesabıyla Giriş' : 'Giriş Yap'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 pb-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
              mode === 'register'
                ?'border-blue-600 text-blue-600 font-black'
                :'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{role === 'company' ? 'Yeni Şirket Kaydı' : 'Kayıt Ol'}</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Company Login Mode: Quick Select Company Account */}
          {role === 'company' && mode === 'login' && (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  Giriş Yapılacak Şirket Hesabı Seçin:
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {allCompanies.map((comp) => {
                    const isSelected = selectedCompId === comp.id;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => {
                          setSelectedCompId(comp.id);
                          setEmail(comp.recruiterEmail);
                        }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ?'border-blue-500 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500/20'
                            :'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <img
                          src={comp.logo}
                          alt={comp.name}
                          className="w-8 h-8 rounded-lg object-cover bg-white shadow-2xs shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-gray-900 truncate">
                              {comp.name}
                            </span>
                            {comp.verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0"/>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 block truncate">
                            {comp.recruiterName} ({comp.recruiterRole})
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0"/>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Kurumsal Yetkili E-posta
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email || (allCompanies.find((c) => c.id === selectedCompId)?.recruiterEmail ?? '')}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ik@sirketiniz.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    defaultValue="demo1234"
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Company Register Mode: Full Corporate Profile Setup */}
          {role === 'company' && mode === 'register' && (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Şirket / Kurum Adı *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Örn: Akbank Tech / Getir / ASELSAN"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Sektör *
                  </label>
                  <select
                    value={companyIndustry}
                    onChange={(e) => setCompanyIndustry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Yazılım & Bilişim">Yazılım & Bilişim</option>
                    <option value="Fintech & Bankacılık">Fintech & Bankacılık</option>
                    <option value="E-Ticaret & Perakende">E-Ticaret & Perakende</option>
                    <option value="Savunma & Havacılık">Savunma & Havacılık</option>
                    <option value="Oyun Geliştirme (Gaming)">Oyun Geliştirme (Gaming)</option>
                    <option value="Otomotiv & Sanayi">Otomotiv & Sanayi</option>
                    <option value="Telekomünikasyon">Telekomünikasyon</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Şirket Ölçeği
                  </label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="1-20 Çalışan (Startup)">1-20 (Startup)</option>
                    <option value="50-250 Çalışan">50-250 Çalışan</option>
                    <option value="500-1000 Çalışan">500-1000 Çalışan</option>
                    <option value="1000+ Çalışan (Enterprise)">1000+ (Kurumsal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Şirket Lokasyonu & Çalışma Modeli
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={companyLocation}
                    onChange={(e) => setCompanyLocation(e.target.value)}
                    placeholder="Örn: İstanbul (Levent) / Hibrit"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    İK / Yetkili Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={recruiterName}
                    onChange={(e) => setRecruiterName(e.target.value)}
                    placeholder="Örn: Zeynep Kaya"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Yetkili Ünvanı
                  </label>
                  <input
                    type="text"
                    value={recruiterRole}
                    onChange={(e) => setRecruiterRole(e.target.value)}
                    placeholder="Örn: İK Lideri"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Kurumsal E-Posta *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ik@sirketiniz.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Şifre Belirleyin *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Student Form (Login / Register) */}
          {role === 'student' && (
            <div className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Ad Soyad *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Örn: Mustafa Oğulcan Doğan"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Öğrenci / Kişisel E-Posta
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ogulcan@itu.edu.tr"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* KVKK açık rızası — kayıt akışında zorunlu */}
          {mode === 'register' && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={kvkkConsent}
                onChange={(e) => setKvkkConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-blue-600 shrink-0 cursor-pointer"
              />
              <span className="text-[11px] leading-relaxed text-gray-600">
                <a
                  href="/kvkk-aydinlatma-metni"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Aydınlatma metnini
                </a>{' '}
                okudum. Kişisel verilerimin staj eşleştirmesi amacıyla işlenmesine onay veriyorum.
              </span>
            </label>
          )}

          {authError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] font-medium text-red-700"
            >
              {authError}
            </div>
          )}

          {infoMessage && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700"
            >
              {infoMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (mode === 'register' && !kvkkConsent)}
            className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {submitting ? (
              <span>Lütfen bekle...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>
                  {role === 'company'
                    ? `${allCompanies.find((c) => c.id === selectedCompId)?.name || 'Şirket'} Hesabına Giriş Yap`
                    : 'Giriş Yap'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{role === 'company' ? 'Şirket Hesabını Başlat' : 'Öğrenci Hesabı Oluştur'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
