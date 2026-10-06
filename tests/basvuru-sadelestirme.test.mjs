import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DURUM_ADI,
  ESKI_SUREC_DURUMLARI,
  PAYLASIM_SURUMU,
  SADE_DURUM_GRUPLARI,
  SADE_SIRKET_DURUMLARI,
  adayIletisimiAcik,
  durumSuzgeciSecenekleri,
  durumSuzgecineUyar,
  sadeDurumGrubu,
  sadeDurumSutunlari,
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
  /*
    Başvuranlar tek liste (6 Ekim 2026): Pano çizilmiyor, dağıtım düğmesi
    de yok — `onDagit` hiçbir yere geçirilmiyor.
  */
  const bilesen = kodu(PANEL.slice(PANEL.indexOf('const Basvuranlar')));
  assert.doesNotMatch(bilesen, /<BasvuruPanosu|onDagit=\{onDagit\}/);
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
  /*
    Kapalıyken ne kapanıp ne kaldığı açıkça yazıyor: profil ve iletişim
    kapanıyor (sunucuda, 20261201 ve 20261203); başvuru kaydı, ön yazı ve
    CV başvurunun parçası olarak kalıyor ve CV'de iletişim olabilir.
  */
  assert.match(TAKIP, /profil bilgilerini, telefonunu ve e-postanı göremez/);
  assert.match(TAKIP, /CV'nde iletişim bilgisi varsa görünür/);
  /*
    Anahtarın durumu SUNUCUDAKİ ETKİN kuraldan: eski dış başvuru
    rızasında "Açık" yazıp sunucuda kapalı olmasın.
  */
  assert.match(TAKIP, /app\.applicationMethod === 'internal' \|\| app\.contactShareConsentVersion === PAYLASIM_SURUMU/);
  assert.match(TAKIP, /aria-checked=\{paylasimEtkinMi\(app\)\}/);
  assert.doesNotMatch(TAKIP, /aria-checked=\{Boolean\(app\.contactShareConsentAt\)\}/);
});

/* ------------------------------------------- veri sınırı (bozuk kopya) */

test('bozuk kopya alanları yalnız KENDİLERİNİ düşürüyor', async () => {
  const { kartVerisi } = await import('../src/lib/aday-kart.mjs');
  const k = kartVerisi({
    id: 'x1',
    application_method: 'internal',
    contact_share_consent_at: '2026-09-01T08:00:00Z',
    profile_snapshot: {
      ad: { bozuk: true },
      universite: 'Örnek Üniversitesi',
      bolum: ['dizi'],
      sinif: 3,
      sehir: '   ',
      linkedin: 42,
      projeler: [
        { baslik: 'Sağlam proje', aciklama: { bozuk: true }, adres: ['x'] },
        { baslik: 7, aciklama: 'sayı başlık metne çevrilir' },
        { baslik: { bozuk: true }, aciklama: 'başlıksız düşer' },
        null,
        'metin',
        ['dizi'],
      ],
    },
  });
  /* Geçerli olanlar duruyor. */
  assert.equal(k.paylasildi, true);
  assert.equal(k.universite, 'Örnek Üniversitesi');
  assert.equal(k.sinif, '3');
  /* Bozuk olanlar null. */
  assert.equal(k.ad, null);
  assert.equal(k.bolum, null);
  assert.equal(k.sehir, null);
  /* Proje: başlık zorunlu, açıklama/adres bozuksa yalnız onlar düşüyor. */
  assert.deepEqual(k.projeler, [
    { baslik: 'Sağlam proje', aciklama: null, adres: null },
    { baslik: '7', aciklama: 'sayı başlık metne çevrilir', adres: null },
  ]);
  /* Her alan ya metin ya null: çekmece hiçbir nesneyi çizmeye çalışmıyor. */
  for (const alan of ['ad', 'fotoUrl', 'universite', 'bolum', 'sinif', 'sehir', 'github', 'portfolyo', 'linkedin']) {
    assert.ok(k[alan] === null || typeof k[alan] === 'string', alan);
  }
});

test('kopya nesne değilse hiç paylaşılmış sayılmıyor', async () => {
  const { kartVerisi } = await import('../src/lib/aday-kart.mjs');
  for (const kopya of [['dizi'], 'metin', 42]) {
    const k = kartVerisi({ id: 'x2', application_method: 'internal', contact_share_consent_at: '2026-09-01', profile_snapshot: kopya });
    assert.equal(k.paylasildi, false, JSON.stringify(kopya));
  }
});

