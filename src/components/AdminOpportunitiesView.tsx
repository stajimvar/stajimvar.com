import React from 'react';
import { adminCreateOpportunity, adminSetOpportunityAmount, adminSetOpportunityStatus, adminUpdateOpportunity, fetchAdminOpportunities, fetchAdminOpportunity } from '../lib/opportunity-admin';
import { normalizeStringList, slugifyOpportunity, validateOpportunityAdminDraft } from '../lib/opportunity-admin-domain.mjs';

const blank = { title:'', organizationName:'', opportunityType:'scholarship', shortDescription:'', description:'', eligibility:'', sourceUrl:'', applicationUrl:'', applicationStartAt:'', applicationDeadline:'', minimumGpa:'', educationLevels:[], eligibleDepartments:[], eligibleClassYears:[], cities:[], countries:[], languageRequirements:[], requiredDocuments:[] };
const types = [['scholarship','Burs'],['kyk','KYK'],['international','Yurt dışı'],['competition','Yarışma'],['education','Eğitim'],['student_support','Öğrenci desteği'],['youth_program','Gençlik programı']];
const asPayload=(f:any)=>({ ...f, slug:slugifyOpportunity(f.title), organization_name:f.organizationName, opportunity_type:f.opportunityType, source_url:f.sourceUrl, application_url:f.applicationUrl||null, short_description:f.shortDescription||null, application_start_at:f.applicationStartAt||null, application_deadline:f.applicationDeadline||null, minimum_gpa:f.minimumGpa||null, education_levels:normalizeStringList(f.educationLevels), eligible_departments:normalizeStringList(f.eligibleDepartments), eligible_class_years:normalizeStringList(f.eligibleClassYears), cities:normalizeStringList(f.cities), countries:normalizeStringList(f.countries), language_requirements:normalizeStringList(f.languageRequirements), required_documents:normalizeStringList(f.requiredDocuments) });

export const AdminOpportunitiesView:React.FC<{onNavigate:(path:string)=>void}> = ({onNavigate}) => {
 const [rows,setRows]=React.useState<any[]>([]); const [query,setQuery]=React.useState(''); const [state,setState]=React.useState<'loading'|'ready'|'error'>('loading'); const [message,setMessage]=React.useState(''); const load=React.useCallback(async()=>{setState('loading');try{const r=await fetchAdminOpportunities(0,query);setRows(r.rows);setState('ready')}catch(e:any){setMessage(e.message);setState('error')}},[query]); React.useEffect(()=>{void load()},[load]);
 const change=async(row:any,status:any)=>{try{await adminSetOpportunityStatus(row.id,row.updatedAt,status);setMessage('Durum güncellendi.');void load()}catch(e:any){setMessage(e.message)}};
 return <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-5"><div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div><h1 className="text-2xl font-extrabold">Fırsat yönetimi</h1><p className="text-sm text-gray-600">Yalnızca yetkili yöneticiler kayıt oluşturabilir veya durum değiştirebilir.</p></div><button onClick={()=>onNavigate('/yonetim/firsatlar/yeni')} className="rounded-xl bg-blue-600 text-white font-bold px-4 py-2.5">Yeni fırsat</button></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Başlık veya kurum ara" className="w-full max-w-md rounded-xl border p-3" />{message&&<p role="status" className="text-sm text-red-700">{message}</p>}{state==='loading'?<p>Yükleniyor…</p>:state==='error'?<button onClick={load}>Tekrar dene</button>:<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[720px] text-sm"><thead><tr className="text-left bg-gray-50"><th className="p-3">Fırsat</th><th>Tür</th><th>Durum</th><th>Son tarih</th><th className="p-3">İşlem</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t"><td className="p-3"><b>{row.title}</b><br/><span className="text-gray-500">{row.organizationName}</span></td><td>{row.opportunityType}</td><td>{row.status}</td><td>{row.applicationDeadline?new Date(row.applicationDeadline).toLocaleDateString('tr-TR'):'—'}</td><td className="p-3 flex gap-2"><a href={`/firsatlar/${row.slug}`} target="_blank" rel="noreferrer">Önizle</a>{row.status!=='published'&&<button onClick={()=>change(row,'published')}>Yayınla</button>}{row.status==='published'&&<button onClick={()=>change(row,'draft')}>Taslağa al</button>}<button onClick={()=>change(row,'archived')}>Arşivle</button></td></tr>)}</tbody></table>{rows.length===0&&<p className="p-8 text-center text-gray-600">Henüz fırsat yok.</p>}</div>}</main>;
};

