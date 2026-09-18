import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ŞİRKET SOSYAL PROFİLİ VE TAKİP — GÖÇÜN ALTI KURALI

  Davranış 18 Eylül 2026'da yerel Postgres'te RLS ile 12 adımda ölçüldü
  (sayfa açılışı, sektörsüz görünürlük, üç takip yönü, kitle kilidinin
  iki yönü, engel). Burada o ölçümün kaynak düzeyindeki iddiaları
  bağlanıyor: kural sessizce gevşerse burada patlar.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const goc = oku('supabase/migrations/20261014010000_sirket_sosyal_profili_ve_takip.sql');

test('şirket rolü sosyal katmana giriyor; öğrenci ve yönetici korunuyor', () => {
  assert.match(goc, /select rol in \('student', 'admin', 'company'\)/);
});

test('kimse kendini şirket ilan edemez: sirket_id sahiplik tetikleyicisine bağlı', () => {
  assert.match(goc, /create or replace function sosyal_gizli\.sirket_sayfasi_kilidi\(\)/);
  assert.match(goc, /cm\.user_id = new\.profile_id[\s\S]{0,40}and cm\.is_owner/);
  assert.match(goc, /detail = 'sirket-sahibi-degil'/);
  assert.match(goc, /before insert or update of sirket_id on public\.social_profiles/);
  /* Bir şirketin TEK sayfası: ikinci Owner ikinci sayfa açamaz. */
  assert.match(goc, /create unique index if not exists social_profiles_sirket_tek[\s\S]{0,80}where sirket_id is not null/);
});

test('şirket sayfası sektörden bağımsız herkese açık ama engel korunuyor', () => {
  const politika = goc.slice(
    goc.indexOf('create policy "sirket sayfasi okunur"'),
    goc.indexOf('-- -------------------------------------------------- 4. kitle')
  );
  assert.match(politika, /sirket_id is not null/);
  assert.match(politika, /yayinda_mi/);
  assert.match(politika, /not sosyal_gizli\.engelli_mi\(profile_id\)/);
  assert.doesNotMatch(politika, /aktif_sektor|sector_id/, 'sektör şartı şirket sayfasında olmamalı');
  /*
    Yayın şartına DOKUNULMUYOR: 20260926040000 sektör şartını kaldırmıştı;
    ilk taslak onu geri getirip canlıda 16 öğrenci satırında patladı.
    Göç kısıtı yeniden tanımlamamalı.
  */
  assert.doesNotMatch(goc, /add constraint yayin_icin_kimlik_sart/);
});

test('kitle kilidi iki yönlü: şirket yalnız "sirket", "sirket" yalnız şirket', () => {
  assert.match(goc, /check \(kitle in \('baglantilarim', 'alan-toplulugum', 'resmi', 'sirket'\)\)/);
  assert.match(goc, /if new\.kitle = 'sirket'[\s\S]{0,400}detail = 'sirket-sayfasi-degil'/);
  assert.match(goc, /if new\.kitle <> 'sirket'[\s\S]{0,400}detail = 'sirket-kitlesi-sart'/);
  /* Eski kurallar aynen duruyor. */
  assert.match(goc, /topluluk-uyeligi-yok/);
  assert.match(goc, /resmi-hesap-degil/);
});

test('takip tek yönlü ve yalnız şirkete: hedef takip_edilebilir() ile sınırlı', () => {
  assert.match(goc, /create table if not exists public\.takipler/);
  assert.match(goc, /constraint kendini_takip_yok check \(takipci_id <> hedef_id\)/);
  const ekle = goc.slice(
    goc.indexOf('create policy "takipci kendi takibini acar"'),
    goc.indexOf('create policy "takipci kendi takibini kaldirir"')
  );
  assert.match(ekle, /takipci_id = auth\.uid\(\)/);
  assert.match(ekle, /sosyal_gizli\.takip_edilebilir\(hedef_id\)/);
  assert.match(ekle, /not sosyal_gizli\.engelli_mi\(hedef_id\)/);
  /* takip_edilebilir: yalnız yayında ŞİRKET sayfası. Öğrenci hedef olamaz. */
  const hedef = goc.slice(
    goc.indexOf('create or replace function sosyal_gizli.takip_edilebilir'),
    goc.indexOf('alter table public.takipler enable row level security')
  );
  assert.match(hedef, /sp\.sirket_id is not null/);
  assert.match(hedef, /sp\.yayinda_mi/);
  /* Sayaç herkese, satırlar yalnız taraflara. */
  assert.match(goc, /using \(takipci_id = auth\.uid\(\) or hedef_id = auth\.uid\(\)\)/);
  assert.match(goc, /grant execute on function public\.takipci_sayisi\(uuid\) to authenticated/);
});

test('sayfa üyelikten açılıyor; öğrenci dalı birebir korunuyor', () => {
  assert.match(goc, /after insert or update of is_owner on public\.company_members/);
  /* Şirket dalı: ad ve kullanıcı adı şirketten, sektör yok. */
  assert.match(goc, /if rol = 'company' then/);
  assert.match(goc, /aday := sirket\.slug;/);
  assert.match(goc, /\(profile_id, username, sirket_id, gorunen_ad, yayinda_mi\)/);
  /* Öğrenci dalı 20260926050000 ile aynı sözleşme. */
  assert.match(goc, /select sosyal_gizli\.bolumu_esle\(sp\.department\) into bolum/);
  assert.match(goc, /\(profile_id, username, department_id, sector_id, gorunen_ad, yayinda_mi\)/);
});
