import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  SOSYAL BİLDİRİMLER

  `notifications` tablosu yalnız iş başvurusu olaylarıyla doluyordu.
  Sosyal katmanda hiç bildirim üretilmiyordu: bağlantı isteği gelince
  kullanıcı bunu ancak Bağlantılar sayfasına kendi girip bakarsa
  görüyordu, beğeni ise hiçbir yerde görünmüyordu.

  Bu testler üç şeyi koruyor: bildirimin yalnız tetikleyiciden
  yazılabilmesi, aynı olayın iki kez bildirim üretmemesi ve kendi
  yaptığının bildiriminin gelmemesi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const goc = oku('supabase/migrations/20260927130000_sosyal_bildirimler.sql');

test('aynı olay iki kez bildirim üretmiyor', () => {
  /*
    İstek geri çekilip yeniden gönderilirse ya da beğeni kaldırılıp
    yeniden verilirse zil iki kez dolmamalı. Tabloda doğal anahtar yok;
    olayın kimliği ayrı bir kolonda ve benzersiz.
  */
  assert.match(goc, /add column if not exists dedupe_key text;/);
  assert.match(goc, /create unique index if not exists notifications_dedupe_key_idx\s*on public\.notifications \(dedupe_key\)\s*where dedupe_key is not null;/);
  /* Yinelenen olay sessizce düşüyor. */
  assert.match(goc, /on conflict \(dedupe_key\) where dedupe_key is not null do nothing;/);
});

test('yinelenme hatası ASIL İŞLEMİ geri almıyor', () => {
  /*
    Tetikleyici hata fırlatsaydı işlemin tamamı geri alınırdı: bildirim
    yazılamadı diye beğeni ya da bağlantı isteği kaybolurdu.
  */
  assert.doesNotMatch(goc, /raise exception/i);
  assert.match(goc, /do nothing/);
});

test('bildirim yalnız tetikleyiciden yazılıyor', () => {
  /* `security definer`: tabloda INSERT politikası yok ve olmamalı. */
  assert.match(goc, /create or replace function sosyal_gizli\.bildirim_yaz\([\s\S]{0,400}language plpgsql security definer/);
  const bildirimGocu = oku('supabase/migrations/20260913010000_bildirimler.sql');
  assert.match(bildirimGocu, /INSERT ve DELETE politikası YOK/);
});

test('bağlantı: istek alıcıya, kabul isteyene gider; RED SESSİZ', () => {
  assert.match(goc, /NEW\.addressee_id,\s*'baglanti_istegi'/);
  assert.match(goc, /NEW\.requester_id,\s*'baglanti_kabul'/);
  /*
    Reddedildiğini haber vermek, reddeden kişiyi açıklama yapmak
    zorunda bırakıyor. Sessiz red bilinçli bir karar.
  */
  assert.doesNotMatch(goc, /'baglanti_red'/);
  assert.match(goc, /NEW\.durum = 'kabul' and OLD\.durum is distinct from 'kabul'/);
});

test('beğeni: kendi paylaşımını beğenen bildirim almıyor', () => {
  assert.match(goc, /if yazar is null or yazar = NEW\.user_id then\s*return NEW;/);
  assert.match(goc, /'paylasim_begeni'/);
});

/*
  ADRES DEĞİŞTİ: `/cv` → `/paylasim/<id>` (28 Eylül 2026)

  Bu test eskiden `'/cv'` yazıyor ve `'/paylasim/` geçmediğini ayrıca
  doğruluyordu. O yasak KEYFİ DEĞİLDİ: paylaşımın kalıcı bir adresi
  yoktu ve olmayan bir adrese götüren bildirim dokununca 404 verirdi.
  Yani korunan şey "adres `/cv` olsun" değil, "BİLDİRİM GERÇEKTEN VAR
  OLAN BİR ADRESE GİTSİN" idi.

  Adres artık var, bu yüzden koşul yer değiştirdi ama aynı şeyi
  koruyor — ve daha sıkı koruyor: yalnız göçün ne yazdığına değil,
  uygulamanın o adresi gerçekten karşılayıp karşılamadığına bakıyor.
  Üç parçadan biri eksik olsa bildirim yine 404'e giderdi.
*/
test('beğeni bildirimi paylaşımın KENDİSİNE gidiyor', () => {
  const adresGocu = oku('supabase/migrations/20261115010000_begeni_bildirimi_paylasim_adresi.sql');
  /* 1) Tetikleyici paylaşım kimliğini adrese yazıyor. */
  assert.match(adresGocu, /'\/paylasim\/' \|\| NEW\.post_id,\s*\n\s*'begeni:'/);
  assert.doesNotMatch(adresGocu, /'\/cv',/);

  /* 2) App.tsx o öneki bir ekrana bağlıyor. */
  const app = oku('src/App.tsx');
  assert.match(app, /temizYol\.startsWith\('\/paylasim\/'\)/);
  assert.match(app, /<PaylasimSayfasi/);

  /*
    3) Ara katman onu UYGULAMA adresi sayıyor.

    Bu olmadan Cloudflare gerçek bir paylaşıma da 404 dönerdi: sayfa
    yine açılırdı (404.html uygulamayı başlatıyor) ama durum kodu
    yanlış olurdu — `/profil/<ad>` adreslerinde ölçülen kusurun aynısı.
  */
  const araKatman = oku('functions/_middleware.ts');
  assert.match(araKatman, /temiz\.startsWith\('\/paylasim\/'\) *\) *return true;|temiz\.startsWith\('\/paylasim\/'\)\) return true;/);
});

