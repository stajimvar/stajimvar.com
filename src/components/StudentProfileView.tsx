import React, { useState } from 'react';
import {
  X,
  Code2,
  FolderGit2,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  Award,
  ExternalLink,
  ShieldCheck,
  Globe,
  Users,
  Check,
  Layers,
  Sparkles,
  Edit3,
  User,
  GraduationCap,
  Mail,
  Phone,
  BookOpen,
  Camera,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  StudentProfile,
  StudentSkill,
  StudentProject,
  StudentLanguage,
  SkillLevel,
} from '../types';
import { uploadAvatar } from '../lib/queries';
import { TR_UNIVERSITIES, TR_DEPARTMENTS, TR_CITIES } from '../data/turkeyData';
import { PredictiveInput } from './PredictiveInput';
import {
  HARD_SKILLS_DICTIONARY,
  SOFT_SKILLS_DICTIONARY,
  LANGUAGES_DICTIONARY,
} from '../data/skillsDictionary';

interface StudentProfileViewProps {
  student: StudentProfile;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onUpdateProfile: (updated: Partial<StudentProfile>) => void;
  onOpenQuiz: (skillName: string) => void;
}

const COMMON_TECH_TOOLS = [
  'Python',
  'JavaScript',
  'React',
  'SQL',
  'Git & GitHub',
  'HTML / CSS',
  'Docker',
  'Figma',
  'Photoshop',
  'MS Excel (İleri)',
  'AutoCAD',
  'MATLAB',
  'SolidWorks',
  'Google Analytics',
];

const DEFAULT_SOFT_SKILLS = [
  'Problem Çözme ve Analitik Düşünme',
  'Ekip Çalışması ve İletişim',
  'Zaman Yönetimi ve Önceliklendirme',
  'Hızlı Öğrenme ve Araştırma Yeteneği',
  'Sunum ve Raporlama Becerisi',
];

