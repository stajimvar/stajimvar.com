-- Şirket sahiplenme talebinin otomatik değerlendirmesi.
--
-- ASIL KAPI BURASI
-- ----------------
-- Aynı kural src/lib/sirket-dogrulama.mjs içinde de var ama o kopya
-- yalnızca kullanıcıya doğru mesajı göstermek için. İstemci kandırılabilir;
-- bu tetikleyici kandırılamaz. İkisi birlikte değişmeli.
--
-- REDDETME YOK
-- ------------
-- Karar iki değerli: OTOMATIK_ONAY ya da ELLE_INCELE. Bir talebi otomatik
-- reddetmek gerçek bir şirketi sessizce kapıda bırakmak demek; yanlış
-- onaydan daha az görünür ama daha kalıcı bir hata.
--
-- YENİ ENUM YOK
-- -------------
-- company_claims.status zaten metin ('pending' | 'approved' | 'rejected').
-- Otomatik onay aynı 'approved' durumunu kullanıyor. Ayırt edici işaret
-- reviewed_by IS NULL: insan onayladıysa dolu, sistem onayladıysa boş.

-- ---------------------------------------------------------------- gerekçe

alter table public.company_claims
  add column if not exists karar_gerekcesi text;

comment on column public.company_claims.karar_gerekcesi is
  'Makine tarafından okunabilir karar kodu (ör. KURUMSAL_ALAN_ADI_SITEYLE_ESLESTI). reviewed_by NULL ise karar otomatiktir.';

-- ------------------------------------------------------- alan adı çözümleme

/*
  Kayıtlı alan adı (registrable domain): genel son ekin bir üstündeki
  etiket dahil. Karşılaştırma bunun üzerinden yapılıyor; "içerir" ya da
  "ile biter" karşılaştırması `acme.com` ile `acme.com.evil.com`'u
  eşleştirirdi.

  Liste eksik olabilir ve bu GÜVENLİĞİ ZAYIFLATMIYOR: bilinmeyen çok
  parçalı bir son ekte alan adı bir etiket kısa hesaplanır ve eşleşme
  BULUNAMAZ — hata otomatik onay değil, elle inceleme yönünde.
*/
create or replace function public.cok_parcali_son_ek_mi(son_ek text)
returns boolean language sql immutable
as $$
  select son_ek in (
    'com.tr','org.tr','net.tr','gov.tr','edu.tr','k12.tr','bel.tr','pol.tr',
    'tsk.tr','av.tr','dr.tr','name.tr','gen.tr','web.tr','biz.tr','info.tr',
    'tv.tr','bbs.tr',
    'co.uk','org.uk','ac.uk','gov.uk','me.uk','net.uk',
    'com.au','net.au','org.au','edu.au','gov.au',
    'co.nz','net.nz','org.nz',
    'com.br','net.br','org.br',
    'co.jp','ne.jp','or.jp','ac.jp','go.jp',
    'co.kr','or.kr',
    'com.cn','net.cn','org.cn','gov.cn',
    'co.in','net.in','org.in',
    'com.mx','com.ar','com.co','com.sg','com.hk','com.tw',
    'co.za','com.ua','com.pl','com.gr','com.cy',
    'co.il','com.sa','com.eg','com.qa','com.kw'
  );
$$;

create or replace function public.gecerli_alan_mi(alan text)
returns boolean language sql immutable
as $$
  select alan is not null
     and length(alan) between 4 and 253
     and alan like '%.%'
     and position(':' in alan) = 0
     -- IP adresi bir kurum alan adı değil.
     and alan !~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'
     and alan ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$';
$$;

create or replace function public.kayitli_alan_adi(alan text)
returns text language plpgsql immutable
as $$
declare
  temiz   text := rtrim(lower(coalesce(alan, '')), '.');
  parcalar text[];
  n       int;
begin
  if not public.gecerli_alan_mi(temiz) then
    return null;
  end if;
  parcalar := string_to_array(temiz, '.');
  n := array_length(parcalar, 1);

  if public.cok_parcali_son_ek_mi(array_to_string(parcalar[n-1:n], '.')) then
    -- "com.tr" tek başına kayıtlı alan adı değil; en az üç etiket gerekiyor.
    if n < 3 then return null; end if;
    return array_to_string(parcalar[n-2:n], '.');
  end if;

  if n < 2 then return null; end if;
  return array_to_string(parcalar[n-1:n], '.');
