-- UNKNOWN ≠ UNRESTRICTED
--
-- PROBLEM
-- -------
-- `eligible_departments = '{}'` iki ayrı şeyi aynı gösteriyordu:
--
--   A) Kaynak okundu, bölüm kısıtı YOK.
--   B) Kaynak henüz okunmadı, kısıt olup olmadığını BİLMİYORUZ.
--
-- Ürün açısından bunlar zıt: (A) bursu her bölüme uygun yapar, (B) ise
-- hiçbir şey söylemez. İkisini karıştırmak, "sana uygun" etiketini
-- kısıtları bilinmeyen bir bursa yapıştırmak demek — öğrenci
-- başvuramayacağı bir burs için emek harcar.
--
-- ÇÖZÜM: MEVCUT DESENİ İZLE
-- -------------------------
-- Şemada zaten `amount_verified_at` var ve tam olarak bu işi yapıyor:
-- alan dolu olabilir ama damga yoksa DOĞRULANMAMIŞTIR. Aynı desen üç
-- uygunluk boyutuna genişletiliyor. Yeni enum, yeni durum tablosu ve
-- alan başına boolean yığını yok — üç zaman damgası.
--
--   damga NULL                        → UNVERIFIED  (bilinmiyor)
--   damga dolu + dizi boş             → UNRESTRICTED (kısıt yok)
--   damga dolu + dizi dolu            → RESTRICTED   (belirli kısıt)
--
-- ESKİ KAYITLAR
-- -------------
-- Üç sütun da NULL başlıyor, yani 68 kaydın TAMAMI UNVERIFIED oluyor.
-- Bu bilinçli: eğitim seviyesi dolu olan 11 kayıt elle girilmişti ve
-- kaynaktan doğrulandıklarına dair bir kaydımız yok. Var olan veriyi
-- "doğrulanmış" saymak, bu göçün önlemeye çalıştığı hatanın ta kendisi
-- olurdu.
--
-- ALAN BAZLI, BÜTÜNSEL DEĞİL
-- --------------------------
-- Tek bir `eligibility_verified_at` daha sade olurdu ama yanlış olurdu:
-- eğitim seviyesini doğrulamak, bölümü de doğruladığımız anlamına
-- gelmiyor. Üç boyut ayrı ayrı damgalanıyor.

alter table public.opportunities
  add column if not exists departments_verified_at      timestamptz,
  add column if not exists education_levels_verified_at timestamptz,
  add column if not exists cities_verified_at           timestamptz;

comment on column public.opportunities.departments_verified_at is
  'Bölüm kısıtı resmî kaynaktan İNSAN tarafından incelendiğinde dolar. NULL = bilinmiyor; dolu + boş dizi = kısıt yok.';
comment on column public.opportunities.education_levels_verified_at is
  'Eğitim seviyesi kısıtı incelendiğinde dolar. NULL = bilinmiyor; dolu + boş dizi = kısıt yok.';
comment on column public.opportunities.cities_verified_at is
  'Şehir/ikamet kısıtı incelendiğinde dolar. NULL = bilinmiyor; dolu + boş dizi = Türkiye geneli.';

-- Ayrıcalıklı alanlar: yalnızca aşağıdaki security definer fonksiyon
-- yazabiliyor. `authenticated` rolüne UPDATE izni VERİLMİYOR.
revoke update (departments_verified_at, education_levels_verified_at, cities_verified_at)
  on public.opportunities from authenticated, anon;

-- ------------------------------------------------------------------ RPC

/*
  Tek bir uygunluk boyutunu kaydeder.

  `admin_set_opportunity_amount` ile aynı kalıp: yönetici kontrolü
  fonksiyonun içinde, eşzamanlılık koruması `updated_at` üzerinden.
  Arayüzde düğme gizlemek yetmez; kapı burada.

  p_boyut  : 'departments' | 'education_levels' | 'cities'
  p_karar  : 'unverified' | 'unrestricted' | 'restricted'
  p_degerler: 'restricted' için liste; diğerlerinde yok sayılıyor.
*/
create or replace function public.admin_set_opportunity_eligibility(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_boyut text,
  p_karar text,
  p_degerler text[] default '{}'
)
returns timestamptz
language plpgsql security definer set search_path to 'public'
as $$
declare
  result timestamptz;
  v_damga timestamptz;
  v_liste text[];
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;

  if p_boyut not in ('departments', 'education_levels', 'cities') then
    raise exception 'bilinmeyen boyut: %', p_boyut;
  end if;
  if p_karar not in ('unverified', 'unrestricted', 'restricted') then
    raise exception 'bilinmeyen karar: %', p_karar;
  end if;

  -- "restricted" en az bir değer istiyor: boş liste zaten "kısıt yok"
  -- demek ve o karar `unrestricted` ile ifade ediliyor.
  if p_karar = 'restricted' and coalesce(array_length(p_degerler, 1), 0) = 0 then
    raise exception 'kisitli secildi ama deger verilmedi';
  end if;

  v_damga := case when p_karar = 'unverified' then null else now() end;
  v_liste := case when p_karar = 'restricted' then p_degerler else '{}'::text[] end;

  update public.opportunities set
    eligible_departments = case when p_boyut = 'departments' then v_liste else eligible_departments end,
    departments_verified_at = case when p_boyut = 'departments' then v_damga else departments_verified_at end,
    education_levels = case when p_boyut = 'education_levels' then v_liste else education_levels end,
    education_levels_verified_at = case when p_boyut = 'education_levels' then v_damga else education_levels_verified_at end,
    cities = case when p_boyut = 'cities' then v_liste else cities end,
    cities_verified_at = case when p_boyut = 'cities' then v_damga else cities_verified_at end
  where id = p_id and updated_at = p_expected_updated_at
  returning updated_at into result;

  if result is null then raise exception 'kayıt değişti, sayfayı yenileyin'; end if;
  return result;
end;
$$;

revoke all on function public.admin_set_opportunity_eligibility(uuid, timestamptz, text, text, text[]) from public, anon;
grant execute on function public.admin_set_opportunity_eligibility(uuid, timestamptz, text, text, text[]) to authenticated;
