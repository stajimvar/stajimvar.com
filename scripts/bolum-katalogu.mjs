/**
 * BÖLÜM KATALOĞU SEED ÜRETECİ
 *
 * NEDEN ÜRETEÇ, ELLE YAZILMIŞ SEED DEĞİL
 * --------------------------------------
 * Kontrollü bölüm listesi zaten depoda var: `src/data/bolumler.ts`.
 * O liste rehber sayfalarını besliyor ve `slug` değerleri
 * `/bolumler/<slug>` adreslerinde kalıcı kimlik olarak kullanılıyor.
 *
 * Sosyal katmanın bölüm kataloğu AYNI kimlikleri taşımak zorunda: profil
 * "Makine Mühendisliği" diyorsa o adın arkasındaki rehber sayfası da
 * açılabilmeli. İki listeyi elle senkron tutmak, bir gün birinde bölüm
 * eklenip ötekinde unutulması demekti; ayrışma da sessiz olurdu.
 *
 * Bu yüzden göçteki seed bloğu buradan üretiliyor ve
 * `tests/bolum-katalogu-tutarliligi.test.mjs` üretilenle göçtekinin aynı
 * olduğunu ölçüyor. Yeni bölüm eklenince test düşüyor ve göçün yeniden
 * üretilmesi gerektiğini söylüyor.
 *
 * NEDEN REGEX, TS DERLEYİCİSİ DEĞİL
 * ---------------------------------
 * `bolumler.ts` 4000 satırlık düz veri; her kaydın ilk üç alanı sabit
 * sırada (`slug`, `ad`, `grup`). Bu üç alanı okumak için TypeScript'i
 * derlemek ya da bir ayrıştırıcı bağımlılığı eklemek, kazanılandan çok
 * daha fazlasına mal olurdu. Desen dosyanın gerçek biçimine bağlı ve
 * bozulursa test 42 sayısında düşüyor — sessiz kalmıyor.
 *
 * KULLANIM
 *   node scripts/bolum-katalogu.mjs        → SQL bloğunu ekrana basar
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Kayıtların ilk üç alanı; `bolumler.ts` içinde hepsi dört boşluk girintili. */
const KAYIT = /^ {4}slug: '([^']+)',\n {4}ad: '([^']+)',\n {4}grup: '([^']+)',/gm;

/**
 * `src/data/bolumler.ts` içindeki bölümler.
 *
 * `sira` dosyadaki yazım sırasından geliyor: rehber listesi de bu sırayı
 * kullanıyor, katalogda başka bir sıra üretmek iki yüzeyde iki farklı
 * sıralama demek olurdu.
 */
export function bolumKatalogu() {
  const kaynak = readFileSync(path.join(KOK, 'src/data/bolumler.ts'), 'utf8');
  const bolumler = [];
  for (const eslesme of kaynak.matchAll(KAYIT)) {
    bolumler.push({
      slug: eslesme[1],
      ad: eslesme[2],
      grup: eslesme[3],
      sira: bolumler.length + 1,
    });
  }
  return bolumler;
}

/** SQL tek tırnak kaçışı; ad alanında kesme işareti çıkarsa diye. */
const tirnak = (metin) => `'${String(metin).replaceAll("'", "''")}'`;

/**
 * Göçe yapıştırılan seed bloğu.
 *
 * `on conflict (slug) do nothing`: göç yeniden çalıştırılabilir olmalı ve
 * var olan bir satırın adını sessizce değiştirmemeli — ad düzeltmesi ayrı
 * ve bilinçli bir göçün işi.
 */
export function katalogSql() {
  const satirlar = bolumKatalogu()
    .map((b) => `  (${tirnak(b.slug)}, ${tirnak(b.ad)}, ${tirnak(b.grup)}, ${b.sira})`)
    .join(',\n');
  return `insert into public.departments (slug, ad, grup, sira) values\n${satirlar}\non conflict (slug) do nothing;`;
}

/* Doğrudan çalıştırıldığında bloğu bas. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(katalogSql() + '\n');
}
