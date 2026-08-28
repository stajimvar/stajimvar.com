# Keşfet Etkinlik-Seans ve Tarih Yaşam Döngüsü Tasarımı

## Amaç

Keşfet’in devam eden ve çok seanslı etkinlikleri doğru göstermesini, tarihi geçen kayıtları sorgu anında gizlemesini ve geçici kaynak hatalarında etkinlikleri erken yayından kaldırmamasını sağlamak.

Bu aşama yeni kaynak sayısını artırmaz. Önce mevcut KÜLTÜR.İSTANBUL akışını güvenilir etkinlik-seans modeline geçirir.

## Yaklaşım

Geriye uyumlu, eklemeli geçiş kullanılacak. `discover_events` etkinliğin ortak başlık, açıklama, görsel, organizatör ve fiyat bilgisini taşımaya devam edecek. Yeni `discover_event_occurrences` tablosu her tarih veya seansı ayrı kayıt olarak tutacak.

Mevcut `starts_at` ve `ends_at` sütunları geçiş boyunca korunacak. Public sorgu yeni seans tablosunu esas alacak; eski yönetim ve detay akışları kademeli olarak yeni modele geçirilecek. Böylece canlı veriyi tek migration’da yeniden kurma riski alınmayacak.

## Veri modeli

`discover_event_occurrences` alanları:

- `id uuid primary key`
- `event_id uuid not null references discover_events(id) on delete cascade`
- `source_occurrence_id text`
- `starts_at timestamptz not null`
- `ends_at timestamptz`
- `time_precision text not null`: `exact`, `date_only`, `recurring`, `ongoing`
- `status text not null`: `scheduled`, `cancelled`, `postponed`, `archived`
- `last_seen_at timestamptz`
- `consecutive_missing_runs integer not null default 0`
- `cancelled_at timestamptz`
- `postponed_at timestamptz`
- `created_at` ve `updated_at`

Kaynağın kalıcı seans kimliği varsa `(event_id, source_occurrence_id)` benzersiz olur. Yoksa etkinlik, normalize başlangıç, bitiş ve zaman hassasiyetinden deterministik bir seans parmak izi üretilir.

## Migration ve geriye uyumluluk

Migration mevcut her `discover_events` kaydı için bir başlangıç seansı oluşturur:

- Saat gerçek biçimde doğrulanmışsa `exact`.
- Kaynak yalnız tarih veriyorsa `date_only`.
- Uzun süre açık sergi veya programsa ve kaynak böyle işaretliyorsa `ongoing`.
- Tekrarlanan program açıkça belirtilmişse `recurring`.

Mevcut kayıtlardan zaman hassasiyeti güvenle çıkarılamıyorsa `exact` varsayılmaz; kayıt `date_only` olarak işaretlenip yönetici incelemesine bırakılır. Migration tekrar çalıştırıldığında duplicate seans üretmez.

## Public görünürlük ve tarih kesişimi

Bir etkinlik listede yalnız şu koşullarda görünür:

- Ana kayıt `published`.
- En az bir seans `scheduled`.
- Seansın bitişi bilinmiyorsa başlangıcı henüz geçmemiş olmalı; bitişi biliniyorsa `ends_at >= now()` olmalı.

Filtre aralığıyla kesişim kuralı:

`occurrence.starts_at < filter_end AND coalesce(occurrence.ends_at, occurrence.starts_at) >= filter_start`

“Bugün”, “Bu hafta” ve “Bu ay” aynı kuralı kullanır. Aralık sınırları Europe/Istanbul takviminde hesaplanır; sorguya ISO zaman olarak gönderilir.

Aynı etkinliğin birden fazla eşleşen seansı varsa kart yalnız bir kez gösterilir. Kartta şu anda devam eden seans, yoksa en yakın gelecek seans kullanılır.

## Saat gösterimi

- `exact`: tarih ve saat gösterilir.
- `date_only`: yalnız tarih gösterilir; `00:00` yazılmaz.
- `ongoing`: tarih aralığı ve “Devam ediyor” etiketi gösterilir.
- `recurring`: sıradaki seans gösterilir; detayda diğer aktif seanslar listelenir.

## Import ve kayıp kayıt güvenliği

