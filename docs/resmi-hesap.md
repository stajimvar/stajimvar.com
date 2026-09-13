# StajımVar resmî hesabı

Yeni kullanıcının akışı bomboş açılıyordu: paylaşımlar bağlantılardan ve alan
topluluğundan geliyor, ikisi de ilk gün yok. Resmî hesap bu boşluğu dolduruyor.

## Karar: sahte bağlantı değil, üçüncü bir kitle

İlk akla gelen çözüm, her yeni hesaba resmî hesapla bir `connections` satırı
açmaktı. Üç yerde yanlış olurdu:

| | neden |
|---|---|
| Bağlantı sayacı | Sayaç `connections` tablosunu sayıyor. Kullanıcı hiç kimseyle bağlantı kurmamışken profilinde "1 bağlantı" yazardı. |
| Karşılıklılık | Bağlantı bu üründe simetrik ve karşılıklı onaya bağlı. Kimsenin onaylamadığı bir satır o tanımı bozar. |
| Geriye dönüklük | Mevcut her kullanıcı için satır açmak gerekirdi; satır açmak kullanıcının verisine dokunmaktır. |

Bunun yerine `posts.kitle` üçüncü bir değer aldı: **`resmi`**. Kitle bir
bağlantıya değil yazarın resmî olmasına bakıyor.

Sonuçları:

- **Geriye dönük** — hiçbir veri taşınmadı. Kural mevcut kullanıcıya da,
  yarın açılacak hesaba da aynı anda uyuyor.
- **Bağlantı sayacı temiz** — sayılacak satır yok.
- **"Bağlantıyı kaldıramaz"** — kaldırılacak bir bağlantı yok; soru
  kendiliğinden düşüyor.
- **"Sessize alabilir"** — `sosyal_resmi_sessiz` tablosunda kullanıcının kendi
  satırı. Akış sorgusunda süzülüyor, RLS'te değil: sessize alınmış içerik
  yetkisiz değil, **istenmeyen** içerik.

## Taklit ve yetkisiz yayın

İki kapı, ikisi de veritabanında:

- `resmi_bayragi_kilidi` — `social_profiles.resmi_mi` yalnız yöneticiyle
  değişiyor. INSERT'i de kapsıyor, yoksa kullanıcı satırını silip resmî olarak
  yeniden açardı.
- `paylasim_kitlesi_kilidi` — `kitle = 'resmi'` yalnız resmî hesapta geçerli.
  Kapı olmasaydı herhangi bir kullanıcı bütün kullanıcıların akışına düşerdi.

## Bir kereye mahsus kurulum

Göç dosyası bayrağı ve kuralları getiriyor ama **hesabı açmıyor**: bir auth
kullanıcısı oluşturmak yönetim API'si istiyor ve bu göç dosyasının işi değil.

1. StajımVar için normal bir hesap aç (e-posta ile).
2. Sosyal profili doldur: kullanıcı adı, görünen ad, alan, profil fotoğrafı ve
   **yayında** işareti.
3. Yönetici oturumuyla bayrağı ver:

   ```sql
   update public.social_profiles
      set resmi_mi = true
    where profile_id = '<resmî hesabın profil kimliği>';
   ```

   Yönetici olmayan bir oturumda bu satır `42501 / resmi-bayragi-kilitli`
   hatasıyla reddediliyor — beklenen davranış.
4. Kimliği `automation/.env` içine yaz:

   ```
   STAJIMVAR_RESMI_PROFIL_ID=<aynı kimlik>
   ```

## Instagram içeriğini aktarma

```bash
node scripts/resmi-paylasim-aktar.mjs --liste
```

```bash
node scripts/resmi-paylasim-aktar.mjs --kod=nasil-calisir --yaz
```

`--yaz` verilmezse hiçbir şey yazılmıyor; ne aktarılacağı basılıyor.

**Beğeni ve yorum verisi taşınmıyor.** Setlerde zaten yok, ama bu bir tesadüf
değil kural: betik yalnız `metin` ve `kartlar` alanlarını okuyor. Instagram'daki
bir sayıyı buraya taşımak, bu ağda hiç olmamış bir etkileşimi olmuş gibi
göstermek olurdu — "1.200 beğeni" yazan bir kart, o beğenilerin buradaki
kullanıcılardan geldiğini ima eder. Sette etkileşim alanı bulunursa betik
sessizce atlamıyor, **duruyor**: setin biçimi değişmiş demektir.

Aynı set iki kez aktarılmıyor (`posts.istemci_anahtari` tekil). Setin sürümü
değişirse anahtar da değişiyor: düzeltilmiş içerik yeni paylaşım olarak çıkıyor.

## Akışta nasıl görünüyor

- Kartın yazar satırında **"StajımVar'dan · Resmî içerik"** rozeti. Etiket
  paylaşımın kitlesinden okunuyor, yazarın bayrağından değil — resmî hesabın
  ileride sıradan bir paylaşımı resmî içerik gibi etiketlenmesin.
- Aynı satırda **"Sessize al"**. Yalnız resmî kartta çiziliyor.
- Sessizdeyken akışın tepesinde **"Sesi aç"** satırı; boş akışta da çiziliyor,
  yoksa susturduğu şeyi geri getirmenin yolu kalmazdı.
- Akışta **kullanıcı içeriği yoksa** resmî içeriklerin altında **"Alanındaki
  kişiler"** bloğu. Sayıya değil türe bakılıyor: yirmi resmî paylaşım da
  "kullanıcı içeriği yok" demek.

Keşif listesine kimlerin girdiği sınırlı: aynı alan, yayında ve **adı
doldurulmuş** profiller. Bu liste bir kez kaldırılmıştı çünkü hesapların bir
kısmı deneme kaydıydı; gerekçe çöpe atılmadı, kurala çevrildi.
