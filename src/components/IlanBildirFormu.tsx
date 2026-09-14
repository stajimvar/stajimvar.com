import React from 'react';

/**
 * İLAN BİLDİRME FORMU
 *
 * /ilan-bildir "Bildirimler için özel bir form henüz yok; e-posta
 * yazmanız yeterli" diyordu. Kapanmış bir ilanı gören öğrencinin
 * yapacağı iş, e-posta istemcisi açıp bağlantıyı elle kopyalamaktı —
 * pratikte kimse bildirmiyordu. Oysa kapanmış ilanı listeden düşürmek
 * bu ürünün asıl vaadi.
 *
 * HESAP İSTEMİYOR: bozuk ilanı gören kişi çoğunlukla giriş yapmamış bir
 * ziyaretçi. Hesap şartı, bildirimi hiç almamak demekti.
 *
 * YAZMA İSTEMCİDEN DEĞİL: gönderim `/api/ilan-bildir` uç noktasına
 * gidiyor. Hız sınırı IP'ye bağlı ve IP'yi yalnız sunucu görüyor;
 * veritabanı fonksiyonu istemciye kapalı (bkz. 20260929010000).
 */

export interface BildirimOnDolgusu {
  /** İlan sayfasından gelindiyse dolu; kullanıcı yine değiştirebiliyor. */
  listingUrl?: string;
  companyName?: string;
  positionTitle?: string;
}

const SEBEPLER: Array<{ deger: string; etiket: string }> = [
  { deger: 'kapanmis_ilan', etiket: 'Kapanmış ilan' },
  { deger: 'yanlis_bilgi', etiket: 'Yanlış bilgi' },
  { deger: 'ucret_talebi', etiket: 'Ücret talebi' },
  { deger: 'ayirimci_ifade', etiket: 'Ayrımcı ifade' },
  { deger: 'sahte_ilan', etiket: 'Sahte ilan' },
  { deger: 'kirik_baglanti', etiket: 'Kırık bağlantı' },
  { deger: 'diger', etiket: 'Diğer' },
];

/* Tasarım sistemi aynen: kurumsal sayfalardaki kart ve alan ölçüleri. */
const ALAN =
  'w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-[15px] text-gray-900 ' +
  'placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const ETIKET = 'block text-sm font-semibold text-gray-800';

export const IlanBildirFormu: React.FC<{ onDolgu?: BildirimOnDolgusu }> = ({ onDolgu }) => {
  const [listingUrl, setListingUrl] = React.useState(onDolgu?.listingUrl ?? '');
  const [companyName, setCompanyName] = React.useState(onDolgu?.companyName ?? '');
  const [positionTitle, setPositionTitle] = React.useState(onDolgu?.positionTitle ?? '');
  const [reason, setReason] = React.useState('kapanmis_ilan');
  const [details, setDetails] = React.useState('');
  const [eposta, setEposta] = React.useState('');

  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [hata, setHata] = React.useState<string | null>(null);
  /*
    BAŞARI YALNIZ KAYIT KALICI OLDUĞUNDA

    Uç nokta yalnız satır veritabanına yazıldığında `tamam` dönüyor.
    İstemci "gönderildi" demek için başka hiçbir şeye bakmıyor — ağ
    isteği başladı diye başarı göstermek, kaybolan bir bildirimi
    alınmış gibi sunmak olurdu.
  */
  const [alindi, setAlindi] = React.useState(false);

  if (alindi) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-[15px] leading-relaxed text-emerald-900"
      >
        <p className="font-bold">Bildirimin alındı.</p>
        <p className="mt-1">
          İnceledikten sonra gerekli işlemi yapacağız. Tek bir bildirim ilanı kendiliğinden
          yayından kaldırmıyor; kaydı kaynağından kontrol ediyoruz.
        </p>
      </div>
    );
  }

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    if (gonderiliyor) return;
    if (!listingUrl.trim()) {
      setHata('İlanın sitedeki bağlantısını yaz.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      const yanit = await fetch('/api/ilan-bildir', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listing_url: listingUrl,
          company_name: companyName,
          position_title: positionTitle,
          reason,
          details,
          reporter_email: eposta,
        }),
      });
      const govde = (await yanit.json().catch(() => ({}))) as { tamam?: boolean; hata?: string };
      if (yanit.ok && govde.tamam) {
        setAlindi(true);
        return;
      }
      setHata(govde.hata || 'Bildirim kaydedilemedi. Biraz sonra tekrar dene.');
    } catch {
      setHata('Bağlantı kurulamadı. Biraz sonra tekrar dene.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <form onSubmit={gonder} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label className={ETIKET} htmlFor="bildir-url">
          İlanın sitedeki bağlantısı
        </label>
        <input
          id="bildir-url"
          type="url"
          required
          value={listingUrl}
          onChange={(o) => setListingUrl(o.target.value)}
          placeholder="https://stajimvar.com/ilan/..."
          className={ALAN}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={ETIKET} htmlFor="bildir-sirket">
            Şirket adı
          </label>
          <input
            id="bildir-sirket"
            value={companyName}
            onChange={(o) => setCompanyName(o.target.value)}
            className={ALAN}
          />
        </div>
        <div className="space-y-1.5">
          <label className={ETIKET} htmlFor="bildir-pozisyon">
            Pozisyon başlığı
          </label>
          <input
            id="bildir-pozisyon"
            value={positionTitle}
            onChange={(o) => setPositionTitle(o.target.value)}
            className={ALAN}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={ETIKET} htmlFor="bildir-sebep">
          Sorun ne?
        </label>
        <select
          id="bildir-sebep"
          value={reason}
          onChange={(o) => setReason(o.target.value)}
          className={ALAN}
        >
          {SEBEPLER.map((s) => (
            <option key={s.deger} value={s.deger}>
              {s.etiket}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className={ETIKET} htmlFor="bildir-aciklama">
          Açıklama
        </label>
        <textarea
          id="bildir-aciklama"
          rows={4}
          value={details}
          onChange={(o) => setDetails(o.target.value)}
          placeholder="Ne gördüğünü kısaca yaz."
          className={`${ALAN} py-2.5`}
        />
      </div>

      <div className="space-y-1.5">
        <label className={ETIKET} htmlFor="bildir-eposta">
          E-postan <span className="font-normal text-gray-600">(isteğe bağlı)</span>
        </label>
        <input
          id="bildir-eposta"
          type="email"
          value={eposta}
          onChange={(o) => setEposta(o.target.value)}
          placeholder="Dönüş yapmamızı istersen"
          className={ALAN}
        />
        {/*
          Ekran görüntüsü alanı YOK: güvenli anonim dosya yükleme yolu
          henüz kurulmadı. Çalışmayan bir yükleme kutusu çizmek, olmayan
          bir özelliği vaat etmek olurdu.
        */}
      </div>

      {hata && (
        <p role="alert" className="text-sm font-semibold text-rose-700">
          {hata}
        </p>
      )}

      <button
        type="submit"
        disabled={gonderiliyor}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
      >
        {gonderiliyor ? 'Gönderiliyor…' : 'Bildirimi gönder'}
      </button>
    </form>
  );
};
