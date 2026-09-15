#!/usr/bin/env node
/**
 * İLAN KARAR BİLDİRİM KUYRUĞU İŞÇİSİ
 *
 * `ilan_incele` yöneticinin onay/ret kararını yazıyor ama kimseye haber
 * vermiyordu — şirket kararı öğrenmek için panele girmek zorundaydı. Bu
 * betik `public.listings` üzerindeki karar bildirim kuyruğunu (bkz.
 * 20261010010000) işleyip şirkete e-posta gönderir.
 *
 * NEREDE ÇALIŞIYOR
 * ----------------
 * `ilan-bildirim-kuyrugu.mjs` ile AYNI GitHub Actions işinde, aynı
 * zamanlanmış işin ikinci adımı olarak. İkinci bir zamanlama sistemi
 * kurulmadı; sırlar da aynı (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * RESEND_API_KEY, RESEND_FROM) — yeni bir alıcı sırrı gerekmiyor, çünkü
 * alıcı sabit değil: her karar için RPC şirketin kendi üyesinin
 * e-postasını döndürüyor.
 *
 * KAYIT HİÇBİR DURUMDA BOZULMUYOR
 * --------------------------------
 * Betik `listings` satırını hiç silmiyor, kararı değiştirmiyor; yalnız
 * dört kuyruk alanına dokunuyor (RPC üzerinden). Gönderim başarısız
 * olursa deneme sayısı ve güvenli hata metni yazılıyor, karar kuyrukta
 * kalıyor.
 */

const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const GONDEREN = process.env.RESEND_FROM || 'StajımVar <basvuru@stajimvar.com>';

/** Tek koşuda en fazla kaç karar bildirimi. Kalanı sonraki koşuya. */
const PARTI = Number(process.env.ILAN_KARAR_BILDIRIM_PARTI || 20);
/** Alınan kayıt bu süre boyunca başka bir işçiye görünmüyor. */
const KILIT_DAKIKA = 10;

const kuru = process.argv.includes('--kuru');

function eksikler() {
  const e = [];
  if (!ADRES) e.push('SUPABASE_URL');
  if (!ANAHTAR) e.push('SUPABASE_SERVICE_ROLE_KEY');
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

/** Kullanıcı metni (ilan başlığı, ret notu) HTML'e kaçırılmadan girmiyor. */
function kacir(deger) {
  return String(deger ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function govdeKur(b) {
  const onaylandi = b.status === 'published';
  const baslik = kacir(b.title || 'İlanınız');
  return [
    `<p style="font:14px system-ui">${onaylandi ? 'İyi haber' : 'Bir güncelleme var'} —` +
      ` <strong>${baslik}</strong> ilanınız ${onaylandi ? 'incelendi ve yayına alındı.' : 'incelendi ve şu an yayında değil.'}</p>`,
    !onaylandi && b.review_note
      ? `<p style="font:14px system-ui;white-space:pre-wrap"><strong>Yönetici notu:</strong> ${kacir(b.review_note)}</p>`
      : '',
    !onaylandi
      ? '<p style="font:14px system-ui">Notu okuyup ilanı düzenleyip yeniden gönderebilirsiniz.</p>'
      : '',
    '<p style="font:13px system-ui;color:#6B7280">İlanı görmek için: ' +
      'https://stajimvar.com/sirket/ilanlar</p>',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * `Idempotency-Key` KARARIN kimliği: ilan id'si + kararın yazıldığı an.
 * Aynı ilan yeniden incelenip ikinci bir karar alırsa (`reviewed_at`
 * değişir) bu ikinci karar YENİ bir anahtarla gönderiliyor — önceki
 * kararın gönderilmiş olması ikincisini susturmuyor.
 */
async function gonder(b) {
  const y = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND}`,
      'content-type': 'application/json',
      'Idempotency-Key': `ilan-karar-${b.id}-${new Date(b.reviewed_at).getTime()}`,
    },
    body: JSON.stringify({
      from: GONDEREN,
      to: [b.alici_email],
      subject: `${b.status === 'published' ? 'İlanınız yayında' : 'İlanınız için bir not var'}: ${b.title || ''}`.trim(),
      html: govdeKur(b),
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
    process.exit(1);
  }

  const kararlar = await rpc('ilan_karar_bildirimi_kuyruktan_al', {
    p_adet: PARTI,
    p_kilit_dakika: KILIT_DAKIKA,
  });

  if (!kararlar || kararlar.length === 0) {
    console.log('Karar bildirim kuyruğu boş.');
    return;
  }
  console.log(`Kuyruktan alındı: ${kararlar.length}`);

  let basarili = 0;
  let basarisiz = 0;

  for (const b of kararlar) {
    if (kuru) {
      console.log(`  [kuru] ${b.id} ${b.status} → ${b.alici_email ?? '(alıcı yok)'}`);
      continue;
    }
    try {
      /*
        ALICI YOKSA GÖNDERİM DENENMİYOR, AMA YİNE DE "BAŞARISIZ" YAZILIYOR

        Şirketin hiç üyesi olmayan bir kaydı sonsuza dek her koşuda
        yeniden çekmek yerine, deneme sınırına tabi bir hata olarak
        işaretleniyor — sekiz denemenin sonunda kuyruktan düşüyor ve
        sebep `karar_bildirim_son_hata`da kalıyor.
      */
      if (!b.alici_email) throw new Error('Şirketin bildirim gönderilecek bir üyesi yok.');
      await gonder(b);
      await rpc('ilan_karar_bildirimi_kuyruk_isaretle', { p_id: b.id, p_basarili: true });
      basarili += 1;
      console.log(`  gönderildi ${b.id}`);
    } catch (hata) {
      basarisiz += 1;
      const mesaj = hata instanceof Error ? hata.message : String(hata);
      console.log(`  BAŞARISIZ ${b.id}: ${mesaj}`);
      try {
        await rpc('ilan_karar_bildirimi_kuyruk_isaretle', {
          p_id: b.id,
          p_basarili: false,
          p_hata: mesaj,
        });
      } catch (ikinci) {
        console.error(`::warning::Hata işaretlenemedi ${b.id}: ${ikinci.message}`);
      }
    }
  }

  console.log(`Sonuç: ${basarili} gönderildi, ${basarisiz} başarısız.`);
}

main().catch((hata) => {
  console.error(`::error::İlan karar bildirim kuyruğu: ${hata.message}`);
  process.exit(1);
});
