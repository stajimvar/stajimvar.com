-- =====================================================================
-- BİLDİRİMİ TEK TEK SİLME
-- =====================================================================
--
-- Kullanıcı bildirim panelinde istediği bildirimi silebiliyor. Silme
-- GERÇEK silme: satır gidiyor, sayfa yenilenince geri gelmiyor ve
-- okunmamış sayısı sunucudan okunduğu için kendiliğinden düşüyor.
--
-- YALNIZ KENDİ BİLDİRİMİ
-- ----------------------
-- 20260913010000 "DELETE politikası YOK" diyordu; yani silme RLS'te
-- kapalıydı. Ama tablo düzeyinde yetki Supabase'in varsayılanından
-- kalmıştı: canlıda `authenticated` için DELETE ve INSERT, `anon` için
-- SELECT tanımlı (ölçüldü, 2026-10-04). Politika olmadığı için bunlar
-- işe yaramıyordu; yine de "politika eklenince ne açılır" sorusunun
-- cevabı yetkiye bakarak verilebilsin diye burada daraltılıyor:
--
--   · anon         → hiçbir şey (bildirimi olan anonim kullanıcı yok)
--   · authenticated→ SELECT, UPDATE (read_at), DELETE
--
-- Satır sınırı politikada: `recipient_id = auth.uid()`. Başkasının
-- bildirimine yönelen silme hata vermiyor, SIFIR satır siliyor; istemci
-- dönen satır sayısına bakıp bunu "silinmedi" olarak ele alıyor.
--
-- INSERT hâlâ yok: bildirimi yalnız tetikleyiciler (security definer)
-- yazıyor. Kullanıcı kendine bildirim uyduramıyor.
--
-- SİLİNEN OLAY YENİDEN GELİR Mİ?
-- ------------------------------
-- Sosyal bildirimler `dedupe_key` ile tekilleşiyor. Satır silinince
-- anahtar da gidiyor; AYNI olay (ör. beğeni geri alınıp yeniden
-- verilirse) yeniden yaşanırsa yeni bir bildirim doğabilir. Bu yeni bir
-- olaydır, silinenin geri gelmesi değil. Hiçbir iş bildirimi kendiliğinden
-- yeniden yazmıyor; 20260927130000'deki geriye dönük doldurma bir kerelik.
--
-- "TÜMÜ OKUNDU" DEĞİŞMİYOR
-- ------------------------
-- `bildirimleri_okundu_isaretle()` ve okundu politikası olduğu gibi.

drop policy if exists "kendi bildirimini siler" on public.notifications;
create policy "kendi bildirimini siler" on public.notifications
  for delete to authenticated
  using (recipient_id = auth.uid());

revoke all on public.notifications from anon;
revoke insert, delete, truncate, references, trigger on public.notifications from authenticated;
grant delete on public.notifications to authenticated;

-- Önceki göçün verdiği yetkiler yerinde kalıyor; tekrar söylemek, bu
-- dosyayı tek başına okuyan için tablonun son hâlini görünür kılıyor.
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
