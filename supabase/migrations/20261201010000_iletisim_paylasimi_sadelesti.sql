-- İLETİŞİM PAYLAŞIMI: TEKLİF KABULÜ ŞARTI KALKIYOR
--
-- YENİ AKIŞ
-- --------
-- Şirket ilan açar → öğrenci CV'siyle başvurur → doğrulanmış ilan
-- sahibi şirketin yetkili üyesi adayın profilini, CV'sini ve
-- paylaşmasına onay verdiği telefon/e-postasını görür → devamını
-- şirket kendisi yürütür. Görüşme, değerlendirme aşaması ve teklif
-- temel akıştan çıkıyor, dolayısıyla `offer_accepted` bir kapı olarak
-- kullanılamaz: kimse o duruma gelmeyecek.
--
-- RIZANIN KAPSAMI OKUNDU, VARSAYILMADI
-- ------------------------------------
-- Öğrencinin başvururken onayladığı metin (ApplyDialog):
--
--   "Profilimin ve İLETİŞİM BİLGİLERİMİN, yalnızca doğrulanmış
--    başvuru kanalı üzerinden {şirket} ile paylaşılmasına izin
--    veriyorum."
--
-- Bu cümle teklif kabulünden SÖZ ETMİYOR. `offer_accepted` şartı
-- rızanın sınırı değildi; ürünün koyduğu ek bir kısıttı. Dolayısıyla
-- şartı kaldırmak öğrenciye yeni bir şey sormuyor — zaten verdiği
-- izni, verildiği kapsamda kullanıyor.
--
-- AMA ESKİ DIŞ BAŞVURULARA YENİ ONAY VARSAYILMIYOR
-- ------------------------------------------------
-- Üretimde ölçüldü (5 Ekim 2026, 8 başvuru):
--
--   (sürüm yok) · rıza YOK  · external   2
--   2026-08-v1  · rıza var  · external   2
--   2026-08-v1  · rıza var  · internal   2
--   2026-09-v2  · rıza var  · internal   2
--
-- `external` ilanlarda öğrenci başvurusunu ŞİRKETİN KENDİ sitesinde
-- tamamlıyor; StajımVar panelinde iletişiminin görünmesi onun
-- beklediği şey olmayabilir. Bu yüzden eski `external` rızaları bu
-- kapıdan geçmiyor. O öğrencilere paylaşımı AÇMA SEÇENEĞİ sunuluyor
-- (aşağıdaki `ogrenci_paylasimi_ac`), kendiliğinden açılmıyor.
--
-- KİM GÖRÜR
-- ---------
-- Yalnız İLANIN SAHİBİ, DOĞRULANMIŞ şirketin YAZABİLEN üyesi
-- (Owner/Recruiter). `sirket_basvuru_yazabilir` ikisini birden
-- soruyor (20261129010000). VIEWER İLETİŞİMİ GÖRMÜYOR: profili ve
-- CV'yi okuyor, telefon/e-posta en hassas veri ve okuma yetkisi
-- orada bitiyor.
--
-- HERKESE AÇIK PROFİLE ÇIKMIYOR: bu veri yalnız bu RPC'den ve yalnız
-- o başvurunun ilanının şirketine dönüyor. `profiles` satırı hâlâ
-- yalnız sahibine açık; başka şirket bu RPC'den boş alıyor.

/* ================================================================== */
/*  1) SADE AKIŞIN RIZA SÜRÜMÜ                                         */
/* ================================================================== */
--
-- Eski `internal` rızalar yöntemleriyle, yeni rızalar SÜRÜMLERİYLE
-- geçiyor. İki ölçüt tek yerde tanımlı ki kapı ile istemci aynı şeyi
-- söylesin.
create or replace function public.paylasim_surumu()
returns text
language sql immutable
as $$ select '2026-10-sade-v1'::text $$;

comment on function public.paylasim_surumu() is
  'Sade başvuru akışında alınan iletişim paylaşımı onayının sürümü. Bu sürümle verilen onay, başvuru yöntemi ne olursa olsun geçerli.';

/* ================================================================== */
/*  2) PAYLAŞIM KAPISI — TEK TANIM                                     */
/* ================================================================== */
--
-- Üç ayrı yerde (RPC, öğrenci ekranı, şirket ekranı) aynı soru
-- soruluyor; üç kez yazılsaydı biri değişip ötekiler geride kalırdı.
create or replace function public.basvuru_iletisimi_acik(p_basvuru uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from public.applications a
     where a.id = p_basvuru
       and a.contact_share_consent_at is not null
       and (
         /* StajımVar üzerinden alınan başvuru: rıza bu akışı kapsıyor. */
         a.application_method = 'internal'
         /* Ya da öğrenci sade akışta paylaşımı AÇIKÇA açmış. */
         or a.contact_share_consent_version = public.paylasim_surumu()
       )
  )
$$;

revoke all on function public.basvuru_iletisimi_acik(uuid) from public, anon;
grant execute on function public.basvuru_iletisimi_acik(uuid) to authenticated;

