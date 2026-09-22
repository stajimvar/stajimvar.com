import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  YÖNETİM PANELİNDEKİ SAYILAR YALAN SÖYLEMESİN

  Panel canlıya çıktığında "0 yayındaki ilan" yazıyordu; oysa sitede 189
  ilan yayındaydı. Sebebi tek bir satırdı: sayaç `select('*')` yapıyor,
  `listings` SELECT iznini sütun sütun verdiği için sorgu 42501 ile
  düşüyor ve çağıran taraf `if (error) return 0` ile hatayı SIFIRA
  çeviriyordu. Sıfır, "ölçtüm ve yok" demektir; hata ise "ölçemedim".
  İkisini birbirine karıştırmak, panelin en temel işini bozuyor.

  Buradaki testler o sınıfın tekrar açılmasını engelliyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

/* ------------------------------------------------------------------ */
/*  SAYAÇ HATAYI YUTMUYOR                                              */
/* ------------------------------------------------------------------ */

test('yönetim özeti sunucudaki RPC ile alınıyor', () => {
  const kaynak = oku('src/lib/queries/index.ts');
  const govde = kaynak.slice(kaynak.indexOf('export async function fetchAdminOzet'));
  const fonksiyon = govde.slice(0, govde.indexOf('\n}\n') + 3);

  assert.match(
    fonksiyon,
    /supabase\.rpc\(\s*'yonetim_ozet'/,
    'özet sayıları `yonetim_ozet` RPC\'sinden gelmeli',
  );
  assert.doesNotMatch(
    fonksiyon,
    /select\(\s*'\*'/,
    "`select('*')` sütun izni olmayan tabloda 42501 veriyor; RPC kullanılmalı",
  );
});

test('özet sayaçları hatayı sıfıra çevirmiyor', () => {
  const kaynak = oku('src/lib/queries/index.ts');
  const govde = kaynak.slice(kaynak.indexOf('export async function fetchAdminOzet'));
  const fonksiyon = govde.slice(0, govde.indexOf('\n}\n') + 3);

  assert.doesNotMatch(
    fonksiyon,
    /if\s*\(\s*error\s*\)\s*return\s+0/,
    'hata yutulup 0 döndürülemez: yanlış sıfır, hiç göstermemekten kötüdür',
  );
  assert.match(fonksiyon, /if\s*\(\s*error\s*\)\s*fail\(/, 'hata yükseltilmeli');
});

/* ------------------------------------------------------------------ */
/*  İLAN KIRILIMI                                                      */
/* ------------------------------------------------------------------ */

test('onay kuyruğu yalnız hiç kullanılmayan origin değerine bakmıyor', () => {
  const sql = oku('supabase/migrations/20261027010000_yonetim_ozet_sayaclari.sql');
  const taslak = sql.slice(sql.indexOf("'taslakToplam'"), sql.indexOf("'taslakNative'"));

  assert.match(taslak, /status\s*=\s*'draft'/);
  assert.doesNotMatch(
    taslak,
    /origin\s*=\s*'internal'/,
    "`origin = 'internal'` hiçbir satırda yok; kuyruk her zaman boş görünürdü",
  );
});

test('yayındaki ilan toplam ve kaynak kırılımı olarak ayrı dönüyor', () => {
  const sql = oku('supabase/migrations/20261027010000_yonetim_ozet_sayaclari.sql');
  for (const alan of ['ilanYayinToplam', 'ilanNative', 'ilanElle', 'ilanTaranan']) {
    assert.ok(sql.includes(`'${alan}'`), `${alan} alanı dönmeli`);
  }
});

test('panel native ilanı toplamla aynı kutuda göstermiyor', () => {
  const kaynak = oku('src/components/yonetim/OzetSayfasi.tsx');
  assert.match(kaynak, /ozet\.ilanYayinToplam/);
  assert.match(kaynak, /ozet\.ilanNative/);
  assert.doesNotMatch(
    kaynak,
    /ozet\.taslakIlan|ozet\.ilan\b/,
    'kaldırılan alan adları kalmamalı',
  );
});

/* ------------------------------------------------------------------ */
/*  SON 7 GÜN GERÇEKTEN 7 GÜN                                          */
/* ------------------------------------------------------------------ */

test('son kayıtlar boş günleri de sıfırla döndürüyor', () => {
  const sql = oku('supabase/migrations/20261027010000_yonetim_ozet_sayaclari.sql');
  const blok = sql.slice(sql.indexOf("'sonKayitlar'"));

  assert.match(
    blok,
    /generate_series\(/,
    'yalnız dolu günler döndürülürse "son 7 gün" grafiği iki çubukla çizilir',
  );
});


/* ------------------------------------------------------------------ */
/*  DEMO VERİ TAMAMEN KALKTI                                           */
/* ------------------------------------------------------------------ */

test('demo trafik üreteci depoda kalmadı', () => {
  assert.ok(
    !fs.existsSync(path.join(KOK, 'src/lib/yonetim-demo.mjs')),
    'üreteç silinmeli: panelde uydurma sayı gösterilmiyor',
  );
});

test('panel hiçbir yerde demo üretecinden veri okumuyor', () => {
  const dosyalar = fs
    .readdirSync(path.join(KOK, 'src/components/yonetim'))
    .filter((d) => /\.(tsx?|mjs)$/.test(d));

  for (const d of dosyalar) {
    const kaynak = oku(`src/components/yonetim/${d}`);
    assert.doesNotMatch(
      kaynak,
      /from '.*yonetim-demo/,
      `${d} hâlâ demo üretecinden okuyor`,
    );
    assert.doesNotMatch(
      kaynak,
      /trafikOzeti|ilkOturumlar|oturumlariIlerlet/,
      `${d} demo üreteç işlevi çağırıyor`,
    );
  }
});

test('canlı akış gerçek RPC ile besleniyor', () => {
  const kaynak = oku('src/components/yonetim/useCanliOturumlar.ts');
  assert.match(kaynak, /fetchYonetimCanli/);
  assert.doesNotMatch(
    kaynak,
    /useState\((?:23|412|389|1042)\)/,
    'sayaçlar sabit bir sayıyla başlatılmamalı',
  );
});

test('trafik sayfası gerçek RPC ile besleniyor', () => {
  const kaynak = oku('src/components/yonetim/TrafikSayfasi.tsx');
  assert.match(kaynak, /fetchYonetimTrafik/);
});

/* ------------------------------------------------------------------ */
/*  ÖLÇÜM: ÇEREZ YOK, IP YOK                                           */
/* ------------------------------------------------------------------ */

test('oturum kimliği çerezde değil, sekme belleğinde', () => {
  const kaynak = oku('src/lib/izleme.mjs');
  assert.match(kaynak, /sessionStorage/);
  assert.doesNotMatch(kaynak, /document\.cookie/, 'çerez kullanılmamalı');
});

test('toplama ucu IP saklamıyor', () => {
  const kaynak = oku('functions/api/olay.ts');
  assert.doesNotMatch(
    kaynak,
    /CF-Connecting-IP|p_ip|ipOzeti/,
    'ziyaret sayısı için IP gerekmiyor; saklanmamalı',
  );
  assert.match(kaynak, /cf\.city/, 'şehir istekten okunmalı, istemciden değil');
});

test('istemci şehir ve cihaz göndermiyor', () => {
  const kaynak = oku('src/lib/izleme.mjs');
  const govde = kaynak.slice(kaynak.indexOf('const govde = JSON.stringify'));
  const alanlar = govde.slice(0, govde.indexOf('});'));
  for (const alan of ['sehir', 'cihaz', 'ulke']) {
    assert.ok(!alanlar.includes(alan), `${alan} istemciden gönderilmemeli`);
  }
});

test('yönetim paneli ziyareti trafiğe sayılmıyor', () => {
  const istemci = oku('src/lib/izleme.mjs');
  assert.match(istemci, /\/yonetim/, 'istemci panel yollarını elemeli');

  const sql = oku('supabase/migrations/20261029020000_site_olayi_yaz.sql');
  assert.match(
    sql,
    /p_yol like '\/yonetim%'/,
    'sunucu da elemeli: istemci filtresi atlatılabilir',
  );
});

test('olay tablosu istemci rollerine kapalı', () => {
  const sql = oku('supabase/migrations/20261029010000_site_olaylari.sql');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.site_olaylari from anon, authenticated/i);
});

test('trafik RPC uclari yonetici kapisinin arkasinda', () => {
  for (const [dosya, ad] of [
    ['20261029030000_yonetim_canli.sql', 'yonetim_canli'],
    ['20261029040000_yonetim_trafik.sql', 'yonetim_trafik'],
  ]) {
    const sql = oku(`supabase/migrations/${dosya}`);
    assert.match(sql, /security definer/i, `${ad} security definer olmalı`);
    assert.match(sql, /if not public\.is_admin\(\)/, `${ad} yönetici kapısı olmalı`);
    assert.match(sql, /from public, anon/i, `${ad} anon'a kapalı olmalı`);
  }
});

/* ------------------------------------------------------------------ */
/*  RPC YÖNETİCİ KAPISININ ARKASINDA                                   */
/* ------------------------------------------------------------------ */

test('yonetim_ozet yalnız yöneticiye açık', () => {
  const sql = oku('supabase/migrations/20261027010000_yonetim_ozet_sayaclari.sql');

  assert.match(sql, /security definer/i, 'sütun izni ve RLS sunucuda çözülüyor');
  assert.match(sql, /if not public\.is_admin\(\)/, 'yönetici kapısı olmalı');
  assert.match(sql, /revoke all on function public\.yonetim_ozet\(\) from public/i);
  assert.match(sql, /grant execute on function public\.yonetim_ozet\(\) to authenticated/i);
});

test('yonetim_ozet anon rolune kapali', () => {
  const sql = oku('supabase/migrations/20261028010000_yonetim_ozet_anon_izni.sql');
  assert.match(
    sql,
    /revoke execute on function public\.yonetim_ozet\(\) from anon/i,
    "Supabase yeni fonksiyonlara anon EXECUTE veriyor; `revoke ... from public` bunu kaldırmıyor",
  );
});

/* ------------------------------------------------------------------ */
/*  ONAY KUYRUGU                                                       */
/* ------------------------------------------------------------------ */

test('onay sayfasi artik yer tutucu degil', () => {
  /*
    Panelde "Onay kuyruklari" acildiginda 9 taslak ilan incelenmeyi
    beklerken ekranda "bu ekranda olacaklar" yazan bir kart duruyordu.
  */
  const panel = oku('src/components/yonetim/YonetimPaneli.tsx');
  assert.ok(panel.includes("etkin === 'onay' && <OnaySayfasi"), 'onay sayfasi bagli olmali');
  assert.ok(
    !panel.includes('baslik="Onay kuyruklari"'),
    'onay icin yer tutucu kart kalmamali',
  );
});

test('onay kuyrugu sunucudaki RPC ile okunuyor', () => {
  const sayfa = oku('src/components/yonetim/OnaySayfasi.tsx');
  assert.ok(sayfa.includes('fetchOnayKuyrugu'));

  const q = oku('src/lib/queries/index.ts');
  const govde = q.slice(q.indexOf('export async function fetchOnayKuyrugu'));
  const fn = govde.slice(0, govde.indexOf('export async function ilanKarariVer'));
  assert.ok(fn.includes("supabase.rpc('yonetim_onay_kuyrugu'"), 'RPC ile okunmali');
  assert.ok(
    !fn.includes("select('*'"),
    "listings SELECT iznini sutun sutun veriyor; select('*') 42501 ile duser",
  );
});

test('ret ilani silmiyor, arsivliyor', () => {
  const sql = oku('supabase/migrations/20261031010000_yonetim_onay_kuyrugu.sql');
  const karar = sql.slice(sql.indexOf('function public.yonetim_ilan_karari'));

  assert.ok(karar.includes("else 'archived'"), 'ret arsivlemeli');
  assert.ok(
    !karar.toLowerCase().includes('delete from listings'),
    'reddedilen ilan silinmemeli: silinmis kayittan geriye donulemez',
  );
});

test('karar eszamanli degisikligin uzerine yazmiyor', () => {
  const sql = oku('supabase/migrations/20261031010000_yonetim_onay_kuyrugu.sql');
  assert.ok(
    sql.includes('p_beklenen_updated_at'),
    'iki yonetici ayni kuyruga bakarken biri otekinin kararini ezmemeli',
  );
  assert.ok(sql.includes("'guncellendi', l.updated_at"), 'kuyruk damgayi geri dondurmeli');

  const sayfa = oku('src/components/yonetim/OnaySayfasi.tsx');
  assert.ok(sayfa.includes('ilanKarariVer(ilan.id, karar, ilan.guncellendi)'));
});

test('onay RPC uclari yonetici kapisinda', () => {
  const sql = oku('supabase/migrations/20261031010000_yonetim_onay_kuyrugu.sql');
  for (const ad of ['yonetim_onay_kuyrugu', 'yonetim_ilan_karari']) {
    const bolum = sql.slice(sql.indexOf('function public.' + ad));
    assert.ok(bolum.toLowerCase().includes('security definer'), ad + ' security definer olmali');
    assert.ok(bolum.includes('if not public.is_admin()'), ad + ' yonetici kapisi olmali');
  }
  assert.ok(sql.toLowerCase().includes('from public, anon'), 'anon a kapali olmali');
});

test('onay satiri karari degistirecek bilgiyi gosteriyor', () => {
  /*
    Kuyruktaki 9 taslagin ikisinin baglantisi "erisilemedi" durumunda ve
    hepsinin aciklamasi 82 karakter. Bunlari gormeden verilen bir onay,
    ogrenciyi olu baglantiya gonderebilir.
  */
  const sayfa = oku('src/components/yonetim/OnaySayfasi.tsx');
  assert.ok(sayfa.includes('erisilemedi'), 'baglanti durumu gorunmeli');
  assert.ok(sayfa.includes('aciklamaUzunluk'), 'aciklama uzunlugu gorunmeli');
  assert.ok(sayfa.includes('kaynağında aç'), 'kaynaga baglanti olmali');
});

/* ------------------------------------------------------------------ */
/*  GRAFIK OKUNABILIR                                                  */
/* ------------------------------------------------------------------ */

test('cubuk grafikte deger yaziyor', () => {
  /*
    Deger yalniz `title` icindeydi. `title` masaustunde fareyle beklenince
    cikiyor, TELEFONDA HIC CIKMIYOR -- panel ise cogunlukla telefonda
    aciliyor. Ustelik en yuksek deger bari tam yukseklige cizdigi icin tek
    ziyaretci de "cok" gibi gorunuyordu.
  */
  const g = oku('src/components/yonetim/Grafikler.tsx');
  const cubuk = g.slice(g.indexOf('export const CubukGrafik'), g.indexOf('export const DagilimListesi'));

  assert.ok(cubuk.includes('{sayi(n.deger)}'), 'birincil deger cubugun ustunde yazmali');
  assert.ok(cubuk.includes('sayi(n.ikincil ?? 0)'), 'ikincil deger de yazmali');
});

test('huni adımı uygulamanın gerçek liste yoluna bakıyor', () => {
  /*
    Huni "İlan listesine baktı" adımı `/ilanlar` arıyordu. Böyle bir sayfa
    yok: liste `/staj-ilanlari` adresinde, `/ilanlar` yalnızca oraya
    yönlendiren eski bir adres. Canlıda ölçüldü — eski desen sıfır eşleşti
    ve adım sonsuza kadar sıfır gösterecekti. Sessizce yanlış olan bir
    sayı, hata veren bir sayıdan tehlikeli: "kimse bakmadı" diye okunur.
  */
  const sql = oku('supabase/migrations/20261030010000_huni_gercek_yollar.sql');
  const huni = sql.slice(sql.indexOf("'huni'"));

  assert.match(huni, /\/staj-ilanlari%/, 'gerçek liste yolu aranmalı');
  assert.match(huni, /\/ilan\/%/, 'ilan detay yolu aranmalı');

  /* Ve o yol uygulamada gerçekten bir sayfa olmalı. */
  const app = oku('src/App.tsx');
  assert.match(
    app,
    /temizYol === '\/staj-ilanlari'/,
    'App.tsx bu yolu tanımıyorsa huni yine boş kalır',
  );
});

/* ------------------------------------------------------------------ */
/*  PANEL LISTELERI: ILANLAR VE OGRENCILER                             */
/* ------------------------------------------------------------------ */

const LISTE_GOC = 'supabase/migrations/20261101010000_yonetim_ilan_ogrenci_listeleri.sql';

test('ilanlar ve ogrenciler sayfalari yer tutucu degil', () => {
  const panel = oku('src/components/yonetim/YonetimPaneli.tsx');
  assert.ok(panel.includes("etkin === 'ilanlar' && <IlanlarSayfasi"), 'ilanlar bagli olmali');
  assert.ok(panel.includes("etkin === 'ogrenciler' && <OgrencilerSayfasi"), 'ogrenciler bagli olmali');
  assert.ok(!panel.includes('baslik="Öğrenciler"'), 'ogrenciler yer tutucusu kalmamali');
  assert.ok(!panel.includes('baslik="İlanlar"'), 'ilanlar yer tutucusu kalmamali');
});

test('listeler sunucudaki RPC ile okunuyor', () => {
  const q = oku('src/lib/queries/index.ts');
  for (const [fn, rpc] of [
    ['fetchPanelIlanlari', 'yonetim_ilanlar'],
    ['fetchPanelOgrencileri', 'yonetim_ogrenciler'],
  ]) {
    const govde = q.slice(q.indexOf('export async function ' + fn));
    const kesit = govde.slice(0, govde.indexOf('export ', 30));
    assert.ok(kesit.includes("supabase.rpc('" + rpc + "'"), fn + ' RPC kullanmali');
    assert.ok(!kesit.includes("select('*'"), fn + " select('*') kullanmamali");
  }
});

test('suzme ve sayfalama sunucuda', () => {
  const sql = oku(LISTE_GOC);
  const ilan = sql.slice(sql.indexOf('function public.yonetim_ilanlar'), sql.indexOf('function public.yonetim_ogrenciler'));
  assert.ok(ilan.includes('limit sinir offset'), 'sayfalama SQL tarafinda olmali');
  assert.ok(ilan.includes('p_arama'), 'arama SQL tarafinda olmali');

  const sayfa = oku('src/components/yonetim/IlanlarSayfasi.tsx');
  assert.ok(sayfa.includes('ofset'), 'sayfa sunucudan sayfa istemeli');
});

test('suzgec sayimlari suzulmus kumeden gelmiyor', () => {
  /*
    Suzgec dugmesindeki sayi, o dugmeye basinca kac satir gorulecegini
    soylemeli. Suzulmus kumeden saymak, secili olan disindaki her sayiyi
    sifir gosterirdi ve suzgec ise yaramaz hale gelirdi.
  */
  const sql = oku(LISTE_GOC);
  const durumSayim = sql.slice(sql.indexOf("'durumSayimlari'"), sql.indexOf("'satirlar'"));
  assert.ok(durumSayim.includes('from listings group by 1'), 'sayimlar tum ilanlardan olmali');
  assert.ok(!durumSayim.includes('from suzulmus'), 'sayimlar suzulmus kumeden olmamali');
});

test('ogrenci listesi kisisel veriyi istemciye acmiyor', () => {
  const sql = oku(LISTE_GOC);
  const ogr = sql.slice(sql.indexOf('function public.yonetim_ogrenciler'));
  assert.ok(ogr.toLowerCase().includes('security definer'));
  assert.ok(ogr.includes('if not public.is_admin()'), 'yonetici kapisi olmali');
  assert.ok(ogr.includes('auth.users'), 'e-posta auth.users tan gelmeli');
  assert.ok(
    sql.toLowerCase().includes('from public, anon'),
    'RPC anon a kapali olmali',
  );
});

test('son gorulme bos oldugunda ekranda aciklaniyor', () => {
  /*
    Bu alan ziyaret olcumunden geliyor ve olcum 22 Eylul 2026 da kuruldu.
    Bos hucreye "hic girmemis" demek, olcemedigimiz seyi yokmus gibi
    gostermek olurdu.
  */
  const sayfa = oku('src/components/yonetim/OgrencilerSayfasi.tsx');
  assert.ok(sayfa.includes('Son görülme'), 'sutun olmali');
  assert.ok(
    sayfa.includes('hiç girmediği anlamına'),
    'bos degerin ne demek OLMADIGI yazmali',
  );
});

test('teklife acik sutunu yaniltici okunmuyor', () => {
  const sayfa = oku('src/components/yonetim/OgrencilerSayfasi.tsx');
  assert.ok(sayfa.includes('hepsiAcik'), 'hepsi acik durumu fark edilmeli');
  assert.ok(
    sayfa.includes('varsayılan olarak açık'),
    'alanin varsayilan oldugu yazmali',
  );
});

/* ------------------------------------------------------------------ */
/*  PANEL: BASVURULAR, SIRKETLER, TARAMA                               */
/* ------------------------------------------------------------------ */

const BST_GOC = 'supabase/migrations/20261102010000_yonetim_basvuru_sirket_tarama.sql';

test('kalan uc sayfa da yer tutucu degil', () => {
  const panel = oku('src/components/yonetim/YonetimPaneli.tsx');
  for (const [kimlik, bilesen] of [
    ['basvurular', 'BasvurularSayfasi'],
    ['sirketler', 'SirketlerSayfasi'],
    ['tarama', 'TaramaSayfasi'],
  ]) {
    assert.ok(
      panel.includes("etkin === '" + kimlik + "' && <" + bilesen),
      kimlik + ' bagli olmali',
    );
  }
  assert.ok(!panel.includes('baslik="Başvurular"'), 'basvurular yer tutucusu kalmamali');
  assert.ok(!panel.includes('baslik="Şirketler"'), 'sirketler yer tutucusu kalmamali');
  assert.ok(!panel.includes('baslik="Tarama"'), 'tarama yer tutucusu kalmamali');
});

test('uc RPC de yonetici kapisinda ve anona kapali', () => {
  const sql = oku(BST_GOC);
  for (const ad of ['yonetim_basvurular', 'yonetim_sirketler', 'yonetim_tarama']) {
    const bolum = sql.slice(sql.indexOf('function public.' + ad));
    assert.ok(bolum.toLowerCase().includes('security definer'), ad + ' security definer olmali');
    assert.ok(bolum.includes('if not public.is_admin()'), ad + ' yonetici kapisi olmali');
  }
  const anonKapali = sql.split('from public, anon').length - 1;
  assert.equal(anonKapali, 3, 'uc RPC de anona kapatilmali');
});

test('dusuk basvuru sayisi ekranda aciklaniyor', () => {
  /*
    Yayindaki 189 ilanin HICBIRI site ici basvuru almiyor; hepsi kariyer
    sayfasina yonlendiriyor. Aciklama olmadan "189 ilan var ama 6 basvuru"
    panelin bozuk oldugunu dusundururdu.
  */
  const sayfa = oku('src/components/yonetim/BasvurularSayfasi.tsx');
  assert.ok(sayfa.includes('kariyer sayfasına yönlendiriyor'), 'sebep yazmali');
  assert.ok(sayfa.includes('bir arıza değil'), 'arıza olmadigi yazmali');
});

test('tarama her kaynagin yalniz SON kosusuna bakiyor', () => {
  /*
    25 binden fazla kosu satiri var. Hepsini saymak panelin sorusunu
    cevaplamaz: soru "hangi kaynak bozuk", "toplam kac kez calisti" degil.
  */
  const sql = oku(BST_GOC);
  const tarama = sql.slice(sql.indexOf('function public.yonetim_tarama'));
  assert.ok(tarama.includes('distinct on (r.source_id)'), 'kaynak basina son kosu alinmali');
});

test('kapali kaynak basarisiz sayilmiyor', () => {
  const sql = oku(BST_GOC);
  const tarama = sql.slice(sql.indexOf('function public.yonetim_tarama'));
  const sayim = tarama.slice(tarama.indexOf("'sonDurumSayimlari'"), tarama.indexOf("'son7Gun'"));
  assert.ok(
    sayim.includes('where is_enabled'),
    'kapali kaynak son durum sayimina girmemeli: gercek arizayi gurultuye gomerdi',
  );
});

test('calismayan dugme konmamis', () => {
  /*
    Tarama zamanli olarak GitHub Actions ta calisiyor; panelden tetikleme
    icin ayri bir yetki yolu gerekiyor. Calismayan bir dugme, calisiyor
    sanilmasina yol acardi.
  */
  const sayfa = oku('src/components/yonetim/TaramaSayfasi.tsx');
  assert.ok(
    sayfa.includes('tetikleme henüz yok'),
    'tetikleme olmadigi yazmali',
  );
});

test('panelde yer tutucu kart kalmadi', () => {
  /*
    Panelin her sayfasi gercek veriyle calisiyor. Kesfet, bolum ve
    paylasim icin duran yer tutucular ULASILAMAYAN olu koddu: o yollar
    YENI_PANEL_YOLLARI icinde degil, tiklaninca eski calisan ekranlara
    gidiliyor.
  */
  const panel = oku('src/components/yonetim/YonetimPaneli.tsx');
  assert.ok(!panel.includes('Hazirlaniyor'), 'yer tutucu bileseni kalmamali');
  assert.ok(!panel.includes('Bu ekranda olacaklar'), 'yer tutucu metni kalmamali');
});

test('panel disinda acilan baglantilar isaretli', () => {
  /*
    Kesfet, bolum ve paylasim ekranlari panelden once yazildi ve kendi
    adreslerinde calisiyor; tiklaninca sol sutun kayboluyor. Sutunun
    sebepsiz kaybolmasi, panelin bozuldugunu dusundururdu.
  */
  const kabuk = oku('src/components/yonetim/YonetimKabuk.tsx');
  const sayac = kabuk.split('disarida: true').length - 1;
  assert.equal(sayac, 3, 'uc baglanti disarida isaretlenmeli');
  assert.ok(kabuk.includes('panel dışında açılır'), 'ekran okuyucuya da soylenmeli');
});

test('yeni panel yollari ile panel sayfalari ortusuyor', () => {
  /*
    Kabuktaki her bağlantı ya panelin kendi yolunda ya da bilerek disarida
    olmali. Uclusu de olmayan bir kimlik, tiklaninca hicbir sey olmayan
    bir menu ogesi demek.
  */
  const app = oku('src/App.tsx');
  const kabuk = oku('src/components/yonetim/YonetimKabuk.tsx');
  const panel = oku('src/components/yonetim/YonetimPaneli.tsx');

  const kume = app.slice(app.indexOf('YENI_PANEL_YOLLARI = new Set('));
  const yollar = kume.slice(0, kume.indexOf(']'));

  const kimlikler = [...kabuk.matchAll(/kimlik: '([a-z]+)'/g)].map((m) => m[1]);
  assert.ok(kimlikler.length >= 12, 'kimlikler okunabilmeli');

  for (const k of kimlikler) {
    const disarida = new RegExp("kimlik: '" + k + "'[^}]*disarida: true").test(kabuk);
    if (disarida) continue;
    const cizilyor = panel.includes("etkin === '" + k + "'");
    assert.ok(cizilyor, k + ' icin panelde bir sayfa olmali');
    const yolVar = k === 'ozet' ? yollar.includes("'/yonetim'") : yollar.includes("/yonetim/" + k);
    assert.ok(yolVar, k + ' yolu YENI_PANEL_YOLLARI icinde olmali');
  }
});
