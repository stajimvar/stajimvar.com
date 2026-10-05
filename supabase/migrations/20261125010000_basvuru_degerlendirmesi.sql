-- STANDART DEĞERLENDİRME FORMU
--
-- NEDEN VAR
-- ---------
-- Başvuru hakkındaki tek kayıt serbest metin bir nottu (`interview_notes`).
-- İki kişi aynı adayı farklı şeylere bakarak değerlendiriyordu ve
-- "neden eledik" sorusunun ekranda bir karşılığı yoktu. Form, şirketin
-- KENDİ ölçütlerini bir kez tanımlayıp her adaya aynı soruları sormasını
-- sağlıyor.
--
-- ÖLÇÜTLER ŞİRKETİN, STAJIMVAR'IN DEĞİL
-- -------------------------------------
-- Hazır bir ölçüt listesi dayatılmıyor. Hangi şirketin neye bakacağı
-- onun işi; bizim koyacağımız varsayılan liste, ölçmediği bir şeyi
-- ölçüyormuş gibi gösterirdi.
--
-- PUAN İNSANDAN GELİYOR
-- ---------------------
-- Otomatik, türetilmiş ya da yapay zekâ üretimi puan YOK. Her puanın
-- yanında onu veren kişi ve anı duruyor. `applications.match_score`
-- alanına BU GÖÇ HİÇ DOKUNMUYOR — o ayrı bir alan ve buradan
-- doldurulmuyor.
--
-- GEÇMİŞ SİLİNMİYOR
-- -----------------
-- Her değerlendirme ayrı bir satır. Aynı kişi yeniden değerlendirirse
-- eskisi KALIYOR: fikir değiştirmek de bilgidir ve üzerine yazmak,
-- kararın nasıl oluştuğunu silerdi.

/* ================================================================== */
/*  1) ŞİRKETİN ÖLÇÜTLERİ                                              */
/* ================================================================== */

create table if not exists public.sirket_degerlendirme_olcutleri (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  ad          text not null check (btrim(ad) <> '' and char_length(ad) <= 80),
  sira        integer not null default 0,
  /* Kaldırılan ölçüt SİLİNMİYOR: eski değerlendirmeler ona atıfta
     bulunuyor ve silmek geçmişi okunamaz hâle getirirdi. */
  aktif       boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (company_id, ad)
);

create index if not exists olcut_sirket_idx
  on public.sirket_degerlendirme_olcutleri (company_id, sira) where aktif;

/* ================================================================== */
/*  2) DEĞERLENDİRMELER                                                */
/* ================================================================== */

create table if not exists public.basvuru_degerlendirmeleri (
  id             uuid primary key default gen_random_uuid(),
  basvuru_id     uuid not null references public.applications(id) on delete cascade,
  degerlendiren  uuid not null references public.profiles(id) on delete set null,
  /*
    `{ "<olcut_id>": 1..5 }`. Ayrı satır yerine jsonb: bir değerlendirme
    TEK bir olay ve ölçüt başına satır açmak, "kim ne zaman
    değerlendirdi" sorusunu her seferinde yeniden kurmak demekti.
  */
  puanlar        jsonb not null default '{}'::jsonb,
  not_metni      text check (not_metni is null or char_length(not_metni) <= 2000),
  created_at     timestamptz not null default now()
);

create index if not exists degerlendirme_basvuru_idx
  on public.basvuru_degerlendirmeleri (basvuru_id, created_at desc);

revoke all on public.sirket_degerlendirme_olcutleri, public.basvuru_degerlendirmeleri
  from anon, authenticated;
grant select on public.sirket_degerlendirme_olcutleri, public.basvuru_degerlendirmeleri
  to authenticated;

alter table public.sirket_degerlendirme_olcutleri enable row level security;
alter table public.basvuru_degerlendirmeleri      enable row level security;

/* ================================================================== */
/*  3) OKUMA — YALNIZ KENDİ ŞİRKETİ                                    */
/* ================================================================== */
--
-- VIEWER DA OKUYOR: rolün amacı "görsün ama karışmasın". Değerlendirme
-- geçmişini görmek, kararın nasıl verildiğini anlamak demek.

drop policy if exists "sirket olcutlerini gorur" on public.sirket_degerlendirme_olcutleri;
create policy "sirket olcutlerini gorur" on public.sirket_degerlendirme_olcutleri
  for select to authenticated
  using (public.is_company_member(company_id));

drop policy if exists "sirket degerlendirmeleri gorur" on public.basvuru_degerlendirmeleri;
create policy "sirket degerlendirmeleri gorur" on public.basvuru_degerlendirmeleri
  for select to authenticated
  using (
    exists (
      select 1 from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.id = basvuru_degerlendirmeleri.basvuru_id
        and public.is_company_member(l.company_id)
    )
  );

/*
  ÖĞRENCİ GÖRMÜYOR. Değerlendirme şirketin kendi içindeki kayıt;
  öğrenciye gösterilen şey `company_feedback` ve o ayrı bir alan.
  Buraya öğrenci politikası EKLENMİYOR — eklenseydi puanlar ve iç
  notlar adayın ekranına düşerdi.
*/

/* ================================================================== */
/*  4) YAZMA — RPC'DEN                                                 */
/* ================================================================== */

/** Ölçüt ekle/düzenle. Ölçüt bir ŞİRKET POLİTİKASI: yalnız sahip. */
create or replace function public.olcut_kaydet(
  p_sirket uuid,
  p_ad text,
  p_sira integer default 0,
  p_id uuid default null
)
returns public.sirket_degerlendirme_olcutleri
language plpgsql security definer set search_path = public
as $$
declare
  satir public.sirket_degerlendirme_olcutleri%rowtype;
