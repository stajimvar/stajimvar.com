/*
  BAŞKASININ KAMPÜSÜ

  KULLANICI İSTEĞİ (25 Eylül 2026): "Başkasının profilindeyken üniversite
  logosuna tıklayınca onun okulunun bilgilerini göstermesini istesem?"

  `kampusum()` (20261108010000) yalnız BAKAN öğrencinin okulunu okuyor.
  Burada aynı panel verisi bir KULLANICI ADI için de alınabiliyor.

  YENİ BİR BİLGİ AÇILMIYOR
  ------------------------
  Kişinin okulu profilinde zaten görünüyor (`sosyal_okullari`,
  20261106010000) ve kapı AYNISI: oturum var, profil sana görünür
  (`sosyal_gizli.sosyal_gorunur` — yayında, arada engel yok), resmî hesap
  değil, şirket sayfası değil. Okulunu göremediğin birinin kampüsü de
  dönmüyor: iki kural ayrışsaydı kampüs sayfası, profilde gizli olan
  okulu dolaylı olarak söylerdi. Menü ve duyurular zaten okulların
  herkese açık sayfalarından geliyor.

  Kapıdan geçmeyen her durumda (profil yok, görünmüyor, okul boş) cevap
  NULL — var/yok ayrımı yapılmıyor, profil sayfasındaki kural gibi.

  TEK GÖVDE
  ---------
  Panel sorgusu `sosyal_gizli.kampus_paneli(okul)`a taşındı; `kampusum()`
  ve `kampus_profil()` ikisi de onu çağırıyor. Aynı sorgunun iki kopyası
  zamanla ayrışırdı. `kampusum()`in dışarıdan görünen davranışı
  değişmedi: oturum yoksa NULL, yoksa bakanın okulu.
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

create or replace function public.kampusum()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when auth.uid() is null then null else sosyal_gizli.kampus_paneli(
    (select sp.university from public.student_profiles sp where sp.id = auth.uid())
  ) end
$$;

revoke all on function public.kampusum() from public, anon;
grant execute on function public.kampusum() to authenticated;

/*
  Kullanıcı adına göre. Cevaba `kisi` ekleniyor ki sayfa "kimin kampüsü"
  diyebilsin; ad ve kullanıcı adı zaten o profilde görünen bilgiler.
*/
create or replace function public.kampus_profil(p_kullanici_adi text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when auth.uid() is null then null else (
    select sosyal_gizli.kampus_paneli(sp.university)
           || jsonb_build_object('kisi', jsonb_build_object(
                'kullanici_adi', so.username,
                'ad', so.gorunen_ad))
      from public.social_profiles so
      join public.student_profiles sp on sp.id = so.profile_id
     where so.username = lower(btrim(p_kullanici_adi))
       and nullif(btrim(sp.university), '') is not null
       and not so.resmi_mi
       and so.sirket_id is null
       and sosyal_gizli.sosyal_gorunur(sp.id)
     limit 1
  ) end
$$;

revoke all on function public.kampus_profil(text) from public, anon;
grant execute on function public.kampus_profil(text) to authenticated;
