-- GERÇEK ZİYARETÇİ ÖLÇÜMÜ
--
-- Panel bugüne kadar ziyaretçi sayılarını üretilmiş demo veriyle
-- gösteriyordu. Bu işe yaramadı: paneli telefonda açan kişi "23 kişi
-- bakıyor" yazısını gerçek sandı. Demo uyarısı kenar çubuğunun dibindeydi
-- ve mobilde kenar çubuğu hamburger menüsünün arkasında olduğu için hiç
-- görünmüyordu. Çözüm uyarıyı büyütmek değil, gerçek veriyi toplamak.
--
-- ÇEREZ YOK, IP YOK
-- -----------------
-- Oturum kimliği tarayıcının `sessionStorage`'ında duran rastgele bir
-- değer: sekme kapanınca yok oluyor, siteler arası takip etmiyor ve çerez
-- değil. IP HİÇ saklanmıyor — özeti bile. Şehir, ülke ve cihaz bilgisi
-- Cloudflare'in istek üstünde verdiği alanlardan geliyor ve doğrudan
-- kaydediliyor; aradan IP geçmiyor.
--
-- İSİM YALNIZ GİRİŞ YAPMIŞTA
-- --------------------------
-- Misafir ziyaretçi şehir + sayfa + kaynak ile anılıyor, adı yok ve
-- olmamalı. Giriş yapmış kullanıcının kimliği `kullanici_id` ile
-- saklanıyor; adı zaten bizde olduğu için panelde görünebiliyor.

create table if not exists public.site_olaylari (
  id          bigint generated always as identity primary key,
  oturum      text        not null,
  tur         text        not null check (tur in ('girdi', 'sayfa', 'basvuru', 'cikti')),
  yol         text        not null,
  baslik      text,
  kaynak      text,
  sehir       text,
  ulke        text,
  cihaz       text        check (cihaz in ('telefon', 'tablet', 'masaüstü')),
  kullanici_id uuid       references auth.users(id) on delete set null,
  olustu_at   timestamptz not null default now()
);

create index if not exists site_olaylari_zaman on public.site_olaylari (olustu_at desc);
create index if not exists site_olaylari_oturum on public.site_olaylari (oturum, olustu_at);

-- RLS AÇIK, HİÇBİR POLİTİKA YOK
-- Tabloya anon ya da authenticated ile erişilemiyor. Yazma yalnız
-- Cloudflare işlevinden servis anahtarıyla (RLS'i atlar), okuma yalnız
-- aşağıdaki yönetici RPC'lerinden yapılıyor. Ziyaretçi hareketi ham
-- hâliyle kimseye açık değil.
alter table public.site_olaylari enable row level security;

revoke all on table public.site_olaylari from anon, authenticated;

comment on table public.site_olaylari is
  'Ziyaretçi olayları. Çerez ve IP yok; oturum kimliği sekme ömrü kadar yaşayan rastgele bir değer.';
