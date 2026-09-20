import React from 'react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { TAKIP_SAYFA_BOYU, type TakipKisisi } from '../../lib/queries/sosyal';
import { profilYolu } from '../../lib/sosyal-kullanici-adi.mjs';
import { ProfilFotografi } from './ProfilFotografi';

/**
 * TAKİP LİSTELERİ — ÜÇ EKRAN, TEK SATIR BİÇİMİ
 *
 * Öğrenci Ağım'ında "Takip ettiğin şirketler", şirket Ağım'ında "Seni
 * takip edenler" ve "Takip ettiğin şirketler": üçü de aynı RPC biçimini
 * (`TakipKisisi`) okuyor ve aynı satırı çiziyor. Satır `KisiListesi`nin
 * (arama/keşif) kalıbı: fotoğraf ya da baş harf, ad, `@kullanıcıadı`;
 * gerçek `<a href="/profil/<ad>">`. Ad yoksa uydurulmuyor, `@ad` geçiyor.
 *
 * SAYFALI, SONSUZ DEĞİL
 * ---------------------
 * RPC en çok 100 satır veriyor; istemci `TAKIP_SAYFA_BOYU` (50) istiyor
 * ve TAM sayfa geldiyse "Daha fazla göster" çiziyor. Tam sayfa "daha
 * var" demek değil — tam 50 takipçisi olan sayfada düğme bir kez daha
 * basılır ve boş döner; bu dürüst: sunucu toplamı ayrıca vermiyor ve
 * bir sayaç için ikinci RPC atmak, listenin sayaçla eşit olmadığı
 * durumlarda (engelli ya da yayından kalkmış takipçi süzülüyor) yanlış
 * bir "N kişi daha" yazdırırdı.
 *
 * DÖRT DURUM AYRI: yükleniyor (iskelet satırlar), alınamadı (cümle,
 * `role="alert"`), gerçek sıfır (çağıranın verdiği cümle; bölümü hiç
 * çizmemek de çağıranın kararı, `liste.satirlar`a bakarak), dolu.
 */

type Durum = 'yukleniyor' | 'hazir' | 'hata';

interface TakipListesiDurumu {
  satirlar: TakipKisisi[];
  durum: Durum;
  /** Son sayfa tam geldi: bir sayfa daha istenebilir. */
  dahaVar: boolean;
  dahaYukleniyor: boolean;
  dahaFazla: () => void;
}

/**
 * Listeyi sayfalı okuyan kanca. `yukle` (offset) → satırlar; RPC'nin
 * hangisi olduğunu çağıran seçiyor, kanca sayfalamayı biliyor.
 *
 * `anahtar` değişince liste sıfırdan okunuyor (ör. takibi bıraktıktan
 * sonra tazeleme).
 */
