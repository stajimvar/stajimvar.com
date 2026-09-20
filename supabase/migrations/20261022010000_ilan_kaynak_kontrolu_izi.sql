-- İLAN KAYNAK KONTROLÜ: KARARIN İZİ SAKLANIYOR
--
-- NE VAR, NE YOK
-- --------------
-- Kontrolün kendisi ZATEN ÇALIŞIYOR: `scripts/ilan-baglanti-kontrol.mjs`
-- günlük koşuyor (`ilan-baglanti-kontrolu.yml`, cron 40 4 * * *), bütün
-- aktif ilanları çağırıyor, 404/410 ile kapanma metinlerini ayırıyor,
-- 403/429/5xx/zaman aşımını `erisilemedi` sayıyor ve kanıt yoksa
-- `belirsiz` yazıyor. Yeni bir kontrol sistemi kurulmuyor.
--
-- EKSİK OLAN, KARARIN İZİ. Bugün yalnız `source_status` ve
-- `source_checked_at` saklanıyor:
--
--   · Betik kapanma SEBEBİNİ hesaplıyor (`kapanmaSebebi()` "HTTP 410",
--     "workday: invalid-url yönlendirmesi", `sayfa metni: "..."` gibi
--     bir dize döndürüyor) ama bu dize yalnız konsola yazılıp
--     ATILIYOR. İlan kapandıktan sonra "niye kapandı" sorusunun cevabı
--     veritabanında yok.
--   · Yönlendirme takip ediliyor ama SON ADRES saklanmıyor: bir ilan
--     genel kariyer sayfasına yönlendiği için mi belirsiz, yoksa sayfa
--     gerçekten kanıtsız mı — ayırt edilemiyor.
--   · Art arda kaçıncı hata olduğu bilinmiyor; bu yüzden "önceki
--     koşuda hata vermiş ilanı daha sık kontrol et" kuralı
--     kurulamıyordu.
--
-- Dört kolon bu üç boşluğu kapatıyor.

alter table public.listings
  /*
    ART ARDA HATA SAYACI

    YALNIZ GEÇİCİ HATADA ARTIYOR (403/429/5xx/zaman aşımı/ağ), kanıtlı
    açık sonuçta SIFIRLANIYOR. Kapanma kararını TEK BAŞINA vermiyor —
    kapatma hâlâ kesin kanıt istiyor (404/410/kapanma metni). Sayacın
    işi öncelik: uzun süredir ulaşılamayan ilan, sırada öne geçiyor.

    `not null default 0`: burada "bilinmiyor" diye bir durum yok, hiç
    hata alınmamış kayıt gerçekten sıfır hatalı.
  */
  add column if not exists consecutive_failures integer not null default 0
    check (consecutive_failures >= 0),

  /*
    KAPANMA ANI VE SEBEBİ

    İkisi de nullable ve varsayılansız: kapanmamış ilanda bu alanlar
    boş kalmalı. `not null default now()` koymak, açık her ilana
    "şu an kapandı" damgası basmak olurdu.
  */
  add column if not exists closed_at timestamptz,
  add column if not exists closure_reason text,

  /*
    YÖNLENDİRME SONRASI GERÇEKTEN OKUNAN ADRES

    Kayıtlı `apply_url` ile bu alan farklıysa istek yönlendirilmiş
    demektir. Kararın hangi sayfaya bakılarak verildiği, kararın
    kendisi kadar önemli: yanlış kapatma şüphesinde ilk bakılacak yer.
  */
  add column if not exists final_checked_url text;

comment on column public.listings.consecutive_failures is
  'Art arda GEÇİCİ hata sayısı (403/429/5xx/zaman aşımı/ağ). Kanıtlı '
  'açık sonuçta sıfırlanıyor. Kapatma kararını tek başına vermiyor; '
  'yalnız kontrol sırasını önceliklendiriyor.';

comment on column public.listings.closed_at is
  'İlanın kaynak kontrolüyle kapatıldığı an. Elle kapatmada yazılmıyor.';

comment on column public.listings.closure_reason is
  'Kapanmanın KANITI: "HTTP 404", "HTTP 410", '
  '"workday: invalid-url yönlendirmesi" ya da sayfada bulunan kapanma '
  'ifadesi. Betik bunu zaten hesaplıyordu, artık saklanıyor.';

comment on column public.listings.final_checked_url is
  'Yönlendirmeler izlendikten sonra gerçekten okunan adres. Kayıtlı '
  'adresten farklıysa istek yönlendirilmiş demektir.';

