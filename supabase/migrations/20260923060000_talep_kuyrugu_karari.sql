-- SOSYAL KATMAN C AŞAMASI — TALEP KUYRUĞU KARARI VE DENETİMİ
--
-- Kuyruk, mevcut yönetim yapısının üstüne oturan ASGARİ bir akış: yeni
-- ve geniş kapsamlı bir yönetim paneli kurulmuyor.
--
-- KULLANICININ YAZDIĞI METİN KAYDA DÖNÜŞMÜYOR
-- -------------------------------------------
-- Karar RPC'si serbest metin parametresi ALMIYOR. Yönetici kabul
-- ederken bölümü ve alanı KAPALI listelerden (`departments`, `sectors`)
-- seçiyor; `requested_department` yalnız okuduğu bir açıklama.
-- Bunu imzayla zorlamak, "yönetici yanlışlıkla kullanıcının yazdığını
-- yapıştırabilir" ihtimalini kodda değil şemada kapatıyor.
--
-- ALAN DEĞİŞTİRME BU KUYRUKTAN YAPILMAZ
-- -------------------------------------
-- Bölümün eşlemesi zaten varsa ve karar farklı bir alana işaret
-- ediyorsa RPC reddediyor. Var olan bir eşlemeyi değiştirmek bir
-- topluluğu bir gecede başka bir topluluğa taşımak demek; ayrı ve
-- bilinçli bir işlem olmalı, kuyrukta sıradaki satırın yan etkisi değil.

/* ================================================================== */
/*  1) KARAR DENETİMİ (append-only)                                    */
/* ================================================================== */

create table if not exists public.bolum_talep_denetim (
  id uuid primary key default gen_random_uuid(),
  talep_id uuid not null references public.department_requests(id) on delete cascade,
  karar text not null check (karar in ('eklendi','reddedildi')),
  department_id uuid references public.departments(id),
  sector_id uuid references public.sectors(id),
  yapan uuid not null references public.profiles(id),
  gerekce text not null check (length(btrim(gerekce)) between 5 and 500),
  created_at timestamptz not null default now()
);

create index if not exists bolum_talep_denetim_talep_idx
  on public.bolum_talep_denetim (talep_id, created_at desc);

alter table public.bolum_talep_denetim enable row level security;

drop policy if exists "talep denetimini yonetici okur" on public.bolum_talep_denetim;
create policy "talep denetimini yonetici okur" on public.bolum_talep_denetim
  for select to authenticated using (public.is_admin());

grant select on public.bolum_talep_denetim to authenticated;
revoke insert, update, delete on public.bolum_talep_denetim from authenticated;
revoke all on public.bolum_talep_denetim from anon;

/* ================================================================== */
/*  2) KARAR RPC'Sİ                                                    */
/* ================================================================== */

create or replace function public.bolum_talebini_karara_bagla(
  p_talep_id      uuid,
  p_karar         text,
  p_department_id uuid,
  p_sector_id     uuid,
  p_gerekce       text
)
returns public.department_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  talep public.department_requests%rowtype;
  mevcut_alan uuid;
  sonuc public.department_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici olmak gerekiyor.'
      using errcode = '42501', detail = 'yonetici-degil';
  end if;

  if p_gerekce is null or length(btrim(p_gerekce)) < 5 then
    raise exception 'Karar gerekçesi zorunlu.'
      using errcode = '23514', detail = 'gerekce-zorunlu';
  end if;

  if p_karar is null or p_karar not in ('eklendi', 'reddedildi') then
    raise exception 'Geçersiz karar.'
      using errcode = '23514', detail = 'gecersiz-karar';
  end if;

  select * into talep from public.department_requests where id = p_talep_id;
  if not found then
    raise exception 'Talep bulunamadı.'
      using errcode = 'P0001', detail = 'talep-bulunamadi';
  end if;

  if p_karar = 'eklendi' then
    if p_department_id is null or p_sector_id is null then
      raise exception 'Kabul için bölüm ve alan seçilmeli.'
        using errcode = '23514', detail = 'secim-zorunlu';
    end if;

    /* Seçimler KAPALI listelerden gelmek zorunda. */
    if not exists (select 1 from public.departments where id = p_department_id and aktif) then
      raise exception 'Bölüm katalogda bulunamadı.'
        using errcode = 'P0001', detail = 'bolum-bulunamadi';
    end if;
    if not exists (select 1 from public.sectors where id = p_sector_id and aktif) then
      raise exception 'Alan listede bulunamadı.'
        using errcode = 'P0001', detail = 'alan-bulunamadi';
    end if;

    select ds.sector_id into mevcut_alan
      from public.department_sectors ds
     where ds.department_id = p_department_id;

    if mevcut_alan is not null and mevcut_alan is distinct from p_sector_id then
      raise exception 'Bu bölümün eşlemesi zaten var ve farklı bir alana işaret ediyor.'
        using errcode = '23505', detail = 'esleme-catismasi';
    end if;

    insert into public.department_sectors (department_id, sector_id, onaylayan, onay_notu)
    values (p_department_id, p_sector_id, auth.uid(), btrim(p_gerekce))
    on conflict (department_id) do nothing;
  end if;

  update public.department_requests
     set status = p_karar,
         department_id = coalesce(p_department_id, department_id),
         updated_at = now()
   where id = p_talep_id
  returning * into sonuc;

  insert into public.bolum_talep_denetim
    (talep_id, karar, department_id, sector_id, yapan, gerekce)
  values
    (p_talep_id, p_karar, p_department_id, p_sector_id, auth.uid(), btrim(p_gerekce));

  return sonuc;
end;
$$;

revoke all on function public.bolum_talebini_karara_bagla(uuid, text, uuid, uuid, text) from public;
grant execute on function public.bolum_talebini_karara_bagla(uuid, text, uuid, uuid, text) to authenticated;
