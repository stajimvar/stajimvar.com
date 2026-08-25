import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Users,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Award,
  Video,
  Send,
  Trash2,
  Star,
  Columns,
  ListFilter,
  EyeOff,
  Eye,
  Calendar,
  Check,
  Search,
  MapPin,
  ShieldCheck,
  Edit3,
  Globe,
  ExternalLink,
  ChevronDown,
  Mail,
  UserCheck,
  FileText,
  Filter,
  Inbox,
  MessageSquare,
  FileCheck,
  XCircle,
  Github,
  Linkedin,
  Phone,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { InternshipListing, StudentProfile, CompanyAccount, ApplicationRecord } from '../types';
import { calculateInternshipMatch } from '../utils/matchingEngine';
import { GoogleAdBanner } from './GoogleAdBanner';

/**
 * Başvuru kaydı var ama öğrenci profili yüklenememişse gösterilecek yedek.
 * RLS gereği şirket, açık olmayan profilleri okuyamaz — o durumda buraya düşer.
 */
const placeholderStudent = (id: string): StudentProfile => ({
  id,
  fullName: 'Bilinmeyen Öğrenci',
  email: 'ogrenci@universite.edu.tr',
  phone: '',
  university: 'Üniversite',
  faculty: 'Mühendislik',
  department: 'Bilgisayar Mühendisliği',
  gradeLevel: '3. Sınıf',
  graduationYear: 2027,
  gpa: 3.5,
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  bio: '',
  skills: [],
  softSkills: [],
  languages: [],
  targetRoles: [],
  preferences: {
    workType: 'Hybrid',
    cities: ['İstanbul'],
    type: 'Summer Mandatory',
    mandatoryInsuranceProvidedByUni: true,
    earliestStartDate: '',
    weeklyDaysAvailable: 5,
  },
  projects: [],
  earnedBadges: [],
});

interface CompanyPortalViewProps {
  allListings: InternshipListing[];
  allStudents: StudentProfile[];
  applications?: ApplicationRecord[];
  onUpdateApplicationStatus?: (
    applicationId: string,
    status: ApplicationRecord['status'],
    feedback?: string,
    interviewDate?: string
  ) => void;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onAddNewListing: (listing: InternshipListing) => void;
  onDeleteListing: (listingId: string) => void;
  activeCompany: CompanyAccount;
  allCompanies: CompanyAccount[];
  onSelectCompany: (companyId: string) => void;
  onUpdateCompany: (updated: Partial<CompanyAccount>) => void;
  onCreateCompany: (newCompany: CompanyAccount) => void;
}