/*
  OKUMA YETKİSİ — 42501 DERSİ

  `listings` kolon kolon yetki veriyor ve yeni bir kolona `grant select`
  vermeyi unutmak TEK BAŞINA bütün sorguyu düşürüyor: `location_raw`,
  `insurance_provider` ve `department_tags` eklendiğinde tam bu oldu ve
  üretimde her ilan "yüklenemedi" hâline geldi.

  Dördü de okunabilir: kartta "neden kapandı" yazmak ve yönetim
  ekranında belirsiz kayıtları göstermek için gerekiyorlar.
*/
grant select (consecutive_failures, closed_at, closure_reason, final_checked_url)
  on public.listings to anon, authenticated;

/*
  YAZMA YETKİSİ VERİLMİYOR

  Dördünü de yalnız `service_role` ile koşan kontrol betiği yazıyor.
  `authenticated` insert/update listesine GİRMİYORLAR: şirket kendi
  ilanına "kaynak doğrulandı" ya da "kapanma sebebi yok" damgası
  basamamalı.
*/

/*
  ÖNCELİKLENDİRME İÇİN İNDEKS

  Günlük koşu sırayı şöyle kuruyor: önce hiç kontrol edilmemişler,
  sonra art arda hata verenler, sonra son başvuru tarihi yaklaşanlar,
  en sonda yakın zamanda temiz ölçülenler. Bu indeks o sıralamanın
  ilk iki ayağını karşılıyor.
*/
create index if not exists listings_kaynak_kontrol_sirasi_idx
  on public.listings (source_checked_at nulls first, consecutive_failures desc)
  where status in ('published', 'draft');

/*
  BELİRSİZ KAYITLAR — YÖNETİCİ İNCELEMESİ
  ---------------------------------------
  Sipariş: "Yalnız kesin kanıtla otomatik pasifleştir. Belirsiz
  sonuçları yönetici incelemesine gönder."

  Betik zaten `belirsiz` yazıyor ve o kayda DOKUNMUYOR (ne kapatıyor ne
  yeniden açıyor). Eksik olan, o kayıtların bir yerde TOPLANMASI.

  Görünüm, tablo değil: ikinci bir kuyruk tablosu kurmak aynı bilgiyi
  iki yerde tutmak olurdu ve senkron tutulması gereken yeni bir şey
  doğardı. Kaynak tek: `listings`.

  `security_invoker = on` ŞART. Görünümler varsayılan olarak SAHİBİ
  gibi koşar ve RLS'i atlar; bu projede `ilan_bildirim_kuyrugu` bir kez
  tam bu yüzden anon'a sızdı ve ölçülerek yakalandı.
*/
create or replace view public.ilan_kaynak_inceleme_kuyrugu as
select
  l.id,
  l.title,
  l.company_id,
  l.status,
  l.origin,
  l.apply_url,
  l.final_checked_url,
  l.source_status,
  l.source_checked_at,
  l.source_verified_at,
  l.consecutive_failures,
  l.application_deadline,
  /*
    YÖNLENDİ Mİ — İNCELEMEDE İLK BAKILACAK ŞEY

    Son adres kayıtlıdan farklıysa ilan büyük olasılıkla genel bir
    kariyer sayfasına düşmüştür. Bu, kapanmanın kanıtı DEĞİL ama
    incelemeyi hızlandıran bir işaret.
  */
  (l.final_checked_url is not null and l.final_checked_url is distinct from l.apply_url)
    as yonlendirildi
from public.listings l
where l.source_status = 'belirsiz'
  and l.status in ('published', 'draft');

alter view public.ilan_kaynak_inceleme_kuyrugu set (security_invoker = on);

/*
  GÖRÜNÜM YALNIZ YÖNETİCİYE

  `anon`a hiç verilmiyor. `authenticated` için `security_invoker`
  sayesinde `listings` RLS'i geçerli; ayrıca yetki de kısıtlı
  bırakılıyor ki yanlışlıkla bir istemci sorgusu buraya düşmesin.
*/
revoke all on public.ilan_kaynak_inceleme_kuyrugu from anon;
grant select on public.ilan_kaynak_inceleme_kuyrugu to authenticated;

comment on view public.ilan_kaynak_inceleme_kuyrugu is
  'Kaynak kontrolünün karar veremediği (source_status = belirsiz) aktif '
  'ilanlar. Otomatik kapatma YAPILMIYOR; bu liste insan incelemesi '
  'için. Tablo değil görünüm: tek kaynak listings.';
