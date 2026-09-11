import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
/*
  E aşamasının karar kuralları ÇALIŞTIRILARAK ölçülüyor: kilit, hata
  dalındaki geri dönüş ve geri yükleme sonrası odak sırası burada gerçek
  çağrılarla sınanıyor, kaynak metninden okunarak değil.
*/
import {
  begeniyiTersle,
  etkilesimGecisi,
  geriYuklemeOdagi,
} from '../src/lib/sosyal-etkilesim.mjs';
import {
  KAYDIRMA_ESIGI,
  gezinmeKarari,
  parmakKaymasi,
  yonuBelirle,
} from '../src/lib/kaydirma-gezinme.mjs';

/*
  SOSYAL PORTFOLYO — D AŞAMASI ARAYÜZÜ (FOTOĞRAF PAYLAŞIMI)

  Bu dosyanın konusu üç şey:

  1. Arayüzün SUNUCUDAKİ kuralla aynı sayıyı söylemesi. Kitle
     varsayılanı, 1-10 sınırı, 2200 karakter ve izin verilen üç MIME
     türü göç dosyalarında yazılı; arayüz gevşek davransaydı kullanıcı
     sunucunun reddedeceği bir işi yapıp verisini boşa harcardı.

  2. Görünürlüğün bir güvenlik sınırı olduğu: sahibe özel eylemler
     ziyaretçide gizlenmiyor, DOM'a HİÇ girmiyor; görseller kalıcı bir
     public adres değil, oturumla imzalanan geçici adres kullanıyor.

  3. Olmayan bir ilişkinin ya da olmayan bir eylemin arayüzde
     görünmemesi: "takip" diye bir kavram yok, kalıcı silme diye bir
     RPC yok.

  Veritabanı bu arayüz tarafında çalıştırılmadı; ölçülen şey kaynak
  metnin kendisi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

const sorgular = oku('src/lib/queries/sosyal.ts');
const olustur = oku('src/components/sosyal/PaylasimOlustur.tsx');
const detay = oku('src/components/sosyal/PaylasimDetayi.tsx');
const izgara = oku('src/components/sosyal/PaylasimIzgarasi.tsx');
const gorunum = oku('src/components/sosyal/SosyalProfilGorunumu.tsx');
const sayfa = oku('src/components/sosyal/SosyalProfilSayfasi.tsx');
const fotograf = oku('src/components/sosyal/ProfilFotografi.tsx');
const fotografYukleme = oku('src/components/sosyal/ProfilFotografiYukleme.tsx');
const kanca = oku('src/components/sosyal/useGorselAdresleri.ts');
const menu = oku('src/components/sosyal/ProfilAyarMenusu.tsx');
const sahipListesi = oku('src/components/sosyal/SahipListesi.tsx');
const yonetim = oku('src/components/AdminDashboard.tsx');
/* Paylaşım oluşturma ekranının geri düğmesi bu kabuktan geliyor. */
const kabuk = oku('src/components/SayfaKabugu.tsx');

const kitleGocu = oku('supabase/migrations/20260923070000_paylasim_kitlesi_ve_sayac.sql');
const semaGocu = oku('supabase/migrations/20260921010000_sosyal_katman_semasi.sql');
const depoGocu = oku('supabase/migrations/20260924020000_sosyal_depolama.sql');
const rpcGocu = oku('supabase/migrations/20260924030000_paylasim_rpc.sql');

/*
  YORUMLAR ÖLÇÜMÜN DIŞINDA

  Bu depoda yorumlar NEDEN'i anlatıyor ve bir şeyin neden ÇİZİLMEDİĞİNİ
  yazmak için o şeyin adını anmak zorundalar ("takipçilerim diye bir
  kitle yok", "getPublicUrl kullanılmıyor"). "Şu metin geçmiyor" ölçümü
  yorumlara bakarsa, doğru yazılmış bir gerekçe testi düşürür.
*/
function yorumsuz(kaynak) {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*/gm, '$1');
}

/** Bir fonksiyon gövdesini işaretten işarete kesiyor. */
function govdeAl(kaynak, baslangicIsareti, bitisIsareti) {
  const bas = kaynak.indexOf(baslangicIsareti);
  if (bas < 0) return '';
  const son = kaynak.indexOf(bitisIsareti, bas + baslangicIsareti.length);
  return son < 0 ? kaynak.slice(bas) : kaynak.slice(bas, son);
}

const D_BILESENLERI = [olustur, detay, izgara, gorunum, sayfa];

/* ------------------------------------------------------------------ */

test('kitle varsayılanı dar olan: "Bağlantılarım"', () => {
  /* Şemadaki varsayılan da dar olan; arayüz onu tekrarlıyor, seçmiyor. */
  assert.match(kitleGocu, /add column if not exists kitle text not null default 'baglantilarim'/);
  assert.match(olustur, /useState<PaylasimKitlesi>\('baglantilarim'\)/);
  assert.match(olustur, /etiket: 'Bağlantılarım'/);
});

test('"takip" kavramı hiçbir ekranda geçmiyor', () => {
  /*
    Üründe tek yönlü ilişki yok: bağlantı simetrik ve karşılıklı onaya
    bağlı. "Takipçi" sözcüğü olmayan bir ilişki biçimini varmış gibi
    anlatırdı.
  */
  for (const kaynak of D_BILESENLERI) {
    assert.doesNotMatch(yorumsuz(kaynak), /takip/i);
  }
});

test('kalıcı silme yok; sahibin tek yolu arşiv ve o da sahibiMi dalının içinde', () => {
  assert.match(sorgular, /paylasimiArsivle[\s\S]{0,600}archived_at/);
  assert.match(yorumsuz(detay), /Evet, arşivle/);
  /* Silme sözcüğü hiçbir düğmede geçmiyor; sunucuda da yalnız taslak siliniyor. */
  assert.doesNotMatch(yorumsuz(detay) + yorumsuz(izgara), /sil(?:<|\b)/i);
  assert.match(rpcGocu, /yayimlanmis-paylasim-iptal-edilemez/);
  /*
    Ayrıntı katmanında sahibe özel İKİ blok var (görünürlük satırı ve
    arşivleme) ve ikisi de koşulun İÇİNDE: ziyaretçide DOM'a hiç
    girmiyorlar, CSS ile gizlenmiyorlar.
  */
  assert.equal(detay.split('{sahibiMi && (').length - 1, 2);
});

