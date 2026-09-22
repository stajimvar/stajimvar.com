-- YÖNETİM ÖZETİ: ANON İZNİ KALDIRILDI
--
-- Bir önceki göç `revoke all on function ... from public` yazıyordu; bu,
-- Supabase'in yeni fonksiyonlara uyguladığı `anon` ve `authenticated`
-- varsayılan EXECUTE iznini KALDIRMIYOR. O izinler PUBLIC üzerinden değil,
-- rollere doğrudan veriliyor. Sonuçta `anon` da fonksiyonu çağırabiliyordu.
--
-- Veri sızmıyordu: gövdenin ilk satırındaki `is_admin()` kapısı `anon`
-- çağrısını 42501 ile kesiyor ve hiçbir sayı dönmüyor (üretimde `set role
-- anon` ile denendi). Yine de çağrılabilir olmakla çağrılmaması gereken
-- arasındaki farkı kapatmak gerekiyor: kapı tek savunma hattı olmamalı.

revoke execute on function public.yonetim_ozet() from anon;

comment on function public.yonetim_ozet() is
  'Yönetim panelinin özet sayıları. Yalnız yönetici çağırabilir; sütun izni ve RLS sunucuda çözülür. anon çağıramaz.';
