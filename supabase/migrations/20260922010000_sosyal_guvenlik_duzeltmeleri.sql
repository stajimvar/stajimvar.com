-- SOSYAL PORTFOLYO — YEREL DOĞRULAMADA ÖLÇÜLEN GÜVENLİK AÇIKLARININ KAPATILMASI
--
-- Beş sosyal katman göçü (20260921010000–050000) yerel bir Supabase
-- yığınına uygulandı ve gerçek PostgREST istekleriyle sınandı. Aşağıdaki
-- beş bulgunun HEPSİ ölçümle üretildi; hiçbiri varsayım değil. Bu göç
-- onları kapatıyor ve önceki göç dosyalarına DOKUNMUYOR.
--
--   1) Alan kilidi DELETE + yeniden INSERT ile atlanıyordu.
--      Ölçüm: DELETE → HTTP 200 (1 satır), sonra farklı sector_id ile
--      POST → HTTP 201. `sektor_kilidi` yalnız `before update` olduğu için
--      hiç çalışmadı.
--
--   2) Dahili yardımcılar PostgREST üzerinden doğrudan çağrılabiliyordu.
--      Ölçüm: /rpc/engelli_mi → 200 `true`, üstelik `blocks` tablosunda
--      0 satır gören (yani engellendiğini bilmemesi gereken) kullanıcıya.
--      /rpc/paylasim_sahibi → okuyamadığı bir paylaşımın yazarını verdi.
--      /rpc/ayni_sektorde ve /rpc/aktif_sektor da açıktı.
--
--   3) Görünürlük asimetrikti: yayımlamamış kullanıcı aynı alandaki
--      yayımlanmış profilleri görüyor, kendisi görünmüyordu.
--      Ölçüm: yayımlanmamış burak → yayında demir: 1 satır;
--             yayında demir → yayımlanmamış burak: 0 satır.
--
--   4) Arşivlenmiş paylaşım beğenilebiliyordu.
--      Ölçüm: `posts` tablosunda 0 satır gören kullanıcı POST /post_likes
--      ile HTTP 201 aldı.
--
--   5) `anon` rolünün `sectors` ve `category_pool` üzerinde tablo yetkisi
--      duruyordu. Ölçüm: anon GET /sectors → HTTP 200 (RLS 0 satır
--      veriyor), buna karşılık /social_profiles → 401. Yani Supabase yeni
--      tablolara anon grant'ı VERİYOR ve revoke listesindeki eksiklik
--      gerçek bir savunma-derinliği boşluğu.

/* ================================================================== */
/*  0) GİZLİ ŞEMA — YARDIMCILARIN YENİ EVİ                             */
/* ================================================================== */

/*
  NEDEN AYRI ŞEMA, NEDEN "EXECUTE'U KALDIRMAK" DEĞİL

  PostgREST, `config.toml` içindeki `[api] schemas` listesinde duran
  şemalardaki HER çağrılabilir fonksiyonu `/rpc/<ad>` olarak sunuyor
  (varsayılan liste: public, graphql_public). Yani `public` içinde durup
  da "RPC olmayan" bir fonksiyon yazmanın yolu yok.

  EXECUTE yetkisini kaldırmak da çözüm değil, çünkü bu yardımcılar RLS
  POLİTİKALARININ içinden çağrılıyor ve politika ifadesi sorguyu ATAN
  kullanıcının haklarıyla değerlendiriliyor. Yetkiyi kaldırsaydık
  politikalar da çalışmaz, sosyal katmanın tamamı kapanırdı.
  `baglanti_gecis_kontrol` tetikleyicisi de bilerek `security invoker`
  (gerekçesi 20260921030000 içinde) ve o da bu yardımcıları çağırıyor.

  Kalan tek doğru yol: fonksiyonları PostgREST'in SUNMADIĞI bir şemaya
  taşımak ve `authenticated` rolüne o şemada USAGE + EXECUTE vermek.
  Böylece politika ve tetikleyici çalışmaya devam ediyor, `/rpc/...`
  yüzeyi kapanıyor.

  `anon`a USAGE VERİLMİYOR: sosyal katmandaki bütün politikalar
  `to authenticated` ve anon'un tablo yetkileri zaten geri alınmış.
*/

