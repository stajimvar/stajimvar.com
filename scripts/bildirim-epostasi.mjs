#!/usr/bin/env node
/**
 * BİLDİRİM E-POSTASI (20261230010000)
 *
 * Seçili site içi bildirimleri (bugün: yeni başvuru) alıcının
 * doğrulanmış hesap e-postasına gönderiyor. Düzen
 * scripts/sirket-talebi-epostasi.mjs ile aynı: önce gönder, sonra
 * işaretle; Idempotency-Key bildirim kimliği.
 *
 * E-POSTADA ADAY BİLGİSİ YOK
 * --------------------------
 * Yalnız bildirimin kendi başlığı ve metni (sunucu doğrulanmamış şirkete
 * aday adını zaten yazmıyor) ve panele bağlantı. Profil, CV ve iletişim
 * yalnız panelde, yetkiyle.
 */

const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const GONDEREN = process.env.RESEND_FROM || 'StajımVar <basvuru@stajimvar.com>';
const PARTI = Number(process.env.BILDIRIM_EPOSTA_PARTI || 30);
const KILIT_DAKIKA = 10;
const SITE = 'https://stajimvar.com';

const kuru = process.argv.includes('--kuru');

export function kacir(deger) {
  return String(deger ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Yalnız site içi yol bağlantıya dönüşüyor; dış adres ya da şema yok. */
export function guvenliBaglanti(hedef) {
  return typeof hedef === 'string' && /^\/(?!\/)/.test(hedef) ? `${SITE}${hedef}` : `${SITE}/`;
}

export function konuKur(b) {
  return String(b.baslik ?? 'StajımVar bildirimi').replace(/[\r\n\t]+/g, ' ').slice(0, 120);
}

export function govdeKur(b) {
  const baglanti = guvenliBaglanti(b.hedef);
  const dugme = 'Başvuruyu panelde aç';
  return [
    '<div style="font:15px/1.5 system-ui;color:#111827;max-width:520px">',
    `<p style="font-weight:700;margin:0 0 8px">${kacir(b.baslik)}</p>`,
    b.govde ? `<p style="margin:0 0 16px">${kacir(b.govde)}</p>` : '',
    `<p style="margin:0 0 20px"><a href="${kacir(baglanti)}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:10px">${dugme}</a></p>`,
    '<p style="font-size:12px;color:#6B7280;margin:0">Bu e-posta StajımVar hesabındaki bildirimin kopyası. ',
    'Aday bilgileri yalnız şirket panelinde görünür.</p>',
    '</div>',
  ]
    .filter(Boolean)
    .join('\n');
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

async function gonder(b) {
  const y = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND}`,
      'content-type': 'application/json',
      'Idempotency-Key': `bildirim-${b.id}`,
    },
    body: JSON.stringify({ from: GONDEREN, to: [b.alici], subject: konuKur(b), html: govdeKur(b) }),
  });
  if (!y.ok) {
    const ham = (await y.text()).slice(0, 200).replace(/Bearer\s+\S+/gi, 'Bearer ***');
    throw new Error(`Resend HTTP ${y.status}: ${ham}`);
  }
}

async function main() {
  const eksik = [];
  if (!ADRES) eksik.push('SUPABASE_URL');
  if (!ANAHTAR) eksik.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!RESEND && !kuru) eksik.push('RESEND_API_KEY');
  if (eksik.length) {
    console.error(`::error::Ortam değişkenleri eksik: ${eksik.join(', ')}`);
    process.exit(1);
  }

  const kayitlar = await rpc('bildirim_eposta_kuyruktan_al', { p_adet: PARTI, p_kilit_dakika: KILIT_DAKIKA });
  if (!kayitlar || kayitlar.length === 0) {
    console.log('Kuyruk boş.');
    return;
  }
  console.log(`Kuyruktan alındı: ${kayitlar.length}`);

  let basarili = 0;
  let basarisiz = 0;
  for (const b of kayitlar) {
    if (kuru) {
      console.log(`  [kuru] ${b.id} ${b.tur} ${konuKur(b)}`);
      continue;
    }
    try {
      await gonder(b);
      await rpc('bildirim_eposta_isaretle', { p_id: b.id, p_basarili: true });
      basarili += 1;
    } catch (hata) {
      basarisiz += 1;
      const mesaj = hata instanceof Error ? hata.message : String(hata);
      console.log(`  BAŞARISIZ ${b.id}: ${mesaj}`);
      try {
        await rpc('bildirim_eposta_isaretle', { p_id: b.id, p_basarili: false, p_hata: mesaj });
      } catch (ikinci) {
        console.error(`::warning::Hata işaretlenemedi ${b.id}: ${ikinci.message}`);
      }
    }
  }
  console.log(`Sonuç: ${basarili} gönderildi, ${basarisiz} başarısız.`);
}

if (process.argv[1]?.endsWith('bildirim-epostasi.mjs')) {
  main().catch((hata) => {
    console.error(`::error::Bildirim e-postası: ${hata.message}`);
    process.exit(1);
  });
}
