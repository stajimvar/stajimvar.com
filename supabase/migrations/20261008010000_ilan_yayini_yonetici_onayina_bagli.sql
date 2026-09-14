-- İLAN YAYINI İSTİSNASIZ YÖNETİCİ ONAYINA BAĞLI
--
-- ÖNCEKİ DURUM — İKİ BAYPAS
-- -------------------------
-- `20260830050000_isveren_ilani_yayin_korumasi.sql` şirkete iki yoldan
-- ONAYSIZ yayın hakkı veriyordu:
--
--   Kademe 2  şirket `verified` ise               → doğrudan published
--   Kademe 1  kurumsal e-posta alan adı site      → doğrudan published
--             adresiyle eşleşiyorsa
--
-- İkisi de insan incelemesini tamamen atlıyordu. Alan adı eşleşmesi
-- "bu kişi bu şirkette çalışıyor" için makul bir sinyal ama ilanın
-- İÇERİĞİ hakkında hiçbir şey söylemiyor: ücret isteyen, teminat
-- isteyen, WhatsApp'tan başvuru toplayan bir ilan da kurumsal bir
-- e-postadan açılabilir. `ilanBayraklari` tam bu kalıpları arıyor ve
-- yöneticiye gösteriyor — ama ilan çoktan yayına çıkmışsa o bayrakların
-- gösterildiği ekranın bir anlamı kalmıyor.
--
-- YENİ KURAL: yayına alma YALNIZCA yöneticide. Şirket ilanı yazar,
-- düzenler, taslakta tutar, arşivler; yayına alan yönetici.
--
-- NE DEĞİŞMİYOR
-- -------------
-- · `service_role` muaf. Otomasyon şirketlerin kendi işe alım
--   sistemlerinden derlediği ilanları kendisi yayına alıyor; o akış
--   editoryal bir kuyruğa bağlı değil ve bu göç ona dokunmuyor.
--   ("İlan onaysız yayınlanmasın" kuralı işverenin ELLE açtığı native
--   ilan için; derlenen ilan zaten şirketin kendi sayfasında yayında.)
-- · Şirket YAYINDAKİ ilanını düzenlemeye devam ediyor. Yasaklanan şey
--   durum değil GEÇİŞ: yayında olmayan bir ilanı yayına almak. Bu ayrım
--   0013'te kurulmuştu ve korunuyor — yoksa şirket kendi ilanındaki
--   yazım hatasını bile düzeltemezdi.
-- · Kapatma, arşivleme, silme kuralları değişmiyor.
--
-- HATA MESAJI NEDEN DEĞİŞTİ
-- -------------------------
-- Eski mesaj "Kurumsal e-posta alan adi site adresiyle eslesmiyor"
-- diyordu ve artık YANLIŞ olurdu: eşleşse de yayınlanamıyor. Mesaj
-- kullanıcıya ne yapacağını söylüyor — beklemesi gerektiğini.

create or replace function public.guard_listing_publish()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rol text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
begin
  /*
    OTOMASYON MUAF

    Derlenen ilanları service_role yayına alıyor. Bu kimliği yalnızca
    kendi işçilerimiz taşıyor; tarayıcıya hiç gitmiyor.
  */
  if rol = 'service_role' then
    return new;
  end if;

  /*
    YAYINA GEÇİŞ DIŞINDAKİ HER ŞEY SERBEST

    Taslak oluşturma, taslağı düzenleme, yayındaki ilanı düzenleme,
    kapatma, arşivleme buradan geçiyor ve dokunulmuyor.
  */
  if new.status <> 'published'
     or (tg_op = 'UPDATE' and old.status is not distinct from 'published') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  /*
    KADEME BAYPASLARI KALDIRILDI

    Burada eskiden `s.verified` ve `alan_adi_eslesiyor(...)` kontrolleri
    vardı ve ikisi de `return new` ile yayına izin veriyordu. Artık yok:
    şirketin doğrulanmış olması kimliğiyle ilgili bir bilgi, ilanın
    içeriğiyle ilgili değil.
  */
  raise exception 'Ilan yayina ancak yonetici onayiyla alinir'
    using errcode = 'check_violation';
end;
$function$;

comment on function public.guard_listing_publish() is
  'İlanı yayına almayı yöneticiye (ve otomasyonun service_role kimliğine) '
  'kısıtlar. Şirketin verified olması ya da kurumsal e-posta alan adının '
  'eşleşmesi ARTIK yetmiyor: ikisi de kimlik sinyali, ilan içeriği hakkında '
  'kanıt değil. Yasaklanan durum değil GEÇİŞ — şirket yayındaki ilanını '
  'düzenlemeye devam ediyor.';

