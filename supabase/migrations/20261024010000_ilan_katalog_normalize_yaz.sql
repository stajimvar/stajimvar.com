/*
  NORMALİZE DEĞERLERİ YAZAN RPC

  Betik satır satır `update` atabilirdi. Atmıyor: 188 satırın 100'ünü
  yazıp hata almak, yarısı normalize yarısı boş bir katalog bırakırdı.
  Fonksiyon gövdesi tek işlem; `raise exception` her şeyi geri alıyor.

  NEDEN HAM HASH KAPISI VAR
  -------------------------
  İlk tasarımda iki kapı vardı: satır sayısı ve kimliklerin katalogda
  olması. İkisi de YETERSİZDİ. Aynı ilan kimlikleri dururken `city`,
  `title`, `source_status`, `apply_url`, `country_code`, `work_type`,
  `application_method` ya da son başvuru tarihi değişirse, snapshot'tan
  çıkan karar artık o satırın gerçeğini anlatmıyor — ve BAYAT
  SINIFLANDIRMA sessizce canlıya yazılıyordu.

  `p_veri_hash` de yalnızca cevapta geri döndürülüyordu: süs bir alan,
  kapı değil. Artık gerçek kapı.

  Kontrol İKİ KEZ yapılıyor. Betik yazımdan hemen önce canlıdan okuyup
  karşılaştırıyor; burada, TRANSACTION İÇİNDE, bir kez daha. İkincisi
  yarış koşusunu kapatıyor: betiğin okuması ile yazması arasında
  gecelik kaynak kontrolü araya girerse, `update` aynı işlemde
  düşüyor.

  HAM HASH'İN ALAN SIRASI `scripts/ilan-katalog-dryrun.mjs` içindeki
  `HAM_ALANLAR` ile BİREBİR AYNI olmak zorunda. Ayıraç U+001F;
  metin alanlarında geçmiyor. `concat_ws` NULL argümanı atladığı ve
  ayıracı basmadığı için HER ALAN `coalesce` ediliyor — tek NULL
  bütün dizeyi kaydırıp iki tarafı ayrıştırırdı.

  ALTI KOLONDAN FAZLASINA DOKUNMUYOR
  ----------------------------------
  `update` cümlesinde yalnız il, ilce, uzaktan, ilan_tipi,
  kaynak_durumu ve apply_url_ok var. `status`, `closed_at`,
  `application_method` ve ham kolonlar cümlede HİÇ GEÇMİYOR.

  `updated_at` DE ELLENMİYOR: normalizasyon ilanın kendisinde bir
  değişiklik değil, bizim ona bakışımızda. Oynatmak `lastmod`
  üzerinden arama motoruna yanlış sinyal gönderirdi.
*/

/* Ham alanların kanonik parmak izi — tek yerde, iki çağıran. */
create or replace function public.ilan_ham_hash(l public.listings)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select md5(concat_ws(
    chr(31),
    coalesce(l.id::text, ''),
    coalesce(l.status::text, ''),
    coalesce(l.application_deadline::text, ''),
    coalesce(l.country_code, ''),
    coalesce(l.city, ''),
    coalesce(l.work_type::text, ''),
    coalesce(l.application_method::text, ''),
    coalesce(l.source_status, ''),
    coalesce(l.apply_url, ''),
    coalesce(l.title, ''),
    coalesce(l.description, '')
  ));
$function$;

comment on function public.ilan_ham_hash(public.listings) is
  'Sınıflandırmayı besleyen ham alanların kanonik md5''i. Alan sırası scripts/ilan-katalog-dryrun.mjs HAM_ALANLAR ile aynı olmalı.';

