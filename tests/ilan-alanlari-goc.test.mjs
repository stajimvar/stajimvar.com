import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  İLAN ALANLARI GÖÇÜ (20261109010000)

  Kullanıcı isteği (25 Eylül 2026): ilanlar sitenin alanlarına göre
  süzülebilsin; bir ilan iki alanda olabilir. Bu testler göçün
  KURALLARINI koruyor — sınıflandırmanın kendisi yerelde gerçek
  başlıklarla ölçüldü (canlıdaki 186 ilanın 176'sı alan aldı).
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const goc = oku('supabase/migrations/20261109010000_ilan_alanlari.sql');

test('en çok iki alan, birincil önce', () => {
  /* Dizi yalnız `birinci` ve `ikinci`den kuruluyor; üçüncü bir kaynak yok. */
  assert.match(goc, /x\.slug in \(birinci, ikinci\)/);
  assert.match(goc, /order by \(x\.slug = birinci\) desc/);
});

test('alanını söylemeyen ilan bir alana zorlanmıyor', () => {
  /* Hiçbir şey eşleşmezse boş dizi; "Diğer" gibi uydurma bir kova yok. */
  assert.match(goc, /\), '\{\}'\);/);
  assert.doesNotMatch(goc, /'diger'|'belirsiz'/i);
});

test('genel iş kovası ikinci alan olmuyor, operasyon da', () => {
  /*
    "proje" ya da "analyst" geçen her ilan İşletme süzgecini doldururdu;
    "Operasyonları" çoğu başlıkta bir niteleyici.
  */
  const govde = goc.slice(goc.indexOf('create or replace function public.ilan_alanlari'));
  assert.match(govde, /if birinci is null then\s*\n\s*\/\* GENEL İŞ KOVASI/);
  assert.match(govde, /and i\.slug <> 'endustri-operasyon-yonetimi'/);
});

test('tetikleyici her yolda çalışıyor, yalnız başlık ya da şirket değişince', () => {
  assert.match(goc, /before insert or update of title, company_id on public\.listings/);
  assert.match(goc, /tg_op = 'INSERT'\s*\n\s*or new\.title is distinct from old\.title\s*\n\s*or new\.company_id is distinct from old\.company_id/);
});

test('geri doldurma zaman damgalarını oynatmıyor', () => {
  /*
    `alan_idleri` türetilmiş alan: normalize listesinde olmasaydı geri
    doldurma bütün ilanların `updated_at`ini aynı saniyeye çekerdi.
    Liste geri doldurmadan ÖNCE güncellenmeli.
  */
  const liste = goc.indexOf("'apply_url_ok','alan_idleri'");
  const doldurma = goc.indexOf('update public.listings l\n   set alan_idleri');
  assert.ok(liste > 0 && doldurma > liste, 'normalize listesi geri doldurmadan önce güncellenmeli');
  assert.doesNotMatch(goc, /'anlamli'.*alan_idleri/);
});

test('okuma yetkisi var, yazma ve sınıflandırıcıyı çağırma yok', () => {
  assert.match(goc, /grant select \(alan_idleri\) on public\.listings to anon, authenticated;/);
  assert.doesNotMatch(goc, /grant (insert|update)[^;]*alan_idleri/i);
  assert.match(goc, /revoke all on function public\.ilan_alanlari\(text, text\) from public, anon, authenticated;/);
  assert.match(goc, /revoke all on function public\.listings_alan_doldur\(\) from public, anon, authenticated;/);
});

test('alan adları ziyaretçiye yalnız süzgecin ihtiyacı kadar açılıyor', () => {
  /*
    `aktif` de açık olmalı: alan listesi sorgusu `aktif=eq.true` süzüyor
    ve süzülen sütun izinsizse istek 42501 ile düşüyordu (ölçüldü).
  */
  assert.match(goc, /grant select \(id, slug, ad, sira, aktif\) on public\.sectors to anon;/);
  assert.match(goc, /for select to anon using \(aktif\);/);
  assert.doesNotMatch(goc, /grant select on public\.sectors to anon/);
});

test('katalog RPC alanı ve alan × tür dağılımını döndürüyor', () => {
  /*
    İlan listesi `listings`ten değil bu RPC'den geliyor ve kolonları tek
    tek sayıyor; yeni kolon eklenmezse arayüze hiç ulaşmıyordu.
  */
  const rpc = goc.slice(goc.indexOf('create or replace function public.get_published_listings_catalog_v3'));
  assert.ok(rpc.length > 100, 'RPC yeniden tanımlanmalı');
  assert.match(rpc, /l\.content_updated_at,\s*\n\s*\/\* İlanın alanları \(20261109010000\)\. \*\/\s*\n\s*l\.alan_idleri,/);
  assert.match(rpc, /'alanlar', coalesce\(\(/);
  assert.match(rpc, /jsonb_build_object\('alan', alan_id, 'tip', tip, 'count', amount\)/);
  /* Dağılım ülke süzgecinden sonra, tür süzgecinden önce: `ulkeli`. */
  assert.match(rpc, /from ulkeli u cross join lateral unnest\(u\.alan_idleri\)/);
  assert.match(rpc, /grant execute on function public\.get_published_listings_catalog_v3\(text, timestamptz, uuid, timestamptz, text\[\]\)\s*\n\s*to anon, authenticated, service_role;/);
});
