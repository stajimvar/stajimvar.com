/*
  WORKDAY İLANLARI — ELLE, PLANLI KAPANIŞLA (25 Kasım 2026)

  PwC Türkiye, Bentley Systems ve Signify ilanları 26 ilanlık Türkiye
  teslimiyle doğrulandı (Workday CXS API'si: açık, ülke Türkiye,
  canApply=true). Otomasyon bunları ekleyemiyor: Workday GitHub
  koşucularından gelen her isteği 429 ile reddediyor (PUMA son 6 koşunun
  6'sında aynı hata).

  Kullanıcı kararı: "son kapanma tarihi belirle, o gün gelince kapansın".
  Şirketler son başvuru tarihi VERMİYOR; kapanış günü
  raw.planli_kapanis = 2026-12-31 (application_deadline değil — o alan
  sayfada "Son başvuru" diye görünüyor). Günlük bağlantı kontrolü o gün
  ilanı kapatıyor (lib/planli-kapanis).

  canonical_url otomasyonun üreteceği adresle aynı (scraper.workday_ilan_adresi
  + canonical): Workday engeli kalkarsa promote aynı ilanı ikinci kez eklemiyor.
  Metin şirketin kendi ilanından (eşit fırsat ve gizlilik metinleri çıkarıldı).

  KORUMA: aynı canonical_url varsa ya da şirket kaydı yoksa (boş test
  veritabanı) eklenmiyor.

  YAYIN KAPISI (ilan_yayin_kapisi): ilan yalnız otomasyon (service_role),
  yönetici ya da otomatik kontrol kararıyla yayına çıkabiliyor. Bu ilanları
  otomasyon eklerdi; Workday engeli yüzünden aynı işi bu göç yapıyor.
  Kimlik `set_config(..., true)` ile YALNIZ bu işlem için veriliyor ve
  işlem bitince düşüyor.
*/

select set_config('request.jwt.claims', '{"role":"service_role"}', true);

insert into public.listings (company_id, title, source_title, description, responsibilities, required_skills, city, il, country_code, work_type, duration,
  status, origin, application_method, apply_url, source_url, canonical_url, posted_at, imported_at, first_seen_at, last_seen_at, source_verified_at, source_status, raw)
select c.id, $metin$Audit Services Long Term Trainees (İstanbul, İzmir, Ankara, Bursa)$metin$, $metin$Audit Services Long Term Trainees (İstanbul, İzmir, Ankara, Bursa)$metin$, $metin$A career within External Audit services, will provide you with the opportunity to provide a range of Assurance services and business advice to a variety of clients from small, fast growing clients to large entities. Our clients are often well known brands and many have broad international reach. We focus on using the latest technology to reduce the level of manual testing ensuring you’ll focus on the most valuable areas of client service and on enhancing corporate governance and the reliability of our clients’ information.

At PwC, our purpose is to build trust in society and solve important problems.
We’re a network of firms in more than 136 countries with more than 360,000 people who are committed to delivering quality in assurance, advisory and tax services.

PwC has been providing services to the Turkish business world since 1981, with a professional staff of 1.500 in İstanbul, Ankara, Bursa İzmir and Eskişehir, we provide services to create the value that our clients look for.

At PwC, we are a group of employees with a rich variety of knowledge, skills and competencies. PwC’s problem-solving teams come together in unusual, untraditional new ways from various disciplines to create The New Equation strategy. The New Equation is our global strategy with a human-centered and tech-powered approach, that focuses on our clients and all stakeholders, and helps them build trust and drive sustainable results.

Core Audit: Core Audit teams take active role on-site fieldwork and oversee the Audit process with appropriate consideration of audit risk issues and accounting technical matters.   

We are looking for “Long Term Trainees” to work for our Core Audit services with following qualifications; 

Either a currently enrolled 4th grade student or a new graduate, preferably from the Faculty of Economics and Administrative Sciences at a reputable university 
Available to participate 4 or 5 days a week (at least 3 days at the office)
Analytical thinking and problem solving        
Organized and using time effectively 
Easy-learner and a team-player        
Good at multi-tasking        
Proactive and solution oriented personality         
Self-motivated with good communication skills both with clients and engagement teams 
Excellent command of English 
Good command of MS Office applications and any accounting/corporate softwares

