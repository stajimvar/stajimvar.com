-- DOĞRULANMAMIŞ ŞİRKET ADAY VERİSİNE ERİŞEMEZ
--
-- ÖLÇÜLEN AÇIK
-- ------------
-- Üretimdeki `applications` politikaları doğrulamayı İKİ YERDE birden
-- istiyor:
--
--   SELECT "dogrulanmis sirket basvurulari gorur"
--            is_company_member(...) AND sirket_dogrulandi(...)
--   UPDATE "dogrulanmis sirket basvuru durumu gunceller"
--            ... AND sirket_dogrulandi(...)
--
-- Yani ürünün kuralı açık: doğrulanmamış şirket adayı ne GÖRÜR ne
-- DEĞİŞTİRİR. Bu pakette eklenen RPC'ler `security definer` olduğu
-- için politikaları atlıyor ve o sınırı yalnız `is_company_member`
-- ile kuruyordu — doğrulama koşulu düşmüştü.
--
-- Açık olan yollar (hepsi bu göçte kapanıyor):
--
--   OKUMA (aday verisi sızdırıyordu)
--     ilan_bekleyen_adaylar          bekleyen adayların durumu/süresi
--     sirket_is_yuku                 açık başvuru sayıları
--     basvuru_degerlendirme_gecmisi  değerlendirme notları ve puanlar
--     RLS: "sirket degerlendirmeleri gorur"
--
--   YAZMA (doğrulama koşulunu atlıyordu)
--     basvuru_sorumlusu_ata
--     basvurulari_dagit
--     degerlendirme_yaz
--
-- VIEWER KORUNUYOR
-- ----------------
-- Sınır ROL değil ÜYELİK + DOĞRULAMA. Doğrulanmış şirkette Viewer
-- okumaya devam ediyor: başvuruları, iş yükünü, bekleyen adayları ve
-- değerlendirme geçmişini görüyor; yalnız yazamıyor. "Görsün ama
-- karışmasın" kuralı bu göçte daralmıyor.
--
-- ADAY VERİSİ OLMAYANLAR DIŞARIDA
-- -------------------------------
-- `sirket_rolum` (çağıranın kendi rolü), `sirket_ekibi` (takım adları)
-- ve ölçüt tablosu (şirketin kendi politikası) aday verisi değil;
-- bunlara doğrulama koşulu EKLENMİYOR. Doğrulanmamış bir şirketin
-- kendi ekibini görmesi kimseye ait bir bilgi açmıyor ve doğrulama
-- beklerken paneli büsbütün kilitlemek, olmayan bir güvenlik kazancı
-- için ekranı boşaltmak olurdu.

/* ================================================================== */
/*  1) OKUMA KAPISI — POLİTİKANIN AYNISI, TEK YERDE                    */
/* ================================================================== */
--
-- Aynı koşulu dört ayrı yerde elle yazmak, birinin değişip ötekilerin
-- geride kalması demekti. SELECT politikasıyla BİREBİR aynı cümle.
create or replace function public.sirket_adaylarini_gorebilir(hedef uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_company_member(hedef) and public.sirket_dogrulandi(hedef)
$$;

revoke all on function public.sirket_adaylarini_gorebilir(uuid) from public, anon;
grant execute on function public.sirket_adaylarini_gorebilir(uuid) to authenticated;

comment on function public.sirket_adaylarini_gorebilir(uuid) is
  'Aday verisi okuma kapısı: üyelik + şirket doğrulaması. applications SELECT politikasının aynısı. Rol SORULMUYOR — Viewer da okur.';

/* ================================================================== */
/*  2) YAZMA KAPISI — DOĞRULAMA EKLENİYOR                              */
/* ================================================================== */
--
-- Tek yerde kapatmak, üç yazma RPC'sini birden kapatıyor
-- (`basvuru_sorumlusu_ata`, `basvurulari_dagit`, `degerlendirme_yaz`).
-- `applications` UPDATE politikası doğrulamayı AYRICA soruyor; o
-- kontrol bilerek bırakılıyor — iki kat koruma, birinin ileride
-- gevşemesine karşı.
create or replace function public.sirket_basvuru_yazabilir(hedef uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.sirket_dogrulandi(hedef)
     and exists (
    select 1 from public.company_members cm
     where cm.company_id = hedef
       and cm.user_id = auth.uid()
       and (cm.is_owner or coalesce(nullif(btrim(cm.recruiter_role), ''), 'Viewer') in ('Owner', 'Recruiter'))
  )
$$;

comment on function public.sirket_basvuru_yazabilir(uuid) is
  'Başvuruya yazma kapısı: şirket DOĞRULANMIŞ olmalı ve üye Owner/Recruiter olmalı. Viewer false alır.';

/* ================================================================== */
/*  3) OKUMA RPC'LERİ KAPIYI KULLANIYOR                                */
/* ================================================================== */

/* Bekleyen adaylar: ilan kapanışındaki liste. */
create or replace function public.ilan_bekleyen_adaylar(p_ilan uuid)
returns table (
  basvuru_id   uuid,
  durum        text,
  bekleme_gun  integer,
  atanan_uye   uuid
)
language sql stable security definer set search_path = public
as $$
  select
    a.id,
    a.status::text,
    extract(day from (now() - greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at)))::int,
    a.atanan_uye
  from public.applications a
  join public.listings l on l.id = a.listing_id
  where a.listing_id = p_ilan
    and public.sirket_adaylarini_gorebilir(l.company_id)
    and a.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
  order by greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at)
