import React from 'react';
import { AlertTriangle, BadgeCheck, Copy, Lock, Plus, Users } from 'lucide-react';
import { SirketKabugu, SIRKET_KENAR, SIRKET_VURGU, SIRKET_YUZEY, type SirketSekmesi } from './SirketKabugu';
import { IlanFormu } from './IlanFormu';
import { KADEME, adayGorebilir, vknGecerli } from '../lib/sirket-kademe.mjs';
import {
  ilanDurumuDegistir,
  ilanKaydet,
  sirketBaglami,
  sirketIlanlari,
  vknKaydet,
  type SirketBaglami,
} from '../lib/sirket-veri';

/**
 * Şirket paneli.
 *
 * DÖRT İŞ
 * -------
 * İlanlar, Başvuranlar, Şirket, Çıkış. Grafik, huni, ısı haritası yok:
 * gün içinde birkaç dakika ayıran İK'nın bakacağı şey bunlar değil.
 *
 * KADEME 1 BAŞVURANLARI GÖREMİYOR
 * -------------------------------
 * Sekme duruyor ama içerik yok; yerine ne yapılacağı yazıyor. Sekmeyi
 * tamamen gizlemek, doğrulamanın var olduğunu da gizlerdi.
 *
 * Asıl kapı burada değil, veritabanında: `applications` SELECT politikası
 * şirketin doğrulanmış olmasını da soruyor. Bu ekran kapatılsa bile veri
 * gelmiyor.
 */

const KUTU = 'rounded-2xl border p-4 sm:p-5';
const kutuStil = { background: SIRKET_YUZEY, borderColor: SIRKET_KENAR };

const DurumRozeti: React.FC<{ baglam: SirketBaglami }> = ({ baglam }) =>
  baglam.dogrulandi ? (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold"
      style={{ background: '#0d2b1e', color: '#4ade80' }}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      Doğrulanmış kurum
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[11px] font-bold"
      style={{ background: SIRKET_YUZEY, color: SIRKET_VURGU }}
    >
      KADEME 1
    </span>
  );

export const SirketPaneli: React.FC<{
  yol: string;
  userId: string | null;
  yoneticiMi: boolean;
  onNavigate: (yol: string) => void;
  onOgrenciyeDon: () => void;
}> = ({ yol, userId, yoneticiMi, onNavigate, onOgrenciyeDon }) => {
  const [baglam, setBaglam] = React.useState<SirketBaglami | null>(null);
  const [ilanlar, setIlanlar] = React.useState<Record<string, unknown>[]>([]);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

  const yukle = React.useCallback(async () => {
    setDurum('yukleniyor');
    try {
      const b = await sirketBaglami(userId, yoneticiMi);
      setBaglam(b);
      if (b.companyId) setIlanlar((await sirketIlanlari(b.companyId)) as Record<string, unknown>[]);
      setDurum('hazir');
    } catch {
      setDurum('hata');
    }
  }, [userId, yoneticiMi]);

  React.useEffect(() => {
    void yukle();
  }, [yukle]);

  const sekme: SirketSekmesi = yol.startsWith('/sirket/basvuranlar')
    ? 'basvuranlar'
    : yol.startsWith('/sirket/profil')
      ? 'sirket'
      : 'ilanlar';

  if (durum === 'yukleniyor' || !baglam) {
    return (
      <SirketKabugu secili="ilanlar" onNavigate={onNavigate} onCikis={onOgrenciyeDon}>
        <div className="space-y-3" aria-busy="true">
          <span className="block h-8 w-48 animate-pulse rounded-lg" style={{ background: SIRKET_YUZEY }} />
          <span className="block h-24 w-full animate-pulse rounded-2xl" style={{ background: SIRKET_YUZEY }} />
        </div>
      </SirketKabugu>
    );
  }

  const yeniIlanEkrani = yol === '/sirket/ilan/yeni';

  return (
    <SirketKabugu
      secili={sekme}
      onNavigate={onNavigate}
      onCikis={onOgrenciyeDon}
      durumRozeti={<DurumRozeti baglam={baglam} />}
    >
      {yeniIlanEkrani ? (
        <IlanFormu
          kademe={baglam.kademe}
          sirketAdi={baglam.ad}
          siteUrl={baglam.siteUrl}
          eposta={baglam.hrEmail}
          onKaydet={async (satir) => {
            const kayit = await ilanKaydet(satir, baglam.companyId!);
            await yukle();
            return kayit;
          }}
          onIptal={() => onNavigate('/sirket/ilanlar')}
        />
      ) : sekme === 'ilanlar' ? (
        <Ilanlar
          baglam={baglam}
          ilanlar={ilanlar}
          onNavigate={onNavigate}
          onDurum={async (id, d) => {
            await ilanDurumuDegistir(id, d);
            await yukle();
          }}
        />
      ) : sekme === 'basvuranlar' ? (
        <Basvuranlar baglam={baglam} onNavigate={onNavigate} />
      ) : (
        <SirketProfili baglam={baglam} onKaydedildi={yukle} />
      )}
    </SirketKabugu>
  );
};

