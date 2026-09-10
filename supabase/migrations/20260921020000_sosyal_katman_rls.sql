-- SOSYAL PORTFOLYO — YETKİLENDİRME (A aşaması, 2/2)
--
-- Sektör bu üründe bir öneri süzgeci değil, GÖRÜNÜRLÜK SINIRI. Arayüzde
-- gizlemek yetmez: sunucu da vermiyor olmalı. Bütün kural burada.
--
-- ÜÇ KOŞUL, HER TABLODA AYNI
--   1. Kendi satırın                                  → her zaman
--   2. Aynı sektör + yayımlanmış + engel yok          → okuma
--   3. Sektörün yoksa (1) dışında HİÇBİR ŞEY dönmez   → zorunlu seçim
--
-- `profiles` ve `student_profiles` politikalarına DOKUNULMUYOR. E-posta,
-- telefon, CV yolu, GPA ve tercihler bu dosyanın kapsamına hiç girmiyor.

alter table public.sectors            enable row level security;
alter table public.social_profiles    enable row level security;
alter table public.posts              enable row level security;
alter table public.post_media         enable row level security;
alter table public.post_likes         enable row level security;
alter table public.post_saves         enable row level security;
alter table public.connections        enable row level security;
alter table public.blocks             enable row level security;
alter table public.reports            enable row level security;
alter table public.category_pool      enable row level security;
alter table public.profile_categories enable row level security;

/* ------------------------------------------------------------------ */
/*  YARDIMCILAR                                                        */
/* ------------------------------------------------------------------ */

/*
  Hepsi `security definer`: politikanın içinden aynı tabloyu okumak
  gerekiyor ve invoker olsalardı RLS kendi kendini çağırıp sonsuz
  özyinelemeye girerdi. `search_path` sabitleniyor — depodaki
  `is_admin`/`app_role` kalıbının aynısı.
*/

/** Oturumdaki kullanıcının sektörü; profili yoksa NULL. */
create or replace function public.aktif_sektor()
returns uuid
language sql stable security definer set search_path = public
as $$ select sector_id from public.social_profiles where profile_id = auth.uid() $$;

/**
 * İki yönlü engel kontrolü.
 *
 * Tek yönlü olsaydı engellenen kişi karşıdakini görmeye ve istek
 * göndermeye devam ederdi; engel işini yapmazdı.
 */
create or replace function public.engelli_mi(hedef uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = hedef)
       or (blocker_id = hedef and blocked_id = auth.uid())
  )
$$;

/**
 * Aynı sektörde miyiz?
 *
 * İki tarafın da sektörü DOLU ve EŞİT olmalı. `NULL = NULL` zaten yanlış
 * döner ama açıkça yazılıyor: sektörsüz iki kullanıcı "aynı sektörde"
 * sayılmamalı, yoksa sektörsüzler kendi aralarında görünür olurdu.
 */
create or replace function public.ayni_sektorde(hedef uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.social_profiles ben
    join public.social_profiles o on o.profile_id = hedef
    where ben.profile_id = auth.uid()
      and ben.sector_id is not null
      and o.sector_id is not null
      and o.sector_id = ben.sector_id
  )
$$;

/**
 * Bu kullanıcının sosyal içeriğini görebilir miyim?
 *
 * Kendim her zaman; başkası ancak profili YAYIMLANMIŞ, aynı sektörde ve
 * aramızda engel yokken. Sosyal tabloların tamamı bu tek kapıdan geçiyor,
 * böylece kural bir yerde değişince her tabloda değişiyor.
 */
