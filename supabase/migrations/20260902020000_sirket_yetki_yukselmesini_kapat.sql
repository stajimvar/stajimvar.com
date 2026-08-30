-- İKİ YETKİ YÜKSELME AÇIĞI (ölçüldü, kapatıldı)
--
-- 1) company_members INSERT politikası "user_id = auth.uid()" diyordu:
--    HERKES kendini İSTEDİĞİ şirkete Owner yazabiliyordu. Panel açılıyor,
--    o şirket adına ilan açılabiliyor ve halka açık şirket profili
--    düzenlenebiliyordu. Kendi adına satır eklemek bir yetki değil, bir
--    yetki TALEBİDİR; talep company_claims üzerinden gidiyor ve onayı
--    security definer fonksiyonlar veriyor (onlar RLS'i zaten aşıyor).
--
-- 2) companies UPDATE izni TÜM sütunları kapsıyordu: bir üye kendi
--    şirketinde verified = true yapabiliyordu. Doğrulama aday kartlarını
--    açıyor, yani bu doğrudan öğrenci kişisel verisine giden bir yoldu.
--    "İlan vermek ≠ öğrenci görmek" kuralının delindiği yer tam burasıydı.

-- ------------------------------------------------------------------ (1)

drop policy if exists "sahip uye ekler" on public.company_members;
drop policy if exists "yalnizca sahip uye ekler" on public.company_members;

/*
  İki meşru yol var, üçüncüsü yok:

    a. Şirketi YENİ OLUŞTURAN kişi onun ilk sahibi olabilir. Şirketin
       henüz hiç üyesi olmaması şart — bu koşul olmasaydı sahiplenilmiş
       bir şirkete created_by üzerinden yapışılabilirdi. (created_by zaten
       güncellenemiyor; iki koruma birbirini yedekliyor.)
    b. Mevcut bir SAHİP başkasını ekleyebilir.
*/
create policy "kurucu ya da sahip uye ekler"
  on public.company_members for insert
  with check (
    (
      user_id = auth.uid()
      and exists (
        select 1 from public.companies c
        where c.id = company_members.company_id
          and c.created_by = auth.uid()
      )
      and not exists (
        select 1 from public.company_members m2
        where m2.company_id = company_members.company_id
      )
    )
    or exists (
      select 1 from public.company_members m
      where m.company_id = company_members.company_id
        and m.user_id = auth.uid()
        and m.is_owner
    )
  );

-- ------------------------------------------------------------------ (2)

revoke update on public.companies from authenticated;

/*
  Yalnızca şirket profil formunun düzenlediği alanlar.

  verified, vkn_dogrulandi_at, claimed_at, claimed_by, origin, slug, plan,
  rating ve id BİLEREK dışarıda: bunları yalnızca yönetici fonksiyonları ve
  tetikleyiciler değiştirebiliyor.

  vkn ve mersis listede: onları kaydetmek doğrulama DEĞİL, doğrulama
  başvurusu. Onayı `sirket_dogrula` veriyor ve o yönetici istiyor.
*/
grant update (
  name, logo_url, industry, size, location, description,
  website_url, hr_email, vkn, mersis, updated_at
) on public.companies to authenticated;
