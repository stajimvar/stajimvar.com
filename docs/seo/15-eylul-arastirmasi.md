# 15 Eylül 2026 Google görünürlük düşüşü — ayrı araştırma

Bu belge **teknik düzeltmelerden bağımsız** bir araştırma kaydı. Kanıtlanmayan
hiçbir neden sonuç olarak yazılmadı.

## Erişim sınırları

- **Search Console erişimi YOK.** Uygulama tarayıcısında oturum yok, Claude in
  Chrome bağlı değil. Aşağıdaki GSC rakamları önceki rapordan; bu çalışmada
  **doğrulanmadı**: 8–14 Eylül 2.785 gösterim / 55 tıklama → 15–21 Eylül 95 / 3;
  kayıp ilan, burs ve rehber sayfalarında birlikte; en çok kaybeden burs
  rehberinin son taraması 27 Ağustos.
- Sunucu/WAF kayıtlarına erişim yok. Sitenin kendi ziyaret ölçümü
  (`site_olaylari`) 22 Eylül'de başlıyor — düşüşten sonra.
- Wayback Machine'de stajimvar.com için Eylül kaydı yok.

## Bakılan kanıtlar

1. **Git geçmişi (10–21 Eylül, 257 commit).** Site genelinde `noindex`,
   `robots.txt` ya da canonical değişikliği YOK. Çift canonical hatası 1 Eylül'de
   düzeltilmiş. `noindex` 20 Eylül'de ve yalnız ince sayfalara (düşüşten sonra).
2. **Dağıtım kayıtları (338 başarılı koşu: 225 üretim, 113 `dagit.yml`).**
   Her koşunun ön render özeti okundu (`ön render: N sayfa … K ilan`).
   - 13 Eylül 07:17 (üretim) ve 14 Eylül 13:34 (`dagit.yml`) dağıtımları
     "fırsatlar alınamadı: HTTP 504" ile fırsat sayfaları **olmadan** yayına
     çıktı (571 → 459/460 sayfa). Sonraki dağıtım ~14 dk ve ~30 dk içinde
     düzeltti.
   - 11 Eylül'deki "ilanlar alınamadı: HTTP 504" doğrulama işindeydi; yayınlanan
     çıktıda ilan sayısı normal (112).
3. **Resmî Google güncellemeleri** (Search Status Dashboard): Ağustos 2026 spam
   güncellemesi 18–21 Ağustos, Eylül 2026 spam güncellemesi 24 Eylül.
   **15 Eylül ile örtüşen ilan edilmiş güncelleme yok.**
4. **Mevsimsellik:** 2026 KYK burs/kredi başvurusu haberlere göre 12–16 Ekim
   (resmî kaynak değil). Eylül ortasındaki düşüşü KYK takvimi açıklamıyor.

## Sonuç sınıflandırması

**Kanıtlanan**
- 13 ve 14 Eylül'de fırsat/burs sayfaları kısa süre (~14 ve ~30 dk) 404 + noindex
  döndü. Gerçek ama süre kısa; tek başına haftalık %97 düşüşü açıklamaz.
- 12–16 Eylül'de site genelinde dizinlemeyi kapatan bir değişiklik yok.
- Tarihle örtüşen resmî bir Google güncellemesi yok.

**Güçlü ihtimal (kanıtlanmadı)**
- Yüksek değişim hızı: bir haftada 338 dağıtım; başlıklar (15 Eylül fırsat
  başlıkları), ana sayfa düzeni ve iç bağlantılar sürekli değişti.
- 12 Eylül'de ana sayfadaki 147 gizli ilan bağlantısı kaldırıldı; site haritası
  o tarihlerde ilanların bir kısmını bildiriyordu (ilan keşfini zayıflatmış olabilir).
- En çok kaybeden burs rehberinin son taraması 27 Ağustos ise (önceki rapor) kayıp
  o sayfadaki bir değişiklikten değil, sorgu/talep ya da site düzeyi
  değerlendirmeden kaynaklanıyor olabilir.

**Kanıt yok**
- Bursların kapanmasının payı, sorgu/cihaz/ülke/arama görünümü kırılımı,
  81 "keşfedildi – dizine eklenmedi" ve 12 "tarandı – dizine eklenmedi" URL'sinin
  incelenmesi: Search Console erişimi gerektiriyor.

## Erişim sağlanınca yapılacaklar

1. Performans → 1–30 Eylül, sayfa ve sorgu kırılımı; 14 ve 15 Eylül gün bazında.
2. Sayfalar raporu: 404 ve noindex listelerinden kapanmış/eski adresleri aktif
   adreslerden ayırmak.
3. URL denetimi: en çok kaybeden 10 sayfanın son tarama tarihi ve Google'ın
   seçtiği canonical.
4. Ham dağıtım kayıtları: `gh run view <id> --log` (90 gün saklanıyor; Eylül
   koşuları 1–10 Aralık civarında silinir).
