-- G aşaması — kullanıcı adı değiştirme, geçmiş ve eski adresin çözülmesi
--
-- BIRAKILAN AD SERBEST KALMIYOR
-- -----------------------------
-- Kullanıcı adını değiştiren kişinin eski adresi ortalıkta kalıyor:
-- paylaşılmış bağlantılar, mesajlardaki `stajimvar.com/profil/eskiad`,
-- ekran görüntüleri. O adı bir başkası alabilseydi, eski bağlantıya
-- tıklayan herkes YENİ birinin profiline düşer ve onu eski kişi
-- sanardı. Bu, parola gerektirmeyen bir kimlik devralma.
--
-- Bu yüzden bırakılan ad KALICI olarak rezerve ediliyor ve eski adres
-- yeni adrese çözülüyor. Kullanıcı kendi eski adını geri alabiliyor —
-- geçmişte o ad zaten ona aitti, kimseyi yanıltmıyor.
--
-- ÇÖZÜMLEME BİR VARLIK KEHANETİ DEĞİL
-- -----------------------------------
-- `sosyal_kullanici_adi_coz` yalnız çağıranın ZATEN görebileceği bir
-- profile çözüm veriyor ve bulamadığında SIFIR SATIR dönüyor — "yok"
-- diye bir cevap üretmiyor. Böylece fonksiyon, hangi adların bir zamanlar
-- kullanıldığını tarayan bir araç hâline gelmiyor.

/* ================================================================== */
/*  1) GEÇMİŞ TABLOSU                                                  */
/* ================================================================== */

create table if not exists public.username_history (
  /*
    Birincil anahtar ADIN KENDİSİ: aynı ad geçmişte iki kez farklı
    kişilerde bulunamaz. Rezervasyonun tekilliği tam olarak burada.
  */
  eski_username text primary key check (eski_username ~ '^[a-z]{3,30}$'),
  profile_id    uuid not null references public.social_profiles(profile_id) on delete cascade,
  birakma_ani   timestamptz not null default now()
);

create index if not exists username_history_profil_idx
  on public.username_history (profile_id, birakma_ani desc);

comment on table public.username_history is
  'Bırakılmış kullanıcı adları. Başkası tarafından alınamaz; eski /profil/<ad> adresi güncel adrese çözülür. Yalnız RPC üzerinden okunur.';

alter table public.username_history enable row level security;

/*
  POLİTİKA YOK, YETKİ DE YOK

  Tabloya `authenticated` için hiçbir select/insert/update/delete
  verilmiyor. RLS açık ve politika yazılmadığı için doğrudan sorgu
  boş dönüyor; okuma yalnız aşağıdaki `security definer` fonksiyondan
  ve orada da görünürlük kapısından geçerek yapılıyor. Tabloyu okunur
  yapmak, "kim adını değiştirmiş" listesini herkese açardı.
*/
revoke all on public.username_history from anon, authenticated;

/* ================================================================== */
/*  2) DOLULUK ARTIK GEÇMİŞİ DE SAYIYOR                                */
/* ================================================================== */

/**
 * Bu ad birine ait mi? (güncel adlar + bırakılmış adlar)
 *
 * 20260926010000'deki sürüm yalnız güncel adlara bakıyordu. Üretim ve
 * değiştirme yolları aynı fonksiyonu çağırdığı için tanımı burada
 * genişletmek ikisini birden kapsıyor.
 */
create or replace function sosyal_gizli.kullanici_adi_dolu(aday text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.social_profiles sp where sp.username = aday)
      or exists (select 1 from public.username_history uh where uh.eski_username = aday)
$$;

/**
 * Bu ad ÇAĞIRAN için dolu mu?
 *
 * Kendi bıraktığı ada geri dönmek serbest: o ad geçmişte de ona aitti.
 * Başkasının bıraktığı ad kapalı.
 */
create or replace function sosyal_gizli.kullanici_adi_baskasinda(aday text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.social_profiles sp
     where sp.username = aday and sp.profile_id <> auth.uid()
  ) or exists (
    select 1 from public.username_history uh
     where uh.eski_username = aday and uh.profile_id <> auth.uid()
  )
$$;

/* ================================================================== */
/*  3) KİMLİK KİLİDİ ARTIK ADI TAMAMEN KAPATMIYOR                      */
/* ================================================================== */

/*
  20260923030000'deki `kimlik_kilidi` "kullanıcı adı kalıcıdır" diyordu
  ve gerekçesi doğruydu: paylaşılmış her profil adresi ona bağlı. Artık
  o gerekçenin karşılığı BAŞKA bir yerde — bırakılan ad rezerve ediliyor
  ve eski adres yenisine çözülüyor. Kilidin görevi değişiyor: adı
  değiştirilemez yapmak değil, YALNIZ AŞAĞIDAKİ RPC'DEN geçirmek.

  Kapı bir oturum-yerel ayar: RPC `set_config(..., true)` ile yalnız
  kendi işlemi boyunca açıyor. Doğrudan UPDATE denemesi bu ayarı
  taşımadığı için kilide çarpıyor — kolon yetkisi zaten yok, bu ikinci
  kapı bakım yolları için duruyor.

  Sektör ve bölüm kilidi AYNEN kalıyor.
*/
create or replace function public.kimlik_kilidi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.sector_id is distinct from old.sector_id and old.sector_id is not null then
    raise exception 'Sektör seçildikten sonra değiştirilemez.'
      using errcode = '42501';
  end if;

  if new.department_id is distinct from old.department_id and old.department_id is not null then
    raise exception 'Bölüm seçildikten sonra değiştirilemez.'
      using errcode = '42501';
  end if;

  if new.username is distinct from old.username
     and old.username is not null
     and coalesce(current_setting('sosyal.ad_degisimi', true), '') <> 'acik' then
    raise exception 'Kullanıcı adı yalnız sosyal_kullanici_adi_degistir ile değişir.'
      using errcode = '42501', detail = 'kullanici-adi-dogrudan-yazilamaz';
  end if;

  return new;
