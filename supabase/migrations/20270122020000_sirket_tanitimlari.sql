/*
  ŞİRKET TANITIMLARI — 23 ŞİRKET (24 Kasım 2026)

  AdSense ikinci retti; 20270121 sonrası kural: tanıtımı (`description`)
  olmayan şirket sayfası noindex (scripts/onrender.mjs, sirketInce).
  Yayında 3+ ilanı olup tanıtımı boş 23 şirketin hepsi.

  Kaynaklar (her satırın sonundaki yorum): Wikipedia özetleri (24 Kasım
  2026 okundu), şirketin resmî sitesi (Fergani: ferganispace.com,
  WordSmith: wordsmith.com.tr) ya da şirketin Workable hesabına kendi
  yazdığı tanıtım (Rapsodo, Vertigo). Eskiyen sayılar (üretim adedi,
  çalışan sayısı, ciro) bilerek yazılmadı.

  DÜZELTME: Vertigo'nun `website_url`'i vertigogames.com idi; o alan adı
  Kore'deki başka bir oyun şirketinin. Workable hesabının bildirdiği
  adres vertigogames.co. Fergani'nin sitesi boştu; ferganispace.com.

  KORUMA: yalnız tanıtımı hâlâ boşsa yazıyor (şirket kendi metnini
  girdiyse dokunulmuyor).

  GERİ ALMA:
    update public.companies set description = null where id in (<aşağıdaki kimlikler>)
      and description like '%StajımVar''daki staj ilanları şirketin resmî kariyer sayfasından%';
*/

-- kaynak: https://ferganispace.com/tr
update public.companies set description = $metin$Fergani Uzay Teknolojileri, 2022'de kurulan bir uzay teknolojisi şirketi. Ticari amaçla uydular, bu uydularda kullanılan bileşenler ve faydalı yükler üretiyor; özgün itki teknolojileriyle geliştirdiği Yörünge Transfer Araçları (YTA) ile uzay taşımacılığı alanında hizmet veriyor. Şirketin hedefi uzay taşımacılığı ve alçak yörünge (LEO) uydu servislerinde sürdürülebilir ve maliyet etkin çözümler üretmek. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '41c17b50-0a31-453e-be1b-53adf63ce14d' and slug = 'fergani-uzay-teknolojileri' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/Robert_Bosch_GmbH
update public.companies set description = $metin$Bosch (Robert Bosch GmbH), 1886'da Robert Bosch tarafından Stuttgart'ta kurulan, merkezi Almanya'nın Gerlingen kentinde bulunan çok uluslu bir mühendislik ve teknoloji şirketi. Otomotiv parçalarında dünyanın en büyük tedarikçileri arasında yer alıyor. Şirket hisselerinin büyük çoğunluğu, sağlık ve sosyal alanlarda çalışan Robert Bosch Stiftung adlı hayır kurumuna ait. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'ef665ff6-3779-4df0-959e-8ae7b3e2f4e1' and slug = 'bosch' and nullif(btrim(description), '') is null;

-- kaynak: https://tr.wikipedia.org/wiki/Baykar
update public.companies set description = $metin$Baykar, 1986'da Özdemir Bayraktar tarafından Baykar Makine adıyla kurulan, Türkiye merkezli bir savunma ve teknoloji şirketi. Başlangıçta otomotiv sanayisi için hassas motor, pompa ve dişli kutusu parçaları üretiyordu; 2000'den itibaren insansız hava aracı (İHA) teknolojilerine ve bu alandaki Ar-Ge çalışmalarına yöneldi. Bugün İHA, komuta-kontrol (C4I) ve yapay zekâ alanlarında çalışıyor ve TEKNOFEST'in paydaşları arasında yer alıyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'cc95c826-c92f-43b8-92eb-fc534da5bd54' and slug = 'baykar' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/Mercedes-Benz_Group
update public.companies set description = $metin$Mercedes-Benz Group AG, merkezi Stuttgart'ta bulunan çok uluslu bir Alman otomotiv şirketi. Kökeni, dünyanın en eski otomobil şirketi Benz & Cie. ile Daimler-Motoren-Gesellschaft'ın 1926'da birleşerek Daimler-Benz'i kurmasına dayanıyor. Şirket 1998'de DaimlerChrysler, 2007'de Daimler AG adını aldı; Şubat 2022'de ticari araç bölümü Daimler Truck olarak ayrılınca bugünkü adına kavuştu. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'd765cb3a-75f5-4424-8889-bb883f777123' and slug = 'mercedes-benz-group-ag' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/TikTok
update public.companies set description = $metin$TikTok, ByteDance tarafından Eylül 2016'da kullanıma sunulan bir sosyal ağ ve kısa video platformu. Kullanıcıların yüklediği, birkaç saniyeden bir saate kadar süren videolara mobil uygulama ve web sitesi üzerinden erişiliyor. Çin anakarasında TikTok yerine ayrı işletilen Douyin uygulaması kullanılıyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '1c436482-d8ec-4a41-b7ed-59ae521826fd' and slug = 'tiktok' and nullif(btrim(description), '') is null;

