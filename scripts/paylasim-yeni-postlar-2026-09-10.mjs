/** Altı yeni fotoğraflı Instagram karuselini üretir ve panel manifestine ekler. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { KOK, PAYLASIM } from './paylasim-sablonu.mjs';

const EN = 1080;
const BOY = 1440;
const KENAR = 64;
const MAVI = '#2F6DF6';
const ACIK = '#1D4ED8';
const BEYAZ = '#FFFFFF';
const LACIVERT = '#0B1F3A';
const METIN = '#334155';
const SOLUK = '#475569';
const FONT = 'Segoe UI, Arial, Helvetica, sans-serif';
const SURUM = 'v1';
const GUNCELLEME = '2026-09-10';

const varlikKlasoru = path.join(KOK, 'assets', 'instagram', 'yeni-20260910');
const logo64 = fs.readFileSync(path.join(KOK, 'assets', 'logo-kaynak.png')).toString('base64');

const kacir = (deger) =>
  String(deger).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const yazi = (x, y, metin, { boyut = 30, renk = LACIVERT, kalin = 400, hiza = 'start' } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${boyut}" font-weight="${kalin}" fill="${renk}" text-anchor="${hiza}">${kacir(metin)}</text>`;

const satirlar = (x, y, metinler, { boyut = 72, aralik = 1.12, renk = LACIVERT, kalin = 800 } = {}) =>
  metinler.map((metin, i) => yazi(x, y + i * Math.round(boyut * aralik), metin, { boyut, renk, kalin })).join('');

const ust = (seri, sayfa) => `
  <image href="data:image/png;base64,${logo64}" x="${KENAR}" y="55" width="58" height="58"/>
  ${yazi(KENAR + 76, 98, 'StajımVar', { boyut: 32, kalin: 800 })}
  ${yazi(EN - KENAR, 98, sayfa, { boyut: 26, renk: METIN, kalin: 700, hiza: 'end' })}
  <rect x="${KENAR}" y="208" width="58" height="7" rx="4" fill="#38BDF8"/>
  ${yazi(KENAR, 270, seri.toLocaleUpperCase('tr-TR'), { boyut: 25, renk: ACIK, kalin: 800 })}
`;

const noktaListesi = (baslangic, maddeler) =>
  maddeler.map((madde, i) => {
    const y = baslangic + i * 140;
    return `
      <rect x="${KENAR}" y="${y}" width="64" height="64" rx="20" fill="${i === 0 ? MAVI : '#DBEAFE'}"/>
      ${yazi(KENAR + 32, y + 43, String(i + 1).padStart(2, '0'), { boyut: 24, renk: i === 0 ? BEYAZ : MAVI, kalin: 800, hiza: 'middle' })}
      ${yazi(KENAR + 92, y + 25, madde[0], { boyut: 31, kalin: 800 })}
      ${yazi(KENAR + 92, y + 65, madde[1], { boyut: 25, renk: METIN })}
    `;
  }).join('');

const kartSvg = ({ foto64, seri, sayfa, baslik, alt = [], maddeler = [], cagri }) => {
  const baslikBoyutu = baslik.some((s) => s.length > 20) ? 62 : 70;
  const baslikSonu = 330 + (baslik.length - 1) * Math.round(baslikBoyutu * 1.12);
  const icerikBaslangici = baslikSonu + 104;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${EN}" height="${BOY}" viewBox="0 0 ${EN} ${BOY}">
    <defs>
      <linearGradient id="isik" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.98"/>
        <stop offset="0.62" stop-color="#F8FBFF" stop-opacity="0.91"/>
        <stop offset="1" stop-color="#EFF6FF" stop-opacity="0.46"/>
      </linearGradient>
      <linearGradient id="altIsik" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.82"/>
      </linearGradient>
    </defs>
    <image href="data:image/png;base64,${foto64}" x="0" y="0" width="${EN}" height="${BOY}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${EN}" height="${BOY}" fill="url(#isik)"/>
    <rect width="${EN}" height="${BOY}" fill="url(#altIsik)"/>
    ${ust(seri, sayfa)}
    ${satirlar(KENAR, 330, baslik, { boyut: baslikBoyutu })}
    ${alt.length ? satirlar(KENAR, icerikBaslangici, alt, { boyut: 30, aralik: 1.35, renk: METIN, kalin: 500 }) : ''}
    ${maddeler.length ? noktaListesi(icerikBaslangici, maddeler) : ''}
    <rect x="${KENAR}" y="1160" width="${EN - KENAR * 2}" height="138" rx="30" fill="${MAVI}" fill-opacity="0.96"/>
    ${satirlar(KENAR + 38, 1215, cagri, { boyut: 29, aralik: 1.35, renk: BEYAZ, kalin: 800 })}
    ${yazi(KENAR, 1372, 'stajimvar.com', { boyut: 24, renk: MAVI, kalin: 700 })}
  </svg>`;
};

const postlar = [
  {
    kod: 'ilana-gore-cv',
    ad: 'CV’ni ilana göre uyarlamanın 3 adımı — fotoğraflı taslak',
    foto: 'ilana-gore-cv.png',
    seri: 'İlana göre CV',
    metin: [
      'Aynı CV’yi her ilana göndermek yerine, deneyimini ilanın diline göre görünür kıl.',
      '',
      '• Önce ilanın dilini çöz; görevleri ve tekrar eden anahtar kelimeleri işaretle.',
      '• Yalnız gerçekten kullandığın becerileri CV’ndeki somut bir kanıtla eşleştir.',
      '• En ilgili proje ve deneyimi üst sıralara taşı; yapmadığın işi ekleme.',
      '',
      'Amaç anahtar kelime doldurmak değil, bu role neden uygun olduğunu hızlıca göstermek.',
    ].join('\n'),
    etiketler: ['#stajcv', '#stajbaşvurusu', '#cvhazırlama', '#ilkstaj', '#kariyer', '#üniversiteöğrencisi', '#stajimvar'],
    kartlar: [
      { baslik: ['Her ilana aynı', 'CV’yi gönderme.'], alt: ['Deneyimini ilanın diline göre', 'yeniden sıralaman yeterli.'], cagri: ['Kaydır → 3 adımda', 'ilanla eşleşen CV'] },
      { baslik: ['Önce ilanı', 'işaretle.'], maddeler: [['Görevler', 'Senden günlük olarak ne bekleniyor?'], ['Anahtar kelimeler', 'Hangi araç ve beceriler tekrar ediyor?'], ['Öncelikler', 'İlk üç beklenti hangisi?']], cagri: ['İlanın dilini anlamadan', 'CV satırını değiştirme.'] },
      { baslik: ['Her beklentiye', 'bir kanıt bağla.'], maddeler: [['Proje', 'Benzer bir problemi nerede çözdün?'], ['Katkın', 'O çalışmada tam olarak ne yaptın?'], ['Çıktı', 'Sonuç neydi, ne öğrendin?']], cagri: ['Anahtar kelime + gerçek örnek', '= ikna edici eşleşme'] },
      { baslik: ['En ilgili kanıtı', 'üste taşı.'], alt: ['Yapmadığın işi ekleme.', 'Uzun değil, seçici ol.'], cagri: ['CV’ni göndermeden önce', 'bu üç adımı kaydet.'] },
    ],
  },
  {
    kod: 'kendinden-bahset-cevabi',
    ad: '“Kendinden bahset” sorusuna net cevap — fotoğraflı taslak',
    foto: 'kendinden-bahset.png',
    seri: 'Mülakat cevabı',
    metin: [
      '“Kendinden bahset” sorusu bütün hayat hikâyeni anlatman için değil, role uygun yönünü kısa biçimde kurman için sorulur.',
      '',
      'Cevabını üç parçaya ayır:',
      '• Şu an: Bölümün, odağın veya üzerinde çalıştığın alan.',
      '• Geçmiş: Bu alana bağlanan tek somut proje ya da deneyim.',
      '• Bu rol: Neden bu stajla devam etmek istediğin.',
      '',
      'Yaklaşık bir dakikalık cevap hazırla; ezberlemek yerine ana fikri sesli prova et.',
    ].join('\n'),
    etiketler: ['#stajmülakatı', '#mülakattaktikleri', '#ilkstaj', '#kariyer', '#üniversiteöğrencisi', '#stajimvar'],
    kartlar: [
      { baslik: ['“Kendinden', 'bahset.”'], alt: ['Hayat hikâyen değil;', 'role bağlanan kısa bir yolculuk.'], cagri: ['Formül: şu an → geçmiş', '→ bu rol'] },
      { baslik: ['01 — Şu an', 'neredesin?'], alt: ['Bölümünü söyle.', 'Odağını tek cümlede anlat.', 'Rol için ilgili yönünü seç.'], cagri: ['Başlangıç net olsun;', 'uzun bir giriş yapma.'] },
      { baslik: ['02 — Geçmişten', 'tek kanıt seç.'], alt: ['Bir proje, kulüp görevi veya', 'gönüllülük örneği yeter.', 'Kendi katkını özellikle söyle.'], cagri: ['“Yer aldım” yerine', '“şunu yaptım” de.'] },
      { baslik: ['03 — Bu role', 'neden geldin?'], alt: ['Öğrenmek istediğin alanı', 'kurumun işiyle bağla.'], cagri: ['Bir dakikalık cevabını', 'bugün sesli prova et.'] },
    ],
  },
  {
    kod: 'online-mulakat-kontrolu',
    ad: 'Online mülakat öncesi 10 dakikalık kontrol — fotoğraflı taslak',
    foto: 'online-mulakat.png',
    seri: 'Online mülakat',
    metin: [
      'Online mülakattan 10 dakika önce küçük bir teknik kontrol, görüşmeye sorun çözerek başlamanı önler.',
      '',
      '• Kamera açısını ve ışığı kontrol et.',
      '• Mikrofonu ve kulaklığı kısa bir kayıtla dene.',
      '• Görüşme bağlantısını önceden aç; uygulama veya izin gerekiyorsa tamamla.',
      '• CV’ni, ilanı ve notlarını tek yerde hazır tut.',
      '• Bağlantı kesilirse kullanacağın telefon veya e-posta bilgisini yanında bulundur.',
      '',
      'Bildirimleri kapat, cihazını şarja tak ve görüşmeye birkaç dakika erken gir.',
    ].join('\n'),
    etiketler: ['#onlinemülakat', '#stajmülakatı', '#mülakathazırlığı', '#ilkstaj', '#kariyer', '#stajimvar'],
    kartlar: [
      { baslik: ['Online mülakata', '10 dakika kala'], alt: ['Cevaplardan önce', 'teknik zemini hazırla.'], cagri: ['Kaydır → kısa', 'kontrol listesi'] },
      { baslik: ['Görüntü ve sesi', 'gerçekten dene.'], maddeler: [['Kamera', 'Göz hizası, sade arka plan, yeterli ışık.'], ['Mikrofon', 'Kısa kayıt al; sesini geri dinle.'], ['Kulaklık', 'Şarjı ve bağlantısı hazır mı?']], cagri: ['“Çalışıyor olmalı” deme;', 'bir kez test et.'] },
      { baslik: ['Bağlantıyı', 'önceden aç.'], maddeler: [['Uygulama', 'Güncelleme veya giriş gerekiyor mu?'], ['İzinler', 'Kamera ve mikrofon erişimi açık mı?'], ['Yedek yol', 'Kesinti olursa nasıl haber vereceksin?']], cagri: ['Bağlantı bilgisini', 'telefonunda da tut.'] },
      { baslik: ['Bildirimleri kapat.', 'Şarja tak.', 'Erken gir.'], alt: ['CV, ilan ve kısa notların', 'tek ekranda hazır olsun.'], cagri: ['Görüşmeden önce', 'bu listeyi aç.'] },
    ],
  },
  {
    kod: 'motivasyon-yazisi',
    ad: 'Motivasyon yazısının 3 güçlü bölümü — fotoğraflı taslak',
    foto: 'motivasyon-yazisi.png',
    seri: 'Motivasyon yazısı',
    metin: [
      'Motivasyon yazısında yalnız “çok istiyorum” demek yetmez. Kurumu tanıdığını, hazırlığını ve katkı ihtimalini tek bir akışta göster.',
      '',
      '• Neden bu kurum: Seni çeken işi, ürünü veya çalışma alanını somutlaştır.',
      '• Neden sen: İlgili bir proje ya da deneyimden kısa bir örnek ver.',
      '• Nasıl katkı: Bu rolde hangi becerinle başlangıç yapabileceğini anlat.',
      '',
      'Genel övgüler yerine kurum ve rol için değişen iki üç cümle yaz. Kanıtlayamayacağın iddiaları kullanma.',
    ].join('\n'),
    etiketler: ['#motivasyonyazısı', '#niyetmektubu', '#stajbaşvurusu', '#kariyer', '#üniversiteöğrencisi', '#stajimvar'],
    kartlar: [
      { baslik: ['“Çok istiyorum”', 'tek başına', 'yetmez.'], alt: ['Motivasyonunu', 'somut bağlarla göster.'], cagri: ['3 bölüm: kurum', '→ kanıt → katkı'] },
      { baslik: ['Neden bu', 'kurum?'], alt: ['Genel övgü yazma.', 'Seni çeken işi, ürünü veya', 'çalışma alanını açıkça söyle.'], cagri: ['Bu paragraf başka kuruma', 'da uyuyorsa yeniden yaz.'] },
      { baslik: ['Neden sen?'], maddeler: [['Örnek seç', 'İlgili tek proje veya deneyim.'], ['Katkını ayır', 'Ekipte sen ne yaptın?'], ['Dersi bağla', 'Bu örnek role nasıl hazırlanmanı sağladı?']], cagri: ['Sıfat değil, kısa bir', 'kanıt kullan.'] },
      { baslik: ['Nasıl katkı', 'sunabilirsin?'], alt: ['Başlangıçta kullanabileceğin', 'beceriyi dürüstçe anlat.'], cagri: ['Yazını göndermeden önce', 'üç bölümü kontrol et.'] },
    ],
  },
  {
    kod: 'staj-teklifi-degerlendirme',
    ad: 'Staj teklifini değerlendirirken 5 kontrol — fotoğraflı taslak',
    foto: 'staj-teklifi.png',
    seri: 'Staj teklifi',
    metin: [
      'Staj teklifi geldiğinde yalnız kurum adına bakarak karar verme. Günlük deneyimin nasıl olacağını netleştir.',
      '',
      '• Görev: Günlük olarak ne yapacaksın?',
      '• Rehberlik: Sorularında kime ulaşacaksın?',
      '• Öğrenme: Hangi becerileri uygulama fırsatın olacak?',
      '• Koşul: Gün, saat, konum, ücret ve yan haklar nasıl?',
      '• Zaman: Karar vermen için son tarih nedir?',
      '',
      'Koşulları mümkünse yazılı gör; ulaşım ve zaman maliyetini de hesaba kat.',
    ].join('\n'),
    etiketler: ['#stajteklifi', '#staj', '#kariyerkararı', '#ilkstaj', '#üniversiteöğrencisi', '#stajimvar'],
    kartlar: [
      { baslik: ['Teklif geldi.', 'Peki sana', 'uygun mu?'], alt: ['Kurum adından önce', 'günlük deneyime bak.'], cagri: ['Kaydır → karar vermeden', 'önce 5 kontrol'] },
      { baslik: ['Rol ve desteği', 'netleştir.'], maddeler: [['Görev', 'Günlük olarak ne yapacaksın?'], ['Rehberlik', 'Sorularında kime ulaşacaksın?'], ['Öğrenme', 'Hangi becerileri uygulayacaksın?']], cagri: ['Unvanı değil, yaşayacağın', 'deneyimi değerlendir.'] },
      { baslik: ['Koşulları', 'yazılı gör.'], maddeler: [['Düzen', 'Gün, saat, konum ve başlangıç tarihi.'], ['Karşılık', 'Ücret, yemek, yol ve diğer haklar.'], ['Karar zamanı', 'Yanıt için son tarih nedir?']], cagri: ['Ulaşım ve zaman maliyetini', 'hesaba kat.'] },
      { baslik: ['Net teklif,', 'net karar.'], alt: ['Anlamadığın noktayı sor.', 'Gerekirse düşünmek için süre iste.'], cagri: ['Teklifi yanıtlamadan önce', 'bu 5 kontrolü aç.'] },
    ],
  },
  {
    kod: 'ilk-hafta-ogrenme-hedefi',
    ad: 'Stajın ilk haftası için öğrenme hedefi — fotoğraflı taslak',
    foto: 'ilk-hafta.png',
    seri: 'İlk hafta hedefi',
    metin: [
      'Stajın ilk haftasında her şeyi öğrenmeye çalışma. Gözlem, uygulama ve geri bildirim içeren küçük bir hedef seç.',
      '',
      '• Gözlem: Bir işin ekipte nasıl ilerlediğini izle ve adımlarını not et.',
      '• Uygulama: O sürecin küçük, güvenli bir bölümünü kendi başına tamamla.',
      '• Geri bildirim: Çıktın için tek ve değiştirilebilir bir noktayı sor.',
      '',
      'Hafta sonunda ne öğrendiğini, nerede zorlandığını ve gelecek haftanın ilk hedefini üç cümleyle yaz.',
    ].join('\n'),
    etiketler: ['#stajdailkhafta', '#öğrenmehedefi', '#stajyer', '#ilkstaj', '#kariyergelişimi', '#stajimvar'],
    kartlar: [
      { baslik: ['İlk hafta', 'her şeyi öğrenmeye', 'çalışma.'], alt: ['Küçük ve görünür', 'bir hedef seç.'], cagri: ['Formül: gözlem', '→ uygulama → geri bildirim'] },
      { baslik: ['Önce süreci', 'gözlemle.'], maddeler: [['Akış', 'İş hangi adımlardan geçiyor?'], ['İnsanlar', 'Kim, hangi noktada devreye giriyor?'], ['Ölçüt', 'İyi bir çıktı nasıl anlaşılıyor?']], cagri: ['Notun, ertesi gün', 'işe başlamanı kolaylaştırsın.'] },
      { baslik: ['Küçük bir parçayı', 'uygula.'], maddeler: [['Sınırı belirle', 'Tek başına yapabileceğin bölüm hangisi?'], ['Çıktı üret', 'Görülebilir küçük bir sonuç bırak.'], ['Geri bildirim al', 'İlk neyi değiştirmen gerektiğini sor.']], cagri: ['Hedef, öğrenmeyi', 'davranışa dönüştürsün.'] },
      { baslik: ['Haftayı 3 cümleyle', 'kapat.'], alt: ['Ne öğrendim?', 'Nerede zorlandım?', 'Sıradaki hedefim ne?'], cagri: ['İlk cuma günü', 'bu özeti kendine yaz.'] },
    ],
  },
];

for (const post of postlar) {
  const foto64 = fs.readFileSync(path.join(varlikKlasoru, post.foto)).toString('base64');
  const klasor = path.join(PAYLASIM, post.kod);
  fs.mkdirSync(klasor, { recursive: true });

  for (let i = 0; i < post.kartlar.length; i += 1) {
    const svg = kartSvg({
      foto64,
      seri: post.seri,
      sayfa: `${String(i + 1).padStart(2, '0')} / 04`,
      ...post.kartlar[i],
    });
    const hedef = path.join(klasor, `${String(i + 1).padStart(2, '0')}-${SURUM}.jpg`);
    await sharp(Buffer.from(svg), { density: 216 })
      .resize(1440, 1920, { kernel: 'lanczos3' })
      .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(hedef);
    console.log(`${post.kod}/${path.basename(hedef)}`);
  }
}

const manifestYolu = path.join(PAYLASIM, 'setler.json');
const eskiSetler = JSON.parse(fs.readFileSync(manifestYolu, 'utf8'));
const yeniKodlar = new Set(postlar.map((post) => post.kod));
const korunanSetler = eskiSetler.filter((set) => !yeniKodlar.has(set.kod));
const yeniSetler = postlar.map((post) => ({
  kod: post.kod,
  ad: post.ad,
  surum: SURUM,
  guncellendi: GUNCELLEME,
  metin: post.metin,
  etiketler: post.etiketler,
  kartlar: post.kartlar.map((_, i) => `/paylasim/${post.kod}/${String(i + 1).padStart(2, '0')}-${SURUM}.jpg`),
}));
fs.writeFileSync(manifestYolu, `${JSON.stringify([...korunanSetler, ...yeniSetler], null, 2)}\n`);

console.log(`\n${postlar.length} yeni taslak set yönetici paneli manifestine eklendi.`);
