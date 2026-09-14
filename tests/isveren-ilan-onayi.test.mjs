import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { KADEME, ilanBaslangicDurumu } from '../src/lib/sirket-kademe.mjs';
import { ilanSatiri } from '../src/lib/ilan-formu.mjs';

/**
 * İŞVEREN NATIVE İLAN AKIŞI — ONAYSIZ YAYIN YOK
 *
 * Bu dosya siparişin "kritik kurallar" listesini koda bağlıyor. Her
 * kural tek tek ölçülüyor ve gerekçesi yanında yazıyor.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const sqlYorumsuz = (m) =>
  m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, ' ');
const tsYorumsuz = (m) =>
  m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const GOC = oku('supabase/migrations/20261008010000_ilan_yayini_yonetici_onayina_bagli.sql');
const KUYRUK = oku('src/components/AdminListingsQueue.tsx');
const FORM = oku('src/sirket/IlanFormu.tsx');
const RLS = oku('scripts/sql/rls-regresyon-testleri.sql');

/* ------------------------------------------- 1. ONAYSIZ YAYIN YOK */

test('hiçbir kademe ilanı yayında başlatamıyor', () => {
  for (const kademe of [KADEME.ILAN_VEREN, KADEME.DOGRULANMIS]) {
    assert.equal(ilanBaslangicDurumu({ kademe }), 'draft');
  }
  /* İlan açamayan kademe hiç durum üretmiyor. */
  assert.equal(ilanBaslangicDurumu({ kademe: KADEME.ZIYARETCI }), null);
});

test('tetikleyici kademe baypaslarını tanımıyor', () => {
  const govde = GOC.slice(GOC.indexOf('create or replace function public.guard_listing_publish'));
  const fn = sqlYorumsuz(govde.slice(0, govde.indexOf('$function$;')));
  assert.ok(!/verified/.test(fn), 'verified baypası kalmamalı');
  assert.ok(!/alan_adi_eslesiyor/.test(fn), 'alan adı baypası kalmamalı');
  assert.match(fn, /raise exception 'Ilan yayina ancak yonetici onayiyla alinir'/);
  /*
    OTOMASYON MUAF KALMALI: derlenen ilanlar şirketin kendi kariyer
    sayfasında zaten yayında; onları editoryal kuyruğa sokmak kuyruğu
    kullanılamaz hale getirirdi.
  */
  assert.match(fn, /rol = 'service_role'/);
  /*
    YASAKLANAN DURUM DEĞİL GEÇİŞ: şirket yayındaki ilanını
    düzenleyebilmeli, yoksa yazım hatasını bile düzeltemez.
  */
  assert.match(fn, /old\.status is not distinct from 'published'/);
});

test('form yayında başlayan bir dal taşımıyor', () => {
  const kod = tsYorumsuz(FORM);
  assert.ok(!/yayindaBaslar/.test(kod), 'yayında başlama dalı kalmamalı');
  assert.ok(!/İlan canlı/.test(kod), '"İlan canlı" mesajı artık hiç çıkmıyor');
  assert.match(kod, /İncelemeye gönder/);
});

/* ---------------------------------- 2. ÜCRET VE KABUL ALANLARI NULL */

test('"Belirtilmeyecek" ücret null, ücretsiz false', () => {
  const kur = (ucret) => ilanSatiri({ ucret, tur: 'yaz' }, { companyId: 'c', durum: 'draft' });
  assert.equal(kur('belirtilmeyecek').is_paid, null, 'bilgi vermemek beyan değil');
  assert.equal(kur('ucretsiz').is_paid, false, 'şirketin AÇIK beyanı');
  assert.equal(kur('asgari').is_paid, true);
  assert.equal(kur('net').is_paid, true);
});

test('tek staj türünden kabul/ret TÜRETİLMİYOR', () => {
  /*
    "Yaz stajı" seçmek, şirketin zorunlu staj kabul ETMEDİĞİ anlamına
    gelmez. Form ikisini ayrı ayrı sormadığı sürece tahmin yazılmıyor.
  */
  for (const tur of ['yaz', 'uzun', 'zorunlu']) {
    const satir = ilanSatiri({ ucret: 'asgari', tur }, { companyId: 'c', durum: 'draft' });
    assert.equal(satir.mandatory_staj_accepted, null, `${tur}: zorunlu türetilmemeli`);
    assert.equal(satir.voluntary_staj_accepted, null, `${tur}: gönüllü türetilmemeli`);
  }
});

/* ------------------------------- 3. ONAY/RET YALNIZ YÖNETİCİDE */

