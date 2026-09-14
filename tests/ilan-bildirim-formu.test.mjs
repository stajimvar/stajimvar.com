import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  İLAN BİLDİRME FORMU

  /ilan-bildir "Bildirimler için özel bir form henüz yok; e-posta
  yazmanız yeterli" diyordu. Kapanmış bir ilanı gören öğrencinin
  yapacağı iş, e-posta istemcisi açıp bağlantıyı elle kopyalamaktı —
  pratikte kimse bildirmiyordu. Oysa kapanmış ilanı listeden düşürmek
  bu ürünün asıl vaadi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const goc = oku('supabase/migrations/20260929010000_ilan_bildirimleri.sql');
const uc = oku('functions/api/ilan-bildir.ts');
const form = oku('src/components/IlanBildirFormu.tsx');
const sayfa = oku('src/components/CorporatePages.tsx');

test('"henüz yok" ifadesi kullanıcıya görünen metinde kalmadı', () => {
  /* Yalnız gerekçe yorumunda geçebilir; çizilen metinde geçmemeli. */
  const jsx = sayfa.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  assert.doesNotMatch(jsx, /form henüz yok/);
  assert.match(sayfa, /<IlanBildirFormu onDolgu=\{bildirimOnDolgusu\(\)\} \/>/);
});

test('HIZ SINIRI ATLATILAMIYOR: fonksiyon istemciye kapalı', () => {
  /*
    Fonksiyon IP özetini PARAMETRE alıyor. `anon`a execute verilseydi
    istemci fonksiyonu doğrudan çağırıp her seferinde rastgele bir özet
    gönderebilir, "saatte beş" kuralını tamamen atlatabilirdi — sayaç
    istemcinin söylediğine güvenmiş olurdu.
  */
  assert.match(goc, /revoke all on function public\.ilan_bildirimi_gonder\([^)]*\) from anon;/);
  assert.match(goc, /revoke all on function public\.ilan_bildirimi_gonder\([^)]*\) from authenticated;/);
  assert.doesNotMatch(goc, /grant execute on function public\.ilan_bildirimi_gonder[^;]*to anon/);

  /* Tabloda INSERT politikası da yok: tek yazma yolu bu fonksiyon. */
  assert.doesNotMatch(goc, /on public\.listing_reports\s*\n\s*for insert/);

  /* Özet yalnız sunucuda üretiliyor ve çağrı servis anahtarıyla. */
  assert.match(uc, /request\.headers\.get\('CF-Connecting-IP'\)/);
  assert.match(uc, /const anahtar = env\.SUPABASE_SERVICE_ROLE_KEY;/);
  assert.doesNotMatch(uc, /ANON_KEY/);
  /* İstemci özet göndermiyor: form gövdesinde böyle bir alan yok. */
  assert.doesNotMatch(form, /ip_ozeti/);
});

test('EŞ ZAMANLI isteklerde de sayıyor', () => {
  /*
    "Say, sonra yaz" yarışa açıktı: aynı IP'den beş istek aynı anda
    gelse beşi de sayımda dördü görür ve beşi de yazılırdı.
  */
  assert.match(goc, /perform pg_advisory_xact_lock\(hashtext\(p_ip_ozeti\)\)/);
  assert.match(goc, /son_saat >= public\.ilan_bildirim_siniri\(\)/);
  assert.match(goc, /returns integer\s*\nlanguage sql\s*\nimmutable\s*\nas \$\$ select 5 \$\$/);
});

test('security definer yetkisi ve search_path sınırlı', () => {
  assert.match(goc, /set search_path = pg_catalog, public/);
  /* Kuyruk işaretleyici de aynı biçimde kapalı. */
  assert.match(goc, /revoke all on function public\.ilan_bildirimi_kuyruk_isaretle\([^)]*\) from anon;/);
});

test('BAŞARI YALNIZ KALICI KAYITTAN SONRA; e-posta kaydı kaybettirmiyor', () => {
  /*
    Uç nokta yalnız satır yazıldığında `tamam` dönüyor ve e-posta bu
    isteğin işi DEĞİL: bildirim kuyrukta kayıtlı duruyor. Önce e-posta
    denenip sonra kayıt yazılsaydı, posta sağlayıcısının hatası
    bildirimi kaybettirirdi.
  */
  assert.match(uc, /return yanit\(\{ tamam: true, kuyrukta: true \}\);/);
  assert.doesNotMatch(uc, /resend|sendEmail|mail\./i);
  assert.match(form, /if \(yanit\.ok && govde\.tamam\) \{\s*\n\s*setAlindi\(true\);/);

  /* Kuyruk GERÇEK ve kalıcı: satırın kendi alanları. */
  assert.match(goc, /notified_at timestamptz,/);
  assert.match(goc, /notify_attempts integer not null default 0,/);
  assert.match(goc, /notify_last_error text,/);
  assert.match(goc, /create or replace function public\.ilan_bildirimi_kuyruk_isaretle\(/);
  assert.match(goc, /create or replace view public\.ilan_bildirim_kuyrugu as/);
  /* Sonsuz deneme yok. */
  assert.match(goc, /notify_attempts < 8/);
});

test('bildirimler, e-postalar ve kuyruk herkese açık değil', () => {
  assert.match(goc, /for select to authenticated using \(public\.is_admin\(\)\)/);
  assert.match(goc, /alter table public\.listing_reports enable row level security/);
});

test('doğrulanmamış süre taahhüdü yok', () => {
  /*
    "2 iş günü içinde incelenir" gibi bir söz ölçülmüş değil. Mesaj
    alındığını bildiriyor ve tek şikayetin ilanı kendiliğinden
    kaldırmadığını söylüyor.
  */
  assert.match(form, /Bildirimin alındı\./);
  assert.doesNotMatch(form, /iş günü/);
  assert.match(form, /kendiliğinden\s*\n?\s*yayından kaldırmıyor/);
});

test('ilan detayından ön dolgulu bağlantı', () => {
  const modal = oku('src/components/InternshipDetailModal.tsx');
  assert.match(modal, /\/ilan-bildir\?\$\{new URLSearchParams\(\{/);
  assert.match(modal, />\s*Bu ilanı bildir\s*</);
  assert.match(sayfa, /function bildirimOnDolgusu\(\)/);
  assert.match(sayfa, /al\('ilan'\)/);
});

test('olmayan özellik sunulmuyor: ekran görüntüsü kutusu yok', () => {
  /* Güvenli anonim dosya yükleme yolu kurulmadı; kutu da çizilmiyor. */
  assert.doesNotMatch(form, /type="file"/);
  assert.match(form, /Ekran görüntüsü alanı YOK/);
});
