-- İLAN BİLDİRİMİ — ÇALIŞAN FORM
--
-- /ilan-bildir sayfası "Bildirimler için özel bir form henüz yok;
-- iletisim@stajimvar.com adresine yazmanız yeterli" diyordu. Kapanmış
-- bir ilanı gören öğrencinin yapacağı iş, e-posta istemcisi açıp
-- bağlantıyı elle kopyalamaktı — yani pratikte kimse bildirmiyordu.
-- Oysa kapanmış ilanı listeden düşürmek bu ürünün asıl vaadi.
--
-- FORM ANONİM ÇALIŞIYOR
-- ---------------------
-- Hesap istenmiyor: bozuk ilanı gören kişi çoğunlukla giriş yapmamış
-- bir ziyaretçi. Hesap şartı, bildirimi hiç almamak demekti.
--
-- Ama YAZMA İSTEMCİDE DEĞİL. Tablo üzerinde INSERT politikası yok ve
-- aşağıdaki `security definer` fonksiyon anon/authenticated tarafından
-- ÇAĞRILAMIYOR. Sebebi hız sınırı: fonksiyon IP özetini parametre
-- alıyor, istemciye açık olsaydı her çağrıda rastgele bir özet
-- gönderip "saatte beş" kuralını tamamen atlatabilirdi.
--
-- Tek yazma yolu: Cloudflare Pages Function (functions/api/ilan-bildir.ts).
-- IP'yi yalnız o katman görüyor (`CF-Connecting-IP`), özeti orada
-- üretiyor ve servis anahtarıyla çağırıyor.

create type public.ilan_bildirim_sebebi as enum (
  'kapanmis_ilan',
  'yanlis_bilgi',
  'ucret_talebi',
  'ayirimci_ifade',
  'sahte_ilan',
  'kirik_baglanti',
  'diger'
);

create type public.ilan_bildirim_durumu as enum (
  'yeni',
  'inceleniyor',
  'kapatildi'
);

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),

  /*
    İlanın SİTEDEKİ adresi. Yabancı bir adres de gelebilir (kullanıcı
    yapıştırır); doğrulama burada değil, incelemede. Kayıt kaybetmemek
    kayıt temizliğinden önemli.
  */
  listing_url text not null,
  company_name text,
  position_title text,
  reason public.ilan_bildirim_sebebi not null,
  details text,

  /*
    DÖNÜŞ İÇİN, ZORUNLU DEĞİL

    İsteyene cevap yazmak için. Boş bırakılabiliyor: bildirimi yapmak
    için kimliğini vermek zorunda kalmak, bildirimi caydırır.
  */
  reporter_email text,

  /*
    HIZ SINIRI İÇİN IP'NİN HASH'İ — IP'NİN KENDİSİ DEĞİL

    "Saatte beş" kuralı bir sayaç istiyor, IP'nin kendisini saklamak
    istemiyor. Uç nokta IP'yi sunucu tarafında bir tuzla karıştırıp
    özetliyor; buraya yalnız özet geliyor. Özetten IP'ye dönülemiyor ve
    kayıt kişiyi tanımlamıyor.

    KVKK: form PII'si asgari — istenen tek kişisel veri, kullanıcının
    kendi isteğiyle verdiği e-posta.
  */
  ip_ozeti text,

  status public.ilan_bildirim_durumu not null default 'yeni',
  created_at timestamptz not null default now(),

  /*
    KALICI BİLDİRİM KUYRUĞU — AYRI TABLO DEĞİL, AYNI SATIR

    "Kuyrukta" demek için gerçek bir kayıt gerekiyor. Ayrı bir kuyruk
    tablosu, aynı olayı iki yerde tutup ikisinin ayrışmasına kapı
    açardı; kuyruğun durumu bildirimin KENDİ satırında.

      notified_at null + deneme 0   → kuyrukta, hiç denenmedi
      notified_at dolu              → yöneticiye ulaştı
      deneme > 0 + notified_at null → denendi, başarısız (son hata yazılı)

    E-posta hatası kaydı KAYBETTİRMİYOR: satır zaten yazılmış durumda,
    yalnız bu üç alan değişiyor.
  */
  notified_at timestamptz,
  notify_attempts integer not null default 0,
  notify_last_error text,

  /* Boş bildirim işe yaramıyor: adres ya da açıklama dolu olmalı. */
  constraint listing_reports_icerik_var
    check (length(btrim(listing_url)) > 0)
);

