-- Şirket yetki sınırlarının regresyon testi — TEK KULLANIMLIK VERİTABANI.
--
-- NEREDE ÇALIŞIYOR
--   .github/workflows/supabase-disposable-security-tests.yml
--   `supabase db reset --local --no-seed` ile migration'lar sıfırdan
--   uygulanıp bu dosya psql `ON_ERROR_STOP=1` ile çalıştırılıyor.
--   Yani bu dosya aynı zamanda TEMİZ MIGRATION DUMANI TESTİ: bir
--   migration sıfırdan uygulanamıyorsa iş burada düşüyor.
--
-- NEDEN PRODUCTION'DA DEĞİL
--   Test kendi kullanıcılarını, şirketlerini ve başvurusunu YARATIYOR.
--   Üretim verisine bağlı bir test hem kırılgan olur hem de gerçek
--   kullanıcı kaydına dokunma riski taşır.
--
-- BAŞARISIZLIK NASIL ANLAŞILIYOR
--   Her kontrol `raise exception` ile düşüyor. psql ON_ERROR_STOP=1
--   olduğu için iş adımı kırmızıya dönüyor ve dağıtım durmuş oluyor.
--
-- KURULUM
--   Kullanıcı A → Şirket A (doğrulanmış, bir ilanı ve bir başvurusu var)
--   Kullanıcı B → Şirket B (doğrulanmış)
--   Öğrenci C   → Şirket A'nın ilanına başvurmuş
--
-- Beklenen: B, A'nın hiçbir şeyine dokunamaz ve C'nin verisini göremez.

begin;

-- ------------------------------------------------------------- yardımcı

create or replace function pg_temp.bekle(kosul boolean, ad text)
returns void language plpgsql as $$
begin
  if not kosul then
    raise exception 'GUVENLIK REGRESYONU BASARISIZ: %', ad
      using errcode = 'check_violation';
  end if;
  raise notice 'gecti: %', ad;
end;
$$;

-- Bir yazma girişiminin ENGELLENDİĞİNİ doğrular: ya sıfır satır etkilenir
-- ya da RLS hata yükseltir. İkisi de "engellendi" demek.
create or replace function pg_temp.yazma_engellendi_mi(sorgu text)
returns boolean language plpgsql as $$
declare n int;
begin
  execute sorgu;
  get diagnostics n = row_count;
  return n = 0;
exception when others then
  return true;
end;
$$;

-- ------------------------------------------------------------- kurulum

create temp table k on commit drop as
select
  '00000000-0000-4000-8000-00000000000a'::uuid as a,
  '00000000-0000-4000-8000-00000000000b'::uuid as b,
  '00000000-0000-4000-8000-00000000000c'::uuid as c,
  '00000000-0000-4000-8000-00000000000d'::uuid as d,
  '00000000-0000-4000-8000-00000000000e'::uuid as e;

-- `authenticated` rolüne geçildikten sonra da okunabilmeli.
grant select on k to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select x.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
       x.eposta, '', now(), now(), now()
from (select a as id, 'a@test-a.com' as eposta from k
      union all select b, 'b@test-b.com' from k
      union all select c, 'c@ogrenci.test' from k
      union all select d, 'd@test-d.com' from k
      union all select e, 'e@ogrenci.test' from k) x
on conflict (id) do nothing;

-- Kurulum service_role kimliğiyle: guard_listing_publish yayına çıkmayı
-- yönetici onayına bağlıyor ve kurulum satırını reddederdi.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

/*
  auth.users'a satır eklenince `handle_new_user` tetikleyicisi profiles ve
  student_profiles satırlarını KENDİSİ açıyor. Bu yüzden burada insert
  değil upsert yapılıyor; aksi halde kurulum birincil anahtar çakışmasıyla
  düşüyor (ölçüldü).
*/
insert into public.profiles (id, email, role)
select a, 'a@test-a.com', 'company'::user_role from k
union all select b, 'b@test-b.com', 'company'::user_role from k
union all select c, 'c@ogrenci.test', 'student'::user_role from k
union all select d, 'd@test-d.com', 'company'::user_role from k
union all select e, 'e@ogrenci.test', 'student'::user_role from k
on conflict (id) do update set role = excluded.role;

insert into public.student_profiles (id, university, department, is_open_to_offers)
select c, 'Test Universitesi', 'Bilgisayar Muhendisligi', true from k
on conflict (id) do update
  set university = excluded.university,
      department = excluded.department,
      is_open_to_offers = excluded.is_open_to_offers;

insert into public.student_projects (student_id, title, description)
select c, 'Test projesi', 'aciklama' from k;

insert into public.student_skills (student_id, name)
select c, 'React' from k;

insert into public.companies (id, name, slug, verified, origin, website_url) values
 ('11111111-aaaa-4000-8000-000000000001'::uuid, 'Sirket A', 'test-sirket-a', true, 'manual', 'https://test-a.com'),
 ('11111111-bbbb-4000-8000-000000000002'::uuid, 'Sirket B', 'test-sirket-b', true, 'manual', 'https://test-b.com');

insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
select '11111111-aaaa-4000-8000-000000000001'::uuid, a, 'Owner', true from k
union all
select '11111111-bbbb-4000-8000-000000000002'::uuid, b, 'Owner', true from k;

insert into public.listings (id, company_id, title, status, origin, application_method, apply_url)
values ('22222222-aaaa-4000-8000-000000000001'::uuid, '11111111-aaaa-4000-8000-000000000001'::uuid,
        'A Stajyeri', 'published', 'employer_posted', 'external', 'https://test-a.com/basvur');

insert into public.applications (id, listing_id, student_id, match_score, application_method,
                                 email_delivery_status, created_via, contact_share_consent_at,
                                 profile_snapshot)
select '33333333-aaaa-4000-8000-000000000001'::uuid, '22222222-aaaa-4000-8000-000000000001'::uuid, c,
       80, 'internal', 'not_required', 'web', now(), '{"ad":"Aday C"}'::jsonb
from k;

-- A'nın ikinci ilanı: TASLAK.
--
-- "Taslağı yayınla" adımı gerçek panel akışının ortasında duruyor
-- (yeni ilan → düzenle → yayınla) ama regresyonda karşılığı yoktu:
-- yalnızca yayındaki ilanı KAPATMA test ediliyordu. guard_listing_publish
-- yayına çıkmayı kısıtlıyor ve bu yol hiç ölçülmemişti.
insert into public.listings (id, company_id, title, status, origin, application_method)
values ('22222222-aaaa-4000-8000-000000000002'::uuid, '11111111-aaaa-4000-8000-000000000001'::uuid,
        'A Taslak Stajyeri', 'draft', 'employer_posted', 'internal');

