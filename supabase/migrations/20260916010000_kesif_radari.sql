-- KEŞİF RADARI — SİNYAL, KANIT DEĞİL
--
-- Kariyer.net, Youthall gibi kaynaklar bizim ilan veritabanımız DEĞİL.
-- Orada bir ilan görmek yalnızca şunu söylüyor: "bu şirkette böyle bir
-- pozisyon olabilir." Kanıt, şirketin RESMÎ kaynağından geliyor.
--
-- Bu yüzden radar sinyalleri canonical `listings` tablosuna YAZILMIYOR.
-- Ayrı tablo, ayrı yaşam döngüsü, ayrı erişim: bir sinyal ancak resmî
-- kaynakta doğrulanıp kalite kapısından geçtikten sonra canonical ilan
-- ADAYI olabiliyor.
--
-- İlk turda yayın KAPALI (gölge modu): radar yalnızca "yayınlanabilirdi"
-- diyor, public akışa hiçbir şey yazmıyor.
create table if not exists public.job_discovery_signals (
  id uuid primary key default gen_random_uuid(),

  -- ------------------------------------------------------ ham sinyal
  --
  -- Kaynaktan alınan TEK ŞEY metadata: şirket adı, başlık, konum ve
  -- keşif adresi. İlan AÇIKLAMASI alınmıyor — toplayıcının metnini
  -- kopyalamak, ilanı oradan üretmek olurdu.
  source text not null,
  source_url text not null,
  company_name_raw text not null,
  company_name_normalized text not null,
  title_raw text not null,
  location_raw text,

  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  -- --------------------------------------------------------- çözüm
  --
  -- Yaşam döngüsü tek yönlü ilerliyor; her aşama bir öncekinin
  -- kanıtına dayanıyor.
  resolution_status text not null default 'new',
  resolution_reason text,
  resolution_confidence text,

  resolved_company_domain text,
  resolved_career_url text,
  resolved_ats text,
  resolved_official_job_url text,

  -- Sinyal mevcut bir canonical ilana çözüldüyse buraya bağlanıyor:
  -- aynı ilan ikinci kez oluşturulmuyor.
  official_listing_id uuid references public.listings(id) on delete set null,

  -- Kalite kapısının (automation/staj_kalitesi.py) verdiği sınıf.
  quality_class text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Aynı kaynaktaki aynı adres tek satır: radar her turda yeniden
  -- keşfettiğinde `last_seen_at` güncelleniyor, yenisi açılmıyor.
  constraint job_discovery_signals_kaynak_tekil unique (source, source_url),

  constraint job_discovery_signals_status_check check (
    resolution_status in (
      'new',                  -- keşfedildi, henüz çözülmedi
      'company_resolved',     -- şirketin resmî alan adı bulundu
      'career_source_found',  -- kariyer sayfası / ATS bulundu
      'official_job_found',   -- aynı ilan resmî kaynakta bulundu
      'verified',             -- kalite kapısından geçti, yayın adayı
      'duplicate',            -- zaten canonical listede var
      'rejected',             -- kalite ya da kapsam dışı
      'unresolved'            -- zincir bir yerde koptu
    )
  ),

  constraint job_discovery_signals_confidence_check check (
    resolution_confidence is null
    or resolution_confidence in ('HIGH', 'MEDIUM', 'LOW')
  )
);

create index if not exists job_discovery_signals_durum_idx
  on public.job_discovery_signals (resolution_status, last_seen_at desc);

create index if not exists job_discovery_signals_sirket_idx
  on public.job_discovery_signals (company_name_normalized);

-- ---------------------------------------------------------------------
-- ERİŞİM: VARSAYILAN RET
-- ---------------------------------------------------------------------
-- Radar verisi öğrenci ya da şirket yüzeyine AÇILMIYOR. Bir şirketin
-- başka şirketlerde hangi pozisyonları aradığımızı görmesi için sebep
-- yok; öğrenci için de bu doğrulanmamış bir sinyal.
--
-- Politika yok = erişim yok. Yalnızca yönetici okuyabiliyor; yazan taraf
-- `service_role` (otomasyon), o da RLS'e tabi değil.
alter table public.job_discovery_signals enable row level security;

revoke all on public.job_discovery_signals from anon, authenticated;

drop policy if exists "yonetici radar sinyallerini okur" on public.job_discovery_signals;
create policy "yonetici radar sinyallerini okur" on public.job_discovery_signals
  for select using (public.is_admin());

grant select on public.job_discovery_signals to authenticated;

create or replace function public.touch_job_discovery_signals()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists job_discovery_signals_touch on public.job_discovery_signals;
create trigger job_discovery_signals_touch
  before update on public.job_discovery_signals
  for each row execute function public.touch_job_discovery_signals();