test('eski dış başvuru rızası profil kopyasını da açmıyor (etkin kural)', async () => {
  const { kartVerisi } = await import('../src/lib/aday-kart.mjs');
  const k = kartVerisi({
    id: 'x3',
    application_method: 'external',
    contact_share_consent_at: '2026-08-20T09:00:00Z',
    contact_share_consent_version: '2026-08-v1',
    profile_snapshot: { ad: 'Aday' },
  });
  assert.equal(k.paylasildi, false);
  assert.equal(k.ad, null);
});

/* --------------------------------------- sunucu: kopya ve sade akış */

const GOC_KOPYA = oku('supabase/migrations/20261203010000_profil_kopyasi_korumasi.sql');
const GOC_KORUMA = oku('supabase/migrations/20261204010000_sade_akis_sunucu_korumasi.sql');
const VERI = oku('src/lib/sirket-veri.ts');

test('profil kopyası korumalı tabloda, şirket yalnız etkin paylaşımda okuyor', () => {
  assert.match(GOC_KOPYA, /create table if not exists public\.basvuru_profil_kopyalari/);
  assert.match(GOC_KOPYA, /public\.sirket_adaylarini_gorebilir\(l\.company_id\)\s*and public\.basvuru_iletisimi_acik\(a\.id\)/);
  /* Var olan kopyalar taşındı ve sütun boşaltıldı. */
  assert.match(GOC_KOPYA, /update public\.applications set profile_snapshot = null where profile_snapshot is not null;/);
  /* Yeni yazılanlar da anında taşınıyor. */
  assert.match(GOC_KOPYA, /after insert or update of profile_snapshot on public\.applications/);
  /* Güncel profil ve yetenekler aynı kapıdan. */
  assert.equal((GOC_KOPYA.match(/if not public\.basvuru_iletisimi_acik\(p_basvuru\) then/g) ?? []).length, 2);
  /* İstemci kopyayı başvuru satırından DEĞİL korumalı tablodan alıyor. */
  assert.match(VERI, /'basvuru_profil_kopyalari\(kopya\), '/);
  const secim = VERI.slice(VERI.indexOf('export async function sirketBasvurulari'));
  assert.doesNotMatch(secim.slice(0, secim.indexOf('.eq(')), /profile_snapshot,/);
});

test('sunucu: şirket kaldırılan aşamalara geçemez ve davet/teklif yazamaz', () => {
  assert.match(GOC_KORUMA, /new\.status::text in \('technical_assessment', 'interview_scheduled', 'offer_extended'\)/);
  assert.match(GOC_KORUMA, /old\.interview_location, old\.interview_note, old\.interview_response\)/);
  assert.match(GOC_KORUMA, /\(old\.offer_note, old\.offer_start_date, old\.offer_compensation\)/);
  /* Öğrencinin kendi hamleleri, servis rolü ve yönetici serbest. */
  assert.match(GOC_KORUMA, /if v_aktor is null or public\.is_admin\(\) then/);
  assert.match(GOC_KORUMA, /if v_aktor = new\.student_id then/);
  assert.match(GOC_KORUMA, /before update on public\.applications/);
});

/* ------------------------------------- durum süzgeci ve pano sütunları */

const KARISIK = [
  { id: 'a', durum: 'submitted' },
  { id: 'b', durum: 'under_review' },
  { id: 'c', durum: 'rejected' },
  { id: 'd', durum: 'withdrawn' },
  { id: 'e', durum: 'interview_scheduled' },
  { id: 'f', durum: 'offer_accepted' },
  { id: 'g', durum: 'offer_declined' },
  { id: 'h', durum: 'technical_assessment' },
  { id: 'i', durum: 'offer_extended' },
  { id: 'j', durum: 'submitted' },
];

test('süzgeç: ana seçenekler yalnız Tüm durumlar + dört sade durum', () => {
  const yalnizSade = KARISIK.filter((k) => !ESKI_SUREC_DURUMLARI.includes(k.durum));
  const s = durumSuzgeciSecenekleri(yalnizSade);
  assert.deepEqual(
    s.map((x) => x.etiket),
    ['Tüm durumlar', 'Yeni', 'İnceleniyor', 'Olumsuz', 'Geri çekildi'],
  );
  assert.deepEqual(s.map((x) => x.sayi), [5, 2, 1, 1, 1]);
  /* Kaldırılan aşamaların adı hiçbir seçenekte yok. */
  for (const d of ESKI_SUREC_DURUMLARI) {
    assert.ok(!s.some((x) => x.etiket === DURUM_ADI[d]), `${DURUM_ADI[d]} ana seçenek olmamalı`);
  }
});

