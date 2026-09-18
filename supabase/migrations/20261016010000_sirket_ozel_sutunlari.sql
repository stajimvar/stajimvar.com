-- ŞİRKETİN ÖZEL SÜTUNLARI HERKESE AÇIK DEĞİL
--
-- ÖLÇÜLDÜ (18 Eylül 2026, canlı, anon anahtarıyla):
--   GET /rest/v1/companies?select=name,hr_email → 200, e-posta geldi.
-- `companies` tablosunda SELECT politikası `true` ve sütun düzeyinde
-- anon + authenticated'a BÜTÜN sütunlar verilmiş: hr_email, vkn, mersis,
-- dogrulama_notu (yönetici notu), dogrulama_reddi_at, claimed_by,
-- created_by. Şirket sayfası herkese açık olmalı — ad, logo, sektör,
-- konum, site — ama İK e-postası, vergi numarası ve yönetici notu değil.
--
-- RLS SATIR BAZLI, SÜTUN DEĞİL
-- "Sahibi görsün, başkası görmesin" bir sütun için politikayla yazılamıyor.
-- Kapı sütun düzeyinde: özel sütunların SELECT yetkisi iki rolden geri
-- alınıyor; sahibi ve yönetici aynı bilgiyi tek RPC'den alıyor
-- (security definer, üyelik sorulur). Arayüzde bu sütunları yalnız
-- src/lib/sirket-veri.ts okuyordu (şirket sahibi adına); RPC'ye geçti.
--
-- UPDATE YETKİSİ DEĞİŞMİYOR
-- Sahibi hr_email/vkn'yi güncelleyebiliyor (`uye sirketi gunceller` +
-- sütun UPDATE yetkisi). SELECT'in geri alınması UPDATE'i etkilemiyor;
-- PostgREST'in `returning` istemesi durumunda özel sütunlar dönmez, o
-- yüzden güncelleme çağrısı seçmeden yapılmalı (sirket-veri.ts öyle).

/*
  TABLO DÜZEYİNDE GRANT VARDI, SÜTUN GERİ ALMA ETKİSİZ
  Ölçüldü: relacl = {anon=r, authenticated=ard}. Tablo yetkisi dururken
  `revoke select (sütun)` hiçbir şey değiştirmiyor (anon satırı okumaya
  devam etti). Doğru sıra: tablo SELECT'i kaldır, AÇIK sütunları tek tek
  ver. INSERT/UPDATE/DELETE yetkilerine dokunulmuyor.

  Açık sütun listesi arayüzün okuduğu her şeyi kapsıyor (toCompanyAccount,
  fetchCompanyBySlug, sirket-veri açık kimlik, ilan kartı gömme). `plan`
  bir kademe adı, gizli değil. Yeni bir açık sütun eklenirse bu listeye de
  eklenmeli — yoksa `select *` ve o sütunu isteyen sorgu "permission
  denied" alır.
*/
revoke select on public.companies from anon, authenticated;

grant select (
  id, name, slug, name_normalized, logo_url, cover_url, industry, size, location,
  description, website_url, rating, verified, plan, origin, claimed_at,
  created_at, updated_at
) on public.companies to anon, authenticated;

/*
  Şirketin kendi özel bilgileri: yalnız üye ya da yönetici. Üye değilse
  SIFIR satır — "yok" ile "göremezsin" ayrımı yapılmıyor, var-yok
  sızdırılmıyor.
*/
create or replace function public.sirket_ozel_bilgilerim(p_company uuid)
returns table (hr_email text, vkn text, mersis text, vkn_dogrulandi_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select c.hr_email, c.vkn, c.mersis, c.vkn_dogrulandi_at
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
