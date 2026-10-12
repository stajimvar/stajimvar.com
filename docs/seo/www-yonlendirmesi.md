# www yönlendirmesi — yol ve sorgu korunmalı (12 Ekim 2026)

## Ölçülen sorun (canlı, salt okuma)

```
https://www.stajimvar.com/rehber/staj-mulakati?utm_source=x  →  301  https://stajimvar.com
http://www.stajimvar.com/rehber?a=1                           →  301  https://stajimvar.com
http://stajimvar.com/rehber?a=1                               →  301  https://stajimvar.com/rehber?a=1   (doğru)
```

www isteği ana sayfaya düşüyor: yol ve sorgu parametreleri kayboluyor. Yanıtta
Pages ara katmanının başlıkları (`x-onbellek`) yok, yani yönlendirmeyi
**Cloudflare panelindeki bir kural** yapıyor; depodaki kod bu isteği hiç görmüyor.

Sonuç: www'li paylaşılmış ya da dizinlenmiş her derin bağlantı ana sayfaya iniyor
(Google bunu çoğunlukla yumuşak 404 sayar), UTM ölçümü kayboluyor.

## Panelde yapılacak (tek seferlik, depoda değil)

Cloudflare → stajimvar.com alanı → **Rules → Redirect Rules** (ya da eski
**Page Rules / Bulk Redirects**) altında www için tanımlı kuralı bulun.

### Seçenek A — Redirect Rule (dinamik), önerilen

- **Kural adı:** `www → çıplak alan adı (yol + sorgu korunur)`
- **Eşleşme (custom filter expression):**
  `(http.host eq "www.stajimvar.com")`
- **Then:** *Dynamic* redirect
  - **Expression:** `concat("https://stajimvar.com", http.request.uri.path)`
  - **Status code:** `301`
  - **Preserve query string:** **işaretli**
- Aynı www kuralı birden fazla yerde tanımlıysa (Page Rule + Redirect Rule) eskisini
  **devre dışı bırakın**; ilk eşleşen kazanır.

### Seçenek B — Bulk Redirect

- Source URL: `www.stajimvar.com`
- Target URL: `https://stajimvar.com`
- Status: `301`
- **Preserve query string**, **Subpath matching**, **Preserve path suffix**: üçü de açık.

### Doğrulama (panel değişikliğinden sonra)

```
curl -sI "https://www.stajimvar.com/rehber/staj-mulakati?utm_source=x" | grep -i location
# beklenen: location: https://stajimvar.com/rehber/staj-mulakati?utm_source=x
curl -sI "http://www.stajimvar.com/ilan/roadfreight-intern-ad533309" | grep -i location
# beklenen: tek 301 ile https://stajimvar.com/ilan/roadfreight-intern-ad533309
```

## Depodaki yedek

`functions/_middleware.ts` en başta `www.stajimvar.com` isteğini yol ve sorgu
korunarak `https://stajimvar.com` adresine 301'liyor. Panel kuralı bu isteği
bugün Pages'e ulaştırmadığı için **canlı davranışı tek başına düzeltmez**; panel
kuralı kaldırılıp www Pages'e özel alan adı olarak bağlanırsa doğru davranışı
garanti eder.
