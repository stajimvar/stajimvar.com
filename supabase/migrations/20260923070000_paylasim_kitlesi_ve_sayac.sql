-- SOSYAL KATMAN C AŞAMASI — PAYLAŞIM KİTLESİ VE SAYACIN SÜZÜLMESİ
--
-- İki kitle var ve VARSAYILAN DAR OLAN:
--
--   baglantilarim    yalnız karşılıklı bağlantı kurduğum kişiler
--   alan-toplulugum  aynı alandaki yayımlanmış herkes
--
-- ALAN SINIRI İKİSİNİN DE ÜSTÜNDE. "Alan topluluğum" kitleyi
-- genişletmiyor; alan içindeki daraltmayı kaldırıyor. Farklı alandaki
-- kullanıcı iki durumda da göremiyor, çünkü her iki dal da
-- `sosyal_gorunur` kapısından geçiyor.
--
-- KURAL TEK YARDIMCIDAN GEÇİYOR
-- -----------------------------
-- `paylasim_gorunur()` dört tabloda birden kullanılıyor: `posts`,
-- `post_media`, `post_likes`, `post_saves`. Kuralı her politikaya elle
-- yazsaydık biri unutulduğunda sızıntı SESSİZ olurdu: paylaşımın kendisi
-- görünmezken görseli ya da beğenileri görünürdü. Bu tam olarak
-- 20260922010000'de arşiv beğenisinde yaşanan hatanın biçimi.
--
-- MEVCUT PAYLAŞIMLARIN GÜVENLİ VARSAYILANI
-- ----------------------------------------
-- Kolon `not null default 'baglantilarim'` ile ekleniyor: var olan tüm
-- satırlar iki değerin DAR olanına düşüyor. Eklenen bir kolon yüzünden
-- hiçbir paylaşım daha geniş bir kitleye açılmıyor.

/* ================================================================== */
/*  1) KİTLE KOLONU                                                    */
/* ================================================================== */

alter table public.posts
  add column if not exists kitle text not null default 'baglantilarim';

alter table public.posts drop constraint if exists posts_kitle_gecerli;
alter table public.posts
  add constraint posts_kitle_gecerli
    check (kitle in ('baglantilarim', 'alan-toplulugum'));

comment on column public.posts.kitle is
  'Paylaşımın kitlesi. Varsayılan ve dar olan "baglantilarim"; "alan-toplulugum" aynı alandaki yayımlanmış herkese açar. Alan sınırı ikisinin de üstündedir.';

create index if not exists posts_kitle_idx on public.posts (author_id, kitle)
  where archived_at is null;

/* ================================================================== */
/*  2) GİZLİ YARDIMCILAR                                               */
/* ================================================================== */

/**
 * Karşılıklı bağlantı var mı?
 *
 * Bağlantı SİMETRİK ve tek satır: yön bakılmıyor, yalnız "kabul"
 * durumu sayılıyor. Bekleyen ya da reddedilmiş bir istek bağlantı
 * değildir; "istek gönderdim" ile "bağlantıyız" arasındaki farkı
 * kitle kuralı da görmek zorunda.
 */
create or replace function sosyal_gizli.baglanti_var(hedef uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.connections c
    where c.durum = 'kabul'
      and ((c.requester_id = auth.uid() and c.addressee_id = hedef)
        or (c.requester_id = hedef and c.addressee_id = auth.uid()))
  )
$$;

/**
 * Bu paylaşımı görebilir miyim?
 *
 * Tek kapı: arşiv, alan sınırı ve kitle burada birleşiyor.
 *   · sahibi her zaman kendi paylaşımını görüyor (arşivi dâhil değil —
 *     arşiv ayrı bir görünüm ve `posts` politikasında ayrıca ele
 *     alınıyor)
 *   · başkası ancak yazar bana GÖRÜNÜR ise ve kitle beni kapsıyorsa
 */
create or replace function sosyal_gizli.paylasim_gorunur(hedef_post uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.posts p
    where p.id = hedef_post
      and p.archived_at is null
      and (
        p.author_id = auth.uid()
        or (
          sosyal_gizli.sosyal_gorunur(p.author_id)
          and (
            p.kitle = 'alan-toplulugum'
            or (p.kitle = 'baglantilarim' and sosyal_gizli.baglanti_var(p.author_id))
          )
        )
      )
  )
$$;

revoke all on function sosyal_gizli.baglanti_var(uuid)      from public;
revoke all on function sosyal_gizli.paylasim_gorunur(uuid)  from public;
grant execute on function sosyal_gizli.baglanti_var(uuid)     to authenticated;
grant execute on function sosyal_gizli.paylasim_gorunur(uuid) to authenticated;

