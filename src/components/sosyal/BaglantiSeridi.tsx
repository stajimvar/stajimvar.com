import React from 'react';
import { YatayKaydirma } from '../YatayKaydirma';
import { Users } from 'lucide-react';
import type { BaglantiKisisi } from '../../lib/queries/sosyal';
import { ODAK_HALKASI } from '../../lib/renk-token';
import { profilYolu } from '../../lib/sosyal-kullanici-adi.mjs';
import { ProfilFotografi } from './ProfilFotografi';

/**
 * Ağım'ın bağlantı şeridi — İlanlar ve Fırsatlar küreleriyle TEK TİP.
 *
 * Bağlantılar (profil fotoğrafı) → Bağlantılar sayfası. Kürelerin
 * altında kişinin adı tek satır, İlanlar'daki şirket küreleri gibi
 * (kullanıcı isteği, 16 Eylül 2026).
 *
 * KÜRE PROFİLE GÖTÜRÜR (kullanıcı kararı, 24 Eylül 2026)
 *   Küre önceden akışı o kişinin paylaşımlarına süzüyor, ikinci
 *   dokunuşta dönüp adı gösteriyordu. Canlıdaki görüntüde seçili
 *   kişinin paylaşımı yoktu ve ekranda yalnız "Bu kişinin akışında
 *   paylaşımı yok." kalıyordu: süzme boş bir sayfaya çıkıyordu. Profil
 *   aynı paylaşımları VE mesaj, bağlantı gibi seçenekleri gösteriyor.
 *   Süzme kalkınca "Tümü" küresinin de yapacağı iş kalmadı; o da kalktı.
 *
 *   Küre gerçek `<a href>`: orta tuş ve "yeni sekmede aç" çalışıyor, sol
 *   tık uygulama içinde gidiyor. Şirket sayfaları ve resmî hesap da aynı
 *   `/profil/<ad>` adresinde; şirket görünümünü satırın `sirket_id`si
 *   seçiyor (SosyalProfilSayfasi), ikinci bir adres yok.
 *
 * AD UYDURULMUYOR: profili RLS'e takılan bağlantı şeritte çizilmiyor
 * (`profil === null`), baş harfleri ProfilFotografi'nin kendisi veriyor.
 * Profil satırı gelmiş ama kullanıcı adı boşsa gidilecek adres yok;
 * küre bağlantı değil, düz öğe olarak çiziliyor.
 */

const KURE = 'h-[clamp(58px,16vw,64px)] w-[clamp(58px,16vw,64px)]';

export function kisiAdi(kisi: BaglantiKisisi): string {
  return kisi.profil?.gorunenAd?.trim() || kisi.profil?.kullaniciAdi || '';
}

/*
  Öğe 58–64 piksel küre + ad satırıyla en az 80 piksel yüksek, 68 piksel
  geniş: 44 piksel dokunma hedefinin üstünde. Odak halkası kürenin
  değil öğenin çevresinde, yuvarlatılmış köşeyle.
*/
const OGE = `flex w-[clamp(68px,19vw,78px)] shrink-0 flex-col items-center gap-1.5 rounded-xl ${ODAK_HALKASI}`;
const AD = 'block w-full truncate text-center text-[13px] font-medium leading-tight text-slate-700';

const KisiKuresi: React.FC<{ kisi: BaglantiKisisi }> = ({ kisi }) => (
  <span aria-hidden className={`${KURE} block rounded-full bg-gray-200 p-[2.5px]`}>
    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
      <ProfilFotografi
        ad={kisiAdi(kisi) || '?'}
        yol={kisi.profil?.avatarYolu ?? null}
        className="h-full w-full rounded-full"
      />
    </span>
  </span>
);

export const BaglantiSeridi: React.FC<{
  kisiler: BaglantiKisisi[];
  bekleyenIstek: number;
  onBaglantilar: () => void;
  onNavigate: (yol: string) => void;
}> = ({ kisiler, bekleyenIstek, onBaglantilar, onNavigate }) => {
  const gorunen = kisiler.filter((k) => k.profil !== null);

  return (
    <nav aria-label="Bağlantılarım" className="-mx-4 border-b border-gray-200 bg-white sm:mx-0 sm:rounded-2xl sm:border">
      <YatayKaydirma className="overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden">
        <ul className="flex min-w-max gap-2.5">
          {/*
            BAĞLANTILAR KISAYOLU KİŞİLERDEN AYRI (mobil sadeleştirme,
            25 Eylül 2026): önce kişi dairelerinin sonunda, aynı kalın
            çerçeveli daireyle duruyordu ve bir kişi gibi okunuyordu. Artık
            şeridin başında köşeli bir kutu; ardından ince bir ayraç ve
            kişiler geliyor.
          */}
          <li className="flex items-start border-r border-gray-200 pr-2.5">
            <button
              type="button"
              onClick={onBaglantilar}
              aria-label={bekleyenIstek > 0 ? `Bağlantılar, ${bekleyenIstek} bekleyen istek` : 'Bağlantılar'}
              className={`${OGE} cursor-pointer`}
            >
              <span
                aria-hidden
                className={`${KURE} relative flex items-center justify-center rounded-2xl bg-gray-100 text-slate-800 hover:bg-gray-200`}
              >
                <Users className="h-6 w-6" strokeWidth={1.75} />
                {/* Rozet GERÇEK sayı; sıfırken hiç çizilmiyor. */}
                {bekleyenIstek > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {bekleyenIstek > 9 ? '9+' : bekleyenIstek}
                  </span>
                )}
              </span>
              <span aria-hidden className={AD}>
                Bağlantılar
              </span>
            </button>
          </li>
          {gorunen.map((kisi) => {
            const ad = kisiAdi(kisi);
            const kullaniciAdi = kisi.profil?.kullaniciAdi ?? null;
            if (!kullaniciAdi) {
              return (
                <li key={kisi.kisiId}>
                  <div className={OGE}>
                    <KisiKuresi kisi={kisi} />
                    <span className={AD}>{ad}</span>
                  </div>
                </li>
              );
            }
            const yol = profilYolu(kullaniciAdi);
            return (
              <li key={kisi.kisiId}>
                <a
                  href={yol}
                  onClick={(olay) => {
                    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
                    olay.preventDefault();
                    onNavigate(yol);
                  }}
                  aria-label={`${ad} profili`}
                  className={`${OGE} group`}
                >
                  <KisiKuresi kisi={kisi} />
                  <span aria-hidden className={`${AD} group-hover:text-slate-900`}>
                    {ad}
                  </span>
                </a>
              </li>
            );
          })}

        </ul>
      </YatayKaydirma>
    </nav>
  );
};
