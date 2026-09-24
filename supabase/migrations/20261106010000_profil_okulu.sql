-- PROFİLDEKİ OKUL — PROFİLİ GÖREBİLEN OKULU DA GÖRÜR
--
-- ÜRÜN KARARI (kullanıcı, 24 Eylül 2026)
-- -------------------------------------
-- Önce "bağlantı kurduğum insanların okullarını göreyim", hemen ardından
-- "bağlantı kurmasam da okulunu göreyim" dendi. Okul, adı ve bölümü gibi
-- profilin KİMLİK bilgisi sayılıyor: profili görebilen okulu da görür.
-- Bağlantılar sayfası bunu bilerek çizmiyordu ("üniversiteyi göstermek
-- bir görünürlük kararı gerektiriyor"); karar bu.
--
-- NEDEN TABLOYA POLİTİKA EKLENMİYOR
-- ---------------------------------
-- `student_profiles` satırı okul adının yanında not ortalaması, CV yolu,
-- staj tercihleri, asgari ücret beklentisi de taşıyor. Satır düzeyindeki
-- RLS kolon seçemiyor: "profili gören okur" politikası bunların HEPSİNİ
-- açardı. Bu yüzden tek kolon döndüren dar bir fonksiyon yazılıyor;
-- tablo politikalarına dokunulmuyor.
--
-- KAPI PROFİLİN KENDİ KAPISI: `sosyal_gizli.sosyal_gorunur`
-- ---------------------------------------------------------
-- Oturum yoksa hayır; kendi profilin evet; başkası için profil yayında
-- ve arada engel yok. İkinci bir kural yazılmıyor: okul kapısı profil
-- kapısından ayrışırsa, profili kapalı birinin okulu sızardı (ya da
-- tersi). Fonksiyon kimlik listesi alıyor ama bu bir kâhin değil:
-- göremediğin profil için satır dönmüyor, gördüğün profilin okulu zaten
-- ekranda.
--
-- Resmî hesap (`resmi_mi`) dışarıda: arayüz resmî hesapta öğrenci
-- kimliğini çizmiyor (`ogrenciKimligiGorunurMu`), sunucu da okulu vermiyor.
-- Şirket sayfaları (`sirket_id`) öğrenci satırı taşımıyor; birleşme boş.

create or replace function public.sosyal_okullari(hedefler uuid[])
returns table (profil_id uuid, okul text)
language sql stable security definer set search_path = public
as $$
  select sp.id, btrim(sp.university)
    from public.student_profiles sp
    join public.social_profiles so on so.profile_id = sp.id
   where sp.id = any (hedefler)
     and cardinality(hedefler) <= 200
     and nullif(btrim(sp.university), '') is not null
     and not so.resmi_mi
     and so.sirket_id is null
     and sosyal_gizli.sosyal_gorunur(sp.id)
$$;

revoke all on function public.sosyal_okullari(uuid[]) from public;
revoke all on function public.sosyal_okullari(uuid[]) from anon;
grant execute on function public.sosyal_okullari(uuid[]) to authenticated;

comment on function public.sosyal_okullari(uuid[]) is
  'Görebildiğin sosyal profillerin okul adı (en çok 200 kimlik). Başka hiçbir student_profiles kolonu dönmez.';
