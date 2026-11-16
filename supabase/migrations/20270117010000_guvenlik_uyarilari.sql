-- SUPABASE GÜVENLİK UYARILARI (16 Kasım 2026)
--
-- Güvenlik danışmanı 6 uyarı türü veriyordu. Tek tek değerlendirme:
--
-- 1) function_search_path_mutable (24 fonksiyon)            → BU GÖÇTE KAPANIYOR
--    Arama yolu sabit olmayan fonksiyon, çağıranın `search_path`ine göre
--    başka bir şemadaki aynı adlı nesneyi çalıştırabilir. Hepsine sabit yol
--    veriliyor. `extensions` yolda duruyor: bir kısmı eklenti fonksiyonu
--    çağırıyor olabilir (unaccent, digest); çıkarmak onları kırardı.
--
-- 2) anon/authenticated_security_definer_function_executable → KISMEN
--    Listedeki TETİKLEYİCİ fonksiyonları (dönüş türü `trigger`) API'den
--    çağrılmak için değil; EXECUTE yetkisi tetikleyici ateşlenirken
--    sorulmuyor, yalnız tetikleyici OLUŞTURULURKEN (onu göçler, sahip
--    rolüyle yapıyor). Bu yüzden istemci rollerinden kaldırmak güvenli.
--    KALANLAR bilerek duruyor:
--      · RLS politikalarının çağırdığı kapılar (is_admin, is_company_member,
--        app_role, sirket_dogrulandi …): yetki kalkarsa o tabloları okuyan
--        her sorgu "permission denied" verir.
--      · İstemcinin çağırdığı RPC'ler (sosyal_*, basvuru_*, ekip_* …):
--        ürünün API'si; kimlik ve yetki kontrolü gövdelerinde.
--    anon'a açık RPC'lerin tek tek daraltılması ayrı iş: her birinin çağrı
--    yeri ve oturumsuz davranışı doğrulanmadan kaldırmak herkese açık
--    sayfaları kırabilir.
--
-- 3) auth_leaked_password_protection → scripts/auth-eposta-sablonlari.mjs
--    açmayı deniyor (plan izin vermiyorsa uyarı yazıp devam ediyor).
-- 4) auth_otp_long_expiry → BİLEREK: kullanıcı kararı (10 Kasım 2026),
--    onay bağlantısı 24 saat geçerli.
-- 5) extension_in_public (pg_net) → pg_net şema değiştirmeyi desteklemiyor;
--    Supabase'in yönettiği eklenti. Dokunulmuyor.
-- 6) rls_enabled_no_policy (INFO, 10 tablo) → bilerek: bu tablolar yalnız
--    sunucu rolüne açık; politika olmaması "kimse okuyamaz" demek.

/* 1) Arama yolu sabit değilse sabitle. İmza elle yazılmıyor: aynı adın bütün aşırı yüklemeleri. */
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as imza
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.proname = any (array[
         'ad_sadelestir', 'gecerli_alan_mi', 'kayitli_alan_adi', 'site_alan_adi',
         'serbest_saglayici_mi', 'tek_kullanimlik_eposta_mi', 'test_alan_adi_mi',
         'discover_event_fingerprint', 'vkn_gecerli', 'serbest_eposta_mi', 'eposta_alan_adi',
         'sirket_dogrulama_karari', 'cok_parcali_son_ek_mi', 'alan_adi_eslesiyor',
         'guard_profile_snapshot_contact', 'touch_job_discovery_signals', 'baglanti_red_bekleme',
         'ilan_bildirim_siniri', 'ilan_bildirim_deneme_siniri', 'ilan_karar_bildirim_deneme_siniri',
         'arayan_damgasi', 'kampus_ad_anahtari', 'kaynak_resmi_alanda', 'paylasim_surumu'])
       and not exists (
         select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.imza);
  end loop;
end
$$;

/* 2) Tetikleyici fonksiyonları istemci rollerinden çağrılamaz. */
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as imza
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.prosecdef
       and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.imza);
  end loop;
end
$$;
