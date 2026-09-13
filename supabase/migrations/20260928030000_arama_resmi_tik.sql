-- ARAMA SONUCU DA RESMÎ İŞARETİ TAŞISIN
--
-- Mavi tik profil sayfasında, akış kartında, bağlantı listesinde ve
-- keşif bloğunda çiziliyor; hepsi `social_profiles`i doğrudan okuduğu
-- için `resmi_mi` oralara tek satır değişiklikle girdi.
--
-- ARAMA FARKLI: sonuçlar `sosyal_kullanici_ara` RPC'sinden geliyor ve
-- o fonksiyonun dönüş tipi SABİT bir kolon listesi. `resmi_mi`
-- eklenmeden arama sonucunda tik çizilemiyordu — yani "stajimvar" diye
-- arayan kullanıcı, aradığı hesabı tikssiz görüyordu. Doğrulama
-- göstergesinin bir ekranda olup ötekinde olmaması, göstergenin
-- kendisini şüpheli hâle getirir.
--
-- Dönüş tipi değiştiği için önce DROP gerekiyor: Postgres `create or
-- replace` ile `returns table` şeklini değiştirmiyor.

drop function if exists public.sosyal_kullanici_ara(text);

create or replace function public.sosyal_kullanici_ara(p_sorgu text)
returns table (
  username       text,
  gorunen_ad     text,
  avatar_path    text,
  bolum_etiketi  text,
  sehir          text,
  resmi_mi       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with sorgu as (
    select sosyal_gizli.kullanici_adi_normalize(p_sorgu) as ad
  )
  select sp.username, sp.gorunen_ad, sp.avatar_path, sp.bolum_etiketi, sp.sehir, sp.resmi_mi
    from public.social_profiles sp, sorgu
   where auth.uid() is not null
     /*
       ÜÇ HARF ALTINDA SONUÇ YOK: tek harflik bir sorgu, dizinin
       yirmide birini tek istekte döndürürdü. Kısa sorgu "sonuç yok"
       değil, "henüz arama yok" demek; arayüz de bunu böyle yazıyor.
     */
     and length(sorgu.ad) >= 3
     and sp.username is not null
     /* Önek eşleşmesi: "içeren" araması, adın ortasındaki harf
        gruplarıyla dizini tarama imkânı verirdi. */
     and sp.username like sorgu.ad || '%'
     and sosyal_gizli.sosyal_gorunur(sp.profile_id)
   order by length(sp.username), sp.username
   limit 10
$$;

/*
  İzinler DROP ile birlikte düştüğü için yeniden veriliyor. `anon`
  çağıramıyor: fonksiyon zaten `auth.uid() is not null` istiyor, ama
  izni de vermemek tek kapıya güvenmemek demek.
*/
revoke all on function public.sosyal_kullanici_ara(text) from public;
grant execute on function public.sosyal_kullanici_ara(text) to authenticated;
