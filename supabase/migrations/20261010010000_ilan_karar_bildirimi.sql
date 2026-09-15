-- İLAN ONAY/RET KARARI ARTIK ŞİRKETE E-POSTAYLA GİDİYOR
--
-- §7'DEKİ AÇIK BOŞLUK
-- --------------------
-- `ilan_incele` (20261008010000) durumu, notu ve izi tek işlemde
-- yazıyor ama kimseye haber vermiyor. `/isveren` ve ilan formu şirkete
-- "sonucu panelinde göreceksin" diyor, çünkü GERÇEKTEN bağlı tek yol o.
-- Şirket kararı öğrenmek için panele girmek zorunda.
--
-- İKİNCİ KUYRUK SİSTEMİ KURULMADI
-- -------------------------------
-- `listing_reports` (20260929010000 + 20260930010000) tam bu deseni
-- kurmuştu: kuyruk durumu ayrı bir tabloda değil, olayın KENDİ satırında;
-- `for update skip locked` ile eş zamanlı işçi çakışmıyor; başarısızlıkta
-- 2^deneme dakika üstel bekleme. Aynı desen burada `listings` üzerine
-- uygulandı — ayrı bir kuyruk tablosu, aynı olayı iki yerde tutup
-- ayrışmasına kapı açardı.
--
-- GERİYE DÖNÜK TARAMA YOK — BU ÖNEMLİ
-- ------------------------------------
-- `listings` tablosunda halihazırda onaylanmış/reddedilmiş yüzlerce satır
-- var (`reviewed_at` dolu). Yeni kolonlar "bekliyor" anlamına gelecek
-- şekilde varsayılansız bırakılsaydı, bu göç uygulanır uygulanmaz haftalar
-- önce karar verilmiş her ilan için şirkete geç kalmış bir e-posta
-- kuyruğa girerdi. Bunu önlemek için:
--
--   karar_bildirim_at   varsayılan now()  → "zaten bildirildi" (bekleyen
--                                            değil), null = bekliyor
--
-- Var olan satırlar göç anında now() alıp kuyruğun DIŞINDA kalıyor.
-- `ilan_incele` (aşağıda yeniden tanımlanıyor) HER karar yazışında bu
-- alanı açıkça null'a çekiyor — yani yalnızca BUNDAN SONRAKİ kararlar
-- kuyruğa giriyor.
alter table public.listings
  add column if not exists karar_bildirim_at timestamptz default now(),
  add column if not exists karar_bildirim_denemeleri integer not null default 0,
  add column if not exists karar_bildirim_sonraki_at timestamptz not null default now(),
  add column if not exists karar_bildirim_son_hata text;

comment on column public.listings.karar_bildirim_at is
  'Onay/ret kararının şirkete e-postayla ulaştığı an. null = kuyrukta '
  'bekliyor. Göç anında var olan satırlar now() ile başlıyor ki eski '
  'kararlar için geriye dönük e-posta gitmesin; yalnız ilan_incele''nin '
  'BUNDAN SONRA yazdığı kararlar null''a çekilip kuyruğa giriyor.';

/*
  BU KOLONLARA CLIENT'IN İHTİYACI YOK — YETKİ HİÇ VERİLMEDİ

  `listings` kolon kolon SELECT yetkisi veriyor (bkz. §5, 20261004010000)
  ve istemcinin göndermediği bir kolonu SORMAK sorun değil — sorun
  isteyip de yetkisi olmayan bir kolonu istemek. Hiçbir arayüz sorgusu
  (`src/lib/queries`, `src/lib/sirket-veri.ts`) bu dört kolonu açıkça
  istemiyor; o yüzden anon/authenticated'a select bile verilmiyor —
  review_note/reviewed_at/reviewed_by'dan FARKLI olarak bunlar şirkete
  hiç gösterilmeyen saf işletim alanları. Yazma zaten yalnız aşağıdaki
  security definer fonksiyonlardan geçiyor.
*/

create index if not exists listings_karar_bildirim_kuyruk_idx
  on public.listings (karar_bildirim_sonraki_at)
  where karar_bildirim_at is null;

/** Bir karar bildirimi için en fazla e-posta denemesi. */
create or replace function public.ilan_karar_bildirim_deneme_siniri()
returns integer language sql immutable as $$ select 8 $$;

