#!/usr/bin/env node
/**
 * GÜNLÜK EŞLEŞME ÖZETİ — 09:00 TÜRKİYE
 *
 * Kayıtlı aramaları olan ve e-postayı AÇMIŞ kullanıcılara, o güne
 * kadar hiç gönderilmemiş yeni eşleşmeleri tek e-postayla gönderiyor.
 *
 * NEREDE ÇALIŞIYOR
 * ----------------
 * Mevcut GitHub Actions düzeni (.github/workflows/gunluk-ozet.yml);
 * ikinci bir zamanlama sistemi kurulmadı. Değişkenler iş akışının
 * sırlarından geliyor — `automation/.env` YOK sayılıyor.
 *
 * NEDEN 06:00 UTC
 * ---------------
 * Türkiye 2016'dan beri KALICI UTC+3 ve yaz/kış saati uygulamıyor.
 * 06:00 UTC yıl boyunca 09:00 TRT. Testte bağlı.
 *
 * TEK EŞLEŞME GERÇEĞİ
 * -------------------
 * Eşleşme `src/lib/kayitli-arama.mjs`den geliyor — liste ekranının
 * kullandığı aynı dosya. İkinci bir uygulama yazmak, listede görünen
 * ilanın e-postada görünmemesi demekti.
 */

import {
  OZET_ILAN_SINIRI,
  aramaEslesiyorMu,
  filtreleriDogrula,
  ilaniNormalize,
  ozetSiralamasi,
  turkiyeGunu,
} from '../src/lib/kayitli-arama.mjs';

const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const GONDEREN = process.env.RESEND_FROM || 'StajımVar <basvuru@stajimvar.com>';
const ABONELIK_SIRRI = process.env.OZET_ABONELIK_SIRRI;
const SITE = process.env.SITE_URL || 'https://stajimvar.com';

const kuru = process.argv.includes('--kuru');
const GUN = process.env.OZET_GUNU || turkiyeGunu();

function eksikler() {
  const e = [];
  if (!ADRES) e.push('SUPABASE_URL');
  if (!ANAHTAR) e.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!ABONELIK_SIRRI) e.push('OZET_ABONELIK_SIRRI');
  if (!RESEND && !kuru) e.push('RESEND_API_KEY');
  return e;
}

const JSON_BASLIK = { 'content-type': 'application/json' };
const YETKI = () => ({
  apikey: ANAHTAR,
  Authorization: `Bearer ${ANAHTAR}`,
  ...JSON_BASLIK,
});

async function rest(yol, secenek = {}) {
  const y = await fetch(`${ADRES}/rest/v1/${yol}`, { ...secenek, headers: { ...YETKI(), ...(secenek.headers || {}) } });
  if (!y.ok) throw new Error(`${yol}: HTTP ${y.status} ${(await y.text()).slice(0, 300)}`);
  const m = await y.text();
  return m ? JSON.parse(m) : null;
}

const rpc = (ad, govde) =>
  rest(`rpc/${ad}`, { method: 'POST', body: JSON.stringify(govde ?? {}) });

/**
 * KULLANICI METNİ E-POSTADA GÜVENLİ
 *
 * Gövde HTML ve içinde kullanıcının yazdığı arama adı ile kaynaktan
 * gelen ilan metinleri var. Kaçırılmazsa bir `<script>` ya da `<a>`
 * alıcının posta istemcisinde çalışabilir hâle gelirdi.
 */
