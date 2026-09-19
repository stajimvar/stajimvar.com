-- BAĞLANTI YALNIZ AYNI ALANDA — KURAL GERİ GELİYOR VE ARTIK İKİ UÇTA DA VAR
--
-- KULLANICI KARARI (19 Eylül 2026)
-- -------------------------------
-- "Aynı sektörde olmayan insanlar birbirleriyle bağlantı kuramamalı ve
-- profillerini aratıp bulsalar bile kural izah edilmeli."
--
-- 20261018010000 aynı gün alan koşulunu KABUL yolundan kaldırmıştı; o
-- göçün teşhisi doğruydu ama çözümü kullanıcının istediği yön değildi.
-- Gerçek kusur "alan şartı var" değil, ŞARTIN TEK UÇTA OLMASIYDI: istek
-- gönderilebiliyor ama kabul edilemiyordu. Burada kural iki uca birden
-- konuyor, böylece kural çiğnenen istek hiç oluşmuyor.
--
-- PROFİL GÖRÜNÜRLÜĞÜNE DOKUNULMUYOR
-- ---------------------------------
-- Kullanıcı açıkça "profillerini aratıp bulsalar bile" dedi: arama ve
-- profil açma alan şartsız kalıyor (`sosyal_gorunur`, 20260926040000).
-- Kısıtlanan yalnız BAĞLANTI. Bu yüzden kural `sosyal_gorunur`a
-- eklenmiyor, ayrı bir koşul olarak duruyor.
--
-- `sosyal_gizli.ayni_sektorde` yeniden yürürlükte; 20261018010000'in ona
-- koyduğu "KULLANILMIYOR" notu kaldırılıyor.
--
-- KURALIN BEDELİ ÖLÇÜLDÜ (canlı, 19 Eylül 2026)
-- ---------------------------------------------
-- Yayındaki 21 öğrenci profilinin 16'sının (%76) alanı YOK, çünkü
-- 20260926040000 alansız yayımlamayı serbest bıraktı. Kural yürürlüğe
-- girince bu 16 kişi kimseyle bağlantı kuramaz ve kimse onlarla
-- kuramaz. Bu göç o kısıtı ZORLAMIYOR (alansız yayımlamayı yeniden
-- yasaklamak, 16 canlı satırda patlayan bir kısıt demekti — aynı hata
-- 20261014010000'de yaşandı). Çözüm arayüzde: `baglanti_engeli` sebebi
-- adıyla söylüyor ve kullanıcı "alanını seç" adımına yönlendiriliyor.

/* ================================================================== */
/*  1) GÖNDERME UCU — istek kuralı çiğneyerek hiç oluşmuyor            */
/* ================================================================== */

/*
  Politikanın adı 20260921020000'den beri "ayni sektore istek gonderir"
  ama gövdesi 20260926040000'den beri alana bakmıyordu: `sosyal_gorunur`
  o göçte alan şartını bıraktı, politika da ona dayanıyordu. Ad artık
  yeniden doğru.
*/
drop policy if exists "ayni sektore istek gonderir" on public.connections;
create policy "ayni sektore istek gonderir" on public.connections
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and sosyal_gizli.sosyal_gorunur(addressee_id)
    and sosyal_gizli.ayni_sektorde(addressee_id)
  );

/* ================================================================== */
/*  2) KABUL UCU — araya alan değişikliği girerse yine sınanıyor       */
/* ================================================================== */

/*
  Gövde 20261018010000'deki sürümün aynısı; yalnız alan koşulu geri
  geldi. Koşul iki uçta da olduğu için normal akışta burası hiç
  tetiklenmiyor: kural çiğneyen istek zaten oluşamıyor. Burası
  ARAYA GİREN DEĞİŞİKLİK için: istek gönderildikten sonra taraflardan
  biri alanını değiştirirse ya da engel koyarsa kabul edilemiyor.
*/
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
    ALAN VE ENGEL HER GEÇİŞTE YENİDEN OKUNUYOR. Gönderme ucunda da
    sınanıyor; burası araya giren değişiklik için.
  */
  if not sosyal_gizli.ayni_sektorde(karsi_taraf)
     or sosyal_gizli.engelli_mi(karsi_taraf) then
    raise exception 'Farklı alan ya da engel varken bağlantı değiştirilemez.'
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

comment on function sosyal_gizli.ayni_sektorde(uuid) is
  'Bağlantı kuralının kapısı: bağlantı yalnız aynı alandaki kişiler arasında kurulabilir (20261019010000). Profil görünürlüğü buna BAĞLI DEĞİL — arama ve profil açma alan şartsız.';

/* ================================================================== */
/*  3) SEBEBİ ADIYLA SÖYLEYEN RPC — arayüz kuralı izah edebilsin       */
/* ================================================================== */

/**
 * Bu kişiyle neden bağlantı kuramıyorum?
 *
 * Kullanıcı kararı: kural yalnız uygulanmakla kalmayıp AÇIKLANMALI.
 * Bunun için arayüzün sebebi bilmesi gerekiyor; tek tek profil ve alan
 * okumak yerine sunucu tek kelimeyle söylüyor. Değerler:
 *
 *   'yok'         bağlantı kurulabilir
 *   'alanim-yok'  BENİM alanım seçili değil  → "alanını seç" adımı
 *   'alani-yok'   KARŞI TARAFIN alanı yok    → yapılacak bir şey yok
 *   'farkli-alan' iki alan da var ama farklı
 *   'engel'       taraflardan biri ötekini engellemiş
 *   'gorunmez'    profil yayında değil ya da yok
 *
 * SIRA ÖNEMLİ: engel en üstte. Engellediğin kişiye alan sebebi
 * göstermek, onun alanı hakkında bilgi sızdırırdı.
 *
 * Kendi kimliğini sormak anlamsız ('yok' dönüyor, düğme zaten
 * çizilmiyor). Oturumsuz çağrıda 'gorunmez'.
 */
create or replace function public.baglanti_engeli(hedef uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null or hedef is null then 'gorunmez'
    when hedef = auth.uid() then 'yok'
    when sosyal_gizli.engelli_mi(hedef) then 'engel'
    when not exists (
      select 1 from public.social_profiles o
       where o.profile_id = hedef and o.yayinda_mi
    ) then 'gorunmez'
    when not exists (
      select 1 from public.social_profiles ben
       where ben.profile_id = auth.uid() and ben.sector_id is not null
    ) then 'alanim-yok'
    when not exists (
      select 1 from public.social_profiles o
       where o.profile_id = hedef and o.sector_id is not null
    ) then 'alani-yok'
    when sosyal_gizli.ayni_sektorde(hedef) then 'yok'
    else 'farkli-alan'
  end
$$;

revoke all on function public.baglanti_engeli(uuid) from public;
grant execute on function public.baglanti_engeli(uuid) to authenticated;
