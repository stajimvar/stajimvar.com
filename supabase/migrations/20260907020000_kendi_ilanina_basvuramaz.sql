-- ŞİRKET ÜYESİ KENDİ ŞİRKETİNİN İLANINA BAŞVURAMAZ
--
-- Şirket üyesi öğrenci görünümüne geçip kendi ilanını kontrol edebiliyor
-- — bu bilinçli ve korunuyor. Ama oradan BAŞVURABİLİYORDU da: kendi
-- paneline sahte bir aday düşüyor, `applicants_count` şişiyor ve ilan
-- listesinde gerçek olmayan bir talep görünüyordu.
--
-- Geçen turda arayüzde nötr bir durum çizildi ("Bu ilanı şirket
-- hesabınız yönetiyor") ama kural veritabanında yoktu; istek gövdesini
-- kendi yazan biri yine başvurabilirdi. Arayüzde düğme gizlemek güvenlik
-- değil.
--
-- Politikanın geri kalanı AYNI kalıyor: yalnızca kendi adına, yalnızca
-- yayındaki ve süresi geçmemiş ilana. Tek eklenen, başvuranın o ilanın
-- şirketinde üye OLMAMASI.
drop policy if exists "ogrenci basvuru yapar" on public.applications;
create policy "ogrenci basvuru yapar"
  on public.applications for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.listings l
      where l.id = applications.listing_id
        and l.status = 'published'
        and (l.application_deadline is null or l.application_deadline >= current_date)
        and not public.is_company_member(l.company_id)
    )
  );
