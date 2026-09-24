-- MESAJLAŞMA — ilk sürüm: öğrenciler arası, yalnız metin, mesaj istekleri
--
-- ÜRÜN KARARLARI (kullanıcı, 24 Eylül 2026)
-- -----------------------------------------
--   kim kime       herkes yazabilir; BAĞLANTI OLMAYANIN mesajı alıcının
--                  "Mesaj istekleri" kutusuna düşer (Instagram/X kalıbı)
--   kimler         şimdilik yalnız ÖĞRENCİLER (şirket sayfaları hariç)
--   içerik         yalnız metin; okundu bilgisi, anlık gelme, sohbet
--                  listesi, engelleme ve şikâyet
--
-- YAZMA YALNIZ RPC'DEN
-- --------------------
-- Tablolarda istemciye INSERT/UPDATE/DELETE yetkisi YOK. Kural sayısı
-- çok (istek sınırı, engel, görünürlük, yanıtla kabul, hız sınırı) ve
-- politikalara dağıtılsaydı biri eksik kaldığında ötekiler onu
-- yakalamazdı. Her yazma aşağıdaki `security definer` fonksiyonlardan
-- geçiyor; okuma RLS ile (Realtime da RLS'e tabi, bu yüzden okuma
-- politikası şart).
--
-- İKİ KİŞİ, TEK SOHBET
-- --------------------
-- Çift `kisi_a < kisi_b` sırasıyla saklanıyor ve tekil: aynı iki kişi
-- arasında ikinci bir sohbet açılamıyor, "önce kim yazdı" yarışında iki
-- satır oluşmuyor.

/* ================================================================== */
/*  1) TABLOLAR                                                        */
/* ================================================================== */

create table if not exists public.sohbetler (
  id            uuid primary key default gen_random_uuid(),
  kisi_a        uuid not null references public.social_profiles(profile_id) on delete cascade,
  kisi_b        uuid not null references public.social_profiles(profile_id) on delete cascade,
  /* İsteği kim açtı: "istek" durumunda alıcı öteki kişi. */
  baslatan      uuid not null,
  durum         text not null default 'istek' check (durum in ('istek', 'acik')),
  kabul_at      timestamptz,
  son_mesaj_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  constraint sohbet_cift_sirali check (kisi_a < kisi_b),
  constraint sohbet_baslatan_uye check (baslatan in (kisi_a, kisi_b)),
  constraint sohbet_cift_tekil unique (kisi_a, kisi_b)
);

create index if not exists sohbetler_kisi_b on public.sohbetler (kisi_b);

create table if not exists public.mesajlar (
  id          uuid primary key default gen_random_uuid(),
  sohbet_id   uuid not null references public.sohbetler(id) on delete cascade,
  gonderen    uuid not null references public.social_profiles(profile_id) on delete cascade,
  /* Boşluktan ibaret mesaj yok; 2000 karakter sınırı istemcide de aynı. */
  metin       text not null check (char_length(metin) between 1 and 2000 and btrim(metin) <> ''),
  created_at  timestamptz not null default now()
);

create index if not exists mesajlar_sohbet_zaman on public.mesajlar (sohbet_id, created_at desc);
create index if not exists mesajlar_gonderen_zaman on public.mesajlar (gonderen, created_at desc);

/*
  OKUNDU BİLGİSİ AYRI TABLODA

  Sohbet satırında iki kolon olsaydı, istek aşamasında gönderen kişi
  alıcının okuma anını da okurdu: RLS satırı açıyor, kolonu seçemiyor.
  Ayrı tabloda kural satır düzeyinde yazılabiliyor: kendi okuma satırın
  her zaman, karşı tarafınki yalnız sohbet AÇIKKEN görünüyor. İstek
  bekleyen kişi "görüldü" bilgisiyle baskı kuramıyor.
*/
create table if not exists public.sohbet_okumalari (
  sohbet_id  uuid not null references public.sohbetler(id) on delete cascade,
  profil_id  uuid not null references public.social_profiles(profile_id) on delete cascade,
  okundu_at  timestamptz not null default now(),
  primary key (sohbet_id, profil_id)
);