create or replace function public.sosyal_gorunur(hedef uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when hedef is null then false
    when hedef = auth.uid() then true
    else (
      exists (
        select 1
        from public.social_profiles ben
        join public.social_profiles o on o.profile_id = hedef
        where ben.profile_id = auth.uid()
          and ben.sector_id is not null
          and o.sector_id = ben.sector_id
          and o.yayinda_mi
      )
      and not public.engelli_mi(hedef)
    )
  end
$$;

/** Paylaşımın sahibi. Politikalarda tekrar tekrar join yazmamak için. */
create or replace function public.paylasim_sahibi(hedef_post uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select author_id from public.posts where id = hedef_post $$;

revoke all on function public.aktif_sektor()          from public;
revoke all on function public.engelli_mi(uuid)        from public;
revoke all on function public.ayni_sektorde(uuid)     from public;
revoke all on function public.sosyal_gorunur(uuid)    from public;
revoke all on function public.paylasim_sahibi(uuid)   from public;

grant execute on function public.aktif_sektor()        to authenticated;
grant execute on function public.engelli_mi(uuid)      to authenticated;
grant execute on function public.ayni_sektorde(uuid)   to authenticated;
grant execute on function public.sosyal_gorunur(uuid)  to authenticated;
grant execute on function public.paylasim_sahibi(uuid) to authenticated;

/* ------------------------------------------------------------------ */
/*  SEKTÖR LİSTESİ                                                     */
/* ------------------------------------------------------------------ */

/*
  Liste herkese açık okunabilir: zorunlu seçim ekranı henüz sektörü
  olmayan kullanıcıya gösteriliyor ve o kullanıcı hiçbir sosyal satır
  göremiyor — ama seçebilmesi için listeyi görmesi gerekiyor.
  Yazma yalnız yöneticide; kullanıcı sektör oluşturamıyor.
*/
drop policy if exists "sektorler okunur" on public.sectors;
create policy "sektorler okunur" on public.sectors
  for select to authenticated using (aktif);

drop policy if exists "sektorleri yonetici yazar" on public.sectors;
create policy "sektorleri yonetici yazar" on public.sectors
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

/* ------------------------------------------------------------------ */
/*  SOSYAL PROFİL                                                      */
/* ------------------------------------------------------------------ */

/*
  Yayımlanmamış satır YALNIZ sahibine ve yöneticiye görünüyor: kullanıcı
  sektörünü seçip profilini doldururken kimseye görünmüyor ama seçimi
  kayboluyor da değil.
*/
drop policy if exists "kendi sosyal profilini yonetir" on public.social_profiles;
create policy "kendi sosyal profilini yonetir" on public.social_profiles
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "ayni sektordeki yayimlanmis profil okunur" on public.social_profiles;
create policy "ayni sektordeki yayimlanmis profil okunur" on public.social_profiles
  for select to authenticated
  using (
    yayinda_mi
    and sector_id is not null
    and sector_id = public.aktif_sektor()
    and not public.engelli_mi(profile_id)
  );

drop policy if exists "yonetici sosyal profilleri okur" on public.social_profiles;
create policy "yonetici sosyal profilleri okur" on public.social_profiles
  for select to authenticated using (public.is_admin());

/* ------------------------------------------------------------------ */
/*  PAYLAŞIMLAR                                                        */
/* ------------------------------------------------------------------ */

drop policy if exists "kendi paylasimini yonetir" on public.posts;
create policy "kendi paylasimini yonetir" on public.posts
  for all to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

/*
  Arşivlenmiş paylaşım başkasına GÖRÜNMÜYOR: arşiv silme değil gizleme
  ve gizlenen şeyin aynı sektördeki birine açık kalması arşivi anlamsız
  kılardı.
*/
drop policy if exists "ayni sektordeki paylasim okunur" on public.posts;
create policy "ayni sektordeki paylasim okunur" on public.posts
  for select to authenticated
  using (archived_at is null and public.sosyal_gorunur(author_id));

drop policy if exists "paylasim gorseli okunur" on public.post_media;
create policy "paylasim gorseli okunur" on public.post_media
  for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and (p.author_id = auth.uid()
             or (p.archived_at is null and public.sosyal_gorunur(p.author_id)))
    )
  );

