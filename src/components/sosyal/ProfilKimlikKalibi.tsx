import React from 'react';
import { MessageCircle, Share, type LucideIcon } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI, RENK_PRIMARY } from '../../lib/renk-token';

/**
 * PROFİL BAŞLIĞI KALIBI — X WEB PROFİLİ (kullanıcı kararı, 24 Eylül 2026)
 *
 * Üç profil ekranı (`/cv` kartı `ProfilBasligi`, `/profil/:ad`
 * `SosyalProfilGorunumu`, şirket `SirketProfilGorunumu`) aynı kalıbı
 * paylaşıyor (20 Eylül 2026 kararı). Kalıbın REFERANSI şirket profiliydi,
 * artık X'in masaüstü profil sayfası. Yukarıdan aşağı sıra:
 *
 *   kapak bandı (3:1, lg 5:1)
 *   avatar solda banda yarı yarıya biniyor · sağda, alt hizada hap sırası
 *   ad + tik, altında @ad
 *   biyografi
 *   meta satırı (ikonlu, gri, sarıyor)
 *   sayaç satırı (tek satır, satır içi: kalın sayı + gri etiket)
 *
 * Her şey kartın SOL dolgusundan başlıyor; ortalanmış bir sütun yok.
 *
 * NEDEN TEK MODÜL
 * ---------------
 * Üç dosya aynı dizeleri ayrı ayrı yazıyordu ve bir test onları tek tek
 * karşılaştırıyordu. Dizeler burada bir kez duruyor, üç ekran içe
 * aktarıyor. Biri kendi kopyasını yazarsa `sosyal-profil-arayuzu` testi
 * düşüyor.
 *
 * NEDEN HAP (`rounded-full`)
 * --------------------------
 * X'teki "Edit profile" / "Follow" kalıbı. Yükseklik `min-h-11` (44
 * piksel dokunma eşiği). Eski 48 piksellik `rounded-xl` blok düğmeler
 * kimliğin ALTINDA tam genişlikte duruyordu; hap sırası artık avatarın
 * sağında ve 375 piksellik ekranda 80 piksellik avatarın yanına sığmak
 * zorunda.
 */

/** Çerçeveli hap — ikincil eylem (Profili düzenle). */
export const HAP = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-sm font-bold text-gray-900 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

/** Dolu hap — ekranın birincil eylemi (CV'ni görüntüle, İlan paylaş, Fotoğraf paylaş). */
export const HAP_BIRINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold ${RENK_PRIMARY.zemin} ${RENK_PRIMARY.zeminHover} ${RENK_PRIMARY.yazi} ${RENK_GECISI} ${ODAK_HALKASI}`;

/** Yuvarlak ikon düğmesi — X'teki "…" gibi; anlamı `aria-label` taşıyor. */
export const IKON_HAP = `inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

/*
  KİMLİK BANDI: üst dolgu YOK. Avatar kendi negatif üst boşluğuyla banda
  biniyor; dolgu olsaydı binme payı dolguyu da geri almak zorunda kalırdı
  (#238'deki `pt-5` + `-mt-16` hesabı bu yüzden kalktı).
*/
export const KIMLIK_BANDI = 'px-4 pb-4 sm:px-6 sm:pb-5';

/*
  AVATAR SATIRI: avatar `self-start` ile banda sabit payla biniyor, hap
  sırası satırın ALT hizasında. Satır yüksekliği ikisinin büyüğü:
  sm ve lg'de avatarın bant altındaki yarısı (56 / 72 piksel) hap
  sırasından (12 + 44 = 56) büyük ya da eşit, yani hapın alt kenarı
  avatarın alt kenarıyla aynı çizgide. Telefonda avatarın alt yarısı 40
  piksel, hap sırası 56: hap avatarın 16 piksel altında bitiyor ama banda
  değmiyor (`pt-3`).
*/
export const AVATAR_SATIRI = 'flex items-end justify-between gap-3';
/*
  HAPLAR ARASI 6 PİKSEL (`gap-1.5`), 8 DEĞİL. Ölçüldü (Chromium, yerleşim
  genişliği 360 — yaygın Android genişliği): 80 piksellik avatarın yanında
  236 piksel kalıyor; sahibin üç öğesi (dişli 44 + ikon hap 48 +
  "Profili düzenle" 128.7) 8 piksellik aralarla 236.7 piksel tutuyor ve
  0.7 piksel farkla ikinci satıra sarıyordu. 6 piksellik aralarla 232.7
  piksel, tek satır. Daha dar ekranda (320) sıra `flex-wrap` ile alt
  satıra iniyor, kesilmiyor ve taşmıyor.
*/
export const HAP_SIRASI = 'flex min-w-0 flex-wrap items-center justify-end gap-1.5 pt-3';

/*
  AVATARIN BİNME PAYI: dairenin yarısı. Daire 80 / 112 / 144 piksel
  (üç ekranın ortak basamakları) → 40 / 56 / 72. `/cv`deki doluluk
  halkası daireye 2×6 piksel ekliyor; o ekran kendi değerini yazıyor.
*/
export const AVATAR_BINMESI = 'relative shrink-0 self-start -mt-10 sm:-mt-14 lg:-mt-18';