-- B ŞİRKETİNİN İLANI
--
-- CV kopyalarının şirketler arasında sızmadığını ölçmek için gerekiyor:
-- aynı öğrenci hem A'ya hem B'ye başvuruyor ve her başvurunun kendi
-- kopyası var. A, B'ye giden kopyayı görememeli.
insert into public.listings (id, company_id, title, status, origin, application_method)
values ('22222222-bbbb-4000-8000-000000000003'::uuid, '11111111-bbbb-4000-8000-000000000002'::uuid,
        'B Stajyeri', 'published', 'employer_posted', 'internal');

-- DOĞRULANMAMIŞ ŞİRKET D
--
-- CV testleri için gerekiyor: doğrulanmış şirket kendi başvuranının
-- CV'sini okuyabilmeli, DOĞRULANMAMIŞ şirket okuyamamalı. Ürün kuralı
-- da bu (lib/sirket-kademe.mjs · adayGorebilir): doğrulama gelene kadar
-- şirket başvuru SAYISINI görüyor, adayın kim olduğunu görmüyor.
insert into public.companies (id, name, slug, verified, origin, website_url) values
 ('11111111-dddd-4000-8000-000000000004'::uuid, 'Sirket D', 'test-sirket-d', false, 'manual', 'https://test-d.com');

insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
select '11111111-dddd-4000-8000-000000000004'::uuid, d, 'Owner', true from k;

insert into public.listings (id, company_id, title, status, origin, application_method, apply_url)
values ('22222222-dddd-4000-8000-000000000004'::uuid, '11111111-dddd-4000-8000-000000000004'::uuid,
        'D Stajyeri', 'published', 'employer_posted', 'external', 'https://test-d.com/basvur');

insert into public.applications (id, listing_id, student_id, match_score, application_method,
                                 email_delivery_status, created_via)
select '33333333-dddd-4000-8000-000000000004'::uuid, '22222222-dddd-4000-8000-000000000004'::uuid, c,
       70, 'internal', 'not_required', 'web'
from k;

-- ÖĞRENCİ C'NİN CV DOSYALARI
--
--   {c}/profil/cv-a.pdf        → profildeki GÜNCEL belge (CV-A)
--   {c}/basvurular/snap-a.pdf  → A ilanına başvuru anındaki KOPYA
--
-- İkisi ayrı dosya; profil belgesi değişince kopya değişmiyor. Test
-- tam olarak bunu ölçüyor.
insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
select 'cvs', c::text || '/profil/cv-a.pdf', c, c::text, '{"mimetype":"application/pdf"}'::jsonb from k
union all
select 'cvs', c::text || '/basvurular/snap-a.pdf', c, c::text, '{"mimetype":"application/pdf"}'::jsonb from k;

update public.student_profiles
   set cv_path = (select c::text from k) || '/profil/cv-a.pdf'
 where id = (select c from k);

update public.applications
   set cv_snapshot_path = (select c::text from k) || '/basvurular/snap-a.pdf'
 where id = '33333333-aaaa-4000-8000-000000000001'::uuid;

-- Uygunluk doğrulaması testleri için bir burs kaydı. Kayıt olmadan
-- "yazamadı" kontrolü boş tabloda kendiliğinden geçerdi.
insert into public.opportunities (id, slug, title, organization_name, opportunity_type,
                                  source_url, status)
values ('44444444-aaaa-4000-8000-000000000001'::uuid, 'test-burs', 'Test Bursu',
        'Test Vakfi', 'scholarship', 'https://test-vakfi.test/burs', 'published');

-- ------------------------------------------------- KULLANICI B SALDIRIYOR

select set_config('request.jwt.claims',
  (select json_build_object('sub', b::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.companies set description='IDOR' where id='11111111-aaaa-4000-8000-000000000001'$q$),
  'B, A sirketinin profilini duzenleyemez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.companies set verified=true where id='11111111-bbbb-4000-8000-000000000002'$q$),
  'B, kendi sirketini verified yapamaz');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.company_members (company_id,user_id,recruiter_role,is_owner)
     values ('11111111-aaaa-4000-8000-000000000001','00000000-0000-4000-8000-00000000000b','Owner',true)$q$),
  'B, A sirketine uye ekleyemez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set title='IDOR' where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'B, A ilanini duzenleyemez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$delete from public.listings where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'B, A ilanini silemez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id,title,status,origin)
     values ('11111111-aaaa-4000-8000-000000000001','IDOR','draft','employer_posted')$q$),
  'B, A adina ilan acamaz');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.profiles set role='admin' where id='00000000-0000-4000-8000-00000000000b'$q$),
  'B, kendini admin yapamaz');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='offer_extended' where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'B, A basvurusunun durumunu degistiremez');

select pg_temp.bekle(
  (select count(*) = 0 from public.applications a
     join public.listings l on l.id = a.listing_id
    where l.company_id = '11111111-aaaa-4000-8000-000000000001'::uuid),
  'B, A basvurularini okuyamaz');

select pg_temp.bekle(
  (select count(*) = 0 from public.student_profiles where id = (select c from k)),
  'B, basvurmamis ogrencinin profilini okuyamaz');

select pg_temp.bekle(
  (select count(*) = 0 from public.student_projects where student_id = (select c from k)),
  'B, basvurmamis ogrencinin projelerini okuyamaz');

select pg_temp.bekle(
  (select count(*) = 0 from public.student_skills where student_id = (select c from k)),
  'B, basvurmamis ogrencinin yeteneklerini okuyamaz');

select pg_temp.bekle(
  (select count(*) = 0 from public.company_members
    where company_id = '11111111-aaaa-4000-8000-000000000001'::uuid),
  'B, A sirketinin uyelerini goremez');

-- --------------------------------------------- KULLANICI A MEŞRU İŞLERİ
--
-- Kilit sıkılaştıkça meşru akışın da kırılmadığını doğrulamak şart:
-- yalnızca "engellendi" testi yazmak, her şeyi kapatan bir düzeltmeyi
-- yeşil gösterirdi.

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', a::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.companies set description='mesru', industry='Teknoloji'
      where id='11111111-aaaa-4000-8000-000000000001'$q$),
  'A, kendi sirket profilini duzenleyebilir');

select pg_temp.bekle(
  (select count(*) = 1 from public.applications a
     join public.listings l on l.id = a.listing_id
    where l.company_id = '11111111-aaaa-4000-8000-000000000001'::uuid),
  'A, kendi ilanina gelen basvuruyu gorebilir');

