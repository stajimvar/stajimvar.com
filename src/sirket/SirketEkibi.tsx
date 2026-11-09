import React from 'react';
import { Mail, Trash2, UserPlus } from 'lucide-react';
import {
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { FORM_ALAN } from './form-parcalari';
import {
  degerlendirmeOlcutleri,
  olcutEkle,
  olcutKaldirIstek,
  sirketEkibi,
  type DegerlendirmeOlcutu,
  type EkipUyesi,
} from '../lib/sirket-veri';
import {
  DAVET_ROLLERI,
  bekleyenDavetler,
  davetGonder,
  davetIptal,
  rolEtiketi,
  uyeCikar,
  type BekleyenDavet,
  type DavetRolu,
} from '../lib/ekip-davetleri';

/**
 * EKİP (/sirket/profil/ekip) — 9 Kasım 2026, kullanıcı: "önerilerini yap".
 *
 * Herkes ekibi görüyor; davet gönderme, daveti iptal ve üye çıkarma yalnız
 * şirket sahibinde (sunucu da aynı kuralı uyguluyor, 20261231010000).
 * Davet yalnız doğrulanmış şirkette; doğrulanmamışsa neden yazıyor.
 */
export const SirketEkibi: React.FC<{
  sirketId: string;
  sahipMi: boolean;
  dogrulandi: boolean;
  kendiId: string | null;
}> = ({ sirketId, sahipMi, dogrulandi, kendiId }) => {
  const [uyeler, setUyeler] = React.useState<EkipUyesi[]>([]);
  const [davetler, setDavetler] = React.useState<BekleyenDavet[]>([]);
  const [eposta, setEposta] = React.useState('');
  const [rol, setRol] = React.useState<DavetRolu>('Recruiter');
  const [islem, setIslem] = React.useState(false);
  const [hata, setHata] = React.useState('');
  const [bilgi, setBilgi] = React.useState('');

  /* Değerlendirme ölçütleri (rakip analizi #7): sahip tanımlıyor, ekip puanlıyor. */
  const [olcutler, setOlcutler] = React.useState<DegerlendirmeOlcutu[]>([]);
  const [yeniOlcut, setYeniOlcut] = React.useState('');
  const olcutleriYukle = React.useCallback(() => {
    void degerlendirmeOlcutleri(sirketId).then(setOlcutler);
  }, [sirketId]);
  React.useEffect(olcutleriYukle, [olcutleriYukle]);
  const olcutEkleTikla = async (ad: string) => {
    if (!ad.trim()) return;
    setHata('');
    try {
      await olcutEkle(sirketId, ad, olcutler.length);
      setYeniOlcut('');
      olcutleriYukle();
    } catch (h) {
      setHata(h instanceof Error ? h.message : 'Ölçüt eklenemedi.');
    }
  };
  const ONERILEN_OLCUTLER = ['Genel izlenim', 'İletişim', 'Alana ilgi', 'Teknik yetkinlik'];

  const yukle = React.useCallback(() => {
    void sirketEkibi(sirketId).then(setUyeler);
    if (sahipMi) void bekleyenDavetler(sirketId).then(setDavetler).catch(() => setDavetler([]));
  }, [sirketId, sahipMi]);
  React.useEffect(yukle, [yukle]);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (islem) return;
    setHata('');
    setBilgi('');
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(eposta.trim())) {
      setHata('Geçerli bir e-posta yaz.');
      return;
    }
    setIslem(true);
    try {
      await davetGonder(sirketId, eposta, rol);
      setBilgi(`${eposta.trim().toLowerCase()} adresine davet gönderildi.`);
      setEposta('');
      yukle();
    } catch (h) {
      setHata(h instanceof Error ? h.message : 'Davet gönderilemedi.');
    } finally {
      setIslem(false);
    }
  };

  const iptal = async (d: BekleyenDavet) => {
    setHata('');
    try {
      await davetIptal(d.id);
      yukle();
    } catch (h) {
      setHata(h instanceof Error ? h.message : 'Davet iptal edilemedi.');
    }
  };

  const cikar = async (u: EkipUyesi) => {
    if (!window.confirm(`${u.ad} ekipten çıkarılsın mı?`)) return;
    setHata('');
    try {
      await uyeCikar(sirketId, u.uyeId);
      yukle();
    } catch (h) {
      setHata(h instanceof Error ? h.message : 'Üye çıkarılamadı.');
    }
  };

  return (
    <div className="space-y-4">
      <section className={KUTU} style={kutuStil} aria-labelledby="ekip-baslik">
        <h2 id="ekip-baslik" className="text-base font-extrabold" style={{ color: SIRKET_METIN }}>
          Ekip üyeleri
        </h2>
        <ul className="mt-3 divide-y" style={{ borderColor: SIRKET_KENAR }}>
          {uyeler.map((u) => (
            <li key={u.uyeId} className="flex min-h-12 items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold" style={{ color: SIRKET_METIN }}>
                  {u.ad}
                  {u.uyeId === kendiId && <span className="font-normal" style={{ color: SIRKET_METIN_IKINCIL }}> (sen)</span>}
                </p>
                <p className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>{rolEtiketi(u.rol)}</p>
              </div>
              {sahipMi && u.rol !== 'Owner' && u.uyeId !== kendiId && (
                <button
                  type="button"
                  onClick={() => void cikar(u)}
                  aria-label={`${u.ad} ekipten çıkar`}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-rose-50"
                >
                  <Trash2 aria-hidden className="h-4 w-4 text-rose-700" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {sahipMi && (
        <section className={KUTU} style={kutuStil} aria-labelledby="davet-baslik">
          <h2 id="davet-baslik" className="flex items-center gap-2 text-base font-extrabold" style={{ color: SIRKET_METIN }}>
            <UserPlus aria-hidden className="h-5 w-5" />
            Ekibe davet et
          </h2>
          {!dogrulandi ? (
            <p className="mt-2 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              Şirket doğrulandığında ekibine davet gönderebilirsin.
            </p>
          ) : (
            <form onSubmit={gonder} className="mt-3 space-y-3">
              <label className="block text-sm font-bold" style={{ color: SIRKET_METIN }}>
                E-posta
                <input
                  type="email"
                  value={eposta}
                  onChange={(e) => setEposta(e.target.value)}
                  placeholder="ad.soyad@sirketiniz.com"
                  autoComplete="off"
                  className={`mt-1 ${FORM_ALAN}`}
                />
              </label>
              <fieldset>
                <legend className="text-sm font-bold" style={{ color: SIRKET_METIN }}>Rol</legend>
                <div className="mt-1 space-y-2">
                  {DAVET_ROLLERI.map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-start gap-2 rounded-xl border p-3" style={{ borderColor: SIRKET_KENAR }}>
                      <input type="radio" name="rol" checked={rol === r.id} onChange={() => setRol(r.id)} className="mt-1" />
                      <span>
                        <span className="block text-sm font-bold" style={{ color: SIRKET_METIN }}>{r.etiket}</span>
                        <span className="block text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>{r.aciklama}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {hata && <p role="alert" className="text-sm text-rose-700">{hata}</p>}
              {bilgi && <p role="status" className="text-sm text-emerald-700">{bilgi}</p>}
              <button type="submit" disabled={islem} className={`${BIRINCIL_DUGME} w-full sm:w-auto`} style={birincilStil}>
                <Mail aria-hidden className="h-5 w-5" />
                {islem ? 'Gönderiliyor…' : 'Davet gönder'}
              </button>
              <p className="text-xs leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                Davet edilen kişiye e-posta gider. Bu adresle StajımVar'a giriş yapıp ya da kayıt olup daveti kabul eder.
              </p>
            </form>
          )}
        </section>
      )}

      {sahipMi && davetler.length > 0 && (
        <section className={KUTU} style={kutuStil} aria-labelledby="bekleyen-baslik">
          <h2 id="bekleyen-baslik" className="text-base font-extrabold" style={{ color: SIRKET_METIN }}>
            Bekleyen davetler
          </h2>
          <ul className="mt-2 divide-y" style={{ borderColor: SIRKET_KENAR }}>
            {davetler.map((d) => (
              <li key={d.id} className="flex min-h-12 items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold" style={{ color: SIRKET_METIN }}>{d.eposta}</p>
                  <p className="text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>{rolEtiketi(d.rol)}</p>
                </div>
                <button type="button" onClick={() => void iptal(d)} className={IKINCIL_DUGME} style={ikincilStil}>
                  İptal et
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {sahipMi && (
        <section className={KUTU} style={kutuStil} aria-labelledby="olcut-baslik">
          <h2 id="olcut-baslik" className="text-base font-extrabold" style={{ color: SIRKET_METIN }}>
            Değerlendirme ölçütleri
          </h2>
          <p className="mt-1 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
            Ekibin her adayı aynı ölçütlerle 1–5 puanlaması için. Puan ve notlar yalnız ekibe görünür, adaya gitmez.
          </p>
          {olcutler.length > 0 && (
            <ul className="mt-3 divide-y" style={{ borderColor: SIRKET_KENAR }}>
              {olcutler.map((o) => (
                <li key={o.id} className="flex min-h-11 items-center justify-between gap-3 py-1.5">
                  <span className="text-sm font-bold" style={{ color: SIRKET_METIN }}>{o.ad}</span>
                  <button
                    type="button"
                    onClick={() => void olcutKaldirIstek(o.id).then(olcutleriYukle).catch((h) => setHata(String(h?.message ?? h)))}
                    aria-label={`${o.ad} ölçütünü kaldır`}
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-rose-50"
                  >
                    <Trash2 aria-hidden className="h-4 w-4 text-rose-700" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input
              value={yeniOlcut}
              onChange={(e) => setYeniOlcut(e.target.value)}
              maxLength={60}
              placeholder="Ölçüt adı"
              aria-label="Yeni ölçüt adı"
              className={`${FORM_ALAN} min-w-0 flex-1`}
            />
            <button type="button" onClick={() => void olcutEkleTikla(yeniOlcut)} className={IKINCIL_DUGME} style={ikincilStil}>
              Ekle
            </button>
          </div>
          {olcutler.length === 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: SIRKET_METIN_IKINCIL }}>
              Öneri:
              {ONERILEN_OLCUTLER.map((ad) => (
                <button
                  key={ad}
                  type="button"
                  onClick={() => void olcutEkleTikla(ad)}
                  className="min-h-11 cursor-pointer font-bold underline-offset-2 hover:underline"
                  style={{ color: SIRKET_METIN }}
                >
                  + {ad}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
