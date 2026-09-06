/**
 * REHBER GÜNCELLEME TARİHLERİNİ GİT GEÇMİŞİNDEN TÜRETİR
 *
 * NEDEN VAR
 * ---------
 * `rehber-govde.tsx` kendi tarihi olmayan her rehbere sabit bir tarih
 * yazıyordu: `guncelleme: t.guncelleme ?? '2026-08-25'`. Ölçüldü —
 * yayındaki 71 rehberin 57'si bu sabiti taşıyordu ve tarih üç yerde
 * birden görünüyordu: kartta, rehber sayfasında ve JSON-LD'nin
 * `dateModified` alanında. Yani Google'a hiç yapılmamış bir güncelleme
 * bildiriliyordu.
 *
 * Somut çelişki: `staj-basvurusu-gerekli-belgeler` 6 Eylül'de
 * değiştirildi, sayfası hâlâ 25 Ağustos diyordu. Tersi de doğruydu —
 * hiç dokunulmamış onlarca sayfa aynı tarihi gösteriyordu.
 *
 * NASIL ÇALIŞIYOR
 * ---------------
 * Dosyanın tamamının son değişiklik tarihi YETMİYOR: bir dosyada sekiz
 * rehber var, birine dokunmak ötekilerin de tarihini ilerletirdi. Bu
 * yüzden her commit'te dosyanın o günkü hâli okunuyor, rehberin KENDİ
 * bloğu çıkarılıyor ve bloğun içeriği değiştiği en son commit
 * aranıyor.
 *
 * Yalnızca ANLAMLI değişiklik sayılıyor: boşluk farkı ve `guncelleme:`
 * satırının kendisi karşılaştırmadan düşürülüyor. Aksi hâlde bu betiğin
 * yazdığı tarih, bir sonraki koşuda kendi kendini yeni bir değişiklik
 * sanardı.
 *
 * Çıktı doğrudan rehber kaynaklarına yazılıyor (`--yaz`): tarih artık
 * veri, türetilen bir şey değil. Böylece derleme git geçmişine muhtaç
 * kalmıyor ve elle düzeltilebiliyor.
 *
 * Kullanım:
 *   node scripts/rehber-tarihleri.mjs          (yalnız rapor)
 *   node scripts/rehber-tarihleri.mjs --yaz    (kaynaklara yazar)
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const KOK = path.resolve(import.meta.dirname, '..');

function git(...args) {
  return execFileSync('git', args, { cwd: KOK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

export function rehberDosyalari() {
  const klasor = path.join(KOK, 'src/data/rehber-yazilari');
  const yollar = fs
    .readdirSync(klasor)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => `src/data/rehber-yazilari/${f}`);
  yollar.push('src/data/rehberler.tsx');
  return yollar;
}

/** Bir dosya metnindeki rehber bloklarını slug'a göre ayırır. */
export function bloklar(metin) {
  const s = String(metin).replace(/\r\n/g, '\n');
  const yerler = [...s.matchAll(/slug: '([^']+)'/g)];
  const cikti = new Map();
  yerler.forEach((m, i) => {
    const son = i + 1 < yerler.length ? yerler[i + 1].index : s.length;
    cikti.set(m[1], s.slice(m.index, son));
  });
  return cikti;
}

/**
 * Karşılaştırma için bloğu sadeleştirir.
 *
 * `guncelleme:` satırı ATILIYOR: bu betik onu yazdığı için, aksi hâlde
 * kendi yazdığı satırı bir sonraki koşuda "içerik değişti" sayardı ve
 * tarih her koşuda ilerlerdi.
 */
