import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CALISAN_SAYILARI,
  isverenDurumu,
  profilFormunuDogrula,
  telefonBicimi,
  vknBicimi,
  webAdresi,
} from '../src/lib/isveren-profil-formu.mjs';

/*
  İŞVEREN BAŞLANGICI (7 Kasım 2026, kullanıcı kararı)

  "İşverenim" diye kaydolan kişiye e-posta doğrulamasından sonra şirket
  profili sayfası; onay beklerken işveren görünümü. Ölçülen olay:
  modmere34 öğrenci profiliyle ("3. Sınıf", "Staj arıyorum") karşılaştı.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

/* ------------------------------------------------------------- kurallar */

test('web adresi: şemasız yazım tamamlanıyor, http(s) dışı ve noktasız red', () => {
  assert.equal(webAdresi('ornek.com'), 'https://ornek.com');
  assert.equal(webAdresi('https://www.ornek.com.tr/'), 'https://www.ornek.com.tr');
  assert.equal(webAdresi(''), '');
  assert.equal(webAdresi('javascript:alert(1)'), null);
  assert.equal(webAdresi('ornek'), null);
});

test('VKN 10, T.C. kimlik 11 hane; telefon alan koduyla', () => {
  assert.equal(vknBicimi('1234567890'), '1234567890');
  assert.equal(vknBicimi('123 456 7890'), '1234567890');
  assert.equal(vknBicimi('12345678901'), '12345678901');
  assert.equal(vknBicimi('12345'), null);
  assert.equal(vknBicimi(''), '');
  assert.equal(telefonBicimi('0 532 111 22 33'), '0 532 111 22 33');
  assert.equal(telefonBicimi('123'), null);
});

test('yeni şirket: ad, web sitesi, görev zorunlu; geri kalanı isteğe bağlı', () => {
  const bos = profilFormunuDogrula('yeni', {});
  assert.deepEqual(Object.keys(bos.hatalar).sort(), ['gorev', 'sirketAdi', 'webSitesi']);
  const tam = profilFormunuDogrula('yeni', {
    sirketAdi: ' Modmere ', webSitesi: 'modmere.com', gorev: 'Kurucu', calisanSayisi: '1-10',
    sektor: 'Moda', sehir: 'İstanbul', vkn: '1234567890', tanitim: 'Kalıp mağazası', telefon: '0532 111 22 33',
  });
  assert.deepEqual(tam.hatalar, {});
  assert.equal(tam.deger.sirketAdi, 'Modmere');
  assert.equal(tam.deger.webSitesi, 'https://modmere.com');
  assert.equal(tam.deger.calisanSayisi, '1-10');
  assert.equal(profilFormunuDogrula('yeni', { sirketAdi: 'x', webSitesi: 'x.com', gorev: 'y', calisanSayisi: '7' }).hatalar.calisanSayisi, 'Listeden seç.');
  assert.ok(profilFormunuDogrula('yeni', { sirketAdi: 'x', webSitesi: 'x.com', gorev: 'y', tanitim: 'a'.repeat(1201) }).hatalar.tanitim);
});

test('sahiplenme: yalnız görev zorunlu; şirket alanları istenmiyor', () => {
  assert.deepEqual(Object.keys(profilFormunuDogrula('sahiplenme', {}).hatalar), ['gorev']);
  assert.deepEqual(profilFormunuDogrula('sahiplenme', { gorev: 'İK' }).hatalar, {});
});

