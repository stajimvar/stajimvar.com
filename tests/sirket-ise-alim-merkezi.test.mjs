import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PANO_ASAMALARI, asamaSayilari, asamayaGore, panoyaDiz } from '../src/lib/basvuru-panosu.mjs';
import { BEKLEME_ESIKLERI, asilanEsik, beklemeGunu, bekliyorMu } from '../src/lib/bekleyen-basvuru.mjs';

/*
  ŞİRKETİN İŞE ALIM MERKEZİ — AŞAMA 1

  Paketin ilk aşaması iki şey getiriyor: ekip rolünün SUNUCUDA
  uygulanması ve başvuruların ilan × aşama panosu.

  Bu testler dört şeyi koruyor: rolün sunucuda okunması, Viewer'ın
  yazamaması, panonun gerçek sayılarla çalışması ve önyargısız
  incelemenin ikinci ekranda da AYNI yerden gelmesi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

/* Yokluk iddiaları gerekçe yorumlarına takılmasın. */
const kodu = (metin) =>
  metin
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*(--|\/\/).*$/gm, ' ');

const GOC = oku('supabase/migrations/20261122010000_sirket_ekip_yetkisi.sql');
const VERI = oku('src/lib/sirket-veri.ts');
const PANEL = oku('src/sirket/SirketPaneli.tsx');
const PANO = oku('src/sirket/BasvuruPanosu.tsx');

/* ------------------------------------------------- aşama eşlemesi */

test('dokuz durumun hepsi bir aşamaya düşüyor', () => {
  /*
    `application_status` dokuz değer taşıyor. Biri eşlenmemiş kalsaydı
    o başvuru panodan kaybolurdu — ekranda olmayan bir iş, yapılmamış
    iş demek.
  */
  const hepsi = [
    'submitted', 'under_review', 'technical_assessment', 'interview_scheduled',
    'offer_extended', 'offer_accepted', 'offer_declined', 'rejected', 'withdrawn',
  ];
  const anahtarlar = new Set(PANO_ASAMALARI.map((a) => a.anahtar));
  for (const d of hepsi) {
    assert.ok(anahtarlar.has(asamayaGore(d)), `${d} bilinen bir aşamaya düşmeli`);
  }
});

test('TANINMAYAN DURUM KAYBOLMUYOR, en görünür yerde kalıyor', () => {
  /*
    Yeni bir durum değeri eklenirse başvuru panodan düşmek yerine
    'Yeni' sütununda duruyor — gözden kaçmasın diye en başta.
  */
  assert.equal(asamayaGore('bilinmeyen_durum'), 'yeni');
  assert.equal(asamayaGore(''), 'yeni');
  assert.equal(asamayaGore(null), 'yeni');
  assert.equal(asamayaGore(undefined), 'yeni');
});

test('sonuçlanan dört durum tek sütunda toplanıyor', () => {
  /* Hepsinde yapılacak iş yok; ayrımları çipin rozetinde duruyor. */
  for (const d of ['offer_accepted', 'offer_declined', 'rejected', 'withdrawn']) {
    assert.equal(asamayaGore(d), 'sonuclandi');
  }
});

/* ------------------------------------------------- ilan kırılımı */

test('başvurular ilana göre öbekleniyor, yığılma üstte', () => {
  const ilanlar = [
    { id: 'i1', title: 'Yazılım Stajyeri' },
    { id: 'i2', title: 'Pazarlama Stajyeri' },
  ];
  const kartlar = [
    { id: 'a', listing_id: 'i2', status: 'submitted' },
    { id: 'b', listing_id: 'i1', status: 'submitted' },
    { id: 'c', listing_id: 'i1', status: 'under_review' },
    { id: 'd', listing_id: 'i1', status: 'rejected' },
  ];
  const bloklar = panoyaDiz(kartlar, ilanlar);
  assert.equal(bloklar.length, 2);
  /* En çok başvurusu olan ilan önce: İK'nın ilk bakacağı yer orası. */
  assert.equal(bloklar[0].ilanAdi, 'Yazılım Stajyeri');
  assert.equal(bloklar[0].toplam, 3);
  assert.equal(bloklar[1].toplam, 1);
});

test('İLANI BULUNAMAYAN BAŞVURU DÜŞÜRÜLMÜYOR', () => {
  /*
    İlan listesi süzülmüş ya da eksik gelmiş olabilir. Başvuruyu
    panodan silmek, var olan bir işi yok göstermek olurdu.
  */
  const bloklar = panoyaDiz(
    [{ id: 'a', listing_id: 'yok-boyle-ilan', status: 'submitted' }],
    [{ id: 'i1', title: 'Yazılım Stajyeri' }],
  );
  assert.equal(bloklar.length, 1);
  assert.equal(bloklar[0].toplam, 1);
  assert.match(bloklar[0].ilanAdi, /olmayan ilan/);
});

test('aşama sayıları GERÇEK; boş aşama 0 ile duruyor', () => {
  /*
    Boş olduğunu görmek de bilgi — örneğin hiç görüşmeye geçilmemiş
    bir ilan. Anahtar düşürülseydi ekran her ilanda farklı sayıda
    sütun çizerdi.
  */
  const s = asamaSayilari([
    { status: 'submitted' }, { status: 'submitted' }, { status: 'rejected' },
  ]);
  assert.equal(s.yeni, 2);
  assert.equal(s.sonuclandi, 1);
  assert.equal(s.gorusme, 0);
  assert.equal(Object.keys(s).length, PANO_ASAMALARI.length);
});

/* ------------------------------------------------- rol yetkisi */

test('ROL SUNUCUDA OKUNUYOR, arayüzde değil', () => {
  /*
    Arayüzde düğmeyi gizlemek yetmez: PostgREST'e doğrudan istek atan
    bir Viewer yine yazabilirdi.
  */
  assert.match(GOC, /create or replace function public\.sirket_basvuru_yazabilir/);
  assert.match(GOC, /in \('Owner', 'Recruiter'\)/);
  /* Güncelleme politikası artık üyelik değil YETKİ soruyor. */
  assert.match(GOC, /create policy "dogrulanmis sirket basvuru durumu gunceller"/);
  assert.match(GOC, /public\.sirket_basvuru_yazabilir\(l\.company_id\)/);
});

test('OKUMA DARALTILMIYOR: Viewer başvuruları görmeye devam ediyor', () => {
  /* Rolün amacı "görsün ama karışmasın". */
  assert.doesNotMatch(kodu(GOC), /drop policy[^\n]*sirket basvurulari gorur/);
  assert.doesNotMatch(kodu(GOC), /for select/);
});

test('boş/tanınmayan rol en DAR yetkiye düşüyor', () => {
  /*
    Varsayılanı geniş tutmak, veri bozulduğunda yetkiyi genişletirdi.
    Aynı kural hem sunucuda hem istemcide.
  */
  assert.match(GOC, /coalesce\(nullif\(btrim\(cm\.recruiter_role\), ''\), 'Viewer'\)/);
  assert.match(VERI, /TANINAN_ROLLER\.includes\(ham\) \? ham : 'Viewer'/);
});