begin
  if not exists (
    select 1 from public.company_members cm
     where cm.company_id = p_sirket and cm.user_id = auth.uid() and cm.is_owner
  ) then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;

  if btrim(coalesce(p_ad, '')) = '' then
    raise exception 'olcut-bos' using errcode = 'P0001';
  end if;

  if p_id is null then
    insert into public.sirket_degerlendirme_olcutleri (company_id, ad, sira)
    values (p_sirket, btrim(p_ad), coalesce(p_sira, 0))
    returning * into satir;
  else
    update public.sirket_degerlendirme_olcutleri
       set ad = btrim(p_ad), sira = coalesce(p_sira, 0)
     where id = p_id and company_id = p_sirket
    returning * into satir;
    if satir.id is null then
      raise exception 'olcut-yok' using errcode = 'P0001';
    end if;
  end if;

  return satir;
end;
$$;

/** Ölçütü pasifleştir. Silmiyor: eski değerlendirmeler ona atıfta bulunuyor. */
create or replace function public.olcut_kaldir(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.sirket_degerlendirme_olcutleri o
     set aktif = false
   where o.id = p_id
     and exists (
       select 1 from public.company_members cm
        where cm.company_id = o.company_id and cm.user_id = auth.uid() and cm.is_owner
     );
  if not found then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;
end;
$$;

/**
 * Değerlendirme yaz.
 *
 * PUAN 1–5 ARALIĞINDA VE SAYI: dışarıdan gelen jsonb olduğu gibi
 * yazılsaydı metin, null ya da 900 gibi değerler kayda girerdi ve
 * ortalama anlamsızlaşırdı. Her anahtar bu şirketin AKTİF ölçütü
 * olmalı — başka şirketin ölçütüne puan verilemiyor.
 *
 * ÜZERİNE YAZMIYOR: her çağrı yeni satır. Geçmiş kararın nasıl
 * oluştuğunu gösteriyor.
 */
create or replace function public.degerlendirme_yaz(
  p_basvuru uuid,
  p_puanlar jsonb,
  p_not text default null
)
returns public.basvuru_degerlendirmeleri
language plpgsql security definer set search_path = public
as $$
declare
  sirket uuid;
  anahtar text;
  deger   jsonb;
  satir   public.basvuru_degerlendirmeleri%rowtype;
begin
  if auth.uid() is null then
    raise exception 'oturum-yok' using errcode = '42501';
  end if;

  select l.company_id into sirket
    from public.applications a
    join public.listings l on l.id = a.listing_id
   where a.id = p_basvuru;

  if sirket is null then
    raise exception 'basvuru-yok' using errcode = 'P0001';
  end if;

  if not public.sirket_basvuru_yazabilir(sirket) then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;

  for anahtar, deger in select * from jsonb_each(coalesce(p_puanlar, '{}'::jsonb)) loop
    if jsonb_typeof(deger) <> 'number'
       or (deger)::numeric < 1 or (deger)::numeric > 5
       or (deger)::numeric <> floor((deger)::numeric) then
      raise exception 'puan-gecersiz' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.sirket_degerlendirme_olcutleri o
       where o.id = anahtar::uuid and o.company_id = sirket and o.aktif
    ) then
      raise exception 'olcut-gecersiz' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.basvuru_degerlendirmeleri (basvuru_id, degerlendiren, puanlar, not_metni)
  values (p_basvuru, auth.uid(), coalesce(p_puanlar, '{}'::jsonb), nullif(btrim(coalesce(p_not, '')), ''))
  returning * into satir;

  return satir;
end;
$$;

revoke all on function public.olcut_kaydet(uuid, text, integer, uuid) from public, anon;
revoke all on function public.olcut_kaldir(uuid)                      from public, anon;
revoke all on function public.degerlendirme_yaz(uuid, jsonb, text)    from public, anon;
grant execute on function public.olcut_kaydet(uuid, text, integer, uuid) to authenticated;
grant execute on function public.olcut_kaldir(uuid)                      to authenticated;
grant execute on function public.degerlendirme_yaz(uuid, jsonb, text)    to authenticated;

/* ================================================================== */
/*  5) GEÇMİŞ: DEĞERLENDİREN ADIYLA                                    */
/* ================================================================== */
--
-- `profiles` satırı yalnız kendine açık; değerlendirenin adı ancak
-- buradan geliyor (ekip listesiyle aynı gerekçe).
create or replace function public.basvuru_degerlendirme_gecmisi(p_basvuru uuid)
returns table (
  id            uuid,
  degerlendiren uuid,
  ad            text,
  puanlar       jsonb,
  not_metni     text,
  created_at    timestamptz
)
language sql stable security definer set search_path = public
as $$
  select d.id, d.degerlendiren,
         coalesce(nullif(btrim(p.full_name), ''), 'Ekip üyesi'),
         d.puanlar, d.not_metni, d.created_at
    from public.basvuru_degerlendirmeleri d
    left join public.profiles p on p.id = d.degerlendiren
    join public.applications a on a.id = d.basvuru_id
    join public.listings l on l.id = a.listing_id
   where d.basvuru_id = p_basvuru
     and public.is_company_member(l.company_id)
   order by d.created_at desc
$$;

revoke all on function public.basvuru_degerlendirme_gecmisi(uuid) from public, anon;
grant execute on function public.basvuru_degerlendirme_gecmisi(uuid) to authenticated;
