import React from 'react';
import { BildirimDugmesi, BildirimMerkezi } from '../components/BildirimMerkezi';
import { SIRKET_KENAR, SIRKET_METIN, SIRKET_VURGU_KOYU, SIRKET_YUZEY, SIRKET_ZEMIN } from '../sirket/renk';
import type { Bildirim } from '../lib/bildirim';

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

const OGRENCI: Bildirim[] = [
  {
    id: '1',
    tur: 'gorusme_daveti',
    baslik: 'Görüşme daveti aldın',
    govde: 'Örnek Teknoloji seni Yazılım Geliştirme Stajyeri pozisyonu için görüşmeye davet etti.',
    hedef: '/profil?basvuru=b1',
    basvuruId: 'b1',
    okunduMu: false,
    tarih: dk(2),
  },
  {
    id: '2',
    tur: 'teklif',
    baslik: 'Teklif aldın',
    govde: 'Örnek Veri · Veri Analisti Stajyeri pozisyonu için teklif gönderdi.',
    hedef: '/profil?basvuru=b2',
    basvuruId: 'b2',
    okunduMu: false,
    tarih: dk(75),
  },
  {
    id: '3',
    tur: 'gorusme_guncellendi',
    baslik: 'Görüşme davetin güncellendi',
    govde: 'Örnek Teknoloji · staj görüşme bilgileri değişti.',
    hedef: '/profil?basvuru=b1',
    basvuruId: 'b1',
    okunduMu: true,
    tarih: dk(60 * 26),
  },
  {
    /* Uzun şirket + ilan adı: satır taşmamalı. */
    id: '4',
    tur: 'inceleniyor',
    baslik: 'Başvurun inceleniyor',
    govde:
      'Türkiye Bilimsel ve Teknolojik Araştırma Kurumu · Yapay Zekâ ve Makine Öğrenmesi Araştırma Stajyeri başvurunu incelemeye aldı.',
    hedef: '/profil?basvuru=b3',
    basvuruId: 'b3',
    okunduMu: true,
    tarih: dk(60 * 24 * 3),
  },
  {
    id: '5',
    tur: 'olumsuz',
    baslik: 'Başvurun sonuçlandı',
    govde: 'Örnek Veri · staj başvurun bu süreçte ilerlemedi.',
    hedef: '/profil?basvuru=b4',
    basvuruId: 'b4',
    okunduMu: true,
    tarih: dk(60 * 24 * 20),
  },
];

const SIRKET: Bildirim[] = [
  {
    id: '6',
    tur: 'yeni_basvuru',
    baslik: 'Yeni başvuru',
    govde: 'Mustafa Oğulcan Doğan · IT Stajyeri',
    hedef: '/sirket/basvuranlar?aday=x1',
    basvuruId: 'x1',
    okunduMu: false,
    tarih: dk(1),
  },
  {
    id: '7',
    tur: 'gorusme_kabul',
    baslik: 'Mustafa Oğulcan Doğan görüşme davetini kabul etti',
    govde: 'IT Stajyeri',
    hedef: '/sirket/basvuranlar?aday=x1',
    basvuruId: 'x1',
    okunduMu: false,
    tarih: dk(40),
  },
  {
    id: '8',
    tur: 'teklif_kabul',
    baslik: 'Mustafa Oğulcan Doğan teklifini kabul etti',
    govde: 'IT Stajyeri · iletişim bilgileri artık açık.',
    hedef: '/sirket/basvuranlar?aday=x1',
    basvuruId: 'x1',
    okunduMu: true,
    tarih: dk(60 * 30),
  },
];

type Dunya = 'ogrenci' | 'sirket' | 'bos' | 'cok';

export const BildirimDevFixture: React.FC = () => {
  const [dunya, setDunya] = React.useState<Dunya>('ogrenci');
  const [acik, setAcik] = React.useState(true);
  const [kayitlar, setKayitlar] = React.useState<Bildirim[]>(OGRENCI);
  const [sonTiklanan, setSonTiklanan] = React.useState<string>('—');

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
        />
      )}
    </div>
  );
};