drop policy if exists "kendi gorselini yonetir" on public.post_media;
create policy "kendi gorselini yonetir" on public.post_media
  for all to authenticated
  using (public.paylasim_sahibi(post_id) = auth.uid())
  with check (public.paylasim_sahibi(post_id) = auth.uid());

/* ------------------------------------------------------------------ */
/*  BEĞENİ                                                             */
/* ------------------------------------------------------------------ */

/*
  Beğeni ancak GÖREBİLDİĞİN paylaşıma verilebiliyor: farklı sektördeki
  bir paylaşımın kimliğini bir yerden öğrenen kullanıcı onu beğenemiyor.
  Tek beğeni kuralını birincil anahtar zaten garantiliyor.
*/
drop policy if exists "gorunen paylasimi begenir" on public.post_likes;
create policy "gorunen paylasimi begenir" on public.post_likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.sosyal_gorunur(public.paylasim_sahibi(post_id)));

drop policy if exists "kendi begenisini kaldirir" on public.post_likes;
create policy "kendi begenisini kaldirir" on public.post_likes
  for delete to authenticated using (user_id = auth.uid());

/*
  Beğenenleri PAYLAŞIM SAHİBİ görüyor; ayrıca herkes kendi beğenisini
  görüyor (düğmenin dolu mu boş mu olduğu buradan okunuyor).
*/
drop policy if exists "begeniler okunur" on public.post_likes;
create policy "begeniler okunur" on public.post_likes
  for select to authenticated
  using (user_id = auth.uid() or public.paylasim_sahibi(post_id) = auth.uid());

/* ------------------------------------------------------------------ */
/*  KAYDEDİLENLER — TAMAMEN ÖZEL                                       */
/* ------------------------------------------------------------------ */

/*
  Paylaşım sahibi bile kimin kaydettiğini göremiyor. Beğeniden farkı bu:
  beğeni bir geri bildirim, kaydetme kişisel bir not.
*/
drop policy if exists "kaydedilenler yalniz sahibine" on public.post_saves;
create policy "kaydedilenler yalniz sahibine" on public.post_saves
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.sosyal_gorunur(public.paylasim_sahibi(post_id)));

/* ------------------------------------------------------------------ */
/*  BAĞLANTILAR                                                        */
/* ------------------------------------------------------------------ */

/*
  SİMETRİK OKUMA
  Satır tek; iki taraf da aynı satırı görüyor. Yön (requester/addressee)
  yalnız "kim başlattı" bilgisi, yetkiyi belirlemiyor.

  Bekleyen istekler bu politikayla YALNIZ taraflara görünüyor; üçüncü
  bir kullanıcı ne isteği ne sayısını görebiliyor.
*/
drop policy if exists "baglantiyi taraflar okur" on public.connections;
create policy "baglantiyi taraflar okur" on public.connections
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

/*
  İstek gönderme: yalnız kendi adına, yalnız aynı sektöre, engel yokken.
  Kendine istek ve ters yönde ikinci kayıt şemada kapalı
  (kendine_istek_yok + connections_cift_key).
*/
drop policy if exists "ayni sektore istek gonderir" on public.connections;
create policy "ayni sektore istek gonderir" on public.connections
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and public.sosyal_gorunur(addressee_id)
  );

/*
  Güncelleme iki taraf için de açık ama farklı sebeple: karşı taraf
  kabul/red ediyor, gönderen geri çekiyor. Hangi geçişin kime ait
  olduğu uygulama katmanında; RLS burada yalnız "taraf mısın" diyor.
*/
drop policy if exists "baglantiyi taraflar gunceller" on public.connections;
create policy "baglantiyi taraflar gunceller" on public.connections
  for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "baglantiyi taraflar siler" on public.connections;
create policy "baglantiyi taraflar siler" on public.connections
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

/* ------------------------------------------------------------------ */
/*  ENGEL VE ŞİKÂYET                                                   */
/* ------------------------------------------------------------------ */

