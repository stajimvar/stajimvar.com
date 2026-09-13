-- RESMÎ HESAP — AKIŞIN BOŞ KALMAMASI İÇİN ÜÇÜNCÜ BİR KİTLE
--
-- SORUN
-- Yeni kullanıcının akışı bomboş açılıyor: paylaşımlar bağlantılardan ve
-- alan topluluğundan geliyor, ikisi de ilk gün yok. Ekranda "Akışın henüz
-- boş" yazıyor ve ürün, ilk izlenimini hiçbir şey göstermeyerek veriyor.
--
-- NEDEN SAHTE BAĞLANTI DEĞİL
-- İlk akla gelen çözüm, her yeni hesaba resmî hesapla bir `connections`
-- satırı açmaktı. Üç ayrı yerde yanlış olurdu:
--
--   1. Bağlantı sayacı. Sayaç `connections` tablosunu sayıyor
--      (`sosyal_sayaclar`). Kullanıcı hiç kimseyle bağlantı kurmamışken
--      profilinde "1 bağlantı" yazardı — sayaç yalan söylerdi.
--   2. Karşılıklılık. Bağlantı bu üründe simetrik ve KARŞILIKLI ONAYA
--      bağlı. Kimsenin onaylamadığı bir satır, o tanımı bozar.
--   3. Geriye dönük uygulama. Mevcut her kullanıcı için satır açmak
--      gerekirdi; satır açmak da kullanıcının verisine dokunmaktır.
--
-- Bunun yerine ÜÇÜNCÜ BİR KİTLE var: `resmi`. Kitle bir bağlantıya değil
-- yazarın resmî olmasına bakıyor, yani hiçbir satır açılmıyor ve kural
-- HERKESE, açılıştan itibaren ve geriye dönük olarak uyuyor. Bağlantı
-- sayacı da doğal olarak değişmiyor: sayılacak satır yok.
--
-- "BAĞLANTIYI KALDIRAMAZ, SESSİZE ALABİLİR"
-- Kaldırılacak bir bağlantı yok — kaldırma sorusu kendiliğinden düşüyor.
-- Sessize alma ayrı bir tabloda ve kullanıcının KENDİ satırı.

-- ---------------------------------------------------------------- bayrak

alter table public.social_profiles
  add column if not exists resmi_mi boolean not null default false;

comment on column public.social_profiles.resmi_mi is
  'StajımVar resmî hesabı mı. YALNIZ yönetici yazabiliyor (resmi_bayragi_kilidi); '
  'akışta "StajımVar''dan" etiketini ve `resmi` kitlesini bu bayrak açıyor.';

/*
  KİMSE KENDİNİ RESMÎ İLAN EDEMEZ

  `kendi sosyal profilini gunceller` politikası satırın TAMAMINI
  yazdırıyor: kolon kısıtı yok, yani bu bayrak eklenince kullanıcı kendi
  satırında `resmi_mi = true` yazabilirdi ve akışta "StajımVar'dan"
  etiketiyle görünürdü. Politikaya kolon sınırı yazılamıyor (Postgres
  RLS kolon bazlı değil); kapı bu yüzden tetikleyicide.

  Tetikleyici `security definer` DEĞİL: yetkiyi yükseltmesi gerekmiyor,
  yalnız çağıranın yönetici olup olmadığını soruyor.
*/
create or replace function sosyal_gizli.resmi_bayragi_kilidi()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(new.resmi_mi, false) is distinct from coalesce(old.resmi_mi, false)
     and not public.is_admin() then
    raise exception 'Resmî hesap işareti yalnız yöneticiler tarafından değiştirilebilir.'
      using errcode = '42501', detail = 'resmi-bayragi-kilitli';
  end if;
  return new;
end;
$$;

drop trigger if exists resmi_bayragi_kilidi_tg on public.social_profiles;
create trigger resmi_bayragi_kilidi_tg
  before insert or update on public.social_profiles
  for each row execute function sosyal_gizli.resmi_bayragi_kilidi();

/*
  `old` INSERT'te NULL: `coalesce(old.resmi_mi, false)` bu yüzden
  `false` veriyor ve `resmi_mi = true` ile AÇILAN bir satır da kapıdan
  geçmek zorunda kalıyor. Aksi hâlde kullanıcı satırını silip resmî
  olarak yeniden açardı.
*/

-- --------------------------------------------------------------- kitle

alter table public.posts drop constraint if exists posts_kitle_gecerli;
alter table public.posts
  add constraint posts_kitle_gecerli
    check (kitle in ('baglantilarim', 'alan-toplulugum', 'resmi'));

comment on column public.posts.kitle is
  'baglantilarim = karşılıklı bağlantı kuranlar; alan-toplulugum = aynı alan '
  'topluluğunun üyeleri; resmi = giriş yapmış HERKES (yalnız resmî hesap yazabilir).';