const AVATAR_PRESETS = [
  { id: '1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', label: 'Avatar 1' },
  { id: '2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', label: 'Avatar 2' },
  { id: '3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', label: 'Avatar 3' },
  { id: '4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', label: 'Avatar 4' },
  { id: '5', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', label: 'Avatar 5' },
  { id: '6', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80', label: 'Avatar 6' },
];

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  onUpdateProfile,
  onOpenQuiz,
}) => {
  // Edit Profile Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(student.fullName);
  const [editUniversity, setEditUniversity] = useState(student.university);
  const [editDepartment, setEditDepartment] = useState(student.department);
  const [editGradeLevel, setEditGradeLevel] = useState(student.gradeLevel);
  const [editGpa, setEditGpa] = useState(student.gpa.toString());
  const [editBio, setEditBio] = useState(student.bio);
  const [editEmail, setEditEmail] = useState(student.email);
  const [editPhone, setEditPhone] = useState(student.phone);
  const [editAvatarUrl, setEditAvatarUrl] = useState(student.avatarUrl);

  // File input ref for direct upload
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null);
  const modalAvatarFileInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Profil doluluk oranı ve sıradaki eksik alan.
   * Ağırlıklar kabaca işverenin bakacağı sıraya göre: önce yetenek, sonra
   * eğitim bilgisi, sonra projeler.
   */
  const tamlikAlanlari: Array<{ etiket: string; dolu: boolean }> = [
    { etiket: 'yeteneklerini ekle', dolu: student.skills.length > 0 },
    { etiket: 'üniversiteni gir', dolu: Boolean(student.university) },
    { etiket: 'bölümünü gir', dolu: Boolean(student.department) },
    { etiket: 'kendini tanıt', dolu: Boolean(student.bio) },
    { etiket: 'bir proje ekle', dolu: student.projects.length > 0 },
    { etiket: 'dil ekle', dolu: (student.languages?.length ?? 0) > 0 },
    { etiket: 'hedef pozisyon seç', dolu: student.targetRoles.length > 0 },
    { etiket: 'şehir tercihini seç', dolu: student.preferences.cities.length > 0 },
    { etiket: 'telefon ekle', dolu: Boolean(student.phone) },
    { etiket: 'fotoğraf ekle', dolu: Boolean(student.avatarUrl) },
  ];
  const profilTamlik = Math.round(
    (tamlikAlanlari.filter((a) => a.dolu).length / tamlikAlanlari.length) * 100
  );
  const eksikAlan = tamlikAlanlari.find((a) => !a.dolu)?.etiket ?? '';

  const [avatarYukleniyor, setAvatarYukleniyor] = useState(false);
  const [avatarHatasi, setAvatarHatasi] = useState<string | null>(null);

  /**
   * Fotoğrafı depolamaya yükler.
   *
   * Eskiden dosya base64'e çevrilip doğrudan profile yazılıyordu; kalıcı
   * değildi ve veritabanını şişiriyordu. Artık `avatars` kovasına gidiyor,
   * profilde yalnızca adresi duruyor.
   */
  const yukleVeAyarla = async (
    file: File,
    uygula: (url: string) => void
  ): Promise<void> => {
    setAvatarHatasi(null);
    setAvatarYukleniyor(true);
    try {
      const url = await uploadAvatar(student.id, file);
      uygula(url);
    } catch (error) {
      setAvatarHatasi(error instanceof Error ? error.message : 'Fotoğraf yüklenemedi.');
    } finally {
      setAvatarYukleniyor(false);
    }
  };

  const handleDirectAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void yukleVeAyarla(file, (url) => onUpdateProfile({ avatarUrl: url }));
  };

  const handleModalAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void yukleVeAyarla(file, setEditAvatarUrl);
  };

  // Sync edit modal state when student changes
  const handleOpenEditModal = () => {
    setEditFullName(student.fullName);
    setEditUniversity(student.university);
    setEditDepartment(student.department);
    setEditGradeLevel(student.gradeLevel);
    setEditGpa(student.gpa.toString());
    setEditBio(student.bio);
    setEditEmail(student.email);
    setEditPhone(student.phone);
    setEditAvatarUrl(student.avatarUrl);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfileModal = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      fullName: editFullName.trim() || student.fullName,
      university: editUniversity.trim() || student.university,
      department: editDepartment.trim() || student.department,
      gradeLevel: editGradeLevel as any,
      gpa: parseFloat(editGpa) || student.gpa,
      bio: editBio.trim() || student.bio,
      email: editEmail.trim() || student.email,
      phone: editPhone.trim() || student.phone,
      avatarUrl: editAvatarUrl || student.avatarUrl,
    });
    setIsEditProfileOpen(false);
  };

  // Hard Skills Form State
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>('Intermediate');

  // Soft Skills Form State
  const [newSoftSkill, setNewSoftSkill] = useState('');

  // Language Form State
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [newLangName, setNewLangName] = useState('İngilizce');
  const [newLangLevel, setNewLangLevel] = useState('B2');
  const [newLangProficiency, setNewLangProficiency] = useState(
    'B2 - Profesyonel Çalışma Yetkinliği / İleri'
  );

  // Project Form State
  const [showAddProject, setShowAddProject] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projTechs, setProjTechs] = useState('');
  const [projGithub, setProjGithub] = useState('');

  // Current arrays with fallbacks
  const currentSoftSkills =
    student.softSkills && student.softSkills.length > 0
      ? student.softSkills
      : DEFAULT_SOFT_SKILLS;

  const currentLanguages: StudentLanguage[] =
    student.languages && student.languages.length > 0
      ? student.languages
      : [
          {
            id: 'lang-1',
            language: 'İngilizce',
            level: 'B2',
            proficiencyText: 'B2 - Profesyonel Çalışma Yetkinliği / İleri',
            verified: true,
          },
          {
            id: 'lang-2',
            language: 'Almanca',
            level: 'A2',
            proficiencyText: 'A2 - Temel',
            verified: false,
          },
          {
            id: 'lang-3',
            language: 'Rusça',
            level: 'A1/A2',
            proficiencyText: 'Başlangıç / Orta',
            verified: false,
          },
        ];

  // 1. Hard Skills Handlers
  const handleAddHardSkill = (nameToAdd?: string) => {
    const skillToAdd = nameToAdd || newSkillName;
    if (!skillToAdd.trim()) return;

    const exists = student.skills.some(
      (s) => s.name.toLowerCase() === skillToAdd.trim().toLowerCase()
    );
    if (exists) return;

    const newSkill: StudentSkill = {
      name: skillToAdd.trim(),
      category: 'General',
      level: newSkillLevel,
      verified: false,
    };

    onUpdateProfile({
      skills: [...student.skills, newSkill],
    });
    if (!nameToAdd) setNewSkillName('');
  };

  const handleRemoveSkill = (skillName: string) => {
    onUpdateProfile({
      skills: student.skills.filter((s) => s.name !== skillName),
    });
  };

  // 2. Soft Skills Handlers
  const handleAddSoftSkill = (skillText: string) => {
    if (!skillText.trim()) return;
    if (currentSoftSkills.includes(skillText.trim())) return;

    onUpdateProfile({
      softSkills: [...currentSoftSkills, skillText.trim()],
    });
    setNewSoftSkill('');
  };

  const handleRemoveSoftSkill = (skillText: string) => {
    onUpdateProfile({
      softSkills: currentSoftSkills.filter((s) => s !== skillText),
    });
  };

  // 3. Language Handlers
  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLangName.trim()) return;

    const exists = currentLanguages.some(
      (l) => l.language.toLowerCase() === newLangName.trim().toLowerCase()
    );
    if (exists) return;

    const newLangItem: StudentLanguage = {
      id: `lang-${Date.now()}`,
      language: newLangName.trim(),
      level: newLangLevel,
      proficiencyText: newLangProficiency.trim() || `${newLangLevel} - Seviye`,
      verified: false,
    };

    onUpdateProfile({
      languages: [...currentLanguages, newLangItem],
    });
    setShowAddLanguage(false);
  };

  const handleRemoveLanguage = (langId: string) => {
    onUpdateProfile({
      languages: currentLanguages.filter((l) => l.id !== langId),
    });
  };

  // 4. Projects Handlers
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim()) return;

    const techArray = projTechs
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newProj: StudentProject = {
      id: `proj-${Date.now()}`,
      title: projTitle.trim(),
      description: projDesc.trim(),
      techStack: techArray.length > 0 ? techArray : ['React'],
      githubUrl: projGithub.trim() || undefined,
    };

    onUpdateProfile({
      projects: [...(student.projects || []), newProj],
    });

    setProjTitle('');
    setProjDesc('');
    setProjTechs('');
    setProjGithub('');
    setShowAddProject(false);
  };

  const handleRemoveProject = (projId: string) => {
    onUpdateProfile({
      projects: student.projects.filter((p) => p.id !== projId),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Profile Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-5">
          {/* Avatar with direct upload & change options */}
          <div className="relative shrink-0 group">
            <input
              type="file"
              ref={avatarFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleDirectAvatarUpload}
            />
            <div
              onClick={() => avatarFileInputRef.current?.click()}
              className="relative cursor-pointer rounded-2xl overflow-hidden"
              title="Fotoğrafı Değiştirmek İçin Tıklayın"
            >
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-600 shadow-xs shrink-0 transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-2xl">
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold">Değiştir</span>
              </div>
            </div>
            
            {/* Quick Camera Action Badge */}
            <button
              type="button"
              onClick={() => avatarFileInputRef.current?.click()}
              className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900 shadow-xs cursor-pointer transition-colors"
              title="Cihazdan Yeni Fotoğraf Yükle"
            >
              <Camera className="w-3 h-3" />
            </button>

            {/* Verified Badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900 shadow-xs">
              ✓
            </div>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {student.fullName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {student.gradeLevel}
              </span>
              <button
                id="edit-profile-open-btn"
                type="button"
                onClick={handleOpenEditModal}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 border border-gray-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                title="Kullanıcı Profilini ve Bilgilerini Düzenle"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Profili Düzenle</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-slate-300">
              {student.university} • {student.department} {student.gpa ? `(GPA: ${student.gpa})` : ''}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xl line-clamp-2">{student.bio}</p>
          </div>
        </div>

        {/*
          Bu kutu sabit "%90 — Başvurularına Hazır" yazıyordu; profilde tek
          yetenek yokken bile. Artık gerçekten dolu alanlardan hesaplanıyor
          ve eksikse ne yapılacağını söylüyor.
        */}
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 shrink-0 shadow-2xs ${
            profilTamlik >= 70
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200 dark:border-amber-800/60'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold text-lg shadow-xs ${
              profilTamlik >= 70 ? 'bg-emerald-600' : 'bg-amber-500'
            }`}
          >
            %{profilTamlik}
          </div>
          <div>
            <span
              className={`text-xs font-semibold ${
                profilTamlik >= 70
                  ? 'text-emerald-900 dark:text-emerald-300'
                  : 'text-amber-900 dark:text-amber-300'
              }`}
            >
              Profil doluluk oranı
            </span>
            <p
              className={`text-sm font-bold ${
                profilTamlik >= 70
                  ? 'text-emerald-950 dark:text-emerald-100'
                  : 'text-amber-950 dark:text-amber-100'
              }`}
            >
              {profilTamlik >= 70
                ? 'Başvurulara hazır'
                : eksikAlan
                ? `Sıradaki adım: ${eksikAlan}`
                : 'Profilini tamamla'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-5 text-gray-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Öğrenci Profilini Düzenle
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Kişisel bilgilerinizi ve eğitim durumunuzu güncelleyin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfileModal} className="space-y-4 text-xs">
              {/* Profile Picture Upload & Presets */}
              <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-3">
                <input
                  type="file"
                  ref={modalAvatarFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleModalAvatarUpload}
                />
                
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Profil Fotoğrafı
                  </span>
                  <button
                    type="button"
                    onClick={() => modalAvatarFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Cihazdan Yükle</span>
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={editAvatarUrl}
                      alt="Seçili Profil"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-600 shadow-xs"
                    />
                  </div>
                  
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 block">
                      Hazır Avatarlardan Seçin:
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setEditAvatarUrl(preset.url)}
                          className={`relative shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                            editAvatarUrl === preset.url
                              ? 'border-blue-600 ring-2 ring-blue-500/30 scale-105'
                              : 'border-gray-200 dark:border-slate-700 hover:border-gray-400 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-8 h-8 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Veya Görsel Bağlantısı (URL):
                  </label>
                  <input
                    type="url"
                    value={editAvatarUrl.startsWith('data:') ? '' : editAvatarUrl}
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditAvatarUrl(e.target.value);
                      }
                    }}
                    placeholder={editAvatarUrl.startsWith('data:') ? 'Cihazdan yüklenen görsel aktif (URL ile değiştirebilirsiniz)' : 'https://...'}
                    className="w-full p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                  placeholder="Ad Soyad"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Üniversite
                  </label>
                  {/*
                    Öneri listesi kapalı bir seçim değil: listede olmayan
                    üniversite de yazılabilir. Amaç yazım birliği sağlamak —
                    "İTÜ" ve "İstanbul Teknik Üniversitesi" ayrı kayıt olmasın.
                  */}
                  <input
                    type="text"
                    required
                    list="tr-universiteler"
                    value={editUniversity}
                    onChange={(e) => setEditUniversity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                    placeholder="Yazmaya başla, listeden seç"
                  />
                  <datalist id="tr-universiteler">
                    {TR_UNIVERSITIES.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Bölüm
                  </label>
                  <input
                    type="text"
                    required
                    list="tr-bolumler"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                    placeholder="Yazmaya başla, listeden seç"
                  />
                  <datalist id="tr-bolumler">
                    {TR_DEPARTMENTS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Sınıf Düzeyi
                  </label>
                  <select
                    value={editGradeLevel}
                    onChange={(e) => setEditGradeLevel(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                  >
                    <option value="1. Sınıf">1. Sınıf</option>
                    <option value="2. Sınıf">2. Sınıf</option>
                    <option value="3. Sınıf">3. Sınıf</option>
                    <option value="4. Sınıf">4. Sınıf</option>
                    <option value="Yüksek Lisans / Mezun">Yüksek Lisans / Mezun</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Genel Not Ortalaması (GPA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.00"
                    value={editGpa}
                    onChange={(e) => setEditGpa(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                    placeholder="Örn: 3.45"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    E-Posta
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                    placeholder="ogrenci@universite.edu.tr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Telefon
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                    placeholder="+90 5XX XXX XX XX"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Kısa Biyografi & Kariyer Hedefi
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                  placeholder="Kendinizden, hedeflerinizden ve kariyer beklentilerinizden bahsedin..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Spans): The 3 Core CV Skills + Projects */}
        <div className="lg:col-span-2 space-y-6">

          {/* ========================================================================= */}
          {/* 1. TEKNİK YETENEKLER (KULLANDIĞIM PROGRAMLAR & ARAÇLAR) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-gray-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    Teknik & Mesleki Yetenekler (Hard Skills)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Kullandığınız programlar, araçlar, yazılım ve tasarım dilleri
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {student.skills.length} Yetenek
              </span>
            </div>

            {/* Hard Skills Badges / Chips */}
            <div className="flex flex-wrap gap-2">
              {student.skills.map((skill) => (
                <div
                  key={skill.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all text-xs shadow-2xs group"
                >
                  <span className="font-semibold text-gray-900 dark:text-slate-100">{skill.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium">
                    ({skill.level})
                  </span>

                  {skill.verified ? (
                    <span
                      className="text-emerald-600 dark:text-emerald-400 flex items-center ml-0.5"
                      title="Doğrulanmış Rozet"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <button
                      onClick={() => onOpenQuiz(skill.name)}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 ml-0.5 cursor-pointer"
                      title="Testi çözerek rozet kazan"
                    >
                      <Award className="w-3 h-3" />
                      <span>Doğrula</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleRemoveSkill(skill.name)}
                    className="text-gray-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Add Common Tools */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700/80 space-y-2">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                Hızlı Ekle (Popüler Programlar & Araçlar):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TECH_TOOLS.filter(
                  (tool) =>
                    !student.skills.some(
                      (s) => s.name.toLowerCase() === tool.toLowerCase()
                    )
                ).map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => handleAddHardSkill(tool)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 text-xs font-medium text-gray-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-gray-400 dark:text-slate-400" />
                    <span>{tool}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Form with Smart Predictive Autocomplete */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <PredictiveInput
                  id="hard-skill-predictive-input"
                  value={newSkillName}
                  onChange={setNewSkillName}
                  onSubmit={(val) => {
                    handleAddHardSkill(val);
                  }}
                  dictionary={HARD_SKILLS_DICTIONARY}
                  excludeList={student.skills.map((s) => s.name)}
                  placeholder="Yeni program, araç veya teknoloji yazın (örn: AutoCAD, Excel, Figma, React)..."
                  buttonText="Ekle"
                  accentColor="blue"
                  helperHint="💡 Yazarken Tab tuşuna basarak tahmini otomatik tamamlayabilirsiniz"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(e.target.value as SkillLevel)}
                  className="text-xs py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 shadow-2xs"
                >
                  <option value="Beginner">Temel (Beginner)</option>
                  <option value="Intermediate">Orta (Intermediate)</option>
                  <option value="Advanced">İleri (Advanced)</option>
                  <option value="Expert">Uzman (Expert)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. KİŞİSEL & SOSYAL BECERİLER (SOFT SKILLS) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-gray-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    Sosyal & Kişisel Beceriler (Soft Skills)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Ekip uyumu, iletişim, problem çözme ve çalışma disiplini yetkinlikleri
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {currentSoftSkills.length} Beceri
              </span>
            </div>

            {/* Soft Skills Chips */}
            <div className="flex flex-wrap gap-2">
              {currentSoftSkills.map((skill) => (
                <div
                  key={skill}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-medium text-xs shadow-2xs group"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>{skill}</span>
                  <button
                    onClick={() => handleRemoveSoftSkill(skill)}
                    className="text-indigo-300 dark:text-indigo-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                    title="Kaldır"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Suggestions for Soft Skills */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700/80 space-y-2">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                Önerilen Sosyal Beceriler (Tıklayarak ekleyin/kaldırın):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_SOFT_SKILLS.map((sug) => {
                  const isAdded = currentSoftSkills.includes(sug);
                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={() =>
                        isAdded ? handleRemoveSoftSkill(sug) : handleAddSoftSkill(sug)
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        isAdded
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-slate-600'
                      }`}
                    >
                      {isAdded ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3 text-gray-400 dark:text-slate-400" />
                      )}
                      <span>{sug}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Soft Skill with Predictive Autocomplete */}
            <div className="pt-1">
              <PredictiveInput
                id="soft-skill-predictive-input"
                value={newSoftSkill}
                onChange={setNewSoftSkill}
                onSubmit={(val) => {
                  handleAddSoftSkill(val);
                }}
                dictionary={SOFT_SKILLS_DICTIONARY}
                excludeList={currentSoftSkills}
                placeholder="Özel kişisel beceri girin (örn: Kriz Yönetimi, Sunum Yeteneği, Liderlik)..."
                buttonText="Ekle"
                accentColor="indigo"
                helperHint="💡 Yazarken Tab tuşuna basarak veya öneriye tıklayarak anında tamamlayabilirsiniz"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. YABANCI DİLLER (LANGUAGE SKILLS) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-gray-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    Yabancı Diller (Language Skills)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Konuştuğunuz yabancı diller ve seviyeleri (İleri, Orta, Temel vb.)
                  </p>
                </div>
              </div>

              {!showAddLanguage && (
                <button
                  onClick={() => setShowAddLanguage(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dil Ekle</span>
                </button>
              )}
            </div>

            {/* Add Language Form */}
            {showAddLanguage && (
              <form
                onSubmit={handleAddLanguage}
                className="p-4 bg-teal-50/50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800 space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200">Yeni Yabancı Dil Tanımla</span>
                  <button
                    type="button"
                    onClick={() => setShowAddLanguage(false)}
                    className="text-xs text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-slate-300 block mb-1">
                      Dil Adı (Akıllı Tahmin)
                    </label>
                    <PredictiveInput
                      id="lang-predictive-input"
                      value={newLangName}
                      onChange={(val) => {
                        setNewLangName(val);
                        const match = LANGUAGES_DICTIONARY.find(
                          (l) => l.name.toLowerCase() === val.toLowerCase()
                        );
                        if (match) {
                          setNewLangLevel(match.defaultLevel);
                          setNewLangProficiency(match.defaultText);
                        }
                      }}
                      onSubmit={(val) => {
                        setNewLangName(val);
                        const match = LANGUAGES_DICTIONARY.find(
                          (l) => l.name.toLowerCase() === val.toLowerCase()
                        );
                        if (match) {
                          setNewLangLevel(match.defaultLevel);
                          setNewLangProficiency(match.defaultText);
                        }
                      }}
                      dictionary={LANGUAGES_DICTIONARY.map((l) => l.name)}
                      excludeList={currentLanguages.map((l) => l.language)}
                      placeholder="Dil Adı (örn: Almanca, Fransızca)..."
                      buttonText="Seç"
                      accentColor="teal"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-slate-300 block mb-1">
                      Seviye Kodu
                    </label>
                    <select
                      value={newLangLevel}
                      onChange={(e) => {
                        const lvl = e.target.value;
                        setNewLangLevel(lvl);
                        if (lvl === 'B2') setNewLangProficiency('B2 - Profesyonel Çalışma Yetkinliği / İleri');
                        else if (lvl === 'A2') setNewLangProficiency('A2 - Temel');
                        else if (lvl === 'C1') setNewLangProficiency('C1 - İleri / Akıcı');
                        else if (lvl === 'A1') setNewLangProficiency('A1 - Başlangıç');
                        else if (lvl === 'B1') setNewLangProficiency('B1 - Orta Düzey');
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 font-medium focus:outline-none focus:border-teal-600"
                    >
                      <option value="A1">A1 - Başlangıç</option>
                      <option value="A2">A2 - Temel</option>
                      <option value="B1">B1 - Orta (Intermediate)</option>
                      <option value="B2">B2 - İleri / Profesyonel</option>
                      <option value="C1">C1 - İleri / Akıcı</option>
                      <option value="C2">C2 - Anadil Düzeyi</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-slate-300 block mb-1">
                      CV'de Görünecek İfade
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: B2 - Profesyonel Çalışma Yetkinliği"
                      value={newLangProficiency}
                      onChange={(e) => setNewLangProficiency(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!newLangName.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    Dili Kaydet
                  </button>
                </div>
              </form>
            )}

            {/* Existing Languages Cards List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentLanguages.map((lang) => (
                <div
                  key={lang.id}
                  className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 transition-all flex items-center justify-between gap-3 shadow-2xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200 dark:border-teal-700">
                      {lang.level}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm">{lang.language}</h4>
                        {lang.verified && (
                          <span
                            className="text-emerald-600 dark:text-emerald-400 flex items-center"
                            title="Doğrulanmış Dil Rozeti"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-slate-300 truncate font-medium">
                        {lang.proficiencyText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!lang.verified && (
                      <button
                        onClick={() => onOpenQuiz(lang.language)}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                        title="Doğrulama testini çöz"
                      >
                        Doğrula
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveLanguage(lang.id)}
                      className="text-gray-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="Kaldır"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. PROJELERİM & PORTFOLYO */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-gray-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Projelerim & Portfolyo
                </h2>
              </div>

              {!showAddProject && (
                <button
                  onClick={() => setShowAddProject(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Proje Ekle</span>
                </button>
              )}
            </div>

            {/* Add Project Form */}
            {showAddProject && (
              <form
                onSubmit={handleAddProject}
                className="p-4 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-slate-200">Yeni Proje Ekle</span>
                  <button
                    type="button"
                    onClick={() => setShowAddProject(false)}
                    className="text-xs text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Proje Başlığı (örn: E-Ticaret Arayüzü)"
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-medium"
                />

                <textarea
                  placeholder="Projenin amacı ve çözdüğü problem..."
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Teknolojiler (virgülle ayırın, örn: React, Node.js)"
                    value={projTechs}
                    onChange={(e) => setProjTechs(e.target.value)}
                    className="text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="GitHub Repo Linki (opsiyonel)"
                    value={projGithub}
                    onChange={(e) => setProjGithub(e.target.value)}
                    className="text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!projTitle.trim()}
                    className="px-4 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    Projeyi Kaydet
                  </button>
                </div>
              </form>
            )}

            {/* Existing Projects */}
            <div className="grid grid-cols-1 gap-3">
              {student.projects?.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm">{p.title}</h4>
                      {p.githubUrl && (
                        <a
                          href={p.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">{p.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[10px] font-semibold text-gray-700 dark:text-slate-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveProject(p.id)}
                    className="text-gray-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Preferences & Earned Badges */}
        <div className="space-y-6">
          {/* Internship Preferences Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Staj Tercihlerim</h2>
            </div>

            <div className="space-y-3 text-xs">
              {/*
                Şehir tercihi eskiden hiçbir yerden düzenlenemiyordu, oysa
                eşleştirme motoru bu alanı kullanıyor (locationScore). Yani
                kullanıcı puanını etkileyen bir alanı göremiyordu.
              */}
              <div>
                <label className="text-gray-500 dark:text-slate-400 font-medium block mb-1">
                  Çalışmak İstediğin Şehirler
                </label>

                {student.preferences.cities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {student.preferences.cities.map((sehir) => (
                      <span
                        key={sehir}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-100 dark:border-blue-900/50"
                      >
                        {sehir}
                        <button
                          type="button"
                          aria-label={`${sehir} tercihini kaldır`}
                          onClick={() =>
                            onUpdateProfile({
                              preferences: {
                                ...student.preferences,
                                cities: student.preferences.cities.filter((c) => c !== sehir),
                              },
                            })
                          }
                          className="text-blue-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <select
                  value=""
                  onChange={(e) => {
                    const secilen = e.target.value;
                    if (!secilen || student.preferences.cities.includes(secilen)) return;
                    onUpdateProfile({
                      preferences: {
                        ...student.preferences,
                        cities: [...student.preferences.cities, secilen],
                      },
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                >
                  <option value="">+ Şehir ekle</option>
                  {TR_CITIES.filter((c) => !student.preferences.cities.includes(c)).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                  Hiç şehir seçmezsen tüm şehirlerdeki ilanlar eşit değerlendirilir.
                </p>
              </div>

              <div>
                <label className="text-gray-500 dark:text-slate-400 font-medium block mb-1">
                  Çalışma Şekli Tercihi
                </label>
                <select
                  value={student.preferences.workType}
                  onChange={(e) =>
                    onUpdateProfile({
                      preferences: {
                        ...student.preferences,
                        workType: e.target.value as any,
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                >
                  <option value="Hybrid">Hibrit (Ofis + Uzaktan)</option>
                  <option value="Remote">Tamamen Uzaktan (Remote)</option>
                  <option value="On-site">Ofiste / Yerinde</option>
                  <option value="Any">Farketmez (Tümü)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-500 dark:text-slate-400 font-medium block mb-1">Staj Türü</label>
                <select
                  value={student.preferences.type}
                  onChange={(e) =>
                    onUpdateProfile({
                      preferences: {
                        ...student.preferences,
                        type: e.target.value as any,
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                >
                  <option value="Summer Mandatory">Yaz Dönemi Zorunlu Staj</option>
                  <option value="Long-term">Uzun Dönem (Dönem İçi)</option>
                  <option value="Voluntary">Gönüllü Staj</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold text-emerald-950 dark:text-emerald-200">Üniversite SGK Karşılıyor</span>
                </div>
                <input
                  type="checkbox"
                  checked={student.preferences.mandatoryInsuranceProvidedByUni}
                  onChange={(e) =>
                    onUpdateProfile({
                      preferences: {
                        ...student.preferences,
                        mandatoryInsuranceProvidedByUni: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
              </div>

              <div>
                <label className="text-gray-500 dark:text-slate-400 font-medium block mb-1">
                  Haftalık Uygunluk (Gün)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={student.preferences.weeklyDaysAvailable}
                  onChange={(e) =>
                    onUpdateProfile({
                      preferences: {
                        ...student.preferences,
                        weeklyDaysAvailable: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Earned Badges Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Kazanılan Rozetler</h2>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {student.earnedBadges?.length || 0} Rozet
              </span>
            </div>

            <div className="space-y-2">
              {student.earnedBadges && student.earnedBadges.length > 0 ? (
                student.earnedBadges.map((b) => (
                  <div
                    key={b}
                    className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wide text-[11px]">
                        {b.replace('badge-', 'Doğrulanmış ').replace('quiz-', 'Doğrulanmış ')}
                      </p>
                      <p className="text-[10px] text-emerald-800 dark:text-emerald-400">
                        Staj eşleşme algoritmasında +%5 öncelik sağlar.
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 dark:text-slate-400 italic">
                  Henüz test çözüp rozet kazanmadınız. "Yetenek Doğrulama" sekmesinden mini testleri tamamlayabilirsiniz.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

