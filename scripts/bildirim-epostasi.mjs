#!/usr/bin/env node
/**
 * BİLDİRİM E-POSTASI (20261230010000)
 *
 * Seçili site içi bildirimleri (yeni başvuru; 20270109010000'den beri
 * takip edilen şirketin yeni ilanı da) alıcının
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

/* HOŞ GELDİN E-POSTASI (20270110010000): şirket onaylanınca; metin iki göndericide aynı. */
const HOSGELDIN_TURLERI = new Set(['sirket_onaylandi', 'sahiplenme_onaylandi']);
const HOSGELDIN_ADIMLARI = [
  ['İlk staj ilanını oluştur', 'Pozisyonu, çalışma biçimini ve son başvuru tarihini gir; ilan kontrolden sonra yayınlanır.', '/sirket/ilan/yeni'],
  ['Şirket sayfanı tamamla', 'Logo, kısa tanıtım ve yan haklar öğrencinin seni tanımasını sağlar.', '/sirket/profil'],
  ['Ekibini davet et', 'İK arkadaşların kendi hesabıyla başvuruları birlikte inceler.', '/sirket/profil/ekip'],
];
export function hosgeldinHtml(baslik, govde) {
  const adimlar = HOSGELDIN_ADIMLARI.map(([b, a, yol], i) =>
    `<tr><td style="padding:0 12px 14px 0;vertical-align:top"><span style="display:inline-block;width:26px;height:26px;line-height:26px;border-radius:13px;background:#EFF6FF;color:#1D4ED8;font-weight:700;font-size:13px;text-align:center">${i + 1}</span></td>` +
    `<td style="padding:0 0 14px;vertical-align:top"><a href="${SITE}${yol}" style="color:#171410;font-weight:700;text-decoration:none">${b}</a><br><span style="color:#57534e;font-size:14px">${a}</span></td></tr>`).join('');
  return [
    '<div style="background:#f7f7f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif">',
    '<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">',
    `<div style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #eeeeee"><img src="${SITE}/logo.png" alt="" width="52" height="52" style="display:block;margin:0 auto 10px;width:52px;height:52px;border:0"><div style="font-size:22px;font-weight:700;color:#171410">Stajım<span style="color:#2563eb">Var</span></div><div style="font-size:13px;color:#78716c;margin-top:4px">Şirket Hesabı</div></div>`,
    '<div style="padding:32px">',
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#171410">${kacir(baslik)} 🎉</h1>`,
    govde ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44403c">${kacir(govde)}</p>` : '',
    '<p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#171410">Başlamak için üç adım</p>',
    `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.5">${adimlar}</table>`,
    `<p style="margin:12px 0 8px;text-align:center"><a href="${SITE}/sirket/ilan/yeni" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px">İlk ilanını oluştur</a></p>`,
    '<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#a8a29e">Takıldığın bir yer olursa iletisim@stajimvar.com adresine yaz.</p>',
    '</div>',
    `<div style="padding:20px 32px;background:#fafaf9;border-top:1px solid #eeeeee;text-align:center;font-size:12px"><a href="${SITE}" style="color:#78716c;text-decoration:none">stajimvar.com</a></div>`,
    '</div></div>',
  ].filter(Boolean).join('\n');
}

/* Takip edilen şirketin yeni ilanı (20270109010000): öğrenciye giden e-posta. */
const takipIlaniMi = (b) => b.tur === 'takip_ilan';

export function govdeKur(b) {
  if (HOSGELDIN_TURLERI.has(b.tur)) return hosgeldinHtml(b.baslik, b.govde);
  const baglanti = guvenliBaglanti(b.hedef);
  const dugme = takipIlaniMi(b) ? 'İlanı gör' : 'Başvuruyu panelde aç';
  return [
    '<div style="font:15px/1.5 system-ui;color:#111827;max-width:520px">',
    `<p style="font-weight:700;margin:0 0 8px">${kacir(b.baslik)}</p>`,
    b.govde ? `<p style="margin:0 0 16px">${kacir(b.govde)}</p>` : '',
    `<p style="margin:0 0 20px"><a href="${kacir(baglanti)}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:10px">${dugme}</a></p>`,
    '<p style="font-size:12px;color:#6B7280;margin:0">Bu e-posta StajımVar hesabındaki bildirimin kopyası. ',
    takipIlaniMi(b)
      ? `Bu şirketi takip ettiğin için gönderildi; <a href="${SITE}/ayarlar/bildirimler" style="color:#6B7280">Bildirim ayarları</a>ndan kapatabilirsin.</p>`
      : 'Aday bilgileri yalnız şirket panelinde görünür.</p>',
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
