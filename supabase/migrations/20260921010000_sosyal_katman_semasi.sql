-- SOSYAL PORTFOLYO — ŞEMA (A aşaması, 1/2)
--
-- Bu göç yalnızca TABLOLARI kuruyor. Yetkilendirme bir sonraki dosyada
-- (20260921020000_sosyal_katman_rls.sql) ve ikisi birlikte anlam taşıyor:
-- tablolar RLS açık ama politikasız hâlde kimseye satır vermiyor.
--
-- NEDEN AYRI BİR PROFİL TABLOSU
-- -----------------------------
-- İlk tasarımda `profiles` tablosuna `sector_id` ve `username` eklenip
-- RLS'in "aynı sektör okuyabilsin" diye genişletilmesi düşünülmüştü.
-- Ölçüldü: `profiles` SELECT politikası bugün
--
--     (id = auth.uid()) OR is_admin()
--
-- yani öğrenci yalnız kendi satırını görüyor. RLS politikaları OR'landığı
-- için oraya ikinci bir politika eklemek o satırın BÜTÜN kolonlarını
-- açardı — `email` ve `phone` dahil. Sosyal bir görünürlük kuralı
-- yüzünden iletişim bilgisi sızdırmak kabul edilemez.
--
-- Bu yüzden `profiles` ve `student_profiles` HİÇ DEĞİŞMİYOR: ne kolonu
-- ne politikası. Herkese gösterilebilir alanlar öğrencinin kendi
-- yayımladığı ayrı bir tabloda duruyor. E-posta, telefon, CV yolu, GPA
-- ve tercihler sosyal RLS kapsamına hiçbir yoldan girmiyor.

/* ------------------------------------------------------------------ */
/*  SEKTÖRLER — KAPALI SİSTEM LİSTESİ                                  */
/* ------------------------------------------------------------------ */

