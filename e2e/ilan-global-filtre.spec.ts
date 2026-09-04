import { expect,test,type Page } from '@playwright/test';

const company={name:'Global Test',slug:'global-test',logo_url:null,industry:'Teknoloji',size:'',location:'',description:'',rating:0};
const row=(id:string,title:string,country_code:string|null,work_type:'Remote'|'On-site')=>({
  id,company_id:'99999999-9999-4999-8999-999999999999',title,source_title:title,department:null,work_type,city:country_code==='FR'?'Paris':country_code==='TR'?'İstanbul':'Global',country_code,original_language:null,international_applicants:null,visa_sponsorship:null,
  mandatory_staj_accepted:false,voluntary_staj_accepted:true,is_paid:false,stipend_text:null,duration:null,term:'All Year',application_deadline:null,min_grade_level:null,required_skills:[],preferred_skills:[],description:'Test',responsibilities:[],perks:[],category:'general',featured:false,status:'published',applicants_count:0,posted_at:'2026-09-05T10:00:00Z',last_seen_at:null,source_verified_at:null,source_status:null,created_at:'2026-09-05T10:00:00Z',updated_at:'2026-09-05T10:00:00Z',origin:'scraped',source_id:null,source_url:'https://example.com',canonical_url:'https://example.com',apply_url:'https://example.com',application_method:'external',application_channel_id:null,insurance_note:null,companies:company,
});
const rows=[row('11111111-1111-4111-8111-111111111111','Paris Stajı','FR','On-site'),row('22222222-2222-4222-8222-222222222222','Türkiye Stajı','TR','On-site'),row('33333333-3333-4333-8333-333333333333','Gerçek Remote',null,'Remote'),row('44444444-4444-4444-8444-444444444444','Belirsiz Ofis',null,'On-site')];

async function transport(page:Page){
  await page.addInitScript(()=>localStorage.clear());
  await page.addLocatorHandler(page.getByRole('button',{name:'Reddet',exact:true}),async b=>b.click());
  await page.route('https://**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/rpc/get_published_listings_catalog')){
      const args=route.request().postDataJSON();
      const listings=args.p_country==='all'?rows:args.p_country==='remote'?rows.filter(x=>x.work_type==='Remote'):rows.filter(x=>x.country_code===args.p_country);
      await route.fulfill({json:{listings,total:args.p_country==='all'?67:listings.length,facets:{countries:[{code:'FR',count:1},{code:'TR',count:1}]},hasMore:false,nextCursor:null,snapshot:'2026-09-05T12:00:00Z'}});return;
    }
    if(url.pathname.endsWith('/api/visitor-context')){await route.fulfill({json:{countryCode:'FR'}});return;}
    await route.fulfill({json:[]});
  });
}

test('paylasilan FR filtresi yenilemede kalir ve Turkce arayuzden bagimsizdir',async({page})=>{
  await transport(page);await page.goto('/?country=FR');
  const selector=page.getByRole('combobox',{name:'İlan ülkesi'});
  await expect(selector).toHaveValue('FR');
  await expect(page.getByText('Paris Stajı')).toBeVisible();
  await expect(page.getByText('Türkiye Stajı')).toHaveCount(0);
  await page.reload();await expect(selector).toHaveValue('FR');
  await expect(page.locator('html')).not.toHaveAttribute('lang','fr');
});

test('remote NULL ulkeyi degil yalniz Remote work_type kaydini getirir',async({page})=>{
  await transport(page);await page.goto('/?country=remote');
  await expect(page.getByText('Gerçek Remote')).toBeVisible();
  await expect(page.getByText('Belirsiz Ofis')).toHaveCount(0);
});

test('375 pikselde gercek facet secici tasmaz ve secim URLye yazilir',async({page})=>{
  await transport(page);await page.goto('/?country=all');
  await expect(page.getByText('Toplam 67 açık ilan')).toBeVisible();
  const selector=page.getByRole('combobox',{name:'İlan ülkesi'});
  await expect(selector.locator('option')).toHaveCount(4);
  await selector.selectOption('TR');await expect(page).toHaveURL(/country=TR/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});

test('ulke secimi tarayici geri ve ileri gecmisini izler',async({page})=>{
  await transport(page);await page.goto('/?country=all');
  const selector=page.getByRole('combobox',{name:'İlan ülkesi'});
  await selector.selectOption('TR');await expect(selector).toHaveValue('TR');
  await selector.selectOption('FR');await expect(selector).toHaveValue('FR');
  await page.goBack();await expect(selector).toHaveValue('TR');
  await page.goForward();await expect(selector).toHaveValue('FR');
});
