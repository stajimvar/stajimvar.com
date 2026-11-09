import React, { useRef, useState } from 'react';
import { X, ExternalLink, ShieldCheck, AlertTriangle, Loader2, Info, Building2, ArrowRight } from 'lucide-react';
import type { InternshipListing } from '../types';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
import { useModalErisim } from '../lib/modal-erisim';

/**
 * StajımVar üzerinden başvuru.
 *
 * En kritik nokta dürüstlük: başvuru şirkete iletilmiyorsa bu diyalog bunu
 * açıkça söylüyor. Öğrenci "başvurdum" sanıp beklerse stajı kaçırır —
 * sitenin yapabileceği en kötü hata bu.
 *
 * Ne olduğunun kararı burada verilmiyor, lib/basvuru-yolu.mjs'ten geliyor;
 * kart, ilan detayı ve bu diyalog aynı cümleyi kuruyor.
 *
 * Açık rıza yalnızca gerçekten aktarım yapılan yöntemlerde isteniyor.
 * Aktarım yokken onay kutusu göstermek, olmayan bir veri aktarımına rıza
 * toplamak olurdu.
 */

interface ApplyDialogProps {
  listing: InternshipListing;
  /** Zaten başvurulmuşsa diyalog yalnızca durumu gösterir. */
  alreadyApplied: boolean;
  onClose: () => void;
  /**
   * `paylasimIzni`: öğrencinin AYRI ve isteğe bağlı paylaşım izni
   * (20261121010000). Yalnız kutu gösterildiyse ve işaretlendiyse true;
   * başvuru oluşturulduktan sonra `basvuruPaylasimIzni` ile yazılıyor.
   */
  onSubmit: (consent: boolean, paylasimIzni: boolean) => Promise<void>;
  /**
   * CV'si olmayan öğrenci için ikincil seçenek. Yalnız şirket sitesinden
   * başvurulan ilanda çiziliyor; birincil eylem yine "Şirket sayfasında
   * başvur". Şirketin CV isteyip istemediği bilinmediği için öyle bir iddia
   * yazılmıyor.
   */
  onCvOlustur?: () => void;
  /*
    BAŞVURU ÖNCESİ İLETİŞİM KONTROLÜ (sade akış)

    Öğrenci neyin paylaşılacağını GÖRMEDEN onay vermemeli. Burada
    gösterilen değerler gerçek profil değerleri; diyalog bunları
    uydurmuyor ve değiştirmiyor.
  */
  paylasilacak?: { ad: string; eposta: string; telefon: string };
  /*
    Telefon eksikse aynı ekranda tamamlanıyor. SMS DOĞRULAMASI YOK —
    bu sürüme eklenmiyor; "doğrulanmış numara" iddiası da hiçbir yerde
    yazmıyor.
  */
  onTelefonKaydet?: (telefon: string) => Promise<void>;
}

