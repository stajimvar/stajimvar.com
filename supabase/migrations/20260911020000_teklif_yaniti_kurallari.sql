-- TEKLİF YANITI VE İLETİŞİMİN AÇILMASI — KURALLAR
--
-- Bu dosya bir öncekinden AYRI: PostgreSQL'de bir enum'a eklenen değer,
-- onu ekleyen işlemin içinde KULLANILAMIYOR. Değerler
-- 20260911010000'de eklendi; burada kullanılıyorlar.

-- ---------------------------------------------------------------------
-- 1. ŞİRKET, ÖĞRENCİNİN KARARINI VEREMEZ
-- ---------------------------------------------------------------------
-- Şirketin güncelleme politikası `withdrawn` değerini zaten reddediyordu
-- (20260910010000). Aynı gerekçe iki yeni değer için de geçerli:
-- teklifi kabul etmek ya da reddetmek ÖĞRENCİNİN kararı. Şirket bunları
-- yazabilseydi, öğrencinin kendi başvuru sayfasında vermediği bir kararı
-- okurdu.
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
    status not in ('withdrawn', 'offer_accepted', 'offer_declined')
    and exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );

-- Öğrencinin doğrudan güncelleme hakkı DEĞİŞMİYOR: hâlâ yalnızca
-- `withdrawn`. Kabul/ret tek bir kapıdan geçiyor — aşağıdaki işlev.
-- Yani öğrenci de kendini "Mülakat" ya da "Teklif" yapamıyor.

-- ---------------------------------------------------------------------
-- 2. TEKLİFE YANIT — TEK KAPI
-- ---------------------------------------------------------------------
-- Neden işlev, neden politika değil: karar yalnızca `offer_extended`
-- durumundan verilebilmeli ve iki paralel istek tutarsız bir sonuç
-- üretmemeli. Bunlar satırın O ANKİ değerine bakmayı gerektiriyor;
-- `with check` yalnız yeni satırı görüyor.
--
-- Satır `for update` ile kilitleniyor: aynı anda gelen "kabul et" ve
-- "reddet" istekleri sıraya giriyor, ikincisi ilkinin sonucunu görüyor.
create or replace function public.teklife_yanit_ver(p_basvuru uuid, p_kabul boolean)
returns application_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ogrenci uuid;
  v_durum   application_status;
begin
  select student_id, status into v_ogrenci, v_durum
    from public.applications
   where id = p_basvuru
     for update;

  if not found then
    raise exception 'Başvuru bulunamadı.' using errcode = 'P0002';
  end if;

  -- Karar öğrencinin. Şirket üyesi de, başka bir öğrenci de buraya giremez.
  if v_ogrenci is distinct from auth.uid() then
    raise exception 'Bu teklife yalnızca başvuran öğrenci yanıt verebilir.'
      using errcode = '42501';
  end if;

  -- ZATEN YANITLANMIŞSA HATA DEĞİL: kullanıcı iki kez bastıysa ya da
  -- istek tekrarlandıysa sonuç aynı kalıyor, ekran hata göstermiyor.
  if v_durum in ('offer_accepted', 'offer_declined') then
    return v_durum;
  end if;

  -- Geri çekilmiş, olumsuz sonuçlanmış ya da henüz teklif verilmemiş bir
  -- başvuruda yanıtlanacak bir teklif yok.
  if v_durum <> 'offer_extended' then
    raise exception 'Yanıtlanacak bir teklif yok.' using errcode = 'P0001';
  end if;

  update public.applications
     /* Açık dönüşüm: CASE dalları `unknown` olarak çözülüp enum
        kolonuna atanırken örtük dönüşüm bulunmuyor. */
     set status = case
                    when p_kabul then 'offer_accepted'::application_status
                    else 'offer_declined'::application_status
                  end
   where id = p_basvuru
  returning status into v_durum;

  return v_durum;
end;
$$;

revoke all on function public.teklife_yanit_ver(uuid, boolean) from public, anon;
grant execute on function public.teklife_yanit_ver(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 3. İLETİŞİM — YALNIZCA KABULDEN SONRA
-- ---------------------------------------------------------------------
-- ÖLÇÜM: `profiles` tablosunun okuma kuralı yalnızca kişinin kendisine
-- (ve yöneticiye) açık. Yani bugün şirket öğrencinin telefonunu, öğrenci
-- de şirket yetkilisinin adını/e-postasını HİÇ göremiyor. O kural
-- genişletilmiyor — tabloya yeni bir okuma politikası eklemek, kapıyı
-- burada tarif edilenden geniş açardı.
--
-- Bunun yerine tek bir işlev: kim olduğuna ve başvurunun durumuna bakıp
-- yalnızca KARŞI TARAFIN iletişim satırını veriyor.
--
-- Kapı üç şarta birden bağlı:
--   1. Başvurunun durumu `offer_accepted`.
--   2. Çağıran ya o başvurunun öğrencisi ya da ilanın DOĞRULANMIŞ
--      şirketinin üyesi.
--   3. Başvuruda paylaşım rızası damgası var.
--
-- Üçüncüsü neden: `contact_share_consent_at`, öğrencinin başvuru anında
-- "bilgilerim bu şirketle paylaşılsın" demesiyle yazılıyor ve profil
-- kopyasını da o rıza doğuruyor. Rıza yoksa bu başvuruda paylaşılacak
-- hiçbir şey yok.
create or replace function public.basvuru_iletisimi(p_basvuru uuid)
returns table (taraf text, ad text, eposta text, telefon text, unvan text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ogrenci uuid;
  v_sirket  uuid;
  v_durum   application_status;
  v_riza    timestamptz;
begin
  select a.student_id, l.company_id, a.status, a.contact_share_consent_at
    into v_ogrenci, v_sirket, v_durum, v_riza
    from public.applications a
    join public.listings l on l.id = a.listing_id
   where a.id = p_basvuru;

  -- Bulunamadı, kabul edilmedi ya da rıza yok: satır DÖNMÜYOR. Hata
  -- fırlatmıyor — "bu başvuru var ama göremiyorsun" bilgisi de bir bilgi.
  if not found or v_durum <> 'offer_accepted' or v_riza is null then
    return;
  end if;

  if v_ogrenci = auth.uid() then
    -- Öğrenciye ŞİRKET YETKİLİSİ açılıyor: önce sahip, yoksa en eski üye.
    return query
      select 'sirket'::text,
             p.full_name,
             p.email,
             p.phone,
             coalesce(nullif(m.recruiter_role, ''), 'Yetkili')
        from public.company_members m
        join public.profiles p on p.id = m.user_id
       where m.company_id = v_sirket
       order by m.is_owner desc, m.created_at asc
       limit 1;

  elsif public.is_company_member(v_sirket) and public.sirket_dogrulandi(v_sirket) then
    -- Şirkete ÖĞRENCİ açılıyor. Telefon yalnızca öğrenci profiline
    -- yazdıysa geliyor; boşsa boş kalıyor, zorunlu tutulmuyor.
    return query
      select 'ogrenci'::text,
             p.full_name,
             p.email,
             p.phone,
             'Aday'::text
        from public.profiles p
       where p.id = v_ogrenci;
  end if;

  return;
end;
$$;

revoke all on function public.basvuru_iletisimi(uuid) from public, anon;
grant execute on function public.basvuru_iletisimi(uuid) to authenticated;
