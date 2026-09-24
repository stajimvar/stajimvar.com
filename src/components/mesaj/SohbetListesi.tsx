import React from 'react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { gecenSure } from '../../lib/gecen-sure.mjs';
import { kutuYolu, sonMesajOnizlemesi } from '../../lib/mesaj-ekrani.mjs';
import { sohbetlerimiGetir, type SohbetKutusu, type SohbetOzeti } from '../../lib/queries/mesajlasma';
import { ProfilFotografi } from '../sosyal/ProfilFotografi';
import { ResmiTik } from '../sosyal/ResmiTik';
import { gelenKutusunaAbone } from './mesajDinleme';

/**
 * SOHBET LİSTESİ — "Sohbetler" | "İstekler (n)"
 *
 * İki sekme iki GERÇEK adres (`/mesajlar`, `/mesajlar?kutu=istekler`): orta
 * tuş ve yeni sekme çalışıyor, geri tuşu sekmeyi geri alıyor. Görünüm
 * `ui/Tabs`ın hap sekmesiyle aynı; o bileşen düğme çizdiği için burada
 * bağlantı hâli yazıldı.
 *
 * VERİ SUNUCUDAN, KURAL SUNUCUDA: hangi sohbetin hangi kutuda durduğu,
 * okunmamış sayısı ve "görüldü" gizliliği `sohbetlerim` RPC'sinde. Liste
 * gelen kutusu değişince yeniden okunuyor; olay yükünden satır üretilmiyor.
 *
 * DÖRT DURUM: yükleniyor (iskelet), hata (yeniden dene), boş (dürüst
 * cümle, örnek satır yok), dolu.
 */

const SEKME = `inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-bold ${RENK_GECISI} ${ODAK_HALKASI}`;

function icTiklama(onNavigate: (yol: string) => void, yol: string) {
  return (olay: React.MouseEvent<HTMLAnchorElement>) => {
    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
    olay.preventDefault();
    onNavigate(yol);
  };
}

/** Sohbetin adresi: `/mesajlar/<kullaniciadi>`. Kullanıcı adı yoksa adres yok. */
export function sohbetYolu(kullaniciAdi: string | null): string | null {
  return kullaniciAdi ? `/mesajlar/${encodeURIComponent(kullaniciAdi)}` : null;
}

