/*
  OTIS LOGOSU (kullanıcı isteği, 26 Eylül 2026)

  Otis'in logosu kurumun sitesindeki favicon'dan (`logos/otis.ico`)
  geliyordu; 80 px kutuda bulanık bir "O" olarak görünüyordu. Kullanıcı
  Otis'in kendi logosunu verdi: repoya `public/isveren-logolari/otis.png`
  (128 × 128, diğer işveren logolarıyla aynı ölçü) olarak eklendi ve
  adres 123 şirketin kullandığı aynı klasöre çevriliyor.

  Yalnız bu şirket ve yalnız eski adres hâlâ duruyorsa: araya elle ya da
  otomasyonla başka bir logo girildiyse üzerine yazılmıyor.

  GERİ ALMA:
    update public.companies
       set logo_url = 'https://gdumgdgwlfnohkaucfow.supabase.co/storage/v1/object/public/logos/otis.ico'
     where slug = 'otis';
*/

update public.companies
   set logo_url = 'https://stajimvar.com/isveren-logolari/otis.png'
 where slug = 'otis'
   and logo_url = 'https://gdumgdgwlfnohkaucfow.supabase.co/storage/v1/object/public/logos/otis.ico';