export const CompanyPortalView: React.FC<CompanyPortalViewProps> = ({
  allListings,
  allStudents,
  applications = [],
  onUpdateApplicationStatus,
  subTab = 'applicants',
  onSubTabChange,
  onAddNewListing,
  onDeleteListing,
  activeCompany,
  allCompanies,
  onSelectCompany,
  onUpdateCompany,
  onCreateCompany,
}) => {
  // Listings belonging to active company
  const companyListings = useMemo(() => {
    return allListings.filter(
      (l) =>
        l.companyId === activeCompany.id ||
        l.companyName.toLowerCase().includes(activeCompany.name.toLowerCase())
    );
  }, [allListings, activeCompany]);

  const displayedListings = companyListings.length > 0 ? companyListings : [];

  const [selectedListingId, setSelectedListingId] = useState<string>(
    companyListings[0]?.id || allListings[0]?.id || ''
  );

  // When active company changes, sync selectedListingId
  useEffect(() => {
    const matched = allListings.find(
      (l) =>
        l.companyId === activeCompany.id ||
        l.companyName.toLowerCase().includes(activeCompany.name.toLowerCase())
    );
    if (matched) {
      setSelectedListingId(matched.id);
    } else if (allListings[0]) {
      setSelectedListingId(allListings[0].id);
    }
  }, [activeCompany.id, allListings]);

  // Main Portal Tabs: 'applicants' (İlana Başvuranlar), 'ranked' (Eşleşen Havuz), 'kanban' (Kanban Panosu)
  const [activePortalTab, setActivePortalTab] = useState<'applicants' | 'ranked' | 'kanban'>('applicants');
  const [blindHiringMode, setBlindHiringMode] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<string>('all');

  // Modals state
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<StudentProfile | null>(null);
  const [interviewModalData, setInterviewModalData] = useState<{
    appId?: string;
    student: StudentProfile;
    listingTitle: string;
  } | null>(null);
  const [feedbackModalData, setFeedbackModalData] = useState<{
    appId: string;
    studentName: string;
    currentFeedback?: string;
  } | null>(null);

  // Sync subTab from header
  useEffect(() => {
    if (subTab === 'applicants') {
      setActivePortalTab('applicants');
    } else if (subTab === 'kanban') {
      setActivePortalTab('kanban');
    } else if (subTab === 'post_new') {
      setShowPostModal(true);
    } else if (subTab === 'all_candidates' || subTab === 'top_matches' || subTab === 'all') {
      setActivePortalTab('ranked');
    }
  }, [subTab]);

  // Interview Booking Form State
  const [interviewDate, setInterviewDate] = useState('2026-08-20');
  const [interviewTime, setInterviewTime] = useState('14:00');
  const [interviewPlatform, setInterviewPlatform] = useState('Google Meet');
  const [interviewNotesInput, setInterviewNotesInput] = useState('');
  const [interviewSuccessNotice, setInterviewSuccessNotice] = useState(false);

  // Recruiter Feedback Form State
  const [feedbackInput, setFeedbackInput] = useState('');

  // Local candidate pipeline stages (for algorithmic talent pool tab)
  const [candidateStages, setCandidateStages] = useState<
    Record<string, 'new' | 'screening' | 'interview' | 'offer'>
  >({});

  // Company Profile Edit State
  const [editName, setEditName] = useState(activeCompany.name);
  const [editIndustry, setEditIndustry] = useState(activeCompany.industry);
  const [editSize, setEditSize] = useState(activeCompany.size);
  const [editLocation, setEditLocation] = useState(activeCompany.location);
  const [editDesc, setEditDesc] = useState(activeCompany.description);
  const [editRecruiterName, setEditRecruiterName] = useState(activeCompany.recruiterName);
  const [editRecruiterRole, setEditRecruiterRole] = useState(activeCompany.recruiterRole);
  const [editRecruiterEmail, setEditRecruiterEmail] = useState(activeCompany.recruiterEmail);
  const [editLogo, setEditLogo] = useState(activeCompany.logo);

  useEffect(() => {
    setEditName(activeCompany.name);
    setEditIndustry(activeCompany.industry);
    setEditSize(activeCompany.size);
    setEditLocation(activeCompany.location);
    setEditDesc(activeCompany.description);
    setEditRecruiterName(activeCompany.recruiterName);
    setEditRecruiterRole(activeCompany.recruiterRole);
    setEditRecruiterEmail(activeCompany.recruiterEmail);
    setEditLogo(activeCompany.logo);
  }, [activeCompany]);

  // New Listing Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('Yazılım Geliştirme');
  const [newCity, setNewCity] = useState(activeCompany.location.split('(')[0].trim() || 'İstanbul');
  const [newWorkType, setNewWorkType] = useState<'Remote' | 'Hybrid' | 'On-site'>('Hybrid');
  const [newReqSkills, setNewReqSkills] = useState('React, TypeScript, Git');
  const [newPrefSkills, setNewPrefSkills] = useState('Tailwind CSS, Next.js');
  const [newDuration, setNewDuration] = useState('20-30 İş Günü (Yaz Stajı)');
  const [newStipend, setNewStipend] = useState('28.500 ₺ / Ay + Yemek');
  const [newDesc, setNewDesc] = useState('');
  const [newMandatory, setNewMandatory] = useState(true);

  const selectedListing = allListings.find((l) => l.id === selectedListingId);

  // 1. DIRECT APPLICANTS FOR THE SELECTED LISTING
  const listingApplicants = useMemo(() => {
    if (!selectedListingId) return [];
    return applications.filter((app) => app.listingId === selectedListingId);
  }, [applications, selectedListingId]);

  // Map each applicant with their student profile & live calculated match
  const detailedApplicants = useMemo(() => {
    return listingApplicants.map((app) => {
      const student = allStudents.find((s) => s.id === app.studentId) ||
        placeholderStudent(app.studentId);

      const match = selectedListing
        ? calculateInternshipMatch(student, selectedListing)
        : null;

      return {
        app,
        student,
        match,
      };
    });
  }, [listingApplicants, allStudents, selectedListing]);

  // Filtered applicants based on search query and status filter
  const filteredApplicants = useMemo(() => {
    return detailedApplicants.filter(({ app, student, match }) => {
      // Status filter
      if (applicantStatusFilter !== 'all' && app.status !== applicantStatusFilter) {
        return false;
      }
      // Text search
      if (candidateSearchQuery.trim()) {
        const query = candidateSearchQuery.toLowerCase();
        const nameMatch = student.fullName.toLowerCase().includes(query);
        const uniMatch = student.university.toLowerCase().includes(query);
        const deptMatch = student.department.toLowerCase().includes(query);
        const skillMatch = student.skills.some((s) => s.name.toLowerCase().includes(query));
        const coverMatch = (app.coverLetter || '').toLowerCase().includes(query);
        return nameMatch || uniMatch || deptMatch || skillMatch || coverMatch;
      }
      return true;
    });
  }, [detailedApplicants, applicantStatusFilter, candidateSearchQuery]);

  // 2. ALGORITHMIC TALENT POOL (All Platform Students Ranked)
  const rankedCandidates = useMemo(() => {
    return allStudents
      .map((student) => {
        const match = selectedListing
          ? calculateInternshipMatch(student, selectedListing)
          : null;
        const stage = candidateStages[student.id] || 'new';
        return {
          student,
          match,
          stage,
        };
      })
      .filter((item) => item.match !== null)
      .sort((a, b) => (b.match?.overallScore || 0) - (a.match?.overallScore || 0));
  }, [allStudents, selectedListing, candidateStages]);

  const filteredRankedCandidates = useMemo(() => {
    if (!candidateSearchQuery.trim()) return rankedCandidates;
    const query = candidateSearchQuery.toLowerCase();
    return rankedCandidates.filter(({ student }) => {
      const nameMatch = student.fullName.toLowerCase().includes(query);
      const uniMatch = student.university.toLowerCase().includes(query);
      const deptMatch = student.department.toLowerCase().includes(query);
      const skillMatch = student.skills.some((s) => s.name.toLowerCase().includes(query));
      return nameMatch || uniMatch || deptMatch || skillMatch;
    });
  }, [rankedCandidates, candidateSearchQuery]);

  // Stage change for Algorithmic Pool
  const handleStageChange = (
    studentId: string,
    nextStage: 'new' | 'screening' | 'interview' | 'offer'
  ) => {
    setCandidateStages((prev) => ({
      ...prev,
      [studentId]: nextStage,
    }));
  };

  // Status mapping helper
  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'submitted':
        return {
          label: 'Yeni Başvuru',
          bg:'bg-blue-50 text-blue-700 border-blue-200',
          icon: Inbox,
        };
      case 'under_review':
        return {
          label: 'Ön İncelemede',
          bg:'bg-amber-50 text-amber-700 border-amber-200',
          icon: Clock,
        };
      case 'technical_assessment':
        return {
          label: 'Teknik Değerlendirme / Case',
          bg:'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: FileCheck,
        };
      case 'interview_scheduled':
        return {
          label: 'Mülakat Planlandı',
          bg:'bg-purple-50 text-purple-700 border-purple-200',
          icon: Video,
        };
      case 'offer_extended':
        return {
          label: 'Teklif İletildi 🎉',
          bg:'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Award,
        };
      case 'rejected':
        return {
          label: 'Olumsuz Sonuçlandı',
          bg:'bg-rose-50 text-rose-700 border-rose-200',
          icon: XCircle,
        };
      case 'withdrawn':
        return {
          label: 'Aday Geri Çekti',
          bg:'bg-gray-100 text-gray-600 border-gray-200',
          icon: AlertCircle,
        };
      default:
        return {
          label: 'Başvuru Alındı',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Inbox,
        };
    }
  };

  // Submit interview scheduling
  const handleScheduleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewModalData) return;

    const formattedDate = `${interviewDate}, ${interviewTime} (${interviewPlatform})`;
    if (interviewModalData.appId && onUpdateApplicationStatus) {
      /*
        DİKKAT: buradaki üçüncü parametre `companyFeedback` — yani ADAYA
        GÖSTERİLEN metin. Eskiden mülakat notu buraya geçiriliyordu, yani
        şirketin kendi arasında tuttuğu değerlendirme doğrudan öğrenciye
        gidiyordu. Dahili not artık application_notes tablosuna yazılıyor;
        buraya yalnızca adayın görmesi amaçlanan bilgi geçiyor.
      */
      onUpdateApplicationStatus(
        interviewModalData.appId,
        'interview_scheduled',
        undefined,
        formattedDate
      );
    } else {
      handleStageChange(interviewModalData.student.id, 'interview');
    }

    setInterviewSuccessNotice(true);
    setTimeout(() => {
      setInterviewSuccessNotice(false);
      setInterviewModalData(null);
      setInterviewNotesInput('');
    }, 1400);
  };

  // Submit recruiter feedback
  const handleSaveFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackModalData) return;

    if (onUpdateApplicationStatus) {
      // Keep existing status, just append/update feedback note
      const existingApp = applications.find((a) => a.id === feedbackModalData.appId);
      if (existingApp) {
        onUpdateApplicationStatus(
          feedbackModalData.appId,
          existingApp.status,
          feedbackInput.trim()
        );
      }
    }
    setFeedbackModalData(null);
    setFeedbackInput('');
  };

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompany({
      name: editName.trim() || activeCompany.name,
      industry: editIndustry.trim() || activeCompany.industry,
      size: editSize.trim() || activeCompany.size,
      location: editLocation.trim() || activeCompany.location,
      description: editDesc.trim() || activeCompany.description,
      recruiterName: editRecruiterName.trim() || activeCompany.recruiterName,
      recruiterRole: editRecruiterRole.trim() || activeCompany.recruiterRole,
      recruiterEmail: editRecruiterEmail.trim() || activeCompany.recruiterEmail,
      logo: editLogo.trim() || activeCompany.logo,
    });
    setShowEditProfileModal(false);
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const reqArray = newReqSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const prefArray = newPrefSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const created: InternshipListing = {
      id: `job-custom-${Date.now()}`,
      // Şirketin kendi girdiği ilan: başvuru tamamen platform içinde kalır.
      origin: 'internal',
      applicationMethod: 'internal',
      companyId: activeCompany.id,
      companyName: activeCompany.name,
      companyLogo: activeCompany.logo,
      companyIndustry: activeCompany.industry,
      companySize: activeCompany.size,
      companyLocation: activeCompany.location,
      companyDescription: activeCompany.description,
      companyRating: activeCompany.rating,
      title: newTitle.trim(),
      department: newDepartment.trim(),
      workType: newWorkType,
      city: newCity,
      mandatoryStajAccepted: newMandatory,
      voluntaryStajAccepted: true,
      stipend: {
        isPaid: true,
        amountText: newStipend.trim(),
      },
      duration: newDuration.trim(),
      term: 'Summer 2026',
      applicationDeadline: '2026-06-30',
      minGradeLevel: '2. Sınıf ve Üzeri',
      requiredSkills: reqArray.length > 0 ? reqArray : ['React', 'TypeScript'],
      preferredSkills: prefArray,
      description:
        newDesc.trim() ||
        `${activeCompany.name} bünyesinde staj yapacak, modern teknolojilerle projeler geliştirecek ekip arkadaşı arıyoruz.`,
      responsibilities: [
        'Ekip ile günlük scrum ve sprint planlamalarına aktif katılım',
        'Senior mühendislerden düzenli teknik mentorluk alma',
        'Staj süresince bağımsız bitirme projesi geliştirme ve sunma',
      ],
      perks: ['1-on-1 Senior Mentorluk', 'Modern Ekipman Desteği', 'Başarılı Staj Sonrası Tam Zamanlı Teklif'],
      applicantsCount: 0,
      postedAt: 'Yeni Yayınlandı',
      featured: true,
    };

    onAddNewListing(created);
    setSelectedListingId(created.id);
    setShowPostModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Active Company Identity Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={activeCompany.logo}
              alt={activeCompany.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-100 bg-white shrink-0 shadow-2xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900">
                  {activeCompany.name}
                </h2>
                {activeCompany.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                    <ShieldCheck className="w-3 h-3" />
                    Doğrulanmış Kurum
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeCompany.industry} • {activeCompany.location} • {activeCompany.size}
              </p>
              <p className="text-[11px] text-gray-600 mt-1 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-gray-400" />
                <span>
                  Yetkili İK: <strong className="text-gray-700">{activeCompany.recruiterName}</strong> ({activeCompany.recruiterRole})
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions for Active Company */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowEditProfileModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-gray-500" />
              <span>Profili Düzenle</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPostModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İlan Yayınla</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workstation: Left (Listings) & Right (Applicants / Talent Pool / Kanban) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 Cols): Postings Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600"/>
              <h3 className="text-sm font-extrabold text-gray-900">
                Staj İlanlarınız ({displayedListings.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowPostModal(true)}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni İlan</span>
            </button>
          </div>

          {/* Listings List Cards */}
          <div className="space-y-2.5">
            {displayedListings.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-gray-300 bg-white text-center space-y-3">
                <Building2 className="w-8 h-8 text-gray-400 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    {activeCompany.name} adına yayınlanmış ilan bulunmuyor.
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    İlk stajyer ilanınızı hemen oluşturup başvuruları kabul etmeye başlayın.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPostModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>İlk İlanı Yayınla</span>
                </button>
              </div>
            ) : (
              displayedListings.map((listing) => {
                const isSelected = listing.id === selectedListingId;
                const thisListingApps = applications.filter((a) => a.listingId === listing.id);

                return (
                  <div
                    key={listing.id}
                    onClick={() => setSelectedListingId(listing.id)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ?'bg-blue-50/80 border-blue-400 shadow-xs ring-2 ring-blue-500/10'
                        :'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-blue-600 truncate">
                            {listing.department}
                          </p>
                          {listing.companyId === activeCompany.id && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">
                              Aktif
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 leading-snug mt-0.5 truncate">
                          {listing.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-1">
                          {listing.city} • {listing.workType}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {/* Direct Applicant Count Badge */}
                        <span
                          className={`text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs ${
                            thisListingApps.length > 0
                              ? 'bg-blue-600 text-white'
                              :'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Inbox className="w-3 h-3" />
                          <span>{thisListingApps.length} Başvuru</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Corporate B2B HR Tools Sponsored Ad */}
          <div className="pt-2">
            <GoogleAdBanner format="sidebar-rectangle" />
          </div>
        </div>

        {/* Right Column (8 Cols): Applicants View / Matched Candidate Pool / Kanban Pipeline */}
        <div className="lg:col-span-8 space-y-4">
          {/* Selected Listing Header Banner & Active Tab Selector */}
          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs space-y-3.5">
            {/* Listing Summary Bar */}
            {selectedListing ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                    Seçili Staj Pozisyonu
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900">
                    {selectedListing.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedListing.department} • {selectedListing.city} ({selectedListing.workType}) • {selectedListing.stipend?.amountText || 'Ücretli Staj'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 flex items-center gap-1.5">
                    <Inbox className="w-3.5 h-3.5 text-blue-600" />
                    <strong>{listingApplicants.length} Doğrudan Başvuran</strong>
                  </span>
                </div>
              </div>
            ) : null}

            {/* Navigation Toolbar (Tabs + Search + Blind Hiring Mode) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* 3 Main Portal Tabs */}
              <div className="inline-flex items-center bg-gray-100 p-1 rounded-2xl shrink-0 overflow-x-auto">
                {/* 1. İlana Başvuranlar Tab */}
                <button
                  id="tab-btn-applicants"
                  onClick={() => {
                    setActivePortalTab('applicants');
                    onSubTabChange?.('applicants');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activePortalTab === 'applicants'
                      ?'bg-white text-blue-600 shadow-2xs'
                      :'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>İlana Başvuranlar ({listingApplicants.length})</span>
                </button>

                {/* 2. Eşleşen Aday Havuzu Tab */}
                <button
                  id="tab-btn-ranked"
                  onClick={() => {
                    setActivePortalTab('ranked');
                    onSubTabChange?.('all_candidates');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activePortalTab === 'ranked'
                      ?'bg-white text-blue-600 shadow-2xs'
                      :'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Eşleşen Yetenek Havuzu ({rankedCandidates.length})</span>
                </button>

                {/* 3. Kanban Panosu Tab */}
                <button
                  id="tab-btn-kanban"
                  onClick={() => {
                    setActivePortalTab('kanban');
                    onSubTabChange?.('kanban');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activePortalTab === 'kanban'
                      ?'bg-white text-blue-600 shadow-2xs'
                      :'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5 text-purple-500" />
                  <span>Kanban Süreç</span>
                </button>
              </div>

              {/* Quick Candidate Search Box */}
              <div className="flex-1 max-w-xs flex items-center px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-blue-500">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder="Aday, üniversite, yetenek..."
                  value={candidateSearchQuery}
                  onChange={(e) => setCandidateSearchQuery(e.target.value)}
                  className="w-full text-xs bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
                />
                {candidateSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCandidateSearchQuery('')}
                    className="text-gray-600 hover:text-gray-600 text-xs font-bold ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Blind Hiring Mode Toggle */}
              <button
                type="button"
                onClick={() => setBlindHiringMode(!blindHiringMode)}
                title="İsim ve fotoğrafları gizleyerek yetenek odaklı önyargısız değerlendirme modu"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                  blindHiringMode
                    ?'bg-purple-50 border-purple-300 text-purple-700'
                    :'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {blindHiringMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{blindHiringMode ? 'Önyargısız (Blind)' : 'Önyargısız İncele'}</span>
              </button>
            </div>

            {/* Sub-Filter Pills for 'applicants' Tab */}
            {activePortalTab === 'applicants' && (
              <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-bold text-gray-600 mr-1 shrink-0">
                  Durum Filtresi:
                </span>
                {[
                  { id: 'all', label: `Tümü (${listingApplicants.length})` },
                  { id: 'submitted', label: `Yeni (${listingApplicants.filter((a) => a.status === 'submitted').length})` },
                  { id: 'under_review', label: `İncelemede (${listingApplicants.filter((a) => a.status === 'under_review').length})` },
                  { id: 'technical_assessment', label: `Teknik Case (${listingApplicants.filter((a) => a.status === 'technical_assessment').length})` },
                  { id: 'interview_scheduled', label: `Mülakat (${listingApplicants.filter((a) => a.status === 'interview_scheduled').length})` },
                  { id: 'offer_extended', label: `Teklif (${listingApplicants.filter((a) => a.status === 'offer_extended').length})` },
                  { id: 'rejected', label: `Reddedilen (${listingApplicants.filter((a) => a.status === 'rejected').length})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setApplicantStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      applicantStatusFilter === st.id
                        ? 'bg-blue-600 text-white shadow-2xs'
                        :'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: DIRECT APPLICANTS FOR THIS LISTING                                   */}
          {/* ========================================================================= */}
          {activePortalTab === 'applicants' && (
            <div className="space-y-4">
              {filteredApplicants.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-gray-200 text-center space-y-3 shadow-2xs">
                  <Inbox className="w-10 h-10 text-gray-400 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">
                      {applicantStatusFilter !== 'all'
                        ? 'Bu filtrede başvuran aday bulunmuyor.'
                        : 'Bu ilana henüz doğrudan başvuru yapılmadı.'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      {applicantStatusFilter !== 'all'
                        ? 'Farklı bir filtre seçerek veya filtreleri temizleyerek diğer başvuruları görüntüleyebilirsiniz.'
                        : '"Eşleşen Yetenek Havuzu" sekmesinden kriterlerinize tam uyan adayları inceleyebilir veya öğrencilere doğrudan davet gönderebilirsiniz.'}
                    </p>
                  </div>
                  {applicantStatusFilter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => setApplicantStatusFilter('all')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      Tüm Başvuruları Göster
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActivePortalTab('ranked')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Eşleşen Yetenekleri İncele</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredApplicants.map(({ app, student, match }) => {
                  const score = match?.overallScore || app.matchScore || 0;
                  const statusInfo = getStatusBadge(app.status);
                  const StatusIcon = statusInfo.icon;
                  const isTopMatch = score >= 85;

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs hover:shadow-xs transition-all space-y-4"
                    >
                      {/* Top Row: Candidate Avatar, Identity, Match Score & Status Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Student Avatar & Basic Info */}
                        <div className="flex items-start sm:items-center gap-3.5">
                          <img
                            src={
                              blindHiringMode
                                ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
                                : student.avatarUrl
                            }
                            alt="Aday"
                            className="w-13 h-13 rounded-2xl object-cover ring-2 ring-gray-100 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-extrabold text-gray-900">
                                {blindHiringMode
                                  ? `Aday #${student.id.slice(-4).toUpperCase()}`
                                  : student.fullName}
                              </h4>
                              {isTopMatch && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Sparkles className="w-3 h-3" />
                                  Zirve Uyum
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {student.university} • {student.department} ({student.gradeLevel}) • GPA: <strong>{student.gpa.toFixed(2)}</strong>
                            </p>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                              Başvuru Tarihi: {app.appliedAt}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge & Match Score */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {/* Live Status Pill */}
                          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${statusInfo.bg}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusInfo.label}</span>
                          </div>

                          {/* Match Score */}
                          <div className="text-right pl-2 border-l border-gray-200">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">
                              Uyum Skoru
                            </span>
                            <span
                              className={`text-2xl font-black ${
                                score >= 85
                                  ?'text-emerald-600'
                                  : score >= 70
                                  ?'text-blue-600'
                                  :'text-amber-600'
                              }`}
                            >
                              %{score}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Candidate Cover Letter / Note (If submitted) */}
                      {app.coverLetter && (
                        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs">
                          <span className="font-bold text-gray-600 block mb-1 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600"/>
                            Adayın Ön Yazısı / Başvuru Notu:
                          </span>
                          <p className="text-gray-700 italic leading-relaxed">
                            "{app.coverLetter}"
                          </p>
                        </div>
                      )}

                      {/* Scheduled Interview or Feedback Banner */}
                      {app.interviewDate && (
                        <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-purple-600 shrink-0"/>
                            <span className="text-purple-900 font-bold">
                              Planlanan Mülakat: {app.interviewDate}
                            </span>
                          </div>
                          {/*
                            Dahili not burada gösterilmiyor: bu bileşen hem
                            şirkete hem öğrenciye çizilebiliyor. Notlar
                            application_notes tablosundan, yalnızca şirket
                            üyeliği doğrulanmış oturumda okunur.
                          */}
                        </div>
                      )}

                      {app.companyFeedback && (
                        <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5"/>
                          <div>
                            <span className="font-bold text-blue-900">
                              İK Notu / Adaya İletilen Geri Bildirim:
                            </span>
                            <p className="text-blue-800 mt-0.5">
                              {app.companyFeedback}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Matching Skills vs Missing Skills */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Eşleşen Yetkinlikler ({(match?.matchedRequiredSkills || []).length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(match?.matchedRequiredSkills || []).map((sk) => (
                              <span
                                key={sk}
                                className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                ✓ {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Gelişime Açık / Eksik:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(match?.missingRequiredSkills || []).length === 0 ? (
                              <span className="text-[11px] font-bold text-emerald-600">
                                🌟 Pozisyonun tüm şartlarını eksiksiz karşılıyor!
                              </span>
                            ) : (
                              (match?.missingRequiredSkills || []).map((sk) => (
                                <span
                                  key={sk}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-50 text-gray-500 border border-gray-200"
                                >
                                  - {sk}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recruiter Action Bar: Change Stage, Schedule Interview, View Profile, Add Note */}
                      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                        {/* Quick Stage Progression Buttons */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
                          <span className="text-[11px] font-bold text-gray-600 mr-1 shrink-0">
                            Aşama Değiştir:
                          </span>
                          {(
                            [
                              { key: 'under_review', label: 'Ön İncele' },
                              { key: 'technical_assessment', label: 'Case Gönder' },
                              { key: 'interview_scheduled', label: 'Mülakat' },
                              { key: 'offer_extended', label: 'Teklif İlet' },
                              { key: 'rejected', label: 'Reddet' },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.key}
                              type="button"
                              onClick={() => {
                                if (st.key === 'interview_scheduled') {
                                  setInterviewModalData({
                                    appId: app.id,
                                    student,
                                    listingTitle: selectedListing?.title || '',
                                  });
                                } else if (onUpdateApplicationStatus) {
                                  onUpdateApplicationStatus(app.id, st.key);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                                app.status === st.key
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  :'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>

                        {/* Primary Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Add/Edit Note */}
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackModalData({
                                appId: app.id,
                                studentName: student.fullName,
                                currentFeedback: app.companyFeedback,
                              });
                              setFeedbackInput(app.companyFeedback || '');
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                            <span>İK Notu</span>
                          </button>

                          {/* Schedule Interview */}
                          <button
                            type="button"
                            onClick={() =>
                              setInterviewModalData({
                                appId: app.id,
                                student,
                                listingTitle: selectedListing?.title || '',
                              })
                            }
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Mülakat Planla</span>
                          </button>

                          {/* View Full Profile & CV */}
                          <button
                            type="button"
                            onClick={() => setViewingStudent(student)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>CV & Profili İncele</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ALGORITHMIC TALENT POOL / PROACTIVE SOURCING                        */}
          {/* ========================================================================= */}
          {activePortalTab === 'ranked' && (
            <div className="space-y-4">
              {filteredRankedCandidates.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-gray-200 text-center space-y-2 shadow-2xs">
                  <Users className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm font-bold text-gray-700">
                    Arama kriterlerinize uygun aday bulunamadı.
                  </p>
                  <p className="text-xs text-gray-500">
                    Farklı bir arama terimi deneyebilir veya filtreleri temizleyebilirsiniz.
                  </p>
                </div>
              ) : (
                filteredRankedCandidates.map(({ student, match, stage }) => {
                  const score = match?.overallScore || 0;
                  const isTopMatch = score >= 85;

                  return (
                    <div
                      key={student.id}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs hover:shadow-xs transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Student Avatar & Identity */}
                        <div className="flex items-start sm:items-center gap-3.5">
                          <img
                            src={
                              blindHiringMode
                                ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
                                : student.avatarUrl
                            }
                            alt="Aday"
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-gray-900">
                                {blindHiringMode
                                  ? `Aday #${student.id.slice(-4).toUpperCase()}`
                                  : student.fullName}
                              </h4>
                              {isTopMatch && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Sparkles className="w-3 h-3" />
                                  Zirve Uyum
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {student.university} • {student.department} ({student.gradeLevel}) • GPA: {student.gpa.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Overall Match Score Badge */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">
                              Uyum Skoru
                            </span>
                            <span
                              className={`text-2xl font-black ${
                                score >= 85
                                  ?'text-emerald-600'
                                  : score >= 70
                                  ?'text-blue-600'
                                  :'text-amber-600'
                              }`}
                            >
                              %{score}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Matching Skills vs Missing Skills */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Eşleşen Yetkinlikler ({(match?.matchedRequiredSkills || []).length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(match?.matchedRequiredSkills || []).map((sk) => (
                              <span
                                key={sk}
                                className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                ✓ {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Gelişime Açık / Eksik:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(match?.missingRequiredSkills || []).length === 0 ? (
                              <span className="text-[11px] font-bold text-emerald-600">
                                🌟 Pozisyonun tüm şartlarını karşılıyor!
                              </span>
                            ) : (
                              (match?.missingRequiredSkills || []).map((sk) => (
                                <span
                                  key={sk}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-50 text-gray-500 border border-gray-200"
                                >
                                  - {sk}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Bar: Pipeline Stage Selector + Schedule Interview Button */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                        {/* Pipeline Stage Quick Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                          <span className="text-[11px] font-bold text-gray-600 mr-1 shrink-0">
                            Aşama:
                          </span>
                          {(
                            [
                              { key: 'new', label: 'Aday Havuzunda' },
                              { key: 'screening', label: 'Ön Eleme' },
                              { key: 'interview', label: 'Mülakat' },
                              { key: 'offer', label: 'Teklif' },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.key}
                              type="button"
                              onClick={() => handleStageChange(student.id, st.key)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                                stage === st.key
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  :'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingStudent(student)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            Profili İncele
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setInterviewModalData({
                                student,
                                listingTitle: selectedListing?.title || '',
                              })
                            }
                            className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer shrink-0"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Mülakata Davet Et</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: KANBAN RECRUITMENT PIPELINE BOARD                                  */}
          {/* ========================================================================= */}
          {activePortalTab === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {(
                [
                  {
                    key: 'new',
                    title: '1. Yeni Başvurular',
                    color: 'border-blue-400',
                    badgeColor: 'bg-blue-50 text-blue-700',
                    matcher: (app: ApplicationRecord) => app.status === 'submitted',
                  },
                  {
                    key: 'screening',
                    title: '2. Ön İnceleme & Case',
                    color: 'border-amber-400',
                    badgeColor: 'bg-amber-50 text-amber-700',
                    matcher: (app: ApplicationRecord) =>
                      app.status === 'under_review' || app.status === 'technical_assessment',
                  },
                  {
                    key: 'interview',
                    title: '3. Mülakat Sürecinde',
                    color: 'border-purple-400',
                    badgeColor: 'bg-purple-50 text-purple-700',
                    matcher: (app: ApplicationRecord) => app.status === 'interview_scheduled',
                  },
                  {
                    key: 'offer',
                    title: '4. Teklif / Kabul',
                    color: 'border-emerald-400',
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                    matcher: (app: ApplicationRecord) => app.status === 'offer_extended',
                  },
                ] as const
              ).map((col) => {
                const colApplicants = detailedApplicants.filter(({ app }) => col.matcher(app));

                return (
                  <div
                    key={col.key}
                    className={`bg-white rounded-3xl p-4 border-t-4 ${col.color} border-x border-b border-gray-200 shadow-2xs space-y-3 min-h-[400px]`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <h4 className="text-xs font-black text-gray-800">
                        {col.title}
                      </h4>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {colApplicants.length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {colApplicants.length === 0 ? (
                        <p className="text-[11px] text-gray-600 text-center py-8">
                          Bu aşamada aday yok
                        </p>
                      ) : (
                        colApplicants.map(({ app, student, match }) => (
                          <div
                            key={app.id}
                            className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2.5 shadow-2xs hover:shadow-xs transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {blindHiringMode
                                  ? `Aday #${student.id.slice(-4).toUpperCase()}`
                                  : student.fullName}
                              </p>
                              <span className="text-[10px] font-black text-blue-600 shrink-0">
                                %{match?.overallScore || app.matchScore}
                              </span>
                            </div>

                            <p className="text-[10px] text-gray-500 truncate">
                              {student.university} • {student.department}
                            </p>

                            {app.interviewDate && (
                              <p className="text-[10px] font-bold text-purple-600 truncate">
                                📅 {app.interviewDate}
                              </p>
                            )}

                            {/* Move Stage Quick Action */}
                            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingStudent(student)}
                                className="text-[10px] font-bold text-gray-600 hover:text-blue-600"
                              >
                                Profil
                              </button>

                              <div className="flex items-center gap-1 ml-auto">
                                {col.key !== 'new' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (col.key === 'screening') onUpdateApplicationStatus?.(app.id, 'submitted');
                                      if (col.key === 'interview') onUpdateApplicationStatus?.(app.id, 'under_review');
                                      if (col.key === 'offer') onUpdateApplicationStatus?.(app.id, 'interview_scheduled');
                                    }}
                                    className="text-[10px] font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
                                  >
                                    ←
                                  </button>
                                )}
                                {col.key !== 'offer' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (col.key === 'new') onUpdateApplicationStatus?.(app.id, 'under_review');
                                      if (col.key === 'screening') {
                                        setInterviewModalData({
                                          appId: app.id,
                                          student,
                                          listingTitle: selectedListing?.title || '',
                                        });
                                      }
                                      if (col.key === 'interview') onUpdateApplicationStatus?.(app.id, 'offer_extended');
                                    }}
                                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                                  >
                                    İlerlet →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW STUDENT FULL CV / PROFILE MODAL                               */}
      {/* ========================================================================= */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 border border-gray-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <img
                  src={
                    blindHiringMode
                      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
                      : viewingStudent.avatarUrl
                  }
                  alt={viewingStudent.fullName}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100 shrink-0"
                />
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {blindHiringMode
                      ? `Aday #${viewingStudent.id.slice(-4).toUpperCase()}`
                      : viewingStudent.fullName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {viewingStudent.university} • {viewingStudent.department}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {viewingStudent.gradeLevel} • Mezuniyet: {viewingStudent.graduationYear} • GPA: <strong>{viewingStudent.gpa.toFixed(2)} / 4.00</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="text-xs font-bold text-gray-600 hover:text-gray-700 cursor-pointer p-1 rounded-lg"
              >
                ✕ Kapat
              </button>
            </div>

            {/* Candidate Bio */}
            {viewingStudent.bio && (
              <div className="space-y-1 text-xs">
                <h4 className="font-extrabold text-gray-800">Hakkında / Özet</h4>
                <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  {viewingStudent.bio}
                </p>
              </div>
            )}

            {/* Technical Skills & Badges */}
            <div className="space-y-2 text-xs">
              <h4 className="font-extrabold text-gray-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Teknik Yetkinlikler ({viewingStudent.skills.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {viewingStudent.skills.map((sk) => (
                  <span
                    key={sk.name}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200 flex items-center gap-1"
                  >
                    <span>{sk.name}</span>
                    <span className="text-[10px] text-gray-600 font-normal">({sk.level})</span>
                    {sk.verified && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            {viewingStudent.projects && viewingStudent.projects.length > 0 && (
              <div className="space-y-2 text-xs">
                <h4 className="font-extrabold text-gray-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  Geliştirdiği Projeler
                </h4>
                <div className="space-y-2">
                  {viewingStudent.projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900">{proj.title}</p>
                        {proj.githubUrl && (
                          <a
                            href={proj.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Github className="w-3 h-3" />
                            GitHub İncele
                          </a>
                        )}
                      </div>
                      <p className="text-gray-600 text-[11px]">
                        {proj.description}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {proj.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white text-gray-600 border border-gray-200"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages & Soft Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-gray-800">Yabancı Diller</h4>
                <div className="space-y-1">
                  {viewingStudent.languages.map((l) => (
                    <div
                      key={l.id}
                      className="p-2 rounded-xl bg-gray-50 flex items-center justify-between"
                    >
                      <span className="font-bold text-gray-800">{l.language}</span>
                      <span className="text-gray-500 font-semibold">{l.proficiencyText || l.level}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-gray-800">Sosyal Yetkinlikler</h4>
                <div className="flex flex-wrap gap-1.5">
                  {viewingStudent.softSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = viewingStudent;
                  setViewingStudent(null);
                  setInterviewModalData({
                    student: s,
                    listingTitle: selectedListing?.title || '',
                  });
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Mülakata Davet Et</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SCHEDULE INTERVIEW MODAL                                          */}
      {/* ========================================================================= */}
      {interviewModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-gray-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600"/>
                <h3 className="text-base font-bold text-gray-900">
                  Mülakat Daveti Planla
                </h3>
              </div>
              <button
                onClick={() => setInterviewModalData(null)}
                className="text-xs font-bold text-gray-600 hover:text-gray-700 cursor-pointer"
              >
                Kapat
              </button>
            </div>

            {interviewSuccessNotice ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-gray-900">
                  Mülakat Daveti Gönderildi!
                </h4>
                <p className="text-xs text-gray-500">
                  Adaya e-posta ve StajımVar bildirimleri ile görüşme bağlantısı iletildi.
                </p>
              </div>
            ) : (
              <form onSubmit={handleScheduleInterviewSubmit} className="space-y-3.5 text-xs">
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
                  <p className="font-bold text-blue-900">
                    Aday: {interviewModalData.student.fullName}
                  </p>
                  <p className="text-[11px] text-blue-700">
                    {interviewModalData.student.university} • {interviewModalData.student.department}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Tarih *
                    </label>
                    <input
                      type="date"
                      required
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Saat *
                    </label>
                    <input
                      type="time"
                      required
                      value={interviewTime}
                      onChange={(e) => setInterviewTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Görüşme Platformu / Mekanı
                  </label>
                  <select
                    value={interviewPlatform}
                    onChange={(e) => setInterviewPlatform(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Google Meet">Google Meet (Otomatik Video Bağlantısı)</option>
                    <option value="Zoom">Zoom Video Mülakat</option>
                    <option value="Microsoft Teams">Microsoft Teams</option>
                    <option value="Şirket Genel Merkezi (Yüz Yüze)">Şirket Genel Merkezi (Yüz Yüze)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Adaya İletilecek Not veya Mülakat Konusu (Opsiyonel)
                  </label>
                  <textarea
                    rows={2}
                    value={interviewNotesInput}
                    onChange={(e) => setInterviewNotesInput(e.target.value)}
                    placeholder="Örn: 45 dk teknik case ve geçmiş projeler üzerine değerlendirme..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setInterviewModalData(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Daveti Gönder</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECRUITER FEEDBACK / CANDIDATE NOTE MODAL                          */}
      {/* ========================================================================= */}
      {feedbackModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-gray-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600"/>
                <h3 className="text-base font-bold text-gray-900">
                  İK Notu / Aday Geri Bildirimi
                </h3>
              </div>
              <button
                onClick={() => setFeedbackModalData(null)}
                className="text-xs font-bold text-gray-600 hover:text-gray-700 cursor-pointer"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleSaveFeedbackSubmit} className="space-y-3.5 text-xs">
              <p className="text-gray-600">
                <strong>{feedbackModalData.studentName}</strong> adlı adayın başvurusuna ait değerlendirme notu veya adaya gösterilecek sistem mesajı:
              </p>

              <div>
                <textarea
                  rows={4}
                  required
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Örn: Teknik case çalışması başarıyla tamamlandı. İkinci tur liderlik mülakatı için değerlendiriliyor..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setFeedbackModalData(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Notu Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT COMPANY PROFILE MODAL                                        */}
      {/* ========================================================================= */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-gray-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600"/>
                <h3 className="text-lg font-bold text-gray-900">
                  Şirket Profilini Düzenle
                </h3>
              </div>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-xs font-bold text-gray-600 hover:text-gray-700 cursor-pointer"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleSaveCompanyProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Şirket / Kurum Adı *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Sektör
                  </label>
                  <input
                    type="text"
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    placeholder="Örn: E-Ticaret & Tech"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Şirket Ölçeği
                  </label>
                  <input
                    type="text"
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    placeholder="Örn: 5000+ Çalışan"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Konum & Çalışma Modeli
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Örn: İstanbul (Maslak) / Hibrit"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Şirket Açıklaması / Genç Yetenek Programı
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    İK / Yetkili Adı
                  </label>
                  <input
                    type="text"
                    value={editRecruiterName}
                    onChange={(e) => setEditRecruiterName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Yetkili Ünvanı
                  </label>
                  <input
                    type="text"
                    value={editRecruiterRole}
                    onChange={(e) => setEditRecruiterRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Kurumsal Yetkili E-postası
                </label>
                <input
                  type="email"
                  value={editRecruiterEmail}
                  onChange={(e) => setEditRecruiterEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: NEW LISTING POSTING MODAL                                         */}
      {/* ========================================================================= */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-gray-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600"/>
                <h3 className="text-lg font-bold text-gray-900">
                  {activeCompany.name} İçin Yeni İlan Yayınla
                </h3>
              </div>
              <button
                onClick={() => setShowPostModal(false)}
                className="text-xs font-bold text-gray-600 hover:text-gray-700 cursor-pointer"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Pozisyon Başlığı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Frontend Developer Stajyeri (React & TS)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Departman
                  </label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="Örn: Yazılım Geliştirme"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Çalışma Şekli
                  </label>
                  <select
                    value={newWorkType}
                    onChange={(e) => setNewWorkType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Hybrid">Hibrit (Hybrid)</option>
                    <option value="Remote">Uzaktan (Remote)</option>
                    <option value="On-site">Ofiste (On-site)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Şehir
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Örn: İstanbul"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Staj Süresi
                  </label>
                  <input
                    type="text"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    placeholder="Örn: 20-30 İş Günü"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Staj Ücreti / Destek
                </label>
                <input
                  type="text"
                  value={newStipend}
                  onChange={(e) => setNewStipend(e.target.value)}
                  placeholder="Örn: 28.500 ₺ / Ay + Yemek"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Zorunlu Yetenekler (Virgülle ayırın) *
                </label>
                <input
                  type="text"
                  required
                  value={newReqSkills}
                  onChange={(e) => setNewReqSkills(e.target.value)}
                  placeholder="React, TypeScript, Git"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Pozisyon Açıklaması
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Stajyerin üstleneceği sorumluluklar ve projeler..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal-mandatory"
                  checked={newMandatory}
                  onChange={(e) => setNewMandatory(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label
                  htmlFor="modal-mandatory"
                  className="text-xs text-gray-700 cursor-pointer font-medium"
                >
                  Üniversite zorunlu staj belgesini kabul ediyoruz (SGK üniversite karşılar)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  İlanı Yayınla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
