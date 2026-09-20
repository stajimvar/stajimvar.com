import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ARAYÜZ ARTIKLARI — ÜÇ KUSUR, ÜÇÜ DE TARAYICIDA ÖLÇÜLDÜ (20 Eylül 2026)

  A  /firsatlar başarıyla yüklendiği hâlde konsola 28+ kez "Maximum
     update depth exceeded" basıyordu. Yığın izi `lib/sayfa-aramasi`
     kayıt etkisini gösteriyordu: kararsız bir geri çağrı, etkiyi her
     çizimde yeniden koşturuyor, etki sağlayıcıda `setKapsam` çağırıyor,
     uygulamanın KÖKÜ yeniden çiziliyor ve döngü kapanıyor.

  B  /firsatlar?bolge=yurtdisi açılıyor, adres çubuğu /firsatlar'a
     düşüyor ve bölge süzgeci boşalıyordu. Sebep tek atışlık bir
     "ilk render mi" bayrağıydı: StrictMode mount etkisini iki kez
     koşturuyor, ikinci koşu sıfırlama dalına giriyordu.

  C  `Avatar` şirket logosunu da "… profil fotoğrafı" diye okutuyordu.

  Bileşenler oturum ve Supabase istiyor, jsdom yok; iddialar kaynak
  üzerinden. Tarayıcı ölçümü ayrıca yapıldı.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const kod = (m) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const FIRSATLAR = oku('src/components/OpportunitiesPage.tsx');
const ARAMA = oku('src/lib/sayfa-aramasi.tsx');
const ILANLAR = oku('src/components/MatchedInternshipsView.tsx');
const REHBER = oku('src/components/RehberMerkezi.tsx');
const AVATAR = oku('src/components/Avatar.tsx');
const FOTOGRAF = oku('src/components/sosyal/ProfilFotografi.tsx');
const TAKIP_LISTESI = oku('src/components/sosyal/TakipListesi.tsx');

/* ------------------------------------------------------------------ A */

test('sayfa aramasına kaydedilen geri çağrıların hepsi KARARLI', () => {
  /*
    Sözleşme `lib/sayfa-aramasi` başlığında yazılı ve GEVŞETİLMİYOR:
    etkinin bağımlılık listesinde `onDegisti` duruyor. Döngüyü kapatan
    sorun sözleşmede değil, kararsız işlev geçiren çağıranlardaydı.
  */
  assert.match(kod(ARAMA), /\}, \[Boolean\(kapsam\), yerTutucu, onDegisti, onSuzgec, acikSuzgec, suzgecAcik\]\);/);

  /* Fırsatlar: `set` artık useCallback ve bağımlılığı boş. */
  assert.match(
    kod(FIRSATLAR),
    /const set = React\.useCallback\(\s*\(patch: Partial<Suzgec>\) => setFilters\(\(mevcut\) => \(\{ \.\.\.mevcut, \.\.\.patch \}\)\),\s*\[\],\s*\);/
  );
  assert.doesNotMatch(
    kod(FIRSATLAR),
    /const set = \(patch/,
    'düz işlev geri gelmiş: her çizimde yeni `set` döngüyü geri açar'
  );

  /* Üç sayfa da tutamağı yalnız useCallback ile kaydediyor. */
  for (const [ad, kaynak] of [
    ['Fırsatlar', FIRSATLAR],
    ['İlanlar', ILANLAR],
    ['Rehber', REHBER],
  ]) {
    assert.match(
      kod(kaynak),
      /const aramaDegisti = React\.useCallback\(/,
      `${ad}: arama geri çağrısı useCallback değil`
    );
    assert.match(
      kod(kaynak),
      /(suzgecAc|suzgecAcKapa) = React\.useCallback\(/,
      `${ad}: süzgeç geri çağrısı useCallback değil`
    );
  }
});

test('StrictMode kaldırılarak susturulmuş değil', () => {
  /*
    Önceki bir denemede uyarı StrictMode sökülerek susturulmuştu ve geri
    alındı: çift mount, idempotent olmayan etkiyi ORTAYA ÇIKARAN şey,
    sebebi değil.
  */
  assert.match(kod(oku('src/main.tsx')), /<React\.StrictMode>|<StrictMode>/);
});

/* ------------------------------------------------------------------ B */

test('rota sıfırlaması "yol değişti mi" diye soruyor; adres süzgeci korunuyor', () => {
  const g = kod(FIRSATLAR);
  assert.doesNotMatch(g, /ilkRender/, 'tek atışlık bayrak StrictMode çift mountuna dayanmıyor');
  assert.match(g, /const oncekiYol = React\.useRef\(path\);/);
  assert.match(g, /if \(oncekiYol\.current === path\) return;\s*\n\s*oncekiYol\.current = path;/);

  /* Sıfırlama hâlâ rota geçişinde çalışıyor: /firsatlar → /kyk. */
  assert.match(
    g,
    /setFilters\(kisiselSuzgecsiz\(\{ \.\.\.BOS_FIRSAT_SUZGECI, \.\.\.\(ROTA_BASLANGICI\[path\] \?\? \{\}\) \}\)\);/
  );

  /* Başlatıcı adresi okumaya devam ediyor — paylaşılan bağlantının tek kaynağı. */
  assert.match(g, /\.\.\.readOpportunityFilters\(window\.location\.search\),/);
});

test('adres süzgeci okuyucusu bölgeyi gerçekten çözüyor', async () => {
  const { readOpportunityFilters } = await import('../src/lib/opportunity-domain.mjs');
  assert.equal(readOpportunityFilters('?bolge=yurtdisi').bolge, 'yurtdisi');
  assert.equal(readOpportunityFilters('?kategori=burslar').kategori, 'burslar');
});

/* ------------------------------------------------------------------ C */

test('Avatar alt metni kişi ile kurumu ayırıyor', () => {
  const g = kod(AVATAR);
  assert.match(g, /tur\?: 'kisi' \| 'kurum';/);
  assert.match(g, /tur = 'kisi'/, 'varsayılan kişi olmalı: çağıranların hemen hepsi öğrenci');
  assert.match(g, /alt=\{tur === 'kurum' \? `\$\{name\} logosu` : `\$\{name\} profil fotoğrafı`\}/);
  /* Logo bilgi taşıyor: boş alt yok. */
  assert.doesNotMatch(g, /alt=""/);
});

test('şirket satırında logo "logo" diye okunuyor', () => {
  /*
    Zincir: TakipListesi → ProfilFotografi → Avatar. Şirket logosu
    `companies.logo_url`den `yedekAdres` ucuyla geliyor (20261020010000);
    satırın şirket olup olmadığını yalnız `sirketId` kanıtlıyor.
  */
  const foto = kod(FOTOGRAF);
  assert.match(foto, /tur\?: 'kisi' \| 'kurum';/);
  assert.match(foto, /<Avatar name=\{ad\} url=\{adres\} className=\{className\} tur=\{tur\} \/>/);
  assert.match(foto, /return <Avatar name=\{ad\} className=\{className\} tur=\{tur\} \/>;/);

  const liste = kod(TAKIP_LISTESI);
  assert.match(liste, /tur=\{kisi\.sirketId \? 'kurum' : 'kisi'\}/);
  assert.match(liste, /yedekAdres=\{kisi\.logoAdresi\}/);
});
