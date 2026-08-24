-- BAŞVURU KONTROL LİSTESİ
--
-- Başvuru kurumun kendi sayfasında yapılıyor; StajımVar başvuruyu almıyor
-- ve alıyormuş gibi de yapmıyor. Ama öğrencinin belge toplama süreci
-- hiçbir yerde tutulmuyordu: hangi belgeyi hazırladığını aklında tutmak
-- zorundaydı.
--
-- Tek satırda bir metin dizisi: hangi adımların tamamlandığı. Adım başına
-- satır açmak, aynı bilgiyi çok daha pahalı tutmak olurdu.
create table if not exists public.opportunity_application_progress (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  completed_steps text[] not null default '{}',
  updated_at      timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

alter table public.opportunity_application_progress enable row level security;

-- Kayıt yalnızca sahibinindir: gören de yazan da silen de aynı kişi.
drop policy if exists "kullanici kendi ilerlemesini gorur" on public.opportunity_application_progress;
create policy "kullanici kendi ilerlemesini gorur"
  on public.opportunity_application_progress for select using (user_id = auth.uid());

drop policy if exists "kullanici kendi ilerlemesini ekler" on public.opportunity_application_progress;
create policy "kullanici kendi ilerlemesini ekler"
  on public.opportunity_application_progress for insert with check (user_id = auth.uid());

drop policy if exists "kullanici kendi ilerlemesini gunceller" on public.opportunity_application_progress;
create policy "kullanici kendi ilerlemesini gunceller"
  on public.opportunity_application_progress for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "kullanici kendi ilerlemesini siler" on public.opportunity_application_progress;
create policy "kullanici kendi ilerlemesini siler"
  on public.opportunity_application_progress for delete using (user_id = auth.uid());

-- anon'a da SELECT: politika zaten auth.uid() istiyor, yetki olmadan
-- giriş yapmamış ziyaretçide sorgu 401'e düşüp arayüzde hata gösteriyor.
grant select on public.opportunity_application_progress to anon;
grant select, insert, update, delete on public.opportunity_application_progress to authenticated;
