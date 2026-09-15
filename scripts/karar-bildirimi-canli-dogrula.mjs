#!/usr/bin/env node
/**
 * KARAR BİLDİRİMİ — CANLI DOĞRULAMA DÜZENEĞİ (GEÇİCİ)
 *
 * NE İÇİN VAR
 * -----------
 * `ilan_karar_bildirimi_*` kuyruğu yerel Postgres'te doğrulandı ama
 * GERÇEK Resend teslimi hiç ölçülmedi. Bu betik canlıda geçici bir test
 * kaydı kurup kuyruğa bir karar bırakıyor, gerçek işçi onu gönderiyor,
 * sonra kayıt siliniyor.
 *
 * BU DOSYA KALICI DEĞİL. Doğrulama bitince hem betik hem onu çağıran
 * iş akışı depodan çıkarılıyor — üretimde duran bir test baypası
 * olmayacak.
 *
 * ALICI ADRESİ LOGLANMIYOR
 * ------------------------
 * Alıcı `ILAN_BILDIRIM_ALICI` sırrından geliyor (yetkili iç test
 * adresi). Değeri hiçbir yere yazılmıyor; yalnız "tanımlı mı" ve
 * karakter sayısı raporlanıyor.
 *
 * GERÇEK ÇÖZÜM YOLU KULLANILIYOR
 * ------------------------------
 * İşçi alıcıyı `company_members` → `profiles.email` üzerinden buluyor.
 * Düzenek tam bu zinciri kuruyor: test şirketi + `is_owner` üye +
 * o üyenin profilindeki e-posta. İşçiye özel bir "test alıcısı" dalı
 * EKLENMEDİ; ölçülen şey üretimdeki kod yolunun kendisi.
 *
 * AUTH KULLANICISI AYRI BİR ADRESLE AÇILIYOR
 * ------------------------------------------
 * `profiles.id` → `auth.users(id)` olduğu için bir auth kaydı şart.
 * Auth kaydı `@stajimvar.test` (yönlendirilmeyen alan adı) ile açılıyor,
 * `profiles.email` sonra test adresine çekiliyor. Sebep: yetkili test
 * adresi zaten kayıtlı bir kullanıcı olabilir ve BAŞKASININ auth kaydını
 * oluşturup silmek istemiyoruz. Silinen tek şey bu betiğin açtığı kayıt.
 *
 * KARAR NEDEN `reddet`
 * --------------------
 * Ret ilanı `draft` bırakıyor: test ilanı hiçbir aşamada yayında
 * görünmüyor. Üstelik ret notu e-posta gövdesindeki `review_note`
 * dalını da ölçüyor.
 */

const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALICI = process.env.ILAN_BILDIRIM_ALICI;

/** Bu koşuya ait kayıtları tek bir damgayla işaretliyoruz. */
const DAMGA = process.env.DOGRULAMA_DAMGASI || 'karar-bildirimi-dogrulama';
const ETIKET = `[TEST] ${DAMGA}`;

const komut = process.argv[2];

function zorunlu() {
  const e = [];
  if (!ADRES) e.push('SUPABASE_URL');
  if (!ANAHTAR) e.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!ALICI) e.push('ILAN_BILDIRIM_ALICI');
  if (e.length) {
    console.error(`::error::Ortam değişkenleri eksik: ${e.join(', ')}`);
    process.exit(1);
  }
}

const baslik = {
  apikey: ANAHTAR,
  Authorization: `Bearer ${ANAHTAR}`,
  'content-type': 'application/json',
};

async function rest(yol, secenek = {}) {
  const y = await fetch(`${ADRES}/rest/v1/${yol}`, {
    ...secenek,
    headers: { ...baslik, Prefer: 'return=representation', ...(secenek.headers || {}) },
  });
  const metin = await y.text();
  if (!y.ok) throw new Error(`REST ${yol}: HTTP ${y.status} ${metin.slice(0, 300)}`);
  return metin ? JSON.parse(metin) : null;
}

async function auth(yol, secenek = {}) {
  const y = await fetch(`${ADRES}/auth/v1/${yol}`, { ...secenek, headers: baslik });
  const metin = await y.text();
  if (!y.ok) throw new Error(`AUTH ${yol}: HTTP ${y.status} ${metin.slice(0, 300)}`);
  return metin ? JSON.parse(metin) : null;
}

/* ------------------------------------------------------------- KURULUM */

