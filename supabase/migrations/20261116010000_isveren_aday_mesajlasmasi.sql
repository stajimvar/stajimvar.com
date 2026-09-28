-- İŞVEREN → ADAY MESAJLAŞMASI
--
-- NEDEN VAR
-- ---------
-- İşveren panelindeki aday listesinde ve aday profilinde tek iletişim
-- yolu `mailto:` idi: kullanıcı siteden çıkıyor, konuşma StajımVar'ın
-- dışında sürüyor, aday kimin yazdığını yalnız e-posta başlığından
-- anlıyor ve iki taraf da yazışmayı panelinde göremiyor.
--
-- 20261107010000 mesajlaşmayı kurdu ama ürün kararı gereği YALNIZ
-- ÖĞRENCİLER arasındaydı. Bu göç o kapıyı işverene, DAR bir koşulla
-- açıyor. İkinci bir mesaj sistemi kurulmuyor: aynı tablolar, aynı RLS,
-- aynı okundu/engel/şikâyet akışı.
--
-- İŞVEREN ŞİRKET KİMLİĞİYLE KONUŞUYOR
-- -----------------------------------
-- Sohbetin tarafları `social_profiles.profile_id`. Şirket hesabının
-- sosyal profili `sirket_id` dolu olan satır; adı ve logosu şirketin.
-- Yani aday kimin yazdığını sohbet başlığından görüyor ve ayrı bir
-- "gönderen kurumu" alanı UYDURULMUYOR.
--
-- ÖLÇÜLEN SINIR (üretim, 28 Eylül 2026): iki doğrulanmış şirketin de tek
-- üyesi var ve o üyenin `auth.uid()`'i şirketin sosyal profilinin
-- `profile_id`'si. Çok üyeli bir şirkette ikinci üyenin şirket sosyal
-- profili OLMAZ ve bu göç ona yazma yetkisi vermez — `sirket_sosyal_mi`
-- false döner, düğme sunucuda reddedilir. Bilinçli: birden çok üyenin
-- tek şirket sohbetini paylaşması ayrı bir tasarım (sohbet üyeliği
-- kişiden şirkete taşınmalı) ve bu göçün kapsamı değil.
--
-- KİM KİME YAZABİLİR
-- ------------------
--   öğrenci → öğrenci   değişmedi (aynı sektör, görünürlük, istek kuralları)
--   işveren → aday      DOĞRULANMIŞ şirketin üyesi, adaya AÇIK ARAYAN ise
--   aday → işveren      yalnız SOHBET VARSA (yanıt); soğuk başlatma yok
--   ötekiler            reddediliyor
--
-- ADAYIN RIZASI KAPININ KENDİSİ
-- -----------------------------
-- `is_arayan`/`staj_arayan` öğrencinin kendi açtığı anahtar ve
-- kapattığı anda listeden düşüyor. Mesaj izni aynı anahtara bağlı:
-- anahtar kapalıyken hiçbir işveren YENİ sohbet açamıyor.
--
-- SÜREN SOHBET KESİLMİYOR. Kesilseydi, konuşmanın ortasında anahtarı
-- kapatan aday karşı tarafı sessizce susturmuş olurdu. Aynı ilke
-- 20261107010000'de de yazılı: açık sohbet, profil sonradan gizlense de
-- sürüyor. Adayın konuşmayı bitirme aracı ENGELLEME (`engelli_mi`, iki
-- yönlü ve sohbeti iki tarafa da kapatıyor) ya da isteği silmek.

/* ================================================================== */
/*  1) YARDIMCILAR                                                     */
/* ================================================================== */

/**
 * Şirket kimliğiyle yazabilen hesap.
 *
 * Üç şart birden: sosyal profili şirkete bağlı, o şirket DOĞRULANMIŞ ve
 * kişi gerçekten o şirketin üyesi. Üçüncüsü olmadan, bir hesabın
 * `sirket_id`'sini kendi satırına yazması yetki almaya yeterdi.
 */