create index if not exists listing_reports_created_at_idx
  on public.listing_reports (created_at desc);
create index if not exists listing_reports_ip_ozeti_idx
  on public.listing_reports (ip_ozeti, created_at desc)
  where ip_ozeti is not null;

alter table public.listing_reports enable row level security;

/*
  OKUMA YALNIZ YÖNETİCİ

  Bildirimler başkasının gördüğü hataları ve isteyerek bırakılmış
  e-posta adreslerini taşıyor. INSERT politikası YOK: yazma tek kapıdan,
  aşağıdaki fonksiyondan geçiyor.
*/
drop policy if exists "yonetici bildirimleri okur" on public.listing_reports;
create policy "yonetici bildirimleri okur" on public.listing_reports
  for select to authenticated using (public.is_admin());

drop policy if exists "yonetici bildirimi gunceller" on public.listing_reports;
create policy "yonetici bildirimi gunceller" on public.listing_reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

/** Saat başına aynı IP özetinden kabul edilen en fazla bildirim. */
create or replace function public.ilan_bildirim_siniri()
returns integer
language sql
immutable
as $$ select 5 $$;

/**
 * Bildirimi kaydeder. Hız sınırını AŞAN çağrı hata veriyor.
 *
 * `security definer`: tabloda INSERT politikası yok ve olmaması
 * gerekiyor — yazma kuralı (sayım) politikayla ifade edilemiyor.
 *
 * Sayım IP ÖZETİNE göre: özet gelmezse sayım yapılamıyor ve kayıt
 * kabul ediliyor. Uç nokta özeti her zaman gönderiyor; bu dal,
 * sayacın yokluğunda bildirimi KAYBETMEMEK için var — hız sınırı bir
 * kolaylık, bildirim ise ürünün işi.
 */
create or replace function public.ilan_bildirimi_gonder(
  p_listing_url    text,
  p_reason         text,
  p_company_name   text default null,
  p_position_title text default null,
  p_details        text default null,
  p_reporter_email text default null,
  p_ip_ozeti       text default null
)
returns uuid
language plpgsql
security definer
/*
  `search_path` DARALTILDI

  `public` tek başına bırakılsaydı, yolun başına kendi şemasını
  koyabilen bir çağıran fonksiyonun içindeki adları gölgeleyebilirdi.
  `pg_catalog` önde ve yol sabit.
*/
set search_path = pg_catalog, public
as $$
declare
  yeni_id uuid;
  son_saat integer;
begin
  if p_listing_url is null or length(btrim(p_listing_url)) = 0 then
    raise exception 'İlanın sitedeki adresi gerekiyor.'
      using errcode = '23514', detail = 'adres-yok';
  end if;

  if p_ip_ozeti is not null then
    /*
      EŞ ZAMANLI İSTEKLERDE DE SAYIYOR

      "Say, sonra yaz" yarışa açıktı: aynı IP'den beş istek aynı anda
      gelse beşi de sayımda dördü görür ve beşi de yazılırdı. Aynı IP
      özeti için işlem boyu süren bir danışma kilidi alınıyor; aynı
      özetten gelen çağrılar sıraya giriyor, farklı özetler
      birbirini beklemiyor.
    */
    perform pg_advisory_xact_lock(hashtext(p_ip_ozeti));

    select count(*) into son_saat
      from public.listing_reports r
     where r.ip_ozeti = p_ip_ozeti
       and r.created_at > now() - interval '1 hour';

    if son_saat >= public.ilan_bildirim_siniri() then
      raise exception 'Bu saat içinde çok fazla bildirim gönderildi. Biraz sonra tekrar dene.'
        using errcode = '42901', detail = 'hiz-siniri';
    end if;
  end if;

  insert into public.listing_reports (
    listing_url, company_name, position_title, reason, details, reporter_email, ip_ozeti
  ) values (
    btrim(p_listing_url),
    nullif(btrim(coalesce(p_company_name, '')), ''),
    nullif(btrim(coalesce(p_position_title, '')), ''),
    /*
      Tanınmayan sebep 'diger'e düşüyor: istemci yeni bir değer
      gönderse bile bildirim kaybolmuyor.
    */
    coalesce(
      (case when p_reason = any (enum_range(null::public.ilan_bildirim_sebebi)::text[])
            then p_reason::public.ilan_bildirim_sebebi end),
      'diger'
    ),
    nullif(btrim(coalesce(p_details, '')), ''),
    nullif(btrim(coalesce(p_reporter_email, '')), ''),
    p_ip_ozeti
  )
  returning id into yeni_id;

  return yeni_id;