test('1-10 ve 2200 sınırları istemcide de var, sunucudaki sayıyla aynı', () => {
  assert.match(rpcGocu, /adet < 1 or adet > 10/);
  assert.match(sorgular, /toplam < EN_AZ_FOTOGRAF \|\| toplam > EN_FAZLA_FOTOGRAF/);
  assert.match(sorgular, /EN_FAZLA_FOTOGRAF = 10/);
  assert.match(semaGocu, /length\(aciklama\) <= 2200/);
  assert.match(olustur, /ACIKLAMA_SINIRI = 2200/);
});

test('istemci anahtarı bileşen ömrü boyunca tek; her denemede üretilmiyor', () => {
  /* Tembel `useRef`: ikinci gönderim aynı anahtarı taşıyor ve sunucu
     ikinci satırı açmıyor (posts_istemci_anahtari_key). */
  assert.match(olustur, /anahtarRef\.current === null\) anahtarRef\.current = crypto\.randomUUID\(\)/);
  const gonderGovdesi = govdeAl(olustur, 'const gonder = async', '\n  };');
  assert.ok(gonderGovdesi.includes('paylasimOlustur('), 'gönderim gövdesi kesilemedi');
  assert.doesNotMatch(gonderGovdesi, /randomUUID/);
});

test('ayrıntı katmanı Escape ile kapanıyor ve odak açan karta dönüyor', () => {
  /*
    ÖLÇÜLDÜ (1440x900, gerçek oturum): kart odaklandı → tıklandı →
    katman açıldı (odak "Kapat") → Escape. Sonuç
    `document.activeElement === document.body` = true, açan kart hâlâ
    DOM'da. Odak kapanış anında katmanın içindeydi; katman sökülünce
    odaklı düğüm belgeden kalktı ve tarayıcı odağı `body`'ye aldı.
    Sökülmeden SONRAYA planlanan bir çağrı bunu geri almadı.

    O yüzden bu test artık SIRAYI zorluyor: `focus()` durum değişiminden
    ÖNCE ve senkron çağrılıyor — bare bir deyim olduğu için ne
    ertelenebiliyor ne iptal edilebiliyor. "Kare zamanlayıcısı yok"
    iddiası açılış testinde, dosyanın tamamı üzerinde.
  */
  assert.match(detay, /olay\.key === 'Escape'/);
  const kapatGovdesi = yorumsuz(govdeAl(detay, 'const kapat = React.useCallback', '[onKapat, tetikleyici]'));
  assert.match(kapatGovdesi, /tetikleyici\?\.focus\(\);\s*onKapat\(\);/);
  /* Tetikleyici ızgarada tıklanan kartın kendisi. */
  assert.match(izgara, /tetikRef\.current = tetikleyici/);
});

test('katman açılışında odak kapatma düğmesine taşınıyor', () => {
  /*
    ÖLÇÜLDÜ (gerçek oturum, katman açıldıktan hemen sonra):
    `dialog.contains(document.activeElement)` = false — odak katmanı açan
    kartta kalıyordu. `aria-modal` bir katmanda odak içeri alınmazsa Tab
    arka plandaki ızgaraya kaçar ve klavye kullanıcısı katmanın
    açıldığını fark etmez.

    İLK ONARIM YETMEDİ: odak `requestAnimationFrame` içinde veriliyordu,
    bu test geçiyordu ve GERÇEK TARAYICIDA davranış hiç oluşmadı. ÖLÇÜLDÜ
    (1440x900, katman açıldıktan sonra 16 ms aralıkla 1,5 sn boyunca
    `document.activeElement`): tek kayıt kartın kendisi, kapatma düğmesi
    listede yok. Sebep StrictMode'un mount → cleanup → mount sırası;
    cleanup'taki `cancelAnimationFrame` planlanan kareyi düşürüyor.

    O yüzden bu test artık ÇAĞRININ KENDİSİNİ zorluyor: odak `focus()`
    ile, araya kare koymadan, `useLayoutEffect` içinde (portalın çocukları
    DOM'a girdikten sonra, boyamadan önce) veriliyor; dosyada iptal eden
    hiçbir çağrı kalmıyor. Boş bağımlılık dizisi duruyor — yoksa seride
    gezinirken odak kullanıcının elinden alınırdı. Ref'in kendi tanımını
    ayrıca iddia etmiyoruz: bağlama varsa tanımı `tsc --noEmit` zorluyor.
  */
  assert.match(detay, /<button type="button" ref=\{kapatDugmesiRef\}/);
  assert.match(
    detay,
    /React\.useLayoutEffect\(\(\) => \{\s*kapatDugmesiRef\.current\?\.focus\(\);\s*\}, \[\]\);/,
  );
  /*
    KOD TARAFINDA KARE ZAMANLAYICISI HİÇ KALMADI: ne planlayan ne iptal
    eden bir çağrı var. Açılış odağı da kapanış dönüşü de senkron; ikisi
    de StrictMode'un mount → cleanup → mount sırasından etkilenmiyor.
    Ölçüm `yorumsuz` metin üzerinde: gerekçe yorumları o sırayı anlatmak
    için sözcüğü anmak zorunda.
  */
  assert.doesNotMatch(yorumsuz(detay), /(?:request|cancel)AnimationFrame/);
  /* Odak tuzağı ve kip bildirimi olduğu gibi duruyor. */
  assert.match(detay, /aria-modal="true"/);
  assert.match(detay, /if \(olay\.key !== 'Tab'\) return;/);
});