select pg_temp.bekle(
  (select count(*) = 1 from public.student_profiles where id = (select c from k)),
  'A, kendisine BASVURAN ogrencinin profilini gorebilir');

select pg_temp.bekle(
  (select count(*) = 1 from public.student_projects where student_id = (select c from k)),
  'A, basvuranin projelerini gorebilir');

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='under_review'
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'A, kendi basvurusunun durumunu degistirebilir');

-- ------------------------ BAŞVURU DURUMU: ŞİRKET ADAY ADINA KARAR VEREMEZ
--
-- Ölçüldü: işveren güncelleme politikasının WITH CHECK ifadesi YOKTU.
-- Doğrulanmış bir şirket başvuruyu `withdrawn` yapabiliyor, yani
-- öğrencinin kendi başvuru sayfasında "Başvurunu geri çektin" cümlesini
-- doğurabiliyordu. Geri çekmek adayın kararı; şirket bir adayı
-- reddedebilir ama onun adına vazgeçemez.
--
-- Arayüzde de bu değer şirketin seçeneklerinde yok
-- (lib/basvuru-durumu.mjs · SIRKET_DURUMLARI) ama düğme gizlemek
-- güvenlik değildir; kural burada sınanıyor.

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='withdrawn'
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'A, adayin basvurusunu ADAY ADINA geri cekemez');

select pg_temp.bekle(
  (select status::text = 'under_review'
     from public.applications where id='33333333-aaaa-4000-8000-000000000001'::uuid),
  'Reddedilen geri cekme denemesi durumu degistirmedi');

-- Meşru karar kapanmıyor: reddetmek şirketin hakkı.
select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='rejected'
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'A, adayi reddedebilir');

-- Damga tetikleyiciden geliyor: "ne zaman karar verildi" uydurulmuyor.
select pg_temp.bekle(
  (select status_changed_at is not null
     from public.applications where id='33333333-aaaa-4000-8000-000000000001'::uuid),
  'Durum degisince status_changed_at damgalaniyor');

-- Mülakat tarihi opsiyonel bir alan; durumdan bagimsiz yazilabiliyor.
select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='interview_scheduled',
        interview_date='2026-09-15'
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'A, mulakat asamasinda tarih yazabilir');

/*
  SIRA ARTIĞI BIRAKILMIYOR

  Bu blok başvurunun durumunu değiştiriyor. Daha önce böyle bir blok
  şirketi `verified=false` bırakmış ve SONRAKİ bütün testler sessizce
  doğrulanmamış şirketle çalışmıştı. Durum eski değerine geri alınıyor
  ve geri alındığı DOĞRULANIYOR.
*/
select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='under_review', interview_date=null
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'A, durumu geri alabilir (akis tek yonlu degil)');

select pg_temp.bekle(
  (select status::text = 'under_review' and interview_date is null
     from public.applications where id='33333333-aaaa-4000-8000-000000000001'::uuid),
  'Durum testleri sonrasi basvuru eski haline dondu');

-- ---------------------------- İLAN KOLONLARI: İÇERİK EVET, SİNYAL HAYIR
--
-- RLS bir şirketi kendi SATIRLARIYLA sınırlıyor ama satır güvenliği kolon
-- güvenliği değil. Tablo düzeyinde UPDATE yetkisi varken şirket, kendi
-- ilanının kaynak sağlığı ve doğrulama alanlarını da yazabiliyordu:
-- `source_status='acik'`, `source_verified_at=now()` diyerek ilanı
-- platform tarafından az önce doğrulanmış gibi gösterebilirdi. O alanlar
-- öğrenciye tazelik sinyali olarak gösteriliyor.
--
-- Aşağıdaki testler sınırın iki yanını da tutuyor: içerik alanları
-- yazılabilmeli, sistem alanları yazılamamalı. Yalnızca "engellendi"
-- testi yazmak, her şeyi kapatan bir düzeltmeyi yeşil gösterirdi.

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.listings
       set title='Guncellenmis ilan basligi', description='yeni aciklama',
           city='Izmir', application_deadline='2026-12-31'
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, kendi ilaninin ICERIK alanlarini duzenleyebilir');

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.listings set status='closed'
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, kendi ilanini kapatabilir');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set source_status='acik'
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, kendi ilaninin source_status alanini YAZAMAZ');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set source_verified_at=now()
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, kendi ilaninin source_verified_at alanini YAZAMAZ');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set source_checked_at=now(), last_seen_at=now()
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, tarama zaman damgalarini YAZAMAZ');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set source_url='https://sahte.test', content_hash='x',
                                 deactivation_reason='yok'
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, kaynak ve provenance alanlarini YAZAMAZ');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set applicants_count=999
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, basvuru sayacini YAZAMAZ');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set featured=true
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, kendi ilanini one cikan yapamaz');

-- İlan bir kez açıldıktan sonra kime ait olduğu ve nereden geldiği
-- değişmemeli: ikisi de yalnızca INSERT'te veriliyor.
select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set company_id='11111111-bbbb-4000-8000-000000000002'
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, ilani baska sirkete tasiyamaz');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set origin='scraped'
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, ilanin kaynagini (origin) sonradan degistiremez');

-- ------------------------------------------- YENİ İLAN AÇARKEN
--
-- Şirket ilan açabilmeli; ama istek gövdesine ayrıcalıklı bir kolon
-- eklerse istek DÜŞMELİ, alan sessizce yok sayılmamalı.

-- YÜK, PANELİN GERÇEKTEN GÖNDERDİĞİ ALAN KÜMESİ
--
-- Kolon yetkisi, ifadede ADI GEÇEN her kolon için aranıyor. Bu yüzden
-- teste fazladan bir alan yazmak testi bozuyor: istek o alan yüzünden
-- düşüyor ve asıl sınanan ayrıcalıklı alan YANLIŞ NEDENLE engellenmiş
-- görünüyor. İki kez yaşandı — önce `id` ile, sonra `apply_url` ve
-- `application_method` yetkiden çıkınca. Listeyi form modülüyle
-- hizalı tut: tests/ilan-kolon-yetkileri.test.mjs bunu bağlıyor.
select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id, title, city, work_type,
        mandatory_staj_accepted, voluntary_staj_accepted, term, duration,
        is_paid, stipend_text, description,
        application_deadline, origin, status, posted_at)
     values ('11111111-aaaa-4000-8000-000000000001', 'Yeni Stajyer', 'Izmir',
             'On-site', true, false, 'All Year', '3 ay', true,
             'Asgari staj ucreti',
             'aciklama', '2026-12-31', 'employer_posted', 'draft', now())$q$),
  'A, panelin gonderdigi yukle yeni ilan acabilir');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id, title, status, origin, source_status)
     values ('11111111-aaaa-4000-8000-000000000001', 'Sahte Taze Ilan', 'draft',
             'employer_posted', 'acik')$q$),
  'A, ilan acarken source_status GONDEREMEZ');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id, title, status, origin,
                                  source_verified_at, last_seen_at)
     values ('11111111-aaaa-4000-8000-000000000001', 'Sahte Dogrulanmis', 'draft',
             'employer_posted', now(), now())$q$),
  'A, ilan acarken dogrulama damgalarini GONDEREMEZ');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id, title, status, origin,
                                  featured, applicants_count)
     values ('11111111-aaaa-4000-8000-000000000001', 'Sahte One Cikan', 'draft',
             'employer_posted', true, 500)$q$),
  'A, ilan acarken featured ve basvuru sayacini GONDEREMEZ');

