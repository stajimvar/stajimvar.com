import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PAYLASIM_SURUMU,
  SADE_SIRKET_DURUMLARI,
  adayIletisimiAcik,
  sadeSonrakiDurum,
} from '../src/lib/basvuru-durumu.mjs';

/*
  SADE BAŞVURU AKIŞI

  Şirket ilan açar → öğrenci CV'siyle başvurur → doğrulanmış ilan sahibi
  şirket adayın profilini, CV'sini ve paylaşmasına onay verdiği
  telefon/e-postasını görür → devamını kendisi yürütür.

  Sunucu kuralları gerçek veritabanında sınanıyor
  (supabase/tests/basvuru-sadelestirme.test.sql, CI'da da koşuyor).
  Buradaki testler arayüzün o kurala uyduğunu ve eski akışın
  denetimlerinin geri gelmediğini sabitliyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
/* Yokluk iddiaları gerekçe yorumlarına takılmasın. */
const kodu = (m) =>
  m
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*(--|\/\/).*$/gm, ' ');

const CEKMECE = oku('src/sirket/AdayCekmecesi.tsx');
const IZGARA = oku('src/sirket/AdayIzgarasi.tsx');
const PANO = oku('src/sirket/BasvuruPanosu.tsx');
const PANEL = oku('src/sirket/SirketPaneli.tsx');
const DIYALOG = oku('src/components/ApplyDialog.tsx');
const TAKIP = oku('src/components/ApplicationsTrackerView.tsx');
const GOC_ILETISIM = oku('supabase/migrations/20261201010000_iletisim_paylasimi_sadelesti.sql');
const GOC_GORUNTULENME = oku('supabase/migrations/20261202010000_basvuru_goruntulenmesi.sql');

/* ---------------------------------------------- paylaşım kuralı (saf) */

test('iletişim kuralı sunucuyla aynı: onay + (internal ya da sade sürüm)', () => {
  /* StajımVar üzerinden, onaylı: açık — teklif durumu SORULMUYOR. */
  assert.equal(
    adayIletisimiAcik({ paylasimOnayi: '2026-08-20', basvuruYontemi: 'internal', durum: 'submitted' }),
    true,
  );
  /* Onay yok: kapalı. */
  assert.equal(adayIletisimiAcik({ paylasimOnayi: null, basvuruYontemi: 'internal' }), false);
  /* Dış başvuru, ESKİ onay: kapalı — yeni onay varsayılmıyor. */
  assert.equal(
    adayIletisimiAcik({ paylasimOnayi: '2026-08-20', basvuruYontemi: 'external', paylasimSurumu: '2026-08-v1' }),
    false,
  );
  /* Dış başvuru, öğrenci sade akışta açtı: açık. */
  assert.equal(
    adayIletisimiAcik({ paylasimOnayi: '2026-10-06', basvuruYontemi: 'external', paylasimSurumu: PAYLASIM_SURUMU }),
    true,
  );
  /* Sürüm sabiti sunucudakiyle AYNI metin. */
  assert.match(GOC_ILETISIM, new RegExp(`select '${PAYLASIM_SURUMU}'::text`));
});

test('sade durum listesinde görüşme, değerlendirme ve teklif YOK', () => {
  assert.deepEqual(SADE_SIRKET_DURUMLARI, ['submitted', 'under_review', 'rejected']);
  for (const d of ['technical_assessment', 'interview_scheduled', 'offer_extended', 'offer_accepted']) {
    assert.ok(!SADE_SIRKET_DURUMLARI.includes(d), d);
  }
  assert.equal(sadeSonrakiDurum('submitted'), 'under_review');
  /* İncelemeden sonra zorunlu bir sonraki aşama yok. */
  for (const d of ['under_review', 'technical_assessment', 'interview_scheduled', 'offer_extended']) {
    assert.equal(sadeSonrakiDurum(d), null, d);
  }
});

/* ------------------------------------------------- şirket çekmecesi */

test('iletişim bloğu HER durumda çiziliyor, süreç bitti bölümünün içinde değil', () => {
  /*
    Önce blok yalnız teklif kabulünde çizilen `{terminal && (` bölümünün
    içindeydi: yeni ve incelenen başvurularda iletişim HİÇ görünmüyordu
    (tarayıcıda yakalandı). Artık o bölüm iletişimden ÖNCE kapanıyor.
  */
  const iletisim = CEKMECE.indexOf('İLETİŞİM — HER DURUMDA');
  assert.ok(iletisim > 0, 'iletişim bloğu bulunmalı');
  const oncesi = CEKMECE.slice(0, iletisim);
  const terminalBas = oncesi.lastIndexOf('{terminal && (');
  const terminalSon = oncesi.lastIndexOf('</section>\n          )}');
  assert.ok(terminalBas > 0 && terminalSon > terminalBas, 'son durum bölümü iletişimden önce kapanmalı');
  /* Yetenekler iletişimin ARKASINDA. */
  assert.ok(CEKMECE.indexOf('>Yetenekler</Baslik>') > iletisim);
});