create schema if not exists sosyal_gizli;

revoke all on schema sosyal_gizli from public;
grant usage on schema sosyal_gizli to authenticated;

comment on schema sosyal_gizli is
  'Sosyal katmanın RLS yardımcıları. PostgREST bu şemayı sunmuyor; buradaki fonksiyonlar yalnız politika ve tetikleyici içinden çağrılabiliyor.';

/* ================================================================== */
/*  1) YARDIMCILARIN GİZLİ ŞEMADAKİ SÜRÜMLERİ                          */
/* ================================================================== */

/*
  Gövdeler 20260921020000'deki hâlleriyle birebir aynı; TEK anlam
  değişikliği `sosyal_gorunur` içinde ve aşağıda ayrıca gerekçelendirildi.
  Hepsi yine `security definer` + sabit `search_path`: politikanın içinden
  aynı tabloyu okumak gerekiyor, invoker olsalardı RLS kendi kendini
  çağırıp sonsuz özyinelemeye girerdi.
*/

/** Oturumdaki kullanıcının alanı (sektörü); profili yoksa NULL. */
create or replace function sosyal_gizli.aktif_sektor()
returns uuid
language sql stable security definer set search_path = public
as $$ select sector_id from public.social_profiles where profile_id = auth.uid() $$;

/**
 * İki yönlü engel kontrolü.
 *
 * Tek yönlü olsaydı engellenen kişi karşıdakini görmeye ve istek
 * göndermeye devam ederdi; engel işini yapmazdı.
 */
create or replace function sosyal_gizli.engelli_mi(hedef uuid)
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
 * Aynı alanda mıyız?
 *
 * İki tarafın da alanı DOLU ve EŞİT olmalı. `NULL = NULL` zaten yanlış
 * döner ama açıkça yazılıyor: alansız iki kullanıcı "aynı alanda"
 * sayılmamalı, yoksa alansızlar kendi aralarında görünür olurdu.
 */
create or replace function sosyal_gizli.ayni_sektorde(hedef uuid)
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
 * GÖRÜNÜRLÜK ARTIK SİMETRİK  (bulgu 3)
 * ------------------------------------
 * Eski sürüm yalnız HEDEFİN `yayinda_mi` değerine bakıyordu; bakan
 * tarafınkine bakmıyordu. Sonuç, ölçümle görüldüğü gibi, tek yönlü bir
 * ayna oluyordu: alanını seçmiş ama profilini yayımlamamış bir kullanıcı
 * aynı alandaki herkesin profilini, paylaşımlarını ve sayaçlarını
 * okuyabiliyor, kendisi kimseye görünmüyordu. Topluluğu görmek için
 * topluluğa girmiş olmak gerekir; bu yüzden `ben.yayinda_mi` koşulu
 * eklendi.
 *
 * `hedef = auth.uid()` dalı KORUNUYOR: kullanıcı yayımlamamışken de kendi
 * profilini, kendi paylaşımlarını ve kendi sayaçlarını görüyor. Kurulum
 * ekranından sonra profilin boş görünmesi bu dala bağlı.
 *
 * Kullanıcı profilini yeniden yayımladığında koşul yeniden sağlanıyor ve
 * aynı alandaki yayımlanmış profillere erişimi geri geliyor; kalıcı bir
 * durum saklanmıyor.
 */
create or replace function sosyal_gizli.sosyal_gorunur(hedef uuid)
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
          and ben.yayinda_mi
          and o.sector_id = ben.sector_id
          and o.yayinda_mi
      )
      and not sosyal_gizli.engelli_mi(hedef)
    )
  end
$$;

