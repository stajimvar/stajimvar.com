-- D aşaması, 1/3 — paylaşımın taslak/hazır durumu ve idempotens anahtarı
--
-- YARIM YÜKLEME GÖRÜNÜR PAYLAŞIM BIRAKMAMALI
-- ------------------------------------------
-- Fotoğraflar Storage'a tek tek yükleniyor. Üçüncüsünde ağ koparsa
-- ortada iki dosyalı bir "paylaşım" kalırdı: satır yayında, içerik
-- eksik. Bu yüzden satır `taslak` doğuyor ve yalnız bütün dosyalar
-- yazıldıktan sonra `sosyal_paylasim_tamamla` onu `hazir` yapıyor.
--
-- Yazar kendi taslağını GÖRÜYOR (oluşturma ekranı onun üzerinde
-- çalışıyor); başka hiç kimse göremiyor.
--
-- ÇİFT TIKLAMA TEK PAYLAŞIM
-- -------------------------
-- Arayüzdeki kilit tek savunma olamaz: ağ tekrarı, yeniden deneme ve
-- geri tuşu arayüzden geçmiyor. İstemci her oluşturma denemesi için bir
-- anahtar üretiyor; tekil indeks aynı anahtarın ikinci satırı açmasını
-- VERİTABANINDA engelliyor.

/* ================================================================== */
/*  1) DURUM                                                           */
/* ================================================================== */

alter table public.posts
  add column if not exists durum text not null default 'taslak';

alter table public.posts drop constraint if exists posts_durum_gecerli;
alter table public.posts
  add constraint posts_durum_gecerli check (durum in ('taslak', 'hazir'));

/*
  VAR OLAN SATIRLAR AÇIKÇA `hazir`.

  Varsayılan `taslak` YENİ satır için doğru olan; ama kolon eklenirken
  var olan satırlara uygulansaydı yayımlanmış paylaşımlar sessizce
  görünmez olurdu. Kitle kolonunda (20260923070000) güvenli varsayılan
  DAR olandı; burada güvenli olan, var olanı OLDUĞU GİBİ bırakmak.
  Bugün üretimde sosyal tablo yok; kural yine de göçün kendi güvencesi.
*/
update public.posts set durum = 'hazir' where durum = 'taslak' and created_at < now();

comment on column public.posts.durum is
  'taslak = dosyaları hâlâ yükleniyor, YALNIZ yazarı görür. '
  'hazir = bütün dosyalar yazıldı ve kitlesine açık.';

/* ================================================================== */
/*  2) İDEMPOTENS ANAHTAR                                              */
/* ================================================================== */

alter table public.posts
  add column if not exists istemci_anahtari uuid;

/*
  Kısmi tekil indeks: anahtar YOKSA (eski satırlar) kısıt uygulanmıyor,
  varsa aynı yazar aynı anahtarla ikinci satır açamıyor.
*/
create unique index if not exists posts_istemci_anahtari_key
  on public.posts (author_id, istemci_anahtari)
  where istemci_anahtari is not null;

comment on column public.posts.istemci_anahtari is
  'İstemcinin ürettiği oluşturma denemesi kimliği. Aynı anahtarla ikinci '
  'çağrı yeni satır AÇMAZ, mevcut taslağı döndürür.';

/* ================================================================== */
/*  3) GÖRÜNÜRLÜK KAPISI TASLAĞI ELİYOR                                */
/* ================================================================== */

/*
  20260923070000'deki gövdenin AYNISI; tek fark yazar dışındaki dalda
  `p.durum = 'hazir'` şartı. Kapı hâlâ TEK: posts, post_media,
  post_likes, post_saves ve (D'de) Storage okuma politikası bu
  fonksiyondan geçiyor. Şartı politikalara tek tek yazsaydık biri
  unutulduğunda taslağın görseli görünürdü — 20260922010000'de arşiv
  beğenisinde yaşanan hatanın aynı biçimi.
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
          p.durum = 'hazir'
          and sosyal_gizli.sosyal_gorunur(p.author_id)
          and (
            p.kitle = 'alan-toplulugum'
            or (p.kitle = 'baglantilarim' and sosyal_gizli.baglanti_var(p.author_id))
          )
        )
      )
  )
$$;

/*
  İstemci `durum` ve `istemci_anahtari` kolonlarına YAZAMAZ.

  Kolon düzeyi yetki, C'deki social_profiles kalıbının aynısı: politika
  satırın SAHİBİNİ doğruluyor, hangi kolonu yazdığını değil. Durumu
  istemciye bıraksaydık yarım yüklemeyi kendi `hazir` yapabilirdi ve
  bütün bütünlük kuralı dekor olurdu.
*/
revoke update on public.posts from authenticated;
grant update (aciklama, kitle, archived_at) on public.posts to authenticated;
