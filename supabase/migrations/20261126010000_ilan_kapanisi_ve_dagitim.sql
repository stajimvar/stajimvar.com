-- İLAN KAPANIŞINDA BEKLEYENLER + DENGELİ DAĞITIM
--
-- İKİ AYRI İŞ, TEK GÖÇ: ikisi de "bekleyen başvuru" sorununun aynı
-- yüzü — biri ilan kapanırken, öteki iş dağıtılırken.

/* ================================================================== */
/*  1) İLAN KAPANIRKEN SONUCU BEKLEYENLER                              */
/* ================================================================== */
--
-- ADAYLAR KENDİLİĞİNDEN REDDEDİLMİYOR.
--
-- İlan kapanınca bekleyen başvuruları otomatik `rejected` yapmak kolay
-- olurdu ve YANLIŞ olurdu: red, şirketin verdiği bir karardır ve
-- öğrenciye öyle görünür ("başvurun reddedildi"). Sistemin verdiği bir
-- red, kimsenin arkasında durmadığı bir karardır.
--
-- Bu yüzden kapanış akışı DEĞİŞMİYOR; yalnızca kapatmadan önce
-- şirketin görmesi için liste veriliyor. Kararı şirket veriyor.
create or replace function public.ilan_bekleyen_adaylar(p_ilan uuid)
returns table (
  basvuru_id   uuid,
  durum        text,
  bekleme_gun  integer,
  atanan_uye   uuid
)
language sql stable security definer set search_path = public
as $$
  select
    a.id,
    a.status::text,
    extract(day from (now() - greatest(a.updated_at, a.applied_at)))::int,
    a.atanan_uye
  from public.applications a
  join public.listings l on l.id = a.listing_id
  where a.listing_id = p_ilan
    and public.is_company_member(l.company_id)
    /*
      "Sonucu bekleyen" = sonuçlanmamış. Liste panodaki 'sonuclandi'
      aşamasıyla ve hatırlatma RPC'siyle AYNI; üç yerde ayrı yazılsaydı
      biri değişip ötekiler geride kalırdı.
    */
    and a.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
  order by greatest(a.updated_at, a.applied_at)
$$;

revoke all on function public.ilan_bekleyen_adaylar(uuid) from public, anon;
grant execute on function public.ilan_bekleyen_adaylar(uuid) to authenticated;

/* ================================================================== */
/*  2) DENGELİ DAĞITIM                                                 */
/* ================================================================== */
--
-- ŞİRKET İSTERSE. Otomatik çalışan bir dağıtım değil; işveren düğmeye
-- bastığında koşuyor. Kendiliğinden atama, kimsenin haberi olmadan iş
-- yüklemek olurdu.
--
-- YALNIZ SORUMSUZ OLANLAR DAĞITILIYOR: var olan atamayı bozmak,
-- birinin üstlendiği işi elinden almak demekti.
--
-- DENGE MEVCUT YÜKE GÖRE: her başvuru, o an EN AZ açık işi olan
-- yazabilen üyeye gidiyor. Sırayla dağıtmak (round-robin) hâlihazırda
-- yüklü olanın üstüne yığardı.
create or replace function public.basvurulari_dagit(p_sirket uuid, p_ilan uuid default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  k record;
  hedef uuid;
  sayac integer := 0;
begin
  if not public.sirket_basvuru_yazabilir(p_sirket) then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;

  /* Dağıtılacak kimse yoksa sessizce 0 dönüyor; hata değil. */
  if not exists (
    select 1 from public.company_members cm
     where cm.company_id = p_sirket
       and (cm.is_owner or coalesce(nullif(btrim(cm.recruiter_role), ''), 'Viewer') in ('Owner', 'Recruiter'))
  ) then
    return 0;
  end if;

  for k in
    select a.id
      from public.applications a
      join public.listings l on l.id = a.listing_id
     where l.company_id = p_sirket
       and a.atanan_uye is null
       and a.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
       and (p_ilan is null or a.listing_id = p_ilan)
     order by a.applied_at
  loop
    /*
      Hedef HER DÖNGÜDE yeniden hesaplanıyor: az önce atanan iş de yüke
      ekleniyor, yoksa hepsi aynı kişiye giderdi.
    */
    select cm.user_id into hedef
      from public.company_members cm
      left join lateral (
        select count(*) n
          from public.applications a2
          join public.listings l2 on l2.id = a2.listing_id
         where l2.company_id = p_sirket
           and a2.atanan_uye = cm.user_id
           and a2.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
      ) yuk on true
     where cm.company_id = p_sirket
       and (cm.is_owner or coalesce(nullif(btrim(cm.recruiter_role), ''), 'Viewer') in ('Owner', 'Recruiter'))
     order by yuk.n, cm.user_id
     limit 1;

    update public.applications
       set atanan_uye = hedef, atanan_at = now()
     where id = k.id and atanan_uye is null;   -- araya giren atamayı ezmiyor

    if found then
      sayac := sayac + 1;
    end if;
  end loop;

  return sayac;
end;
$$;

revoke all on function public.basvurulari_dagit(uuid, uuid) from public, anon;
grant execute on function public.basvurulari_dagit(uuid, uuid) to authenticated;