/* ================================================================== */
/*  3) İLETİŞİM RPC'Sİ                                                 */
/* ================================================================== */
--
-- ÖĞRENCİ TARAFI DEĞİŞMİYOR. Öğrenciye şirket yetkilisini gösteren
-- dal hâlâ `offer_accepted` istiyor: teklif temel akıştan çıkıyor ama
-- GEÇMİŞTE kabul edilmiş teklifler duruyor ve o öğrencilerin gördüğü
-- bilgi kaybolmamalı. Geçmişi bugünün kurallarıyla yeniden yazmak,
-- olmuş bir şeyi olmamış göstermek olurdu.
create or replace function public.basvuru_iletisimi(p_basvuru uuid)
returns table (taraf text, ad text, eposta text, telefon text, unvan text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ogrenci uuid;
  v_sirket  uuid;
  v_durum   application_status;
  v_riza    timestamptz;
begin
  select a.student_id, l.company_id, a.status, a.contact_share_consent_at
    into v_ogrenci, v_sirket, v_durum, v_riza
    from public.applications a
    join public.listings l on l.id = a.listing_id
   where a.id = p_basvuru;

  if not found then
    return;
  end if;

  if v_ogrenci = auth.uid() then
    /*
      ÖĞRENCİYE ŞİRKET YETKİLİSİ — eski kural aynen duruyor
      (teklif kabul edilmiş ve rıza verilmiş olmalı).
    */
    if v_durum <> 'offer_accepted' or v_riza is null then
      return;
    end if;
    return query
      select 'sirket'::text,
             p.full_name,
             p.email,
             p.phone,
             coalesce(nullif(m.recruiter_role, ''), 'Yetkili')
        from public.company_members m
        join public.profiles p on p.id = m.user_id
       where m.company_id = v_sirket
       order by m.is_owner desc, m.created_at asc
       limit 1;

  elsif public.sirket_basvuru_yazabilir(v_sirket)
        and public.basvuru_iletisimi_acik(p_basvuru) then
    /*
      ŞİRKETE ÖĞRENCİ. Teklif kabulü ARTIK SORULMUYOR; sorulan şey
      doğrulanmış şirket + yazabilen üye + öğrencinin bu akışı kapsayan
      onayı. Telefon yalnız öğrenci yazdıysa geliyor; boşsa boş
      kalıyor — uydurulmuyor.
    */
    return query
      select 'ogrenci'::text,
             p.full_name,
             p.email,
             p.phone,
             'Aday'::text
        from public.profiles p
       where p.id = v_ogrenci;
  end if;

  return;
end;
$$;

revoke all on function public.basvuru_iletisimi(uuid) from public, anon;
grant execute on function public.basvuru_iletisimi(uuid) to authenticated;

comment on function public.basvuru_iletisimi(uuid) is
  'Başvurunun iletişim satırı. Şirkete: doğrulanmış şirketin Owner/Recruiter üyesine, öğrencinin bu akışı kapsayan onayı varsa (teklif kabulü ARANMIYOR). Öğrenciye: eski kural (kabul edilmiş teklif) korunuyor. Viewer bu veriyi almıyor.';

/* ================================================================== */
/*  4) ÖĞRENCİ PAYLAŞIMI SONRADAN AÇABİLİYOR                           */
/* ================================================================== */
--
-- Onayı olmayan ya da kapsamı yetmeyen (eski `external`) başvurular
-- için. Öğrenci kendi başvurusunda, kendi kararıyla açıyor; şirket
-- bunu tetikleyemiyor.
--
-- KAPATMA DA VAR: verilen izin geri alınabilmeli, yoksa "izin" tek
-- yönlü bir kapı olurdu.
create or replace function public.ogrenci_paylasimi_ac(
  p_basvuru uuid,
  p_acik boolean default true
)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_ogrenci uuid;
  v_an timestamptz;
begin
  select a.student_id into v_ogrenci
    from public.applications a where a.id = p_basvuru;

  if v_ogrenci is null then
    raise exception 'basvuru-yok' using errcode = 'P0001';
  end if;

  /* YALNIZ ÖĞRENCİNİN KENDİSİ. Şirket bu izni veremez. */
  if v_ogrenci is distinct from auth.uid() then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;

  if p_acik then
    update public.applications
       set contact_share_consent_at = now(),
           contact_share_consent_version = public.paylasim_surumu()
     where id = p_basvuru
    returning contact_share_consent_at into v_an;
  else
    update public.applications
       set contact_share_consent_at = null,
           contact_share_consent_version = null
     where id = p_basvuru
    returning contact_share_consent_at into v_an;
  end if;

  return v_an;
end;
$$;

revoke all on function public.ogrenci_paylasimi_ac(uuid, boolean) from public, anon;
grant execute on function public.ogrenci_paylasimi_ac(uuid, boolean) to authenticated;

comment on function public.ogrenci_paylasimi_ac(uuid, boolean) is
  'Öğrenci kendi başvurusunda iletişim paylaşımını açar ya da kapatır. Yalnız başvuru sahibi çağırabilir.';
