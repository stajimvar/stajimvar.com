import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { DiscoverEvent } from '../lib/kesfet';

/**
 * DÜZ HARİTA (maplibre-gl + OpenFreeMap)
 *
 * Motor da stil de açık: anahtar istemeyen, kilitlenmiş bir sağlayıcıya
 * bağlı olmayan bir kurulum. Çizilemediğinde bu bileşen zaten kurulmuyor
 * (çağıran taraf erişilebilir listeye düşüyor).
 *
 * PİN KURALI
 * ----------
 * Buraya YALNIZCA `geocode_precision = 'address'` olan kayıtlar geliyor.
 * Süzme işi `kesfet-geo.mjs` içinde; burada ikinci bir kural yok ki iki
 * yerde birbirinden ayrışmasın.
 */
interface Props {
  styleUrl: string;
  center: { latitude: number; longitude: number } | null;
  zoom: number;
  pins: DiscoverEvent[];
  onSelectPin: (slug: string) => void;
  reducedMotion: boolean;
}

const KesfetGeoMap: React.FC<Props> = ({ styleUrl, center, zoom, pins, onSelectPin, reducedMotion }) => {
  const kap = useRef<HTMLDivElement | null>(null);
  const harita = useRef<MapLibreMap | null>(null);
  const isaretler = useRef<Marker[]>([]);
  const [hata, setHata] = useState('');

  useEffect(() => {
    if (!kap.current || harita.current) return;
    try {
      harita.current = new MapLibreMap({
        container: kap.current,
        style: styleUrl,
        center: center ? [center.longitude, center.latitude] : [0, 20],
        zoom: center ? zoom : 1.4,
        /*
          Yerleşik atıf kutusu kapalı, çünkü atfı aşağıda kendimiz kalıcı
          olarak çiziyoruz. Küçük bir "i" simgesinin arkasına saklanan
          atıf, lisansın istediği görünürlüğü karşılamıyor.
        */
        attributionControl: false,
      });
      harita.current.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      harita.current.on('error', () => setHata('Harita katmanı yüklenemedi.'));
    } catch {
      setHata('Harita başlatılamadı.');
    }
    return () => {
      harita.current?.remove();
      harita.current = null;
    };
    // Stil değişimi haritayı yeniden kurmayı gerektiriyor; diğerleri aşağıda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl]);

  useEffect(() => {
    if (!harita.current || !center) return;
    const hedef: [number, number] = [center.longitude, center.latitude];
    if (reducedMotion) harita.current.jumpTo({ center: hedef, zoom });
    else harita.current.easeTo({ center: hedef, zoom, duration: 700 });
  }, [center?.latitude, center?.longitude, zoom, reducedMotion]);

  useEffect(() => {
    if (!harita.current) return;
    for (const isaret of isaretler.current) isaret.remove();
    isaretler.current = pins.map((event) => {
      const dugme = document.createElement('button');
      dugme.type = 'button';
      dugme.className =
        'block h-6 w-6 cursor-pointer rounded-full border-2 border-white bg-blue-600 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900';
      dugme.setAttribute('aria-label', `${event.title} — haritada göster`);
      dugme.addEventListener('click', () => onSelectPin(event.slug));
      return new Marker({ element: dugme })
        .setLngLat([Number(event.longitude), Number(event.latitude)])
        .addTo(harita.current as MapLibreMap);
    });
    return () => {
      for (const isaret of isaretler.current) isaret.remove();
      isaretler.current = [];
    };
  }, [pins, onSelectPin]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
        <div ref={kap} className="h-full w-full" aria-hidden />
        {hata && (
          <p role="alert" className="absolute inset-x-0 bottom-0 bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-800">
            {hata}
          </p>
        )}
      </div>

      {/*
        ATIF — KİRA BEDELİ
        ------------------
        Veri OpenStreetMap'ten, karo şeması OpenMapTiles'tan, sunum
        OpenFreeMap'ten geliyor; üçü de bedava ama üçü de görünür atıf
        istiyor (sağlayıcının TileJSON'ında yazan üç ad bunlar). Bu satır
        bu yüzden haritanın dışında, her boyutta okunur halde duruyor:
        haritanın üstüne binmiyor, sığmazsa alt satıra kayıyor.
      */}
      <p className="flex flex-wrap items-center gap-x-1.5 border-t border-gray-100 bg-white px-2 py-1 text-[11px] leading-snug text-gray-600">
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-blue-700"
        >
          © OpenStreetMap katkıcıları
        </a>
        <span aria-hidden className="text-gray-300">·</span>
        <a
          href="https://www.openmaptiles.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-blue-700"
        >
          © OpenMapTiles
        </a>
        <span aria-hidden className="text-gray-300">·</span>
        <a
          href="https://openfreemap.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-blue-700"
        >
          OpenFreeMap
        </a>
      </p>
    </div>
  );
};

export default KesfetGeoMap;