/* ------------------------------------------------------------- ilanlar */

const Ilanlar: React.FC<{
  baglam: SirketBaglami;
  ilanlar: Record<string, unknown>[];
  onNavigate: (y: string) => void;
  onDurum: (id: string, d: 'published' | 'closed') => Promise<void>;
}> = ({ baglam, ilanlar, onNavigate, onDurum }) => {
  const acik = ilanlar.filter((i) => i.status === 'published').length;
  const taslak = ilanlar.filter((i) => i.status === 'draft').length;

  return (
    <div className="space-y-5">
      {/*
        ŞİRKET ANA EKRANI

        Açık ilan, bu haftaki başvuru ve doğrulama durumu. Grafik ve huni
        yok: birkaç dakikalık bir ziyarette bakılacak şey sayı değil,
        sıradaki iş.
      */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{baglam.ad || 'Şirketin'}</h1>
          <p className="text-sm text-gray-400">
            {acik} açık ilan{taslak > 0 ? ` · ${taslak} taslak` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/sirket/ilan/yeni')}
          className="ml-auto inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-5 text-sm font-black text-gray-900"
          style={{ background: SIRKET_VURGU }}
        >
          <Plus className="h-5 w-5" />
          Yeni ilan
        </button>
      </div>

      {ilanlar.length === 0 ? (
        <div className={KUTU} style={kutuStil}>
          <p className="font-bold text-white">Henüz ilan yok</p>
          <p className="mt-1 text-sm text-gray-400">
            İlk ilanı açmak iki dakika sürüyor: pozisyon, şehir, süre, ücret ve iş tanımı.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {ilanlar.map((i) => {
            const id = String(i.id);
            const yayinda = i.status === 'published';
            return (
              <li
                key={id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border p-4"
                style={kutuStil}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{String(i.title ?? '')}</p>
                  <p className="truncate text-xs text-gray-400">
                    {String(i.city ?? '')} ·{' '}
                    <span className="font-mono">
                      {yayinda ? 'YAYINDA' : i.status === 'draft' ? 'TASLAK' : 'KAPALI'}
                    </span>
                    {' · '}
                    <span className="font-mono">#{id.slice(0, 8)}</span>
                  </p>
                </div>

                {/*
                  Başvuru sayısı YALNIZCA doğrulanmış şirkette. Kademe 1'e
                  "3 başvuru var" demek, göremeyeceği bir şeyi göstermek
                  ve doğrulamayı satmak olurdu.
                */}
                {adayGorebilir(baglam.kademe) && (
                  <span className="shrink-0 font-mono text-xs text-gray-400">
                    {Number(i.applicants_count ?? 0)} başvuru
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => void onDurum(id, yayinda ? 'closed' : 'published')}
                  className="min-h-11 shrink-0 cursor-pointer rounded-xl border px-3 text-xs font-bold text-gray-200"
                  style={{ borderColor: SIRKET_KENAR }}
                >
                  {yayinda ? 'Kapat' : 'Yayınla'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/* --------------------------------------------------------- başvuranlar */

const Basvuranlar: React.FC<{ baglam: SirketBaglami; onNavigate: (y: string) => void }> = ({
  baglam,
  onNavigate,
}) => {
  if (!adayGorebilir(baglam.kademe)) {
    return (
      <div className={KUTU} style={kutuStil}>
        <p className="flex items-center gap-2 text-lg font-extrabold text-white">
          <Lock className="h-5 w-5" style={{ color: SIRKET_VURGU }} />
          Başvuran bilgileri kapalı
        </p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-300">
          İlan asmak ile öğrenci bilgisi görmek ayrı iki yetki. Öğrencinin adı, okulu ve
          projelerini görebilmek için şirketin doğrulanması gerekiyor — bu, bilgilerini bize
          emanet eden öğrenciye verdiğimiz söz.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/sirket/profil')}
          className="mt-4 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-5 text-sm font-black text-gray-900"
          style={{ background: SIRKET_VURGU }}
        >
          Şirketini doğrula
        </button>
      </div>
    );
  }

  /*
    SCOUT IZGARASI — İSKELET

    Kartların kendisi D aşamasında geliyor: ızgara, drawer, J/K gezinme ve
    "önyargısız incele". Burada şu an yalnızca boş hal var; uydurma kart
    çizmek, olmayan bir özelliği varmış gibi göstermek olurdu.
  */
  return (
    <div className={KUTU} style={kutuStil}>
      <p className="flex items-center gap-2 font-bold text-white">
        <Users className="h-5 w-5" style={{ color: SIRKET_VURGU }} />
        Henüz başvuru yok
      </p>
      <p className="mt-1 text-sm text-gray-400">
        İlan bağlantısını paylaşınca başvurular buraya kart olarak düşecek.
      </p>
      <button
        type="button"
        onClick={() => onNavigate('/sirket/ilanlar')}
        className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-bold text-gray-200"
        style={{ borderColor: SIRKET_KENAR }}
      >
        <Copy className="h-4 w-4" />
        İlanlarıma git
      </button>
    </div>
  );
};

/* -------------------------------------------------------- şirket profili */

const SirketProfili: React.FC<{ baglam: SirketBaglami; onKaydedildi: () => void }> = ({
  baglam,
  onKaydedildi,
}) => {
  const [vkn, setVkn] = React.useState(baglam.vkn ?? '');
  const [mersis, setMersis] = React.useState('');
  const [durum, setDurum] = React.useState<'bos' | 'kaydediliyor' | 'tamam' | 'hata'>('bos');
  const [hata, setHata] = React.useState('');

  const bicimTamam = vknGecerli(vkn);

  const gonder = async () => {
    if (!bicimTamam || !baglam.companyId) return;
    setDurum('kaydediliyor');
    setHata('');
    try {
      await vknKaydet(baglam.companyId, vkn, mersis);
      setDurum('tamam');
      onKaydedildi();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi.');
      setDurum('hata');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-white">{baglam.ad}</h1>

      {baglam.dogrulandi ? (
        <div className={KUTU} style={kutuStil}>
          <p className="flex items-center gap-2 font-bold" style={{ color: '#4ade80' }}>
            <BadgeCheck className="h-5 w-5" />
            Doğrulanmış kurum
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Başvuran kartları ve platformdan başvuru açık.
          </p>
        </div>
      ) : (
        <div className={KUTU} style={kutuStil}>
          <p className="font-bold text-white">Şirket doğrulama</p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-300">
            Doğrulama başvuran kartlarını açıyor. Ticari unvan ve VKN'yi alıp bir insan
            kontrol ediyor; genellikle bir iş günü sürüyor ve sonucu e-postayla yazıyoruz.
          </p>

          {/*
            ŞAHIS ŞİRKETİNDEN TCKN İSTENMİYOR

            Kimlik numarası staj ilanı açmak için gereken bir veri değil ve
            toplandığı anda korunması gereken bir yük oluyor. VKN yeterli.
          */}
          <label className="mt-4 block max-w-xs">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-gray-400">
              VKN
            </span>
            <input
              inputMode="numeric"
              maxLength={10}
              value={vkn}
              onChange={(e) => setVkn(e.target.value.replace(/\D/g, ''))}
              placeholder="10 haneli"
              className="w-full min-h-11 rounded-xl border bg-transparent px-3 font-mono text-sm text-gray-100 outline-none focus:border-amber-400"
              style={{ borderColor: SIRKET_KENAR }}
            />
            {vkn.length === 10 && !bicimTamam && (
              <span className="mt-1 block text-[11px] font-semibold text-rose-400">
                Bu numara doğrulamayı geçmiyor; bir hane hatalı olabilir.
              </span>
            )}
          </label>

          <label className="mt-3 block max-w-xs">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-gray-400">
              MERSİS (isteğe bağlı)
            </span>
            <input
              value={mersis}
              onChange={(e) => setMersis(e.target.value)}
              className="w-full min-h-11 rounded-xl border bg-transparent px-3 font-mono text-sm text-gray-100 outline-none focus:border-amber-400"
              style={{ borderColor: SIRKET_KENAR }}
            />
          </label>

          <p className="mt-3 flex max-w-xl items-start gap-2 text-[11px] leading-relaxed text-gray-500">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            VKN herkese açık bir bilgidir ve tek başına yetkili olduğunu kanıtlamaz; bu yüzden
            kaydetmek doğrulama demek değil. VKN öğrenciye hiçbir yerde gösterilmiyor.
          </p>

          {durum === 'hata' && <p className="mt-2 text-sm font-semibold text-rose-400">{hata}</p>}
          {durum === 'tamam' && (
            <p className="mt-2 text-sm font-semibold" style={{ color: '#4ade80' }}>
              Kaydedildi. İnceleme kuyruğuna alındı.
            </p>
          )}

          <button
            type="button"
            onClick={() => void gonder()}
            disabled={!bicimTamam || durum === 'kaydediliyor'}
            className="mt-4 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-5 text-sm font-black text-gray-900 disabled:opacity-40"
            style={{ background: SIRKET_VURGU }}
          >
            {durum === 'kaydediliyor' ? 'Kaydediliyor…' : 'Doğrulamaya gönder'}
          </button>
        </div>
      )}
    </div>
  );
};

export { KADEME };
