-- CV: PROFİL BELGESİ VE BAŞVURU ANININ KOPYASI
--
-- MODEL
--   student_profiles.cv_path        → öğrencinin GÜNCEL CV'si
--   applications.cv_snapshot_path   → o başvuru anındaki KOPYA
--   applications.cv_path            → eski alan, yeni kod yazmıyor
--
-- Öğrenci profilindeki CV'yi değiştirdiğinde geçmiş başvurunun içeriği
-- sessizce değişmemeli: şirket 1 Eylül'de gördüğü belgeyi 15 Eylül'de de
-- görmeli. Bu yüzden başvuru anında dosyanın AYRI BİR KOPYASI çıkarılıyor;
-- yalnızca yolu kopyalamak gerçek bir kopya olmazdı.
--
-- YOL ŞEMASI
--   {user_id}/profil/<uuid>.pdf        güncel CV
--   {user_id}/basvurular/<uuid>.pdf    başvuru kopyası
--
-- Her iki dosya da öğrencinin kendi klasöründe: mevcut "öğrenci kendi
-- klasörüne yazar/okur/siler" politikaları olduğu gibi geçerli ve
-- kopyalamayı öğrenci kendi yetkisiyle yapıyor. Yeni SECURITY DEFINER
-- fonksiyona, servis anahtarına ya da Edge Function'a gerek yok.

-- ---------------------------------------------------------------------
-- 1. ŞİRKETİN OKUDUĞU DOSYA: KLASÖR DEĞİL, SATIRIN GÖSTERDİĞİ DOSYA
-- ---------------------------------------------------------------------
--
-- Eski politika şöyleydi:
--
--   bucket_id = 'cvs' and exists (
--     select 1 from applications a join listings l on l.id = a.listing_id
--     where a.student_id::text = (storage.foldername(name))[1]
--       and is_company_member(l.company_id))
--
-- Yani "bu öğrenci bana başvurduysa, o öğrencinin KLASÖRÜNDEKİ HER DOSYAYI
-- okurum" diyordu. Tek dosya varken zararsızdı. Başvuru başına kopya
-- çıkmaya başlayınca doğrudan sızıntı olurdu: A şirketi, aynı öğrencinin
-- B şirketine yaptığı başvurunun kopyasını da okuyabilirdi.
--
-- Yeni politika dosyayı SATIRDAN türetiyor: yalnızca kendi ilanıma gelen
-- başvurunun cv_snapshot_path (ya da eski cv_path) alanında yazan dosya.
-- Böylece "application_id değiştirerek başka kopyaya erişme" diye bir
-- yüzey kalmıyor — yol istemciden gelmiyor, satırdan geliyor.
--
-- DOĞRULAMA ŞARTI ARTIK POLİTİKANIN KENDİ METNİNDE
-- Şirketin doğrulanmış olması şartı bugün de geçerli ama dolaylı yoldan:
-- `applications` SELECT politikası sirket_dogrulandi() arıyor ve iç içe
-- sorgu ona takılıyor. Ölçüldü ve kapalı olduğu doğrulandı. Yine de bir
-- güvenlik sınırının başka bir tablonun politikasına bağlı kalması
-- kırılgan; şart buraya açıkça yazılıyor.

drop policy if exists "sirket basvuran cv okur" on storage.objects;

create policy "dogrulanmis sirket basvuru cv kopyasini okur" on storage.objects
  for select using (
    bucket_id = 'cvs'
    and exists (
      select 1
      from public.applications a
      join public.listings l on l.id = a.listing_id
      where storage.objects.name in (a.cv_snapshot_path, a.cv_path)
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );

-- ---------------------------------------------------------------------
-- 2. BAŞKASININ DOSYASINI KENDİ BAŞVURUNA BAĞLAYAMAZSIN
-- ---------------------------------------------------------------------
--
-- Şirketin okuma yetkisi artık başvuru satırındaki yoldan türüyor. O yol
-- serbest bırakılsaydı öğrenci, başka bir öğrencinin dosya yolunu kendi
-- başvurusuna yazıp şirkete okutabilirdi — yetkiyi satıra bağlamanın
-- açtığı tek yeni yüzey bu ve burada kapatılıyor.
--
-- Kural: CV yolu her zaman başvuran öğrencinin kendi klasöründe olmalı.
-- service_role muaf: bakım ve taşıma işleri buradan geçiyor.

create or replace function public.guard_application_cv_path()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  rol text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
  onek text := new.student_id::text || '/';
begin
  if rol = 'service_role' then
    return new;
  end if;

  if new.cv_snapshot_path is not null and position(onek in new.cv_snapshot_path) <> 1 then
    raise exception 'CV kopyasi basvuran ogrencinin kendi klasorunde olmali'
      using errcode = 'check_violation';
  end if;

  if new.cv_path is not null and position(onek in new.cv_path) <> 1 then
    raise exception 'CV yolu basvuran ogrencinin kendi klasorunde olmali'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists applications_guard_cv_path on public.applications;
create trigger applications_guard_cv_path
  before insert or update on public.applications
  for each row execute function public.guard_application_cv_path();

-- ---------------------------------------------------------------------
-- 3. UPDATE POLİTİKASI BİLEREK YOK
-- ---------------------------------------------------------------------
--
-- `cvs` kovasında storage.objects üzerinde UPDATE politikası eklenmedi ve
-- eklenmemeli. Sebep bu turun tam da konusu: UPDATE yetkisi olmadan bir
-- dosyanın üzerine yazmak mümkün değil (upsert 'new row violates row-level
-- security' ile düşer), yani ÇIKARILMIŞ BİR BAŞVURU KOPYASI HİÇBİR ZAMAN
-- DEĞİŞTİRİLEMEZ. Değişmezlik bir uygulama kuralı değil, veritabanı kuralı.
--
-- CV değiştirme bu yüzden "yeni dosya yükle → cv_path'i güncelle → eskisini
-- sil" sırasıyla yapılıyor. Sıra bilinçli: DB güncellemesi başarısız olursa
-- profil hâlâ eski ve ÇALIŞAN dosyayı gösteriyor.
