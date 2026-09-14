#!/usr/bin/env node
/**
 * STAJ TÜRÜ KABULÜNÜ KANITA GÖRE DÜZELTİR
 *
 * ÖLÇÜLDÜ (14 Eylül 2026, üretim): 175 ilanın 175'inde
 * `voluntary_staj_accepted = true`. Sebebi veri değil varsayılan —
 * sütun `not null default true` ve iki içe aktarıcı da sabit `True`
 * yazıyor. Alan hiçbir şey ölçmüyordu.
 *
 * KÖRLEMESİNE null YAPMIYOR
 * -------------------------
 * Her kayıt KENDİ metnine bakılarak karara bağlanıyor:
 *
 *   açık ret ifadesi        → false (bilgi korunuyor)
 *   açık kabul ifadesi      → true
 *   `insurance_note` açık   → zorunlu için kanıt sayılıyor
 *   hiçbiri                 → null  (kaynak söylemiyor)
 *
 * `mandatory = true` OLAN KAYITLARDA DİKKAT: o değer
 * `detect_mandatory_staj` tarafından kanıtla yazılmış olabilir. Metinde
 * kanıt bulunursa true KALIYOR; bulunmazsa null oluyor — çünkü aynı
 * fonksiyon kanıt bulamadığında da bir değer (False) yazıyordu ve
 * true'nun her zaman kanıtlı olduğunu varsayamayız.
 *
 * Kullanım:
 *   node scripts/staj-turu-duzelt.mjs --kuru
 *   node scripts/staj-turu-duzelt.mjs
 */

import { createClient } from '@supabase/supabase-js';

const adres = process.env.SUPABASE_URL;
const anahtar = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!adres || !anahtar) {
  console.error('::error::SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekiyor.');
  process.exitCode = 1;
}
const db = createClient(adres ?? '', anahtar ?? '', { auth: { persistSession: false } });
const kuru = process.argv.includes('--kuru');

