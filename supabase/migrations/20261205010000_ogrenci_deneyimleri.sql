-- =====================================================================
-- ÖĞRENCİ DENEYİMLERİ (iş, staj, yarı zamanlı, gönüllü)
-- =====================================================================
--
-- NE VAR
-- ------
-- Profilde deneyim alanı yoktu. Öğrenci birden fazla deneyim ekleyip
-- düzenleyebiliyor ve kaldırabiliyor: pozisyon, kurum, başlangıç ayı/yılı,
-- bitiş ayı/yılı ya da "devam ediyorum", kısa açıklama. Tür ayrı bir
-- alan değil: "Tasarım stajyeri", "Gönüllü eğitmen" pozisyonun kendisinde
-- yazılıyor (onaylı tasarım).
--
-- KİM OKUYOR
-- ----------
-- · Öğrenci kendi satırlarını (okuma/yazma).
-- · Yönetici okuma.
-- · Şirket tabloyu DOĞRUDAN OKUYAMIYOR. Şirkete giden iki yol var, ikisi
--   de mevcut paylaşım modelinde:
--     1) Başvuru anı kopyası (`basvuru_profil_kopyalari`, istemcide
--        `basvuruKopyasi` üretiyor) — yalnız paylaşım etkinken okunuyor.
--     2) `basvuru_aday_guncel_profili` — aşağıda `deneyimler` alanı
--        eklendi; kapı değişmedi (`basvuru_iletisimi_acik`).
--   Paylaşım kapalıyken iki yol da deneyim döndürmüyor.
-- · Aday keşfi (`aday_profili`, `arayan_ogrenciler`) ve herkese açık
--   sosyal profil deneyim ALMIYOR: o yüzeylerin rıza metni deneyimi
--   saymıyor.
--
-- ESKİ KAYITLAR
-- -------------
-- Hiçbir öğrenciye deneyim yazılmıyor; tablo boş başlıyor. Eski başvuru
-- kopyalarında `deneyimler` anahtarı yok ve okuma tarafı bunu "karşılaştı-
-- rılamadı" sayıyor, "deneyim eklendi" demiyor.

create table if not exists public.student_experiences (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.student_profiles(id) on delete cascade,
  position      text not null,
  organization  text not null,
  start_year    smallint not null,
  start_month   smallint not null,
  end_year      smallint,
  end_month     smallint,
  ongoing       boolean not null default false,
  description   text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),

  constraint student_experiences_position_check
    check (char_length(btrim(position)) between 1 and 120),
  constraint student_experiences_organization_check
    check (char_length(btrim(organization)) between 1 and 120),
  constraint student_experiences_description_check
    check (description is null or char_length(description) <= 1000),
  constraint student_experiences_start_check
    check (start_year between 1950 and 2100 and start_month between 1 and 12),
  constraint student_experiences_end_range_check
    check ((end_year is null or end_year between 1950 and 2100)
       and (end_month is null or end_month between 1 and 12)),
  /*
    Devam eden deneyimin bitişi yok; biten deneyimin bitişi var ve
    başlangıçtan önce olamaz. Aynı ay başlayıp biten kabul.
  */
  constraint student_experiences_tarih_sirasi_check
    check (
      (ongoing and end_year is null and end_month is null)
      or (not ongoing and end_year is not null and end_month is not null
          and end_year * 12 + end_month >= start_year * 12 + start_month)
    )
);

comment on table public.student_experiences is
  'Öğrencinin iş/staj/yarı zamanlı/gönüllü deneyimleri. Yalnız sahibi ve yönetici '
  'okur; şirket yalnız paylaşım etkin başvuruda kopya ya da '
  'basvuru_aday_guncel_profili üzerinden görür.';

create index if not exists student_experiences_student_idx
  on public.student_experiences (student_id, sort_order);

alter table public.student_experiences enable row level security;

revoke all on public.student_experiences from public, anon, authenticated;
grant select, insert, update, delete on public.student_experiences to authenticated;

drop policy if exists "kendi deneyimleri" on public.student_experiences;
create policy "kendi deneyimleri" on public.student_experiences
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "yonetici deneyimleri okur" on public.student_experiences;
create policy "yonetici deneyimleri okur" on public.student_experiences
  for select to authenticated
  using (public.is_admin());

/*
  ÜST SINIR: kişi başına 30 deneyim. Arayüz zaten makul bir sayıda
  kalıyor; sınır sunucuda da duruyor ki tek bir hesap tabloyu şişiremesin.
*/
create or replace function public.ogrenci_deneyim_siniri()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.student_experiences e
       where e.student_id = new.student_id) >= 30 then
    raise exception 'En fazla 30 deneyim eklenebilir' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.ogrenci_deneyim_siniri() from public, anon, authenticated;

