#!/usr/bin/env node
/**
 * ESKİ PROFİL FOTOĞRAFLARINI SOSYAL PROFİLE TAŞI
 *
 * NEDEN VAR
 * ---------
 * Fotoğraf iki ayrı yerde tutulabiliyordu:
 *
 *   · `profiles.avatar_url`        — eski kamera düğmesinin yazdığı yer;
 *                                    herkese açık `avatars` kovasında
 *   · `social_profiles.avatar_path` — sosyal profilin düzenleme
 *                                    ekranının yazdığı yer; `sosyal-avatar`
 *                                    kovasında
 *
 * Karar tek kaynaktı (`lib/profil-fotografi`): yükleme yalnız sosyal
 * bloktan yapılıyor ve gösterim `avatar_path`ten okunuyor. Ama eski
 * yoldan yüklenmiş fotoğraflar taşınmadı. Sonuç: kişi kendi `/cv`
 * ekranında fotoğrafını görüyor (orası `avatar_url` okuyor), ziyaretçi
 * ise baş harfleri görüyor — çünkü `avatar_path` boş ve `profiles`
 * tablosu RLS gereği başkasının satırını okutmuyor.
 *
 * Ölçüldü (13 Eylül 2026): 17 sosyal profilden 16'sında `avatar_path`
 * boş; bunların 2'sinde `profiles.avatar_url` dolu, yani taşınabilir.
 *
 * NE YAPIYOR
 * ----------
 * Dosyayı açık adresten indirip `sosyal-avatar` kovasına kişinin kendi
 * klasörüne yüklüyor ve `avatar_path`i yazıyor. Kaynak satıra
 * DOKUNMUYOR: `profiles.avatar_url` olduğu gibi kalıyor, yani taşıma
 * geri alınabilir ve kişinin kendi ekranı hiç etkilenmiyor.
 *
 * TEKRAR ÇALIŞTIRILABİLİR: `avatar_path` dolu olan satır atlanıyor.
 * Yükleme başarılı olup veritabanı yazması başarısız olursa yüklenen
 * dosya siliniyor — yetim dosya bırakmıyor (sosyal.ts'teki yükleme
 * akışının aynı kalıbı).
 *
 * KULLANIM
 *   node scripts/sosyal-avatar-tasi.mjs          # rapor, yazma yok
 *   node scripts/sosyal-avatar-tasi.mjs --yaz
 *   node scripts/sosyal-avatar-tasi.mjs --kullanici=mustafaogulcandogan
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const KOVA = 'sosyal-avatar';
/* Yükleme ekranının kabul ettiği türler; başkası taşınmıyor. */
const TURLER = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function ortamOku() {
  const birlesik = {};
  for (const dosya of ['.env', 'automation/.env']) {
    const yol = path.resolve(process.cwd(), dosya);
    if (!fs.existsSync(yol)) continue;
    for (const satir of fs.readFileSync(yol, 'utf8').split(/\r?\n/)) {
      if (!satir.includes('=') || satir.trimStart().startsWith('#')) continue;
      const i = satir.indexOf('=');
      birlesik[satir.slice(0, i).trim()] = satir.slice(i + 1).trim().replace(/^"|"$/g, '');
    }
  }
  return birlesik;
}

/** Taşınacak satırları bulur: `avatar_path` boş, `avatar_url` dolu. */
export function tasinacaklar(sosyalSatirlar, profilSatirlar) {
  const harita = new Map((profilSatirlar ?? []).map((x) => [x.id, x.avatar_url]));
  return (sosyalSatirlar ?? [])
    .filter((x) => !x.avatar_path && harita.get(x.profile_id))
    .map((x) => ({
      profileId: x.profile_id,
      kullaniciAdi: x.username,
      yayinda: Boolean(x.yayinda_mi),
      kaynak: harita.get(x.profile_id),
    }));
}

async function main() {
  const argv = process.argv.slice(2);
  const yaz = argv.includes('--yaz');
  const tekKullanici = argv.find((a) => a.startsWith('--kullanici='))?.split('=')[1];

  const ortam = { ...ortamOku(), ...process.env };
  const url = ortam.SUPABASE_URL || ortam.VITE_SUPABASE_URL;
  const anahtar = ortam.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anahtar) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (automation/.env).');
    process.exit(1);
  }
  const bas = { apikey: anahtar, Authorization: `Bearer ${anahtar}` };

  const sosyal = await (
    await fetch(`${url}/rest/v1/social_profiles?select=profile_id,username,avatar_path,yayinda_mi&limit=5000`, {
      headers: bas,
    })
  ).json();
  const profiller = await (
    await fetch(`${url}/rest/v1/profiles?select=id,avatar_url&limit=20000`, { headers: bas })
  ).json();

  let liste = tasinacaklar(sosyal, profiller);
  if (tekKullanici) liste = liste.filter((x) => x.kullaniciAdi === tekKullanici);

  console.log(`sosyal profil: ${sosyal.length} · taşınacak: ${liste.length} · yazma: ${yaz ? 'AÇIK' : 'kapalı'}\n`);
  if (!liste.length) return;

  let tasinan = 0;
  for (const kisi of liste) {
    const etiket = `@${kisi.kullaniciAdi}${kisi.yayinda ? '' : ' (yayında değil)'}`;

    const r = await fetch(kisi.kaynak);
    if (!r.ok) {
      console.log(`  ATLANDI  ${etiket} — kaynak inmedi (HTTP ${r.status})`);
      continue;
    }
    const tur = (r.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const uzanti = TURLER[tur];
    if (!uzanti) {
      console.log(`  ATLANDI  ${etiket} — desteklenmeyen tür (${tur || 'bilinmiyor'})`);
      continue;
    }
    const veri = Buffer.from(await r.arrayBuffer());
    const yeniYol = `${kisi.profileId}/${crypto.randomUUID()}.${uzanti}`;

    if (!yaz) {
      console.log(`  taşınacak ${etiket} — ${(veri.length / 1024).toFixed(0)} KB ${tur} → ${yeniYol}`);
      continue;
    }

    const yukleme = await fetch(`${url}/storage/v1/object/${KOVA}/${yeniYol}`, {
      method: 'POST',
      headers: { ...bas, 'Content-Type': tur, 'x-upsert': 'false' },
      body: veri,
    });
    if (!yukleme.ok) {
      console.log(`  HATA     ${etiket} — yüklenemedi ${yukleme.status}: ${(await yukleme.text()).slice(0, 120)}`);
      continue;
    }

    const yazma = await fetch(`${url}/rest/v1/social_profiles?profile_id=eq.${kisi.profileId}`, {
      method: 'PATCH',
      headers: { ...bas, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ avatar_path: yeniYol }),
    });
    if (!yazma.ok) {
      /* Yetim dosya bırakmıyoruz: yükleme geri alınıyor. */
      await fetch(`${url}/storage/v1/object/${KOVA}/${yeniYol}`, { method: 'DELETE', headers: bas });
      console.log(`  HATA     ${etiket} — satır yazılamadı ${yazma.status}, yüklenen dosya silindi`);
      continue;
    }

    tasinan += 1;
    console.log(`  TAŞINDI  ${etiket} → ${yeniYol}`);
  }

  console.log(`\ntaşınan: ${tasinan} / ${liste.length}`);
  if (yaz) {
    console.log('kaynak satıra dokunulmadı: profiles.avatar_url olduğu gibi duruyor.');
  }
}

if (process.argv[1] && process.argv[1].endsWith('sosyal-avatar-tasi.mjs')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
