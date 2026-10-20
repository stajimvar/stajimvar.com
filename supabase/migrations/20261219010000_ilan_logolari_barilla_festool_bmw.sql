/*
  İLAN LOGOLARI — 20 EKİM 2026 (kullanıcı teslimi, üçüncü parti)

  Yayındaki ilanı olup logosu boş kalan üç şirket: Barilla Group (1 ilan),
  Festool Group (1 ilan) ve BMW Group (2 ilan). Kullanıcının verdiği
  dosyalar yeniden çizilmeden diğer işveren logolarıyla aynı ölçüye,
  128 × 128 PNG'ye küçültüldü:
    public/isveren-logolari/barilla.png
    public/isveren-logolari/festool.png
    public/isveren-logolari/bmw-group.png

  Her satır şirket kimliği VE adıyla eşleşiyor ve yalnız `logo_url` hâlâ
  boşsa yazıyor: araya başka bir logo girildiyse üzerine yazılmıyor.

  GERİ ALMA (yalnız bu göçün yazdıklarını boşaltır):
    update public.companies set logo_url = null
     where logo_url in (
       'https://stajimvar.com/isveren-logolari/barilla.png',
       'https://stajimvar.com/isveren-logolari/festool.png',
       'https://stajimvar.com/isveren-logolari/bmw-group.png');
*/

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/barilla.png'
where id = 'dd489ba2-560d-4c84-a80a-40b55378fac3' and name = 'Barilla Group' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/festool.png'
where id = 'f14e58a5-df75-4b55-9530-cd06aadcc524' and name = 'Festool Group' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/bmw-group.png'
where id = 'e92558f4-5a40-4203-8077-df2af79b8174' and name = 'BMW Group' and nullif(btrim(logo_url), '') is null;
