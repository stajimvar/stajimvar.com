import React from 'react';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI, RENK_UYARI } from '../../lib/renk-token';
import {
  SosyalHata,
  bolumTalebiAc,
  bolumTalebimiGetir,
  type BolumTalebi as TalepKaydi,
  type SosyalBolum,
} from '../../lib/queries/sosyal';
import { tarihMetni } from '../../lib/tarih.mjs';
import { AciklamaAlani, KayitHatasi, MetinAlani } from './SosyalFormAlanlari';

/**
 * BÖLÜM / EŞLEME TALEBİ — İKİ AYRI DURUM, İKİ AYRI CÜMLE
 *
 * Kullanıcı iki farklı sebeple buraya düşüyor ve ikisinin çözümü farklı:
 *
 *   bolum-yok       katalogda böyle bir bölüm yok. Yöneticinin yapacağı
 *                   iş kataloğa bölüm eklemek; bu yüzden kullanıcıdan
 *                   bölümünün adı ve üniversitesi isteniyor.
 *   alan-tanimsiz   bölüm katalogda VAR ama hangi alan topluluğuna
 *                   bağlanacağı tanımlı değil. Yöneticinin işi eşleme
 *                   eklemek; bölüm zaten belli, serbest metin sorulmuyor.
 *
 * Tek cümleye indirmek, yöneticiye de kullanıcıya da yanlış işi
 * anlattırırdı.
 *
 * TALEP AÇMAK ERİŞİM VERMİYOR
 * ---------------------------
 * `sosyal_gorunur` yalnız alanı olan ve topluluğa katılmış profillere
 * bakıyor; talep satırı bu koşulu değiştirmiyor. Bu yüzden gönderimden
 * sonra ekranda tek bir şey yazıyor: talebin sırada olduğu. Ne bir süre
 * sözü var ne de sonucun olumlu olacağı iması — ikisi de tutulacağı
 * bilinmeyen sözler olurdu.
 *
 * KARAR AÇIKLAMASI KULLANICININ KENDİ SATIRINDAN
 * ---------------------------------------------
 * Talep karara bağlandığında yönetici İKİ metin yazıyor: denetim
 * kaydına giden iç gerekçe ve kullanıcıya gösterilecek açıklama.
 * Bu ekran yalnız ikincisini okuyor ve o da kullanıcının kendi
 * `department_requests` satırından geliyor (RLS: `user_id = auth.uid()`).
 * Denetim tablosuna hiçbir sorgu atılmıyor; başka bir talep, yöneticinin
 * adı ya da iç not hiçbir yerde çizilmiyor.
 *
 * "DOĞRULANMIŞ ÖĞRENCİ" DİYE BİR ŞEY YOK
 * --------------------------------------
 * Bölüm bilgisi bu sürümde beyan. Okul e-postası ya da öğrenci belgesi
 * kontrolü hiçbir yerde yok; onu ima eden tek kelime bile karşılığı
 * olmayan bir güven satardı.
 */

export type TalepKipi = 'bolum-yok' | 'alan-tanimsiz';

interface TalepProps {
  kip: TalepKipi;
  kullaniciId: string;
  /** `alan-tanimsiz` kipinde kullanıcının seçtiği katalog bölümü. */
  bolum: SosyalBolum | null;
  /** Kurulum ekranına dönüş; talep bir çıkmaz sokak değil. */
  onGeri: () => void;
}

type Durum = 'yukleniyor' | 'form' | 'gonderiliyor' | 'gonderildi' | 'hata';

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';
const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

/**
 * Kullanıcının kendi talebinin durumu — olduğu gibi, süslenmeden.
 *
 * Bu cümleler her zaman yazılıyor. Yöneticinin yazdığı karar açıklaması
 * varsa ONUN YERİNE değil, ALTINA ayrı bir satır olarak geliyor: durum
 * ('reddedildi') ile sebep ayrı iki bilgi ve sebep her satırda yok.
 */
const DURUM_CUMLESI: Record<string, string> = {
  bekliyor: 'Talebin sırada. Karara bağlanana kadar bekliyor.',
  incelendi: 'Talebin incelendi. Sonuç henüz bir bölüm ya da eşleme olarak yazılmadı.',
  reddedildi: 'Talebin reddedildi.',
  eklendi: 'Talebin kabul edildi. Kurulum ekranına dönüp bölümünü seçebilirsin.',
};

