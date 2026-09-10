-- D aşaması, 3/3 — paylaşım oluşturma akışının üç RPC'si
--
-- NEDEN RPC, NEDEN DOĞRUDAN INSERT DEĞİL
-- --------------------------------------
-- İstemci `durum` kolonuna yazamıyor (20260924010000). Dolayısıyla
-- satırı açmak, dosyaları bağlamak ve yayına almak sahibi haklarıyla
-- çalışan `security definer` fonksiyonlardan geçmek zorunda. Kural üç
-- yerde birden değil, burada TEK yerde duruyor.
--
-- KALICI SİLME YOK
-- ----------------
-- `iptal` YALNIZ taslağı siler — henüz kimsenin görmediği, yarım kalmış
-- bir işlemi geri almak silme değil, işlemi tamamlamamaktır. Yayımlanmış
-- paylaşım için tek yol arşivlemek (`archived_at`); D'de kalıcı silme
-- ne RPC'si ne düğmesi var.

/* ================================================================== */
/*  1) BAŞLAT — taslak satırı açar                                     */
/* ================================================================== */

create or replace function public.sosyal_paylasim_baslat(
  p_istemci_anahtari uuid,
  p_aciklama text default null,
  p_kitle text default 'baglantilarim'
) returns public.posts
language plpgsql security definer set search_path = public
as $$
declare
  ben uuid := auth.uid();
  mevcut public.posts;
  yeni public.posts;
begin
  if ben is null then
    raise exception 'Oturum gerekli' using errcode = '42501';
  end if;

  if p_istemci_anahtari is null then
    raise exception 'istemci-anahtari-gerekli' using errcode = 'P0001';
  end if;

  /*
    Kitle sunucuda da doğrulanıyor. Kolondaki CHECK zaten var ama hata
    o noktada kısıt adıyla geliyor; arayüzün okuyabileceği bir mesaj
    değil. Ayrıca varsayılanın DAR olan kalması burada da korunuyor.
  */
  if p_kitle is null or p_kitle not in ('baglantilarim', 'alan-toplulugum') then
    raise exception 'gecersiz-kitle' using errcode = 'P0001';
  end if;

  /*
    TOPLULUĞA KATILMAYAN PAYLAŞIM AÇAMAZ

    C'nin 4. ürün kuralı: katılmayan öğrenci yalnız kendi profilini
    hazırlar. Alanı olmayan ya da topluluğa katılmamış birinin paylaşımı
    hiçbir kitleye ulaşamazdı; satırı açmak sahipsiz içerik üretmek olurdu.
  */
  if not exists (
    select 1 from public.social_profiles s
     where s.profile_id = ben and s.yayinda_mi and s.sector_id is not null
  ) then
    raise exception 'toplulukta-degil' using errcode = 'P0001';
  end if;

  /*
    İDEMPOTENS: aynı anahtar ikinci kez gelirse YENİ SATIR AÇMIYORUZ.
    Çift tıklama, ağ tekrarı ve yeniden deneme aynı taslağa düşüyor.
    Yalnız TASLAK döndürülüyor: tamamlanmış bir paylaşımın anahtarı
    yeniden kullanılırsa bu bir hata, sessizce o satırı vermek yanlış olur.
  */
  select * into mevcut from public.posts
   where author_id = ben and istemci_anahtari = p_istemci_anahtari;

  if found then
    if mevcut.durum <> 'taslak' then
      raise exception 'anahtar-kullanilmis' using errcode = 'P0001';
    end if;
    return mevcut;
  end if;

  insert into public.posts (author_id, aciklama, kitle, durum, istemci_anahtari)
  values (ben, nullif(btrim(coalesce(p_aciklama, '')), ''), p_kitle, 'taslak', p_istemci_anahtari)
  returning * into yeni;

  return yeni;
end;
$$;

/* ================================================================== */
/*  2) TAMAMLA — dosyaları bağlar ve yayına alır                       */
/* ================================================================== */

create or replace function public.sosyal_paylasim_tamamla(
  p_post_id uuid,
  p_medya jsonb
) returns public.posts
language plpgsql security definer set search_path = public
as $$
declare
  ben uuid := auth.uid();
  hedef public.posts;
  adet integer;
  onek text;
  kayit jsonb;
  sonuc public.posts;
