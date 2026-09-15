import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/*
  SİTE HARİTASI HİJYENİ

  ÖLÇÜLDÜ (canlı, 14 Eylül 2026) — yayımlanan public/sitemap.xml:

    /kesfet/      99 adres   üçü örneklendi, hepsi HTTP 301
    /ilan/        62 adres   yayında 159 ilan var
    /sirket/      93 adres   geçerli 158 şirket sayfası var
    /firsatlar/  116 adres   üretilen sayfa 110; aradakilerden ikisi
                             HTTP 404 döndü

  Yani harita hem YÖNLENDİRİLMİŞ hem 404 veren adresler bildiriyor ve
  var olan yüzlerce sayfayı bildirmiyordu.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

test('/kesfet KAYNAĞINDA kalktı: kapanmış bölümün adresi üretilmiyor', () => {
  /*
    Bölüm 11 Eylül 2026'da kapandı ve /kesfet/* → /firsatlar 301 alıyor.
    Durağan listeden o tarihte çıkarılmış ama etkinlik DÖNGÜSÜ yerinde
    kalmıştı; harita her üretimde 99 yönlendirilmiş adres bildiriyordu.
    Aynı adres için "bunu tara" ve "başka yere git" demek çelişkili.
  */
  const uretici = oku('automation/sitemap.py');
  assert.doesNotMatch(uretici, /\/kesfet\/\{kacir/);
  assert.doesNotMatch(uretici, /discover_events/);
  /* Kayıtlar SİLİNMEDİ; yalnız adresleri bildirilmiyor. */
  assert.match(uretici, /adresleri artik bildirilmiyor/);
});

test('LASTMOD DERLEME TARİHİYLE DAMGALANMIYOR', () => {
  /*
    Uzlaştırma eksik adresleri `bugun` ile ekliyordu: her dağıtımda aynı
    adresler yeniden damgalanıyordu (ölçüldü: her derlemede "+169
    eklendi", canlı haritada 169 adres o günün tarihiyle). "Bu sayfa
    bugün değişti" demek, değişmediği hâlde tekrar taranmasını istemek
    ve sinyali değersizleştirmek.

    Eksik alan yanlış alandan iyidir: `lastmod` yoksa arama motoru kendi
    ölçümünü kullanıyor.
  */
  const betik = oku('scripts/onrender.mjs');
  const blok = betik.slice(betik.indexOf('const eksik = [...bizim]'), betik.indexOf('</urlset>', betik.indexOf('const eksik')));
  assert.doesNotMatch(blok, /<lastmod>/);
  /* Kullanılmayan değişken de kalmadı. */
  const kod = betik.replace(/\/\*[\s\S]*?\*\//g, ' ');
  assert.doesNotMatch(kod, /const bugun =/);
});

test('uzlaştırma /firsatlar/ ve /kesfet/ ailelerini de kapsıyor', () => {
  const betik = oku('scripts/onrender.mjs');
  assert.match(
    betik,
    /const AILELER = \['\/ilan\/', '\/sirket\/', '\/bolum\/', '\/rehber\/', '\/firsatlar\/', '\/kesfet\/'\];/,
  );
});

test('dağıtılan harita ile üretilen sayfalar birebir örtüşüyor', () => {
  const harita = path.join(KOK, 'dist', 'sitemap.xml');
  const klasor = path.join(KOK, 'dist', 'firsatlar');
  /* Derleme yapılmadan koşan testte bu dosyalar yok; sessizce geçiliyor. */
  if (!existsSync(harita) || !existsSync(klasor)) return;

  const xml = readFileSync(harita, 'utf8');
  const haritada = new Set(
    [...xml.matchAll(/<loc>https:\/\/stajimvar\.com\/firsatlar\/([^<]+)<\/loc>/g)].map((m) => m[1]),
  );
  const uretilen = new Set(
    readdirSync(klasor).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)),
  );

  /*
    İLİŞKİ ARTIK SİMETRİK DEĞİL — VE OLMAMALI

    Eskiden iki küme birebir eşitti, çünkü süresi geçen fırsatın sayfası
    hiç üretilmiyordu. O davranış canlıda ölçülen bir zarar üretiyordu
    (15 Eylül 2026): son başvuru tarihi gelen kayıtların adresi bir günde
    HTTP 404 oluyordu ve bunlardan biri arama sonuçlarında hâlâ gösterim
    alıyordu.

    Yeni kural `/ilan/` ailesindekiyle aynı: süresi geçen kaydın sayfası
    DURUYOR (200, metninde kapandığı yazıyor) ama site haritasına
    GİRMİYOR. Yani:

      haritadaki her adresin sayfası olmalı      → hâlâ KESİN kural
      her sayfanın haritada olması gerekmez      → kapanmışlar hariç

    Tek yönlü kalan iddia asıl korunması gereken: haritada 404 veren
    adres bulunmamalı.
  */
  const sayfasiOlmayanAdres = [...haritada].filter((s) => !uretilen.has(s));
  assert.deepEqual(sayfasiOlmayanAdres, [], 'haritada sayfası olmayan adres var');

  /*
    Haritada olmayan sayfaların HEPSİ kapanmış olmalı. Kapanmamış bir
    sayfanın haritadan düşmesi sessiz bir görünürlük kaybı olurdu; bu
    yüzden gerekçe sayfanın kendi metninden okunuyor.
  */
  const haritadaOlmayanSayfa = [...uretilen].filter((s) => !haritada.has(s));
  const gerekcesizDusen = haritadaOlmayanSayfa.filter((s) => {
    const html = readFileSync(path.join(klasor, `${s}.html`), 'utf8');
    return !html.includes('Başvuru dönemi kapandı');
  });
  assert.deepEqual(
    gerekcesizDusen,
    [],
    'haritada olmayan ama kapandığı yazmayan sayfa var'
  );

  /* Kapanmış bölümün adresi hiç yok. */
  assert.equal((xml.match(/\/kesfet\//g) || []).length, 0);
});
