import React from 'react';
import { BildirimDugmesi, BildirimMerkezi } from '../components/BildirimMerkezi';
import { SIRKET_KENAR, SIRKET_METIN, SIRKET_VURGU_KOYU, SIRKET_YUZEY, SIRKET_ZEMIN } from '../sirket/renk';
import type { Bildirim, BildirimBasvurusu } from '../lib/bildirim';
import { basvuruGorseli } from '../lib/bildirim-basvurusu.mjs';

/**
 * Bildirim merkezinin bütün halleri.
 *
 * NEDEN GEREKİYOR
 * ---------------
 * Bildirimler yalnızca giriş yapmış, gerçekten başvurusu olan bir
 * kullanıcıda görünüyor ve türlerin hepsini tek hesapta bir araya
 * getirmek mümkün değil. Panel iki dünyada da aynı bileşen ama farklı
 * renkle çiziliyor; ikisi de burada.
 *
 * Fikstür gerçek bileşeni çiziyor, kopyasını değil. Üretim paketine
 * girmiyor.
 */

const dk = (n: number) => new Date(Date.now() - n * 60000).toISOString();

const UZUN_ILAN = 'Bulut Altyapısı, Veri Mühendisliği ve Yapay Zekâ Uygulamaları Yarı Zamanlı Uzun Dönem Stajyeri';

const OGRENCI: Bildirim[] = [
  /* Sosyal örnekler (geliştirici fikstürü): bağlantı isteği satır içi yanıtı ve beğeni. */
  {
    id: 's1',
    tur: 'baglanti_istegi',
    baslik: 'Yeni bağlantı isteği',
    govde: '@ornekkullanici seninle bağlantı kurmak istiyor.',
    hedef: '/baglantilar',
    basvuruId: null,
    anahtar: 'baglanti_istegi:ornek:ben',
    okunduMu: false,
    tarih: dk(1),
  },
  {
    id: 's2',
    tur: 'paylasim_begeni',
    baslik: 'Paylaşımın beğenildi',
    govde: '@ornekkullanici paylaşımını beğendi.',
    hedef: '/cv',
    basvuruId: null,
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 24 * 12),
  },
  {
    /* Logolu, kare logo. */
    id: '1',
    tur: 'gorusme_daveti',
    baslik: 'Görüşme daveti aldın',
    govde: 'Örnek Teknoloji seni Yazılım Geliştirme Stajyeri pozisyonu için görüşmeye davet etti.',
    hedef: '/profil?basvuru=b1',
    basvuruId: 'b1',
    anahtar: null,
    okunduMu: false,
    tarih: dk(2),
  },
  {
    /* Logosuz şirket: tür simgesi kalmalı, adlar yine vurgulu. */
    id: '2',
    tur: 'teklif',
    baslik: 'Teklif aldın',
    govde: 'Örnek Veri · Veri Analisti Stajyeri pozisyonu için teklif gönderdi.',
    hedef: '/profil?basvuru=b2',
    basvuruId: 'b2',
    anahtar: null,
    okunduMu: false,
    tarih: dk(75),
  },
  {
    /* Şirketin başvuruyu ilk açışı (7 Ekim 2026): logo görünmeli, rozet göz. */
    id: '20',
    tur: 'basvuru_goruntulendi',
    baslik: 'Şirket başvurunu görüntüledi',
    govde: 'Örnek Teknoloji · Yazılım Geliştirme Stajyeri başvurunu açıp inceledi.',
    hedef: '/profil?basvuru=b1',
    basvuruId: 'b1',
    anahtar: null,
    okunduMu: false,
    tarih: dk(30),
  },
  {
    /* Canlı ekran görüntüsündeki satırın birebiri: kısa ilan adı cümleye yapışıyordu. */
    id: '9',
    tur: 'inceleniyor',
    baslik: 'Başvurun inceleniyor',
    govde: 'Örnek Moda · Stajyer başvurunu incelemeye aldı.',
    hedef: '/profil?basvuru=b5',
    basvuruId: 'b5',
    anahtar: null,
    okunduMu: false,
    tarih: dk(60 * 24 * 2),
  },
  {
    id: '3',
    tur: 'gorusme_guncellendi',
    baslik: 'Görüşme davetin güncellendi',
    govde: 'Örnek Teknoloji · Yazılım Geliştirme Stajyeri görüşme bilgileri değişti.',
    hedef: '/profil?basvuru=b1',
    basvuruId: 'b1',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 26),
  },
  {
    /* Uzun şirket + ilan adı, 4:1 yatay logo (wongdoody.jpg, 3000×751): logo okunur, ilan adı kesilmez. */
    id: '4',
    tur: 'inceleniyor',
    baslik: 'Başvurun inceleniyor',
    govde:
      'Örnek Bilim ve Teknoloji Araştırma Kurumu · Yapay Zekâ ve Makine Öğrenmesi Araştırma Stajyeri (Doğal Dil İşleme ve Bilgisayarlı Görü Ekibi) başvurunu incelemeye aldı.',
    hedef: '/profil?basvuru=b3',
    basvuruId: 'b3',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 24 * 3),
  },
  {
    /* İlan bildirimden sonra yeniden adlandırılmış: yalnız şirket vurgulu, metin aynen. */
    id: '10',
    tur: 'degerlendirme',
    baslik: 'Başvurun değerlendirme aşamasında',
    govde: 'Örnek Lojistik · Operasyon Stajyeri başvurun değerlendiriliyor.',
    hedef: '/profil?basvuru=b6',
    basvuruId: 'b6',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 24 * 4),
  },
  {
    /* Logo adresi kuraldan geçiyor ama dosya yok: `onError` → tür simgesi. */
    id: '5',
    tur: 'olumsuz',
    baslik: 'Başvurun sonuçlandı',
    govde: 'Örnek Veri · Pazarlama Stajyeri başvurun bu süreçte ilerlemedi.',
    hedef: '/profil?basvuru=b4',
    basvuruId: 'b4',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 24 * 20),
  },
  {
    /* Logosuz şirket + uzun ilan adı: tür simgesi, ilan adı yine tam okunur (kırpma görselden bağımsız kalktı). */
    id: '15',
    tur: 'gorusme_daveti',
    baslik: 'Görüşme daveti aldın',
    govde: `Örnek Yazılım seni ${UZUN_ILAN} pozisyonu için görüşmeye davet etti.`,
    hedef: '/profil?basvuru=b7',
    basvuruId: 'b7',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 24 * 21),
  },
  {
    /* Sosyal bildirim, uzun metin: düzeni değişmedi, üç satırda kırpılmaya devam ediyor. */
    id: 's3',
    tur: 'baglanti_kabul',
    baslik: 'Bağlantı isteğin kabul edildi',
    govde: '@cokuzunbirkullaniciadiolanornekkullanici bağlantı isteğini kabul etti; artık birbirinizin paylaşımlarını, portfolyosunu ve deneyimlerini görebilirsiniz.',
    hedef: '/baglantilar',
    basvuruId: null,
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 24 * 22),
  },
];