create or replace function sosyal_gizli.sirket_sosyal_mi(kim uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from public.social_profiles sp
      join public.company_members cm
        on cm.user_id = sp.profile_id and cm.company_id = sp.sirket_id
     where sp.profile_id = kim
       and sp.sirket_id is not null
       and public.sirket_dogrulandi(sp.sirket_id)
  )
$$;

/**
 * İşverenin yazabileceği aday.
 *
 * Öğrencinin sosyal profili var (sohbetin tarafı olabilmesi için şart)
 * ve öğrenci iş ya da staj arıyor — yani işveren listesine kendi
 * isteğiyle girmiş. `arayan_ogrenciler` listesinin kapısıyla aynı
 * koşul; iki yerde ayrı yazılsaydı listede görünen bir adaya mesaj
 * reddedilebilir ya da tersi olurdu.
 */
create or replace function sosyal_gizli.aday_mi(kim uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from public.student_profiles sp
      join public.social_profiles s on s.profile_id = sp.id
     where sp.id = kim
       and s.sirket_id is null
       and (sp.is_arayan or sp.staj_arayan)
  )
$$;

/** İki kişi arasında sohbet var mı — yanıt dalının kapısı. */
create or replace function sosyal_gizli.sohbet_var_mi(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.sohbetler s
     where s.kisi_a = least(a, b) and s.kisi_b = greatest(a, b)
  )
$$;

revoke all on function sosyal_gizli.sirket_sosyal_mi(uuid) from public, anon, authenticated;
revoke all on function sosyal_gizli.aday_mi(uuid)          from public, anon, authenticated;
revoke all on function sosyal_gizli.sohbet_var_mi(uuid, uuid) from public, anon, authenticated;

/* ================================================================== */
/*  2) MESAJ GÖNDER — İŞVEREN DALI EKLENDİ                            */
/* ================================================================== */
--
-- Gövde 20261107010000'deki ile AYNI; değişen iki yer var ve ikisi de
-- işaretli:
--   (1) `yalniz-ogrenciler` tek satırlık kontrolü üç dallı izne dönüştü;
--   (2) yeni sohbet ve bekleyen istekteki `sosyal_gorunur` kapısı
--       işveren dalında `aday_mi`ye bakıyor — işveren adayla aynı
--       sektörde ve "yayında" olamaz, o kapı onu her zaman keserdi.
--
-- HATA KODLARI AYNEN KORUNUYOR: izin verilmeyen her durum yine
-- `yalniz-ogrenciler` atıyor. Yeni bir kod eklenmedi — istemci
-- (`lib/queries/mesajlasma.ts`) kodları eşleyerek cümleye çeviriyor ve
-- tanımadığı bir kod genel hataya düşerdi.
create or replace function public.mesaj_gonder(p_alici uuid, p_metin text)
returns public.mesajlar
language plpgsql security definer set search_path = public
as $$
declare
  ben        uuid := auth.uid();
  metin      text := btrim(coalesce(p_metin, ''));
  a          uuid;
  b          uuid;
  s          public.sohbetler%rowtype;
  sonuc      public.mesajlar%rowtype;
  isveren_akisi boolean := false;
  gorunur    boolean;
