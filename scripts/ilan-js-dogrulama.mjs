#!/usr/bin/env node
/**
 * BELİRSİZ İLANLAR İÇİN İKİNCİ AŞAMA — SAYFAYI GERÇEKTEN ÇİZEREK
 *
 * NEDEN VAR — ÖLÇÜLDÜ
 * -------------------
 * `ilan-baglanti-kontrol.mjs` ham HTML okuyor ve ilanın hâlâ orada
 * olduğuna dair kanıt (JobPosting şeması, kanonik adres, <h1>)
 * bulamazsa `belirsiz` yazıp kayda DOKUNMUYOR. Doğru davranış: kanıtsız
 * kapatmak, açık bir ilanı listeden silmek demekti.
 *
 * Ama 20 Eylül 2026'da ölçtüm: 55 aktif belirsiz kaydın 55'i de HTTP
 * 200 dönüyor, hiçbiri ulaşılamaz değil. Ham HTML'de iş içeriği YOK:
 *
 *   Fater (Oracle HCM)        9 KB HTML →  1 kelime görünür metin
 *   Rolls-Royce (Workday)   6.5 KB HTML →  1 kelime
 *   Dior (özel SPA)          11 KB HTML → 14 kelime
 *   Eczacıbaşı (SuccessF.)   31 KB HTML → 69 kelime, <h1> yok
 *
 * Yani `belirsiz` etiketi ilanın DURUMUNU değil, sayfanın JavaScript
 * ile çizilmesini ölçüyordu. Modern ATS'lerin tamamı böyle.
 *
 * Aynı sayfaları headless tarayıcıyla çizince üç AYRI gerçek çıktı:
 *
 *   Fater        → 694 kelime, h1 "Sales Internship"  → ilan AÇIK
 *   Eczacıbaşı   → "Şu anda mevcut olan…"             → ilan KALDIRILMIŞ
 *   Dior         → "Page unavailable" + Reference ID  → BOT ENGELİ
 *
 * Bu betik o ayrımı yapıyor. Üçü de farklı sonuç doğuruyor ve ikisi
 * asla kapatma üretmiyor.
 *
 * NE DEĞİŞMİYOR
 * -------------
 * · Birinci aşama aynen duruyor; bu betik YALNIZ onun `belirsiz`
 *   bıraktığı kayıtlara bakıyor. Bütün ilanları yeniden çizmek pahalı
 *   ve gereksiz: ham HTML'de kanıt bulunan ilan zaten karara bağlandı.
 * · Yeni cron YOK. Aynı iş akışının (`ilan-baglanti-kontrolu.yml`)
 *   içinde, birinci aşamadan sonra koşuyor.
 * · Kapatma kuralı GEVŞEMİYOR: yalnız sayfanın kendi "bu ilan artık
 *   yok" ifadesi kapatıyor. Bot engeli ve boş sayfa kapatmıyor.
 *
 * Kullanım:
 *   node scripts/ilan-js-dogrulama.mjs          # kontrol et ve yaz
 *   node scripts/ilan-js-dogrulama.mjs --kuru   # yalnızca rapor
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const KOK = path.resolve(import.meta.dirname, '..');

function ortamOku() {
  const yol = path.join(KOK, 'automation', '.env');
  if (!fs.existsSync(yol)) return {};
  const cikti = {};
  for (const satir of fs.readFileSync(yol, 'utf8').split(/\r?\n/)) {
    const m = satir.match(/^([A-Z_]+)=(.*)$/);
    if (m) cikti[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return cikti;
}

const ortam = { ...ortamOku(), ...process.env };
const kuru = process.argv.includes('--kuru');

/*
  BOT ENGELİ İFADELERİ

  Engellenmek ilanın kapandığı anlamına GELMİYOR; tam tersine sayfayı
  hiç göremediğimiz anlamına geliyor. Ölçülen gerçek örnek: Dior
  "Page unavailable · Reference ID: … · Your IP: …" döndürüyor ve bu
  bir Akamai/CDN engeli.
*/
export const ENGEL_IZI =
  /page unavailable|access denied|reference id:|request blocked|are you a human|verify you are human|cf-error|cloudflare|captcha|unusual traffic/i;

