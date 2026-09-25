import React from 'react';
import { baglantiEtiketi, programDurumMetni } from '../lib/isveren-dizini.mjs';
import { Building2, FileText, Mail, RotateCcw, Search, Sparkles, X } from 'lucide-react';

/**
 * Sıfır sonuç ekranı.
 *
 * NEDEN YENİDEN YAZILDI
 * ---------------------
 * Önce tek bir "Filtreleri Temizle" düğmesi vardı. Öğrenci aradığını
 * bulamadığında elinde tek seçenek aramayı silmek oluyordu; yani site onu
 * çıkmaz sokakta bırakıyordu. Oysa aynı anda gösterilebilecek gerçek
 * şeyler var: aynı kelimeyle eşleşen burslar, hangi filtrenin listeyi
 * daralttığı, ilan açmamış şirkete nasıl yazılacağı.
 *
 * KURAL
 * -----
 * Kullanıcı burada hiçbir zaman yalnızca "temizle" ile bırakılmıyor: en az
 * bir alternatif fırsat ya da uygulanabilir bir sonraki adım görüyor.
 *
 * ARAMA VE FİLTRELER KAYBOLMUYOR
 * ------------------------------
 * Üstte ne aradığı ve hangi filtrelerin açık olduğu yazılı duruyor. Aksi
 * hâlde dört öneri arasında "ben ne aramıştım" sorusu doğuyor ve öneriler
 * bağlamsız görünüyor.
 *
 * BİLDİRİM DÜĞMESİ YOK
 * --------------------
 * "Bu arama için bildirim kur" buraya çok yakışıyor ama bildirim sistemi
 * henüz yok. Çalışmayan bir düğme, hiç olmayan düğmeden kötü: kullanıcı
 * kurduğunu sanıp bekler. Sistem geldiğinde eklenecek.
 */

export type AktifSuzgec = {
  /** Kullanıcının gördüğü ad: "Şehir: Ankara" gibi. */
  etiket: string;
  /** Yalnızca bu filtreyi kaldırır. */
  kaldir: () => void;
  /** Bu filtre kaldırılsa kaç ilan görünürdü. */
  kazanc?: number;
};

/**
 * `lib/isveren-dizini` çıktısı — DİZİN SAYFASIYLA AYNI BİÇİM.
 *
 * Eskiden `lib/bos-sonuc-isverenler` vardı ve `durum` alanını her
 * kayıtta sabit `'bilinmiyor'` yazıyordu: boş sonuç ekranı dizin
 * sayfasından FARKLI bir durum hesabı gösteriyordu. O modül kaldırıldı;
 * durum artık ölçümden geliyor ve `null` = hiç kontrol edilmedi.
 */
export type BosSonucIsveren = {
  slug: string;
  isveren: string;
  sektor: string;
  kariyerUrl: string;
  programDurumu: 'acik' | 'kapali' | 'bilinmiyor' | null;
  programUrl: string | null;
  urlDurumu: 'calisiyor' | 'gecici_hata' | 'bozuk' | null;
};

type SonucYokProps = {
  aramaTerimi: string;
  suzgecler: AktifSuzgec[];
  /**
   * Seçili ÜLKE VE BÖLÜME gerçekten uyan işverenler.
   *
   * Boş dizi gelirse blok HİÇ çizilmiyor: uymayan öneri, filtreyi yok
   * saymaktan başka bir şey değil.
   */
  isverenler?: BosSonucIsveren[];
  /** Aynı kelimeyle eşleşen burs/fırsat sayısı; null ise henüz sayılıyor. */
  firsatSayisi: number | null;
  onFirsatlaraGit: () => void;
  onTumunuTemizle: () => void;
  onIsverenlereGit: () => void;
  onRehbereGit: () => void;
  onSablonAc: () => void;
};