async function kur() {
  const damga = Date.now();
  const testEposta = `karar-dogrulama-${damga}@stajimvar.test`;

  /*
    `email_confirm: true`: doğrulama e-postası GÖNDERİLMİYOR. Zaten
    adres yönlendirilmeyen bir alan adında, ama yine de posta denemesi
    tetiklenmesin.
  */
  const kullanici = await auth('admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: testEposta,
      email_confirm: true,
      user_metadata: { full_name: ETIKET, role: 'company' },
    }),
  });
  console.log(`kullanici_id=${kullanici.id}`);

  /*
    Profil `handle_new_user` tetikleyicisiyle otomatik oluştu. E-postasını
    yetkili test adresine çekiyoruz: işçinin okuduğu alan tam burası.
  */
  await rest(`profiles?id=eq.${kullanici.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ email: ALICI, full_name: ETIKET }),
  });

  const [sirket] = await rest('companies', {
    method: 'POST',
    body: JSON.stringify({
      name: `${ETIKET} Sirketi`,
      slug: `test-karar-bildirimi-${damga}`,
      verified: false,
      description: 'Gecici dogrulama kaydi. Otomatik silinir.',
    }),
  });
  console.log(`sirket_id=${sirket.id}`);

  await rest('company_members', {
    method: 'POST',
    body: JSON.stringify({
      company_id: sirket.id,
      user_id: kullanici.id,
      is_owner: true,
      recruiter_role: 'Owner',
    }),
  });

  /* Taslak: test ilanı hiçbir zaman yayında görünmüyor. */
  const [ilan] = await rest('listings', {
    method: 'POST',
    body: JSON.stringify({
      company_id: sirket.id,
      title: `${ETIKET} ilani`,
      status: 'draft',
      description: 'Gecici dogrulama kaydi. Otomatik silinir.',
    }),
  });
  console.log(`ilan_id=${ilan.id}`);

  /*
    KUYRUĞA KARAR BIRAKILIYOR

    `ilan_incele` RPC'si `is_admin()` istiyor ve `service_role`'ün
    `auth.uid()`'i yok — o yüzden RPC buradan çağrılamıyor. Yazılan
    kolon durumu RPC'nin yazdığının BİREBİR aynısı; RPC'nin kendi
    davranışı (karar + kuyruk sıfırlama aynı işlemde) CI'daki RLS
    regresyon testinde gerçek rollerle ölçülüyor
    ("Onaylanan ilan karar bildirim kuyruguna girdi").
  */
  await rest(`listings?id=eq.${ilan.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      review_note: `${ETIKET}: gercek Resend teslimi olculuyor.`,
      reviewed_at: new Date().toISOString(),
      karar_bildirim_at: null,
      karar_bildirim_denemeleri: 0,
      karar_bildirim_sonraki_at: new Date().toISOString(),
      karar_bildirim_son_hata: null,
    }),
  });

  console.log(`Alıcı sırrı tanımlı (${ALICI.length} karakter, değer loglanmadı).`);
  console.log('Kurulum tamam: 1 karar kuyruğa bırakıldı (status=draft).');
}

/* -------------------------------------------------------------- DURUM */

async function durum() {
  const ilanlar = await rest(
    `listings?title=like.${encodeURIComponent('%' + DAMGA + '%')}` +
      '&select=id,status,karar_bildirim_at,karar_bildirim_denemeleri,karar_bildirim_son_hata'
  );
  console.log(`Test ilanı sayısı: ${ilanlar.length}`);
  for (const i of ilanlar) {
    console.log(
      `  ${i.id} status=${i.status} ` +
        `bildirildi=${i.karar_bildirim_at ? 'EVET' : 'hayir'} ` +
        `deneme=${i.karar_bildirim_denemeleri} ` +
        `hata=${i.karar_bildirim_son_hata ?? '-'}`
    );
  }
  /* Gerçek şirketlerden hiçbiri kuyrukta olmamalı. */
  const bekleyen = await rest(
    'listings?karar_bildirim_at=is.null&reviewed_at=not.is.null&select=id,title'
  );
  console.log(`Kuyrukta bekleyen TÜM kayıt sayısı: ${bekleyen.length}`);
}

/* ----------------------------------------------------------- TEMİZLİK */

async function temizle() {
  const ilanlar = await rest(
    `listings?title=like.${encodeURIComponent('%' + DAMGA + '%')}&select=id,company_id`
  );
  for (const i of ilanlar) {
    await rest(`listings?id=eq.${i.id}`, { method: 'DELETE' });
    console.log(`  ilan silindi ${i.id}`);
  }

  const sirketler = await rest(
    `companies?slug=like.${encodeURIComponent('test-karar-bildirimi-%')}&select=id`
  );
  for (const s of sirketler) {
    await rest(`company_members?company_id=eq.${s.id}`, { method: 'DELETE' });
    await rest(`companies?id=eq.${s.id}`, { method: 'DELETE' });
    console.log(`  sirket silindi ${s.id}`);
  }

  /*
    Auth kaydı en son: silinmesi profili de (cascade) götürüyor.
    Yalnız bu düzeneğin açtığı `@stajimvar.test` adresleri siliniyor.
  */
  const liste = await auth('admin/users?per_page=200');
  const bizimkiler = (liste.users || []).filter((u) =>
    String(u.email || '').endsWith('@stajimvar.test')
  );
  for (const u of bizimkiler) {
    await auth(`admin/users/${u.id}`, { method: 'DELETE' });
    console.log(`  auth kullanicisi silindi ${u.id}`);
  }

  console.log(
    `Temizlik: ${ilanlar.length} ilan, ${sirketler.length} sirket, ${bizimkiler.length} auth kaydi silindi.`
  );
}

zorunlu();

const isler = { kur, durum, temizle };
if (!isler[komut]) {
  console.error('Kullanım: karar-bildirimi-canli-dogrula.mjs <kur|durum|temizle>');
  process.exit(1);
}
isler[komut]().catch((hata) => {
  console.error(`::error::${komut}: ${hata.message}`);
  process.exit(1);
});
