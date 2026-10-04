import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  basvuruGorseli,
  guvenliAdayFotografi,
  guvenliLogoAdresi,
} from '../src/lib/bildirim-basvurusu.mjs';

/*
  BAŞVURU BİLDİRİMİNİN GÖRSELİ — gizlilik kuralı

  Öğrenci: şirket logosu. İşveren "Yeni başvuru": aday fotoğrafı yalnız
  başvuru kapsamında paylaşılmışsa (rıza + internal + doğrulanmış şirket)
  ve adres bizim avatar kovamızdansa.
*/

const DEPO = 'https://ornekproje.supabase.co';
const FOTO = `${DEPO}/storage/v1/object/public/avatars/kullanici/a.jpg`;

const satir = (fark = {}) => ({
  yontem: 'internal',
  rizaTarihi: '2026-10-01T10:00:00Z',
  adayAdi: 'Örnek Aday',
  adayFotografi: FOTO,
  ilan: { baslik: 'Yazılım Stajyeri', sirket: { ad: 'Örnek AŞ', logo: '/isveren-logolari/ornek.svg', dogrulanmis: true } },
  ...fark,
});

test('öğrencinin başvuru durumu bildiriminde şirket adı, logo ve ilan adı', () => {
  for (const tur of ['inceleniyor', 'degerlendirme', 'gorusme_daveti', 'gorusme_guncellendi', 'teklif', 'olumsuz']) {
    assert.deepEqual(basvuruGorseli(tur, satir(), DEPO), {
      tip: 'sirket', sirketAdi: 'Örnek AŞ', logo: '/isveren-logolari/ornek.svg', ilanAdi: 'Yazılım Stajyeri',
    }, tur);
  }
});

test('logo yoksa ya da güvensizse null — simgeye dönülür', () => {
  const logosuz = satir({ ilan: { baslik: 'X', sirket: { ad: 'A', logo: null, dogrulanmis: true } } });
  assert.equal(basvuruGorseli('inceleniyor', logosuz, DEPO).logo, null);
  for (const kotu of ['javascript:alert(1)', '//kotu.example/x.png', 'http://kotu.example/x.png', 'data:image/png;base64,AA', ' ']) {
    assert.equal(guvenliLogoAdresi(kotu), null, kotu);
  }
  assert.equal(guvenliLogoAdresi('https://cdn.example.com/l.png'), 'https://cdn.example.com/l.png');
});

test('işveren yeni başvuru: rıza + internal + doğrulanmış şirket → aday adı ve fotoğrafı', () => {
  assert.deepEqual(basvuruGorseli('yeni_basvuru', satir(), DEPO), {
    tip: 'aday', adayAdi: 'Örnek Aday', foto: FOTO, ilanAdi: 'Yazılım Stajyeri',
  });
});

test('paylaşım koşulu sağlanmazsa aday görseli YOK', () => {
  assert.equal(basvuruGorseli('yeni_basvuru', satir({ rizaTarihi: null }), DEPO), null, 'rıza yok');
  assert.equal(basvuruGorseli('yeni_basvuru', satir({ yontem: 'external' }), DEPO), null, 'dış başvuru');
  const dogrulanmamis = satir({ ilan: { baslik: 'X', sirket: { ad: 'A', logo: null, dogrulanmis: false } } });
  assert.equal(basvuruGorseli('yeni_basvuru', dogrulanmamis, DEPO), null, 'doğrulanmamış şirket: kimlik gizli');
  assert.equal(basvuruGorseli('yeni_basvuru', null, DEPO), null, 'RLS satır vermedi');
});

test('aday fotoğrafı yalnız kendi avatar kovamızdan', () => {
  assert.equal(guvenliAdayFotografi(FOTO, DEPO), FOTO);
  for (const kotu of [
    'https://iz-suren.example/piksel.gif',
    `${DEPO}/storage/v1/object/sign/avatars/a.jpg?token=x`,
    `${DEPO}/storage/v1/object/public/post-media/a.jpg`,
    `${DEPO}/storage/v1/object/public/avatars/../cv/a.pdf`,
    FOTO.replace('https:', 'http:'),
    'javascript:alert(1)',
  ]) {
    assert.equal(guvenliAdayFotografi(kotu, DEPO), null, kotu);
  }
  assert.equal(guvenliAdayFotografi(FOTO, null), null, 'depo adresi bilinmiyorsa gösterilmez');
  const g = basvuruGorseli('yeni_basvuru', satir({ adayFotografi: 'https://iz-suren.example/p.gif' }), DEPO);
  assert.equal(g.foto, null, 'güvensiz adres: ad kalır, fotoğraf simgeye döner');
  assert.equal(g.adayAdi, 'Örnek Aday');
});

test('öteki bildirim türleri bu modülden görsel almıyor', () => {
  for (const tur of ['teklif_kabul', 'teklif_ret', 'geri_cekildi', 'gorusme_kabul', 'gorusme_ret', 'baglanti_istegi', 'paylasim_begeni']) {
    assert.equal(basvuruGorseli(tur, satir(), DEPO), null, tur);
  }
});

test('sorgu kopyanın tamamını değil yalnız ad ve fotoğrafı çekiyor', async () => {
  const kaynak = await readFile(new URL('../src/lib/bildirim.ts', import.meta.url), 'utf8');
  const blok = kaynak.slice(kaynak.indexOf('export async function bildirimBasvurulariniGetir'));
  const secim = blok.slice(0, blok.indexOf('.in('));
  assert.match(secim, /profile_snapshot->>ad/);
  assert.match(secim, /profile_snapshot->>fotoUrl/);
  assert.ok(!/profile_snapshot\s*,|profile_snapshot'\s*\)|'profile_snapshot\b(?!->>)/.test(secim), 'kopyanın tamamı çekilmemeli');
  assert.ok(!/student_profiles|social_profiles|profiles\b/.test(secim), 'profil tablosu sorgulanmamalı');
});
