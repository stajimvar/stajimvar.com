import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DENEYIM_SINIRI,
  KOPYA_DENEYIM_SINIRI,
  ayAnahtari,
  ayMetni,
  deneyimHatasi,
  deneyimKaydi,
  deneyimKopyasi,
  deneyimListesi,
  deneyimSirasi,
  tarihAraligi,
} from '../src/lib/deneyim.mjs';
import { basvuruKopyasi } from '../src/lib/basvuru-kopyasi.mjs';
import { kartVerisi } from '../src/lib/aday-kart.mjs';
import { adayProfilFarki } from '../src/lib/aday-profil-farki.mjs';
import {
  ayrilmaOnayi,
  kaydedilmemisAbone,
  kaydedilmemisIsaretle,
  kaydedilmemisKaydet,
  kaydedilmemisOnekVarMi,
  kaydedilmemisTemizle,
  kaydedilmemisVarMi,
} from '../src/lib/kaydedilmemis-degisiklik.mjs';

/*
  PROFİLİNİ DÜZENLE + DENEYİM (6 Ekim 2026)

  Sunucu kuralları gerçek rollerle supabase/tests/ogrenci-deneyimleri.test.sql
  içinde (CI'da da koşuyor). Buradaki testler istemci kurallarını ve
  ekranın onaylı tasarıma uyduğunu sabitliyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const kodu = (m) => m.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*(--|\/\/).*$/gm, ' ');

const DUZENLEME = oku('src/components/ProfilDuzenleme.tsx');
const PROFIL = oku('src/components/StudentProfileView.tsx');
const CV = oku('src/components/CvPage.tsx');
const APP = oku('src/App.tsx');
const SORGU = oku('src/lib/queries/index.ts');
const GOC = oku('supabase/migrations/20261205010000_ogrenci_deneyimleri.sql');
const IS_AKISI = oku('.github/workflows/supabase-production.yml');

const deneyim = (yama = {}) => ({
  id: 'd1',
  position: 'Tasarım stajyeri',
  organization: 'Örnek Ajans',
  startYear: 2025,
  startMonth: 6,
  endYear: 2025,
  endMonth: 9,
  ongoing: false,
  description: 'Arayüz taslakları.',
  ...yama,
});

/* -------------------------------------------------------- tarih ve biçim */

test('ay anahtarı ve okunur tarih aralığı', () => {
  assert.equal(ayAnahtari(2025, 6), '2025-06');
  assert.equal(ayAnahtari('2025', '12'), '2025-12');
  assert.equal(ayAnahtari(2025, 13), null);
  assert.equal(ayAnahtari(1900, 1), null);
  assert.equal(ayMetni('2025-06'), 'Haz 2025');
  assert.equal(tarihAraligi({ baslangic: '2025-06', bitis: '2025-09', devam: false }), 'Haz 2025 – Eyl 2025');
  assert.equal(tarihAraligi({ baslangic: '2026-02', bitis: null, devam: true }), 'Şub 2026 – Devam ediyor');
  assert.equal(tarihAraligi({ baslangic: '2025-07', bitis: '2025-07', devam: false }), 'Tem 2025');
  assert.equal(tarihAraligi({ baslangic: 'bozuk' }), '');
});

test('form doğrulaması: zorunlu alanlar, hatalı tarih sırası, devam eden iş', () => {
  const taslak = (y = {}) => ({
    position: 'A', organization: 'B', startMonth: '9', startYear: '2025', endMonth: '12', endYear: '2025', ongoing: false, description: '', ...y,
  });
  assert.equal(deneyimHatasi(taslak()), null);
  assert.equal(deneyimHatasi(taslak({ position: '  ' }))?.alan, 'pozisyon');
  assert.equal(deneyimHatasi(taslak({ organization: '' }))?.alan, 'kurum');
  assert.equal(deneyimHatasi(taslak({ startMonth: '' }))?.alan, 'baslangic');
  /* Bitiş başlangıçtan önce olamaz. */
  assert.deepEqual(deneyimHatasi(taslak({ endMonth: '3' })), { alan: 'bitis', mesaj: 'Bitiş, başlangıçtan önce olamaz.' });
  /* Biten iş bitişsiz olamaz; devam eden iş bitiş istemiyor. */
  assert.equal(deneyimHatasi(taslak({ endMonth: '', endYear: '' }))?.alan, 'bitis');
  assert.equal(deneyimHatasi(taslak({ endMonth: '', endYear: '', ongoing: true })), null);
  /* Aynı ay başlayıp biten kabul. */
  assert.equal(deneyimHatasi(taslak({ endMonth: '9' })), null);
  assert.equal(deneyimHatasi(taslak({ position: 'x'.repeat(121) }))?.alan, 'pozisyon');
  assert.equal(deneyimHatasi(taslak({ description: 'x'.repeat(1001) }))?.alan, 'aciklama');
});

