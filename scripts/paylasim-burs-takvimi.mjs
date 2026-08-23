/**
 * "Son başvuru yaklaşanlar" gönderi setini VERİTABANINDAN üretir.
 *
 * NEDEN
 * -----
 * Düzenli paylaşım, elle tasarım yapılabilecek bir iş değil. Bu betik tek
 * komutla o haftanın gönderisini çıkarıyor: son başvuru tarihi yaklaşan
 * burslar sitedeki kayıtlardan okunuyor, kartlara diziliyor, gönderi metni
 * de aynı verilerden yazılıyor.
 *
 * TARİHE BAĞLI İÇERİK — VE BU BİLİNÇLİ
 * ------------------------------------
 * Kartlarımız kural olarak zamansız: sayı yazan kart, sayı değişince
 * yanlış hale geliyor. Burs son başvuru tarihi ise ayrı bir tür — orada
 * tarih zaten konunun kendisi ve gönderi tarihiyle birlikte eskimesi
 * doğal. Bu yüzden bu set ayrı bir betikte duruyor.
 *
 * UYDURMA YOK
 * -----------
 * Yalnızca application_deadline'ı DOLU olan kayıtlar giriyor. Tarihi
 * doğrulanmamış kayıtlar sitede "Takvim bekleniyor" görünüyor; onları
 * gönderiye almak, olmayan bir tarihi varmış gibi göstermek olurdu.
 *
 * Kullanım:
 *   node scripts/paylasim-burs-takvimi.mjs [gün]
 *   (varsayılan 14 gün; "node scripts/paylasim-burs-takvimi.mjs 30")
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  GRI,
  KENAR,
  MAVI,
  altKutu,
  ayrac,
  baslik,
  kapanisKarti,
  sarmal,
  satir,
  setiYaz,
  tarihliSatir,
  ustBant,
  KOK,
} from './paylasim-sablonu.mjs';

const GUN = Number(process.argv[2] ?? 14);
const SERI = 'Son başvurular';
const SATIR_SINIRI = 4; // kart başına; beşinci satır alt kutuyu kartın dışına itiyor

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** .env okuyucu: onrender.mjs ile aynı yol, betikler tek başına çalışsın diye. */
function envOku(anahtar) {
  if (process.env[anahtar]) return process.env[anahtar];
  for (const dosya of ['.env', path.join('automation', '.env')]) {
    const yol = path.join(KOK, dosya);
    if (!fs.existsSync(yol)) continue;
    for (const s of fs.readFileSync(yol, 'utf8').split(/\r?\n/)) {
      const e = s.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (e && e[1] === anahtar) return e[2].replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

async function firsatlariGetir() {
  const adres = envOku('SUPABASE_URL') || envOku('VITE_SUPABASE_URL');
  const anahtar = envOku('SUPABASE_SERVICE_ROLE_KEY') || envOku('VITE_SUPABASE_ANON_KEY');
  if (!adres || !anahtar) {
    console.error('Supabase bilgisi yok (.env içinde SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
    process.exit(1);
  }
  const secim = 'slug,title,organization_name,opportunity_type,application_deadline';
  const istek = `${adres}/rest/v1/opportunities?status=eq.published&application_deadline=not.is.null&select=${encodeURIComponent(secim)}&order=application_deadline.asc`;
  const yanit = await fetch(istek, { headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}` } });
  if (!yanit.ok) {
    console.error(`Fırsatlar alınamadı: HTTP ${yanit.status}`);
    process.exit(1);
  }
  return yanit.json();
}

const gunFarki = (tarih) => Math.ceil((new Date(tarih) - new Date()) / 86400000);
const tarihYaz = (tarih) => {
  const t = new Date(tarih);
  return `${t.getUTCDate()} ${AYLAR[t.getUTCMonth()]}`;
};

/** Uzun kurum adı kartta taşıyor; anlamı bozmadan kısaltılıyor. */
const kisalt = (metin, sinir) => (metin.length <= sinir ? metin : `${metin.slice(0, sinir - 1).trimEnd()}…`);

const tumu = await firsatlariGetir();
const yaklasan = tumu
  .map((f) => ({ ...f, kalan: gunFarki(f.application_deadline) }))
  .filter((f) => f.kalan >= 0 && f.kalan <= GUN);

if (yaklasan.length === 0) {
  console.log(`Önümüzdeki ${GUN} günde son başvurusu dolan kayıt yok — gönderi üretilmedi.`);
  process.exit(0);
}

/*
  Satırlar sayfalara EŞİT dağıtılıyor, sınıra kadar doldurulup taşan
  bırakılmıyor. Altı kayıt "4+2" olarak bölününce son kartta iki satır
  kalıyor ve kart boş görünüyordu; "3+3" hem dengeli hem dolu duruyor.
*/
const sayfaAdedi = Math.ceil(yaklasan.length / SATIR_SINIRI);
const sayfaBasina = Math.ceil(yaklasan.length / sayfaAdedi);
const sayfalar = [];
for (let i = 0; i < yaklasan.length; i += sayfaBasina) sayfalar.push(yaklasan.slice(i, i + sayfaBasina));

const toplamKart = sayfalar.length + 2; // kapak + listeler + çağrı
const sayfaNo = (i) => `${String(i).padStart(2, '0')}/${String(toplamKart).padStart(2, '0')}`;

const enYakin = yaklasan[0];

const kapak = () => sarmal(`
  ${ustBant(SERI, sayfaNo(1))}

  ${baslik(330, ['Son başvurusu', 'yaklaşan', 'burslar.'], { boyut: 96, vurguSatiri: 2 })}

  ${ayrac(700)}

  ${satir(KENAR, 782, `Önümüzdeki ${GUN} günde başvurusu kapanan`, { boyut: 34, renk: GRI })}
  ${satir(KENAR, 828, `${yaklasan.length} kayıt — hepsi resmî kaynağıyla.`, { boyut: 34, renk: GRI })}

  <rect x="${KENAR}" y="900" width="952" height="260" rx="32" fill="${MAVI}"/>
  ${satir(KENAR + 44, 972, 'En yakın son başvuru', { boyut: 30, renk: '#DBEAFE', kalin: 600 })}
  ${satir(KENAR + 44, 1044, kisalt(enYakin.organization_name, 26), { boyut: 46, renk: '#FFFFFF', kalin: 800 })}
  ${satir(KENAR + 44, 1104, `${tarihYaz(enYakin.application_deadline)} · ${enYakin.kalan === 0 ? 'bugün' : `${enYakin.kalan} gün kaldı`}`, { boyut: 32, renk: '#DBEAFE' })}

  ${altKutu(1220, ['Tarihi doğrulanmayan kayda tarih yazmıyoruz.'])}
`);

const listeKarti = (kayitlar, sira) => sarmal(`
  ${ustBant(SERI, sayfaNo(sira))}

  ${baslik(320, ['Takvimde', 'sırada.'], { boyut: 88, vurguSatiri: 1 })}

  ${ayrac(486)}

  ${kayitlar
    .map((k, i) =>
      tarihliSatir(
        570 + i * 154,
        kisalt(k.organization_name, 30),
        kisalt(k.title, 42),
        tarihYaz(k.application_deadline),
        { yakin: k.kalan <= 3 },
      ),
    )
    .join('')}

  ${altKutu(1254, ['Ayrıntı ve başvuru bağlantısı stajimvar.com/firsatlar'], { zemin: '#F8FAFC' })}
`);

const cagri = () =>
  kapanisKarti({
    seri: SERI,
    sayfa: sayfaNo(toplamKart),
    satirlar: ['Kaçırmamak', 'için takip et.'],
    altSatirlar: ['Son başvurusu yaklaşan burslar her hafta', 'burada paylaşılıyor.'],
    kutu: ['Kaynağı doğrulanmayan kayıt listeye girmiyor.', 'Tarihi doğrulanmayan kayda tarih yazılmıyor.'],
  });

const kartlar = [kapak(), ...sayfalar.map((s, i) => listeKarti(s, i + 2)), cagri()];

const metin = [
  `Son başvurusu yaklaşan burslar — önümüzdeki ${GUN} gün:`,
  '',
  ...yaklasan.map((k) => `• ${k.organization_name} — ${tarihYaz(k.application_deadline)}`),
  '',
  'Hepsinin başvuru bağlantısı ve koşulları resmî kaynağında; listeye kaynağı doğrulanmayan kayıt girmiyor.',
  '',
  'Tümü profildeki bağlantıda.',
].join('\n');

const bugun = new Date().toISOString().slice(0, 10);

await setiYaz({
  kod: 'son-basvurular',
  ad: `Son başvurular (${bugun})`,
  surum: bugun.replaceAll('-', ''),
  metin,
  kartlar,
});

console.log(`\n${yaklasan.length} kayıt, ${kartlar.length} kart. Gönderi metni setler.json içinde.`);
