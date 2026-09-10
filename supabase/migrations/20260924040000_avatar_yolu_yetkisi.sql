-- D aşaması, ek — profil fotoğrafı yolunun yazılabilmesi
--
-- ÖLÇÜLEN EKSİK
-- -------------
-- `social_profiles.avatar_path` kolonu A aşamasından beri şemada var ama
-- 20260923030000'deki kolon düzeyi yetki listesinde YOK:
--   grant update (gorunen_ad, biyografi, bolum_etiketi, sinif_etiketi,
--                 sehir, yayinda_mi) ...
-- Yani kova ve okuma politikası D'de hazır olmasına rağmen kullanıcı
-- kendi profil fotoğrafının yolunu YAZAMIYORDU: güncelleme 42501
-- dönüyordu. Arayüz tarafı bu yüzden çizilemedi.
--
-- NEDEN SADECE grant YETMİYOR
-- ---------------------------
-- Yetki verilse bile kolon serbest metin: kullanıcı oraya BAŞKASININ
-- dosya yolunu yazabilirdi. Okuma politikası o dosyayı zaten görünür
-- kişilere açtığı için bu bir veri sızıntısı değil — ama başkasının
-- fotoğrafını kendi profilinde göstermek olurdu. Kimlik taklidine giden
-- bu yol tetikleyiciyle kapatılıyor.
--
-- Kalıp yeni değil: `kimlik_kilidi()` de aynı işi bölüm/alan için
-- yapıyor (yetki + tetikleyici birlikte).

grant update (avatar_path) on public.social_profiles to authenticated;

create or replace function public.avatar_yolu_kendi_klasorunde()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.avatar_path is null then
    return new;
  end if;

  if new.avatar_path is distinct from coalesce(old.avatar_path, '') then
    /*
      Yol şeması: <profil_uuid>/<rastgele>.<uzanti>
      Birinci parça satırın SAHİBİ olmalı. Storage'ın INSERT politikası
      zaten yalnız kendi klasörüne yazmaya izin veriyor; bu kural
      "yazamadığım ama görebildiğim bir dosyayı kendi profilime
      iliştiririm" yolunu da kapatıyor.
    */
    if split_part(new.avatar_path, '/', 1) is distinct from new.profile_id::text then
      raise exception 'avatar-yolu-kendi-klasorunde-olmali' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists avatar_yolu_kilidi on public.social_profiles;
create trigger avatar_yolu_kilidi
  before insert or update on public.social_profiles
  for each row execute function public.avatar_yolu_kendi_klasorunde();
