-- FIRSAT TARİH KURALI: TÜRKİYE TAKVİM GÜNÜ, HER YERDE AYNI
--
-- SORUN — AYNI SORUYA ÜÇ FARKLI CEVAP
-- ------------------------------------
-- "Bu fırsatın süresi doldu mu?" sorusuna üç yerde üç farklı ölçüt
-- cevap veriyordu:
--
--   arayüz      src/lib/firsat-kategori.mjs · firsatDurumu()
--               calendarDay ile TÜRKİYE TAKVİM GÜNÜ  ✔ doğru olan
--   ön render   scripts/onrender.mjs
--               deadline < Date.now()  — damga karşılaştırması
--   RLS         bu politika
--               deadline >= now() - interval '1 day'  — kayan 24 saat
--
-- Tarihler `00:00+00` olarak saklanıyor. "Son başvuru 15 Eylül"
-- Türkçede 15 Eylül DAHİL demek; damga karşılaştırması ise kaydı
-- 15 Eylül saat 03:00 TRT'de kapanmış sayıyor — kendi son gününün
-- sabahında.
--
-- ÖLÇÜLDÜ (canlı, 15 Eylül 2026): son başvurusu "geçmiş" görünen 10
-- kaydın 8'inin tarihi O GÜNDÜ ve Türkiye gününe göre HÂLÂ AÇIKTI.
-- Sekizinin de statik sayfası üretilmiyordu; biri
-- (btso-yuksekogrenim-bursu) arama sonuçlarında gösterim alırken
-- canlıda HTTP 404 dönüyordu.
--
-- `now() - interval '1 day'` AYRICA BELİRSİZDİ
-- --------------------------------------------
-- Kayan pencere, kaydın görünürlüğünü İSTEĞİN SAATİNE bağlıyordu:
-- son başvurusu dün 23:00 olan bir kayıt bugün 22:00'de hâlâ okunuyor,
-- 23:01'de okunmuyordu. Takvim günü ölçütü deterministik: gün bitince
-- biter. Bu değişiklik görünürlüğü GENİŞLETMİYOR, bazı durumlarda
-- daraltıyor (toleransın kuyruğu kalkıyor).
--
-- ALAN YÜZEYİ DEĞİŞMİYOR
-- ----------------------
-- Politika yalnız SATIR görünürlüğünü tanımlıyor. `opportunities`
-- üzerinde kolon kısıtı yok: anon ve authenticated 70 kolonun hepsinde
-- zaten SELECT yetkisine sahip. Bu göç yeni kolon açmıyor, yeni rol
-- eklemiyor, yazma yetkisine dokunmuyor.
--
-- `expired` SATIRLAR ZATEN OKUNUYORDU ve bu korunuyor: arşiv görünümü
-- (`fetchExpiredOpportunities`) ona dayanıyor ve süresi geçen fırsatın
-- sayfası artık siliniyor değil, kapandığı yazılarak duruyor.

