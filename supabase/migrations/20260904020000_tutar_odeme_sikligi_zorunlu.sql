-- ÇIPLAK SAYI YANILTIYOR
--
-- Audit üç bursta "aylık 2.250 TL" ifadesi buldu. Şema tutarı
-- (amount_min) ve sıklığı (payment_period) ayrı tutuyor ama sıklık
-- zorunlu değildi: yönetici yalnızca sayıyı kaydederse kart "2.250 ₺"
-- yazıyordu. Aylık 2.250 ile tek seferlik 2.250 arasında on iki katlık
-- fark var; öğrenci hangisi olduğunu bilmeden karar veremez.
--
-- KURAL: SAYISAL TUTAR VARSA SIKLIK DA OLMALI
--
-- Kaynak sıklığı söylemiyorsa yönetici sayı alanını boş bırakıp ifadeyi
-- olduğu gibi amount_note'a yazar ("Toplam 20.000 TL"). Böylece eksik
-- bilgi tahminle doldurulmuyor, kaynaktaki hâliyle gösteriliyor.
--
-- Mevcut veri: doğrulanmış tutarı olan burs kaydı yok, bu yüzden kural
-- geçmişe dokunmuyor.
--
-- Gösterim tarafında da aynı kural var (src/lib/firsat-degerlendirme.mjs):
-- sıklığı olmayan sayı karta hiç yazılmıyor. İki kat: veri girişi hatayı
-- baştan engelliyor, gösterim eski kayıtlara karşı ağ görevi görüyor.
create or replace function public.admin_set_opportunity_amount(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p jsonb
) returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  result timestamptz;
  v_min numeric := nullif(p->>'amount_min','')::numeric;
  v_max numeric := nullif(p->>'amount_max','')::numeric;
  v_note text := nullif(trim(p->>'amount_note'),'');
  v_period text := nullif(p->>'payment_period','');
  v_dolu boolean;
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;

  if v_min is not null and v_period is null then
    raise exception 'sayisal tutar icin odeme sikligi zorunlu; kaynak sikligi soylemiyorsa tutari aciklama alanina yazin';
  end if;

  -- Tutar ya bir sayı ya bir açıklama içermeli; ikisi de yoksa kayıt
  -- temizleniyor demektir ve doğrulama damgası da kalkıyor.
  v_dolu := v_min is not null or v_note is not null;

  update public.opportunities set
    amount_min = v_min,
    -- Tek tutarda üst sınır alta eşitleniyor: "12.000–12.000" yazmak
    -- yerine arayüz tek rakam gösterebilsin.
    amount_max = coalesce(v_max, v_min),
    currency = coalesce(nullif(p->>'currency',''), 'TRY'),
    payment_period = v_period,
    amount_period_label = nullif(trim(p->>'amount_period_label'),''),
    amount_note = v_note,
    repayable = case
      when p->>'repayable' = 'true' then true
      when p->>'repayable' = 'false' then false
      else null
    end,
    amount_verified_at = case when v_dolu then now() else null end
  where id = p_id and updated_at = p_expected_updated_at
  returning updated_at into result;

  if result is null then raise exception 'kayıt değişti, sayfayı yenileyin'; end if;
  return result;
end;
$function$;
