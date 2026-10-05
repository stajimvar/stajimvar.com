-- BAŞVURUYA SORUMLU ATAMA
--
-- NEDEN VAR
-- ---------
-- Başvurular ortak bir yığındı: hangi adaya kimin bakacağı hiçbir yerde
-- yazmıyordu. İki kişi aynı adayı inceliyor ya da kimse incelemiyordu;
-- ikisini de ekrandan ayırt etmenin yolu yoktu. Üretimde ölçüldü
-- (5 Ekim 2026): 8 başvurunun 4'ü 7 günden uzun süredir işlem görmemiş.
--
-- TEK SORUMLU, ÇOK İZLEYİCİ
-- -------------------------
-- Bir başvurunun bir sorumlusu var. "Kim bakıyor" sorusunun tek cevabı
-- olmalı; iki sorumlu, sorumsuzlukla aynı kapıya çıkıyor. Ekibin geri
-- kalanı başvuruyu görmeye devam ediyor (okuma politikası değişmedi).
--
-- VIEWER'A İŞ ATANMIYOR
-- ---------------------
-- Sorumlu, başvuruya YAZABİLEN biri olmak zorunda (Owner/Recruiter).
-- Viewer'a iş atamak, yapamayacağı bir işi ona yazmak olurdu —
-- hatırlatma da ona giderdi ve iş sessizce beklerdi.

/* ================================================================== */
/*  1) ALAN                                                            */
/* ================================================================== */

alter table public.applications
  add column if not exists atanan_uye uuid references public.profiles(id) on delete set null,
  add column if not exists atanan_at  timestamptz;

comment on column public.applications.atanan_uye is
  'Bu başvurudan sorumlu şirket üyesi. NULL = sorumlusu yok.';

/*
  `on delete set null`: üye şirketten/sistemden silinirse başvuru
  SİLİNMİYOR, sorumlusuz kalıyor ve "sorumlusu yok" süzgecine düşüyor.
  Cascade, bir üyenin ayrılmasıyla başvuruları silerdi.
*/

/* Sorumlusu olmayan işleri bulmak en sık sorulan soru; kısmi indeks. */
create index if not exists applications_sorumlusuz_idx
  on public.applications (listing_id)
  where atanan_uye is null;

create index if not exists applications_atanan_idx
  on public.applications (atanan_uye)
  where atanan_uye is not null;

/* ================================================================== */
/*  2) EKİP LİSTESİ                                                    */
/* ================================================================== */
--
-- `company_members` üyeler arasında okunabiliyor ama `profiles` SATIRI
-- yalnız kendine açık ("kendi profilini okur"). Yani istemci takım
-- arkadaşının ADINI okuyamıyor; atama kutusu da iş yükü tablosu da
-- isimsiz kalırdı. Bu RPC o boşluğu, yalnız ÜYEYE ve yalnız kendi
-- şirketi için dolduruyor.
--
-- E-POSTA DÖNMÜYOR: atama için ad ve rol yetiyor. Takım arkadaşının
-- e-postasını açmak, bu ekranın sormadığı bir soruya cevap vermek olurdu.
create or replace function public.sirket_ekibi(p_sirket uuid)
returns table (
  uye_id   uuid,
  ad       text,
  rol      text,
  yazabilir boolean
)
language sql stable security definer set search_path = public
as $$
  select
    cm.user_id,
    coalesce(nullif(btrim(p.full_name), ''), 'Ekip üyesi') as ad,
    coalesce(nullif(btrim(cm.recruiter_role), ''), 'Viewer') as rol,
    (cm.is_owner or coalesce(nullif(btrim(cm.recruiter_role), ''), 'Viewer') in ('Owner', 'Recruiter')) as yazabilir
  from public.company_members cm
  left join public.profiles p on p.id = cm.user_id
  where cm.company_id = p_sirket
    and public.is_company_member(p_sirket)   -- çağıran da bu şirketin üyesi olmalı
  order by cm.is_owner desc, ad
$$;

revoke all on function public.sirket_ekibi(uuid) from public, anon;
grant execute on function public.sirket_ekibi(uuid) to authenticated;