-- ------------------------- BAŞVURU YOLU ŞİRKETİN SEÇİMİ DEĞİL
--
-- "Kendi sitemizden" seçeneği kaldırıldı: şirketin açtığı ilan her zaman
-- StajımVar üzerinden başvuru alıyor. Formdan seçeneği kaldırmak
-- istemciyi değiştirir, kuralı değiştirmez — istek gövdesine
-- `application_method: 'external'` yazan biri eski davranışı
-- sürdürebilirdi. Kural burada duruyor.

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id, title, status, origin,
                                  application_method, apply_url)
     values ('11111111-aaaa-4000-8000-000000000001', 'Disari Yonlendiren', 'draft',
             'employer_posted', 'external', 'https://test-a.com/kariyer')$q$),
  'A, ilani disari yonlendiren yontemle acamaz');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.listings set application_method='external',
                                 apply_url='https://test-a.com/kariyer'
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, acilmis ilani sonradan disari yonlendiremez');

-- Sistem sabitlemesi: yöntem kolon varsayılanından geliyor.
select pg_temp.bekle(
  (select application_method = 'internal' and apply_url is null
     from public.listings where title = 'Yeni Stajyer'),
  'Sirketin actigi ilan internal basliyor ve adres tasimiyor');

-- Az önce açılan ilan sistem alanlarında GÜVENLİ VARSAYILANLARDAN
-- başlamalı: hiç bakılmamış, hiç doğrulanmamış, öne çıkarılmamış.
select pg_temp.bekle(
  (select source_status is null and source_verified_at is null
      and source_checked_at is null and last_seen_at is null
      and featured = false and applicants_count = 0
     from public.listings where title = 'Yeni Stajyer'),
  'Yeni ilan sistem alanlarinda guvenli varsayilanlarla basliyor');

-- ------------------------- BAŞVURULU İLAN SİLİNEMEZ, ARŞİVLENİR
--
-- `applications_listing_id_fkey` ON DELETE CASCADE: ilanı silmek o ilana
-- yapılmış her başvuruyu da siler — şirketin kaydını da, ÖĞRENCİNİN kendi
-- başvuru geçmişini de. Öğrenci bir satırın neden kaybolduğunu hiçbir
-- yerde göremezdi.
--
-- Kontrol arayüzde tutulamaz: doğrulanmamış şirket `applications`
-- tablosunu okuyamıyor, orada sayım sıfır döner ve başvurulu ilan
-- silinebilirdi.

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$delete from public.listings where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, basvuru almis kendi ilanini SILEMEZ');

select pg_temp.bekle(
  (select count(*) = 1 from public.applications
    where id = '33333333-aaaa-4000-8000-000000000001'),
  'Silme denemesinden sonra basvuru kaydi duruyor');

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.listings set status='archived'
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'A, basvurulu ilani ARSIVLEYEBILIR');

select pg_temp.bekle(
  (select count(*) = 1 from public.applications
    where id = '33333333-aaaa-4000-8000-000000000001'),
  'Arsivlemeden sonra da basvuru kaydi duruyor');

-- Başvurusu olmayan ilan gerçekten silinebiliyor: kilidi her şeye
-- kapatan bir düzeltme de yanlış olurdu.
select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$delete from public.listings where title = 'Yeni Stajyer'$q$),
  'A, basvurusu olmayan ilani silebilir');

-- ---------------------- ŞİRKET ÜYESİ KENDİ İLANINA BAŞVURAMAZ
--
-- Şirket üyesi öğrenci görünümüne geçip kendi ilanını görebiliyor; oradan
-- başvurabilmesi kendi paneline sahte bir aday düşürüyordu.

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.listings set status = 'published'
 where id = '22222222-aaaa-4000-8000-000000000001';

select set_config('request.jwt.claims',
  (select json_build_object('sub', a::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.applications (listing_id, student_id, application_method,
                                      email_delivery_status, created_via)
     values ('22222222-aaaa-4000-8000-000000000001',
             '00000000-0000-4000-8000-00000000000a',
             'internal', 'not_required', 'web')$q$),
  'A, KENDI sirketinin ilanina basvuramaz');

-- ------------------------------ TARAMA OTOMASYONU KISITLANMADI
--
-- Kolon yetkisi daraltılırken asıl işini yapan rol kırılmamalı: kaynak
-- sağlığı alanlarını yazan tarama otomasyonu ve Edge Function
-- service_role ile bağlanıyor ve tablo düzeyinde tam yetkili kalıyor.

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.listings
       set source_status='acik', source_verified_at=now(),
           source_checked_at=now(), last_seen_at=now()
     where id='22222222-aaaa-4000-8000-000000000001'$q$),
  'service_role, kaynak sagligi alanlarini yazabilir');

-- ------------------------------------ DOĞRULANMAMIŞ ŞİRKET SINIRI
--
-- "İlan verebilmek" ile "öğrenci kişisel verisine erişebilmek" ayrı iki
-- izin. Doğrulama kalkınca aday verisi de kapanmalı.

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.companies set verified = false
 where id = '11111111-aaaa-4000-8000-000000000001'::uuid;