export function karsilastirilacak(blok) {
  return String(blok)
    .replace(/^\s*guncelleme:.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Bir dosyadaki her rehberin son anlamlı değişiklik tarihi. */
function dosyaTarihleri(yol) {
  /* En yeniden en eskiye; her commit'in hem karması hem tarihi. */
  const satirlar = git('log', '--follow', '--format=%H %ad', '--date=short', '--', yol)
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((s) => {
      const [karma, tarih] = s.split(' ');
      return { karma, tarih };
    });

  const anlik = satirlar.map(({ karma, tarih }) => {
    let metin = '';
    try {
      metin = git('show', `${karma}:${yol}`);
    } catch {
      /* Dosya o commit'te başka addaydı ya da yoktu: boş sayılıyor. */
    }
    return { tarih, bloklar: bloklar(metin) };
  });

  const sonuc = new Map();
  const bugunku = anlik[0]?.bloklar ?? new Map();
  for (const [slug, blok] of bugunku) {
    let tarih = anlik[0].tarih;
    const simdi = karsilastirilacak(blok);
    /*
      En yeniden geriye gidiliyor. İçerik hangi commit'te farklılaşıyorsa,
      ondan bir SONRAKİ (yani daha yeni) commit o rehberin son değişiklik
      anıdır.
    */
    for (let i = 1; i < anlik.length; i += 1) {
      const onceki = anlik[i].bloklar.get(slug);
      if (onceki === undefined) break;
      if (karsilastirilacak(onceki) !== simdi) break;
      tarih = anlik[i].tarih;
    }
    sonuc.set(slug, tarih);
  }
  return sonuc;
}

export function tumTarihler() {
  const hepsi = new Map();
  for (const yol of rehberDosyalari()) {
    for (const [slug, tarih] of dosyaTarihleri(yol)) hepsi.set(slug, { tarih, yol });
  }
  return hepsi;
}

/**
 * Tarihi kaynağa yazar.
 *
 * `guncelleme:` alanı zaten varsa değeri değiştiriliyor; yoksa `slug:`
 * satırının hemen ardına ekleniyor — tip tanımında isteğe bağlı bir alan
 * olduğu için sırası önemli değil, okunurluk için başa konuyor.
 */
function yaz(hepsi) {
  let degisen = 0;
  for (const yol of rehberDosyalari()) {
    const tam = path.join(KOK, yol);
    let metin = fs.readFileSync(tam, 'utf8');
    const satirSonu = metin.includes('\r\n') ? '\r\n' : '\n';
    let dosyaDegisti = false;

    for (const [slug, { tarih, yol: kaynak }] of hepsi) {
      if (kaynak !== yol) continue;
      const kalip = new RegExp(`(slug: '${slug}',)`);
      if (!kalip.test(metin)) continue;

      /*
        ARAMA REHBERİN KENDİ BLOĞUNDAN ÇIKMAMALI

        İlk sürüm `[\s\S]*?` kullanıyordu. Tarihi olmayan bir rehberde
        bu, bir SONRAKİ rehberin `guncelleme:` satırına kadar uzayıp onu
        yeniden yazma riski taşıyor. Negatif ileri bakış eşleşmeyi bir
        sonraki `slug:` satırından önce durduruyor.
      */
      const blokKalibi = new RegExp(
        `(slug: '${slug}',(?:(?!slug: ')[\\s\\S])*?)(\\n\\s*guncelleme: '[^']*',)`
      );
      if (blokKalibi.test(metin)) {
        const yeni = metin.replace(blokKalibi, (_t, bas, alan) => {
          const bosluk = alan.match(/\n(\s*)guncelleme/)[1];
          return `${bas}\n${bosluk}guncelleme: '${tarih}',`;
        });
        if (yeni !== metin) {
          metin = yeni;
          dosyaDegisti = true;
          degisen += 1;
        }
      } else {
        const yeni = metin.replace(kalip, (_t, satir) => {
          const girinti = metin.slice(0, metin.indexOf(satir)).split('\n').pop();
          return `${satir}\n${girinti}guncelleme: '${tarih}',`;
        });
        if (yeni !== metin) {
          metin = yeni;
          dosyaDegisti = true;
          degisen += 1;
        }
      }
    }

    if (dosyaDegisti) {
      fs.writeFileSync(tam, metin.split('\n').join(satirSonu === '\r\n' ? '\n' : '\n'), 'utf8');
    }
  }
  return degisen;
}

function main() {
  const hepsi = tumTarihler();
  const dagilim = {};
  for (const [, { tarih }] of hepsi) dagilim[tarih] = (dagilim[tarih] || 0) + 1;

  console.log(`${hepsi.size} rehberin son değişiklik tarihi git geçmişinden türetildi.`);
  console.log('\nTARİH DAĞILIMI');
  for (const [tarih, adet] of Object.entries(dagilim).sort()) {
    console.log(`  ${tarih}  ${String(adet).padStart(3)} rehber`);
  }

  if (process.argv.includes('--yaz')) {
    const adet = yaz(hepsi);
    console.log(`\n${adet} rehberin tarihi kaynağa yazıldı.`);
  } else {
    console.log('\n(yalnız rapor — yazmak için --yaz)');
  }
}

/* `node -e` ile import edilince argv[1] yok; doğrudan çalıştırmada var. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
