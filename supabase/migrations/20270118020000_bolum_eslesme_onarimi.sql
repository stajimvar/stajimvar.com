-- BÖLÜMÜ YENİ KATALOGLA EŞLEŞEN ÖĞRENCİLER (17 Kasım 2026)
--
-- 20270118010000 kataloğa 48 program ekledi (Spor Yöneticiliği, Adalet…).
-- Ölçüldü: bölümünü yazmış ama o program katalogda olmadığı için alansız
-- kalmış 3 öğrenci vardı; bölümleri artık eşleşiyor.
--
-- Eşleşme yalnız `department` DEĞİŞİNCE kuruluyor (bolum_girilince_tamamla),
-- yani bu öğrenciler profillerine dokunana kadar alansız kalırdı. Aynı
-- işi yapan `sosyal_profil_ac` burada bir kez çağrılıyor: yalnız boş
-- `department_id`yi dolduruyor, dolu alana dokunmuyor. Tekrar
-- çalıştırılabilir; ikinci çalıştırmada kimse seçilmez.

do $$
declare
  kim uuid;
begin
  for kim in
    select sp.id
      from public.student_profiles sp
      join public.social_profiles so on so.profile_id = sp.id
     where so.department_id is null
       and coalesce(btrim(sp.department), '') <> ''
       and sosyal_gizli.bolumu_esle(sp.department) is not null
  loop
    begin
      perform sosyal_gizli.sosyal_profil_ac(kim);
    exception
      when others then
        raise warning 'bölüm eşleşmesi onarılamadı (%): %', kim, sqlerrm;
    end;
  end loop;
end
$$;