/** Biyografi: okunabilirlik için tek sınırlı öğe — sola yaslı `max-w-2xl`. */
export const BIYOGRAFI =
  'mt-3 max-w-2xl whitespace-pre-line break-words text-sm leading-relaxed text-gray-800 sm:text-base';

export const META_SATIRI = 'mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600';

/*
  SAYAÇ SATIRI: tek satır, satır içi. Her öğe `min-h-11`: bağlantı olan
  sayaçlar (`/baglantilar`, `/takip`) 44 piksellik dokunma hedefini
  taşıyor; bağlantısız olanlar da aynı yükseklikte ki satır içi hizası
  tutsun. `border-t` ayırıcı ve üç sütunlu ızgara X'te yok, kalktı.
*/
export const SAYAC_SATIRI = 'mt-1 flex flex-wrap items-center gap-x-5';
export const SAYAC_OGESI = 'inline-flex min-h-11 items-center gap-1 text-sm';
export const SAYAC_SAYISI = 'font-extrabold tabular-nums text-gray-900';
export const SAYAC_ETIKETI = 'text-gray-600';

/**
 * Meta satırının tek öğesi: ikon + görünmez etiket + değer.
 *
 * İkon tek başına bilgi taşımıyor (`aria-hidden`); ekran okuyucu "Okul:
 * Boğaziçi Üniversitesi" gibi etiketli okuyor. Değer `break-words`: uzun
 * okul adı sarıyor, kırpılmıyor.
 */
export const MetaOgesi: React.FC<{ ikon: LucideIcon; etiket: string; children: React.ReactNode }> = ({
  ikon: Ikon,
  etiket,
  children,
}) => (
  <span className="inline-flex min-w-0 max-w-full items-center gap-1">
    <Ikon aria-hidden className="h-4 w-4 shrink-0 text-gray-500" />
    <span className="sr-only">{etiket}: </span>
    <span className="min-w-0 break-words">{children}</span>
  </span>
);

/*
  ZİYARETÇİ EYLEM SATIRI — X mobil kalıbı (kullanıcı ekran görüntüsü,
  24 Eylül 2026). Başkasının profilinde eylemler avatar satırında değil,
  SAYAÇLARIN ALTINDA tam genişlikte bir satırda: [Mesaj] [durum hapı],
  iki eşit hücre. Avatar satırının sağında yalnız yuvarlak ikon düğmeleri
  kalıyor. Sahip dalları değişmiyor: X'te de "Edit profile" avatar
  satırında.

  NEDEN `grid-cols-2` DEĞİL, EŞİT TABANLI `flex-wrap`: hücrenin genişliği
  duruma göre değişiyor ve kararı durumun sahibi veriyor. Gelen istekte
  "Kabul et" + "Reddet" tam satırı kaplıyor (`TAM_HUCRE`); ızgarada bunun
  için kabın durumu bilmesi gerekirdi. Tek hücre kaldığında (`onMesaj`
  yok) `grow` onu tam genişliğe açıyor. İki hücre `basis` 50% − 4 piksel
  ile eşit. `flex-1` KULLANILMADI: `flex: 1 1 0%` taban değerini de
  yazıyor ve aynı dizedeki `basis-*` ile hangisinin kazanacağı CSS
  sırasına kalırdı; `grow` yalnız büyümeyi ayarlıyor.
*/
export const ZIYARETCI_EYLEMLERI = 'mt-3 flex flex-wrap gap-2';
export const YARIM_HUCRE = 'min-w-0 grow basis-[calc(50%-0.25rem)]';
export const TAM_HUCRE = 'min-w-0 grow basis-full';

/**
 * Profil bağlantısını paylaş — ziyaretçinin avatar satırındaki tek ikon
 * düğmesi. X'teki zil KONMADI: bildirim aboneliğinin arka ucu yok.
 */
export const PaylasIkonDugmesi: React.FC<{ onPaylas: () => void }> = ({ onPaylas }) => (
  <button type="button" onClick={onPaylas} aria-label="Profili paylaş" className={IKON_HAP}>
    <Share aria-hidden className="h-5 w-5" />
  </button>
);

/**
 * "Mesaj" hapı — eylem satırının sol hücresi.
 *
 * YALNIZ `onMesaj` VERİLİRSE ÇİZİLİYOR. Mesajlaşmanın arka ucu geldi
 * (20261107010000); sayfa düğmeyi yalnız öğrenciden öğrenciye veriyor
 * (koşullar `SosyalProfilSayfasi`nde). Verilmeyen yerde (şirket sayfası,
 * oturumsuz ziyaretçi) düğme çizilmiyor — basınca hiçbir şey yapmayan
 * ya da sunucunun reddedeceği bir düğme sahte bir özellik olurdu.
 */
export const MesajHapi: React.FC<{ onMesaj: () => void }> = ({ onMesaj }) => (
  <button type="button" onClick={onMesaj} className={`${HAP} ${YARIM_HUCRE}`}>
    <MessageCircle aria-hidden className="h-4 w-4 shrink-0" />
    Mesaj
  </button>
);
