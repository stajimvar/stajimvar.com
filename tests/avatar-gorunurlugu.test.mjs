import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/*
  AVATAR GÖRÜNÜRLÜĞÜ — ENGELLEME KAPISI ATLANMAMALI

  Bir göç (20260927110000) `avatar_dosyasi_gorunur` içine "yayımlanmış
  profilin avatarı herkese açık" diye bir dal eklemişti. Dal oturumsuz
  ziyaretçi için yazılmıştı ama OTURUMLU çağıran için de devreye
  giriyordu ve `sosyal_gorunur`dan ÖNCE dönüyordu — yani engelleme
  kontrolü (`engelli_mi`) hiç çalışmıyordu. Engellenen kişi,
  engelleyenin avatar dosyasını okuyabiliyordu.

  Göç geri alındı (20260927120000). Bu test aynı hatanın tekrarını
  yakalıyor: avatar kapısı her zaman `sosyal_gorunur`a varmalı, çünkü
  engelleme yalnızca orada uygulanıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

/** Göç klasöründeki en son `avatar_dosyasi_gorunur` tanımı. */
function sonTanim() {
  const klasor = path.join(KOK, 'supabase/migrations');
  const dosyalar = readdirSync(klasor).filter((x) => x.endsWith('.sql')).sort();
  let son = null;
  for (const d of dosyalar) {
    const icerik = oku(`supabase/migrations/${d}`);
    const i = icerik.lastIndexOf('function sosyal_gizli.avatar_dosyasi_gorunur');
    if (i >= 0) son = { dosya: d, govde: icerik.slice(i, icerik.indexOf('$$;', i) + 3) };
  }
  return son;
}

test('avatar kapısı görünürlük kapısına varıyor', () => {
  const tanim = sonTanim();
  assert.ok(tanim, 'avatar_dosyasi_gorunur tanımı bulunamadı');
  /*
    Fonksiyon `sosyal_gorunur` çağrısıyla bitmeli. Ondan önce koşulsuz
    `return true` eden bir dal, engellemeyi atlatır.
  */
  assert.match(tanim.govde, /return sahip = auth\.uid\(\) or sosyal_gizli\.sosyal_gorunur\(sahip\);/,
    `${tanim.dosya}: avatar kapısı sosyal_gorunur'a varmıyor`);
  assert.doesNotMatch(tanim.govde, /yayinda_mi/,
    `${tanim.dosya}: yayımlanmışlık dalı engelleme kontrolünü atlatıyor`);
});

test('anon bu kovada yetkisiz', () => {
  const geri = oku('supabase/migrations/20260927120000_acik_avatar_geri_alindi.sql');
  assert.match(geri, /drop policy if exists "sosyal avatar yayimda ise herkese acik" on storage\.objects;/);
  assert.match(geri, /drop function if exists public\.sosyal_acik_sayaclar\(uuid\);/);
});

test('sayaç tek kapıdan okunuyor, 0 uydurulmuyor', () => {
  const lib = oku('src/lib/queries/sosyal.ts');
  assert.match(lib, /db\.rpc\('sosyal_sayaclar', \{ hedef: profilId \}\)/);
  assert.doesNotMatch(lib, /db\.rpc\('sosyal_acik_sayaclar'/, 'geri alınan dal arayüzde kalmış');
  /* Satır gelmediğinde "sana verilmiyor" demek; sayı basılmıyor. */
  assert.match(lib, /if \(!satir\) return null;/);
});

test('taşınan avatar verisi geri alınmadı', () => {
  /*
    Geri alınan şey yalnızca OKUMA KAPISI. Taşıma betiği ve taşıdığı
    dosyalar yerinde: `social_profiles.avatar_path` değerleri duruyor.
  */
  const geri = oku('supabase/migrations/20260927120000_acik_avatar_geri_alindi.sql');
  assert.doesNotMatch(geri, /update public\.social_profiles/);
  assert.doesNotMatch(geri, /avatar_path\s*=\s*null/);
  assert.ok(oku('scripts/sosyal-avatar-tasi.mjs').length > 0, 'taşıma betiği durmalı');
});

test('üst çubuktaki avatar da ortak kaynaktan okuyor', () => {
  /*
    Üst çubuk `activeStudent.avatarUrl` okuyordu — yani ESKİ alan
    (`profiles.avatar_url`). Fotoğraf ise sosyal profilde
    (`social_profiles.avatar_path`) ve tek kaynak o. Sonuç: aynı
    kullanıcı solda fotoğrafını, sağ üstte baş harflerini görüyordu
    (ölçüldü: @stajimvar'da `avatar_url` null, `avatar_path` dolu).
  */
  const header = oku('src/components/Header.tsx');
  assert.match(header, /<ProfilFotografi\s+ad=\{activeStudent\.fullName\}\s+yol=\{sosyalAvatarYolu\}/);
  /* Eski alan yedek olarak duruyor: iki kaynaklı hesapta fotoğraf kaybolmasın. */
  assert.match(header, /yedekAdres=\{activeStudent\.avatarUrl \|\| null\}/);
  assert.doesNotMatch(header, /url=\{activeStudent\.avatarUrl \|\| undefined\}/, 'eski tek kaynak geri gelmiş');

  /*
    Yol App'te BİR KEZ okunuyor: üst çubuk her sayfada çiziliyor ve
    sorguyu orada açmak her gezinmede fazladan istek demekti.
  */
  const app = oku('src/App.tsx');
  assert.match(app, /sosyalAvatarYolu=\{sosyalAvatarYolu\}/);
  assert.match(app, /void kendiSosyalProfiliGetir\(kimlik\)/);
  /* `/cv` fotoğrafı değiştirince aynı durumu tazeliyor: üst çubuk hemen güncelleniyor. */
  assert.match(app, /onAvatarYolu=\{setSosyalAvatarYolu\}/);
});
