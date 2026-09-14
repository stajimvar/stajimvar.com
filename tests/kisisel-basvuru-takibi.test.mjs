import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { gecenGun, hatirlatmaGosterilsinMi } from '../src/lib/basvuru-takibi.mjs';

/**
 * KİŞİSEL BAŞVURU TAKİBİ
 *
 * Öğrencinin kendi defteri ile GERÇEK başvuru iki ayrı kavram. Buradaki
 * testler o sınırı ve kolay bozulan yerleri bağlıyor.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');

const GOC = oku('supabase/migrations/20261002010000_kisisel_basvuru_takibi.sql');
const LISTE = oku('src/components/KisiselTakipListesi.tsx');
const DETAY = oku('src/components/ListingPage.tsx');
const APP = oku('src/App.tsx');
const SORGU = oku('src/lib/queries/index.ts');

/*
  YORUMSUZ SÜRÜM

  Negatif kontroller ("şu ifade hiç geçmesin") dosyanın KENDİ açıklama
  yorumlarıyla eşleşiyordu: bileşen "'şirket cevap vermedi' diyemeyiz"
  diye yazıyor ve test bunu ihlal sanıyordu. Yorumlar niyeti anlatıyor,
  ürün metni değil.
*/
const yorumsuz = (metin) =>
  metin.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const LISTE_KOD = yorumsuz(LISTE);

test('harici bağlantıya tıklamak başvuru oluşturmuyor', () => {
  /*
    ÖLÇÜLDÜ (14 Eylül 2026, üretim): 6 başvurunun 4'ü external ve
    `email_delivery_status='skipped_unverified'` — yani öğrencinin
    "başvurdum" işareti `applications` tablosuna yazılmıştı.
    Göndermediğimiz bir başvuruyu göndermiş gibi kaydetmek.
  */
  /* Resmî adres düz bir <a>: tıklamak hiçbir şey yazmıyor. */
  assert.match(DETAY, /href=\{yol\.resmiAdres\}/);
  assert.match(DETAY, /rel="noopener noreferrer nofollow"/);
  /* İkincil düğme harici ilanda onTrack'e gidiyor, onApply'a değil. */
  assert.match(
    DETAY,
    /onClick=\{\(\) => \(yol\.anaEylem === 'platform-ici' \? onApply\(listing\) : onTrack\(listing\)\)\}/
  );
  /* Takip işleyicisi `applications` tablosuna dokunmuyor. */
  const isleyici = APP.slice(APP.indexOf('const handleTrackApplication'));
  const govde = isleyici.slice(0, isleyici.indexOf('const submitApplication'));
  assert.match(govde, /basvurdumIsaretle/);
  assert.ok(!/applications/.test(govde), 'takip işleyicisi applications tablosuna yazmamalı');
  assert.ok(!/submitApplication|setApplyTarget/.test(govde), 'gerçek başvuru akışı çağrılmamalı');
});

test('kayıt yalnız kişisel takip: metin bunu söylüyor', () => {
  assert.match(APP, /Takip listene eklendi\. Şirkete başvuru gönderilmedi\./);
  assert.match(LISTE, /yalnızca senin takibin içindir; şirkete başvuru göndermez/);
});

test('hesapsız kullanıcı harici bağlantıya gidebiliyor, takip için girişten sonra ilana dönüyor', () => {
  /* Resmî adres bağlantısı oturuma bağlı değil: koşullu render yok. */
  const blok = DETAY.slice(DETAY.indexOf('{yol.resmiAdres && ('));
  assert.ok(!/session|oturum/i.test(blok.slice(0, 400)), 'harici bağlantı oturum istemiyor');
  /* Takipte giriş kapısı var ve dönüş yolu ilanın kendisi. */
  const isleyici = APP.slice(APP.indexOf('const handleTrackApplication'));
  assert.match(isleyici.slice(0, 900), /setAuthDonusYolu\(window\.location\.pathname\)/);
});

