-- Listede olmayan şirketin eklenme talebi.
--
-- NEDEN
-- -----
-- Şirket aramada bulunamayınca işverene "aşağıda ne yapacağınız yazıyor"
-- deniyordu; aşağısı iletişim bölümüne, orası da yalnızca bir e-posta
-- adresine çıkıyordu. İletişim sayfasında form bile yok. Huninin en
-- kritik noktasında işveren e-posta yazmak zorunda kalıyordu.
create table if not exists public.sirket_talepleri (
  id uuid primary key default gen_random_uuid(),
  sirket_adi text not null,
  web_sitesi text,
  kariyer_sayfasi text,
  yetkili_adi text not null,
  kurumsal_eposta text not null,
  gorev text,
  telefon text,
  -- Giriş yapmış kullanıcıdan geldiyse kimliği; ziyaretçiden geldiyse null.
  user_id uuid references auth.users (id) on delete set null,
  durum text not null default 'yeni',
  not_ text,
  created_at timestamptz not null default now(),
  constraint sirket_talepleri_durum_check
    check (durum in ('yeni', 'inceleniyor', 'onaylandi', 'reddedildi'))
);

create index if not exists sirket_talepleri_durum_idx
  on public.sirket_talepleri (durum, created_at desc);

alter table public.sirket_talepleri enable row level security;

-- Talep bırakmak için hesap şart değil: işveren siteyi ilk kez görüyor
-- olabilir ve önce hesap açtırmak, henüz karar vermemiş birine bedel
-- ödetmek olur.
drop policy if exists "herkes sirket talebi birakabilir" on public.sirket_talepleri;
create policy "herkes sirket talebi birakabilir"
  on public.sirket_talepleri for insert to anon, authenticated
  with check (true);

-- Okumak yalnızca yöneticide: talepler kurumsal iletişim bilgisi taşıyor.
drop policy if exists "talepleri yonetici gorur" on public.sirket_talepleri;
create policy "talepleri yonetici gorur"
  on public.sirket_talepleri for select to authenticated
  using (public.is_admin());

drop policy if exists "talepleri yonetici gunceller" on public.sirket_talepleri;
create policy "talepleri yonetici gunceller"
  on public.sirket_talepleri for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant insert (sirket_adi, web_sitesi, kariyer_sayfasi, yetkili_adi, kurumsal_eposta, gorev, telefon, user_id)
  on public.sirket_talepleri to anon, authenticated;
grant select on public.sirket_talepleri to authenticated;
grant update (durum, not_) on public.sirket_talepleri to authenticated;