/** Paylaşımın sahibi. Politikalarda tekrar tekrar join yazmamak için. */
create or replace function sosyal_gizli.paylasim_sahibi(hedef_post uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select author_id from public.posts where id = hedef_post $$;

/**
 * Paylaşım şu anda beğenilebilir/kaydedilebilir mi?  (bulgu 4)
 *
 * Beğeni ve kaydetme politikaları eskiden yalnız YAZARIN görünürlüğüne
 * bakıyordu; paylaşımın kendisinin arşivlenmiş olup olmadığına
 * bakmıyordu. Arşiv "silme değil gizleme" olduğu için, kimliğini daha
 * önce görmüş bir kullanıcı sahibi arşivledikten sonra da beğeni satırı
 * yazabiliyordu (ölçüldü: HTTP 201) ve sahibi bunu "begeniler okunur"
 * politikasıyla görüyordu.
 *
 * Kural tek yerde: paylaşım var olacak, arşivlenmemiş olacak ve yazarı
 * bana görünür olacak.
 */
create or replace function sosyal_gizli.paylasim_etkilesime_acik(hedef_post uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.posts p
    where p.id = hedef_post
      and p.archived_at is null
      and sosyal_gizli.sosyal_gorunur(p.author_id)
  )
$$;

revoke all on function sosyal_gizli.aktif_sektor()                    from public;
revoke all on function sosyal_gizli.engelli_mi(uuid)                  from public;
revoke all on function sosyal_gizli.ayni_sektorde(uuid)               from public;
revoke all on function sosyal_gizli.sosyal_gorunur(uuid)              from public;
revoke all on function sosyal_gizli.paylasim_sahibi(uuid)             from public;
revoke all on function sosyal_gizli.paylasim_etkilesime_acik(uuid)    from public;

grant execute on function sosyal_gizli.aktif_sektor()                 to authenticated;
grant execute on function sosyal_gizli.engelli_mi(uuid)               to authenticated;
grant execute on function sosyal_gizli.ayni_sektorde(uuid)            to authenticated;
grant execute on function sosyal_gizli.sosyal_gorunur(uuid)           to authenticated;
grant execute on function sosyal_gizli.paylasim_sahibi(uuid)          to authenticated;
grant execute on function sosyal_gizli.paylasim_etkilesime_acik(uuid) to authenticated;

/* ================================================================== */
/*  2) POLİTİKALAR YENİ ŞEMAYA TAŞINIYOR                               */
/* ================================================================== */

/*
  Aşağıdaki politikaların ifadeleri eski `public.*` yardımcılarına
  bağımlı. Bu bağımlılıklar sürdükçe eski fonksiyonlar DÜŞÜRÜLEMEZ
  (Postgres bağımlılığı reddeder) — bu, bölüm 4'teki `drop` çağrılarının
  aynı zamanda bir güvenlik ağı olması demek: bir politika gözden kaçarsa
  göç sessizce geçmez, hata verir.
*/

-- social_profiles: aynı alandaki yayımlanmış profil
--
-- Eski ifade `aktif_sektor()` + `engelli_mi()` ile elle kuruluyordu ve
-- bakan tarafın yayında olup olmadığına bakmıyordu. Artık tek kapıdan
-- geçiyor: kural `sosyal_gorunur` içinde, bir yerde.
drop policy if exists "ayni sektordeki yayimlanmis profil okunur" on public.social_profiles;
create policy "ayni sektordeki yayimlanmis profil okunur" on public.social_profiles
  for select to authenticated
  using (sosyal_gizli.sosyal_gorunur(profile_id));

-- posts
drop policy if exists "ayni sektordeki paylasim okunur" on public.posts;
create policy "ayni sektordeki paylasim okunur" on public.posts
  for select to authenticated
  using (archived_at is null and sosyal_gizli.sosyal_gorunur(author_id));

-- post_media
drop policy if exists "paylasim gorseli okunur" on public.post_media;
create policy "paylasim gorseli okunur" on public.post_media
  for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and (p.author_id = auth.uid()
             or (p.archived_at is null and sosyal_gizli.sosyal_gorunur(p.author_id)))
    )
  );

drop policy if exists "kendi gorselini yonetir" on public.post_media;
create policy "kendi gorselini yonetir" on public.post_media
  for all to authenticated
  using (sosyal_gizli.paylasim_sahibi(post_id) = auth.uid())
  with check (sosyal_gizli.paylasim_sahibi(post_id) = auth.uid());

-- post_likes
--
-- `paylasim_etkilesime_acik` arşiv koşulunu da taşıyor (bulgu 4).
drop policy if exists "gorunen paylasimi begenir" on public.post_likes;
create policy "gorunen paylasimi begenir" on public.post_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and sosyal_gizli.paylasim_etkilesime_acik(post_id)
  );