const SIRKET: Bildirim[] = [
  {
    /* Rıza + internal + doğrulanmış şirket + depo adresi: fotoğraf. */
    id: '6',
    tur: 'yeni_basvuru',
    baslik: 'Yeni başvuru',
    govde: 'Deniz Arslan · IT Stajyeri',
    hedef: '/sirket/basvuranlar?aday=x1',
    basvuruId: 'x1',
    anahtar: null,
    okunduMu: false,
    tarih: dk(1),
  },
  {
    /* Uzun ilan adı: kendi satırında, kesilmeden. */
    id: '11',
    tur: 'yeni_basvuru',
    baslik: 'Yeni başvuru',
    govde:
      'Ayşe Yılmaz · Yapay Zekâ ve Makine Öğrenmesi Araştırma Stajyeri (Doğal Dil İşleme ve Bilgisayarlı Görü Ekibi)',
    hedef: '/sirket/basvuranlar?aday=x2',
    basvuruId: 'x2',
    anahtar: null,
    okunduMu: false,
    tarih: dk(12),
  },
  {
    /* Rıza yok: kural `null` → tür simgesi ve sunucu metni aynen. */
    id: '12',
    tur: 'yeni_basvuru',
    baslik: 'Yeni başvuru',
    govde: 'Bir aday · IT Stajyeri',
    hedef: '/sirket/basvuranlar?aday=x3',
    basvuruId: 'x3',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 3),
  },
  {
    /* Fotoğraf başka bir sunucuda: kural adresi reddediyor → simge, ad ve ilan yine okunur. */
    id: '13',
    tur: 'yeni_basvuru',
    baslik: 'Yeni başvuru',
    govde: 'Can Demir · Grafik Tasarım Stajyeri',
    hedef: '/sirket/basvuranlar?aday=x4',
    basvuruId: 'x4',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 5),
  },
  {
    /* Adres kuraldan geçiyor ama dosya inmiyor: `onError` → simge. */
    id: '14',
    tur: 'yeni_basvuru',
    baslik: 'Yeni başvuru',
    govde: 'Zeynep Kaya · İnsan Kaynakları Stajyeri',
    hedef: '/sirket/basvuranlar?aday=x5',
    basvuruId: 'x5',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 7),
  },
  {
    /* Rıza var, fotoğraf yok: tür simgesi; ad koyu, uzun ilan adı kendi satırında tam. */
    id: '17',
    tur: 'yeni_basvuru',
    baslik: 'Yeni başvuru',
    govde: `Elif Şahin · ${UZUN_ILAN}`,
    hedef: '/sirket/basvuranlar?aday=x6',
    basvuruId: 'x6',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 8),
  },
  {
    /* Rıza yok: kural `null` → simge ve sunucu metni; uzun ilan adı yine kırpılmıyor. */
    id: '18',
    tur: 'yeni_basvuru',
    baslik: 'Yeni başvuru',
    govde: `Bir aday · ${UZUN_ILAN}`,
    hedef: '/sirket/basvuranlar?aday=x7',
    basvuruId: 'x7',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 9),
  },
  {
    /* Görseli olmayan başka bir başvuru türü: kırpma burada da yok. */
    id: '16',
    tur: 'geri_cekildi',
    baslik: 'Burak Çelik başvurusunu geri çekti',
    govde: UZUN_ILAN,
    hedef: '/sirket/basvuranlar?aday=x8',
    basvuruId: 'x8',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 10),
  },
  {
    id: '7',
    tur: 'gorusme_kabul',
    baslik: 'Deniz Arslan görüşme davetini kabul etti',
    govde: 'IT Stajyeri',
    hedef: '/sirket/basvuranlar?aday=x1',
    basvuruId: 'x1',
    anahtar: null,
    okunduMu: false,
    tarih: dk(40),
  },
  {
    id: '8',
    tur: 'teklif_kabul',
    baslik: 'Deniz Arslan teklifini kabul etti',
    govde: 'IT Stajyeri · iletişim bilgileri artık açık.',
    hedef: '/sirket/basvuranlar?aday=x1',
    basvuruId: 'x1',
    anahtar: null,
    okunduMu: true,
    tarih: dk(60 * 30),
  },
];

