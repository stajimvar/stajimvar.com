-- G kapanışı — kontrollü bölüm takma adları
--
-- ÖLÇÜLEN DURUM
-- -------------
-- Canlıda bölüm alanı dolu 4 kullanıcının 3'ü katalogla eşleşmiyordu.
-- Sebepleri AYNI değildi:
--
--   "Giyim Üretim Teknolojisi"  katalogda "Giyim Üretim Teknolojisi / Tekstil"
--   "İktisat"                   katalogda "İktisat / Ekonomi"
--   "Spor Yöneticiliği"         katalogda HİÇ YOK
--
-- İlk ikisi bölümün gerçekten var olduğu, yalnız katalogun "A / B"
-- birleşik ad kuralına takılan yazım farkı. Üçüncüsü gerçek bir katalog
-- eksiği ve TAHMİN EDİLMİYOR — yakın bir bölüme bağlanması, öğrenciyi
-- yanlış alan topluluğuna sokardı.
--
-- NEDEN BULANIK EŞLEŞME DEĞİL
-- ---------------------------
-- "İçeriyorsa eşleştir" ya da benzerlik puanı kolay çözüm gibi duruyor
-- ama sessizce yanlış eşleşme üretir: "İşletme" ile "Uluslararası
-- Ticaret ve İşletmecilik", ya da "Tıp" ile "Tıbbi Laboratuvar
-- Teknikleri" birbirine karışırdı. Yanlış bölüm = yanlış alan = yanlış
-- topluluk, ve kullanıcı bunu hiç fark etmeyebilir.
--
-- Bu yüzden eşleme AÇIK BİR LİSTE: her satır bir insan kararı. Liste
-- büyüdükçe de aynı kalıyor — tahmin eden bir kural hiç girmiyor.

/* ================================================================== */
/*  BÖLÜM ADI NORMALLEŞTİRME — TÜRKÇE "İ" TUZAĞI                       */
/* ================================================================== */

/**
 * Bölüm adını karşılaştırılabilir hâle getirir.
 *
 * ÖLÇÜLEN TUZAK: gerçek Postgres'te `lower('İktisat')` düz 'iktisat'
 * ÜRETMİYOR — 'i' + BİRLEŞEN NOKTA (U+0307) veriyor, yani 8 kod noktası:
 *
 *   select lower('İktisat') = 'iktisat';   ->  false
 *
 * Yani `lower(btrim(...))` ile yapılan karşılaştırma, içinde 'İ' geçen
 * her bölüm adında sessizce kayıyordu. PGlite'ta bu görünmüyor (farklı
 * collation), canlı Postgres 17'de görünüyor — bu yüzden kural burada
 * yerele bağlı olmayan bir çeviriyle sabitleniyor.
 *
 * ÇEVİRİ `lower()`TEN ÖNCE geliyor: 'İ' ve 'I' daha büyük harfken ASCII
 * karşılığına iniyor, geriye `lower()`ın bozabileceği bir şey kalmıyor.
 * Aynı kalıp `sosyal_gizli.kullanici_adi_normalize` içinde de var.
 *
 * Boşluklar tek boşluğa indiriliyor ve uçlardan kırpılıyor; nokta,
 * eğik çizgi ve parantez KORUNUYOR — "İktisat / Ekonomi" ile "İktisat"
 * farklı adlar ve öyle kalmalı, aradaki köprüyü takma ad listesi
 * kuruyor, normalleştirme değil.
 */
create or replace function sosyal_gizli.bolum_adi_normalize(ham text)
returns text
language sql
immutable
set search_path = public
as $$
  select btrim(regexp_replace(
    lower(translate(coalesce(ham, ''), 'ÇĞİIÖŞÜçğıiöşü', 'cgiiosucgiiosu')),
    '\s+', ' ', 'g'
  ))
$$;

create table if not exists public.department_aliases (
  /*
    Anahtar NORMALLEŞTİRİLMİŞ takma ad: karşılaştırma
    `sosyal_gizli.bolum_adi_normalize` ile yapıldığı için satır da öyle
    saklanıyor. Aynı takma adın iki farklı bölüme bağlanması birincil
    anahtarla imkânsız.
  */
  takma_ad      text primary key,
  department_id uuid not null references public.departments(id) on delete cascade,
  /* Kararı kimin verdiği; seed satırlarında NULL (ürün kararı). */
  onaylayan     uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

comment on table public.department_aliases is
  'Serbest metin bölüm adları için KONTROLLÜ takma adlar. Her satır bir insan kararı; bulanık/benzerlik eşleşmesi yoktur.';

alter table public.department_aliases enable row level security;

/*
  Katalog gibi okunur: bölüm listesi zaten herkese açık bir referans.
  Yazma yok — satırlar yalnız göçle ya da yönetim yoluyla giriyor.
*/
drop policy if exists "takma adlar okunur" on public.department_aliases;
create policy "takma adlar okunur" on public.department_aliases
  for select to anon, authenticated using (true);

revoke all on public.department_aliases from anon, authenticated;
grant select on public.department_aliases to anon, authenticated;

/* ================================================================== */
/*  ONAYLANAN İKİ TAKMA AD                                             */
/* ================================================================== */

insert into public.department_aliases (takma_ad, department_id)
select sosyal_gizli.bolum_adi_normalize(v.takma_ad), d.id
  from (values
    ('Giyim Üretim Teknolojisi', 'giyim-uretim-teknolojisi'),
    ('İktisat',                  'iktisat')
  ) as v(takma_ad, slug)
  join public.departments d on d.slug = v.slug
on conflict (takma_ad) do nothing;

/*
  "Spor Yöneticiliği" BİLEREK EKLENMEDİ: katalogda karşılığı yok.
  O kullanıcı bölümsüz kalıyor, profili ve "Bağlantılarım" paylaşımları
  çalışıyor, topluluğa katılamıyor ve ekranda dürüst eksik bilgisini
  görüp bölüm talebi gönderebiliyor.
*/

/* ================================================================== */
/*  EŞLEME TAKMA ADLARI DA OKUYOR                                      */
/* ================================================================== */

/**
 * Serbest metin bölüm adını katalog satırına eşler.
 *
 * İki adım, ikisi de KESİN:
 *   1. Katalog adıyla birebir (büyük-küçük harf ve boşluk hariç)
 *   2. Onaylanmış takma ad listesinde birebir
 * Üçüncü bir "yakın olanı bul" adımı YOK.
 */
create or replace function sosyal_gizli.bolumu_esle(ham text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select d.id
       from public.departments d
      where d.aktif
        and sosyal_gizli.bolum_adi_normalize(d.ad)
          = sosyal_gizli.bolum_adi_normalize(ham)
      limit 1),
    (select da.department_id
       from public.department_aliases da
       join public.departments d on d.id = da.department_id and d.aktif
      where da.takma_ad = sosyal_gizli.bolum_adi_normalize(ham)
      limit 1)
  )
$$;

/*
  Takma adlar geldiğine göre daha önce bölümsüz kalmış kullanıcılar
  şimdi eşleşebilir. Geçiş tekrar çalıştırılabilir olduğu için burada
  yeniden çağrılması güvenli: dolu alanın üzerine yazmıyor.
*/
select sosyal_gizli.sosyal_profilleri_tamamla();

revoke all on function sosyal_gizli.bolum_adi_normalize(text) from public;
