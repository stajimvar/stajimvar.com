#!/usr/bin/env node
/**
 * YENİ ŞİRKET TALEBİ E-POSTASI (20261229010000)
 *
 * Kullanıcı isteği: "yeni şirket talebi gelince bana mail de gelsin".
 * Kuyruktaki talepleri yöneticiye (ILAN_BILDIRIM_ALICI — ilan
 * bildirimleriyle aynı alıcı) Resend ile gönderiyor. Düzen
 * scripts/ilan-bildirim-kuyrugu.mjs ile aynı: önce gönder, sonra işaretle;
 * Idempotency-Key talep kimliği, işaretleme düşse bile ikinci e-posta yok.
 */

const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const GONDEREN = process.env.RESEND_FROM || 'StajımVar <basvuru@stajimvar.com>';
const ALICI = process.env.ILAN_BILDIRIM_ALICI;
const PARTI = Number(process.env.SIRKET_TALEBI_PARTI || 20);
const KILIT_DAKIKA = 10;

const kuru = process.argv.includes('--kuru');

function eksikler() {
  const e = [];
  if (!ADRES) e.push('SUPABASE_URL');
  if (!ANAHTAR) e.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!ALICI) e.push('ILAN_BILDIRIM_ALICI');
  if (!RESEND && !kuru) e.push('RESEND_API_KEY');
  return e;
}

async function rpc(ad, govde) {
  const y = await fetch(`${ADRES}/rest/v1/rpc/${ad}`, {
    method: 'POST',
    headers: {
      apikey: ANAHTAR,
      Authorization: `Bearer ${ANAHTAR}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(govde ?? {}),
  });
  if (!y.ok) throw new Error(`${ad}: HTTP ${y.status} ${(await y.text()).slice(0, 300)}`);
  const metin = await y.text();
  return metin ? JSON.parse(metin) : null;
}

/** Talep sahibinin yazdığı metin HTML'e kaçırılarak giriyor. */
export function kacir(deger) {
  return String(deger ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function konuKur(t) {
  const durum = String(t.karar ?? '').startsWith('Otomatik onaylandı') ? 'otomatik onaylandı' : 'onay bekliyor';
  /* Konu satırı düz metin; satır sonu ve denetim karakteri yok. */
  const ad = String(t.sirket_adi ?? 'Şirket').replace(/[\r\n\t]+/g, ' ').slice(0, 80);
  return `Yeni şirket talebi (${durum}): ${ad}`;
}

export function govdeKur(t) {
  const satir = (ad, deger) =>
    deger ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280">${ad}</td><td>${kacir(deger)}</td></tr>` : '';
  return [
    '<table style="border-collapse:collapse;font:14px system-ui">',
    satir('Durum', t.karar),
    satir('Şirket', t.sirket_adi),
    satir('Web sitesi', t.web_sitesi),
    satir('Sektör', t.sektor),
    satir('Şehir', t.sehir),
    satir('Yetkili', [t.yetkili_adi, t.gorev].filter(Boolean).join(' · ')),
    satir('Hesap e-postası', t.hesap_eposta),
    satir('Formdaki e-posta', t.kurumsal_eposta !== t.hesap_eposta ? t.kurumsal_eposta : null),
    satir('Telefon', t.telefon),
    satir('Tarih', t.created_at),
    '</table>',
    '<p style="font:13px system-ui;color:#6B7280">İncelemek için: https://stajimvar.com/yonetim/onay</p>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function gonder(t) {
  const y = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND}`,
      'content-type': 'application/json',
      'Idempotency-Key': `sirket-talebi-${t.id}`,
    },
    body: JSON.stringify({ from: GONDEREN, to: [ALICI], subject: konuKur(t), html: govdeKur(t) }),
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
    process.exit(1);
  }

  const talepler = await rpc('sirket_talebi_eposta_kuyruktan_al', {
    p_adet: PARTI,
    p_kilit_dakika: KILIT_DAKIKA,
  });
  if (!talepler || talepler.length === 0) {
    console.log('Kuyruk boş.');
    return;
  }
  console.log(`Kuyruktan alındı: ${talepler.length}`);

  let basarili = 0;
  let basarisiz = 0;
  for (const t of talepler) {
    if (kuru) {
      console.log(`  [kuru] ${t.id} ${konuKur(t)}`);
      continue;
    }
    try {
      await gonder(t);
      await rpc('sirket_talebi_eposta_isaretle', { p_id: t.id, p_basarili: true });
      basarili += 1;
      console.log(`  gönderildi ${t.id}`);
    } catch (hata) {
      basarisiz += 1;
      const mesaj = hata instanceof Error ? hata.message : String(hata);
      console.log(`  BAŞARISIZ ${t.id}: ${mesaj}`);
      try {
        await rpc('sirket_talebi_eposta_isaretle', { p_id: t.id, p_basarili: false, p_hata: mesaj });
      } catch (ikinci) {
        console.error(`::warning::Hata işaretlenemedi ${t.id}: ${ikinci.message}`);
      }
    }
  }
  console.log(`Sonuç: ${basarili} gönderildi, ${basarisiz} başarısız.`);
}

/* Testler yalnız yardımcıları içe aktarıyor; betik doğrudan çalışınca çalışır. */
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('sirket-talebi-epostasi.mjs')) {
  main().catch((hata) => {
    console.error(`::error::Şirket talebi e-postası: ${hata.message}`);
    process.exit(1);
  });
}
