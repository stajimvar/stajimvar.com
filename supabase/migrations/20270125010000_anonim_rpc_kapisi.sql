/*
  GİRİŞ GEREKTİREN İŞLEVLER ANONİME KAPALI (26 Kasım 2026)

  Supabase güvenlik denetimi (get_advisors) giriş yapmamış rolün (anon)
  çağırabildiği 36 SECURITY DEFINER işlevi listeledi. Hepsi tek tek
  okundu: hiçbiri bugün açık değil — yazan işlevler `auth.uid()` ya da
  `is_admin()` ile içeride reddediyor. Yine de güvenlik tek katmana
  bağlı: işlevin gövdesi bir gün kontrolü kaybederse anonim çağrı
  doğrudan çalışır.

  Bu göç ikinci katmanı ekliyor: oturum ya da yönetici gerektiren 17
  işlevden anonim çalıştırma yetkisi alınıyor. Oturumlu kullanıcının
  yetkisi aynen kalıyor.

  KAPSAM DIŞI BIRAKILANLAR (bilinçli)
  - Satır güvenliği politikalarının içinde çağrılan yardımcılar
    (is_admin, is_company_member, app_role, sirket_dogrulandi,
    sirket_kademesi, sirket_basvuru_yazabilir, ogrenci_basvurdu_mu,
    baglanti_durumu, baglanti_engeli…): politikalar anonim okumada da
    değerlendiriliyor; yetki alınırsa herkese açık sayfalar kırılır.
  - Herkese açık olması amaçlanan okuma ve sayaçlar (takipci_sayisi,
    paylasim_begeni_sayisi, sosyal_sayaclar, sosyal_kullanici_adi_coz,
    sosyal_kullanici_ara, sosyal_topluluklar, get_discover_event_by_slug,
    staj_arayan_ogrenci_ozeti, rehber_okundu, takip_ediyor_muyum).

  Bu 17 işlevin hiçbiri bir politikada geçmiyor (pg_policies'te arandı).

  `sosyal_gizli.ad_sadelestir`: arama yolu sabitlendi (denetim uyarısı
  function_search_path_mutable). Gövde yalnız yerleşik işlevler kullanıyor.
*/

do $$
declare
  imza text;
begin
  foreach imza in array array[
    'public.baglanti_yeniden_baslat(uuid)',
    'public.bolum_talebini_karara_bagla(uuid, text, uuid, uuid, text, text)',
    'public.resmi_hesap_isaretle(uuid, boolean)',
    'public.sirket_dogrula(uuid)',
    'public.sirket_dogrulamayi_reddet(uuid, text)',
    'public.sosyal_bolum_duzelt(uuid, text, text)',
    'public.sosyal_kullanici_adi_degistir(text)',
    'public.sosyal_paylasim_baslat(uuid, text, text)',
    'public.sosyal_paylasim_iptal(uuid)',
    'public.sosyal_paylasim_tamamla(uuid, jsonb)',
    'public.sosyal_profil_kur(text, text, boolean, text, text, text, text)',
    'public.sosyal_topluluga_katil(uuid)',
    'public.sosyal_topluluktan_ayril(uuid)',
    'public.sosyal_profilimi_tamamla()',
    'public.sirket_ozel_bilgilerim(uuid)',
    'public.takipcilerim(integer, integer)',
    'public.takip_ettiklerim(integer, integer)'
  ] loop
    /* Boş test veritabanında da aynı işlevler göçlerden geliyor; yoksa atla. */
    if to_regprocedure(imza) is null then
      raise notice 'atlandi (yok): %', imza;
      continue;
    end if;
    execute format('revoke execute on function %s from public, anon', imza);
    execute format('grant execute on function %s to authenticated, service_role', imza);
  end loop;
end;
$$;

alter function sosyal_gizli.ad_sadelestir(text) set search_path = pg_catalog, pg_temp;