test('çalışan sayısı listesi şirket paneliyle aynı', () => {
  const panel = oku('src/sirket/SirketProfilFormu.tsx').match(/const BOYUTLAR = (\[[^\]]+\])/)[1];
  assert.deepEqual(JSON.parse(panel.replace(/'/g, '"')), [...CALISAN_SAYILARI]);
});

test('işveren durumu: üyelik > bekleyen talep > niyet', () => {
  assert.equal(isverenDurumu({ niyet: 'isveren', uye: true, talepDurumu: 'bekliyor' }), 'uye');
  assert.equal(isverenDurumu({ niyet: 'isveren', talepDurumu: 'bekliyor' }), 'bekliyor');
  assert.equal(isverenDurumu({ niyet: 'isveren' }), 'baslamadi');
  assert.equal(isverenDurumu({}), null);
});

/* ------------------------------------------------------------------ göç */

const GOC = oku('supabase/migrations/20261223010000_isveren_baslangic.sql');
const kod = GOC.replace(/\/\*[\s\S]*?\*\//g, '');

test('göç: başkası adına talep yok, kişi kendi talebini görüyor', () => {
  assert.match(kod, /or user_id = auth\.uid\(\)/);
  assert.match(kod, /\(auth\.uid\(\) is null and user_id is null\)/);
  assert.match(kod, /create policy "kendi sirket talebini gorur"[\s\S]*?using \(user_id = auth\.uid\(\)\)/);
  /* Onay alanları istemciden yazılamıyor. */
  assert.match(kod, /grant insert \(sektor, calisan_sayisi, sehir, vkn, tanitim, logo_url\)/);
  assert.doesNotMatch(kod, /grant insert \([^)]*(sirket_id|karar_gerekcesi|durum)/);
});

test('göç: onay yalnız yönetici; aynı adlı şirkette duruyor; sahip + rol', () => {
  const onay = kod.slice(kod.indexOf('function public.approve_sirket_talebi'), kod.indexOf('function public.reject_sirket_talebi'));
  assert.match(onay, /if not public\.is_admin\(\) then/);
  assert.match(onay, /bu adla bir sirket zaten var/);
  assert.match(onay, /'manual', false, t\.user_id/);
  assert.match(onay, /insert into public\.company_members/);
  assert.match(onay, /update public\.profiles set role = 'company' where id = t\.user_id/);
  assert.match(kod, /revoke all on function public\.approve_sirket_talebi\(uuid\) from public, anon;/);
  assert.match(kod, /vkn_gecerli\(vkn\)/);
});

/* ----------------------------------------------------------- uygulama */

test('doğrulamadan dönen ve kayıtta oturum açan işveren şirket profiline gidiyor', () => {
  const app = oku('src/App.tsx');
  assert.equal((app.match(/navigate\('\/isveren\/baslangic'\)/g) || []).length, 2);
  assert.match(app, /if \(temizYol === '\/isveren\/baslangic'\) \{\s*return icerikSayfasi\(\s*<IsverenBaslangic/);
});

test('onay bekleyen işverende öğrenci profili açılmıyor; üst çubuk işveren diyor', () => {
  const app = oku('src/App.tsx');
  assert.match(app, /const bekleyenIsveren = Boolean\(session && session\.kayitNiyeti === 'isveren' && !sirketUyesi && kabukRolu !== 'company'\);/);
  assert.match(app, /if \(temizYol === '\/cv' \|\| temizYol === '\/cv\/yazdir'\) navigate\('\/isveren\/baslangic', \{ degistir: true \}\);/);
  assert.match(app, /'İşveren hesabı · onay bekleniyor'/);
  const header = oku('src/components/Header.tsx');
  assert.match(header, /hesapEtiketi = 'Öğrenci hesabı',/);
  assert.match(header, /\{hesapEtiketi\}<\/span>/);
});

test('şirket profili gönderilince niyet hesaba yazılıyor; yönetici yeni şirketi onaylayabiliyor', () => {
  const sayfa = oku('src/components/IsverenBaslangic.tsx');
  assert.ok(sayfa.indexOf('isverenNiyetiniKaydet()') < sayfa.indexOf('yeniSirketTalebiGonder({'));
  const veri = oku('src/lib/isveren-baslangic.ts');
  assert.match(veri, /updateUser\(\{ data: \{ kayit_niyeti: 'isveren' \} \}\)/);
  assert.match(veri, /`\$\{userId\}\/talep-\$\{Date\.now\(\)\}\.\$\{uzanti\}`/);
  const yonetici = oku('src/components/AdminClaimsView.tsx');
  assert.match(yonetici, /<YeniSirketTalepleri onToast=\{onToast\} \/>/);
  assert.match(yonetici, /sirketTalebiniOnayla\(t\.id\)/);
});

test('sınıf uydurulmuyor: boşsa boş, kaydederken null', () => {
  const m = oku('src/lib/queries/mappers.ts');
  assert.match(m, /gradeLevel: row\.grade_level \?\? '',/);
  assert.doesNotMatch(m, /grade_level \?\? '3\. Sınıf'/);
  assert.match(m, /studentPatch\.grade_level = patch\.gradeLevel \|\| null;/);
});

/*
  GÜVENLİK İNCELEMESİ (7 Kasım 2026): adres biçimi yalnız formdaydı; API'ye
  doğrudan yazan biri `javascript:` adresi bırakabilirdi. Kural veritabanında
  ve yönetici ekranında da var.
*/
test('web ve logo adresi veritabanında da denetleniyor; logo yalnız kendi klasöründen', () => {
  assert.match(kod, /sirket_talepleri_web_sitesi_http[\s\S]*?web_sitesi ~\* '\^https\?:\/\//);
  assert.match(kod, /sirket_talepleri_kariyer_sayfasi_http/);
  assert.match(kod, /sirket_talepleri_logo_depo[\s\S]*?user_id is not null[\s\S]*?\/storage\/v1\/object\/public\/logos\/'\s*\|\|\s*user_id::text\s*\|\|\s*'\/talep-\[0-9\]\+\\.\(png\|jpg\|webp\)\$'/);
  /* Kısıt talepLogosuYukle'nin yazdığı adla birebir uyuşuyor. */
  const ornek = 'https://gdumgdgwlfnohkaucfow.supabase.co/storage/v1/object/public/logos/a610d880-1dde-4413-8551-b4f56c1e526b/talep-1793568457658.png';
  assert.match(ornek, /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/logos\/a610d880-1dde-4413-8551-b4f56c1e526b\/talep-[0-9]+\.(png|jpg|webp)$/);
});

test('yönetici ekranı yalnız güvenli bağlantı ve görsel çiziyor', () => {
  const y = oku('src/components/AdminClaimsView.tsx');
  assert.match(y, /const web = guvenliWeb\(t\.webSitesi\);/);
  assert.match(y, /const logo = guvenliLogo\(t\.logoUrl\);/);
  assert.match(y, /<a href=\{web\}/);
  assert.match(y, /<img src=\{logo\}/);
  assert.doesNotMatch(y, /href=\{t\.webSitesi\}|src=\{t\.logoUrl\}/);
});

/*
  Yeni paneldeki onay ekranında yeni şirket sekmesi yoktu; Modmere talebi
  yöneticinin baktığı ekranda görünmedi (7 Kasım 2026).
*/
test('yeni panelin onay ekranında "Yeni şirket" sekmesi talepleri gösteriyor', () => {
  const onay = oku('src/components/yonetim/OnaySayfasi.tsx');
  assert.match(onay, /etiket="Yeni şirket"/);
  assert.match(onay, /<YeniSirketTalepleri onToast=\{setBilgi\} onSayi=\{setYeniSirketSayisi\} \/>/);
  assert.match(onay, /bekleyenSirketTalepleri\(\)/);
  assert.match(oku('src/components/AdminClaimsView.tsx'), /export const YeniSirketTalepleri/);
});

/*
  ONAY = DOĞRULAMA (9 Kasım 2026, kullanıcı kararı): Modmere onaylandı ama
  doğrulanmamış açıldı; ilanı incelemeye düştü. Yönetici onayı artık
  şirketi doğruluyor.
*/
test('yönetici onayı şirketi doğruluyor (yeni şirket ve sahiplenme)', () => {
  const g = oku('supabase/migrations/20261225010000_onay_dogrulama.sql').replace(/\/\*[\s\S]*?\*\//g, '');
  const yeni = g.slice(g.indexOf('function public.approve_sirket_talebi'), g.indexOf('function public.approve_company_claim'));
  assert.match(yeni, /'manual', true, t\.user_id/);
  assert.match(yeni, /if not public\.is_admin\(\) then/);
  const sah = g.slice(g.indexOf('function public.approve_company_claim'));
  assert.match(sah, /verified = true/);
  assert.match(sah, /if not public\.is_admin\(\) then/);
  assert.match(g, /revoke all on function public\.approve_company_claim\(uuid\) from public, anon;/);
  assert.match(g, /where durum = 'onaylandi' and sirket_id is not null/);
});

/*
  TEK İŞVEREN KAPISI (9 Kasım 2026, uçtan uca denetim): Google ile gelen
  işverende niyet yazılmıyor, dönüş eski sahiplenme sayfasına gidiyordu.
*/
test('tek kapı: Google dönüşü, giriş dönüşü ve panel yolları şirket profili sayfasına', () => {
  const app = oku('src/App.tsx');
  assert.match(app, /oauthDonusYolu=\{authBaglam === 'isveren' && !sirketUyesi \? '\/isveren\/baslangic' : authDonusYolu \?\? undefined\}/);
  assert.match(app, /if \(!session \|\| !uyelikOkundu \|\| isAdmin\) return;/);
  assert.match(app, /if \(temizYol === '\/isveren\/baslangic' && sirketUyesi\) \{\s*navigate\('\/sirket\/ilanlar', \{ degistir: true \}\);/);
  assert.match(app, /temizYol === '\/isveren\/ilan-ver' \|\|\s*SIRKET_PANEL_YOLLARI\.some/);
  assert.match(app, /\}, \[session\?\.userId, isverenTalepSurumu\]\);/);
  const sayfa = oku('src/components/IsverenBaslangic.tsx');
  assert.match(sayfa, /if \(!userId \|\| niyetKayitli\) return;\s*isverenNiyetiniKaydet\(\)/);
});

test('işveren sayfası ve SSS bugünkü akışı anlatıyor: görüşme/teklif ve teklif-kabulü iletişimi yok', () => {
  const inis = oku('src/components/IsverenLanding.tsx');
  const sss = oku('src/data/isveren-sss.ts');
  for (const kod of [inis, sss]) {
    assert.doesNotMatch(kod, /teklifinizi öğrenci kabul|görüşmeye davet ediyor|Görüşmeye davet ' \+/);
  }
  assert.match(inis, /paylaşmayı onayladığı telefon ve e-postayla/);
  assert.match(sss, /salt okunur üyeler göremez/);
});