test('eski beğeni bildirimleri de yeni adrese taşınıyor', () => {
  /*
    Yalnız tetikleyici düzeltilseydi kullanıcının BUGÜN zilinde duran
    satırlar eski davranışta kalırdı; düzeltme yeni bir beğeni gelene
    kadar görünmezdi. Üretimde 22 satır ölçüldü (28 Eylül 2026).
  */
  const adresGocu = oku('supabase/migrations/20261115010000_begeni_bildirimi_paylasim_adresi.sql');
  assert.match(adresGocu, /update public\.notifications/);
  assert.match(adresGocu, /set target_url = '\/paylasim\/' \|\| split_part\(dedupe_key, ':', 2\)/);

  /*
    SÜZGEÇLER DAR OLMALI: yanlış türdeki satıra, elle değiştirilmiş bir
    adrese ya da biçimsiz bir anahtara dokunulmuyor. Biçimsiz anahtar
    `/paylasim/` + boş dize üretir ve çalışmayan bir adres bırakırdı.
  */
  assert.match(adresGocu, /where type = 'paylasim_begeni'/);
  assert.match(adresGocu, /and target_url = '\/cv'/);
  assert.match(adresGocu, /and dedupe_key like 'begeni:%'/);
  assert.match(adresGocu, /split_part\(dedupe_key, ':', 2\) <> ''/);
});

test('bekleyen istekler geriye dönük bildirim alıyor', () => {
  /*
    Tetikleyici bugünden sonrasını yakalıyor. Hâlihazırda bekleyen
    istekler bildirimsiz kalmamalı; `dedupe_key` ikinci satırı
    engelliyor.
  */
  assert.match(goc, /select requester_id, addressee_id from public\.connections where durum = 'bekliyor'/);
});

