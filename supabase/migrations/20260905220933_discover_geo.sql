-- Coğrafi keşif altyapısı: ülke bağımsız hiyerarşi + geocoding izleri.
--
-- NEDEN AYRI BİR AĞAÇ TABLOSU
-- ---------------------------
-- discover_events bugün city ve district'i DÜZ METİN tutuyor. Bu, tek ülke
-- için çalışıyor ama "Dünya → ülke → birinci idari bölge → ikinci idari
-- bölge → nokta" akışını taşımıyor: kaç seviye olduğu ülkeye göre değişiyor
-- (Türkiye'de il→ilçe, ABD'de eyalet→ilçe→şehir, Fransa'da région→
-- département→commune). Seviye sayısını kolonlara gömmek, her yeni ülkede
-- şema değişikliği demek olurdu.
--
-- Bunun yerine kendine referans veren tek bir düğüm tablosu var. Derinlik
-- veriden geliyor, şemadan değil; yeni bir ülke eklemek satır eklemek
-- demek, migration yazmak değil.
--
-- SEVİYE ADLARI KULLANICIYA GÖSTERİLMİYOR
-- ---------------------------------------
-- 'admin1' teknik bir etiket. Arayüz her zaman düğümün kendi adını
-- gösteriyor ("İstanbul", "Zeytinburnu"); breadcrumb da bu adlardan
-- kuruluyor. Seviye yalnızca sıralama ve yakınlaşma için var.

/* --------------------------------------------------------- geo_nodes */

-- SÜRÜM NUMARASI NEDEN 20260905220933
-- ------------------------------------
-- Dosya 20260918010000 numarasıyla duruyordu ama üretimdeki
-- `schema_migrations` kaydı 20260905220933: göç MCP `apply_migration`
-- ile uygulandığı için sürümü sunucu atamıştı. İki numara ayrışınca
-- `db push` öncesindeki geçmiş doğrulaması "missing: 20260918010000"
-- diyip durduruyor, arkasından gelen cloudflare_production adımı hiç
-- çalışmıyordu (ölçüldü: run 34026167243).
--
-- Nesnelerin üretimde OLDUĞU doğrulandı (geo_nodes, geo_node_id sütunu
-- ve discover_event_occurrence_rows görünümü mevcut), yani eksik olan
-- şema değil yalnızca dosya adıydı. Ad kayda hizalandı; SQL yeniden
-- uygulanmıyor.

