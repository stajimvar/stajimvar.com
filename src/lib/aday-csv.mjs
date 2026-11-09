/**
 * BAŞVURANLARI CSV OLARAK İNDİR (9 Kasım 2026, rakip analizi #10)
 *
 * Ekranda görünen liste ne ise dosya o: süzgeçler, sıralama ve
 * önyargısız kip (ad boş) aynen geçiyor. İletişim bilgisi YOK — o
 * aday başına rızaya bağlı ve bir dosyaya toplanıp dolaşmamalı.
 *
 * Türkçe Excel için: ayraç ';' (ondalık ayraç virgül), başta BOM.
 * Hücre =, +, -, @ ile başlıyorsa başına ' konuyor (formül enjeksiyonu).
 */
import { DURUM_ADI } from './basvuru-durumu.mjs';

const BASLIKLAR = ['Ad', 'Okul', 'Bölüm', 'Sınıf', 'Şehir', 'İlan', 'Durum', 'Başvuru tarihi', 'Yetenekler', 'Ön eleme cevapları'];

export function hucre(deger) {
  let s = String(deger ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const tarih = (d) => {
  const t = Date.parse(d ?? '');
  return Number.isNaN(t) ? '' : new Date(t).toISOString().slice(0, 10);
};

export function adaylarCsv(kartlar) {
  const satirlar = kartlar.map((k) => [
    k?.gizli ? 'Gizli (önyargısız inceleme)' : k?.ad ?? '',
    k?.universite ?? '',
    k?.bolum ?? '',
    k?.sinif ?? '',
    k?.sehir ?? '',
    k?.ilanBasligi ?? '',
    DURUM_ADI[k?.durum] ?? '',
    tarih(k?.tarih),
    (k?.yetenekler ?? []).join(', '),
    (k?.onElemeCevaplari ?? []).map((c) => `${c?.soru}: ${c?.cevap}`).join(' | '),
  ]);
  return '﻿' + [BASLIKLAR, ...satirlar].map((r) => r.map(hucre).join(';')).join('\r\n');
}

export function csvDosyaAdi(simdi = new Date()) {
  return `basvuranlar-${simdi.toISOString().slice(0, 10)}.csv`;
}
