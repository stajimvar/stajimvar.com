-- FIRSAT: ULUSAL STAJ PROGRAMI 2027 (17 Kasım 2026, kullanıcı teslimi)
--
-- Kaynak: ulusalstajprogrami.iskur.gov.tr (İŞKUR, resmî). İlan değil devlet
-- programı; öğrenci kurum seçmiyor, havuza giriyor ve işverenler teklif
-- veriyor. Bu yüzden ilan hattına değil Fırsatlar'a giriyor.
--
-- TARİH YAZILMIYOR: haberlerde ve üniversite duyurularında başvurunun
-- 26 Ekim – 14 Aralık 2026 olduğu yazıyor ama resmî sayfa tarihi
-- JavaScript'le gösteriyor ve resmî bir belgede 14 Aralık'ı göremedik.
-- Sitenin kuralı: tarihi doğrulanmayan kayda tarih yazılmaz (kart
-- "Takvim bekleniyor" gösterir). Açıklama, İŞKUR'un öğrenci broşüründeki
-- (staj.iskur.gov.tr/assets/images/iskur/usp-ogrenci-brosur.pdf) adımlardan.
--
-- Tekrar çalıştırılabilir: aynı slug varsa dokunulmuyor.

insert into public.opportunities (
  slug, title, organization_name, opportunity_type,
  short_description, description, countries,
  application_url, source_url, canonical_source_url,
  status, verified_at, last_checked_at, published_at, import_method, academic_year
)
select
  'ulusal-staj-programi-2027',
  'Ulusal Staj Programı 2027',
  'İŞKUR / Cumhurbaşkanlığı İnsan Kaynakları Ofisi',
  'youth_program',
  'Kamu ve özel sektördeki staj imkânları için tek başvuru: öğrenciler havuza girer, işverenler teklif verir.',
  'Başvuru e-Devlet ile giriş yapılarak Ulusal Staj Programı sitesindeki başvuru formundan yapılır. '
    || 'Adayların beyan ettiği bilgi ve belgeler ilgili kurumlarca kontrol edilir, onaylanan bilgiler '
    || 'Ağırlıklı Toplam Standart Puan (ATSP) ile değerlendirilir. Değerlendirmesi tamamlanan adaylar '
    || 'stajyer havuzuna alınır ve sisteme kayıtlı işverenler havuzdaki adaylara staj teklifi verir.',
  array['Türkiye'],
  'https://ulusalstajprogrami.iskur.gov.tr',
  'https://ulusalstajprogrami.iskur.gov.tr',
  'https://ulusalstajprogrami.iskur.gov.tr',
  'published', now(), now(), now(), 'kullanici-teslimi', '2026-2027'
where not exists (select 1 from public.opportunities where slug = 'ulusal-staj-programi-2027');