create table if not exists public.geo_nodes (
  id uuid primary key default gen_random_uuid(),

  /*
    Kendine referans: ağacın tamamı tek tabloda.
    Ülke düğümünün parent'ı yok; gerisi zincirle bağlı.
  */
  parent_id uuid references public.geo_nodes(id) on delete cascade,

  /*
    Seviye sırası önemli, adı değil. Yeni bir seviye gerekirse (bazı
    ülkelerde beş kademe var) listeye eklemek yetiyor.
  */
  level text not null check (level in ('country','admin1','admin2','locality','venue')),

  name text not null,

  /*
    KARARLI COĞRAFİ KİMLİK

    Ülkede ISO 3166-1 alpha-2 ('TR'), birinci idari bölgede ISO 3166-2
    ('TR-34'). Daha alt seviyelerde uluslararası bir standart yok; orada
    ebeveyn kodu + yerelleştirilmiş slug kullanılıyor ('TR-34/zeytinburnu').
    Amaç: ad değişse bile kimliğin sabit kalması ve içe aktarmanın aynı
    düğümü yeniden bulabilmesi.
  */
  code text not null,

  /* Haritayı ortalamak için; pin DEĞİL (aşağıdaki nota bakınız). */
  latitude numeric,
  longitude numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists geo_nodes_code_idx on public.geo_nodes(code);
create index if not exists geo_nodes_parent_idx on public.geo_nodes(parent_id);
create index if not exists geo_nodes_level_idx on public.geo_nodes(level);

comment on column public.geo_nodes.latitude is
  'Haritayı ortalamak için kullanılır. Etkinlik pini olarak KULLANILMAZ: '
  'bir ilçenin merkez koordinatını etkinlik konumu gibi göstermek sahte '
  'konum üretmek olur.';

/* ------------------------------------------------- discover_events ek alanlar */

alter table public.discover_events
  add column if not exists country_code text,
  add column if not exists geo_node_id uuid references public.geo_nodes(id) on delete set null,
  add column if not exists geocode_precision text,
  add column if not exists geocoded_at timestamptz,
  add column if not exists geocode_provider text,
  add column if not exists geocode_query text;

/*
  HASSASİYET KAYDI ZORUNLU

  Geocoding iki farklı girdiden çalışabiliyor: kaydın AÇIK ADRESİ, ya da
  kaynakta gerçekten yazan ilçe/şehir/ülke birleşimi. İkincisi geçerli bir
  konumdur ama bir BİNAYI değil bir BÖLGEYİ gösterir.

  Bu ayrım kaydedilmezse arayüz ilçe merkezini gerçek etkinlik adresi gibi
  gösterir — kullanıcı yanlış yere gider. Hassasiyet burada tutuluyor ve
  arayüz 'address' dışındaki değerleri nokta pini olarak çizmiyor.
*/
alter table public.discover_events
  drop constraint if exists discover_events_geocode_precision_check;
alter table public.discover_events
  add constraint discover_events_geocode_precision_check
  check (geocode_precision is null or geocode_precision in ('address','locality','admin2','admin1'));

comment on column public.discover_events.geocode_precision is
  'address = kaydın kendi açık adresinden; diğerleri kaynakta yazan bölge '
  'adlarından türetilmiş BÖLGE koordinatı. Yalnızca address nokta pini '
  'olarak gösterilir.';

comment on column public.discover_events.geocode_query is
  'Geocoding servisine gönderilen tam metin. Sonucun neden o çıktığını '
  'sonradan denetleyebilmek için saklanıyor; yeniden sorgulamayı da '
  'gereksiz kılıyor.';

/* ------------------------------------------------------------ ülke doldurma */

/*
  TR YALNIZCA DOĞRULANMIŞ TÜRKİYE KAYNAKLARINA YAZILIYOR

  "Hepsi Türkiye'de" demek kolay ama tabloya yazılan şey bir OLGU olmalı.
  Bu yüzden atama kaydın GELDİĞİ KAYNAĞA bağlı, şehir adına ya da genel
  kanıya değil.

  Ölçülen köken (yayındaki 136 kayıt):
    izmir-kultursanat-api          27   kultursanat.izmir.bel.tr
    bursa-buyuksehir-etkinlik      23   bursa.bel.tr
    kultur-istanbul                10   kultur.istanbul
    konya-kultur-sanat              6   konya.bel.tr
    eskisehir-buyuksehir            1   eskisehir.bel.tr
    editorial-psm-20260904         60   elle doğrulanmış Türkiye seçkisi
    editorial-student-events-...    8   elle doğrulanmış Türkiye seçkisi
    (kaynaksız)                     1   köken doğrulanamıyor

  Son satır BİLEREK dışarıda: kökeni doğrulanamayan tek kayda ülke
  yazmak, doğrulanmamış bir veriyi doğrulanmış gibi göstermek olur.
  country_code'u null kalıyor ve küre onu hiçbir ülkeye saymıyor.

  Koşullu yazılıyor: yalnızca boş olanlar dolduruluyor, ileride bir
  kaynak kendi ülkesini yazarsa ezilmiyor.
*/
update public.discover_events e
   set country_code = 'TR'
  from public.discover_event_sources s
 where s.id = e.import_source_id
   and e.country_code is null
   and s.slug in (
     'izmir-kultursanat-api',
     'bursa-buyuksehir-etkinlik',
     'kultur-istanbul',
     'konya-kultur-sanat',
     'eskisehir-buyuksehir',
     'editorial-psm-20260904',
     'editorial-student-events-20260904'
   );

/* Ülke düğümü — ağacın kökü. */
insert into public.geo_nodes (parent_id, level, name, code)
values (null, 'country', 'Türkiye', 'TR')
on conflict (code) do nothing;

create index if not exists discover_events_country_idx
  on public.discover_events(country_code) where status = 'published';
create index if not exists discover_events_geo_node_idx
  on public.discover_events(geo_node_id) where status = 'published';

/* ------------------------------------------------- RPC'ler yeni kolonları taşısın */

/*
  TEK DEĞİŞİKLİK NOKTASI: VIEW

  list_active_discover_events `returns setof discover_event_occurrence_rows`
  ve gövdesi `select (event_row).*` yapıyor — yani view'e eklenen kolon
  fonksiyona kendiliğinden geçiyor.

  get_discover_catalog da baştan sona `select *` zinciri kuruyor
  (active → searched → local_matches → filtered → candidates → numbered →
  page) ve sonunda `to_jsonb(p)` ile serileştiriyor. Dolayısıyla view'i
  genişletmek katalog çıktısını da genişletiyor.

  Bu yüzden İKİ FONKSİYONUN DA GÖVDESİNE DOKUNULMUYOR. Dokunulsaydı
  20260917010000_discover_catalog.sql'deki tanım burada yeniden yazılmış
  olur, iki dosya arasında sessiz bir sürüm çatışması doğardı.

  Kolonlar SONA ekleniyor: create or replace view mevcut kolonların adını,
  türünü ve sırasını değiştirmeye izin vermiyor, yalnızca ekleme yapıyor.
*/
create or replace view public.discover_event_occurrence_rows as
  select
    e.id, e.slug, e.title, e.short_description, e.description, e.category,
    e.image_url, e.city, e.district, e.venue_name, e.address,
    e.starts_at, e.ends_at, e.regular_price, e.student_price, e.is_free,
    e.has_student_discount, e.organizer, e.source_url, e.ticket_url,
    e.directions_url, e.status, e.published_at, e.created_at, e.updated_at,
    e.application_deadline, e.discount_terms, e.age_limit,
    e.registration_required, e.target_audiences, e.interest_tags,
    e.source_kind, e.source_trust_score, e.last_verified_at,
    e.verification_status, e.latitude, e.longitude, e.save_count,
    e.price_score, e.interest_score, e.trust_score, e.proximity_score,
    e.popularity_score, e.diversity_score, e.student_fit_score,
    e.review_reason, e.source_fingerprint, e.canonical_source_url,
    e.source_event_id, e.original_image_url, e.card_image_url,
    e.detail_image_url, e.cover_kind, e.event_mode, e.online_url,
    e.last_seen_at, e.imported_at, e.import_source_id, e.review_required,
    e.cancelled_at, e.postponed_at,
    o.id as occurrence_id, o.source_occurrence_id,
    o.starts_at as occurrence_starts_at, o.ends_at as occurrence_ends_at,
    o.time_precision, o.status as occurrence_status,
    o.last_seen_at as occurrence_last_seen_at, o.consecutive_missing_runs,
    /* --- bu migration ile eklenenler --- */
    e.country_code,
    e.geo_node_id,
    e.geocode_precision,
    e.geocoded_at
  from public.discover_events e
  join public.discover_event_occurrences o on o.event_id = e.id;

/* ------------------------------------------------------------------- RLS */

alter table public.geo_nodes enable row level security;

/*
  Coğrafi ağaç herkese açık okunur: harita giriş yapmamış kullanıcıya da
  çiziliyor. Yazma yalnızca service_role'da — düğümler içe aktarma
  hattından geliyor, kullanıcıdan değil.
*/
drop policy if exists geo_nodes_read on public.geo_nodes;
create policy geo_nodes_read on public.geo_nodes
  for select using (true);
