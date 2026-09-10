-- SOSYAL PORTFOLYO — RED BEKLEME SÜRESİ VE SEKTÖR TALEBİ (A aşaması, 4/4)
--
-- İki ürün kararı veritabanına yazılıyor:
--   1. Reddedilen istek KALICI engel değil; 30 gün sonra yeniden denenebiliyor.
--   2. Listede alanını bulamayan kullanıcı için dar kapsamlı bir talep kaydı.

/* ================================================================== */
/*  1) RED KALICI ENGEL DEĞİL                                          */
/* ================================================================== */

/*
  ÖNCEKİ DAVRANIŞ BİR YAN ETKİYDİ, KARAR DEĞİL

  `connections_cift_key` (least/greatest) çifti yönden bağımsız
  kilitliyor. Bu, ters yönde ikinci kayıt açılmasını engellemek için
  konmuştu — ama yan etkisi şu oldu: bir kez reddedilen kişi bir daha
  ASLA istek gönderemiyordu, çünkü `red` satırı tabloda duruyor ve yeni
  satır açılmasına izin vermiyordu.

  Reddetmek ile engellemek ayrı şeyler. Engel kalıcı bir sınır; red ise
  "şimdi değil". Artık:

    red edildi         → 30 gün boyunca aynı kişiye yeniden istek yok
    30 gün doldu       → AYNI satır güvenle "bekliyor"a dönebiliyor
    engel var          → süre dolsa bile yok
    sektör ayrıştı     → yok

  Süre `now()` ile, yani VERİTABANI saatiyle ölçülüyor; istemcinin
  gönderdiği hiçbir zaman değeri hesaba girmiyor.

  REDDEDİLENE "REDDEDİLDİN" DENMİYOR
  Bildirim üretilmiyor, satırda görünür bir işaret yok. Kullanıcı için
  tek fark, süre dolana kadar yeniden istek gönderememek.
*/

alter table public.connections
  add column if not exists responded_at timestamptz;

comment on column public.connections.responded_at is
  'Kabul ya da red anı. Yalnız tetikleyici yazıyor; istemcinin gönderdiği değer yok sayılıyor. 30 günlük yeniden deneme süresi bu alandan ölçülüyor.';

/*
  Yeniden deneme süresi tek yerde. Değişirse politika, tetikleyici ve
  testler aynı anda değişiyor.
*/
create or replace function public.baglanti_red_bekleme()
returns interval
language sql immutable
as $$ select interval '30 days' $$;

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
    çevirip o kişiyle "kabul edilmiş" bir bağlantı uydurabilirdi: ne ters
    yön indeksi ne kendine-istek kısıtı bunu yakalardı.

    Yön değiştirmek gereken tek meşru durum, reddeden kişinin sonradan
    kendisinin istek başlatmak istemesi. O da bu kolonlara dokunarak
    değil, `baglanti_yeniden_baslat()` ile yapılıyor.
  */
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id then
    raise exception 'Bağlantının tarafları değiştirilemez.'
      using errcode = '42501';
  end if;

  /*
    OTURUMSUZ ÇAĞRI: AKTÖRE BAĞLI KURALLAR DEĞERLENDİRİLEMİYOR

    Bu tetikleyicinin kurallarının çoğu "bunu KİM yapıyor" sorusuna
    dayanıyor. `auth.uid()` boşsa soracak kimse yok: bu yola yalnız
    service_role, göç betikleri ve bakım işleri düşüyor — hepsi RLS'i
    zaten tümüyle atlayan yollar, yani burada bir ayrıcalık kazanılmıyor.

    İstemci bu yola DÜŞEMİYOR: `authenticated` her zaman bir JWT taşıyor,
    `anon` rolünün ise connections üzerinde hiçbir yetkisi yok (revoke
    edildi). Kimlik kolonlarının değişmezliği burada da geçerli kalıyor —
    o kural aktöre değil satırın kendisine ait.
  */
  if auth.uid() is null then
    return new;
  end if;

  karsi_taraf := case when auth.uid() = old.requester_id
                      then old.addressee_id else old.requester_id end;

  /*
    SEKTÖR VE ENGEL HER GEÇİŞTE YENİDEN OKUNUYOR. İlk istek anında RLS
    bakıyor ama araya sektör değişikliği ya da engel girebilir.
  */
  if not public.ayni_sektorde(karsi_taraf) or public.engelli_mi(karsi_taraf) then
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
    /*
      Yeniden denemeyi YALNIZ ilk isteği gönderen yapabiliyor. Reddeden
      taraf "kendi reddini geri alıp" bağlantıyı diriltemiyor; onun yolu
      `baglanti_yeniden_baslat()` ile kendi isteğini başlatmak.
    */
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

