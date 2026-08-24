-- İlanlar için "Kaydet" tablosu.
--
-- NEDEN
-- -----
-- Kayıt ekranı "ilanları kaydet, başvurularını takip et" diyor ama ilanlarda
-- Kaydet diye bir eylem yoktu; yalnızca "Başvurdum" vardı. İkisi farklı
-- niyet: kaydetmek "ilgileniyorum, henüz başvurmadım" demek, başvurdum
-- işaretlemek "resmî sayfada tamamladım" demek. İkisini tek düğmede
-- toplamak, kullanıcıyı yapmadığı bir şeyi işaretlemeye zorluyordu.
--
-- Fırsat/burs tarafında bu ayrım zaten var (`saved_opportunities`,
-- 0018_student_opportunities.sql). Bu tablo aynı deseni ilanlar için
-- kuruyor: aynı sütun düzeni, aynı politika üçlüsü, aynı yetkiler.
--
-- NEDEN applications.status'a 'saved' EKLENMEDİ
-- ---------------------------------------------
-- `applications` tablosu bir BAŞVURUYU temsil ediyor: cover_letter,
-- cv_snapshot_path, contact_share_consent_at, e-posta teslim durumu gibi
-- alanları var ve satır açmak "başvuru yapıldı" anlamına geliyor. Henüz
-- başvurulmamış bir ilanı oraya yazmak, ilerideki raporları ("kaç başvuru
-- yapıldı") sessizce yanlışlar. Kaydetme ayrı ve hafif bir kayıt.
--
-- Kullanım: Supabase SQL Editor'de çalıştır.

create table if not exists public.saved_listings (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.saved_listings enable row level security;

-- Kayıt yalnızca sahibinindir: gören de ekleyen de silen de aynı kişi.
drop policy if exists "kullanici kendi ilan kaydini gorur" on public.saved_listings;
create policy "kullanici kendi ilan kaydini gorur"
  on public.saved_listings for select using (user_id = auth.uid());

drop policy if exists "kullanici kendi ilan kaydini ekler" on public.saved_listings;
create policy "kullanici kendi ilan kaydini ekler"
  on public.saved_listings for insert with check (user_id = auth.uid());

drop policy if exists "kullanici kendi ilan kaydini siler" on public.saved_listings;
create policy "kullanici kendi ilan kaydini siler"
  on public.saved_listings for delete using (user_id = auth.uid());

-- Yetkiler saved_opportunities ile aynı: giriş yapan kendi satırını yönetir.
-- anon'a SELECT veriliyor çünkü tablo politikası zaten auth.uid() istiyor;
-- yetki olmadan giriş yapmamış kullanıcıda sorgu 401 ile düşüyor ve arayüz
-- "kaydedilmedi" yerine hata gösteriyor.
grant select on public.saved_listings to anon;
grant select, insert, delete on public.saved_listings to authenticated;

-- Kontrol
select count(*) as politika_sayisi from pg_policies
where schemaname = 'public' and tablename = 'saved_listings';

select grantee, string_agg(privilege_type, ',' order by privilege_type) as yetkiler
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'saved_listings'
  and grantee in ('anon', 'authenticated')
group by grantee order by grantee;
