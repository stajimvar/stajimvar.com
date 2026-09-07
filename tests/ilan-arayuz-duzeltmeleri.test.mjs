import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { basvuruYolu } from '../src/lib/basvuru-yolu.mjs';

/*
  ARAYÜZ DÜZELTMELERİNİN NÖBETİ

  Buradaki iddiaların hepsi bir kez BOZULMUŞ davranışlar. Testler kaynağı
  okuyor: bu bileşenler bir tarayıcı, bir Supabase oturumu ve bir yönlendirici
  olmadan çizilemiyor, ama korunması gereken şey görsel değil — hangi öğenin
  hangi koşulda ÇİZİLİP çizilmediği. O da kaynakta görünür.
*/

const KOK = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const kart = oku('src/components/InternshipCard.tsx');
const detay = oku('src/components/ListingPage.tsx');
const reklam = oku('src/components/GoogleAdBanner.tsx');
const altNav = oku('src/ui/BottomNavigation.tsx');
const header = oku('src/components/Header.tsx');

/* ------------------------------------------------------------------ 1 */

test('DIŞ BAŞVURU: adres doğrudan resmî siteye, giriş kapısı yok', () => {
  const yol = basvuruYolu({ applicationMethod: 'external', applyUrl: 'https://kariyer.ornek.com/staj' });
  assert.equal(yol.anaEylem, 'resmi-site');
  assert.equal(yol.resmiAdres, 'https://kariyer.ornek.com/staj');
  assert.equal(yol.anaEtiket, 'Resmî sitede başvur');
  assert.equal(yol.teslimEdiliyor, false, 'dış başvuru şirkete iletilmiyor; öyle denmemeli');
});

