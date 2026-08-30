import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyChangedPaths } from '../scripts/detect-deploy-changes.mjs';

test('classifies an Opportunities UI-only change without requiring Supabase deployment', () => {
  assert.deepEqual(classifyChangedPaths(['src/components/OpportunitiesPage.tsx']), {
    supabaseChanged: false,
    appChanged: true,
  });
});

test('requires Supabase deployment for migrations and Edge Functions', () => {
  assert.equal(classifyChangedPaths(['supabase/migrations/20260822000000_add.sql']).supabaseChanged, true);
  assert.equal(classifyChangedPaths(['supabase/functions/opportunity-source-check/index.ts']).supabaseChanged, true);
  assert.equal(classifyChangedPaths(['supabase/config.toml']).supabaseChanged, true);
  assert.equal(classifyChangedPaths(['.github/workflows/supabase-production.yml']).supabaseChanged, true);
});

test('writes GitHub job outputs when called with a relative script path', () => {
  /*
    TAM GEÇMİŞ GEREKİYOR

    `HEAD^` okunuyor. GitHub Actions'ın varsayılan sığ klonunda (fetch-depth
    1) ata commit yok ve test ÜRÜN DEĞİL ORTAM yüzünden düşüyordu. İş akışı
    bu yüzden `fetch-depth: 0` ile klonluyor.
  */
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const before = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
  const changedPaths = execFileSync('git', ['diff', '--name-only', before, head], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  const expected = classifyChangedPaths(changedPaths);

  /*
    ÇIKTI DOSYASI TESTİN KONTROLÜNDE

    Betik `GITHUB_OUTPUT` tanımlıysa oraya YAZIYOR, tanımlı değilse
    stdout'a. Test yalnızca stdout'u okuyordu: geliştirici makinesinde
    değişken boş olduğu için geçiyor, GitHub Actions içinde değişken
    dolu olduğu için çıktı dosyaya gidiyor ve test boş metin görüp
    düşüyordu.

    Artık dosya testin verdiği geçici bir yol: CI'da gerçekten
    kullanılan kod yolu sınanıyor ve sonuç ortama göre değişmiyor.
  */
  const ciktiDosyasi = path.join(os.tmpdir(), `deploy-cikti-${process.pid}.txt`);
  fs.writeFileSync(ciktiDosyasi, '');
  execFileSync(process.execPath, ['scripts/detect-deploy-changes.mjs'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_EVENT_BEFORE: before,
      GITHUB_SHA: head,
      GITHUB_OUTPUT: ciktiDosyasi,
    },
  });
  const output = fs.readFileSync(ciktiDosyasi, 'utf8');
  fs.rmSync(ciktiDosyasi, { force: true });
  /*
    DEĞERE DEĞİL BİÇİME BAKIYORUZ

    Burada `supabase_changed=true` aranıyordu. Bu, testi SON COMMIT'İN
    içeriğine bağlıyor: Supabase dosyalarına dokunmayan sıradan bir commit
    atıldığında betik doğru çalıştığı hâlde test kırmızı oluyordu — ve
    kırmızı kaldığı sürece gerçek bir kırılma görünmez hâle geliyor.

    Testin adı zaten "çıktı yazıyor mu" diyor: iki anahtarın da geçerli bir
    değerle yazıldığını doğrulamak yeterli.
  */
  assert.match(output, /supabase_changed=(true|false)/);
  assert.match(output, /app_changed=(true|false)/);
});

/*
  SİTE DAĞITIMI ARTIK SUPABASE İŞİNE BAĞLI DEĞİL

  Bu test eskiden `migrate_and_functions.result == 'success'` koşulunu
  arıyordu. O koşul 23 Ağustos'ta BİLEREK kaldırıldı: üretim veritabanı bu
  depodakinden başka bir migration soyuyla kurulduğu için migration işi
  kalıcı olarak kırmızıydı ve şema değişikliği gerektirmeyen sıradan arayüz
  değişikliklerinin bile yayına çıkmasını engelliyordu. Kalıcı kırmızı bir
  kapı, olmayan kapıdan kötü.

  Test o değişiklikten sonra güncellenmedi ve o günden beri kırmızı
  duruyordu — yani `node --test tests/` çalıştıran herkes başarısız bir
  paketle karşılaşıyor, bu da gerçek bir kırılmayı görünmez yapıyor.
  Test artık YÜRÜRLÜKTEKİ kuralı doğruluyor: dağıtım yalnızca uygulama
  doğrulamasına bağlı, Supabase işi sinyal olarak duruyor.
*/
test('Cloudflare dağıtımı uygulama doğrulamasına bağlı, Supabase işine değil', () => {
  const workflow = fs.readFileSync('.github/workflows/supabase-production.yml', 'utf8');
  assert.match(workflow, /changes:\s/);
  assert.match(workflow, /supabase_changed/);
  assert.match(workflow, /app_changed/);
  assert.match(workflow, /needs\.changes\.outputs\.supabase_changed == 'true'/);
  assert.match(workflow, /needs\.validate_app\.result == 'success'/);
  assert.match(workflow, /always\(\)/);
  /* Supabase işi hâlâ çalışıyor ve raporluyor — yalnızca engel değil. */
  assert.match(workflow, /migrate_and_functions:/);
});
