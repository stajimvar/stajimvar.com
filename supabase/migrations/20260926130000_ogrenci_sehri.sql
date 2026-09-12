-- Öğrenci profiline şehir
--
-- ÖLÇÜLEN EKSİK
-- -------------
-- `opportunityFit` yedi boyutta uygunluk hesaplıyor: bölüm, sınıf,
-- eğitim seviyesi, ŞEHİR, GPA, dil, ülke. Ama `student_profiles`ta
-- ikamet şehri diye bir kolon YOK; okunan tek şehir alanı
-- `pref_cities` ve o "çalışmak istediğim şehirler" demek.
--
-- Sonuç: şehir boyutu her gerçek kullanıcıda BİLİNMİYOR dönüyordu ve
-- şehir şartı olan bir burs, veri tam doğrulanmış olsa bile "Sana
-- uygun" sayılamıyordu. Yani rozet ve "Bana uygun" süzgeci sessizce
-- hiçbir zaman sonuç vermiyordu.
--
-- `pref_cities[0]`ı ikamet şehri saymak sahte veri olurdu: "İstanbul'da
-- staj arıyorum" diyen Konyalı öğrenciyi İstanbullu ilan etmek, onu
-- İstanbul şartlı bir bursta uygun göstermek demek.
--
-- NORMALİZE EDİLMİŞ, İSTEĞE BAĞLI
-- -------------------------------
-- Kolon serbest metin DEĞİL: `city_catalog` referansı da değil, ama
-- kısıt il adını `src/data/turkeyData.ts` içindeki TR_CITIES sözlüğüne
-- bağlıyor — eşleşme yazım farkıyla kaymasın. Sözlük tek yerde
-- (istemcide) duruyor ve form yalnız oradan seçtiriyor; buradaki kısıt
-- ikinci kapı: bir betik ya da yönetim yolu serbest metin yazamasın.
--
-- İSTEĞE BAĞLI: NULL kalabilir. Şehir bilmiyorsak uygunluk "belirsiz"
-- olur — "uygun değil" DEĞİL. O ayrım istemcide `opportunityFit`
-- içinde; burada yalnız alanın var olması ve temiz olması sağlanıyor.

alter table public.student_profiles
  add column if not exists city text;

/*
  Kısıt il adlarını sayarak değil BİÇİMLE bağlıyor: 81 ili buraya
  kopyalamak, sözlüğün iki yerde yaşaması ve birinin geride kalması
  demekti. Biçim kuralı yine de serbest metni kesiyor — virgül, parantez,
  ilçe eki, "İstanbul (Avrupa)" gibi yazımlar giremiyor.

  Türkçe harfler açıkça yazılı: `[[:alpha:]]` veritabanı yereline bağlı
  davranıyor ve 'ı' ile 'İ'yi kaçırabiliyor.
*/
alter table public.student_profiles drop constraint if exists student_profiles_city_bicimi;
alter table public.student_profiles
  add constraint student_profiles_city_bicimi
    check (
      city is null
      or city ~ '^[A-ZÇĞİÖŞÜ][a-zçğıiöşü]+(?:[ -][A-ZÇĞİÖŞÜ]?[a-zçğıiöşü]+)*$'
    );

comment on column public.student_profiles.city is
  'Öğrencinin ikamet ettiği il. İSTEĞE BAĞLI; boşken uygunluk "belirsiz" sayılır, "uygun değil" değil. pref_cities ile karıştırılmamalı: o "çalışmak istediğim şehirler".';

/*
  Kolon yetkisi: `student_profiles` üzerinde istemci zaten kendi satırını
  güncelleyebiliyor (0001'deki politika `id = auth.uid()`), kolon bazlı
  bir kısıtlama yok. Yeni kolon o kapsama giriyor; ayrı bir grant
  gerekmiyor. Başkasının satırını yazma yolu yine kapalı.
*/
