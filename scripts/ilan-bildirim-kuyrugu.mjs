#!/usr/bin/env node
/**
 * İLAN BİLDİRİM KUYRUĞU İŞÇİSİ
 *
 * /ilan-bildir formu bildirimi kalıcı olarak kaydediyordu ama kimse haber
 * almıyordu: kuyruk alanları vardı, kuyruğu işleyen bir şey yoktu. Bu
 * betik kuyruktaki bildirimleri yöneticiye e-postayla gönderiyor.
 *
 * NEREDE ÇALIŞIYOR
 * ----------------
 * GitHub Actions zamanlanmış işi (.github/workflows/ilan-bildirim-kuyrugu.yml),
 * yani depodaki mevcut otomasyon altyapısı — ikinci bir sistem kurulmadı.
 * Bu yüzden `automation/.env` YOK sayılıyor: değişkenler iş akışının
 * sırlarından geliyor. Yerel dosyayı okumaya çalışmak, canlıda sessizce
 * "anahtar yok" durumuna düşmek olurdu.
 *
 * NEDEN PAGES'E RESEND ANAHTARI EKLENMEDİ
 * ---------------------------------------
 * Gönderen taraf burası. Uç nokta yalnız kaydı yazıyor ve e-postayı hiç
 * denemiyor; Pages'e posta anahtarı koymak, kullanmayan bir katmana sır
 * dağıtmak olurdu.
 *
 * KAYIT E-POSTA HATASINDA KORUNUYOR
 * ---------------------------------
 * Betik bildirimi hiçbir durumda silmiyor ve içeriğini değiştirmiyor;
 * yalnız üç kuyruk alanına dokunuyor. Gönderim başarısız olursa deneme
 * sayısı ve güvenli hata metni yazılıyor, bildirim kuyrukta kalıyor.
 */

const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const GONDEREN = process.env.RESEND_FROM || 'StajımVar <basvuru@stajimvar.com>';
const ALICI = process.env.ILAN_BILDIRIM_ALICI;

/** Tek koşuda en fazla kaç bildirim. Kalanı sonraki koşuya. */
const PARTI = Number(process.env.ILAN_BILDIRIM_PARTI || 20);
/*
  KİLİT PENCERESİ

  Alınan kayıt bu süre boyunca başka bir işçiye görünmüyor. İş akışı
  saatte bir koşuyor; on dakika, bir koşunun e-postaları göndermesi için
  bolca yeterli ve işçi çökerse kayıt en fazla on dakika bekliyor.
*/
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

/**
 * KULLANICI METNİ E-POSTADA GÜVENLİ
 *
 * Gövde HTML olarak gönderiliyor ve içinde bildirimi yapan kişinin yazdığı
 * metin var. Kaçırılmazsa `<script>` ya da bir `<a href>` yöneticinin
 * posta istemcisinde çalışabilir hâle gelirdi — yani formumuz, kendi
 * yöneticimize saldırı taşıyan bir kanal olurdu.
 *
 * Tırnaklar da kaçırılıyor: metin yalnız düğüm içeriğinde değil, gerekirse
 * bir öznitelik değerinde de duruyor.
 */
