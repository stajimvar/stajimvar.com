/*
  OGULSIZE — İKİ İŞVEREN İLANININ ÜLKE KODU (2 Kasım 2026)

  "Modelist Stajyeri" (27 Eylül) ve "Stilist Stajyeri" (4 Ekim) işverenin
  kendi panelinden girilmiş (`origin = employer_posted`) ama `country_code`
  boş kalmış. Türkiye kapısı (`country=TR`) ülke koduna göre süzdüğü için
  iki ilan "Türkiye" görünümünde hiç çıkmıyordu; yalnız "Tüm ilanlar"da.

  KANIT (tahmin değil, işverenin kendi beyanı ve doğrulanmış kayıt):
    · ilanın kendi alanları: city = 'İstanbul', work_type = 'On-site'
    · şirket: Ogulsize, location = 'İstanbul', VKN 23 Eylül 2026'da
      doğrulanmış (Türkiye vergi kimlik numarası)
    · aynı işverenin 13 Ekim'de girdiği ilanda country_code = 'TR'

  Kök neden kapanmış: country_code'u boş işveren ilanı yalnız bu ikisi;
  13 Ekim'den sonra girilen işveren ilanı TR taşıyor.

  KORUMA: satır yalnız kimlik + başlık + şehir eşleşiyor VE ülke kodu
  hâlâ boşsa güncelleniyor. Başka hiçbir ilana dokunulmuyor.

  GERİ ALMA:
    update public.listings set country_code = null
     where id in ('ffc10235-ce73-4ffa-9dda-96a3f4354017', '2096468c-96cf-45ea-a6bd-6a2682ddbf15')
       and country_code = 'TR';
*/

update public.listings set country_code = 'TR'
where id = 'ffc10235-ce73-4ffa-9dda-96a3f4354017' and title = 'Modelist Stajyeri'
  and city = 'İstanbul' and origin = 'employer_posted' and country_code is null;
update public.listings set country_code = 'TR'
where id = '2096468c-96cf-45ea-a6bd-6a2682ddbf15' and title = 'Stilist Stajyeri'
  and city = 'İstanbul' and origin = 'employer_posted' and country_code is null;
