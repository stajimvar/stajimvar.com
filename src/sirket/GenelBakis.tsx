import React from 'react';
import { AlertCircle, Archive, ArrowRight, MoreHorizontal, Plus, Send, Trash2 } from 'lucide-react';
import {
  BIRINCIL_DUGME,
  IKINCIL_DUGME,
  KUTU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  SIRKET_ROZET,
  SIRKET_VURGU_KOYU,
  birincilStil,
  ikincilStil,
  kutuStil,
} from './renk';
import { IlanKarti, YeniIlanKarti, type AdayOzeti } from './IlanKarti';
import { ilanEylemleri } from '../lib/ilan-formu.mjs';
import { adayGorebilir } from '../lib/sirket-kademe.mjs';
import type { SirketBaglami, SirketProfilDegeri } from '../lib/sirket-veri';

/**
 * Şirketin İlanlar sekmesi — ilan-merkezli kart listesi.
 *
 * GÖSTERGE TAHTASI DEĞİL, İLANLARIN KENDİSİ
 * -----------------------------------------
 * Önce sayı karoları, sonra "sıradaki iş" kutusu ve ayrı bir ilan listesi
 * vardı. İK'nın 2 saniyede görmek istediği şey tek: hangi ilanımda kim
 * bekliyor. Bu yüzden ekran ilan kartlarından ibaret; her kart kendi
 * yeni başvuranlarını taşıyor ve bir dokunuşla o adaylara gidiyor.
 *
 * GENEL VE İLANLAR TEK EKRAN OLDU (18 Eylül 2026)
 * -----------------------------------------------
 * Panelde "Genel" ve "İlanlar" diye iki sekme vardı ve ikisi de aynı
 * kartı çiziyordu; fark yalnız sağdaki yönetim eylemleriydi (Kapat /
 * Yayınla, arşivle-sil menüsü, inceleme notu). Tek kabuğa geçince
 * "Genel" sekmesi kalktı; yönetim eylemleri bu listeye taşındı ve
 * `onDurum` / `onKaldir` verildiğinde çiziliyor. Vermeyen çağıran
 * (örneğin salt okunur bir görünüm) yalnız Adaylar / Düzenle görür.
 *
 * BAŞLIK BURADA DEĞİL
 * -------------------
 * Sekmenin başlığı, ilan sayısı ve kademe pili sekme kabuğunda
 * (SirketPaneli → SirketIlanlarSekmesi): İlanlar ve Başvuranlar
 * görünümleri aynı başlığı paylaşıyor, iki kez yazılmasın.
 *
 * PROFİL UYARISI TEK SATIR, VE YALNIZ EKSİKSE
 * -------------------------------------------
 * Öğrenci ilana bakmadan önce şirket sayfasını görüyor; logosu,
 * açıklaması ya da sitesi olmayan şirket "bu gerçek mi" sorusunu
 * doğuruyor. Eksik yoksa satır HİÇ çizilmiyor — "profilin tamam" demek
 * için yer harcamıyoruz. Profil okunamadıysa da çizilmiyor: bilmediğimiz
 * bir eksik iddia edilmez.
 *
 * SAHTE SAYI YOK
 * --------------
 * Görüntülenme, dönüşüm, "bu hafta %12" yok — veri modelinde yok.
 * Karttaki her sayı `applications` satırlarından.
 */

/** Uyarılan üç alan: öğrencinin şirket sayfasında ilk gördükleri. */
const PROFIL_EKSIK_ADLARI: Partial<Record<keyof SirketProfilDegeri, string>> = {
  logoUrl: 'logo',
  description: 'açıklama',
  websiteUrl: 'web sitesi',
};

export function profilEksikleri(profil: SirketProfilDegeri | null): string[] {
  if (!profil) return [];
  return (Object.keys(PROFIL_EKSIK_ADLARI) as (keyof SirketProfilDegeri)[])
    .filter((alan) => !String(profil[alan] ?? '').trim())
    .map((alan) => PROFIL_EKSIK_ADLARI[alan] as string);
}

