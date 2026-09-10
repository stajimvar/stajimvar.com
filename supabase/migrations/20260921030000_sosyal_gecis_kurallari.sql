-- SOSYAL PORTFOLYO — GEÇİŞ KURALLARI (A aşaması, 3/3)
--
-- Önceki iki göç "kim hangi satırı görür" sorusunu çözdü. Bu göç "hangi
-- değişiklik yapılabilir" sorusunu çözüyor.
--
-- NEDEN RLS DEĞİL DE TETİKLEYİCİ
-- ------------------------------
-- RLS'in UPDATE politikasında `USING` ESKİ satırı, `WITH CHECK` YENİ
-- satırı görüyor — ama ikisini KARŞILAŞTIRAMIYOR. "bekliyor'dan kabul'e
-- yalnız isteği alan geçebilir" ya da "sector_id sonradan değişemez"
-- gibi kurallar tam olarak eski/yeni karşılaştırması. Bu yüzden geçiş
-- kuralları tetikleyicide; RLS ise yerinde duruyor ve ilk kapı olmaya
-- devam ediyor. İkisi birlikte çalışıyor, biri ötekinin yerine geçmiyor.

/* ------------------------------------------------------------------ */
/*  1) BAĞLANTI DURUM GEÇİŞLERİ                                        */
/* ------------------------------------------------------------------ */

/*
  Önceki hâlde RLS yalnız "taraf mısın" diyordu. Bu, isteği GÖNDERENİN
  kendi isteğini kabul etmesine izin veriyordu — yani tek taraflı
  bağlantı kurulabiliyordu. Bağlantının simetrik olmasının tek anlamı
  karşı tarafın onayı olduğuna göre bu açık, modelin kendisini
  geçersiz kılıyordu.

  İzin verilen geçişler:
    (yok)     → bekliyor    isteği gönderen, yalnız kendi adına
    bekliyor  → kabul       YALNIZ isteği alan
    bekliyor  → red         YALNIZ isteği alan
    bekliyor  → (silme)     gönderen geri çeker  ·  alan da reddedip siler
    kabul     → (silme)     iki taraftan biri bağlantıyı kaldırır

  Yasak olan her şey: kabul → bekliyor, red → kabul, red → bekliyor,
  kabul → red, gönderenin kendi isteğini kabulü, kimlik alanlarının
  değişmesi.

  Silme RLS'e bırakıldı (iki taraf da silebiliyor): "geri çekme" ile
  "bağlantıyı kaldırma" aynı işlem ve ikisi de her iki taraf için
  meşru.
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
    return new;
  end if;

  /* ---------------------------------------------------------- UPDATE */

  /*
    KİMLİK ALANLARI DEĞİŞMEZ

    Bu olmasaydı kullanıcı kendi satırındaki `addressee_id`'yi başka
    birine çevirip o kişiyle "kabul edilmiş" bir bağlantı uydurabilirdi:
    ters yön indeksi de kendine-istek kısıtı da bunu yakalamazdı.
  */
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id then
    raise exception 'Bağlantının tarafları değiştirilemez.'
      using errcode = '42501';
  end if;

  karsi_taraf := case when auth.uid() = old.requester_id
                      then old.addressee_id else old.requester_id end;

  /*
    SEKTÖR VE ENGEL HER GEÇİŞTE YENİDEN OKUNUYOR

    İlk istek gönderilirken RLS bunu kontrol ediyor, ama araya sektör
    değişikliği ya da engel girebilir. Kabul anında yeniden bakılmazsa
    farklı sektörden ya da engelli bir çift "kabul edilmiş" duruma
    geçebilirdi.
  */
  if not public.ayni_sektorde(karsi_taraf) or public.engelli_mi(karsi_taraf) then
    raise exception 'Farklı sektör ya da engel varken bağlantı değiştirilemez.'
      using errcode = '42501';
  end if;

  if new.durum is not distinct from old.durum then
    return new;  -- durum dışı alan güncellemesi (updated_at gibi)
  end if;

  if old.durum <> 'bekliyor' then
    raise exception 'Yalnız bekleyen bir istek kabul veya reddedilebilir.'
      using errcode = '42501';
  end if;

  if new.durum not in ('kabul', 'red') then
    raise exception 'Geçersiz bağlantı durumu geçişi.'
      using errcode = '42501';
  end if;

  /*
    KABUL VE RED YALNIZ İSTEĞİ ALANA AİT.
    Gönderen kendi isteğini kabul edemiyor; bu kural simetrik bağlantı
    modelinin tamamının dayandığı yer.
  */
  if auth.uid() is distinct from old.addressee_id then
    raise exception 'Bir isteği yalnız isteği alan kullanıcı yanıtlayabilir.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists connections_gecis_kontrol on public.connections;
create trigger connections_gecis_kontrol
  before insert or update on public.connections
  for each row execute function public.baglanti_gecis_kontrol();

