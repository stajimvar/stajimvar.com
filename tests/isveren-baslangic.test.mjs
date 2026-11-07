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