const Eylem: React.FC<{
  ikon: React.ReactNode;
  baslik: string;
  aciklama: string;
  onClick: () => void;
}> = ({ ikon, baslik, aciklama, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left cursor-pointer"
  >
    <span className="shrink-0 mt-0.5 text-blue-600">{ikon}</span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-gray-900">{baslik}</span>
      <span className="block text-xs text-gray-500 leading-relaxed">{aciklama}</span>
    </span>
  </button>
);

export const SonucYok: React.FC<SonucYokProps> = ({
  aramaTerimi,
  suzgecler,
  isverenler = [],
  firsatSayisi,
  onFirsatlaraGit,
  onTumunuTemizle,
  onIsverenlereGit,
  onRehbereGit,
  onSablonAc,
}) => {
  /*
    Listeyi en çok daraltan filtre: kaldırıldığında en çok ilan açan.
    Kullanıcıya "hangisini kaldırayım" sorusunu tahmin ettirmiyoruz.
  */
  const filtreVar = Boolean(aramaTerimi) || suzgecler.length > 0;
  const daraltan = suzgecler
    .filter((s) => (s.kazanc ?? 0) > 0)
    .sort((a, b) => (b.kazanc ?? 0) - (a.kazanc ?? 0))[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-5">
      <div className="space-y-2">
        {/*
          1. ADIM — NE OLDUĞUNU SÖYLE

          "Bu aramada staj ilanı yok" belirsizdi: hangi arama, ve "yok"
          kalıcı mı? Cümle artık filtreye ve AÇIK ilana atıf yapıyor.
        */}
        {/*
          FİLTRE YOKKEN FİLTREYİ SUÇLAMA (A paketi, 26 Eylül 2026): arama
          ve süzgeç yoksa liste katalog yüzünden boş; cümle bunu söylüyor.
        */}
        {filtreVar ? (
          <>
            <p className="text-base font-bold text-gray-900">Bu filtrelere uygun ilan bulunamadı.</p>
            <p className="text-sm leading-relaxed text-gray-600">
              Filtrelerini genişletebilir veya ilan açmayan şirketlere nasıl yazabileceğini öğrenebilirsin.
            </p>
          </>
        ) : (
          <>
            <p className="text-base font-bold text-gray-900">Şu an listelenecek açık ilan yok.</p>
            <p className="text-sm leading-relaxed text-gray-600">
              İlan açmayan şirketlere nasıl yazabileceğini öğrenebilirsin.
            </p>
          </>
        )}

        {(aramaTerimi || suzgecler.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {aramaTerimi && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-semibold">
                <Search className="w-3 h-3" />
                {aramaTerimi}
              </span>
            )}
            {suzgecler.map((s) => (
              <button
                key={s.etiket}
                type="button"
                onClick={s.kaldir}
                title="Bu filtreyi kaldır"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
              >
                {s.etiket}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/*
        FIRSATLAR BURADAN KALKTI — EN ALTA, KÜÇÜK VE İKİNCİL

        Burada dolgulu düğmeli büyük bir mavi kutuydu ve boş staj
        listesinin ANA SONUCU gibi duruyordu. Öğrenci staj arıyor;
        burs listesi bir alternatif, cevabın kendisi değil.
      */}

      {/* 2. ADIM — Hangi filtre daralttı: tahmin değil, ölçülmüş kazanç. */}
      {daraltan && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-800">
            <strong>{daraltan.etiket}</strong> filtresi {daraltan.kazanc} ilanı gizliyor.
          </span>
          <button
            type="button"
            onClick={daraltan.kaldir}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors cursor-pointer"
          >
            Bu filtreyi kaldır
          </button>
        </div>
      )}

      {/* 2. ADIM (devamı) — filtreleri temizle; temizlenecek bir şey yoksa yok. */}
      {filtreVar && (
        <Eylem
          ikon={<RotateCcw className="w-4 h-4" />}
          baslik="Filtreleri temizle"
          aciklama="Arama ve tüm filtreler sıfırlanır, bütün ilanlar listelenir."
          onClick={onTumunuTemizle}
        />
      )}

      {/*
        3. ADIM — SEÇİLİ ÜLKE VE BÖLÜME UYAN GERÇEK İŞVERENLER

        Kaynak `src/data/stajProgramlari.ts`; ikinci bir dizin yok ve
        kart başına sorgu yok (statik veri). Uyan kayıt yoksa blok HİÇ
        çizilmiyor — uymayan öneri, filtreyi yok saymak olurdu.

        BUNLAR AÇIK İLAN DEĞİL: şirketin kendi başvuru sayfası. Durum
        her kayıtta "bilinmiyor" çünkü sayfanın çalıştığını doğruladık,
        programın açık olduğunu doğrulamadık.
      */}
      {isverenler.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-gray-900">
            Bu bölüm ve ülkede staj alan işverenler
          </p>
          <p className="text-xs leading-relaxed text-gray-600">
            Bunlar açık ilan değil, şirketin kendi kariyer sayfası. Programın o an başvuru
            alıp almadığını ancak şirketin kendi staj sayfasında aktif başvuru gördüğümüzde
            yazıyoruz.
          </p>
          <ul className="space-y-1.5">
            {isverenler.map((i) => {
              /*
                ETİKET VE HEDEF ORTAK KARARDAN

                Aynı işlev dizin sayfasında da çağrılıyor; iki yüzeyin
                aynı şirket için farklı şey yazması imkânsız. Bozuk
                adreste `tur === 'yok'` dönüyor ve satır TIKLANAMAZ
                oluyor — çalışmadığını ölçtüğümüz adrese bağlantı
                koymak, öğrenciyi 404'e göndermek.
              */
              const baglanti = baglantiEtiketi(i);
              const govde = (
                <>
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-bold text-gray-900">
                      {i.isveren}
                    </span>
                    <span className="block text-xs text-gray-500">{i.sektor}</span>
                  </span>
                  {/* Durum METİNLE; rozet rengi tek başına bilgi taşımıyor. */}
                  <span className="shrink-0 self-center rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-right text-[11px] font-bold text-gray-600">
                    {programDurumMetni(i.programDurumu)}
                  </span>
                </>
              );
              return (
                <li key={i.slug}>
                  {baglanti.tur === 'yok' ? (
                    <span className="flex min-h-11 items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      {govde}
                    </span>
                  ) : (
                    <a
                      href={baglanti.adres ?? i.kariyerUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      title={baglanti.etiket ?? undefined}
                      className="flex min-h-11 items-start gap-2 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                    >
                      {govde}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={onIsverenlereGit}
            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Bütün işveren dizinini aç
          </button>
        </div>
      )}

      {/* 4. ADIM — ilan açmayan şirkete başvuru rehberi ve şablon. */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Eylem
          ikon={<FileText className="w-4 h-4" />}
          baslik="İlan açmayan şirkete nasıl yazılır?"
          aciklama="Konu satırı, şablon ve en sık yapılan hatalar."
          onClick={onRehbereGit}
        />
        <Eylem
          ikon={<Mail className="w-4 h-4" />}
          baslik="Başvuru e-postası şablonu oluştur"
          aciklama="Profilindeki bilgilerle doldurulmuş, kopyalanabilir metin."
          onClick={onSablonAc}
        />
      </div>

      {/*
        5. ADIM — FIRSATLAR: KÜÇÜK, İKİNCİL, EN ALTTA

        Kutu yok, dolgulu düğme yok, ikon yok: tek satır metin bağlantısı.
        Öğrenci staj arıyor ve burs listesi cevabın kendisi değil.
      */}
      {firsatSayisi !== null && firsatSayisi > 0 && (
        <p className="text-xs text-gray-500">
          {/*
            "AYNI ARAMAYLA EŞLEŞEN" İDDİASI KALKTI

            Staj arama metni fırsat verisine uygulanıyordu ve sayı
            "eşleşen" diye sunuluyordu. Staj araması burs verisinde
            anlamlı eşleşme üretmiyor; ürettiğinde de tesadüfi.

            Söylenen tek şey artık doğru: sistemde açık fırsat var.
          */}
          Burs, kredi ve yurt dışı programları ayrı bir listede.{' '}
          <button
            type="button"
            onClick={onFirsatlaraGit}
            className="font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Açık öğrenci fırsatlarına bak
          </button>
        </p>
      )}
    </div>
  );
};
