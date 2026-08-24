-- FIRSAT TUTARI: YAPISAL ALANLAR
--
-- Tutar tek bir serbest metinde tutuluyordu (amount_text) ve içindekiler
-- sayı değil nitelikti: "Karşılıksız", "Geri ödemeli", "Programa göre
-- değişiyor". Yani 68 kaydın hiçbirinde okunabilir bir MİKTAR yoktu;
-- öğrencinin en çok merak ettiği bilgi sitede hiç bulunmuyordu.
--
-- Alanların hepsi nullable: bütün fırsatların tutarını aynı anda girmek
-- zorunda değiliz. Doğrulanan kayıtta gösterilmeye başlanıyor, diğerinde
-- "resmî kaynakta açıklanmadı" yazıyor. Tahmin yok.
alter table public.opportunities
  add column if not exists amount_min numeric,
  add column if not exists amount_max numeric,
  add column if not exists currency text,
  add column if not exists payment_period text,
  add column if not exists amount_period_label text,
  add column if not exists amount_note text,
  add column if not exists repayable boolean,
  add column if not exists amount_verified_at timestamptz;

comment on column public.opportunities.amount_min is 'Alt sınır. Tek tutarda amount_max ile aynı.';
comment on column public.opportunities.amount_max is 'Üst sınır. Aralık yoksa amount_min ile aynı.';
comment on column public.opportunities.currency is 'TRY, EUR, USD. Boşsa TRY varsayılmıyor — tutar da gösterilmiyor.';
comment on column public.opportunities.payment_period is 'monthly | once | yearly | term. Ödemenin hangi sıklıkta yapıldığı.';
comment on column public.opportunities.amount_period_label is 'Tutarın ait olduğu dönem: "2026-2027 dönemi". Tutar yıldan yıla değişiyor.';
comment on column public.opportunities.amount_note is 'Sayıya sığmayan durumlar: "Eğitim ücretinin %50si", "Programa göre değişiyor".';
comment on column public.opportunities.repayable is 'true: geri ödemeli (kredi). false: karşılıksız. null: bilinmiyor.';
comment on column public.opportunities.amount_verified_at is 'Tutarın resmî kaynaktan en son doğrulandığı an. Boşsa tutar gösterilmiyor.';

-- payment_period yalnızca bilinen dört değeri alsın; yazım hatası
-- arayüzde sessizce boş etiket üretirdi.
alter table public.opportunities drop constraint if exists opportunities_payment_period_check;
alter table public.opportunities add constraint opportunities_payment_period_check
  check (payment_period is null or payment_period in ('monthly','once','yearly','term'));

-- Tutar gösterilecekse ya bir sayı ya da bir açıklama olmalı; ikisi de
-- yoksa doğrulama damgası boş bir kutuyu doğrulamış olurdu.
alter table public.opportunities drop constraint if exists opportunities_amount_verified_check;
alter table public.opportunities add constraint opportunities_amount_verified_check
  check (amount_verified_at is null or amount_min is not null or amount_note is not null);

-- MEVCUT NİTELİK BİLGİSİNİ TAŞI
-- amount_text'teki "Karşılıksız"/"Geri ödemeli" aslında repayable alanının
-- kendisi. Sayı üretmiyoruz — olmayan veriyi uydurmak olurdu.
update public.opportunities set repayable = false
  where repayable is null and amount_text in ('Karşılıksız', 'Hibe destekli');
update public.opportunities set repayable = true
  where repayable is null and amount_text = 'Geri ödemeli';
