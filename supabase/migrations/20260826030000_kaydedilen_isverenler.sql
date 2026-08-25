-- Kaydedilen işverenler. saved_guides / saved_opportunities ile aynı kalıp.
--
-- Ayrı tablo, çünkü niyetler farklı: "bu yazıyı sonra okurum" ile "bu
-- şirkete başvuracağım" aynı listede durursa ikisi de kullanışsız olur.
create table if not exists public.saved_employers (
  user_id uuid not null references auth.users (id) on delete cascade,
  employer_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, employer_slug)
);

alter table public.saved_employers enable row level security;

drop policy if exists "kisi kendi isverenlerini gorur" on public.saved_employers;
create policy "kisi kendi isverenlerini gorur"
  on public.saved_employers for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "kisi kendi isvereni ekler" on public.saved_employers;
create policy "kisi kendi isvereni ekler"
  on public.saved_employers for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "kisi kendi isverenini siler" on public.saved_employers;
create policy "kisi kendi isverenini siler"
  on public.saved_employers for delete to authenticated
  using (user_id = auth.uid());

grant select (user_id, employer_slug, created_at) on public.saved_employers to authenticated;
grant insert (user_id, employer_slug) on public.saved_employers to authenticated;
grant delete on public.saved_employers to authenticated;
