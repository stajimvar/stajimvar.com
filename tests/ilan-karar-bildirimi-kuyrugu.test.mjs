import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * İLAN KARAR BİLDİRİMİ — ŞİRKETE ONAY/RET E-POSTASI
 *
 * §7 (devir belgesi, 15 Eylül 2026): `ilan_incele` karar veriyordu ama
 * kimseye haber vermiyordu. Bu testler yeni kuyruğun KOLAY BOZULAN
 * yerlerini bağlıyor: geriye dönük taramanın olmadığını, eş zamanlı
 * işçilerin çakışmadığını, ve alıcının doğru çözüldüğünü.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');

const GOC = oku('supabase/migrations/20261010010000_ilan_karar_bildirimi.sql');
const ISCI = oku('scripts/ilan-karar-bildirimi-kuyrugu.mjs');
const AKIS = oku('.github/workflows/ilan-bildirim-kuyrugu.yml');

test('geriye dönük tarama yok: kolon varsayılanı "zaten bildirildi"', () => {
  /*
    Göç anında var olan yüzlerce karara geç kalmış e-posta gitmemesi
    için `karar_bildirim_at` DOLU başlamalı (null DEĞİL) — null = kuyrukta
    bekliyor demek ve varsayılan null olsaydı bu göç uygulanır uygulanmaz
    her geçmiş karar kuyruğa girerdi.
  */
  assert.match(GOC, /add column if not exists karar_bildirim_at timestamptz default now\(\)/);
});

test('ilan_incele HER kararda kuyruğu sıfırlıyor', () => {
  const fn = GOC.slice(
    GOC.indexOf('create or replace function public.ilan_incele'),
    GOC.indexOf('$function$;', GOC.indexOf('create or replace function public.ilan_incele'))
  );
  assert.match(fn, /karar_bildirim_at\s*=\s*null/);
  assert.match(fn, /karar_bildirim_denemeleri\s*=\s*0/);
  assert.match(fn, /karar_bildirim_sonraki_at\s*=\s*now\(\)/);
  /* Eski davranış korunuyor: hâlâ tek RPC, hâlâ is_admin() içeride. */
  assert.match(fn, /if not public\.is_admin\(\) then/);
  assert.match(fn, /Ret icin not zorunlu/);
});

test('kuyruktan alma ve işaretleme istemciye tamamen kapalı', () => {
  for (const fn of ['ilan_karar_bildirimi_kuyruktan_al', 'ilan_karar_bildirimi_kuyruk_isaretle']) {
    for (const rol of ['anon', 'authenticated']) {
      assert.ok(
        new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from ${rol}`).test(GOC),
        `${fn} ${rol} tarafından çağrılamamalı`
      );
    }
    assert.ok(
      !new RegExp(`grant execute on function public\\.${fn}`).test(GOC),
      `${fn} hiçbir istemci rolüne verilmemeli`
    );
  }
});

test('eş zamanlı işçiler aynı kararı almıyor', () => {
  const al = GOC.slice(GOC.indexOf('function public.ilan_karar_bildirimi_kuyruktan_al'));
  const govde = al.slice(0, al.indexOf('$$;'));
  assert.match(govde, /for update of l skip locked/, 'satır kilidi atlamalı, beklememeli');
  assert.match(govde, /karar_bildirim_sonraki_at = now\(\) \+ make_interval/);
});

test('alıcı: şirketin sahibi, yoksa en eski üye — sabit bir sır değil', () => {
  const al = GOC.slice(GOC.indexOf('function public.ilan_karar_bildirimi_kuyruktan_al'));
  const govde = al.slice(0, al.indexOf('$$;'));
  assert.match(govde, /company_members/);
  assert.match(govde, /order by cm\.is_owner desc, cm\.created_at asc/);
  /* companies'te ayrı bir e-posta kolonu yok; profiles.email'e bağlanıyor. */
  assert.match(govde, /join public\.profiles pr on pr\.id = cm\.user_id/);
  assert.ok(!/ILAN_BILDIRIM_ALICI/.test(ISCI), 'alıcı RPC\'den geliyor, sabit sır değil');
});

test('başarısızlıkta deneme sayısı artıyor, bekleme aralığı üstel', () => {
  const isaretle = GOC.slice(GOC.indexOf('function public.ilan_karar_bildirimi_kuyruk_isaretle'));
  const govde = isaretle.slice(0, isaretle.indexOf('$$;'));
  assert.match(govde, /karar_bildirim_denemeleri = karar_bildirim_denemeleri \+ 1/);
  assert.match(govde, /power\(2, least\(karar_bildirim_denemeleri \+ 1, 7\)\)/);
  assert.match(govde, /left\(p_hata, 500\)/);
});

test('alıcı yoksa da denemeye sayılıyor, sonsuza dek tekrar çekilmiyor', () => {
  assert.match(ISCI, /if \(!b\.alici_email\) throw new Error/);
});

test('idempotency anahtarı KARARIN kimliği: ilan + reviewed_at, koşu değil', () => {
  assert.match(ISCI, /'Idempotency-Key': `ilan-karar-\$\{b\.id\}-\$\{new Date\(b\.reviewed_at\)\.getTime\(\)\}`/);
});

test('işaretleme gönderimden SONRA yapılıyor', () => {
  const g = ISCI.indexOf('await gonder(b)');
  const i = ISCI.indexOf('p_basarili: true');
  assert.ok(g > 0 && i > g, 'önce gönder, sonra işaretle');
});

test('kullanıcı metni (başlık, ret notu) HTML kaçırılmadan girmiyor', () => {
  assert.match(ISCI, /function kacir\(/);
  assert.match(ISCI, /\$\{kacir\(b\.review_note\)\}/);
  assert.match(ISCI, /kacir\(b\.title/);
});

test('ikinci bir zamanlama sistemi kurulmadı: mevcut işin adımı', () => {
  /* Yeni bir workflow dosyası yok; aynı saatlik işe adım eklendi. */
  assert.match(AKIS, /node scripts\/ilan-karar-bildirimi-kuyrugu\.mjs/);
  assert.match(AKIS, /schedule:/);
  assert.match(AKIS, /cron: "25 \* \* \* \*"/);
});

test('kayıt hiçbir dalda silinmiyor', () => {
  assert.ok(!/delete\s+from/i.test(ISCI), 'işçi kayıt silmemeli');
  assert.ok(!/delete\s+from\s+public\.listings/i.test(GOC), 'göç ilan kaydı silmemeli');
});