select set_config('request.jwt.claims',
  (select json_build_object('sub', a::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(
  (select count(*) = 0 from public.applications a
     join public.listings l on l.id = a.listing_id
    where l.company_id = '11111111-aaaa-4000-8000-000000000001'::uuid),
  'DOGRULANMAMIS sirket kendi basvurularini bile goremez');

select pg_temp.bekle(
  (select count(*) = 0 from public.student_profiles where id = (select c from k)),
  'DOGRULANMAMIS sirket basvuranin profilini goremez');

-- ------------------------------- BURS UYGUNLUK DOĞRULAMASI (yönetici işi)
--
-- `admin_set_opportunity_eligibility` bir bursun kısıtlarını "doğrulandı"
-- işaretliyor ve o damga kişiselleştirmeye giriyor. Normal bir kullanıcı
-- erişebilseydi, kısıtları hiç okunmamış bir bursu herkese açıkmış gibi
-- gösterebilirdi.
--
-- Damga sütunları `authenticated` rolünden REVOKE edilmiş durumda; ikinci
-- kontrol o iznin geri gelmediğini doğruluyor.

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$select public.admin_set_opportunity_eligibility(
       '44444444-aaaa-4000-8000-000000000001'::uuid,
       now(), 'departments', 'unrestricted')$q$),
  'B, burs uygunlugunu dogrulanmis isaretleyemez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.opportunities set departments_verified_at = now()
     where id = '44444444-aaaa-4000-8000-000000000001'$q$),
  'B, uygunluk dogrulama damgasini dogrudan yazamaz');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.opportunities set education_levels_verified_at = now()$q$),
  'B, seviye dogrulama damgasini dogrudan yazamaz');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.opportunities set cities_verified_at = now()$q$),
  'B, sehir dogrulama damgasini dogrudan yazamaz');

-- --------------------------------- PANEL AKIŞI: TASLAĞI YAYINLA, BAŞVUR
--
-- Gerçek şirket hesabıyla yapılacak duman testinin adımları:
--   şirket: yeni ilan → düzenle → yayınla
--   öğrenci: başvur
--   şirket: başvuranlar → durum değiştir → kapat → arşivle
--
-- Kapatma, düzenleme, durum değiştirme, arşivleme ve silme yukarıda
-- ölçülüyordu; YAYINLAMA ve ÖĞRENCİ BAŞVURUSU ölçülmüyordu. İkisi de
-- akışın ortasında ve ikisi de tetikleyici/politika arkasında.

-- ÖNCE A'NIN DOĞRULAMASI GERİ AÇILIYOR
--
-- Bir üstteki blok ("DOGRULANMAMIS sirket ...") A'yı verified=false
-- yapıyor ve geri almıyordu. Bu ilk yazıldığında dosyanın son testiydi,
-- dolayısıyla zararsızdı; sonradan eklenen her test sessizce
-- DOĞRULANMAMIŞ bir şirketle çalışıyor.
--
-- Ölçüldü: bu yüzden "A, kendi taslagini yayina alabilir" kontrolü
-- kırmızı geldi — guard_listing_publish doğrulanmamış şirkette kurumsal
-- e-posta alan adı eşleşmesi arıyor ve A'nın hr_email'i boş. Yani hata
-- üründe değil, testlerin sırasındaydı. Aynı sebeple aşağıdaki CV
-- kontrolü de yanlış şirketle çalışacaktı.
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.companies set verified = true
 where id = '11111111-aaaa-4000-8000-000000000001'::uuid;

select set_config('request.jwt.claims',
  (select json_build_object('sub', a::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(
  (select verified from public.companies
    where id = '11111111-aaaa-4000-8000-000000000001'::uuid),
  'Kurulum: A yeniden dogrulanmis durumda');

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.listings set status='published'
      where id='22222222-aaaa-4000-8000-000000000002'$q$),
  'A, kendi taslagini yayina alabilir');

select pg_temp.bekle(
  (select status::text = 'published' from public.listings
    where id = '22222222-aaaa-4000-8000-000000000002'::uuid),
  'Yayina alinan taslak gercekten published oldu');

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', c::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$insert into public.applications
       (listing_id, student_id, match_score, cover_letter, application_method,
        contact_share_consent_at, email_delivery_status, created_via)
     values ('22222222-aaaa-4000-8000-000000000002',
             '00000000-0000-4000-8000-00000000000c',
             60, 'On yazi', 'internal', now(), 'not_required', 'web')$q$),
  'C, yayina alinan ilana basvurabilir');

select pg_temp.bekle(
  (select count(*) = 1 from public.applications
    where listing_id = '22222222-aaaa-4000-8000-000000000002'::uuid
      and student_id = (select c from k)),
  'Basvuru kaydi gercekten olustu');

-- ------------------------------------------------------ CV DOSYA ERİŞİMİ
--
-- MODEL
--   student_profiles.cv_path       → öğrencinin GÜNCEL belgesi
--   applications.cv_snapshot_path  → o başvuru anındaki KOPYA
--
-- ANA KURAL: profildeki CV güncel belgedir, başvurudaki CV o anın
-- belgesidir. Öğrenci CV'sini sonradan değiştirirse ŞİRKETİN GÖRDÜĞÜ
-- BELGE DEĞİŞMEMELİ — yoksa şirket, değerlendirdiğinden başka bir
-- belgeye bakar.
--
-- ERİŞİM HEDEFİ
--   öğrenci        → yalnız kendi klasörü (oku/yaz/sil)
--   başka öğrenci  → hiçbir şey
--   şirket         → yalnız kendi ilanına gelen başvurunun BELGESİ,
--                    VE yalnız şirket doğrulanmışsa
--   service_role   → bakım için erişebilir
--
-- Şirketin okuduğu dosya artık KLASÖRDEN değil SATIRDAN türüyor
-- (20260909010000_cv_anlik_kopya_erisimi). Klasör tabanlı eski politika,
-- başvuru başına kopya çıkmaya başlayınca A şirketine, aynı öğrencinin
-- B şirketine yaptığı başvurunun kopyasını da okuturdu.

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', c::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(
  (select count(*) = 1 from storage.objects
    where bucket_id = 'cvs' and name = (select c::text from k) || '/profil/cv-a.pdf'),
  'C, kendi profil CV dosyasini gorebilir');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into storage.objects (bucket_id, name)
     values ('cvs', '00000000-0000-4000-8000-00000000000a/profil/sahte.pdf')$q$),
  'C, baskasinin klasorune CV yukleyemez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into storage.objects (bucket_id, name)
     values ('cvs', '../00000000-0000-4000-8000-00000000000a/profil/sahte.pdf')$q$),
  'C, yol gecisiyle baska klasore yazamaz');

-- BAŞKA ÖĞRENCİNİN BELGESİ KAPALI
reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', e::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(
  (select count(*) = 0 from storage.objects
    where bucket_id = 'cvs' and name like (select c::text from k) || '/%'),
  'Ogrenci E, C nin hicbir CV dosyasini goremez');