test('süzgeç: eski kayıt varsa TEK "Eski süreç kayıtları" seçeneği, sayısı doğru', () => {
  const s = durumSuzgeciSecenekleri(KARISIK);
  assert.deepEqual(
    s.map((x) => x.etiket),
    ['Tüm durumlar', 'Yeni', 'İnceleniyor', 'Olumsuz', 'Geri çekildi', 'Eski süreç kayıtları'],
  );
  assert.deepEqual(s.map((x) => x.sayi), [10, 2, 1, 1, 1, 5]);
  /* Grup sayıları toplamı = tümü: hiçbir kart kaybolmuyor ya da iki kez sayılmıyor. */
  assert.equal(s.slice(1).reduce((t, x) => t + x.sayi, 0), s[0].sayi);
  /* Seçiliyken kayıt kalmasa da seçenek duruyor (ekran neyle süzüldüğünü söylesin). */
  assert.ok(durumSuzgeciSecenekleri([], 'eski').some((x) => x.deger === 'eski'));
  assert.ok(!durumSuzgeciSecenekleri([]).some((x) => x.deger === 'eski'));
});

test('süzgeç: seçim eşleşmesi ve eski kayıtlar DÖNÜŞTÜRÜLMÜYOR', () => {
  const eski = KARISIK.filter((k) => durumSuzgecineUyar(k, 'eski'));
  assert.deepEqual(eski.map((k) => k.id), ['e', 'f', 'g', 'h', 'i']);
  /* Gerçek durum aynen duruyor; rozet "Görüşme", "Teklif kabul edildi" der. */
  assert.deepEqual(eski.map((k) => k.durum), [
    'interview_scheduled', 'offer_accepted', 'offer_declined', 'technical_assessment', 'offer_extended',
  ]);
  assert.deepEqual(KARISIK.filter((k) => durumSuzgecineUyar(k, 'submitted')).map((k) => k.id), ['a', 'j']);
  assert.equal(KARISIK.filter((k) => durumSuzgecineUyar(k, '')).length, KARISIK.length);
  /* Bilinmeyen/boş durum kaybolmuyor: Yeni'ye düşüyor. */
  assert.equal(sadeDurumGrubu(undefined), 'submitted');
  assert.equal(sadeDurumGrubu('tuhaf'), 'submitted');
  assert.deepEqual(SADE_DURUM_GRUPLARI.map((g) => g.anahtar), ['submitted', 'under_review', 'rejected', 'withdrawn']);
});

test('pano: sütunlar süzgeçle aynı; eski sütun yalnız eski kayıt varsa', () => {
  const yeni = sadeDurumSutunlari([{ id: 'x', durum: 'submitted' }, { id: 'y', durum: 'under_review' }]);
  assert.deepEqual(yeni.map((s) => s.etiket), ['Yeni', 'İnceleniyor', 'Olumsuz', 'Geri çekildi']);
  const karisik = sadeDurumSutunlari(KARISIK);
  assert.deepEqual(karisik.map((s) => s.etiket), ['Yeni', 'İnceleniyor', 'Olumsuz', 'Geri çekildi', 'Eski süreç kayıtları']);
  assert.deepEqual(karisik.map((s) => s.kartlar.length), [2, 1, 1, 1, 5]);
  /* Süzgeç sayılarıyla birebir. */
  const s = durumSuzgeciSecenekleri(KARISIK).slice(1);
  assert.deepEqual(karisik.map((x) => x.kartlar.length), s.map((x) => x.sayi));
});

test('liste ve pano aynı ortak kuralı kullanıyor; eski 9 seçenek ve 6 sütun geri gelmiyor', () => {
  const izgara = kodu(IZGARA);
  const pano = kodu(PANO);
  assert.match(izgara, /durumSuzgeciSecenekleri\(durumHaricSuzulmus, durumSuzgeci\)/);
  assert.match(izgara, /durumSuzgecineUyar\(k, durumSuzgeci\)/);
  assert.doesNotMatch(izgara, /DURUM_SIRASI/);
  assert.match(pano, /sadeDurumSutunlari\(b\.kartlar\)/);
  assert.doesNotMatch(pano, /PANO_ASAMALARI|asamayaGore/);
  assert.doesNotMatch(pano, /xl:grid-cols-6/);
  /* Kart rozeti gerçek durumu okuyor (grup adını değil). */
  assert.match(pano, /durumRozeti\(String\(kart\.durum \?\? ''\)\)/);
});
