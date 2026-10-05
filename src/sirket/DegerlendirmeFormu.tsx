import React from 'react';
import { SIRKET_METIN, SIRKET_METIN_IKINCIL, SIRKET_ODAK } from './renk';
import {
  degerlendirmeGecmisi,
  degerlendirmeYaz,
  type DegerlendirmeKaydi,
  type DegerlendirmeOlcutu,
} from '../lib/sirket-veri';

/**
 * STANDART DEĞERLENDİRME FORMU
 *
 * Şirketin kendi tanımladığı ölçütler, her adaya aynı sorular.
 *
 * PUAN İNSANDAN GELİYOR
 * ---------------------
 * Otomatik, türetilmiş ya da yapay zekâ üretimi puan YOK. Boş bırakılan
 * ölçüt gönderilmiyor — 0 ya da ortalama yazmak, verilmemiş bir kararı
 * verilmiş göstermek olurdu.
 *
 * ORTALAMA HESAPLANMIYOR
 * ----------------------
 * Ölçütler aynı ağırlıkta değil ve şirket onlara ağırlık vermedi; tek
 * bir sayı üretmek, olmayan bir ölçüm iddia etmek olurdu. Ekran her
 * ölçütün kendi puanını gösteriyor.
 *
 * GEÇMİŞ ÜZERİNE YAZILMIYOR
 * -------------------------
 * Her kayıt ayrı satır ve değerlendiren adıyla duruyor. Aynı kişi
 * yeniden değerlendirirse eskisi kalıyor — fikir değiştirmek de bilgi.
 */

const PUANLAR = [1, 2, 3, 4, 5];

export const DegerlendirmeFormu: React.FC<{
  basvuruId: string;
  olcutler: DegerlendirmeOlcutu[];
  /** Yazabilen üye değilse form çizilmiyor, yalnız geçmiş okunuyor. */
  yazabilir: boolean;
  onKaydedildi?: () => void;
}> = ({ basvuruId, olcutler, yazabilir, onKaydedildi }) => {
  const [gecmis, setGecmis] = React.useState<DegerlendirmeKaydi[] | null>(null);
  const [puanlar, setPuanlar] = React.useState<Record<string, number>>({});
  const [not, setNot] = React.useState('');
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [hata, setHata] = React.useState<string | null>(null);

  const yukle = React.useCallback(() => {
    let iptal = false;
    degerlendirmeGecmisi(basvuruId).then((g) => {
      if (!iptal) setGecmis(g);
    });
    return () => {
      iptal = true;
    };
  }, [basvuruId]);

  React.useEffect(() => yukle(), [yukle]);

  const kaydet = async () => {
    setHata(null);
    /*
      HİÇ PUAN VE NOT YOKSA GÖNDERİLMİYOR: boş bir değerlendirme kaydı,
      "bakıldı" izlenimi verip hiçbir şey söylemezdi.
    */
    if (Object.keys(puanlar).length === 0 && !not.trim()) {
      setHata('En az bir ölçüt puanlayın ya da not yazın.');
      return;
    }
    setGonderiliyor(true);
    try {
      await degerlendirmeYaz(basvuruId, puanlar, not.trim() || null);
      setPuanlar({});
      setNot('');
      yukle();
      onKaydedildi?.();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Değerlendirme kaydedilemedi.');
    } finally {
      setGonderiliyor(false);
    }
  };

  const olcutAdi = React.useMemo(
    () => new Map(olcutler.map((o) => [o.id, o.ad])),
    [olcutler],
  );

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
      {yazabilir && (
        <>
          {olcutler.length === 0 ? (
            /*
              ÖLÇÜT UYDURULMUYOR. Hazır bir liste dayatmak, şirketin
              bakmadığı bir şeye bakıyormuş gibi göstermek olurdu.
            */
            <p className="text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
              Henüz değerlendirme ölçütü tanımlanmamış. Şirket sahibi Şirketim
              ekranından ölçüt ekleyebilir; o zamana kadar yalnızca not yazılabilir.
            </p>
          ) : (
            <ul className="space-y-2">
              {olcutler.map((o) => (
                <li key={o.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm" style={{ color: SIRKET_METIN }}>
                    {o.ad}
                  </span>
                  <div className="flex shrink-0 gap-1" role="group" aria-label={`${o.ad} puanı`}>
                    {PUANLAR.map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={puanlar[o.id] === p}
                        onClick={() =>
                          setPuanlar((ö) => {
                            /* Aynı puana ikinci kez basmak SEÇİMİ KALDIRIYOR:
                               yanlışlıkla verilen puanı geri almanın yolu olmalı. */
                            const y = { ...ö };
                            if (y[o.id] === p) delete y[o.id];
                            else y[o.id] = p;
                            return y;
                          })
                        }
                        className={`h-9 w-9 cursor-pointer rounded-lg border text-sm font-bold ${SIRKET_ODAK} ${
                          puanlar[o.id] === p
                            ? 'border-[#2563EB] bg-[#2563EB] text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <textarea
            value={not}
            onChange={(e) => setNot(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Gerekçe (isteğe bağlı)"
            className={`w-full rounded-lg border border-gray-300 p-2 text-sm ${SIRKET_ODAK}`}
          />

          {hata && (
            <p role="alert" className="text-xs font-semibold text-red-700">
              {hata}
            </p>
          )}

          <button
            type="button"
            onClick={kaydet}
            disabled={gonderiliyor}
            className={`min-h-11 w-full cursor-pointer rounded-xl bg-[#2563EB] px-4 text-sm font-bold text-white hover:bg-[#1D4ED8] disabled:opacity-60 ${SIRKET_ODAK}`}
          >
            {gonderiliyor ? 'Kaydediliyor…' : 'Değerlendirmeyi kaydet'}
          </button>
        </>
      )}

      {/* ----------------------------------------------------- geçmiş */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: SIRKET_METIN_IKINCIL }}>
          Değerlendirme geçmişi
        </p>
        {gecmis === null ? (
          <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }} aria-busy="true">
            Yükleniyor…
          </p>
        ) : gecmis.length === 0 ? (
          <p className="text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            Bu adayı henüz kimse değerlendirmedi.
          </p>
        ) : (
          <ul className="space-y-2">
            {gecmis.map((g) => (
              <li key={g.id} className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
                  {/* DEĞERLENDİREN VE AN her kayıtta görünüyor. */}
                  <span className="font-bold" style={{ color: SIRKET_METIN }}>{g.ad}</span>
                  {' · '}
                  {new Date(g.an).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {Object.keys(g.puanlar).length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(g.puanlar).map(([id, p]) => (
                      <li
                        key={id}
                        className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px]"
                        style={{ color: SIRKET_METIN }}
                      >
                        {/*
                          Kaldırılmış ölçütün adı listede yok; kimliği
                          yazmak anlamsız olurdu, "kaldırılmış ölçüt"
                          dürüst.
                        */}
                        {olcutAdi.get(id) ?? 'kaldırılmış ölçüt'}: <strong>{p}</strong>
                      </li>
                    ))}
                  </ul>
                )}
                {g.not && (
                  <p className="mt-1 whitespace-pre-line text-sm" style={{ color: SIRKET_METIN }}>
                    {g.not}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
