import React from 'react';
import { supabase } from '../lib/supabase';
import { KUTU, SIRKET_METIN, SIRKET_METIN_IKINCIL, kutuStil } from './renk';

/**
 * E-POSTA TERCİHLERİ (/sirket/profil/eposta) — 9 Kasım 2026, rakip analizi #8.
 *
 * Yeni başvuru e-postasını açar/kapatır. Kapalıyken bildirim zilde duruyor;
 * yalnız e-postası gitmiyor (sunucu: bildirim_eposta_kuyruktan_al).
 * Satır yoksa tercih AÇIK sayılıyor.
 *
 * 10 Kasım 2026: aynı anahtar öğrencinin "takip ettiğin şirketin yeni
 * ilanı" e-postası için de kullanılıyor (alan: takip_ilan_eposta,
 * /ayarlar/bildirimler). Renk ve kutu çağıran sayfadan geliyor.
 */
type TercihAlani = 'yeni_basvuru_eposta' | 'takip_ilan_eposta';

const METINLER: Record<TercihAlani, { etiket: string; aciklama: string }> = {
  yeni_basvuru_eposta: {
    etiket: 'Yeni başvuru gelince e-posta gönder',
    aciklama: 'Kapalıyken başvurular yine zil bildirimi olarak gelir; yalnız e-posta gitmez.',
  },
  takip_ilan_eposta: {
    etiket: 'Takip ettiğim şirket yeni ilan yayımlayınca e-posta gönder',
    aciklama: 'Kapalıyken yeni ilanlar yine zil bildirimi olarak gelir; yalnız e-posta gitmez.',
  },
};

export const EpostaTercihAnahtari: React.FC<{
  userId: string;
  alan: TercihAlani;
  metinRengi?: string;
  ikincilRenk?: string;
}> = ({ userId, alan, metinRengi = '#111827', ikincilRenk = '#4B5563' }) => {
  const [acik, setAcik] = React.useState<boolean | null>(null);
  const [durum, setDurum] = React.useState('');

  React.useEffect(() => {
    let iptal = false;
    void (supabase.from('bildirim_tercihleri' as never) as any)
      .select(alan)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }: { data: Partial<Record<TercihAlani, boolean>> | null }) => {
        if (!iptal) setAcik(data?.[alan] ?? true);
      });
    return () => {
      iptal = true;
    };
  }, [userId, alan]);

  const degistir = async (yeni: boolean) => {
    setAcik(yeni);
    setDurum('');
    const { error } = await (supabase.from('bildirim_tercihleri' as never) as any).upsert(
      { user_id: userId, [alan]: yeni, updated_at: new Date().toISOString() },
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
    <div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={acik ?? true}
          disabled={acik === null}
          onChange={(e) => void degistir(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#2563EB]"
        />
        <span>
          <span className="block text-sm font-bold" style={{ color: metinRengi }}>
            {METINLER[alan].etiket}
          </span>
          <span className="block text-xs" style={{ color: ikincilRenk }}>
            {METINLER[alan].aciklama}
          </span>
        </span>
      </label>
      {durum && (
        <p role="status" className="mt-2 text-xs" style={{ color: ikincilRenk }}>
          {durum}
        </p>
      )}
    </div>
  );
};

/** Şirket paneli: /sirket/profil/eposta. */
export const EpostaTercihleri: React.FC<{ userId: string }> = ({ userId }) => (
  <section className={KUTU} style={kutuStil} aria-labelledby="eposta-tercih-baslik">
    <h2 id="eposta-tercih-baslik" className="text-base font-extrabold" style={{ color: SIRKET_METIN }}>
      E-posta bildirimleri
    </h2>
    <div className="mt-3">
      <EpostaTercihAnahtari
        userId={userId}
        alan="yeni_basvuru_eposta"
        metinRengi={SIRKET_METIN}
        ikincilRenk={SIRKET_METIN_IKINCIL}
      />
    </div>
  </section>
);