function kacir(deger) {
  return String(deger ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SEBEP = {
  kapanmis_ilan: 'Kapanmış ilan',
  yanlis_bilgi: 'Yanlış bilgi',
  ucret_talebi: 'Ücret talebi',
  ayirimci_ifade: 'Ayrımcı ifade',
  sahte_ilan: 'Sahte ilan',
  kirik_baglanti: 'Kırık bağlantı',
  diger: 'Diğer',
};

function govdeKur(b) {
  const satir = (ad, deger) =>
    deger ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280">${ad}</td><td>${kacir(deger)}</td></tr>` : '';
  return [
    b.test_mi ? '<p><strong>TEST KAYDI</strong> — gerçek bir öğrenci bildirimi değil.</p>' : '',
    '<table style="border-collapse:collapse;font:14px system-ui">',
    satir('Sorun', SEBEP[b.reason] ?? b.reason),
    satir('Şirket', b.company_name),
    satir('Pozisyon', b.position_title),
    satir('İlan', b.listing_url),
    satir('İletişim', b.reporter_email),
    satir('Tarih', b.created_at),
    '</table>',
    b.details
      ? `<p style="font:14px system-ui;white-space:pre-wrap">${kacir(b.details)}</p>`
      : '',
    '<p style="font:13px system-ui;color:#6B7280">İncelemek için: ' +
      'https://stajimvar.com/yonetim/talepler</p>',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * E-POSTAYI GÖNDERİR.
 *
 * `Idempotency-Key` bildirimin KENDİ kimliği: sağlayıcı aynı anahtarla
 * gelen ikinci isteği yeni bir e-posta olarak göndermiyor. Bu, "e-posta
 * gitti ama veritabanı güncellemesi başarısız oldu" hâlinde ikinci koşunun
 * aynı bildirimi yöneticiye tekrar göndermesini engelliyor — kendi
 * kilidimiz o durumda işe yaramaz, çünkü kayıt hâlâ gönderilmemiş
 * görünüyor.
 */
async function gonder(b) {
  const y = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND}`,
      'content-type': 'application/json',
      'Idempotency-Key': `ilan-bildirim-${b.id}`,
    },
    body: JSON.stringify({
      from: GONDEREN,
      to: [ALICI],
      subject:
        `${b.test_mi ? '[TEST] ' : ''}İlan bildirimi: ` +
        `${SEBEP[b.reason] ?? b.reason}${b.company_name ? ` — ${b.company_name}` : ''}`,
      html: govdeKur(b),
      /* Cevap bildirimi yapana gitsin; adres bıraktıysa. */
      ...(b.reporter_email ? { reply_to: b.reporter_email } : {}),
    }),
  });
  if (!y.ok) {
    /*
      HATA METNİ GÜVENLİ TUTULUYOR

      Sağlayıcının gövdesi isteği yankılayabiliyor; istek başlıklarında
      API anahtarı var. Yalnız durum kodu ve gövdenin ilk 200 karakteri
      saklanıyor, `Bearer` dizileri temizleniyor — bu alan yönetici
      ekranında GÖRÜNÜYOR.
    */
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

  const kayitlar = await rpc('ilan_bildirimi_kuyruktan_al', {
    p_adet: PARTI,
    p_kilit_dakika: KILIT_DAKIKA,
  });

  if (!kayitlar || kayitlar.length === 0) {
    console.log('Kuyruk boş.');
    return;
  }
  console.log(`Kuyruktan alındı: ${kayitlar.length}`);

  let basarili = 0;
  let basarisiz = 0;

  for (const b of kayitlar) {
    if (kuru) {
      console.log(`  [kuru] ${b.id} ${b.reason} ${b.listing_url.slice(0, 60)}`);
      continue;
    }
    try {
      await gonder(b);
      /*
        İŞARETLEME GÖNDERİMDEN SONRA

        Sıra tersine çevrilse ("önce işaretle, sonra gönder"), gönderim
        hatası bildirimi gönderilmiş gösterirdi ve yönetici haberi hiç
        almazdı. Bu sırada işaretleme başarısız olursa kayıt kuyrukta
        kalıyor; tekrar e-postayı önleyen şey idempotency anahtarı.
      */
      await rpc('ilan_bildirimi_kuyruk_isaretle', { p_id: b.id, p_basarili: true });
      basarili += 1;
      console.log(`  gönderildi ${b.id}`);
    } catch (hata) {
      basarisiz += 1;
      const mesaj = hata instanceof Error ? hata.message : String(hata);
      console.log(`  BAŞARISIZ ${b.id}: ${mesaj}`);
      try {
        await rpc('ilan_bildirimi_kuyruk_isaretle', {
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
  /*
    SAĞLAYICI HATASI İŞİ KIRMIYOR, VERİTABANI HATASI KIRIYOR.

    Geçici bir posta hatası kırmızı bir koşu üretirse gerçek arızalar
    gürültüde kaybolur; kayıt zaten kuyrukta ve yeniden denenecek. Ama
    `ilan_bildirimi_kuyruktan_al` başarısız olursa (yukarıda) betik zaten
    fırlatarak çıkıyor.
  */
}

main().catch((hata) => {
  console.error(`::error::İlan bildirim kuyruğu: ${hata.message}`);
  process.exit(1);
});
