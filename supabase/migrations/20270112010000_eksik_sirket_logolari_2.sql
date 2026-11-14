/*
  EKSİK ŞİRKET LOGOLARI (2) — 15 KASIM 2026 (kullanıcı: "logosu olmayan şirketlerin logolarını bul ekle")

  20270111010000'dan sonra kalan, yayında ilanı olup logosu boş 3 şirket
  (Almanya ilanlarıyla 14 Kasım'da oluşturuldular). Kaynak Wikimedia Commons
  (üçü de kamu malı); yeniden çizilmedi, öteki işveren logolarıyla aynı
  128 × 128 PNG'ye dönüştürüldü (public/isveren-logolari/).

    Mercedes-Benz Group AG  mercedes-benz.png  (Commons: Mercedes-Benz_Star_2022.svg, kamu malı)
    Databricks              databricks.png     (Commons: Databricks-logo.svg, kamu malı)
    HUGO BOSS               hugo-boss.png      (Commons: Hugo_Boss_logo_2021.svg, kamu malı)

  Her satır kimlik VE adla eşleşiyor ve yalnız logo hâlâ boşsa yazıyor.

  GERİ ALMA:
    update public.companies set logo_url = null where id = 'd765cb3a-75f5-4424-8889-bb883f777123' and logo_url = 'https://stajimvar.com/isveren-logolari/mercedes-benz.png';
    update public.companies set logo_url = null where id = 'dfdce14a-0f61-4ffe-94b4-3beca1690a41' and logo_url = 'https://stajimvar.com/isveren-logolari/databricks.png';
    update public.companies set logo_url = null where id = 'e8edec90-236d-44f6-8aac-fe813d43d80f' and logo_url = 'https://stajimvar.com/isveren-logolari/hugo-boss.png';
*/

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/mercedes-benz.png'
where id = 'd765cb3a-75f5-4424-8889-bb883f777123' and name = 'Mercedes-Benz Group AG' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/databricks.png'
where id = 'dfdce14a-0f61-4ffe-94b4-3beca1690a41' and name = 'Databricks' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/hugo-boss.png'
where id = 'e8edec90-236d-44f6-8aac-fe813d43d80f' and name = 'HUGO BOSS' and nullif(btrim(logo_url), '') is null;
