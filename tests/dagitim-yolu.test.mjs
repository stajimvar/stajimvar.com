import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/*
  TEK ÜRETİM YAYIN YOLU (12 Ekim 2026)

  `dagit.yml` elle tetiklenen ve güvenlik regresyonu ile veritabanı göç
  kapılarını ATLAYAN bir Cloudflare yayınıydı; Eylül'de 113 kez kullanıldı.
  Kaldırıldı. Bu test iş akışı dosyalarını YAML olarak ayrıştırıp gerçek
  adımlara bakıyor (yorum satırlarına değil):

    · `wrangler pages deploy` çalıştıran tek iş, supabase-production.yml'deki
      `cloudflare_production`;
    · o iş doğrulama, güvenlik regresyonu ve göç işlerine bağlı ve
      başarılarını şart koşuyor;
    · PR doğrulaması yayın yapmıyor, Cloudflare anahtarı taşımıyor;
    · zamanlanmış koşu göç uygulamıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const KLASOR = path.join(KOK, '.github', 'workflows');
/*
  KÜÇÜK İŞ AKIŞI AYRIŞTIRICISI

  Depoda YAML kütüphanesi yok; yalnız bu test için bağımlılık eklemek
  yerine GitHub Actions dosyalarının kullandığımız alt kümesi okunuyor:
  yorumlar atılıyor, `jobs:` altındaki işler (2 boşluk), işin `needs` ve
  `if`i (satır içi ya da `>-` bloğu), adımlar (`      - `) ve adımın
  `if`/`run`/`continue-on-error` alanları (satır içi ya da `|` bloğu).
  Yorum satırındaki bir `wrangler pages deploy` sayılmıyor.
*/
function yorumsuz(metin) {
  return metin.replace(/\r\n/g, '\n').split('\n').filter((s) => !/^\s*#/.test(s)).join('\n');
}

function blokDegeri(satirlar, i, girinti) {
  /* `anahtar: |` ya da `anahtar: >-` sonrasındaki daha derin girintili satırlar. */
  const parcalar = [];
  let j = i + 1;
  while (j < satirlar.length && (satirlar[j].trim() === '' || satirlar[j].search(/\S/) > girinti)) {
    parcalar.push(satirlar[j].trim());
    j++;
  }
  return { deger: parcalar.join('\n'), son: j };
}

function akisiAyristir(metin) {
  const satirlar = yorumsuz(metin).split('\n');
  const onBas = satirlar.findIndex((s) => /^on:\s*$/.test(s));
  const tetikler = [];
  if (onBas >= 0) for (let i = onBas + 1; i < satirlar.length && /^\s/.test(satirlar[i] || ' '); i++) {
    const m = satirlar[i].match(/^  ([\w-]+):/);
    if (m) tetikler.push(m[1]);
  }
  const jobsBas = satirlar.findIndex((s) => /^jobs:\s*$/.test(s));
  const isler = {};
  let is = null;
  let adim = null;
  for (let i = jobsBas + 1; i < satirlar.length; i++) {
    const s = satirlar[i];
    let m;
    if ((m = s.match(/^  ([\w-]+):\s*$/))) {
      is = isler[m[1]] = { needs: [], if: '', steps: [] };
      adim = null;
      continue;
    }
    if (!is) continue;
    if ((m = s.match(/^    needs:\s*(.*)$/))) {
      is.needs = m[1].replace(/[\[\]]/g, '').split(',').map((x) => x.trim()).filter(Boolean);
      continue;
    }
    if ((m = s.match(/^    if:\s*(.*)$/))) {
      if (/^[>|]-?$/.test(m[1].trim())) {
        const b = blokDegeri(satirlar, i, 4);
        is.if = b.deger;
        i = b.son - 1;
      } else is.if = m[1];
      continue;
    }
    if ((m = s.match(/^      - (.*)$/))) {
      adim = { if: '', run: '', continueOnError: false };
      is.steps.push(adim);
      const ic = m[1];
      if (/^run:/.test(ic)) adim.run = ic.replace(/^run:\s*/, '');
      continue;
    }
    if (!adim) continue;
    if ((m = s.match(/^        if:\s*(.*)$/))) adim.if = m[1];
    else if ((m = s.match(/^        continue-on-error:\s*(.*)$/))) adim.continueOnError = m[1].trim() === 'true';
    else if ((m = s.match(/^        run:\s*(.*)$/))) {
      if (/^[>|]-?$/.test(m[1].trim())) {
        const b = blokDegeri(satirlar, i, 8);
        adim.run = b.deger;
        i = b.son - 1;
      } else adim.run = m[1];
    }
  }
  return { tetikler, jobs: isler, ham: yorumsuz(metin) };
}

const akislar = readdirSync(KLASOR)
  .filter((f) => /\.ya?ml$/.test(f))
  .map((f) => ({ ad: f, veri: akisiAyristir(readFileSync(path.join(KLASOR, f), 'utf8')) }));

/** Bir işin gerçekten koşabilecek `run` adımları (`if: false` olanlar hariç). */
function calisanKomutlar(is) {
  return (is.steps || [])
    .filter((a) => String(a.if ?? '').replace(/\s/g, '') !== '${{false}}' && String(a.if) !== 'false')
    .map((a) => String(a.run || ''));
}

test('Cloudflare Pages yayını yalnız supabase-production.yml / cloudflare_production işinde', () => {
  const yayinlayanlar = [];
  for (const { ad, veri } of akislar) {
    for (const [isAdi, is] of Object.entries(veri.jobs || {})) {
      if (calisanKomutlar(is).some((k) => /wrangler\s+pages\s+deploy/.test(k))) yayinlayanlar.push(`${ad}:${isAdi}`);
    }
  }
  assert.deepEqual(yayinlayanlar, ['supabase-production.yml:cloudflare_production']);
  assert.ok(!akislar.some((a) => a.ad === 'dagit.yml'), 'kapıları atlayan dagit.yml geri gelmemeli');
});

test('üretim yayını doğrulama, güvenlik regresyonu ve göç kapılarına bağlı', () => {
  const uretim = akislar.find((a) => a.ad === 'supabase-production.yml').veri;
  const is = uretim.jobs.cloudflare_production;
  assert.deepEqual([...is.needs].sort(), ['changes', 'goc_durumu', 'migrate_and_functions', 'security_regression', 'validate_app'].sort());
  const kosul = String(is.if).replace(/\s+/g, ' ');
  assert.match(kosul, /needs\.validate_app\.result == 'success'/);
  assert.match(kosul, /needs\.security_regression\.result == 'success'/);
  assert.match(kosul, /needs\.migrate_and_functions\.result == 'success' \|\| needs\.migrate_and_functions\.result == 'skipped'/);
  /* Doğrulama işi tip, Functions tipi, test ve derleme (SEO kapısı dahil) koşuyor. */
  const dogrulama = calisanKomutlar(uretim.jobs.validate_app).join('\n');
  for (const komut of ['npm run lint', 'npm run lint:functions', 'npm test', 'npm run build']) {
    assert.ok(dogrulama.includes(komut), `validate_app: ${komut} yok`);
  }
  /* Zamanlanmış koşu göç uygulamıyor. */
  assert.ok(uretim.tetikler.includes('schedule'), 'günlük yeniden derleme tanımlı');
  assert.doesNotMatch(String(uretim.jobs.migrate_and_functions.if), /schedule/);
  /* Üretim yayın işinde servis anahtarı ve sessiz düşme yok. */
  const isMetni = uretim.ham.slice(uretim.ham.indexOf('  cloudflare_production:'));
  assert.ok(!isMetni.includes('SUPABASE_SERVICE_ROLE_KEY'));
  assert.ok(!(is.steps || []).some((a) => a.continueOnError));
});

test('PR doğrulaması yayın yapmıyor ve aynı kapıları koşuyor', () => {
  const pr = akislar.find((a) => a.ad === 'pr-dogrulama.yml');
  assert.ok(pr, 'pr-dogrulama.yml yok');
  assert.ok(pr.veri.tetikler.includes('pull_request'), 'pull_request tetikleyicisi yok');
  const metin = pr.veri.ham;
  assert.ok(!metin.includes('CLOUDFLARE_API_TOKEN'));
  assert.ok(!metin.includes('SUPABASE_SERVICE_ROLE_KEY'));
  assert.ok(!metin.includes('SUPABASE_DB_PASSWORD'));
  const komutlar = Object.values(pr.veri.jobs).flatMap(calisanKomutlar).join('\n');
  for (const komut of ['npm run lint', 'npm run lint:functions', 'npm test', 'npm run build', 'rls-regresyon-testleri.sql']) {
    assert.ok(komutlar.includes(komut), `PR doğrulaması: ${komut} yok`);
  }
});

/*
  HİÇBİR YOL KAPILARI ATLAYAMIYOR (12 Ekim 2026, birleştirme öncesi denetim)

  Acil yayın dahil bütün yollar sayıldı:
    · elle tetikleme (workflow_dispatch) — aynı iş akışı, aynı kapılar;
      ama başka bir dalda da başlatılabiliyor: göç ve yayın işleri yalnız
      refs/heads/main'de koşuyor;
    · günlük zamanlanmış derleme ve supabase/ değişmeyen push — göç işi
      atlanıyor; yayın `goc_durumu` ile canlı defterde bekleyen göç
      olmadığını görmeden çıkmıyor;
    · yerel `npm run deploy` — kaldırıldı;
    · başka iş akışlarında Cloudflare anahtarı — yok;
    · pull_request_target — hiçbir iş akışında yok (sır taşıyan PR koşusu).
*/
test('göç ve yayın işleri yalnız main dalında koşuyor', () => {
  const uretim = akislar.find((a) => a.ad === 'supabase-production.yml').veri;
  for (const isAdi of ['migrate_and_functions', 'goc_durumu', 'cloudflare_production']) {
    const kosul = String(uretim.jobs[isAdi]?.if || '');
    assert.match(kosul, /github\.ref == 'refs\/heads\/main'/, `${isAdi}: main koşulu yok`);
  }
});

test('yayın, canlı defterde bekleyen göç olmadığını doğrulayan işe bağlı', () => {
  const uretim = akislar.find((a) => a.ad === 'supabase-production.yml').veri;
  const yayin = uretim.jobs.cloudflare_production;
  assert.ok(yayin.needs.includes('goc_durumu'), 'cloudflare_production goc_durumu beklemiyor');
  assert.match(String(yayin.if).replace(/\s+/g, ' '), /needs\.goc_durumu\.result == 'success'/);
  const goc = uretim.jobs.goc_durumu;
  assert.ok(goc, 'goc_durumu işi yok');
  assert.ok(goc.needs.includes('migrate_and_functions'), 'goc_durumu göç işinden sonra koşmalı');
  const komutlar = calisanKomutlar(goc).join('\n');
  assert.match(komutlar, /supabase migration list/);
  assert.match(komutlar, /supabase-history-gate\.mjs \S+ --bekleyen-yok/);
  /* Göç denetimi yayın anahtarı taşımıyor. */
  const isMetni = uretim.ham.slice(uretim.ham.indexOf('  goc_durumu:'), uretim.ham.indexOf('  cloudflare_production:'));
  assert.ok(!isMetni.includes('CLOUDFLARE_API_TOKEN'));
});

test('Cloudflare anahtarı yalnız yayın işinde; pull_request_target yok', () => {
  const tasiyanlar = [];
  for (const { ad, veri } of akislar) {
    if (/pull_request_target/.test(veri.ham)) assert.fail(`${ad}: pull_request_target kullanıyor`);
    if (!veri.ham.includes('CLOUDFLARE_API_TOKEN')) continue;
    if (ad !== 'supabase-production.yml') tasiyanlar.push(ad);
    else {
      const yayinOncesi = veri.ham.slice(0, veri.ham.indexOf('  cloudflare_production:'));
      if (yayinOncesi.includes('CLOUDFLARE_API_TOKEN')) tasiyanlar.push(`${ad} (yayın işi dışında)`);
    }
  }
  assert.deepEqual(tasiyanlar, []);
});

test('yerel yayın betiği yok: package.json hiçbir betikte wrangler pages deploy çalıştırmıyor', () => {
  const paket = JSON.parse(readFileSync(path.join(KOK, 'package.json'), 'utf8'));
  const yayinlayan = Object.entries(paket.scripts || {}).filter(([, k]) => /wrangler\s+pages\s+deploy/.test(k));
  assert.deepEqual(yayinlayan, []);
});

/*
  ÜRETİM ANAHTARLARI YALNIZ `production` ORTAMINDA (12 Ekim 2026)

  Cloudflare yayın anahtarı, Supabase yönetim anahtarı, veritabanı parolası
  ve servis anahtarı GitHub'da `production` ortamının sırlarına taşınıyor;
  ortam yalnız `main` dalına açık. Bir iş bu sırları ancak
  `environment: production` bildirirse alabiliyor. Bu test:
    · korunan bir sırrı okuyan her işin bu ortamı bildirdiğini,
    · hiçbir iş akışının bu sırları üst düzey `env:` ile bütün işlere
      dağıtmadığını,
    · PR doğrulamasının bu ortamı kullanmadığını
  sınıyor. Yeni bir iş korunan sırrı ortamsız okursa — ya da depo düzeyi
  kopyalar silindikten sonra boş değer alıp sessizce bozulacaksa — test düşüyor.
*/
const KORUNAN_SIRLAR = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
];