$$;

revoke all on function public.ilan_bekleyen_adaylar(uuid) from public, anon;
grant execute on function public.ilan_bekleyen_adaylar(uuid) to authenticated;

/* İş yükü: açık başvuru sayıları. */
create or replace function public.sirket_is_yuku(p_sirket uuid)
returns table (
  uye_id uuid,
  ad     text,
  acik   bigint
)
language sql stable security definer set search_path = public
as $$
  select
    a.atanan_uye,
    case
      when a.atanan_uye is null then 'Sorumlusu yok'
      else coalesce(nullif(btrim(p.full_name), ''), 'Ekip üyesi')
    end as ad,
    count(*) as acik
  from public.applications a
  join public.listings l on l.id = a.listing_id
  left join public.profiles p on p.id = a.atanan_uye
  where l.company_id = p_sirket
    and public.sirket_adaylarini_gorebilir(p_sirket)
    and a.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
  group by a.atanan_uye, p.full_name
  order by count(*) desc, ad
$$;

revoke all on function public.sirket_is_yuku(uuid) from public, anon;
grant execute on function public.sirket_is_yuku(uuid) to authenticated;

/* Değerlendirme geçmişi: puanlar ve iç notlar. */
create or replace function public.basvuru_degerlendirme_gecmisi(p_basvuru uuid)
returns table (
  id            uuid,
  degerlendiren uuid,
  ad            text,
  puanlar       jsonb,
  not_metni     text,
  created_at    timestamptz
)
language sql stable security definer set search_path = public
as $$
  select d.id, d.degerlendiren,
         coalesce(nullif(btrim(p.full_name), ''), 'Ekip üyesi'),
         d.puanlar, d.not_metni, d.created_at
    from public.basvuru_degerlendirmeleri d
    left join public.profiles p on p.id = d.degerlendiren
    join public.applications a on a.id = d.basvuru_id
    join public.listings l on l.id = a.listing_id
   where d.basvuru_id = p_basvuru
     and public.sirket_adaylarini_gorebilir(l.company_id)
   order by d.created_at desc
$$;

revoke all on function public.basvuru_degerlendirme_gecmisi(uuid) from public, anon;
grant execute on function public.basvuru_degerlendirme_gecmisi(uuid) to authenticated;

/* ================================================================== */
/*  4) DEĞERLENDİRME SATIRLARININ RLS'İ                                */
/* ================================================================== */
--
-- Tabloyu doğrudan okuyan bir istemci RPC'yi atlayabilirdi; kapı
-- politikaya da konuyor.
drop policy if exists "sirket degerlendirmeleri gorur" on public.basvuru_degerlendirmeleri;
create policy "sirket degerlendirmeleri gorur" on public.basvuru_degerlendirmeleri
  for select to authenticated
  using (
    exists (
      select 1 from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.id = basvuru_degerlendirmeleri.basvuru_id
        and public.sirket_adaylarini_gorebilir(l.company_id)
    )
  );

