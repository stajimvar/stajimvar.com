-- BEĞENİ BİLDİRİMİ ARTIK PAYLAŞIMIN KENDİSİNE GİDİYOR
--
-- NEDEN VAR
-- ---------
-- 20260927130000 beğeni bildirimini `/cv` adresine bağlarken bunu bir
-- ÖDÜN olarak yazmıştı; o yorum hâlâ okunabilir ve şöyle diyordu:
-- paylaşımın kalıcı bir adresi yok, olmayan bir adrese götüren bildirim
-- dokununca 404 verirdi. Doğruydu. Artık adres var:
-- `/paylasim/<id>` (App.tsx rotası, functions/_middleware.ts uygulama
-- öneki, src/components/sosyal/PaylasimSayfasi.tsx ekranı).
--
-- ÖLÇÜLEN KUSUR
-- -------------
-- `/cv` alıcının kendi ızgarası: hangi paylaşımın beğenildiğini
-- kullanıcı oradan kendisi bulmak zorundaydı. ŞİRKET HESABINDA HİÇ
-- ÇALIŞMIYORDU — şirket kabuğunda `/cv` adresi `/sirket/profil`e
-- yönleniyor ve o ekranda paylaşım ızgarası yok.
--
-- Üretimde ölçüldü (28 Eylül 2026): 22 beğeni bildirimi var, alıcıları
-- 15 öğrenci, 6 yönetici, 1 şirket. Yani şirket dalı varsayım değil,
-- gerçekten kullanılan bir dal.
--
-- BU GÖÇ YENİ BİR ŞEY KURMUYOR
-- ----------------------------
-- Tetikleyici, yineleme anahtarı, alıcı seçimi ve "kendi yaptığının
-- bildirimi gelmiyor" kuralı AYNEN duruyor. Değişen tek şey yazılan
-- `target_url`.

-- ------------------------------------------------------------------
-- 1) YENİ BİLDİRİMLER
-- ------------------------------------------------------------------
--
-- Gövde 20260927130000'deki ile birebir aynı; yalnız adres satırı
-- değişti. Fonksiyonun tamamı yeniden yazılıyor çünkü `create or
-- replace` kısmi bir yama kabul etmiyor.
create or replace function sosyal_gizli.begeni_bildirimi()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  yazar uuid;
begin
  select p.author_id into yazar from public.posts p where p.id = NEW.post_id;

  /* Kendi paylaşımını beğenen kendine bildirim üretmiyor. */
  if yazar is null or yazar = NEW.user_id then
    return NEW;
  end if;

  perform sosyal_gizli.bildirim_yaz(
    yazar,
    'paylasim_begeni',
    sosyal_gizli.bildirim_adi(NEW.user_id) || ' paylaşımını beğendi',
    null,
    '/paylasim/' || NEW.post_id,
    'begeni:' || NEW.post_id || ':' || NEW.user_id
  );
  return NEW;
end;
$$;

-- Tetikleyici yeniden BAĞLANMIYOR: `create or replace function` gövdeyi
-- yerinde değiştiriyor ve `begeni_bildirimi_tg` zaten bu fonksiyonu
-- gösteriyor. Yeniden kurmak, iki göç arasında gelen beğenilerde
-- tetikleyicinin bir an düşmesi demek olurdu.

-- ------------------------------------------------------------------
-- 2) ESKİ BİLDİRİMLER DE DÜZELİYOR
-- ------------------------------------------------------------------
--
-- Zildeki 22 satır `/cv` ile duruyor. Yalnız tetikleyici düzeltilseydi
-- kullanıcının BUGÜN elinde olan bildirimler eski davranışta kalırdı —
-- düzeltme yeni beğeni gelene kadar görünmezdi.
--
-- Adres anahtardan okunuyor: `begeni:<post>:<begenen>`. İkinci alan
-- paylaşım kimliği; bu biçimi 20260927130000 yazıyor ve yukarıdaki
-- fonksiyon aynen sürdürüyor.
--
-- SÜZGEÇLER DAR:
--   * yalnız `paylasim_begeni` satırları,
--   * yalnız hâlâ `/cv` gösterenler — elle ya da ileride başka bir
--     göçle değiştirilmiş bir satırın üstüne yazılmıyor,
--   * yalnız anahtarı beklenen biçimde olanlar; biçimsiz bir anahtar
--     `/paylasim/` + boş dize üretir ve çalışmayan bir adres bırakırdı.
--
-- Paylaşımın HÂLÂ VAR OLMASI şart koşulmuyor: satır silinmişse adres
-- zaten ekranda dürüst bir "ulaşılamıyor" veriyor, `/cv` ise sessizce
-- yanlış yere götürüyordu. İkisinden dürüst olanı seçiliyor.
update public.notifications
set target_url = '/paylasim/' || split_part(dedupe_key, ':', 2)
where type = 'paylasim_begeni'
  and target_url = '/cv'
  and dedupe_key like 'begeni:%'
  and split_part(dedupe_key, ':', 2) <> '';
