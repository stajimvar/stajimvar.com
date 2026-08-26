-- Takip edilen bölümler.
--
-- Bölüm sayfası okunup çıkılan bir yazıydı; öğrencinin "bu bölümü izle"
-- diyebileceği bir yer yoktu. saved_guides / saved_employers ile aynı
-- kalıp, ayrı tablo.
create table if not exists public.saved_departments (
  user_id uuid not null references auth.users (id) on delete cascade,
  department_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, department_slug)
);

alter table public.saved_departments enable row level security;

drop policy if exists "kisi kendi bolumlerini gorur" on public.saved_departments;
create policy "kisi kendi bolumlerini gorur"
  on public.saved_departments for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "kisi kendi bolumunu ekler" on public.saved_departments;
create policy "kisi kendi bolumunu ekler"
  on public.saved_departments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "kisi kendi bolumunu siler" on public.saved_departments;
create policy "kisi kendi bolumunu siler"
  on public.saved_departments for delete to authenticated
  using (user_id = auth.uid());

grant select (user_id, department_slug, created_at) on public.saved_departments to authenticated;
grant insert (user_id, department_slug) on public.saved_departments to authenticated;
grant delete on public.saved_departments to authenticated;
