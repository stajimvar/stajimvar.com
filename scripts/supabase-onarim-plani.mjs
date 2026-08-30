/**
 * Defter onarımında GERÇEKTEN yapılması gereken çağrıları hesaplar.
 *
 * NEDEN
 * -----
 * Onarım adımı iki listeyi baştan sona geziyor ve her sürüm için bir
 * `supabase migration repair` çağırıyordu: 93 ağ çağrısı, yaklaşık on beş
 * dakika, şema değiştiren HER commit'te. Oysa uzlaştırma bir kez
 * yapıldıktan sonra bu çağrıların neredeyse tamamı hiçbir şeyi
 * değiştirmiyor.
 *
 * Uzun ve gereksiz bir adım yalnızca yavaş değil, kırılgan: doksan üç
 * çağrının biri geçici bir ağ hatasıyla düşerse tur çöper. Yapılacak işi
 * daraltmak, hem süreyi hem hata yüzeyini küçültüyor.
 *
 * NASIL
 * -----
 * `supabase migration list` çıktısı zaten ayrıştırılıyor (kapı onu
 * kullanıyor). Aynı ayrıştırıcıyla:
 *
 *   - uygulanacak: elle-uygulananlar.txt'de olup uzak geçmişte OLMAYAN
 *   - düşülecek  : gecmisten-dusulenler.txt'de olup uzak geçmişte OLAN
 *
 * Defter zaten doğruysa iki liste de boş çıkıyor ve adım anında bitiyor.
 *
 * Önceki sürümde "uzakta var mı" kontrolü `grep` ile yapılıyordu ve
 * migration list çıktısı ters tırnaklı bir tablo olduğu için o desen
 * kırılgandı; yanlış eşleşirse onarım SESSİZCE atlanıyordu. Burada aynı
 * hataya düşmemek için liste, kapının kullandığı ayrıştırıcıyla okunuyor.
 */
import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { parseMigrationList } from './supabase-history-gate.mjs';

/** Bir onarım listesi dosyasını okur: boş satır ve # yorumları atılır. */
export function listeOku(icerik) {
  return icerik
    .split(/\r?\n/)
    .map((satir) => satir.trim())
    .filter((satir) => satir && !satir.startsWith('#'))
    .map((satir) => satir.split(/\s+/)[0]);
}

/**
 * @param {{remoteAll: string[]}} rapor  migration list çıktısının ayrıştırılmışı
 * @param {string[]} uygulanacakListe    elle-uygulananlar.txt
 * @param {string[]} dusulecekListe      gecmisten-dusulenler.txt
 */
export function onarimPlani(rapor, uygulanacakListe, dusulecekListe) {
  const uzakta = new Set(rapor.remoteAll ?? []);
  return {
    applied: uygulanacakListe.filter((surum) => !uzakta.has(surum)),
    reverted: dusulecekListe.filter((surum) => uzakta.has(surum)),
  };
}

function main() {
  const [listeYolu, uygulananYolu, dusulenYolu] = process.argv.slice(2);
  if (!listeYolu) {
    console.error('Kullanım: node scripts/supabase-onarim-plani.mjs <migration-list> [uygulananlar] [dusulenler]');
    process.exitCode = 2;
    return;
  }

  const oku = (yol) => (yol && fs.existsSync(yol) ? listeOku(fs.readFileSync(yol, 'utf8')) : []);
  const rapor = parseMigrationList(fs.readFileSync(listeYolu, 'utf8'));
  const plan = onarimPlani(rapor, oku(uygulananYolu), oku(dusulenYolu));

  /* Kabuk `while read` ile okusun diye satır satır, önekli. */
  for (const surum of plan.applied) console.log(`applied ${surum}`);
  for (const surum of plan.reverted) console.log(`reverted ${surum}`);
  console.error(
    `onarım planı: ${plan.applied.length} uygulandı, ${plan.reverted.length} düşülecek ` +
    `(uzak geçmişte ${rapor.remoteAll?.length ?? 0} kayıt)`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
