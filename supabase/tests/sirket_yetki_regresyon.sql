-- Şirket yetki sınırlarının regresyon testi.
--
-- NASIL ÇALIŞTIRILIR
--   supabase db execute --file supabase/tests/sirket_yetki_regresyon.sql
--   ya da SQL editöründe olduğu gibi yapıştır.
--
-- Her satır bir güvenlik sözü. "ACIK" yazan her sonuç bir açıktır.
-- İşlem sonunda ROLLBACK var: hiçbir şey kalıcı değil.
--
-- KURULUM
--   Kullanıcı A → Şirket A (doğrulanmış, bir ilanı ve bir başvurusu var)
--   Kullanıcı B → Şirket B (doğrulanmış)
--   Öğrenci C   → Şirket A'nın ilanına başvurmuş
--
-- Beklenen: B, A'nın hiçbir şeyine dokunamaz ve C'nin verisini göremez.

begin;

create temp table sonuc (test text, beklenen text, cikan text) on commit drop;
grant insert, select on sonuc to authenticated;

-- ------------------------------------------------------------- kurulum

-- Gerçek auth kullanıcıları gerekiyor (profiles.id → auth.users FK).
create temp table kisiler on commit drop as
  select id, row_number() over (order by created_at) as sira
  from public.profiles order by created_at limit 3;

create temp table k on commit drop as
select
  (select id from kisiler where sira = 1) as a,
  (select id from kisiler where sira = 2) as b,
  (select id from kisiler where sira = 3) as c;
grant select on k to authenticated;

-- Kurulum service_role kimligiyle: guard_listing_publish yayina cikmayi
-- yonetici onayina bagliyor ve kurulum satirini reddederdi.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

insert into public.companies (id, name, slug, verified, origin, website_url)
values ('11111111-aaaa-0000-0000-000000000001'::uuid, 'Sirket A', 'test-sirket-a', true, 'manual', 'https://sirket-a.com'),
       ('11111111-bbbb-0000-0000-000000000002'::uuid, 'Sirket B', 'test-sirket-b', true, 'manual', 'https://sirket-b.com');

insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
select '11111111-aaaa-0000-0000-000000000001'::uuid, a, 'Owner', true from k
union all
select '11111111-bbbb-0000-0000-000000000002'::uuid, b, 'Owner', true from k;

insert into public.listings (id, company_id, title, status, origin, application_method, apply_url)
values ('22222222-aaaa-0000-0000-000000000001'::uuid, '11111111-aaaa-0000-0000-000000000001'::uuid,
        'A Stajyeri', 'published', 'employer_posted', 'external', 'https://sirket-a.com/basvur');

insert into public.applications (id, listing_id, student_id, match_score, application_method,
                                 email_delivery_status, created_via, contact_share_consent_at,
                                 profile_snapshot)
select '33333333-aaaa-0000-0000-000000000001'::uuid, '22222222-aaaa-0000-0000-000000000001'::uuid, c,
       80, 'internal', 'not_required', 'web', now(), '{"ad":"Aday C"}'::jsonb
from k;

-- ------------------------------------------------- KULLANICI B SALDIRIYOR