create or replace function public.ilan_katalog_normalize_yaz(
  p_ham_toplam text,
  p_beklenen_satir integer,
  p_satirlar jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  gelen integer;
  bulunan integer;
  uyusmayan integer;
  yazilan integer;
  canli_toplam text;
  bugun date := current_date;
begin
  select count(*) into gelen from jsonb_array_elements(p_satirlar);

  if gelen <> p_beklenen_satir then
    raise exception 'Satır sayısı uyuşmuyor: gelen %, beklenen %', gelen, p_beklenen_satir;
  end if;

  if p_ham_toplam is null or length(p_ham_toplam) <> 32 then
    raise exception 'Ham toplam hash gerekli (32 karakter md5), gelen: %', coalesce(p_ham_toplam, '(null)');
  end if;

  /*
    KAPI 1 — HER KİMLİK KATALOGDA OLMALI.
    Snapshot alındıktan sonra bir ilan kapanmış olabilir.
  */
  select count(*) into bulunan
    from jsonb_array_elements(p_satirlar) g
    join public.listings l on l.id = (g->>'id')::uuid
   where l.status = 'published'
     and not (l.application_deadline is not null and l.application_deadline < bugun);

  if bulunan <> gelen then
    raise exception 'Katalog değişmiş: % satırın yalnız %si katalogda', gelen, bulunan;
  end if;

  /*
    KAPI 2 — HER SATIRIN HAM ALANLARI SNAPSHOT'TAKİYLE AYNI OLMALI.
    Tek satırın `city`si değişmişse bile tamamı reddediliyor: hangi
    satırın kararının bayat olduğunu satır satır ayıklamak, yarısı
    taze yarısı bayat bir katalog üretme riski demek.
  */
  select count(*) into uyusmayan
    from jsonb_array_elements(p_satirlar) g
    join public.listings l on l.id = (g->>'id')::uuid
   where public.ilan_ham_hash(l) is distinct from (g->>'ham_hash');

  if uyusmayan > 0 then
    raise exception 'Ham veri değişmiş: % satırın ham alanları snapshot ile uyuşmuyor', uyusmayan;
  end if;

  /*
    KAPI 3 — TOPLAM PARMAK İZİ.
    Satır bazlı kontrol yalnız gönderilen kimliklere bakıyor; bu kapı
    KATALOĞUN TAMAMINI ölçüyor, yani araya YENİ bir ilan girmişse de
    yakalıyor.
  */
  select md5(string_agg(l.id::text || ':' || public.ilan_ham_hash(l), E'\n' order by l.id::text))
    into canli_toplam
    from public.listings l
   where l.status = 'published'
     and not (l.application_deadline is not null and l.application_deadline < bugun);

  if canli_toplam is distinct from p_ham_toplam then
    raise exception 'Katalog parmak izi uyuşmuyor: canlı %, snapshot %', canli_toplam, p_ham_toplam;
  end if;

  with g as (
    select (e->>'id')::uuid                          as id,
           nullif(e->>'il','')                       as il,
           nullif(e->>'ilce','')                     as ilce,
           case when e->>'uzaktan' is null then null
                else (e->>'uzaktan')::boolean end    as uzaktan,
           nullif(e->>'ilan_tipi','')                as ilan_tipi,
           nullif(e->>'kaynak_durumu','')            as kaynak_durumu,
           nullif(e->>'apply_url_ok','')             as apply_url_ok
      from jsonb_array_elements(p_satirlar) e
  )
  update public.listings l
     set il            = g.il,
         ilce          = g.ilce,
         uzaktan       = g.uzaktan,
         ilan_tipi     = g.ilan_tipi,
         kaynak_durumu = g.kaynak_durumu,
         apply_url_ok  = g.apply_url_ok
    from g
   where l.id = g.id;

  get diagnostics yazilan = row_count;

  if yazilan <> gelen then
    raise exception 'Yazılan satır (%) gelen satırdan (%) farklı', yazilan, gelen;
  end if;

  return jsonb_build_object(
    'yazilan', yazilan,
    'ham_toplam', p_ham_toplam,
    'an', now()
  );
end;
$function$;

/*
  YALNIZ SERVİS TARAFI ÇAĞIRABİLİR.

  `security definer` fonksiyona sahibinin yetkisini veriyor; anon ya
  da authenticated'a `execute` verilseydi, herhangi bir ziyaretçi
  ilanların normalize alanlarını değiştirebilirdi. Bu projede
  `ilan_bildirim_kuyrugu` bir kez tam bu sınıftan bir gevşeklikle
  anon'a sızdı.
*/
revoke all on function public.ilan_katalog_normalize_yaz(text, integer, jsonb) from public;
revoke all on function public.ilan_katalog_normalize_yaz(text, integer, jsonb) from anon;
revoke all on function public.ilan_katalog_normalize_yaz(text, integer, jsonb) from authenticated;
grant execute on function public.ilan_katalog_normalize_yaz(text, integer, jsonb) to service_role;

revoke all on function public.ilan_ham_hash(public.listings) from public;
revoke all on function public.ilan_ham_hash(public.listings) from anon;
revoke all on function public.ilan_ham_hash(public.listings) from authenticated;
grant execute on function public.ilan_ham_hash(public.listings) to service_role;