/*
  İLAN ARTIK YOK — SAYFANIN KENDİ İFADESİ

  Dar tutuldu. "ilan" ya da "pozisyon" kelimesi her kariyer sayfasında
  geçiyor; aranan şey ilanın BULUNAMADIĞINI söyleyen cümle.
*/
export const YOK_IZI =
  /(bu )?(ilan|pozisyon|iş ilanı)( art[ıi]k)? (yay[ıi]nda de[ğg]il|bulunamad|kald[ıi]r[ıi]lm|mevcut de[ğg]il)|[şs]u anda mevcut olan (ilan|pozisyon|iş)? ?(yok|bulunmamaktad[ıi]r)|no longer (available|accepting|open)|position (has been )?(filled|closed)|job (is )?(no longer|not) (available|found)|this (job|position|posting) (is )?(closed|expired|no longer)|applications? (are )?closed|posting (has )?expired|we can'?t find that job/i;

/** Sayfa bize gerçekten bir ilan gösterdi mi? */
export function karar(metin, baslik) {
  const t = String(metin ?? '');
  /*
    ENGEL ÖNCE BAKILIYOR

    Engel sayfası kısa oluyor ve içinde ilan kelimesi hiç geçmiyor;
    sıra tersine olsaydı "kanıt yok" diye okunup sessizce belirsiz
    kalırdı. Engel ayrı bir bilgi: bir sonraki koşuda öne alınmalı.
  */
  if (ENGEL_IZI.test(t)) return { sonuc: 'engel', sebep: 'bot engeli' };
  if (YOK_IZI.test(t)) {
    const m = t.match(YOK_IZI);
    return { sonuc: 'kapali', sebep: `sayfa metni: "${String(m[0]).slice(0, 60)}"` };
  }
  /*
    AÇIK KANITI: sayfa çizildikten sonra ilanın başlığındaki ayırt
    edici kelimeler GÖRÜNÜR METİNDE geçiyor ve sayfa gerçekten dolu.

    Tek başına "uzun metin" yetmiyor: genel kariyer listesi de uzun.
    Başlık eşleşmesi sayfanın O ilanı gösterdiğini söylüyor.
  */
  const kelimeler = String(baslik ?? '')
    .toLowerCase()
    .split(/[^a-zçğıöşü0-9]+/i)
    .filter((k) => k.length > 4);
  const kucuk = t.toLowerCase();
  const eslesen = kelimeler.filter((k) => kucuk.includes(k)).length;
  const yeterliMetin = t.split(/\s+/).filter(Boolean).length >= 120;
  if (yeterliMetin && kelimeler.length > 0 && eslesen / kelimeler.length >= 0.5) {
    return { sonuc: 'acik', sebep: 'çizilen sayfada ilan başlığı ve dolu içerik' };
  }
  return { sonuc: 'belirsiz', sebep: 'çizildi ama kanıt yok' };
}

