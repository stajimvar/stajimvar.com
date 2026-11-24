/*
  EKSİK ŞİRKET LOGOLARI (3) — 25 KASIM 2026 (kullanıcı: "Logosu olmayan ilan sayısını sıfıra indirelim")

  Yayında ilanı olup logosu boş 11 şirketin hepsi (13 ilan; çoğu 24 Kasım
  Almanya teslimiyle oluştu). Kaynaklar Wikimedia Commons (kamu malı / CC0)
  ya da şirketin kendi sitesi / işe alım sayfası; CC BY-SA görseller
  (Logo-yazilim.png, Prophet Logo.png) bilerek kullanılmadı. Yeniden
  çizilmedi, öteki işveren logolarıyla aynı 128 × 128 PNG'ye dönüştürüldü.

    Allianz Global Investors  allianz-global-investors.png  (Commons: Allianz.svg, kamu malı)
    Anadolu Ajansı            anadolu-ajansi.png  (Commons: Anadolu Ajansı 2025 logo.svg, CC0)
    Charles River Associates  charles-river-associates.png  (Commons: Charles River Associates logo.jpg, kamu malı)
    DHL Group                 dhl-global-forwarding-tasimacilik-a-s.png  (depodaki "DHL Group" logosu, yeniden kullanıldı)
    Doctolib                  doctolib.png  (Commons: Doctolib Logo.svg, kamu malı)
    Enter (Baupal GmbH)       enter.png  (Personio kariyer sayfası logosu)
    Langdock                  langdock.png  (Ashby kariyer sayfası logosu)
    Logo Yazılım              logo-yazilim.png  (logo.com.tr/logo.svg, resmî site)
    Mercanis                  mercanis.png  (Personio kariyer sayfası logosu)
    Prophet                   prophet.png  (Greenhouse kariyer sayfası logosu)
    Siemens AG                siemens.png  (depodaki Siemens logosu, yeniden kullanıldı)

  Her satır kimlik VE adla eşleşiyor ve yalnız logo hâlâ boşsa yazıyor.

  GERİ ALMA:
    update public.companies set logo_url = null where id = '8a554982-a4dc-48e0-be30-7b980597c21d' and logo_url = 'https://stajimvar.com/isveren-logolari/allianz-global-investors.png';
    update public.companies set logo_url = null where id = '96ff85b2-3bf1-4ac7-9fc8-64434978a3f9' and logo_url = 'https://stajimvar.com/isveren-logolari/anadolu-ajansi.png';
    update public.companies set logo_url = null where id = '45fa35a4-4499-42a6-bc31-b27ef12cfda0' and logo_url = 'https://stajimvar.com/isveren-logolari/charles-river-associates.png';
    update public.companies set logo_url = null where id = '8f0dd7ec-9c0a-400d-81a8-72959b31648a' and logo_url = 'https://stajimvar.com/isveren-logolari/dhl-global-forwarding-tasimacilik-a-s.png';
    update public.companies set logo_url = null where id = '9e766255-b055-48a1-8714-ba1644426d8e' and logo_url = 'https://stajimvar.com/isveren-logolari/doctolib.png';
    update public.companies set logo_url = null where id = '19d57cb2-9199-41da-817a-2cca362ec457' and logo_url = 'https://stajimvar.com/isveren-logolari/enter.png';
    update public.companies set logo_url = null where id = '609935cd-1640-4fbe-8470-3e32eee0c217' and logo_url = 'https://stajimvar.com/isveren-logolari/langdock.png';
    update public.companies set logo_url = null where id = '71632294-0909-4b64-9b57-958682d94071' and logo_url = 'https://stajimvar.com/isveren-logolari/logo-yazilim.png';
    update public.companies set logo_url = null where id = '4ad41aba-3133-44f3-8483-af3cfb337122' and logo_url = 'https://stajimvar.com/isveren-logolari/mercanis.png';
    update public.companies set logo_url = null where id = 'e4a92403-b6fe-40d9-acab-ed845d8a4e67' and logo_url = 'https://stajimvar.com/isveren-logolari/prophet.png';
    update public.companies set logo_url = null where id = '9770913f-1230-4954-b315-348f9531385f' and logo_url = 'https://stajimvar.com/isveren-logolari/siemens.png';
*/

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/allianz-global-investors.png'
where id = '8a554982-a4dc-48e0-be30-7b980597c21d' and name = 'Allianz Global Investors' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/anadolu-ajansi.png'
where id = '96ff85b2-3bf1-4ac7-9fc8-64434978a3f9' and name = 'Anadolu Ajansı' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/charles-river-associates.png'
where id = '45fa35a4-4499-42a6-bc31-b27ef12cfda0' and name = 'Charles River Associates' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/dhl-global-forwarding-tasimacilik-a-s.png'
where id = '8f0dd7ec-9c0a-400d-81a8-72959b31648a' and name = 'DHL Group' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/doctolib.png'
where id = '9e766255-b055-48a1-8714-ba1644426d8e' and name = 'Doctolib' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/enter.png'
where id = '19d57cb2-9199-41da-817a-2cca362ec457' and name = 'Enter (Baupal GmbH)' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/langdock.png'
where id = '609935cd-1640-4fbe-8470-3e32eee0c217' and name = 'Langdock' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/logo-yazilim.png'
where id = '71632294-0909-4b64-9b57-958682d94071' and name = 'Logo Yazılım' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/mercanis.png'
where id = '4ad41aba-3133-44f3-8483-af3cfb337122' and name = 'Mercanis' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/prophet.png'
where id = 'e4a92403-b6fe-40d9-acab-ed845d8a4e67' and name = 'Prophet' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/siemens.png'
where id = '9770913f-1230-4954-b315-348f9531385f' and name = 'Siemens AG' and nullif(btrim(logo_url), '') is null;
