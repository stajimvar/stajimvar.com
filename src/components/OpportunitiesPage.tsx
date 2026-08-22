import React from 'react';
import { Bookmark, CheckCircle2, ChevronRight, ExternalLink, Filter, Search, Sparkles } from 'lucide-react';
import type { StudentProfile } from '../types';
import { GoogleAdBanner } from './GoogleAdBanner';
import { CompanyLogo } from './CompanyLogo';
import { fetchOpportunities, fetchSavedOpportunityIds, toggleSavedOpportunity, type Opportunity, type OpportunityType } from '../lib/opportunities';
import { getOpportunityOverview, isExpiredOpportunity, matchOpportunity, readOpportunityFilters, serializeOpportunityFilters } from '../lib/opportunity-domain.mjs';

const LABELS: Record<OpportunityType, string> = { scholarship: 'Burs', kyk: 'KYK', international: 'Yurtdışı', competition: 'Yarışma', education: 'Eğitim', student_support: 'Öğrenci desteği', youth_program: 'Gençlik programı' };
const categoryPath: Record<string, OpportunityType | ''> = { '/burslar': 'scholarship', '/kyk': 'kyk', '/yurtdisi-firsatlari': 'international', '/yarismalar': 'competition' };
const safeDate = (value?: string) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(value)) : 'Tarih belirtilmemiş';
const profileForMatch = (student: StudentProfile) => ({ educationLevel: student.gradeLevel === 'Yüksek Lisans / Mezun' ? 'Yüksek Lisans' : 'Lisans', department: student.department, gradeLevel: student.gradeLevel, city: student.preferences.cities[0] || '', gpa: student.gpa || null, languages: (student.languages ?? []).map((item) => item.language) });