/*
  RESMÎ KİTLEYİ YALNIZ RESMÎ HESAP KULLANABİLİR

  Kitle istemciden geliyor. Kapı olmasaydı herhangi bir kullanıcı
  `kitle = 'resmi'` ile paylaşıp bütün kullanıcıların akışına düşerdi —
  yetkisiz yayın. Mevcut `paylasim_kitlesi_kilidi` tetikleyicisi
  genişletiliyor; ikinci bir tetikleyici yazmak, iki kuralın hangi
  sırayla koştuğunu belirsiz bırakırdı.
*/
create or replace function sosyal_gizli.paylasim_kitlesi_kilidi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kitle = 'alan-toplulugum'
     and not exists (
       select 1 from public.community_members cm
        where cm.profile_id = new.author_id
     ) then
    raise exception 'Alan topluluğuna katılmadan bu kitleyle paylaşamazsın.'
      using errcode = '42501', detail = 'topluluk-uyeligi-yok';
  end if;

  if new.kitle = 'resmi'
     and not exists (
       select 1 from public.social_profiles sp
        where sp.profile_id = new.author_id
          and sp.resmi_mi
     ) then
    raise exception 'Resmî kitleyle yalnız StajımVar resmî hesabı paylaşabilir.'
      using errcode = '42501', detail = 'resmi-hesap-degil';
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------- sessize alma

/*
  SESSİZE ALMA — KULLANICININ KENDİ SATIRI

  Tek satır, tek anlam: "bu kullanıcı resmî içerikleri görmek
  istemiyor". Hangi paylaşımın sessize alındığı tutulmuyor; sessize
  alınan şey TEK TEK paylaşımlar değil, kaynağın kendisi.
*/
create table if not exists public.sosyal_resmi_sessiz (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.sosyal_resmi_sessiz is
  'Resmî içerikleri akışında görmek istemeyen kullanıcılar. Satır varsa sessiz.';

alter table public.sosyal_resmi_sessiz enable row level security;

/*
  Üç politika da AYNI sınırı çiziyor: yalnız kendi satırın. Başkasının
  sessizlik tercihini okumak, onun ürünü nasıl kullandığını okumaktır.
*/
drop policy if exists "kendi sessizligini okur" on public.sosyal_resmi_sessiz;
create policy "kendi sessizligini okur" on public.sosyal_resmi_sessiz
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "kendi sessizligini acar" on public.sosyal_resmi_sessiz;
create policy "kendi sessizligini acar" on public.sosyal_resmi_sessiz
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists "kendi sessizligini kaldirir" on public.sosyal_resmi_sessiz;
create policy "kendi sessizligini kaldirir" on public.sosyal_resmi_sessiz
  for delete to authenticated using (profile_id = auth.uid());

-- ------------------------------------------------------------- görünürlük

/*
  RESMÎ İÇERİK GİRİŞ YAPAN HERKESE AÇIK

  Öteki iki kitle `sosyal_gorunur(author)` şartına bağlı; o şart yazarın
  profilinin YAYINDA olmasını istiyor ve engeli hesaba katıyor. Resmî
  dal ikisine de bakmıyor:

    - Yayın şartı BURADA yazarın değil OKUYANIN sorunu olurdu. Yeni
      hesabın kendi profili varsayılan olarak yayında değil
      (`yayinda_mi default false`); okuma şartı olarak yazılsaydı akış
      yine boş açılırdı — çözülmek istenen şeyin ta kendisi.
    - Resmî hesabın profili elbette yayında olacak, ama akışın onun
      profil ayarına bağlı olması kırılganlık olurdu.

  SESSİZLİK BURADA DEĞİL: bu fonksiyon YETKİYİ söylüyor, tercihi değil.
  Sessize alınmış içerik yetkisiz değil, istenmeyen içeriktir; süzme
  akış sorgusunda yapılıyor (bkz. `akisiGetir`). Buraya konsaydı,
  ileride paylaşımın kalıcı adresi açıldığında sessize almış kullanıcı
  paylaşılan bir bağlantıyı açamazdı.
*/
create or replace function sosyal_gizli.paylasim_gorunur(hedef_post uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.posts p
    where p.id = hedef_post
      and p.archived_at is null
      and (
        p.author_id = auth.uid()
        or (
          p.durum = 'hazir'
          and (
            (
              p.kitle = 'resmi'
              and auth.uid() is not null
              and exists (
                select 1 from public.social_profiles sp
                 where sp.profile_id = p.author_id
                   and sp.resmi_mi
              )
            )
            or (
              sosyal_gizli.sosyal_gorunur(p.author_id)
              and (
                (p.kitle = 'baglantilarim'   and sosyal_gizli.baglanti_var(p.author_id))
                or (p.kitle = 'alan-toplulugum' and sosyal_gizli.ayni_toplulukta(auth.uid(), p.author_id))
              )
            )
          )
        )
      )
  )
$$;

/*
  RESMÎ HESABIN PROFİLİ HERKESE OKUNUR

  Akış kartı yazarın adını ve fotoğrafını `social_profiles`ten okuyor.
  Mevcut okuma politikası `sosyal_gorunur` istiyor; o da okuyanın
  `auth.uid()` olmasını yetiyor ama engeli de hesaba katıyor. Resmî
  hesap için ayrı bir kapı açılıyor: paylaşımı görünen bir yazarın adı
  görünmezse kart yazarsız çizilirdi.
*/
drop policy if exists "resmi hesabin profili okunur" on public.social_profiles;
create policy "resmi hesabin profili okunur" on public.social_profiles
  for select to authenticated
  using (resmi_mi);

/*
  BAĞLANTI SAYACI DOKUNULMADI

  `sosyal_sayaclar` bağlantıyı `connections` tablosundan sayıyor ve
  resmî hesap orada hiç satır açmıyor. Sayaç bu yüzden kendiliğinden
  doğru: değiştirilecek bir şey yok. Bu not, ileride "resmî hesabı da
  sayalım mı" sorusunu soracak olana yazıldı — cevap hayır, çünkü o
  sayı kullanıcının kurduğu bağlantıları sayıyor.
*/
