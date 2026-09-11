-- G aşaması — kullanıcı adıyla arama
--
-- NEDEN DAR BİR RPC
-- -----------------
-- İstemciye `social_profiles` üzerinde serbest sorgu vermek, RLS doğru
-- yazılmış olsa bile bütün dizinin sayfa sayfa indirilmesine izin
-- verirdi: `?select=username&limit=1000&offset=...` ile herkesin
-- kullanıcı adı toplanabilirdi. Fonksiyon üç şeyi birden sabitliyor:
-- kaç sonuç döneceğini, hangi kolonların döneceğini ve en az kaç harf
-- gerektiğini.
--
-- NE DÖNMÜYOR
-- -----------
-- `profile_id` DÖNMÜYOR. Gezinme için gereken tek şey kullanıcı adı
-- (`/profil/<kullaniciadi>`); kimlik UUID'sini listelemek, ileride
-- yazılacak her sorguya hazır bir hedef listesi vermek olurdu.
-- E-posta, telefon, CV, başvurular ve TOPLULUK ÜYELİĞİ de dönmüyor —
-- üyelik ayrı bir kavram ve arama sonucunda işi yok.
--
-- NORMALLEŞTİRME TEK YERDE
-- ------------------------
-- Sorgu, kullanıcı adı üretiminde kullanılan aynı
-- `sosyal_gizli.kullanici_adi_normalize` fonksiyonundan geçiyor:
-- "Mustafa Oğulcan" → "mustafaogulcan". İki ayrı normalleştirme olsaydı
-- kullanıcı kendi adını arayıp bulamazdı.

create or replace function public.sosyal_kullanici_ara(p_sorgu text)
returns table (
  username       text,
  gorunen_ad     text,
  avatar_path    text,
  bolum_etiketi  text,
  sehir          text
)
language sql
stable
security definer
set search_path = public
as $$
  with sorgu as (
    select sosyal_gizli.kullanici_adi_normalize(p_sorgu) as ad
  )
  select sp.username, sp.gorunen_ad, sp.avatar_path, sp.bolum_etiketi, sp.sehir
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

revoke all on function public.sosyal_kullanici_ara(text) from public;
grant execute on function public.sosyal_kullanici_ara(text) to authenticated;

comment on function public.sosyal_kullanici_ara(text) is
  'Kullanıcı adı öneki ile arama. En az 3 harf, en çok 10 sonuç, yalnız herkese açık profil özeti. profile_id, e-posta ve üyelik verisi dönmez.';