test('kişisel takip şirkete görünmüyor — dayanak RLS', () => {
  /* Tabloda şirketlere açık hiçbir politika YOK. */
  assert.ok(!/is_company_member/.test(GOC), 'şirket politikası olmamalı');
  const politikalar = [...GOC.matchAll(/create policy "([^"]+)" on public\.application_tracking/g)].map(
    (m) => m[1]
  );
  assert.equal(politikalar.length, 4, 'select/insert/update/delete — dördü de sahibine');
  for (const p of politikalar) assert.match(p, /ogrenci/, `politika sahibine ait olmalı: ${p}`);
  /* Dört politikanın dördü de auth.uid() ile sınırlı. */
  const sayi = (GOC.match(/student_id = auth\.uid\(\)/g) || []).length;
  assert.ok(sayi >= 5, `auth.uid() sınırı her politikada olmalı (bulunan: ${sayi})`);
});

test('kişisel durum işverenin durumunu ezmiyor', () => {
  /* Ayrı tablo, ayrı alan. */
  assert.match(GOC, /personal_status public\.kisisel_basvuru_durumu/);
  /* Göç `applications.status`a hiç yazmıyor. */
  assert.ok(
    !/update public\.applications/.test(GOC),
    'göç gerçek başvuru durumuna dokunmamalı'
  );
  /* Ekran işveren durumunu SALT OKUNUR ve ayrı satırda gösteriyor. */
  assert.match(LISTE, /Şirketin değerlendirmesi:/);
  const blok = LISTE.slice(LISTE.indexOf('{gercek && ('), LISTE.indexOf('{hatirlat && ('));
  assert.ok(!/onChange|onClick/.test(blok), 'işveren durumu düzenlenebilir olmamalı');
});

test('mükerrer takip kaydı oluşmuyor', () => {
  assert.match(GOC, /create unique index if not exists application_tracking_tekil_idx/);
  assert.match(GOC, /\(student_id, listing_id, application_id\)/);
  /*
    `nulls not distinct` ŞART: external takipte application_id NULL ve
    normal bir unique indekste iki NULL "farklı" sayılır — aynı ilana
    iki kez "başvurdum" işaretlenebilirdi.
  */
  assert.match(GOC, /nulls not distinct/);
  /* Tetikleyici çakışmada başvuruyu düşürmüyor. */
  assert.match(GOC, /on conflict do nothing/);
  /* İstemci de mükerrer işareti hata olarak göstermiyor. */
  assert.match(SORGU, /code === '23505'/);
});

test('internal ve email_application gerçek durumları bozulmuyor', () => {
  const tetik = GOC.slice(GOC.indexOf('function public.basvurudan_takip_olustur'));
  const govde = tetik.slice(0, tetik.indexOf('$$;'));
  /* external tetikleyiciye hiç girmiyor: gerçek başvurusu bizde yok. */
  assert.match(govde, /if new\.application_method = 'external' then\s*\n\s*return new;/);
  /* Tetikleyici yalnız takip tablosuna INSERT yapıyor. */
  assert.match(govde, /insert into public\.application_tracking/);
  assert.ok(!/update public\.applications/.test(govde), 'gerçek başvuru güncellenmemeli');
  /* `after insert`: başvurunun kendisi önce yazılıyor. */
  assert.match(GOC, /after insert on public\.applications/);
});

test('takip kaydı ilan silinse bile kalıyor', () => {
  assert.match(GOC, /listing_id uuid references public\.listings \(id\) on delete set null/);
  /* Anlık görüntü: başlık ve şirket satırın kendisinde. */
  assert.match(GOC, /listing_title text/);
  assert.match(GOC, /company_name text/);
  assert.match(GOC, /check \(listing_id is not null or length\(btrim\(coalesce\(listing_title, ''\)\)\) > 0\)/);
});

