#!/usr/bin/env node
/**
 * EKİP DAVETİ E-POSTASI (20261231010000)
 *
 * Bekleyen davetleri davet edilen adrese gönderiyor. Kişinin henüz
 * hesabı olmayabilir; bu yüzden alıcı davetin kendi adresi, kuyruk
 * davet tablosunda. Metin sabit: davet edenin yazdığı serbest metin yok
 * (alan adımızdan giden e-posta başkasının mesaj kanalı olmasın).
 * Düzen scripts/sirket-talebi-epostasi.mjs ile aynı.
 */

const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const GONDEREN = process.env.RESEND_FROM || 'StajımVar <basvuru@stajimvar.com>';
const PARTI = Number(process.env.EKIP_DAVETI_PARTI || 20);
const KILIT_DAKIKA = 10;
const SAYFA = 'https://stajimvar.com/isveren/baslangic';

const kuru = process.argv.includes('--kuru');

export function kacir(deger) {
  return String(deger ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ROL = { Recruiter: 'işe alım sorumlusu', Viewer: 'görüntüleyici' };

export function konuKur(d) {
  const ad = String(d.sirket_adi ?? 'Bir şirket').replace(/[\r\n\t]+/g, ' ').slice(0, 80);
  return `${ad} seni StajımVar'daki ekibine davet etti`;
}

export function govdeKur(d) {
  const kim = d.davet_eden_ad ? `${kacir(d.davet_eden_ad)}, ` : '';
  const adim = d.hesap_var
    ? 'Bu e-posta adresiyle StajımVar\'a giriş yap; davet şirket profili sayfasında seni bekliyor.'
    : 'Bu e-posta adresiyle StajımVar\'a ücretsiz kayıt ol (İşverenim seçeneğiyle); e-postanı doğruladıktan sonra davet şirket profili sayfasında seni bekliyor.';
  return [
    '<div style="font:15px/1.5 system-ui;color:#111827;max-width:520px">',
    `<p style="font-weight:700;margin:0 0 8px">${kim}${kacir(d.sirket_adi)} seni StajımVar'daki işveren ekibine ${kacir(ROL[d.rol] ?? 'üye')} olarak davet etti.</p>`,
    `<p style="margin:0 0 16px">${adim}</p>`,
    `<p style="margin:0 0 20px"><a href="${SAYFA}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:10px">Daveti aç</a></p>`,
    '<p style="font-size:12px;color:#6B7280;margin:0">Bu daveti beklemiyorsan e-postayı yok sayabilirsin; davet kabul edilmeden hiçbir yetki açılmaz.</p>',
    '</div>',
  ].join('\n');
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

async function gonder(d) {
  const y = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND}`,
      'content-type': 'application/json',
      'Idempotency-Key': `ekip-daveti-${d.id}`,
    },
    body: JSON.stringify({ from: GONDEREN, to: [d.eposta], subject: konuKur(d), html: govdeKur(d) }),
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
  const davetler = await rpc('ekip_daveti_eposta_kuyruktan_al', { p_adet: PARTI, p_kilit_dakika: KILIT_DAKIKA });
  if (!davetler || davetler.length === 0) {
    console.log('Kuyruk boş.');
    return;
  }
  let basarili = 0;
  let basarisiz = 0;
  for (const d of davetler) {
    if (kuru) {
      console.log(`  [kuru] ${d.id} ${konuKur(d)}`);
      continue;
    }
    try {
      await gonder(d);
      await rpc('ekip_daveti_eposta_isaretle', { p_id: d.id, p_basarili: true });
      basarili += 1;
    } catch (hata) {
      basarisiz += 1;
      const mesaj = hata instanceof Error ? hata.message : String(hata);
      console.log(`  BAŞARISIZ ${d.id}: ${mesaj}`);
      try {
        await rpc('ekip_daveti_eposta_isaretle', { p_id: d.id, p_basarili: false, p_hata: mesaj });
      } catch (ikinci) {
        console.error(`::warning::Hata işaretlenemedi ${d.id}: ${ikinci.message}`);
      }
    }
  }
  console.log(`Sonuç: ${basarili} gönderildi, ${basarisiz} başarısız.`);
}

if (process.argv[1]?.endsWith('ekip-daveti-epostasi.mjs')) {
  main().catch((hata) => {
    console.error(`::error::Ekip daveti e-postası: ${hata.message}`);
    process.exit(1);
  });
}
