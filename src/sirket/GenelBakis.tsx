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

      {/*
        AKTİF İLANLAR — DÖRT KARO YERİNE TEK LİSTE

        Önce dört sayı karosu vardı (yayındaki ilan, taslak, başvuru,
        doğrulama). Sayılar doğruydu ama ekran "gösterge paneli" gibi
        duruyor ve hiçbiri tıklandığında nereye gidileceğini
        söylemiyordu. İK'nın burada aradığı tek şey belli: hangi ilanım
        açık ve kaç başvuru gelmiş.

        Kapanış tarihi ayrı bir bölümdü; aynı ilanı iki kez listeliyordu.
        Artık satırın kendi içinde.
      */}
      {ilanlar.length > 0 && (
        <section className={KUTU} style={kutuStil}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold" style={{ color: SIRKET_METIN }}>
              İlanlarınız
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('/sirket/ilanlar')}
              className="text-xs font-bold"
              style={{ color: SIRKET_VURGU_KOYU }}
            >
              Tümünü aç
            </button>
          </div>

          <ul className="mt-3 space-y-1">
            {ilanlar.slice(0, 5).map((ilan) => {
              const id = String(ilan.id);
              const yayinda = ilan.status === 'published';
              const kalan = yaklasan.find((y) => String(y.ilan.id) === id)?.kalan;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('/sirket/ilanlar')}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-sm font-bold"
                        style={{ color: SIRKET_METIN }}
                      >
                        {String(ilan.title ?? '')}
                      </span>
                      <span className="block text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                        {yayinda ? 'Yayında' : ilan.status === 'draft' ? 'Taslak' : 'Kapalı'}
                        {/* Başvuru sayısı yalnızca doğrulanmış şirkette:
                            göremeyeceği bir sayıyı göstermek doğrulamayı
                            satmak olurdu. */}
                        {kartAcik && ` · ${Number(ilan.applicants_count ?? 0)} başvuru`}
                        {kalan !== undefined &&
                          ` · ${kalan === 0 ? 'bugün kapanıyor' : `${kalan} gün kaldı`}`}
                      </span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0"
                      style={{ color: SIRKET_METIN_IKINCIL }}
                    />
                  </button>
                </li>
              );
            })}
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