/* ================================================================== */
/*  3) ATAMA — EŞZAMANLI YAZMAYA KARŞI                                 */
/* ================================================================== */
--
-- İki kişi aynı anda sorumlu atadığında sonuncusu ötekini sessizce
-- eziyordu; ekranda kimin kazandığı görünmüyordu. RPC çağıranın
-- GÖRDÜĞÜ değeri de alıyor (`p_beklenen`) ve satır o değerde değilse
-- yazmıyor, `sorumlu-degisti` atıyor. Arayüz o hatayı "başkası değiştirdi,
-- ekranı tazele" diye gösterebiliyor.
--
-- `for update` kilidi: kontrol ile yazma arasına ikinci bir işlem
-- giremesin. Kontrolü ve yazmayı ayrı ifadelerde bırakmak, tam da
-- önlemek istediğimiz yarışı açık bırakırdı.
create or replace function public.basvuru_sorumlusu_ata(
  p_basvuru uuid,
  p_uye uuid,
  p_beklenen uuid default null
)
returns public.applications
language plpgsql security definer set search_path = public
as $$
declare
  sirket uuid;
  satir  public.applications%rowtype;
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

  /* Atamayı yapan kişi başvuruya yazabilmeli (Owner/Recruiter). */
  if not public.sirket_basvuru_yazabilir(sirket) then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;

  /*
    SORUMLU AYNI ŞİRKETTEN VE YAZABİLEN BİRİ OLMALI.
    Başka şirketin üyesine ya da Viewer'a iş atamak engelleniyor.
    `p_uye` null ise atama KALDIRILIYOR — o her zaman geçerli.
  */
  if p_uye is not null and not exists (
    select 1 from public.company_members cm
     where cm.company_id = sirket
       and cm.user_id = p_uye
       and (cm.is_owner or coalesce(nullif(btrim(cm.recruiter_role), ''), 'Viewer') in ('Owner', 'Recruiter'))
  ) then
    raise exception 'uye-uygun-degil' using errcode = 'P0001';
  end if;

  select * into satir from public.applications where id = p_basvuru for update;

  /* Çağıranın gördüğü değer artık geçerli değilse yazma. */
  if satir.atanan_uye is distinct from p_beklenen then
    raise exception 'sorumlu-degisti' using errcode = 'P0001';
  end if;

  update public.applications
     set atanan_uye = p_uye,
         atanan_at  = case when p_uye is null then null else now() end
   where id = p_basvuru
  returning * into satir;

  return satir;
end;
$$;

revoke all on function public.basvuru_sorumlusu_ata(uuid, uuid, uuid) from public, anon;
grant execute on function public.basvuru_sorumlusu_ata(uuid, uuid, uuid) to authenticated;

/* ================================================================== */
/*  4) İŞ YÜKÜ                                                         */
/* ================================================================== */
--
-- SAYILAR GERÇEK: açık başvuru = sonuçlanmamış başvuru. Sonuçlanmış
-- işler (teklif kabul/ret, red, geri çekme) yükten düşüyor çünkü
-- yapılacak iş kalmıyor.
--
-- Sorumlusu olmayanlar AYRI satırda (`uye_id` null) dönüyor; toplamın
-- içinde eritmek, dağıtılmayı bekleyen işi görünmez kılardı.
create or replace function public.sirket_is_yuku(p_sirket uuid)
returns table (
  uye_id uuid,
  ad     text,
  acik   bigint
)
language sql stable security definer set search_path = public
as $$
  select
    a.atanan_uye,
    case
      when a.atanan_uye is null then 'Sorumlusu yok'
      else coalesce(nullif(btrim(p.full_name), ''), 'Ekip üyesi')
    end as ad,
    count(*) as acik
  from public.applications a
  join public.listings l on l.id = a.listing_id
  left join public.profiles p on p.id = a.atanan_uye
  where l.company_id = p_sirket
    and public.is_company_member(p_sirket)
    and a.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
  group by a.atanan_uye, p.full_name
  order by count(*) desc, ad
$$;

revoke all on function public.sirket_is_yuku(uuid) from public, anon;
grant execute on function public.sirket_is_yuku(uuid) to authenticated;
