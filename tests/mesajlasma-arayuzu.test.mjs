import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ortakAbone, acikAbonelikSayisi } from '../src/lib/ortak-abonelik.mjs';
import {
  gorulduMu,
  gunAyraci,
  istekHakki,
  kalanKarakter,
  kutuYolu,
  mesajKutusu,
  sonMesajOnizlemesi,
} from '../src/lib/mesaj-ekrani.mjs';

/*
  MESAJLAŞMA — ARAYÜZ (kullanıcı kararları 24 Eylül 2026: herkes yazabilir,
  bağlantı olmayanın mesajı "Mesaj istekleri"ne düşer; yalnız öğrenciler;
  yalnız metin)

  Arka uç (20261107010000) ve veri katmanı (`queries/mesajlasma.ts`) ayrı
  bir işte yazıldı; bu dosya arayüzün onları kurallarına uygun
  kullandığını ölçüyor. Yokluk iddiaları yorumsuz kaynakta.
*/

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
function yorumsuz(kaynak) {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*/gm, '$1');
}

const MESAJ_DIZINI = 'src/components/mesaj';
const dosyalar = readdirSync(path.join(KOK, MESAJ_DIZINI)).map((ad) => `${MESAJ_DIZINI}/${ad}`);
const ekran = oku(`${MESAJ_DIZINI}/SohbetEkrani.tsx`);
const liste = oku(`${MESAJ_DIZINI}/SohbetListesi.tsx`);
const kutu = oku(`${MESAJ_DIZINI}/MesajYazmaKutusu.tsx`);
const dinleme = oku(`${MESAJ_DIZINI}/mesajDinleme.ts`);
const dugme = oku(`${MESAJ_DIZINI}/MesajKutusuDugmesi.tsx`);
const sikayet = oku(`${MESAJ_DIZINI}/MesajSikayet.tsx`);
const sayfa = oku(`${MESAJ_DIZINI}/MesajlarSayfasi.tsx`);
const bildirim = oku('src/components/BildirimMerkezi.tsx');
const header = oku('src/components/Header.tsx');
const app = oku('src/App.tsx');

/* ------------------------------------------------------------------ */

