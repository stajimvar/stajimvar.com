import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { govdeKur, hosgeldinHtml } from '../scripts/bildirim-epostasi.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const goc = oku('supabase/migrations/20270110010000_sirket_hosgeldin.sql');

test('onay bildirimi "hoş geldin" diyor; ret metni değişmedi', () => {
  assert.equal((goc.match(/'StajımVar''a hoş geldin'/g) ?? []).length, 2);
  assert.match(goc, /'Sahiplenme talebin reddedildi'/);
  assert.match(goc, /İlk staj ilanını oluştur; başvurular doğrudan paneline düşsün\./);
});

test('hoş geldin e-postası kuyrukta ve anında tetikte; eski onaylar e-postalanmıyor', () => {
  assert.match(goc, /y\.type in \('yeni_basvuru', 'takip_ilan', 'sirket_onaylandi', 'sahiplenme_onaylandi'\)/);
  assert.match(goc, /array\['yeni_basvuru', 'takip_ilan', 'sirket_onaylandi', 'sahiplenme_onaylandi'\]/);
  assert.match(goc, /update public\.notifications\s+set eposta_gonderildi_at = now\(\), eposta_son_hata = 'goc-oncesi'/);
  /* Tercih anahtarı yalnız başvuru ve takip ilanı için. */
  assert.match(goc, /and n\.type in \('yeni_basvuru', 'takip_ilan'\)\s+and exists \(select 1 from public\.bildirim_tercihleri/);
});

test('e-posta: kaçırılmış ad, üç adım, ilk ilan düğmesi; iki gönderici aynı metin', () => {
  const h = govdeKur({ tur: 'sirket_onaylandi', baslik: "StajımVar'a hoş geldin", govde: 'Modilce <b> şirket hesabı açıldı.' });
  assert.equal(h, hosgeldinHtml("StajımVar'a hoş geldin", 'Modilce <b> şirket hesabı açıldı.'));
  assert.match(h, /Modilce &lt;b&gt;/);
  assert.match(h, /href="https:\/\/stajimvar\.com\/sirket\/ilan\/yeni"[^>]*>İlk ilanını oluştur</);
  for (const a of ['İlk staj ilanını oluştur', 'Şirket sayfanı tamamla', 'Ekibini davet et']) assert.ok(h.includes(a), a);
  assert.doesNotMatch(govdeKur({ tur: 'yeni_basvuru', baslik: 'x', hedef: '/sirket/basvuranlar' }), /Başlamak için üç adım/);
  const betik = oku('scripts/bildirim-epostasi.mjs');
  const kenar = oku('supabase/functions/eposta-tetik/index.ts');
  const adimlar = (s) => s.slice(s.indexOf('const HOSGELDIN_ADIMLARI'), s.indexOf('];', s.indexOf('const HOSGELDIN_ADIMLARI')));
  assert.equal(adimlar(betik), adimlar(kenar));
  assert.match(kenar, /HOSGELDIN_TURLERI\.has\(String\(b\.tur\)\) \? hosgeldinHtml\(b\.baslik, b\.govde\)/);
});

test('panel: ilanı olmayan şirkete adıyla karşılama ve üç adım; tek birincil düğme', () => {
  const g = oku('src/sirket/GenelBakis.tsx');
  const bos = g.slice(g.indexOf('if (ilanlar.length === 0) {'), g.indexOf('{siralama}', g.indexOf('if (ilanlar.length === 0) {')));
  assert.match(bos, /StajımVar&apos;a hoş geldiniz\{baglam\.ad \? `, \$\{baglam\.ad\}` : ''\}/);
  assert.match(bos, /bitti: eksikler\.length === 0/);
  assert.equal((bos.match(/className=\{`w-full shrink-0 sm:w-auto \$\{BIRINCIL_DUGME\}`\}/g) ?? []).length, 1);
});
