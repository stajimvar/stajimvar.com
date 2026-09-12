# D aşaması — fotoğraf paylaşımı ve profil fotoğrafı (tasarım)

Tarih: 2026-09-10
Önceki: A (veri modeli + RLS), B (profil), C (bağlantı + bölüm–alan + kitle)
Durum: TASARIM

---

## 1. Depoda hazır olanlar (ölçüldü, yeniden yazılmayacak)

| Var olan | Nerede | D'de rolü |
|---|---|---|
| `posts` (id, author_id, aciklama ≤2200, archived_at, **kitle**) | A + C | D yalnız iki kolon ekler |
| `post_media` (post_id, **sira 1..10**, storage_path, genislik, yukseklik, alt, PK(post_id,sira)) | A | Sıra ve 1–10 sınırı ZATEN şemada |
| `social_profiles.avatar_path` | A | Profil fotoğrafının yolu; kolon eklemeye gerek yok |
| `sosyal_gizli.paylasim_gorunur(post_id)` | C | **Tek görünürlük kapısı**; D bunu Storage'a da uygular |
| `sosyal_gizli.sosyal_gorunur(profil)` | B/C | Alan + topluluk + engel kapısı |

> D'nin işi yeni bir görünürlük kuralı ICAT ETMEK DEĞİL; C'de kurulan tek
> kapıyı **Storage dosyalarına da** uygulamak ve yükleme bütünlüğünü
> sağlamak.

---

