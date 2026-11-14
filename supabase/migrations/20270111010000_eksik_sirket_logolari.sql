/*
  EKSİK ŞİRKET LOGOLARI — 15 KASIM 2026 (kullanıcı: "logosu olmayan şirketlerin logolarını bul ekle")

  Yayında ilanı olup logosu boş 9 şirketin hepsi. Kaynaklar şirketin kendi
  işe alım sayfası/sitesi ya da Wikimedia Commons (kamu malı); yeniden
  çizilmedi, öteki işveren logolarıyla aynı 128 × 128 PNG'ye dönüştürüldü
  (public/isveren-logolari/). WordSmith ("WS_") ve Lesaffre kullanıcının
  gönderdiği görsellerle aynı marka.

    WordSmith Advertising  wordsmith-advertising.png  (SmartRecruiters şirket logosu)
    Lesaffre               lesaffre.png  (lesaffre.com resmî site logosu)
    NREL                   nrel.png  (Commons: National_Renewable_Energy_Laboratory_logo_(2_rows).jpg, kamu malı)
    Experian               experian.png  (Commons: Experian_logo.svg, kamu malı)
    Fugo Games             fugo-games.png  (Breezy kariyer sayfası logosu)
    Glocalzone             glocalzone.png  (glocalzone.com uygulama simgesi)
    Organon                organon.png  (Commons: Organon-logo.svg, kamu malı)
    pladis                 pladis.png  (Commons: Pladis_global_logo.png, kamu malı)
    Reload                 reload.png  (SmartRecruiters şirket logosu)

  Her satır kimlik VE adla eşleşiyor ve yalnız logo hâlâ boşsa yazıyor.

  GERİ ALMA:
    update public.companies set logo_url = null where id = '52cbef2e-efd1-42c5-9aad-56d0333aa9ac' and logo_url = 'https://stajimvar.com/isveren-logolari/wordsmith-advertising.png';
    update public.companies set logo_url = null where id = 'e456e049-0193-461a-94de-416669da2161' and logo_url = 'https://stajimvar.com/isveren-logolari/lesaffre.png';
    update public.companies set logo_url = null where id = '66bce8a9-6f9d-4c3b-95a8-f460a91220d6' and logo_url = 'https://stajimvar.com/isveren-logolari/nrel.png';
    update public.companies set logo_url = null where id = 'b8a9157c-d709-4182-864b-a58ace1601a1' and logo_url = 'https://stajimvar.com/isveren-logolari/experian.png';
    update public.companies set logo_url = null where id = '9bbb6e47-9b70-4e18-9c49-0a1660a8bb78' and logo_url = 'https://stajimvar.com/isveren-logolari/fugo-games.png';
    update public.companies set logo_url = null where id = '343a41d3-88fb-4bd3-8ea0-f4438c4ad555' and logo_url = 'https://stajimvar.com/isveren-logolari/glocalzone.png';
    update public.companies set logo_url = null where id = '148eff03-07c5-4cc9-91c3-37c90c507900' and logo_url = 'https://stajimvar.com/isveren-logolari/organon.png';
    update public.companies set logo_url = null where id = 'e792155e-0139-48b3-9c35-684c7d107775' and logo_url = 'https://stajimvar.com/isveren-logolari/pladis.png';
    update public.companies set logo_url = null where id = 'cb732b54-6e79-43f4-9797-af9f0df2ebe3' and logo_url = 'https://stajimvar.com/isveren-logolari/reload.png';
*/

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/wordsmith-advertising.png'
where id = '52cbef2e-efd1-42c5-9aad-56d0333aa9ac' and name = 'WordSmith Advertising' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/lesaffre.png'
where id = 'e456e049-0193-461a-94de-416669da2161' and name = 'Lesaffre' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/nrel.png'
where id = '66bce8a9-6f9d-4c3b-95a8-f460a91220d6' and name = 'NREL' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/experian.png'
where id = 'b8a9157c-d709-4182-864b-a58ace1601a1' and name = 'Experian' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/fugo-games.png'
where id = '9bbb6e47-9b70-4e18-9c49-0a1660a8bb78' and name = 'Fugo Games' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/glocalzone.png'
where id = '343a41d3-88fb-4bd3-8ea0-f4438c4ad555' and name = 'Glocalzone' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/organon.png'
where id = '148eff03-07c5-4cc9-91c3-37c90c507900' and name = 'Organon' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/pladis.png'
where id = 'e792155e-0139-48b3-9c35-684c7d107775' and name = 'pladis' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/reload.png'
where id = 'cb732b54-6e79-43f4-9797-af9f0df2ebe3' and name = 'Reload' and nullif(btrim(logo_url), '') is null;
