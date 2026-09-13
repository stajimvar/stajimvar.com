-- RESMÎ HESAP İŞARETİNİ YÖNETİCİ VERİYOR — AMA NASIL?
--
-- Bayrak eklendi (20260928010000) ve iki kapıyla korunuyor: sütun izni
-- yok, üstüne bir de tetikleyici var. Ölçüldü (üretim, 13 Eylül 2026):
--
--   servis anahtarıyla UPDATE   42501 / resmi-bayragi-kilitli
--     (servis anahtarı RLS'i atlıyor ama TETİKLEYİCİYİ atlamıyor;
--      `auth.uid()` null olduğu için `is_admin()` false)
--   yönetici oturumuyla UPDATE  42501 / permission denied for table
--     (`social_profiles` üzerinde UPDATE izni yalnız `avatar_path`
--      sütunu için verilmiş, 20260924040000)
--
-- Yani bayrağı verecek DESTEKLENEN bir yol yoktu: ne istemciden ne
-- otomasyondan. Elle SQL çalıştırmak da bir yol değil — tekrarlanabilir
-- değil, denetlenebilir değil ve bir dahaki resmî hesapta aynı soru
-- yeniden sorulur.
--
-- Çözüm depoda zaten olan kalıp: `security definer` RPC + `is_admin()`
-- kapısı (bkz. `bolum_talebini_karara_bagla`). Fonksiyon yetkiyi
-- yükseltiyor ama YETKİYİ SORMADAN yükseltmiyor.

create or replace function public.resmi_hesap_isaretle(
  p_profil uuid,
  p_resmi  boolean
)
returns public.social_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc public.social_profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici olmak gerekiyor.'
      using errcode = '42501', detail = 'yonetici-degil';
  end if;

  if p_profil is null then
    raise exception 'Profil kimliği zorunlu.'
      using errcode = '23514', detail = 'profil-kimligi-yok';
  end if;

  /*
    TEK SATIR, BİRİNCİL ANAHTARLA

    Süzgeç `profile_id` ve o sütun tablonun birincil anahtarı: bu
    çağrının başka bir satıra dokunması mümkün değil. Toplu işaretleme
    diye bir şey yok — resmî hesap sayılı ve tek tek verilen bir sıfat.
  */
  update public.social_profiles
     set resmi_mi = coalesce(p_resmi, false)
   where profile_id = p_profil
   returning * into sonuc;

  if not found then
    raise exception 'Sosyal profil bulunamadı.'
      using errcode = 'P0002', detail = 'profil-yok';
  end if;

  /*
    BAĞLANTIYA, PAYLAŞIMA, BAŞKA HİÇBİR SATIRA DOKUNULMUYOR

    Resmî içerik bir bağlantıdan gelmiyor (bkz. 20260928010000): bu
    fonksiyonun `connections` ile hiçbir işi yok ve olmamalı. Bayrak
    verilirken sessizce bir bağlantı açılsaydı, sahte bağlantı kurmamak
    için verilen bütün karar boşa giderdi.
  */
  return sonuc;
end;
$$;

/*
  `public` rolünden alınıp yalnız oturumlu kullanıcıya veriliyor;
  kapı fonksiyonun içinde (`is_admin`). `anon` bu fonksiyonu
  çağıramıyor: yetkisiz bir çağrının hata mesajını bile görmesine gerek
  yok.
*/
revoke all on function public.resmi_hesap_isaretle(uuid, boolean) from public;
grant execute on function public.resmi_hesap_isaretle(uuid, boolean) to authenticated;

comment on function public.resmi_hesap_isaretle(uuid, boolean) is
  'Bir sosyal profile StajımVar resmî hesabı işaretini verir ya da alır. '
  'Yalnız yönetici çağırabiliyor; yalnız verilen profil satırına dokunuyor.';