const SohbetSatiri: React.FC<{
  sohbet: SohbetOzeti;
  secili: boolean;
  onNavigate: (yol: string) => void;
}> = ({ sohbet, secili, onNavigate }) => {
  const ad = sohbet.karsiGorunenAd ?? (sohbet.karsiKullaniciAdi ? `@${sohbet.karsiKullaniciAdi}` : null);
  const yol = sohbetYolu(sohbet.karsiKullaniciAdi);
  const okunmamis = sohbet.okunmamis > 0;
  const onizleme = sonMesajOnizlemesi(sohbet.sonMesaj, sohbet.sonMesajBenim);
  /* Benim açtığım ve henüz kabul edilmemiş istek: satırda etiket. */
  const istekGonderildi = sohbet.durum === 'istek' && sohbet.benBaslattim;

  const icerik = (
    <>
      <ProfilFotografi ad={ad ?? '?'} yol={sohbet.karsiAvatarYolu} className="h-12 w-12 shrink-0 rounded-full text-sm" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1">
          <span className={`min-w-0 truncate text-sm ${okunmamis ? 'font-extrabold text-gray-900' : 'font-bold text-gray-900'}`}>
            {ad ?? 'Bu profil şu anda görüntülenemiyor'}
          </span>
          <ResmiTik resmiMi={sohbet.karsiResmiMi} className="h-3.5 w-3.5" />
          <span className="ml-auto shrink-0 pl-2 text-xs text-gray-500">{gecenSure(sohbet.sonMesajAni)}</span>
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2">
          {istekGonderildi && (
            <span className="shrink-0 rounded-full border border-gray-300 px-2 py-0.5 text-[11px] font-bold text-gray-700">
              İstek gönderildi
            </span>
          )}
          <span className={`min-w-0 truncate text-sm ${okunmamis ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
            {onizleme ?? ''}
          </span>
          {okunmamis && (
            <>
              <span aria-hidden className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
              <span className="sr-only">, okunmamış mesaj var</span>
            </>
          )}
        </span>
      </span>
    </>
  );

  const sinif = `flex min-h-[72px] items-center gap-3 px-4 py-3 ${secili ? 'bg-blue-50' : 'hover:bg-gray-50'} ${RENK_GECISI}`;
  return (
    <li>
      {yol ? (
        <a
          href={yol}
          onClick={icTiklama(onNavigate, yol)}
          aria-current={secili ? 'page' : undefined}
          className={`${sinif} ${ODAK_HALKASI}`}
        >
          {icerik}
        </a>
      ) : (
        /* Kullanıcı adı yoksa adres yok: satır bilgi, bağlantı değil. */
        <div className={sinif}>{icerik}</div>
      )}
    </li>
  );
};

export const SohbetListesi: React.FC<{
  kutu: SohbetKutusu;
  /** Açık sohbetin karşı kullanıcı adı (geniş ekranda satırı vurgular). */
  seciliKullaniciAdi: string | null;
  /** "İstekler (n)" sekmesindeki sayı; alınamadıysa null ve sayı yazılmıyor. */
  bekleyenIstek: number | null;
  /** Sohbet ekranında bir şey değişince (gönderim, kabul, silme) artıyor. */
  tazele: number;
  onNavigate: (yol: string) => void;
}> = ({ kutu, seciliKullaniciAdi, bekleyenIstek, tazele, onNavigate }) => {
  const [sohbetler, setSohbetler] = React.useState<SohbetOzeti[]>([]);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [deneme, setDeneme] = React.useState(0);
  const [olay, setOlay] = React.useState(0);

  React.useEffect(() => gelenKutusunaAbone(() => setOlay((n) => n + 1)), []);

  /*
    İLK OKUMADA İSKELET, SONRAKİLERDE DEĞİL: gelen kutusu olayıyla yapılan
    tazeleme listeyi iskelete çevirseydi her yeni mesajda liste yanıp
    sönerdi. Kutu değişince (sekme) iskelet var: başka bir liste geliyor.
  */
  const ilkMi = React.useRef(true);
  React.useEffect(() => {
    ilkMi.current = true;
  }, [kutu]);
  React.useEffect(() => {
    let iptal = false;
    if (ilkMi.current) setDurum('yukleniyor');
    sohbetlerimiGetir(kutu)
      .then((liste) => {
        if (iptal) return;
        setSohbetler(liste);
        setDurum('hazir');
        ilkMi.current = false;
      })
      .catch(() => {
        if (!iptal && ilkMi.current) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [kutu, deneme, olay, tazele]);

  const sekmeler: { id: SohbetKutusu; etiket: string; yol: string }[] = [
    { id: 'gelen', etiket: 'Sohbetler', yol: kutuYolu('gelen') },
    {
      id: 'istekler',
      etiket: bekleyenIstek !== null && bekleyenIstek > 0 ? `İstekler (${bekleyenIstek})` : 'İstekler',
      yol: kutuYolu('istekler'),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-3 pt-4">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Mesajlar</h1>
        <nav aria-label="Mesaj kutuları" className="mt-3 flex w-fit items-center gap-1 rounded-full bg-gray-100 p-1">
          {sekmeler.map((s) => {
            const acik = s.id === kutu;
            return (
              <a
                key={s.id}
                href={s.yol}
                onClick={icTiklama(onNavigate, s.yol)}
                aria-current={acik ? 'page' : undefined}
                className={`${SEKME} ${acik ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {s.etiket}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="min-h-0 flex-1 lg:overflow-y-auto">
        {durum === 'yukleniyor' && (
          <ul aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} aria-hidden className="flex items-center gap-3 px-4 py-3">
                <span className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-gray-100" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3.5 w-32 animate-pulse rounded bg-gray-100" />
                  <span className="block h-3.5 w-48 animate-pulse rounded bg-gray-100" />
                </span>
              </li>
            ))}
          </ul>
        )}

        {durum === 'hata' && (
          <div role="alert" className="space-y-2 px-4 py-6">
            <p className="text-sm font-bold text-gray-900">Sohbetler alınamadı.</p>
            <p className="text-sm text-gray-600">Sunucudan cevap gelmedi. Mesajlarında bir değişiklik olmadı.</p>
            <button
              type="button"
              onClick={() => setDeneme((n) => n + 1)}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border border-gray-300 px-4 text-sm font-bold text-gray-900 hover:bg-gray-50 ${ODAK_HALKASI}`}
            >
              Yeniden dene
            </button>
          </div>
        )}

        {durum === 'hazir' && sohbetler.length === 0 && (
          <div className="px-4 py-8">
            {kutu === 'gelen' ? (
              <>
                <p className="text-sm font-bold text-gray-900">Henüz sohbetin yok.</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Bir öğrencinin profilinde "Mesaj"a basarak yazışma başlatabilirsin.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-900">Mesaj isteğin yok.</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Bağlantın olmayan biri yazarsa isteği burada görürsün; kabul edene kadar sohbetlerine
                  karışmaz.
                </p>
              </>
            )}
          </div>
        )}

        {durum === 'hazir' && sohbetler.length > 0 && (
          <ul>
            {sohbetler.map((s) => (
              <SohbetSatiri
                key={s.sohbetId}
                sohbet={s}
                secili={Boolean(seciliKullaniciAdi) && s.karsiKullaniciAdi === seciliKullaniciAdi}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