/* ================================================================== */
/*  5) ATAMA RPC'Sİ SATIRIN TAMAMINI DÖNDÜRMÜYOR                       */
/* ================================================================== */
--
-- Önce `returns public.applications` idi: `security definer` bir işlev
-- başvurunun BÜTÜN alanlarını (ön yazı, özgeçmiş yolu, profil kopyası,
-- öğrenci kimliği) çağırana veriyordu. Atama işleminin cevabı olarak
-- bunların hiçbiri gerekmiyor — istemci zaten dönüşü kullanmıyor
-- (`sorumluAta` → Promise<void>).
--
-- EN AZ VERİ: yalnız atamanın kendisi dönüyor. Bir işlevin döndürdüğü
-- şey, işin gerektirdiğinden fazla olmamalı.
--
-- Dönüş TİPİ değiştiği için `create or replace` yetmiyor; düşürülüp
-- yeniden yazılıyor ve yetkiler yeniden veriliyor.
drop function if exists public.basvuru_sorumlusu_ata(uuid, uuid, uuid);

create function public.basvuru_sorumlusu_ata(
  p_basvuru uuid,
  p_uye uuid,
  p_beklenen uuid default null
)
returns table (basvuru_id uuid, atanan_uye uuid, atanan_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  sirket uuid;
  satir  public.applications%rowtype;
begin
  if auth.uid() is null then
    raise exception 'oturum-yok' using errcode = '42501';
  end if;

  select l.company_id into sirket
    from public.applications a
    join public.listings l on l.id = a.listing_id
   where a.id = p_basvuru;

  if sirket is null then
    raise exception 'basvuru-yok' using errcode = 'P0001';
  end if;

  /*
    Kapı artık DOĞRULAMAYI da içeriyor (bu göçün 2. bölümü).
    Doğrulanmamış şirket buradan ne okuyabiliyor ne yazabiliyor;
    `basvuru-yok` demeden önce yetki sorulmuyor ki var olmayan bir
    başvuru ile yetkisiz bir başvuru ayırt edilebilsin — ikisi de
    çağıranın kendi şirketindeki bir kimlik için anlamlı.
  */
  if not public.sirket_basvuru_yazabilir(sirket) then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;

  /*
    SORUMLU AYNI ŞİRKETTEN VE YAZABİLEN BİRİ OLMALI.
    `p_uye` null ise atama KALDIRILIYOR — o her zaman geçerli.
  */
  if p_uye is not null and not exists (
    select 1 from public.company_members cm
     where cm.company_id = sirket
       and cm.user_id = p_uye
       and (cm.is_owner or coalesce(nullif(btrim(cm.recruiter_role), ''), 'Viewer') in ('Owner', 'Recruiter'))
  ) then
    raise exception 'uye-uygun-degil' using errcode = 'P0001';
  end if;

  select * into satir from public.applications where id = p_basvuru for update;

  /* Çağıranın gördüğü değer artık geçerli değilse yazma. */
  if satir.atanan_uye is distinct from p_beklenen then
    raise exception 'sorumlu-degisti' using errcode = 'P0001';
  end if;

  update public.applications
     set atanan_uye = p_uye,
         atanan_at  = case when p_uye is null then null else now() end
   where id = p_basvuru
  returning id, applications.atanan_uye, applications.atanan_at
       into basvuru_id, atanan_uye, atanan_at;

  return next;
end;
$$;

revoke all on function public.basvuru_sorumlusu_ata(uuid, uuid, uuid) from public, anon;
grant execute on function public.basvuru_sorumlusu_ata(uuid, uuid, uuid) to authenticated;

comment on function public.basvuru_sorumlusu_ata(uuid, uuid, uuid) is
  'Başvuruya sorumlu atar. Doğrulanmış şirketin Owner/Recruiter üyesi çağırabilir. Yalnız atama bilgisini döndürür; başvuru satırının tamamını DÖNDÜRMEZ.';
