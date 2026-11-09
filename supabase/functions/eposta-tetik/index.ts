/**
 * E-POSTA TETİĞİ — OLAY ANINDA GÖNDERİM (20270103010000)
 *
 * NEDEN
 * -----
 * E-postalar GitHub Actions'ın 10 dakikalık işine bağlıydı. Ölçüldü
 * (9 Kasım 2026): GitHub o işi en son 6 saat önce çalıştırmıştı; başvuru
 * e-postası şirkete gitmemişti. Bu işlev veritabanı tetikleyicisinden
 * (pg_net) olay anında çağrılıyor ve üç kuyruğu işliyor:
 *   · yeni şirket talebi → yönetici (ILAN_BILDIRIM_ALICI)
 *   · ekip daveti → davet edilen adres
 *   · yeni başvuru bildirimi → şirket üyesinin doğrulanmış e-postası
 * GitHub işi YEDEK olarak duruyor; ikisi aynı kuyruğu ve aynı
 * Idempotency-Key'i kullanıyor (sağlayıcı aynı anahtarla ikinci e-postayı
 * göndermiyor, kuyruk satırları `for update skip locked` ile alınıyor).
 *
 * METİNLER scripts/sirket-talebi-epostasi.mjs, scripts/ekip-daveti-epostasi.mjs
 * ve scripts/bildirim-epostasi.mjs ile AYNI; biri değişirse öteki de
 * değişmeli (tests/eposta-tetik.test.mjs başlıkları karşılaştırıyor).
 *
 * YETKİ
 * -----
 * JWT doğrulaması kapalı (tetikleyici kullanıcı oturumu taşımıyor). Onun
 * yerine `x-eposta-tetik` başlığı Vault'taki gizli değerle karşılaştırılıyor
 * (`eposta_tetik_dogrula`). İşlev zaten yalnız bekleyen kuyruğu işliyor;
 * dışarıdan çağrılsa da yeni bir e-posta üretemez.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE = 'https://stajimvar.com';

const kacir = (d: unknown) =>
  String(d ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const tekSatir = (d: unknown, n: number) => String(d ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, n);

type Rpc = (ad: string, args?: Record<string, unknown>) => Promise<unknown[]>;

async function gonder(anahtar: string, idem: string, to: string, subject: string, html: string) {
  const y = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${anahtar}`, 'content-type': 'application/json', 'Idempotency-Key': idem },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM') || 'StajımVar <basvuru@stajimvar.com>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!y.ok) {
    const ham = (await y.text()).slice(0, 200).replace(/Bearer\s+\S+/gi, 'Bearer ***');
    throw new Error(`Resend HTTP ${y.status}: ${ham}`);
  }
}

async function kuyruk(
  rpc: Rpc,
  al: string,
  isaretle: string,
  isle: (s: Record<string, unknown>) => Promise<void>,
): Promise<number> {
  const satirlar = (await rpc(al, { p_adet: 20, p_kilit_dakika: 10 })) as Record<string, unknown>[];
  let n = 0;
  for (const s of satirlar) {
    try {
      await isle(s);
      await rpc(isaretle, { p_id: s.id, p_basarili: true });
      n += 1;
    } catch (h) {
      await rpc(isaretle, { p_id: s.id, p_basarili: false, p_hata: h instanceof Error ? h.message : String(h) }).catch(() => undefined);
    }
  }
  return n;
}

Deno.serve(async (request) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: yetkili } = await db.rpc('eposta_tetik_dogrula', {
    p_anahtar: request.headers.get('x-eposta-tetik') ?? '',
  });
  if (yetkili !== true) return Response.json({ error: 'Yetkisiz.' }, { status: 403 });

  const resend = Deno.env.get('RESEND_API_KEY');
  if (!resend) return Response.json({ error: 'RESEND_API_KEY yok' }, { status: 500 });
  const yonetici = Deno.env.get('ILAN_BILDIRIM_ALICI');

  const rpc: Rpc = async (ad, args) => {
    const { data, error } = await db.rpc(ad, args ?? {});
    if (error) throw new Error(`${ad}: ${error.message}`);
    return (Array.isArray(data) ? data : data == null ? [] : [data]) as unknown[];
  };

  const sonuc: Record<string, number | string> = {};

  /* 1) Yeni şirket talebi → yönetici */
  if (yonetici) {
    sonuc.sirket_talebi = await kuyruk(rpc, 'sirket_talebi_eposta_kuyruktan_al', 'sirket_talebi_eposta_isaretle', async (t) => {
      const durum = String(t.karar ?? '').startsWith('Otomatik onaylandı') ? 'otomatik onaylandı' : 'onay bekliyor';
      const satir = (ad: string, d: unknown) => (d ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280">${ad}</td><td>${kacir(d)}</td></tr>` : '');
      const html = [
        '<table style="border-collapse:collapse;font:14px system-ui">',
        satir('Durum', t.karar), satir('Şirket', t.sirket_adi), satir('Web sitesi', t.web_sitesi),
        satir('Sektör', t.sektor), satir('Şehir', t.sehir),
        satir('Yetkili', [t.yetkili_adi, t.gorev].filter(Boolean).join(' · ')),
        satir('Hesap e-postası', t.hesap_eposta),
        satir('Formdaki e-posta', t.kurumsal_eposta !== t.hesap_eposta ? t.kurumsal_eposta : null),
        satir('Telefon', t.telefon), satir('Tarih', t.created_at),
        '</table>',
        `<p style="font:13px system-ui;color:#6B7280">İncelemek için: ${SITE}/yonetim/onay</p>`,
      ].filter(Boolean).join('\n');
      await gonder(resend, `sirket-talebi-${t.id}`, yonetici, `Yeni şirket talebi (${durum}): ${tekSatir(t.sirket_adi ?? 'Şirket', 80)}`, html);
    });
  } else {
    sonuc.sirket_talebi = 'ILAN_BILDIRIM_ALICI yok';
  }

  /* 2) Ekip daveti → davet edilen */
  const ROL: Record<string, string> = { Recruiter: 'işe alım sorumlusu', Viewer: 'görüntüleyici' };
  sonuc.ekip_daveti = await kuyruk(rpc, 'ekip_daveti_eposta_kuyruktan_al', 'ekip_daveti_eposta_isaretle', async (d) => {
    const kim = d.davet_eden_ad ? `${kacir(d.davet_eden_ad)}, ` : '';
    const adim = d.hesap_var
      ? "Bu e-posta adresiyle StajımVar'a giriş yap; davet şirket profili sayfasında seni bekliyor."
      : "Bu e-posta adresiyle StajımVar'a ücretsiz kayıt ol (İşverenim seçeneğiyle); e-postanı doğruladıktan sonra davet şirket profili sayfasında seni bekliyor.";
    const html = [
      '<div style="font:15px/1.5 system-ui;color:#111827;max-width:520px">',
      `<p style="font-weight:700;margin:0 0 8px">${kim}${kacir(d.sirket_adi)} seni StajımVar'daki işveren ekibine ${kacir(ROL[String(d.rol)] ?? 'üye')} olarak davet etti.</p>`,
      `<p style="margin:0 0 16px">${adim}</p>`,
      `<p style="margin:0 0 20px"><a href="${SITE}/isveren/baslangic" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:10px">Daveti aç</a></p>`,
      '<p style="font-size:12px;color:#6B7280;margin:0">Bu daveti beklemiyorsan e-postayı yok sayabilirsin; davet kabul edilmeden hiçbir yetki açılmaz.</p>',
      '</div>',
    ].join('\n');
    await gonder(resend, `ekip-daveti-${d.id}`, String(d.eposta), `${tekSatir(d.sirket_adi ?? 'Bir şirket', 80)} seni StajımVar'daki ekibine davet etti`, html);
  });

  /* 3) Yeni başvuru → şirket üyesi; takip edilen şirketin yeni ilanı → öğrenci (20270109010000) */
  sonuc.bildirim = await kuyruk(rpc, 'bildirim_eposta_kuyruktan_al', 'bildirim_eposta_isaretle', async (b) => {
    const hedef = typeof b.hedef === 'string' && /^\/(?!\/)/.test(b.hedef) ? `${SITE}${b.hedef}` : `${SITE}/`;
    const takipIlani = b.tur === 'takip_ilan';
    const html = [
      '<div style="font:15px/1.5 system-ui;color:#111827;max-width:520px">',
      `<p style="font-weight:700;margin:0 0 8px">${kacir(b.baslik)}</p>`,
      b.govde ? `<p style="margin:0 0 16px">${kacir(b.govde)}</p>` : '',
      `<p style="margin:0 0 20px"><a href="${kacir(hedef)}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:10px">${takipIlani ? 'İlanı gör' : 'Başvuruyu panelde aç'}</a></p>`,
      '<p style="font-size:12px;color:#6B7280;margin:0">Bu e-posta StajımVar hesabındaki bildirimin kopyası. ',
      takipIlani
        ? `Bu şirketi takip ettiğin için gönderildi; <a href="${SITE}/ayarlar/bildirimler" style="color:#6B7280">Bildirim ayarları</a>ndan kapatabilirsin.</p>`
        : 'Aday bilgileri yalnız şirket panelinde görünür.</p>',
      '</div>',
    ].filter(Boolean).join('\n');
    await gonder(resend, `bildirim-${b.id}`, String(b.alici), tekSatir(b.baslik ?? 'StajımVar bildirimi', 120), html);
  });

  return Response.json(sonuc);
});