-- kaynak: https://wordsmith.com.tr/
update public.companies set description = $metin$WordSmith, İstanbul'da çalışan, tam hizmet veren bir reklam ajansı. Ajans strateji, hikâye anlatımı ve yaratıcı işlerde her kanalı ve teknolojiyi kullanarak markaların daha etkili ve akılda kalıcı olmasını hedefliyor; farklı ülkelerde ve farklı dillerde iş yapıyor. Portföyünde Fairmont, Emaar ve Nurol Tower gibi markalar için yapılmış işler bulunuyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '52cbef2e-efd1-42c5-9aad-56d0333aa9ac' and slug = 'wordsmith-advertising' and nullif(btrim(description), '') is null;

-- kaynak: https://tr.wikipedia.org/wiki/Vodafone_T%C3%BCrkiye
update public.companies set description = $metin$Vodafone Türkiye (Vodafone Telekomünikasyon A.Ş.), Türkiye'de mobil iletişim hizmeti veren bir telekomünikasyon şirketi. Uzan Grubu'nun kurduğu Telsim, 28 Aralık 2005'te İngiliz telekomünikasyon şirketi Vodafone'a katıldı ve marka 24 Mayıs 2006'da Vodafone Türkiye olarak değiştirildi. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '9fab06a6-5477-4958-b3b4-a18d33a8e150' and slug = 'vodafone-turkiye' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/Porsche
update public.companies set description = $metin$Dr. Ing. h.c. F. Porsche AG, merkezi Stuttgart'ta bulunan, lüks ve yüksek performanslı spor otomobil, SUV ve sedan üreten bir Alman otomobil şirketi. Volkswagen AG bünyesinde yer alıyor; Volkswagen'in kontrol hissesi Porsche Automobil Holding SE'ye ait. Model ailesinde 911, Boxster/Cayman, Panamera, Macan, Cayenne ve Taycan bulunuyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '29767302-5cbb-40b4-b028-762f551ed1d5' and slug = 'dr-ing-h-c-f-porsche-ag' and nullif(btrim(description), '') is null;

-- kaynak: https://tr.wikipedia.org/wiki/Eczac%C4%B1ba%C5%9F%C4%B1_Toplulu%C4%9Fu
update public.companies set description = $metin$Eczacıbaşı Topluluğu, İstanbul merkezli bir sanayi grubu. Kökeni, Nejat Eczacıbaşı'nın 1942'de kurduğu ilaç laboratuvarına ve 1952'de açılan ilk ilaç fabrikasına dayanıyor; bu şirketler 1973'te Eczacıbaşı Holding çatısı altında birleşti. Topluluk bugün çok sayıda şirket ve üretim tesisiyle faaliyet gösteriyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'c2dfadfd-ce03-48f0-99b8-ad6d3bd42b03' and slug = 'eczacibasi' and nullif(btrim(description), '') is null;

