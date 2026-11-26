# Veri İhlali Müdahale Planı

> **Durum:** Taslak (26 Kasım 2026). Hukuki inceleme yapılmadı.
> Dayanak: KVKK m.12/5 ve Kişisel Verileri Koruma Kurulu'nun 2019/10
> sayılı kararı (ihlalin öğrenilmesinden itibaren **en geç 72 saat**
> içinde Kurul'a bildirim).
> Gizlilik politikamız bu taahhüdü kullanıcıya zaten veriyor
> ("en geç 72 saat içinde Kurul'a bildiririz ve etkilenen kullanıcılara
> e-posta ile haber veririz").

## 1. İhlal nedir

Kişisel verinin yetkisiz kişilerce ele geçirilmesi, görülmesi,
değiştirilmesi, silinmesi ya da erişilemez hâle gelmesi. Örnekler:

- Yetkisiz birinin başka bir öğrencinin özgeçmişine/başvurusuna erişmesi
- Gizli anahtarların (Supabase service_role, Resend, GitHub sırları)
  sızması
- Yanlış kişiye e-posta gönderilmesi (ör. bir öğrencinin bilgisi başka
  şirkete)
- Bir hata yüzünden erişim kuralının açılması (ör. 25 Kasım'da arayüzdeki
  CV kapısının birkaç saat düşmesi — o olayda veritabanı kuralı ayrıca
  doğrulanmış şirketle sınırlıydı; bkz. ders kaydı)

## 2. İlk 1 saat — durdur

1. **Akışı durdur:** Hatalı değişiklik varsa son sağlam sürüme dön
   (GitHub'da geri alma PR'ı → CI yayınlar). Acilse Cloudflare Pages'ta
   önceki yayını "rollback" et.
2. **Sızan anahtarı iptal et ve yenile:**
   - Supabase: Project Settings → API → service_role / JWT anahtarını
     döndür (rotate). Ardından GitHub sırlarını ve Cloudflare ortam
     değişkenlerini güncelle.
   - Resend: API anahtarını sil, yenisini oluştur.
   - GitHub: sızan token'ı iptal et.
   - Supabase erişim belirteci (`sbp_`): Account → Access Tokens → iptal.
3. **Delilleri koru:** Supabase günlükleri (Logs), Cloudflare analitiği,
   ilgili SQL çıktıları ekran görüntüsüyle ve zamanla kaydedilir.
   Hiçbir günlük silinmez.

## 3. İlk 24 saat — değerlendir

Şu soruların cevabı yazılı olarak kayda geçer:

| Soru | Cevap |
|---|---|
| İhlal ne zaman başladı, ne zaman fark edildi? | |
| Hangi veri kategorileri etkilendi? (envanter 01'deki numaralarla) | |
| Kaç kişi etkilendi? (SQL ile ölçülür, tahmin edilmez) | |
| Veri kime/nereye ulaştı? | |
| Özel nitelikli veri var mı? (normalde işlemiyoruz) | |
| Kişiler için olası sonuç ne? | |
| Ne yapıldı, ne yapılacak? | |

## 4. 72 saat içinde — bildir

**Kurul'a bildirim:** kvkk.gov.tr → "Veri İhlali Bildirimi" formu
(Kurul'un yayımladığı Kişisel Veri İhlal Bildirim Formu). Bilgilerin
tamamı 72 saatte toplanamadıysa eldekiyle bildirilir, gerisi
gecikmeksizin tamamlanır; gecikmenin gerekçesi yazılır.

**Kişilere bildirim:** Etkilenen kullanıcılara makul en kısa sürede
e-posta. İçerik: ne oldu, hangi verileri etkiledi, ne yaptık, kendileri
ne yapmalı (ör. şifre değiştirme), iletişim adresi. Şablon:

```
Konu: StajımVar hesabınızla ilgili güvenlik bildirimi

Merhaba,

[TARİH] tarihinde [NE OLDUĞU — tek cümle, sade]. Bu olaydan hesabınızdaki
[ETKİLENEN VERİLER] etkilenmiş olabilir. [ETKİLENMEYENLER, ör. şifreniz
etkilenmedi].

Yaptıklarımız: [DURDURMA, ANAHTAR YENİLEME, DÜZELTME].
Sizin yapmanızı önerdiğimiz: [VARSA].

Kişisel Verileri Koruma Kurulu'na bildirim yaptık. Sorularınız için
iletisim@stajimvar.com adresine yazabilirsiniz.

Mustafa Oğulcan Doğan
StajımVar
```

Etkilenen bir şirket ya da üniversite varsa onlara da ayrıca yazılır.

## 5. Sonrası — öğren

- Kök neden yazılır; aynı hatayı yakalayacak **otomatik test** eklenir
  (bkz. `scripts/sql/rls-regresyon-testleri.sql`).
- Olay bu dosyanın sonundaki kayda işlenir. **Kayıt, bildirim yapılmasa
  bile tutulur** (Kurul denetiminde istenebilir).

## 6. İletişim listesi

| Kim | Nasıl |
|---|---|
| Veri sorumlusu | Mustafa Oğulcan Doğan — mustafa@stajimvar.com |
| KVKK Kurumu | kvkk.gov.tr (ihlal bildirim formu), ALO 198 |
| Supabase destek | supabase.com/dashboard/support |
| Cloudflare destek | dash.cloudflare.com → Support |
| Avukat | (şirket kurulunca eklenecek) |

## 7. Olay kaydı

| Tarih | Olay | Etkilenen | Kurul'a bildirildi mi | Kök neden ve önlem |
|---|---|---|---|---|
| 25.11.2026 | İşveren panelinde "CV'yi aç" düğmesi taşınırken paylaşım koşulu arayüzde düştü (PR #471). Birkaç saat boyunca doğrulanmış şirket, kendi ilanına başvuran ama profil paylaşımı açık olmayan adayın CV düğmesini görebildi. | Ölçüm: CV'li 4 başvurunun 4'ünde paylaşım onayı açıktı → onaysız bir CV'nin açılmış olması mümkün değil | Hayır — onaysız erişim gerçekleşmedi | Arayüz düzeltildi (#472); kural veritabanına da eklendi (#473) ve otomatik testle sabitlendi |