/*
  Sektör bir öneri etiketi değil, görünürlük sınırı. Bu yüzden liste
  kapalı: kullanıcı serbest metinle sektör yazamıyor ve "Diğer" seçeneği
  yok. Uygun alanı bulamayan kullanıcı geçici bir sektöre atanmıyor —
  arayüz "Listede alanımı bulamadım" geri bildirimini alıyor ve kullanıcı
  sektörsüz kalıyor (yani sosyal katmanı göremiyor).

  Buradaki satırlar ÜRÜN VERİSİ: onaylanmış sınıflandırma listesi.
  Sahte kullanıcı ya da sahte içerik değil.
*/
create table if not exists public.sectors (
  id uuid primary key default gen_random_uuid(),
  /* Adres ve kod tarafında kullanılan sabit anahtar; ad değişse de kalır. */
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  ad text not null,
  sira integer not null,
  /* Kapatılan sektör listede çıkmıyor ama mevcut profiller bozulmuyor. */
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.sectors (slug, ad, sira) values
  ('tekstil-moda-hazir-giyim',        'Tekstil, Moda ve Hazır Giyim',            1),
  ('bilisim-yazilim',                 'Bilişim ve Yazılım',                      2),
  ('elektrik-elektronik-enerji',      'Elektrik, Elektronik ve Enerji',          3),
  ('makine-imalat',                   'Makine ve İmalat',                        4),
  ('otomotiv-mobilite',               'Otomotiv ve Mobilite',                    5),
  ('insaat-mimarlik-yapi',            'İnşaat, Mimarlık ve Yapı',                6),
  ('gida-tarim-hayvancilik',          'Gıda, Tarım ve Hayvancılık',              7),
  ('saglik-ilac',                     'Sağlık ve İlaç',                          8),
  ('kimya-malzeme-maden',             'Kimya, Malzeme ve Maden',                 9),
  ('lojistik-havacilik-denizcilik',   'Lojistik, Havacılık ve Denizcilik',      10),
  ('finans-bankacilik-sigorta',       'Finans, Bankacılık ve Sigorta',          11),
  ('ticaret-pazarlama-eticaret',      'Ticaret, Pazarlama ve E-ticaret',        12),
  ('medya-iletisim-yaratici',         'Medya, İletişim ve Yaratıcı Endüstriler',13),
  ('turizm-konaklama',                'Turizm ve Konaklama',                    14),
  ('cevre-surdurulebilirlik',         'Çevre ve Sürdürülebilirlik',             15)
on conflict (slug) do nothing;

/* ------------------------------------------------------------------ */
/*  SOSYAL PROFİL                                                      */
/* ------------------------------------------------------------------ */

/*
  SEKTÖR: TEK DEĞERLİ, BÖLÜMDEN TÜRETİLMİYOR, ÜRÜNDE ZORUNLU

  Kolon veritabanında NULL kabul ediyor ama bu bir gevşeklik değil,
  ölçülmüş bir zorunluluk: üretimdeki 14 öğrenci profilinin yalnız
  3'ünde bölüm dolu (7 Eylül 2026). NOT NULL yapmak, var olan her
  satıra bir sektör UYDURMAYI gerektirirdi.

  Zorunluluk RLS'te uygulanıyor: `sector_id` boşken sosyal katmandan
  kendi satırı dışında HİÇBİR ŞEY dönmüyor. Yani sektörsüz kullanıcı
  arama, akış, profil keşfi ve bağlantı özelliklerinin hiçbirini
  göremiyor ve zorunlu seçim ekranına düşüyor.

  Bölüm → sektör eşlemesi YOK. Giyim Üretim, Moda Tasarımı, Tekstil
  Mühendisliği ve tekstilde çalışan Makine Mühendisliği aynı topluluğa
  girebiliyor; bunu kullanıcı seçiyor, sistem tahmin etmiyor.
*/
create table if not exists public.social_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,

  /*
    KULLANICI ADI YALNIZ KÜÇÜK ASCII

    "Büyük-küçük harf duyarsız benzersiz" iki yolla sağlanabilir: ya
    olduğu gibi saklayıp lower() üzerinde tekil indeks kurulur, ya da
    yalnız küçük harf saklanır. İkisi de var burada.

    Sebebi Türkçe: `lower('İ')` veritabanı yereline bağlı davranıyor ve
    'i' ile 'i̇' (i + birleşen nokta) arasında ayrışabiliyor. İzin verilen
    alfabeden büyük harf ve Türkçe karakterler çıkarılınca bu tuzak
    tamamen kapanıyor — 'ayşe' ya da 'Ayse' hiç yazılamıyor, dolayısıyla
    iki farklı satır olarak da var olamıyor.

    Nokta ve alt çizgi ortada serbest, başta/sonda değil. Uzunluk 3-30:
    ortadaki grup ZORUNLU, çünkü isteğe bağlı yazıldığında iki harflik
    ad geçiyordu (testte yakalandı). İki harflik herkese açık kullanıcı
    adı hem kapılması kolay hem ayırt edici değil.
  */
  username text
    check (username is null or username ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'),

  sector_id uuid references public.sectors(id) on delete restrict,

  gorunen_ad text,
  avatar_path text,
  biyografi text check (biyografi is null or length(biyografi) <= 300),

  /* Serbest metin: "Giyim Üretim Teknolojisi", "2. sınıf", "İstanbul". */
  bolum_etiketi text,
  sinif_etiketi text,
  sehir text,

  /*
    YAYINDA MI

    Sektör seçimi başladığında satır `false` ile açılıyor: kullanıcı
    henüz kimseye görünmüyor ama seçimi kayboluyor da değil. Başkaları
    ancak yayımlanmış, aynı sektörde ve engellenmemiş bir profili
    görebiliyor.
  */
  yayinda_mi boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  /* Yayımlanan profilde kullanıcı adı ve sektör şart. */
  constraint yayin_icin_kimlik_sart
    check (not yayinda_mi or (username is not null and sector_id is not null))
);

create unique index if not exists social_profiles_username_key
  on public.social_profiles (lower(username)) where username is not null;

create index if not exists social_profiles_sector_idx
  on public.social_profiles (sector_id) where yayinda_mi;

/* ------------------------------------------------------------------ */
/*  PAYLAŞIMLAR                                                        */
/* ------------------------------------------------------------------ */

/*
  Bir paylaşım tek fotoğraf ya da çok aşamalı bir seri olabiliyor:
  kalıp, kesim, dikim, prova aynı kaydın sıralı görselleri. Bu yüzden
  görseller ayrı tabloda ve `sira` ile duruyor — kart ızgarasında ilk
  görsel kapak, kalanı seri.
*/
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  aciklama text check (aciklama is null or length(aciklama) <= 2200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  /* Arşiv: silme değil gizleme. Yalnız sahibi görüyor. */
  archived_at timestamptz
);

create index if not exists posts_author_idx
  on public.posts (author_id, created_at desc) where archived_at is null;

create table if not exists public.post_media (
  post_id uuid not null references public.posts(id) on delete cascade,
  sira integer not null check (sira >= 1 and sira <= 10),
  storage_path text not null,
  genislik integer,
  yukseklik integer,
  /* Ekran okuyucu metni; boş bırakılabilir ama uydurulmuyor. */
  alt text,
  primary key (post_id, sira)
);

/* ------------------------------------------------------------------ */
/*  BEĞENİ VE KAYDETME                                                 */
/* ------------------------------------------------------------------ */

/*
  Birleşik birincil anahtar tek beğeniyi VERİTABANINDA garanti ediyor:
  aynı kullanıcı aynı paylaşımı iki kez beğenemiyor. Geri alma satırın
  silinmesi.
*/
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_idx on public.post_likes (user_id, created_at desc);

/*
  KAYDEDİLENLER ÖZEL

  Beğeni paylaşım sahibine görünüyor (kimin beğendiği), kaydetme
  görünmüyor. Bu ayrım RLS'te de var: post_saves yalnız satırın
  sahibine açık.
*/
create table if not exists public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_saves_user_idx on public.post_saves (user_id, created_at desc);

/* ------------------------------------------------------------------ */
/*  BAĞLANTILAR — TEK VE SİMETRİK                                      */
/* ------------------------------------------------------------------ */

/*
  Takipçi/takip edilen modeli DEĞİL. Bir öğrenci istek gönderiyor,
  karşı taraf kabul edince iki kullanıcı karşılıklı bağlantı oluyor ve
  bu TEK bir satır. Profilde tek bir "Bağlantı" sayısı var; maketteki
  "Bağlantıda" sayacı kaldırıldı çünkü simetrik modelde ikinci bir sayı
  aynı şeyi iki kez söylerdi.

  TERS YÖNDE İKİNCİ KAYIT AÇILAMIYOR
  `least/greatest` üzerindeki tekil indeks çifti yönden bağımsız
  kilitliyor: A→B varken B→A açılamıyor. Bu olmasaydı iki taraf aynı
  anda istek gönderdiğinde iki ayrı ilişki ve iki ayrı sayaç oluşurdu.

  Bekleyen istekler herkese açık bir sayaç değil; yalnız tarafların
  kendi "Bağlantı istekleri" ekranında görünüyor (RLS de öyle diyor).
*/
create table if not exists public.connections (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  durum text not null default 'bekliyor' check (durum in ('bekliyor','kabul','red')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  constraint kendine_istek_yok check (requester_id <> addressee_id)
);

create unique index if not exists connections_cift_key on public.connections
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists connections_addressee_idx
  on public.connections (addressee_id) where durum = 'bekliyor';

/* ------------------------------------------------------------------ */
/*  ENGELLEME VE ŞİKÂYET                                               */
/* ------------------------------------------------------------------ */

/*
  Engel İKİ YÖNLÜ çalışıyor: engelleyen de engellenen de birbirini
  göremiyor, istek gönderemiyor. Tek yönlü olsaydı engellenen kişi
  karşıdakini görmeye ve istek göndermeye devam ederdi.
*/
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint kendini_engelleyemez check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  hedef_tur text not null check (hedef_tur in ('profil','paylasim')),
  hedef_id uuid not null,
  sebep text not null,
  aciklama text,
  created_at timestamptz not null default now()
);

/* ------------------------------------------------------------------ */
/*  KATEGORİ HAVUZU VE ÖĞRENCİNİN SEÇİMİ                               */
/* ------------------------------------------------------------------ */

/*
  Aynı sektördeki herkese sabit başlık verilmiyor. Havuz sektör ve
  bölüme göre ÖNERİ üretiyor; son seçimi öğrenci yapıyor, açıp
  kapatabiliyor ve sıralayabiliyor.

  Bu kategoriler profilin ana fotoğraf ızgarasını BÖLMÜYOR — ızgara tek
  parça kalıyor. Yalnız profil düzenleme, öneri ve öne çıkanları
  oluşturma sırasında yardımcı oluyorlar.

  Havuz şimdilik BOŞ: hangi bölüme hangi başlığın önerileceği ürün
  kararı ve uydurulmuyor. Tablo hazır, satırlar onaylandıkça giriyor.
*/
create table if not exists public.category_pool (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references public.sectors(id) on delete cascade,
  /* Boşsa o sektörün tamamına öneriliyor; doluysa yalnız o bölüme. */
  bolum text,
  etiket text not null,
  sira integer not null default 0
);

/*
  Tekillik ifadeyle kuruluyor: tablo kısıtı sütun adı istiyor, `coalesce`
  kabul etmiyor. `bolum` NULL olduğunda (sektörün tamamına öneri) aynı
  etiketin iki kez girmesini yalnız ifadeli tekil indeks engelliyor —
  NULL'lar birbirine eşit sayılmadığı için düz UNIQUE burada boşa çalışırdı.
*/
create unique index if not exists category_pool_key
  on public.category_pool (sector_id, coalesce(bolum, ''), etiket);

create table if not exists public.profile_categories (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  etiket text not null,
  sira integer not null default 0,
  acik boolean not null default true,
  primary key (profile_id, etiket)
);

/* ------------------------------------------------------------------ */
/*  ÖNE ÇIKANLAR — BU AŞAMADA YOK                                      */
/* ------------------------------------------------------------------ */

/*
  Hikâye altyapısı kurulmadan öne çıkanlar tablosu açılmıyor ve arayüzde
  yuvarlak şerit ÇİZİLMİYOR. Kullanılamayan bir özelliği aktifmiş gibi
  göstermemek için: boş bir "Öne çıkanlar" alanı da bir vaat.

  İleride eklenecek şekil şu olacak (F aşaması):
    highlights(id, profile_id, baslik, kapak_path, sira)
    highlight_items(highlight_id, sira, storage_path)
  Bugün yazılmıyor çünkü hikâye kaydı üreten bir yol yok.
*/

/* ------------------------------------------------------------------ */
/*  MESAJLAŞMA — YOK                                                   */
/* ------------------------------------------------------------------ */

/*
  Depoda mesaj tablosu yok ve bu göç de eklemiyor. Dolayısıyla profilde
  "Mesaj" düğmesi çizilmeyecek. Yorum da aynı sebeple yok: ne tablo, ne
  düğme, ne sayaç.
*/

/* Güncelleme damgaları. */
create or replace function public.sosyal_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists social_profiles_updated_at on public.social_profiles;
create trigger social_profiles_updated_at before update on public.social_profiles
  for each row execute function public.sosyal_updated_at();

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts
  for each row execute function public.sosyal_updated_at();

drop trigger if exists connections_updated_at on public.connections;
create trigger connections_updated_at before update on public.connections
  for each row execute function public.sosyal_updated_at();
