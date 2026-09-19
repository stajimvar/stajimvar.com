-- BAĞLANTIYI KABUL ETMEK ARTIK ALAN İSTEMİYOR
--
-- ÖLÇÜLEN TUTARSIZLIK (canlı, 19 Eylül 2026)
-- ------------------------------------------
-- 20260926040000 ("üç ayrı kavram") profil görünürlüğünden alan şartını
-- KASITLI olarak kaldırdı: "PROFİL — giriş yapmış herkes görebilir…
-- Alan/sektör şartı YOK." `sosyal_gorunur` o göçte yeniden yazıldı ve
-- gövdesinde sector_id hiç geçmiyor.
--
-- Bağlantı isteğinin INSERT politikası (`ayni sektore istek gonderir`)
-- `sosyal_gorunur`a dayanıyor; yani istek GÖNDERMEK o günden beri alan
-- şartsız çalışıyor. Ama isteği KABUL etme yolundaki geçiş tetikleyicisi
-- güncellenmedi: `baglanti_gecis_kontrol` hâlâ
-- `sosyal_gizli.ayni_sektorde(karsi_taraf)` istiyor ve sağlanmazsa
-- 42501 fırlatıyor.
--
-- Sonuç kullanıcı bildirimiyle canlıda ölçüldü: istek gidiyor, karşı
-- tarafa bildirim düşüyor, "Kabul et" düğmesi çiziliyor, basınca "Bu
-- istek artık geçerli değil." diyor. Ölçüm anında canlıda BEKLEYEN İKİ
-- İSTEĞİN İKİSİ DE bu yüzden kabul edilemez durumdaydı; yayındaki 21
-- öğrenci profilinin 16'sının alanı yok, çünkü aynı göç alansız
-- yayımlamayı serbest bıraktı.
--
-- Yani burada kaldırılan bir KURAL değil, 26 Eylül'de verilmiş kararın
-- ulaşmadığı tek koşul. ENGEL KONTROLÜ DURUYOR: engellediğin kişiyle
-- bağlantı durumun yine değiştirilemiyor.
--
-- Alan, kaldırıldığı yerde değil kaldığı yerde çalışmaya devam ediyor:
-- keşif ve öneriler, akış ve `alan-toplulugum` kitlesi
-- (`community_members`, 20260926030000) alan bazlı kalıyor.
--
-- Gövdenin geri kalanı 20260922010000'deki son sürümün AYNISI; yalnız
-- alan koşulu çıktı ve hata metni ona göre daraldı.

create or replace function public.baglanti_gecis_kontrol()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  karsi_taraf uuid;
begin
  /* ---------------------------------------------------------- INSERT */
  if tg_op = 'INSERT' then
    if new.durum <> 'bekliyor' then
      raise exception 'Bağlantı yalnız "bekliyor" durumunda açılabilir.'
        using errcode = '42501';
    end if;
    /* İstemci ne gönderirse göndersin: yeni istekte yanıt zamanı yok. */
    new.responded_at := null;
    return new;
  end if;

  /* ---------------------------------------------------------- UPDATE */

  /*
    KİMLİK ALANLARI DEĞİŞMEZ

    Bu olmasaydı kullanıcı kendi satırındaki addressee_id'yi başka birine
    çevirip o kişiyle "kabul edilmiş" bir bağlantı uydurabilirdi.
  */
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id then
    raise exception 'Bağlantının tarafları değiştirilemez.'
      using errcode = '42501';
  end if;

  /*
    OTURUMSUZ ÇAĞRI: aktöre bağlı kurallar değerlendirilemiyor. Bu yola
    yalnız service_role, göç betikleri ve bakım işleri düşüyor; hepsi
    RLS'i zaten atlıyor, yani burada bir ayrıcalık kazanılmıyor. Kimlik
    değişmezliği yukarıda, bu daldan ÖNCE uygulanıyor.
  */
  if auth.uid() is null then
    return new;
  end if;

  karsi_taraf := case when auth.uid() = old.requester_id
                      then old.addressee_id else old.requester_id end;

  /*
    ENGEL HER GEÇİŞTE YENİDEN OKUNUYOR: ilk istek anında RLS bakıyor ama
    araya engel girebilir. ALAN KOŞULU BURADAN KALKTI (gerekçe dosya
    başlığında) — istek göndermek zaten alan şartsızken kabul etmeyi
    şarta bağlamak, gönderilebilen ama kabul edilemeyen istek üretiyordu.
  */
  if sosyal_gizli.engelli_mi(karsi_taraf) then
    raise exception 'Engel varken bağlantı değiştirilemez.'
      using errcode = '42501';
  end if;

  if new.durum is not distinct from old.durum then
    /* Durum dışı güncelleme: yanıt zamanı istemciyle oynatılamaz. */
    new.responded_at := old.responded_at;
    return new;
  end if;

  /* ------------------------------------------ red → bekliyor (yeniden dene) */
  if old.durum = 'red' and new.durum = 'bekliyor' then
    if auth.uid() is distinct from old.requester_id then
      raise exception 'Reddedilen isteği yalnız gönderen yeniden başlatabilir.'
        using errcode = '42501';
    end if;

    /*
      Süre ESKİ satırın yanıt zamanından ölçülüyor: istemci `responded_at`
      alanına eski bir tarih yazarak süreyi atlayamıyor.
    */
    if old.responded_at is null
       or now() - old.responded_at < public.baglanti_red_bekleme() then
      raise exception 'Reddedilen isteği yeniden göndermek için bekleme süresi dolmadı.'
        using errcode = '42501';
    end if;

    new.responded_at := null;
    return new;
  end if;

  /* ------------------------------------------------- bekliyor → kabul/red */
  if old.durum <> 'bekliyor' then
    raise exception 'Yalnız bekleyen bir istek kabul veya reddedilebilir.'
      using errcode = '42501';
  end if;

  if new.durum not in ('kabul', 'red') then
    raise exception 'Geçersiz bağlantı durumu geçişi.'
      using errcode = '42501';
  end if;

  /*
    KABUL VE RED YALNIZ İSTEĞİ ALANA AİT. Gönderen kendi isteğini kabul
    edemiyor; simetrik bağlantı modelinin tamamı buna dayanıyor.
  */
  if auth.uid() is distinct from old.addressee_id then
    raise exception 'Bir isteği yalnız isteği alan kullanıcı yanıtlayabilir.'
      using errcode = '42501';
  end if;

  new.responded_at := now();
  return new;
end;
$$;

/*
  `sosyal_gizli.ayni_sektorde` bu göçten sonra ŞEMADA HİÇBİR YERDEN
  ÇAĞRILMIYOR (ölçüldü: onu gövdesinde geçiren başka fonksiyon ve ona
  dayanan politika yok). Silinmiyor — silmek ayrı bir karar ve bu göçün
  konusu değil; ama okuyan biri onu yürürlükteki bir kural sanmasın diye
  işaretleniyor. Alan topluluğu üyeliği ayrı bir yoldan (community_members,
  20260926030000) çalışıyor.
*/
comment on function sosyal_gizli.ayni_sektorde(uuid) is
  'KULLANILMIYOR (19 Eylül 2026). Bağlantı geçiş kuralından çıkarıldı; şemada çağıranı kalmadı. Alan topluluğu üyeliği için public.community_members kullanılıyor.';
