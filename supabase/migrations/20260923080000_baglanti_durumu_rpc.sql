-- SOSYAL KATMAN C AŞAMASI — BAĞLANTI DURUMU
--
-- Arayüz bir profilde hangi eylemi çizeceğini tek sorguda bilmeli.
-- `connections` tablosu zaten okunabiliyor (taraf olana açık politika),
-- ama iki şey eksikti:
--
--   · YÖN — "ben mi gönderdim" sorusu düğmenin etiketini belirliyor
--     ("İstek gönderildi" / "Sana istek gönderdi").
--   · YENİDEN DENEME ANI — reddedilmiş bir istekte 30 günlük sürenin ne
--     zaman dolacağı. Bunu istemcide hesaplamak, istemci saatine
--     güvenmek olurdu; süre veritabanı saatiyle ölçülüyor.
--
-- TAKİPÇİ / TAKİP EDİLEN YOK. Tek ilişki karşılıklı bağlantı ve tek
-- satır. `ben_mi_gonderdim` bir hiyerarşi değil, yalnız isteğin yönü.
--
-- GÖRÜNMEYEN HEDEF İÇİN SIFIR SATIR
-- ---------------------------------
-- Fonksiyon `sosyal_gorunur` kapısından geçiyor. "Bağlantı yok" ile
-- "bu profili göremiyorsun" farklı cevaplar: ikincisi sayı ya da durum
-- döndürmüyor, HİÇ SATIR döndürmüyor. `sosyal_sayaclar` ile aynı kalıp.
-- Arayüz de sıfır satırda bağlantı düğmesini DOM'a hiç koymuyor —
-- gizlenmiş bir düğme, profilin var olduğunu sızdırırdı.

create or replace function public.baglanti_durumu(hedef uuid)
returns table (
  durum text,
  ben_mi_gonderdim boolean,
  yeniden_deneme_ani timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(c.durum, 'yok') as durum,
    case when c.requester_id is null then null
         else c.requester_id = auth.uid() end as ben_mi_gonderdim,
    /*
      Yeniden deneme anı YALNIZ isteği gönderene ve yalnız reddedilmiş
      satırda anlamlı: reddeden tarafın beklemesi gereken bir süre yok,
      onun yolu `baglanti_yeniden_baslat()` ile kendi isteğini açmak.
    */
    case
      when c.durum = 'red'
       and c.requester_id = auth.uid()
       and c.responded_at is not null
      then c.responded_at + public.baglanti_red_bekleme()
      else null
    end as yeniden_deneme_ani
  from (select 1) as _
  left join public.connections c
    on (c.requester_id = auth.uid() and c.addressee_id = hedef)
    or (c.requester_id = hedef and c.addressee_id = auth.uid())
  where sosyal_gizli.sosyal_gorunur(hedef)
$$;

revoke all on function public.baglanti_durumu(uuid) from public;
grant execute on function public.baglanti_durumu(uuid) to authenticated;
