-- PROFİL KAPAĞI VE KATILMA TARİHİ (X kalıbı, 2/2)
--
-- 1/2 (#238) kimliği sola hizaladı. Bu adım kimliğin üstüne kapak
-- fotoğrafını, altına katılma tarihini getiriyor. Avatar akışı BİREBİR
-- örnek alındı; farklı olan her şey aşağıda gerekçeli.
--
--   avatar                          kapak
--   ------------------------------  ------------------------------
--   social_profiles.avatar_path     social_profiles.kapak_path
--   kova sosyal-avatar (private)    kova sosyal-kapak (private)
--   avatar_yolu_kilidi              kapak_yolu_kilidi
--   avatar_dosyasi_gorunur          AYNI fonksiyon (aşağıda neden)

/* ================================================================== */
/*  1) KOLON                                                           */
/* ================================================================== */

alter table public.social_profiles add column if not exists kapak_path text;

comment on column public.social_profiles.kapak_path is
  'Kapak fotoğrafının sosyal-kapak kovasındaki YOLU (<profil>/<rastgele>.jpg); adres değil.';

/* ================================================================== */
/*  2) KOVA — private, avatarla aynı üç tür                            */
/* ================================================================== */

/*
  NEDEN AYRI KOVA, `sosyal-avatar` İÇİNDE ALT KLASÖR DEĞİL

  Avatar okuma kapısı yolu TAM İKİ parça bekliyor
  (`<profil>/<dosya>`); alt klasör açmak o fonksiyonu değiştirmek
  demekti ve o fonksiyon bir kez bozulup geri alındı (20260927120000).
  Ayrı kova hem o fonksiyona dokunmadan aynı kuralı kullanmaya hem de
  kapağa kendi boyut sınırını vermeye izin veriyor.

  2 MB YETİYOR: istemci kapağı en çok 1500×500 JPEG'e (kalite 0.85)
  indiriyor; bu ölçüde fotoğraf birkaç yüz KB. Sınır avatarınkiyle aynı
  tutuldu — iki sayı olsaydı hangisinin neden farklı olduğu sorulurdu.
  PNG ve WebP kovaya GİREBİLİYOR ama istemci göndermiyor; tür listesi
  avatarla aynı kalsın diye daraltılmadı.
*/
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('sosyal-kapak', 'sosyal-kapak', false, 2097152,
     array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/* ================================================================== */
/*  3) POLİTİKALAR                                                     */
/* ================================================================== */

/*
  YAZMA / DEĞİŞTİRME / SİLME: yalnız kendi klasörü — avatarın
  politikalarıyla aynı karşılaştırma. Mevcut politikalar
  (`bucket_id in ('sosyal-paylasim','sosyal-avatar')`) yeniden
  yazılmadı: çalışan iki kovanın kapısını bu işle açıp kapatmak
  gereksiz risk. Kapak kendi üç politikasını alıyor.
*/
drop policy if exists "sosyal kapak kendi klasorune yukler" on storage.objects;
create policy "sosyal kapak kendi klasorune yukler"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sosyal-kapak'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sosyal kapak kendi dosyasini gunceller" on storage.objects;
create policy "sosyal kapak kendi dosyasini gunceller"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'sosyal-kapak'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'sosyal-kapak'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sosyal kapak kendi dosyasini siler" on storage.objects;
create policy "sosyal kapak kendi dosyasini siler"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'sosyal-kapak'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

/*
  OKUMA: AVATARIN FONKSİYONU, KOPYASI DEĞİL

  Kapak ile avatar aynı soruya cevap veriyor: "bu profil bakana
  görünüyor mu?" Yol şeması da aynı (`<profil>/<dosya>`). İkinci bir
  `kapak_dosyasi_gorunur` yazılsaydı, 20260927110000'deki gibi biri
  değiştirildiğinde öteki geride kalır ve engellenen kişi kapağı
  görmeye devam ederdi. Tek fonksiyon, tek kural: sahibi ya da
  `sosyal_gorunur` (engellemeyi uygulayan kapı).

  `anon` YOK: profil giriş yapmamış ziyaretçiye hiç açılmıyor
  (20260927120000'deki ürün kararı), kapak da açılmıyor.
*/
drop policy if exists "sosyal kapak gorunurluge tabi" on storage.objects;
create policy "sosyal kapak gorunurluge tabi"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'sosyal-kapak'
    and sosyal_gizli.avatar_dosyasi_gorunur(name)
  );

/* ================================================================== */
/*  4) YAZMA YETKİSİ + YOL KİLİDİ                                      */
/* ================================================================== */

/*
  20260924040000'in aynısı: kolon yetkisi TEK BAŞINA yetmez, kolon
  serbest metin. Kullanıcı oraya BAŞKASININ kapak yolunu yazıp
  başkasının fotoğrafını kendi profilinde gösterebilirdi. Tetikleyici
  yolun birinci parçasının satırın sahibi olmasını zorluyor.
*/
grant update (kapak_path) on public.social_profiles to authenticated;

create or replace function public.kapak_yolu_kendi_klasorunde()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.kapak_path is null then
    return new;
  end if;

  if new.kapak_path is distinct from coalesce(old.kapak_path, '') then
    /* Yol şeması: <profil_uuid>/<rastgele>.<uzanti> */
    if split_part(new.kapak_path, '/', 1) is distinct from new.profile_id::text then
      raise exception 'kapak-yolu-kendi-klasorunde-olmali' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists kapak_yolu_kilidi on public.social_profiles;
create trigger kapak_yolu_kilidi
  before insert or update on public.social_profiles
  for each row execute function public.kapak_yolu_kendi_klasorunde();

/* ================================================================== */
/*  5) KATILMA TARİHİ — `created_at` HESABIN TARİHİNE ÇEKİLİYOR        */
/* ================================================================== */

/*
  ÖLÇÜLEN SORUN (canlı, 24 Eylül 2026)

  `social_profiles.created_at` kolonu vardı ama HESABIN değil SATIRIN
  tarihini taşıyordu. Sosyal katman gelmeden önce açılmış hesapların
  satırları toplu doldurmayla aynı saniyede açıldı: ilk sekiz satırın
  yedisinde değer 2026-09-11 05:56:34, oysa `profiles.created_at`
  18 Ağustos ile 10 Eylül arasına yayılıyor. Kolonu olduğu gibi
  "Katılma tarihi" diye basmak, Ağustos'ta katılmış kişiye "Eylül 2026'da
  katıldı" yazmak olurdu.

  NEDEN `profiles.created_at` DOĞRUDAN OKUNMUYOR: `profiles` başkasına
  kapalı (kendi satırı RLS'i), ziyaretçi o satırı göremiyor. Tarihi
  profille aynı kapıdan geçen satıra taşımak, ikinci bir okuma yolu
  açmaktan daha dar bir yüzey.

  `least`: satır hesaptan ÖNCE açılmış olamaz; olmuşsa (saat farkı)
  küçük olan kalıyor. Kolon başka hiçbir yerde okunmuyor (göçler ve
  istemci tarandı), yani anlamını değiştirmek bir şeyi kırmıyor.

  `created_at` KULLANICIYA YAZILAMAZ: kolon yetkisi listesinde yok
  (20260923030000), kimse kendi katılma tarihini geriye çekemiyor.
*/

/*
  `updated_at` tetikleyicisi bu düzeltmede SUSTURULUYOR: veri bir
  kullanıcı düzenlemesi değil, dolayısıyla "son güncelleme" anını
  24 satırda bugüne çekmek yanlış bir iz bırakırdı.
*/
alter table public.social_profiles disable trigger social_profiles_updated_at;

update public.social_profiles sp
   set created_at = p.created_at
  from public.profiles p
 where p.id = sp.profile_id
   and p.created_at < sp.created_at;

alter table public.social_profiles enable trigger social_profiles_updated_at;

/*
  İLERİDEKİ SATIRLAR: satır bugün kayıt anında açılıyor
  (20260926050000) ama `sosyal_profilimi_tamamla` eski bir hesap için
  satırı SONRADAN da açabiliyor. Kural tek yerde, eklemede uygulanıyor:
  satırın tarihi hesabınkinden geç olamaz.
*/
create or replace function sosyal_gizli.katilma_tarihi_hesaptan()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  hesap_ani timestamptz;
begin
  select p.created_at into hesap_ani from public.profiles p where p.id = new.profile_id;
  if hesap_ani is not null and hesap_ani < new.created_at then
    new.created_at := hesap_ani;
  end if;
  return new;
end;
$$;

drop trigger if exists katilma_tarihi_hesaptan on public.social_profiles;
create trigger katilma_tarihi_hesaptan
  before insert on public.social_profiles
  for each row execute function sosyal_gizli.katilma_tarihi_hesaptan();
