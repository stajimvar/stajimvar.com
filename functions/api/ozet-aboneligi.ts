/**
 * GET /api/ozet-aboneligi?t=<token> — ilan özetlerini kapatır.
 *
 * GİRİŞ GEREKTİRMİYOR: abonelikten çıkma bağlantısı e-postada duruyor
 * ve oraya tıklayan kişi giriş yapmak zorunda kalmamalı. Bir bildirimi
 * kapatmak için hesaba girmek zorunda bırakmak, kullanıcıyı ya
 * bildirime mahkûm etmek ya spam düğmesine yönlendirmek olurdu.
 *
 * TOKEN VERİTABANINDA HİÇ DURMUYOR
 * --------------------------------
 * Stateless HMAC: ne düz metin ne özet olarak saklanıyor. İçinde
 * kullanıcı kimliği, AMAÇ ve son kullanma zamanı var; imza sunucudaki
 * sırla üretiliyor ve burada doğrulanıyor.
 *
 * AMAÇ ALANI ŞART: aynı sır bir gün başka bir iş için kullanılırsa o
 * token bu uç noktada kabul edilmemeli. Sürüm de içinde ("v1"), yani
 * sözleşme değişirse eski token reddedilebiliyor.
 *
 * TOKEN'IN YETKİSİ TEK BİR ŞEY
 * ----------------------------
 * Yalnız `saved_searches.email_enabled` alanını FALSE yapıyor. Hesaba,
 * profile, başvurulara ya da başka tercihlere hiçbir erişim vermiyor:
 * uç nokta başka hiçbir tablo okumuyor/yazmıyor ve token'dan oturum
 * üretilmiyor.
 *
 * TEKRAR KULLANIM GÜVENLİ: ikinci çağrı da "kapandı" diyor. Zaten
 * kapalıyken tekrar kapatmak bir hata değil; kullanıcının gördüğü
 * sonuç aynı olmalı.
 */

interface Ortam {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  OZET_ABONELIK_SIRRI?: string;
}

const AMAC = 'ozet-abonelik.v1';

const sayfa = (baslik: string, mesaj: string, durum = 200) =>
  new Response(
    `<!doctype html><html lang="tr"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<meta name="robots" content="noindex">` +
      `<title>${baslik} — StajımVar</title></head>` +
      `<body style="font:16px/1.6 system-ui;margin:0;background:#F9FAFB;color:#111827">` +
      `<main style="max-width:32rem;margin:12vh auto;padding:0 1rem">` +
      `<h1 style="font-size:1.25rem;font-weight:800">${baslik}</h1>` +
      `<p>${mesaj}</p>` +
      `<p><a href="/" style="color:#1D4ED8;font-weight:700">StajımVar'a dön</a></p>` +
      `</main></body></html>`,
    { status: durum, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );

function zamanEsit(a: Uint8Array, b: Uint8Array): boolean {
  /*
    SABİT SÜRELİ KARŞILAŞTIRMA

    `===` ile karşılaştırmak ilk farklı bayta kadar sürerdi ve imza
    tahminini ölçülebilir hâle getirirdi.
  */
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i += 1) fark |= a[i] ^ b[i];
  return fark === 0;
}

function b64urlCoz(deger: string): Uint8Array {
  const temiz = deger.replace(/-/g, '+').replace(/_/g, '/');
  const dolgu = temiz + '='.repeat((4 - (temiz.length % 4)) % 4);
  const ham = atob(dolgu);
  return Uint8Array.from(ham, (c) => c.charCodeAt(0));
}

async function tokenDogrula(
  token: string,
  sir: string
): Promise<{ studentId: string } | { hata: string }> {
  const parcalar = token.split('.');
  if (parcalar.length !== 3) return { hata: 'bicim' };
  const [studentId, bitisMetni, imzaMetni] = parcalar;

  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return { hata: 'bicim' };

  const bitis = Number(bitisMetni);
  if (!Number.isFinite(bitis)) return { hata: 'bicim' };
  /* SÜRESİ DOLMUŞ TOKEN REDDEDİLİYOR. */
  if (bitis < Math.floor(Date.now() / 1000)) return { hata: 'sure' };

  const govde = `${AMAC}.${studentId}.${bitis}`;
  const anahtar = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sir),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const beklenen = new Uint8Array(
    await crypto.subtle.sign('HMAC', anahtar, new TextEncoder().encode(govde))
  );

  let gelen: Uint8Array;
  try {
    gelen = b64urlCoz(imzaMetni);
  } catch {
    return { hata: 'imza' };
  }
  /* DEĞİŞTİRİLMİŞ TOKEN REDDEDİLİYOR. */
  if (!zamanEsit(beklenen, gelen)) return { hata: 'imza' };

  return { studentId };
}

export const onRequestGet: PagesFunction<Ortam> = async ({ request, env }) => {
  const adres = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anahtar = env.SUPABASE_SERVICE_ROLE_KEY;
  const sir = env.OZET_ABONELIK_SIRRI;
  if (!adres || !anahtar || !sir) {
    return sayfa('Bir şey ters gitti', 'Sunucu yapılandırması eksik.', 500);
  }

  const token = new URL(request.url).searchParams.get('t') || '';
  if (!token) return sayfa('Bağlantı geçersiz', 'Abonelik bağlantısı eksik.', 400);

  const sonuc = await tokenDogrula(token, sir);
  if ('hata' in sonuc) {
    const mesaj =
      sonuc.hata === 'sure'
        ? 'Bu bağlantının süresi dolmuş. Ayarlardan kapatabilirsin.'
        : 'Bu bağlantı geçersiz.';
    return sayfa('Bağlantı geçersiz', mesaj, 400);
  }

  /*
    TEK YETKİ: `email_enabled = false`

    Başka hiçbir alan yazılmıyor. `consent_at` ve `opted_out_at`
    damgalarını veritabanı tetikleyicisi atıyor (göç 20261003010000) —
    yani geri alma anı da kayda geçiyor.
  */
  const yanit = await fetch(
    `${adres}/rest/v1/saved_searches?student_id=eq.${sonuc.studentId}&email_enabled=is.true`,
    {
      method: 'PATCH',
      headers: {
        apikey: anahtar,
        Authorization: `Bearer ${anahtar}`,
        'content-type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ email_enabled: false }),
    }
  );

  if (!yanit.ok) {
    return sayfa('Bir şey ters gitti', 'Tercih kapatılamadı, biraz sonra tekrar dene.', 502);
  }

  const satirlar = (await yanit.json()) as unknown[];
  /*
    TEKRAR KULLANIM GÜVENLİ SONUÇ VERİYOR: ikinci çağrıda değişen satır
    olmuyor ama kullanıcıya gösterilen sonuç aynı — tercih kapalı.
  */
  return sayfa(
    'Günlük ilan özetleri kapatıldı',
    satirlar.length > 0
      ? 'Bundan sonra kayıtlı aramaların için günlük e-posta göndermeyeceğiz. ' +
          'Kayıtlı aramaların silinmedi; istediğinde ayarlardan tekrar açabilirsin.'
      : 'Günlük ilan özetleri zaten kapalı. Başka bir işlem yapılmadı.'
  );
};
