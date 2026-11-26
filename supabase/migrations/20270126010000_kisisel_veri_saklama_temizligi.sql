/*
  KİŞİSEL VERİ SAKLAMA TEMİZLİĞİ (27 Kasım 2026)

  docs/kvkk/02-saklama-ve-imha-politikasi.md'de "Yapılacak" duran
  kalemler. Süresiz biriken kayıtlar, ihtiyaç bitince siliniyor (KVKK m.4
  "gerekli olan süre kadar muhafaza", m.7 silme):

    site_olaylari_bot_arsivi  90 gün   (olustu_at)
    listing_reports           kapatildi + 1 yıl (reviewed_at, yoksa created_at)
    sirket_talepleri          onaylandi/reddedildi + 1 yıl (created_at; karar
                              tarihi sütunu yok)
    company_claims            approved/rejected + 1 yıl (reviewed_at)
    sirket_davetleri          kabul/iptal + 1 yıl (karar_at, yoksa
                              created_at); 1 yıldır bekleyen davet de

  Kullanıcı hesaplarına DOKUNULMUYOR: hareketsiz hesaplar silinmez
  (kullanıcı kararı, 27 Kasım 2026). Açık/incelemedeki kayıtlara
  dokunulmuyor. Bu tablolara başka tablodan yabancı anahtar yok
  (pg_constraint'ta arandı).

  Uygulandığı gün ölçüldü: silinecek kayıt sayısı her kalemde 0 (en eski
  bot kaydı 22 Eylül 2026). Kural bundan sonra devreye giriyor.

  Çağıran: günlük ilan bağlantı kontrolü iş akışı (servis anahtarı).
  `p_kuru = true` hiçbir şey silmeden sayıları döndürüyor.
*/

create or replace function public.kisisel_veri_saklama_temizligi(p_kuru boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  sonuc jsonb := '{}'::jsonb;
  n bigint;
begin
  -- Bot arşivi: 90 gün
  if p_kuru then
    select count(*) into n from site_olaylari_bot_arsivi where olustu_at < now() - interval '90 days';
  else
    delete from site_olaylari_bot_arsivi where olustu_at < now() - interval '90 days';
    get diagnostics n = row_count;
  end if;
  sonuc := sonuc || jsonb_build_object('bot_arsivi', n);

  -- İlan bildirimleri: kapatıldıktan 1 yıl sonra
  if p_kuru then
    select count(*) into n from listing_reports
     where status::text = 'kapatildi' and coalesce(reviewed_at, created_at) < now() - interval '1 year';
  else
    delete from listing_reports
     where status::text = 'kapatildi' and coalesce(reviewed_at, created_at) < now() - interval '1 year';
    get diagnostics n = row_count;
  end if;
  sonuc := sonuc || jsonb_build_object('ilan_bildirimleri', n);

  -- Şirket talepleri: karara bağlandıktan 1 yıl sonra
  if p_kuru then
    select count(*) into n from sirket_talepleri
     where durum in ('onaylandi', 'reddedildi') and created_at < now() - interval '1 year';
  else
    delete from sirket_talepleri
     where durum in ('onaylandi', 'reddedildi') and created_at < now() - interval '1 year';
    get diagnostics n = row_count;
  end if;
  sonuc := sonuc || jsonb_build_object('sirket_talepleri', n);

  -- Şirket sahiplenme talepleri: incelendikten 1 yıl sonra
  if p_kuru then
    select count(*) into n from company_claims
     where status in ('approved', 'rejected') and reviewed_at < now() - interval '1 year';
  else
    delete from company_claims
     where status in ('approved', 'rejected') and reviewed_at < now() - interval '1 year';
    get diagnostics n = row_count;
  end if;
  sonuc := sonuc || jsonb_build_object('sirket_sahiplenme', n);

  -- Ekip davetleri: sonuçlanınca ya da 1 yıl beklerse
  if p_kuru then
    select count(*) into n from sirket_davetleri
     where coalesce(karar_at, created_at) < now() - interval '1 year';
  else
    delete from sirket_davetleri
     where coalesce(karar_at, created_at) < now() - interval '1 year';
    get diagnostics n = row_count;
  end if;
  sonuc := sonuc || jsonb_build_object('ekip_davetleri', n);

  return sonuc || jsonb_build_object('kuru', p_kuru);
end;
$$;

revoke all on function public.kisisel_veri_saklama_temizligi(boolean) from public, anon, authenticated;
grant execute on function public.kisisel_veri_saklama_temizligi(boolean) to service_role;

comment on function public.kisisel_veri_saklama_temizligi(boolean) is
  'KVKK saklama süreleri: süresi dolan bot kayıtları, ilan bildirimleri, şirket talepleri ve davetleri siler. Yalnız servis anahtarıyla; günlük iş akışından çağrılır.';
