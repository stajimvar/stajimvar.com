/*
  İLAN LOGOLARI — 20 EKİM 2026 (kullanıcı teslimi)

  Yayındaki ilanı olup logosu boş kalan üç şirket: BCG ve ALPLA (18 Ekim,
  PR #360) ile Dr. Ing. h.c. F. Porsche AG (üç Almanya ilanı). Kullanıcının
  verdiği dosyalar yeniden çizilmeden diğer işveren logolarıyla aynı ölçüye,
  128 × 128 PNG'ye küçültüldü:
    public/isveren-logolari/boston-consulting-group.png
    public/isveren-logolari/alpla.png
    public/isveren-logolari/porsche.png

  Her satır şirket kimliği VE adıyla eşleşiyor ve yalnız `logo_url` hâlâ
  boşsa yazıyor: araya başka bir logo girildiyse üzerine yazılmıyor.

  GERİ ALMA (yalnız bu göçün yazdıklarını boşaltır):
    update public.companies set logo_url = null
     where logo_url in (
       'https://stajimvar.com/isveren-logolari/boston-consulting-group.png',
       'https://stajimvar.com/isveren-logolari/alpla.png',
       'https://stajimvar.com/isveren-logolari/porsche.png');
*/

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/boston-consulting-group.png'
where id = '1376f33d-5fd0-4f64-92d8-731f89a01bb2' and name = 'Boston Consulting Group' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/alpla.png'
where id = '33a95448-957f-43d6-9540-4e998289eb38' and name = 'ALPLA' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/porsche.png'
where id = '29767302-5cbb-40b4-b028-762f551ed1d5' and name = 'Dr. Ing. h.c. F. Porsche AG' and nullif(btrim(logo_url), '') is null;