/** İş akışının işlerini ham metin dilimleri olarak döndürür (yorumsuz). */
function isDilimleri(ham) {
  const satirlar = ham.split('\n');
  const jobsBas = satirlar.findIndex((s) => /^jobs:\s*$/.test(s));
  const baslar = [];
  for (let i = jobsBas + 1; i < satirlar.length; i++) if (/^  [\w-]+:\s*$/.test(satirlar[i])) baslar.push(i);
  return {
    ust: satirlar.slice(0, jobsBas).join('\n'),
    isler: baslar.map((b, n) => ({
      ad: satirlar[b].trim().replace(/:$/, ''),
      metin: satirlar.slice(b, baslar[n + 1] ?? satirlar.length).join('\n'),
    })),
  };
}

test('korunan üretim sırlarını okuyan her iş `environment: production` bildiriyor', () => {
  const ihlal = [];
  const ortamli = [];
  for (const { ad, veri } of akislar) {
    const { ust, isler } = isDilimleri(veri.ham);
    for (const sir of KORUNAN_SIRLAR) {
      if (ust.includes(`secrets.${sir}`)) ihlal.push(`${ad}: üst düzey env ${sir} taşıyor`);
    }
    for (const is of isler) {
      const okunan = KORUNAN_SIRLAR.filter((sir) => is.metin.includes(`secrets.${sir}`));
      const ortam = /^    environment:\s*production\s*$/m.test(is.metin);
      if (okunan.length && !ortam) ihlal.push(`${ad}:${is.ad} ortamsız okuyor: ${okunan.join(', ')}`);
      if (ortam) ortamli.push(`${ad}:${is.ad}`);
    }
  }
  assert.deepEqual(ihlal, []);
  /* Yayın ve göç işleri kesinlikle ortamda. */
  for (const is of ['migrate_and_functions', 'goc_durumu', 'cloudflare_production']) {
    assert.ok(ortamli.includes(`supabase-production.yml:${is}`), `${is} production ortamında değil`);
  }
});

test('ortamsız işler korunan sırra erişemiyor: doğrulama, güvenlik ve PR işleri ortam bildirmiyor', () => {
  const uretim = isDilimleri(akislar.find((a) => a.ad === 'supabase-production.yml').veri.ham);
  for (const is of uretim.isler.filter((x) => ['changes', 'validate_app', 'security_regression'].includes(x.ad))) {
    assert.doesNotMatch(is.metin, /^    environment:/m, `${is.ad} ortam bildirmemeli`);
    for (const sir of KORUNAN_SIRLAR) assert.ok(!is.metin.includes(sir), `${is.ad} ${sir} görmemeli`);
  }
  const pr = akislar.find((a) => a.ad === 'pr-dogrulama.yml').veri.ham;
  assert.doesNotMatch(pr, /environment:/);
  for (const sir of KORUNAN_SIRLAR) assert.ok(!pr.includes(`secrets.${sir}`), `PR doğrulaması ${sir} okumamalı`);
});
