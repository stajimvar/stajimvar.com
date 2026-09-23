-- ŞİRKET DOĞRULAMA KUYRUĞU: VKN GİRİLDİ AMA KİMSEYE DÜŞMÜYORDU
--
-- ÖLÇÜLDÜ (23 Eylül 2026): şirket profilindeki doğrulama kutusu VKN'yi
-- alıp `companies.vkn` sütununa yazıyor (sirket-veri.ts → vknKaydet) ve
-- kullanıcıya "bir insan kontrol ediyor, genellikle bir iş günü sürüyor"
-- diyor. O insana hiçbir yerde iş DÜŞMÜYOR:
--
--   - `sirket_dogrula(uuid)` ve `sirket_dogrulamayi_reddet(uuid, text)`
--     20260830040000'de yazılmış ve duruyor, ama arayüzde ikisini de
--     çağıran tek bir satır yok (tüm src tarandı).
--   - Yönetici onay kuyruğu (`yonetim_onay_kuyrugu`) üç şey dönüyor:
--     ilan, sahiplenme, bölüm. Doğrulama bekleyen şirket yok.
--   - Sahiplenme onayı bilerek `verified`a dokunmuyor (20260830040000):
--     "bu kişi burada çalışıyor" ile "bu şirket doğrulanmıştır" ayrı
--     kararlar. Yani sahiplenmeyi onaylamak da doğrulamıyordu.
--
-- Sonuç: VKN yazan şirket süresiz bekliyor. Kuyruk bu deliği kapatıyor.
--
-- REDDEDİLEN GERİ GELİYOR, AMA KENDİLİĞİNDEN DEĞİL
-- Reddedilmiş kayıt kuyrukta kalsaydı liste hiç boşalmazdı. Şirket
-- bilgisini güncellerse (`updated_at` reddin üstüne çıkar) yeniden
-- kuyruğa giriyor — yani "düzelttim, tekrar bak" demenin yolu var.

create or replace function public.yonetim_onay_kuyrugu()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
begin
  if not public.is_admin() then
    raise exception 'yonetim_onay_kuyrugu yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'ilanlar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',        l.id,
               'baslik',    l.title,
               'sirket',    c.name,
               'sehir',     l.city,
               'ulke',      l.country_code,
               'kaynak',    l.origin::text,
               'calisma',   l.work_type::text,
               'basvuruYolu', l.application_method::text,
               'adres',     l.apply_url,
               'sonBasvuru', l.application_deadline,
               'kaynakDurumu', l.source_status,
               'aciklamaUzunluk', length(coalesce(l.description, '')),
               'olustu',    l.created_at,
               'guncellendi', l.updated_at
             ) order by l.created_at desc), '[]'::jsonb)
      from listings l
      left join companies c on c.id = l.company_id
      where l.status = 'draft'
    ),

    'sahiplenmeler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',       k.id,
               'sirket',   c.name,
               'kisi',     k.contact_name,
               'unvan',    k.contact_title,
               'eposta',   k.work_email,
               'not',      k.note,
               'olustu',   k.created_at
             ) order by k.created_at desc), '[]'::jsonb)
      from company_claims k
      left join companies c on c.id = k.company_id
      where k.status = 'pending'
    ),

    'bolumler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',       b.id,
               'istenen',  b.requested_department,
               'universite', b.universite,
               'aciklama', b.aciklama,
               'olustu',   b.created_at
             ) order by b.created_at desc), '[]'::jsonb)
      from department_requests b
      where b.status = 'pending'
    ),

    -- DOĞRULAMA: VKN'si olan ama henüz doğrulanmamış şirketler.
    --
    -- Karar bir insan kararı ve ekranda verilebilmesi için VKN'nin
    -- kendisi, ticari kimliği kontrol edilecek site ve İK e-postası
    -- gerekiyor. Bu sütunlar anon/authenticated'dan geri alınmıştı
    -- (20261016010000); burada security definer olarak ve yalnız
    -- yöneticiye dönüyor.
    'dogrulamalar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',        c.id,
               'sirket',    c.name,
               'slug',      c.slug,
               'site',      c.website_url,
               'ikEposta',  c.hr_email,
               'vkn',       c.vkn,
               'mersis',    c.mersis,
               'uyeSayisi', (select count(*) from company_members m where m.company_id = c.id),
               'sahiplenildi', c.claimed_at,
               'redNotu',   c.dogrulama_notu,
               'redTarihi', c.dogrulama_reddi_at,
               'guncellendi', c.updated_at
             ) order by c.updated_at desc), '[]'::jsonb)
      from companies c
      where c.vkn is not null
        and coalesce(c.verified, false) = false
        and (c.dogrulama_reddi_at is null or c.updated_at > c.dogrulama_reddi_at)
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_onay_kuyrugu() from public, anon;
grant execute on function public.yonetim_onay_kuyrugu() to authenticated;

-- Şirket kendi durumunu görebilsin: red notu ve tarihi de dönüyor.
-- Bunlar olmadan reddedilen şirket ekranda "inceleniyor" görüyordu.
drop function if exists public.sirket_ozel_bilgilerim(uuid);

create function public.sirket_ozel_bilgilerim(p_company uuid)
returns table (
  hr_email text,
  vkn text,
  mersis text,
  vkn_dogrulandi_at timestamptz,
  dogrulama_notu text,
  dogrulama_reddi_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select c.hr_email, c.vkn, c.mersis, c.vkn_dogrulandi_at,
         c.dogrulama_notu, c.dogrulama_reddi_at
    from public.companies c
   where c.id = p_company
     and (
       public.is_admin()
       or exists (
         select 1 from public.company_members cm
          where cm.company_id = c.id and cm.user_id = auth.uid()
       )
     )
$$;

revoke all on function public.sirket_ozel_bilgilerim(uuid) from public;
grant execute on function public.sirket_ozel_bilgilerim(uuid) to authenticated;
