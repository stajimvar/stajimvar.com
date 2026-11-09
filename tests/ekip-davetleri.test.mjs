import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { govdeKur, konuKur } from '../scripts/ekip-daveti-epostasi.mjs';

/* EKİP DAVETİ (9 Kasım 2026, kullanıcı: "önerilerini yap"). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const GOC = oku('supabase/migrations/20261231010000_ekip_davetleri.sql').replace(/\/\*[\s\S]*?\*\//g, '');
const islev = (ad) => GOC.slice(GOC.indexOf(`function public.${ad}`)).split(/\n\$\$;/)[0];

test('davet: yalnız sahip, yalnız doğrulanmış şirket, günlük ve bekleyen sınırı', () => {
  const f = islev('ekip_daveti_gonder');
  assert.match(f, /if not public\.sirket_sahibi_mi\(p_sirket\) then/);
  assert.match(f, /c\.id = p_sirket and c\.verified/);
  assert.match(f, /interval '24 hours'\) >= 10/);
  assert.match(f, /d\.durum = 'bekliyor'\) >= 20/);
  assert.match(f, /p_rol not in \('Recruiter', 'Viewer'\)/);
  assert.match(islev('sirket_sahibi_mi'), /m\.is_owner/);
});

test('kabul: hesabın DOĞRULANMIŞ e-postası davet adresiyle aynı olmalı; sahip yapılmıyor', () => {
  const f = islev('ekip_davetini_kabul_et');
  assert.match(f, /u\.id = auth\.uid\(\) and u\.email_confirmed_at is not null/);
  assert.match(f, /d\.eposta <> e/);
  assert.match(f, /values \(d\.company_id, auth\.uid\(\), d\.rol, false\)/);
  assert.match(f, /role is distinct from 'admin'/);
});

test('tablo yalnız işlevlerden; e-posta kuyruğu yalnız service_role; sahip çıkarılamıyor', () => {
  assert.match(GOC, /revoke all on public\.sirket_davetleri from public, anon, authenticated;/);
  assert.doesNotMatch(GOC, /create policy/);
  assert.match(GOC, /grant execute on function public\.ekip_daveti_eposta_kuyruktan_al\(integer, integer\) to service_role;/);
  assert.match(GOC, /revoke all on function public\.ekip_daveti_eposta_kuyruktan_al\(integer, integer\) from public, anon, authenticated;/);
  assert.match(islev('ekip_uyesini_cikar'), /and not m\.is_owner/);
});

test('e-posta: sabit metin, kaçırılmış şirket adı, konu tek satır', () => {
  const g = govdeKur({ sirket_adi: '<b>Acme</b>', rol: 'Recruiter', davet_eden_ad: null, hesap_var: false });
  assert.ok(g.includes('&lt;b&gt;Acme&lt;/b&gt;'));
  assert.match(g, /ücretsiz kayıt ol/);
  assert.match(g, /https:\/\/stajimvar\.com\/isveren\/baslangic/);
  assert.doesNotMatch(konuKur({ sirket_adi: 'A\nB' }), /\n/);
});

test('arayüz: Şirketim → Ayarlar → Ekip; davetler şirket profili sayfasında; iş akışı adımı', () => {
  const p = oku('src/sirket/SirketProfili.tsx');
  assert.match(p, /const EKIP_YOLU = '\/sirket\/profil\/ekip';/);
  assert.match(p, /etiket: 'Ekip ve davetler'/);
  assert.match(p, /sahipMi=\{baglam\.rol === 'Owner'\}/);
  const b = oku('src/components/IsverenBaslangic.tsx');
  assert.match(b, /benimDavetlerim\(\)\.then/);
  assert.match(b, /window\.location\.assign\('\/sirket\/ilanlar'\)/);
  assert.match(oku('.github/workflows/sirket-talebi-epostasi.yml'), /run: node scripts\/ekip-daveti-epostasi\.mjs/);
});
