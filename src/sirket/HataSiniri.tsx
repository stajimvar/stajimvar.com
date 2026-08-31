import React from 'react';
import { IKINCIL_DUGME, SIRKET_KENAR, SIRKET_METIN, SIRKET_METIN_IKINCIL, SIRKET_YUZEY, ikincilStil } from './renk';

/**
 * Aday ayrıntısını saran hata sınırı.
 *
 * NEDEN VAR
 * ---------
 * Aday ayrıntısı render sırasında bir istisna attığında React bütün
 * ağacı söküyor ve işveren paneli KOMPLE beyaz ekrana düşüyordu.
 * Ölçüldü: `AdayCekmecesi` içinde erken çıkıştan sonra çağrılan iki
 * hook yüzünden "Rendered more hooks than during the previous render."
 * hatası atılıyor, liste ekranı dahil her şey kayboluyordu.
 *
 * O hata kök nedeninden düzeltildi. Bu sınır onu gizlemek için değil:
 * bir adayın ikincil bir alanı beklenmedik bir biçimde geldiğinde
 * kaybedilecek şey aday kartı olsun, panelin tamamı değil.
 *
 * KAPSAM DAR
 * ----------
 * Yalnızca aday ayrıntısını sarıyor. Sayfanın tamamını saran bir sınır,
 * gerçek hataları sessizce yutup fark edilmelerini geciktirirdi.
 *
 * `React.Component` KULLANILIYOR: hata sınırı için kanca karşılığı yok.
 */
type Props = { onKapat?: () => void; children: React.ReactNode };
type State = { hata: boolean };

export class AdayHataSiniri extends React.Component<Props, State> {
  state: State = { hata: false };

  static getDerivedStateFromError(): State {
    return { hata: true };
  }

  componentDidCatch(hata: unknown) {
    /* Hata yutulmuyor: konsolda tam yığınla duruyor. */
    console.error('Aday ayrıntısı çizilemedi:', hata);
  }

  /*
    Başka bir adaya geçilince sınır kendini sıfırlıyor; yoksa bir kez
    bozulan panel, sağlam adaylarda da hata ekranında kalırdı.
  */
  componentDidUpdate(oncekiProps: Props) {
    if (this.state.hata && oncekiProps.children !== this.props.children) {
      this.setState({ hata: false });
    }
  }

  render() {
    if (!this.state.hata) return this.props.children;

    return (
      <div
        role="alert"
        className="fixed inset-0 z-[120] flex items-center justify-center p-6"
        style={{ background: 'rgba(28,20,16,.35)' }}
      >
        <div
          className="w-full max-w-sm rounded-2xl border p-5 text-center"
          style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}
        >
          <p className="font-extrabold" style={{ color: SIRKET_METIN }}>
            Aday ayrıntısı yüklenemedi
          </p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
            Bu adayın bilgilerinden biri beklenmedik biçimde geldi. Diğer adaylar
            açılmaya devam ediyor.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hata: false });
              this.props.onKapat?.();
            }}
            className={`mx-auto mt-4 ${IKINCIL_DUGME}`}
            style={ikincilStil}
          >
            Listeye dön
          </button>
        </div>
      </div>
    );
  }
}
