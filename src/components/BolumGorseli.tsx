import React from 'react';
import {
  Activity,
  Baby,
  Brain,
  Briefcase,
  Calculator,
  ChefHat,
  Clapperboard,
  Code2,
  Cog,
  Cpu,
  DraftingCompass,
  Factory,
  FlaskConical,
  Globe,
  GraduationCap,
  HardHat,
  HeartPulse,
  Hotel,
  Layers,
  Leaf,
  Map,
  Megaphone,
  Microscope,
  Palette,
  Scale,
  Scissors,
  ShieldCheck,
  Shirt,
  Sofa,
  Sprout,
  Terminal,
  TrendingUp,
  Truck,
  Wheat,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Bolum, BolumGrubu } from '../data/bolumler';

/**
 * Bölüm sayfalarının görsel kimliği.
 *
 * NEDEN
 * -----
 * Otuz dört bölüm kartı yalnızca başlık ve iki satır özetten oluşuyordu.
 * Ekranda hepsi birbirinin aynısı görünüyordu: kişi kendi bölümünü aramak
 * için satır satır okumak zorundaydı. İkon ve renk, aramayı okumaktan
 * tanımaya çeviriyor — "dişli" makineyi, "şef şapkası" gastronomiyi göz
 * kaydırırken ele veriyor.
 *
 * FOTOĞRAF NEDEN YOK
 * ------------------
 * Otuz dört gerçek fotoğraf demek, otuz dört lisans demek; stok görsel
 * kullanırsak da her bölüm sayfası internetteki yüzlerce sayfayla aynı
 * resmi taşır — özgünlük sinyali için tam tersini istiyoruz. Buradaki
 * çizimler SVG: kendi ürettiğimiz, sayfa başına ~1 KB'lık, her ekran
 * çözünürlüğünde net duran ve ön render'da da çizilen görseller.
 */

/** Bölüm grubunun rengi. Kart zemini, sayfa başlığı ve rozet bundan besleniyor. */
export const GRUP_ZEMINI: Record<BolumGrubu, string> = {
  muhendislik: 'from-blue-500 to-indigo-600',
  myo: 'from-amber-500 to-orange-600',
  sosyal: 'from-emerald-500 to-teal-600',
  tasarim: 'from-fuchsia-500 to-pink-600',
  saglik: 'from-rose-500 to-red-600',
  hizmet: 'from-violet-500 to-purple-600',
};

/** Kart üzerindeki ince kenarlık ve yumuşak zemin — ikonun etrafını sakin tutuyor. */
export const GRUP_YUMUSAK: Record<BolumGrubu, string> = {
  muhendislik: 'bg-blue-50 text-blue-700 border-blue-100',
  myo: 'bg-amber-50 text-amber-700 border-amber-100',
  sosyal: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  tasarim: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
  saglik: 'bg-rose-50 text-rose-700 border-rose-100',
  hizmet: 'bg-violet-50 text-violet-700 border-violet-100',
};

/**
 * Slug → ikon.
 *
 * Bölüm eklenince buraya bir satır yazılmazsa kart yine çiziliyor: aşağıdaki
 * `VARSAYILAN` devreye giriyor. Yani unutmak sayfayı bozmuyor, yalnızca o
 * bölüm genel bir ikon taşıyor.
 */
const IKONLAR: Record<string, LucideIcon> = {
  'bilgisayar-muhendisligi': Code2,
  'makine-muhendisligi': Cog,
  'elektrik-elektronik-muhendisligi': Zap,
  'endustri-muhendisligi': Factory,
  'insaat-muhendisligi': HardHat,
  'gida-muhendisligi': Wheat,
  mimarlik: DraftingCompass,
  'kimya-muhendisligi': FlaskConical,
  'cevre-muhendisligi': Leaf,
  'harita-ve-geomatik-muhendisligi': Map,
  'metalurji-ve-malzeme-muhendisligi': Layers,
  'ziraat-muhendisligi': Sprout,
  'bilgisayar-programciligi': Terminal,
  'muhasebe-ve-vergi-uygulamalari': Calculator,
  'giyim-uretim-teknolojisi': Shirt,
  mekatronik: Cpu,
  lojistik: Truck,
  'is-sagligi-ve-guvenligi': ShieldCheck,
  'cocuk-gelisimi': Baby,
  isletme: Briefcase,
  iktisat: TrendingUp,
  hukuk: Scale,
  psikoloji: Brain,
  'uluslararasi-ticaret': Globe,
  'grafik-tasarim': Palette,
  'halkla-iliskiler-ve-pazarlama': Megaphone,
  'moda-tasarimi': Scissors,
  'ic-mimarlik': Sofa,
  'radyo-televizyon-ve-sinema': Clapperboard,
  hemsirelik: HeartPulse,
  'fizyoterapi-ve-rehabilitasyon': Activity,
  'tibbi-laboratuvar-teknikleri': Microscope,
  'turizm-ve-otel-yoneticiligi': Hotel,
  'gastronomi-ve-mutfak': ChefHat,
};

const VARSAYILAN = GraduationCap;

export const bolumIkonu = (slug: string): LucideIcon => IKONLAR[slug] ?? VARSAYILAN;

/**
 * Kart ve sayfa başlığındaki renkli kare.
 *
 * `boy` piksel değil sınıf alıyor, çünkü çağıran yerlerde ikon boyutu da
 * onunla birlikte değişiyor ve ikisini ayrı ayrı geçirmek kolayca uyumsuz
 * kalıyordu.
 */
export const BolumRozeti: React.FC<{
  bolum: Bolum;
  boy?: 'kucuk' | 'buyuk';
  className?: string;
}> = ({ bolum, boy = 'kucuk', className = '' }) => {
  const Ikon = bolumIkonu(bolum.slug);
  const kucuk = boy === 'kucuk';
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${
        GRUP_ZEMINI[bolum.grup]
      } ${kucuk ? 'w-12 h-12' : 'w-16 h-16'} ${className}`}
    >
      <Ikon className={kucuk ? 'w-6 h-6 text-white' : 'w-8 h-8 text-white'} strokeWidth={2} />
    </span>
  );
};

/**
 * Bölüm sayfasının tepesindeki geniş görsel.
 *
 * BÖLÜM ADI BİLEREK YAZMIYOR
 * --------------------------
 * Bandın hemen üstünde zaten `<h1>… stajı</h1>` duruyor; adı bir kez daha
 * yazmak aynı kelimeyi iki satır arayla tekrarlamak olurdu. Bandın taşıdığı
 * bilgi sayfanın başka hiçbir yerinde geçmiyor: bölümün hangi gruba ait
 * olduğu. Püf noktası da burada değil, kendi kutusunda duruyor.
 */
export const BolumKapagi: React.FC<{ bolum: Bolum; grupAdi: string }> = ({ bolum, grupAdi }) => {
  const Ikon = bolumIkonu(bolum.slug);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${
        GRUP_ZEMINI[bolum.grup]
      } px-5 py-5 sm:px-6 sm:py-6`}
    >
      {/* Arkadaki dev ikon: kırpılıyor, yalnızca doku olarak duruyor. */}
      <Ikon
        aria-hidden="true"
        className="absolute -right-5 -bottom-7 w-36 h-36 text-white/15"
        strokeWidth={1.25}
      />
      <div className="relative z-10 flex items-center gap-4">
        <span className="shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm">
          <Ikon className="w-7 h-7 text-white" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Bölüm grubu</p>
          <p className="text-lg sm:text-xl font-extrabold text-white leading-snug">{grupAdi}</p>
        </div>
      </div>
    </div>
  );
};