/*
  SİLİNEN İSTEKLERİN İZİ

  Alıcı isteği sildiğinde sohbet satırı mesajlarıyla birlikte gidiyor.
  İz tutulmasaydı gönderen aynı anda yeni bir istek açabilir ve silme
  bir taciz döngüsüne dönerdi. İz yalnız sunucuda: istemciye hiçbir
  yetki yok, kimse "beni reddetti mi" diye soramıyor.
*/
create table if not exists public.sohbet_istek_redleri (
  kimden      uuid not null references public.social_profiles(profile_id) on delete cascade,
  kime        uuid not null references public.social_profiles(profile_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (kimden, kime)
);

/*
  YETKİLER: varsayılan ayrıcalıklar yeni tabloya `authenticated` için
  yazma, `anon` için okuma veriyor (0012). Hepsi geri alınıyor; yalnız
  okuma veriliyor, o da RLS'e tabi. Red izine hiçbir yetki yok.
*/
revoke all on public.sohbetler, public.mesajlar, public.sohbet_okumalari, public.sohbet_istek_redleri
  from anon, authenticated;
grant select on public.sohbetler, public.mesajlar, public.sohbet_okumalari to authenticated;

alter table public.sohbetler enable row level security;
alter table public.mesajlar enable row level security;
alter table public.sohbet_okumalari enable row level security;
alter table public.sohbet_istek_redleri enable row level security;

/* ================================================================== */
/*  2) YARDIMCILAR — sosyal_gizli, PostgREST'e kapalı                  */
/* ================================================================== */

/* Şirket sayfası değil, öğrencinin sosyal profili. */
create or replace function sosyal_gizli.ogrenci_sosyal_mi(kim uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.social_profiles sp
     where sp.profile_id = kim and sp.sirket_id is null
  )
$$;

create or replace function sosyal_gizli.bagli_mi(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.connections c
     where c.durum = 'kabul'
       and ((c.requester_id = a and c.addressee_id = b) or (c.requester_id = b and c.addressee_id = a))
  )
$$;

/*
  Oturum sahibi bu sohbetin üyesi mi ve arada engel yok mu?

  Engel eklendiğinde sohbet İKİ TARAFA DA görünmez oluyor (satır
  silinmiyor; engel kalkarsa geri geliyor). Okuma politikalarının üçü
  de bu tek fonksiyondan geçiyor: kural üç yerde ayrışamıyor.
*/
create or replace function sosyal_gizli.sohbet_uyesi_mi(p_sohbet uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.sohbetler s
     where s.id = p_sohbet
       and auth.uid() in (s.kisi_a, s.kisi_b)
       and not sosyal_gizli.engelli_mi(case when s.kisi_a = auth.uid() then s.kisi_b else s.kisi_a end)
  )
$$;

/* ================================================================== */
/*  3) OKUMA POLİTİKALARI                                              */
/* ================================================================== */

drop policy if exists "sohbet uyesi okur" on public.sohbetler;
create policy "sohbet uyesi okur" on public.sohbetler
  for select to authenticated
  using (sosyal_gizli.sohbet_uyesi_mi(id));

drop policy if exists "sohbet uyesi mesajlari okur" on public.mesajlar;
create policy "sohbet uyesi mesajlari okur" on public.mesajlar
  for select to authenticated
  using (sosyal_gizli.sohbet_uyesi_mi(sohbet_id));

/*
  Yönetici YALNIZ ŞİKÂYET EDİLEN mesajı okuyabiliyor. Bütün mesajlara
  yönetici erişimi, özel yazışmayı gereksiz yere açmak olurdu.
*/
drop policy if exists "yonetici sikayet edilen mesaji okur" on public.mesajlar;
create policy "yonetici sikayet edilen mesaji okur" on public.mesajlar
  for select to authenticated
  using (
    public.is_admin()
    and exists (
      select 1 from public.reports r
       where r.hedef_tur = 'mesaj' and r.hedef_id = mesajlar.id
    )
  );

drop policy if exists "okuma bilgisi kurali" on public.sohbet_okumalari;
create policy "okuma bilgisi kurali" on public.sohbet_okumalari
  for select to authenticated
  using (
    sosyal_gizli.sohbet_uyesi_mi(sohbet_id)
    and (
      profil_id = auth.uid()
      or exists (select 1 from public.sohbetler s where s.id = sohbet_id and s.durum = 'acik')
    )
  );

/* ================================================================== */
/*  4) YAZMA — RPC'LER                                                 */
/* ================================================================== */

/*
  MESAJ GÖNDER

  Hata kodları MESAJ olarak atılıyor (paylaşım RPC'leriyle aynı kalıp):
    oturum-yok · kendine-mesaj-yok · mesaj-bos · mesaj-cok-uzun ·
    yalniz-ogrenciler · engel · profil-gorunmuyor · istek-reddedildi ·
    istek-siniri · istek-bekliyor · cok-hizli

  SIRA
    1. Sohbet varsa kilitleniyor (`for update`): aynı anda iki gönderim
       durum geçişini ikiye bölmesin.
    2. Yoksa açılıyor: bağlantı varsa 'acik', yoksa 'istek'.
    3. 'istek' durumunda:
         alıcı yanıt verirse istek KABUL EDİLMİŞ sayılıyor (yanıt
         vermek kabul etmenin en açık hâli);
         başlatan, kabul edilene kadar en çok 3 mesaj yazabiliyor;
         bu arada bağlantı kurulduysa sohbet kendiliğinden açılıyor.

  GÖRÜNÜRLÜK: yeni bir sohbet ya da bekleyen bir istek için alıcının
  profili bakana görünür olmalı (`sosyal_gorunur`). AÇIK bir sohbet ise
  profil sonradan gizlense de sürüyor — yalnız engel kesiyor.
*/
create or replace function public.mesaj_gonder(p_alici uuid, p_metin text)
returns public.mesajlar
language plpgsql security definer set search_path = public
as $$
declare
  ben      uuid := auth.uid();
  metin    text := btrim(coalesce(p_metin, ''));
  a        uuid;
  b        uuid;
  s        public.sohbetler%rowtype;
  sonuc    public.mesajlar%rowtype;
begin
  if ben is null then
    raise exception 'oturum-yok' using errcode = '42501';
  end if;
  if p_alici is null or p_alici = ben then
    raise exception 'kendine-mesaj-yok' using errcode = 'P0001';
  end if;
  if metin = '' then
    raise exception 'mesaj-bos' using errcode = 'P0001';
  end if;
  if char_length(metin) > 2000 then
    raise exception 'mesaj-cok-uzun' using errcode = 'P0001';
  end if;
  if not sosyal_gizli.ogrenci_sosyal_mi(ben) or not sosyal_gizli.ogrenci_sosyal_mi(p_alici) then
    raise exception 'yalniz-ogrenciler' using errcode = 'P0001';
  end if;
  if sosyal_gizli.engelli_mi(p_alici) then
    raise exception 'engel' using errcode = 'P0001';
  end if;

  /* Hız sınırı: dakikada 30 mesaj. */
  if (select count(*) from public.mesajlar m
       where m.gonderen = ben and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'cok-hizli' using errcode = 'P0001';
  end if;

  a := least(ben, p_alici);
  b := greatest(ben, p_alici);

  select * into s from public.sohbetler where kisi_a = a and kisi_b = b for update;

  if not found then
    if not sosyal_gizli.sosyal_gorunur(p_alici) then
      raise exception 'profil-gorunmuyor' using errcode = 'P0001';
    end if;

    if sosyal_gizli.bagli_mi(ben, p_alici) then
      insert into public.sohbetler (kisi_a, kisi_b, baslatan, durum, kabul_at)
      values (a, b, ben, 'acik', now())
      returning * into s;
    else
      /* Silinmiş isteğin ardından 30 gün yeni istek yok. */
      if exists (
        select 1 from public.sohbet_istek_redleri r
         where r.kimden = ben and r.kime = p_alici and r.created_at > now() - interval '30 days'
      ) then
        raise exception 'istek-reddedildi' using errcode = 'P0001';
      end if;
      /* Günde en çok 20 yeni istek. */
      if (select count(*) from public.sohbetler x
           where x.baslatan = ben and x.durum = 'istek' and x.created_at > now() - interval '1 day') >= 20 then
        raise exception 'istek-siniri' using errcode = 'P0001';
      end if;
      insert into public.sohbetler (kisi_a, kisi_b, baslatan, durum)
      values (a, b, ben, 'istek')
      returning * into s;
    end if;

  elsif s.durum = 'istek' then
    if s.baslatan = ben then
      if sosyal_gizli.bagli_mi(ben, p_alici) then
        update public.sohbetler set durum = 'acik', kabul_at = now() where id = s.id returning * into s;
      else
        if not sosyal_gizli.sosyal_gorunur(p_alici) then
          raise exception 'profil-gorunmuyor' using errcode = 'P0001';
        end if;
        if (select count(*) from public.mesajlar m where m.sohbet_id = s.id and m.gonderen = ben) >= 3 then
          raise exception 'istek-bekliyor' using errcode = 'P0001';
        end if;
      end if;
    else
      /* Alıcı yanıtladı: istek kabul edildi. */
      update public.sohbetler set durum = 'acik', kabul_at = now() where id = s.id returning * into s;
    end if;
  end if;

  insert into public.mesajlar (sohbet_id, gonderen, metin)
  values (s.id, ben, metin)
  returning * into sonuc;

  update public.sohbetler set son_mesaj_at = sonuc.created_at where id = s.id;

  /* Yazan kişi sohbeti okumuş sayılıyor: kendi mesajı okunmamış görünmesin. */
  insert into public.sohbet_okumalari (sohbet_id, profil_id, okundu_at)
  values (s.id, ben, sonuc.created_at)
  on conflict (sohbet_id, profil_id) do update set okundu_at = excluded.okundu_at;

  return sonuc;
end;
$$;

/* İsteği kabul et — yalnız alıcı, yalnız 'istek' durumunda. */
create or replace function public.sohbet_istegini_kabul_et(p_sohbet uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  ben uuid := auth.uid();
begin
  if ben is null then
    raise exception 'oturum-yok' using errcode = '42501';
  end if;
  update public.sohbetler s
     set durum = 'acik', kabul_at = now()
   where s.id = p_sohbet
     and s.durum = 'istek'
     and s.baslatan <> ben
     and ben in (s.kisi_a, s.kisi_b)
     and sosyal_gizli.sohbet_uyesi_mi(s.id);
  if not found then
    raise exception 'istek-yok' using errcode = 'P0001';
  end if;
end;
$$;

/*
  İsteği sil — yalnız alıcı. Sohbet mesajlarıyla birlikte gidiyor ve
  gönderen 30 gün yeni istek açamıyor (bkz. `sohbet_istek_redleri`).
  Gönderene bildirim gitmiyor; silme sessiz.
*/
create or replace function public.sohbet_istegini_sil(p_sohbet uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  ben uuid := auth.uid();
  s   public.sohbetler%rowtype;
begin
  if ben is null then
    raise exception 'oturum-yok' using errcode = '42501';
  end if;
  select * into s from public.sohbetler x
   where x.id = p_sohbet and x.durum = 'istek' and x.baslatan <> ben and ben in (x.kisi_a, x.kisi_b)
   for update;
  if not found then
    raise exception 'istek-yok' using errcode = 'P0001';
  end if;

  insert into public.sohbet_istek_redleri (kimden, kime, created_at)
  values (s.baslatan, ben, now())
  on conflict (kimden, kime) do update set created_at = excluded.created_at;

  delete from public.sohbetler where id = s.id;
end;
$$;

/* Okundu işareti — yalnız üye; engelli sohbette sessizce hiçbir şey yapmıyor. */
create or replace function public.sohbet_okundu(p_sohbet uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'oturum-yok' using errcode = '42501';
  end if;
  if not sosyal_gizli.sohbet_uyesi_mi(p_sohbet) then
    return;
  end if;
  insert into public.sohbet_okumalari (sohbet_id, profil_id, okundu_at)
  values (p_sohbet, auth.uid(), now())
  on conflict (sohbet_id, profil_id) do update set okundu_at = excluded.okundu_at;
end;
$$;

/* ================================================================== */
/*  5) OKUMA — RPC'LER                                                 */
/* ================================================================== */

/*
  SOHBET LİSTESİ

  `p_kutu`:
    'gelen'     açık sohbetler + BENİM açtığım bekleyen istekler
                (gönderdiğim mesaj kendi listemde durmalı)
    'istekler'  bana gelen, henüz kabul etmediğim istekler

  `karsi_okundu_at` yalnız AÇIK sohbette dolu — okuma politikasıyla aynı
  kural. Karşı tarafın profil alanları, profil sorgusunun okuduğu
  alanlar; görünürlüğü kapalı bir profilin avatarı zaten depolama
  kapısında duruyor.
*/
create or replace function public.sohbetlerim(p_kutu text default 'gelen')
returns table (
  sohbet_id           uuid,
  karsi_id            uuid,
  karsi_kullanici_adi text,
  karsi_gorunen_ad    text,
  karsi_avatar_path   text,
  karsi_resmi_mi      boolean,
  durum               text,
  ben_baslattim       boolean,
  son_mesaj           text,
  son_mesaj_benim     boolean,
  son_mesaj_at        timestamptz,
  okunmamis           integer,
  karsi_okundu_at     timestamptz
)
language sql stable security definer set search_path = public
as $$
  with benimkiler as (
    select s.*, case when s.kisi_a = auth.uid() then s.kisi_b else s.kisi_a end as karsi
      from public.sohbetler s
     where auth.uid() in (s.kisi_a, s.kisi_b)
  )
  select
    s.id,
    s.karsi,
    sp.username,
    sp.gorunen_ad,
    sp.avatar_path,
    coalesce(sp.resmi_mi, false),
    s.durum,
    s.baslatan = auth.uid(),
    left(son.metin, 140),
    son.gonderen = auth.uid(),
    s.son_mesaj_at,
    (select count(*)::int from public.mesajlar m
      where m.sohbet_id = s.id
        and m.gonderen <> auth.uid()
        and m.created_at > coalesce(
          (select o.okundu_at from public.sohbet_okumalari o where o.sohbet_id = s.id and o.profil_id = auth.uid()),
          '-infinity'::timestamptz)),
    case when s.durum = 'acik' then
      (select o.okundu_at from public.sohbet_okumalari o where o.sohbet_id = s.id and o.profil_id = s.karsi)
    end
  from benimkiler s
  join public.social_profiles sp on sp.profile_id = s.karsi
  left join lateral (
    select m.metin, m.gonderen from public.mesajlar m
     where m.sohbet_id = s.id order by m.created_at desc limit 1
  ) son on true
  where not sosyal_gizli.engelli_mi(s.karsi)
    and case coalesce(p_kutu, 'gelen')
          when 'istekler' then s.durum = 'istek' and s.baslatan <> auth.uid()
          else s.durum = 'acik' or s.baslatan = auth.uid()
        end
  order by s.son_mesaj_at desc
  limit 200
$$;

/*
  Üst çubuktaki rozet: okunmamış mesajı olan sohbet sayısı ve bekleyen
  istek sayısı. İki sayı ayrı, çünkü istek bir "okunmamış mesaj" değil,
  verilmesi gereken bir karar.
*/
create or replace function public.mesaj_sayaclari()
returns table (okunmamis_sohbet integer, bekleyen_istek integer)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*)::int from public.sohbetlerim('gelen') x where x.okunmamis > 0),
    (select count(*)::int from public.sohbetlerim('istekler'))
$$;

/* Profilden "Mesaj"a basınca var olan sohbeti bulmak için; yoksa null. */
create or replace function public.sohbet_kimligi(p_karsi uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select s.id from public.sohbetler s
   where s.kisi_a = least(auth.uid(), p_karsi)
     and s.kisi_b = greatest(auth.uid(), p_karsi)
     and sosyal_gizli.sohbet_uyesi_mi(s.id)
$$;

revoke all on function public.mesaj_gonder(uuid, text) from public, anon;
revoke all on function public.sohbet_istegini_kabul_et(uuid) from public, anon;
revoke all on function public.sohbet_istegini_sil(uuid) from public, anon;
revoke all on function public.sohbet_okundu(uuid) from public, anon;
revoke all on function public.sohbetlerim(text) from public, anon;
revoke all on function public.mesaj_sayaclari() from public, anon;
revoke all on function public.sohbet_kimligi(uuid) from public, anon;
revoke all on function sosyal_gizli.ogrenci_sosyal_mi(uuid) from public;
revoke all on function sosyal_gizli.bagli_mi(uuid, uuid) from public;
revoke all on function sosyal_gizli.sohbet_uyesi_mi(uuid) from public;

grant execute on function public.mesaj_gonder(uuid, text) to authenticated;
grant execute on function public.sohbet_istegini_kabul_et(uuid) to authenticated;
grant execute on function public.sohbet_istegini_sil(uuid) to authenticated;
grant execute on function public.sohbet_okundu(uuid) to authenticated;
grant execute on function public.sohbetlerim(text) to authenticated;
grant execute on function public.mesaj_sayaclari() to authenticated;
grant execute on function public.sohbet_kimligi(uuid) to authenticated;
/* Politikalar bu yardımcıyı çağıranın yetkisiyle çağırıyor. */
grant execute on function sosyal_gizli.sohbet_uyesi_mi(uuid) to authenticated;

/* ================================================================== */
/*  6) ŞİKÂYET — mevcut `reports` tablosu                              */
/* ================================================================== */

alter table public.reports drop constraint if exists reports_hedef_tur_check;
alter table public.reports
  add constraint reports_hedef_tur_check check (hedef_tur in ('profil', 'paylasim', 'mesaj'));

/* ================================================================== */
/*  7) ANLIK GELME — Supabase Realtime                                 */
/* ================================================================== */

/*
  Realtime `postgres_changes` olayları abonenin RLS'inden geçiriyor:
  yukarıdaki okuma politikaları aynı zamanda kimin hangi olayı
  alacağını belirliyor. Yayın yoksa (yerel kurulum) sessizce geçiliyor.
*/
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['sohbetler', 'mesajlar', 'sohbet_okumalari'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
