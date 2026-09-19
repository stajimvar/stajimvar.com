-- TAKİP BİLDİRİMİ
--
-- `takipler` tablosu 20261014010000 ile geldi ama bildirim tarafı
-- bağlanmadı: birisi seni takip edince hiçbir şey olmuyordu. Bağlantı
-- isteği (20260927130000) ve beğeni için tetikleyici vardı, takip için
-- yoktu. Burada aynı desen takibe de uygulanıyor.
--
-- ADRES: takip EDENİN profili. Bildirimi alan kişi "kim takip etti"
-- sorusunun cevabına dokunup gidebilsin diye. Kullanıcı adı yoksa
-- (sosyal profil henüz açılmamışsa) /agim'e düşüyor — orada takipçi
-- listesi var.
--
-- YİNELENME: anahtar takipçi+hedef çiftine bağlı. Takipten çıkıp yeniden
-- takip etmek ikinci bir bildirim üretmiyor; bu, bildirim panelini
-- kasıtlı olarak doldurmanın önünü kapatıyor.

create or replace function sosyal_gizli.takip_bildirimi()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  kullanici_adi text;
  adres text;
begin
  select nullif(trim(o.username), '') into kullanici_adi
  from public.social_profiles o
  where o.profile_id = NEW.takipci_id;

  adres := case when kullanici_adi is null then '/agim' else '/profil/' || kullanici_adi end;

  perform sosyal_gizli.bildirim_yaz(
    NEW.hedef_id,
    'takip',
    sosyal_gizli.bildirim_adi(NEW.takipci_id) || ' seni takip etmeye başladı',
    null,
    adres,
    'takip:' || NEW.takipci_id || ':' || NEW.hedef_id
  );
  return NEW;
end;
$$;

drop trigger if exists takip_bildirimi_tg on public.takipler;
create trigger takip_bildirimi_tg
  after insert on public.takipler
  for each row execute function sosyal_gizli.takip_bildirimi();