function kacir(deger) {
  return String(deger ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * ABONELİKTEN ÇIKMA TOKEN'I — HMAC, DÜZ METİN SAKLANMIYOR
 *
 * Stateless: token veritabanına HİÇ yazılmıyor, ne düz ne özet
 * hâlinde. İçinde kullanıcı kimliği, AMAÇ ve son kullanma zamanı var;
 * imza sunucudaki sırla üretiliyor.
 *
 * Amaç alanı şart: aynı sır başka bir yerde kullanılırsa o token bu
 * uç noktada kabul edilmemeli.
 */
async function abonelikTokeni(studentId) {
  const bitis = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const govde = `ozet-abonelik.v1.${studentId}.${bitis}`;
  const anahtar = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ABONELIK_SIRRI),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const imza = await crypto.subtle.sign('HMAC', anahtar, new TextEncoder().encode(govde));
  const b64 = Buffer.from(new Uint8Array(imza)).toString('base64url');
  return `${studentId}.${bitis}.${b64}`;
}

function ilanSatiri(ilan, aramaAdi) {
  const konum = [ilan.city, ilan.work_type === 'Remote' ? 'Uzaktan' : null]
    .filter(Boolean)
    .join(' · ');
  /*
    SON KONTROL YALNIZ GERÇEKTEN DOĞRULANMIŞSA

    `source_status = 'acik'` ve `source_verified_at` dolu olmalı.
    'belirsiz' ya da 'erisilemedi' durumunda satır yazılmıyor:
    doğrulanmamış bir kontrolü "son kontrol" diye göstermek, ilanın
    açık olduğunu iddia etmek olurdu.
  */
  const dogrulandi =
    ilan.source_status === 'acik' && ilan.source_verified_at
      ? new Date(ilan.source_verified_at).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
        })
      : null;

  return [
    '<tr><td style="padding:10px 0;border-bottom:1px solid #E5E7EB">',
    `<a href="${SITE}/ilan/${kacir(ilan.id)}" style="font:600 15px system-ui;color:#1D4ED8;text-decoration:none">${kacir(ilan.title)}</a>`,
    `<div style="font:13px system-ui;color:#374151;margin-top:2px">${kacir(ilan.company_name || '')}${konum ? ` · ${kacir(konum)}` : ''}</div>`,
    dogrulandi
      ? `<div style="font:12px system-ui;color:#6B7280;margin-top:2px">Son başarılı kontrol: ${kacir(dogrulandi)}</div>`
      : '',
    aramaAdi
      ? `<div style="font:12px system-ui;color:#6B7280;margin-top:2px">Eşleşen arama: ${kacir(aramaAdi)}</div>`
      : '',
    '</td></tr>',
  ]
    .filter(Boolean)
    .join('');
}

