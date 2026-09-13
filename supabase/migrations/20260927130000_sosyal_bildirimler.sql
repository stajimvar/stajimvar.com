-- SOSYAL BİLDİRİMLER: BAĞLANTI İSTEĞİ, KABUL VE BEĞENİ
--
-- NEDEN VAR
-- ---------
-- `notifications` tablosu yalnız İŞ BAŞVURUSU olaylarıyla doluyordu
-- (`yeni_basvuru`, `gorusme_daveti`, `teklif`…). Sosyal katmanda hiç
-- bildirim üretilmiyordu: bağlantı isteği gelince kullanıcı bunu ancak
-- Bağlantılar sayfasına kendi girip bakarsa görüyordu, beğeni ise hiçbir
-- yerde görünmüyordu.
--
-- Bu göç üç olayı bildirime bağlıyor. Altyapı aynı: aynı tablo, aynı
-- RLS, aynı okundu akışı. Yeni bir bildirim sistemi kurulmuyor.
--
-- KENDİ YAPTIĞININ BİLDİRİMİ GELMİYOR
-- -----------------------------------
-- Var olan `bildirim_yaz` yardımcısının kuralı: işlemi yapan kişi kendi
-- işinin bildirimini almıyor, çünkü o an ekranda zaten sonucunu
-- görüyor. Aynı kural burada da geçerli — kendi paylaşımını beğenen
-- kendine bildirim üretmiyor.

-- ------------------------------------------------------------------
-- 1) YİNELENME KORUMASI
-- ------------------------------------------------------------------
--
-- Aynı olay iki kez bildirim üretmemeli: istek geri çekilip yeniden
-- gönderilirse ya da beğeni kaldırılıp yeniden verilirse kullanıcının
-- zili iki kez dolmamalı. Tabloda doğal bir anahtar yok, bu yüzden
-- olayın kimliği ayrı bir kolonda taşınıyor.
--
-- NULL kabul ediyor: eski başvuru bildirimlerinin böyle bir anahtarı
-- yok ve olması da gerekmiyor (onların yinelenmesi başka bir kapıdan
-- engelleniyor). Benzersizlik yalnız dolu değerlerde.
alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

comment on column public.notifications.dedupe_key is
  'Olayın kimliği. Aynı olay ikinci kez bildirim üretmiyor; NULL = eski başvuru bildirimleri.';