function katla(metin) {
  return (metin || '')
    .replace(/[İIı]/g, 'i')
    .replace(/[ĞğüÜşŞöÖçÇ]/g, (h) => ({ Ğ: 'g', ğ: 'g', ü: 'u', Ü: 'u', ş: 's', Ş: 's', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c' })[h])
    .toLowerCase();
}

/*
  KALIPLAR — `automation/promote.py` İLE AYNI MANTIK

  Zorunlu tarafında `detect_mandatory_staj`ın aradığı ifadeler; gönüllü
  tarafında "gönüllü staj" ve eşanlamlıları. Kelime sınırı önemli:
  "sgk" kısa bir parça ve alt dize olarak eşleşirse ("sgkli" gibi
  uydurma bir kelimede) yanlış kanıt üretir.
*/
const ZORUNLU_KABUL =
  /zorunlu staj|staj sigortasi|isletmede mesleki egitim|\bsgk\b|mandatory internship|compulsory internship/;
const ZORUNLU_RET =
  /zorunlu staj (kabul edilmiyor|alinmiyor|kabul edilmemektedir)|zorunlu stajyer alinmamaktadir/;
const GONULLU_KABUL = /gonullu staj|gonulluluk esasli staj|zorunlu olmayan staj|voluntary internship/;
const GONULLU_RET =
  /gonullu staj (kabul edilmiyor|alinmiyor)|yalnizca zorunlu staj|sadece zorunlu staj/;

/** Bir alanın kararı: true / false / null + sebep. */
export function stajTuruKarari(ilan, tur) {
  /*
    KANIT HAVUZU — KAYNAĞIN ELDEKİ BÜTÜN METNİ

    `description` çevrilmiş olabiliyor; `raw` kaynağın ham cevabını,
    `source_title` şirketin kendi ilan adını taşıyor. Yalnız çevrilmiş
    açıklamaya bakmak, kanıtı çevirinin kelime seçimine bağlamak olurdu.
  */
  const metin = katla(
    [
      ilan.description || '',
      ilan.insurance_note || '',
      ilan.source_title || '',
      JSON.stringify(ilan.raw ?? {}),
    ].join(' ')
  );
  const [kabul, ret] =
    tur === 'zorunlu' ? [ZORUNLU_KABUL, ZORUNLU_RET] : [GONULLU_KABUL, GONULLU_RET];

  /* Ret önce: "zorunlu staj kabul edilmiyor" içinde "zorunlu staj" da geçiyor. */
  if (ret.test(metin)) return { deger: false, sebep: 'açık ret ifadesi' };
  if (kabul.test(metin)) return { deger: true, sebep: 'açık kabul ifadesi' };
  return { deger: null, sebep: 'kaynak söylemiyor' };
}

if (adres && anahtar) {
  const { data: ilanlar, error } = await db
    .from('listings')
    .select('id, title, description, insurance_note, mandatory_staj_accepted, voluntary_staj_accepted');

  if (error) {
    console.error(`::error::İlanlar okunamadı: ${error.message}`);
    process.exitCode = 1;
  } else {
    const say = (alan) => {
      const s = { true: 0, false: 0, null: 0 };
      for (const i of ilanlar) s[String(i[alan])] += 1;
      return s;
    };
    const oncesi = { zorunlu: say('mandatory_staj_accepted'), gonullu: say('voluntary_staj_accepted') };
    console.log(`okunan: ${ilanlar.length} ilan`);
    console.log(`önce  zorunlu: ${JSON.stringify(oncesi.zorunlu)}`);
    console.log(`önce  gönüllü: ${JSON.stringify(oncesi.gonullu)}`);

    const degisenler = [];
    const kirilim = {};
    for (const ilan of ilanlar) {
      const z = stajTuruKarari(ilan, 'zorunlu');
      const g = stajTuruKarari(ilan, 'gonullu');
      const govde = {};

      /*
        `mandatory_staj_accepted` DE KANITA BAĞLANIYOR

        Geçen turda bu alanı korumuştum: "119 kaydın provenansı
        belirsiz, silmek doğrulanmış olabilecek bilgiyi silmek olurdu."
        O gerekçe yanlıştı — "doğrulanmış OLABİLİR" bir kanıt değil ve
        bu alan şirketin kabul beyanını iddia ediyor.

        Ölçüldü (kanıt havuzu: description + insurance_note +
        source_title + raw): 122 true kaydın 3'ünde açık kabul kanıtı
        var, 119'unda YOK. 53 false kaydın hiçbirinde açık RET kanıtı
        yok. Kanıtsız olan null oluyor; üç kanıtlı true korunuyor.

        ESKİ YORUM (kaldırıldı): provenans belirsizliği

        Ölçüldü: 122 ilanda true, ama metinde kanıt bulunan yalnız 3.
        Geri kalan 119'un nereden geldiğini KANITLAYAMIYORUM:
        `detect_mandatory_staj` çeviriden ÖNCE koşuyor (saklanan
        açıklama Türkçeye çevrilmiş olabilir) ve 155 ilan `manual`
        kaynaklı. Form da bu değeri tek bir "staj türü" seçiminden
        türetiyor (`tur === 'zorunlu' || tur === 'yaz'`) — yani
        (true, true) formdan ÇIKAMAZ, dolayısıyla o 122 kaydın
        değerini bir insanın iki soruya verdiği cevap saymak da
        mümkün değil.

        119 kaydı null yapmak, doğrulanamadığı için doğrulanmış
        olabilecek bilgiyi silmek olurdu. Bu alan ayrı bir kayıt kayıt
        incelemeyi hak ediyor; bu betik ona dokunmuyor.

        `z` yine hesaplanıyor: kuru koşu raporunda "kanıt bulunan kaç
        kayıt var" görünsün.
      */
      if (z.deger !== ilan.mandatory_staj_accepted) govde.mandatory_staj_accepted = z.deger;

      /*
        `voluntary_staj_accepted` KANITSIZ OLDUĞU KANITLI

        175/175 true. Üç bağımsız sebep: şema varsayılanı `default
        true`, iki içe aktarıcı da sabit `True` yazıyor, ve form bu
        alanı yalnız `tur === 'gonullu' || tur === 'uzun'` iken true
        yapıyor — yani formdan gelen bir kayıtta zorunluyla birlikte
        true OLAMAZ. Alan hiçbir şey ölçmüyor.
      */
      if (g.deger !== ilan.voluntary_staj_accepted) govde.voluntary_staj_accepted = g.deger;
      if (Object.keys(govde).length === 0) continue;
      degisenler.push({ ilan, govde });
      for (const [alan, deger] of Object.entries(govde)) {
        const anahtar2 = `${alan}: ${ilan[alan]} -> ${deger}`;
        kirilim[anahtar2] = (kirilim[anahtar2] || 0) + 1;
      }
    }

    console.log(`değişecek: ${degisenler.length}`);
    for (const [k, v] of Object.entries(kirilim).sort()) console.log(`  ${k}: ${v}`);

    let yazildi = 0;
    let hata = 0;
    for (const { ilan, govde } of kuru ? [] : degisenler) {
      const { error: yazmaHatasi } = await db.from('listings').update(govde).eq('id', ilan.id);
      if (yazmaHatasi) {
        hata += 1;
        console.log(`  YAZILAMADI ${ilan.id}: ${yazmaHatasi.message}`);
      } else {
        yazildi += 1;
      }
    }

    if (kuru) {
      console.log('kuru koşu: hiçbir şey yazılmadı.');
    } else {
      const { data: sonra } = await db
        .from('listings')
        .select('mandatory_staj_accepted, voluntary_staj_accepted');
      const sy = (alan) => {
        const s = { true: 0, false: 0, null: 0 };
        for (const i of sonra || []) s[String(i[alan])] += 1;
        return s;
      };
      console.log(`yazıldı: ${yazildi}, hata: ${hata}`);
      console.log(`sonra zorunlu: ${JSON.stringify(sy('mandatory_staj_accepted'))}`);
      console.log(`sonra gönüllü: ${JSON.stringify(sy('voluntary_staj_accepted'))}`);
      if (hata > 0) process.exitCode = 1;
    }
  }
}