export const ApplyDialog: React.FC<ApplyDialogProps> = ({
  listing,
  alreadyApplied,
  onClose,
  onSubmit,
  paylasilacak,
  onTelefonKaydet,
  onCvOlustur,
}) => {
  const [consent, setConsent] = useState(false);
  /*
    PAYLAŞIM İZNİ — AYRI, İSTEĞE BAĞLI, VARSAYILANI KAPALI

    KVKK rızası "profilimin ve iletişim bilgilerimin" paylaşılmasını
    kapsıyor; sosyal paylaşımları ve görselleri SAYMIYOR. Onları rızanın
    içine katmak, öğrencinin onaylamadığı bir şeyi onaylamış sayılması
    olurdu. Bu yüzden ikinci, ayrı bir kutu ve başvuru onu beklemiyor.
  */
  const [paylasimIzni, setPaylasimIzni] = useState(false);
  /* Telefon eksikse aynı ekranda tamamlanıyor; profil sayfasına gitmeye gerek yok. */
  const [telefon, setTelefon] = useState(paylasilacak?.telefon ?? '');
  const [telefonTaslak, setTelefonTaslak] = useState('');
  const [telefonKaydediliyor, setTelefonKaydediliyor] = useState(false);
  const [telefonHatasi, setTelefonHatasi] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yol = basvuruYolu(listing);
  const rizaGerekli = yol.teslimEdiliyor;
  /*
    Kutu yalnız StajımVar üzerinden alınan (`internal`) başvuruda. Sunucu
    izni yalnız o yöntemde yazıyor (`basvuru_paylasim_izni`): e-postayla
    iletilen başvuruda şirketin paneli yok, orada izin istemek olmayan bir
    görüntülemeye onay toplamak olurdu.
  */
  const paylasimKutusu = rizaGerekli && listing.applicationMethod === 'internal';

  /* Odak yönetimi, ESC, focus trap ve arka plan kilidi. */
  const kutuRef = useModalErisim<HTMLDivElement>(true, onClose);

  /*
    ÇİFT GÖNDERİM KİLİDİ REF'TE

    `busy` düğmeyi kapatıyor ama durum güncellemesi ancak bir sonraki
    çizimde DOM'a yansıyor. Aynı olay döngüsüne düşen iki tıklama (çift
    tıklama, dokunmatikte titreyen parmak) yeniden çizimden önce iki kez
    `onSubmit` çağırabiliyor. Ref eşzamanlı okunuyor ve yazılıyor; ikinci
    çağrı kilidi görüp dönüyor. Sunucu `(listing_id, student_id)` tekil
    kısıtıyla ikinci kaydı zaten reddediyor; kilit, öğrencinin başarılı
    başvurusunun ardından bir de "zaten başvurdunuz" hatası görmesini
    önlüyor.
  */
  const gonderiliyorRef = useRef(false);

  const handleSubmit = async () => {
    if (gonderiliyorRef.current) return;
    gonderiliyorRef.current = true;
    setError(null);
    setBusy(true);
    try {
      await onSubmit(consent, paylasimKutusu && paylasimIzni);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Başvuru gönderilemedi.');
    } finally {
      gonderiliyorRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        ref={kutuRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="basvuru-diyalog-basligi"
        className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border border-gray-200 shadow-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/*
          YENİ GÖRÜNÜM (9 Kasım 2026, kullanıcının ürettiği tasarım): başlık
          ve alt şerit sabit, yalnız gövde kayıyor — "Başvuruyu Tamamla"
          düğmesi kaydırmadan görünüyor. Adımlar çizgiyle bağlı, paylaşılacak
          bilgiler mavi kutuda. Metinler ve kurallar değişmedi.
        */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            <p className="text-sm font-bold text-blue-600">
              {listing.companyName}
            </p>
            <h2 id="basvuru-diyalog-basligi" className="text-xl font-extrabold text-gray-900 leading-snug">
              {listing.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 space-y-5">
          {alreadyApplied ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <p className="text-sm font-bold text-emerald-900">
                {rizaGerekli
                  ? 'Bu ilana zaten başvurdun.'
                  : 'Bu ilanı zaten işaretlemiştin.'}
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {rizaGerekli
                  ? 'Başvurun başvuru listende; durumu değiştiğinde orada görürsün.'
                  : 'Kayıt başvuru listende duruyor. Bu kayıt şirkete gönderilmedi; resmî sayfadan başvurmadıysan aşağıdaki bağlantıyı kullan.'}
              </p>
            </div>
          ) : (
            <>
              {/* Ne olacağını adım adım söyle. */}
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-base font-extrabold text-gray-900">
                  <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Info className="h-4 w-4" />
                  </span>
                  {rizaGerekli ? 'Başvurunca ne olacak?' : 'İşaretleyince ne olacak?'}
                </p>
                <ol className="text-sm text-gray-700">
                  {[
                    rizaGerekli
                      ? "Başvurun StajımVar'a kaydedilir ve panelinden takip edebilirsin."
                      : 'Bu ilan panelindeki başvuru listene eklenir; hangi ilana başvurduğunu takip edebilirsin.',
                    rizaGerekli
                      ? 'Profilin ve iletişim bilgilerin, şirketin doğrulanmış başvuru kanalına iletilir.'
                      : 'Bilgilerin şirkete iletilmez ve şirketle paylaşılmaz.',
                    rizaGerekli
                      ? 'Şirketin cevabı geldiğinde başvurunun durumu panelinde güncellenir.'
                      : 'Gerçek başvuru şirketin kendi sayfasından yapılır — aşağıdaki bağlantı oraya götürür.',
                  ].map((metin, sira, liste) => (
                    <li key={sira} className="relative flex gap-3 pb-3 last:pb-0">
                      {/* Adımları bağlayan çizgi; son adımda yok. */}
                      {sira < liste.length - 1 && (
                        <span aria-hidden className="absolute left-3 top-7 bottom-0 w-px -translate-x-1/2 bg-blue-200" />
                      )}
                      <span className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {sira + 1}
                      </span>
                      <span className="pt-0.5 leading-relaxed">{metin}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {!rizaGerekli && (
                /*
                  Bu uyarı olmazsa öğrenci başvurusunun şirkete ulaştığını sanır.
                  Ulaşmıyor: doğrulanmış bir başvuru kanalı yok.
                */
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-amber-900">
                      Bu kayıt şirkete başvuru göndermez.
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {yol.ozet} Stajı kaçırmamak için{' '}
                      <strong>resmî sayfadan başvurmayı unutma</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/*
                PAYLAŞILACAK BİLGİLER — ONAYDAN ÖNCE, AÇIKÇA

                Öğrenci neyin gideceğini görmeden onay vermemeli. Burada
                yazan değerler gerçek profil değerleri; uydurulmuyor.
              */}
              {rizaGerekli && paylasilacak && (
                <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <span aria-hidden className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-xs sm:flex">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    {listing.companyName} ile paylaşılacak bilgiler
                  </p>
                  <dl className="mt-2 space-y-1 text-sm text-gray-700">
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-gray-500">Ad</dt>
                      <dd className="font-semibold break-words">{paylasilacak.ad || '—'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-gray-500">E-posta</dt>
                      <dd className="font-semibold break-all">{paylasilacak.eposta || '—'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-gray-500">Telefon</dt>
                      <dd className="font-semibold break-words">
                        {telefon ? telefon : <span className="font-normal text-gray-500">eklenmedi</span>}
                      </dd>
                    </div>
                  </dl>

                  {/*
                    TELEFON ZORUNLU DEĞİL. Eksikse burada tamamlanabiliyor
                    ama başvuru onu beklemiyor: numarası olmayan öğrenciyi
                    başvurudan alıkoymak, olmayan bir şartı dayatmak olurdu.
                    Şirket de boş telefonu boş görüyor.
                  */}
                  {!telefon && onTelefonKaydet && (
                    <div className="mt-2.5">
                      <label className="block text-[11px] font-semibold text-gray-600">
                        Telefon eklemek ister misin? (isteğe bağlı)
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="05XX XXX XX XX"
                          value={telefonTaslak}
                          onChange={(e) => setTelefonTaslak(e.target.value)}
                          className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-2.5 text-sm"
                        />
                        <button
                          type="button"
                          disabled={!telefonTaslak.trim() || telefonKaydediliyor}
                          onClick={async () => {
                            setTelefonHatasi(null);
                            setTelefonKaydediliyor(true);
                            try {
                              await onTelefonKaydet(telefonTaslak.trim());
                              setTelefon(telefonTaslak.trim());
                            } catch {
                              setTelefonHatasi('Numara kaydedilemedi. Yeniden dene.');
                            } finally {
                              setTelefonKaydediliyor(false);
                            }
                          }}
                          className="min-h-11 cursor-pointer rounded-xl bg-blue-600 px-3 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {telefonKaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
                        </button>
                      </div>
                      {telefonHatasi && (
                        <p role="alert" className="mt-1 text-[11px] font-semibold text-red-700">
                          {telefonHatasi}
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )}

              {/* KVKK açık rızası — yalnızca gerçekten aktarım yapılıyorsa */}
              {rizaGerekli && (
              <label className="flex gap-3 items-start cursor-pointer rounded-2xl border border-gray-200 p-4 hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-blue-600 shrink-0"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  {/*
                    METİN NE PAYLAŞILDIĞINI VE KİMİNLE PAYLAŞILDIĞINI
                    AÇIKÇA SÖYLÜYOR: "iletişim bilgilerim" yerine
                    telefon ve e-posta ayrı ayrı yazıyor, şirketin adı
                    cümlenin içinde. Öğrenci neye onay verdiğini
                    okumadan işaretlememeli.
                  */}
                  Profilimin, <strong>telefon numaramın ve e-posta adresimin</strong>{' '}
                  <strong>{listing.companyName}</strong> ile paylaşılmasına izin veriyorum.
                  Bu bilgiler yalnızca bu şirketin doğrulanmış yetkililerine açılır,
                  herkese açık profilimde görünmez ve başka şirketlerle paylaşılmaz.{' '}
                  <a
                    href="/kvkk-aydinlatma-metni"
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Aydınlatma metni
                  </a>
                </span>
              </label>
              )}

              {/*
                Ayrı kutu, KVKK kutusunun ALTINDA. İşaretlenmeden de başvuru
                gönderiliyor; gönder düğmesinin `disabled` koşulu yalnız
                KVKK rızasına bakıyor.
              */}
              {paylasimKutusu && (
              <label className="flex gap-3 items-start cursor-pointer rounded-2xl border border-gray-200 p-4 hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={paylasimIzni}
                  onChange={(e) => setPaylasimIzni(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-blue-600 shrink-0"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  Profilimdeki paylaşımlarımın ve görsellerimin bu başvuru kapsamında{' '}
                  {listing.companyName} tarafından görülmesine izin veriyorum (isteğe bağlı,
                  istediğin zaman geri alabilirsin).
                </span>
              </label>
              )}

              {error && (
                <p role="alert" aria-live="assertive" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-gray-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
          {rizaGerekli && !alreadyApplied && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-gray-100 px-6 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
            >
              İptal
            </button>
          )}
          {yol.resmiAdres && (
            <a
              href={yol.resmiAdres}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={`inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold transition-colors ${
                rizaGerekli
                  ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  : 'flex-1 text-white bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {rizaGerekli ? 'İlana git' : 'Şirket sayfasında başvur'}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {!alreadyApplied && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={(rizaGerekli && !consent) || busy}
              className={`inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full px-6 text-sm font-bold transition-colors disabled:bg-gray-300 disabled:text-white disabled:cursor-not-allowed ${
                rizaGerekli
                  ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-sm'
                  : 'flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Kaydediliyor
                </>
              ) : (
                rizaGerekli ? (
                  <>
                    Başvuruyu Tamamla
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Başvurduğumu işaretle
                  </>
                )
              )}
            </button>
          )}
        </div>
        {!rizaGerekli && onCvOlustur && (
          <p className="px-5 pb-5 text-center text-xs text-gray-600 sm:px-6 sm:pb-6">
            <button
              type="button"
              onClick={onCvOlustur}
              className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              CV’ye ihtiyacın varsa oluştur
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