-- ------------------------------------------------------------------
-- 2) SOSYAL BİLDİRİM YAZICISI
-- ------------------------------------------------------------------
--
-- `security definer`: `notifications` tablosunun INSERT politikası YOK
-- ve olmamalı — kullanıcı kendine bildirim uyduramamalı, başkasına
-- bildirim gönderememeli. Yazma yalnız tetikleyicilerden geçiyor.
--
-- `on conflict do nothing`: yinelenen olay sessizce düşüyor. Hata
-- fırlatmak tetikleyiciyi ve onunla birlikte ASIL İŞLEMİ (isteği
-- göndermeyi, beğenmeyi) geri alırdı; bildirim yazılamadı diye beğeni
-- kaybolmamalı.
create or replace function sosyal_gizli.bildirim_yaz(
  p_alici uuid,
  p_tur text,
  p_baslik text,
  p_govde text,
  p_adres text,
  p_anahtar text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_alici is null then
    return;
  end if;
  insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
  values (p_alici, p_tur, p_baslik, p_govde, p_adres, p_anahtar)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

/**
 * Bildirimde gösterilecek ad.
 *
 * Sosyal profildeki görünen ad, yoksa kullanıcı adı, o da yoksa nötr
 * bir sözcük. Ad UYDURULMUYOR: profili olmayan biri için "Bir öğrenci"
 * yazıyor, boş bir tırnak ya da kimlik değil.
 */
create or replace function sosyal_gizli.bildirim_adi(p_kisi uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(
    nullif(trim(o.gorunen_ad), ''),
    '@' || nullif(trim(o.username), ''),
    'Bir öğrenci'
  )
  from public.social_profiles o
  where o.profile_id = p_kisi
$$;

-- ------------------------------------------------------------------
-- 3) BAĞLANTI İSTEĞİ VE KABULÜ
-- ------------------------------------------------------------------
--
-- İki ayrı olay, iki ayrı alıcı:
--   istek gelir  -> `addressee_id` bildirim alır
--   istek kabul  -> `requester_id` bildirim alır ("kabul edildi")
--
-- Reddedilen istekte bildirim YOK ve olmamalı: reddedildiğini haber
-- vermek, reddeden kişiyi açıklama yapmak zorunda bırakıyor. Sessiz
-- red bilinçli bir karar (aynı gerekçe `BaglantiDugmesi` içinde de
-- yazılı).
create or replace function sosyal_gizli.baglanti_bildirimi()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' and NEW.durum = 'bekliyor' then
    perform sosyal_gizli.bildirim_yaz(
      NEW.addressee_id,
      'baglanti_istegi',
      sosyal_gizli.bildirim_adi(NEW.requester_id) || ' bağlantı isteği gönderdi',
      'İsteği kabul edebilir ya da yok sayabilirsin.',
      '/agim/baglantilar',
      'baglanti_istegi:' || NEW.requester_id || ':' || NEW.addressee_id
    );
  elsif TG_OP = 'UPDATE' and NEW.durum = 'kabul' and OLD.durum is distinct from 'kabul' then
    perform sosyal_gizli.bildirim_yaz(
      NEW.requester_id,
      'baglanti_kabul',
      sosyal_gizli.bildirim_adi(NEW.addressee_id) || ' bağlantı isteğini kabul etti',
      'Artık paylaşımlarını görebilirsin.',
      '/agim',
      'baglanti_kabul:' || NEW.requester_id || ':' || NEW.addressee_id
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists baglanti_bildirimi_tg on public.connections;
create trigger baglanti_bildirimi_tg
  after insert or update of durum on public.connections
  for each row execute function sosyal_gizli.baglanti_bildirimi();

-- ------------------------------------------------------------------
-- 4) PAYLAŞIM BEĞENİSİ
-- ------------------------------------------------------------------
--
-- ADRES `/cv`, `/paylasim/<id>` DEĞİL: paylaşımın kalıcı bir adresi yok
-- (bkz. PaylasimDetayi — ayrıntı bir rota değil, karttan açılan bir
-- katman). Olmayan bir adrese götüren bildirim, dokununca 404 verirdi.
-- `/cv` alıcının KENDİ paylaşımlarının durduğu ekran; beğenilen gönderi
-- orada, ızgarada.
create or replace function sosyal_gizli.begeni_bildirimi()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  yazar uuid;
begin
  select p.author_id into yazar from public.posts p where p.id = NEW.post_id;

  /* Kendi paylaşımını beğenen kendine bildirim üretmiyor. */
  if yazar is null or yazar = NEW.user_id then
    return NEW;
  end if;

  perform sosyal_gizli.bildirim_yaz(
    yazar,
    'paylasim_begeni',
    sosyal_gizli.bildirim_adi(NEW.user_id) || ' paylaşımını beğendi',
    null,
    '/cv',
    'begeni:' || NEW.post_id || ':' || NEW.user_id
  );
  return NEW;
end;
$$;

drop trigger if exists begeni_bildirimi_tg on public.post_likes;
create trigger begeni_bildirimi_tg
  after insert on public.post_likes
  for each row execute function sosyal_gizli.begeni_bildirimi();

-- ------------------------------------------------------------------
-- 5) BEKLEYEN İSTEKLER İÇİN GERİYE DÖNÜK BİLDİRİM
-- ------------------------------------------------------------------
--
-- Tetikleyici bugünden sonrasını yakalıyor. Hâlihazırda bekleyen
-- istekler bildirimsiz kalmasın diye bir kez yazılıyor; `dedupe_key`
-- sayesinde aynı istek tetikleyiciden bir daha geçse de ikinci satır
-- oluşmuyor.
do $$
declare
  k record;
begin
  for k in
    select requester_id, addressee_id from public.connections where durum = 'bekliyor'
  loop
    perform sosyal_gizli.bildirim_yaz(
      k.addressee_id,
      'baglanti_istegi',
      sosyal_gizli.bildirim_adi(k.requester_id) || ' bağlantı isteği gönderdi',
      'İsteği kabul edebilir ya da yok sayabilirsin.',
      '/agim/baglantilar',
      'baglanti_istegi:' || k.requester_id || ':' || k.addressee_id
    );
  end loop;
end $$;
