import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kartVerisi, kimlikSatiri } from '../src/lib/aday-kart.mjs';
import { basvuruKopyasi } from '../src/lib/basvuru-kopyasi.mjs';

/*
  ADAY AYRINTISI — BEYAZ EKRAN REGRESYONU

  P0 (31 Ağustos 2026): işveren panelinde Başvuranlar → İncele bütün
  uygulamayı beyaz ekrana düşürüyordu. Konsoldaki gerçek hata:

    React has detected a change in the order of Hooks called by
    AdayCekmecesi … 6. undefined → useState
    Error: Rendered more hooks than during the previous render.

  Sebep: CV düğmesinin iki `useState` çağrısı `if (!kart) return null;`
  satırının ALTINA yazılmıştı. Çekmece kapalıyken 5, açıkken 7 hook
  çalışıyordu; hata render sırasında atıldığı için React tüm ağacı
  söküyordu.

  Buradaki testler iki şeyi bağlıyor:
    1. Hook'lar erken çıkıştan önce çağrılıyor (yapısal kontrol).
    2. Bozuk/eksik aday verisi kartı ya da ayrıntıyı düşüremiyor.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

/* ---------------------------------------------- 1. hook sırası */

test('AdayCekmecesi: erken çıkıştan sonra hook çağrılmıyor', () => {
  const kaynak = oku('src/sirket/AdayCekmecesi.tsx');
  const cikis = kaynak.indexOf('if (!kart) return null;');
  assert.ok(cikis > -1, 'erken çıkış bulunamadı');

  /* Çıkıştan sonraki gövde — JSX içindeki hook olamaz, ama tanım olabilir. */
  const sonrasi = kaynak.slice(cikis);
  assert.doesNotMatch(
    sonrasi,
    /React\.(useState|useEffect|useRef|useMemo|useCallback|useReducer)\s*[(<]/,
    'erken çıkıştan sonra hook çağrılıyor — "Rendered more hooks" hatası geri gelir',
  );
});

test('AdayCekmecesi hata sınırıyla sarılı', () => {
  const izgara = oku('src/sirket/AdayIzgarasi.tsx');
  assert.match(izgara, /<AdayHataSiniri/, 'aday ayrıntısı hata sınırı olmadan çiziliyor');
});

/* ------------------------------------------ 2. bozuk veri dayanıklılığı */

const basvuru = (ek = {}) => ({
  id: 'a1',
  status: 'submitted',
  applied_at: '2026-08-31T08:00:00Z',
  match_score: 0,
  listing_id: 'i1',
  application_method: 'internal',
  contact_share_consent_at: '2026-08-31T08:00:00Z',
  cv_path: null,
  cv_snapshot_path: null,
  profile_snapshot: {
    ad: 'Aday',
    universite: 'Örnek Üniversitesi',
    bolum: 'Bilgisayar Mühendisliği',
    sinif: '2. Sınıf',
  },
  ...ek,
});

/** Kartın React'e verilebilir olduğunu doğrular: liste alanları yalnız dize. */
function cizilebilir(kart) {
  for (const alan of ['yetenekler', 'diller', 'rozetler']) {
    assert.ok(Array.isArray(kart[alan]), `${alan} dizi değil`);
    for (const oge of kart[alan]) {
      assert.equal(typeof oge, 'string', `${alan} içinde dize olmayan öğe: ${JSON.stringify(oge)}`);
    }
  }
  assert.ok(Array.isArray(kart.projeler));
  for (const p of kart.projeler) {
    assert.equal(typeof p, 'object');
    assert.equal(typeof p.baslik, 'string');
  }
  /* Kimlik satırı her durumda üretilebilmeli. */
  assert.equal(typeof kimlikSatiri(kart), 'string');
}

test('A) cv_snapshot_path dolu aday çizilebiliyor', () => {
  const kart = kartVerisi(basvuru({ cv_snapshot_path: 'u/basvurular/x.pdf' }));
  assert.equal(kart.cvYolu, 'u/basvurular/x.pdf');
  cizilebilir(kart);
});

test('B) CV olmayan aday çizilebiliyor, CV bölümü boş', () => {
  const kart = kartVerisi(basvuru());
  assert.equal(kart.cvYolu, null);
  cizilebilir(kart);
});

test('C) cv_path NULL + snapshot NULL: çökme yok', () => {
  const kart = kartVerisi(basvuru({ cv_path: null, cv_snapshot_path: null }));
  assert.equal(kart.cvYolu, null);
  cizilebilir(kart);
});

test('C2) eski cv_path snapshot yokken kullanılıyor', () => {
  const kart = kartVerisi(basvuru({ cv_path: 'u/eski.pdf' }));
  assert.equal(kart.cvYolu, 'u/eski.pdf');
});

test('C3) snapshot varsa eski cv_path kullanılmıyor', () => {
  /* Şirket, değerlendirdiği belgeyi görmeli; bugünkü CV'ye düşülmemeli. */
  const kart = kartVerisi(basvuru({ cv_path: 'u/eski.pdf', cv_snapshot_path: 'u/yeni.pdf' }));
  assert.equal(kart.cvYolu, 'u/yeni.pdf');
});

test('D) diller bozuk/eksik: çizilebiliyor', () => {
  for (const diller of [null, undefined, 'metin', [{ dil: 'İngilizce' }, null, 42], []]) {
    const kart = kartVerisi(basvuru({ profile_snapshot: { ...basvuru().profile_snapshot, diller } }));
    cizilebilir(kart);
  }
});

test('D2) üretimdeki "undefined (B1)" satırı gösterilmiyor', () => {
  const kart = kartVerisi(
    basvuru({
      profile_snapshot: {
        ...basvuru().profile_snapshot,
        diller: ['undefined (B1)', 'undefined (A2)', 'İngilizce (B2)'],
      },
    }),
  );
  assert.deepEqual(kart.diller, ['İngilizce (B2)']);
});

test('E) proje adresi/başlığı null: çizilebiliyor', () => {
  const kart = kartVerisi(
    basvuru({
      profile_snapshot: {
        ...basvuru().profile_snapshot,
        projeler: [{ baslik: null, aciklama: null, adres: null }, null, 'metin', { baslik: 'İyi proje' }],
      },
    }),
  );
  cizilebilir(kart);
  assert.equal(kart.projeler.length, 1);
});

test('F) rozetler boş ya da bozuk: çizilebiliyor', () => {
  for (const rozetler of [[], null, [{ ad: 'x' }, 3]]) {
    const kart = kartVerisi(basvuru({ profile_snapshot: { ...basvuru().profile_snapshot, rozetler } }));
    cizilebilir(kart);
    assert.deepEqual(kart.rozetler, []);
  }
});

test('G) github/linkedin/portfolyo null: çizilebiliyor', () => {
  const kart = kartVerisi(
    basvuru({
      profile_snapshot: {
        ...basvuru().profile_snapshot,
        github: null,
        linkedin: null,
        portfolyo: null,
        fotoUrl: null,
      },
    }),
  );
  assert.equal(kart.github, null);
  assert.equal(kart.portfolyo, null);
  cizilebilir(kart);
});

test('yetenekler nesne/sayı taşısa bile karta dize giriyor', () => {
  /*
    Bu tam olarak "Objects are not valid as a React child" hatasını
    üreten biçimdi ve aday KARTINI daha tıklamadan düşürüyordu.
  */
  const kart = kartVerisi(
    basvuru({
      profile_snapshot: {
        ...basvuru().profile_snapshot,
        yetenekler: [{ ad: 'nesne' }, 42, null, 'Figma', '  '],
      },
    }),
  );
  assert.deepEqual(kart.yetenekler, ['Figma']);
  cizilebilir(kart);
});

test('profil kopyası hiç yoksa (rıza yok) kart çizilebiliyor', () => {
  const kart = kartVerisi(basvuru({ contact_share_consent_at: null, profile_snapshot: null }));
  assert.equal(kart.paylasildi, false);
  assert.equal(kart.ad, null);
  cizilebilir(kart);
});

test('boş satır bile karta çevrilebiliyor', () => {
  cizilebilir(kartVerisi({}));
  cizilebilir(kartVerisi(null));
});

/* ------------------------------------------- 3. kopya üretimi düzeldi */

test('dil adı `language` alanından okunuyor', () => {
  const kopya = basvuruKopyasi({
    fullName: 'Aday',
    university: 'Örnek',
    languages: [
      { language: 'İngilizce', level: 'B2' },
      { language: 'Almanca', level: null },
    ],
  });
  assert.deepEqual(kopya.diller, ['İngilizce (B2)', 'Almanca']);
});

test('dil adı yoksa kayıt atlanıyor — "undefined (B1)" üretilmiyor', () => {
  const kopya = basvuruKopyasi({
    fullName: 'Aday',
    university: 'Örnek',
    languages: [{ level: 'B1' }, { language: '', level: 'A2' }, null, { language: 'Fransızca' }],
  });
  assert.deepEqual(kopya.diller, ['Fransızca']);
});

test('kopyada kullanıcıya dönük hiçbir dizede undefined/null/[object Object] yok', () => {
  const kopya = basvuruKopyasi({
    fullName: 'Aday',
    university: 'Örnek',
    languages: [{ level: 'B1' }],
    skills: [{ name: undefined }, { name: 'React' }],
    projects: [{ title: 'Proje', description: undefined, liveUrl: undefined }],
    earnedBadges: [],
  });
  const metin = JSON.stringify(kopya);
  assert.doesNotMatch(metin, /"[^"]*undefined[^"]*"/, 'kopyada "undefined" içeren dize var');
  assert.doesNotMatch(metin, /\[object Object\]/);
});
