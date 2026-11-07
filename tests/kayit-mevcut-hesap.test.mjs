import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ESKI_HESAP_ESIGI_MS, kayitSonucu, mevcutHesapMetni } from '../src/lib/kayit-mevcut-hesap.mjs';

/*
  KAYITLI E-POSTA (7 Kasım 2026): Supabase hata dönmüyor; ekran "Hesabın
  oluşturuldu" dememeli. Ölçülen olay: doğrulanmamış eski öğrenci hesabının
  e-postasıyla "İşverenim" kaydı → Supabase doğrulama postasını yeniden
  gönderdi (user_confirmation_requested), yeni hesap açılmadı.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

test('yeni hesap: kimlik var, açılış ile son güncelleme aynı an', () => {
  assert.equal(kayitSonucu({ identities: [{}], created_at: '2026-11-07T18:19:29.100Z', updated_at: '2026-11-07T18:19:29.130Z', confirmation_sent_at: '2026-11-07T18:19:29.120Z' }), 'yeni');
  assert.equal(kayitSonucu(null), 'yeni');
});

test('doğrulanmış hesap zaten var: kimlik dizisi boş', () => {
  assert.equal(kayitSonucu({ identities: [], created_at: '2026-08-27T22:39:59Z', updated_at: '2026-08-28T10:00:00Z' }), 'dogrulanmis');
});

test('doğrulanmamış eski hesap: açılış eski, doğrulama postası şimdi (ölçülen olay)', () => {
  const k = { identities: [{}], created_at: '2026-08-27T22:39:59.467Z', updated_at: '2026-11-07T18:19:29.000Z', confirmation_sent_at: '2026-11-07T18:19:29.000Z' };
  assert.equal(kayitSonucu(k), 'dogrulanmamis');
  /* Eşik bir dakika; sınırın altı yeni sayılıyor. */
  assert.equal(kayitSonucu({ identities: [{}], created_at: '2026-11-07T18:00:00Z', updated_at: new Date(Date.parse('2026-11-07T18:00:00Z') + ESKI_HESAP_ESIGI_MS - 1).toISOString() }), 'yeni');
});

test('metin "oluşturuldu" demiyor; işverende sahiplenme yolu var', () => {
  for (const d of ['dogrulanmis', 'dogrulanmamis']) {
    for (const isveren of [false, true]) {
      const m = mevcutHesapMetni(d, isveren);
      assert.doesNotMatch(m, /oluşturuldu/);
      assert.match(m, /yeni hesap açılmadı/);
      assert.equal(/sahiplenebilirsin/.test(m), isveren);
    }
  }
});

test('kayıt akışı kontrolü "oluşturuldu" mesajından ÖNCE yapıyor', () => {
  const auth = oku('src/lib/auth.ts');
  assert.match(auth, /mevcutHesap: kayitSonucu\(data\.user\)/);
  const modal = oku('src/components/AuthModal.tsx');
  const kontrol = modal.indexOf("if (mevcut === 'dogrulanmis')");
  const olustu = modal.indexOf("'Hesabın oluşturuldu.");
  assert.ok(kontrol > 0 && olustu > kontrol, 'mevcut hesap kontrolü başarı mesajından önce');
});

/*
  İŞVEREN NİYETİ E-POSTA DOĞRULAMASINDAN SAĞ ÇIKIYOR (7 Kasım 2026)

  Ölçüldü: modmere34 "İşverenim" diye kaydoldu, doğrulama bağlantısıyla
  ana sayfaya döndü ve öğrenci CV karşılamasını gördü; üst veride niyetten
  iz yoktu. Niyet artık üst veride, oturumda ve iki yerde okunuyor.
*/
test('niyet üst veriye yazılıyor, oturumda okunuyor; rol değişmiyor', () => {
  const auth = oku('src/lib/auth.ts');
  assert.match(auth, /\.\.\.\(input\.niyet === 'isveren' \? \{ kayit_niyeti: 'isveren' \} : \{\}\)/);
  assert.match(auth, /session\.user\.user_metadata\?\.kayit_niyeti === 'isveren' \? \{ kayitNiyeti: 'isveren' as const \}/);
  /* Rol yine öğrenci: niyet yetki vermiyor. */
  assert.match(auth, /role: 'student',\s*kvkk_consent: true/);
  assert.match(oku('src/components/AuthModal.tsx'), /niyet: kayitTuru,/);
});

test('işverene CV karşılaması yok; doğrulamadan dönünce bir kez sahiplenmeye', () => {
  const app = oku('src/App.tsx');
  assert.match(app, /if \(session\.kayitNiyeti === 'isveren'\) return;\s*let depo/);
  const efekt = app.slice(app.indexOf("if (!sessionReady || !session || session.kayitNiyeti !== 'isveren') return;"));
  assert.ok(efekt.length > 100, 'yönlendirme efekti var');
  const govde = efekt.slice(0, efekt.indexOf('}, [sessionReady, session?.userId, session?.kayitNiyeti]);'));
  assert.match(govde, /if \(window\.location\.pathname !== '\/'\) return;/);
  assert.match(govde, /stajimvar_isveren_ilk_giris:\$\{session\.userId\}/);
  assert.match(govde, /sirketBaglami\(session\.userId, false\)/);
  /* Şirketi olan hesap sahiplenmeye gönderilmiyor; işaret yönlendirmeden önce yazılıyor. */
  assert.ok(govde.indexOf("depo.setItem(anahtar, '1')") < govde.indexOf("navigate('/isveren/ilan-ver')"));
  assert.match(govde, /if \(uye\) return;\s*navigate\('\/isveren\/ilan-ver'\);/);
});

test('aynı adrese ikinci posta (429) "Bir sorun oluştu" demiyor', () => {
  const auth = oku('src/lib/auth.ts');
  assert.match(auth, /\[\/only request this after\|for security purposes\/i, 'Doğrulama e-postası az önce gönderildi\./);
});
