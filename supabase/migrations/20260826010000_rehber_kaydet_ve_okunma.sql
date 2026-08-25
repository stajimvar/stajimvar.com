-- Rehber merkezi: kaydetme ve okunma sayacı
--
-- NEDEN
-- -----
-- Rehber sayfası bir blog arşivi gibi çalışıyordu. Kullanıcıya ait iki
-- bilgi hiçbir yerde tutulmuyordu ve bu yüzden iki bölüm kurulamıyordu:
--
--   1. Hangi rehberi kaydettiği  → "Kaydet" düğmesi ya hiç yoktu ya da
--      çalışmayan bir süs olurdu.
--   2. Hangi rehberin kaç kez okunduğu → "En çok okunanlar" bölümü ancak
--      uydurma bir sıralamayla kurulabilirdi.
--
-- Uydurma veri göstermemek için sayım gerçekten tutuluyor; veri yetersizken
-- arayüz o bölümü hiç çizmiyor.

-- ----------------------------------------------------------- kaydedilenler
-- saved_opportunities ile aynı kalıp: ayrı tablo, aynı imza.
create table if not exists public.saved_guides (
  user_id uuid not null references auth.users (id) on delete cascade,
  guide_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, guide_slug)
);

alter table public.saved_guides enable row level security;

drop policy if exists "kisi kendi kaydettiklerini gorur" on public.saved_guides;
create policy "kisi kendi kaydettiklerini gorur"
  on public.saved_guides for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "kisi kendi kaydini ekler" on public.saved_guides;
create policy "kisi kendi kaydini ekler"
  on public.saved_guides for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "kisi kendi kaydini siler" on public.saved_guides;
create policy "kisi kendi kaydini siler"
  on public.saved_guides for delete to authenticated
  using (user_id = auth.uid());

-- Sütun bazlı GRANT: bu şemada erişim yalnızca RLS'e bırakılmıyor.
grant select (user_id, guide_slug, created_at) on public.saved_guides to authenticated;
grant insert (user_id, guide_slug) on public.saved_guides to authenticated;
grant delete on public.saved_guides to authenticated;

-- --------------------------------------------------------------- okunma
create table if not exists public.guide_views (
  guide_slug text primary key,
  views bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.guide_views enable row level security;

-- Sayılar herkese açık: liste giriş yapmamış ziyaretçiye de gösteriliyor.
drop policy if exists "okunma sayilari herkese acik" on public.guide_views;
create policy "okunma sayilari herkese acik"
  on public.guide_views for select to anon, authenticated
  using (true);

grant select (guide_slug, views) on public.guide_views to anon, authenticated;

-- Artırma yalnızca bu fonksiyonla. Tabloya doğrudan UPDATE yetkisi
-- verilseydi herhangi bir ziyaretçi sayıyı istediği değere yazabilirdi.
create or replace function public.rehber_okundu(slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if slug is null or length(slug) = 0 or length(slug) > 120 then
    return;
  end if;

  insert into public.guide_views (guide_slug, views, updated_at)
  values (slug, 1, now())
  on conflict (guide_slug)
  do update set views = public.guide_views.views + 1, updated_at = now();
end;
$$;

revoke all on function public.rehber_okundu(text) from public;
grant execute on function public.rehber_okundu(text) to anon, authenticated;