test('is_owner bayrağı sahibi kilitlemiyor', () => {
  /*
    Sahipleri işaretleyen göçler (0011, 20260902010000) o bayrağı
    kuruyor; rol metni ileride boş kalırsa sahip dışarıda kalmamalı.
  */
  assert.match(GOC, /cm\.is_owner or coalesce/);
  assert.match(VERI, /if \(uyelik\.is_owner\) return true;/);
});

test('GEÇİŞ KURALI TETİKLEYİCİDE KALDI, politikaya taşınmadı', () => {
  /*
    20260914020000 kuralı bilerek tetikleyiciye taşımıştı: geçiş eski
    ve yeni değeri birlikte görmek zorunda, politika bunu yapamaz.
    Bu göç o kararı geri almıyor.
  */
  assert.doesNotMatch(kodu(GOC), /status not in|drop trigger/);
});

/* ------------------------------------------------- arayüz */

test('VIEWER yazma ekranına hiç girmiyor', () => {
  /*
    Düğmeleri çizip sunucuda reddettirmek, çalışmayan düğme göstermek
    olurdu. Viewer panoya gidiyor; panoda eylem düğmesi yok.
  */
  assert.match(PANEL, /if \(!baglam\.basvuruYazabilir\) \{/);
  assert.match(PANEL, /Görüntüleme yetkisi/);
  /*
    ÇİPLER DÜĞME BİLE OLMUYOR.

    Önce `onAday={() => undefined}` geçiliyordu; tarayıcıda görüldü ki
    çipler yine <button> olarak çiziliyor ve tıklanınca sessizce hiçbir
    şey yapmıyordu — dokunulabilir görünen ölü hedef. Artık prop HİÇ
    geçilmiyor ve `AdayCipi` düz satır çiziyor (ölçüldü: Owner'da 6
    tıklanabilir çip, Viewer'da 0; 18 aday satırı yine görünüyor).
  */
  assert.doesNotMatch(kodu(PANEL), /onAday=\{\(\) => undefined\}/);
  assert.match(PANO, /onAc\?: \(id: string\) => void;/);
  assert.match(PANO, /\{onAc \? \(/);
});

test('LİSTE KALDI: pano onun yerine geçmedi', () => {
  /*
    Izgara tek adayla çalışmanın yeri (kısayollar, çekmece); pano
    dağılımı görmenin yeri. Birini ötekinin yerine koymak çalışan bir
    akışı bozardı.
  */
  assert.match(PANEL, /<AdayIzgarasi/);
  assert.match(PANEL, /<BasvuruPanosu/);
  assert.match(PANEL, /useState<'liste' \| 'pano'>\('liste'\)/);
});

test('ÇEKMECE ÇOĞALTILMADI: pano derin bağlantıya devrediyor', () => {
  /*
    1750 satırlık çekmeceyi kopyalamak, durum/not/teklif akışını iki
    yerde ayrı sürdürmek demekti.
  */
  assert.match(PANEL, /\/sirket\/basvuranlar\?aday=\$\{encodeURIComponent\(id\)\}/);
  assert.doesNotMatch(kodu(PANO), /AdayCekmecesi/);
});

test('ÖNYARGISIZ İNCELEME aynı yerden geliyor', () => {
  /*
    Pano kendi gizleme kuralını yazmıyor; ızgarayla aynı `onyargisizla`
    işlevini çağırıyor. Biri değişirse öteki de değişiyor.
  */
  assert.match(PANO, /import \{ onyargisizla \} from '\.\.\/lib\/aday-kart\.mjs';/);
  assert.match(PANO, /onyargisiz \? onyargisizla\(k\) : k/);
  /*
    KART İKİNCİ KEZ ÇEVRİLMİYOR. Pano önce `kartVerisi`yi de çağırıyordu;
    kartlar yukarıda (SirketPaneli) çoktan çevrilmiş geldiği için ikinci
    çağrı `profile_snapshot`/`listing_id` gibi HAM alanları arıyor,
    bulamıyor ve adı null'a düşürüyordu — fikstürde her satır "Aday"
    görünüyordu. `AdayIzgarasi` de çevirmiyor; iki ekran aynı sözleşmede.
  */
  assert.doesNotMatch(kodu(PANO), /kartVerisi/);
  /* Ad gizliyken uydurma bir isim yazılmıyor. */
  assert.match(PANO, /kart\.ad \?\? 'Aday'/);
});

test('göç numarası çakışmıyor ve sonuncu', () => {
  /*
    20261121010000 zaten alınmıştı (basvuru_aday_incelemesi) ve
    uygulanmış en yüksek sürüm de oydu. Aynı numarayla ikinci dosya
    `db push`u durdurur ve dağıtım sessizce atlanır.
  */
  const dizin = path.join(KOK, 'supabase/migrations');
  const hepsi = fs.readdirSync(dizin).filter((f) => f.endsWith('.sql')).sort();
  const surumler = hepsi.map((f) => f.split('_')[0]);
  assert.equal(new Set(surumler).size, surumler.length, 'sürüm numarası tekrar etmemeli');

  /*
    "SONUNCU OLSUN" DEMİYOR.

    Önce `hepsi.at(-1)` ile ekip yetkisi göçünün sonuncu olması
    isteniyordu; paketin ikinci aşaması (sorumlu atama) eklenince kırıldı,
    oysa o göçte yanlış bir şey yoktu. Korunan şey SIRA: bu paketin
    göçleri, uygulanmış en yüksek sürümden (20261121010000) BÜYÜK olmalı
    — küçük olsalardı `db push` "history divergence" ile durur ve dağıtım
    sessizce atlanırdı.
  */
  const UYGULANMIS_EN_YUKSEK = '20261121010000';
  for (const f of ['20261122010000_sirket_ekip_yetkisi.sql', '20261123010000_basvuru_sorumlusu.sql']) {
    assert.ok(hepsi.includes(f), `${f} bulunmalı`);
    assert.ok(f.split('_')[0] > UYGULANMIS_EN_YUKSEK, `${f} uygulanmış sürümden büyük olmalı`);
  }
});

/* ============================================ AŞAMA 2: SORUMLU ATAMA */

const GOC2 = oku('supabase/migrations/20261123010000_basvuru_sorumlusu.sql');

test('EŞZAMANLI ATAMA sessizce ezilmiyor', () => {
  /*
    İki kişi aynı anda sorumlu atadığında sonuncusu ötekini eziyordu ve
    ekranda kimin kazandığı görünmüyordu. RPC çağıranın GÖRDÜĞÜ değeri
    de alıyor; satır o değerde değilse yazmıyor.
  */
  assert.match(GOC2, /p_beklenen uuid default null/);
  assert.match(GOC2, /if satir\.atanan_uye is distinct from p_beklenen then/);
  assert.match(GOC2, /raise exception 'sorumlu-degisti'/);
  /* Kontrol ile yazma arasına ikinci işlem giremesin. */
  assert.match(GOC2, /for update;/);
});

test('VIEWER\'A İŞ ATANMIYOR, BAŞKA ŞİRKETE DE', () => {
  /*
    Sorumlu, başvuruya yazabilen biri olmak zorunda: Viewer'a iş atamak
    yapamayacağı işi ona yazmak olurdu. Üyelik şirket kimliğiyle
    sorgulanıyor, yani başka şirketin üyesi atanamıyor.
  */
  assert.match(GOC2, /where cm\.company_id = sirket\s*\n\s*and cm\.user_id = p_uye/);
  assert.match(GOC2, /in \('Owner', 'Recruiter'\)/);
  assert.match(GOC2, /raise exception 'uye-uygun-degil'/);
  /* Atamayı YAPAN da yazabilmeli. */
  assert.match(GOC2, /if not public\.sirket_basvuru_yazabilir\(sirket\) then/);
});

test('atama KALDIRMA her zaman geçerli', () => {
  /* `p_uye` null ise üye kontrolü atlanıyor; sorumluyu bırakmak engellenemez. */
  assert.match(GOC2, /if p_uye is not null and not exists/);
  assert.match(GOC2, /atanan_at  = case when p_uye is null then null else now\(\) end/);
});

test('üye silinince başvuru SİLİNMİYOR, sorumlusuz kalıyor', () => {
  /* Cascade, bir üyenin ayrılmasıyla başvuruları silerdi. */
  assert.match(GOC2, /atanan_uye uuid references public\.profiles\(id\) on delete set null/);
});

test('EKİP ADLARI yalnız üyeye ve yalnız kendi şirketine açık', () => {
  /*
    `profiles` satırı yalnız kendine açık; takım arkadaşının adı ancak
    bu RPC'den geliyor. E-posta dönmüyor: atama için ad ve rol yetiyor.
  */
  assert.match(GOC2, /and public\.is_company_member\(p_sirket\)/);
  const fn = GOC2.slice(GOC2.indexOf('function public.sirket_ekibi'), GOC2.indexOf('basvuru_sorumlusu_ata'));
  assert.doesNotMatch(fn, /email/i);
});

test('İŞ YÜKÜ GERÇEK: sonuçlanan işler düşüyor, sorumlusuz ayrı', () => {
  /*
    Yapılacak iş kalmayan başvuru yük değil. Sorumlusu olmayanlar ayrı
    satırda; toplamın içinde eritmek dağıtılmayı bekleyen işi görünmez
    kılardı.
  */
  assert.match(GOC2, /a\.status not in \('offer_accepted', 'offer_declined', 'rejected', 'withdrawn'\)/);
  assert.match(GOC2, /when a\.atanan_uye is null then 'Sorumlusu yok'/);
});

test('yazma YALNIZ RPC\'den: tabloya doğrudan atama yolu yok', () => {
  /*
    Kolon eklendi ama güncelleme politikası değişmedi; atama kuralları
    (eşzamanlılık, üye uygunluğu) yalnız RPC'de duruyor.
  */
  assert.doesNotMatch(kodu(GOC2), /create policy/);
  assert.match(GOC2, /security definer/);
});

test('SORUMLUSU YOK süzgeci ve sayısı gerçek', () => {
  /*
    Süzgeç tek satırlık üçlü ifadeden zincire döndü (Aşama 3): artık
    "sorumlusu yok" ile "bekleyenler" BİRLİKTE uygulanabiliyor ve
    "sorumlusu yok VE bekliyor" en acil kümeyi veriyor.
  */
  assert.match(PANO, /if \(yalnizSorumlusuz\) l = l\.filter\(\(k\) => !k\.atananUye\);/);
  assert.match(PANO, /Yalnızca sorumlusu olmayanlar/);
  /* Süzgeç kapalıyken de kaç iş beklediği görünüyor. */
  assert.match(PANO, /kartlar\.filter\(\(k\) => !k\.atananUye\)\.length/);
});

test('atama kutusu YALNIZ yazabilen üyeleri listeliyor', () => {
  /* Sunucudaki kuralın istemci kopyası; ikisi ayrışırsa kutu reddedilen
     bir seçenek sunar. */
  assert.match(PANO, /ekip\.filter\(\(u\) => u\.yazabilir\)/);
});

test('VIEWER sorumluyu görüyor, değiştiremiyor', () => {
  /*
    Ekip veriliyor (ad görünsün) ama `onSorumlu` verilmiyor; kutu salt
    okunur metne düşüyor. No-op bir işlev geçmek ölü kontrol bırakırdı.
  */
  const viewerDali = PANEL.slice(PANEL.indexOf('if (!baglam.basvuruYazabilir)'), PANEL.indexOf('BAŞLIK BİR KEZ'));
  assert.match(viewerDali, /ekip=\{ekip\}/);
  assert.doesNotMatch(kodu(viewerDali), /onSorumlu=/);
  /* Kutu yerine metin: "Sorumlu: <ad>" ya da "yok". */
  assert.match(PANO, /Sorumlu: \{sorumlu \? \(adlar\.get\(sorumlu\) \?\? 'Ekip üyesi'\) : 'yok'\}/);
});

test('atama kutusu ÇİPİN İÇİNDE değil', () => {
  /*
    İç içe iki etkileşim (düğmenin içinde açılır kutu) tıklama
    hedeflerini karıştırır ve klavyeyle kutuya ulaşmak çekmeceyi açardı.
  */
  const cip = PANO.slice(PANO.indexOf('const AdayCipi'), PANO.indexOf('/** Tek ilanın aşama sütunları'));
  const dugmeSonu = cip.indexOf('</button>');
  const selectYeri = cip.indexOf('<select');
  assert.ok(dugmeSonu > 0 && selectYeri > dugmeSonu, 'select düğmenin dışında olmalı');
});

test('iş yükü sunucudan; istemcide türetilmiyor', () => {
  /*
    Ekranın gördüğü liste süzülmüş olabilir; süzülmüş listeden
    hesaplanan yük yanlış olurdu.
  */
  assert.match(PANEL, /isYuku\.map\(\(y\) =>/);
  assert.doesNotMatch(kodu(PANEL), /kartlar\.filter[^\n]*atananUye[^\n]*\.length/);
});

/* ===================================== AŞAMA 3: BEKLEYEN HATIRLATMASI */

const GOC3 = oku('supabase/migrations/20261124010000_bekleyen_basvuru_hatirlatmasi.sql');
const AKIS = oku('.github/workflows/bekleyen-basvuru-hatirlatmasi.yml');

const gunOnce = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

test('BİLDİRİM YAĞMURU YOK: her eşik en çok bir kez', () => {
  /*
    Anahtar başvuru + eşik + alıcı. Aynı başvuru aynı eşikte ikinci kez
    bildirim üretmiyor; ömrü boyunca en çok üç hatırlatma geliyor ve
    30 günden sonra susuyor.
  */
  assert.match(GOC3, /'bekleyen:' \|\| h\.basvuru_id::text \|\| ':' \|\| h\.esik::text \|\| ':' \|\| h\.alici::text/);
  assert.match(GOC3, /on conflict \(dedupe_key\) where dedupe_key is not null do nothing/);
  assert.equal(BEKLEME_ESIKLERI.length, 3);
});

test('YALNIZ EN YÜKSEK EŞİK yazılıyor', () => {
  /*
    50 gündür bekleyen bir başvuru ilk koşuda üç bildirim birden
    üretmiyor. Üçünü de yazmak, geçmişi bugünün zil sesine çevirirdi.
    Üretimde böyle bir kayıt VAR (ölçüldü: en eskisi 50 gün).
  */
  /*
    ÖLÇÜ 20261127010000'DE DEĞİŞTİ: `updated_at` yerine
    `aday_ilerleme_at`. Eşiklerin kendisi aynı; burada sınanan şey
    hangi alanın okunduğu değil, hangi eşiğin seçildiği.
  */
  assert.match(GOC3, /then 30/);
  assert.equal(asilanEsik({ durum: 'submitted', adayIlerlemesi: gunOnce(50) }), 30);
  assert.equal(asilanEsik({ durum: 'submitted', adayIlerlemesi: gunOnce(9) }), 7);
  assert.equal(asilanEsik({ durum: 'submitted', adayIlerlemesi: gunOnce(3) }), null);
});

test('SONUÇLANMIŞ BAŞVURU hatırlatılmıyor', () => {
  /*
    Teklif kabul/ret, red ve geri çekmede yapılacak iş kalmıyor.
    Üretimde 34 gündür duran bir `offer_accepted` var; o hatırlatılmamalı.
    Liste panodaki 'sonuclandi' aşamasıyla AYNI yerden geliyor.
  */
  assert.match(GOC3, /a\.status not in \('offer_accepted', 'offer_declined', 'rejected', 'withdrawn'\)/);
  for (const d of ['offer_accepted', 'offer_declined', 'rejected', 'withdrawn']) {
    assert.equal(bekliyorMu({ durum: d, adayIlerlemesi: gunOnce(100) }), false, `${d} beklemiyor olmalı`);
  }
  assert.equal(bekliyorMu({ durum: 'interview_scheduled', adayIlerlemesi: gunOnce(34) }), true);
});

test('GERÇEK TARİH: bilinmeyen tarihten gün sayılmıyor', () => {
  /*
    Ne ilerleme damgası ne başvuru tarihi varsa başvuru "bekliyor"
    SAYILMIYOR — uydurma bir hareketsizlik ölçüsü yok.
  */
  assert.equal(beklemeGunu({ durum: 'submitted' }), null);
  assert.equal(bekliyorMu({ durum: 'submitted' }), false);
  /* Gelecek tarih negatife düşmüyor. */
  assert.equal(beklemeGunu({ durum: 'submitted', adayIlerlemesi: gunOnce(-5) }), 0);
  /* Aşağı yuvarlanıyor: eşiği aşmamışı aşmış göstermiyor. */
  assert.equal(beklemeGunu({ durum: 'submitted', adayIlerlemesi: gunOnce(6.9) }), 6);
});

test('ALICI: sorumlu varsa o, yoksa ŞİRKET SAHİPLERİ', () => {
  /*
    Sorumsuz işi kimseye yazmamak, tam da unutulan işi sessiz bırakmak
    olurdu. Recruiter'lara toplu yazılmıyor: herkese giden hatırlatma
    kimsenin üstlenmediği hatırlatmadır.
  */
  assert.match(GOC3, /where b\.esik is not null and b\.atanan_uye is not null/);
  assert.match(GOC3, /on cm\.company_id = b\.company_id and cm\.is_owner/);
  assert.match(GOC3, /where b\.esik is not null and b\.atanan_uye is null/);
});

test('RPC YALNIZ service_role tarafından çağrılabiliyor', () => {
  /*
    `authenticated`a açılsaydı herhangi bir kullanıcı istediği an
    bildirim ürettirebilirdi — hız sınırı olmayan bir bildirim kapısı.
  */
  assert.match(GOC3, /revoke all on function public\.bekleyen_basvuru_hatirlatmalari\(\) from public, anon, authenticated;/);
  assert.doesNotMatch(kodu(GOC3), /grant execute on function public\.bekleyen_basvuru_hatirlatmalari/);
});

test('İSTEMCİ ve SUNUCU aynı eşikleri kullanıyor', () => {
  /*
    İki yerde ayrı tanımlansaydı ekranda "9 gündür bekliyor" yazarken
    bildirim gelmemiş olabilirdi.
  */
  for (const e of BEKLEME_ESIKLERI) {
    assert.match(GOC3, new RegExp(`interval '${e} days'`), `sunucuda ${e} günlük eşik olmalı`);
  }
});

test('EKRAN bildirime bağlı değil', () => {
  /*
    GitHub cron'u gecikebiliyor. Panodaki süzgeç aynı bilgiyi hatırlatma
    gelmeden de gösteriyor; rozet yalnız eşiği aşmışta çiziliyor.
  */
  assert.match(PANO, /yalnizBekleyen/);
  assert.match(PANO, /\{BEKLEME_ESIKLERI\[0\]\} gündür bekleyenler/);
  assert.match(PANO, /bekleyenGun !== null && \(/);
  assert.match(AKIS, /cron: "0 7 \* \* \*"/);
});

test('zamanlama GÜNDE BİR; saatlik değil', () => {
  /*
    Bekleme süresi gün cinsinden; saatlik koşu aynı eşiği defalarca
    sorardı ve dedupe dışında kazancı olmazdı.
  */
  const cronlar = [...AKIS.matchAll(/cron: "([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(cronlar, ['0 7 * * *']);
});

test('betik dış servis çağırmıyor', () => {
  const betik = oku('scripts/bekleyen-basvuru-hatirlatmasi.mjs');
  const adresler = [...betik.matchAll(/fetch\(`?([^`,)]+)/g)].map((m) => m[1]);
  assert.equal(adresler.length, 1, 'tek istek olmalı');
  assert.match(adresler[0], /SUPABASE_URL|ADRES/);
  assert.doesNotMatch(kodu(betik), /openai|anthropic|api\.(?!supabase)/i);
});

/* ============================ AŞAMA 4: DEĞERLENDİRME FORMU */

const GOC4 = oku('supabase/migrations/20261125010000_basvuru_degerlendirmesi.sql');
const FORM = oku('src/sirket/DegerlendirmeFormu.tsx');

test('SAHTE VE YAPAY ZEKÂ PUANI YOK', () => {
  /*
    Her puanın yanında onu veren kişi ve anı duruyor. Otomatik,
    türetilmiş ya da dış servisten gelen puan yok; `match_score` alanına
    bu göç hiç dokunmuyor.
  */
  assert.match(GOC4, /degerlendiren  uuid not null references public\.profiles\(id\)/);
  assert.doesNotMatch(kodu(GOC4), /match_score/);
  assert.doesNotMatch(kodu(GOC4), /openai|gpt|embedding|ai_/i);
  assert.doesNotMatch(kodu(FORM), /openai|otomatikPuan|tahmin/i);
});

test('ORTALAMA ÜRETİLMİYOR', () => {
  /*
    Ölçütler aynı ağırlıkta değil ve şirket onlara ağırlık vermedi; tek
    bir sayı üretmek olmayan bir ölçüm iddia etmek olurdu.
  */
  assert.doesNotMatch(kodu(FORM), /ortalama|reduce\([^)]*\+/);
  assert.doesNotMatch(kodu(GOC4), /avg\(/i);
});

test('PUAN 1–5 TAM SAYI, sunucuda doğrulanıyor', () => {
  /*
    Dışarıdan gelen jsonb olduğu gibi yazılsaydı metin, null ya da 900
    gibi değerler kayda girerdi.
  */
  assert.match(GOC4, /jsonb_typeof\(deger\) <> 'number'/);
  assert.match(GOC4, /< 1 or \(deger\)::numeric > 5/);
  assert.match(GOC4, /<> floor\(\(deger\)::numeric\)/);
  assert.match(GOC4, /raise exception 'puan-gecersiz'/);
});

test('BAŞKA ŞİRKETİN ÖLÇÜTÜNE puan verilemiyor', () => {
  assert.match(GOC4, /where o\.id = anahtar::uuid and o\.company_id = sirket and o\.aktif/);
  assert.match(GOC4, /raise exception 'olcut-gecersiz'/);
});

test('ÖLÇÜT ŞİRKETİN; hazır liste dayatılmıyor', () => {
  /*
    Varsayılan ölçüt listesi, şirketin bakmadığı bir şeye bakıyormuş
    gibi gösterirdi. Ölçüt bir şirket politikası: yalnız sahip tanımlıyor.
  */
  assert.doesNotMatch(kodu(GOC4), /insert into public\.sirket_degerlendirme_olcutleri[\s\S]{0,200}values \('/);
  assert.match(GOC4, /and cm\.user_id = auth\.uid\(\) and cm\.is_owner/);
  assert.match(FORM, /Henüz değerlendirme ölçütü tanımlanmamış/);
});

test('GEÇMİŞ ÜZERİNE YAZILMIYOR', () => {
  /* Her çağrı yeni satır; fikir değiştirmek de bilgi. */
  assert.match(GOC4, /insert into public\.basvuru_degerlendirmeleri/);
  assert.doesNotMatch(kodu(GOC4), /on conflict \(basvuru_id, degerlendiren\)/);
  assert.match(FORM, /Değerlendirme geçmişi/);
  assert.match(FORM, /\{g\.ad\}/);
});

test('KALDIRILAN ÖLÇÜT silinmiyor, pasifleşiyor', () => {
  /* Eski değerlendirmeler ona atıfta bulunuyor; silmek geçmişi okunamaz
     hâle getirirdi. */
  assert.match(GOC4, /set aktif = false/);
  assert.doesNotMatch(kodu(GOC4), /delete from public\.sirket_degerlendirme_olcutleri/);
  assert.match(FORM, /kaldırılmış ölçüt/);
});

test('ÖĞRENCİ değerlendirmeyi görmüyor', () => {
  /* Öğrenciye gösterilen şey `company_feedback`; puanlar ve iç notlar
     şirketin kendi kaydı. */
  const pol = GOC4.slice(GOC4.indexOf('sirket degerlendirmeleri gorur'), GOC4.indexOf('YAZMA — RPC'));
  assert.match(pol, /public\.is_company_member\(l\.company_id\)/);
  assert.doesNotMatch(pol, /student_id/);
});

test('BOŞ değerlendirme gönderilmiyor', () => {
  /* "Bakıldı" izlenimi verip hiçbir şey söylemeyen kayıt olmasın. */
  assert.match(FORM, /Object\.keys\(puanlar\)\.length === 0 && !not\.trim\(\)/);
});

/* ==================== AŞAMA 5: KAPANIŞ VE DENGELİ DAĞITIM */

const GOC5 = oku('supabase/migrations/20261126010000_ilan_kapanisi_ve_dagitim.sql');
const GENEL = oku('src/sirket/GenelBakis.tsx');

test('İLAN KAPANIŞINDA OTOMATİK RED YOK', () => {
  /*
    Sistemin verdiği bir red, kimsenin arkasında durmadığı bir karardır.
    RPC yalnız LİSTELİYOR; hiçbir başvuruyu güncellemiyor.
  */
  const fn = GOC5.slice(
    GOC5.indexOf('function public.ilan_bekleyen_adaylar'),
    GOC5.indexOf('function public.basvurulari_dagit'),
  );
  assert.ok(fn.length > 0, 'listeleme işlevi bulunmalı');
  assert.doesNotMatch(fn, /update|insert|delete/i);
  assert.match(fn, /language sql stable/);
  /* Arayüzde de toplu red düğmesi yok. */
  assert.doesNotMatch(kodu(GENEL), /Tümünü reddet|topluRed/);
});

test('kapatmadan ÖNCE bekleyenler gösteriliyor', () => {
  assert.match(GENEL, /const kapatmayiBaslat = async \(id: string\) => \{/);
  assert.match(GENEL, /aday sonuç bekliyor/);
  assert.match(GENEL, /İlanı kapatmak bu başvuruları reddetmiyor/);
  /* Bekleyen yoksa akış değişmiyor: fazladan bir onay ekranı çıkmıyor. */
  assert.match(GENEL, /if \(bekleyenler\.length === 0\) \{/);
});

test('kapanış onayında ADAY ADI yazılmıyor', () => {
  /*
    Bu ekran şirketin kendi akışında bir ara adım; aday kimliğini burada
    açmak önyargısız inceleme tercihini dolanmak olurdu.
  */
  const diyalog = GENEL.slice(GENEL.indexOf('aria-label="İlanı kapatma onayı"'));
  assert.doesNotMatch(kodu(diyalog), /\.ad\b|profile_snapshot/);
  assert.match(diyalog, /durumAdi\(b\.durum\)/);
});

test('DAĞITIM otomatik değil; yalnız sorumsuzları dağıtıyor', () => {
  /*
    Kendiliğinden atama, kimsenin haberi olmadan iş yüklemek olurdu.
    Var olan atamayı bozmak, birinin üstlendiği işi elinden almaktı.
  */
  assert.match(GOC5, /and a\.atanan_uye is null/);
  assert.match(GOC5, /where id = k\.id and atanan_uye is null;/);
  assert.doesNotMatch(kodu(GOC5), /create trigger/);
  assert.match(PANO, /onDagit && sorumsuzAdet > 0/);
});

test('DENGE mevcut yüke göre, sırayla değil', () => {
  /*
    Round-robin, hâlihazırda yüklü olanın üstüne yığardı. Hedef her
    döngüde yeniden hesaplanıyor: az önce atanan iş de yüke ekleniyor.
  */
  assert.match(GOC5, /order by yuk\.n, cm\.user_id/);
  assert.match(GOC5, /for k in[\s\S]{0,600}select cm\.user_id into hedef/);
});

test('dağıtım YALNIZ yazabilen üyelere', () => {
  const fn = GOC5.slice(GOC5.indexOf('function public.basvurulari_dagit'));
  assert.equal((fn.match(/in \('Owner', 'Recruiter'\)/g) ?? []).length, 2, 'hem kontrol hem seçim rolü sormalı');
  assert.match(fn, /if not public\.sirket_basvuru_yazabilir\(p_sirket\) then/);
});

test('SONUÇLANMIŞ ayrımı TEK TANIMDAN geliyor', () => {
  /*
    Pano aşaması, hatırlatma, kapanış listesi ve dağıtım aynı dört
    durumu dışarıda bırakıyor. Dört yerde ayrı yazılsaydı biri değişip
    ötekiler geride kalırdı.
  */
  const kalip = /'offer_accepted', 'offer_declined', 'rejected', 'withdrawn'/;
  for (const [ad, metin] of [['hatirlatma', GOC3], ['kapanis+dagitim', GOC5]]) {
    assert.match(metin, kalip, `${ad} aynı listeyi kullanmalı`);
  }
  /*
    GOC5'te ÜÇ kez geçiyor ve üçü de gerekli: kapanış listesi, dağıtılacak
    başvuru seçimi ve üyenin mevcut yükü. Sayıyı sabitlemek yerine
    "hepsi aynı dört durumu dışarıda bırakıyor" doğrulanıyor.
  */
  const gecisler = GOC5.match(new RegExp(kalip, 'g')) ?? [];
  assert.ok(gecisler.length >= 2, 'kapanış ve dağıtım aynı listeyi kullanmalı');
  assert.equal(new Set(gecisler).size, 1, 'listeler birbirinden farklı olmamalı');
});

/* ================================================================== */
/*  AŞAMA 6 — İNCELEME SONRASI DÜZELTMELER (5 Ekim 2026)              */
/* ================================================================== */
/*
  Dört düzeltme, dördü de gerçek bir kusura karşılık geliyor:
    2) bekleyen aday okuması hata verince ilan sessizce kapanıyordu
    3) Viewer adayın ayrıntısını hiç açamıyordu
    4) sorumlu atamak adayın bekleme saatini sıfırlıyordu
*/

const CEKMECE = oku('src/sirket/AdayCekmecesi.tsx');
const IZGARA = oku('src/sirket/AdayIzgarasi.tsx');
const ILERLEME_GOC = oku('supabase/migrations/20261127010000_aday_ilerlemesi.sql');

/* ------------------------------------- 2) okuma hatası yutulmuyor */

test('bekleyen aday okuması hata verdiğinde boş liste DÖNMÜYOR', () => {
  /*
    `return []` iki ayrı durumu ("bekleyen yok" ve "okunamadı") tek
    cevaba indiriyordu; sonuç, korumanın tam gerektiği anda sessizce
    devre dışı kalmasıydı.
  */
  const i = VERI.indexOf('export async function ilanBekleyenAdaylar');
  assert.ok(i > 0, 'ilanBekleyenAdaylar bulunmalı');
  const govde = kodu(VERI.slice(i, VERI.indexOf('\n}', i)));
  assert.ok(/if \(error\) throw/.test(govde), 'hata yukarı çıkmalı');
  assert.ok(!/if \(error\) return \[\]/.test(govde), 'hata boş listeye çevrilmemeli');
});

test('okuma hatasında ilan KAPATILMIYOR ve yeniden deneme sunuluyor', () => {
  const i = GENEL.indexOf('const kapatmayiBaslat');
  assert.ok(i > 0, 'kapatmayiBaslat bulunmalı');
  const k = kodu(GENEL.slice(i, i + 1400));

  /* catch dalı durumu yazıp ÇIKIYOR; durumDegistir çağrısı yok. */
  const yakala = k.slice(k.indexOf('} catch'), k.indexOf('} finally'));
  assert.ok(yakala.includes('setKapanisHatasi'), 'hata durumu yazılmalı');
  assert.ok(yakala.includes('return'), 'kapatma akışı DURMALI');
  assert.ok(!yakala.includes('durumDegistir'), 'okuma hatasında ilan kapatılmamalı');

  /* Boş liste dalı yalnız okuma BAŞARILIYKEN çalışıyor. */
  assert.ok(
    k.indexOf('bekleyenler.length === 0') > k.indexOf('} finally'),
    'boş liste kontrolü catch dalından SONRA gelmeli',
  );

  assert.ok(GENEL.includes('Yeniden dene'), 'yeniden deneme düğmesi olmalı');
  assert.ok(GENEL.includes('ilan kapatılmadı'), 'kullanıcı ilanın kapanmadığını okuyabilmeli');
});

/* --------------------------------- 3) Viewer salt okunur inceliyor */

test('çekmece salt okunurken yazma denetimi ÇİZMİYOR', () => {
  /*
    Denetimleri "kapalı" çizmek yetmez: yapılamayacak bir şey ekranda
    hiç görünmemeli. Bu yüzden işlem sütunu bir ternary ile tamamen
    değiştiriliyor.
  */
  assert.ok(CEKMECE.includes('saltOkunur?: boolean'), 'prop bildirilmeli');
  const i = CEKMECE.indexOf('{saltOkunur ? (');
  assert.ok(i > 0, 'salt okunur dal olmalı');

  const dal = CEKMECE.slice(i, CEKMECE.indexOf(') : (', i));
  const k = kodu(dal);
  for (const yasak of ['<select', '<textarea', 'onDurum(', 'onNot(', 'onTeklif', 'onDavet']) {
    assert.ok(!k.includes(yasak), 'salt okunur dalda ' + yasak + ' olmamalı');
  }
  assert.ok(dal.includes('Görüntüleme yetkisiyle'), 'neden yazamadığı yazmalı');
  assert.ok(dal.includes('durum.etiket'), 'mevcut durum görünmeli');
});

test('ızgaranın yazma işlevleri isteğe bağlı ve salt okunur geçiriliyor', () => {
  for (const p of ['onDurum?:', 'onNot?:', 'onTeklif?:', 'onDavet?:', 'onMulakatTarihi?:']) {
    assert.ok(IZGARA.includes(p), p + ' isteğe bağlı olmalı');
  }
  assert.ok(IZGARA.includes('saltOkunur={saltOkunur}'), 'bayrak çekmeceye geçirilmeli');
});

test('Viewer dalı aday ayrıntısını AÇABİLİYOR', () => {
  /*
    Önceki hâlde `onAday` verilmiyordu ve çipler düğme bile olmuyordu;
    "yazamaz" sessizce "inceleyemez" olmuştu.
  */
  const i = PANEL.indexOf('if (!baglam.basvuruYazabilir)');
  assert.ok(i > 0, 'Viewer dalı bulunmalı');
  const dal = PANEL.slice(i, PANEL.indexOf('\n  return (', i));

  assert.ok(dal.includes('onAday={'), 'panoda aday çipi açılabilmeli');
  assert.ok(dal.includes('<AdayIzgarasi'), 'liste görünümü de açılmalı');
  assert.ok(dal.includes('saltOkunur'), 'ızgara salt okunur olmalı');

  /* Yazma işlevlerinin HİÇBİRİ verilmiyor. */
  const k = kodu(dal);
  for (const yasak of ['onDurum=', 'onNot=', 'onTeklif=', 'onDavet=', 'onMulakatTarihi=', 'onSorumlu=']) {
    assert.ok(!k.includes(yasak), 'Viewer dalında ' + yasak + ' verilmemeli');
  }
});

/* ------------------------- 4) iç işlem adayın bekleyişini bitirmez */

test('bekleme ölçüsü updated_at DEĞİL, aday ilerlemesi', () => {
  const BEK = oku('src/lib/bekleyen-basvuru.mjs');
  const i = BEK.indexOf('export function sonIslemAni');
  const govde = BEK.slice(i, BEK.indexOf('\n}', i));
  assert.ok(
    govde.includes('adayIlerlemesi') && govde.includes('aday_ilerleme_at'),
    'ilerleme damgası okunmalı',
  );
  assert.ok(
    !govde.includes('updated_at') && !govde.includes('guncellendi'),
    'updated_at bekleme hesabında KULLANILMAMALI',
  );
});

test('ilerleme damgası iç işlemlerle tazelenmiyor', () => {
  const i = ILERLEME_GOC.indexOf('create or replace function public.stamp_aday_ilerleme');
  assert.ok(i > 0, 'damgalayıcı bulunmalı');
  const govde = ILERLEME_GOC.slice(i, ILERLEME_GOC.indexOf('$$;', i));

  /* Adaya görünen alanlar damgayı tazeliyor. */
  for (const alan of ['status', 'interview_date', 'company_feedback', 'offer_note']) {
    assert.ok(govde.includes('new.' + alan), alan + ' ilerleme sayılmalı');
  }
  /* İç işlemler SAYILMIYOR. */
  for (const alan of ['atanan_uye', 'atanan_at', 'match_score', 'email_attempts']) {
    assert.ok(!govde.includes(alan), alan + ' ilerleme SAYILMAMALI');
  }
  /* Adayın kendi yanıtı da şirketin borcunu kapatmıyor. */
  assert.ok(
    !govde.includes('interview_response'),
    'adayın yanıtı şirketin bekleme saatini sıfırlamamalı',
  );
});

test('hatırlatma ve kapanış listesi AYNI bekleme ölçüsünü kullanıyor', () => {
  const olcu = 'greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at)';
  for (const fn of ['bekleyen_basvuru_hatirlatmalari', 'ilan_bekleyen_adaylar']) {
    const i = ILERLEME_GOC.indexOf('function public.' + fn);
    assert.ok(i > 0, fn + ' bu göçte yeniden tanımlanmalı');
    assert.ok(ILERLEME_GOC.slice(i, i + 2600).includes(olcu), fn + ' ortak ölçüyü kullanmalı');
  }
  /* Eşikler ve tekrar koruması DEĞİŞMEDİ. */
  assert.ok(ILERLEME_GOC.includes("'bekleyen:' || h.basvuru_id::text"), 'dedupe anahtarı korunmalı');
  assert.ok(ILERLEME_GOC.includes('on conflict (dedupe_key)'), 'tekrar koruması korunmalı');
});

test('beklemeGunu ilerleme damgasından hesaplıyor', () => {
  const simdi = new Date('2026-10-05T12:00:00Z');
  const kart = {
    durum: 'submitted',
    tarih: '2026-08-01T12:00:00Z',
    /* İç işlem bugün oldu ama adaya yönelik ilerleme 20 gün önce. */
    guncellendi: '2026-10-05T11:00:00Z',
    adayIlerlemesi: '2026-09-15T12:00:00Z',
  };
  assert.equal(beklemeGunu(kart, simdi), 20);
  assert.equal(asilanEsik(kart, simdi), 14);
  assert.equal(bekliyorMu(kart, simdi), true);
});

/* ================================================================== */
/*  AŞAMA 7 — TEKRAR KORUMASI BEKLEME DÖNEMİNE BAĞLI                  */
/* ================================================================== */
/*
  Kusur: `dedupe_key` yalnız başvuru + eşik + alıcı taşıyordu, yani
  "bu başvuru bu eşikte bir kez" ÖMÜR BOYU demekti. Oysa bekleme
  süresi `aday_ilerleme_at`e bağlı ve o damga gerçek ilerlemede
  sıfırlanıyor — bir başvuru birden çok bekleme dönemi yaşıyor.
  Süreci ilerleten ekip, tam da ilerlettiği için bir daha
  uyarılmıyordu.
*/

const DONEM_GOC = oku('supabase/migrations/20261128010000_hatirlatma_donemi.sql');

test('tekrar koruması anahtarında BEKLEME DÖNEMİ var', () => {
  /*
    Dönem kimliği, bekleme hesabının dayandığı anın kendisinden
    türüyor. Ayrı bir sayaç sütunu aynı bilgiyi ikinci kez saklamak
    ve iki kaynağın ayrışma riskini açmak olurdu.
  */
  assert.match(
    DONEM_GOC,
    /to_char\(h\.donem_basi at time zone 'UTC', 'YYYYMMDDHH24MISSUS'\)/,
    'dönem kimliği anahtarda olmalı',
  );
  assert.match(
    DONEM_GOC,
    /greatest\(coalesce\(a\.aday_ilerleme_at, a\.applied_at\), a\.applied_at\) as donem_basi/,
    'dönem başı bekleme ölçüsüyle AYNI yerden gelmeli',
  );
  /* Alıcı anahtarda KALIYOR: sorumlu değişirse yenisi haberdar olsun. */
  assert.match(DONEM_GOC, /\|\| ':' \|\| h\.alici::text/);
  assert.match(DONEM_GOC, /on conflict \(dedupe_key\) where dedupe_key is not null do nothing/);
});

test('dönem kimliği epoch sayısından DEĞİL, kesin metinden üretiliyor', () => {
  /*
    Epoch'u kayan noktaya çevirmek aynı anı iki farklı metne
    düşürebilirdi; o da aynı dönemde ikinci bir bildirim demekti.
  */
  const i = DONEM_GOC.indexOf("'bekleyen:' || h.basvuru_id::text");
  assert.ok(i > 0, 'anahtar üretimi bulunmalı');
  const anahtar = DONEM_GOC.slice(i, i + 320);
  assert.ok(!/extract\(epoch/.test(anahtar), 'epoch kullanılmamalı');
  assert.ok(anahtar.includes("at time zone 'UTC'"), 'UTC sabitlenmeli');
});

test('eşikler ve alıcı seçimi DEĞİŞMEDİ', () => {
  /*
    Bu göç yalnız tekrar korumasını değiştiriyor. Eşiklerin ya da
    alıcı kuralının sessizce kayması, düzeltilen kusurdan daha büyük
    bir değişiklik olurdu.
  */
  for (const e of BEKLEME_ESIKLERI) {
    assert.ok(DONEM_GOC.includes(`then ${e}`), `${e} eşiği korunmalı`);
  }
  assert.match(DONEM_GOC, /where b\.esik is not null and b\.atanan_uye is not null/);
  assert.match(DONEM_GOC, /on cm\.company_id = b\.company_id and cm\.is_owner/);
  assert.match(
    DONEM_GOC,
    /a\.status not in \('offer_accepted', 'offer_declined', 'rejected', 'withdrawn'\)/,
  );
});

test('hatırlatma RPC yalnız service_role tarafından çağrılabiliyor', () => {
  /*
    `authenticated`a açılsaydı herhangi bir kullanıcı istediği an
    bildirim ürettirebilirdi — hız sınırı olmayan bir bildirim kapısı.
  */
  assert.match(
    DONEM_GOC,
    /revoke all on function public\.bekleyen_basvuru_hatirlatmalari\(\) from public, anon, authenticated;/,
  );
});

test('veritabanı senaryosu bu dört adımı kapsıyor', () => {
  /*
    SQL testi gerçek veritabanında koşuyor; burada yalnız senaryonun
    dosyada DURDUĞU doğrulanıyor ki sessizce düşmesin.
  */
  const SQL = oku('supabase/tests/ise-alim-merkezi.test.sql');
  for (const adim of [
    '1. ADIM: ilk donem icin hatirlatma yazildi',
    '2. ADIM: ayni donemde tekrar kosular yeni bildirim URETMIYOR',
    '3. ADIM: ilerleme yeni donemi baslatti',
    '4. ADIM: YENI DONEM icin YENI hatirlatma yazildi',
    '6. ADIM: sorumlu atamak YENI HATIRLATMA URETMIYOR',
  ]) {
    assert.ok(SQL.includes(adim), `senaryo adımı eksik: ${adim}`);
  }
});

/* ================================================================== */
/*  AŞAMA 8 — DOĞRULANMAMIŞ ŞİRKET SINIRI                             */
/* ================================================================== */
/*
  Üretimdeki `applications` politikaları doğrulamayı HEM okuma HEM
  yazma tarafında istiyor. Bu paketteki RPC'ler `security definer`
  olduğu için politikaları atlıyor ve sınırı yalnız üyelikle
  kuruyordu — doğrulama koşulu düşmüştü.
*/

const SINIR_GOC = oku('supabase/migrations/20261129010000_dogrulanmis_sirket_siniri.sql');

test('aday verisine dokunan RPC\'lerin hepsi doğrulama kapısından geçiyor', () => {
  /*
    Kapı tek yerde: aynı koşulu dört ayrı yerde elle yazmak, birinin
    değişip ötekilerin geride kalması demekti.
  */
  assert.match(
    SINIR_GOC,
    /create or replace function public\.sirket_adaylarini_gorebilir/,
    'okuma kapısı tanımlanmalı',
  );
  assert.match(
    SINIR_GOC,
    /select public\.is_company_member\(hedef\) and public\.sirket_dogrulandi\(hedef\)/,
    'okuma kapısı SELECT politikasının aynısı olmalı',
  );

  /* Okuma RPC'lerinin üçü de kapıyı kullanıyor. */
  for (const fn of ['ilan_bekleyen_adaylar', 'sirket_is_yuku', 'basvuru_degerlendirme_gecmisi']) {
    const i = SINIR_GOC.indexOf(`function public.${fn}`);
    assert.ok(i > 0, `${fn} bu göçte yeniden tanımlanmalı`);
    assert.ok(
      SINIR_GOC.slice(i, i + 1800).includes('sirket_adaylarini_gorebilir'),
      `${fn} doğrulama kapısını kullanmalı`,
    );
  }
});

test('yazma kapısı şirket doğrulamasını İÇERİYOR', () => {
  /*
    Tek yerde kapatmak üç yazma RPC'sini birden kapatıyor
    (atama, dağıtım, değerlendirme).
  */
  const i = SINIR_GOC.indexOf('function public.sirket_basvuru_yazabilir');
  assert.ok(i > 0, 'yazma kapısı yeniden tanımlanmalı');
  const govde = SINIR_GOC.slice(i, SINIR_GOC.indexOf('$$;', i));
  assert.ok(govde.includes('public.sirket_dogrulandi(hedef)'), 'doğrulama sorulmalı');
  assert.ok(govde.includes("in ('Owner', 'Recruiter')"), 'rol kuralı korunmalı');
});

test('VIEWER salt okunur erişimi daralmıyor', () => {
  /*
    Sınır ROL değil, ÜYELİK + DOĞRULAMA. Okuma kapısında rol
    sorulsaydı Viewer okuma yetkisini de kaybederdi.
  */
  const i = SINIR_GOC.indexOf('function public.sirket_adaylarini_gorebilir');
  const govde = SINIR_GOC.slice(i, SINIR_GOC.indexOf('$$;', i));
  assert.ok(!govde.includes('recruiter_role'), 'okuma kapısı ROL sormamalı');
  assert.ok(!govde.includes('is_owner'), 'okuma kapısı sahiplik sormamalı');
});

test('değerlendirme satırlarının RLS\'i de doğrulama istiyor', () => {
  /*
    Tabloyu doğrudan okuyan bir istemci RPC'yi atlayabilirdi.
  */
  const i = SINIR_GOC.indexOf('create policy "sirket degerlendirmeleri gorur"');
  assert.ok(i > 0, 'politika yeniden yazılmalı');
  assert.ok(
    SINIR_GOC.slice(i, i + 500).includes('sirket_adaylarini_gorebilir'),
    'politika doğrulama kapısını kullanmalı',
  );
});

test('atama RPC\'si başvuru satırının TAMAMINI döndürmüyor', () => {
  /*
    Önce `returns public.applications` idi: ön yazı, özgeçmiş yolu,
    profil kopyası ve öğrenci kimliği dahil her alan çağırana
    gidiyordu. İstemci dönüşü zaten kullanmıyor.
  */
  /* Yorumda gerekçe olarak geçen eski imza iddiayı bozmasın. */
  assert.ok(
    !/returns public\.applications/.test(kodu(SINIR_GOC)),
    'tam satır döndürülmemeli',
  );
  assert.match(
    SINIR_GOC,
    /returns table \(basvuru_id uuid, atanan_uye uuid, atanan_at timestamptz\)/,
    'yalnız atama bilgisi dönmeli',
  );
  /* Dönüş tipi değiştiği için düşürülüp yeniden yazılıyor; yetki geri verilmeli. */
  assert.match(SINIR_GOC, /drop function if exists public\.basvuru_sorumlusu_ata\(uuid, uuid, uuid\);/);
  assert.match(
    SINIR_GOC,
    /grant execute on function public\.basvuru_sorumlusu_ata\(uuid, uuid, uuid\) to authenticated;/,
  );
  /* Eşzamanlılık koruması KORUNUYOR. */
  assert.match(SINIR_GOC, /if satir\.atanan_uye is distinct from p_beklenen then/);
  assert.match(SINIR_GOC, /for update/);
});

test('veritabanı senaryosu doğrulama sınırını kapsıyor', () => {
  const SQL = oku('supabase/tests/ise-alim-merkezi.test.sql');
  for (const adim of [
    'DOGRULANMAMIS: okuma kapisi KAPALI',
    'DOGRULANMAMIS: bekleyen adaylari goremiyor',
    'DOGRULANMAMIS: sorumlu ATAYAMIYOR',
    'DOGRULANMAMIS: degerlendirme YAZAMIYOR',
    'VIEWER: dogrulanmis sirkette OKUYABILIYOR',
    'VIEWER: hala yazamiyor',
  ]) {
    assert.ok(SQL.includes(adim), `senaryo adımı eksik: ${adim}`);
  }
});