-- ---------------------------------------------- SNAPSHOT DEĞİŞMEZLİĞİ
--
-- C profildeki CV'sini CV-B ile değiştiriyor: yeni dosya yükleniyor,
-- cv_path güncelleniyor, eski dosya siliniyor. Uygulamadaki sıranın
-- aynısı (src/components/CvAlani.tsx).

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', c::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$insert into storage.objects (bucket_id, name)
     values ('cvs', '00000000-0000-4000-8000-00000000000c/profil/cv-b.pdf')$q$),
  'C, yeni profil CV dosyasini yukleyebilir');

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.student_profiles
        set cv_path = '00000000-0000-4000-8000-00000000000c/profil/cv-b.pdf'
      where id = '00000000-0000-4000-8000-00000000000c'$q$),
  'C, profil CV yolunu guncelleyebilir');

-- ESKİ DOSYAYI SİLME YETKİSİ: POLİTİKA VARLIĞIYLA ÖLÇÜLÜYOR
--
-- Buradaki ham SQL silme denemesi düşüyordu ve sebebi yetki değil:
-- güncel storage şemasında bir nesneyi silmek `storage.prefixes`
-- üzerinde de temizlik tetikliyor ve bu zincir psql'den `authenticated`
-- rolüyle yürümüyor. Uygulama silmeyi ham SQL ile değil storage API'siyle
-- yapıyor (supabase.storage.remove), yani test yanlış katmanı ölçüyordu.
--
-- Ölçülen şey aynı kalıyor: öğrencinin kendi klasöründeki dosyayı silme
-- politikası var mı? Yetkinin YOKLUĞU zaten aşağıda ayrıca sınanıyor —
-- B ve A şirketleri başkasının dosyasını silemiyor.
select pg_temp.bekle(
  (select count(*) = 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and cmd = 'DELETE' and qual like '%cvs%' and qual like '%auth.uid()%'),
  'Ogrencinin kendi CV dosyasini silme politikasi duruyor');

select pg_temp.bekle(
  (select cv_path = '00000000-0000-4000-8000-00000000000c/profil/cv-b.pdf'
     from public.student_profiles where id = (select c from k)),
  'Profil CV artik CV-B');

select pg_temp.bekle(
  (select cv_snapshot_path = '00000000-0000-4000-8000-00000000000c/basvurular/snap-a.pdf'
     from public.applications where id = '33333333-aaaa-4000-8000-000000000001'::uuid),
  'ESKI BASVURUNUN KOPYASI HALA CV-A');

select pg_temp.bekle(
  (select count(*) = 1 from storage.objects
    where bucket_id = 'cvs'
      and name = '00000000-0000-4000-8000-00000000000c/basvurular/snap-a.pdf'),
  'Profil CV degisince basvuru kopyasi silinmedi');

-- Yeni başvuru YENİ belgeyle: aynı öğrenci, ikinci ilan.
select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$insert into storage.objects (bucket_id, name)
     values ('cvs', '00000000-0000-4000-8000-00000000000c/basvurular/snap-b.pdf')$q$),
  'C, ikinci basvuru icin yeni kopya cikarabilir');

-- ---------------------------------------------- YOL ENJEKSİYONU KAPALI
--
-- Şirketin okuma yetkisi başvuru satırındaki yoldan türüyor. Yol serbest
-- olsaydı öğrenci, BAŞKA bir öğrencinin dosyasını kendi başvurusuna
-- yazıp şirkete okutabilirdi. applications_guard_cv_path bunu kapatıyor.
--
-- DENEME, MEŞRU EKLEMENİN HEMEN ÖNÜNDE: aynı (ilan, öğrenci) çiftiyle
-- hemen ardından geçerli bir yolla ekleme YAPILABİLİYOR. Böylece
-- engellemenin tekillik kısıtından değil, tetikleyiciden geldiği
-- görülüyor — yoksa test yanlış sebeple yeşil olurdu.

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.applications
       (listing_id, student_id, match_score, application_method,
        email_delivery_status, created_via, contact_share_consent_at, cv_snapshot_path)
     values ('22222222-bbbb-4000-8000-000000000003',
             '00000000-0000-4000-8000-00000000000c',
             55, 'internal', 'not_required', 'web', now(),
             '00000000-0000-4000-8000-00000000000e/profil/baskasi.pdf')$q$),
  'C, baskasinin dosya yolunu kendi basvurusuna yazamaz');

select pg_temp.bekle(
  (select cv_snapshot_path = '00000000-0000-4000-8000-00000000000c/basvurular/snap-a.pdf'
     from public.applications where id = '33333333-aaaa-4000-8000-000000000001'::uuid),
  'Enjeksiyon denemesinden sonra ilk kopyanin yolu degismedi');

-- GERÇEK AKIŞ: KOPYA BAŞVURUYLA BİRLİKTE YAZILIYOR
--
-- Uygulama var olan bir başvuruyu güncellemiyor; kopyayı çıkarıp yolu
-- INSERT ile yazıyor (lib/queries · createApplication). Test önce UPDATE
-- deniyordu ve düştü: şemada öğrencinin kendi başvurusunda
-- değiştirebildiği tek şey `withdrawn`. Yani kısıt doğru, test yanlış
-- katmandaydı.
select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$insert into public.applications
       (listing_id, student_id, match_score, application_method,
        email_delivery_status, created_via, contact_share_consent_at, cv_snapshot_path)
     values ('22222222-bbbb-4000-8000-000000000003',
             '00000000-0000-4000-8000-00000000000c',
             55, 'internal', 'not_required', 'web', now(),
             '00000000-0000-4000-8000-00000000000c/basvurular/snap-b.pdf')$q$),
  'C, ikinci sirkete yaptigi basvuruya yeni kopyayi baglayabilir');

-- ------------------------- ÖĞRENCİ ŞİRKETİN KARARINI VEREMEZ, GERİ ÇEKEBİLİR
--
-- Öğrenci politikasının WITH CHECK ifadesi sonucu `withdrawn` olmaya
-- zorluyor. Yani öğrenci kendi başvurusunu "Mülakat" ya da "Teklif"
-- yapamıyor: süreci ilerletmek şirketin kararı, vazgeçmek öğrencinin.
-- İkinci başvuru üzerinde sınanıyor; ilki şirket testlerinde kullanılıyor.

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='offer_extended'
      where listing_id='22222222-bbbb-4000-8000-000000000003'
        and student_id='00000000-0000-4000-8000-00000000000c'$q$),
  'C, kendine teklif veremez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='interview_scheduled'
      where listing_id='22222222-bbbb-4000-8000-000000000003'
        and student_id='00000000-0000-4000-8000-00000000000c'$q$),
  'C, kendini mulakata alamaz');

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='withdrawn'
      where listing_id='22222222-bbbb-4000-8000-000000000003'
        and student_id='00000000-0000-4000-8000-00000000000c'$q$),
  'C, kendi basvurusunu geri cekebilir');

