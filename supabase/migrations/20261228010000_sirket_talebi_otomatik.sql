/*
  YENİ ŞİRKET TALEPLERİ DE OTOMATİK DEĞERLENDİRİLİYOR (9 Kasım 2026, kullanıcı isteği)

  "Yeni şirket talepleri de otomatik değerlendirilsin; onaylanmayacak bir şey
  olursa yönetici onayına kalsın, neden onaylanmadığı yöneticiye bildirilsin."

  1. KARAR DOĞRULANMIŞ E-POSTAYLA (güvenlik düzeltmesi)
     Sahiplenmenin otomatik onayı (company_claim_otomatik_degerlendir)
     formdaki `work_email`e bakıyordu. O kutu kullanıcının yazdığı, hiç
     doğrulanmayan bir değer: herhangi bir hesap "ik@siemens.com" yazıp
     Siemens'in sahibi olabiliyordu. Karar artık HESABIN DOĞRULANMIŞ
     e-postasıyla (auth.users.email, email_confirmed_at dolu) veriliyor;
     formdaki adres yalnız iletişim bilgisi.

  2. YENİ ŞİRKET TALEBİNE AYNI KURAL
     sirket_dogrulama_karari(site, doğrulanmış e-posta): kurumsal alan adı
     şirketin web sitesiyle eşleşiyorsa talep kendiliğinden onaylanıyor
     (şirket açılır, kişi sahip olur, doğrulanmış sayılır — kullanıcı
     kararı "onay = doğrulama"). Aynı adlı şirket varsa, talep bir hesaba
     bağlı değilse ya da kural eşleşmezse yöneticiye kalıyor; GEREKÇE
     talebe (karar_gerekcesi) yazılıyor ve yöneticiye Türkçe bildiriliyor.

  3. SAHİPLENMEDE YÖNETİCİ BİLDİRİMİ GERÇEK DURUMA GÖRE
     20261226010000'deki bildirim eklenen satırın `pending` hâline
     bakıyordu; otomatik onaylanan talep için de "onay bekliyor" gidiyordu.
     Artık otomatik değerlendirmeden SONRAKİ durum okunuyor; onaylandıysa
     yöneticiye bildirim yok, kaldıysa gerekçesiyle.

  2b. TAKLİDE KARŞI İKİ KORUMA (güvenlik incelemesi, 9 Kasım 2026)
     Alan adı eşleşmesi yalnız "bu kişi bu alan adını yönetiyor" der; şirket
     adının o alan adına ait olduğunu söylemez. Biri siemens-kariyer.com
     alıp "Siemens Türkiye" adıyla talep verseydi şirket doğrulanmış açılırdı.
     Otomatik onaydan önce:
       · BENZER AD: var olan bir şirketin adına benziyorsa (trigram
         benzerliği >= 0.5 ya da biri ötekiyle başlıyorsa) → yöneticiye.
       · AD–ALAN ADI: alan adının ilk parçası şirket adının içinde değilse
         (ya da tersi) → yöneticiye (modmere.com ↔ "Modmere" geçer).

  4. EKİP ROLÜ (hata düzeltmesi)
     approve_sirket_talebi kişinin yazdığı unvanı ("Şirket Sahibi")
     recruiter_role'e yazıyordu; sirket_rolum tanımadığı değeri en dar
     yetkiye bağlıyor (yalnız Owner/Recruiter başvuruya yazabiliyor).
     Onaylanan kişi artık 'Owner'. Geriye dönük: onaylı yeni şirket
     taleplerinin sahipleri (bugün yalnız Modmere) 'Owner' yapılıyor.

  GERİ ALMA
    drop trigger if exists sirket_talebi_otomatik_degerlendir_trg on public.sirket_talepleri;
    -- 20261226010000'deki yonetici_talep_bildirimi tetikleyicisini yeniden kur
    -- 20261225010000'deki approve_sirket_talebi'yi yeniden uygula
    -- company_claim_otomatik_degerlendir'in önceki tanımını yeniden uygula
    drop function if exists public.sirket_talebi_otomatik_degerlendir();
    drop function if exists public.sirket_talebini_uygula(uuid, text);
    drop function if exists public.sirket_otomatik_karar(uuid, text);
    drop function if exists public.otomatik_karar_metni(text);
*/

