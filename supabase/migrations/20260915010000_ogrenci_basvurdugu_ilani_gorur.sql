-- ÖĞRENCİ BAŞVURDUĞU İLANI ARŞİVDEN SONRA DA GÖRÜR
--
-- ÖLÇÜM (üretim, 31 Ağustos 2026)
-- ------------------------------
-- `listings` okuma politikası iki şey diyordu: "yayındaki ilanlar
-- herkese açık" ve "şirket kendi ilanlarını yönetir". Öğrencinin
-- BAŞVURDUĞU ilanı okuması için ayrı bir kural yoktu — çünkü başvurduğu
-- ilan zaten yayındaydı.
--
-- Sprint 1 temizliğinde iki iç test ilanı `archived` yapıldı ve sonuç
-- hemen görüldü: o ilanlara başvurmuş öğrenci kendi başvuru kaydını
-- görüyor ama İLANI okuyamıyor. Ekran ilan başlığını ve şirket adını
-- yayındaki ilanlar listesinden eşleştirdiği için (App.tsx ·
-- allListings) kart kimliğini kaybediyordu: pozisyon adı yerine "Staj
-- Başvurusu", şirket adı yerine "Şirket".
--
-- Kabul edilmiş bir teklifin hangi pozisyon için olduğunu öğrencinin
-- görememesi kabul edilemez.
--
-- NEDEN DOĞRUDAN ALT SORGU DEĞİL
-- ------------------------------
-- İlk deneme politikayı doğrudan `applications` üzerinde bir `exists`
-- ile yazdı ve üretimde ÖZYİNELEME üretti (42P17): `listings`
-- politikası `applications`'a bakıyor, `applications`'ın şirket okuma
-- politikası da `listings`'e bakıyor. Sonuç: hiçbir ilan okunamıyor,
-- ana sayfa dahil. Hata ölçümde yakalandı ve politika saniyeler içinde
-- düşürüldü.
--
-- `security definer` yardımcı bu döngüyü kırıyor: işlev `applications`
-- tablosunu sahibi olarak okuyor, dolayısıyla o tablonun politikaları
-- yeniden değerlendirilmiyor. Projede aynı kalıp zaten var
-- (`is_company_member`, `sirket_dogrulandi`).
--
-- KAPSAM DAR
-- ----------
-- Yalnızca öğrencinin KENDİ başvurusu olan ilan. Başka bir arşivlenmiş
-- ilanı, taslağı ya da bir başkasının başvurduğu ilanı açmıyor. Kolon
-- yetkileri değişmiyor.
create or replace function public.ogrenci_basvurdu_mu(hedef uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.applications a
    where a.listing_id = hedef
      and a.student_id = auth.uid()
  );
$$;

revoke all on function public.ogrenci_basvurdu_mu(uuid) from public, anon;
grant execute on function public.ogrenci_basvurdu_mu(uuid) to authenticated;

drop policy if exists "ogrenci basvurdugu ilani gorur" on public.listings;
create policy "ogrenci basvurdugu ilani gorur" on public.listings
  for select using (public.ogrenci_basvurdu_mu(id));
