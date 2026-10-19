/*
  İLAN LOGOLARI — 19 EKİM 2026 (kullanıcı teslimi)

  18 Ekim'de yayına giren ilanların (PR #360) şirketlerinden beşi logosuz
  kalmıştı: otomasyonun logo adımı kurum sitelerine bağlanamadı. Kullanıcı
  beş logoyu verdi; dosyaların kendisi kullanıldı (yeniden çizilmedi) ve
  diğer işveren logolarıyla aynı ölçüye, 128 × 128 PNG'ye küçültüldü:
    public/isveren-logolari/procter-gamble.png
    public/isveren-logolari/hilti.png
    public/isveren-logolari/gsk.png
    public/isveren-logolari/lilly.png
    public/isveren-logolari/tskb.png

  Her satır şirket kimliği VE adıyla eşleşiyor ve yalnız `logo_url` hâlâ
  boşsa yazıyor: araya otomasyonla ya da elle başka bir logo girildiyse
  üzerine yazılmıyor. ALPLA, BCG ve Roche bu teslimin dışında; baş harfli
  kutuda kalıyorlar.

  GERİ ALMA (yalnız bu göçün yazdıklarını boşaltır):
    update public.companies set logo_url = null
     where logo_url in (
       'https://stajimvar.com/isveren-logolari/procter-gamble.png',
       'https://stajimvar.com/isveren-logolari/hilti.png',
       'https://stajimvar.com/isveren-logolari/gsk.png',
       'https://stajimvar.com/isveren-logolari/lilly.png',
       'https://stajimvar.com/isveren-logolari/tskb.png');
*/

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/procter-gamble.png'
where id = '18932c4a-b698-451a-8ce5-2ce885410d6b' and name = 'Procter & Gamble' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/hilti.png'
where id = 'b6f9e9e9-81f9-428a-a139-b4ad0fdc7cbe' and name = 'Hilti' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/gsk.png'
where id = '87c9dbe5-b8a5-4be9-8579-83ff36a0244d' and name = 'GSK' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/lilly.png'
where id = '1c358a98-d6da-42a0-8c00-0d657fa4ddc5' and name = 'Lilly' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/tskb.png'
where id = 'be727d0f-4478-42a3-80f2-33f15c988ea5' and name = 'TSKB' and nullif(btrim(logo_url), '') is null;