test('ilan_incele yetkiyi İÇERDE sorguluyor, anon çağıramıyor', () => {
  const govde = GOC.slice(GOC.indexOf('create or replace function public.ilan_incele'));
  const fn = govde.slice(0, govde.indexOf('$function$;'));
  /* Yetki fonksiyonun İÇİNDE: `security definer` tek başına kapı değil. */
  assert.match(fn, /if not public\.is_admin\(\) then/);
  assert.match(fn, /insufficient_privilege/);
  /* Ret için not zorunlu: nedensiz ret aynı ilanın yeniden gelmesi demek. */
  assert.match(fn, /Ret icin not zorunlu/);
  /* posted_at yalnız onayda yazılıyor. */
  assert.match(fn, /posted_at\s*=\s*case when p_karar = 'onayla'/);

  assert.match(GOC, /revoke all on function public\.ilan_incele\(uuid, text, text\) from anon/);
  assert.match(GOC, /grant execute on function public\.ilan_incele\(uuid, text, text\) to authenticated/);
});

test('inceleme kolonlarını şirket YAZAMIYOR, okuyabiliyor', () => {
  /*
    `listings` kolon kolon yetki veriyor. Üç yeni kolon insert/update
    listesine girmedi — şirket kendi ilanına "onaylandı" damgası
    basamıyor. SELECT açıkça veriliyor: verilmezse tek kolon bütün
    sorguyu 42501 ile düşürür (bu hata bir kez üretimde yaşandı).
  */
  assert.match(GOC, /grant select \(review_note, reviewed_at, reviewed_by\) on public\.listings to authenticated/);
  assert.ok(
    !/grant (insert|update)[^;]*review_note/.test(GOC),
    'inceleme kolonlarına yazma yetkisi verilmemeli'
  );
});

/* ------------------------------------- 4. KUYRUK GERÇEKTEN RPC'DE */

test('yönetici kuyruğu tek RPC kullanıyor, düz UPDATE atmıyor', () => {
  const kod = tsYorumsuz(KUYRUK);
  assert.match(kod, /ilanIncele\(ilan\.id, yayinla \? 'onayla' : 'reddet', not\)/);
  assert.ok(!/publishListing|archiveListing/.test(kod), 'düz durum güncellemeleri kalmamalı');
  /* Ret notu isteniyor ve boş not gönderilmiyor. */
  assert.match(kod, /if \(yazilan === null\) return;/);
  assert.match(kod, /if \(!yazilan\.trim\(\)\)/);
});

/* --------------------------- 5. VERİTABANI SEVİYESİNDE YETKİ TESTİ */

test('RLS regresyonu yeni kuralı ölçüyor', () => {
  /* Şirket doğrulanmış olsa bile yayına alamıyor. */
  assert.match(RLS, /A, dogrulanmis olsa bile kendi taslagini yayina ALAMAZ/);
  /* Yönetici onaylayabiliyor ve iz düşüyor. */
  assert.match(RLS, /Yonetici ilani onaylayabilir/);
  assert.match(RLS, /reviewed_at is not null/);
  /* Şirket üyesi RPC'yi çağıramıyor. */
  assert.match(RLS, /Sirket uyesi ilan_incele cagiramaz/);
  /* Yönetici kimliği fikstüre eklendi. */
  assert.match(RLS, /'admin'::user_role/);
});

/* ------------------------------------------ 6. VERİLMEYEN SÖZ YOK */

test('karar için e-posta sözü verilmiyor', () => {
  /*
    E-posta altyapısı (Resend + kuyruk) var ama ilan KARARI için bağlı
    bir yol yok. Arayüz "kararı e-postayla yazıyoruz" diyordu; bağlı
    olmayan bir davranışı söz vermek, kullanıcıyı bekletmek olur.
    Söylenen tek şey panelde görüneceği — o gerçekten çalışıyor.
  */
  for (const dosya of ['src/sirket/IlanFormu.tsx', 'src/components/IsverenLanding.tsx']) {
    const kod = tsYorumsuz(oku(dosya));
    assert.ok(
      !/e-postayla (yazıyoruz|yazacağız|bildiriyoruz)/i.test(kod),
      `${dosya}: bağlanmamış e-posta sözü olmamalı`
    );
  }
  assert.match(tsYorumsuz(oku('src/sirket/SirketPaneli.tsx')), /İnceleme notu/);
});

test('işveren sayfasında sahte sayı ya da yayın sözü yok', () => {
  const kod = tsYorumsuz(oku('src/components/IsverenLanding.tsx'));
  assert.ok(!/bugün yayınlayın/i.test(kod), 'yayın tarihi bizim elimizde, söz verilemez');
  /* Gerçek kayıt ve giriş eylemleri duruyor. */
  assert.match(kod, /Ücretsiz şirket hesabı oluştur/);
  assert.match(kod, /Hesabım var, giriş yap/);
  /* Doğrulanmamış öğrenci/başvuru sayısı iddiası yok. */
  assert.ok(!/\d{2,}\s*(bin|binlerce)?\s*(öğrenci|başvuru|şirket)/i.test(kod));
});