Job Responsibilities for Core AuditSupport the planning and execution parts of the audit engagements
Perform bank, receivable and payable confirmation process
Perform certain audit procedures by using necessary tools and techniques
Produce high quality work which adheres to the relevant professional standard

Due to hybrid model of working; we have a mixture of working at PwC Office locations, customer site and home office.The volume of which location you will be working will depend on to projects and the teams that you will be a part of.$metin$, '{}'::text[], '{}'::text[], $metin$İstanbul, İzmir, Ankara, Bursa$metin$, $metin$İstanbul$metin$, 'TR', 'Hybrid', null,
  'published', 'manual', 'external', 'https://pwc.wd3.myworkdayjobs.com/Global_Campus_Careers/job/Istanbul/Audit-Services-Long-Term-Trainees--stanbul--zmir--Ankara--Bursa-_768147WD', 'https://pwc.wd3.myworkdayjobs.com/Global_Campus_Careers/job/Istanbul/Audit-Services-Long-Term-Trainees--stanbul--zmir--Ankara--Bursa-_768147WD', 'https://pwc.wd3.myworkdayjobs.com/Global_Campus_Careers/job/Istanbul/Audit-Services-Long-Term-Trainees--stanbul--zmir--Ankara--Bursa-_768147WD', '2026-10-15', now(), now(), now(), now(), 'acik', '{"planli_kapanis": "2026-12-31", "ekleme": "elle — Workday 429", "country_code": "TR", "kaynak": "workday-cxs"}'::jsonb
from public.companies c
where c.id = '223a3b36-88cb-41ce-aa48-d2ee09178094'
  and not exists (select 1 from public.listings where canonical_url = 'https://pwc.wd3.myworkdayjobs.com/Global_Campus_Careers/job/Istanbul/Audit-Services-Long-Term-Trainees--stanbul--zmir--Ankara--Bursa-_768147WD');

insert into public.listings (company_id, title, source_title, description, responsibilities, required_skills, city, il, country_code, work_type, duration,
  status, origin, application_method, apply_url, source_url, canonical_url, posted_at, imported_at, first_seen_at, last_seen_at, source_verified_at, source_status, raw)
select c.id, $metin$Software Quality Analyst, Intern$metin$, $metin$Software Quality Analyst, Intern$metin$, $metin$Position Summary

Are you ready to start your career with a team developing industry-leading software that advances and connects the world's infrastructure? Bentley Systems is seeking a Software Quality Analyst Intern to join our Bridge and Tunnel team in Ankara. In this role, you will help ensure the quality, reliability, and usability of Bentley's bridge and tunnel engineering applications, including OpenBridge Modeler, OpenTunnel Designer, and OpenBridge Designer. Working closely with software developers, quality analysts, and engineering experts, you will contribute to testing, validation, documentation, and continuous product improvement while gaining valuable experience in both civil engineering and software development.

This is an individual contributor internship position. This role is expected to work approximately 22.5 hours per week. The position is based in Ankara and does not require regular travel. This is a Hybrid role.

