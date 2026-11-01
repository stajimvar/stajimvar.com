/*
  İLAN LOGOLARI — 1 KASIM 2026 (kullanıcı teslimi, Wikimedia Commons)

  Kullanıcının verdiği 14 şirketlik listeden yalnız ikisi değişiyor:
    Accor   (3 yayında ilan) — logo boştu.
    Siemens (1 yayında ilan) — logo 48 × 48 "S" favicon'uydu (siemens.ico).
  Ötekiler: Air Liquide, FedEx, Alumil ve Insider One'ın düzgün logosu zaten
  var, üzerine yazılmıyor; Siemens Energy, UNDP, Fortrea, EY, IN-VR, Leap
  Games, Reflect Studio ve Cypher Games için şirket kaydı yok.

  Kaynak SVG'ler yeniden çizilmeden diğer işveren logolarıyla aynı ölçüye,
  128 × 128 PNG'ye dönüştürüldü:
    public/isveren-logolari/accor.png    (Commons: AccorHotels_Logo_2016.svg)
    public/isveren-logolari/siemens.png  (Commons: Siemens_AG_logo.svg)

  Her satır şirket kimliği VE adıyla eşleşiyor. Accor yalnız `logo_url`
  boşsa, Siemens yalnız hâlâ eski favicon'u gösteriyorsa yazılıyor: araya
  başka bir logo girildiyse üzerine yazılmıyor.

  GERİ ALMA:
    update public.companies set logo_url = null
     where id = 'e71123c8-3774-45f5-a14d-9e39a55f351c'
       and logo_url = 'https://stajimvar.com/isveren-logolari/accor.png';
    update public.companies set logo_url = 'https://gdumgdgwlfnohkaucfow.supabase.co/storage/v1/object/public/logos/siemens.ico'
     where id = 'a551ae9d-c5eb-4e05-aadd-ab202a5b2507'
       and logo_url = 'https://stajimvar.com/isveren-logolari/siemens.png';
*/

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/accor.png'
where id = 'e71123c8-3774-45f5-a14d-9e39a55f351c' and name = 'Accor' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/siemens.png'
where id = 'a551ae9d-c5eb-4e05-aadd-ab202a5b2507' and name = 'Siemens' and logo_url = 'https://gdumgdgwlfnohkaucfow.supabase.co/storage/v1/object/public/logos/siemens.ico';