begin
  if ben is null then
    raise exception 'oturum-yok' using errcode = '42501';
  end if;
  if p_alici is null or p_alici = ben then
    raise exception 'kendine-mesaj-yok' using errcode = 'P0001';
  end if;
  if metin = '' then
    raise exception 'mesaj-bos' using errcode = 'P0001';
  end if;
  if char_length(metin) > 2000 then
    raise exception 'mesaj-cok-uzun' using errcode = 'P0001';
  end if;

  /* ---- (1) İZİN: üç dal ---- */
  if sosyal_gizli.ogrenci_sosyal_mi(ben) and sosyal_gizli.ogrenci_sosyal_mi(p_alici) then
    /* Öğrenciler arası: 20261107010000'deki kurallar aynen. */
    isveren_akisi := false;

  elsif sosyal_gizli.sirket_sosyal_mi(ben)
        and (sosyal_gizli.aday_mi(p_alici) or sosyal_gizli.sohbet_var_mi(ben, p_alici)) then
    /*
      İşveren adaya yazıyor.

      `or sohbet_var_mi`: aday arayış anahtarını KAPATSA da süren sohbet
      kesilmiyor. Kesilseydi, konuşmanın ortasında anahtarı kapatan aday
      (örneğin o işverenle anlaştığı için) karşı tarafı sessizce
      susturmuş olurdu — iki taraf da neden yanıt gelmediğini anlamazdı.
      20261107010000 aynı ilkeyi zaten yazıyor: "AÇIK bir sohbet ise
      profil sonradan gizlense de sürüyor — yalnız engel kesiyor."

      YENİ sohbet açmak yine anahtara bağlı: `sohbet_var_mi` false
      olduğunda yalnız `aday_mi` kalıyor. Yani anahtar kapalıyken hiçbir
      işveren yeni bir konuşma başlatamıyor.
    */
    isveren_akisi := true;

  elsif sosyal_gizli.ogrenci_sosyal_mi(ben) and sosyal_gizli.sirket_sosyal_mi(p_alici)
        and sosyal_gizli.sohbet_var_mi(ben, p_alici) then
    /*
      Aday işverene YANIT veriyor. Soğuk başlatma yok: sohbet yoksa bu
      dal kapalı kalıyor ve öğrenci şirkete kendiliğinden yazamıyor.
      Kapsam kararı — işvereni istenmeyen mesaja açmak ayrı bir tartışma.
    */
    isveren_akisi := true;

  else
    raise exception 'yalniz-ogrenciler' using errcode = 'P0001';
  end if;

  if sosyal_gizli.engelli_mi(p_alici) then
    raise exception 'engel' using errcode = 'P0001';
  end if;

  /* Hız sınırı: dakikada 30 mesaj. */
  if (select count(*) from public.mesajlar m
       where m.gonderen = ben and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'cok-hizli' using errcode = 'P0001';
  end if;

  a := least(ben, p_alici);
  b := greatest(ben, p_alici);

  select * into s from public.sohbetler where kisi_a = a and kisi_b = b for update;

  /*
    ---- (2) GÖRÜNÜRLÜK KAPISI ----
    Öğrenciler arasında `sosyal_gorunur` (aynı sektör + yayında). İşveren
    dalında o kapı her zaman kapalı olurdu; oradaki karşılığı iznin
    kendisi, yani yukarıda çoktan doğrulandı.
  */
  gorunur := isveren_akisi or sosyal_gizli.sosyal_gorunur(p_alici);

  if not found then
    if not gorunur then
      raise exception 'profil-gorunmuyor' using errcode = 'P0001';
    end if;

    if sosyal_gizli.bagli_mi(ben, p_alici) then
      insert into public.sohbetler (kisi_a, kisi_b, baslatan, durum, kabul_at)
      values (a, b, ben, 'acik', now())
      returning * into s;
    else
      /*
        İşverenin ilk mesajı da İSTEK olarak düşüyor; ayrıcalık yok.
        Aday isteği silebiliyor (30 gün yeni istek yok) ve yanıt verene
        kadar işveren en çok 3 mesaj yazabiliyor. Doğrulanmış şirket
        diye sohbeti doğrudan açmak, adayın elindeki tek frene —
        istemediği konuşmayı hiç başlatmama hakkına — dokunurdu.
      */
      if exists (
        select 1 from public.sohbet_istek_redleri r
         where r.kimden = ben and r.kime = p_alici and r.created_at > now() - interval '30 days'
      ) then
        raise exception 'istek-reddedildi' using errcode = 'P0001';
      end if;
      if (select count(*) from public.sohbetler x
           where x.baslatan = ben and x.durum = 'istek' and x.created_at > now() - interval '1 day') >= 20 then
        raise exception 'istek-siniri' using errcode = 'P0001';
      end if;
      insert into public.sohbetler (kisi_a, kisi_b, baslatan, durum)
      values (a, b, ben, 'istek')
      returning * into s;
    end if;

  elsif s.durum = 'istek' then
    if s.baslatan = ben then
      if sosyal_gizli.bagli_mi(ben, p_alici) then
        update public.sohbetler set durum = 'acik', kabul_at = now() where id = s.id returning * into s;
      else
        if not gorunur then
          raise exception 'profil-gorunmuyor' using errcode = 'P0001';
        end if;
        if (select count(*) from public.mesajlar m where m.sohbet_id = s.id and m.gonderen = ben) >= 3 then
          raise exception 'istek-bekliyor' using errcode = 'P0001';
        end if;
      end if;
    else
      /* Alıcı yanıtladı: istek kabul edildi. */
      update public.sohbetler set durum = 'acik', kabul_at = now() where id = s.id returning * into s;
    end if;
  end if;

  insert into public.mesajlar (sohbet_id, gonderen, metin)
  values (s.id, ben, metin)
  returning * into sonuc;

  update public.sohbetler set son_mesaj_at = sonuc.created_at where id = s.id;

  /* Yazan kişi sohbeti okumuş sayılıyor: kendi mesajı okunmamış görünmesin. */
  insert into public.sohbet_okumalari (sohbet_id, profil_id, okundu_at)
  values (s.id, ben, sonuc.created_at)
  on conflict (sohbet_id, profil_id) do update set okundu_at = excluded.okundu_at;

  return sonuc;
end;
$$;

/* ================================================================== */
/*  3) ADAY PROFİLİ KULLANICI ADINI DA DÖNDÜRÜYOR                      */
/* ================================================================== */
--
-- Profil ekranındaki "Mesaj gönder" `/mesajlar/<kullaniciadi>` adresine
-- gidiyor; ad gelmezse düğme çizilemiyor. Liste RPC'si (`arayan_ogrenciler`)
-- bu alanı zaten döndürüyordu, tek profil RPC'si döndürmüyordu.
--
-- YENİ BİR ALAN AÇILMIYOR: kullanıcı adı zaten herkese açık profil
-- adresinin kendisi (`/profil/<ad>`). Öğrenciye gösterilen rıza metni de
-- bu göçle birlikte mesajı anıyor (bkz. src/components/ArayisKartlari.tsx).
create or replace function public.aday_profili(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
  dogrulanmis boolean;
begin
  select exists (
    select 1 from company_members cm
    where cm.user_id = auth.uid() and sirket_dogrulandi(cm.company_id)
  ) into dogrulanmis;

  if not dogrulanmis and not public.is_admin() then
    raise exception 'aday profili yalnizca dogrulanmis sirketlere acik'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id',         sp.id,
    'ad',         p.full_name,
    'eposta',     u.email,
    'avatarYolu', s.avatar_path,
    'kullaniciAdi', s.username,
    'okul',       sp.university,
    'fakulte',    sp.faculty,
    'bolum',      sp.department,
    'sinif',      sp.grade_level,
    'sehir',      sp.city,
    'mezuniyet',  sp.graduation_year,
    'tanitim',    sp.bio,
    'hedefRoller', sp.target_roles,
    'beceriler',  sp.soft_skills,
    'linkedin',   sp.linkedin_url,
    'github',     sp.github_username,
    'portfolyo',  sp.portfolio_url,
    'cvVar',      (sp.cv_path is not null),
    'isArayan',   sp.is_arayan,
    'stajArayan', sp.staj_arayan,
    'isAcildi',   sp.is_arayan_at,
    'stajAcildi', sp.staj_arayan_at,

    -- Beceriler iki kaynakta: serbest metin dizisi (soft_skills) ve
    -- kayıtlı beceri satırları. İkisi de öğrencinin kendi girdiği veri;
    -- ayrı listelerde gösteriliyor ki "doğrulanmış" gibi okunmasın.
    'yetkinlikler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'ad', k.name, 'seviye', k.level::text, 'yil', k.years_of_exp
             ) order by k.name), '[]'::jsonb)
      from student_skills k where k.student_id = sp.id
    ),

    'projeler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'baslik', pr.title,
               'aciklama', pr.description,
               'teknoloji', pr.tech_stack,
               'github', pr.github_url,
               'adres', pr.live_url
             ) order by pr.sort_order, pr.created_at), '[]'::jsonb)
      from student_projects pr where pr.student_id = sp.id
    )
  ) into sonuc
  from student_profiles sp
  left join profiles p on p.id = sp.id
  left join auth.users u on u.id = sp.id
  left join social_profiles s on s.profile_id = sp.id
  where sp.id = p_id
    -- Arayışı kapalı öğrencinin profili açılmıyor.
    and (sp.is_arayan or sp.staj_arayan);

  return sonuc;
