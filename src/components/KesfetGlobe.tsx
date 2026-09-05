import React, { useEffect, useMemo, useRef, useState } from 'react';
import { geoCentroid, geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import iso from 'iso-3166-1';
import duenyaAtlasi from 'world-atlas/countries-110m.json?url';

/**
 * DÜNYA KÜRESİ — SVG, WebGL DEĞİL
 *
 * NEDEN d3-geo + topojson
 * -----------------------
 * Her ülke gerçek bir `<path>`. Bu yüzden ülke tıklanabilir, klavyeyle
 * odaklanabilir ve ekran okuyucuya "Türkiye, 113 etkinlik" diye
 * okunabiliyor. WebGL tabanlı bir küre aynı ekranı çizerdi ama tuvalin
 * içinde erişilebilir hiçbir şey olmazdı; üstelik ülke sınırı verisi de
 * ayrıca gerekirdi.
 *
 * Sınır verisi (world-atlas) JS paketine gömülmüyor, `?url` ile ayrı bir
 * dosya olarak isteniyor: küre açılmadan indirilmiyor.
 */

const OLCU = 200;
const TABAN_OLCEK = 92;
const YAKIN_OLCEK = 118;

type Ozellik = { id?: string | number; properties?: { name?: string } };

interface Props {
  countries: { code: string; name: string; count: number }[];
  selectedCountry: string | null;
  onSelect: (code: string) => void;
}

const azHareket = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const KesfetGlobe: React.FC<Props> = ({ countries, selectedCountry, onSelect }) => {
  const [sekiller, setSekiller] = useState<Ozellik[] | null>(null);
  const [durum, setDurum] = useState<'loading' | 'ready' | 'error'>('loading');
  const [gorunum, setGorunum] = useState({ lambda: -32, phi: -39, olcek: TABAN_OLCEK });
  const kap = useRef<HTMLDivElement | null>(null);
  /* Animasyon karesi state'i beklemesin diye anlık değer ref'te de duruyor. */
  const anlik = useRef(gorunum);
  const hedef = useRef(gorunum);
  const kare = useRef(0);
  const ilkOdak = useRef(false);

  useEffect(() => {
    let iptal = false;
    fetch(duenyaAtlasi)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((topology: any) => {
        if (iptal) return;
        const koleksiyon: any = feature(topology, topology.objects.countries);
        setSekiller(koleksiyon.features as Ozellik[]);
        setDurum('ready');
      })
      .catch(() => { if (!iptal) setDurum('error'); });
    return () => { iptal = true; };
  }, []);

  const sayilar = useMemo(() => {
    const harita = new Map<string, { name: string; count: number }>();
    for (const ulke of countries) harita.set(ulke.code, { name: ulke.name, count: ulke.count });
    return harita;
  }, [countries]);

  /*
    ÜLKE KODU VE AĞIRLIK MERKEZİ BİR KEZ ÇÖZÜLÜYOR

    world-atlas ülkeyi ISO 3166-1 SAYISAL koduyla ('792') veriyor,
    etkinlikler ise alfa-2 ('TR') taşıyor. Bu çeviri ve ağırlık merkezi
    hesabı sürükleme sırasında her karede 177 ülke için tekrarlansaydı
    döndürme takılırdı; sınır verisi değişmediği için bir kez çözülüp
    saklanıyor.
  */
  const ulkeler = useMemo(
    () =>
      (sekiller ?? []).map((ozellik) => ({
        ozellik,
        kod: iso.whereNumeric(String(ozellik.id ?? ''))?.alpha2 ?? null,
        merkez: geoCentroid(ozellik as any),
      })),
    [sekiller],
  );

  /* Kamera hedefe yumuşak gidiyor; azaltılmış hareket açıkken anında. */
  const kameraYaz = (sonraki: { lambda: number; phi: number; olcek: number }) => {
    hedef.current = sonraki;
    cancelAnimationFrame(kare.current);
    if (azHareket()) { anlik.current = sonraki; setGorunum(sonraki); return; }
    const adim = () => {
      const t = hedef.current;
      const c = anlik.current;
      const fark =
        Math.abs(t.lambda - c.lambda) + Math.abs(t.phi - c.phi) + Math.abs(t.olcek - c.olcek);
      const sonraki2 = fark < 0.2 ? t : {
        lambda: c.lambda + (t.lambda - c.lambda) * 0.18,
        phi: c.phi + (t.phi - c.phi) * 0.18,
        olcek: c.olcek + (t.olcek - c.olcek) * 0.18,
      };
      anlik.current = sonraki2;
      setGorunum(sonraki2);
      if (fark >= 0.2) kare.current = requestAnimationFrame(adim);
    };
    kare.current = requestAnimationFrame(adim);
  };

  useEffect(() => () => cancelAnimationFrame(kare.current), []);

  const ulkeyeDon = (merkezNokta: [number, number]) => {
    const [lon, lat] = merkezNokta;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    kameraYaz({ lambda: -lon, phi: -lat, olcek: YAKIN_OLCEK });
  };

  /* Seçim dışarıdan da gelebilir (adres çubuğu, breadcrumb). */
  useEffect(() => {
    if (!ulkeler.length) return;
    if (!selectedCountry) {
      /*
        İlk açılışta küre, etkinliği en çok olan ülkeye çevriliyor:
        kullanıcı boş bir okyanusa değil, tıklayabileceği bir yere bakıyor.
        Hangi ülke olduğu veriden geliyor, koda yazılmıyor.
      */
      const enYogun = !ilkOdak.current && countries[0]
        ? ulkeler.find((ulke) => ulke.kod === countries[0].code)
        : null;
      ilkOdak.current = true;
      if (enYogun) {
        const [lon, lat] = enYogun.merkez as [number, number];
        kameraYaz({ lambda: -lon, phi: -lat, olcek: TABAN_OLCEK });
      } else {
        kameraYaz({ ...hedef.current, olcek: TABAN_OLCEK });
      }
      return;
    }
    const kayit = ulkeler.find((ulke) => ulke.kod === selectedCountry);
    if (kayit) ulkeyeDon(kayit.merkez as [number, number]);
    // Kamera yalnızca seçim ya da veri değiştiğinde hareket ediyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, ulkeler]);

  const projeksiyon = useMemo(
    () =>
      geoOrthographic()
        .scale(gorunum.olcek)
        .translate([OLCU / 2, OLCU / 2])
        .rotate([gorunum.lambda, gorunum.phi]),
    [gorunum],
  );
  const cizer = useMemo(() => geoPath(projeksiyon), [projeksiyon]);
  const merkez: [number, number] = [-gorunum.lambda, -gorunum.phi];

  const surukleme = useRef<{ x: number; y: number; dokunma: boolean; mesafe: number } | null>(null);
  const surukledi = useRef(false);

  /*
    SÜRÜKLEME PENCEREDEN DİNLENİYOR, POINTER CAPTURE İLE DEĞİL

    Ölçüldü: `setPointerCapture` SVG'ye alındığında sonraki `click` olayı
    da yakalayan öğeye yönleniyor ve ülke `<path>`inin kendi tıklaması hiç
    çalışmıyordu — küre dönüyor ama hiçbir ülke seçilemiyordu. Hareket
    olayları bu yüzden pencereden dinleniyor; tıklama ülkeye ulaşıyor.

    Döndürme sonundaki tıklama yutuluyor: parmağını sürükleyip bırakan
    kişi ülke seçmek istememiştir.
  */
  const basla = (olay: React.PointerEvent<SVGSVGElement>) => {
    surukleme.current = {
      x: olay.clientX, y: olay.clientY, dokunma: olay.pointerType === 'touch', mesafe: 0,
    };
  };

  useEffect(() => {
    const hareket = (olay: PointerEvent) => {
      const onceki = surukleme.current;
      if (!onceki) return;
      cancelAnimationFrame(kare.current);
      const genislik = kap.current?.clientWidth || OLCU;
      const anlikGorunum = anlik.current;
      /* Kürenin çapı kadar sürüklemek yarım tur döndürüyor. */
      const derecePiksel = 180 / Math.max(1, genislik * (anlikGorunum.olcek / OLCU) * 2);
      const dx = (olay.clientX - onceki.x) * derecePiksel;
      /*
        Dokunmada dikey sürükleme sayfayı kaydırmaya bırakılıyor
        (touch-action: pan-y). Küre içinde kalan parmak sayfayı kilitlemiyor.
      */
      const dy = onceki.dokunma ? 0 : (olay.clientY - onceki.y) * derecePiksel;
      onceki.mesafe += Math.abs(olay.clientX - onceki.x) + Math.abs(olay.clientY - onceki.y);
      onceki.x = olay.clientX;
      onceki.y = olay.clientY;
      const sonraki = {
        lambda: anlikGorunum.lambda + dx,
        phi: Math.max(-90, Math.min(90, anlikGorunum.phi - dy)),
        olcek: anlikGorunum.olcek,
      };
      anlik.current = sonraki;
      hedef.current = sonraki;
      setGorunum(sonraki);
    };
    const bitir = () => {
      if (!surukleme.current) return;
      surukledi.current = surukleme.current.mesafe > 4;
      surukleme.current = null;
      window.setTimeout(() => { surukledi.current = false; }, 0);
    };
    window.addEventListener('pointermove', hareket);
    window.addEventListener('pointerup', bitir);
    window.addEventListener('pointercancel', bitir);
    return () => {
      window.removeEventListener('pointermove', hareket);
      window.removeEventListener('pointerup', bitir);
      window.removeEventListener('pointercancel', bitir);
    };
  }, []);

  const ulkeSec = (kod: string) => {
    if (surukledi.current) return;
    onSelect(kod);
  };

  if (durum === 'loading') {
    return (
      <div role="status" aria-label="Dünya küresi yükleniyor" className="aspect-square w-full animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
    );
  }

  if (durum === 'error' || !sekiller) {
    return (
      <div role="alert" className="rounded-2xl border border-gray-200 bg-white p-4 text-center text-sm text-gray-600">
        Dünya haritası yüklenemedi. Ülkeleri aşağıdaki listeden seçebilirsin.
      </div>
    );
  }

  return (
    <div ref={kap} className="w-full">
      <svg
        viewBox={`0 0 ${OLCU} ${OLCU}`}
        className="w-full touch-pan-y select-none"
        role="group"
        aria-label="Etkinliği olan ülkeleri gösteren dünya küresi. Sürükleyerek döndürebilirsin."
        onPointerDown={basla}
      >
        <circle cx={OLCU / 2} cy={OLCU / 2} r={gorunum.olcek} className="fill-blue-100" />
        <path d={cizer(geoGraticule10()) || undefined} className="fill-none stroke-blue-200" strokeWidth={0.3} />
        {ulkeler.map(({ ozellik, kod, merkez: odak }, sira) => {
          const kayit = kod ? sayilar.get(kod) : undefined;
          const yol = cizer(ozellik as any);
          if (!yol) return null;
          const ad = kayit?.name || ozellik.properties?.name || kod || '';
          const secili = Boolean(kod && kod === selectedCountry);
          if (!kayit) {
            /* Etkinliği olmayan ülke: sayı yok, odak sırasında yok, devre dışı. */
            return (
              <path
                key={ozellik.id ?? sira}
                d={yol}
                role="button"
                aria-disabled="true"
                aria-label={`${ad}, etkinlik yok`}
                className="fill-gray-300 stroke-white"
                strokeWidth={0.3}
              />
            );
          }
          return (
            <path
              key={ozellik.id ?? sira}
              d={yol}
              role="button"
              tabIndex={0}
              aria-label={`${ad}, ${kayit.count} etkinlik`}
              aria-pressed={secili}
              onClick={() => ulkeSec(kod as string)}
              /* Klavyeyle odaklanan ülke kürenin görünen yüzüne çevriliyor. */
              onFocus={() => ulkeyeDon(odak as [number, number])}
              onKeyDown={(olay) => {
                if (olay.key !== 'Enter' && olay.key !== ' ') return;
                olay.preventDefault();
                ulkeSec(kod as string);
              }}
              className={`cursor-pointer stroke-white outline-none focus-visible:stroke-blue-900 ${secili ? 'fill-blue-700' : 'fill-blue-600 hover:fill-blue-700'}`}
              strokeWidth={secili ? 0.8 : 0.4}
            />
          );
        })}
        {ulkeler.map(({ ozellik, kod, merkez: nokta }, sira) => {
          const kayit = kod ? sayilar.get(kod) : undefined;
          if (!kayit) return null;
          /* Kürenin arka yüzündeki sayı çizilmiyor: orada ülke görünmüyor. */
          if (geoDistance(nokta as [number, number], merkez) > Math.PI / 2.2) return null;
          const konum = projeksiyon(nokta as [number, number]);
          if (!konum) return null;
          return (
            <g key={`sayi-${ozellik.id ?? sira}`} aria-hidden pointerEvents="none">
              {/* Rozet ülkenin ÜSTÜNE kaydırıldı: merkeze konsaydı küçük
                  ülkeyi bütünüyle örter, seçilebilir olduğu görünmezdi. */}
              <line x1={konum[0]} y1={konum[1]} x2={konum[0]} y2={konum[1] - 5} className="stroke-blue-700" strokeWidth={0.6} />
              <circle cx={konum[0]} cy={konum[1] - 10} r={6.4} className="fill-white stroke-blue-700" strokeWidth={0.9} />
              <text
                x={konum[0]}
                y={konum[1] - 7.8}
                textAnchor="middle"
                className="fill-blue-800 font-extrabold"
                fontSize={6.2}
              >{kayit.count}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default KesfetGlobe;
