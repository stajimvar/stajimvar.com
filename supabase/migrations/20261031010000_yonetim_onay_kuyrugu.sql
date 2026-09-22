-- ONAY KUYRUĞU
--
-- Panelde "Onay kuyrukları" sayfası yer tutucuydu: 9 taslak ilan
-- incelenmeyi beklerken ekranda "bu ekranda olacaklar" yazıyordu.
--
-- NEDEN RPC, NEDEN DOĞRUDAN TABLO DEĞİL
-- -------------------------------------
-- `listings` SELECT iznini sütun sütun veriyor; tarayıcıdan `select('*')`
-- yapmak 42501 ile düşüyor. Aynı tuzağa panelin özet sayaçları da
-- düşmüştü ve "0 yayındaki ilan" yazıyordu. Okuma da yazma da sunucuda.
--
-- KARARI VERECEK KİŞİYE GEREKEN BİLGİ
-- -----------------------------------
-- `source_status` ve `apply_url` listede görünüyor. Taslakların ikisinin
-- bağlantısı "erisilemedi" durumunda: erişilemeyen bir ilanı yayına
-- almak, öğrenciyi ölü bir bağlantıya göndermek demek. Açıklama uzunluğu
-- da dönüyor, çünkü 82 karakterlik bir açıklama gerçek bir ilan metni
-- değil; onaylayan bunu görmeden karar vermemeli.

create or replace function public.yonetim_onay_kuyrugu()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
begin
  if not public.is_admin() then
    raise exception 'yonetim_onay_kuyrugu yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'ilanlar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',        l.id,
               'baslik',    l.title,
               'sirket',    c.name,
               'sehir',     l.city,
               'ulke',      l.country_code,
               'kaynak',    l.origin::text,
               'calisma',   l.work_type::text,
               'basvuruYolu', l.application_method::text,
               'adres',     l.apply_url,
               'sonBasvuru', l.application_deadline,
               'kaynakDurumu', l.source_status,
               'aciklamaUzunluk', length(coalesce(l.description, '')),
               'olustu',    l.created_at,
               -- Kararla birlikte geri gonderiliyor: iki yonetici ayni kuyruga
               -- bakarken biri karar verdikten sonra otekinin karari sessizce
               -- ustune yazmasin.
               'guncellendi', l.updated_at
             ) order by l.created_at desc), '[]'::jsonb)
      from listings l
      left join companies c on c.id = l.company_id
      where l.status = 'draft'
    ),

    'sahiplenmeler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',       k.id,
               'sirket',   c.name,
               'kisi',     k.contact_name,
               'unvan',    k.contact_title,
               'eposta',   k.work_email,
               'not',      k.note,
               'olustu',   k.created_at
             ) order by k.created_at desc), '[]'::jsonb)
      from company_claims k
      left join companies c on c.id = k.company_id
      where k.status = 'pending'
    ),

    'bolumler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',       b.id,
               'istenen',  b.requested_department,
               'universite', b.universite,
               'aciklama', b.aciklama,
               'olustu',   b.created_at
             ) order by b.created_at desc), '[]'::jsonb)
      from department_requests b
      where b.status = 'pending'
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_onay_kuyrugu() from public, anon;
grant execute on function public.yonetim_onay_kuyrugu() to authenticated;


-- İLAN KARARI
--
-- Onay `published`, ret `archived` yazıyor. Ret SİLMİYOR: reddedilen ilan
-- kayıtta kalıyor, kararı geri almak mümkün ve neyin neden elendiği
-- görülebiliyor. Silinmiş bir satırdan geriye dönülemez.
--
-- `guard_listing_publish` tetikleyicisi yayına geçişi yönetici dışına
-- kapatıyor; bu fonksiyon security definer olsa da is_admin() oturumun
-- kendi talebinden okunuyor, dolayısıyla kapı burada da geçerli.
--
-- Beklenen zaman damgası isteniyor: iki yönetici aynı kuyruğa bakarken
-- biri karar verdikten sonra ötekinin kararı sessizce üzerine yazmasın.

create or replace function public.yonetim_ilan_karari(
  p_id uuid,
  p_karar text,
  p_beklenen_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mevcut listings%rowtype;
  yeni_durum listing_status;
begin
  if not public.is_admin() then
    raise exception 'yonetim_ilan_karari yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  if p_karar not in ('onayla', 'reddet') then
    raise exception 'gecersiz karar: %', p_karar using errcode = 'check_violation';
  end if;

  select * into mevcut from listings where id = p_id;
  if not found then
    raise exception 'ilan bulunamadi' using errcode = 'no_data_found';
  end if;

  if mevcut.status <> 'draft' then
    raise exception 'ilan artik taslak degil (durum: %)', mevcut.status
      using errcode = 'check_violation';
  end if;

  if p_beklenen_updated_at is not null
     and mevcut.updated_at is distinct from p_beklenen_updated_at then
    raise exception 'ilan bu arada degisti, kuyrugu yenile'
      using errcode = 'check_violation';
  end if;

  yeni_durum := case p_karar when 'onayla' then 'published' else 'archived' end::listing_status;

  update listings set status = yeni_durum where id = p_id;

  return jsonb_build_object('id', p_id, 'durum', yeni_durum::text);
end;
$$;

revoke all on function public.yonetim_ilan_karari(uuid, text, timestamptz) from public, anon;
grant execute on function public.yonetim_ilan_karari(uuid, text, timestamptz) to authenticated;
