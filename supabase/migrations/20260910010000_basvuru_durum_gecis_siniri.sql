-- ŞİRKET, ADAY ADINA "GERİ ÇEKİLDİ" DİYEMEZ
--
-- Ölçüldü (üretim, 31 Ağustos 2026):
--
--   dogrulanmis sirket basvuru durumu gunceller
--     USING      : is_company_member(l.company_id) AND sirket_dogrulandi(l.company_id)
--     WITH CHECK : YOK
--
--   ogrenci basvuru geri ceker
--     USING      : student_id = auth.uid()
--     WITH CHECK : student_id = auth.uid() AND status = 'withdrawn'
--
-- Öğrenci tarafı kapalı: hangi satırı güncellerse güncellesin sonuç
-- `withdrawn` olmak zorunda, yani öğrenci "Mülakat" ya da "Teklif"
-- yazamıyor. Şirket tarafında ise WITH CHECK hiç yok — doğrulanmış bir
-- şirket başvuruyu `withdrawn` yapabiliyordu.
--
-- `withdrawn` ADAYIN KARARI. Şirket bir adayı reddedebilir (`rejected`)
-- ama "bu aday başvurusunu geri çekti" diyemez: o, olmamış bir şeyi
-- kaydetmek ve öğrencinin kendi başvuru sayfasında yanlış bir cümle
-- göstermek olurdu.
--
-- Arayüzde de bu değer şirketin seçeneklerinde yok
-- (lib/basvuru-durumu.mjs · SIRKET_DURUMLARI) ama düğme gizlemek
-- güvenlik değildir; kural burada.
--
-- Diğer geçişler serbest bırakılıyor: akış tek yönlü değil, şirket bir
-- adayı mülakattan değerlendirmeye geri alabilmeli ve yanlışlıkla
-- verilen bir kararı düzeltebilmeli.

drop policy if exists "dogrulanmis sirket basvuru durumu gunceller" on public.applications;

create policy "dogrulanmis sirket basvuru durumu gunceller" on public.applications
  for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  )
  with check (
    status <> 'withdrawn'
    and exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );
