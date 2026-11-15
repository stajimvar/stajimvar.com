/**
 * HESAP SİLME — KULLANICININ KENDİ HESABI (20270114010000)
 *
 * Akış (sıra önemli):
 *   1. Oturum: çağıranın JWT'si doğrulanıyor; yalnız KENDİ hesabı siliniyor
 *      (kimlik gövdeden değil, oturumdan alınıyor).
 *   2. Onay: gövdede `onay: 'SİL'` yoksa hiçbir şey yapılmıyor.
 *   3. Kapılar: yönetici hesabı ve şirketin TEK sahibi silinmiyor (409).
 *   4. Dosyalar: CV, başvuru CV kopyaları, fotoğraf, kapak, paylaşım
 *      görselleri kovalardan kaldırılıyor. Şirket sayfasında kullanılan
 *      logo kalıyor (şirketin malı).
 *   5. Engelleyen bağlar çözülüyor (`hesap_silmeye_hazirla`).
 *   6. `auth.admin.deleteUser` — profil, başvurular, paylaşımlar, mesajlar
 *      ve öteki kayıtlar zincirle siliniyor (ON DELETE CASCADE).
 *   7. "Hesabın silindi" e-postası (KVKK: bilgi verilmesi). Gönderilemezse
 *      silme geri alınmıyor; yanıtta belirtiliyor.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE = 'https://stajimvar.com';
const ONAY = 'SİL';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const yanit = (govde: Record<string, unknown>, status = 200) =>
  Response.json(govde, { status, headers: cors });

function silindiHtml() {
  return [
    '<div style="background:#f7f7f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif">',
    '<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">',
    `<div style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #eeeeee"><img src="${SITE}/logo.png" alt="" width="52" height="52" style="display:block;margin:0 auto 10px;width:52px;height:52px;border:0"><div style="font-size:22px;font-weight:700;color:#171410">Stajım<span style="color:#2563eb">Var</span></div></div>`,
    '<div style="padding:32px">',
    '<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#171410">Hesabın silindi</h1>',
    '<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c">İsteğin üzerine StajımVar hesabın ve buna bağlı profil, CV, fotoğraf, başvuru ve paylaşım kayıtların kalıcı olarak silindi.</p>',
    '<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c">Bu adresle artık giriş yapılamaz. İstersen istediğin zaman yeni bir hesap açabilirsin.</p>',
    '<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#a8a29e">Bu işlemi sen yapmadıysan iletisim@stajimvar.com adresine yaz.</p>',
    '</div>',
    `<div style="padding:20px 32px;background:#fafaf9;border-top:1px solid #eeeeee;text-align:center;font-size:12px"><a href="${SITE}" style="color:#78716c;text-decoration:none">stajimvar.com</a></div>`,
    '</div></div>',
  ].join('\n');
}

async function epostaGonder(alici: string, kimlik: string): Promise<boolean> {
  const anahtar = Deno.env.get('RESEND_API_KEY');
  if (!anahtar) return false;
  try {
    const y = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anahtar}`,
        'content-type': 'application/json',
        'Idempotency-Key': `hesap-silindi-${kimlik}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM') || 'StajımVar <basvuru@stajimvar.com>',
        to: [alici],
        subject: 'StajımVar hesabın silindi',
        html: silindiHtml(),
      }),
    });
    return y.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return yanit({ kod: 'yontem' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const jwt = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return yanit({ kod: 'oturum-yok' }, 401);

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /* 1) Kimlik oturumdan; gövdedeki hiçbir kimlik kullanılmıyor. */
  const { data: kim, error: kimHatasi } = await db.auth.getUser(jwt);
  const kullanici = kim?.user;
  if (kimHatasi || !kullanici) return yanit({ kod: 'oturum-yok' }, 401);

  /* 2) Açık onay. */
  let govde: { onay?: unknown } = {};
  try {
    govde = await request.json();
  } catch {
    /* boş gövde: onay yok */
  }
  if (govde.onay !== ONAY) return yanit({ kod: 'onay-yok' }, 400);

  /* 3) Kapılar. */
  const { data: kontrol, error: kontrolHatasi } = await db.rpc('hesap_silme_on_kontrol', { p_kullanici: kullanici.id });
  if (kontrolHatasi) return yanit({ kod: 'kontrol-hatasi' }, 500);
  const k = (kontrol ?? {}) as { yonetici?: boolean; son_sahip?: string[] };
  if (k.yonetici) return yanit({ kod: 'yonetici' }, 409);
  if (k.son_sahip?.length) return yanit({ kod: 'son-sahip', sirketler: k.son_sahip }, 409);

  /* 4) Dosyalar. Kova başına, yüzerli parçalar. */
  const { data: dosyalar, error: dosyaHatasi } = await db.rpc('hesap_dosyalari', { p_kullanici: kullanici.id });
  if (dosyaHatasi) return yanit({ kod: 'dosya-listesi' }, 500);
  const kovalar = new Map<string, string[]>();
  for (const d of (dosyalar ?? []) as { kova: string; yol: string }[]) {
    kovalar.set(d.kova, [...(kovalar.get(d.kova) ?? []), d.yol]);
  }
  for (const [kova, yollar] of kovalar) {
    for (let i = 0; i < yollar.length; i += 100) {
      const { error } = await db.storage.from(kova).remove(yollar.slice(i, i + 100));
      if (error) return yanit({ kod: 'dosya-silinemedi' }, 500);
    }
  }

  /* 5) Engelleyen bağlar. */
  const { error: hazirlikHatasi } = await db.rpc('hesap_silmeye_hazirla', { p_kullanici: kullanici.id });
  if (hazirlikHatasi) return yanit({ kod: 'hazirlik-hatasi' }, 500);

  /* 6) Hesap ve zincirdeki kayıtlar. */
  const { error: silmeHatasi } = await db.auth.admin.deleteUser(kullanici.id);
  if (silmeHatasi) return yanit({ kod: 'silinemedi' }, 500);

  /* 7) Bilgi e-postası. */
  const eposta = kullanici.email ? await epostaGonder(kullanici.email, kullanici.id) : false;
  return yanit({ ok: true, eposta });
});
