import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  TEK GİRİŞ KAPISI (kullanıcı kararı, 23 Eylül 2026)

  Site "öğrenci girişi" ve "işveren/şirket girişi" diye iki tabela
  gösteriyordu. Arkadaki hesap ikisinde de AYNI: tek kullanıcı sistemi,
  şirket erişimini `company_members` veriyor. Üç ayrı başlık, olmayan üç
  kapıyı işaret ediyordu.

  Giriş artık tek; nereye düşüleceğini hesabın kendisi söylüyor. Kayıt
  ayrı kaldı çünkü orada gerçekten farklı veri toplanıyor (öğrencide ad,
  şirkette kurum bilgileri ve İK kimliği).
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const PENCERE = oku('src/components/AuthModal.tsx');
const UYGULAMA = oku('src/App.tsx');
const BASLIK_CUBUGU = oku('src/components/Header.tsx');
const ISVEREN_INIS = oku('src/components/IsverenLanding.tsx');
const SAHIPLENME = oku('src/components/IsverenGirisi.tsx');

test('giris ekraninda tek baslik var', () => {
  assert.ok(
    PENCERE.includes("? 'StajımVar’a giriş yap'"),
    'giriste herkese ayni baslik gosterilmeli',
  );
  /* Eski üç tabela geri gelmemeli. */
  assert.ok(!PENCERE.includes('Öğrenci Hesabınıza Giriş Yapın'));
  assert.ok(!PENCERE.includes('Şirket Hesabınıza Giriş Yapın'));
  assert.ok(!PENCERE.includes("'İşveren girişi'"));
});

test('kayit hala baglamina gore konusuyor', () => {
  /*
    Giriş birleşti diye kayıt da birleştirilmedi: öğrenci kaydı ad
    istiyor, şirket kaydı kurum bilgisi ve İK kimliği. Tek forma
    indirmek, doldurulmayacak alanlar demekti.
  */
  assert.ok(PENCERE.includes('Kurumsal Şirket Hesabı Oluşturun'));
  assert.ok(PENCERE.includes('İşveren hesabınızı oluşturun'));
  assert.ok(PENCERE.includes('Öğrenci Hesabı Oluşturun'));
});

test('giris sonrasi hedefi sirket UYELIGI belirliyor', () => {
  /*
    `profiles.role` istemciden gelen bir görünüm anahtarı; yetki
    `company_members`ta ve RLS de ona bakıyor. Üretimde şirketini
    sahiplenmiş ama rolü 'company' olmayan hesap var — rol'e bakılsaydı
    onlar işveren paneli yerine öğrenci tarafına düşerdi.
  */
  assert.match(UYGULAMA, /const baglam = await m\.sirketBaglami\(userId, false\);/);
  assert.match(UYGULAMA, /sirketeUye = Boolean\(baglam\.companyId\)/);
  assert.match(UYGULAMA, /if \(sirketeUye\) \{[\s\S]{0,200}navigate\('\/sirket\/ilanlar'\)/);
});

test('sirketi olmayan hesap bos panele gonderilmiyor', () => {
  /*
    İşveren sayfasındaki düğmeden gelen dönüş yolu /sirket/... oluyor.
    Hesabın şirketi yoksa o panel boş bir ekran; oradaki doğru adım
    şirketi sahiplenmek.
  */
  assert.match(
    UYGULAMA,
    /istenen\.startsWith\('\/sirket'\) && !sirketeUye \? '\/isveren\/ilan-ver' : istenen/,
  );
});

test('uyelik okunamazsa ogrenci tarafina dusuyor', () => {
  /* Erişimi olmayan panele göndermek, ana sayfaya göndermekten kötü. */
  const bas = UYGULAMA.indexOf('let sirketeUye = role');
  assert.ok(bas > 0, 'uyelik hesabi bulunamadi');
  assert.match(UYGULAMA.slice(bas, bas + 700), /catch \{/);
});

test('giris etiketleri ayri kapi vaat etmiyor', () => {
  for (const [ad, kaynak] of [
    ['Header', BASLIK_CUBUGU],
    ['IsverenLanding', ISVEREN_INIS],
    ['IsverenGirisi', SAHIPLENME],
  ]) {
    const govde = kaynak.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!govde.includes('İşveren Girişi'), `${ad}: eski etiket kalmis`);
    assert.ok(!govde.includes('Şirket girişi'), `${ad}: eski etiket kalmis`);
  }
});

test('giris penceresi kimligi de veriyor', () => {
  /*
    Üyelik sorgusu kimlik istiyor; oturum `onAuthChange` ile biraz sonra
    geliyor ve onu beklemek yönlendirmeyi geciktiriyordu.
  */
  assert.match(PENCERE, /onSuccess\(result\.role, result\.displayName, result\.userId\)/);
  /* İmza çok satırlı (kayıt niyeti de eklendi); aranan şey kimliğin taşınması. */
  assert.match(PENCERE, /onSuccess: \([\s\S]{0,600}userId\?: string,/);
});
