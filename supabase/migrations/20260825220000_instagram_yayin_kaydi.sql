-- Instagram yayın kaydı
--
-- NEDEN VAR
-- ---------
-- Yönetici panelindeki gönderi listesi public/paylasim/setler.json'dan
-- geliyor ve o dosyaya her hafta yeni set ekleniyor. Hiçbir şey çıkmadığı
-- için liste büyüyor: açılır menüde dokuz set birikmiş durumda ve
-- görseller depoda 19 MB yer tutuyor. Daha kötüsü, aylar önce yayınlanmış
-- bir seti yeniden yayınlamak bir tıklama uzakta duruyor.
--
-- Bir setin YAYINLANDIĞI bilgisi şu anda hiçbir yerde tutulmuyor. Bu tablo
-- onu tutuyor: hangi set, hangi gönderi olarak, ne zaman.
--
-- Kayıt küçük tutuluyor — başlık, gönderi kimliği, tarih. Kartların
-- kendisi burada değil; onlar depoda duruyor ve temizliği
-- scripts/paylasim-temizle.mjs yapıyor.
--
-- SİLME YOK
-- ---------
-- Bu tablodaki kayıt, Instagram'daki gönderiyi silmek için KULLANILMAZ.
-- Yayınlanmış gönderi artık hesabın kamuya açık içeriği; onu kaldırmak
-- geri alınamayan, dışarıya dönük bir karar ve o karar bize ait değil.
-- Temizlik yalnızca kendi tarafımızda: panel listesi ve görsel dosyaları.

create table if not exists public.instagram_yayinlari (
  -- setler.json'daki `kod` alanı. Bir set bir kez yayınlanıyor; ikinci
  -- yayın denemesi çakışma verip kazara tekrarı engelliyor.
  set_kodu text primary key,
  baslik text not null,
  gonderi_kimligi text not null,
  yayin_zamani timestamptz not null default now(),
  -- Temizlik betiği bu alanı işaretliyor: kayıt duruyor ama kartlar artık
  -- depoda yok. Aynı seti yeniden yayınlamaya kalkan biri bunu görüyor.
  temizlendi_mi boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.instagram_yayinlari is
  'Yayınlanan Instagram gönderilerinin küçük kaydı. Instagram tarafında silme için KULLANILMAZ.';

create index if not exists instagram_yayinlari_zaman_idx
  on public.instagram_yayinlari (yayin_zamani desc);

alter table public.instagram_yayinlari enable row level security;

-- Yalnızca yönetici görüyor ve yazıyor. Panel bu kayıtları okuyup 24
-- saatten eski yayınları listeden düşürüyor.
drop policy if exists "yonetici instagram yayinlarini gorur" on public.instagram_yayinlari;
create policy "yonetici instagram yayinlarini gorur"
  on public.instagram_yayinlari for select
  to authenticated
  using (public.is_admin());

drop policy if exists "yonetici instagram yayini kaydeder" on public.instagram_yayinlari;
create policy "yonetici instagram yayini kaydeder"
  on public.instagram_yayinlari for insert
  to authenticated
  with check (public.is_admin());

-- Güncelleme yalnızca temizlik işaretini koymak için gerekiyor.
drop policy if exists "yonetici instagram yayinini gunceller" on public.instagram_yayinlari;
create policy "yonetici instagram yayinini gunceller"
  on public.instagram_yayinlari for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Sütun bazlı GRANT: bu şemada tablo erişimi yalnızca RLS'e bırakılmıyor.
grant select (set_kodu, baslik, gonderi_kimligi, yayin_zamani, temizlendi_mi, created_at)
  on public.instagram_yayinlari to authenticated;
grant insert (set_kodu, baslik, gonderi_kimligi, yayin_zamani)
  on public.instagram_yayinlari to authenticated;
grant update (temizlendi_mi) on public.instagram_yayinlari to authenticated;
