/*
  KAMPÜS: SON MENÜ TARİHİ (yaz dönemi düzeltmesi, 26 Eylül 2026)

  Yazın ve tatillerde yemekhaneler menü yayımlamıyor. Panel bugünün
  menüsünü bulamayınca her gün "Bugün için yayımlanmış menü yok." diyordu;
  haftalarca süren boşlukta bu, kaynağın bozuk olduğu hissini veriyordu.

  Panel artık son yayımlanmış menünün tarihini de biliyor: son 7 günde
  menü yoksa yemek bölümü tek satıra iniyor ve resmî yemekhane sayfasına
  gönderiyor (KampusumPaneli). Tarih yalnız BUGÜNE KADARKİ menülerden:
  ileri tarihli bir menü "son menü" sayılmıyor.

  Gövde 20261110010000'dakiyle aynı; tek ek `son_menu_tarihi`. Yetkiler
  `create or replace` ile korunuyor (fonksiyon anon ve authenticated'a
  kapalı, yalnız `kampusum()` ve `kampus_profil()` çağırıyor).
*/

create or replace function sosyal_gizli.kampus_paneli(p_okul text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  with uni as (
    select u.*
      from public.universiteler u
     where public.kampus_ad_anahtari(p_okul) = any (u.ad_anahtarlari)
     limit 1
  ),
  bugun as (
    select (now() at time zone 'Europe/Istanbul')::date as g
  )
  select jsonb_build_object(
    'bugun', (select g from bugun),
    'ogrenci_okulu', nullif(btrim(p_okul), ''),
    'universite', (select jsonb_build_object(
        'id', u.id, 'ad', u.resmi_ad, 'alan_adi', u.resmi_alan_adi,
        'yemekhane_sayfasi', u.yemekhane_sayfasi, 'duyurular_sayfasi', u.duyurular_sayfasi)
      from uni u),
    'menu', (select jsonb_build_object(
        'tarih', min(m.tarih),
        'kaynak_url', min(m.kaynak_url),
        'cekildi_at', max(m.cekildi_at),
        'ogunler', jsonb_agg(jsonb_build_object('ogun', m.ogun, 'yemekler', m.yemekler, 'kalori', m.kalori)
                             order by array_position(array['ogle','gunluk','aksam'], m.ogun)))
      from public.kampus_menuleri m, uni, bugun
     where m.universite_id = uni.id and m.tarih = bugun.g
     having count(*) > 0),
    'son_menu_tarihi', (select max(m.tarih)
      from public.kampus_menuleri m, uni, bugun
     where m.universite_id = uni.id and m.tarih <= bugun.g),
    'menu_kaynagi', (select jsonb_build_object('son_kontrol_at', max(k.son_kontrol_at), 'son_basari_at', max(k.son_basari_at))
      from public.universite_kaynaklari k, uni
     where k.universite_id = uni.id and k.tur = 'yemek' and k.etkin
     having count(*) > 0),
    'duyurular', coalesce((select jsonb_agg(jsonb_build_object('baslik', d.baslik, 'tarih', d.yayin_tarihi, 'url', d.url)
                                            order by d.yayin_tarihi desc, d.cekildi_at desc)
      from (select d.baslik, d.yayin_tarihi, d.url, d.cekildi_at
              from public.universite_duyurulari d, uni, bugun
             where d.universite_id = uni.id and d.yayin_tarihi >= bugun.g - 30
             order by d.yayin_tarihi desc, d.cekildi_at desc limit 4) d), '[]'::jsonb),
    'duyuru_kaynagi', (select jsonb_build_object('son_kontrol_at', max(k.son_kontrol_at), 'son_basari_at', max(k.son_basari_at))
      from public.universite_kaynaklari k, uni
     where k.universite_id = uni.id and k.tur = 'duyuru' and k.etkin
     having count(*) > 0)
  )
$$;

revoke all on function sosyal_gizli.kampus_paneli(text) from public, anon, authenticated;