-- 0) Yardımcılar ------------------------------------------------------------

/* Hesabın DOĞRULANMIŞ e-postasıyla karar. Doğrulanmamışsa elle. */
create or replace function public.sirket_otomatik_karar(p_user uuid, p_site text)
returns text language plpgsql stable security definer set search_path to 'public'
as $$
declare
  e text;
begin
  if p_user is null then
    return 'ELLE_INCELE:HESAP_YOK';
  end if;
  select u.email into e from auth.users u
   where u.id = p_user and u.email_confirmed_at is not null;
  if e is null then
    return 'ELLE_INCELE:EPOSTA_DOGRULANMAMIS';
  end if;
  return public.sirket_dogrulama_karari(p_site, e);
end;
$$;

/* Yöneticinin okuyacağı gerekçe. Kod listesi sirket_dogrulama_karari ile aynı. */
create or replace function public.otomatik_karar_metni(p_kod text)
returns text language sql immutable set search_path to 'public'
as $$
  select case p_kod
    when 'HESAP_YOK' then 'talep bir hesaba bağlı değil'
    when 'EPOSTA_DOGRULANMAMIS' then 'hesabın e-postası doğrulanmamış'
    when 'EPOSTA_OKUNAMADI' then 'hesabın e-posta adresi okunamadı'
    when 'TEST_ALAN_ADI' then 'test ya da örnek alan adı'
    when 'TEK_KULLANIMLIK_EPOSTA' then 'tek kullanımlık e-posta adresi'
    when 'KURUMSAL_EPOSTA_DEGIL' then 'hesap e-postası kurumsal değil (Gmail, Hotmail vb.)'
    when 'SIRKET_SITESI_YOK' then 'şirketin web sitesi yok ya da okunamadı'
    when 'ALAN_ADI_SITEYLE_ESLESMIYOR' then 'hesap e-postasının alan adı şirketin web sitesiyle eşleşmiyor'
    when 'AYNI_ADLI_SIRKET_VAR' then 'bu adla bir şirket zaten var; sahiplenme talebi olmalı'
    when 'BENZER_ADLI_SIRKET_VAR' then 'adı var olan bir şirkete benziyor; taklit olmadığını kontrol et'
    when 'ALAN_ADI_SIRKET_ADIYLA_ESLESMIYOR' then 'web sitesinin alan adı şirket adıyla uyuşmuyor'
    else coalesce(p_kod, 'bilinmiyor')
  end;
$$;

/* Karşılaştırma için ad: küçük harf, Türkçe harf katlanmış, yalnız harf/rakam. */
create or replace function public.ad_katla(p text)
returns text language sql immutable set search_path to 'public'
as $$
  select regexp_replace(lower(translate(coalesce(p, ''), 'ıİIşŞğĞüÜöÖçÇâîû', 'iiissgguuooccaiu')), '[^a-z0-9]', '', 'g');
$$;

-- 1) Yeni şirket talebini uygulayan iç işlev + yönetici onayı -----------------

create or replace function public.sirket_talebini_uygula(talep_id uuid, gerekce text)
returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare
  t public.sirket_talepleri;
  yeni_id uuid;
  kok text;