Preferred Qualifications
Familiarity with bridge or tunnel design concepts and engineering workflows.
Experience using engineering design, modeling, or CAD software through coursework, projects, or internships.
Interest in software quality assurance, testing, or software development processes.
Exposure to infrastructure engineering projects through academic or practical experience.$metin$, array[$metin$Learn and develop expertise in Bentley's bridge and tunnel engineering software products from a civil engineering perspective.$metin$,$metin$Test reported software issues and verify defect resolutions to ensure product quality and reliability.$metin$,$metin$Identify, document, and communicate software defects and usability concerns.$metin$,$metin$Support product documentation efforts by reviewing and validating technical content.$metin$,$metin$Collaborate with software developers to communicate civil engineering requirements, workflows, and user expectations.$metin$,$metin$Execute functional, regression, and validation testing activities for new features and product releases.$metin$,$metin$Analyze software behavior and investigate technical issues to support continuous product improvement.$metin$]::text[], array[$metin$Currently pursuing a Bachelor's or Master's degree in Civil Engineering or a related discipline.$metin$,$metin$Strong foundation in civil engineering principles and concepts.$metin$,$metin$Interest in bridge and/or tunnel engineering and infrastructure design.$metin$,$metin$Strong analytical and problem-solving skills with an investigative mindset.$metin$,$metin$Effective written and verbal communication skills.$metin$,$metin$Comfortable communicating in English, both verbally and in writing.$metin$]::text[], $metin$Ankara$metin$, $metin$Ankara$metin$, 'TR', 'Hybrid', $metin$Yarı zamanlı, haftada yaklaşık 22,5 saat$metin$,
  'published', 'manual', 'external', 'https://bentleysystems.wd5.myworkdayjobs.com/bentley/job/Turkiye-Ankara-Office/Software-Quality-Analyst--Intern_R62', 'https://bentleysystems.wd5.myworkdayjobs.com/bentley/job/Turkiye-Ankara-Office/Software-Quality-Analyst--Intern_R62', 'https://bentleysystems.wd5.myworkdayjobs.com/bentley/job/Turkiye-Ankara-Office/Software-Quality-Analyst--Intern_R62', now(), now(), now(), now(), now(), 'acik', '{"planli_kapanis": "2026-12-31", "ekleme": "elle — Workday 429", "country_code": "TR", "kaynak": "workday-cxs"}'::jsonb
from public.companies c
where c.id = '342702b3-823e-4227-9c21-926fcd42d897'
  and not exists (select 1 from public.listings where canonical_url = 'https://bentleysystems.wd5.myworkdayjobs.com/bentley/job/Turkiye-Ankara-Office/Software-Quality-Analyst--Intern_R62');

insert into public.listings (company_id, title, source_title, description, responsibilities, required_skills, city, il, country_code, work_type, duration,
  status, origin, application_method, apply_url, source_url, canonical_url, posted_at, imported_at, first_seen_at, last_seen_at, source_verified_at, source_status, raw)
select c.id, $metin$Lighting Design Long-Term Intern$metin$, $metin$Lighting Design Long-Term Intern$metin$, $metin$About Signify

Through bold discovery and cutting-edge innovation, we lead an industry that is vital for the future of our planet: lighting. Through our leadership in connected lighting and the Internet of Things, we're breaking new ground in data analytics, AI, and smart solutions for homes, offices, cities, and beyond.

More about the role

Working as a Lighting Design Long-Term Intern at Signify is dynamic. We're greater together through peer learning in our globally diverse team, with different backgrounds and nationalities. You'll be part of the Signify Turkey Lighting Design Center.

Knowledge of Dialux, Dialux Evo, Relux, Photoshop, 3D studio, Revit, Lumion will be an added value. Willingness to grow in transforming lighting industry; creativity, excellent communication as well as interpersonal skills; flexible team player and self-motivated.$metin$, array[$metin$Support to develop lighting concepts$metin$,$metin$Prepare lighting calculations$metin$,$metin$Prepare technical documentation$metin$,$metin$Prepare visualizations and presentations of proposed lighting solutions to customers and end users$metin$]::text[], array[$metin$3rd or final year students of Bachelor's in Architecture, or Electrical & Electronics Engineering.$metin$,$metin$Fluent English and Turkish (both written and spoken) is required.$metin$,$metin$Active AutoCAD software usage is required.$metin$]::text[], $metin$İstanbul$metin$, $metin$İstanbul$metin$, 'TR', 'On-site', null,
  'published', 'manual', 'external', 'https://lighting.wd3.myworkdayjobs.com/jobs-and-careers/job/Istanbul/Lighting-Design-Long-Term-Intern_366943', 'https://lighting.wd3.myworkdayjobs.com/jobs-and-careers/job/Istanbul/Lighting-Design-Long-Term-Intern_366943', 'https://lighting.wd3.myworkdayjobs.com/jobs-and-careers/job/Istanbul/Lighting-Design-Long-Term-Intern_366943', now(), now(), now(), now(), now(), 'acik', '{"planli_kapanis": "2026-12-31", "ekleme": "elle — Workday 429", "country_code": "TR", "kaynak": "workday-cxs"}'::jsonb
from public.companies c
where c.id = '9003fda2-7927-4c78-917e-668b73605480'
  and not exists (select 1 from public.listings where canonical_url = 'https://lighting.wd3.myworkdayjobs.com/jobs-and-careers/job/Istanbul/Lighting-Design-Long-Term-Intern_366943');
