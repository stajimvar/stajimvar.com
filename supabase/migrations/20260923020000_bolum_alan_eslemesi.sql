-- SOSYAL KATMAN C AŞAMASI — ONAYLI BÖLÜM–ALAN EŞLEMESİ (ŞEMA)
--
-- Bu göç yalnız ŞEMAYI kuruyor; içerik ayrı bir göçte
-- (20260923025000_bolum_alan_seed.sql). Ayrılmalarının sebebi: şema bir
-- yetki kararı, içerik bir ürün kararı. İkisi tek dosyada olsaydı,
-- eşleme listesinde bir düzeltme yapmak için yetki tanımını da yeniden
-- gözden geçirmek gerekirdi.
--
-- BİR BÖLÜM = TAM OLARAK BİR ALAN
-- -------------------------------
-- `department_id` BİRİNCİL ANAHTAR. Bu bir kolaylık değil, kuralın
-- kendisi: alan sunucuda türetiliyor ve çok alanlı bir bölümde sunucu
-- hangisini seçeceğini bilemezdi. Kural 4'ün ("istemci alan gönderemez")
-- tek anlamlı olması buna bağlı.
--
-- Çoklu alan ürün kararıyla KAPALI. Bu yüzden şemada `birincil boolean`
-- gibi bir hazırlık kolonu da yok: kullanılmayan bir kolon, kapalı
-- olduğu söylenen kapının aralık durduğunu düşündürür. Gerekirse kendi
-- göçüyle ve kendi kararıyla gelir.
--
-- `on delete restrict`: bir alan, ona bağlı bölüm varken silinemiyor.
-- Cascade olsaydı bir alanın silinmesi sessizce bir grup öğrenciyi
-- eşlemesiz bırakır ve onları topluluktan düşürürdü.

create table if not exists public.department_sectors (
  department_id uuid primary key references public.departments(id) on delete cascade,
  sector_id     uuid not null references public.sectors(id) on delete restrict,
  /* Eşlemeyi kimin onayladığı; seed satırlarında NULL (ürün kararı). */
  onaylayan     uuid references public.profiles(id),
  onay_notu     text check (onay_notu is null or length(onay_notu) <= 500),
  created_at    timestamptz not null default now()
);

create index if not exists department_sectors_sector_idx
  on public.department_sectors (sector_id);

alter table public.department_sectors enable row level security;

/*
  OKUMA GİRİŞ YAPMIŞ KULLANICIYA AÇIK

  Kurulum ekranı "bölümünün alanı şu" diyebilmeli; ayrıca eşlemesi
  olmayan bölüm için dürüst ekranı çizebilmek de bu okumaya bağlı.
  Eşleme gizli bir bilgi değil — gizli olan, kullanıcının onu
  DEĞİŞTİREBİLMESİ olurdu.
*/
drop policy if exists "bolum alan eslemesi okunur" on public.department_sectors;
create policy "bolum alan eslemesi okunur" on public.department_sectors
  for select to authenticated using (true);

drop policy if exists "bolum alan eslemesini yonetici yazar" on public.department_sectors;
create policy "bolum alan eslemesini yonetici yazar" on public.department_sectors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.department_sectors to authenticated;
revoke all on public.department_sectors from anon;