drop policy if exists "begeniler okunur" on public.post_likes;
create policy "begeniler okunur" on public.post_likes
  for select to authenticated
  using (user_id = auth.uid() or sosyal_gizli.paylasim_sahibi(post_id) = auth.uid());

-- post_saves
--
-- `using` DEĞİŞMİYOR: kullanıcı kendi kayıt satırını her zaman görebilmeli
-- ve kaldırabilmeli — paylaşım sonradan arşivlense bile. Sıkılaşan yalnız
-- YENİ kayıt eklemek (`with check`).
drop policy if exists "kaydedilenler yalniz sahibine" on public.post_saves;
create policy "kaydedilenler yalniz sahibine" on public.post_saves
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and sosyal_gizli.paylasim_etkilesime_acik(post_id)
  );

-- connections
drop policy if exists "ayni sektore istek gonderir" on public.connections;
create policy "ayni sektore istek gonderir" on public.connections
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and sosyal_gizli.sosyal_gorunur(addressee_id)
  );

-- profile_categories
drop policy if exists "gorunen profilin kategorileri okunur" on public.profile_categories;
create policy "gorunen profilin kategorileri okunur" on public.profile_categories
  for select to authenticated
  using (acik and sosyal_gizli.sosyal_gorunur(profile_id));

/* ================================================================== */
/*  3) YARDIMCIYA BAĞLI FONKSİYON GÖVDELERİ                            */
/* ================================================================== */

/*
  Politika ifadeleri fonksiyon OID'sine bağlanıyor, fonksiyon GÖVDELERİ
  ise metin olarak saklanıp çalışma anında çözülüyor. Bu yüzden gövdesinde
  `public.<yardimci>` yazan her fonksiyon yeniden tanımlanmak zorunda.
  Aşağıdaki üçü dışında yardımcı çağıran fonksiyon yok (tarandı).

  Gövdeler, yalnız şema ön eki değişmiş hâlleriyle 20260921020000 ve
  20260921040000'deki son sürümlerinin aynısı. Davranış değişikliği YOK.
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
  where sosyal_gizli.sosyal_gorunur(hedef)
$$;

revoke all on function public.sosyal_sayaclar(uuid) from public;
grant execute on function public.sosyal_sayaclar(uuid) to authenticated;

create or replace function public.baglanti_gecis_kontrol()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  karsi_taraf uuid;
begin
  /* ---------------------------------------------------------- INSERT */
  if tg_op = 'INSERT' then
    if new.durum <> 'bekliyor' then
      raise exception 'Bağlantı yalnız "bekliyor" durumunda açılabilir.'
        using errcode = '42501';
    end if;
    /* İstemci ne gönderirse göndersin: yeni istekte yanıt zamanı yok. */
    new.responded_at := null;
    return new;
  end if;

  /* ---------------------------------------------------------- UPDATE */

  /*
    KİMLİK ALANLARI DEĞİŞMEZ

    Bu olmasaydı kullanıcı kendi satırındaki addressee_id'yi başka birine
    çevirip o kişiyle "kabul edilmiş" bir bağlantı uydurabilirdi.
  */
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id then
    raise exception 'Bağlantının tarafları değiştirilemez.'
      using errcode = '42501';
  end if;

  /*
    OTURUMSUZ ÇAĞRI: aktöre bağlı kurallar değerlendirilemiyor. Bu yola
    yalnız service_role, göç betikleri ve bakım işleri düşüyor; hepsi
    RLS'i zaten atlıyor, yani burada bir ayrıcalık kazanılmıyor. Kimlik
    değişmezliği yukarıda, bu daldan ÖNCE uygulanıyor.
  */
  if auth.uid() is null then
    return new;
  end if;

  karsi_taraf := case when auth.uid() = old.requester_id
                      then old.addressee_id else old.requester_id end;

  /*
    ALAN VE ENGEL HER GEÇİŞTE YENİDEN OKUNUYOR. İlk istek anında RLS
    bakıyor ama araya alan değişikliği ya da engel girebilir.
  */
  if not sosyal_gizli.ayni_sektorde(karsi_taraf)
     or sosyal_gizli.engelli_mi(karsi_taraf) then
    /*
      METİN ORİJİNALİYLE AYNI KALIYOR. Bu bir veritabanı istisnası;
      kullanıcıya doğrudan gösterilmiyor ama testler ve çağıran kod ona
      göre yazılmış. Arayüzdeki "sektör → alan" sözcük kararı ekran
      metinlerini kapsıyor, sunucu hata dizelerini değil.
    */
    raise exception 'Farklı sektör ya da engel varken bağlantı değiştirilemez.'
      using errcode = '42501';
  end if;

  if new.durum is not distinct from old.durum then
    /* Durum dışı güncelleme: yanıt zamanı istemciyle oynatılamaz. */
    new.responded_at := old.responded_at;
    return new;
  end if;

  /* ------------------------------------------ red → bekliyor (yeniden dene) */
  if old.durum = 'red' and new.durum = 'bekliyor' then
    if auth.uid() is distinct from old.requester_id then
      raise exception 'Reddedilen isteği yalnız gönderen yeniden başlatabilir.'
        using errcode = '42501';
    end if;

    /*
      Süre ESKİ satırın yanıt zamanından ölçülüyor: istemci `responded_at`
      alanına eski bir tarih yazarak süreyi atlayamıyor.
    */
    if old.responded_at is null
       or now() - old.responded_at < public.baglanti_red_bekleme() then
      raise exception 'Reddedilen isteği yeniden göndermek için bekleme süresi dolmadı.'
        using errcode = '42501';
    end if;

    new.responded_at := null;
    return new;
  end if;

  /* ------------------------------------------------- bekliyor → kabul/red */
  if old.durum <> 'bekliyor' then
    raise exception 'Yalnız bekleyen bir istek kabul veya reddedilebilir.'
      using errcode = '42501';
  end if;

  if new.durum not in ('kabul', 'red') then
    raise exception 'Geçersiz bağlantı durumu geçişi.'
      using errcode = '42501';
  end if;

  /*
    KABUL VE RED YALNIZ İSTEĞİ ALANA AİT. Gönderen kendi isteğini kabul
    edemiyor; simetrik bağlantı modelinin tamamı buna dayanıyor.
  */
  if auth.uid() is distinct from old.addressee_id then
    raise exception 'Bir isteği yalnız isteği alan kullanıcı yanıtlayabilir.'
      using errcode = '42501';
  end if;

  new.responded_at := now();
  return new;
