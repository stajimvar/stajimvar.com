import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { govdeKur, guvenliBaglanti, konuKur } from '../scripts/bildirim-epostasi.mjs';

/* YENİ BAŞVURU ŞİRKETE E-POSTAYLA (9 Kasım 2026, kullanıcı: "önerilerini yap"). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const GOC = oku('supabase/migrations/20261230010000_bildirim_epostasi.sql').replace(/\/\*[\s\S]*?\*\//g, '');

test('kuyruk yalnız yeni başvuruyu ve yalnız doğrulanmış e-postaya alıyor; geçmiş gönderilmiş sayılıyor', () => {
  assert.match(GOC, /n\.type = any \(array\['yeni_basvuru'\]\)/);
  assert.match(GOC, /u\.id = n\.recipient_id and u\.email_confirmed_at is not null/);
  assert.match(GOC, /set eposta_gonderildi_at = coalesce\(eposta_gonderildi_at, now\(\)\)\s*where eposta_gonderildi_at is null;/);
  assert.match(GOC, /for update skip locked/);
  assert.match(GOC, /grant execute on function public\.bildirim_eposta_kuyruktan_al\(integer, integer\) to service_role;/);
  assert.doesNotMatch(GOC, /grant (update|insert)[^;]*notifications/i);
});

test('e-posta: metin kaçırılıyor, bağlantı yalnız site içi, aday bilgisi yok', () => {
  assert.equal(guvenliBaglanti('/sirket/basvuranlar?aday=1'), 'https://stajimvar.com/sirket/basvuranlar?aday=1');
  assert.equal(guvenliBaglanti('https://kotu.example'), 'https://stajimvar.com/');
  assert.equal(guvenliBaglanti('//kotu.example'), 'https://stajimvar.com/');
  const g = govdeKur({ baslik: 'Yeni başvuru', govde: '<img src=x>', hedef: '/sirket/basvuranlar' });
  assert.ok(g.includes('&lt;img src=x&gt;'));
  assert.ok(g.includes('Aday bilgileri yalnız şirket panelinde görünür'));
  assert.doesNotMatch(konuKur({ baslik: 'a\nb' }), /\n/);
});

test('iş akışı: aynı 10 dakikalık işin ikinci adımı', () => {
  assert.match(oku('.github/workflows/sirket-talebi-epostasi.yml'), /run: node scripts\/bildirim-epostasi\.mjs/);
});