begin
  select * into t from public.sirket_talepleri where id = talep_id for update;
  if not found then
    raise exception 'talep bulunamadi';
  end if;
  if t.durum not in ('yeni', 'inceleniyor') then
    raise exception 'talep zaten sonuclanmis: %', t.durum;
  end if;
  if t.user_id is null then
    raise exception 'talep bir hesaba bagli degil; sahip atanamaz';
  end if;
  if exists (
    select 1 from public.companies c
     where c.name_normalized = lower(regexp_replace(t.sirket_adi, '[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+', '', 'g'))
  ) then
    raise exception 'bu adla bir sirket zaten var; var olan sirketi sahiplenme talebiyle ilerleyin';
  end if;

  kok := trim(both '-' from regexp_replace(
    lower(translate(t.sirket_adi, 'ıİşŞğĞüÜöÖçÇ', 'iissgguuoocc')), '[^a-z0-9]+', '-', 'g'));
  if kok = '' then kok := 'sirket'; end if;

  insert into public.companies (
    name, slug, website_url, industry, size, location, description, logo_url, vkn,
    origin, verified, created_by, claimed_at, claimed_by
  ) values (
    t.sirket_adi,
    left(kok, 40) || '-' || substr(md5(t.id::text), 1, 6),
    nullif(trim(t.web_sitesi), ''),
    nullif(trim(t.sektor), ''),
    nullif(trim(t.calisan_sayisi), ''),
    nullif(trim(t.sehir), ''),
    nullif(trim(t.tanitim), ''),
    nullif(trim(t.logo_url), ''),
    nullif(trim(t.vkn), ''),
    'manual', true, t.user_id, now(), t.user_id
  )
  returning id into yeni_id;

  insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
  values (yeni_id, t.user_id, 'Owner', true)
  on conflict (company_id, user_id) do update set is_owner = true, recruiter_role = 'Owner';

  update public.profiles set role = 'company' where id = t.user_id;

  update public.sirket_talepleri
     set durum = 'onaylandi', sirket_id = yeni_id, karar_gerekcesi = gerekce
   where id = talep_id;

  return yeni_id;
end;
$$;

create or replace function public.approve_sirket_talebi(talep_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'yalnizca yonetici onaylayabilir';
  end if;
  return public.sirket_talebini_uygula(talep_id, 'YONETICI_ONAYI');
end;
$$;

-- 2) Yeni şirket talebi: otomatik değerlendirme ------------------------------

create or replace function public.sirket_talebi_otomatik_degerlendir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  karar text;
  kod text;
  yeni_ad text := public.ad_katla(new.sirket_adi);
  etiket text;
begin
  if new.durum is distinct from 'yeni' then
    return null;
  end if;

  if exists (
    select 1 from public.companies c
     where c.name_normalized = lower(regexp_replace(new.sirket_adi, '[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+', '', 'g'))
  ) then
    karar := 'ELLE_INCELE:AYNI_ADLI_SIRKET_VAR';
  elsif exists (
    select 1 from public.companies c
     where length(public.ad_katla(c.name)) >= 4
       and length(yeni_ad) >= 4
       and (extensions.similarity(public.ad_katla(c.name), yeni_ad) >= 0.5
            or yeni_ad like public.ad_katla(c.name) || '%'
            or public.ad_katla(c.name) like yeni_ad || '%')
  ) then
    karar := 'ELLE_INCELE:BENZER_ADLI_SIRKET_VAR';
  else
    karar := public.sirket_otomatik_karar(new.user_id, new.web_sitesi);
    if split_part(karar, ':', 1) = 'OTOMATIK_ONAY' then
      etiket := public.ad_katla(split_part(public.kayitli_alan_adi(public.site_alan_adi(new.web_sitesi)), '.', 1));
      if length(etiket) < 3 or length(yeni_ad) < 3
         or not (position(etiket in yeni_ad) > 0 or position(yeni_ad in etiket) > 0) then
        karar := 'ELLE_INCELE:ALAN_ADI_SIRKET_ADIYLA_ESLESMIYOR';
      end if;
    end if;
  end if;
  kod := split_part(karar, ':', 2);

  if split_part(karar, ':', 1) = 'OTOMATIK_ONAY' then
    begin
      perform public.sirket_talebini_uygula(new.id, 'OTOMATIK:' || kod);
      return null;
    exception when others then
      /* Uygulanamadıysa (ör. eşzamanlı aynı ad) yöneticiye kalıyor. */
      kod := 'OTOMATIK_UYGULANAMADI';
    end;
  end if;

  update public.sirket_talepleri set karar_gerekcesi = kod where id = new.id;
  perform public.yoneticilere_bildir(
    'yonetici_sirket_talebi',
    'Yeni şirket talebi onayını bekliyor',
    coalesce(nullif(trim(new.sirket_adi), ''), 'Bir şirket')
      || ' otomatik onaylanmadı: '
      || case when kod = 'OTOMATIK_UYGULANAMADI' then 'otomatik onay uygulanırken hata oluştu'
              else public.otomatik_karar_metni(kod) end || '.',
    '/yonetim/onay',
    'yonetici-sirket-talebi:' || new.id::text);
  return null;