test('kopya biçimi: devam edenin bitişi yok, bozuk kayıt atlanıyor, izin verilen hepsi giriyor', () => {
  assert.deepEqual(deneyimKaydi(deneyim()), {
    pozisyon: 'Tasarım stajyeri', kurum: 'Örnek Ajans', baslangic: '2025-06', bitis: '2025-09', devam: false, aciklama: 'Arayüz taslakları.',
  });
  assert.equal(deneyimKaydi(deneyim({ ongoing: true, endYear: 2025, endMonth: 9 })).bitis, null);
  assert.equal(deneyimKaydi(deneyim({ position: '' })), null);
  assert.equal(deneyimKaydi(deneyim({ description: '' })).aciklama, null);
  /*
    6 Ekim 2026: kopya sınırı sunucu sınırıyla aynı (30). Kullanıcının
    kaydedebildiği her deneyim başvuru kopyasına giriyor; sessiz kesilme yok.
  */
  assert.equal(KOPYA_DENEYIM_SINIRI, DENEYIM_SINIRI);
  assert.equal(DENEYIM_SINIRI, 30);
  const otuz = Array.from({ length: 30 }, (_, i) => deneyim({ id: `d${i}`, position: `P${i}` }));
  assert.equal(deneyimKopyasi(otuz).length, 30);
  assert.deepEqual(deneyimKopyasi(otuz).map((d) => d.pozisyon), otuz.map((d) => d.position));
  /* Sunucunun izin vermediği fazlası (bozuk veri) yine emniyet sınırında. */
  const fazla = Array.from({ length: 35 }, (_, i) => deneyim({ id: `f${i}`, position: `F${i}` }));
  assert.equal(deneyimKopyasi(fazla).length, 30);
  /* Başvuru kopyası da otuzunu taşıyor. */
  assert.equal(basvuruKopyasi({ fullName: 'A', skills: [], projects: [], experiences: otuz }).deneyimler.length, 30);
  assert.deepEqual(deneyimKopyasi(undefined), []);
});

test('okuma tarafı: dizi değilse null (eski kopya), bozuk alanlar düşüyor', () => {
  assert.equal(deneyimListesi(undefined), null);
  assert.equal(deneyimListesi('metin'), null);
  assert.deepEqual(deneyimListesi([]), []);
  const l = deneyimListesi([
    { pozisyon: 'A', kurum: 'B', baslangic: '2025-01', bitis: '2025-02', devam: false, aciklama: { kotu: true } },
    { pozisyon: '', kurum: 'B' },
    'bozuk',
    { pozisyon: 'C', kurum: 'D', baslangic: 'xx', bitis: '2025-02', devam: true },
  ]);
  assert.equal(l.length, 2);
  assert.equal(l[0].aciklama, null);
  assert.equal(l[1].baslangic, null);
  /* Devam eden kayıtta bitiş yazılsa da okunmuyor. */
  assert.equal(l[1].bitis, null);
});

test('sıra: devam edenler önce, sonra en yeni bitiş', () => {
  const liste = [
    deneyim({ id: 'eski', endYear: 2023, endMonth: 5, startYear: 2023, startMonth: 1 }),
    deneyim({ id: 'devam', ongoing: true, endYear: null, endMonth: null, startYear: 2026, startMonth: 2 }),
    deneyim({ id: 'yeni', endYear: 2025, endMonth: 9 }),
  ];
  assert.deepEqual([...liste].sort(deneyimSirasi).map((d) => d.id), ['devam', 'yeni', 'eski']);
});

/* ---------------------------------------------------- başvuru kopyası */