/**
 * Tutar formu.
 *
 * NEDEN AYRI BİR FORM
 * -------------------
 * Tutar girmek ayrı bir editoryal iş: birinin resmî kaynağa bakıp "bu yıl
 * şu kadar" demesi gerekiyor. Kaydın geri kalanıyla aynı düğmeye
 * bağlanırsa, başlıkta yapılan bir yazım düzeltmesi tutarı da
 * "doğrulanmış" damgalardı.
 *
 * Doğrulama tarihini sunucu koyuyor; burada öyle bir alan yok.
 */
const TutarFormu:React.FC<{id:string; kayit:any; expected:string; onKaydedildi:(yeniTs:string)=>void}> = ({id,kayit,expected,onKaydedildi}) => {
  const [f,setF]=React.useState({
    amount_min: kayit?.amount_min ?? '',
    amount_max: kayit?.amount_max ?? '',
    currency: kayit?.currency || 'TRY',
    payment_period: kayit?.payment_period || '',
    amount_period_label: kayit?.amount_period_label || '',
    amount_note: kayit?.amount_note || '',
    repayable: kayit?.repayable === true ? 'true' : kayit?.repayable === false ? 'false' : '',
  });
  const [durum,setDurum]=React.useState<string|null>(null);
  const [saving,setSaving]=React.useState(false);
  const set=(k:string,v:any)=>setF((x:any)=>({...x,[k]:v}));

  const kaydet=async()=>{
    setSaving(true); setDurum(null);
    try {
      const yeni = await adminSetOpportunityAmount(id, expected, f);
      onKaydedildi(yeni);
      setDurum(f.amount_min || f.amount_note ? 'Tutar kaydedildi ve doğrulandı olarak işaretlendi.' : 'Tutar temizlendi; kartta "açıklanmadı" yazacak.');
    } catch(e:any){ setDurum(e.message); }
    finally { setSaving(false); }
  };

  const alan=(k:string,etiket:string,tur='text')=>(
    <label className="block text-sm font-semibold">{etiket}
      <input type={tur} value={(f as any)[k]} onChange={e=>set(k,e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
    </label>
  );

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-gray-900">Destek tutarı</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          Yalnızca resmî kaynakta AÇIKÇA yazan tutarı gir. Kaydettiğin an bu tutar
          doğrulanmış sayılır ve kartlarda görünmeye başlar; boş bırakılırsa kartta
          &quot;Tutar resmî kaynakta açıklanmadı&quot; yazar. Geçen yılın rakamını bu yılınmış
          gibi yazma — dönem etiketini de doldur.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {alan('amount_min','Tutar (tek tutarda buraya yaz)','number')}
        {alan('amount_max','Üst sınır (aralıksa)','number')}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-semibold">Para birimi
          <select value={f.currency} onChange={e=>set('currency',e.target.value)} className="mt-1 w-full rounded-xl border p-3">
            {['TRY','EUR','USD','GBP'].map(x=><option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Ödeme sıklığı
          <select value={f.payment_period} onChange={e=>set('payment_period',e.target.value)} className="mt-1 w-full rounded-xl border p-3">
            <option value="">Belirtilmemiş</option>
            <option value="monthly">Aylık</option>
            <option value="once">Tek seferlik</option>
            <option value="yearly">Yıllık</option>
            <option value="term">Dönemlik</option>
          </select>
        </label>
      </div>

      {alan('amount_period_label','Dönem etiketi (örn. 2026-2027 dönemi)')}
      {alan('amount_note','Sayıya sığmayan durum (örn. Eğitim ücretinin %50si)')}

      <label className="block text-sm font-semibold">Geri ödeme
        <select value={f.repayable} onChange={e=>set('repayable',e.target.value)} className="mt-1 w-full rounded-xl border p-3">
          <option value="">Bilinmiyor</option>
          <option value="false">Karşılıksız</option>
          <option value="true">Geri ödemeli</option>
        </select>
      </label>

      <button type="button" onClick={kaydet} disabled={saving} className="rounded-xl bg-amber-600 text-white font-bold px-5 py-2.5 disabled:opacity-50 cursor-pointer">
        {saving?'Kaydediliyor…':'Tutarı kaydet'}
      </button>
      {durum && <p className="text-xs font-semibold text-gray-800">{durum}</p>}
    </section>
  );
};

export const AdminOpportunityCreate:React.FC<{onDone:(path:string)=>void; editId?:string}> = ({onDone,editId}) => { const [form,setForm]=React.useState<any>(blank); const [kayit,setKayit]=React.useState<any>(null); const [expected,setExpected]=React.useState(''); const [errors,setErrors]=React.useState<any>({}); const [saving,setSaving]=React.useState(false); React.useEffect(()=>{if(!editId)return;void fetchAdminOpportunity(editId).then((r:any)=>{if(!r)throw new Error('Kayıt bulunamadı');setKayit(r);setExpected(r.updated_at);setForm({...blank,title:r.title,organizationName:r.organization_name,opportunityType:r.opportunity_type,shortDescription:r.short_description||'',description:r.description||'',eligibility:r.eligibility||'',sourceUrl:r.source_url,applicationUrl:r.application_url||'',applicationStartAt:r.application_start_at?.slice(0,16)||'',applicationDeadline:r.application_deadline?.slice(0,16)||'',minimumGpa:r.minimum_gpa||'',educationLevels:r.education_levels||[],eligibleDepartments:r.eligible_departments||[],eligibleClassYears:r.eligible_class_years||[],cities:r.cities||[],countries:r.countries||[],languageRequirements:r.language_requirements||[],requiredDocuments:r.required_documents||[]})}).catch(e=>setErrors({form:e.message}))},[editId]); const set=(key:string,value:any)=>setForm((x:any)=>({...x,[key]:value})); const submit=async(e:React.FormEvent)=>{e.preventDefault();const next=validateOpportunityAdminDraft(form);setErrors(next);if(Object.keys(next).length)return;setSaving(true);try{if(editId)await adminUpdateOpportunity(editId,expected,asPayload(form));else await adminCreateOpportunity(asPayload(form));onDone('/yonetim/firsatlar')}catch(err:any){setErrors({form:err.message})}finally{setSaving(false)}}; const field=(key:string,label:string,type='text')=><label className="block text-sm font-semibold">{label}<input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} className="mt-1 w-full rounded-xl border p-3" />{errors[key]&&<span className="text-red-700 text-xs">{errors[key]}</span>}</label>; return <main className="max-w-3xl mx-auto p-4 sm:p-8"><button onClick={()=>onDone('/yonetim/firsatlar')} className="text-sm text-blue-700 mb-4">← Fırsatlara dön</button><form onSubmit={submit} className="space-y-5 bg-white border rounded-2xl p-5 sm:p-7"><div><h1 className="text-2xl font-extrabold">{editId?'Fırsatı düzenle':'Yeni fırsat'}</h1><p className="text-sm text-gray-600">{editId?'Değişiklikler eşzamanlı kayıt korumasıyla saklanır.':'Kayıt taslak olarak oluşturulur; yayınlama ayrı işlemdir.'}</p></div>{field('title','Başlık')}{field('organizationName','Kurum') }<label className="block text-sm font-semibold">Tür<select value={form.opportunityType} onChange={e=>set('opportunityType',e.target.value)} className="mt-1 w-full rounded-xl border p-3">{types.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="block text-sm font-semibold">Açıklama<textarea value={form.description} onChange={e=>set('description',e.target.value)} className="mt-1 w-full min-h-40 rounded-xl border p-3" />{errors.description&&<span className="text-red-700 text-xs">{errors.description}</span>}</label>{field('sourceUrl','Resmî kaynak URL','url')}{field('applicationUrl','Başvuru URL (opsiyonel)','url')}<div className="grid sm:grid-cols-2 gap-4">{field('applicationStartAt','Başlangıç','datetime-local')}{field('applicationDeadline','Son tarih','datetime-local')}</div>{field('minimumGpa','Minimum GPA (opsiyonel)','number')}<p className="text-xs text-red-700">{errors.form}</p><button disabled={saving} className="rounded-xl bg-blue-600 text-white font-bold px-5 py-3 disabled:opacity-50">{saving?'Kaydediliyor…':editId?'Kaydet':'Taslak oluştur'}</button></form>{/* Tutar yalnızca var olan kayıtta girilebiliyor: eşzamanlılık koruması updated_at'e dayanıyor ve yeni kaydın henüz bir damgası yok. */}{editId&&kayit&&<TutarFormu id={editId} kayit={kayit} expected={expected} onKaydedildi={setExpected} />}</main>; };