select pg_temp.bekle(
  (select status::text = 'withdrawn' and status_changed_at is not null
     from public.applications
    where listing_id='22222222-bbbb-4000-8000-000000000003'::uuid
      and student_id='00000000-0000-4000-8000-00000000000c'::uuid),
  'Geri cekme damgalandi');

-- PROFİL CV SİLİNSE BİLE KOPYALAR DURUYOR
select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.student_profiles set cv_path = null
      where id = '00000000-0000-4000-8000-00000000000c'$q$),
  'C, profil CV kaydini temizleyebilir');

select pg_temp.bekle(
  (select count(*) = 2 from storage.objects
    where bucket_id = 'cvs'
      and name like '00000000-0000-4000-8000-00000000000c/basvurular/%'),
  'Profil CV silinince basvuru kopyalari duruyor');

-- ------------------------------------------------------ ŞİRKET ERİŞİMİ

-- Doğrulanmış şirket A: C onun ilanına başvurdu.
reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', a::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(
  (select count(*) = 1 from storage.objects
    where bucket_id = 'cvs'
      and name = '00000000-0000-4000-8000-00000000000c/basvurular/snap-a.pdf'),
  'A (dogrulanmis), kendi basvurusunun CV kopyasini gorebilir');

select pg_temp.bekle(
  (select count(*) = 0 from storage.objects
    where bucket_id = 'cvs'
      and name = '00000000-0000-4000-8000-00000000000c/basvurular/snap-b.pdf'),
  'A, ayni ogrencinin BASKA sirkete yaptigi basvurunun kopyasini goremez');

select pg_temp.bekle(
  (select count(*) = 0 from storage.objects
    where bucket_id = 'cvs'
      and name like '00000000-0000-4000-8000-00000000000c/profil/%'),
  'A, ogrencinin profil klasorundeki hicbir CV sini goremez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$delete from storage.objects
      where bucket_id = 'cvs'
        and name = '00000000-0000-4000-8000-00000000000c/basvurular/snap-a.pdf'$q$),
  'A, basvuru CV kopyasini silemez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update storage.objects set name = 'cvs-degistirildi'
      where bucket_id = 'cvs'
        and name = '00000000-0000-4000-8000-00000000000c/basvurular/snap-a.pdf'$q$),
  'A, basvuru CV kopyasini degistiremez');

-- Doğrulanmış şirket B: C ona hiç başvurmadı.
reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', b::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

-- B'nin ilanına da başvuruldu: simetrik durum. B YALNIZCA kendi
-- başvurusunun kopyasını görmeli — A'ya giden kopyayı ve öğrencinin
-- profil belgesini değil.
select pg_temp.bekle(
  (select count(*) = 1 from storage.objects
    where bucket_id = 'cvs'
      and name = '00000000-0000-4000-8000-00000000000c/basvurular/snap-b.pdf'),
  'B, kendi basvurusunun CV kopyasini gorebilir');

select pg_temp.bekle(
  (select count(*) = 0 from storage.objects
    where bucket_id = 'cvs'
      and name = '00000000-0000-4000-8000-00000000000c/basvurular/snap-a.pdf'),
  'B, ayni ogrencinin A sirketine yaptigi basvurunun kopyasini goremez');

select pg_temp.bekle(
  (select count(*) = 0 from storage.objects
    where bucket_id = 'cvs'
      and name like '00000000-0000-4000-8000-00000000000c/profil/%'),
  'B, ogrencinin profil klasorundeki hicbir CV sini goremez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$delete from storage.objects
     where bucket_id = 'cvs'
       and name = '00000000-0000-4000-8000-00000000000c/basvurular/snap-a.pdf'$q$),
  'B, baska sirkete giden CV kopyasini silemez');

-- Doğrulanmamış şirket D: C ONUN ilanına başvurdu ama şirket doğrulanmadı.
reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', d::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(
  (select count(*) = 0 from public.applications
    where listing_id = '22222222-dddd-4000-8000-000000000004'::uuid),
  'D (dogrulanmamis), kendi ilanina gelen basvuru satirini goremez');

select pg_temp.bekle(
  (select count(*) = 0 from storage.objects
    where bucket_id = 'cvs' and name like (select c::text from k) || '/%'),
  'D (dogrulanmamis), kendi basvuraninin CV kopyasini goremez');


-- =====================================================================
-- TEKLİF → ÖĞRENCİNİN KARARI → İLETİŞİM
-- =====================================================================
--
-- Ürünün ana kuralı: TEKLİFİ ŞİRKET VERİR, KARARI ÖĞRENCİ VERİR,
-- İLETİŞİM KABULDEN SONRA AÇILIR. Üçü de arayüzde görünüyor ama düğme
-- gizlemek güvenlik değil; sınırların gerçekten burada olduğu ölçülüyor.

-- ------------------------------------------------- A TEKLİF GÖNDERİYOR

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', a::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$update public.applications
        set status='offer_extended', offer_note='Ekibe bekliyoruz.',
            offer_start_date='2026-10-01'
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'A, adaya teklif gonderebilir');

-- Şirket öğrencinin KARARINI veremez: iki değer de politikada reddediliyor.
select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='offer_accepted'
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'A, ogrenci adina teklifi kabul edemez');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='offer_declined'
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'A, ogrenci adina teklifi reddedemez');

-- İşlev de aynı şeyi söylüyor: kapı yalnızca başvuran öğrenciye açık.
select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$select public.teklife_yanit_ver('33333333-aaaa-4000-8000-000000000001', true)$q$),
  'A, teklif yanit islevini ogrenci adina cagiramaz');

-- KABUL ÖNCESİ İLETİŞİM KAPALI: teklif verildi ama yanıt yok.
select pg_temp.bekle(
  (select count(*) = 0 from public.basvuru_iletisimi('33333333-aaaa-4000-8000-000000000001')),
  'Kabul oncesi iletisim KAPALI (sirket tarafi)');

-- ------------------------------------------------ B BAŞKASININ ADAYINA

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', b::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='offer_extended', offer_note='sizma'
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'B, A adayina teklif gonderemez');

