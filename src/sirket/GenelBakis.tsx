import React from 'react';
import { AlertCircle, ArrowRight, Lock, Plus, ShieldCheck } from 'lucide-react';
import {
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { adayGorebilir } from '../lib/sirket-kademe.mjs';
import { daysUntilDeadline } from '../lib/opportunity-domain.mjs';
import type { SirketBaglami } from '../lib/sirket-veri';

/**
 * Şirket panelinin genel bakışı.
 *
 * SAHTE GÖSTERGE YOK
 * ------------------
 * Görüntülenme sayısı, dönüşüm oranı, "bu hafta %12 artış" gibi hiçbir
 * metrik yok — bunların hiçbiri veritabanında tutulmuyor ve uydurmak
 * paneli bir gösterge tahtası taklidine çevirirdi. Buradaki dört sayı
 * gerçekten sayılabilen şeyler: kaç ilan yayında, kaç taslak bekliyor,
 * kaç başvuru geldi, doğrulama hangi durumda.
 *
 * SAYI DEĞİL, SIRADAKİ İŞ
 * -----------------------
 * Kutuların altında "şimdi ne yapmalı" satırı duruyor. İlan yoksa tek
 * güçlü çağrı; taslak varsa taslağa, doğrulama eksikse doğrulamaya
 * götürüyor. Bir gösterge tahtası sayı gösterir; bir panel iş çıkartır.
 */

const Sayi: React.FC<{
  etiket: string;
  deger: React.ReactNode;
  alt?: string;
  kilitli?: boolean;
  onClick?: () => void;
}> = ({ etiket, deger, alt, kilitli, onClick }) => {
  const icerik = (
    <>
      <p
        className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide"
        style={{ color: SIRKET_METIN_IKINCIL }}
      >
        {kilitli && <Lock className="h-3 w-3" />}
        {etiket}
      </p>
      <p
        className="mt-0.5 text-2xl font-black"
        style={{ color: kilitli ? SIRKET_METIN_IKINCIL : SIRKET_METIN }}
      >
        {deger}
      </p>
      {alt && (
        <p className="text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
          {alt}
        </p>
      )}
    </>
  );

  if (!onClick) {
    return (
      <div className="rounded-2xl border p-4" style={kutuStil}>
        {icerik}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-2xl border p-4 text-left transition-shadow hover:shadow-sm"
      style={kutuStil}
    >
      {icerik}
    </button>
  );
};

export const GenelBakis: React.FC<{
  baglam: SirketBaglami;
  ilanlar: Record<string, unknown>[];
  basvurular: Record<string, any>[];
  onNavigate: (yol: string) => void;
}> = ({ baglam, ilanlar, basvurular, onNavigate }) => {
  const acik = ilanlar.filter((i) => i.status === 'published');
  const taslak = ilanlar.filter((i) => i.status === 'draft');
  const kartAcik = adayGorebilir(baglam.kademe);
  const yeni = basvurular.filter((b) => b.durum === 'submitted');

  /* Yaklaşan kapanışlar: yalnızca son başvuru tarihi GİRİLMİŞ ilanlar. */
  const yaklasan = acik
    .map((i) => ({ ilan: i, kalan: daysUntilDeadline(i.application_deadline as string, new Date()) }))
    .filter((x) => x.kalan != null && x.kalan <= 14)
    .sort((a, b) => (a.kalan as number) - (b.kalan as number));

  /* Sıradaki iş: tek bir cümle, tek bir düğme. */
  const siradaki = (() => {
    if (ilanlar.length === 0)
      return {
        metin: 'Henüz aktif ilanınız yok. İlk ilanı açmak iki dakika sürüyor.',
        etiket: 'İlk ilanını oluştur',
        yol: '/sirket/ilan/yeni',
        birincil: true,
      };
    if (taslak.length > 0)
      return {
        metin: `${taslak.length} ilan taslakta bekliyor. Yayınlamadan öğrenciye görünmüyor.`,
        etiket: 'Taslakları aç',
        yol: '/sirket/ilanlar',
        birincil: true,
      };
    if (!baglam.dogrulandi)
      return {
        /*
          Başvuru yolu artık seçenek değil — her ilan StajımVar üzerinden
          başvuru alıyor. Doğrulamanın açtığı tek şey ADAY KİMLİĞİ:
          doğrulanana kadar şirket başvuru sayısını görüyor, kimin
          başvurduğunu görmüyor.
        */
        metin:
          'Şirketiniz henüz doğrulanmadı. Başvurular geliyor ama adayların kim olduğunu doğrulamadan sonra görebilirsiniz.',
        etiket: 'Doğrulamaya gönder',
        yol: '/sirket/profil',
        birincil: true,
      };
    if (kartAcik && yeni.length > 0)
      return {
        metin: `${yeni.length} başvuru henüz incelenmedi.`,
        etiket: 'Başvuranları aç',
        yol: '/sirket/basvuranlar',
        birincil: true,
      };
    return {
      metin: 'Her şey yolunda. Yeni bir pozisyon açmak istersen ilan formu hazır.',
      etiket: 'Yeni ilan',
      yol: '/sirket/ilan/yeni',
      birincil: false,
    };
  })();

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="truncate text-2xl font-extrabold tracking-tight"
          style={{ color: SIRKET_METIN }}
        >
          {baglam.ad || 'Genel bakış'}
        </h1>
        <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          {baglam.dogrulandi ? 'Doğrulanmış kurum' : 'İlan açık · aday kartları kapalı'}
        </p>
      </div>

      {/* -------------------------------------------------- sıradaki iş */}
      <div className={KUTU} style={{ ...kutuStil, borderColor: SIRKET_VURGU_KOYU }}>
        <p className="text-sm font-semibold leading-relaxed" style={{ color: SIRKET_METIN }}>
          {siradaki.metin}
        </p>
        <button
          type="button"
          onClick={() => onNavigate(siradaki.yol)}
          className={`mt-3 ${siradaki.birincil ? BIRINCIL_DUGME : IKINCIL_DUGME}`}
          style={siradaki.birincil ? birincilStil : ikincilStil}
        >
          {siradaki.yol === '/sirket/ilan/yeni' && <Plus className="h-4 w-4" />}
          {siradaki.etiket}
          {siradaki.yol !== '/sirket/ilan/yeni' && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>

      {/* ------------------------------------------------------- sayılar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Sayi
          etiket="Yayındaki ilan"
          deger={acik.length}
          onClick={() => onNavigate('/sirket/ilanlar')}
        />
        <Sayi
          etiket="Taslak"
          deger={taslak.length}
          alt={taslak.length > 0 ? 'Öğrenciye görünmüyor' : undefined}
          onClick={() => onNavigate('/sirket/ilanlar')}
        />
        <Sayi
          etiket="Başvuru"
          deger={kartAcik ? basvurular.length : '—'}
          alt={kartAcik && yeni.length > 0 ? `${yeni.length} yeni` : undefined}
          kilitli={!kartAcik}
          onClick={() => onNavigate('/sirket/basvuranlar')}
        />
        <Sayi
          etiket="Doğrulama"
          deger={<span className="text-base">{baglam.dogrulandi ? 'Tamam' : 'Bekliyor'}</span>}
          onClick={() => onNavigate('/sirket/profil')}
        />
      </div>

      {/* -------------------------------------------- yaklaşan kapanışlar */}
      {yaklasan.length > 0 && (
        <section className={KUTU} style={kutuStil}>
          <h2 className="flex items-center gap-2 font-bold" style={{ color: SIRKET_METIN }}>
            <AlertCircle className="h-4 w-4" style={{ color: SIRKET_VURGU_KOYU }} />
            Yaklaşan ilan kapanışları
          </h2>
          <ul className="mt-3 space-y-2">
            {yaklasan.slice(0, 5).map(({ ilan, kalan }) => (
              <li
                key={String(ilan.id)}
                className="flex items-center gap-3 border-t pt-2 first:border-t-0 first:pt-0"
                style={{ borderColor: SIRKET_KENAR }}
              >
                <span
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold"
                  style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
                >
                  {kalan === 0 ? 'Bugün' : `${kalan} gün`}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm" style={{ color: SIRKET_METIN }}>
                  {String(ilan.title ?? '')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------ doğrulama bilgilendirme */}
      {!baglam.dogrulandi && (
        <section className={KUTU} style={kutuStil}>
          <h2 className="flex items-center gap-2 font-bold" style={{ color: SIRKET_METIN }}>
            <ShieldCheck className="h-4 w-4" style={{ color: SIRKET_VURGU_KOYU }} />
            Şu an neler yapabilirsiniz?
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
            <li>✓ İlan açabilir, düzenleyebilir ve kapatabilirsiniz.</li>
            <li>✓ Şirket profilinizi doldurabilirsiniz.</li>
            <li>✓ Başvurular StajımVar üzerinden gelir; sayısını görürsünüz.</li>
            <li>✕ Adayların kim olduğu doğrulama sonrası açılıyor.</li>
          </ul>
        </section>
      )}
    </div>
  );
};