-- kaynak: https://apply.workable.com/rapsodo/
update public.companies set description = $metin$Rapsodo, sporculara ve antrenörlere performanslarını ölçüp geliştirmeleri için taşınabilir, kullanımı kolay ve veriye dayalı spor teknolojileri sunan bir spor analitiği şirketi. Kurucusu ve CEO'su Batuhan Okur şirketi 2010'da Singapur'da Rapsodo Pte. Ltd. olarak kurdu. İlk ürünü, ABD'de SkyTrak adıyla dağıtılan uygun fiyatlı kişisel golf atış ölçeriydi; şirket o günden bu yana spor verisi ve teknolojisi alanında büyüdü. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '5c2954cc-ef2b-4e59-9a49-da8215b0a2cf' and slug = 'rapsodo' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/Festo
update public.companies set description = $metin$Festo, merkezi Almanya'nın Esslingen am Neckar kentinde bulunan bir otomasyon teknolojisi şirketi. Aile şirketi olan Festo Grubu, pnömatik ve elektrikli otomasyon teknolojisinin yanı sıra Festo Didactic aracılığıyla teknik eğitim alanında da faaliyet gösteriyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '0c482b9d-47b6-4f5e-87cd-cd091b75f539' and slug = 'festo' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/Amazon_(company)
update public.companies set description = $metin$Amazon.com, Inc., 1994'te Jeff Bezos tarafından Bellevue, Washington'da kurulan çok uluslu bir Amerikan şirketi. Çevrim içi kitap satışıyla başlayan şirket bugün e-ticaret, perakende, bulut bilişim, çevrim içi reklam, dijital yayın, eğlence ve yapay zekâ gibi alanlarda faaliyet gösteriyor; merkezi Seattle'da. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'a6c27ce3-d26a-42b0-a487-2a742e022752' and slug = 'amazon' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/Siemens
update public.companies set description = $metin$Siemens AG, endüstriyel otomasyon, bina otomasyonu, raylı ulaşım ve sağlık teknolojisi alanlarında faaliyet gösteren çok uluslu bir Alman şirketi. Avrupa'nın en büyük mühendislik şirketi olarak biliniyor; yönetim merkezleri Berlin ve Münih'te. Endüstriyel yapay zekâ, otomasyon ve endüstriyel yazılımda küresel pazar liderleri arasında yer alıyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'a551ae9d-c5eb-4e05-aadd-ab202a5b2507' and slug = 'siemens' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/LVMH
update public.companies set description = $metin$LVMH Moët Hennessy Louis Vuitton, merkezi Paris'te bulunan ve lüks ürünlerde uzmanlaşmış Fransız çok uluslu holding. Şirket 1987'de moda evi Louis Vuitton ile Moët Hennessy'nin birleşmesiyle kuruldu; Moët Hennessy de 1971'de şampanya üreticisi Moët & Chandon ile konyak üreticisi Hennessy'nin birleşmesinden doğmuştu. Grup çok sayıda lüks markayı bünyesinde topluyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '8a6a2cf0-3609-4be5-8e12-4c64cc08c88d' and slug = 'lvmh' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/Accor
update public.companies set description = $metin$Accor, otelleri, tatil köylerini ve tatil konaklamalarını sahiplenen, işleten ve franchise veren Fransız çok uluslu konaklama şirketi. Avrupa'nın en büyük, dünyanın ise altıncı büyük konaklama şirketi. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'e71123c8-3774-45f5-a14d-9e39a55f351c' and slug = 'accor' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/Analog_Devices
update public.companies set description = $metin$Analog Devices, Inc. (ADI), veri dönüştürme, sinyal işleme ve güç yönetimi teknolojilerinde uzmanlaşmış çok uluslu bir Amerikan yarı iletken şirketi. Merkezi ABD'nin Massachusetts eyaletindeki Wilmington kentinde. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '55ed6dbe-890d-465e-8c88-7d9ebf27f0cf' and slug = 'analog-devices' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/Medtronic
update public.companies set description = $metin$Medtronic plc, sağlık teknolojileri ve tedavileri geliştirip üreten uluslararası bir tıbbi cihaz şirketi. Yasal merkezi İrlanda'da, operasyon merkezi ise ABD'nin Minneapolis kentinde. 150'den fazla ülkede faaliyet gösteren şirket, gelir bakımından dünyanın en büyük tıbbi cihaz şirketi olarak biliniyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '936ec2d0-7251-42cd-8316-da688b5977c4' and slug = 'medtronic' and nullif(btrim(description), '') is null;