/*
  REDDEDEN TARAF SONRADAN KENDİSİ BAŞLATABİLİYOR

  Eski `red` satırını "kabul"e çevirmek yasak: kabul, isteği GÖNDERENİN
  hâlâ istediği anlamına gelir ve bunu reddeden taraf tek başına
  varsayamaz. Doğru davranış, fikrini değiştiren kişinin KENDİ isteğini
  başlatması — yani satırın yön değiştirmesi.

  Yön, kimlik kolonları update edilerek değiştirilmiyor (o yol
  tetikleyicide kapalı ve kapalı kalmalı). Bunun yerine bu RPC eski
  satırı silip ters yönde yeni bir "bekliyor" satırı açıyor. İkisi tek
  fonksiyon gövdesinde, yani tek işlemde: arada başka bir istek araya
  giremiyor ve `connections_cift_key` ihlali oluşmuyor.

  Bekleme süresi burada UYGULANMIYOR. Süre, reddedilen kişinin ısrarını
  sınırlamak için var; reddeden kişinin fikrini değiştirip kendi
  isteğini göndermesi farklı bir eylem ve onu geciktirmenin koruyucu bir
  karşılığı yok.
*/
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

  /* Sektör ve engel kontrolü, doğrudan INSERT'teki kuralın aynısı. */
  if not public.sosyal_gorunur(hedef) then
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

revoke all on function public.baglanti_red_bekleme()      from public;
revoke all on function public.baglanti_yeniden_baslat(uuid) from public;
grant execute on function public.baglanti_red_bekleme()      to authenticated;
grant execute on function public.baglanti_yeniden_baslat(uuid) to authenticated;

/* ================================================================== */
/*  2) SEKTÖR TALEBİ — "Listede alanımı bulamadım"                     */
/* ================================================================== */

/*
  Kapalı listede alanını bulamayan kullanıcı geçici ya da uydurma bir
  sektöre ATANMIYOR. Bunun yerine talebini bırakabiliyor ve sektörsüz
  kalmaya devam ediyor — yani sosyal alan kapalı kalıyor.

  TALEP ERİŞİM VERMİYOR. Bu tablo `social_profiles.sector_id` alanına
  dokunmuyor; RLS'in sektör kapısı olduğu gibi duruyor. Talep açmak
  yalnızca "bu alanı da ekleyin" demek.

  ARAYÜZ HENÜZ YOK. Yönetim ekranı hazır olana kadar kullanıcı tarafında
  "Listede alanımı bulamadım" düğmesi ÇİZİLMEYECEK. Burada yalnız
  gerçek ve güvenli veri altyapısı kuruluyor; çalışmayan bir düğme
  gösterilmiyor.
*/
create table if not exists public.sector_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  /* Kullanıcının kendi yazdığı alan adı; kapalı listeye eklenmiyor. */
  requested_sector text not null
    check (length(btrim(requested_sector)) between 2 and 80),
  aciklama text check (aciklama is null or length(aciklama) <= 500),
  status text not null default 'bekliyor'
    check (status in ('bekliyor', 'incelendi', 'reddedildi', 'eklendi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/*
  AYNI ANDA TEK AÇIK TALEP

  Kısmi tekil indeks: kapanmış talepler (incelendi/reddedildi/eklendi)
  birikebiliyor ama açık talep bir tane. Düz UNIQUE kullanılsaydı
  kullanıcı ikinci kez hiç talep açamazdı.
*/
create unique index if not exists sector_requests_acik_talep_key
  on public.sector_requests (user_id) where status = 'bekliyor';

create index if not exists sector_requests_status_idx
  on public.sector_requests (status, created_at desc);

drop trigger if exists sector_requests_updated_at on public.sector_requests;
create trigger sector_requests_updated_at before update on public.sector_requests
  for each row execute function public.sosyal_updated_at();

alter table public.sector_requests enable row level security;

/*
  Kullanıcı kendi talebini açıyor ve okuyor — ama GÜNCELLEYEMİYOR.
  UPDATE politikası yalnız yöneticide olduğu için kullanıcı kendi
  talebinin durumunu "eklendi" yapamıyor.
*/
drop policy if exists "kendi sektor talebini acar" on public.sector_requests;
create policy "kendi sektor talebini acar" on public.sector_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'bekliyor');

drop policy if exists "kendi sektor talebini okur" on public.sector_requests;
create policy "kendi sektor talebini okur" on public.sector_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "sektor talebini yonetici gunceller" on public.sector_requests;
create policy "sektor talebini yonetici gunceller" on public.sector_requests
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.sector_requests to authenticated;
grant update on public.sector_requests to authenticated;  -- politika admin'e daraltıyor
revoke all on public.sector_requests from anon;
