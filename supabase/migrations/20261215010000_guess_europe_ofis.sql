/*
  GUESS EUROPE — "UZAKTAN" KAYDI RESMÎ KAYNAKLA OFİS OLARAK DÜZELTİLİYOR (13 Ekim 2026)

  İlan: Guess Europe Sagl — IT Intern (a0de0769…), toplama hattından.
  Bizde `work_type = 'Remote'`. Resmî kaynak üç ayrı yerde ofis diyor:
    · Workable ilan sayfasının gömülü verisi: "workplace":"on_site"
    · Sayfanın JobPosting yapısal verisi: jobLocation Istanbul, İstanbul,
      Turkey — `jobLocationType: TELECOMMUTE` YOK
    · Görünür metin: "On-site · Istanbul, İstanbul, Turkey · Part-time"
  Kaynak: https://jobs.workable.com/view/c8EVgR8VdXrhsnFCiDLBWh/it-intern-in-istanbul-at-guess-europe-sagl
  İlan açık: sayfada "Apply now" düğmesi var, bağlantı kontrolü 'acik'.

  Güncelleme ilanın ŞU ANKİ değerine koşullu: başka bir işlem değeri bu
  arada değiştirdiyse hiçbir şey yapılmıyor (üzerine yazma yok). Şehir ve
  ülke zaten kaynaktaki değer (İstanbul, TR); başvuru ülkesi alanı boş.
  Başvurulara ve öteki ilanlara dokunulmuyor.
*/
do $$
declare
  n integer;
begin
  update public.listings set work_type = 'On-site'
   where id::text like 'a0de0769-%' and status = 'published'
     and work_type = 'Remote' and city = 'İstanbul' and country_code = 'TR'
     and basvuru_ulkeleri is null;
  get diagnostics n = row_count;
  raise notice 'Guess Europe ofis: % satir', n;
end $$;