test('zilin altındaki kabul/ret gerçek eyleme bağlı', () => {
  const merkez = oku('src/components/BildirimMerkezi.tsx');
  /* Eylemi olmayan düğme çizilmiyor. */
  assert.match(merkez, /b\.tur === 'baglanti_istegi' && onBaglantiYanitla &&/);
  /* Çift dokunma ikinci istek atmıyor. */
  assert.match(merkez, /disabled=\{islemdeki === b\.id\}/);

  /*
    YANITLANAN İSTEĞİN DÜĞMELERİ KALMIYOR

    Düğmeler yanıttan sonra da duruyordu; ikinci kez basınca sunucu
    haklı olarak "kayıt değişmedi" diyor ve hata yutulduğu için ekranda
    hiçbir şey olmuyordu — kullanıcıya takılmış gibi görünüyordu
    (bildirildi ve canlıda ölçüldü: istek kabul edilmiş, düğmeler
    yerinde).

    `okunduMu` bu iş için yetmiyor: satıra dokunmak da bildirimi okundu
    yapıyor, o zaman yanıtlamadan düğmeler kaybolurdu.
  */
  assert.match(merkez, /const \[sonuc, setSonuc\] = React\.useState<Record<string, BaglantiYanitSonucu>>\(\{\}\);/);
  assert.match(merkez, /onBaglantiYanitla && dugmeCizilsin\(b\) && \(/);

  /*
    "ZATEN KABUL EDİLMİŞ" BİR HATA DEĞİL

    `baglantiYanitla` yalnız `durum='bekliyor'` satırı güncelliyor;
    istek daha önce yanıtlandıysa hiçbir satır dönmüyor ve çağrı hata
    veriyor — ama BAĞLANTI KURULMUŞ olabilir. Ölçüldü (canlı): kullanıcı
    kabul etmiş, ekran "Bu istek artık geçerli değil" diyordu.

    Ayrım sunucuya sorularak yapılıyor; sonucu ÇAĞIRAN belirliyor,
    bileşen yalnız gösteriyor.
  */
  assert.match(merkez, /export type BaglantiYanitSonucu = 'kabul' \| 'red' \| 'gecersiz';/);
  assert.match(merkez, /const cikti = await onBaglantiYanitla\(bildirimId, karar\);/);
  assert.match(merkez, /kabul: 'Bağlantı kuruldu\. Tebrikler!'/);
  assert.match(merkez, /gecersiz: 'Bu istek artık geçerli değil\.'/);
  /* Başarı yeşil, geçersizlik kehribar: renk sonucu tekrar ediyor. */
  assert.match(merkez, /gosterilecekSonuc\(b\) === 'kabul'\s*\?\s*'text-emerald-700'/);

  /*
    SAYFA YENİLENİNCE DURUM KAYBOLMUYOR

    Yanıtın sonucu yalnız bileşenin belleğindeydi: yenileyince kabul
    edilmiş bir istek yeniden "Kabul et / Reddet" gösteriyordu
    (bildirildi ve canlıda ölçüldü). Bellek bir gerçeğin kaynağı
    olamaz; durum panel her açıldığında bağlantı listesinden
    türetiliyor — bildirim başına bir sorgu değil, panel başına bir.
  */
  assert.match(merkez, /export type IstekDurumu = 'bekliyor' \| 'kabul' \| 'yok';/);
  assert.match(merkez, /const dugmeCizilsin = \(b: Bildirim\) =>\s*!sonuc\[b\.id\] && \(istekDurumu\?\.\(b\) \?\? 'bekliyor'\) === 'bekliyor';/);
  /* Yerel sonuç yanıtın hemen ardından, sunucu durumu yenilemeden sonra. */
  assert.match(merkez, /if \(sonuc\[b\.id\]\) return sonuc\[b\.id\];/);

  const app2 = oku('src/App.tsx');
  assert.match(app2, /if \(!bildirim\.acik \|\| !kimlik\) return;/);
  assert.match(app2, /for \(const k of liste\.kabul\) harita\[k\.kisiId\] = 'kabul';/);
  assert.match(app2, /for \(const k of liste\.gelen\) harita\[k\.kisiId\] = 'bekliyor';/);
  assert.match(app2, /return baglantiHaritasi\[isteyen\] \?\? 'yok';/);
  assert.match(app2, /const bilgi = await baglantiDurumu\(isteyen\)\.catch\(\(\) => null\);/);
  assert.match(app2, /sonuc = bilgi\?\.durum === 'kabul' \? 'kabul' : 'gecersiz';/);
  /*
    Düğmeler satırın `<button>`ının İÇİNDE değil kardeşi: iç içe iki
    düğme geçersiz ve tıklama hedeflerini karıştırırdı.
  */
  const satir = merkez.slice(merkez.indexOf('onClick={() => onAc(b)}'));
  assert.ok(satir.indexOf('</button>') < satir.indexOf('Kabul et'), 'düğmeler satır düğmesinin içinde');

  const app = oku('src/App.tsx');
  assert.match(app, /onBaglantiYanitla=\{baglantiIsteginiYanitla\}/);
  /* İsteyen, olayın kimliğinden okunuyor. */
  assert.match(app, /const parcalar = \(satir\?\.anahtar \?\? ''\)\.split\(':'\)/);
  /* Üç iş sırayla: yanıtla, okundu yap, listeyi tazele. */
  assert.match(app, /await baglantiYanitla\(kimlik, isteyen, karar\);/);
  assert.match(app, /if \(satir\) await bildirim\.okunduYap\(satir\);\s*await bildirim\.ac\(\);/);
});