export const BolumTalebi: React.FC<TalepProps> = ({ kip, kullaniciId, bolum, onGeri }) => {
  const [durum, setDurum] = React.useState<Durum>('yukleniyor');
  const [mevcut, setMevcut] = React.useState<TalepKaydi | null>(null);
  const [deneme, setDeneme] = React.useState(0);

  const [yazilanBolum, setYazilanBolum] = React.useState('');
  const [universite, setUniversite] = React.useState('');
  const [aciklama, setAciklama] = React.useState('');
  const [gonderildi, setGonderildi] = React.useState(false);
  const [kayitHatasi, setKayitHatasi] = React.useState<string | null>(null);

  React.useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    bolumTalebimiGetir(kullaniciId)
      .then((kayit) => {
        if (iptal) return;
        setMevcut(kayit);
        /* Açık talep varsa ikinci bir form çizilmiyor: tekil indeks zaten reddederdi. */
        setDurum(kayit?.durum === 'bekliyor' ? 'gonderildi' : 'form');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [kullaniciId, deneme]);

  const adHatasi =
    kip === 'bolum-yok' && yazilanBolum.trim().length < 2
      ? 'Bölümünün adını yaz (en az 2 karakter).'
      : null;

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    setGonderildi(true);
    setKayitHatasi(null);
    if (adHatasi || durum === 'gonderiliyor') return;

    setDurum('gonderiliyor');
    try {
      await bolumTalebiAc(kullaniciId, {
        bolumId: kip === 'alan-tanimsiz' ? (bolum?.id ?? null) : null,
        yazilanBolum: kip === 'bolum-yok' ? yazilanBolum : null,
        universite,
        aciklama,
      });
      /*
        Ekrandaki durum ancak sunucu yazmayı kabul ettikten SONRA
        değişiyor. Tersi olsaydı başarısız bir istekte kullanıcı talebini
        gönderdiğini sanırdı.
      */
      setDeneme((sayi) => sayi + 1);
    } catch (sorun) {
      setKayitHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'Talep gönderilemedi. Bağlantını kontrol edip yeniden dene.',
      );
      setDurum('form');
    }
  };

  const baslik =
    kip === 'bolum-yok'
      ? 'Bölümün listede yok'
      : 'Bölümün için alan topluluğu henüz tanımlı değil';

  const aciklamaMetni =
    kip === 'bolum-yok'
      ? 'Katalog Türkiye’deki bütün bölümleri kapsamıyor. Bölümünü yazarsan yönetim kuyruğuna düşer; kataloğa eklenip eklenmeyeceğine orada karar verilir.'
      : 'Bu bölüm katalogda var ama hangi alan topluluğuna bağlanacağı henüz tanımlı değil. Eşleme tanımlanmadan bu bölümle topluluğa katılım açılmıyor.';

  return (
    <div className="space-y-4">
      <header className="space-y-1.5">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          {baslik}
        </h1>
        <p className="text-sm leading-relaxed text-gray-600">{aciklamaMetni}</p>
      </header>

      {kip === 'alan-tanimsiz' && bolum && (
        <p className={`${KART} text-sm text-gray-700`}>
          <span className="font-bold text-gray-900">Seçtiğin bölüm:</span>{' '}
          <span className="break-words">{bolum.ad}</span>
        </p>
      )}

      {durum === 'yukleniyor' && (
        <div aria-busy="true" className={`${KART} space-y-2`}>
          <div aria-hidden className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          <div aria-hidden className="h-11 w-full animate-pulse rounded-xl bg-gray-100" />
        </div>
      )}

      {durum === 'hata' && (
        <div role="alert" className={`${KART} space-y-2`}>
          <p className="text-sm font-bold text-gray-900">Talep durumu alınamadı.</p>
          <p className="text-sm text-gray-600">
            Sunucudan cevap gelmedi. Daha önce gönderdiğin bir talep varsa etkilenmedi.
          </p>
          <button type="button" onClick={() => setDeneme((sayi) => sayi + 1)} className={IKINCIL}>
            Yeniden dene
          </button>
        </div>
      )}

      {durum === 'gonderildi' && mevcut && (
        <div
          role="status"
          className={`space-y-2 rounded-xl border p-2.5 ${RENK_UYARI.kenar} ${RENK_UYARI.yumusakZemin} ${RENK_UYARI.metin}`}
        >
          <p className="text-sm font-bold">{DURUM_CUMLESI[mevcut.durum] ?? 'Talebin kayıtlı.'}</p>
          <p className="text-xs leading-relaxed">
            Talep açmak alan topluluğuna erişim vermiyor; erişim ancak bölümünün alanı
            tanımlandığında ve topluluğa katılmayı seçtiğinde açılıyor.
          </p>
          {tarihMetni(mevcut.olusturmaAni) && (
            <p className="text-xs">Gönderildiği tarih: {tarihMetni(mevcut.olusturmaAni)}</p>
          )}
        </div>
      )}

      {(durum === 'form' || durum === 'gonderiliyor') && (
        <form onSubmit={gonder} className="space-y-4" noValidate>
          <div className={`${KART} space-y-3`}>
            {kip === 'bolum-yok' && (
              <MetinAlani
                kimlik="bolum-talebi-ad"
                etiket="Bölümünün adı"
                gerekli
                deger={yazilanBolum}
                onDegis={setYazilanBolum}
                enFazla={120}
                yardim="Diplomanda yazdığı gibi yaz. Yazdığın metin doğrudan kataloğa eklenmiyor; yönetim okuyup karar veriyor."
                hata={gonderildi ? adHatasi : null}
              />
            )}
            <MetinAlani
              kimlik="bolum-talebi-universite"
              etiket="Üniversite"
              deger={universite}
              onDegis={setUniversite}
              enFazla={120}
            />
            <AciklamaAlani
              kimlik="bolum-talebi-aciklama"
              etiket="Açıklama"
              deger={aciklama}
              onDegis={setAciklama}
              enFazla={500}
              yardim="Bölümünün hangi işlere hazırladığını yazarsan eşleme kararı kolaylaşır."
            />
          </div>

          {/*
            KARARLANMIŞ TALEP BU DALA DÜŞÜYOR

            Yukarıdaki `gonderildi` bloğu yalnız `bekliyor` durumunda
            çiziliyor; reddedilen ya da kabul edilen talep formla birlikte
            burada görünüyor. Yöneticinin karar açıklaması da bu yüzden
            burada: kullanıcının sonucu okuduğu tek yer burası.
          */}
          {mevcut && mevcut.durum !== 'bekliyor' && (
            <div role="status" className="space-y-1 text-sm text-gray-600">
              <p>Önceki talebin: {DURUM_CUMLESI[mevcut.durum] ?? 'kayıtlı.'}</p>
              {/*
                AÇIKLAMA YOKSA SEBEP HİÇ ANILMIYOR

                Kolon eski satırlarda NULL ve göç uydurma cümle yazmadı.
                "Sebep belirtilmedi" gibi bir satır da uydurma sayılırdı:
                sebebin bir yerde durduğunu ima eder, oysa yok. Yalnız
                durum yazılıyor.

                Metni yönetici yazıyor; `whitespace-pre-line` satır
                sonlarını koruyor, `break-words` ise boşluksuz uzun bir
                dizenin kutudan taşmasını engelliyor.
              */}
              {mevcut.kararAciklamasi && (
                <p className="whitespace-pre-line break-words leading-relaxed text-gray-800">
                  <span className="font-semibold text-gray-900">Yönetimin açıklaması:</span>{' '}
                  {mevcut.kararAciklamasi}
                </p>
              )}
            </div>
          )}

          {kayitHatasi && <KayitHatasi mesaj={kayitHatasi} />}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={durum === 'gonderiliyor'}
              className={BIRINCIL_EYLEM}
            >
              {durum === 'gonderiliyor' ? 'Gönderiliyor…' : 'Talebi gönder'}
            </button>
            <button type="button" onClick={onGeri} className={IKINCIL}>
              Bölüm seçimine dön
            </button>
          </div>
        </form>
      )}

      {durum === 'gonderildi' && (
        <button type="button" onClick={onGeri} className={IKINCIL}>
          Bölüm seçimine dön
        </button>
      )}
    </div>
  );
};