end;
$$;

/* ================================================================== */
/*  4) DEĞİŞTİRME — YALNIZ RPC                                         */
/* ================================================================== */

/**
 * Kullanıcı adını değiştirir.
 *
 * İstemci `username` kolonunu yazamıyor (20260923030000'deki
 * `grant update (...)` listesinde yok), yani tek yol bu fonksiyon.
 *
 * HATA DETAYLARI MAKİNE İÇİN, MESAJ İNSAN İÇİN: arayüz `detail`
 * değerine bakıp Türkçe cümleyi kendi seçiyor; ham veritabanı hatası
 * kullanıcıya hiç ulaşmıyor.
 */
create or replace function public.sosyal_kullanici_adi_degistir(p_yeni text)
returns public.social_profiles
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ben   uuid := auth.uid();
  eski  text;
  sonuc public.social_profiles;
begin
  if ben is null then
    raise exception 'Oturum gerekiyor.'
      using errcode = '42501', detail = 'oturum-yok';
  end if;

  if p_yeni is null or p_yeni !~ '^[a-z]{3,30}$' then
    raise exception 'Kullanıcı adı kurala uymuyor.'
      using errcode = '23514', detail = 'gecersiz-kullanici-adi';
  end if;

  select sp.username into eski
    from public.social_profiles sp
   where sp.profile_id = ben
   for update;

  if not found then
    raise exception 'Sosyal profil bulunamadı.'
      using errcode = 'P0001', detail = 'profil-yok';
  end if;

  /* Aynı adı yeniden yazmak boş bir geçmiş satırı üretmesin. */
  if eski is not distinct from p_yeni then
    select * into sonuc from public.social_profiles where profile_id = ben;
    return sonuc;
  end if;

  if sosyal_gizli.kullanici_adi_baskasinda(p_yeni) then
    raise exception 'Bu kullanıcı adı alınmış.'
      using errcode = '23505', detail = 'kullanici-adi-alinmis';
  end if;

  /*
    Kendi geçmişinden geri alınan ad, geçmişten SİLİNİYOR: aynı ad hem
    güncel hem "bırakılmış" görünseydi çözümleme kendine döngü kurardı.
  */
  delete from public.username_history
   where eski_username = p_yeni and profile_id = ben;

  if eski is not null then
    insert into public.username_history (eski_username, profile_id)
    values (eski, ben)
    on conflict (eski_username) do update set birakma_ani = now();
  end if;

  /* Kilidi yalnız bu işlem boyunca aç; sonraki ifadeler yine kapalı. */
  perform set_config('sosyal.ad_degisimi', 'acik', true);

  update public.social_profiles
     set username = p_yeni, updated_at = now()
   where profile_id = ben
   returning * into sonuc;

  perform set_config('sosyal.ad_degisimi', '', true);

  return sonuc;

exception
  /*
    Tekil indeks yarışı: kontrol ile update arasında başka bir oturum
    aynı adı almış olabilir. Kullanıcıya ham çakışma değil, aynı anlaşılır
    cevap gidiyor.
  */
  when unique_violation then
    raise exception 'Bu kullanıcı adı alınmış.'
      using errcode = '23505', detail = 'kullanici-adi-alinmis';
end;
$$;

/* ================================================================== */
/*  5) ESKİ ADRESİN ÇÖZÜMÜ                                             */
/* ================================================================== */

/**
 * Verilen kullanıcı adının GÜNCEL karşılığını döndürür.
 *
 * `/profil/eskiad` açıldığında istemci bunu çağırıp `/profil/yeniad`
 * adresine yönlendiriyor.
 *
 * DAR: tek argüman, tek kolon, satır yok ya da tek satır.
 * `sosyal_gizli.sosyal_gorunur` kapısından geçiyor — çağıranın zaten
 * açabileceği bir profilden fazlasını söylemiyor. Bulamadığında sıfır
 * satır dönüyor; "böyle bir ad hiç olmadı" diye bir cevap üretmiyor,
 * yani ad tarama aracına dönüşmüyor.
 */
create or replace function public.sosyal_kullanici_adi_coz(p_ad text)
returns table (guncel_username text)
language sql
stable
security definer
set search_path = public
as $$
  select sp.username
    from public.username_history uh
    join public.social_profiles sp on sp.profile_id = uh.profile_id
   where uh.eski_username = sosyal_gizli.kullanici_adi_normalize(p_ad)
     and sp.username is not null
     and sosyal_gizli.sosyal_gorunur(sp.profile_id)
   limit 1
$$;

revoke all on function sosyal_gizli.kullanici_adi_baskasinda(text)   from public;
revoke all on function public.sosyal_kullanici_adi_degistir(text)    from public;
revoke all on function public.sosyal_kullanici_adi_coz(text)         from public;
grant execute on function public.sosyal_kullanici_adi_degistir(text) to authenticated;
grant execute on function public.sosyal_kullanici_adi_coz(text)      to authenticated;