drop trigger if exists student_experiences_siniri on public.student_experiences;
create trigger student_experiences_siniri
  before insert on public.student_experiences
  for each row execute function public.ogrenci_deneyim_siniri();

/* ================================================================== */
/*  GÜNCEL PROFİL: `deneyimler` ALANI                                  */
/* ================================================================== */
--
-- 20261203010000'deki gövde BİREBİR korunuyor; eklenen tek şey
-- `deneyimler`. Kapı aynı: `basvuru_sirketi_mi` + `basvuru_iletisimi_acik`.

create or replace function public.basvuru_aday_guncel_profili(p_basvuru uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ogrenci uuid;
  riza    timestamptz;
begin
  if not sosyal_gizli.basvuru_sirketi_mi(p_basvuru) then
    raise exception 'Bu basvuruyu goremezsin' using errcode = '42501';
  end if;

  select a.student_id, a.contact_share_consent_at into ogrenci, riza
    from public.applications a where a.id = p_basvuru;

  /*
    KAPI ETKİN PAYLAŞIM (20261203010000): rıza damgasının varlığı
    yetmiyor; sade akıştaki kural (`basvuru_iletisimi_acik`) soruluyor.
    Öğrenciye gösterilen paylaşım açıklamasıyla aynı cümle.
  */
  if not public.basvuru_iletisimi_acik(p_basvuru) then
    return jsonb_build_object('riza', false);
  end if;

  return jsonb_build_object(
    'riza', true,
    'guncel', (
      select jsonb_build_object(
        'ad',         nullif(btrim(pr.full_name), ''),
        /* Eski kayıtlarda avatar_url gömülü veri (data:) olabiliyor; yalnız HTTPS adres. */
        'fotoUrl',    case when pr.avatar_url ~ '^https://' then pr.avatar_url end,
        'universite', nullif(btrim(sp.university), ''),
        'bolum',      nullif(btrim(sp.department), ''),
        'sinif',      sp.grade_level::text,
        'sehir',      nullif(btrim(sp.pref_cities[1]), ''),
        'github',     nullif(btrim(sp.github_username), ''),
        'portfolyo',  nullif(btrim(sp.portfolio_url), ''),
        'linkedin',   nullif(btrim(sp.linkedin_url), ''),
        'rozetler',   coalesce(to_jsonb(sp.earned_badges), '[]'::jsonb),
        'yetenekler', coalesce((
            select jsonb_agg(s.name order by s.name)
              from public.student_skills s
             where s.student_id = ogrenci and btrim(coalesce(s.name, '')) <> ''), '[]'::jsonb),
        'diller', coalesce((
            select jsonb_agg(case when nullif(btrim(d.level), '') is null then d.language
                                  else d.language || ' (' || d.level || ')' end
                             order by d.language)
              from public.student_languages d
             where d.student_id = ogrenci and btrim(coalesce(d.language, '')) <> ''), '[]'::jsonb),
        'projeler', coalesce((
            select jsonb_agg(jsonb_build_object(
                     'baslik',   p.title,
                     'aciklama', nullif(btrim(p.description), ''),
                     'adres',    coalesce(nullif(btrim(p.live_url), ''), nullif(btrim(p.github_url), '')))
                   order by p.sort_order nulls last, p.created_at)
              from public.student_projects p
             where p.student_id = ogrenci and btrim(coalesce(p.title, '')) <> ''), '[]'::jsonb),
        /*
          DENEYİMLER (20261205010000) — başvuru kopyasındaki biçimle aynı:
          ay/yıl 'YYYY-MM', devam edende bitiş null.
        */
        'deneyimler', coalesce((
            select jsonb_agg(jsonb_build_object(
                     'pozisyon',  btrim(e.position),
                     'kurum',     btrim(e.organization),
                     'baslangic', to_char(e.start_year, 'FM0000') || '-' || to_char(e.start_month, 'FM00'),
                     'bitis',     case when e.ongoing then null
                                       else to_char(e.end_year, 'FM0000') || '-' || to_char(e.end_month, 'FM00') end,
                     'devam',     e.ongoing,
                     'aciklama',  nullif(btrim(e.description), ''))
                   order by e.sort_order, e.created_at)
              from public.student_experiences e
             where e.student_id = ogrenci), '[]'::jsonb),
        'guncellendi', sp.updated_at
      )
      from public.profiles pr
      left join public.student_profiles sp on sp.id = pr.id
      where pr.id = ogrenci
    )
  );
end;
$$;
