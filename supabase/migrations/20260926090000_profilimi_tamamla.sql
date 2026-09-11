-- G kapanışı — "Yeniden dene" gerçekten tamamlıyor
--
-- SORUN
-- -----
-- Sosyal profil satırı gelmediğinde arayüz dürüst bir hata gösteriyor
-- ama "Yeniden dene" yalnız OKUMAYI tekrarlıyordu. Satır gerçekten hiç
-- açılmadıysa (kayıt anında bölüm yoktu, ad harfsizdi, tetikleyici
-- uyarıyla düştü) okumayı yüz kez tekrarlamak da satır üretmiyor.
-- Kullanıcının elinde çalışmayan bir düğme kalıyordu.
--
-- ÇÖZÜM: DAR VE İDEMPOTENT BİR RPC
-- --------------------------------
-- `sosyal_gizli.sosyal_profil_ac` zaten var ve zaten tekrar
-- çalıştırılabilir: satır varsa yeniden oluşturmuyor, yalnız NULL kalmış
-- alanları dolduruyor, dolu alanın üzerine yazmıyor. Eksik olan tek şey
-- kullanıcının onu KENDİSİ için çağırabileceği bir kapıydı.
--
-- NEDEN GÜVENLİ
-- -------------
--   · Argüman ALMIYOR. Hedef her zaman `auth.uid()`; istemci başkasının
--     profilini açtıramıyor, kimlik gönderemiyor.
--   · `sosyal_profil_kur`un yaptığı gibi kullanıcı adı, bölüm ya da alan
--     KABUL ETMİYOR. Bölüm sunucuda `student_profiles`ten çözülüyor,
--     eşleşmezse NULL kalıyor — uydurma bölüm atanmıyor.
--   · Topluluğa KATMIYOR: `community_members`e tek satır yazmıyor.
--   · İkinci çağrı hiçbir şey değiştirmiyor. Kullanıcı düğmeye beş kez
--     bassa da sonuç aynı.
--
-- Böylece manuel "Sosyal profil oluştur" akışına da gerek kalmıyor:
-- kullanıcı hiçbir bilgi girmiyor, yalnız sunucudan eksik kalan işi
-- tamamlamasını istiyor.

create or replace function public.sosyal_profilimi_tamamla()
returns public.social_profiles
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ben   uuid := auth.uid();
  sonuc public.social_profiles;
begin
  if ben is null then
    raise exception 'Oturum gerekiyor.'
      using errcode = '42501', detail = 'oturum-yok';
  end if;

  /*
    Yalnız ÖĞRENCİ hesabı için: şirket ve yönetici hesaplarının sosyal
    profili yok ve olmamalı. Rol kontrolü burada, çünkü tetikleyicideki
    aynı kural istemciden çağrılan bu yolda da geçerli olmalı.
  */
  if not exists (
    select 1 from public.profiles p where p.id = ben and p.role = 'student'
  ) then
    raise exception 'Sosyal profil yalnız öğrenci hesaplarında açılıyor.'
      using errcode = '42501', detail = 'ogrenci-degil';
  end if;

  perform sosyal_gizli.sosyal_profil_ac(ben);

  select * into sonuc from public.social_profiles where profile_id = ben;

  if not found then
    /*
      Buraya düşmek, satırın açılamadığı anlamına geliyor ve sebebi
      istemciye SÖYLENMİYOR — sunucu tarafındaki gerçek sebep
      (`raise warning`) günlükte duruyor. Uydurma bir açıklama yerine
      kullanıcıya dürüst bir "olmadı" dönüyor.
    */
    raise exception 'Sosyal profil hazırlanamadı.'
      using errcode = 'P0001', detail = 'profil-hazirlanamadi';
  end if;

  return sonuc;
end;
$$;

revoke all on function public.sosyal_profilimi_tamamla() from public;
grant execute on function public.sosyal_profilimi_tamamla() to authenticated;

comment on function public.sosyal_profilimi_tamamla() is
  'Çağıranın KENDİ sosyal profilini açar ya da eksiklerini tamamlar. Argüman almaz, idempotenttir, topluluğa katmaz, bölümü sunucuda çözer.';