test('başvuru kopyası o anki deneyimleri taşıyor; boş liste de yazılıyor', () => {
  const ogrenci = { fullName: 'Deniz', university: 'X', department: 'Y', skills: [], projects: [], experiences: [deneyim()] };
  const k = basvuruKopyasi(ogrenci);
  assert.equal(k.deneyimler.length, 1);
  assert.equal(k.deneyimler[0].baslangic, '2025-06');
  /* Deneyimsiz öğrencide anahtar yine var ("yoktu" ile "eski kopya" ayrı). */
  assert.deepEqual(basvuruKopyasi({ fullName: 'Ece', skills: [], projects: [] }).deneyimler, []);
  /* Kopyada telefon ve e-posta yok (değişmedi). */
  assert.equal('telefon' in k || 'eposta' in k || 'phone' in k, false);
  /* Kopya bir değer: profil sonradan değişse de üretilen nesne değişmiyor. */
  ogrenci.experiences[0].position = 'Sonradan değişti';
  assert.equal(k.deneyimler[0].pozisyon, 'Tasarım stajyeri');
});

test('şirket kartı: paylaşım yoksa deneyim yok; eski kopya karşılaştırılamaz', () => {
  const satir = (kopya, riza = '2026-10-06') => ({
    id: 'b1', status: 'submitted', application_method: 'internal',
    contact_share_consent_at: riza, contact_share_consent_version: '2026-10-sade-v1', profile_snapshot: kopya,
  });
  const yeni = kartVerisi(satir({ ad: 'A', deneyimler: [{ pozisyon: 'P', kurum: 'K', baslangic: '2025-01', bitis: null, devam: true }] }));
  assert.equal(yeni.deneyimler.length, 1);
  assert.equal(yeni.deneyimKopyadan, true);
  const eski = kartVerisi(satir({ ad: 'A' }));
  assert.deepEqual(eski.deneyimler, []);
  assert.equal(eski.deneyimKopyadan, false);
  const rizasiz = kartVerisi(satir({ ad: 'A', deneyimler: [{ pozisyon: 'P', kurum: 'K' }] }, null));
  assert.deepEqual(rizasiz.deneyimler, []);
});

test('fark: eklenen, güncellenen, çıkan; eski kopyada "eklendi" denmiyor', () => {
  const kopya = { deneyimKopyadan: true, deneyimler: [{ pozisyon: 'Stajyer', kurum: 'A', baslangic: '2025-01', bitis: '2025-03', devam: false, aciklama: 'ilk' }] };
  const guncel = {
    deneyimler: [
      { pozisyon: 'Stajyer', kurum: 'A', baslangic: '2025-01', bitis: '2025-03', devam: false, aciklama: 'yeni açıklama' },
      { pozisyon: 'Gönüllü', kurum: 'B', baslangic: '2026-01', bitis: null, devam: true, aciklama: null },
    ],
  };
  const f = adayProfilFarki(kopya, guncel);
  assert.equal(f.deneyimler.eklenen.length, 1);
  assert.equal(f.deneyimler.guncellenen.length, 1);
  assert.equal(f.bolumler.deneyimler, true);
  const eski = adayProfilFarki({ deneyimKopyadan: false, deneyimler: [] }, guncel);
  assert.equal(eski.deneyimler.karsilastirilamadi, true);
  assert.equal(eski.deneyimler.eklenen.length, 0);
  assert.equal(eski.bolumler.deneyimler, false);
  const cikan = adayProfilFarki(kopya, { deneyimler: [] });
  assert.equal(cikan.deneyimler.cikan.length, 1);
  /* Otuz deneyimlik kopyada da "kopyada yer almayan" belirsizliği yok. */
  const otuzKopya = {
    deneyimKopyadan: true,
    deneyimler: Array.from({ length: 30 }, (_, i) => ({ pozisyon: `P${i}`, kurum: 'K', baslangic: '2024-01', bitis: null, devam: true })),
  };
  assert.equal(adayProfilFarki(otuzKopya, { deneyimler: otuzKopya.deneyimler }).deneyimler.kopyaSinirli, false);
});

