#!/usr/bin/env node
/**
 * İŞVEREN KARİYER SAYFALARINI KONTROL EDER — SONUÇ VERİTABANINA
 *
 * `scripts/isveren-baglanti-kontrol.mjs` yerini alıyor. O betik çıktısını
 * DOĞRUDAN `src/data/stajProgramlari.ts` içine yazıyordu; yani her günlük
 * ölçüm editoryal kaynak dosyayı değiştiriyor, insan yazısıyla makine
 * çıktısı aynı diff'e giriyor ve bir ölçüm sonucu commit gerektiriyordu.
 * Ayrıca tek bir tarih alanı vardı: "denedik" ile "başarılı oldu"
 * ayrılamıyor, hata nedeni saklanmıyor ve program durumu için yer yoktu.
 *
 * İKİ AYRI DURUM ÖLÇÜLÜYOR
 * ------------------------
 * BAĞLANTI: calisiyor / gecici_hata / bozuk
 * PROGRAM : acik / kapali / bilinmiyor
 *
 * HTTP 200 AÇIK PROGRAM KANITI DEĞİL. `acik` yalnız sayfada staj
 * programı VE aktif bir başvuru yolu bulunduğunda yazılıyor.
 *
 * GEÇİCİ HATA PROGRAM DURUMUNU BOZMUYOR: 403/429/5xx/zaman aşımı
 * alındığında program alanlarına HİÇ dokunulmuyor; yalnız deneme ve
 * hata nedeni güncelleniyor. Bir kez engellenmek, şirketin programını
 * kapalı ilan etmek için sebep değil.
 *
 * ENGEL AŞILMIYOR: tek User-Agent, yönlendirme takip ediliyor, başka
 * bir yol denenmiyor.
 *
 * İDEMPOTENT: aynı gün iki kez koşmak aynı sonucu yazıyor (upsert) ve
 * program kanıtı bulunamazsa mevcut karar korunuyor.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

import { guvenliDisAdres } from '../src/lib/guvenli-url.mjs';
import {
  kariyerSayfasiKarari,
  programSayfasiKarari,
  yumusak404,
} from '../src/lib/isveren-kanit.mjs';

const KOK = path.resolve(import.meta.dirname, '..');
const VERI = path.join(KOK, 'src', 'data', 'stajProgramlari.ts');

const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const kuru = process.argv.includes('--kuru');

/** Aynı anda kaç istek. Üçüncü tarafın sunucusuna ölçülü davranıyoruz. */
const ESZAMANLI = 4;
const ZAMAN_ASIMI_MS = 20000;
/** Bir adres için en fazla deneme (HEAD + GET zaten iki yöntem). */
const RETRY = 1;

const BASLIK = {
  'User-Agent': 'StajimVarBot/1.0 (+https://stajimvar.com/bot)',
  Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr,en;q=0.8',
};

/*
  PROGRAM KANITI ARTIK `src/lib/isveren-kanit.mjs` İÇİNDE

  Eski kural burada duruyordu ve YANLIŞ ÖLÇTÜ: "sayfada staj programı
  ifadesi var VE başvuru ifadesi var" diyordu, ikisi arasındaki mesafeye
  ve başvurunun NEYE ait olduğuna bakmıyordu. Sekiz şirketi haksız yere
  "açık" ilan etti; eşleşen "başvuru"lar tedarikçi portalı, POS başvurusu
  ve sayfa başlığıydı.

  Yeni kural iki adımlı ve bağlantıya dayanıyor:
    1. Genel kariyer sayfasında STAJA ÖZGÜ bağlantı aranıyor.
    2. O adres çağrılıp "açık" kararı ORADAN veriliyor.
  Genel kariyer ana sayfası tek başına asla "açık" üretmiyor.
*/

/** HTTP durumundan bağlantı kararı. */
export function urlKarari(durum) {
  if (durum >= 200 && durum < 300) return 'calisiyor';
  if (durum === 403 || durum === 429 || durum >= 500) return 'gecici_hata';
  return 'bozuk';
}

async function adresiCagir(adres) {
  /*
    Önce HEAD, olmazsa GET: bazı sunucular HEAD'i 405 ile geri çeviriyor
    ama GET'e cevap veriyor. Gövde yalnız GET'te geliyor ve program
    kararı gövdeye ihtiyaç duyuyor.
  */
  let sonDurum = 0;
  let sonHata = null;
  for (let deneme = 0; deneme <= RETRY; deneme += 1) {
    try {
      const yanit = await fetch(adres, {
        method: 'GET',
        headers: BASLIK,
        redirect: 'follow',
        signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      });
      const govde = yanit.ok ? await yanit.text() : '';
      return { durum: yanit.status, govde, sonAdres: yanit.url, hata: null };
    } catch (hata) {
      sonHata = hata?.name === 'TimeoutError' ? 'zaman aşımı' : String(hata?.message ?? hata);
      sonDurum = 0;
    }
  }
  return { durum: sonDurum, govde: '', sonAdres: adres, hata: sonHata };
}

