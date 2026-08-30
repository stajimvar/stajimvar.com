import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ilanSatiri } from '../src/lib/ilan-formu.mjs';

/*
  Kolon yetkisi ile uygulamanın yazdığı alanlar birbirinden KAYABİLİR.

  İki yönde de sessiz: yetki listesinden bir alan düşerse şirket paneli
  "permission denied" ile kırılır ve bunu ancak gerçek bir şirket hesabı
  fark eder; listeye bir sistem alanı sızarsa ilan sahibi platformun
  tazelik sinyalini yazabilir hale gelir ve bunu kimse fark etmez.

  Bu testler iki listeyi birbirine bağlıyor. Yetki listesi migration'dan
  okunuyor — kaynak orası.
*/

/*
  Yetki tek bir dosyada durmuyor: bir göç veriyor, sonraki daraltıyor.
  Tek dosyayı okumak, sonradan geri alınmış bir yetkiyi hâlâ açık
  sanmak demek — o yüzden dosyalar SIRAYLA işlenip etkin küme
  hesaplanıyor. Veritabanının ulaştığı durum da bu.
*/
const YETKI_GOCLERI = [
  'supabase/migrations/20260906010000_ilan_kolon_yetkileri.sql',
  'supabase/migrations/20260906020000_ilan_basvuru_yolu_sabit.sql',
];

const MIGRATION = YETKI_GOCLERI.map((yol) => readFileSync(yol, 'utf8')).join('\n');

/** `<grant|revoke> <ayrıcalık> ( ... ) on public.listings` bloklarındaki kolonlar. */
function kolonlar(eslesme) {
  return eslesme[1]
    .split(',')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter(Boolean);
}

function etkinYetki(ayricalik) {
  const kume = new Set();
  let bulundu = false;
  /* `insert, update` gibi çoklu ayrıcalık listelerini de yakalıyor. */
  const desen = new RegExp(
    String.raw`(grant|revoke)\s+([a-z,\s]*\b${ayricalik}\b[a-z,\s]*?)\s*\(([^)]*)\)\s*on public\.listings`,
    'gi'
  );
  for (const m of MIGRATION.matchAll(desen)) {
    bulundu = true;
    for (const kolon of kolonlar([m[0], m[3]])) {
      if (m[1].toLowerCase() === 'grant') kume.add(kolon);
      else kume.delete(kolon);
    }
  }
  assert.ok(bulundu, `${ayricalik} için grant/revoke bloğu bulunamadı`);
  return kume;
}

const INSERT_YETKISI = etkinYetki('insert');
const UPDATE_YETKISI = etkinYetki('update');

/* Öğrenciye tazelik ve güven sinyali olarak gösterilen, ilan sahibinin
   yazmaması gereken alanlar. */
const SISTEM_ALANLARI = [
  'source_status', 'source_verified_at', 'source_checked_at', 'last_seen_at',
  'source_id', 'source_listing_id', 'source_url', 'canonical_url',
  'content_hash', 'first_seen_at', 'imported_at', 'deactivated_at',
  'deactivation_reason', 'raw', 'raw_listing_id', 'application_channel_id',
  'applicants_count', 'featured', 'id', 'created_at', 'updated_at',
  /* Başvuru yolu şirketin seçimi değil: ilan her zaman StajımVar
     üzerinden başvuru alıyor. */
  'application_method', 'apply_url',
];

test('PANELİN GÖNDERDİĞİ HER ALAN INSERT YETKİSİNDE', () => {
  /* Gerçek yük: form modülünün kendisi çağrılıyor, elle yazılmış bir
     kopya değil — kopya, form değişince sessizce eskir. */
  const satir = ilanSatiri(
    {
      unvan: 'Stajyer', sehir: 'İzmir', calismaSekli: 'On-site', tur: 'zorunlu',
      sure: '3 ay', ucret: 'asgari', basvuruTipi: 'platform', aciklama: 'metin',
      sonBasvuru: '2026-12-31',
    },
    { companyId: '00000000-0000-4000-8000-000000000001', durum: 'draft' }
  );
  const eksik = Object.keys(satir).filter((k) => !INSERT_YETKISI.has(k));
  assert.deepEqual(eksik, [], `panel bu alanları gönderiyor ama INSERT yetkisi yok: ${eksik}`);
});

test('durum geçişlerinin yazdığı alanlar UPDATE yetkisinde', () => {
  /* ilanDurumuDegistir, publishListing ve archiveListing yalnızca bu
     ikisini yazıyor. */
  for (const kolon of ['status', 'posted_at']) {
    assert.ok(UPDATE_YETKISI.has(kolon), `${kolon} UPDATE yetkisinde olmalı`);
  }
});

test('SİSTEM ALANLARI HİÇBİR YETKİ LİSTESİNDE OLMAMALI', () => {
  const sizan = SISTEM_ALANLARI.filter(
    (k) => INSERT_YETKISI.has(k) || UPDATE_YETKISI.has(k)
  );
  assert.deepEqual(sizan, [], `sistem alanı yetki listesine sızmış: ${sizan}`);
});

test('company_id ve origin yalnızca INSERT tarafında', () => {
  /*
    İlan bir kez açıldıktan sonra kime ait olduğu ve nereden geldiği
    değişmemeli: ikisi de sonradan güncellenebilseydi şirket ilanını
    başkasına devredebilir ya da kaynağını 'scraped' gösterebilirdi.
  */
  for (const kolon of ['company_id', 'origin']) {
    assert.ok(INSERT_YETKISI.has(kolon), `${kolon} INSERT yetkisinde olmalı`);
    assert.ok(!UPDATE_YETKISI.has(kolon), `${kolon} UPDATE yetkisinde OLMAMALI`);
  }
});

test('tablo düzeyindeki geniş yazma yetkisi kaldırılmış', () => {
  /* Kolon yetkileri tablo düzeyindeki INSERT/UPDATE'in üstüne binmiyor;
     o geri alınmazsa kolon listesi hiçbir şey ifade etmez. */
  assert.match(MIGRATION, /revoke\s+insert,\s*update\s+on public\.listings\s+from authenticated/i);
});
