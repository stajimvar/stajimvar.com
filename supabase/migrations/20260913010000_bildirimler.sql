-- UYGULAMA İÇİ BİLDİRİMLER
--
-- ÖLÇÜM (31 Ağustos 2026)
-- -----------------------
-- `notifications` tablosu YOK, bildirim yardımcısı YOK, okunmamış sayacı
-- YOK. Header'daki zarf ikonunun başlığı "Mesajlar ve Bildirimler" ama
-- yaptığı tek şey sekme değiştirmek: öğrenciyi Başvurularım'a, şirketi
-- aday havuzuna götürüyor. Yani ikon var olmayan bir şeyi vaat ediyordu.
--
-- Sonuç: şirket görüşmeye davet etse de teklif gönderse de öğrenci
-- ancak Başvurularım'a tekrar girerse öğreniyordu.
--
-- BİLDİRİM NEREDE ÜRETİLİYOR
-- --------------------------
-- Tek yerde: `applications` üzerindeki bir TETİKLEYİCİ. İstemcinin
-- "işlem başarılı, şimdi bildirim ekleyeyim" demesine güvenilmiyor —
-- o yol sessiz tutarsızlık üretir (ana işlem olur, bildirim olmaz) ve
-- bildirimi istemcinin insafına bırakır.
--
-- Tetikleyici, asıl yazımla AYNI İŞLEMİN içinde çalışıyor: başvuru
-- güncellenmediyse bildirim de yok, bildirim yazılamazsa güncelleme de
-- geri alınıyor.
--
-- Ayrıca bütün akışı tek noktadan kapsıyor. Görüşme yanıtı ve teklif
-- yanıtı işlevleri (`gorusmeye_yanit_ver`, `teklife_yanit_ver`) de
-- sonunda bu tabloyu güncelliyor; şirketin durum değişiklikleri, davet
-- gönderme ve teklif gönderme de öyle. Her birine ayrı ayrı bildirim
-- kodu koymak, birini unutmaya açık dört ayrı yer demekti.
--
-- YİNELENEN BİLDİRİM
-- ------------------
-- Tetikleyici ESKİ ve YENİ satırı karşılaştırıyor: gerçekten değişmeyen
-- bir alan bildirim üretmiyor. Aynı durum ikinci kez yazılırsa
-- (`offer_extended` iken yine `offer_extended`) hiçbir şey olmuyor.

create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),

  -- BİLDİRİM KULLANICIYA AİT, ŞİRKETE DEĞİL. Şirketin birden fazla
  -- üyesi varsa her birine kendi satırı yazılıyor: biri okuduğunda
  -- diğerinin bildirimi okunmuş sayılmıyor.
  recipient_id   uuid not null references auth.users(id) on delete cascade,

  type           text not null,
  title          text not null,
  body           text,

  -- Doğrudan ilgili ekranı açan adres. Kullanıcıyı genel bir sayfaya
  -- atıp aratmamak için ilgili başvurunun kimliğini taşıyor.
  target_url     text,

  -- Bildirimin bağlı olduğu başvuru. Başvuru silinirse bildirim de
  -- gidiyor: neye ait olduğu belirsiz bir bildirim gösterilemez.
  application_id uuid references public.applications(id) on delete cascade,

  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

-- Okunmamış sayacı ve liste tek sorguda: alıcı + tarih.
create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

-- Rozet sorgusu yalnızca okunmamışlara bakıyor.
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------
-- ERİŞİM: HERKES YALNIZ KENDİ SATIRINI
-- ---------------------------------------------------------------------
drop policy if exists "kendi bildirimlerini okur" on public.notifications;
create policy "kendi bildirimlerini okur" on public.notifications
  for select using (recipient_id = auth.uid());

drop policy if exists "kendi bildirimini okundu yapar" on public.notifications;
create policy "kendi bildirimini okundu yapar" on public.notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- INSERT ve DELETE politikası YOK: bildirimi yalnızca tetikleyici
-- (security definer) yazıyor. Kullanıcı kendine bildirim uyduramıyor,
-- başkasına bildirim gönderemiyor, geçmişini silemiyor.

-- SATIR YETKİSİ KOLON YETKİSİ DEĞİL
--
-- Politika hangi satırı güncelleyebileceğini söylüyor ama hangi kolonu
-- yazabileceğini söylemiyor. Kullanıcı kendi bildiriminin başlığını ya
-- da hedef adresini değiştirebilseydi, kendi ekranında sahte bir
-- bildirim üretebilirdi. Yazabildiği tek kolon `read_at`.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select on public.notifications to authenticated;

-- ---------------------------------------------------------------------
-- BİLDİRİM ÜRETİMİ
-- ---------------------------------------------------------------------

