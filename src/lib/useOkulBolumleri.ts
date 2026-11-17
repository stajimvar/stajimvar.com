import { useCallback, useEffect, useState } from 'react';
import { TR_DEPARTMENTS } from '../data/turkeyData';
import { okulaGoreBolumler } from './okul-bolumleri.mjs';

/*
  OKULA GÖRE BÖLÜM ÖNERİLERİ (17 Kasım 2026)

  Okul → program dosyası (~80 KB, YÖK Atlas kılavuzu) ilk açılış paketine
  girmesin diye yalnız bölüm alanı çizilince ve bir kez yükleniyor.
  Yüklenemezse genel liste kullanılıyor; alan hiçbir zaman boş kalmıyor.
*/
type OkulVerisi = { programlar: string[]; okullar: Record<string, number[]> };

let yukleme: Promise<OkulVerisi | null> | null = null;
const yukle = () =>
  (yukleme ??= import('../data/universite-bolumleri.json')
    .then((m) => m.default as OkulVerisi)
    .catch(() => null));

/** (okul) → önce o okulun programları, sonra genel bölüm listesi. */
export function useOkulBolumleri(): (okul: string) => string[] {
  const [veri, setVeri] = useState<OkulVerisi | null>(null);
  useEffect(() => {
    let iptal = false;
    void yukle().then((v) => {
      if (!iptal) setVeri(v);
    });
    return () => {
      iptal = true;
    };
  }, []);
  return useCallback((okul: string) => okulaGoreBolumler(veri, okul, TR_DEPARTMENTS), [veri]);
}
