import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  PAYLAŞIMIN KALICI ADRESİ — /paylasim/<id>

  Beğeni bildirimi `/cv` adresine gidiyordu; bildirime dokunan kişi
  kendi ızgarasına düşüyor ve hangi paylaşımın beğenildiğini oradan
  kendisi bulmak zorunda kalıyordu. Şirket hesabında hiç çalışmıyordu:
  `/cv` şirket kabuğunda `/sirket/profil`e yönleniyor ve o ekranda
  paylaşım ızgarası yok.

  Bu testler dört şeyi koruyor: görünürlük kuralının istemciye
  KOPYALANMAMASI, ulaşılamayan paylaşımda bir şey UYDURULMAMASI, giriş
  gerektiren durumun "yok" ile karıştırılmaması ve akış kartının
  yeniden yazılmaması.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const sayfa = oku('src/components/sosyal/PaylasimSayfasi.tsx');

/*
  YOKLUK İDDİALARI YORUMLARA TAKILMASIN

  "Şu kalıp GEÇMİYOR" diyen bir iddia, gerekçeyi anlatan yorumda o
  sözcük geçtiği için kırılıyordu — dosyanın kendisi doğruyken. İddiayı
  gevşetmek yanlış olurdu (asıl korunan şey kaybolurdu); onun yerine
  yorumlar ve JSX yorumları çıkarılıp KOD'a bakılıyor.
*/
const kodu = (metin) =>
  metin
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

const sayfaKodu = kodu(sayfa);
const sorgular = oku('src/lib/queries/sosyal.ts');
const tekPaylasim = sorgular.slice(sorgular.indexOf('export async function paylasimiGetir'));

test('görünürlük kuralı istemciye kopyalanmıyor', () => {
  /*
    Satırı `posts` okuma politikası veriyor. İstemciye ikinci bir kural
    yazılsaydı iki tanım zamanla ayrışır ve kullanıcı ya sunucunun ona
    açtığı bir satırı göremez ya da tersi olurdu — aynı gerekçe
    `akisiGetir` içinde de yazılı.

    Aranan şey: sayfada bağlantı/sektör/engel kontrolü YOK.
  */
  assert.doesNotMatch(sayfaKodu, /baglanti|connections|sektor|engel/i);
  assert.doesNotMatch(tekPaylasim, /paylasim_gorunur|connections/);
});

test('ulaşılamayan paylaşımda hiçbir şey uydurulmuyor', () => {
  /*
    "Silinmiş paylaşım" yazmak bir iddia olurdu: politikanın satırı
    vermemesi ile paylaşımın silinmiş olması aynı şey değil ve ikisini
    istemciden ayırt edemiyoruz.
  */
  assert.doesNotMatch(sayfaKodu, /silinmiş paylaşım|Silinmiş/i);
  assert.match(sayfa, /Bu paylaşıma ulaşılamıyor\./);
  /* Yazar profili gelmediyse satır hiç çizilmiyor; ad uydurulmuyor. */
  assert.match(tekPaylasim, /if \(!profil\) return null;/);
});

test('GİRİŞ GEREKLİ ile ULAŞILAMIYOR ayrı ekranlar', () => {
  /*
    `posts` okuma politikası yalnız `authenticated` rolüne açık
    (ölçüldü, üretim 28 Eylül 2026). Çıkış yapmış ziyaretçiye hiçbir
    satır gelmiyor; ikisi tek cümleye indirgenseydi giriş yapmamış
    kullanıcıya "bu paylaşıma ulaşılamıyor" denirdi — oysa giriş yapsa
    ulaşabilir.
  */
  assert.match(sayfa, /'girisGerekli'/);
  assert.match(sayfa, /Bu paylaşımı görmek için giriş yap\./);
  /* Oturum kararı beklenmeden istek atılmıyor. */
  assert.match(sayfa, /if \(!oturumHazir\) return;/);
});

test('RESMÎ SESSİZLİK kalıcı adreste süzgeç DEĞİL', () => {
  /*
    Sessizlik "akışımı doldurma" demek, "bu bağlantıyı açamam" demek
    değil. Süzgeç buraya da konsaydı kullanıcının kendi tercihi,
    paylaşılmış bir bağlantının önünde duvara dönüşürdü. `akisiGetir`
    bu durumu adı konmuş bir gerekçeyle zaten öngörüyordu.
  */
  assert.doesNotMatch(tekPaylasim, /resmiSessiz/);
  assert.match(sorgular, /paylaşımın kalıcı adresi açıldığında/);
});

test('taslak ve arşiv kalıcı adresten açılmıyor', () => {
  /*
    Taslak yarım bir satır, gönderi değil — politika onu yazarına
    açıyor ve süzgeç olmasaydı kalıcı adres boş bir kart çizerdi. Arşiv
    "silme değil gizleme"; gizlenen şeyin kalıcı adresten açılması
    arşivi anlamsız kılardı.
  */
  assert.match(tekPaylasim, /\.eq\('durum', 'hazir'\)/);
  assert.match(tekPaylasim, /\.is\('archived_at', null\)/);
});

test('akış kartı yeniden yazılmıyor', () => {
  /*
    İkinci bir kart yazılsaydı akışta düzelen bir şey (mavi tik, şirket
    logosu yedeği, beğeni kilidi) burada eski hâliyle kalırdı.
  */
  assert.match(sayfa, /import \{ AkisKarti \} from '\.\/AkisKarti';/);
  assert.match(sayfa, /<AkisKarti/);
  /* Yedek avatar yalnız KENDİ paylaşımında; başkasının eski kolonu okunmuyor. */
  assert.match(sayfa, /paylasim\.yazarId === kullaniciId \? ogrenciAvatarAdresi : null/);
});

test('yazar alanları akıştaki sorguyla aynı', () => {
  /*
    İki yerde ayrı yazılsaydı kalıcı adreste örneğin mavi tik ya da
    şirket logosu eksik kalırdı.
  */
  for (const alan of ['username', 'gorunen_ad', 'avatar_path', 'resmi_mi', 'sirket_id', 'logo_url']) {
    assert.ok(tekPaylasim.includes(alan), `yazar alanı eksik: ${alan}`);
  }
});

test('geri düğmesi tarayıcı geçmişini kullanmıyor', () => {
  /*
    Bu adrese çoğunlukla DIŞARIDAN geliniyor (bildirim, paylaşılmış
    bağlantı) ve orada `history.back()` kullanıcıyı siteden atardı.
  */
  assert.doesNotMatch(sayfaKodu, /history\.back|window\.history/);
  assert.match(sayfa, /onNavigate\('\/agim'\)/);
});
