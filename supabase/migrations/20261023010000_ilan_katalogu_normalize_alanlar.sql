/*
  İLAN KATALOĞU — NORMALİZE ALANLAR

  Onaylanan katalog ve veri sözleşmesi (21 Eylül 2026) altı normalize
  alan istiyor. Bu göç YALNIZ ŞEMAYI kuruyor: hiçbir satıra değer
  YAZMIYOR. Değerler ayrı ve ayrıca onaylanacak bir adımda, dry-run
  çıktısından yazılacak.

  HAM KOLONLARA DOKUNULMUYOR
  --------------------------
  `city`, `title`, `category`, `term`, `source_status`, `apply_url` ve
  `location_raw` aynen kalıyor. Normalize alan ham alandan TÜRETİLİYOR;
  ters yön yok. Normalize alanın NULL olması bir başarısızlık değil,
  "kanıt yok" demek — sözleşmenin uydurmama kuralı bu.

  `application_method` YENİDEN AÇILMIYOR
  --------------------------------------
  Kolon zaten var (enum: external | email_application | internal) ve
  katalogdaki 188 ilanın 188'i `external`. İkinci bir başvuru yöntemi
  alanı açmak, iki alanın zamanla ayrışması demekti.
*/

/* ------------------------------------------------------------------ */
/*  ŞEHİR — il, ilçe, uzaktan                                          */
/* ------------------------------------------------------------------ */

/*
  `il` YALNIZ TÜRKİYE İÇİN (kullanıcı kararı K3, 21 Eylül 2026).

  Ölçüldü: katalogdaki 104 Türkiye ilanı 10 farklı ham şehir metni
  taşıyor ama 7 gerçek il var. "İstanbul", "Istanbul",
  "Atasehir Istanbul" ve "Turkey - Istanbul" aynı ili dört ayrı şehir
  gibi saydırıyordu; `/staj-ilanlari` sayacındaki "10 şehirde" bundan
  çıkıyordu.

  TR dışı 84 ilanda şehir HAM KALIYOR ve `il` NULL oluyor. Orada da
  yinelenme var (München/Munich, Köln/Cologne) ama ülkeden bağımsız
  bir şehir sözlüğü bu paketin kapsamı değil; ayrı proje olarak
  kayda geçti.
*/
alter table public.listings
  add column if not exists il text,
  add column if not exists ilce text,
  add column if not exists uzaktan boolean;

comment on column public.listings.il is
  'Normalize Türkiye ili (81 ilden biri). TR dışında ve kanıt yoksa NULL. Ham değer city kolonunda kalır.';
comment on column public.listings.ilce is
  'Ham metinde açıkça geçen ilçe. Tahmin edilmez; yoksa NULL.';
comment on column public.listings.uzaktan is
  'NULL = bilinmiyor, false = değil, true = uzaktan. work_type ile çelişirse ikisi de korunur, kayıt inceleme adayı olur.';

/*
  İl değeri 81 ilden biri olmak zorunda — ama NULL serbest.

  Liste `src/lib/il-bul.mjs` içindeki TR_ILLERI ile aynı. İki yerde
  durması hoş değil; veritabanı tarafında kısıt olmadan uydurma bir
  il yazılabildiği için yine de kuruluyor. Liste değişirse (il
  kurulması/adı değişmesi) bu kısıt da güncellenir.
*/
alter table public.listings drop constraint if exists listings_il_gecerli;
alter table public.listings add constraint listings_il_gecerli check (
  il is null or il in (
    'Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara',
    'Antalya','Ardahan','Artvin','Aydın','Balıkesir','Bartın','Batman',
    'Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa',
    'Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne',
    'Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun',
    'Gümüşhane','Hakkâri','Hatay','Iğdır','Isparta','İstanbul','İzmir',
    'Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri',
    'Kırıkkale','Kırklareli','Kırşehir','Kilis','Kocaeli','Konya',
    'Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş',
    'Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun',
    'Siirt','Sinop','Sivas','Şanlıurfa','Şırnak','Tekirdağ','Tokat',
    'Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak'
  )
);

/* ------------------------------------------------------------------ */
/*  İLAN TÜRÜ                                                          */
/* ------------------------------------------------------------------ */

/*
  Varsayılan staj listesi YALNIZ `staj` ve `uzun_donem` gösterecek.
  `mt`, `trainee` ve `erken_kariyer` ayrı süzgeçte erişilebilir kalır;
  NULL olanlar da varsayılan listeye girmez ama SİLİNMEZ, gizlenmez,
  kendi adresleri çalışır.

  Metin kolonu, enum değil: yeni bir tür eklemek enum'a değer eklemeyi
  ve onu okuyan her yeri güncellemeyi gerektirirdi. Kısıt aynı
  güvenceyi veriyor ve gevşetmesi tek satır.
*/
alter table public.listings add column if not exists ilan_tipi text;

comment on column public.listings.ilan_tipi is
  'staj | uzun_donem | trainee | mt | erken_kariyer. NULL = sınıflandırılmadı (uydurulmuş sınıf değil), varsayılan staj listesine girmez.';