## 2. Kovalar — private, iki adet

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('sosyal-paylasim', 'sosyal-paylasim', false, 5242880,
     array['image/jpeg','image/png','image/webp']),
  ('sosyal-avatar',   'sosyal-avatar',   false, 2097152,
     array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
```

- **`public = false`.** Kalıcı herkese açık URL yok; istemci imzalı URL
  (`createSignedUrl`) alır ve o URL de RLS'ten geçer.
- **Mevcut `avatars` kovası KULLANILMIYOR** — o `public = true`. Sosyal
  katmanın profil fotoğrafı alan/topluluk kuralına tabi; herkese açık bir
  kovaya koymak o kuralı ilk günden delerdi.
- MIME listesi kovada; **sunucu tarafı doğrulama uzantıya değil
  `allowed_mime_types`'a dayanıyor.** GIF, SVG, video kovaya hiç giremez.
- Boyut sınırı açık: paylaşım 5 MB, avatar 2 MB.

### 2.1 Yol şeması — tahmin edilemez ve sahiplik taşır

```
sosyal-paylasim/<author_uuid>/<post_uuid>/<rastgele>.<uzanti>
sosyal-avatar/<profil_uuid>/<rastgele>.<uzanti>
```

- **Birinci klasör = `auth.uid()`** → sahiplik `storage.foldername(name)[1]`
  ile politikada zorlanabiliyor (depodaki `cvs` kovasının kalıbı).
- **İkinci klasör = post kimliği** → okuma politikası dosyadan post'a
  tek adımda ulaşıp `paylasim_gorunur()` çağırabiliyor.
- **Dosya adı rastgele** (istemci `crypto.randomUUID()`); kullanıcının
  dosya adı yola HİÇ girmiyor. Böylece ne yol tahmin edilebiliyor ne de
  dosya adı üzerinden bilgi (ad, tarih, konum) sızıyor.

---

## 3. Storage RLS

Yardımcılar `sosyal_gizli` şemasında (PostgREST'e kapalı — B güvenlik
düzeltmelerinin kalıbı).

```sql
sosyal_gizli.paylasim_dosyasi_gorunur(nesne_adi text) returns boolean
  -- yoldan post kimliğini okur, sosyal_gizli.paylasim_gorunur(post) döner
  -- yol beklenen biçimde değilse FALSE (fail-closed)

sosyal_gizli.avatar_dosyasi_gorunur(nesne_adi text) returns boolean
  -- yoldan profil kimliğini okur; sahibi ya da sosyal_gorunur(profil)
```

| İşlem | Kural |
|---|---|
| INSERT | `(storage.foldername(name))[1] = auth.uid()::text` — yalnız kendi klasörü |
| UPDATE | aynı sahiplik kuralı, hem `using` hem `with check` |
| DELETE | aynı sahiplik kuralı |
| SELECT (paylaşım) | `paylasim_dosyasi_gorunur(name)` |
| SELECT (avatar) | `avatar_dosyasi_gorunur(name)` |

**Sonuç:** okuma yetkisi paylaşımın gerçek kitlesiyle **aynı fonksiyondan**
geliyor. Kitle kuralı değişirse dosya erişimi de kendiliğinden değişiyor;
iki yerde ayrışamıyor. Arşivlenmiş paylaşımın dosyası da kendiliğinden
kapanıyor, çünkü `paylasim_gorunur` arşivi zaten eliyor.

`anon` rolüne bu iki kovada hiçbir yetki verilmiyor.

---

## 4. Yükleme bütünlüğü — taslak → hazır

`posts`'a iki kolon:

```sql
alter table public.posts
  add column if not exists durum text not null default 'taslak'
    check (durum in ('taslak','hazir')),
  add column if not exists istemci_anahtari uuid;

create unique index if not exists posts_istemci_anahtari_key
  on public.posts (author_id, istemci_anahtari)
  where istemci_anahtari is not null;
```

**`default 'taslak'` güvenli varsayılan:** kolon eklendiğinde var olan
satırlar taslağa düşerdi — bu yanlış olurdu, çünkü onlar zaten yayımlanmış
sayılıyor. Bu yüzden göç, **var olan satırları açıkça `hazir` yapar**
(bugün üretimde sosyal tablo yok; kural yine de göçün kendi güvencesi).

`paylasim_gorunur` genişliyor: yazar dışındaki herkes için
**`p.durum = 'hazir'` şartı**. Yazar kendi taslağını görür (oluşturma
ekranı çalışsın diye), başkası göremez → yarım yükleme görünür paylaşım
bırakmıyor.

### 4.1 Üç RPC

```
sosyal_paylasim_baslat(p_istemci_anahtari uuid, p_aciklama text, p_kitle text)
  → taslak post satırı açar, id döner
  · topluluğa katılmamış (sosyal_gorunur kendine false) → hata
  · AYNI ANAHTAR ikinci kez gelirse YENİ SATIR AÇMAZ, mevcut taslağı döner
    (çift tıklama = tek paylaşım)

sosyal_paylasim_tamamla(p_post_id uuid, p_medya jsonb)
  · yalnız sahibi, yalnız 'taslak' durumundaki satır
  · p_medya: [{sira, storage_path, genislik, yukseklik, alt}] — 1..10
  · 0 ya da 11 öğe → hata
  · storage_path'in bu post'un klasörüne ait olduğu SUNUCUDA doğrulanır
  · post_media satırlarını yazar ve durum := 'hazir'  (tek işlem, atomik)

sosyal_paylasim_iptal(p_post_id uuid)
  · yalnız sahibi, yalnız 'taslak'
  · satırı siler (post_media cascade ile gider)
  · Storage dosyalarını istemci kendi klasöründen siler (DELETE politikası
    zaten yalnız kendi klasörüne izin veriyor) → temizleme başkasının
    dosyasına dokunamaz
```

Arşivleme mevcut `archived_at` üzerinden; **kalıcı silme RPC'si ve arayüzü
YOK.**

---

## 5. İstemci tarafı kuralları (ajanın işi)

- Seçim, önizleme, sıralama, yüklemeden önce kaldırma.
- **Tarayıcıda küçültme/optimizasyon:** canvas ile yeniden çizim. Canvas'a
  yeniden çizmek EXIF'i (konum dahil) kendiliğinden düşürür — ayrı bir
  metadata temizleyici bağımlılığı gerekmiyor.
- Uzun kenar en fazla 1600 px, JPEG/WebP kalite ~0.85.
- Tür kontrolü hem seçimde hem yüklemede; **uzantıya değil `File.type` ve
  kovanın `allowed_mime_types`'ına** güveniliyor.
- Açıklama sınırı 2200 (şemadaki `check` ile aynı).
- Kitle seçici: **"Bağlantılarım" varsayılan**, "Alan topluluğum" ikinci.
  "takip" kelimesi hiçbir yerde geçmiyor.
- Gönderim sırasında düğme kilitli, ilerleme görünür; başarı yalnız
  `tamamla` RPC'si döndükten sonra.
- **Yeni bağımlılık YOK** — canvas ve `crypto.randomUUID()` tarayıcıda
  hazır. `package.json` değişmiyor.

---

## 6. Bu aşamada YAPILMAYACAKLAR

Video · yorum · mesaj · hikâye · öne çıkanlar · bildirim merkezi ·
beğeni/kaydetme ARAYÜZÜ · kalıcı silme · moderasyon · canlı yayın.

Mevcut `post_likes` / `post_saves` veri altyapısına **dokunulmuyor**;
arayüzü E'ye kalıyor.

---

## 7. Ölçülecek güvenlik sınırları (her biri BİR gerçek yerel test)

1. Geçerli yükleme + finalize başarılı; sıra korunuyor.
2. 0 dosya ve 11 dosya reddediliyor; geçersiz MIME kovaya giremiyor.
3. Başkasının klasörüne INSERT/UPDATE/DELETE reddediliyor.
4. `baglantilarim`: kabul edilmiş bağlantı görüyor, bağlantısız aynı alan
   **dosyayı da** göremiyor.
5. `alan-toplulugum`: aynı alandan katılmış öğrenci görüyor.
6. Farklı alan: iki kitlede de ne satırı ne dosyayı görüyor.
7. Engel: iki yönde de erişim yok.
8. Taslak (yarım yükleme) başkasına görünmüyor.
9. Arşiv sonrası ziyaretçi dosyayı okuyamıyor.
10. Profil fotoğrafını yalnız sahibi değiştirebiliyor.
11. Aynı istemci anahtarı iki kez → tek paylaşım.
