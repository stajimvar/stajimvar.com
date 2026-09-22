import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  IS ARIYORUM / STAJ ARIYORUM

  Ogrenci profilinde iki acik secim. Acildiginda ogrenci, DOGRULANMIS
  sirketlerin gordugu iki ayri listeye giriyor.

  Buradaki testler urun kararlarini koruyor: varsayilanin kapali olmasi,
  rizanin damgalanmasi, erisimin dogrulanmis sirketle sinirli kalmasi ve
  ne paylasildiginin ekranda yazmasi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const GOC = oku('supabase/migrations/20261103010000_is_staj_arayan.sql');
const KART = oku('src/components/ArayisKartlari.tsx');
const LISTE = oku('src/sirket/SirketAdaylar.tsx');

test('iki alan da VARSAYILAN KAPALI', () => {
  /*
    Butun fikir bu. Mevcut is_open_to_offers alani kayitta varsayilan
    ACIK geliyor: olculdu, 22 ogrencinin 22'si "teklife acik" gorunuyor,
    yani kimse onu bilerek acmadi ve bir riza kaniti degil.
  */
  assert.match(GOC, /is_arayan\s+boolean\s+not null default false/);
  assert.match(GOC, /staj_arayan\s+boolean\s+not null default false/);
});

test('eski alan kaldirilmadi', () => {
  /*
    is_open_to_offers baska yerlerde okunuyor; sessizce anlamini
    degistirmek ya da silmek ona guvenen kodu bozardi.
  */
  assert.ok(!/drop column .*is_open_to_offers/i.test(GOC));
  const q = oku('src/lib/queries/index.ts');
  assert.ok(q.includes("is_open_to_offers"), 'eski alan hala kullaniliyor olmali');
});

test('riza damgasi sunucuda yaziliyor, istemciden gelmiyor', () => {
  assert.match(GOC, /create trigger student_profiles_arayan_damgasi/);
  assert.match(GOC, /new\.is_arayan_at := now\(\)/);
  /* Istemciye yalniz iki boolean sutununda UPDATE izni var. */
  assert.match(GOC, /grant update \(is_arayan, staj_arayan\)/);
  assert.ok(
    !/grant update[^;]*is_arayan_at/.test(GOC),
    'damga sutununa istemci yazamamali: istemciden gelen riza tarihi kanit degil',
  );
});

test('kapatinca damga siliniyor', () => {
  /* Kapali bir satirda eski damganin kalmasi, "hala ariyor" gibi okunurdu. */
  assert.ok(GOC.includes('new.is_arayan_at := null'), 'kapatinca damga silinmeli');
});

test('liste yalniz DOGRULANMIS sirkete acik', () => {
  assert.match(GOC, /sirket_dogrulandi\(cm\.company_id\)/);
  assert.match(GOC, /bu liste yalnizca dogrulanmis sirketlere acik/);
  assert.match(GOC, /revoke all on function public\.arayan_ogrenciler\(text\) from public, anon/i);
});

test('RLS yalniz ARAYAN satirlari aciyor', () => {
  /*
    Politika tum ogrenci profillerini acmiyor: yalniz ogrencinin kendi
    actigi satirlar gorunur ve anahtar kapatilinca satir dusuyor.
  */
  const politika = GOC.slice(GOC.indexOf('create policy "dogrulanmis sirket arayan'));
  assert.match(politika, /\(is_arayan or staj_arayan\)/);
});

test('ne paylasildigi ekranda yaziyor', () => {
  /*
    Urun karari: dugmenin kendisi riza. Bu ancak neyin paylasildigi
    EKRANDA yaziyorsa dogrudur.
  */
  assert.ok(KART.includes('doğruladığı'), 'dogrulanmis sirket vurgusu olmali');
  assert.match(KART, /adın, e-postan/);
  assert.match(KART, /kapattığın anda listeden düşersin/);
});

test('aciklama kapaliyken de gorunuyor', () => {
  /*
    Yalniz acikken yazsaydi, ogrenci ACMADAN once ne olacagini bilemezdi;
    riza ancak bilgilendirilmisse rizadir.
  */
  assert.match(KART, /acikVar \? 'Şu an' : 'Açarsan'/);
});

test('sirket listesi iki ayri liste gosteriyor', () => {
  assert.match(LISTE, /Staj arıyor/);
  assert.match(LISTE, /İş arıyor/);
  /* Riza tarihi sirkete de gosteriliyor. */
  assert.match(LISTE, /beri arıyor/);
});

test('dogrulanmamis sirkete ayri cevap veriliyor', () => {
  /* "Bir sey ters gitti" demek yanlis olurdu: sorun istekte degil yetkide. */
  assert.match(LISTE, /yalnızca StajımVar’ın doğruladığı şirketlere açık/);
});