end;
$$;

/* Site adresinden ana makine adı: şema, kullanıcı bilgisi, port, yol, www. */
create or replace function public.site_alan_adi(site text)
returns text language plpgsql immutable
as $$
declare
  ham text := lower(btrim(coalesce(site, '')));
  makine text;
begin
  if ham = '' then return null; end if;

  -- http(s) dışındaki şemalar bir şirket sitesi değil.
  if ham ~ '^[a-z][a-z0-9+.-]*://' and ham !~ '^https?://' then
    return null;
  end if;

  makine := regexp_replace(ham, '^https?://', '');
  makine := split_part(makine, '/', 1);   -- yol
  makine := split_part(makine, '?', 1);   -- sorgu
  makine := split_part(makine, '#', 1);   -- çapa
  -- kullanıcı bilgisi (user:pass@host) ve port
  if position('@' in makine) > 0 then
    makine := split_part(makine, '@', 2);
  end if;
  makine := split_part(makine, ':', 1);
  makine := rtrim(makine, '.');
  makine := regexp_replace(makine, '^www\.', '');

  return case when public.gecerli_alan_mi(makine) then makine else null end;
end;
$$;

create or replace function public.serbest_saglayici_mi(alan text)
returns boolean language sql immutable
as $$
  select lower(coalesce(alan, '')) in (
    'gmail.com','googlemail.com','hotmail.com','hotmail.com.tr','outlook.com',
    'outlook.com.tr','live.com','msn.com','yahoo.com','yahoo.com.tr',
    'icloud.com','me.com','aol.com','yandex.com','yandex.com.tr','yandex.ru',
    'mail.ru','proton.me','protonmail.com','gmx.com','zoho.com','mynet.com',
    'superonline.com','ttmail.com'
  );
$$;

create or replace function public.tek_kullanimlik_eposta_mi(alan text)
returns boolean language sql immutable
as $$
  select lower(coalesce(alan, '')) in (
    'mailinator.com','guerrillamail.com','tempmail.com','temp-mail.org',
    '10minutemail.com','yopmail.com','trashmail.com','sharklasers.com',
    'getnada.com','dispostable.com','fakeinbox.com','throwawaymail.com',
    'maildrop.cc','mailnesia.com','spamgourmet.com'
  );
$$;

create or replace function public.test_alan_adi_mi(alan text)
returns boolean language sql immutable
as $$
  select lower(coalesce(alan, '')) in (
    'localhost','localhost.localdomain','test','invalid','example',
    'example.com','example.org','example.net','test.com','local'
  );
$$;

-- ------------------------------------------------------------------ karar

/*
  Talebin kararı. src/lib/sirket-dogrulama.mjs ile aynı sırayı izliyor;
  ikisi de aynı gerekçe kodlarını üretiyor.
*/
create or replace function public.sirket_dogrulama_karari(site text, eposta text)
returns text language plpgsql immutable
as $$
declare
  eposta_alan   text := lower(nullif(split_part(rtrim(btrim(lower(coalesce(eposta,''))), '.'), '@', 2), ''));
  eposta_kayitli text;
  site_alan     text;
begin
  if eposta_alan is null or not public.gecerli_alan_mi(eposta_alan) then
    return 'ELLE_INCELE:EPOSTA_OKUNAMADI';
  end if;

  eposta_kayitli := public.kayitli_alan_adi(eposta_alan);

  if public.test_alan_adi_mi(eposta_alan) or public.test_alan_adi_mi(coalesce(eposta_kayitli,'')) then
    return 'ELLE_INCELE:TEST_ALAN_ADI';
  end if;
  if public.tek_kullanimlik_eposta_mi(eposta_alan) or public.tek_kullanimlik_eposta_mi(coalesce(eposta_kayitli,'')) then
    return 'ELLE_INCELE:TEK_KULLANIMLIK_EPOSTA';
  end if;
  if public.serbest_saglayici_mi(eposta_alan) then
    return 'ELLE_INCELE:KURUMSAL_EPOSTA_DEGIL';
  end if;

  site_alan := public.site_alan_adi(site);
  if site_alan is null then
    return 'ELLE_INCELE:SIRKET_SITESI_YOK';
  end if;
  if public.test_alan_adi_mi(site_alan) or public.test_alan_adi_mi(coalesce(public.kayitli_alan_adi(site_alan),'')) then
    return 'ELLE_INCELE:TEST_ALAN_ADI';
  end if;

  -- BİREBİR eşitlik. "içerir"/"ile biter" acme.com ile acme.com.evil.com'u eşleştirirdi.
  if public.kayitli_alan_adi(site_alan) is not null
     and eposta_kayitli is not null
     and public.kayitli_alan_adi(site_alan) = eposta_kayitli then
    return 'OTOMATIK_ONAY:KURUMSAL_ALAN_ADI_SITEYLE_ESLESTI';
  end if;

  return 'ELLE_INCELE:ALAN_ADI_SITEYLE_ESLESMIYOR';
