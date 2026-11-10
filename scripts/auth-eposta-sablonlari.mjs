#!/usr/bin/env node
/**
 * KİMLİK E-POSTALARI TÜRKÇE (10 Kasım 2026, kullanıcı bildirdi)
 *
 * Hesap onayı, şifre yenileme vb. Supabase'in varsayılan İngilizce
 * metniyle gidiyordu ("Confirm your email address"). Şablonlar depoda
 * (supabase/templates/*.html); yayın hattı bunları yönetim API'siyle
 * yalnız mailer_* alanlarına yazıyor — SMTP, yönlendirme adresleri ve
 * öteki kimlik ayarlarına dokunmuyor. Yazdıktan sonra geri okuyup
 * karşılaştırıyor.
 *
 * Bağlantı {{ .ConfirmationURL }} olduğu gibi: akış değişmiyor.
 * İşveren kaydında (user_metadata.kayit_niyeti) onay metni şirkete göre.
 */
import { readFileSync } from 'node:fs';

const KOK = new URL('../supabase/templates/', import.meta.url);

export const KONULAR = {
  confirmation: 'StajımVar: e-posta adresini onayla',
  recovery: 'StajımVar: şifreni yenile',
  magic_link: 'StajımVar: giriş bağlantın',
  email_change: 'StajımVar: yeni e-posta adresini onayla',
  invite: "StajımVar'a davet edildin",
  reauthentication: 'StajımVar doğrulama kodun',
};

/*
  KİMLİK AYARLARI DA DEPODA (10 Kasım 2026, kullanıcı kararı)
  - rate_limit_email_sent: proje genelinde saatlik kimlik e-postası. 30'du;
    bir saatte 30'dan fazla kayıt olunca fazlası onay e-postası alamıyordu.
    Gönderim Google Workspace SMTP'si (günde 2000 sınırı) → 200/saat.
  - smtp_sender_name: "StajimVar" (ı yerine i) yazıyordu.
  - mailer_otp_exp: bağlantı 1 saat geçerliydi; e-postaya geç bakan işveren
    için kısaydı → 24 saat (şablonlarda "Bağlantı 24 saat geçerli.").
*/
export const AYARLAR = {
  rate_limit_email_sent: 200,
  smtp_sender_name: 'StajımVar',
  mailer_otp_exp: 86400,
};

export function yuk() {
  const govde = { ...AYARLAR };
  for (const [ad, konu] of Object.entries(KONULAR)) {
    govde[`mailer_subjects_${ad}`] = konu;
    govde[`mailer_templates_${ad}_content`] = readFileSync(new URL(`${ad}.html`, KOK), 'utf8');
  }
  return govde;
}

async function main() {
  const anahtar = process.env.SUPABASE_ACCESS_TOKEN;
  const proje = process.env.SUPABASE_PROJECT_REF;
  if (!anahtar || !proje) {
    console.error('SUPABASE_ACCESS_TOKEN ve SUPABASE_PROJECT_REF gerekli.');
    process.exit(1);
  }
  const adres = `https://api.supabase.com/v1/projects/${proje}/config/auth`;
  const basliklar = { Authorization: `Bearer ${anahtar}`, 'content-type': 'application/json' };
  const govde = yuk();
  const yaz = await fetch(adres, { method: 'PATCH', headers: basliklar, body: JSON.stringify(govde) });
  if (!yaz.ok) {
    console.error(`Şablonlar yazılamadı: HTTP ${yaz.status} ${(await yaz.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const oku = await fetch(adres, { headers: basliklar });
  if (!oku.ok) {
    console.error(`Ayar geri okunamadı: HTTP ${oku.status}`);
    process.exit(1);
  }
  const canli = await oku.json();
  const farkli = Object.keys(govde).filter((k) => canli[k] !== govde[k]);
  if (farkli.length) {
    console.error(`Canlıda farklı kalan alanlar: ${farkli.join(', ')}`);
    process.exit(1);
  }
  console.log(`${Object.keys(KONULAR).length} kimlik e-postası şablonu ve ${Object.keys(AYARLAR).length} kimlik ayarı canlıda ve depoyla aynı.`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('auth-eposta-sablonlari.mjs')) {
  await main();
}
