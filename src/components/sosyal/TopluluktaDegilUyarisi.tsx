import React from 'react';
import { BIRINCIL_EYLEM, RENK_UYARI } from '../../lib/renk-token';

/**
 * TOPLULUĞA KATILMAMIŞ KENDİ PROFİLİNİN UYARISI
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Kutu iki yerde gerekiyor: profil sunumunun üst bloğunda
 * (`SosyalProfilGorunumu`) ve birleşik ekranın sağ sütununda
 * (`SosyalProfilSayfasi` gömülü dalı). İki kopya olsaydı biri
 * değiştiğinde öteki geride kalır ve aynı durum iki farklı cümleyle
 * anlatılırdı. Metin ve eylem burada TEK yerde.
 *
 * NEDEN ÇİZİLİYOR
 * ---------------
 * `yayinda_mi` false iken profil kimseye görünmüyor ve kullanıcı bunu
 * hiçbir yerden anlayamıyordu: ekran, yayındaki profille birebir aynı
 * görünüyordu. Üstelik "Paylaş" düğmesinin önkoşulu da bu kolon —
 * `sosyal_paylasim_baslat` topluluğa katılmamış kullanıcıyı
 * 'toplulukta-degil' ile reddediyor. Kutu olmasaydı, düğmesi çizilmeyen
 * bir ekranda sebep de yazmazdı.
 *
 * YETKİ SINIRI ÇAĞIRANDA
 * ----------------------
 * Bileşen `sahibiMi` diye bir bayrak ALMIYOR: iki çağıran da onu kendi
 * sahip dalının İÇİNDE çiziyor, yani ziyaretçide DOM'a hiç girmiyor.
 * Buraya ikinci bir gizleme koymak, sınırın nerede olduğunu bulanıklaştırırdı.
 *
 * `role="status"` seçildi, `alert` değil: bu bir hata değil, bir durum
 * bildirimi — okuyucu aracının sözünü keserek kesmiyor.
 */
export const TopluluktaDegilUyarisi: React.FC<{
  onYayimla: () => void;
  durum?: 'bekliyor' | 'gonderiliyor' | 'hata';
}> = ({ onYayimla, durum = 'bekliyor' }) => (
  <div
    role="status"
    className={`space-y-2 rounded-xl border p-2.5 ${RENK_UYARI.kenar} ${RENK_UYARI.yumusakZemin} ${RENK_UYARI.metin}`}
  >
    <p className="text-sm font-bold">Alan topluluğuna henüz katılmadın</p>
    <p className="text-xs leading-relaxed">
      Şu anda profilini yalnızca sen görüyorsun. Katılırsan aynı alandaki öğrenciler profiline
      ulaşabilir ve fotoğraf paylaşabilirsin.
    </p>
    <button
      type="button"
      onClick={onYayimla}
      disabled={durum === 'gonderiliyor'}
      className={BIRINCIL_EYLEM}
    >
      {durum === 'gonderiliyor' ? 'Topluluğa katılıyor…' : 'Topluluğa katıl'}
    </button>
    {/*
      BAŞARILI GİBİ GÖSTERME YOK: sunucu reddettiyse kullanıcı topluluğun
      dışında kalıyor ve cümle bunu açıkça söylüyor.
    */}
    {durum === 'hata' && (
      <p className="text-xs font-semibold leading-relaxed text-rose-700">
        Alan topluluğuna katılamadın; profilinde bir değişiklik olmadı. Yeniden deneyebilirsin.
      </p>
    )}
  </div>
);