/**
 * Bir başvurunun ilanına ait ŞİRKET ÜYELERİNİN HEPSİNE bildirim yazar.
 *
 * Üyelik modeli ölçüldü: `company_members` yalnızca (company_id,
 * user_id, is_owner, recruiter_role) taşıyor — "aktif üye" ya da
 * "bildirim sorumlusu" diye bir kavram YOK. Uydurulmadı: bildirim
 * şirketin bütün üyelerine gidiyor.
 *
 * `p_aktor`: işlemi yapan kullanıcı. Kendi yaptığı işin bildirimini
 * kimse almıyor — o an ekranda zaten sonucu görüyor (toast).
 */
create or replace function public.bildir_sirkete(
  p_basvuru uuid,
  p_tur text,
  p_baslik text,
  p_govde text,
  p_aktor uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (recipient_id, type, title, body, target_url, application_id)
  select m.user_id, p_tur, p_baslik, p_govde,
         '/sirket/basvuranlar?aday=' || p_basvuru::text, p_basvuru
    from public.applications a
    join public.listings l on l.id = a.listing_id
    join public.company_members m on m.company_id = l.company_id
   where a.id = p_basvuru
     and m.user_id is distinct from p_aktor;
$$;

/** Başvuran öğrenciye bildirim. Aktör öğrencinin kendisiyse yazılmıyor. */
create or replace function public.bildir_ogrenciye(
  p_basvuru uuid,
  p_tur text,
  p_baslik text,
  p_govde text,
  p_aktor uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (recipient_id, type, title, body, target_url, application_id)
  select a.student_id, p_tur, p_baslik, p_govde,
         '/profil?basvuru=' || p_basvuru::text, p_basvuru
    from public.applications a
   where a.id = p_basvuru
     and a.student_id is distinct from p_aktor;
$$;

revoke execute on function public.bildir_sirkete(uuid, text, text, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.bildir_ogrenciye(uuid, text, text, text, uuid)
  from public, anon, authenticated;

/**
 * BAŞVURU OLAYLARINDAN BİLDİRİM
 *
 * Yalnız işe alım sürecinde KARŞI TARAFTAN dikkat isteyen değişiklikler.
 * CV değişikliği, profil düzenlemesi, not yazımı gibi şeyler bildirim
 * üretmiyor — bildirim merkezi bir olay günlüğü değil.
 */
create or replace function public.basvuru_bildirimleri()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ilan    text;
  v_sirket  text;
  v_aday    text;
  v_aktor   uuid := auth.uid();
  v_baslik  text;
begin
  select l.title, c.name
    into v_ilan, v_sirket
    from public.listings l
    join public.companies c on c.id = l.company_id
   where l.id = new.listing_id;

  /*
    Adayın adı KOPYADAN geliyor, `profiles` tablosundan değil: şirket o
    tabloyu okuyamıyor ve bildirim metni bu sınırı delmemeli. Rıza
    verilmediyse kopya da yok — o zaman ad yerine "Bir aday".
  */
  v_aday := coalesce(nullif(new.profile_snapshot ->> 'ad', ''), 'Bir aday');

  -- ------------------------------------------------- YENİ BAŞVURU
  if tg_op = 'INSERT' then
    perform public.bildir_sirkete(
      new.id, 'yeni_basvuru', 'Yeni başvuru',
      v_aday || ' · ' || coalesce(v_ilan, 'ilanınız'),
      v_aktor);
    return new;
  end if;

  -- --------------------------------------------------- DURUM DEĞİŞTİ
  if new.status is distinct from old.status then
    if new.status = 'under_review' then
      perform public.bildir_ogrenciye(
        new.id, 'inceleniyor', 'Başvurun inceleniyor',
        coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
        ' başvurunu incelemeye aldı.', v_aktor);

    elsif new.status = 'technical_assessment' then
      perform public.bildir_ogrenciye(
        new.id, 'degerlendirme', 'Başvurun değerlendirme aşamasında',
        coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
        ' başvurun değerlendiriliyor.', v_aktor);

    elsif new.status = 'interview_scheduled' then
      perform public.bildir_ogrenciye(
        new.id, 'gorusme_daveti', 'Görüşme daveti aldın',
        coalesce(v_sirket, 'Şirket') || ' seni ' || coalesce(v_ilan, 'staj') ||
        ' pozisyonu için görüşmeye davet etti.', v_aktor);

    elsif new.status = 'offer_extended' then
      perform public.bildir_ogrenciye(
        new.id, 'teklif', 'Teklif aldın',
        coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
        ' pozisyonu için teklif gönderdi.', v_aktor);

    elsif new.status = 'rejected' then
      /*
        Üst başlık insani: "Başvurun sonuçlandı". Ne aşırı dramatik ne
        de "status changed to rejected" gibi sistem dili.
      */
      perform public.bildir_ogrenciye(
        new.id, 'olumsuz', 'Başvurun sonuçlandı',
        coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
        ' başvurun bu süreçte ilerlemedi.', v_aktor);

    elsif new.status = 'offer_accepted' then
      perform public.bildir_sirkete(
        new.id, 'teklif_kabul', v_aday || ' teklifini kabul etti',
        coalesce(v_ilan, 'İlan') || ' · iletişim bilgileri artık açık.', v_aktor);

    elsif new.status = 'offer_declined' then
      perform public.bildir_sirkete(
        new.id, 'teklif_ret', v_aday || ' teklifi reddetti',
        coalesce(v_ilan, 'İlan'), v_aktor);

    elsif new.status = 'withdrawn' then
      perform public.bildir_sirkete(
        new.id, 'geri_cekildi', v_aday || ' başvurusunu geri çekti',
        coalesce(v_ilan, 'İlan'), v_aktor);
    end if;

    return new;
  end if;

  -- ------------------------------------------- GÖRÜŞME YANITI GELDİ
  --
  -- Durum değişmiyor (`interview_scheduled` olarak kalıyor); değişen
  -- şey durumun içindeki yanıt.
  if new.interview_response is distinct from old.interview_response
     and new.interview_response is not null then
    if new.interview_response = 'accepted' then
      perform public.bildir_sirkete(
        new.id, 'gorusme_kabul', v_aday || ' görüşme davetini kabul etti',
        coalesce(v_ilan, 'İlan'), v_aktor);
    else
      perform public.bildir_sirkete(
        new.id, 'gorusme_ret', v_aday || ' görüşme davetine katılamayacak',
        coalesce(v_ilan, 'İlan'), v_aktor);
    end if;
    return new;
  end if;

  -- ------------------------------------------ GÖRÜŞME DAVETİ GÜNCELLENDİ
  --
  -- Durum zaten görüşme aşamasındayken tarih, saat, biçim, yer ya da not
  -- değiştiyse: öğrencinin bilmesi gereken gerçek bir değişiklik.
  -- Yanıtın boşaltılması tek başına bildirim üretmiyor — şirket yeni
  -- davet gönderdiğinde alanlar da değişiyor ve tek bildirim yeterli.
  if new.status = 'interview_scheduled'
     and (
       new.interview_date     is distinct from old.interview_date or
       new.interview_time     is distinct from old.interview_time or
       new.interview_type     is distinct from old.interview_type or
       new.interview_location is distinct from old.interview_location or
       new.interview_note     is distinct from old.interview_note
     )
  then
    perform public.bildir_ogrenciye(
      new.id, 'gorusme_guncellendi', 'Görüşme davetin güncellendi',
      coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
      ' görüşme bilgileri değişti.', v_aktor);
  end if;

  return new;
end;
$$;

revoke execute on function public.basvuru_bildirimleri() from public, anon, authenticated;

drop trigger if exists applications_bildirimler on public.applications;
create trigger applications_bildirimler
  after insert or update on public.applications
  for each row execute function public.basvuru_bildirimleri();

-- ---------------------------------------------------------------------
-- TÜMÜNÜ OKUNDU İŞARETLE
-- ---------------------------------------------------------------------
-- Kolon yetkisi `read_at` ile sınırlı olduğu için istemci bunu düz bir
-- UPDATE ile de yapabilirdi. Yine de tek bir işlev: "hangi satırlar"
-- sorusunun cevabı sunucuda kalıyor ve istemci `recipient_id` süzgecini
-- unutamıyor.
create or replace function public.bildirimleri_okundu_isaretle()
returns integer
language sql
security definer
set search_path = public
as $$
  with guncellenen as (
    update public.notifications
       set read_at = now()
     where recipient_id = auth.uid()
       and read_at is null
    returning 1
  )
  select count(*)::int from guncellenen;
$$;

revoke all on function public.bildirimleri_okundu_isaretle() from public, anon;
grant execute on function public.bildirimleri_okundu_isaretle() to authenticated;

-- SAKLAMA SÜRESİ
--
-- Bu sürümde silme yok ve yeni bir zamanlanmış iş kurulmuyor. Tablo
-- başvuru başına birkaç satır büyüyor (bir başvurunun tüm yaşam döngüsü
-- en fazla 6-7 bildirim üretiyor), yani hacim başvuru sayısıyla doğru
-- orantılı ve bugünkü ölçekte sorun değil. Başvuru silinirse bildirimleri
-- de gidiyor (ON DELETE CASCADE).
