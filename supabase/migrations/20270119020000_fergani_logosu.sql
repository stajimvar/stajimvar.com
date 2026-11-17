/*
  FERGANİ LOGOSU — 18 KASIM 2026 (kullanıcı gönderdi)

  Fergani Uzay Teknolojileri 17 Kasım ilan teslimiyle (2027 yaz stajı,
  12 pozisyon) oluştu ve logosu boştu. Görsel kullanıcının gönderdiği
  dosyanın kendisi; yeniden çizilmedi, yalnız 256 × 256 PNG'ye küçültüldü
  (public/isveren-logolari/fergani.png).

  Kimlik VE adla eşleşiyor ve yalnız logo hâlâ boşsa yazıyor.

  GERİ ALMA:
    update public.companies set logo_url = null where id = '41c17b50-0a31-453e-be1b-53adf63ce14d' and logo_url = 'https://stajimvar.com/isveren-logolari/fergani.png';
*/

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/fergani.png'
where id = '41c17b50-0a31-453e-be1b-53adf63ce14d' and name = 'Fergani Uzay Teknolojileri' and nullif(btrim(logo_url), '') is null;
