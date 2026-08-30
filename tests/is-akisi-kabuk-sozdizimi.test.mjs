import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/*
  İş akışı adımlarındaki kabuk betiklerini SÖZDİZİMİ AÇISINDAN denetler.

  Bu betikler yalnızca CI'da çalışıyor; bir yazım hatası ancak tur
  başladıktan dakikalar sonra görünüyor. 30 Ağustos'ta bir düzenleme
  eski bloğun kapanış `fi`'sini geride bıraktı: adım, yaptığı bütün işi
  bitirdikten SONRA "syntax error near unexpected token fi" ile düştü ve
  bir tur harcandı.

  `bash -n` betiği çalıştırmadan yalnızca ayrıştırıyor.
*/

const ISLER = 'ci-run';

/** `run:` bloklarını YAML'dan çıkarır. Tam bir YAML ayrıştırıcısına gerek
 *  yok: bloklar `run: |` ile başlıyor ve girinti bitince kapanıyor. */
export function runBloklari(yaml) {
  const satirlar = yaml.split(/\r?\n/);
  const bloklar = [];
  for (let i = 0; i < satirlar.length; i++) {
    const bas = satirlar[i].match(/^(\s*)run:\s*\|\s*$/);
    if (!bas) continue;
    const girinti = bas[1].length;
    const govde = [];
    for (let j = i + 1; j < satirlar.length; j++) {
      const satir = satirlar[j];
      if (satir.trim() !== '' && (satir.length - satir.trimStart().length) <= girinti) break;
      govde.push(satir.slice(girinti + 2));
    }
    bloklar.push({ satir: i + 1, govde: govde.join('\n') });
  }
  return bloklar;
}

const gecici = mkdtempSync(join(tmpdir(), 'is-akisi-'));

for (const dosya of readdirSync('.github/workflows').filter((f) => f.endsWith('.yml'))) {
  test(`${dosya}: kabuk blokları ayrıştırılabiliyor`, () => {
    const bloklar = runBloklari(readFileSync(`.github/workflows/${dosya}`, 'utf8'));
    for (const { satir, govde } of bloklar) {
      /* GitHub ifadeleri kabuk için anlamsız; ayrıştırma öncesi sabit bir
         belirtece indiriliyor. */
      const temiz = govde.replace(/\$\{\{[^}]*\}\}/g, ISLER);
      const yol = join(gecici, `${dosya}-${satir}.sh`);
      writeFileSync(yol, temiz);
      try {
        execFileSync('bash', ['-n', yol], { stdio: 'pipe' });
      } catch (hata) {
        assert.fail(`${dosya}:${satir} kabuk sözdizimi hatası\n${hata.stderr?.toString() ?? hata.message}`);
      }
    }
    /* Bazı iş akışları yalnızca tek satırlık `run:` ya da `uses:`
       kullanıyor; blok bulunmaması bir hata değil. */
  });
}
