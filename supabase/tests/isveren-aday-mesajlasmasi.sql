-- İŞVEREN → ADAY MESAJLAŞMASI — YETKİ VE AKIŞ SINAMASI
--
-- NE SINIYOR
-- ----------
--   1. liste → konuşma      işveren adaya yazabiliyor, sohbet 'istek' açılıyor
--   2. aday yanıtı          aday yanıtlayınca sohbet 'acik'a geçiyor
--   3. işveren yanıtı görüyor  açık sohbette iki taraf da okuyabiliyor
--   4. yetkisiz erişim      üçüncü kişi sohbeti ve mesajları GÖREMİYOR
--   5. rıza kapısı          arayışı kapalı öğrenciye YENİ sohbet açılamıyor
--   6. doğrulanmamış şirket yazamıyor
--   7. aday şirkete SOĞUK başlatamıyor
--   8. engel iki yönlü kesiyor
--
-- NASIL ÇALIŞTIRILIR (yerel, üretime dokunmaz)
-- --------------------------------------------
--   npx supabase start
--   npx supabase db reset                 # göçleri uygular
--   psql "$(npx supabase status -o env | grep DB_URL | cut -d= -f2-)" \
--        -v ON_ERROR_STOP=1 -f supabase/tests/isveren-aday-mesajlasmasi.sql
--
-- Tamamı TEK İŞLEMDE ve sonunda `rollback`: yerel veritabanında da kalıcı
-- satır bırakmıyor. Üretimde ÇALIŞTIRILMAMALI — gerçek kullanıcılar adına
-- mesaj üretirdi.
--
-- `auth.uid()` taklidi: Supabase'in `auth.uid()`i `request.jwt.claims`
-- içinden okuyor; her adımda `set_config` ile kim olduğumuzu söylüyoruz.
-- Gerçek RPC'ler değişmeden, olduğu gibi çağrılıyor.

begin;

\set ON_ERROR_STOP on

/* ---------------------------------------------------------------- */
/*  Yardımcılar                                                      */
/* ---------------------------------------------------------------- */