/*
  ONAY/RET İZİ — YÖNETİCİ KİM, NE ZAMAN, NİYE
  -------------------------------------------
  Onay kuyruğu bugün ilanın `status` alanından başka hiçbir şey
  tutmuyor: kim onayladı, ne zaman, reddedildiyse neden — hiçbiri
  kayıtlı değil. Bir ilan reddedilip taslağa döndüğünde şirket
  panelinde "niye?" sorusunun cevabı yok ve yönetici de kendi geçmiş
  kararını göremiyor.

  Üç kolon, hepsi nullable: eski satırlar için uydurma bir geçmiş
  yazılmıyor.
*/
alter table public.listings
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

comment on column public.listings.review_note is
  'Yöneticinin ret ya da onay notu. Şirket panelinde görünüyor: ret '
  'edilen ilanın nedeni şirkete söylenmeden taslağa düşerse şirket aynı '
  'ilanı yeniden gönderir.';

/*
  İNCELEME ALANLARINI ŞİRKET YAZAMAZ

  `listings` kolon kolon yetki veriyor. Yeni üç kolon `authenticated`
  için insert/update listesine GİRMİYOR — yani şirket kendi ilanına
  "yönetici onayladı" damgası basamıyor. Yalnız okuyabiliyor.

  Bu tam olarak `20260906010000_ilan_kolon_yetkileri.sql` dosyasının
  kurduğu düzen ve orada bir kez ters yönde hata yapıldı: yeni kolona
  SELECT yetkisi verilmeyince tek kolon bütün sorguyu 42501 ile
  düşürmüştü. O yüzden SELECT burada açıkça veriliyor.
*/
grant select (review_note, reviewed_at, reviewed_by) on public.listings to authenticated;

/*
  YÖNETİCİ İNCELEME RPC'Sİ — `is_admin()` İÇERDE
  ----------------------------------------------
  Panel bugün `ilanDurumuDegistir` ile doğrudan UPDATE atıyor. Onay
  kararı bir de not ve iz bırakmalı, üstelik atomik olmalı: durum
  değişip not yazılmazsa kimse niye onaylandığını bilemez.

  `security definer` ama yetki İÇERDE sorgulanıyor — çağrıyı anon ya da
  authenticated yapabilir, yönetici değilse iş görmez. Bu kalıp
  `ilan_bildirimi_incele` ile aynı ve orada bir kez `execute` yetkisi
  fazla verilip düzeltilmişti.
*/
create or replace function public.ilan_incele(
  p_ilan uuid,
  p_karar text,
  p_not text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'Bu islem yalnizca yoneticiye acik'
      using errcode = 'insufficient_privilege';
  end if;

  if p_karar not in ('onayla', 'reddet') then
    raise exception 'Karar onayla ya da reddet olmali'
      using errcode = 'check_violation';
  end if;

  /*
    RET'TE NOT ZORUNLU

    Nedensiz ret, şirketin aynı ilanı birebir yeniden göndermesiyle
    sonuçlanıyor. Onayda not isteğe bağlı.
  */
  if p_karar = 'reddet' and coalesce(btrim(p_not), '') = '' then
    raise exception 'Ret icin not zorunlu'
      using errcode = 'check_violation';
  end if;

  update public.listings
     set status      = case when p_karar = 'onayla' then 'published' else 'draft' end::public.listing_status,
         /*
           posted_at YALNIZ ONAYDA

           Yayın tarihi onayın tarihi; ilanın yazıldığı tarih değil.
           Reddedilen ilanda dokunulmuyor.
         */
         posted_at   = case when p_karar = 'onayla' then now() else posted_at end,
         review_note = p_not,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_ilan;

  if not found then
    raise exception 'Ilan bulunamadi' using errcode = 'no_data_found';
  end if;
end;
$function$;

/*
  ÇAĞRI YETKİSİ: `anon` DEĞİL

  Yönetici oturumu `authenticated` rolüyle geliyor. `anon`'a execute
  vermek, giriş yapmamış birinin RPC'yi çağırıp `is_admin()` duvarına
  çarpmasına izin vermek olurdu — işe yaramaz ama gereksiz bir yüzey.
*/
revoke all on function public.ilan_incele(uuid, text, text) from public;
revoke all on function public.ilan_incele(uuid, text, text) from anon;
grant execute on function public.ilan_incele(uuid, text, text) to authenticated;

comment on function public.ilan_incele(uuid, text, text) is
  'Yöneticinin ilan onay/ret kararı. Durumu, notu ve izi TEK işlemde '
  'yazıyor. is_admin() içeride sorgulanıyor; anon çağıramıyor. Ret için '
  'not zorunlu.';