alter table public.listings drop constraint if exists listings_ilan_tipi_gecerli;
alter table public.listings add constraint listings_ilan_tipi_gecerli check (
  ilan_tipi is null or ilan_tipi in ('staj','uzun_donem','trainee','mt','erken_kariyer')
);

/* ------------------------------------------------------------------ */
/*  KAYNAK DOĞRULAMA                                                   */
/* ------------------------------------------------------------------ */

/*
  ÜÇ DEĞER (kullanıcı kararı K1, 21 Eylül 2026)

    acik        kaynak sayfası ilanın hâlâ orada olduğunu kanıtladı
    belirsiz    kaynağa ULAŞILDI ama açık olduğuna yeterli kanıt yok
    erisilemedi kaynağa TEKNİK OLARAK ulaşılamadı (bot engeli, zaman
                aşımı, 5xx)

  İlk tasarımda iki değer vardı ve `erisilemedi` sessizce `belirsiz`e
  katlanıyordu. Ölçüldü: katalogdaki 7 kayıt bu yüzden yanlış kutuya
  düşüyordu. "Ulaşamadık" bizim tarafımızın sorunu, "ulaştık ama kanıt
  yok" ilanın — ikisini aynı etikete koymak, düzeltilebilir bir sorunu
  ilanın kusuru gibi göstermek.

  `kapali` BU ÜÇLÜYE KATILMIYOR: kapanma katalog dışı bir kayıt durumu
  ve `status` alanında zaten yaşıyor.

  HİÇBİRİ GİZLEME YA DA KALDIRMA KARARI DEĞİL. Katalog sorgusu bu
  alana BAKMAZ; alan yalnız kartta görünür etiket üretir.
*/
alter table public.listings add column if not exists kaynak_durumu text;

comment on column public.listings.kaynak_durumu is
  'acik | belirsiz | erisilemedi. Gizleme/kaldırma kararı DEĞİL; katalog sorgusu bu alana bakmaz. Ham source_status korunur.';

alter table public.listings drop constraint if exists listings_kaynak_durumu_gecerli;
alter table public.listings add constraint listings_kaynak_durumu_gecerli check (
  kaynak_durumu is null or kaynak_durumu in ('acik','belirsiz','erisilemedi')
);

/* ------------------------------------------------------------------ */
/*  BAŞVURU BAĞLANTISI SAĞLIĞI                                         */
/* ------------------------------------------------------------------ */

/*
  Kaynağın güvenilirliği DEĞİL, bağlantının TEKNİK durumu.

    gecerli        bağlantı çağrıldı, çalışıyor
    kirik          kesin kanıtla ölü — YALNIZ HTTP 404 ve 410
    dogrulanamadi  çağrılamadı (403/429/5xx/zaman aşımı)
    NULL           hiç denenmedi

  403/429/5xx KIRIK SAYILMIYOR: bot engeli ve geçici sunucu hatası
  ilan hakkında bir şey söylemez. Ölçüldü (21 Eylül 2026, 188
  bağlantı): 174 geçerli, 8 kırık, 6 doğrulanamadı.

  `kirik` ilanı listeden ÇIKARMAZ — kartta kırmızı uyarı gösterir.
*/
alter table public.listings add column if not exists apply_url_ok text;

comment on column public.listings.apply_url_ok is
  'gecerli | kirik | dogrulanamadi. Bağlantının teknik durumu; kaynağın güvenilirliği değil. Kırık ilan listeden çıkarılmaz.';

alter table public.listings drop constraint if exists listings_apply_url_ok_gecerli;
alter table public.listings add constraint listings_apply_url_ok_gecerli check (
  apply_url_ok is null or apply_url_ok in ('gecerli','kirik','dogrulanamadi')
);

/* ------------------------------------------------------------------ */
/*  OKUMA YETKİSİ — 42501 DERSİ                                        */
/* ------------------------------------------------------------------ */

/*
  `listings` üzerinde SELECT yetkisi KOLON KOLON veriliyor. Yeni bir
  kolona `grant select` verilmezse, o kolonu seçen sorgunun TAMAMI
  42501 ile düşüyor — tek kolon yüzünden bütün liste "yüklenemedi"
  oluyor. Bu üretimde bir kez yaşandı.

  YAZMA YETKİSİ VERİLMİYOR. Normalize alanları yalnız sunucu tarafı
  iş dolduracak; şirket kendi ilanına "kaynak doğrulandı" ya da
  "bağlantı geçerli" damgası basamamalı.
*/
grant select (il, ilce, uzaktan, ilan_tipi, kaynak_durumu, apply_url_ok)
  on public.listings to anon, authenticated;

/* ------------------------------------------------------------------ */
/*  İNDEKS                                                             */
/* ------------------------------------------------------------------ */

/*
  Varsayılan liste `status` + `ilan_tipi` üzerinden süzülecek, şehir
  süzgeci `il` üzerinden. Kısmi indeks: katalog dışı satırlar indekste
  yer kaplamasın.
*/
create index if not exists listings_katalog_tip_idx
  on public.listings (ilan_tipi, il)
  where status = 'published';