end;
$$;

create or replace function public.baglanti_yeniden_baslat(hedef uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ben uuid := auth.uid();
  eski public.connections%rowtype;
begin
  if ben is null then
    raise exception 'Oturum gerekiyor.' using errcode = '42501';
  end if;
  if hedef is null or hedef = ben then
    raise exception 'Geçersiz hedef.' using errcode = '22023';
  end if;

  /* Alan ve engel kontrolü, doğrudan INSERT'teki kuralın aynısı. */
  if not sosyal_gizli.sosyal_gorunur(hedef) then
    raise exception 'Bu kullanıcıya istek gönderilemez.' using errcode = '42501';
  end if;

  select * into eski from public.connections
  where (requester_id = ben and addressee_id = hedef)
     or (requester_id = hedef and addressee_id = ben);

  if found then
    /*
      Yalnız REDDEDİLMİŞ ve BENİM reddettiğim bir kayıt yön
      değiştirebiliyor. Bekleyen bir istek varsa yanıtlanmalı; kabul
      edilmiş bir bağlantı zaten var.
    */
    if eski.durum <> 'red' or eski.addressee_id <> ben then
      raise exception 'Yalnız kendi reddettiğin bir istek yeniden başlatılabilir.'
        using errcode = '42501';
    end if;
    delete from public.connections
    where requester_id = eski.requester_id and addressee_id = eski.addressee_id;
  end if;

  insert into public.connections(requester_id, addressee_id, durum)
  values (ben, hedef, 'bekliyor');
end;
$$;

revoke all on function public.baglanti_yeniden_baslat(uuid) from public;
grant execute on function public.baglanti_yeniden_baslat(uuid) to authenticated;

/* ================================================================== */
/*  4) ESKİ PUBLIC YARDIMCILARI DÜŞÜYOR — /rpc YÜZEYİ KAPANIYOR        */
/* ================================================================== */

/*
  `cascade` BİLEREK KULLANILMIYOR. Gözden kaçan bir politika ya da
  fonksiyon kalmışsa Postgres bu satırlarda hata veriyor ve göç duruyor;
  cascade olsaydı o politika sessizce SİLİNİR ve tablo korumasız kalırdı.
*/
drop function if exists public.sosyal_gorunur(uuid);
drop function if exists public.paylasim_sahibi(uuid);
drop function if exists public.ayni_sektorde(uuid);
drop function if exists public.engelli_mi(uuid);
drop function if exists public.aktif_sektor();

/* ================================================================== */
/*  5) KENDİ SOSYAL PROFİLİNİ SİLME KAPANIYOR                          */
/* ================================================================== */

/*
  ALAN KİLİDİNİN GERÇEK KAPISI

  `sektor_kilidi()` yalnız `before update` tetikleyicisi. Kullanıcı satırı
  SİLİP yeniden açtığında `old` diye bir şey olmadığı için kilit hiç
  çalışmıyordu; ölçümde silme HTTP 200, farklı alanla yeniden kurulum
  HTTP 201 döndü.

  İKİ KAPI BİRDEN kapatılıyor, çünkü tek başına politika yetmez:
    · `for all` politikası DELETE'i de kapsıyordu → yerine yalnız
      SELECT / INSERT / UPDATE politikaları konuyor. DELETE için hiçbir
      politika YOK, yani izin veren bir ifade de yok.
    · Tablo yetkisi de geri alınıyor → politika yanlışlıkla geri gelse
      bile PostgREST isteği yetki katmanında duruyor.

  HESAP SİLME BOZULMUYOR: `social_profiles.profile_id` →
  `public.profiles(id) on delete cascade` ve `profiles.id` →
  `auth.users(id) on delete cascade`. Referans bütünlüğü eylemleri sistem
  tarafından, tablo sahibinin haklarıyla ve RLS'e tabi olmadan
  çalıştırılıyor; bu revoke onları etkilemiyor (testte kanıtlanıyor).

  YÖNETİCİYE DELETE AÇILMIYOR: bugün sosyal profil silen bir yönetim
  akışı yok. Olmayan bir ihtiyaç için yetki açmak gereksiz yüzey olurdu;
  gerekirse kendi göçüyle gelir. `service_role` zaten RLS'i atlıyor ve
  tablo yetkisi ayrı; bakım yolu kapanmıyor.
*/

drop policy if exists "kendi sosyal profilini yonetir" on public.social_profiles;

drop policy if exists "kendi sosyal profilini okur" on public.social_profiles;
create policy "kendi sosyal profilini okur" on public.social_profiles
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists "kendi sosyal profilini olusturur" on public.social_profiles;
create policy "kendi sosyal profilini olusturur" on public.social_profiles
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "kendi sosyal profilini gunceller" on public.social_profiles;
create policy "kendi sosyal profilini gunceller" on public.social_profiles
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

revoke delete on public.social_profiles from authenticated;

/* ================================================================== */
/*  6) ANONİM YETKİLERİ — SAVUNMA DERİNLİĞİ                            */
/* ================================================================== */

/*
  `sectors` ve `category_pool` 20260921020000'deki revoke listesinde
  yoktu. Ölçüm, Supabase'in yeni tablolara `anon` grant'ı verdiğini
  gösterdi (anon GET /sectors → 200). Bugün satır sızmıyor çünkü
  politikaların hepsi `to authenticated`; ama ileride yanlışlıkla
  `to public` bir politika eklenirse anon'un tablo yetkisi hazır
  beklemiş olurdu.

  Alan listesi böylece yalnız giriş yapmış kurulum kullanıcısına geliyor;
  oturumsuz profil kapısı istemci tarafında olduğu için etkilenmiyor.
*/
revoke all on public.sectors, public.category_pool from anon;

/* Listenin tamamı bir kez daha, eksiksiz olsun diye: */
revoke all on public.social_profiles, public.posts, public.post_media,
  public.post_likes, public.post_saves, public.connections,
  public.blocks, public.reports, public.profile_categories,
  public.sector_requests from anon;
