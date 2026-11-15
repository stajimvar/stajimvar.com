import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/*
  HESABIMI SİL (15 Kasım 2026): sitede hesap silme yolu yoktu; ilk KVKK
  11. madde talebi e-postayla geldi.
*/
const goc = oku('supabase/migrations/20270114010000_hesap_silme.sql');
const islev = oku('supabase/functions/hesap-sil/index.ts');

test('silme işlevi kimliği oturumdan alıyor ve açık onay istiyor', () => {
  assert.match(islev, /await db\.auth\.getUser\(jwt\)/);
  assert.match(islev, /if \(govde\.onay !== ONAY\) return yanit\(\{ kod: 'onay-yok' \}, 400\);/);
  /* Gövdeden kimlik okunmuyor: başkasının hesabı silinemez. */
  assert.doesNotMatch(islev, /govde\.(id|kullanici|user)/);
  assert.match(islev, /db\.auth\.admin\.deleteUser\(kullanici\.id\)/);
  assert.match(oku('supabase/config.toml'), /\[functions\.hesap-sil\]\nverify_jwt = true/);
  assert.match(oku('.github/workflows/supabase-production.yml'), /supabase functions deploy hesap-sil --project-ref/);
});

test('yönetici ve şirketin tek sahibi silinmiyor; sıra: kapı → dosya → hazırlık → silme', () => {
  assert.match(islev, /if \(k\.yonetici\) return yanit\(\{ kod: 'yonetici' \}, 409\);/);
  assert.match(islev, /if \(k\.son_sahip\?\.length\) return yanit\(\{ kod: 'son-sahip', sirketler: k\.son_sahip \}, 409\);/);
  const sira = ['hesap_silme_on_kontrol', 'hesap_dosyalari', 'hesap_silmeye_hazirla', 'deleteUser', 'epostaGonder(kullanici'];
  const yerler = sira.map((s) => islev.lastIndexOf(s));
  assert.deepEqual([...yerler].sort((a, b) => a - b), yerler, 'adım sırası bozuk');
  assert.match(goc, /raise exception 'yonetici-hesabi'/);
});

test('silmeyi engelleyen bağlar çözülüyor; fonksiyonlar yalnız service_role', () => {
  for (const s of [
    'update public.companies            set claimed_by = null',
    'update public.sources              set tos_reviewed_by = null',
    'update public.application_channels set verified_by = null',
    'update public.department_sectors   set onaylayan = null',
    'update public.department_aliases   set onaylayan = null',
    'delete from public.social_profile_denetim where yapan = p_kullanici',
    'delete from public.bolum_talep_denetim    where yapan = p_kullanici',
  ]) assert.ok(goc.includes(s), s);
  for (const f of ['hesap_silme_on_kontrol', 'hesap_dosyalari', 'hesap_silmeye_hazirla']) {
    assert.match(goc, new RegExp(String.raw`revoke all on function public\.${f}\(uuid\)\s+from public, anon, authenticated;`));
    assert.match(goc, new RegExp(String.raw`grant execute on function public\.${f}\(uuid\)\s+to service_role;`));
  }
  /* Şirket sayfasında kullanılan logo ve etkinlik kapakları silinmiyor. */
  assert.match(goc, /o\.bucket_id <> 'event-covers'/);
  assert.match(goc, /c\.logo_url like '%\/logos\/' \|\| o\.name/);
});

test('pencere iki onay istiyor; bağlantı gizli yerde, yönetici dışındaki herkese', () => {
  const p = oku('src/components/HesapSilmePenceresi.tsx');
  assert.match(p, /const hazir = okudum && yazi\.trim\(\)\.toLocaleUpperCase\('tr-TR'\) === SILME_ONAYI && !siliniyor;/);
  assert.match(p, /disabled=\{!hazir\}/);
  assert.match(p, /geri alınamaz/);
  const app = oku('src/App.tsx');
  assert.match(app, /onHesabiSil=\{isAdmin \? undefined : \(\) => setHesapSilme\('ogrenci'\)\}/);
  assert.match(app, /onHesabiSil=\{isAdmin \? undefined : \(\) => setHesapSilme\('sirket'\)\}/);
  /*
    Kullanıcı kararı (15 Kasım 2026): menüde değil, daha gizli — öğrencide
    profil düzenlemenin, şirkette e-posta tercihlerinin en dibinde soluk
    bir yazı bağlantısı.
  */
  assert.doesNotMatch(oku('src/components/ProfilBasligi.tsx'), /hesap-sil|Hesabımı sil/);
  assert.doesNotMatch(oku('src/sirket/SirketProfili.tsx'), /anahtar: 'hesap-sil'/);
  const duzenleme = oku('src/components/ProfilDuzenleme.tsx');
  assert.match(duzenleme, /\{onHesabiSil && \([\s\S]{0,300}text-xs font-semibold text-gray-400[\s\S]{0,120}Hesabını sil/);
  assert.match(oku('src/components/StudentProfileView.tsx'), /onStartQuiz=\{onStartQuiz\}\s+onHesabiSil=\{onHesabiSil\}/);
  const sirket = oku('src/sirket/SirketProfili.tsx');
  assert.match(sirket, /<EpostaTercihleri userId=\{userId\} \/>\s+\{onHesabiSil && \(/);
  /* Başarıda yerel oturum da kapanıyor. */
  assert.match(oku('src/lib/hesap-silme.ts'), /await supabase\.auth\.signOut\(\{ scope: 'local' \}\)/);
});