-- TARİH ARTIK GÖRÜNÜRLÜK ÖLÇÜTÜ DEĞİL — SEBEBİ ÖNEMLİ
-- ====================================================
-- İlk taslakta bu politikaya Türkiye takvim günü ölçütü yazılmıştı.
-- Ölçüldüğünde KENDİ ÇÖZDÜĞÜ SORUNU ÜRETİYORDU:
--
--   `status='published'` + son başvurusu DÜN olan kayıtlar (canlıda 2
--   tane: fulbright-flta, mustafa-oncel-vakfi) tarih ölçütüne takılıp
--   anonim kullanıcıdan gizleniyordu. Ama süre doldurma işi henüz
--   bağlı olmadığı için durumları hâlâ 'published' — yani 'expired'
--   dalına da düşmüyorlar. Sonuç: ön render sayfayı yazıyor, tarayıcı
--   aynı kaydı çekemiyor ve ekran "bulunamadı"ya düşüyordu. Tam olarak
--   önlemeye çalıştığımız statik HTML–istemci ayrışması.
--
-- Bu delik yalnızca "veri durumu ile tarih birbirinden bağımsız
-- gecikebiliyor" olduğu için var ve Paket 2 (zamanlanmış süre doldurma)
-- çalışana kadar kapanmıyordu. Yani Paket 1 tek başına tutarsızdı.
--
-- ÇÖZÜM: görünürlük DURUMA bakıyor, tarihe değil.
--
--   okunur   = status IN ('published','expired')
--   taslak / arşiv → görünmüyor (değişmedi)
--
-- Tarih artık yalnız SUNUM katmanında iş görüyor ve orada zaten tek
-- kaynaktan geliyor (`firsatDurumu` · Türkiye takvim günü): kart
-- listesi kapanmışı göstermiyor, detay sayfası "süresi doldu" uyarısı
-- çiziyor, ön render aynı metni statik HTML'e basıyor.
--
-- LİSTELERE KAPANMIŞ KAYIT SIZMIYOR — ÖLÇÜLDÜ
-- Genel okuma yolları (src/lib/opportunities.ts) durumu ZATEN açıkça
-- süzüyor:
--   fetchOpportunities()        status='published' + Türkiye günü süzgeci
--   fetchExpiredOpportunities() status='expired'   (arşiv görünümü)
--   fetchOpportunityBySlug()    süzgeç YOK — detay sayfası; tam da bu
--                               yüzden kaydın okunabilir olması gerekiyor
-- Yönetici yolları ayrı politikayla (`is_admin()`) çalışıyor.
--
-- GÖRÜNÜRLÜK NE KADAR GENİŞLİYOR
-- Önceki politika `now() - interval '1 day'` toleransıyla zaten son
-- başvurusu geçmiş kayıtları bir süre okutuyordu; fark, o kuyruğun
-- belirsiz olmasıydı (görünürlük isteğin saatine bağlıydı). Yeni kural
-- deterministik. Açılan satırlar, Paket 2 koştuğunda zaten 'expired'
-- olup okunacak olan AYNI satırlar — yani nihai durumu cron'a
-- bağlamadan kuruyoruz.

drop policy if exists "yayindaki ve suresi dolan firsatlar okunur" on public.opportunities;

create policy "yayindaki ve suresi dolan firsatlar okunur" on public.opportunities
  for select
  using (status in ('published', 'expired'));

comment on policy "yayindaki ve suresi dolan firsatlar okunur" on public.opportunities is
  'Yayındaki ve süresi dolmuş fırsatlar herkese okunur; taslak ve arşiv '
  'okunmaz. Görünürlük DURUMA bakıyor, tarihe DEĞİL: tarih ölçütü '
  'buradayken "published ama tarihi geçmiş" kayıtlar hiçbir dala düşmüyor '
  've ön render ile istemci ayrışıyordu. Tarih yalnız sunum katmanında '
  'iş görüyor (firsatDurumu · Türkiye takvim günü).';

/*
  SÜRE DOLDURMA FONKSİYONU DA AYNI KURALA GEÇİYOR
  ------------------------------------------------
  `deactivate_expired_opportunities()` `application_deadline < now()`
  diyordu. Bu göçle Türkiye takvim gününe geçiyor; aksi halde iş
  koştuğunda son başvuru günü BUGÜN olan kayıtları da `expired`
  yapardı — yani yukarıda düzeltilen hatayı veri üzerinde kalıcı hale
  getirirdi.

  DİKKAT — BU FONKSİYON BU PAKETTE HİÇBİR YERDEN ÇAĞRILMIYOR.
  Zamanlanmış adım AYRI bir pakette ve ancak bu göç canlıya geçtikten
  SONRA bağlanacak. Sıra tersine çevrilirse iş, eski kuralla koşup
  bugünün kayıtlarını kapatır.
*/
create or replace function public.deactivate_expired_opportunities()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare changed integer;
begin
  if not public.is_admin()
     and coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '') <> 'service_role' then
    raise exception 'yetkisiz';
  end if;

  update public.opportunities
     set status = 'expired'
   where status = 'published'
     and application_deadline is not null
     and (application_deadline at time zone 'Europe/Istanbul')::date
           < (now() at time zone 'Europe/Istanbul')::date;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.deactivate_expired_opportunities() from public, anon, authenticated;
grant execute on function public.deactivate_expired_opportunities() to service_role;

comment on function public.deactivate_expired_opportunities() is
  'Son başvuru günü GEÇMİŞ yayın kayıtlarını expired yapar. Ölçüt Türkiye '
  'takvim günü: son başvuru günü DAHİL açık sayılır. Yalnız service_role '
  've yönetici çağırabilir.';