test('arayüz tabloya yazmıyor ve Supabase istemcisine doğrudan dokunmuyor; yazma yalnız veri katmanının RPC fonksiyonlarından', () => {
  for (const dosya of dosyalar) {
    const kod = yorumsuz(oku(dosya));
    assert.doesNotMatch(kod, /\.from\(|\.insert\(|\.update\(|\.delete\(|\.rpc\(/, `${dosya}: tabloya ya da RPC'ye doğrudan erişim`);
    assert.doesNotMatch(kod, /from '[./]+lib\/supabase'/, `${dosya}: istemci içe aktarılmış`);
  }
  /* Yazan eylemler veri katmanından: gönder, kabul, sil, okundu, şikâyet. */
  for (const f of ['mesajGonder', 'istegiKabulEt', 'istegiSil', 'okunduIsaretle']) {
    assert.match(ekran, new RegExp(`${f}\\(`), `${f} ekranda kullanılmıyor`);
  }
  assert.match(sikayet, /await mesajiSikayetEt\(kullaniciId, mesajId, sebep, aciklama\)/);
});

test('iyimser kopya yok: mesaj ancak sunucunun döndürdüğü satırla ekleniyor', () => {
  const gonder = ekran.slice(ekran.indexOf('const gonder = async'), ekran.indexOf('/* ------------------------------------------------ istek bandı'));
  assert.ok(gonder.length > 0);
  const cagri = gonder.indexOf('const m = await mesajGonder(karsi.id, metin);');
  const ekleme = gonder.indexOf('setMesajlar((liste) => birlestir(liste, [m]));');
  assert.ok(cagri > 0 && ekleme > cagri, 'ekleme sunucu cevabından sonra olmalı');
  assert.equal((gonder.match(/setMesajlar\(/g) ?? []).length, 1);
  /* Realtime'dan gelen aynı satır kimlikle tekilleşiyor. */
  assert.match(ekran, /for \(const m of yeni\) harita\.set\(m\.id, m\);/);
  /* Yazma kutusu metni ancak gönderim çözülünce boşaltıyor; kendisi listeye eklemiyor. */
  assert.match(kutu, /await onGonder\(metin\);\s*setMetin\(''\);/);
  assert.doesNotMatch(yorumsuz(kutu), /setMesajlar|mesajGonder/);
});

test('okundu yalnız açık sohbette ve sekme görünürken', () => {
  assert.match(ekran, /if \(!sohbetId \|\| document\.visibilityState !== 'visible'\) return;\s*void okunduIsaretle\(sohbetId\)/);
  /* Liste, sayfa ve düğme hiçbir sohbeti okundu saymıyor. */
  for (const kaynak of [liste, sayfa, dugme, dinleme]) {
    assert.doesNotMatch(yorumsuz(kaynak), /okunduIsaretle/);
  }
  /* "Görüldü" yalnız AÇIK sohbette; okuma olayı da yalnız açık sohbette işleniyor. */
  assert.match(ekran, /ozet\?\.durum === 'acik' && sonKendi \? gorulduMu\(sonKendi\.olusturmaAni, ozet\.karsiOkunduAni\) : false/);
  assert.match(ekran, /setOzet\(\(o\) => \(o && o\.durum === 'acik' \? \{ \.\.\.o, karsiOkunduAni: olay\.an \} : o\)\);/);
});

test('abonelikler sökülürken kapanıyor ve hep ortak abonelikten geçiyor', () => {
  /* Veri katmanının dinleyicileri yalnız sarmalayıcıda çağrılıyor. */
  for (const dosya of dosyalar.filter((d) => !d.endsWith('mesajDinleme.ts'))) {
    assert.doesNotMatch(yorumsuz(oku(dosya)), /sohbetiDinle\(|gelenKutusunuDinle\(/, `${dosya}: doğrudan dinleme`);
  }
  assert.match(dinleme, /ortakAbone<null>\('gelen-kutusu'/);
  assert.match(dinleme, /ortakAbone<SohbetOlayi>\(\s*`sohbet:\$\{sohbetId\}`/);
  /* Effect'ler abonelikten dönen kapatma fonksiyonunu döndürüyor. */
  assert.match(ekran, /if \(!sohbetId\) return;\s*return sohbeteAbone\(sohbetId,/);
  assert.match(liste, /React\.useEffect\(\(\) => gelenKutusunaAbone\(\(\) => setOlay\(\(n\) => n \+ 1\)\), \[\]\);/);
  assert.match(dinleme, /return \(\) => \{\s*iptal = true;\s*birak\(\);\s*yerelBirak\(\);/);
});

test('ortak abonelik: iki dinleyici tek kanal; son dinleyici gidince bir tik sonra kapanıyor; çift effect kanalı devralıyor', async () => {
  let kurulum = 0;
  let kapanis = 0;
  let yay = null;
  const kur = (yayinla) => {
    kurulum += 1;
    yay = yayinla;
    return () => {
      kapanis += 1;
    };
  };
  const gelen = [];
  const bir = ortakAbone('deneme', kur, (o) => gelen.push(['bir', o]));
  const iki = ortakAbone('deneme', kur, (o) => gelen.push(['iki', o]));
  assert.equal(kurulum, 1, 'ikinci dinleyici yeni kanal açmamalı');
  yay('x');
  assert.deepEqual(gelen, [['bir', 'x'], ['iki', 'x']]);
  bir();
  bir(); /* ikinci çağrı etkisiz */
  iki();
  /* Aynı tikte yeniden gelen dinleyici (React çift effect) kanalı devralıyor. */
  const uc = ortakAbone('deneme', kur, () => {});
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(kurulum, 1);
  assert.equal(kapanis, 0);
  uc();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(kapanis, 1, 'son dinleyiciden sonra kanal kapanmalı');
  assert.equal(acikAbonelikSayisi(), 0);
});

test('rozet sayı bilinmiyorsa çizilmiyor; 0 uydurulmuyor', () => {
  assert.match(dugme, /const toplam = sayac \? sayac\.okunmamisSohbet \+ sayac\.bekleyenIstek : null;/);
  assert.match(dugme, /<BildirimRozeti sayi=\{toplam\} renk=\{renk\} \/>/);
  assert.match(bildirim, /if \(sayi === null \|\| sayi <= 0\) return null;/);
  assert.match(dinleme, /if \(!etkin\) \{\s*setSayac\(null\);/);
  /* Yalnız oturum açık öğrencide. */
  assert.match(header, /const mesajDugmesiCizilsin = isLoggedIn && userRole === 'student' && Boolean\(onNavigate\);/);
  /*
    Tek örnek: telefonda sol kümede, geniş ekranda sağ kümede (kullanıcı
    isteği, 25 Eylül 2026). Düğme kendi rozet aboneliğini açtığı için iki
    kopya çizilip biri gizlenmiyor; `genisEkran` hangisinin çizileceğini seçiyor.
  */
  assert.match(header, /\{!genisEkran && mesajDugmesiCizilsin && onNavigate && \(\s*<MesajKutusuDugmesi onNavigate=\{onNavigate\} \/>/);
  assert.match(header, /\{genisEkran && mesajDugmesiCizilsin && onNavigate && \(\s*<MesajKutusuDugmesi onNavigate=\{onNavigate\} \/>/);
  assert.equal((header.match(/<MesajKutusuDugmesi /g) ?? []).length, 2);
  /* Gerçek bağlantı: orta tuş ve yeni sekme. */
  assert.match(dugme, /href="\/mesajlar"/);
});

test('istek bandının iki hâli: alıcıya kabul/sil, başlatana sınır bilgisi', () => {
  /* Alıcı */
  assert.match(ekran, /const aliciyimIstekte = ozet\?\.durum === 'istek' && !ozet\.benBaslattim;/);
  assert.match(ekran, /sana mesaj göndermek istiyor\. Kabul edersen sohbet açılır; o da\s+mesajını gördüğünü bilir\. Yanıt yazarsan da istek kabul edilmiş olur\./);
  assert.match(ekran, /onClick=\{\(\) => void kabulEt\(\)\}\s*className=\{`\$\{HAP_BIRINCIL\}/);
  /* Sil onaylı: önce onay adımı, sonra istegiSil. */
  assert.match(ekran, /onClick=\{\(\) => setSilOnayi\(true\)\} className=\{HAP\}/);
  assert.match(ekran, /role="alertdialog" aria-label="İsteği sil"/);
  /* Başlatan */
  assert.match(ekran, /const baslatanimIstekte = ozet\?\.durum === 'istek' && ozet\.benBaslattim;/);
  assert.match(ekran, /Mesaj isteğin iletildi\. Kabul edilene kadar en çok \{ISTEK_MESAJ_SINIRI\} mesaj gönderebilirsin/);
  assert.match(ekran, /const kutuKapali = baslatanimIstekte && kalanHak === 0/);
  assert.match(ekran, /<MesajYazmaKutusu onGonder=\{gonder\} kapali=\{kutuKapali\} \/>/);
});

test('şikâyet akışı: yalnız karşının mesajında, dört sebep, dürüst onay cümlesi', () => {
  assert.match(ekran, /\{!benim && <MesajEylemMenusu kullaniciId=\{benId\} mesajId=\{m\.id\} \/>\}/);
  for (const etiket of ['Taciz', 'Spam', 'Uygunsuz içerik', 'Diğer']) {
    assert.ok(sikayet.includes(`etiket: '${etiket}'`), etiket);
  }
  assert.match(sikayet, /Açıklama \(isteğe bağlı\)/);
  assert.match(sikayet, /Şikâyetin iletildi\. Yönetim yalnız bu mesajı görebilir\./);
  /* Sebep seçilmeden gönderilemiyor; menü ve pencere odağı tetiğe döndürüyor. */
  assert.match(sikayet, /disabled=\{!sebep \|\| durum === 'gonderiliyor'\}/);
  assert.match(sikayet, /requestAnimationFrame\(\(\) => tetikRef\.current\?\.focus\(\)\)/);
  assert.match(sikayet, /aria-haspopup="menu"/);
});

test('yazma kutusu: Enter gönderir, Shift+Enter ve dokunmatikte Enter satır sonu; kilit; 44 piksel; kalan karakter', () => {
  assert.match(kutu, /if \(e\.key !== 'Enter' \|\| e\.shiftKey \|\| dokunmatik \|\| e\.nativeEvent\.isComposing\) return;/);
  assert.match(kutu, /const kilitli = gonderiliyor \|\| Boolean\(kapali\);/);
  assert.match(kutu, /min-h-11/);
  assert.match(kutu, /flex h-11 w-11 shrink-0/);
  assert.match(kutu, /maxLength=\{MESAJ_EN_UZUN\}/);
  assert.match(kutu, /sorun instanceof SosyalHata \? sorun\.message/);
});

test('rotalar bağlı; şirket ve öğrenci olmayan için dürüst ekran', () => {
  assert.match(app, /if \(temizYol === '\/mesajlar' \|\| temizYol\.startsWith\('\/mesajlar\/'\)\) \{/);
  /*
    İSTEK SEKMESİ SORGUDA (24 Eylül 2026 kararı): `/mesajlar?kutu=istekler`.
    Eski şart `/mesajlar/istekler` idi ve "istekler" adlı bir kullanıcıyla
    çakışıyordu; yol artık her kullanıcı adı için sohbet.
  */
  assert.match(app, /let mesajRotasi: \{ liste: true \} \| \{ kullaniciAdi: string \} = \{ liste: true \};/);
  assert.doesNotMatch(yorumsuz(app), /parca === 'istekler'/);
  for (const dosya of dosyalar) {
    assert.doesNotMatch(yorumsuz(oku(dosya)), /'\/mesajlar\/istekler'/, `${dosya}: eski istek adresi`);
  }
  assert.match(sayfa, /const kutu: SohbetKutusu = mesajKutusu\(window\.location\.search\);/);
  assert.match(sayfa, /window\.addEventListener\('popstate', yenidenCiz\)/);
  /* Sekmeler gerçek <a href>, adresleri yardımcıdan. */
  assert.match(liste, /yol: kutuYolu\('istekler'\)/);
  assert.match(liste, /href=\{s\.yol\}/);
  assert.match(sayfa, /setUygunluk\(satir && !satir\.sirketId \? 'ogrenci' : 'degil'\);/);
  assert.match(sayfa, /Mesajlaşma şimdilik yalnız öğrenciler arasında açık\./);
  assert.match(sayfa, /onGirisGerekli\?\.\(\);/);
});

/* ------------------------------------------------------------------ saf kurallar */

test('"Görüldü" yalnız okuma anı son kendi mesajından sonraysa', () => {
  assert.equal(gorulduMu('2026-09-24T10:00:00Z', '2026-09-24T10:05:00Z'), true);
  assert.equal(gorulduMu('2026-09-24T10:00:00Z', '2026-09-24T09:59:00Z'), false);
  assert.equal(gorulduMu('2026-09-24T10:00:00Z', null), false, 'istek aşamasında okuma anı yok');
  assert.equal(gorulduMu(null, '2026-09-24T10:05:00Z'), false);
});

test('tarih ayracı takvim gününe göre: Bugün, Dün, tarih', () => {
  const simdi = new Date(2026, 8, 24, 12, 0);
  assert.equal(gunAyraci(new Date(2026, 8, 24, 0, 5), simdi), 'Bugün');
  assert.equal(gunAyraci(new Date(2026, 8, 23, 23, 50), simdi), 'Dün');
  assert.equal(gunAyraci(new Date(2026, 8, 6, 15, 0), simdi), '6 Eylül 2026');
});

test('liste önizlemesi, kalan karakter ve istek hakkı', () => {
  assert.equal(sonMesajOnizlemesi('selam', true), 'Sen: selam');
  assert.equal(sonMesajOnizlemesi('selam', false), 'selam');
  assert.equal(sonMesajOnizlemesi(null, true), null);
  assert.equal(kalanKarakter('a'.repeat(1800), 2000), null);
  assert.equal(kalanKarakter('a'.repeat(1801), 2000), 199);
  assert.equal(istekHakki(0, 3), 3);
  assert.equal(istekHakki(3, 3), 0);
  assert.equal(istekHakki(5, 3), 0);
});

test('istek sekmesi sorgudan: kutu ayrıştırma ve adres', () => {
  assert.equal(mesajKutusu('?kutu=istekler'), 'istekler');
  assert.equal(mesajKutusu(''), 'gelen');
  assert.equal(mesajKutusu('?kutu=baska'), 'gelen');
  assert.equal(kutuYolu('istekler'), '/mesajlar?kutu=istekler');
  assert.equal(kutuYolu('gelen'), '/mesajlar');
});