test('dış başvuru düğmesi DisBaglanti (giriş kapısı) kullanmıyor', () => {
  /*
    Kapı buradaydı: misafir düğmeye basınca ilana değil kayıt ekranına
    gidiyordu. Kart ve ilan detayında dış bağlantı artık düz bir <a>.
  */
  /* Yorumlar atılıyor: eski kapıyı ANLATAN yorum, kapının kendisi değil. */
  const kod = kart.replace(/\/\*[\s\S]*?\*\//g, '');
  const disDal = kod.slice(kod.indexOf("if (yol.resmiAdres && yol.anaEylem === 'resmi-site')"));
  const govde = disDal.slice(0, disDal.indexOf('</a>'));
  assert.match(govde, /href=\{yol\.resmiAdres\}/);
  assert.match(govde, /target="_blank"/);
  assert.match(govde, /rel="noopener noreferrer nofollow"/);
  assert.doesNotMatch(govde, /DisBaglanti|girisGerekli|onGirisGerekli/);
  assert.doesNotMatch(kod, /import .*DisBaglanti/);
});

test('ADRESİ OLMAYAN İLANDA sahte dış CTA basılmıyor', () => {
  const yol = basvuruYolu({ applicationMethod: 'external', applyUrl: null });
  assert.equal(yol.resmiAdres, null);
  assert.notEqual(yol.anaEylem, 'resmi-site', 'adressiz ilanda dış düğme çizilmemeli');
  assert.equal(yol.anaEtiket, 'Başvurduğumu işaretle');
  /* Kart bu dala ancak resmiAdres VARSA giriyor. */
  assert.match(kart, /if \(yol\.resmiAdres && yol\.anaEylem === 'resmi-site'\)/);
});

test('internal ve email_application yolları bozulmadı', () => {
  const ic = basvuruYolu({ applicationMethod: 'internal', applyUrl: 'https://ornek.com' });
  assert.equal(ic.anaEylem, 'platform-ici');
  assert.equal(ic.teslimEdiliyor, true);

  /* E-posta teslimi henüz açık değil: kanal verilse de vaat verilmiyor. */
  const eposta = basvuruYolu({
    applicationMethod: 'email_application',
    applyUrl: 'https://ornek.com/staj',
    applicationChannelId: 'kanal-1',
  });
  assert.equal(eposta.anaEylem, 'resmi-site');
  assert.equal(eposta.teslimEdiliyor, false);
});

test('site içi başvuru hâlâ giriş istiyor — kaydı kime yazacağımız belli olmalı', () => {
  const app = oku('src/App.tsx');
  const kapi = app.slice(app.indexOf('const handleApplyToJob'), app.indexOf('const handleApplyToJob') + 400);
  assert.match(kapi, /if \(!session \|\| !activeStudent\)/);
  assert.match(kapi, /setIsAuthModalOpen\(true\)/);
});

/* ------------------------------------------------------------------ 2 */

test('REKLAM DOLMADAN KUTU YOK — boş çerçeve, etiket ve yükseklik çizilmiyor', () => {
  /*
    Ölçüldü (390px, onay verilmemiş): data-ad-status null kalıyor, <ins>
    140 piksel, sarmalayıcı 159 piksel. Yani kalıcı boş bir "Reklam"
    kutusu. Artık dolduğu doğrulanana kadar yüksekliği sıfır.
  */
  assert.match(reklam, /if \(!configured\) return null;/);
  assert.match(reklam, /data-ad-status/);
  assert.match(reklam, /setDoldu\(/);
  assert.match(reklam, /height: 0, overflow: 'hidden'/);
  assert.match(reklam, /\{doldu && /, 'Reklam etiketi yalnızca dolduğunda');
  assert.match(reklam, /minHeight: doldu \? spec\.minHeight : 0/);
});

test('reklamsız sayfalarda kalıcı bir yer tutucu bileşen kalmadı', () => {
  /* Geliştirmede çizilen sahte kutu da kalktı: dev ile üretim aynı görünsün. */
  assert.doesNotMatch(reklam, /REKLAM ALANI|placeholder-ad/i);
});

/* ------------------------------------------------------------------ 3 */

test('ilan kartı ve detayı tarihi merkezî biçimlendiriciden alıyor', () => {
  for (const [ad, kaynak] of [
    ['kart', kart],
    ['detay', detay],
  ]) {
    assert.match(kaynak, /import \{ tarihMetni \} from '\.\.\/lib\/tarih\.mjs'/, ad);
    assert.doesNotMatch(kaynak, /toLocaleDateString/, `${ad}: elle biçimlendirme kalmamalı`);
  }
});

/* ------------------------------------------------------------------ 4 */

test('BOŞ META SATIRI ÇİZİLMİYOR — "Kaynakta belirtilmemiş" tekrarı kalktı', () => {
  const govde = detay.slice(detay.indexOf('const sonBasvuru')).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(govde, /Kaynakta belirtilmemiş/, 'kutular artık boş değerle çizilmiyor');
  assert.match(detay, /\{ucretMetni && /);
  assert.match(detay, /\{zorunluStajMetni && /);
  assert.match(detay, /\{sureMetni && /);
  assert.match(detay, /\{sonBasvuru && /);
});

test('karar için gereken bilgi eksikse TEK dürüst not var', () => {
  assert.match(detay, /const eksikBilgiNotu =/);
  assert.match(detay, /Süre ve ödeme bilgisi resmî kaynakta açıklanmamış\./);
  /* Not tek satır: üç ayrı kutuda üç kez tekrar etmiyor. */
  const kez = (detay.match(/\{eksikBilgiNotu && /g) || []).length;
  assert.equal(kez, 1, 'not yalnızca bir kez basılmalı');
});

test('FALSE GERÇEK BİR DEĞER — "boş" sayılıp gizlenmiyor', () => {
  /*
    `isPaid: false` "ücretsiz" demek, "bilinmiyor" değil; `?? ''` ile
    boşa çevrilirse ücretsiz staj ücretli gibi sessizleşirdi. Bu yüzden
    ücret dalı isPaid'e AÇIKÇA bakıyor.
  */
  assert.match(detay, /listing\?\.stipend\?\.isPaid\s+\?/);
  assert.doesNotMatch(detay, /stipend\?\.isPaid \|\| /, 'false değeri || ile yutulmamalı');
  assert.match(detay, /listing\?\.mandatoryStajAccepted\s+\?/);
});

/* ------------------------------------------------------------------ 5 */

test('KARTIN TAMAMI DETAYA GİDİYOR ve "Detaylar" düğmesi kalktı', () => {
  assert.match(kart, /after:absolute after:inset-0/, 'gerilmiş bağlantı');
  assert.match(kart, /href=\{`\/ilan\/\$\{listingSlug\(listing\)\}`\}/, 'gerçek adres, tarayıcı gösterebilsin');
  assert.doesNotMatch(kart, />\s*Detaylar\s*</, 'ayrı Detaylar düğmesi kalmamalı');
});

test('kart bağlantısı yeni sekmede açılabiliyor ve klavyeyle erişiliyor', () => {
  /* Değiştirici tuşlar ve orta tık tarayıcıya bırakılıyor. */
  assert.match(kart, /e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey \|\| e\.button !== 0/);
  assert.match(kart, /focus-within:ring-2/, 'klavye odağı kartta görünmeli');
});

test('bağımsız eylemler örtünün üstünde kalıyor', () => {
  /* Kaydet ve başvur düğmesi gerilmiş bağlantının altında kalırsa tıklanamaz. */
  const kez = (kart.match(/relative z-10/g) || []).length;
  assert.ok(kez >= 2, `en az iki bağımsız eylem katmanı bekleniyordu, ${kez} bulundu`);
  assert.match(kart, /onClick=\{\(e\) => e\.stopPropagation\(\)\}/);
});

/* ------------------------------------------------------------------ 6 */

test('MOBİL SABİT ÇUBUK alt gezinmeyi kapatmıyor', () => {
  assert.match(detay, /lg:hidden fixed inset-x-0 bottom-0/);
  /*
    Yüzen alt gezinme `Header` içinde ve z-50; ilan detayı kendi
    başlığıyla açıldığı için o rotada hiç çizilmiyor (ölçüldü, 390px:
    sayfadaki tek sabit öğe bu çubuk). Yine de çubuk z-40 kalıyor:
    sayfa ileride kabuğun içine alınırsa gezinmenin altında durur.
  */
  assert.match(altNav, /z-50/);
  assert.match(header, /lg:hidden fixed bottom-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\][^']*z-50/);
  assert.match(detay, /lg:hidden fixed[^"]*z-40/, 'çubuk gezinmenin altında bir katmanda');
});

test('çubuk güvenli alanı hesaba katıyor — çentikli telefonda düğme kesilmiyor', () => {
  assert.match(detay, /pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/);
});

test('sayfa altında çubuk kadar boşluk var — son satır çubuğun altında kalmıyor', () => {
  /* Çubuk ölçüldü: 12 + 48 + 12 = 72 piksel; 96 onu artı nefes payını karşılıyor. */
  assert.match(detay, /pb-\[calc\(96px\+env\(safe-area-inset-bottom\)\)\] lg:pb-8/);
});

test('masaüstü görünümü değişmedi: eski eylem satırı lg üstünde duruyor', () => {
  assert.match(detay, /hidden lg:flex flex-col sm:flex-row gap-2\.5 sticky bottom-4/);
});

test('sabit çubuktaki dış başvuru da giriş istemeden resmî adrese gidiyor', () => {
  const cubuk = detay.slice(detay.indexOf('MOBİL SABİT BAŞVURU ÇUBUĞU'));
  assert.match(cubuk, /yol\.resmiAdres && yol\.anaEylem === 'resmi-site'/);
  assert.match(cubuk, /href=\{yol\.resmiAdres\}/);
  assert.match(cubuk, /rel="noopener noreferrer nofollow"/);
  assert.doesNotMatch(cubuk, /DisBaglanti|girisGerekli/);
});

test('adresi de olmayan ilanda çubuk BOŞ bir kabuk olarak çizilmiyor', () => {
  assert.match(detay, /\{listing && \(yol\.resmiAdres \|\| yol\.anaEylem !== 'resmi-site'\) && \(/);
});
