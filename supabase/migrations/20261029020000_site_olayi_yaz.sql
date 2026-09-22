-- OLAY YAZMA
--
-- Cloudflare işlevi servis anahtarıyla bu fonksiyonu çağırıyor. Doğrudan
-- INSERT yerine RPC olmasının sebebi, sınırların ve temizliğin tek yerde
-- durması: alan uzunlukları burada kırpılıyor, saklama süresi burada
-- uygulanıyor. İstemci bu fonksiyonu çağıramıyor (anon ve authenticated'a
-- izin verilmiyor); zaten çağırabilseydi sayaçlar şişirilebilirdi.

create or replace function public.site_olayi_yaz(
  p_oturum  text,
  p_tur     text,
  p_yol     text,
  p_baslik  text default null,
  p_kaynak  text default null,
  p_sehir   text default null,
  p_ulke    text default null,
  p_cihaz   text default null,
  p_kullanici uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  kis constant int := 300;
begin
  if p_oturum is null or p_oturum = '' or p_yol is null or p_yol = '' then
    return;
  end if;

  -- YÖNETİM PANELİ SAYILMIYOR
  -- Paneli açan yönetici ziyaretçi değil. Kendi bakışımızı trafiğe
  -- katmak, az sayıda gerçek ziyaretçinin olduğu bir sitede sayıyı
  -- gözle görülür biçimde bozardı.
  if p_yol like '/yonetim%' then
    return;
  end if;

  insert into site_olaylari (oturum, tur, yol, baslik, kaynak, sehir, ulke, cihaz, kullanici_id)
  values (
    left(p_oturum, 64),
    p_tur,
    left(p_yol, kis),
    left(p_baslik, kis),
    left(p_kaynak, 120),
    left(p_sehir, 120),
    left(p_ulke, 2),
    p_cihaz,
    p_kullanici
  );

  -- SAKLAMA SÜRESİ: 90 GÜN
  -- Panelin en uzun dönemi 30 gün; 90 gün karşılaştırma için fazlasıyla
  -- yeter. Süresiz saklamak, ihtiyaç duyulmayan ziyaretçi hareketini
  -- elde tutmak olurdu. Temizlik ara sıra çalışıyor: her yazmada silme
  -- taraması yapmak gereksiz yük.
  if random() < 0.005 then
    delete from site_olaylari where olustu_at < now() - interval '90 days';
  end if;
end;
$$;

revoke all on function public.site_olayi_yaz(text, text, text, text, text, text, text, text, uuid)
  from public, anon, authenticated;

comment on function public.site_olayi_yaz is
  'Ziyaretçi olayı kaydeder. Yalnız sunucudan servis anahtarıyla çağrılıyor.';