test('ayrıntı katmanı iki panel: 4:5 görsel alanı, dar ekranda üst üste', () => {
  /*
    Kap dar ekranda tek sütun (`flex-col`), lg ve üstünde yan yana
    (`lg:flex-row`); görsel paneli `aspect-[4/5]` ve `object-cover` ile
    doluyor. Yerleşim sınıfları kaynak metinden ölçülüyor; piksel ölçümü
    bu testin işi değil.
  */
  assert.match(detay, /flex-col[^"]*lg:flex-row/);
  assert.match(detay, /aspect-\[4\/5\][^"]*lg:w-\[60%\]/);
});

test('kova adları tek sabitten geliyor, kalıcı public adres üretilmiyor', () => {
  assert.match(sorgular, /SOSYAL_PAYLASIM_KOVASI = 'sosyal-paylasim'/);
  assert.match(sorgular, /SOSYAL_AVATAR_KOVASI = 'sosyal-avatar'/);
  assert.match(depoGocu, /\('sosyal-paylasim', 'sosyal-paylasim', false/);
  /* Bileşenler adı elle yazmıyor: değişirse tek yerde değişiyor. */
  for (const kaynak of [olustur, detay, izgara]) {
    assert.doesNotMatch(kaynak, /'sosyal-(paylasim|avatar)'/);
  }
});

test('sosyal görsellerde imzalı ya da kalıcı adres üreten hiçbir çağrı yok', () => {
  /*
    ÖLÇÜM (gorselIndir başlığındaki tablo): bir kez verilen imza jetonu
    RLS'i YENİDEN sormuyor — arşiv, bağlantı kaldırma ve engel sonrasında
    eski imza 200 dönerken yetkili indirme 400 dönüyordu. Bu yüzden imza
    tamamen kalktı; dosya her seferinde kullanıcının oturumundan geçerek
    iniyor. `getPublicUrl` de yok: iki kova da `public = false`.
  */
  for (const kaynak of [sorgular, kanca, fotograf, fotografYukleme, izgara, detay]) {
    assert.doesNotMatch(yorumsuz(kaynak), /createSignedUrls?\(|getPublicUrl/);
  }
  assert.match(sorgular, /db\.storage\.from\(kova\)\.download\(yol\)/);
});

test('bellekteki adresler temizlikte tek tek bırakılıyor', () => {
  /*
    Bırakılmayan bir object URL sekme kapanana kadar Blob'u bellekte
    tutar; bir profilde onlarca fotoğraf gezildiğinde sızıntı birikir.
    Yaşam döngüsü TEK yerde: `createObjectURL` de `revokeObjectURL` de
    yalnız bu kancada, çağıran bileşenlerde değil.
  */
  assert.match(kanca, /return \(\) => \{[\s\S]{0,200}URL\.revokeObjectURL\(adres\)/);
  for (const kaynak of [izgara, detay, fotograf]) {
    assert.doesNotMatch(yorumsuz(kaynak), /createObjectURL|revokeObjectURL/);
  }
  /* Yetkisiz/başarısız dalda adres HİÇ üretilmiyor. */
  assert.match(kanca, /if \(!blob \|\| iptal\) return \[yol, null\];/);
});

test('tür denetimi File.type üzerinden ve kovanın listesiyle aynı', () => {
  assert.match(olustur, /IZIN_VERILEN_TURLER = \['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.match(olustur, /IZIN_VERILEN_TURLER\.includes\(dosya\.type\)/);
  assert.match(depoGocu, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  /* Uzantı çıktı blob'unun türünden okunuyor; istenen türden değil. */
  assert.match(olustur, /uzantiCevir\(veri\.type\)/);
});

test('hata dalı yüklenen dosyaları ve taslağı geride bırakmıyor', () => {
  assert.match(sorgular, /await paylasimTemizle\(yuklenenler, postId\);\s*\n\s*throw sorun;/);
  assert.match(sorgular, /sosyal_paylasim_iptal/);
  /* Kullanıcının dosya adı yola girmiyor: ad yerine rastgele kimlik. */
  assert.match(sorgular, /\$\{onek\}\$\{crypto\.randomUUID\(\)\}\.\$\{gorsel\.uzanti\}/);
});

/* ------------------------------------------------------------------ */
/*  PROFİL FOTOĞRAFI (20260924040000 ile açılan yol)                   */
/* ------------------------------------------------------------------ */

test('fotoğraf yükleme ekranı yalnız sahip dalında; ziyaretçide DOM’a hiç girmiyor', () => {
  /*
    Ekran, `if (!sahibiMi) return <GuvenliEkran/>` satırından SONRA
    çiziliyor: ziyaretçi o koda hiç ulaşmıyor. Düğme de görünümde
    koşulun İÇİNDE — CSS ile gizlenmiş bir düğme klavyeyle bulunur.
  */
  /* Çizim dalındaki kapı; paneldeki effect aynı `sahibiMi`yi daha yukarıda okuyor. */
  const kapi = sayfa.indexOf('if (!sahibiMi) {\n    return <GuvenliEkran');
  const ekran = sayfa.indexOf('<ProfilFotografiYukleme');
  assert.ok(kapi > 0 && ekran > kapi, 'yükleme ekranı sahip kapısından önce çiziliyor');
  /* Menü de sahip dalının içinde; ziyaretçide DOM'a hiç girmiyor. */
  assert.match(gorunum, /\{sahibiMi && onPaylas && onGorunurluk && \(/);
});

test('fotoğraf değiştirme ve kaldırma TEK yerde: dişli menüsü', () => {
  /*
    Başlıkta ayrı bir "Fotoğrafı değiştir" düğmesi VARDI ve menüye
    taşındı. İki giriş bırakılsaydı biri değiştiğinde öteki geride
    kalırdı; masaüstü ile telefon da aynı `ogeler` dizisinden besleniyor,
    yani iki sunum tek kod yolu.
  */
  assert.match(menu, /etiket: avatarVarMi \? 'Profil fotoğrafını değiştir' : 'Profil fotoğrafı ekle'/);
  assert.match(gorunum, /onFotografDegistir=\{onFotografDegistir\}/);
  /* Başlıkta yinelenen düğme yok: eski metin hiçbir yerde geçmiyor. */
  assert.doesNotMatch(yorumsuz(gorunum), /'Fotoğrafı değiştir'|Profil fotoğrafı ekle/);
  assert.doesNotMatch(yorumsuz(gorunum), /<Camera/);
});

test('"Profil fotoğrafını kaldır" yalnız fotoğraf varken çiziliyor', () => {
  /*
    Olmayan bir fotoğrafı kaldırmayı öneren satır, her basışta hiçbir şey
    yapmayan bir eylem olurdu. Koşul ekranda ne olduğunun KENDİSİ:
    `avatar_path` dolu mu. Satır `disabled` bırakılmıyor, DİZİYE HİÇ
    girmiyor.
  */
  assert.match(menu, /\.\.\.\(avatarVarMi && onFotografKaldir\s*\n?\s*\?/);
  assert.match(menu, /etiket: fotografGonderiliyor[\s\S]{0,120}'Profil fotoğrafını kaldır'/);
  assert.match(gorunum, /avatarVarMi=\{Boolean\(profil\.avatarYolu\)\}/);
  /*
    Sıra: ÖNCE satır, ANCAK başarılıysa dosya. Tersi olsaydı satır
    güncellemesi düştüğünde profilde var olmayan bir dosyanın yolu
    kalırdı. Yerel durum da yalnız sunucu kabul ettikten sonra
    değişiyor; hata dalında fotoğraf DURUYOR ve cümle bunu söylüyor.
  */
  assert.match(
    sorgular,
    /update\(\{ avatar_path: null \}\)[\s\S]{0,700}storage\.from\(SOSYAL_AVATAR_KOVASI\)\.remove\(\[eskiYol\]\)/,
  );
  assert.match(sayfa, /await profilFotografiKaldir\(kullaniciId\);\s*\n\s*setProfil/);
  assert.match(gorunum, /fotoğrafın duruyor/);
});

test('yönetim şeridindeki düğmeler 44 piksel dokunma hedefinde', () => {
  /*
    Düğmeler yalnız `py-2.5` ile ölçülüyordu: 40 piksel (kenarlıklıda
    42). Depodaki eşik 44 ve panel telefondan da açılıyor. Şeritteki beş
    düğmenin beşinde de taban yükseklik var.
  */
  const serit = yonetim.slice(yonetim.indexOf('/yonetim/kesfet'));
  assert.equal((serit.match(/min-h-11/g) ?? []).length, 5);
  assert.doesNotMatch(serit, /className="px-4 py-2\.5/);
});

test('avatar kovasının adı sabitten geliyor, bileşende elle yazılmıyor', () => {
  /* Ad üç çağrıda elle yazılsaydı biri değişince öteki sessizce geride kalırdı. */
  assert.match(fotograf, /SOSYAL_AVATAR_KOVASI/);
  for (const kaynak of [fotograf, fotografYukleme]) {
    assert.doesNotMatch(kaynak, /'sosyal-(paylasim|avatar)'/);
  }
});

test('profil fotoğrafı oturumdan indiriliyor; kalıcı adres üretilmiyor', () => {
  /* Kova private (20260924020000): kalıcı adres hem çalışmaz hem kitle kapısını dolanırdı. */
  assert.match(depoGocu, /\('sosyal-avatar',   'sosyal-avatar',   false/);
  assert.match(fotograf, /useGorselAdresleri\(SOSYAL_AVATAR_KOVASI, yollar\)/);
});

test('baş harf yedeği yalnız fotoğraf gösterilemediğinde; beklerken yanıp sönmüyor', () => {
  /*
    Fotoğrafı OLAN bir profilde imza gelene kadar baş harf çizmek, her
    açılışta "yok → var" diye yanlış bir ilk kare üretirdi. Bekleme
    durumu iskelet kalıbında; `Avatar` yalnız yol yokken ya da adres
    alınamadığında baş harfe düşüyor.
  */
  assert.match(fotograf, /durum === 'yukleniyor'[\s\S]{0,200}animate-pulse/);
  /*
    Dal ARTIK TEK SATIR: `if (adres) return <Avatar ... url={adres} />`.
    Şekil değişti çünkü bileşen bir kaynak daha tanıyor (eski
    `student_profiles.avatar_url` yedeği) ve kaynağı `profilFotografi`
    seçiyor. Ölçülen kural aynı: adres varsa fotoğrafın kendisi çiziliyor.
  */
  assert.match(fotograf, /if \(adres\) return <Avatar name=\{ad\} url=\{adres\}/);
  /*
    Baş harf dalı HÂLÂ TEK: yol yoksa ve yedek adres de yoksa. Yedek
    dalının kendi `Avatar`ı var ve o `url` alıyor — baş harfe düşmüyor.
  */
  assert.equal((fotograf.match(/<Avatar name=\{ad\} className=\{className\} \/>/g) ?? []).length, 1);
});

test('paylaşım oluşturma ekranının geri düğmesi 44 piksel dokunma hedefinde', () => {
  /*
    Ekran `SayfaKabugu onBack` ile açılıyor; ölçülen kutu 48 × 20 idi,
    yükseklik 44 eşiğinin altında. Kabuktaki düğme artık min-h-11.
  */
  assert.match(kabuk, /className="inline-flex min-h-11 items-center gap-1\.5 text-sm font-semibold text-gray-500/);
});

/* ------------------------------------------------------------------ */
/*  E AŞAMASI — BEĞEN / KAYDET VE SAHİBİN KENDİ LİSTELERİ              */
/* ------------------------------------------------------------------ */

/*
  UYARI YERİNE ÖLÇÜM

  Bu depoda iki kez "kaynak testi geçti ama davranış oluşmadı" yaşandı
  (katman açılış odağı ve kapanış odağı). O yüzden bu bölümdeki dört
  kural — kilit, hata dalındaki geri dönüş, sayı çevirme ve odak sırası —
  saf fonksiyonlara taşındı ve burada GERÇEKTEN çağrılıyor. Bileşenin tam
  olarak bu fonksiyonları çağırdığı ayrıca ölçülüyor; yoksa çalışan ama
  hiçbir düğmeye bağlanmamış bir kural yazmış olurduk.
*/

test('işlem kilidi: aynı karede iki tıklama TEK istek üretiyor', async () => {
  let istekSayisi = 0;
  const kilit = { deger: false };
  let durum = { begendimMi: false, adet: 2 };
  let mesaj = 'önceki denemeden kalan cümle';

  const bas = () =>
    etkilesimGecisi({
      /* Bileşende de aynısı: kilit `ref`ten okunuyor, durumdan değil. */
      kilitliMi: kilit.deger,
      onceki: durum,
      sonraki: begeniyiTersle(durum),
      yaz: (yeni) => {
        durum = yeni;
      },
      kilitle: (deger) => {
        kilit.deger = deger;
      },
      hataYaz: (metin) => {
        mesaj = metin;
      },
      istek: async () => {
        istekSayisi += 1;
      },
      hataMetni: 'kullanılmadı',
    });

  const ilk = bas();
  /* İkinci tıklama ilk istek bitmeden geliyor: React durumu henüz güncellenmedi. */
  const ikinci = bas();

  assert.equal(await ikinci, 'kilitli');
  assert.equal(await ilk, 'tamam');
  assert.equal(istekSayisi, 1);
  assert.deepEqual(durum, { begendimMi: true, adet: 3 });
  /* Yeni istek başlarken önceki denemenin cümlesi siliniyor. */
  assert.equal(mesaj, null);
  /* Kilit sonunda açılıyor; yoksa düğme kalıcı olarak tıklanamaz kalırdı. */
  assert.equal(kilit.deger, false);
});

test('hata dalı: durum ESKİ DOĞRU değerine dönüyor, cümle Türkçe, kilit açılıyor', async () => {
  const kilit = { deger: false };
  const baslangic = { begendimMi: true, adet: 5 };
  let durum = baslangic;
  let mesaj = null;

  const sonuc = await etkilesimGecisi({
    kilitliMi: kilit.deger,
    onceki: durum,
    sonraki: begeniyiTersle(durum),
    yaz: (yeni) => {
      durum = yeni;
    },
    kilitle: (deger) => {
      kilit.deger = deger;
    },
    hataYaz: (metin) => {
      mesaj = metin;
    },
    istek: async () => {
      throw new Error('new row violates row-level security policy');
    },
    hataMetni: 'Beğenin kaldırılamadı; beğenin duruyor.',
  });

  assert.equal(sonuc, 'geri-alindi');
  /* İyimser yazımdan sonra tam olarak isteğin gönderildiği andaki değer. */
  assert.deepEqual(durum, baslangic);
  assert.equal(mesaj, 'Beğenin kaldırılamadı; beğenin duruyor.');
  /* Sunucunun İngilizce metni ekrana çıkmıyor. */
  assert.doesNotMatch(mesaj, /row-level|policy/);
  assert.equal(kilit.deger, false);
});

test('beğeni sayısı düğmeyle birlikte çevriliyor ve eksiye düşmüyor', () => {
  assert.deepEqual(begeniyiTersle({ begendimMi: false, adet: 3 }), {
    begendimMi: true,
    adet: 4,
  });
  assert.deepEqual(begeniyiTersle({ begendimMi: true, adet: 1 }), {
    begendimMi: false,
    adet: 0,
  });
  /*
    Sunucudaki sayı istemcinin bildiğinden farklı olabilir (araya
    başkasının beğenisi girmiş olabilir); eksi bir beğeni sayısı hiçbir
    durumda doğru değil.
  */
  assert.deepEqual(begeniyiTersle({ begendimMi: true, adet: 0 }), {
    begendimMi: false,
    adet: 0,
  });
});

test('geri yükleme odağı: sıradaki kart → önceki kart → ızgara başlığı', () => {
  assert.deepEqual(geriYuklemeOdagi(['a', 'b', 'c'], 'b'), { hedef: 'kart', id: 'c' });
  /* Sonuncu kalktığında sıradaki yok; odak bir öncekine gidiyor. */
  assert.deepEqual(geriYuklemeOdagi(['a', 'b', 'c'], 'c'), { hedef: 'kart', id: 'b' });
  /* Tek kart kalktığında ızgarada odaklanacak bir şey kalmıyor. */
  assert.deepEqual(geriYuklemeOdagi(['a'], 'a'), { hedef: 'baslik', id: null });
  /* Tanınmayan kimlik rastgele bir karta odaklanmıyor. */
  assert.deepEqual(geriYuklemeOdagi(['a', 'b'], 'z'), { hedef: 'baslik', id: null });
});

test('beğen ve kaydet AYNI düğmede iki yön; durum aria-pressed ile, etiket sabit', () => {
  /*
    Etiket değişseydi okuyucu aracı hem adı hem durumu değiştirir ve
    kullanıcı hangisinin doğru olduğunu bilemezdi. İki düğme de işlem
    sürerken kilitli; kapı `kilitRef` üzerinden, çünkü React durumu aynı
    karede güncellenmiyor.
  */
  assert.match(detay, /aria-pressed=\{begeniDurumu\.begendimMi\}/);
  assert.match(detay, /aria-pressed=\{kaydettimMi\}/);
  assert.equal((detay.match(/disabled=\{kilitli\}/g) ?? []).length, 2);
  assert.match(detay, /\n\s*Beğen\n/);
  assert.match(detay, /\n\s*Kaydet\n/);

  const begeniGovdesi = govdeAl(detay, 'const begeniyiCevir = () =>', '\n  };');
  const kayitGovdesi = govdeAl(detay, 'const kaydiCevir = () =>', '\n  };');
  for (const govde of [begeniGovdesi, kayitGovdesi]) {
    assert.match(govde, /etkilesimGecisi\(\{/);
    assert.match(govde, /kilitliMi: kilitRef\.current/);
  }
  assert.match(
    begeniGovdesi,
    /onceki\.begendimMi \? begeniyiKaldir\(paylasim\.id\) : begen\(paylasim\.id\)/,
  );
  assert.match(kayitGovdesi, /onceki \? kaydiKaldir\(paylasim\.id\) : kaydet\(paylasim\.id\)/);
  /* Ref ve durum TEK fonksiyondan yazılıyor: biri ötekinden geride kalmasın. */
  assert.match(detay, /kilitRef\.current = deger;\s*\n\s*setKilitli\(deger\);/);
});

test('kaydetme sayısı hiçbir yerde yok; "kimler beğendi" listesi de yok', () => {
  /*
    `post_saves` politikası `using (user_id = auth.uid())`: paylaşımın
    sahibi bile kimin kaydettiğini göremiyor, oradan çıkacak tek sayı 0
    ya da 1 olurdu — uydurma bir metrik.
  */
  const kayitGovdesi = govdeAl(sorgular, 'export async function kaydetmeDurumuGetir', '\n}');
  assert.match(kayitGovdesi, /Promise<Set<string>>/);
  assert.doesNotMatch(kayitGovdesi, /adet|count/i);
  assert.doesNotMatch(
    yorumsuz(detay) + yorumsuz(izgara) + yorumsuz(sahipListesi),
    /kaydeden|kayıt sayısı/i,
  );

  /*
    E'de `post_likes` SELECT politikası `using (user_id = auth.uid())`
    hâline geldi: sunucu artık başkasının satırını hiç vermiyor. Bu yüzden
    istemcideki "ben var mıyım" karşılaştırması da KALKTI — karşılaştırılacak
    yabancı satır yok. Kod `user_id`yi artık TEK yerde anıyor: kendi satırını
    istediği süzgeç. İkinci bir kullanım, kimliklerin fonksiyondan dışarı
    sızması demek olurdu.
  */
  const begeniGovdesi = yorumsuz(govdeAl(sorgular, 'export async function begeniDurumuGetir', '\n}'));
  assert.equal((begeniGovdesi.match(/user_id/g) ?? []).length, 1);
  assert.match(begeniGovdesi, /\.eq\('user_id', kimlik\)/);
  /* Ekrandaki sayı GERÇEK satırlardan; sıfırken hiç yazılmıyor. */
  assert.match(detay, /begeniDurumu\.adet > 0 && \(/);
  assert.match(detay, /\{begeniDurumu\.adet\} beğeni/);
});

test('üç liste ekranı yalnız sahip dalında; ziyaretçide DOM’a hiç girmiyor', () => {
  /* Çizim dalındaki kapı; paneldeki effect aynı `sahibiMi`yi daha yukarıda okuyor. */
  const kapi = sayfa.indexOf('if (!sahibiMi) {\n    return <GuvenliEkran');
  const ekran = sayfa.indexOf('<SahipListesi');
  assert.ok(kapi > 0 && ekran > kapi, 'liste ekranı sahip kapısından önce çiziliyor');

  /* Menü satırları koşullu: eylem verilmediğinde diziye HİÇ girmiyorlar. */
  for (const [eylem, etiket] of [
    ['onBegendiklerim', 'Beğendiklerim'],
    ['onKaydedilenler', 'Kaydedilenler'],
    ['onArsiv', 'Arşiv'],
  ]) {
    assert.match(menu, new RegExp(`\\.\\.\\.\\(${eylem}\\s*\\n?\\s*\\?`));
    assert.match(menu, new RegExp(`etiket: '${etiket}'`));
  }

  /*
    Eylemler yalnız sahip görünümünden geçiyor: sayfada tek bağlama var.
    Gömülü kipte menü artık sağ sütunda değil, sol sütundaki kimlik
    kartında çiziliyor; eylemler `onPortfolyoSatiri` nesnesinin `menu`
    alanıyla gidiyor ve o nesne yalnız `sahibiMi` kapısının arkasında
    kuruluyor. JSX'te ikinci bir `<ProfilAyarMenusu` çağrısı yok.
  */
  const menuBlogu = govdeAl(gorunum, '<ProfilAyarMenusu', '/>');
  assert.match(menuBlogu, /onBegendiklerim=\{onBegendiklerim\}/);
  assert.doesNotMatch(sayfa, /<ProfilAyarMenusu/);
  assert.equal((sayfa.match(/onBegendiklerim: /g) ?? []).length, 1);
  assert.equal((sayfa.match(/onArsiv: /g) ?? []).length, 1);
  assert.ok(
    sayfa.indexOf('if (!sahibiMi) {\n      onPortfolyoSatiri(null);') <
      sayfa.indexOf('onBegendiklerim: '),
    'menü eylemleri sahip kapısından sonra bağlanıyor',
  );
});

test('listeler OTURUM kimliğiyle; kullanıcı adından kimlik türetilmiyor', () => {
  const kimlikGovdesi = govdeAl(sorgular, 'async function oturumKimligi', '\n}');
  assert.match(kimlikGovdesi, /supabase\.auth\.getSession\(\)/);

  const listeGovdesi = govdeAl(sorgular, 'async function etkilesimListesi', '\n}');
  assert.match(listeGovdesi, /await oturumKimligi\(\)/);
  assert.match(listeGovdesi, /\.eq\('user_id', kimlik\)/);
  assert.doesNotMatch(listeGovdesi, /kullaniciAd/i);

  /* İki liste de hedef kimliği PARAMETRE ALMIYOR: başkasının listesi diye bir şey yok. */
  assert.match(
    sorgular,
    /export async function begendiklerimiGetir\(\): Promise<SosyalPaylasim\[\]>/,
  );
  assert.match(
    sorgular,
    /export async function kaydedilenleriGetir\(\): Promise<SosyalPaylasim\[\]>/,
  );
  /* Yazılan `user_id` de oturumdan: iki insert de aynı değeri taşıyor. */
  assert.equal(
    (sorgular.match(/insert\(\{ post_id: postId, user_id: kimlik \}\)/g) ?? []).length,
    2,
  );

  /*
    Paylaşımı dönmeyen satır listede YOK: arşiv, kitle değişimi, bağlantı
    kaldırma ve engel bu yoldan eleniyor. `!inner` sunucuda eliyor,
    `continue` ikinci kapı.
  */
  assert.match(listeGovdesi, /posts!inner/);
  assert.match(listeGovdesi, /\.is\('posts\.archived_at', null\)/);
  assert.match(listeGovdesi, /if \(!paylasim\) continue;/);
});

test('geri yükleme: kart sunucu kabul ettikten SONRA kalkıyor, odak elle taşınıyor', () => {
  const govde = govdeAl(sahipListesi, 'const geriYukle = async', '\n  };');
  /* Çift tıklama kapısı; `disabled` tek başına güvence değil. */
  assert.match(govde, /if \(kilitRef\.current\) return;/);
  /* İyimser gizleme yok: satır ancak sunucu yazdıktan sonra listeden çıkıyor. */
  assert.ok(
    govde.indexOf('await paylasimiGeriYukle(') < govde.indexOf('setPaylasimlar('),
    'kart sunucu cevabından önce kalkıyor',
  );
  /* Sıra, kart listeden çıkmadan ÖNCE hesaplanıyor. */
  assert.ok(
    govde.indexOf('geriYuklemeOdagi(') < govde.indexOf('setPaylasimlar('),
    'odak sırası kart kalktıktan sonra hesaplanıyor',
  );

  /*
    Odak `useLayoutEffect` ile taşınıyor; kare zamanlayıcısı YOK.
    StrictMode'un mount → cleanup → mount sırası planlanan kareyi
    düşürüyor ve aynı tuzak bu depoda iki kez ölçüldü.
  */
  assert.match(sahipListesi, /React\.useLayoutEffect/);
  assert.doesNotMatch(yorumsuz(sahipListesi), /(?:request|cancel)AnimationFrame/);
  assert.match(sahipListesi, /tabIndex=\{-1\}/);
  assert.match(sahipListesi, /data-paylasim-kimligi="\$\{odakHedefi\.id\}"/);
  assert.match(izgara, /data-paylasim-kimligi=\{paylasim\.id\}/);
  /* Kalıcı silme bu ekranda da yok. */
  assert.doesNotMatch(yorumsuz(sahipListesi), /sil(?:<|\b)/i);
});

test('yeni ekranlarda da imzalı ya da kalıcı adres üreten çağrı yok', () => {
  /*
    Ölçüm `gorselIndir` başlığındaki tabloda: bir kez verilen imza RLS'i
    yeniden sormuyor. Yeni listeler aynı ızgarayı ve aynı kancayı
    kullanıyor, kendi indirme yolunu KURMUYOR.
  */
  assert.doesNotMatch(yorumsuz(sahipListesi), /createSignedUrls?\(|getPublicUrl|createObjectURL/);
  assert.doesNotMatch(sahipListesi, /'sosyal-(paylasim|avatar)'/);
  /* Izgara yeniden kullanılıyor; ikinci bir ızgara ölçüsü tanımlanmadı. */
  assert.match(sahipListesi, /<PaylasimIzgarasi/);
  assert.equal((sahipListesi.match(/grid-cols-/g) ?? []).length, 0);
});

/* ------------------------------------------------------------------ */
/*  IZGARANIN SADE KİPİ — BİRLEŞİK EKRANIN PORTFOLYOSU                 */
/* ------------------------------------------------------------------ */

test('sade hücre açıklama basmıyor; metin ayrıntı katmanında duruyor', () => {
  /*
    Onaylanan tasarımda profil ızgarasının hücresi çıplak bir kare
    fotoğraf: kart kabı, açıklama ve tarih yok. Açıklama SİLİNMİYOR, yer
    değiştiriyor — tam metin `PaylasimDetayi` içinde ve o katman
    ızgaranın kendi içinden açılıyor.

    "Açıklama yok" satırı da bu yüzden sade kipte çizilmiyor: boş bir
    alanın boşluğunu ilan eden bir satır, hücrenin asıl sorusunu ("hangi
    fotoğraf") bulandırıyordu.

    Arşiv ekranı ayrıntılı kipte KALIYOR: orada kart altında "Profilde
    yeniden göster" var ve kullanıcı hangi satırı geri yüklediğini çıplak
    kapaktan ayırt edemez.
  */
  assert.match(izgara, /gorunum\?: 'sade' \| 'ayrintili';/);
  assert.match(izgara, /gorunum = 'ayrintili',/);
  assert.match(izgara, /\{!sade && \(/);
  /* Açıklama ve tarih AYNI koşulun içinde: ikisi de sade kipte düşüyor. */
  const govde = izgara.slice(izgara.indexOf('{!sade && ('), izgara.indexOf('</button>'));
  assert.match(govde, /paylasim\.aciklama/);
  assert.match(govde, /Açıklama yok/);
  assert.match(govde, /\{tarih && </);
  /* Sade hücrede kart kabı yok; odak halkası İKİ dalda da duruyor. */
  assert.match(izgara, /sade\n\s*\? `block h-full w-full min-w-0 cursor-pointer/);
  assert.equal((izgara.match(/\$\{ODAK_HALKASI\}`\n\s*: `\$\{KART_KABI\}/g) ?? []).length, 1);
});

test('sade hücrenin adı boş kalmıyor, içerik de uydurulmuyor', () => {
  /*
    Ayrıntılı hücrede düğmenin erişilebilir adı içeriğinden geliyordu.
    Sade hücrede metin yok ve fotoğrafın `alt`ı da BOŞ OLABİLİR (yazar
    yazmadıysa); ad elde var olandan kuruluyor: paylaşımın tarihi.
    "Tekstil paylaşımı" gibi bir tahmin, olmayan bir başlığı ekran
    okuyucuya gerçek diye sunardı.

    Çoklu fotoğraf rozeti sade kipte de duruyor: `KAPAK_KABI` her iki
    dalda da çiziliyor ve rozet onun içinde.
  */
  assert.match(izgara, /const sadeAd = tarih \? `\$\{tarih\} tarihli paylaşımı aç` : 'Paylaşımı aç';/);
  assert.match(izgara, /aria-label=\{sade \? sadeAd : undefined\}/);
  /* İkon tek başına bilgi taşımıyor; yanındaki metin ekran okuyucuya kalıyor. */
  assert.match(izgara, /paylasim\.gorselSayisi > 1 && \(/);
  assert.match(izgara, /<Images aria-hidden/);
  assert.match(izgara, /<span className="sr-only">Birden çok fotoğraf<\/span>/);
  /* Rozet koşulu `sade` bayrağına HİÇ bakmıyor: iki kipte de aynı. */
  assert.doesNotMatch(izgara, /sade && paylasim\.gorselSayisi/);
});

test('seride parmakla gezinme: oklar dar ekranda görünmez ama ağaçta; kaydırma AYNI iki fonksiyonu çağırıyor', () => {
  /*
    Dar ekranda gezinme parmakla; oklar `hidden` DEĞİL `max-lg:sr-only`
    (dokunmatik cihazda ekran okuyucu kullanıcısı parmak hareketini
    bileşene ulaştıramıyor; ok ağaçtan çıksaydı seride gezecek yolu
    kalmazdı). lg ve üstünde sınıf hiçbir bildirim yazmıyor, ok aynen
    duruyor. Gezinme mantığı ÜÇ yerde (klavye, ok, kaydırma) aynı iki
    fonksiyon; `setIndeks`i o ikisi dışında kimse çağırmıyor.

    Eşik ve uç kuralı kaynak metinden değil, fonksiyon ÇAĞRILARAK
    ölçülüyor. Tarayıcı ölçümü bu testin işi değil.
  */
  const kaynak = yorumsuz(detay);
  assert.match(kaynak, /const OK_DUGMESI = `[^`]* max-lg:sr-only [^`]*`/);
  assert.doesNotMatch(kaynak, /const OK_DUGMESI = `[^`]*(?:\bhidden\b|lg:not-sr-only)[^`]*`/);
  /* Görsel kabı dikey kaydırmayı tarayıcıya bırakıyor; dört işaretçi olayı da bağlı. */
  assert.match(kaynak, /touch-pan-y[^"]*"\s*onPointerDown=\{surukleBasla\}\s*onPointerMove=\{surukleHareket\}\s*onPointerUp=\{surukleBitir\}\s*onPointerCancel=\{surukleIptal\}/);
  /* Tek gezinme kaynağı: setIndeks yalnız iki callback'in içinde. */
  assert.equal((kaynak.match(/setIndeks\(/g) ?? []).length, 2);
  assert.match(kaynak, /if \(olay\.key === 'ArrowRight'\) \{\s*sonrakiKare\(\);/);
  assert.match(kaynak, /if \(olay\.key === 'ArrowLeft'\) \{\s*oncekiKare\(\);/);
  assert.match(kaynak, /onClick=\{oncekiKare\}/);
  assert.match(kaynak, /onClick=\{sonrakiKare\}/);
  assert.match(kaynak, /if \(karar === 'sonraki'\) sonrakiKare\(\);\s*else if \(karar === 'onceki'\) oncekiKare\(\);/);
  /* Yalnız dokunma; fare dalı yok, oktan başlayan dokunma yok. */
  assert.match(kaynak, /olay\.pointerType !== 'touch' \|\| toplam <= 1\) return;/);
  assert.match(kaynak, /\.closest\('button'\)\) return;/);
  /* Sayaç ve noktalar duruyor: dar ekranda tek görünür ipucu. */
  assert.match(kaynak, /\{indeks \+ 1\} \/ \{toplam\}/);
  assert.match(kaynak, /sira === indeks \? 'bg-white' : 'bg-white\/40'/);

  /* Kararlar ÇALIŞTIRILARAK. */
  assert.equal(KAYDIRMA_ESIGI, 40);
  assert.equal(yonuBelirle(3, 3), 'belirsiz');
  assert.equal(yonuBelirle(20, 5), 'yatay');
  assert.equal(yonuBelirle(5, 20), 'dikey');
  assert.equal(gezinmeKarari({ dx: -39, indeks: 0, toplam: 3 }), 'yok');
  assert.equal(gezinmeKarari({ dx: -40, indeks: 0, toplam: 3 }), 'sonraki');
  assert.equal(gezinmeKarari({ dx: 40, indeks: 1, toplam: 3 }), 'onceki');
  /* Uçlar: ilk karede sağa, son karede sola çekmek hiçbir şey yapmıyor, görsel de kımıldamıyor. */
  assert.equal(gezinmeKarari({ dx: 120, indeks: 0, toplam: 3 }), 'yok');
  assert.equal(gezinmeKarari({ dx: -120, indeks: 2, toplam: 3 }), 'yok');
  assert.equal(parmakKaymasi({ dx: 30, indeks: 0, toplam: 3 }), 0);
  assert.equal(parmakKaymasi({ dx: -30, indeks: 2, toplam: 3 }), 0);
  assert.equal(parmakKaymasi({ dx: -30, indeks: 1, toplam: 3 }), -30);
  assert.equal(parmakKaymasi({ dx: -30, indeks: 0, toplam: 1 }), 0);
});