test('şirket ekranı ve CV deneyimleri kesmiyor', () => {
  const CEKMECE = oku('src/sirket/AdayCekmecesi.tsx');
  const GUNCEL = oku('src/sirket/AdayGuncelProfil.tsx');
  assert.match(CEKMECE, /\{deneyimler\.map\(\(d: any, i: number\) => \(/);
  assert.doesNotMatch(CEKMECE, /deneyimler\.slice/);
  assert.doesNotMatch(GUNCEL, /en çok on deneyim|Başvuru kopyasında yer almayan' : 'Yeni deneyim'/);
  assert.match(CV, /const deneyimler = deneyimKopyasi\(\[\.\.\.\(student\.experiences \?\? \[\]\)\]\.sort\(deneyimSirasi\)\);/);
  assert.match(CV, /\{deneyimler\.map\(\(d, i\) => \(/);
});

/* ------------------------------------------- kaydedilmemiş değişiklik */

test('gezinme kapısı: kirli yoksa sormuyor; "hayır" kalıyor, "evet" temizliyor', () => {
  kaydedilmemisTemizle();
  let soruldu = 0;
  assert.equal(ayrilmaOnayi(() => { soruldu += 1; return false; }), true);
  assert.equal(soruldu, 0);
  kaydedilmemisIsaretle('profil:temel', true);
  assert.equal(ayrilmaOnayi(() => false), false);
  assert.equal(kaydedilmemisVarMi(), true);
  assert.equal(ayrilmaOnayi(() => true), true);
  assert.equal(kaydedilmemisVarMi(), false);
  kaydedilmemisIsaretle('profil:egitim', true);
  kaydedilmemisTemizle('profil:');
  assert.equal(kaydedilmemisVarMi(), false);
  /* Abonelik ve formun kendi kaydetme geri çağrısı (sosyal profil formu). */
  let bildirim = 0;
  let kaydedildi = 0;
  const birak = kaydedilmemisAbone(() => { bildirim += 1; });
  kaydedilmemisIsaretle('sosyal:alanlar', true, () => { kaydedildi += 1; });
  assert.equal(kaydedilmemisOnekVarMi('sosyal:'), true);
  assert.equal(kaydedilmemisOnekVarMi('profil:'), false);
  kaydedilmemisKaydet('sosyal:');
  assert.equal(kaydedildi, 1);
  kaydedilmemisIsaretle('sosyal:alanlar', true, () => {});
  kaydedilmemisIsaretle('sosyal:alanlar', false);
  assert.equal(bildirim, 2, 'yalnız durum değişiminde bildiriliyor');
  birak();
  kaydedilmemisIsaretle('sosyal:alanlar', true);
  assert.equal(bildirim, 2, 'abonelik bırakılınca bildirim yok');
  kaydedilmemisTemizle();
  /* Uygulamanın tek gezinme kapısı soruyu soruyor; yönlendirmeler sormuyor. */
  assert.match(APP, /if \(!secenek\?\.degistir && !ayrilmaOnayi\(\)\) return;/);
});

/* -------------------------------------------------------- ekran kaynağı */

test('onaylı tasarım: tek sütun, sıra ve başlıklar', () => {
  assert.match(DUZENLEME, /<h1[^>]*>Profilini düzenle<\/h1>/);
  assert.match(DUZENLEME, /Kendini anlat, bilgilerini istediğin zaman güncelle\./);
  assert.match(DUZENLEME, /mx-auto w-full max-w-3xl/);
  const sira = ['baslik="Temel bilgiler"', 'baslik="Eğitim"', 'baslik="Deneyim"', 'baslik="Yetenekler ve diller"', 'baslik="Projeler ve bağlantılar"', 'id="duzenle-cv"'];
  const yerler = sira.map((s) => DUZENLEME.indexOf(s));
  yerler.forEach((y, i) => assert.ok(y > 0, `${sira[i]} bulunmalı`));
  assert.deepEqual([...yerler].sort((a, b) => a - b), yerler);
  /* Fotoğraf yalnız üstte; sosyal ayarlar kendi satırında. */
  assert.equal((DUZENLEME.match(/\{fotografKarti\}/g) ?? []).length, 1);
  assert.ok(DUZENLEME.indexOf('{fotografKarti}') < DUZENLEME.indexOf('baslik="Temel bilgiler"'));
  assert.equal((DUZENLEME.match(/\{sosyalProfilDuzenleme\}/g) ?? []).length, 1);
});

test('formu kalabalıklaştıranlar yok: tamamlanma sayacı ve doğrulama çağrısı', () => {
  const k = kodu(DUZENLEME);
  assert.doesNotMatch(k, /profilDolulugu|oran\b|konfeti|%/);
  assert.doesNotMatch(k, /onOpenQuiz|Doğrula\b|Testi çöz/);
});

test('isteğe bağlı bölümler: boş durum "Ekle" ile açılıyor; deneyim formu ekle ile', () => {
  assert.match(DUZENLEME, /Deneyim ekle/);
  assert.match(DUZENLEME, /Deneyimin yoksa bu bölümü boş bırakabilirsin\./);
  assert.match(DUZENLEME, /Proje ekle/);
  assert.match(DUZENLEME, /Dil ekle/);
  /* Deneyim alanları onaylı tasarımdaki gibi. */
  for (const etiket of ['Pozisyon', 'Kurum', 'Başlangıç', 'Bitiş', 'Devam ediyorum', 'Kısaca ne yaptın?', 'Deneyimi kaydet']) {
    assert.ok(DUZENLEME.includes(etiket), etiket);
  }
  /* Kaldırma önce soruyor. */
  assert.match(DUZENLEME, /Bu deneyim kaldırılsın mı\?/);
});

test('dil seviyesi kısa bir seçim alanı; program ve beceri ayrımı ve seviyeleri korunuyor', () => {
  assert.match(DUZENLEME, /aria-label=\{`\$\{l\.language\} seviyesi`\}/);
  assert.match(DUZENLEME, /aria-label=\{`\$\{s\.name\} seviyesi`\}/);
  assert.match(DUZENLEME, /skills: yetenekler\.map\(\(s\) => \(s\.name === ad \? \{ \.\.\.s, level: seviye \} : s\)\)/);
  assert.match(DUZENLEME, /softSkills: \[\.\.\.beceriler, temiz\]/);
});

test('kaydetme anlaşılır ve sessiz kayıp yok', () => {
  assert.match(DUZENLEME, /Kaydedilemedi\. Yazdıkların duruyor; yeniden dene\./);
  assert.match(DUZENLEME, /Bu bölümde kaydedilmemiş değişiklik var\./);
  assert.match(DUZENLEME, /kaydedilmemisIsaretle\(`profil:\$\{b\}`/);
  assert.match(DUZENLEME, /window\.addEventListener\('beforeunload', dur\)/);
  assert.match(DUZENLEME, /if \(kaydedilmemisVarMi\(\) && !window\.confirm\(AYRILMA_SORUSU\)\) return;/);
  /* Geri tuşu önce düzenlemeden çıkıyor; kirliyse soruluyor. */
  assert.match(PROFIL, /if \(!ayrilmaOnayi\(\)\) \{\s*window\.history\.pushState/);
});

test('sosyal profil formu da korumada: alanlar ve kullanıcı adı', () => {
  const SOSYAL = oku('src/components/sosyal/SosyalProfilDuzenleme.tsx');
  const KULLANICI_ADI = oku('src/components/sosyal/KullaniciAdiDegistirme.tsx');
  assert.match(SOSYAL, /kaydedilmemisIsaretle\('sosyal:alanlar', kirli, \(\) => formRef\.current\?\.requestSubmit\(\)\);/);
  assert.match(SOSYAL, /React\.useEffect\(\(\) => \(\) => kaydedilmemisIsaretle\('sosyal:alanlar', false\), \[\]\);/);
  assert.match(SOSYAL, /<form ref=\{formRef\} onSubmit=\{gonder\}/);
  assert.match(KULLANICI_ADI, /kaydedilmemisIsaretle\('sosyal:kullanici-adi', degisiyorMu, \(\) => formRef\.current\?\.requestSubmit\(\)\);/);
  /* Düzenleme ekranı kayda abone; satır kapatma, işaret ve yenileme aynı yoldan. */
  assert.match(DUZENLEME, /useSyncExternalStore\(\s*kaydedilmemisAbone,\s*\(\) => kaydedilmemisOnekVarMi\('sosyal:'\)/);
  assert.match(DUZENLEME, /const kirliHarita: Partial<Record<DuzenlemeBolumu, boolean>> = \{ \.\.\.yerelKirli, sosyal: sosyalKirli \};/);
  assert.match(DUZENLEME, /sosyal: \(\) => kaydedilmemisKaydet\('sosyal:'\),/);
  assert.match(DUZENLEME, /kirli=\{sosyalKirli\}\s*>\s*\{uyariSatiri\('sosyal'\)\}/);
  /* Diğer ayarlar ana formdan sonra, ayrı başlık altında ve kapalı başlıyor. */
  assert.ok(DUZENLEME.indexOf('Diğer ayarlar') > DUZENLEME.indexOf('id="duzenle-cv"'));
  assert.match(DUZENLEME, /new Set\(acilisBolumu && acilisBolumu !== 'cv' \? \[acilisBolumu\] : \[\]\)/);
});

test('telefon ve e-posta herkese açık değil; e-posta düzenlenmiyor', () => {
  assert.match(DUZENLEME, /Telefon ve e-posta herkese açık profilinde görünmez/);
  assert.doesNotMatch(DUZENLEME, /email:\s*temel|fullName,\s*email/);
});

test('CV: iki net seçenek, yüklü PDF değişmiyor, boş başlık yok', () => {
  const satir = DUZENLEME.slice(DUZENLEME.indexOf('id="duzenle-cv"'));
  assert.match(satir, /onClick=\{\(\) => document\.getElementById\('cv-dosya-girdisi'\)\?\.click\(\)\}/);
  assert.match(satir, /onClick=\{onCvOlustur\}/);
  /* "Profilimden CV oluştur" profildeki bilgilerle yazdırılabilir CV'yi açıyor; form sormuyor. */
  assert.match(PROFIL, /onCvOlustur=\{onOpenCv\}/);
  /* CV belgesinde boş bölüm başlığı yok. */
  assert.match(CV, /\{egitimVar && \(/);
  assert.match(CV, /\{deneyimler\.length > 0 && \(\s*<AnaBolum baslik="Deneyim"/);
  assert.doesNotMatch(kodu(CV), /Belirtilmemiş/);
});

/* ------------------------------------------------------------- veri */

test('kayıt: deneyimler kendi tablosuna, sırayla; okuma profil sorgusunda', () => {
  assert.match(SORGU, /student_experiences \( \* \)/);
  assert.match(SORGU, /if \(patch\.experiences\) await replaceStudentExperiences\(userId, patch\.experiences\);/);
  assert.match(SORGU, /end_year: d\.ongoing \? null : d\.endYear,/);
});

test('göç: sahibine özel, şirkete doğrudan okuma yok, güncel profil aynı kapıdan', () => {
  assert.match(GOC, /alter table public\.student_experiences enable row level security;/);
  assert.match(GOC, /revoke all on public\.student_experiences from public, anon, authenticated;/);
  assert.match(GOC, /create policy "kendi deneyimleri" on public\.student_experiences\s+for all to authenticated\s+using \(student_id = auth\.uid\(\)\)\s+with check \(student_id = auth\.uid\(\)\);/);
  /* Şirket politikası yok: tabloda sahip ve yönetici dışında okuma kuralı tanımlanmıyor. */
  assert.equal((kodu(GOC).match(/create policy/g) ?? []).length, 2);
  assert.match(GOC, /using \(public\.is_admin\(\)\);/);
  /* Tarih kuralı ve üst sınır sunucuda. */
  assert.match(GOC, /end_year \* 12 \+ end_month >= start_year \* 12 \+ start_month/);
  assert.match(GOC, />= 30 then/);
  /* Güncel profil: kapı değişmedi, deneyim eklendi. */
  assert.match(GOC, /if not public\.basvuru_iletisimi_acik\(p_basvuru\) then\s+return jsonb_build_object\('riza', false\);/);
  assert.match(GOC, /'deneyimler', coalesce\(\(/);
  /* Gerçek rollerle erişim testi CI'da koşuyor. */
  assert.match(IS_AKISI, /psql -v ON_ERROR_STOP=1 -f supabase\/tests\/ogrenci-deneyimleri\.test\.sql "\$local_db_url"/);
});
