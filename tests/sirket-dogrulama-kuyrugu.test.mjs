import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  ŞİRKET DOĞRULAMA KUYRUĞU

  BİLDİRİLEN SORUN (23 Eylül 2026): bir şirketin VKN'si girildi, şirket
  doğrulanmadı ve yönetim panelinde onaylanacak bir şey de çıkmadı.

  SEBEP: `vknKaydet` yalnız `companies.vkn` sütununa yazıyordu. Karar
  fonksiyonları (`sirket_dogrula`, `sirket_dogrulamayi_reddet`) 30
  Ağustos'tan beri veritabanında duruyor ama arayüzde onları çağıran tek
  satır yoktu; yönetici onay kuyruğu da üç şey dönüyordu (ilan,
  sahiplenme, bölüm). Sahiplenme onayı `verified`a bilerek dokunmuyor.
  Yani VKN yazan şirket süresiz bekliyordu.

  Bu testler o zincirin uçlarını tutuyor: kuyruk dönüyor mu, arayüz
  kararı çağırıyor mu, şirket durumu görüyor mu.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const GOC = oku('supabase/migrations/20261104010000_sirket_dogrulama_kuyrugu.sql');
const SORGULAR = oku('src/lib/queries/index.ts');
const ONAY = oku('src/components/yonetim/OnaySayfasi.tsx');
const FORM = oku('src/sirket/SirketProfilFormu.tsx');
const VERI = oku('src/lib/sirket-veri.ts');

test('kuyruk VKN girili ve dogrulanmamis sirketleri donuyor', () => {
  assert.match(GOC, /'dogrulamalar',/);
  assert.match(GOC, /c\.vkn is not null/);
  assert.match(GOC, /coalesce\(c\.verified, false\) = false/);
});

test('reddedilen kayit kendiliginden geri gelmiyor', () => {
  /*
    Reddedilmiş kayıt kuyrukta kalsaydı liste hiç boşalmazdı. Şirket
    bilgisini güncelleyince (`updated_at` reddin üstüne çıkar) yeniden
    sıraya giriyor — "düzelttim, tekrar bak" demenin yolu bu.
  */
  assert.match(GOC, /c\.dogrulama_reddi_at is null or c\.updated_at > c\.dogrulama_reddi_at/);
});

test('kuyrugu yalniz yonetici cagirabiliyor', () => {
  /* Kapı veritabanında; arayüzdeki gizleme yalnızca görünürlük. */
  assert.match(GOC, /if not public\.is_admin\(\) then/);
  assert.match(GOC, /revoke all on function public\.yonetim_onay_kuyrugu\(\) from public, anon;/);
});

test('sirket kendi ret sebebini okuyabiliyor', () => {
  /*
    Ret notu olmadan reddedilen şirket ekranda süresiz "inceleniyor"
    görüyordu. RPC'nin dönüş tipi değiştiği için `create or replace`
    yetmiyor, önce drop ediliyor.
  */
  assert.match(GOC, /drop function if exists public\.sirket_ozel_bilgilerim\(uuid\);/);
  assert.match(GOC, /dogrulama_notu text,\n\s+dogrulama_reddi_at timestamptz/);
  assert.match(VERI, /dogrulamaNotu: satir\.dogrulama_notu \?\? null/);
  assert.match(VERI, /dogrulamaReddiAt: ozel\?\.dogrulamaReddiAt \?\? null/);
});

test('arayuz karar fonksiyonlarini cagiriyor', () => {
  assert.match(SORGULAR, /supabase\.rpc\('sirket_dogrula' as never/);
  assert.match(SORGULAR, /supabase\.rpc\('sirket_dogrulamayi_reddet' as never/);
  assert.ok(ONAY.includes('await sirketiDogrula(d.id)'));
  assert.ok(ONAY.includes('await sirketDogrulamasiniReddet(d.id, redSebebi.trim())'));
});

test('onay sayfasinda dogrulama sekmesi var', () => {
  assert.match(ONAY, /etiket="Doğrulama"/);
  assert.match(ONAY, /adet=\{dogrulamalar\.length\}/);
  assert.ok(ONAY.includes('Doğrulama bekleyen şirket yok'));
});

test('sebepsiz ret gonderilemiyor', () => {
  /* Sebepsiz ret, şirketin ne yapacağını bilmemesi demek; fonksiyon da kabul etmiyor. */
  assert.ok(ONAY.includes("if (karar === 'reddet' && !redSebebi.trim()) return;"));
  assert.match(ONAY, /disabled=\{!redSebebi\.trim\(\)/);
});

test('eski sunucuda sekme cokmuyor', () => {
  /* Göç uygulanmadan önce `dogrulamalar` undefined gelir. */
  assert.match(SORGULAR, /dogrulamalar: kuyruk\?\.dogrulamalar \?\? \[\]/);
});

test('sirket bekleme ve ret durumunu goruyor', () => {
  assert.ok(FORM.includes('Doğrulama inceleniyor'));
  assert.ok(FORM.includes('Doğrulama reddedildi'));
  /*
    Tutulamayan söz kalktı: doğrulama sonucu için e-posta gönderen akış
    yok. Yorumlar ayıklanıyor — gerekçe metni o cümleyi alıntılıyor.
  */
  const govde = FORM.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!govde.includes('sonucu e-postayla yazıyoruz'));
  assert.ok(govde.includes('sonucu bu sayfada göreceksin'));
});