end;
$$;

/*
  ANON VE AUTHENTICATED ÇAĞIRAMIYOR — SINIR ATLATILAMASIN

  Fonksiyon IP özetini PARAMETRE olarak alıyor. `anon`a execute
  verilseydi istemci fonksiyonu doğrudan çağırıp her seferinde
  rastgele bir özet gönderebilir, "saatte beş" kuralını tamamen
  atlatabilirdi — sayaç istemcinin söylediğine güvenmiş olurdu.

  Özet yalnız sunucu katmanında üretiliyor (functions/api/ilan-bildir.ts,
  `CF-Connecting-IP` + sunucudaki tuz) ve o katman servis anahtarıyla
  çağırıyor. İstemcinin bu fonksiyona ulaşan hiçbir yolu yok.

  Tabloda da INSERT politikası yok: yazmanın tek kapısı bu fonksiyon,
  fonksiyonun tek çağıranı sunucu.
*/
revoke all on function public.ilan_bildirimi_gonder(text, text, text, text, text, text, text) from public;
revoke all on function public.ilan_bildirimi_gonder(text, text, text, text, text, text, text) from anon;
revoke all on function public.ilan_bildirimi_gonder(text, text, text, text, text, text, text) from authenticated;

comment on table public.listing_reports is
  'Ziyaretçilerin bildirdiği ilan hataları. Yazma yalnız '
  'public.ilan_bildirimi_gonder üzerinden (hız sınırı orada).';

/**
 * Kuyruk denemesini işaretler — başarı ya da hata.
 *
 * Servis anahtarıyla koşan yeniden deneme işçisi çağırıyor. Bildirim
 * satırı hiçbir durumda silinmiyor: e-postanın gönderilememesi
 * bildirimin kendisini değersizleştirmiyor.
 */
create or replace function public.ilan_bildirimi_kuyruk_isaretle(
  p_id    uuid,
  p_basarili boolean,
  p_hata  text default null
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.listing_reports
     set notify_attempts = notify_attempts + 1,
         notified_at = case when p_basarili then now() else notified_at end,
         notify_last_error = case when p_basarili then null else p_hata end
   where id = p_id;
$$;

revoke all on function public.ilan_bildirimi_kuyruk_isaretle(uuid, boolean, text) from public;
revoke all on function public.ilan_bildirimi_kuyruk_isaretle(uuid, boolean, text) from anon;
revoke all on function public.ilan_bildirimi_kuyruk_isaretle(uuid, boolean, text) from authenticated;

/*
  BEKLEYEN KUYRUK — yalnız yönetici okuyor.

  Sekiz denemeden sonra bırakılıyor: sonsuz yeniden deneme, kalıcı bir
  yapılandırma hatasını gürültüye çeviriyor. Satır kuyrukta kalıyor ve
  `notify_last_error` sebebi söylüyor.
*/
create or replace view public.ilan_bildirim_kuyrugu as
  select id, listing_url, company_name, position_title, reason, created_at,
         notify_attempts, notify_last_error
    from public.listing_reports
   where notified_at is null
     and notify_attempts < 8
   order by created_at;