Importer etkinlik ve seansı ayrı kimliklerle eşler. Başarılı bir kaynak taramasında görülen seansın `last_seen_at` alanı güncellenir ve `consecutive_missing_runs` sıfırlanır.

Bir seans yalnız başarılı ve eksiksiz tamamlanmış kaynak taramalarında kayıp sayılır:

1. İlk kayıp: sayaç 1, yayın korunur.
2. İkinci kayıp: sayaç 2, yayın korunur ve yeniden kontrol işareti konur.
3. Üçüncü kayıp: sayaç 3, seans `archived` olur.

Kaynak taraması hata veya kısmi sonuçla bittiyse kayıp sayaçları artırılmaz. Resmî kaynak açıkça iptal sinyali verirse seans hemen `cancelled`; erteleme sinyali verirse `postponed` olur.

Ana etkinlik, yayımlanabilir aktif seansı kalmadığında listeden düşer fakat silinmez. Detay sayfası korunur ve “Etkinlik sona erdi” veya ilgili durum mesajını gösterir.

## Importer geçişi

`EventCandidate` tek tarih yerine bir veya daha fazla occurrence taşıyabilecek biçimde genişletilir. Mevcut bağlayıcı geriye uyumluluk için tek tarih çiftini tek occurrence’a dönüştürür.

Repository işlemi şu sırayı izler:

1. Ana etkinliği kaynak kimliği, kanonik URL ve içerik kimliğiyle bul veya oluştur.
2. Seansları kaynak seans kimliği ya da deterministik parmak iziyle upsert et.
3. Yalnız başarılı tam tarama sonunda görülmeyen seansların kayıp sayısını artır.
4. Süresi geçen seansları arşivle.
5. Run metriklerine bulunan, eklenen, güncellenen, değişmeyen, kayıp ve arşivlenen seans sayılarını yaz.

## API ve arayüz

Public liste için güvenli bir RPC veya view kullanılacak. Sonuç, mevcut `DiscoverEvent` alanlarına ek olarak seçilmiş seansın:

- `occurrenceId`
- `startsAt`
- `endsAt`
- `timePrecision`

alanlarını döndürür. Böylece kart bileşenleri büyük ölçüde korunur.

Detay sorgusu etkinliğin tüm aktif seanslarını ve geçmiş durumunu döndürür. Admin listesi occurrence sayısını ve inceleme gerektiren zaman hassasiyetini gösterecek; bu aşamada ayrı kapsamlı seans editörü eklenmeyecek.

## Güvenlik

Anonim ziyaretçiler yalnız yayındaki etkinliklerin aktif seanslarını okuyabilir. Occurrence tablosuna doğrudan anonim yazma izni verilmez. Yönetici değişiklikleri mevcut `is_admin()` sınırındaki RPC’lerle, importer değişiklikleri service role ile yapılır.

## Test ve doğrulama

- Devam eden etkinlik “Bugün”, “Bu hafta” ve “Bu ay” filtreleriyle eşleşir.
- Aralık dışındaki seans eşleşmez.
- Aynı etkinliğin birden fazla seansı tek kart üretir ve doğru sıradaki seansı seçer.
- `date_only` değerinde `00:00` görünmez.
- Geçmiş seans public listede görünmez; detay kaydı erişilebilir kalır.
- Başarısız/kısmi tarama kayıp sayısını artırmaz.
- Üç ardışık başarılı taramada görülmeyen seans arşivlenir.
- Açık iptal sinyali anında uygulanır.
- Migration mevcut etkinlikleri duplicate oluşturmadan geriye dönük taşır.
- Type-check, ilgili Node/Python testleri ve production build çalıştırılır.
- Canlı 375, 768 ve 1440 piksel görünümü ile tarih filtreleri doğrulanır.

## Bu aşamanın dışında

- Yeni 10 kaynak bağlayıcısı
- `venues` ve `organizers` tablolarına tam normalizasyon
- Dinamik ana başlık ve gelişmiş koleksiyon sistemi
- Kaydetme, popülerlik ve kampüse yakınlık özellikleri
- Queue veya Cloudflare Workflows

Bu işler occurrence temeli production’da doğrulandıktan sonra ayrı aşamalarda ele alınacaktır.
