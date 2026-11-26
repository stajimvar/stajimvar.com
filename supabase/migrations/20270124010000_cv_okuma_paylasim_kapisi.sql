/*
  ŞİRKETİN CV OKUMASI PAYLAŞIM ONAYINA BAĞLI (26 Kasım 2026)

  "dogrulanmis sirket basvuru cv kopyasini okur" politikası (20260909010000)
  yalnız "ilan benim mi" ve "şirket doğrulanmış mı" diye soruyordu. Paylaşım
  onayı yalnız arayüzde kontrol ediliyordu (AdayCekmecesi · kart.paylasildi).
  Bu kontrol 25 Kasım'da bir taşıma sırasında düştü (#471 → #472). Arayüz
  kapısı düşünce doğrulanmış şirket, profilini paylaşmamış adayın CV'si için
  imzalı adres üretebilir hâle geldi.

  Kapı artık veritabanında: profil kopyası, güncel profil ve iletişim
  RPC'lerindeki kuralın AYNISI (`basvuru_iletisimi_acik`, 20261201010000).
  Öğrenci paylaşımı kapattığında ya da hiç açmadığında CV dosyası şirkete
  kapalı.

  Uygulanmadan önce ölçüldü: CV'li 4 başvurunun 4'ünde paylaşım açık; hiçbir
  şirket bugün gördüğü bir CV'yi kaybetmiyor.
*/

drop policy if exists "dogrulanmis sirket basvuru cv kopyasini okur" on storage.objects;

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
        and public.basvuru_iletisimi_acik(a.id)
    )
  );
