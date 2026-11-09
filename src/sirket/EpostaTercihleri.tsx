import React from 'react';
import { KUTU, SIRKET_METIN, SIRKET_METIN_IKINCIL, kutuStil } from './renk';
import { supabase } from '../lib/supabase';

/**
 * E-POSTA TERCİHLERİ (/sirket/profil/eposta) — 9 Kasım 2026, rakip analizi #8.
 *
 * Yeni başvuru e-postasını açar/kapatır. Kapalıyken bildirim zilde duruyor;
 * yalnız e-postası gitmiyor (sunucu: bildirim_eposta_kuyruktan_al).
 * Satır yoksa tercih AÇIK sayılıyor.
 */
export const EpostaTercihleri: React.FC<{ userId: string }> = ({ userId }) => {
  const [acik, setAcik] = React.useState<boolean | null>(null);
  const [durum, setDurum] = React.useState('');

  React.useEffect(() => {
    let iptal = false;
    void (supabase.from('bildirim_tercihleri' as never) as any)
      .select('yeni_basvuru_eposta')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }: { data: { yeni_basvuru_eposta?: boolean } | null }) => {
        if (!iptal) setAcik(data?.yeni_basvuru_eposta ?? true);
      });
    return () => {
      iptal = true;
    };
  }, [userId]);

  const degistir = async (yeni: boolean) => {
    setAcik(yeni);
    setDurum('');
    const { error } = await (supabase.from('bildirim_tercihleri' as never) as any).upsert(
      { user_id: userId, yeni_basvuru_eposta: yeni, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
    if (error) {
      setAcik(!yeni);
      setDurum('Tercih kaydedilemedi. Yeniden dene.');
    } else {
      setDurum('Kaydedildi.');
    }
  };

  return (
    <section className={KUTU} style={kutuStil} aria-labelledby="eposta-tercih-baslik">
      <h2 id="eposta-tercih-baslik" className="text-base font-extrabold" style={{ color: SIRKET_METIN }}>
        E-posta bildirimleri
      </h2>
      <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={acik ?? true}
          disabled={acik === null}
          onChange={(e) => void degistir(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#2563EB]"
        />
        <span>
          <span className="block text-sm font-bold" style={{ color: SIRKET_METIN }}>
            Yeni başvuru gelince e-posta gönder
          </span>
          <span className="block text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
            Kapalıyken başvurular yine zil bildirimi olarak gelir; yalnız e-posta gitmez.
          </span>
        </span>
      </label>
      {durum && (
        <p role="status" className="mt-2 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
          {durum}
        </p>
      )}
    </section>
  );
};
