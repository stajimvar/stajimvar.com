-- =============================================================================
-- Şirketin dahili mülakat notu ayrı tabloya
-- =============================================================================
--
-- BULGU 1: `interview_notes`, `applications` satırında duruyordu ve öğrenci
-- "kendi başvurularını görür" politikasıyla o satırın tamamını okuyabiliyordu.
-- Yani şirketin kendi arasında tuttuğu değerlendirme notu adaya açıktı.
--
-- Sütun bazlı yetki burada ÇÖZMEZ: öğrenci de şirket kullanıcısı da aynı
-- veritabanı rolünde (`authenticated`). GRANT rol düzeyinde çalışır, satır
-- sahibine göre değil. Bu yüzden notun ayrı bir tabloya çıkması gerekiyor.
--
-- BULGU 2 (daha kötüsü): şirket portalı mülakat notunu
-- `updateApplicationStatus`'ın üçüncü parametresine geçiriyordu — o parametre
-- `company_feedback`, yani ADAYA GÖSTERİLEN alan. Not sadece okunabilir
-- durumda değildi, doğrudan öğrenciye yazılıyordu. İstemci tarafı da düzeltildi.
--
-- Veri kaybı yok: taşımadan önce ölçüldü, 1 başvuru vardı ve mülakat notu boştu.

create table public.application_notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id      uuid references public.profiles(id) on delete set null,
  note           text not null,
  created_at     timestamptz not null default now()
);

create index application_notes_basvuru on public.application_notes (application_id, created_at desc);

comment on table public.application_notes is
  'Şirketin dahili değerlendirme notları. Öğrenci HİÇBİR koşulda göremez; '
  'adaya gösterilecek metin applications.company_feedback alanında.';

alter table public.application_notes enable row level security;

-- Yalnızca ilanın sahibi şirketin üyeleri. Öğrenci için hiçbir politika yok,
-- dolayısıyla RLS onu tamamen dışarıda bırakıyor.
create policy "sirket kendi notlarini gorur" on public.application_notes
  for select using (
    exists (
      select 1
      from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.id = application_notes.application_id
        and public.is_company_member(l.company_id)
    )
  );

create policy "sirket not ekler" on public.application_notes
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.id = application_notes.application_id
        and public.is_company_member(l.company_id)
    )
  );

create policy "yazar kendi notunu siler" on public.application_notes
  for delete using (author_id = auth.uid());

grant select, insert, delete on public.application_notes to authenticated;
revoke update on public.application_notes from authenticated;
revoke all on public.application_notes from anon;

alter table public.applications drop column interview_notes;

-- Doğrulandı: interview_notes sütunu kalktı, anon'un yetkisi yok,
-- RLS açık, 3 politika var ve hiçbiri öğrenciye satır vermiyor.