end;
$$;

/* 20261226010000'deki "her talepte bildirim" tetikleyicisinin yerini alıyor. */
drop trigger if exists yonetici_talep_bildirimi on public.sirket_talepleri;
drop trigger if exists sirket_talebi_otomatik_degerlendir_trg on public.sirket_talepleri;
create trigger sirket_talebi_otomatik_degerlendir_trg
  after insert on public.sirket_talepleri
  for each row execute function public.sirket_talebi_otomatik_degerlendir();

-- 3) Sahiplenme: doğrulanmış e-postayla karar; onayda doğrulama ---------------

create or replace function public.company_claim_otomatik_degerlendir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  site  text;
  karar text;
  kod   text;
begin
  if new.status is distinct from 'pending' then
    return null;
  end if;

  select website_url into site from public.companies where id = new.company_id;

  karar := public.sirket_otomatik_karar(new.user_id, site);
  kod := split_part(karar, ':', 2);

  if split_part(karar, ':', 1) <> 'OTOMATIK_ONAY' then
    -- Kuyrukta bekliyor; gerekce yoneticiye neden elde kaldigini soyluyor.
    update public.company_claims set karar_gerekcesi = kod where id = new.id;
    return null;
  end if;

  -- reviewed_by NULL kaliyor: karari SISTEM verdi, bir yonetici degil.
  update public.company_claims
     set status = 'approved', reviewed_at = now(), reviewed_by = null,
         karar_gerekcesi = kod
   where id = new.id and status = 'pending';

  insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
  values (new.company_id, new.user_id, 'Owner', true)
  on conflict (company_id, user_id)
  do update set recruiter_role = 'Owner', is_owner = true;

  -- Onay = dogrulama (kullanici karari, 20261225010000).
  update public.companies
     set claimed_at = coalesce(claimed_at, now()),
         claimed_by = coalesce(claimed_by, new.user_id),
         hr_email   = coalesce(hr_email, new.work_email),
         verified   = true,
         dogrulama_notu = null,
         dogrulama_reddi_at = null
   where id = new.company_id;

  update public.profiles set role = 'company' where id = new.user_id;

  return null;
end;
$$;

create or replace function public.yonetici_sahiplenme_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  ad text;
  durum text;
  kod text;
begin
  /* Otomatik değerlendirme (company_claim_otomatik_degerlendir_trg, ada göre
     önce çalışıyor) sonrasındaki GERÇEK durum. */
  select c.status, c.karar_gerekcesi into durum, kod from public.company_claims c where c.id = new.id;
  if durum is distinct from 'pending' then
    return new;
  end if;
  select co.name into ad from public.companies co where co.id = new.company_id;
  perform public.yoneticilere_bildir(
    'yonetici_sahiplenme',
    'Sahiplenme talebi onayını bekliyor',
    coalesce(nullif(trim(ad), ''), 'Bir şirket') || ' için sahiplenme otomatik onaylanmadı: '
      || public.otomatik_karar_metni(kod) || '.',
    '/yonetim/onay',
    'yonetici-sahiplenme:' || new.id::text);
  return new;
end;
$$;

-- 4) Ekip rolü: geriye dönük ----------------------------------------------------

update public.company_members m
   set recruiter_role = 'Owner'
 where m.is_owner
   and coalesce(btrim(m.recruiter_role), '') not in ('Owner', 'Recruiter', 'Viewer')
   and m.company_id in (select sirket_id from public.sirket_talepleri where durum = 'onaylandi' and sirket_id is not null);

-- Yetkiler ------------------------------------------------------------------------

revoke all on function public.sirket_otomatik_karar(uuid, text) from public, anon, authenticated;
revoke all on function public.ad_katla(text) from public, anon, authenticated;
revoke all on function public.sirket_talebini_uygula(uuid, text) from public, anon, authenticated;
revoke all on function public.sirket_talebi_otomatik_degerlendir() from public, anon, authenticated;
revoke all on function public.approve_sirket_talebi(uuid) from public, anon;
grant execute on function public.approve_sirket_talebi(uuid) to authenticated;