end;
$$;

revoke all on function public.aday_profili(uuid) from public, anon;
grant execute on function public.aday_profili(uuid) to authenticated;

/* ================================================================== */
/*  4) SOHBET LİSTESİ ŞİRKET LOGOSUNU DA DÖNDÜRÜYOR                    */
/* ================================================================== */
--
-- Şirket sosyal profillerinde `avatar_path` çoğunlukla boş; sohbet
-- listesi baş harf çiziyordu. Aday, kendisine yazan şirketi ilk orada
-- görüyor ve "kimin yazdığını anlayabilmesi" bu ekranda başlıyor.
-- Sohbet başlığındaki çözümün aynısı; `AkisKarti` de aynı yedeği
-- kullanıyor.
--
-- `drop` ŞART: dönüş tablosuna kolon eklemek `create or replace` ile
-- olmuyor. Gövde 20261107010000'deki ile BİREBİR aynı, üç satır dışında
-- (kolon, seçim, join) — elle yeniden yazılmadı, kaynak dosyadan alınıp
-- programatik olarak değiştirildi.
drop function if exists public.sohbetlerim(text);

create or replace function public.sohbetlerim(p_kutu text default 'gelen')
returns table (
  sohbet_id           uuid,
  karsi_id            uuid,
  karsi_kullanici_adi text,
  karsi_gorunen_ad    text,
  karsi_avatar_path   text,
  karsi_logo_url      text,
  karsi_resmi_mi      boolean,
  durum               text,
  ben_baslattim       boolean,
  son_mesaj           text,
  son_mesaj_benim     boolean,
  son_mesaj_at        timestamptz,
  okunmamis           integer,
  karsi_okundu_at     timestamptz
)
language sql stable security definer set search_path = public
as $$
  with benimkiler as (
    select s.*, case when s.kisi_a = auth.uid() then s.kisi_b else s.kisi_a end as karsi
      from public.sohbetler s
     where auth.uid() in (s.kisi_a, s.kisi_b)
  )
  select
    s.id,
    s.karsi,
    sp.username,
    sp.gorunen_ad,
    sp.avatar_path,
    c.logo_url,
    coalesce(sp.resmi_mi, false),
    s.durum,
    s.baslatan = auth.uid(),
    left(son.metin, 140),
    son.gonderen = auth.uid(),
    s.son_mesaj_at,
    (select count(*)::int from public.mesajlar m
      where m.sohbet_id = s.id
        and m.gonderen <> auth.uid()
        and m.created_at > coalesce(
          (select o.okundu_at from public.sohbet_okumalari o where o.sohbet_id = s.id and o.profil_id = auth.uid()),
          '-infinity'::timestamptz)),
    case when s.durum = 'acik' then
      (select o.okundu_at from public.sohbet_okumalari o where o.sohbet_id = s.id and o.profil_id = s.karsi)
    end
  from benimkiler s
  join public.social_profiles sp on sp.profile_id = s.karsi
  left join public.companies c on c.id = sp.sirket_id
  left join lateral (
    select m.metin, m.gonderen from public.mesajlar m
     where m.sohbet_id = s.id order by m.created_at desc limit 1
  ) son on true
  where not sosyal_gizli.engelli_mi(s.karsi)
    and case coalesce(p_kutu, 'gelen')
          when 'istekler' then s.durum = 'istek' and s.baslatan <> auth.uid()
          else s.durum = 'acik' or s.baslatan = auth.uid()
        end
  order by s.son_mesaj_at desc
  limit 200
$$;

revoke all on function public.sohbetlerim(text) from public, anon;
grant execute on function public.sohbetlerim(text) to authenticated;