select pg_temp.bekle(
  (select count(*) = 0 from public.basvuru_iletisimi('33333333-aaaa-4000-8000-000000000001')),
  'Ilgisiz sirket iletisimi goremez');

-- ------------------------------------------------- BAŞKA ÖĞRENCİ (E)

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', e::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$select public.teklife_yanit_ver('33333333-aaaa-4000-8000-000000000001', true)$q$),
  'D, C nin teklifini yanitlayamaz');

select pg_temp.bekle(
  (select count(*) = 0 from public.basvuru_iletisimi('33333333-aaaa-4000-8000-000000000001')),
  'Baska ogrenci iletisimi goremez');

-- ------------------------------------------------------ ÖĞRENCİ C KARAR

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', c::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

-- Öğrenci ŞİRKETİN kararını veremiyor: politika sonucu `withdrawn`
-- olmaya zorluyor, yani kendine teklif oluşturamıyor.
select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$update public.applications set status='offer_extended'
      where id='33333333-aaaa-4000-8000-000000000001'$q$),
  'C, kendi basvurusuna teklif olusturamaz');

-- Kabul öncesi öğrenci de şirket yetkilisini göremiyor.
select pg_temp.bekle(
  (select count(*) = 0 from public.basvuru_iletisimi('33333333-aaaa-4000-8000-000000000001')),
  'Kabul oncesi iletisim KAPALI (ogrenci tarafi)');

select pg_temp.bekle(
  (select public.teklife_yanit_ver('33333333-aaaa-4000-8000-000000000001', true)::text
     = 'offer_accepted'),
  'C, kendi teklifini kabul edebilir');

-- ÇİFT TIKLAMA / PARALEL İSTEK: ikinci yanıt hata değil, mevcut sonuç.
-- Ret göndersek bile kabul edilmiş karar DEĞİŞMİYOR.
select pg_temp.bekle(
  (select public.teklife_yanit_ver('33333333-aaaa-4000-8000-000000000001', false)::text
     = 'offer_accepted'),
  'Ikinci yanit hata vermiyor ve karari degistirmiyor');

-- Damga tetikleyiciden: yanıtın zamanı için ayrı kolon açılmadı.
select pg_temp.bekle(
  (select status_changed_at is not null
     from public.applications where id='33333333-aaaa-4000-8000-000000000001'::uuid),
  'Teklif yaniti status_changed_at ile damgalandi');

-- KABUL SONRASI: öğrenci şirket yetkilisini görüyor.
select pg_temp.bekle(
  (select count(*) = 1 from public.basvuru_iletisimi('33333333-aaaa-4000-8000-000000000001')
    where taraf = 'sirket' and eposta = 'a@test-a.com'),
  'Kabul sonrasi ogrenci sirket yetkilisini gorur');

-- Ama yalnızca o satırı: `profiles` tablosu hâlâ kapalı.
select pg_temp.bekle(
  (select count(*) = 0 from public.profiles where id = (select a from k)),
  'Kabul sonrasi bile profiles tablosu kapali kaliyor');

-- Geri çekilmiş başvuruda yanıtlanacak teklif yok.
--
-- Önce satırın GERÇEKTEN geri çekilmiş olduğu doğrulanıyor: satır
-- bulunamazsa işlev yine hata verirdi ve test boşuna geçerdi.
select pg_temp.bekle(
  (select count(*) = 1 from public.applications
    where listing_id = '22222222-bbbb-4000-8000-000000000003'::uuid
      and student_id = '00000000-0000-4000-8000-00000000000c'::uuid
      and status = 'withdrawn'),
  'Geri cekilmis basvuru testi dogru satirda calisiyor');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$select public.teklife_yanit_ver(
       (select id from public.applications
         where listing_id = '22222222-bbbb-4000-8000-000000000003'::uuid
           and student_id = '00000000-0000-4000-8000-00000000000c'::uuid), true)$q$),
  'Geri cekilmis basvuruda teklif yanitlanamaz');

-- ------------------------------------------------ KABUL SONRASI ŞİRKET

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', a::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(
  (select count(*) = 1 from public.basvuru_iletisimi('33333333-aaaa-4000-8000-000000000001')
    where taraf = 'ogrenci' and eposta = 'c@ogrenci.test'),
  'Kabul sonrasi sirket adayin iletisimini gorur');

select pg_temp.bekle(
  (select count(*) = 0 from public.profiles where id = (select c from k)),
  'Sirket adayin profiles satirini yine de okuyamiyor');

-- ------------------------------- REDDEDİLEN TEKLİF İLETİŞİMİ AÇMIYOR
--
-- Ayrı bir başvuru: öğrenci E, A'nın taslak olmayan ikinci ilanına
-- başvurmuş sayılıyor. Kurulum service_role ile yapılıyor; ölçülen şey
-- reddin SONUCU.

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

insert into public.listings (id, company_id, title, status, origin, application_method)
values ('22222222-aaaa-4000-8000-000000000005'::uuid, '11111111-aaaa-4000-8000-000000000001'::uuid,
        'A Ikinci Stajyeri', 'published', 'employer_posted', 'internal');

insert into public.applications (id, listing_id, student_id, match_score, application_method,
                                 email_delivery_status, created_via, contact_share_consent_at,
                                 status, offer_note)
select '33333333-eeee-4000-8000-000000000005'::uuid, '22222222-aaaa-4000-8000-000000000005'::uuid, e,
       60, 'internal', 'not_required', 'web', now(), 'offer_extended', 'Teklif metni'
from k;

-- Doğrulanmamış şirket D'nin başvurusu KABUL EDİLMİŞ sayılıyor: ölçülen
-- şey doğrulama kapısı, kabul kapısı değil.
update public.applications
   set status = 'offer_accepted', contact_share_consent_at = now()
 where id = '33333333-dddd-4000-8000-000000000004'::uuid;

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', e::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(
  (select public.teklife_yanit_ver('33333333-eeee-4000-8000-000000000005', false)::text
     = 'offer_declined'),
  'E, teklifi reddedebilir');

select pg_temp.bekle(
  (select count(*) = 0 from public.basvuru_iletisimi('33333333-eeee-4000-8000-000000000005')),
  'Reddedilen teklif iletisimi acmiyor');

reset role;
select set_config('request.jwt.claims',
  (select json_build_object('sub', d::text, 'role', 'authenticated')::text from k), true);
set local role authenticated;

select pg_temp.bekle(
  (select count(*) = 0 from public.basvuru_iletisimi('33333333-dddd-4000-8000-000000000004')),
  'Dogrulanmamis sirket kabul edilmis teklifte bile iletisimi goremez');

reset role;
rollback;