/* ------------------------------------------------------------------ */
/*  2) SEKTÖR DEĞİŞTİRME KİLİDİ                                        */
/* ------------------------------------------------------------------ */

/*
  Sektör kesin görünürlük sınırı. Kullanıcı onu istediği zaman
  değiştirebilseydi sınır anlamını yitirirdi: bir topluluğu gezip
  sektörü değiştirip ötekini gezmek serbest olurdu.

  İZİN VERİLEN
    NULL → sektör      ilk seçim, herkes bir kez yapıyor
    admin her değişiklik

  YASAK
    sektör → başka sektör   (normal kullanıcı)
    sektör → NULL           (normal kullanıcı)

  İkincisi kritik: yalnız "başka sektöre geçiş" yasaklansaydı kullanıcı
  önce NULL'a çekip sonra yeni sektörü "ilk seçim" gibi yapardı. Kilit
  bu yüzden "bir kez yazılır" biçiminde.

  Kural yalnız `sector_id` kolonuna bakıyor: kullanıcı biyografisini,
  kullanıcı adını, şehrini, avatarını serbestçe düzenlemeye devam
  ediyor.

  Service-role'a özel bir yol AÇILMADI: bu tetikleyici `security
  invoker` (varsayılan) ve service-role zaten RLS'i atlıyor; ona ayrıca
  geniş bir kapı açmak gereksiz bir saldırı yüzeyi olurdu. İleride
  kontrollü sektör değişikliği süreci kurulursa o süreç `is_admin()`
  üzerinden ya da kendi denetimli RPC'siyle gelir.
*/
create or replace function public.sektor_kilidi()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sector_id is not distinct from old.sector_id then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if old.sector_id is null and new.sector_id is not null then
    return new;  -- ilk seçim
  end if;

  raise exception 'Sektör seçildikten sonra değiştirilemez.'
    using errcode = '42501';
end;
$$;

drop trigger if exists social_profiles_sektor_kilidi on public.social_profiles;
create trigger social_profiles_sektor_kilidi
  before update on public.social_profiles
  for each row execute function public.sektor_kilidi();

/*
  YÖNETİCİNİN YOLU AÇIKÇA TANIMLI

  Kilit tetikleyicide "admin geçebilir" diyor ama RLS'te yöneticinin
  UPDATE politikası yoktu: yönetici satıra hiç ulaşamıyordu ve güncelleme
  sessizce SIFIR satır etkiliyordu (testte yakalandı — hata yok, sonuç
  yok). Kilidin istisnası ancak bu politikayla birlikte anlam taşıyor.

  Kapsam bilinçli olarak dar: yalnız UPDATE. Yönetici sosyal profil
  silmiyor, oluşturmuyor; bugünkü tek işi kontrollü sektör değişikliği.
  Service-role'a ayrıca bir yol açılmadı — o zaten RLS'i atlıyor ve ona
  özel bir politika yazmak gereksiz bir yüzey olurdu.
*/
drop policy if exists "yonetici sosyal profili gunceller" on public.social_profiles;
create policy "yonetici sosyal profili gunceller" on public.social_profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

/* ------------------------------------------------------------------ */
/*  3) ENGEL BAĞLANTIYI KALDIRIR                                       */
/* ------------------------------------------------------------------ */

/*
  Engelledikten sonra aradaki bekleyen ya da kabul edilmiş bağlantının
  durması, engeli yarım bırakırdı: iki kullanıcı birbirini göremezken
  "bağlıyız" kaydı ayakta kalırdı ve sayaçlarda görünürdü.

  ATOMİK: silme, engel kaydının INSERT'iyle AYNI işlemde yapılıyor.
  Engel yazılıp bağlantı silinmeden önce araya başka bir işlem giremiyor;
  ikisi birlikte ya olur ya olmaz.

  `security definer`: silme, engelin yazıldığı işlemde ve çağıranın RLS
  politikalarından bağımsız olarak tamamlanmalı. Çağıran zaten bağlantının
  tarafı olduğu için bugün politika da izin verirdi; ama kural politikaya
  bağlı kalırsa ileride politika değiştiğinde engel sessizce yarım
  çalışırdı.

  ENGEL KALDIRILINCA BAĞLANTI GERİ GELMİYOR: satır silindi, geri
  getirecek bir kayıt yok. Yeniden bağlanmak için yeni istek
  gönderilmesi gerekiyor — kasıtlı.
*/
create or replace function public.engel_baglantiyi_kaldir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.connections
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists blocks_baglantiyi_kaldir on public.blocks;
create trigger blocks_baglantiyi_kaldir
  after insert on public.blocks
  for each row execute function public.engel_baglantiyi_kaldir();

revoke all on function public.baglanti_gecis_kontrol()   from public;
revoke all on function public.sektor_kilidi()            from public;
revoke all on function public.engel_baglantiyi_kaldir()  from public;