test('sahip değiştirilemiyor', () => {
  const tetik = GOC.slice(GOC.indexOf('function public.application_tracking_damga'));
  assert.match(tetik.slice(0, tetik.indexOf('$$;')), /new\.student_id := old\.student_id/);
  /* Üretilen Update tipi student_id taşımıyor. */
  const tipler = oku('src/lib/database.types.ts');
  const blok = tipler.slice(tipler.indexOf('application_tracking: {'));
  const guncelle = blok.slice(blok.indexOf('Update: {'), blok.indexOf('Relationships'));
  const guncelleKod = yorumsuz(guncelle);
  assert.ok(!/student_id/.test(guncelleKod), 'Update tipinde student_id olmamalı');
  assert.ok(!/application_id/.test(guncelleKod), 'gerçek başvuru bağı arayüzden kurulmamalı');
});

test('yedi gün sonra öneri var, hüküm yok', () => {
  const temel = { appliedAt: new Date('2026-09-01T09:00:00Z').toISOString(), personalStatus: 'bekliyorum' };
  const simdi = new Date('2026-09-08T09:00:00Z').getTime();
  assert.equal(gecenGun(temel.appliedAt, simdi), 7);
  assert.equal(hatirlatmaGosterilsinMi(temel, simdi), true);
  /* Altıncı günde çıkmıyor. */
  assert.equal(
    hatirlatmaGosterilsinMi(temel, new Date('2026-09-07T08:00:00Z').getTime()),
    false
  );
  /* Kapanmış durumlarda çıkmıyor: gürültü olurdu. */
  for (const d of ['teklif', 'olumsuz', 'vazgectim']) {
    assert.equal(hatirlatmaGosterilsinMi({ ...temel, personalStatus: d }, simdi), false, d);
  }
  /* HÜKÜM KURULMUYOR: "şirket cevap vermedi" demiyoruz. */
  assert.match(LISTE, /Takip etmek isteyebilirsin/);
  assert.ok(!/cevap vermedi|yanıt vermedi|cevapsız/i.test(LISTE_KOD), 'kesin hüküm kurulmamalı');
  /* Mevcut şablona bağlanıyor, yeni şablon yazılmıyor. */
  assert.match(LISTE, /onNavigate\('\/basvuru-sablonu'\)/);
});

test('mobilde tam genişlik, köşesiz, gölgesiz', () => {
  /* Mevcut kart dili: telefonda kenarsız/köşesiz, sm'de yuvarlanıyor. */
  assert.match(LISTE, /border-y border-gray-200 bg-white p-4 sm:rounded-2xl sm:border-x/);
  assert.ok(!/shadow-(sm|md|lg|xl)/.test(LISTE), 'gölge olmamalı');
  /* Uzun metin taşmıyor. */
  assert.match(LISTE, /break-words/);
  assert.match(LISTE, /flex flex-wrap items-center gap-2/);
  /* Dokunma hedefleri 44px: min-h-11. */
  const dugmeler = (LISTE.match(/min-h-11/g) || []).length;
  assert.ok(dugmeler >= 4, `dokunma hedefleri min-h-11 olmalı (bulunan: ${dugmeler})`);
});

test('boş, yükleniyor ve hata durumları tamam', () => {
  assert.match(LISTE, /Henüz takip kaydın yok/);
  assert.match(LISTE, /aria-label="Takip listesi yükleniyor"/);
  assert.match(LISTE, /Takip listesi yüklenemedi/);
  assert.match(LISTE, /Tekrar dene/);
});

test('sorgu katmanı kullanıcı filtresini istemciye bırakmıyor', () => {
  const fn = SORGU.slice(SORGU.indexOf('export async function fetchBasvuruTakibi'));
  const govde = fn.slice(0, fn.indexOf('\n}'));
  /* RLS `student_id = auth.uid()`: istemcide filtre görünüm olurdu,
     güvenlik değil. */
  assert.ok(!/\.eq\('student_id'/.test(govde), 'istemci tarafı kullanıcı filtresi olmamalı');
  assert.match(govde, /from\('application_tracking'\)/);
});