export const OpportunitiesPage: React.FC<{ path: string; userId: string | null; student: StudentProfile | null; onNavigate: (path: string) => void; onRequireLogin: () => void }> = ({ path, userId, student, onNavigate, onRequireLogin }) => {
  const [items, setItems] = React.useState<Opportunity[]>([]); const [saved, setSaved] = React.useState<string[]>([]); const [state, setState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [filters, setFilters] = React.useState(() => ({ ...readOpportunityFilters(window.location.search), type: categoryPath[path] || readOpportunityFilters(window.location.search).type }));
  const savedOnly = path === '/kaydedilen-firsatlar'; const calendar = path === '/firsat-takvimi'; const matching = path === '/bana-uygun';
  React.useEffect(() => { document.title = `${matching ? 'Bana uygun fırsatlar' : calendar ? 'Fırsat takvimi' : 'Öğrenci Fırsatları'} | StajımVar`; const canonical = document.querySelector('link[rel="canonical"]') || Object.assign(document.createElement('link'), { rel: 'canonical' }); canonical.setAttribute('href', `${window.location.origin}${path}`); document.head.appendChild(canonical); }, [path, matching, calendar]);
  React.useEffect(() => { let cancelled = false; Promise.all([fetchOpportunities(), userId ? fetchSavedOpportunityIds(userId) : Promise.resolve([])]).then(([rows, ids]) => { if (!cancelled) { setItems(rows); setSaved(ids); setState('ready'); } }).catch(() => { if (!cancelled) setState('error'); }); return () => { cancelled = true; }; }, [userId]);
  React.useEffect(() => { const query = serializeOpportunityFilters(filters); if (path === '/firsatlar' && window.location.search !== query) window.history.replaceState({}, '', `${path}${query}`); }, [filters, path]);
  const set = (patch: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...patch }));
  const profile = student ? profileForMatch(student) : null;
  const filtered = items.filter((item) => {
    if (savedOnly && !saved.includes(item.id)) return false; if (filters.type && item.opportunityType !== filters.type) return false;
    if (filters.openOnly && isExpiredOpportunity(item)) return false; if (filters.level && !item.educationLevels.includes(filters.level)) return false;
    if (filters.place && ![...item.cities, ...item.countries].some((place) => place.toLocaleLowerCase('tr-TR').includes(filters.place.toLocaleLowerCase('tr-TR')))) return false;
    if (filters.query && !`${item.title} ${item.organizationName} ${item.shortDescription}`.toLocaleLowerCase('tr-TR').includes(filters.query.toLocaleLowerCase('tr-TR'))) return false;
    if (matching) return profile ? matchOpportunity(item, profile).isScorable && matchOpportunity(item, profile).score! > 0 : false; return true;
  }).sort((a, b) => (a.applicationDeadline || '9999').localeCompare(b.applicationDeadline || '9999'));
  const missing = matching && profile ? Array.from(new Set(items.flatMap((item) => matchOpportunity(item, profile).missingProfileFields))) : [];
  const save = async (item: Opportunity) => { if (!userId) return onRequireLogin(); const isSaved = saved.includes(item.id); await toggleSavedOpportunity(userId, item.id, isSaved); setSaved((rows) => isSaved ? rows.filter((id) => id !== item.id) : [...rows, item.id]); };
  const heading = savedOnly ? 'Kaydedilen fırsatlar' : calendar ? 'Fırsat Takvimi' : matching ? 'Bana uygun fırsatlar' : 'Öğrenci Fırsatları';
  /*
    ANA SAYFAYLA AYNI DÜZEN: 3 / 6 / 3

    Sayfa önce tam genişlikte tek sütundu: filtreler yatay bir şerit,
    kartlar üç sütunlu ızgara. İki sorunu vardı.

      1. Ana sayfadan farklı hissettiriyordu. Kullanıcı ilanlardan buraya
         geçince arayüz değişiyor, filtreyi yeniden arıyordu.
      2. Reklam koyacak yer yoktu. Ana sayfada akış arası ve kenar çubuğu
         yuvaları var; burada tam genişlik ızgara hiçbir yer bırakmıyordu.

    Artık MatchedInternshipsView ile aynı iskelet: solda yapışkan filtre
    sütunu, ortada tek sütun kart akışı, sağda yapışkan kenar çubuğu.
    `items-start` şart — onsuz yapışkan sütunlar ızgara hücresini kaplayıp
    yapışma davranışını kaybediyor.

    SAĞ SÜTUNDAKİ KATEGORİLER YENİ DEĞİL, SAKLIYDI
    /burslar, /kyk, /yurtdisi-firsatlari, /yarismalar, /firsat-takvimi ve
    /kaydedilen-firsatlar rotaları zaten çalışıyordu ama hiçbir yerden
    bağlantı verilmiyordu. Yani altı sayfa erişilemez duruyordu.
  */
  const overview = getOpportunityOverview(items);

  const kategoriler: [string, string][] = [
    ['/firsatlar', 'Tümü'],
    ['/burslar', 'Burslar'],
    ['/kyk', 'KYK'],
    ['/yurtdisi-firsatlari', 'Yurt dışı'],
    ['/yarismalar', 'Yarışmalar'],
    ['/firsat-takvimi', 'Takvim'],
    ['/kaydedilen-firsatlar', 'Takip ettiklerim'],
  ];

  return <main className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-7 pb-24 lg:pb-10">
    {/*
      MAVİ BANT — YARI YÜKSEKLİKTE

      Önce kaldırılmıştı çünkü ekranın üst yarısını kaplıyor ve fırsat
      kartları kaydırmadan görünmüyordu. Geri istendi, bu sefer inceltilerek.

      Yüksekliği yarıya indiren şey başlığı ve sayaçları AYNI SATIRA almak.
      Eskiden alt alta dört blok vardı: üst etiket, başlık, açıklama, sayaç
      ızgarası. Şimdi solda başlık + tek satır açıklama, sağda üç sayaç
      yan yana. Dar ekranda alt alta düşüyorlar — orada zaten yer var.

      Sayfa başlığı (h1) artık burada. Sol sütundaki ikinci başlık
      kaldırıldı; iki h1 hem gereksiz tekrar hem de belge yapısı olarak
      yanlıştı.
    */}
    <section className="mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">{heading}</h1>
          <p className="text-[11px] sm:text-xs text-blue-100 leading-snug">{savedOnly ? 'Sonradan incelemek için takibe aldığın fırsatlar.' : calendar ? 'Yaklaşan son başvuru tarihlerini tek yerde izle.' : matching ? 'Profilindeki doğrulanabilir bilgilerle hesaplanan sonuçlar.' : 'Burs, kredi, eğitim, yurtdışı ve yarışma — hepsi resmî kaynağıyla doğrulanmış.'}</p>
        </div>

        {/*
          Sayaçlar yalnızca ana listede. Kaydedilenler, takvim ve eşleşme
          sayfalarında farklı bir kümeyi anlatırlar ve yanıltıcı olurlar.
        */}
        {!savedOnly && !calendar && !matching && state === 'ready' && (
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {[
              [overview.openCount, 'Başvurusu devam eden'],
              [overview.scholarshipAndCreditCount, 'Burs ve kredi'],
              [overview.nearest && overview.daysLeft != null ? `${overview.daysLeft} gün` : items.length, overview.nearest && overview.daysLeft != null ? 'En yakın son başvuru' : 'Takip ettiğimiz fırsat'],
            ].map(([deger, etiket]) => (
              <div key={String(etiket)} className="rounded-xl bg-white/10 px-3 py-1.5 leading-tight">
                <b className="block text-base sm:text-lg font-extrabold">{deger}</b>
                <span className="block text-[10px] text-blue-100 whitespace-nowrap">{etiket}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">

      {/* ---------------------------------------------- sol: başlık + filtre */}
      <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-4">
        {!savedOnly && !calendar && !matching && (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
            <label className="relative block">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400"/>
              <input aria-label="Fırsat ara" value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder="Burs, kurum veya program ara" className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
            </label>
            <select aria-label="Fırsat türü" value={filters.type} onChange={(e) => set({ type: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              <option value="">Tüm türler</option>
              {Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input aria-label="Eğitim seviyesi" value={filters.level} onChange={(e) => set({ level: e.target.value })} placeholder="Eğitim seviyesi" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"/>
            <input aria-label="Şehir veya ülke" value={filters.place} onChange={(e) => set({ place: e.target.value })} placeholder="Şehir veya ülke" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"/>
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => set({ openOnly: !filters.openOnly })} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filters.openOnly ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Başvurusu devam edenler</button>
              <button onClick={() => set({ query: '', type: categoryPath[path] || '', level: '', place: '', openOnly: false })} className="rounded-full px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100">Temizle</button>
            </div>
          </section>
        )}
      </div>

      {/* ------------------------------------------------- orta: kart akışı */}
      <div className="lg:col-span-6 space-y-4 min-w-0">
        {matching && !student && <Empty icon={<Sparkles />} title="Sana uygun fırsatları görmek için giriş yap" body="Eşleştirme yalnızca kendi profilindeki bilgilerle yapılır." action="Giriş yap" onClick={onRequireLogin} />}
        {matching && student && missing.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Eşleştirme için profilinde eksik alanlar var:</b> {missing.join(', ')}</div>}

        {state === 'loading' ? <div role="status" className="space-y-4">{[1,2,3].map((x) => <div key={x} className="h-56 rounded-2xl bg-gray-100 animate-pulse"/>)}</div>
        : state === 'error' ? <Empty icon={<Filter />} title="Fırsatlar şu anda yüklenemedi" body="Bağlantını kontrol edip tekrar dene." />
        : calendar ? <Calendar items={filtered.filter((item) => item.applicationDeadline)} onNavigate={onNavigate} />
        : filtered.length ? <>
            <p aria-live="polite" className="text-sm text-gray-600"><b>{filtered.length}</b> fırsat gösteriliyor</p>
            <div className="space-y-4">
              {filtered.map((item, sira) => <React.Fragment key={item.id}>
                <Card item={item} saved={saved.includes(item.id)} onSave={() => save(item)} onNavigate={onNavigate} match={matching && profile ? matchOpportunity(item, profile) : null}/>
                {/*
                  Akış arası reklam, üçüncü karttan sonra. Yayıncı kimliği
                  tanımlı değilse GoogleAdBanner hiçbir şey çizmiyor; boş
                  bir kutu kalmıyor.
                */}
                {sira === 2 && <GoogleAdBanner format="in-feed" />}
              </React.Fragment>)}
            </div>
          </>
        : savedOnly ? <Empty icon={<Sparkles />} title="Henüz takip ettiğin fırsat yok" body="Fırsat kartlarındaki “Takip et” düğmesine bastıklarında burada birikiyor. Başvuru takvimi açıklandığında kartta tarih beliriyor." action="Fırsatlara göz at" onClick={() => onNavigate('/firsatlar')} />
        : items.length ? <Empty icon={<Filter />} title="Bu filtrelere uyan fırsat yok" body={`Sitede ${items.length} fırsat var ama seçtiğin filtrelere uymuyor. Filtreleri temizleyip tekrar bak.`} action="Filtreleri temizle" onClick={() => set({ query: '', type: categoryPath[path] || '', level: '', place: '', openOnly: false })} />
        : <Empty icon={<Sparkles />} title="Şu anda aktif başvuru dönemi olan fırsat bulunmuyor" body="Fırsatları resmî kaynağından doğrulayarak yayımlıyoruz; doğrulayamadığımız hiçbir burs veya yarışmayı listeye almıyoruz. Takvim açıldığında burada görünecek." action="Staj ilanlarına bak" onClick={() => onNavigate('/')} />}
      </div>

      {/* ------------------------------------------ sağ: kategoriler + reklam */}
      <div className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-4">
        <nav aria-label="Fırsat kategorileri" className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Kategoriler</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {kategoriler.map(([yol, etiket]) => <button key={yol} onClick={() => onNavigate(yol)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${path === yol ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{etiket}</button>)}
          </div>
        </nav>

        <aside className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
          <p className="text-sm font-bold text-gray-900">Fırsatları nasıl seçiyoruz</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Her kaydın resmî kaynağı doğrulanıyor; kurumun kendi sayfasında görmediğimiz
            hiçbir burs veya yarışma listeye girmiyor. Tutar ve son başvuru tarihi her yıl
            değiştiği için uydurmuyoruz — takvim açıklandığında karta tarih düşüyor.
          </p>
        </aside>

        <GoogleAdBanner format="sidebar-rectangle" />
      </div>

    </div>
  </main>;
};

/*
  FIRSAT KARTI

  Staj kartından ayrılan üç yeri var, üçü de bilerek:

  1. SON BAŞVURU TARİHİ EN BÜYÜK ÖĞE. Bursta karar veren şey ilanın
     içeriği değil, kaçırıp kaçırmadığın. Tarih küçük bir etiketken
     kartın en son okunan yeriydi.

  2. TARİH YOKSA SUSMUYORUZ. Burs takvimleri yılın büyük bölümünde
     açıklanmamış oluyor; eski kart bu durumda hiçbir şey yazmıyordu ve
     fırsat "tarihi geçmiş" gibi duruyordu. Artık "Dönemsel" yazıyor ve
     ne anlama geldiğini söylüyor.

  3. "TAKİP ET" — "ALARM KUR" DEĞİL. Sitede bildirim altyapısı yok
     (e-posta sağlayıcısı bağlı değil, notifier.py rafta). Alarm deyip
     haber verememek, bekleteni hiç aramamak olur. Takip edilen fırsat
     /kaydedilen-firsatlar sayfasında birikiyor; takvim açıklandığında
     karta tarih düşüyor.
*/
const SEVIYE_KISA = (levels: string[]) => levels.length ? (levels.length > 2 ? `${levels[0]} +${levels.length - 1}` : levels.join(', ')) : null;

const Card: React.FC<{ item: Opportunity; saved: boolean; onSave: () => void; onNavigate: (p: string) => void; match: any }> = ({ item, saved, onSave, onNavigate, match }) => {
  const expired = isExpiredOpportunity(item);
  const seviye = SEVIYE_KISA(item.educationLevels);
  const basvuruAdresi = item.applicationUrl || item.sourceUrl;
  return (
    <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex gap-3">
        {/*
          Kurum logosu YUVARLAK ve gerçek görsel.

          Önce mavi bir kareye kurumun ilk harfi basılıyordu ("G", "T"...).
          Aynı harfle başlayan iki kurum ayırt edilemiyordu ve sitedeki
          diğer bütün logolar yuvarlakken burası kareydi.

          CompanyLogo şirket kartlarında zaten kullanılıyor: organization_logo_url
          doluysa görseli, boşsa kurumun baş harflerini çiziyor. Yani logo
          gelmemiş kurum boş kutu göstermiyor.
        */}
        <CompanyLogo
          name={item.organizationName}
          logoUrl={item.organizationLogoUrl}
          className="w-11 h-11 shrink-0 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-blue-700">{LABELS[item.opportunityType]}</span>
            {item.verifiedAt && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5"><CheckCircle2 className="w-3 h-3"/>Resmî kaynak</span>}
          </div>
          <h2 className="mt-1 font-extrabold text-gray-950 leading-snug">{item.title}</h2>
          <p className="text-sm text-gray-600 truncate">{item.organizationName}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{item.shortDescription}</p>

      {/* Tarih bloğu: kartın en belirgin yeri. */}
      <div className={`rounded-xl px-3 py-2.5 ${expired ? 'bg-gray-50' : item.applicationDeadline ? 'bg-rose-50' : 'bg-amber-50'}`}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Son başvuru</p>
        {item.applicationDeadline
          ? <p className={`text-lg font-extrabold leading-tight ${expired ? 'text-gray-500' : 'text-rose-700'}`}>{expired ? 'Süresi doldu' : safeDate(item.applicationDeadline)}</p>
          : <><p className="text-lg font-extrabold leading-tight text-amber-800">Dönemsel</p><p className="text-[11px] text-amber-800/80">Takvim açıklanınca burada tarih görünecek.</p></>}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {item.amountText && <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-semibold">{item.amountText}</span>}
        {seviye && <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{seviye}</span>}
        {item.cities.length > 0 && <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{item.cities.join(', ')}</span>}
        {match?.isScorable && <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5">%{match.score} uyum</span>}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <a href={basvuruAdresi} target="_blank" rel="noopener" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Başvur <ExternalLink className="w-3.5 h-3.5"/></a>
        <button onClick={onSave} aria-label={saved ? 'Takibi bırak' : 'Takip et'} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold border ${saved ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}><Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'}/>{saved ? 'Takipte' : 'Takip et'}</button>
      </div>

      <button onClick={() => onNavigate(`/firsatlar/${item.slug}`)} className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline">Detayı gör <ChevronRight className="w-4 h-4"/></button>
    </article>
  );
};

const Calendar: React.FC<{ items: Opportunity[]; onNavigate: (p: string) => void }> = ({ items, onNavigate }) => <section className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">{items.map((item) => <button key={item.id} onClick={() => onNavigate(`/firsatlar/${item.slug}`)} className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 flex items-center gap-4"><time className="w-20 shrink-0 text-sm font-extrabold text-blue-700">{safeDate(item.applicationDeadline)}</time><span className="min-w-0 flex-1"><b className="block truncate">{item.title}</b><span className="text-sm text-gray-600">{item.organizationName}</span></span><ChevronRight className="w-4 h-4 text-gray-400"/></button>)}</section>;
const Empty: React.FC<{ icon: React.ReactNode; title: string; body: string; action?: string; onClick?: () => void }> = ({ icon, title, body, action, onClick }) => <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gray-100 text-gray-500">{icon}</div><h2 className="font-extrabold text-gray-900">{title}</h2><p className="mt-1 text-sm text-gray-600">{body}</p>{action && <button onClick={onClick} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">{action}</button>}</section>;
