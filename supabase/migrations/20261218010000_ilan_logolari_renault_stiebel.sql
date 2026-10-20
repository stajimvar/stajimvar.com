/*
  İLAN LOGOLARI — 20 EKİM 2026 (kullanıcı teslimi, ikinci parti)

  Yayındaki ilanı olup logosu boş kalan iki şirket: Renault Deutschland AG
  ve Stiebel Eltron (birer Almanya ilanı). Kullanıcının verdiği dosyalar
  yeniden çizilmeden diğer işveren logolarıyla aynı ölçüye, 128 × 128
  PNG'ye küçültüldü:
    public/isveren-logolari/renault.png
    public/isveren-logolari/stiebel-eltron.png

  Her satır şirket kimliği VE adıyla eşleşiyor ve yalnız `logo_url` hâlâ
  boşsa yazıyor: araya başka bir logo girildiyse üzerine yazılmıyor.

  GERİ ALMA (yalnız bu göçün yazdıklarını boşaltır):
    update public.companies set logo_url = null
     where logo_url in (
       'https://stajimvar.com/isveren-logolari/renault.png',
       'https://stajimvar.com/isveren-logolari/stiebel-eltron.png');
*/

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/renault.png'
where id = '51a4158f-1db0-4125-b41d-e8e47af66d70' and name = 'Renault Deutschland AG' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/stiebel-eltron.png'
where id = 'c0aa384f-d5c3-4eff-b768-90be7ee99700' and name = 'Stiebel Eltron' and nullif(btrim(logo_url), '') is null;