create or replace function pg_temp.kim_olarak(p_kim uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_kim, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.esitle(p_ad text, p_beklenen text, p_gercek text) returns void
language plpgsql as $$
begin
  if p_beklenen is distinct from p_gercek then
    raise exception 'KIRIK | % | beklenen=% gercek=%', p_ad, p_beklenen, p_gercek;
  end if;
  raise notice 'tamam  | %', p_ad;
end $$;

/* Çağrının BELİRTİLEN hata ile reddedilmesi bekleniyor. */
create or replace function pg_temp.reddedilmeli(p_ad text, p_alici uuid, p_metin text, p_hata text)
returns void language plpgsql as $$
begin
  perform public.mesaj_gonder(p_alici, p_metin);
  raise exception 'KIRIK | % | cagri REDDEDILMELIYDI (%%)', p_ad, p_hata;
exception
  when others then
    if sqlerrm = p_hata then
      raise notice 'tamam  | % (reddedildi: %)', p_ad, sqlerrm;
    elsif sqlerrm like 'KIRIK%' then
      raise;
    else
      raise exception 'KIRIK | % | beklenen hata=% gercek=%', p_ad, p_hata, sqlerrm;
    end if;
end $$;

/* ---------------------------------------------------------------- */
/*  Sahne: 1 doğrulanmış şirket, 1 doğrulanmamış şirket,             */
/*         1 arayan aday, 1 arayışı kapalı öğrenci, 1 ilgisiz kişi   */
/* ---------------------------------------------------------------- */

create temporary table kisiler (etiket text primary key, id uuid);
insert into kisiler values
  ('isveren',        gen_random_uuid()),
  ('isveren_ham',    gen_random_uuid()),   -- doğrulanmamış şirketin üyesi
  ('aday',           gen_random_uuid()),
  ('kapali_ogrenci', gen_random_uuid()),   -- arayış anahtarı kapalı
  ('ilgisiz',        gen_random_uuid());   -- hiçbir tarafı olmayan üçüncü kişi

insert into auth.users (id, email, aud, role, instance_id)
select k.id, k.etiket || '@sinama.test', 'authenticated', 'authenticated',
       '00000000-0000-0000-0000-000000000000'
  from kisiler k;

insert into public.profiles (id, full_name, role)
select k.id, initcap(k.etiket),
       (case when k.etiket like 'isveren%' then 'company' else 'student' end)::user_role
  from kisiler k;

/* Şirketler */
create temporary table sirketler (etiket text primary key, id uuid);
insert into sirketler values ('dogrulanmis', gen_random_uuid()), ('ham', gen_random_uuid());

insert into public.companies (id, name, slug, verified)
select s.id, 'Sinama ' || s.etiket, 'sinama-' || s.etiket, (s.etiket = 'dogrulanmis')
  from sirketler s;

insert into public.company_members (company_id, user_id)
select (select id from sirketler where etiket = 'dogrulanmis'), (select id from kisiler where etiket = 'isveren')
union all
select (select id from sirketler where etiket = 'ham'), (select id from kisiler where etiket = 'isveren_ham');

/* Sosyal profiller: işverenlerinki şirkete bağlı, ötekiler öğrenci. */
insert into public.social_profiles (profile_id, username, gorunen_ad, sirket_id, yayinda_mi)
select k.id, k.etiket, initcap(k.etiket),
       case k.etiket
         when 'isveren'     then (select id from sirketler where etiket = 'dogrulanmis')
         when 'isveren_ham' then (select id from sirketler where etiket = 'ham')
         else null end,
       true
  from kisiler k;

/* Öğrenci profilleri: aday arıyor, kapali_ogrenci aramıyor. */
insert into public.student_profiles (id, is_arayan, staj_arayan)
select k.id,
       (k.etiket = 'aday'),
       false
  from kisiler k where k.etiket in ('aday', 'kapali_ogrenci', 'ilgisiz');

/* ---------------------------------------------------------------- */
/*  1) LİSTE → KONUŞMA: işveren adaya yazıyor                        */
/* ---------------------------------------------------------------- */

select pg_temp.kim_olarak((select id from kisiler where etiket = 'isveren'));
select public.mesaj_gonder((select id from kisiler where etiket = 'aday'), 'Merhaba, ilanımız ilginizi çeker mi?');

select pg_temp.esitle(
  '1. isveren adaya yazdi, sohbet ISTEK olarak acildi',
  'istek',
  (select durum from public.sohbetler
     where kisi_a = least((select id from kisiler where etiket='isveren'), (select id from kisiler where etiket='aday'))
       and kisi_b = greatest((select id from kisiler where etiket='isveren'), (select id from kisiler where etiket='aday')))
);

/* ---------------------------------------------------------------- */
/*  2) ADAY YANITLIYOR → sohbet açılıyor                             */
/* ---------------------------------------------------------------- */

select pg_temp.kim_olarak((select id from kisiler where etiket = 'aday'));
select public.mesaj_gonder((select id from kisiler where etiket = 'isveren'), 'Merhaba, ilgileniyorum.');

select pg_temp.esitle(
  '2. aday yanitlayinca sohbet ACIK',
  'acik',
  (select durum from public.sohbetler
     where kisi_a = least((select id from kisiler where etiket='isveren'), (select id from kisiler where etiket='aday'))
       and kisi_b = greatest((select id from kisiler where etiket='isveren'), (select id from kisiler where etiket='aday')))
);

/* ---------------------------------------------------------------- */
/*  3) İŞVEREN YANITI GÖRÜYOR (RLS ile okuma)                        */
/* ---------------------------------------------------------------- */

set local role authenticated;
select pg_temp.kim_olarak((select id from kisiler where etiket = 'isveren'));

select pg_temp.esitle(
  '3. isveren sohbetteki IKI mesaji da okuyor',
  '2',
  (select count(*)::text from public.mesajlar)
);

/* ---------------------------------------------------------------- */
/*  4) YETKİSİZ ERİŞİM: üçüncü kişi hiçbir şey göremiyor             */
/* ---------------------------------------------------------------- */

select pg_temp.kim_olarak((select id from kisiler where etiket = 'ilgisiz'));

select pg_temp.esitle('4a. ucuncu kisi SOHBETI goremiyor', '0', (select count(*)::text from public.sohbetler));
select pg_temp.esitle('4b. ucuncu kisi MESAJLARI goremiyor', '0', (select count(*)::text from public.mesajlar));

reset role;

/* ---------------------------------------------------------------- */
/*  5–8) REDDEDİLMESİ GEREKEN DURUMLAR                               */
/* ---------------------------------------------------------------- */

select pg_temp.kim_olarak((select id from kisiler where etiket = 'isveren'));
select pg_temp.reddedilmeli(
  '5. arayisi KAPALI ogrenciye yeni sohbet acilamiyor',
  (select id from kisiler where etiket = 'kapali_ogrenci'), 'merhaba', 'yalniz-ogrenciler');

select pg_temp.kim_olarak((select id from kisiler where etiket = 'isveren_ham'));
select pg_temp.reddedilmeli(
  '6. DOGRULANMAMIS sirket yazamiyor',
  (select id from kisiler where etiket = 'aday'), 'merhaba', 'yalniz-ogrenciler');

select pg_temp.kim_olarak((select id from kisiler where etiket = 'kapali_ogrenci'));
select pg_temp.reddedilmeli(
  '7. aday sirkete SOGUK baslatamiyor',
  (select id from kisiler where etiket = 'isveren'), 'merhaba', 'yalniz-ogrenciler');

/* 8) Engel: aday işvereni engelliyor, iki yön de kesiliyor. */
insert into public.blocks (blocker_id, blocked_id)
values ((select id from kisiler where etiket = 'aday'), (select id from kisiler where etiket = 'isveren'));

select pg_temp.kim_olarak((select id from kisiler where etiket = 'isveren'));
select pg_temp.reddedilmeli(
  '8a. engelden sonra isveren yazamiyor',
  (select id from kisiler where etiket = 'aday'), 'tekrar merhaba', 'engel');

select pg_temp.kim_olarak((select id from kisiler where etiket = 'aday'));
select pg_temp.reddedilmeli(
  '8b. engelden sonra aday da yazamiyor',
  (select id from kisiler where etiket = 'isveren'), 'tekrar merhaba', 'engel');

/* 9) Arayış kapansa da SÜREN sohbet kesilmiyor (engeli kaldırıp sınıyoruz). */
delete from public.blocks
 where blocker_id = (select id from kisiler where etiket = 'aday')
   and blocked_id = (select id from kisiler where etiket = 'isveren');
update public.student_profiles set is_arayan = false, staj_arayan = false
 where id = (select id from kisiler where etiket = 'aday');

select pg_temp.kim_olarak((select id from kisiler where etiket = 'isveren'));
select public.mesaj_gonder((select id from kisiler where etiket = 'aday'), 'Suren sohbet kesilmemeli.');
select pg_temp.esitle('9. arayis kapansa da SUREN sohbet suruyor', '3', (select count(*)::text from public.mesajlar));

\echo '--- TUM SINAMALAR GECTI ---'

rollback;