-- kaynak: https://apply.workable.com/vertigogames/
update public.companies set description = $metin$Vertigo, gerçek zamanlı ve çok oyunculu, midcore türünde mobil oyunlar geliştiren ve yayınlayan bir oyun stüdyosu. Stüdyonun StajımVar'daki staj ve yeni mezun ilanları İstanbul'daki ekibi için. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '62a5200d-26e6-455c-bc78-76e71520afd5' and slug = 'vertigo-games' and nullif(btrim(description), '') is null;

-- kaynak: https://tr.wikipedia.org/wiki/SAP
update public.companies set description = $metin$SAP SE, merkezi Almanya'nın Walldorf kentinde bulunan çok uluslu bir yazılım şirketi ve dünyanın en büyük kurumsal yazılım sağlayıcısı. Şirket 1972'de beş eski IBM çalışanı tarafından Mannheim'da Systemanalyse und Programmentwicklung adıyla kuruldu. En bilinen ürünleri arasında SAP ERP yer alıyor. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = '914d1062-500a-4cbd-81eb-a187146b4e51' and slug = 'sap' and nullif(btrim(description), '') is null;

-- kaynak: https://tr.wikipedia.org/wiki/Puma_(%C5%9Firket)
update public.companies set description = $metin$PUMA, merkezi Almanya'nın Bavyera eyaletindeki Herzogenaurach'ta bulunan, spor ve günlük kullanım için ayakkabı, giyim ve aksesuar tasarlayıp üreten çok uluslu bir Alman şirketi. Dünyanın en büyük üçüncü spor giyim üreticisi. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'eaebf277-ea75-44cc-994c-16d408db4a5b' and slug = 'puma' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/SC_Johnson
update public.companies set description = $metin$S. C. Johnson & Son, Inc. (SC Johnson), merkezi ABD'nin Wisconsin eyaletindeki Racine kentinde bulunan, ev temizlik ürünleri ve diğer tüketici kimyasalları üreten çok uluslu bir aile şirketi. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'f60f04ee-3908-41b8-8ae3-309dab597c1d' and slug = 'sc-johnson' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/BMW
update public.companies set description = $metin$BMW Group (Bayerische Motoren Werke AG), merkezi Münih'te bulunan, lüks otomobil ve motosiklet üreten çok uluslu bir Alman şirketi. BMW adı 1917'de Rapp Motorenwerke'nin adını Bayerische Motoren Werke olarak değiştirmesiyle kullanılmaya başlandı. Grup BMW'nin yanı sıra Mini ve Rolls-Royce otomobil markalarına da sahip. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'e92558f4-5a40-4203-8077-df2af79b8174' and slug = 'bmw-group' and nullif(btrim(description), '') is null;

-- kaynak: https://en.wikipedia.org/wiki/JPMorgan_Chase
update public.companies set description = $metin$J.P. Morgan, merkezi New York'ta bulunan çok uluslu Amerikan bankacılık kuruluşu JPMorgan Chase & Co.'nun bir parçası. JPMorgan Chase, ABD'nin en büyük bankası ve Amerika'nın dört büyük bankasının en büyüğü. StajımVar'daki staj ilanları şirketin resmî kariyer sayfasından ya da işe alım sisteminden alınıyor; başvuru şirketin kendi sayfasında yapılıyor.$metin$
where id = 'e61d0c05-e77a-4ad4-8295-6154cc8a9cad' and slug = 'jpmorgan' and nullif(btrim(description), '') is null;

update public.companies set website_url = 'https://vertigogames.co'
where id = '62a5200d-26e6-455c-bc78-76e71520afd5' and slug = 'vertigo-games' and website_url = 'vertigogames.com';

update public.companies set website_url = 'https://ferganispace.com'
where id = '41c17b50-0a31-453e-be1b-53adf63ce14d' and slug = 'fergani-uzay-teknolojileri' and nullif(btrim(website_url), '') is null;
