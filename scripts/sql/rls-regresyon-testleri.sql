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
  '00000000-0000-4000-8000-00000000000c'::uuid as c;

-- `authenticated` rolüne geçildikten sonra da okunabilmeli.
grant select on k to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select x.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
       x.eposta, '', now(), now(), now()
from (select a as id, 'a@test-a.com' as eposta from k
      union all select b, 'b@test-b.com' from k
      union all select c, 'c@ogrenci.test' from k) x
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
  $q$insert into public.listings (company_id,title,status,origin,application_method,apply_url)
     values ('11111111-aaaa-4000-8000-000000000001','IDOR','draft','employer_posted','external','https://x.com')$q$),
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

-- `id` BİLEREK VERİLMİYOR
--
-- Kolon yetkisi, ifadede ADI GEÇEN her kolon için aranıyor. `id`
-- uygulamanın hiç göndermediği bir alan ve yetki listesinde yok; testte
-- yazılsaydı istek `id` yüzünden düşer ve ayrıcalıklı alan testleri
-- YANLIŞ NEDENLE yeşil görünürdü. Ölçüldü: ilk denemede tam bu oldu.
-- Aşağıdaki yük, panelin gerçekten gönderdiği alan kümesi.
select pg_temp.bekle(not pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id, title, city, work_type,
        mandatory_staj_accepted, voluntary_staj_accepted, term, duration,
        is_paid, stipend_text, apply_url, application_method, description,
        application_deadline, origin, status, posted_at)
     values ('11111111-aaaa-4000-8000-000000000001', 'Yeni Stajyer', 'Izmir',
             'On-site', true, false, 'All Year', '3 ay', true,
             'Asgari staj ucreti', 'https://test-a.com/basvur', 'external',
             'aciklama', '2026-12-31', 'employer_posted', 'draft', now())$q$),
  'A, panelin gonderdigi yukle yeni ilan acabilir');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id, title, status, origin,
                                  application_method, apply_url, source_status)
     values ('11111111-aaaa-4000-8000-000000000001', 'Sahte Taze Ilan', 'draft',
             'employer_posted', 'external', 'https://test-a.com/basvur', 'acik')$q$),
  'A, ilan acarken source_status GONDEREMEZ');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id, title, status, origin,
                                  application_method, apply_url,
                                  source_verified_at, last_seen_at)
     values ('11111111-aaaa-4000-8000-000000000001', 'Sahte Dogrulanmis', 'draft',
             'employer_posted', 'external', 'https://test-a.com/basvur',
             now(), now())$q$),
  'A, ilan acarken dogrulama damgalarini GONDEREMEZ');

select pg_temp.bekle(pg_temp.yazma_engellendi_mi(
  $q$insert into public.listings (company_id, title, status, origin,
                                  application_method, apply_url,
                                  featured, applicants_count)
     values ('11111111-aaaa-4000-8000-000000000001', 'Sahte One Cikan', 'draft',
             'employer_posted', 'external', 'https://test-a.com/basvur',
             true, 500)$q$),
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

reset role;
rollback;