/*
  BAŞVURU SATIRLARI — ÖRNEK VERİ, `bildirimBasvurulariniGetir` biçiminde

  Görsel kararı GERÇEK kuraldan (`basvuruGorseli`) geçiyor; fikstür kural
  yazmıyor. Aday fotoğrafı kuralı yalnız depo kökünün HTTPS `avatars`
  adresini kabul ediyor, bu yüzden fikstürün kendi sahte depo kökü var
  (`.invalid` hiçbir yere çözülmüyor). Kuraldan geçen adres, ağa çıkmasın
  diye `yerelGorsel` ile sayfanın içindeki bir SVG'ye çevriliyor; listede
  olmayan adres inmeyen bir yerel yola gidiyor ve `onError` dalı görülüyor.

  Logolar depodaki `public/isveren-logolari` dosyaları; şirket adları
  "Örnek …" — logo yalnız görsel ölçüsünü sınamak için.
*/
const FIKSTUR_DEPO = 'https://fikstur.invalid';
const avatar = (dosya: string) => `${FIKSTUR_DEPO}/storage/v1/object/public/avatars/fikstur/${dosya}`;

const basHarfSvg = (harfler: string, zemin: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${zemin}"/><text x="48" y="61" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${harfler}</text></svg>`,
  )}`;
const YEREL_GORSELLER: Record<string, string> = {
  [avatar('mod.jpg')]: basHarfSvg('DA', '#0F766E'),
  [avatar('ay.jpg')]: basHarfSvg('AY', '#7C3AED'),
};
const yerelGorsel = (adres: string) => YEREL_GORSELLER[adres] ?? '/fikstur-olmayan-gorsel.jpg';

const sirket = (ad: string, logo: string | null, dogrulanmis = true) => ({ ad, logo, dogrulanmis });
const basvuruSatiri = (
  baslik: string,
  sirketi: ReturnType<typeof sirket>,
  aday: Partial<Pick<BildirimBasvurusu, 'yontem' | 'rizaTarihi' | 'adayAdi' | 'adayFotografi'>> = {},
): BildirimBasvurusu => ({
  yontem: 'internal',
  rizaTarihi: '2026-10-01T10:00:00Z',
  adayAdi: null,
  adayFotografi: null,
  ...aday,
  ilan: { baslik, sirket: sirketi },
});

const BASVURULAR = new Map<string, BildirimBasvurusu>([
  ['b1', basvuruSatiri('Yazılım Geliştirme Stajyeri', sirket('Örnek Teknoloji', '/isveren-logolari/aselsan.png'))],
  ['b2', basvuruSatiri('Veri Analisti Stajyeri', sirket('Örnek Veri', null))],
  [
    'b3',
    basvuruSatiri(
      'Yapay Zekâ ve Makine Öğrenmesi Araştırma Stajyeri (Doğal Dil İşleme ve Bilgisayarlı Görü Ekibi)',
      sirket('Örnek Bilim ve Teknoloji Araştırma Kurumu', '/isveren-logolari/wongdoody.jpg'),
    ),
  ],
  ['b4', basvuruSatiri('Pazarlama Stajyeri', sirket('Örnek Veri', '/isveren-logolari/fikstur-olmayan-logo.png'))],
  ['b5', basvuruSatiri('Stajyer', sirket('Örnek Moda', '/isveren-logolari/hellmann-worldwide-logistics.svg'))],
  /* 1,9:1 yatay logo (yami-studios-og.jpg, 1200×630). */
  ['b6', basvuruSatiri('Lojistik Operasyon Stajyeri', sirket('Örnek Lojistik', '/isveren-logolari/yami-studios-og.jpg'))],
  ['b7', basvuruSatiri(UZUN_ILAN, sirket('Örnek Yazılım', null))],
  [
    'x6',
    basvuruSatiri(UZUN_ILAN, sirket('Örnek Şirket', null), { adayAdi: 'Elif Şahin', adayFotografi: null }),
  ],
  [
    'x7',
    basvuruSatiri(UZUN_ILAN, sirket('Örnek Şirket', null), { rizaTarihi: null, adayAdi: 'Rızasız Aday' }),
  ],
  ['x8', basvuruSatiri(UZUN_ILAN, sirket('Örnek Şirket', null), { adayAdi: 'Burak Çelik' })],
  [
    'x1',
    basvuruSatiri('IT Stajyeri', sirket('Örnek Şirket', null), {
      adayAdi: 'Deniz Arslan',
      adayFotografi: avatar('mod.jpg'),
    }),
  ],
  [
    'x2',
    basvuruSatiri(
      'Yapay Zekâ ve Makine Öğrenmesi Araştırma Stajyeri (Doğal Dil İşleme ve Bilgisayarlı Görü Ekibi)',
      sirket('Örnek Şirket', null),
      { adayAdi: 'Ayşe Yılmaz', adayFotografi: avatar('ay.jpg') },
    ),
  ],
  [
    'x3',
    basvuruSatiri('IT Stajyeri', sirket('Örnek Şirket', null), {
      rizaTarihi: null,
      adayAdi: 'Rızasız Aday',
      adayFotografi: avatar('mod.jpg'),
    }),
  ],
  [
    'x4',
    basvuruSatiri('Grafik Tasarım Stajyeri', sirket('Örnek Şirket', null), {
      adayAdi: 'Can Demir',
      adayFotografi: 'https://baska-sunucu.example/can.jpg',
    }),
  ],
  [
    'x5',
    basvuruSatiri('İnsan Kaynakları Stajyeri', sirket('Örnek Şirket', null), {
      adayAdi: 'Zeynep Kaya',
      adayFotografi: avatar('silinmis.jpg'),
    }),
  ],
]);

const basvuruBilgisi = (b: Bildirim) => {
  const gorsel = basvuruGorseli(b.tur, b.basvuruId ? (BASVURULAR.get(b.basvuruId) ?? null) : null, FIKSTUR_DEPO);
  return gorsel?.tip === 'aday' && gorsel.foto ? { ...gorsel, foto: yerelGorsel(gorsel.foto) } : gorsel;
};

type Dunya = 'ogrenci' | 'sirket' | 'bos' | 'cok';

/*
  SAHTE SİLME GECİKMESİ: "Siliniyor…" durumu ve kilitli düğme gözle
  görülebilsin diye. Gerçek yanıt süresi iddia edilmiyor.
*/
const SILME_GECIKMESI_MS = 900;

export const BildirimDevFixture: React.FC = () => {
  const [dunya, setDunya] = React.useState<Dunya>(() =>
    new URLSearchParams(window.location.search).get('dunya') === 'sirket' ? 'sirket' : 'ogrenci',
  );
  const [acik, setAcik] = React.useState(true);
  const [kayitlar, setKayitlar] = React.useState<Bildirim[]>(OGRENCI);
  const [sonTiklanan, setSonTiklanan] = React.useState<string>('—');
  /* Test kolu: açıkken her silme sunucu hatası gibi reddediliyor, satır yerinde kalmalı. */
  const [silmeBasarisiz, setSilmeBasarisiz] = React.useState(false);
  const [silmeIstekleri, setSilmeIstekleri] = React.useState(0);

  React.useEffect(() => {
    setKayitlar(
      dunya === 'sirket'
        ? SIRKET
        : dunya === 'bos'
          ? []
          : dunya === 'cok'
            ? Array.from({ length: 14 }, (_, i) => ({ ...OGRENCI[i % OGRENCI.length], id: `c${i}`, okunduMu: false }))
            : OGRENCI,
    );
  }, [dunya]);

  const sirkette = dunya === 'sirket';
  const renk = sirkette ? SIRKET_VURGU_KOYU : '#2563EB';
  const okunmamis = kayitlar.filter((b) => !b.okunduMu).length;

  return (
    <div
      className="min-h-screen"
      style={sirkette ? { background: SIRKET_ZEMIN, color: SIRKET_METIN } : { background: '#F9FAFB' }}
    >
      {/* Test kolları — gerçek üründe yok. */}
      <div className="fixed left-2 top-20 z-[300] flex flex-wrap gap-1 rounded-xl bg-white p-2 text-xs shadow-lg">
        {(['ogrenci', 'sirket', 'bos', 'cok'] as Dunya[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDunya(d)}
            className={`rounded-lg px-2 py-1 font-bold ${dunya === d ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSilmeBasarisiz((o) => !o)}
          aria-pressed={silmeBasarisiz}
          className={`rounded-lg px-2 py-1 font-bold ${silmeBasarisiz ? 'bg-red-700 text-white' : 'bg-gray-100'}`}
        >
          silme {silmeBasarisiz ? 'başarısız' : 'başarılı'}
        </button>
      </div>

      <header
        className="sticky top-0 z-30 border-b"
        style={
          sirkette
            ? { background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }
            : { background: '#fff', borderColor: '#E5E7EB' }
        }
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <span className="font-black tracking-tight">StajımVar</span>
          <div className="ml-auto">
            <BildirimDugmesi
              okunmamis={okunmamis}
              renk={renk}
              onAc={() => setAcik(true)}
              style={sirkette ? { color: SIRKET_METIN } : undefined}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-2 p-4 text-sm">
        <p className="text-gray-500">Son tıklanan bildirim hedefi: {sonTiklanan}</p>
        <p className="text-gray-500">Okunmamış: {okunmamis}</p>
        <p className="text-gray-500" data-silme-istekleri={silmeIstekleri}>
          Gönderilen silme isteği: {silmeIstekleri}
        </p>
      </main>

      {acik && (
        <BildirimMerkezi
          bildirimler={kayitlar}
          okunmamis={okunmamis}
          yukleniyor={false}
          renk={renk}
          onKapat={() => setAcik(false)}
          onAc={(b) => {
            setKayitlar((o) => o.map((x) => (x.id === b.id ? { ...x, okunduMu: true } : x)));
            setSonTiklanan(b.hedef ?? '—');
            setAcik(false);
          }}
          onTumunuOkundu={() => setKayitlar((o) => o.map((x) => ({ ...x, okunduMu: true })))}
          /* Fikstür: fotoğraf yolu yok, bileşen baş harfleri çiziyor. */
          kisi={(b) => (b.id.startsWith('s') ? { ad: 'Örnek Kullanıcı', avatarYolu: null } : null)}
          basvuru={basvuruBilgisi}
          /*
            Gerçek kancayla aynı sözleşme: satır ancak "sunucu" onaylayınca
            listeden çıkıyor; başarısızlıkta söz reddediliyor.
          */
          onSil={async (b) => {
            setSilmeIstekleri((n) => n + 1);
            await new Promise((coz) => setTimeout(coz, SILME_GECIKMESI_MS));
            if (silmeBasarisiz) throw new Error('Bildirim silinemedi');
            setKayitlar((o) => o.filter((x) => x.id !== b.id));
          }}
          onBaglantiYanitla={async (id, karar) => {
            setKayitlar((o) => o.map((x) => (x.id === id ? { ...x, okunduMu: true } : x)));
            return karar;
          }}
        />
      )}
    </div>
  );
};