/*
  Engel kaydını yalnız engelleyen görüyor. Engellenen kişi engellendiğini
  listeden okuyamıyor — göreceği tek şey karşı tarafın kaybolması.
*/
drop policy if exists "kendi engellerini yonetir" on public.blocks;
create policy "kendi engellerini yonetir" on public.blocks
  for all to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

/*
  Şikâyet tek yönlü: kullanıcı yazıyor, kendi yazdığını görüyor,
  değerlendirmeyi yönetici yapıyor.
*/
drop policy if exists "kendi sikayetini yazar" on public.reports;
create policy "kendi sikayetini yazar" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "kendi sikayetini okur" on public.reports;
create policy "kendi sikayetini okur" on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());

/* ------------------------------------------------------------------ */
/*  KATEGORİLER                                                        */
/* ------------------------------------------------------------------ */

/* Havuz okunur (öneri üretmek için), yazma yöneticide. */
drop policy if exists "kategori havuzu okunur" on public.category_pool;
create policy "kategori havuzu okunur" on public.category_pool
  for select to authenticated using (true);

drop policy if exists "kategori havuzunu yonetici yazar" on public.category_pool;
create policy "kategori havuzunu yonetici yazar" on public.category_pool
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

/*
  Öğrencinin seçtiği başlıklar profilinin parçası: aynı sektörde
  görünen bir profilin başlıkları da görünüyor.
*/
drop policy if exists "kendi kategorilerini yonetir" on public.profile_categories;
create policy "kendi kategorilerini yonetir" on public.profile_categories
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "gorunen profilin kategorileri okunur" on public.profile_categories;
create policy "gorunen profilin kategorileri okunur" on public.profile_categories
  for select to authenticated using (acik and public.sosyal_gorunur(profile_id));

/* ------------------------------------------------------------------ */
/*  SAYAÇLAR                                                           */
/* ------------------------------------------------------------------ */

/*
  Profil kartındaki iki sayı: Paylaşım ve Bağlantı.

  "Bağlantıda" sayacı YOK — bağlantı simetrik ve tek satır olduğu için
  ikinci bir sayı aynı şeyi tekrar söylerdi.

  Fonksiyon `sosyal_gorunur` kapısından geçiyor: göremediğin bir profilin
  sayaçlarını da alamıyorsun. Aksi hâlde sayaçlar farklı sektördeki bir
  kullanıcının varlığını sızdıran bir yan kanal olurdu.
*/
create or replace function public.sosyal_sayaclar(hedef uuid)
returns table (paylasim integer, baglanti integer)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*)::int from public.posts p
      where p.author_id = hedef and p.archived_at is null),
    (select count(*)::int from public.connections c
      where c.durum = 'kabul' and (c.requester_id = hedef or c.addressee_id = hedef))
  where public.sosyal_gorunur(hedef)
$$;

revoke all on function public.sosyal_sayaclar(uuid) from public;
grant execute on function public.sosyal_sayaclar(uuid) to authenticated;

/* Tablo yetkileri: RLS kapı, grant ise anahtar — ikisi de gerekiyor. */
grant select on public.sectors, public.category_pool to authenticated;
grant select, insert, update, delete on
  public.social_profiles, public.posts, public.post_media,
  public.post_likes, public.post_saves, public.connections,
  public.blocks, public.profile_categories to authenticated;
grant select, insert on public.reports to authenticated;

/*
  ANONİM ERİŞİM YOK.
  Sosyal katmanın tamamı giriş yapmış kullanıcıya açık. Herkese açık bir
  profil sayfası ürün kararı olarak henüz verilmedi; verilirse ayrı bir
  göçle ve yalnız yayımlanmış alanlarla açılır.
*/
revoke all on public.social_profiles, public.posts, public.post_media,
  public.post_likes, public.post_saves, public.connections,
  public.blocks, public.reports, public.profile_categories from anon;
