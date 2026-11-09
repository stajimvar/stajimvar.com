/*
  ÖN ELEME SORULARI (9 Kasım 2026, rakip analizi #5)

  Kariyer.net ve LinkedIn'de ilanı açan şirket başvuru sırasında 1–3 kısa
  soru sorabiliyor ("Haftada kaç gün gelebilirsin?", "Zorunlu staj mı?").
  Bizde yoktu; şirket aynı soruyu her adaya telefonla soruyordu.

  BU GÖÇ
    1. listings.on_eleme_sorulari text[]: en çok 3 soru, her biri 3–200
       karakter. İçerik denetimine (ilan_icerik_alanlari) KATILMIYOR:
       yayındaki ilanda soru değiştirmek ilanı yeniden incelemeye
       düşürmüyor; sorunun biçimi bu kısıtla sınırlı.
    2. İşveren yazabiliyor (sütun izni); öğrenci okuyabiliyor.
    3. applications.on_eleme_cevaplari jsonb: başvuru anında soru ve cevap
       birlikte donduruluyor ([{"soru","cevap"}]); şirket ilandaki soruyu
       sonradan değiştirse de cevabın hangi soruya verildiği belli.
       Tablo düzeyinde ekleme izni zaten var; sütun RLS'e tabi.

  GERİ ALMA
    alter table public.listings drop column if exists on_eleme_sorulari;
    alter table public.applications drop column if exists on_eleme_cevaplari;
    drop function if exists public.on_eleme_sorulari_gecerli(text[]);
*/

create or replace function public.on_eleme_sorulari_gecerli(s text[])
returns boolean language sql immutable set search_path to 'public'
as $$
  select s is null
      or (cardinality(s) between 1 and 3
          and not exists (select 1 from unnest(s) x where char_length(btrim(x)) not between 3 and 200));
$$;

alter table public.listings
  add column if not exists on_eleme_sorulari text[];

alter table public.listings
  drop constraint if exists listings_on_eleme_sorulari_gecerli,
  add constraint listings_on_eleme_sorulari_gecerli check (public.on_eleme_sorulari_gecerli(on_eleme_sorulari));

grant insert (on_eleme_sorulari) on public.listings to authenticated;
grant update (on_eleme_sorulari) on public.listings to authenticated;
grant select (on_eleme_sorulari) on public.listings to anon, authenticated;

alter table public.applications
  add column if not exists on_eleme_cevaplari jsonb;

alter table public.applications
  drop constraint if exists applications_on_eleme_cevaplari_gecerli,
  add constraint applications_on_eleme_cevaplari_gecerli check (
    on_eleme_cevaplari is null
    or (jsonb_typeof(on_eleme_cevaplari) = 'array'
        and jsonb_array_length(on_eleme_cevaplari) between 1 and 3
        and char_length(on_eleme_cevaplari::text) <= 4000)
  );

comment on column public.listings.on_eleme_sorulari is
  'Başvuruda sorulan 1–3 kısa soru (20270105010000). İçerik denetimine katılmıyor.';
comment on column public.applications.on_eleme_cevaplari is
  'Başvuru anında soru + cevap: [{"soru","cevap"}] (20270105010000).';