/** Editoryal dosyadan slug + adres. Liste kaynağı BURASI. */
export function programlariOku(metin) {
  return [...metin.matchAll(/slug:\s*'([^']+)',[\s\S]*?kariyerUrl:\s*'([^']+)'/g)].map((e) => ({
    slug: e[1],
    adres: e[2],
  }));
}

async function main() {
  const kayitlar = programlariOku(fs.readFileSync(VERI, 'utf8'));
  console.log(`${kayitlar.length} kariyer adresi kontrol edilecek.`);

  if (!kuru && (!ADRES || !ANAHTAR)) {
    console.error('::error::SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekiyor.');
    process.exitCode = 1;
    return;
  }
  const db = kuru ? null : createClient(ADRES, ANAHTAR, { auth: { persistSession: false } });

  /* Mevcut kararlar: belirsiz sonuç bunları KANITSIZ değiştirmesin. */
  let mevcut = new Map();
  if (db) {
    const { data } = await db
      .from('employer_career_checks')
      .select('slug, program_durumu, program_kaniti, program_kontrol_at, program_url, url_basarili_at');
    mevcut = new Map((data ?? []).map((r) => [r.slug, r]));
  }

  const sonuclar = [];
  const sayac = { calisiyor: 0, gecici_hata: 0, bozuk: 0, acik: 0, kapali: 0, bilinmiyor: 0 };

  /* Sınırlı eşzamanlılık: bir şirketin hatası ötekileri durdurmuyor. */
  let sira = 0;
  async function isci() {
    while (sira < kayitlar.length) {
      const kayit = kayitlar[sira];
      sira += 1;
      const simdi = new Date().toISOString();
      const eski = mevcut.get(kayit.slug);

      /* SSRF ve güvenli adres kuralları mevcut modülden. */
      const guvenli = guvenliDisAdres(kayit.adres);
      if (!guvenli) {
        sonuclar.push({
          slug: kayit.slug,
          url_durumu: 'bozuk',
          url_denendi_at: simdi,
          url_basarili_at: eski?.url_basarili_at ?? null,
          url_hata: 'adres güvenli değil',
          program_durumu: eski?.program_durumu ?? null,
          program_kaniti: eski?.program_kaniti ?? null,
          program_kontrol_at: eski?.program_kontrol_at ?? null,
        });
        sayac.bozuk += 1;
        console.log(`  ${kayit.slug}: adres güvenli değil`);
        continue;
      }

      let cevap;
      try {
        cevap = await adresiCagir(guvenli);
      } catch (hata) {
        /* Beklenmedik hata da tek şirketi etkiliyor. */
        cevap = { durum: 0, govde: '', hata: String(hata?.message ?? hata) };
      }

      const urlDurumu = cevap.durum === 0 ? 'gecici_hata' : urlKarari(cevap.durum);
      sayac[urlDurumu] += 1;

      /*
        PROGRAM KARARI YALNIZ ÇALIŞAN ADRESTE

        Geçici hata ya da bozuk adreste program alanlarına HİÇ
        dokunulmuyor: mevcut karar ve kanıtı korunuyor. Bir 429,
        şirketin programını kapalı ilan etmek için sebep değil.
      */
      let program = {
        program_durumu: eski?.program_durumu ?? null,
        program_kaniti: eski?.program_kaniti ?? null,
        program_kontrol_at: eski?.program_kontrol_at ?? null,
        program_url: eski?.program_url ?? null,
      };

      /*
        YUMUŞAK 404 BOZUK SAYILIYOR

        Ölçümde üç şirket (tupras, tusas, yildiz-holding) kariyer
        adresinden 404 sayfasına yönlendi ve sunucu HTTP 200 döndü. Eski
        kural bunu "çalışıyor" yazıyordu: kartta çalışan bir adres
        gösterip öğrenciyi boş sayfaya göndermek bozuk bağlantıdan
        farksız.
      */
      let sahte404 = null;
      if (urlDurumu === 'calisiyor') {
        sahte404 = yumusak404(cevap.sonAdres ?? guvenli, cevap.govde);
      }
      const gercekUrlDurumu = sahte404 ? 'bozuk' : urlDurumu;
      if (sahte404) {
        sayac.calisiyor -= 1;
        sayac.bozuk += 1;
      }

      if (gercekUrlDurumu === 'calisiyor') {
        const birinci = kariyerSayfasiKarari(cevap.govde);
        let karar = { durum: birinci.durum, kanit: birinci.kanit };
        let programAdresi = null;

        /*
          İKİNCİ ADIM — "AÇIK" YALNIZ STAJ SAYFASINDAN

          Genel kariyer sayfası en fazla "staj sayfası şurada" diyor.
          Kararı o sayfa veriyor ve adres kartta bağlantı olarak
          kullanılıyor. Bir adım: sayfa sayfa gezinmiyoruz.
        */
        if (birinci.izlenecek) {
          const hedef = guvenliDisAdres(new URL(birinci.izlenecek, cevap.sonAdres ?? guvenli).href);
          if (hedef) {
            const ikinci = await adresiCagir(hedef);
            const ikinciDurum = ikinci.durum === 0 ? 'gecici_hata' : urlKarari(ikinci.durum);
            const ikinciSahte =
              ikinciDurum === 'calisiyor' ? yumusak404(ikinci.sonAdres ?? hedef, ikinci.govde) : null;
            if (ikinciDurum === 'calisiyor' && !ikinciSahte) {
              karar = programSayfasiKarari(ikinci.govde);
              /* Adres yalnız KANITLI açık programda saklanıyor. */
              if (karar.durum === 'acik') programAdresi = hedef;
            } else {
              /*
                Staj sayfasına ulaşılamadı. "Açık" demeye yetmez ve
                kapalı demek de kanıtsız olur: kanıt türü ne gördüğümüzü
                söylüyor.
              */
              karar = {
                durum: 'bilinmiyor',
                kanit: ikinciSahte ? 'staj-sayfasi-bulunamadi' : `staj-sayfasina-ulasilamadi-${ikinciDurum}`,
              };
            }
          }
        }

        /*
          BELİRSİZ SONUÇ ESKİ "AÇIK" KARARINI ARTIK KORUMUYOR

          Eskiden koruyordu ve bu, yanlış bir "açık" kararını kalıcı
          yapıyordu: bir kez yanlış ölçülen sekiz şirket her koşuda
          "açık" kalıyordu çünkü yeni kanıt bulunamaması eski kararı
          silmiyordu. Kanıtın kaybolması da bir bulgudur.
        */
        program = {
          program_durumu: karar.durum,
          program_kaniti: karar.kanit,
          program_kontrol_at: simdi,
          program_url: programAdresi,
        };
        sayac[program.program_durumu] += 1;
      }

      sonuclar.push({
        slug: kayit.slug,
        url_durumu: gercekUrlDurumu,
        url_denendi_at: simdi,
        /* Başarısız denemede son başarılı tarih KORUNUYOR. */
        url_basarili_at:
          gercekUrlDurumu === 'calisiyor' ? simdi : (eski?.url_basarili_at ?? null),
        /*
          GÜVENLİ HATA NEDENİ: durum kodu ve kısa sebep. Sayfa içeriği
          ve kişisel veri saklanmıyor.
        */
        url_hata:
          gercekUrlDurumu === 'calisiyor'
            ? null
            : sahte404
              ? sahte404
              : (cevap.hata ? `ağ: ${cevap.hata}`.slice(0, 120) : `HTTP ${cevap.durum}`),
        ...program,
      });

      console.log(
        `  ${kayit.slug.padEnd(22)} ${gercekUrlDurumu.padEnd(12)} ${program.program_durumu ?? '-'}`
      );
    }
  }

  await Promise.all(Array.from({ length: ESZAMANLI }, isci));

  if (kuru || !db) {
    console.log('\nkuru koşu: hiçbir şey yazılmadı.');
  } else {
    /* İDEMPOTENT: upsert, anahtar `slug`. */
    const { error } = await db
      .from('employer_career_checks')
      .upsert(
        sonuclar.map((s) => ({ ...s, guncellendi_at: new Date().toISOString() })),
        { onConflict: 'slug' }
      );
    if (error) {
      console.error(`::error::Kontroller yazılamadı: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`\n${sonuclar.length} kayıt yazıldı.`);
  }

  console.log(
    `bağlantı: calisiyor=${sayac.calisiyor} gecici_hata=${sayac.gecici_hata} bozuk=${sayac.bozuk}`
  );
  console.log(
    `program : acik=${sayac.acik} kapali=${sayac.kapali} bilinmiyor=${sayac.bilinmiyor}`
  );
}

/*
  YALNIZ GİRİŞ NOKTASIYKEN KOŞUYOR

  `process.argv.includes('--modul')` işe yaramıyordu: test dosyası bu
  modülü içe aldığında argv testin argümanlarını taşıyor ve `main()`
  koşup ağ isteği atmaya kalkıyordu. Karşılaştırma dosya yoluyla.

  `pathToFileURL` kullanılıyor: elle `file://` birleştirip ters bölü
  çevirmek Windows'ta kaçış hatasına açık ve bir kez o yüzden kırıldı.
*/
const girisNoktasi =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (girisNoktasi) {
  await main().catch((hata) => {
    console.error(`::error::İşveren kontrolü: ${hata.message}`);
    process.exitCode = 1;
  });
}
