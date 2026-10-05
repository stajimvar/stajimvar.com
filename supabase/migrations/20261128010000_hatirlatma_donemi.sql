-- HATIRLATMA TEKRAR KORUMASI DÖNEME BAĞLANIYOR
--
-- DÜZELTİLEN KUSUR
-- ----------------
-- `dedupe_key` yalnız BAŞVURU + EŞİK + ALICI taşıyordu:
--
--   'bekleyen:' || basvuru_id || ':' || esik || ':' || alici
--
-- Bu anahtar "bu başvuru için bu eşikte bu kişiye BİR KEZ yazıldı"
-- diyordu — başvurunun ömrü boyunca. Oysa bekleme süresi 20261127010000
-- ile `aday_ilerleme_at`e bağlandı ve o damga gerçek ilerlemede
-- sıfırlanıyor. Yani bir başvuru BİRDEN ÇOK bekleme dönemi yaşıyor:
--
--   1. Başvuru gelir, 7 gün bekler        → hatırlatma yazılır
--   2. Şirket adayı "İnceleniyor"a alır   → yeni dönem başlar
--   3. Yeni aşamada yine 7 gün bekler     → hatırlatma YAZILMALI
--
-- 3. adımda eski anahtar birebir aynı çıkıyordu ve `on conflict do
-- nothing` yeni hatırlatmayı sessizce düşürüyordu. Sonuç: bir başvuru
-- her eşikte ömür boyu yalnız bir kez hatırlatılıyordu. Süreci
-- ilerleten ekip, tam da ilerlettiği için bir daha uyarılmıyordu —
-- hatırlatmanın en çok işe yarayacağı durumda susuyordu.
--
-- ÇÖZÜM: ANAHTARA DÖNEM KİMLİĞİ
-- -----------------------------
-- Dönem kimliği, bekleme hesabının DAYANDIĞI anın kendisi:
--
--   greatest(coalesce(aday_ilerleme_at, applied_at), applied_at)
--
-- Bu seçim üç şartı birden sağlıyor:
--
--   AYNI DÖNEMDE TEKRAR KOŞU SESSİZ: damga dönem boyunca sabit, anahtar
--   da sabit; günde iki kez koşsa da ikinci koşu bildirim üretmiyor.
--
--   GERÇEK İLERLEME YENİ DÖNEM AÇIYOR: damga yalnız adaya yönelik
--   ilerlemede tazeleniyor (20261127010000), anahtar da onunla
--   değişiyor; yeni bekleyiş yeniden hatırlatılabiliyor.
--
--   SORUMLU ATAMA YENİ DÖNEM AÇMIYOR: atama `aday_ilerleme_at`e
--   dokunmuyor, dolayısıyla anahtar da değişmiyor. Atama yaparak
--   hatırlatmayı yeniden tetiklemek mümkün değil.
--
-- NEDEN ZAMAN DAMGASI, NEDEN SAYAÇ DEĞİL
-- --------------------------------------
-- Ayrı bir "dönem sayacı" sütunu tutmak aynı bilgiyi ikinci kez
-- saklamak olurdu ve iki kaynağın ayrışma riski doğardı. Dönemi
-- tanımlayan şey zaten o damga; kimliği ondan TÜRETMEK, tek doğruyu
-- koruyor.
--
-- `to_char(... 'YYYYMMDDHH24MISSUS')` mikrosaniyeye kadar yazıyor ve
-- metin olarak kesin: epoch'u kayan noktaya çevirmek aynı anı iki
-- farklı metne düşürebilirdi. UTC'ye sabitleniyor ki sunucu saat
-- dilimi değişirse anahtar kaymasın.
--
-- ESKİ ANAHTARLAR DURUYOR
-- -----------------------
-- Yazılmış bildirimler silinmiyor ve anahtarları değiştirilmiyor:
-- geçmişi yeniden yazmak, kullanıcının gördüğü bildirimi kaydından
-- koparırdı. Eski biçimli anahtarlar yeni biçimle çakışmıyor (yeni
-- anahtarda bir alan daha var), dolayısıyla bu göçten sonraki ilk
-- koşuda her açık dönem için EN ÇOK BİR bildirim yazılabiliyor —
-- eşik başına bir tane, çünkü yalnız en yüksek eşik üretiliyor.

create or replace function public.bekleyen_basvuru_hatirlatmalari()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  yazilan integer := 0;
begin
  with bekleyen as (
    select
      a.id            as basvuru_id,
      a.atanan_uye,
      l.company_id,
      coalesce(nullif(btrim(l.title), ''), 'ilan') as ilan_adi,
      /*
        DÖNEM BAŞLANGICI: bekleme de, dönem kimliği de bundan türüyor.
        Tek yerde hesaplanıyor ki ikisi ayrışmasın.
      */
      greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at) as donem_basi,
      case
        when greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at) < now() - interval '30 days' then 30
        when greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at) < now() - interval '14 days' then 14
        when greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at) < now() - interval '7 days'  then 7
        else null
      end as esik,
      (now() - greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at)) as bekleme
    from public.applications a
    join public.listings l on l.id = a.listing_id
    where a.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
  ),
  hedef as (
    /*
      ALICI: sorumlu varsa O. Yoksa şirket SAHİPLERİ — "kim bakacak"
      kararını verecek kişiler onlar. Recruiter'lara toplu yazılmıyor:
      herkese giden bir hatırlatma kimsenin üstlenmediği hatırlatmadır.
    */
    select b.basvuru_id, b.esik, b.ilan_adi, b.bekleme, b.donem_basi, b.atanan_uye as alici
      from bekleyen b
     where b.esik is not null and b.atanan_uye is not null
    union all
    select b.basvuru_id, b.esik, b.ilan_adi, b.bekleme, b.donem_basi, cm.user_id
      from bekleyen b
      join public.company_members cm
        on cm.company_id = b.company_id and cm.is_owner
     where b.esik is not null and b.atanan_uye is null
  ),
  eklenen as (
    insert into public.notifications
      (recipient_id, type, title, body, target_url, application_id, dedupe_key)
    select
      h.alici,
      'basvuru_bekliyor',
      extract(day from h.bekleme)::int || ' gündür yanıt bekleyen başvuru',
      h.ilan_adi || ' ilanındaki bu başvuru ' || extract(day from h.bekleme)::int
        || ' gündür işlem görmedi.',
      '/sirket/basvuranlar?aday=' || h.basvuru_id::text,
      h.basvuru_id,
      /*
        BAŞVURU + DÖNEM + EŞİK + ALICI.

        Alıcı anahtarda kalıyor: sorumlu değişirse yeni sorumlu aynı
        dönemde bir kez haberdar oluyor, eskisinin aldığı bildirim onu
        susturmuyor. (Atamanın kendisi dönemi değiştirmiyor; değişen
        yalnız alıcı.)
      */
      'bekleyen:' || h.basvuru_id::text
        || ':' || to_char(h.donem_basi at time zone 'UTC', 'YYYYMMDDHH24MISSUS')
        || ':' || h.esik::text
        || ':' || h.alici::text
    from hedef h
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into yazilan from eklenen;

  return yazilan;
end;
$$;

revoke all on function public.bekleyen_basvuru_hatirlatmalari() from public, anon, authenticated;

comment on function public.bekleyen_basvuru_hatirlatmalari() is
  'Bekleyen başvurular için günlük hatırlatma. Ölçü: aday_ilerleme_at (iç işlemler saymaz). Tekrar koruması başvuru + BEKLEME DÖNEMİ + eşik + alıcı: aynı dönemde bir kez, gerçek ilerlemeden sonraki yeni dönemde yeniden. Yalnız service_role.';
