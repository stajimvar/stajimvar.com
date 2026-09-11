-- G aşaması — paylaşım açmak topluluk üyeliğine bağlı değil
--
-- ÖLÇÜLEN KUSUR
-- -------------
-- `sosyal_paylasim_baslat` (20260924030000) şu kapıyı taşıyordu:
--
--   where s.profile_id = ben and s.yayinda_mi and s.sector_id is not null
--   ...
--   raise exception 'toplulukta-degil'
--
-- O gün doğruydu: `sector_id` dolu olmak "topluluğa katılmış" demekti.
-- Üyelik `community_members`e taşınınca (20260926030000) bu şart anlamını
-- kaybetti ama YERİNDE KALDI ve iki kişiyi haksız yere kilitledi:
--
--   · bölümü katalogla eşleşmeyen kullanıcı — `sector_id` NULL kalıyor,
--     dolayısıyla BAĞLANTILARINA bile paylaşım açamıyordu
--   · profilini gizleyen kullanıcı — geçici olarak kapatınca taslak bile
--     başlatamıyordu
--
-- İkisi de "profil, bağlantılar ve 'Bağlantılarım' kitlesi topluluk
-- olmadan çalışsın" kuralına aykırı.
--
-- YENİ KAPI: KİMLİK, ÜYELİK DEĞİL
-- --------------------------------
-- Paylaşım açmak için sosyal profilin ve bir KULLANICI ADININ olması
-- yetiyor. Adsız profil paylaşım açamıyor, çünkü paylaşımın gideceği bir
-- adres yok (`yayin_icin_kimlik_sart` de aynı şeyi söylüyor).
--
-- KİTLE KAPISI AYRI VE YERİNDE DURUYOR
-- ------------------------------------
-- "Alan topluluğum" kitlesi hâlâ üyelik istiyor; onu bu RPC değil,
-- `posts` üzerindeki `paylasim_kitlesi_kilidi` tetikleyicisi
-- (20260926040000) zorunlu kılıyor. Tetikleyici hem insert hem update
-- yolunu kapattığı için kural buradan çıkarılınca AÇILMIYOR — yalnız
-- doğru yere taşınmış oluyor.
--
-- GÖRÜNÜRLÜK DE AYRI: gizli profilin paylaşımını başkası zaten
-- göremiyor, çünkü `paylasim_gorunur` içindeki `sosyal_gorunur(author)`
-- false dönüyor. Yani bu şartı kaldırmak hiçbir içeriği açmıyor;
-- yalnızca kullanıcının kendi taslağını hazırlamasına izin veriyor.

create or replace function public.sosyal_paylasim_baslat(
  p_istemci_anahtari uuid,
  p_aciklama text default null,
  p_kitle text default 'baglantilarim'
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  ben   uuid := auth.uid();
  sonuc public.posts;
begin
  if ben is null then
    raise exception 'Oturum gerekli' using errcode = '42501';
  end if;

  if p_istemci_anahtari is null then
    raise exception 'istemci-anahtari-gerekli' using errcode = 'P0001';
  end if;

  if p_kitle is null or p_kitle not in ('baglantilarim', 'alan-toplulugum') then
    raise exception 'gecersiz-kitle' using errcode = 'P0001';
  end if;

  /*
    Tek önkoşul: adreslenebilir bir sosyal kimlik. Üyelik ve görünürlük
    burada SORULMUYOR — ikisi de ayrı kavram ve ayrı kapıları var.
  */
  if not exists (
    select 1 from public.social_profiles s
     where s.profile_id = ben and s.username is not null
  ) then
    raise exception 'sosyal-profil-eksik' using errcode = 'P0001';
  end if;

  /*
    İSTEMCİ ANAHTARI TEKİLLİĞİ DEĞİŞMEDİ: aynı anahtarla ikinci çağrı
    yeni satır açmıyor, mevcut taslağı döndürüyor. Ağ koptuğunda
    tekrarlanan istek ikinci bir paylaşım üretmesin diye.
  */
  select * into sonuc
    from public.posts p
   where p.author_id = ben and p.istemci_anahtari = p_istemci_anahtari;

  if found then
    if sonuc.durum <> 'taslak' then
      raise exception 'anahtar-kullanilmis' using errcode = 'P0001';
    end if;
    return sonuc;
  end if;

  insert into public.posts (author_id, aciklama, kitle, durum, istemci_anahtari)
  values (ben, nullif(btrim(coalesce(p_aciklama, '')), ''), p_kitle, 'taslak', p_istemci_anahtari)
  returning * into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.sosyal_paylasim_baslat(uuid, text, text) from public;
grant execute on function public.sosyal_paylasim_baslat(uuid, text, text) to authenticated;