/*
  YÖNETİCİ İNCELEME RPC'Sİ — HER KARARDA KUYRUĞU SIFIRLIYOR
  -----------------------------------------------------------
  20261008010000'deki gövdenin birebir aynısı, tek fark: karar
  yazıldıktan sonra dört kuyruk alanı sıfırlanıyor. Böylece bir ilan
  yeniden incelenirse (ret sonrası düzeltilip tekrar gönderilip yeniden
  karar verilirse) YENİ karar da e-postayla gidiyor — önceki kararın
  gönderilmiş olması ikincisini sessiz bırakmıyor.
*/
create or replace function public.ilan_incele(
  p_ilan uuid,
  p_karar text,
  p_not text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'Bu islem yalnizca yoneticiye acik'
      using errcode = 'insufficient_privilege';
  end if;

  if p_karar not in ('onayla', 'reddet') then
    raise exception 'Karar onayla ya da reddet olmali'
      using errcode = 'check_violation';
  end if;

  if p_karar = 'reddet' and coalesce(btrim(p_not), '') = '' then
    raise exception 'Ret icin not zorunlu'
      using errcode = 'check_violation';
  end if;

  update public.listings
     set status      = case when p_karar = 'onayla' then 'published' else 'draft' end::public.listing_status,
         posted_at   = case when p_karar = 'onayla' then now() else posted_at end,
         review_note = p_not,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         /* Bu karar henüz kimseye gitmedi: kuyruğa gir. */
         karar_bildirim_at = null,
         karar_bildirim_denemeleri = 0,
         karar_bildirim_sonraki_at = now(),
         karar_bildirim_son_hata = null
   where id = p_ilan;

  if not found then
    raise exception 'Ilan bulunamadi' using errcode = 'no_data_found';
  end if;
end;
$function$;

revoke all on function public.ilan_incele(uuid, text, text) from public;
revoke all on function public.ilan_incele(uuid, text, text) from anon;
grant execute on function public.ilan_incele(uuid, text, text) to authenticated;

comment on function public.ilan_incele(uuid, text, text) is
  'Yöneticinin ilan onay/ret kararı. Durumu, notu ve izi TEK işlemde '
  'yazıyor; aynı işlemde karar bildirim kuyruğunu da sıfırlıyor (20261010010000) '
  'ki her yeni karar şirkete e-postayla gitsin. is_admin() içeride '
  'sorgulanıyor; anon çağıramıyor. Ret için not zorunlu.';

/**
 * İŞÇİ KAYDI ALIR — EŞ ZAMANLI İŞÇİ AYNI KAYDI ALMAZ
 *
 * `ilan_bildirimi_kuyruktan_al` ile aynı kalıp (20260930010000):
 * `for update skip locked`, alınan satırın sonraki deneme zamanı kilit
 * penceresi kadar ileri atılıyor. Alıcı e-postası burada, RPC İÇİNDE
 * çözülüyor: şirketin sahip (is_owner) üyesi yoksa en eski üyeye
 * düşülüyor. İstemci hiçbir zaman bu sorguyu çalıştıramaz — fonksiyon
 * yalnız service_role'e açık.
 */
create or replace function public.ilan_karar_bildirimi_kuyruktan_al(
  p_adet integer default 20,
  p_kilit_dakika integer default 10
)
returns table (
  id uuid,
  title text,
  status public.listing_status,
  review_note text,
  reviewed_at timestamptz,
  company_name text,
  alici_email text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  with adaylar as (
    select l.id
      from public.listings l
     where l.karar_bildirim_at is null
       and l.reviewed_at is not null
       and l.karar_bildirim_denemeleri < public.ilan_karar_bildirim_deneme_siniri()
       and l.karar_bildirim_sonraki_at <= now()
     order by l.reviewed_at
     limit greatest(1, least(p_adet, 100))
       for update of l skip locked
  ),
  alinan as (
    update public.listings l
       set karar_bildirim_sonraki_at = now() + make_interval(mins => greatest(1, p_kilit_dakika))
      from adaylar
     where l.id = adaylar.id
    returning l.id, l.title, l.status, l.review_note, l.reviewed_at, l.company_id
  )
  select a.id, a.title, a.status, a.review_note, a.reviewed_at,
         c.name,
         /*
           ALICI: ŞİRKETİN SAHİBİ, YOKSA EN ESKİ ÜYE

           `companies`'te ayrı bir "hr_email" alanı yok — hesabın kendi
           e-postası `profiles.email` üzerinden, `company_members` ile
           bağlanıyor. Sahip işaretli üye varsa o, yoksa (veri eskiyse ya
           da hiç sahip atanmamışsa) en eski üye tercih ediliyor; hiç üye
           yoksa alici_email null döner ve işçi bunu hatasız bir hata
           olarak işaretler (aşağıya bakınız).
         */
         (select pr.email
            from public.company_members cm
            join public.profiles pr on pr.id = cm.user_id
           where cm.company_id = a.company_id
           order by cm.is_owner desc, cm.created_at asc
           limit 1)
    from alinan a
    join public.companies c on c.id = a.company_id;
end;
$$;

revoke all on function public.ilan_karar_bildirimi_kuyruktan_al(integer, integer) from public;
revoke all on function public.ilan_karar_bildirimi_kuyruktan_al(integer, integer) from anon;
revoke all on function public.ilan_karar_bildirimi_kuyruktan_al(integer, integer) from authenticated;

/**
 * Denemeyi işaretler. Başarısızlıkta ÜSTEL BEKLEME (aynı formül:
 * 20260930010000). Alıcı e-postası hiç bulunamadıysa da bu yoldan
 * "başarısız" işaretlenir — sekiz denemenin sonunda kayıt kuyruktan
 * düşer ve `karar_bildirim_son_hata` sebebi taşır.
 */
create or replace function public.ilan_karar_bildirimi_kuyruk_isaretle(
  p_id       uuid,
  p_basarili boolean,
  p_hata     text default null
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.listings
     set karar_bildirim_denemeleri = karar_bildirim_denemeleri + 1,
         karar_bildirim_at = case when p_basarili then now() else karar_bildirim_at end,
         karar_bildirim_son_hata = case when p_basarili then null else left(p_hata, 500) end,
         karar_bildirim_sonraki_at = case
           when p_basarili then karar_bildirim_sonraki_at
           else now() + make_interval(mins => power(2, least(karar_bildirim_denemeleri + 1, 7))::int)
         end
   where id = p_id;
$$;

revoke all on function public.ilan_karar_bildirimi_kuyruk_isaretle(uuid, boolean, text) from public;
revoke all on function public.ilan_karar_bildirimi_kuyruk_isaretle(uuid, boolean, text) from anon;
revoke all on function public.ilan_karar_bildirimi_kuyruk_isaretle(uuid, boolean, text) from authenticated;
