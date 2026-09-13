-- 20260927110000 GERİ ALINIYOR
--
-- NEDEN
-- -----
-- O göç iki şey açmıştı: yayımlanmış profilin avatarını oturumsuz
-- ziyaretçiye ve `sosyal_acik_sayaclar` ile paylaşım sayısını. Ürün
-- kararı bunun tersi: profil, giriş yapmamış kullanıcıya HİÇ açılmıyor
-- (arayüzdeki kapı da zaten böyle: "Profiller yalnızca giriş yapmış
-- kullanıcılara açık"). Kullanılmayacak bir kapıyı açık bırakmak
-- gereksiz yüzey.
--
-- ASIL SEBEP: ENGELLEME BYPASS EDİLİYORDU
-- ---------------------------------------
-- `avatar_dosyasi_gorunur` içine eklenen dal `sosyal_gorunur`dan ÖNCE
-- dönüyordu:
--
--     if exists (... yayinda_mi) then return true; end if;   <- burada duruyor
--     return sosyal_gizli.sosyal_gorunur(sahip);              <- engelli_mi burada
--
-- Dal oturumsuz çağıran için yazılmıştı ama OTURUMLU çağıran için de
-- devreye giriyordu. Sonuç: yayımlanmış bir profilde engelleme kontrolü
-- hiç çalışmıyor, engellenen kişi engelleyenin avatar dosyasını
-- okuyabiliyordu. Bu bir gerileme; fonksiyon eski hâline dönüyor.
--
-- BU GÖÇ VERİYE DOKUNMUYOR: taşınan avatar dosyaları ve
-- `social_profiles.avatar_path` değerleri yerinde kalıyor. Geri alınan
-- şey yalnızca okuma kapısı.

-- 1) Avatar görünürlüğü eski hâline: sahibi ya da görünürlük kapısı.
--    `sosyal_gorunur` engellemeyi yeniden uyguluyor.
create or replace function sosyal_gizli.avatar_dosyasi_gorunur(nesne_adi text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  parcalar text[] := string_to_array(coalesce(nesne_adi, ''), '/');
  sahip uuid;
begin
  if array_length(parcalar, 1) is distinct from 2 then
    return false;
  end if;
  begin
    sahip := parcalar[1]::uuid;
  exception when others then
    return false;
  end;
  return sahip = auth.uid() or sosyal_gizli.sosyal_gorunur(sahip);
end;
$$;

-- 2) Oturumsuz okuma politikası kalkıyor. `anon` bu kovada yeniden
--    hiçbir yetkiye sahip değil.
drop policy if exists "sosyal avatar yayimda ise herkese acik" on storage.objects;

-- 3) Açık sayaç kalkıyor. Giriş yapmış kullanıcı için `sosyal_sayaclar`
--    zaten çalışıyor: `sosyal_gorunur` yayımlanmış profile izin veriyor
--    ve engellemeyi uyguluyor.
drop function if exists public.sosyal_acik_sayaclar(uuid);
