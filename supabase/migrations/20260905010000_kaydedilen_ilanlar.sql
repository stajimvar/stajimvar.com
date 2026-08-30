-- ÜRETİMDE VAR, DEPODA YOKTU
--
-- Şema temel denetimi (SUPABASE_DB_PASSWORD eklendikten sonra ilk kez
-- çalıştı) `public.saved_listings` tablosunu "yalnızca üretimde" diye
-- raporladı: tablo, üç kısıtı ve RLS'i üretimde duruyor ama depodaki
-- göçlerden sıfırdan kurulan veritabanında hiç oluşmuyor.
--
-- Nedeni: tablo `scripts/sql/kaydedilen-ilanlar.sql` ile Supabase SQL
-- Editor'den elle kurulmuş, göç dosyası hiç yazılmamış. Sonuç, sessiz
-- ama ciddi: tek kullanımlık güvenlik testleri ve her yeni ortam bu
-- tablosuz kuruluyor, oysa `src/lib/opportunities.ts` ondan okuyup ona
-- yazıyor. Yani depodan kurulan bir veritabanında "Kaydet" düğmesi
-- çalışmaz ve bunu hiçbir test yakalamaz.
--
-- Bu göç o boşluğu kapatıyor. Tamamı idempotent: üretimde hiçbir şeyi
-- değiştirmiyor, yalnızca sıfırdan kurulan veritabanlarında tabloyu
-- oluşturuyor.

create table if not exists public.saved_listings (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.saved_listings enable row level security;

-- Kayıt yalnızca sahibinindir: gören de ekleyen de silen de aynı kişi.
-- UPDATE politikası bilerek YOK — bir kaydın güncellenecek bir alanı
-- yok, silinip yeniden eklenir.
drop policy if exists "kullanici kendi ilan kaydini gorur" on public.saved_listings;
create policy "kullanici kendi ilan kaydini gorur"
  on public.saved_listings for select using (user_id = auth.uid());

drop policy if exists "kullanici kendi ilan kaydini ekler" on public.saved_listings;
create policy "kullanici kendi ilan kaydini ekler"
  on public.saved_listings for insert with check (user_id = auth.uid());

drop policy if exists "kullanici kendi ilan kaydini siler" on public.saved_listings;
create policy "kullanici kendi ilan kaydini siler"
  on public.saved_listings for delete using (user_id = auth.uid());

-- anon'a SELECT veriliyor çünkü tablo politikası zaten auth.uid()
-- istiyor; yetki olmadan giriş yapmamış kullanıcıda sorgu 401 ile
-- düşüyor ve arayüz "kaydedilmedi" yerine hata gösteriyor.
grant select on public.saved_listings to anon;
grant select, insert, delete on public.saved_listings to authenticated;

-- UPDATE hiçbir role verilmiyor. Üretimde authenticated'a verilmiş
-- olarak bulundu ve 20260830_uretim_depo_uzlastirma ile geri alındı;
-- burada bir daha verilmemesi için açıkça yazılıyor.
revoke update on public.saved_listings from authenticated;