end;
$$;

-- ------------------------------------------------------------ tetikleyici

/*
  Talep eklendiğinde değerlendirilir. OTOMATIK_ONAY ise
  approve_company_claim'in yaptığı işin aynısı yapılır — ama yönetici
  kontrolü olmadan, çünkü kararı bu fonksiyon verdi.

  Şirketin `verified` bayrağına DOKUNULMUYOR: sahiplenme (panele giriş)
  ile doğrulama (aday kartlarının açılması) ayrı iki yetki ve ikincisi
  hâlâ VKN + insan incelemesi istiyor.
*/
/*
  AFTER INSERT OLMAK ZORUNDA

  company_claims INSERT politikasının WITH CHECK koşulu status='pending' ve
  reviewed_at IS NULL istiyor; bu koşul BEFORE tetikleyicisinden SONRA
  değerlendiriliyor. BEFORE'da onaylamak, RLS'in kendi eklediği satırı
  reddetmesine yol açardı (ölçüldü: "new row violates row-level security").
*/
create or replace function public.company_claim_otomatik_degerlendir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  site   text;
  karar  text;
  kod    text;
begin
  if new.status is distinct from 'pending' then
    return null;
  end if;

  select website_url into site from public.companies where id = new.company_id;

  karar := public.sirket_dogrulama_karari(site, new.work_email);
  kod := split_part(karar, ':', 2);

  if split_part(karar, ':', 1) <> 'OTOMATIK_ONAY' then
    -- Kuyrukta bekliyor; gerekçe yöneticiye neden elde kaldığını söylüyor.
    update public.company_claims set karar_gerekcesi = kod where id = new.id;
    return null;
  end if;

  -- reviewed_by NULL kalıyor: kararı SİSTEM verdi, bir yönetici değil.
  update public.company_claims
     set status = 'approved', reviewed_at = now(), reviewed_by = null,
         karar_gerekcesi = kod
   where id = new.id and status = 'pending';

  insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
  values (new.company_id, new.user_id, 'Owner', true)
  on conflict (company_id, user_id)
  do update set recruiter_role = 'Owner', is_owner = true;

  update public.companies
     set claimed_at = coalesce(claimed_at, now()),
         claimed_by = coalesce(claimed_by, new.user_id),
         hr_email   = coalesce(hr_email, new.work_email)
   where id = new.company_id;

  update public.profiles set role = 'company' where id = new.user_id;

  return null;
end;
$$;

drop trigger if exists company_claim_otomatik_degerlendir_trg on public.company_claims;
create trigger company_claim_otomatik_degerlendir_trg
  after insert on public.company_claims
  for each row execute function public.company_claim_otomatik_degerlendir();

-- Elle onayda da gerekçe yazılsın ki kuyruk tek biçimli okunsun.
create or replace function public.approve_company_claim(claim_id uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  talep public.company_claims;
begin
  if not public.is_admin() then
    raise exception 'yalnizca yonetici onaylayabilir';
  end if;

  select * into talep from public.company_claims where id = claim_id for update;
  if not found then
    raise exception 'talep bulunamadi';
  end if;
  if talep.status <> 'pending' then
    raise exception 'talep zaten sonuclanmis: %', talep.status;
  end if;

  update public.company_claims
     set status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         karar_gerekcesi = 'YONETICI_ONAYI'
   where id = claim_id;

  insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
  values (talep.company_id, talep.user_id, 'Owner', true)
  on conflict (company_id, user_id)
  do update set recruiter_role = 'Owner', is_owner = true;

  update public.companies
     set claimed_at = coalesce(claimed_at, now()),
         claimed_by = coalesce(claimed_by, talep.user_id)
   where id = talep.company_id;

  update public.profiles set role = 'company' where id = talep.user_id;
end;
$$;
