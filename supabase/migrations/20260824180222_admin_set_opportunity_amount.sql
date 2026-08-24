-- TUTAR GİRİŞİ AYRI BİR İŞLEM
--
-- admin_update_opportunity bütün kaydı yazıyor ve uzun. Tutar ise ayrı bir
-- editoryal eylem: birinin resmî kaynağa bakıp "bu yıl şu kadar" demesi
-- gerekiyor. O yüzden ayrı bir fonksiyon — kaydın geri kalanına dokunmadan
-- yalnızca tutar alanlarını yazıyor.
--
-- amount_verified_at'i çağıran değil FONKSİYON damgalıyor: doğrulama
-- tarihini elle girilebilir bırakmak, doğrulanmamış bir tutarı
-- doğrulanmış göstermenin en kolay yolu olurdu.
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
  v_dolu boolean;
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;

  -- Tutar ya bir sayı ya bir açıklama içermeli; ikisi de yoksa kayıt
  -- temizleniyor demektir ve doğrulama damgası da kalkıyor.
  v_dolu := v_min is not null or v_note is not null;

  update public.opportunities set
    amount_min = v_min,
    -- Tek tutarda üst sınır alta eşitleniyor: "12.000–12.000" yazmak
    -- yerine arayüz tek rakam gösterebilsin.
    amount_max = coalesce(v_max, v_min),
    currency = coalesce(nullif(p->>'currency',''), 'TRY'),
    payment_period = nullif(p->>'payment_period',''),
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

revoke all on function public.admin_set_opportunity_amount(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.admin_set_opportunity_amount(uuid, timestamptz, jsonb) to authenticated;