export function useTakipListesi(
  yukle: (offset: number) => Promise<TakipKisisi[]>,
  etkin: boolean,
  anahtar = 0,
): TakipListesiDurumu {
  const [satirlar, setSatirlar] = React.useState<TakipKisisi[]>([]);
  const [durum, setDurum] = React.useState<Durum>('yukleniyor');
  const [dahaVar, setDahaVar] = React.useState(false);
  const [dahaYukleniyor, setDahaYukleniyor] = React.useState(false);

  React.useEffect(() => {
    if (!etkin) return;
    let iptal = false;
    setDurum('yukleniyor');
    setSatirlar([]);
    yukle(0)
      .then((liste) => {
        if (iptal) return;
        setSatirlar(liste);
        setDahaVar(liste.length >= TAKIP_SAYFA_BOYU);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etkin, anahtar]);

  const dahaFazla = React.useCallback(() => {
    if (dahaYukleniyor || !dahaVar) return;
    setDahaYukleniyor(true);
    yukle(satirlar.length)
      .then((liste) => {
        /*
          Aynı kimlik iki kez gelmesin: sayfalar arasında yeni takipçi
          eklendiyse offset kayıyor ve bir satır tekrar gelebiliyor. Satırı
          iki kez çizmek "iki takipçi" gibi okunurdu.
        */
        setSatirlar((eski) => {
          const bilinen = new Set(eski.map((s) => s.profilId));
          return [...eski, ...liste.filter((s) => !bilinen.has(s.profilId))];
        });
        setDahaVar(liste.length >= TAKIP_SAYFA_BOYU);
      })
      .catch(() => {
        /* Ek sayfa alınamadı: eldeki liste duruyor, düğme yeniden basılabilir. */
      })
      .finally(() => setDahaYukleniyor(false));
  }, [dahaYukleniyor, dahaVar, satirlar.length, yukle]);

  return { satirlar, durum, dahaVar, dahaYukleniyor, dahaFazla };
}

const SATIR = `flex min-h-11 items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;
const DAHA_FAZLA = `inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

export const TakipListesi: React.FC<{
  liste: TakipListesiDurumu;
  /** Gerçek sıfırda yazılan cümle. */
  bosMetin: string;
  /** Alınamadığında yazılan cümle. */
  hataMetni: string;
  onNavigate: (yol: string) => void;
}> = ({ liste, bosMetin, hataMetni, onNavigate }) => {
  if (liste.durum === 'yukleniyor') {
    return (
      <ul aria-busy="true" className="space-y-0.5">
        {[0, 1].map((i) => (
          <li key={i} aria-hidden className="flex min-h-11 items-center gap-2.5 px-2 py-2">
            <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-100" />
            <span className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
          </li>
        ))}
      </ul>
    );
  }
  if (liste.durum === 'hata') {
    return (
      <p role="alert" className="px-2 text-sm text-gray-600">
        {hataMetni}
      </p>
    );
  }
  if (liste.satirlar.length === 0) {
    return <p className="px-2 text-sm text-gray-600">{bosMetin}</p>;
  }
  return (
    <div className="space-y-2">
      <ul className="space-y-0.5">
        {liste.satirlar.map((kisi) => {
          const yol = profilYolu(kisi.kullaniciAdi);
          /*
            Görünen ad yoksa başlık zaten "@kullaniciadi"; altına aynı
            satırı ikinci kez yazmak (390'da ölçüldü: "@ayseogrenci /
            @ayseogrenci") tekrar oluyordu. Profil başlığıyla aynı kural.
          */
          const ad = kisi.gorunenAd ?? `@${kisi.kullaniciAdi}`;
          const adAyri = Boolean(kisi.gorunenAd);
          return (
            <li key={kisi.profilId}>
              <a
                href={yol}
                onClick={(olay) => {
                  if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
                    return;
                  olay.preventDefault();
                  onNavigate(yol);
                }}
                className={SATIR}
              >
                {/*
                  ŞİRKET LOGOSU YEDEKTE (20 Eylül 2026)

                  Şirket sayfalarında `avatar_path` boştu ve satır baş
                  harflerle çiziliyordu (@ogulsize, @stajimvaryg: ikisinde
                  de yol yok, `companies.logo_url` dolu). Logo artık
                  `yedekAdres` ucundan geliyor; sırayı `profilFotografi`
                  veriyor: sosyal profil fotoğrafı VARSA o kazanıyor,
                  kurumsal logo yalnız o yokken çiziliyor — şirket bir gün
                  kendi fotoğrafını yüklerse logo onu ezmemeli. Öğrenci
                  satırında `logoAdresi` null olduğu için bu dal hiç
                  çalışmıyor, baş harf davranışı aynı kalıyor.
                */}
                {/*
                  ALT METNİ SATIRIN TÜRÜNÜ SÖYLÜYOR

                  Aynı daire öğrencide fotoğraf, şirkette logo. `sirketId`
                  dolu olan satır o şirketin sayfası (queries/sosyal ·
                  TakipKisisi) — tek ayırt edici alan o, `logoAdresi`
                  değil: logo boş olsa da satır yine bir şirket.
                */}
                <ProfilFotografi
                  ad={ad}
                  yol={kisi.avatarYolu}
                  yedekAdres={kisi.logoAdresi}
                  tur={kisi.sirketId ? 'kurum' : 'kisi'}
                  className="h-10 w-10 shrink-0 rounded-full text-sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-gray-900">{ad}</span>
                  {adAyri && (
                    <span className="block truncate text-xs text-gray-600">@{kisi.kullaniciAdi}</span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      {liste.dahaVar && (
        <button type="button" disabled={liste.dahaYukleniyor} onClick={liste.dahaFazla} className={DAHA_FAZLA}>
          {liste.dahaYukleniyor ? 'Yükleniyor…' : 'Daha fazla göster'}
        </button>
      )}
    </div>
  );
};
