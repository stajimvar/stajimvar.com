import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { OTOMATIK_KARAR_METINLERI, otomatikKararMetni } from '../src/lib/isveren-profil-formu.mjs';

/*
  YENİ ŞİRKET TALEPLERİ DE OTOMATİK (9 Kasım 2026, kullanıcı isteği):
  onaylanamayan talep yöneticiye kalıyor ve nedeni bildiriliyor.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const HAM = oku('supabase/migrations/20261228010000_sirket_talebi_otomatik.sql');
const GOC = HAM.replace(/\/\*[\s\S]*?\*\//g, '');

test('karar hesabın DOĞRULANMIŞ e-postasıyla; formdaki adresle değil', () => {
  const f = GOC.slice(GOC.indexOf('function public.sirket_otomatik_karar'), GOC.indexOf('function public.otomatik_karar_metni'));
  assert.match(f, /from auth\.users u\s*where u\.id = p_user and u\.email_confirmed_at is not null/);
  assert.match(f, /'ELLE_INCELE:EPOSTA_DOGRULANMAMIS'/);
  const sah = GOC.slice(GOC.indexOf('function public.company_claim_otomatik_degerlendir'), GOC.indexOf('function public.yonetici_sahiplenme_bildir'));
  assert.match(sah, /karar := public\.sirket_otomatik_karar\(new\.user_id, site\);/);
  assert.doesNotMatch(sah, /sirket_dogrulama_karari\(site, new\.work_email\)/);
});

test('yeni şirket talebi: eşleşirse uygulanıyor, aynı ad ya da eşleşmezse yöneticiye gerekçeyle', () => {
  const f = GOC.slice(GOC.indexOf('function public.sirket_talebi_otomatik_degerlendir'));
  assert.match(f, /'ELLE_INCELE:AYNI_ADLI_SIRKET_VAR'/);
  assert.match(f, /karar := public\.sirket_otomatik_karar\(new\.user_id, new\.web_sitesi\);/);
  assert.match(f, /perform public\.sirket_talebini_uygula\(new\.id, 'OTOMATIK:' \|\| kod\);/);
  assert.match(f, /update public\.sirket_talepleri set karar_gerekcesi = kod where id = new\.id;/);
  assert.match(f, /' otomatik onaylanmadı: '/);
  assert.match(GOC, /drop trigger if exists yonetici_talep_bildirimi on public\.sirket_talepleri;/);
  assert.match(GOC, /after insert on public\.sirket_talepleri\s*for each row execute function public\.sirket_talebi_otomatik_degerlendir\(\);/);
});

test('yönetici onayı aynı iç işlevden; iç işlev dışarıya kapalı; sahip rolü Owner', () => {
  assert.match(GOC, /return public\.sirket_talebini_uygula\(talep_id, 'YONETICI_ONAYI'\);/);
  assert.match(GOC, /revoke all on function public\.sirket_talebini_uygula\(uuid, text\) from public, anon, authenticated;/);
  const ic = GOC.slice(GOC.indexOf('function public.sirket_talebini_uygula'), GOC.indexOf('function public.approve_sirket_talebi'));
  assert.match(ic, /values \(yeni_id, t\.user_id, 'Owner', true\)/);
  assert.doesNotMatch(ic, /is_admin/);
  assert.match(GOC, /set recruiter_role = 'Owner'\s*where m\.is_owner/);
});

test('sahiplenme bildirimi otomatik değerlendirmeden sonraki duruma bakıyor', () => {
  const f = GOC.slice(GOC.indexOf('function public.yonetici_sahiplenme_bildir'));
  assert.match(f, /if durum is distinct from 'pending' then\s*return new;/);
  assert.match(f, /public\.otomatik_karar_metni\(kod\)/);
  /* Tetikleyiciler ada göre çalışıyor: otomatik değerlendirme önce. */
  assert.ok('company_claim_otomatik_degerlendir_trg' < 'yonetici_sahiplenme_bildirimi');
});

test('gerekçe metinleri veritabanı ve arayüzde aynı; yönetici ekranında görünüyor', () => {
  for (const [kod, metin] of Object.entries(OTOMATIK_KARAR_METINLERI)) {
    if (kod === 'OTOMATIK_UYGULANAMADI') continue;
    assert.ok(HAM.includes(`when '${kod}' then '${metin}'`), kod);
  }
  assert.equal(otomatikKararMetni(null), null);
  assert.equal(otomatikKararMetni('YONETICI_ONAYI'), null);
  const y = oku('src/components/AdminClaimsView.tsx');
  assert.match(y, /<b>Otomatik onaylanmadı:<\/b> \{otomatikKararMetni\(t\.otomatikGerekce\)\}/);
  assert.match(oku('src/lib/isveren-baslangic.ts'), /created_at,karar_gerekcesi'\)/);
});

/*
  GÜVENLİK İNCELEMESİ (9 Kasım 2026): alan adı eşleşmesi şirket adını
  kanıtlamıyor; siemens-kariyer.com ile "Siemens Türkiye" doğrulanmış
  açılabilirdi. Benzer ad ve ad–alan adı uyumu otomatik onayı durduruyor.
*/
test('taklide karşı: benzer ad ve ad–alan adı uyumu otomatik onayı durduruyor', () => {
  const f = GOC.slice(GOC.indexOf('function public.sirket_talebi_otomatik_degerlendir'));
  assert.match(f, /extensions\.similarity\(public\.ad_katla\(c\.name\), yeni_ad\) >= 0\.5/);
  assert.match(f, /'ELLE_INCELE:BENZER_ADLI_SIRKET_VAR'/);
  assert.match(f, /etiket := public\.ad_katla\(split_part\(public\.kayitli_alan_adi\(public\.site_alan_adi\(new\.web_sitesi\)\), '\.', 1\)\);/);
  assert.match(f, /'ELLE_INCELE:ALAN_ADI_SIRKET_ADIYLA_ESLESMIYOR'/);
  /* Sıra: benzer ad kontrolü alan adı kararından ÖNCE. */
  assert.ok(f.indexOf('BENZER_ADLI_SIRKET_VAR') < f.indexOf('sirket_otomatik_karar(new.user_id'));
});

/* Ad–alan adı kuralının JS kopyası: kenar durumları belgeliyor. */
const katla = (p) => p.toLocaleLowerCase('tr').replace(/[ıi̇]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const uyuyor = (ad, etiket) => {
  const a = katla(ad); const e = katla(etiket);
  return e.length >= 3 && a.length >= 3 && (a.includes(e) || e.includes(a));
};
test('ad–alan adı uyumu: gerçek eşleşme geçer, taklit geçmez', () => {
  assert.ok(uyuyor('Modmere', 'modmere'));
  assert.ok(uyuyor('Bigger Games', 'biggergames'));
  assert.ok(!uyuyor('Siemens Türkiye', 'siemens-kariyer'));
  assert.ok(!uyuyor('Acme', 'xyz'));
});
