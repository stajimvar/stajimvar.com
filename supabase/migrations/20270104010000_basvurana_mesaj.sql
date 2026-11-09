/*
  ŞİRKET BAŞVURANA MESAJ YAZABİLİYOR (9 Kasım 2026, kullanıcı: "rakiplerde
  olup bizde eksik ne varsa … önem sırasına göre yapalım")

  Ölçülen (Modmere hesabıyla canlı): işveren → aday mesajlaşması sunucuda
  20261116010000'den beri açık ama yalnız "staj/iş arıyorum" anahtarını
  açmış öğrenciye. Şirketin KENDİ ilanına başvurmuş aday o anahtarı
  açmamışsa yazılamıyordu; Başvuranlar'daki aday çekmecesinde tek yol
  e-posta ve telefondu. Rakiplerin hepsinde (LinkedIn, Kariyer.net,
  Youthall) başvurana site içi mesaj var.

  BU GÖÇ
    1. sosyal_gizli.yazilabilir_aday(ben, kim): eski kural (aday_mi) YA DA
       kim, ben'in şirketinin ilanına İLETİŞİM İZNİYLE başvurmuş ve
       başvurusunu geri çekmemiş (basvuru_iletisimi_acik ile aynı rıza).
    2. mesaj_gonder'deki tek çağrı `aday_mi(p_alici)` → `yazilabilir_aday(ben,
       p_alici)`. İşlevin geri kalanı (istek akışı: ilk mesaj İSTEK olarak
       düşer, aday reddedebilir, yanıtlanana kadar en çok 3 mesaj, hız
       sınırı, engel) AYNEN kalıyor; gövde canlı tanımdan okunup yalnız o
       çağrı değiştiriliyor.
    3. basvuru_aday_kullanici_adi(basvuru): aday çekmecesindeki "Mesaj
       gönder" düğmesi için adayın kullanıcı adı — yalnız o başvurunun
       ilanının şirketinde YAZABİLEN üyeye (Owner/Recruiter) ve yalnız
       iletişim rızası açıksa.

  GERİ ALMA
    -- mesaj_gonder'de yazilabilir_aday(ben, p_alici) → aday_mi(p_alici)
    drop function if exists public.basvuru_aday_kullanici_adi(uuid);
    drop function if exists sosyal_gizli.yazilabilir_aday(uuid, uuid);
*/

create or replace function sosyal_gizli.yazilabilir_aday(ben uuid, kim uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select sosyal_gizli.aday_mi(kim)
      or exists (
        select 1
          from public.applications a
          join public.listings l on l.id = a.listing_id
          join public.social_profiles sb on sb.profile_id = ben and sb.sirket_id = l.company_id
          join public.social_profiles sk on sk.profile_id = kim and sk.sirket_id is null
         where a.student_id = kim
           and a.status <> 'withdrawn'
           and public.basvuru_iletisimi_acik(a.id)
      )
$$;

revoke all on function sosyal_gizli.yazilabilir_aday(uuid, uuid) from public, anon, authenticated;

do $$
declare
  tanim text := pg_get_functiondef('public.mesaj_gonder(uuid,text)'::regprocedure);
begin
  if position('sosyal_gizli.yazilabilir_aday(ben, p_alici)' in tanim) > 0 then
    return; -- zaten uygulanmış
  end if;
  if (length(tanim) - length(replace(tanim, 'sosyal_gizli.aday_mi(p_alici)', ''))) / length('sosyal_gizli.aday_mi(p_alici)') <> 1 then
    raise exception 'mesaj_gonder beklenen tek aday_mi çağrısını içermiyor';
  end if;
  execute replace(tanim, 'sosyal_gizli.aday_mi(p_alici)', 'sosyal_gizli.yazilabilir_aday(ben, p_alici)');
end $$;

create or replace function public.basvuru_aday_kullanici_adi(p_basvuru uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select sp.username
    from public.applications a
    join public.listings l on l.id = a.listing_id
    join public.social_profiles sp on sp.profile_id = a.student_id and sp.sirket_id is null
   where a.id = p_basvuru
     and a.status <> 'withdrawn'
     and public.sirket_basvuru_yazabilir(l.company_id)
     and public.basvuru_iletisimi_acik(a.id)
$$;

revoke all on function public.basvuru_aday_kullanici_adi(uuid) from public, anon;
grant execute on function public.basvuru_aday_kullanici_adi(uuid) to authenticated;