export const GenelBakis: React.FC<{
  baglam: SirketBaglami;
  ilanlar: Record<string, unknown>[];
  basvurular: AdayOzeti[];
  /** `null` = henüz okunmadı ya da okunamadı; uyarı satırı çizilmez. */
  profil: SirketProfilDegeri | null;
  onNavigate: (yol: string) => void;
  /** Kapat / Yayınla. Verilmezse düğme çizilmiyor. */
  onDurum?: (id: string, d: 'published' | 'closed') => Promise<void>;
  /** Arşivle ya da sil. Verilmezse taşma menüsü çizilmiyor. */
  onKaldir?: (id: string, arsivle: boolean) => Promise<void>;
  simdi?: Date;
}> = ({ baglam, ilanlar, basvurular, profil, onNavigate, onDurum, onKaldir, simdi }) => {
  const kartAcik = adayGorebilir(baglam.kademe);
  const eksikler = profilEksikleri(profil);

  /* Yanlışlıkla basmaya açık olmasın: kaldırma iki adımda. */
  const [kaldirilacak, setKaldirilacak] = React.useState<{
    id: string;
    baslik: string;
    basvuruSayisi: number;
    arsivlenecek: boolean;
  } | null>(null);
  const [kaldiriliyor, setKaldiriliyor] = React.useState(false);
  const [acikMenu, setAcikMenu] = React.useState<string | null>(null);
  const [kaldirmaHatasi, setKaldirmaHatasi] = React.useState('');

  /*
    0 İLAN: TEK KART, BAŞKA HİÇBİR ŞEY

    Profil uyarısı bile yok: ilanı olmayan şirketin ilk işi ilan açmak,
    ikinci işi değil.
  */
  if (ilanlar.length === 0) {
    return (
      <div className={`${KUTU} text-center`} style={kutuStil}>
        <h2 className="text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
          Henüz ilan yok
        </h2>
        <p
          className="mx-auto mt-1 max-w-md text-sm leading-relaxed"
          style={{ color: SIRKET_METIN_IKINCIL }}
        >
          İlk ilanı açmak iki dakika sürüyor: pozisyon, şehir, süre, ücret ve iş tanımı. İş
          tanımı için hazır şablon var.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/sirket/ilan/yeni')}
          className={`mx-auto mt-5 ${BIRINCIL_DUGME}`}
          style={{ ...birincilStil, minHeight: 56, paddingInline: 28, fontSize: 16 }}
        >
          <Plus className="h-5 w-5" aria-hidden />
          İlk ilanını aç
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {eksikler.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-2.5"
          style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">
            Profilde eksik: {eksikler.join(', ')}. Öğrenci ilana bakmadan önce şirket sayfanı
            görüyor.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/sirket/profil')}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-2 text-sm font-bold underline-offset-2 hover:underline ${SIRKET_ODAK}`}
            style={{ color: '#92400E' }}
          >
            Profili tamamla
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {ilanlar.map((ilan) => {
          const id = String(ilan.id);
          const yayinda = ilan.status === 'published';
          const taslakMi = ilan.status === 'draft';
          const platformdan = ilan.application_method === 'internal';
          const basvuruSayisi = Number(ilan.applicants_count ?? 0);
          /* Kural tek yerde ve test altında: lib/ilan-formu.mjs. */
          const eylem = ilanEylemleri(ilan);

          return (
            <IlanKarti
              key={id}
              ilan={ilan}
              basvurular={kartAcik ? basvurular.filter((b) => String(b.ilanId ?? '') === id) : null}
              onNavigate={onNavigate}
              simdi={simdi}
              /*
                BAŞVURU YOLU ETİKETİ YALNIZCA FARKLIYSA

                Buradan açılan her ilan StajımVar üzerinden başvuru
                alıyor; etiket yalnız AYKIRI durumda: toplama hattından
                gelen ilanda başvuru şirketin kendi sayfasında.
              */
              ekRozet={
                !platformdan ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
                  >
                    <Send className="h-3 w-3" aria-hidden />
                    Kariyer sayfasından
                  </span>
                ) : null
              }
              /*
                RET NOTU — ŞİRKET NEDENİ BURADA OKUYOR

                Ret ilanı taslağa düşürüyor ve notu zorunlu kılıyor.
                `truncate` YOK: tek satıra kısaltılan gerekçe işe
                yaramaz. Not yoksa satır hiç çizilmiyor.
              */
              altNot={
                taslakMi && ilan.review_note ? (
                  <p
                    className="mt-2 rounded-lg px-2 py-1.5 text-xs leading-relaxed"
                    style={{ background: SIRKET_ROZET, color: SIRKET_METIN }}
                  >
                    <strong>İnceleme notu:</strong> {String(ilan.review_note)}
                  </p>
                ) : null
              }
              ekEylemler={
                <>
                  {onDurum && (
                    <button
                      type="button"
                      onClick={() => void onDurum(id, yayinda ? 'closed' : 'published')}
                      className={IKINCIL_DUGME}
                      style={ikincilStil}
                    >
                      {eylem.durumEtiketi}
                    </button>
                  )}

                  {/*
                    ÜÇÜNCÜ EYLEM MENÜDE

                    Düzenle ve Yayınla/Kapat görünür kalıyor; seyrek ve
                    geri alınamaz olan kaldırma menüye giriyor.
                  */}
                  {onKaldir && eylem.kaldirilabilir && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setAcikMenu((m) => (m === id ? null : id))}
                        aria-label="Diğer işlemler"
                        aria-expanded={acikMenu === id}
                        className={`${IKINCIL_DUGME} min-w-11`}
                        /* Ölçüldü: yalnız `paddingInline: 10` ile genişlik 38 px'e
                           düşüyordu; dokunma hedefi 44×44 olmalı. */
                        style={{ ...ikincilStil, paddingInline: 10 }}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </button>

                      {acikMenu === id && (
                        <>
                          <span
                            className="fixed inset-0 z-10"
                            onClick={() => setAcikMenu(null)}
                            aria-hidden
                          />
                          <div
                            className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border shadow-lg"
                            style={kutuStil}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setAcikMenu(null);
                                setKaldirilacak({
                                  id,
                                  baslik: String(ilan.title ?? ''),
                                  basvuruSayisi,
                                  arsivlenecek: eylem.arsivlenecek,
                                });
                              }}
                              className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm font-bold hover:bg-gray-50"
                              style={{ color: SIRKET_METIN }}
                            >
                              {eylem.arsivlenecek ? (
                                <Archive className="h-4 w-4" aria-hidden />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden />
                              )}
                              {eylem.arsivlenecek ? 'Arşivle' : 'Sil'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              }
            />
          );
        })}
        <YeniIlanKarti onNavigate={onNavigate} />
      </ul>

      {/*
        ONAY — GERÇEK DAVRANIŞI SÖYLÜYOR

        İki ayrı sonuç var ve metin hangisi olduğunu yazıyor: başvurusu
        olan ilan arşivleniyor (veri duruyor), olmayan ilan gerçekten
        siliniyor (geri alınamıyor). "Emin misiniz?" deyip ne olacağını
        söylememek, kullanıcıyı kendi verisi hakkında karanlıkta bırakır.
      */}
      {kaldirilacak && onKaldir && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ilan-kaldir-baslik"
          onClick={() => !kaldiriliyor && setKaldirilacak(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5"
            style={kutuStil}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ilan-kaldir-baslik" className="font-black" style={{ color: SIRKET_METIN }}>
              {kaldirilacak.arsivlenecek ? 'İlanı arşivle' : 'İlanı sil'}
            </h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
              <b style={{ color: SIRKET_METIN }}>{kaldirilacak.baslik}</b>{' '}
              {kaldirilacak.arsivlenecek ? (
                <>
                  ilanına {kaldirilacak.basvuruSayisi} başvuru gelmiş. İlan listenizden
                  kalkacak ama <b style={{ color: SIRKET_METIN }}>başvurular korunacak</b> —
                  adayların kendi başvuru geçmişi de olduğu gibi kalıyor.
                </>
              ) : (
                <>
                  ilanı kalıcı olarak silinecek. Bu ilana hiç başvuru gelmemiş, bu yüzden
                  kaybolacak başka bir kayıt yok. <b style={{ color: SIRKET_METIN }}>Bu işlem
                  geri alınamaz.</b>
                </>
              )}
            </p>

            {kaldirmaHatasi && (
              <p className="mt-3 text-sm font-semibold text-rose-700">{kaldirmaHatasi}</p>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setKaldirilacak(null)}
                disabled={kaldiriliyor}
                className={IKINCIL_DUGME}
                style={ikincilStil}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  setKaldiriliyor(true);
                  setKaldirmaHatasi('');
                  void onKaldir(kaldirilacak.id, kaldirilacak.arsivlenecek)
                    .then(() => setKaldirilacak(null))
                    .catch((e: unknown) =>
                      setKaldirmaHatasi(e instanceof Error ? e.message : 'İşlem tamamlanamadı.')
                    )
                    .finally(() => setKaldiriliyor(false));
                }}
                disabled={kaldiriliyor}
                className={BIRINCIL_DUGME}
                style={birincilStil}
              >
                {kaldiriliyor
                  ? 'Uygulanıyor…'
                  : kaldirilacak.arsivlenecek
                    ? 'Arşivle'
                    : 'Kalıcı olarak sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