function govdeKur({ ilanlar, adlar, kalan, token }) {
  return [
    '<div style="font:14px system-ui;color:#111827;max-width:560px">',
    '<p>Kayıtlı aramalarınla eşleşen yeni ilanlar:</p>',
    '<table style="border-collapse:collapse;width:100%">',
    ilanlar.map((i) => ilanSatiri(i, adlar[i.id])).join(''),
    '</table>',
    kalan > 0
      ? `<p style="margin-top:14px">Ve ${kalan} ilan daha var. ` +
        `<a href="${SITE}/staj-ilanlari" style="color:#1D4ED8">Hepsini gör</a> — ` +
        'kalanlar sonraki özetlerde de görünecek.</p>'
      : '',
    '<p style="margin-top:18px;font:12px system-ui;color:#6B7280">',
    `<a href="${SITE}/ayarlar/bildirimler" style="color:#6B7280">Bildirim ayarları</a>`,
    ' · ',
    `<a href="${SITE}/api/ozet-aboneligi?t=${encodeURIComponent(token)}" style="color:#6B7280">Bu özetleri kapat</a>`,
    '</p>',
    '</div>',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Bir kullanıcı için aday ilanları hesaplar.
 *
 * SAYFALAMA YOK: bütün yayındaki ilanlar okunuyor ve eşleşme tamamı
 * üzerinde yapılıyor. "Mevcut sayfada eşleştirme" yapmak, ikinci
 * sayfadaki bir ilanı hiç görmemek demekti.
 */
function adaylariBul({ aramalar, ilanlar, defter }) {
  const secilen = new Map();
  const taban = new Map();

  for (const arama of aramalar) {
    if (!arama.email_enabled) continue;
    const filtreler = filtreleriDogrula(arama.filters);
    const aramaAnı = new Date(arama.created_at).getTime();

    for (const ham of ilanlar) {
      /*
        DEFTERDE OLAN İLAN TEKRAR DEĞERLENDİRİLMİYOR

        Tek istisna: `candidate` ve henüz gönderilmemiş satırlar — onlar
        onuncu sıradan sonra kalıp devreden ilanlar ve yine aday.

        `baseline` satırları buraya HİÇ girmiyor: bir gün sonra
        `candidate`a dönmeleri, kaydedilmeden önceki geçmişin
        gönderilmesi demek olurdu.
      */
      const mevcut = defter.get(ham.id);
      if (mevcut && !(mevcut.reason === 'candidate' && !mevcut.sent_at)) continue;

      /*
        GÖNDERİM ANINDA ARTIK EŞLEŞMEYEN YA DA KAPANMIŞ İLAN GİRMİYOR:
        sorgu `status=published` ile geliyor ve eşleşme burada tekrar
        koşuyor — aday listesi dünden kalmış olabilir.
      */
      if (!aramaEslesiyorMu(ilaniNormalize(ham), filtreler)) continue;

      /*
        TABAN KARARI İŞÇİDE — İSTEMCİYE BAĞLI DEĞİL

        Taban `AramayiKaydet` içinde, arama yazıldıktan SONRA ayrı bir
        çağrıyla işaretleniyor. O çağrı düşerse (sekme kapandı, ağ
        koptu) ilk özet geçmişin tamamını gönderirdi — ölçüldü:
        aramayı doğrudan REST'e yazdığım doğrulamada 82 eski ilan aday
        olmuştu.

        Kural artık burada da var: eşleşen ama defterde olmayan bir
        ilan, ARAMADAN ÖNCE envanterimize girmişse TABAN sayılıyor ve
        gönderilmiyor. `first_seen_at` kullanılıyor — bizim ilk
        gördüğümüz an; `posted_at` değil, çünkü geç içe aktarılan
        eski tarihli bir ilan bizim için yenidir.
      */
      const geldigiAn = new Date(ham.first_seen_at ?? 0).getTime();
      const aramadanOnce =
        Number.isFinite(aramaAnı) &&
        Number.isFinite(geldigiAn) &&
        geldigiAn > 0 &&
        geldigiAn <= aramaAnı;

      if (aramadanOnce && !mevcut) {
        if (!taban.has(ham.id)) taban.set(ham.id, { ilan: ham, aramaId: arama.id });
        continue;
      }

      /* Aynı ilan birden çok aramaya eşleşse BİR KEZ: ilk arama adıyla. */
      if (!secilen.has(ham.id)) {
        secilen.set(ham.id, { ilan: ham, aramaAdi: arama.name || null, aramaId: arama.id });
      }
    }
  }

  /* Bir ilan hem taban hem aday çıktıysa aday kazanıyor: sonradan
     eklenen bir arama onu gerçekten yeni görüyor. */
  for (const id of secilen.keys()) taban.delete(id);

  return { adaylar: [...secilen.values()], taban: [...taban.values()] };
}

async function gonder({ eposta, ilanlar, adlar, kalan, token, runId, studentId }) {
  const y = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND}`,
      ...JSON_BASLIK,
      /*
        IDEMPOTENCY ANAHTARI KARARLI

        Kullanıcı + Türkiye günü + KALICI koşu kimliği. `run_id`
        veritabanında duruyor, yani yeniden denemede aynı anahtar
        üretiliyor ve sağlayıcı ikinci kez teslim etmiyor. Gönderim
        başarılı ama veritabanı işaretlemesi başarısız olursa retry
        yeni bir e-posta yaratmıyor.
      */
      'Idempotency-Key': `ozet-${studentId}-${GUN}-${runId}`,
    },
    body: JSON.stringify({
      from: GONDEREN,
      to: [eposta],
      subject: `${ilanlar.length} yeni staj ilanı eşleşti`,
      html: govdeKur({ ilanlar, adlar, kalan, token }),
    }),
  });
  if (!y.ok) {
    const ham = (await y.text()).slice(0, 200).replace(/Bearer\s+\S+/gi, 'Bearer ***');
    throw new Error(`Resend HTTP ${y.status}: ${ham}`);
  }
}

async function main() {
  const e = eksikler();
  if (e.length) {
    console.error(`::error::Ortam değişkenleri eksik: ${e.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Türkiye günü: ${GUN}`);

  /* 1) E-postası AÇIK aramalar. Rıza yoksa satır buraya hiç gelmiyor
        (veritabanı kısıtı `email_enabled = false or consent_at not null`). */
  const aramalar = await rest(
    'saved_searches?select=id,student_id,name,filters,email_enabled,created_at&email_enabled=is.true'
  );
  if (!aramalar.length) {
    console.log('E-posta açık kayıtlı arama yok.');
    return;
  }

  const kisiler = [...new Set(aramalar.map((a) => a.student_id))];
  console.log(`e-postası açık arama: ${aramalar.length} · kullanıcı: ${kisiler.length}`);

  /* 2) Yayındaki ilanlar — TAMAMI, sayfalama yok. */
  const ilanlar = await rest(
    'listings?select=id,title,city,work_type,country_code,is_paid,mandatory_staj_accepted,' +
      'voluntary_staj_accepted,department,department_tags,description,required_skills,status,' +
      'source_status,source_verified_at,first_seen_at,posted_at,created_at,company_id,companies(name)' +
      '&status=eq.published&limit=5000'
  );
  const zenginIlanlar = ilanlar.map((i) => ({ ...i, company_name: i.companies?.name ?? null }));
  console.log(`yayındaki ilan: ${zenginIlanlar.length}`);

  let gonderildi = 0;
  let atlandi = 0;
  let basarisiz = 0;

  /* 3) Her kullanıcı için koşu kaydı hazırla (aday varsa). */
  for (const studentId of kisiler) {
    try {
      const teslim = await rest(
        `digest_deliveries?select=listing_id,sent_at,reason&student_id=eq.${studentId}`
      );
      const defter = new Map(teslim.map((t) => [t.listing_id, t]));

      const kendiAramalari = aramalar.filter((a) => a.student_id === studentId);
      const { adaylar, taban } = adaylariBul({
        aramalar: kendiAramalari,
        ilanlar: zenginIlanlar,
        defter,
      });

      /*
        EKSİK TABANI İŞÇİ TAMAMLIYOR

        `reason='baseline'` + `sent_at` dolu: aday listesine girmiyorlar
        ve "gönderilmiş e-posta" olarak da raporlanmıyorlar — `reason`
        ayrımı tam bunun için var.
      */
      if (taban.length && !kuru) {
        await rest('digest_deliveries', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates' },
          body: JSON.stringify(
            taban.map((t) => ({
              student_id: studentId,
              listing_id: t.ilan.id,
              reason: 'baseline',
              sent_at: new Date().toISOString(),
              matched_search_id: t.aramaId,
            }))
          ),
        });
        console.log(`  ${studentId.slice(0, 8)}: ${taban.length} ilan taban olarak işaretlendi`);
      }

      if (adaylar.length === 0) {
        atlandi += 1;
        continue;
      }

      /* Aday defterine yaz: 10 sınırının dışında kalanlar da kayıtlı
         kalsın ve sonraki güne devretsin. */
      const yeniAdaylar = adaylar.filter((a) => !defter.has(a.ilan.id));
      if (yeniAdaylar.length && !kuru) {
        await rest('digest_deliveries', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates' },
          body: JSON.stringify(
            yeniAdaylar.map((a) => ({
              student_id: studentId,
              listing_id: a.ilan.id,
              reason: 'candidate',
              matched_search_id: a.aramaId,
            }))
          ),
        });
      }

      const sirali = adaylar
        .map((a) => ({ ...a, id: a.ilan.id, eklenme: a.ilan.first_seen_at }))
        .sort(ozetSiralamasi);
      const secilen = sirali.slice(0, OZET_ILAN_SINIRI);
      const kalan = sirali.length - secilen.length;

      if (kuru) {
        console.log(
          `  [kuru] ${studentId.slice(0, 8)}: ${secilen.length} ilan, ${kalan} devrediyor`
        );
        continue;
      }

      /* 4) Koşu kaydı: seçilen ilanlar GÖNDERİMDEN ÖNCE sabitleniyor. */
      await rest('digest_runs', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          student_id: studentId,
          gun: GUN,
          listing_ids: secilen.map((s) => s.ilan.id),
        }),
      });
    } catch (hata) {
      /* BİR KULLANICININ HATASI ÖTEKİLERİ DURDURMUYOR. */
      basarisiz += 1;
      console.log(`  HAZIRLIK HATASI ${studentId.slice(0, 8)}: ${hata.message}`);
    }
  }

  if (kuru) {
    console.log('kuru koşu: hiçbir e-posta gönderilmedi, hiçbir şey yazılmadı.');
    return;
  }

  /* 5) Kuyruktan koşu al ve gönder. */
  const kosular = await rpc('gunluk_ozet_kosu_al', { p_gun: GUN, p_adet: 200 });
  console.log(`kuyruktan alınan koşu: ${(kosular || []).length}`);

  for (const kosu of kosular || []) {
    try {
      if (!kosu.listing_ids?.length) {
        await rpc('gunluk_ozet_isaretle', {
          p_student: kosu.student_id,
          p_gun: GUN,
          p_basarili: true,
        });
        continue;
      }

      /*
        E-POSTA ADRESİ DOĞRULANMIŞ HESAPTAN

        İstemciden gelen hiçbir değer kullanılmıyor: adres auth
        kaydından okunuyor.
      */
      const kullanici = await (async () => {
        const y = await fetch(`${ADRES}/auth/v1/admin/users/${kosu.student_id}`, {
          headers: YETKI(),
        });
        if (!y.ok) throw new Error(`kullanıcı okunamadı: HTTP ${y.status}`);
        return y.json();
      })();
      const eposta = kullanici?.email;
      if (!eposta) throw new Error('hesapta e-posta adresi yok');

      /* Sabitlenmiş ilan listesini oku: retry aynı içeriği göndersin. */
      const secilen = kosu.listing_ids
        .map((id) => zenginIlanlar.find((i) => i.id === id))
        .filter(Boolean);

      const teslim = await rest(
        `digest_deliveries?select=listing_id,matched_search_id,sent_at&student_id=eq.${kosu.student_id}`
      );
      const adlar = {};
      for (const t of teslim) {
        const a = aramalar.find((x) => x.id === t.matched_search_id);
        if (a?.name) adlar[t.listing_id] = a.name;
      }
      const kalan = teslim.filter((t) => !t.sent_at && !kosu.listing_ids.includes(t.listing_id))
        .length;

      await gonder({
        eposta,
        ilanlar: secilen,
        adlar,
        kalan,
        token: await abonelikTokeni(kosu.student_id),
        runId: kosu.run_id,
        studentId: kosu.student_id,
      });

      await rpc('gunluk_ozet_isaretle', {
        p_student: kosu.student_id,
        p_gun: GUN,
        p_basarili: true,
      });
      gonderildi += 1;
      console.log(`  gönderildi ${kosu.student_id.slice(0, 8)} (${secilen.length} ilan)`);
    } catch (hata) {
      basarisiz += 1;
      const mesaj = hata instanceof Error ? hata.message : String(hata);
      console.log(`  BAŞARISIZ ${kosu.student_id.slice(0, 8)}: ${mesaj}`);
      try {
        await rpc('gunluk_ozet_isaretle', {
          p_student: kosu.student_id,
          p_gun: GUN,
          p_basarili: false,
          p_hata: mesaj,
        });
      } catch (ikinci) {
        console.error(`::warning::Hata işaretlenemedi: ${ikinci.message}`);
      }
    }
  }

  console.log(`Sonuç: ${gonderildi} gönderildi, ${atlandi} yeni eşleşme yok, ${basarisiz} hata.`);
}

await main().catch((hata) => {
  console.error(`::error::Günlük özet: ${hata.message}`);
  process.exitCode = 1;
});