begin
  if ben is null then
    raise exception 'Oturum gerekli' using errcode = '42501';
  end if;

  select * into hedef from public.posts where id = p_post_id;
  if not found or hedef.author_id <> ben then
    /* Var olmayan ve BAŞKASININ paylaşımı aynı hatayı veriyor: hangi
       kimliğin gerçek olduğu bu mesajdan öğrenilemesin. */
    raise exception 'taslak-bulunamadi' using errcode = 'P0001';
  end if;

  if hedef.durum <> 'taslak' then
    raise exception 'zaten-tamamlanmis' using errcode = 'P0001';
  end if;

  if p_medya is null or jsonb_typeof(p_medya) <> 'array' then
    raise exception 'fotograf-listesi-gecersiz' using errcode = 'P0001';
  end if;

  adet := jsonb_array_length(p_medya);
  if adet < 1 or adet > 10 then
    /* Şemadaki sira CHECK'i 1..10; burada SAYIYI da sınırlıyoruz ki
       "0 fotoğraflı paylaşım" hiç doğmasın. */
    raise exception 'fotograf-sayisi-1-10' using errcode = 'P0001';
  end if;

  /*
    YOL SUNUCUDA DOĞRULANIYOR

    Storage politikası yüklemeyi zaten kendi klasörüne kilitliyor; ama
    post_media satırına başkasının yolunu yazmak da engellenmeli. Aksi
    hâlde bir kullanıcı, görme hakkı olduğu bir dosyayı kendi
    paylaşımına iliştirip başkalarına servis edebilirdi.
  */
  onek := ben::text || '/' || p_post_id::text || '/';

  for kayit in select * from jsonb_array_elements(p_medya) loop
    if coalesce(kayit ->> 'storage_path', '') not like onek || '%' then
      raise exception 'gecersiz-dosya-yolu' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.post_media (post_id, sira, storage_path, genislik, yukseklik, alt)
  select
    p_post_id,
    (m ->> 'sira')::integer,
    m ->> 'storage_path',
    nullif(m ->> 'genislik', '')::integer,
    nullif(m ->> 'yukseklik', '')::integer,
    nullif(btrim(coalesce(m ->> 'alt', '')), '')
  from jsonb_array_elements(p_medya) as m;

  /* Sıra 1..adet olmalı: kopuk ya da tekrarlı sıra kapağı belirsiz kılar.
     PK(post_id, sira) tekrarı zaten reddediyor; boşluğu burada yakalıyoruz. */
  if (select count(*) from public.post_media where post_id = p_post_id and sira between 1 and adet) <> adet then
    raise exception 'fotograf-sirasi-kopuk' using errcode = 'P0001';
  end if;

  update public.posts set durum = 'hazir', updated_at = now()
   where id = p_post_id
  returning * into sonuc;

  return sonuc;
end;
$$;

/* ================================================================== */
/*  3) İPTAL — yalnız taslağı geri alır                                */
/* ================================================================== */

create or replace function public.sosyal_paylasim_iptal(p_post_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  ben uuid := auth.uid();
  hedef public.posts;
begin
  if ben is null then
    raise exception 'Oturum gerekli' using errcode = '42501';
  end if;

  select * into hedef from public.posts where id = p_post_id;
  if not found or hedef.author_id <> ben then
    raise exception 'taslak-bulunamadi' using errcode = 'P0001';
  end if;

  /*
    YAYIMLANMIŞ PAYLAŞIM BURADAN SİLİNEMEZ.
    Kalıcı silme D'nin kapsamı dışında; yayımlanmışın yolu arşiv.
  */
  if hedef.durum <> 'taslak' then
    raise exception 'yayimlanmis-paylasim-iptal-edilemez' using errcode = 'P0001';
  end if;

  /* post_media cascade ile gidiyor. Storage dosyalarını istemci kendi
     klasöründen siliyor — DELETE politikası yalnız kendi klasörüne
     izin verdiği için temizleme başkasının dosyasına dokunamıyor. */
  delete from public.posts where id = p_post_id;
end;
$$;

/* ------------------------------------------------------------------ */

revoke all on function public.sosyal_paylasim_baslat(uuid, text, text) from public;
revoke all on function public.sosyal_paylasim_tamamla(uuid, jsonb) from public;
revoke all on function public.sosyal_paylasim_iptal(uuid) from public;

grant execute on function public.sosyal_paylasim_baslat(uuid, text, text) to authenticated;
grant execute on function public.sosyal_paylasim_tamamla(uuid, jsonb) to authenticated;
grant execute on function public.sosyal_paylasim_iptal(uuid) to authenticated;