/* ================================================================== */
/*  3) DÖRT TABLONUN POLİTİKASI                                        */
/* ================================================================== */

/*
  `posts` SELECT: sahibi arşivini de görüyor (arşiv silme değil gizleme),
  başkası yalnız görünür ve arşivlenmemiş olanı.
*/
drop policy if exists "ayni sektordeki paylasim okunur" on public.posts;
create policy "ayni sektordeki paylasim okunur" on public.posts
  for select to authenticated
  using (archived_at is null and sosyal_gizli.paylasim_gorunur(id));

/*
  `post_media`: sahibi kendi görselini her durumda görüyor (arşiv dâhil),
  başkası yalnız paylaşımı görebiliyorsa.
*/
drop policy if exists "paylasim gorseli okunur" on public.post_media;
create policy "paylasim gorseli okunur" on public.post_media
  for select to authenticated
  using (
    sosyal_gizli.paylasim_sahibi(post_id) = auth.uid()
    or sosyal_gizli.paylasim_gorunur(post_id)
  );

/*
  Beğeni ve kaydetme: 20260922010000'de eklenen
  `paylasim_etkilesime_acik` kitleyi bilmiyordu; artık aynı tek kapıdan
  geçiyorlar.
*/
drop policy if exists "gorunen paylasimi begenir" on public.post_likes;
create policy "gorunen paylasimi begenir" on public.post_likes
  for insert to authenticated
  with check (user_id = auth.uid() and sosyal_gizli.paylasim_gorunur(post_id));

drop policy if exists "begeniler okunur" on public.post_likes;
create policy "begeniler okunur" on public.post_likes
  for select to authenticated
  using (
    user_id = auth.uid()
    or sosyal_gizli.paylasim_sahibi(post_id) = auth.uid()
    or sosyal_gizli.paylasim_gorunur(post_id)
  );

/*
  `post_saves` `using` DEĞİŞMİYOR: kullanıcı kendi kaydını paylaşım
  sonradan arşivlense ya da kitlesi daralsa bile görüp kaldırabilmeli.
  Sıkılaşan yalnız YENİ kayıt eklemek.
*/
drop policy if exists "kaydedilenler yalniz sahibine" on public.post_saves;
create policy "kaydedilenler yalniz sahibine" on public.post_saves
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and sosyal_gizli.paylasim_gorunur(post_id));

/* `paylasim_etkilesime_acik` artık kullanılmıyor: kitleyi bilmiyor. */
drop function if exists sosyal_gizli.paylasim_etkilesime_acik(uuid);

/* ================================================================== */
/*  4) SAYAÇ DA AYNI KAPIDAN                                           */
/* ================================================================== */

/*
  GÖSTERİLEN SAYI, GÖSTERİLEN İÇERİKLE TUTUYOR.

  Sayaç eskiden bakan kişiden bağımsızdı: "3 paylaşım" yazıp bir tanesini
  gösterebilirdi. Artık her paylaşım `paylasim_gorunur` süzgecinden
  geçiyor, yani:

    profil sahibi              kendi arşivlenmemiş paylaşımlarının tamamı
    bağlantısı olan            "Bağlantılarım" + "Alan topluluğum"
    bağlantısı olmayan (aynı alan)  yalnız "Alan topluluğum"
    farklı alan / katılmamış   SIFIR SATIR (sayı değil)

  Son satır önemli: fonksiyon `where sosyal_gorunur(hedef)` koşulunu
  koruyor, dolayısıyla erişimi olmayan çağırana hiç satır dönmüyor.
  Arayüz de 0 uydurmuyor, sayacı hiç çizmiyor.

  Bağlantı sayısı kitleden ETKİLENMİYOR: kabul edilmiş bağlantı sayısı
  bakan kişiye göre değişen bir şey değil.
*/
create or replace function public.sosyal_sayaclar(hedef uuid)
returns table (paylasim integer, baglanti integer)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*)::int from public.posts p
      where p.author_id = hedef
        and p.archived_at is null
        and sosyal_gizli.paylasim_gorunur(p.id)),
    (select count(*)::int from public.connections c
      where c.durum = 'kabul' and (c.requester_id = hedef or c.addressee_id = hedef))
  where sosyal_gizli.sosyal_gorunur(hedef)
$$;

revoke all on function public.sosyal_sayaclar(uuid) from public;
grant execute on function public.sosyal_sayaclar(uuid) to authenticated;