async function main() {
  const ADRES = ortam.SUPABASE_URL;
  const ANAHTAR = ortam.SUPABASE_SERVICE_ROLE_KEY;
  if (!kuru && (!ADRES || !ANAHTAR)) {
    console.error('::error::SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
    process.exitCode = 1;
    return;
  }
  const db = ADRES && ANAHTAR ? createClient(ADRES, ANAHTAR, { auth: { persistSession: false } }) : null;
  if (!db) {
    console.log('Anahtar yok: hiçbir şey yapılmadı.');
    return;
  }

  const { data: ilanlar, error } = await db
    .from('listings')
    .select('id, title, apply_url, source_url, status, consecutive_failures')
    .eq('source_status', 'belirsiz')
    .in('status', ['published', 'draft'])
    /* En uzun süredir bakılmamış olan başta. */
    .order('source_checked_at', { ascending: true, nullsFirst: true });
  if (error) {
    console.error('::error::İlanlar okunamadı:', error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`${ilanlar.length} belirsiz ilan çizilerek doğrulanacak.`);
  if (ilanlar.length === 0) return;

  /*
    PLAYWRIGHT TEMBEL YÜKLENİYOR

    Depoda zaten var (`@playwright/test`, e2e testleri kullanıyor) ama
    modül düzeyinde içe aktarmak, tarayıcı kurulu değilken bu betiği
    içe aktaran her testi de kırardı.
  */
  const { chromium } = await import('@playwright/test');
  const tarayici = await chromium.launch();
  const baglam = await tarayici.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
    locale: 'tr-TR',
  });

  const sayac = { acik: 0, kapali: 0, engel: 0, belirsiz: 0, hata: 0 };
  const simdi = new Date().toISOString();
  /* Aynı alan adına art arda gitmemek için; birinci aşamayla aynı gerekçe. */
  const alanSon = new Map();
  const alanKoku = (a) => {
    try {
      return new URL(a).hostname.toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.');
    } catch {
      return '';
    }
  };

  for (const ilan of ilanlar) {
    const adres = ilan.apply_url || ilan.source_url;
    if (!adres) continue;
    const kok = alanKoku(adres);
    const bekle = (alanSon.get(kok) ?? 0) + 2000 - Date.now();
    if (bekle > 0) await new Promise((c) => setTimeout(c, bekle));
    alanSon.set(kok, Date.now());

    const sayfa = await baglam.newPage();
    let guncelleme = null;
    let etiket = '';
    try {
      await sayfa.goto(adres, { waitUntil: 'networkidle', timeout: 30000 });
      const metin = await sayfa.evaluate(() =>
        document.body ? document.body.innerText.replace(/\s+/g, ' ').trim() : ''
      );
      const k = karar(metin, ilan.title);
      etiket = `${k.sonuc.padEnd(9)} ${k.sebep}`;

      if (k.sonuc === 'acik') {
        sayac.acik++;
        guncelleme = {
          source_checked_at: simdi,
          source_verified_at: simdi,
          source_status: 'acik',
          consecutive_failures: 0,
          closure_reason: null,
          closed_at: null,
          final_checked_url: sayfa.url(),
        };
        /* Kapanmış sayılıp kapatılmış bir ilan kanıtla geri açılıyor. */
        if (ilan.status === 'closed') guncelleme.status = 'published';
      } else if (k.sonuc === 'kapali') {
        sayac.kapali++;
        guncelleme = {
          source_checked_at: simdi,
          source_status: 'kapali',
          status: 'closed',
          closure_reason: k.sebep,
          closed_at: simdi,
          consecutive_failures: 0,
          final_checked_url: sayfa.url(),
          deactivation_reason: `başvuru bağlantısı kapandı — ${k.sebep}`,
        };
      } else if (k.sonuc === 'engel') {
        /*
          ENGEL KAPATMIYOR

          Sayfayı göremedik; ilan hakkında hiçbir şey öğrenmedik.
          `erisilemedi` ve sayaç artıyor ki bir sonraki koşuda öne
          gelsin.
        */
        sayac.engel++;
        guncelleme = {
          source_checked_at: simdi,
          source_status: 'erisilemedi',
          consecutive_failures: (ilan.consecutive_failures ?? 0) + 1,
          final_checked_url: sayfa.url(),
        };
      } else {
        sayac.belirsiz++;
        guncelleme = { source_checked_at: simdi, final_checked_url: sayfa.url() };
      }
    } catch (hata) {
      sayac.hata++;
      etiket = `hata      ${String(hata?.message ?? hata).slice(0, 50)}`;
      /* Çizim hatası da geçici: ilana dokunulmuyor, sayaç artıyor. */
      guncelleme = {
        source_checked_at: simdi,
        source_status: 'erisilemedi',
        consecutive_failures: (ilan.consecutive_failures ?? 0) + 1,
      };
    } finally {
      await sayfa.close();
    }

    console.log(`  ${etiket.padEnd(58)} ${ilan.title.slice(0, 40)}`);
    if (guncelleme && !kuru) {
      const { error: yazmaHatasi } = await db.from('listings').update(guncelleme).eq('id', ilan.id);
      if (yazmaHatasi) console.error(`  ::warning::yazılamadı ${ilan.id}: ${yazmaHatasi.message}`);
    }
  }

  await tarayici.close();
  console.log(
    `\nçizerek doğrulama: acik=${sayac.acik} kapali=${sayac.kapali} ` +
      `engel=${sayac.engel} belirsiz=${sayac.belirsiz} hata=${sayac.hata}`
  );
  if (kuru) console.log('kuru koşu: hiçbir şey yazılmadı.');
}

const girisNoktasi =
  Boolean(process.argv[1]) &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;

if (girisNoktasi) {
  await main().catch((hata) => {
    console.error(`::error::Çizerek doğrulama: ${hata.message}`);
    process.exitCode = 1;
  });
}