-- SET LOCAL alt sorgu kabul etmiyor; set_config gerekiyor.
select set_config('request.jwt.claims',
  (select json_build_object('sub', b::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

do $$ declare n int; begin
  update public.companies set description = 'IDOR'
   where id = '11111111-aaaa-0000-0000-000000000001'::uuid;
  get diagnostics n = row_count;
  insert into sonuc values ('B → A profilini duzenleme', 'ENGELLENDI',
    case when n = 0 then 'ENGELLENDI' else 'ACIK' end);
exception when others then insert into sonuc values ('B → A profilini duzenleme','ENGELLENDI','ENGELLENDI'); end $$;

do $$ declare n int; begin
  update public.companies set verified = true where id = '11111111-bbbb-0000-0000-000000000002'::uuid;
  get diagnostics n = row_count;
  insert into sonuc values ('B → kendini verified yapma', 'ENGELLENDI',
    case when n = 0 then 'ENGELLENDI' else 'ACIK' end);
exception when others then insert into sonuc values ('B → kendini verified yapma','ENGELLENDI','ENGELLENDI'); end $$;

do $$ begin
  insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
  select '11111111-aaaa-0000-0000-000000000001'::uuid, b, 'Owner', true from k;
  insert into sonuc values ('B → A''ya uye ekleme', 'ENGELLENDI', 'ACIK');
exception when others then insert into sonuc values ('B → A''ya uye ekleme','ENGELLENDI','ENGELLENDI'); end $$;

do $$ declare n int; begin
  update public.listings set title = 'IDOR', status = 'closed'
   where id = '22222222-aaaa-0000-0000-000000000001'::uuid;
  get diagnostics n = row_count;
  insert into sonuc values ('B → A ilanini duzenleme', 'ENGELLENDI',
    case when n = 0 then 'ENGELLENDI' else 'ACIK' end);
exception when others then insert into sonuc values ('B → A ilanini duzenleme','ENGELLENDI','ENGELLENDI'); end $$;

do $$ declare n int; begin
  delete from public.listings where id = '22222222-aaaa-0000-0000-000000000001'::uuid;
  get diagnostics n = row_count;
  insert into sonuc values ('B → A ilanini silme', 'ENGELLENDI',
    case when n = 0 then 'ENGELLENDI' else 'ACIK' end);
exception when others then insert into sonuc values ('B → A ilanini silme','ENGELLENDI','ENGELLENDI'); end $$;

do $$ begin
  insert into public.listings (company_id, title, status, origin, application_method, apply_url)
  values ('11111111-aaaa-0000-0000-000000000001'::uuid, 'IDOR ilani', 'draft', 'employer_posted', 'external', 'https://x.com');
  insert into sonuc values ('B → A adina ilan acma', 'ENGELLENDI', 'ACIK');
exception when others then insert into sonuc values ('B → A adina ilan acma','ENGELLENDI','ENGELLENDI'); end $$;

insert into sonuc select 'B → A basvurulari', 'ENGELLENDI',
  case when count(*) = 0 then 'ENGELLENDI' else 'ACIK' end
from public.applications a join public.listings l on l.id = a.listing_id
where l.company_id = '11111111-aaaa-0000-0000-000000000001'::uuid;

insert into sonuc select 'B → aday C profili', 'ENGELLENDI',
  case when count(*) = 0 then 'ENGELLENDI' else 'ACIK' end
from public.student_profiles where id = (select c from k);

insert into sonuc select 'B → aday C projeleri', 'ENGELLENDI',
  case when count(*) = 0 then 'ENGELLENDI' else 'ACIK' end
from public.student_projects where student_id = (select c from k);

insert into sonuc select 'B → aday C yetenekleri', 'ENGELLENDI',
  case when count(*) = 0 then 'ENGELLENDI' else 'ACIK' end
from public.student_skills where student_id = (select c from k);

insert into sonuc select 'B → A uyelerini gorme', 'ENGELLENDI',
  case when count(*) = 0 then 'ENGELLENDI' else 'ACIK' end
from public.company_members where company_id = '11111111-aaaa-0000-0000-000000000001'::uuid;

do $$ declare n int; begin
  update public.profiles set role = 'admin' where id = (select b from k);
  get diagnostics n = row_count;
  insert into sonuc values ('B → kendini admin yapma', 'ENGELLENDI',
    case when n = 0 then 'ENGELLENDI' else 'ACIK' end);
exception when others then insert into sonuc values ('B → kendini admin yapma','ENGELLENDI','ENGELLENDI'); end $$;

do $$ declare n int; begin
  update public.applications set status = 'offer_extended'
   where id = '33333333-aaaa-0000-0000-000000000001'::uuid;
  get diagnostics n = row_count;
  insert into sonuc values ('B → A basvurusunun durumunu degistirme', 'ENGELLENDI',
    case when n = 0 then 'ENGELLENDI' else 'ACIK' end);
exception when others then insert into sonuc values ('B → A basvurusunun durumunu degistirme','ENGELLENDI','ENGELLENDI'); end $$;

-- --------------------------------------------- KULLANICI A MEŞRU İŞLERİ

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', a::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

do $$ declare n int; begin
  update public.companies set description = 'mesru guncelleme', industry = 'Teknoloji'
   where id = '11111111-aaaa-0000-0000-000000000001'::uuid;
  get diagnostics n = row_count;
  insert into sonuc values ('A → kendi profilini duzenleme', 'CALISIYOR',
    case when n > 0 then 'CALISIYOR' else 'BOZULDU' end);
exception when others then insert into sonuc values ('A → kendi profilini duzenleme','CALISIYOR','BOZULDU'); end $$;

insert into sonuc select 'A → kendi basvurularini gorme', 'CALISIYOR',
  case when count(*) > 0 then 'CALISIYOR' else 'BOZULDU' end
from public.applications a join public.listings l on l.id = a.listing_id
where l.company_id = '11111111-aaaa-0000-0000-000000000001'::uuid;

insert into sonuc select 'A → basvuran C profilini gorme', 'CALISIYOR',
  case when count(*) > 0 then 'CALISIYOR' else 'BOZULDU' end
from public.student_profiles where id = (select c from k);

do $$ declare n int; begin
  update public.applications set status = 'under_review'
   where id = '33333333-aaaa-0000-0000-000000000001'::uuid;
  get diagnostics n = row_count;
  insert into sonuc values ('A → kendi basvurusunun durumu', 'CALISIYOR',
    case when n > 0 then 'CALISIYOR' else 'BOZULDU' end);
exception when others then insert into sonuc values ('A → kendi basvurusunun durumu','CALISIYOR','BOZULDU'); end $$;

reset role;

select test, beklenen, cikan,
       case when beklenen = cikan then 'GECTI' else '*** KALDI ***' end as durum
from sonuc order by (beklenen = cikan), test;

rollback;