test('Viewer iletişim almıyor ve CV uyarısı dürüst', () => {
  /* İstek salt okunur üyede HİÇ gitmiyor. */
  assert.match(CEKMECE, /saltOkunur \|\| !adayIletisimiAcik\(kart\)/);
  /* "Tamamen gizli" iddiası yok: CV dosyasının içinde iletişim olabilir. */
  assert.match(CEKMECE, /CV dosyasında iletişim bilgisi yazıyor olabilir/);
});

test('rızası kaldırılmış internal başvuruya "şirketin sitesinden yapıldı" denmiyor', () => {
  assert.match(CEKMECE, /kart\.basvuruYontemi === 'internal'\s*\?\s*'Aday bu başvuru için profil ve iletişim paylaşımını kapattı/);
});

test('rıza değişince iletişim yeniden okunuyor', () => {
  assert.match(CEKMECE, /\[kart\?\.id, kart\?\.durum, kart\?\.paylasimOnayi, kart\?\.paylasimSurumu, onIletisim, saltOkunur\]/);
});

/* -------------------------------------------------- görüntülenme */

test('görüntülenme kaydı ÇEKMECENİN içinde: çizilemeyen ayrıntı kayıt üretmiyor', () => {
  /*
    Kayıt ebeveynde (ızgara) tetikleniyordu; çekmece çizimde hata verse
    de hata sınırı yakalasa da kayıt yazılırdı. React, render'ı hata
    veren bileşenin efektini çalıştırmıyor; kayıt artık orada.
  */
  assert.match(CEKMECE, /React\.useEffect\(\(\) => \{\s*if \(!kart\?\.id \|\| !onGoruntulendi\) return;\s*onGoruntulendi\(String\(kart\.id\)\);/);
  /* Efekt erken dönüşten ÖNCE (hook kuralı). */
  assert.ok(CEKMECE.indexOf('onGoruntulendi(String(kart.id))') < CEKMECE.indexOf('if (!kart) return null;'));
  /* Izgarada kendi efekti YOK; yalnız prop olarak geçiriyor. */
  assert.doesNotMatch(kodu(IZGARA), /onGoruntulendi\(String\(acik\.id\)\)/);
  assert.match(IZGARA, /onGoruntulendi=\{onGoruntulendi\}/);
});

test('sunucu: görüntülenme tek bildirim, "CV açıldı" iddiası yok', () => {
  assert.match(GOC_GORUNTULENME, /'goruntulendi:' \|\| p_basvuru::text/);
  assert.match(GOC_GORUNTULENME, /on conflict \(dedupe_key\) where dedupe_key is not null do nothing/);
  assert.match(GOC_GORUNTULENME, /sirket_adaylarini_gorebilir\(v_sirket\)/);
  assert.doesNotMatch(kodu(GOC_GORUNTULENME), /CV/);
  assert.doesNotMatch(kodu(TAKIP), /CV'?n açıldı/i);
});

/* ---------------------------------------------------- bekletilenler */

test('değerlendirme formu ve dengeli dağıtım arayüzde BEKLETİLDİ', () => {
  assert.match(PANO, /const DEGERLENDIRME_ETKIN = false;/);
  assert.match(PANO, /\{DEGERLENDIRME_ETKIN && \(/);
  /* Yazabilen dalda pano `onDagit` almıyor → düğme çizilmiyor. */
  const i = PANEL.indexOf('DENGELİ DAĞITIM BEKLETİLDİ');
  assert.ok(i > 0);
  assert.doesNotMatch(kodu(PANEL.slice(i - 400, i + 400)), /onDagit=\{onDagit\}/);
});

/* ------------------------------------------------------ öğrenci */

test('başvuru öncesi: paylaşılacaklar açık, rıza şirketi ve telefon/e-postayı adlandırıyor', () => {
  assert.match(DIYALOG, /ile paylaşılacak bilgiler/);
  assert.match(DIYALOG, /telefon numaramın ve e-posta adresimin/);
  assert.match(DIYALOG, /<strong>\{listing\.companyName\}<\/strong> ile paylaşılmasına izin veriyorum/);
  /* SMS doğrulaması yok; "doğrulanmış numara" iddiası da yok. */
  assert.doesNotMatch(kodu(DIYALOG), /SMS|doğrulanmış numara/i);
});

test('takip: "ulaştı" yalnız gerçekten iletilen başvuruda', () => {
  assert.match(
    TAKIP,
    /app\.applicationMethod === 'internal'\s*\?\s*`Başvuru ulaştı · \$\{tarihMetni\(app\.appliedAt\)\}`\s*:\s*`Takibine eklendi/,
  );
  /* Ölçülmemiş geçmiş "görüntülenmedi" diye yazılmıyor. */
  assert.match(TAKIP, /Görüntülenme bilgisi yok/);
  assert.doesNotMatch(kodu(TAKIP), /görüntülenmedi/i);
});

test('öğrenci anahtarı kapsamı dürüst söylüyor (profil + iletişim)', () => {
  /*
    Tek rıza damgası hem profil kopyasını hem iletişimi kapsıyor
    (aday-kart: "rızasız kopya gösterilmiyor"). Anahtar yalnız "telefon
    ve e-posta" deseydi, profilin de gizlendiğini saklamış olurdu.
  */
  assert.match(TAKIP, /Profilim ve iletişim bilgilerim bu şirkete açık/);
  assert.match(TAKIP, /şirket ekranında profilin de gizlenir/);
});
