import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function valueFromCell(cell) {
  const match = cell.match(/`([^`]*)`/);
  return match ? match[1].trim() : '';
}

export function parseMigrationList(output) {
  const remoteOnly = [];
  const localOnly = [];
  const divergent = [];
  /* Uzakta KAYITLI olan her sürüm — hem eşleşenler hem yalnız uzaktakiler.
     Bekleyen göçü gerçek eksikten ayırmak için "uzaktaki en yeni sürüm"
     gerekiyor ve o yalnızca remoteOnly'den okunamaz. */
  const remoteAll = [];

  for (const line of output.split(/\r?\n/)) {
    if (!line.includes('|') || !line.includes('`')) continue;

    const cells = line.split('|').map(valueFromCell);
    if (cells.length < 2) continue;

    const [local, remote] = cells;
    if (remote) remoteAll.push(remote);
    if (local && !remote) localOnly.push(local);
    if (remote && !local) remoteOnly.push(remote);
    if (local && remote && local !== remote) divergent.push({ local, remote });
  }

  return {
    remoteOnly: [...new Set(remoteOnly)].sort(),
    localOnly: [...new Set(localOnly)].sort(),
    remoteAll: [...new Set(remoteAll)].sort(),
    divergent,
  };
}

/**
 * Yerelde olup uzakta olmayan sürümleri ikiye ayırır.
 *
 * BEKLEYEN, AYRIŞMA DEĞİLDİR
 * --------------------------
 * Kapı önceden "yerelde var, uzakta yok" gördüğü her sürümü ayrışma
 * sayıyordu. Ama yeni yazılmış bir göç TAM OLARAK böyle görünür — henüz
 * push edilmemiştir. Yani kapı, uygulanmayı bekleyen her göçü engelliyor
 * ve `db push` adımına hiç sıra gelmiyordu: bir migration pipeline'ının
 * yapamayacağı tek şey buysa, kapı işini yapmıyor demektir.
 *
 * Ayrım sıraya bakıyor. Uzaktaki EN YENİ sürümden sonra gelen yerel
 * dosyalar sıradaki göçlerdir; db push onları uygulayacak. Uzaktaki en
 * yeni sürümden ÖNCE gelip de uzakta bulunmayan bir dosya ise gerçek bir
 * sorundur: atlanmış ya da geriye dönük eklenmiş demektir ve sessizce
 * push etmek sırayı bozar.
 *
 * Uzak geçmiş boşsa karşılaştıracak bir sıra yok; hepsi bekleyen sayılır.
 */
export function splitLocalOnly(report) {
  const enYeniUzak = [...(report.remoteAll ?? [])].sort().at(-1) ?? '';
  const bekleyen = [];
  const eksik = [];
  for (const surum of report.localOnly) {
    if (enYeniUzak === '' || surum > enYeniUzak) bekleyen.push(surum);
    else eksik.push(surum);
  }
  return { bekleyen, eksik };
}

/**
 * Kapının kararı. İki kip:
 *
 *   göç öncesi (varsayılan)  — bekleyen göç NORMAL: db push uygulayacak.
 *                              Yalnız ayrışma engel.
 *   yayın öncesi (bekleyenYok) — bekleyen göç de ENGEL.
 *
 * YAYIN ÖNCESİ KİP NEDEN VAR (12 Ekim 2026)
 * Site yayını göç işine bağlı ama göç işi yalnız `supabase/` değiştiğinde
 * ve yalnız push/elle tetiklemede koşuyor; öbür durumlarda "atlandı"
 * sayılıp yayın devam ediyordu. Bir göç düştükten sonra gelen sıradan bir
 * arayüz push'u ya da günlük zamanlanmış derleme, uygulanmamış şemayı
 * bekleyen kodu yayına çıkarabiliyordu. Yayın işi artık bu kipte, canlı
 * deftere bakıp HİÇ bekleyen göç kalmadığını görmeden çalışmıyor.
 */
export function kapiKarari(report, { bekleyenYok = false } = {}) {
  const { bekleyen, eksik } = splitLocalOnly(report);
  const nedenler = [];
  if (report.remoteOnly.length || eksik.length || report.divergent.length) nedenler.push('ayrisma');
  if (bekleyenYok && bekleyen.length) nedenler.push('bekleyen');
  return { engel: nedenler.length > 0, nedenler, bekleyen, eksik };
}

function main() {
  const inputPath = process.argv[2];
  const bekleyenYok = process.argv.includes('--bekleyen-yok');
  if (!inputPath) {
    console.error('Usage: node scripts/supabase-history-gate.mjs <migration-list-output> [--bekleyen-yok]');
    process.exitCode = 2;
    return;
  }

  const report = parseMigrationList(fs.readFileSync(inputPath, 'utf8'));
  const karar = kapiKarari(report, { bekleyenYok });
  console.log(JSON.stringify({ ...report, pending: karar.bekleyen, missing: karar.eksik }, null, 2));

  if (karar.bekleyen.length && !bekleyenYok) {
    console.log(`${karar.bekleyen.length} migration uygulanmayı bekliyor; db push devam edecek.`);
  }

  if (karar.nedenler.includes('ayrisma')) {
    console.error('::error::Supabase migration history divergence detected. db push is blocked; reconcile verified migration files before retrying.');
  }
  if (karar.nedenler.includes('bekleyen')) {
    console.error(`::error::Üretimde uygulanmamış göç var (${karar.bekleyen.join(', ')}). Site yayını durduruldu; önce göç işi başarıyla koşmalı.`);
  }
  if (karar.engel) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
